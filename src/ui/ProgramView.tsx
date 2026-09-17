import { useSignal } from "@preact/signals";
import { useLayoutEffect } from "preact/hooks";
import type { HouseholdCase } from "../engine/cases";
import { programsOfCase } from "../engine/cases";
import type { Engine } from "../engine/engine";
import { tagAncestors, tagGroups, tagLabel } from "../engine/tags";
import type { Item } from "../engine/types";
import { loadConformanceResults, type ConformanceResults } from "../export/conformance";
import type { LedgerSource } from "../ledger/source";
import { programCounts, programOutcomes } from "./CasesView";
import { Term } from "./labels";
import { Ident } from "./Rich";
import { buildHash, type Route } from "./router";
import { engineSig, ledgerSource, navigate, route, viewEngine, volumeSig } from "./state";
import { validationMap } from "./validation";

/** The value of a parameter in force on a date: the latest version whose
 *  `from` does not exceed the date. This is the `paramOf` rule in
 *  src/engine/evaluate.ts (minus the per-case override, which has no meaning
 *  outside a case) restated here because that selection lives in a closure
 *  the engine does not export. */
export function paramInForce(it: Item, date: string): unknown {
  if (it.versions && it.versions.length) {
    let best: { from: string; value: unknown } | null = null;
    for (const v of it.versions) {
      if (v.from <= date && (!best || v.from >= best.from)) best = v;
    }
    return best ? best.value : null;
  }
  return it.value === undefined ? null : it.value;
}

interface Stat { passed: number; failed: number }

/** Pass/fail counts of every expectation in every case, grouped by the
 *  identifier expected, computed once so each outcome row is a lookup. */
function caseStatsByOutcome(engine: Engine, cases: HouseholdCase[]): Map<string, Stat> {
  const by = new Map<string, Stat>();
  for (const c of cases) {
    for (const res of engine.runCase(c).results) {
      let entry = by.get(res.identifier);
      if (!entry) { entry = { passed: 0, failed: 0 }; by.set(res.identifier, entry); }
      if (res.ok) entry.passed++; else entry.failed++;
    }
  }
  return by;
}

/** Pass/fail counts of an outcome's own rule tests (`item.tests`), the
 *  automation SME's other question: does the rule match its examples. */
function testStats(engine: Engine, it: Item | undefined): Stat {
  const out: Stat = { passed: 0, failed: 0 };
  for (const t of it?.tests ?? []) {
    if (engine.runTest(it!, t).ok) out.passed++; else out.failed++;
  }
  return out;
}

function statLabel(s: Stat): string {
  return `${s.passed}/${s.passed + s.failed}`;
}

function ProgramSwitcher(
  { programs, current, route: r }:
  { programs: Array<{ id: string }>; current: string; route: Route },
) {
  return (
    <nav class="tabs">
      {programs.map((p) => (
        <a
          key={p.id}
          class={p.id === current ? "on" : ""}
          href={buildHash({ ...r, view: "program", arg: p.id, params: {} })}
        >
          {p.id}
        </a>
      ))}
    </nav>
  );
}

/** The "Group" select above the outcomes table: every parent tag declared in
 *  this volume's hierarchy, filtering outcomes down to those carrying that
 *  tag or one declared under it. Hidden when the volume declares no tag
 *  hierarchy (a flat, pre-Colorado vocabulary has no parents to group by). */
function GroupFilter({ engine, route: r }: { engine: Engine; route: Route }) {
  const groups = [...tagGroups(engine.meta).keys()];
  if (!groups.length) return null;
  const current = r.params.group ?? "";
  return (
    <label class="group-filter">
      Group
      <select
        value={current}
        onChange={(e) => {
          const params = { ...r.params };
          const v = (e.target as HTMLSelectElement).value;
          if (v) params.group = v; else delete params.group;
          navigate({ params });
        }}
      >
        <option value="">any</option>
        {groups.map((g) => <option key={g} value={g}>{tagLabel(engine.meta, g)}</option>)}
      </select>
    </label>
  );
}

