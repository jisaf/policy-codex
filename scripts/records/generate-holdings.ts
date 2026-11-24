// Resource records: generated households for the metamorphic relations
// (design 4.4). Each track's base households (scripts/records/programs/*.ts,
// `holdings.bases`) are varied one holding (or one part of an account or a
// property beside the rest of it) at a time. The families of design 4.4 are
// among the variants: H1 an ABLE account (C2-2), H2 an IRA with no tax
// figure (AF 20%), H3 a spouse's IRA (X-IRA: on a spouse base), H4 a lot for
// sale (X-FORSALE), H5 a refund held, H6 one transfer read by SNAP, AF and
// Medicaid, H7 two vehicles.
//
// Since step H2 (docs/reviews/records-e2-h2.md) the households are written
// in holdings records alone: each variant states the records the retired
// translation (scripts/records/translate-holdings.ts, removed in H2) wrote
// for the scalar resource facts it varied, and each base is today's stored
// household with every person's holdings emptied, so the variant is the
// only resource. The resource facts no list restates (the qualifying income
// trust, the penalty start, the CSRA figures and findings, Medicaid's sale
// and co-owner findings) are removed from the base too, as they were.
import type { HouseholdCase } from "../../src/engine/cases";
import type { Base } from "./programs/types";

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
type Rec = Record<string, unknown> & { kind: string };
/** A variant: the person's holdings (null: the list not stated), and any
 *  person-month fact stated beside them for every month. */
type Variant = [string, (asOf: string) => { holdings: Rec[] | null; monthDefaults?: Record<string, unknown> }];

/** The resource facts that stay person facts (read by their own rules), removed from a base. */
const KEPT_FACTS = ["has_income_trust", "transfer_penalty_period_start_date", "ma_spousal_resources_at_snapshot",
  "ma_csra_annuity_lowest_estimate", "ma_court_ordered_transfer_to_community_spouse", "ma_csra_transfer_is_overdue",
  "ma_community_spouse_withheld_resources_are_excused", "ma_excess_real_property_is_for_sale", "ma_claims_co_owner_hardship_for_real_property"];

/** The parts of an account, each 800 of 2,500: [name, the record of the part]. */
const LIQUID_PARTS: ReadonlyArray<readonly [string, Rec]> = [
  ["an ABLE account (H1)", { kind: "able_account" }],
  ["an education savings account", { kind: "education_savings_account" }],
  ["business cash", { kind: "business_cash_and_assets" }],
  ["a federal tax refund held", { kind: "held_income_tax_refund", paid_by: "federal" }],
  ["a State tax refund held", { kind: "held_income_tax_refund", paid_by: "state" }],
  ["an EITC held while on SNAP", { kind: "held_eitc", received_while_on_snap: true }],
  ["a retroactive SSA benefit held", { kind: "held_retroactive_ssa_benefit" }],
  ["an excluded government payment held", { kind: "held_excluded_payment" }],
  ["prorated income held", { kind: "held_prorated_income" }],
  ["an inaccessible account", { kind: "bank_account", accessible: false }],
];
/** The parts of real property, each 2,000 of 5,000. */
const REAL_PARTS: ReadonlyArray<readonly [string, Rec]> = [
  ["property for sale", { kind: "real_property", listed_for_sale: true }],
  ["a lot for a future home", { kind: "real_property", lot_for_future_home: true }],
  ["an installment contract", { kind: "installment_contract" }],
  ["property a co-owner lives in", { kind: "real_property", co_owner_lives_in_it: true }],
  ["property Adult Financial found unsaleable", { kind: "real_property", af_found_unsaleable: true }],
];

