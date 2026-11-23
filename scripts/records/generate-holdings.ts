// Resource records harness: generated households (design 4.4). Each track's
// base households (scripts/records/programs/*.ts, `holdings.bases`) are
// varied one resource fact (or one part and the total that holds it) at a
// time, stated in the scalar resource facts and translated like a stored
// household, so the two ledgers are compared on holdings the stored
// households do not state. The families of design 4.4 are among the
// variants: H1 an ABLE account (C2-2), H2 an IRA with no tax figure (AF
// 20%), H3 a spouse's IRA (X-IRA: on a spouse base), H4 a lot for sale
// (X-FORSALE), H5 a refund held (its months are the tracks' to date), H6 one
// transfer read by SNAP, AF and Medicaid, H7 two vehicles.
import type { HouseholdCase } from "../../src/engine/cases";
import type { Base } from "./programs/types";
import { ALL_RESOURCE_FACTS } from "./translate-holdings";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
type Facts = Record<string, unknown>;
type Variant = [string, (f: Facts, md: Facts, asOf: string) => void];

/** Parts of liquid_resources_value: each stated with the liquid resources raised by the same amount. */
const LIQUID_PARTS = ["able_account_value", "education_savings_accounts_value", "business_cash_and_convertible_assets_value",
  "federal_tax_refunds_held_value", "state_tax_refunds_held_value", "snap_eitc_held_while_participating_value",
  "retroactive_ssa_benefits_held_value", "excluded_government_payments_held_value", "prorated_income_held_value",
  "liquid_resources_inaccessible_value"];
/** Parts of real_property_other_than_home_equity. */
const REAL_PARTS = ["real_property_for_sale_value", "land_for_permanent_home_value", "installment_sale_contract_value",
  "real_property_co_owned_with_resident_value", "af_property_exempt_as_unsaleable_value"];

export function variants(): Variant[] {
  const v: Variant[] = [["base", () => {}]];
  v.push(["liquid 1500", (f) => { f.liquid_resources_value = 1500; }]);
  v.push(["liquid 2500", (f) => { f.liquid_resources_value = 2500; }]);
  v.push(["liquid not stated", (f) => { delete f.liquid_resources_value; }]);
  for (const p of LIQUID_PARTS) v.push([`liquid 2500 of which ${p} 800`, (f) => { f.liquid_resources_value = 2500; f[p] = 800; }]);
  v.push(["retroactive SSI 800 of liquid 2500 received four months before", (f, _m, asOf) => {
    f.liquid_resources_value = 2500; f.retroactive_benefit_payment_unspent_value = 800;
    f.retroactive_benefit_payment_received_date = `${shift(asOf, -4)}-10`;
  }]);
  // holdings H1 integration: a retroactive payment past every window (MH-5 expiry merges it into the account)
  v.push(["retroactive SSI 800 of liquid 2500 received thirty months before", (f, _m, asOf) => {
    f.liquid_resources_value = 2500; f.retroactive_benefit_payment_unspent_value = 800;
    f.retroactive_benefit_payment_received_date = `${shift(asOf, -30)}-10`;
  }]);
  v.push(["replacement proceeds 800 of liquid 2500, real property, two months before", (f, _m, asOf) => {
    f.liquid_resources_value = 2500; f.replacement_proceeds_held_value = 800; f.replacement_proceeds_property_type = "real_property";
    f.replacement_proceeds_received_date = `${shift(asOf, -2)}-05`;
  }]);
  v.push(["joint account, outside owners' share 1000", (f) => { f.liquid_resources_value = 1000; f.joint_liquid_resources_other_owners_share_value = 1000; }]);
  v.push(["IRA 4000, no tax figure (H2)", (f) => { f.retirement_accounts_value = 4000; }]);
  v.push(["IRA 4000, taxes 500", (f) => { f.retirement_accounts_value = 4000; f.retirement_accounts_taxes_due = 500; }]);
  v.push(["real property 5000", (f) => { f.real_property_other_than_home_equity = 5000; }]);
  for (const p of REAL_PARTS) v.push([`real property 5000 of which ${p} 2000`, (f) => { f.real_property_other_than_home_equity = 5000; f[p] = 2000; }]);
  v.push(["a lot for sale 1200, costs of sale 300 (H4)", (f) => { f.real_property_other_than_home_equity = 1200; f.real_property_for_sale_value = 1200; f.real_property_costs_of_sale = 300; }]);
  v.push(["Medicaid: real property 5000 for sale, efforts unsuccessful", (f, md) => { f.real_property_other_than_home_equity = 5000; f.real_property_for_sale_value = 5000; md.ma_excess_real_property_is_for_sale = true; }]);
  v.push(["joint real property, outside owners' share 2000", (f) => { f.real_property_other_than_home_equity = 2000; f.joint_real_property_other_owners_share_value = 2000; }]);
  v.push(["income-producing business property 7000, net 500", (f) => { f.income_producing_property_equity_value = 7000; f.income_producing_property_is_used_in_trade_or_business = true; f.income_producing_property_net_return_annual = 500; }]);
  v.push(["non-business rental 7000, net 300", (f) => { f.nonbusiness_income_producing_property_equity_value = 7000; f.nonbusiness_income_producing_property_net_annual_income = 300; }]);
  v.push(["home-use production land 7000", (f) => { f.home_use_production_property_equity_value = 7000; }]);
  v.push(["investment jewelry 2000", (f) => { f.investment_personal_property_value = 2000; }]);
  v.push(["two vehicles, 6000 used for transportation and 3000 (H7)", (f) => { f.vehicles_equity_value = 9000; f.transportation_vehicle_equity_value = 6000; }]);
  v.push(["one vehicle 4000 used for transportation", (f) => { f.vehicles_equity_value = 4000; f.transportation_vehicle_equity_value = 4000; }]);
  v.push(["home 150000, lives in it", (f) => { f.home_equity = 150000; f.lives_in_owned_home = true; f.owns_and_lives_in_home = true; }]);
  v.push(["home 150000, left it, intends to return in writing", (f) => { f.home_equity = 150000; f.lives_in_owned_home = false; f.owns_and_lives_in_home = false; f.intends_to_return_home = true; f.intent_to_return_home_is_documented_in_writing = true; }]);
  v.push(["life insurance face 5000, cash value 900", (f) => { f.life_insurance_face_value = 5000; f.life_insurance_cash_surrender_value = 900; f.life_insurance_newest_policy_purchase_date = "2010-03-01"; f.life_insurance_payments_in_lookback = 0; }]);
  v.push(["life insurance face 1000, cash value 400", (f) => { f.life_insurance_face_value = 1000; f.life_insurance_cash_surrender_value = 400; }]);
  v.push(["irrevocable burial funds 1000", (f) => { f.irrevocable_burial_funds_value = 1000; }]);
  v.push(["revocable burial trust 2500, interest 100", (f) => { f.revocable_burial_trust_value = 2500; f.burial_funds_accrued_interest = 100; }]);
  v.push(["prepaid burial contract 2500", (f) => { f.revocable_prepaid_burial_contract_value = 2500; }]);
  v.push(["burial spaces beyond the family 800", (f) => { f.burial_spaces_value_beyond_family_needs = 800; }]);
  v.push(["trust corpus payable 3000", (f) => { f.has_trust_interest = true; f.trust_corpus_payable_to_person_value = 3000; }]);
  v.push(["Medicaid: value found available 3000 from an annuity", (f) => { f.owns_annuity = true; f.ma_trust_annuity_life_estate_value_available = 3000; }]);
  v.push(["one transfer of 3000 two months before (H6)", (f, md, asOf) => {
    const m = shift(asOf, -2);
    md.resource_transfer_date = { [m]: `${m}-10` };
    md.resource_transfer_uncompensated_value = { [m]: 3000 };
    f.uncompensated_transfer_value_in_lookback = 3000;
    f.transfer_was_exempt = false;
  }]);
  return v;
}

