// Receipt spike: what "cannot determine" says in each model, for the same
// missing information: the reference "missing facts" list (the unstated
// supplied facts the evaluation asked for, docs/operators.md).
import fs from "node:fs";
import path from "node:path";
import { loadModel, spikeDir, type Model } from "./ledger";
import { translate } from "./translate";
import { generated } from "./generate";
import { caseToSpec, type HouseholdCase } from "../../src/engine/cases";
import { evaluate, makeCase, type TraceEvent } from "../../src/engine/evaluate";

const old = loadModel("old"), A = loadModel("a"), B = loadModel("b");
function missing(m: Model, c: HouseholdCase, id: string, month: string): string {
  const miss = new Set<string>();
  const v = evaluate(m.ix, makeCase(m.ix, caseToSpec(c)), id, "p1", month, (e: TraceEvent) => {
    if (e.origin === "missing") miss.add(e.identifier + (e.person && e.person !== "p1" ? "@" + e.person : ""));
  });
  return `${JSON.stringify(v)}; missing: ${[...miss].join(", ") || "(none)"}`;
}
const g = generated();
const rows: string[] = ["| Household | Model | leap_household_income | snap_person_unearned_income |", "|---|---|---|---|"];
const cases: Array<[string, HouseholdCase, string]> = [
  ["LEAP base, other nontaxable unearned income not stated", g.find((c) => c.id === "G-LEAP-other_nontaxable_not_stated")!, "2026-11"],
  ["LEAP base, an inheritance of 2,000 in October, thirty-day fact not stated", g.find((c) => c.id.startsWith("G-LEAPwin-inheritance_2000_in_October_thirty"))!, "2026-11"],
];
for (const [label, c, mo] of cases) {
  const tr = translate(c, old.ix);
  for (const [name, m, cc] of [["today", old, c], ["A", A, tr.a], ["B", B, tr.b]] as const) {
    rows.push(`| ${label} | ${name} | ${missing(m, cc, "leap_household_income", mo)} | ${missing(m, cc, "snap_person_unearned_income", mo)} |`);
  }
}
const out = path.join(spikeDir, "results", "cannot-determine.md");
fs.writeFileSync(out, "# Receipt spike: \"cannot determine\" and its missing facts\n\n" + rows.join("\n") + "\n");
console.log(rows.join("\n"));
