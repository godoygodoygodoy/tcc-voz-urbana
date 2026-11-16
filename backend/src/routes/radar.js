import express from 'express';
import { prisma } from '../config/prisma.js';
import { optionalAuthMiddleware } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { createRadar } from '../services/radar.js';
const router = express.Router(),
  radar = createRadar(prisma);
router.use(optionalAuthMiddleware);
router.get('/', asyncHandler(async (req, res) => res.json(await radar.list(req, req.query))));
export default router;