function outcomeInGroup(engine: Engine, identifier: string, group: string): boolean {
  const tags = engine.item(identifier)?.tags ?? [];
  return tags.some((t) => t === group || tagAncestors(engine.meta, t).includes(group));
}

function Outcomes(
  { engine, outcomes, cases, route: r }:
  { engine: Engine; outcomes: string[]; cases: HouseholdCase[]; route: Route },
) {
  const stats = caseStatsByOutcome(engine, cases);
  const group = r.params.group ?? "";
  const visible = group ? outcomes.filter((id) => outcomeInGroup(engine, id, group)) : outcomes;
  return (
    <table class="outcomes grid">
      <thead><tr><th>Outcome</th><th>Tags</th><th>Case results</th><th>Rule tests</th></tr></thead>
      <tbody>
        {visible.map((identifier) => {
          const it = engine.item(identifier);
          const cs = stats.get(identifier) ?? { passed: 0, failed: 0 };
          const ts = testStats(engine, it);
          return (
            <tr key={identifier}>
              <td>
                {it
                  ? <a href={buildHash({ ...r, view: "item", arg: it.id, params: {} })}>
                      {it.name}
                    </a>
                  : identifier}{" "}
                <code><Ident id={identifier} engine={engine} /></code>
              </td>
              <td class="tags">
                {(it?.tags ?? []).map((t) => (
                  <span key={t} class="chip">{tagLabel(engine.meta, t)}</span>
                ))}
              </td>
              <td class={`cases ${cs.failed ? "bad" : "ok"}`}>{statLabel(cs)}</td>
              <td class={`tests ${ts.failed ? "bad" : "ok"}`}>{statLabel(ts)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ProgramCases(
  { engine, programId, cases, route: r }:
  { engine: Engine; programId: string; cases: HouseholdCase[]; route: Route },
) {
  const touching = cases.filter((c) => programsOfCase(engine.index, c).includes(programId));
  return (
    <table class="progcases grid">
      <thead><tr><th>ID</th><th>Household</th><th>Result</th></tr></thead>
      <tbody>
        {touching.map((c) => {
          const pc = programCounts(engine, c).find((x) => x.program === programId)
            ?? { passed: 0, failed: 0 };
          return (
            <tr key={c.id}>
              <td>
                <a href={buildHash({ ...r, view: "cases", arg: c.id, params: {} })}>{c.id}</a>
              </td>
              <td>{c.title}</td>
              <td class={pc.failed ? "bad" : "ok"}>{statLabel(pc)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ParametersInForce(
  { engine, programId }: { engine: Engine; programId: string },
) {
  const asOf = useSignal(engine.meta.default_as_of);
  const parameters = engine.items()
    .filter((it) => it.kind === "parameter" && (it.program === programId || it.program === "All"))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <label>
        As of{" "}
        <input
          type="date" value={asOf.value}
          onInput={(e) => { asOf.value = (e.target as HTMLInputElement).value; }}
        />
      </label>
      <table class="parameters grid">
        <thead><tr><th>Parameter</th><th>Program</th><th>Value</th><th>Sources</th></tr></thead>
        <tbody>
          {parameters.map((it) => (
            <tr key={it.identifier}>
              <td>{it.name} <code><Ident id={it.identifier} engine={engine} /></code></td>
              <td>{it.program}</td>
              <td class="value">{engine.fmt(paramInForce(it, asOf.value))}</td>
              <td>{(it.sources ?? []).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function OpenQuestions(
  { engine, programId }: { engine: Engine; programId: string },
) {
  const vol = volumeSig.value!;
  const openIds = new Set(
    engine.items().filter((it) => it.program === programId).flatMap((it) => it.open ?? []),
  );
  const questions = vol.openQuestions.filter((q) => openIds.has(q.id));
  return (
    <div class="questions">
      {questions.length === 0 && <p class="muted">No open questions.</p>}
      {questions.map((q) => (
        <details key={q.id}>
          <summary>{q.id} {q.title}</summary>
          <p>{q.body}</p>
        </details>
      ))}
    </div>
  );
}

function Health({ engine, programId }: { engine: Engine; programId: string }) {
  const items = engine.items().filter((it) => it.program === programId);
  const byKind = { supplied: 0, derived: 0, parameter: 0 };
  for (const it of items) byKind[it.kind]++;
  const vmap = validationMap(engine);
  const withErrors = items.filter((it) => (vmap.get(it.id)?.errors ?? 0) > 0);
  let govErrors = 0, govWarnings = 0;
  const hasGovernance = typeof engine.governance === "function";
  if (hasGovernance) {
    for (const it of items) {
      for (const f of engine.governance(it)) {
        if (f.level === "error") govErrors++; else govWarnings++;
      }
    }
  }
  return (
    <ul class="health params">
      <li>
        {items.length} items: {byKind.supplied} <Term kind="supplied" />,{" "}
        {byKind.derived} <Term kind="derived" />, {byKind.parameter} <Term kind="parameter" />
      </li>
      <li class={withErrors.length ? "bad" : "ok"}>
        {withErrors.length} item{withErrors.length === 1 ? "" : "s"} with constraint errors
      </li>
      {hasGovernance && (
        <li class={govErrors ? "bad" : govWarnings ? "warn" : "ok"}>
          governance: {govErrors} error{govErrors === 1 ? "" : "s"}, {govWarnings} warning
          {govWarnings === 1 ? "" : "s"}
        </li>
      )}
    </ul>
  );
}

/** "Conformance: <adapter> on codex@<sha>: N passed, N failed, N
 *  unimplemented", read from `conformance/results.json` at whatever ref the
 *  route shows. Renders nothing when the ref has never had a conformance run
 *  committed (loadConformanceResults resolves null on a missing file). */
function ConformanceSummary({ source }: { source: LedgerSource }) {
  const results = useSignal<ConformanceResults | null>(null);
  useLayoutEffect(() => {
    let live = true;
    results.value = null;
    loadConformanceResults(source).then((r) => { if (live) results.value = r; });
    return () => { live = false; };
  }, [source]);
  if (!results.value) return null;
  const r = results.value;
  return (
    <p class="conformance muted">
      Conformance: {r.adapter} on codex@{r.codex.sha}: {r.summary.passed} passed,{" "}
      {r.summary.failed} failed, {r.summary.unimplemented} unimplemented
    </p>
  );
}

function ProgramPage(
  { engine, programId, programs, cases, route: r, source }:
  {
    engine: Engine; programId: string; programs: Array<{ id: string; outcomes: string[] }>;
    cases: HouseholdCase[]; route: Route; source: LedgerSource;
  },
) {
  const program = programs.find((p) => p.id === programId);
  if (!program) return <p class="status bad">No program {programId} in this volume.</p>;
  return (
    <section class="view">
      <div class="cardhead">
        <h1>{program.id}</h1>
        <span class="spacer" />
      </div>
      <ProgramSwitcher programs={programs} current={program.id} route={r} />
      <ConformanceSummary source={source} />

      <h3>Outcomes</h3>
      <GroupFilter engine={engine} route={r} />
      <Outcomes engine={engine} outcomes={program.outcomes} cases={cases} route={r} />

      <h3>Cases</h3>
      <ProgramCases engine={engine} programId={program.id} cases={cases} route={r} />

      <h3>Parameters in force</h3>
      <ParametersInForce engine={engine} programId={program.id} />

      <h3>Open questions</h3>
      <OpenQuestions engine={engine} programId={program.id} />

      <h3>Health</h3>
      <Health engine={engine} programId={program.id} />
    </section>
  );
}

export function ProgramView({ source }: { source?: LedgerSource } = {}) {
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  const r = route.value;
  if (!engine || !vol) return <p class="status">No ledger loaded.</p>;
  const programs = programOutcomes(engine);
  if (programs.length === 0) return <p class="status">No programs declared in this volume.</p>;
  const programId = r.arg ?? programs[0].id;
  return (
    <ProgramPage
      engine={engine} programId={programId} programs={programs} cases={vol.cases ?? []} route={r}
      source={source ?? ledgerSource()}
    />
  );
}
