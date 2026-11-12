import path from 'node:path';
import express from 'express';
import { uploadsRoot } from './uploads.js';
import { prisma } from './prisma.js';
import { optionalAuthMiddleware } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { visibleProblemWhere } from '../services/socialGraph.js';

export const uploadedMedia = express.Router();
uploadedMedia.use(optionalAuthMiddleware, asyncHandler(async (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'private, no-store');
  // Prevent old local file URLs from bypassing profile privacy after migration.
  let normalized;
  try { normalized = path.posix.normalize(decodeURIComponent(req.path)); } catch { return res.sendStatus(400); }
  if (!normalized.startsWith('/avatars/')) {
    const image = await prisma.imagem.findFirst({ where: { url: `/uploads${normalized}`, problema: { is: visibleProblemWhere(req) } }, select: { id: true } });
    if (!image) return res.sendStatus(404);
  }
  next();
}), express.static(uploadsRoot, { cacheControl: false }));
