/* The data dictionary of the external sample check (docs/external-check.md):
 * every column of the intake template, and every fact, record field and
 * result a filled template may state, generated from the volume so it stays
 * current. A fact is in the template when a stored household states it, a
 * rule reads it, and it is not one of the scalar income or resource facts the
 * records replace (income is stated as receipts and earnings, resources as
 * holdings: CO-5000, CO-5100, CO-5300). */
import type { HouseholdCase } from "../engine/cases";
import { buildGraph } from "../engine/graph";
import type { LedgerIndex } from "../engine/ledger-index";
import type { Item, RecordFieldSpec, RelationshipRoleDecl, Scope, VolumeMeta } from "../engine/types";

/** The sheets of the template, in the order staff fill them. */
export const SHEETS = [
  "households", "persons", "relationships", "earnings", "other-income", "resources",
  "expenses", "other-facts", "expected",
] as const;
export type SheetName = (typeof SHEETS)[number];

/** The record lists and the sheet each is stated on. */
export const RECORD_SHEETS: Readonly<Record<"earnings" | "other-income" | "resources", { list: string; noun: string }>> = {
  earnings: { list: "earnings", noun: "earnings" },
  "other-income": { list: "receipts", noun: "income" },
  resources: { list: "holdings", noun: "resource" },
};

/** The scalar income and resource facts the records replace, which the
 *  template never asks for (income and resources are stated as records). A
 *  snapshot of the facts the earned-income and holdings translations read
 *  (scripts/records/translate-earnings.ts and translate-holdings.ts, taken
 *  2026-11-24): they are being retired (handoff 2026-11-24, section 6,
 *  E2/H2). The facts the holdings translation states but does not restate
 *  (an income trust, the CSRA figures) are not in it: no record replaces them. */
export const RETIRING_SCALAR_FACTS: ReadonlySet<string> = new Set([
  "able_account_value", "af_property_exempt_as_unsaleable_value", "af_transfer_found_not_twfc", "annual_contract_pay",
  "annual_contract_wages_received", "board_only_payers_count", "board_only_provision_costs", "burial_funds_accrued_interest",
  "burial_spaces_value_beyond_family_needs", "business_cash_and_convertible_assets_value", "combat_zone_pay_received",
  "cw_new_source_earned_income", "decennial_census_wages_received", "difficulty_of_care_payments_received",
  "education_savings_accounts_value", "employer_health_insurance_subsidy_received", "employer_vendor_payments_received",
  "employment_began_or_ended_prior_thirty_days", "excluded_government_payments_held_value", "farming_self_employment_end_date",
  "federal_tax_refunds_held_value", "former_farm_property_value", "has_trust_interest", "home_equity",
  "home_has_recorded_beneficiary_deed", "home_is_held_in_trust_or_entity", "home_is_outside_colorado",
  "home_use_production_property_equity_value", "in_kind_compensation_value", "income_producing_property_equity_value",
  "income_producing_property_is_used_in_trade_or_business", "income_producing_property_net_return_annual",
  "infrequent_or_irregular_earned_income_received", "installment_sale_contract_value", "intends_to_return_home",
  "intent_to_return_home_is_documented_in_writing", "investment_personal_property_value", "irrevocable_burial_funds_value",
  "joint_liquid_resources_other_owners_share_value", "joint_real_property_other_owners_share_value", "land_for_permanent_home_value",
  "life_insurance_cash_surrender_value", "life_insurance_face_value", "life_insurance_newest_policy_purchase_date",
  "life_insurance_payments_in_lookback", "liquid_resources_inaccessible_value", "liquid_resources_value", "lives_in_owned_home",
  "ma_claims_co_owner_hardship_for_real_property", "ma_excess_real_property_is_for_sale",
  "ma_trust_annuity_life_estate_value_available", "military_pay_education_deductions",
  "nonbusiness_income_producing_property_equity_value", "nonbusiness_income_producing_property_net_annual_income",
  "owns_and_lives_in_home", "owns_annuity", "pass_set_aside_earned_income", "prorated_income_held_value",
  "real_property_co_owned_with_resident_value", "real_property_costs_of_sale", "real_property_for_sale_value",
  "real_property_other_than_home_equity", "replacement_proceeds_held_value", "replacement_proceeds_property_type",
  "replacement_proceeds_received_date", "resource_transfer_date", "resource_transfer_returned_date",
  "resource_transfer_uncompensated_value", "retirement_accounts_taxes_due", "retirement_accounts_value",
  "retroactive_benefit_payment_received_date", "retroactive_benefit_payment_unspent_value", "retroactive_ssa_benefits_held_value",
  "revocable_burial_trust_value", "revocable_prepaid_burial_contract_value", "room_and_board_payers_count",
  "room_and_board_payments_are_foster_care", "room_and_board_payments_received", "room_and_board_provision_costs",
  "room_only_provision_costs", "scsep_payments_received", "scsep_wages", "self_employment_business_vehicle_costs",
  "self_employment_capital_principal_payments", "self_employment_gross_receipts", "self_employment_has_changed_substantially",
  "self_employment_home_business_space_costs", "self_employment_hours_worked", "self_employment_interest_costs",
  "self_employment_is_annual_support", "self_employment_is_farm_operation", "self_employment_is_farming",
  "self_employment_net_earnings_for_tax", "self_employment_operating_costs", "self_employment_start_date",
  "short_term_employment_ended_through_own_fault", "short_term_employment_wages", "snap_earned_income_received_after_application_date",
  "snap_eitc_held_while_participating_value", "snap_resource_transfer_was_to_qualify", "state_tax_refunds_held_value",
  "subsidized_employment_wages", "summer_youth_employment_wages", "transfer_was_exempt", "transportation_vehicle_equity_value",
  "trust_corpus_payable_to_person_value", "uncompensated_transfer_value_in_lookback", "vehicles_equity_value",
  "wages_from_owned_llc_or_s_corporation", "wages_gross", "wages_gross_per_pay_period", "wages_gross_received_prior_thirty_days",
  "wages_pay_frequency", "wioa_on_the_job_training_wages", "work_study_earnings",
]);

