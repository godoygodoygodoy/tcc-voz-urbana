import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';

test('profile upload remains readable after reloading the saved profile with a custom UPLOAD_DIR', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'voz-avatar-'));
  process.env.UPLOAD_DIR = directory;
  const { prisma } = await import('../src/config/prisma.js');
  const { default: users } = await import('../src/routes/users.js');
  const { uploadedMedia } = await import('../src/config/media.js');
  let profile = { id: 1, nome: 'Test', nivel: 'USUARIO', admin: null, fotoPerfil: null };
  const originalUpdate = prisma.usuario.update;
  const originalFind = prisma.usuario.findUnique;
  prisma.usuario.update = async ({ data }) => (profile = { ...profile, ...data });
  prisma.usuario.findUnique = async () => ({ ...profile });
  try {
    const app = express();
    app.use(express.json());
    app.use('/uploads', uploadedMedia);
    app.use('/api/users', (req, res, next) => { req.userId = 1; next(); }, users);
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    const saved = await request(app).put('/api/users/me').attach('avatarFile', bytes, {filename: 'avatar.png', contentType: 'image/png'}).expect(200);
    assert.match(saved.body.avatar, /^\/uploads\/profiles\/.+\.png$/);
    const reloaded = await request(app).get('/api/users/me').expect(200);
    assert.equal(reloaded.body.avatar, saved.body.avatar);
    const image = await request(app).get(reloaded.body.avatar).set('Origin', 'https://frontend.example').expect(200).expect('Content-Type', /image\/png/);
    assert.equal(image.headers['cross-origin-resource-policy'], 'cross-origin');
    assert.deepEqual(image.body, bytes);
  } finally {
    prisma.usuario.update = originalUpdate;
    prisma.usuario.findUnique = originalFind;
    await prisma.$disconnect();
    await rm(directory, {recursive: true, force: true});
  }
});
