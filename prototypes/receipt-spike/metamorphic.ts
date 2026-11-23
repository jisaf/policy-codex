// Receipt spike: metamorphic tests. The same money stated in each way a model
// permits must give the same answer where the policy says it should.
//
// Relations (property tests over every translated household):
//   MA-1 split    Model A: a receipt split into two records with the same fields and amounts (and
//                 earmarks, per_payment) summing to the original gives the same outcomes. Policy says
//                 NOT invariant for SNAP's substantial lottery winnings (a single game's prize,
//                 4.403.I): split lottery receipts are excluded from the relation.
//   MA-2 order    Model A: the receipts in reverse order give the same outcomes.
//   MA-3 month    Model A: a receipt stated with no month (every month) and the same receipt stated
//                 for the month evaluated give the same outcomes in that month, for receipts no rule
//                 reads in another month (irregular and charitable receipts are summed over the
//                 quarter, a one-time receipt over the LEAP period: excluded).
//   MA-4 residual Model A: other_taxable relabelled other_nontaxable gives the same outcomes for
//                 LEAP, SNAP and Adult Financial (policy: MAGI would differ; not in the slices).
//   MB-1 residual Model B: the taxable residual moved into the nontaxable residual: as MA-4.
//   MO-1 residual today's ledger: other_unearned_income_taxable moved into _nontaxable: as MA-4.
// Families (hand-built, with the rule's answer):
//   F1  a $3,000 one-time crime victim compensation payment received 2026-11-03 (LEAP application
//       2026-11-10; wages $2,000): every statement the model permits; rule: LEAP household income
//       2,000 (3.752.23.G), SNAP unearned 0 (4.405.A.27, E), AF unearned other than SSI 0 (3.520.786.J).
//   F2  a $2,000 one-time child support arrears payment received 2026-10-25, inside the LEAP income
//       verification period of a 2026-11-10 application; rule: LEAP household income 4,000
//       (3.752.21 counts child support; one-time receipts of the period, 3.752.22.A).
//   F3  two incomes paid other than monthly: unemployment $100 a week (five payments, $500, in
//       February) and a $300 quarterly dividend paid in February; rule (SNAP, 4.402.A.2): 100 × 4.3
//       + 300 × 0.333333 = 529.9999.
//   F4  PASS: $100 of $300 set aside, the $300 being Social Security or a pension: LEAP, SNAP and AF
//       give the same answer either way (3.752.23.DD, 4.405.A.22, 3.520.786.I).
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { loadModel, baseLedger, spikeDir, type Model } from "./ledger";
import { translate, type Receipt } from "./translate";
import { generated } from "./generate";
import { caseToSpec, type HouseholdCase } from "../../src/engine/cases";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { valuesEqual as ve } from "../../src/engine/values";

const eq = (a: unknown, b: unknown) => (a == null && b == null) || (a != null && b != null && ve(a, b));
const old = loadModel("old"), A = loadModel("a"), B = loadModel("b");
const IDS = ["leap_person_unearned_income", "leap_household_income", "leap_is_eligible", "snap_person_unearned_income",
  "snap_household_gross_income", "snap_allotment", "af_unearned_income_other_than_ssi", "af_relative_deemable_unearned_income",
  "af_countable_income", "af_deemed_relative_income", "af_deemed_sponsor_income"];
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function outcomes(m: Model, c: HouseholdCase): Map<string, unknown> {
  const data = makeCase(m.ix, caseToSpec(c));
  const months = new Set<string>([c.as_of.slice(0, 7)]);
  const app = c.case_facts?.leap_application_date as string | undefined;
  if (app) months.add(app.slice(0, 7));
  const out = new Map<string, unknown>();
  for (const pid of Object.keys(c.persons)) for (const id of IDS) for (const mo of months) {
    let v: unknown;
    try { v = evaluate(m.ix, data, id, pid, mo); } catch (ex) { v = "error: " + (ex as Error).message; }
    out.set(`${pid} ${id} @${mo}`, v);
  }
  return out;
}
function diff(x: Map<string, unknown>, y: Map<string, unknown>): string[] {
  const d: string[] = [];
  for (const [k, v] of x) if (!eq(v, y.get(k))) d.push(`${k}: ${JSON.stringify(v)} -> ${JSON.stringify(y.get(k))}`);
  return d;
}
const mapReceipts = (c: HouseholdCase, f: (rs: Receipt[]) => Receipt[]) => {
  const n = clone(c);
  for (const p of Object.values(n.persons)) {
    const rs = p.facts?.receipts as Receipt[] | undefined;
    if (rs) p.facts!.receipts = f(rs);
  }
  return n;
};
const EARMARKS = ["pass_set_aside", "claim_expense", "spent_on_covered_costs", "used_for_uncovered_medical_care",
  "transferred_to_child_support_agency", "paid_to_former_spouse", "recouped", "recouped_for_intentional_violation",
  "for_person_living_elsewhere", "per_payment", "hours_served"];
