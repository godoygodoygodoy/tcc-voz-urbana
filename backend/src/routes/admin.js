import { queueAchievementCheck } from '../services/achievementQueue.js';
import express from "express";
import { adminMiddleware } from "../middlewares/auth.js";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { announceNotification } from "../utils/notifications.js";
import { createProblemStatus } from "../services/problemStatus.js";

const router = express.Router();
const DAY = 24 * 60 * 60 * 1000;

const periodStart = (period) => {
  const now = new Date();
  if (period === "24h") return new Date(now.getTime() - DAY);
  if (period === "7d") return new Date(now.getTime() - 7 * DAY);
  if (period === "90d") return new Date(now.getTime() - 90 * DAY);
  if (period === "all") return new Date(0);
  return new Date(now.getTime() - 30 * DAY);
};

const sinceStartOfDay = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
};

const logAdminAction = (usuarioId, acao) => prisma.log.create({ data: { usuarioId, acao } });

// Criar categoria
router.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const { name, color, icon } = req.body;

    const category = await prisma.categoria.create({
      data: {
        nome: name,
        cor: color,
        icone: icon
      }
    });

    res.status(201).json(category);
  })
);

// Atualizar problema (status, prioridade)
router.put(
  "/problems/:id",
  asyncHandler(async (req, res) => {
    const result = await createProblemStatus(prisma).update(req.userId, req.params.id, req.body);
    for (const notification of result.notifications) void announceNotification(notification).catch(() => {});
    if (result.changed) queueAchievementCheck(result.problem.usuarioId);
    res.json(result.problem);
  })
);

// Listar usuários
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const query = String(req.query.q || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const role = String(req.query.role || "").toLowerCase();
    const where = {
      ...(query ? {
        OR: [
          { nome: { contains: query } },
          { username: { contains: query.replace(/^@/, "") } },
          { email: { contains: query } }
        ]
      } : {}),
      ...(role === "admin" ? { admin: { isNot: null } } : {}),
      ...(role === "usuario" ? { admin: { is: null } } : {}),
      ...(req.query.from || req.query.to ? {
        dataCriacao: {
          ...(req.query.from ? { gte: new Date(String(req.query.from)) } : {}),
          ...(req.query.to ? { lte: new Date(String(req.query.to)) } : {})
        }
      } : {})
    };
    const users = await prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        username: true,
        telefone: true,
        fotoPerfil: true,
        dataCriacao: true,
        nivel: true,
        admin: { select: { nivel: true } },
        _count: { select: { problemas: true } }
      },
      orderBy: { dataCriacao: "desc" },
      skip: (page - 1) * limit,
      take: limit
    });

    res.json(users.map((user) => ({
      ...user,
      name: user.nome,
      role: user.admin ? "admin" : user.nivel.toLowerCase(),
      publicationCount: user._count.problemas
    })));
  })
);

router.get("/problems", asyncHandler(async (req, res) => {
  const query = String(req.query.q || "").trim();
  const where = {
    ...(query ? {
      OR: [
        { titulo: { contains: query } },
        { descricao: { contains: query } },
        { endereco: { contains: query } },
        { cidade: { contains: query } },
        { estado: { contains: query } },
        { usuario: { nome: { contains: query } } },
        { usuario: { username: { contains: query.replace(/^@/, "") } } }
      ]
    } : {}),
    ...(req.query.status ? { status: String(req.query.status) } : {}),
    ...(req.query.city ? { cidade: { contains: String(req.query.city) } } : {}),
    ...(req.query.state ? { estado: { contains: String(req.query.state) } } : {}),
    ...(req.query.categoryId ? { categoriaId: String(req.query.categoryId) } : {}),
    ...(req.query.from || req.query.to ? {
      dataCriacao: {
        ...(req.query.from ? { gte: new Date(String(req.query.from)) } : {}),
        ...(req.query.to ? { lte: new Date(String(req.query.to)) } : {})
      }
    } : {})
  };
  const problems = await prisma.problema.findMany({
    where,
    orderBy: { dataCriacao: "desc" },
    take: 100,
    include: {
      categoria: true,
      usuario: { select: { id: true, nome: true, username: true, fotoPerfil: true } },
      _count: { select: { votos: true } }
    }
  });
  res.json(problems.map((problem) => ({
    id: problem.id,
    title: problem.titulo,
    description: problem.descricao,
    address: problem.endereco,
    city: problem.cidade,
    state: problem.estado,
    latitude: problem.latitude,
    longitude: problem.longitude,
    status: problem.status,
    createdAt: problem.dataCriacao,
    category: { id: problem.categoria.id, name: problem.categoria.nome },
    author: problem.usuario,
    votes: problem._count.votos
  })));
}));

