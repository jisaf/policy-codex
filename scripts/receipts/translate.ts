// Receipt records, migration phase 1: the one translation of a household or
// rule test stated in the scalar unearned-income facts into the `receipts`
// list (CO-5000). Written once, reviewed as code (restructure review, change
// A; ported from prototypes/receipt-spike/translate.ts and brought to the
// adopted kinds). Transition rule (docs/plan-colorado.md): the old facts are
// kept, so the programs that still read them (Colorado Works, CCCAP,
// Medicaid, CHP+, SUN Bucks) read what they read before, and the receipts
// list states the same money once for LEAP, SNAP and Adult Financial. The
// translator is the only writer of both, so the two cannot disagree; the
// harness re-translates every stored household and reports any whose stored
// receipts differ from the translation of its old facts.
//
// The carving rule: within a month, the facts that are "part of"
// other_unearned_income_taxable/_nontaxable are carved out of that residual;
// lump_sum_received is carved into its retroactive parts, the named receipts
// it overlaps (as CO-4962 decided: as far as the lump sum reaches) and the
// rest; the overlays (PASS, recoupment, IV-D, former spouse, living
// elsewhere, claim expenses, VA care) become fields of the receipt they come
// out of; the thirty-day LEAP facts stamp the one-time receipts of the
// application month and the month before with a date inside or outside the
// income verification period.
import type { HouseholdCase, PersonSpec } from "../../src/engine/cases";
import { addDays, addMonths } from "../../src/engine/evaluate";
import type { LedgerIndex } from "../../src/engine/ledger-index";
import type { TestSpec } from "../../src/engine/types";

export type Receipt = Record<string, unknown> & { kind: string; amount?: number };

/** Aggregate facts: each its own kind. Required today (no reader default). */
export const AGG: ReadonlyArray<readonly [string, string]> = [
  ["social_security_income", "social_security"],
  ["ssi_income", "ssi"],
  ["pension_income", "pension"],
  ["unemployment_income", "unemployment_compensation"],
  ["child_support_received", "child_support"],
  ["tanf_cash_income", "colorado_works_cash"],
  ["adult_financial_cash_income", "adult_financial_cash"],
  ["tax_exempt_interest", "tax_exempt_interest"],
];
/** Facts that are part of the residual other_unearned_income_*:
 *  [fact, kind, taxable residual?, can be paid as a one-time sum?]. */
