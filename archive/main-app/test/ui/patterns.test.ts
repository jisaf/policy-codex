import { describe, it, expect } from "vitest";
import {
  nodeAt, optionsFor, setAt, spliceAt, template, typeOk,
} from "../../src/ui/patterns";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const ctx = { root: true, monthOk: false, personOk: false, ctxType: "yes/no" };

describe("pattern tables", () => {
  it("accepts a value where a slot allows it", () => {
    expect(typeOk("yes/no", "yes/no")).toBe(true);
    expect(typeOk("ord", "date")).toBe(true);
    expect(typeOk("ord", "text")).toBe(false);
    expect(typeOk("*", "anything")).toBe(true);
  });

  it("offers only facts a yes/no slot can hold", () => {
    const o = optionsFor(engine, "yes/no", ctx, "");
    expect(o.facts.every((f) => engine.baseType(f) === "yes/no")).toBe(true);
    expect(o.facts.some((f) => f.identifier === "is_pregnant")).toBe(true);
    expect(o.pats).toContain("all");
    expect(o.pats).not.toContain("first_day");
  });

  it("hides per-month facts outside a month context and shows them inside one", () => {
    const outside = optionsFor(engine, "yes/no", ctx, "");
    expect(outside.facts.some((f) => f.scope === "person-month")).toBe(false);
    const inside = optionsFor(engine, "yes/no", { ...ctx, monthOk: true }, "");
    expect(inside.facts.some((f) => f.scope === "person-month")).toBe(true);
    const months = optionsFor(engine, "month", { ...ctx, monthOk: true }, "");
    expect(months.consts.map(([k]) => k)).toContain("month");
  });

  it("never offers the item being edited as its own input", () => {
    const o = optionsFor(engine, "*", { ...ctx, ctxType: "*" }, "is_pregnant");
    expect(o.facts.some((f) => f.identifier === "is_pregnant")).toBe(false);
  });

  it("templates a pattern with empty slots", () => {
    expect(template("all")).toEqual(["all", null, null]);
    expect(template("case")).toEqual(["case", [null, null], ["else", null]]);
    expect(template("rel")).toEqual(["rel", ["parent"], ["P"]]);
    expect(template("det_date")).toEqual(["det_date"]);
  });

  it("reads and writes a node at a path without mutating the original", () => {
    const root = ["all", ["not", "is_pregnant"], null];
    expect(nodeAt(root, [1, 1])).toBe("is_pregnant");
    const next = setAt(root, [2], true);
    expect(next).toEqual(["all", ["not", "is_pregnant"], true]);
    expect(root[2]).toBeNull();
  });

  it("splices an n-ary operand list", () => {
    const root = ["all", true, false];
    expect(spliceAt(root, [], 3, 0, null)).toEqual(["all", true, false, null]);
    expect(spliceAt(root, [], 1, 1)).toEqual(["all", false]);
  });
});
