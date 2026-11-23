/* Receipt records (docs/operators.md "Receipt records", P55-P57): the
 * list-of-records input, its schema, the three operators, how a missing
 * record field is reported, and the type check, rendering, YAML, constraint,
 * fingerprint and case-validation rules that come with them. */
import { describe, it, expect } from "vitest";
import { buildIndex } from "../../src/engine/ledger-index";
import { evaluate, makeCase, runTest, type TraceEvent } from "../../src/engine/evaluate";
import { explain, missingFacts } from "../../src/engine/explain";
import { check } from "../../src/engine/check";
import { block, inline } from "../../src/engine/render";
import { parseDerivation, parseInline } from "../../src/engine/parse";
import { parseItemFile, stringifyItem } from "../../src/engine/yaml";
import { approvableContent, changedFields, fingerprintItem } from "../../src/engine/fingerprint";
import { constraints } from "../../src/engine/constraints";
import {
  parseRecordFieldName, recordFieldName, recordMonth, recordValueErrors, schemaErrors,
} from "../../src/engine/records";
import type { Expr, Item, Scope, VolumeMeta } from "../../src/engine/types";

const KINDS = ["pension", "gift", "inheritance", "ssi"];
const receipts: Item = {
  id: "R-1", name: "Receipts", identifier: "receipts", kind: "supplied", type: "list of receipts",
  scope: "person", program: "All", meaning: "Every unearned payment the person received.",
  supplied_by: "test",
  record_fields: {
    kind: { type: "one of", required: true, options: KINDS, meaning: "What the payment is.", option_meanings: Object.fromEntries(KINDS.map((k) => [k, `A payment of ${k}.`])) },
    amount: { type: "money", required: true, meaning: "The amount received." },
    month: { type: "month", when_absent: "every month", meaning: "The month it came in." },
    date: { type: "calendar date", required: true, meaning: "The day it came in." },
    frequency: { type: "one of", options: ["once", "monthly", "weekly"], default: "monthly", meaning: "How often it is paid." },
    set_aside: { type: "money", default: 0, meaning: "The part set aside under a plan." },
  },
};
const table: Item = {
  id: "R-2", name: "Counting table", identifier: "counting_table", kind: "parameter",
  type: "table keyed by option", scope: "global", program: "All", meaning: "How each kind is treated.",
  options: ["counted", "excluded"],
  value: { pension: "counted", gift: "excluded", inheritance: "counted", ssi: "counted" },
};
const appDate: Item = {
  id: "R-3", name: "Application date", identifier: "application_date", kind: "supplied",
  type: "calendar date", scope: "case", program: "All", meaning: "The application date.", supplied_by: "test",
};

/** Counted recurring receipts of the month, less their set-aside. */
const counted: Expr = ["sum_receipts", "receipts",
  ["all", ["received_in", ["month"]], ["not", ["=", ["receipt", "frequency"], "once"]],
    ["=", ["lookup", "counting_table", ["receipt", "kind"]], "counted"]],
  ["-", ["receipt", "amount"], ["receipt", "set_aside"]]];
/** Counted one-time receipts dated on or before the application date in the month. */
const oneTime: Expr = ["sum_receipts", "receipts",
  ["all", ["=", ["receipt", "frequency"], "once"], ["received_in", ["month"]],
    ["<=", ["receipt", "date"], "application_date"]],
  ["receipt", "amount"]];

function derived(identifier: string, e: Expr, scope: Scope = "person-month"): Item {
  return {
    id: "D-" + identifier, name: identifier, identifier, kind: "derived", type: "money", scope,
    program: "All", meaning: "A derived amount for the test.", derived: e, implemented: "engine", sources: ["S1"],
  };
}

function ix(extra: Item[] = []) {
  return buildIndex([receipts, table, appDate, ...extra]);
}

function run(e: Expr, list: unknown, month = "2026-11", events?: TraceEvent[]): unknown {
  const i = ix([derived("t", e)]);
  const facts: Record<string, unknown> = {};
  if (list !== undefined) facts.receipts = list;
  const c = makeCase(i, {
    id: "T", as_of: "2026-11-15", persons: { p1: { facts } }, case_facts: { application_date: "2026-11-10" },
  });
  return evaluate(i, c, "t", "p1", month, events ? (ev) => { events.push(ev); } : undefined);
}

