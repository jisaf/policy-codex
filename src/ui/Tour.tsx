import { signal, useSignal } from "@preact/signals";
import { useLayoutEffect } from "preact/hooks";
import type { Route } from "./router";
import { navigate } from "./state";

export const TOUR_KEY = "codex.tour";

function tourSeen(): boolean {
  try { return localStorage.getItem(TOUR_KEY) === "1"; } catch { return true; }
}

function markSeen(): void {
  try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* blocked */ }
}

/** Whether the tour overlay is open. Exported so the start view's "Take the
 *  tour" link and the door picker's first-visit check can drive it without
 *  reaching into the component. */
export const tourOpenSig = signal(false);

export function startTour(): void {
  tourOpenSig.value = true;
}

/** Called once, when a first-time visitor reaches the start view: the tour
 *  is "shown once" (docs/design-onboarding.md), so a returning visitor who
 *  has already seen it (or dismissed it) only gets it back through "Take the
 *  tour". */
export function offerTourOnFirstVisit(): void {
  if (!tourSeen()) startTour();
}

interface TourStep {
  /** A CSS selector for the real element this step is about, highlighted
   *  when present; nothing is scraped or clicked through it. */
  target: string;
  body: string;
  /** The route this step's target lives on; entered when the step becomes
   *  current, never by simulating a click on the real nav. */
  go: Partial<Route> | null;
}

// Programs -> open Medicaid -> Cases -> open C-01 -> click the outcome
// (docs/design-onboarding.md, "Guided first run, hints, help").
const STEPS: TourStep[] = [
  {
    target: 'nav.primary a[href*="/program"]',
    body: "Programs shows what each program decides, in plain language.",
    go: null,
  },
  {
    target: ".tabs a.on",
    body: "Medicaid: its outcomes, the cases that test it, and the rules behind it.",
    go: { view: "program", arg: "Medicaid", params: {} },
  },
  {
    target: 'nav.primary a[href*="/cases"]',
    body: "Cases shows real households, evaluated end to end.",
    go: { view: "cases", arg: null, params: {} },
  },
  {
    target: "table.expectations",
    body: "This household's facts, and the expectations checked against it.",
    go: { view: "cases", arg: "C-01", params: {} },
  },
  {
    target: "tr.expectation",
    body: "Click an outcome's row to see the story behind its value.",
    go: null,
  },
];

/** Toggles a highlight class on the step's real target, when the current
 *  page happens to have it, so the tour points at something real without
 *  driving the page through it. */
function highlight(selector: string): () => void {
  let el: Element | null = null;
  try { el = document.querySelector(selector); } catch { el = null; }
  if (el) el.classList.add("tour-target");
  return () => { if (el) el.classList.remove("tour-target"); };
}

export function Tour() {
  const step = useSignal(0);

  useLayoutEffect(() => {
    if (!tourOpenSig.value) return;
    step.value = 0;
    navigate(STEPS[0].go ?? {});
  }, [tourOpenSig.value]);

  useLayoutEffect(() => {
    if (!tourOpenSig.value) return;
    return highlight(STEPS[step.value].target);
  }, [tourOpenSig.value, step.value]);

  if (!tourOpenSig.value) return null;

  const s = STEPS[step.value];
  const last = step.value === STEPS.length - 1;

  const finish = () => {
    markSeen();
    tourOpenSig.value = false;
  };

  const next = () => {
    if (last) { finish(); return; }
    const to = STEPS[step.value + 1];
    step.value += 1;
    if (to.go) navigate(to.go);
  };

  return (
    <div class="tourbox" role="dialog" aria-label="Guided tour">
      <p class="tourstep">Step {step.value + 1} of {STEPS.length}</p>
      <p>{s.body}</p>
      <div class="actions">
        <button class="btn tour-next" onClick={next}>{last ? "Done" : "Next"}</button>
        <button class="btn linkish tour-skip" onClick={finish}>Skip tour</button>
      </div>
    </div>
  );
}
