import { lockUsers, socialError, visibleProblemWhere } from './socialGraph.js';

function validatePoll(body) {
  if (typeof body?.question !== 'string' || !body.question.trim() || body.question.trim().length > 200) throw socialError(400, 'pollQuestionInvalid');
  if (!Array.isArray(body.options) || body.options.length < 2 || body.options.length > 6 || body.options.some(value => typeof value !== 'string' || !value.trim() || value.trim().length > 100)) throw socialError(400, 'pollOptionsInvalid');
  const options = body.options.map(value => value.trim());
  if (new Set(options.map(value => value.toLocaleLowerCase())).size !== options.length) throw socialError(400, 'pollOptionsInvalid');
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (endsAt && (!Number.isFinite(endsAt.getTime()) || endsAt <= new Date())) throw socialError(400, 'pollEndInvalid');
  return { question: body.question.trim(), options, endsAt };
}
async function visibleProblem(db, req, id) {
  const problem = await db.problema.findFirst({ where: { id, ...visibleProblemWhere(req) }, select: { id: true, usuarioId: true } });
  if (!problem) throw socialError(404, 'problemNotFound');
  return problem;
}
const include = { opcoes: { orderBy: { ordem: 'asc' }, include: { _count: { select: { votos: true } } } } };
export const createPolls = db => ({
  async get(req, problemId) {
    await visibleProblem(db, req, problemId);
    const poll = await db.enquete.findUnique({ where: { problemaId: problemId }, include });
    if (!poll) return null;
    const vote = req.userId ? await db.votoEnquete.findUnique({ where: { usuarioId_enqueteId: { usuarioId: req.userId, enqueteId: poll.id } }, select: { opcaoId: true } }) : null;
    const total = poll.opcoes.reduce((sum, option) => sum + option._count.votos, 0);
    return {
      id: poll.id, problemId, question: poll.pergunta, endsAt: poll.encerraEm,
      closed: Boolean(poll.encerraEm && poll.encerraEm <= new Date()), votedOptionId: vote?.opcaoId || null, total,
      options: poll.opcoes.map(option => ({ id: option.id, text: option.texto, votes: option._count.votos, percentage: total ? Math.round(option._count.votos / total * 1000) / 10 : 0 })),
    };
  },
  async create(req, problemId, body) {
    const value = validatePoll(body);
    await db.$transaction(async tx => {
      await lockUsers(tx, [req.userId]);
      const problem = await visibleProblem(tx, req, problemId);
      if (problem.usuarioId !== req.userId) throw socialError(403, 'pollAuthorOnly');
      if (await tx.enquete.findUnique({ where: { problemaId: problemId }, select: { id: true } })) throw socialError(409, 'pollAlreadyExists');
      await tx.enquete.create({ data: {
        problemaId: problemId, pergunta: value.question, encerraEm: value.endsAt,
        opcoes: { create: value.options.map((texto, ordem) => ({ texto, ordem })) },
      } });
    }, { isolationLevel: 'ReadCommitted' });
    return this.get(req, problemId);
  },
  async vote(req, problemId, optionId) {
    if (typeof optionId !== 'string' || !optionId) throw socialError(400, 'pollOptionInvalid');
    await db.$transaction(async tx => {
      await lockUsers(tx, [req.userId]);
      await visibleProblem(tx, req, problemId);
      const poll = await tx.enquete.findUnique({ where: { problemaId: problemId } });
      if (!poll) throw socialError(404, 'pollUnavailable');
      if (poll.encerraEm && poll.encerraEm <= new Date()) throw socialError(409, 'pollClosed');
      if (!await tx.enqueteOpcao.findFirst({ where: { id: optionId, enqueteId: poll.id }, select: { id: true } })) throw socialError(400, 'pollOptionInvalid');
      const where = { usuarioId_enqueteId: { usuarioId: req.userId, enqueteId: poll.id } };
      const existing = await tx.votoEnquete.findUnique({ where });
      if (existing && existing.opcaoId !== optionId) throw socialError(409, 'pollAlreadyVoted');
      if (!existing) await tx.votoEnquete.create({ data: { usuarioId: req.userId, enqueteId: poll.id, opcaoId: optionId } });
    }, { isolationLevel: 'ReadCommitted' });
    return this.get(req, problemId);
  },
});
