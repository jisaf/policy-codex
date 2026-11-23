// scratch: npx vite-node scripts/evm.ts <case> <month> '<json overrides>' ident,ident [pid]
// overrides: {"case":{..},"p1":{..},"p1@2027-02":{..},"p1@default":{..},"rel":[[..]]}
import path from "node:path";
import { loadLedgerFromDisk } from "../src/tools/check";
import { buildIndex } from "../src/engine/ledger-index";
import { evaluate, makeCase } from "../src/engine/evaluate";
import { caseToSpec } from "../src/engine/cases";
const root = path.resolve(import.meta.dirname, "..");
const [caseId, month, ov, idents, onlyPid] = process.argv.slice(2);
const led = loadLedgerFromDisk(root, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const c = JSON.parse(JSON.stringify(led.cases.find((x) => x.id === caseId)));
const o = JSON.parse(ov || "{}");
for (const [k, v] of Object.entries(o)) {
  if (k === "case") Object.assign(c.case_facts ??= {}, v);
  else if (k === "rel") c.relationships = [...(c.relationships ?? []), ...(v as any)];
  else {
    const [pid, m] = k.split("@");
    c.persons[pid] ??= { facts: {} };
    const p = c.persons[pid];
    if (!m) Object.assign(p.facts ??= {}, v);
    else if (m === "default") Object.assign(p.month_defaults ??= {}, v);
    else { p.months ??= {}; Object.assign(p.months[m] ??= {}, v); }
  }
}
const data = makeCase(ix, caseToSpec(c));
for (const pid of Object.keys(c.persons)) {
  if (onlyPid && pid !== onlyPid) continue;
  for (const id of idents.split(",")) {
    const it = ix.byIdentifier.get(id);
    if (!it) { console.log("no item", id); continue; }
    const m = it.scope === "person-month" || it.scope === "month" ? month : null;
    let v: unknown;
    const miss=new Set<string>(); try { v = evaluate(ix, data, id, pid, m, (e:any)=>{ if(process.env.MISS && (e.origin==='missing')) miss.add(e.identifier+(e.person&&e.person!==pid?'@'+e.person:'')); }); } catch (e) { v = "error: " + (e as Error).message; }
    console.log(`${pid} ${id} = ${JSON.stringify(v)}` + (miss.size && v===null ? ' MISSING: '+[...miss].filter(x=>!/^(dwelling_id|has_higher|snap_is_boarder|receives_snap_in|declines|state_where|has_outstanding|snap_voluntary|snap_is_disq|receives_va|receives_rail|receives_disab|receives_temp)/.test(x)).slice(0,400).join(',') : ''));
  }
}
