import { useSignal } from "@preact/signals";
import type { Engine } from "../engine/engine";
import type { TraceNode } from "../engine/explain";
import { buildHash, type Route } from "./router";

/** What each origin badge means, in the reader's words. */
const ORIGIN_TITLE: Record<string, string> = {
  case: "supplied with the case",
  default: "the value this fact takes in every month not stated",
  parameter: "a parameter of the codex, in force at the determination date",
  evaluated: "computed from the rule below",
  memo: "already computed above in this trace",
  missing: "not supplied, so unknown",
};

/** Depth at which children stop being expanded on first render. A SNAP
 *  36-month window reaches several hundred nodes, so the tree stays folded
 *  and renders a subtree only once the reader opens it. */
const OPEN_TO_DEPTH = 2;

function hasBody(n: TraceNode): boolean {
  return n.origin !== "memo" && (
    n.children.length > 0 || (n.rule !== null && n.rule.length > 0) ||
    n.sources.length > 0 || n.error !== undefined
  );
}

function TraceRow(
  { engine, node, depth, route: r }:
  { engine: Engine; node: TraceNode; depth: number; route: Route },
) {
  const open = useSignal(depth < OPEN_TO_DEPTH);
  const body = hasBody(node);
  const toggle = (e: Event) => {
    e.stopPropagation();
    if (body) open.value = !open.value;
  };
  return (
    <div class="tnode" data-identifier={node.identifier}>
      <div
        class={`thead${body ? " openable" : ""}${node.error !== undefined ? " bad" : ""}`}
        onClick={toggle}
      >
        <span class="twist">{body ? (open.value ? "▾" : "▸") : "·"}</span>
        <span class="tname">{node.name}</span>
        <code>{node.identifier}</code>
        {node.person && <span class="tag">{node.person}</span>}
        {node.month && <span class="tag">{node.month}</span>}
        <span class="tval">{engine.fmt(node.value)}</span>
        <span class={`origin origin-${node.origin}`} title={ORIGIN_TITLE[node.origin]}>
          {node.origin}
        </span>
        {node.origin === "memo" && <span class="muted">see above</span>}
      </div>
      {body && open.value && (
        <div class="tbody">
          {node.error !== undefined && <p class="bad">{node.error}</p>}
          {node.rule && node.rule.length > 0 && (
            <pre class="derivation">{node.rule.join("\n")}</pre>
          )}
          {node.sources.length > 0 && (
            <p class="tsources">
              {node.sources.map((s) => (
                <a
                  key={s} class="tag src"
                  href={buildHash({ ...r, view: "source", arg: s, params: {} })}
                >{s}</a>
              ))}
            </p>
          )}
          {node.children.map((k, i) => (
            <TraceRow key={`${k.key}#${i}`} engine={engine} node={k} depth={depth + 1} route={r} />
          ))}
        </div>
      )}
    </div>
  );
}

/** The derivation of one value: every resolution the evaluator performed,
 *  in evaluation order, with the rule that asked for it. */
export function Trace(
  { engine, node, route: r }: { engine: Engine; node: TraceNode; route: Route },
) {
  return (
    <div class="trace">
      <TraceRow engine={engine} node={node} depth={0} route={r} />
    </div>
  );
}
