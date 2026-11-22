/* Lists the role page used to show, kept for the places that now hold them:
 * what takes effect (Changes: `ChangeList`, `DocList`, with the stored
 * households each change touches, worked out after the page paints) and the
 * statute-over-rule departures (Law: `Departures`). The role page itself is
 * retired: its content is the Desk's tiles (places/DeskPage.tsx), Figures
 * and Programs. */
import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import type { HouseholdCase } from "../../engine/cases";
import type { ChangeEntry } from "../../changes/types";
import {
  changedBy, changedPhrase, departureSince, documentsTakingEffect, householdCount,
  restingIndex, restingPhrase, restingReady,
} from "../counts";
import type { ChangedResult, StoredResult } from "../questionEffects";
import type { Engine } from "../../engine/engine";
import type { Item, ItemVersion } from "../../engine/types";
import { formatDate, formatValue, personLabel } from "../present";
import { noVersionReason } from "../Present";
import { programLabel, type ChangeEvent } from "../roles";
import { buildHash } from "../router";
import type { ViewContext } from "./context";
import { Cites, ItemLink, itemHref, walkthroughHref } from "./parts";
import "./workflow-views.css";

// ----------------------------------------------------------------- changes

const KIND_TEXT: Record<ChangeEvent["kind"], string> = {
  "new figure": "New figure",
  "figure ends": "No figure from this date",
  "rule starts": "Rule takes effect",
  "rule ends": "Last day of the rule",
};

/** The stored results resting on each item, worked out after the page has
 *  painted (counts.ts `restingIndex`), shared by the lists below. */
export function useResting(engine: Engine, cases: readonly HouseholdCase[]): Map<string, StoredResult[]> | null {
  const ready = restingReady(engine, cases);
  const out = useSignal<Map<string, StoredResult[]> | null>(ready ? restingIndex(engine, cases) : null);
  useEffect(() => {
    if (ready) { out.value = restingIndex(engine, cases); return; }
    const t = setTimeout(() => { out.value = restingIndex(engine, cases); }, 30);
    return () => clearTimeout(t);
  }, [engine, cases, ready]);
  return out.value;
}

/** The change a dated figure made: the item as if the new period had kept the
 *  previous figure. Run against the stored households, the results that
 *  differ are the ones the new figure changes. */
export function undoEntry(e: ChangeEvent, chapter: string): ChangeEntry | null {
  if (e.kind !== "new figure" || !e.previous || !e.version) return null;
  const v = e.version;
  const prev = e.previous;
  const after: Item = {
    ...e.item,
    versions: (e.item.versions ?? []).map((x) => (x.from === v.from ? { ...x, value: prev.value } : x)),
  };
  return { id: e.item.id, chapter, before: e.item, after };
}

/** Works out, one event at a time after the page paints, which stored results
 *  each dated figure change moves. */
export function useWorkedOut(engine: Engine, cases: readonly HouseholdCase[], chapterOf: Record<string, string>, events: ChangeEvent[]) {
  const done = useSignal<Map<string, ChangedResult[]>>(new Map());
  const key = events.map((e) => `${e.item.id}@${e.date}`).join(",");
  useEffect(() => {
    let live = true;
    const map = new Map<string, ChangedResult[]>();
    done.value = map;
    const queue = events.filter((e) => e.kind === "new figure" && e.previous);
    const step = () => {
      if (!live || !queue.length) return;
      const e = queue.shift()!;
      const entry = undoEntry(e, chapterOf[e.item.id] ?? "parameters");
      // The results that differ without the new figure are the ones it changed.
      const ch = entry ? changedBy(engine, cases, [entry]).map((c) => ({ ...c, value: c.after, after: c.value })) : [];
      map.set(`${e.item.id}@${e.date}`, ch);
      done.value = new Map(map);
      setTimeout(step, 0);
    };
    const t = setTimeout(step, 60);
    return () => { live = false; clearTimeout(t); };
  }, [engine, cases, key]);
  return done.value;
}

/** Rule documents taking effect (counts.ts, the one definition). */
export { documentsTakingEffect } from "../counts";

function versionText(it: Item, v: ItemVersion | null | undefined): string {
  if (!v) return "none";
  if (v.value && typeof v.value === "object" && !Array.isArray(v.value)) {
    return `a table of ${Object.keys(v.value).length} rows`;
  }
  return formatValue(it, v.value);
}

function tableDiff(a: unknown, b: unknown): number | null {
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return null;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let n = 0;
  for (const k of keys) {
    if (JSON.stringify((a as Record<string, unknown>)[k]) !== JSON.stringify((b as Record<string, unknown>)[k])) n++;
  }
  return n;
}

export function DocList({ ctx, docs }: { ctx: ViewContext; docs: ReturnType<typeof documentsTakingEffect> }) {
  const { route: r } = ctx;
  if (!docs.length) return null;
  return (
    <ul class="changes docs">
      {docs.map(({ doc, date, programs }) => (
        <li key={doc.id} class="change rule-text">
          <span class="date">{formatDate(date)}</span>{" "}
          <span class="tag">Rule text takes effect</span>{" "}
          <a href={buildHash({ ...r, view: "document", arg: doc.id, params: {} })}>{doc.title}</a>{" "}
          {programs.map((p) => <span key={p} class="tag">{programLabel(p)}</span>)}{" "}
          <small class="mono muted">{doc.id}</small>
        </li>
      ))}
    </ul>
  );
}

