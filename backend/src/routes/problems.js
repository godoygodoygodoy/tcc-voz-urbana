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

const stateNames = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MT: "Mato Grosso",
  MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará", PB: "Paraíba", PR: "Paraná",
  PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina",
  SP: "São Paulo", SE: "Sergipe", TO: "Tocantins"
};

const uniqueParts = (parts) => {
  const seen = new Set();
  return parts.map((part) => String(part || "").trim()).filter((part) => {
    const key = part.toLocaleLowerCase("pt-BR");
    if (!part || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeAddressParts = (parts) => uniqueParts(
  parts.flatMap((part) => String(part || "").split(","))
);

const geocodeAddress = async (addresses) => {
  const queries = Array.isArray(addresses) ? addresses : [addresses];

  if (!queries.some(Boolean)) return { latitude: null, longitude: null, address: null };

  for (const address of queries.filter(Boolean)) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=5&q=${encodeURIComponent(address)}`, {
        headers: { Accept: "application/json", "User-Agent": "VozUrbana/1.0 (contact@vozurbana.local)" }
      });
      if (response.ok) {
        const results = await response.json();
        const best = results.find((result) => result.address?.country_code === "br") || results[0];
        if (best) return { latitude: Number(best.lat), longitude: Number(best.lon), address: best.display_name };
      }

      const photonResponse = await fetch(`https://photon.komoot.io/api/?limit=5&q=${encodeURIComponent(address)}`, {
        headers: { Accept: "application/json", "User-Agent": "VozUrbana/1.0 (contact@vozurbana.local)" }
      });
      if (photonResponse.ok) {
        const feature = (await photonResponse.json()).features?.find((item) => item.properties?.countrycode === "BR");
        if (feature?.geometry?.coordinates?.length === 2) {
          const [longitude, latitude] = feature.geometry.coordinates;
          return { latitude: Number(latitude), longitude: Number(longitude), address };
        }
      }
    } catch (error) {
      console.warn("Falha ao consultar o endereço.", error.message);
    }
  }
  return { latitude: null, longitude: null, address: queries[0] || null };
};

const geocodeCache = new Map();
const geocodeRegion = async ({ address, city, state, cep }) => {
  const stateName = stateNames[String(state || "").toUpperCase()] || state;
  const parts = normalizeAddressParts([address, city, stateName, "Brasil"]);
  if (!address) return { latitude: null, longitude: null, address: null };
  const queries = uniqueParts([
    parts.join(", "),
    normalizeAddressParts([address, city, stateName, "Brasil"]).join(", "),
    normalizeAddressParts([address, city, "Brasil"]).join(", "),
    cep ? `${cep}, Brasil` : ""
  ]);
  const cacheKey = queries.join("|");
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);
  const result = await geocodeAddress(queries);
  geocodeCache.set(cacheKey, result);
  return result;
};

const hasValidCoordinates = (latitude, longitude) => (
  Number.isFinite(Number(latitude))
  && Number.isFinite(Number(longitude))
  && Number(latitude) >= -90
  && Number(latitude) <= 90
  && Number(longitude) >= -180
  && Number(longitude) <= 180
);

const parseOccurrenceDateTime = (date, time) => {
  if (!date && !time) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !/^\d{2}:\d{2}$/.test(String(time || ""))) {
    throw Object.assign(new Error("Informe uma data e uma hora válidas para a ocorrência."), { status: 400 });
  }
  const occurrence = new Date(`${date}T${time}:00`);
  if (Number.isNaN(occurrence.getTime())) {
    throw Object.assign(new Error("Informe uma data e uma hora válidas para a ocorrência."), { status: 400 });
  }
  return occurrence;
};

