/* Changes › What takes effect (docs/design-unified-ui.md): one month at a
 * time, this month by default (Blind B), past and future. Figure versions,
 * rules AND rule documents (the App; counts.ts `changesInMonth`), each with
 * the stored households that read it. "Would change" is shown only once it
 * has been worked out, by "Compare with the previous version" (Blind B's
 * button, Blind A's table). Blind A's household filter keeps only what one
 * stored household reads. Route: `changes?month=YYYY-MM&program=&hh=`. */
import { useEffect, useState } from "preact/hooks";
import type { Engine } from "../../../engine/engine";
import type { HouseholdCase } from "../../../engine/cases";
import type { Item } from "../../../engine/types";
import {
  changedBy, changedPhrase, changedSplit, changeMonths, changesInMonth, changesReadBy, COUNT_DEFINITIONS,
  documentReaders, householdCount, householdsReadingAny, householdsThatRead, itemsCitingDocument, restingIndex,
  restingReady,
  type ChangeEvent, type DocumentChange,
} from "../../counts";
import type { ChangedResult } from "../../questionEffects";
import { formatDate, formatValue } from "../../present";
import { programLabel } from "../../roles";
import { buildHash, type Route } from "../../router";
import { navigate } from "../../state";
import { plainCaseTitle } from "../../walkthrough";
import { withPreviousFigure } from "../../proposal";
import { noVersionReason } from "../../Present";
import { type ViewContext } from "../../views/context";
import { ItemLink } from "../../views/parts";
import { ChangedTable, householdHref } from "./ChangedTable";

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

