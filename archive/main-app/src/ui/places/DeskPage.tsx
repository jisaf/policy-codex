/* Desk: my role's work as compact tiles (docs/design-unified-ui.md, "Desk";
 * Blind A's tiles). Each tile is one number from counts.ts and links to the
 * canonical list, filtered: what waits for my signature (Desk › To sign),
 * the questions I own (Questions, only mine), my proposal (Changes), what
 * takes effect soon in my programs (Changes, that month), statute over rule
 * and unverified (Law). Definitions sit behind "How this is counted". A
 * visitor who has chosen no role picks one here (the start page's role
 * doors fold into the Desk); the same choice is in the sidebar. */
import type { ComponentChildren } from "preact";
import { useLayoutEffect } from "preact/hooks";
import {
  awaitingByRole, awaitingSignOff, COUNT_DEFINITIONS, departureItems, DESK_DEFINITIONS, ownedQuestions,
  takingEffectSoon, unverifiedInPrograms,
} from "../counts";
import { proposalCount } from "../Header";
import { PERSONAS, personaById, personaRoles, setPersona, type Persona } from "../personas";
import { formatDate } from "../present";
import { unverifiedIds } from "../provenance";
import { programLabel, rolePrograms } from "../roles";
import { buildHash, type Route } from "../router";
import { activePersonaId } from "../Sidebar";
import { offerTourOnFirstVisit, startTour } from "../Tour";
import { setDoor, setMode } from "../state";
import { viewContext, type ViewContext } from "../views/context";
import { NoLedger } from "../views/ViewStub";
import { PlaceHeader } from "./PlaceHeader";
import "./desk.css";

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
      <PlaceHeader place="desk" />
      {persona ? <Tiles ctx={ctx} persona={persona} /> : <RoleChoice />}
    </section>
  );
}

function n(x: number): string {
  return x.toLocaleString("en-US");
}

function Tile(
  { id, num, label, href, children }:
  { id: string; num: number; label: string; href: string; children?: ComponentChildren },
) {
  return (
    <li class={`tile${num ? "" : " zero"}`} data-tile={id}>
      <a href={href}>
        <span class="num">{n(num)}</span>
        <span class="label">{label}</span>
      </a>
      {children}
    </li>
  );
}