export function variants(): Variant[] {
  const h = (holdings: Rec[] | null) => () => ({ holdings });
  const v: Variant[] = [["base", h([])]];
  v.push(["liquid 1500", h([{ kind: "bank_account", value: 1500 }])]);
  v.push(["liquid 2500", h([{ kind: "bank_account", value: 2500 }])]);
  v.push(["liquid not stated", h(null)]);
  for (const [name, rec] of LIQUID_PARTS) v.push([`liquid 2500 of which ${name} 800`, h([{ kind: "bank_account", value: 1700 }, { ...rec, value: 800 }])]);
  v.push(["retroactive SSI 800 of liquid 2500 received four months before", (asOf) => ({ holdings: [{ kind: "bank_account", value: 1700 },
    { kind: "held_retroactive_ssa_benefit", source_date: `${shift(asOf, -4)}-10`, value: 800 }] })]);
  // holdings H1 integration: a retroactive payment past every window (MH-5 expiry merges it into the account)
  v.push(["retroactive SSI 800 of liquid 2500 received thirty months before", (asOf) => ({ holdings: [{ kind: "bank_account", value: 1700 },
    { kind: "held_retroactive_ssa_benefit", source_date: `${shift(asOf, -30)}-10`, value: 800 }] })]);
  v.push(["replacement proceeds 800 of liquid 2500, real property, two months before", (asOf) => ({ holdings: [{ kind: "bank_account", value: 1700 },
    { kind: "held_replacement_proceeds", replacement_property: "real_property", source_date: `${shift(asOf, -2)}-05`, value: 800 }] })]);
  v.push(["joint account, outside owners' share 1000", h([{ kind: "bank_account", value: 1000 },
    { kind: "bank_account", value: 1000, share: 0, co_owners: "outside_case", holding_id: "p-joint-liquid" }])]);
  v.push(["IRA 4000, no tax figure (H2)", h([{ kind: "retirement_account", value: 4000 }])]);
  v.push(["IRA 4000, taxes 500", h([{ kind: "retirement_account", value: 4000, taxes_on_withdrawal: 500 }])]);
  v.push(["real property 5000", h([{ kind: "real_property", value: 5000, amount_owed: 0 }])]);
  for (const [name, rec] of REAL_PARTS) v.push([`real property 5000 of which ${name} 2000`, h([{ kind: "real_property", value: 3000, amount_owed: 0 }, { ...rec, amount_owed: 0, value: 2000 }])]);
  v.push(["a lot for sale 1200, costs of sale 300 (H4)", h([{ kind: "real_property", listed_for_sale: true, amount_owed: 0, value: 1200, costs_of_sale: 300 }])]);
  v.push(["Medicaid: real property 5000 for sale, efforts unsuccessful", () => ({
    holdings: [{ kind: "real_property", listed_for_sale: true, amount_owed: 0, value: 5000, ma_sale_efforts_unsuccessful: true }],
    // the person fact Medicaid's verification of sale efforts reads (CO-2246; kept, docs/reviews/records-e2-h2.md)
    monthDefaults: { ma_excess_real_property_is_for_sale: true },
  })]);
  v.push(["joint real property, outside owners' share 2000", h([{ kind: "real_property", value: 2000, amount_owed: 0 },
    { kind: "real_property", value: 2000, amount_owed: 0, share: 0, co_owners: "outside_case", holding_id: "p-joint-real-property" }])]);
  v.push(["income-producing business property 7000, net 500", h([{ kind: "real_property", value: 7000, amount_owed: 0, income_producing: true, used_in_trade_or_business: true, net_annual_return: 500 }])]);
  v.push(["non-business rental 7000, net 300", h([{ kind: "real_property", value: 7000, amount_owed: 0, income_producing: true, used_in_trade_or_business: false, net_annual_return: 300 }])]);
  v.push(["home-use production land 7000", h([{ kind: "real_property", value: 7000, amount_owed: 0, income_producing: false, produces_for_household_use: true }])]);
  v.push(["investment jewelry 2000", h([{ kind: "investment_personal_property", value: 2000 }])]);
  v.push(["two vehicles, 6000 used for transportation and 3000 (H7)", h([{ kind: "vehicle", value: 6000, amount_owed: 0, used_for_transportation: true },
    { kind: "vehicle", value: 3000, amount_owed: 0, used_for_transportation: false }])]);
  v.push(["one vehicle 4000 used for transportation", h([{ kind: "vehicle", value: 4000, amount_owed: 0, used_for_transportation: true }])]);
  v.push(["home 150000, lives in it", h([{ kind: "home", value: 150000, amount_owed: 0, lives_in: true }])]);
  v.push(["home 150000, left it, intends to return in writing", h([{ kind: "home", value: 150000, amount_owed: 0, lives_in: false, intends_to_return: true, intent_in_writing: true }])]);
  v.push(["life insurance face 5000, cash value 900", h([{ kind: "life_insurance", value: 900, face_value: 5000, purchase_date: "2010-03-01", premiums_in_lookback: 0 }])]);
  v.push(["life insurance face 1000, cash value 400", h([{ kind: "life_insurance", value: 400, face_value: 1000 }])]);
  v.push(["irrevocable burial funds 1000", h([{ kind: "burial_fund", value: 1000, irrevocable: true }])]);
  v.push(["revocable burial trust 2500, interest 100", h([{ kind: "burial_fund", value: 2500, irrevocable: false, accrued_interest: 100 }])]);
  v.push(["prepaid burial contract 2500", h([{ kind: "prepaid_burial_contract", value: 2500, irrevocable: false }])]);
  v.push(["burial spaces beyond the family 800", h([{ kind: "burial_space", value: 800, for_immediate_family: false }])]);
  v.push(["trust corpus payable 3000", h([{ kind: "trust_interest", corpus_available_value: 3000 }])]);
  v.push(["Medicaid: value found available 3000 from an annuity", h([{ kind: "annuity", ma_found_available_value: 3000 }])]);
  v.push(["one transfer of 3000 two months before (H6)", (asOf) => ({ holdings: [{ kind: "other_resource", value: 3000, amount_owed: 0, compensation_received: 0,
    disposed_date: `${shift(asOf, -2)}-10`, ma_transfer_exempt: false }] })]);
  return v;
}

function shift(asOf: string, n: number): string {
  let [y, m] = asOf.slice(0, 7).split("-").map(Number);
  m += n;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Every person's holdings emptied (stated: none), and the resource facts
 *  no list restates removed, so each variant starts clean. */
function cleanBase(c: HouseholdCase): void {
  for (const p of Object.values(c.persons)) {
    (p.facts ??= {}).holdings = [];
    for (const o of [p.facts, p.month_defaults, ...Object.values(p.months ?? {})]) for (const k of KEPT_FACTS) if (o) delete o[k];
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
    const person = b.person || Object.keys(base.persons).slice(-1)[0];
    for (const [name, fn] of variants()) {
      const c = clone(base);
      c.id = `GH-${b.label.replace(/[^A-Za-z]+/g, "")}-${name.replace(/[^A-Za-z0-9]+/g, "_")}`;
      c.title = `${b.label} base ${b.id} (${person}): ${name}`;
      c.expect = {};
      const p = c.persons[person];
      const { holdings, monthDefaults } = fn(c.as_of);
      if (holdings === null) delete p.facts!.holdings;
      else p.facts!.holdings = holdings.map((r) => (typeof r.holding_id === "string" ? { ...r, holding_id: `${person}${r.holding_id.slice(1)}` } : r));
      if (monthDefaults) p.month_defaults = { ...(p.month_defaults ?? {}), ...monthDefaults };
      out.push(c);
    }
  }
  return out;
}
