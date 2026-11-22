/* Households (docs/design-unified-ui.md): the stored test households, one
 * page each with four tabs (`?tab=`): Results and aid codes (the default),
 * Documents still needed, What if, What the case states. A person's
 * result opens its determination (places/Determination.tsx). Routes:
 * `households` (`?program=`, `?find=`), `households/CO-n?tab=…`, and the
 * determination `households/CO-n/<person>/<outcome>`. */
import { useSignal } from "@preact/signals";
import { useMemo } from "preact/hooks";
import type { HouseholdCase } from "../../engine/cases";
import type { AidCodeMap } from "../../ledger/aid-codes";
import { caseMonth, caseMonths, cellOutcome, type PersonProgram } from "../aidcodes";
import {
  COUNT_DEFINITIONS, documentsNeededBy, documentsStillNeeded, isPastDue, pastDueCount, whatIfPhrase,
} from "../counts";
import {
  amountKey, filterHouseholds, householdPeople, householdSummaries, personFacts, resultsGrid, statedAmounts,
  tippingPoint, watchedResults, whatIfChanges, type PersonInfo, type StatedAmount, type TippingPoint, type Watched,
} from "../households";
import { caseEdges, relationshipSentence } from "../people";
import { formatDate, formatFor, optionLabel, personLabel } from "../present";
import { programLabel } from "../roles";
import { buildHash, HOUSEHOLD_TABS, householdTab, type Route } from "../router";
import { HOUSEHOLD_TAB_LABEL } from "../shell";
import { modeSig, navigate } from "../state";
import { caseSummaries, plainCaseTitle } from "../walkthrough";
import { viewContext, type ViewContext } from "../views/context";
import { CodeChip, PlaceholderBanner, itemHref } from "../views/parts";
import { NoLedger } from "../views/ViewStub";
import { determinationHref } from "./Determination";
import { PlaceHeader } from "./PlaceHeader";
import "../views/walkthrough.css";
import "./households.css";

// ---- the list

export function HouseholdsList() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const { engine, vol, route: r } = ctx;
  const all = useMemo(() => householdSummaries(engine, vol.cases, vol.casesText), [engine, vol]);
  const programs = [...new Set(all.flatMap((c) => c.programs))].sort((a, b) => programLabel(a).localeCompare(programLabel(b)));
  const program = r.params.program && programs.includes(r.params.program) ? r.params.program : "";
  const find = r.params.find ?? "";
  const shown = filterHouseholds(all, program, find);
  const set = (patch: Record<string, string>) => {
    const params: Record<string, string> = { ...r.params, ...patch };
    for (const k of Object.keys(params)) if (!params[k]) delete params[k];
    location.replace(buildHash({ ...r, params }));
  };
  return (
    <section class="view place households">
      <PlaceHeader place="households">
        {modeSig.value === "edit" && (
          <p><a class="btn" href={buildHash({ ...r, arg: "new", params: {} })}>Add a stored household</a></p>
        )}
      </PlaceHeader>
      <form class="hhfilters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          <span class="lbl">Find</span>
          <input
            type="search" class="hh-find" value={find} placeholder="Words in the description or a person"
            onInput={(e) => set({ find: (e.currentTarget as HTMLInputElement).value })}
          />
        </label>
        <label>
          <span class="lbl">Program</span>
          <select class="hh-program wk-program-filter" value={program} onChange={(e) => set({ program: (e.currentTarget as HTMLSelectElement).value })}>
            <option value="">Any program</option>
            {programs.map((p) => <option key={p} value={p}>{programLabel(p)}</option>)}
          </select>
        </label>
        <span class="small" aria-live="polite">{shown.length} of {all.length} households</span>
      </form>
      <ul class="hhlist">
        {shown.map((h) => (
          <li key={h.id} data-case={h.id}>
            <a class="hhcard" href={buildHash({ ...r, arg: h.id, params: {} })}>
              <span class="hhtitle">{h.title}</span>
              <span class="hhpeople">{h.people.map((p) => p.short).join(" · ")}</span>
              <span class="small">
                <span class="code">{h.id}</span> · as of {formatDate(h.asOf)} · {h.programs.map(programLabel).join(", ")}
              </span>
            </a>
          </li>
        ))}
      </ul>
      {!shown.length && <p class="status">No stored household matches.</p>}
    </section>
  );
}

