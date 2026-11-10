import express from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { memoryImageUpload } from "../middleware/memoryUpload.js";
import { removeStoredFile, storeFile } from "../config/storage.js";

const router = express.Router();
const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const profileUpload = memoryImageUpload();

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
        username: true,
        telefone: true,
        bio: true,
        nivel: true,
        admin: { select: { id: true } },
        fotoPerfil: true,
        emailVerificado: true,
        dataCriacao: true
      }
    });
    res.json({ ...user, name: user.nome, phone: user.telefone, avatar: user.fotoPerfil, role: user.admin ? "admin" : user.nivel.toLowerCase() });
  })
);

// Atualizar perfil
router.put(
  "/me",
  profileUpload.single("avatarFile"),
  asyncHandler(async (req, res) => {
    const { name, username, phone, bio, avatar } = req.body;
    const current = await prisma.usuario.findUnique({
      where: { id: req.userId },
      select: { fotoPerfil: true }
    });
    let uploadedAvatar = null;
    if (req.file) uploadedAvatar = await storeFile(req.file, "avatars", req.userId);

    try {
      const user = await prisma.usuario.update({
        where: { id: req.userId },
        data: {
          ...(name !== undefined && { nome: name.trim() }),
          ...(username !== undefined && { username: username ? username.replace(/^@/, "").trim().toLowerCase() : null }),
          ...(phone !== undefined && { telefone: phone ? normalizePhone(phone) || null : null }),
          ...(bio !== undefined && { bio: bio || null }),
          ...(avatar !== undefined && { fotoPerfil: avatar || null }),
          ...(uploadedAvatar && { fotoPerfil: uploadedAvatar.url })
        },
        select: {
          id: true,
          nome: true,
          email: true,
          username: true,
          telefone: true,
          bio: true,
          nivel: true,
          admin: { select: { id: true } },
          fotoPerfil: true,
          emailVerificado: true,
          dataCriacao: true
        }
      });

      const nextAvatar = uploadedAvatar?.url || (avatar !== undefined ? avatar || null : current?.fotoPerfil);
      if (current?.fotoPerfil && current.fotoPerfil !== nextAvatar) {
        await removeStoredFile(current.fotoPerfil).catch((error) => {
          console.error("Falha ao remover avatar anterior:", error.message);
        });
      }

      res.json({ ...user, name: user.nome, phone: user.telefone, avatar: user.fotoPerfil, role: user.admin ? "admin" : user.nivel.toLowerCase() });
    } catch (error) {
      if (uploadedAvatar) {
        await removeStoredFile(uploadedAvatar.url).catch((cleanupError) => {
          console.error("Falha ao limpar avatar após erro de atualização:", cleanupError.message);
        });
      }
      throw error;
    }
  })
);

export default router;
