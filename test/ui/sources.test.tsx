import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { SourcesView, citingItems } from "../../src/ui/SourcesView";
import { SearchView } from "../../src/ui/SearchView";
import { buildSearchIndex } from "../../src/ui/search";
import { createEngine } from "../../src/engine/engine";
import { engineSig, route, searchIndexSig, volumeSig } from "../../src/ui/state";
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
  sources: [
    { id: "S1", title: "Applicable individual", citation: "42 U.S.C. 1396a", text: "the term applicable individual" },
    { id: "S2", title: "Specified excluded individual", citation: "42 U.S.C. 1396a(ii)", text: "specified excluded" },
  ],
  openQuestions: [],
  chapterOf: {},
} as unknown as LoadedVolume;

describe("SourcesView", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
    route.value = { ...defaultRoute(), view: "source" };
  });

  it("lists which items cite a source", () => {
    const citing = citingItems(engine, "S1");
    expect(citing.map((i) => i.id)).toContain("WR-200");
  });

  it("renders every excerpt with its citing items", () => {
    const host = document.createElement("div");
    render(<SourcesView />, host);
    expect(host.querySelectorAll("article.source")).toHaveLength(2);
    expect(host.textContent).toContain("S1. Applicable individual");
    expect(host.textContent).toContain("42 U.S.C. 1396a");
  });

  it("names each citing item with a token", () => {
    const host = document.createElement("div");
    render(<SourcesView />, host);
    const cited = host.querySelector("article.source .cited-by")!;
    const tok = [...cited.querySelectorAll("button.tok")].find(
      (b) => b.textContent === "Medicaid: is in the community engagement age range",
    ) as HTMLButtonElement;
    expect(tok).toBeDefined();
    expect(tok.getAttribute("data-id")).toBe("WR-200");
  });

  it("opens one source expanded when the route names it", () => {
    route.value = { ...defaultRoute(), view: "source", arg: "S2" };
    const host = document.createElement("div");
    render(<SourcesView />, host);
    const open = [...host.querySelectorAll("article.source details")]
      .filter((d) => (d as HTMLDetailsElement).open);
    expect(open).toHaveLength(1);
    expect(open[0].textContent).toContain("specified excluded");
  });
});

describe("SearchView", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
    searchIndexSig.value = buildSearchIndex(vol, engine);
  });

  it("shows grouped results for the query in the URL", () => {
    route.value = { ...defaultRoute(), view: "search", params: { q: "applicable individual" } };
    const host = document.createElement("div");
    render(<SearchView />, host);
    expect(host.textContent).toContain("Rules");
    expect(host.textContent).toContain("Documents and excerpts");
    expect(host.textContent).toContain("Applicable individual");
    // Grouped by type, in the results page's order.
    const groups = [...host.querySelectorAll("section.group")].map((g) => g.getAttribute("data-group"));
    expect(groups).toEqual(["rule", "figure", "document"]);
  });

  it("makes the identifier in a result row a token, leaving the name as the link", () => {
    route.value = { ...defaultRoute(), view: "search", params: { q: "date of birth" } };
    const host = document.createElement("div");
    render(<SearchView />, host);
    // A supplied fact is listed under Facts.
    const li = host.querySelector('section[data-group="fact"] ul.hits li')!;
    expect(li.querySelector("a b")!.textContent).toBe("Date of Birth");
    const tok = li.querySelector("small button.tok") as HTMLButtonElement;
    expect(tok.textContent).toBe("date_of_birth");
    expect(li.querySelector("small")!.textContent).toContain("WR-001 · date_of_birth");
  });

  it("says so when nothing matches", () => {
    route.value = { ...defaultRoute(), view: "search", params: { q: "zzzzz" } };
    const host = document.createElement("div");
    render(<SearchView />, host);
    expect(host.textContent).toContain('Nothing has every word of "zzzzz".');
  });
});
