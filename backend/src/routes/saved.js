import { includeProblem, serializeSaved } from '../services/savedPublications.js';
import { visibleProblemWhere } from '../services/socialGraph.js';
import express from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

router.get("/", authMiddleware, asyncHandler(async (req, res) => {
  const saved = await prisma.publicacaoSalva.findMany({
    where: { usuarioId: req.userId, problema: { is: visibleProblemWhere(req) } },
    include: includeProblem,
    orderBy: { criadaEm: "desc" }
  });
  res.json(saved.map(item => serializeSaved(item, req)));
}));

router.post("/:problemId", authMiddleware, asyncHandler(async (req, res) => {
  const problem = await prisma.problema.findFirst({ where: { id: req.params.problemId, ...visibleProblemWhere(req) }, select: { id: true } });
  if (!problem) return res.status(404).json({ error: "Publicação não encontrada." });
  const saved = await prisma.publicacaoSalva.upsert({
    where: { usuarioId_problemaId: { usuarioId: req.userId, problemaId: problem.id } },
    update: {},
    create: { usuarioId: req.userId, problemaId: problem.id }
  });
  res.status(201).json({ saved: true, savedAt: saved.criadaEm });
}));

router.delete("/:problemId", authMiddleware, asyncHandler(async (req, res) => {
  await prisma.publicacaoSalva.deleteMany({ where: { usuarioId: req.userId, problemaId: req.params.problemId } });
  res.json({ saved: false });
}));

export default router;
