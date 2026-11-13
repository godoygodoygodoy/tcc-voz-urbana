const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const axios = require('axios');

async function loadApi(env, token) {
  const values = new Map(token ? [['token', token]] : []);
  const context = vm.createContext({ localStorage: { getItem: key => values.get(key), removeItem: key => values.delete(key) }, window: { location: { href: '' } }, URLSearchParams });
  const source = fs.readFileSync(require('node:path').join(__dirname, '../src/services/api.js'), 'utf8');
  const module = new vm.SourceTextModule(source, { context, initializeImportMeta: meta => { meta.env = env; } });
  await module.link(name => {
    const value = name === 'axios' ? { default: axios } : name === '../i18n' ? { translateApiError: text => text } : assert.fail('Unexpected import ' + name);
    return new vm.SyntheticModule(Object.keys(value), function () { for (const [key, item] of Object.entries(value)) this.setExport(key, item); }, { context });
  });
  await module.evaluate(); return module.namespace;
}

test('production requests use the configured Render origin and attach the stored bearer token', async () => {
  const { default: api, mediaUrl } = await loadApi({ VITE_API_URL: 'https://voz-urbana-api.onrender.com/api/', DEV: false, BASE_URL: '/tecti/2026/gpec03/' }, 'isolated-test-token');
  api.defaults.adapter = async config => {
    assert.equal(api.getUri(config), 'https://voz-urbana-api.onrender.com/api/users/me');
    assert.equal(config.headers.Authorization, 'Bearer isolated-test-token');
    return { data: {}, status: 200, headers: {}, config };
  };
  await api.get('/users/me');
  assert.equal(mediaUrl('/uploads/avatars/example.png'), 'https://voz-urbana-api.onrender.com/uploads/avatars/example.png');
});

test('local development retains localhost and guests do not send a fabricated token', async () => {
  const { default: api } = await loadApi({ DEV: true, BASE_URL: '/' });
  api.defaults.adapter = async config => {
    assert.equal(api.getUri(config), 'http://localhost:5000/api/social/users/search');
    assert.equal(config.headers.Authorization, undefined);
    return { data: { data: [] }, status: 200, headers: {}, config };
  };
  await api.get('/social/users/search');
});