describe("sum_receipts (P55)", () => {
  it("is unknown when the list is not stated, 0 when it is empty", () => {
    expect(run(counted, undefined)).toBeNull();
    expect(run(counted, [])).toBe(0);
  });

  it("sums the value of the records whose condition holds, defaults applied", () => {
    const list = [
      { kind: "pension", amount: 500 },
      { kind: "gift", amount: 100 },
      { kind: "pension", amount: 300, set_aside: 50 },
      { kind: "inheritance", amount: 2000, frequency: "once", month: "2026-11" },
    ];
    expect(run(counted, list)).toBe(750);
  });

  it("skips a record whose condition is false without reading its value", () => {
    // The gift has no amount; it is excluded, so its amount is never asked for.
    expect(run(counted, [{ kind: "gift" }, { kind: "pension", amount: 10 }])).toBe(10);
  });

  it("is unknown when a counted record's required field is not stated, and names it", () => {
    const events: TraceEvent[] = [];
    expect(run(counted, [{ kind: "gift", amount: 5 }, { kind: "pension" }], "2026-11", events)).toBeNull();
    const missing = events.filter((e) => e.origin === "missing").map((e) => e.identifier);
    expect(missing).toEqual(["receipts[1 pension].amount"]);
    expect(events.find((e) => e.origin === "missing")!.person).toBe("p1");
  });

  it("is unknown when a record's kind is not stated (its condition cannot be decided)", () => {
    const events: TraceEvent[] = [];
    expect(run(counted, [{ amount: 5 }], "2026-11", events)).toBeNull();
    expect(events.filter((e) => e.origin === "missing").map((e) => e.identifier)).toEqual(["receipts[0 ?].kind"]);
  });

  it("names the missing field in explain's cannot-determine list", () => {
    const i = ix([derived("t", oneTime)]);
    const c = makeCase(i, {
      id: "T", as_of: "2026-11-15", case_facts: { application_date: "2026-11-10" },
      persons: { p1: { facts: { receipts: [{ kind: "inheritance", amount: 2000, frequency: "once", month: "2026-11" }] } } },
    });
    const node = explain(i, c, "t", "p1", "2026-11");
    expect(node.value).toBeNull();
    expect(missingFacts(node).map((n) => n.identifier)).toEqual(["receipts[0 inheritance].date"]);
  });

  it("reads that person's list with [of, person, list]", () => {
    const e: Expr = ["sum", ["persons"], ["sum_receipts", ["of", ["P"], "receipts"], true, ["receipt", "amount"]]];
    const i = ix([derived("t", e)]);
    const c = makeCase(i, {
      id: "T", as_of: "2026-11-15",
      persons: { p1: { facts: { receipts: [{ kind: "pension", amount: 1 }] } }, p2: { facts: { receipts: [{ kind: "ssi", amount: 2 }] } } },
    });
    expect(evaluate(i, c, "t", "p1", "2026-11")).toBe(3);
  });

  it("does not let a derived fact's own rule see that receipt", () => {
    const inner = derived("inner", ["receipt", "amount"], "person-month");
    const e: Expr = ["sum_receipts", "receipts", true, "inner"];
    const i = ix([inner, derived("t", e)]);
    const c = makeCase(i, { id: "T", as_of: "2026-11-15", persons: { p1: { facts: { receipts: [{ kind: "pension", amount: 1 }] } } } });
    expect(() => evaluate(i, c, "t", "p1", "2026-11")).toThrow(/outside "for each receipt in"/);
  });

  it("rejects a list that is not a list of records", () => {
    expect(() => run(counted, [5])).toThrow(/not a record/);
    expect(() => run(counted, { kind: "pension" })).toThrow(/not a list/);
  });
});

