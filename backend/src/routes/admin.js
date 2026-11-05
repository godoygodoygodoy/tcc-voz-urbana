import express from "express";
import { adminMiddleware } from "../middlewares/auth.js";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { createNotification } from "../utils/notifications.js";

const router = express.Router();

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
    const { status } = req.body;

    const problem = await prisma.problema.findUnique({
      where: { id: req.params.id }
    });

    if (!problem) {
      return res.status(404).json({ error: "Problema não encontrado" });
    }

    const updateData = {};
    if (status) updateData.status = status;

    const updatedProblem = await prisma.problema.update({
      where: { id: req.params.id },
      data: updateData
    });

    await prisma.atualizacaoProblema.create({
      data: { texto: `Status alterado para ${status}`, status, usuarioId: req.userId, problemaId: req.params.id }
    });
    if (problem.usuarioId !== req.userId) {
      await createNotification({ usuarioId: problem.usuarioId, tipo: "STATUS", titulo: "Problema atualizado", mensagem: `O status foi alterado para ${status}`, link: `/problem/${problem.id}` });
    }

    res.json(updatedProblem);
  })
);

// Listar usuários
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const query = String(req.query.q || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const where = query ? {
      OR: [
        { nome: { contains: query } },
        { username: { contains: query.replace(/^@/, "") } },
        { email: { contains: query } }
      ]
    } : {};
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
  const where = query ? {
    OR: [
      { titulo: { contains: query } },
      { descricao: { contains: query } },
      { endereco: { contains: query } },
      { cidade: { contains: query } },
      { estado: { contains: query } },
      { usuario: { nome: { contains: query } } },
      { usuario: { username: { contains: query.replace(/^@/, "") } } }
    ]
  } : {};
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
    const user = await prisma.usuario.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return res.status(400).json({ error: "Use a rota de administradores para alterar permissões" });
  })
);

// Obter estatísticas
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const [
      totalProblems,
      openProblems,
      resolvedProblems,
      totalUsers,
      totalCategories
    ] = await Promise.all([
      prisma.problema.count(),
      prisma.problema.count({ where: { status: "ABERTO" } }),
      prisma.problema.count({ where: { status: "RESOLVIDO" } }),
      prisma.usuario.count(),
      prisma.categoria.count()
    ]);

    const [categoryTotals, recentActivity] = await Promise.all([
      prisma.problema.groupBy({ by: ["categoriaId"], _count: { _all: true }, orderBy: { _count: { categoriaId: "desc" } } }),
      prisma.problema.findMany({
        take: 8,
        orderBy: { dataCriacao: "desc" },
        select: { id: true, titulo: true, dataCriacao: true, usuario: { select: { nome: true } } }
      })
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
      byCategory: categoryTotals.map((item) => ({
        category: categoryRows.find((row) => row.id === item.categoriaId)?.nome || "Sem categoria",
        total: item._count._all
      })),
      recentActivity
    });
  })
);

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