/** The facts asked of every person, one column each on the persons sheet: the
 *  cross-program first questions of docs/reviews/screening-order.md (steps 1
 *  to 5, 7 and 9), each with its step. Income and resources are the record
 *  sheets (step 9 and 10). */
export const CORE_PERSON_FACTS: ReadonlyArray<readonly [string, number]> = [
  ["date_of_birth", 1], ["sex", 1], ["marital_status", 1], ["dwelling_id", 1],
  ["is_pregnant", 2],
  ["state_of_residence", 3], ["county_of_residence", 3], ["residence_setting_type", 3], ["temporary_absence_reason", 3],
  ["receives_ssi", 4], ["receives_tanf_cash", 4], ["adult_financial_program_received", 4], ["receives_snap", 4],
  ["is_enrolled_in_medical_assistance", 4], ["child_welfare_payment_type", 4],
  ["meets_ssa_disability_criteria", 5], ["is_blind", 5], ["medicare_part_a_entitled", 5], ["medicare_part_b_enrolled", 5],
  ["immigration_status", 7], ["qualified_status_date", 7], ["us_entry_date", 7],
  ["is_tax_filer", 9],
];

/** Expenses an applicant reports, stated on the expenses sheet: money facts
 *  named as a cost, an expense, a premium, a fee or an amount paid, other than
 *  the costs of a business or a rental, which are fields of the records. */
const EXPENSE_RE = /(expense|cost|premium|_paid|fee)/;
const NOT_EXPENSE_RE = /^(self_employment|room_|board_|rental_property|real_property|af_disaster|unearned_income_offsetting|ma_income_trust|chp_family_cost_sharing|burial_)/;

/** Plain names of the programs, as staff know them. */
export const PROGRAM_LABELS: Readonly<Record<string, string>> = {
  SNAP: "SNAP",
  Medicaid: "Health First Colorado (Medicaid)",
  "CHP+": "CHP+",
  ColoradoWorks: "Colorado Works",
  AdultFinancial: "Adult Financial",
  CCCAP: "CCCAP",
  LEAP: "LEAP",
  SunBucks: "SUN Bucks",
};

