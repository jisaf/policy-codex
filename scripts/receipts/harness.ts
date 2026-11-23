// Receipt records, the old-versus-new harness: the merge gate of every
// migration commit (product-owner decision of 2026-11-23, condition 4).
//
// Every household is evaluated on the ledger before the migration (the
// baseline ref, reading the scalar unearned-income facts) and on the ledger
// on disk (reading the receipts), and every outcome that differs is listed.
// A difference passes only when allowed-differences.yaml explains it (a
// fixed defect or a decision-4 "cannot determine", each with the case and
// the rule text in docs/reviews/receipts-migration-1.md); any other is a
// regression and the run fails.
//
// Sources: the stored households (volumes/co/tests/cases.yaml, the probe
// households CO-300 to CO-457 among them), as stored; and the generated
// households (generate.ts), stated in the old facts and translated. The
// run also re-translates every stored household and fails when its stored
// receipts are not the translation of its old facts (the transition rule:
// both are written from one statement).
//
//   npm run receipts:harness -- [--base <ref>] [--all-programs] [--only <case>] [--out <file>]
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { caseToSpec, type HouseholdCase } from "../../src/engine/cases";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { valuesEqual as ve } from "../../src/engine/values";
import { BASELINE_REF, currentLedger, ledgerAt, root, type Ledger } from "./ledgers";
import { generated } from "./generate";
import { MONTH_FACTS, PERSON_FACTS, translateCase, withRetired } from "./translate";
import { CHOICES } from "./choices";
import { loadRetired } from "./retired";
import { runMetamorphic } from "./metamorphic";

const eq = (a: unknown, b: unknown) => (a == null && b == null) || (a != null && b != null && ve(a, b));
const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const has = (k: string) => process.argv.includes(k);

/** The programs migrated in phase 1, and Colorado Works in phase 2, whose
 *  outcomes are always compared; with --all-programs, every program's. */
const MIGRATED = ["LEAP", "SNAP", "AdultFinancial", "SunBucks", "ColoradoWorks"];
/** Intermediate figures compared beside the outcomes. */
const FIGURES = [
  "leap_person_unearned_income", "leap_household_income", "leap_person_countable_income",
  "snap_person_unearned_income", "snap_person_gross_income", "snap_household_gross_income", "snap_household_net_income",
  "snap_person_earned_income", "snap_sponsor_deemed_income",
  "af_countable_income", "af_unearned_income_other_than_ssi", "af_deemed_relative_income", "af_deemed_sponsor_income",
  "af_relative_deemable_unearned_income", "af_is_oap_age", "af_and_cs_eligible",
  // Colorado Works (phase 2): the unit's and each deemed person's income
  "cw_countable_unearned_income", "cw_payment_countable_unearned_income", "cw_counted_child_support",
  "cw_countable_income", "cw_payment_countable_income", "cw_sponsor_contributions_counted", "cw_sponsor_deemed_income",
  "cw_budgetary_member_deemed_income", "cw_deemed_parent_income_of_minor_parent", "cw_has_countable_unearned_income",
];

interface Allowed {
  case: string; person?: string; identifier?: string; month?: string;
  class: string; old?: unknown; new?: unknown;
}
interface Diff { source: string; case: string; person: string; identifier: string; month: string; old: unknown; new: unknown; expected?: unknown; allowed?: string }

function matches(a: Allowed, d: Diff): boolean {
  const re = (p: string, s: string) => (p.startsWith("/") && p.endsWith("/") ? new RegExp(p.slice(1, -1)).test(s) : p === s);
  if (!re(a.case, d.case)) return false;
  if (a.person !== undefined && !re(a.person, d.person)) return false;
  if (a.identifier !== undefined && !re(a.identifier, d.identifier)) return false;
  if (a.month !== undefined && a.month !== d.month) return false;
  if (a.old !== undefined && !eq(a.old === "unknown" ? null : a.old, d.old)) return false;
  if (a.new !== undefined && !eq(a.new === "unknown" ? null : a.new, d.new)) return false;
  return true;
}

function monthsOf(c: HouseholdCase): string[] {
  const ms = new Set<string>([c.as_of.slice(0, 7)]);
  const app = c.case_facts?.leap_application_date as string | undefined;
  if (app) ms.add(app.slice(0, 7));
  for (const ex of Object.values(c.expect ?? {})) for (const v of Object.values(ex)) {
    if (v && typeof v === "object" && !Array.isArray(v)) for (const k of Object.keys(v)) if (/^\d{4}-\d{2}$/.test(k)) ms.add(k);
  }
  return [...ms].sort();
}

