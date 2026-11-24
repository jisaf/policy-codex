// Snapshot LEAP and SUN Bucks values for stored cases and the probe households.
// usage: npx vite-node <this> <probes.yaml> <out.txt>
import fs from "node:fs";
import { loadLedgerFromDisk } from "/home/user/policy-codex/.claude/worktrees/agent-a64eb945b43b19a01/src/tools/check";
import { buildIndex } from "/home/user/policy-codex/.claude/worktrees/agent-a64eb945b43b19a01/src/engine/ledger-index";
import { evaluate, makeCase } from "/home/user/policy-codex/.claude/worktrees/agent-a64eb945b43b19a01/src/engine/evaluate";
import { caseToSpec, parseCases } from "/home/user/policy-codex/.claude/worktrees/agent-a64eb945b43b19a01/src/engine/cases";
const root = "/home/user/policy-codex/.claude/worktrees/agent-a64eb945b43b19a01";
const led = loadLedgerFromDisk(root, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const probes = parseCases(fs.readFileSync(process.argv[2], "utf8"));
const ids = ["leap_is_eligible", "leap_benefit_amount", "leap_household_income", "leap_excluded_unearned_income", "leap_person_unearned_income", "leap_person_one_time_income", "leap_person_wages", "leap_is_homeless_or_in_non_traditional_dwelling", "leap_verification_status", "sebt_eligibility_status", "sebt_benefit_amount", "sebt_verification_status", "sebt_household_child_receives_snap_or_tanf", "sebt_other_categorical_basis", "sebt_income_eligibility_limit"].filter((i) => ix.byIdentifier.has(i));
const stored = led.cases.filter((c: any) => /"(leap_|sebt_)/.test(JSON.stringify(c.expect ?? {})));
const cases = [...stored, ...probes.filter((p: any) => !stored.some((s: any) => s.id === p.id))];
const out: string[] = [];
for (const c of cases as any[]) {
  const months = new Set<string>([c.as_of.slice(0, 7)]);
  JSON.stringify(c.expect ?? {}).replace(/"(\d{4}-\d{2})"/g, (_: string, m: string) => { months.add(m); return ""; });
  let data;
  try { data = makeCase(ix, caseToSpec(c)); } catch (e) { out.push(`${c.id} ERROR ${(e as Error).message}`); continue; }
  for (const pid of Object.keys(c.persons)) for (const id of ids) {
    const it = ix.byIdentifier.get(id)!;
    const ms = it.scope === "person-month" || it.scope === "month" ? [...months].sort() : [null];
    for (const m of ms) {
      let v: unknown;
      try { v = evaluate(ix, data, id, pid, m); } catch (e) { v = "err"; }
      out.push(`${c.id} ${pid} ${id} ${m ?? "-"} = ${JSON.stringify(v)}`);
    }
  }
}
fs.writeFileSync(process.argv[3], out.join("\n") + "\n");
console.log(cases.length, "cases", out.length, "values");
