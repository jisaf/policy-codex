import { describe, it, expect } from "vitest";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import constraintFixtures from "../fixtures/constraints.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const engine = createEngine(
  ledger.items as unknown as Item[],
  ledger.meta as unknown as VolumeMeta,
  refs,
);

describe("constraints", () => {
  it("reproduces every fixture constraint report and approver list", () => {
    for (const c of constraintFixtures) {
      const item = engine.itemById(c.id)!;
      expect(engine.approvals(item), c.id).toEqual(c.approval);
      expect(
        engine.constraints(item).map((r) => ({ ok: r.ok, level: r.level, msg: r.msg })),
        c.id,
      ).toEqual(c.report);
    }
  });

  it("skips citation existence checks when no refs are supplied", () => {
    const bare = createEngine(
      ledger.items as unknown as Item[],
      ledger.meta as unknown as VolumeMeta,
      null,
    );
    const item = bare.item("medicaid_in_ce_age_range")!;
    expect(bare.constraints(item).some((r) => r.msg === "Source S1 exists")).toBe(false);
    expect(engine.constraints(engine.item("medicaid_in_ce_age_range")!)
      .some((r) => r.msg === "Source S1 exists")).toBe(true);
  });

  it("rejects a duplicate identifier on a new item", () => {
    const draft: Item = {
      id: "WR-900", name: "Age", identifier: "age", kind: "supplied",
      type: "whole number", scope: "person", program: "All",
      meaning: "A duplicate of an existing identifier for the clash check.",
      supplied_by: "Test.", sources: [],
    };
    const clash = engine.constraints(draft).find((r) => r.msg.includes("already belongs to"));
    expect(clash?.ok).toBe(false);
    expect(clash?.msg).toContain("WR-003");
  });
});

describe("versioned parameters", () => {
  it("accepts dated versions in place of a single value, but not both", async () => {
    const { buildIndex } = await import("../../src/engine/ledger-index");
    const { constraints } = await import("../../src/engine/constraints");
    const meta = {
      volume: "t", title: "t", version: "0", status: "", default_as_of: "2026-10-01",
      approval_policy: { roles: [], by_program: {}, by_kind: {}, by_tag: {} },
      types: ["money"], scopes: ["global" as const],
    };
    const base = { id: "V-1", name: "Cap", identifier: "cap", kind: "parameter" as const, type: "money", scope: "global" as const, program: "SNAP", meaning: "A capped amount stated by the memo.", sources: ["S1"] };
    const ix = buildIndex([base]);
    const refs = { sourceIds: ["S1"], questionIds: [] };
    const fails = (it: object) => constraints(ix, meta, refs, it as never).filter((c) => !c.ok).map((c) => c.msg);
    expect(fails({ ...base, versions: [{ from: "2025-10-01", value: 744 }] })).toEqual([]);
    expect(fails({ ...base, value: 744 })).toEqual([]);
    expect(fails({ ...base })).toContain("Parameter has a value");
    expect(fails({ ...base, value: 1, versions: [{ from: "2025-10-01", value: 744 }] }))
      .toContain("Parameter has a value");
  });
});
