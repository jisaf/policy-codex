// usage (from worktree root): npx vite-node <this> <out-file>
import fs from "node:fs";
import path from "node:path";
import { loadLedgerFromDisk } from "/home/user/policy-codex/.claude/worktrees/agent-ae199798264caf09d/src/tools/check";
import { buildIndex } from "/home/user/policy-codex/.claude/worktrees/agent-ae199798264caf09d/src/engine/ledger-index";
import { evaluate, makeCase } from "/home/user/policy-codex/.claude/worktrees/agent-ae199798264caf09d/src/engine/evaluate";
import { caseToSpec, parseCases } from "/home/user/policy-codex/.claude/worktrees/agent-ae199798264caf09d/src/engine/cases";
const root = "/home/user/policy-codex/.claude/worktrees/agent-ae199798264caf09d";
const here = "/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cf3";
const led = loadLedgerFromDisk(root, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const vol = fs.readFileSync(path.join(root, "volumes/co/volume.yaml"), "utf8");
const outcomes = (vol.match(/outcomes: \[(snap_[^\]]*)\]/)![1]).split(",").map((s) => s.trim());
const extra = ["snap_is_household_member","snap_household_gross_income","snap_household_net_income","snap_household_countable_resources","snap_countable_liquid_resources","snap_person_earned_income","snap_person_unearned_income","snap_sponsor_deemed_income","snap_sponsor_deemed_resources","snap_income_changed_since_last_certification","snap_shelter_costs","snap_is_disqualified_for_voluntary_quit","snap_person_wages","snap_is_exempt_from_work_registration"];
const ids = [...new Set([...outcomes, ...extra, ...[...ix.byIdentifier.keys()].filter((k) => k.startsWith("snap_requires_verification_of_"))])].filter((k) => ix.byIdentifier.has(k)).sort();
const cases: any[] = [...led.cases];
const seen = new Set(cases.map((c) => c.id));
for (const f of ["zz-c3nf.yaml", "zz-c2nf.yaml"]) for (const c of parseCases(fs.readFileSync(path.join(here, f), "utf8"))) if (!seen.has(c.id)) { cases.push(c); seen.add(c.id); }
const probes = JSON.parse(fs.readFileSync(path.join(here, process.argv[3] ?? "probes.json"), "utf8"));
const runs: { name: string; c: any; month: string }[] = cases.map((c) => ({ name: c.id, c, month: c.as_of.slice(0, 7) }));
for (const p of probes) {
  const base = cases.find((x) => x.id === p.base);
  const c = JSON.parse(JSON.stringify(base));
  for (const [k, v] of Object.entries(p.ov ?? {})) {
    if (k === "case") Object.assign(c.case_facts ??= {}, v);
    else { const [pid, m] = k.split("@"); c.persons[pid] ??= { facts: {} }; const pp = c.persons[pid];
      if (!m) Object.assign(pp.facts ??= {}, v); else if (m === "default") Object.assign(pp.month_defaults ??= {}, v); else { pp.months ??= {}; Object.assign(pp.months[m] ??= {}, v); } }
  }
  runs.push({ name: p.name, c, month: p.month ?? c.as_of.slice(0, 7) });
}
const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
const out: string[] = [];
for (const r of runs) {
  if (only && !only.has(r.name)) continue;
  let data: any;
  try { data = makeCase(ix, caseToSpec(r.c)); } catch (e) { out.push(`${r.name} ERROR ${(e as Error).message}`); continue; }
  for (const pid of Object.keys(r.c.persons)) for (const id of ids) {
    const it = ix.byIdentifier.get(id)!;
    const m = it.scope === "person-month" || it.scope === "month" ? r.month : null;
    const miss=new Set<string>(); let v: unknown; try { v = evaluate(ix, data, id, pid, m, process.env.MISS ? (e:any)=>{ if(e.origin==='missing') miss.add(e.identifier+(e.person&&e.person!==pid?'@'+e.person:'')); } : undefined); } catch (e) { v = "error: " + (e as Error).message; }
    out.push(`${r.name} ${pid} ${id} = ${JSON.stringify(v)}` + (v===null && miss.size ? '  MISSING '+[...miss].filter(x=>!/^(dwelling_id|has_higher|snap_is_boarder|receives_snap_in|declines|state_where|has_outstanding|snap_voluntary|snap_is_disq|receives_va|receives_rail|receives_disab|receives_temp|receives_fdpir|snap_household_refused|lottery|annual_contract|wages_pay_freq|wages_from_owned|work_study|infrequent|wioa|summer_youth|scsep|combat|military_pay|snap_is_first_cert|receives_family_pres)/.test(x)).slice(0,40).join(',') : ''));
  }
}
fs.writeFileSync(process.argv[2], out.join("\n") + "\n");
console.log(runs.length, "runs", out.length, "values");
