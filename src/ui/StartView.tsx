import { navigate, setDoor, setMode, type Door } from "./state";

interface DoorInfo { id: Door; title: string; body: string }

// Copy from docs/design-onboarding.md, "Doors".
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
    // TODO(handoff): route to `#/mwr/handoff` once Task 4 builds that view.
    navigate({ view: "table", arg: null, params: {} });
  } else {
    navigate({ view: "program", arg: null, params: {} });
  }
}

export function StartView() {
  return (
    <section class="view start">
      <h1>What brings you here today?</h1>
      <p class="muted">Pick the one that fits; you can change this any time.</p>
      <div class="doors">
        {DOORS.map((d) => (
          <button key={d.id} class="door" data-door={d.id} onClick={() => choose(d.id)}>
            <h3>{d.title}</h3>
            <p>{d.body}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
