import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { authMiddleware } from "../middlewares/auth.js";

// Preparar pasta de uploads
const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "problems");
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

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024), files: 8 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/"))
});

const router = express.Router();

const serializeProblem = (problem) => ({
  ...problem,
  title: problem.titulo,
  description: problem.descricao,
  address: problem.endereco,
  createdAt: problem.dataCriacao,
  category: problem.categoria
    ? { id: problem.categoria.id, name: problem.categoria.nome }
    : null,
  author: problem.usuario ? { id: problem.usuario.id, name: problem.usuario.nome } : null,
  images: problem.imagens || [],
  votes: problem._count?.votos || problem.votos?.length || 0
});

// Listar problemas com filtros
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      category,
      status,
      lat,
      lng,
      radius = 5 // km
    } = req.query;

    const pageNumber = Math.max(1, Number(page));
    const pageSize = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNumber - 1) * pageSize;
    const where = {};

    if (status) where.status = status;

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
            select: { votos: true }
          }
        },
        skip,
        take: pageSize,
        orderBy: { dataCriacao: "desc" }
      })
    ]);

    res.json({
      total,
      page: pageNumber,
      limit: pageSize,
      data: data.map(serializeProblem)
    });
  })
);

// Criar problema
router.post(
  "/",
  authMiddleware,
  upload.array("images"),
  asyncHandler(async (req, res) => {
    const { title, description, latitude, longitude, address, categoryId } =
      req.body;
    const userId = req.userId;

    if (!req.userId) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    if (!title || !description || !categoryId || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      return res.status(400).json({ error: "Título, descrição, categoria e localização são obrigatórios" });
    }

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
          },
        imagens: true
      }
    });

    if (req.files?.length) {
      await prisma.imagem.createMany({
        data: req.files.map((file) => ({
          url: `/uploads/problems/${file.filename}`,
          problemaId: problem.id
        }))
      });
    }

    const createdProblem = await prisma.problema.findUnique({
      where: { id: problem.id },
      include: { categoria: true, usuario: { select: { id: true, nome: true } }, imagens: true }
    });
    res.status(201).json(serializeProblem(createdProblem));
  })
);

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
        votos: true,
        _count: { select: { votos: true } }
      }
    });

    if (!problem) {
      return res.status(404).json({ error: "Problema não encontrado" });
    }

    res.json(serializeProblem(problem));
  })
);

export default router;
