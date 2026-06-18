const express = require('express');
const prisma = require('../config/database');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Listar problemas com filtros
router.get('/', asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    category,
    status = 'open',
    lat,
    lng,
    radius = 5, // km
  } = req.query;

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const offset = (pageNumber - 1) * limitNumber;
  const where = { status };

  // Filtro por categoria
  if (category) {
    where.categoryId = category;
  }

  // Filtro geográfico (aproximado)
  if (lat && lng) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const latOffset = radius / 111; // 1 degree ~= 111 km
    const lngOffset = radius / (111 * Math.cos(latNum * Math.PI / 180));

    where.latitude = { gte: latNum - latOffset, lte: latNum + latOffset };
    where.longitude = { gte: lngNum - lngOffset, lte: lngNum + lngOffset };
  }

  const [count, rows] = await Promise.all([
    prisma.problem.count({ where }),
    prisma.problem.findMany({
      where,
      include: {
        category: true,
        author: {
          select: { id: true, name: true, avatar: true },
        },
        images: true,
      },
      skip: offset,
      take: limitNumber,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({
    total: count,
    page: pageNumber,
    limit: limitNumber,
    data: rows,
  });
}));

// Criar problema
router.post('/', asyncHandler(async (req, res) => {
  const { title, description, latitude, longitude, address, categoryId } = req.body;
  const userId = req.userId;

  if (!req.userId) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const problem = await prisma.problem.create({
    data: {
      title,
      description,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address,
      categoryId,
      userId,
    },
  });

  const fullProblem = await prisma.problem.findUnique({
    where: { id: problem.id },
    include: {
      category: true,
      author: { select: { id: true, name: true, avatar: true } },
      images: true,
    },
  });

  res.status(201).json(fullProblem);
}));

// Obter problema por ID
router.get('/:id', asyncHandler(async (req, res) => {
  const problem = await prisma.problem.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      author: { select: { id: true, name: true, avatar: true } },
      images: true,
    },
  });

  if (!problem) {
    return res.status(404).json({ error: 'Problema não encontrado' });
  }

  const updatedProblem = await prisma.problem.update({
    where: { id: req.params.id },
    data: { views: { increment: 1 } },
    include: {
      category: true,
      author: { select: { id: true, name: true, avatar: true } },
      images: true,
    },
  });

  res.json(updatedProblem);
}));

module.exports = router;
