// Copies the built prototype (after `npm run build`) into a self-contained
// static folder, every path relative, for a host served from a sub-path:
// index.html, src/style.css, dist/app.js and public/data/*.json.
//   node prototypes/blind-a/scripts/artifact.mjs [outDir]   (default: <repo>/.artifacts/blind-a)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const proto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] ?? path.join(proto, "../../.artifacts/blind-a"));
fs.rmSync(out, { recursive: true, force: true });
const copy = (rel) => {
  fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
  fs.copyFileSync(path.join(proto, rel), path.join(out, rel));
};
// A claude.ai Artifact page may load a stylesheet only inline (or from Google
// Fonts), so the published index.html carries style.css in a <style> element;
// src/style.css is still copied for other static hosts.
const css = fs.readFileSync(path.join(proto, "src/style.css"), "utf8");
const html = fs
  .readFileSync(path.join(proto, "index.html"), "utf8")
  .replace(/\s*<link rel="stylesheet" href="src\/style\.css">/, `\n  <style>\n${css}\n  </style>`);
if (!html.includes("<style>")) throw new Error("index.html: the stylesheet link was not found to inline");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "index.html"), html);
copy("src/style.css");
copy("dist/app.js");
for (const f of fs.readdirSync(path.join(proto, "public/data"))) {
  if (f.endsWith(".json")) copy(`public/data/${f}`);
}
console.log(`${path.relative(process.cwd(), out)}: ${fs.readdirSync(path.join(out, "public/data")).length + 3} files`);
