/* The Map's data (docs/design-unified-ui.md, "Map (what stems from what)").
 *
 * A map is centred on one thing: an item (a fact, a figure, a rule or an
 * outcome) or a program. What the centre reads sits to its left, what reads
 * it to its right, and the columns run facts and figures, then rules, then
 * outcomes. Everything here is plain data built from the engine, so the
 * picture (wide screens) and the indented lists (phones) show the same
 * thing, and the tests pin it against the Colorado volume:
 *
 * - `upstreamSet` / `downstreamSet`: what an item reads, or what reads it,
 *   with each one's distance in steps.
 * - `buildMap`: the columns at a depth, with click-to-expand, groups that
 *   collapse past a limit ("+14 more facts"), the program filter and a
 *   highlighted path kept visible whatever the depth.
 * - `buildTree`: the same as nested "reads / read by" lists.
 * - `findPath` / `pathChoices`: how a fact reaches an outcome, step by step.
 * - overlays: open questions, unverified source, awaiting approval, statute
 *   over rule, changed by my proposal, read from the app's own helpers.
 * - `MapState` and its URL form, so a map can be linked to. */
import type { ChangeSet } from "../../changes/types";
import type { HouseholdCase } from "../../engine/cases";
import { caseToSpec } from "../../engine/cases";
import type { Engine } from "../../engine/engine";
import type { TraceNode } from "../../engine/explain";
import type { Item } from "../../engine/types";
import type { OpenQuestion, Source } from "../../ledger/markdown";
import { approvalStatus } from "../approvals";
import { mapCounts, outcomeIdentifiers, pathToOutcome } from "../counts";
import { volumePrograms } from "../programs";
import { unverifiedIds } from "../provenance";
import { isOpen, questionStatus } from "../questions";

// ---- what each thing is

export type NodeKind = "fact" | "figure" | "rule" | "outcome" | "program";
export type Side = "up" | "center" | "down";

export const KIND_WORDS: Record<NodeKind, { one: string; many: string; title: string }> = {
  fact: { one: "fact", many: "facts", title: "Fact" },
  figure: { one: "figure", many: "figures", title: "Figure" },
  rule: { one: "rule", many: "rules", title: "Rule" },
  outcome: { one: "outcome", many: "outcomes", title: "Outcome" },
  program: { one: "program", many: "programs", title: "Program" },
};

/** A supplied fact is a fact, a parameter a figure, a declared outcome an
 *  outcome, and every other derived item a rule. */
export function nodeKind(engine: Engine, it: Item): NodeKind {
  if (it.kind === "supplied") return "fact";
  if (it.kind === "parameter") return "figure";
  return outcomeIdentifiers(engine).has(it.identifier) ? "outcome" : "rule";
}

/** "+14 more facts", "+1 more rule". */
export function moreLabel(kind: NodeKind, n: number): string {
  return `+${n} more ${n === 1 ? KIND_WORDS[kind].one : KIND_WORDS[kind].many}`;
}

// ---- the centre

export const PROGRAM_PREFIX = "program:";

export type MapCenter =
  | { type: "item"; key: string; item: Item; kind: NodeKind }
  | { type: "program"; key: string; program: string; outcomes: string[] };

/** What a `center` names: an item id (CO-191), an identifier, or a program
 *  (`program:SNAP`, or a bare program id the volume declares). */
export function resolveCenter(engine: Engine, raw: string | null | undefined): MapCenter | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const pid = s.startsWith(PROGRAM_PREFIX) ? s.slice(PROGRAM_PREFIX.length) : s;
  const asItem = s.startsWith(PROGRAM_PREFIX) ? undefined : engine.itemById(s) ?? engine.item(s);
  if (asItem) return { type: "item", key: asItem.identifier, item: asItem, kind: nodeKind(engine, asItem) };
  const decl = (engine.meta.programs ?? []).find((p) => p.id === pid || p.id.toLowerCase() === pid.toLowerCase());
  if (decl) {
    return {
      type: "program", key: PROGRAM_PREFIX + decl.id, program: decl.id,
      outcomes: (decl.outcomes ?? []).filter((o) => engine.item(o)),
    };
  }
  return null;
}

