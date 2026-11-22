/* The Map: what stems from what (docs/design-unified-ui.md, "Map").
 *
 * `<MapView center=... />` embeds a map on another page (the item page's and
 * the program page's "Map" tab); `MapPage` is the standalone route
 * `#/<volume>/map?center=...`, its state in the address so a map can be
 * linked. Both render `MapBody`: the picture on a wide screen (columns left
 * to right, edges drawn between the boxes once they are laid out), the same
 * structure as indented "reads / read by" lists on a phone, a path finder
 * with numbered steps beside the map, and the overlay toggles. All the data
 * comes from ./model.ts and counts.ts. */
import "./map.css";
import { useSignal } from "@preact/signals";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { Engine } from "../../engine/engine";
import type { Item } from "../../engine/types";
import type { LoadedVolume } from "../../ledger/load";
import { approvalStatus } from "../approvals";
import { IdSmall, Prose } from "../kit";
import { mapCounts } from "../counts";
import { formatDate, formatFor, personLabel } from "../present";
import { programLabel } from "../roles";
import { buildHash, type Route } from "../router";
import { changeSetSig, engineSig, route, viewEngine, volumeSig } from "../state";
import { itemHref, walkthroughHref } from "../views/parts";
import {
  buildMap, buildTree, centerParam, clampDepth, defaultState, householdValues, KIND_WORDS,
  moreLabel, nodeKind, OVERLAYS, programComplexity, overlayContext, overlayFlags, pathChoices,
  programOptions, recentred, resolveCenter, stateFromParams, statePath, stateToParams,
  type MapCenter, type MapGroup, type MapModel, type MapNode, type MapState, type OverlayContext,
  type OverlayFlag, type OverlayKey, type TreeGroup, type TreeNode,
} from "./model";

// ---- links

/** The standalone map, centred on an item id, an identifier or
 *  `program:<id>`; `household` adds a stored household's values ("Open in
 *  the Map" from a determination). */
export function mapHref(
  r: Route, center: string,
  opts: { depth?: number; household?: { caseId: string; person?: string | null; month?: string | null } } = {},
): string {
  const s = defaultState(center, clampDepth(opts.depth ?? 1));
  if (opts.household) {
    s.household = { caseId: opts.household.caseId, person: opts.household.person ?? null, month: opts.household.month ?? null };
  }
  return buildHash({ ...r, view: "map", arg: null, params: stateToParams(s) });
}

// ---- the route and the embed

/** `#/<volume>/map?center=CO-191&depth=2`. Changing what is shown replaces
 *  the address; re-centring adds a history entry, so Back returns. */
export function MapPage() {
  const r = route.value;
  const state = stateFromParams(r.params, r.arg);
  const write = (s: MapState, push: boolean) => {
    const hash = buildHash({ ...r, arg: null, params: stateToParams(s) });
    if (push) location.hash = hash;
    else location.replace(hash);
  };
  return (
    <MapBody
      mode="page" state={state}
      set={(s) => write(s, false)}
      recentre={(c) => write(recentred(state, c), true)}
    />
  );
}

export interface MapViewProps {
  /** An item id (CO-191), an identifier, or `program:<id>`. */
  center: string;
  depth?: number;
  household?: { caseId: string; person?: string | null; month?: string | null };
}

/** The map as a tab on another page: its state is its own, and "Open in the
 *  Map" carries it to the standalone page. */
export function MapView({ center, depth = 1, household }: MapViewProps) {
  const init = (): MapState => {
    const s = defaultState(center, clampDepth(depth));
    if (household) s.household = { caseId: household.caseId, person: household.person ?? null, month: household.month ?? null };
    return s;
  };
  const state = useSignal<MapState>(init());
  const key = `${center}|${depth}|${household?.caseId ?? ""}|${household?.person ?? ""}|${household?.month ?? ""}`;
  const last = useRef(key);
  if (last.current !== key) { last.current = key; state.value = init(); }
  return (
    <MapBody
      mode="embed" state={state.value}
      set={(s) => { state.value = s; }}
      recentre={(c) => { state.value = recentred(state.value, c); }}
    />
  );
}

// ---- the body

