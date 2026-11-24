import { useEffect, useRef, useState } from "preact/hooks";
import type { Engine } from "../../engine/engine";
import type { Expr, Item } from "../../engine/types";
import { paramInForce } from "../../engine/versions";
import { aidCodeWarnings, type AidCodeMap } from "../../ledger/aid-codes";
import {
  branchesTo, branchFigures, codeEntries, codePrograms,
  landings, programOfArg, upstreamFigures, type CodeEntry, type Landing,
} from "../aidcodes";
import { plainDerivation, type PlainLine } from "../plain";
import { noVersionReason, PlainLines, PlainRule } from "../Present";
import { formatDate, formatValue, optionLabel, personLabel } from "../present";
import { programLabel } from "../roles";
import { buildHash, type Route } from "../router";
import { navigate } from "../state";
import { viewContext, type ViewContext } from "./context";
import {
  CodeChip, Cites, ItemLink, PlaceholderBanner, itemHref, walkthroughHref,
} from "./parts";
import { NoLedger, ViewHeader } from "./ViewStub";
import "./workflow-views.css";

/** By aid code / outcome. Route: `#/<volume>/outcomes` (every program),
 *  `#/<volume>/outcomes/<program or outcome>`, `?code=<code>` to open one
 *  code, `?asof=` for the figures' date. One stored household's persons
 *  across every program is the household's own page (places/HouseholdPage).
 *  Aid codes are placeholders until the CBMS list is supplied
 *  (`aid-codes.yaml`). */
export function OutcomesView() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const map = ctx.vol.aidCodes ?? null;
  return (
    <section class="view workflow outcomes">
      <ViewHeader view="outcomes" />
      {!map
        ? <p class="status">This volume has no aid-code layer yet (<code>aid-codes.yaml</code>).</p>
        : (
          <>
            <PlaceholderBanner map={map} />
            <CodesTab ctx={ctx} map={map} />
          </>
        )}
    </section>
  );
}

function setParam(r: Route, key: string, value: string | null): void {
  const params = { ...r.params };
  if (value) params[key] = value; else delete params[key];
  navigate({ params });
}

// ------------------------------------------------------------------ codes

/** The aid-code cards. `chips` lists the programs to pick from (the page of
 *  every program's codes); a program's own Aid codes tab leaves it out. */
