import 'dotenv/config';
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, rename, writeFile } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

export const projectRoot = fileURLToPath(new URL('../../..', import.meta.url));
export const fingerprint = (url) => {
  const parsed = new URL(url);
  return createHash('sha256').update(JSON.stringify([parsed.protocol, parsed.hostname.toLowerCase(), parsed.port || '3306', decodeURIComponent(parsed.pathname)])).digest('hex');
};
export function externalDirectory(value) {
  if (!value || !path.isAbsolute(value)) throw new Error('Configure an absolute persistent BACKUP_DIR outside the source checkout.');
  const relative = path.relative(projectRoot, path.resolve(value));
  if (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)) throw new Error('BACKUP_DIR must be outside the source checkout.');
  return path.resolve(value);
}
export function clientOptions(connectionUrl) {
  const url = new URL(connectionUrl);
  if (url.protocol !== 'mysql:' || !/^\/[\w-]+$/.test(url.pathname)) throw new Error('Expected a MySQL URL with a simple database name.');
  const args = ['--no-defaults', '--protocol=TCP', '--host=' + url.hostname, '--port=' + (url.port || 3306), '--user=' + decodeURIComponent(url.username), '--default-character-set=utf8mb4'];
  const ca = process.env.DATABASE_SSL_CA || url.searchParams.get('sslcert');
  if (process.env.DATABASE_SSL === 'true' || ca || url.searchParams.get('sslaccept') === 'strict') {
    args.push(...(process.env.MYSQL_CLIENT_FLAVOR === 'mariadb' ? ['--ssl', '--ssl-verify-server-cert'] : ['--ssl-mode=VERIFY_IDENTITY']));
    if (ca) args.push('--ssl-ca=' + ca);
  }
  return { args, database: url.pathname.slice(1), env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) } };
}
export async function runClient(binary, args, { env, input, output } = {}) {
  const child = spawn(binary, args, { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  // Never print driver stderr: it can include credentials, SQL or personal data.
  let diagnostic = '';
  child.stderr.on('data', chunk => { if (diagnostic.length < 32768) diagnostic += chunk.toString(); });
  const done = new Promise((resolve, reject) => {
    child.once('error', () => reject(new Error('MySQL client could not start. Check MYSQL_BIN / MYSQLDUMP_BIN.')));
    child.once('close', code => {
      const mysqlCode = diagnostic.match(/ERROR\s+(\d+)(?:\s+\(([A-Z0-9]+)\))?/i);
      const reason = /Access denied/i.test(diagnostic) ? ' Authentication/permissions denied.' : /Can.t connect|Connection refused|Unknown MySQL server host/i.test(diagnostic) ? ' Database server unreachable.' : /SSL|TLS|certificate/i.test(diagnostic) ? ' TLS configuration rejected.' : /unknown (variable|option)/i.test(diagnostic) ? ' Unsupported MySQL client option.' : '';
      code === 0 ? resolve() : reject(new Error(`MySQL client failed (exit ${code}${mysqlCode ? ', MySQL ' + mysqlCode[1] : ''}).${reason} Backup/verification was not approved.`));
    });
  });
  let text = '';
  const out = output ? pipeline(child.stdout, createWriteStream(output, { flags: 'wx', mode: 0o600 })) : (async () => { for await (const chunk of child.stdout) text += chunk; })();
  const source = input ? pipeline(createReadStream(input), child.stdin) : Promise.resolve(child.stdin.end());
  try { await Promise.all([done, out, source]); } catch (error) { child.kill(); throw error; }
  return text;
}
export async function query(url, sql) {
  const {args, database, env} = clientOptions(url);
  return runClient(process.env.MYSQL_BIN || 'mysql', [...args, '--batch', '--skip-column-names', '--database=' + database, '--execute=' + sql], {env});
}
export async function digest(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
export async function dumpInventory(file) {
  const tables = {};
  for await (const line of createInterface({input:createReadStream(file), crlfDelay:Infinity})) {
    const created = line.match(/^CREATE TABLE `([\w-]+)`/);
    if (created) tables[created[1]] = 0;
    const inserted = line.match(/^INSERT INTO `([\w-]+)` VALUES /);
    if (inserted && Object.hasOwn(tables, inserted[1])) tables[inserted[1]]++;
  }
  return tables;
}
export async function createBackup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required; no fallback database is allowed for backups.');
  const directory = externalDirectory(process.env.BACKUP_DIR);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const engines = await query(url, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE' AND engine <> 'InnoDB'");
  if (Number(engines.trim()) !== 0) throw new Error('Non-InnoDB tables need a DBA-managed consistent backup.');
  const {args, database, env} = clientOptions(url);
  const file = path.join(directory, 'voz-urbana-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sql');
  const compatibility = process.env.MYSQL_CLIENT_FLAVOR === 'mariadb' ? [] : ['--column-statistics=0', '--set-gtid-purged=OFF'];
  await runClient(process.env.MYSQLDUMP_BIN || 'mysqldump', [...args, '--single-transaction', '--quick', '--routines', '--events', '--triggers', '--hex-blob', '--skip-extended-insert', '--skip-add-drop-table', '--skip-add-locks', '--no-tablespaces', ...compatibility, database], {env, output: file + '.partial'});
  const info = await stat(file + '.partial');
  if (info.size < 100) throw new Error('Empty or incomplete backup.');
  await rename(file + '.partial', file);
  const tables = await dumpInventory(file);
  if (!Object.keys(tables).length) throw new Error('Backup contains no application tables.');
  const manifest = { version: 1, createdAt: new Date().toISOString(), source: fingerprint(url), bytes: info.size, sha256: await digest(file), tables, verified: false };
  await writeFile(file + '.json', JSON.stringify(manifest, null, 2), { mode: 0o600, flag: 'wx' });
  return file;
}
export async function verifyBackup(file) {
  const manifest = JSON.parse(await readFile(file + '.json', 'utf8'));
  if (await digest(file) !== manifest.sha256) throw new Error('Backup checksum mismatch.');
  const target = process.env.BACKUP_VERIFY_DATABASE_URL;
  if (!target || !new URL(target).pathname.endsWith('_restore_check')) throw new Error('Configure an empty isolated BACKUP_VERIFY_DATABASE_URL ending in _restore_check.');
  if (!process.env.DATABASE_URL || manifest.source !== fingerprint(process.env.DATABASE_URL)) throw new Error('Backup source differs from the configured application database.');
  if (new URL(target).pathname === new URL(process.env.DATABASE_URL).pathname) throw new Error('Verification target must differ from the application database.');
  const tables = await query(target, 'SHOW FULL TABLES');
  if (tables.trim()) throw new Error('Restore check database must be empty. No existing tables will be overwritten.');
  const objects = await query(target, "SELECT (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema=DATABASE()) + (SELECT COUNT(*) FROM information_schema.events WHERE event_schema=DATABASE())");
  if (Number(objects.trim()) !== 0) throw new Error('Restore check database contains existing routines or events; nothing will be imported.');
  const scheduler = await query(target, 'SELECT @@GLOBAL.event_scheduler');
  if (!/^(OFF|DISABLED)$/i.test(scheduler.trim())) throw new Error('Disable event_scheduler on the isolated restore server before importing a full dump.');
  const {args, database, env} = clientOptions(target);
  await runClient(process.env.MYSQL_BIN || 'mysql', [...args, '--database=' + database], {env, input:file});
  const checked = (await query(target, 'SHOW FULL TABLES')).trim();
  if (!checked) throw new Error('Restored database contains no tables.');
  if (!manifest.tables || !Object.keys(manifest.tables).length) throw new Error('Backup has no row-count inventory. Create a new backup with this version.');
  for (const [table, rows] of Object.entries(manifest.tables)) {
    if (!/^[\w-]+$/.test(table)) throw new Error('Invalid table inventory.');
    const restored = Number((await query(target, 'SELECT COUNT(*) FROM `' + table + '`')).trim());
    if (restored !== rows) throw new Error('Restore row-count verification failed.');
  }
  manifest.verified = true;
  manifest.verifiedAt = new Date().toISOString();
  manifest.verificationTarget = fingerprint(target);
  await writeFile(file + '.json', JSON.stringify(manifest, null, 2), {mode:0o600});
  return manifest;
}
