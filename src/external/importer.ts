/* The converter of the external sample check (docs/external-check.md): a
 * filled intake template (one CSV per sheet) becomes household cases in the
 * stored-household shape (src/engine/cases.ts), each with the expected
 * answers and where they came from. Every value that does not map is
 * reported with its file, row and column, and nothing is guessed: while
 * any value does not map, no case is converted. A column whose heading looks like a
 * personal identifier is refused outright. */
import type { HouseholdCase, PersonSpec } from "../engine/cases";
import { parseCsv, type CsvTable } from "./csv";
import {
  plainValue, RECORD_SHEETS, RETIRING_SCALAR_FACTS, SHEETS,
  type DictFact, type DictRecordField, type DictResult, type Dictionary, type SheetName,
} from "./dictionary";
import { ANY_RECORD_COLUMNS, NOT_SHEET_FILES, sheetColumns, sheetOfFile, SOURCES } from "./template";

export interface ImportIssue {
  file: string;
  /** The spreadsheet row (the heading is row 1); null for the whole file. */
  row: number | null;
  column: string | null;
  value: string;
  message: string;
}

export interface ExternalExpectation {
  person: string;
  identifier: string;
  program: string;
  month: string | null;
  /** The expected value; null is "cannot determine". */
  expect: unknown;
  source: string;
  notes: string;
  /** Where it was stated: `9-expected.csv row 4`. */
  at: string;
}

export interface ExternalCase extends HouseholdCase {
  external: {
    description: string;
    notes: string;
    /** pN -> the label the template used (Person 1). */
    persons: Record<string, string>;
    expected: ExternalExpectation[];
    /** Persons whose date of birth was set from their age. */
    dob_from_age?: string[];
  };
}

export interface ImportResult {
  cases: ExternalCase[];
  issues: ImportIssue[];
  /** True when a column was refused as an identifier. */
  refusedIdentifiers: boolean;
}

/** Headings that look like a personal identifier: names, SSNs, case and
 *  client numbers, addresses and contacts. */
export const IDENTIFIER_HEADING =
  /\b(?:case|client|ss)\s*#|\b(names?|first\s*name|last\s*name|middle\s*name|surname|initials|ssn|social\s*security(\s*(number|no))?|case\s*(number|no\.?|num)|client\s*(id|number|no)|state\s*id|medicaid\s*(id|number|no)|cbms\s*(id|number|case)|address(es)?|street|city|zip(\s*code)?|postal(\s*code)?|phone|telephone|mobile|e-?mail|driver'?s?\s*licen[cs]e|passport|a-?number|alien\s*(number|registration)|birth\s*place|place\s*of\s*birth|mrn|medical\s*record)\b/i;

/** A cell that looks like an identifier, or null. Only text cells (and the
 *  value cells of facts) are checked for long digit runs, and an amount, a
 *  date or a month is not one. */
export function identifierInCell(v: string, textCell: boolean): string | null {
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(v)) return "looks like a Social Security number";
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(v)) return "looks like an email address";
  if (/\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/.test(v)) return "looks like a phone number";
  if (/\b\d{1,6}\s+(?:[A-Za-z0-9.']+\s+){0,3}(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl|circle|cir|parkway|pkwy|highway|hwy)\b/i.test(v)) {
    return "looks like a street address";
  }
  if (!textCell) return null;
  const t = v.trim();
  if (/^\d{9}$/.test(t)) return "looks like a Social Security number";
  if (/\d{5,}/.test(t) && parseNumber(t) === null && !parseDate(t) && !parseMonth(t)) {
    return "has five or more digits in a row (a case, client or ID number?)";
  }
  return null;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, " ");
const key = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9+]+/g, "_").replace(/^_+|_+$/g, "");

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function validDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const pad = (n: number) => String(n).padStart(2, "0");

/** A calendar date written YYYY-MM-DD or M/D/YYYY. */
export function parseDate(v: string): string | null {
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
  if (m && validDate(+m[1], +m[2], +m[3])) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (m && validDate(+m[3], +m[1], +m[2])) return `${m[3]}-${pad(+m[1])}-${pad(+m[2])}`;
  return null;
}