/** The value a link or the URL carries for a centre. */
export function centerParam(c: MapCenter): string {
  return c.type === "item" ? c.item.id : c.key;
}

// ---- reads and read by

function neighbours(engine: Engine, id: string, side: "up" | "down"): string[] {
  if (id.startsWith(PROGRAM_PREFIX)) {
    if (side === "down") return [];
    const c = resolveCenter(engine, id);
    return c?.type === "program" ? c.outcomes : [];
  }
  // Only items: a rule may also read the household's relationships, which
  // are an input of every case, not an item of the ledger.
  return (side === "up" ? engine.usesOfItem(id) : engine.usedBy(id)).filter((x) => engine.item(x));
}

/** Every item reachable from `from` on one side, with its shortest distance
 *  in steps (`from` itself left out), up to `depth` steps. */
export function reachable(
  engine: Engine, from: string, side: "up" | "down",
  opts: { depth?: number; allow?: (identifier: string) => boolean } = {},
): Map<string, number> {
  const depth = opts.depth ?? Infinity;
  const out = new Map<string, number>();
  const seen = new Set([from]);
  let level = [from];
  for (let d = 1; level.length && d <= depth; d++) {
    const next: string[] = [];
    for (const x of level) {
      for (const y of neighbours(engine, x, side)) {
        if (seen.has(y)) continue;
        seen.add(y);
        if (opts.allow && !opts.allow(y)) continue;
        out.set(y, d);
        next.push(y);
      }
    }
    level = next;
  }
  return out;
}

/** What an item reads, directly (1) or through other rules (2, 3, ...). */
export function upstreamSet(engine: Engine, identifier: string, depth = Infinity): Map<string, number> {
  return reachable(engine, identifier, "up", { depth });
}

/** What reads an item, directly (1) or through other rules. */
export function downstreamSet(engine: Engine, identifier: string, depth = Infinity): Map<string, number> {
  return reachable(engine, identifier, "down", { depth });
}

// ---- the path finder

/** The chain by which `from` reaches `to`, `from` first: the shortest one,
 *  and for an outcome the one counts.ts `pathToOutcome` names (it leaves out
 *  a path that runs only through document-verification flags), falling back
 *  to any path. Empty when `from` does not reach `to`. */
export function findPath(engine: Engine, from: string, to: string): string[] {
  if (from === to) return engine.item(from) ? [from] : [];
  if (to.startsWith(PROGRAM_PREFIX)) {
    const c = resolveCenter(engine, to);
    if (c?.type !== "program") return [];
    let best: string[] = [];
    for (const o of c.outcomes) {
      const p = findPath(engine, from, o);
      if (p.length && (!best.length || p.length < best.length)) best = p;
    }
    return best.length ? [...best, to] : [];
  }
  if (outcomeIdentifiers(engine).has(to)) {
    const p = pathToOutcome(engine, to, from);
    if (p.length) return p.reverse();
  }
  const prev = new Map<string, string>();
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const x = queue.shift()!;
    if (x === to) break;
    for (const y of engine.usedBy(x)) {
      if (seen.has(y)) continue;
      seen.add(y);
      prev.set(y, x);
      queue.push(y);
    }
  }
  if (!seen.has(to)) return [];
  const path = [to];
  let c = to;
  while (prev.has(c)) { c = prev.get(c)!; path.push(c); }
  return path.reverse();
}

export interface PathChoices {
  /** The start, when the centre fixes it (an item that is not an outcome). */
  fromFixed: string | null;
  fromOptions: string[];
  /** The end, when the centre fixes it (an outcome). */
  toFixed: string | null;
  toOptions: string[];
}

function byName(engine: Engine) {
  return (a: string, b: string) => (engine.item(a)?.name ?? a).localeCompare(engine.item(b)?.name ?? b);
}

/** What "How does [this fact] reach [this outcome]?" offers for a centre:
 *  an item that is not an outcome starts the path and picks an outcome it
 *  reaches; an outcome ends it and picks a fact, figure or rule it reads; a
 *  program picks one of its outcomes, then what that outcome reads. */
