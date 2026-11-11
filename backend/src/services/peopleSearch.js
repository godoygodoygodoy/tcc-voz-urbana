import { Prisma } from '@prisma/client';

// Search the registration table itself; activity and email verification are irrelevant.
export const createPeopleSearch = (database) => async (req, res) => {
  const term = String(req.query.q || '').trim().replace(/^@+/, '').trim().slice(0, 100);
  const page = Math.min(10000, Math.max(1, Math.trunc(Number(req.query.page)) || 1));
  const limit = Math.min(30, Math.max(1, Math.trunc(Number(req.query.limit)) || 12));
  if (term.length < 2) return res.json({ data: [], page, limit, total: 0 });
  // The MariaDB adapter binds strings with utf8mb4_bin. On the school's MySQL,
  // Prisma `contains` produces error 1267 against utf8mb4_unicode_ci columns.
  // Convert both bound patterns explicitly; keep the existing schema untouched.
  // Escape LIKE wildcards so usernames containing '_' remain literal matches.
  const pattern = '%' + term.replace(/[!%_]/g, '!$&') + '%';
  const where = Prisma.sql`WHERE (
    nome COLLATE utf8mb4_unicode_ci LIKE CONVERT(${pattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci ESCAPE '!'
    OR username COLLATE utf8mb4_unicode_ci LIKE CONVERT(${pattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci ESCAPE '!'
  )`;
  const [counts, users] = await Promise.all([
    database.$queryRaw(Prisma.sql`SELECT COUNT(*) AS total FROM usuarios ${where}`),
    database.$queryRaw(Prisma.sql`SELECT id, nome, username, foto_perfil AS fotoPerfil FROM usuarios ${where} ORDER BY nome ASC, id ASC LIMIT ${limit} OFFSET ${(page - 1) * limit}`),
  ]);
  res.json({ data: users, page, limit, total: Number(counts[0].total) });
};
