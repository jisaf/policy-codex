/* The pieces the Questions and Law places share: links to a question, an
 * item, an excerpt and a passage of a document; ledger prose with every
 * item, excerpt, question and document it names made a link; the tags a
 * question carries; the questions as this browser sees them (an answer
 * staged here leaves the open list); and what answering one the other way
 * does to the stored households. */
import type { ComponentChildren } from "preact";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Engine } from "../../engine/engine";
import type { Item } from "../../engine/types";
import type { LoadedVolume } from "../../ledger/load";
import { parseOpenQuestions, type OpenQuestion, type Source } from "../../ledger/markdown";
import { fileEntries } from "../../changes/types";
import {
  changedBy, changedPhrase, householdCount, restingOn, restingPhrase,
} from "../counts";
import { PERSONAS } from "../personas";
import { isUnverified } from "../provenance";
import {
  QUESTION_CLASS_BLURB, QUESTION_CLASS_LABEL, QUESTION_STATUS_LABEL,
  type QuestionClass, type QuestionInfo,
} from "../questions";
import { alternativeEntry, alternativeFor, type Alternative, type ChangedResult, type StoredResult } from "../questionEffects";
import { stagedAnswers, type StagedAnswer } from "../questionAnswer";
import { buildHash, type Route } from "../router";
import { changeSetSig, draftsShown } from "../state";
import { useRestingReady as useRestingReadyFor } from "../useResting";

// ---- links

export function qHref(r: Route, id: string, params: Record<string, string> = {}): string {
  return buildHash({ ...r, view: "questions", arg: id, params });
}

export function itemHref(r: Route, id: string): string {
  return buildHash({ ...r, view: "item", arg: id, params: {} });
}

/** An excerpt's own page under Law › Sources. */
export function excerptHref(r: Route, id: string): string {
  return buildHash({ ...r, view: "law", arg: `sources/${id}`, params: {} });
}

/** A document under Law, opened at an excerpt's passage when `at` names one. */
export function docHref(r: Route, docId: string, at?: string | null): string {
  return buildHash({ ...r, view: "law", arg: `doc/${docId}`, params: at ? { at } : {} });
}

export function householdHref(r: Route, caseId: string): string {
  return buildHash({ ...r, view: "households", arg: caseId, params: {} });
}

// ---- small pieces

/** A program id as a reader says it. */
export function programName(id: string): string {
  if (id === "All") return "Shared";
  if (id === "SunBucks") return "SUN Bucks";
  return id.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** The agency behind an approval role, from the personas that sign as it. */
export function agencyOf(role: string): string | null {
  return PERSONAS.find((p) => p.roles.includes(role))?.agency ?? null;
}

export function ProgramTags({ programs }: { programs: string[] }) {
  return <>{programs.map((p) => <span key={p} class={`tag prog-${p.toLowerCase()}`}>{programName(p)}</span>)}</>;
}

export function ClassBadge({ cls }: { cls: QuestionClass }) {
  return <span class={`tag qclass qclass-${cls}`} title={QUESTION_CLASS_BLURB[cls]}>{QUESTION_CLASS_LABEL[cls]}</span>;
}

export function StatusTag({ q }: { q: Pick<QuestionInfo, "status"> }) {
  return <span class={`tag qstatus qstatus-${q.status}`}>{QUESTION_STATUS_LABEL[q.status]}</span>;
}

export function clip(text: string, n: number): string {
  if (text.length <= n) return text;
  const cut = text.slice(0, n);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), n - 20))}…`;
}

export function ItemLinks({ items, r, max }: { items: Item[]; r: Route; max?: number }) {
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

export function ExcerptLinks({ excerpts, r, max }: { excerpts: Source[]; r: Route; max?: number }) {
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
      node = <a class="ref" href={docHref(r, doc)}>{doc}</a>;
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

/** "How this is counted": a definition kept out of the card body. */
export function HowCounted({ children }: { children: ComponentChildren }) {
  return (
    <details class="howcounted">
      <summary>How this is counted</summary>
      <div class="muted">{children}</div>
    </details>
  );
}

// ---- the questions as this browser sees them

/** The volume's questions, or, while drafts are shown and an answer is
 *  staged, the staged open-questions.md: an answered question moves to
 *  Resolved in the draft view. */
export function questionsInView(vol: LoadedVolume): OpenQuestion[] {
  if (!draftsShown()) return vol.openQuestions;
  const path = `${vol.path}/open-questions.md`;
  const staged = fileEntries(changeSetSig.value).find((f) => f.path === path)?.after;
  return staged ? parseOpenQuestions(staged) : vol.openQuestions;
}

/** The questions with the staged open-questions.md applied, whether or not
 *  drafts are shown (for what a staged answer records, "agency notified"). */
export function questionsWithStaged(vol: LoadedVolume): OpenQuestion[] {
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

export function questionEffect(engine: Engine, vol: LoadedVolume, q: { id: string; items: readonly Item[] }): QuestionEffect {
  const resting = restingOn(engine, vol.cases, q.items.map((it) => it.identifier));
  const alternative = alternativeFor(q.id);
  const entry = alternative ? alternativeEntry(engine, vol.chapterOf, alternative) : null;
  const changed = entry ? changedBy(engine, vol.cases, [entry]) : null;
  return { alternative, changed, resting };
}

export function EffectSummary({ effect }: { effect: QuestionEffect | undefined }) {
  if (!effect) return <span class="muted">Working out the stored households…</span>;
  const { alternative, changed, resting } = effect;
  if (alternative && changed) {
    return <span>{alternative.label}: <b>{changedPhrase(changed.length, householdCount(changed))}</b>.</span>;
  }
  if (!resting.length) return <span>No stored household result reads it.</span>;
  return (
    <span>
      {restingPhrase(resting.length, householdCount(resting))}.{" "}
      <span class="muted">No single other value is named to re-run with.</span>
    </span>
  );
}

/** Works the effects out after the page has painted, one question at a time,
 *  so a long queue never holds the first paint. */
export function useEffects(
  engine: Engine, vol: LoadedVolume, entries: ReadonlyArray<{ id: string; items: readonly Item[] }>, ready = true,
) {
  const done = useSignal<Map<string, QuestionEffect>>(new Map());
  const key = entries.map((e) => e.id).join(",");
  useEffect(() => {
    if (!ready) return;
    let live = true;
    const map = new Map<string, QuestionEffect>();
    done.value = map;
    const queue = [...entries];
    // A few questions per step, the page re-rendered once per step, so a
    // long queue never holds the page (a click waits on the main thread).
    const step = () => {
      if (!live || !queue.length) return;
      const until = Date.now() + 40;
      while (queue.length && Date.now() < until) {
        const e = queue.shift()!;
        map.set(e.id, questionEffect(engine, vol, e));
      }
      done.value = new Map(map);
      setTimeout(step, 16);
    };
    const t = setTimeout(step, 30);
    return () => { live = false; clearTimeout(t); };
  }, [engine, vol, key, ready]);
  return done.value;
}

/** Whether the resting index (counts.ts) is built; it is built after the
 *  first paint, a household at a time (src/ui/useResting.ts). */
export function useRestingReady(engine: Engine, vol: LoadedVolume): boolean {
  return useRestingReadyFor(engine, vol.cases);
}
