// Receipt records: generated households for the metamorphic relations
// (metamorphic.ts). The stored households state few of the kinds of
// receipt, so each base household is varied by stating one receipt (or one
// receipt beside a part of it carved into a kind of its own, as the kinds
// allow) at a time, plus the LEAP income verification period families.
//
// Since step E2 (docs/reviews/records-e2-h2.md) the households are written
// in receipts alone: each variant states the records the retired
// translation wrote for the old fact it varied (scripts/receipts/translate.ts,
// removed in E2), and each base is today's stored household with every
// person's receipts emptied, so the variant is the only unearned money.
import type { HouseholdCase } from "../../src/engine/cases";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export type Receipt = Record<string, unknown> & { kind: string; amount?: number };
type Variant = [string, (asOfMonth: string) => Receipt[]];
const r = (kind: string, amount: number, more: Record<string, unknown> = {}): Receipt => ({ kind, amount, ...more });

/** The aggregate and residual kinds, each stated alone (the old aggregates). */
const AGG = ["social_security", "ssi", "pension", "unemployment_compensation", "child_support", "colorado_works_cash",
  "adult_financial_cash", "tax_exempt_interest", "other_taxable", "other_nontaxable"];
/** The kinds that were parts of the residuals, each stated alone at 300:
 *  [kind, its earmark at the full amount, if the old part was one]. */
const PARTS: ReadonlyArray<readonly [string, string?]> = [
  ["educational_assistance"], ["loan"], ["reimbursement"], ["energy_assistance_federal"], ["income_tax_refund"],
  ["property_or_food_tax_refund"], ["federally_excluded_payment"], ["crime_victim_compensation"], ["foster_care_payment"],
  ["kinship_care_payment"], ["colorado_works_diversion"], ["reverse_mortgage"], ["housing_utility_allowance"],
  ["gi_bill_housing_food_allowance"], ["refugee_resettlement"], ["colorado_works_supportive_services"],
  ["workers_compensation", "claim_expense"], ["workforce_program_payment"], ["general_assistance"], ["in_home_care_allowance"],
  ["va_aid_and_attendance", "used_for_uncovered_medical_care"], ["uniformed_services_special_pay"], ["state_veteran_annuity"],
  ["charitable_need_based_cash"], ["migrant_farmworker_emergency_assistance"], ["gift"], ["charitable_gift_life_threatening_condition"],
  ["interest_and_dividends"], ["rental_income"],
];
/** The parts that could be paid as a one-time sum (the old lump-sum overlap). */
const ONE_TIME_ABLE: ReadonlyArray<readonly [string, string?]> = [
  ["crime_victim_compensation"], ["foster_care_payment"], ["kinship_care_payment"], ["colorado_works_diversion"],
  ["reverse_mortgage"], ["housing_utility_allowance"], ["gi_bill_housing_food_allowance"], ["refugee_resettlement"],
  ["colorado_works_supportive_services"], ["workers_compensation", "claim_expense"],
];

