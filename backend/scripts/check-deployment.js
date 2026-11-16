import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { inspectSchema } from '../src/services/schemaCompatibility.js';
import { releaseInfo } from '../src/config/release.js';
import { migrationNeedsReview } from './safe-migrate.js';

if (!process.argv.includes('--read-only')) {
  console.error('Use --read-only. This command never applies migrations.'); process.exit(1);
}
const { prisma } = await import('../src/config/prisma.js');
try {
  const schema = await inspectSchema(prisma);
  const history = schema.migrationHistoryPresent ? await prisma.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations` : [];
  const applied = new Set(history.filter(row => row.finished_at && !row.rolled_back_at).map(row => row.migration_name));
  const pending = [];
  for (const folder of await readdir(new URL('../prisma/migrations/', import.meta.url), { withFileTypes: true })) {
    if (!folder.isDirectory() || applied.has(folder.name)) continue;
    const sql = await readFile(new URL(`../prisma/migrations/${folder.name}/migration.sql`, import.meta.url), 'utf8');
    pending.push({ migration: folder.name, manualReviewRequired: migrationNeedsReview(sql) });
  }
  console.log(JSON.stringify({ release: releaseInfo(), startCommand: 'npm start', schema, pending,
    failedMigrations: history.filter(row => !row.finished_at && !row.rolled_back_at).map(row => row.migration_name),
    backupVerificationConfigured: Boolean(process.env.BACKUP_VERIFY_DATABASE_URL), changesMade: false }, null, 2));
  if (!schema.compatible || pending.length || history.some(row => !row.finished_at && !row.rolled_back_at)) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ event: 'deployment_check_failed', code: error.code || error.name, changesMade: false })); process.exitCode = 1;
} finally { await prisma.$disconnect(); }