export function pathChoices(engine: Engine, center: MapCenter, to: string | null = null): PathChoices {
  const outcomes = outcomeIdentifiers(engine);
  const readsOf = (id: string) => {
    const kindRank: Record<string, number> = { supplied: 0, parameter: 1, derived: 2 };
    return [...upstreamSet(engine, id).keys()].sort((a, b) =>
      (kindRank[engine.item(a)?.kind ?? "derived"] - kindRank[engine.item(b)?.kind ?? "derived"]) || byName(engine)(a, b));
  };
  if (center.type === "program") {
    const toOptions = center.outcomes;
    const end = to && toOptions.includes(to) ? to : null;
    return { fromFixed: null, fromOptions: end ? readsOf(end) : [], toFixed: null, toOptions };
  }
  const id = center.item.identifier;
  if (center.kind === "outcome") return { fromFixed: null, fromOptions: readsOf(id), toFixed: id, toOptions: [] };
  const program = center.item.program;
  const toOptions = [...downstreamSet(engine, id).keys()].filter((x) => outcomes.has(x)).sort((a, b) => {
    const pa = engine.item(a)?.program === program ? 0 : 1;
    const pb = engine.item(b)?.program === program ? 0 : 1;
    return pa - pb || byName(engine)(a, b);
  });
  return { fromFixed: id, fromOptions: [], toFixed: null, toOptions };
}

// ---- overlays

export type OverlayKey = "questions" | "unverified" | "approval" | "statute" | "proposal";

export interface OverlayDef {
  key: OverlayKey;
  /** The toggle's words. */
  label: string;
  /** The badge's class: the same `.flag` / `.tag` classes the item page,
   *  the inbox and the question queue use. */
  badge: string;
  blurb: string;
}

export const OVERLAYS: OverlayDef[] = [
  { key: "questions", label: "Open questions", badge: "tag qstatus-open", blurb: "Rests on a question not yet answered." },
  { key: "unverified", label: "Unverified source", badge: "flag unverified", blurb: "Cites an excerpt marked unverified: not a quotation of the fetched text." },
  { key: "approval", label: "Awaiting approval", badge: "tag draft", blurb: "A role the approval policy names has not signed yet." },
  { key: "statute", label: "Statute over rule", badge: "flag override", blurb: "Follows a statute over the Colorado rule paragraph it would otherwise follow." },
  { key: "proposal", label: "Changed by my proposal", badge: "tag qstaged-tag", blurb: "Changed by a change staged in this browser, or reads one." },
];

export interface OverlayContext {
  openQuestions: Set<string>;
  unverified: Set<string>;
  /** Items the staged change set adds, edits or deletes. */
  changed: Set<string>;
  /** Items that read a changed item, directly or through other rules. */
  readsChanged: Set<string>;
}

export interface OverlayFlag { key: OverlayKey; label: string; detail: string; badge: string }

export function overlayContext(
  engine: Engine,
  vol: { sources: readonly Source[]; openQuestions: readonly OpenQuestion[] } | null,
  changeSet: Pick<ChangeSet, "entries"> | null,
): OverlayContext {
  const openQuestions = new Set((vol?.openQuestions ?? []).filter((q) => isOpen(questionStatus(q))).map((q) => q.id));
  const changed = new Set<string>();
  for (const e of changeSet?.entries ?? []) {
    for (const it of [e.before, e.after]) if (it) changed.add(it.identifier);
  }
  const readsChanged = new Set<string>();
  for (const id of changed) for (const d of downstreamSet(engine, id).keys()) if (!changed.has(d)) readsChanged.add(d);
  return { openQuestions, unverified: vol ? unverifiedIds(vol.sources) : new Set(), changed, readsChanged };
}

/** The overlay badges an item carries, in OVERLAYS order, only for the keys
 *  turned on. */
