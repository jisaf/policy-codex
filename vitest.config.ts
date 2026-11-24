import { defineConfig } from "vitest/config";

// Unit tests only. The Colorado Rulebook's own build config is
// prototypes/blind-b/vite.config.ts; archive/ is never compiled or tested.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "archive/**"],
  },
});