export function variants(): Variant[] {
  const v: Variant[] = [["base", () => []]];
  for (const k of AGG) v.push([`${k}=300`, () => [r(k, 300)]]);
  for (const [k, e] of PARTS) v.push([`${k}=300`, () => [r(k, 300, e ? { [e]: 300 } : {})]]);
  v.push(["energy 300 from a nonprofit", () => [r("energy_assistance_other", 300)]]);
  v.push(["federally excluded 300 of which VISTA 200", () => [r("dvsa_title_i_volunteer_payment", 200), r("federally_excluded_payment", 100)]]);
  v.push(["workforce 300 of which vocational allowance 200", () => [r("vocational_training_allowance", 200), r("workforce_program_payment", 100)]]);
  v.push(["sponsor money 300", () => [r("sponsor_payment", 300)]]);
  v.push(["child support 300 of which arrears 100", () => [r("child_support", 200), r("child_support_arrears", 100)]]);
  // a one-time receipt in the month determined
  v.push(["lump sum 300 (inheritance)", (m) => [r("other_nontaxable", 300, { frequency: "once", month: m })]]);
  v.push(["retroactive SS lump 300", (m) => [r("social_security", 300, { frequency: "once", retroactive: true, month: m })]]);
  v.push(["retroactive SSI lump 300", (m) => [r("ssi", 300, { frequency: "once", retroactive: true, month: m })]]);
  for (const [k, e] of ONE_TIME_ABLE) v.push([`${k} 300 paid once`, (m) => [r(k, 300, { ...(e ? { [e]: 300 } : {}), frequency: "once", month: m })]]);
  v.push(["SS 300 of which PASS 100", () => [r("social_security", 300, { pass_set_aside: 100 })]]);
  v.push(["pension 300 of which recouped 100", () => [r("pension", 300, { recouped: 100 })]]);
  v.push(["pension 300 of which recouped 100 for an intentional violation", () => [r("pension", 300, { recouped: 100, recouped_for_intentional_violation: 100 })]]);
  v.push(["child support 300 of which 100 to IV-D", () => [r("child_support", 300, { transferred_to_child_support_agency: 100 })]]);
  v.push(["pension 300 of which 100 to a former spouse", () => [r("pension", 300, { paid_to_former_spouse: 100 })]]);
  v.push(["other 300 of which 100 for a person elsewhere", () => [r("other_nontaxable", 300, { for_person_living_elsewhere: 100 })]]);
  v.push(["irregular 20", () => [r("other_nontaxable", 20, { irregular: true })]]);
  v.push(["lottery 300", (m) => [r("gambling_winnings", 300, { frequency: "once", month: m })]]);
  v.push(["lottery 5000", (m) => [r("gambling_winnings", 5000, { frequency: "once", month: m })]]);
  v.push(["AmeriCorps 300 for 40 hours", () => [r("americorps", 300, { hours_served: 40 })]]);
  v.push(["AmeriCorps 300 for 10 hours", () => [r("americorps", 300, { hours_served: 10 })]]);
  v.push(["AmeriCorps 300, hours not stated", () => [r("americorps", 300)]]);
  v.push(["other nontaxable, amount not stated", () => [{ kind: "other_nontaxable" }]]);
  // receipts migration phase 3: the kinds of their own for the parts of a receipt
  v.push(["P3 adoption subsidy 300", () => [r("adoption_subsidy", 300)]]);
  v.push(["P3 early childhood research 300", () => [r("early_childhood_research_payment", 300)]]);
  v.push(["P3 board only 300", () => [r("board_only_payment", 300)]]);
  v.push(["P3 room only 300", () => [r("room_only_payment", 300)]]);
  v.push(["P3 military allotment for persons elsewhere 300", () => [r("military_allotment", 300, { for_person_living_elsewhere: 300 })]]);
  v.push(["P3 educational assistance 300 of which school conditional 200", () => [r("school_attendance_conditional_benefit", 200), r("educational_assistance", 100)]]);
  v.push(["P3 savings distribution 300", () => [r("savings_account_distribution", 300)]]);
  v.push(["P3 SMIB refund 120", () => [r("medicare_premium_refund", 120)]]);
  v.push(["P3 insurance cash value 300", () => [r("insurance_cash_value", 300)]]);
  v.push(["P3 lump sum 3000 of which 1000 spent or designated", (m) => [r("other_nontaxable", 3000, { frequency: "once", designated_for_lump_sum_costs: 1000, month: m })]]);
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
  // phase 2: a CCCAP parent earning $2,000 (probe Y-7's household) and a SUN
  // Bucks child tested on income (probe RV2-S2's household)
  { id: "CO-345", person: "p1", label: "CCCAP" },
  { id: "CO-372", person: "p2", label: "SUN Bucks child" },
  // phase 2: Medicaid and CHP+ (MAGI, the SSI method, deeming, long-term
  // care, the buy-ins, the Medicare Savings Programs)
  { id: "CO-202", person: "p1", label: "MA MAGI parent" },
  { id: "CO-185", person: "p1", label: "MA aged" },
  { id: "CO-189", person: "p2", label: "MA aged spouse" },
  { id: "CO-186", person: "p2", label: "MA deeming parent" },
  { id: "CO-112", person: "p1", label: "MA LTC" },
  { id: "CO-112", person: "p2", label: "MA community spouse" },
  { id: "CO-187", person: "p1", label: "MA WAWD" },
  { id: "CO-145", person: "p3", label: "MA CBWD child" },
  { id: "CO-114", person: "p1", label: "MA MSP" },
  { id: "CO-386", person: "p1", label: "CHP parent" },
];

