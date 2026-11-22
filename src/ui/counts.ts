/* One definition per number, shared by every view (docs/design-unified-ui.md,
 * principle 3: the App said 24 and 49 Medicaid-owned questions on two
 * screens). Every count or derived number a page shows comes from here, and
 * test/ui/counts.test.ts pins each definition against the Colorado volume.
 * A view never counts inline. The words for each are in `COUNT_WORDS`, and
 * `COUNT_DEFINITIONS` says each in a sentence a page can show beside it.
 *
 * - Households that READ an item ("read it"): the stored households one of
 *   whose stored results is decided by reasoning (the engine's own trace)
 *   that passes through the item. Their result could change if the item
 *   changed; nothing is re-run. `householdsThatRead`, `restingOn`.
 * - Households an item REACHES ("it reaches"): the stored households with a
 *   stored result that is the item or that reads it through anything
 *   downstream, whether or not the household's own facts take that branch.
 *   Always at least the households that read it. `householdsReached`.
 * - Stored results that WOULD CHANGE: the stored households run again with
 *   one change, value by value (re-run). `changedBy`.
 * - Outcomes an item affects: the declared program outcomes that read it
 *   through the rules, leaving out a path that runs only through the
 *   document-verification flags. `outcomesAffected`.
 * - Open questions a role OWNS: the question's `Owner:` line names the role
 *   (questions.ts `ownerLineRoles`). Open and partly settled are counted
 *   apart and labeled. A persona owns what one of its roles owns; a persona
 *   with no role (a county worker) owns nothing and reads the questions in
 *   its programs instead. `ownedQuestions`, `personaQuestions`.
 * - Items waiting on a persona's sign-off: items whose approval policy needs
 *   one of its roles' signatures and does not have it, each once.
 *   `awaitingSignOff`.
 * - UNVERIFIED UPSTREAM: an item cites an unverified excerpt (in its sources
 *   or a dated version) or reads, through the rules, an item that does.
 *   `citedUnverified`, `unverifiedUpstream`, `restingOnUnverified`.
 * - Documents still needed and their DUE DATES: walkthrough.ts
 *   `documentsOwed`, the App's computed dates, one row per document; a due
 *   date is PAST DUE when it falls before the date read. `documentsStillNeeded`,
 *   `isPastDue`.
 * - Changes TAKING EFFECT in a period (a month): figure versions that start
 *   or end, rules whose effective dates start or end, and rule documents
 *   whose text takes effect, in the period. `changesTakingEffect`,
 *   `changesInMonth`.
 * - Departures: items that follow a statute over a Colorado rule
 *   (`statute_override`), in force on the date read. `departureItems`. */
import type { Engine } from "../engine/engine";
import type { HouseholdCase } from "../engine/cases";
import type { Item, ItemVersion } from "../engine/types";
import type { DocumentMeta } from "../ledger/documents";
import type { OpenQuestion, Source } from "../ledger/markdown";
import { emptyChangeSet, type ChangeEntry } from "../changes/types";
import { applyChangeSet } from "../changes/apply";
import { valuesEqual } from "../engine/values";
import { versionInForce } from "../engine/versions";
import { personaRoles, type Persona } from "./personas";
import {
  groupByOwner, isOpen, matchesFilter, queueEntry, questionInfos, questionStatus, type QueueEntry, type QueueFilter,
} from "./questions";
import { expectationReads, type ChangedResult, type StoredResult } from "./questionEffects";
import { caseToSpec } from "../engine/cases";
import { buildWalk, documentRows, documentsOwed, type DocumentOwed, type DocumentRow } from "./walkthrough";
import { approvalStatus } from "./approvals";
import { formatDate, personLabel } from "./present";

// ---- the words

/** How each household count is said, everywhere. */
export const COUNT_WORDS = {
  /** Households whose stored results' reasoning passes through the item. */
  resting: "read it",
  /** Households with a stored result at or downstream of the item. */
  reach: "it reaches",
  /** Stored results that differ when the households are re-run. */
  changed: "would change",
} as const;

/** Each household count in a sentence a page can show beside it. */
export const COUNT_DEFINITIONS = {
  read: "A household reads an item when the reasoning behind one of its stored results passes through it: its result could change if the item changed.",
  reach: "An item reaches a household when one of the household's stored results is the item or reads it through anything downstream, whether or not this household's facts take that path.",
  changed: "Worked out by running the stored households again with the change and comparing every result.",
  owns: "A role owns a question when the question's Owner line names it. Partly settled questions are counted apart.",
  pastDue: "A due date is past due when it falls before the date shown.",
  whatIf: "Worked out by reading this stored household again with one stated amount moved and comparing each program result that reads it, for every person.",
  affects: "An item affects what reads it, directly or through other rules, and the program outcomes those reach; a path that runs only through document-verification flags is left out of the outcomes.",
  takesEffect: "A change takes effect in a month when a figure's new version starts or its last version ends, a rule's effective dates start or end, or a rule document's stated effective date falls in that month.",
  outcome: "An outcome is a result a program declares (eligibility, a category, an amount); every other stored result is a step on the way, such as countable income.",
} as const;

function n(x: number, one: string, many = `${one}s`): string {
  return `${x.toLocaleString("en-US")} ${x === 1 ? one : many}`;
}

/** "12 stored results in 3 households read it". */
export function restingPhrase(results: number, households: number): string {
  if (!results) return "No stored household result reads it";
  return `${n(results, "stored result")} in ${n(households, "household")} ${COUNT_WORDS.resting}`;
}

/** "3 stored results in 1 household would change". */
export function changedPhrase(results: number, households: number): string {
  if (!results) return "No stored household result would change";
  return `${n(results, "stored result")} in ${n(households, "household")} ${COUNT_WORDS.changed}`;
}

/** "2 results change, for 1 person": a what-if on one stored household. */
export function whatIfPhrase(rs: ReadonlyArray<{ person: string }>): string {
  if (!rs.length) return "No program result changes";
  return `${n(rs.length, "result")} ${rs.length === 1 ? "changes" : "change"}, for ${n(new Set(rs.map((r) => r.person)).size, "person", "people")}`;
}

