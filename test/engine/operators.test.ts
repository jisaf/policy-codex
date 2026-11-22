/* Rule-level tests of every operator's unknown propagation, empty-group
 * behaviour and edge cases, as docs/operators.md states them. Each test
 * evaluates a one-off derived item over a small ledger of supplied facts;
 * an unstated supplied fact is unknown (null). */
import { describe, it, expect } from "vitest";
import { buildIndex } from "../../src/engine/ledger-index";
import {
  evaluate, makeCase, runTest, type EvalWarning, type TraceEvent,
} from "../../src/engine/evaluate";
import { explain } from "../../src/engine/explain";
import type { Expr, Item, Scope, TestSpec } from "../../src/engine/types";

function supplied(identifier: string, type: string, scope: Scope = "person"): Item {
  return {
    id: "S-" + identifier, name: identifier, identifier, kind: "supplied", type, scope,
    program: "All", meaning: "m", supplied_by: "test",
  };
}

const base: Item[] = [
  supplied("a", "yes/no"),
  supplied("b", "yes/no"),
  supplied("x", "money"),
  supplied("y", "money"),
  supplied("d", "calendar date"),
  supplied("w", "money", "person-month"),
  supplied("g", "group of persons"),
  {
    id: "S-tbl", name: "tbl", identifier: "tbl", kind: "parameter",
    type: "table keyed by household size", scope: "global", program: "All", meaning: "m",
    value: { "1": 100, "2": 200 },
  },
  {
    id: "S-ver", name: "ver", identifier: "ver", kind: "parameter", type: "money",
    scope: "global", program: "All", meaning: "m",
    versions: [{ from: "2026-01-01", to: "2027-01-01", value: 10 }, { from: "2027-01-01", value: 11 }],
  },
  {
    id: "S-opt", name: "opt", identifier: "opt", kind: "parameter",
    type: "table keyed by option", scope: "global", program: "All", meaning: "m",
    value: { house: 0.62, apartment: 0.43 },
  },
  supplied("dwelling", "one of"),
  {
    id: "S-bands", name: "bands", identifier: "bands", kind: "parameter",
    type: "table keyed by income band", scope: "global", program: "All", meaning: "m",
    value: { "0.75": 0, "1.25": 0.1, above: 0.3 },
  },
  {
    id: "S-closed", name: "closed", identifier: "closed", kind: "parameter",
    type: "table keyed by income band", scope: "global", program: "All", meaning: "m",
    value: { "1": 5, "2": 7 },
  },
  {
    id: "S-awaits", name: "awaits", identifier: "awaits", kind: "parameter", type: "money",
    scope: "global", program: "All", meaning: "m", versions: [], open: ["OQ-1"],
  },
];

/** Evaluates `derived` as a person (or person-month, with a month) item for
 *  p1 with `given` facts; `others` adds persons. */
function run(
  derived: Expr, given: Record<string, unknown> = {},
  opts: { month?: string; others?: TestSpec["others"]; asOf?: string; scope?: Scope } = {},
): unknown {
  const scope = opts.scope ?? (opts.month ? "person-month" : "person");
  const it: Item = {
    id: "T-1", name: "t", identifier: "t", kind: "derived", type: "money", scope,
    program: "All", meaning: "m", derived,
  };
  const ix = buildIndex([...base, it]);
  const c = makeCase(ix, { id: "T", as_of: opts.asOf ?? "2026-06-01", given, others: opts.others });
  return evaluate(ix, c, "t", scope === "global" ? null : "p1", opts.month ?? null);
}

const T = true, F = false, U = null;
/** given for a and b, where U leaves the fact unstated. */
const ab = (a: boolean | null, b: boolean | null) => {
  const g: Record<string, unknown> = {};
  if (a !== null) g.a = a;
  if (b !== null) g.b = b;
  return g;
};