export interface AllowedValue { value: string; meaning?: string }

/** One fact a filled template may state. */
export interface DictFact {
  identifier: string;
  id: string;
  /** The plain name, as a column heading or a value of the `fact` column. */
  label: string;
  meaning: string;
  type: string;
  scope: Scope;
  options?: AllowedValue[];
  /** The programs whose results read it, by plain name. */
  programs: string[];
  /** Asked of every person (a persons-sheet column). */
  always: boolean;
  /** The sheet it is stated on. */
  sheet: SheetName;
  /** How many stored households state it. */
  households: number;
  screeningStep?: number;
}

/** One field of a record sheet. */
export interface DictRecordField {
  sheet: "earnings" | "other-income" | "resources";
  list: string;
  field: string;
  label: string;
  meaning: string;
  type: string;
  options?: AllowedValue[];
  /** Required where a rule reads it, a default, or what leaving it blank means. */
  blank: string;
}

/** One result staff may give an expected answer for. */
export interface DictResult {
  identifier: string;
  id: string;
  label: string;
  program: string;
  programLabel: string;
  meaning: string;
  type: string;
  scope: Scope;
  options?: AllowedValue[];
}

export interface DictRole { value: string; label: string; meaning: string }

export interface Dictionary {
  volume: string;
  facts: DictFact[];
  records: DictRecordField[];
  results: DictResult[];
  roles: DictRole[];
}

/** A value as staff write it: words, not underscores. */
export function plainValue(v: string): string {
  return v.replace(/_/g, " ");
}

function allowed(options: readonly string[] | undefined, meanings?: Record<string, string>): AllowedValue[] | undefined {
  if (!options || !options.length) return undefined;
  return options.map((o) => (meanings?.[o] ? { value: o, meaning: meanings[o] } : { value: o }));
}

const FIELD_LABELS: Readonly<Record<string, string>> = {
  frequency: "how often paid",
  per_payment: "amount of one payment",
  month: "month",
  date: "date",
};

/** The column heading of a record field. */
export function recordFieldLabel(sheet: DictRecordField["sheet"], field: string): string {
  if (field === "kind") return `kind of ${RECORD_SHEETS[sheet].noun}`;
  return FIELD_LABELS[field] ?? plainValue(field);
}

function blankRule(f: RecordFieldSpec): string {
  if (f.when_absent) return `blank: ${f.when_absent}`;
  if (f.default !== undefined) {
    const d = f.default === true ? "yes" : f.default === false ? "no" : typeof f.default === "string" ? plainValue(f.default) : JSON.stringify(f.default);
    return `blank: ${d}${f.required_if_dated ? " (required on a record with a date)" : ""}`;
  }
  if (f.required) return "required where a rule reads it";
  return "optional";
}

/** Every supplied fact a stored household states, with how many state it. */
export function factsStated(cases: readonly HouseholdCase[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of cases) {
    const seen = new Set<string>();
    const add = (o: Record<string, unknown> | null | undefined) => { for (const k of Object.keys(o ?? {})) seen.add(k); };
    add(c.case_facts);
    for (const m of Object.values(c.month_facts ?? {})) add(m);
    for (const p of Object.values(c.persons ?? {})) {
      add(p.facts);
      add(p.month_defaults);
      for (const m of Object.values(p.months ?? {})) add(m);
    }
    for (const k of seen) out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}

/** The program results of a volume: the items marked as an outcome and the
 *  outcomes each program declares in volume.yaml. */
export function outcomeItems(ix: LedgerIndex, meta: VolumeMeta): Item[] {
  const declared = new Set<string>(
    (meta.programs ?? []).flatMap((p) => p.outcomes ?? []),
  );
  return ix.items.filter((it) =>
    it.kind === "derived" && PROGRAM_LABELS[it.program] && (it.role === "outcome" || declared.has(it.identifier)));
}

/** The programs whose results read each item, directly or through rules. */
export function programsReading(ix: LedgerIndex, meta: VolumeMeta): Map<string, Set<string>> {
  const g = buildGraph(ix);
  const out = new Map<string, Set<string>>();
  for (const o of outcomeItems(ix, meta)) {
    const seen = new Set<string>();
    const stack = [o.identifier];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const d of g.uses.get(id) ?? []) stack.push(d);
    }
    for (const id of seen) {
      const s = out.get(id) ?? new Set<string>();
      s.add(o.program);
      out.set(id, s);
    }
  }
  return out;
}

