import express from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/prisma.js';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { createSocialPublishing } from '../services/socialPublishing.js';
import { announceNotification } from '../utils/notifications.js';
const router = express.Router(),
  publishing = createSocialPublishing(prisma),
  limit = rateLimit({
    windowMs: 60000,
    limit: 10,
    keyGenerator: req => req.userId,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'requestRateLimited'
    }
  });
router.get('/reposts', optionalAuthMiddleware, asyncHandler(async (req, res) => res.json(await publishing.reposts(req, req.query))));
router.use(authMiddleware);
router.get('/notes', asyncHandler(async (req, res) => res.json(await publishing.notes(req.userId, req.query))));
router.put('/notes/me', limit, asyncHandler(async (req, res) => res.json(await publishing.saveNote(req.userId, req.body))));
router.delete('/notes/:id', limit, asyncHandler(async (req, res) => {
  await publishing.removeNote(req.userId, req.params.id);
  res.sendStatus(204);
}));
router.put('/reposts/:id', limit, asyncHandler(async (req, res) => {
  const result = await publishing.repost(req, req.params.id, req.body.comment ?? '');
  if (result.notification) void announceNotification(result.notification).catch(() => {});
  res.json({
    id: result.id
  });
}));
router.delete('/reposts/:id', limit, asyncHandler(async (req, res) => {
  await publishing.removeRepost(req.userId, req.params.id);
  res.sendStatus(204);
}));
export default router;
