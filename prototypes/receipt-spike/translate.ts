// Receipt spike: the one-time translation of a household stated in today's
// scalar facts into each candidate model. Written once, reviewed as code
// (restructure review, change A). It keeps the old scalar facts in place, so
// every item outside the three slices reads what it read before; it adds the
// new model's statement of the same money for the slice items to read.
//
// The carving rule (shared by both models): within a month, the facts that
// are "part of" other_unearned_income_taxable/_nontaxable are carved out of
// that residual; lump_sum_received is carved into its retroactive parts, the
// named receipts it overlaps (as CO-4962 decides today: as far as the lump
// sum reaches) and the rest; the overlays (PASS, recoupment, IV-D, former
// spouse, living elsewhere, claim expenses, VA care) become fields of the
// receipt they come out of (A) or stay as they are (B).
import type { HouseholdCase, PersonSpec } from "../../src/engine/cases";
import { addMonths, addDays, evaluate, makeCase } from "../../src/engine/evaluate";
import { caseToSpec } from "../../src/engine/cases";
import type { LedgerIndex } from "../../src/engine/ledger-index";

export type Receipt = Record<string, unknown> & { kind: string; amount?: number };

/** Aggregate facts: the source facts every program sums. Required today. */
const AGG: Array<[string, string]> = [
  ["social_security_income", "social_security"],
  ["ssi_income", "ssi"],
  ["pension_income", "pension"],
  ["unemployment_income", "unemployment_compensation"],
  ["child_support_received", "child_support"],
  ["tanf_cash_income", "colorado_works_cash"],
  ["adult_financial_cash_income", "adult_financial_cash"],
  ["tax_exempt_interest", "tax_exempt_interest"],
];
/** Facts that are part of the residual other_unearned_income_*; [fact, kind, taxable?, one-time-able?]. */
const PARTS: Array<[string, string, boolean, boolean]> = [
  ["educational_assistance_received", "educational_assistance", false, false],
  ["loan_proceeds_received", "loan", false, false],
  ["expense_reimbursements_received", "reimbursement", false, false],
  ["energy_assistance_received", "energy_assistance", false, false],
  ["tax_refunds_and_credits_received", "tax_refund_or_credit", false, false],
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
  ["general_or_emergency_assistance_received", "general_or_emergency_assistance", false, false],
  ["in_home_care_allowance_received", "in_home_care_allowance", false, false],
  ["va_aid_and_attendance_used_for_uncovered_care", "va_aid_and_attendance", false, false],
  ["uniformed_services_special_pay_received", "uniformed_services_special_pay", false, false],
  ["state_veteran_annuity_received", "state_veteran_annuity", false, false],
  ["charitable_need_based_cash_received", "charitable_need_based_cash", false, false],
  ["migrant_farmworker_emergency_assistance_received", "migrant_farmworker_emergency_assistance", false, false],
  ["taxable_interest_and_dividend_income", "interest_and_dividends", true, false],
  ["rental_income_received", "rental_income", true, false],
];
/** Every person-month fact the carve reads. */
export const SLICE_MONTH_FACTS = new Set<string>([
  ...AGG.map((a) => a[0]), ...PARTS.map((p) => p[0]),
  "other_unearned_income_taxable", "other_unearned_income_nontaxable", "lump_sum_received",
  "retroactive_social_security_lump_sum_received", "retroactive_ssi_or_public_assistance_lump_sum_received",
  "lottery_gambling_winnings_received", "lottery_gambling_largest_single_game_winnings_received",
  "energy_assistance_from_nonprofit_or_supplier_received", "child_support_arrears_received",
  "pass_set_aside_income", "overpayment_recoupment_withheld", "overpayment_recoupment_for_intentional_violation_withheld",
  "child_support_received_transferred_to_child_support_agency", "military_retirement_paid_to_former_spouse",
  "income_received_for_person_living_elsewhere", "infrequent_or_irregular_income_received",
  "periodic_unearned_income_received", "americorps_service_hours",
]);

const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

interface Carve {
  receipts: Receipt[];
  resTax: number | undefined;
  resNon: number | undefined;
  /** Model B's nontaxable residual: Model A's, plus the money of the kinds B
   *  keeps only as an overlay of the residual (workers' compensation claim
   *  expenses, VA care, irregular income), which have no leaf of their own. */
  resNonB: number | undefined;
  oneTimeUnnamed: number;
  notes: string[];
}

