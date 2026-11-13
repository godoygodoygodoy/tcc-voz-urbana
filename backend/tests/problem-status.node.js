import test from 'node:test';
import assert from 'node:assert/strict';
import { createSocialMemory } from './helpers/socialMemory.js';
import { createProblemStatus } from '../src/services/problemStatus.js';
import request from 'supertest';
import { createSocialFixture } from './helpers/socialFixture.js';

function setup() {
  const memory = createSocialMemory();
  memory.user('a').admin = { nivel: 'ADMIN' };
  memory.state.problems.push({ id: 'problem', usuarioId: 'b', status: 'ABERTO' });
  memory.state.saved.push({ id: 'saved', usuarioId: 'c', problemaId: 'problem', acompanhando: true });
  return { ...memory, service: createProblemStatus(memory.db) };
}

test('status changes commit history, audit and owner notification together and repeated requests are idempotent', async () => {
  const f = setup();
  await assert.rejects(f.service.update('c', 'problem', { status: 'RESOLVIDO' }), { code: 'problemStatusForbidden' });
  await assert.rejects(f.service.update('a', 'problem', { status: 'FORGED' }), { code: 'problemStatusInvalid' });
  await Promise.all(Array.from({ length: 5 }, () => f.service.update('a', 'problem', { status: 'RESOLVIDO' })));
  assert.equal(f.state.statusHistory.length, 1);
  assert.equal(f.state.logs.length, 1);
  assert.equal(f.state.statusDeliveries.length, 1);
  assert.equal(f.state.notifications.length, 1);
  assert.equal(f.state.notifications[0].usuarioId, 'b');
  await f.service.deliverBatch();
  assert.equal(f.state.notifications.length, 2);
  assert.equal(f.state.notifications.find(row => row.usuarioId === 'c').tipo, 'ACOMPANHAMENTO');
  assert.equal(f.state.statusDeliveries.length, 0);
  await f.service.deliverBatch();
  assert.equal(f.state.notifications.length, 2);
});

test('failure rolls back status and outbox; delivery retries honor preferences and revoked privacy', async () => {
  const f = setup();
  const original = f.db.entregaAtualizacao.create;
  f.db.entregaAtualizacao.create = async () => { throw new Error('isolated write failure'); };
  await assert.rejects(f.service.update('a', 'problem', { status: 'EM_ANDAMENTO' }));
  assert.equal(f.state.problems[0].status, 'ABERTO');
  assert.equal(f.state.logs.length, 0);
  assert.equal(f.state.statusHistory.length, 0);
  assert.equal(f.state.notifications.length, 0);
  f.db.entregaAtualizacao.create = original;
  await f.service.update('a', 'problem', { status: 'EM_ANDAMENTO' });
  f.user('b').perfilPrivado = true;
  await f.service.deliverBatch();
  assert.equal(f.state.notifications.some(row => row.usuarioId === 'c'), false);
  f.user('b').perfilPrivado = false;
  await f.service.update('a', 'problem', { status: 'RESOLVIDO' });
  const notify = f.db.notificacao.upsert;
  f.db.notificacao.upsert = async () => { throw new Error('isolated notification failure'); };
  await assert.rejects(f.service.deliverBatch());
  assert.equal(f.state.statusDeliveries.length, 1);
  f.db.notificacao.upsert = notify;
  f.state.notificationPreferences.push({ usuarioId: 'c', tipo: 'ACOMPANHAMENTO', ativa: false });
  await f.service.deliverBatch();
  assert.equal(f.state.statusDeliveries.length, 0);
  assert.equal(f.state.notifications.some(row => row.usuarioId === 'c'), false);
});

test('the existing administrative URL rejects common accounts and uses the transactional service', async () => {
  const f = await createSocialFixture();
  try {
    const update = actor => request(f.app).put('/api/admin/problems/public-post').set('Authorization', 'Bearer test-' + actor);
    await update('c').send({ status: 'RESOLVIDO' }).expect(403);
    f.user('c').admin = { nivel: 'ADMIN' };
    await update('c').send({ status: 'FORGED' }).expect(400);
    await update('c').send({ status: 'RESOLVIDO' }).expect(200);
    assert.equal(f.state.statusHistory.length, 1);
    assert.equal(f.state.logs.length, 1);
    assert.equal(f.state.statusDeliveries.length, 1);
    f.user('c').admin = null;
    await update('c').send({ status: 'ABERTO' }).expect(403);
    assert.equal(f.state.problems.find(row => row.id === 'public-post').status, 'RESOLVIDO');
  } finally { await f.close(); }
});

test('durable delivery uses bounded batches and resumes after a failed batch without duplicate notifications', async () => {
  const f = setup();
  for (let index = 0; index < 105; index++) {
    const id = 'viewer-' + String(index).padStart(3, '0');
    f.state.users.push({ id, perfilPrivado: false, admin: null });
    f.state.saved.push({ id: 'saved-' + id, usuarioId: id, problemaId: 'problem', acompanhando: true });
  }
  await f.service.update('a', 'problem', { status: 'RESOLVIDO' });
  await f.service.deliverBatch();
  assert.equal(f.state.statusDeliveries.length, 1);
  const firstCursor = f.state.statusDeliveries[0].cursorUsuarioId;
  const firstCount = f.state.notifications.length;
  const write = f.db.notificacao.upsert;
  f.db.notificacao.upsert = async () => { throw new Error('isolated outage'); };
  await assert.rejects(f.service.deliverBatch());
  assert.equal(f.state.statusDeliveries[0].cursorUsuarioId, firstCursor);
  assert.equal(f.state.notifications.length, firstCount);
  f.db.notificacao.upsert = write;
  while (f.state.statusDeliveries.length) await f.service.deliverBatch();
  assert.equal(f.state.notifications.length, 107);
  assert.equal(new Set(f.state.notifications.map(row => row.usuarioId)).size, 107);
});
