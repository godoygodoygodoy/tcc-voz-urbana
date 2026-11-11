import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.NODE_ENV === 'production') {
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL', 'UPLOAD_DIR']) {
    if (!process.env[key]?.trim()) throw new Error(`Variável obrigatória: ${key}`);
  }
  const checkout = fileURLToPath(new URL('../../../', import.meta.url));
  const uploads = process.env.UPLOAD_DIR;
  const relative = path.relative(checkout, path.resolve(uploads));
  if (!path.isAbsolute(uploads) || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Production UPLOAD_DIR must be an absolute persistent path outside the source checkout. Copy existing uploads before changing this path.');
  }
  if (process.env.JWT_SECRET.length < 32 || /your_|change_this|troque|defina/i.test(process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET deve ser aleatório, com pelo menos 32 caracteres.');
  }
  const frontend = new URL(process.env.FRONTEND_URL);
  if (frontend.protocol !== 'https:' || frontend.username || frontend.password || frontend.search || frontend.hash) {
    throw new Error('FRONTEND_URL deve ser uma URL HTTPS do site, podendo incluir a subpasta, sem credenciais, query ou fragmento.');
  }
}