/** Carves one month's statement (fact -> value) into receipts and residuals. */
export function carve(
  v: Record<string, unknown>, person: { per_payment?: number; frequency?: string }, overlapCap?: number,
): Carve {
  const notes: string[] = [];
  const R: Receipt[] = [];
  const get = (k: string) => num(v[k]) ?? 0;
  for (const [f, kind] of AGG) {
    if (v[f] === undefined) R.push({ kind }); // required, not stated: amount unknown
    else if (num(v[f])! !== 0) R.push({ kind, amount: num(v[f])! });
  }
  // child support arrears and the IV-D part come out of child support
  const arrears = get("child_support_arrears_received");
  if (arrears > 0) {
    const cs = R.find((r) => r.kind === "child_support" && typeof r.amount === "number");
    if (cs) cs.amount = (cs.amount as number) - arrears; else notes.push("arrears without child support");
    R.push({ kind: "child_support_arrears", amount: arrears });
  }
  let resTax = num(v.other_unearned_income_taxable);
  let resNon = num(v.other_unearned_income_nontaxable);
  const resKnown = resTax !== undefined && resNon !== undefined;
  let carveT = 0, carveN = 0;
  const take = (amt: number, taxable: boolean) => { if (taxable) carveT += amt; else carveN += amt; };
  const ota: Receipt[] = [];
  for (const [f, kind, taxable, oneTimeAble] of PARTS) {
    let amt = get(f);
    if (amt <= 0) continue;
    if (f === "energy_assistance_received") {
      const np = Math.min(amt, get("energy_assistance_from_nonprofit_or_supplier_received"));
      if (np > 0) { R.push({ kind: "energy_assistance_nonprofit_or_supplier", amount: np }); amt -= np; take(np, false); }
      if (amt <= 0) continue;
    }
    const r: Receipt = { kind, amount: amt };
    if (kind === "workers_compensation") r.claim_expense = amt;
    if (kind === "va_aid_and_attendance") r.used_for_uncovered_medical_care = amt;
    if (kind === "americorps" && v.americorps_service_hours !== undefined) r.hours_served = v.americorps_service_hours;
    R.push(r);
    take(amt, taxable);
    if (oneTimeAble) ota.push(r);
  }
  // lump sums: retroactive parts, the named receipts the lump sum reaches, the rest
  const lump = get("lump_sum_received");
  const rss = get("retroactive_social_security_lump_sum_received");
  const rssi = get("retroactive_ssi_or_public_assistance_lump_sum_received");
  let oneTimeUnnamed = 0;
  if (lump > 0 || rss > 0 || rssi > 0) {
    if (rss > 0) { R.push({ kind: "social_security", amount: rss, frequency: "once", retroactive: true }); take(rss, false); }
    if (rssi > 0) { R.push({ kind: "ssi", amount: rssi, frequency: "once", retroactive: true }); take(rssi, false); }
    let reach = Math.max(0, lump - rss - rssi);
    // the overlap today's ledger forces (CO-4962): named receipts lie in the lump sum as far as it reaches,
    // unless the case states how much of the lump sum they are (CO-4960)
    let cap = overlapCap ?? Infinity;
    for (const r of ota) {
      if (reach <= 0 || cap <= 0) break;
      const a = r.amount as number;
      const inLump = Math.min(a, reach, cap);
      reach -= inLump;
      cap -= inLump;
      if (inLump === a) r.frequency = "once";
      else { r.amount = a - inLump; R.push({ ...r, amount: inLump, frequency: "once" }); }
    }
    oneTimeUnnamed = reach;
    if (reach > 0) { R.push({ kind: "other_one_time", amount: reach, frequency: "once" }); take(reach, false); }
  }
  // irregular income: a receipt of its own, out of the residual
  const irr = get("infrequent_or_irregular_income_received");
  if (irr > 0) { R.push({ kind: "other_nontaxable", amount: irr, irregular: true }); take(irr, false); }
  // the residual: what is left of the two other-unearned facts
  if (resKnown) {
    let t = (resTax as number) - carveT, n = (resNon as number) - carveN;
    if (t < 0) { n += t; t = 0; }
    if (n < 0) { t += n; n = 0; }
    if (t < 0) { notes.push(`parts exceed other_unearned_income by ${-t}`); t = 0; }
    resTax = t; resNon = n;
    if (t > 0) R.push({ kind: "other_taxable", amount: t });
    if (n > 0) R.push({ kind: "other_nontaxable", amount: n });
  } else {
    if (resTax === undefined) R.push({ kind: "other_taxable" });
    if (resNon === undefined) R.push({ kind: "other_nontaxable" });
    if (carveT + carveN > 0) notes.push("parts stated with the residual unknown");
  }
  // a periodic income: split out of the receipt that holds it
  const pr = get("periodic_unearned_income_received");
  if (person.per_payment !== undefined && person.per_payment > 0) {
    if (pr > 0) {
      const host = ["unemployment_compensation", "pension", "child_support", "social_security", "other_nontaxable", "other_taxable"]
        .map((k) => R.find((r) => r.kind === k && typeof r.amount === "number" && (r.amount as number) >= pr && r.frequency === undefined))
        .find(Boolean);
      if (host) {
        host.amount = (host.amount as number) - pr;
        R.push({ kind: host.kind, amount: pr, frequency: person.frequency, per_payment: person.per_payment });
      } else notes.push("periodic receipt with no host");
    } else {
      R.push({ kind: "other_nontaxable", amount: 0, frequency: person.frequency, per_payment: person.per_payment });
      notes.push("periodic per-payment stated in a month with no such receipt: kept as a stream of amount 0 (old reading)");
    }
  }
  // lottery: one record per game
  const lot = get("lottery_gambling_winnings_received");
  const big = num(v.lottery_gambling_largest_single_game_winnings_received);
  if (lot > 0) {
    if (big !== undefined && big > 0 && big < lot) {
      R.push({ kind: "lottery_gambling", amount: big, frequency: "once" });
      R.push({ kind: "lottery_gambling", amount: lot - big, frequency: "once" });
    } else R.push({ kind: "lottery_gambling", amount: lot, frequency: "once" });
  }
  // earmarks onto the receipt they come out of
  const recurring = (r: Receipt) => typeof r.amount === "number" && r.frequency !== "once";
  const host = (kinds: string[] | null, amt: number): Receipt => {
    const pool = R.filter((r) => recurring(r) && (!kinds || kinds.includes(r.kind)));
    const h = pool.find((r) => (r.amount as number) >= amt) ?? pool[0];
    if (h) return h;
    const z: Receipt = { kind: "other_nontaxable", amount: 0 };
    R.push(z);
    notes.push("earmark with no host receipt");
    return z;
  };
  const mark = (f: string, field: string, kinds: string[] | null) => {
    const amt = get(f);
    if (amt <= 0) return;
    const h = host(kinds, amt);
    h[field] = ((h[field] as number) ?? 0) + amt;
  };
  // PASS: most often Social Security disability income (coverage review 3 F3-1)
  const ss = R.find((r) => r.kind === "social_security" && recurring(r) && (r.amount as number) >= get("pass_set_aside_income"));
  if (ss && get("pass_set_aside_income") > 0) ss.pass_set_aside = get("pass_set_aside_income");
  else mark("pass_set_aside_income", "pass_set_aside", null);
  mark("overpayment_recoupment_withheld", "recouped", null);
  mark("overpayment_recoupment_for_intentional_violation_withheld", "recouped_for_intentional_violation", null);
  mark("child_support_received_transferred_to_child_support_agency", "transferred_to_child_support_agency", ["child_support"]);
  mark("military_retirement_paid_to_former_spouse", "paid_to_former_spouse", ["pension"]);
  mark("income_received_for_person_living_elsewhere", "for_person_living_elsewhere", null);
  const out = R.filter((r) => r.amount === undefined || (r.amount as number) !== 0 || Object.keys(r).length > 2);
  const bOnly = R.filter((r) => r.kind === "workers_compensation" || r.kind === "va_aid_and_attendance" || r.irregular === true)
    .reduce((t, r) => t + ((r.amount as number) ?? 0), 0);
  const resNonB = resNon === undefined ? undefined : resNon + bOnly;
  return { receipts: out, resTax, resNon, resNonB, oneTimeUnnamed, notes };
}

