import fs from "node:fs";
import { createEngine } from "/home/user/policy-codex/.claude/worktrees/agent-ac8f07364ea23f5fc/src/engine/engine";
import { makeCase, evaluate } from "/home/user/policy-codex/.claude/worktrees/agent-ac8f07364ea23f5fc/src/engine/evaluate";
import { caseToSpec } from "/home/user/policy-codex/.claude/worktrees/agent-ac8f07364ea23f5fc/src/engine/cases";
import { explain } from "/home/user/policy-codex/.claude/worktrees/agent-ac8f07364ea23f5fc/src/engine/explain";
const d = JSON.parse(fs.readFileSync("/home/user/policy-codex/.claude/worktrees/agent-ac8f07364ea23f5fc/prototypes/blind-b/public/data.json", "utf8"));
let t = Date.now();
const eng = createEngine(d.items, d.meta);
console.log("engine", Date.now() - t);
t = Date.now();
const reps = eng.runCases(d.cases);
console.log("runCases", Date.now() - t, reps.map((r: any) => `${r.id}:${r.passed}/${r.failed}`).join(" "));
// all outcomes for all persons at as_of month
const outcomes = d.meta.programs.flatMap((p: any) => p.outcomes || []);
t = Date.now();
let n = 0, nodes = 0;
const count = (x: any): number => 1 + x.children.reduce((a: number, k: any) => a + count(k), 0);
for (const c of d.cases.slice(0, 3)) {
  const cd = makeCase(eng.index, caseToSpec(c));
  const month = c.as_of.slice(0, 7);
  for (const pid of Object.keys(c.persons)) for (const o of outcomes) {
    const it = eng.item(o)!;
    try { const tr = explain(eng.index, cd, o, pid, it.scope === "person-month" ? month : null); n++; nodes += count(tr); } catch (e) { console.log("ERR", o, (e as Error).message); }
  }
}
console.log("explain 3 cases", Date.now() - t, n, nodes);
const c = d.cases[0];
console.log(JSON.stringify(c.expect.p3).slice(0, 1500));
console.log(Object.keys(c.persons.p3), JSON.stringify(c.persons.p3.months || {}).slice(0, 300), JSON.stringify(c.persons.p3.month_defaults || {}).slice(0, 300));
const unv = d.sources.filter((s: any) => s.unverified);
console.log("unverified", unv.map((s: any) => s.id));
console.log("items citing", d.items.filter((i: any) => (i.sources || []).some((s: string) => unv.find((u: any) => u.id === s)) || (i.versions || []).some((v: any) => unv.find((u: any) => u.id === v.source))).map((i: any) => i.id + " " + i.identifier));
console.log("override", d.items.filter((i: any) => i.statute_override).map((i: any) => i.id + " " + i.identifier));
const vers: Record<string, number> = {};
for (const i of d.items) for (const v of i.versions || []) vers[v.from.slice(0, 7)] = (vers[v.from.slice(0, 7)] || 0) + 1;
console.log(Object.entries(vers).sort());
console.log("effective", d.items.filter((i: any) => i.effective).map((i: any) => i.id + " " + JSON.stringify(i.effective)));
console.log("review_by", d.items.filter((i: any) => i.review_by).map((i: any) => i.id + " " + i.review_by));
console.log("q states", d.questions.reduce((a: any, q: any) => (a[q.state] = (a[q.state] || 0) + 1, a), {}), d.questions.filter((q: any) => !q.items.length).length);
console.log(JSON.stringify(d.sources[5]), JSON.stringify(unv[0]).slice(0, 600));
