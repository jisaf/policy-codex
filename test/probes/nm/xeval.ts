// usage: ROOT=<worktree> vite-node xeval.ts <xcases.yaml> <caseId> ident,ident [YYYY-MM]
import fs from "node:fs";
const root = process.env.ROOT!;
const { loadLedgerFromDisk } = await import(root + "/src/tools/check");
const { buildIndex } = await import(root + "/src/engine/ledger-index");
const { evaluate, makeCase } = await import(root + "/src/engine/evaluate");
const { caseToSpec, parseCases } = await import(root + "/src/engine/cases");
const [file, caseId, idl, month] = process.argv.slice(2);
const led = loadLedgerFromDisk(root, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const cs = parseCases(fs.readFileSync(file, "utf8"));
const c = cs.find((x: any) => x.id === caseId) ?? led.cases.find((x: any) => x.id === caseId);
const data = makeCase(ix, caseToSpec(c));
for (const pid of Object.keys(c.persons)) for (const id of idl.split(",")) {
  const it = ix.byIdentifier.get(id); if (!it) { console.log("no " + id); continue; }
  const m = it.scope === "person-month" || it.scope === "month" ? (month ?? c.as_of.slice(0, 7)) : null;
  const missing = new Set<string>(); let v: unknown;
  try { v = evaluate(ix, data, id, pid, m, (e: any) => { if (e.origin === "missing") missing.add(e.identifier + (e.person && e.person !== pid ? "@" + e.person : "")); }); } catch (ex) { v = "error: " + (ex as Error).message; }
  console.log(`${caseId} ${pid} ${id}${m ? " " + m : ""} = ${JSON.stringify(v)}${missing.size ? "  missing: " + [...missing].join(",") : ""}`);
}
