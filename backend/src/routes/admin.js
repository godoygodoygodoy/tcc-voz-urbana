const express = require('express');
const prisma = require('../config/database');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Criar categoria
router.post('/categories', asyncHandler(async (req, res) => {
  const { name, description, color, icon } = req.body;

  const category = await prisma.category.create({ data: { name, description, color, icon } });

  res.status(201).json(category);
}));

// Atualizar problema (status, prioridade)
router.put('/problems/:id', asyncHandler(async (req, res) => {
  const { status, priority, isVerified, verifiedBy } = req.body;
  const problem = await prisma.problem.findUnique({ where: { id: req.params.id } });

  if (!problem) {
    return res.status(404).json({ error: 'Problema não encontrado' });
  }

  const updatedProblem = await prisma.problem.update({
    where: { id: req.params.id },
    data: {
      status: status || problem.status,
      priority: priority || problem.priority,
      isVerified: isVerified !== undefined ? isVerified : problem.isVerified,
      verifiedById: verifiedBy || problem.verifiedById,
    },
  });

  res.json(updatedProblem);
}));

// Listar usuários
router.get('/users', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatar: true,
      bio: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json(users);
}));

// Atualizar role de usuário
router.put('/users/:id/role', asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
  });

  const { password, ...safeUser } = updatedUser;
  res.json(safeUser);
}));

// Obter estatísticas
router.get('/stats', asyncHandler(async (req, res) => {
  const [totalProblems, openProblems, resolvedProblems, totalUsers, totalCategories] = await Promise.all([
    prisma.problem.count(),
    prisma.problem.count({ where: { status: 'open' } }),
    prisma.problem.count({ where: { status: 'resolved' } }),
    prisma.user.count(),
    prisma.category.count(),
  ]);

  res.json({
    totalProblems,
    openProblems,
    resolvedProblems,
    totalUsers,
    totalCategories,
  });
}));

module.exports = router;
