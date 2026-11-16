import { createHash } from 'node:crypto';
import { problemFilters } from './geography.js';
import { publicUser, socialError, unblockedUserWhere } from './socialGraph.js';
const postSelect = {
  id: true,
  titulo: true,
  endereco: true,
  cidade: true,
  bairro: true,
  latitude: true,
  longitude: true,
  status: true,
  dataCriacao: true,
  categoria: {
    select: {
      id: true,
      nome: true,
      cor: true
    }
  },
  usuario: {
    select: publicUser
  }
};
const postDto = row => ({
  id: row.id,
  title: row.titulo,
  address: row.endereco,
  city: row.cidade,
  neighborhood: row.bairro,
  latitude: row.latitude === null ? null : Number(row.latitude),
  longitude: row.longitude === null ? null : Number(row.longitude),
  status: row.status,
  category: row.categoria ? {
    id: row.categoria.id,
    name: row.categoria.nome,
    color: row.categoria.cor
  } : null,
  author: row.usuario
});
export const createRadar = db => ({
  async list(req, query = {}) {
    const base = problemFilters(req, query),
      period = base.dataCriacao;
    delete base.dataCriacao;
    if (req.userId) base.AND = [...(base.AND || []), {
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
    }, {
      ocultacoes: {
        none: {
          usuarioId: req.userId
        }
      }
    }];
    const type = query.type || 'all';
    if (!['all', 'reports', 'updates', 'resolved'].includes(type)) throw socialError(400, 'geoFilterInvalid');
    if (type === 'resolved') base.status = 'RESOLVIDO';
    const scope = createHash('sha256').update(JSON.stringify([base, period || null, type, req.userId || null])).digest('hex').slice(0, 16);
    let cursor;
    if (query.cursor) {
      try {
        if (typeof query.cursor !== 'string' || query.cursor.length > 512) throw Error();
        cursor = JSON.parse(Buffer.from(query.cursor, 'base64url').toString());
        if (cursor.length !== 4 || cursor[3] !== scope || !['report', 'update'].includes(cursor[1]) || !/^[-\w]{1,36}$/.test(cursor[2]) || new Date(cursor[0]).toISOString() !== cursor[0]) throw Error();
      } catch {
        throw socialError(400, 'feedCursorInvalid');
      }
    }
    const boundary = kind => cursor ? {
      OR: [{
        dataCriacao: {
          lt: new Date(cursor[0])
        }
      }, ...(kind < cursor[1] ? [{
        dataCriacao: new Date(cursor[0])
      }] : kind === cursor[1] ? [{
        dataCriacao: new Date(cursor[0]),
        id: {
          lt: cursor[2]
        }
      }] : [])]
    } : {};
    const postWhere = {
      AND: [base, ...(period ? [{
        dataCriacao: period
      }] : []), boundary('report')]
    };
    const updatesWhere = {
      AND: [{
        problema: {
          is: base
        }
      }, ...(period ? [{
        dataCriacao: period
      }] : []), {
        usuario: {
          is: unblockedUserWhere(req.userId)
        }
      }, boundary('update')]
    };
    const mapWhere = period ? {
      AND: [base, {
        OR: [{
          dataCriacao: period
        }, {
          atualizacoes: {
            some: {
              dataCriacao: period
            }
          }
        }]
      }]
    } : base;
    const [reports, updates, markers] = await Promise.all([type === 'updates' ? [] : db.problema.findMany({
      where: postWhere,
      select: postSelect,
      orderBy: [{
        dataCriacao: 'desc'
      }, {
        id: 'desc'
      }],
      take: 13
    }), type === 'reports' ? [] : db.atualizacaoProblema.findMany({
      where: updatesWhere,
      include: {
        problema: {
          select: postSelect
        },
        usuario: {
          select: publicUser
        }
      },
      orderBy: [{
        dataCriacao: 'desc'
      }, {
        id: 'desc'
      }],
      take: 13
    }), query.cursor ? [] : db.problema.findMany({
      where: {
        AND: [mapWhere, {
          latitude: {
            not: null
          },
          longitude: {
            not: null
          }
        }]
      },
      select: postSelect,
      orderBy: [{
        dataCriacao: 'desc'
      }, {
        id: 'desc'
      }],
      take: 101
    })]);
    const merged = [...reports.map(row => ({
      id: 'report:' + row.id,
      sourceId: row.id,
      type: 'report',
      at: row.dataCriacao,
      post: postDto(row),
      actor: row.usuario
    })), ...updates.map(row => ({
      id: 'update:' + row.id,
      sourceId: row.id,
      type: 'update',
      at: row.dataCriacao,
      text: row.texto,
      status: row.status,
      post: postDto(row.problema),
      actor: row.usuario
    }))].sort((a, b) => +new Date(b.at) - +new Date(a.at) || b.id.localeCompare(a.id));
    const data = merged.slice(0, 12),
      last = data.at(-1),
      hasMore = merged.length > 12;
    return {
      data,
      hasMore,
      nextCursor: hasMore ? Buffer.from(JSON.stringify([new Date(last.at).toISOString(), last.type, last.sourceId, scope])).toString('base64url') : null,
      ...(!query.cursor ? {
        markers: markers.slice(0, 100).map(postDto),
        mapTruncated: markers.length > 100
      } : {})
    };
  }
});