describe("logic: three-valued (Kleene)", () => {
  const cases: Array<[boolean | null, boolean | null, boolean | null, boolean | null]> = [
    // a, b, all, any
    [T, T, T, T], [T, F, F, T], [T, U, U, T],
    [F, T, F, T], [F, F, F, F], [F, U, F, U],
    [U, T, U, T], [U, F, F, U], [U, U, U, U],
  ];
  for (const [a, b, all, any] of cases) {
    it(`all/any of ${a}, ${b}`, () => {
      expect(run(["all", "a", "b"], ab(a, b))).toBe(all);
      expect(run(["any", "a", "b"], ab(a, b))).toBe(any);
    });
  }
  it("not", () => {
    expect(run(["not", "a"], ab(T, U))).toBe(F);
    expect(run(["not", "a"], ab(F, U))).toBe(T);
    expect(run(["not", "a"], ab(U, U))).toBe(U);
  });
  it("otherwise supplies a default only for unknown, never for false", () => {
    expect(run(["otherwise", "a", true], ab(U, U))).toBe(T);
    expect(run(["otherwise", "a", true], ab(F, U))).toBe(F);
    expect(run(["otherwise", "x", 0], {})).toBe(0);
    expect(run(["otherwise", "a", "b"], ab(U, U))).toBe(U);
  });
  it("unknown is itself never unknown", () => {
    expect(run(["unknown", "a"], ab(U, U))).toBe(T);
    expect(run(["unknown", "a"], ab(F, U))).toBe(F);
  });
});

describe("comparison and arithmetic: unknown in, unknown out", () => {
  for (const op of ["<", "<=", ">", ">=", "="]) {
    it(`${op} is unknown when either side is`, () => {
      expect(run([op, "x", 1], {})).toBe(U);
      expect(run([op, 1, "x"], {})).toBe(U);
    });
  }
  it("= compares exactly; in tests membership of a literal list", () => {
    expect(run(["=", "x", 3], { x: 3 })).toBe(T);
    expect(run(["in", "x", [1, 2]], { x: 3 })).toBe(F);
    expect(run(["in", "x", [1, 2]], {})).toBe(U);
  });
  for (const op of ["+", "-", "*", "/", "min", "max"]) {
    it(`${op} is unknown when an operand is`, () => {
      expect(run([op, "x", "y"], { x: 4 })).toBe(U);
      expect(run([op, "x", "y"], { y: 4 })).toBe(U);
    });
  }
  it("folds + and * left to right in binary64", () => {
    expect(run(["+", 0.1, 0.2], {})).toBe(0.1 + 0.2);
    expect(run(["*", "x", 3], { x: 0.1 })).toBe(0.1 * 3);
  });
  it("division by zero is unknown, never NaN or Infinity", () => {
    expect(run(["/", "x", "y"], { x: 4, y: 0 })).toBe(U);
    expect(run(["/", "x", "y"], { x: 0, y: 0 })).toBe(U);
    expect(run(["/", "x", "y"], { x: 4, y: 2 })).toBe(2);
  });
  it("ceil and round carry a 1e-9 nudge; halves round up, negatives toward +infinity", () => {
    expect(run(["ceil", "x"], { x: 2.0000000001 })).toBe(2);
    expect(run(["ceil", "x"], { x: 2.01 })).toBe(3);
    expect(run(["round", "x"], { x: 2.5 })).toBe(3);
    expect(run(["round", "x"], { x: 2.4999999999 })).toBe(3);
    expect(run(["round", "x"], { x: -2.5 })).toBe(-2);
    expect(run(["round", "x"], {})).toBe(U);
    expect(run(["ceil", "x"], {})).toBe(U);
  });
});

describe("case: first match, and an unknown condition stops it", () => {
  const c: Expr = ["case", ["a", "first"], ["b", "second"], ["else", "third"]];
  it("returns the first arm whose condition is true", () => {
    expect(run(c, ab(T, T))).toBe("first");
    expect(run(c, ab(F, T))).toBe("second");
    expect(run(c, ab(F, F))).toBe("third");
  });
  it("is unknown at an unknown condition, even when a later arm would match", () => {
    expect(run(c, ab(U, T))).toBe(U);
    expect(run(c, ab(F, U))).toBe(U);
  });
  it("does not read a later condition once an earlier one is true", () => {
    expect(run(c, ab(T, U))).toBe("first");
  });
  it("is unknown when no arm matches and there is no else", () => {
    expect(run(["case", ["a", "first"]], ab(F, U))).toBe(U);
  });
});

