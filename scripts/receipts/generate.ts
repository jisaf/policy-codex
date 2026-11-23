// Receipt records harness: generated households (restructure review, change
// A; ported from the spike). The stored households state few of the money
// facts the receipts restate, so each base household is varied by stating
// one money fact (or one overlapping pair, as the part-of definitions allow)
// at a time, with its parent fact raised by the same amount where the
// definition makes it "part of" the parent, plus the LEAP income
// verification period families. Stated in the old facts; the harness
// translates them like any stored household.
import type { HouseholdCase } from "../../src/engine/cases";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

type Md = Record<string, unknown>;
type Variant = [string, (md: Md) => void];
const add = (md: Md, k: string, v: number) => { md[k] = ((md[k] as number) ?? 0) + v; };
const NONTAX = "other_unearned_income_nontaxable", TAX = "other_unearned_income_taxable";

const AGG = ["social_security_income", "ssi_income", "pension_income", "unemployment_income", "child_support_received",
  "tanf_cash_income", "adult_financial_cash_income", "tax_exempt_interest", TAX, NONTAX];
const PARTS_N = ["educational_assistance_received", "loan_proceeds_received", "expense_reimbursements_received",
  "energy_assistance_received", "tax_refunds_and_credits_received", "property_or_food_tax_refund_received",
  "federally_excluded_payments_received", "crime_victim_compensation_received", "foster_care_provider_payments_received",
  "kinship_care_payments_received", "tanf_diversion_payment_received", "reverse_mortgage_payments_received",
  "housing_utility_allowance_received", "gi_bill_housing_and_food_allowances_received", "refugee_resettlement_payments_received",
  "tanf_supportive_service_payments_received", "workers_compensation_claim_expense_amounts_received", "workforce_program_payments_received",
  "general_or_emergency_assistance_received", "in_home_care_allowance_received", "va_aid_and_attendance_used_for_uncovered_care",
  "uniformed_services_special_pay_received", "state_veteran_annuity_received", "charitable_need_based_cash_received",
  "migrant_farmworker_emergency_assistance_received", "gifts_received", "charitable_gifts_for_life_threatening_condition_received"];
const PARTS_T = ["taxable_interest_and_dividend_income", "rental_income_received"];
const ONE_TIME_ABLE = ["crime_victim_compensation_received", "foster_care_provider_payments_received", "kinship_care_payments_received",
  "tanf_diversion_payment_received", "reverse_mortgage_payments_received", "housing_utility_allowance_received",
  "gi_bill_housing_and_food_allowances_received", "refugee_resettlement_payments_received", "tanf_supportive_service_payments_received",
  "workers_compensation_claim_expense_amounts_received"];

