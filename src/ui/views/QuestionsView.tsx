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
import { formatDate, formatValue, personLabel } from "../present";
import { EXCERPT_KIND_LABEL, excerptKind, isUnverified } from "../provenance";
import { volumePrograms } from "../programs";
import {
  citedDocuments, departures, isOpen, matchesFilter, questionInfo, questionInfos, questionNotes,
  queueEntry, QUESTION_CLASS_BLURB, QUESTION_CLASS_LABEL, QUESTION_CLASSES, QUESTION_STATUS_LABEL,
  type Departure, type QuestionClass, type QuestionInfo, type QueueEntry, type QueueFilter,
} from "../questions";
import {
  alternativeEntry, alternativeFor, byCase, changedResults, resultsRestingOn,
  type Alternative, type ChangedResult, type StoredResult,
} from "../questionEffects";
import { agencyNotified, answeredIds, applyAnswer, stagedAnswers, type StagedAnswer } from "../questionAnswer";
import {
  changedBy, changedPhrase, departureItems, departureSince, householdCount, ownerGroups, ownsEntry, restingOn,
  restingPhrase, unknownReason,
} from "../counts";
import { SendChange } from "../sendChange";
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
    // The same item named twice in a row ("x (CO-1), x (CO-2)" for two items
    // with one name) reads once (HCPF analyst, OQ-410's reading).
    const between = text.slice(last, at);
    const prev = out[out.length - 1] as { props?: { children?: unknown; class?: string } } | undefined;
    const name = (node as { props?: { children?: unknown } }).props?.children;
    if (typeof name === "string" && prev?.props?.children === name && /^\s*(?:,|and)?\s*$/.test(between)) {
      last = at + whole.length;
      continue;
    }
    if (at > last) out.push(between);
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

/** What this browser's tray does to each question: answered, or an opinion
 *  recorded with it kept open. Read whether or not drafts are shown, so an
 *  answered question leaves the open list (HCPF analyst task 4: "two of us
 *  could answer it twice"). */
