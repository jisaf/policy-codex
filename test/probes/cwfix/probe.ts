// usage: npx vite-node <this> <root> <probe cases yaml> <case id|all> <idents,...> [YYYY-MM]
import fs from "node:fs";
import path from "node:path";
const [root, probeFile, caseSel, identArg, month] = process.argv.slice(2);
const { loadLedgerFromDisk } = await import(path.join(root, "src/tools/check"));
const { buildIndex } = await import(path.join(root, "src/engine/ledger-index"));
const { evaluate, makeCase } = await import(path.join(root, "src/engine/evaluate"));
const { caseToSpec, parseCases } = await import(path.join(root, "src/engine/cases"));
const led = loadLedgerFromDisk(root, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const probes = parseCases(fs.readFileSync(probeFile, "utf8"));
const idents = identArg.split(",");
for (const c of probes) {
  if (caseSel !== "all" && !caseSel.split(",").includes(c.id)) continue;
  console.log(`## ${c.id} ${c.title}`);
  const data = makeCase(ix, caseToSpec(c));
  for (const pid of Object.keys(c.persons)) {
    const out: string[] = [];
    for (const id of idents) {
      const it = ix.byIdentifier.get(id);
      if (!it) { out.push(`${id}=NOITEM`); continue; }
      const m = it.scope === "person-month" || it.scope === "month" ? (month ?? c.as_of.slice(0, 7)) : null;
      const missing = new Set<string>();
      let v: unknown;
      try { v = evaluate(ix, data, id, pid, m, (e: any) => { if (e.origin === "missing") missing.add(e.identifier + (e.person && e.person !== pid ? `@${e.person}` : "")); }); }
      catch (ex) { v = "error: " + (ex as Error).message; }
      out.push(`${id}=${JSON.stringify(v)}${missing.size && v === null ? " [missing " + [...missing].join(",") + "]" : ""}`);
    }
    console.log(`  ${pid}: ${out.join("  ")}`);
  }
}
