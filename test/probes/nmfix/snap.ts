// Snapshot non-MAGI outputs for stored cases and probe cases.
import fs from "node:fs";
const W = "/home/user/policy-codex/.claude/worktrees/agent-a84186d76c3bacb83";
const { loadLedgerFromDisk } = await import(W + "/src/tools/check");
const { buildIndex } = await import(W + "/src/engine/ledger-index");
const { evaluate, makeCase } = await import(W + "/src/engine/evaluate");
const { caseToSpec, parseCases } = await import(W + "/src/engine/cases");
const led = loadLedgerFromDisk(W, "co");
const ix = buildIndex(led.items, led.meta.relationship_roles ?? null);
const SP = "/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad";
const probes: any[] = [];
for (const f of [SP + "/x-cases-nonmagi.yaml", ...["s1", "s2", "s3", "s4"].map((s) => SP + "/cov2nm/gen/" + s + ".yaml"), SP + "/nmfix/extra.yaml"]) {
  if (fs.existsSync(f)) try { probes.push(...parseCases(fs.readFileSync(f, "utf8"))); } catch (e) { console.log("PARSE", f, (e as Error).message); }
}
const ids = ["ma_ssi_countable_income", "ma_ssi_related_category", "ma_msp_category", "ma_buy_in_category", "ma_ltc_gross_income", "ma_ltc_eligibility_status", "ma_patient_payment", "ma_family_allowance", "ma_ssi_countable_resources", "ma_home_is_countable_resource", "ma_cbwd_eligible", "ma_wawd_countable_income", "ma_pickle_eligible", "ma_qmb_eligible", "ma_ssi_parental_income_deemed"].filter((i) => ix.byIdentifier.has(i));
const want = (process.argv[2] ?? "").split(",").filter(Boolean);
const stored = led.cases.filter((c: any) => !want.length || want.includes(c.id));
for (const c of [...stored, ...probes]) {
  let data;
  try { data = makeCase(ix, caseToSpec(c)); } catch (e) { console.log(c.id, "ERR", (e as Error).message); continue; }
  for (const pid of Object.keys(c.persons)) for (const id of ids) {
    const it = ix.byIdentifier.get(id)!;
    const m = it.scope === "person-month" || it.scope === "month" ? c.as_of.slice(0, 7) : null;
    let v: unknown; try { v = evaluate(ix, data, id, pid, m); } catch (ex) { v = "error"; }
    console.log(`${c.id} ${pid} ${id} = ${JSON.stringify(v)}`);
  }
}
