/* The engine-team handoff for receipt records: ledger.json and the suite
 * carry the record schema (`record_fields`), a case states the list as a
 * list of mappings, and the cannot-determine generator removes a record's
 * field before it removes the whole list, naming it receipts[<i> <kind>].amount. */
import { describe, it, expect } from "vitest";
import { createEngine } from "../../src/engine/engine";
import { buildLedgerJson } from "../../src/export/ledger-json";
import { buildSuite } from "../../src/export/conformance";
import type { HouseholdCase } from "../../src/engine/cases";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const items: Item[] = [
  {
    id: "R-1", name: "Receipts", identifier: "receipts", kind: "supplied", type: "list of receipts",
    scope: "person", program: "All", meaning: "Every unearned payment the person received.", supplied_by: "test",
    record_fields: {
      kind: { type: "one of", required: true, options: ["pension", "gift"], meaning: "What the payment is.", option_meanings: { pension: "A pension payment.", gift: "A gift of money." } },
      amount: { type: "money", required: true, meaning: "The amount received." },
      month: { type: "month", when_absent: "every month", meaning: "The month it came in." },
    },
  },
  {
    id: "R-2", name: "Counting table", identifier: "x_counting_table", kind: "parameter",
    type: "table keyed by option", scope: "global", program: "X", meaning: "How each kind is treated.",
    options: ["counted", "excluded"], value: { pension: "counted", gift: "excluded" }, sources: ["S1"],
  },
  {
    id: "R-3", name: "X: countable income", identifier: "x_income", kind: "derived", type: "money",
    scope: "person-month", program: "X", meaning: "The counted receipts of the month.", sources: ["S1"],
    implemented: "engine", role: "outcome",
    derived: ["sum_receipts", "receipts",
      ["all", ["received_in", ["month"]], ["=", ["lookup", "x_counting_table", ["receipt", "kind"]], "counted"]],
      ["receipt", "amount"]],
    tests: [{ id: "R-3-T1", month: "2026-11", given: { receipts: [{ kind: "pension", amount: 400 }, { kind: "gift", amount: 50 }] }, expect: 400 }],
  },
];
const meta = {
  volume: "t", title: "t", version: "1", status: "t", default_as_of: "2026-11-01",
  approval_policy: { roles: [], by_program: {}, by_kind: {}, by_tag: {} },
  types: ["list of receipts", "table keyed by option", "money"], scopes: ["person", "person-month", "global"],
  programs: [{ id: "All", prefix: null }, { id: "X", prefix: "x_", outcomes: ["x_income"] }],
} as unknown as VolumeMeta;
const engine = createEngine(items, meta);
const cases: HouseholdCase[] = [{
  id: "H-1", title: "one pension", as_of: "2026-11-15",
  persons: { p1: { facts: { receipts: [{ kind: "gift", amount: 10 }, { kind: "pension", amount: 300 }] } } },
  expect: { p1: { x_income: { "2026-11": 300 } } },
}];
const vol = {
  volumeId: "t", title: "t", path: "volumes/t", ref: "main", sha: null, meta, items,
  sources: [], openQuestions: [], cases, chapterOf: {},
} as unknown as LoadedVolume;

describe("receipt records in the handoff", () => {
  it("ledger.json carries the record schema on the list", () => {
    const lj = buildLedgerJson(engine, vol, "abc");
    const r = lj.items.find((i) => i.identifier === "receipts")!;
    expect(r.record_fields).toEqual(items[0].record_fields);
    expect(lj.items.find((i) => i.identifier === "x_income")!.derived_english![0])
      .toBe("the sum for each receipt in Receipts where");
  });

  const suite = buildSuite(engine, vol, "abc");
  it("the suite's items carry the schema, and a case states the list as a list of mappings", () => {
    expect(suite.items.find((i) => i.identifier === "receipts")!.record_fields).toEqual(items[0].record_fields);
    const rt = suite.cases.find((c) => c.id === "R-3-T1")!;
    expect(rt.persons.p1.facts!.receipts).toEqual([{ kind: "pension", amount: 400 }, { kind: "gift", amount: 50 }]);
    expect(rt.expect[0].value).toBe(400);
    const h = suite.cases.find((c) => c.id === "H-1")!;
    expect(h.expect).toEqual([{ person: "p1", identifier: "x_income", month: "2026-11", value: 300 }]);
    expect(suite.notes).toEqual([]);
  });

  it("the cannot-determine case removes one record's amount and names it", () => {
    const cd = suite.cases.filter((c) => c.kind === "cannot-determine");
    expect(cd).toHaveLength(1);
    // The gift is excluded, so its amount is never read: removing it decides
    // nothing; the pension's is the one the outcome waits on.
    expect(cd[0].derived_from).toEqual({ case: "H-1", removed: { person: "p1", identifier: "receipts[1 pension].amount" } });
    expect(cd[0].persons.p1.facts!.receipts).toEqual([{ kind: "gift", amount: 10 }, { kind: "pension" }]);
    expect(cd[0].expect[0].missing).toEqual([{ person: "p1", identifier: "receipts[1 pension].amount", month: null }]);
    expect(suite.cannot_determine_gaps).toEqual([]);
  });
});
