// Earned-income records: the one translation of a household or rule test
// stated in the scalar earned-income facts into the `earnings` list
// (CO-5100). Written once by the integration owner, reviewed as code
// (docs/design-earned-and-resource-records.md 4.2, step E0; the receipts
// translation, scripts/receipts/translate.ts, is the model).
//
// Transition (steps E0 and E1). No rule reads `earnings` in E0: every
// program still reads the scalar earned facts. A stored household or rule
// test that states earned income states it in those facts and, beside
// them, as earnings records, both written by this translation from one
// statement (npm run records:translate, scripts/records/apply-earnings.ts),
// so the two cannot disagree; npm run records:harness -- --list earnings
// fails when a household's earnings are not the translation of its facts.
// Each E1 track moves its readers to the records; E2 retires the scalar
// facts (their stated values then move to a retired-facts file, as the
// receipts phase 3 did) and this translation becomes the harness's
// baseline reader only.
//
// The carving rule. Within a month, every fact the ledger defines as "part
// of" wages_gross is carved out of it into a record of its own kind or with
// its own field, in a fixed order, each capped at what is left of the
// wages (the overlap the old facts allow, a WIOA job that is also
// subsidized, is noted and not stated twice); what is left is the wages
// record, which carries the person's pay schedule (frequency, per_payment)
// and the earmarks (pass_set_aside, education_deduction). The facts stated
// beside the wages (in-kind pay, an employer's vendor payments, boarders)
// are records of their own. The business is one receipts record (a farm's
// when the person farms) with the business's fields, and each cost a cost
// record. The receipt kinds that are earnings (uniformed_services_special_pay,
// board_only_payment, room_only_payment; design 2.3, OQ-1020) are copied
// from the person's receipts into earnings records: during the transition
// they stay in receipts too, where every program still reads them.
//
// Not restated: wages_gross_received_prior_thirty_days (CO-3910) and
// employment_began_or_ended_prior_thirty_days (CO-3923). A thirty-day total
// spans two months and is not one pay, and the flag does not say which
// date; the LEAP and CCCAP tracks state those households' pays with their
// dates (each translation note names the household).
import type { HouseholdCase, PersonSpec } from "../../src/engine/cases";
import { addDays, addMonths } from "../../src/engine/evaluate";
import type { LedgerIndex } from "../../src/engine/ledger-index";
import type { TestSpec } from "../../src/engine/types";

export type Earning = Record<string, unknown> & { kind: string; amount?: number };

