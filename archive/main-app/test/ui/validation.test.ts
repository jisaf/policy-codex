import { describe, it, expect } from "vitest";
import { createEngine } from "../../src/engine/engine";
import { itemValidation, validationMap } from "../../src/ui/validation";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);

describe("validation summary", () => {
  it("summarises every item once", () => {
    expect(validationMap(engine).size).toBe(138);
  });

  it("memoises per engine instance", () => {
    expect(validationMap(engine)).toBe(validationMap(engine));
  });

  it("counts the six known error items", () => {
    const bad = [...validationMap(engine)].filter(([, v]) => v.errors > 0).map(([id]) => id);
    expect(bad.sort()).toEqual(
      ["WR-003", "WR-004", "WR-207", "WR-225", "WR-228", "WR-315"].sort(),
    );
  });

  it("reports the messages for one item", () => {
    // WR-101 states its value as dated versions; that satisfies the constraint.
    const v = itemValidation(engine, "WR-101");
    expect(v.errors).toBe(0);
    expect(v.messages).not.toContain("Parameter has a value");
  });
});