const programOrder = Object.keys(PROGRAM_LABELS);
const byProgramOrder = (a: string, b: string) => programOrder.indexOf(a) - programOrder.indexOf(b);

function firstSentences(s: string | undefined, max = 600): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/** The dictionary of the volume. */
export function buildDictionary(
  ix: LedgerIndex, meta: VolumeMeta, cases: readonly HouseholdCase[],
): Dictionary {
  const stated = factsStated(cases);
  const reading = programsReading(ix, meta);
  const core = new Map(CORE_PERSON_FACTS.map(([f, step]) => [f, step]));
  const facts: DictFact[] = [];
  for (const it of ix.items) {
    if (it.kind !== "supplied" || it.record_fields) continue;
    const n = stated.get(it.identifier) ?? 0;
    if (!n || RETIRING_SCALAR_FACTS.has(it.identifier)) continue;
    const programs = [...(reading.get(it.identifier) ?? [])].sort(byProgramOrder);
    if (!programs.length) continue;
    const step = core.get(it.identifier);
    const always = step !== undefined && (it.scope === "person" || it.scope === "person-month");
    const sheet: SheetName = always ? "persons"
      : it.type === "money" && EXPENSE_RE.test(it.identifier) && !NOT_EXPENSE_RE.test(it.identifier) ? "expenses"
        : "other-facts";
    const f: DictFact = {
      identifier: it.identifier, id: it.id, label: it.name, meaning: firstSentences(it.meaning),
      type: it.type, scope: it.scope, programs: programs.map((p) => PROGRAM_LABELS[p]),
      always, sheet, households: n,
    };
    const opts = allowed(it.options);
    if (opts) f.options = opts;
    if (step !== undefined) f.screeningStep = step;
    facts.push(f);
  }
  facts.sort((a, b) =>
    (a.always === b.always ? 0 : a.always ? -1 : 1)
    || (a.screeningStep ?? 99) - (b.screeningStep ?? 99)
    || CORE_PERSON_FACTS.findIndex(([x]) => x === a.identifier) - CORE_PERSON_FACTS.findIndex(([x]) => x === b.identifier)
    || a.label.localeCompare(b.label));

  const records: DictRecordField[] = [];
  for (const [sheet, { list }] of Object.entries(RECORD_SHEETS) as Array<[DictRecordField["sheet"], { list: string }]>) {
    const it = ix.byIdentifier.get(list);
    if (!it?.record_fields) continue;
    for (const [field, spec] of Object.entries(it.record_fields)) {
      const r: DictRecordField = {
        sheet, list, field, label: recordFieldLabel(sheet, field), meaning: firstSentences(spec.meaning),
        type: spec.type, blank: field === "kind" ? "required" : blankRule(spec),
      };
      const opts = allowed(spec.options, spec.option_meanings);
      if (opts) r.options = opts;
      records.push(r);
    }
  }

  const results: DictResult[] = outcomeItems(ix, meta)
    .map((it) => {
      const r: DictResult = {
        identifier: it.identifier, id: it.id, label: it.name, program: it.program,
        programLabel: PROGRAM_LABELS[it.program], meaning: firstSentences(it.meaning),
        type: it.type, scope: it.scope,
      };
      const opts = allowed(it.options);
      if (opts) r.options = opts;
      return r;
    })
    .sort((a, b) => byProgramOrder(a.program, b.program) || a.label.localeCompare(b.label));

  const roles: DictRole[] = ((meta.relationship_roles ?? []) as RelationshipRoleDecl[]).map((r) => ({
    value: r.id, label: plainValue(r.id), meaning: r.label ?? "",
  }));

  return { volume: meta.volume, facts, records, results, roles };
}