describe("receipt (P56) and received_in (P57)", () => {
  const amountIn: Expr = ["sum_receipts", "receipts", ["received_in", ["month"]], ["receipt", "amount"]];
  it("a record with no month and no date recurs in every month", () => {
    expect(run(amountIn, [{ kind: "pension", amount: 7 }], "2026-01")).toBe(7);
  });
  it("a record with a month is received in that month only", () => {
    expect(run(amountIn, [{ kind: "pension", amount: 7, month: "2026-10" }], "2026-11")).toBe(0);
    expect(run(amountIn, [{ kind: "pension", amount: 7, month: "2026-10" }], "2026-10")).toBe(7);
  });
  it("a record with a date and no month is received in the date's month", () => {
    expect(run(amountIn, [{ kind: "pension", amount: 7, date: "2026-10-25" }], "2026-10")).toBe(7);
    expect(run(amountIn, [{ kind: "pension", amount: 7, date: "2026-10-25" }], "2026-11")).toBe(0);
  });
  it("that receipt's month is its month, or its date's month", () => {
    const m: Expr = ["sum_receipts", "receipts", ["=", ["receipt", "month"], "2026-10"], ["receipt", "amount"]];
    expect(run(m, [{ kind: "pension", amount: 7, date: "2026-10-25" }, { kind: "pension", amount: 1, month: "2026-10" }])).toBe(8);
    expect(run(m, [{ kind: "pension", amount: 7 }])).toBeNull();
  });
  it("a one-time record with no month or date cannot be placed, and its month is named", () => {
    const events: TraceEvent[] = [];
    expect(run(amountIn, [{ kind: "inheritance", amount: 7, frequency: "once" }], "2026-11", events)).toBeNull();
    expect(events.filter((e) => e.origin === "missing").map((e) => e.identifier)).toEqual(["receipts[0 inheritance].month"]);
  });
  it("a field with a declared default reads as the default; a required one as unknown", () => {
    expect(run(oneTime, [{ kind: "inheritance", amount: 9, frequency: "once", date: "2026-11-03" }])).toBe(9);
    expect(run(oneTime, [{ kind: "inheritance", amount: 9, frequency: "once", date: "2026-11-12" }])).toBe(0);
    expect(run(oneTime, [{ kind: "inheritance", amount: 9, frequency: "once", month: "2026-11" }])).toBeNull();
  });
  it("errors outside a sum, and on a field the schema does not declare", () => {
    expect(() => run(["receipt", "amount"], [])).toThrow(/outside/);
    expect(() => run(["sum_receipts", "receipts", true, ["receipt", "amout"]], [{ kind: "pension", amount: 1 }])).toThrow(/no such field/);
  });
});

describe("type check", () => {
  const i = ix();
  it("types the operators and a field by its declared type", () => {
    const r = check(i, counted, "person-month");
    expect(r.errors).toEqual([]);
    expect(r.type).toBe("number");
    expect(r.refs.has("receipts")).toBe(true);
    expect(check(i, ["sum_receipts", "receipts", true, ["receipt", "date"]], "person-month").errors)
      .toEqual(["the sum of: expected number, got date"]);
  });
  it("refuses that receipt outside a sum, an undeclared field, and a list that is not one", () => {
    expect(check(i, ["receipt", "amount"], "person").errors).toEqual(['"that receipt" used outside "the sum of ... for each receipt in"']);
    expect(check(i, ["sum_receipts", "receipts", true, ["receipt", "amout"]], "person").errors)
      .toEqual(["that receipt's amout: receipts declares no such field"]);
    expect(check(i, ["sum_receipts", "application_date", true, 1], "person").errors[0])
      .toMatch(/expected a list of receipts/);
  });
  it("refuses a fact of a person inside a receipt sum, and allows case facts and parameters", () => {
    const pf: Item = { ...appDate, identifier: "own_date", name: "Own date", scope: "person" };
    const i2 = buildIndex([receipts, table, appDate, pf]);
    expect(check(i2, ["sum_receipts", "receipts", ["<=", ["receipt", "date"], "own_date"], 1], "person").errors)
      .toEqual(['"Own date" is a fact of a person; a receipt sum reads only that receipt\'s fields, the month, case facts and parameters (read it outside the sum)']);
    expect(check(i2, oneTime, "person-month").errors).toEqual([]);
  });
  it("refuses a kind that is not one of the kinds", () => {
    expect(check(i, ["sum_receipts", "receipts", ["=", ["receipt", "kind"], "pensoin"], 1], "person").errors)
      .toContain('"pensoin" is not an option of that receipt\'s kind');
    expect(check(i, ["sum_receipts", "receipts", ["in", ["receipt", "kind"], ["gift", "lotto"]], 1], "person").errors)
      .toContain('"lotto" is not an option of that receipt\'s kind');
  });
  it("refuses a counting table with no row for a kind, or a row for no kind", () => {
    const short: Item = { ...table, identifier: "short_table", name: "Short table", value: { pension: "counted", gift: "excluded", lotto: "counted" } };
    const r = check(buildIndex([receipts, short]),
      ["sum_receipts", "receipts", ["=", ["lookup", "short_table", ["receipt", "kind"]], "counted"], 1], "person");
    expect(r.errors).toContain("Short table has no row for: inheritance, ssi");
    expect(r.errors).toContain("Short table has a row for no option of that receipt's kind: lotto");
  });
});

