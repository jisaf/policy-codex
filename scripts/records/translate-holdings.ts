// Resource records: the one translation of a household or rule test stated
// in the scalar resource facts into the `holdings` list (CO-5300). Written
// once by the integration owner, reviewed as code (docs/design-earned-and-
// resource-records.md 4.2, step H0; translate-earnings.ts is the model).
//
// Transition (steps H0 and H1). No rule reads `holdings` in H0: every
// program still reads the scalar resource facts. A stored household or rule
// test that states resources states them in those facts and, beside them,
// as holdings records, both written by this translation from one statement
// (npm run records:translate-holdings, scripts/records/apply-holdings.ts), so
// the two cannot disagree; npm run records:harness -- --list holdings fails
// when a household's holdings are not the translation of its facts. Each H1
// track moves its readers to the records; H2 retires the scalar facts.
//
// The carving rule (design 3.1: records are disjoint). The facts the ledger
// defines as "part of" liquid_resources_value are carved out of it, in a
// fixed order, into held_ and account records of their own kind, each capped
// at what is left of the liquid resources (an overlap the old facts allow is
// noted, never stated twice); what is left is one bank_account record (the
// old fact does not tell cash, accounts and securities apart; every table
// reads the three alike). The parts of real_property_other_than_home_equity
// are carved the same way (an installment contract, property for sale, a
// lot for a future home, former farm property, property a co-owner lives
// in, property Adult Financial exempts as unsaleable), and what is left is
// one real_property record. Each fact stated beside them (retirement
// accounts, the home, vehicles, life insurance, burial funds, income-
// producing property, trusts) is a record of its own. An equity figure is
// stated as value with nothing owed (the old facts state equity, not market
// value and debt). A joint owners' share outside the case (CO-4340, CO-4343),
// which no old fact counts as the person's own, is a record of share 0 with
// co_owners outside_case: the outside owners' part of a joint holding the
// person can reach. One transfer is one record of the month's transfer
// facts (CO-3834, CO-3835, CO-4009, CO-3836, CO-4155), its kind
// other_resource (the facts do not say what was transferred).
//
// Liquid resources a person does not state stay unknown (a bank_account
// record with no value), as liquid_resources_value was, which no reader
// defaults: a person who states any restated resource fact gets a holdings
// list; one who states none keeps the list unstated. Every other holding not
// stated is not a record: each reader of those facts reads an unstated one
// as 0 today (the reader defaults the H1 tracks remove, decision 4).
//
// Not restated (the person facts they are, design 3.1 and 3.4, decision D8):
// has_income_trust (CO-823, an income arrangement), the penalty start
// (CO-886), the couple's resources at the snapshot (CO-888), the CSRA
// figures and findings (CO-1948, CO-1950, CO-4636, CO-4637), and Medicaid's
// look-back total and its exemption (CO-824, CO-825) when no dated transfer
// of the same total is stated (the total has no date; the Medicaid H1 track
// states the transfer with its date).
import type { HouseholdCase, PersonSpec } from "../../src/engine/cases";
import type { LedgerIndex } from "../../src/engine/ledger-index";
import type { TestSpec } from "../../src/engine/types";
import { addMonths } from "../../src/engine/evaluate";

export type Holding = Record<string, unknown> & { kind: string; value?: number };

