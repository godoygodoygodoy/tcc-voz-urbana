import express from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

const router = express.Router();
router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  const notifications = await prisma.notificacao.findMany({
    where: { usuarioId: req.userId },
    orderBy: { dataCriacao: "desc" },
    take: 50
  });
  res.json(notifications);
}));

router.patch("/:id/read", asyncHandler(async (req, res) => {
  const notification = await prisma.notificacao.updateMany({
    where: { id: req.params.id, usuarioId: req.userId },
    data: { lida: true }
  });
  res.json({ updated: notification.count > 0 });
}));

router.patch("/read-all", asyncHandler(async (req, res) => {
  const result = await prisma.notificacao.updateMany({
    where: { usuarioId: req.userId, lida: false },
    data: { lida: true }
  });
  res.json({ updated: result.count });
}));

export default router;
