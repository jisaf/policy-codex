// Earned-income records harness: generated households (design 4.4). Each
// track's base households (scripts/records/programs/*.ts) are varied one
// earned fact (or one part and the wages that hold it) at a time, stated in
// the scalar earned facts and translated like a stored household, so the
// two ledgers are compared on pay the stored households do not state.
import type { HouseholdCase } from "../../src/engine/cases";
import type { Base } from "./programs/types";
import { MONTH_FACTS } from "./translate-earnings";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
type Md = Record<string, unknown>;
type Facts = Record<string, unknown>;
type Variant = [string, (md: Md, facts: Facts) => void];
const add = (md: Md, k: string, v: number) => { md[k] = ((md[k] as number) ?? 0) + v; };

/** Parts of wages_gross: each stated with the wages raised by the same amount. */
const PARTS = ["work_study_earnings", "scsep_wages", "scsep_payments_received", "wioa_on_the_job_training_wages",
  "summer_youth_employment_wages", "subsidized_employment_wages", "decennial_census_wages_received",
  "difficulty_of_care_payments_received", "employer_health_insurance_subsidy_received", "short_term_employment_wages",
  "combat_zone_pay_received", "infrequent_or_irregular_earned_income_received", "wages_from_owned_llc_or_s_corporation"];
const BESIDE = ["in_kind_compensation_value", "employer_vendor_payments_received"];
const COSTS = ["self_employment_operating_costs", "self_employment_interest_costs", "self_employment_capital_principal_payments",
  "self_employment_home_business_space_costs", "self_employment_business_vehicle_costs"];

export function variants(): Variant[] {
  const v: Variant[] = [["base", () => {}]];
  v.push(["wages 1200", (md) => add(md, "wages_gross", 1200)]);
  v.push(["wages not stated", (md) => { delete md.wages_gross; }]);
  for (const f of PARTS) v.push([`wages 1200 of which ${f} 300`, (md) => { add(md, "wages_gross", 1200); add(md, f, 300); }]);
  for (const f of BESIDE) v.push([`${f} 300`, (md) => add(md, f, 300)]);
  v.push(["weekly pay 300, wages 1200", (md, f) => { add(md, "wages_gross", 1200); f.wages_pay_frequency = "weekly"; f.wages_gross_per_pay_period = 300; }]);
  v.push(["PASS 100 of wages 1200", (md) => { add(md, "wages_gross", 1200); add(md, "pass_set_aside_earned_income", 100); }]);
  v.push(["business 1500", (md) => add(md, "self_employment_gross_receipts", 1500)]);
  for (const c of COSTS) v.push([`business 1500, ${c} 200`, (md) => { add(md, "self_employment_gross_receipts", 1500); add(md, c, 200); }]);
  v.push(["farm 1500, operating 400", (md, f) => { add(md, "self_employment_gross_receipts", 1500); add(md, "self_employment_operating_costs", 400); f.self_employment_is_farming = true; }]);
  v.push(["boarders 900 from two payers", (md) => { add(md, "room_and_board_payments_received", 900); md.room_and_board_payers_count = 2; }]);
  return v;
}

/** Zeroes the earned facts a base household states, so each variant starts
 *  from no earnings (the facts stated 0, not left out). */
function cleanBase(c: HouseholdCase): void {
  for (const p of Object.values(c.persons)) {
    if (p.facts) delete p.facts.earnings;
    const md = (p.month_defaults ??= {});
    for (const k of Object.keys(md)) if (MONTH_FACTS.has(k)) delete md[k];
    for (const mf of Object.values(p.months ?? {})) for (const k of Object.keys(mf)) if (MONTH_FACTS.has(k)) delete mf[k];
    for (const k of Object.keys(p.facts ?? {})) if (MONTH_FACTS.has(k)) delete p.facts![k];
    md.wages_gross = 0;
    md.self_employment_gross_receipts = 0;
  }
}

/** The generated households for the bases given. */
export function generated(cases: readonly HouseholdCase[], bases: readonly Base[]): HouseholdCase[] {
  const out: HouseholdCase[] = [];
  for (const b of bases) {
    const src = cases.find((c) => c.id === b.id);
    if (!src) throw new Error(`generated households: no base household ${b.id}`);
    const base = clone(src);
    cleanBase(base);
    let person = b.person;
    if (!person) {
      const edge = (base.relationships ?? []).find((r) => r[0] === "sponsor" || r[0] === "sponsored_by");
      person = edge ? (edge[0] === "sponsor" ? edge[1] : edge[2]) : Object.keys(base.persons).slice(-1)[0];
    }
    for (const [name, fn] of variants()) {
      const c = clone(base);
      c.id = `GE-${b.label.replace(/[^A-Za-z]+/g, "")}-${name.replace(/[^A-Za-z0-9]+/g, "_")}`;
      c.title = `${b.label} base ${b.id} (${person}): ${name}`;
      c.expect = {};
      const p = c.persons[person];
      p.month_defaults = p.month_defaults ?? {};
      p.facts = p.facts ?? {};
      fn(p.month_defaults, p.facts);
      out.push(c);
    }
  }
  return out;
}