/** The parts of wages_gross, in carving order: [fact, the record it becomes]. */
export const WAGE_PARTS: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
  ["combat_zone_pay_received", { kind: "uniformed_services_special_pay", combat_zone: true }],
  ["work_study_earnings", { kind: "work_study" }],
  // the same SCSEP pay, stated once for LEAP (scsep_wages) and once for
  // SNAP (scsep_payments_received): the larger is the pay
  ["scsep", { kind: "scsep_employment" }],
  ["wioa_on_the_job_training_wages", { kind: "wioa_on_the_job_training" }],
  ["summer_youth_employment_wages", { kind: "summer_youth_employment" }],
  ["subsidized_employment_wages", { kind: "subsidized_employment" }],
  ["decennial_census_wages_received", { kind: "decennial_census_employment" }],
  ["difficulty_of_care_payments_received", { kind: "difficulty_of_care_payment" }],
  ["employer_health_insurance_subsidy_received", { kind: "employer_health_insurance_subsidy" }],
  ["short_term_employment_wages", { kind: "wages", temporary_job: true }],
  ["annual_contract_wages_received", { kind: "wages" }],
  ["wages_from_owned_llc_or_s_corporation", { kind: "wages", paid_as_business_owner: true }],
  ["cw_new_source_earned_income", { kind: "wages" }],
  ["snap_earned_income_received_after_application_date", { kind: "wages" }],
  ["infrequent_or_irregular_earned_income_received", { kind: "wages", irregular: true }],
];
/** Self-employment costs: [fact, kind]. */
export const COSTS: ReadonlyArray<readonly [string, string]> = [
  ["self_employment_operating_costs", "business_cost_operating"],
  ["self_employment_interest_costs", "business_cost_interest"],
  ["self_employment_capital_principal_payments", "business_cost_capital_principal"],
  ["self_employment_home_business_space_costs", "business_cost_home_space"],
  ["self_employment_business_vehicle_costs", "business_cost_vehicle"],
];
/** Every person-month fact the translation reads. */
export const MONTH_FACTS: ReadonlySet<string> = new Set<string>([
  "wages_gross", "self_employment_gross_receipts", "self_employment_net_earnings_for_tax",
  ...WAGE_PARTS.map((p) => p[0]).filter((f) => f !== "scsep"), "scsep_wages", "scsep_payments_received",
  ...COSTS.map((c) => c[0]),
  "short_term_employment_ended_through_own_fault", "pass_set_aside_earned_income", "military_pay_education_deductions",
  "in_kind_compensation_value", "employer_vendor_payments_received",
  "room_and_board_payments_received", "room_and_board_payers_count", "room_and_board_provision_costs",
  "room_and_board_payments_are_foster_care", "board_only_payers_count", "board_only_provision_costs", "room_only_provision_costs",
  "self_employment_hours_worked",
]);
/** Person-scope facts the translation reads (the pay schedule, the business). */
export const PERSON_FACTS: ReadonlySet<string> = new Set<string>([
  "wages_pay_frequency", "wages_gross_per_pay_period", "annual_contract_pay",
  "self_employment_is_farming", "self_employment_is_farm_operation", "farming_self_employment_end_date",
  "self_employment_start_date", "self_employment_is_annual_support", "self_employment_has_changed_substantially",
]);
/** Earned facts stated but not restated (see the header). */
export const NOT_RESTATED: ReadonlySet<string> = new Set<string>([
  "wages_gross_received_prior_thirty_days", "employment_began_or_ended_prior_thirty_days",
]);
/** The receipt kinds that are earnings (design 2.3, OQ-1020), copied into
 *  earnings during the transition: receipt kind -> the record's own fields. */
export const MOVING_KINDS: Readonly<Record<string, Record<string, unknown>>> = {
  uniformed_services_special_pay: { kind: "uniformed_services_special_pay" },
  board_only_payment: { kind: "boarder_payments", provides: "board_only" },
  room_only_payment: { kind: "boarder_payments", provides: "room_only" },
};
/** Every fact whose statement makes a person's earnings stated. */
export const EARNED_FACTS: ReadonlySet<string> = new Set<string>([...MONTH_FACTS, ...PERSON_FACTS]);

const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

interface Ctx {
  /** the bucket's month (null: every month) and the month a plain value is
   *  read for (the test month, or the as-of month) */
  month: string | null; defaultMonth: string;
  person: Record<string, unknown>;
  snapApplicationDate?: string;
  receipts: Array<Record<string, unknown>>;
}

