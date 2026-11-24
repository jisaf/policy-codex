// Evaluates identifiers of a household case for every person and reports the
// value and the supplied facts that were missing, so a case author can see
// what the case must still state. Usage:
//   npx vite-node scripts/eval-case.ts <volume> <case id> <identifier>[,<identifier>...] [<identifier> ...] [YYYY-MM]
// Identifiers may be comma-separated or separate arguments; an argument of the
// form YYYY-MM is the month (default: the case's as_of month). An unknown
// identifier is an error, not a silent null.
import path from "node:path";
import { loadLedgerFromDisk } from "../src/tools/check";
import { buildIndex } from "../src/engine/ledger-index";
import { evaluate, makeCase, type TraceEvent } from "../src/engine/evaluate";
import { caseToSpec } from "../src/engine/cases";
import { MONTH_RE } from "../src/engine/types";

const root = path.resolve(import.meta.dirname, "..");
const [vol, caseId, ...rest] = process.argv.slice(2);
if (!vol || !caseId || !rest.length) {
  console.error("usage: eval-case.ts <volume> <case id> <identifier>[,<identifier>...] [YYYY-MM]");
  process.exit(2);
}
const month = rest.find((a) => MONTH_RE.test(a));
const idents = rest.filter((a) => !MONTH_RE.test(a)).flatMap((a) => a.split(",")).filter(Boolean);
const led = loadLedgerFromDisk(root, vol);
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const c = led.cases.find((x) => x.id === caseId);
if (!c) {
  console.error(`no case ${caseId} in volume ${vol}`);
  process.exit(2);
}
for (const id of idents) {
  if (!ix.byIdentifier.has(id)) {
    console.error(`no item with identifier ${id} in volume ${vol}`);
    process.exit(2);
  }
}
const data = makeCase(ix, caseToSpec(c));
for (const pid of Object.keys(c.persons)) {
  for (const id of idents) {
    const it = ix.byIdentifier.get(id)!;
    const missing = new Set<string>();
    const m = it.scope === "person-month" || it.scope === "month" ? (month ?? c.as_of.slice(0, 7)) : null;
    let v: unknown;
    try {
      v = evaluate(ix, data, id, pid, m, (e: TraceEvent) => {
        if (e.origin === "missing" || e.origin === "not-in-force" || e.origin === "no-version") {
          missing.add(e.identifier + (e.person && e.person !== pid ? `@${e.person}` : ""));
        }
      });
    } catch (ex) { v = "error: " + (ex as Error).message; }
    console.log(`${pid} ${id}${m ? " " + m : ""} = ${JSON.stringify(v)}${missing.size ? "   missing: " + [...missing].join(", ") : ""}`);
  }
}
