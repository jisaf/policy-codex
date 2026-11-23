import path from "node:path";
import fs from "node:fs";
import { loadLedgerFromDisk } from "/home/user/policy-codex/src/tools/check";
import { buildIndex } from "/home/user/policy-codex/src/engine/ledger-index";
import { evaluate, makeCase } from "/home/user/policy-codex/src/engine/evaluate";
import { caseToSpec } from "/home/user/policy-codex/src/engine/cases";
const root = "/home/user/policy-codex";
const led = loadLedgerFromDisk(root, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const idents = process.argv[3].split(",");
const month = process.argv[4];
const data = makeCase(ix, caseToSpec(spec));
for (const pid of Object.keys(spec.persons)) for (const id of idents) {
  const it = ix.byIdentifier.get(id)!;
  const m = it.scope === "person-month" || it.scope === "month" ? month : null;
  const missing = new Set<string>();
  let v: unknown;
  try { v = evaluate(ix, data, id, pid, m, (e: any) => { if (e.origin === "missing") missing.add(e.identifier + (e.person && e.person !== pid ? "@" + e.person : "")); }); } catch (ex) { v = "error: " + (ex as Error).message; }
  console.log(pid, id, JSON.stringify(v), missing.size ? "missing: " + [...missing].slice(0,12).join(",") : "");
}
