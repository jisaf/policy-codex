import { defineConfig, type Plugin } from "vitest/config";
import preact from "@preact/preset-vite";

export default defineConfig({
  base: "./",
  plugins: [preact() as unknown as Plugin],
  build: { outDir: "dist", emptyOutDir: true },
  test: {
    environment: "node",
    environmentMatchGlobs: [["test/ui/**", "jsdom"]],
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
