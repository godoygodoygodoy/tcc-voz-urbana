import { defineConfig, loadEnv, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";

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
