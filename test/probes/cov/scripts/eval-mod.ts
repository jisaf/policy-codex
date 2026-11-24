// usage: eval-mod.ts <case> '<json overrides {person:{fact:val}, case_facts:{...}, as_of}>' <month|-> ident,...
import path from "node:path";
import { loadLedgerFromDisk } from "../src/tools/check";
import { buildIndex } from "../src/engine/ledger-index";
import { evaluate, makeCase } from "../src/engine/evaluate";
import { caseToSpec } from "../src/engine/cases";
const root = path.resolve(import.meta.dirname, "..");
const [caseId, ov, month, idl] = process.argv.slice(2);
const led = loadLedgerFromDisk(root, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const c0 = led.cases.find((x) => x.id === caseId)!;
const c = JSON.parse(JSON.stringify(c0));
const o = JSON.parse(ov);
for (const [k, v] of Object.entries(o)) {
  if (k === "as_of") c.as_of = v;
  else if (k === "case_facts") Object.assign(c.case_facts ??= {}, v as object);
  else if (k.endsWith("_months")) { const pk = k.slice(0, -7); const ms = (c.persons[pk].months ??= {}); for (const [m, f] of Object.entries(v as object)) Object.assign(ms[m] ??= {}, f as object); }
  else Object.assign(c.persons[k].facts ??= {}, v as object);
}
const data = makeCase(ix, caseToSpec(c));
for (const id of idl.split(",")) {
  const it = ix.byIdentifier.get(id)!;
  const pid = Object.keys(c.persons)[0];
  const m = it.scope === "person-month" || it.scope === "month" ? (month !== "-" ? month : c.as_of.slice(0, 7)) : null;
  let v: unknown; try { v = evaluate(ix, data, id, pid, m, () => {}); } catch (e) { v = "error " + (e as Error).message; }
  console.log(`${id} = ${JSON.stringify(v)}`);
}