router.delete("/problems/:id", asyncHandler(async (req, res) => {
  const problem = await prisma.problema.findUnique({ where: { id: req.params.id } });
  if (!problem) return res.status(404).json({ error: "Publicação não encontrada." });
  await prisma.$transaction([
    prisma.problema.delete({ where: { id: problem.id } }),
    prisma.log.create({ data: { acao: `Publicação ${problem.id} excluída no painel administrativo`, usuarioId: req.userId } })
  ]);
  res.json({ message: "Publicação excluída com sucesso." });
}));

// Atualizar role de usuário
router.put(
  "/users/:id/role",
  asyncHandler(async (req, res) => {
    if (req.adminLevel !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Somente super administradores podem alterar permissões." });
    }
    const user = await prisma.usuario.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const role = String(req.body?.role || "").toLowerCase();
    if (!["usuario", "admin"].includes(role)) {
      return res.status(400).json({ error: "Permissão inválida." });
    }
    if (user.id === req.userId) {
      return res.status(400).json({ error: "Você não pode alterar a própria permissão." });
    }
    const adminCount = await prisma.admin.count();
    if (role !== "admin" && adminCount <= 1 && user.admin) {
      return res.status(400).json({ error: "O último administrador não pode ser removido." });
    }
    if (role === "admin") {
      await prisma.admin.upsert({
        where: { usuarioId: user.id },
        update: {},
        create: { usuarioId: user.id, nivel: "ADMIN" }
      });
    } else if (user.admin) {
      await prisma.admin.delete({ where: { usuarioId: user.id } });
    }
    await logAdminAction(req.userId, `Permissão do usuário ${user.id} alterada para ${role}`);
    return res.json({ message: "Permissão atualizada." });
  })
);