const serializeProblem = (problem) => ({
  ...problem,
  title: problem.titulo,
  description: problem.descricao,
  address: uniqueParts(String(problem.endereco || "").split(",")).join(", ") || null,
  cep: problem.cep,
  state: problem.estado,
  city: problem.cidade,
  createdAt: problem.dataCriacao,
  occurredAt: problem.dataOcorrencia,
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
      city,
      state,
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
    if (city) where.cidade = { contains: String(city) };
    if (state) where.estado = { contains: String(state) };

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
    const { title, description, latitude, longitude, address, street, number, neighborhood, cep, categoryId, occurrenceDate, occurrenceTime, city, state } =
      req.body;
    const userId = req.userId;

    if (!req.userId) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    if (!title || !description || !categoryId) {
      return res.status(400).json({ error: "Título, descrição e categoria são obrigatórios" });
    }
    const occurrenceDateTime = parseOccurrenceDateTime(occurrenceDate, occurrenceTime);
    let resolvedLocation;
    const rawAddress = normalizeAddressParts([street, number, neighborhood, address]).join(", ");
    if (hasValidCoordinates(latitude, longitude)) {
      resolvedLocation = { latitude: Number(latitude), longitude: Number(longitude), address: rawAddress || null };
    } else {
      resolvedLocation = await geocodeRegion({ address: rawAddress, city: String(city || "").trim(), state: String(state || "").trim(), cep: String(cep || "").trim() });
    }
    if (!hasValidCoordinates(resolvedLocation.latitude, resolvedLocation.longitude) && rawAddress) {
      return res.status(422).json({ error: "Não foi possível identificar esse local. Revise o endereço, a cidade e o estado." });
    }

    const problem = await prisma.problema.create({
      data: {
        titulo: title,
        descricao: description,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        endereco: resolvedLocation.address,
        cep: String(cep || "").replace(/\D/g, "") || null,
        cidade: String(city || "").trim() || null,
        estado: String(state || "").trim() || null,
        ...(occurrenceDate || occurrenceTime ? { dataOcorrencia: occurrenceDateTime } : {}),
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

    const { title, description, categoryId, address, street, number, neighborhood, cep, occurrenceDate, occurrenceTime, city, state } = req.body;
    if (!title?.trim() || !description?.trim() || !categoryId) {
      return res.status(400).json({ error: "Título, descrição e categoria são obrigatórios." });
    }
    const occurrenceDateTime = parseOccurrenceDateTime(occurrenceDate, occurrenceTime);
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
    const location = await geocodeRegion({
      address: normalizeAddressParts([street, number, neighborhood, address]).join(", "),
      city: String(city || "").trim(),
      state: String(state || "").trim(),
      cep: String(cep || "").trim()
    });
    const rawAddress = normalizeAddressParts([street, number, neighborhood, address]).join(", ");
    if (!hasValidCoordinates(location.latitude, location.longitude) && rawAddress) {
      return res.status(422).json({ error: "Não foi possível identificar esse local. Revise o endereço, a cidade e o estado." });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.problema.update({
        where: { id: current.id },
        data: {
          titulo: title.trim(),
          descricao: description.trim(),
          categoriaId: categoryId,
          endereco: location.address,
          cep: String(cep || "").replace(/\D/g, "") || null,
          cidade: String(city || "").trim() || null,
          estado: String(state || "").trim() || null,
          ...(occurrenceDate || occurrenceTime ? { dataOcorrencia: occurrenceDateTime } : {}),
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

router.delete(
  "/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const problem = await prisma.problema.findUnique({
      where: { id: req.params.id },
      include: { imagens: true }
    });
    if (!problem) return res.status(404).json({ error: "Publicação não encontrada." });
    const isAdmin = Boolean(await prisma.admin.findUnique({ where: { usuarioId: req.userId } }));
    if (problem.usuarioId !== req.userId && !isAdmin) {
      return res.status(403).json({ error: "Você só pode excluir suas próprias publicações." });
    }
    await prisma.$transaction([
      prisma.problema.delete({ where: { id: problem.id } }),
      ...(isAdmin && problem.usuarioId !== req.userId
        ? [prisma.log.create({ data: { acao: `Publicação ${problem.id} excluída por administrador`, usuarioId: req.userId } })]
        : [])
    ]);
    await Promise.all(problem.imagens.map((image) => {
      const filePath = path.join(uploadsRoot, image.url.replace(/^\/uploads\//, ""));
      return fs.promises.unlink(filePath).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }));
    return res.json({ message: "Publicação excluída com sucesso." });
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
