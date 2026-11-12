import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { optionalAuthMiddleware } from '../middlewares/auth.js';
import { readStoredPublication } from '../config/storage.js';
import { canViewProfile } from '../services/socialGraph.js';
const router = express.Router();
router.get('/:id', optionalAuthMiddleware, asyncHandler(async (req, res) => {
  let viewerId = req.userId;
  if (req.query.access) {
    try {
      const ticket = jwt.verify(String(req.query.access), process.env.JWT_SECRET, { audience: 'publication-image' });
      if (ticket.imageId !== req.params.id) return res.sendStatus(404);
      viewerId = ticket.viewerId;
    } catch { return res.sendStatus(404); }
  }
  const viewer = viewerId ? await prisma.usuario.findUnique({ where: { id: viewerId }, select: { id: true, admin: { select: { id: true } } } }) : null;
  const image = await prisma.imagem.findUnique({ where: { id: req.params.id }, include: { problema: { select: { usuario: { select: { id: true, perfilPrivado: true } } } } } });
  if (!image || !await canViewProfile(prisma, image.problema.usuario, viewer?.id, Boolean(viewer?.admin))) return res.sendStatus(404);
  const file = await readStoredPublication(image.url);
  res.set({ 'Content-Type': file.contentType, 'Cache-Control': 'private, no-store', 'Cross-Origin-Resource-Policy': 'cross-origin', 'X-Content-Type-Options': 'nosniff' });
  res.send(file.buffer);
}));
export default router;
