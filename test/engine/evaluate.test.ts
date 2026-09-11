import { describe, it, expect } from "vitest";
import { buildIndex } from "../../src/engine/ledger-index";
import { addMonths, monthsEnding, monthsFromTo, runTest, yearsBetween } from "../../src/engine/evaluate";
import { fmt } from "../../src/engine/values";
import ledger from "../fixtures/ledger.json";
import ruleTests from "../fixtures/rule-tests.json";
import type { Item } from "../../src/engine/types";

const items = ledger.items as unknown as Item[];
const ix = buildIndex(items);
const byId = new Map(items.map((i) => [i.id, i]));

describe("evaluate", () => {
  it("does month arithmetic across year boundaries", () => {
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(monthsEnding(3, "2027-02")).toEqual(["2026-12", "2027-01", "2027-02"]);
    expect(monthsFromTo("2026-11", "2027-01")).toEqual(["2026-11", "2026-12", "2027-01"]);
  });

  it("counts whole years the way the codex defines them", () => {
    expect(yearsBetween("2007-03-15", "2026-03-14")).toBe(18);
    expect(yearsBetween("2007-03-15", "2026-03-15")).toBe(19);
    expect(yearsBetween("2008-02-29", "2026-02-28")).toBe(17);
    expect(yearsBetween("2008-02-29", "2026-03-01")).toBe(18);
  });

  it("reproduces all 133 fixture rule tests", () => {
    expect(ruleTests).toHaveLength(133);
    for (const rec of ruleTests) {
      const item = byId.get(rec.itemId)!;
      const t = (item.tests || []).find((x) => x.id === rec.testId)!;
      const r = runTest(ix, item, t);
      expect(r.ok, rec.testId).toBe(rec.ok);
      expect(fmt(r.got), rec.testId).toBe(rec.got);
      expect(r.err, rec.testId).toBe(rec.err);
    }
  });
});
