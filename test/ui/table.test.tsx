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

// The fixture ledger predates the declared tag vocabulary; the tag ids
// supplied here are exactly the ones its items already carry (see the
// vocabulary in volumes/mwr/volume.yaml), so the tag filter has something
// declared to list without changing which items any test sees.
const meta: VolumeMeta = {
  ...(ledger.meta as unknown as VolumeMeta), tags: ["legal", "medical", "state_election"],
};
const engine = createEngine(ledger.items as unknown as Item[], meta, refs);
const vol = {
  volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "main", sha: null,
  meta, items: ledger.items,
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
      kind: "", program: "", scope: "", open: "", state: "", tags: "", group: "",
      sort: "id", dir: "asc",
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
      ["WR-003", "WR-004", "WR-207", "WR-225", "WR-228", "WR-315"].sort(),
    );
  });

  it("sorts by name descending when asked", () => {
    const rows = filterItems(engine, { ...readFilters(route.value), sort: "name", dir: "desc" });
    expect(rows[0].name.localeCompare(rows[1].name)).toBeGreaterThanOrEqual(0);
  });

  it("filters by tags with AND semantics", () => {
    const oneTag = filterItems(engine, { ...readFilters(route.value), tags: "legal" });
    expect(oneTag.length).toBeGreaterThan(1);
    expect(oneTag.every((i) => (i.tags ?? []).includes("legal"))).toBe(true);

    // WR-206 is the only fixture item carrying both "legal" and "medical".
    const bothTags = filterItems(engine, { ...readFilters(route.value), tags: "legal,medical" });
    expect(bothTags.map((i) => i.id)).toEqual(["WR-206"]);
  });

  it("filters by group, matching any tag declared under that parent", () => {
    const hierMeta: VolumeMeta = {
      ...(ledger.meta as unknown as VolumeMeta),
      tags: [
        { id: "docgroup" },
        { id: "legal", parent: "docgroup" },
        { id: "medical", parent: "docgroup" },
        { id: "state_election" },
      ],
    };
    const hierEngine = createEngine(ledger.items as unknown as Item[], hierMeta, refs);
    const f = { ...readFilters(route.value), group: "docgroup" };
    const rows = filterItems(hierEngine, f);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((i) => (i.tags ?? []).some((t) => t === "legal" || t === "medical")))
      .toBe(true);
    expect(rows.some((i) => (i.tags ?? []).includes("state_election"))).toBe(false);
  });

  it("renders a row per item with a link to the item view", () => {
    const host = document.createElement("div");
    render(<TableView />, host);
    expect(host.querySelectorAll("tbody tr")).toHaveLength(138);
    const first = host.querySelector("tbody tr a") as HTMLAnchorElement;
    expect(first.getAttribute("href")).toBe("#/mwr/item/WR-001");
    expect(host.textContent).toContain("138 items");
  });

  it("shows the name first (bold), then id and identifier in small type", () => {
    const host = document.createElement("div");
    render(<TableView />, host);
    const row = host.querySelector("tbody tr")!;
    expect(row.querySelector("a b")!.textContent).toBe("Date of Birth");
    expect(row.querySelector("small")!.textContent).toBe("WR-001 · date_of_birth");
  });

  it("makes the identifier in each row a token, leaving the name as the link", () => {
    const host = document.createElement("div");
    render(<TableView />, host);
    const row = host.querySelector("tbody tr")!;
    const tok = row.querySelector("small button.tok") as HTMLButtonElement;
    expect(tok.textContent).toBe("date_of_birth");
    expect(tok.className).toBe("tok fact");
    expect(tok.getAttribute("data-id")).toBe("WR-001");
    expect(row.querySelector("a")!.getAttribute("href")).toBe("#/mwr/item/WR-001");
  });

  it("offers a multi-select tag filter and narrows the rows when tags are picked", async () => {
    const host = document.createElement("div");
    render(<TableView />, host);
    const select = host.querySelector("select.tag-filter") as HTMLSelectElement;
    expect(select).not.toBeNull();
    const optionIds = [...select.options].map((o) => o.value);
    expect(optionIds).toEqual(["legal", "medical", "state_election"]);

    const legal = [...select.options].find((o) => o.value === "legal")!;
    legal.selected = true;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    expect(location.hash).toContain("tags=legal");
  });

  it("shows no group filter for a volume with a flat (non-hierarchical) tag vocabulary", () => {
    const host = document.createElement("div");
    render(<TableView />, host);
    const labels = [...host.querySelectorAll(".controls label")].map((l) => l.textContent ?? "");
    expect(labels.some((t) => t.startsWith("Group"))).toBe(false);
  });
});