export const PARTS: ReadonlyArray<readonly [string, string, boolean, boolean]> = [
  ["educational_assistance_received", "educational_assistance", false, false],
  ["loan_proceeds_received", "loan", false, false],
  ["expense_reimbursements_received", "reimbursement", false, false],
  ["energy_assistance_received", "energy_assistance_federal", false, false],
  ["tax_refunds_and_credits_received", "income_tax_refund", false, false],
  ["property_or_food_tax_refund_received", "property_or_food_tax_refund", false, false],
  ["federally_excluded_payments_received", "federally_excluded_payment", false, false],
  ["crime_victim_compensation_received", "crime_victim_compensation", false, true],
  ["foster_care_provider_payments_received", "foster_care_payment", false, true],
  ["kinship_care_payments_received", "kinship_care_payment", false, true],
  ["tanf_diversion_payment_received", "colorado_works_diversion", false, true],
  ["reverse_mortgage_payments_received", "reverse_mortgage", false, true],
  ["housing_utility_allowance_received", "housing_utility_allowance", false, true],
  ["gi_bill_housing_and_food_allowances_received", "gi_bill_housing_food_allowance", false, true],
  ["refugee_resettlement_payments_received", "refugee_resettlement", false, true],
  ["tanf_supportive_service_payments_received", "colorado_works_supportive_services", false, true],
  ["workers_compensation_claim_expense_amounts_received", "workers_compensation", false, true],
  ["americorps_payments_received", "americorps", false, false],
  ["workforce_program_payments_received", "workforce_program_payment", false, false],
  ["general_or_emergency_assistance_received", "general_assistance", false, false],
  ["in_home_care_allowance_received", "in_home_care_allowance", false, false],
  ["va_aid_and_attendance_used_for_uncovered_care", "va_aid_and_attendance", false, false],
  ["uniformed_services_special_pay_received", "uniformed_services_special_pay", false, false],
  ["state_veteran_annuity_received", "state_veteran_annuity", false, false],
  ["charitable_need_based_cash_received", "charitable_need_based_cash", false, false],
  ["migrant_farmworker_emergency_assistance_received", "migrant_farmworker_emergency_assistance", false, false],
  ["gifts_received", "gift", false, false],
  ["charitable_gifts_for_life_threatening_condition_received", "charitable_gift_life_threatening_condition", false, false],
  ["taxable_interest_and_dividend_income", "interest_and_dividends", true, false],
  ["rental_income_received", "rental_income", true, false],
];
/** Parts of a part: [fact, kind, the part fact it is carved out of]. */
export const SUBPARTS: ReadonlyArray<readonly [string, string, string]> = [
  ["energy_assistance_from_nonprofit_or_supplier_received", "energy_assistance_other", "energy_assistance_received"],
  ["dvsa_title_i_volunteer_payments_received", "dvsa_title_i_volunteer_payment", "federally_excluded_payments_received"],
  ["vocational_training_allowance_received", "vocational_training_allowance", "workforce_program_payments_received"],
];
/** Every person-month fact the translation reads. */
export const MONTH_FACTS: ReadonlySet<string> = new Set<string>([
  ...AGG.map((a) => a[0]), ...PARTS.map((p) => p[0]), ...SUBPARTS.map((s) => s[0]),
  "other_unearned_income_taxable", "other_unearned_income_nontaxable", "lump_sum_received",
  "retroactive_social_security_lump_sum_received", "retroactive_ssi_or_public_assistance_lump_sum_received",
  "lottery_gambling_winnings_received", "lottery_gambling_largest_single_game_winnings_received",
  "child_support_arrears_received", "pass_set_aside_income", "overpayment_recoupment_withheld",
  "overpayment_recoupment_for_intentional_violation_withheld", "child_support_received_transferred_to_child_support_agency",
  "military_retirement_paid_to_former_spouse", "income_received_for_person_living_elsewhere",
  "infrequent_or_irregular_income_received", "periodic_unearned_income_received", "americorps_service_hours",
  "money_received_from_sponsor",
]);
/** Person-scope facts the translation reads (the LEAP thirty-day facts and the periodic income). */
export const PERSON_FACTS: ReadonlySet<string> = new Set<string>([
  "lottery_gambling_winnings_received_prior_thirty_days", "lump_sum_received_prior_thirty_days",
  "retroactive_social_security_lump_sum_received_prior_thirty_days",
  "retroactive_ssi_or_public_assistance_lump_sum_received_prior_thirty_days",
  "resource_liquidation_proceeds_received_prior_thirty_days", "insurance_proceeds_spent_on_covered_costs_prior_thirty_days",
  "refugee_resettlement_grant_received_prior_thirty_days", "named_source_receipts_in_lump_sum_prior_thirty_days",
  "unearned_income_received_prior_thirty_days", "periodic_unearned_income_frequency", "periodic_unearned_income_per_payment",
]);

const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** How a fact naming two sources is translated when the household does not
 *  say which (the kinds split them): per case id, the kind chosen. */
export interface Choices {
  /** retroactive_ssi_or_public_assistance_lump_sum_received: ssi (default),
   *  colorado_works_cash or adult_financial_cash. */
  retroactiveSsiOrPa?: Record<string, string>;
  /** general_or_emergency_assistance_received: general_assistance (default) or emergency_assistance. */
  generalOrEmergency?: Record<string, string>;
}

interface Carve { receipts: Receipt[]; notes: string[] }

