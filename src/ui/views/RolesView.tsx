import { useLayoutEffect, useState } from "preact/hooks";
import type { Engine } from "../../engine/engine";
import type { Item, ItemVersion } from "../../engine/types";
import { paramInForce } from "../../engine/versions";
import { approvalStatus } from "../approvals";
import { personaById, personaRoles, PERSONAS, type Persona } from "../personas";
import { formatDate, formatValue, optionLabel, personLabel } from "../present";
import { noVersionReason, Value } from "../Present";
import {
  addYears, awaitingByRole, casesReading, changesBetween, defaultSince, departures, figuresInForce, firstSentence,
  programLabel, questionCounts, roleOutcomes, rolePrograms, signOffCounts, stagedCaseChanges,
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
  const questions = questionCounts(engine, persona, vol.openQuestions);
  const deps = departures(engine, persona);
  const since = r.params.since || defaultSince(today);
  const asOf = r.params.asof || today;
  const upcoming = changesBetween(engine, programs, addDay(today), addYears(today, 1)).reverse();
  const show = r.params.show ?? "";
  useLayoutEffect(() => {
    if (!show) return;
    document.getElementById(`role-${show}`)?.scrollIntoView?.({ block: "start" });
  }, [show, persona.id]);
  const ownsQuestions = persona.id === "legal" || persona.programs.length > 0;
  const totalWaiting = waitingOnAny(engine, roles);
  return (
    <div class="persona" data-persona={persona.id}>
      <h2>{persona.label} <small class="muted">{persona.agency}</small></h2>
      <p class="purpose">{persona.body}</p>
      <p class="muted">
        Programs: {programs.map(programLabel).join(", ") || "none in this volume"}.{" "}
        {roles.length ? <>Signs as: {roles.join(", ")}.</> : "Signs as no approval role."}
      </p>

      <ul class="countcards" aria-label="Your queues">
        {roles.length > 0 && (
          <li class="countcard">
            <a href={buildHash({ ...r, view: "inbox", arg: null, params: roles.length === 1 ? { role: roles[0] } : { persona: persona.id } })}>
              <span class="num">{totalWaiting}</span> item{totalWaiting === 1 ? "" : "s"} waiting on your sign-off
            </a>
            {signOff.length > 1 && (
              <ul>
                {signOff.map((s) => (
                  <li key={s.role}>
                    <a href={buildHash({ ...r, view: "inbox", arg: null, params: { role: s.role } })}>{s.role}: {s.waiting}</a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        )}
        <li class="countcard">
          <a href={buildHash({ ...r, view: "questions", arg: null, params: { persona: persona.id } })}>
            <span class="num">{questions.open.length}</span>{" "}
            {ownsQuestions ? "open questions you own" : "open questions across the programs"}
          </a>
          {questions.byProgram.length > 1 && (
            <ul>
              {questions.byProgram.map((q) => (
                <li key={q.program}>
                  <a href={buildHash({ ...r, view: "questions", arg: null, params: { program: q.program } })}>{programLabel(q.program)}: {q.count}</a>
                </li>
              ))}
            </ul>
          )}
        </li>
        <li class="countcard">
          <a href={buildHash({ ...r, params: { ...r.params, show: "departures" } })}>
            <span class="num">{deps.length}</span> statute-over-rule departure{deps.length === 1 ? "" : "s"}
          </a>
          <small class="muted">where a statute governs over the Colorado rule text</small>
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
        <Changes ctx={ctx} programs={programs} since={since} asOf={today} upcoming={upcoming} />
      </section>

      <section id="role-figures" class={show === "figures" ? "focus" : ""}>
        <h2>Figures in force</h2>
        <Figures ctx={ctx} programs={programs} asOf={asOf} />
      </section>

      <section id="role-departures" class={show === "departures" ? "focus" : ""}>
        <h2>Statute-over-rule departures</h2>
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

function Changes(
  { ctx, programs, since, asOf, upcoming }:
  { ctx: ViewContext; programs: string[]; since: string; asOf: string; upcoming: ChangeEvent[] },
) {
  const { engine, route: r } = ctx;
  const recent = changesBetween(engine, programs, since, asOf);
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
        Read from the dates each figure and rule states (a figure's versions, a rule's effective dates).
        The ledger source does not expose its commit history, so an edit that changed no date is not listed here;
        each item's page shows its own history where GitHub answers.
      </p>
      <h3>In force since {formatDate(since)} ({recent.length})</h3>
      <ChangeList ctx={ctx} events={recent} empty="Nothing in your programs took effect in this period." />
      <h3>Coming into force in the next year ({upcoming.length})</h3>
      <ChangeList ctx={ctx} events={upcoming} empty="Nothing dated in the next year." />
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

function ChangeList({ ctx, events, empty }: { ctx: ViewContext; events: ChangeEvent[]; empty: string }) {
  const { engine, vol, route: r } = ctx;
  if (!events.length) return <p class="muted">{empty}</p>;
  return (
    <ul class="changes">
      {events.map((e, i) => {
        const touched = casesReading(engine, vol.cases, e.item.identifier);
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
            {touched.length > 0 && (
              <div class="touches muted">
                Stored households that read it:{" "}
                {touched.slice(0, 8).map((c, j) => (
                  <span key={c.id}>{j > 0 && ", "}<a href={walkthroughHref(r, c.id)}>{c.id}</a></span>
                ))}
                {touched.length > 8 && ` and ${touched.length - 8} more`}
              </div>
            )}
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
  const changes = stagedCaseChanges(base, draft, vol.cases, d.identifier);
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
        ? <p class="muted">No stated result of a stored household changes.</p>
        : (
          <>
            <p>{byCase.size} stored household{byCase.size === 1 ? "" : "s"} change:</p>
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
                          {formatValue(it, c.before)} → <b>{formatValue(it, c.after)}</b>
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
          {it.effective?.from && <span class="muted"> since {formatDate(it.effective.from)}</span>}
          <p class="flag override">{it.statute_override}</p>
          <Cites vol={vol} route={r} item={it} />
        </li>
      ))}
    </ul>
  );
}
