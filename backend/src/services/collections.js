import { canViewProfile, lockUsers, socialError, visibleProblemWhere } from './socialGraph.js';
import { includeProblem, serializeSaved } from './savedPublications.js';

const nameValue = value => {
  if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 80) throw socialError(400, 'collectionNameInvalid');
  return value.trim();
};
const privacyValue = (value = true) => {
  if (typeof value !== 'boolean') throw socialError(400, 'invalidPrivacy');
  return value;
};
const pagination = query => ({ page: Math.min(10000, Math.max(1, Number.parseInt(query?.page, 10) || 1)), limit: 30 });
const collectionAccess = async (db, id, req, write = false) => {
  const collection = await db.colecao.findUnique({ where: { id }, include: { usuario: { select: { id: true, perfilPrivado: true } } } });
  if (!collection || (write || collection.privada) && collection.usuarioId !== req.userId || !await canViewProfile(db, collection.usuario, req.userId, req.isAdmin === true)) throw socialError(404, 'collectionNotFound');
  return collection;
};
const visibleItem = req => ({ salvo: { is: { problema: { is: visibleProblemWhere(req) } } } });
const dto = collection => ({ id: collection.id, name: collection.nome, private: collection.privada, ownerId: collection.usuarioId, createdAt: collection.criadaEm });
export const createCollections = db => ({
  async list(req, ownerId = req.userId) {
    const owner = await db.usuario.findUnique({ where: { id: ownerId }, select: { id: true, perfilPrivado: true } });
    if (!owner || !await canViewProfile(db, owner, req.userId, req.isAdmin === true)) throw socialError(404, 'profileNotFound');
    const { page, limit } = pagination(req.query);
    const where = { usuarioId: ownerId, ...(ownerId === req.userId ? {} : { privada: false }) };
    const [total, data] = await Promise.all([
      db.colecao.count({ where }),
      db.colecao.findMany({ where, orderBy: [{ criadaEm: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
    ]);
    return { data: data.map(dto), total, page, limit };
  },
  async get(req, id) {
    const collection = await collectionAccess(db, id, req);
    const { page, limit } = pagination(req.query);
    const where = { colecaoId: id, ...visibleItem(req) };
    const [total, rows] = await Promise.all([
      db.itemColecao.count({ where }),
      db.itemColecao.findMany({ where, include: { salvo: { include: includeProblem } }, orderBy: [{ criadaEm: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
    ]);
    return { ...dto(collection), data: rows.map(row => serializeSaved(row.salvo, req)), total, page, limit };
  },
  async create(req, body) {
    const nome = nameValue(body?.name), privada = privacyValue(body?.private);
    return db.$transaction(async tx => {
      await lockUsers(tx, [req.userId]);
      if (await tx.colecao.count({ where: { usuarioId: req.userId } }) >= 100) throw socialError(400, 'collectionLimit');
      return dto(await tx.colecao.create({ data: { usuarioId: req.userId, nome, privada } }));
    }, { isolationLevel: 'ReadCommitted' });
  },
  async update(req, id, body) {
    const data = { ...(body.name !== undefined ? { nome: nameValue(body.name) } : {}), ...(body.private !== undefined ? { privada: privacyValue(body.private) } : {}) };
    return db.$transaction(async tx => {
      await lockUsers(tx, [req.userId]); await collectionAccess(tx, id, req, true);
      return dto(await tx.colecao.update({ where: { id }, data }));
    }, { isolationLevel: 'ReadCommitted' });
  },
  async remove(req, id) {
    return db.$transaction(async tx => {
      await lockUsers(tx, [req.userId]); await collectionAccess(tx, id, req, true);
      await tx.colecao.delete({ where: { id } });
    }, { isolationLevel: 'ReadCommitted' });
  },
  async add(req, id, problemId) {
    return db.$transaction(async tx => {
      await lockUsers(tx, [req.userId]); await collectionAccess(tx, id, req, true);
      const problem = await tx.problema.findFirst({ where: { id: problemId, ...visibleProblemWhere(req) }, select: { id: true } });
      if (!problem) throw socialError(404, 'problemNotFound');
      const salvo = await tx.publicacaoSalva.upsert({ where: { usuarioId_problemaId: { usuarioId: req.userId, problemaId: problemId } }, create: { usuarioId: req.userId, problemaId: problemId }, update: {} });
      await tx.itemColecao.upsert({ where: { colecaoId_salvoId: { colecaoId: id, salvoId: salvo.id } }, create: { colecaoId: id, salvoId: salvo.id }, update: {} });
    }, { isolationLevel: 'ReadCommitted' });
  },
  async removeItem(req, id, problemId) {
    return db.$transaction(async tx => {
      await lockUsers(tx, [req.userId]); await collectionAccess(tx, id, req, true);
      const saved = await tx.publicacaoSalva.findUnique({ where: { usuarioId_problemaId: { usuarioId: req.userId, problemaId: problemId } } });
      if (saved) await tx.itemColecao.deleteMany({ where: { colecaoId: id, salvoId: saved.id } });
    }, { isolationLevel: 'ReadCommitted' });
  },
});