const split = (rs: Receipt[]) => rs.flatMap((r) => {
  if (typeof r.amount !== "number" || r.amount === 0 || r.kind === "lottery_gambling") return [r];
  const a = { ...r }, b = { ...r };
  a.amount = r.amount * 0.4; b.amount = r.amount - a.amount;
  for (const k of EARMARKS) if (typeof r[k] === "number") { a[k] = (r[k] as number) * 0.4; b[k] = (r[k] as number) - (a[k] as number); }
  return [a, b];
});

// the population: every stored, probe and generated household, translated
const probeDir = "/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/probe-inv";
const pop: HouseholdCase[] = [...baseLedger().cases];
if (fs.existsSync(probeDir)) for (const f of fs.readdirSync(probeDir).filter((x) => /^out-.*\.yaml$/.test(x))) pop.push(...(parseYaml(fs.readFileSync(path.join(probeDir, f), "utf8")) as HouseholdCase[]));
pop.push(...generated());

const report: string[] = [];
const tally: Record<string, { cases: number; violations: number; detail: string[] }> = {};
const rel = (name: string, m: Model, base: HouseholdCase, alt: HouseholdCase) => {
  const t = (tally[name] ??= { cases: 0, violations: 0, detail: [] });
  t.cases++;
  const d = diff(outcomes(m, base), outcomes(m, alt));
  if (d.length) { t.violations++; t.detail.push(`${base.id}: ${d.slice(0, 4).join("; ")}`); }
};
for (const c of pop) {
  const tr = translate(c, old.ix);
  const hasReceipts = Object.values(tr.a.persons).some((p) => Array.isArray(p.facts?.receipts) && (p.facts!.receipts as unknown[]).length);
  if (hasReceipts) {
    rel("MA-1 split", A, tr.a, mapReceipts(tr.a, split));
    rel("MA-2 order", A, tr.a, mapReceipts(tr.a, (rs) => [...rs].reverse()));
    const mo = c.as_of.slice(0, 7);
    const pinned = mapReceipts(tr.a, (rs) => rs.map((r) => (r.month === undefined && r.frequency !== "once" && !r.irregular && r.kind !== "charitable_need_based_cash" ? { ...r, month: mo } : r)));
    // compare in the as_of month only
    const only = (x: Map<string, unknown>) => new Map([...x].filter(([k]) => k.endsWith("@" + mo)));
    const t = (tally["MA-3 month"] ??= { cases: 0, violations: 0, detail: [] });
    t.cases++;
    const d = diff(only(outcomes(A, tr.a)), only(outcomes(A, pinned)));
    if (d.length) { t.violations++; t.detail.push(`${c.id}: ${d.slice(0, 4).join("; ")}`); }
    rel("MA-4 residual", A, tr.a, mapReceipts(tr.a, (rs) => rs.map((r) => (r.kind === "other_taxable" ? { ...r, kind: "other_nontaxable" } : r))));
  }
  const moveB = clone(tr.b);
  let movedB = false;
  for (const p of Object.values(moveB.persons)) {
    for (const bucket of [p.month_defaults ?? {}, ...Object.values(p.months ?? {})]) {
      const t = bucket.unearned_income_not_otherwise_named_taxable;
      if (typeof t === "number" && t > 0 && typeof bucket.unearned_income_not_otherwise_named_nontaxable === "number") {
        bucket.unearned_income_not_otherwise_named_nontaxable = (bucket.unearned_income_not_otherwise_named_nontaxable as number) + t;
        bucket.unearned_income_not_otherwise_named_taxable = 0;
        movedB = true;
      }
    }
  }
  if (movedB) rel("MB-1 residual", B, tr.b, moveB);
  const moveO = clone(c);
  let movedO = false;
  for (const p of Object.values(moveO.persons)) {
    for (const bucket of [p.month_defaults ?? {}, ...Object.values(p.months ?? {})]) {
      const t = bucket.other_unearned_income_taxable;
      if (typeof t === "number" && t > 0 && typeof bucket.other_unearned_income_nontaxable === "number") {
        bucket.other_unearned_income_nontaxable = (bucket.other_unearned_income_nontaxable as number) + t;
        bucket.other_unearned_income_taxable = 0;
        movedO = true;
      }
    }
  }
  if (movedO) rel("MO-1 residual", old, c, moveO);
}
report.push("## Property relations over every translated household\n");
report.push("| Relation | Households | Violations |", "|---|---|---|");
for (const [k, t] of Object.entries(tally)) report.push(`| ${k} | ${t.cases} | ${t.violations} |`);
for (const [k, t] of Object.entries(tally)) if (t.detail.length) { report.push(`\n${k} violations:`); for (const d of t.detail.slice(0, 20)) report.push("- " + d); }

