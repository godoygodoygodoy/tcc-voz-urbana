import { lockUsers, readersOfProfileWhere, socialError } from './socialGraph.js';
import { writeNotification } from './notifications.js';

const STATUSES = new Set(['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO']);

export function createProblemStatus(db) {
  return {
    async update(actorId, problemId, body) {
      if (!STATUSES.has(body?.status)) throw socialError(400, 'problemStatusInvalid');
      const candidate = await db.problema.findUnique({ where: { id: problemId }, select: { usuarioId: true } });
      if (!candidate) throw socialError(404, 'problemNotFound');
      return db.$transaction(async tx => {
        await lockUsers(tx, [actorId, candidate.usuarioId]);
        // Verify the current database permission inside the transaction.
        const actor = await tx.usuario.findUnique({ where: { id: actorId }, select: { admin: { select: { nivel: true } } } });
        if (!actor?.admin) throw socialError(403, 'problemStatusForbidden');
        await tx.$queryRaw`SELECT id FROM problemas WHERE id = ${problemId} FOR UPDATE`;
        const problem = await tx.problema.findUnique({ where: { id: problemId } });
        if (!problem) throw socialError(404, 'problemNotFound');
        if (problem.status === body.status) return { problem, notifications: [], changed: false };
        const updated = await tx.problema.update({ where: { id: problemId }, data: { status: body.status } });
        const history = await tx.atualizacaoProblema.create({ data: {
          texto: `Status alterado para ${body.status}`, status: body.status, usuarioId: actorId, problemaId: problemId,
        } });
        await tx.log.create({ data: { usuarioId: actorId, acao: `Problema ${problemId}: ${problem.status} → ${body.status}` } });
        // Durable delivery cursor commits with the change; a restart cannot lose followers' updates.
        await tx.entregaAtualizacao.create({ data: { historicoId: history.id } });
        const notifications = [];
        if (problem.usuarioId !== actorId) {
          const notification = await writeNotification(tx, {
            usuarioId: problem.usuarioId, tipo: 'STATUS', titulo: 'problemStatusChangedTitle',
            mensagem: `O status foi alterado para ${body.status}`, link: '/problem/' + problemId,
            eventKey: 'status:' + history.id,
          });
          if (notification) notifications.push(notification);
        }
        return { problem: updated, notifications, changed: true };
      }, { isolationLevel: 'ReadCommitted' });
    },

    async deliverBatch() {
      const candidate = await db.entregaAtualizacao.findFirst({ orderBy: [{ criadaEm: 'asc' }, { historicoId: 'asc' }],
        include: { historico: { select: { problema: { select: { usuarioId: true } } } } } });
      if (!candidate) return { pending: false, notifications: [] };
      return db.$transaction(async tx => {
        // Synchronize with privacy changes before reading the current audience.
        await lockUsers(tx, [candidate.historico.problema.usuarioId]);
        await tx.$queryRaw`SELECT historico_id FROM entregas_atualizacao WHERE historico_id = ${candidate.historicoId} FOR UPDATE`;
        const job = await tx.entregaAtualizacao.findUnique({ where: { historicoId: candidate.historicoId }, include: {
          historico: { include: { problema: { include: { usuario: { select: { id: true, perfilPrivado: true } } } } } },
        } });
        if (!job) return { pending: true, notifications: [] };
        const history = job.historico, problem = history.problema;
        const rows = await tx.publicacaoSalva.findMany({
          where: { problemaId: problem.id, acompanhando: true, ...(job.cursorUsuarioId ? { usuarioId: { gt: job.cursorUsuarioId } } : {}),
            usuario: { is: readersOfProfileWhere(problem.usuario) } },
          orderBy: { usuarioId: 'asc' }, take: 50, select: { usuarioId: true },
        });
        const notifications = [];
        for (const row of rows) {
          // The owner is notified by the original transaction. Actors do not notify themselves.
          if ([problem.usuarioId, history.usuarioId].includes(row.usuarioId)) continue;
          const notification = await writeNotification(tx, {
            usuarioId: row.usuarioId, tipo: 'ACOMPANHAMENTO', titulo: 'watchedProblemChangedTitle',
            mensagem: `O status foi alterado para ${history.status}`, link: '/problem/' + problem.id,
            eventKey: 'status:' + history.id,
          });
          if (notification) notifications.push(notification);
        }
        if (rows.length < 50) await tx.entregaAtualizacao.delete({ where: { historicoId: job.historicoId } });
        else await tx.entregaAtualizacao.update({ where: { historicoId: job.historicoId }, data: { cursorUsuarioId: rows[rows.length - 1].usuarioId } });
        return { pending: true, notifications };
      }, { isolationLevel: 'ReadCommitted', timeout: 15000 });
    },
  };
}

export function startStatusDelivery(service, announce) {
  let stopped = false, timer;
  const run = async () => {
    let delay = 15000;
    try {
      const result = await service.deliverBatch();
      if (result.pending) delay = 500;
      for (const notification of result.notifications) void announce(notification).catch(() => {});
    } catch (error) {
      console.error(JSON.stringify({ event: 'status_delivery_pending', code: error.code || error.name }));
    } finally {
      if (!stopped) { timer = setTimeout(run, delay); timer.unref?.(); }
    }
  };
  timer = setTimeout(run, 3000); timer.unref?.();
  return () => { stopped = true; clearTimeout(timer); };
}