describe("groups: unknown members and empty groups", () => {
  const others = { p2: { x: 5, a: true }, p3: { a: false } };
  const grp = ["persons"];
  it("persons lists the case's persons in declaration order", () => {
    expect(run(grp, {}, { others })).toEqual(["p1", "p2", "p3"]);
  });
  it("filter is unknown when any member's condition is", () => {
    expect(run(["filter", grp, ["of", ["P"], "a"]], { a: true }, { others })).toEqual(["p1", "p2"]);
    expect(run(["filter", grp, ["of", ["P"], "a"]], {}, { others })).toBe(U);
  });
  it("sum is unknown when any member's value is; count is the group's length", () => {
    expect(run(["sum", grp, ["of", ["P"], "x"]], { x: 1 }, { others: { p2: { x: 5 } } })).toBe(6);
    expect(run(["sum", grp, ["of", ["P"], "x"]], { x: 1 }, { others })).toBe(U);
    expect(run(["count", grp], {}, { others })).toBe(3);
  });
  it("exists is true at a true member, unknown if none is true and one is unknown", () => {
    expect(run(["exists", grp, ["of", ["P"], "a"]], {}, { others })).toBe(T);
    expect(run(["exists", grp, ["of", ["P"], "a"]], {}, { others: { p3: { a: false } } })).toBe(U);
    expect(run(["exists", grp, ["of", ["P"], "a"]], { a: false }, { others: { p3: { a: false } } })).toBe(F);
  });
  it("over an empty group: sum 0, count 0, exists false, filter empty", () => {
    const empty = { g: [] };
    expect(run(["sum", "g", ["of", ["P"], "x"]], empty)).toBe(0);
    expect(run(["count", "g"], empty)).toBe(0);
    expect(run(["exists", "g", ["of", ["P"], "a"]], empty)).toBe(F);
    expect(run(["filter", "g", ["of", ["P"], "a"]], empty)).toEqual([]);
  });
  it("an unknown group makes every group operator unknown", () => {
    for (const e of [
      ["sum", "g", 1], ["count", "g"], ["exists", "g", true], ["filter", "g", true],
      ["in_group", ["P"], "g"],
    ] as Expr[]) expect(run(e, {})).toBe(U);
  });
  it("of reads another person's fact; unknown target is unknown", () => {
    expect(run(["of", "p2", "x"], {}, { others })).toBe(5);
    expect(run(["of", "p3", "x"], {}, { others })).toBe(U);
  });
});

describe("months", () => {
  const months = ["months_ending", 3, "2026-05"];
  it("each, some_month, count_months, avg over known months", () => {
    const w = { w: { "2026-03": 1, "2026-04": 2, "2026-05": 3 } };
    expect(run(["each", months, [">", "w", 0]], w)).toBe(T);
    expect(run(["some_month", months, [">", "w", 2]], w)).toBe(T);
    expect(run(["count_months", months, [">", "w", 1]], w)).toBe(2);
    expect(run(["avg", "w", months], w)).toBe(2);
  });
  it("with one month unknown: each/some_month by Kleene logic, count and avg unknown", () => {
    const w = { w: { "2026-03": 1, "2026-05": 3 } };
    expect(run(["each", months, [">", "w", 2]], w)).toBe(F);
    expect(run(["each", months, [">", "w", 0]], w)).toBe(U);
    expect(run(["some_month", months, [">", "w", 2]], w)).toBe(T);
    expect(run(["some_month", months, [">", "w", 5]], w)).toBe(U);
    expect(run(["count_months", months, [">", "w", 0]], w)).toBe(U);
    expect(run(["avg", "w", months], w)).toBe(U);
  });
  it("over no months: each true, some_month false, count 0, avg unknown", () => {
    const none = ["months_from_to", "2026-05", "2026-04"];
    expect(run(["each", none, false], {})).toBe(T);
    expect(run(["some_month", none, true], {})).toBe(F);
    expect(run(["count_months", none, true], {})).toBe(0);
    expect(run(["avg", "w", none], {})).toBe(U);
  });
  it("at rebinds the month but not the determination date", () => {
    expect(run(["at", "w", "2026-02"], { w: { "2026-02": 7 } })).toBe(7);
    expect(run(["at", ["det_date"], "2025-02"], {}, { asOf: "2026-06-01" })).toBe("2026-06-01");
    expect(run(["at", "ver", "2027-06"], {}, { asOf: "2026-06-01" })).toBe(10);
  });
  it("month arithmetic", () => {
    expect(run(["month_after", "2026-12"], {})).toBe("2027-01");
    expect(run(["months_before", 13, "2026-01"], {})).toBe("2024-12");
    expect(run(["months_from_to", "2026-11", "2027-01"], {})).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(run(["first_day", "2026-02"], {})).toBe("2026-02-01");
    expect(run(["month_of", "d"], {})).toBe(U);
  });
});