export function variants(): Variant[] {
  const v: Variant[] = [["base", () => {}]];
  for (const f of AGG) v.push([`${f}=300`, (md) => add(md, f, 300)]);
  for (const f of PARTS_N) v.push([`${f}=300 (part of nontaxable)`, (md) => { add(md, f, 300); add(md, NONTAX, 300); }]);
  for (const f of PARTS_T) v.push([`${f}=300 (part of taxable)`, (md) => { add(md, f, 300); add(md, TAX, 300); }]);
  v.push(["energy 300 of which nonprofit 300", (md) => { add(md, "energy_assistance_received", 300); add(md, "energy_assistance_from_nonprofit_or_supplier_received", 300); add(md, NONTAX, 300); }]);
  v.push(["federally excluded 300 of which VISTA 200", (md) => { add(md, "federally_excluded_payments_received", 300); add(md, "dvsa_title_i_volunteer_payments_received", 200); add(md, NONTAX, 300); }]);
  v.push(["workforce 300 of which vocational allowance 200", (md) => { add(md, "workforce_program_payments_received", 300); add(md, "vocational_training_allowance_received", 200); add(md, NONTAX, 300); }]);
  v.push(["sponsor money 300", (md) => add(md, "money_received_from_sponsor", 300)]);
  v.push(["child support 300 of which arrears 100", (md) => { add(md, "child_support_received", 300); add(md, "child_support_arrears_received", 100); }]);
  v.push(["lump sum 300 (inheritance)", (md) => { add(md, "lump_sum_received", 300); add(md, NONTAX, 300); }]);
  v.push(["retroactive SS lump 300", (md) => { add(md, "retroactive_social_security_lump_sum_received", 300); add(md, "lump_sum_received", 300); add(md, NONTAX, 300); }]);
  v.push(["retroactive SSI/PA lump 300", (md) => { add(md, "retroactive_ssi_or_public_assistance_lump_sum_received", 300); add(md, "lump_sum_received", 300); add(md, NONTAX, 300); }]);
  for (const f of ONE_TIME_ABLE) v.push([`${f} 300 paid as a lump sum`, (md) => { add(md, f, 300); add(md, "lump_sum_received", 300); add(md, NONTAX, 300); }]);
  v.push(["SS 300 of which PASS 100", (md) => { add(md, "social_security_income", 300); add(md, "pass_set_aside_income", 100); }]);
  v.push(["pension 300 of which recouped 100", (md) => { add(md, "pension_income", 300); add(md, "overpayment_recoupment_withheld", 100); }]);
  v.push(["pension 300 of which recouped 100 for an intentional violation", (md) => { add(md, "pension_income", 300); add(md, "overpayment_recoupment_withheld", 100); add(md, "overpayment_recoupment_for_intentional_violation_withheld", 100); }]);
  v.push(["child support 300 of which 100 to IV-D", (md) => { add(md, "child_support_received", 300); add(md, "child_support_received_transferred_to_child_support_agency", 100); }]);
  v.push(["pension 300 of which 100 to a former spouse", (md) => { add(md, "pension_income", 300); add(md, "military_retirement_paid_to_former_spouse", 100); }]);
  v.push(["other 300 of which 100 for a person elsewhere", (md) => { add(md, NONTAX, 300); add(md, "income_received_for_person_living_elsewhere", 100); }]);
  v.push(["irregular 20", (md) => { add(md, NONTAX, 20); add(md, "infrequent_or_irregular_income_received", 20); }]);
  v.push(["lottery 300", (md) => add(md, "lottery_gambling_winnings_received", 300)]);
  v.push(["lottery 5000", (md) => add(md, "lottery_gambling_winnings_received", 5000)]);
  v.push(["AmeriCorps 300 for 40 hours", (md) => { add(md, "americorps_payments_received", 300); add(md, NONTAX, 300); md.americorps_service_hours = 40; }]);
  v.push(["AmeriCorps 300 for 10 hours", (md) => { add(md, "americorps_payments_received", 300); add(md, NONTAX, 300); md.americorps_service_hours = 10; }]);
  v.push(["AmeriCorps 300, hours not stated", (md) => { add(md, "americorps_payments_received", 300); add(md, NONTAX, 300); }]);
  v.push(["other nontaxable not stated", (md) => { delete md[NONTAX]; }]);
  return v;
}

interface Base { id: string; person: string; label: string }
const BASES: Base[] = [
  { id: "CO-224", person: "p1", label: "LEAP" },
  { id: "CO-155", person: "p1", label: "SNAP" },
  { id: "CO-196", person: "p1", label: "AF client" },
  { id: "CO-196", person: "p2", label: "AF spouse (deemed)" },
  { id: "CO-94", person: "", label: "AF sponsor (deemed)" },
  // Colorado Works (phase 2): a member of the unit, a stepparent whose income
  // is deemed to it (3.605.1.A.4), and a sponsor living elsewhere (A.5)
  { id: "CO-358", person: "p1", label: "CW applicant" },
  { id: "CO-83", person: "p2", label: "CW stepparent (deemed)" },
  { id: "CO-162", person: "", label: "CW sponsor (deemed)" },
  // migration phase 2: a CCCAP parent earning $2,000 (probe Y-7's household)
  // and a SUN Bucks child tested on income (probe RV2-S2's household, its
  // Colorado Works payments taken out by cleanBase)
  { id: "CO-345", person: "p1", label: "CCCAP" },
  { id: "CO-372", person: "p2", label: "SUN Bucks child" },
];

