import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { uploadsRoot } from "../config/uploads.js";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { authMiddleware, optionalAuthMiddleware } from "../middlewares/auth.js";

// Preparar pasta de uploads
const UPLOAD_DIR = path.join(uploadsRoot, "problems");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const imageExtensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = imageExtensions[file.mimetype];
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024), files: 8 },
  fileFilter: (req, file, cb) => imageExtensions[file.mimetype]
    ? cb(null, true)
    : cb(Object.assign(new Error("Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF."), { status: 400 }))
});

const router = express.Router();

const geocodeAddress = async (address) => {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`, {
    headers: { Accept: "application/json", "User-Agent": "VozUrbana/1.0 (contact@vozurbana.local)" }
  });
  if (!response.ok) throw Object.assign(new Error("Não foi possível consultar o endereço."), { status: 502 });
  const results = await response.json();
  if (!results[0]) throw Object.assign(new Error("Endereço não localizado. Revise os dados e tente novamente."), { status: 422 });
  return { latitude: Number(results[0].lat), longitude: Number(results[0].lon), address: results[0].display_name };
};

const serializeProblem = (problem) => ({
  ...problem,
  title: problem.titulo,
  description: problem.descricao,
  address: problem.endereco,
  createdAt: problem.dataCriacao,
  editedAt: problem.editadaEm,
  isEdited: Boolean(problem.editadaEm),
  category: problem.categoria
    ? {
      id: problem.categoria.id,
      name: problem.categoria.nome,
      icon: problem.categoria.icone,
      color: problem.categoria.cor
    }
    : null,
  author: problem.usuario ? {
    id: problem.usuario.id,
    name: problem.usuario.nome,
    username: problem.usuario.username,
    avatar: problem.usuario.fotoPerfil
  } : null,
  images: problem.imagens || [],
  updates: problem.atualizacoes || [],
  votes: problem._count?.votos || problem.votos?.length || 0
});

// Listar problemas com filtros
router.get(
  "/",
  optionalAuthMiddleware,
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      category,
      status,
      lat,
      lng,
      radius = 5,
      from,
      to,
      sort = "recent"
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

    if (from || to) {
      where.dataCriacao = {};
      if (from) where.dataCriacao.gte = new Date(from);
      if (to) where.dataCriacao.lte = new Date(`${to}T23:59:59.999`);
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

    const orderBy = sort === "votes" ? { votos: { _count: "desc" } } : { dataCriacao: "desc" };

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
              fotoPerfil: true,
              username: true
            }
          },
          imagens: true,
          atualizacoes: { orderBy: { dataCriacao: "desc" } },
          votos: req.userId ? { where: { usuarioId: req.userId }, select: { id: true } } : undefined,
          _count: {
            select: { votos: true }
          }
        },
        skip,
        take: pageSize,
        orderBy
      })
    ]);

    res.json({
      total,
      page: pageNumber,
      limit: pageSize,
      data: data.map((item) => ({ ...serializeProblem(item), supportedByMe: Boolean(item.votos?.length) }))
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

    if (!title || !description || !categoryId || !String(address || "").trim()) {
      return res.status(400).json({ error: "Título, descrição, categoria e endereço são obrigatórios" });
    }
    let resolvedLocation;
    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
      resolvedLocation = { latitude: Number(latitude), longitude: Number(longitude), address };
    } else {
      resolvedLocation = await geocodeAddress(String(address).trim());
    }

    const problem = await prisma.problema.create({
      data: {
        titulo: title,
        descricao: description,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        endereco: resolvedLocation.address,
        categoriaId: categoryId,
        usuarioId: userId
      },
      include: {
        categoria: true,
        usuario: {
          select: {
            id: true,
            nome: true,
            fotoPerfil: true,
            username: true
          }
          },
        imagens: true
      }
    });

    if (req.files?.length) {
      await prisma.imagem.createMany({
        data: req.files.map((file) => ({
          url: `/uploads/problems/${file.filename}`,
          tipo: req.body.imageType === "DEPOIS" ? "DEPOIS" : "ANTES",
          problemaId: problem.id
        }))
      });
    }

    const createdProblem = await prisma.problema.findUnique({
      where: { id: problem.id },
      include: { categoria: true,       usuario: { select: { id: true, nome: true, username: true, fotoPerfil: true } }, imagens: true, atualizacoes: { orderBy: { dataCriacao: "desc" } } }
    });
    res.status(201).json(serializeProblem(createdProblem));
  })
);

router.put(
  "/:id",
  authMiddleware,
  upload.array("images"),
  asyncHandler(async (req, res) => {
    const current = await prisma.problema.findUnique({
      where: { id: req.params.id },
      include: { imagens: true }
    });
    if (!current) return res.status(404).json({ error: "Problema não encontrado" });
    if (current.usuarioId !== req.userId) return res.status(403).json({ error: "Somente o autor pode editar esta publicação." });

    const { title, description, categoryId, address } = req.body;
    if (!title?.trim() || !description?.trim() || !categoryId || !address?.trim()) {
      return res.status(400).json({ error: "Título, descrição, categoria e endereço são obrigatórios." });
    }
    let removedImageIds;
    try {
      removedImageIds = JSON.parse(req.body.removedImageIds || "[]");
    } catch {
      return res.status(400).json({ error: "Lista de imagens removidas inválida." });
    }
    if (!Array.isArray(removedImageIds) || removedImageIds.some((id) => typeof id !== "string")) {
      return res.status(400).json({ error: "Lista de imagens removidas inválida." });
    }
    const ownedRemovedIds = current.imagens.filter((image) => removedImageIds.includes(image.id)).map((image) => image.id);
    const location = await geocodeAddress(address.trim());

    await prisma.$transaction(async (transaction) => {
      await transaction.problema.update({
        where: { id: current.id },
        data: {
          titulo: title.trim(),
          descricao: description.trim(),
          categoriaId: categoryId,
          endereco: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          editadaEm: new Date()
        }
      });
      if (ownedRemovedIds.length) await transaction.imagem.deleteMany({ where: { id: { in: ownedRemovedIds }, problemaId: current.id } });
      if (req.files?.length) {
        await transaction.imagem.createMany({
          data: req.files.map((file) => ({ url: `/uploads/problems/${file.filename}`, tipo: "ANTES", problemaId: current.id }))
        });
      }
    });
    await Promise.all(current.imagens
      .filter((image) => ownedRemovedIds.includes(image.id))
      .map((image) => {
        const filePath = path.join(uploadsRoot, image.url.replace(/^\/uploads\//, ""));
        return fs.promises.unlink(filePath).catch((error) => {
          if (error.code !== "ENOENT") throw error;
        });
      }));

    const updated = await prisma.problema.findUnique({
      where: { id: current.id },
      include: {
        categoria: true,
        usuario: { select: { id: true, nome: true, username: true, fotoPerfil: true } },
        imagens: true,
        atualizacoes: { orderBy: { dataCriacao: "desc" } },
        votos: req.userId ? { where: { usuarioId: req.userId }, select: { id: true } } : undefined,
        _count: { select: { votos: true } }
      }
    });
    res.json({ ...serializeProblem(updated), supportedByMe: Boolean(updated.votos?.length) });
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
            fotoPerfil: true,
            username: true
          }
        },
        imagens: true,
        votos: true,
        atualizacoes: { orderBy: { dataCriacao: "desc" } },
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
