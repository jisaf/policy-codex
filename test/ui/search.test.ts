import { describe, it, expect } from "vitest";
import { buildSearchIndex, groupHits, hitHash, search } from "../../src/ui/search";
import { defaultRoute } from "../../src/ui/router";
import { createEngine } from "../../src/engine/engine";
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
  sources: [{ id: "S12", title: "ABAWD time limit", citation: "7 U.S.C. 2015(o)", text: "abawd text" }],
  openQuestions: [{ id: "OQ-13", title: "SNAP ABAWD upper age", body: "…", items: ["WR-121"] }],
  chapterOf: {},
} as unknown as LoadedVolume;

const index = buildSearchIndex(vol, engine);

describe("search", () => {
  it("indexes items, sources, and questions", () => {
    expect(index.entries.filter((e) => e.kind === "item")).toHaveLength(138);
    expect(index.entries.filter((e) => e.kind === "source")).toHaveLength(1);
    expect(index.entries.filter((e) => e.kind === "question")).toHaveLength(1);
  });

  it("finds an item by identifier and by name", () => {
    expect(search(index, "date_of_birth")[0].id).toBe("WR-001");
    expect(search(index, "Date of Birth")[0].id).toBe("WR-001");
  });

  it("finds a source and a question by their text", () => {
    const hits = search(index, "abawd");
    expect(hits.some((h) => h.kind === "source" && h.id === "S12")).toBe(true);
    expect(hits.some((h) => h.kind === "question" && h.id === "OQ-13")).toBe(true);
  });

  it("finds an item by its derivation text", () => {
    expect(search(index, "whole years between").some((h) => h.id === "WR-003")).toBe(true);
  });

  it("returns nothing for a blank query", () => {
    expect(search(index, "   ")).toEqual([]);
  });

  it("groups hits by kind and builds a hash per hit", () => {
    const grouped = groupHits(search(index, "abawd"));
    expect(Object.keys(grouped)).toEqual(["item", "source", "question"]);
    const src = grouped.source[0];
    expect(hitHash(src, defaultRoute())).toBe("#/mwr/source/S12");
  });
});
