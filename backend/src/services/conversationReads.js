// Two grouped reads, independent of message volume; the existing
// mensagens(conversa_id,criada_em) index supports the per-conversation boundary.
export async function withUnreadCounts(db, userId, rows) {
  if (!rows.length) return rows;
  const ids = rows.map(row => row.id);
  const markers = await db.participanteConversa.findMany({
      where: {
        usuarioId: userId,
        conversaId: {
          in: ids
        }
      },
      select: {
        conversaId: true,
        lidaAte: true
      }
    }),
    byId = new Map(markers.map(row => [row.conversaId, row.lidaAte]));
  const counts = await db.mensagem.groupBy({
      by: ['conversaId'],
      where: {
        remetenteId: {
          not: userId
        },
        OR: ids.map(id => ({
          conversaId: id,
          ...(byId.get(id) ? {
            criadaEm: {
              gt: byId.get(id)
            }
          } : {})
        }))
      },
      _count: {
        _all: true
      }
    }),
    unread = new Map(counts.map(row => [row.conversaId, row._count._all]));
  return rows.map(row => ({
    ...row,
    unreadCount: unread.get(row.id) || 0
  }));
}
