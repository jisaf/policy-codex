import { beforeAll, describe, expect, it } from "vitest";
import { parseCsv, writeCsv } from "../../src/external/csv";
import {
  ageOn, dobFromAge, IDENTIFIER_HEADING, identifierInCell, importTemplate, parseMonth, parseTyped,
  type ExternalCase, type ImportResult,
} from "../../src/external/importer";
import { sheetColumns } from "../../src/external/template";
import { addColumn, addRow, coContext, exampleSheets, setCells } from "./helpers";

const ctx = () => coContext();
beforeAll(() => { coContext(); }, 120_000);

const H = "1-households.csv", P = "2-persons.csv", R = "3-relationships.csv", E = "4-earnings.csv";
const I = "5-other-income.csv", X = "7-expenses.csv", F = "8-other-facts.csv", Q = "9-expected.csv";

function only(res: ImportResult, id: string): ExternalCase {
  expect(res.issues).toEqual([]);
  const c = res.cases.find((x) => x.id === id);
  expect(c).toBeDefined();
  return c!;
}

describe("csv", () => {
  it("reads quotes, doubled quotes, line breaks in a field, a BOM and CRLF; skips blank and # rows", () => {
    const t = parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n,\r\n# a comment,z\r\n"two\nlines",2\r\n');
    expect(t.headers).toEqual(["a", "b"]);
    expect(t.rows.map((r) => r.cells)).toEqual([["x, y", 'say "hi"'], ["two\nlines", "2"]]);
    expect(t.rows.map((r) => r.row)).toEqual([2, 5]);
  });
  it("writes what it reads", () => {
    const text = writeCsv(["a", "b"], [["1,5", 'q"'], [null, 3]]);
    expect(parseCsv(text).rows.map((r) => r.cells)).toEqual([["1,5", 'q"'], ["", "3"]]);
  });
});

describe("values", () => {
  it("reads dates, months, money, rates and choices as the dictionary says, and refuses what it cannot read", () => {
    expect(parseTyped("calendar date", "10/1/2026", undefined, null)).toEqual({ ok: true, value: "2026-10-01" });
    expect(parseTyped("calendar date", "2026-02-30", undefined, null).ok).toBe(false);
    expect(parseTyped("money", "$1,234.50", undefined, null)).toEqual({ ok: true, value: 1234.5 });
    expect(parseTyped("rate", "50%", undefined, null)).toEqual({ ok: true, value: 0.5 });
    expect(parseTyped("rate", "50", undefined, null).ok).toBe(false);
    expect(parseTyped("yes/no", "Yes", undefined, null)).toEqual({ ok: true, value: true });
    expect(parseTyped("yes/no", "maybe", undefined, null).ok).toBe(false);
    expect(parseTyped("one of", "Private Dwelling", [{ value: "private_dwelling" }], null)).toEqual({ ok: true, value: "private_dwelling" });
    expect(parseTyped("one of", "house", [{ value: "private_dwelling" }], null).ok).toBe(false);
    for (const m of ["2026-10", "10/2026", "Oct 2026", "October 2026", "Oct-26", "10/1/2026", "2026-10-01"]) expect(parseMonth(m)).toBe("2026-10");
    expect(parseMonth("10/15/2026")).toBeNull();
  });
  it("sets a date of birth six months before the birthday of the age given", () => {
    expect(dobFromAge("2026-10-01", 70)).toBe("1956-04-01");
    expect(ageOn(dobFromAge("2026-10-01", 70), "2026-10-01")).toBe(70);
    expect(ageOn(dobFromAge("2026-03-31", 18), "2026-03-31")).toBe(18);
  });
});

