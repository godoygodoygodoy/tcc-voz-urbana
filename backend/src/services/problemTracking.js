import { lockUsers, socialError, visibleProblemWhere } from './socialGraph.js';
import { publicUser } from './socialGraph.js';
import { stageDto } from './workflow.js';
const CHOICES = ['EXISTE', 'RESOLVIDO', 'ATUALIZAR'];
const includeAuthor = {
  usuario: {
    select: publicUser
  }
};
const pageSize = 30;
const getProblem = async (db, req, id) => {
  const problem = await db.problema.findFirst({
    where: {
      id,
      ...visibleProblemWhere(req)
    },
    include: {
      usuario: {
        select: publicUser
      },
      etapa: true
    }
  });
  if (!problem) throw socialError(404, 'problemNotFound');
  return problem;
};
const cursorValue = cursor => {
  if (!cursor) return null;
  if (typeof cursor !== 'string' || cursor.length > 512) throw socialError(400, 'trackingCursorInvalid');
  try {
    const values = JSON.parse(Buffer.from(String(cursor), 'base64url').toString());
    if (values.length !== 3 || !Number.isFinite(+new Date(values[0])) || !['created', 'update', 'comment'].includes(values[1]) || typeof values[2] !== 'string' || values[2].length > 36) throw Error();
    return values;
  } catch {
    throw socialError(400, 'trackingCursorInvalid');
  }
};
const after = (cursor, kind, dateField = 'dataCriacao') => !cursor ? {} : kind === cursor[1] ? {
  OR: [{
    [dateField]: {
      lt: new Date(cursor[0])
    }
  }, {
    [dateField]: new Date(cursor[0]),
    id: {
      gt: cursor[2]
    }
  }]
} : {
  [dateField]: {
    [kind > cursor[1] ? 'lte' : 'lt']: new Date(cursor[0])
  }
};
export const createProblemTracking = db => ({
  async confirmations(req, id) {
    const problem = await getProblem(db, req, id);
    const [groups, mine] = await Promise.all([db.confirmacaoProblema.groupBy({
      by: ['escolha'],
      where: {
        problemaId: id
      },
      _count: {
        id: true
      }
    }), req.userId ? db.confirmacaoProblema.findUnique({
      where: {
        usuarioId_problemaId: {
          usuarioId: req.userId,
          problemaId: id
        }
      }
    }) : null]);
    return {
      status: problem.status,
      stage: stageDto(problem.etapa),
      choices: CHOICES.map(choice => ({
        choice,
        count: groups.find(row => row.escolha === choice)?._count.id || 0
      })),
      mine: mine ? {
        choice: mine.escolha,
        at: mine.registradaEm,
        nextAllowedAt: new Date(+new Date(mine.registradaEm) + 86400000)
      } : null
    };
  },
  async confirm(req, id, choice) {
    if (!CHOICES.includes(choice)) throw socialError(400, 'confirmationInvalid');
    const candidate = await getProblem(db, req, id);
    await db.$transaction(async tx => {
      await lockUsers(tx, [req.userId, candidate.usuarioId]);
      await getProblem(tx, req, id);
      const where = {
        usuarioId_problemaId: {
          usuarioId: req.userId,
          problemaId: id
        }
      };
      const current = await tx.confirmacaoProblema.findUnique({
        where
      });
      if (current?.escolha === choice) return;
      if (current && Date.now() - +new Date(current.registradaEm) < 86400000) throw socialError(429, 'confirmationCooldown');
      await tx.confirmacaoProblema.upsert({
        where,
        create: {
          usuarioId: req.userId,
          problemaId: id,
          escolha: choice
        },
        update: {
          escolha: choice,
          registradaEm: new Date()
        }
      });
    }, {
      isolationLevel: 'ReadCommitted'
    });
    return this.confirmations(req, id);
  },
  async timeline(req, id, rawCursor) {
    const problem = await getProblem(db, req, id),
      cursor = cursorValue(rawCursor);
    const [updates, comments] = await Promise.all([db.atualizacaoProblema.findMany({
      where: {
        problemaId: id,
        ...after(cursor, 'update')
      },
      include: includeAuthor,
      orderBy: [{
        dataCriacao: 'desc'
      }, {
        id: 'asc'
      }],
      take: pageSize + 1
    }), db.comentario.findMany({
      where: {
        problemaId: id,
        ...after(cursor, 'comment')
      },
      include: includeAuthor,
      orderBy: [{
        dataCriacao: 'desc'
      }, {
        id: 'asc'
      }],
      take: pageSize + 1
    })]);
    const events = [...updates.map(row => ({
      id: row.id,
      kind: 'update',
      at: row.dataCriacao,
      author: row.usuario,
      text: row.texto,
      status: row.status,
      previousStatus: row.statusAnterior,
      stageCode: row.etapaCodigo,
      stageName: row.etapaNome
    })), ...comments.map(row => ({
      id: row.id,
      kind: 'comment',
      at: row.dataCriacao,
      author: row.usuario,
      text: row.texto,
      reply: Boolean(row.parentId)
    }))];
    const creation = {
      id: problem.id,
      kind: 'created',
      at: problem.dataCriacao,
      author: problem.usuario
    };
    const creationKey = [new Date(creation.at).toISOString(), creation.kind, creation.id];
    if (!cursor || creationKey[0] < cursor[0] || creationKey[0] === cursor[0] && (creationKey[1] > cursor[1] || creationKey[1] === cursor[1] && creationKey[2] > cursor[2])) events.push(creation);
    events.sort((a, b) => +new Date(b.at) - +new Date(a.at) || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const rows = events.slice(0, pageSize),
      last = rows.at(-1);
    return {
      data: rows,
      nextCursor: events.length > pageSize ? Buffer.from(JSON.stringify([new Date(last.at).toISOString(), last.kind, last.id])).toString('base64url') : null
    };
  },
  async related(req, id) {
    const problem = await getProblem(db, req, id),
      reasons = [];
    if (problem.categoriaId) reasons.push({
      categoriaId: problem.categoriaId
    });
    if (problem.cidade && problem.estado && problem.bairro) reasons.push({
      cidade: problem.cidade,
      estado: problem.estado,
      bairro: problem.bairro
    });
    const lat = problem.latitude == null ? NaN : Number(problem.latitude),
      lng = problem.longitude == null ? NaN : Number(problem.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) reasons.push({
      latitude: {
        gte: lat - 0.018,
        lte: lat + 0.018
      },
      longitude: {
        gte: lng - 0.018,
        lte: lng + 0.018
      }
    });
    if (!reasons.length) return {
      data: []
    };
    const rows = await db.problema.findMany({
      where: {
        AND: [visibleProblemWhere(req), {
          id: {
            not: id
          }
        }, {
          OR: reasons
        }]
      },
      include: {
        categoria: true
      },
      orderBy: [{
        dataCriacao: 'desc'
      }, {
        id: 'asc'
      }],
      take: 12
    });
    return {
      data: rows.map(row => ({
        id: row.id,
        title: row.titulo,
        status: row.status,
        city: row.cidade,
        neighborhood: row.bairro,
        category: row.categoria?.nome,
        reasons: [...(row.categoriaId === problem.categoriaId && problem.categoriaId ? ['category'] : []), ...(row.bairro && row.bairro === problem.bairro && row.cidade === problem.cidade && row.estado === problem.estado ? ['neighborhood'] : []), ...(Number.isFinite(lat) && row.latitude != null && row.longitude != null && Math.abs(Number(row.latitude) - lat) <= 0.018 && Math.abs(Number(row.longitude) - lng) <= 0.018 ? ['nearby'] : [])]
      }))
    };
  }
});
