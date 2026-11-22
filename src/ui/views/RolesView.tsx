import { useEffect, useLayoutEffect, useState } from "preact/hooks";
import { useSignal } from "@preact/signals";
import type { HouseholdCase } from "../../engine/cases";
import type { ChangeEntry } from "../../changes/types";
import type { DocumentMeta } from "../../ledger/documents";
import {
  changedBy, changedPhrase, departureItems, departureSince, documentEffective, householdCount, ownerGroups,
  personaQuestions, restingIndex, restingPhrase, restingReady,
} from "../counts";
import type { ChangedResult, StoredResult } from "../questionEffects";
import type { Engine } from "../../engine/engine";
import type { Item, ItemVersion } from "../../engine/types";
import { paramInForce } from "../../engine/versions";
import { approvalStatus } from "../approvals";
import { personaById, personaRoles, PERSONAS, type Persona } from "../personas";
import { formatDate, formatValue, optionLabel, personLabel } from "../present";
import { noVersionReason, Value } from "../Present";
import {
  addYears, awaitingByRole, changesBetween, defaultSince, figuresInForce, firstSentence,
  programLabel, roleOutcomes, rolePrograms, signOffCounts,
  type ChangeEvent, type Figure,
} from "../roles";
import { buildHash, type Route } from "../router";
import { changeSetSig, draftEngine, engineSig, navigate } from "../state";
import { viewContext, type ViewContext } from "./context";
import { Cites, ItemLink, itemHref, walkthroughHref } from "./parts";
import { NoLedger, ViewHeader } from "./ViewStub";
import "./workflow-views.css";

/** By role / agency home. Route: `#/<volume>/roles/<persona id>`
 *  (src/ui/personas.ts), with `?since=` (what changed from), `?asof=` (the
 *  figures' date) and `?show=departures|changes|figures` to open on a
 *  section. Read-only: counts link to the inbox (`inbox?role=`), the
 *  question queue (`questions?persona=` or `?program=`) and the outcomes
 *  view; a staged change's effect reads the tray, never changes it. */
export function RolesView() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const { route: r } = ctx;
  const persona = personaById(r.arg) ?? ctx.persona;
  return (
    <section class="view workflow roles">
      <ViewHeader view="roles" />
      <nav class="tabs personas" aria-label="Roles">
        {PERSONAS.map((p) => (
          <a
            key={p.id} class={persona?.id === p.id ? "on" : ""}
            aria-current={persona?.id === p.id ? "page" : undefined}
            href={buildHash({ ...r, view: "roles", arg: p.id, params: keep(r.params, ["since", "asof"]) })}
          >{p.label}</a>
        ))}
      </nav>
      {persona ? <RoleHome ctx={ctx} persona={persona} /> : <p class="status">Choose your role above.</p>}
    </section>
  );
}

function keep(params: Record<string, string>, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) if (params[k]) out[k] = params[k];
  return out;
}

function setParam(r: Route, key: string, value: string | null): void {
  const params = { ...r.params };
  if (value) params[key] = value; else delete params[key];
  navigate({ params });
}

