/* What an open question's answer would do to the stored test households.
 *
 * Two answers, both read from the stored cases (tests/cases.yaml), never
 * from a household typed in: the app defines rules, it does not run intake.
 *
 * - Which stored results rest on the question: every case expectation whose
 *   trace reads an item that carries the question's assumption. These are
 *   the results that could change if it were answered the other way; no
 *   value is claimed for them.
 * - Where the question names an alternative reading that is a different
 *   value of one parameter or supplied-fact default, that one change is
 *   staged as a draft item (the change tray's own ChangeEntry, applied with
 *   applyChangeSet) and the stored cases are run again; the results whose
 *   value differs are the answer, with both values.
 *
 * The alternatives are listed here, each checked by test/ui/questions.test.tsx
 * against the volume (the question is open, the item exists, the value is a
 * real change), so a fix round that answers or reshapes a question fails the
 * test rather than leaving a stale alternative on the page. */
import { applyChangeSet } from "../changes/apply";
import { emptyChangeSet, type ChangeEntry } from "../changes/types";
import type { Engine } from "../engine/engine";
import type { HouseholdCase } from "../engine/cases";
import type { TraceNode } from "../engine/explain";
import type { Item } from "../engine/types";
import { valuesEqual } from "../engine/values";

export interface Alternative {
  /** The open question (OQ-n) whose other reading this is. */
  question: string;
  /** The other reading, in the question's own words. */
  label: string;
  /** The parameter (or supplied fact with a default) the reading changes. */
  identifier: string;
  /** Its value under the other reading. */
  value: unknown;
  /** What the single change leaves out, when it is not the whole reading. */
  caveat?: string;
}

export const ALTERNATIVES: Alternative[] = [
  {
    question: "OQ-104",
    label: "Convert weekly work hours with 4.33 weeks a month, as federal TANF reporting does, instead of 4",
    identifier: "cw_weeks_per_month", value: 4.33,
  },
  {
    question: "OQ-204",
    label: "Count the family planning applicant as two persons added to the MAGI household (household size plus two), not plus one",
    identifier: "ma_family_planning_applicant_household_count", value: 3,
  },
  {
    question: "OQ-410",
    label: "Require community engagement for three months before the month of application, the most the federal text allows, instead of one",
    identifier: "ma_community_engagement_application_lookback_months", value: 3,
  },
  {
    question: "OQ-411",
    label: "Colorado elects the short-term hardship exception",
    identifier: "ma_elects_short_term_hardship_exception", value: true,
  },
  {
    question: "OQ-533",
    label: "Apply Colorado's SNAP rule as written until CDHS implements Pub. L. 119-21: the ABAWD time limit ends at age 54, not 64",
    identifier: "snap_abawd_max_age", value: 54,
    caveat: "Only the age limit is re-run. The exemptions sec. 10102 removed (homeless, veterans, former foster youth) and the other sections this question dates are not.",
  },
];

export function alternativeFor(questionId: string): Alternative | null {
  return ALTERNATIVES.find((a) => a.question === questionId) ?? null;
}

/** The item with the alternative value in force: every dated version takes
 *  it, or the single value does. Null when the item is missing or is not a
 *  value an answer can change. */
export function alternativeItem(engine: Engine, alt: Alternative): Item | null {
  const it = engine.item(alt.identifier);
  if (!it || (it.kind !== "parameter" && it.kind !== "supplied")) return null;
  const next: Item = JSON.parse(JSON.stringify(it)) as Item;
  if (next.versions && next.versions.length) {
    next.versions = next.versions.map((v) => ({ ...v, value: alt.value }));
  } else {
    next.value = alt.value;
  }
  return next;
}

/** The change-tray entry that stages the alternative value, as the editor
 *  would stage it. */
export function alternativeEntry(
  engine: Engine, chapterOf: Record<string, string>, alt: Alternative,
): ChangeEntry | null {
  const after = alternativeItem(engine, alt);
  if (!after) return null;
  const before = engine.itemById(after.id)!;
  return { id: after.id, chapter: chapterOf[after.id] ?? "parameters", before, after };
}

// ---- stored results

export interface StoredResult {
  caseId: string;
  caseTitle: string;
  person: string;
  identifier: string;
  month: string | null;
  /** The value the codex gives today. */
  value: unknown;
}

