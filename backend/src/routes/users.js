const express = require('express');
const prisma = require('../config/database');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

router.get('/me', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  res.json(sanitizeUser(user));
}));

router.put('/me', asyncHandler(async (req, res) => {
  const { name, phone, bio, avatar, avatarPositionX, avatarPositionY } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.userId } });

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.userId },
    data: {
      name: name || user.name,
      phone: phone || user.phone,
      bio: bio || user.bio,
      avatar: avatar || user.avatar,
      avatarPositionX: Number.isFinite(Number(avatarPositionX)) ? Number(avatarPositionX) : user.avatarPositionX,
      avatarPositionY: Number.isFinite(Number(avatarPositionY)) ? Number(avatarPositionY) : user.avatarPositionY,
    },
  });

  res.json(sanitizeUser(updatedUser));
}));

function sanitizeUser(user) {
  const { password, emailVerificationToken, emailVerificationExpires, ...safeUser } = user;
  return safeUser;
}

module.exports = router;