function RoleHome({ ctx, persona }: { ctx: ViewContext; persona: Persona }) {
  const { engine, vol, route: r, today } = ctx;
  const programs = rolePrograms(engine, persona);
  const roles = personaRoles(persona, engine.meta);
  const signOff = signOffCounts(engine, persona);
  const questions = personaQuestions(engine, vol.sources, vol.openQuestions, persona);
  const qGroups = ownerGroups(engine, questions, roles);
  const since = r.params.since || defaultSince(today);
  const asOf = r.params.asof || today;
  // Legal and the county read every program's departures; an agency its own.
  const deps = departureItems(engine, {
    programs: persona.id === "legal" || !persona.programs.length ? null : programs,
    asOf,
  });
  const upcoming = changesBetween(engine, programs, addDay(today), addYears(today, 1)).reverse();
  const show = r.params.show ?? "";
  useLayoutEffect(() => {
    if (!show) return;
    document.getElementById(`role-${show}`)?.scrollIntoView?.({ block: "start" });
  }, [show, persona.id]);
  const ownsQuestions = roles.length > 0;
  const totalWaiting = waitingOnAny(engine, roles);
  const totalSignOffs = signOff.reduce((n, x) => n + x.waiting, 0);
  return (
    <div class="persona" data-persona={persona.id}>
      <h2>{persona.label} <small class="muted">{persona.agency}</small></h2>
      <p class="purpose">{persona.body}</p>
      <p class="muted">
        Programs: {programs.map(programLabel).join(", ") || "none in this volume"}.{" "}
        {roles.length ? <>Signs as: {roles.join(", ")}.</> : "Approves nothing in the codex: this page is for reading it."}
      </p>

      <ul class="countcards" aria-label="Your queues">
        {roles.length > 0 && (
          <li class="countcard">
            <a href={buildHash({ ...r, view: "inbox", arg: null, params: roles.length === 1 ? { role: roles[0] } : { persona: persona.id } })}>
              <span class="num">{totalWaiting.toLocaleString("en-US")}</span> item{totalWaiting === 1 ? "" : "s"} waiting on your sign-off
            </a>
            {signOff.length > 1 && (
              <>
                <small class="muted">
                  {totalSignOffs.toLocaleString("en-US")} sign-offs in all: an item that needs two of your roles is one item
                  above and is listed under each role below.
                </small>
                <ul>
                  {signOff.map((s) => (
                    <li key={s.role}>
                      <a href={buildHash({ ...r, view: "inbox", arg: null, params: { role: s.role } })}>{s.role}: {s.waiting.toLocaleString("en-US")}</a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </li>
        )}
        <li class="countcard">
          <a href={buildHash({ ...r, view: "questions", arg: null, params: { persona: persona.id } })}>
            <span class="num">{questions.length}</span>{" "}
            {ownsQuestions ? "open questions one of your roles answers" : "open questions across the programs"}
          </a>
          {qGroups.length > 1 && (
            <>
              <small class="muted">By the role each is filed under (the role that answers first); these add up.</small>
              <ul>
                {qGroups.map((g) => (
                  <li key={g.owner}>
                    <a href={buildHash({ ...r, view: "questions", arg: null, params: { persona: persona.id, owner: g.owner } })}>{g.owner}: {g.entries.length}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </li>
        <li class="countcard">
          <a href={buildHash({ ...r, params: { ...r.params, show: "departures" } })}>
            <span class="num">{deps.length}</span> statute-over-rule departure{deps.length === 1 ? "" : "s"}
          </a>
          <small class="muted">
            where an item {persona.id === "legal" || !persona.programs.length ? "in any program" : "in your programs"} follows a statute
            over the Colorado rule text, in force on {formatDate(asOf)}
          </small>
        </li>
        <li class="countcard">
          <a href={buildHash({ ...r, params: { ...r.params, show: "changes" } })}>
            <span class="num">{upcoming.length}</span> dated change{upcoming.length === 1 ? "" : "s"} in the next year
          </a>
          <small class="muted">new figures and rules coming into force</small>
        </li>
      </ul>

      {persona.id === "county" && (
        <p class="tip">
          Start from a household: <a href={buildHash({ ...r, view: "outcomes", arg: null, params: { tab: "household" } })}>each person's aid codes across every program</a>,
          or <a href={buildHash({ ...r, view: "walkthrough", arg: null, params: {} })}>walk through a household rule by rule</a>.
        </p>
      )}

      <section id="role-programs">
        <h2>Your programs</h2>
        <ProgramCards ctx={ctx} persona={persona} />
      </section>

      <section id="role-changes" class={show === "changes" ? "focus" : ""}>
        <h2>What changed recently</h2>
        <Changes ctx={ctx} programs={programs} since={since} asOf={today} upcoming={upcoming} persona={persona} />
      </section>

      <section id="role-figures" class={show === "figures" ? "focus" : ""}>
        <h2>Figures in force</h2>
        <Figures ctx={ctx} programs={programs} asOf={asOf} />
      </section>

      <section id="role-departures" class={show === "departures" ? "focus" : ""}>
        <h2>Statute-over-rule departures</h2>
        <p class="muted">In force on {formatDate(asOf)} (the "As of" date under Figures in force).</p>
        <Departures ctx={ctx} items={deps} />
      </section>
    </div>
  );
}

/** Items waiting on at least one of the roles, each counted once. */
function waitingOnAny(engine: Engine, roles: string[]): number {
  const by = awaitingByRole(engine);
  const ids = new Set<string>();
  for (const role of roles) for (const it of by.get(role) ?? []) ids.add(it.id);
  return ids.size;
}

function addDay(d: string): string {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- programs

function ProgramCards({ ctx, persona }: { ctx: ViewContext; persona: Persona }) {
  const { engine, route: r } = ctx;
  const sets = roleOutcomes(engine, persona);
  if (!sets.length) return <p class="muted">No program in this volume.</p>;
  return (
    <>
      {sets.map((s) => (
        <details key={s.program} class="program" open={sets.length <= 2}>
          <summary>
            <b>{programLabel(s.program)}</b>{" "}
            <span class="muted">{s.decisions.length} outcome{s.decisions.length === 1 ? "" : "s"}
              {s.verification.length ? `, ${s.verification.length} about documents` : ""}</span>
          </summary>
          <p class="programlinks">
            <a href={buildHash({ ...r, view: "outcomes", arg: s.program, params: {} })}>Aid codes for {programLabel(s.program)}</a>
            {" · "}
            <a href={buildHash({ ...r, view: "program", arg: s.program, params: {} })}>Program page</a>
          </p>
          <ul class="outcomecards">
            {s.decisions.map((it) => <OutcomeCard key={it.id} engine={engine} route={r} item={it} />)}
          </ul>
          {s.verification.length > 0 && (
            <details class="verification">
              <summary>Documents and verification ({s.verification.length})</summary>
              <ul class="plainlist">
                {s.verification.map((it) => (
                  <li key={it.id}><ItemLink route={r} item={it} /></li>
                ))}
              </ul>
            </details>
          )}
        </details>
      ))}
    </>
  );
}

function OutcomeCard({ engine, route: r, item }: { engine: Engine; route: Route; item: Item }) {
  const opts = item.type === "one of" ? item.options ?? [] : [];
  const kind = item.type === "yes/no" ? "Yes or no" : item.type === "money" ? "An amount in dollars"
    : item.type === "one of" ? "One of these results" : item.type === "calendar date" ? "A date" : "A value";
  return (
    <li class="outcomecard" data-outcome={item.identifier}>
      <h4><a href={itemHref(r, item)}>{item.name}</a></h4>
      <p>{firstSentence(item.meaning)}</p>
      <p class="muted kind">{kind}{opts.length ? ":" : "."}</p>
      {opts.length > 0 && (
        <ul class="opts">
          {opts.slice(0, 6).map((o) => <li key={o}>{optionLabel(item, o)}</li>)}
          {opts.length > 6 && <li class="muted">and {opts.length - 6} more</li>}
        </ul>
      )}
      <p class="cardfoot">
        {item.type === "one of" || item.type === "yes/no"
          ? <a href={buildHash({ ...r, view: "outcomes", arg: item.identifier, params: {} })}>Aid codes</a>
          : null}
        {(item.open ?? []).length > 0 && (
          <span class="muted"> {(item.type === "one of" || item.type === "yes/no") ? "· " : ""}Open: {(item.open ?? []).map((q, i) => (
            <span key={q}>{i > 0 && ", "}<a href={buildHash({ ...r, view: "questions", arg: q, params: {} })}>{q}</a></span>
          ))}</span>
        )}
        {" "}<small class="mono muted">{item.id}</small>
      </p>
    </li>
  );
}

// ----------------------------------------------------------------- changes

const KIND_TEXT: Record<ChangeEvent["kind"], string> = {
  "new figure": "New figure",
  "figure ends": "No figure from this date",
  "rule starts": "Rule takes effect",
  "rule ends": "Last day of the rule",
};

/** The stored results resting on each item, worked out after the page has
 *  painted (counts.ts `restingIndex`), shared by the lists below. */
function useResting(engine: Engine, cases: readonly HouseholdCase[]): Map<string, StoredResult[]> | null {
  const ready = restingReady(engine, cases);
  const out = useSignal<Map<string, StoredResult[]> | null>(ready ? restingIndex(engine, cases) : null);
  useEffect(() => {
    if (ready) { out.value = restingIndex(engine, cases); return; }
    const t = setTimeout(() => { out.value = restingIndex(engine, cases); }, 30);
    return () => clearTimeout(t);
  }, [engine, cases, ready]);
  return out.value;
}

/** The change a dated figure made: the item as if the new period had kept the
 *  previous figure. Run against the stored households, the results that
 *  differ are the ones the new figure changes. */
export function undoEntry(e: ChangeEvent, chapter: string): ChangeEntry | null {
  if (e.kind !== "new figure" || !e.previous || !e.version) return null;
  const v = e.version;
  const prev = e.previous;
  const after: Item = {
    ...e.item,
    versions: (e.item.versions ?? []).map((x) => (x.from === v.from ? { ...x, value: prev.value } : x)),
  };
  return { id: e.item.id, chapter, before: e.item, after };
}

/** Works out, one event at a time after the page paints, which stored results
 *  each dated figure change moves. */
function useWorkedOut(engine: Engine, cases: readonly HouseholdCase[], chapterOf: Record<string, string>, events: ChangeEvent[]) {
  const done = useSignal<Map<string, ChangedResult[]>>(new Map());
  const key = events.map((e) => `${e.item.id}@${e.date}`).join(",");
  useEffect(() => {
    let live = true;
    const map = new Map<string, ChangedResult[]>();
    done.value = map;
    const queue = events.filter((e) => e.kind === "new figure" && e.previous);
    const step = () => {
      if (!live || !queue.length) return;
      const e = queue.shift()!;
      const entry = undoEntry(e, chapterOf[e.item.id] ?? "parameters");
      // The results that differ without the new figure are the ones it changed.
      const ch = entry ? changedBy(engine, cases, [entry]).map((c) => ({ ...c, value: c.after, after: c.value })) : [];
      map.set(`${e.item.id}@${e.date}`, ch);
      done.value = new Map(map);
      setTimeout(step, 0);
    };
    const t = setTimeout(step, 60);
    return () => { live = false; clearTimeout(t); };
  }, [engine, cases, key]);
  return done.value;
}

/** Documents whose rule text takes effect in [from, to], cited by an item in
 *  the programs (the county supervisor's "the LEAP rule amendment"). */
export function documentsTakingEffect(
  engine: Engine, docs: readonly DocumentMeta[], sources: ReadonlyArray<{ id: string; document?: string }>,
  programs: readonly string[], from: string, to: string,
): Array<{ doc: DocumentMeta; date: string; programs: string[] }> {
  const progs = new Set(programs);
  const out: Array<{ doc: DocumentMeta; date: string; programs: string[] }> = [];
  for (const d of docs) {
    const date = documentEffective(d);
    if (!date || date < from || date > to) continue;
    const excerpts = new Set(sources.filter((s) => s.document === d.id).map((s) => s.id));
    const ps = new Set<string>();
    for (const it of engine.items()) {
      if (!(it.sources ?? []).some((x) => excerpts.has(x)) && !(it.versions ?? []).some((v) => v.source && excerpts.has(v.source))) continue;
      if (progs.has(it.program)) ps.add(it.program);
    }
    if (ps.size) out.push({ doc: d, date, programs: [...ps] });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

function Changes(
  { ctx, programs, since, asOf, upcoming, persona }:
  { ctx: ViewContext; programs: string[]; since: string; asOf: string; upcoming: ChangeEvent[]; persona: Persona },
) {
  const { engine, vol, route: r } = ctx;
  void persona;
  const recent = changesBetween(engine, programs, since, asOf);
  const resting = useResting(engine, vol.cases);
  const worked = useWorkedOut(engine, vol.cases, vol.chapterOf, [...recent, ...upcoming]);
  const docsRecent = documentsTakingEffect(engine, vol.documents, vol.sources, programs, since, asOf);
  const docsNext = documentsTakingEffect(engine, vol.documents, vol.sources, programs, addDay(asOf), addYears(asOf, 1));
  return (
    <>
      <div class="controls">
        <label>
          Since{" "}
          <input type="date" value={since} max={asOf} onChange={(e) => setParam(r, "since", (e.target as HTMLInputElement).value)} />
        </label>
        <span class="muted">to today, {formatDate(asOf)}.</span>
      </div>
      <p class="muted note">
        Read from the dates each figure, rule and rule document states (a figure's periods, a rule's effective dates,
        a document's "effective" date). For a new figure, the stored households whose result changes are worked out by
        running them with the old figure and the new one. An edit that changed no date is not listed here.
      </p>
      <h3>In force since {formatDate(since)} ({recent.length + docsRecent.length})</h3>
      <DocList ctx={ctx} docs={docsRecent} />
      <ChangeList ctx={ctx} events={recent} resting={resting} worked={worked} empty={docsRecent.length ? "" : "Nothing in your programs took effect in this period."} />
      <h3>Coming into force in the next year ({upcoming.length + docsNext.length})</h3>
      <DocList ctx={ctx} docs={docsNext} />
      <ChangeList ctx={ctx} events={upcoming} resting={resting} worked={worked} empty={docsNext.length ? "" : "Nothing dated in the next year."} />
    </>
  );
}

function versionText(it: Item, v: ItemVersion | null | undefined): string {
  if (!v) return "none";
  if (v.value && typeof v.value === "object" && !Array.isArray(v.value)) {
    return `a table of ${Object.keys(v.value).length} rows`;
  }
  return formatValue(it, v.value);
}

function tableDiff(a: unknown, b: unknown): number | null {
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return null;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let n = 0;
  for (const k of keys) {
    if (JSON.stringify((a as Record<string, unknown>)[k]) !== JSON.stringify((b as Record<string, unknown>)[k])) n++;
  }
  return n;
}

function DocList({ ctx, docs }: { ctx: ViewContext; docs: ReturnType<typeof documentsTakingEffect> }) {
  const { route: r } = ctx;
  if (!docs.length) return null;
  return (
    <ul class="changes docs">
      {docs.map(({ doc, date, programs }) => (
        <li key={doc.id} class="change rule-text">
          <span class="date">{formatDate(date)}</span>{" "}
          <span class="tag">Rule text takes effect</span>{" "}
          <a href={buildHash({ ...r, view: "document", arg: doc.id, params: {} })}>{doc.title}</a>{" "}
          {programs.map((p) => <span key={p} class="tag">{programLabel(p)}</span>)}{" "}
          <small class="mono muted">{doc.id}</small>
        </li>
      ))}
    </ul>
  );
}

function ChangeList(
  { ctx, events, empty, resting, worked }:
  {
    ctx: ViewContext; events: ChangeEvent[]; empty: string;
    resting: Map<string, StoredResult[]> | null; worked: Map<string, ChangedResult[]>;
  },
) {
  const { engine, vol, route: r } = ctx;
  if (!events.length) return empty ? <p class="muted">{empty}</p> : null;
  return (
    <ul class="changes">
      {events.map((e, i) => {
        const rest = resting?.get(e.item.identifier) ?? null;
        const touchedIds = rest ? [...new Set(rest.map((x) => x.caseId))] : [];
        const touched = vol.cases.filter((c) => touchedIds.includes(c.id));
        const changed = worked.get(`${e.item.id}@${e.date}`);
        const diff = e.kind === "new figure" ? tableDiff(e.previous?.value, e.version?.value) : null;
        const why = e.kind === "figure ends" ? noVersionReason(e.item, e.date) : null;
        return (
          <li key={`${e.item.id}-${e.kind}-${e.date}-${i}`} class={`change ${e.kind.replace(/ /g, "-")}`}>
            <span class="date">{formatDate(e.date)}</span>{" "}
            <span class="tag">{KIND_TEXT[e.kind]}</span>{" "}
            <ItemLink route={r} item={e.item} />{" "}
            <span class="tag">{programLabel(e.item.program)}</span>
            {e.kind === "new figure" && (
              <div class="fromto">
                {e.previous ? <>{versionText(e.item, e.previous)} → </> : "First figure: "}
                <b>{versionText(e.item, e.version)}</b>
                {diff !== null && <span class="muted"> ({diff === 0 ? "same figures as before" : `${diff} row${diff === 1 ? "" : "s"} differ`})</span>}
              </div>
            )}
            {why && <div class="warn">{why}</div>}
            {(e.kind === "rule starts" || e.kind === "rule ends") && e.item.statute_override && (
              <div class="flag override">{e.item.statute_override}</div>
            )}
            <Cites vol={vol} route={r} item={e.item} sourceIds={e.version?.source ? [e.version.source] : undefined} />
            {e.kind === "new figure" && e.previous && (
              <div class="worked">
                {changed === undefined
                  ? <span class="muted">Working out which stored results the new figure changes…</span>
                  : changed.length === 0
                    ? <span>{changedPhrase(0, 0)}: no stored household's result differs between the old figure and the new.</span>
                    : (
                      <>
                        <b>{changedPhrase(changed.length, householdCount(changed))}</b> between the old figure and the new:
                        <ul class="casechanges">
                          {changed.slice(0, 6).map((c, j) => {
                            const it = engine.item(c.identifier);
                            const hc = vol.cases.find((x) => x.id === c.caseId);
                            return (
                              <li key={j}>
                                <a href={walkthroughHref(r, c.caseId, c.person)} title={hc?.title}>{c.caseId}</a>{" "}
                                {personLabel(c.person)}{c.month ? `, ${formatDate(c.month)}` : ""}:{" "}
                                {it ? <a href={itemHref(r, it)}>{it.name}</a> : c.identifier}{" "}
                                {formatValue(it, c.value)} → <b>{formatValue(it, c.after)}</b>
                              </li>
                            );
                          })}
                          {changed.length > 6 && <li class="muted">and {changed.length - 6} more</li>}
                        </ul>
                      </>
                    )}
              </div>
            )}
            <div class="touches muted">
              {rest === null
                ? "Working out which stored households rest on it…"
                : touched.length === 0
                  ? "No stored household result rests on it."
                  : (
                    <>
                      {restingPhrase(rest.length, touched.length)}:{" "}
                      {touched.slice(0, 8).map((c, j) => (
                        <span key={c.id}>{j > 0 && ", "}<a href={walkthroughHref(r, c.id)} title={c.title}>{c.id}</a></span>
                      ))}
                      {touched.length > 8 && ` and ${touched.length - 8} more`}
                    </>
                  )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ----------------------------------------------------------------- figures

function Figures({ ctx, programs, asOf }: { ctx: ViewContext; programs: string[]; asOf: string }) {
  const { route: r } = ctx;
  const base = engineSig.value ?? ctx.engine;
  const draft = draftEngine() ?? base;
  const staged = new Set(changeSetSig.value.entries.map((e) => e.id));
  const groups = figuresInForce(base, programs, asOf);
  const [filter, setFilter] = useState("");
  const f = filter.trim().toLowerCase();
  return (
    <>
      <div class="controls">
        <label>
          As of{" "}
          <input type="date" value={asOf} onChange={(e) => setParam(r, "asof", (e.target as HTMLInputElement).value)} />
        </label>
        <label>
          Find{" "}
          <input type="search" value={filter} placeholder="a figure's name" onInput={(e) => setFilter((e.target as HTMLInputElement).value)} />
        </label>
      </div>
      {staged.size > 0 && (
        <p class="draftnote">
          Your tray has staged changes. Figures below show the rule in force; a staged figure also shows the
          draft, who must approve it, and which stored households it moves. Nothing here is in force until approved.
        </p>
      )}
      {groups.map((g, gi) => {
        const figs = g.figures.filter((x) => !f || x.item.name.toLowerCase().includes(f) || x.item.identifier.includes(f));
        if (!figs.length) return null;
        return (
          <details key={g.program} class="figuregroup" data-program={g.program} open={groups.length <= 2 || gi === 0 || !!f || figs.some((x) => staged.has(x.item.id))}>
            <summary><b>{programLabel(g.program)}</b> <span class="muted">{figs.length} figure{figs.length === 1 ? "" : "s"}</span></summary>
            <ul class="figurelist">
              {figs.map((x) => (
                <FigureRow
                  key={x.item.id} ctx={ctx} figure={x} asOf={asOf}
                  staged={staged.has(x.item.id) ? draft : null} base={base}
                />
              ))}
            </ul>
          </details>
        );
      })}
    </>
  );
}

function FigureRow(
  { ctx, figure, asOf, staged, base }:
  { ctx: ViewContext; figure: Figure; asOf: string; staged: Engine | null; base: Engine },
) {
  const { vol, route: r } = ctx;
  const { item, value, version, next } = figure;
  const why = noVersionReason(item, asOf);
  const isTable = value && typeof value === "object" && !Array.isArray(value);
  return (
    <li class="figure" data-figure={item.identifier}>
      <div class="fighead">
        <ItemLink route={r} item={item} />
      </div>
      <div class="figvalue">
        {why
          ? <span class="warn">{why}</span>
          : isTable
            ? (
              <details>
                <summary>{`A table of ${Object.keys(value as object).length} rows`}</summary>
                <Value item={item} value={value} />
              </details>
            )
            : <b>{formatValue(item, value)}</b>}
        {version && <span class="muted"> since {formatDate(version.from)}</span>}
        {next && (
          <span class="muted">
            {" "}· next: {versionText(item, next)} from {formatDate(next.from)}
          </span>
        )}
      </div>
      <Cites vol={vol} route={r} item={item} sourceIds={version?.source ? [version.source] : undefined} />
      {staged && <StagedChange ctx={ctx} item={item} asOf={asOf} base={base} draft={staged} />}
    </li>
  );
}

function StagedChange(
  { ctx, item, asOf, base, draft }:
  { ctx: ViewContext; item: Item; asOf: string; base: Engine; draft: Engine },
) {
  const { engine, vol, route: r } = ctx;
  const d = draft.itemById(item.id);
  if (!d) return <div class="staged">Staged for deletion in your tray (not in force).</div>;
  const dv = paramInForce(d, asOf);
  const approvals = approvalStatus(draft, d);
  const entry = changeSetSig.value.entries.find((e) => e.id === item.id);
  const changes = entry ? changedBy(base, vol.cases, [entry]) : [];
  const byCase = new Map<string, typeof changes>();
  for (const c of changes) byCase.set(c.caseId, [...(byCase.get(c.caseId) ?? []), c]);
  return (
    <div class="staged" role="note">
      <p><span class="tag draft">Staged, not in force</span> Draft value on {formatDate(asOf)}:{" "}
        {dv && typeof dv === "object" ? <Value item={d} value={dv} /> : <b>{formatValue(d, dv)}</b>}
      </p>
      <p>
        Needs sign-off from: {approvals.required.length ? approvals.required.join(", ") : "no role"}.
      </p>
      {changes.length === 0
        ? <p class="muted">{changedPhrase(0, 0)}: no stored household's result changes with this one change.</p>
        : (
          <>
            <p>{changedPhrase(changes.length, byCase.size)}:</p>
            <ul class="casechanges">
              {[...byCase.entries()].map(([caseId, cs]) => (
                <li key={caseId}>
                  <a href={walkthroughHref(r, caseId)}>{caseId}</a>{" "}
                  <ul>
                    {cs.slice(0, 6).map((c, i) => {
                      const it = engine.item(c.identifier);
                      return (
                        <li key={i}>
                          {personLabel(c.person)}{c.month ? `, ${formatDate(c.month)}` : ""}:{" "}
                          {it ? <a href={itemHref(r, it)}>{it.name}</a> : c.identifier}{" "}
                          {formatValue(it, c.value)} → <b>{formatValue(it, c.after)}</b>
                        </li>
                      );
                    })}
                    {cs.length > 6 && <li class="muted">and {cs.length - 6} more</li>}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}
    </div>
  );
}

// -------------------------------------------------------------- departures

function Departures({ ctx, items }: { ctx: ViewContext; items: Item[] }) {
  const { vol, route: r } = ctx;
  if (!items.length) {
    return <p class="muted">No item in your programs records a statute governing over the Colorado rule text.</p>;
  }
  return (
    <ul class="departures">
      {items.map((it) => (
        <li key={it.id} class="departure">
          <ItemLink route={r} item={it} /> <span class="tag">{programLabel(it.program)}</span>
          {departureSince(it) && <span class="muted"> since {formatDate(departureSince(it)!)}</span>}
          <p class="flag override">{it.statute_override}</p>
          <Cites vol={vol} route={r} item={it} />
        </li>
      ))}
    </ul>
  );
}
