import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (command === 'build') {
    let api;
    try { api = new URL(env.VITE_API_URL); } catch { /* Validado abaixo. */ }
    if (!api || api.protocol !== 'https:' || api.username || api.password ||
        api.pathname.replace(/\/$/, '') !== '/api' || api.search || api.hash ||
        ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)) {
      throw new Error('Configure VITE_API_URL com a URL HTTPS pública da API, incluindo /api.');
    }
  }
  return {
    plugins: [
      {
        name: 'jsx-in-existing-js-files',
        async transform(code, id) {
          if (/\/src\/.*\.js$/.test(id.replaceAll('\\', '/'))) {
            return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
          }
        },
      },
      react(),
    ],
    optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
    server: { port: 3000, strictPort: true },
  };
});
