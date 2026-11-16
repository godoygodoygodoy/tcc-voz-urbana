import express from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { createSocialSafety } from '../services/socialSafety.js';
const router = express.Router(),
  safety = createSocialSafety(prisma);
router.use(authMiddleware);
const limit = rateLimit({
  windowMs: 60000,
  limit: 15,
  keyGenerator: req => req.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'requestRateLimited'
  }
});
router.get('/preferences', asyncHandler(async (req, res) => res.json(await safety.preferences(req.userId))));
router.get('/close-friends', asyncHandler(async (req, res) => res.json(await safety.closeFriends(req.userId, req.query))));
router.put('/close-friends/:id', limit, asyncHandler(async (req, res) => res.json(await safety.setCloseFriend(req.userId, req.params.id, req.body.enabled))));
router.put('/preferences', limit, asyncHandler(async (req, res) => res.json(await safety.preferences(req.userId, req.body))));
router.get('/relationships', asyncHandler(async (req, res) => res.json(await safety.list(req.userId, req.query))));
router.get('/hidden', asyncHandler(async (req, res) => res.json(await safety.hidden(req.userId, req.query))));
router.get('/users/:id', asyncHandler(async (req, res) => res.json(await safety.state(req.userId, req.params.id))));
for (const [path, type] of [['block', 'BLOQUEIO'], ['mute', 'SILENCIO']]) router.put('/users/:id/' + path, limit, asyncHandler(async (req, res) => res.json(await safety.relation(req.userId, req.params.id, type, req.body.enabled))));
router.put('/hidden/:id', limit, asyncHandler(async (req, res) => res.json(await safety.hide(req.userId, req.params.id, req.body.enabled))));
router.post('/reports', limit, asyncHandler(async (req, res) => res.status(201).json(await safety.report(req, req.body))));
router.get('/reports', asyncHandler(async (req, res) => res.json(await safety.reports(req, req.query))));
router.patch('/reports/:id', limit, asyncHandler(async (req, res) => res.json(await safety.review(req, req.params.id, req.body))));
export default router;
