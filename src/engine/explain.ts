import type { LedgerIndex } from "./ledger-index";
import { evaluate, makeCase, type CaseData, type TraceEvent } from "./evaluate";
import { caseToSpec, runCase, type HouseholdCase } from "./cases";
import { block } from "./render";
import type { Item, Scope } from "./types";

/** One resolution the evaluator performed, with the ledger's account of it:
 *  what the fact is, what it resolved to, where the value came from, and, for
 *  a derived fact, the rule in pattern English. `children` are the
 *  resolutions that rule asked for, in evaluation order. */
export interface TraceNode {
  identifier: string; name: string; person: string | null; month: string | null;
  kind: Item["kind"] | "case" | "month"; scope?: Scope;
  value: unknown; origin: TraceEvent["origin"]; error?: string;
  rule: string[] | null;       // pattern-English lines of the derivation (engine block()), null for non-derived
  sources: string[];           // the item's cited S-ids
  children: TraceNode[];       // in evaluation order; a memo hit has children: [] and origin "memo"
  key: string;
  /** This resolution is the one the rule above it chose: the input that
   *  settled every operator it sits inside. Absent when it did not decide,
   *  and on nodes evaluated with no operator between them and their parent. */
  decisive?: boolean;
}

/** One expectation of a household case with the trace behind its value. */
export interface CaseExplanation {
  person: string;
  identifier: string;
  month: string | null;
  expect: unknown;
  root: TraceNode;
}

function ruleOf(ix: LedgerIndex, it: Item | undefined): string[] | null {
  if (!it || it.kind !== "derived") return null;
  try {
    return it.derived ? block(ix, it.derived) : ["(empty)"];
  } catch (e) {
    return ["(invalid: " + (e as Error).message + ")"];
  }
}

function nodeOf(ix: LedgerIndex, e: TraceEvent): TraceNode {
  const it = ix.byIdentifier.get(e.identifier);
  const node: TraceNode = {
    identifier: e.identifier,
    name: it ? it.name : e.identifier,
    person: e.person,
    month: e.month,
    // Decision events are dropped before they reach here, so the kind is
    // always one a node can carry.
    kind: e.kind as TraceNode["kind"],
    value: e.value,
    origin: e.origin,
    rule: ruleOf(ix, it),
    sources: (it && it.sources) ? it.sources.slice() : [],
    children: [],
    key: e.key,
  };
  if (it) node.scope = it.scope;
  if (e.error !== undefined) node.error = e.error;
  if (e.decisive) node.decisive = true;
  return node;
}

/** Evaluates one fact with a trace hook and assembles the tree the hook
 *  reported. Events arrive in post-order (a fact is emitted after everything
 *  its rule asked for), so children are collected under their parent's key
 *  and claimed when that parent's own event arrives. Only one evaluation of a
 *  given key can be open at a time — the evaluator's cycle check guarantees
 *  it — so a later memo hit on the same key claims nothing and stays a leaf. */
export function explain(
  ix: LedgerIndex, c: CaseData, identifier: string,
  person: string | null, month: string | null,
): TraceNode {
  const events: TraceEvent[] = [];
  let thrown: string | null = null;
  try {
    evaluate(ix, c, identifier, person, month, (e) => { events.push(e); });
  } catch (ex) {
    thrown = (ex as Error).message;
  }
  const pending = new Map<string, TraceNode[]>();
  let root: TraceNode | undefined;
  for (const e of events) {
    // Operator decisions are not resolutions: they reach the tree only as the
    // `decisive` mark the evaluator already put on the facts they chose.
    if (e.kind === "decision") continue;
    const node = nodeOf(ix, e);
    const kids = pending.get(e.key);
    if (kids) {
      node.children = kids;
      pending.delete(e.key);
    }
    if (e.parentKey === null) root = node;
    else {
      const list = pending.get(e.parentKey);
      if (list) list.push(node);
      else pending.set(e.parentKey, [node]);
    }
  }
  if (!root) {
    // The root resolution threw before it could be reported (an unknown fact,
    // a missing person or month, a cycle). Whatever was recorded under it is
    // still worth showing.
    const it = ix.byIdentifier.get(identifier);
    const orphans: TraceNode[] = [];
    for (const list of pending.values()) orphans.push(...list);
    const node: TraceNode = {
      identifier,
      name: it ? it.name : identifier,
      person,
      month,
      kind: it
        ? (it.kind === "parameter" ? "parameter"
          : it.scope === "case" ? "case" : it.scope === "month" ? "month" : it.kind)
        : "supplied",
      value: null,
      origin: "missing",
      rule: ruleOf(ix, it),
      sources: (it && it.sources) ? it.sources.slice() : [],
      children: orphans,
      key: identifier,
    };
    if (it) node.scope = it.scope;
    if (thrown !== null) node.error = thrown;
    return node;
  }
  if (thrown !== null && root.error === undefined) root.error = thrown;
  return root;
}

