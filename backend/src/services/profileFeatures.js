import jwt from 'jsonwebtoken';
import { lockUsers, canViewProfile, socialError, visibleProblemWhere } from './socialGraph.js';
export const coverUrl = (ownerId, viewerId) => '/api/profile-features/' + encodeURIComponent(ownerId) + '/cover?access=' + encodeURIComponent(jwt.sign({
  ownerId,
  viewerId: viewerId || null,
  iat: Math.floor(Date.now()/300000)*300
}, process.env.JWT_SECRET, {
  audience: 'profile-cover',
  expiresIn: '10m'
}));
export const createProfileFeatures = db => ({
  async stats(req, id) {
    const owner = await db.usuario.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        perfilPrivado: true
      }
    });
    if (!owner || !(await canViewProfile(db, owner, req.userId, req.isAdmin === true))) throw socialError(404, 'profileNotFound');
    const [posts, followers, following, support, comments, resolved, watched] = await Promise.all([db.problema.count({
      where: {
        usuarioId: id
      }
    }), db.seguimento.count({
      where: {
        followingId: id,
        status: 'ACEITA'
      }
    }), db.seguimento.count({
      where: {
        followerId: id,
        status: 'ACEITA'
      }
    }), db.voto.count({
      where: {
        tipo: 'CONFIRMAR',
        problema: {
          is: {
            usuarioId: id
          }
        }
      }
    }), db.comentario.count({
      where: {
        problema: {
          is: {
            usuarioId: id
          }
        }
      }
    }), db.problema.count({
      where: {
        usuarioId: id,
        status: 'RESOLVIDO'
      }
    }), req.userId === id ? db.publicacaoSalva.count({
      where: {
        usuarioId: id,
        acompanhando: true,
        problema: {
          is: visibleProblemWhere(req)
        }
      }
    }) : null]);
    return {
      posts,
      followers,
      following,
      support,
      comments,
      resolved,
      watched
    };
  },
  async pin(userId, id, enabled) {
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId]);
      const problem = await tx.problema.findUnique({
        where: {
          id
        }
      });
      if (!problem) throw socialError(404, 'problemNotFound');
      if (problem.usuarioId !== userId) throw socialError(403, 'pinOwnOnly');
      if (enabled && !problem.fixadaEm && (await tx.problema.count({
        where: {
          usuarioId: userId,
          fixadaEm: {
            not: null
          }
        }
      })) >= 3) throw socialError(400, 'pinLimit');
      const row = await tx.problema.update({
        where: {
          id
        },
        data: {
          fixadaEm: enabled ? problem.fixadaEm || new Date() : null
        }
      });
      return {
        pinned: Boolean(row.fixadaEm),
        pinnedAt: row.fixadaEm
      };
    }, {
      isolationLevel: 'ReadCommitted'
    });
  },
  async update(userId, {
    presentation,
    cover,
    removeCover
  }) {
    if (presentation !== undefined && (typeof presentation !== 'string' || presentation.trim().length > 120)) throw socialError(400, 'profilePresentationInvalid');
    if (removeCover !== undefined && typeof removeCover !== 'boolean') throw socialError(400, 'profilePresentationInvalid');
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId]);
      const current = await tx.usuario.findUnique({
        where: {
          id: userId
        },
        select: {
          id: true,
          capaUrl: true
        }
      });
      if (!current) throw socialError(404, 'profileNotFound');
      await tx.usuario.update({
        where: {
          id: userId
        },
        data: {
          ...(presentation !== undefined ? {
            apresentacao: presentation.trim() || null
          } : {}),
          ...(cover ? {
            capaUrl: cover
          } : removeCover ? {
            capaUrl: null
          } : {})
        }
      });
      return {
        previousCover: cover || removeCover ? current.capaUrl : null
      };
    }, {
      isolationLevel: 'ReadCommitted'
    });
  }
});
