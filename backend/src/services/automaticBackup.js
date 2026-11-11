import { createBackup } from '../../scripts/lib/mysqlTools.js';

export function startAutomaticBackup() {
  if (process.env.BACKUP_ENABLED !== 'true') {
    console.warn(JSON.stringify({event:'database_backup_not_scheduled', time:new Date().toISOString()}));
    return () => {};
  }
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await createBackup();
      console.log(JSON.stringify({event:'database_backup_completed', time:new Date().toISOString()}));
    } catch (error) {
      console.error(JSON.stringify({event:'database_backup_failed', time:new Date().toISOString(), message:error.message}));
    } finally { running = false; }
  };
  const hours = Number(process.env.BACKUP_INTERVAL_HOURS || 24);
  if (!Number.isFinite(hours) || hours < 1 || hours > 168) throw new Error('BACKUP_INTERVAL_HOURS must be between 1 and 168.');
  const timer = setInterval(run, hours * 3600000);
  timer.unref();
  void run();
  return () => clearInterval(timer);
}
