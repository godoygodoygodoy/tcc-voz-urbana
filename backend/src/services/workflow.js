import { lockUsers, socialError } from './socialGraph.js';
export const DEFAULT_STAGES = [['REGISTRADO', 'ABERTO', '#8B5CF6'], ['EM_ANALISE', 'ABERTO', '#A855F7'], ['ENCAMINHADO', 'ABERTO', '#6366F1'], ['EM_ANDAMENTO', 'EM_ANDAMENTO', '#D97706'], ['RESOLVIDO', 'RESOLVIDO', '#059669'], ['NAO_CONFIRMADO', 'REJEITADO', '#64748B']].map(([codigo, statusBase, cor]) => ({
  codigo,
  statusBase,
  cor,
  nome: null,
  ativa: true
}));
export const STAGE_CODE = /^[A-Z][A-Z0-9_]{1,39}$/;
export const stageDto = row => row ? {
  code: row.codigo,
  name: row.nome,
  status: row.statusBase,
  color: row.cor,
  active: row.ativa,
  translationKey: row.nome ? null : 'workflow' + row.codigo
} : null;
export const listStages = async db => {
  const stored = await db.etapaProblema.findMany({
    orderBy: {
      codigo: 'asc'
    },
    take: 100
  });
  return [...DEFAULT_STAGES.filter(row => !stored.some(item => item.codigo === row.codigo)), ...stored].map(stageDto);
};
export async function resolveStage(db, code) {
  if (typeof code !== 'string' || !STAGE_CODE.test(code)) throw socialError(400, 'workflowInvalid');
  const row = (await db.etapaProblema.findUnique({
    where: {
      codigo: code
    }
  })) || DEFAULT_STAGES.find(item => item.codigo === code);
  if (!row || !row.ativa) throw socialError(400, 'workflowInactive');
  const saved = await db.etapaProblema.upsert({
    where: {
      codigo: code
    },
    create: row,
    update: {}
  });
  if (!saved.ativa) throw socialError(400, 'workflowInactive');
  return saved;
}
export async function configureStage(db, userId, code, body) {
  if (!STAGE_CODE.test(code) || !['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO'].includes(body.status) || typeof body.active !== 'boolean' || !/^#[a-f0-9]{6}$/i.test(body.color || '') || body.name !== null && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 80)) throw socialError(400, 'workflowInvalid');
  if (!DEFAULT_STAGES.some(row => row.codigo === code) && !body.name) throw socialError(400, 'workflowInvalid');
  return db.$transaction(async tx => {
    await lockUsers(tx, [userId]);
    const actor = await tx.usuario.findUnique({
      where: {
        id: userId
      },
      select: {
        admin: {
          select: {
            id: true
          }
        }
      }
    });
    if (!actor?.admin) throw socialError(403, 'problemStatusForbidden');
    const exists = await tx.etapaProblema.findUnique({
      where: {
        codigo: code
      }
    });
    if (!exists && (await tx.etapaProblema.count()) >= 100) throw socialError(400, 'workflowLimit');
    const data = {
      nome: body.name?.trim() || null,
      statusBase: body.status,
      ativa: body.active,
      cor: body.color
    };
    const row = await tx.etapaProblema.upsert({
      where: {
        codigo: code
      },
      create: {
        codigo: code,
        ...data
      },
      update: data
    });
    await tx.log.create({
      data: {
        usuarioId: userId,
        acao: 'Workflow ' + code + ' configurado'
      }
    });
    return stageDto(row);
  }, {
    isolationLevel: 'ReadCommitted'
  });
}
