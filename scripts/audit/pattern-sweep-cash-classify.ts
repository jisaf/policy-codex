/* Classifies the harness differences the cash pattern sweep makes (docs/reviews/pattern-sweep-cash.md, section 6).
 *
 *   npx vite-node scripts/audit/pattern-sweep-cash-classify.ts <harness output> <before ref> <receipts|earnings|holdings> <out.json> [<receipts baseline>]
 *
 * Reads the UNEXPLAINED lines of a harness run, rebuilds each household as that harness states it on its new side,
 * and evaluates the cell on the ledger at <before ref> (the branch before the sweep, merged with origin) and on the
 * ledger on disk, each with the facts its evaluation reports missing. A cell whose value at <before ref> is already
 * the new value is not the sweep's (printed apart, for the round whose class it is). Every other cell is given the
 * sweep class its trace shows (the newly required fact reported missing, or the fixed reader the value moves
 * through), or none, to be traced by hand. Writes JSON; scripts/audit/pattern-sweep-cash-allow.ts turns it into
 * enumerated entries. Changes no acceptance logic. */
import fs from "node:fs";
import { caseToSpec, parseCases, type HouseholdCase } from "../../src/engine/cases";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { valuesEqual } from "../../src/engine/values";
import { currentLedger, ledgerAt, root, type Ledger } from "../receipts/ledgers";
import { generated } from "../receipts/generate";
import { translateCase } from "../receipts/translate";
import { CHOICES } from "../receipts/choices";
import { translateCase as translateEarnings } from "../records/translate-earnings";
import { translateCase as translateHoldings } from "../records/translate-holdings";
import path from "node:path";
import { generated as generatedEarnings } from "../records/generate-earnings";
import { generated as generatedHoldings } from "../records/generate-holdings";

const [file, beforeRef, list, out, harnessBase] = process.argv.slice(2).filter((a) => a !== "--");
/** The receipts harness generates its households from its baseline's stored households (BASELINE_REF). */
const arg4 = () => harnessBase ?? "c29d3262ed69d9fbc7589a949149aa75dc8ba182";
const lines = fs.readFileSync(file, "utf8").split("\n").filter((l) => l.startsWith("UNEXPLAINED"));
const re = /^UNEXPLAINED (\S+) (\S+) (\S+) (\S+?)(?: @(\S+))?: old (.*) new (.*?)(?: expected .*)?$/;
type Cell = { source: string; case: string; person: string; identifier: string; month: string; old: unknown; new: unknown };
const parse = (s: string): unknown => (s === "unknown" ? null : JSON.parse(s));
const cells: Cell[] = [];
for (const l of lines) {
  const m = l.match(re);
  if (!m) { console.error("unparsed:", l.slice(0, 160)); continue; }
  cells.push({ source: m[1], case: m[2], person: m[3], identifier: m[4], month: m[5] ?? "", old: parse(m[6]), new: parse(m[7]) });
}
const before: Ledger = ledgerAt(beforeRef);
const now: Ledger = currentLedger();
const stored = new Map(now.ledger.cases.map((c) => [c.id, c]));
// the new side of a generated household, as each harness builds it
const gen = new Map<string, HouseholdCase>();
const need = new Set(cells.filter((c) => !stored.has(c.case)).map((c) => c.case));
if (need.size) {
  // as each harness builds them: receipts from the baseline's stored households, translated; the records lists from
  // the stored households on disk and the tracks' bases (scripts/records/programs)
  const tracks: any[] = [];
  if (list !== "receipts") {
    const dir = path.join(root, "scripts/records/programs");
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".ts") && x !== "types.ts").sort()) {
      const m = await import(path.join(dir, f));
      if (m.track) tracks.push(m.track);
    }
  }
  const pool: HouseholdCase[] = list === "earnings"
    ? generatedEarnings(now.ledger.cases, tracks.filter((t) => t.earnings).flatMap((t) => t.earnings.bases)).map((c) => translateEarnings(c, now.ix).value)
    : list === "holdings"
    ? generatedHoldings(now.ledger.cases, tracks.filter((t) => t.holdings).flatMap((t) => t.holdings.bases)).map((c) => translateHoldings(c, now.ix).value)
    : generated(ledgerAt(arg4()).ledger.cases).map((c) => translateHoldings(translateEarnings(translateCase(c, now.ix, CHOICES).value, now.ix).value, now.ix).value);
  for (const c of pool) if (need.has(c.id)) gen.set(c.id, c);
}
const storedNew = (c: HouseholdCase) => (list === "receipts" && !Object.values(c.persons).some((p) => p.facts && "receipts" in p.facts) ? translateCase(c, now.ix, CHOICES).value : c);
const dataCache = new Map<string, ReturnType<typeof makeCase>>();
function evalCell(L: Ledger, tag: string, c: Cell) {
  const hc = stored.get(c.case) ? storedNew(stored.get(c.case)!) : gen.get(c.case);
  if (!hc) return { v: "no household", miss: [] as string[] };
  const k = tag + c.case;
  if (!dataCache.has(k)) dataCache.set(k, makeCase(L.ix, caseToSpec(hc)));
  const miss = new Set<string>();
  let v: unknown;
  try {
    v = evaluate(L.ix, dataCache.get(k)!, c.identifier, c.person, c.month || null, (e: { origin?: string; identifier: string; person?: string | null }) => {
      if (e.origin === "missing") miss.add(`${e.identifier}@${e.person ?? ""}`);
    });
  } catch (ex) { v = "error: " + (ex as Error).message; }
  return { v, miss: [...miss] };
}
const res = cells.map((c) => {
  const b = evalCell(before, "b", c);
  const n = evalCell(now, "n", c);
  const same = (x: unknown, y: unknown) => (x == null && y == null) || (x != null && y != null && valuesEqual(x, y));
  const newMiss = n.miss.filter((m) => !b.miss.includes(m));
  return { ...c, nowMiss: n.miss, before: b.v ?? null, now: n.v ?? null, sweep: !same(b.v ?? null, n.v ?? null), newMiss, goneMiss: b.miss.filter((m) => !n.miss.includes(m)) };
});
fs.writeFileSync(out, JSON.stringify(res, null, 0));
console.log(`cells ${res.length}; the sweep's ${res.filter((r) => r.sweep).length}; before ref already gives the new value ${res.filter((r) => !r.sweep).length}`);
void root;
