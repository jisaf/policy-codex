import { describe, it, expect } from "vitest";
import { buildIndex } from "../../src/engine/ledger-index";
import { parseDerivation, parseInline, splitTop, stripParens } from "../../src/engine/parse";
import ledger from "../fixtures/ledger.json";
import derivations from "../fixtures/derivations.json";
import type { Item } from "../../src/engine/types";

const ix = buildIndex(ledger.items as unknown as Item[]);

describe("parse", () => {
  it("splits at the top level only", () => {
    expect(splitTop("a plus (b plus c)", " plus ")).toEqual(["a", "(b plus c)"]);
    expect(splitTop("(a plus b)", " plus ")).toBeNull();
    expect(splitTop("a and b and c", " and ", true)).toEqual(["a and b", "c"]);
  });

  it("strips only balanced wrapping parentheses", () => {
    expect(stripParens("((x))")).toBe("x");
    expect(stripParens("(a) plus (b)")).toBe("(a) plus (b)");
  });

  it("reads constants, literals, and fact names", () => {
    expect(parseInline(ix, "the Determination Date")).toEqual(["det_date"]);
    expect(parseInline(ix, "yes")).toBe(true);
    expect(parseInline(ix, "19")).toBe(19);
    expect(parseInline(ix, "2027-01")).toBe("2027-01");
    expect(parseInline(ix, "Date of Birth")).toBe("date_of_birth");
    expect(parseInline(ix, "Medicaid community engagement minimum age (19)")).toBe(
      "medicaid_ce_min_age",
    );
  });

  it("reads a comparison against a parameter", () => {
    expect(
      parseInline(ix, "Age is at least Medicaid community engagement minimum age (19)"),
    ).toEqual([">=", "age", "medicaid_ce_min_age"]);
  });

  it("resolves an option of the item being drafted before it is in the ledger", () => {
    expect(parseInline(ix, "not yet in effect", ["not yet in effect", "met"])).toBe(
      "not yet in effect",
    );
  });

  it("refuses text it cannot read", () => {
    expect(() => parseInline(ix, "wibble wobble")).toThrow(/cannot read "wibble wobble"/);
  });

  it("round-trips every fixture derivation", () => {
    for (const d of derivations) {
      expect(parseDerivation(ix, d.english), d.id).toEqual(d.expr);
    }
  });
});
