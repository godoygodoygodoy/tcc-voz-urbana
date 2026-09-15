import express from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { notifyProblemOwner } from "../utils/notifications.js";

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

    await notifyProblemOwner({ problem, tipo: "VOTO", titulo: "Novo apoio", mensagem: "Seu problema recebeu uma nova interação" });

    // Verificar se já votou
    const existingVote = await prisma.voto.findUnique({
      where: {
        usuarioId_problemaId: {
          usuarioId: userId,
          problemaId: problemId
        }
      }
    });

    const tipoVoto = type === "up" ? "CONFIRMAR" : "RESOLVER";

    if (existingVote) {
      if (existingVote.tipo === tipoVoto) {
        // Remover voto
        await prisma.voto.delete({
          where: { id: existingVote.id }
        });
      } else {
        // Mudar voto
        await prisma.voto.update({
          where: { id: existingVote.id },
          data: { tipo: tipoVoto }
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
    }

    const updatedProblem = await prisma.problema.findUnique({
      where: { id: problemId },
      include: { _count: { select: { votos: true } } }
    });

    res.json({ ...updatedProblem, votes: updatedProblem._count.votos });
  })
);

export default router;