function shift(asOf: string, n: number): string {
  let [y, m] = asOf.slice(0, 7).split("-").map(Number);
  m += n;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Removes the resource facts a base household states, so each variant
 *  starts from liquid resources of 0 and no other holding. */
function cleanBase(c: HouseholdCase): void {
  for (const p of Object.values(c.persons)) {
    if (p.facts) delete p.facts.holdings;
    for (const k of Object.keys(p.facts ?? {})) if (ALL_RESOURCE_FACTS.has(k)) delete p.facts![k];
    for (const k of Object.keys(p.month_defaults ?? {})) if (ALL_RESOURCE_FACTS.has(k)) delete p.month_defaults![k];
    for (const mf of Object.values(p.months ?? {})) for (const k of Object.keys(mf)) if (ALL_RESOURCE_FACTS.has(k)) delete mf[k];
    (p.facts ??= {}).liquid_resources_value = 0;
  }
}

/** The generated households for the bases given. A person-month value is
 *  stated keyed by month (resource_transfer_*), so it goes under facts. */
export function generated(cases: readonly HouseholdCase[], bases: readonly Base[]): HouseholdCase[] {
  const out: HouseholdCase[] = [];
  for (const b of bases) {
    const src = cases.find((c) => c.id === b.id);
    if (!src) throw new Error(`generated households: no base household ${b.id}`);
    const base = clone(src);
    cleanBase(base);
    const person = b.person || Object.keys(base.persons).slice(-1)[0];
    for (const [name, fn] of variants()) {
      const c = clone(base);
      c.id = `GH-${b.label.replace(/[^A-Za-z]+/g, "")}-${name.replace(/[^A-Za-z0-9]+/g, "_")}`;
      c.title = `${b.label} base ${b.id} (${person}): ${name}`;
      c.expect = {};
      const p = c.persons[person];
      p.facts = p.facts ?? {};
      const md: Facts = {};
      fn(p.facts, md, c.as_of);
      for (const [k, v] of Object.entries(md)) {
        if (v && typeof v === "object" && !Array.isArray(v)) p.facts[k] = v;
        else (p.month_defaults ??= {})[k] = v;
      }
      out.push(c);
    }
  }
  return out;
}
