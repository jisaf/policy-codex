/* The runner of the external sample check (docs/external-check.md): each
 * expected answer of each case is evaluated with the engine's trace, compared,
 * and, where the two differ, explained: the rules that decided the engine's
 * answer, the facts it was missing, and a first triage hint (data entry, a
 * rule gap, an open question already recorded, a known limit). */
import { makeCase } from "../engine/evaluate";
import { caseToSpec, type HouseholdCase } from "../engine/cases";
import { decidedBy, explain, missingFacts, type TraceNode } from "../engine/explain";
import type { LedgerIndex } from "../engine/ledger-index";
import type { OpenQuestion } from "../ledger/markdown";
import { PROGRAM_LABELS, plainValue } from "./dictionary";
import type { ExternalCase, ExternalExpectation } from "./importer";

/** One entry of docs/reviews/known-limits.md. */
export interface KnownLimit {
  id: string;
  title: string;
  closed: boolean;
  /** Item ids (CO-n) and identifiers the entry names. */
  names: Set<string>;
  /** Open questions the entry names (OQ-n). */
  questions: Set<string>;
}

/** The entries of a known-limits file: each `### <id> ...` heading and the
 *  text under it. An entry whose text says **Closed** is closed. */
export function parseKnownLimits(md: string): KnownLimit[] {
  const out: KnownLimit[] = [];
  const parts = md.split(/^### /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const head = (nl < 0 ? part : part.slice(0, nl)).trim();
    const body = nl < 0 ? "" : part.slice(nl + 1).split(/^## /m)[0];
    const m = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\.?\s*(.*)$/.exec(head);
    if (!m) continue;
    const text = head + "\n" + body;
    out.push({
      id: m[1],
      title: m[2].replace(/^\(([^)]*)\):\s*/, "").replace(/^[:.]\s*/, "").trim() || head,
      closed: /\*\*Closed\b/.test(body) || /\bClosed\b/.test(head),
      names: new Set([...text.matchAll(/\b([A-Z]{2,}-\d+)\b/g)].map((x) => x[1]).concat(
        [...text.matchAll(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/g)].map((x) => x[1]))),
      questions: new Set([...text.matchAll(/\b(OQ-\d+)\b/g)].map((x) => x[1])),
    });
  }
  return out;
}

export interface TriageRefs {
  openQuestions: OpenQuestion[];
  knownLimits: KnownLimit[];
}

export type HintCategory = "data entry" | "rule gap" | "open question" | "known limit";
export interface TriageHint { category: HintCategory; ref?: string; text: string }

export interface DecisiveLine {
  depth: number;
  identifier: string;
  id: string;
  name: string;
  kind: string;
  person: string | null;
  month: string | null;
  value: unknown;
}

export interface MissingFact { identifier: string; id: string; name: string; person: string | null; month: string | null }

export interface CheckRow {
  case: string;
  title: string;
  person: string;
  personLabel: string;
  program: string;
  programLabel: string;
  identifier: string;
  resultLabel: string;
  month: string | null;
  expected: unknown;
  engine: unknown;
  status: "match" | "differ";
  source: string;
  notes: string;
  error?: string;
  decisive: DecisiveLine[];
  moreDecisive: number;
  missing: MissingFact[];
  hints: TriageHint[];
}

/** How many decisive lines a difference shows. */
export const DECISIVE_LINES = 20;

/** Equal for the check: amounts within half a cent; a group of persons in
 *  any order; null is "cannot determine". */
export function sameAnswer(expected: unknown, got: unknown): boolean {
  if (expected === null || expected === "unknown") return got === null || got === undefined;
  if (got === null || got === undefined) return false;
  if (typeof expected === "number" && typeof got === "number") return Math.abs(got - expected) < 0.005;
  if (Array.isArray(expected) && Array.isArray(got)) {
    const a = expected.map(String).sort();
    const b = got.map(String).sort();
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }
  return expected === got;
}

/** Every full expansion in a trace, by key, so a memo hit can be followed. */
function expansions(root: TraceNode): Map<string, TraceNode> {
  const out = new Map<string, TraceNode>();
  const walk = (n: TraceNode) => {
    if (n.origin !== "memo" && !out.has(n.key)) out.set(n.key, n);
    for (const k of n.children) walk(k);
  };
  walk(root);
  return out;
}

/** The rules a line is expanded into: the ones the evaluator marked
 *  decisive; or, where it marked none (a comparison, or a first-match rule
 *  whose arm is a plain value), the last two derived inputs it read, since
 *  the inputs a first-match rule read last are the ones that settled its arm,
 *  and a comparison has two sides. */