export function CodesTab({ ctx, map, chips = true }: { ctx: ViewContext; map: AidCodeMap; chips?: boolean }) {
  const { engine, vol, route: r, today } = ctx;
  const programs = codePrograms(engine, map);
  const program = programOfArg(engine, map, r.arg);
  const outcomeArg = r.arg && engine.item(r.arg) ? r.arg : null;
  const asOf = r.params.asof || today;
  const all = codeEntries(engine, map);
  const shown = all.filter((c) => (!program || c.program === program) && (!outcomeArg || c.outcome === outcomeArg));
  const land = landings(engine, map, vol.cases);
  const warnings = aidCodeWarnings(engine, map);
  const groups = (program ? [program] : programs).map((p) => ({ program: p, codes: shown.filter((c) => c.program === p) }))
    .filter((g) => g.codes.length);
  return (
    <>
      {chips && <nav class="chips programs" aria-label="Programs">
        <a class={!program ? "on" : ""} href={buildHash({ ...r, arg: null, params: keep(r.params, ["asof"]) })}>All programs</a>
        {programs.map((p) => (
          <a key={p} class={program === p ? "on" : ""} href={buildHash({ ...r, arg: p, params: keep(r.params, ["asof"]) })}>
            {programLabel(p)}
          </a>
        ))}
      </nav>}
      <div class="controls">
        <label>
          Figures as of{" "}
          <input type="date" value={asOf} onChange={(e) => setParam(r, "asof", (e.target as HTMLInputElement).value)} />
        </label>
        <span class="muted">
          {shown.length} code{shown.length === 1 ? "" : "s"}. Households: the stored test households, each read in its own month.
        </span>
      </div>
      {outcomeArg && (
        <p class="muted">
          Showing the codes of one outcome. <a href={buildHash({ ...r, arg: engine.item(outcomeArg)!.program, params: keep(r.params, ["asof"]) })}>Show the whole program</a>
        </p>
      )}
      {warnings.length > 0 && (
        <details class="aidwarn">
          <summary class="warn">{warnings.length} outcome option{warnings.length === 1 ? "" : "s"} or entr{warnings.length === 1 ? "y" : "ies"} need attention in the aid-code list</summary>
          <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </details>
      )}
      {groups.map((g) => (
        <section key={g.program} class="codegroup" data-program={g.program}>
          <h2>{programLabel(g.program)}</h2>
          {map.participation[g.program] && (
            <p class="muted note">
              A {programLabel(g.program)} result is decided for the whole household or unit. A person holds the
              code only when they are a member themselves
              ({engine.item(map.participation[g.program].outcome)?.name ?? map.participation[g.program].outcome}:{" "}
              {map.participation[g.program].member.map((m) => optionLabel(engine.item(map.participation[g.program].outcome), m)).join(" or ")}).
            </p>
          )}
          <ul class="codecards">
            {g.codes.map((c) => (
              <CodeCard
                key={c.code} ctx={ctx} map={map} entry={c} asOf={asOf}
                landed={land.get(c.code) ?? []} open={r.params.code === c.code}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function keep(params: Record<string, string>, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) if (params[k]) out[k] = params[k];
  return out;
}

function CodeCard(
  { ctx, map, entry, asOf, landed, open }:
  { ctx: ViewContext; map: AidCodeMap; entry: CodeEntry; asOf: string; landed: Landing[]; open: boolean },
) {
  const [isOpen, setOpen] = useState(open);
  const ref = useRef<HTMLLIElement>(null);
  // A link to this code (`?code=`) opens it and brings it into view, also
  // when the page was already showing the list.
  useEffect(() => {
    if (!open) return;
    setOpen(true);
    ref.current?.scrollIntoView?.({ block: "start" });
  }, [open]);
  const item = ctx.engine.item(entry.outcome)!;
  const persons = landed.length;
  const households = new Set(landed.map((l) => l.caseId)).size;
  return (
    <li class="codecard" id={`code-${entry.code}`} data-code={entry.code} ref={ref}>
      <details open={isOpen} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>
          <span class="codelabel">{entry.label}</span>{" "}
          <CodeChip code={entry.code} placeholder={map.status === "placeholder"} />{" "}
          <span class="muted landcount">
            {persons
              ? `${persons} person${persons === 1 ? "" : "s"} in ${households} stored household${households === 1 ? "" : "s"}`
              : "no stored household lands here"}
          </span>
        </summary>
        {isOpen && <CodeBody ctx={ctx} map={map} entry={entry} item={item} asOf={asOf} landed={landed} />}
      </details>
    </li>
  );
}

function linesOf(engine: Engine, e: Expr, asOf: string, subject: Item): PlainLine[] {
  try { return plainDerivation(engine, e, { asOf }, subject); } catch { return [{ depth: 0, parts: [engine.compact(e)] }]; }
}

function CodeBody(
  { ctx, map, entry, item, asOf, landed }:
  { ctx: ViewContext; map: AidCodeMap; entry: CodeEntry; item: Item; asOf: string; landed: Landing[] },
) {
  const { engine, vol, route: r } = ctx;
  const branches = branchesTo(item, entry.option);
  const exprs: Expr[] = branches ? branches.flatMap((b) => (b.when.length ? b.when : b.unless)) : (item.derived ? [item.derived as Expr] : []);
  const requireIds = Object.keys(entry.requires);
  const figures = branchFigures(engine, exprs);
  const all = upstreamFigures(engine, entry.outcome);
  const optionText = optionLabel(item, entry.option);
  return (
    <div class="codebody">
      <p>
        <b>Outcome:</b> <ItemLink route={r} item={item} /> is <b>“{entry.option === "yes" ? "Yes" : entry.option === "no" ? "No" : optionText}”</b>.
      </p>

      <h4>The rule that leads here</h4>
      {branches === null && <PlainRule engine={engine} item={item} asOf={asOf} />}
      {branches !== null && branches.length === 0 && <p class="muted">No branch of the rule gives this result.</p>}
      {branches !== null && branches.map((b, i) => (
        <div key={i} class="branch">
          {branches.length > 1 && <p class="muted">Route {i + 1} of {branches.length}:</p>}
          {b.when.length > 0
            ? (
              <>
                <p>This result applies when {b.when.length > 1 ? "all of these hold" : "this holds"}:</p>
                {b.when.map((w, j) => <PlainLines key={j} engine={engine} lines={linesOf(engine, w, asOf, item)} />)}
                {b.unless.length > 0 && (
                  <details class="unless">
                    <summary>…and none of the {b.unless.length} earlier test{b.unless.length === 1 ? "" : "s"} in the rule gave another result</summary>
                    {b.unless.map((w, j) => <PlainLines key={j} engine={engine} lines={linesOf(engine, w, asOf, item)} />)}
                  </details>
                )}
              </>
            )
            : b.unless.length > 0
              ? (
                <>
                  <p>This is the rule's result when none of these {b.unless.length} tests applies:</p>
                  {b.unless.map((w, j) => <PlainLines key={j} engine={engine} lines={linesOf(engine, w, asOf, item)} />)}
                </>
              )
              : <p>This is the rule's result in every case.</p>}
        </div>
      ))}

      {(requireIds.length > 0 || entry.participation) && (
        <>
          <h4>Also needed for the code</h4>
          <ul class="needs">
            {requireIds.map((id) => {
              const it = engine.item(id);
              return (
                <li key={id}>
                  {it ? <ItemLink route={r} item={it} /> : id} is{" "}
                  {entry.requires[id].map((o) => `“${optionLabel(it, o)}”`).join(" or ")}.
                </li>
              );
            })}
            {entry.participation && (() => {
              const it = engine.item(entry.participation!.outcome);
              return (
                <li>
                  The person is a member: {it ? <ItemLink route={r} item={it} /> : entry.participation!.outcome} is{" "}
                  {entry.participation!.member.map((o) => `“${optionLabel(it, o)}”`).join(" or ")}. The result above
                  is the household's; a person who is not a member does not hold the code.
                </li>
              );
            })()}
          </ul>
        </>
      )}

      {entry.funding && map.funding && (
        <p>
          <b>Usually paid from:</b> {optionLabel(engine.item(map.funding.outcome), entry.funding)}{" "}
          <small class="muted">(each person's own funding is read from{" "}
            {engine.item(map.funding.outcome)
              ? <a href={itemHref(r, engine.item(map.funding.outcome)!)}>{engine.item(map.funding.outcome)!.name}</a>
              : map.funding.outcome})</small>
        </p>
      )}

      <h4>Figures it depends on</h4>
      {figures.length === 0
        ? <p class="muted">The tests above read no figure directly.</p>
        : <FigureTable ctx={ctx} items={figures} asOf={asOf} />}
      {all.length > figures.length && (
        <details class="allfigures">
          <summary>Every figure this outcome can reach ({all.length})</summary>
          <FigureTable ctx={ctx} items={all} asOf={asOf} compact />
        </details>
      )}

      <Cites vol={vol} route={r} item={item} />

      <h4>Stored households that land here</h4>
      <Landings route={r} landed={landed} program={entry.program} />
    </div>
  );
}

function FigureTable(
  { ctx, items, asOf, compact = false }:
  { ctx: ViewContext; items: Item[]; asOf: string; compact?: boolean },
) {
  const { route: r, vol } = ctx;
  return (
    <table class="grid figures">
      <thead><tr><th>Figure</th><th>On {formatDate(asOf)}</th>{!compact && <th>Rule text</th>}</tr></thead>
      <tbody>
        {items.map((it) => {
          const v = paramInForce(it, asOf);
          const why = noVersionReason(it, asOf);
          return (
            <tr key={it.id}>
              <td><ItemLink route={r} item={it} /></td>
              <td>
                {why
                  ? <span class="warn">{why}</span>
                  : v && typeof v === "object" && !Array.isArray(v)
                    ? <span>a table ({Object.keys(v).length} rows); <a href={itemHref(r, it)}>open it</a></span>
                    : formatValue(it, v)}
              </td>
              {!compact && <td><Cites vol={vol} route={r} item={it} /></td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Landings({ route: r, landed, program }: { route: Route; landed: Landing[]; program: string }) {
  if (!landed.length) return <p class="muted">None of the stored test households lands here.</p>;
  const byCase = new Map<string, Landing[]>();
  for (const l of landed) byCase.set(l.caseId, [...(byCase.get(l.caseId) ?? []), l]);
  return (
    <ul class="landings">
      {[...byCase.entries()].map(([caseId, ls]) => (
        <li key={caseId}>
          <a href={buildHash({ ...r, view: "outcomes", arg: null, params: { tab: "household", case: caseId } })}>{caseId}</a>{" "}
          <span class="muted">{formatDate(ls[0].month)}</span>:{" "}
          {ls.map((l, i) => (
            <span key={l.person}>
              {i > 0 && ", "}
              <a href={walkthroughHref(r, caseId, l.person, program)}>{personLabel(l.person)}</a>
            </span>
          ))}
          <br /><small class="muted">{ls[0].title}</small>
        </li>
      ))}
    </ul>
  );
}