describe("dates", () => {
  it("years_between counts a 29 February birthday on 1 March in a common year", () => {
    expect(run(["years_between", "d", "2027-02-28"], { d: "2008-02-29" })).toBe(18);
    expect(run(["years_between", "d", "2027-03-01"], { d: "2008-02-29" })).toBe(19);
    expect(run(["years_between", "d", "2028-02-29"], { d: "2008-02-29" })).toBe(20);
  });
  it("days_after and days_between count calendar days in UTC", () => {
    expect(run(["days_after", 10, "2026-02-25"], {})).toBe("2026-03-07");
    expect(run(["days_between", "2026-02-25", "2026-03-07"], {})).toBe(10);
    expect(run(["days_between", "d", "2026-03-07"], {})).toBe(U);
  });
  it("latest_month_of_year (P50): the most recent month with that number, on or before", () => {
    expect(run(["latest_month_of_year", 11, "2026-11"], {})).toBe("2026-11");
    expect(run(["latest_month_of_year", 11, "2026-10"], {})).toBe("2025-11");
    expect(run(["latest_month_of_year", 11, "2027-01"], {})).toBe("2026-11");
    expect(run(["latest_month_of_year", 7, "2026-07-31"], {})).toBe("2026-07");
    expect(run(["latest_month_of_year", 1, "2026-12"], {})).toBe("2026-01");
    expect(run(["latest_month_of_year", 8, "d"], {})).toBe(U);
  });
  it("year_of (P52) reads the calendar year of a month or a date", () => {
    expect(run(["year_of", "2026-11"], {})).toBe(2026);
    expect(run(["year_of", "2027-01-31"], {})).toBe(2027);
    expect(run(["year_of", ["month_of", "d"]], {})).toBe(U);
  });
  it("month_of_year reads the calendar month number, 1 to 12", () => {
    expect(run(["month_of_year", "2026-11"], {})).toBe(11);
    expect(run(["month_of_year", "2027-01"], {})).toBe(1);
    expect(run(["month_of_year", ["month_of", "d"]], {})).toBe(U);
  });
});

