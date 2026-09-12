import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createEngine } from "../../src/engine/engine";
import { parseCases } from "../../src/engine/cases";
import { buildSuite, gradeCase } from "../../src/export/conformance";
import { evaluateCase } from "../../scripts/adapters/codex-self-lib";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, TestSpec, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const root = path.resolve(__dirname, "../..");
const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const casesText = fs.readFileSync(path.join(root, "volumes/mwr/tests/cases.yaml"), "utf8");
const cases = parseCases(casesText);
const vol = {
  volumeId: "mwr", title: "Work requirements under H.R.1", path: "volumes/mwr",
  ref: "main", sha: null, meta: ledger.meta, items: ledger.items,
  sources: [], openQuestions: [], cases, chapterOf: {},
} as unknown as LoadedVolume;

const suite = buildSuite(engine, vol, "deadbeef");

describe("buildSuite", () => {
  it("has 133 rule-test cases and 13 household cases", () => {
    expect(suite.cases.filter((c) => c.kind === "rule-test")).toHaveLength(133);
    expect(suite.cases.filter((c) => c.kind === "household")).toHaveLength(13);
  });

  it("carries the codex sha and volume id", () => {
    expect(suite.codex.sha).toBe("deadbeef");
    expect(suite.codex.volume).toBe("mwr");
    expect(typeof suite.codex.generated).toBe("string");
  });

  it("lists one item per ledger entry, carrying implemented/implemented_by", () => {
    expect(suite.items).toHaveLength(138);
    const age = suite.items.find((i) => i.identifier === "age")!;
    expect(age.implemented).toBe("assembly");
  });

  it("turns a rule test's `others` into a two-person case", () => {
    const c = suite.cases.find((x) => x.id === "WR-203-T1")!;
    expect(Object.keys(c.persons).sort()).toEqual(["p1", "p2"]);
    expect(c.persons.p1.relationships).toEqual([["parent", "p2"]]);
    expect(c.persons.p2.facts).toEqual({
      date_of_birth: "2015-01-01", relies_on_another_for_care: true, is_disabled_individual_ada: false,
    });
    expect(c.expect).toEqual([
      { person: "p1", identifier: "medicaid_is_parent_or_caretaker_of_dependent", month: null, value: true },
    ]);
  });

  it("routes a person-month given fact to that test's month, not a default", () => {
    const c = suite.cases.find((x) => x.id === "WR-214-T1")!;
    expect(c.persons.p1.months).toEqual({
      "2027-02": { is_enrolled_half_time_education: true, education_hours: 40 },
    });
    expect(c.persons.p1.month_defaults).toBeUndefined();
    expect(c.expect).toEqual([
      { person: "p1", identifier: "medicaid_countable_education_hours", month: "2027-02", value: 0 },
    ]);
  });

  it("routes a month-scope given fact to the case-wide month_facts, not any person", () => {
    const c = suite.cases.find((x) => x.id === "WR-221-T1")!;
    expect(c.month_facts).toEqual({ "2027-02": { national_unemployment_rate: 0.04 } });
    expect(c.persons.p1.facts?.national_unemployment_rate).toBeUndefined();
  });

  it("splits a month-defaults test's given month-keyed value from its default", () => {
    const c = suite.cases.find((x) => x.id === "WR-315-T1")!;
    expect(c.persons.p1.months).toEqual({
      "2026-11": { snap_is_countable_month: true },
      "2026-12": { snap_is_countable_month: true },
      "2027-02": { snap_is_countable_month: true },
    });
    expect(c.persons.p1.month_defaults).toEqual({ snap_is_countable_month: false });
  });

  it("passes household cases through, and every expectation matches its person/month shape", () => {
    const c = suite.cases.find((x) => x.id === "C-04")!;
    expect(c.kind).toBe("household");
    expect(c.persons).toEqual(cases.find((x) => x.id === "C-04")!.persons);
    const matches = c.expect.filter(
      (e) => e.person === "p1" && e.identifier === "snap_has_responsibility_for_child_under_14",
    );
    expect(matches.map((m) => m.month).sort()).toEqual(["2027-02", "2027-03"]);
  });

  it("has no stale expectations today (every value is the codex's current evaluation)", () => {
    expect(suite.notes).toEqual([]);
  });

  it("merges a rule test's own `persons` into the case after `others`", () => {
    // WR-203-T1 (in the ledger already) puts p2 in `others`; a synthetic
    // second test on the same item instead states p2 through `persons`
    // (which should win, same as makeCase) and adds a brand-new p3 the same
    // way.
    const wr203 = (ledger.items as unknown as Item[]).find((it) => it.id === "WR-203")!;
    const synthTest: TestSpec = {
      id: "SYNTH-T1",
      month: "2027-03",
      given: {},
      others: { p2: { date_of_birth: "1990-01-01" } },
      persons: {
        p2: { facts: { date_of_birth: "2015-01-01", relies_on_another_for_care: true } },
        p3: { facts: { is_disabled_individual_ada: false } },
      },
      expect: true,
    };
    const items = (ledger.items as unknown as Item[]).map((it) =>
      it.id === wr203.id ? { ...it, tests: [...(it.tests ?? []), synthTest] } : it);
    const synthEngine = createEngine(items, ledger.meta as unknown as VolumeMeta, refs);
    const synthVol = { ...vol, items, cases: [] } as unknown as LoadedVolume;
    const synthSuite = buildSuite(synthEngine, synthVol, "deadbeef");
    const c = synthSuite.cases.find((x) => x.id === "SYNTH-T1")!;
    // `persons.p2` overrode what `others` would have built for p2.
    expect(c.persons.p2.facts).toEqual({
      date_of_birth: "2015-01-01", relies_on_another_for_care: true,
    });
    expect(c.persons.p3.facts).toEqual({ is_disabled_individual_ada: false });
  });
});

describe("the codex-self adapter, called in-process", () => {
  it("evaluates 5 cases and matches the suite's own expectations exactly", () => {
    const sample = suite.cases.slice(0, 5);
    let checked = 0;
    let failed = 0;
    for (const c of sample) {
      const values = evaluateCase(c);
      for (const e of c.expect) {
        const v = values.find(
          (x) => x.person === e.person && x.identifier === e.identifier && x.month === e.month,
        );
        checked++;
        if (!v || JSON.stringify(v.value) !== JSON.stringify(e.value)) failed++;
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(failed).toBe(0);
  });

  it("reports a nonexistent identifier as unimplemented, via conform's own grading", () => {
    const real = suite.cases.find((c) => c.kind === "rule-test")!;
    const withBogus = {
      ...real,
      expect: [
        ...real.expect,
        { person: "p1", identifier: "nonexistent_identifier", month: null, value: true },
      ],
    };
    const values = evaluateCase(withBogus);
    // The bogus identifier throws inside evaluateCase and is omitted, not
    // reported as `value: null`.
    expect(values.some((v) => v.identifier === "nonexistent_identifier")).toBe(false);
    const graded = gradeCase(withBogus, values);
    expect(graded.unimplemented).toBe(1);
    expect(graded.failed).toBe(0);
  });
});
