import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api est relayé vers le backend : même origine pour le navigateur → cookie de session SameSite=Strict.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: false } },
  },
  preview: {
    port: 4173,
    proxy: { "/api": { target: "http://127.0.0.1:3000", changeOrigin: false } },
  },
  build: { sourcemap: false, chunkSizeWarningLimit: 600 },
});
