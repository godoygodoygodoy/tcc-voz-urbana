<<<<<<< HEAD
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Problem, Category, User, Image, Vote } = require('../models');
const { asyncHandler } = require('../middlewares/errorHandler');
const { authMiddleware } = require('../middlewares/auth');
const { Op } = require('sequelize');
=======
import express from "express";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
>>>>>>> 37770fa3ef31f035f4517cb371066a8425473d5e

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
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      category,
      status = "ABERTO",
      lat,
      lng,
      radius = 5 // km
    } = req.query;

    const skip = (page - 1) * limit;
    const where = { status };

    // Filtro por categoria
    if (category) {
      where.categoriaId = category;
    }

    // Filtro geográfico (aproximado)
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const latOffset = radius / 111; // 1 degree ~= 111 km
      const lngOffset = radius / (111 * Math.cos((latNum * Math.PI) / 180));

      where.latitude = {
        gte: latNum - latOffset,
        lte: latNum + latOffset
      };
      where.longitude = {
        gte: lngNum - lngOffset,
        lte: lngNum + lngOffset
      };
    }

    const [total, data] = await Promise.all([
      prisma.problema.count({ where }),
      prisma.problema.findMany({
        where,
        include: {
          categoria: true,
          usuario: {
            select: {
              id: true,
              nome: true,
              fotoPerfil: true
            }
          },
          imagens: true,
          _count: {
            select: { votosRegistrados: true }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { dataCriacao: "desc" }
      })
    ]);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      data
    });
  })
);

<<<<<<< HEAD
// Criar problema com imagens (autenticado)
router.post('/', authMiddleware, upload.array('images', 6), asyncHandler(async (req, res) => {
  const { title, description, latitude, longitude, address, categoryId } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }
=======
// Criar problema
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { title, description, latitude, longitude, address, categoryId } =
      req.body;
    const userId = req.userId;

    if (!req.userId) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }
>>>>>>> 37770fa3ef31f035f4517cb371066a8425473d5e

    const problem = await prisma.problema.create({
      data: {
        titulo: title,
        descricao: description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        endereco: address,
        categoriaId: categoryId,
        usuarioId: userId
      },
      include: {
        categoria: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            fotoPerfil: true
          }
        }
      }
    });

<<<<<<< HEAD
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
=======
    res.status(201).json(problem);
  })
);
>>>>>>> 37770fa3ef31f035f4517cb371066a8425473d5e

// Obter problema por ID
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const problem = await prisma.problema.findUnique({
      where: { id: req.params.id },
      include: {
        categoria: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            fotoPerfil: true
          }
        },
        imagens: true,
        votosRegistrados: true
      }
    });

    if (!problem) {
      return res.status(404).json({ error: "Problema não encontrado" });
    }

    // Incrementar visualizações
    await prisma.problema.update({
      where: { id: req.params.id },
      data: {
        visualizacoes: {
          increment: 1
        }
      }
    });

    res.json(problem);
  })
);

export default router;
