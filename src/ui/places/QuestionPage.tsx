/* One question: `#/<vol>/questions/OQ-n` (docs/design-unified-ui.md,
 * "Question"). The App's card in full (the reading in force meanwhile, the
 * rule text it turns on, the items carrying it, the stored households that
 * change if it were answered the other way) and, in a side rail, the two
 * ways to settle it: "Answer it" (the App's decision types and a citation)
 * and "Record a legal opinion" (Blind B: the conclusion, the authority, the
 * effect), both with "agency notified". Either is staged as an edit of
 * open-questions.md in the change tray; nothing else writes. `?act=answer`
 * or `?act=opinion` opens a form. */
import type { ComponentChildren } from "preact";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Engine } from "../../engine/engine";
import type { Item } from "../../engine/types";
import type { LoadedVolume } from "../../ledger/load";
import type { Source } from "../../ledger/markdown";
import { fileEntries } from "../../changes/types";
import { changedPhrase, householdCount, restingPhrase, unknownReason } from "../counts";
import { kindLabel } from "../labels";
import { personaRoles } from "../personas";
import { formatValue, personLabel } from "../present";
import { EXCERPT_KIND_LABEL, excerptKind, isUnverified } from "../provenance";
import {
  citedDocuments, isOpen, questionInfo, questionNotes, queueEntry, type QueueEntry,
} from "../questions";
import { alternativeEntry, alternativeFor, byCase, type ChangedResult, type StoredResult } from "../questionEffects";
import { answeredIds, applyAnswer, OPINION_EFFECTS, type QuestionAnswer } from "../questionAnswer";
import { buildHash, type Route } from "../router";
import { SendChange } from "../sendChange";
import {
  changeSetSig, draftEngine, ledgerSource, navigate, openEditor, putChangeEntry, putFileChange,
} from "../state";
import type { ViewContext } from "../views/context";
import {
  agencyOf, ClassBadge, docHref, excerptHref, householdHref, itemHref, ItemLinks, ProgramTags, Prose,
  questionEffect, questionsInView, stagedQuestionState, StatusTag, useRestingReady, type QuestionEffect,
} from "./questionParts";
import "./questions-law.css";
import { IdSmall, UnverifiedBadge } from "../kit";

type ReadText = (path: string) => Promise<string>;
type Act = "answer" | "opinion";

function actOf(params: Record<string, string>): Act | null {
  if (params.act === "answer" || params.answer === "1") return "answer";
  if (params.act === "opinion") return "opinion";
  return null;
}

// ---- the stored households

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
            const after = (x as ChangedResult).after;
            return (
              <tr key={i}>
                <td>{personLabel(x.person)}</td>
                <td>{it ? it.name : x.identifier}</td>
                <td>{x.month ?? ""}</td>
                <td>{formatValue(it, x.value)}</td>
                {changed && (
                  <td class="changed">
                    {formatValue(it, after)}
                    {(after === null || after === undefined) && (
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
            <p><a href={householdHref(r, g.caseId)}>Open this household</a></p>
          </details>
        );
      })}
    </>
  );
}

function Effects({ q, ctx }: { q: QueueEntry; ctx: ViewContext }) {
  const { engine, vol, route: r } = ctx;
  const effect = useSignal<QuestionEffect | null>(null);
  const ready = useRestingReady(engine, vol);
  useEffect(() => {
    effect.value = null;
    if (!ready) return;
    const t = setTimeout(() => { effect.value = questionEffect(engine, vol, q); }, 30);
    return () => clearTimeout(t);
  }, [engine, vol, q.id, ready]);
  const e = effect.value;
  if (!e) return <p class="muted">Working out the stored households…</p>;
  const altItem = e.alternative ? engine.item(e.alternative.identifier) : undefined;
  return (
    <>
      {e.alternative && e.changed && (
        <div class="alternative" data-alternative={e.alternative.identifier}>
          <p>
            <b>The other reading:</b> {e.alternative.label}.{" "}
            {altItem && (
              <span class="muted">
                (<a href={itemHref(r, altItem.id)}>{altItem.name}</a>{" "}
                {formatValue(altItem, engine.paramValue(altItem))} becomes {formatValue(altItem, e.alternative.value)}.)
              </span>
            )}
          </p>
          {e.alternative.caveat && <p class="muted">{e.alternative.caveat}</p>}
          <p class="effect-count">
            Re-running the stored households with that one change:{" "}
            <b>{changedPhrase(e.changed.length, householdCount(e.changed))}.</b>
          </p>
          {e.changed.some((c) => c.after === null || c.after === undefined) && (
            <p class="unknown-note">
              <b>"Unknown" is not a denial.</b> The stored household does not state a fact the other reading needs
              (each row says which), so the result cannot be worked out.
            </p>
          )}
          <HouseholdResults rs={e.changed} engine={engine} r={r} changed />
        </div>
      )}
      <div class="resting">
        {e.alternative
          ? <h3>Every stored result that reads it</h3>
          : <p class="muted">No single other value is named, so new values are not worked out. These stored results read the items carrying it and could change with the answer.</p>}
        <p>{restingPhrase(e.resting.length, householdCount(e.resting))}.</p>
        <HouseholdResults rs={e.resting} engine={engine} r={r} changed={false} />
      </div>
    </>
  );
}

