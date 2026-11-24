/* The intake template of the external sample check: the columns of each
 * sheet, and the data dictionary and allowed-values files written beside
 * them (docs/external-check.md). Generated from the volume's dictionary by
 * `npm run external:template`. */
import { writeCsv } from "./csv";
import {
  plainValue, RECORD_SHEETS, SHEETS, type DictFact, type Dictionary, type SheetName,
} from "./dictionary";

/** The template file of each sheet, numbered in the order staff fill them. */
export function sheetFile(sheet: SheetName): string {
  return `${SHEETS.indexOf(sheet) + 1}-${sheet}.csv`;
}

/** The sheet a file name holds: `3-relationships.csv` or `relationships.csv`
 *  (any leading number, any case). Null for any other file. */
export function sheetOfFile(file: string): SheetName | null {
  const m = /^(?:\d+[-_ ]*)?([a-z-]+)\.csv$/i.exec(file);
  const s = m ? m[1].toLowerCase() : "";
  return (SHEETS as readonly string[]).includes(s) ? (s as SheetName) : null;
}

/** Files that may sit in a template folder and are not sheets: the
 *  dictionary, and what the import and the check write back. */
export const NOT_SHEET_FILES = ["data-dictionary.csv", "allowed-values.csv", "import-issues.csv", "report.csv"] as const;

export const SOURCES = ["CBMS result", "worker determination", "policy expert"] as const;

/** A column every sheet's rows are fixed to, described once for the
 *  dictionary. */
interface FixedColumn { column: string; meaning: string; type: string; needed: string; allowed?: string }

const CASE: FixedColumn = {
  column: "case", type: "text", needed: "always",
  meaning: "Your short label for the household, the same on every sheet (EX-1, A, county-3). Not a case number: at most 20 characters and never 5 digits in a row.",
};
const PERSON: FixedColumn = {
  column: "person", type: "person", needed: "always",
  meaning: "Which person: Person 1, Person 2, ... (or 1, 2, ... or p1, p2, ...). Never a name or initials. On other-facts, expenses and expected, `all` means every person of the case.",
};
const NOTES: FixedColumn = {
  column: "notes", type: "text", needed: "optional",
  meaning: "Anything the person checking the case should know. Never a name, number or address.",
};

export const FIXED_COLUMNS: Readonly<Record<SheetName, readonly FixedColumn[]>> = {
  households: [
    CASE,
    { column: "description", type: "text", needed: "optional", meaning: "One line about the household, in your words (a single mother of two who works part time)." },
    { column: "determination date", type: "calendar date", needed: "always", meaning: "The date the eligibility is determined (YYYY-MM-DD, or M/D/YYYY), shifted like every other date in the case." },
    NOTES,
  ],
  persons: [
    CASE, PERSON,
    { column: "age at determination date", type: "whole number", needed: "always (or date of birth)", meaning: "The person's age in years on the determination date, in place of the date of birth. The date of birth is then set six months before the birthday that gives this age, so the person is that age for six months either side of the determination date. Give the date of birth instead where a birthday near the determination date matters." },
  ],
  relationships: [
    CASE, PERSON,
    { column: "relationship", type: "one of", needed: "always, for every household of more than one person", meaning: "How the person is related to the other person: `Person 1 | parent | Person 2` means Person 1 is the parent of Person 2. Give each pair once; the inverse is added. Also says who buys and prepares food together, who shares heat, who files taxes together and who claims whom." },
    { column: "other person", type: "person", needed: "always", meaning: "The other person of the pair." },
    NOTES,
  ],
  earnings: [CASE, PERSON],
  "other-income": [CASE, PERSON],
  resources: [CASE, PERSON],
  expenses: [
    CASE,
    { ...PERSON, needed: "for an expense of a person", meaning: PERSON.meaning + " Blank for an expense of the whole household (the home's total shelter costs)." },
    { column: "expense", type: "one of", needed: "always", meaning: "Which expense: one of the expenses listed for this sheet in the data dictionary." },
    { column: "month", type: "month", needed: "optional", meaning: "The month the expense is for (YYYY-MM). Blank: every month of the case." },
    { column: "amount", type: "money", needed: "always", meaning: "The amount for the month, in dollars." },
    NOTES,
  ],
  "other-facts": [
    CASE,
    { ...PERSON, needed: "for a fact of a person", meaning: PERSON.meaning + " Blank for a fact of the whole household (an application date)." },
    { column: "fact", type: "one of", needed: "always", meaning: "Which fact: its plain name as the data dictionary gives it (or the codex identifier)." },
    { column: "month", type: "month", needed: "optional", meaning: "The month the value is for (YYYY-MM), for a fact that can change from month to month. Blank: every month of the case." },
    { column: "value", type: "depends on the fact", needed: "always", meaning: "The value, in the type the data dictionary gives for the fact." },
    NOTES,
  ],
  expected: [
    CASE,
    { ...PERSON, meaning: PERSON.meaning + " Results are given per person: SNAP's household answer is given for each member." },
    { column: "program", type: "one of", needed: "always", meaning: "The program the result is for.", allowed: "" },
    { column: "result", type: "one of", needed: "always", meaning: "Which result: its plain name as the data dictionary gives it." },
    { column: "month", type: "month", needed: "for a monthly result", meaning: "The month of the result (YYYY-MM). Blank: the month of the determination date. Leave blank for a result that has no month (a due date)." },
    { column: "expected answer", type: "depends on the result", needed: "always", meaning: "The answer you expect, in the result's type: a value from its allowed values, an amount, yes or no, or `cannot determine`." },
    { column: "source of the expected answer", type: "one of", needed: "always", meaning: "Where the expected answer comes from.", allowed: SOURCES.join("; ") },
    NOTES,
  ],
};

