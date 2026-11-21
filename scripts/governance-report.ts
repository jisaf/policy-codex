/* Prints the phase-2 governance findings for the checked-in ledger, item by
 * item, then a one-line summary, for every volume in codex.json (or the
 * volumes named with --volume / CODEX_VOLUME). Run with `npm run governance`.
 * The report is the deliverable: nothing here edits the ledger, and it exits
 * 0 whatever it finds (`npm run check` is the gate). */
import path from "node:path";
import { loadVolume, selectedVolumeIds } from "../src/tools/volumes";

const root = path.resolve(import.meta.dirname, "..");
const volumes = selectedVolumeIds(root);
let totalErrors = 0;

for (const volume of volumes) {
  const { vol, engine } = loadVolume(root, volume);
  if (volumes.length > 1) console.log(`== volume ${volume}`);
  let errors = 0;
  let warnings = 0;
  const byRule = new Map<string, number>();

  for (const it of vol.items) {
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
  console.log(`${volumes.length > 1 ? volume + ": " : ""}errors ${errors}, warnings ${warnings}`);
  totalErrors += errors;
}

if (volumes.length > 1) console.log(`all volumes: errors ${totalErrors}`);