export function stagedQuestionState(vol: LoadedVolume): Map<string, StagedAnswer> {
  const path = `${vol.path}/open-questions.md`;
  const f = fileEntries(changeSetSig.value).find((x) => x.path === path);
  if (!f?.after || f.before === null) return new Map();
  return stagedAnswers(f.before, f.after);
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
  const resting = restingOn(engine, vol.cases, q.items.map((it) => it.identifier));
  const alternative = alternativeFor(q.id);
  const entry = alternative ? alternativeEntry(engine, vol.chapterOf, alternative) : null;
  const changed = entry ? changedBy(engine, vol.cases, [entry]) : null;
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
        <b>{changedPhrase(changed.length, households(changed))}</b>.
      </span>
    );
  }
  if (!resting.length) return <span>No stored household result rests on it.</span>;
  return (
    <span>
      {restingPhrase(resting.length, households(resting))}.{" "}
      <span class="muted">The question names no single other value to re-run with.</span>
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
  { e, ctx, effect, staged }: { e: QueueEntry; ctx: ViewContext; effect: QuestionEffect | undefined; staged?: StagedAnswer },
) {
  const { engine, vol, route: r } = ctx;
  return (
    <li class="qcard" data-question={e.id} data-class={e.cls} data-staged={staged ?? undefined}>
      <h3><a href={qHref(r, e.id)}>{e.title}</a></h3>
      <div class="qmeta">
        <ClassBadge cls={e.cls} />
        {e.status === "partly" && <StatusTag q={e} />}
        {staged === "answered" && <span class="tag qstaged-tag">Answer staged</span>}
        {staged === "opinion" && <span class="tag qstaged-tag">Opinion staged, kept open</span>}
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
        {staged !== "answered" && <a class="btn" href={qHref(r, e.id, { answer: "1" })}>Answer</a>}
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
            type="search" value={f.text ?? ""} placeholder="e.g. long-term care, OQ-519"
            onInput={(ev) => set({ q: (ev.target as HTMLInputElement).value })}
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

function Queue({ ctx, entries, staged }: { ctx: ViewContext; entries: QueueEntry[]; staged: Map<string, StagedAnswer> }) {
  const { engine, vol, route: r, persona } = ctx;
  const f = readFilter(r.params, persona);
  const mineRoles = persona ? personaRoles(persona, engine.meta) : [];
  const all = entries.filter((e) => matchesFilter(e, f) && (!f.mine || !persona || ownsEntry(engine, persona, e)));
  const answered = all.filter((e) => staged.get(e.id) === "answered");
  const shown = all.filter((e) => staged.get(e.id) !== "answered");
  const owners = [...new Set(entries.flatMap((e) => e.owners))]
    .sort((a, b) => {
      const roles = engine.meta.approval_policy?.roles ?? [];
      return (roles.indexOf(a) + 1 || 99) - (roles.indexOf(b) + 1 || 99);
    });
  const programs = volumePrograms(engine).filter((p) => entries.some((e) => e.programs.includes(p)));
  const effects = useEffects(engine, vol, shown);
  return (
    <>
      <Filters ctx={ctx} f={f} programs={programs} owners={owners} shown={shown.length} total={entries.length - [...staged.values()].filter((x) => x === "answered").length} />
      {shown.length === 0 && <p class="muted">No open question matches these filters.</p>}
      {ownerGroups(engine, shown, mineRoles).map((g) => (
        <section class={`qgroup${g.mine ? " mine" : ""}`} key={g.owner} data-owner={g.owner}>
          <h2>{g.owner}{agencyOf(g.owner) && <span class="agency">{agencyOf(g.owner)}</span>} <span class="tag">{g.entries.length}</span>{g.mine && <span class="muted small"> your role</span>}</h2>
          <ul class="qlist qcards">
            {g.entries.map((e) => <QueueCard key={e.id} e={e} ctx={ctx} effect={effects.get(e.id)} staged={staged.get(e.id)} />)}
          </ul>
        </section>
      ))}
      {answered.length > 0 && (
        <section class="qgroup qanswered" data-owner="answer staged">
          <h2>Answer staged in this browser <span class="tag">{answered.length}</span></h2>
          <p class="muted">Answered here and waiting to be sent; they leave the open list. Nothing is in the codex until the change is merged.</p>
          <ul class="qlist">
            {answered.map((e) => (
              <li key={e.id} data-question={e.id}><a href={qHref(r, e.id)}>{e.title}</a> <span class="tag qstaged-tag">Answer staged</span> <small class="mono muted">{e.id}</small></li>
            ))}
          </ul>
          <SendChange kind="answer" />
        </section>
      )}
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

function DepartureCard(
  { d, ctx, resting, staged }:
  { d: Departure; ctx: ViewContext; resting: StoredResult[] | undefined; staged: Map<string, StagedAnswer> },
) {
  const { engine, vol, route: r } = ctx;
  const questions = d.questions.map((id) => vol.openQuestions.find((q) => q.id === id)).filter((q): q is OpenQuestion => Boolean(q));
  const since = departureSince(d.item);
  // "Agency notified" as the question record states it, staged answers included.
  const inView = questionsInView(vol);
  const stagedFile = fileEntries(changeSetSig.value).find((f) => f.path === `${vol.path}/open-questions.md`)?.after;
  const stagedQs = stagedFile ? parseOpenQuestions(stagedFile) : inView;
  const notified = questions.map((q) => agencyNotified(stagedQs.find((x) => x.id === q.id)?.body ?? q.body)).find(Boolean) ?? null;
  const alt = questions.map((q) => alternativeFor(q.id)).find(Boolean) ?? null;
  return (
    <li class="qcard departure" data-item={d.item.id}>
      <h3><a href={itemHref(r, d.item.id)}>{d.item.name}</a></h3>
      <div class="qmeta">
        <span class="flag override">Statute over rule</span>
        <ProgramTags programs={[d.item.program]} />
        {since ? <span>since {formatDate(since)}</span> : <span class="muted">start date not stated</span>}
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
        <dt>Agency notified</dt>
        <dd>{notified ? <Prose text={notified} engine={engine} vol={vol} r={r} /> : <span class="muted">Not recorded. Record it with Legal's decision.</span>}</dd>
        <dt>Stored households</dt>
        <dd>{resting === undefined ? <span class="muted">Working out…</span>
          : `${restingPhrase(resting.length, households(resting))}.`}
          {alt && <DepartureRerun ctx={ctx} questionId={alt.question} />}
        </dd>
      </dl>
      <div class="qactions">
        {questions.filter((q) => isOpen(questionInfo(engine, q).status)).map((q) => (
          staged.get(q.id) === "answered"
            ? <span key={q.id} class="tag qstaged-tag">Legal's decision on {q.id} is staged</span>
            : (
              <a key={q.id} class="btn" href={qHref(r, q.id, { answer: "1" })}>
                Record Legal's decision ({q.id}){staged.get(q.id) === "opinion" ? ", an opinion is staged" : ""}
              </a>
            )
        ))}
      </div>
    </li>
  );
}

/** The other reading, re-run, on the departure card where Legal decides
 *  (Legal, new task: "the re-run is on the question page but not on the
 *  departure card"). */
function DepartureRerun({ ctx, questionId }: { ctx: ViewContext; questionId: string }) {
  const { engine, vol, route: r } = ctx;
  const out = useSignal<QuestionEffect | null>(null);
  useEffect(() => {
    const t = setTimeout(() => { out.value = questionEffect(engine, vol, { id: questionId, items: [] }); }, 40);
    return () => clearTimeout(t);
  }, [engine, vol, questionId]);
  const e = out.value;
  if (!e?.alternative || !e.changed) return null;
  return (
    <p class="rerun">
      Under the Colorado rule as written ({e.alternative.label}): <b>{changedPhrase(e.changed.length, households(e.changed))}</b>.{" "}
      <a href={qHref(r, questionId)}>See them on {questionId}</a>
    </p>
  );
}

function Departures({ ctx, staged }: { ctx: ViewContext; staged: Map<string, StagedAnswer> }) {
  const { engine, vol } = ctx;
  const ds = departures(engine, vol.sources, (s) => excerptKind(s, vol.documents));
  const resting = useSignal<Map<string, StoredResult[]> | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      resting.value = new Map(ds.map((d) => [d.item.id, restingOn(engine, vol.cases, [d.item.identifier])]));
    }, 30);
    return () => clearTimeout(t);
  }, [engine, vol]);
  return (
    <>
      <p class="purpose">
        Each item below follows a statute where a Colorado rule, not yet amended, says otherwise. Each is a decision for Legal: whether the statute governs, from when, and whether the agency has been told.
      </p>
      <ul class="qcards departures">
        {ds.map((d) => <DepartureCard key={d.item.id} d={d} ctx={ctx} resting={resting.value?.get(d.item.id)} staged={staged} />)}
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
  const departureCount = departureItems(engine).length;
  const staged = stagedQuestionState(vol);
  const answeredHere = [...staged.values()].filter((x) => x === "answered").length;
  const tabHref = (t: string) => buildHash({ ...r, params: t === "queue" ? {} : { tab: t } });
  return (
    <section class="view workflow questions">
      <ViewHeader view="questions" />
      <nav class="qtabs" aria-label="Questions">
        <a href={tabHref("queue")} aria-current={tab === "queue" ? "page" : undefined}>Decision queue ({open.length - answeredHere})</a>
        <a href={tabHref("departures")} aria-current={tab === "departures" ? "page" : undefined}>Departures ({departureCount})</a>
      </nav>
      {tab === "queue"
        ? <><Queue ctx={ctx} entries={open} staged={staged} /><Resolved ctx={ctx} questions={resolved} /></>
        : <Departures ctx={ctx} staged={staged} />}
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
                {changed && (
                  <td class="changed">
                    {formatValue(it, (x as ChangedResult).after)}
                    {((x as ChangedResult).after === null || (x as ChangedResult).after === undefined) && (
                      <span class="small unknown-why"> because {unknownReason(x as ChangedResult)}</span>
                    )}
                  </td>
                )}
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
          {e.changed.some((c) => c.after === null || c.after === undefined) && (
            <p class="unknown-note">
              <b>"Unknown" is not a denial.</b> It means the stored test household does not state a fact the other
              reading needs (each row says which), so the codex cannot work the result out. It does not mean the person fails.
            </p>
          )}
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
  const reading = useSignal<"current" | "alternative" | "opinion" | "other">("current");
  const decision = useSignal("");
  const caveat = useSignal("");
  const notified = useSignal("");
  const citation = useSignal("");
  const by = useSignal("");
  const role = useSignal(defaultRole);
  const date = useSignal(today);
  const error = useSignal("");
  const busy = useSignal(false);
  const staged = useSignal<{ adoptedAlternative: boolean; keptOpen: boolean } | null>(null);
  const followUpDone = useSignal<string[]>([]);
  const dropped = useSignal(false);
  const carrying = q.items.filter((it) => (it.open ?? []).includes(q.id));

  const submit = async (ev: Event) => {
    ev.preventDefault();
    error.value = "";
    const text = decision.value.trim()
      || (reading.value === "current" ? "Keep the reading the codex applies." : reading.value === "alternative" && alt ? `${alt.label}.` : "");
    if (!text) { error.value = reading.value === "opinion" ? "Write the opinion." : "Write the decision."; return; }
    if (!by.value.trim()) { error.value = "Name who decided."; return; }
    busy.value = true;
    try {
      const path = `${vol.path}/open-questions.md`;
      const stagedFile = fileEntries(changeSetSig.value).find((f) => f.path === path);
      const read = readText ?? ((p: string) => ledgerSource().readText(p));
      const before = stagedFile?.before ?? await read(path);
      const base = stagedFile?.after ?? before;
      const keepOpen = reading.value === "opinion";
      const after = applyAnswer(base, q.id, {
        decision: text, citation: citation.value, by: by.value, role: role.value, date: date.value,
        followUps: keepOpen ? undefined : q.items.map((it) => it.id),
        keepOpen, caveat: caveat.value, agencyNotified: notified.value,
      });
      const ids = answeredIds(before, after);
      putFileChange({
        path, before, after,
        label: ids.length > 1 ? `Answers to ${ids.join(", ")}` : ids.length ? `Answer to ${ids[0]}` : `Opinion on ${q.id}`,
      });
      staged.value = { adoptedAlternative: reading.value === "alternative", keptOpen: keepOpen };
      // Adopting the other reading stages its figure too (HCPF analyst, new
      // task: "a second button did").
      if (reading.value === "alternative") stageAlternative();
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
      // Built on what the tray already holds for the item (the other
      // reading's figure), so one follow-up never undoes another.
      const cur = changeSetSig.value.entries.find((e) => e.id === it.id)?.after ?? eng.itemById(it.id) ?? it;
      const after: Item = { ...JSON.parse(JSON.stringify(cur)) as Item, open: (cur.open ?? []).filter((o) => o !== q.id) };
      if (!after.open!.length) delete after.open;
      putChangeEntry({ id: it.id, chapter: vol.chapterOf[it.id] ?? "", before: engine.itemById(it.id) ?? it, after });
      done.push(it.id);
    }
    followUpDone.value = [...new Set([...followUpDone.value, ...done])];
    dropped.value = true;
  };

  const stageAlternative = () => {
    if (!alt) return;
    const entry = alternativeEntry(draftEngine() ?? engine, vol.chapterOf, alt);
    if (!entry) return;
    putChangeEntry({ ...entry, before: engine.itemById(entry.id) ?? entry.before });
    if (!followUpDone.value.includes(entry.id)) followUpDone.value = [...followUpDone.value, entry.id];
  };

  if (staged.value) {
    return (
      <div class="qstaged" role="status">
        <p>
          <b>Staged in the change tray.</b>{" "}
          {staged.value.keptOpen
            ? <>Your opinion is added to {q.id}'s record; the question stays open.</>
            : <>{q.id} is retitled "Resolved: {q.title}" with your answer added to its record, and it leaves the open list.</>}
        </p>
        <SendChange kind="answer" />
        <h3>Follow-up edits</h3>
        <ul>
          {carrying.length > 0 && (
            <li>
              <button type="button" class="btn small" disabled={dropped.value} onClick={stageDropQuestion}>
                Take {q.id} off the {carrying.length === 1 ? "item that carries it" : `${carrying.length} items that carry it`}
              </button>
            </li>
          )}
          {staged.value.adoptedAlternative && alt && (
            <li>
              Staged with the answer: {engine.item(alt.identifier)?.name} becomes {formatValue(engine.item(alt.identifier), alt.value)}.
            </li>
          )}
          {q.items.map((it) => (
            <li key={it.id}>
              <button type="button" class="btn small" onClick={() => openEditor(it.id)}>Edit</button>{" "}
              <a href={itemHref(r, it.id)}>{it.name}</a> <small class="mono muted">{it.id}</small>
            </li>
          ))}
        </ul>
        {followUpDone.value.length > 0 && <p>Staged: {[...new Set(followUpDone.value)].map((id) => engine.itemById(id)?.name ?? id).join("; ")}.</p>}
        <p>
          <button type="button" class="btn" onClick={() => { trayOpenSig.value = true; }}>Open the change tray</button>{" "}
          <button type="button" class="btn" onClick={() => { staged.value = null; }}>Change the answer</button>
        </p>
      </div>
    );
  }

  return (
    <form class="qanswer" onSubmit={submit} data-question={q.id}>
      <fieldset>
        <legend>Decision</legend>
        <label><input type="radio" name="reading" value="current" checked={reading.value === "current"} onChange={() => { reading.value = "current"; }} /> Keep the reading in force, and close the question</label>
        {alt && <label><input type="radio" name="reading" value="alternative" checked={reading.value === "alternative"} onChange={() => { reading.value = "alternative"; }} /> Adopt the other reading: {alt.label} (its figure is staged with the answer)</label>}
        <label><input type="radio" name="reading" value="opinion" checked={reading.value === "opinion"} onChange={() => { reading.value = "opinion"; }} /> Opinion recorded, keep the question open (with a caveat)</label>
        <label><input type="radio" name="reading" value="other" checked={reading.value === "other"} onChange={() => { reading.value = "other"; }} /> Something else, and close the question (say what below)</label>
      </fieldset>
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
      {reading.value === "opinion" && (
        <label>
          Caveat
          <span class="hint">What the opinion depends on, or when to revisit it (e.g. "revisit when the final rule issues").</span>
          <input type="text" name="caveat" value={caveat.value} onInput={(ev) => { caveat.value = (ev.target as HTMLInputElement).value; }} />
        </label>
      )}
      <label>
        Agency notified (optional)
        <span class="hint">Who at the agency was told, and when. Recorded with the decision; the departures list shows it.</span>
        <input type="text" name="agency-notified" value={notified.value} onInput={(ev) => { notified.value = (ev.target as HTMLInputElement).value; }} />
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
        {reading.value === "opinion"
          ? "This stages your opinion on the question's record; the question stays open."
          : "This stages a change to the open-questions list: the question is marked resolved and your answer is added to its record."}{" "}
        Nothing is in the codex until the change is sent and merged: the next step is shown once it is staged.
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
            {notes.length > 0 && (
              <details class="qhistory">
                <summary>Where this reading comes from (the question's history)</summary>
                {notes.map((n, i) => (
                  <div class="note" key={i}>
                    <span class="label">{n.label ?? "The question as first written"}</span>
                    <Prose text={n.text} engine={engine} vol={vol} r={r} />
                  </div>
                ))}
              </details>
            )}
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
          {stagedQuestionState(vol).get(q.id) === "answered" && (
            <div class="qstaged" role="status">
              <p><b>An answer to {q.id} is staged in this browser.</b> It is not in the codex yet.</p>
              <SendChange kind="answer" />
            </div>
          )}
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