// ---- the rule text

function ExcerptBlock({ s, vol, r }: { s: Source; vol: LoadedVolume; r: Route }) {
  const doc = s.document ? vol.documents.find((d) => d.id === s.document) : undefined;
  return (
    <div class="excerpt" data-excerpt={s.id}>
      <p class="excerpthead">
        <a href={excerptHref(r, s.id)}>{s.title || s.citation}</a>{" "}
        <span class="tag excerpt-kind">{EXCERPT_KIND_LABEL[excerptKind(s, vol.documents)]}</span>
        {isUnverified(s) && <> <UnverifiedBadge of="excerpt" /></>}
        {" "}<small class="mono muted">{s.id}</small>
      </p>
      {s.text && <blockquote class="statute-quote">{s.text}</blockquote>}
      {doc && <p class="small"><a href={docHref(r, doc.id, s.id)}>Read it in the full document</a> <span class="muted">({doc.title})</span></p>}
    </div>
  );
}

// ---- staging an answer or an opinion

async function stage(vol: LoadedVolume, q: QueueEntry, a: QuestionAnswer, readText?: ReadText): Promise<void> {
  const path = `${vol.path}/open-questions.md`;
  const stagedFile = fileEntries(changeSetSig.value).find((f) => f.path === path);
  const read = readText ?? ((p: string) => ledgerSource().readText(p));
  const before = stagedFile?.before ?? await read(path);
  const base = stagedFile?.after ?? before;
  const after = applyAnswer(base, q.id, a);
  const ids = answeredIds(before, after);
  putFileChange({
    path, before, after,
    label: ids.length > 1 ? `Answers to ${ids.join(", ")}`
      : a.kind === "opinion" ? `Legal opinion on ${q.id}`
        : ids.length ? `Answer to ${ids[0]}` : `Opinion on ${q.id}`,
  });
}

function Field(
  { label, hint, children }: { label: string; hint?: string; children: ComponentChildren },
) {
  return <label>{label}{hint && <span class="hint">{hint}</span>}{children}</label>;
}

