const express = require('express');
const { adminMiddleware } = require('../middlewares/auth');
const { Problem, Category, User } = require('../models');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Criar categoria
router.post('/categories', asyncHandler(async (req, res) => {
  const { name, description, color, icon } = req.body;

  const category = await Category.create({
    name,
    description,
    color,
    icon,
  });

  res.status(201).json(category);
}));

// Atualizar problema (status, prioridade)
router.put('/problems/:id', asyncHandler(async (req, res) => {
  const { status, priority, isVerified, verifiedBy } = req.body;
  const problem = await Problem.findByPk(req.params.id);

  if (!problem) {
    return res.status(404).json({ error: 'Problema não encontrado' });
  }

  await problem.update({
    status: status || problem.status,
    priority: priority || problem.priority,
    isVerified: isVerified !== undefined ? isVerified : problem.isVerified,
    verifiedBy: verifiedBy || problem.verifiedBy,
  });

  res.json(problem);
}));

// Listar usuários
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: { exclude: ['password'] },
    order: [['createdAt', 'DESC']],
  });

  res.json(users);
}));

// Atualizar role de usuário
router.put('/users/:id/role', asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await User.findByPk(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  await user.update({ role });
  res.json(user.toJSON());
}));

// Obter estatísticas
router.get('/stats', asyncHandler(async (req, res) => {
  const totalProblems = await Problem.count();
  const openProblems = await Problem.count({ where: { status: 'open' } });
  const resolvedProblems = await Problem.count({ where: { status: 'resolved' } });
  const totalUsers = await User.count();
  const totalCategories = await Category.count();

  res.json({
    totalProblems,
    openProblems,
    resolvedProblems,
    totalUsers,
    totalCategories,
  });
}));

module.exports = router;
