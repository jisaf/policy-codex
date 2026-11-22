import { useSignal } from "@preact/signals";
import type { Engine } from "../engine/engine";
import { narrativeLines, type NarrativeLine, type TraceNode } from "../engine/explain";
import { formatDate, formatFor, personLabel } from "./present";
import { unverifiedIds, unverifiedInTrace } from "./provenance";
import { Ident, Rich } from "./Rich";
import { buildHash, type Route } from "./router";
import { volumeSig } from "./state";

/** What each origin badge means, in the reader's words. */
const ORIGIN_TITLE: Record<string, string> = {
  case: "supplied with the case",
  default: "the value this fact takes in every month not stated",
  parameter: "a parameter of the codex, in force at the determination date",
  evaluated: "computed from the rule below",
  memo: "already computed above in this trace",
  missing: "not supplied, so unknown",
  "not-in-force": "outside its effective range on this date, so unknown",
  "no-version": "no version of this parameter is in force on this date, so unknown",
};

/** The badge's own words: where the value came from, plainly. */
const ORIGIN_LABEL: Record<string, string> = {
  case: "given",
  default: "given for every month",
  parameter: "policy figure",
  evaluated: "worked out",
  memo: "worked out above",
  missing: "not given",
  "not-in-force": "not in force",
  "no-version": "no figure in force",
};

/** Depth at which children stop being expanded on first render. A SNAP
 *  36-month window reaches several hundred nodes, so the tree stays folded
 *  and renders a subtree only once the reader opens it. */
const OPEN_TO_DEPTH = 2;

/** A trace value in words: money in cents, options as labels, rates as
 *  percentages (src/ui/present.ts). */
export function traceValue(engine: Engine, n: Pick<TraceNode, "identifier" | "value">): string {
  return formatFor(engine, n.identifier, n.value);
}

/** The narrative the trace tells (src/engine/explain.ts `narrativeLines`):
 *  every line names its person, values read in words, and the
 *  "Statute over rule:" notes close it. */
export function traceNarrative(engine: Engine, node: TraceNode): NarrativeLine[] {
  return narrativeLines(node, (_v, n) => traceValue(engine, n), { person: personLabel });
}

function hasBody(n: TraceNode): boolean {
  return n.origin !== "memo" && (
    n.children.length > 0 || (n.rule !== null && n.rule.length > 0) ||
    n.sources.length > 0 || n.error !== undefined || (n.warnings?.length ?? 0) > 0
  );
}