/** Carves one month's statement (fact -> value) into earnings records. */
function carve(v: Record<string, unknown>, cx: Ctx): { earnings: Earning[]; notes: string[] } {
  const notes: string[] = [];
  const E: Earning[] = [];
  const get = (k: string) => num(v[k]) ?? 0;
  const pf = cx.person;
  const month = cx.month ?? cx.defaultMonth;
  // ---- wages and their parts
  const W = num(v.wages_gross);
  let left = W ?? 0;
  const carved: Earning[] = [];
  for (const [f, rec] of WAGE_PARTS) {
    const amt = f === "scsep" ? Math.max(get("scsep_wages"), get("scsep_payments_received")) : get(f);
    if (amt <= 0) continue;
    if (f === "scsep" && get("scsep_wages") > 0 && get("scsep_payments_received") > 0 && get("scsep_wages") !== get("scsep_payments_received")) {
      notes.push(`scsep_wages ${get("scsep_wages")} and scsep_payments_received ${get("scsep_payments_received")} differ: the larger is the SCSEP pay`);
    }
    let take = amt;
    if (W !== undefined && amt > left + 1e-9) {
      // irregular earnings may be self-employment receipts as well (CO-4010)
      if (f === "infrequent_or_irregular_earned_income_received" && get("self_employment_gross_receipts") >= amt - left) {
        notes.push(`irregular earnings ${amt} beyond the wages left (${left}): the rest is irregular self-employment receipts`);
      } else notes.push(`${f} ${amt} exceeds what is left of wages_gross (${left}): capped`);
      take = Math.max(0, left);
    }
    if (W !== undefined) left -= take;
    const r = { ...rec, amount: take } as Earning;
    if (f === "short_term_employment_wages" && typeof v.short_term_employment_ended_through_own_fault === "boolean") {
      r.ended_through_own_fault = v.short_term_employment_ended_through_own_fault;
    }
    if (f === "annual_contract_wages_received") {
      if (num(pf.annual_contract_pay) !== undefined) r.annual_contract_pay = num(pf.annual_contract_pay);
      else notes.push("annual_contract_wages_received with no annual_contract_pay: the contract's pay is not stated");
    }
    if (f === "cw_new_source_earned_income") r.job_start_date = `${month}-01`;
    if (f === "snap_earned_income_received_after_application_date") {
      if (cx.snapApplicationDate && cx.snapApplicationDate.slice(0, 7) === month) {
        r.date = addDays(cx.snapApplicationDate, 1);
        // the fact is a total received after the date, not one pay of a
        // schedule, so no frequency is written; a rule that converts dated
        // pays by schedule reads it as monthly (request R-6; OQ-1181)
        notes.push("earned income after the SNAP application date: dated, with no frequency (read as monthly where a rule converts dated pays; OQ-1181)");
      } else notes.push("earned income after the SNAP application date with no application date in the month: left undated");
      r.month = month;
    }
    if (take > 0 || W === undefined) carved.push(r);
    if (f === "infrequent_or_irregular_earned_income_received" && amt > take) {
      E.push({ kind: "self_employment_receipts", amount: amt - take, irregular: true });
    }
  }
  const wage: Earning = { kind: "wages" };
  if (W !== undefined) wage.amount = Math.max(0, left);
  if (typeof pf.wages_pay_frequency === "string") wage.frequency = pf.wages_pay_frequency;
  if (num(pf.wages_gross_per_pay_period) !== undefined) wage.per_payment = num(pf.wages_gross_per_pay_period);
  const pass = get("pass_set_aside_earned_income");
  const edu = get("military_pay_education_deductions");
  if (edu > 0) wage.education_deduction = edu;
  // always stated: wages not stated are unknown, as wages_gross was (a
  // record of amount 0 with nothing else to say is dropped below)
  E.push(wage);
  E.push(...carved);
  // ---- beside the wages
  if (get("in_kind_compensation_value") > 0) E.push({ kind: "in_kind_pay", amount: get("in_kind_compensation_value") });
  if (get("employer_vendor_payments_received") > 0) E.push({ kind: "employer_vendor_payment", amount: get("employer_vendor_payments_received") });
  const rb = get("room_and_board_payments_received");
  if (rb > 0) {
    const r: Earning = { kind: "boarder_payments", amount: rb, provides: "room_and_board" };
    if (num(v.room_and_board_payers_count) !== undefined) r.boarders = num(v.room_and_board_payers_count);
    if (v.room_and_board_payments_are_foster_care === true) r.foster_care = true;
    E.push(r);
  }
  if (get("room_and_board_provision_costs") > 0) {
    E.push({ kind: "business_cost_boarder_provision", amount: get("room_and_board_provision_costs"), provides: "room_and_board" });
  }
  // ---- self-employment: one business, its costs
  const farm = pf.self_employment_is_farming === true || pf.self_employment_is_farm_operation === true;
  const G = num(v.self_employment_gross_receipts);
  const net = num(v.self_employment_net_earnings_for_tax);
  const costs = COSTS.filter(([f]) => get(f) > 0);
  const biz: Earning = { kind: farm ? "farm_self_employment_receipts" : "self_employment_receipts" };
  if (G !== undefined) biz.amount = G;
  // A stated net of 0 is kept unless the receipts are stated 0 too (no
  // business: the record has nothing to say and is dropped below). Dropping
  // every 0 left a business with receipts, or with receipts not stated, and a
  // tax figure of 0 as "net not stated", cannot determine for MAGI (request
  // R-4 of docs/reviews/records-earnings-medicaid.md; records E1 integration).
  if (net !== undefined && (net !== 0 || G !== 0)) biz.net_for_tax = net;
  if (num(v.self_employment_hours_worked) !== undefined) biz.hours = num(v.self_employment_hours_worked);
  if (typeof pf.self_employment_is_annual_support === "boolean") biz.annual_support = pf.self_employment_is_annual_support;
  if (typeof pf.self_employment_has_changed_substantially === "boolean") biz.changed_substantially = pf.self_employment_has_changed_substantially;
  if (typeof pf.self_employment_start_date === "string") biz.job_start_date = pf.self_employment_start_date;
  if (farm && typeof pf.farming_self_employment_end_date === "string") biz.job_end_date = pf.farming_self_employment_end_date;
  // always stated, as the wages are: receipts not stated are unknown
  E.push(biz);
  for (const [f, kind] of costs) {
    const r: Earning = { kind, amount: get(f) };
    if (farm) r.farm = true;
    E.push(r);
  }
  // PASS: on the wages, else on the business (CO-4618: "wages_gross or the self-employment facts")
  if (pass > 0) {
    const host = [wage, biz].find((r) => E.includes(r) && typeof r.amount === "number" && (r.amount as number) >= pass) ??
      E.find((r) => typeof r.amount === "number" && (r.amount as number) >= pass && !String(r.kind).startsWith("business_cost"));
    if (host) host.pass_set_aside = pass;
    else { wage.pass_set_aside = pass; if (!E.includes(wage)) E.unshift(wage); notes.push("PASS set-aside larger than any pay stated: kept on the wages record"); }
  }
  // ---- the receipt kinds that are earnings (the transition copy)
  for (const r of cx.receipts) {
    const k = String(r.kind);
    const m = MOVING_KINDS[k];
    if (!m) continue;
    // a receipt stated for another month is copied in that month's bucket
    const rm = typeof r.month === "string" ? r.month : typeof r.date === "string" ? r.date.slice(0, 7) : null;
    if (cx.month !== null ? rm !== null && rm !== cx.month : rm !== null) continue;
    if (cx.month !== null && rm === null) continue; // a recurring receipt is copied once, in the every-month bucket
    const e = { ...m } as Earning;
    for (const f of ["amount", "month", "date", "frequency", "per_payment", "irregular", "retroactive", "pass_set_aside"]) if (r[f] !== undefined) e[f] = r[f];
    if (k === "board_only_payment" && num(v.board_only_payers_count) !== undefined) e.boarders = num(v.board_only_payers_count);
    E.push(e);
  }
  if (get("board_only_provision_costs") > 0) E.push({ kind: "business_cost_boarder_provision", amount: get("board_only_provision_costs"), provides: "board_only" });
  if (get("room_only_provision_costs") > 0) E.push({ kind: "business_cost_boarder_provision", amount: get("room_only_provision_costs"), provides: "room_only" });
  // a record of amount 0 with nothing else to say is not stated
  const out = E.filter((r) => r.amount === undefined || (r.amount as number) !== 0 || Object.keys(r).filter((k) => k !== "kind" && k !== "amount").length > 0);
  return { earnings: out, notes };
}

