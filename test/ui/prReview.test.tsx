import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { PrReview } from "../../src/ui/PrReview";
import { createEngine } from "../../src/engine/engine";
import {
  engineSig, prBaseEngineSig, prBaseVolumeSig, pullRequestSig, route, trayOpenSig, volumeSig,
} from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const items = ledger.items as unknown as Item[];
const meta = ledger.meta as unknown as VolumeMeta;
const baseEngine = createEngine(items, meta, refs);
const headItems = items.map((i) =>
  i.id === "WR-003" ? { ...i, meaning: "Restated meaning for the review test." } : i);
const headEngine = createEngine(headItems, meta, refs);

const asVolume = (list: Item[]) => ({
  volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "pr/12", sha: null,
  meta, items: list, sources: [], openQuestions: [], chapterOf: { "WR-003": "medicaid" },
} as unknown as LoadedVolume);

describe("PrReview", () => {
  beforeEach(() => {
    route.value = { ...defaultRoute(), ref: "pr/12" };
    trayOpenSig.value = true;
    volumeSig.value = asVolume(headItems);
    engineSig.value = headEngine;
    prBaseVolumeSig.value = asVolume(items);
    prBaseEngineSig.value = baseEngine;
    pullRequestSig.value = {
      number: 12, title: "Codex: 1 item in mwr", body: "b", headRef: "codex/mwr/ab12cd",
      headSha: "h", baseRef: "main", state: "open",
      url: "https://github.com/jisaf/policy-codex/pull/12",
    };
  });

  it("renders one diff card per changed item", () => {
    const host = document.createElement("div");
    render(<PrReview />, host);
    expect(host.querySelectorAll("article.diff")).toHaveLength(1);
    expect(host.textContent).toContain("WR-003");
    expect(host.textContent).toContain("Restated meaning for the review test.");
  });

  it("shows the head test results and the impact set", () => {
    const host = document.createElement("div");
    render(<PrReview />, host);
    expect(host.textContent).toContain("4 of 4 examples pass on the head");
    expect(host.querySelector(".impact")!.textContent).toContain("medicaid_is_dependent_child");
  });

  it("links out to the pull request on GitHub", () => {
    const host = document.createElement("div");
    render(<PrReview />, host);
    const link = [...host.querySelectorAll("a")]
      .find((a) => a.getAttribute("href")!.startsWith("https://github.com"));
    expect(link!.getAttribute("href")).toBe("https://github.com/jisaf/policy-codex/pull/12");
    expect(host.textContent).toContain("Comments and merge stay on GitHub.");
  });

  it("renders nothing off a pull request route", () => {
    route.value = defaultRoute();
    const host = document.createElement("div");
    render(<PrReview />, host);
    expect(host.textContent).toBe("");
  });
});
