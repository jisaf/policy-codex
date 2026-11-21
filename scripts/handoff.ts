/* Writes handoff/<volume>.md from the checked-in ledger, for every volume in
 * codex.json (or the volumes named with --volume / CODEX_VOLUME). Run with
 * `npm run handoff`. */
import fs from "node:fs";
import path from "node:path";
import { handoffMarkdown } from "../src/export/handoff";
import { loadVolume, selectedVolumeIds } from "../src/tools/volumes";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "handoff");
fs.mkdirSync(outDir, { recursive: true });

for (const volume of selectedVolumeIds(root)) {
  const { vol, engine } = loadVolume(root, volume);
  const out = path.join(outDir, `${volume}.md`);
  fs.writeFileSync(out, handoffMarkdown(engine, vol));
  console.log(`wrote ${path.relative(root, out)} for ${vol.items.length} items`);
}
