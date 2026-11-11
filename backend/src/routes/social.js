import express from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { createNotification } from "../utils/notifications.js";

import { createPeopleSearch } from '../services/peopleSearch.js';

const router = express.Router();
export const publicSocialRouter = express.Router();
const publicUser = { id: true, nome: true, username: true, fotoPerfil: true, bio: true };

publicSocialRouter.get('/users/search', asyncHandler(createPeopleSearch(prisma)));

const profileSelect = {
  id: true,
  nome: true,
  username: true,
  fotoPerfil: true,
  bio: true,
  dataCriacao: true,
  _count: { select: { problemas: true } },
  problemas: {
    orderBy: { dataCriacao: "desc" },
    take: 30,
    include: {
      categoria: true,
      imagens: true,
      _count: { select: { votos: true } }
    }
  }
};

const serializeProfile = (user) => ({
  id: user.id,
  name: user.nome,
  username: user.username,
  avatar: user.fotoPerfil,
  bio: user.bio,
  joinedAt: user.dataCriacao,
  publicationCount: user._count.problemas,
  publications: user.problemas.map((problem) => ({
    id: problem.id,
    title: problem.titulo,
    description: problem.descricao,
    address: problem.endereco,
    state: problem.estado,
    city: problem.cidade,
    status: problem.status,
    createdAt: problem.dataCriacao,
    category: { id: problem.categoria.id, name: problem.categoria.nome, color: problem.categoria.cor },
    images: problem.imagens,
    votes: problem._count.votos
  }))
});

const findProfile = (where) => prisma.usuario.findUnique({ where, select: profileSelect });

const withProfileStats = async (user) => {
  const [followers, following, likes] = await Promise.all([
    prisma.amizade.count({ where: { destinatarioId: user.id, status: "ACEITA" } }),
    prisma.amizade.count({ where: { solicitanteId: user.id, status: "ACEITA" } }),
    prisma.voto.count({ where: { usuarioId: user.id } })
  ]);
  return { ...serializeProfile(user), followers, following, likes };
};

publicSocialRouter.get("/users/username/:username/profile", asyncHandler(async (req, res) => {
  const username = decodeURIComponent(req.params.username).replace(/^@/, "").trim().toLowerCase();
  const user = await findProfile({ username });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json(await withProfileStats(user));
}));

publicSocialRouter.get("/users/:id/profile", asyncHandler(async (req, res) => {
  const user = await findProfile({ id: req.params.id });
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json(await withProfileStats(user));
}));

// Likes are personal activity. They are intentionally only available to the
// account owner, while public profiles expose only the aggregate count.
router.get("/users/:id/likes", asyncHandler(async (req, res) => {
  if (req.params.id !== req.userId) return res.status(403).json({ error: "Curtidas privadas." });
  const votes = await prisma.voto.findMany({
    where: { usuarioId: req.userId },
    orderBy: { id: "desc" },
    include: { problema: { include: { categoria: true, imagens: true, _count: { select: { votos: true } } } } }
  });
  res.json(votes.map(({ problema }) => ({
    id: problema.id, title: problema.titulo, description: problema.descricao,
    address: problema.endereco, state: problema.estado, city: problema.cidade,
    category: problema.categoria ? { id: problema.categoria.id, name: problema.categoria.nome, color: problema.categoria.cor } : null,
    images: problema.imagens, votes: problema._count.votos
  })));
}));

router.get("/users/:id/friendship", asyncHandler(async (req, res) => {
  const friendship = await prisma.amizade.findFirst({
    where: { OR: [{ solicitanteId: req.userId, destinatarioId: req.params.id }, { solicitanteId: req.params.id, destinatarioId: req.userId }] },
    include: { solicitante: { select: publicUser }, destinatario: { select: publicUser } }
  });
  res.json(friendship || { status: "NONE" });
}));

router.post("/users/:id/friendship", asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (targetId === req.userId) return res.status(400).json({ error: "Você não pode adicionar a si mesmo." });
  const target = await prisma.usuario.findUnique({ where: { id: targetId }, select: publicUser });
  if (!target) return res.status(404).json({ error: "Usuário não encontrado." });
  const existing = await prisma.amizade.findFirst({ where: { OR: [{ solicitanteId: req.userId, destinatarioId: targetId }, { solicitanteId: targetId, destinatarioId: req.userId }] } });
  if (existing?.status === "PENDENTE" || existing?.status === "ACEITA") {
    return res.status(409).json({ error: "Já existe uma solicitação ou amizade.", friendship: existing });
  }
  if (existing?.status === "RECUSADA") await prisma.amizade.delete({ where: { id: existing.id } });
  const friendship = await prisma.amizade.create({ data: { solicitanteId: req.userId, destinatarioId: targetId } });
  await createNotification({ usuarioId: targetId, tipo: "AMIZADE_SOLICITACAO", titulo: "Nova solicitação de amizade", mensagem: "Alguém quer fazer parte da sua rede.", link: `/profile/${req.userId}` });
  res.status(201).json(friendship);
}));

router.patch("/friendships/:id", asyncHandler(async (req, res) => {
  const action = String(req.body.action || "");
  const friendship = await prisma.amizade.findUnique({ where: { id: req.params.id } });
  if (!friendship) return res.status(404).json({ error: "Solicitação não encontrada." });
  const isRecipient = friendship.destinatarioId === req.userId;
  const isSender = friendship.solicitanteId === req.userId;
  if (!isRecipient && !isSender) return res.status(403).json({ error: "Sem autorização." });
  if (action === "accept" && isRecipient && friendship.status === "PENDENTE") {
    const updated = await prisma.amizade.update({ where: { id: friendship.id }, data: { status: "ACEITA" } });
    await createNotification({ usuarioId: friendship.solicitanteId, tipo: "AMIZADE_ACEITA", titulo: "Solicitação aceita", mensagem: "Sua solicitação de amizade foi aceita.", link: `/profile/${req.userId}` });
    return res.json(updated);
  }
  if (action === "reject" && isRecipient && friendship.status === "PENDENTE") return res.json(await prisma.amizade.update({ where: { id: friendship.id }, data: { status: "RECUSADA" } }));
  if (action === "cancel" && isSender && friendship.status === "PENDENTE") return res.json(await prisma.amizade.delete({ where: { id: friendship.id } }));
  if (action === "remove" && friendship.status === "ACEITA") return res.json(await prisma.amizade.delete({ where: { id: friendship.id } }));
  return res.status(400).json({ error: "Ação inválida para esta relação." });
}));

router.get("/friends", asyncHandler(async (req, res) => {
  const relations = await prisma.amizade.findMany({
    where: { status: "ACEITA", OR: [{ solicitanteId: req.userId }, { destinatarioId: req.userId }] },
    include: { solicitante: { select: publicUser }, destinatario: { select: publicUser } },
    orderBy: { atualizadaEm: "desc" }
  });
  res.json(relations.map((item) => item.solicitanteId === req.userId ? item.destinatario : item.solicitante));
}));

router.get("/friend-requests", asyncHandler(async (req, res) => {
  const requests = await prisma.amizade.findMany({ where: { destinatarioId: req.userId, status: "PENDENTE" }, include: { solicitante: { select: publicUser } }, orderBy: { criadaEm: "desc" } });
  res.json(requests);
}));

router.get("/friend-requests/sent", asyncHandler(async (req, res) => {
  const requests = await prisma.amizade.findMany({ where: { solicitanteId: req.userId, status: "PENDENTE" }, include: { destinatario: { select: publicUser } }, orderBy: { criadaEm: "desc" } });
  res.json(requests);
}));

export default router;
