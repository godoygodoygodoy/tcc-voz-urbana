import { problemFilters } from '../services/geography.js';
import { queueAchievementCheck } from '../services/achievementQueue.js';
import { publicationImages } from '../services/publicationMedia.js';
import { visibleProblemWhere } from '../services/socialGraph.js';
import express from "express";
import { memoryImageUpload } from "../middleware/memoryUpload.js";
import { removeStoredFiles, storeFiles } from "../config/storage.js";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { authMiddleware, optionalAuthMiddleware } from "../middlewares/auth.js";

const upload = memoryImageUpload({ limits: { files: 8 } });

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

const normalizeText = (value) => String(value || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

const scoreCandidate = (candidate, expected) => {
  const address = candidate.address || {};
  const display = normalizeText(candidate.display_name || candidate.label || "");
  const city = normalizeText(expected.city);
  const state = normalizeText(stateNames[String(expected.state || "").toUpperCase()] || expected.state);
  const neighborhood = normalizeText(expected.neighborhood);
  const street = normalizeText(expected.street);
  const number = normalizeText(expected.number);
  const candidateCity = normalizeText(address.city || address.town || address.village || address.municipality || candidate.city);
  const candidateState = normalizeText(address.state || candidate.state);
  let score = 0;
  if (city && candidateCity === city) score += 5;
  else if (city && (candidateCity.includes(city) || city.includes(candidateCity))) score += 2;
  if (state && (candidateState === state || candidateState.includes(state) || state.includes(candidateState))) score += 4;
  if (neighborhood && display.includes(neighborhood)) score += 2;
  if (street && display.includes(street)) score += 3;
  if (number && (display.match(new RegExp(`(^|[^0-9])${number}([^0-9]|$)`)) || address.house_number === number)) score += 2;
  return score;
};

const geocodeAddress = async (addresses, expected) => {
  const queries = Array.isArray(addresses) ? addresses : [addresses];

  if (!queries.some(Boolean)) return { latitude: null, longitude: null, address: null };

  for (const address of queries.filter(Boolean)) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=5&q=${encodeURIComponent(address)}`, {
        headers: { Accept: "application/json", "User-Agent": "VozUrbana/1.0 (contact@vozurbana.local)" }
      });
      if (response.ok) {
        const results = await response.json();
        const best = results
          .filter((result) => result.address?.country_code === "br")
          .sort((left, right) => scoreCandidate(right, expected) - scoreCandidate(left, expected))[0];
        if (best && scoreCandidate(best, expected) >= (expected.city && expected.state ? 9 : 4)) {
          return { latitude: Number(best.lat), longitude: Number(best.lon), address: best.display_name };
        }
      }

      const photonResponse = await fetch(`https://photon.komoot.io/api/?limit=5&q=${encodeURIComponent(address)}`, {
        headers: { Accept: "application/json", "User-Agent": "VozUrbana/1.0 (contact@vozurbana.local)" }
      });
      if (photonResponse.ok) {
        const feature = (await photonResponse.json()).features
          ?.filter((item) => item.properties?.countrycode === "BR")
        ?.sort((left, right) => scoreCandidate({ address: right.properties, display_name: right.properties?.name }, expected)
          - scoreCandidate({ address: left.properties, display_name: left.properties?.name }, expected))[0];
        if (feature?.geometry?.coordinates?.length === 2
          && scoreCandidate({ address: feature.properties, display_name: feature.properties?.name }, expected) >= (expected.city && expected.state ? 9 : 4)) {
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
  if (!address) return { latitude: null, longitude: null, address: null };
  const addressParts = normalizeAddressParts(String(address || "").split(","));
  const parts = normalizeAddressParts([address, city, stateName, cep, "Brasil"]);
  const queries = uniqueParts([
    parts.join(", "),
    normalizeAddressParts([address, city, stateName, cep, "Brasil"]).join(", "),
    normalizeAddressParts([address, city, "Brasil"]).join(", "),
    cep ? `${address}, ${cep}, ${city}, ${stateName}, Brasil` : ""
  ]);
  const cacheKey = queries.join("|");
  if (geocodeCache.has(cacheKey)) return geocodeCache.get(cacheKey);
  const result = await geocodeAddress(queries, {
    city,
    state,
    street: addressParts[0],
    number: addressParts[1],
    neighborhood: addressParts[2]
  });
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

const serializeProblem = (problem, req) => ({
  ...problem,
  title: problem.titulo,
  description: problem.descricao,
  address: uniqueParts(String(problem.endereco || "").split(",")).join(", ") || null,
  complement: problem.complemento,
  cep: problem.cep,
  state: problem.estado,
  city: problem.cidade,
  neighborhood: problem.bairro,
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
  images: publicationImages(problem.imagens, req),
  imagens: publicationImages(problem.imagens, req),
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

    const pageNumber = Math.min(10000, Math.max(1, Number.parseInt(page, 10) || 1));
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const skip = (pageNumber - 1) * pageSize;
    const where = problemFilters(req, req.query);

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
      data: data.map((item) => ({ ...serializeProblem(item, req), supportedByMe: Boolean(item.votos?.length) }))
    });
  })
);