/** Carves one month's statement (fact -> value) into receipts. */
function carve(
  v: Record<string, unknown>, person: { per_payment?: number; frequency?: string },
  kinds: { rssi: string; gea: string }, overlapCap?: number,
): Carve {
  const notes: string[] = [];
  const R: Receipt[] = [];
  const get = (k: string) => num(v[k]) ?? 0;
  for (const [f, kind] of AGG) {
    if (v[f] === undefined) R.push({ kind }); // required and not stated: amount unknown
    else if (num(v[f])! !== 0) R.push({ kind, amount: num(v[f])! });
  }
  const arrears = get("child_support_arrears_received");
  if (arrears > 0) {
    const cs = R.find((r) => r.kind === "child_support" && typeof r.amount === "number");
    if (cs) cs.amount = (cs.amount as number) - arrears; else notes.push("child support arrears with no child support stated");
    R.push({ kind: "child_support_arrears", amount: arrears });
  }
  const resTax0 = num(v.other_unearned_income_taxable);
  const resNon0 = num(v.other_unearned_income_nontaxable);
  const resKnown = resTax0 !== undefined && resNon0 !== undefined;
  let carveT = 0, carveN = 0;
  const take = (amt: number, taxable: boolean) => { if (taxable) carveT += amt; else carveN += amt; };
  const oneTimeAble: Receipt[] = [];
  for (const [f, kind0, taxable, ota] of PARTS) {
    let amt = get(f);
    if (amt <= 0) continue;
    const kind = f === "general_or_emergency_assistance_received" ? kinds.gea : kind0;
    for (const [sf, skind, parent] of SUBPARTS) {
      if (parent !== f) continue;
      const s = Math.min(amt, get(sf));
      if (get(sf) > amt) notes.push(`${sf} ${get(sf)} exceeds ${f} ${amt}`);
      if (s > 0) { R.push({ kind: skind, amount: s }); amt -= s; take(s, taxable); }
    }
    if (amt <= 0) continue;
    const r: Receipt = { kind, amount: amt };
    if (kind === "workers_compensation") r.claim_expense = amt;
    if (kind === "va_aid_and_attendance") r.used_for_uncovered_medical_care = amt;
    if (kind === "americorps" && v.americorps_service_hours !== undefined) r.hours_served = v.americorps_service_hours;
    R.push(r);
    take(amt, taxable);
    if (ota) oneTimeAble.push(r);
  }
  // a subpart stated with its parent not stated
  for (const [sf, skind, parent] of SUBPARTS) {
    if (get(sf) > 0 && get(parent) <= 0) {
      notes.push(`${sf} stated without ${parent}: taken as part of the residual`);
      R.push({ kind: skind, amount: get(sf) });
      take(get(sf), false);
    }
  }
  // the sponsor's money is not part of any other fact
  if (get("money_received_from_sponsor") > 0) R.push({ kind: "sponsor_payment", amount: get("money_received_from_sponsor") });
  // lump sums: retroactive parts, the named receipts the lump sum reaches, the rest
  const lump = get("lump_sum_received");
  const rss = get("retroactive_social_security_lump_sum_received");
  const rssi = get("retroactive_ssi_or_public_assistance_lump_sum_received");
  if (lump > 0 || rss > 0 || rssi > 0) {
    if (rss > 0) { R.push({ kind: "social_security", amount: rss, frequency: "once", retroactive: true }); take(rss, false); }
    if (rssi > 0) { R.push({ kind: kinds.rssi, amount: rssi, frequency: "once", retroactive: true }); take(rssi, false); }
    if (rss + rssi > lump) notes.push(`retroactive parts ${rss + rssi} exceed lump_sum_received ${lump}`);
    let reach = Math.max(0, lump - rss - rssi);
    // the overlap the old facts force (CO-4962): named receipts lie in the
    // lump sum as far as it reaches, unless the case states how much of the
    // thirty-day lump sum they are (CO-4960)
    let cap = overlapCap ?? Infinity;
    for (const r of oneTimeAble) {
      if (reach <= 0 || cap <= 0) break;
      const a = r.amount as number;
      const inLump = Math.min(a, reach, cap);
      reach -= inLump;
      cap -= inLump;
      if (inLump === a) r.frequency = "once";
      else { r.amount = a - inLump; R.push({ ...r, amount: inLump, frequency: "once" }); }
    }
    if (reach > 0) { R.push({ kind: "other_nontaxable", amount: reach, frequency: "once" }); take(reach, false); }
  }
  // irregular income: a receipt of its own, out of the residual
  const irr = get("infrequent_or_irregular_income_received");
  if (irr > 0) { R.push({ kind: "other_nontaxable", amount: irr, irregular: true }); take(irr, false); }
  // the residual: what is left of the two other-unearned facts
  if (resKnown) {
    let t = (resTax0 as number) - carveT, n = (resNon0 as number) - carveN;
    if (t < 0) { n += t; t = 0; }
    if (n < 0) { t += n; n = 0; }
    if (t < 0) { notes.push(`parts exceed other_unearned_income by ${-t}`); t = 0; }
    if (t > 0) R.push({ kind: "other_taxable", amount: t });
    if (n > 0) R.push({ kind: "other_nontaxable", amount: n });
  } else {
    if (resTax0 === undefined) R.push({ kind: "other_taxable" });
    else if (resTax0 > 0) R.push({ kind: "other_taxable", amount: resTax0 });
    if (resNon0 === undefined) R.push({ kind: "other_nontaxable" });
    else if (resNon0 > 0) R.push({ kind: "other_nontaxable", amount: resNon0 });
    if (carveT + carveN > 0) notes.push("parts stated with a residual not stated: the parts are added beside it");
  }
  // a periodic income: split out of the receipt that holds it
  const pr = get("periodic_unearned_income_received");
  if (person.per_payment !== undefined && person.per_payment > 0) {
    if (pr > 0) {
      const host = ["unemployment_compensation", "pension", "child_support", "social_security", "other_nontaxable", "other_taxable"]
        .map((k) => R.find((r) => r.kind === k && typeof r.amount === "number" && (r.amount as number) >= pr && r.frequency === undefined && !r.irregular))
        .find(Boolean);
      if (host) {
        host.amount = (host.amount as number) - pr;
        R.push({ kind: host.kind, amount: pr, frequency: person.frequency, per_payment: person.per_payment });
      } else notes.push("periodic receipt with no host");
    } else {
      R.push({ kind: "other_nontaxable", amount: 0, frequency: person.frequency, per_payment: person.per_payment });
      notes.push("periodic per-payment stated in a month with no such receipt: kept as a stream of amount 0 (the old reading)");
    }
  }
  // gambling: one record per game
  const lot = get("lottery_gambling_winnings_received");
  const big = num(v.lottery_gambling_largest_single_game_winnings_received);
  if (lot > 0) {
    if (big !== undefined && big > 0 && big < lot) {
      R.push({ kind: "gambling_winnings", amount: big, frequency: "once" });
      R.push({ kind: "gambling_winnings", amount: lot - big, frequency: "once" });
    } else R.push({ kind: "gambling_winnings", amount: lot, frequency: "once" });
  } else if (big !== undefined && big > 0) {
    R.push({ kind: "gambling_winnings", amount: big, frequency: "once" });
    notes.push("largest single game stated with no month's winnings: one game");
  }
  // earmarks onto the receipt they come out of
  const recurring = (r: Receipt) => typeof r.amount === "number" && r.frequency !== "once";
  const host = (kinds2: string[] | null, amt: number): Receipt => {
    const pool = R.filter((r) => recurring(r) && (!kinds2 || kinds2.includes(r.kind)));
    const h = pool.find((r) => (r.amount as number) >= amt) ?? pool[0];
    if (h) return h;
    const z: Receipt = { kind: "other_nontaxable", amount: 0 };
    R.push(z);
    notes.push("earmark with no host receipt: kept on a receipt of amount 0");
    return z;
  };
  const mark = (f: string, field: string, kinds2: string[] | null) => {
    const amt = get(f);
    if (amt <= 0) return;
    const h = host(kinds2, amt);
    h[field] = ((h[field] as number) ?? 0) + amt;
  };
  // PASS: most often Social Security disability income (coverage review 3 F3-1)
  const pass = get("pass_set_aside_income");
  const ss = R.find((r) => r.kind === "social_security" && recurring(r) && (r.amount as number) >= pass);
  if (ss && pass > 0) ss.pass_set_aside = pass;
  // never SSI: the old fact was subtracted from the income other than SSI
  else mark("pass_set_aside_income", "pass_set_aside", [...new Set(R.map((r) => r.kind))].filter((k) => k !== "ssi"));
  mark("overpayment_recoupment_withheld", "recouped", null);
  // the intentional-violation part sits on the receipt the recoupment does
  const iv = get("overpayment_recoupment_for_intentional_violation_withheld");
  if (iv > 0) {
    const h = R.find((r) => typeof r.recouped === "number") ?? host(null, iv);
    h.recouped_for_intentional_violation = iv;
  }
  mark("child_support_received_transferred_to_child_support_agency", "transferred_to_child_support_agency", ["child_support"]);
  mark("military_retirement_paid_to_former_spouse", "paid_to_former_spouse", ["pension"]);
  mark("income_received_for_person_living_elsewhere", "for_person_living_elsewhere", null);
  const out = R.filter((r) => r.amount === undefined || (r.amount as number) !== 0 || Object.keys(r).length > 2);
  return { receipts: out, notes };
}

