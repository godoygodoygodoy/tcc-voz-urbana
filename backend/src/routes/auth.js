const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { asyncHandler } = require('../middlewares/errorHandler');
const { sendVerificationEmail } = require('../services/mailer');

const router = express.Router();

const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().allow('', null),
  password: Joi.string().min(6).required(),
  avatar: Joi.string().allow('', null),
  avatarPositionX: Joi.number().min(0).max(100).default(50),
  avatarPositionY: Joi.number().min(0).max(100).default(50),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const pendingProfileSchema = Joi.object({
  token: Joi.string().required(),
  avatar: Joi.string().allow('', null),
  avatarPositionX: Joi.number().min(0).max(100).default(50),
  avatarPositionY: Joi.number().min(0).max(100).default(50),
});

const verifySchema = Joi.object({
  token: Joi.string().required(),
});

router.post('/register', asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const {
    name,
    email,
    phone,
    password,
    avatar,
    avatarPositionX,
    avatarPositionY,
  } = value;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'Email já cadastrado' });
  }

  const emailVerificationToken = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: passwordHash,
      avatar: avatar || null,
      avatarPositionX,
      avatarPositionY,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  await sendVerificationEmail({
    to: user.email,
    token: emailVerificationToken,
  });

  res.status(201).json({
    message: 'Conta criada. Verifique seu e-mail para ativar o acesso.',
    verificationRequired: true,
    verificationToken: emailVerificationToken,
    user: sanitizeUser(user),
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email, password } = value;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ error: 'Confirme seu e-mail antes de entrar' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const token = jwt.sign(
    { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  res.json({
    message: 'Login bem-sucedido',
    user: sanitizeUser(updatedUser),
    token,
  });
}));

router.post('/verify-email', asyncHandler(async (req, res) => {
  const { error, value } = verifySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { token } = value;
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return res.status(400).json({ error: 'Token inválido ou expirado' });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  res.json({
    message: 'E-mail confirmado com sucesso',
    user: sanitizeUser(updatedUser),
  });
}));

router.post('/pending-profile', asyncHandler(async (req, res) => {
  const { error, value } = pendingProfileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { token, avatar, avatarPositionX, avatarPositionY } = value;
  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return res.status(400).json({ error: 'Token inválido ou expirado' });
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      avatar: avatar || user.avatar,
      avatarPositionX,
      avatarPositionY,
    },
  });

  res.json({
    message: 'Foto de perfil salva',
    user: sanitizeUser(updatedUser),
  });
}));

function sanitizeUser(user) {
  const { password, emailVerificationToken, emailVerificationExpires, ...safeUser } = user;
  return safeUser;
}

module.exports = router;
