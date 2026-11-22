import { defineConfig } from "vite";

// Self-contained: root is this folder; the only code read from outside it is
// the repository's engine (src/engine), imported by src/store.ts.
export default defineConfig({
  root: import.meta.dirname,
  base: "./",
  esbuild: { jsx: "automatic", jsxImportSource: "preact" },
  server: { fs: { allow: ["../.."] } },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
