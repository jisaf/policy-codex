import type { Engine } from "../engine/engine";
import type { Kind, Program } from "../engine/types";
import { dagre } from "./dagre";
import type { Route } from "./router";

export interface GraphOptions {
  includeSupplied: boolean;
  includeParameters: boolean;
  programs: string[];
  focus: string | null;
  coneOnly: boolean;
}

export const ALL_PROGRAMS = ["All", "Medicaid", "SNAP"];

export function defaultGraphOptions(): GraphOptions {
  return {
    includeSupplied: false, includeParameters: false,
    programs: [...ALL_PROGRAMS], focus: null, coneOnly: false,
  };
}

export function readGraphOptions(r: Route): GraphOptions {
  const p = r.params;
  return {
    includeSupplied: p.supplied === "1",
    includeParameters: p.params === "1",
    programs: p.programs ? p.programs.split(",").filter(Boolean) : [...ALL_PROGRAMS],
    focus: p.focus ?? null,
    coneOnly: p.cone === "1",
  };
}

export interface GraphNode {
  identifier: string;
  id: string;
  label: string;
  x: number; y: number; width: number; height: number;
  kind: Kind;
  program: Program;
  implemented: string | null;
  role: string | null;
  relation: "focus" | "upstream" | "downstream" | "none";
}

export interface GraphEdge {
  from: string;
  to: string;
  points: Array<{ x: number; y: number }>;
  relation: "upstream" | "downstream" | "none";
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
}

export function coneOf(engine: Engine, identifier: string): { up: Set<string>; down: Set<string> } {
  const up = new Set<string>();
  const down = new Set<string>();
  const walkUp = (x: string) => {
    for (const y of engine.usesOfItem(x)) if (!up.has(y)) { up.add(y); walkUp(y); }
  };
  const walkDown = (x: string) => {
    for (const y of engine.usedBy(x)) if (!down.has(y)) { down.add(y); walkDown(y); }
  };
  walkUp(identifier);
  walkDown(identifier);
  up.delete(identifier);
  down.delete(identifier);
  return { up, down };
}

const CHAR_W = 6.6;
const NODE_H = 24;

export function layoutGraph(engine: Engine, opts: GraphOptions): GraphLayout {
  const cone = opts.focus ? coneOf(engine, opts.focus) : null;
  const visible = engine.items().filter((it) => {
    if (it.kind === "supplied" && !opts.includeSupplied) return false;
    if (it.kind === "parameter" && !opts.includeParameters) return false;
    if (!opts.programs.includes(it.program)) return false;
    if (opts.coneOnly && cone && opts.focus) {
      return it.identifier === opts.focus || cone.up.has(it.identifier) ||
        cone.down.has(it.identifier);
    }
    return true;
  });
  const ids = new Set(visible.map((i) => i.identifier));

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 10, ranksep: 70, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const it of visible) {
    g.setNode(it.identifier, {
      width: Math.max(90, Math.min(260, it.name.length * CHAR_W + 16)),
      height: NODE_H,
    });
  }
  for (const it of visible) {
    for (const dep of engine.usesOfItem(it.identifier)) {
      if (ids.has(dep)) g.setEdge(dep, it.identifier);
    }
  }
  dagre.layout(g);

  const relationOf = (identifier: string): GraphNode["relation"] => {
    if (!opts.focus) return "none";
    if (identifier === opts.focus) return "focus";
    if (cone!.up.has(identifier)) return "upstream";
    if (cone!.down.has(identifier)) return "downstream";
    return "none";
  };

  const nodes: GraphNode[] = visible.map((it) => {
    const n = g.node(it.identifier);
    return {
      identifier: it.identifier,
      id: it.id,
      label: it.name,
      x: n.x - n.width / 2,
      y: n.y - n.height / 2,
      width: n.width,
      height: n.height,
      kind: it.kind,
      program: it.program,
      implemented: it.implemented ?? null,
      role: it.role ?? null,
      relation: relationOf(it.identifier),
    };
  });

  const edges: GraphEdge[] = g.edges().map((ref) => {
    const upstream = opts.focus
      ? ref.w === opts.focus || (cone!.up.has(ref.v) && cone!.up.has(ref.w)) ||
        (cone!.up.has(ref.v) && ref.w === opts.focus)
      : false;
    const downstream = opts.focus
      ? ref.v === opts.focus || (cone!.down.has(ref.v) && cone!.down.has(ref.w))
      : false;
    return {
      from: ref.v,
      to: ref.w,
      points: g.edge(ref).points,
      relation: upstream ? "upstream" : downstream ? "downstream" : "none",
    };
  });

  const graph = g.graph();
  return { nodes, edges, width: graph.width || 1, height: graph.height || 1 };
}