export interface Translated { a: HouseholdCase; b: HouseholdCase; notes: string[] }

function monthsOf(c: HouseholdCase): string[] {
  const ms = new Set<string>([c.as_of.slice(0, 7)]);
  for (const ex of Object.values(c.expect ?? {})) {
    for (const v of Object.values(ex)) {
      if (v && typeof v === "object" && !Array.isArray(v)) for (const k of Object.keys(v)) if (/^\d{4}-\d{2}$/.test(k)) ms.add(k);
    }
  }
  for (const p of Object.values(c.persons)) for (const k of Object.keys(p.months ?? {})) ms.add(k);
  return [...ms].sort();
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** Translates one household. `oldIx` evaluates today's CO-4962 placement for
 *  the thirty-day lump sum (the one heuristic the translation inherits). */
export function translate(c: HouseholdCase, oldIx: LedgerIndex): Translated {
  const notes: string[] = [];
  const a = clone(c), b = clone(c);
  const ms = monthsOf(c);
  const span = [addMonths(ms[0], -14), addMonths(ms[ms.length - 1], 3)];
  const window: string[] = [];
  for (let m = span[0]; m <= span[1]; m = addMonths(m, 1)) window.push(m);
  const app = (c.case_facts?.leap_application_date as string | undefined) ?? undefined;
  const oldData = makeCase(oldIx, caseToSpec(c));
  for (const [pid, p] of Object.entries(c.persons)) {
    const isPM = (k: string) => oldIx.byIdentifier.get(k)?.scope === "person-month";
    const defaults: Record<string, unknown> = { ...(p.month_defaults ?? {}) };
    for (const [k, v] of Object.entries(p.facts ?? {})) if (isPM(k)) defaults[k] = v;
    const touches = (o: Record<string, unknown>) => Object.keys(o).some((k) => SLICE_MONTH_FACTS.has(k));
    if (!touches(defaults) && !Object.values(p.months ?? {}).some(touches)) {
      const pf = p.facts ?? {};
      if (!Object.keys(pf).some((k) => k.endsWith("prior_thirty_days") || k.startsWith("periodic_"))) continue;
    }
    const person = {
      per_payment: num(p.facts?.periodic_unearned_income_per_payment),
      frequency: p.facts?.periodic_unearned_income_frequency as string | undefined,
    };
    const expand = Object.values(p.months ?? {}).some(touches);
    const buckets: Array<[string | null, Record<string, unknown>]> = expand
      ? window.map((m) => [m, { ...defaults, ...(p.months?.[m] ?? {}) }])
      : [[null, defaults]];
    const receipts: Receipt[] = [];
    const pa = a.persons[pid], pb = b.persons[pid];
    for (const [m, vals] of buckets) {
      const inWindowBucket = !m || (app !== undefined && (m === app.slice(0, 7) || m === addMonths(app.slice(0, 7), -1)));
      const cv = carve(vals, person, inWindowBucket ? num(p.facts?.named_source_receipts_in_lump_sum_prior_thirty_days) : undefined);
      for (const n of cv.notes) notes.push(`${c.id} ${pid}${m ? " " + m : ""}: ${n}`);
      for (const r of cv.receipts) receipts.push(m ? { ...r, month: m } : r);
      // Model B: the residual leaves and the unnamed one-time leaf
      const put: Record<string, unknown> = {};
      if (cv.resTax !== undefined) put.unearned_income_not_otherwise_named_taxable = cv.resTax;
      if (cv.resNonB !== undefined) put.unearned_income_not_otherwise_named_nontaxable = cv.resNonB;
      put.one_time_payment_not_otherwise_named = cv.oneTimeUnnamed;
      if (m) { pb.months = pb.months ?? {}; pb.months[m] = { ...(pb.months[m] ?? {}), ...put }; }
      else pb.month_defaults = { ...(pb.month_defaults ?? {}), ...put };
    }
    // the thirty-day window facts
    const pf = p.facts ?? {};
    const lot30 = num(pf.lottery_gambling_winnings_received_prior_thirty_days);
    const lump30 = num(pf.lump_sum_received_prior_thirty_days);
    if ((lot30 !== undefined || lump30 !== undefined) && !app) notes.push(`${c.id} ${pid}: thirty-day facts with no LEAP application date`);
    if (pf.unearned_income_received_prior_thirty_days !== undefined) {
      notes.push(`${c.id} ${pid}: unearned_income_received_prior_thirty_days ${pf.unearned_income_received_prior_thirty_days} dropped (both models read the application month's recurring receipts, 3.752.22.A's one month)`);
    }
    if (app && (lot30 !== undefined || lump30 !== undefined)) {
      const am = app.slice(0, 7), bm = addMonths(am, -1);
      const start = addDays(app, -((Date.UTC(+am.slice(0, 4), +am.slice(5, 7) - 1, 1) - Date.UTC(+bm.slice(0, 4), +bm.slice(5, 7) - 1, 1)) / 86400000));
      const inside = addDays(app, -1);
      const outsideFor = (m: string | undefined) => (m === bm ? addDays(start, -1) : addDays(app, 1));
      const inWin = (r: Receipt) => r.frequency === "once" && (r.month === undefined || r.month === am || r.month === bm);
      const stamp = (cls: (r: Receipt) => boolean, target: number, mk: () => Receipt) => {
        let left = target;
        for (const r of receipts.filter((r) => inWin(r) && cls(r) && typeof r.amount === "number")) {
          const amt = r.amount as number;
          if (left <= 0) { r.date = outsideFor(r.month as string | undefined); continue; }
          if (amt <= left) { r.date = inside; left -= amt; continue; }
          receipts.push({ ...r, amount: amt - left, date: outsideFor(r.month as string | undefined) });
          r.amount = left; r.date = inside; left = 0;
        }
        if (left > 1e-9) {
          receipts.push({ ...mk(), amount: left, month: inside.slice(0, 7), date: inside });
          notes.push(`${c.id} ${pid}: a thirty-day fact states ${left} the month facts do not: added as a receipt dated ${inside}`);
        }
      };
      if (lot30 !== undefined) stamp((r) => r.kind === "lottery_gambling", lot30, () => ({ kind: "lottery_gambling", frequency: "once" }));
      if (lump30 !== undefined) {
        // the lump sums of the window: the one-time receipts (other than lottery) of the application month
        // and the month before, in this order, are the money the thirty-day figure states; the rest of those
        // months' one-time receipts fall outside the period
        const order = (r: Receipt) => (r.retroactive ? 0 : r.kind === "other_one_time" ? 2 : 1);
        const cands = receipts.filter((r) => inWin(r) && r.kind !== "lottery_gambling" && typeof r.amount === "number")
          .sort((x, y) => order(x) - order(y));
        let left = lump30;
        for (const r of cands) {
          const amt = r.amount as number;
          if (left <= 1e-9) { r.date = outsideFor(r.month as string | undefined); continue; }
          if (amt <= left) { r.date = inside; left -= amt; continue; }
          receipts.push({ ...r, amount: amt - left, date: outsideFor(r.month as string | undefined) });
          r.amount = left; r.date = inside; left = 0;
        }
        if (left > 1e-9) {
          receipts.push({ kind: "other_one_time", frequency: "once", amount: left, month: inside.slice(0, 7), date: inside });
          notes.push(`${c.id} ${pid}: lump_sum_received_prior_thirty_days states ${left} the month facts do not: added as a one-time receipt dated ${inside}`);
        }
        const rss30 = num(pf.retroactive_social_security_lump_sum_received_prior_thirty_days) ?? 0;
        const rssi30 = num(pf.retroactive_ssi_or_public_assistance_lump_sum_received_prior_thirty_days) ?? 0;
        if (rss30 + rssi30 > 0) notes.push(`${c.id} ${pid}: retroactive thirty-day parts ${rss30 + rssi30} taken from the month facts' retroactive receipts`);
        const liq = num(pf.resource_liquidation_proceeds_received_prior_thirty_days) ?? 0;
        const ins = num(pf.insurance_proceeds_spent_on_covered_costs_prior_thirty_days) ?? 0;
        if (liq > 0 || ins > 0) {
          const host = receipts.find((r) => r.kind === "other_one_time" && r.date === inside);
          if (host && liq > 0) { host.amount = (host.amount as number) - liq; receipts.push({ ...host, kind: "resource_liquidation", amount: liq }); }
          if (host && ins > 0) host.spent_on_covered_costs = ins;
          if (!host) notes.push(`${c.id} ${pid}: liquidation or insurance part with no one-time receipt`);
        }
        const unnamed = receipts.filter((r) => r.date === inside && (r.kind === "other_one_time" || r.kind === "resource_liquidation"))
          .reduce((t, r) => t + (r.amount as number), 0);
        // Model B: the unnamed one-time payments of the window
        pb.facts = { ...(pb.facts ?? {}), one_time_payment_not_otherwise_named_prior_thirty_days: unnamed };
      }
    }
    pa.facts = { ...(pa.facts ?? {}), receipts };
  }
  return { a, b, notes };
}

export type { PersonSpec };