// Obter estatísticas
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const start = periodStart(String(req.query.period || "30d"));
    const today = sinceStartOfDay();
    const [
      totalProblems,
      openProblems,
      resolvedProblems,
      totalUsers,
      totalCategories,
      totalComments,
      totalVotes,
      totalSaved,
      totalVisits,
      todayVisits,
      periodVisits,
      uniqueVisitors,
      todayUsers,
      periodUsers,
      todayProblems,
      periodProblems
    ] = await Promise.all([
      prisma.problema.count(),
      prisma.problema.count({ where: { status: "ABERTO" } }),
      prisma.problema.count({ where: { status: "RESOLVIDO" } }),
      prisma.usuario.count(),
      prisma.categoria.count(),
      prisma.comentario.count(),
      prisma.voto.count(),
      prisma.publicacaoSalva.count(),
      prisma.visita.count(),
      prisma.visita.count({ where: { criadaEm: { gte: today } } }),
      prisma.visita.count({ where: { criadaEm: { gte: start } } }),
      prisma.visita.groupBy({ by: ["visitanteId"], where: { criadaEm: { gte: start } } }),
      prisma.usuario.count({ where: { dataCriacao: { gte: today } } }),
      prisma.usuario.count({ where: { dataCriacao: { gte: start } } }),
      prisma.problema.count({ where: { dataCriacao: { gte: today } } }),
      prisma.problema.count({ where: { dataCriacao: { gte: start } } })
    ]);

    const [categoryTotals, recentActivity, visitsInPeriod, userGrowth, problemGrowth, topPages, adminLogs] = await Promise.all([
      prisma.problema.groupBy({ by: ["categoriaId"], _count: { _all: true }, orderBy: { _count: { categoriaId: "desc" } } }),
      prisma.problema.findMany({
        take: 8,
        orderBy: { dataCriacao: "desc" },
        select: { id: true, titulo: true, dataCriacao: true, usuario: { select: { nome: true } } }
      }),
      prisma.visita.findMany({ where: { criadaEm: { gte: start } }, select: { criadaEm: true, visitanteId: true, caminho: true }, orderBy: { criadaEm: "asc" }, take: 10000 }),
      prisma.usuario.findMany({ where: { dataCriacao: { gte: start } }, select: { dataCriacao: true }, orderBy: { dataCriacao: "asc" }, take: 10000 }),
      prisma.problema.findMany({ where: { dataCriacao: { gte: start } }, select: { dataCriacao: true }, orderBy: { dataCriacao: "asc" }, take: 10000 }),
      prisma.visita.groupBy({ by: ["caminho"], where: { criadaEm: { gte: start } }, _count: { _all: true }, orderBy: { _count: { caminho: "desc" } }, take: 8 }),
      prisma.log.findMany({ take: 20, orderBy: { data: "desc" }, select: { id: true, acao: true, data: true, usuario: { select: { nome: true, email: true } } } })
    ]);
    const categoryRows = await prisma.categoria.findMany({
      where: { id: { in: categoryTotals.map((item) => item.categoriaId) } },
      select: { id: true, nome: true }
    });
    res.json({
      totalProblems,
      openProblems,
      resolvedProblems,
      totalUsers,
      totalCategories,
      inProgressProblems: await prisma.problema.count({ where: { status: "EM_ANDAMENTO" } }),
      rejectedProblems: await prisma.problema.count({ where: { status: "REJEITADO" } }),
      totalComments,
      totalVotes,
      totalSaved,
      totalVisits,
      todayVisits,
      periodVisits,
      uniqueVisitors: uniqueVisitors.length,
      todayUsers,
      periodUsers,
      todayProblems,
      periodProblems,
      period: String(req.query.period || "30d"),
      visitsByDay: aggregateByDay(visitsInPeriod, "criadaEm"),
      usersByDay: aggregateByDay(userGrowth, "dataCriacao"),
      problemsByDay: aggregateByDay(problemGrowth, "dataCriacao"),
      topPages: topPages.map((item) => ({ path: item.caminho, total: item._count._all })),
      byCategory: categoryTotals.map((item) => ({
        category: categoryRows.find((row) => row.id === item.categoriaId)?.nome || "Sem categoria",
        total: item._count._all
      })),
      recentActivity,
      adminLogs
    });
  })
);

function aggregateByDay(rows, field) {
  const totals = new Map();
  rows.forEach((row) => {
    const key = new Date(row[field]).toISOString().slice(0, 10);
    totals.set(key, (totals.get(key) || 0) + 1);
  });
  return [...totals.entries()].map(([date, total]) => ({ date, total }));
}

router.get("/logs", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const [items, total] = await Promise.all([
    prisma.log.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { data: "desc" },
      select: { id: true, acao: true, data: true, usuario: { select: { id: true, nome: true, email: true } } }
    }),
    prisma.log.count()
  ]);
  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
}));

router.get("/system", asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  res.json({ backend: "online", database: "online", databaseResponseMs: Date.now() - startedAt, metrics: "indisponível sem coletor de erros" });
}));

router.get("/export/problems.csv", asyncHandler(async (req, res) => {
  const problems = await prisma.problema.findMany({ include: { categoria: true, _count: { select: { votos: true } } }, orderBy: { dataCriacao: "desc" } });
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = ["id,titulo,categoria,status,votos,latitude,longitude,data_criacao", ...problems.map((problem) => [problem.id, problem.titulo, problem.categoria.nome, problem.status, problem._count.votos, problem.latitude, problem.longitude, problem.dataCriacao.toISOString()].map(escape).join(","))];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=problemas.csv");
  res.send(`\ufeff${rows.join("\n")}`);
}));

router.get("/analytics", asyncHandler(async (req, res) => {
  const byCategory = await prisma.problema.groupBy({ by: ["categoriaId"], _count: { _all: true }, orderBy: { _count: { categoriaId: "desc" } } });
  const categories = await prisma.categoria.findMany({ where: { id: { in: byCategory.map((item) => item.categoriaId) } } });
  res.json(byCategory.map((item) => ({ category: categories.find((category) => category.id === item.categoriaId)?.nome || "Sem categoria", total: item._count._all })));
}));

export default router;
