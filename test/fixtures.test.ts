import { describe, it, expect } from "vitest";
import ledger from "./fixtures/ledger.json";
import refs from "./fixtures/refs.json";
import derivations from "./fixtures/derivations.json";
import itemBlocks from "./fixtures/item-blocks.json";
import ruleTests from "./fixtures/rule-tests.json";
import checks from "./fixtures/checks.json";
import constraints from "./fixtures/constraints.json";

describe("engine fixtures", () => {
  it("has the whole ledger", () => {
    expect(ledger.items).toHaveLength(138);
    expect(ledger.meta.volume).toBe("work-requirements");
    expect(ledger.meta.scopes).toEqual(["person", "person-month", "case", "month", "global"]);
  });

  it("has 33 sources and 23 open questions", () => {
    expect(refs.sourceIds).toHaveLength(33);
    expect(refs.sourceIds).toContain("S34");
    expect(refs.sourceIds).not.toContain("S19");
    expect(refs.questionIds).toHaveLength(23);
  });

  it("has one derivation fixture per derived item", () => {
    expect(derivations).toHaveLength(53);
    const age = derivations.find((d) => d.identifier === "age");
    expect(age?.english).toBe(
      "the number of whole years between Date of Birth and the Determination Date",
    );
    expect(age?.compact).toBe("years_between(date_of_birth, det_date)");
  });

  it("has one item block per item and 133 rule tests, all passing today", () => {
    expect(itemBlocks).toHaveLength(138);
    expect(ruleTests).toHaveLength(133);
    expect(ruleTests.every((t) => t.ok)).toBe(true);
  });

  it("pins the four known type-check failures", () => {
    expect(checks).toHaveLength(53);
    const failing = checks.filter((c) => c.errors.length > 0).map((c) => c.id);
    expect(failing).toEqual(["WR-207", "WR-225", "WR-228", "WR-315"]);
  });

  it("pins the six known constraint failures", () => {
    expect(constraints).toHaveLength(138);
    const failing = constraints
      .filter((c) => c.report.some((r) => !r.ok && r.level === "error"))
      .map((c) => c.id);
    expect(failing.sort()).toEqual(
      ["WR-003", "WR-004", "WR-207", "WR-225", "WR-228", "WR-315"].sort(),
    );
  });
});
