const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Problem, Category, User, Image, Vote } = require('../models');
const { asyncHandler } = require('../middlewares/errorHandler');
const { authMiddleware } = require('../middlewares/auth');
const { Op } = require('sequelize');

// Preparar pasta de uploads
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'problems');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

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

  const offset = (page - 1) * limit;
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

    where.latitude = { [Op.between]: [latNum - latOffset, latNum + latOffset] };
    where.longitude = { [Op.between]: [lngNum - lngOffset, lngNum + lngOffset] };
  }

  const { count, rows } = await Problem.findAndCountAll({
    where,
    include: [
      { model: Category, as: 'category' },
      { model: User, as: 'author', attributes: ['id', 'name', 'avatar'] },
      { model: Image, as: 'images' },
      { model: Vote, as: 'voteRecords', attributes: [] },
    ],
    offset,
    limit: parseInt(limit),
    order: [['createdAt', 'DESC']],
  });

  res.json({
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    data: rows,
  });
}));

// Criar problema com imagens (autenticado)
router.post('/', authMiddleware, upload.array('images', 6), asyncHandler(async (req, res) => {
  const { title, description, latitude, longitude, address, categoryId } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const problem = await Problem.create({
    title,
    description,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    address,
    categoryId,
    userId,
  });

  // Salvar registros de imagens associadas
  if (req.files && req.files.length > 0) {
    const imagesToCreate = req.files.map((file) => ({
      url: `/uploads/problems/${file.filename}`,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      problemId: problem.id,
    }));

    await Image.bulkCreate(imagesToCreate);
  }

  const fullProblem = await Problem.findByPk(problem.id, {
    include: [
      { model: Category, as: 'category' },
      { model: User, as: 'author', attributes: ['id', 'name', 'avatar'] },
      { model: Image, as: 'images' },
    ],
  });

  res.status(201).json(fullProblem);
}));

// Obter problema por ID
router.get('/:id', asyncHandler(async (req, res) => {
  const problem = await Problem.findByPk(req.params.id, {
    include: [
      { model: Category, as: 'category' },
      { model: User, as: 'author', attributes: ['id', 'name', 'avatar'] },
      { model: Image, as: 'images' },
      { model: Vote, as: 'voteRecords' },
    ],
  });

  if (!problem) {
    return res.status(404).json({ error: 'Problema não encontrado' });
  }

  await problem.increment('views');
  res.json(problem);
}));

module.exports = router;