/** The role's tiles. */
function Tiles({ ctx, persona }: { ctx: ViewContext; persona: Persona }) {
  const { engine, vol, route: r, today } = ctx;
  const roles = personaRoles(persona, engine.meta);
  const programs = rolePrograms(engine, persona);
  // Legal and a role across every program read every program's lists.
  const everywhere = persona.id === "legal" || !persona.programs.length;
  const scope = everywhere ? null : programs;
  // The Law lists the two tiles open, narrowed to the same programs.
  const inScope: Record<string, string> = scope ? { programs: scope.join(",") } : {};
  const keep: Record<string, string> = r.params.persona ? { persona: r.params.persona } : {};
  const at = (patch: Partial<Route>) => buildHash({ ...r, arg: null, ...patch, params: { ...keep, ...(patch.params ?? {}) } });

  const waiting = awaitingSignOff(engine, roles);
  const byRole = awaitingByRole(engine);
  const owned = ownedQuestions(engine, vol.sources, vol.openQuestions, persona);
  const proposal = proposalCount();
  const soon = takingEffectSoon(engine, vol, today, scope);
  const deps = departureItems(engine, { programs: scope, asOf: today });
  const unv = unverifiedInPrograms(engine, unverifiedIds(vol.sources), scope, today);
  const firstSoon = [soon.events[0]?.date, soon.documents[0]?.date].filter(Boolean).sort()[0];
  const soonList = [
    ...soon.events.map((e) => ({ date: e.date, key: `${e.item.id}-${e.kind}-${e.date}`, label: e.item.name, href: at({ view: "item", arg: e.item.id }) })),
    ...soon.documents.map((d) => ({ date: d.date, key: d.doc.id, label: d.doc.title, href: at({ view: "law", arg: `doc/${d.doc.id}` }) })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div class="deskhome" data-persona={persona.id}>
      <p class="whoami">
        <b>{persona.label}</b> <span class="muted">{persona.agency}</span>
        {programs.length > 0 && !everywhere && (
          <span class="myprograms">
            {" · "}
            {programs.map((p, i) => (
              <span key={p}>{i > 0 && ", "}<a href={at({ view: "programs", arg: p })}>{programLabel(p)}</a></span>
            ))}
          </span>
        )}
      </p>
      <ul class="desktiles" aria-label="Your work">
        {roles.length > 0 && (
          <Tile
            id="sign" num={waiting.length} label="wait for your signature"
            href={at({ view: "desk", arg: "sign", params: roles.length === 1 ? { role: roles[0] } : {} })}
          >
            {roles.length > 1 && (
              <ul class="tilelines">
                {roles.map((x) => (
                  <li key={x}><a href={at({ view: "desk", arg: "sign", params: { role: x } })}>{x}</a> <span class="muted">{n((byRole.get(x) ?? []).length)}</span></li>
                ))}
              </ul>
            )}
          </Tile>
        )}
        <Tile
          id="questions" num={owned.open.length}
          label={owned.owned ? "open questions you own" : "open questions in your programs"}
          href={at({ view: "questions", params: owned.owned ? { mine: "1" } : {} })}
        >
          {owned.partly.length > 0 && <p class="tilesub muted">and {n(owned.partly.length)} partly settled</p>}
        </Tile>
        <Tile id="proposal" num={proposal} label={proposal === 1 ? "change in your proposal" : "changes in your proposal"} href={at({ view: "changes", arg: "proposal" })}>
          {!proposal && <p class="tilesub muted">Nothing staged yet.</p>}
        </Tile>
        <Tile
          id="soon" num={soon.total} label={soon.total === 1 ? "change takes effect soon" : "changes take effect soon"}
          href={at({ view: "changes", params: firstSoon ? { month: firstSoon.slice(0, 7) } : {} })}
        >
          {soonList.length > 0 && (
            <ul class="tilelines">
              {soonList.slice(0, 3).map((x) => (
                <li key={x.key}><span class="muted">{formatDate(x.date)}</span> <a href={x.href}>{x.label}</a></li>
              ))}
              {soonList.length > 3 && <li class="muted">and {n(soonList.length - 3)} more</li>}
            </ul>
          )}
        </Tile>
        <Tile id="statute" num={deps.length} label="follow a statute over the rule" href={at({ view: "law", arg: "departures", params: inScope })} />
        <Tile id="unverified" num={unv.total} label="unverified or with no value today" href={at({ view: "law", arg: "unverified", params: inScope })}>
          <p class="tilesub muted">{n(unv.citing.length)} cite unverified text · {n(unv.noValue.length)} figures have no value</p>
        </Tile>
      </ul>
      <details class="howcounted">
        <summary>How this is counted</summary>
        <dl>
          {roles.length > 0 && <><dt>Signature</dt><dd>{DESK_DEFINITIONS.signOff} You sign as {roles.join(", ")}.</dd></>}
          <dt>Questions</dt>
          <dd>{owned.owned ? COUNT_DEFINITIONS.owns : "You sign as no role, so you own no question: these are the open questions in your programs."}</dd>
          <dt>Proposal</dt><dd>{DESK_DEFINITIONS.proposal}</dd>
          <dt>Soon</dt><dd>{DESK_DEFINITIONS.soon}</dd>
          <dt>Statute over rule</dt><dd>{DESK_DEFINITIONS.departures}</dd>
          <dt>Unverified</dt><dd>{DESK_DEFINITIONS.unverified}</dd>
          <dt>Programs</dt>
          <dd>{everywhere ? "Every program." : programs.map(programLabel).join(", ")}</dd>
        </dl>
      </details>
    </div>
  );
}

/** The role doors, for a visitor who has not chosen a role yet. The same
 *  choice stays in the sidebar ("Working as"). */
export function RoleChoice() {
  return (
    <div class="rolechoice">
      <h2>Where do you work?</h2>
      <p class="muted">Your Desk shows your role's work. You can change it any time under "Working as" in the sidebar.</p>
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
