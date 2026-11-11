import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { prepareTestDatabase } from '../src/config/testDatabaseSafety.js';
import { migrationNeedsReview } from '../scripts/safe-migrate.js';
import { fingerprint, externalDirectory, projectRoot } from '../scripts/lib/mysqlTools.js';
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
});
test('backups stay outside release directory; identity ignores password rotations',()=>{
  assert.throws(()=>externalDirectory(path.join(projectRoot,'backups')));
  assert.throws(()=>externalDirectory('relative'));
  assert.equal(fingerprint('mysql://a:one@db/app'),fingerprint('mysql://a:two@db/app'));
  assert.notEqual(fingerprint('mysql://a:one@db/app'),fingerprint('mysql://a:one@db/other'));
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