/** The months a household's evaluation can read: the as-of month, the
 *  months its expectations and its stated months name. */
function caseMonths(asOf: string, expect: unknown, persons: Record<string, PersonSpec>, extra: string[] = []): string[] {
  const ms = new Set<string>([asOf.slice(0, 7), ...extra]);
  for (const ex of Object.values((expect ?? {}) as Record<string, Record<string, unknown>>)) {
    for (const v of Object.values(ex ?? {})) {
      if (v && typeof v === "object" && !Array.isArray(v)) for (const k of Object.keys(v)) if (/^\d{4}-\d{2}$/.test(k)) ms.add(k);
    }
  }
  for (const p of Object.values(persons)) for (const k of Object.keys(p.months ?? {})) ms.add(k);
  return [...ms].sort();
}

const touches = (o: Record<string, unknown> | undefined) => Object.keys(o ?? {}).some((k) => MONTH_FACTS.has(k));
const ONE_TIME_FACTS = ["lump_sum_received", "retroactive_social_security_lump_sum_received",
  "retroactive_ssi_or_public_assistance_lump_sum_received", "lottery_gambling_winnings_received",
  "lottery_gambling_largest_single_game_winnings_received"];

/** A canonical key of a record without its month. */
const keyOf = (r: Receipt) => JSON.stringify(Object.keys(r).filter((k) => k !== "month").sort().map((k) => [k, r[k]]));

export interface PersonInput {
  facts: Record<string, unknown>;
  monthDefaults: Record<string, unknown>;
  months: Record<string, Record<string, unknown>>;
}

/** One person's receipts, or undefined when the person states none of the
 *  facts the receipts restate (then the list stays unstated: unknown, as
 *  each old fact was). */