export function overlayFlags(
  engine: Engine, ctx: OverlayContext, it: Item, on: readonly OverlayKey[],
): OverlayFlag[] {
  const out: OverlayFlag[] = [];
  const def = (k: OverlayKey) => OVERLAYS.find((o) => o.key === k)!;
  for (const k of on.length ? OVERLAYS.map((o) => o.key).filter((x) => on.includes(x)) : []) {
    if (k === "questions") {
      const qs = (it.open ?? []).filter((q) => ctx.openQuestions.has(q));
      if (qs.length) out.push({ key: k, label: qs.length === 1 ? "Open question" : `${qs.length} open questions`, detail: qs.join(", "), badge: def(k).badge });
    } else if (k === "unverified") {
      const ss = (it.sources ?? []).filter((s) => ctx.unverified.has(s));
      if (ss.length) out.push({ key: k, label: "Unverified source", detail: ss.join(", "), badge: def(k).badge });
    } else if (k === "approval") {
      const a = approvalStatus(engine, it);
      if (a.missing.length) out.push({ key: k, label: "Awaiting approval", detail: `Still to sign: ${a.missing.join(", ")}`, badge: def(k).badge });
    } else if (k === "statute") {
      if (it.statute_override) out.push({ key: k, label: "Statute over rule", detail: it.statute_override, badge: def(k).badge });
    } else if (k === "proposal") {
      if (ctx.changed.has(it.identifier)) out.push({ key: k, label: "Changed by my proposal", detail: "Staged in this browser", badge: def(k).badge });
      else if (ctx.readsChanged.has(it.identifier)) out.push({ key: k, label: "Reads my change", detail: "Reads an item the staged change edits", badge: def(k).badge });
    }
  }
  return out;
}

// ---- the picture: columns

export const DEFAULT_LIMIT = 5;
export const OUTCOME_LIMIT = 8;

export interface MapOptions {
  /** Steps shown on each side of the centre, 1 to 3. */
  depth: number;
  /** Nodes clicked open: their next step is shown whatever the depth. */
  expanded?: ReadonlySet<string>;
  /** Collapsed groups opened ("+14 more facts" clicked), by group key. */
  openGroups?: ReadonlySet<string>;
  /** The programs shown; null or empty for all. The centre always shows. */
  programs?: readonly string[] | null;
  /** Rank nodes by how much feeds them, most first. */
  biggestFirst?: boolean;
  /** A path to keep visible and highlight, start first. */
  path?: readonly string[];
  /** Ranks flagged nodes first (the overlays turned on). */
  flagged?: (identifier: string) => boolean;
  limit?: number;
}

export interface MapNode {
  key: string;
  item: Item | null;
  kind: NodeKind;
  side: Side;
  distance: number;
  column: string;
  /** Clicked open. */
  expanded: boolean;
  /** Its next step on its side is not all shown yet (a click shows it). */
  canExpand: boolean;
  /** How many items that next step holds. */
  next: number;
  onPath: boolean;
}

export interface MapGroup {
  /** `<side>:<distance>:<kind>`: the nodes of one kind at one distance. */
  key: string;
  kind: NodeKind;
  side: "up" | "down";
  distance: number;
  nodes: MapNode[];
  /** Collapsed: not drawn, counted on the group's "+N more" button. */
  hidden: MapNode[];
  open: boolean;
}

/** One kind of node in a column, with the "+N more" buttons that belong
 *  there. */
export interface MapSection { kind: NodeKind; nodes: MapNode[]; more: MapGroup[] }
export interface MapColumn { key: string; side: Side; title: string; sections: MapSection[] }
export interface MapEdge { from: string; to: string; onPath: boolean }

export interface MapModel {
  center: MapCenter;
  centerNode: MapNode;
  /** Left to right. */
  columns: MapColumn[];
  groups: MapGroup[];
  /** `from` is read by `to`. */
  edges: MapEdge[];
  /** Items one step from a shown node, left out by the program filter. */
  hiddenByProgram: string[];
  nodes: Map<string, MapNode>;
}

const KIND_ORDER: NodeKind[] = ["fact", "figure", "rule", "outcome", "program"];

/* Columns. Facts and figures sit leftmost, whatever their distance; rules
 * sit one column per step from the centre, on its left what it reads and on
 * its right what reads it; outcomes downstream come last, rightmost. A
 * program's own outcomes form the column next to it. A rule that reads
 * another rule the same number of steps away shares its column; the edge
 * between them is drawn as an arc. */
function columnTitle(center: MapCenter, key: string): string {
  if (key === "center") return center.type === "program" ? "Program" : "In the centre";
  if (key === "up-ff") return center.type === "program" ? "Facts and figures they read" : "Facts and figures it reads";
  const m = /^(up|down)-(r|o)(\d+)$/.exec(key);
  if (!m) return key;
  const d = Number(m[3]);
  if (m[1] === "up") {
    if (center.type === "program") return d === 1 ? "Outcomes it decides" : d === 2 ? "Rules its outcomes read" : `Rules ${d - 1} steps behind its outcomes`;
    return d === 1 ? "Rules it reads" : `Rules ${d} steps back`;
  }
  if (m[2] === "o") return "Outcomes it reaches";
  return d === 1 ? "Rules that read it" : `Rules ${d} steps on`;
}

