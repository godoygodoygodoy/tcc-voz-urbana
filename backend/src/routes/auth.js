import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import Joi from "joi";
import { prisma } from "../config/prisma.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { sendPasswordResetEmail } from "../utils/email.js";
// Verificacao de e-mail mantida como legado e desativada para o fluxo atual.
// import { sendVerificationEmail } from "../utils/email.js";

const router = express.Router();

// const dispatchVerificationEmail = ({ email, name, token }) => {
//   void sendVerificationEmail({ email, name, token }).catch((error) => {
//     console.error("Verification email delivery failed:", error.message);
//   });
// };

// Validação
const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().trim().max(30).allow(""),
  password: Joi.string().min(6).required(),
  username: Joi.string().trim().lowercase().pattern(/^[a-z0-9._]+$/).min(3).max(30).required()
});

const loginSchema = Joi.object({
  identifier: Joi.string().trim().min(2),
  email: Joi.string().trim().min(2),
  password: Joi.string().required()
}).or("identifier", "email");

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

const findUserByIdentifier = async (identifier) => {
  const normalized = String(identifier).trim();
  const withoutAt = normalized.replace(/^@/, "").toLowerCase();
  const emailCandidate = normalized.toLowerCase();
  const phoneCandidate = normalizePhone(normalized);
  const candidates = await prisma.usuario.findMany({
    where: {
      OR: [
        { email: emailCandidate },
        { username: withoutAt },
        ...(phoneCandidate.length >= 8 ? [{ telefone: { not: null } }] : [])
      ]
    },
    include: { admin: true }
  });
  return candidates.find((candidate) => (
    candidate.email.toLowerCase() === emailCandidate
    || candidate.username?.toLowerCase() === withoutAt
    || (phoneCandidate.length >= 8 && normalizePhone(candidate.telefone) === phoneCandidate)
  )) || null;
};

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().length(64).required(),
  password: Joi.string().min(6).required()
});

// Register
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

  const { name, password, username, phone } = value;
  const email = value.email.toLowerCase();

const existingUser = await prisma.usuario.findUnique({
  where: { email }
});

if (existingUser) {
  return res.status(409).json({
    error: "Email já cadastrado"
  });
}

const existingUsername = await prisma.usuario.findUnique({ where: { username } });
if (existingUsername) {
  return res.status(409).json({ error: "Este @ já está em uso" });
}
if (phone) {
  const existingPhone = await prisma.usuario.findFirst({
    where: { telefone: normalizePhone(phone) }
  });
  if (existingPhone) {
    return res.status(409).json({ error: "Este número já está em uso" });
  }
}
    const senhaHash = await hashPassword(password);
    const user = await prisma.usuario.create({
      data: {
        nome: name,
        email,
        username,
        telefone: phone ? normalizePhone(phone) : null,
        senhaHash,
        emailVerificado: true
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

    // dispatchVerificationEmail({ email: user.email, name: user.nome, token: tokenVerificacao });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d", jwtid: crypto.randomUUID() }
    );

    res.status(201).json({
      message: "Usuário registrado com sucesso",
      user: { ...user, name: user.nome, avatar: user.fotoPerfil, phone: user.telefone, role: "usuario" },
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

    const { password } = value;
    const identifier = value.identifier || value.email;
    const usesLegacyEmail = !value.identifier && Boolean(value.email);
    if (
      (usesLegacyEmail || identifier.includes("@")) &&
      Joi.string().email().validate(identifier).error
    ) {
      return res.status(400).json({ error: "Informe um e-mail, telefone ou nome de usuário válido." });
    }
    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas: conta não encontrada. Confira seu e-mail, número ou usuário." });
    }
    const isValid = await comparePassword(password, user.senhaHash);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciais inválidas: e-mail, número ou usuário ou senha incorreta." });
    }

    // A verificacao de e-mail permanece disponivel como legado, mas nao bloqueia o login.

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d", jwtid: crypto.randomUUID() }
    );

    const { senhaHash, tokenVerificacao, tokenVerificacaoExpira, ...userWithoutPassword } = user;

    res.json({
      message: "Login bem-sucedido",
      user: {
        ...userWithoutPassword,
        name: userWithoutPassword.nome,
        avatar: userWithoutPassword.fotoPerfil,
        role: user.admin ? "admin" : user.nivel.toLowerCase()
      },
      token
    });
  })
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const user = await prisma.usuario.findUnique({ where: { email: value.email.toLowerCase() } });
    const message = "Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.";
    if (!user) return res.json({ message });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        tokenVerificacao: tokenHash,
        tokenVerificacaoExpira: new Date(Date.now() + 60 * 60 * 1000)
      }
    });

    try {
      await sendPasswordResetEmail({ email: user.email, name: user.nome, token: resetToken });
    } catch (emailError) {
      console.error("Falha ao enviar redefinição de senha:", emailError.message);
      return res.status(503).json({ error: "O serviço de e-mail está temporariamente indisponível. Tente novamente em instantes." });
    }

    return res.json({ message });
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const tokenHash = crypto.createHash("sha256").update(value.token).digest("hex");
    const user = await prisma.usuario.findUnique({ where: { tokenVerificacao: tokenHash } });
    if (!user || !user.tokenVerificacaoExpira || user.tokenVerificacaoExpira < new Date()) {
      return res.status(400).json({ error: "Link de redefinição inválido ou expirado." });
    }

    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        senhaHash: await hashPassword(value.password),
        tokenVerificacao: null,
        tokenVerificacaoExpira: null
      }
    });

    return res.json({ message: "Senha redefinida com sucesso." });
  })
);

/* Legado: fluxo de verificacao preservado, mas desativado no deploy atual.
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
  const email = String(req.body.email || "").trim().toLowerCase();
  const user = await prisma.usuario.findUnique({ where: { email } });
  if (!user || user.emailVerificado) return res.json({ message: "Se a conta existir, um novo e-mail será enviado" });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.usuario.update({
    where: { id: user.id },
    data: { tokenVerificacao: token, tokenVerificacaoExpira: new Date(Date.now() + 24 * 60 * 60 * 1000) }
  });
  try {
    // Unlike registration, the explicit resend action must only report success
    // after the SMTP server has accepted the message.
    await sendVerificationEmail({ email: user.email, name: user.nome, token });
    res.json({ message: "E-mail de verificação reenviado" });
  } catch (emailError) {
    console.error("Falha ao reenviar verificação de e-mail:", emailError.message);
    res.status(502).json({
      error: "Não foi possível enviar o e-mail agora. Tente novamente em instantes."
    });
  }
}));
*/

export default router;
