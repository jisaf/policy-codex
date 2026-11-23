// Which rules still read each old unearned-income fact the receipts restate:
// a fact with no reader left is retired (translate.ts, RETIRED; docs/plan-colorado.md,
// transition rule). npx vite-node scripts/receipts/readers.ts
import { createEngine } from "../../src/engine/engine";
import { currentLedger } from "./ledgers";
import { MONTH_FACTS, PERSON_FACTS } from "./translate";

const L = currentLedger();
const engine = createEngine(L.ledger.items, L.ledger.meta);
for (const f of [...MONTH_FACTS, ...PERSON_FACTS].sort()) {
  const it = engine.item(f);
  if (!it) { console.log(`${f}: retired`); continue; }
  const by = engine.usedBy(f).map((x) => `${engine.item(x)?.id}[${engine.item(x)?.program}]`);
  console.log(`${it.id} ${f}: ${by.length ? by.join(" ") : "NO READER"}`);
}
