import express from 'express';
import { prisma } from '../config/prisma.js';
import { authMiddleware, optionalAuthMiddleware, adminMiddleware } from '../middlewares/auth.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { createProblemTracking } from '../services/problemTracking.js';
import { listStages, configureStage } from '../services/workflow.js';
import { memoryImageUpload } from '../middleware/memoryUpload.js';
import { storeFiles, removeStoredFiles } from '../config/storage.js';
import { attachComparison } from '../services/comparisons.js';
const router = express.Router(),
  service = createProblemTracking(prisma);
const upload = memoryImageUpload({
  limits: {
    files: 2
  }
});
router.get('/stages', asyncHandler(async (req, res) => res.json({
  data: await listStages(prisma)
})));
router.put('/stages/:code', authMiddleware, adminMiddleware, asyncHandler(async (req, res) => res.json(await configureStage(prisma, req.userId, req.params.code, req.body))));
router.get('/:id/confirmations', optionalAuthMiddleware, asyncHandler(async (req, res) => res.json(await service.confirmations(req, req.params.id))));
router.put('/:id/confirmations', authMiddleware, asyncHandler(async (req, res) => res.json(await service.confirm(req, req.params.id, req.body.choice))));
router.get('/:id/timeline', optionalAuthMiddleware, asyncHandler(async (req, res) => res.json(await service.timeline(req, req.params.id, req.query.cursor))));
router.get('/:id/related', optionalAuthMiddleware, asyncHandler(async (req, res) => res.json(await service.related(req, req.params.id))));
router.post('/:id/comparison', authMiddleware, upload.fields([{
  name: 'before',
  maxCount: 1
}, {
  name: 'after',
  maxCount: 1
}]), asyncHandler(async (req, res) => {
  const problem = await prisma.problema.findUnique({
    where: {
      id: req.params.id
    },
    select: {
      usuarioId: true
    }
  });
  if (!problem) return res.status(404).json({
    error: 'problemNotFound'
  });
  if (problem.usuarioId !== req.userId && !req.isAdmin) return res.status(403).json({
    error: 'comparisonForbidden'
  });
  const files = [req.files?.before?.[0], req.files?.after?.[0]];
  if (files.some(file => !file)) return res.status(400).json({
    error: 'comparisonFilesRequired'
  });
  const stored = await storeFiles(files, 'reports', req.userId);
  try {
    res.status(201).json(await attachComparison(prisma, req.userId, req.params.id, stored.map(file => file.url)));
  } catch (error) {
    await removeStoredFiles(stored.map(file => file.url)).catch(() => {});
    throw error;
  }
}));
export default router;