function columnOrder(key: string): number {
  if (key === "up-ff") return -10000;
  if (key === "center") return 0;
  const m = /^(up|down)-(r|o)(\d+)$/.exec(key)!;
  const n = Number(m[3]);
  if (m[1] === "up") return -n;
  return m[2] === "o" ? 1000 + n : n;
}

/** Where each path node sits relative to the centre (side and distance). */
function pathPlaces(center: MapCenter, path: readonly string[]): Map<string, { side: "up" | "down"; distance: number }> {
  const out = new Map<string, { side: "up" | "down"; distance: number }>();
  const c = path.indexOf(center.key);
  if (c >= 0) {
    path.forEach((id, i) => {
      if (i < c) out.set(id, { side: "up", distance: c - i });
      else if (i > c) out.set(id, { side: "down", distance: i - c });
    });
  }
  return out;
}

function ranker(engine: Engine, center: MapCenter, opts: MapOptions, forced: ReadonlySet<string>) {
  const declared = center.type === "program" ? center.outcomes : [];
  const size = (id: string) => (engine.item(id) ? mapCounts(engine, id).reads.total : 0);
  return (a: string, b: string): number => {
    const f = (x: string) => (forced.has(x) ? 0 : 1);
    if (f(a) !== f(b)) return f(a) - f(b);
    if (opts.flagged) {
      const g = (x: string) => (opts.flagged!(x) ? 0 : 1);
      if (g(a) !== g(b)) return g(a) - g(b);
    }
    if (opts.biggestFirst) {
      const d = size(b) - size(a);
      if (d) return d;
    }
    const ia = declared.indexOf(a);
    const ib = declared.indexOf(b);
    if (ia >= 0 && ib >= 0 && ia !== ib) return ia - ib;
    return byName(engine)(a, b);
  };
}

/** The map at a depth: columns left to right, groups past `limit` collapsed
 *  into a count, a highlighted path kept visible, other programs filtered
 *  out. Nodes are placed level by level, nearest first, and each is placed
 *  once, at its shortest distance; a collapsed node is not followed. */
