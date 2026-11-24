// Earned-income records: generated households for the metamorphic
// relations (design 4.4). Each track's base households
// (scripts/records/programs/*.ts, `earnings.bases`) are varied one earnings
// record (or one part of a pay beside the rest of it) at a time.
//
// Since step E2 (docs/reviews/records-e2-h2.md) the households are written
// in earnings records alone: each variant states the records the retired
// translation (scripts/records/translate-earnings.ts, removed in E2) wrote
// for the scalar earned fact it varied, and each base is today's stored
// household with every person's earnings emptied, so the variant is the
// only pay.
import type { HouseholdCase } from "../../src/engine/cases";
import type { Base } from "./programs/types";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
type Rec = Record<string, unknown> & { kind: string };
type Variant = [string, () => Rec[]];

/** The parts of a month's wages, each 300 of 1,200: [name, the record of the part]. */
const PARTS: ReadonlyArray<readonly [string, Rec]> = [
  ["work study", { kind: "work_study" }],
  ["SCSEP", { kind: "scsep_employment" }],
  ["WIOA on-the-job training", { kind: "wioa_on_the_job_training" }],
  ["summer youth employment", { kind: "summer_youth_employment" }],
  ["subsidized employment", { kind: "subsidized_employment" }],
  ["decennial census", { kind: "decennial_census_employment" }],
  ["difficulty of care", { kind: "difficulty_of_care_payment" }],
  ["employer health insurance subsidy", { kind: "employer_health_insurance_subsidy" }],
  ["short-term job", { kind: "wages", temporary_job: true }],
  ["combat-zone pay", { kind: "uniformed_services_special_pay", combat_zone: true }],
  ["irregular pay", { kind: "wages", irregular: true }],
  ["pay from the person's own corporation", { kind: "wages", paid_as_business_owner: true }],
];
const COSTS = ["business_cost_operating", "business_cost_interest", "business_cost_capital_principal", "business_cost_home_space", "business_cost_vehicle"];

export function variants(): Variant[] {
  const v: Variant[] = [["base", () => []]];
  v.push(["wages 1200", () => [{ kind: "wages", amount: 1200 }]]);
  v.push(["wages, amount not stated", () => [{ kind: "wages" }]]);
  for (const [name, rec] of PARTS) v.push([`wages 1200 of which ${name} 300`, () => [{ kind: "wages", amount: 900 }, { ...rec, amount: 300 }]]);
  v.push(["in-kind pay 300", () => [{ kind: "in_kind_pay", amount: 300 }]]);
  v.push(["employer vendor payments 300", () => [{ kind: "employer_vendor_payment", amount: 300 }]]);
  v.push(["weekly pay 300, wages 1200", () => [{ kind: "wages", amount: 1200, frequency: "weekly", per_payment: 300 }]]);
  v.push(["PASS 100 of wages 1200", () => [{ kind: "wages", amount: 1200, pass_set_aside: 100 }]]);
  v.push(["business 1500", () => [{ kind: "self_employment_receipts", amount: 1500 }]]);
  for (const c of COSTS) v.push([`business 1500, ${c} 200`, () => [{ kind: "self_employment_receipts", amount: 1500 }, { kind: c, amount: 200 }]]);
  v.push(["farm 1500, operating 400", () => [{ kind: "farm_self_employment_receipts", amount: 1500 }, { kind: "business_cost_operating", amount: 400, farm: true }]]);
  v.push(["boarders 900 from two payers", () => [{ kind: "boarder_payments", amount: 900, provides: "room_and_board", boarders: 2 }]]);
  return v;
}

/** Every person's earnings emptied (stated: no pay), so each variant starts
 *  clean; receipts, holdings and every other fact stay as stored. A
 *  business the person runs stays, with no receipts in the month (amount 0)
 *  and what the stored record says of the business as a whole (whether it
 *  is the household's annual support, when it began), as the scalar base
 *  stated it (the farm base, CO-447). */
function cleanBase(c: HouseholdCase): void {
  const BUSINESS = new Set(["self_employment_receipts", "farm_self_employment_receipts"]);
  for (const p of Object.values(c.persons)) {
    const f = (p.facts ??= {});
    const stored = Array.isArray(f.earnings) ? (f.earnings as Rec[]) : [];
    f.earnings = stored.filter((r) => BUSINESS.has(r.kind) && (r.annual_support !== undefined || r.start_date !== undefined)).map((r) => {
      const b: Rec = { kind: r.kind, amount: 0 };
      for (const k of ["annual_support", "start_date"]) if (r[k] !== undefined) b[k] = r[k];
      return b;
    });
  }
}

/** A variant's records beside the business the base keeps: a variant that
 *  states a business is that business (its kind, farm or not, and what the
 *  base says of it, with the variant's receipts; a farm's costs are farm
 *  costs); any other variant is stated beside it. */
function withBusiness(variant: Rec[], kept: Rec[]): Rec[] {
  const biz = kept[0];
  if (!biz) return variant;
  const isBiz = (r: Rec) => r.kind === "self_employment_receipts" || r.kind === "farm_self_employment_receipts";
  if (!variant.some(isBiz)) return [...variant, ...kept];
  const farm = biz.kind === "farm_self_employment_receipts";
  return variant.map((r) => (isBiz(r) ? { ...biz, amount: r.amount } : farm && r.kind.startsWith("business_cost_") ? { ...r, farm: true } : r));
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
      c.persons[person].facts!.earnings = withBusiness(fn(), c.persons[person].facts!.earnings as Rec[]);
      out.push(c);
    }
  }
  return out;
}
