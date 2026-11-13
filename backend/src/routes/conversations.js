import { writeNotification } from '../services/notifications.js';
import { announceNotification } from '../utils/notifications.js';
import express from 'express';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { createMessaging } from '../services/messaging.js';
const router = express.Router();
const messaging = createMessaging(prisma, { notify: writeNotification });
router.get('/', asyncHandler(async (req, res) => res.json(await messaging.list(req.userId))));
router.post('/:userId', asyncHandler(async (req, res) => res.status(201).json(await messaging.open(req.userId, req.params.userId))));
router.get('/:id/messages', asyncHandler(async (req, res) => { res.set('Cache-Control', 'private, no-store'); res.json(await messaging.history(req.userId, req.params.id, req.query)); }));
router.post('/:id/messages', asyncHandler(async (req, res) => {
  const { notification, ...result } = await messaging.send(req.userId, req.params.id, req.body.texto);
  if (notification) void announceNotification(notification).catch(error => console.error(JSON.stringify({ event:'notification_delivery_pending', code:error.code || error.name })));
  res.status(201).json(result);
}));
export default router;