describe("importTemplate: mapping", () => {
  it("converts the worked example into cases in the stored-household shape", () => {
    const res = importTemplate(exampleSheets("EX-1", "EX-2", "EX-3", "EX-4"), ctx().dict);
    expect(res.issues).toEqual([]);
    expect(res.cases.map((c) => c.id)).toEqual(["EX-1", "EX-2", "EX-3", "EX-4"]);
    const ex1 = only(res, "EX-1");
    expect(ex1.as_of).toBe("2026-10-01");
    expect(ex1.relationships).toContainEqual(["spouse", "p1", "p2"]);
    expect(ex1.persons.p1.facts?.receipts).toEqual([{ kind: "social_security", amount: 1650 }]);
    expect(ex1.persons.p1.facts?.earnings).toEqual([]);
    expect(ex1.persons.p1.month_defaults?.shelter_cost_monthly).toBe(1100);
    expect(ex1.case_facts?.snap_application_date).toBe("2026-09-15");
    expect(ex1.expect.p1.snap_allotment).toEqual({ "2026-10": 25 });
    expect(ex1.external.expected.find((e) => e.identifier === "snap_allotment" && e.person === "p1")?.source).toBe("policy expert");
    // EX-3 gives an age, not a date of birth.
    const ex3 = only(res, "EX-3");
    expect(ex3.persons.p1.facts?.date_of_birth).toBe("1956-04-01");
    expect(ex3.external.dob_from_age).toEqual(["p1"]);
    // No scalar income or resource fact is ever written.
    const text = JSON.stringify(res.cases);
    for (const f of ["wages_gross", "liquid_resources_value", "self_employment_gross_receipts"]) expect(text).not.toContain(f);
  });

  it("states months, household facts, `all` persons and cannot determine where the sheets say so", () => {
    const files = exampleSheets("EX-2");
    addRow(files, X, { case: "EX-2", person: "Person 1", expense: "Dependent care expense", month: "Nov 2026", amount: "$125" });
    addRow(files, F, { case: "EX-2", person: "all", fact: "is_probation_or_parole_violator", value: "no" });
    addRow(files, F, { case: "EX-2", person: "", fact: "snap_application_date", value: "10/12/2026" });
    addRow(files, Q, {
      case: "EX-2", person: "Person 1", program: "SNAP", result: "SNAP: eligibility status", month: "",
      "expected answer": "cannot determine", "source of the expected answer": "CBMS result",
    });
    const c = only(importTemplate(files, ctx().dict), "EX-2");
    expect(c.persons.p1.months?.["2026-11"]?.dependent_care_expense).toBe(125);
    expect(c.persons.p1.facts?.is_probation_or_parole_violator).toBe(false);
    expect(c.persons.p2.facts?.is_probation_or_parole_violator).toBe(false);
    expect(c.case_facts?.snap_application_date).toBe("2026-10-12");
    // a blank month is the determination date's month; cannot determine is "unknown"
    expect(c.expect.p1.snap_eligibility_status).toEqual({ "2026-10": "unknown" });
    // a person with no relationship listed has none (not unknown)
    expect(c.persons.p1.relationships).toEqual([]);
  });

  it("states `any ... no` as an empty list and leaves a blank with no rows unknown", () => {
    const files = exampleSheets("EX-3");
    setCells(files, P, () => true, "any resources", "");
    files["6-resources.csv"] = writeCsv(parseCsv(files["6-resources.csv"]).headers, []);
    const c = only(importTemplate(files, ctx().dict), "EX-3");
    expect(c.persons.p1.facts?.holdings).toBeUndefined();
    expect(c.persons.p1.facts?.earnings).toEqual([]);
  });
});

describe("importTemplate: privacy", () => {
  it("has no template heading that looks like an identifier", () => {
    for (const cols of Object.values(sheetColumns(ctx().dict))) {
      for (const c of cols) expect(IDENTIFIER_HEADING.test(c), c).toBe(false);
    }
  });

  for (const heading of ["Client name", "Name", "SSN", "Social Security Number", "Case number", "Case #", "Address", "Street", "ZIP code", "Phone", "Email", "Medicaid ID", "Last Name", "Initials"]) {
    it(`refuses a "${heading}" column and converts nothing`, () => {
      const files = exampleSheets("EX-2");
      addColumn(files, P, heading, "x");
      const res = importTemplate(files, ctx().dict);
      expect(res.refusedIdentifiers).toBe(true);
      expect(res.cases).toEqual([]);
      expect(res.issues).toContainEqual(expect.objectContaining({ file: P, row: 1, column: heading }));
      expect(res.issues.find((i) => i.column === heading)?.message).toMatch(/^refused: .*identifier/);
    });
  }

  it("refuses cells that look like an SSN, a street address, an email, a phone or a case number", () => {
    expect(identifierInCell("123-45-6789", false)).toMatch(/Social Security/);
    expect(identifierInCell("lives at 1234 Elm Street", true)).toMatch(/address/);
    expect(identifierInCell("jo@example.org", true)).toMatch(/email/);
    expect(identifierInCell("(303) 555-0100", true)).toMatch(/phone/);
    expect(identifierInCell("CBMS 1B23456", true)).toMatch(/digits/);
    expect(identifierInCell("2026-10-01", true)).toBeNull();
    expect(identifierInCell("240000", true)).toBeNull();
    const files = exampleSheets("EX-2");
    setCells(files, P, (r) => r.person === "Person 1", "notes", "SSN 123-45-6789");
    setCells(files, P, (r) => r.person === "Person 2", "Dwelling", "1234 Elm St");
    const res = importTemplate(files, ctx().dict);
    expect(res.cases).toEqual([]);
    const refused = res.issues.filter((i) => i.message.startsWith("refused"));
    expect(refused.map((i) => [i.file, i.row, i.column])).toEqual([[P, 2, "notes"], [P, 3, "Dwelling"]]);
  });

  it("refuses a case label that looks like a case number", () => {
    const files = exampleSheets("EX-2");
    setCells(files, H, () => true, "case", "1234567");
    const res = importTemplate(files, ctx().dict);
    expect(res.issues).toContainEqual(expect.objectContaining({ file: H, row: 2, column: "case", value: "1234567" }));
  });
});

