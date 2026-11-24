// Usage: npx vite-node runall.ts <repo root> [case-id-prefix-filter]
// Prints every stored expectation result and a fixed set of MAGI/CHP+ values per person.
import fs from "node:fs";
import path from "node:path";
const root = process.argv[2];
const { loadLedgerFromDisk } = await import(path.join(root, "src/tools/check"));
const { buildIndex } = await import(path.join(root, "src/engine/ledger-index"));
const { evaluate, makeCase } = await import(path.join(root, "src/engine/evaluate"));
const { caseToSpec, runCase } = await import(path.join(root, "src/engine/cases"));
const led = loadLedgerFromDisk(root, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const outcomes = led.items.filter((i: any) => i.role === "outcome" && (i.program === "Medicaid" || i.program === "CHP+")).map((i: any) => i.identifier);
const extra = ["ma_magi_household_income_pct_fpl", "ma_family_planning_household_income_pct_fpl", "ma_family_planning_income_in_band", "ma_income_is_reasonably_compatible", "ma_requires_verification_of_earned_income", "chp_requires_verification_of_earned_income", "chp_income_is_reasonably_compatible", "ma_magi_household_income", "chp_copayment_income_band", "ma_hospital_presumptive_eligibility_category", "ma_is_presumptively_eligible_limited_family_planning", "ma_is_needy_newborn", "ma_is_dependent_child_in_month"];
const ids = [...new Set([...outcomes, ...extra])].filter((x) => ix.byIdentifier.has(x));
const filt = process.argv[3];
const out: string[] = [];
let pass = 0, fail = 0;
for (const c of led.cases) {
  if (filt && !c.id.startsWith(filt)) continue;
  const r = runCase(ix, c);
  pass += r.passed; fail += r.failed;
  for (const x of r.results) out.push(`EXP ${c.id} ${x.person} ${x.identifier} ${x.month ?? ""} ok=${x.ok} got=${JSON.stringify(x.got)}`);
  const data = makeCase(ix, caseToSpec(c));
  const m = c.as_of.slice(0, 7);
  for (const pid of Object.keys(c.persons)) for (const id of ids) {
    const it = ix.byIdentifier.get(id);
    let v: unknown;
    try { v = evaluate(ix, data, id, pid, it.scope === "person-month" || it.scope === "month" ? m : null); } catch (e) { v = "error: " + (e as Error).message.slice(0, 80); }
    out.push(`VAL ${c.id} ${pid} ${id} = ${JSON.stringify(v)}`);
  }
}
fs.writeFileSync(process.argv[4] ?? "/dev/stdout", out.join("\n") + "\n");
console.error(`expectations passed ${pass} failed ${fail}`);
