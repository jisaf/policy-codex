import { describe, it, expect } from "vitest";
import { diffVolumes, prImpact } from "../../src/ui/prDiff";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const items = ledger.items as unknown as Item[];
const engine = createEngine(items, ledger.meta as unknown as VolumeMeta, refs);

describe("diffVolumes", () => {
  it("finds nothing when the two sides match", () => {
    expect(diffVolumes(items, items)).toEqual([]);
  });

  it("classifies edits, adds, and deletes and sorts by id", () => {
    const head = items
      .filter((i) => i.id !== "WR-002")
      .map((i) => (i.id === "WR-003" ? { ...i, meaning: "restated" } : i))
      .concat([{ ...items[0], id: "WR-320", identifier: "brand_new" }]);
    const diffs = diffVolumes(items, head);
    expect(diffs.map((d) => [d.id, d.kind])).toEqual([
      ["WR-002", "delete"], ["WR-003", "edit"], ["WR-320", "add"],
    ]);
    expect(diffs[1].before!.meaning).not.toBe("restated");
    expect(diffs[1].after!.meaning).toBe("restated");
  });

  it("computes the impact of the changed facts against the base ledger", () => {
    const head = items.map((i) => (i.id === "WR-003" ? { ...i, meaning: "restated" } : i));
    const impact = prImpact(engine, diffVolumes(items, head));
    expect(impact).toContain("medicaid_is_dependent_child");
    expect(impact).not.toContain("age");
  });
});
