/* Prints the phase-2 governance findings for the checked-in ledger, item by
 * item, then a one-line summary. Run with `npm run governance`. The report is
 * the deliverable: nothing here edits the ledger. */
import fs from "node:fs";
import path from "node:path";
import { createEngine } from "../src/engine/engine";
import { parseItemFile, parseVolumeFile } from "../src/engine/yaml";
import type { Item } from "../src/engine/types";

function volumeArg(): string | null {
  const i = process.argv.indexOf("--volume");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  const env = process.env.CODEX_VOLUME;
  return env && env.length ? env : null;
}

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "codex.json"), "utf8"));
const wanted = volumeArg();
const entry = wanted
  ? manifest.volumes.find((v: { id: string }) => v.id === wanted)
  : manifest.volumes[0];
if (!entry) throw new Error(`no volume ${wanted} in codex.json`);

const items: Item[] = [];
for (const ch of entry.chapters) {
  for (const f of ch.files) {
    items.push(parseItemFile(fs.readFileSync(path.join(root, entry.path, ch.dir, f), "utf8")));
  }
}
const meta = parseVolumeFile(
  fs.readFileSync(path.join(root, entry.path, "volume.yaml"), "utf8"),
);
const engine = createEngine(items, meta);

let errors = 0;
let warnings = 0;
const byRule = new Map<string, number>();

for (const it of items) {
  const findings = engine.governance(it);
  if (!findings.length) continue;
  console.log(`${it.id} ${it.identifier}`);
  for (const f of findings) {
    if (f.level === "error") errors++;
    else warnings++;
    byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
    console.log(`  ${f.level === "error" ? "error" : "warn "} ${f.rule}: ${f.msg}`);
  }
}

console.log("");
for (const [rule, n] of [...byRule].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
  console.log(`${rule}: ${n}`);
}
console.log(`errors ${errors}, warnings ${warnings}`);