export function buildMap(engine: Engine, center: MapCenter, opts: MapOptions): MapModel {
  const depth = Math.max(1, Math.min(9, opts.depth));
  const expanded = opts.expanded ?? new Set<string>();
  const openGroups = opts.openGroups ?? new Set<string>();
  const programs = opts.programs?.length ? new Set(opts.programs) : null;
  const path = opts.path ?? [];
  const forced = new Set(path);
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const allow = (id: string) => {
    if (forced.has(id) || !programs) return true;
    const it = engine.item(id);
    return !it || programs.has(it.program);
  };
  const kindOf = (id: string): NodeKind => {
    const it = engine.item(id);
    return it ? nodeKind(engine, it) : "program";
  };
  const rank = ranker(engine, center, opts, forced);
  const places = pathPlaces(center, path);

  const centerNode: MapNode = {
    key: center.key, item: center.type === "item" ? center.item : null,
    kind: center.type === "item" ? center.kind : "program", side: "center", distance: 0,
    column: "center", expanded: true, canExpand: false, next: 0, onPath: forced.has(center.key),
  };
  const nodes = new Map<string, MapNode>([[center.key, centerNode]]);
  const groups = new Map<string, MapGroup>();
  const hiddenByProgram = new Set<string>();

  for (const side of ["up", "down"] as const) {
    const seen = new Set([center.key]);
    let level = [center.key];
    let d = 0;
    while (level.length) {
      const candidates: string[] = [];
      for (const x of level) {
        const open = d < depth || expanded.has(x);
        for (const y of neighbours(engine, x, side)) {
          if (seen.has(y)) continue;
          // Past the depth, a node that is not clicked open still leads on
          // to the path it lies on.
          if (!open && !(forced.has(y) && places.get(y)?.side === side)) continue;
          if (!allow(y)) { hiddenByProgram.add(y); continue; }
          seen.add(y);
          candidates.push(y);
        }
      }
      candidates.sort(rank);
      const next: string[] = [];
      for (const y of candidates) {
        const kind = kindOf(y);
        const gkey = `${side}:${d + 1}:${kind}`;
        let g = groups.get(gkey);
        if (!g) {
          g = { key: gkey, kind, side, distance: d + 1, nodes: [], hidden: [], open: openGroups.has(gkey) };
          groups.set(gkey, g);
        }
        const node: MapNode = {
          key: y, item: engine.item(y) ?? null, kind, side, distance: d + 1, column: "",
          expanded: expanded.has(y), canExpand: false, next: 0, onPath: forced.has(y),
        };
        const cap = kind === "outcome" ? Math.max(limit, OUTCOME_LIMIT) : limit;
        if (forced.has(y) || g.open || g.nodes.filter((n) => !n.onPath).length < cap) {
          g.nodes.push(node);
          nodes.set(y, node);
          next.push(y);
        } else {
          g.hidden.push(node);
        }
      }
      level = next;
      d++;
    }
  }
  for (const id of nodes.keys()) hiddenByProgram.delete(id);

  // What a click would show: the next step on the node's side that is not
  // on the map yet.
  for (const n of nodes.values()) {
    if (n.side === "center") continue;
    const nb = neighbours(engine, n.key, n.side === "up" ? "up" : "down").filter(allow);
    n.next = nb.length;
    n.canExpand = !n.expanded && nb.some((y) => !nodes.has(y));
  }

  const columnKey = (side: "up" | "down", kind: NodeKind, n: number): string => {
    if (side === "up") return kind === "fact" || kind === "figure" ? "up-ff" : `up-r${n}`;
    return kind === "outcome" ? "down-o1" : `down-r${n}`;
  };
  const colMap = new Map<string, MapColumn>();
  colMap.set("center", { key: "center", side: "center", title: columnTitle(center, "center"), sections: [] });
  const section = (ckey: string, side: Side, kind: NodeKind): MapSection => {
    let col = colMap.get(ckey);
    if (!col) {
      col = { key: ckey, side, title: columnTitle(center, ckey), sections: [] };
      colMap.set(ckey, col);
    }
    let sec = col.sections.find((x) => x.kind === kind);
    if (!sec) { sec = { kind, nodes: [], more: [] }; col.sections.push(sec); }
    return sec;
  };
  for (const g of groups.values()) {
    for (const n of g.nodes) {
      n.column = columnKey(g.side, g.kind, g.distance);
      section(n.column, g.side, g.kind).nodes.push(n);
    }
    if (g.hidden.length || g.open) {
      const ckey = columnKey(g.side, g.kind, g.distance);
      section(ckey, g.side, g.kind).more.push(g);
      for (const h of g.hidden) h.column = ckey;
    }
  }
  for (const col of colMap.values()) col.sections.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  const columns = [...colMap.values()].sort((a, b) => columnOrder(a.key) - columnOrder(b.key));

  const pathEdges = new Set<string>();
  for (let i = 0; i + 1 < path.length; i++) pathEdges.add(`${path[i]}>${path[i + 1]}`);
  const edges: MapEdge[] = [];
  for (const n of nodes.values()) {
    // A program's outcomes all lead to it; their column says so instead.
    if (n.kind === "program") continue;
    for (const r of neighbours(engine, n.key, "up")) {
      if (!nodes.has(r)) continue;
      edges.push({ from: r, to: n.key, onPath: pathEdges.has(`${r}>${n.key}`) });
    }
  }
  return { center, centerNode, columns, groups: [...groups.values()], edges, hiddenByProgram: [...hiddenByProgram], nodes };
}

// ---- the lists: reads / read by

export interface TreeNode {
  key: string;
  item: Item | null;
  kind: NodeKind;
  level: number;
  /** Already shown higher up the list; not followed again. */
  repeated: boolean;
  expanded: boolean;
  canExpand: boolean;
  onPath: boolean;
  /** Shown when the node is within the depth or clicked open. */
  children: TreeGroup[] | null;
}

export interface TreeGroup { key: string; kind: NodeKind; nodes: TreeNode[]; hidden: number; open: boolean }