function run(m: Ledger, c: HouseholdCase, ids: string[], months: string[]): Map<string, unknown> {
  const data = makeCase(m.ix, caseToSpec(c));
  const out = new Map<string, unknown>();
  for (const pid of Object.keys(c.persons)) {
    for (const id of ids) {
      const it = m.ix.byIdentifier.get(id);
      if (!it) continue;
      const scoped = it.scope === "person-month" || it.scope === "month";
      const personless = it.scope === "case" || it.scope === "global" || it.scope === "month";
      if (personless && pid !== Object.keys(c.persons)[0]) continue;
      for (const mo of scoped ? months : [null]) {
        let v: unknown;
        try { v = evaluate(m.ix, data, id, personless ? null : pid, mo); }
        catch (ex) { v = "error: " + (ex as Error).message; }
        out.set(`${pid}|${id}|${mo ?? ""}`, v);
      }
    }
  }
  return out;
}

export function main(): number {
  const base = arg("--base") ?? BASELINE_REF;
  const outFile = arg("--out") ?? path.join(root, "scripts/receipts/results/harness.txt");
  const only = arg("--only");
  const t0 = Date.now();
  const oldL = ledgerAt(base);
  const retired = loadRetired();
  const newL = currentLedger();
  const allowed = (parseYaml(fs.readFileSync(path.join(root, "scripts/receipts/allowed-differences.yaml"), "utf8")) ?? []) as Allowed[];
  const programs = has("--all-programs") ? (newL.ledger.meta.programs ?? []).map((p) => p.id) : MIGRATED;
  const ids = new Set<string>(FIGURES);
  for (const m of [oldL, newL]) for (const p of m.ledger.meta.programs ?? []) if (programs.includes(p.id)) for (const o of p.outcomes ?? []) ids.add(o);

  const sources: Array<{ label: string; cases: Array<{ old: HouseholdCase; new: HouseholdCase }> }> = [];
  const lines: string[] = [];
  const notes: string[] = [];
  const stale: string[] = [];
  // stored households: as stored, on both ledgers; and the stored receipts
  // must be the translation of the old facts
  // A household added since the baseline and written in receipts alone has
  // no statement the old ledger reads: it is checked by its expectations
  // (npm run check), not compared.
  const before = new Set(oldL.ledger.cases.map((c) => c.id));
  const statesOld = (c: HouseholdCase) => Object.values(withRetired(c, retired).persons).some((p) =>
    [p.facts, p.month_defaults, ...Object.values(p.months ?? {})].some((o) => Object.keys(o ?? {}).some((k) => MONTH_FACTS.has(k) || PERSON_FACTS.has(k))));
  const compared = (c: HouseholdCase) => before.has(c.id) || statesOld(c);
  const receiptsOnly = newL.ledger.cases.filter((c) => !compared(c)).map((c) => c.id);
  const stored = newL.ledger.cases.filter(compared).map((c) => {
    const tr = translateCase(c, newL.ix, CHOICES, retired);
    notes.push(...tr.notes);
    if (tr.changed) stale.push(c.id);
    return { old: withRetired(c, retired), new: c.persons && Object.values(c.persons).some((p) => p.facts && "receipts" in p.facts) ? c : tr.value };
  });
  sources.push({ label: "stored households", cases: stored });
  // Both ledgers evaluate the translated household (its old facts kept, its
  // receipts added): from phase 2 the baseline itself reads the receipts for
  // the programs phase 1 moved, and the old facts for the rest.
  const gen = generated(oldL.ledger.cases).map((c) => {
    const tr = translateCase(c, newL.ix, CHOICES);
    notes.push(...tr.notes);
    return { old: tr.value, new: tr.value };
  });
  sources.push({ label: "generated households", cases: gen });

  const diffs: Diff[] = [];
  const summary: Array<{ label: string; households: number; values: number; differ: number; households_differ: number; allowed: number; unexplained: number }> = [];
  for (const src of sources) {
    let n = 0, cmp = 0;
    const before = diffs.length;
    for (const { old: oc, new: nc } of src.cases) {
      if (only && oc.id !== only) continue;
      n++;
      const want = [...ids, ...Object.values(oc.expect ?? {}).flatMap((e) => Object.keys(e))];
      const months = monthsOf(oc);
      const o = run(oldL, oc, [...new Set(want)], months);
      const r = run(newL, nc, [...new Set(want)], months);
      for (const [k, ov] of o) {
        if (!r.has(k)) continue; // an item the migration removed
        cmp++;
        const nv = r.get(k);
        if (eq(ov, nv)) continue;
        const [pid, id, mo] = k.split("|");
        const ex = (oc.expect?.[pid] as Record<string, unknown> | undefined)?.[id];
        const exv = ex !== undefined && mo && ex && typeof ex === "object" && !Array.isArray(ex) ? (ex as Record<string, unknown>)[mo] : ex;
        const d: Diff = { source: src.label, case: oc.id, person: pid, identifier: id, month: mo, old: ov, new: nv };
        if (exv !== undefined) d.expected = exv;
        const a = allowed.find((x) => matches(x, d));
        if (a) d.allowed = a.class;
        diffs.push(d);
      }
    }
    const mine = diffs.slice(before);
    summary.push({
      label: src.label, households: n, values: cmp, differ: mine.length,
      households_differ: new Set(mine.map((d) => d.case)).size,
      allowed: mine.filter((d) => d.allowed).length, unexplained: mine.filter((d) => !d.allowed).length,
    });
  }
  const fmt = (v: unknown) => (v === null || v === undefined ? "unknown" : JSON.stringify(v));
  for (const d of diffs) {
    lines.push(`${d.allowed ? "allowed (" + d.allowed + ")" : "UNEXPLAINED"} ${d.source === "generated households" ? "G" : "S"} ${d.case} ${d.person} ${d.identifier}${d.month ? " @" + d.month : ""}: old ${fmt(d.old)} new ${fmt(d.new)}` +
      (d.expected !== undefined ? ` expected ${fmt(d.expected)}${eq(d.new, d.expected === "unknown" ? null : d.expected) ? " (new matches)" : eq(d.old, d.expected === "unknown" ? null : d.expected) ? " (old matches)" : ""}` : ""));
  }
  // metamorphic relations, over every translated household
  // (the households written in receipts alone among them, from phase 2)
  const meta = has("--no-metamorphic") ? null : runMetamorphic(newL, [...stored.map((x) => x.new),
    ...newL.ledger.cases.filter((c) => receiptsOnly.includes(c.id)), ...gen.map((x) => x.new)]);
  const table = [
    "| Source | Households | Values compared | Values that differ | Households that differ | Allowed | Unexplained |",
    "|---|---|---|---|---|---|---|",
    ...summary.map((s) => `| ${s.label} | ${s.households} | ${s.values} | ${s.differ} | ${s.households_differ} | ${s.allowed} | ${s.unexplained} |`),
  ];
  const byClass = new Map<string, Set<string>>();
  for (const d of diffs) if (d.allowed) { if (!byClass.has(d.allowed)) byClass.set(d.allowed, new Set()); byClass.get(d.allowed)!.add(d.case); }
  const unexplained = diffs.filter((d) => !d.allowed).length;
  const text = [
    `# Receipt records harness: ledger at ${base.slice(0, 12)} vs the ledger on disk`, "",
    `Programs compared: ${programs.join(", ")}; ${Math.round((Date.now() - t0) / 1000)} s.`, "",
    ...table, "",
    `Stored households written in receipts alone (no old statement to compare; checked by their expectations): ${receiptsOnly.length ? receiptsOnly.join(", ") : "none"}.`, "",
    "## Allowed differences by class", "",
    ...[...byClass].map(([k, v]) => `- ${k}: ${v.size} household(s): ${[...v].join(", ")}`), "",
    "## Stored households whose receipts are not the translation of their old facts", "",
    ...(stale.length ? stale.map((s) => `- ${s}`) : ["none"]), "",
    ...(meta ? ["## Metamorphic relations", "", ...meta.lines, ""] : []),
    "## Differences", "", ...lines, "",
    "## Translation notes", "", ...[...new Set(notes)].map((s) => "- " + s), "",
  ].join("\n");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, text);
  console.log(table.join("\n"));
  if (receiptsOnly.length) console.log(`stored households in receipts alone (not compared): ${receiptsOnly.join(", ")}`);
  for (const [k, v] of byClass) console.log(`allowed: ${k}: ${v.size} household(s)`);
  if (meta) console.log(meta.lines.filter((l) => l.startsWith("|")).join("\n"));
  console.log(`written ${path.relative(root, outFile)}`);
  let fail = 0;
  if (unexplained) { console.log(`FAILED: ${unexplained} unexplained difference(s)`); fail = 1; }
  for (const d of diffs.filter((x) => !x.allowed).slice(0, 40)) console.log(`  ${d.case} ${d.person} ${d.identifier}${d.month ? " @" + d.month : ""}: old ${fmt(d.old)} new ${fmt(d.new)}`);
  if (stale.length) { console.log(`FAILED: ${stale.length} stored household(s) whose receipts are not the translation of their old facts: ${stale.slice(0, 20).join(", ")}`); fail = 1; }
  if (meta && meta.violations) { console.log(`FAILED: ${meta.violations} metamorphic violation(s)`); fail = 1; }
  if (!fail) console.log("receipts harness: OK");
  return fail;
}

process.exitCode = main();
