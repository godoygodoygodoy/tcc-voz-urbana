const express = require('express');
const { Vote, Problem } = require('../models');
const { authMiddleware } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');
const { Op } = require('sequelize');

const router = express.Router();

// Adicionar/remover voto
router.post('/:problemId', asyncHandler(async (req, res) => {
  const { problemId } = req.params;
  const { type } = req.body; // 'up' ou 'down'
  const userId = req.userId;

  if (!['up', 'down'].includes(type)) {
    return res.status(400).json({ error: 'Tipo de voto inválido' });
  }

  const problem = await Problem.findByPk(problemId);
  if (!problem) {
    return res.status(404).json({ error: 'Problema não encontrado' });
  }

  // Verificar se já votou
  const existingVote = await Vote.findOne({
    where: { userId, problemId },
  });

  if (existingVote) {
    if (existingVote.type === type) {
      // Remover voto
      await existingVote.destroy();
      await problem.decrement('votes');
    } else {
      // Mudar voto
      const diff = type === 'up' ? 2 : -2;
      await existingVote.update({ type });
      await problem.increment('votes', { by: diff });
    }
  } else {
    // Adicionar voto
    await Vote.create({ userId, problemId, type });
    await problem.increment('votes', { by: type === 'up' ? 1 : -1 });
  }

  const updatedProblem = await Problem.findByPk(problemId);
  res.json(updatedProblem);
}));

module.exports = router;