export function translatePerson(
  id: string, input: PersonInput, window: string[], applicationDate: string | undefined, choices: { rssi: string; gea: string },
): { receipts: Receipt[] | undefined; notes: string[] } {
  const notes: string[] = [];
  const pf = input.facts;
  if (!touches(input.monthDefaults) && !Object.values(input.months).some(touches) &&
    !Object.keys(pf).some((k) => PERSON_FACTS.has(k))) return { receipts: undefined, notes };
  const person = { per_payment: num(pf.periodic_unearned_income_per_payment), frequency: pf.periodic_unearned_income_frequency as string | undefined };
  const expand = Object.values(input.months).some(touches) || ONE_TIME_FACTS.some((f) => (num(input.monthDefaults[f]) ?? 0) > 0);
  const buckets: Array<[string | null, Record<string, unknown>]> = expand
    ? window.map((m) => [m, { ...input.monthDefaults, ...(input.months[m] ?? {}) }])
    : [[null, input.monthDefaults]];
  const app = applicationDate;
  const perBucket: Array<[string | null, Receipt[]]> = [];
  for (const [m, vals] of buckets) {
    const inWindowBucket = !m || (app !== undefined && (m === app.slice(0, 7) || m === addMonths(app.slice(0, 7), -1)));
    const cv = carve(vals, person, choices, inWindowBucket ? num(pf.named_source_receipts_in_lump_sum_prior_thirty_days) : undefined);
    for (const n of cv.notes) notes.push(`${id}${m ? " " + m : ""}: ${n}`);
    perBucket.push([m, cv.receipts]);
  }
  // A recurring record the same in every month of the window is stated once,
  // with no month (it recurs in every month); the rest carry their month.
  let receipts: Receipt[] = [];
  if (!expand) receipts = perBucket[0][1];
  else {
    const counts = perBucket.map(([, rs]) => {
      const c = new Map<string, number>();
      for (const r of rs) c.set(keyOf(r), (c.get(keyOf(r)) ?? 0) + 1);
      return c;
    });
    const common = new Map<string, number>();
    for (const [k, n] of counts[0]) {
      const every = Math.min(n, ...counts.map((c) => c.get(k) ?? 0));
      if (every > 0) common.set(k, every);
    }
    const commonLeft = new Map<string, number>();
    for (const [m, rs] of perBucket) {
      const left = new Map(common);
      for (const r of rs) {
        const k = keyOf(r);
        if (r.frequency !== "once" && (left.get(k) ?? 0) > 0) {
          left.set(k, left.get(k)! - 1);
          if (m === perBucket[0][0]) { receipts.push(r); commonLeft.set(k, (commonLeft.get(k) ?? 0) + 1); }
          continue;
        }
        if (typeof r.amount === "number" || r.amount === undefined) receipts.push({ ...r, month: m! });
      }
    }
    // a recurring record common to every month is stated before the dated ones
    receipts = [...receipts.filter((r) => r.month === undefined), ...receipts.filter((r) => r.month !== undefined)];
  }
  // the thirty-day window facts
  const lot30 = num(pf.lottery_gambling_winnings_received_prior_thirty_days);
  const lump30 = num(pf.lump_sum_received_prior_thirty_days);
  if ((lot30 !== undefined || lump30 !== undefined) && !app) notes.push(`${id}: thirty-day facts with no LEAP application date`);
  if (pf.unearned_income_received_prior_thirty_days !== undefined) {
    notes.push(`${id}: unearned_income_received_prior_thirty_days ${pf.unearned_income_received_prior_thirty_days} not restated (LEAP reads the application month's recurring receipts, 3.752.22.A's one month)`);
  }
  if (app && (lot30 !== undefined || lump30 !== undefined)) {
    const am = app.slice(0, 7), bm = addMonths(am, -1);
    const start = addDays(app, -((Date.UTC(+am.slice(0, 4), +am.slice(5, 7) - 1, 1) - Date.UTC(+bm.slice(0, 4), +bm.slice(5, 7) - 1, 1)) / 86400000));
    // A date inside the period in the receipt's own month (the application
    // date, or the last day of the month before), and one outside it: the
    // day before the period starts, or the day after the application. When
    // the record's month has no day outside the period, it stays undated.
    const lastOfBm = addDays(`${am}-01`, -1);
    const dayBefore = addDays(app, -1);
    const insideFor = (m: string | undefined) => (m === bm ? lastOfBm : dayBefore.slice(0, 7) === am ? dayBefore : app);
    const inside = insideFor(am);
    const outsideFor = (m: string | undefined): string | undefined => {
      const d = m === bm ? addDays(start, -1) : addDays(app, 1);
      if (d.slice(0, 7) !== (m ?? am)) { notes.push(`${id}: no day of ${m ?? am} is outside the income verification period; the receipt is left undated`); return undefined; }
      return d;
    };
    const isIn = (r: Receipt) => r.date === insideFor(am) || r.date === lastOfBm;
    const setDate = (r: Receipt, d: string | undefined) => { if (d === undefined) delete r.date; else r.date = d; };
    const inWin = (r: Receipt) => r.frequency === "once" && (r.month === undefined || r.month === am || r.month === bm);
    const place = (cands: Receipt[], target: number, mk: () => Receipt, what: string) => {
      let left = target;
      for (const r of cands) {
        const amt = r.amount as number;
        const rm = r.month as string | undefined;
        if (left <= 1e-9) { setDate(r, outsideFor(rm)); continue; }
        if (amt <= left) { r.date = insideFor(rm); left -= amt; continue; }
        const rest: Receipt = { ...r, amount: amt - left };
        setDate(rest, outsideFor(rm));
        receipts.push(rest);
        r.amount = left; r.date = insideFor(rm); left = 0;
      }
      if (left > 1e-9) {
        receipts.push({ ...mk(), amount: left, month: inside.slice(0, 7), date: inside });
        notes.push(`${id}: ${what} states ${left} the month facts do not: added as a receipt dated ${inside}`);
      }
    };
    if (lot30 !== undefined) {
      place(receipts.filter((r) => inWin(r) && r.kind === "gambling_winnings" && typeof r.amount === "number"), lot30,
        () => ({ kind: "gambling_winnings", frequency: "once" }), "lottery_gambling_winnings_received_prior_thirty_days");
    }
    if (lump30 !== undefined) {
      // the one-time receipts (other than gambling) of the application month
      // and the month before are the money the thirty-day figure states, the
      // retroactive ones first, the unnamed one-time ones last
      const order = (r: Receipt) => (r.retroactive ? 0 : r.kind === "other_nontaxable" ? 2 : 1);
      const cands = receipts.filter((r) => inWin(r) && r.kind !== "gambling_winnings" && typeof r.amount === "number")
        .sort((x, y) => order(x) - order(y));
      place(cands, lump30, () => ({ kind: "other_nontaxable", frequency: "once" }), "lump_sum_received_prior_thirty_days");
      const rss30 = num(pf.retroactive_social_security_lump_sum_received_prior_thirty_days) ?? 0;
      const rssi30 = num(pf.retroactive_ssi_or_public_assistance_lump_sum_received_prior_thirty_days) ?? 0;
      const retroIn = receipts.filter((r) => r.retroactive && isIn(r)).reduce((t, r) => t + (r.amount as number), 0);
      if (rss30 + rssi30 > retroIn + 1e-9) {
        // the thirty-day retroactive parts the month facts do not state
        let left = rss30 + rssi30 - retroIn;
        for (const r of receipts.filter((x) => isIn(x) && x.kind === "other_nontaxable" && !x.retroactive)) {
          if (left <= 1e-9) break;
          const a = r.amount as number;
          const take = Math.min(a, left);
          const kind = rss30 > 0 ? "social_security" : choices.rssi;
          if (take === a) { r.kind = kind; r.retroactive = true; } else { r.amount = a - take; receipts.push({ ...r, kind, amount: take, retroactive: true }); }
          left -= take;
        }
        notes.push(`${id}: retroactive thirty-day parts ${rss30 + rssi30} taken from the thirty-day lump sum`);
      }
      const liq = num(pf.resource_liquidation_proceeds_received_prior_thirty_days) ?? 0;
      const ins = num(pf.insurance_proceeds_spent_on_covered_costs_prior_thirty_days) ?? 0;
      const ref = num(pf.refugee_resettlement_grant_received_prior_thirty_days);
      if (liq > 0 || ins > 0) {
        const h = receipts.find((r) => r.kind === "other_nontaxable" && isIn(r) && !r.retroactive);
        if (h && liq > 0) {
          const a = h.amount as number;
          if (liq >= a) h.kind = "resource_liquidation";
          else { h.amount = a - liq; receipts.push({ ...h, kind: "resource_liquidation", amount: liq }); }
        }
        if (h && ins > 0) h.spent_on_covered_costs = ins;
        if (!h) notes.push(`${id}: liquidation or insurance part with no one-time receipt`);
      }
      if (ref !== undefined && ref > 0) {
        const inRef = receipts.filter((r) => r.kind === "refugee_resettlement" && isIn(r)).reduce((t, r) => t + (r.amount as number), 0);
        if (Math.abs(inRef - ref) > 1e-9) notes.push(`${id}: refugee_resettlement_grant_received_prior_thirty_days ${ref} against ${inRef} placed in the period`);
      }
    }
  }
  return { receipts, notes };
}

