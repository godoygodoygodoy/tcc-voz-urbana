import { socialError, visibleProblemWhere } from './socialGraph.js';

const statuses = ['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO'];
function text(value, maximum = 120) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value.length > maximum) throw socialError(400, 'geoFilterInvalid');
  return value.trim() || undefined;
}
export function dateBoundary(value, end = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw socialError(400, 'geoFilterInvalid');
  const date = new Date(value + (end ? 'T23:59:59.999Z' : 'T00:00:00.000Z'));
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value) throw socialError(400, 'geoFilterInvalid');
  return date;
}
export function problemFilters(req, query = {}) {
  const where = { ...visibleProblemWhere(req) };
  for (const [key, column] of [['city', 'cidade'], ['state', 'estado'], ['neighborhood', 'bairro']]) {
    const value = text(query[key], key === 'state' ? 80 : 120);
    if (value) where[column] = { contains: value };
  }
  const category = text(query.category, 36);
  if (category) where.categoriaId = category;
  const status = text(query.status, 30);
  if (status && !statuses.includes(status)) throw socialError(400, 'geoFilterInvalid');
  if (status) where.status = status;
  if (query.from || query.to) {
    where.dataCriacao = { ...(query.from ? { gte: dateBoundary(query.from) } : {}), ...(query.to ? { lte: dateBoundary(query.to, true) } : {}) };
    if (where.dataCriacao.gte > where.dataCriacao.lte) throw socialError(400, 'geoFilterInvalid');
  }
  if (query.engagement && !['all', 'supported', 'unsupported', 'discussed'].includes(query.engagement)) throw socialError(400, 'geoFilterInvalid');
  if (query.engagement === 'supported') where.votos = { some: {} };
  if (query.engagement === 'unsupported') where.votos = { none: {} };
  if (query.engagement === 'discussed') where.comentarios = { some: {} };
  if (query.lat !== undefined || query.lng !== undefined) {
    const latitude = Number(query.lat), longitude = Number(query.lng), radius = Number(query.radius || 5);
    if ([query.lat, query.lng].some(value => value === undefined || value === null || value === '') || ![latitude, longitude, radius].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || radius <= 0 || radius > 1000) throw socialError(400, 'geoFilterInvalid');
    const latOffset = radius / 111, lngOffset = Math.min(180, radius / (111 * Math.max(0.001, Math.cos(latitude * Math.PI / 180))));
    where.latitude = { gte: Math.max(-90, latitude - latOffset), lte: Math.min(90, latitude + latOffset) };
    where.longitude = { gte: Math.max(-180, longitude - lngOffset), lte: Math.min(180, longitude + lngOffset) };
  }
  return where;
}

export const coordinateBounds = query => {
  const provided = ['south', 'north', 'west', 'east'].filter(key => query[key] !== undefined);
  if (!provided.length) return { latitude: { gte: -90, lte: 90 }, longitude: { gte: -180, lte: 180 } };
  if (provided.length !== 4) throw socialError(400, 'geoFilterInvalid');
  const [south, north, west, east] = ['south', 'north', 'west', 'east'].map(key => Number(query[key]));
  if (![south, north, west, east].every(Number.isFinite) || south < -90 || north > 90 || south >= north || west < -180 || east > 180 || west >= east) throw socialError(400, 'geoFilterInvalid');
  return { latitude: { gte: south, lte: north }, longitude: { gte: west, lte: east } };
};

export const createGeography = db => ({
  async heatmap(req, query) {
    const where = { AND: [problemFilters(req, query), coordinateBounds(query)] };
    // Aggregate all matching records in SQL; do not derive density from the current list page.
    const [groups, total] = await Promise.all([
      db.problema.groupBy({ by: ['latitude', 'longitude'], where, _count: { id: true }, orderBy: [{ _count: { id: 'desc' } }, { latitude: 'asc' }, { longitude: 'asc' }], take: 2001 }),
      db.problema.count({ where }),
    ]);
    const points = groups.slice(0, 2000).map(row => ({ latitude: Number(row.latitude), longitude: Number(row.longitude), count: row._count.id }));
    return { points, total, represented: points.reduce((sum, row) => sum + row.count, 0), truncated: groups.length > 2000 };
  },

  async summary(req, query) {
    const base = problemFilters(req, query);
    const to = query.to ? dateBoundary(query.to, true) : new Date();
    const from = query.from ? dateBoundary(query.from) : new Date(+to - 28 * 86400000 + 1);
    const duration = +to - +from + 1;
    if (duration <= 0 || duration > 366 * 86400000) throw socialError(400, 'geoPeriodInvalid');
    const current = { ...base, dataCriacao: { gte: from, lte: to } };
    const previous = { ...base, dataCriacao: { gte: new Date(+from - duration), lt: from } };
    const bins = Array.from({ length: 8 }, (_, index) => ({ from: new Date(+from + Math.floor(duration * index / 8)), to: new Date(+from + Math.floor(duration * (index + 1) / 8) - 1) }));
    const [total, previousTotal, distribution, categories, regions, counts, unknownNeighborhood] = await Promise.all([
      db.problema.count({ where: current }), db.problema.count({ where: previous }),
      db.problema.groupBy({ by: ['status'], where: current, _count: { id: true } }),
      db.problema.groupBy({ by: ['categoriaId'], where: current, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 20 }),
      db.problema.groupBy({ by: ['estado', 'cidade', 'bairro'], where: current, _count: { id: true }, orderBy: [{ _count: { id: 'desc' } }, { estado: 'asc' }, { cidade: 'asc' }, { bairro: 'asc' }], take: 20 }),
      Promise.all(bins.map(bin => db.problema.count({ where: { ...base, dataCriacao: { gte: bin.from, lte: bin.to } } }))),
      db.problema.count({ where: { AND: [current, { bairro: null }] } }),
    ]);
    return { from, to, previousFrom: new Date(+from - duration), previousTo: new Date(+from - 1), total, previousTotal,
      changePercent: previousTotal ? Math.round((total - previousTotal) / previousTotal * 1000) / 10 : null,
      distribution: distribution.map(row => ({ status: row.status, count: row._count.id })),
      categories: categories.map(row => ({ categoryId: row.categoriaId, count: row._count.id })),
      regions: regions.map(row => ({ state: row.estado, city: row.cidade, neighborhood: row.bairro, count: row._count.id })),
      timeline: bins.map((bin, index) => ({ ...bin, count: counts[index] })), unknownNeighborhood,
    };
  },
});
