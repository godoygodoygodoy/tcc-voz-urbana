import express from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { createNotification } from "../utils/notifications.js";

const router = express.Router();
const publicUser = { id: true, nome: true, username: true, fotoPerfil: true, bio: true };

router.get("/users/search", asyncHandler(async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 2) return res.json({ data: [], page: 1, total: 0 });
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 12));
  const where = { OR: [{ nome: { contains: query } }, { username: { contains: query.replace(/^@/, "") } }] };
  const [total, users] = await Promise.all([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({ where, select: publicUser, orderBy: { nome: "asc" }, skip: (page - 1) * limit, take: limit })
  ]);
  res.json({ data: users, page, limit, total });
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
  if (existing) return res.status(409).json({ error: "Já existe uma solicitação ou amizade.", friendship: existing });
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

export default router;
