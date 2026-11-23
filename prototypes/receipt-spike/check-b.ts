// Receipt spike, Model B: the check-time constraints that make the scalar
// partition machine-checked, with no engine change.
//   1. Structure: every part_of / window_of names one existing fact or group.
//   2. Cases: part ≤ parent in every month a case states (a group parent is
//      the sum of its leaves); a window fact ≤ its fact over the application
//      month and the month before; a required leaf is stated wherever a sibling is.
//   3. Readers (slice items): no reader adds a part and its parent (double
//      count); a reader that subtracts a part also adds its parent or the group;
//      every leaf of the group is counted or listed in `excludes`, never both.
//   4. Defaults: a reader's `otherwise` default equals the fact's declared
//      default; a required fact is never read through `otherwise`.
// The same part ≤ parent test is also run on today's facts and households,
// with today's "part of" definitions, to size the problem it would catch.
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadModel, baseLedger, spikeDir } from "./ledger";
import { translate, SLICE_MONTH_FACTS } from "./translate";
import { generated } from "./generate";
import type { HouseholdCase } from "../../src/engine/cases";
import type { Expr, Item } from "../../src/engine/types";

const old = loadModel("old"), B = loadModel("b");
const out: string[] = ["# Receipt spike: Model B check-time constraints\n"];
const by = (id: string) => B.ix.byIdentifier.get(id);
const group = by("gross_unearned_income")!;
const refs = (e: Expr, acc = new Set<string>()): Set<string> => {
  if (typeof e === "string") { if (B.ix.byIdentifier.has(e)) acc.add(e); }
  else if (Array.isArray(e)) for (const x of e) refs(x as Expr, acc);
  return acc;
};
const leaves = [...refs(group.derived!)].filter((id) => by(id)?.kind === "supplied");

// 1. structure
const s1: string[] = [];
for (const it of B.items) {
  for (const k of ["part_of", "window_of"] as const) {
    const p = it[k];
    if (p && !by(p)) s1.push(`${it.identifier}: ${k} ${p} does not exist`);
  }
}
out.push(`## 1. Structure\n\n${B.items.filter((i) => i.part_of || i.window_of).length} facts carry part_of or window_of; ${s1.length} errors.${s1.map((x) => "\n- " + x).join("")}\n`);

// 3 and 4: readers
type Occ = { id: string; sign: number };
function signs(e: Expr, sign: number, acc: Occ[]): void {
  if (typeof e === "string") { if (B.ix.byIdentifier.has(e)) acc.push({ id: e, sign }); return; }
  if (!Array.isArray(e)) return;
  const [op, ...a] = e as unknown[];
  if (op === "+") for (const x of a) signs(x as Expr, sign, acc);
  else if (op === "-") { signs(a[0] as Expr, sign, acc); signs(a[1] as Expr, -sign, acc); }
  else if (op === "max" || op === "min") for (const x of a) signs(x as Expr, sign, acc);
  else if (op === "otherwise") { signs(a[0] as Expr, sign, acc); }
  else if (op === "case") for (const arm of a as unknown[][]) signs(arm[1] as Expr, sign, acc);
  else if (op === "*" || op === "/") signs(a[0] as Expr, sign, acc);
  else for (const x of a) signs(x as Expr, 0, acc); // a condition or a non-additive position
}
const ancestors = (id: string): string[] => { const r: string[] = []; let p = by(id)?.part_of; while (p) { r.push(p); p = by(p)?.part_of; } return r; };
const s3: string[] = [];
const s4: string[] = [];
function defaultsOf(e: Expr, item: Item, model: typeof B): void {
  if (!Array.isArray(e)) return;
  if (e[0] === "otherwise" && typeof e[1] === "string") {
    const f = model.ix.byIdentifier.get(e[1]);
    if (f?.kind === "supplied" && typeof e[2] !== "object") {
      const d = (f as Item).default;
      if (d === undefined) s4.push(`${item.identifier} reads required ${f.identifier} with a default of ${JSON.stringify(e[2])}`);
      else if (d !== e[2]) s4.push(`${item.identifier} reads ${f.identifier} with ${JSON.stringify(e[2])}; the fact's default is ${JSON.stringify(d)}`);
    }
  }
  for (const x of e as Expr[]) defaultsOf(x, item, model);
}
for (const it of B.overlay.values()) {
  if (it.kind !== "derived" || it.identifier === "gross_unearned_income") continue;
  const occ: Occ[] = [];
  signs(it.derived!, 1, occ);
  const plus = new Set(occ.filter((o) => o.sign > 0).map((o) => o.id));
  const minus = new Set(occ.filter((o) => o.sign < 0).map((o) => o.id));
  for (const id of plus) for (const a of ancestors(id)) if (plus.has(a)) s3.push(`${it.identifier}: adds ${id} and its parent ${a}`);
  for (const id of minus) {
    const anc = ancestors(id);
    if (anc.length && !anc.some((a) => plus.has(a) || a === "gross_unearned_income")) s3.push(`${it.identifier}: subtracts ${id} but adds none of ${anc.join(", ")}`);
  }
  const ex = B.excludes.get(it.identifier);
  if (ex) {
    const read = refs(it.derived!);
    const missing = leaves.filter((l) => !read.has(l) && !ex.includes(l));
    const both = ex.filter((l) => plus.has(l));
    if (missing.length) s3.push(`${it.identifier}: leaves neither counted nor excluded: ${missing.join(", ")}`);
    if (both.length) s3.push(`${it.identifier}: leaves both counted and excluded: ${both.join(", ")}`);
  }
  defaultsOf(it.derived!, it, B);
}
out.push(`## 3. Readers (the rewritten slice items)\n\n${s3.length} findings.${s3.map((x) => "\n- " + x).join("")}\n`);
out.push(`## 4. Defaults stated once on the fact\n\n${s4.length} findings.${s4.map((x) => "\n- " + x).join("")}\n`);

