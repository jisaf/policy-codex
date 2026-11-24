import { describe, it, expect } from "vitest";
import { coneOf, defaultGraphOptions, layoutGraph, readGraphOptions } from "../../src/ui/graphLayout";
import { defaultRoute } from "../../src/ui/router";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);

describe("graph layout", () => {
  it("defaults to derived facts across all three programs", () => {
    expect(defaultGraphOptions()).toEqual({
      includeSupplied: false, includeParameters: false,
      programs: ["All", "Medicaid", "SNAP"], focus: null, coneOnly: false,
    });
  });

  it("reads options from the query", () => {
    const r = {
      ...defaultRoute(), view: "graph" as const,
      params: { focus: "age", supplied: "1", programs: "Medicaid", cone: "1" },
    };
    expect(readGraphOptions(r)).toEqual({
      includeSupplied: true, includeParameters: false,
      programs: ["Medicaid"], focus: "age", coneOnly: true,
    });
  });

  it("lays out only derived facts by default", () => {
    const layout = layoutGraph(engine, defaultGraphOptions());
    expect(layout.nodes).toHaveLength(53);
    expect(layout.nodes.every((n) => n.kind === "derived")).toBe(true);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
  });

  it("includes supplied facts and parameters when asked", () => {
    const layout = layoutGraph(engine, {
      ...defaultGraphOptions(), includeSupplied: true, includeParameters: true,
    });
    expect(layout.nodes).toHaveLength(138);
  });

  it("computes the upstream and downstream cone of a node", () => {
    const cone = coneOf(engine, "age");
    expect([...cone.up].sort()).toEqual(["date_of_birth", "determination_date"]);
    expect(cone.down.has("medicaid_is_dependent_child")).toBe(true);
    expect(cone.down.has("age")).toBe(false);
  });

  it("marks relations and can restrict to the cone", () => {
    const layout = layoutGraph(engine, {
      ...defaultGraphOptions(), includeSupplied: true, includeParameters: true,
      focus: "age", coneOnly: true,
    });
    const ids = layout.nodes.map((n) => n.identifier);
    expect(ids).toContain("age");
    expect(ids).toContain("date_of_birth");
    expect(ids).not.toContain("is_pregnant");
    expect(layout.nodes.find((n) => n.identifier === "age")!.relation).toBe("focus");
    expect(layout.nodes.find((n) => n.identifier === "date_of_birth")!.relation).toBe("upstream");
    expect(layout.edges.some((e) => e.relation === "upstream")).toBe(true);
  });

  it("gives every edge at least two points", () => {
    const layout = layoutGraph(engine, defaultGraphOptions());
    expect(layout.edges.length).toBeGreaterThan(0);
    expect(layout.edges.every((e) => e.points.length >= 2)).toBe(true);
  });
});