function expandInto(node: TraceNode): TraceNode[] {
  const marked = node.children.filter((k) => k.decisive);
  if (marked.length) return marked.filter((k) => k.kind === "derived");
  return node.children.filter((k) => k.kind === "derived").slice(-2);
}

/** The rules and facts that decided a value, depth-first: what decided it
 *  (depth 0), then what decided each of those rules, following memo hits to
 *  their expansion; at most `max` lines. */
export function decisiveLines(ix: LedgerIndex, root: TraceNode, max = DECISIVE_LINES): { lines: DecisiveLine[]; more: number } {
  const full = expansions(root);
  const lines: DecisiveLine[] = [];
  const seen = new Set<string>();
  let more = 0;
  const visit = (n: TraceNode, depth: number) => {
    const node = n.origin === "memo" ? full.get(n.key) ?? n : n;
    const expand = new Set(expandInto(node).map((k) => k.key));
    for (const k of decidedBy(node)) {
      if (seen.has(k.key)) continue;
      seen.add(k.key);
      if (lines.length >= max) { more++; continue; }
      lines.push({
        depth, identifier: k.identifier, id: ix.byIdentifier.get(k.identifier)?.id ?? "", name: k.name,
        kind: k.kind, person: k.person, month: k.month, value: k.value,
      });
      if (expand.has(k.key) && depth < 8) visit(k, depth + 1);
    }
  };
  visit(root, 0);
  return { lines, more };
}

/** The rules of the decisive lines and the result's own rule, as item ids
 *  and identifiers, each with its depth (the result's rule 0, the lines
 *  below it from 1). */
export function decisiveRules(ix: LedgerIndex, root: TraceNode, lines: readonly DecisiveLine[]): Map<string, number> {
  const out = new Map<string, number>();
  const add = (identifier: string, depth: number) => {
    const it = ix.byIdentifier.get(identifier);
    if (!it || it.kind !== "derived") return;
    for (const k of [it.id, it.identifier]) if (!out.has(k) || out.get(k)! < depth) out.set(k, depth);
  };
  add(root.identifier, 0);
  for (const l of lines) add(l.identifier, l.depth + 1);
  return out;
}

/** The entries whose names meet the decisive rules, deepest match first
 *  (the deeper, the more specific to this answer). An entry that names only
 *  the result's own rule is kept only when no entry meets a rule below it. */
function rankMatches<T>(entries: readonly T[], names: (e: T) => Iterable<string>, rules: Map<string, number>): T[] {
  const scored = entries
    .map((e) => ({ e, score: Math.max(-1, ...[...names(e)].map((n) => rules.get(n) ?? -1)) }))
    .filter((x) => x.score >= 0);
  const deep = scored.some((x) => x.score > 0);
  return scored.filter((x) => !deep || x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.e);
}

/** The first triage hints for one difference, most likely first. */
export function triage(
  ix: LedgerIndex, root: TraceNode, lines: readonly DecisiveLine[], expected: unknown, got: unknown,
  error: string | undefined, missing: readonly MissingFact[], refs: TriageRefs,
): TriageHint[] {
  if (error) return [{ category: "rule gap", text: `The engine stopped with an error: ${error}. Report it to whoever runs the check.` }];
  const hints: TriageHint[] = [];
  if ((got === null || got === undefined) && expected !== null) {
    if (missing.length) {
      hints.push({ category: "data entry", text: `The engine cannot determine this: the case does not state ${missing.length} fact${missing.length === 1 ? "" : "s"} the rules ask for (listed below). Add them to the case, or confirm they are not known.` });
    } else {
      hints.push({ category: "rule gap", text: "The engine cannot determine this although every fact it asked for is stated: a figure or table may have no entry for this case." });
    }
  }
  const rules = decisiveRules(ix, root, lines);
  const kls = rankMatches(refs.knownLimits.filter((k) => !k.closed), (k) => k.names, rules);
  const klQuestions = new Set(kls.flatMap((k) => [...k.questions]));
  for (const k of kls.slice(0, 2)) {
    hints.push({ category: "known limit", ref: k.id, text: `Possibly known limit ${k.id} (docs/reviews/known-limits.md): ${k.title}` });
  }
  const oqs = rankMatches(
    refs.openQuestions.filter((q) => !/^resolved\b/i.test(q.title) && !klQuestions.has(q.id)), (q) => q.items, rules,
  );
  for (const q of oqs.slice(0, 2)) {
    hints.push({ category: "open question", ref: q.id, text: `Possibly open question ${q.id} (volumes/co/open-questions.md): ${q.title}` });
  }
  if (expected === null && got !== null && got !== undefined) {
    hints.push({ category: "data entry", text: "The expected answer is cannot determine, but the engine answered from the facts the case states. Check whether the case states something the source did not know." });
  }
  if (!hints.length) {
    hints.push({ category: "rule gap", text: "No open question or known limit names the rules that decided this. First check the decisive facts below against the case file (data entry); if they are right, the rules may miss something: send it to the program's policy owner." });
  }
  return hints;
}