export function monthName(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Whether the read index (counts.ts `restingIndex`, about a second on the
 *  Colorado volume) is built; it is built after the first paint. */
export function useReadIndex(engine: Engine, cases: readonly HouseholdCase[]): boolean {
  const [ready, setReady] = useState(() => restingReady(engine, cases));
  useEffect(() => {
    if (restingReady(engine, cases)) { setReady(true); return; }
    setReady(false);
    const t = setTimeout(() => { restingIndex(engine, cases); setReady(true); }, 30);
    return () => clearTimeout(t);
  }, [engine, cases]);
  return ready || restingReady(engine, cases);
}

const KIND_TEXT: Record<ChangeEvent["kind"], string> = {
  "new figure": "New figure",
  "figure ends": "No figure from this date",
  "rule starts": "Rule takes effect",
  "rule ends": "Last day of the rule",
};

export function TakesEffect({ ctx }: { ctx: ViewContext }) {
  const { engine, vol, route: r, today } = ctx;
  const thisMonth = today.slice(0, 7);
  const month = /^\d{4}-\d{2}$/.test(r.params.month ?? "") ? r.params.month! : thisMonth;
  const declared = (engine.meta.programs ?? []).map((p) => p.id);
  const program = declared.includes(r.params.program ?? "") ? r.params.program! : "";
  const programs = program ? [program] : null;
  const hh = vol.cases.some((c) => c.id === r.params.hh) ? r.params.hh! : "";
  const changes = changesInMonth(engine, vol, month, programs);
  const months = changeMonths(engine, vol, programs);
  const ready = useReadIndex(engine, vol.cases);

  const set = (patch: Record<string, string>) => {
    const next = { ...r.params, ...patch };
    for (const k of Object.keys(next)) if (!next[k]) delete next[k];
    if (next.month === thisMonth) delete next.month;
    navigate({ params: next });
  };

  const readers = (it: Item) => (ready ? householdsThatRead(engine, vol.cases, it.identifier) : null);
  const docReaders = (d: DocumentChange): { items: number; households: string[] | null } => {
    if (ready) {
      const x = documentReaders(engine, vol.cases, vol.sources, d.doc.id, programs);
      return { items: x.items.length, households: x.households };
    }
    const items = itemsCitingDocument(engine, vol.sources, d.doc.id).filter((it) => !programs || programs.includes(it.program));
    return { items: items.length, households: null };
  };
  // The household filter waits for the read index; until then every change shows.
  const { events, documents, total: shown } = hh && ready
    ? changesReadBy(engine, vol.cases, vol.sources, changes, hh, programs)
    : changes;
  const anyRead = ready ? householdsReadingAny(engine, vol.cases, changes.events.map((e) => e.item.identifier)) : null;

  const options = [...new Set([...months.map((m) => m.month), thisMonth, month])].sort();
  const totalOf = new Map(months.map((m) => [m.month, m.total]));
  const later = months.find((m) => m.month > month);
  const earlier = [...months].reverse().find((m) => m.month < month);

  return (
    <div class="takeseffect">
      <div class="controls monthpick" role="group" aria-label="Which month">
        <button class="btn" onClick={() => set({ month: shiftMonth(month, -1) })} aria-label={`The month before: ${monthName(shiftMonth(month, -1))}`}>‹ Earlier</button>
        <label>
          Month{" "}
          <select value={month} onChange={(e) => set({ month: (e.target as HTMLSelectElement).value })}>
            {options.map((m) => (
              <option key={m} value={m}>
                {monthName(m)} ({totalOf.get(m) ?? 0}){m === thisMonth ? " · this month" : ""}
              </option>
            ))}
          </select>
        </label>
        <button class="btn" onClick={() => set({ month: shiftMonth(month, 1) })} aria-label={`The month after: ${monthName(shiftMonth(month, 1))}`}>Later ›</button>
        <label>
          Program{" "}
          <select value={program} onChange={(e) => set({ program: (e.target as HTMLSelectElement).value })}>
            <option value="">Any program</option>
            {declared.filter((p) => p !== "All").map((p) => <option key={p} value={p}>{programLabel(p)}</option>)}
          </select>
        </label>
        <label>
          Only what household{" "}
          <select value={hh} onChange={(e) => set({ hh: (e.target as HTMLSelectElement).value })}>
            <option value="">any</option>
            {vol.cases.map((c) => <option key={c.id} value={c.id}>{c.id}: {shortTitle(c)}</option>)}
          </select>
          {" "}reads
        </label>
      </div>

      <h2 class="monthhead">
        {monthName(month)}{month === thisMonth ? " (this month)" : ""}: {changes.total} change{changes.total === 1 ? "" : "s"}
        {" "}{month < thisMonth ? "took" : month === thisMonth ? "take" : "will take"} effect
      </h2>
      <p class="summary">
        {anyRead === null
          ? <span class="muted">Working out which stored households read them…</span>
          : <>{anyRead.length} of {vol.cases.length} stored households read at least one of the figures and rules.</>}
        {hh && <> Showing the {shown} that {hh} reads.</>}
      </p>
      <details class="howcounted">
        <summary>How this is counted</summary>
        <p>{COUNT_DEFINITIONS.takesEffect}</p>
        <p>{COUNT_DEFINITIONS.read}</p>
        <p>"Would change" is shown only after you compare: {COUNT_DEFINITIONS.changed.toLowerCase()}</p>
      </details>

      {changes.total === 0 && (
        <p class="empty">
          Nothing {month < thisMonth ? "took" : "takes"} effect in {monthName(month)}.
          {earlier && <> <a href={monthHref(r, earlier.month, thisMonth)}>{monthName(earlier.month)} ({earlier.total})</a></>}
          {later && <> <a href={monthHref(r, later.month, thisMonth)}>{monthName(later.month)} ({later.total})</a></>}
        </p>
      )}
      {changes.total > 0 && shown === 0 && <p class="empty">Nothing that took effect this month is read by {hh}.</p>}

      <ul class="changes tooklist">
        {/* In date order through the month: figures, rules and rule documents together. */}
        {[
          ...events.map((e) => ({ date: e.date, node: (
            <ChangeRow key={`${e.item.id}-${e.kind}-${e.date}`} ctx={ctx} e={e} readers={readers(e.item)} hh={hh} />
          ) })),
          ...documents.map((d) => {
            const dr = docReaders(d);
            return { date: d.date, node: <DocRow key={d.doc.id} ctx={ctx} d={d} items={dr.items} readers={dr.households} hh={hh} /> };
          }),
        ].sort((a, b) => a.date.localeCompare(b.date)).map((x) => x.node)}
      </ul>
    </div>
  );
}

function monthHref(r: Route, month: string, thisMonth: string): string {
  const params = { ...r.params, month };
  if (month === thisMonth) delete (params as Record<string, string>).month;
  return buildHash({ ...r, params });
}

function shortTitle(c: HouseholdCase): string {
  const t = plainCaseTitle(c.title).title;
  return t.length > 48 ? `${t.slice(0, 47).replace(/\s+\S*$/, "")}…` : t;
}

function Readers({ r, cases, ids, hh }: { r: Route; cases: readonly HouseholdCase[]; ids: string[] | null; hh: string }) {
  if (ids === null) return <p class="readers muted">Working out which stored households read it…</p>;
  if (!ids.length) return <p class="readers muted">No stored household reads it.</p>;
  const byId = new Map(cases.map((c) => [c.id, c]));
  const first = ids.slice(0, 10);
  return (
    <p class="readers">
      Read by {ids.length} stored household{ids.length === 1 ? "" : "s"}:{" "}
      {first.map((id, i) => (
        <span key={id}>
          {i > 0 && ", "}
          <a href={householdHref(r, id)} title={byId.get(id)?.title} class={id === hh ? "hl" : ""}>{id}</a>
        </span>
      ))}
      {ids.length > first.length && <> and {ids.length - first.length} more</>}
    </p>
  );
}

function figureText(it: Item, v: unknown): string {
  if (v && typeof v === "object" && !Array.isArray(v)) return `a table of ${Object.keys(v).length} rows`;
  return formatValue(it, v);
}

function rowsDiffer(a: unknown, b: unknown): number | null {
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return null;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let n = 0;
  for (const k of keys) {
    if (JSON.stringify((a as Record<string, unknown>)[k]) !== JSON.stringify((b as Record<string, unknown>)[k])) n++;
  }
  return n;
}

function ChangeRow({ ctx, e, readers, hh }: { ctx: ViewContext; e: ChangeEvent; readers: string[] | null; hh: string }) {
  const { engine, vol, route: r } = ctx;
  const [compared, setCompared] = useState<ChangedResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const same = e.kind === "new figure" && e.previous && JSON.stringify(e.previous.value) === JSON.stringify(e.version?.value);
  const diff = e.kind === "new figure" && e.previous ? rowsDiffer(e.previous.value, e.version?.value) : null;
  const canCompare = e.kind === "new figure" && e.previous && !same && (readers?.length ?? 0) > 0;
  const compare = () => {
    setBusy(true);
    setTimeout(() => {
      const without = withPreviousFigure(e.item, e.date);
      const rows = without
        ? changedBy(engine, vol.cases, [{ id: e.item.id, chapter: vol.chapterOf[e.item.id] ?? "parameters", before: e.item, after: without }])
          // Run without the new figure: the results that differ are the ones it changed.
          .map((c) => ({ ...c, value: c.after, after: c.value }))
        : [];
      setCompared(rows);
      setBusy(false);
    }, 20);
  };
  const why = e.kind === "figure ends" ? noVersionReason(e.item, e.date) : null;
  const split = compared ? changedSplit(engine, compared) : null;
  return (
    <li class={`change took ${e.kind.replace(/ /g, "-")}`} data-item={e.item.id}>
      <div class="tookhead">
        <span class="date">{formatDate(e.date)}</span>
        <span class="tag">{KIND_TEXT[e.kind]}</span>
        <span class="name"><ItemLink route={r} item={e.item} /></span>
        <span class="tag">{programLabel(e.item.program)}</span>
        {e.item.statute_override && <span class="tag fed">Federal law over the Colorado rule</span>}
      </div>
      {e.kind === "new figure" && (
        <p class="fromto">
          {!e.previous
            ? <>First figure: <b>{figureText(e.item, e.version?.value)}</b></>
            : same
              ? <>Same figure as before: {figureText(e.item, e.version?.value)}</>
              : <>{figureText(e.item, e.previous.value)} → <b>{figureText(e.item, e.version?.value)}</b>{diff !== null && <span class="muted"> ({diff} row{diff === 1 ? "" : "s"} differ)</span>}</>}
        </p>
      )}
      {e.kind === "rule starts" && <p class="fromto">The rule is in force from this date.</p>}
      {e.kind === "rule ends" && <p class="fromto">This is the rule's last day in force.</p>}
      {why && <p class="warn">{why}</p>}
      {e.item.statute_override && (e.kind === "rule starts" || e.kind === "rule ends") && <p class="flag override">{e.item.statute_override}</p>}
      <Readers r={r} cases={vol.cases} ids={readers} hh={hh} />
      {canCompare && !compared && (
        <button class="btn small compare" disabled={busy} onClick={compare}>
          {busy ? "Comparing…" : `Compare with the previous version (${readers!.length} household${readers!.length === 1 ? "" : "s"})`}
        </button>
      )}
      {compared && (
        <div class="compared" aria-live="polite">
          <p>
            <b>{changedPhrase(compared.length, householdCount(compared))}</b> between the previous figure and this one
            {split && compared.length > 0 && <> ({split.outcomes.length} outcome{split.outcomes.length === 1 ? "" : "s"}, {split.steps.length} step{split.steps.length === 1 ? "" : "s"} on the way)</>}.
          </p>
          <ChangedTable engine={engine} cases={vol.cases} route={r} rows={compared} before="Previous figure" after="This figure" />
        </div>
      )}
    </li>
  );
}

function DocRow(
  { ctx, d, items, readers, hh }: { ctx: ViewContext; d: DocumentChange; items: number; readers: string[] | null; hh: string },
) {
  const { vol, route: r } = ctx;
  return (
    <li class="change took rule-text" data-doc={d.doc.id}>
      <div class="tookhead">
        <span class="date">{formatDate(d.date)}</span>
        <span class="tag">Rule text takes effect</span>
        <span class="name">
          <a href={buildHash({ ...r, view: "law", arg: `doc/${d.doc.id}`, params: {} })}>{d.doc.title}</a>{" "}
          <small class="mono muted">{d.doc.id}</small>
        </span>
        {d.programs.map((p) => <span key={p} class="tag">{programLabel(p)}</span>)}
      </div>
      <p class="fromto">{items === 1 ? "Cited by 1 rule or figure." : `Cited by ${items} rules and figures.`}</p>
      <Readers r={r} cases={vol.cases} ids={readers} hh={hh} />
    </li>
  );
}
