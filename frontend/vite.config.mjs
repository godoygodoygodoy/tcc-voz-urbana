import { defineConfig, loadEnv, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { API_CONTRACT } from '../backend/src/config/release.js';

const deploymentTarget = JSON.parse(readFileSync(new URL('./deployment-target.json', import.meta.url), 'utf8'));
const buildIdentity=()=>{try{return {revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(),dirty:Boolean(execFileSync('git',['status','--porcelain'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim())};}catch{return {revision:null,dirty:null};}};

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  if (command === "build") {
    const rawApiUrl = env.VITE_API_URL;
    if (!rawApiUrl) {
      throw new Error("Configure VITE_API_URL com a URL do backend antes do build.");
    }

    let api;
    try {
      api = new URL(rawApiUrl);
    } catch {
      throw new Error("Configure VITE_API_URL com uma URL válida do backend.");
    }

    const isLocalNetwork = ["localhost", "127.0.0.1", "[::1]"].includes(api.hostname);
    const validProtocol = isLocalNetwork ? ["http:", "https:"].includes(api.protocol) : api.protocol === "https:";
    const validPath = ["", "/api"].includes(api.pathname.replace(/\/+$/, ""));
    if (mode === 'production' && api.origin !== deploymentTarget.apiOrigin) {
      throw new Error('A API do build difere de deployment-target.json. Revise o destino antes de publicar: trocar a API pode mostrar outro banco de dados.');
    }

    if (
      !validProtocol ||
      api.username ||
      api.password ||
      !validPath ||
      api.search ||
      api.hash
    ) {
      throw new Error(
        isLocalNetwork
          ? "Configure VITE_API_URL com a URL do backend local (ex.: http://localhost:5000 ou https://seu-backend.onrender.com)."
          : "Configure VITE_API_URL com a URL HTTPS pública do backend (ex.: https://seu-backend.onrender.com)."
      );
    }
  }
  return {
    plugins: [
      {
        name: 'public-deployment-manifest',
        apply: 'build',
        generateBundle() {
          this.emitFile({type:'asset', fileName:'deployment.json', source:JSON.stringify({apiOrigin:new URL(env.VITE_API_URL).origin, basePath:'/tecti/2026/gpec03/', builtAt:new Date().toISOString(),apiContract:API_CONTRACT,...buildIdentity()}, null, 2)});
        },
      },
      {
        name: "jsx-in-existing-js-files",
        async transform(code, id) {
          if (/\/src\/.*\.js$/.test(id.replaceAll("\\", "/"))) {
            return transformWithEsbuild(code, id, {
              loader: "jsx",
              jsx: "automatic"
            });
          }
        }
      },
      react()
    ],
    optimizeDeps: { esbuildOptions: { loader: { ".js": "jsx" } } },
    server: { port: 3000, strictPort: true },
    base: "/tecti/2026/gpec03/"
  };
});
