/* One definition per count, shared by every view (the four UX retests: the
 * role page, the inbox, the question queue and the departures said different
 * numbers for the same thing). Each count here says what it counts:
 *
 * - Stored results that REST ON an item: the stored households' expectations
 *   whose reasoning (the engine's own trace) passes through the item. These
 *   could change if the item changed; no new value is worked out. "Reads it"
 *   in the older pages meant a static dependency, which overstates (a figure
 *   a branch never taken still "reads"), so it is not used for households.
 * - Stored results that WOULD CHANGE: the stored households run again with one
 *   staged change, value by value. Worked out.
 * - Outcomes an item affects: the declared program outcomes that read it
 *   through the rules, leaving out a path that runs only through the
 *   document-verification flags (a figure reaches an eligibility status only
 *   because the status waits on a pending document).
 * - Open questions a persona owns: the queue's owners (questions.ts
 *   `questionOwners`) that are one of the persona's approval roles; a persona
 *   with no role reads every question in its programs.
 * - Departures: items that follow a statute over a Colorado rule
 *   (`statute_override`), in force on the date read. */
import type { Engine } from "../engine/engine";
import type { HouseholdCase } from "../engine/cases";
import type { Item } from "../engine/types";
import type { DocumentMeta } from "../ledger/documents";
import type { OpenQuestion, Source } from "../ledger/markdown";
import { emptyChangeSet, type ChangeEntry } from "../changes/types";
import { applyChangeSet } from "../changes/apply";
import { valuesEqual } from "../engine/values";
import { personaRoles, type Persona } from "./personas";
import {
  groupByOwner, isOpen, queueEntry, questionInfos, type QueueEntry,
} from "./questions";
import { expectationReads, type ChangedResult, type StoredResult } from "./questionEffects";
import { caseToSpec } from "../engine/cases";
import { buildWalk } from "./walkthrough";
import { formatDate, personLabel } from "./present";

// ---- the words

/** How each household count is said, everywhere. */
export const COUNT_WORDS = {
  resting: "rest on it (not worked out)",
  changed: "would change (worked out)",
} as const;

function n(x: number, one: string, many = `${one}s`): string {
  return `${x.toLocaleString("en-US")} ${x === 1 ? one : many}`;
}

/** "12 stored results in 3 households rest on it (not worked out)". */
export function restingPhrase(results: number, households: number): string {
  if (!results) return "No stored household result rests on it";
  return `${n(results, "stored result")} in ${n(households, "household")} ${COUNT_WORDS.resting}`;
}

/** "3 stored results in 1 household would change (worked out)". */
export function changedPhrase(results: number, households: number): string {
  if (!results) return "No stored household result would change (worked out)";
  return `${n(results, "stored result")} in ${n(households, "household")} ${COUNT_WORDS.changed}`;
}

export function householdCount(rs: ReadonlyArray<{ caseId: string }>): number {
  return new Set(rs.map((r) => r.caseId)).size;
}

// ---- results that rest on an item (the trace)

const restMemo = new WeakMap<Engine, WeakMap<readonly HouseholdCase[], Map<string, StoredResult[]>>>();

/** identifier -> the stored results whose trace reads it. Built once per
 *  engine and case list (about a second for the Colorado volume), so views
 *  build it after their first paint. */
export function restingIndex(engine: Engine, cases: readonly HouseholdCase[]): Map<string, StoredResult[]> {
  let per = restMemo.get(engine);
  if (!per) { per = new WeakMap(); restMemo.set(engine, per); }
  const hit = per.get(cases);
  if (hit) return hit;
  const out = new Map<string, StoredResult[]>();
  for (const e of expectationReads(engine, cases)) {
    const { reads, ...r } = e;
    for (const id of reads) {
      const list = out.get(id);
      if (list) list.push(r); else out.set(id, [r]);
    }
  }
  per.set(cases, out);
  return out;
}

/** Whether `restingIndex` is already built (a view can then use it at once). */
export function restingReady(engine: Engine, cases: readonly HouseholdCase[]): boolean {
  return Boolean(restMemo.get(engine)?.get(cases));
}

