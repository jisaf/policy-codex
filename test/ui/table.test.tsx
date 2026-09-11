import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { TableView, filterItems, readFilters } from "../../src/ui/TableView";
import { createEngine } from "../../src/engine/engine";
import { engineSig, route, volumeSig } from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const vol = {
  volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "main", sha: null,
  meta: ledger.meta, items: ledger.items,
  sources: [], openQuestions: [{ id: "OQ-1", title: "Age during a month", body: "", items: ["WR-004"] }],
  chapterOf: {},
} as unknown as LoadedVolume;

describe("TableView", () => {
  beforeEach(() => {
    route.value = { ...defaultRoute(), view: "table" };
    volumeSig.value = vol;
    engineSig.value = engine;
  });

  it("reads defaults from an empty query", () => {
    expect(readFilters(route.value)).toEqual({
      kind: "", program: "", scope: "", open: "", state: "", sort: "id", dir: "asc",
    });
  });

  it("filters by kind and program", () => {
    const f = { ...readFilters(route.value), kind: "parameter", program: "Medicaid" };
    const rows = filterItems(engine, f);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((i) => i.kind === "parameter" && i.program === "Medicaid")).toBe(true);
  });

  it("filters to items with open questions and to invalid items", () => {
    expect(filterItems(engine, { ...readFilters(route.value), open: "any" })
      .every((i) => (i.open ?? []).length > 0)).toBe(true);
    expect(filterItems(engine, { ...readFilters(route.value), open: "OQ-1" })
      .map((i) => i.id)).toEqual(["WR-004"]);
    expect(filterItems(engine, { ...readFilters(route.value), state: "invalid" })
      .map((i) => i.id).sort()).toEqual(
      ["WR-003", "WR-004", "WR-101", "WR-207", "WR-225", "WR-228", "WR-315"].sort(),
    );
  });

  it("sorts by name descending when asked", () => {
    const rows = filterItems(engine, { ...readFilters(route.value), sort: "name", dir: "desc" });
    expect(rows[0].name.localeCompare(rows[1].name)).toBeGreaterThanOrEqual(0);
  });

  it("renders a row per item with a link to the item view", () => {
    const host = document.createElement("div");
    render(<TableView />, host);
    expect(host.querySelectorAll("tbody tr")).toHaveLength(138);
    const first = host.querySelector("tbody tr a") as HTMLAnchorElement;
    expect(first.getAttribute("href")).toBe("#/mwr/item/WR-001");
    expect(host.textContent).toContain("138 items");
  });
});
