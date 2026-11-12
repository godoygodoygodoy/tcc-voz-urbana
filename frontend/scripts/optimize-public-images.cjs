// Offline build helper. Originals remain available; no runtime image library is added.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const root = path.resolve(__dirname, '../public');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    const jobs = [
      ['branding/mascote-voz-urbana.png', 256, 'webp'],
      ['branding/voz-urbana-texto.png', 512, 'webp'],
      ['branding/mascote-voz-urbana.png', 180, 'png', 'branding/apple-touch-icon.png'],
      ...fs.readdirSync(path.join(root, 'feed-actions')).filter(name => name.endsWith('.png')).map(name => ['feed-actions/' + name, 96, 'webp']),
    ];
    for (const [name, maximum, format, destination] of jobs) {
      const data = fs.readFileSync(path.join(root, name));
      const encoded = await page.evaluate(async ({ data, maximum, format }) => {
        const image = new Image(); image.src = data; await image.decode();
        const ratio = Math.min(1, maximum / image.width), canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * ratio); canvas.height = Math.round(image.height * ratio);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/' + format, .95).split(',')[1];
      }, { data: 'data:image/png;base64,' + data.toString('base64'), maximum, format });
      const output = path.join(root, destination || name.replace(/\.png$/, '.' + format));
      fs.writeFileSync(output, Buffer.from(encoded, 'base64'));
      console.log(path.relative(root, output) + ': ' + data.length + ' → ' + fs.statSync(output).size + ' bytes');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
