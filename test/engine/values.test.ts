import { describe, it, expect } from "vitest";
import { baseType, lit, paramValue, fmt, valuesEqual, slug } from "../../src/engine/values";
import { buildIndex, nextIdFrom } from "../../src/engine/ledger-index";
import ledger from "../fixtures/ledger.json";
import type { Item } from "../../src/engine/types";

const items = ledger.items as unknown as Item[];

describe("values", () => {
  it("maps codex types to base types", () => {
    expect(baseType({ type: "whole number" })).toBe("number");
    expect(baseType({ type: "calendar date" })).toBe("date");
    expect(baseType({ type: "one of" })).toBe("enum");
    expect(baseType({ type: "nonsense" })).toBe("unknown");
  });

  it("renders literals the way the ledger writes them", () => {
    expect(lit(true)).toBe("yes");
    expect(lit(false)).toBe("no");
    expect(lit(80)).toBe("80");
    expect(lit("2027-01-01")).toBe("2027-01-01");
  });

  it("takes the last version of a versioned parameter", () => {
    const wage = items.find((i) => i.identifier === "federal_minimum_wage")!;
    expect(paramValue(wage)).toBe(7.25);
    const hours = items.find((i) => i.identifier === "medicaid_ce_required_hours")!;
    expect(paramValue(hours)).toBe(80);
  });

  it("formats evaluated values", () => {
    expect(fmt(null)).toBe("unknown");
    expect(fmt(true)).toBe("yes");
    expect(fmt(["2027-01", "2027-02"])).toBe("[2027-01, 2027-02]");
    expect(fmt({ p1: 3 })).toBe("{p1: 3}");
  });

  it("compares values the way rule tests do", () => {
    expect(valuesEqual(null, "unknown")).toBe(true);
    expect(valuesEqual(18, 18.0)).toBe(true);
    expect(valuesEqual(false, false)).toBe(true);
    expect(valuesEqual(null, false)).toBe(false);
  });

  it("slugs a program-prefixed fact name", () => {
    expect(slug("Medicaid: is an applicable individual")).toBe(
      "medicaid_is_an_applicable_individual",
    );
  });

  it("picks the next free item id", () => {
    expect(nextIdFrom(buildIndex(items))).toBe("WR-320");
  });
});