const TREE_KIND_ORDER: NodeKind[] = ["outcome", "rule", "figure", "fact", "program"];

/** One side of the centre as nested lists: each item's reads (or readers)
 *  indented under it, grouped by kind and collapsed past `limit` exactly as
 *  the picture's groups are, followed to the depth and wherever clicked
 *  open. An item already listed above is shown again but not followed. */
export function buildTree(engine: Engine, center: MapCenter, side: "up" | "down", opts: MapOptions): TreeGroup[] {
  const depth = Math.max(1, Math.min(9, opts.depth));
  const expanded = opts.expanded ?? new Set<string>();
  const openGroups = opts.openGroups ?? new Set<string>();
  const programs = opts.programs?.length ? new Set(opts.programs) : null;
  const forced = new Set(opts.path ?? []);
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const allow = (id: string) => {
    if (forced.has(id) || !programs) return true;
    const it = engine.item(id);
    return !it || programs.has(it.program);
  };
  const rank = ranker(engine, center, opts, forced);
  const placed = new Set([center.key]);

  const childrenOf = (parent: string, level: number): TreeGroup[] => {
    const ids = neighbours(engine, parent, side).filter(allow).sort(rank);
    const byKind = new Map<NodeKind, string[]>();
    for (const id of ids) {
      const it = engine.item(id);
      const k = it ? nodeKind(engine, it) : "program";
      byKind.set(k, [...(byKind.get(k) ?? []), id]);
    }
    const out: TreeGroup[] = [];
    for (const kind of TREE_KIND_ORDER) {
      const list = byKind.get(kind);
      if (!list) continue;
      const key = `t:${side}:${parent}:${kind}`;
      const open = openGroups.has(key);
      const cap = kind === "outcome" ? Math.max(limit, OUTCOME_LIMIT) : limit;
      const shown = list.filter((id, i) => open || forced.has(id) || i < cap);
      out.push({
        key, kind, open, hidden: list.length - shown.length,
        nodes: shown.map((id) => ({
          key: id, item: engine.item(id) ?? null, kind, level, repeated: false,
          expanded: expanded.has(id), canExpand: false, onPath: forced.has(id), children: null,
        })),
      });
    }
    return out;
  };

  // Breadth first, so an item is followed where it is nearest the centre.
  const top = childrenOf(center.key, 1);
  let frontier: TreeNode[] = top.flatMap((g) => g.nodes);
  while (frontier.length) {
    const next: TreeNode[] = [];
    for (const n of frontier) {
      if (placed.has(n.key)) { n.repeated = true; continue; }
      placed.add(n.key);
      const hasNext = neighbours(engine, n.key, side).some(allow);
      const leadsOn = [...forced].some((f) => neighbours(engine, n.key, side).includes(f));
      if (n.level < depth || n.expanded || (leadsOn && n.onPath)) {
        n.children = childrenOf(n.key, n.level + 1);
        if (!n.children.length) n.children = null;
        next.push(...(n.children ?? []).flatMap((g) => g.nodes));
      } else {
        n.canExpand = hasNext;
      }
    }
    frontier = next;
  }
  return top;
}

// ---- complexity at a glance

export interface OutcomeComplexity { identifier: string; facts: number; figures: number; rules: number; total: number }

/** For a program: each outcome with how many facts, figures and rules feed
 *  it (counts.ts `mapCounts`), in declared order or biggest first. */
export function programComplexity(engine: Engine, program: string, biggestFirst = false): OutcomeComplexity[] {
  const c = resolveCenter(engine, PROGRAM_PREFIX + program);
  if (c?.type !== "program") return [];
  const rows = c.outcomes.map((o) => {
    const r = mapCounts(engine, o).reads;
    return { identifier: o, facts: r.facts, figures: r.figures, rules: r.rules + r.outcomes, total: r.total };
  });
  return biggestFirst ? [...rows].sort((a, b) => b.total - a.total) : rows;
}

/** The program filter's choices: the volume's own programs. */
export function programOptions(engine: Engine): string[] {
  return volumePrograms(engine);
}

// ---- a stored household's values

/** The values a stored household's trace gives each item behind `identifier`
 *  for one person and month ("Open in the Map" from a determination). */
