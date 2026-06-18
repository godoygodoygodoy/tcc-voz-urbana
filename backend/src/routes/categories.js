const express = require('express');
const prisma = require('../config/database');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Listar categorias
router.get('/', asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  res.json(categories);
}));

// Obter categoria por ID
router.get('/:id', asyncHandler(async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
  });

  if (!category) {
    return res.status(404).json({ error: 'Categoria não encontrada' });
  }

  res.json(category);
}));

module.exports = router;