/** Parts of liquid_resources_value, in carving order: [fact, the record it becomes]. */
export const LIQUID_PARTS: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
  ["able_account_value", { kind: "able_account" }],
  ["education_savings_accounts_value", { kind: "education_savings_account" }],
  ["business_cash_and_convertible_assets_value", { kind: "business_cash_and_assets" }],
  ["federal_tax_refunds_held_value", { kind: "held_income_tax_refund", paid_by: "federal" }],
  ["state_tax_refunds_held_value", { kind: "held_income_tax_refund", paid_by: "state" }],
  ["snap_eitc_held_while_participating_value", { kind: "held_eitc", received_while_on_snap: true }],
  // the same retroactive payment, stated once for Adult Financial (CO-4414)
  // and once for the SSI method (CO-4639, with its date): the larger is it
  ["retroactive", { kind: "held_retroactive_ssa_benefit" }],
  ["excluded_government_payments_held_value", { kind: "held_excluded_payment" }],
  ["replacement_proceeds_held_value", { kind: "held_replacement_proceeds" }],
  ["prorated_income_held_value", { kind: "held_prorated_income" }],
  ["liquid_resources_inaccessible_value", { kind: "bank_account", accessible: false }],
];
/** Parts of real_property_other_than_home_equity, in carving order. */
export const REAL_PARTS: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
  ["installment_sale_contract_value", { kind: "installment_contract" }],
  ["real_property_for_sale_value", { kind: "real_property", listed_for_sale: true }],
  ["land_for_permanent_home_value", { kind: "real_property", lot_for_future_home: true }],
  ["former_farm_property_value", { kind: "real_property" }],
  ["real_property_co_owned_with_resident_value", { kind: "real_property", co_owner_lives_in_it: true }],
  ["af_property_exempt_as_unsaleable_value", { kind: "real_property", af_found_unsaleable: true }],
];
/** Person-month facts the translation reads (at the determination month, or by month for transfers). */
export const MONTH_FACTS: ReadonlySet<string> = new Set<string>([
  "ma_excess_real_property_is_for_sale", "ma_claims_co_owner_hardship_for_real_property",
  "resource_transfer_date", "resource_transfer_uncompensated_value", "resource_transfer_returned_date", "af_transfer_found_not_twfc",
]);
/** Person facts the translation reads. */
export const PERSON_FACTS: ReadonlySet<string> = new Set<string>([
  "liquid_resources_value", "joint_liquid_resources_other_owners_share_value",
  ...LIQUID_PARTS.map((p) => p[0]).filter((f) => f !== "retroactive"),
  "retroactive_ssa_benefits_held_value", "retroactive_benefit_payment_unspent_value", "retroactive_benefit_payment_received_date",
  "replacement_proceeds_property_type", "replacement_proceeds_received_date",
  "retirement_accounts_value", "retirement_accounts_taxes_due",
  "real_property_other_than_home_equity", ...REAL_PARTS.map((p) => p[0]), "real_property_costs_of_sale",
  "joint_real_property_other_owners_share_value",
  "income_producing_property_equity_value", "income_producing_property_net_return_annual", "income_producing_property_is_used_in_trade_or_business",
  "nonbusiness_income_producing_property_equity_value", "nonbusiness_income_producing_property_net_annual_income",
  "home_use_production_property_equity_value", "investment_personal_property_value",
  "vehicles_equity_value", "transportation_vehicle_equity_value",
  "home_equity", "owns_and_lives_in_home", "lives_in_owned_home", "intends_to_return_home", "intent_to_return_home_is_documented_in_writing",
  "home_is_outside_colorado", "home_is_held_in_trust_or_entity", "home_has_recorded_beneficiary_deed",
  "life_insurance_face_value", "life_insurance_cash_surrender_value", "life_insurance_newest_policy_purchase_date", "life_insurance_payments_in_lookback",
  "irrevocable_burial_funds_value", "burial_funds_accrued_interest", "revocable_burial_trust_value", "revocable_prepaid_burial_contract_value",
  "burial_spaces_value_beyond_family_needs",
  "has_trust_interest", "owns_annuity", "trust_corpus_payable_to_person_value", "ma_trust_annuity_life_estate_value_available",
  "snap_resource_transfer_was_to_qualify",
]);
/** Read with a dated transfer only (never on their own make a list stated). */
export const MEDICAID_TRANSFER_FACTS: ReadonlySet<string> = new Set<string>([
  "uncompensated_transfer_value_in_lookback", "transfer_was_exempt",
]);
/** Resource facts stated but not restated (see the header). */
export const NOT_RESTATED: ReadonlySet<string> = new Set<string>([
  "has_income_trust", "transfer_penalty_period_start_date", "ma_spousal_resources_at_snapshot",
  "ma_csra_annuity_lowest_estimate", "ma_court_ordered_transfer_to_community_spouse", "ma_csra_transfer_is_overdue",
  "ma_community_spouse_withheld_resources_are_excused",
]);
/** Every scalar fact whose statement makes a person's holdings stated. */
export const RESOURCE_FACTS: ReadonlySet<string> = new Set<string>([...PERSON_FACTS, ...MONTH_FACTS]);
/** Every scalar fact the translation reads or names (the facts the holdings restate, H2 retires). */
export const ALL_RESOURCE_FACTS: ReadonlySet<string> = new Set<string>([...RESOURCE_FACTS, ...MEDICAID_TRANSFER_FACTS, ...NOT_RESTATED]);

