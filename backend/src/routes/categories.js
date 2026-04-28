const express = require('express');
const { Category } = require('../models');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Listar categorias
router.get('/', asyncHandler(async (req, res) => {
  const categories = await Category.findAll({
    where: { isActive: true },
    order: [['name', 'ASC']],
  });

  res.json(categories);
}));

// Obter categoria por ID
router.get('/:id', asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);

  if (!category) {
    return res.status(404).json({ error: 'Categoria não encontrada' });
  }

  res.json(category);
}));

module.exports = router;
