import { lockUsers, publicUser, socialError, visibleUserWhere, visibleProblemWhere } from './socialGraph.js';
import { storyVisibilityWhere } from './stories.js';
export const REPORT_CATEGORIES = ['SPAM', 'ASSEDIO', 'ODIO', 'VIOLENCIA', 'PRIVACIDADE', 'FRAUDE', 'OUTRO'];
const idValue = value => {
  if (typeof value !== 'string' || !/^[-\w]{1,36}$/.test(value)) throw socialError(400, 'socialSafetyInvalid');
  return value;
};
const pageValue = value => Math.max(1, Math.min(10000, parseInt(value, 10) || 1));
export const createSocialSafety = db => ({
  async closeFriends(userId, query = {}) {
    const page = pageValue(query.page),
      limit = 20,
      where = {
        donoId: userId
      };
    const [data, total] = await Promise.all([db.amigoProximo.findMany({
      where,
      include: {
        convidado: {
          select: publicUser
        }
      },
      orderBy: {
        convidadoId: 'asc'
      },
      skip: (page - 1) * limit,
      take: limit
    }), db.amigoProximo.count({
      where
    })]);
    return {
      data: data.map(row => row.convidado),
      page,
      limit,
      total
    };
  },
  async setCloseFriend(userId, targetId, enabled) {
    idValue(targetId);
    if (targetId === userId || typeof enabled !== 'boolean') throw socialError(400, 'socialSafetyInvalid');
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId, targetId]);
      if (enabled && !(await tx.usuario.findFirst({
        where: {
          id: targetId,
          ...visibleUserWhere(userId)
        },
        select: {
          id: true
        }
      }))) throw socialError(404, 'profileNotFound');
      const where = {
        donoId: userId,
        convidadoId: targetId
      };
      if (enabled) await tx.amigoProximo.upsert({
        where: {
          donoId_convidadoId: where
        },
        create: where,
        update: {}
      });else await tx.amigoProximo.deleteMany({
        where
      });
      return {
        enabled
      };
    }, {
      isolationLevel: 'ReadCommitted'
    });
  },
  async state(userId, targetId) {
    idValue(targetId);
    const rows = await db.relacaoSeguranca.findMany({
      where: {
        origemId: userId,
        destinoId: targetId
      }
    });
    return {
      blocked: rows.some(row => row.tipo === 'BLOQUEIO'),
      muted: rows.some(row => row.tipo === 'SILENCIO')
    };
  },
  async relation(userId, targetId, type, enabled) {
    idValue(targetId);
    if (userId === targetId || !['BLOQUEIO', 'SILENCIO'].includes(type) || typeof enabled !== 'boolean') throw socialError(400, 'socialSafetyInvalid');
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId, targetId]);
      if (!(await tx.usuario.findUnique({
        where: {
          id: targetId
        },
        select: {
          id: true
        }
      }))) throw socialError(404, 'profileNotFound');
      const where = {
        origemId: userId,
        destinoId: targetId,
        tipo: type
      };
      if (enabled) await tx.relacaoSeguranca.upsert({
        where: {
          origemId_destinoId_tipo: where
        },
        create: where,
        update: {}
      });else await tx.relacaoSeguranca.deleteMany({
        where
      });
      if (type === 'BLOQUEIO' && enabled) {
        await tx.amigoProximo.deleteMany({
          where: {
            OR: [{
              donoId: userId,
              convidadoId: targetId
            }, {
              donoId: targetId,
              convidadoId: userId
            }]
          }
        });
        await tx.seguimento.deleteMany({
          where: {
            followerId: userId,
            followingId: targetId
          }
        });
        await tx.seguimento.deleteMany({
          where: {
            followerId: targetId,
            followingId: userId
          }
        });
      }
      return {
        enabled
      };
    }, {
      isolationLevel: 'ReadCommitted'
    });
  },
  async list(userId, query = {}) {
    const page = pageValue(query.page),
      limit = 20,
      type = query.type || 'BLOQUEIO';
    if (!['BLOQUEIO', 'SILENCIO'].includes(type)) throw socialError(400, 'socialSafetyInvalid');
    const where = {
      origemId: userId,
      tipo: type
    };
    const [data, total] = await Promise.all([db.relacaoSeguranca.findMany({
      where,
      include: {
        destino: {
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
    }), db.relacaoSeguranca.count({
      where
    })]);
    return {
      data: data.map(row => ({
        id: row.id,
        user: row.destino
      })),
      total,
      page,
      limit
    };
  },
  async preferences(userId, body) {
    if (body) {
      if (!['TODOS', 'MUTUOS', 'NINGUEM'].includes(body.mensagens) || !['TODOS', 'MUTUOS', 'NINGUEM'].includes(body.mencoes)) throw socialError(400, 'socialSafetyInvalid');
      return db.preferenciaSocial.upsert({
        where: {
          usuarioId: userId
        },
        create: {
          usuarioId: userId,
          mensagens: body.mensagens,
          mencoes: body.mencoes
        },
        update: {
          mensagens: body.mensagens,
          mencoes: body.mencoes
        },
        select: {
          mensagens: true,
          mencoes: true
        }
      });
    }
    return (await db.preferenciaSocial.findUnique({
      where: {
        usuarioId: userId
      },
      select: {
        mensagens: true,
        mencoes: true
      }
    })) || {
      mensagens: 'TODOS',
      mencoes: 'TODOS'
    };
  },
  async hide(userId, problemId, enabled) {
    idValue(problemId);
    if (typeof enabled !== 'boolean') throw socialError(400, 'socialSafetyInvalid');
    if (enabled && !(await db.problema.findFirst({
      where: {
        id: problemId,
        ...visibleProblemWhere({
          userId
        })
      },
      select: {
        id: true
      }
    }))) throw socialError(404, 'problemNotFound');
    const where = {
      usuarioId: userId,
      problemaId: problemId
    };
    if (enabled) await db.ocultacaoPublicacao.upsert({
      where: {
        usuarioId_problemaId: where
      },
      create: where,
      update: {}
    });else await db.ocultacaoPublicacao.deleteMany({
      where
    });
    return {
      enabled
    };
  },
  async hidden(userId, query = {}) {
    const page = pageValue(query.page),
      limit = 20,
      where = {
        usuarioId: userId
      };
    const [rows, total] = await Promise.all([db.ocultacaoPublicacao.findMany({
      where,
      orderBy: [{
        criadaEm: 'desc'
      }, {
        id: 'desc'
      }],
      skip: (page - 1) * limit,
      take: limit
    }), db.ocultacaoPublicacao.count({
      where
    })]);
    const ids = rows.map(row => row.problemaId),
      posts = ids.length ? await db.problema.findMany({
        where: {
          id: {
            in: ids
          },
          ...visibleProblemWhere({
            userId
          })
        },
        select: {
          id: true,
          titulo: true
        }
      }) : [],
      byId = new Map(posts.map(post => [post.id, post.titulo]));
    return {
      data: rows.map(row => ({
        id: row.id,
        problemId: row.problemaId,
        title: byId.get(row.problemaId) || null
      })),
      page,
      total,
      limit
    };
  },
  async report(req, body) {
    const targetId = idValue(body.targetId),
      type = body.targetType;
    if (!['USUARIO', 'PROBLEMA', 'COMENTARIO', 'STORY'].includes(type) || !REPORT_CATEGORIES.includes(body.category) || typeof body.reason !== 'string' || body.reason.trim().length < 5 || body.reason.length > 1000) throw socialError(400, 'socialSafetyInvalid');
    const allowed = type === 'USUARIO' ? await db.usuario.findFirst({
      where: {
        id: targetId,
        ...visibleUserWhere(req.userId)
      },
      select: {
        id: true
      }
    }) : type === 'PROBLEMA' ? await db.problema.findFirst({
      where: {
        id: targetId,
        ...visibleProblemWhere(req)
      },
      select: {
        id: true
      }
    }) : type === 'COMENTARIO' ? await db.comentario.findFirst({
      where: {
        id: targetId,
        problema: {
          is: visibleProblemWhere(req)
        },
        usuario: {
          is: visibleUserWhere(req.userId)
        }
      },
      select: {
        id: true
      }
    }) : await db.story.findFirst({
      where: {
        id: targetId,
        ...storyVisibilityWhere(req.userId)
      },
      select: {
        id: true
      }
    });
    if (!allowed) throw socialError(404, 'socialContentUnavailable');
    const where = {
      autorId: req.userId,
      tipoAlvo: type,
      alvoId: targetId,
      categoria: body.category
    };
    const row = await db.denunciaSocial.upsert({
      where: {
        autorId_tipoAlvo_alvoId_categoria: where
      },
      create: {
        ...where,
        motivo: body.reason.trim()
      },
      update: {},
      select: {
        id: true,
        estado: true,
        criadaEm: true
      }
    });
    return row;
  },
  async reports(req, query = {}) {
    if (!req.isAdmin) throw socialError(403, 'adminAccessRequired');
    const page = pageValue(query.page),
      limit = 20;
    const where = {
      estado: ['ABERTA', 'ANALISE', 'RESOLVIDA', 'REJEITADA'].includes(query.state) ? query.state : 'ABERTA'
    };
    const [data, total] = await Promise.all([db.denunciaSocial.findMany({
      where,
      orderBy: [{
        criadaEm: 'asc'
      }, {
        id: 'asc'
      }],
      skip: (page - 1) * limit,
      take: limit
    }), db.denunciaSocial.count({
      where
    })]);
    return {
      data,
      total,
      page,
      limit
    };
  },
  async review(req, id, body) {
    if (!req.isAdmin) throw socialError(403, 'adminAccessRequired');
    idValue(id);
    if (!['ANALISE', 'RESOLVIDA', 'REJEITADA'].includes(body.state) || typeof body.decision !== 'string' || body.decision.trim().length < 5 || body.decision.length > 1000) throw socialError(400, 'socialSafetyInvalid');
    return db.$transaction(async tx => {
      await lockUsers(tx, [req.userId]);
      await tx.$queryRaw`SELECT id FROM denuncias_sociais WHERE id = ${id} FOR UPDATE`;
      const row = await tx.denunciaSocial.findUnique({
        where: {
          id
        }
      });
      if (!row) throw socialError(404, 'socialContentUnavailable');
      if (['RESOLVIDA', 'REJEITADA'].includes(row.estado)) throw socialError(409, 'socialReportClosed');
      const result = await tx.denunciaSocial.update({
        where: {
          id
        },
        data: {
          estado: body.state,
          decisao: body.decision.trim(),
          moderadorId: req.userId
        }
      });
      await tx.log.create({
        data: {
          usuarioId: req.userId,
          acao: 'social_report:' + id + ':' + body.state
        }
      });
      return result;
    }, {
      isolationLevel: 'ReadCommitted'
    });
  }
});
