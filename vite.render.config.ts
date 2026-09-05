import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

// Standalone static entry for Render, Netlify, Cloudflare Pages, or any CDN.
// The Sites/Worker entry in vite.config.ts remains available independently.
export default defineConfig({
  plugins: [react(), {
    name: "third-party-notices",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "THIRD_PARTY_NOTICES.txt", source: readFileSync(new URL("./THIRD_PARTY_NOTICES.md", import.meta.url), "utf8") });
    },
  }],
  build: { outDir: "render-dist", emptyOutDir: true },
  server: {
    host: "127.0.0.1", port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:10000", changeOrigin: false } },
  },
});