export function householdValues(
  engine: Engine, hc: HouseholdCase, identifier: string, person: string | null, month: string | null,
): Map<string, unknown> {
  const out = new Map<string, unknown>();
  let root: TraceNode;
  try {
    root = engine.explain(caseToSpec(hc), identifier, person, month);
  } catch {
    return out;
  }
  // The person's own value (or the household's) first; another person's
  // only when it is the only one the trace has.
  const own = new Set<string>();
  const walk = (n: TraceNode) => {
    const mine = !n.person || n.person === person;
    if (!out.has(n.identifier) || (mine && !own.has(n.identifier))) {
      out.set(n.identifier, n.value);
      if (mine) own.add(n.identifier);
    }
    for (const k of n.children) walk(k);
  };
  walk(root);
  return out;
}

// ---- state and its URL

export interface MapState {
  center: string;
  depth: number;
  expanded: string[];
  open: string[];
  /** Null: every program. */
  programs: string[] | null;
  overlays: OverlayKey[];
  biggest: boolean;
  from: string | null;
  to: string | null;
  /** Null: lists on a narrow screen, the picture on a wide one. */
  lists: boolean | null;
  household: { caseId: string; person: string | null; month: string | null } | null;
}

export function defaultState(center: string, depth = 1): MapState {
  return {
    center, depth, expanded: [], open: [], programs: null, overlays: [], biggest: false,
    from: null, to: null, lists: null, household: null,
  };
}

const list = (s: string | undefined) => (s ? s.split(",").filter(Boolean) : []);

export function clampDepth(n: number): number {
  return Number.isFinite(n) ? Math.max(1, Math.min(3, Math.round(n))) : 1;
}

/** The map's state from the address bar (`#/co/map?center=CO-191&depth=2`). */
export function stateFromParams(params: Record<string, string>, arg: string | null = null): MapState {
  const s = defaultState(params.center ?? arg ?? "", clampDepth(Number(params.depth ?? 1)));
  s.expanded = list(params.expand);
  s.open = list(params.open);
  s.programs = params.programs ? list(params.programs) : null;
  s.overlays = list(params.overlays).filter((k): k is OverlayKey => OVERLAYS.some((o) => o.key === k));
  s.biggest = params.biggest === "1";
  s.from = params.from || null;
  s.to = params.to || null;
  s.lists = params.lists === "1" ? true : params.lists === "0" ? false : null;
  s.household = params.case ? { caseId: params.case, person: params.person || null, month: params.month || null } : null;
  return s;
}

export function stateToParams(s: MapState): Record<string, string> {
  const p: Record<string, string> = {};
  if (s.center) p.center = s.center;
  if (s.depth !== 1) p.depth = String(s.depth);
  if (s.expanded.length) p.expand = s.expanded.join(",");
  if (s.open.length) p.open = s.open.join(",");
  if (s.programs) p.programs = s.programs.join(",");
  if (s.overlays.length) p.overlays = s.overlays.join(",");
  if (s.biggest) p.biggest = "1";
  if (s.from) p.from = s.from;
  if (s.to) p.to = s.to;
  if (s.lists !== null) p.lists = s.lists ? "1" : "0";
  if (s.household) {
    p.case = s.household.caseId;
    if (s.household.person) p.person = s.household.person;
    if (s.household.month) p.month = s.household.month;
  }
  return p;
}

/** Re-centring keeps how the reader reads (depth, programs, overlays, the
 *  picture or the lists) and drops what belonged to the old centre. */
export function recentred(s: MapState, center: string): MapState {
  return { ...s, center, expanded: [], open: [], from: null, to: null, household: null };
}

/** The identifiers on the path the state asks for, start first. */
export function statePath(engine: Engine, center: MapCenter, s: Pick<MapState, "from" | "to">): string[] {
  const ch = pathChoices(engine, center, s.to);
  const from = ch.fromFixed ?? s.from;
  const to = ch.toFixed ?? s.to;
  if (!from || !to) return [];
  const f = engine.itemById(from)?.identifier ?? from;
  const t = engine.itemById(to)?.identifier ?? to;
  const p = findPath(engine, f, t);
  // A program's map shows the path up to the outcome, then the program.
  return center.type === "program" && p.length ? [...p, center.key] : p;
}