describe("pattern English", () => {
  const i = ix();
  it("renders and reads back the inline form", () => {
    const e: Expr = ["+", 1, ["sum_receipts", "receipts", ["=", ["receipt", "kind"], "pension"], ["-", ["receipt", "amount"], ["receipt", "set_aside"]]]];
    const text = inline(i, e);
    expect(text).toBe("1 plus (the sum of (that receipt's amount minus that receipt's set aside) for each receipt in Receipts where (that receipt's kind is equal to pension))");
    expect(parseInline(i, text)).toEqual(e);
  });
  it("renders and reads back the block form", () => {
    const lines = block(i, counted);
    expect(lines[0]).toBe("the sum for each receipt in Receipts where");
    expect(lines).toContain("  of");
    expect(parseDerivation(i, lines.join("\n"))).toEqual(counted);
    expect(parseDerivation(i, block(i, oneTime).join("\n"))).toEqual(oneTime);
  });
});

describe("record schema", () => {
  it("is well formed as declared", () => {
    expect(schemaErrors(receipts)).toEqual([]);
  });
  it("states exactly one of required, a default or when_absent per field", () => {
    const bad: Item = { ...receipts, record_fields: { ...receipts.record_fields!, date: { type: "calendar date", meaning: "The day it came in." } } };
    expect(schemaErrors(bad)).toContain("record_fields.date: states exactly one of required: true, a default, or when_absent (decision 4 of 2026-11-23)");
    const both: Item = { ...receipts, record_fields: { ...receipts.record_fields!, set_aside: { type: "money", required: true, default: 0, meaning: "Set aside." } } };
    expect(schemaErrors(both)[0]).toMatch(/exactly one of/);
  });
  it("refuses a default of the wrong type, and record_fields on any other item", () => {
    const bad: Item = { ...receipts, record_fields: { ...receipts.record_fields!, frequency: { type: "one of", options: ["once", "monthly"], default: "weekly", meaning: "How often it is paid." } } };
    expect(schemaErrors(bad)).toContain('record_fields.frequency: default "weekly" is not a one of');
    expect(schemaErrors({ ...appDate, record_fields: receipts.record_fields })[0]).toMatch(/only for a list of records/);
  });
  it("requires kind and amount", () => {
    const { kind: _k, ...rest } = receipts.record_fields!;
    expect(schemaErrors({ ...receipts, record_fields: rest })).toContain('record_fields.kind is a required "one of" field');
  });
  it("is reported by the item's constraints", () => {
    const meta = { types: ["list of receipts", "calendar date"], scopes: ["person"], programs: [{ id: "All", prefix: null }] } as unknown as VolumeMeta;
    const bad: Item = { ...receipts, record_fields: { amount: receipts.record_fields!.amount } };
    const failed = constraints(buildIndex([bad]), meta, null, bad).filter((c) => !c.ok).map((c) => c.msg);
    expect(failed).toContain('record_fields.kind is a required "one of" field');
  });
  it("round-trips through the item file byte for byte", () => {
    const text = stringifyItem(receipts);
    expect(text).toContain("record_fields:\n  kind:\n    type: one of\n    required: true\n    options: [pension, gift, inheritance, ssi]\n    meaning: What the payment is.\n    option_meanings:\n      pension: A payment of pension.");
    expect(parseItemFile(text)).toEqual(receipts);
    expect(stringifyItem(parseItemFile(text))).toBe(text);
  });
});

