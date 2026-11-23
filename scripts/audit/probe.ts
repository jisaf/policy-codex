/* Evaluates the paired items of the duplicate-paths audit on small hand-built
 * households, to show whether two paths can disagree today.
 *   npx vite-node scripts/audit/probe.ts -- <households.yaml>
 * The file is a list of household cases in the tests/cases.yaml shape, each
 * with `evaluate: [{person, identifier, month?}]` instead of `expect`. Writes
 * nothing. */
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { loadLedgerFromDisk } from "../../src/tools/check";
import { buildIndex } from "../../src/engine/ledger-index";
import { evaluate, makeCase, type TraceEvent } from "../../src/engine/evaluate";
import { caseToSpec, type HouseholdCase } from "../../src/engine/cases";

const root = path.resolve(import.meta.dirname, "../..");
const file = process.argv.slice(2).filter((a) => a !== "--")[0];
const led = loadLedgerFromDisk(root, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const cases = parse(fs.readFileSync(file, "utf8")) as (HouseholdCase & { evaluate: { person: string; identifier: string; month?: string }[] })[];
for (const c of cases) {
  console.log(`# ${c.id} ${c.title ?? ""}`);
  const data = makeCase(ix, caseToSpec(c));
  for (const q of c.evaluate) {
    const it = ix.byIdentifier.get(q.identifier);
    if (!it) { console.log(`  no item ${q.identifier}`); continue; }
    const m = it.scope === "person-month" || it.scope === "month" ? (q.month ?? c.as_of.slice(0, 7)) : null;
    const missing = new Set<string>();
    let v: unknown;
    try {
      v = evaluate(ix, data, q.identifier, q.person, m, (e: TraceEvent) => {
        if (e.origin === "missing" || e.origin === "no-version") missing.add(e.identifier + (e.person && e.person !== q.person ? `@${e.person}` : ""));
      });
    } catch (ex) { v = "error: " + (ex as Error).message; }
    console.log(`  ${q.person} ${it.id} ${q.identifier}${m ? " " + m : ""} = ${JSON.stringify(v)}${missing.size ? "   missing: " + [...missing].slice(0, 8).join(", ") : ""}`);
  }
}
