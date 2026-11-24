/* Writes conformance/<volume>/ledger.json, the machine-readable handoff (every
 * item as the codex parses it, with derivation trees, parameter versions and
 * dependency edges), for every volume in codex.json (or the volumes named
 * with --volume / CODEX_VOLUME). Run with `npm run export`. */
import fs from "node:fs";
import path from "node:path";
import { buildLedgerJson } from "../src/export/ledger-json";
import { conformanceDir, loadVolume, selectedVolumeIds } from "../src/tools/volumes";
import { gitShaWithDirtySuffix } from "./git-sha";

const root = path.resolve(import.meta.dirname, "..");
const sha = gitShaWithDirtySuffix(root);

for (const volume of selectedVolumeIds(root)) {
  const { vol, engine } = loadVolume(root, volume);
  const dir = conformanceDir(root, volume);
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "ledger.json");
  fs.writeFileSync(out, JSON.stringify(buildLedgerJson(engine, vol, sha), null, 2));
  console.log(`wrote ${path.relative(root, out)}: ${vol.items.length} items, codex@${sha}`);
}
