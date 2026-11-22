/* A figure's page sections (docs/design-unified-ui.md, Item § 4): the
 * figure in force today (with the dollar table for a share of the poverty
 * level), then figures over time: a dated bar with today, the gap message,
 * and each version beside the excerpt it was taken from with its numbers
 * marked. The history the item records (a legislative freeze, a corrected
 * figure) is shown here, not under a fold. */
import type { Engine } from "../../engine/engine";
import type { Item, ItemVersion } from "../../engine/types";
import { paramInForce } from "../../engine/versions";
import type { LoadedVolume } from "../../ledger/load";
import { FplFigures, noVersionReason, Value } from "../Present";
import { formatCell, formatDate, formatValue, tableRows } from "../present";
import type { Route } from "../router";
import { Excerpt } from "./Law";
import {
  figureGaps, figureTimeline, figureVersions, markNumbers, numberNeedles, type FigureVersion,
} from "./model";
import { Prose } from "./Prose";

const CANNOT = "a household determined then gets “cannot determine”";

/** "July 1, 2026 until July 1, 2028", "from June 30, 2022 on". */
function span(v: ItemVersion): string {
  return v.to ? `${formatDate(v.from)} until ${formatDate(v.to)}` : `From ${formatDate(v.from)} on`;
}

/** The figure in force on `date`, large, with what a reader needs beside it. */
export function FigureToday({ engine, item, date }: { engine: Engine; item: Item; date: string }) {
  const versioned = Array.isArray(item.versions);
  const value = versioned ? paramInForce(item, date) : engine.paramValue(item);
  const reason = noVersionReason(item, date);
  const isTable = value !== null && typeof value === "object";
  return (
    <section class="isec figure-today" aria-labelledby="today-h">
      <h2 id="today-h">The figure on {formatDate(date)}</h2>
      {versioned && !item.versions!.length && (
        <p class="warnbox"><b>No figure loaded.</b> The State sets this figure but no version has been published where it could be fetched, so {CANNOT}.</p>
      )}
      {reason && item.versions!.length > 0 && <p class="warnbox no-version">{reason} Until one is published, {CANNOT}.</p>}
      {value !== null && value !== undefined && (
        isTable
          ? <Value item={item} value={value} />
          : <p class="bigvalue">{formatValue(item, value)}</p>
      )}
      {!versioned && <p class="muted small">One value for all time: the rule states it without dates.</p>}
      <div class="scrollx"><FplFigures engine={engine} item={item} value={value} asOf={date} /></div>
    </section>
  );
}

function Bar({ item, date }: { item: Item; date: string }) {
  const t = figureTimeline(item, date);
  if (!t) return null;
  const said = t.segments.map((s) => `${s.label} ${formatDate(s.from)} to ${formatDate(s.to)}`).join("; ");
  return (
    <div class="tlbar" role="img" aria-label={`Versions over time: ${said}. Today is ${formatDate(date)}.`}>
      {t.segments.map((s) => (
        <div key={s.from} class={`seg ${s.kind}`} style={{ width: `${s.width}%` }} title={`${formatDate(s.from)} to ${formatDate(s.to)}: ${s.label}`}>
          <span class="seglabel">{s.label}</span>
          <small>{s.from.slice(0, 7)}</small>
        </div>
      ))}
      <div class="today" style={{ left: `${t.today}%` }}><span>today</span></div>
    </div>
  );
}

