/* Plain-language presentation: how a value reads to a policy analyst, a
 * lawyer or a county worker rather than to the engine. Money in dollars and
 * cents with no float noise, rates as percentages ("142% of FPL", with the
 * monthly dollar figure for a household size), option codes as words,
 * tables as rows, people as "Person 1". Pure functions over items and
 * values; the components that render them live in Present.tsx.
 *
 * Nothing here changes the engine's own `fmt`/`lit`, which the conformance
 * suite and the item block text depend on. */
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import { paramInForce } from "../engine/versions";

/** Rounds away binary float noise (179.6400000000001 -> 179.64) without
 *  changing any value a rule meant: twelve significant decimals is far below
 *  any figure the ledger states. */
export function clean(n: number): number {
  if (!Number.isFinite(n)) return n;
  return Number(n.toFixed(10));
}

function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** A number with thousands separators and at most `maxDecimals` decimals,
 *  trailing zeros dropped: 1234.5 -> "1,234.5", 0.30000000000000004 -> "0.3". */
export function formatNumber(n: number, maxDecimals = 4): string {
  if (!Number.isFinite(n)) return String(n);
  const fixed = clean(n).toFixed(maxDecimals).replace(/\.?0+$/, "");
  const neg = fixed.startsWith("-");
  const [i, d] = (neg ? fixed.slice(1) : fixed).split(".");
  const out = group(i) + (d ? "." + d : "");
  return neg && out !== "0" ? "-" + out : out;
}

/** Dollars and cents, always two decimals: 179.6400000000001 -> "$179.64",
 *  -12.5 -> "-$12.50". */
export function formatMoney(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const cents = Math.round(clean(n) * 100);
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const s = `$${group(String(Math.floor(abs / 100)))}.${String(abs % 100).padStart(2, "0")}`;
  return neg ? "-" + s : s;
}

/** A fraction as a percentage: 1.42 -> "142%", 0.05 -> "5%", 0.075 -> "7.5%". */
export function formatPercent(rate: number): string {
  return `${formatNumber(clean(rate * 100), 2)}%`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September",
  "October", "November", "December",
];

/** "2026-10-01" -> "October 1, 2026"; "2026-10" -> "October 2026". Anything
 *  else is returned unchanged. */
export function formatDate(s: string): string {
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${Number(m[3])}, ${m[1]}`;
  m = /^(\d{4})-(\d{2})$/.exec(s);
  if (m) return `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
  return s;
}

/** "p1" -> "Person 1"; any other id is kept, capitalised. */
export function personLabel(person: string | null | undefined): string {
  if (!person) return "";
  const m = /^p(\d+)$/i.exec(person);
  return m ? `Person ${m[1]}` : person[0].toUpperCase() + person.slice(1);
}

// ---- option codes

/** Words that read as acronyms or proper names when an option code is
 *  turned into words. */
const UPPER: Record<string, string> = {
  snap: "SNAP", magi: "MAGI", ltc: "LTC", abawd: "ABAWD", pace: "PACE", ssi: "SSI",
  fpl: "FPL", oap: "OAP", hcbs: "HCBS", chp: "CHP+", cw: "Colorado Works", af: "Adult Financial",
  leap: "LEAP", cccap: "CCCAP", tanf: "TANF", moe: "MOE", us: "U.S.", id: "ID", ssn: "SSN",
  hiv: "HIV", aids: "AIDS", ebd: "EBD", qmb: "QMB", slmb: "SLMB", qdwi: "QDWI", bcc: "BCC",
  bccp: "BCCP", cbwd: "CBWD", msp: "MSP", dac: "DAC", ces: "CES", cmhs: "CMHS", ihss: "IHSS",
  chrp: "CHRP", cwchn: "CWCHN", bi: "BI", dd: "DD", cih: "CIH", covid: "COVID", hca: "HCA",
  sebt: "SUN Bucks", ma: "Medicaid", ie: "i.e.", ii: "II", iii: "III", iv: "IV", xix: "XIX",
  xxi: "XXI",
};

const PAIRS: Array<[RegExp, string]> = [
  [/^and_cs$/, "AND-CS"], [/^and_so$/, "AND-SO"], [/^qi_1$/, "QI-1"],
];

/** Codes whose generic reading would mislead, read as the rule means them. */
const OPTION_OVERRIDES: Record<string, string> = {
  ineligible_no_category: "Not eligible: no category applies",
  not_applicable: "Not applicable",
  not_in_unit_did_not_request: "Not in the unit: did not ask to join",
};