// ---- one household

export function HouseholdPage() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const r = ctx.route;
  const caseId = (r.arg ?? "").split("/")[0];
  const hc = ctx.vol.cases.find((x) => x.id === caseId);
  if (!hc) {
    return (
      <section class="view place household">
        <PlaceHeader place="households" />
        <p class="status bad">
          No stored household {caseId} in this volume. <a href={buildHash({ ...r, arg: null, params: {} })}>All households</a>
        </p>
      </section>
    );
  }
  const tab = householdTab(r);
  const tabHref = (t: string): string => buildHash({ ...r, params: t === "results" ? {} : { tab: t } } as Route);
  const people = householdPeople(hc, ctx.vol.casesText);
  const summary = caseSummaries(ctx.engine, [hc], ctx.vol.casesText)[0];
  return (
    <section class="view place household" data-case={hc.id}>
      <div class="placehead">
        <h1>{plainCaseTitle(hc.title).title}</h1>
        <p class="purpose">
          <span class="code">{hc.id}</span> · {people.length} {people.length === 1 ? "person" : "people"} · determined as of{" "}
          <b>{formatDate(hc.as_of)}</b> · {summary.programs.map(programLabel).join(", ")}
        </p>
        {summary.notes.length > 0 && (
          <details class="hhnotes">
            <summary class="small">The case author's notes</summary>
            {summary.notes.map((n, i) => <p key={i} class="small">{n}</p>)}
          </details>
        )}
      </div>
      <nav class="hhtabs" aria-label="This household">
        {HOUSEHOLD_TABS.map((t) => (
          <a key={t} class={tab === t ? "on" : ""} aria-current={tab === t ? "page" : undefined} href={tabHref(t)} data-tab={t}>
            {HOUSEHOLD_TAB_LABEL[t]}
          </a>
        ))}
      </nav>
      <div class="hhtab" data-tab={tab}>
        {tab === "results" && <ResultsTab ctx={ctx} hc={hc} people={people} />}
        {tab === "documents" && <DocumentsTab ctx={ctx} hc={hc} people={people} />}
        {tab === "whatif" && <WhatIfTab ctx={ctx} hc={hc} people={people} />}
        {tab === "states" && <StatesTab ctx={ctx} hc={hc} people={people} />}
      </div>
    </section>
  );
}

function PersonHead({ p }: { p: PersonInfo }) {
  return (
    <>
      <span class="pid">{p.id}</span> <span class="pshort">{p.short}</span>
    </>
  );
}

// ---- results and aid codes

