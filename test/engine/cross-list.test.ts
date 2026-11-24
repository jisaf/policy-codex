/* Cross-list records round (docs/reviews/cross-list-records.md; docs/operators.md
 * "P59" and "P60"):
 * - P59 `greatest`, the greatest value over the members of a group, each bound
 *   as that person (as `sum` binds it): 7 CFR 273.8(e)(2) and 10 CCR 2506-1
 *   4.410.D.4 exclude "one funeral agreement per household member", so for a
 *   member the household excludes the largest agreement any member holds for
 *   that member, which is the greatest, over the holders, of each holder's
 *   largest (P58) agreement for the member;
 * - P60 `owner`, the person whose list a record is on, and a fact of that
 *   person read inside a record sum as ["of", ["owner"], fact]: 9 CCR 2503-5
 *   3.520.76.D.3 and E divide "the uncompensated value for each resource
 *   transferred" by the client's own grant standard, and A.3 counts a transfer
 *   made "within thirty-six (36) months prior to the application date", the
 *   client's own;
 * - the reading of a record that names the person evaluated, on another
 *   person's list (["in_group", ["receipt", "for_person"], ["reachable",
 *   ["spouse"], false]]: the person alone), which 20 CFR 416.1123(e)(2) needs
 *   and no new operator. */
import { describe, it, expect } from "vitest";
import { buildIndex } from "../../src/engine/ledger-index";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { check } from "../../src/engine/check";
import { block, inline } from "../../src/engine/render";
import { parseDerivation, parseInline } from "../../src/engine/parse";
import { RESERVED } from "../../src/engine/governance";
import type { Expr, Item } from "../../src/engine/types";

const KINDS = ["prepaid_burial_contract", "other_resource", "veterans_benefit"];
const holdings: Item = {
  id: "X-1", name: "Holdings", identifier: "holdings", kind: "supplied", type: "list of receipts",
  scope: "person", program: "All", meaning: "Everything of value the person owns or gave away.", supplied_by: "test",
  record_noun: "holding",
  record_fields: {
    kind: { type: "one of", required: true, options: KINDS, meaning: "What the holding is.", option_meanings: Object.fromEntries(KINDS.map((k) => [k, `A holding of kind ${k}.`])) },
    value: { type: "money", required: true, meaning: "The fair market value of the whole holding." },
    for_person: { type: "person", when_absent: "for no person of the case", meaning: "The person of the case the holding is for." },
    disposed_date: { type: "calendar date", when_absent: "still held", meaning: "The day the holding was given away." },
  },
};
const receipts: Item = {
  id: "X-2", name: "Receipts", identifier: "receipts", kind: "supplied", type: "list of receipts",
  scope: "person", program: "All", meaning: "Money the person receives.", supplied_by: "test",
  record_fields: {
    kind: { type: "one of", required: true, options: KINDS, meaning: "What the receipt is.", option_meanings: Object.fromEntries(KINDS.map((k) => [k, `A receipt of kind ${k}.`])) },
    amount: { type: "money", required: true, meaning: "The amount." },
    for_dependent: { type: "money", default: 0, meaning: "The part paid because of a dependent." },
    for_person: { type: "person", when_absent: "for no person of the case", meaning: "The person of the case that part is for." },
  },
};
const fact = (identifier: string, type: string): Item => ({
  id: "F-" + identifier, name: identifier.replace(/_/g, " "), identifier, kind: "supplied", type, scope: "person",
  program: "All", meaning: `The person's ${identifier.replace(/_/g, " ")}.`, supplied_by: "test",
});
const divisor = fact("penalty_divisor", "money");
const appDate = fact("application_date", "calendar date");
const members = fact("members", "group of persons");

function derived(identifier: string, e: Expr, type = "money"): Item {
  return {
    id: "D-" + identifier, name: identifier, identifier, kind: "derived", type, scope: "person-month",
    program: "All", meaning: "A derived amount for the test.", derived: e, implemented: "engine", sources: ["S1"],
  };
}
const base = [holdings, receipts, divisor, appDate, members];
const ix = (extra: Item[] = []) => buildIndex([...base, ...extra]);
function run(e: Expr, persons: Record<string, Record<string, unknown>>, who = "p1", rels?: unknown[]): unknown {
  const i = ix([derived("t", e)]);
  const c = makeCase(i, {
    id: "T", as_of: "2026-11-15",
    persons: Object.fromEntries(Object.entries(persons).map(([k, f]) => [k, { facts: f }])),
    ...(rels ? { relationships: rels } : {}),
  } as never);
  return evaluate(i, c, "t", who, "2026-11");
}

