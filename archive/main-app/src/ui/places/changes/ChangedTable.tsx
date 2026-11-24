/* The before-and-after table (Blind A's pattern): one row per stored result
 * that differs, naming the household, the person in words, the result and
 * both values. The new value is bold, never green or red: a lower grant is
 * not "good" (both prototypes coloured a worse result green). */
import type { Engine } from "../../../engine/engine";
import type { HouseholdCase } from "../../../engine/cases";
import { unknownReason } from "../../counts";
import type { ChangedResult } from "../../questionEffects";
import { formatDate, formatValue } from "../../present";
import { buildHash, type Route } from "../../router";
import { personTitle, plainCaseTitle } from "../../walkthrough";
import { itemHref, walkthroughHref } from "../../views/parts";

export function householdHref(r: Route, caseId: string): string {
  return buildHash({ ...r, view: "households", arg: caseId, params: {} });
}

export function ChangedTable(
  { engine, cases, route: r, rows, before = "Before", after = "After", limit = 40 }:
  {
    engine: Engine; cases: readonly HouseholdCase[]; route: Route; rows: readonly ChangedResult[];
    before?: string; after?: string; limit?: number;
  },
) {
  if (!rows.length) return null;
  const shown = rows.slice(0, limit);
  let last = "";
  return (
    <div class="changedwrap">
      <table class="changed">
        <thead>
          <tr><th scope="col">Household</th><th scope="col">Person</th><th scope="col">Result</th><th scope="col">{before}</th><th scope="col">{after}</th></tr>
        </thead>
        <tbody>
          {shown.map((c, i) => {
            const it = engine.item(c.identifier);
            const hc = cases.find((x) => x.id === c.caseId);
            const first = c.caseId !== last;
            last = c.caseId;
            const unknown = c.after === null || c.after === undefined;
            return (
              <tr key={i} class={first ? "first" : ""} data-case={c.caseId}>
                <td data-label="Household">
                  {first
                    ? <><a href={householdHref(r, c.caseId)}>{c.caseId}</a>{hc && <small class="muted"> {plainCaseTitle(hc.title).title}</small>}</>
                    : <span class="muted">{c.caseId}</span>}
                </td>
                <td data-label="Person">
                  <a href={walkthroughHref(r, c.caseId, c.person, undefined, { outcome: c.identifier, month: c.month })}>
                    {hc ? personTitle(hc, c.person) : c.person}
                  </a>
                  {c.month && <small class="muted"> {formatDate(c.month)}</small>}
                </td>
                <td data-label="Result">{it ? <a href={itemHref(r, it)}>{it.name}</a> : c.identifier}</td>
                <td data-label={before}>{formatValue(it, c.value)}</td>
                <td data-label={after}>
                  <b>{formatValue(it, c.after)}</b>
                  {unknown && <small class="muted"> ({unknownReason(c)})</small>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > limit && <p class="muted">And {rows.length - limit} more.</p>}
    </div>
  );
}
