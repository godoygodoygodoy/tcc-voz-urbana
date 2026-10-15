import 'dotenv/config';

if (process.env.NODE_ENV === 'production') {
  for (const key of ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL', 'UPLOAD_DIR']) {
    if (!process.env[key]?.trim()) throw new Error(`Variável obrigatória: ${key}`);
  }
  if (process.env.JWT_SECRET.length < 32 || /your_|change_this|troque|defina/i.test(process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET deve ser aleatório, com pelo menos 32 caracteres.');
  }
  const frontend = new URL(process.env.FRONTEND_URL);
  if (frontend.protocol !== 'https:' || frontend.origin !== process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL deve ser uma origem HTTPS, sem caminho ou barra final.');
  }
}
