import express from "express";
import crypto from "node:crypto";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { optionalAuthMiddleware } from "../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  optionalAuthMiddleware,
  asyncHandler(async (req, res) => {
    const visitanteId = String(req.body?.visitorId || "").trim();
    const caminho = String(req.body?.path || "/").trim().slice(0, 255) || "/";

    if (!/^[a-zA-Z0-9._:-]{16,128}$/.test(visitanteId)) {
      return res.status(400).json({ error: "Identificador de visitante inválido." });
    }

    await prisma.visita.create({
      data: {
        id: crypto.randomUUID(),
        visitanteId,
        caminho,
        usuarioId: req.userId || null
      }
    });

    return res.status(201).json({ recorded: true });
  })
);

export default router;
