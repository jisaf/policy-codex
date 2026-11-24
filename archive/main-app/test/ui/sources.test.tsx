import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { LawPage } from "../../src/ui/places/LawPage";
import { excerptMatches } from "../../src/ui/places/LawSources";
import { itemsCitingExcerpt } from "../../src/ui/counts";
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
  documents: [],
  cases: [],
  chapterOf: {},
} as unknown as LoadedVolume;

describe("Law › Sources", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
  });
  const show = (arg: string, params: Record<string, string> = {}) => {
    route.value = { ...defaultRoute(), volume: "mwr", view: "law", arg, params };
    const host = document.createElement("div");
    render(<LawPage />, host);
    return host;
  };

  it("lists which items cite an excerpt", () => {
    expect(itemsCitingExcerpt(engine, "S1").map((i) => i.id)).toContain("WR-200");
  });

  it("lists every excerpt, and finds them by every word, not a phrase", () => {
    expect(show("sources").querySelectorAll("ul.excerptlist li")).toHaveLength(2);
    expect(show("sources", { q: "excluded specified" }).querySelectorAll("ul.excerptlist li")).toHaveLength(1);
    expect(excerptMatches(vol.sources[0], "individual 1396a")).toBe(true);
    expect(excerptMatches(vol.sources[0], "individual 1396b")).toBe(false);
  });

  it("gives one excerpt its own page, with its text and the items that cite it", () => {
    const host = show("sources/S1");
    expect(host.querySelector("h1")!.textContent).toBe("Applicable individual");
    expect(host.querySelector("blockquote")!.textContent).toContain("the term applicable individual");
    expect(host.textContent).toContain("Medicaid: is in the community engagement age range");
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
