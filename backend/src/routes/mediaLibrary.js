import express from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { mediaProviders } from '../services/mediaProviders.js';
const router = express.Router();
router.use(authMiddleware, rateLimit({
  windowMs: 60000,
  limit: 30,
  keyGenerator: req => req.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'mediaProviderRateLimited'
  }
}));
router.get('/providers', (req, res) => res.json(mediaProviders.status()));
router.get('/music/search', asyncHandler(async (req, res) => res.json(await mediaProviders.search(req.query))));
router.get('/music/token', asyncHandler(async (req, res) => res.set('Cache-Control', 'private, no-store').json(mediaProviders.clientToken(req.get('origin')))));
export default router;
