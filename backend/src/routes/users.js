const express = require('express');
const { User } = require('../models');
const { authMiddleware } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Perfil do usuário
router.get('/me', asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.userId);
  res.json(user.toJSON());
}));

// Atualizar perfil
router.put('/me', asyncHandler(async (req, res) => {
  const { name, phone, bio, avatar } = req.body;
  const user = await User.findByPk(req.userId);

  await user.update({
    name: name || user.name,
    phone: phone || user.phone,
    bio: bio || user.bio,
    avatar: avatar || user.avatar,
  });

  res.json(user.toJSON());
}));

module.exports = router;
