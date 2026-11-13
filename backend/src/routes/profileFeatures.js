import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { createProfileFeatures, coverUrl } from '../services/profileFeatures.js';
import { canViewProfile } from '../services/socialGraph.js';
import { memoryImageUpload } from '../middleware/memoryUpload.js';
import { storeFile, removeStoredFile, removeOwnedStoredFile, readStoredPublication } from '../config/storage.js';
const router = express.Router(),
  service = createProfileFeatures(prisma),
  upload = memoryImageUpload();
router.get('/me/presentation', authMiddleware, asyncHandler(async (req, res) => {
  const user = await prisma.usuario.findUnique({
    where: {
      id: req.userId
    },
    select: {
      apresentacao: true,
      capaUrl: true
    }
  });
  if (!user) return res.status(404).json({
    error: 'profileNotFound'
  });
  res.json({
    presentation: user.apresentacao || '',
    cover: user.capaUrl ? coverUrl(req.userId, req.userId) : null
  });
}));
router.get('/:id/stats', optionalAuthMiddleware, asyncHandler(async (req, res) => res.json(await service.stats(req, req.params.id))));
router.put('/pins/:id', authMiddleware, asyncHandler(async (req, res) => res.json(await service.pin(req.userId, req.params.id, true))));
router.delete('/pins/:id', authMiddleware, asyncHandler(async (req, res) => res.json(await service.pin(req.userId, req.params.id, false))));
router.put('/me/presentation', authMiddleware, upload.single('cover'), asyncHandler(async (req, res) => {
  if(req.body.removeCover!==undefined&&![true,false,'true','false'].includes(req.body.removeCover))return res.status(400).json({error:'profilePresentationInvalid'});
  const stored = req.file ? await storeFile(req.file, 'covers', req.userId) : null;
  let result;
  try {
    result = await service.update(req.userId, {
      presentation: req.body.presentation,
      cover: stored?.url,
      removeCover: req.body.removeCover === undefined ? undefined : req.body.removeCover === true || req.body.removeCover === 'true'
    });
  } catch (error) {
    if (stored) await removeStoredFile(stored.url).catch(() => {});
    throw error;
  }
  if (result.previousCover) await removeOwnedStoredFile(result.previousCover, 'covers', req.userId).catch(() => {});
  res.json({
    saved: true
  });
}));
router.get('/:id/cover', optionalAuthMiddleware, asyncHandler(async (req, res) => {
  let viewerId = req.userId,
    isAdmin = req.isAdmin === true;
  if (req.query.access) {
    try {
      const ticket = jwt.verify(req.query.access, process.env.JWT_SECRET, {
        audience: 'profile-cover'
      });
      if (ticket.ownerId !== req.params.id) return res.sendStatus(404);
      viewerId = ticket.viewerId;
      const viewer = viewerId ? await prisma.usuario.findUnique({
        where: {
          id: viewerId
        },
        select: {
          id: true,
          admin: {
            select: {
              id: true
            }
          }
        }
      }) : null;
      if (viewerId && !viewer) return res.sendStatus(404);
      isAdmin = Boolean(viewer?.admin);
    } catch {
      return res.sendStatus(404);
    }
  }
  const owner = await prisma.usuario.findUnique({
    where: {
      id: req.params.id
    },
    select: {
      id: true,
      perfilPrivado: true,
      capaUrl: true
    }
  });
  if (!owner?.capaUrl || !(await canViewProfile(prisma, owner, viewerId, isAdmin))) return res.sendStatus(404);
  const image = await readStoredPublication(owner.capaUrl);
  res.set({
    'Cache-Control': 'private, no-store',
    'Content-Type': image.contentType,
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  });
  res.send(image.buffer);
}));
export default router;