// Criar problema
router.post(
  "/",
  authMiddleware,
  upload.array("images"),
  asyncHandler(async (req, res) => {
    const { title, description, latitude, longitude, address, street, number, neighborhood, complemento, cep, categoryId, occurrenceDate, occurrenceTime, city, state } =
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
    if (neighborhood !== undefined && (typeof neighborhood !== "string" || neighborhood.length > 120)) return res.status(400).json({error:"geoFilterInvalid"});
    const rawAddress = normalizeAddressParts([street, number, neighborhood, address, complemento]).join(", ");
    if (!rawAddress && hasValidCoordinates(latitude, longitude)) {
      resolvedLocation = { latitude: Number(latitude), longitude: Number(longitude), address: rawAddress || null };
    } else {
      resolvedLocation = await geocodeRegion({ address: rawAddress, city: String(city || "").trim(), state: String(state || "").trim(), cep: String(cep || "").trim() });
    }
    if (!hasValidCoordinates(resolvedLocation.latitude, resolvedLocation.longitude) && rawAddress) {
      return res.status(422).json({ error: "Não foi possível identificar esse local. Revise o endereço, a cidade e o estado." });
    }
    const storedImages = await storeFiles(req.files, "reports", userId);

    let problem;
    try {
      problem = await prisma.$transaction(async (transaction) => {
        const created = await transaction.problema.create({
          data: {
            titulo: title,
            descricao: description,
            latitude: resolvedLocation.latitude,
            longitude: resolvedLocation.longitude,
            endereco: resolvedLocation.address,
            complemento: String(complemento || "").trim() || null,
            cep: String(cep || "").replace(/\D/g, "") || null,
            bairro: String(neighborhood || "").trim() || null,
            cidade: String(city || "").trim() || null,
            estado: String(state || "").trim() || null,
            ...(occurrenceDate || occurrenceTime ? { dataOcorrencia: occurrenceDateTime } : {}),
            categoriaId: categoryId,
            usuarioId: userId
          }
        });
        if (storedImages.length) {
          await transaction.imagem.createMany({
            data: storedImages.map((file) => ({
              url: file.url,
              tipo: req.body.imageType === "DEPOIS" ? "DEPOIS" : "ANTES",
              proporcao: req.body.imageAspect || "1:1",
              problemaId: created.id
            }))
          });
        }
        return created;
      });
    } catch (error) {
      await removeStoredFiles(storedImages.map((file) => file.url)).catch((cleanupError) => {
        console.error("Falha ao limpar imagens após erro de publicação:", cleanupError.message);
      });
      throw error;
    }

    const createdProblem = await prisma.problema.findUnique({
      where: { id: problem.id },
      include: { categoria: true,       usuario: { select: { id: true, nome: true, username: true, fotoPerfil: true } }, imagens: true, atualizacoes: { orderBy: { dataCriacao: "desc" } } }
    });
    queueAchievementCheck(req.userId);
    res.status(201).json(serializeProblem(createdProblem, req));
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
    const isAdmin = Boolean(await prisma.admin.findUnique({ where: { usuarioId: req.userId } }));
    if (current.usuarioId !== req.userId && !isAdmin) return res.status(403).json({ error: "Somente o autor ou um administrador pode editar esta publicação." });

    const { title, description, categoryId, address, street, number, neighborhood, complemento, cep, occurrenceDate, occurrenceTime, city, state } = req.body;
    if (neighborhood !== undefined && (typeof neighborhood !== "string" || neighborhood.length > 120)) return res.status(400).json({error:"geoFilterInvalid"});
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
      address: normalizeAddressParts([street, number, neighborhood, address, complemento]).join(", "),
      city: String(city || "").trim(),
      state: String(state || "").trim(),
      cep: String(cep || "").trim()
    });
    const rawAddress = normalizeAddressParts([street, number, neighborhood, address, complemento]).join(", ");
    if (!hasValidCoordinates(location.latitude, location.longitude) && rawAddress) {
      return res.status(422).json({ error: "Não foi possível identificar esse local. Revise o endereço, a cidade e o estado." });
    }
    const storedImages = await storeFiles(req.files, "reports", req.userId);

    try {
      await prisma.$transaction(async (transaction) => {
        await transaction.problema.update({
        where: { id: current.id },
        data: {
          titulo: title.trim(),
          descricao: description.trim(),
          categoriaId: categoryId,
          endereco: location.address,
          complemento: String(complemento || "").trim() || null,
          cep: String(cep || "").replace(/\D/g, "") || null,
          ...(neighborhood !== undefined ? { bairro: neighborhood.trim() || null } : {}),
          cidade: String(city || "").trim() || null,
          estado: String(state || "").trim() || null,
          ...(occurrenceDate || occurrenceTime ? { dataOcorrencia: occurrenceDateTime } : {}),
          latitude: location.latitude,
          longitude: location.longitude,
          editadaEm: new Date()
        }
        });
        if (ownedRemovedIds.length) await transaction.imagem.deleteMany({ where: { id: { in: ownedRemovedIds }, problemaId: current.id } });
        if (storedImages.length) {
          await transaction.imagem.createMany({
            data: storedImages.map((file) => ({ url: file.url, tipo: "ANTES", proporcao: req.body.imageAspect || "1:1", problemaId: current.id }))
          });
        }
      });
    } catch (error) {
      await removeStoredFiles(storedImages.map((file) => file.url)).catch((cleanupError) => {
        console.error("Falha ao limpar imagens após erro de edição:", cleanupError.message);
      });
      throw error;
    }
    await removeStoredFiles(current.imagens
      .filter((image) => ownedRemovedIds.includes(image.id))
      .map((image) => image.url))
      .catch((error) => console.error("Falha ao remover imagens substituídas:", error.message));

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
    res.json({ ...serializeProblem(updated, req), supportedByMe: Boolean(updated.votos?.length) });
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
    await removeStoredFiles(problem.imagens.map((image) => image.url))
      .catch((error) => console.error("Falha ao remover imagens da publicação:", error.message));
    return res.json({ message: "Publicação excluída com sucesso." });
  })
);

// Obter problema por ID
router.get(
  "/:id",
  optionalAuthMiddleware,
  asyncHandler(async (req, res) => {
    const problem = await prisma.problema.findFirst({
      where: { id: req.params.id, ...visibleProblemWhere(req) },
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

    res.json(serializeProblem(problem, req));
  })
);

export default router;
