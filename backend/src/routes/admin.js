import express from "express";
import { adminMiddleware } from "../middlewares/auth.js";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

const router = express.Router();

// Criar categoria
router.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const { name, description, color, icon } = req.body;

    const category = await prisma.categoria.create({
      data: {
        nome: name,
        descricao: description,
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
    const { status, priority, isVerified, verifiedBy } = req.body;

    const problem = await prisma.problema.findUnique({
      where: { id: req.params.id }
    });

    if (!problem) {
      return res.status(404).json({ error: "Problema não encontrado" });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.prioridade = priority;
    if (isVerified !== undefined) updateData.verificado = isVerified;
    if (verifiedBy) updateData.verificadoPorId = verifiedBy;

    const updatedProblem = await prisma.problema.update({
      where: { id: req.params.id },
      data: updateData
    });

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
        telefone: true,
        role: true,
        fotoPerfil: true,
        bio: true,
        ativo: true,
        ultimoLogin: true,
        dataCriacao: true,
        dataAtualizacao: true
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
    const { role } = req.body;

    const user = await prisma.usuario.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const updatedUser = await prisma.usuario.update({
      where: { id: req.params.id },
      data: { role },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        fotoPerfil: true,
        dataCriacao: true
      }
    });

    res.json(updatedUser);
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
      totalCategories
    });
  })
);

export default router;
