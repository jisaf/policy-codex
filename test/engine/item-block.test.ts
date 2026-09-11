import { describe, it, expect } from "vitest";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import itemBlocks from "../fixtures/item-blocks.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const engine = createEngine(
  ledger.items as unknown as Item[],
  ledger.meta as unknown as VolumeMeta,
  refs,
);

describe("item blocks", () => {
  it("renders every fixture item block", () => {
    for (const b of itemBlocks) {
      expect(engine.itemBlock(engine.itemById(b.id)!), b.id).toBe(b.block);
    }
  });

  it("parses every fixture item block back to the same item", () => {
    for (const b of itemBlocks) {
      const original = engine.itemById(b.id)!;
      const r = engine.parseItemBlock(b.block);
      expect(r.errors, b.id).toEqual([]);
      expect(r.item.identifier, b.id).toBe(original.identifier);
      expect(r.item.kind, b.id).toBe(original.kind);
      expect(r.item.type, b.id).toBe(original.type);
      expect(r.item.scope, b.id).toBe(original.scope);
      expect(r.item.program, b.id).toBe(original.program);
      expect(r.item.tests?.length ?? 0, b.id).toBe(original.tests?.length ?? 0);
      if (original.kind === "derived") expect(r.item.derived, b.id).toEqual(original.derived);
    }
  });

  it("round-trips one example line", () => {
    const line = "WR-003-T1: given as of 2026-03-14; date_of_birth=\"2007-03-15\" => 18";
    const t = engine.parseTestLine(line);
    expect(t).toEqual({
      id: "WR-003-T1", as_of: "2026-03-14", given: { date_of_birth: "2007-03-15" }, expect: 18,
    });
    expect(engine.formatTest(t)).toBe(line);
  });

  it("reports an unreadable field", () => {
    const r = engine.parseItemBlock("Wobble".padEnd(14) + "yes\n");
    expect(r.errors).toEqual([{ line: 1, msg: 'unknown field "Wobble"' }]);
  });
});
