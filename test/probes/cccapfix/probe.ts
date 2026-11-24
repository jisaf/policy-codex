import fs from "node:fs";
const W = "/home/user/policy-codex/.claude/worktrees/agent-a2cadfae7e8577c94";
const { loadLedgerFromDisk } = await import(W + "/src/tools/check");
const { buildIndex } = await import(W + "/src/engine/ledger-index");
const { evaluate, makeCase } = await import(W + "/src/engine/evaluate");
const { caseToSpec } = await import(W + "/src/engine/cases");
const D = "/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cccapfix/";
let [files, idents, only] = process.argv.slice(2);
if (files === "-") files = ["probes.json", "probes2.json", "probes3.json", "probes4.json"].map((f) => D + f).filter((f) => fs.existsSync(f)).join(",");
const led = loadLedgerFromDisk(W, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const cases = files.split(",").flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8")));
for (const c of cases) {
  if (only && !only.split(",").includes(c.id)) continue;
  const data = makeCase(ix, caseToSpec(c));
  const out: string[] = [];
  for (const pid of Object.keys(c.persons)) {
    const vals = idents.split(",").map((id) => {
      const it = ix.byIdentifier.get(id);
      if (!it) return "NOITEM " + id;
      const m = it.scope === "person-month" || it.scope === "month" ? c.as_of.slice(0, 7) : null;
      const missing = new Set<string>();
      let v: unknown;
      try {
        v = evaluate(ix, data, id, pid, m, (e: any) => {
          if (e.origin === "missing") missing.add(e.identifier + (e.person && e.person !== pid ? "@" + e.person : ""));
        });
      } catch (ex) { v = "ERR " + (ex as Error).message; }
      return `${JSON.stringify(v)}${missing.size && process.env.MISS ? "{missing " + [...missing].join(" ") + "}" : ""}`;
    });
    out.push(`${pid}: ${vals.join(" | ")}`);
  }
  console.log(`${c.id} (${c.title})\n   ${out.join("\n   ")}`);
}
