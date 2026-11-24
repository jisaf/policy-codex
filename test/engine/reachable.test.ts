/* `reachable` with an edge condition is a fixed point: the persons reachable
 * over edges whose condition is true, unknown only when an edge whose
 * condition is unknown leaves that group. The answer does not depend on the
 * order relationships are listed in (the Drools review's B-2). */
import { describe, it, expect } from "vitest";
import { buildIndex } from "../../src/engine/ledger-index";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import type { Item, TestSpec } from "../../src/engine/types";

const age: Item = {
  id: "X-1", name: "Age", identifier: "x_age", kind: "supplied", type: "whole number",
  scope: "person", program: "All", meaning: "m", supplied_by: "test",
};

/** The shape of CO-305's closure: spouse and buys-and-prepares edges always
 *  cross; a parent edge crosses only into a child under 22 ("this person" is
 *  the person the walk has reached, "that person" the one across the edge). */
const household: Item = {
  id: "X-2", name: "Household", identifier: "x_household", kind: "derived",
  type: "group of persons", scope: "person", program: "All", meaning: "m",
  derived: ["reachable", ["spouse", "buys_prepares_with", "parent", "child"], ["any",
    ["rel", ["spouse"], ["P"]],
    ["rel", ["buys_prepares_with"], ["P"]],
    ["all", ["rel", ["parent"], ["P"]], ["<", ["of", ["P"], "x_age"], 22]],
    ["all", ["rel", ["child"], ["P"]], ["<", "x_age", 22]],
  ]],
};

const ix = buildIndex([age, household]);

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) =>
    permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
}

function household_of(
  facts: Record<string, Record<string, unknown>>,
  rels: Array<[string, string, string]>, who = "p1",
): unknown {
  const persons: NonNullable<TestSpec["persons"]> = {};
  for (const [pid, f] of Object.entries(facts)) persons[pid] = { facts: f, relationships: [] };
  const c = makeCase(ix, { id: "T", as_of: "2026-10-01", persons, relationships: rels });
  return evaluate(ix, c, "x_household", who, null);
}

describe("reachable with an edge condition", () => {
  // The Drools review's example: p3's age is unstated, so the p4 -> p3 parent
  // edge's condition is unknown; p3 is in the household anyway, through p2's
  // buys-and-prepares edge.
  const facts = { p1: { x_age: 40 }, p2: { x_age: 38 }, p3: {}, p4: { x_age: 50 } };
  const rels: Array<[string, string, string]> = [
    ["spouse", "p1", "p2"],
    ["buys_prepares_with", "p1", "p4"],
    ["buys_prepares_with", "p2", "p3"],
    ["parent", "p4", "p3"],
  ];

  it("gives the same group for every order of the relationships", () => {
    const answers = new Set(permutations(rels).map((r) => JSON.stringify(household_of(facts, r))));
    expect([...answers]).toEqual([JSON.stringify(["p1", "p2", "p3", "p4"])]);
  });

  it("gives the same group from every member, whatever the order", () => {
    for (const r of permutations(rels)) {
      for (const who of ["p2", "p3", "p4"]) {
        expect(household_of(facts, r, who)).toEqual(["p1", "p2", "p3", "p4"]);
      }
    }
  });

  it("is unknown when a person is reachable only through an unknown edge, in every order", () => {
    // p5 joins only through p4's parent edge, whose condition is unknown.
    const facts5 = { ...facts, p5: {} };
    const rels5: Array<[string, string, string]> = [...rels.slice(0, 3), ["parent", "p4", "p5"]];
    const answers = new Set(permutations(rels5).map((r) => JSON.stringify(household_of(facts5, r))));
    expect([...answers]).toEqual(["null"]);
  });

  it("leaves out a person joined only by a false edge, in every order", () => {
    const facts5 = { ...facts, p3: { x_age: 30 }, p5: { x_age: 30 } };
    const rels5: Array<[string, string, string]> = [...rels, ["parent", "p4", "p5"]];
    const answers = new Set(permutations(rels5).map((r) => JSON.stringify(household_of(facts5, r))));
    expect([...answers]).toEqual([JSON.stringify(["p1", "p2", "p3", "p4"])]);
  });

  it("is unknown when this person's relationships are unstated", () => {
    const c = makeCase(ix, { id: "T", as_of: "2026-10-01", persons: { p1: { facts: { x_age: 4 } } } });
    expect(evaluate(ix, c, "x_household", "p1", null)).toBeNull();
  });

  it("records no relationships on a person named only in a triple", () => {
    const c = makeCase(ix, {
      id: "T", as_of: "2026-10-01",
      persons: { p1: { facts: { x_age: 40 }, relationships: [] } },
      relationships: [["spouse", "p1", "p9"]],
    });
    expect(c.rels.p1).toEqual([["spouse", "p9"]]);
    expect("p9" in c.rels).toBe(false);
    expect(evaluate(ix, c, "x_household", "p1", null)).toEqual(["p1"]);
  });
});
