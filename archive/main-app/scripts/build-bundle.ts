/* `npm run build:bundle`: a self-contained static preview of the app, for a
 * host with no server and no GitHub (a claude.ai Artifact, any static file
 * host served from a sub-path). Writes `.artifacts/app/`:
 *
 *   index.html, assets/**     the app, built with VITE_LEDGER_SOURCE=bundled
 *   ledger/index.json         which chunk holds each ledger file, and the
 *                             commit the snapshot was taken from
 *   ledger/<group>-<n>.json   the files themselves: codex.json, every volume
 *                             in it, docs/**, conformance results if present
 *
 * Each chunk stays under CHUNK_BYTES so no file passes a host's per-file
 * limit; a volume's documents/ get chunks of their own so they are fetched
 * only when a page opens one (src/ledger/bundled.ts).
 *
 * Options: --out <dir> (default .artifacts/app); --branch <name>, the branch
 * the header names (default: the checked-out branch). */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "vite";
import { chunkFiles, type BundleIndex } from "../src/ledger/bundled";

const root = path.resolve(import.meta.dirname, "..");
const outArg = process.argv.indexOf("--out");
const out = path.resolve(root, outArg > 0 ? process.argv[outArg + 1] : ".artifacts/app");
const branchArg = process.argv.indexOf("--branch");
const CHUNK_BYTES = 8 * 1024 * 1024;
const TEXT = /\.(json|ya?ml|md|txt|csv)$/i;

function walk(rel: string): string[] {
  const abs = path.join(root, rel);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [rel];
  return readdirSync(abs).flatMap((n) => walk(`${rel}/${n}`));
}

function git(args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

const manifest = JSON.parse(readFileSync(path.join(root, "codex.json"), "utf8")) as {
  volumes: Array<{ id: string; path: string }>;
};
const paths = [
  "codex.json",
  ...manifest.volumes.flatMap((v) => walk(v.path)),
  ...walk("docs"),
  ...walk("conformance").filter((p) => /results\.json$/.test(p)),
].filter((p) => TEXT.test(p));
const files = paths.map((p) => ({ path: p, text: readFileSync(path.join(root, p), "utf8") }));

const groupOf = (p: string): string => {
  const v = manifest.volumes.find((x) => p.startsWith(x.path + "/"));
  if (v) return p.startsWith(`${v.path}/documents/`) ? `${v.id}-documents` : v.id;
  return p.split("/")[0].replace(/\.json$/, "");
};
const { chunks, index } = chunkFiles(files, CHUNK_BYTES, groupOf);

const branch = branchArg > 0 ? process.argv[branchArg + 1] : git(["rev-parse", "--abbrev-ref", "HEAD"]);
const bundle: BundleIndex = {
  info: {
    head: git(["rev-parse", "HEAD"]),
    branch: branch && branch !== "HEAD" ? branch : null,
    dirty: Boolean(git(["status", "--porcelain", "--", "codex.json", "volumes"])),
    built: new Date().toISOString(),
  },
  files: index,
};

rmSync(out, { recursive: true, force: true });
process.env.VITE_LEDGER_SOURCE = "bundled";
process.env.CODEX_LOCAL_LEDGER = "0";
await build({
  root, configFile: path.join(root, "vite.config.ts"), base: "./", logLevel: "warn",
  build: { outDir: out, emptyOutDir: true },
});

const ledgerDir = path.join(out, "ledger");
mkdirSync(ledgerDir, { recursive: true });
writeFileSync(path.join(ledgerDir, "index.json"), JSON.stringify(bundle));
for (const c of chunks) writeFileSync(path.join(ledgerDir, c.name), JSON.stringify(c.files));

const all = walk(path.relative(root, out));
const total = all.reduce((n, p) => n + statSync(path.join(root, p)).size, 0);
const biggest = Math.max(...all.map((p) => statSync(path.join(root, p)).size));
console.log(
  `${path.relative(root, out)}: ${all.length} files, ${(total / 1e6).toFixed(1)} MB ` +
    `(largest ${(biggest / 1e6).toFixed(1)} MB); ledger: ${files.length} files in ${chunks.length} chunks`,
);
