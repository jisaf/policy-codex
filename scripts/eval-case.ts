// Evaluates a household case's SNAP-relevant identifiers for every person and
// reports the value and the supplied facts that were missing, so a case author
// can see what the case must still state. Usage:
//   npx vite-node scripts/eval-case.ts <volume> <case id> <identifier>[,<identifier>...] [month]
import path from "node:path";
import { loadLedgerFromDisk } from "../src/tools/check";
import { buildIndex } from "../src/engine/ledger-index";
import { evaluate, makeCase, type TraceEvent } from "../src/engine/evaluate";
import { caseToSpec } from "../src/engine/cases";

const root = path.resolve(import.meta.dirname, "..");
const [vol, caseId, idents, month] = process.argv.slice(2);
const led = loadLedgerFromDisk(root, vol);
const ix = buildIndex(led.items);
const c = led.cases.find((x) => x.id === caseId)!;
const data = makeCase(ix, caseToSpec(c));
for (const pid of Object.keys(c.persons)) {
  for (const id of idents.split(",")) {
    const it = ix.byIdentifier.get(id)!;
    const missing = new Set<string>();
    const m = it.scope === "person-month" || it.scope === "month" ? (month ?? c.as_of.slice(0, 7)) : null;
    let v: unknown;
    try {
      v = evaluate(ix, data, id, pid, m, (e: TraceEvent) => { if (e.origin === "missing" || e.origin === "not-in-force") missing.add(e.identifier + (e.person && e.person !== pid ? `@${e.person}` : "")); });
    } catch (ex) { v = "error: " + (ex as Error).message; }
    console.log(`${pid} ${id}${m ? " " + m : ""} = ${JSON.stringify(v)}${missing.size ? "   missing: " + [...missing].join(", ") : ""}`);
  }
}