export function ChangeList(
  { ctx, events, empty, resting, worked }:
  {
    ctx: ViewContext; events: ChangeEvent[]; empty: string;
    resting: Map<string, StoredResult[]> | null; worked: Map<string, ChangedResult[]>;
  },
) {
  const { engine, vol, route: r } = ctx;
  if (!events.length) return empty ? <p class="muted">{empty}</p> : null;
  return (
    <ul class="changes">
      {events.map((e, i) => {
        const rest = resting ? (resting.get(e.item.identifier) ?? []) : null;
        const touchedIds = rest ? [...new Set(rest.map((x) => x.caseId))] : [];
        const touched = vol.cases.filter((c) => touchedIds.includes(c.id));
        const changed = worked.get(`${e.item.id}@${e.date}`);
        const diff = e.kind === "new figure" ? tableDiff(e.previous?.value, e.version?.value) : null;
        const why = e.kind === "figure ends" ? noVersionReason(e.item, e.date) : null;
        return (
          <li key={`${e.item.id}-${e.kind}-${e.date}-${i}`} class={`change ${e.kind.replace(/ /g, "-")}`}>
            <span class="date">{formatDate(e.date)}</span>{" "}
            <span class="tag">{KIND_TEXT[e.kind]}</span>{" "}
            <ItemLink route={r} item={e.item} />{" "}
            <span class="tag">{programLabel(e.item.program)}</span>
            {e.kind === "new figure" && (
              <div class="fromto">
                {e.previous ? <>{versionText(e.item, e.previous)} → </> : "First figure: "}
                <b>{versionText(e.item, e.version)}</b>
                {diff !== null && <span class="muted"> ({diff === 0 ? "same figures as before" : `${diff} row${diff === 1 ? "" : "s"} differ`})</span>}
              </div>
            )}
            {why && <div class="warn">{why}</div>}
            {(e.kind === "rule starts" || e.kind === "rule ends") && e.item.statute_override && (
              <div class="flag override">{e.item.statute_override}</div>
            )}
            <Cites vol={vol} route={r} item={e.item} sourceIds={e.version?.source ? [e.version.source] : undefined} />
            {e.kind === "new figure" && e.previous && (
              <div class="worked">
                {changed === undefined
                  ? <span class="muted">Working out which stored results the new figure changes…</span>
                  : changed.length === 0
                    ? <span>{changedPhrase(0, 0)} between the old figure and the new.</span>
                    : (
                      <>
                        <b>{changedPhrase(changed.length, householdCount(changed))}</b> between the old figure and the new:
                        <ul class="casechanges">
                          {changed.slice(0, 6).map((c, j) => {
                            const it = engine.item(c.identifier);
                            const hc = vol.cases.find((x) => x.id === c.caseId);
                            return (
                              <li key={j}>
                                <a href={walkthroughHref(r, c.caseId, c.person)} title={hc?.title}>{c.caseId}</a>{" "}
                                {personLabel(c.person)}{c.month ? `, ${formatDate(c.month)}` : ""}:{" "}
                                {it ? <a href={itemHref(r, it)}>{it.name}</a> : c.identifier}{" "}
                                {formatValue(it, c.value)} → <b>{formatValue(it, c.after)}</b>
                              </li>
                            );
                          })}
                          {changed.length > 6 && <li class="muted">and {changed.length - 6} more</li>}
                        </ul>
                      </>
                    )}
              </div>
            )}
            <div class="touches muted">
              {rest === null
                ? "Working out which stored households rest on it…"
                : touched.length === 0
                  ? "No stored household result rests on it."
                  : (
                    <>
                      {restingPhrase(rest.length, touched.length)}:{" "}
                      {touched.slice(0, 8).map((c, j) => (
                        <span key={c.id}>{j > 0 && ", "}<a href={walkthroughHref(r, c.id)} title={c.title}>{c.id}</a></span>
                      ))}
                      {touched.length > 8 && ` and ${touched.length - 8} more`}
                    </>
                  )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// -------------------------------------------------------------- departures

export function Departures({ ctx, items }: { ctx: ViewContext; items: Item[] }) {
  const { vol, route: r } = ctx;
  if (!items.length) {
    return <p class="muted">No item in your programs records a statute governing over the Colorado rule text.</p>;
  }
  return (
    <ul class="departures">
      {items.map((it) => (
        <li key={it.id} class="departure">
          <ItemLink route={r} item={it} /> <span class="tag">{programLabel(it.program)}</span>
          {departureSince(it) && <span class="muted"> since {formatDate(departureSince(it)!)}</span>}
          <p class="flag override">{it.statute_override}</p>
          <Cites vol={vol} route={r} item={it} />
        </li>
      ))}
    </ul>
  );
}