describe("parameters and tables", () => {
  it("a parameter version is chosen by the determination date; `to` is exclusive", () => {
    expect(run("ver", {}, { asOf: "2026-12-31" })).toBe(10);
    expect(run("ver", {}, { asOf: "2027-01-01" })).toBe(11);
  });
  it("lookup of a key with no row is unknown; a number key reads the string row", () => {
    expect(run(["lookup", "tbl", 2], {})).toBe(200);
    expect(run(["lookup", "tbl", 3], {})).toBe(U);
    expect(run(["lookup", "tbl", "x"], {})).toBe(U);
  });
  it("a table keyed by option is read by the option's string", () => {
    expect(run(["lookup", "opt", "dwelling"], { dwelling: "house" })).toBe(0.62);
    expect(run(["lookup", "opt", "dwelling"], { dwelling: "rv" })).toBe(U);
    expect(run(["lookup", "opt", "dwelling"], {})).toBe(U);
  });
  it("band (P48): an \"above\" row is the open top band; without one, past the last bound is unknown", () => {
    expect(run(["band", "bands", "x"], { x: 0.75 })).toBe(0);
    expect(run(["band", "bands", "x"], { x: 0.7501 })).toBe(0.1);
    expect(run(["band", "bands", "x"], { x: 1.25 })).toBe(0.1);
    expect(run(["band", "bands", "x"], { x: 9 })).toBe(0.3);
    expect(run(["band", "closed", "x"], { x: 2 })).toBe(7);
    expect(run(["band", "closed", "x"], { x: 2.5 })).toBe(U);
    expect(run(["band", "bands", "x"], {})).toBe(U);
  });
  it("lookup_extended (P51) reads the last row itself and adds the step beyond it", () => {
    expect(run(["lookup_extended", "tbl", "x", "y"], { x: 2, y: 30 })).toBe(200);
    expect(run(["lookup_extended", "tbl", "x", "y"], { x: 5, y: 30 })).toBe(290);
    expect(run(["lookup_extended", "tbl", "x"], { x: 5 })).toBe(200);
    expect(run(["lookup_extended", "tbl", "x"], { x: 1 })).toBe(100);
    expect(run(["lookup_extended", "tbl", "x", "y"], { x: 5 })).toBe(U);
    expect(run(["lookup_extended", "tbl", "x", "y"], { x: 2 })).toBe(200);
    expect(run(["lookup_extended", "tbl", "x", "y"], { y: 30 })).toBe(U);
    expect(run(["lookup_extended", "tbl", "x"], { x: 0 })).toBe(U);
  });
  it("as_of (P25) reads a parameter's version in force on another date", () => {
    expect(run(["as_of", "ver", "d"], { d: "2026-07-01" }, { asOf: "2027-03-01" })).toBe(10);
    expect(run(["as_of", "ver", "d"], { d: "2027-07-01" }, { asOf: "2026-03-01" })).toBe(11);
    expect(run(["as_of", "ver", "d"], { d: "2025-07-01" })).toBe(U);
    expect(run(["as_of", "ver", "d"], {})).toBe(U);
    expect(run(["as_of", "tbl", "d"], { d: "1999-01-01" })).toEqual({ "1": 100, "2": 200 });
  });
  it("a parameter awaiting its figure (empty versions) is unknown on every date", () => {
    expect(run("awaits", {})).toBe(U);
    expect(run(["as_of", "awaits", "d"], { d: "2026-07-01" })).toBe(U);
  });
});

describe("sum over months (P54)", () => {
  const months = ["2026-01", "2026-02", "2026-03"];
  it("adds a number for each month, with that month bound and the month unchanged", () => {
    const w = { w: { "2026-01": 1, "2026-02": 2, "2026-03": 4 } };
    expect(run(["sum_months", ["months_ending", 3, ["month"]], ["at", "w", ["that_month"]]], w, { month: "2026-03" })).toBe(7);
    // "the month" inside is still the month the item is evaluated for
    expect(run(["sum_months", ["months_ending", 3, ["month"]],
      ["case", [["=", ["that_month"], ["month"]], ["at", "w", ["that_month"]]], ["else", 0]]], w, { month: "2026-03" })).toBe(4);
  });
  it("is unknown when any month's value is unknown, and 0 over no months", () => {
    expect(run(["sum_months", ["months_ending", 3, ["month"]], ["at", "w", ["that_month"]]],
      { w: { "2026-01": 1, "2026-03": 4 } }, { month: "2026-03" })).toBe(U);
    expect(run(["sum_months", ["months_from_to", "2026-03", "2026-02"], 1], {}, { month: "2026-03" })).toBe(0);
    void months;
  });
  it("that month outside a sum over months is an error", () => {
    expect(() => run(["at", "w", ["that_month"]], {}, { month: "2026-03" })).toThrow();
  });
});