const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const date = (v: unknown): string | undefined => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export interface PersonInput {
  /** person-scope facts */
  facts: Record<string, unknown>;
  /** person-month facts stated for every month */
  monthDefaults: Record<string, unknown>;
  /** person-month facts stated by month */
  months: Record<string, Record<string, unknown>>;
}

/** Carves `parts` out of `total` in order; each part capped at what is left. */
function carve(total: number | undefined, parts: Array<[string, number, Holding]>, notes: string[], what: string): { out: Holding[]; left: number | undefined } {
  let left = total;
  const out: Holding[] = [];
  for (const [f, amt, rec] of parts) {
    if (!(amt > 0)) continue;
    let take = amt;
    if (left !== undefined && amt > left + 1e-9) {
      notes.push(`${f} ${amt} exceeds what is left of ${what} (${left}): capped`);
      take = Math.max(0, left);
    }
    if (left !== undefined) left -= take;
    if (take > 0) out.push({ ...rec, value: take });
  }
  return { out, left };
}

/** One person's holdings, or undefined when the person states none of the
 *  restated resource facts (the list then stays unstated: unknown). */
export function translatePerson(
  id: string, input: PersonInput, detMonth: string, asOf: string,
): { holdings: Holding[] | undefined; notes: string[] } {
  const notes: string[] = [];
  const f = input.facts;
  const md = input.monthDefaults;
  const at = (k: string, m: string) => (input.months[m]?.[k] !== undefined ? input.months[m][k] : md[k]);
  const stated = Object.keys(f).some((k) => PERSON_FACTS.has(k)) ||
    Object.keys(md).some((k) => MONTH_FACTS.has(k)) ||
    Object.values(input.months).some((m) => Object.keys(m).some((k) => MONTH_FACTS.has(k)));
  if (!stated) return { holdings: undefined, notes };
  const H: Holding[] = [];
  const n = (k: string) => num(f[k]);

  // ---- liquid resources and the money traced within them
  const L = n("liquid_resources_value");
  const retroA = n("retroactive_ssa_benefits_held_value") ?? 0, retroS = n("retroactive_benefit_payment_unspent_value") ?? 0;
  if (retroA > 0 && retroS > 0 && retroA !== retroS) notes.push(`retroactive_ssa_benefits_held_value ${retroA} and retroactive_benefit_payment_unspent_value ${retroS} differ: the larger is the retroactive payment held`);
  const liquidParts: Array<[string, number, Holding]> = LIQUID_PARTS.map(([k, rec]) => {
    const r: Holding = { ...(rec as Holding) };
    if (k === "retroactive") {
      const d = date(f.retroactive_benefit_payment_received_date);
      if (d) r.source_date = d;
      else if (Math.max(retroA, retroS) > 0) notes.push("retroactive payment held with no date: source_date not stated (CO-4414 says only that it came in the determination month or the nine before)");
      return [k, Math.max(retroA, retroS), r];
    }
    if (k === "replacement_proceeds_held_value") {
      const t = f.replacement_proceeds_property_type;
      if (t === "personal_property" || t === "real_property") r.replacement_property = t;
      const d = date(f.replacement_proceeds_received_date);
      if (d) r.source_date = d;
    }
    if ((k === "federal_tax_refunds_held_value" || k === "state_tax_refunds_held_value" || k === "snap_eitc_held_while_participating_value") && (n(k) ?? 0) > 0) {
      notes.push(`${k}: source_date not stated (the fact says only that it came in the twelve months before the determination date)`);
    }
    return [k, n(k) ?? 0, r];
  });
  const liq = carve(L, liquidParts, notes, "liquid_resources_value");
  const account: Holding = { kind: "bank_account" };
  if (L !== undefined) account.value = Math.max(0, liq.left!);
  // always stated: liquid resources not stated are unknown, as the fact was
  H.push(account, ...liq.out);
  const jl = n("joint_liquid_resources_other_owners_share_value") ?? 0;
  if (jl > 0) H.push({ kind: "bank_account", value: jl, share: 0, co_owners: "outside_case", holding_id: `${id.split(" ").pop()}-joint-liquid` });

  // ---- retirement accounts
  const ret = n("retirement_accounts_value");
  if ((ret ?? 0) > 0) {
    const r: Holding = { kind: "retirement_account", value: ret };
    if (n("retirement_accounts_taxes_due") !== undefined) r.taxes_on_withdrawal = n("retirement_accounts_taxes_due");
    H.push(r);
  }

  // ---- real property other than the home, and its parts
  const R = n("real_property_other_than_home_equity");
  const realParts: Array<[string, number, Holding]> = REAL_PARTS.map(([k, rec]) => {
    const r: Holding = { ...(rec as Holding), amount_owed: 0 };
    if (k === "former_farm_property_value") {
      const d = date(f.farming_self_employment_end_date);
      if (d) r.farm_ended_date = d;
      else if ((n(k) ?? 0) > 0) notes.push("former farm property with no farming_self_employment_end_date: farm_ended_date not stated");
    }
    return [k, n(k) ?? 0, r];
  });
  const real = carve(R, realParts, notes, "real_property_other_than_home_equity");
  const realRest: Holding = { kind: "real_property", value: Math.max(0, real.left ?? 0), amount_owed: 0 };
  const realRecs: Holding[] = [...real.out];
  if ((real.left ?? 0) > 0) realRecs.unshift(realRest);
  // the costs of selling the person's real property: one estimate for the
  // whole (SNAP 4.410.F.2, G test what remains as one resource)
  const cos = n("real_property_costs_of_sale");
  if (cos !== undefined && cos > 0) {
    const host = realRecs.find((r) => r.kind === "real_property");
    if (host) host.costs_of_sale = cos;
    else notes.push(`real_property_costs_of_sale ${cos} with no real property: not stated`);
  }
  // Medicaid's findings, at the determination month (CO-4620 reads them
  // there): property for sale whose sale efforts are unsuccessful, and a
  // co-owner's hardship. With no part stated, the finding is on all of it.
  const forSale = bool(at("ma_excess_real_property_is_for_sale", detMonth));
  const hardship = bool(at("ma_claims_co_owner_hardship_for_real_property", detMonth));
  const realOnly = realRecs.filter((r) => r.kind === "real_property");
  if (forSale !== undefined) {
    const part = realOnly.find((r) => r.listed_for_sale === true);
    for (const r of realOnly) r.ma_sale_efforts_unsuccessful = forSale && (part ? r === part : true);
  }
  if (hardship !== undefined) {
    const part = realOnly.find((r) => r.co_owner_lives_in_it === true);
    for (const r of realOnly) r.co_owner_would_lose_housing = hardship && (part ? r === part : true);
  }
  H.push(...realRecs);
  const jr = n("joint_real_property_other_owners_share_value") ?? 0;
  if (jr > 0) H.push({ kind: "real_property", value: jr, amount_owed: 0, share: 0, co_owners: "outside_case", holding_id: `${id.split(" ").pop()}-joint-real-property` });

  // ---- income-producing and self-support property (real or personal; the
  // facts do not tell them apart: stated as real_property)
  const ip = n("income_producing_property_equity_value") ?? 0;
  const ipBiz = bool(f.income_producing_property_is_used_in_trade_or_business);
  const nb = n("nonbusiness_income_producing_property_equity_value") ?? 0;
  if (ip > 0) {
    const r: Holding = { kind: "real_property", value: ip, amount_owed: 0, income_producing: true };
    if (ipBiz !== undefined) r.used_in_trade_or_business = ipBiz;
    if (n("income_producing_property_net_return_annual") !== undefined) r.net_annual_return = n("income_producing_property_net_return_annual");
    // the same non-business property stated for Medicaid (CO-4607) and
    // Adult Financial (CO-4423): one record
    if (nb > 0 && ipBiz === false && nb === ip) {
      notes.push("income-producing property stated for Medicaid and Adult Financial alike: one record");
      if (r.net_annual_return === undefined && n("nonbusiness_income_producing_property_net_annual_income") !== undefined) r.net_annual_return = n("nonbusiness_income_producing_property_net_annual_income");
      else if (n("nonbusiness_income_producing_property_net_annual_income") !== undefined && n("nonbusiness_income_producing_property_net_annual_income") !== r.net_annual_return) {
        notes.push(`its net return is stated twice and differs (${r.net_annual_return}, ${n("nonbusiness_income_producing_property_net_annual_income")}): Medicaid's kept`);
      }
      H.push(r);
    } else {
      H.push(r);
      if (nb > 0) notes.push("non-business income-producing property beside the income-producing property: two records");
    }
  }
  if (nb > 0 && !(ip > 0 && ipBiz === false && nb === ip)) {
    const r: Holding = { kind: "real_property", value: nb, amount_owed: 0, income_producing: true, used_in_trade_or_business: false };
    if (n("nonbusiness_income_producing_property_net_annual_income") !== undefined) r.net_annual_return = n("nonbusiness_income_producing_property_net_annual_income");
    H.push(r);
  }
  const hp = n("home_use_production_property_equity_value") ?? 0;
  if (hp > 0) H.push({ kind: "real_property", value: hp, amount_owed: 0, income_producing: false, produces_for_household_use: true });
  const inv = n("investment_personal_property_value") ?? 0;
  if (inv > 0) H.push({ kind: "investment_personal_property", value: inv });

  // ---- vehicles: the highest-valued one used for transportation, and the rest
  const V = n("vehicles_equity_value"), T = n("transportation_vehicle_equity_value");
  if ((T ?? 0) > 0) {
    H.push({ kind: "vehicle", value: T, amount_owed: 0, used_for_transportation: true });
    if (V !== undefined && V < T!) notes.push(`transportation_vehicle_equity_value ${T} exceeds vehicles_equity_value ${V}`);
  }
  if (V !== undefined && V - (T ?? 0) > 0) {
    const rest: Holding = { kind: "vehicle", value: V - (T ?? 0), amount_owed: 0 };
    // the old facts name only the excluded vehicle: the rest is stated as
    // one vehicle not used for transportation, which every rule that
    // excludes one vehicle reads as it read the facts
    if (T !== undefined) rest.used_for_transportation = false;
    else notes.push("vehicles_equity_value with no transportation_vehicle_equity_value: one vehicle, used_for_transportation not stated");
    H.push(rest);
  }

  // ---- the home
  const HE = n("home_equity");
  const livesIn = bool(f.lives_in_owned_home) ?? bool(f.owns_and_lives_in_home);
  if (bool(f.lives_in_owned_home) !== undefined && bool(f.owns_and_lives_in_home) !== undefined && f.lives_in_owned_home !== f.owns_and_lives_in_home) {
    notes.push("lives_in_owned_home and owns_and_lives_in_home differ: lives_in from lives_in_owned_home");
  }
  const homeFlags: Array<[string, string]> = [
    ["intends_to_return_home", "intends_to_return"], ["intent_to_return_home_is_documented_in_writing", "intent_in_writing"],
    ["home_is_outside_colorado", "outside_colorado"], ["home_is_held_in_trust_or_entity", "held_in_trust_or_entity"],
    ["home_has_recorded_beneficiary_deed", "beneficiary_deed"],
  ];
  const ownsHome = (HE ?? 0) > 0 || f.owns_and_lives_in_home === true || f.lives_in_owned_home === true ||
    f.home_is_held_in_trust_or_entity === true || f.home_has_recorded_beneficiary_deed === true || f.home_is_outside_colorado === true;
  if (ownsHome) {
    const h: Holding = { kind: "home" };
    if (HE !== undefined) { h.value = HE; h.amount_owed = 0; }
    if (livesIn !== undefined) h.lives_in = livesIn;
    for (const [k, fld] of homeFlags) if (bool(f[k]) !== undefined) h[fld] = f[k];
    H.push(h);
  } else if (homeFlags.some(([k]) => f[k] === true) || f.lives_in_owned_home === false) {
    notes.push("home facts stated with no home (home_equity 0 or not stated): not restated");
  }

  // ---- life insurance: the person's policies as one record (the facts state totals)
  const face = n("life_insurance_face_value"), csv = n("life_insurance_cash_surrender_value");
  if ((face ?? 0) > 0 || (csv ?? 0) > 0) {
    const r: Holding = { kind: "life_insurance" };
    if (csv !== undefined) r.value = csv;
    if (face !== undefined) r.face_value = face;
    const d = date(f.life_insurance_newest_policy_purchase_date);
    if (d) r.purchase_date = d;
    if (n("life_insurance_payments_in_lookback") !== undefined) r.premiums_in_lookback = n("life_insurance_payments_in_lookback");
    H.push(r);
  }

  // ---- burial funds, contracts and spaces
  const irr = n("irrevocable_burial_funds_value") ?? 0;
  if (irr > 0) H.push({ kind: "burial_fund", value: irr, irrevocable: true });
  const trust = n("revocable_burial_trust_value") ?? 0, contract = n("revocable_prepaid_burial_contract_value") ?? 0;
  let interest = n("burial_funds_accrued_interest") ?? 0;
  const bt: Holding = { kind: "burial_fund", value: trust, irrevocable: false };
  const bc: Holding = { kind: "prepaid_burial_contract", value: contract, irrevocable: false };
  for (const r of [bt, bc]) {
    if (!((r.value as number) > 0)) continue;
    if (n("burial_funds_accrued_interest") !== undefined) {
      const take = Math.min(interest, r.value as number);
      r.accrued_interest = take;
      interest -= take;
    }
    H.push(r);
  }
  if (interest > 0) notes.push(`burial_funds_accrued_interest exceeds the revocable burial funds by ${interest}: capped`);
  const spaces = n("burial_spaces_value_beyond_family_needs") ?? 0;
  if (spaces > 0) H.push({ kind: "burial_space", value: spaces, for_immediate_family: false });

  // ---- trusts, annuities, life estates (the facts state what is available, not the value)
  const corpus = n("trust_corpus_payable_to_person_value") ?? 0;
  const found = n("ma_trust_annuity_life_estate_value_available") ?? 0;
  if (f.has_trust_interest === true || corpus > 0) {
    const r: Holding = { kind: "trust_interest" };
    if (corpus > 0) r.corpus_available_value = corpus;
    if (found > 0 && f.owns_annuity !== true) r.ma_found_available_value = found;
    H.push(r);
  }
  if (f.owns_annuity === true) {
    const r: Holding = { kind: "annuity" };
    if (found > 0 && !(f.has_trust_interest === true || corpus > 0)) r.ma_found_available_value = found;
    H.push(r);
  }
  if (found > 0) {
    if (f.has_trust_interest === true && f.owns_annuity === true) notes.push("value found available with a trust and an annuity both stated: stated on neither (the finding does not say which)");
    else if (!(f.has_trust_interest === true || corpus > 0) && f.owns_annuity !== true) {
      notes.push("value found available with no trust or annuity stated: a life estate");
      H.push({ kind: "life_estate", ma_found_available_value: found });
    }
  }

  // ---- transfers: one record per month's transfer
  const monthsWith = Object.keys(input.months).filter((m) => ["resource_transfer_uncompensated_value", "resource_transfer_date"].some((k) => input.months[m][k] !== undefined)).sort();
  const cands: Array<[string | null, unknown, unknown, unknown, unknown]> = monthsWith.length
    ? monthsWith.map((m) => [m, at("resource_transfer_date", m), at("resource_transfer_uncompensated_value", m), at("resource_transfer_returned_date", m), at("af_transfer_found_not_twfc", m)])
    : [[null, md.resource_transfer_date, md.resource_transfer_uncompensated_value, md.resource_transfer_returned_date, md.af_transfer_found_not_twfc]];
  const transfers: Holding[] = [];
  for (const [m, d0, u0, ret0, twfc0] of cands) {
    const u = num(u0), d = date(d0);
    if (!(u !== undefined && u > 0)) continue;
    if (!d) { notes.push(`a transfer of ${u}${m ? " in " + m : ""} with no date: not restated (a holding with no disposed_date is still held)`); continue; }
    if (m && d.slice(0, 7) !== m) notes.push(`resource_transfer_date ${d} stated for ${m}: the date is the transfer's`);
    if (transfers.some((t) => t.disposed_date === d && t.value === u)) continue;
    const t: Holding = { kind: "other_resource", value: u, amount_owed: 0, compensation_received: 0, disposed_date: d };
    const rd = date(ret0);
    if (rd) t.returned_date = rd;
    if (bool(twfc0) !== undefined) t.af_found_not_twfc = twfc0;
    if (bool(f.snap_resource_transfer_was_to_qualify) !== undefined) t.snap_transfer_to_qualify = f.snap_resource_transfer_was_to_qualify;
    transfers.push(t);
  }
  // Medicaid's look-back total: the same transfers when their total in the
  // sixty months before the determination date is the total
  const ma = n("uncompensated_transfer_value_in_lookback");
  if (ma !== undefined && ma > 0) {
    const from = addMonths(asOf.slice(0, 7), -60);
    const inWindow = transfers.filter((t) => String(t.disposed_date).slice(0, 7) >= from && String(t.disposed_date) <= asOf);
    const total = inWindow.reduce((a, t) => a + (t.value as number), 0);
    if (inWindow.length && Math.abs(total - ma) < 1e-9) {
      if (bool(f.transfer_was_exempt) !== undefined) for (const t of inWindow) t.ma_transfer_exempt = f.transfer_was_exempt;
    } else {
      notes.push(`uncompensated_transfer_value_in_lookback ${ma} is not the total of a dated transfer stated: not restated (the Medicaid track states the transfer with its date)`);
    }
  }
  H.push(...transfers);

  for (const k of NOT_RESTATED) if (f[k] !== undefined && f[k] !== false && f[k] !== 0) notes.push(`${k} not restated (stays a person fact)`);
  // a record of value 0 with nothing else to say is not stated (no holding)
  const out = H.filter((r) => r.value !== 0 || Object.keys(r).some((k) => !["kind", "value", "amount_owed"].includes(k)));
  return { holdings: out, notes };
}