/** The month window a household's receipts are written over when they must
 *  be stated by month: 14 months before its first month to 3 after its last. */
function windowOf(months: string[]): string[] {
  const out: string[] = [];
  for (let m = addMonths(months[0], -14); m <= addMonths(months[months.length - 1], 3); m = addMonths(m, 1)) out.push(m);
  return out;
}

function choiceFor(choices: Choices | undefined, caseId: string, pid: string) {
  const key = `${caseId}:${pid}`;
  return {
    rssi: choices?.retroactiveSsiOrPa?.[key] ?? choices?.retroactiveSsiOrPa?.[caseId] ?? "ssi",
    gea: choices?.generalOrEmergency?.[key] ?? choices?.generalOrEmergency?.[caseId] ?? "general_assistance",
  };
}

export interface Translated<T> { value: T; notes: string[]; changed: boolean }

/** A household with each person's receipts (re)written from its old facts.
 *  Person-month facts stated under `facts` are read as every month, as the
 *  engine reads them. */
/** Old facts a migration retired (no reader is left), by identifier, with
 *  their scope. A stored household's statement of one is kept in
 *  retired-facts.yaml, which the translation reads beside the household, so
 *  its receipts stay the translation of everything it stated. */
export const RETIRED: Readonly<Record<string, "person" | "person-month">> = {
  // LEAP (migration phase 1): the thirty-day and placement facts
  lottery_gambling_winnings_received_prior_thirty_days: "person",
  lump_sum_received_prior_thirty_days: "person",
  retroactive_social_security_lump_sum_received_prior_thirty_days: "person",
  retroactive_ssi_or_public_assistance_lump_sum_received_prior_thirty_days: "person",
  resource_liquidation_proceeds_received_prior_thirty_days: "person",
  refugee_resettlement_grant_received_prior_thirty_days: "person",
  insurance_proceeds_spent_on_covered_costs_prior_thirty_days: "person",
  named_source_receipts_in_lump_sum_prior_thirty_days: "person",
  americorps_service_hours: "person-month",
  // LEAP's own reads, left unread when it moved: gifts (the verification
  // trigger), and three of its excluded sources no other program reads
  gifts_received: "person-month",
  gi_bill_housing_and_food_allowances_received: "person-month",
  housing_utility_allowance_received: "person-month",
  workers_compensation_claim_expense_amounts_received: "person-month",
  // SNAP (migration phase 1): the parts and earmarks only SNAP read, and the
  // periodic income and the largest single game
  child_support_received_transferred_to_child_support_agency: "person-month",
  dvsa_title_i_volunteer_payments_received: "person-month",
  energy_assistance_from_nonprofit_or_supplier_received: "person-month",
  income_received_for_person_living_elsewhere: "person-month",
  lottery_gambling_largest_single_game_winnings_received: "person-month",
  migrant_farmworker_emergency_assistance_received: "person-month",
  military_retirement_paid_to_former_spouse: "person-month",
  overpayment_recoupment_for_intentional_violation_withheld: "person-month",
  overpayment_recoupment_withheld: "person-month",
  periodic_unearned_income_frequency: "person",
  periodic_unearned_income_per_payment: "person",
  periodic_unearned_income_received: "person-month",
  // Adult Financial (migration phase 1): SSI, and the sources only its
  // exclusions named
  ssi_income: "person-month",
  charitable_gifts_for_life_threatening_condition_received: "person-month",
  property_or_food_tax_refund_received: "person-month",
  state_veteran_annuity_received: "person-month",
  uniformed_services_special_pay_received: "person-month",
};
/** case id -> person -> retired fact -> value, as stated before retirement. */
export type RetiredFacts = Record<string, Record<string, Record<string, unknown>>>;

