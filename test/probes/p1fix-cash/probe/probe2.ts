import fs from "node:fs";
import YAML from "/home/user/policy-codex/.claude/worktrees/agent-a3116bf2b0f0fb698/node_modules/yaml/dist/index.js";
import { loadLedgerFromDisk } from "/home/user/policy-codex/.claude/worktrees/agent-a3116bf2b0f0fb698/src/tools/check";
import { buildIndex } from "/home/user/policy-codex/.claude/worktrees/agent-a3116bf2b0f0fb698/src/engine/ledger-index";
import { evaluate, makeCase } from "/home/user/policy-codex/.claude/worktrees/agent-a3116bf2b0f0fb698/src/engine/evaluate";
import { caseToSpec } from "/home/user/policy-codex/.claude/worktrees/agent-a3116bf2b0f0fb698/src/engine/cases";
const [file, only, idents, month] = process.argv.slice(2);
const led = loadLedgerFromDisk("/home/user/policy-codex/.claude/worktrees/agent-a3116bf2b0f0fb698", "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
for (const c of YAML.parse(fs.readFileSync(file, "utf8"))) { if (only !== "*" && c.id !== only) continue;
  const data = makeCase(ix, caseToSpec(c));
  for (const pid of Object.keys(c.persons)) for (const id of idents.split(",")) {
    const it = ix.byIdentifier.get(id)!; const miss = new Set<string>();
    const m = it.scope === "person-month" || it.scope === "month" ? (month ?? c.as_of.slice(0, 7)) : null;
    let v: unknown; try { v = evaluate(ix, data, id, pid, m, (e: any) => { if (["missing","not-in-force","no-version"].includes(e.origin)) miss.add(e.identifier + (e.person && e.person !== pid ? "@"+e.person : "")); }); } catch (e) { v = "error: " + (e as Error).message; }
    console.log(`${c.id} ${pid} ${id} = ${JSON.stringify(v)}${miss.size ? "  missing: "+[...miss].join(",") : ""}`);
  } }
