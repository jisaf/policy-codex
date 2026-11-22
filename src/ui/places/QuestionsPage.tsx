/* Questions: the decision queue (docs/design-unified-ui.md, "Questions").
 * Each card is the App's: the reading in force meanwhile, the rule text it
 * turns on, the items carrying it and the stored households that change if
 * it were answered the other way. Blind A's sort control and "Only mine"
 * order and narrow it; the owner a card names always agrees with the filter
 * (counts.ts `questionQueue`). `#/<vol>/questions` is the queue,
 * `#/<vol>/questions/OQ-n` one question (QuestionPage.tsx). */
import { useSignal } from "@preact/signals";
import {
  QUESTION_LAW_DEFINITIONS, QUESTION_SORTS, questionQueue, resolvedQuestions, restingIndex, restingReady,
  type QueueQuery, type QueueRow, type QuestionSort,
} from "../counts";
import { volumePrograms } from "../programs";
import {
  QUESTION_CLASS_LABEL, QUESTION_CLASSES, type QuestionClass, type QuestionInfo,
} from "../questions";
import type { StagedAnswer } from "../questionAnswer";
import { buildHash } from "../router";
import { navigate } from "../state";
import { SendChange } from "../sendChange";
import { viewContext, type ViewContext } from "../views/context";
import { NoLedger } from "../views/ViewStub";
import { PlaceHeader } from "./PlaceHeader";
import { QuestionPage } from "./QuestionPage";
import {
  agencyOf, ClassBadge, clip, EffectSummary, ExcerptLinks, HowCounted, ItemLinks, ProgramTags, programName, Prose,
  qHref, questionsInView, stagedQuestionState, StatusTag, useAfterPaint, useEffects, type QuestionEffect,
} from "./questionParts";
import "./questions-law.css";

export type ReadText = (path: string) => Promise<string>;

/** The queue's filters and order, from the address. */
export function readQuery(params: Record<string, string>): QueueQuery {
  const cls = QUESTION_CLASSES.includes(params.class as QuestionClass) ? params.class as QuestionClass : undefined;
  const sort = QUESTION_SORTS.some((s) => s.id === params.sort) ? params.sort as QuestionSort : "owner";
  return {
    // A link that names a persona (a role's Desk) opens on its questions.
    mine: params.mine === "1" || (params.mine !== "0" && Boolean(params.persona)),
    owner: params.owner || undefined,
    state: params.state === "open" || params.state === "partly" ? params.state : undefined,
    program: params.program || undefined,
    cls,
    affectsOutcome: params.affects === "1",
    blocksCertification: params.blocks === "1",
    text: params.q || undefined,
    sort,
  };
}

function QueueCard(
  { row, ctx, effect, staged, mine }:
  { row: QueueRow; ctx: ViewContext; effect: QuestionEffect | undefined; staged?: StagedAnswer; mine: readonly string[] },
) {
  const { engine, vol, route: r } = ctx;
  const e = row.entry;
  return (
    <li class="qcard" data-question={e.id} data-class={e.cls} data-owner={row.owner} data-staged={staged ?? undefined}>
      <h3><a href={qHref(r, e.id)}>{e.title}</a></h3>
      <div class="qmeta">
        {e.status === "partly" && <StatusTag q={e} />}
        <ClassBadge cls={e.cls} />
        {staged === "opinion" && <span class="tag qstaged-tag">Opinion staged, kept open</span>}
        {e.blocksCertification && <span class="flag blocks">Blocks certification</span>}
        <ProgramTags programs={e.programs} />
        <small class="mono muted">{e.id}</small>
      </div>
      <p class="qowner">
        Owner: <b>{row.owner}</b>{mine.includes(row.owner) && <span class="you"> (you)</span>}
        {row.others.length > 0 && <span class="muted"> · also {row.others.join(", ")}</span>}
      </p>
      <dl>
        <dt>In force meanwhile</dt>
        <dd class="assumption-line"><Prose text={clip(e.assumption, 300)} engine={engine} vol={vol} r={r} /></dd>
        <dt>Rule text it turns on</dt>
        <dd>{e.excerpts.length ? <ExcerptLinks excerpts={e.excerpts} r={r} max={2} /> : <span class="muted">None cited.</span>}</dd>
        <dt>Items carrying it</dt>
        <dd>{e.items.length ? <ItemLinks items={e.items} r={r} max={3} /> : <span class="muted">No item names it.</span>}</dd>
        <dt>If answered the other way</dt>
        <dd class="effect"><EffectSummary effect={effect} /></dd>
      </dl>
      <div class="qactions">
        <a class="btn" href={qHref(r, e.id, { act: "answer" })}>Answer it</a>
        <a class="btn" href={qHref(r, e.id, { act: "opinion" })}>Record a legal opinion</a>
      </div>
    </li>
  );
}