/** The months a household's evaluation can read. */
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

/** The month window records are written over when they must be stated by
 *  month: 14 months before the first month to 3 after the last (as receipts). */
function windowOf(months: string[]): string[] {
  const out: string[] = [];
  for (let m = addMonths(months[0], -14); m <= addMonths(months[months.length - 1], 3); m = addMonths(m, 1)) out.push(m);
  return out;
}

const touches = (o: Record<string, unknown> | undefined) => Object.keys(o ?? {}).some((k) => MONTH_FACTS.has(k));
const keyOf = (r: Earning) => JSON.stringify(Object.keys(r).filter((k) => k !== "month").sort().map((k) => [k, r[k]]));

export interface PersonInput {
  facts: Record<string, unknown>;
  monthDefaults: Record<string, unknown>;
  months: Record<string, Record<string, unknown>>;
}

/** One person's earnings, or undefined when the person states none of the
 *  earned facts (the list then stays unstated: unknown, as each fact was). */
export function translatePerson(
  id: string, input: PersonInput, window: string[], defaultMonth: string, snapApplicationDate?: string,
): { earnings: Earning[] | undefined; notes: string[] } {
  const notes: string[] = [];
  const pf = input.facts;
  for (const f of NOT_RESTATED) {
    if (pf[f] !== undefined || input.monthDefaults[f] !== undefined || Object.values(input.months).some((m) => m[f] !== undefined)) {
      notes.push(`${id}: ${f} not restated (a thirty-day figure is not one pay; the LEAP and CCCAP tracks state the dated pays)`);
    }
  }
  if (!touches(input.monthDefaults) && !Object.values(input.months).some(touches) &&
    !Object.keys(pf).some((k) => PERSON_FACTS.has(k))) return { earnings: undefined, notes };
  const receipts = Array.isArray(pf.receipts) ? (pf.receipts as Array<Record<string, unknown>>) : [];
  const datedMoving = receipts.some((r) => MOVING_KINDS[String(r.kind)] && (r.month !== undefined || r.date !== undefined));
  const expand = Object.values(input.months).some(touches) || datedMoving;
  const buckets: Array<[string | null, Record<string, unknown>]> = expand
    ? window.map((m) => [m, { ...input.monthDefaults, ...(input.months[m] ?? {}) }])
    : [[null, input.monthDefaults]];
  const perBucket: Array<[string | null, Earning[]]> = [];
  for (const [m, vals] of buckets) {
    const cv = carve(vals, { month: m, defaultMonth, person: pf, snapApplicationDate, receipts });
    for (const n of cv.notes) notes.push(`${id}${m ? " " + m : ""}: ${n}`);
    perBucket.push([m, cv.earnings]);
  }
  if (!expand) return { earnings: perBucket[0][1], notes };
  // the recurring receipts of a moving kind are copied once, beside the months
  const recurringMoving = carve({}, { month: null, defaultMonth, person: {}, receipts: receipts.filter((r) => r.month === undefined && r.date === undefined) }).earnings
    .filter((r) => r.kind === "uniformed_services_special_pay" || r.kind === "boarder_payments");
  // A record the same in every month of the window is stated once, with no
  // month (it recurs in every month); the rest carry their month.
  const counts = perBucket.map(([, rs]) => {
    const c = new Map<string, number>();
    for (const r of rs) if (r.month === undefined && r.date === undefined) c.set(keyOf(r), (c.get(keyOf(r)) ?? 0) + 1);
    return c;
  });
  const common = new Map<string, number>();
  for (const [k, n] of counts[0]) {
    const every = Math.min(n, ...counts.map((c) => c.get(k) ?? 0));
    if (every > 0) common.set(k, every);
  }
  let out: Earning[] = [...recurringMoving];
  for (const [m, rs] of perBucket) {
    const left = new Map(common);
    for (const r of rs) {
      const k = keyOf(r);
      if (r.month === undefined && r.date === undefined && (left.get(k) ?? 0) > 0) {
        left.set(k, left.get(k)! - 1);
        if (m === perBucket[0][0]) out.push(r);
        continue;
      }
      if (r.month !== undefined || r.date !== undefined) { if (!out.some((x) => JSON.stringify(x) === JSON.stringify(r))) out.push(r); }
      else out.push({ ...r, month: m! });
    }
  }
  out = [...out.filter((r) => r.month === undefined && r.date === undefined), ...out.filter((r) => r.month !== undefined || r.date !== undefined)];
  return { earnings: out, notes };
}

