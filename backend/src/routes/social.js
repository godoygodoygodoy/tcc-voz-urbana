import { publicationImages } from '../services/publicationMedia.js';
﻿import express from 'express';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { optionalAuthMiddleware } from '../middlewares/auth.js';
import { createNotification } from '../utils/notifications.js';
import { createPeopleSearch } from '../services/peopleSearch.js';
import { canViewProfile, createSocialGraph, publicUser, relationship, visibleProblemWhere } from '../services/socialGraph.js';

const router = express.Router();
const graph = createSocialGraph(prisma);
export const publicSocialRouter = express.Router();
publicSocialRouter.use(optionalAuthMiddleware, (req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
publicSocialRouter.get('/users/search', asyncHandler(createPeopleSearch(prisma)));

const serializeProblem = (problem, req) => ({
  id: problem.id, title: problem.titulo, description: problem.descricao, address: problem.endereco,
  state: problem.estado, city: problem.cidade, status: problem.status, createdAt: problem.dataCriacao,
  category: problem.categoria ? { id: problem.categoria.id, name: problem.categoria.nome, color: problem.categoria.cor } : null,
  images: publicationImages(problem.imagens, req), votes: problem._count.votos,
});
const getProfile = async (req, res, where) => {
  const user = await prisma.usuario.findUnique({ where, select: { ...publicUser, bio: true, dataCriacao: true, _count: { select: { problemas: true } } } });
  if (!user) return res.status(404).json({ error: 'profileNotFound' });
  const canViewPosts = await canViewProfile(prisma, user, req.userId, req.userRole === 'admin');
  const [followers, following, likes, publications, relation] = await Promise.all([
    prisma.seguimento.count({ where: { followingId: user.id, status: 'ACEITA' } }),
    prisma.seguimento.count({ where: { followerId: user.id, status: 'ACEITA' } }),
    prisma.voto.count({ where: { usuarioId: user.id } }),
    canViewPosts ? prisma.problema.findMany({ where: { usuarioId: user.id }, orderBy: { dataCriacao: 'desc' }, take: 30, include: { categoria: true, imagens: true, _count: { select: { votos: true } } } }) : [],
    relationship(prisma, req.userId, user.id),
  ]);
  res.json({ id: user.id, name: user.nome, username: user.username, avatar: user.fotoPerfil, bio: user.bio, joinedAt: user.dataCriacao, isPrivate: user.perfilPrivado, canViewPosts, followers, following, likes, publicationCount: user._count.problemas, publications: publications.map(problem => serializeProblem(problem, req)), relationship: relation });
};
publicSocialRouter.get('/users/username/:username/profile', asyncHandler((req, res) => getProfile(req, res, { username: req.params.username.replace(/^@/, '').trim().toLowerCase() })));
publicSocialRouter.get('/users/:id/profile', asyncHandler((req, res) => getProfile(req, res, { id: req.params.id })));
for (const direction of ['followers', 'following']) publicSocialRouter.get(`/users/:id/${direction}`, asyncHandler(async (req, res) => {
  const owner = await prisma.usuario.findUnique({ where: { id: req.params.id }, select: { id: true, perfilPrivado: true } });
  if (!owner) return res.status(404).json({ error: 'profileNotFound' });
  if (!await canViewProfile(prisma, owner, req.userId, req.userRole === 'admin')) return res.status(403).json({ error: 'privateProfileNotice' });
  const page = Math.min(10000, Math.max(1, Math.trunc(Number(req.query.page)) || 1));
  const limit = 30;
  const where = { [direction === 'followers' ? 'followingId' : 'followerId']: owner.id, status: 'ACEITA' };
  const side = direction === 'followers' ? 'follower' : 'following';
  const [total, rows] = await Promise.all([
    prisma.seguimento.count({ where }),
    prisma.seguimento.findMany({ where, include: { [side]: { select: publicUser } }, orderBy: [{ criadaEm: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
  ]);
  res.json({ data: rows.map(row => row[side]), total, page, limit });
}));

router.get('/users/:id/likes', asyncHandler(async (req, res) => {
  if (req.params.id !== req.userId) return res.status(403).json({ error: 'Curtidas privadas.' });
  const votes = await prisma.voto.findMany({ where: { usuarioId: req.userId, problema: { is: visibleProblemWhere(req) } }, orderBy: { id: 'desc' }, include: { problema: { include: { categoria: true, imagens: true, _count: { select: { votos: true } } } } } });
  res.json(votes.map(({ problema }) => serializeProblem(problema, req)));
}));
router.get('/users/:id/relationship', asyncHandler(async (req, res) => res.json(await relationship(prisma, req.userId, req.params.id))));
router.post('/users/:id/follow', asyncHandler(async (req, res) => {
  const result = await graph.follow(req.userId, req.params.id);
  if (result.changed) await createNotification({ usuarioId: req.params.id, tipo: result.pending ? 'SEGUIR_SOLICITACAO' : 'NOVO_SEGUIDOR', titulo: result.pending ? "Nova solicitação para seguir" : "Novo seguidor", mensagem: result.pending ? "Uma pessoa pediu para seguir seu perfil privado." : "Uma pessoa começou a seguir seu perfil.", link: `/profile/${req.userId}` });
  res.status(201).json(result);
}));
router.delete('/users/:id/follow', asyncHandler(async (req, res) => res.json(await graph.unfollow(req.userId, req.params.id))));
router.patch('/follow-requests/:id', asyncHandler(async (req, res) => {
  const result = await graph.respond(req.userId, req.params.id, String(req.body.action || ''));
  if (req.body.action === 'accept') await createNotification({ usuarioId: result.request.followerId, tipo: 'SEGUIR_ACEITA', titulo: "Solicitação para seguir aprovada", mensagem: "Sua solicitação para seguir foi aprovada.", link: `/profile/${req.userId}` });
  res.json(result.relationship);
}));
for (const direction of ['received', 'sent']) router.get(`/follow-requests/${direction}`, asyncHandler(async (req, res) => {
  const side = direction === 'received' ? 'followingId' : 'followerId';
  const requests = await prisma.seguimento.findMany({ where: { [side]: req.userId, status: 'PENDENTE' }, include: { follower: { select: publicUser }, following: { select: publicUser } }, orderBy: [{ criadaEm: 'desc' }, { id: 'asc' }] });
  res.json(requests);
}));
export default router;