function ResultsTab({ ctx, hc, people }: { ctx: ViewContext; hc: HouseholdCase; people: PersonInfo[] }) {
  const { engine, vol, route: r } = ctx;
  const map = vol.aidCodes ?? null;
  const months = caseMonths(hc);
  const month = r.params.month && months.includes(r.params.month) ? r.params.month : caseMonth(hc);
  const grid = useMemo(() => (map ? resultsGrid(engine, map, hc, vol.casesText, month) : null), [engine, map, hc, vol.casesText, month]);
  const docs = useMemo(() => documentsStillNeeded(engine, hc).rows, [engine, hc]);
  if (!map || !grid) return <p class="status">This volume has no aid-code layer yet.</p>;
  const docsHref = buildHash({ ...r, params: { tab: "documents" } });
  return (
    <>
      <PlaceholderBanner map={map} />
      {months.length > 1 && (
        <p class="hhmonth">
          <label>
            <span class="lbl">Month</span>{" "}
            <select
              value={month}
              onChange={(e) => {
                const v = (e.currentTarget as HTMLSelectElement).value;
                navigate({ params: v === caseMonth(hc) ? {} : { month: v } });
              }}
            >
              {months.map((m) => <option key={m} value={m}>{formatDate(m)}</option>)}
            </select>
          </label>
        </p>
      )}
      <div class="hhgrid-wrap hhwrap">
        <table class="hhgrid household" data-case={hc.id}>
          <caption class="small">Each person's aid codes and amounts in {formatDate(month)}. Open a result to see why.</caption>
          <thead>
            <tr>
              <td />
              {grid.persons.map((p) => {
                const owed = documentsNeededBy(docs, p.id);
                return (
                  <th key={p.id} scope="col" data-person={p.id}>
                    <PersonHead p={p} />
                    {p.rest && <span class="pnote" title={p.note ?? undefined}>{p.rest}</span>}
                    {owed > 0 && <a class="docpill" href={docsHref}>{owed} {owed === 1 ? "document" : "documents"} still needed</a>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {grid.programs.map((prog) => (
              <tr key={prog} data-program={prog}>
                <th scope="row">{programLabel(prog)}</th>
                {grid.persons.map((p) => (
                  <td key={p.id} data-person={p.id} data-prog={prog}>
                    <GridCell ctx={ctx} map={map} hc={hc} person={p.id} pp={grid.cell(prog, p.id)} month={month} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class="hhcards">
        {grid.persons.map((p) => (
          <section key={p.id} class="hhperson" data-person={p.id}>
            <h2><PersonHead p={p} /></h2>
            {p.rest && <p class="small">{p.rest}</p>}
            {documentsNeededBy(docs, p.id) > 0 && (
              <a class="docpill" href={docsHref}>{documentsNeededBy(docs, p.id)} still needed</a>
            )}
            <dl>
              {grid.programs.map((prog) => (
                <div key={prog} class="hhrow">
                  <dt>{programLabel(prog)}</dt>
                  <dd><GridCell ctx={ctx} map={map} hc={hc} person={p.id} pp={grid.cell(prog, p.id)} month={month} /></dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      {grid.untested.length > 0 && (
        <p class="small untested-line">
          Not set up in this stored household, so nothing is claimed for: {grid.untested.map(programLabel).join(", ")}.
        </p>
      )}
    </>
  );
}

function GridCell(
  { ctx, map, hc, person, pp, month }:
  { ctx: ViewContext; map: AidCodeMap; hc: HouseholdCase; person: string; pp: PersonProgram; month: string },
) {
  const { engine, route: r } = ctx;
  const outcome = cellOutcome(pp);
  const oit = outcome ? engine.item(outcome) : undefined;
  const atMonth: Record<string, string> = oit && (oit.scope === "person-month" || oit.scope === "month") && month !== caseMonth(hc) ? { month } : {};
  const to = (o: string | null) => determinationHref(r, hc.id, person, o, o ? atMonth : { program: pp.program });
  const amounts = pp.amounts.slice(0, 2).map((a) => {
    const it = engine.item(a.outcome);
    return (
      <span key={a.outcome} class="amount">
        <span class="small">{(it?.name ?? a.outcome).replace(/^[^:]+:\s*/, "")}</span> <b>{formatFor(engine, a.outcome, a.value)}</b>
      </span>
    );
  });
  if (pp.codes.length) {
    return (
      <div class="cell has">
        {pp.codes.map((c) => (
          <span key={c.code} class="held">
            <a href={to(c.outcome)}>{c.label}</a>{" "}
            <CodeChip code={c.code} placeholder={map.status === "placeholder"} />
          </span>
        ))}
        {pp.funding?.key && pp.funding.key !== "none" && (
          <span class="small funding">Paid from {optionLabel(engine.item(pp.funding.outcome), pp.funding.key)}</span>
        )}
        {amounts}
      </div>
    );
  }
  let text: string;
  if (pp.householdOnly && pp.participation) {
    const who = pp.participation.key ? optionLabel(engine.item(pp.participation.outcome), pp.participation.key) : "not known";
    text = `Household has ${pp.household.map((c) => c.code).join(", ")}; not this person (${who})`;
  } else if (pp.participation && !pp.participation.member && pp.participation.key) {
    text = optionLabel(engine.item(pp.participation.outcome), pp.participation.key);
  } else if (pp.reason) {
    text = pp.reason.text.replace(/\.$/, "");
  } else if (pp.values.every((v) => v.key === null)) {
    text = "Not known: a fact it needs is not stated";
  } else {
    text = "No code";
  }
  return (
    <div class="cell none">
      <a href={to(outcome)}>{text}</a>
      {amounts}
    </div>
  );
}

// ---- documents still needed

function DocumentsTab({ ctx, hc, people }: { ctx: ViewContext; hc: HouseholdCase; people: PersonInfo[] }) {
  const { engine, route: r, today } = ctx;
  const needed = useMemo(() => documentsStillNeeded(engine, hc), [engine, hc]);
  const rows = needed.rows;
  const pastToday = pastDueCount(rows, today);
  const who = (pid: string) => people.find((p) => p.id === pid)!;
  return (
    <div class="hhdocs">
      <p>
        <b>{rows.length}</b> {rows.length === 1 ? "document" : "documents"} still needed on {formatDate(hc.as_of)}
        {pastToday > 0 && <> · <b>{pastToday}</b> {pastToday === 1 ? "due date falls" : "due dates fall"} before today ({formatDate(today)})</>}.
      </p>
      <details class="howcounted small">
        <summary>How this is counted</summary>
        <p>
          Every verification the codex records as pending for this household on its determination date, one row per
          document, with each program it is owed for and the date that program's rule sets. {COUNT_DEFINITIONS.pastDue}
        </p>
      </details>
      {rows.length === 0
        ? <p>Nothing is pending for anyone in this household.</p>
        : (
          <table class="wk-docs hhdocs-table">
            <thead><tr><th>Document</th><th>For whom</th><th>Program and due date</th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={`${d.person}|${d.document}`} data-doc={d.programs[0].identifier} data-person={d.person} data-programs={d.programs.map((p) => p.program).join(" ")}>
                  <td><b>{d.document}</b></td>
                  <td><PersonHead p={who(d.person)} /></td>
                  <td>
                    <ul class="dueprograms">
                      {d.programs.map((p) => {
                        const dueIt = p.dueIdentifier ? engine.item(p.dueIdentifier) : undefined;
                        const past = isPastDue(p.due, hc.as_of);
                        const beforeToday = isPastDue(p.due, today);
                        return (
                          <li key={p.program} data-program={p.program}>
                            <a href={determinationHref(r, hc.id, d.person, p.identifier)}>{programLabel(p.program)}</a>:{" "}
                            {p.due
                              ? dueIt ? <a href={itemHref(r, dueIt)} title={dueIt.name}><b>{formatDate(p.due)}</b></a> : <b>{formatDate(p.due)}</b>
                              : <span class="small">no due date in the codex</span>}
                            {past && <> <span class="pastdue">past due on the case date</span></>}
                            {!past && beforeToday && <> <span class="beforetoday">before today</span></>}
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      {needed.notOwed.length > 0 && (
        <details class="small">
          <summary>
            {needed.notOwed.length} pending flag{needed.notOwed.length === 1 ? "" : "s"} for programs that do not apply to the person (nothing is owed)
          </summary>
          <ul>
            {needed.notOwed.map((d) => (
              <li key={`${d.person}|${d.identifier}`}>{personLabel(d.person)}: {d.document} for {programLabel(d.program)}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ---- what if

const CHIPS = [100, 250, 500, 1000];

function WhatIfTab({ ctx, hc, people }: { ctx: ViewContext; hc: HouseholdCase; people: PersonInfo[] }) {
  const { engine, route: r } = ctx;
  const amounts = useMemo(() => statedAmounts(engine, hc), [engine, hc]);
  const watchParam = r.params.watch ?? "";
  const [watchPerson] = watchParam.split(":");
  const pick = amounts.find((a) => amountKey(a) === r.params.fact)
    ?? amounts.find((a) => a.income && a.value > 0 && a.person === watchPerson)
    ?? amounts[0];
  const add = Number(r.params.add ?? 0) || 0;
  const set = (patch: Record<string, string | null>) => {
    const params: Record<string, string> = { ...r.params, tab: "whatif" };
    for (const [k, v] of Object.entries(patch)) if (v === null) delete params[k]; else params[k] = v;
    location.replace(buildHash({ ...r, params }));
  };
  const watched = useMemo(() => (pick ? watchedResults(engine, hc, pick.identifier) : []), [engine, hc, pick?.identifier]);
  const changes = useMemo(() => (pick && add ? whatIfChanges(engine, hc, pick, add, watched) : []), [engine, hc, pick, add, watched]);
  if (!pick) return <p class="status">This household states no dollar amounts to move.</p>;
  const who = (pid: string) => people.find((p) => p.id === pid)!;
  const money = (v: number) => formatFor(engine, pick.identifier, v);
  const it = engine.item(pick.identifier);
  return (
    <div class="whatif">
      <p class="small">
        Move one amount this stored household states and see which results change. Nothing is saved, and no real
        household is involved.
      </p>
      <div class="wi-card">
        <label class="wi-amount">
          <span class="lbl">Amount to move</span>{" "}
          <select class="wi-fact" value={amountKey(pick)} onChange={(e) => set({ fact: (e.currentTarget as HTMLSelectElement).value, add: null })}>
            {amounts.map((a) => (
              <option key={amountKey(a)} value={amountKey(a)}>
                {a.person} {who(a.person).short}: {engine.item(a.identifier)?.name ?? a.identifier} ({money(a.value)})
              </option>
            ))}
          </select>
        </label>
        <div class="wi-row" role="group" aria-label="Add to the amount">
          <span>The case states <b>{money(pick.value)}</b>{it ? <> of <a href={itemHref(r, it)}>{it.name.replace(/^[^:]+:\s*/, "")}</a></> : null} for {personLabel(pick.person)}. Add</span>
          {CHIPS.map((d) => (
            <button
              key={d} type="button" class={`chip wi-chip${add === d ? " on" : ""}`} aria-pressed={add === d}
              onClick={() => set({ fact: amountKey(pick), add: add === d ? null : String(d) })}
            >+${d.toLocaleString("en-US")}</button>
          ))}
          <label>
            <span class="small">or</span>{" "}
            <input
              type="number" class="wi-add" step="25" value={add || ""} aria-label="Dollars to add"
              onChange={(e) => {
                const v = Number((e.currentTarget as HTMLInputElement).value);
                set({ fact: amountKey(pick), add: Number.isFinite(v) && v ? String(Math.round(v)) : null });
              }}
            />
          </label>
        </div>
      </div>

      {add !== 0 && (
        <section class="wi-result" aria-live="polite">
          <h2>With {money(pick.value + add)} instead of {money(pick.value)}</h2>
          <p class="wi-count"><b>{whatIfPhrase(changes)}</b>.</p>
          <details class="howcounted small"><summary>How this is worked out</summary><p>{COUNT_DEFINITIONS.whatIf}</p></details>
          {changes.length > 0 && (
            <table class="wk-changes wi-changes">
              <thead><tr><th>Person</th><th>Result</th><th>Now</th><th>With {add > 0 ? "+" : ""}{money(add)}</th></tr></thead>
              <tbody>
                {changes.map((c) => (
                  <tr key={`${c.person}|${c.identifier}`} data-person={c.person} data-outcome={c.identifier}>
                    <td><PersonHead p={who(c.person)} /></td>
                    <td><a href={determinationHref(r, hc.id, c.person, c.identifier)}>{engine.item(c.identifier)?.name ?? c.identifier}</a></td>
                    <td>{formatFor(engine, c.identifier, c.before)}</td>
                    <td><b>{formatFor(engine, c.identifier, c.after)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <Tipping ctx={ctx} hc={hc} people={people} pick={pick} watched={watched} watch={watchParam} onTry={(d) => set({ fact: amountKey(pick), add: String(d) })} />
    </div>
  );
}

function Tipping(
  { ctx, hc, people, pick, watched, watch, onTry }:
  {
    ctx: ViewContext; hc: HouseholdCase; people: PersonInfo[]; pick: StatedAmount; watched: Watched[]; watch: string;
    onTry: (delta: number) => void;
  },
) {
  const { engine, route: r } = ctx;
  const choices = watched.filter((w) => engine.item(w.identifier)?.type !== "money");
  const key = (w: Watched) => `${w.person}:${w.identifier}`;
  const initial = choices.find((w) => key(w) === watch)
    ?? choices.find((w) => w.person === pick.person && /eligib|participation|status/.test(w.identifier))
    ?? choices.find((w) => w.person === pick.person) ?? choices[0];
  const target = useSignal<string>(initial ? key(initial) : "");
  const result = useSignal<{ for: string; tp: TippingPoint } | null>(null);
  const busy = useSignal(false);
  const chosen = choices.find((w) => key(w) === target.value) ?? initial;
  if (!chosen) return null;
  const who = (pid: string) => people.find((p) => p.id === pid)!;
  const money = (v: number) => formatFor(engine, pick.identifier, v);
  const it = engine.item(chosen.identifier);
  const run = () => {
    busy.value = true;
    setTimeout(() => {
      result.value = { for: `${amountKey(pick)}|${key(chosen)}`, tp: tippingPoint(engine, hc, pick, chosen) };
      busy.value = false;
    }, 20);
  };
  const tp = result.value && result.value.for === `${amountKey(pick)}|${key(chosen)}` ? result.value.tp : null;
  return (
    <section class="wi-tipping">
      <h2>Find the tipping point</h2>
      <p class="small">The smallest monthly raise in this amount that changes one result, and every step that changes with it.</p>
      <div class="wi-row">
        <label>
          <span class="lbl">Result</span>{" "}
          <select class="wi-target" value={key(chosen)} onChange={(e) => { target.value = (e.currentTarget as HTMLSelectElement).value; }}>
            {choices.map((w) => (
              <option key={key(w)} value={key(w)}>{w.person} {who(w.person).short}: {engine.item(w.identifier)?.name ?? w.identifier}</option>
            ))}
          </select>
        </label>
        <button type="button" class="btn wi-find" onClick={run} disabled={busy.value}>
          {busy.value ? "Working…" : "Find the tipping point"}
        </button>
      </div>
      {tp && tp.raise === null && (
        <p class="wi-none">
          No raise up to {money(tp.cap)} a month changes it: {personLabel(chosen.person)}'s {it?.name ?? chosen.identifier} stays{" "}
          <b>{formatFor(engine, chosen.identifier, tp.before)}</b>.
        </p>
      )}
      {tp && tp.raise !== null && (
        <div class="wi-found" data-raise={tp.raise}>
          <p>
            At <b>{money(pick.value + tp.raise)}</b> a month ({money(tp.raise)} more than the {money(pick.value)} stated
            for {personLabel(pick.person)}), {personLabel(chosen.person)}'s{" "}
            <a href={determinationHref(r, hc.id, chosen.person, chosen.identifier)}>{it?.name ?? chosen.identifier}</a> changes from{" "}
            <b>{formatFor(engine, chosen.identifier, tp.before)}</b> to <b>{formatFor(engine, chosen.identifier, tp.after)}</b>.{" "}
            <button type="button" class="linkish" onClick={() => onTry(tp.raise!)}>Try this amount</button>
          </p>
          {tp.first && (
            <p class="wi-first">
              The first test that changes: <b>{tp.first.node.name}</b> goes from{" "}
              <b>{formatFor(engine, tp.first.node.identifier, tp.first.before)}</b> to{" "}
              <b>{formatFor(engine, tp.first.node.identifier, tp.first.after)}</b>.
            </p>
          )}
          <table class="wk-changes wi-steps">
            <caption class="small">Every step that changes, from the income up to the result</caption>
            <thead><tr><th>Step</th><th>Now</th><th>With the raise</th></tr></thead>
            <tbody>
              {tp.steps.map((s) => {
                const sit = engine.item(s.node.identifier);
                return (
                  <tr key={s.node.key} class={s === tp.first ? "first" : undefined}>
                    <td>
                      {s.node.person && s.node.person !== chosen.person && <span class="small">{personLabel(s.node.person)}: </span>}
                      {sit ? <a href={itemHref(r, sit)}>{s.node.name}</a> : s.node.name}
                    </td>
                    <td>{formatFor(engine, s.node.identifier, s.before)}</td>
                    <td><b>{formatFor(engine, s.node.identifier, s.after)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p class="small">
            {money(pick.value + tp.raise - 1)} a month still gives {formatFor(engine, chosen.identifier, tp.before)}. Only
            this stored household's stated amount was moved.
          </p>
        </div>
      )}
    </section>
  );
}

// ---- what the case states

function StatesTab({ ctx, hc, people }: { ctx: ViewContext; hc: HouseholdCase; people: PersonInfo[] }) {
  const { engine, route: r } = ctx;
  const edges = caseEdges(hc);
  const report = useMemo(() => engine.runCase(hc), [engine, hc]);
  const factLink = (id: string) => {
    const it = engine.item(id);
    return it ? <a href={itemHref(r, it)}>{it.name}</a> : <span>{id}</span>;
  };
  const caseFacts = Object.entries(hc.case_facts ?? {});
  const monthFacts = Object.entries(hc.month_facts ?? {});
  const params = Object.entries(hc.parameters ?? {});
  return (
    <div class="hhstates">
      {edges.length > 0 && (
        <>
          <h2>How they are related</h2>
          <ul class="relations">
            {edges.map((e) => <li key={`${e.role}|${e.from}|${e.to}`}>{relationshipSentence(e)}.</li>)}
          </ul>
        </>
      )}
      <h2>What the case states about each person</h2>
      {people.map((p, i) => {
        const rows = personFacts(engine, hc, p.id);
        return (
          <details key={p.id} class="hhfacts" open={i === 0} data-person={p.id}>
            <summary><PersonHead p={p} /> <span class="small">· {rows.length} facts stated</span></summary>
            {p.rest && <p class="small">{p.rest}</p>}
            <table class="facts">
              <tbody>
                {rows.map((f, k) => (
                  <tr key={`${f.identifier}|${f.when ?? ""}|${k}`}>
                    <td>{factLink(f.identifier)}{f.when && <span class="small"> · {f.when === "every month" ? f.when : formatDate(f.when)}</span>}</td>
                    <td><b>{formatFor(engine, f.identifier, f.value)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        );
      })}
      {caseFacts.length > 0 && (
        <details class="hhfacts">
          <summary>Facts of the whole application <span class="small">· {caseFacts.length} stated</span></summary>
          <table class="facts"><tbody>
            {caseFacts.map(([k, v]) => <tr key={k}><td>{factLink(k)}</td><td><b>{formatFor(engine, k, v)}</b></td></tr>)}
          </tbody></table>
        </details>
      )}
      {monthFacts.length > 0 && (
        <details class="hhfacts">
          <summary>Facts of a month</summary>
          <table class="facts"><tbody>
            {monthFacts.flatMap(([m, rec]) => Object.entries(rec).map(([k, v]) => (
              <tr key={`${m}|${k}`}><td>{factLink(k)} <span class="small">· {formatDate(m)}</span></td><td><b>{formatFor(engine, k, v)}</b></td></tr>
            )))}
          </tbody></table>
        </details>
      )}
      {params.length > 0 && (
        <p class="small">
          This case also assumes a figure the State has not published:{" "}
          {params.map(([k], i) => <span key={k}>{i > 0 && ", "}{factLink(k)}</span>)}.
        </p>
      )}

      <h2>What the case expects</h2>
      <p>
        {report.failed
          ? <><b>{report.failed}</b> of {report.passed + report.failed} stored results differ from what the case expects.</>
          : <>All {report.passed} stored results are as the case expects.</>}
      </p>
      <div class="wk-tablewrap">
        <table class="wk-changes expectations">
          <thead><tr><th>Person</th><th>Result</th><th>The case expects</th><th>The codex gives</th></tr></thead>
          <tbody>
            {report.results.map((res) => (
              <tr key={`${res.person}|${res.identifier}|${res.month ?? ""}`} class={res.ok ? undefined : "differs"}>
                <td>{res.person}</td>
                <td>
                  <a href={determinationHref(r, hc.id, res.person, res.identifier, res.month && res.month !== hc.as_of.slice(0, 7) ? { month: res.month } : {})}>
                    {engine.item(res.identifier)?.name ?? res.identifier}
                  </a>
                  {res.month && <span class="small"> · {formatDate(res.month)}</span>}
                </td>
                <td>{res.expect === "unknown" ? "Unknown" : formatFor(engine, res.identifier, res.expect)}</td>
                <td>{formatFor(engine, res.identifier, res.got)}{!res.ok && <> <span class="pastdue">differs</span></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
