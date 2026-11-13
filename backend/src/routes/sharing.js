import express from 'express';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { publicShare } from '../services/sharing.js';
import { readStoredPublication } from '../config/storage.js';
const apiRouter = express.Router();
export const publicShareRouter = express.Router();
const origins = req => ({
  apiOrigin: process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_API_URL || req.protocol + '://' + req.get('host'),
  frontendUrl: process.env.FRONTEND_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000/tecti/2026/gpec03' : undefined),
  language: req.query.lang
});
apiRouter.get('/:id', asyncHandler(async (req, res) => {
  const options = origins(req);
  if (!options.frontendUrl) return res.status(503).json({
    error: 'shareUnavailable'
  });
  const {
    html,
    ...data
  } = await publicShare(prisma, req.params.id, options);
  res.set('Cache-Control', 'private, no-store').json(data);
}));
publicShareRouter.get('/problem/:id', asyncHandler(async (req, res) => {
  const options = origins(req);
  if (!options.frontendUrl) return res.sendStatus(503);
  const data = await publicShare(prisma, req.params.id, options);
  res.set({
    'Cache-Control': 'private, no-store',
    'Content-Type': 'text/html; charset=utf-8'
  }).send(data.html);
}));
apiRouter.get('/:id/image/:imageId', asyncHandler(async (req, res) => {
  const image = await prisma.imagem.findFirst({
    where: {
      id: req.params.imageId,
      problemaId: req.params.id,
      problema: {
        is: {
          usuario: {
            is: {
              perfilPrivado: false
            }
          }
        }
      }
    }
  });
  if (!image) return res.sendStatus(404);
  const file = await readStoredPublication(image.url);
  res.set({
    'Content-Type': file.contentType,
    'Cache-Control': 'private, no-store',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff'
  }).send(file.buffer);
}));
export default apiRouter;
