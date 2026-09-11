import { describe, it, expect } from "vitest";
import { buildIndex } from "../../src/engine/ledger-index";
import { block, compact, inline } from "../../src/engine/render";
import ledger from "../fixtures/ledger.json";
import derivations from "../fixtures/derivations.json";
import type { Expr, Item } from "../../src/engine/types";

const ix = buildIndex(ledger.items as unknown as Item[]);

describe("render", () => {
  it("names a parameter with its value inline", () => {
    expect(inline(ix, "medicaid_ce_required_hours")).toBe(
      "Medicaid community engagement required hours per month (80)",
    );
  });

  it("reproduces every fixture derivation in pattern English", () => {
    for (const d of derivations) {
      expect(block(ix, d.expr as Expr).join("\n"), d.id).toBe(d.english);
    }
  });

  it("reproduces every fixture derivation in compact form", () => {
    for (const d of derivations) {
      expect(compact(ix, d.expr as Expr), d.id).toBe(d.compact);
    }
  });
});
