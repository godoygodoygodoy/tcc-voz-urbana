import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';

async function load(relative, dependencies, globals = {}) {
  const url = new URL('../src/' + relative, import.meta.url);
  const context = vm.createContext({ console, ...globals });
  const module = new vm.SourceTextModule(fs.readFileSync(url, 'utf8'), { context });
  await module.link(name => {
    assert.ok(name in dependencies, 'Unexpected dependency ' + name);
    const values = dependencies[name];
    return new vm.SyntheticModule(Object.keys(values), function () {
      for (const [key, value] of Object.entries(values)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate(); return module.namespace;
}

test('production adapter uses the verified text protocol without changing the database destination or TLS', async () => {
  let connection, options;
  await load('config/prisma.js', {
    'dotenv/config': {}, 'node:fs': { default: fs },
    './testDatabaseSafety.js': { prepareTestDatabase: () => assert.fail('Production is not a test database') },
    '@prisma/adapter-mariadb': { PrismaMariaDb: class { constructor(config, settings) { connection = config; options = settings; } } },
    '@prisma/client': { PrismaClient: class {} },
  }, { URL, process: { env: { NODE_ENV: 'production', DATABASE_URL: 'mysql://service:encoded%21@configured-host:3307/configured_database?sslaccept=strict' } } });
  assert.equal(options.useTextProtocol, true);
  assert.equal(connection.host, 'configured-host'); assert.equal(connection.port, 3307);
  assert.equal(connection.database, 'configured_database');
  assert.equal(connection.password, 'encoded!');
  assert.equal(connection.ssl.rejectUnauthorized, true);
  assert.equal(connection.connectionLimit, 5);
});

test('the real authentication middleware distinguishes missing/invalid tokens, valid users and database admin permissions', async () => {
  const secret = 'isolated-auth-test-secret-never-production';
  const account = { id: 'test-user', nivel: 'USUARIO', admin: null };
  const db = { usuario: { findUnique: async ({ where }) => where.id === account.id ? account : null }, admin: { findUnique: async () => account.admin } };
  const auth = await load('middlewares/auth.js', { jsonwebtoken: { default: jwt }, '../config/prisma.js': { prisma: db } }, { process: { env: { JWT_SECRET: secret } } });
  const app = express();
  app.get('/me', auth.authMiddleware, (req, res) => res.json({ id: req.userId, isAdmin: req.isAdmin }));
  app.get('/admin', auth.authMiddleware, auth.adminMiddleware, (req, res) => res.json({ allowed: true }));
  await request(app).get('/me').expect(401);
  await request(app).get('/me').set('Authorization', 'Bearer invalid').expect(401);
  const expired = jwt.sign({ id: account.id }, secret, { expiresIn: -10 });
  await request(app).get('/me').set('Authorization', 'Bearer ' + expired).expect(401);
  const token = jwt.sign({ id: account.id, role: 'admin' }, secret, { expiresIn: 60 });
  const valid = await request(app).get('/me').set('Authorization', 'Bearer ' + token).expect(200);
  assert.equal(valid.body.isAdmin, false);
  await request(app).get('/admin').set('Authorization', 'Bearer ' + token).expect(403);
  account.admin = { nivel: 'ADMIN' };
  await request(app).get('/admin').set('Authorization', 'Bearer ' + token).expect(200);
});

test('all relative backend imports resolve, including the production entry point', () => {
  const root = new URL('../src/', import.meta.url);
  const inspect = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (file.endsWith('.js')) {
        const source = fs.readFileSync(file, 'utf8');
        for (const match of source.matchAll(/(?:from\s*|import\s*\(?\s*)['"](\.[^'"]+)['"]/g)) {
          assert.equal(fs.existsSync(path.resolve(path.dirname(file), match[1])), true, file + ' imports missing ' + match[1]);
        }
      }
    }
  };
  inspect(fs.realpathSync(root));
  const server = fs.readFileSync(new URL('server.js', root), 'utf8');
  assert.match(server, /process\.env\.PORT\s*\|\|\s*5000/);
  assert.match(server, /app\.listen\(PORT,\s*"0\.0\.0\.0"/);
  assert.doesNotMatch(server, /http:\/\/localhost:\$\{PORT\}/);
});
