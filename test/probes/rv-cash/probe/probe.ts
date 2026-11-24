// usage: vite-node probe.ts <cases.yaml> <ident,...> [YYYY-MM]
import fs from "node:fs";
import YAML from "/home/user/policy-codex/node_modules/yaml/dist/index.js";
import { loadLedgerFromDisk } from "/home/user/policy-codex/src/tools/check";
import { buildIndex } from "/home/user/policy-codex/src/engine/ledger-index";
import { evaluate, makeCase } from "/home/user/policy-codex/src/engine/evaluate";
import { caseToSpec } from "/home/user/policy-codex/src/engine/cases";
const [file, idents, month] = process.argv.slice(2);
const led = loadLedgerFromDisk("/home/user/policy-codex", "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const cases = YAML.parse(fs.readFileSync(file, "utf8"));
for (const c of cases) {
  const data = makeCase(ix, caseToSpec(c));
  for (const pid of Object.keys(c.persons)) for (const id of idents.split(",")) {
    const it = ix.byIdentifier.get(id); if (!it) { console.log("unknown " + id); continue; }
    const m = it.scope === "person-month" || it.scope === "month" ? (month ?? c.as_of.slice(0, 7)) : null;
    let v: unknown; try { v = evaluate(ix, data, id, pid, m, () => {}); } catch (e) { v = "error: " + (e as Error).message; }
    console.log(`${c.id} ${pid} ${id} = ${JSON.stringify(v)}`);
  }
}
