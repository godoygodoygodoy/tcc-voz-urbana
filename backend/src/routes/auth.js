import express from "express";
import jwt from "jsonwebtoken";
import Joi from "joi";
import { prisma } from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import crypto from "crypto";
import { sendVerificationEmail } from "../utils/email.js";

const router = express.Router();

// Validação
const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email, password } = value;

    const existingUser = await prisma.usuario.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email já cadastrado" });
    }

    const senhaHash = await hashPassword(password);
    const tokenVerificacao = crypto.randomBytes(32).toString("hex");

    const user = await prisma.usuario.create({
      data: {
        nome: name,
        email,
        senhaHash,
        tokenVerificacao,
        tokenVerificacaoExpira: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      select: {
        id: true,
        nome: true,
        email: true,
        fotoPerfil: true,
        dataCriacao: true,
        username: true,
        emailVerificado: true
      }
    });

    try {
      await sendVerificationEmail({ email: user.email, name: user.nome, token: tokenVerificacao });
    } catch (emailError) {
      console.error("Falha ao enviar verificação de e-mail:", emailError.message);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    res.status(201).json({
      message: "Usuário registrado com sucesso",
      user: { ...user, name: user.nome, avatar: user.fotoPerfil },
      token
    });
  })
);

// Login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    const user = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const isValid = await comparePassword(password, user.senhaHash);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    const { senhaHash, tokenVerificacao, tokenVerificacaoExpira, ...userWithoutPassword } = user;

    res.json({
      message: "Login bem-sucedido",
      user: { ...userWithoutPassword, name: userWithoutPassword.nome, avatar: userWithoutPassword.fotoPerfil },
      token
    });
  })
);

router.get("/verify-email", asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token de verificação ausente" });

  const user = await prisma.usuario.findFirst({ where: { tokenVerificacao: token } });
  if (!user) return res.status(400).json({ error: "Token inválido" });
  if (user.tokenVerificacaoExpira && user.tokenVerificacaoExpira < new Date()) {
    return res.status(400).json({ error: "Token expirado" });
  }

  await prisma.usuario.update({
    where: { id: user.id },
    data: { emailVerificado: true, tokenVerificacao: null, tokenVerificacaoExpira: null }
  });
  res.json({ message: "E-mail verificado com sucesso" });
}));

router.post("/resend-verification", asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user || user.emailVerificado) return res.json({ message: "Se a conta existir, um novo e-mail será enviado" });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.usuario.update({
    where: { id: user.id },
    data: { tokenVerificacao: token, tokenVerificacaoExpira: new Date(Date.now() + 24 * 60 * 60 * 1000) }
  });
  await sendVerificationEmail({ email: user.email, name: user.nome, token });
  res.json({ message: "E-mail de verificação reenviado" });
}));

export default router;
