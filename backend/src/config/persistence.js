import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fingerprint, externalDirectory } from '../../scripts/lib/mysqlTools.js';
import { uploadsRoot } from './uploads.js';

export function checkPersistenceIdentity() {
  const file = process.env.PERSISTENCE_STATE_FILE;
  if (!file) {
    console.warn(JSON.stringify({event:'persistence_identity_not_pinned', time:new Date().toISOString()}));
    return;
  }
  if (!path.isAbsolute(file)) throw new Error('PERSISTENCE_STATE_FILE must be an absolute persistent path outside the checkout.');
  externalDirectory(path.dirname(file));
  if (!process.env.DATABASE_URL) throw new Error('Pinning persistence requires DATABASE_URL.');
  const storageProject = (process.env.SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const identity = {
    version: 1,
    database: fingerprint(process.env.DATABASE_URL),
    storage: createHash('sha256').update(JSON.stringify([storageProject, process.env.SUPABASE_STORAGE_ENABLED !== 'false' && Boolean(storageProject && process.env.SUPABASE_SERVICE_ROLE_KEY), uploadsRoot])).digest('hex'),
  };
  try {
    const previous = JSON.parse(readFileSync(file, 'utf8'));
    if (previous.database !== identity.database || previous.storage !== identity.storage) {
      throw new Error('Persistent database/storage identity changed. Startup blocked; restore the correct environment configuration. Do not overwrite the identity file to bypass this check.');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    mkdirSync(path.dirname(file), {recursive:true, mode:0o700});
    writeFileSync(file, JSON.stringify(identity, null, 2), {flag:'wx', mode:0o600});
  }
}
