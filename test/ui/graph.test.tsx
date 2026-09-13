import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { GraphView } from "../../src/ui/GraphView";
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
  meta: ledger.meta, items: ledger.items, sources: [], openQuestions: [], chapterOf: {},
} as unknown as LoadedVolume;

describe("GraphView", () => {
  beforeEach(() => {
    route.value = { ...defaultRoute(), view: "graph" };
    volumeSig.value = vol;
    engineSig.value = engine;
    location.hash = "";
  });

  it("shows a prompt instead of the graph when nothing is in focus", () => {
    const host = document.createElement("div");
    render(<GraphView />, host);
    expect(host.querySelector("svg")).toBeNull();
    expect(host.textContent).toContain(
      "Pick an item to see what feeds it, or show the whole ledger.",
    );
    expect(host.querySelector("button.whole")).not.toBeNull();
  });

  it("draws one node group per derived fact once Whole ledger is asked for", async () => {
    const host = document.createElement("div");
    render(<GraphView />, host);
    (host.querySelector("button.whole") as HTMLButtonElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await new Promise((r) => setTimeout(r));
    expect(host.querySelectorAll("g.node")).toHaveLength(53);
    expect(host.textContent).toContain("53 nodes");
  });

  it("focuses a node on click by writing the focus into the URL", async () => {
    const host = document.createElement("div");
    render(<GraphView />, host);
    (host.querySelector("button.whole") as HTMLButtonElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await new Promise((r) => setTimeout(r));
    (host.querySelector("g.node") as SVGGElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(location.hash).toContain("focus=");
  });

  it("opens straight on the cone when an item is in focus, with the focused item's panel", () => {
    route.value = { ...defaultRoute(), view: "graph", params: { focus: "age" } };
    const host = document.createElement("div");
    render(<GraphView />, host);
    // No "Whole ledger" prompt is needed: a focus opens the graph directly.
    expect(host.querySelector("svg")).not.toBeNull();
    expect((host.querySelector('input[type=checkbox]') as HTMLInputElement)).toBeTruthy();
    const coneBox = [...host.querySelectorAll("label")].find(
      (l) => l.textContent!.includes("cone only"),
    )!.querySelector("input") as HTMLInputElement;
    expect(coneBox.checked).toBe(true);
    expect(host.querySelector(".gpanel")!.textContent).toContain("Age");
    expect(host.querySelector(".gpanel")!.textContent).toContain("date_of_birth");
  });
});
