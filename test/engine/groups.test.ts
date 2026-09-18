import { describe, it, expect } from "vitest";
import { buildIndex } from "../../src/engine/ledger-index";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { parseDerivation, parseInline } from "../../src/engine/parse";
import { block, compact, inline } from "../../src/engine/render";
import { check } from "../../src/engine/check";
import type { Item } from "../../src/engine/types";

// A small ledger exercising the group patterns added for the Colorado SNAP
// chapter: every person in the case, filtering a group, summing and counting
// over it, the relationship closure, and the arithmetic helpers.
const items: Item[] = [
  { id: "G-1", name: "Date of Birth", identifier: "date_of_birth", kind: "supplied", type: "calendar date", scope: "person", program: "All", supplied_by: "x" },
  { id: "G-2", name: "In institution", identifier: "in_institution", kind: "supplied", type: "yes/no", scope: "person", program: "All", supplied_by: "x" },
  { id: "G-3", name: "Earned income", identifier: "earned_income", kind: "supplied", type: "money", scope: "person-month", program: "All", supplied_by: "x" },
  { id: "G-4", name: "Unit", identifier: "unit", kind: "derived", type: "group of persons", scope: "person", program: "All",
    derived: ["filter", ["reachable", ["buys_prepares_with"]], ["not", ["of", ["P"], "in_institution"]]], implemented: "engine" },
  { id: "G-5", name: "Unit size", identifier: "unit_size", kind: "derived", type: "whole number", scope: "person", program: "All",
    derived: ["count", "unit"], implemented: "engine" },
  { id: "G-6", name: "Unit income", identifier: "unit_income", kind: "derived", type: "money", scope: "person-month", program: "All",
    derived: ["sum", "unit", ["of", ["P"], "earned_income"]], implemented: "engine" },
  { id: "G-7", name: "Allotment table", identifier: "allotment_table", kind: "parameter", type: "table keyed by household size", scope: "global", program: "All",
    value: { "1": 298, "2": 546, "3": 785 } },
  { id: "G-8", name: "Allotment", identifier: "allotment", kind: "derived", type: "money", scope: "person-month", program: "All",
    derived: ["max", 0, ["-", ["lookup", "allotment_table", "unit_size"], ["ceil", ["*", "unit_income", 0.3]]]], implemented: "engine" },
  { id: "G-9", name: "Everyone", identifier: "everyone", kind: "derived", type: "group of persons", scope: "person", program: "All",
    derived: ["persons"], implemented: "engine" },
  { id: "G-10", name: "Age", identifier: "age", kind: "derived", type: "whole number", scope: "person", program: "All",
    derived: ["years_between", "date_of_birth", ["det_date"]], implemented: "engine" },
  // Joined by purchase-and-prepare, or by a parent/child edge when the child is under 22.
  { id: "G-11", name: "Mandatory unit", identifier: "mandatory_unit", kind: "derived", type: "group of persons", scope: "person", program: "All",
    derived: ["reachable", ["buys_prepares_with", "parent", "child"], ["any",
      ["rel", ["buys_prepares_with"], ["P"]],
      ["all", ["rel", ["parent"], ["P"]], ["<", ["of", ["P"], "age"], 22]],
      ["all", ["rel", ["child"], ["P"]], ["<", "age", 22]]]], implemented: "engine" },
];
const ix = buildIndex(items);

const spec = {
  id: "T",
  as_of: "2026-10-01",
  relationships: [
    ["buys_prepares_with", "p1", "p2"], ["buys_prepares_with", "p2", "p3"], ["spouse", "p3", "p4"],
  ] as Array<[string, string, string]>,
  persons: {
    p1: { facts: { in_institution: true }, month_defaults: { earned_income: 1000 } },
    p2: { facts: { in_institution: false }, month_defaults: { earned_income: 200 } },
    p3: { facts: { in_institution: false }, month_defaults: { earned_income: 100.5 } },
    p4: { facts: { in_institution: false }, month_defaults: { earned_income: 5000 } },
  },
};

