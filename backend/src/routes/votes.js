import express from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

const router = express.Router();

// Adicionar/remover voto
router.post(
  "/:problemId",
  asyncHandler(async (req, res) => {
    const { problemId } = req.params;
    const { type } = req.body; // 'up' ou 'down'
    const userId = req.userId;

    if (!["up", "down"].includes(type)) {
      return res.status(400).json({ error: "Tipo de voto inválido" });
    }

    const problem = await prisma.problema.findUnique({
      where: { id: problemId }
    });

    if (!problem) {
      return res.status(404).json({ error: "Problema não encontrado" });
    }

    // Verificar se já votou
    const existingVote = await prisma.voto.findUnique({
      where: {
        usuarioId_problemaId: {
          usuarioId: userId,
          problemaId: problemId
        }
      }
    });

    const tipoVoto = type === "up" ? "UP" : "DOWN";

    if (existingVote) {
      if (existingVote.tipo === tipoVoto) {
        // Remover voto
        await prisma.voto.delete({
          where: { id: existingVote.id }
        });
        await prisma.problema.update({
          where: { id: problemId },
          data: { votos: { decrement: 1 } }
        });
      } else {
        // Mudar voto
        const diff = type === "up" ? 2 : -2;
        await prisma.voto.update({
          where: { id: existingVote.id },
          data: { tipo: tipoVoto }
        });
        await prisma.problema.update({
          where: { id: problemId },
          data: { votos: { increment: diff } }
        });
      }
    } else {
      // Adicionar voto
      await prisma.voto.create({
        data: {
          usuarioId: userId,
          problemaId: problemId,
          tipo: tipoVoto
        }
      });
      const incrementValue = type === "up" ? 1 : -1;
      await prisma.problema.update({
        where: { id: problemId },
        data: { votos: { increment: incrementValue } }
      });
    }

    const updatedProblem = await prisma.problema.findUnique({
      where: { id: problemId }
    });

    res.json(updatedProblem);
  })
);

export default router;
