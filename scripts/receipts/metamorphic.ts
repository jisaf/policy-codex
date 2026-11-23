// Receipt records: metamorphic tests (ported from the spike's
// metamorphic.ts). The same money stated in each way the record permits
// must give the same answer where the policy says it should, and four
// hand-built families must give the rule's answer.
//
// Relations, over every translated household (run by harness.ts):
//   MA-1 split    a receipt split into two records with the same fields, the
//                 amounts (and earmarks, per-payment amounts) summing to the
//                 original, gives the same outcomes. Policy says NOT invariant
//                 for gambling winnings (SNAP's substantial winnings are one
//                 game's prize, 4.403.I): left out.
//   MA-2 order    the receipts in reverse order give the same outcomes.
//   MA-3 month    a recurring receipt stated with no month and the same
//                 receipt stated for the month evaluated give the same
//                 outcomes in that month, for receipts no rule reads in
//                 another month (irregular and charitable receipts are summed
//                 over the quarter, life-threatening-condition gifts over the
//                 year: left out).
//                 Child support is left out too: Colorado Works reads the
//                 six months before a redetermination (3.605.5.C).
//   MA-4 residual other_taxable relabelled other_nontaxable gives the same
//                 LEAP, SNAP, Adult Financial and Colorado Works outcomes
//                 (MAGI would differ; Medicaid still reads the old facts).
// The relations cover Colorado Works from phase 2: its unearned income for
// eligibility and the grant, a deemed person's, and its verification flag.
// Families (each with the rule's answer, checked):
//   F1 $900 child support and a $3,000 one-time crime victim compensation
//      payment on 2026-11-03 (LEAP application 2026-11-10, wages $2,000):
//      LEAP household income 2,900 (3.752.23.G), SNAP unearned 900 (4.405.A.27,
//      E), AF deemable unearned 900 (3.520.786.J), in every statement.
//   F2 a $2,000 one-time child support arrears payment on 2026-10-25, inside
//      the income verification period: LEAP household income 4,000
//      (3.752.21; 3.752.22.A).
//   F3 unemployment $100 a week (five payments in February) and a $300
//      quarterly dividend paid in February: SNAP unearned
//      100 x 4.3 + 300 x 0.333333 = 529.9999 (4.402.A.2).
//   F4 $100 of $300 set aside under a PASS: the same LEAP, SNAP, AF and
//      Colorado Works answer whether the $300 is Social Security or a pension.
// Colorado Works (phase 2) in the same families: F1 counts the $900 of
//   current support for eligibility at application (3.605.5.A) and nothing
//   in the grant (B), the crime victim payment exempt (3.605.4.A.8); F3
//   counts what is received in the month (3.605.1.A.1): 500 + 300 = 800.
//   F5 a $2,000 workers' compensation award including $600 of claim
//      expenses and $400 of VA Aid and Attendance, $150 of it used for
//      uncovered medical care: Colorado Works 1,400 + 250 = 1,650
//      (3.605.3.B.4, 3.605.4.A.6), whether the parts are fields of the
//      receipts or the receipts are split.
import { caseToSpec, type HouseholdCase } from "../../src/engine/cases";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { valuesEqual as ve } from "../../src/engine/values";
import { createEngine } from "../../src/engine/engine";
import type { Ledger } from "./ledgers";
import type { Receipt } from "./translate";

const eq = (a: unknown, b: unknown) => (a == null && b == null) || (a != null && b != null && ve(a, b));
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const IDS = ["leap_person_unearned_income", "leap_household_income", "leap_is_eligible", "snap_person_unearned_income",
  "snap_household_gross_income", "snap_allotment", "af_unearned_income_other_than_ssi", "af_relative_deemable_unearned_income",
  "af_countable_income", "af_deemed_relative_income", "af_deemed_sponsor_income",
  "cw_countable_unearned_income", "cw_payment_countable_unearned_income", "cw_countable_income", "cw_payment_countable_income",
  "cw_sponsor_deemed_income", "cw_budgetary_member_deemed_income", "cw_has_countable_unearned_income", "cw_eligibility_status", "cw_grant_amount"];