/** Who, in what role, on what date: the lines every staged decision carries. */
function Signature(
  { by, role, date, roles, verb }:
  { by: { value: string }; role: { value: string }; date: { value: string }; roles: string[]; verb: string },
) {
  return (
    <div class="row">
      <label>
        {verb}
        <input type="text" autoComplete="name" value={by.value} onInput={(ev) => { by.value = (ev.target as HTMLInputElement).value; }} />
      </label>
      <label>
        In the role of
        <select value={role.value} onChange={(ev) => { role.value = (ev.target as HTMLSelectElement).value; }}>
          {roles.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label>
        Date
        <input type="date" value={date.value} onInput={(ev) => { date.value = (ev.target as HTMLInputElement).value; }} />
      </label>
    </div>
  );
}

function AnswerForm({ q, ctx, readText, onDone }: { q: QueueEntry; ctx: ViewContext; readText?: ReadText; onDone: (s: Staged) => void }) {
  const { engine, vol, persona, today } = ctx;
  const alt = alternativeFor(q.id);
  const roles = engine.meta.approval_policy?.roles ?? [];
  const mine = persona ? personaRoles(persona, engine.meta) : [];
  const reading = useSignal<"current" | "alternative" | "part" | "other">("current");
  const decision = useSignal("");
  const caveat = useSignal("");
  const notified = useSignal("");
  const citation = useSignal("");
  const by = useSignal("");
  const role = useSignal(q.owners.find((o) => mine.includes(o)) ?? q.owners[0] ?? roles[0] ?? "");
  const date = useSignal(today);
  const error = useSignal("");
  const busy = useSignal(false);

  const submit = async (ev: Event) => {
    ev.preventDefault();
    error.value = "";
    const text = decision.value.trim()
      || (reading.value === "current" ? "Keep the reading in force." : reading.value === "alternative" && alt ? `${alt.label}.` : "");
    if (!text) { error.value = "Write the decision."; return; }
    if (!by.value.trim()) { error.value = "Name who decided."; return; }
    busy.value = true;
    try {
      const keepOpen = reading.value === "part";
      await stage(vol, q, {
        decision: text, citation: citation.value, by: by.value, role: role.value, date: date.value,
        followUps: keepOpen ? undefined : q.items.map((it) => it.id),
        keepOpen, caveat: caveat.value, agencyNotified: notified.value,
      }, readText);
      // Adopting the other reading stages its figure too.
      if (reading.value === "alternative" && alt) {
        const entry = alternativeEntry(draftEngine() ?? engine, vol.chapterOf, alt);
        if (entry) putChangeEntry({ ...entry, before: engine.itemById(entry.id) ?? entry.before });
      }
      onDone({ kind: "answer", keptOpen: keepOpen, adoptedAlternative: reading.value === "alternative" });
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      busy.value = false;
    }
  };

  const radio = (v: typeof reading.value, label: string) => (
    <label><input type="radio" name="reading" value={v} checked={reading.value === v} onChange={() => { reading.value = v; }} /> {label}</label>
  );
  return (
    <form class="qanswer" onSubmit={submit} data-question={q.id} data-act="answer">
      <fieldset>
        <legend>Decision</legend>
        {radio("current", "Keep the reading in force, and close the question")}
        {alt && radio("alternative", `Adopt the other reading: ${alt.label} (its figure is staged with the answer)`)}
        {radio("part", "Answer part of it, and keep the question open (with a caveat)")}
        {radio("other", "Something else, and close the question (say what below)")}
      </fieldset>
      <Field label="The decision" hint="What the codex should do, and from when.">
        <textarea rows={4} value={decision.value} onInput={(ev) => { decision.value = (ev.target as HTMLTextAreaElement).value; }} />
      </Field>
      <Field label="Citation" hint="The rule paragraph, statute, memo or letter it rests on.">
        <input type="text" name="citation" value={citation.value} onInput={(ev) => { citation.value = (ev.target as HTMLInputElement).value; }} />
      </Field>
      {reading.value === "part" && (
        <Field label="Caveat" hint="What is still open, or when to revisit it.">
          <input type="text" name="caveat" value={caveat.value} onInput={(ev) => { caveat.value = (ev.target as HTMLInputElement).value; }} />
        </Field>
      )}
      <Field label="Agency notified (optional)" hint="Who at the agency was told, and when.">
        <input type="text" name="agency-notified" value={notified.value} onInput={(ev) => { notified.value = (ev.target as HTMLInputElement).value; }} />
      </Field>
      <Signature by={by} role={role} date={date} roles={[...new Set([...q.owners, ...roles])]} verb="Decided by" />
      <div>
        <button type="submit" class="btn propose" disabled={busy.value}>{busy.value ? "Staging…" : "Stage the answer"}</button>
        {error.value && <span class="bad" role="alert"> {error.value}</span>}
      </div>
    </form>
  );
}

function OpinionForm({ q, ctx, readText, onDone }: { q: QueueEntry; ctx: ViewContext; readText?: ReadText; onDone: (s: Staged) => void }) {
  const { engine, vol, persona, today } = ctx;
  const roles = engine.meta.approval_policy?.roles ?? [];
  const mine = persona ? personaRoles(persona, engine.meta) : [];
  const text = useSignal("");
  const authority = useSignal("");
  const effect = useSignal<string>(OPINION_EFFECTS[0]);
  const notified = useSignal("");
  const settles = useSignal(false);
  const by = useSignal("");
  const role = useSignal(roles.includes("Legal") ? "Legal" : mine[0] ?? roles[0] ?? "");
  const date = useSignal(today);
  const error = useSignal("");
  const busy = useSignal(false);

  const submit = async (ev: Event) => {
    ev.preventDefault();
    error.value = "";
    if (!text.value.trim()) { error.value = "Write the opinion."; return; }
    if (!by.value.trim()) { error.value = "Name who gave the opinion."; return; }
    busy.value = true;
    try {
      await stage(vol, q, {
        kind: "opinion", decision: text.value, citation: authority.value, effect: effect.value,
        by: by.value, role: role.value, date: date.value, keepOpen: !settles.value,
        agencyNotified: notified.value, followUps: settles.value ? q.items.map((it) => it.id) : undefined,
      }, readText);
      onDone({ kind: "opinion", keptOpen: !settles.value, adoptedAlternative: false });
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      busy.value = false;
    }
  };

  return (
    <form class="qanswer qopinion" onSubmit={submit} data-question={q.id} data-act="opinion">
      <Field label="The opinion" hint="State the conclusion first, then the reasoning.">
        <textarea rows={6} value={text.value} onInput={(ev) => { text.value = (ev.target as HTMLTextAreaElement).value; }} />
      </Field>
      <Field label="Authority relied on" hint="e.g. Pub. L. 119-21 sec. 10102; 7 CFR 273.24">
        <input type="text" name="authority" value={authority.value} onInput={(ev) => { authority.value = (ev.target as HTMLInputElement).value; }} />
      </Field>
      <Field label="Effect">
        <select name="effect" value={effect.value} onChange={(ev) => { effect.value = (ev.target as HTMLSelectElement).value; }}>
          {OPINION_EFFECTS.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </Field>
      <Field label="Agency notified (optional)" hint="Who at the agency was told, and when.">
        <input type="text" name="agency-notified" value={notified.value} onInput={(ev) => { notified.value = (ev.target as HTMLInputElement).value; }} />
      </Field>
      <label class="check">
        <input type="checkbox" checked={settles.value} onChange={(ev) => { settles.value = (ev.target as HTMLInputElement).checked; }} />
        It settles the question (mark it resolved)
      </label>
      <Signature by={by} role={role} date={date} roles={[...new Set([...roles, ...q.owners])]} verb="Given by" />
      <div>
        <button type="submit" class="btn propose" disabled={busy.value}>{busy.value ? "Staging…" : "Stage the opinion"}</button>
        {error.value && <span class="bad" role="alert"> {error.value}</span>}
      </div>
    </form>
  );
}

interface Staged { kind: Act; keptOpen: boolean; adoptedAlternative: boolean }

/** What was staged, what happens next, and the follow-up edits. */
function StagedPanel({ q, ctx, staged, again }: { q: QueueEntry; ctx: ViewContext; staged: Staged; again: () => void }) {
  const { engine, vol, route: r } = ctx;
  const alt = alternativeFor(q.id);
  const dropped = useSignal(false);
  const carrying = q.items.filter((it) => (it.open ?? []).includes(q.id));
  const dropQuestion = () => {
    const eng = draftEngine() ?? engine;
    for (const it of carrying) {
      // Built on what the tray already holds for the item (the other
      // reading's figure), so one follow-up never undoes another.
      const cur = changeSetSig.value.entries.find((e) => e.id === it.id)?.after ?? eng.itemById(it.id) ?? it;
      const after: Item = { ...JSON.parse(JSON.stringify(cur)) as Item, open: (cur.open ?? []).filter((o) => o !== q.id) };
      if (!after.open!.length) delete after.open;
      putChangeEntry({ id: it.id, chapter: vol.chapterOf[it.id] ?? "", before: engine.itemById(it.id) ?? it, after });
    }
    dropped.value = true;
  };
  const what = staged.kind === "opinion" ? "legal opinion" : "answer";
  return (
    <div class="qstaged" role="status">
      <p>
        <b>Staged in the change tray.</b>{" "}
        {staged.keptOpen
          ? <>Your {what} is added to {q.id}'s record; the question stays open.</>
          : <>{q.id} is marked resolved with your {what} on its record, and it leaves the open list.</>}
      </p>
      <SendChange kind="answer" />
      {!staged.keptOpen && (
        <>
          <h3>Follow-up edits</h3>
          <ul>
            {carrying.length > 0 && (
              <li>
                <button type="button" class="btn small" disabled={dropped.value} onClick={dropQuestion}>
                  Take {q.id} off the {carrying.length === 1 ? "item that carries it" : `${carrying.length} items that carry it`}
                </button>
              </li>
            )}
            {staged.adoptedAlternative && alt && (
              <li>Staged with it: {engine.item(alt.identifier)?.name} becomes {formatValue(engine.item(alt.identifier), alt.value)}.</li>
            )}
            {q.items.map((it) => (
              <li key={it.id}>
                <button type="button" class="btn small" onClick={() => openEditor(it.id)}>Edit</button>{" "}
                <a href={itemHref(r, it.id)}>{it.name}</a>
              </li>
            ))}
          </ul>
        </>
      )}
      <p><button type="button" class="btn" onClick={again}>Change it</button></p>
    </div>
  );
}

function SettleRail({ q, ctx, readText }: { q: QueueEntry; ctx: ViewContext; readText?: ReadText }) {
  const { engine, vol, persona, route: r } = ctx;
  const act = actOf(r.params);
  const staged = useSignal<Staged | null>(null);
  const mine = persona ? personaRoles(persona, engine.meta) : [];
  const owns = q.owners.filter((o) => mine.includes(o));
  const legal = mine.includes("Legal");
  const already = stagedQuestionState(vol).get(q.id);
  const open = (a: Act | null) => navigate({ params: a ? { act: a } : {} });
  // A form opened from a card lands here: bring it into view, the cursor in it.
  useEffect(() => {
    if (!act) return;
    const el = document.getElementById("settle");
    el?.scrollIntoView?.({ block: "start" });
    el?.querySelector<HTMLElement>("form textarea, form input[type=radio]")?.focus({ preventScroll: true });
  }, [q.id, act]);
  return (
    <aside class="qrail" id="settle" aria-label="Settle it">
      <h2>Settle it</h2>
      <p class="small muted">
        {persona
          ? owns.length ? <>You are {owns.join(", ")}: an owner of this question.</> : <>Working as {persona.label}; the owner is {q.owners[0] ?? "not named"}.</>
          : <>Choose your role in the sidebar to sign with it.</>}
      </p>
      {staged.value
        ? <StagedPanel q={q} ctx={ctx} staged={staged.value} again={() => { staged.value = null; }} />
        : already === "answered" && !act
          ? (
            <div class="qstaged" role="status">
              <p><b>An answer to {q.id} is staged in this browser.</b> It is not in the codex yet.</p>
              <SendChange kind="answer" />
            </div>
          )
          : (
            <>
              <div class="btncol">
                <button
                  type="button" class={`btn${act === "answer" ? " on" : ""}${!legal ? " primary" : ""}`}
                  aria-expanded={act === "answer" ? "true" : "false"} onClick={() => open(act === "answer" ? null : "answer")}
                >Answer it</button>
                <button
                  type="button" class={`btn${act === "opinion" ? " on" : ""}${legal ? " primary" : ""}`}
                  aria-expanded={act === "opinion" ? "true" : "false"} onClick={() => open(act === "opinion" ? null : "opinion")}
                >Record a legal opinion</button>
              </div>
              {already === "opinion" && <p class="small"><span class="tag qstaged-tag">An opinion is staged</span></p>}
              {act === "answer" && <AnswerForm q={q} ctx={ctx} readText={readText} onDone={(s) => { staged.value = s; }} />}
              {act === "opinion" && <OpinionForm q={q} ctx={ctx} readText={readText} onDone={(s) => { staged.value = s; }} />}
            </>
          )}
    </aside>
  );
}

// ---- the page

export function QuestionPage({ ctx, id, readText }: { ctx: ViewContext; id: string; readText?: ReadText }) {
  const { engine, vol, route: r, persona } = ctx;
  const raw = questionsInView(vol).find((q) => q.id === id);
  if (!raw) return <p class="status bad">No question {id} in this volume.</p>;
  const q = queueEntry(engine, vol.sources, questionInfo(engine, raw));
  const docs = citedDocuments(q.body, vol.documents);
  const notes = questionNotes(q.body);
  const open = isOpen(q.status);
  const mine = persona ? personaRoles(persona, engine.meta) : [];
  // The owner named first is the reader's own role when they hold one.
  const owner = q.owners.find((o) => mine.includes(o)) ?? q.owners[0] ?? null;
  const others = q.owners.filter((o) => o !== owner);
  return (
    <section class="view place question" data-question={q.id}>
      <header class="qhead">
        <p class="eyebrow">An open question</p>
        <h1>{q.title}</h1>
        <p class="qmeta">
          <StatusTag q={q} />
          {open && <ClassBadge cls={q.cls} />}
          {open && q.blocksCertification && <span class="flag blocks">Blocks certification</span>}
          <ProgramTags programs={q.programs} />
          <IdSmall id={q.id} />
        </p>
        <p class="qowner">
          {owner
            ? <>Owner: <b>{owner}</b>{mine.includes(owner) && <span class="you"> (you)</span>}{agencyOf(owner) && <span class="muted">, {agencyOf(owner)}</span>}</>
            : "No owner named."}
          {others.length > 0 && <span class="muted"> · also {others.join(", ")}</span>}
        </p>
      </header>
      <div class="qgrid">
        <div class="qmain">
          {open && (
            <div class="qsection">
              <h2>The reading in force until it is answered</h2>
              <p class="assumption"><Prose text={q.assumption} engine={engine} vol={vol} r={r} /></p>
              {q.waitingOn && <p><b>Waiting on:</b> <Prose text={q.waitingOn} engine={engine} vol={vol} r={r} /></p>}
            </div>
          )}

          <div class="qsection">
            <h2>Rule text it turns on</h2>
            {q.excerptsFromItems && <p class="muted small">The question cites none itself; these are its items' excerpts.</p>}
            {q.excerpts.length
              ? q.excerpts.map((s) => <ExcerptBlock key={s.id} s={s} vol={vol} r={r} />)
              : <p class="muted">The question cites no excerpt.</p>}
            {docs.length > 0 && (
              <p>
                <b>Documents it names:</b>{" "}
                {docs.map((d, i) => <span key={d.id}>{i > 0 && "; "}<a href={docHref(r, d.id)}>{d.title}</a></span>)}
              </p>
            )}
          </div>

          <div class="qsection">
            <h2>Items carrying it</h2>
            {q.items.length === 0
              ? <p class="muted">No item names this question.</p>
              : (
                <ul class="qitems">
                  {q.items.map((it) => (
                    <li key={it.id}>
                      <a href={itemHref(r, it.id)}><b>{it.name}</b></a>{" "}
                      <span class="muted">{kindLabel(it.kind)}</span> <ProgramTags programs={[it.program]} />{" "}
                      <small class="mono muted">{it.id}</small>
                    </li>
                  ))}
                </ul>
              )}
            {q.outcomes.length > 0 && <p><b>Program outcomes it reaches:</b> <ItemLinks items={q.outcomes} r={r} max={12} /></p>}
          </div>

          {open && (
            <div class="qsection effects">
              <h2>Stored households, if it were answered the other way</h2>
              <Effects q={q} ctx={ctx} />
            </div>
          )}

          <div class="qsection qnotes">
            <h2>The question's record</h2>
            {notes.map((n, i) => (
              <div class={`note${i === notes.length - 1 ? " latest" : ""}`} key={i}>
                <span class="label">{n.label ?? "The question as first written"}</span>
                <Prose text={n.text} engine={engine} vol={vol} r={r} />
              </div>
            ))}
          </div>
        </div>
        {open ? <SettleRail q={q} ctx={ctx} readText={readText} /> : (
          <aside class="qrail" aria-label="Status">
            <h2>Resolved</h2>
            <p class="small muted">Its record shows the answer. <a href={buildHash({ ...r, view: "questions", arg: null, params: {} })}>All questions</a></p>
          </aside>
        )}
      </div>
    </section>
  );
}
