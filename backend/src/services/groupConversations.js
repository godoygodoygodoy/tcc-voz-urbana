import { lockUsers, publicUser, socialError, assertInteractionAllowed, isBlocked } from './socialGraph.js';
import { messageAllowance } from './messaging.js';
import { writeNotification } from './notifications.js';
import { unblockedUserWhere } from './socialGraph.js';
export const conversationMembers = {
  participantes: {
    where: {
      estado: 'ATIVO'
    },
    include: {
      usuario: {
        select: publicUser
      }
    }
  }
};
import { chatMessageInclude } from './chatFields.js';
const isGroup = row => row?.tipo && row.tipo !== 'DIRETA';
async function permissions(db, userId, ids) {
  const others = [...new Set(ids.filter(id => id !== userId))];
  if (!others.length) return {
    edges: new Set(),
    blocked: new Set(),
    policies: new Map()
  };
  const [edges, blocks, prefs] = await Promise.all([db.seguimento.findMany({
    where: {
      status: 'ACEITA',
      OR: [{
        followerId: userId,
        followingId: {
          in: others
        }
      }, {
        followingId: userId,
        followerId: {
          in: others
        }
      }]
    },
    select: {
      followerId: true,
      followingId: true
    }
  }), db.relacaoSeguranca.findMany({
    where: {
      tipo: 'BLOQUEIO',
      OR: [{
        origemId: userId,
        destinoId: {
          in: others
        }
      }, {
        destinoId: userId,
        origemId: {
          in: others
        }
      }]
    },
    select: {
      origemId: true,
      destinoId: true
    }
  }), db.preferenciaSocial.findMany({
    where: {
      usuarioId: {
        in: others
      }
    },
    select: {
      usuarioId: true,
      mensagens: true
    }
  })]);
  return {
    edges: new Set(edges.map(row => JSON.stringify([row.followerId, row.followingId]))),
    blocked: new Set(blocks.map(row => row.origemId === userId ? row.destinoId : row.origemId)),
    policies: new Map(prefs.map(row => [row.usuarioId, row.mensagens]))
  };
}
function calculateAllowance(row, userId, sent, context) {
  const member = row.participantes.find(item => item.usuarioId === userId);
  if (row.tipo === 'CANAL') return {
    ...messageAllowance(true, sent),
    canSend: member?.papel === 'ADMIN',
    ...(member?.papel !== 'ADMIN' ? {
      restriction: 'chatChannelReadOnly'
    } : {})
  };
  let mutual = true;
  for (const item of row.participantes) {
    const id = item.usuarioId;
    if (id === userId) continue;
    const both = context.edges.has(JSON.stringify([userId, id])) && context.edges.has(JSON.stringify([id, userId]));
    const policy = context.policies.get(id) || 'TODOS';
    if (context.blocked.has(id) || policy === 'NINGUEM' || policy === 'MUTUOS' && !both) return {
      ...messageAllowance(false, sent),
      canSend: false,
      restriction: 'socialInteractionUnavailable'
    };
    if (!both) mutual = false;
  }
  return messageAllowance(mutual, sent);
}
export const createGroupConversations = db => ({
  async access(userId, id, tx = db) {
    const row = await tx.conversa.findUnique({
      where: {
        id
      },
      include: conversationMembers
    });
    if (!row) throw socialError(404, 'conversationNotFound');
    if (!isGroup(row)) {
      if (![row.usuarioAId, row.usuarioBId].includes(userId)) throw socialError(404, 'conversationNotFound');
      return {
        row,
        member: {
          papel: 'MEMBRO'
        },
        members: [row.usuarioAId, row.usuarioBId]
      };
    }
    const member = row.participantes.find(item => item.usuarioId === userId);
    if (!member) throw socialError(404, 'conversationNotFound');
    return {
      row,
      member,
      members: row.participantes.map(item => item.usuarioId)
    };
  },
  async allowance(userId, id, tx = db) {
    const {
      row,
      members
    } = await this.access(userId, id, tx);
    const [sent, context] = await Promise.all([tx.mensagem.count({
      where: {
        conversaId: id,
        remetenteId: userId
      }
    }), permissions(tx, userId, members)]);
    return calculateAllowance(row, userId, sent, context);
  },
  async list(userId) {
    const rows = await db.conversa.findMany({
      where: {
        tipo: {
          in: ['GRUPO', 'CANAL']
        },
        participantes: {
          some: {
            usuarioId: userId,
            estado: 'ATIVO'
          }
        }
      },
      include: {
        ...conversationMembers,
        mensagens: {
          where: {
            remetente: {
              is: unblockedUserWhere(userId)
            }
          },
          orderBy: [{
            criadaEm: 'desc'
          }, {
            id: 'desc'
          }],
          take: 1
        }
      },
      orderBy: [{
        atualizadaEm: 'desc'
      }, {
        id: 'desc'
      }],
      take: 50
    });
    if (!rows.length) return [];
    const [context, counts] = await Promise.all([permissions(db, userId, rows.flatMap(row => row.participantes.map(item => item.usuarioId))), db.mensagem.groupBy({
        by: ['conversaId'],
        where: {
          conversaId: {
            in: rows.map(row => row.id)
          },
          remetenteId: userId
        },
        _count: {
          _all: true
        }
      })]),
      sent = new Map(counts.map(row => [row.conversaId, row._count._all]));
    return rows.map(row => ({
      ...row,
      participant: {
        id: row.id,
        nome: row.nome
      },
      ultimaMensagem: row.mensagens[0] || null,
      messaging: calculateAllowance(row, userId, sent.get(row.id) || 0, context)
    }));
  },
  async create(req, body) {
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100 || typeof (body.description ?? '') !== 'string' || (body.description || '').length > 1000 || !['GRUPO', 'CANAL'].includes(body.type) || !Array.isArray(body.members) || body.members.length > 19 || body.members.some(id => typeof id !== 'string' || !/^[-\w]{1,36}$/.test(id))) throw socialError(400, 'chatGroupInvalid');
    if (body.type === 'CANAL' && !req.isAdmin) throw socialError(403, 'adminAccessRequired');
    const ids = [...new Set([req.userId, ...body.members])];
    if (body.type === 'GRUPO' && ids.length < 2) throw socialError(400, 'chatGroupInvalid');
    return db.$transaction(async tx => {
      await lockUsers(tx, ids);
      for (const id of ids) {
        if (!(await tx.usuario.findUnique({
          where: {
            id
          },
          select: {
            id: true
          }
        }))) throw socialError(404, 'profileNotFound');
        if (id !== req.userId) await assertInteractionAllowed(tx, req.userId, id, 'mensagens');
      }
      for (const left of ids) for (const right of ids) if (left < right && (await isBlocked(tx, left, right))) throw socialError(403, 'socialInteractionUnavailable');
      const row = await tx.conversa.create({
        data: {
          tipo: body.type,
          nome: body.name.trim(),
          descricao: (body.description || '').trim(),
          criadorId: req.userId,
          usuarioAId: null,
          usuarioBId: null
        }
      });
      for (const id of ids) await tx.participanteConversa.create({
        data: {
          conversaId: row.id,
          usuarioId: id,
          papel: id === req.userId ? 'ADMIN' : 'MEMBRO',
          estado: 'ATIVO'
        }
      });
      return {
        id: row.id
      };
    }, {
      isolationLevel: 'ReadCommitted'
    });
  },
  async details(userId, id) {
    const {
      row,
      member
    } = await this.access(userId, id);
    return {
      id: row.id,
      name: row.nome,
      description: row.descricao,
      type: row.tipo,
      role: member.papel,
      members: (row.participantes || []).map(item => ({
        user: item.usuario,
        role: item.papel
      }))
    };
  },
  async member(userId, id, targetId, action) {
    if (!['add', 'remove', 'promote', 'demote', 'leave'].includes(action) || typeof targetId !== 'string') throw socialError(400, 'chatGroupInvalid');
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId, targetId]);
      await tx.$queryRaw`SELECT id FROM conversas WHERE id = ${id} FOR UPDATE`;
      const {
        row,
        member,
        members
      } = await this.access(userId, id, tx);
      if (!isGroup(row)) throw socialError(400, 'chatGroupInvalid');
      if (action === 'leave' ? targetId !== userId : member.papel !== 'ADMIN') throw socialError(403, 'socialInteractionUnavailable');
      const target = row.participantes.find(item => item.usuarioId === targetId);
      if (['remove', 'demote', 'leave'].includes(action) && target?.papel === 'ADMIN' && row.participantes.filter(item => item.papel === 'ADMIN').length === 1) throw socialError(409, 'chatGroupLastAdmin');
      if (action === 'add') {
        if (members.length >= 20 && !target) throw socialError(400, 'chatGroupFull');
        if (!(await tx.usuario.findUnique({
          where: {
            id: targetId
          },
          select: {
            id: true
          }
        }))) throw socialError(404, 'profileNotFound');
        await assertInteractionAllowed(tx, userId, targetId, 'mensagens');
        for (const other of members) await assertInteractionAllowed(tx, targetId, other, 'mensagens');
      } else if (!target) throw socialError(404, 'profileNotFound');
      await tx.participanteConversa.upsert({
        where: {
          conversaId_usuarioId: {
            conversaId: id,
            usuarioId: targetId
          }
        },
        create: {
          conversaId: id,
          usuarioId: targetId,
          estado: 'ATIVO',
          papel: 'MEMBRO'
        },
        update: action === 'add' ? {
          estado: 'ATIVO',
          papel: target?.papel || 'MEMBRO'
        } : action === 'promote' || action === 'demote' ? {
          papel: action === 'promote' ? 'ADMIN' : 'MEMBRO'
        } : {
          estado: 'REMOVIDO'
        }
      });
      await tx.log.create({
        data: {
          usuarioId: userId,
          acao: 'conversation_member:' + id + ':' + targetId + ':' + action
        }
      });
      return {
        ok: true
      };
    }, {
      isolationLevel: 'ReadCommitted'
    });
  },
  async history(userId, id, query = {}) {
    await this.access(userId, id);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 50));
    const cursorId = query.before || query.after;
    let cursor;
    if (cursorId) {
      cursor = await db.mensagem.findFirst({
        where: {
          id: cursorId,
          conversaId: id
        }
      });
      if (!cursor) throw socialError(400, 'chatGroupInvalid');
    }
    if (query.after && query.before) throw socialError(400, 'chatGroupInvalid');
    const direction = query.after ? 'asc' : 'desc',
      op = query.after ? 'gt' : 'lt',
      where = {
        conversaId: id,
        remetente: {
          is: unblockedUserWhere(userId)
        },
        ...(cursor ? {
          OR: [{
            criadaEm: {
              [op]: cursor.criadaEm
            }
          }, {
            criadaEm: cursor.criadaEm,
            id: {
              [op]: cursor.id
            }
          }]
        } : {})
      };
    const rows = await db.mensagem.findMany({
        where,
        include: chatMessageInclude,
        orderBy: [{
          criadaEm: direction
        }, {
          id: direction
        }],
        take: limit + 1
      }),
      more = rows.length > limit,
      messages = rows.slice(0, limit);
    if (!query.after) messages.reverse();
    const context = await permissions(db, userId, messages.filter(message => message.resposta).map(message => message.resposta.remetenteId));
    for (const message of messages) if (message.resposta && context.blocked.has(message.resposta.remetenteId)) message.resposta = null;
    return {
      messages,
      messaging: await this.allowance(userId, id),
      pageInfo: {
        hasOlder: !query.after && more,
        hasNewer: Boolean(query.after) && more
      }
    };
  },
  async send(userId, id, body) {
    if (typeof body.texto !== 'string' || !body.texto.trim() || body.texto.length > 2000) throw socialError(400, 'chatMessageLength');
    const snapshot = await this.access(userId, id);
    return db.$transaction(async tx => {
      await lockUsers(tx, snapshot.members);
      await tx.$queryRaw`SELECT id FROM conversas WHERE id = ${id} FOR UPDATE`;
      const current = await this.access(userId, id, tx);
      if (JSON.stringify(current.members.slice().sort()) !== JSON.stringify(snapshot.members.slice().sort())) throw socialError(409, 'chatGroupChanged');
      const messaging = await this.allowance(userId, id, tx);
      if (!messaging.canSend) throw socialError(403, messaging.restriction || 'chatLimitReached');
      if (body.replyId && (typeof body.replyId !== 'string' || !/^[-\w]{1,36}$/.test(body.replyId))) throw socialError(400, 'chatGroupInvalid');
      if (body.replyId && !(await tx.mensagem.findFirst({
        where: {
          id: body.replyId,
          conversaId: id
        },
        select: {
          id: true
        }
      }))) throw socialError(400, 'chatGroupInvalid');
      if (body.replyId) {
        const parent = await tx.mensagem.findUnique({
          where: {
            id: body.replyId
          }
        });
        if (await isBlocked(tx, userId, parent.remetenteId)) throw socialError(403, 'socialInteractionUnavailable');
      }
      const message = await tx.mensagem.create({
        data: {
          texto: body.texto.trim(),
          conversaId: id,
          remetenteId: userId,
          respostaId: body.replyId || null
        },
        include: chatMessageInclude
      });
      await tx.conversa.update({
        where: {
          id
        },
        data: {
          atualizadaEm: new Date()
        }
      });
      const notifications = [];
      for (const recipient of current.members.filter(member => member !== userId)) {
        const notification = await writeNotification(tx, {
          usuarioId: recipient,
          autorId: userId,
          tipo: 'MENSAGEM',
          titulo: 'notificationMessageTitle',
          mensagem: 'notificationMessageBody',
          link: '/feed?conversation=' + encodeURIComponent(id) + '#conversations',
          eventKey: 'message:' + message.id
        });
        if (notification) notifications.push(notification);
      }
      return {
        message,
        messaging: await this.allowance(userId, id, tx),
        notifications
      };
    }, {
      isolationLevel: 'ReadCommitted'
    });
  },
  async react(userId, conversationId, messageId, emoji) {
    const allowed = ['💜', '❤️', '👍', '😂', '😮', '😢', '👏', null];
    if (!allowed.includes(emoji)) throw socialError(400, 'chatGroupInvalid');
    await this.access(userId, conversationId);
    const message = await db.mensagem.findFirst({
      where: {
        id: messageId,
        conversaId: conversationId
      }
    });
    if (!message) throw socialError(404, 'socialContentUnavailable');
    return db.$transaction(async tx => {
      await lockUsers(tx, [userId, message.remetenteId]);
      await tx.$queryRaw`SELECT id FROM conversas WHERE id = ${conversationId} FOR UPDATE`;
      await this.access(userId, conversationId, tx);
      await assertInteractionAllowed(tx, userId, message.remetenteId);
      const where = {
        mensagemId: messageId,
        usuarioId: userId
      };
      if (emoji === null) await tx.reacaoMensagem.deleteMany({
        where
      });else await tx.reacaoMensagem.upsert({
        where: {
          mensagemId_usuarioId: where
        },
        create: {
          ...where,
          emoji
        },
        update: {
          emoji
        }
      });
      return {
        ok: true
      };
    }, {
      isolationLevel: 'ReadCommitted'
    });
  },
  async read(userId, id) {
    await this.access(userId, id);
    await db.participanteConversa.upsert({
      where: {
        conversaId_usuarioId: {
          conversaId: id,
          usuarioId: userId
        }
      },
      create: {
        conversaId: id,
        usuarioId: userId,
        lidaAte: new Date()
      },
      update: {
        lidaAte: new Date()
      }
    });
    return {
      ok: true
    };
  }
});
