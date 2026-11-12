import { publicationImages } from '../services/publicationMedia.js';
import { visibleProblemWhere } from '../services/socialGraph.js';
import express from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

const includeProblem = {
  problema: {
    include: {
      categoria: true,
      usuario: { select: { id: true, nome: true, username: true, fotoPerfil: true } },
      imagens: true,
      atualizacoes: { orderBy: { dataCriacao: "desc" } },
      _count: { select: { votos: true } }
    }
  }
};

const serialize = (saved, req) => {
  const problem = saved.problema;
  return {
    ...problem,
    title: problem.titulo,
    description: problem.descricao,
    address: problem.endereco,
    cep: problem.cep,
    state: problem.estado,
    city: problem.cidade,
    createdAt: problem.dataCriacao,
    category: problem.categoria ? {
      id: problem.categoria.id,
      name: problem.categoria.nome,
      icon: problem.categoria.icone,
      color: problem.categoria.cor
    } : null,
    author: problem.usuario ? {
      id: problem.usuario.id,
      name: problem.usuario.nome,
      username: problem.usuario.username,
      avatar: problem.usuario.fotoPerfil
    } : null,
    images: publicationImages(problem.imagens, req),
    imagens: publicationImages(problem.imagens, req),
    updates: problem.atualizacoes || [],
    votes: problem._count?.votos || 0,
    savedAt: saved.criadaEm,
    savedByMe: true
  };
};

router.get("/", authMiddleware, asyncHandler(async (req, res) => {
  const saved = await prisma.publicacaoSalva.findMany({
    where: { usuarioId: req.userId, problema: { is: visibleProblemWhere(req) } },
    include: includeProblem,
    orderBy: { criadaEm: "desc" }
  });
  res.json(saved.map(item => serialize(item, req)));
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
