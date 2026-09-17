import { describe, it, expect } from "vitest";
import { buildIndex } from "../../src/engine/ledger-index";
import { INVERSE_ROLE, evaluate, makeCase } from "../../src/engine/evaluate";
import { caseToSpec, runCase, type HouseholdCase } from "../../src/engine/cases";
import type { Item, TestSpec } from "../../src/engine/types";

const age: Item = {
  id: "X-1",
  name: "Age",
  identifier: "x_age",
  kind: "supplied",
  type: "whole number",
  scope: "person",
  program: "All",
  meaning: "The person's age in whole years at the determination date.",
  supplied_by: "Test harness",
};

/** Reads the household graph the way the codex states relationships: an
 *  entry `[role, other]` says this person is the role of that person, so a
 *  rule about grandparents looks through the `grandchild` entries. */
const hasElderGrandparent: Item = {
  id: "X-2",
  name: "Has a grandparent of 65 or over",
  identifier: "x_has_grandparent_65_or_over",
  kind: "derived",
  type: "yes/no",
  scope: "person",
  program: "All",
  meaning: "Whether the person is the grandchild of someone aged 65 or over.",
  derived: ["exists_related", ["grandchild"], [">=", ["of", ["P"], "x_age"], 65]],
  sources: ["S1"],
  implemented: "engine",
};

const ix = buildIndex([age, hasElderGrandparent]);

/** Three generations: p1 is p2's parent, p2 is p3's parent, and the case
 *  states the grandparent edge itself. */
const spec: TestSpec & { as_of: string } = {
  id: "T",
  as_of: "2027-03-15",
  persons: {
    p1: { facts: { x_age: 70 } },
    p2: { facts: { x_age: 40 } },
    p3: { facts: { x_age: 4 } },
  },
  relationships: [
    ["parent", "p1", "p2"],
    ["parent", "p2", "p3"],
    ["grandparent", "p1", "p3"],
  ],
};

describe("case-level relationships", () => {
  it("expands each edge into both persons' lists with the inverse role", () => {
    const c = makeCase(ix, spec);
    expect(c.rels.p1).toEqual([["parent", "p2"], ["grandparent", "p3"]]);
    expect(c.rels.p2).toEqual([["child", "p1"], ["parent", "p3"]]);
    expect(c.rels.p3).toEqual([["child", "p2"], ["grandchild", "p1"]]);
  });

  it("declares an inverse for every household role the volume uses", () => {
    expect(INVERSE_ROLE.parent).toBe("child");
    expect(INVERSE_ROLE.child).toBe("parent");
    expect(INVERSE_ROLE.spouse).toBe("spouse");
    expect(INVERSE_ROLE.grandparent).toBe("grandchild");
    expect(INVERSE_ROLE.grandchild).toBe("grandparent");
    expect(INVERSE_ROLE.caretaker).toBe("dependent");
    expect(INVERSE_ROLE.dependent).toBe("caretaker");
    expect(INVERSE_ROLE.tax_filer).toBe("tax_dependent");
    expect(INVERSE_ROLE.tax_dependent).toBe("tax_filer");
    expect(INVERSE_ROLE.buys_prepares_with).toBe("buys_prepares_with");
  });

  it("evaluates a rule that looks through an expanded relationship", () => {
    const c = makeCase(ix, spec);
    // p3 holds the inverse edge the case never stated.
    expect(evaluate(ix, c, "x_has_grandparent_65_or_over", "p3", null)).toBe(true);
    expect(evaluate(ix, c, "x_has_grandparent_65_or_over", "p2", null)).toBe(false);
    expect(evaluate(ix, c, "x_has_grandparent_65_or_over", "p1", null)).toBe(false);
  });

  it("keeps the per-person pairs a spec states directly", () => {
    const c = makeCase(ix, {
      id: "T", as_of: "2027-03-15",
      given: { x_age: 4 },
      relationships: [["grandchild", "p2"]],
      persons: { p2: { facts: { x_age: 70 } } },
    });
    expect(c.rels.p1).toEqual([["grandchild", "p2"]]);
    // p2 was never given relationships of its own, so its own are unknown.
    expect(c.rels.p2).toBe(null);
    expect(evaluate(ix, c, "x_has_grandparent_65_or_over", "p1", null)).toBe(true);
    expect(evaluate(ix, c, "x_has_grandparent_65_or_over", "p2", null)).toBe(null);
  });

  it("mixes case-level edges with a person's own pairs, without duplicating", () => {
    const c = makeCase(ix, {
      id: "T", as_of: "2027-03-15",
      given: { x_age: 4 },
      relationships: [["grandchild", "p2"], ["grandparent", "p2", "p1"]],
      persons: { p2: { facts: { x_age: 70 } } },
    });
    expect(c.rels.p1).toEqual([["grandchild", "p2"]]);
    expect(c.rels.p2).toEqual([["grandparent", "p1"]]);
  });

  it("records a role with no declared inverse in one direction only", () => {
    const c = makeCase(ix, {
      id: "T", as_of: "2027-03-15",
      persons: { p1: {}, p2: {} },
      relationships: [["landlord", "p1", "p2"]],
    });
    expect(c.rels.p1).toEqual([["landlord", "p2"]]);
    // Nothing was stated about p2, so its own relationships stay unknown.
    expect(c.rels.p2).toBe(null);
  });

  it("carries case-level relationships from a household case", () => {
    const hc: HouseholdCase = {
      id: "C-90",
      title: "Three generations",
      as_of: "2027-03-15",
      persons: {
        p1: { facts: { x_age: 70 } },
        p2: { facts: { x_age: 40 } },
        p3: { facts: { x_age: 4 } },
      },
      relationships: [["grandparent", "p1", "p3"]],
      expect: { p3: { x_has_grandparent_65_or_over: true } },
    };
    expect(caseToSpec(hc).relationships).toEqual([["grandparent", "p1", "p3"]]);
    const report = runCase(ix, hc);
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(1);
  });
});
