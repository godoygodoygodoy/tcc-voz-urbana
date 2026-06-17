import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";

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

    res.status(201).json(problem);
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