export interface Translated<T> { value: T; notes: string[]; changed: boolean }

/** A household with each person's earnings (re)written from its earned
 *  facts. Person-month facts stated under `facts` are read as every month,
 *  as the engine reads them. */
export function translateCase(c0: HouseholdCase, ix: LedgerIndex): Translated<HouseholdCase> {
  const out = clone(c0);
  const notes: string[] = [];
  const c = c0;
  const app = c.case_facts?.leap_application_date as string | undefined;
  const window = windowOf(caseMonths(c.as_of, c.expect, c.persons, app ? [app.slice(0, 7), addMonths(app.slice(0, 7), -1)] : []));
  const snapApp = c.case_facts?.snap_application_date as string | undefined;
  let changed = false;
  for (const [pid, p] of Object.entries(c.persons)) {
    const facts: Record<string, unknown> = {};
    const md: Record<string, unknown> = { ...(p.month_defaults ?? {}) };
    for (const [k, v] of Object.entries(p.facts ?? {})) {
      if (ix.byIdentifier.get(k)?.scope === "person-month") md[k] = v; else facts[k] = v;
    }
    const t = translatePerson(`${c.id} ${pid}`, { facts, monthDefaults: md, months: p.months ?? {} }, window, c.as_of.slice(0, 7), snapApp);
    notes.push(...t.notes);
    const before = JSON.stringify(p.facts?.earnings);
    const target = out.persons[pid];
    // A person who states none of the earned facts keeps the earnings as
    // stated: a household written in records alone has nothing to translate.
    if (t.earnings !== undefined) target.facts = { ...(target.facts ?? {}), earnings: t.earnings };
    if (JSON.stringify(target.facts?.earnings) !== before) changed = true;
  }
  return { value: out, notes, changed };
}

