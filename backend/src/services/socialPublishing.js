import { lockUsers, publicUser, socialError, visibleProblemWhere, visibleUserWhere } from './socialGraph.js';
import { storyVisibilityWhere, STORY_AUDIENCES } from './stories.js';
import { writeNotification } from './notifications.js';
const pageNumber = value => Math.max(1, Math.min(10000, parseInt(value, 10) || 1));
export const createSocialPublishing = db => ({
  async notes(userId, query = {}) {
    const page = pageNumber(query.page),
      limit = 20;
    const where = {
      ...storyVisibilityWhere(userId),
      ...(query.owner ? {
        usuarioId: String(query.owner)
      } : {
        AND: [{
          OR: [{
            usuarioId: userId
          }, {
            usuario: {
              is: {
                seguidores: {
                  some: {
                    followerId: userId,
                    status: 'ACEITA'
                  }
                }
              }
            }
          }]
        }]
      })
    };
    if (userId && !query.owner) where.AND.push({ usuario: { is: { medidasDestino: { none: { origemId: userId, tipo: 'SILENCIO' } } } } });
    const [data, total] = await Promise.all([db.nota.findMany({
      where,
      include: {
        usuario: {
          select: publicUser
        }
      },
      orderBy: [{
        criadaEm: 'desc'
      }, {
        id: 'desc'
      }],
      skip: (page - 1) * limit,
      take: limit
    }), db.nota.count({
      where
    })]);
    return {
      data: data.map(row => ({
        id: row.id,
        text: row.texto,
        audience: row.audiencia,
        createdAt: row.criadaEm,
        expiresAt: row.expiraEm,
        author: row.usuario
      })),
      total,
      page,
      limit
    };
  },
  async saveNote(userId, body) {
    if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 140 || !STORY_AUDIENCES.includes(body.audience) || ![1, 6, 12, 24].includes(body.hours)) throw socialError(400, 'socialNoteInvalid');
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId]);
      const row = await tx.nota.findFirst({
        where: {
          usuarioId: userId,
          excluidoEm: null,
          expiraEm: {
            gt: new Date()
          }
        }
      });
      const data = {
        texto: body.text.trim(),
        audiencia: body.audience,
        expiraEm: new Date(Date.now() + body.hours * 3600000)
      };
      const note = row ? await tx.nota.update({
        where: {
          id: row.id
        },
        data
      }) : await tx.nota.create({
        data: {
          ...data,
          usuarioId: userId
        }
      });
      return {
        id: note.id
      };
    }, {
      isolationLevel: 'ReadCommitted'
    });
  },
  async removeNote(userId, id) {
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId]);
      const row = await tx.nota.findFirst({
        where: {
          id,
          usuarioId: userId,
          excluidoEm: null
        }
      });
      if (!row) throw socialError(404, 'socialContentUnavailable');
      await tx.nota.update({
        where: {
          id
        },
        data: {
          excluidoEm: new Date()
        }
      });
    }, {
      isolationLevel: 'ReadCommitted'
    });
  },
  async repost(req, originalId, comment) {
    if (typeof comment !== 'string' || comment.length > 500) throw socialError(400, 'socialRepostInvalid');
    return db.$transaction(async tx => {
      const candidate = await tx.problema.findFirst({
        where: {
          id: originalId,
          ...visibleProblemWhere(req)
        },
        select: {
          usuarioId: true
        }
      });
      if (!candidate) throw socialError(404, 'problemNotFound');
      await lockUsers(tx, [req.userId, candidate.usuarioId]);
      if (!(await tx.problema.findFirst({
        where: {
          id: originalId,
          ...visibleProblemWhere(req)
        },
        select: {
          id: true
        }
      }))) throw socialError(404, 'problemNotFound');
      const row = await tx.repost.upsert({
        where: {
          usuarioId_originalId: {
            usuarioId: req.userId,
            originalId
          }
        },
        create: {
          usuarioId: req.userId,
          originalId,
          problemaId: originalId,
          comentario: comment.trim()
        },
        update: {
          comentario: comment.trim()
        }
      });
      const notification = candidate.usuarioId !== req.userId ? await writeNotification(tx, {
        usuarioId: candidate.usuarioId,
        autorId: req.userId,
        tipo: 'REPOST',
        titulo: 'socialRepostNotificationTitle',
        mensagem: 'socialRepostNotificationBody',
        link: '/problem/' + originalId,
        eventKey: 'repost:' + req.userId + ':' + originalId
      }) : null;
      return {
        id: row.id,
        notification
      };
    }, {
      isolationLevel: 'ReadCommitted'
    });
  },
  async removeRepost(userId, id) {
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId]);
      const row = await tx.repost.findFirst({
        where: {
          id,
          usuarioId: userId
        }
      });
      if (!row) throw socialError(404, 'socialContentUnavailable');
      await tx.repost.delete({
        where: {
          id
        }
      });
    }, {
      isolationLevel: 'ReadCommitted'
    });
  },
  async reposts(req, query = {}) {
    const page = pageNumber(query.page),
      limit = 12,
      where = {
        usuario: {
          is: visibleUserWhere(req.userId)
        },
        ...(query.owner ? {
          usuarioId: String(query.owner)
        } : {})
      };
    if (req.userId && !query.owner) where.AND = [{
      usuario: {
        is: {
          medidasDestino: {
            none: {
              origemId: req.userId,
              tipo: 'SILENCIO'
            }
          }
        }
      }
    }, { OR: [{ problemaId: null }, { problema: { is: { ocultacoes: { none: { usuarioId: req.userId } } } } }] }];
    const [rows, total] = await Promise.all([db.repost.findMany({
      where,
      include: {
        usuario: {
          select: publicUser
        }
      },
      orderBy: [{
        criadaEm: 'desc'
      }, {
        id: 'desc'
      }],
      skip: (page - 1) * limit,
      take: limit
    }), db.repost.count({
      where
    })]);
    const ids = rows.map(row => row.problemaId).filter(Boolean),
      originals = ids.length ? await db.problema.findMany({
        where: {
          id: {
            in: ids
          },
          ...visibleProblemWhere(req)
        },
        select: {
          id: true,
          titulo: true,
          descricao: true,
          usuario: {
            select: publicUser
          }
        }
      }) : [],
      byId = new Map(originals.map(row => [row.id, row]));
    return {
      data: rows.map(row => ({
        id: row.id,
        author: row.usuario,
        comment: row.comentario,
        createdAt: row.criadaEm,
        original: byId.has(row.problemaId) ? {
          id: row.problemaId,
          title: byId.get(row.problemaId).titulo,
          description: byId.get(row.problemaId).descricao,
          author: byId.get(row.problemaId).usuario
        } : null
      })),
      total,
      page,
      limit
    };
  }
});
