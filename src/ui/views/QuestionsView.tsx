/* The open-question decision queue (phase 13): every open and partly
 * resolved question, filed under the owner who must answer it, each with the
 * reading the codex applies meanwhile, the rule text it turns on, the items
 * carrying it and the stored households its answer would move; an answer
 * form that stages the edit through the change tray; the statute-over-rule
 * departures as decisions for Legal; and the resolved questions, apart.
 *
 * `#/<volume>/questions` is the queue (`?tab=departures` the departures),
 * `#/<volume>/questions/OQ-n` one question's full page. */
import type { ComponentChildren } from "preact";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import "./questions.css";
import type { Engine } from "../../engine/engine";
import type { Item } from "../../engine/types";
import type { LoadedVolume } from "../../ledger/load";
import { parseOpenQuestions, type OpenQuestion, type Source } from "../../ledger/markdown";
import { fileEntries } from "../../changes/types";
import { kindLabel } from "../labels";
import { PERSONAS, personaRoles } from "../personas";
import { formatValue, personLabel } from "../present";
import { EXCERPT_KIND_LABEL, excerptKind, isUnverified } from "../provenance";
import { volumePrograms } from "../programs";
import {
  citedDocuments, departures, groupByOwner, isOpen, matchesFilter, questionInfo, questionInfos, questionNotes,
  queueEntry, QUESTION_CLASS_BLURB, QUESTION_CLASS_LABEL, QUESTION_CLASSES, QUESTION_STATUS_LABEL,
  type Departure, type QuestionClass, type QuestionInfo, type QueueEntry, type QueueFilter,
} from "../questions";
import {
  alternativeEntry, alternativeFor, byCase, changedResults, resultsRestingOn,
  type Alternative, type ChangedResult, type StoredResult,
} from "../questionEffects";
import { answeredIds, applyAnswer } from "../questionAnswer";
import { buildHash, type Route } from "../router";
import {
  changeSetSig, draftEngine, draftsShown, ledgerSource, navigate, openEditor, putChangeEntry,
  putFileChange, trayOpenSig,
} from "../state";
import { viewContext, type ViewContext } from "./context";
import { NoLedger, ViewHeader } from "./ViewStub";

export type ReadText = (path: string) => Promise<string>;

// ---- small pieces