function words(code: string): string {
  for (const [re, label] of PAIRS) if (re.test(code)) return label;
  return code.split("_").filter(Boolean).map((w) => UPPER[w] ?? w).join(" ")
    .replace(/\band cs\b/i, "AND-CS").replace(/\band so\b/i, "AND-SO");
}

function sentenceCase(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** An option code in words: `ineligible_no_category` -> "Not eligible: no
 *  category applies", `eligible_pace` -> "Eligible: PACE",
 *  `pending_reasonable_opportunity` -> "Pending: reasonable opportunity".
 *  An item may carry its own `option_labels` map, which wins. */
export function optionLabel(item: Pick<Item, "options"> | null | undefined, code: string): string {
  const own = (item as { option_labels?: Record<string, string> } | null | undefined)?.option_labels;
  if (own && typeof own[code] === "string") return own[code];
  if (OPTION_OVERRIDES[code]) return OPTION_OVERRIDES[code];
  const prefixes: Array<[string, string]> = [
    ["ineligible_", "Not eligible: "], ["not_eligible_", "Not eligible: "],
    ["eligible_", "Eligible: "], ["not_applicable_", "Not applicable: "],
    ["pending_", "Pending: "], ["not_in_", "Not in "],
  ];
  for (const [p, label] of prefixes) {
    if (code.startsWith(p) && code.length > p.length) {
      return label + words(code.slice(p.length));
    }
  }
  return sentenceCase(words(code));
}

// ---- rates and FPL

/** Whether a rate item states a share of the federal poverty level. */
export function isFplRate(item: Pick<Item, "name" | "identifier" | "type">): boolean {
  if (item.type !== "rate") return false;
  const text = `${item.name} ${item.identifier}`;
  if (/premium cap|copay|cost sharing|apportioned|penalty/i.test(text)) return false;
  return /\bfpl\b|_fpl|fpl_|poverty/i.test(text);
}

/** A rate read as a count rather than a share ("weeks per month"). */
function isRatio(item: Pick<Item, "name">): boolean {
  return /\bper\b/i.test(item.name);
}

export interface FplContext {
  /** Annual HHS guideline by household size ("1".."8"), in force on the date. */
  table: Record<string, number>;
  /** Annual amount for each member above the largest size in the table. */
  eachAdditional: number | null;
  /** The date the guideline was read for. */
  asOf: string;
}

/** The annual HHS poverty guideline in force on `asOf`, from the volume's
 *  `federal_poverty_guideline_annual_table` (and its each-additional
 *  companion), or null when the volume has none. */
export function fplContext(engine: Engine, asOf: string): FplContext | null {
  const t = engine.item("federal_poverty_guideline_annual_table");
  if (!t) return null;
  const table = paramInForce(t, asOf);
  if (!table || typeof table !== "object") return null;
  const add = engine.item("federal_poverty_guideline_annual_each_additional");
  const extra = add ? paramInForce(add, asOf) : null;
  return {
    table: table as Record<string, number>,
    eachAdditional: typeof extra === "number" ? extra : null,
    asOf,
  };
}

/** The annual guideline for a household size, extending past the table by
 *  the each-additional amount. */
export function fplAnnual(ctx: FplContext, size: number): number | null {
  const direct = ctx.table[String(size)];
  if (typeof direct === "number") return direct;
  const sizes = Object.keys(ctx.table).map(Number).filter(Number.isFinite);
  const top = Math.max(...sizes);
  if (!Number.isFinite(top) || size < top || ctx.eachAdditional === null) return null;
  return ctx.table[String(top)] + (size - top) * ctx.eachAdditional;
}

/** "142% of FPL", and with a household size and guideline,
 *  "142% of FPL ($3,233.53 a month for a household of 3)". */
export function formatFplPercent(rate: number, ctx?: FplContext | null, size?: number): string {
  const pct = `${formatPercent(rate)} of FPL`;
  if (!ctx || !size) return pct;
  const annual = fplAnnual(ctx, size);
  if (annual === null) return pct;
  return `${pct} (${formatMoney((annual * rate) / 12)} a month for a household of ${size})`;
}

/** The monthly dollar figure of an FPL rate for each household size in the
 *  guideline table: what HCPF publishes beside the percentage. */
export function fplMonthlyBySize(rate: number, ctx: FplContext): Array<{ size: number; monthly: number }> {
  return Object.keys(ctx.table).map(Number).filter(Number.isFinite).sort((a, b) => a - b)
    .map((size) => ({ size, monthly: clean((ctx.table[String(size)] * rate) / 12) }));
}

// ---- tables

export interface TableRows {
  /** What the keys are, read from the item's type ("household size"). */
  keyLabel: string;
  rows: Array<{ key: string; value: unknown }>;
}

/** A parameter table as rows, keys in natural order. Null for a value that
 *  is not a table. */
export function tableRows(item: Pick<Item, "type"> | null, value: unknown): TableRows | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const m = /^table keyed by (.+)$/.exec(item?.type ?? "");
  const keyLabel = m ? m[1] : "key";
  const rows = Object.entries(value as Record<string, unknown>).map(([key, v]) => ({ key, value: v }));
  const numeric = rows.every((r) => /^-?\d+(\.\d+)?$/.test(r.key));
  rows.sort((a, b) => numeric ? Number(a.key) - Number(b.key) : a.key.localeCompare(b.key));
  return { keyLabel: keyLabel[0].toUpperCase() + keyLabel.slice(1), rows };
}

