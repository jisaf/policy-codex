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

  it("draws one node group per derived fact", () => {
    const host = document.createElement("div");
    render(<GraphView />, host);
    expect(host.querySelectorAll("g.node")).toHaveLength(53);
    expect(host.textContent).toContain("53 nodes");
  });

  it("focuses a node on click by writing the focus into the URL", () => {
    const host = document.createElement("div");
    render(<GraphView />, host);
    (host.querySelector("g.node") as SVGGElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(location.hash).toContain("focus=");
  });

  it("shows the focused item's panel", () => {
    route.value = { ...defaultRoute(), view: "graph", params: { focus: "age" } };
    const host = document.createElement("div");
    render(<GraphView />, host);
    expect(host.querySelector(".gpanel")!.textContent).toContain("Age");
    expect(host.querySelector(".gpanel")!.textContent).toContain("date_of_birth");
  });
});