/** A household with the facts a migration retired from it put back: what
 *  it stated before the migration (the harness evaluates the old ledger on
 *  it; the translation reads it). */
export function withRetired(c0: HouseholdCase, retired?: RetiredFacts): HouseholdCase {
  const c = clone(c0);
  for (const [pid, facts] of Object.entries(retired?.[c.id] ?? {})) {
    const p = c.persons[pid];
    if (!p) continue;
    for (const [k, v] of Object.entries(facts)) {
      if (RETIRED[k] !== "person-month") (p.facts ??= {})[k] = v;
      else if (v && typeof v === "object" && !Array.isArray(v)) {
        // stated month by month: { "2026-10": value, ... }
        for (const [m, mv] of Object.entries(v as Record<string, unknown>)) ((p.months ??= {})[m] ??= {})[k] = mv;
      } else (p.month_defaults ??= {})[k] = v;
    }
  }
  return c;
}

export function translateCase(c0: HouseholdCase, ix: LedgerIndex, choices?: Choices, retired?: RetiredFacts): Translated<HouseholdCase> {
  const out = clone(c0);
  const notes: string[] = [];
  // the household as translated: its statements and its retired ones
  const c = withRetired(c0, retired);
  const app = (c.case_facts?.leap_application_date as string | undefined) ?? undefined;
  const window = windowOf(caseMonths(c.as_of, c.expect, c.persons, app ? [app.slice(0, 7), addMonths(app.slice(0, 7), -1)] : []));
  let changed = false;
  for (const [pid, p] of Object.entries(c.persons)) {
    const facts: Record<string, unknown> = {};
    const md: Record<string, unknown> = { ...(p.month_defaults ?? {}) };
    for (const [k, v] of Object.entries(p.facts ?? {})) {
      if ((ix.byIdentifier.get(k)?.scope ?? RETIRED[k]) === "person-month") md[k] = v; else facts[k] = v;
    }
    const t = translatePerson(`${c.id} ${pid}`, { facts, monthDefaults: md, months: p.months ?? {} }, window, app, choiceFor(choices, c.id, pid));
    notes.push(...t.notes);
    const before = JSON.stringify(p.facts?.receipts);
    const target = out.persons[pid];
    // A person who states none of the old facts keeps the receipts as
    // stated: a household written in receipts alone has nothing to translate.
    if (t.receipts !== undefined) target.facts = { ...(target.facts ?? {}), receipts: t.receipts };
    if (JSON.stringify(target.facts?.receipts) !== before) changed = true;
  }
  return { value: out, notes, changed };
}