/** A month written YYYY-MM, M/YYYY, Oct 2026, October 2026 or Oct-26, or a
 *  date on the first of the month (a spreadsheet turns 2026-10 into one). */
export function parseMonth(v: string): string | null {
  let m = /^(\d{4})-(\d{1,2})$/.exec(v);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${pad(+m[2])}`;
  m = /^(\d{1,2})\/(\d{4})$/.exec(v);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${pad(+m[1])}`;
  m = /^([a-z]{3,9})[\s-]+(\d{2}|\d{4})$/i.exec(v);
  if (m) {
    const k = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    const full = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    if (k >= 0 && (m[1].length === 3 || full[k] === m[1].toLowerCase() || (m[1].length === 4 && m[1].toLowerCase() === "sept"))) {
      const y = m[2].length === 2 ? `20${m[2]}` : m[2];
      return `${y}-${pad(k + 1)}`;
    }
  }
  const d = parseDate(v);
  if (d && d.endsWith("-01")) return d.slice(0, 7);
  return null;
}

/** A person label: Person 1, 1 or p1. */
export function parsePersonLabel(v: string): string | null {
  const m = /^(?:p|person\s*)?(\d{1,2})$/i.exec(v.trim());
  return m && +m[1] > 0 ? `p${+m[1]}` : null;
}

function parseNumber(v: string): number | null {
  const s = v.replace(/[$,\s]/g, "");
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

type Parsed = { ok: true; value: unknown } | { ok: false; message: string };

/** One value in a fact's or field's type. `persons` maps person labels of the
 *  case to pN. */
export function parseTyped(
  type: string, raw: string, options: ReadonlyArray<{ value: string }> | undefined,
  persons: Map<string, string> | null,
): Parsed {
  const v = raw.trim();
  const fail = (message: string): Parsed => ({ ok: false, message });
  switch (type) {
    case "yes/no": {
      const k = v.toLowerCase();
      if (["yes", "y", "true"].includes(k)) return { ok: true, value: true };
      if (["no", "n", "false"].includes(k)) return { ok: true, value: false };
      return fail("expected yes or no");
    }
    case "money":
    case "hours": {
      const n = parseNumber(v);
      return n === null ? fail(type === "money" ? "expected an amount in dollars (1234.50)" : "expected a number of hours") : { ok: true, value: n };
    }
    case "whole number": {
      const n = parseNumber(v);
      return n === null || !Number.isInteger(n) ? fail("expected a whole number") : { ok: true, value: n };
    }
    case "rate": {
      if (/%$/.test(v)) {
        const n = parseNumber(v.slice(0, -1));
        return n === null ? fail("expected a percentage (50%) or a fraction (0.5)") : { ok: true, value: n / 100 };
      }
      const n = parseNumber(v);
      if (n === null || n < 0 || n > 1) return fail("expected a percentage (50%) or a fraction between 0 and 1 (0.5)");
      return { ok: true, value: n };
    }
    case "calendar date": {
      const d = parseDate(v);
      return d ? { ok: true, value: d } : fail("expected a date, YYYY-MM-DD or M/D/YYYY");
    }
    case "month": {
      const m = parseMonth(v);
      return m ? { ok: true, value: m } : fail("expected a month, YYYY-MM (or M/YYYY, Oct 2026)");
    }
    case "one of": {
      const opts = options ?? [];
      const hit = opts.find((o) => key(o.value) === key(v));
      if (hit) return { ok: true, value: hit.value };
      const list = opts.map((o) => plainValue(o.value));
      return fail(`not an allowed value; allowed: ${list.length > 15 ? list.slice(0, 15).join("; ") + `; ... (${list.length} in allowed-values.csv)` : list.join("; ")}`);
    }
    case "text":
      return { ok: true, value: v };
    case "person": {
      const p = parsePersonLabel(v);
      if (!p) return fail("expected a person label: Person 1, Person 2, ...");
      if (persons && ![...persons.values()].includes(p)) return fail("no such person in this case on the persons sheet");
      return { ok: true, value: p };
    }
    case "group of persons": {
      const parts = v.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
      const out: string[] = [];
      for (const x of parts) {
        const p = parsePersonLabel(x);
        if (!p) return fail("expected person labels separated by commas: Person 1, Person 2");
        if (persons && ![...persons.values()].includes(p)) return fail(`no ${x} in this case on the persons sheet`);
        out.push(p);
      }
      return { ok: true, value: out.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))) };
    }
    case "list of months": {
      const parts = v.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
      const out: string[] = [];
      for (const x of parts) {
        const m = parseMonth(x);
        if (!m) return fail("expected months separated by commas: 2026-09, 2026-10");
        out.push(m);
      }
      return { ok: true, value: out };
    }
    default:
      return fail(`the template cannot state a value of type "${type}"`);
  }
}