/** The stored results resting on any of `identifiers`, each once. */
export function restingOn(
  engine: Engine, cases: readonly HouseholdCase[], identifiers: readonly string[],
): StoredResult[] {
  const ix = restingIndex(engine, cases);
  const seen = new Set<string>();
  const out: StoredResult[] = [];
  for (const id of identifiers) {
    for (const r of ix.get(id) ?? []) {
      const k = `${r.caseId}|${r.person}|${r.identifier}|${r.month ?? ""}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
  }
  return out;
}

/** The households (case ids, in stored order) whose results rest on it. */
export function householdsRestingOn(
  engine: Engine, cases: readonly HouseholdCase[], identifier: string,
): string[] {
  const ids = new Set((restingIndex(engine, cases).get(identifier) ?? []).map((r) => r.caseId));
  return cases.filter((c) => ids.has(c.id)).map((c) => c.id);
}

// ---- results that would change (one change, run again)

const baseRuns = new WeakMap<Engine, WeakMap<readonly HouseholdCase[], ReturnType<Engine["runCases"]>>>();

function baseRun(engine: Engine, cases: readonly HouseholdCase[]) {
  let per = baseRuns.get(engine);
  if (!per) { per = new WeakMap(); baseRuns.set(engine, per); }
  let hit = per.get(cases);
  if (!hit) { hit = engine.runCases([...cases]); per.set(cases, hit); }
  return hit;
}

function sameValue(a: unknown, b: unknown): boolean {
  const none = (x: unknown) => x === null || x === undefined;
  if (none(a) || none(b)) return none(a) && none(b);
  return valuesEqual(a, b);
}

/** The stored results that differ when `entries` are applied to `engine`:
 *  the same stored households, run under the rules as they are and again
 *  with the change. The one "what changes" every view shows for a staged
 *  change (the inbox row, the role page, the question page). */
export function changedBy(
  engine: Engine, cases: readonly HouseholdCase[], entries: readonly ChangeEntry[],
): ChangedResult[] {
  if (!entries.length || !cases.length) return [];
  const cs = { ...emptyChangeSet("", ""), entries: [...entries] };
  const applied = engine.withItems(applyChangeSet(engine.items(), cs));
  const before = baseRun(engine, cases);
  const after = applied.runCases([...cases]);
  const out: ChangedResult[] = [];
  before.forEach((rep, i) => {
    const alt = after[i];
    rep.results.forEach((r, j) => {
      const a = alt?.results[j];
      if (!a || a.identifier !== r.identifier || a.person !== r.person || a.month !== r.month) return;
      if (sameValue(r.got, a.got)) return;
      const row: ChangedResult = {
        caseId: rep.id, caseTitle: rep.title, person: r.person, identifier: r.identifier,
        month: r.month, value: r.got, after: a.got,
      };
      // A result that becomes unknown: say which facts the stored household
      // does not give, so "Unknown" is not read as "fails" (HCPF analyst,
      // OQ-410).
      if ((a.got === null || a.got === undefined) && i < cases.length) {
        try {
          const walk = buildWalk(applied.explain(caseToSpec(cases[i]), r.identifier, r.person, r.month));
          const label = (m: { name: string; person: string | null; month: string | null }) =>
            `${m.person && m.person !== r.person ? `${personLabel(m.person)}'s ` : ""}${m.name}${m.month ? ` for ${formatDate(m.month)}` : ""}`;
          // The facts under the unknown steps; every step's when the result's
          // own unknown is read through a rule that has a value elsewhere.
          const pick = walk.missing.length ? walk.missing : walk.steps.filter((x) => x.node.value === null).flatMap((x) => x.missing);
          const nf = walk.noFigure.length ? walk.noFigure : walk.steps.filter((x) => x.node.value === null).flatMap((x) => x.noFigure);
          row.missing = [...new Set(pick.map(label))];
          row.noFigure = [...new Set(nf.map((m) => m.name))];
        } catch { /* leave unexplained */ }
      }
      out.push(row);
    });
  });
  return out;
}

/** Why a result is unknown under a change, in words: "the test household
 *  does not state X or Y". */
export function unknownReason(r: Pick<ChangedResult, "missing" | "noFigure">): string {
  const parts: string[] = [];
  if (r.missing?.length) parts.push(`the test household does not state ${joinOr(r.missing)}`);
  if (r.noFigure?.length) parts.push(`no figure is in force for ${joinOr(r.noFigure)}`);
  return parts.length ? parts.join("; ") : "a fact it needs is not stated";
}

function joinOr(xs: readonly string[]): string {
  const u = [...new Set(xs)];
  if (u.length <= 1) return u.join("");
  return `${u.slice(0, -1).join(", ")} or ${u[u.length - 1]}`;
}

// ---- outcomes an item affects

/** Verification flags, due dates and the counts built on them: what a
 *  determination waits on, not what it decides. */
export function isVerificationItem(identifier: string): boolean {
  return /_verification_|_is_pending$|_pending_verification|_due_date$|_postponement|_verification$/.test(identifier);
}

const directMemo = new WeakMap<Engine, Map<string, Set<string>>>();

/** Each declared outcome with the identifiers it reads through the rules,
 *  not following a verification flag (unless the outcome is one). */
export function directOutcomeCones(engine: Engine): Map<string, Set<string>> {
  const hit = directMemo.get(engine);
  if (hit) return hit;
  const out = new Map<string, Set<string>>();
  for (const p of engine.meta.programs ?? []) {
    for (const o of p.outcomes ?? []) {
      if (out.has(o)) continue;
      const seen = new Set<string>();
      const stack = [o];
      while (stack.length) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        if (id !== o && isVerificationItem(id) && !isVerificationItem(o)) continue;
        for (const d of engine.usesOfItem(id)) stack.push(d);
      }
      out.set(o, seen);
    }
  }
  directMemo.set(engine, out);
  return out;
}

/** The declared outcomes an item affects, verification-only paths left out. */
export function outcomesAffected(engine: Engine, identifier: string): string[] {
  const out: string[] = [];
  for (const [o, cone] of directOutcomeCones(engine)) if (cone.has(identifier)) out.push(o);
  return out;
}

/** The chain of rules from an outcome down to an item, outcome first, by the
 *  shortest path (not through verification flags): why the item reaches it. */
export function pathToOutcome(engine: Engine, outcome: string, identifier: string): string[] {
  const prev = new Map<string, string>();
  const seen = new Set([outcome]);
  const queue = [outcome];
  while (queue.length) {
    const x = queue.shift()!;
    if (x === identifier) break;
    if (x !== outcome && isVerificationItem(x) && !isVerificationItem(outcome)) continue;
    for (const d of engine.usesOfItem(x)) {
      if (seen.has(d)) continue;
      seen.add(d);
      prev.set(d, x);
      queue.push(d);
    }
  }
  if (!seen.has(identifier)) return [];
  const path = [identifier];
  let c = identifier;
  while (prev.has(c)) { c = prev.get(c)!; path.push(c); }
  return path.reverse();
}

// ---- open questions a persona owns

/** The open questions a persona owns: those whose answering roles include one
 *  of the persona's approval roles; a persona that signs as no role (a
 *  county worker) reads every open question in its programs (all, when it
 *  names none). The role page, the queue's "only mine" and the Legal card
 *  all count this. */
export function personaQuestions(
  engine: Engine, sources: readonly Source[], questions: readonly OpenQuestion[], persona: Persona | null,
): QueueEntry[] {
  const open = questionInfos(engine, questions).filter((q) => isOpen(q.status))
    .map((q) => queueEntry(engine, sources, q));
  if (!persona) return open;
  return open.filter((e) => ownsEntry(engine, persona, e));
}

export function ownsEntry(engine: Engine, persona: Persona, e: QueueEntry): boolean {
  const roles = personaRoles(persona, engine.meta);
  if (roles.length) return e.owners.some((o) => roles.includes(o));
  if (!persona.programs.length) return true;
  return e.programs.some((p) => persona.programs.includes(p));
}

/** The queue grouped by the role it is filed under (its first owner), the
 *  persona's own roles first: the groups add up to the whole. */
export function ownerGroups(
  engine: Engine, entries: readonly QueueEntry[], mine: readonly string[] = [],
): Array<{ owner: string; entries: QueueEntry[]; mine: boolean }> {
  const groups = groupByOwner(engine, entries).map((g) => ({ ...g, mine: mine.includes(g.owner) }));
  return [...groups.filter((g) => g.mine), ...groups.filter((g) => !g.mine)];
}

// ---- departures

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** A written date as YYYY-MM-DD: "2025-07-04", "July 4, 2025", "11/14/2026". */
export function isoDate(text: string): string | null {
  let m = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(text);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /\b([A-Z][a-z]+)\.? (\d{1,2}),? (\d{4})\b/.exec(text);
  if (m) {
    const i = MONTHS.findIndex((x) => x.startsWith(m![1].toLowerCase().slice(0, 3)));
    if (i >= 0) return `${m[3]}-${String(i + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  m = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(text);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

/** The date a departure starts: the item's own effective date, else the date
 *  its note gives after "since", "from", "effective" or "took effect"; null
 *  when neither says. */
export function departureSince(it: Pick<Item, "effective" | "statute_override">): string | null {
  if (it.effective?.from) return it.effective.from;
  const note = it.statute_override ?? "";
  const m = /\b(?:since|from|effective|took effect(?: on)?|in force|applies from|beginning)\s+([^;:]{0,60})/i.exec(note);
  return m ? isoDate(m[1]) : null;
}

/** Every item that follows a statute over a Colorado rule, in `programs`
 *  (all when null) and in force on `asOf` (all dates when absent). */
export function departureItems(
  engine: Engine, opts: { programs?: readonly string[] | null; asOf?: string } = {},
): Item[] {
  return engine.items().filter((it) => {
    if (!it.statute_override) return false;
    if (opts.programs && !opts.programs.includes(it.program)) return false;
    if (opts.asOf) {
      const since = departureSince(it);
      if (since && since > opts.asOf) return false;
      if (it.effective?.to && it.effective.to !== "present" && it.effective.to < opts.asOf) return false;
    }
    return true;
  }).sort((a, b) => a.program.localeCompare(b.program) || a.name.localeCompare(b.name));
}

// ---- documents that take effect

/** The date a document's rule text takes effect, from its title or citation
 *  ("version effective November 1, 2026", "effective 2026-11-01"). */
export function documentEffective(d: Pick<DocumentMeta, "title" | "citation">): string | null {
  for (const t of [d.title, d.citation]) {
    const m = /\beffective\s+(?:on\s+)?([^;),]{0,40}(?:,\s*\d{4})?)/i.exec(t ?? "");
    if (m) {
      const iso = isoDate(m[1]);
      if (iso) return iso;
    }
  }
  return null;
}