/** For a table: every row across the versions, a changed cell marked. */
function TableAcross({ item, versions }: { item: Item; versions: FigureVersion[] }) {
  const first = tableRows(item, versions[versions.length - 1].version.value);
  if (!first) return null;
  const keys: string[] = [];
  for (const v of versions) for (const r of tableRows(item, v.version.value)?.rows ?? []) if (!keys.includes(r.key)) keys.push(r.key);
  const cell = (v: ItemVersion, k: string) => (v.value as Record<string, unknown>)?.[k];
  return (
    <div class="scrollx">
      <table class="grid across">
        <caption class="muted small">Every row, version by version. A shaded cell changed from the version before.</caption>
        <thead>
          <tr><th scope="col">{first.keyLabel}</th>{versions.map((v) => <th key={v.version.from} scope="col">{formatDate(v.version.from)}</th>)}</tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              {versions.map((v, i) => {
                const cur = cell(v.version, k);
                const changed = i > 0 && JSON.stringify(cur) !== JSON.stringify(cell(versions[i - 1].version, k));
                return <td key={v.version.from} class={changed ? "chg" : ""}>{cur === undefined ? "—" : formatCell(item, cur)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VersionCard(
  { vol, route: r, item, v }: { vol: LoadedVolume; route: Route; item: Item; v: FigureVersion },
) {
  const src = v.version.source ? vol.sources.find((s) => s.id === v.version.source) : undefined;
  const marked = src ? markNumbers(src.text, numberNeedles(item, v.version.value)) : null;
  const isTable = v.version.value !== null && typeof v.version.value === "object";
  const carried = v.same && marked && marked.found === 0;
  return (
    <article class={`fversion${v.current ? " current" : ""}${v.future ? " future" : ""}`} data-from={v.version.from}>
      <header>
        <h3>{span(v.version)}</h3>
        {v.current && <span class="ipill ok">In force today</span>}
        {v.future && <span class="ipill">Not yet in force</span>}
        {v.same && <span class="ipill freeze">Same figures as the version before</span>}
      </header>
      {v.same && src && (
        <p class="why"><b>Why the same:</b> {src.title}.</p>
      )}
      <div class="vgrid">
        <div class="vvalue">
          {isTable
            ? <p>{tableRows(item, v.version.value)?.rows.length ?? 0} rows{v.same ? ", the same as the version before" : ""}: see the table above.</p>
            : <p class="bigvalue">{formatValue(item, v.version.value)}</p>}
          {!v.same && v.previous && !isTable && <p class="muted small">Was {formatValue(item, v.previous.value)}.</p>}
          {marked && marked.total > 0 && (
            carried
              ? <p class="ipill warn">The excerpt states no figures: it carries the previous ones forward.</p>
              : <p class={`ipill ${marked.found === marked.total ? "ok" : marked.found ? "warn" : "bad"}`}>
                {marked.found} of {marked.total} number{marked.total === 1 ? "" : "s"} found in the excerpt
              </p>
          )}
          {!src && <p class="ipill bad">No excerpt on this version</p>}
        </div>
        <div class="vsource">
          {src && <Excerpt vol={vol} route={r} source={src} marked={marked} compact />}
        </div>
      </div>
    </article>
  );
}

/** Figures over time: the bar, the gaps, each version beside its text. */
export function FiguresOverTime(
  { engine, vol, route: r, item, date }: { engine: Engine; vol: LoadedVolume; route: Route; item: Item; date: string },
) {
  if (!Array.isArray(item.versions) || !item.versions.length) return null;
  const vs = figureVersions(item, date);
  const gaps = figureGaps(item);
  const isTable = vs.some((v) => v.version.value !== null && typeof v.version.value === "object");
  return (
    <section class="isec figures-over-time" id="versions" aria-labelledby="versions-h">
      <h2 id="versions-h">Figures over time</h2>
      <Bar item={item} date={date} />
      <ul class="gaps">
        <li>Before {formatDate(vs[0].version.from)} the codex states no figure.</li>
        {gaps.map((g) => (
          <li key={g.from} class="gap">
            {g.to
              ? <>From {formatDate(g.from)} until {formatDate(g.to)} no figure; {CANNOT}.</>
              : <><b>From {formatDate(g.from)} no figure;</b> {CANNOT}.</>}
          </li>
        ))}
        {item.review_by && <li>Next version expected by {formatDate(item.review_by)}{item.review_by < date ? " (overdue)" : ""}.</li>}
      </ul>
      {isTable && vs.length > 1 && <TableAcross item={item} versions={vs} />}
      {item.precision && (
        <div class="fighistory">
          <h3>How the figure came to be</h3>
          <Prose engine={engine} vol={vol} route={r} text={item.precision} as="p" />
        </div>
      )}
      <h3>Each version beside the text it was taken from</h3>
      {[...vs].reverse().map((v) => <VersionCard key={v.version.from} vol={vol} route={r} item={item} v={v} />)}
    </section>
  );
}
