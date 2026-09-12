import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildIndex } from "../../src/engine/ledger-index";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { caseToSpec, parseCases, programsOfCase, runCase } from "../../src/engine/cases";
import ledger from "../fixtures/ledger.json";
import type { Item } from "../../src/engine/types";

const root = path.resolve(__dirname, "../..");
const items = ledger.items as unknown as Item[];
const ix = buildIndex(items);
const casesText = fs.readFileSync(path.join(root, "volumes/mwr/tests/cases.yaml"), "utf8");
const cases = parseCases(casesText);

describe("household cases", () => {
  it("parses all 13 household cases from the ledger", () => {
    expect(cases).toHaveLength(13);
    expect(cases.map((c) => c.id)).toContain("C-13");
  });

  it("runs every case: 60 of 60 expectations passing, as the retired checker reported", () => {
    const reports = cases.map((c) => runCase(ix, c));
    const passed = reports.reduce((s, r) => s + r.passed, 0);
    const failed = reports.reduce((s, r) => s + r.failed, 0);
    expect(passed + failed).toBe(60);
    expect(passed).toBe(60);
    expect(failed).toBe(0);
    for (const r of reports) {
      for (const res of r.results) {
        expect(res.ok, `${r.id} ${res.person}.${res.identifier}${res.month ? "@" + res.month : ""}`)
          .toBe(true);
      }
    }
  });

  it("checks a person-month expectation keyed by month, month by month", () => {
    // C-04's household reaches a different SNAP responsibility answer in
    // 2027-02 than in 2027-03, so the identifier must be checked twice.
    const c = cases.find((x) => x.id === "C-04")!;
    const report = runCase(ix, c);
    const matches = report.results.filter(
      (r) => r.person === "p1" && r.identifier === "snap_has_responsibility_for_child_under_14",
    );
    expect(matches).toHaveLength(2);
    expect(matches.map((m) => m.month).sort()).toEqual(["2027-02", "2027-03"]);
    expect(matches.every((m) => m.ok)).toBe(true);
    expect(matches.find((m) => m.month === "2027-02")!.expect).toBe(true);
    expect(matches.find((m) => m.month === "2027-03")!.expect).toBe(false);
  });

  it("does not split a non-person-month expectation by month even when it is object-shaped", () => {
    // determination_date-like case-scope facts aside, an ordinary scalar
    // expectation (not person-month) is evaluated once with month null.
    const c = cases.find((x) => x.id === "C-01")!;
    const report = runCase(ix, c);
    const status = report.results.find(
      (r) => r.person === "p1" && r.identifier === "medicaid_ce_status_at_application",
    )!;
    expect(status.month).toBeNull();
    expect(status.ok).toBe(true);
  });

  it("counts an unknown identifier as a failure, with the error recorded", () => {
    const base = cases[0];
    const bad = { ...base, expect: { p1: { does_not_exist: true } } };
    const report = runCase(ix, bad);
    expect(report.passed).toBe(0);
    expect(report.failed).toBe(1);
    const [r] = report.results;
    expect(r.ok).toBe(false);
    expect(r.err).toMatch(/unknown fact does_not_exist/);
    expect(r.got).toBe(`error: ${r.err}`);
  });

  it("groups a case's expected identifiers by program", () => {
    const c = cases.find((x) => x.id === "C-03")!;
    expect(programsOfCase(ix, c)).toEqual(["Medicaid", "SNAP"]);
  });

  it("adapts a household case into the spec shape makeCase/evaluate accept", () => {
    const c = cases.find((x) => x.id === "C-01")!;
    const spec = caseToSpec(c);
    expect(spec.id).toBe("C-01");
    expect(spec.as_of).toBe("2027-03-15");
    const data = makeCase(ix, spec);
    expect(evaluate(ix, data, "medicaid_ce_status_at_application", "p1", null)).toBe("met");
  });
});