describe("a number that is not finite is unknown (never an answer)", () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    it(`a supplied ${bad}: comparisons and sums are unknown, not false or a number`, () => {
      expect(run([">", "x", 100], { x: bad })).toBe(U);
      expect(run(["<=", "x", 100], { x: bad })).toBe(U);
      expect(run(["+", "x", 1], { x: bad })).toBe(U);
      expect(run(["all", ["<=", "x", 100], "a"], { x: bad, a: true })).toBe(U);
      // a decided "all" still short-circuits on a known false
      expect(run(["all", "a", [">", "x", 100]], { x: bad, a: false })).toBe(F);
    });
  }
  it("arithmetic that overflows to Infinity is unknown", () => {
    expect(run(["*", "x", "y"], { x: 1e308, y: 10 })).toBe(U);
    expect(run(["<", ["*", "x", "y"], 0], { x: -1e308, y: 10 })).toBe(U);
  });
  it("is reported as a non-finite warning", () => {
    const it2: Item = {
      id: "T-1", name: "t", identifier: "t", kind: "derived", type: "money", scope: "person",
      program: "All", meaning: "m", derived: ["+", "x", 1],
    };
    const ix = buildIndex([...base, it2]);
    const out: EvalWarning[] = [];
    evaluate(ix, makeCase(ix, { id: "T", as_of: "2026-06-01", given: { x: NaN } }), "t", "p1", null, undefined, (w) => out.push(w));
    expect(out.map((w) => [w.kind, w.identifier])).toEqual([["non-finite", "x"]]);
  });
});

describe("silent unknowns are reported", () => {
  const items = (derived: Expr): Item[] => [...base, {
    id: "T-1", name: "t", identifier: "t", kind: "derived", type: "money", scope: "person",
    program: "All", meaning: "m", derived,
  }];
  function warningsOf(derived: Expr, given: Record<string, unknown>, asOf = "2026-06-01"): EvalWarning[] {
    const ix = buildIndex(items(derived));
    const out: EvalWarning[] = [];
    evaluate(ix, makeCase(ix, { id: "T", as_of: asOf, given }), "t", "p1", null, undefined, (w) => out.push(w));
    return out;
  }
  it("a lookup miss, against the derived fact whose rule hit it", () => {
    const ws = warningsOf(["lookup", "tbl", 9], {});
    expect(ws).toEqual([{
      kind: "lookup-miss", identifier: "t", person: "p1", month: null,
      detail: "no row for key 9 in tbl",
    }]);
  });
  it("a versioned parameter with no version in force", () => {
    const ws = warningsOf(["+", "ver", 1], {}, "2025-06-01");
    expect(ws.map((w) => [w.kind, w.identifier])).toEqual([["no-version", "ver"]]);
  });
  it("a parameter awaiting its figure, and as_of on a date no version covers", () => {
    expect(warningsOf(["+", "awaits", 1], {}).map((w) => [w.kind, w.identifier])).toEqual([["no-version", "awaits"]]);
    expect(warningsOf(["as_of", "ver", "d"], { d: "2025-07-01" }).map((w) => [w.kind, w.identifier, w.detail]))
      .toEqual([["no-version", "ver", "no version in force on 2025-07-01"]]);
  });
  it("lookup_extended below the last row with no row for the number", () => {
    expect(warningsOf(["lookup_extended", "tbl", 0], {}).map((w) => w.kind)).toEqual(["lookup-miss"]);
  });
  it("a division by zero", () => {
    expect(warningsOf(["/", "x", 0], { x: 1 }).map((w) => w.kind)).toEqual(["division-by-zero"]);
  });
  it("nothing for an unknown that has an unstated supplied fact behind it", () => {
    expect(warningsOf(["lookup", "tbl", "x"], {})).toEqual([]);
  });
  it("in the trace: the parameter's origin, and the derived fact's warnings", () => {
    const ix = buildIndex(items(["+", ["lookup", "tbl", 9], "ver"]));
    const events: TraceEvent[] = [];
    evaluate(ix, makeCase(ix, { id: "T", as_of: "2025-06-01" }), "t", "p1", null, (e) => events.push(e));
    expect(events.find((e) => e.identifier === "ver")?.origin).toBe("no-version");
    expect(events.find((e) => e.identifier === "t")?.warnings).toEqual(["lookup-miss: no row for key 9 in tbl"]);
    const node = explain(ix, makeCase(ix, { id: "T", as_of: "2025-06-01" }), "t", "p1", null);
    expect(node.warnings).toEqual(["lookup-miss: no row for key 9 in tbl"]);
  });
  it("in a rule test's result", () => {
    const its = items(["lookup", "tbl", 9]);
    const ix = buildIndex(its);
    const r = runTest(ix, its[its.length - 1], { id: "T-1-T1", expect: "unknown" });
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual(["lookup-miss: t p1: no row for key 9 in tbl"]);
  });
});