function TraceRow(
  { engine, node, depth, route: r, unverified }:
  { engine: Engine; node: TraceNode; depth: number; route: Route; unverified: ReadonlySet<string> },
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
        class={`thead${body ? " openable" : ""}${node.error !== undefined ? " bad" : ""}` +
          `${node.decisive ? " decisive" : ""}`}
        onClick={toggle}
      >
        <span class="twist">{body ? (open.value ? "▾" : "▸") : "·"}</span>
        {node.decisive && (
          <span class="tmark" title="this is what decided the value above">★</span>
        )}
        <span class="tname">{node.name}</span>
        <code><Ident id={node.identifier} engine={engine} /></code>
        {node.person && <span class="tag person">{personLabel(node.person)}</span>}
        {node.month && <span class="tag">{formatDate(node.month)}</span>}
        <span class="tval">{traceValue(engine, node)}</span>
        <span class={`origin origin-${node.origin}`} title={ORIGIN_TITLE[node.origin]}>
          {ORIGIN_LABEL[node.origin] ?? node.origin}
        </span>
        {node.override && <span class="flag override" title={node.override}>statute over rule</span>}
        {node.sources.some((s) => unverified.has(s)) && (
          <span class="flag unverified" title="cites an excerpt that is not a verified quotation">unverified source</span>
        )}
      </div>
      {body && open.value && (
        <div class="tbody">
          {node.error !== undefined && <p class="bad">{node.error}</p>}
          {node.warnings?.map((w) => <p class="warn">{w}</p>)}
          {node.override && <p class="override-note"><span class="flag override">Statute over rule</span> {node.override}</p>}
          {node.rule && node.rule.length > 0 && (
            <Rich engine={engine} text={node.rule.join("\n")} mode="expr" class="derivation" />
          )}
          {node.sources.length > 0 && (
            <p class="tsources">
              {node.sources.map((s) => (
                <a
                  key={s} class={`tag src${unverified.has(s) ? " unverified" : ""}`}
                  title={unverified.has(s) ? "Unverified: not a quotation" : undefined}
                  href={buildHash({ ...r, view: "source", arg: s, params: { excerpt: s } })}
                >{s}</a>
              ))}
            </p>
          )}
          {node.children.map((k, i) => (
            <TraceRow
              key={`${k.key}#${i}`} engine={engine} node={k} depth={depth + 1} route={r}
              unverified={unverified}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** The notes under a story: every statute-over-rule departure it rests on,
 *  and every unverified excerpt anything in the trace cites. */
function TraceNotes(
  { engine, lines, node, unverified }:
  { engine: Engine; lines: NarrativeLine[]; node: TraceNode; unverified: ReadonlySet<string> },
) {
  const overrides = lines.filter((l) => l.kind === "override");
  const unv = unverifiedInTrace(node, unverified);
  if (!overrides.length && !unv.length) return null;
  return (
    <ul class="notes">
      {overrides.map((l) => (
        <li key={l.text} class="override-line">
          <span class="flag override">Statute over rule</span> {l.text.replace(/^Statute over rule: /, "")}
        </li>
      ))}
      {unv.length > 0 && (
        <li class="unverified-line">
          <span class="flag unverified">Unverified source</span> This result depends on
          {unv.length === 1 ? " a figure or rule" : ` ${unv.length} figures or rules`} citing an
          excerpt that is not a verified quotation:{" "}
          {unv.map((u, i) => (
            <span key={u.identifier}>
              {i > 0 && "; "}
              <Ident id={u.identifier} label={u.name} engine={engine} /> ({u.sources.join(", ")})
            </span>
          ))}.
        </li>
      )}
    </ul>
  );
}

/** The derivation of one value: the story of what decided it first, and
 *  behind "Show everything" the whole tree — every resolution the evaluator
 *  performed, in evaluation order, with the rule that asked for it. A value
 *  nothing was asked for has no story, so it is shown as the tree alone. */
export function Trace(
  { engine, node, route: r }: { engine: Engine; node: TraceNode; route: Route },
) {
  const all = useSignal(false);
  const vol = volumeSig.value;
  const unverified = vol ? unverifiedIds(vol.sources) : new Set<string>();
  const lines = traceNarrative(engine, node);
  const story = lines.filter((l) => l.kind !== "override");
  if (!story.length) {
    return (
      <div class="trace">
        <TraceNotes engine={engine} lines={lines} node={node} unverified={unverified} />
        <TraceRow engine={engine} node={node} depth={0} route={r} unverified={unverified} />
      </div>
    );
  }
  return (
    <div class="trace">
      <p class="storyhead">
        {node.person && <span class="who">{personLabel(node.person)}: </span>}
        <span class="tname">{node.name}</span>{" is "}
        <span class="tval">{traceValue(engine, node)}</span>{" because:"}
      </p>
      <ul class="story">
        {story.map((l, i) => (l.kind === "more" || !l.node
          ? <li key={`more#${i}`} class="muted">{l.text}</li>
          : (
            <li key={`${l.node.key}#${i}`} class={l.depth ? "sub" : undefined}>
              {l.node.person && <span class="who">{personLabel(l.node.person)}: </span>}
              <Ident id={l.node.identifier} label={l.node.name} engine={engine} />{" is "}
              <span class="tval">{traceValue(engine, l.node)}</span>
              {l.node.month && <span class="tag">{formatDate(l.node.month)}</span>}
            </li>
          )))}
      </ul>
      <TraceNotes engine={engine} lines={lines} node={node} unverified={unverified} />
      <button
        type="button" class="showall"
        onClick={() => { all.value = !all.value; }}
      >{all.value ? "Hide everything" : "Show everything"}</button>
      {all.value && <TraceRow engine={engine} node={node} depth={0} route={r} unverified={unverified} />}
    </div>
  );
}
