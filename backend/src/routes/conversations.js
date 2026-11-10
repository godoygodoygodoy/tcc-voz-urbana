import express from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

const router = express.Router();
const publicUser = { id: true, nome: true, username: true, fotoPerfil: true };

const friendshipWhere = (userId, otherId) => ({
  status: "ACEITA",
  OR: [
    { solicitanteId: userId, destinatarioId: otherId },
    { solicitanteId: otherId, destinatarioId: userId }
  ]
});

const getFriendship = (userId, otherId) => prisma.amizade.findFirst({ where: friendshipWhere(userId, otherId) });

router.get("/", asyncHandler(async (req, res) => {
  const conversations = await prisma.conversa.findMany({
    where: { OR: [{ usuarioAId: req.userId }, { usuarioBId: req.userId }] },
    include: {
      usuarioA: { select: publicUser },
      usuarioB: { select: publicUser },
      mensagens: { orderBy: { criadaEm: "desc" }, take: 1 }
    },
    orderBy: { atualizadaEm: "desc" }
  });
  res.json(conversations.map((conversation) => ({
    ...conversation,
    amigo: conversation.usuarioAId === req.userId ? conversation.usuarioB : conversation.usuarioA,
    ultimaMensagem: conversation.mensagens[0] || null
  })));
}));

router.post("/:userId", asyncHandler(async (req, res) => {
  const otherId = req.params.userId;
  if (otherId === req.userId) return res.status(400).json({ error: "Você não pode conversar consigo mesmo." });
  if (!await getFriendship(req.userId, otherId)) {
    return res.status(403).json({ error: "Confirme a amizade bilateral antes de iniciar uma conversa." });
  }
  const [usuarioAId, usuarioBId] = [req.userId, otherId].sort();
  const conversation = await prisma.conversa.upsert({
    where: { usuarioAId_usuarioBId: { usuarioAId, usuarioBId } },
    update: {},
    create: { usuarioAId, usuarioBId },
    include: { usuarioA: { select: publicUser }, usuarioB: { select: publicUser }, mensagens: true }
  });
  res.status(201).json({ ...conversation, amigo: conversation.usuarioAId === req.userId ? conversation.usuarioB : conversation.usuarioA });
}));

router.get("/:id/messages", asyncHandler(async (req, res) => {
  const conversation = await prisma.conversa.findFirst({
    where: { id: req.params.id, OR: [{ usuarioAId: req.userId }, { usuarioBId: req.userId }] }
  });
  if (!conversation) return res.status(404).json({ error: "Conversa não encontrada." });
  if (!await getFriendship(req.userId, conversation.usuarioAId === req.userId ? conversation.usuarioBId : conversation.usuarioAId)) {
    return res.status(403).json({ error: "A amizade não está confirmada." });
  }
  res.json(await prisma.mensagem.findMany({
    where: { conversaId: conversation.id },
    include: { remetente: { select: publicUser } },
    orderBy: { criadaEm: "asc" }
  }));
}));

router.post("/:id/messages", asyncHandler(async (req, res) => {
  const texto = String(req.body.texto || "").trim();
  if (texto.length < 1 || texto.length > 2000) return res.status(400).json({ error: "A mensagem deve ter entre 1 e 2000 caracteres." });
  const conversation = await prisma.conversa.findFirst({
    where: { id: req.params.id, OR: [{ usuarioAId: req.userId }, { usuarioBId: req.userId }] }
  });
  if (!conversation) return res.status(404).json({ error: "Conversa não encontrada." });
  const otherId = conversation.usuarioAId === req.userId ? conversation.usuarioBId : conversation.usuarioAId;
  if (!await getFriendship(req.userId, otherId)) return res.status(403).json({ error: "A amizade não está confirmada." });
  const message = await prisma.mensagem.create({
    data: { texto, conversaId: conversation.id, remetenteId: req.userId },
    include: { remetente: { select: publicUser } }
  });
  res.status(201).json(message);
}));

export default router;
