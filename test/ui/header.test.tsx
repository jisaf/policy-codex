import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { Header } from "../../src/ui/Header";
import { buildSearchIndex } from "../../src/ui/search";
import { createEngine } from "../../src/engine/engine";
import {
  doorSig, engineSig, modeSig, route, searchIndexSig, volumeSig,
} from "../../src/ui/state";
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
    modeSig.value = "read";
    doorSig.value = null;
  });

  it("puts Programs, Cases, and Search in the primary nav", () => {
    const host = document.createElement("div");
    render(<Header />, host);
    const links = [...host.querySelectorAll("nav.primary a")];
    const labels = links.map((a) => a.textContent);
    expect(labels).toEqual(["Programs", "Cases", "Search"]);
    const programs = links.find((a) => a.textContent === "Programs")!;
    expect(programs.getAttribute("href")).toContain("/program/Medicaid");
  });

  it("puts Table, Graph, Sources, and Documents in the Browse dropdown", () => {
    const host = document.createElement("div");
    render(<Header />, host);
    const links = [...host.querySelectorAll("details.browse a")];
    const labels = links.map((a) => a.textContent);
    expect(labels).toEqual(["Table", "Graph", "Sources", "Documents"]);
    const docs = links.find((a) => a.textContent === "Documents")!;
    expect(docs.getAttribute("href")).toBe("#/mwr/documents");
  });

  it("adds Handoff to the primary nav for the engineer door only", () => {
    doorSig.value = "engineer";
    const host = document.createElement("div");
    render(<Header />, host);
    const links = [...host.querySelectorAll("nav.primary a")];
    expect(links.map((a) => a.textContent)).toEqual(["Programs", "Cases", "Search", "Handoff"]);
    const handoff = links.find((a) => a.textContent === "Handoff")!;
    expect(handoff.getAttribute("href")).toBe("#/mwr/handoff");

    doorSig.value = "reader";
    render(<Header />, host);
    expect([...host.querySelectorAll("nav.primary a")].map((a) => a.textContent))
      .not.toContain("Handoff");
  });

  it("sends the brand link and the 'change how you use this' link to start", () => {
    const host = document.createElement("div");
    render(<Header />, host);
    expect((host.querySelector("a.brand") as HTMLAnchorElement).getAttribute("href"))
      .toBe("#/mwr/start");
    const footLink = [...host.querySelectorAll(".hdrfoot a")].find(
      (a) => a.textContent === "change how you use this",
    )!;
    expect(footLink.getAttribute("href")).toBe("#/mwr/start");
  });

  it("hides edit controls in read mode and shows them in edit mode", () => {
    modeSig.value = "read";
    const host = document.createElement("div");
    render(<Header />, host);
    expect(host.textContent).not.toContain("New item");
    expect([...host.querySelectorAll("button")].some((b) => b.textContent!.startsWith("Tray")))
      .toBe(false);
    expect(host.textContent).not.toContain("Settings");
    expect(host.textContent).toContain("Turn on edit mode");

    modeSig.value = "edit";
    render(<Header />, host);
    expect(host.textContent).toContain("New item");
    expect([...host.querySelectorAll("button")].some((b) => b.textContent!.startsWith("Tray")))
      .toBe(true);
    expect(host.textContent).toContain("Settings");
    expect(host.textContent).toContain("Turn off edit mode");
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
