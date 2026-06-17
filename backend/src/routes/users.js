import express from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

const router = express.Router();

// Perfil do usuário
router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await prisma.usuario.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        fotoPerfil: true,
        bio: true,
        ativo: true,
        ultimoLogin: true,
        dataCriacao: true
      }
    });
    res.json(user);
  })
);

// Atualizar perfil
router.put(
  "/me",
  asyncHandler(async (req, res) => {
    const { name, phone, bio, avatar } = req.body;

    const user = await prisma.usuario.update({
      where: { id: req.userId },
      data: {
        nome: name,
        telefone: phone,
        bio: bio,
        fotoPerfil: avatar
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        fotoPerfil: true,
        bio: true,
        ativo: true,
        dataCriacao: true
      }
    });

    res.json(user);
  })
);

export default router;