/** The expectations of a case: from the import's metadata, or, for a case in
 *  the stored-household shape, from its expect blocks. */
export function expectationsOf(ix: LedgerIndex, c: HouseholdCase | ExternalCase): ExternalExpectation[] {
  const ext = (c as ExternalCase).external;
  if (ext?.expected?.length) return ext.expected;
  const out: ExternalExpectation[] = [];
  for (const [person, exps] of Object.entries(c.expect ?? {})) {
    for (const [identifier, e] of Object.entries(exps)) {
      const it = ix.byIdentifier.get(identifier);
      const monthly = it?.scope === "person-month" && e !== null && typeof e === "object" && !Array.isArray(e);
      const pairs: Array<[string | null, unknown]> = monthly ? Object.entries(e as Record<string, unknown>) : [[null, e]];
      for (const [month, v] of pairs) {
        out.push({ person, identifier, program: it?.program ?? "", month, expect: v === "unknown" ? null : v, source: "", notes: "", at: "" });
      }
    }
  }
  return out;
}

/** Runs every expected answer of every case. */
export function runExternal(ix: LedgerIndex, cases: ReadonlyArray<HouseholdCase | ExternalCase>, refs: TriageRefs): CheckRow[] {
  const rows: CheckRow[] = [];
  for (const c of cases) {
    const data = makeCase(ix, caseToSpec(c));
    const labels = (c as ExternalCase).external?.persons ?? {};
    for (const e of expectationsOf(ix, c)) {
      const it = ix.byIdentifier.get(e.identifier);
      const root = explain(ix, data, e.identifier, e.person, e.month);
      const got = root.error ? null : root.value;
      const ok = !root.error && sameAnswer(e.expect, got);
      const row: CheckRow = {
        case: c.id, title: c.title, person: e.person, personLabel: labels[e.person] ?? e.person,
        program: e.program || it?.program || "", programLabel: PROGRAM_LABELS[e.program || it?.program || ""] ?? (e.program || it?.program || ""),
        identifier: e.identifier, resultLabel: it?.name ?? e.identifier, month: e.month,
        expected: e.expect, engine: got, status: ok ? "match" : "differ", source: e.source, notes: e.notes,
        decisive: [], moreDecisive: 0, missing: [], hints: [],
      };
      if (root.error) row.error = root.error;
      if (!ok) {
        const d = decisiveLines(ix, root);
        row.decisive = d.lines;
        row.moreDecisive = d.more;
        if (got === null) {
          row.missing = missingFacts(root).map((n) => ({
            identifier: n.identifier, id: ix.byIdentifier.get(n.identifier)?.id ?? "", name: n.name, person: n.person, month: n.month,
          }));
        }
        row.hints = triage(ix, root, d.lines, e.expect, got, root.error, row.missing, refs);
      }
      rows.push(row);
    }
  }
  return rows;
}

/** A value as the report shows it. */
export function showValue(v: unknown, persons: Record<string, string> = {}): string {
  if (v === null || v === undefined || v === "unknown") return "cannot determine";
  if (v === true) return "yes";
  if (v === false) return "no";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (Array.isArray(v)) {
    if (!v.length) return "(none)";
    if (v.some((x) => x !== null && typeof x === "object")) return `${v.length} record${v.length === 1 ? "" : "s"}`;
    return v.map((x) => showValue(x, persons)).join(", ");
  }
  if (typeof v === "string") {
    if (/^p\d+$/.test(v)) return persons[v] ?? `Person ${v.slice(1)}`;
    return plainValue(v);
  }
  if (typeof v === "object") {
    const r = v as Record<string, unknown>;
    if (typeof r.kind === "string") {
      const n = r.amount ?? r.value;
      return `a ${plainValue(r.kind)} record${typeof n === "number" ? ` of ${showValue(n)}` : ""}`;
    }
    return "(a table)";
  }
  return String(v);
}