export interface Translated<T> { value: T; notes: string[]; changed: boolean }

/** A home the case states as a joint holding (resource records, step H1,
 *  the Medicaid track; holdings-h0.md 6): no scalar fact states that a home
 *  is owned jointly (home_equity, CO-826, is stated on each spouse who owns
 *  it), so the records are its one statement, and the translation keeps the
 *  holding_id, co_owners and share stated on the home record of the same
 *  equity. Every other field is still the translation of the facts. */
function keepJointHome(out: Holding[] | undefined, stated: unknown): void {
  if (!out || !Array.isArray(stated)) return;
  for (const r of out) {
    if (r.kind !== "home") continue;
    const s = (stated as Holding[]).find((x) => x && x.kind === "home" && x.holding_id !== undefined && x.value === r.value);
    if (!s) continue;
    for (const k of ["share", "co_owners", "holding_id"]) if (s[k] !== undefined) r[k] = s[k];
  }
}

/** A person-month value stated by month ({"2026-07": ...}). */
const isByMonth = (v: unknown): boolean =>
  !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0 && Object.keys(v).every((x) => /^\d{4}-\d{2}$/.test(x));

/** A household with each person's holdings (re)written from its resource facts. */
export function translateCase(c0: HouseholdCase, ix: LedgerIndex): Translated<HouseholdCase> {
  const out = clone(c0);
  const notes: string[] = [];
  let changed = false;
  for (const [pid, p] of Object.entries(c0.persons)) {
    const facts: Record<string, unknown> = {};
    const md: Record<string, unknown> = { ...(p.month_defaults ?? {}) };
    const months: Record<string, Record<string, unknown>> = clone((p as PersonSpec).months ?? {});
    for (const [k, v] of Object.entries(p.facts ?? {})) {
      if (ix.byIdentifier.get(k)?.scope !== "person-month") facts[k] = v;
      else if (isByMonth(v)) for (const [m, mv] of Object.entries(v as Record<string, unknown>)) (months[m] ??= {})[k] = mv;
      else md[k] = v;
    }
    const t = translatePerson(`${c0.id} ${pid}`, { facts, monthDefaults: md, months }, c0.as_of.slice(0, 7), c0.as_of);
    for (const n of t.notes) notes.push(`${c0.id} ${pid}: ${n}`);
    keepJointHome(t.holdings, p.facts?.holdings);
    const before = JSON.stringify(p.facts?.holdings);
    const target = out.persons[pid];
    // a person who states none of the resource facts keeps the holdings as stated
    if (t.holdings !== undefined) target.facts = { ...(target.facts ?? {}), holdings: t.holdings };
    if (JSON.stringify(target.facts?.holdings) !== before) changed = true;
  }
  // A home of the same equity stated on two persons (a couple's home, today
  // stated on each spouse): two records, as the facts state it, unless the
  // case states it as one joint home (holding_id, co_owners, shares), which
  // keepJointHome keeps (the Medicaid track restated the twelve stored
  // couples so).
  const homes = Object.entries(out.persons).flatMap(([pid, p]) =>
    ((p.facts?.holdings as Holding[] | undefined) ?? []).filter((r) => r.kind === "home" && (r.value ?? 0) > 0 && r.holding_id === undefined).map((r) => [pid, r.value] as const));
  for (let i = 0; i < homes.length; i++) for (let j = i + 1; j < homes.length; j++) {
    if (homes[i][1] === homes[j][1]) notes.push(`${c0.id}: ${homes[i][0]} and ${homes[j][0]} each state a home of equity ${homes[i][1]}: two records, as the facts state (one joint home is the Medicaid track's to restate)`);
  }
  return { value: out, notes, changed };
}

