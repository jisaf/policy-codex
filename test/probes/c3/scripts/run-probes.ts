import path from "node:path";
import fs from "node:fs";
import yaml from "yaml";
import { loadLedgerFromDisk } from "../src/tools/check";
import { buildIndex } from "../src/engine/ledger-index";
import { evaluate, makeCase, type TraceEvent } from "../src/engine/evaluate";
import { caseToSpec } from "../src/engine/cases";
const root = path.resolve(import.meta.dirname, "..");
const [file, ...raw] = process.argv.slice(2); const idents = raw.flatMap((a) => a.split(",")).filter(Boolean);
const led = loadLedgerFromDisk(root, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const cases = yaml.parse(fs.readFileSync(file, "utf8"));
for (const c of cases) {
  console.log(`== ${c.id}: ${c.title}`);
  const data = makeCase(ix, caseToSpec(c));
  for (const pid of Object.keys(c.persons)) {
    const out: string[] = [];
    for (const id of idents) {
      const it = ix.byIdentifier.get(id)!;
      const missing = new Set<string>();
      const m = it.scope === "person-month" || it.scope === "month" ? c.as_of.slice(0, 7) : null;
      let v: unknown;
      try { v = evaluate(ix, data, id, pid, m, (e: TraceEvent) => { if (e.origin === "missing") missing.add(e.identifier + (e.person && e.person !== pid ? `@${e.person}` : "")); }); }
      catch (ex) { v = "error: " + (ex as Error).message; }
      out.push(`${id.replace(/^cccap_/, "")}=${JSON.stringify(v)}${missing.size && (v === null || v === undefined || String(v).startsWith("error")) ? "[missing " + [...missing].join(",") + "]" : ""}`);
    }
    console.log(`  ${pid}: ${out.join(" | ")}`);
  }
}