function Toolbar(
  { ctx, query, programs, owners, mine }:
  { ctx: ViewContext; query: QueueQuery; programs: string[]; owners: string[]; mine: readonly string[] },
) {
  const { route: r, persona } = ctx;
  const set = (patch: Record<string, string>) => {
    const params = { ...r.params, ...patch };
    for (const k of Object.keys(params)) if (params[k] === "") delete params[k];
    navigate({ params });
  };
  const val = (ev: Event) => (ev.target as HTMLInputElement | HTMLSelectElement).value;
  return (
    <form class="qfilters" role="search" aria-label="Filter and sort the questions" onSubmit={(ev) => ev.preventDefault()}>
      {mine.length > 0 && (
        <button
          type="button" class={`btn mine${query.mine ? " on" : ""}`} aria-pressed={query.mine ? "true" : "false"}
          onClick={() => set({ mine: query.mine ? "" : "1" })}
        >
          Only mine <small>({mine.length === 1 ? mine[0] : `${persona!.label}: ${mine.length} roles`})</small>
        </button>
      )}
      <label>Owner
        <select value={query.owner ?? ""} onChange={(ev) => set({ owner: val(ev) })}>
          <option value="">Anyone</option>
          {owners.map((o) => <option key={o} value={o}>{o}{mine.includes(o) ? " (you)" : ""}</option>)}
        </select>
      </label>
      <label>Sort
        <select value={query.sort} onChange={(ev) => set({ sort: val(ev) === "owner" ? "" : val(ev) })}>
          {QUESTION_SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </label>
      <label>Program
        <select value={query.program ?? ""} onChange={(ev) => set({ program: val(ev) })}>
          <option value="">All programs</option>
          {programs.map((p) => <option key={p} value={p}>{programName(p)}</option>)}
        </select>
      </label>
      <label>State
        <select value={query.state ?? ""} onChange={(ev) => set({ state: val(ev) })}>
          <option value="">Open or partly settled</option>
          <option value="open">Open</option>
          <option value="partly">Partly settled</option>
        </select>
      </label>
      <label>Kind
        <select value={query.cls ?? ""} onChange={(ev) => set({ class: val(ev) })}>
          <option value="">Any</option>
          {QUESTION_CLASSES.map((c) => <option key={c} value={c}>{QUESTION_CLASS_LABEL[c]}</option>)}
        </select>
      </label>
      <label class="words">Words
        <input type="search" value={query.text ?? ""} placeholder="e.g. long-term care, OQ-519" onInput={(ev) => set({ q: val(ev) })} />
      </label>
    </form>
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

function Queue({ ctx }: { ctx: ViewContext }) {
  const { engine, vol, route: r, persona } = ctx;
  const questions = questionsInView(vol);
  const staged = stagedQuestionState(vol);
  const answered = [...staged.entries()].filter(([, s]) => s === "answered").map(([id]) => id);
  const query = { ...readQuery(r.params), exclude: new Set(answered) };
  // The households each question is read by need the resting index (about a
  // second): built after the first paint.
  const counted = useAfterPaint(
    () => restingReady(engine, vol.cases), () => restingIndex(engine, vol.cases), [engine, vol],
  );
  const queue = questionQueue(engine, vol.sources, questions, persona, query, counted ? vol.cases : null);
  const everyone = questionQueue(engine, vol.sources, questions, null, {});
  const owners = [...new Set(everyone.rows.flatMap((x) => x.entry.owners))]
    .sort((a, b) => {
      const roles = engine.meta.approval_policy?.roles ?? [];
      return (roles.indexOf(a) + 1 || 99) - (roles.indexOf(b) + 1 || 99);
    });
  const programs = volumePrograms(engine).filter((p) => everyone.rows.some((x) => x.entry.programs.includes(p)));
  const effects = useEffects(engine, vol, queue.rows.map((x) => x.entry));
  const mine = queue.mineRoles;
  const whose = query.owner
    ? <>, owned by <b>{query.owner}</b>{mine.includes(query.owner) && " (you)"}</>
    : query.mine ? <> you own</> : null;
  const filtered = queue.rows.length < queue.total;
  const resolved = resolvedQuestions(engine, questions);
  const card = (x: QueueRow) => (
    <QueueCard key={x.entry.id} row={x} ctx={ctx} effect={effects.get(x.entry.id)} staged={staged.get(x.entry.id)} mine={mine} />
  );
  return (
    <>
      <Toolbar ctx={ctx} query={query} programs={programs} owners={owners} mine={mine} />
      <p class="qsummary" aria-live="polite">
        <b>{queue.rows.length}</b> {queue.rows.length === 1 ? "question" : "questions"}{whose}
        {filtered && <> of {queue.total} still to answer. <a href={buildHash({ ...r, params: {} })}>Show all</a></>}
        {!filtered && <> still to answer.</>}
        {query.sort === "households" && !counted && <span class="muted"> Working out the households; by number meanwhile.</span>}
      </p>
      <HowCounted>
        <p>{QUESTION_LAW_DEFINITIONS.queue}</p>
        <p>{QUESTION_LAW_DEFINITIONS.owner} A card names the owner your filter chose; the others follow "also".</p>
        <p>{QUESTION_LAW_DEFINITIONS.households}</p>
      </HowCounted>
      {queue.rows.length === 0 && <p class="muted">No question matches.</p>}
      {query.sort === "owner"
        ? queue.groups.map((g) => (
          <section class={`qgroup${g.mine ? " mine" : ""}`} key={g.owner} data-owner={g.owner}>
            <h2>
              {g.owner}{g.mine && <span class="you"> (you)</span>}
              {agencyOf(g.owner) && <span class="agency">{agencyOf(g.owner)}</span>}
              <span class="tag">{g.rows.length}</span>
            </h2>
            <ul class="qlist qcards">{g.rows.map(card)}</ul>
          </section>
        ))
        : <ul class="qlist qcards flat">{queue.rows.map(card)}</ul>}
      {answered.length > 0 && (
        <section class="qgroup qanswered" data-owner="answer staged">
          <h2>Answered here, waiting to be sent <span class="tag">{answered.length}</span></h2>
          <ul class="qlist">
            {answered.map((id) => (
              <li key={id} data-question={id}>
                <a href={qHref(r, id)}>{vol.openQuestions.find((q) => q.id === id)?.title ?? id}</a>{" "}
                <span class="tag qstaged-tag">Answer staged</span> <small class="mono muted">{id}</small>
              </li>
            ))}
          </ul>
          <SendChange kind="answer" />
        </section>
      )}
      <Resolved ctx={ctx} questions={resolved} />
    </>
  );
}

/** The Questions place: the queue, or one question's page. */
export function QuestionsPage({ readText }: { readText?: ReadText } = {}) {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  if (ctx.route.arg) return <QuestionPage ctx={ctx} id={ctx.route.arg} readText={readText} />;
  return (
    <section class="view place questions">
      <PlaceHeader place="questions" />
      <Queue ctx={ctx} />
    </section>
  );
}