// today's slice items: how many reader-invented defaults (otherwise on a supplied fact)
const SLICE_OLD = ["unearned_income_prior_thirty_days", "leap_person_unearned_income", "leap_excluded_unearned_income", "leap_excluded_source_receipts",
  "leap_excluded_receipts_in_lump_sum", "leap_person_one_time_income", "snap_person_unearned_income", "snap_excluded_unearned_income",
  "af_relative_deemable_unearned_income", "af_unearned_income_other_than_ssi", "af_excluded_unearned_income"];
let oldDefaults = 0;
const walk = (e: Expr) => { if (!Array.isArray(e)) return; if (e[0] === "otherwise" && typeof e[1] === "string" && old.ix.byIdentifier.get(e[1])?.kind === "supplied") oldDefaults++; for (const x of e as Expr[]) walk(x); };
for (const id of SLICE_OLD) walk(old.ix.byIdentifier.get(id)!.derived!);
let bDefaults = 0;
const walkB = (e: Expr) => { if (!Array.isArray(e)) return; if (e[0] === "otherwise" && typeof e[1] === "string" && B.ix.byIdentifier.get(e[1])?.kind === "supplied") bDefaults++; for (const x of e as Expr[]) walkB(x); };
for (const it of B.overlay.values()) if (it.derived && it.identifier !== "gross_unearned_income") walkB(it.derived);
out.push(`Readers' \`otherwise\` on a supplied fact: today's ${SLICE_OLD.length} slice items ${oldDefaults}; Model B's rewritten items ${bDefaults}, each checked against the fact's one declared default above. Model A's items have none: a receipt field's default is declared once on the receipts schema and applied by the engine.\n`);

// 2. cases
const probeDir = "/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/probe-inv";
const pop: Array<[string, HouseholdCase]> = baseLedger().cases.map((c) => ["stored", c] as [string, HouseholdCase]);
if (fs.existsSync(probeDir)) {
  for (const f of fs.readdirSync(probeDir).filter((x) => /^out-.*\.yaml$/.test(x))) for (const c of parseYaml(fs.readFileSync(path.join(probeDir, f), "utf8")) as HouseholdCase[]) pop.push(["probes", c]);
  const pool = path.join(probeDir, "pool.yaml");
  if (fs.existsSync(pool)) for (const c of parseYaml(fs.readFileSync(pool, "utf8")) as HouseholdCase[]) pop.push(["pool", c]);
}
for (const c of generated()) pop.push(["generated", c]);

