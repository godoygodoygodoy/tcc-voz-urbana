import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { prepareTestDatabase } from '../src/config/testDatabaseSafety.js';
import { migrationNeedsReview, migrationChecksum, validateReview } from '../scripts/safe-migrate.js';
import { fingerprint, externalDirectory, projectRoot, routineDumpArgs } from '../scripts/lib/mysqlTools.js';
import { mkdtempSync, readFileSync, unlinkSync, rmdirSync } from 'node:fs';
import os from 'node:os';
import { checkPersistenceIdentity } from '../src/config/persistence.js';

test('test cleanup cannot target application database or run without explicit isolation',()=>{
  assert.throws(()=>prepareTestDatabase({NODE_ENV:'production'}));
  assert.throws(()=>prepareTestDatabase({NODE_ENV:'test', DATABASE_URL:'mysql://root@localhost/app'}));
  assert.throws(()=>prepareTestDatabase({NODE_ENV:'test', TEST_DATABASE_URL:'mysql://root@localhost/app',TEST_DATABASE_ALLOW_CLEANUP:'true'}));
  const env={NODE_ENV:'test',DATABASE_URL:'mysql://root@localhost/app',TEST_DATABASE_URL:'mysql://root@localhost/app_test',TEST_DATABASE_ALLOW_CLEANUP:'true'};
  prepareTestDatabase(env);assert.equal(env.DATABASE_URL,env.TEST_DATABASE_URL);
});
test('migration gate blocks destructive DDL and DML',()=>{
  for(const sql of ['DROP TABLE usuarios','TRUNCATE usuarios','DELETE FROM usuarios','ALTER TABLE usuarios DROP COLUMN email','ALTER TABLE usuarios MODIFY nome INT','UPDATE usuarios SET nome = 1','RENAME TABLE usuarios TO antigos']) assert.equal(migrationNeedsReview(sql),true,sql);
  assert.equal(migrationNeedsReview('ALTER TABLE usuarios ADD COLUMN avatar VARCHAR(500);'),false);
  assert.equal(migrationNeedsReview('-- DROP TABLE usuarios\nCREATE TABLE nova (id INT);'),false);
  assert.equal(migrationNeedsReview('ALTER TABLE nova ADD FOREIGN KEY (id) REFERENCES outra(id) ON DELETE CASCADE ON UPDATE RESTRICT;'),false);
  assert.equal(migrationNeedsReview('ALTER TABLE nova ADD FOREIGN KEY (id) REFERENCES outra(id) ON DELETE CASCADE; DELETE FROM usuarios;'),true);
});

test('review is bound to the database and every pending SQL checksum',()=>{
  const url='mysql://service:secret@host/app';
  const pending=[{name:'migration_one',sql:'CREATE TABLE nova (id INT);\r\n'}];
  const review={version:1,databaseFingerprint:fingerprint(url),rehearsedAt:new Date().toISOString(),migrations:{migration_one:migrationChecksum(pending[0].sql)}};
  assert.doesNotThrow(()=>validateReview(review,url,pending));
  assert.throws(()=>validateReview(review,'mysql://service:secret@host/other',pending));
  assert.throws(()=>validateReview(review,url,[{...pending[0],sql:'DROP TABLE usuarios;'}]));
  assert.throws(()=>validateReview(review,url,[...pending,{name:'unreviewed',sql:'SELECT 1;'}]));
  assert.throws(()=>validateReview({...review,rehearsedAt:null},url,pending));
  assert.equal(migrationChecksum('one\r\ntwo'),migrationChecksum('one\ntwo'));
});
test('backups stay outside release directory; identity ignores password rotations',()=>{
  assert.throws(()=>externalDirectory(path.join(projectRoot,'backups')));
  assert.throws(()=>externalDirectory('relative'));
  assert.equal(fingerprint('mysql://a:one@db/app'),fingerprint('mysql://a:two@db/app'));
  assert.notEqual(fingerprint('mysql://a:one@db/app'),fingerprint('mysql://a:one@db/other'));
});

test('backup never omits stored routines when metadata reports any',()=>{
  assert.deepEqual(routineDumpArgs({routines:0}),[]);
  assert.deepEqual(routineDumpArgs({routines:1}),['--routines']);
  assert.deepEqual(routineDumpArgs({routines:12}),['--routines']);
});
test('persistence pin refuses another database or Supabase project without replacing the pin',()=>{
  const directory=mkdtempSync(path.join(os.tmpdir(),'voz-identity-'));
  const file=path.join(directory,'identity.json');
  const keys=['DATABASE_URL','PERSISTENCE_STATE_FILE','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  try {
    process.env.PERSISTENCE_STATE_FILE=file;process.env.DATABASE_URL='mysql://user:pass@db/app';
    process.env.SUPABASE_URL='https://one.example';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
    checkPersistenceIdentity();const original=readFileSync(file,'utf8');
    process.env.DATABASE_URL='mysql://user:rotated@db/app';checkPersistenceIdentity();
    process.env.DATABASE_URL='mysql://user:pass@db/other';assert.throws(checkPersistenceIdentity,/identity changed/);
    process.env.DATABASE_URL='mysql://user:pass@db/app';process.env.SUPABASE_URL='https://two.example';assert.throws(checkPersistenceIdentity,/identity changed/);
    assert.equal(readFileSync(file,'utf8'),original);
  } finally {
    for(const key of keys) if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];
    unlinkSync(file);rmdirSync(directory);
  }
});
