// usage: evalp.ts <cases.yaml> <case id> <ids,comma> [YYYY-MM]
import fs from "node:fs";
const W = "/home/user/policy-codex/.claude/worktrees/agent-a84186d76c3bacb83";
const { loadLedgerFromDisk } = await import(W + "/src/tools/check");
const { buildIndex } = await import(W + "/src/engine/ledger-index");
const { evaluate, makeCase } = await import(W + "/src/engine/evaluate");
const { caseToSpec, parseCases } = await import(W + "/src/engine/cases");
const [file, cid, idl, mon] = process.argv.slice(2);
const led = loadLedgerFromDisk(W, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const c = (file === "-" ? led.cases : parseCases(fs.readFileSync(file, "utf8"))).find((x: any) => x.id === cid);
const data = makeCase(ix, caseToSpec(c));
for (const pid of Object.keys(c.persons)) for (const id of idl.split(",")) {
  const it = ix.byIdentifier.get(id)!;
  const m = it.scope === "person-month" || it.scope === "month" ? (mon ?? c.as_of.slice(0, 7)) : null;
  const miss = new Set<string>();
  let v: unknown; try { v = evaluate(ix, data, id, pid, m, (e: any) => { if (e.origin === "missing") miss.add(e.identifier); }); } catch (ex) { v = "error " + (ex as Error).message; }
  console.log(`${pid} ${id} = ${JSON.stringify(v)}${process.env.MISS && miss.size ? "  missing: " + [...miss].join(",") : ""}`);
}