const agreement = (value: number, forPerson?: string) => ({ kind: "prepaid_burial_contract", value, ...(forPerson ? { for_person: forPerson } : {}) });
/** P58 inside P59: the largest agreement on that person's list for this person (the person alone: no edge crossed). */
const holdersLargestForMe: Expr = ["greatest", "members",
  ["largest", ["of", ["P"], "holdings"],
    ["all", ["=", ["receipt", "kind"], "prepaid_burial_contract"], ["not", ["unknown", ["receipt", "for_person"]]],
      ["in_group", ["receipt", "for_person"], ["reachable", ["spouse"], false]]],
    ["receipt", "value"]]];

describe("greatest (P59)", () => {
  const g: Expr = ["greatest", "members", ["of", ["P"], "penalty_divisor"]];

  it("is the greatest value over the group's members, 0 for an empty group", () => {
    const ps = { p1: { members: ["p1", "p2", "p3"], penalty_divisor: 5 }, p2: { penalty_divisor: 9 }, p3: { penalty_divisor: -2 } };
    expect(run(g, ps)).toBe(9);
    expect(run(g, { ...ps, p1: { ...ps.p1, members: [] } })).toBe(0);
    // Every value negative: the true greatest, as P58.
    expect(run(g, { p1: { members: ["p2", "p3"] }, p2: { penalty_divisor: -7 }, p3: { penalty_divisor: -2 } })).toBe(-2);
  });

  it("is unknown when the group is unknown or any member's value is unknown", () => {
    expect(run(g, { p1: { penalty_divisor: 5 } })).toBeNull();
    expect(run(g, { p1: { members: ["p1", "p2"], penalty_divisor: 5 }, p2: {} })).toBeNull();
  });

  it("binds that person and leaves this person alone: one agreement per member across the holders' lists", () => {
    // p3 is the member; p1 holds $1,500 for p3, p2 holds $2,000 for p3 and $900 for p1. For p3: the greatest is 2,000.
    const ps = {
      p1: { members: ["p1", "p2", "p3"], holdings: [agreement(1500, "p3")] },
      p2: { holdings: [agreement(2000, "p3"), agreement(900, "p1")] },
      p3: { members: ["p1", "p2", "p3"], holdings: [] },
    };
    const rels = [["parent", "p1", "p3"], ["parent", "p2", "p3"]];
    expect(run(holdersLargestForMe, ps, "p3", rels)).toBe(2000);
    expect(run(holdersLargestForMe, ps, "p1", rels)).toBe(900);
  });

  it("is typed as a number over a group, renders and reads back inline and as a block", () => {
    const i = ix([derived("t", holdersLargestForMe)]);
    const r = check(i, holdersLargestForMe, "person-month");
    expect(r.errors).toEqual([]);
    expect(r.type).toBe("number");
    expect(check(i, ["greatest", "penalty_divisor", 1], "person-month").errors.join(" ")).toMatch(/for each person in/);
    const simple: Expr = ["greatest", "members", ["of", ["P"], "penalty_divisor"]];
    const s = inline(i, simple);
    expect(s).toBe("the greatest of that person's penalty divisor for each person in members");
    expect(parseInline(i, s)).toEqual(simple);
    expect(parseDerivation(i, block(i, holdersLargestForMe).join("\n"))).toEqual(holdersLargestForMe);
    const withBlock: Expr = ["greatest", "members", ["case", [["=", ["of", ["P"], "penalty_divisor"], 0], 0], ["else", ["of", ["P"], "penalty_divisor"]]]];
    const lines = block(i, withBlock);
    expect(lines[0]).toBe("the greatest for each person in members of");
    expect(parseDerivation(i, lines.join("\n"))).toEqual(withBlock);
    expect(RESERVED.has("greatest")).toBe(true);
  });
});