describe("importTemplate: error reporting", () => {
  it("reports every unmappable value with its file, row and column, and converts nothing", () => {
    const files = exampleSheets("EX-2");
    setCells(files, P, (r) => r.person === "Person 1", "Is pregnant", "perhaps");
    setCells(files, P, (r) => r.person === "Person 2", "Immigration status", "green card");
    addRow(files, F, { case: "EX-2", person: "Person 1", fact: "wages_gross", value: "400" });
    addRow(files, F, { case: "EX-2", person: "Person 1", fact: "Favourite colour", value: "blue" });
    addRow(files, R, { case: "EX-2", person: "Person 1", relationship: "aunt", "other person": "Person 2" });
    addRow(files, E, { case: "EX-2", person: "Person 3", "kind of earnings": "wages", amount: "10" });
    addRow(files, I, { case: "EX-2", person: "Person 2", "kind of income": "", amount: "10" });
    addRow(files, Q, { case: "EX-2", person: "Person 1", program: "SNAP", result: "Colorado Works: eligibility status", month: "2026-10", "expected answer": "eligible", "source of the expected answer": "CBMS result" });
    addRow(files, Q, { case: "EX-2", person: "Person 1", program: "Colorado Works", result: "Colorado Works: eligibility status", month: "2026-11", "expected answer": "eligible", "source of the expected answer": "my supervisor" });
    addRow(files, Q, { case: "EX-9", person: "Person 1", program: "Colorado Works", result: "Colorado Works: eligibility status", month: "2026-11", "expected answer": "yes", "source of the expected answer": "CBMS result" });
    const res = importTemplate(files, ctx().dict);
    expect(res.cases).toEqual([]);
    expect(res.refusedIdentifiers).toBe(false);
    const at = (file: string, column: string) => res.issues.filter((i) => i.file === file && i.column === column);
    expect(at(P, "Is pregnant")[0]).toMatchObject({ row: 2, value: "perhaps", message: "expected yes or no" });
    expect(at(P, "Immigration status")[0]).toMatchObject({ row: 3, value: "green card" });
    expect(at(P, "Immigration status")[0].message).toMatch(/^not an allowed value; allowed: /);
    const facts = at(F, "fact");
    expect(facts.map((i) => i.value)).toEqual(["wages_gross", "Favourite colour"]);
    expect(facts[0].message).toMatch(/stated as records/);
    expect(at(R, "relationship")[0]).toMatchObject({ value: "aunt" });
    expect(at(E, "person")[0].message).toMatch(/no such person/);
    expect(at(I, "kind of income")[0].message).toBe("the kind is blank");
    expect(at(Q, "result").some((i) => /not of SNAP/.test(i.message))).toBe(true);
    expect(at(Q, "source of the expected answer")[0]).toMatchObject({ value: "my supervisor" });
    expect(at(Q, "case")[0]).toMatchObject({ value: "EX-9", message: "no such case on the households sheet" });
    for (const i of res.issues) expect(i.row === null || i.row >= 1).toBe(true);
  });

  it("reports a sheet that says `any earnings: yes` with no rows, an unknown column and a stray file", () => {
    const files = exampleSheets("EX-3");
    setCells(files, P, () => true, "any earnings", "yes");
    addColumn(files, F, "colour", "");
    files["names.csv"] = "x\n";
    const res = importTemplate(files, ctx().dict);
    expect(res.issues).toContainEqual(expect.objectContaining({ file: P, row: 2, column: "any earnings" }));
    expect(res.issues).toContainEqual(expect.objectContaining({ file: F, row: 1, column: "colour" }));
    expect(res.issues).toContainEqual(expect.objectContaining({ file: "names.csv", row: null }));
  });
});
