/* Resource records, step H0 (docs/operators.md "Receipt records", P58, and
 * "the noun of a list"): a list of records named holdings (record_noun
 * holding, worth stated in `value`), and P58 `largest`, the largest value
 * over the records whose condition holds, as 20 CFR 416.1218(b)(1) ("One
 * automobile is totally excluded regardless of value if it is used for
 * transportation") and 9 CCR 2503-5 3.520.77.A ("The vehicle with the
 * highest value is exempt if it is used for the transportation of the
 * client") need: countable vehicles = the sum of the vehicles less the
 * largest one used for transportation. */
import { describe, it, expect } from "vitest";
import { buildIndex } from "../../src/engine/ledger-index";
import { evaluate, makeCase, type TraceEvent } from "../../src/engine/evaluate";
import { explain, missingFacts } from "../../src/engine/explain";
import { check } from "../../src/engine/check";
import { block, inline } from "../../src/engine/render";
import { parseDerivation, parseInline } from "../../src/engine/parse";
import { parseItemFile, stringifyItem } from "../../src/engine/yaml";
import { jointRecordErrors, schemaErrors } from "../../src/engine/records";
import type { Expr, Item } from "../../src/engine/types";

const KINDS = ["bank_account", "vehicle", "home"];
const holdings: Item = {
  id: "H-1", name: "Holdings", identifier: "holdings", kind: "supplied", type: "list of receipts",
  scope: "person", program: "All", meaning: "Everything of value the person owns.", supplied_by: "test",
  record_noun: "holding",
  record_fields: {
    kind: { type: "one of", required: true, options: KINDS, meaning: "What the holding is.", option_meanings: Object.fromEntries(KINDS.map((k) => [k, `A holding of kind ${k}.`])) },
    value: { type: "money", required: true, meaning: "The fair market value of the whole holding." },
    month: { type: "month", when_absent: "the same value in every month", meaning: "The month it is valued in." },
    amount_owed: { type: "money", required: true, meaning: "What is owed against the holding." },
    used_for_transportation: { type: "yes/no", required: true, meaning: "The vehicle is used for transportation." },
  },
};
const table: Item = {
  id: "H-2", name: "Holdings table", identifier: "holding_table", kind: "parameter",
  type: "table keyed by option", scope: "global", program: "All", meaning: "How each kind is treated.",
  options: ["counted", "counted_less_one_transportation_vehicle", "excluded"],
  value: { bank_account: "counted", vehicle: "counted_less_one_transportation_vehicle", home: "excluded" },
};

const equity: Expr = ["-", ["receipt", "value"], ["receipt", "amount_owed"]];
const isVehicle: Expr = ["all", ["received_in", ["month"]], ["=", ["receipt", "kind"], "vehicle"]];
/** P58 alone: the equity of the largest vehicle used for transportation. */
const largestTransport: Expr = ["largest", "holdings", ["all", isVehicle, ["receipt", "used_for_transportation"]], equity];
/** The vehicles the SSI method counts: all of them less the largest used for transportation. */
const countableVehicles: Expr = ["-", ["sum_receipts", "holdings", isVehicle, equity], largestTransport];

function derived(identifier: string, e: Expr): Item {
  return {
    id: "D-" + identifier, name: identifier, identifier, kind: "derived", type: "money", scope: "person-month",
    program: "All", meaning: "A derived amount for the test.", derived: e, implemented: "engine", sources: ["S1"],
  };
}
const ix = (extra: Item[] = []) => buildIndex([holdings, table, ...extra]);

function run(e: Expr, list: unknown, events?: TraceEvent[]): unknown {
  const i = ix([derived("t", e)]);
  const facts: Record<string, unknown> = {};
  if (list !== undefined) facts.holdings = list;
  const c = makeCase(i, { id: "T", as_of: "2026-11-15", persons: { p1: { facts } } });
  return evaluate(i, c, "t", "p1", "2026-11", events ? (ev) => { events.push(ev); } : undefined);
}

const car = (value: number, transport: boolean, owed = 0) => ({ kind: "vehicle", value, amount_owed: owed, used_for_transportation: transport });

