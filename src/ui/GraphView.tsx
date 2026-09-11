import { useSignal } from "@preact/signals";
import { buildHash } from "./router";
import { engineSig, navigate, route, viewEngine } from "./state";
import {
  ALL_PROGRAMS, layoutGraph, readGraphOptions, type GraphNode,
} from "./graphLayout";

const FILL: Record<string, string> = {
  All: "var(--all)", Medicaid: "var(--med)", SNAP: "var(--snap)",
};

function strokeOf(n: GraphNode): string {
  if (n.relation === "focus") return "#111";
  if (n.kind === "supplied") return "#999";
  if (n.kind === "parameter") return "#999";
  return n.implemented === "assembly" ? "var(--ok)" : "#233";
}

export function GraphView() {
  const zoom = useSignal(1);
  const engine = viewEngine() ?? engineSig.value;
  const r = route.value;
  if (!engine) return <p class="status">No ledger loaded.</p>;
  const opts = readGraphOptions(r);
  const layout = layoutGraph(engine, opts);
  const focusItem = opts.focus ? engine.item(opts.focus) : undefined;

  const setParam = (key: string, value: string | null) => {
    const params = { ...r.params };
    if (value === null) delete params[key];
    else params[key] = value;
    navigate({ params });
  };
  const toggleProgram = (p: string) => {
    const next = opts.programs.includes(p)
      ? opts.programs.filter((x) => x !== p)
      : [...opts.programs, p];
    setParam("programs", next.length === ALL_PROGRAMS.length ? null : next.join(","));
  };

  return (
    <section class="view">
      <div class="controls">
        <label>
          <input
            type="checkbox" checked={opts.includeSupplied}
            onChange={() => setParam("supplied", opts.includeSupplied ? null : "1")}
          /> supplied facts
        </label>
        <label>
          <input
            type="checkbox" checked={opts.includeParameters}
            onChange={() => setParam("params", opts.includeParameters ? null : "1")}
          /> parameters
        </label>
        {ALL_PROGRAMS.map((p) => (
          <label key={p}>
            <input
              type="checkbox" checked={opts.programs.includes(p)}
              onChange={() => toggleProgram(p)}
            /> {p}
          </label>
        ))}
        <label>
          <input
            type="checkbox" checked={opts.coneOnly}
            onChange={() => setParam("cone", opts.coneOnly ? null : "1")}
          /> selected item's cone only
        </label>
        <button class="btn" onClick={() => { zoom.value = Math.min(3, zoom.value * 1.25); }}>+</button>
        <button class="btn" onClick={() => { zoom.value = Math.max(0.2, zoom.value / 1.25); }}>−</button>
        <button class="btn" onClick={() => { zoom.value = 1; }}>Fit width</button>
        <span class="tag">{layout.nodes.length} nodes, {layout.edges.length} edges</span>
      </div>
      <div class="gwrap">
        <svg
          class="gsvg"
          width="100%"
          height={Math.min(700, layout.height * zoom.value + 20)}
          viewBox={`0 0 ${layout.width / zoom.value} ${layout.height / zoom.value}`}
        >
          {layout.edges.map((e) => (
            <polyline
              key={`${e.from}->${e.to}`}
              class={`edge ${e.relation}`}
              points={e.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
            />
          ))}
          {layout.nodes.map((n) => (
            <g
              key={n.identifier}
              class={`node ${n.relation}`}
              onClick={() => setParam("focus", n.identifier)}
            >
              <rect
                x={n.x} y={n.y} width={n.width} height={n.height} rx="4"
                fill={FILL[n.program] ?? "var(--all)"}
                stroke={strokeOf(n)}
                stroke-width={n.role === "outcome" ? 3 : 1.5}
                stroke-dasharray={n.kind === "supplied" ? "4 3" : n.kind === "parameter" ? "1 3" : undefined}
              />
              <text x={n.x + 8} y={n.y + 16} font-size="11">{n.label}</text>
            </g>
          ))}
        </svg>
        <aside class="gpanel">
          {focusItem ? (
            <>
              <h3>{focusItem.name}</h3>
              <p class="muted">{focusItem.id} · {focusItem.kind} · {focusItem.program}</p>
              <p>{focusItem.meaning}</p>
              <p><b>Uses:</b> {engine.usesOfItem(focusItem.identifier).join(", ") || "nothing"}</p>
              <p><b>Used by:</b> {engine.usedBy(focusItem.identifier).join(", ") || "nothing"}</p>
              <a href={buildHash({ ...r, view: "item", arg: focusItem.id, params: {} })}>
                Open the item card
              </a>
            </>
          ) : (
            <p class="muted">
              Click a node to focus it. Derived facts are shown by default; turn on supplied
              facts and parameters for the full {engine.items().length}-node graph.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
