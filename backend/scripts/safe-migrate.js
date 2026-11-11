import { readdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createBackup, verifyBackup, query } from './lib/mysqlTools.js';

// A conservative gate, not a SQL proof: unknown changes need a DBA review.
export function migrationNeedsReview(sql) {
  const executable = sql.replace(/--[^\n]*/g, '').replace(/\/\*(?!\!)[\s\S]*?\*\//g, '');
  return /\b(DROP|TRUNCATE|DELETE|UPDATE|REPLACE|RENAME)\b|\b(MODIFY|CHANGE)\s+(COLUMN\s+)?|\bSET\s+(FOREIGN_KEY_CHECKS|GLOBAL)\b/i.test(executable);
}
export async function safeMigrate() {
  if (!process.argv.includes('--apply')) throw new Error('No changes made. Use prisma:deploy -- --apply only after reviewing the migration files and configuring backup verification.');
  const present = (await query(process.env.DATABASE_URL, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='_prisma_migrations'")).trim();
  if (present !== '1') throw new Error('Existing migration history required. Initial provisioning/baseline must be reviewed separately; no database will be recreated.');
  const applied = new Set((await query(process.env.DATABASE_URL, 'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).trim().split('\n').map(s=>s.trim()));
  for (const folder of await readdir(new URL('../prisma/migrations/', import.meta.url), {withFileTypes:true})) {
    if (!folder.isDirectory() || applied.has(folder.name)) continue;
    const sql = await readFile(new URL(`../prisma/migrations/${folder.name}/migration.sql`, import.meta.url), 'utf8');
    if (migrationNeedsReview(sql)) throw new Error(`Migration ${folder.name} requires manual DBA review. The guarded deploy will not execute it.`);
  }
  // This gate cannot be bypassed by an old manifest: create and restore a fresh dump.
  const backup = await createBackup();
  await verifyBackup(backup);
  const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/prisma/build/index.js', import.meta.url)), 'migrate', 'deploy'], {stdio:'inherit', windowsHide:true});
  await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error('Migration failed; backup preserved. Do not reset the database.'))); });
}
