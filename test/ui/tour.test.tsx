import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { startTour, Tour, tourOpenSig, TOUR_KEY } from "../../src/ui/Tour";
import { StartView } from "../../src/ui/StartView";
import { defaultRoute } from "../../src/ui/router";
import { route } from "../../src/ui/state";

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

  it("walks Programs, Medicaid, Cases, C-01, then the outcome, five steps total, without leaving the start view for step 1", async () => {
    startTour();
    const host = show();
    await tick();
    expect(host.textContent).toContain("Step 1 of 5");
    // MAJOR fix: the first step must not navigate away from the start view.
    expect(location.hash).toBe("#/mwr/start");

    const next = () => (host.querySelector("button.tour-next") as HTMLButtonElement).click();

    next();
    await tick();
    expect(host.textContent).toContain("Step 2 of 5");
    expect(location.hash).toBe("#/mwr/program/Medicaid");

    next();
    await tick();
    expect(host.textContent).toContain("Step 3 of 5");
    expect(location.hash).toBe("#/mwr/cases");

    next();
    await tick();
    expect(host.textContent).toContain("Step 4 of 5");
    expect(location.hash).toBe("#/mwr/cases/C-01");

    next();
    await tick();
    expect(host.textContent).toContain("Step 5 of 5");
    // The last step is a real interaction (clicking the outcome), not a
    // further navigation: the hash stays on the case just opened.
    expect(location.hash).toBe("#/mwr/cases/C-01");
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
