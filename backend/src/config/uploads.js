import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const uploadsRoot = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : fileURLToPath(new URL('../../uploads/', import.meta.url));
