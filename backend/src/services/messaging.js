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
export const createMessaging = (db, { notify = async () => null } = {}) => ({
  async list(userId) {
    const rows = await db.conversa.findMany({
      where: { OR: [{ usuarioAId: userId }, { usuarioBId: userId }] },
      include: { usuarioA: { select: publicUser }, usuarioB: { select: publicUser }, mensagens: { orderBy: [{ criadaEm: 'desc' }, { id: 'desc' }], take: 1 } },
      orderBy: [{ atualizadaEm: 'desc' }, { id: 'asc' }],
    });
    if (!rows.length) return [];
    const others = rows.map(row => participantId(row, userId));
    const [edges, totals] = await Promise.all([
      db.seguimento.findMany({ where: { status: 'ACEITA', OR: [
        { followerId: userId, followingId: { in: others } },
        { followingId: userId, followerId: { in: others } },
      ] }, select: { followerId: true, followingId: true } }),
      db.mensagem.groupBy({ by: ['conversaId'], where: { remetenteId: userId, conversaId: { in: rows.map(row => row.id) } }, _count: { _all: true } }),
    ]);
    const follows = new Set(edges.map(edge => JSON.stringify([edge.followerId, edge.followingId])));
    const sent = new Map(totals.map(total => [total.conversaId, total._count._all]));
    return rows.map(({ mensagens, ...conversation }) => {
      const otherId = participantId(conversation, userId);
      return { ...conversation,
        participant: conversation.usuarioAId === userId ? conversation.usuarioB : conversation.usuarioA,
        ultimaMensagem: mensagens[0] || null,
        messaging: messageAllowance(follows.has(JSON.stringify([userId, otherId])) && follows.has(JSON.stringify([otherId, userId])), sent.get(conversation.id) || 0),
      };
    });
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
  async history(userId, conversationId, { before, after, limit = 50 } = {}) {
    // Reads need no write locks: send() still checks the authoritative quota atomically.
    const conversation = await db.conversa.findUnique({ where: { id: conversationId } });
    participantId(conversation, userId);
    const size = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 50));
    const cursorId = after || before;
    const cursor = cursorId ? await db.mensagem.findFirst({ where: { id: cursorId, conversaId: conversationId } }) : null;
    if (cursorId && !cursor) throw socialError(404, 'conversationNotFound');
    const direction = after ? 'asc' : 'desc';
    const comparison = after ? 'gt' : 'lt';
    const where = { conversaId: conversationId, ...(cursor ? { OR: [
      { criadaEm: { [comparison]: cursor.criadaEm } },
      { criadaEm: cursor.criadaEm, id: { [comparison]: cursor.id } },
    ] } : {}) };
    const [rows, messaging] = await Promise.all([
      db.mensagem.findMany({ where, include: { remetente: { select: publicUser } }, orderBy: [{ criadaEm: direction }, { id: direction }], take: size + 1 }),
      allowance(db, conversation, userId),
    ]);
    const hasMore = rows.length > size;
    const messages = rows.slice(0, size);
    if (!after) messages.reverse();
    return { messages, messaging, pageInfo: { hasOlder: !after && hasMore, hasNewer: Boolean(after) && hasMore } };
  },
  async send(userId, conversationId, value) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 2000) throw socialError(400, 'chatMessageLength');
    return db.$transaction(async tx => {
      const conversation = await lockedConversation(tx, conversationId, userId);
      const current = await allowance(tx, conversation, userId);
      if (!current.canSend) throw Object.assign(socialError(403, 'chatLimitReached'), { code: 'MESSAGE_LIMIT_REACHED', messaging: current });
      const message = await tx.mensagem.create({ data: { texto: value.trim(), conversaId: conversation.id, remetenteId: userId }, include: { remetente: { select: publicUser } } });
      await tx.conversa.update({ where: { id: conversation.id }, data: { atualizadaEm: new Date() } });
      const sender = await tx.usuario.findUnique({where:{id:userId},select:{nome:true,username:true}});
      const senderName = sender?.username?'@'+sender.username:sender?.nome;
      const notification = await notify(tx, { usuarioId: participantId(conversation, userId), tipo:'MENSAGEM',titulo:'notificationMessageTitle',mensagem:senderName?senderName+' enviou uma mensagem.':'notificationMessageBody',link:'/feed?conversation='+encodeURIComponent(conversation.id)+'#conversations' });
      return { message, messaging: messageAllowance(current.mutual, current.sent + 1), ...(notification ? { notification } : {}) };
    }, { isolationLevel: 'ReadCommitted' });
  },
});