/** A rule test with each person's earnings (re)written from its earned
 *  facts. A person-month value stated plainly is the test month's
 *  (makeCase); it is restated as a recurring record with no month, which the
 *  test month reads the same. A value keyed by month is stated for its months. */
export function translateTest(t: TestSpec, ix: LedgerIndex, asOf: string): Translated<TestSpec> {
  const out = clone(t);
  const notes: string[] = [];
  const testMonth = t.month ?? null;
  const app = (t.case_facts?.leap_application_date ?? t.given?.leap_application_date) as string | undefined;
  const snapApp = (t.case_facts?.snap_application_date ?? t.given?.snap_application_date) as string | undefined;
  type Slot = { facts: Record<string, unknown>; md: Record<string, unknown>; months: Record<string, Record<string, unknown>> };
  const persons = new Map<string, Slot>();
  const route = (pid: string, src: Record<string, unknown> | undefined, md0?: Record<string, unknown>, months0?: Record<string, Record<string, unknown>>) => {
    const s: Slot = { facts: {}, md: { ...(md0 ?? {}) }, months: clone(months0 ?? {}) };
    for (const [k, v] of Object.entries(src ?? {})) {
      if (ix.byIdentifier.get(k)?.scope === "person-month") {
        if (v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length && Object.keys(v).every((x) => /^\d{4}-\d{2}$/.test(x))) {
          for (const [m, mv] of Object.entries(v as Record<string, unknown>)) (s.months[m] ??= {})[k] = mv;
        } else s.md[k] = v;
      } else s.facts[k] = v;
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
    const tr = translatePerson(`${t.id} ${pid}`, { facts: s.facts, monthDefaults: s.md, months: s.months }, window, testMonth ?? asOf.slice(0, 7), snapApp);
    notes.push(...tr.notes);
    if (tr.earnings === undefined) continue;
    const holder: Record<string, unknown> =
      t.persons && pid in t.persons ? (out.persons![pid].facts ??= {})
        : pid === "p1" ? (out.given ??= {})
          : (out.others![pid] ??= {});
    const before = JSON.stringify(holder.earnings);
    holder.earnings = tr.earnings;
    if (JSON.stringify(holder.earnings) !== before) changed = true;
  }
  return { value: out, notes, changed };
}