/** Every person's receipts emptied (stated: no unearned money), so each
 *  variant starts clean; earnings, holdings and every other fact stay as
 *  the stored household states them. */
function cleanBase(c: HouseholdCase): void {
  for (const p of Object.values(c.persons)) (p.facts ??= {}).receipts = [];
}

/** The person a base varies: named, or the person a sponsor edge points to. */
function personOf(base: HouseholdCase, b: Base): string {
  if (b.person) return b.person;
  const edge = (base.relationships ?? []).find((x) => x[0] === "sponsor" || x[0] === "sponsored_by");
  return edge ? (edge[0] === "sponsor" ? edge[1] : edge[2]) : Object.keys(base.persons).slice(-1)[0];
}

/** The generated households, built from the stored households given. */
export function generated(cases: readonly HouseholdCase[]): HouseholdCase[] {
  const out: HouseholdCase[] = [];
  for (const b of BASES) {
    const src = cases.find((c) => c.id === b.id);
    if (!src) throw new Error(`generated households: no base household ${b.id}`);
    const base = clone(src);
    cleanBase(base);
    const person = personOf(base, b);
    for (const [name, fn] of variants()) {
      const c = clone(base);
      c.id = `G-${b.label.replace(/[^A-Za-z]+/g, "")}-${name.replace(/[^A-Za-z0-9]+/g, "_")}`;
      c.title = `${b.label} base ${b.id} (${person}): ${name}`;
      c.expect = {};
      c.persons[person].facts!.receipts = fn(c.as_of.slice(0, 7));
      out.push(c);
    }
  }
  // LEAP: the income verification period (CO-224: application 2026-11-10;
  // period from 2026-10-10). The thirty-day facts the old statement used
  // to place a payment inside or outside the period are its date here.
  const leap = cases.find((c) => c.id === "CO-224");
  if (leap) {
    const base = clone(leap);
    cleanBase(base);
    const win: Array<[string, Receipt[]]> = [
      ["inheritance 2000 in October, inside the period", [r("other_nontaxable", 2000, { frequency: "once", month: "2026-10", date: "2026-10-31" })]],
      ["inheritance 2000 in October, outside the period", [r("other_nontaxable", 2000, { frequency: "once", month: "2026-10", date: "2026-10-09" })]],
      ["inheritance 2000 in October, not dated", [r("other_nontaxable", 2000, { frequency: "once", month: "2026-10" })]],
      ["lottery 5000 in October, inside the period", [r("gambling_winnings", 5000, { frequency: "once", month: "2026-10", date: "2026-10-31" })]],
      ["crime victim 3000 one-time in October, inside the period", [r("crime_victim_compensation", 3000, { frequency: "once", month: "2026-10", date: "2026-10-31" })]],
      ["crime victim 900 monthly and an unrelated inheritance 2000, both in November", [r("crime_victim_compensation", 900, { month: "2026-11" }),
        r("other_nontaxable", 2000, { frequency: "once", month: "2026-11", date: "2026-11-09" })]],
    ];
    for (const [name, rs] of win) {
      const c = clone(base);
      c.id = `G-LEAPwin-${name.replace(/[^A-Za-z0-9]+/g, "_").slice(0, 40)}`;
      c.title = `LEAP base CO-224: ${name}`;
      c.expect = {};
      c.persons.p1.facts!.receipts = rs;
      out.push(c);
    }
  }
  return out;
}