/** Zeroes the money a base household states beyond its wages, so each variant starts clean. */
function cleanBase(c: HouseholdCase): void {
  const money = (k: string, v: unknown) => typeof v === "number" && /income|received|lump|set_aside|recoup|withheld|paid_to|_value$/.test(k) && !/paid_legally|toward_arrears|cost|expense|premium/.test(k);
  for (const p of Object.values(c.persons)) {
    if (p.facts) delete p.facts.receipts;
    const md = p.month_defaults ?? {};
    for (const k of Object.keys(md)) {
      if (k === "wages_gross" || k === "hours_worked") continue;
      if (AGG.includes(k)) md[k] = 0;
      else if (money(k, md[k])) delete md[k];
    }
    // a month's money facts (the phase-2 bases state none in the baselines
    // the harness has used; a later baseline's CO-345 states its diversion
    // in November)
    for (const mf of Object.values(p.months ?? {})) for (const k of Object.keys(mf)) if (AGG.includes(k) || money(k, mf[k])) delete mf[k];
  }
}

/** The generated households, built from the stored households given. */
export function generated(cases: readonly HouseholdCase[]): HouseholdCase[] {
  const out: HouseholdCase[] = [];
  for (const b of BASES) {
    const src = cases.find((c) => c.id === b.id);
    if (!src) throw new Error(`generated households: no base household ${b.id}`);
    const base = clone(src);
    cleanBase(base);
    let person = b.person;
    if (!person) {
      // the sponsor: the person a sponsor edge points to
      const edge = (base.relationships ?? []).find((r) => r[0] === "sponsor" || r[0] === "sponsored_by");
      person = edge ? (edge[0] === "sponsor" ? edge[1] : edge[2]) : Object.keys(base.persons).slice(-1)[0];
    }
    for (const [name, fn] of variants()) {
      const c = clone(base);
      c.id = `G-${b.label.replace(/[^A-Za-z]+/g, "")}-${name.replace(/[^A-Za-z0-9]+/g, "_")}`;
      c.title = `${b.label} base ${b.id} (${person}): ${name}`;
      c.expect = {};
      const p = c.persons[person];
      p.month_defaults = p.month_defaults ?? {};
      fn(p.month_defaults);
      out.push(c);
    }
  }
  // LEAP: the income verification period (CO-224: application 2026-11-10; period from 2026-10-10)
  const leap = cases.find((c) => c.id === "CO-224");
  if (leap) {
    const base = clone(leap);
    cleanBase(base);
    const win: Array<[string, (p: HouseholdCase["persons"][string]) => void]> = [
      ["inheritance 2000 in October, inside the period (thirty-day fact stated)", (p) => { p.months = { "2026-10": { lump_sum_received: 2000, [NONTAX]: 2000 } }; p.facts = { ...(p.facts ?? {}), lump_sum_received_prior_thirty_days: 2000 }; }],
      ["inheritance 2000 in October, outside the period (thirty-day fact 0)", (p) => { p.months = { "2026-10": { lump_sum_received: 2000, [NONTAX]: 2000 } }; p.facts = { ...(p.facts ?? {}), lump_sum_received_prior_thirty_days: 0 }; }],
      ["inheritance 2000 in October, thirty-day fact not stated", (p) => { p.months = { "2026-10": { lump_sum_received: 2000, [NONTAX]: 2000 } }; }],
      ["lottery 5000 in October, inside the period", (p) => { p.months = { "2026-10": { lottery_gambling_winnings_received: 5000 } }; p.facts = { ...(p.facts ?? {}), lottery_gambling_winnings_received_prior_thirty_days: 5000 }; }],
      ["crime victim 3000 one-time in October, inside the period", (p) => { p.months = { "2026-10": { crime_victim_compensation_received: 3000, lump_sum_received: 3000, [NONTAX]: 3000 } }; p.facts = { ...(p.facts ?? {}), lump_sum_received_prior_thirty_days: 3000 }; }],
      ["crime victim 900 monthly and an unrelated inheritance 2000, both in November (named-source part stated 0)", (p) => { p.months = { "2026-11": { crime_victim_compensation_received: 900, lump_sum_received: 2000, [NONTAX]: 2900 } }; p.facts = { ...(p.facts ?? {}), lump_sum_received_prior_thirty_days: 2000, named_source_receipts_in_lump_sum_prior_thirty_days: 0 }; }],
    ];
    for (const [name, fn] of win) {
      const c = clone(base);
      c.id = `G-LEAPwin-${name.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 40)}`;
      c.title = `LEAP base CO-224: ${name}`;
      c.expect = {};
      fn(c.persons.p1);
      out.push(c);
    }
  }
  return out;
}