/** A program id as a reader says it. */
export function programName(id: string): string {
  if (id === "All") return "Shared";
  if (id === "SunBucks") return "SUN Bucks";
  return id.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** The agency behind an approval role, from the personas that sign as it. */
function agencyOf(role: string): string | null {
  return PERSONAS.find((p) => p.roles.includes(role))?.agency ?? null;
}

function ProgramTags({ programs }: { programs: string[] }) {
  return <>{programs.map((p) => <span key={p} class={`tag prog-${p.toLowerCase()}`}>{programName(p)}</span>)}</>;
}

function ClassBadge({ cls }: { cls: QuestionClass }) {
  return <span class={`tag qclass qclass-${cls}`} title={QUESTION_CLASS_BLURB[cls]}>{QUESTION_CLASS_LABEL[cls]}</span>;
}

function StatusTag({ q }: { q: Pick<QuestionInfo, "status"> }) {
  return <span class={`tag qstatus qstatus-${q.status}`}>{QUESTION_STATUS_LABEL[q.status]}</span>;
}

function qHref(r: Route, id: string, params: Record<string, string> = {}): string {
  return buildHash({ ...r, view: "questions", arg: id, params });
}

function itemHref(r: Route, id: string): string {
  return buildHash({ ...r, view: "item", arg: id, params: {} });
}

function excerptHref(r: Route, id: string): string {
  return buildHash({ ...r, view: "source", arg: id, params: { excerpt: id } });
}

const PROSE_TOKEN = /`?\b([a-z][a-z0-9]*_[a-z0-9_]+)\b`?(?:'s)?(?:\s*\((CO-\d+)\))?|\b(CO-\d+)(?:-T\d+)?\b|\b(OQ-\d+)\b|\b(S\d+)\b|\b(D-\d+)\b/g;

/** Ledger prose with every item, excerpt, question and document it names
 *  made a link, and an item's identifier read as its name. */
export function Prose(
  { text, engine, vol, r, class: extra }:
  { text: string; engine: Engine; vol: LoadedVolume; r: Route; class?: string },
) {
  const out: ComponentChildren[] = [];
  let last = 0;
  const sources = new Set(vol.sources.map((s) => s.id));
  const docs = new Set(vol.documents.map((d) => d.id));
  // The item the text named last: "x_y (CO-12, 2)" names it once, by name,
  // and the id that follows stays a small id.
  let named: string | null = null;
  for (const m of text.matchAll(PROSE_TOKEN)) {
    const at = m.index ?? 0;
    const [whole, ident, identId, coId, oq, src, doc] = m;
    let node: ComponentChildren = null;
    if (ident) {
      const it = engine.item(ident) ?? (identId ? engine.itemById(identId) : undefined);
      if (it) node = <a class="ref" href={itemHref(r, it.id)} title={`${it.id} · ${it.identifier}`}>{it.name}</a>;
      named = it?.id ?? null;
    } else if (coId) {
      const it = engine.itemById(coId);
      if (it && it.id === named && /^\s*\($/.test(text.slice(last, at))) {
        node = <a class="ref mono" href={itemHref(r, it.id)} title={it.name}><small>{it.id}</small></a>;
      } else if (it) node = <a class="ref" href={itemHref(r, it.id)} title={it.id}>{it.name}</a>;
      named = null;
    } else if (oq) {
      node = <a class="ref" href={qHref(r, oq)}>{oq}</a>;
    } else if (src && sources.has(src)) {
      node = <a class="ref" href={excerptHref(r, src)}>{src}</a>;
    } else if (doc && docs.has(doc)) {
      node = <a class="ref" href={buildHash({ ...r, view: "document", arg: doc, params: {} })}>{doc}</a>;
    }
    if (!node) continue;
    if (at > last) out.push(text.slice(last, at));
    out.push(node);
    last = at + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <span class={`prose${extra ? ` ${extra}` : ""}`}>{out}</span>;
}

function clip(text: string, n: number): string {
  if (text.length <= n) return text;
  const cut = text.slice(0, n);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), n - 20))}…`;
}

function ItemLinks({ items, r, max }: { items: Item[]; r: Route; max?: number }) {
  const shown = max ? items.slice(0, max) : items;
  return (
    <>
      {shown.map((it, i) => (
        <span key={it.id}>{i > 0 && "; "}<a href={itemHref(r, it.id)}>{it.name}</a></span>
      ))}
      {max && items.length > max && <span class="muted"> and {items.length - max} more</span>}
    </>
  );
}

function ExcerptLinks({ excerpts, r, max }: { excerpts: Source[]; r: Route; max?: number }) {
  const shown = max ? excerpts.slice(0, max) : excerpts;
  return (
    <>
      {shown.map((s, i) => (
        <span key={s.id}>
          {i > 0 && "; "}
          <a href={excerptHref(r, s.id)}>{s.title || s.citation}</a>
          {isUnverified(s) && <> <span class="flag unverified">Unverified</span></>}
        </span>
      ))}
      {max && excerpts.length > max && <span class="muted"> and {excerpts.length - max} more</span>}
    </>
  );
}

// ---- the questions the page shows

/** The volume's questions, or, while drafts are shown and an answer is
 *  staged, the staged open-questions.md: an answered question moves to
 *  Resolved in the draft view. */
export function questionsInView(vol: LoadedVolume): OpenQuestion[] {
  if (!draftsShown()) return vol.openQuestions;
  const path = `${vol.path}/open-questions.md`;
  const staged = fileEntries(changeSetSig.value).find((f) => f.path === path)?.after;
  return staged ? parseOpenQuestions(staged) : vol.openQuestions;
}

// ---- effects on the stored households

export interface QuestionEffect {
  alternative: Alternative | null;
  /** The results that change under the alternative, when there is one. */
  changed: ChangedResult[] | null;
  /** The results that rest on the items carrying the assumption. */
  resting: StoredResult[];
}

export function questionEffect(engine: Engine, vol: LoadedVolume, q: Pick<QuestionInfo, "id" | "items">): QuestionEffect {
  const resting = resultsRestingOn(engine, vol.cases, q.items.map((it) => it.identifier));
  const alternative = alternativeFor(q.id);
  const entry = alternative ? alternativeEntry(engine, vol.chapterOf, alternative) : null;
  const changed = entry ? changedResults(engine, vol.cases, entry) : null;
  return { alternative, changed, resting };
}

function households(rs: readonly StoredResult[]): number {
  return new Set(rs.map((x) => x.caseId)).size;
}

function EffectSummary({ effect }: { effect: QuestionEffect | undefined }) {
  if (!effect) return <span class="muted">Working out the stored households…</span>;
  const { alternative, changed, resting } = effect;
  if (alternative && changed) {
    return (
      <span>
        {alternative.label}:{" "}
        <b>{changed.length
          ? `${changed.length} stored result${changed.length === 1 ? "" : "s"} in ${households(changed)} household${households(changed) === 1 ? "" : "s"} change`
          : "no stored household result changes"}</b>.
      </span>
    );
  }
  if (!resting.length) return <span>No stored household result rests on it.</span>;
  return (
    <span>
      {resting.length} stored result{resting.length === 1 ? "" : "s"} in {households(resting)} household{households(resting) === 1 ? "" : "s"} rest on it.{" "}
      <span class="muted">The question names no single other value, so the new values are not worked out.</span>
    </span>
  );
}

/** Works the effects out after the page has painted, one question at a time,
 *  so a long queue never holds the first paint. */
function useEffects(engine: Engine, vol: LoadedVolume, entries: QueueEntry[]) {
  const done = useSignal<Map<string, QuestionEffect>>(new Map());
  const key = entries.map((e) => e.id).join(",");
  useEffect(() => {
    let live = true;
    const map = new Map<string, QuestionEffect>();
    done.value = map;
    const queue = [...entries];
    const step = () => {
      if (!live || !queue.length) return;
      const e = queue.shift()!;
      map.set(e.id, questionEffect(engine, vol, e));
      done.value = new Map(map);
      setTimeout(step, 0);
    };
    const t = setTimeout(step, 30);
    return () => { live = false; clearTimeout(t); };
  }, [engine, vol, key]);
  return done.value;
}

// ---- the queue

function readFilter(params: Record<string, string>, persona: ViewContext["persona"]): QueueFilter & { mine: boolean } {
  const cls = QUESTION_CLASSES.includes(params.class as QuestionClass) ? params.class as QuestionClass : undefined;
  return {
    program: params.program || undefined,
    owner: params.owner || undefined,
    cls,
    affectsOutcome: params.affects === "1",
    blocksCertification: params.blocks === "1",
    text: params.q || undefined,
    mine: params.mine ? params.mine === "1" : Boolean(persona && persona.roles.length),
  };
}

function QueueCard(
  { e, ctx, effect }: { e: QueueEntry; ctx: ViewContext; effect: QuestionEffect | undefined },
) {
  const { engine, vol, route: r } = ctx;
  return (
    <li class="qcard" data-question={e.id} data-class={e.cls}>
      <h3><a href={qHref(r, e.id)}>{e.title}</a></h3>
      <div class="qmeta">
        <ClassBadge cls={e.cls} />
        {e.status === "partly" && <StatusTag q={e} />}
        {e.blocksCertification && (
          <span class="flag blocks" title="The stopping rule accepts an open question only as a state policy choice with the text checked recorded, or as blocked on a named document.">
            Blocks certification
          </span>
        )}
        <ProgramTags programs={e.programs} />
        <small class="mono muted">{e.id}</small>
      </div>
      <dl>
        {e.owners.length > 1 && (
          <><dt>Also answers</dt><dd>{e.owners.slice(1).join(", ")}</dd></>
        )}
        <dt>In force meanwhile</dt>
        <dd class="assumption-line"><Prose text={clip(e.assumption, 320)} engine={engine} vol={vol} r={r} /></dd>
        {e.waitingOn && (
          <><dt>Waiting on</dt><dd><Prose text={clip(e.waitingOn, 240)} engine={engine} vol={vol} r={r} /></dd></>
        )}
        <dt>Rule text it turns on</dt>
        <dd>{e.excerpts.length ? <><ExcerptLinks excerpts={e.excerpts} r={r} max={3} />{e.excerptsFromItems && <span class="muted"> (cited by its items)</span>}</> : <span class="muted">The question cites no excerpt.</span>}</dd>
        <dt>Items carrying it</dt>
        <dd>{e.items.length ? <ItemLinks items={e.items} r={r} max={4} /> : <span class="muted">No item names it.</span>}</dd>
        <dt>If answered the other way</dt>
        <dd class="effect"><EffectSummary effect={effect} /></dd>
      </dl>
      <div class="qactions">
        <a class="btn" href={qHref(r, e.id)}>Open</a>
        <a class="btn" href={qHref(r, e.id, { answer: "1" })}>Answer</a>
      </div>
    </li>
  );
}

function Filters(
  { ctx, f, programs, owners, shown, total }:
  { ctx: ViewContext; f: ReturnType<typeof readFilter>; programs: string[]; owners: string[]; shown: number; total: number },
) {
  const { route: r, persona, engine } = ctx;
  const set = (patch: Record<string, string>) => {
    const params = { ...r.params, ...patch };
    for (const k of Object.keys(params)) if (params[k] === "") delete params[k];
    navigate({ params });
  };
  const mineRoles = persona ? personaRoles(persona, engine.meta) : [];
  return (
    <>
      <form class="qfilters" role="search" onSubmit={(ev) => ev.preventDefault()}>
        <label>Program
          <select value={f.program ?? ""} onChange={(ev) => set({ program: (ev.target as HTMLSelectElement).value })}>
            <option value="">All programs</option>
            {programs.map((p) => <option key={p} value={p}>{programName(p)}</option>)}
          </select>
        </label>
        <label>Owner
          <select value={f.owner ?? ""} onChange={(ev) => set({ owner: (ev.target as HTMLSelectElement).value })}>
            <option value="">Anyone</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label>Kind of question
          <select value={f.cls ?? ""} onChange={(ev) => set({ class: (ev.target as HTMLSelectElement).value })}>
            <option value="">Any</option>
            {QUESTION_CLASSES.map((c) => <option key={c} value={c}>{QUESTION_CLASS_LABEL[c]}</option>)}
          </select>
        </label>
        <label>Search
          <input
            type="search" value={f.text ?? ""} placeholder="words, OQ-n"
            onChange={(ev) => set({ q: (ev.target as HTMLInputElement).value.trim() })}
          />
        </label>
        <label class="check">
          <input type="checkbox" checked={Boolean(f.affectsOutcome)} onChange={(ev) => set({ affects: (ev.target as HTMLInputElement).checked ? "1" : "" })} />
          Affects an outcome
        </label>
        <label class="check">
          <input type="checkbox" checked={Boolean(f.blocksCertification)} onChange={(ev) => set({ blocks: (ev.target as HTMLInputElement).checked ? "1" : "" })} />
          Blocks certification
        </label>
        {mineRoles.length > 0 && (
          <label class="check">
            <input type="checkbox" checked={f.mine} onChange={(ev) => set({ mine: (ev.target as HTMLInputElement).checked ? "1" : "0" })} />
            Only {persona!.label}'s ({mineRoles.length === 1 ? mineRoles[0] : `${mineRoles.length} roles`})
          </label>
        )}
      </form>
      <p class="qsummary" aria-live="polite">
        Showing <b>{shown}</b> of {total} open questions.
        {shown < total && <> <a href={buildHash({ ...r, params: persona && persona.roles.length ? { mine: "0" } : {} })}>Show all</a></>}
      </p>
    </>
  );
}

function Queue({ ctx, entries }: { ctx: ViewContext; entries: QueueEntry[] }) {
  const { engine, vol, route: r, persona } = ctx;
  const f = readFilter(r.params, persona);
  const mineRoles = persona ? personaRoles(persona, engine.meta) : [];
  const shown = entries.filter((e) => matchesFilter(e, f)
    && (!f.mine || !mineRoles.length || e.owners.some((o) => mineRoles.includes(o))));
  const owners = [...new Set(entries.flatMap((e) => e.owners))]
    .sort((a, b) => {
      const roles = engine.meta.approval_policy?.roles ?? [];
      return (roles.indexOf(a) + 1 || 99) - (roles.indexOf(b) + 1 || 99);
    });
  const programs = volumePrograms(engine).filter((p) => entries.some((e) => e.programs.includes(p)));
  const effects = useEffects(engine, vol, shown);
  return (
    <>
      <Filters ctx={ctx} f={f} programs={programs} owners={owners} shown={shown.length} total={entries.length} />
      {shown.length === 0 && <p class="muted">No open question matches these filters.</p>}
      {groupByOwner(engine, shown).map((g) => (
        <section class="qgroup" key={g.owner} data-owner={g.owner}>
          <h2>{g.owner}{agencyOf(g.owner) && <span class="agency">{agencyOf(g.owner)}</span>} <span class="tag">{g.entries.length}</span></h2>
          <ul class="qlist qcards">
            {g.entries.map((e) => <QueueCard key={e.id} e={e} ctx={ctx} effect={effects.get(e.id)} />)}
          </ul>
        </section>
      ))}
    </>
  );
}

function Resolved({ ctx, questions }: { ctx: ViewContext; questions: QuestionInfo[] }) {
  const text = useSignal("");
  const { route: r } = ctx;
  const t = text.value.trim().toLowerCase();
  const shown = t
    ? questions.filter((q) => [q.id, q.title, q.body].some((s) => s.toLowerCase().includes(t)))
    : questions;
  return (
    <details class="qresolved">
      <summary>Resolved questions ({questions.length})</summary>
      <label>Search the resolved questions{" "}
        <input type="search" value={text.value} placeholder="words, OQ-n" onInput={(ev) => { text.value = (ev.target as HTMLInputElement).value; }} />
      </label>
      {t && <p class="muted">{shown.length} match.</p>}
      <ul class="qlist resolved">
        {shown.map((q) => (
          <li key={q.id}>
            <a href={qHref(r, q.id)}>{q.title}</a>{" "}
            <small class="mono muted">{q.id}</small> <ProgramTags programs={q.programs} />
          </li>
        ))}
      </ul>
    </details>
  );
}

// ---- departures

function DepartureCard({ d, ctx, resting }: { d: Departure; ctx: ViewContext; resting: StoredResult[] | undefined }) {
  const { engine, vol, route: r } = ctx;
  const questions = d.questions.map((id) => vol.openQuestions.find((q) => q.id === id)).filter((q): q is OpenQuestion => Boolean(q));
  return (
    <li class="qcard departure" data-item={d.item.id}>
      <h3><a href={itemHref(r, d.item.id)}>{d.item.name}</a></h3>
      <div class="qmeta">
        <span class="flag override">Statute over rule</span>
        <ProgramTags programs={[d.item.program]} />
        {d.item.effective?.from && <span>since {d.item.effective.from}</span>}
        <small class="mono muted">{d.item.id}</small>
      </div>
      <div class="sides">
        <div class="side">
          <h4>The codex follows</h4>
          {d.statutes.length ? <ExcerptLinks excerpts={d.statutes} r={r} /> : <span class="muted">No statute excerpt cited.</span>}
        </div>
        <div class="side">
          <h4>Colorado rule it departs from</h4>
          {d.ruleOverridden ? <p class="rule-overridden"><Prose text={d.ruleOverridden} engine={engine} vol={vol} r={r} /></p> : null}
          {d.rules.length > 0 && <ExcerptLinks excerpts={d.rules} r={r} />}
        </div>
      </div>
      <dl>
        <dt>Reasoning</dt>
        <dd><Prose text={d.reasoning} engine={engine} vol={vol} r={r} /></dd>
        <dt>Open questions</dt>
        <dd>
          {questions.length
            ? questions.map((q, i) => (
              <span key={q.id}>{i > 0 && "; "}<a href={qHref(r, q.id)}>{questionInfo(engine, q).title}</a> <small class="mono muted">{q.id}</small></span>
            ))
            : <span class="muted">None: Legal has not been asked.</span>}
        </dd>
        <dt>Stored households</dt>
        <dd>{resting === undefined ? <span class="muted">Working out…</span>
          : resting.length ? `${resting.length} stored results in ${households(resting)} households rest on it.`
          : "No stored household result rests on it."}</dd>
      </dl>
      <div class="qactions">
        {questions.filter((q) => isOpen(questionInfo(engine, q).status)).map((q) => (
          <a key={q.id} class="btn" href={qHref(r, q.id, { answer: "1" })}>Record Legal's decision ({q.id})</a>
        ))}
      </div>
    </li>
  );
}

function Departures({ ctx }: { ctx: ViewContext }) {
  const { engine, vol } = ctx;
  const ds = departures(engine, vol.sources, (s) => excerptKind(s, vol.documents));
  const resting = useSignal<Map<string, StoredResult[]> | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      resting.value = new Map(ds.map((d) => [d.item.id, resultsRestingOn(engine, vol.cases, [d.item.identifier])]));
    }, 30);
    return () => clearTimeout(t);
  }, [engine, vol]);
  return (
    <>
      <p class="purpose">
        Each item below follows a statute where a Colorado rule, not yet amended, says otherwise. Each is a decision for Legal: whether the statute governs, from when, and whether the agency has been told.
      </p>
      <ul class="qcards departures">
        {ds.map((d) => <DepartureCard key={d.item.id} d={d} ctx={ctx} resting={resting.value?.get(d.item.id)} />)}
      </ul>
    </>
  );
}

// ---- the view

export function QuestionsView({ readText }: { readText?: ReadText } = {}) {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  if (ctx.route.arg) return <QuestionPage ctx={ctx} id={ctx.route.arg} readText={readText} />;
  const { engine, vol, route: r } = ctx;
  const all = questionInfos(engine, questionsInView(vol));
  const open = all.filter((q) => isOpen(q.status)).map((q) => queueEntry(engine, vol.sources, q));
  const resolved = all.filter((q) => !isOpen(q.status));
  const tab = r.params.tab === "departures" ? "departures" : "queue";
  const departureCount = engine.items().filter((it) => it.statute_override).length;
  const tabHref = (t: string) => buildHash({ ...r, params: t === "queue" ? {} : { tab: t } });
  return (
    <section class="view workflow questions">
      <ViewHeader view="questions" />
      <nav class="qtabs" aria-label="Questions">
        <a href={tabHref("queue")} aria-current={tab === "queue" ? "page" : undefined}>Decision queue ({open.length})</a>
        <a href={tabHref("departures")} aria-current={tab === "departures" ? "page" : undefined}>Departures ({departureCount})</a>
      </nav>
      {tab === "queue"
        ? <><Queue ctx={ctx} entries={open} /><Resolved ctx={ctx} questions={resolved} /></>
        : <Departures ctx={ctx} />}
    </section>
  );
}

// ---- one question's page

function ResultsTable(
  { rows, engine, changed }: { rows: Array<StoredResult | ChangedResult>; engine: Engine; changed: boolean },
) {
  return (
    <div class="qtablewrap">
      <table class="qresults">
        <thead>
          <tr><th>Person</th><th>Result</th><th>Month</th><th>Today</th>{changed && <th>Under the other reading</th>}</tr>
        </thead>
        <tbody>
          {rows.map((x, i) => {
            const it = engine.item(x.identifier) ?? null;
            return (
              <tr key={i}>
                <td>{personLabel(x.person)}</td>
                <td>{it ? it.name : x.identifier}</td>
                <td>{x.month ?? ""}</td>
                <td>{formatValue(it, x.value)}</td>
                {changed && <td class="changed">{formatValue(it, (x as ChangedResult).after)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HouseholdResults(
  { rs, engine, r, changed }: { rs: Array<StoredResult | ChangedResult>; engine: Engine; r: Route; changed: boolean },
) {
  const outcomes = new Set((engine.meta.programs ?? []).flatMap((p) => p.outcomes ?? []));
  return (
    <>
      {byCase(rs).map((g) => {
        const main = g.results.filter((x) => changed || outcomes.has(x.identifier));
        const rest = changed ? [] : g.results.filter((x) => !outcomes.has(x.identifier));
        return (
          <details class="qhousehold" key={g.caseId} data-case={g.caseId} open={changed}>
            <summary>
              <b>{g.caseTitle}</b> <small class="mono muted">{g.caseId}</small>{" "}
              <span class="tag">{g.results.length} result{g.results.length === 1 ? "" : "s"}</span>
            </summary>
            {main.length > 0 && <ResultsTable rows={main} engine={engine} changed={changed} />}
            {rest.length > 0 && (
              <details>
                <summary>{rest.length} intermediate result{rest.length === 1 ? "" : "s"}</summary>
                <ResultsTable rows={rest} engine={engine} changed={false} />
              </details>
            )}
            <p><a href={buildHash({ ...r, view: "cases", arg: g.caseId, params: {} })}>Open this household</a></p>
          </details>
        );
      })}
    </>
  );
}

function Effects({ q, ctx }: { q: QueueEntry; ctx: ViewContext }) {
  const { engine, vol, route: r } = ctx;
  const effect = useSignal<QuestionEffect | null>(null);
  useEffect(() => {
    effect.value = null;
    const t = setTimeout(() => { effect.value = questionEffect(engine, vol, q); }, 30);
    return () => clearTimeout(t);
  }, [engine, vol, q.id]);
  const e = effect.value;
  if (!e) return <p class="muted">Working out the stored households…</p>;
  return (
    <>
      {e.alternative && e.changed && (
        <div class="alternative" data-alternative={e.alternative.identifier}>
          <p>
            <b>The other reading:</b> {e.alternative.label}.{" "}
            <span class="muted">(<a href={buildHash({ ...r, view: "item", arg: engine.item(e.alternative.identifier)?.id ?? "", params: {} })}>{engine.item(e.alternative.identifier)?.name}</a>{" "}
              {formatValue(engine.item(e.alternative.identifier), engine.paramValue(engine.item(e.alternative.identifier)!))} becomes {formatValue(engine.item(e.alternative.identifier), e.alternative.value)}.)</span>
          </p>
          {e.alternative.caveat && <p class="muted">{e.alternative.caveat}</p>}
          <p class="effect-count">
            {e.changed.length
              ? <>Re-running the {vol.cases.length} stored households with that one change: <b>{e.changed.length} result{e.changed.length === 1 ? "" : "s"} in {households(e.changed)} household{households(e.changed) === 1 ? "" : "s"} change.</b></>
              : <>Re-running the {vol.cases.length} stored households with that one change: <b>no stored result changes.</b></>}
          </p>
          <HouseholdResults rs={e.changed} engine={engine} r={r} changed />
        </div>
      )}
      <div class="resting">
        {e.alternative
          ? <h3>Every stored result that rests on it</h3>
          : <p class="muted">The question names no single other value, so the new values are not worked out. These stored results rest on the items carrying the assumption and could change with the answer.</p>}
        {e.resting.length
          ? <p>{e.resting.length} result{e.resting.length === 1 ? "" : "s"} in {households(e.resting)} of {vol.cases.length} stored households.</p>
          : <p>No stored household result rests on it.</p>}
        <HouseholdResults rs={e.resting} engine={engine} r={r} changed={false} />
      </div>
    </>
  );
}

function ExcerptBlock({ s, vol, r }: { s: Source; vol: LoadedVolume; r: Route }) {
  const doc = s.document ? vol.documents.find((d) => d.id === s.document) : undefined;
  return (
    <div class="excerpt" data-excerpt={s.id}>
      <a href={excerptHref(r, s.id)}>{s.title || s.citation}</a>{" "}
      <span class="tag excerpt-kind">{EXCERPT_KIND_LABEL[excerptKind(s, vol.documents)]}</span>
      {isUnverified(s) && <> <span class="flag unverified">Unverified: not a quotation</span></>}
      {doc && <> · <a href={buildHash({ ...r, view: "document", arg: doc.id, params: { excerpt: s.id } })}>in {doc.title}</a></>}
      {" "}<small class="mono muted">{s.id}</small>
      {s.text && (
        <details>
          <summary>Read the text</summary>
          <pre class="statute">{s.text}</pre>
        </details>
      )}
    </div>
  );
}

function AnswerForm({ q, ctx, readText }: { q: QueueEntry; ctx: ViewContext; readText?: ReadText }) {
  const { engine, vol, persona, today, route: r } = ctx;
  const alt = alternativeFor(q.id);
  const roles = engine.meta.approval_policy?.roles ?? [];
  const mine = persona ? personaRoles(persona, engine.meta) : [];
  const defaultRole = q.owners.find((o) => mine.includes(o)) ?? q.owners[0] ?? roles[0] ?? "";
  const reading = useSignal<"current" | "alternative" | "other">("current");
  const decision = useSignal("");
  const citation = useSignal("");
  const by = useSignal("");
  const role = useSignal(defaultRole);
  const date = useSignal(today);
  const error = useSignal("");
  const busy = useSignal(false);
  const staged = useSignal<{ adoptedAlternative: boolean } | null>(null);
  const followUpDone = useSignal<string[]>([]);
  const carrying = q.items.filter((it) => (it.open ?? []).includes(q.id));

  const submit = async (ev: Event) => {
    ev.preventDefault();
    error.value = "";
    const text = decision.value.trim()
      || (reading.value === "current" ? "Keep the reading the codex applies." : reading.value === "alternative" && alt ? `${alt.label}.` : "");
    if (!text) { error.value = "Write the decision."; return; }
    if (!by.value.trim()) { error.value = "Name who decided."; return; }
    busy.value = true;
    try {
      const path = `${vol.path}/open-questions.md`;
      const stagedFile = fileEntries(changeSetSig.value).find((f) => f.path === path);
      const read = readText ?? ((p: string) => ledgerSource().readText(p));
      const before = stagedFile?.before ?? await read(path);
      const base = stagedFile?.after ?? before;
      const after = applyAnswer(base, q.id, {
        decision: text, citation: citation.value, by: by.value, role: role.value, date: date.value,
        followUps: q.items.map((it) => it.id),
      });
      const ids = answeredIds(before, after);
      putFileChange({
        path, before, after,
        label: ids.length > 1 ? `Answers to ${ids.join(", ")}` : `Answer to ${q.id}`,
      });
      staged.value = { adoptedAlternative: reading.value === "alternative" };
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      busy.value = false;
    }
  };

  const stageDropQuestion = () => {
    const eng = draftEngine() ?? engine;
    const done: string[] = [];
    for (const it of carrying) {
      const cur = eng.itemById(it.id) ?? it;
      const after: Item = { ...JSON.parse(JSON.stringify(cur)) as Item, open: (cur.open ?? []).filter((o) => o !== q.id) };
      if (!after.open!.length) delete after.open;
      putChangeEntry({ id: it.id, chapter: vol.chapterOf[it.id] ?? "", before: engine.itemById(it.id) ?? it, after });
      done.push(it.id);
    }
    followUpDone.value = [...followUpDone.value, ...done];
  };

  const stageAlternative = () => {
    if (!alt) return;
    const entry = alternativeEntry(draftEngine() ?? engine, vol.chapterOf, alt);
    if (!entry) return;
    putChangeEntry({ ...entry, before: engine.itemById(entry.id) ?? entry.before });
    followUpDone.value = [...followUpDone.value, entry.id];
  };

  if (staged.value) {
    return (
      <div class="qstaged" role="status">
        <p>
          <b>Staged in the change tray.</b> {q.id} is retitled "Resolved: {q.title}" with your answer appended. Propose it from the tray to send it for review.
        </p>
        <h3>Follow-up edits</h3>
        <ul>
          {carrying.length > 0 && (
            <li>
              <button type="button" class="btn small" disabled={carrying.every((it) => followUpDone.value.includes(it.id))} onClick={stageDropQuestion}>
                Take {q.id} off the {carrying.length} item{carrying.length === 1 ? "" : "s"} that carry it
              </button>
            </li>
          )}
          {staged.value.adoptedAlternative && alt && (
            <li>
              <button type="button" class="btn small" disabled={followUpDone.value.includes(engine.item(alt.identifier)?.id ?? "")} onClick={stageAlternative}>
                Stage the new value: {engine.item(alt.identifier)?.name} becomes {formatValue(engine.item(alt.identifier), alt.value)}
              </button>
            </li>
          )}
          {q.items.map((it) => (
            <li key={it.id}>
              <button type="button" class="btn small" onClick={() => openEditor(it.id)}>Edit</button>{" "}
              <a href={itemHref(r, it.id)}>{it.name}</a> <small class="mono muted">{it.id}</small>
            </li>
          ))}
        </ul>
        {followUpDone.value.length > 0 && <p>Staged: {followUpDone.value.join(", ")}.</p>}
        <p>
          <button type="button" class="btn" onClick={() => { trayOpenSig.value = true; }}>Open the change tray</button>{" "}
          <button type="button" class="btn" onClick={() => { staged.value = null; }}>Change the answer</button>
        </p>
      </div>
    );
  }

  return (
    <form class="qanswer" onSubmit={submit} data-question={q.id}>
      {alt && (
        <fieldset>
          <legend>Decision</legend>
          <label><input type="radio" name="reading" checked={reading.value === "current"} onChange={() => { reading.value = "current"; }} /> Keep the reading in force</label>
          <label><input type="radio" name="reading" checked={reading.value === "alternative"} onChange={() => { reading.value = "alternative"; }} /> Adopt the other reading: {alt.label}</label>
          <label><input type="radio" name="reading" checked={reading.value === "other"} onChange={() => { reading.value = "other"; }} /> Something else (say what below)</label>
        </fieldset>
      )}
      <label>
        The decision
        <span class="hint">In your words: what the codex should do, and from when.</span>
        <textarea rows={4} value={decision.value} onInput={(ev) => { decision.value = (ev.target as HTMLTextAreaElement).value; }} />
      </label>
      <label>
        Citation
        <span class="hint">The rule paragraph, statute, memo or letter the decision rests on.</span>
        <input type="text" value={citation.value} onInput={(ev) => { citation.value = (ev.target as HTMLInputElement).value; }} />
      </label>
      <div class="row">
        <label>
          Decided by
          <input type="text" autoComplete="name" value={by.value} onInput={(ev) => { by.value = (ev.target as HTMLInputElement).value; }} />
        </label>
        <label>
          In the role of
          <select value={role.value} onChange={(ev) => { role.value = (ev.target as HTMLSelectElement).value; }}>
            {[...new Set([...q.owners, ...roles])].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date.value} onInput={(ev) => { date.value = (ev.target as HTMLInputElement).value; }} />
        </label>
      </div>
      <p class="muted">
        This stages a change to the open-questions list: the question is retitled "Resolved:" and your answer is added to it. Nothing is published until the change is proposed from the tray.
      </p>
      <div>
        <button type="submit" class="btn propose" disabled={busy.value}>{busy.value ? "Staging…" : "Stage the answer"}</button>
        {error.value && <span class="bad" role="alert"> {error.value}</span>}
      </div>
    </form>
  );
}

/** One open question on its own page: the queue card in full. */
export function QuestionPage({ ctx, id, readText }: { ctx: ViewContext; id: string; readText?: ReadText }) {
  const { engine, vol, route: r } = ctx;
  const raw = questionsInView(vol).find((q) => q.id === id);
  // "Answer" on a queue card lands here with ?answer=1: bring the form into
  // view and put the cursor in it.
  useEffect(() => {
    if (r.params.answer !== "1") return;
    const el = document.getElementById("answer");
    el?.scrollIntoView?.({ block: "start" });
    el?.querySelector<HTMLElement>("textarea, input[type=radio]")?.focus({ preventScroll: true });
  }, [id, r.params.answer]);
  if (!raw) return <p class="status bad">No open question {id} in this volume.</p>;
  const q = queueEntry(engine, vol.sources, questionInfo(engine, raw));
  const docs = citedDocuments(q.body, vol.documents);
  const notes = questionNotes(q.body);
  const latest = notes[notes.length - 1];
  const earlier = notes.slice(0, -1);
  const open = isOpen(q.status);
  return (
    <section class="view question" data-question={q.id}>
      <div class="cardhead">
        <a class="btn" href={buildHash({ ...r, view: "questions", arg: null, params: {} })}>All questions</a>
      </div>
      <h1>{q.title}</h1>
      <p class="idline qmeta">
        <StatusTag q={q} />
        {open && <ClassBadge cls={q.cls} />}
        {open && q.blocksCertification && <span class="flag blocks">Blocks certification</span>}
        <ProgramTags programs={q.programs} />
        <small class="mono muted">{q.id}</small>
      </p>

      {open && (
        <>
          <div class="qsection">
            <h2>Who answers</h2>
            <p>
              {q.owners.length
                ? q.owners.map((o, i) => <span key={o}>{i > 0 && ", "}<b>{o}</b>{agencyOf(o) && <span class="muted"> ({agencyOf(o)})</span>}</span>)
                : "No owner named."}
            </p>
            <p class="muted">{QUESTION_CLASS_BLURB[q.cls]}</p>
          </div>

          <div class="qsection">
            <h2>The reading in force until it is answered</h2>
            <p class="assumption"><Prose text={q.assumption} engine={engine} vol={vol} r={r} /></p>
            {q.waitingOn && <p><b>Waiting on:</b> <Prose text={q.waitingOn} engine={engine} vol={vol} r={r} /></p>}
          </div>
        </>
      )}

      <div class="qsection">
        <h2>Rule text it turns on</h2>
        {q.excerptsFromItems && (
          <p class="muted">The question cites no excerpt of its own; these are the excerpts the items carrying it rest on.</p>
        )}
        {q.excerpts.length
          ? q.excerpts.map((s) => <ExcerptBlock key={s.id} s={s} vol={vol} r={r} />)
          : <p class="muted">The question cites no excerpt.</p>}
        {docs.length > 0 && (
          <p>
            <b>Documents it names:</b>{" "}
            {docs.map((d, i) => (
              <span key={d.id}>{i > 0 && "; "}<a href={buildHash({ ...r, view: "document", arg: d.id, params: {} })}>{d.title}</a></span>
            ))}
          </p>
        )}
      </div>

      <div class="qsection">
        <h2>Items that carry the assumption</h2>
        {q.items.length === 0
          ? <p class="muted">No item names this question.</p>
          : (
            <ul class="qitems">
              {q.items.map((it) => (
                <li key={it.id}>
                  <a href={itemHref(r, it.id)}><b>{it.name}</b></a>{" "}
                  <span class="muted">{kindLabel(it.kind)}</span>{" "}
                  <ProgramTags programs={[it.program]} />{" "}
                  <small class="mono muted">{it.id}</small>
                </li>
              ))}
            </ul>
          )}
        {q.outcomes.length > 0 && (
          <p><b>Program outcomes it reaches:</b> <ItemLinks items={q.outcomes} r={r} max={12} /></p>
        )}
      </div>

      {open && (
        <div class="qsection effects">
          <h2>Stored households, if it were answered the other way</h2>
          <Effects q={q} ctx={ctx} />
        </div>
      )}

      {open && (
        <div class="qsection" id="answer">
          <h2>Answer this question</h2>
          <AnswerForm q={q} ctx={ctx} readText={readText} />
        </div>
      )}

      <div class="qsection qnotes qbody">
        <h2>The question's record</h2>
        {latest && (
          <div class="note latest">
            <span class="label">{latest.label ?? "The question as first written"}</span>
            <Prose text={latest.text} engine={engine} vol={vol} r={r} />
          </div>
        )}
        {earlier.length > 0 && (
          <details>
            <summary>Earlier notes ({earlier.length})</summary>
            {earlier.map((n, i) => (
              <div class="note" key={i}>
                <span class="label">{n.label ?? "The question as first written"}</span>
                <Prose text={n.text} engine={engine} vol={vol} r={r} />
              </div>
            ))}
          </details>
        )}
      </div>
    </section>
  );
}
