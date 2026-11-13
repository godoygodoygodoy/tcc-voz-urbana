import { queueAchievementCheck } from '../services/achievementQueue.js';
import { publicationImages } from '../services/publicationMedia.js';
import { visibleProblemWhere } from '../services/socialGraph.js';
import express from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { announceNotification } from '../utils/notifications.js';
import { createVotes } from '../services/votes.js';

const router = express.Router();
const voting = createVotes(prisma);

// Adicionar/remover voto
router.post(
  "/:problemId",
  asyncHandler(async (req, res) => {
    const {problem:updatedProblem,notification}=await voting.vote(req,req.params.problemId,req.body?.type);
    queueAchievementCheck(updatedProblem.usuarioId);
    if(notification)void announceNotification(notification).catch(()=>{});
    res.json({
      ...updatedProblem,
      title: updatedProblem.titulo,
      description: updatedProblem.descricao,
      address: updatedProblem.endereco,
      createdAt: updatedProblem.dataCriacao,
      category: { id: updatedProblem.categoria.id, name: updatedProblem.categoria.nome, color: updatedProblem.categoria.cor },
      author: { id: updatedProblem.usuario.id, name: updatedProblem.usuario.nome, username: updatedProblem.usuario.username, avatar: updatedProblem.usuario.fotoPerfil },
      images: publicationImages(updatedProblem.imagens, req),
      imagens: publicationImages(updatedProblem.imagens, req),
      updates: updatedProblem.atualizacoes,
      votes: updatedProblem._count.votos
    });
  })
);

export default router;