/** A rule test with each person's holdings (re)written from its resource
 *  facts. A person-month value stated plainly is the test month's (or every
 *  month's); one keyed by month is stated for its months. */
export function translateTest(t: TestSpec, ix: LedgerIndex, asOf: string): Translated<TestSpec> {
  const out = clone(t);
  const notes: string[] = [];
  const detMonth = t.month ?? asOf.slice(0, 7);
  type Slot = { facts: Record<string, unknown>; md: Record<string, unknown>; months: Record<string, Record<string, unknown>> };
  const persons = new Map<string, Slot>();
  const route = (pid: string, src: Record<string, unknown> | undefined, md0?: Record<string, unknown>, months0?: Record<string, Record<string, unknown>>) => {
    const s: Slot = { facts: {}, md: { ...(md0 ?? {}) }, months: clone(months0 ?? {}) };
    for (const [k, v] of Object.entries(src ?? {})) {
      if (ix.byIdentifier.get(k)?.scope === "person-month") {
        if (isByMonth(v)) {
          for (const [m, mv] of Object.entries(v as Record<string, unknown>)) (s.months[m] ??= {})[k] = mv;
        } else if (t.month) (s.months[t.month] ??= {})[k] = v;
        else s.md[k] = v;
      } else s.facts[k] = v;
    }
    persons.set(pid, s);
  };
  route("p1", t.given, t.month_defaults);
  for (const [pid, f] of Object.entries(t.others ?? {})) route(pid, f);
  for (const [pid, p] of Object.entries(t.persons ?? {})) route(pid, p.facts, p.month_defaults, p.months);
  let changed = false;
  for (const [pid, s] of persons) {
    const tr = translatePerson(`${t.id} ${pid}`, { facts: s.facts, monthDefaults: s.md, months: s.months }, detMonth, asOf);
    for (const n of tr.notes) notes.push(`${t.id} ${pid}: ${n}`);
    if (tr.holdings === undefined) continue;
    const holder: Record<string, unknown> =
      t.persons && pid in t.persons ? (out.persons![pid].facts ??= {})
        : pid === "p1" ? (out.given ??= {})
          : (out.others![pid] ??= {});
    const before = JSON.stringify(holder.holdings);
    holder.holdings = tr.holdings;
    if (JSON.stringify(holder.holdings) !== before) changed = true;
  }
  return { value: out, notes, changed };
}