/** Reads the CSV files of a filled template, keyed by file name. Files that
 *  are not sheets (other than the dictionary files) are reported. */
export function readSheets(files: Record<string, string>): { sheets: Partial<Record<SheetName, { file: string; table: CsvTable }>>; issues: ImportIssue[] } {
  const sheets: Partial<Record<SheetName, { file: string; table: CsvTable }>> = {};
  const issues: ImportIssue[] = [];
  for (const [file, text] of Object.entries(files)) {
    if (!file.toLowerCase().endsWith(".csv")) continue;
    if ((NOT_SHEET_FILES as readonly string[]).includes(file.toLowerCase())) continue;
    const s = sheetOfFile(file);
    if (!s) {
      issues.push({ file, row: null, column: null, value: "", message: `not a sheet of the template (sheets: ${SHEETS.join(", ")})` });
      continue;
    }
    if (sheets[s]) {
      issues.push({ file, row: null, column: null, value: "", message: `a second file for the ${s} sheet (first: ${sheets[s]!.file})` });
      continue;
    }
    sheets[s] = { file, table: parseCsv(text) };
  }
  return { sheets, issues };
}

interface Row { file: string; row: number; get(col: string): string; cols: string[] }

/** Converts a filled template. */
export function importTemplate(files: Record<string, string>, dict: Dictionary): ImportResult {
  const { sheets, issues } = readSheets(files);
  const cols = sheetColumns(dict);
  let refusedIdentifiers = false;
  const issue = (file: string, row: number | null, column: string | null, value: string, message: string) =>
    issues.push({ file, row, column, value, message });

  // Headings first: an identifier-like column stops the import.
  const rowsOf: Partial<Record<SheetName, Row[]>> = {};
  for (const s of SHEETS) {
    const sh = sheets[s];
    if (!sh) continue;
    const allowedCols = new Map(cols[s].map((c) => [norm(c), c]));
    const index = new Map<string, number>();
    sh.table.headers.forEach((h, i) => {
      if (h === "") {
        if (sh.table.rows.some((r) => (r.cells[i] ?? "").trim() !== "")) issue(sh.file, 1, `(column ${i + 1})`, "", "a column with values but no heading");
        return;
      }
      if (IDENTIFIER_HEADING.test(h)) {
        refusedIdentifiers = true;
        issue(sh.file, 1, h, h, "refused: the heading looks like a personal identifier (a name, SSN, case or client number, address or contact). Remove the column: send de-identified cases only");
        return;
      }
      const c = allowedCols.get(norm(h));
      if (!c) { issue(sh.file, 1, h, h, `not a column of the ${s} sheet (see data-dictionary.csv)`); return; }
      if (index.has(c)) { issue(sh.file, 1, h, h, "the column appears twice"); return; }
      index.set(c, i);
    });
    const textCols = new Set(["case", "description", "notes", "person", "other person"]);
    rowsOf[s] = sh.table.rows.map((r) => {
      const row: Row = {
        file: sh.file, row: r.row, cols: [...index.keys()],
        get: (c: string) => { const i = index.get(c); return i === undefined ? "" : (r.cells[i] ?? "").trim(); },
      };
      // Every cell is scanned for identifiers, including cells in refused columns.
      r.cells.forEach((cell, i) => {
        const h = sh.table.headers[i] ?? `(column ${i + 1})`;
        const why = identifierInCell(cell, textCols.has(norm(h)) || isTextColumn(dict, s, h));
        if (why) issue(sh.file, r.row, h, cell, `refused: ${why}. Send de-identified cases only`);
      });
      return row;
    });
  }
  if (!sheets.households) issue("1-households.csv", null, null, "", "the households sheet is missing");
  if (!sheets.persons) issue("2-persons.csv", null, null, "", "the persons sheet is missing");
  if (!sheets.expected) issue("9-expected.csv", null, null, "", "the expected sheet is missing");

  const factByLabel = new Map<string, DictFact>();
  for (const f of dict.facts) { factByLabel.set(norm(f.label), f); factByLabel.set(norm(f.identifier), f); }
  const resultByLabel = new Map<string, DictResult>();
  for (const r of dict.results) { resultByLabel.set(norm(r.label), r); resultByLabel.set(norm(r.identifier), r); }
  const fieldsBySheet = new Map<string, Map<string, DictRecordField>>();
  for (const r of dict.records) {
    const m = fieldsBySheet.get(r.sheet) ?? new Map<string, DictRecordField>();
    m.set(r.label, r);
    fieldsBySheet.set(r.sheet, m);
  }

  // Households.
  const cases = new Map<string, {
    c: ExternalCase; file: string; row: number; persons: Map<string, string>; personRow: Map<string, number>; stated: Set<string>;
    anyRecords: Map<string, Map<string, boolean>>; recordRows: Map<string, Map<string, number>>;
    monthsNeeded: Set<string>; monthScoped: Array<{ f: DictFact; value: unknown }>;
  }>();
  const caseOf = (r: Row): ReturnType<typeof cases.get> | null => {
    const label = r.get("case");
    if (!label) { issue(r.file, r.row, "case", "", "the case is blank"); return null; }
    const c = cases.get(label);
    if (!c) { issue(r.file, r.row, "case", label, "no such case on the households sheet"); return null; }
    return c;
  };
  for (const r of rowsOf.households ?? []) {
    const label = r.get("case");
    if (!label) { issue(r.file, r.row, "case", "", "the case is blank"); continue; }
    if (label.length > 20 || /\d{5}/.test(label) || !/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/.test(label)) {
      issue(r.file, r.row, "case", label, "a case label is at most 20 letters, digits, spaces, dots or dashes and never has 5 digits in a row (not a case number)");
      continue;
    }
    if (cases.has(label)) { issue(r.file, r.row, "case", label, "the case appears twice"); continue; }
    const dd = r.get("determination date");
    const asOf = dd ? parseDate(dd) : null;
    if (!asOf) issue(r.file, r.row, "determination date", dd, dd ? "expected a date, YYYY-MM-DD or M/D/YYYY" : "the determination date is blank");
    const c: ExternalCase = {
      id: label, title: r.get("description") || label, as_of: asOf ?? "",
      persons: {}, expect: {},
      external: { description: r.get("description"), notes: r.get("notes"), persons: {}, expected: [] },
    };
    cases.set(label, {
      c, file: r.file, row: r.row, persons: new Map(), personRow: new Map(), stated: new Set(), anyRecords: new Map(),
      recordRows: new Map(), monthsNeeded: new Set(asOf ? [asOf.slice(0, 7)] : []), monthScoped: [],
    });
  }

  // The relationships sheet lists every relationship of the case's persons:
  // a person with none listed has none (an empty list, not an unknown one).
  const personSpec = (c: ExternalCase, p: string): PersonSpec => (c.persons[p] ??= { facts: {}, relationships: [] });
  const personOf = (r: Row, col: string, cs: NonNullable<ReturnType<typeof caseOf>>, allowAll: boolean): string[] | null => {
    const v = r.get(col);
    if (!v) { issue(r.file, r.row, col, "", "the person is blank"); return null; }
    if (allowAll && norm(v) === "all") return [...cs.persons.values()];
    const p = parsePersonLabel(v);
    if (!p) { issue(r.file, r.row, col, v, "expected a person label: Person 1, Person 2, ... (never a name)"); return null; }
    if (![...cs.persons.values()].includes(p)) { issue(r.file, r.row, col, v, "no such person in this case on the persons sheet"); return null; }
    return [p];
  };
  /** States one fact; refuses a second statement of the same fact. */
  const state = (
    cs: NonNullable<ReturnType<typeof caseOf>>, r: Row, col: string, f: DictFact, person: string | null,
    month: string | null, value: unknown,
  ) => {
    const k = `${person ?? "case"}|${f.identifier}|${month ?? "all"}`;
    if (cs.stated.has(k)) {
      const who = person ? cs.c.external.persons[person] ?? person : "the household";
      issue(r.file, r.row, col, String(value), `${f.label} is already stated for ${who}${month ? " in " + month : ""}`);
      return;
    }
    cs.stated.add(k);
    const c = cs.c;
    if (f.scope === "case") { (c.case_facts ??= {})[f.identifier] = value; return; }
    if (f.scope === "month") {
      if (month) ((c.month_facts ??= {})[month] ??= {})[f.identifier] = value;
      else cs.monthScoped.push({ f, value });
      return;
    }
    const p = personSpec(c, person!);
    if (f.scope === "person") { (p.facts ??= {})[f.identifier] = value; return; }
    if (month) ((p.months ??= {})[month] ??= {})[f.identifier] = value;
    else (p.month_defaults ??= {})[f.identifier] = value;
  };

  // Persons.
  for (const r of rowsOf.persons ?? []) {
    const cs = caseOf(r);
    if (!cs) continue;
    const v = r.get("person");
    const p = parsePersonLabel(v);
    if (!p) { issue(r.file, r.row, "person", v, v ? "expected a person label: Person 1, Person 2, ... (never a name)" : "the person is blank"); continue; }
    if ([...cs.persons.values()].includes(p)) { issue(r.file, r.row, "person", v, "the person appears twice in this case"); continue; }
    cs.persons.set(v, p);
    cs.personRow.set(p, r.row);
    cs.c.external.persons[p] = `Person ${p.slice(1)}`;
    personSpec(cs.c, p);
  }
  for (const r of rowsOf.persons ?? []) {
    const cs = cases.get(r.get("case"));
    const p = cs ? parsePersonLabel(r.get("person")) : null;
    if (!cs || !p || cs.c.external.persons[p] === undefined) continue;
    for (const f of dict.facts.filter((x) => x.sheet === "persons")) {
      const raw = r.get(f.label);
      if (!raw) continue;
      const res = parseTyped(f.type, raw, f.options, cs.persons);
      if (!res.ok) { issue(r.file, r.row, f.label, raw, res.message); continue; }
      state(cs, r, f.label, f, p, null, res.value);
    }
    const age = r.get("age at determination date");
    if (age) {
      const n = parseTyped("whole number", age, undefined, null);
      if (!n.ok || (n.value as number) < 0 || (n.value as number) > 125) issue(r.file, r.row, "age at determination date", age, "expected an age in whole years");
      else if (cs.c.as_of) {
        const dob = dobFromAge(cs.c.as_of, n.value as number);
        const stated = cs.c.persons[p].facts?.date_of_birth as string | undefined;
        if (stated) {
          if (ageOn(stated, cs.c.as_of) !== n.value) issue(r.file, r.row, "age at determination date", age, `the date of birth ${stated} gives age ${ageOn(stated, cs.c.as_of)} on the determination date`);
        } else {
          const dobFact = dict.facts.find((f) => f.identifier === "date_of_birth");
          if (dobFact) state(cs, r, "age at determination date", dobFact, p, null, dob);
          (cs.c.external.dob_from_age ??= []).push(p);
        }
      }
    }
    for (const [col, sheet] of ANY_RECORD_COLUMNS) {
      const raw = r.get(col);
      if (!raw) continue;
      const res = parseTyped("yes/no", raw, undefined, null);
      if (!res.ok) { issue(r.file, r.row, col, raw, res.message); continue; }
      const m = cs.anyRecords.get(sheet) ?? new Map<string, boolean>();
      m.set(p, res.value as boolean);
      cs.anyRecords.set(sheet, m);
    }
  }

  // Relationships.
  for (const r of rowsOf.relationships ?? []) {
    const cs = caseOf(r);
    if (!cs) continue;
    const from = personOf(r, "person", cs, false);
    const to = personOf(r, "other person", cs, false);
    const rv = r.get("relationship");
    const role = dict.roles.find((x) => key(x.value) === key(rv) || key(x.label) === key(rv));
    if (!rv) issue(r.file, r.row, "relationship", "", "the relationship is blank");
    else if (!role) issue(r.file, r.row, "relationship", rv, "not an allowed relationship (see allowed-values.csv)");
    if (!from || !to || !role) continue;
    if (from[0] === to[0]) { issue(r.file, r.row, "other person", r.get("other person"), "a person cannot be related to themselves"); continue; }
    (cs.c.relationships ??= []).push([role.value, from[0], to[0]]);
  }

  // Records.
  for (const sheet of Object.keys(RECORD_SHEETS) as Array<keyof typeof RECORD_SHEETS>) {
    const list = RECORD_SHEETS[sheet].list;
    const fields = fieldsBySheet.get(sheet) ?? new Map();
    for (const r of rowsOf[sheet] ?? []) {
      const cs = caseOf(r);
      if (!cs) continue;
      const who = personOf(r, "person", cs, false);
      if (!who) continue;
      const rec: Record<string, unknown> = {};
      let ok = true;
      for (const [label, f] of fields) {
        const raw = r.get(label);
        if (!raw) continue;
        const res = parseTyped(f.type, raw, f.options, cs.persons);
        if (!res.ok) { issue(r.file, r.row, label, raw, res.message); ok = false; continue; }
        rec[f.field] = res.value;
      }
      const kindLabel = [...fields.values()].find((f) => f.field === "kind")?.label ?? "kind";
      if (rec.kind === undefined && ok) { issue(r.file, r.row, kindLabel, "", "the kind is blank"); ok = false; }
      if (!ok) continue;
      const p = personSpec(cs.c, who[0]);
      ((p.facts ??= {})[list] ??= [] as unknown[]);
      (p.facts[list] as unknown[]).push(rec);
      const m = cs.recordRows.get(sheet) ?? new Map<string, number>();
      m.set(who[0], (m.get(who[0]) ?? 0) + 1);
      cs.recordRows.set(sheet, m);
    }
  }

  // Expenses and other facts.
  const factRows = (sheet: "expenses" | "other-facts") => {
    const factCol = sheet === "expenses" ? "expense" : "fact";
    const valueCol = sheet === "expenses" ? "amount" : "value";
    for (const r of rowsOf[sheet] ?? []) {
      const cs = caseOf(r);
      if (!cs) continue;
      const name = r.get(factCol);
      if (!name) { issue(r.file, r.row, factCol, "", `the ${factCol} is blank`); continue; }
      const f = factByLabel.get(norm(name));
      if (!f) {
        const id = name.trim();
        if (RETIRING_SCALAR_FACTS.has(id)) issue(r.file, r.row, factCol, name, "income and resources are stated as records, on the earnings, other-income and resources sheets, not as this fact");
        else if (Object.values(RECORD_SHEETS).some((x) => x.list === id)) issue(r.file, r.row, factCol, name, "state these records on their own sheet");
        else issue(r.file, r.row, factCol, name, `not a fact of the template (see data-dictionary.csv, sheet ${sheet})`);
        continue;
      }
      if (sheet === "expenses" && f.sheet !== "expenses") { issue(r.file, r.row, factCol, name, "not an expense: state it on the other-facts sheet"); continue; }
      const mraw = r.get("month");
      let month: string | null = null;
      if (mraw) {
        month = parseMonth(mraw);
        if (!month) { issue(r.file, r.row, "month", mraw, "expected a month, YYYY-MM (or M/YYYY, Oct 2026)"); continue; }
        if (f.scope === "person" || f.scope === "case") { issue(r.file, r.row, "month", mraw, `${f.label} has one value, not one per month: leave the month blank`); continue; }
      }
      const raw = r.get(valueCol);
      if (!raw) { issue(r.file, r.row, valueCol, "", `the ${valueCol} is blank`); continue; }
      const res = parseTyped(f.type, raw, f.options, cs.persons);
      if (!res.ok) { issue(r.file, r.row, valueCol, raw, res.message); continue; }
      const householdFact = f.scope === "case" || f.scope === "month";
      if (householdFact) {
        if (r.get("person")) { issue(r.file, r.row, "person", r.get("person"), `${f.label} is a fact of the household: leave the person blank`); continue; }
        state(cs, r, factCol, f, null, month, res.value);
        if (month) cs.monthsNeeded.add(month);
        continue;
      }
      if (!r.get("person")) { issue(r.file, r.row, "person", "", `${f.label} is a fact of a person: give the person, or all`); continue; }
      const who = personOf(r, "person", cs, true);
      if (!who) continue;
      for (const p of who) state(cs, r, factCol, f, p, month, res.value);
      if (month) cs.monthsNeeded.add(month);
    }
  };
  factRows("expenses");
  factRows("other-facts");

  // Expected answers.
  for (const r of rowsOf.expected ?? []) {
    const cs = caseOf(r);
    if (!cs) continue;
    const who = personOf(r, "person", cs, true);
    const pv = r.get("program");
    const program = dict.results.find((x) => key(x.programLabel) === key(pv) || key(x.program) === key(pv)
      || (key(x.programLabel).includes("medicaid") && key(pv) === "medicaid"));
    if (!pv) issue(r.file, r.row, "program", "", "the program is blank");
    else if (!program) issue(r.file, r.row, "program", pv, `not a program; programs: ${[...new Set(dict.results.map((x) => x.programLabel))].join("; ")}`);
    const rv = r.get("result");
    const res = rv ? resultByLabel.get(norm(rv)) : undefined;
    if (!rv) issue(r.file, r.row, "result", "", "the result is blank");
    else if (!res) issue(r.file, r.row, "result", rv, "not a result of the template (see data-dictionary.csv, sheet expected)");
    else if (program && res.program !== program.program) issue(r.file, r.row, "result", rv, `a result of ${res.programLabel}, not of ${program.programLabel}`);
    const src = r.get("source of the expected answer");
    const source = SOURCES.find((s) => key(s) === key(src));
    if (!src) issue(r.file, r.row, "source of the expected answer", "", `the source is blank; one of: ${SOURCES.join("; ")}`);
    else if (!source) issue(r.file, r.row, "source of the expected answer", src, `one of: ${SOURCES.join("; ")}`);
    const mraw = r.get("month");
    let month: string | null = null;
    if (res && res.scope === "person-month") {
      month = mraw ? parseMonth(mraw) : cs.c.as_of ? cs.c.as_of.slice(0, 7) : null;
      if (mraw && !month) issue(r.file, r.row, "month", mraw, "expected a month, YYYY-MM (or M/YYYY, Oct 2026)");
    } else if (res && mraw) issue(r.file, r.row, "month", mraw, `${res.label} has no month: leave the month blank`);
    const av = r.get("expected answer");
    let expect: unknown;
    let okAnswer = false;
    if (!av) issue(r.file, r.row, "expected answer", "", "the expected answer is blank (write cannot determine if that is the answer)");
    else if (res) {
      if (norm(av) === "cannot determine" || norm(av) === "unknown") { expect = null; okAnswer = true; }
      else {
        const pr = parseTyped(res.type, av, res.options, cs.persons);
        if (!pr.ok) issue(r.file, r.row, "expected answer", av, pr.message);
        else { expect = pr.value; okAnswer = true; }
      }
    }
    if (!who || !program || !res || !source || !okAnswer || (res.scope === "person-month" && !month)) continue;
    for (const p of who) {
      const dup = cs.c.external.expected.find((e) => e.person === p && e.identifier === res.identifier && e.month === month);
      if (dup) { issue(r.file, r.row, "result", rv, `already expected for ${cs.c.external.persons[p]}${month ? " in " + month : ""} (${dup.at})`); continue; }
      cs.c.external.expected.push({
        person: p, identifier: res.identifier, program: res.program, month, expect, source,
        notes: r.get("notes"), at: `${r.file} row ${r.row}`,
      });
      const e = (cs.c.expect[p] ??= {});
      if (month) ((e[res.identifier] ??= {}) as Record<string, unknown>)[month] = expect === null ? "unknown" : expect;
      else e[res.identifier] = expect === null ? "unknown" : expect;
      if (month) cs.monthsNeeded.add(month);
    }
  }

  // Whole-case checks.
  for (const [label, cs] of cases) {
    if (!cs.persons.size) issue(cs.file, cs.row, "case", label, "the case has no persons on the persons sheet");
    if (!cs.c.external.expected.length) issue(cs.file, cs.row, "case", label, "the case has no expected answers on the expected sheet");
    for (const sheet of Object.keys(RECORD_SHEETS) as Array<keyof typeof RECORD_SHEETS>) {
      const any = cs.anyRecords.get(sheet) ?? new Map<string, boolean>();
      const rows = cs.recordRows.get(sheet) ?? new Map<string, number>();
      const col = ANY_RECORD_COLUMNS.find(([, s]) => s === sheet)![0];
      for (const p of cs.persons.values()) {
        const a = any.get(p);
        const n = rows.get(p) ?? 0;
        const list = RECORD_SHEETS[sheet].list;
        const pf = sheets.persons?.file ?? "persons";
        const pr = cs.personRow.get(p) ?? null;
        if (a === false && n) issue(pf, pr, col, "no", `the ${sheet} sheet has ${n} row(s) for ${label} ${cs.c.external.persons[p]}`);
        else if (a === true && !n) issue(pf, pr, col, "yes", `the ${sheet} sheet has no rows for ${label} ${cs.c.external.persons[p]}`);
        else if (a === false) ((personSpec(cs.c, p).facts ??= {})[list] = []);
      }
    }
    for (const { f, value } of cs.monthScoped) {
      for (const m of [...cs.monthsNeeded].sort()) {
        const mf = ((cs.c.month_facts ??= {})[m] ??= {});
        if (!(f.identifier in mf)) mf[f.identifier] = value;
      }
    }
  }

  // Nothing is converted while any value does not map.
  return {
    cases: issues.length ? [] : [...cases.values()].map((x) => x.c),
    issues,
    refusedIdentifiers,
  };
}

