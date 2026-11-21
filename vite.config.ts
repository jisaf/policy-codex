import { defineConfig, type Plugin } from "vitest/config";
import preact from "@preact/preset-vite";
import { localLedger } from "./scripts/vite-local-ledger";

export default defineConfig({
  base: "./",
  // The working tree's codex.json and volumes/ under /__ledger/, in dev and
  // preview, so the app can read a local or unpushed ledger (README, "Running
  // against the local tree").
  plugins: [preact() as unknown as Plugin, localLedger() as unknown as Plugin],
  build: { outDir: "dist", emptyOutDir: true },
  test: {
    environment: "node",
    environmentMatchGlobs: [["test/ui/**", "jsdom"]],
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
