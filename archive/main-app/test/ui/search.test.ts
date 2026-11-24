import { describe, it, expect } from "vitest";
import { buildSearchIndex, groupHits, groupResults, hitHash, RESULT_GROUPS, search, wordsMatch } from "../../src/ui/search";
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

  it("groups hits by kind and builds a hash per hit to its canonical page", () => {
    const grouped = groupHits(search(index, "abawd"));
    expect(Object.keys(grouped)).toEqual(["item", "source", "question", "resolved", "household", "document"]);
    const src = grouped.source[0];
    expect(hitHash(src, defaultRoute())).toBe("#/mwr/law/sources/S12");
  });

  it("groups the results page by type: rules, figures, facts, questions, households, documents", () => {
    const g = groupResults(search(index, "abawd", 300));
    expect(Object.keys(g)).toEqual([...RESULT_GROUPS]);
    expect(g.rule.every((h) => h.kind === "item")).toBe(true);
    expect(g.document.some((h) => h.id === "S12")).toBe(true);
    expect(g.question.some((h) => h.id === "OQ-13")).toBe(true);
    // An item lands under its kind: a parameter is a figure, a supplied fact a fact.
    const kinds = new Map((ledger.items as Array<{ id: string; kind: string }>).map((i) => [i.id, i.kind]));
    for (const h of [...g.rule, ...g.figure, ...g.fact]) {
      const k = kinds.get(h.id);
      expect(h.group).toBe(k === "parameter" ? "figure" : k === "supplied" ? "fact" : "rule");
    }
  });

  it("matches every word in any order, not the phrase", () => {
    // "years whole" is not a phrase anywhere, but both words are in WR-003.
    expect(search(index, "years whole", 300).some((h) => h.id === "WR-003")).toBe(true);
    expect(wordsMatch("Income limit for children", "children income limit")).toBe(true);
    expect(wordsMatch("Income limit for children", "children asset limit")).toBe(false);
  });

  it("indexes stored households and documents, each with its canonical page", () => {
    const withCases = buildSearchIndex({
      ...vol,
      cases: [{ id: "C-07", title: "A grandmother raising two grandchildren", as_of: "2026-01-01", persons: { p1: {} }, expect: {} }],
      documents: [{ id: "D-4", title: "Food and Nutrition Act", kind: "statute", citation: "7 U.S.C. 2011", file: "documents/D-4.md" }],
    } as unknown as LoadedVolume, engine);
    const hh = search(withCases, "grandmother")[0];
    expect(hh.group).toBe("household");
    expect(hitHash(hh, defaultRoute())).toBe("#/mwr/households/C-07");
    const doc = search(withCases, "nutrition act").find((h) => h.kind === "document")!;
    expect(doc.group).toBe("document");
    expect(hitHash(doc, defaultRoute())).toBe("#/mwr/law/doc/D-4");
  });
});
