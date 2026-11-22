/* The item in the stored households (docs/design-unified-ui.md, Item §§ 5
 * and 6): the value it takes in each household that reads it, what it
 * affects downstream, and "Compare stored households" (the households run
 * again with the version before, or with the reader's staged change). Every
 * count is counts.ts's: households that read it, households it reaches,
 * results that would change. */
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Engine } from "../../engine/engine";
import type { HouseholdCase } from "../../engine/cases";
import type { Item } from "../../engine/types";
import type { ChangeEntry } from "../../changes/types";
import type { LoadedVolume } from "../../ledger/load";
import {
  affectsPhrase, changedBy, changedPhrase, COUNT_DEFINITIONS, householdCount, itemAffects, householdsReached,
  householdsThatRead, readReachPhrase, unknownReason,
} from "../counts";
import { formatDate, formatFor, formatValue, personLabel } from "../present";
import type { ChangedResult, StoredResult } from "../questionEffects";
import { programLabel } from "../roles";
import { useRestingIndex } from "../useResting";
import { HowCounted as KitHowCounted } from "../kit";
import { buildHash, type Route } from "../router";
import { plainCaseTitle } from "../walkthrough";
import { householdValues, outcomesByProgram, previousVersionComparison } from "./model";

/** counts.ts `restingIndex`, built a household at a time after the page
 *  paints (src/ui/useResting.ts) unless another page already did. */
export function useResting(engine: Engine | null, cases: readonly HouseholdCase[]): Map<string, StoredResult[]> | null {
  return useRestingIndex(engine, cases);
}

const isTable = (v: unknown) => v !== null && typeof v === "object" && !Array.isArray(v);

function determinationHref(r: Route, res: StoredResult): string {
  return buildHash({
    ...r, view: "households", arg: `${res.caseId}/${res.person}/${res.identifier}`,
    params: res.month ? { month: res.month } : {},
  });
}

function HowCounted({ keys }: { keys: Array<keyof typeof COUNT_DEFINITIONS> }) {
  return <KitHowCounted>{keys.map((k) => <p key={k}>{COUNT_DEFINITIONS[k]}</p>)}</KitHowCounted>;
}

