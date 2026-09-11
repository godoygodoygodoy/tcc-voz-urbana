import express from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middlewares/auth.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();
const profileUploadDir = path.resolve(process.cwd(), "uploads", "profiles");
fs.mkdirSync(profileUploadDir, { recursive: true });
const profileUpload = multer({
  storage: multer.diskStorage({
    destination: profileUploadDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/"))
});

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
        fotoPerfil: true,
        emailVerificado: true,
        dataCriacao: true
      }
    });
    res.json({ ...user, name: user.nome, phone: user.telefone, avatar: user.fotoPerfil });
  })
);

// Atualizar perfil
router.put(
  "/me",
  profileUpload.single("avatarFile"),
  asyncHandler(async (req, res) => {
    const { name, username, phone, bio, avatar } = req.body;

    const user = await prisma.usuario.update({
      where: { id: req.userId },
      data: {
        ...(name !== undefined && { nome: name.trim() }),
        ...(username !== undefined && { username: username ? username.replace(/^@/, "").trim().toLowerCase() : null }),
        ...(phone !== undefined && { telefone: phone || null }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(avatar !== undefined && { fotoPerfil: avatar || null }),
        ...(req.file && { fotoPerfil: `/uploads/profiles/${req.file.filename}` })
      },
      select: {
        id: true,
        nome: true,
        email: true,
        username: true,
        telefone: true,
        bio: true,
        nivel: true,
        fotoPerfil: true,
        emailVerificado: true,
        dataCriacao: true
      }
    });

    res.json({ ...user, name: user.nome, phone: user.telefone, avatar: user.fotoPerfil });
  })
);

export default router;