function outcomes(m: Ledger, c: HouseholdCase, onlyMonth?: string): Map<string, unknown> {
  const data = makeCase(m.ix, caseToSpec(c));
  const months = new Set<string>([c.as_of.slice(0, 7)]);
  const app = c.case_facts?.leap_application_date as string | undefined;
  if (app) months.add(app.slice(0, 7));
  const out = new Map<string, unknown>();
  for (const pid of Object.keys(c.persons)) for (const id of IDS) for (const mo of months) {
    if (onlyMonth && mo !== onlyMonth) continue;
    if (!m.ix.byIdentifier.has(id)) continue;
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
    if (Array.isArray(rs)) p.facts!.receipts = f(rs);
  }
  return n;
};
const EARMARKS = ["pass_set_aside", "claim_expense", "spent_on_covered_costs", "used_for_uncovered_medical_care",
  "transferred_to_child_support_agency", "paid_to_former_spouse", "recouped", "recouped_for_intentional_violation",
  "for_person_living_elsewhere", "per_payment", "hours_served"];
const split = (rs: Receipt[]) => rs.flatMap((r) => {
  if (typeof r.amount !== "number" || r.amount === 0 || r.kind === "gambling_winnings") return [r];
  const a = { ...r }, b = { ...r };
  a.amount = r.amount * 0.5; b.amount = r.amount - a.amount;
  for (const k of EARMARKS) if (typeof r[k] === "number") { a[k] = (r[k] as number) * 0.5; b[k] = (r[k] as number) - (a[k] as number); }
  return [a, b];
});

export function runMetamorphic(m: Ledger, households: HouseholdCase[]): { lines: string[]; violations: number } {
  const tally: Record<string, { cases: number; violations: number; detail: string[] }> = {};
  const rel = (name: string, base: Map<string, unknown>, alt: Map<string, unknown>, id: string) => {
    const t = (tally[name] ??= { cases: 0, violations: 0, detail: [] });
    t.cases++;
    const d = diff(base, alt);
    if (d.length) { t.violations++; t.detail.push(`${id}: ${d.slice(0, 4).join("; ")}`); }
  };
  for (const c of households) {
    const hasReceipts = Object.values(c.persons).some((p) => Array.isArray(p.facts?.receipts) && (p.facts!.receipts as unknown[]).length);
    if (!hasReceipts) continue;
    const base = outcomes(m, c);
    rel("MA-1 split", base, outcomes(m, mapReceipts(c, split)), c.id);
    rel("MA-2 order", base, outcomes(m, mapReceipts(c, (rs) => [...rs].reverse())), c.id);
    const mo = c.as_of.slice(0, 7);
    const pinned = mapReceipts(c, (rs) => rs.map((r) => (r.month === undefined && r.date === undefined && r.frequency !== "once" && !r.irregular &&
      !["charitable_need_based_cash", "charitable_gift_life_threatening_condition", "child_support"].includes(r.kind) ? { ...r, month: mo } : r)));
    rel("MA-3 month", outcomes(m, c, mo), outcomes(m, pinned, mo), c.id);
    rel("MA-4 residual", base, outcomes(m, mapReceipts(c, (rs) => rs.map((r) => (r.kind === "other_taxable" ? { ...r, kind: "other_nontaxable" } : r)))), c.id);
  }
  const lines: string[] = ["| Relation | Households | Violations |", "|---|---|---|"];
  let violations = 0;
  for (const [k, t] of Object.entries(tally)) { lines.push(`| ${k} | ${t.cases} | ${t.violations} |`); violations += t.violations; }
  for (const [k, t] of Object.entries(tally)) if (t.detail.length) { lines.push("", `${k} violations:`); for (const d of t.detail.slice(0, 20)) lines.push("- " + d); }

  // the families, each with the rule's answer
  const fams = families(m, households);
  lines.push("", "| Family | Statement | Identifier | Value | Rule |", "|---|---|---|---|---|");
  for (const f of fams) {
    lines.push(`| ${f.family} | ${f.label} | ${f.id} | ${JSON.stringify(f.got)} | ${f.want}${eq(f.got, f.want) ? "" : " **VIOLATION**"} |`);
    if (!eq(f.got, f.want)) violations++;
  }
  return { lines, violations };
}