export interface ChangedResult extends StoredResult {
  /** The value under the other reading. */
  after: unknown;
}

export interface ExpectationReads extends StoredResult {
  reads: Set<string>;
}

const readsMemo = new WeakMap<Engine, WeakMap<readonly HouseholdCase[], ExpectationReads[]>>();

/** Every identifier a result's trace reads, the result's own included. A
 *  value the evaluator had already worked out appears in a later trace as a
 *  bare "memo" leaf; its subtree is the one recorded where it was first
 *  worked out, found by key. */
function readsOf(root: TraceNode, full: Map<string, TraceNode>): Set<string> {
  const ids = new Set<string>();
  const seen = new Set<string>();
  const stack = [root];
  while (stack.length) {
    const n = stack.pop()!;
    ids.add(n.identifier);
    if (seen.has(n.key)) continue;
    seen.add(n.key);
    const node = n.children.length ? n : (full.get(n.key) ?? n);
    for (const k of node.children) stack.push(k);
  }
  return ids;
}

export function expectationReads(engine: Engine, cases: readonly HouseholdCase[]): ExpectationReads[] {
  let perEngine = readsMemo.get(engine);
  if (!perEngine) { perEngine = new WeakMap(); readsMemo.set(engine, perEngine); }
  const hit = perEngine.get(cases);
  if (hit) return hit;
  const out: ExpectationReads[] = [];
  for (const c of cases) {
    const explained = engine.explainCase(c);
    const full = new Map<string, TraceNode>();
    const index = (n: TraceNode) => {
      if (n.children.length && !full.has(n.key)) full.set(n.key, n);
      for (const k of n.children) index(k);
    };
    for (const e of explained) index(e.root);
    for (const e of explained) {
      out.push({
        caseId: c.id, caseTitle: c.title, person: e.person, identifier: e.identifier,
        month: e.month, value: e.root.value, reads: readsOf(e.root, full),
      });
    }
  }
  perEngine.set(cases, out);
  return out;
}

/** The stored results whose reasoning reads any of `identifiers`: what could
 *  change if the assumption those items carry were answered the other way. */
export function resultsRestingOn(
  engine: Engine, cases: readonly HouseholdCase[], identifiers: readonly string[],
): StoredResult[] {
  if (!identifiers.length || !cases.length) return [];
  return expectationReads(engine, cases)
    .filter((e) => identifiers.some((id) => e.reads.has(id)))
    .map(({ reads: _reads, ...r }) => r);
}

/** Two evaluated values are the same result: both unknown, or equal as the
 *  case runner compares them. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return (a === null || a === undefined) && (b === null || b === undefined);
  }
  return valuesEqual(a, b);
}

/** The stored results that change when `entry` is applied: the stored cases
 *  run on the ledger as it is and again with the one change, compared value
 *  by value. */
export function changedResults(
  engine: Engine, cases: readonly HouseholdCase[], entry: ChangeEntry,
): ChangedResult[] {
  const cs = { ...emptyChangeSet("", ""), entries: [entry] };
  const applied = engine.withItems(applyChangeSet(engine.items(), cs));
  const before = engine.runCases([...cases]);
  const after = applied.runCases([...cases]);
  const out: ChangedResult[] = [];
  before.forEach((rep, i) => {
    const alt = after[i];
    rep.results.forEach((r, j) => {
      const a = alt.results[j];
      if (!a || sameValue(r.got, a.got)) return;
      out.push({
        caseId: rep.id, caseTitle: rep.title, person: r.person, identifier: r.identifier,
        month: r.month, value: r.got, after: a.got,
      });
    });
  });
  return out;
}

/** Results grouped by household, households in the order stored. */
export function byCase<T extends StoredResult>(rs: readonly T[]): Array<{ caseId: string; caseTitle: string; results: T[] }> {
  const out: Array<{ caseId: string; caseTitle: string; results: T[] }> = [];
  for (const r of rs) {
    let g = out.find((x) => x.caseId === r.caseId);
    if (!g) { g = { caseId: r.caseId, caseTitle: r.caseTitle, results: [] }; out.push(g); }
    g.results.push(r);
  }
  return out;
}
