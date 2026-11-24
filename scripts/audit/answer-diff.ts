/* The answers a change moves: evaluates the MAGI and CHP+ outcomes (and any
 * identifiers named with --id) on the ledger at a base ref and on the ledger
 * on disk, for the same households (the stored households as stored, and the
 * receipts harness's generated households, translated to records as the
 * harnesses translate them), and lists every value that differs. Unlike the
 * harnesses it compares one ledger with another on identical households, so
 * every difference is the change's.
 *   npx vite-node scripts/audit/answer-diff.ts -- --base origin/ccr-9d19bf4c-wmnwcl [--id x]... [--out file]
 */
import fs from "node:fs";
import { ledgerAt, currentLedger, type Ledger } from "../receipts/ledgers";
import { generated } from "../receipts/generate";
import { translateCase } from "../receipts/translate";
import { translateCase as translateEarnings } from "../records/translate-earnings";
import { translateCase as translateHoldings } from "../records/translate-holdings";
import { CHOICES } from "../receipts/choices";
import { makeCase, evaluate } from "../../src/engine/evaluate";
import { caseToSpec, type HouseholdCase } from "../../src/engine/cases";

const argv = process.argv.slice(2).filter((a) => a !== "--");
const arg = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const base = arg("--base") ?? "origin/ccr-9d19bf4c-wmnwcl";
const outFile = arg("--out");
const extra = argv.flatMap((a, i) => (argv[i - 1] === "--id" ? [a] : []));
const IDS = ["ma_magi_eligibility_status", "ma_magi_category", "ma_family_planning_status", "ma_express_lane_status",
  "ma_needy_young_person_category", "chp_eligibility_status", "chp_express_lane_status", "ma_magi_household_size",
  "ma_magi_household_income_pct_fpl", ...extra];

const oldL = ledgerAt(base);
const newL = currentLedger();

function monthsOf(c: HouseholdCase): string[] {
  const det = c.as_of.slice(0, 7);
  const [y, m] = det.split("-").map(Number);
  const ms: string[] = [];
  for (let k = -3; k <= 1; k++) {
    const d = new Date(Date.UTC(y, m - 1 + k, 1));
    ms.push(d.toISOString().slice(0, 7));
  }
  for (const ex of Object.values(c.expect ?? {})) for (const v of Object.values(ex)) {
    if (v && typeof v === "object" && !Array.isArray(v)) for (const k of Object.keys(v)) if (/^\d{4}-\d{2}$/.test(k)) ms.push(k);
  }
  return [...new Set(ms)].sort();
}
function run(l: Ledger, c: HouseholdCase, months: string[]): Map<string, unknown> {
  const data = makeCase(l.ix, caseToSpec(c));
  const out = new Map<string, unknown>();
  for (const pid of Object.keys(c.persons)) for (const id of IDS) {
    const it = l.ix.byIdentifier.get(id);
    if (!it) continue;
    const scoped = it.scope === "person-month" || it.scope === "month";
    for (const mo of scoped ? months : [null]) {
      let v: unknown;
      try { v = evaluate(l.ix, data, id, pid, mo); } catch (e) { v = "error: " + (e as Error).message; }
      out.set(`${pid}|${id}|${mo ?? ""}`, v);
    }
  }
  return out;
}
const households: Array<{ src: string; c: HouseholdCase }> = [];
for (const c of newL.ledger.cases) households.push({ src: "S", c });
for (const g of generated(oldL.ledger.cases)) {
  const tr = translateCase(g, newL.ix, CHOICES).value;
  households.push({ src: "G", c: translateHoldings(translateEarnings(tr, newL.ix).value, newL.ix).value });
}
const lines: string[] = [];
let n = 0;
for (const { src, c } of households) {
  const months = monthsOf(c);
  const a = run(oldL, c, months), b = run(newL, c, months);
  for (const [k, v] of b) {
    const o = a.has(k) ? a.get(k) : "(no item)";
    if (JSON.stringify(o ?? null) !== JSON.stringify(v ?? null)) {
      n++;
      const [pid, id, mo] = k.split("|");
      lines.push(`${src} ${c.id} ${pid} ${id}${mo ? " @" + mo : ""}: old ${JSON.stringify(o ?? "unknown")} new ${JSON.stringify(v ?? "unknown")}`);
    }
  }
}
const text = [`answer-diff: ${base} vs disk; ${households.length} households; ${n} values differ`, ...lines].join("\n");
if (outFile) fs.writeFileSync(outFile, text + "\n");
console.log(text.split("\n").slice(0, 60).join("\n"));