function isTextColumn(dict: Dictionary, sheet: SheetName, heading: string): boolean {
  const h = norm(heading);
  if (sheet === "persons") return dict.facts.some((f) => f.sheet === "persons" && norm(f.label) === h && f.type === "text");
  if (sheet in RECORD_SHEETS) return dict.records.some((r) => r.sheet === sheet && norm(r.label) === h && r.type === "text");
  return h === "value" || h === "fact" || h === "result" || h === "expected answer";
}

/** The date of birth an age gives: six months before the birthday that makes
 *  the person that age on the determination date, so the person is that age
 *  for six months either side of it. */
export function dobFromAge(asOf: string, age: number): string {
  const [y, m, d] = asOf.split("-").map(Number);
  let yy = y - age;
  let mm = m - 6;
  if (mm < 1) { mm += 12; yy -= 1; }
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  return `${yy}-${pad(mm)}-${pad(Math.min(d, last))}`;
}

/** Age in whole years on a date. */
export function ageOn(dob: string, on: string): number {
  const [by, bm, bd] = dob.split("-").map(Number);
  const [y, m, d] = on.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** One line per issue, as the CLI prints them. */
export function formatIssue(i: ImportIssue): string {
  const where = `${i.file}${i.row !== null ? ` row ${i.row}` : ""}${i.column ? `, column "${i.column}"` : ""}`;
  return `${where}${i.value ? `: "${i.value}"` : ""}: ${i.message}`;
}
