import { visibleProblemWhere } from '../services/socialGraph.js';
import express from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware, optionalAuthMiddleware } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { createNotification } from "../utils/notifications.js";

const router = express.Router();

router.get("/:problemId", optionalAuthMiddleware, asyncHandler(async (req, res) => {
  if (!await prisma.problema.findFirst({ where: { id: req.params.problemId, ...visibleProblemWhere(req) }, select: { id: true } })) return res.status(404).json({ error: 'problemNotFound' });
  const comments = await prisma.comentario.findMany({
    where: { problemaId: req.params.problemId },
    include: { usuario: { select: { id: true, nome: true, username: true, fotoPerfil: true } } },
    orderBy: { dataCriacao: "asc" }
  });
  res.json(comments);
}));

router.post("/:problemId", authMiddleware, asyncHandler(async (req, res) => {
  const texto = String(req.body.texto || req.body.text || "").trim();
  if (texto.length < 2 || texto.length > 1000) {
    return res.status(400).json({ error: "O comentário deve ter entre 2 e 1000 caracteres" });
  }

  const problem = await prisma.problema.findFirst({ where: { id: req.params.problemId, ...visibleProblemWhere(req) } });
  if (!problem) return res.status(404).json({ error: "Problema não encontrado" });

  const comment = await prisma.comentario.create({
    data: { texto, usuarioId: req.userId, problemaId: req.params.problemId },
    include: { usuario: { select: { id: true, nome: true, username: true, fotoPerfil: true } } }
  });

  if (problem.usuarioId !== req.userId) {
    await createNotification({
      usuarioId: problem.usuarioId,
      tipo: "COMENTARIO",
      titulo: "Novo comentário",
      mensagem: `${comment.usuario.nome} comentou no seu problema`,
      link: `/problem/${problem.id}`
    });
  }

  res.status(201).json(comment);
}));

export default router;
