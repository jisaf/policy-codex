/* Components over the plain-language helpers (present.ts, plain.ts), shared
 * by the item page, the trace, the case pages and the workflow views. */
import type { Engine } from "../engine/engine";
import type { Item, ItemVersion } from "../engine/types";
import { versionInForce } from "../engine/versions";
import { plainRule, type PlainLine } from "./plain";
import {
  fplContext, fplMonthlyBySize, formatCell, formatDate, formatMoney, formatValue, isFplRate,
  tableRows, type FormatOptions,
} from "./present";
import { Ident } from "./Rich";

/** A parameter table as a table: one row per key. */
export function ValueTable({ item, value }: { item: Item | null; value: unknown }) {
  const t = tableRows(item, value);
  if (!t) return <span>{formatValue(item, value)}</span>;
  return (
    <table class="valuetable">
      <thead><tr><th>{t.keyLabel}</th><th>Value</th></tr></thead>
      <tbody>
        {t.rows.map((r) => (
          <tr key={r.key}><td>{r.key}</td><td>{formatCell(item, r.value)}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

/** One value of an item: a table as a table, anything else in words. */
export function Value(
  { item, value, opts }: { item: Item | null; value: unknown; opts?: FormatOptions },
) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return <ValueTable item={item} value={value} />;
  }
  return <span class="pvalue">{formatValue(item, value, opts)}</span>;
}

/** Lines of plain sentences, with every item reference a link. */
export function PlainLines({ engine, lines }: { engine: Engine; lines: PlainLine[] }) {
  return (
    <ul class="plain-derivation">
      {lines.map((l, i) => (
        <li key={i} class={`d${Math.min(l.depth, 5)}`}>
          {l.parts.map((p, j) => (typeof p === "string"
            ? <span key={j}>{p}</span>
            : <Ident key={j} id={p.id} label={p.label} engine={engine} />))}
        </li>
      ))}
    </ul>
  );
}

/** An item's rule as plain sentences ("If ..., the result is ..."). */
export function PlainRule({ engine, item, asOf }: { engine: Engine; item: Item; asOf?: string }) {
  let lines: PlainLine[];
  try {
    lines = plainRule(engine, item, { asOf });
  } catch (e) {
    return <p class="bad">(cannot read this rule: {(e as Error).message})</p>;
  }
  if (!lines.length) return null;
  return <PlainLines engine={engine} lines={lines} />;
}

/** For an FPL percentage: the monthly dollar figure for each household size,
 *  under the guideline in force on `asOf`. */
export function FplFigures({ engine, item, value, asOf }: {
  engine: Engine; item: Item; value: unknown; asOf: string;
}) {
  if (typeof value !== "number" || !isFplRate(item)) return null;
  const ctx = fplContext(engine, asOf);
  if (!ctx) return null;
  const rows = fplMonthlyBySize(value, ctx);
  return (
    <table class="valuetable fpl">
      <caption>Monthly income at {formatValue(item, value)}, by household size, under the guideline in force on {formatDate(asOf)}</caption>
      <thead><tr>{rows.map((r) => <th key={r.size}>{r.size}</th>)}</tr></thead>
      <tbody><tr>{rows.map((r) => <td key={r.size}>{formatMoney(r.monthly)}</td>)}</tr></tbody>
    </table>
  );
}

/** Why a versioned parameter has no value on a date, in words, or null when
 *  it has one: before its first version, after its last, or in a gap. Names
 *  the item's open questions, which usually say why. */
export function noVersionReason(item: Pick<Item, "versions" | "open">, date: string): string | null {
  const vs: ItemVersion[] = [...(item.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from));
  if (!vs.length || versionInForce(item, date)) return null;
  const see = (item.open ?? []).length ? `; see ${(item.open ?? []).join(", ")}` : "";
  if (date < vs[0].from) return `No figure before ${formatDate(vs[0].from)}${see}.`;
  const last = vs[vs.length - 1];
  if (last.to && date >= last.to) return `No version in force from ${formatDate(last.to)}${see}.`;
  const prev = vs.filter((v) => v.from <= date).pop();
  const next = vs.find((v) => v.from > date);
  if (prev?.to && next) return `No version between ${formatDate(prev.to)} and ${formatDate(next.from)}${see}.`;
  return `No version in force on ${formatDate(date)}${see}.`;
}
