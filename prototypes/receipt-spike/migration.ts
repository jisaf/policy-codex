// Receipt spike: the size of the migration beyond the three slices. Counts
// the derived items, by program, that read a supplied unearned-income fact the
// models reshape, and the stored households and rule tests that state one.
import { loadModel, baseLedger } from "./ledger";
import { SLICE_MONTH_FACTS } from "./translate";

const old = loadModel("old");
const facts = new Set<string>([...SLICE_MONTH_FACTS].filter((f) => f !== "americorps_service_hours"));
for (const it of old.items) if (it.kind === "supplied" && /prior_thirty_days$/.test(it.identifier) && /lump|lottery|unearned|retroactive|resource_liquidation|insurance_proceeds|refugee|named_source/.test(it.identifier)) facts.add(it.identifier);
for (const f of ["periodic_unearned_income_per_payment", "periodic_unearned_income_frequency", "charitable_gifts_for_life_threatening_condition_received", "child_support_arrears_received"]) facts.add(f);
const readers = new Map<string, Set<string>>();
for (const it of old.items) {
  if (it.kind !== "derived") continue;
  const refs = new Set<string>();
  const walk = (e: unknown) => { if (typeof e === "string" && facts.has(e)) refs.add(e); else if (Array.isArray(e)) e.forEach(walk); };
  walk(it.derived);
  if (refs.size) readers.set(it.identifier, refs);
}
const byProgram = new Map<string, number>();
for (const id of readers.keys()) { const p = old.ix.byIdentifier.get(id)!.program; byProgram.set(p, (byProgram.get(p) ?? 0) + 1); }
console.log(`${facts.size} supplied facts reshaped; ${readers.size} derived items read one or more of them:`);
console.log([...byProgram].sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(", "));
let tests = 0, testsStating = 0;
for (const it of old.items) for (const t of it.tests ?? []) {
  tests++;
  const s = JSON.stringify(t);
  if ([...facts].some((f) => s.includes(`"${f}"`))) testsStating++;
}
const cases = baseLedger().cases.filter((c) => [...facts].some((f) => JSON.stringify(c).includes(`"${f}"`))).length;
console.log(`rule tests stating one: ${testsStating} of ${tests}; stored households stating one: ${cases} of ${baseLedger().cases.length}`);
