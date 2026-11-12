import { lockUsers, relationship, socialError, publicUser } from './socialGraph.js';

export const NON_MUTUAL_MESSAGE_LIMIT = 3;
export const messageAllowance = (mutual, sent) => ({
  mutual, sent, limit: mutual ? null : NON_MUTUAL_MESSAGE_LIMIT,
  remaining: mutual ? null : Math.max(0, NON_MUTUAL_MESSAGE_LIMIT - sent),
  canSend: mutual || sent < NON_MUTUAL_MESSAGE_LIMIT,
});
const participantId = (conversation, userId) => {
  if (!conversation || ![conversation.usuarioAId, conversation.usuarioBId].includes(userId)) throw socialError(404, 'conversationNotFound');
  return conversation.usuarioAId === userId ? conversation.usuarioBId : conversation.usuarioAId;
};
const allowance = async (tx, conversation, userId) => {
  const [relation, sent] = await Promise.all([
    relationship(tx, userId, participantId(conversation, userId)),
    tx.mensagem.count({ where: { conversaId: conversation.id, remetenteId: userId } }),
  ]);
  return messageAllowance(relation.mutual, sent);
};
const lockedConversation = async (tx, id, userId) => {
  const conversation = await tx.conversa.findUnique({ where: { id } });
  const otherId = participantId(conversation, userId);
  await lockUsers(tx, [userId, otherId]);
  await tx.$queryRaw`SELECT id FROM conversas WHERE id = ${id} FOR UPDATE`;
  return conversation;
};
export const createMessaging = (db) => ({
  async list(userId) {
    const rows = await db.conversa.findMany({
      where: { OR: [{ usuarioAId: userId }, { usuarioBId: userId }] },
      include: { usuarioA: { select: publicUser }, usuarioB: { select: publicUser }, mensagens: { orderBy: [{ criadaEm: 'desc' }, { id: 'desc' }], take: 1 } },
      orderBy: [{ atualizadaEm: 'desc' }, { id: 'asc' }],
    });
    return Promise.all(rows.map(async ({ mensagens, ...conversation }) => ({
      ...conversation, participant: conversation.usuarioAId === userId ? conversation.usuarioB : conversation.usuarioA,
      ultimaMensagem: mensagens[0] || null, messaging: await allowance(db, conversation, userId),
    })));
  },
  async open(userId, otherId) {
    if (userId === otherId) throw socialError(400, 'chatSelfError');
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId, otherId]);
      const target = await tx.usuario.findUnique({ where: { id: otherId }, select: publicUser });
      if (!target) throw socialError(404, 'profileNotFound');
      const [usuarioAId, usuarioBId] = [userId, otherId].sort();
      const conversation = await tx.conversa.upsert({
        where: { usuarioAId_usuarioBId: { usuarioAId, usuarioBId } },
        create: { usuarioAId, usuarioBId }, update: {},
      });
      return { ...conversation, participant: target, messaging: await allowance(tx, conversation, userId) };
    }, { isolationLevel: 'ReadCommitted' });
  },
  async history(userId, conversationId) {
    return db.$transaction(async tx => {
      const conversation = await lockedConversation(tx, conversationId, userId);
      const messages = await tx.mensagem.findMany({
        where: { conversaId: conversation.id }, include: { remetente: { select: publicUser } },
        orderBy: [{ criadaEm: 'asc' }, { id: 'asc' }],
      });
      return { messages, messaging: await allowance(tx, conversation, userId) };
    }, { isolationLevel: 'ReadCommitted' });
  },
  async send(userId, conversationId, value) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 2000) throw socialError(400, 'chatMessageLength');
    return db.$transaction(async tx => {
      const conversation = await lockedConversation(tx, conversationId, userId);
      const current = await allowance(tx, conversation, userId);
      if (!current.canSend) throw Object.assign(socialError(403, 'chatLimitReached'), { code: 'MESSAGE_LIMIT_REACHED', messaging: current });
      const message = await tx.mensagem.create({ data: { texto: value.trim(), conversaId: conversation.id, remetenteId: userId }, include: { remetente: { select: publicUser } } });
      await tx.conversa.update({ where: { id: conversation.id }, data: { atualizadaEm: new Date() } });
      return { message, messaging: messageAllowance(current.mutual, current.sent + 1) };
    }, { isolationLevel: 'ReadCommitted' });
  },
});