describe("largest (P58)", () => {
  it("is unknown when the list is not stated, 0 when it is empty or no record's condition holds", () => {
    expect(run(largestTransport, undefined)).toBeNull();
    expect(run(largestTransport, [])).toBe(0);
    expect(run(largestTransport, [{ kind: "bank_account", value: 900 }, car(5000, false)])).toBe(0);
  });

  it("is the largest value over the records whose condition holds", () => {
    expect(run(largestTransport, [car(4000, true), car(9000, true, 1000), car(12000, false)])).toBe(8000);
  });

  it("is the true largest when every matching value is negative, 0 only when none matches (fact-graph review of D5)", () => {
    // A car owing more than it is worth has negative equity; the largest is that negative number, not 0.
    expect(run(largestTransport, [car(1000, true, 3000)])).toBe(-2000);
    expect(run(largestTransport, [car(1000, true, 3000), car(2000, true, 2500)])).toBe(-500);
  });

  it("excludes the one transportation vehicle of highest value: two vehicles counted less the larger (H7)", () => {
    // 416.1218(b)(1): one automobile used for transportation excluded regardless of value; the other's equity counted.
    expect(run(countableVehicles, [car(6000, true), car(3000, true)])).toBe(3000);
    expect(run(countableVehicles, [car(6000, false), car(3000, true)])).toBe(6000);
    expect(run(countableVehicles, [car(6000, true)])).toBe(0);
  });

  it("does not depend on the order of the records (MH-2)", () => {
    const list = [car(4000, true), car(9000, true), car(2000, false)];
    expect(run(countableVehicles, list)).toBe(run(countableVehicles, [...list].reverse()));
  });

  it("is unknown when a record's condition, or a counted record's value, is unknown, and names the field", () => {
    expect(run(largestTransport, [car(4000, true), { kind: "vehicle", value: 3000, amount_owed: 0 }])).toBeNull();
    const i = ix([derived("t", largestTransport)]);
    const c = makeCase(i, { id: "T", as_of: "2026-11-15", persons: { p1: { facts: { holdings: [{ kind: "vehicle", amount_owed: 0, used_for_transportation: true }] } } } });
    const node = explain(i, c, "t", "p1", "2026-11");
    expect(node.value).toBeNull();
    expect(missingFacts(node).map((n) => n.identifier)).toEqual(["holdings[0 vehicle].value"]);
  });

  it("never reads the value of a record whose condition is false", () => {
    expect(run(largestTransport, [car(4000, true), { kind: "vehicle", used_for_transportation: false }])).toBe(4000);
  });

  it("is typed as a number over a list of records, its value a number", () => {
    const r = check(ix([derived("t", largestTransport)]), largestTransport, "person-month");
    expect(r.errors).toEqual([]);
    expect(r.type).toBe("number");
    const bad = check(ix(), ["largest", "holdings", true, ["receipt", "kind"]], "person-month");
    expect(bad.errors.join(" ")).toMatch(/the largest of/);
    const notList = check(ix(), ["largest", "holding_table", true, 1], "person-month");
    expect(notList.errors.join(" ")).toMatch(/expected a list of receipts/);
  });
});

describe("a list of holdings (record_noun)", () => {
  it("declares its worth in value, not amount", () => {
    expect(schemaErrors(holdings)).toEqual([]);
    const noValue: Item = { ...holdings, record_fields: { ...holdings.record_fields!, value: undefined as never } };
    delete (noValue.record_fields as Record<string, unknown>).value;
    expect(schemaErrors(noValue)).toContain("record_fields.value is a required money field");
    expect(schemaErrors({ ...holdings, record_noun: "asset" }).join(" ")).toMatch(/record_noun "asset" is not one of/);
    expect(schemaErrors({ ...table, record_noun: "holding" }).join(" ")).toMatch(/record_noun is only for a list of records/);
  });

  it("renders its records as holdings and reads the English back", () => {
    const i = ix();
    const e: Expr = ["largest", "holdings", ["=", ["receipt", "kind"], "vehicle"], ["-", ["receipt", "value"], ["receipt", "amount_owed"]]];
    const s = inline(i, e);
    expect(s).toBe("the largest of (that holding's value minus that holding's amount owed) for each holding in Holdings where (that holding's kind is equal to vehicle)");
    expect(parseInline(i, s)).toEqual(e);
    expect(inline(i, ["sum_receipts", "holdings", ["received_in", ["month"]], ["receipt", "value"]]))
      .toBe("the sum of that holding's value for each holding in Holdings where (that holding is valued in the month)");
    expect(parseInline(i, "that holding is valued in the month")).toEqual(["received_in", ["month"]]);
    const lines = block(i, largestTransport);
    expect(lines[0]).toBe("the largest for each holding in Holdings where");
    expect(parseDerivation(i, lines.join("\n"))).toEqual(largestTransport);
  });

  it("round-trips record_noun through the item file", () => {
    const text = stringifyItem(holdings);
    expect(text).toMatch(/\nrecord_noun: holding\nrecord_fields:\n/);
    expect(stringifyItem(parseItemFile(text))).toBe(text);
  });
});

describe("joint holdings (design 3.2)", () => {
  const withJoint: Item = {
    ...holdings,
    record_fields: {
      ...holdings.record_fields!,
      share: { type: "rate", when_absent: "owned alone", meaning: "The person's share of the holding." },
      holding_id: { type: "text", required: true, meaning: "A name for a holding owned with others." },
    },
  };
  const acct = (share?: number, value = 1000, kind = "bank_account") => ({ kind, value, holding_id: "joint-1", ...(share === undefined ? {} : { share }) });

  it("accepts one holding stated on each owner's list with shares adding to 1", () => {
    expect(jointRecordErrors(withJoint, [["p1", [acct(0.5)]], ["p2", [acct(0.5)]]])).toEqual([]);
    expect(jointRecordErrors(withJoint, [["p1", [acct(0.5)]], ["p2", [{ kind: "bank_account", value: 1000 }]]])).toEqual([]);
  });

  it("refuses records of one holding that disagree on kind or value, or shares over 1", () => {
    expect(jointRecordErrors(withJoint, [["p1", [acct(0.5, 1000)]], ["p2", [acct(0.5, 900)]]]).join(" ")).toMatch(/disagree on value/);
    expect(jointRecordErrors(withJoint, [["p1", [acct(0.5)]], ["p2", [acct(0.5, 1000, "securities")]]]).join(" ")).toMatch(/disagree on kind/);
    expect(jointRecordErrors(withJoint, [["p1", [acct()]], ["p2", [acct(0.5)]]]).join(" ")).toMatch(/shares add to 1.5/);
  });

  it("does not apply to a list that declares no holding_id", () => {
    expect(jointRecordErrors(holdings, [["p1", [acct()]], ["p2", [acct()]]])).toEqual([]);
  });
});
