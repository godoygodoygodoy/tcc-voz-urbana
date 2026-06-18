const express = require('express');
const prisma = require('../config/database');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Adicionar/remover voto
router.post('/:problemId', asyncHandler(async (req, res) => {
  const { problemId } = req.params;
  const { type } = req.body; // 'up' ou 'down'
  const userId = req.userId;

  if (!['up', 'down'].includes(type)) {
    return res.status(400).json({ error: 'Tipo de voto inválido' });
  }

  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) {
    return res.status(404).json({ error: 'Problema não encontrado' });
  }

  await prisma.$transaction(async (tx) => {
    const existingVote = await tx.vote.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId,
        },
      },
    });

    if (existingVote) {
      if (existingVote.type === type) {
        await tx.vote.delete({ where: { id: existingVote.id } });
        await tx.problem.update({
          where: { id: problemId },
          data: { votes: { decrement: 1 } },
        });
        return;
      }

      const diff = type === 'up' ? 2 : -2;
      await tx.vote.update({
        where: { id: existingVote.id },
        data: { type },
      });
      await tx.problem.update({
        where: { id: problemId },
        data: { votes: { increment: diff } },
      });
      return;
    }

    await tx.vote.create({
      data: { userId, problemId, type },
    });
    await tx.problem.update({
      where: { id: problemId },
      data: { votes: { increment: type === 'up' ? 1 : -1 } },
    });
  });

  const updatedProblem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: {
      category: true,
      author: { select: { id: true, name: true, avatar: true } },
      images: true,
    },
  });

  res.json(updatedProblem);
}));

module.exports = router;
