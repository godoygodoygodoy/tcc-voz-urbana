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
    const { name, description, color, icon } = req.body;

    const category = await prisma.categoria.create({
      data: {
        nome: name
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
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        fotoPerfil: true,
        dataCriacao: true
      },
      orderBy: { dataCriacao: "desc" }
    });

    res.json(users);
  })
);

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

    res.json({
      totalProblems,
      openProblems,
      resolvedProblems,
      totalUsers,
      totalCategories,
      inProgressProblems: await prisma.problema.count({ where: { status: "EM_ANDAMENTO" } })
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
