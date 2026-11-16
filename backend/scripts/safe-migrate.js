import { readdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import mariadb from 'mariadb';
import { createBackup, verifyBackup, fingerprint } from './lib/mysqlTools.js';

// A conservative gate, not a SQL proof: unknown changes need a DBA review.
export function migrationNeedsReview(sql) {
  const executable = sql.replace(/--[^\n]*/g, '').replace(/\/\*(?!\!)[\s\S]*?\*\//g, '').replace(/\bON\s+(DELETE|UPDATE)\s+(CASCADE|RESTRICT|NO\s+ACTION|SET\s+NULL|SET\s+DEFAULT)\b/gi, '');
  return /\b(DROP|TRUNCATE|DELETE|UPDATE|REPLACE|RENAME)\b|\b(MODIFY|CHANGE)\s+(COLUMN\s+)?|\bSET\s+(FOREIGN_KEY_CHECKS|GLOBAL)\b/i.test(executable);
}
export const migrationChecksum = sql => createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
export function validateReview(review, url, pending) {
  if (review?.version !== 1 || review.databaseFingerprint !== fingerprint(url) || !review.rehearsedAt) throw new Error('A rehearsed review for this exact database is required.');
  for (const item of pending) if (review.migrations?.[item.name] !== migrationChecksum(item.sql)) throw new Error(`Missing or outdated review for ${item.name}.`);
}
export async function safeMigrate({ apply = process.argv.includes('--apply') } = {}) {
  if (!apply) throw new Error('No changes made. Use prisma:deploy -- --apply after review and backup verification, or start:production for the guarded release flow.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const url = new URL(process.env.DATABASE_URL);
  const ca = process.env.DATABASE_SSL_CA || url.searchParams.get('sslcert');
  const ssl = process.env.DATABASE_SSL === 'true' || ca || url.searchParams.get('sslaccept') === 'strict';
  const db = await mariadb.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:decodeURIComponent(url.pathname.slice(1)),connectTimeout:10000,...(ssl?{ssl:{rejectUnauthorized:true,...(ca?{ca:await readFile(ca,'utf8')}:{})}}:{})});
  let locked = false;
  const lock = 'voz_urbana_migrations_' + createHash('sha256').update(url.pathname).digest('hex').slice(0,24);
  try {
    locked = Number((await db.query('SELECT GET_LOCK(?, 0) AS acquired',[lock]))[0].acquired) === 1;
    if (!locked) throw new Error('Another migration process owns the database release lock.');
    const present = await db.query("SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_prisma_migrations'");
    if (Number(present[0].total) !== 1) throw new Error('Existing migration history required. No database will be recreated.');
    const history = await db.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations');
    if (history.some(row=>!row.finished_at&&!row.rolled_back_at)) throw new Error('Unresolved failed migration; review its logs before retrying.');
    const pending = [];
    const folders = (await readdir(new URL('../prisma/migrations/', import.meta.url),{withFileTypes:true})).filter(f=>f.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name));
    for (const folder of folders) {
      const sql = await readFile(new URL(`../prisma/migrations/${folder.name}/migration.sql`, import.meta.url),'utf8');
      const applied = history.find(row=>row.migration_name===folder.name&&row.finished_at&&!row.rolled_back_at);
      if (applied) {
        const alternatives = [sql,sql.replace(/\r\n/g,'\n'),sql.replace(/\r?\n/g,'\r\n')];
        if (!alternatives.some(text=>createHash('sha256').update(text).digest('hex')===applied.checksum)) throw new Error(`Applied migration was modified: ${folder.name}.`);
      } else pending.push({name:folder.name,sql});
    }
    for (const row of history.filter(row=>row.finished_at&&!row.rolled_back_at)) if (!folders.some(folder=>folder.name===row.migration_name)) throw new Error('Applied migration is missing from this checkout.');
    if (pending.length) {
      const reviewFile = process.env.MIGRATION_REVIEW_FILE;
      if (!reviewFile) throw new Error('Configure MIGRATION_REVIEW_FILE after rehearsing all pending migrations.');
      validateReview(JSON.parse(await readFile(reviewFile,'utf8')),process.env.DATABASE_URL,pending);
      const backup = await createBackup();
      await verifyBackup(backup);
      console.log(JSON.stringify({event:'migration_backup_verified',backup,pending:pending.map(item=>item.name)}));
    }
    // Prisma also keeps its own advisory lock; never disable it.
    const child = spawn(process.execPath,[fileURLToPath(new URL('../node_modules/prisma/build/index.js',import.meta.url)),'migrate','deploy'],{stdio:'inherit',windowsHide:true});
    await new Promise((resolve,reject)=>{child.on('error',()=>reject(new Error('Prisma migration process could not start.')));child.on('exit',code=>code===0?resolve():reject(new Error('Migration failed; backup preserved. Do not reset the database.')));});
    return { applied:pending.map(item=>item.name) };
  } finally {
    if (locked) await db.query('SELECT RELEASE_LOCK(?)',[lock]).catch(()=>{});
    await db.end();
  }
}
