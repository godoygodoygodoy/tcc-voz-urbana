const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
// Fresh versioned folder: never mirror/delete a deployed site or package its env/data.
const destination = path.join(root, 'release-upload', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(destination, {recursive:true});
if (!fs.existsSync(path.join(root, 'frontend/dist/index.html'))) throw new Error('Build frontend/dist first.');
fs.cpSync(path.join(root, 'frontend/dist'), path.join(destination, 'frontend'), {recursive:true});
for(const entry of ['src', 'scripts', 'prisma', 'package.json', 'package-lock.json', 'prisma.config.ts']) {
  fs.cpSync(path.join(root, 'backend', entry), path.join(destination, 'backend', entry), {
    recursive:true,
    filter: source => !/(^|[\\/])(\.env(?:\..*)?|uploads|backups|node_modules|tests)([\\/]|$)/i.test(source) && !/\.(db|sqlite|log|partial)$/i.test(source),
  });
}
console.log('FileZilla upload package:', destination);
console.log('Upload only frontend/ for a frontend change. Never delete/synchronize remote persistent directories.');