/** The yes/no columns of the persons sheet that say whether a person's
 *  records were stated: `no` is an empty list, `yes` needs rows on the sheet,
 *  blank with no rows leaves the list unknown. */
export const ANY_RECORD_COLUMNS: ReadonlyArray<readonly [string, "earnings" | "other-income" | "resources"]> = [
  ["any earnings", "earnings"],
  ["any other income", "other-income"],
  ["any resources", "resources"],
];

/** The headings of each sheet. */
export function sheetColumns(d: Dictionary): Record<SheetName, string[]> {
  const out = {} as Record<SheetName, string[]>;
  for (const s of SHEETS) {
    const fixed = FIXED_COLUMNS[s].map((c) => c.column);
    if (s === "persons") {
      out[s] = [
        ...fixed,
        ...d.facts.filter((f) => f.sheet === "persons").map((f) => f.label),
        ...ANY_RECORD_COLUMNS.map(([c]) => c),
        "notes",
      ];
    } else if (s in RECORD_SHEETS) {
      out[s] = [...fixed, ...d.records.filter((r) => r.sheet === s).map((r) => r.label), "notes"];
    } else out[s] = fixed;
  }
  return out;
}

const SCOPE_WORDS: Readonly<Record<string, string>> = {
  person: "person",
  "person-month": "person, by month",
  case: "household",
  month: "household, by month",
  global: "everyone",
};

function allProgramsOr(programs: readonly string[], total: number): string {
  return programs.length >= total ? "all programs" : programs.join(", ");
}

function allowedSummary(opts: ReadonlyArray<{ value: string }> | undefined): string {
  if (!opts) return "";
  const vals = opts.map((o) => plainValue(o.value));
  return vals.length <= 12 ? vals.join("; ") : `${vals.length} values: see allowed-values.csv`;
}

export const DICTIONARY_HEADERS = [
  "sheet", "column or fact", "codex identifier", "codex item", "meaning", "type", "stated for",
  "allowed values", "always needed", "needed for", "blank means",
] as const;

export const ALLOWED_HEADERS = ["sheet", "column or fact", "value", "meaning"] as const;