describe("group patterns", () => {
  const c = makeCase(ix, spec);
  it("lists every person in the case", () => {
    expect(evaluate(ix, c, "everyone", "p4", null)).toEqual(["p1", "p2", "p3", "p4"]);
  });
  it("closes over the named relationships and filters the group", () => {
    expect(evaluate(ix, c, "unit", "p2", null)).toEqual(["p2", "p3"]);
    expect(evaluate(ix, c, "unit", "p4", null)).toEqual(["p4"]);
    expect(evaluate(ix, c, "unit_size", "p1", null)).toBe(2);
  });
  it("sums a per-month fact over the group and rounds", () => {
    expect(evaluate(ix, c, "unit_income", "p2", "2026-10")).toBe(300.5);
    // 546 - ceil(90.15) = 546 - 91
    expect(evaluate(ix, c, "allotment", "p2", "2026-10")).toBe(455);
  });
  it("is unknown when a member's fact is unknown", () => {
    const c2 = makeCase(ix, { ...spec, persons: { ...spec.persons, p3: { facts: {}, month_defaults: {} } } });
    expect(evaluate(ix, c2, "unit", "p2", null)).toBeNull();
  });
  it("is unknown when the person's relationships are unstated", () => {
    const c3 = makeCase(ix, { id: "U", as_of: "2026-10-01", persons: { p1: { facts: { in_institution: false } } } });
    expect(evaluate(ix, c3, "unit", "p1", null)).toBeNull();
  });
  it("crosses an edge only when the condition holds on it", () => {
    const c5 = makeCase(ix, {
      id: "M", as_of: "2026-10-01",
      relationships: [["parent", "p1", "p2"], ["parent", "p1", "p3"], ["buys_prepares_with", "p3", "p4"]] as Array<[string, string, string]>,
      persons: {
        p1: { facts: { date_of_birth: "1980-01-01" } },
        p2: { facts: { date_of_birth: "2010-01-01" } },
        p3: { facts: { date_of_birth: "2000-01-01" } },
        p4: { facts: { date_of_birth: "1999-01-01" } },
      },
    });
    // p3 is 26: the parent edge to p3 is not crossed, so p4 is not reached either.
    expect(evaluate(ix, c5, "mandatory_unit", "p1", null)).toEqual(["p1", "p2"]);
    expect(evaluate(ix, c5, "mandatory_unit", "p2", null)).toEqual(["p1", "p2"]);
    expect(evaluate(ix, c5, "mandatory_unit", "p3", null)).toEqual(["p3", "p4"]);
    const text = [
      "the persons joined to this person by buys_prepares_with or parent such that",
      "  any of the following is true:",
      "    - this person is a buys_prepares_with of that person",
      "    - that person's Age is less than 22",
    ].join("\n");
    const e = parseDerivation(ix, text);
    expect(block(ix, e).join("\n")).toBe(text);
    expect(inline(ix, parseInline(ix, "the persons joined to this person by spouse such that that person's Age is at least 18")))
      .toBe("the persons joined to this person by spouse such that that person's Age is at least 18");
  });
  it("finds the persons who share a parent", () => {
    const c6 = makeCase(ix, {
      id: "S", as_of: "2026-10-01",
      relationships: [["parent", "p1", "p2"], ["parent", "p1", "p3"], ["parent", "p4", "p3"]] as Array<[string, string, string]>,
      persons: { p1: { facts: {} }, p2: { facts: {} }, p3: { facts: {} }, p4: { facts: {} } },
    });
    const sib = buildIndex([...items, { id: "G-12", name: "Siblings", identifier: "siblings", kind: "derived", type: "group of persons", scope: "person", program: "All", derived: ["shared_relative", "parent"], implemented: "engine" }]);
    expect(evaluate(sib, c6, "siblings", "p2", null)).toEqual(["p3"]);
    expect(evaluate(sib, c6, "siblings", "p3", null)).toEqual(["p2"]);
    expect(evaluate(sib, c6, "siblings", "p1", null)).toEqual([]);
    expect(inline(sib, parseInline(sib, "the persons who share a parent with this person"))).toBe("the persons who share a parent with this person");
  });
  it("adds and subtracts months", () => {
    const c7 = makeCase(ix, { id: "M", as_of: "2026-10-01", persons: { p1: { facts: {} } } });
    const mx = buildIndex([...items, { id: "G-13", name: "Later", identifier: "later", kind: "derived", type: "month", scope: "person", program: "All", derived: ["months_after", 12, ["det_month"]], implemented: "engine" }, { id: "G-14", name: "Earlier", identifier: "earlier", kind: "derived", type: "month", scope: "person", program: "All", derived: ["months_before", 3, ["det_month"]], implemented: "engine" }]);
    expect(evaluate(mx, c7, "later", "p1", null)).toBe("2027-10");
    expect(evaluate(mx, c7, "earlier", "p1", null)).toBe("2026-07");
    expect(inline(mx, parseInline(mx, "3 months before the month containing the Determination Date"))).toBe("3 months before the month containing the Determination Date");
  });
  it("rounds half up and up", () => {
    const c4 = makeCase(ix, spec);
    expect(evaluate(ix, c4, "allotment", "p4", "2026-10")).toBe(0);
  });
});

describe("group pattern text", () => {
  it("round-trips the inline forms", () => {
    for (const text of [
      "the greater of 0 and 1",
      "Unit income times 0.3 rounded up to the next whole dollar",
      "Unit income rounded to the nearest whole dollar",
      "the number of persons in Unit",
      "the persons joined to this person by buys_prepares_with or spouse",
      "all persons in every person in the case such that that person's In institution",
      "the sum of that person's Earned income for each person in Unit",
      "Allotment table, for Unit size",
    ]) {
      const e = parseInline(ix, text);
      expect(inline(ix, e)).toBe(text.replace("Allotment table", "Allotment table (table)"));
    }
  });
  it("round-trips the block forms", () => {
    const text = [
      "all persons in the persons joined to this person by buys_prepares_with such that",
      "  all of the following are true:",
      "    - it is not the case that that person's In institution",
      "    - that person's Date of Birth is at least 2000-01-01",
    ].join("\n");
    const e = parseDerivation(ix, text);
    expect(block(ix, e).join("\n")).toBe(text);
    expect(compact(ix, e)).toContain("filter(reachable([\"buys_prepares_with\"])");
  });
  it("type-checks group patterns", () => {
    const r = check(ix, ["count", ["filter", ["persons"], ["of", ["P"], "in_institution"]]], "person");
    expect(r.errors).toEqual([]);
    expect(r.type).toBe("number");
    const bad = check(ix, ["sum", "date_of_birth", 1], "person");
    expect(bad.errors.length).toBeGreaterThan(0);
  });
});