function useNarrow(): boolean {
  const q = typeof matchMedia === "function" ? matchMedia("(max-width: 700px)") : null;
  const [narrow, setNarrow] = useState(q?.matches ?? false);
  useEffect(() => {
    if (!q) return;
    const on = () => setNarrow(q.matches);
    q.addEventListener?.("change", on);
    return () => q.removeEventListener?.("change", on);
  }, []);
  return narrow;
}

const toggle = (xs: readonly string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

interface Ctx {
  engine: Engine;
  vol: LoadedVolume | null;
  r: Route;
  center: MapCenter;
  state: MapState;
  set: (s: MapState) => void;
  recentre: (c: string) => void;
  overlays: OverlayContext;
  flags: (it: Item | null) => OverlayFlag[];
  values: Map<string, unknown> | null;
  centerProgram: string | null;
}

function MapBody(
  { mode, state, set, recentre }:
  { mode: "page" | "embed"; state: MapState; set: (s: MapState) => void; recentre: (c: string) => void },
) {
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  const r = route.value;
  const narrow = useNarrow();
  if (!engine) return <p class="status">No ledger loaded.</p>;
  const center = resolveCenter(engine, state.center);
  if (!center) {
    return (
      <section class="view mapview" data-mode={mode}>
        {mode === "page" && <h1>Map</h1>}
        {state.center && <p class="status bad">Nothing in this volume is called “{state.center}”.</p>}
        <CenterPicker engine={engine} recentre={recentre} />
      </section>
    );
  }
  const overlays = overlayContext(engine, vol, changeSetSig.value);
  const path = statePath(engine, center, state);
  const base = {
    depth: state.depth,
    expanded: new Set(state.expanded),
    openGroups: new Set(state.open),
    programs: state.programs,
    biggestFirst: state.biggest,
    path,
  };
  // "Awaiting approval" rings a box only while it singles boxes out: when
  // more than half the boxes shown await a signature (a volume still in
  // Draft), it is a count with a note instead of a ring on everything.
  const awaiting = state.overlays.includes("approval") ? awaitingShown(engine, center, base) : null;
  const ringed = awaiting && awaiting.count * 2 > awaiting.of
    ? state.overlays.filter((k) => k !== "approval")
    : state.overlays;
  const flags = (it: Item | null) => (it ? overlayFlags(engine, overlays, it, ringed) : []);
  const opts = {
    ...base,
    flagged: ringed.length ? (id: string) => flags(engine.item(id) ?? null).length > 0 : undefined,
  };
  const hc = state.household ? vol?.cases.find((c) => c.id === state.household!.caseId) : undefined;
  const values = hc && center.type === "item"
    ? householdValues(engine, hc, center.item.identifier, state.household!.person, state.household!.month)
    : null;
  const ctx: Ctx = {
    engine, vol, r, center, state, set, recentre, overlays, flags, values,
    centerProgram: center.type === "item" ? center.item.program : center.program,
  };
  const lists = state.lists ?? narrow;
  const name = center.type === "item" ? center.item.name : programLabel(center.program);
  const model = lists ? null : buildMap(engine, center, opts);
  const hiddenByProgram = model
    ? model.hiddenByProgram.length
    : null;

  return (
    <section class={`view mapview${ringed.length ? " overlaying" : ""}`} data-mode={mode} data-center={centerParam(center)}>
      {mode === "page" ? (
        <div class="viewhead">
          <h1>Map of {name}</h1>
          <p class="purpose">
            What it reads sits on its left, what reads it on its right: facts and figures, then rules, then outcomes.
            Click a box to show its next step.
          </p>
        </div>
      ) : (
        <p class="purpose">
          What it reads sits on its left, what reads it on its right. Click a box to show its next step.{" "}
          <a href={buildHash({ ...r, view: "map", arg: null, params: stateToParams(state) })}>Open in the Map</a>
        </p>
      )}
      {hc && state.household && (
        <p class="map-household">
          Values from the stored household <b>{hc.id}</b>
          {state.household.person ? <>, {personLabel(state.household.person)}</> : null}
          {state.household.month ? <>, {formatDate(state.household.month)}</> : null}.{" "}
          <a href={walkthroughHref(r, hc.id, state.household.person ?? undefined, undefined, { outcome: center.key, month: state.household.month })}>Back to the determination</a>
          {" · "}
          <button class="linkish" onClick={() => set({ ...state, household: null })}>Hide the values</button>
        </p>
      )}
      <Controls ctx={ctx} lists={lists} />
      {awaiting && ringed !== state.overlays && (
        <p class="overlaynote" role="note" data-overlay="approval">
          <span class="tag draft">Awaiting approval</span>{" "}
          <b>{awaiting.count}</b> of the {awaiting.of} boxes shown are waiting for a signature. Most of this volume is
          still in Draft, so they are counted here rather than each ringed.
        </p>
      )}
      <PathFinder ctx={ctx} path={path} />
      <div class={`mapgrid${path.length ? " with-steps" : ""}`}>
        <div class="mapmain">
          {model ? <Picture ctx={ctx} model={model} /> : <Lists ctx={ctx} opts={opts} />}
        </div>
        {path.length > 0 && <PathSteps ctx={ctx} path={path} />}
      </div>
      {hiddenByProgram ? (
        <p class="muted map-hidden">
          {hiddenByProgram} {hiddenByProgram === 1 ? "item" : "items"} in other programs one step away {hiddenByProgram === 1 ? "is" : "are"} hidden by the program filter.
        </p>
      ) : null}
    </section>
  );
}

/** How many of the items a map shows await a signature (approvals.ts
 *  `approvalStatus`), and how many it shows: the centre and every box. */
export function awaitingShown(
  engine: Engine, center: MapCenter, opts: Parameters<typeof buildMap>[2],
): { count: number; of: number } {
  const m = buildMap(engine, center, opts);
  const items = new Map<string, Item>();
  for (const n of m.nodes.values()) if (n.item) items.set(n.item.id, n.item);
  if (center.type === "item") items.set(center.item.id, center.item);
  let count = 0;
  for (const it of items.values()) if (approvalStatus(engine, it).missing.length) count++;
  return { count, of: items.size };
}

// ---- picking a centre

function CenterPicker({ engine, recentre }: { engine: Engine; recentre: (c: string) => void }) {
  const text = useSignal("");
  const items = engine.items();
  const go = () => {
    const t = text.value.trim();
    if (!t) return;
    const hit = items.find((i) => i.name === t || i.id === t || i.identifier === t);
    recentre(hit ? hit.id : t);
  };
  return (
    <div class="map-picker">
      <p>Centre the map on a program:</p>
      <ul class="map-programs">
        {programOptions(engine).filter((p) => p !== "All").map((p) => (
          <li key={p}><button class="btn" onClick={() => recentre(`program:${p}`)}>{programLabel(p)}</button></li>
        ))}
      </ul>
      <label>
        Or on a fact, figure, rule or outcome:{" "}
        <input
          list="map-items" value={text.value} placeholder="Name or CO-number"
          onInput={(e) => { text.value = (e.target as HTMLInputElement).value; }}
          onKeyDown={(e) => { if (e.key === "Enter") go(); }}
        />
      </label>{" "}
      <button class="btn" onClick={go}>Show</button>
      <datalist id="map-items">
        {items.map((i) => <option key={i.id} value={i.name}>{i.id}</option>)}
      </datalist>
    </div>
  );
}

// ---- the controls

function Controls({ ctx, lists }: { ctx: Ctx; lists: boolean }) {
  const { engine, state, set, center } = ctx;
  const all = programOptions(engine);
  const chosen = state.programs ?? all;
  const progSummary = !state.programs ? "All programs" : state.programs.map(programLabel).join(", ") || "None";
  return (
    <div class="controls map-controls">
      <div class="seg" role="group" aria-label="Steps shown each side">
        <span class="seglabel">Steps</span>
        {[1, 2, 3].map((d) => (
          <button key={d} class="btn" aria-pressed={state.depth === d} onClick={() => set({ ...state, depth: d })}>{d}</button>
        ))}
      </div>
      <div class="seg" role="group" aria-label="Show as">
        <button class="btn" aria-pressed={!lists} onClick={() => set({ ...state, lists: false })}>Picture</button>
        <button class="btn" aria-pressed={lists} onClick={() => set({ ...state, lists: true })}>Lists</button>
      </div>
      <details class="mapprogs">
        <summary>Programs: {progSummary}</summary>
        <div class="mapprogs-menu">
          {all.map((p) => (
            <label key={p}>
              <input
                type="checkbox" checked={chosen.includes(p)}
                onChange={() => {
                  const next = toggle(chosen, p);
                  set({ ...state, programs: next.length === all.length ? null : next });
                }}
              /> {programLabel(p)}
            </label>
          ))}
          <button class="btn" onClick={() => set({ ...state, programs: null })}>Show all</button>
        </div>
      </details>
      <label title="Put what has the most facts, figures and rules behind it first">
        <input type="checkbox" checked={state.biggest} onChange={() => set({ ...state, biggest: !state.biggest })} />
        Biggest first
      </label>
      <div class="seg overlays" role="group" aria-label="Overlays">
        <span class="seglabel">Show</span>
        {OVERLAYS.map((o) => (
          <button
            key={o.key} class="btn" aria-pressed={state.overlays.includes(o.key)} title={o.blurb}
            onClick={() => set({ ...state, overlays: toggle(state.overlays, o.key) as OverlayKey[] })}
          >
            <span class={o.badge}>{o.label}</span>
          </button>
        ))}
      </div>
      {center.type === "item" && (
        <a class="map-open" href={itemHref(ctx.r, center.item)}>Open the {KIND_WORDS[center.kind].one}’s page</a>
      )}
    </div>
  );
}

// ---- the path finder

function itemName(engine: Engine, id: string): string {
  return engine.item(id)?.name ?? (id.startsWith("program:") ? programLabel(id.slice(8)) : id);
}

function OptionsByKind({ engine, ids }: { engine: Engine; ids: string[] }) {
  const groups: Array<[string, string[]]> = [];
  for (const id of ids) {
    const it = engine.item(id);
    const k = it ? (it.kind === "supplied" ? "Facts" : it.kind === "parameter" ? "Figures" : "Rules") : "Other";
    const g = groups.find(([x]) => x === k);
    if (g) g[1].push(id); else groups.push([k, [id]]);
  }
  return (
    <>
      {groups.map(([k, xs]) => (
        <optgroup key={k} label={k}>
          {xs.map((id) => <option key={id} value={id}>{itemName(engine, id)}</option>)}
        </optgroup>
      ))}
    </>
  );
}

function PathFinder({ ctx, path }: { ctx: Ctx; path: string[] }) {
  const { engine, center, state, set } = ctx;
  const ch = pathChoices(engine, center, state.to);
  const from = ch.fromFixed ?? state.from;
  const to = ch.toFixed ?? state.to;
  if (!ch.fromFixed && !ch.fromOptions.length && !ch.toOptions.length && !ch.toFixed) return null;
  if (ch.fromFixed && !ch.toOptions.length) {
    return <p class="pathfinder muted">It reaches no outcome, so there is no path to find.</p>;
  }
  const fromWord = (() => {
    const it = from ? engine.item(from) : null;
    return it ? KIND_WORDS[it.kind === "supplied" ? "fact" : it.kind === "parameter" ? "figure" : "rule"].one : "fact";
  })();
  return (
    <div class="pathfinder" role="group" aria-label="Path finder">
      <span>How does</span>
      {ch.fromFixed ? (
        <b>this {fromWord}</b>
      ) : (
        <select
          aria-label="Start from" value={state.from ?? ""} disabled={!ch.fromOptions.length}
          onChange={(e) => set({ ...state, from: (e.target as HTMLSelectElement).value || null })}
        >
          <option value="">{ch.fromOptions.length ? "choose a fact, figure or rule…" : "choose an outcome first"}</option>
          <OptionsByKind engine={engine} ids={ch.fromOptions} />
        </select>
      )}
      <span>reach</span>
      {ch.toFixed ? (
        <b>this outcome</b>
      ) : (
        <select
          aria-label="Outcome" value={state.to ?? ""}
          onChange={(e) => set({ ...state, to: (e.target as HTMLSelectElement).value || null, from: ch.fromFixed ? null : state.from })}
        >
          <option value="">choose an outcome…</option>
          {ch.toOptions.map((id) => <option key={id} value={id}>{itemName(engine, id)}</option>)}
        </select>
      )}
      <span>?</span>
      {(state.from || state.to) && (
        <button class="btn" onClick={() => set({ ...state, from: null, to: null })}>Clear</button>
      )}
      {from && to && !path.length && <span class="muted">It does not reach it.</span>}
    </div>
  );
}

function PathSteps({ ctx, path }: { ctx: Ctx; path: string[] }) {
  const { engine, r } = ctx;
  const steps = path.filter((id) => engine.item(id));
  const first = engine.item(steps[0]);
  const last = engine.item(steps[steps.length - 1]);
  return (
    <aside class="mapsteps" aria-label="The path, step by step">
      <h3>How {first?.name ?? "it"} reaches {last?.name ?? "the outcome"}</h3>
      <p class="muted">{steps.length - 1} {steps.length - 1 === 1 ? "step" : "steps"}, each item read by the next.</p>
      <ol>
        {steps.map((id, i) => {
          const it = engine.item(id)!;
          const kind = nodeKind(engine, it);
          return (
            <li key={id} data-key={id}>
              {i > 0 && <span class="muted steplead">read by </span>}
              <a href={itemHref(r, it)}>{it.name}</a>{" "}
              <span class="tag">{KIND_WORDS[kind].one}</span> <small class="mono muted">{it.id}</small>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

// ---- one box

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function ComplexityLine({ engine, id, max }: { engine: Engine; id: string; max?: number }) {
  const c = mapCounts(engine, id).reads;
  const rules = c.rules + c.outcomes;
  return (
    <div class="mcomplex" title="Everything it reads, directly or through other rules">
      Fed by {plural(c.facts, "fact")} · {plural(c.figures, "figure")} · {plural(rules, "rule")}
      {max ? <span class="mbar" style={{ width: `${Math.max(4, Math.round((c.total / max) * 100))}%` }} /> : null}
    </div>
  );
}

function Flags({ flags }: { flags: OverlayFlag[] }) {
  if (!flags.length) return null;
  return (
    <div class="mflags">
      {flags.map((f) => <span key={f.key} class={f.badge} title={f.detail}>{f.label}</span>)}
    </div>
  );
}

function ValueLine({ ctx, id }: { ctx: Ctx; id: string }) {
  if (!ctx.values || !ctx.values.has(id)) return null;
  const v = ctx.values.get(id);
  return <div class="mvalue">In {ctx.state.household!.caseId}: <b>{v === null || v === undefined ? "unknown" : formatFor(ctx.engine, id, v)}</b></div>;
}

function expandLabel(n: { side: string; next: number; expanded: boolean }, name: string): string {
  if (n.expanded) return `Hide the next step from ${name}`;
  return n.side === "up" ? `Show what ${name} reads` : `Show what reads ${name}`;
}

function nextLabel(n: Pick<MapNode, "expanded" | "side" | "next">): string {
  if (n.expanded) return "▾ Hide the next step";
  if (n.side === "up") return n.next === 1 ? "▸ Show the one it reads" : `▸ Show the ${n.next} it reads`;
  return n.next === 1 ? "▸ Show the one that reads it" : `▸ Show the ${n.next} that read it`;
}

function NodeBox({ ctx, node, max, hover, setHover }: {
  ctx: Ctx; node: MapNode; max?: number; hover: string | null; setHover: (k: string | null) => void;
}) {
  const { engine, state, set, r, recentre } = ctx;
  const it = node.item;
  if (!it) return null;
  const flags = ctx.flags(it);
  const clickable = node.canExpand || node.expanded;
  const onClick = () => set({ ...state, expanded: toggle(state.expanded, node.key) });
  const otherProgram = it.program !== ctx.centerProgram;
  const body = (
    <>
      <span class="mkind">
        {KIND_WORDS[node.kind].title}
        {otherProgram && <> <span class="tag">{programLabel(it.program)}</span></>}
      </span>
      <span class="mname">{it.name} <IdSmall id={it.id} /></span>
      {clickable && <span class="mnext">{nextLabel(node)}</span>}
    </>
  );
  return (
    <div
      class={`mnode k-${node.kind}${node.onPath ? " onpath" : ""}${flags.length ? " flagged" : ""}${hover === node.key ? " hot" : ""}`}
      data-key={node.key} data-id={it.id}
      onMouseEnter={() => setHover(node.key)} onMouseLeave={() => setHover(null)}
      onFocusCapture={() => setHover(node.key)}
    >
      {clickable ? (
        <button class="mmain" aria-expanded={node.expanded} aria-label={`${it.name}: ${expandLabel(node, it.name)}`} onClick={onClick}>{body}</button>
      ) : (
        <div class="mmain">{body}</div>
      )}
      {node.kind === "outcome" && <ComplexityLine engine={engine} id={it.identifier} max={max} />}
      <ValueLine ctx={ctx} id={it.identifier} />
      <Flags flags={flags} />
      <div class="mlinks">
        <button class="linkish" onClick={() => recentre(it.id)}>Centre here</button>
        <a href={itemHref(r, it)}>Open</a>
      </div>
    </div>
  );
}

/** "Colorado Works: basic cash assistance grant amount" -> "Basic cash
 *  assistance grant amount", under the program's own heading. */
function shortName(name: string): string {
  const s = name.replace(/^[^:]+: /, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A program's outcomes at a glance: one bar each, as long as what feeds it
 *  (facts, figures and rules), each a button that centres the map there. */
function Complexity({ ctx }: { ctx: Ctx }) {
  if (ctx.center.type !== "program") return null;
  const rows = programComplexity(ctx.engine, ctx.center.program, ctx.state.biggest);
  const max = Math.max(1, ...rows.map((x) => x.total));
  return (
    <ol class="mcomplexity">
      {rows.map((x) => {
        const it = ctx.engine.item(x.identifier)!;
        return (
          <li key={x.identifier}>
            <button
              class="linkish" onClick={() => ctx.recentre(it.id)}
              title={`Fed by ${plural(x.facts, "fact")}, ${plural(x.figures, "figure")}, ${plural(x.rules, "rule")}. Centre the map here.`}
            >
              {shortName(it.name)}
            </button>
            <span class="mcx-bar" aria-hidden="true"><span style={{ width: `${Math.max(2, Math.round((x.total / max) * 100))}%` }} /></span>
            <span class="mcx-n">{x.facts} · {x.figures} · {x.rules}</span>
          </li>
        );
      })}
    </ol>
  );
}

function CenterBox({ ctx }: { ctx: Ctx }) {
  const { engine, center, r } = ctx;
  if (center.type === "program") {
    return (
      <div class="mnode mcenter k-program" data-key={center.key}>
        <span class="mkind">Program</span>
        <span class="mname">{programLabel(center.program)}</span>
        <p class="mcount">
          Decides {plural(center.outcomes.length, "outcome")}. What feeds each, in facts · figures · rules
          {ctx.state.biggest ? ", biggest first" : ""}:
        </p>
        <Complexity ctx={ctx} />
      </div>
    );
  }
  const it = center.item;
  const c = mapCounts(engine, it.identifier);
  const flags = ctx.flags(it);
  return (
    <div class={`mnode mcenter k-${center.kind}${flags.length ? " flagged" : ""}`} data-key={center.key} data-id={it.id}>
      <span class="mkind">{KIND_WORDS[center.kind].title}</span>
      <span class="mname">{it.name} <IdSmall id={it.id} /></span>
      {it.meaning && <Prose engine={engine} vol={ctx.vol} r={r} text={it.meaning} as="p" class="mmeaning" />}
      <p class="mcount">
        {c.reads.total
          ? <>Reads {c.reads.total}: {plural(c.reads.facts, "fact")}, {plural(c.reads.figures, "figure")}, {plural(c.reads.rules + c.reads.outcomes, "rule")}.</>
          : center.kind === "figure" ? "Set by policy: it reads nothing." : center.kind === "fact" ? "Told to us: it reads nothing." : "Reads nothing."}
        {" "}{c.readBy.total
          ? <>Read by {plural(c.readBy.total, "item")}{c.readBy.outcomes ? <>, reaching {plural(c.readBy.outcomes, "program outcome")}</> : null}.</>
          : "Nothing reads it."}
      </p>
      <ValueLine ctx={ctx} id={it.identifier} />
      <Flags flags={flags} />
      <div class="mlinks"><a href={itemHref(r, it)}>Open its page</a></div>
    </div>
  );
}

function MoreButton({ ctx, group, side }: { ctx: Ctx; group: MapGroup | TreeGroup; side: string }) {
  const { state, set, engine } = ctx;
  const hidden = "hidden" in group && Array.isArray(group.hidden) ? group.hidden.length : (group.hidden as number);
  if (group.open) {
    return (
      <button class="btn mmore" onClick={() => set({ ...state, open: state.open.filter((k) => k !== group.key) })}>
        Show fewer {KIND_WORDS[group.kind].many}
      </button>
    );
  }
  if (!hidden) return null;
  let flagged = 0;
  if (state.overlays.length && Array.isArray(group.hidden)) {
    flagged = (group.hidden as MapNode[]).filter((n) => ctx.flags(n.item).length).length;
  }
  return (
    <button
      class="btn mmore" data-side={side}
      onClick={() => set({ ...state, open: [...state.open, group.key] })}
      aria-label={`${moreLabel(group.kind, hidden)}: show them`}
    >
      {moreLabel(group.kind, hidden)}{flagged ? <span class="muted"> · {flagged} flagged</span> : null}
    </button>
  );
}

// ---- the picture

interface Seg { from: string; to: string; d: string; onPath: boolean }

function Picture({ ctx, model }: { ctx: Ctx; model: MapModel }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [segs, setSegs] = useState<{ w: number; h: number; segs: Seg[] }>({ w: 0, h: 0, segs: [] });
  const [hover, setHover] = useState<string | null>(null);
  const edgeKey = model.edges.map((e) => `${e.from}>${e.to}${e.onPath ? "*" : ""}`).join(",");
  const outcomeMax = Math.max(1, ...[...model.nodes.values()].filter((n) => n.kind === "outcome").map((n) => mapCounts(ctx.engine, n.key).reads.total));

  const measure = () => {
    const el = wrap.current;
    if (!el) return;
    const at = new Map<string, { x: number; y: number; w: number; h: number }>();
    const o = el.getBoundingClientRect();
    for (const n of el.querySelectorAll<HTMLElement>(".mnode[data-key]")) {
      const b = n.getBoundingClientRect();
      at.set(n.dataset.key!, { x: b.left - o.left, y: b.top - o.top, w: b.width, h: b.height });
    }
    const out: Seg[] = [];
    for (const e of model.edges) {
      const a = at.get(e.from);
      const b = at.get(e.to);
      if (!a || !b) continue;
      let d: string;
      if (a.x + a.w <= b.x) {
        const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
        const mx = (x1 + x2) / 2;
        d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      } else if (b.x + b.w <= a.x) {
        // A read that runs backwards (an outcome read by a rule).
        const x1 = a.x, y1 = a.y + a.h / 2, x2 = b.x + b.w, y2 = b.y + b.h / 2;
        const mx = (x1 + x2) / 2;
        d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
      } else {
        // The same column: an arc in the gap on its right.
        const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x + b.w, y2 = b.y + b.h / 2;
        const bend = Math.max(x1, x2) + 18 + Math.min(14, Math.abs(y2 - y1) / 40);
        d = `M${x1},${y1} C${bend},${y1} ${bend},${y2} ${x2},${y2}`;
      }
      out.push({ from: e.from, to: e.to, d, onPath: e.onPath });
    }
    setSegs({ w: el.scrollWidth, h: el.scrollHeight, segs: out });
  };
  useLayoutEffect(measure, [edgeKey, model.columns.map((c) => c.sections.map((g) => g.nodes.length).join("+")).join("|"), ctx.state.overlays.join(), ctx.values ? 1 : 0]);
  useEffect(() => {
    if (typeof ResizeObserver !== "function" || !wrap.current) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, [edgeKey]);

  return (
    <div class="mapcanvas" role="region" aria-label="Map picture" tabIndex={0}>
      <div class="mapcols" ref={wrap}>
        <svg class="mapedges" width={segs.w} height={segs.h} aria-hidden="true">
          {segs.segs.map((s) => (
            <path
              key={`${s.from}>${s.to}`} d={s.d}
              class={`medge${s.onPath ? " onpath" : ""}${hover && (s.from === hover || s.to === hover) ? " hot" : ""}`}
            />
          ))}
        </svg>
        {model.columns.map((col) => (
          <div key={col.key} class={`mapcol c-${col.key}`} data-col={col.key}>
            <h3 class="mcoltitle">{col.title}</h3>
            {col.key === "center" ? <CenterBox ctx={ctx} /> : col.sections.map((sec) => (
              <div key={sec.kind} class="mgroup" data-kind={sec.kind}>
                {col.sections.length > 1 && <p class="mgrouplabel">{KIND_WORDS[sec.kind].many}</p>}
                {sec.nodes.map((n) => <NodeBox key={n.key} ctx={ctx} node={n} max={outcomeMax} hover={hover} setHover={setHover} />)}
                {sec.more.map((g) => <MoreButton key={g.key} ctx={ctx} group={g} side={col.side} />)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- the lists

function TreeRows({ ctx, groups, side }: { ctx: Ctx; groups: TreeGroup[]; side: "up" | "down" }) {
  const { state, set, r, recentre } = ctx;
  return (
    <>
      {groups.map((g) => (
        <li key={g.key} class="tgroup" data-group={g.key}>
          <span class="tgrouplabel">{KIND_WORDS[g.kind].many}</span>
          <ul>
            {g.nodes.map((n) => {
              const it = n.item!;
              const flags = ctx.flags(it);
              const clickable = !n.repeated && (n.canExpand || n.expanded);
              return (
                <li key={n.key} class={`trow k-${n.kind}${n.onPath ? " onpath" : ""}${flags.length ? " flagged" : ""}`} data-key={n.key} data-id={it.id}>
                  <div class="trowhead">
                    {clickable ? (
                      <button class="tmain" aria-expanded={n.expanded} onClick={() => set({ ...state, expanded: toggle(state.expanded, n.key) })}>
                        <span aria-hidden="true">{n.expanded ? "▾" : "▸"}</span> {it.name}
                        <span class="visually-hidden">: {expandLabel({ side, next: 0, expanded: n.expanded }, it.name)}</span>
                      </button>
                    ) : (
                      <span class="tmain">{n.children ? <span aria-hidden="true">▾ </span> : null}{it.name}</span>
                    )}
                    <small class="mono muted">{it.id}</small>
                    {it.program !== ctx.centerProgram && <span class="tag">{programLabel(it.program)}</span>}
                    {n.repeated && <span class="muted"> (listed above)</span>}
                  </div>
                  {n.kind === "outcome" && <ComplexityLine engine={ctx.engine} id={it.identifier} />}
                  <ValueLine ctx={ctx} id={it.identifier} />
                  <Flags flags={flags} />
                  <div class="mlinks">
                    <button class="linkish" onClick={() => recentre(it.id)}>Centre here</button>
                    <a href={itemHref(r, it)}>Open</a>
                  </div>
                  {n.children && <ul class="tchildren"><TreeRows ctx={ctx} groups={n.children} side={side} /></ul>}
                </li>
              );
            })}
          </ul>
          <MoreButton ctx={ctx} group={g} side={side} />
        </li>
      ))}
    </>
  );
}

function Lists({ ctx, opts }: { ctx: Ctx; opts: Parameters<typeof buildMap>[2] }) {
  const { engine, center } = ctx;
  const up = buildTree(engine, center, "up", opts);
  const down = buildTree(engine, center, "down", opts);
  const upTitle = center.type === "program" ? "Outcomes it decides, and what they read" : "It reads";
  return (
    <div class="maplists">
      <CenterBox ctx={ctx} />
      <section class="tside" data-side="up">
        <h3>{upTitle}</h3>
        {up.length ? <ul class="ttree"><TreeRows ctx={ctx} groups={up} side="up" /></ul> : <p class="muted">Nothing: it is told to us, or set by policy.</p>}
      </section>
      {center.type === "item" && (
        <section class="tside" data-side="down">
          <h3>Read by</h3>
          {down.length ? <ul class="ttree"><TreeRows ctx={ctx} groups={down} side="down" /></ul> : <p class="muted">Nothing reads it.</p>}
        </section>
      )}
    </div>
  );
}
