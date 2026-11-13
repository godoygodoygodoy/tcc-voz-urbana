export const publicUser = { id: true, nome: true, username: true, fotoPerfil: true, perfilPrivado: true };
export const socialError = (status, code) => Object.assign(new Error(code), { status, code });

// A shared ordering serializes follows, privacy changes and message sends without deadlocks.
export const lockUsers = async (tx, ids) => {
  for (const id of [...new Set(ids)].sort()) await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${id} FOR UPDATE`;
};
export const visibleUserWhere = (viewerId, isAdmin = false) => isAdmin ? {} : ({
  OR: [
    { perfilPrivado: false },
    ...(viewerId ? [{ id: viewerId }, { seguidores: { some: { followerId: viewerId, status: 'ACEITA' } } }] : []),
  ],
});
export const visibleProblemWhere = (req) => ({ usuario: { is: visibleUserWhere(req.userId, req.isAdmin === true) } });
export const canViewProfile = async (db, owner, viewerId, isAdmin = false) => {
  if (!owner.perfilPrivado || owner.id === viewerId || isAdmin) return true;
  if (!viewerId) return false;
  return Boolean(await db.seguimento.findFirst({ where: { followerId: viewerId, followingId: owner.id, status: 'ACEITA' }, select: { id: true } }));
};
export const relationship = async (db, viewerId, targetId) => {
  if (!viewerId || viewerId === targetId) return { following: false, followedBy: false, mutual: false, pending: false, requestId: null, incomingRequestId: null };
  const [outgoing, incoming] = await Promise.all([
    db.seguimento.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: targetId } } }),
    db.seguimento.findUnique({ where: { followerId_followingId: { followerId: targetId, followingId: viewerId } } }),
  ]);
  const following = outgoing?.status === 'ACEITA';
  const followedBy = incoming?.status === 'ACEITA';
  return { following, followedBy, mutual: following && followedBy, pending: outgoing?.status === 'PENDENTE', requestId: outgoing?.status === 'PENDENTE' ? outgoing.id : null, incomingRequestId: incoming?.status === 'PENDENTE' ? incoming.id : null };
};
export const createSocialGraph = (db) => ({
  async follow(userId, targetId) {
    if (userId === targetId) throw socialError(400, 'followSelfError');
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId, targetId]);
      const target = await tx.usuario.findUnique({ where: { id: targetId }, select: { id: true, perfilPrivado: true } });
      if (!target) throw socialError(404, 'profileNotFound');
      const where = { followerId_followingId: { followerId: userId, followingId: targetId } };
      const existing = await tx.seguimento.findUnique({ where });
      const status = existing?.status === 'ACEITA' || !target.perfilPrivado ? 'ACEITA' : 'PENDENTE';
      const changed = existing?.status !== status;
      await tx.seguimento.upsert({ where, create: { followerId: userId, followingId: targetId, status }, update: { status } });
      return { ...(await relationship(tx, userId, targetId)), changed };
    }, { isolationLevel: 'ReadCommitted' });
  },
  async unfollow(userId, targetId) {
    if (userId === targetId) throw socialError(400, 'followSelfError');
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId, targetId]);
      await tx.seguimento.deleteMany({ where: { followerId: userId, followingId: targetId } });
      return relationship(tx, userId, targetId);
    }, { isolationLevel: 'ReadCommitted' });
  },
  async respond(userId, requestId, action) {
    if (!['accept', 'reject', 'cancel'].includes(action)) throw socialError(400, 'followActionError');
    return db.$transaction(async tx => {
      let request = await tx.seguimento.findUnique({ where: { id: requestId } });
      if (!request) throw socialError(404, 'followRequestNotFound');
      await lockUsers(tx, [request.followerId, request.followingId]);
      request = await tx.seguimento.findUnique({ where: { id: requestId } });
      if (!request || request.status !== 'PENDENTE') throw socialError(409, 'followRequestNotPending');
      if (action === 'cancel' ? request.followerId !== userId : request.followingId !== userId) throw socialError(403, 'followRequestForbidden');
      if (action === 'cancel') await tx.seguimento.delete({ where: { id: requestId } });
      else await tx.seguimento.update({ where: { id: requestId }, data: { status: action === 'accept' ? 'ACEITA' : 'RECUSADA' } });
      return { request, relationship: await relationship(tx, userId, action === 'cancel' ? request.followingId : request.followerId) };
    }, { isolationLevel: 'ReadCommitted' });
  },
});

// Inverse of profile visibility: selects the users who may receive private updates.
export const readersOfProfileWhere = owner => !owner.perfilPrivado ? {} : ({ OR: [
  { id: owner.id }, { admin: { isNot: null } },
  { seguindo: { some: { followingId: owner.id, status: 'ACEITA' } } },
] });