/** "Read by 6 of 43 stored households; it reaches 11". */
export function readReachPhrase(read: number, reach: number, total: number): string {
  if (!reach) return `No stored household reads it or is reached by it (of ${total.toLocaleString("en-US")})`;
  return `Read by ${read.toLocaleString("en-US")} of ${n(total, "stored household")}; ${COUNT_WORDS.reach} ${reach.toLocaleString("en-US")}`;
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

/** Builds `restingIndex` a household at a time, yielding between them, so a
 *  page stays responsive while it is built (several seconds for Colorado on
 *  a slow machine). Resolves with the same index `restingIndex` returns. */
export function restingIndexInSteps(
  engine: Engine, cases: readonly HouseholdCase[], budgetMs = 30,
): Promise<Map<string, StoredResult[]>> {
  if (restingReady(engine, cases)) return Promise.resolve(restingIndex(engine, cases));
  return new Promise((resolve) => {
    const out = new Map<string, StoredResult[]>();
    let i = 0;
    const run = () => {
      if (restingReady(engine, cases)) { resolve(restingIndex(engine, cases)); return; }
      const until = Date.now() + budgetMs;
      while (i < cases.length && Date.now() < until) {
        for (const e of expectationReads(engine, [cases[i]])) {
          const { reads, ...r } = e;
          for (const id of reads) {
            const list = out.get(id);
            if (list) list.push(r); else out.set(id, [r]);
          }
        }
        i++;
      }
      if (i < cases.length) { setTimeout(run, 0); return; }
      let per = restMemo.get(engine);
      if (!per) { per = new WeakMap(); restMemo.set(engine, per); }
      per.set(cases, out);
      resolve(out);
    };
    setTimeout(run, 0);
  });
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

/** The households (case ids, in stored order) that READ the item: one of
 *  their stored results' reasoning passes through it. */
export function householdsRestingOn(
  engine: Engine, cases: readonly HouseholdCase[], identifier: string,
): string[] {
  const ids = new Set((restingIndex(engine, cases).get(identifier) ?? []).map((r) => r.caseId));
  return cases.filter((c) => ids.has(c.id)).map((c) => c.id);
}

/** "Households that read X": the same as `householdsRestingOn`, by name. */
export const householdsThatRead = householdsRestingOn;

const reachMemo = new WeakMap<Engine, { cases: readonly HouseholdCase[]; map: Map<string, string[]> }>();

/** identifier -> the households it REACHES (case ids, in stored order): those
 *  with a stored result that is the identifier or reads it through anything
 *  downstream. Static: no household is run. Built once per engine. */
export function reachIndex(engine: Engine, cases: readonly HouseholdCase[]): Map<string, string[]> {
  const hit = reachMemo.get(engine);
  if (hit && hit.cases === cases) return hit.map;
  const upstream = new Map<string, Set<string>>();
  const up = (id: string): Set<string> => {
    let s = upstream.get(id);
    if (s) return s;
    s = new Set<string>();
    const stack = [id];
    while (stack.length) {
      const x = stack.pop()!;
      if (s.has(x)) continue;
      s.add(x);
      for (const d of engine.usesOfItem(x)) stack.push(d);
    }
    upstream.set(id, s);
    return s;
  };
  const map = new Map<string, string[]>();
  for (const c of cases) {
    const reach = new Set<string>();
    for (const exp of Object.values(c.expect ?? {})) {
      for (const id of Object.keys(exp ?? {})) for (const u of up(id)) reach.add(u);
    }
    for (const id of reach) {
      const list = map.get(id);
      if (list) list.push(c.id); else map.set(id, [c.id]);
    }
  }
  reachMemo.set(engine, { cases, map });
  return map;
}

/** The households an item REACHES (case ids, in stored order). */
export function householdsReached(
  engine: Engine, cases: readonly HouseholdCase[], identifier: string,
): string[] {
  return reachIndex(engine, cases).get(identifier) ?? [];
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

const entryMemo = new WeakMap<Engine, { questions: readonly OpenQuestion[]; entries: QueueEntry[] }>();

/** Every question still needing an answer (open or partly settled), as the
 *  queue shows it. Memoised per engine and question list. */
export function unsettledEntries(
  engine: Engine, sources: readonly Source[], questions: readonly OpenQuestion[],
): QueueEntry[] {
  const hit = entryMemo.get(engine);
  if (hit && hit.questions === questions) return hit.entries;
  const entries = questionInfos(engine, questions).filter((q) => isOpen(q.status))
    .map((q) => queueEntry(engine, sources, q));
  entryMemo.set(engine, { questions, entries });
  return entries;
}

/** Whether one of `roles` OWNS the question: its Owner line names the role
 *  (questions.ts `questionOwners` is that line when the question has one). */
export function roleOwns(roles: readonly string[], e: Pick<QueueEntry, "owners">): boolean {
  return e.owners.some((o) => roles.includes(o));
}

/** The questions still needing an answer that a persona owns (open and
 *  partly settled together; `ownedQuestions` splits them): those one of its
 *  roles owns. A persona that signs as no role (a county worker) owns none,
 *  and reads every question in its programs instead (all, when it names
 *  none). The Desk, the queue's "only mine" and the Legal card all count
 *  this. */
export function personaQuestions(
  engine: Engine, sources: readonly Source[], questions: readonly OpenQuestion[], persona: Persona | null,
): QueueEntry[] {
  const open = unsettledEntries(engine, sources, questions);
  if (!persona) return open;
  return open.filter((e) => ownsEntry(engine, persona, e));
}

export function ownsEntry(engine: Engine, persona: Persona, e: QueueEntry): boolean {
  const roles = personaRoles(persona, engine.meta);
  if (roles.length) return roleOwns(roles, e);
  if (!persona.programs.length) return true;
  return e.programs.some((p) => persona.programs.includes(p));
}

export interface OwnedQuestions {
  /** Open: nothing of it settled. */
  open: QueueEntry[];
  /** Partly settled: some part answered, some still open. */
  partly: QueueEntry[];
  /** False for a persona with no role: the lists are the questions in its
   *  programs, which it reads but does not own. */
  owned: boolean;
}

/** The questions a persona (or, with `roles`, a set of roles) owns, open and
 *  partly settled apart. */
export function ownedQuestions(
  engine: Engine, sources: readonly Source[], questions: readonly OpenQuestion[],
  who: Persona | { roles: readonly string[] } | null,
): OwnedQuestions {
  const all = unsettledEntries(engine, sources, questions);
  let mine: QueueEntry[];
  let owned = true;
  if (!who) mine = all;
  else if ("id" in who) {
    mine = all.filter((e) => ownsEntry(engine, who, e));
    owned = personaRoles(who, engine.meta).length > 0;
  } else mine = all.filter((e) => roleOwns(who.roles, e));
  return {
    open: mine.filter((e) => e.status === "open"),
    partly: mine.filter((e) => e.status === "partly"),
    owned,
  };
}

/** "34 open questions you own, and 4 partly settled". */
export function ownedPhrase(o: OwnedQuestions, you = "you"): string {
  const head = o.owned
    ? `${n(o.open.length, "open question")} ${you} own`
    : `${n(o.open.length, "open question")} in ${you === "you" ? "your" : `${you}'s`} programs`;
  return o.partly.length ? `${head}, and ${o.partly.length.toLocaleString("en-US")} partly settled` : head;
}

// ---- items waiting on a sign-off

const awaitingMemo = new WeakMap<Engine, Map<string, Item[]>>();

/** Every role's waiting items: those whose approval policy requires the
 *  role's signature and do not carry it. Memoised per engine. */
export function awaitingByRole(engine: Engine): Map<string, Item[]> {
  const hit = awaitingMemo.get(engine);
  if (hit) return hit;
  const out = new Map<string, Item[]>();
  for (const it of engine.items()) {
    for (const role of approvalStatus(engine, it).missing) {
      const list = out.get(role) ?? [];
      list.push(it);
      out.set(role, list);
    }
  }
  awaitingMemo.set(engine, out);
  return out;
}

/** Items waiting on at least one of `roles`, each counted once (an item two
 *  of a persona's roles must sign is one item). */
export function awaitingSignOff(engine: Engine, roles: readonly string[]): Item[] {
  const by = awaitingByRole(engine);
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const role of roles) {
    for (const it of by.get(role) ?? []) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(it);
    }
  }
  return out;
}

/** The queue grouped by the role each question is filed under, the
 *  persona's own roles first: the groups add up to the whole. A question is
 *  filed under the first role its Owner line names, except that one owned by
 *  one of `mine` is filed under that role, so a list filtered to "mine" never
 *  shows a question of yours under someone else's heading. */
export function ownerGroups(
  engine: Engine, entries: readonly QueueEntry[], mine: readonly string[] = [],
): Array<{ owner: string; entries: QueueEntry[]; mine: boolean }> {
  const filed = entries.map((e) => {
    const own = e.owners.find((o) => mine.includes(o));
    return own && own !== e.owner ? { ...e, owner: own } : e;
  });
  const groups = groupByOwner(engine, filed).map((g) => ({ ...g, mine: mine.includes(g.owner) }));
  return [...groups.filter((g) => g.mine), ...groups.filter((g) => !g.mine)];
}

// ---- the question queue (Questions)

/** How the queue can be ordered (Blind A's sort control). */
export type QuestionSort = "owner" | "households" | "items" | "newest" | "number";

export const QUESTION_SORTS: ReadonlyArray<{ id: QuestionSort; label: string }> = [
  { id: "owner", label: "By owner" },
  { id: "households", label: "Most households first" },
  { id: "items", label: "Most items first" },
  { id: "newest", label: "Newest first" },
  { id: "number", label: "By number" },
];

export interface QueueQuery extends QueueFilter {
  /** Only the questions the persona owns (`ownsEntry`). */
  mine?: boolean;
  /** Open only, or partly settled only; both when absent. */
  state?: "open" | "partly";
  sort?: QuestionSort;
  /** Left out: answered in this browser, waiting to be sent. */
  exclude?: ReadonlySet<string>;
}

export interface QueueRow {
  entry: QueueEntry;
  /** The owner the row names. Always one the filter accepts: the role the
   *  Owner filter asks for, else under "only mine" the persona's own role,
   *  else the question's first owner (Blind B's rows named someone else on a
   *  list filtered to "mine"). */
  owner: string;
  /** Its other owners, after `owner`. */
  others: string[];
  /** Households that read it (`questionHouseholds`): worked out for the
   *  households sort once the resting index is built, else null. */
  households: number | null;
}

export interface QuestionQueue {
  rows: QueueRow[];
  /** Every question still to answer (open and partly settled), less the
   *  excluded ones: "N of TOTAL". */
  total: number;
  /** The persona's own roles. */
  mineRoles: string[];
  /** The rows by the owner each names, the persona's roles first, then the
   *  volume's role order (the "By owner" sort). */
  groups: Array<{ owner: string; rows: QueueRow[]; mine: boolean }>;
}

/** The households (case ids, in stored order) that read a question: one of
 *  their stored results' reasoning passes through an item carrying it. */
export function questionHouseholds(
  engine: Engine, cases: readonly HouseholdCase[], e: Pick<QueueEntry, "items">,
): string[] {
  const ids = new Set(restingOn(engine, cases, e.items.map((it) => it.identifier)).map((r) => r.caseId));
  return cases.filter((c) => ids.has(c.id)).map((c) => c.id);
}

const qNumber = (id: string) => Number(id.replace(/\D/g, "")) || 0;

/** The decision queue as the Questions place shows it: filtered, ordered,
 *  and each row naming an owner that agrees with the filter. With `cases`
 *  and the resting index built, each row carries its household count. */
export function questionQueue(
  engine: Engine, sources: readonly Source[], questions: readonly OpenQuestion[],
  persona: Persona | null, query: QueueQuery = {}, cases: readonly HouseholdCase[] | null = null,
): QuestionQueue {
  const all = unsettledEntries(engine, sources, questions).filter((e) => !query.exclude?.has(e.id));
  const mineRoles = persona ? personaRoles(persona, engine.meta) : [];
  const by = query.sort ?? "owner";
  // Household counts only for the households sort: each is a walk of the
  // resting index.
  const counted = by === "households" && Boolean(cases && restingReady(engine, cases));
  const rows: QueueRow[] = all
    .filter((e) => matchesFilter(e, query))
    .filter((e) => !query.state || e.status === query.state)
    .filter((e) => !query.mine || !persona || ownsEntry(engine, persona, e))
    .map((e) => {
      const owner = (query.owner && e.owners.includes(query.owner) ? query.owner : null)
        ?? (query.mine ? e.owners.find((o) => mineRoles.includes(o)) : null)
        ?? e.owner;
      return {
        entry: e, owner, others: e.owners.filter((o) => o !== owner),
        households: counted ? questionHouseholds(engine, cases!, e).length : null,
      };
    });
  if (counted) {
    rows.sort((a, b) => b.households! - a.households! || b.entry.items.length - a.entry.items.length || qNumber(a.entry.id) - qNumber(b.entry.id));
  } else if (by === "items") {
    rows.sort((a, b) => b.entry.items.length - a.entry.items.length || qNumber(a.entry.id) - qNumber(b.entry.id));
  } else if (by === "newest") {
    rows.sort((a, b) => qNumber(b.entry.id) - qNumber(a.entry.id));
  } else if (by === "number" || by === "households") {
    rows.sort((a, b) => qNumber(a.entry.id) - qNumber(b.entry.id));
  }
  const roles = engine.meta.approval_policy?.roles ?? [];
  const rank = (o: string) => { const i = roles.indexOf(o); return i < 0 ? roles.length : i; };
  const byOwner = new Map<string, QueueRow[]>();
  for (const r of rows) byOwner.set(r.owner, [...(byOwner.get(r.owner) ?? []), r]);
  const groups = [...byOwner.entries()]
    .map(([owner, rs]) => ({ owner, rows: rs, mine: mineRoles.includes(owner) }))
    .sort((a, b) => Number(b.mine) - Number(a.mine) || rank(a.owner) - rank(b.owner) || a.owner.localeCompare(b.owner));
  return { rows, total: all.length, mineRoles, groups };
}

/** The questions no longer open (resolved), in ledger order. */
export function resolvedQuestions(engine: Engine, questions: readonly OpenQuestion[]) {
  return questionInfos(engine, questions).filter((q) => !isOpen(q.status));
}

// ---- Law: unverified sources and what rests on them

/** The excerpts a document gives, in sources.md order. */
export function excerptsOfDocument<S extends Pick<Source, "document">>(sources: readonly S[], docId: string): S[] {
  return sources.filter((s) => s.document === docId);
}

/** The items that cite an excerpt, in their sources or a dated version (the
 *  same reading as `citedUnverified`), by name. */
export function itemsCitingExcerpt(engine: Engine, sourceId: string): Item[] {
  return engine.items()
    .filter((it) => (it.sources ?? []).includes(sourceId) || (it.versions ?? []).some((v) => v.source === sourceId))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface UnverifiedReach {
  /** The unverified excerpts, in sources.md order. */
  sources: Source[];
  /** The items citing one of them themselves. */
  citing: Item[];
  /** Every other item that reads one of those, through the rules. */
  resting: Item[];
  /** The declared program outcomes they affect (`outcomesAffected`). */
  outcomes: string[];
  /** The households that read a citing item (`householdsThatRead`); null
   *  until the resting index is built. */
  households: string[] | null;
}

/** What rests on the unverified excerpts: the items citing them, the items
 *  reading those, the outcomes and the stored households. One reading for
 *  the Law page, its overview and the Desk tile. */
export function unverifiedReach(
  engine: Engine, sources: readonly Source[], unverified: ReadonlySet<string>,
  cases: readonly HouseholdCase[] | null = null,
): UnverifiedReach {
  const citing = itemsCitingUnverified(engine, unverified);
  const citingIds = new Set(citing.map((it) => it.identifier));
  const resting = [...restingOnUnverified(engine, unverified)].filter((id) => !citingIds.has(id))
    .map((id) => engine.item(id)).filter((it): it is Item => Boolean(it))
    .sort((a, b) => a.program.localeCompare(b.program) || a.name.localeCompare(b.name));
  const outcomes = [...new Set(citing.flatMap((it) => outcomesAffected(engine, it.identifier)))];
  let households: string[] | null = null;
  if (cases && restingReady(engine, cases)) {
    const read = new Set(restingOn(engine, cases, [...citingIds]).map((r) => r.caseId));
    households = cases.filter((c) => read.has(c.id)).map((c) => c.id);
  }
  return { sources: sources.filter((s) => unverified.has(s.id)), citing, resting, outcomes, households };
}

export interface LawCounts {
  /** Items following a statute over a Colorado rule, in force on the date. */
  departures: number;
  /** Excerpts marked unverified. */
  unverifiedSources: number;
  /** Items citing an unverified excerpt themselves. */
  citingUnverified: number;
  /** Other items resting on those through the rules. */
  restingOnUnverified: number;
  /** Figures with no value on the date. */
  noValue: number;
  excerpts: number;
  documents: number;
}

/** Every number the Law place shows (its tabs and overview). */
export function lawCounts(
  engine: Engine, vol: { sources: readonly Source[]; documents: readonly DocumentMeta[] },
  unverified: ReadonlySet<string>, date: string,
): LawCounts {
  const citing = itemsCitingUnverified(engine, unverified);
  return {
    departures: departureItems(engine, { asOf: date }).length,
    unverifiedSources: vol.sources.filter((s) => unverified.has(s.id)).length,
    citingUnverified: citing.length,
    restingOnUnverified: restingOnUnverified(engine, unverified).size - citing.length,
    noValue: figuresWithoutValue(engine, date).length,
    excerpts: vol.sources.length,
    documents: vol.documents.length,
  };
}

/** The programs with a departure in force on the date, each with its count,
 *  in the order the departures list them. */
export function departuresByProgram(engine: Engine, asOf: string): Array<{ program: string; count: number }> {
  const out = new Map<string, number>();
  for (const it of departureItems(engine, { asOf })) out.set(it.program, (out.get(it.program) ?? 0) + 1);
  return [...out.entries()].map(([program, count]) => ({ program, count }));
}

/** The words behind the Questions and Law numbers, for a page's "how this
 *  is counted" disclosure. */
export const QUESTION_LAW_DEFINITIONS = {
  queue: "Every question not yet resolved: open, or partly settled with part still open.",
  owner: COUNT_DEFINITIONS.owns,
  households: "Households that read a question: one of their stored results' reasoning passes through an item carrying it.",
  unverified: "An unverified excerpt is one whose text could not be fetched from its document, so it is not a quotation. An item rests on one when it cites it, or reads through the rules an item that does.",
  unverifiedHouseholds: "Households that read an unverified figure: one of their stored results' reasoning passes through an item citing an unverified excerpt.",
  departures: "An item departs when it follows a statute where a Colorado rule, not yet amended, says otherwise. Counted when in force on the date shown.",
  noValue: "A figure kept as dated versions with none in force on the date shown, or with no version loaded at all.",
} as const;

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
  // The part after the first colon says what governs and from when; the part
  // before it quotes the rule overridden, whose own dates are not the
  // departure's ("which still states $4,500 'Effective October 1, 2024'").
  const colon = note.indexOf(": ");
  for (const part of colon >= 0 ? [note.slice(colon + 2), note] : [note]) {
    for (const m of part.matchAll(/\b(?:since|from|effective|took effect(?: on)?|in force|applies from|beginning)\s+([^;:]{0,60})/gi)) {
      const d = isoDate(m[1]);
      if (d) return d;
    }
  }
  return null;
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

// ---- unverified upstream

/** The unverified excerpts an item itself cites, in its sources or in a
 *  dated version, sorted. */
export function citedUnverified(it: Item, unverified: ReadonlySet<string>): string[] {
  const cited = [...(it.sources ?? []), ...(it.versions ?? []).map((v) => v.source ?? "")];
  return [...new Set(cited.filter((s) => unverified.has(s)))].sort();
}

/** The items that cite an unverified excerpt themselves, by name. */
export function itemsCitingUnverified(engine: Engine, unverified: ReadonlySet<string>): Item[] {
  return engine.items().filter((it) => citedUnverified(it, unverified).length)
    .sort((a, b) => a.name.localeCompare(b.name));
}

const taintMemo = new WeakMap<Engine, { key: string; set: Set<string> }>();

/** Identifiers with UNVERIFIED UPSTREAM: the items citing an unverified
 *  excerpt and everything that reads them, through the rules. */
export function restingOnUnverified(engine: Engine, unverified: ReadonlySet<string>): Set<string> {
  const key = [...unverified].sort().join(",");
  const hit = taintMemo.get(engine);
  if (hit && hit.key === key) return hit.set;
  const citing = itemsCitingUnverified(engine, unverified).map((it) => it.identifier);
  const set = new Set([...citing, ...engine.impact(citing)]);
  taintMemo.set(engine, { key, set });
  return set;
}

export interface UnverifiedUse {
  /** The item that cites the unverified excerpt. */
  item: Item;
  sources: string[];
}

/** The items at or upstream of `identifier` that cite an unverified excerpt:
 *  what a result built on it rests on. Empty when it has no unverified
 *  upstream. */
export function unverifiedUpstream(
  engine: Engine, identifier: string, unverified: ReadonlySet<string>,
): UnverifiedUse[] {
  if (!unverified.size) return [];
  const out: UnverifiedUse[] = [];
  const seen = new Set<string>();
  const stack = [identifier];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const it = engine.item(id);
    if (!it) continue;
    const bad = citedUnverified(it, unverified);
    if (bad.length) out.push({ item: it, sources: bad });
    for (const d of engine.usesOfItem(id)) stack.push(d);
  }
  return out.sort((a, b) => a.item.name.localeCompare(b.item.name));
}

// ---- documents still needed, and their due dates

/** Whether a due date is PAST DUE on `date`: it falls before it. */
export function isPastDue(due: string | null | undefined, date: string): boolean {
  return Boolean(due) && due! < date;
}

export interface DocumentsNeeded {
  /** One row per document a person owes, every program it is owed for and
   *  each program's own due date (walkthrough.ts `documentRows`). */
  rows: DocumentRow[];
  /** Pending flags for a program that does not apply to the person: nothing
   *  is owed for them. */
  notOwed: DocumentOwed[];
}

/** The documents a stored household still owes, with the App's computed due
 *  dates (walkthrough.ts `documentsOwed`): every page shows these. */
export function documentsStillNeeded(engine: Engine, hc: HouseholdCase): DocumentsNeeded {
  const owed = documentsOwed(engine, hc);
  return { rows: documentRows(owed.filter((d) => d.applies)), notOwed: owed.filter((d) => !d.applies) };
}

/** How many documents one person of the household still owes. */
export function documentsNeededBy(rows: readonly DocumentRow[], person: string): number {
  return rows.filter((r) => r.person === person).length;
}

/** How many (document, program) due dates are past due on `date`. */
export function pastDueCount(rows: readonly DocumentRow[], date: string): number {
  return rows.reduce((k, r) => k + r.programs.filter((p) => isPastDue(p.due, date)).length, 0);
}

// ---- changes taking effect

export type ChangeKind = "new figure" | "figure ends" | "rule starts" | "rule ends";

export interface ChangeEvent {
  date: string;
  kind: ChangeKind;
  item: Item;
  /** For a figure: the version that starts (or ends) and the one before. */
  version?: ItemVersion;
  previous?: ItemVersion | null;
}

/** Every dated change to the programs' figures and rules (and the shared
 *  ones; every item when `programs` is null) with a date in `[from, to]`
 *  (inclusive), newest first: a figure version that starts, a version that
 *  ends with no next one, a rule whose effective range starts or ends (`to`
 *  is its last day in force). */
export function changesBetween(
  engine: Engine, programs: readonly string[] | null, from: string, to: string,
): ChangeEvent[] {
  const progs = programs ? new Set(programs) : null;
  const out: ChangeEvent[] = [];
  for (const it of engine.items()) {
    if (progs && !progs.has(it.program) && it.program !== "All") continue;
    const vs = [...(it.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from));
    vs.forEach((v, i) => {
      if (v.from >= from && v.from <= to) {
        out.push({ date: v.from, kind: "new figure", item: it, version: v, previous: i ? vs[i - 1] : null });
      }
      const next = vs[i + 1];
      if (v.to && v.to >= from && v.to <= to && (!next || next.from > v.to)) {
        out.push({ date: v.to, kind: "figure ends", item: it, version: v, previous: null });
      }
    });
    const e = it.effective;
    if (e?.from && e.from >= from && e.from <= to) out.push({ date: e.from, kind: "rule starts", item: it });
    if (e?.to && e.to !== "present" && e.to >= from && e.to <= to) {
      out.push({ date: e.to, kind: "rule ends", item: it });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.item.name.localeCompare(b.item.name));
}

export interface DocumentChange { doc: DocumentMeta; date: string; programs: string[] }

type VolumeSources = { documents: readonly DocumentMeta[]; sources: ReadonlyArray<{ id: string; document?: string }> };

/** Rule documents whose text takes effect in `[from, to]` (the date their
 *  title or citation states), cited by an item in the programs (any program
 *  when null), newest first. */
export function documentsTakingEffect(
  engine: Engine, docs: readonly DocumentMeta[], sources: VolumeSources["sources"],
  programs: readonly string[] | null, from: string, to: string,
): DocumentChange[] {
  const progs = programs ? new Set(programs) : null;
  const out: DocumentChange[] = [];
  for (const d of docs) {
    const date = documentEffective(d);
    if (!date || date < from || date > to) continue;
    const excerpts = new Set(sources.filter((s) => s.document === d.id).map((s) => s.id));
    const ps = new Set<string>();
    for (const it of engine.items()) {
      if (!(it.sources ?? []).some((x) => excerpts.has(x)) && !(it.versions ?? []).some((v) => v.source && excerpts.has(v.source))) continue;
      if (!progs || progs.has(it.program)) ps.add(it.program);
    }
    if (ps.size) out.push({ doc: d, date, programs: [...ps] });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export interface ChangesTakingEffect {
  /** Figure versions and rules, newest first. */
  events: ChangeEvent[];
  /** Rule documents, newest first. */
  documents: DocumentChange[];
  /** events + documents: the number a page shows. */
  total: number;
}

/** Everything taking effect in `[from, to]`: figure versions AND rules AND
 *  rule documents (the county supervisor's "this month" missed the rule
 *  documents in two of three UIs). */
export function changesTakingEffect(
  engine: Engine, vol: VolumeSources, from: string, to: string, programs: readonly string[] | null = null,
): ChangesTakingEffect {
  const events = changesBetween(engine, programs, from, to);
  const documents = documentsTakingEffect(engine, vol.documents, vol.sources, programs, from, to);
  return { events, documents, total: events.length + documents.length };
}

/** The first and last day of a month ("2026-11", or any date in it). */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.slice(0, 7).split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

/** What takes effect in one month. */
export function changesInMonth(
  engine: Engine, vol: VolumeSources, month: string, programs: readonly string[] | null = null,
): ChangesTakingEffect {
  const { from, to } = monthRange(month);
  return changesTakingEffect(engine, vol, from, to, programs);
}

/** Every item that reads `identifier`, directly or through other rules:
 *  what depends on it. */
export function dependentsOf(engine: Engine, identifier: string): string[] {
  return engine.impact([identifier]);
}

// ---- figures with a new version soon

/** How far ahead "a new version soon" looks. */
export const NEW_VERSION_SOON_DAYS = 90;

/** The version that starts after `date` and within NEW_VERSION_SOON_DAYS of
 *  it, or null. */
export function newVersionSoon(it: Pick<Item, "versions">, date: string): ItemVersion | null {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + NEW_VERSION_SOON_DAYS);
  const until = t.toISOString().slice(0, 10);
  return [...(it.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from))
    .find((v) => v.from > date && v.from <= until) ?? null;
}

// ---- figures with no value

/** Figures (parameters kept as dated versions) with no version in force on
 *  `date`, a figure with no version loaded at all included: a household
 *  determined then gets "cannot determine". */
export function figuresWithoutValue(engine: Engine, date: string): Item[] {
  return engine.items().filter((it) => it.kind === "parameter" && Array.isArray(it.versions)
    && !versionInForce(it, date))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---- what an item reads and what reads it (the Map)

export interface MapCounts {
  /** Every item it reads, directly or through other rules, by kind: supplied
   *  facts, figures (parameters), rules (derived items that are not a
   *  declared outcome) and declared outcomes. */
  reads: { facts: number; figures: number; rules: number; outcomes: number; total: number };
  /** Every item that reads it, directly or through other rules. */
  readBy: { rules: number; outcomes: number; total: number };
}

const mapCountMemo = new WeakMap<Engine, Map<string, MapCounts>>();
const outcomeMemo = new WeakMap<Engine, Set<string>>();

/** Every outcome: an item a program declares among its outcomes, or one
 *  whose role says it is one. */
export function outcomeIdentifiers(engine: Engine): Set<string> {
  const hit = outcomeMemo.get(engine);
  if (hit) return hit;
  const out = new Set<string>();
  for (const p of engine.meta.programs ?? []) for (const o of p.outcomes ?? []) out.add(o);
  for (const it of engine.items()) if (it.role === "outcome") out.add(it.identifier);
  outcomeMemo.set(engine, out);
  return out;
}

/** How much stands behind and ahead of an item, as the Map shows it at full
 *  depth: every dependency is followed (verification flags included, unlike
 *  `outcomesAffected`), so the counts match what the Map can expand to. A
 *  program's outcome reads "fed by N facts, M figures, R rules". */
export function mapCounts(engine: Engine, identifier: string): MapCounts {
  let per = mapCountMemo.get(engine);
  if (!per) { per = new Map(); mapCountMemo.set(engine, per); }
  const hit = per.get(identifier);
  if (hit) return hit;
  const outcomes = outcomeIdentifiers(engine);
  const walk = (next: (id: string) => string[]) => {
    const seen = new Set<string>([identifier]);
    const stack = [identifier];
    while (stack.length) for (const d of next(stack.pop()!)) if (!seen.has(d)) { seen.add(d); stack.push(d); }
    seen.delete(identifier);
    return seen;
  };
  const reads = { facts: 0, figures: 0, rules: 0, outcomes: 0, total: 0 };
  for (const id of walk((x) => engine.usesOfItem(x))) {
    const it = engine.item(id);
    if (!it) continue;
    reads.total++;
    if (it.kind === "supplied") reads.facts++;
    else if (it.kind === "parameter") reads.figures++;
    else if (outcomes.has(id)) reads.outcomes++;
    else reads.rules++;
  }
  const readBy = { rules: 0, outcomes: 0, total: 0 };
  for (const id of walk((x) => engine.usedBy(x))) {
    if (!engine.item(id)) continue;
    readBy.total++;
    if (outcomes.has(id)) readBy.outcomes++; else readBy.rules++;
  }
  const out = { reads, readBy };
  per.set(identifier, out);
  return out;
}

// ---- what an item affects (the item page)

export interface ItemAffects {
  /** Rules that read it directly. */
  direct: number;
  /** Every item that reads it, directly or through other rules
   *  (`dependentsOf`). */
  dependents: number;
  /** Declared outcomes it affects, verification-only paths left out
   *  (`outcomesAffected`). */
  outcomes: number;
}

/** What the item page's "What it affects" counts. */
export function itemAffects(engine: Engine, identifier: string): ItemAffects {
  return {
    direct: engine.usedBy(identifier).length,
    dependents: dependentsOf(engine, identifier).length,
    outcomes: outcomesAffected(engine, identifier).length,
  };
}

/** "Read by 1 rule directly and 4 in all, reaching 1 program outcome". */
export function affectsPhrase(a: ItemAffects): string {
  if (!a.dependents) return "Nothing reads it";
  return `Read by ${n(a.direct, "rule")} directly and ${a.dependents.toLocaleString("en-US")} in all, reaching ${n(a.outcomes, "program outcome")}`;
}

// ---- the Changes place: months, readers of a change, a proposal's reach

/** Every month in which something takes effect (figure versions, rules and
 *  rule documents, as `changesInMonth` counts them), oldest first, with how
 *  many changes. The month picker lists these. */
export function changeMonths(
  engine: Engine, vol: VolumeSources, programs: readonly string[] | null = null,
): Array<{ month: string; total: number }> {
  let per = monthsMemo.get(engine);
  if (!per) { per = new Map(); monthsMemo.set(engine, per); }
  const key = `${vol.documents.length}|${programs ? programs.join(",") : "*"}`;
  const hit = per.get(key);
  if (hit) return hit;
  const all = changesTakingEffect(engine, vol, "0000-01-01", "9999-12-31", programs);
  const by = new Map<string, number>();
  for (const d of [...all.events.map((e) => e.date), ...all.documents.map((d) => d.date)]) {
    const m = d.slice(0, 7);
    by.set(m, (by.get(m) ?? 0) + 1);
  }
  const out = [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total }));
  per.set(key, out);
  return out;
}

const monthsMemo = new WeakMap<Engine, Map<string, Array<{ month: string; total: number }>>>();

/** The households (case ids, in stored order) that READ at least one of
 *  `identifiers`: the union of `householdsThatRead`. */
export function householdsReadingAny(
  engine: Engine, cases: readonly HouseholdCase[], identifiers: readonly string[],
): string[] {
  const ids = new Set(restingOn(engine, cases, identifiers).map((r) => r.caseId));
  return cases.filter((c) => ids.has(c.id)).map((c) => c.id);
}

/** The items that cite an excerpt of document `docId`, in their sources or
 *  in a dated version: what a rule document taking effect bears on. */
export function itemsCitingDocument(
  engine: Engine, sources: VolumeSources["sources"], docId: string,
): Item[] {
  const excerpts = new Set(sources.filter((s) => s.document === docId).map((s) => s.id));
  return engine.items().filter((it) =>
    (it.sources ?? []).some((x) => excerpts.has(x)) || (it.versions ?? []).some((v) => v.source && excerpts.has(v.source)));
}

export interface ProposalReach {
  /** Households that read at least one changed item. */
  read: string[];
  /** Households at least one changed item reaches. */
  reach: string[];
}

/** The households a proposal's changed items READ and REACH: the unions of
 *  `householdsThatRead` and `householdsReached` over them, so a proposal of
 *  one item says exactly what that item's page says (Blind B's proposal said
 *  32 where the item said 6). */
export function proposalReach(
  engine: Engine, cases: readonly HouseholdCase[], identifiers: readonly string[],
): ProposalReach {
  const reached = new Set<string>();
  for (const id of identifiers) for (const c of householdsReached(engine, cases, id)) reached.add(c);
  return {
    read: householdsReadingAny(engine, cases, identifiers),
    reach: cases.filter((c) => reached.has(c.id)).map((c) => c.id),
  };
}

/** Results that would change, split into OUTCOMES (a program's declared
 *  outcome, `outcomeIdentifiers`) and intermediate STEPS (any other stored
 *  result, such as countable income): a change can move a step without
 *  moving an outcome, and a page shows both. */
export function changedSplit(
  engine: Engine, changed: readonly ChangedResult[],
): { outcomes: ChangedResult[]; steps: ChangedResult[] } {
  const outs = outcomeIdentifiers(engine);
  return {
    outcomes: changed.filter((c) => outs.has(c.identifier)),
    steps: changed.filter((c) => !outs.has(c.identifier)),
  };
}

/** The households that read a rule document taking effect: those reading
 *  an item (in `programs`, all when null) that cites one of its excerpts. */
export function documentReaders(
  engine: Engine, cases: readonly HouseholdCase[], sources: VolumeSources["sources"], docId: string,
  programs: readonly string[] | null = null,
): { items: Item[]; households: string[] } {
  const items = itemsCitingDocument(engine, sources, docId).filter((it) => !programs || programs.includes(it.program));
  return { items, households: householdsReadingAny(engine, cases, items.map((it) => it.identifier)) };
}

/** What takes effect that one stored household reads (Blind A's "Only what
 *  touches household" filter): the figures and rules it reads, and the rule
 *  documents an item it reads cites. */
export function changesReadBy(
  engine: Engine, cases: readonly HouseholdCase[], sources: VolumeSources["sources"],
  changes: ChangesTakingEffect, caseId: string, programs: readonly string[] | null = null,
): ChangesTakingEffect {
  const events = changes.events.filter((e) => householdsThatRead(engine, cases, e.item.identifier).includes(caseId));
  const documents = changes.documents.filter((d) => documentReaders(engine, cases, sources, d.doc.id, programs).households.includes(caseId));
  return { events, documents, total: events.length + documents.length };
}

// ---- the Desk, Programs and Figures

/** What each Desk tile, a program's summary and the Figures list count, in
 *  a sentence each (shown behind "How this is counted"). */
export const DESK_DEFINITIONS = {
  signOff: "An item waits for your signature when the volume's approval policy needs one of your roles to sign it and that role has not. An item two of your roles must sign counts once.",
  soon: `Takes effect soon: a figure version, a rule or a rule document whose own date falls in the next ${NEW_VERSION_SOON_DAYS} days, in your programs or shared by every program.`,
  departures: "Statute over rule: an item that follows a statute over the Colorado rule text, in force today.",
  unverified: "Unverified: an item that cites an excerpt not verified against its document, or a figure with no value today (a household then gets \"cannot determine\").",
  proposal: "Your proposal: every edit, signature, answer and note staged in this browser and not yet sent.",
  steps: "A step is one rule the result is worked out from. \"The main steps\" are the rules the result reads directly; each level down adds the rules those read. Facts and figures are named inside the steps.",
  figures: "A figure is a number or table the rules read (a limit, a standard, a rate). Its value on a date is the version in force that day.",
} as const;

/** The window "soon" looks at: the day after `today` to
 *  NEW_VERSION_SOON_DAYS after it. */
export function soonRange(today: string): { from: string; to: string } {
  const at = (days: number) => {
    const t = new Date(`${today}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() + days);
    return t.toISOString().slice(0, 10);
  };
  return { from: at(1), to: at(NEW_VERSION_SOON_DAYS) };
}

/** What takes effect soon in `programs` (every program when null): the
 *  Desk's tile. Soonest first. */
export function takingEffectSoon(
  engine: Engine, vol: { documents: readonly DocumentMeta[]; sources: ReadonlyArray<{ id: string; document?: string }> },
  today: string, programs: readonly string[] | null,
): ChangesTakingEffect {
  const { from, to } = soonRange(today);
  const c = changesTakingEffect(engine, vol, from, to, programs);
  return {
    events: [...c.events].sort((a, b) => a.date.localeCompare(b.date) || a.item.name.localeCompare(b.item.name)),
    documents: [...c.documents].sort((a, b) => a.date.localeCompare(b.date)),
    total: c.total,
  };
}

export interface UnverifiedInPrograms {
  /** Items that cite an unverified excerpt themselves. */
  citing: Item[];
  /** Figures with no value on the date. */
  noValue: Item[];
  /** Each item once, whichever list it is on. */
  total: number;
}

/** The Desk's "unverified" tile: items in `programs` (and shared ones; every
 *  program when null) citing an unverified excerpt, and figures with no
 *  value on `date`. */
export function unverifiedInPrograms(
  engine: Engine, unverified: ReadonlySet<string>, programs: readonly string[] | null, date: string,
): UnverifiedInPrograms {
  const mine = (it: Item) => !programs || programs.includes(it.program) || it.program === "All";
  const citing = itemsCitingUnverified(engine, unverified).filter(mine);
  const noValue = figuresWithoutValue(engine, date).filter(mine);
  return { citing, noValue, total: new Set([...citing, ...noValue].map((it) => it.id)).size };
}

export interface SignOffGroup {
  /** `<program>/<chapter>`: the `?group=` of the sign-off list. */
  key: string;
  program: string;
  chapter: string;
  items: Item[];
  /** Of `items`, those carrying an open question. */
  withOpenQuestion: number;
  /** Of `items`, those resting on unverified text (`restingOnUnverified`):
   *  they stay Draft whoever signs. */
  onUnverified: number;
}

/** The items waiting on one role, grouped by program and chapter (the
 *  sign-off list's groups): the role's own programs first, then the shared
 *  items, then the rest; figures before rules before facts; ledger order
 *  inside a group. The groups add up to `awaitingSignOff(engine, [role])`.
 *  `tainted` is `restingOnUnverified`. */
export function signOffGroups(
  engine: Engine, role: string, chapterOf: Readonly<Record<string, string>>,
  tainted: ReadonlySet<string> = new Set(),
): SignOffGroup[] {
  const groups = new Map<string, SignOffGroup>();
  for (const it of awaitingByRole(engine).get(role) ?? []) {
    const chapter = chapterOf[it.id] ?? "";
    const key = `${it.program}/${chapter}`;
    let g = groups.get(key);
    if (!g) { g = { key, program: it.program, chapter, items: [], withOpenQuestion: 0, onUnverified: 0 }; groups.set(key, g); }
    g.items.push(it);
    if ((it.open ?? []).length) g.withOpenQuestion++;
    if (tainted.has(it.identifier)) g.onUnverified++;
  }
  const declared = (engine.meta.programs ?? []).map((p) => p.id);
  const own = Object.entries(engine.meta.approval_policy?.by_program ?? {})
    .filter(([p, rs]) => p !== "All" && rs.includes(role)).map(([p]) => p);
  const rank = (p: string) => (own.includes(p) ? 0 : p === "All" ? 1 : 2) * 1000 + (declared.includes(p) ? declared.indexOf(p) : 999);
  const chapterRank = (c: string) => (c === "parameters" ? 0 : c === "supplied" ? 2 : 1);
  return [...groups.values()].sort((a, b) => rank(a.program) - rank(b.program)
    || chapterRank(a.chapter) - chapterRank(b.chapter) || a.chapter.localeCompare(b.chapter));
}

// ---- a program

/** Whether an outcome is about documents and verification rather than the
 *  decision itself. */
export function isVerificationOutcome(it: Pick<Item, "tags" | "identifier">): boolean {
  return (it.tags ?? []).includes("verification")
    || /verification|pending|due_date|postponement/.test(it.identifier);
}

export interface ProgramSummary {
  program: string;
  /** The outcomes it decides, in declared order. */
  decisions: Item[];
  /** Its outcomes about documents and verification. */
  verification: Item[];
  /** Its own items, by kind. */
  rules: number;
  figures: number;
  facts: number;
  /** Open or partly settled questions one of its items rests on. */
  openQuestions: string[];
}

/** One program at a glance: what it decides and how much is in it. */
export function programSummary(
  engine: Engine, program: string, questions: readonly OpenQuestion[],
): ProgramSummary {
  const declared = (engine.meta.programs ?? []).find((p) => p.id === program);
  const outcomes = (declared?.outcomes ?? []).map((o) => engine.item(o)).filter((x): x is Item => !!x);
  const own = engine.items().filter((it) => it.program === program);
  const unsettled = new Set(questions.filter((q) => isOpen(questionStatus(q))).map((q) => q.id));
  const open = [...new Set(own.flatMap((it) => it.open ?? []))].filter((id) => unsettled.has(id)).sort();
  return {
    program,
    decisions: outcomes.filter((it) => !isVerificationOutcome(it)),
    verification: outcomes.filter(isVerificationOutcome),
    rules: own.filter((it) => it.kind === "derived").length,
    figures: own.filter((it) => it.kind === "parameter").length,
    facts: own.filter((it) => it.kind === "supplied").length,
    openQuestions: open,
  };
}

// ---- explain step by step

export interface ExplainStep {
  item: Item;
  /** 0 for the result itself; 1 for a rule it reads directly; and so on. */
  level: number;
}

/** "Explain step by step": the rules a result is worked out from, down to
 *  `depth` levels (Infinity: every rule), in the order they are worked out
 *  (each rule after the rules it reads); the last step is the result. Facts
 *  and figures are not steps: each step names the ones it reads. */
export function explainSteps(engine: Engine, identifier: string, depth: number): ExplainStep[] {
  const out: ExplainStep[] = [];
  const seen = new Set<string>();
  const walk = (id: string, level: number) => {
    if (seen.has(id)) return;
    const it = engine.item(id);
    if (!it) return;
    seen.add(id);
    if (level < depth) {
      for (const u of engine.usesOfItem(id)) if (engine.item(u)?.kind === "derived") walk(u, level + 1);
    }
    out.push({ item: it, level });
  };
  walk(identifier, 0);
  return out;
}

// ---- figures on a date

export interface FigureFilter {
  asOf: string;
  /** Words, each matched at the start of a word in the name or meaning. */
  q?: string;
  program?: string;
  soon?: boolean;
  unverified?: boolean;
  noValue?: boolean;
}

export interface FigureOnDate {
  item: Item;
  /** The value in force on the date; null when none. */
  value: unknown;
  /** The version in force, for a dated figure. */
  version: ItemVersion | null;
  /** The next version after the date, if any. */
  next: ItemVersion | null;
  /** A new version within NEW_VERSION_SOON_DAYS of the date. */
  soon: ItemVersion | null;
  /** Unverified excerpts it cites. */
  unverified: string[];
  /** A dated figure with no version in force on the date. */
  noValue: boolean;
}

/** Every figure (a parameter) with its value on `asOf`, filtered, sorted by
 *  program (declared order, shared last) and name: the Figures page's list
 *  and its count. `matches` is the word filter (search.ts `wordsMatch`). */
export function figuresOnDate(
  engine: Engine, unverified: ReadonlySet<string>, f: FigureFilter,
  matches: (text: string, q: string) => boolean,
): FigureOnDate[] {
  const declared = (engine.meta.programs ?? []).map((p) => p.id);
  const rank = (p: string) => (p === "All" ? 998 : declared.includes(p) ? declared.indexOf(p) : 997);
  const out: FigureOnDate[] = [];
  for (const it of engine.items()) {
    if (it.kind !== "parameter") continue;
    if (f.program && it.program !== f.program) continue;
    if (f.q && !matches(`${it.name} ${it.meaning ?? ""} ${it.id} ${it.identifier}`, f.q)) continue;
    const dated = Array.isArray(it.versions);
    const version = dated ? versionInForce(it, f.asOf) : null;
    const row: FigureOnDate = {
      item: it,
      value: dated ? (version ? version.value : null) : (it.value ?? null),
      version,
      next: [...(it.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from)).find((v) => v.from > f.asOf) ?? null,
      soon: newVersionSoon(it, f.asOf),
      unverified: citedUnverified(it, unverified),
      noValue: dated && !version,
    };
    if (f.soon && !row.soon) continue;
    if (f.unverified && !row.unverified.length) continue;
    if (f.noValue && !row.noValue) continue;
    out.push(row);
  }
  return out.sort((a, b) => rank(a.item.program) - rank(b.item.program) || a.item.name.localeCompare(b.item.name));
}
