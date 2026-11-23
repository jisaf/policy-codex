// Receipt spike: the old-versus-new harness. Every household (stored cases,
// the probe households, the generated households) is evaluated on today's
// ledger with today's facts, and on each model's ledger with the translated
// facts; every outcome that differs is listed with the case's expectation
// when it has one. Usage:
//   npx vite-node prototypes/receipt-spike/harness.ts [--probes <dir>] [--out <file>]
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadModel, baseLedger, spikeDir, type Model } from "./ledger";
import { translate } from "./translate";
import { generated } from "./generate";
import { caseToSpec, type HouseholdCase } from "../../src/engine/cases";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { valuesEqual as ve } from "../../src/engine/values";
const valuesEqual = (a: unknown, b: unknown) => (a == null && b == null) || (a != null && b != null && ve(a, b));

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const probeDir = arg("--probes") ?? "/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/probe-inv";
const outFile = arg("--out") ?? path.join(spikeDir, "results", "harness.txt");
const only = arg("--only");

const old = loadModel("old"), A = loadModel("a"), B = loadModel("b");
const meta = baseLedger().meta;
const programs = ["LEAP", "SNAP", "AdultFinancial", "SunBucks"];
const outcomes = new Set<string>();
for (const p of meta.programs ?? []) if (programs.includes(p.id)) for (const o of p.outcomes ?? []) outcomes.add(o);
for (const id of [
  "leap_person_unearned_income", "leap_household_income", "snap_person_unearned_income", "snap_household_gross_income",
  "snap_household_net_income", "af_countable_income", "af_unearned_income_other_than_ssi", "af_deemed_relative_income",
  "af_deemed_sponsor_income", "af_relative_deemable_unearned_income",
]) outcomes.add(id);

interface Source { label: string; cases: HouseholdCase[] }
const sources: Source[] = [{ label: "stored", cases: baseLedger().cases }];
const probeFiles = fs.existsSync(probeDir) ? fs.readdirSync(probeDir).filter((f) => /^out-.*\.yaml$/.test(f)).sort() : [];
const probes: HouseholdCase[] = [];
for (const f of probeFiles) probes.push(...(parseYaml(fs.readFileSync(path.join(probeDir, f), "utf8")) as HouseholdCase[]));
sources.push({ label: "probes (translated, hand-derived expectations)", cases: probes });
const poolPath = path.join(probeDir, "pool.yaml");
if (fs.existsSync(poolPath)) sources.push({ label: "probe pool (raw reviewer households)", cases: parseYaml(fs.readFileSync(poolPath, "utf8")) as HouseholdCase[] });
sources.push({ label: "generated", cases: generated() });

function monthsOf(c: HouseholdCase): string[] {
  const ms = new Set<string>([c.as_of.slice(0, 7)]);
  const app = c.case_facts?.leap_application_date as string | undefined;
  if (app) ms.add(app.slice(0, 7));
  for (const ex of Object.values(c.expect ?? {})) for (const v of Object.values(ex)) {
    if (v && typeof v === "object" && !Array.isArray(v)) for (const k of Object.keys(v)) if (/^\d{4}-\d{2}$/.test(k)) ms.add(k);
  }
  return [...ms].sort();
}

function run(m: Model, c: HouseholdCase, ids: string[], months: string[]): Map<string, unknown> {
  const data = makeCase(m.ix, caseToSpec(c));
  const out = new Map<string, unknown>();
  for (const pid of Object.keys(c.persons)) {
    for (const id of ids) {
      const it = m.ix.byIdentifier.get(id);
      if (!it) continue;
      const ms = it.scope === "person-month" || it.scope === "month" ? months : [null];
      for (const mo of ms) {
        let v: unknown;
        try { v = evaluate(m.ix, data, id, it.scope === "case" || it.scope === "global" || it.scope === "month" ? null : pid, mo); }
        catch (ex) { v = "error: " + (ex as Error).message; }
        out.set(`${pid}|${id}|${mo ?? ""}`, v);
      }
    }
  }
  return out;
}

const lines: string[] = [];
const summary: string[] = [];
const allNotes: string[] = [];
const t0 = Date.now();
for (const src of sources) {
  let n = 0, cmp = 0;
  const diffs: Record<"a" | "b", number> = { a: 0, b: 0 };
  const diffCases: Record<"a" | "b", Set<string>> = { a: new Set(), b: new Set() };
  lines.push(`\n## ${src.label} (${src.cases.length} households)\n`);
  for (const c of src.cases) {
    if (only && c.id !== only) continue;
    n++;
    const ids = [...outcomes, ...Object.values(c.expect ?? {}).flatMap((e) => Object.keys(e))];
    const uniq = [...new Set(ids)];
    const months = monthsOf(c);
    let tr;
    try { tr = translate(c, old.ix); } catch (ex) { lines.push(`${c.id}: translation failed: ${(ex as Error).message}`); continue; }
    allNotes.push(...tr.notes);
    const o = run(old, c, uniq, months);
    const ra = run(A, tr.a, uniq, months);
    const rb = run(B, tr.b, uniq, months);
    for (const [k, ov] of o) {
      cmp++;
      const [pid, id, mo] = k.split("|");
      const ex = (c.expect?.[pid] as Record<string, unknown> | undefined)?.[id];
      const exv = ex !== undefined && mo && ex && typeof ex === "object" && !Array.isArray(ex) ? (ex as Record<string, unknown>)[mo] : ex;
      for (const [label, r] of [["a", ra], ["b", rb]] as const) {
        const nv = r.get(k);
        if (valuesEqual(ov, nv)) continue;
        diffs[label]++;
        diffCases[label].add(c.id);
        lines.push(`${label.toUpperCase()} ${c.id} ${pid} ${id}${mo ? " @" + mo : ""}: old=${JSON.stringify(ov)} new=${JSON.stringify(nv)}` +
          (exv !== undefined ? ` expected=${JSON.stringify(exv)}${valuesEqual(nv, exv) ? " (new matches)" : valuesEqual(ov, exv) ? " (old matches)" : ""}` : ""));
      }
    }
  }
  summary.push(`${src.label}: ${n} households, ${cmp} outcome values compared; Model A differs on ${diffs.a} values in ${diffCases.a.size} households; Model B differs on ${diffs.b} values in ${diffCases.b.size} households`);
}
const text = `# Receipt spike harness: old ledger vs Model A vs Model B\n\nRun ${new Date().toISOString().slice(0, 10)}, ${Math.round((Date.now() - t0) / 1000)} s.\n\n## Summary\n\n${summary.map((s) => "- " + s).join("\n")}\n\n## Differences\n${lines.join("\n")}\n\n## Translation notes\n\n${[...new Set(allNotes)].map((s) => "- " + s).join("\n")}\n`;
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, text);
console.log(summary.join("\n"));
console.log(`written ${outFile}`);
