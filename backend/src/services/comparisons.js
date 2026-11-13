import { lockUsers, socialError } from './socialGraph.js';
export async function attachComparison(db, userId, id, urls) {
  const candidate = await db.problema.findUnique({
    where: {
      id
    },
    select: {
      usuarioId: true
    }
  });
  if (!candidate) throw socialError(404, 'problemNotFound');
  return db.$transaction(async tx => {
    await lockUsers(tx, [userId, candidate.usuarioId]);
    const [problem, actor] = await Promise.all([tx.problema.findUnique({
      where: {
        id
      }
    }), tx.usuario.findUnique({
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
    })]);
    if (!problem) throw socialError(404, 'problemNotFound');
    if (problem.usuarioId !== userId && !actor?.admin) throw socialError(403, 'comparisonForbidden');
    if ((await tx.imagem.count({
      where: {
        problemaId: id
      }
    })) > 38) throw socialError(400, 'comparisonLimit');
    if (!Array.isArray(urls) || urls.length !== 2 || urls.some(url => typeof url !== 'string' || !url)) throw socialError(400, 'comparisonFilesRequired');
    for (let index = 0; index < 2; index++) await tx.imagem.create({
      data: {
        problemaId: id,
        url: urls[index],
        tipo: index ? 'DEPOIS' : 'ANTES'
      }
    });
    // A timestamp and actor are recorded without suggesting that a photo proves official resolution.
    await tx.atualizacaoProblema.create({
      data: {
        problemaId: id,
        usuarioId: userId,
        texto: 'comparisonAddedHistory'
      }
    });
    return {
      added: 2
    };
  }, {
    isolationLevel: 'ReadCommitted'
  });
}
