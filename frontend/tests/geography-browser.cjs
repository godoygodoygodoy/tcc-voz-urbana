const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.GEOGRAPHY_TEST_URL || 'http://127.0.0.1:4173/tecti/2026/gpec03';
(async () => {
  const { createSocialFixture } = await import('../../backend/tests/helpers/socialFixture.js');
  const f = await createSocialFixture();
  for (let index = 0; index < 110; index++) f.state.problems.push({ id: 'map-' + index, usuarioId: 'a', titulo: 'Mapped issue ' + index,
    descricao: 'Test publication', cidade: 'Campinas', estado: 'SP', bairro: 'Centro', categoriaId: 'cat', latitude: -22.9, longitude: -47.06,
    status: 'ABERTO', dataCriacao: new Date(), imagens: [] });
  f.state.problems.push({ id: 'hidden-map', usuarioId: 'b', titulo: 'Private map issue', cidade: 'Campinas', estado: 'SP', bairro: 'Centro',
    categoriaId: 'cat', latitude: -22.9, longitude: -47.06, status: 'ABERTO', dataCriacao: new Date(), imagens: [] });
  const server = f.app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const errors = [], requests = []; let checks = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { localStorage.setItem('token', 'test-a'); localStorage.setItem('language', 'en'); localStorage.setItem('user', JSON.stringify({ id: 'a', name: 'Person a', username: 'person.a', role: 'usuario' })); });
    await page.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url()); requests.push(url.pathname + url.search);
      const response = await route.fetch({ url: 'http://127.0.0.1:' + server.address().port + url.pathname + url.search, headers: { ...route.request().headers(), authorization: 'Bearer test-a' } });
      await route.fulfill({ response });
    });
    console.log('Map filters'); await page.goto(base + '/map');
    await page.getByLabel('City', { exact: true }).fill('Campinas');
    await page.getByLabel('State', { exact: true }).fill('SP');
    await page.getByLabel('Neighborhood', { exact: true }).fill('Centro');
    await page.waitForFunction(() => document.querySelectorAll('.urban-marker').length === 100);
    checks++;
    console.log('Heatmap toggle'); await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
    await page.getByText('110 geolocated records in this area. Overlapping points indicate higher concentration.', { exact: true }).waitFor();
    assert.equal(await page.locator('canvas.urban-heatmap').count(), 1);
    assert.ok(requests.some(url => url.includes('/geography/heatmap?') && url.includes('city=Campinas') && url.includes('state=SP') && url.includes('neighborhood=Centro')));
    checks++;
    const before = requests.filter(url => url.includes('/geography/heatmap?')).length;
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByText('Page 2', { exact: true }).waitFor();
    assert.equal(requests.filter(url => url.includes('/geography/heatmap?')).length, before);
    checks++;
    console.log('Regional insights'); await page.getByRole('button', { name: 'Regional insights', exact: true }).click();
    await page.getByText(/110 records in the period/).waitFor();
    assert.equal(await page.locator('#geo-insights-title').count(), 1);
    assert.equal(await page.locator('tbody tr').count(), 1);
    checks++;
    await page.getByLabel('City', { exact: true }).fill('Santos');
    await page.getByText('0 geolocated records in this area. Overlapping points indicate higher concentration.', { exact: true }).waitFor();
    await page.getByText(/0 records in the period/).waitFor();
    checks++;
    console.log('Heatmap toggle'); await page.getByRole('button', { name: 'Heatmap', exact: true }).click();
    assert.equal(await page.locator('canvas.urban-heatmap').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []); checks++;
    console.log(JSON.stringify({ checks, browserErrors: errors, database: 'isolated memory' }));
  } finally {
    await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await f.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
