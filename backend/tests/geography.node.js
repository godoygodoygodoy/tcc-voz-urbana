import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createSocialFixture } from './helpers/socialFixture.js';
const call = (fixture, path, actor) => {
  const query = request(fixture.app).get('/api/geography/' + path);
  return actor ? query.set('Authorization', 'Bearer test-' + actor) : query;
};
function populate(f) {
  for (const [index, owner, city, neighborhood, date] of [
    [1, 'a', 'Campinas', 'Centro', '2026-10-10'], [2, 'a', 'Campinas', 'Centro', '2026-10-11'],
    [3, 'b', 'Campinas', 'Centro', '2026-10-12'], [4, 'c', 'Santos', null, '2026-10-12'],
    [5, 'a', 'Campinas', 'Centro', '2026-09-15'],
  ]) f.state.problems.push({ id: 'geo-' + index, usuarioId: owner, cidade: city, estado: 'SP', bairro: neighborhood,
    categoriaId: 'cat', latitude: -23, longitude: -47, status: 'ABERTO', dataCriacao: new Date(date + 'T12:00:00Z') });
  f.state.votes.push({ id: 'support', usuarioId: 'c', problemaId: 'geo-1', tipo: 'CONFIRMAR' });
}
test('heatmap aggregates beyond list pages and applies combined filters and private audiences on the server', async () => {
  const f = await createSocialFixture();
  try {
    populate(f);
    const filter = 'heatmap?from=2026-10-01&to=2026-10-31&state=SP&city=Campinas&neighborhood=Centro&category=cat&status=ABERTO';
    const guest = (await call(f, filter).expect(200)).body;
    assert.equal(guest.total, 2); assert.equal(guest.points.length, 1); assert.equal(guest.points[0].count, 2);
    assert.equal((await call(f, filter + '&engagement=supported').expect(200)).body.total, 1);
    assert.equal((await call(f, filter + '&engagement=unsupported').expect(200)).body.total, 1);
    assert.equal((await call(f, filter + '&south=-24&north=-22&west=-48&east=-46').expect(200)).body.total, 2);
    assert.equal((await call(f, filter + '&south=0&north=1&west=0&east=1').expect(200)).body.total, 0);
    assert.equal((await call(f, filter + '&lat=-23&lng=-47&radius=5').expect(200)).body.total, 2);
    assert.equal((await call(f, filter + '&lat=0&lng=0&radius=5').expect(200)).body.total, 0);
    f.state.follows.push({ id: 'approved', followerId: 'a', followingId: 'b', status: 'ACEITA' });
    assert.equal((await call(f, filter, 'a').expect(200)).body.total, 3);
    f.state.follows = [];
    assert.equal((await call(f, filter, 'a').expect(200)).body.total, 2);
    for (const suffix of ['&from=bad', '&to=2026-02-30', '&status=FORGED', '&engagement=FORGED', '&south=1', '&south=2&north=1&west=0&east=1']) await call(f, filter + suffix).expect(400);
    for (const suffix of ['&lat=', '&lat=0&lng=0&radius=-1', '&lat=91&lng=0']) await call(f, filter + suffix).expect(400);
    const list = await request(f.app).get('/api/problems?city=Campinas&neighborhood=Centro&from=2026-10-01&to=2026-10-31&engagement=supported').expect(200);
    assert.equal(list.body.total, 1); assert.equal(list.body.data[0].neighborhood, 'Centro');
  } finally { await f.close(); }
});

test('regional summaries use equal adjacent periods, real registration dates, explicit unknown neighborhoods and bounded density', async () => {
  const f = await createSocialFixture();
  try {
    populate(f);
    const summary = (await call(f, 'summary?from=2026-10-01&to=2026-10-31&state=SP').expect(200)).body;
    assert.equal(summary.total, 3); assert.equal(summary.previousTotal, 1);
    assert.equal(summary.timeline.reduce((sum, bin) => sum + bin.count, 0), 3);
    assert.equal(summary.unknownNeighborhood, 1);
    assert.equal(summary.regions.find(row => row.city === 'Campinas').count, 2);
    await call(f, 'summary?from=2024-01-01&to=2026-10-31').expect(400);
    for (let index = 0; index < 2010; index++) f.state.problems.push({ id: 'point-' + index, usuarioId: 'a', latitude: index / 100, longitude: index / 100, status: 'ABERTO' });
    const density = (await call(f, 'heatmap').expect(200)).body;
    assert.equal(density.truncated, true); assert.equal(density.points.length, 2000);
    assert.ok(density.total > density.represented);
  } finally { await f.close(); }
});