/** data-dictionary.csv: one row per column, fact, record field and result. */
export function dictionaryCsv(d: Dictionary): string {
  const programCount = new Set(d.results.map((r) => r.program)).size;
  const rows: unknown[][] = [];
  const fixed = (sheet: SheetName, c: FixedColumn) =>
    rows.push([sheet, c.column, "", "", c.meaning, c.type, "", c.allowed ?? "", c.needed, "", ""]);
  const fact = (f: DictFact) =>
    rows.push([
      f.sheet, f.label, f.identifier, f.id, f.meaning, f.type, SCOPE_WORDS[f.scope] ?? f.scope,
      allowedSummary(f.options),
      f.always ? "yes" : "for some programs",
      allProgramsOr(f.programs, programCount),
      "not known: the engine answers cannot determine where a rule needs it",
    ]);
  for (const s of SHEETS) {
    if (s === "persons") {
      for (const c of FIXED_COLUMNS.persons) fixed(s, c);
      for (const f of d.facts.filter((x) => x.sheet === "persons")) fact(f);
      for (const [c, sheet] of ANY_RECORD_COLUMNS) {
        rows.push([s, c, RECORD_SHEETS[sheet].list, "", `Does the person have any ${sheet === "resources" ? "resources" : sheet === "earnings" ? "earnings from work" : "income other than earnings"}? no: none (an empty list); yes: the rows on the ${sheet} sheet are all of them; blank: the rows on the ${sheet} sheet, or not known when there are none.`, "yes/no", "person", "yes; no", "yes", "all programs", "the rows on the sheet; not known when none"]);
      }
      fixed(s, NOTES);
      continue;
    }
    if (s in RECORD_SHEETS) {
      for (const c of FIXED_COLUMNS[s]) fixed(s, c);
      for (const r of d.records.filter((x) => x.sheet === s)) {
        rows.push([s, r.label, `${r.list}.${r.field}`, "", r.meaning, r.type, "record", allowedSummary(r.options), r.field === "kind" ? "yes" : "where it applies", "", r.blank]);
      }
      fixed(s, NOTES);
      continue;
    }
    for (const c of FIXED_COLUMNS[s]) {
      if (s === "expected" && c.column === "program") {
        rows.push([s, c.column, "", "", c.meaning, c.type, "", [...new Set(d.results.map((r) => r.programLabel))].join("; "), c.needed, "", ""]);
      } else if (s === "relationships" && c.column === "relationship") {
        rows.push([s, c.column, "", "", c.meaning, c.type, "", `${d.roles.length} values: see allowed-values.csv`, c.needed, "", ""]);
      } else fixed(s, c);
    }
    if (s === "expenses" || s === "other-facts") for (const f of d.facts.filter((x) => x.sheet === s)) fact(f);
    if (s === "expected") {
      for (const r of d.results) {
        rows.push([s, r.label, r.identifier, r.id, r.meaning, r.type, SCOPE_WORDS[r.scope] ?? r.scope, allowedSummary(r.options), "", r.programLabel, ""]);
      }
    }
  }
  return writeCsv(DICTIONARY_HEADERS, rows);
}

/** allowed-values.csv: one row per allowed value of every choice. */
export function allowedValuesCsv(d: Dictionary): string {
  const rows: unknown[][] = [];
  for (const f of d.facts) for (const o of f.options ?? []) rows.push([f.sheet, f.label, plainValue(o.value), o.meaning ?? ""]);
  for (const r of d.records) for (const o of r.options ?? []) rows.push([r.sheet, r.label, plainValue(o.value), o.meaning ?? ""]);
  for (const r of d.roles) rows.push(["relationships", "relationship", r.label, r.meaning]);
  for (const r of d.results) for (const o of r.options ?? []) rows.push(["expected", r.label, plainValue(o.value), o.meaning ?? ""]);
  for (const s of SOURCES) rows.push(["expected", "source of the expected answer", s, ""]);
  return writeCsv(ALLOWED_HEADERS, rows);
}

/** Every file of the blank template: each sheet's heading row, and the two
 *  dictionary files. */
export function templateFiles(d: Dictionary): Record<string, string> {
  const cols = sheetColumns(d);
  const out: Record<string, string> = {};
  for (const s of SHEETS) out[sheetFile(s)] = writeCsv(cols[s], []);
  out["data-dictionary.csv"] = dictionaryCsv(d);
  out["allowed-values.csv"] = allowedValuesCsv(d);
  return out;
}
