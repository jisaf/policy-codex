/* Smoke test: the bundle loads into the engine and every stored household runs.
 *   npx vite-node prototypes/blind-a/scripts/smoke.ts */
import fs from "node:fs";
import { createEngine } from "../../../src/engine/engine";

const b = JSON.parse(fs.readFileSync(new URL("../public/data/codex.json", import.meta.url), "utf8"));
let t = Date.now();
const e = createEngine(b.items, b.meta);
console.log("engine", Date.now() - t, "ms");
t = Date.now();
let tot = 0, fail = 0;
for (const c of b.cases) { const r = e.runCase(c); tot += r.results.length; fail += r.failed; }
console.log("cases", Date.now() - t, "ms", tot, "results", fail, "failed");
t = Date.now();
const ex = e.explainCase(b.cases[0]);
console.log("explain CO-01", Date.now() - t, "ms", ex.length);
console.log(JSON.stringify(b.personNotes).slice(0, 600));
console.log(e.approvals(e.item("ma_magi_category")!));
console.log(e.approvals(e.item("date_of_birth")!));

// The change editor shows a rule as pattern English and parses it back: how
// many rules survive that round trip unchanged?
let same = 0, differ = 0, fails = 0;
const failed: string[] = [];
for (const it of b.items) {
  if (it.kind !== "derived" || it.derived === undefined) continue;
  try {
    const back = e.parseDerivation(e.block(it.derived).join("\n"), it.options);
    if (JSON.stringify(back) === JSON.stringify(it.derived)) same++; else { differ++; failed.push(it.id); }
  } catch { fails++; failed.push(it.id); }
}
console.log("rule round trip: same", same, "differ", differ, "fail", fails, failed.slice(0, 10));
