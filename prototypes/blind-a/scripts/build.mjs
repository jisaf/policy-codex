// Bundles src/main.ts (and the codex engine it imports from src/engine) into
// dist/app.js with the esbuild already installed for the repository's vite.
//   node prototypes/blind-a/scripts/build.mjs [--watch]
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const proto = path.resolve(here, "..");
const opts = {
  entryPoints: [path.join(proto, "src/main.ts")],
  bundle: true,
  format: "esm",
  target: "es2020",
  outfile: path.join(proto, "dist/app.js"),
  sourcemap: true,
  logLevel: "info",
};
if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
} else {
  await esbuild.build(opts);
}