describe("that receipt's owner (P60)", () => {
  const transfer = (value: number, date: string) => ({ kind: "other_resource", value, disposed_date: date });
  /** Each transfer of the month on or after the owner's application day, divided by the owner's divisor and rounded down. */
  const months: Expr = ["sum_receipts", "holdings",
    ["all", ["not", ["unknown", ["receipt", "disposed_date"]]], ["=", ["month_of", ["receipt", "disposed_date"]], ["month"]],
      [">=", ["days_between", ["first_day", ["month"]], ["receipt", "disposed_date"]],
        ["days_between", ["first_day", ["month_of", ["of", ["owner"], "application_date"]]], ["of", ["owner"], "application_date"]]]],
    ["-", 0, ["ceil", ["-", 0, ["/", ["receipt", "value"], ["of", ["owner"], "penalty_divisor"]]]]]];

  it("reads the owner's facts inside the sum: each record rounded down on its own", () => {
    // 3,000 / 1,032 = 2.9 and 2,200 / 1,032 = 2.1: 2 + 2 = 4 (the month's total, 5,200 / 1,032, would give 5).
    const p1 = { penalty_divisor: 1032, application_date: "2029-11-01", holdings: [transfer(3000, "2026-11-03"), transfer(2200, "2026-11-20")] };
    expect(run(months, { p1 })).toBe(4);
    // An application on the 15th: only the transfer on the 20th is on or after its day of the month: 2.
    expect(run(months, { p1: { ...p1, application_date: "2029-11-15" } })).toBe(2);
  });

  it("is the person whose list it is: that person's for a list read through of", () => {
    const owner: Expr = ["sum", ["persons"], ["sum_receipts", ["of", ["P"], "holdings"], ["=", ["of", ["owner"], "penalty_divisor"], 2], ["receipt", "value"]]];
    expect(run(owner, { p1: { penalty_divisor: 1, holdings: [transfer(10, "2026-11-03")] }, p2: { penalty_divisor: 2, holdings: [transfer(7, "2026-11-03")] } })).toBe(7);
  });

  it("is unknown where the owner's fact is unknown, read only for a record whose condition reaches it", () => {
    expect(run(months, { p1: { penalty_divisor: 1032, holdings: [transfer(3000, "2026-11-03")] } })).toBeNull();
    expect(run(months, { p1: { penalty_divisor: 1032, holdings: [transfer(3000, "2026-10-03")] } })).toBe(0);
  });

  it("is an error outside a record sum; inside one, another person's fact is still refused", () => {
    const i = ix([derived("t", months)]);
    expect(check(i, months, "person-month").errors).toEqual([]);
    expect(check(i, ["of", ["owner"], "penalty_divisor"], "person-month").errors.join(" ")).toMatch(/outside/);
    const bare: Expr = ["sum_receipts", "holdings", ["=", "penalty_divisor", 2], 1];
    expect(check(i, bare, "person-month").errors.join(" ")).toMatch(/is a fact of a person/);
    const viaP: Expr = ["sum", ["persons"], ["sum_receipts", "holdings", ["=", ["of", ["P"], "penalty_divisor"], 2], 1]];
    expect(check(i, viaP, "person-month").errors.join(" ")).toMatch(/only that receipt's owner's facts/);
    expect(() => run(["of", ["owner"], "penalty_divisor"], { p1: { penalty_divisor: 1 } })).toThrow(/outside/);
  });

  it("renders as that holding's owner and reads back, with a per-month fact read in another month", () => {
    const i = ix([derived("t", months)]);
    const s = inline(i, months);
    expect(s).toContain("that holding's owner's penalty divisor");
    expect(parseDerivation(i, block(i, months).join("\n"))).toEqual(months);
    const atMonth: Expr = ["sum_receipts", "holdings", true, ["at", ["of", ["owner"], "t"], ["det_month"]]];
    expect(parseInline(i, inline(i, atMonth))).toEqual(atMonth);
    expect(RESERVED.has("owner")).toBe(true);
  });
});

describe("a record on another person's list that names the person evaluated (416.1123(e)(2); no new operator)", () => {
  const va = (amount: number, dep: number, forPerson?: string) => ({ kind: "veterans_benefit", amount, for_dependent: dep, ...(forPerson ? { for_person: forPerson } : {}) });
  const namesMe: Expr = ["sum", ["persons"], ["sum_receipts", ["of", ["P"], "receipts"],
    ["all", [">", ["receipt", "for_dependent"], 0], ["not", ["unknown", ["receipt", "for_person"]]],
      ["in_group", ["receipt", "for_person"], ["reachable", ["spouse"], false]]],
    ["receipt", "for_dependent"]]];

  it("this person is unchanged inside a sum over another person's list, so the person alone is reachable over no edge", () => {
    const ps = { p1: { receipts: [] }, p2: { receipts: [va(1500, 300, "p1"), va(200, 100, "p3")] }, p3: { receipts: [] } };
    const rels = [["spouse", "p1", "p2"], ["parent", "p2", "p3"]];
    expect(run(namesMe, ps, "p1", rels)).toBe(300);
    expect(run(namesMe, ps, "p3", rels)).toBe(100);
    expect(run(namesMe, ps, "p2", rels)).toBe(0);
  });
});
