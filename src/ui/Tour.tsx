import { signal, useSignal } from "@preact/signals";
import { useLayoutEffect } from "preact/hooks";
import type { Route } from "./router";
import { closeEditor, editingSig, modeSig, navigate, openEditor } from "./state";
import { closePopover } from "./Rich";

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

/** The tour box's own rendered height in pixels, 0 while closed. The app
 *  root reads this to pad the page by the same amount, so the fixed box
 *  never sits over the last rows of a table instead of beside them. */
export const tourBoxHeightSig = signal(0);

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
  /** A small demonstration performed after the page has rendered: opening
   *  the definition card on the first token, or the editor. The tour does
   *  this itself so the visitor sees the thing described, not a promise. */
  act?: "open-token" | "close-popover" | "open-editor";
}

// Programs -> open Medicaid -> Cases -> open C-01 -> click the outcome
// (docs/design-onboarding.md, "Guided first run, hints, help").
const STEPS: TourStep[] = [
  {
    target: '.door[data-door="reader"]',
    body: "Pick a door to start. \"Read the rules for a program\" shows what each program decides, in plain language.",
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
  {
    target: ".derivation button.tok[data-id]",
    body: "Every coloured word is a token: a fact, a rule, a number set by policy, or a pattern phrase. Click one, anywhere in the app, to see what it means.",
    go: { view: "item", arg: "WR-200", params: {} },
  },
  {
    target: ".tokpop",
    body: "The definition card: what the token is, its type and scope, its meaning, and its value. \"Open definition\" goes to its own page.",
    go: null,
    act: "open-token",
  },
  {
    target: ".tokpop-actions a[href*=\"section=record\"]",
    body: "\"Trace to source\" walks back to the statute: the rationale, the excerpts cited, their documents, and the change history.",
    go: null,
  },
  {
    target: "details.section[open] > summary",
    body: "The decision record is where that trace lands. Every rule has one.",
    go: { view: "item", arg: "WR-200", params: { section: "record" } },
    act: "close-popover",
  },
  {
    target: ".edwrap",
    body: "In the editor the same tokens are painted as you type, with completion and a checker that flags problems live.",
    go: null,
    act: "open-editor",
  },
];

/** The editor step only opens the editor when the visitor already turned
 *  edit mode on; in reader mode it points at the switch instead of flipping
 *  it behind their back. */
function stepFor(index: number): TourStep {
  const s = STEPS[index];
  if (s.act === "open-editor" && modeSig.value !== "edit") {
    return {
      target: "button.mode-toggle",
      body: "Turn on edit mode to open any item in a text editor with the same coloured tokens, completion, and live checking.",
      go: null,
    };
  }
  return s;
}

function perform(act: TourStep["act"]): void {
  if (!act) return;
  try {
    if (act === "open-token") {
      // A token that names an item, so the card shows a definition and a
      // trace to source rather than a pattern phrase's grammar note.
      // The lead sentence starts with the item's own name, so prefer the
      // second item token: a fact the rule depends on, whose card offers
      // both "Open definition" and "Trace to source".
      const toks = document.querySelectorAll(".derivation button.tok[data-id]");
      const tok = (toks[1] ?? toks[0]) as HTMLElement | undefined;
      tok?.click();
    } else if (act === "close-popover") {
      closePopover();
    } else if (act === "open-editor") {
      closePopover();
      if (!editingSig.value) openEditor("WR-200");
    }
  } catch { /* the page may not have the element; the step still reads */ }
}

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
  // Whether this tour opened the editor (so finishing closes it again).
  const openedEditor = useSignal(false);

  useLayoutEffect(() => {
    if (!tourOpenSig.value) return;
    step.value = 0;
    navigate(STEPS[0].go ?? {});
  }, [tourOpenSig.value]);

  // The act runs after a tick so the page the step navigated to has rendered;
  // the highlight is re-applied afterwards so it can find what the act opened.
  useLayoutEffect(() => {
    if (!tourOpenSig.value) return;
    const s = stepFor(step.value);
    let undo = highlight(s.target);
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      perform(s.act);
      setTimeout(() => { if (!cancelled) { undo(); undo = highlight(s.target); } });
    });
    return () => { cancelled = true; clearTimeout(t); undo(); };
  }, [tourOpenSig.value, step.value]);

  // Re-measured on every step (its body text, and so its height, changes)
  // and cleared to 0 the moment the tour closes. Queried by class, the way
  // `highlight` above already reaches real DOM the render just committed,
  // rather than a ref (whose timing with a signal-driven re-render is not
  // guaranteed the same way).
  useLayoutEffect(() => {
    if (!tourOpenSig.value) { tourBoxHeightSig.value = 0; return; }
    let box: Element | null = null;
    try { box = document.querySelector(".tourbox"); } catch { box = null; }
    tourBoxHeightSig.value = (box as HTMLElement | null)?.offsetHeight ?? 0;
  }, [tourOpenSig.value, step.value]);

  if (!tourOpenSig.value) return null;

  const s = stepFor(step.value);
  const last = step.value === STEPS.length - 1;

  const finish = () => {
    markSeen();
    tourOpenSig.value = false;
    closePopover();
    if (openedEditor.value) { closeEditor(); openedEditor.value = false; }
  };

  const next = () => {
    if (last) { finish(); return; }
    const to = stepFor(step.value + 1);
    step.value += 1;
    if (to.act === "open-editor" && !editingSig.value && modeSig.value === "edit") openedEditor.value = true;
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
