const test = require('node:test');
const assert = require('node:assert/strict');
test('marker HTML accepts only hex colors and cannot interpolate CSS or HTML', async () => {
  const { safeMapColor } = await import('../src/utils/mapColor.js');
  assert.equal(safeMapColor('#aBc'), '#aBc');
  assert.equal(safeMapColor('#7C3AED'), '#7C3AED');
  for (const value of ['red', '" onmouseover="alert(1)', '#fff;display:none', '#12345', null, {}, '#fff</span>']) assert.equal(safeMapColor(value), '#7C3AED');
});