function families(m: Ledger, households: HouseholdCase[]) {
  const leapSrc = households.find((c) => c.id === "CO-224");
  const snapSrc = households.find((c) => c.id === "CO-155");
  const out: Array<{ family: string; label: string; id: string; got: unknown; want: unknown }> = [];
  if (!leapSrc || !snapSrc) return out;
  const leapBase = clone(leapSrc);
  const withReceipts = (b: HouseholdCase, rs: Receipt[]) => { const c = clone(b); c.persons.p1.facts = { ...(c.persons.p1.facts ?? {}), receipts: rs }; return c; };
  const ev = (c: HouseholdCase, id: string, month: string) => {
    try { return evaluate(m.ix, makeCase(m.ix, caseToSpec(c)), id, "p1", month); } catch (ex) { return "error: " + (ex as Error).message; }
  };
  // A family's identifier is checked once its program reads the receipts.
  const readsReceipts = new Set(createEngine(m.ledger.items, m.ledger.meta).impact(["receipts"]));
  const check = (family: string, label: string, c: HouseholdCase, want: Record<string, unknown>, month: string) => {
    for (const [id, w] of Object.entries(want)) if (readsReceipts.has(id)) out.push({ family, label, id, got: ev(c, id, month), want: w });
  };
  const F1 = { leap_household_income: 2900, snap_person_unearned_income: 900, af_relative_deemable_unearned_income: 900,
    cw_countable_unearned_income: 900, cw_payment_countable_unearned_income: 0 };
  check("F1", "dated", withReceipts(leapBase, [{ kind: "child_support", amount: 900 }, { kind: "crime_victim_compensation", amount: 3000, frequency: "once", month: "2026-11", date: "2026-11-03" }]), F1, "2026-11");
  check("F1", "by month only", withReceipts(leapBase, [{ kind: "child_support", amount: 900 }, { kind: "crime_victim_compensation", amount: 3000, frequency: "once", month: "2026-11" }]), F1, "2026-11");
  check("F1", "frequency left at its default", withReceipts(leapBase, [{ kind: "child_support", amount: 900 }, { kind: "crime_victim_compensation", amount: 3000, month: "2026-11" }]), F1, "2026-11");
  check("F2", "dated in the period", withReceipts(leapBase, [{ kind: "child_support_arrears", amount: 2000, frequency: "once", month: "2026-10", date: "2026-10-25" }]), { leap_household_income: 4000 }, "2026-11");
  const snapBase = clone(snapSrc);
  check("F3", "two receipts, each with its own frequency", withReceipts(snapBase, [
    { kind: "unemployment_compensation", amount: 500, month: "2027-02", frequency: "weekly", per_payment: 100 },
    { kind: "interest_and_dividends", amount: 300, month: "2027-02", frequency: "quarterly", per_payment: 300 },
  ]), { snap_person_unearned_income: 529.9999, cw_countable_unearned_income: 800 }, "2027-02");
  const F5 = { cw_countable_unearned_income: 1650, cw_payment_countable_unearned_income: 1650 };
  check("F5", "earmarks as fields", withReceipts(leapBase, [
    { kind: "workers_compensation", amount: 2000, claim_expense: 600 },
    { kind: "va_aid_and_attendance", amount: 400, used_for_uncovered_medical_care: 150 },
  ]), F5, "2026-11");
  check("F5", "each receipt split in two", withReceipts(leapBase, [
    { kind: "workers_compensation", amount: 1500, claim_expense: 600 }, { kind: "workers_compensation", amount: 500 },
    { kind: "va_aid_and_attendance", amount: 150, used_for_uncovered_medical_care: 150 }, { kind: "va_aid_and_attendance", amount: 250 },
  ]), F5, "2026-11");
  for (const id of ["leap_household_income", "snap_person_unearned_income", "af_relative_deemable_unearned_income", "cw_countable_unearned_income"].filter((x) => readsReceipts.has(x))) {
    const ss = ev(withReceipts(leapBase, [{ kind: "social_security", amount: 300, pass_set_aside: 100 }]), id, "2026-11");
    out.push({ family: "F4", label: "pension 300, PASS 100 (equals Social Security 300, PASS 100)", id,
      got: ev(withReceipts(leapBase, [{ kind: "pension", amount: 300, pass_set_aside: 100 }]), id, "2026-11"), want: ss });
  }
  return out;
}
