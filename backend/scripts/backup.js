import { createBackup, verifyBackup } from './lib/mysqlTools.js';

try {
  const [command, file] = process.argv.slice(2);
  if (command === 'verify' && file) {
    await verifyBackup(file);
    console.log('Backup restored successfully in the isolated verification database.');
  } else if (!command || command === 'create') {
    const backup = await createBackup();
    console.log('Backup created:', backup);
    console.log('Verify with: node scripts/backup.js verify <backup.sql>');
  } else throw new Error('Usage: node scripts/backup.js create | verify <backup.sql>');
} catch (error) {
  console.error(JSON.stringify({event:'database_backup_failed', time:new Date().toISOString(), message:error.message}));
  process.exitCode = 1;
}