describe("fingerprint covers the record schema", () => {
  const basis = { ix: ix(), sourceTexts: {} };
  it("changes when a field's default or a kind changes, not with option or field order", () => {
    const fp = fingerprintItem(basis, receipts);
    const dflt: Item = { ...receipts, record_fields: { ...receipts.record_fields!, set_aside: { ...receipts.record_fields!.set_aside, default: 1 } } };
    expect(fingerprintItem(basis, dflt)).not.toBe(fp);
    expect(changedFields(receipts, dflt)).toEqual(["record_fields"]);
    const kinds: Item = { ...receipts, record_fields: { ...receipts.record_fields!, kind: { ...receipts.record_fields!.kind, options: [...KINDS, "lottery"] } } };
    expect(fingerprintItem(basis, kinds)).not.toBe(fp);
    const reordered: Item = {
      ...receipts,
      record_fields: Object.fromEntries(Object.entries(receipts.record_fields!).reverse().map(([k, v]) =>
        [k, k === "kind" ? { ...v, options: [...KINDS].reverse() } : v])),
    };
    expect(fingerprintItem(basis, reordered)).toBe(fp);
  });
  it("leaves an item without a schema hashing as before", () => {
    expect("record_fields" in approvableContent(appDate)).toBe(false);
  });
  it("reaches every reader of the list", () => {
    const reader = derived("t", counted);
    const i2 = buildIndex([receipts, table, appDate, reader]);
    const changed: Item = { ...receipts, record_fields: { ...receipts.record_fields!, set_aside: { ...receipts.record_fields!.set_aside, default: 1 } } };
    const i3 = buildIndex([changed, table, appDate, reader]);
    expect(fingerprintItem({ ix: i2, sourceTexts: {} }, reader)).not.toBe(fingerprintItem({ ix: i3, sourceTexts: {} }, reader));
  });
});

describe("stated records", () => {
  it("names a record field and reads the name back", () => {
    expect(recordFieldName("receipts", 2, "other_one_time", "date")).toBe("receipts[2 other_one_time].date");
    expect(parseRecordFieldName("receipts[2 other_one_time].date")).toEqual({ list: "receipts", index: 2, kind: "other_one_time", field: "date" });
    expect(recordMonth({ date: "2026-10-25" })).toBe("2026-10");
    expect(recordMonth({ month: "2026-09", date: "2026-10-25" })).toBe("2026-09");
  });
  it("reports a field the schema does not declare, a bad value, a kind not listed, and a month against its date", () => {
    expect(recordValueErrors(receipts, [
      { kind: "pension", amount: "500" },
      { kind: "lotto", amount: 1 },
      { kind: "gift", amount: 1, frequncy: "once" },
      { kind: "gift", amount: 1, month: "2026-10", date: "2026-11-02" },
      { kind: "gift" },
    ])).toEqual([
      'receipts[0 pension].amount: "500" is not a money',
      'receipts[1 lotto].kind: "lotto" is not one of its options',
      'receipts[2 gift].frequncy: no field "frequncy" in the receipts schema',
      "receipts[3 gift].month: month 2026-10 is not the month of the date 2026-11-02",
    ]);
  });
});

describe("rule tests state receipts as a list", () => {
  it("runs a rule test whose given states the list", () => {
    const it2 = derived("t", counted);
    const r = runTest(ix([it2]), it2, { id: "T1", month: "2026-11", given: { receipts: [{ kind: "pension", amount: 4 }] }, expect: 4 });
    expect(r.ok).toBe(true);
  });
});
