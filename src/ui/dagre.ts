// @ts-ignore -- the layout only needs the narrow surface declared below, so the
// package's own type shipping is deliberately not depended on.
import dagreModule from "@dagrejs/dagre";

export interface DagreNode { x: number; y: number; width: number; height: number }
export interface DagreEdge { points: Array<{ x: number; y: number }> }
export interface DagreEdgeRef { v: string; w: string }

export interface DagreGraph {
  setGraph(o: Record<string, unknown>): void;
  setDefaultEdgeLabel(fn: () => Record<string, unknown>): void;
  setNode(id: string, o: { width: number; height: number }): void;
  setEdge(a: string, b: string): void;
  node(id: string): DagreNode;
  edge(e: DagreEdgeRef): DagreEdge;
  edges(): DagreEdgeRef[];
  graph(): { width: number; height: number };
}

interface DagreApi {
  graphlib: { Graph: new (opts?: Record<string, unknown>) => DagreGraph };
  layout(g: DagreGraph): void;
}

export const dagre = dagreModule as unknown as DagreApi;