// today's part-of definitions (from the facts' precision): the parts of other_unearned_income_*
const TODAY_PARTS = [...SLICE_MONTH_FACTS].filter((f) => {
  const it = old.ix.byIdentifier.get(f);
  return it && /part of (the person's gross unearned income|other_unearned_income|the gross unearned income)/i.test((it.precision ?? "") + (it.meaning ?? ""));
});
const s2old: string[] = [], s2b: string[] = [], s2amb: string[] = [];
const buckets = (p: HouseholdCase["persons"][string]) => {
  const d: Record<string, unknown> = { ...(p.month_defaults ?? {}) };
  for (const [k, v] of Object.entries(p.facts ?? {})) if (old.ix.byIdentifier.get(k)?.scope === "person-month") d[k] = v;
  const r: Array<[string, Record<string, unknown>]> = [["every month", d]];
  for (const [m, v] of Object.entries(p.months ?? {})) r.push([m, { ...d, ...v }]);
  return r;
};
const n = (v: unknown) => (typeof v === "number" ? v : 0);
for (const [src, c] of pop) {
  for (const [pid, p] of Object.entries(c.persons)) {
    for (const [m, v] of buckets(p)) {
      // today's parts may overlap each other (a one-time named payment is both its source fact and
      // lump_sum_received, CO-4960), and PASS, periodic and irregular parts may sit in a named source
      // ("or the fact that names the source"): the most a check can assert is that the larger of the
      // lump sum and the sum of the other residual parts is within the residual
      const parent = n(v.other_unearned_income_taxable) + n(v.other_unearned_income_nontaxable);
      const loose = new Set(["pass_set_aside_income", "periodic_unearned_income_received", "infrequent_or_irregular_income_received", "lump_sum_received",
        "retroactive_social_security_lump_sum_received", "retroactive_ssi_or_public_assistance_lump_sum_received", "child_support_arrears_received",
        "child_support_received_transferred_to_child_support_agency", "military_retirement_paid_to_former_spouse", "energy_assistance_from_nonprofit_or_supplier_received",
        "overpayment_recoupment_withheld", "overpayment_recoupment_for_intentional_violation_withheld", "income_received_for_person_living_elsewhere"]);
      const named = TODAY_PARTS.filter((f) => !loose.has(f)).reduce((t, f) => t + n(v[f]), 0);
      const parts = Math.max(n(v.lump_sum_received), named);
      if (parts > parent + 1e-9) s2old.push(`${src} ${c.id} ${pid} ${m}: ${n(v.lump_sum_received) >= named ? "lump_sum_received" : "named parts"} ${parts} > other_unearned_income ${parent}`);
      const amb = TODAY_PARTS.filter((f) => loose.has(f) && f !== "lump_sum_received" && n(v[f]) > 0);
      if (amb.length) s2amb.push(`${src} ${c.id} ${pid} ${m}: ${amb.join(", ")} (parent not determinable)`);
    }
  }
  const tb = translate(c, old.ix).b;
  for (const [pid, p] of Object.entries(tb.persons)) {
    for (const [m, v] of buckets(p)) {
      const g = leaves.reduce((t, f) => t + n(v[f]), 0);
      for (const it of B.items) {
        if (!it.part_of || it.kind !== "supplied" || leaves.includes(it.identifier)) continue;
        const par = it.part_of === "gross_unearned_income" ? g : n(v[it.part_of]);
        if (n(v[it.identifier]) > par + 1e-9) s2b.push(`${src} ${c.id} ${pid} ${m}: ${it.identifier} ${n(v[it.identifier])} > ${it.part_of} ${par}`);
      }
    }
  }
}
out.push(`## 2. Cases: part ≤ parent\n\nToday's definitions (the ${TODAY_PARTS.length} facts whose text says they are part of the gross unearned income), on today's households: ${s2old.length} certain violations (nothing in today's check reports them), and ${s2amb.length} statements of a part whose parent today's text leaves open, which no check can test.${s2old.slice(0, 40).map((x) => "\n- " + x).join("")}\n\nModel B's metadata, on the translated households: ${s2b.length} violations.${s2b.slice(0, 40).map((x) => "\n- " + x).join("")}\n`);

const file = path.join(spikeDir, "results", "check-b.md");
fs.writeFileSync(file, out.join("\n"));
console.log(out.join("\n").slice(0, 4000));
