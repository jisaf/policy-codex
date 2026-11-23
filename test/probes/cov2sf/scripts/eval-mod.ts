// usage: eval-mod.ts co CASE '<json overrides {p1:{fact:v},case:{..}}>' ident,ident [YYYY-MM] [persons]
import path from "node:path";
import { loadLedgerFromDisk } from "../src/tools/check";
import { buildIndex } from "../src/engine/ledger-index";
import { evaluate, makeCase } from "../src/engine/evaluate";
import { caseToSpec } from "../src/engine/cases";
const root = path.resolve(import.meta.dirname, "..");
const [vol, caseId, ov, ids, month, who] = process.argv.slice(2);
const led = loadLedgerFromDisk(root, vol);
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const c = JSON.parse(JSON.stringify(led.cases.find((x) => x.id === caseId)));
const o = JSON.parse(ov || "{}");
for (const [k, v] of Object.entries(o)) {
  if (k === "case") c.case_facts = { ...(c.case_facts||{}), ...(v as any) };
  else if (k === "rel") c.relationships = v;
  else if (k === "as_of") c.as_of = v;
  else if (k.includes("@")) { const [pp, mm] = k.split("@"); c.persons[pp].months = c.persons[pp].months || {}; c.persons[pp].months[mm] = { ...(c.persons[pp].months[mm]||{}), ...(v as any) }; }
  else { c.persons[k] = c.persons[k] || { facts: {} }; c.persons[k].facts = { ...c.persons[k].facts, ...(v as any) }; }
}
const data = makeCase(ix, caseToSpec(c));
const m = month || c.as_of.slice(0, 7);
for (const pid of (who ? who.split(",") : Object.keys(c.persons))) for (const id of ids.split(",")) {
  const it = ix.byIdentifier.get(id)!; if (!it) { console.log("no", id); continue; }
  let v: unknown; try { v = evaluate(ix, data, id, pid, it.scope.endsWith("month")||it.scope==="month" ? m : null, (e:any) => { if (process.env.MISS && (e.origin==="missing")) console.log("  missing", e.identifier, e.person); }); } catch (e) { v = "error " + (e as Error).message; }
  console.log(pid, id, m, JSON.stringify(v));
}
