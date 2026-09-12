import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { Header } from "../../src/ui/Header";
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
  volumeId: "mwr", title: "Work requirements", path: "volumes/mwr", ref: "main", sha: null,
  meta: ledger.meta, items: ledger.items, sources: [], openQuestions: [], chapterOf: {},
} as unknown as LoadedVolume;

describe("Header", () => {
  beforeEach(() => {
    route.value = defaultRoute();
    volumeSig.value = vol;
    engineSig.value = engine;
    searchIndexSig.value = buildSearchIndex(vol, engine);
  });

  it("renders a link for every view, Programs and Documents among them", () => {
    const host = document.createElement("div");
    render(<Header />, host);
    const links = [...host.querySelectorAll("nav a")];
    const labels = links.map((a) => a.textContent);
    expect(labels.slice(0, 3)).toEqual(["Table", "Graph", "Cases"]);
    expect(labels).toContain("Programs");
    expect(labels).toContain("Sources");
    expect(labels).toContain("Documents");
    expect(labels.at(-1)).toBe("Search");
    const programs = links.find((a) => a.textContent === "Programs")!;
    expect(programs.getAttribute("href")).toContain("/program/Medicaid");
    const docs = links.find((a) => a.textContent === "Documents")!;
    expect(docs.getAttribute("href")).toBe("#/mwr/documents");
  });

  it("shows grouped results as the analyst types", async () => {
    const host = document.createElement("div");
    render(<Header />, host);
    const input = host.querySelector("input[type=search]") as HTMLInputElement;
    input.value = "date of birth";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    expect(host.querySelector(".results")!.textContent).toContain("Date of Birth");
  });

  it("shows the ref badge when a ref is selected", () => {
    route.value = { ...defaultRoute(), ref: "pr/12" };
    const host = document.createElement("div");
    render(<Header />, host);
    expect(host.textContent).toContain("pr/12");
  });
});