/** A rule test with each person's receipts (re)written from its old facts.
 *  A person-month value stated plainly is the test month's (makeCase); it is
 *  restated as a recurring receipt with no month, which the test month reads
 *  the same, so the test's receipts stay as short as its facts. A value
 *  keyed by month is stated for its months. */
export function translateTest(t: TestSpec, ix: LedgerIndex, asOf: string, choices?: Choices, retired?: RetiredFacts): Translated<TestSpec> {
  const out = clone(t);
  const notes: string[] = [];
  const testMonth = t.month ?? null;
  const app = (t.case_facts?.leap_application_date ?? t.given?.leap_application_date) as string | undefined;
  type Slot = { facts: Record<string, unknown>; md: Record<string, unknown>; months: Record<string, Record<string, unknown>> };
  const persons = new Map<string, Slot>();
  const route = (pid: string, src: Record<string, unknown> | undefined, md0?: Record<string, unknown>, months0?: Record<string, Record<string, unknown>>) => {
    const s: Slot = { facts: {}, md: { ...(md0 ?? {}) }, months: clone(months0 ?? {}) };
    for (const [k, v] of Object.entries(src ?? {})) {
      const it = ix.byIdentifier.get(k);
      if ((it?.scope ?? RETIRED[k]) === "person-month") {
        if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).every((x) => /^\d{4}-\d{2}$/.test(x))) {
          for (const [m, mv] of Object.entries(v as Record<string, unknown>)) (s.months[m] ??= {})[k] = mv;
        } else s.md[k] = v;
      } else s.facts[k] = v;
    }
    for (const [k, v] of Object.entries(retired?.[t.id]?.[pid] ?? {})) {
      if (RETIRED[k] !== "person-month") s.facts[k] = v;
      else if (v && typeof v === "object" && !Array.isArray(v)) {
        for (const [m, mv] of Object.entries(v as Record<string, unknown>)) (s.months[m] ??= {})[k] = mv;
      } else s.md[k] = v;
    }
    persons.set(pid, s);
  };
  route("p1", t.given, t.month_defaults);
  for (const [pid, f] of Object.entries(t.others ?? {})) route(pid, f);
  for (const [pid, p] of Object.entries(t.persons ?? {})) route(pid, p.facts, p.month_defaults, p.months);
  const ms = [asOf.slice(0, 7)];
  if (testMonth) ms.push(testMonth);
  for (const s of persons.values()) ms.push(...Object.keys(s.months));
  if (app) ms.push(app.slice(0, 7), addMonths(app.slice(0, 7), -1));
  const window = windowOf([...new Set(ms)].sort());
  let changed = false;
  for (const [pid, s] of persons) {
    const tr = translatePerson(`${t.id} ${pid}`, { facts: s.facts, monthDefaults: s.md, months: s.months }, window, app, choiceFor(choices, t.id, pid));
    notes.push(...tr.notes);
    if (tr.receipts === undefined) continue; // stated in receipts alone: kept as stated
    const holder: Record<string, unknown> =
      t.persons && pid in t.persons ? (out.persons![pid].facts ??= {})
        : pid === "p1" ? (out.given ??= {})
          : (out.others![pid] ??= {});
    const before = JSON.stringify(holder.receipts);
    holder.receipts = tr.receipts;
    if (JSON.stringify(holder.receipts) !== before) changed = true;
  }
  return { value: out, notes, changed };
}
