import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { startTour, Tour, tourOpenSig, TOUR_KEY } from "../../src/ui/Tour";
import { StartView } from "../../src/ui/StartView";
import { defaultRoute, parseHash } from "../../src/ui/router";
import { engineSig, modeSig, route, volumeSig } from "../../src/ui/state";
import { ItemView } from "../../src/ui/ItemView";
import { TokenPopover } from "../../src/ui/Rich";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

function show() {
  const host = document.createElement("div");
  render(<Tour />, host);
  return host;
}

async function tick() {
  await new Promise((r) => setTimeout(r));
}

describe("Tour", () => {
  beforeEach(() => {
    try { localStorage.removeItem(TOUR_KEY); } catch { /* ignore */ }
    tourOpenSig.value = false;
    route.value = { ...defaultRoute(), view: "start" };
    location.hash = "#/mwr/start";
  });

  it("renders nothing until started", () => {
    expect(show().textContent).toBe("");
  });

  it("walks Programs, Medicaid, Cases, C-01, the outcome, then tokens, the card, the trace, the record, and the editor switch, ten steps, without leaving the start view for step 1", async () => {
    startTour();
    const host = show();
    await tick();
    expect(host.textContent).toContain("Step 1 of 10");
    // MAJOR fix: the first step must not navigate away from the start view.
    expect(location.hash).toBe("#/mwr/start");

    const next = () => (host.querySelector("button.tour-next") as HTMLButtonElement).click();

    next();
    await tick();
    expect(host.textContent).toContain("Step 2 of 10");
    expect(location.hash).toBe("#/mwr/program/Medicaid");

    next();
    await tick();
    expect(host.textContent).toContain("Step 3 of 10");
    expect(location.hash).toBe("#/mwr/cases");

    next();
    await tick();
    expect(host.textContent).toContain("Step 4 of 10");
    expect(location.hash).toBe("#/mwr/cases/C-01");

    next();
    await tick();
    expect(host.textContent).toContain("Step 5 of 10");
    // A real interaction (clicking the outcome), not a further navigation:
    // the hash stays on the case just opened.
    expect(location.hash).toBe("#/mwr/cases/C-01");

    next();
    await tick();
    expect(host.textContent).toContain("Step 6 of 10");
    expect(location.hash).toBe("#/mwr/item/WR-200");
    expect(host.textContent).toContain("token");

    next();
    await tick();
    expect(host.textContent).toContain("Step 7 of 10");
    expect(host.textContent).toContain("definition card");

    next();
    await tick();
    expect(host.textContent).toContain("Step 8 of 10");
    expect(host.textContent).toContain("Trace to source");

    next();
    await tick();
    expect(host.textContent).toContain("Step 9 of 10");
    expect(location.hash).toContain("#/mwr/item/WR-200");
    expect(location.hash).toContain("section=record");

    next();
    await tick();
    expect(host.textContent).toContain("Step 10 of 10");
    // Reader mode: the tour points at the switch rather than flipping it.
    expect(host.textContent).toContain("Turn on edit mode");
    expect((host.querySelector("button.tour-next") as HTMLButtonElement).textContent).toBe("Done");

    expect(tourOpenSig.value).toBe(true);
    next();
    await tick();
    expect(tourOpenSig.value).toBe(false);
    expect(localStorage.getItem(TOUR_KEY)).toBe("1");
  });

  it("skipping at any point sets the flag and closes the tour", async () => {
    startTour();
    const host = show();
    await tick();
    (host.querySelector("button.tour-skip") as HTMLButtonElement).click();
    await tick();
    expect(tourOpenSig.value).toBe(false);
    expect(localStorage.getItem(TOUR_KEY)).toBe("1");
  });

  it("first visit at '#/' renders the four doors with the tour open", async () => {
    const host = document.createElement("div");
    render(
      <>
        <StartView />
        <Tour />
      </>,
      host,
    );
    await tick();
    expect(tourOpenSig.value).toBe(true);
    expect(host.querySelectorAll(".doors .door").length).toBe(4);
    expect(location.hash).toBe("#/mwr/start");
  });
});

describe("Tour on a mounted item page", () => {
  it("opens the definition card on the first token at the card step and closes it when the tour ends", async () => {
    try { localStorage.removeItem(TOUR_KEY); } catch { /* ignore */ }
    const items = ledger.items as unknown as Item[];
    const engine = createEngine(items, ledger.meta as unknown as VolumeMeta, refs);
    volumeSig.value = {
      volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "main", sha: null,
      meta: engine.meta, items, sources: [], openQuestions: [], documents: [], cases: [],
      casesText: null, sourcesText: "", chapterOf: { "WR-200": "medicaid" },
    } as unknown as LoadedVolume;
    engineSig.value = engine;
    modeSig.value = "read";
    const host = document.createElement("div");
    // The tour's demonstrations query the document, so the page must be in it.
    document.body.appendChild(host);
    function Page() {
      return <><ItemView /><TokenPopover /><Tour /></>;
    }
    startTour();
    render(<Page />, host);
    await tick();
    // No router is started in tests, so mirror what startRouter does on
    // hashchange: the route signal follows the address bar.
    const next = async () => {
      (host.querySelector("button.tour-next") as HTMLButtonElement).click();
      route.value = parseHash(location.hash);
      await tick(); await tick(); await tick();
    };
    for (let i = 0; i < 5; i++) await next();           // -> step 6, item WR-200
    expect(host.querySelector(".derivation button.tok[data-id]")).not.toBeNull();
    await next();                                          // -> step 7, card opened on the first token
    expect(host.querySelector(".tokpop")).not.toBeNull();
    expect(host.querySelector(".tokpop-actions a[href*='section=record']")).not.toBeNull();
    await next();                                          // -> step 8, trace to source (card still open)
    expect(host.querySelector(".tokpop")).not.toBeNull();
    await next();                                          // -> step 9, record page, card closed
    expect(host.querySelector(".tokpop")).toBeNull();
    expect(host.querySelector("details.section[open] > summary")?.textContent).toContain("Decision record");
    await next();                                          // -> step 10
    (host.querySelector("button.tour-next") as HTMLButtonElement).click();
    await tick();
    expect(tourOpenSig.value).toBe(false);
    expect(host.querySelector(".tokpop")).toBeNull();
    render(null, host);
    host.remove();
  });
});