// ---- one value

export interface FormatOptions {
  /** The FPL guideline, so an FPL rate also reads in monthly dollars. */
  fpl?: FplContext | null;
  /** Household size for the FPL dollar figure. */
  householdSize?: number;
}

/** Whether an item's numbers are dollars. */
export function isMoney(item: Pick<Item, "type"> | null | undefined): boolean {
  return item?.type === "money";
}

/** One value of an item, in words: "Yes", "$179.64", "142% of FPL",
 *  "Not eligible: no category applies", "October 1, 2026", "Unknown".
 *  A table reads as "a table of N rows" here; render it with ValueTable. */
export function formatValue(
  item: Pick<Item, "type" | "name" | "identifier" | "options"> | null | undefined,
  value: unknown, opts: FormatOptions = {},
): string {
  if (value === null || value === undefined) return "Unknown";
  if (value === true) return "Yes";
  if (value === false) return "No";
  const type = item?.type ?? "";
  if (typeof value === "number") {
    if (type === "money") return formatMoney(value);
    if (type === "rate" && item) {
      if (isRatio(item)) return formatNumber(value);
      if (isFplRate(item)) return formatFplPercent(value, opts.fpl, opts.householdSize);
      return formatPercent(value);
    }
    if (type === "hours") return `${formatNumber(value)} hour${value === 1 ? "" : "s"}`;
    return formatNumber(value);
  }
  if (typeof value === "string") {
    if (type === "one of") return optionLabel(item, value);
    if (type === "calendar date" || type === "month") return formatDate(value);
    if (type === "person") return personLabel(value);
    return value;
  }
  if (Array.isArray(value)) {
    if (type === "group of persons") return value.length ? value.map((v) => personLabel(String(v))).join(", ") : "Nobody";
    if (type === "list of months") return value.length ? value.map((v) => formatDate(String(v))).join(", ") : "No months";
    return value.map((v) => formatValue(null, v)).join(", ");
  }
  if (typeof value === "object") {
    const n = Object.keys(value as object).length;
    return `a table of ${n} row${n === 1 ? "" : "s"}`;
  }
  return String(value);
}

/** The value of one table cell: the table's own item type is "table keyed
 *  by ...", so a cell reads as money when the table's name or meaning says
 *  it holds dollars, and as a number otherwise. */
export function formatCell(item: Pick<Item, "name" | "meaning" | "precision"> | null, value: unknown): string {
  if (typeof value !== "number") return formatValue(null, value);
  const text = `${item?.name ?? ""} ${item?.meaning ?? ""} ${item?.precision ?? ""}`;
  if (/percent|rate|share|fraction/i.test(item?.name ?? "")) return formatPercent(value);
  if (/\$|dollar|allotment|grant|standard|guideline|amount|allowance|deduction|income limit|benefit|payment|fee/i.test(text)) {
    return formatMoney(value);
  }
  return formatNumber(value);
}

/** A value in a trace or case row, given the item's identifier: resolves the
 *  item and formats with it. */
export function formatFor(engine: Engine, identifier: string, value: unknown, opts: FormatOptions = {}): string {
  return formatValue(engine.item(identifier) ?? null, value, opts);
}
