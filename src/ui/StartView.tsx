import { useLayoutEffect } from "preact/hooks";
import { PERSONAS, setPersona, type Persona } from "./personas";
import { offerTourOnFirstVisit, startTour } from "./Tour";
import { navigate, setDoor, setMode, type Door } from "./state";

interface DoorInfo { id: Door; title: string; body: string }

// Copy from docs/design-onboarding.md, "Doors". Kept under "Other ways in"
// beside the role entry points (phase 13), so every earlier start still works.
const DOORS: DoorInfo[] = [
  {
    id: "admin",
    title: "Check how a household is decided",
    body: "For a program administrator: opens Cases, with an example household one click away.",
  },
  {
    id: "reader",
    title: "Read the rules for a program",
    body: "For anyone: opens Programs.",
  },
  {
    id: "sme",
    title: "Change a rule or fact",
    body: "For a subject-matter expert: turns edit mode on and opens Programs.",
  },
  {
    id: "engineer",
    title: "Implement the rules",
    body: "For an engineer: opens the Handoff view, then item decision records back to statute.",
  },
];

function choose(door: Door): void {
  setDoor(door);
  setMode(door === "sme" ? "edit" : "read");
  if (door === "admin") {
    navigate({ view: "cases", arg: null, params: {} });
  } else if (door === "engineer") {
    navigate({ view: "handoff", arg: null, params: {} });
  } else {
    navigate({ view: "program", arg: null, params: {} });
  }
}

/** A role entry point: remembers the persona (the workflow views filter to
 *  it), sets the older door it implies, and opens the persona's home. */
export function choosePersona(p: Persona): void {
  setPersona(p.id);
  setDoor(p.door);
  setMode("read");
  navigate({ view: p.home.view, arg: p.home.arg, params: p.home.params ?? {} });
}

export function StartView() {
  // The tour is "shown once": a brand-new visitor gets it here, unasked;
  // anyone who has already seen or skipped it just gets "Take the tour".
  useLayoutEffect(() => { offerTourOnFirstVisit(); }, []);

  return (
    <section class="view start">
      <h1>What brings you here today?</h1>
      <p class="muted">Pick where you work; you can change this any time.</p>
      <div class="doors roles">
        {PERSONAS.map((p) => (
          <button key={p.id} class="door persona" data-persona={p.id} onClick={() => choosePersona(p)}>
            <h3>{p.label}</h3>
            <p class="agency">{p.agency}</p>
            <p>{p.body}</p>
          </button>
        ))}
      </div>
      <h2 class="otherways">Other ways in</h2>
      <div class="doors classic">
        {DOORS.map((d) => (
          <button key={d.id} class="door" data-door={d.id} onClick={() => choose(d.id)}>
            <h3>{d.title}</h3>
            <p>{d.body}</p>
          </button>
        ))}
      </div>
      <p class="muted">
        <button class="linkish" onClick={startTour}>Take the tour</button>
      </p>
    </section>
  );
}