/** Every expectation of a household case with its trace. The expectations are
 *  exactly the ones `runCase` checks, in the same order, so each root explains
 *  one reported result. */
export function explainCase(ix: LedgerIndex, hc: HouseholdCase): CaseExplanation[] {
  const caseData = makeCase(ix, caseToSpec(hc));
  return runCase(ix, hc).results.map((r) => ({
    person: r.person,
    identifier: r.identifier,
    month: r.month,
    expect: r.expect,
    root: explain(ix, caseData, r.identifier, r.person, r.month),
  }));
}

/** The children that decided a node's value: the ones the evaluator marked,
 *  or, when it marked none, all of them — a leaf has nothing to show, and an
 *  operator that chose no single input (a comparison, an `all` that held) was
 *  decided by everything it asked for. */
export function decidedBy(n: TraceNode): TraceNode[] {
  const marked = n.children.filter((k) => k.decisive);
  return marked.length ? marked : n.children;
}

/** The nodes the story tells, in evaluation order: what decided this value,
 *  and, one level further, what decided each decisive derived child — so the
 *  story reads "the outcome because A; A because B and C". */
export function story(node: TraceNode): Array<{ node: TraceNode; depth: number }> {
  const out: Array<{ node: TraceNode; depth: number }> = [];
  for (const k of decidedBy(node)) {
    out.push({ node: k, depth: 0 });
    if (!k.decisive || k.kind !== "derived" || k.origin === "memo") continue;
    for (const g of decidedBy(k)) out.push({ node: g, depth: 1 });
  }
  return out;
}

/** The supplied facts this value's trace never got an answer for: every node
 *  under it (including itself) that is a supplied fact resolved with origin
 *  "missing", deduplicated by identifier (a person-month fact can be asked
 *  for in several months, but the form has one field for it). Used to name
 *  what an unknown outcome is still waiting on. */
export function missingFacts(node: TraceNode): TraceNode[] {
  const out: TraceNode[] = [];
  const seen = new Set<string>();
  const walk = (n: TraceNode): void => {
    if (n.kind === "supplied" && n.origin === "missing" && !seen.has(n.identifier)) {
      seen.add(n.identifier);
      out.push(n);
    }
    for (const k of n.children) walk(k);
  };
  walk(node);
  return out;
}

/** How many lines the story may take before it stops and counts the rest. */
export const STORY_LINES = 12;

/** The story of one value in plain lines, "<name> is <value>", the second
 *  level indented under the child it explains. Long stories stop at
 *  STORY_LINES, the last line saying how many more there were. */
export function narrative(node: TraceNode, fmt: (v: unknown) => string): string[] {
  const lines = story(node).map(
    (s) => (s.depth ? "  " : "") + s.node.name + " is " + fmt(s.node.value),
  );
  if (lines.length <= STORY_LINES) return lines;
  const kept = lines.slice(0, STORY_LINES - 1);
  kept.push("… and " + (lines.length - kept.length) + " more");
  return kept;
}