/** § 5: the value in each stored household that reads the item. */
export function ValuesInHouseholds(
  { engine, vol, route: r, item, resting }:
  { engine: Engine; vol: LoadedVolume; route: Route; item: Item; resting: Map<string, StoredResult[]> | null },
) {
  const total = vol.cases.length;
  return (
    <section class="isec in-households" id="households" aria-labelledby="hh-h">
      <h2 id="hh-h">In the stored households</h2>
      {!resting
        ? <p class="muted">Working out which stored households read it…</p>
        : (() => {
          const read = householdsThatRead(engine, vol.cases, item.identifier);
          const reach = householdsReached(engine, vol.cases, item.identifier);
          const rows = householdValues(engine, vol.cases, item, read, resting.get(item.identifier) ?? []);
          return (
            <>
              <p class="countline">{readReachPhrase(read.length, reach.length, total)}.</p>
              <HowCounted keys={["read", "reach"]} />
              {rows.length > 0 && (
                <div class="scrollx">
                  <table class="grid hhvalues">
                    <thead><tr><th scope="col">Household</th><th scope="col">Value it takes</th></tr></thead>
                    <tbody>
                      {rows.map((h) => (
                        <tr key={h.caseId} data-case={h.caseId}>
                          <td>
                            <a href={buildHash({ ...r, view: "households", arg: h.caseId, params: {} })}>{plainCaseTitle(h.title).title}</a>
                            <div class="muted small"><small class="refid">{h.caseId}</small> · determined {formatDate(h.date)}</div>
                          </td>
                          <td>
                            {h.version && (
                              <div class="small">The version from {formatDate(h.version.from)}{isTable(h.version.value) ? "" : ":"}</div>
                            )}
                            {!h.version && item.kind === "parameter" && isTable(h.values[0]?.value) && <div>The figures in force then</div>}
                            {h.values.filter((v) => !isTable(v.value)).map((v, i) => (
                              <div key={i} class="pval">
                                {v.label && <span class="who">{v.label}: </span>}
                                <b>{formatValue(item, v.value)}</b>
                              </div>
                            ))}
                            {h.result && (
                              <a class="small" href={determinationHref(r, h.result)}>
                                See {engine.item(h.result.identifier)?.name ?? "the result"} step by step
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          );
        })()}
    </section>
  );
}

function ChangedTable({ engine, route: r, rows, beforeLabel }: { engine: Engine; route: Route; rows: ChangedResult[]; beforeLabel: string }) {
  return (
    <div class="scrollx">
      <table class="grid changed">
        <thead>
          <tr><th scope="col">Household</th><th scope="col">Person</th><th scope="col">Result</th><th scope="col">Now</th><th scope="col">{beforeLabel}</th></tr>
        </thead>
        <tbody>
          {rows.slice(0, 60).map((c, i) => (
            <tr key={i}>
              <td><a href={buildHash({ ...r, view: "households", arg: c.caseId, params: {} })}>{c.caseId}</a></td>
              <td>{personLabel(c.person)}</td>
              <td>
                <a href={determinationHref(r, c)}>{engine.item(c.identifier)?.name ?? c.identifier}</a>
                {c.month && <span class="muted small"> {formatDate(c.month)}</span>}
              </td>
              <td>{formatFor(engine, c.identifier, c.value)}</td>
              <td>
                {formatFor(engine, c.identifier, c.after)}
                {(c.after === null || c.after === undefined) && <div class="muted small">{unknownReason(c)}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 60 && <p class="muted small">… and {rows.length - 60} more.</p>}
    </div>
  );
}

/** Runs `entry` against the stored households when asked, after a paint. */
function Compare(
  { engine, cases, route: r, entry, label, beforeLabel }:
  { engine: Engine; cases: readonly HouseholdCase[]; route: Route; entry: ChangeEntry; label: string; beforeLabel: string },
) {
  const state = useSignal<"idle" | "working" | ChangedResult[]>("idle");
  useEffect(() => { state.value = "idle"; }, [entry]);
  const run = () => {
    state.value = "working";
    setTimeout(() => { state.value = changedBy(engine, cases, [entry]); }, 30);
  };
  const out = state.value;
  return (
    <div class="compare">
      <button type="button" class="btn primary" onClick={run} disabled={out === "working"}>{label}</button>
      <div aria-live="polite">
        {out === "working" && <p class="muted">Running the stored households again…</p>}
        {Array.isArray(out) && (
          <>
            <p class="countline"><b>{changedPhrase(out.length, householdCount(out))}.</b></p>
            <HowCounted keys={["changed"]} />
            {out.length > 0 && <ChangedTable engine={engine} route={r} rows={out} beforeLabel={beforeLabel} />}
          </>
        )}
      </div>
    </div>
  );
}

/** § 6: what reads the item, the outcomes it reaches, and the comparison. */
export function WhatItAffects(
  { engine, base, vol, route: r, item, date, staged }:
  { engine: Engine; base: Engine; vol: LoadedVolume; route: Route; item: Item; date: string; staged: ChangeEntry | null },
) {
  const direct = engine.usedBy(item.identifier);
  const progs = outcomesByProgram(engine, item.identifier);
  const cmp = item.kind === "parameter" ? previousVersionComparison(item, date, vol.chapterOf[item.id] ?? "parameters") : null;
  const name = (id: string) => engine.item(id)?.name ?? id;
  const link = (id: string) => {
    const it = engine.item(id);
    return it ? <a href={buildHash({ ...r, view: "item", arg: it.id, params: {} })}>{it.name}</a> : <span>{id}</span>;
  };
  return (
    <section class="isec affects" id="affects" aria-labelledby="affects-h">
      <h2 id="affects-h">What it affects</h2>
      <p class="countline">{affectsPhrase(itemAffects(engine, item.identifier))}.</p>
      <HowCounted keys={["affects"]} />
      {progs.length > 0 && (
        <ul class="byprogram">
          {progs.map((p) => (
            <li key={p.program}>
              <b>{programLabel(p.program)}:</b>{" "}
              {p.decisions.map((o, i) => <span key={o}>{i > 0 && " · "}{link(o)}</span>)}
              {p.verification.length > 0 && (
                <span class="muted">{p.decisions.length ? " · and " : ""}{p.verification.length} verification result{p.verification.length === 1 ? "" : "s"}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {direct.length > 0 && (
        <details class="readers">
          <summary>Rules that read it directly</summary>
          <ul class="cols">{[...direct].sort((a, b) => name(a).localeCompare(name(b))).map((d) => <li key={d}>{link(d)}</li>)}</ul>
        </details>
      )}
      <h3>Compare stored households</h3>
      {staged && (
        <Compare
          engine={base} cases={vol.cases} route={r} entry={staged}
          label="Compare the stored households with your staged change" beforeLabel="With your change"
        />
      )}
      {cmp && cmp.same && (
        <p class="muted">The version in force has the same figures as the version before (from {formatDate(cmp.previous.from)}), so no stored household's result would change.</p>
      )}
      {cmp && !cmp.same && (
        <Compare
          engine={base} cases={vol.cases} route={r} entry={cmp.entry}
          label={`Compare the stored households with the version before (from ${formatDate(cmp.previous.from)})`}
          beforeLabel="With the version before"
        />
      )}
      {!staged && !cmp && (
        <p class="muted">Propose a change (beside this page) to see which stored households' results it would change.</p>
      )}
    </section>
  );
}
