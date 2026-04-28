const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { User } = require('../models');
const { errorHandler, asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Validação
const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Register
router.post('/register', asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { name, email, password } = value;

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: 'Email já cadastrado' });
  }

  const user = await User.create({ name, email, password });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  res.status(201).json({
    message: 'Usuário registrado com sucesso',
    user: user.toJSON(),
    token,
  });
}));

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email, password } = value;

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  await user.update({ lastLogin: new Date() });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  res.json({
    message: 'Login bem-sucedido',
    user: user.toJSON(),
    token,
  });
}));

module.exports = router;
