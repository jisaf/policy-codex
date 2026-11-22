/* Desk: my role's work (docs/design-unified-ui.md). Until the Desk track
 * builds its tiles, a chosen role sees the role page's content (counts that
 * link into the sign-off list, the question queue filtered to its roles,
 * departures and what takes effect), and a visitor who has chosen no role
 * picks one here: the start page's role doors fold into the Desk. */
import { useLayoutEffect } from "preact/hooks";
import { PERSONAS, personaById, setPersona, type Persona } from "../personas";
import { activePersonaId } from "../Sidebar";
import { offerTourOnFirstVisit, startTour } from "../Tour";
import { setDoor, setMode } from "../state";
import { viewContext } from "../views/context";
import { RoleHome } from "../views/RolesView";
import { NoLedger } from "../views/ViewStub";
import { PlaceHeader } from "./PlaceHeader";
import "../views/workflow-views.css";

/** Choosing a role: remembered in this browser; every page's "mine" reads
 *  it. */
export function choosePersona(p: Persona): void {
  setPersona(p.id);
  setDoor(p.door);
  setMode("read");
}

export function DeskPage() {
  // The tour is shown once, to a brand-new visitor, from their first page.
  useLayoutEffect(() => { offerTourOnFirstVisit(); }, []);
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const persona = personaById(activePersonaId());
  return (
    <section class="view place desk">
      <PlaceHeader place="desk" interim />
      {persona ? <RoleHome ctx={ctx} persona={persona} /> : <RoleChoice />}
    </section>
  );
}

/** The role doors, for a visitor who has not chosen a role yet. The same
 *  choice stays in the sidebar ("Working as"). */
export function RoleChoice() {
  return (
    <div class="rolechoice">
      <h2>Where do you work?</h2>
      <p class="muted">Your Desk shows your role's work. You can change your role any time under "Working as" in the sidebar.</p>
      <div class="doors roles">
        {PERSONAS.map((p) => (
          <button key={p.id} class="door persona" data-persona={p.id} onClick={() => choosePersona(p)}>
            <h3>{p.label}</h3>
            <p class="agency">{p.agency}</p>
            <p>{p.body}</p>
          </button>
        ))}
      </div>
      <p class="muted"><button class="linkish" onClick={startTour}>Take the tour</button></p>
    </div>
  );
}