// ---- the hand-built families ----
const leapBase = clone(baseLedger().cases.find((c) => c.id === "CO-224")!);
for (const p of Object.values(leapBase.persons)) {
  const md = p.month_defaults ?? {};
  if ("social_security_income" in md) md.social_security_income = 0;
  delete md.pass_set_aside_income;
}
const p1md = () => leapBase.persons.p1.month_defaults!;
const R0 = (): Receipt[] => [];
type Stmt = { label: string; model: Model; c: HouseholdCase };
const withMd = (extra: Record<string, unknown>, facts: Record<string, unknown> = {}, months?: Record<string, Record<string, unknown>>) => {
  const c = clone(leapBase);
  Object.assign(c.persons.p1.month_defaults!, extra);
  c.persons.p1.facts = { ...(c.persons.p1.facts ?? {}), ...facts };
  if (months) c.persons.p1.months = months;
  return c;
};
const withReceipts = (rs: Receipt[]) => { const c = clone(leapBase); c.persons.p1.facts = { ...(c.persons.p1.facts ?? {}), receipts: rs }; return c; };
const withB = (extra: Record<string, unknown>, facts: Record<string, unknown> = {}, months?: Record<string, Record<string, unknown>>) => {
  const c = withMd({ unearned_income_not_otherwise_named_taxable: 0, unearned_income_not_otherwise_named_nontaxable: 0, ...extra }, facts, months);
  return c;
};
void p1md; void R0;
const fam = (name: string, rule: string, stmts: Stmt[], ids: string[], month: string) => {
  report.push(`\n### ${name}\n\nRule: ${rule}\n`);
  report.push(`| Statement | ${ids.join(" | ")} |`, `|---|${ids.map(() => "---").join("|")}|`);
  for (const s of stmts) {
    const data = makeCase(s.model.ix, caseToSpec(s.c));
    const vals = ids.map((id) => { try { return JSON.stringify(evaluate(s.model.ix, data, id, "p1", month)); } catch (ex) { return "error"; } });
    report.push(`| ${s.label} | ${vals.join(" | ")} |`);
  }
};
const ID3 = ["leap_household_income", "snap_person_unearned_income", "af_relative_deemable_unearned_income"];
fam("F1: $900 of monthly child support and a $3,000 one-time crime victim compensation payment on 2026-11-03", "LEAP household income 2900, SNAP unearned 900, AF deemable unearned 900 (3.752.23.G; 4.405.A.27 and E; 3.520.786.J)", [
  { label: "today: crime_victim_compensation_received 3000 (in other nontaxable)", model: old, c: withMd({ child_support_received: 900, crime_victim_compensation_received: 3000, other_unearned_income_nontaxable: 3000 }) },
  { label: "today: + lump_sum_received 3000 + thirty-day lump 3000 (the same money; CO-4960 says it is both)", model: old, c: withMd({ child_support_received: 900, crime_victim_compensation_received: 3000, lump_sum_received: 3000, other_unearned_income_nontaxable: 3000 }, { lump_sum_received_prior_thirty_days: 3000 }) },
  { label: "today: the same + named_source_receipts_in_lump_sum_prior_thirty_days 3000", model: old, c: withMd({ child_support_received: 900, crime_victim_compensation_received: 3000, lump_sum_received: 3000, other_unearned_income_nontaxable: 3000 }, { lump_sum_received_prior_thirty_days: 3000, named_source_receipts_in_lump_sum_prior_thirty_days: 3000 }) },
  { label: "today: lump and crime victim facts, parent not raised (part > parent; nothing rejects it)", model: old, c: withMd({ child_support_received: 900, crime_victim_compensation_received: 3000, lump_sum_received: 3000, other_unearned_income_nontaxable: 0 }, { lump_sum_received_prior_thirty_days: 3000 }) },
  { label: "A: {child_support, 900} and {crime_victim_compensation, 3000, once, 2026-11-03}", model: A, c: withReceipts([{ kind: "child_support", amount: 900 }, { kind: "crime_victim_compensation", amount: 3000, frequency: "once", month: "2026-11", date: "2026-11-03" }]) },
  { label: "A: the same, the payment stated by month only", model: A, c: withReceipts([{ kind: "child_support", amount: 900 }, { kind: "crime_victim_compensation", amount: 3000, frequency: "once", month: "2026-11" }]) },
  { label: "A: the same, the payment stated as recurring (frequency left at its default)", model: A, c: withReceipts([{ kind: "child_support", amount: 900 }, { kind: "crime_victim_compensation", amount: 3000, month: "2026-11" }]) },
  { label: "B: child support 900, crime_victim_compensation_received 3000 (the only statement the partition permits)", model: B, c: withB({ child_support_received: 900, crime_victim_compensation_received: 3000 }) },
  { label: "B: mis-stated as one_time_payment_not_otherwise_named 3000 + window 3000 (forbidden by its meaning; no check can see it)", model: B, c: withB({ child_support_received: 900, one_time_payment_not_otherwise_named: 3000 }, { one_time_payment_not_otherwise_named_prior_thirty_days: 3000 }) },
], ID3, "2026-11");
fam("F2: a $2,000 one-time child support arrears payment on 2026-10-25 (inside the period)", "LEAP household income 4000 (3.752.21; 3.752.22.A)", [
  { label: "today: lump_sum_received 2000 in October (in other nontaxable) + thirty-day lump 2000", model: old, c: withMd({}, { lump_sum_received_prior_thirty_days: 2000 }, { "2026-10": { lump_sum_received: 2000, other_unearned_income_nontaxable: 2000 } }) },
  { label: "today: child_support_received 2000 in October", model: old, c: withMd({}, {}, { "2026-10": { child_support_received: 2000 } }) },
  { label: "A: {child_support_arrears, 2000, once, 2026-10-25}", model: A, c: withReceipts([{ kind: "child_support_arrears", amount: 2000, frequency: "once", month: "2026-10", date: "2026-10-25" }]) },
  { label: "B: child_support_received 2000 in October (the partition's only place for child support)", model: B, c: withB({}, {}, { "2026-10": { child_support_received: 2000, unearned_income_not_otherwise_named_taxable: 0, unearned_income_not_otherwise_named_nontaxable: 0 } }) },
  { label: "B: as a one-time payment not otherwise named (forbidden: child support is named)", model: B, c: withB({}, { one_time_payment_not_otherwise_named_prior_thirty_days: 2000 }, { "2026-10": { one_time_payment_not_otherwise_named: 2000, unearned_income_not_otherwise_named_taxable: 0, unearned_income_not_otherwise_named_nontaxable: 0 } }) },
], ["leap_household_income"], "2026-11");
const snapBase = clone(baseLedger().cases.find((c) => c.id === "CO-155")!);
for (const k of ["rental_property_costs", "rental_income_received", "americorps_payments_received", "crime_victim_compensation_received"]) delete snapBase.persons.p1.month_defaults![k];
Object.assign(snapBase.persons.p1.month_defaults!, { other_unearned_income_nontaxable: 0, other_unearned_income_taxable: 0 });
const snapWith = (md: Record<string, unknown>, facts: Record<string, unknown> = {}, months?: Record<string, Record<string, unknown>>) => {
  const c = clone(snapBase);
  Object.assign(c.persons.p1.month_defaults!, md);
  c.persons.p1.facts = { ...(c.persons.p1.facts ?? {}), ...facts };
  if (months) c.persons.p1.months = months;
  return c;
};
fam("F3: unemployment $100 a week (five payments in February) and a $300 quarterly dividend paid in February", "SNAP unearned 100 × 4.3 + 300 × 0.333333 = 529.9999 (4.402.A.2)", [
  { label: "today: the periodic facts can state one income per person (the weekly one); the dividend is counted as received", model: old, c: snapWith({}, { periodic_unearned_income_per_payment: 100, periodic_unearned_income_frequency: "weekly" }, { "2027-02": { unemployment_income: 500, periodic_unearned_income_received: 500, taxable_interest_and_dividend_income: 300, other_unearned_income_taxable: 300 } }) },
  { label: "A: two receipts, each with its own frequency", model: A, c: (() => { const c = clone(snapBase); c.persons.p1.facts = { ...(c.persons.p1.facts ?? {}), receipts: [{ kind: "unemployment_compensation", amount: 500, month: "2027-02", frequency: "weekly", per_payment: 100 }, { kind: "interest_and_dividends", amount: 300, month: "2027-02", frequency: "quarterly", per_payment: 300 }] }; return c; })() },
  { label: "B: as today (the partition has no per-receipt frequency)", model: B, c: snapWith({ unearned_income_not_otherwise_named_taxable: 0, unearned_income_not_otherwise_named_nontaxable: 0 }, { periodic_unearned_income_per_payment: 100, periodic_unearned_income_frequency: "weekly" }, { "2027-02": { unemployment_income: 500, periodic_unearned_income_received: 500, taxable_interest_and_dividend_income: 300, other_unearned_income_taxable: 300, unearned_income_not_otherwise_named_taxable: 0, unearned_income_not_otherwise_named_nontaxable: 0 } }) },
], ["snap_person_unearned_income"], "2027-02");
fam("F4: $100 of $300 set aside under a PASS", "the same answer whether the $300 is Social Security or a pension", [
  { label: "today: Social Security 300, PASS 100", model: old, c: withMd({ social_security_income: 300, pass_set_aside_income: 100 }) },
  { label: "today: pension 300, PASS 100", model: old, c: withMd({ pension_income: 300, pass_set_aside_income: 100 }) },
  { label: "A: {social_security, 300, pass_set_aside 100}", model: A, c: withReceipts([{ kind: "social_security", amount: 300, pass_set_aside: 100 }]) },
  { label: "A: {pension, 300, pass_set_aside 100}", model: A, c: withReceipts([{ kind: "pension", amount: 300, pass_set_aside: 100 }]) },
  { label: "B: Social Security 300, PASS 100 (part of the group)", model: B, c: withB({ social_security_income: 300, pass_set_aside_income: 100 }) },
  { label: "B: pension 300, PASS 100", model: B, c: withB({ pension_income: 300, pass_set_aside_income: 100 }) },
], ID3, "2026-11");

const out = path.join(spikeDir, "results", "metamorphic.md");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, "# Receipt spike: metamorphic tests\n\n" + report.join("\n") + "\n");
console.log(report.slice(0, 12).join("\n"));
console.log("written " + out);
