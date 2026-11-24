import { useSignal } from "@preact/signals";
import type { Engine } from "../engine/engine";
import {
  appendCase, nextCaseId, parseCases, programsOfCase, type HouseholdCase,
  type PersonSpec,
} from "../engine/cases";
import { missingFacts, type TraceNode } from "../engine/explain";
import type { Item, TestSpec } from "../engine/types";
import { Ident } from "./Rich";
import { buildHash, type Route } from "./router";
import type { LoadedVolume } from "../ledger/load";
import { fileEntries } from "../changes/types";
import {
  changeSetSig, engineSig, modeSig, navigate, putFileChange, route, trayOpenSig, viewEngine,
  volumeSig,
} from "./state";
import { Trace } from "./Trace";
import { formatFor } from "./present";


export interface ProgramCount { program: string; passed: number; failed: number }

/** Pass and fail counts of a case's expectations, split by the program that
 *  owns each expected identifier, so a program administrator reads only the
 *  column they are accountable for. */
export function programCounts(engine: Engine, c: HouseholdCase): ProgramCount[] {
  const by = new Map<string, ProgramCount>();
  for (const p of programsOfCase(engine.index, c)) by.set(p, { program: p, passed: 0, failed: 0 });
  for (const res of engine.runCase(c).results) {
    const program = engine.item(res.identifier)?.program ?? "All";
    let entry = by.get(program);
    if (!entry) { entry = { program, passed: 0, failed: 0 }; by.set(program, entry); }
    if (res.ok) entry.passed++; else entry.failed++;
  }
  return [...by.values()];
}

/** The declared programs that own outcomes. Volumes written before the
 *  vocabulary landed have no `programs`, so the distinct `program` values of
 *  the ledger stand in, with each program's un-consumed derived facts as its
 *  outcomes. */
export function programOutcomes(engine: Engine): Array<{ id: string; outcomes: string[] }> {
  const declared = engine.meta.programs;
  const out = declared && declared.length
    ? declared.map((p) => ({ id: p.id, outcomes: (p.outcomes ?? []).slice() }))
    : [...new Set(engine.items().map((it) => it.program))].sort().map((id) => ({
      id,
      outcomes: engine.items()
        .filter((it) => it.program === id && it.kind === "derived"
          && engine.usedBy(it.identifier).length === 0)
        .map((it) => it.identifier),
    }));
  return out.filter((p) => p.outcomes.length > 0);
}

/** Every supplied fact and parameter the given outcomes can reach: the
 *  upstream cone, walked over the dependency graph. The determination date is
 *  left out because the form asks for it once, as `as_of`. */
export function upstreamCone(engine: Engine, outcomes: readonly string[]): Item[] {
  const seen = new Set<string>();
  const frontier = [...outcomes];
  while (frontier.length) {
    const cur = frontier.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const d of engine.usesOfItem(cur)) if (!seen.has(d)) frontier.push(d);
  }
  const items: Item[] = [];
  for (const id of seen) {
    const it = engine.item(id);
    if (it && it.kind !== "derived" && it.identifier !== "determination_date") items.push(it);
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

/** One typed form field back into a ledger value. A blank field is not an
 *  answer: it leaves the fact unsupplied, which the engine reads as unknown. */
export function parseField(engine: Engine, it: Item, raw: string): unknown {
  const s = raw.trim();
  if (s === "") return undefined;
  switch (engine.baseType(it)) {
    case "yes/no":
      return s === "yes" ? true : s === "no" ? false : undefined;
    case "number": {
      const n = Number(s);
      return Number.isNaN(n) ? undefined : n;
    }
    case "group": case "relationships": case "table": case "months":
      try { return JSON.parse(s); } catch { return undefined; }
    default:
      return s;
  }
}

/** The household the form describes, in the shape the engine evaluates: one
 *  person, their person facts, and one value per month-scoped fact that holds
 *  in every month, exactly as `cases.yaml` states a household. */
export function buildSpec(
  engine: Engine, cone: readonly Item[], values: Record<string, string>, asOf: string,
): TestSpec & { as_of: string } {
  const facts: Record<string, unknown> = {};
  const monthDefaults: Record<string, unknown> = {};
  const person: PersonSpec = { facts, month_defaults: monthDefaults };
  for (const it of cone) {
    if (it.kind === "parameter") continue;
    const v = parseField(engine, it, values[it.identifier] ?? "");
    if (v === undefined) continue;
    // Relationships are the case's own structure, not a fact of the person:
    // `exists_related` reads them from the case, so they travel beside facts.
    if (engine.baseType(it) === "relationships") {
      person.relationships = v as Array<[string, string]>;
    } else if (it.scope === "person-month") monthDefaults[it.identifier] = v;
    else facts[it.identifier] = v;
  }
  return { id: "household", as_of: asOf, persons: { p1: person } };
}

/** Whether "Try an example" can fill the one-person form from this case: a
 *  single person `p1`, with no month-scoped facts the form has no field
 *  for (`persons.p1.months`, `month_facts` or `case_facts`). A household with a second
 *  person, or facts that vary by month, would silently drop data the form
 *  cannot represent. */
export function isRepresentableCase(c: HouseholdCase): boolean {
  const personIds = Object.keys(c.persons ?? {});
  return personIds.length === 1 && personIds[0] === "p1"
    && !c.persons.p1.months && !c.month_facts && !c.case_facts;
}

function fieldInput(
  engine: Engine, it: Item, values: Record<string, string>,
  set: (identifier: string, raw: string) => void,
) {
  const value = values[it.identifier] ?? "";
  const onInput = (e: Event) => set(it.identifier, (e.target as HTMLInputElement).value);
  const base = engine.baseType(it);
  if (base === "yes/no") {
    return (
      <select id={it.identifier} data-fact={it.identifier} value={value} onChange={onInput}>
        <option value="">unknown</option>
        <option value="yes">yes</option>
        <option value="no">no</option>
      </select>
    );
  }
  if (base === "enum") {
    return (
      <select id={it.identifier} data-fact={it.identifier} value={value} onChange={onInput}>
        <option value="">unknown</option>
        {(it.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  const type = base === "number" ? "number" : base === "date" ? "date" : "text";
  return (
    <input
      id={it.identifier} data-fact={it.identifier} type={type} value={value}
      placeholder={base === "month" ? "YYYY-MM"
        : base === "group" || base === "table" || base === "relationships" || base === "months"
          ? "JSON, e.g. []" : ""}
      onInput={onInput}
    />
  );
}

function FactFields(
  { engine, items, values, set }:
  {
    engine: Engine; items: Item[]; values: Record<string, string>;
    set: (identifier: string, raw: string) => void;
  },
) {
  return (
    <table class="facts grid">
      <thead><tr><th>Fact</th><th>Identifier</th><th>Type</th><th>Value</th></tr></thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.identifier}>
            <td>{it.name}</td>
            <td><code><Ident id={it.identifier} engine={engine} /></code></td>
            <td class="muted">{it.type}</td>
            <td>{fieldInput(engine, it, values, set)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A ledger value formatted the way a form field holds it: the inverse of
 *  `parseField`, so a case's own facts can be poured straight into the form
 *  ("Try an example" below). */
function fieldValue(v: unknown): string {
  if (v === true) return "yes";
  if (v === false) return "no";
  if (Array.isArray(v) || (v !== null && typeof v === "object")) return JSON.stringify(v);
  return String(v);
}

function NewHousehold(
  { engine, vol, route: r }: { engine: Engine; vol: LoadedVolume; route: Route },
) {
  const values = useSignal<Record<string, string>>({});
  const caseTitle = useSignal("");
  const staged = useSignal("");
  const asOf = useSignal(engine.meta.default_as_of);
  const exampleId = useSignal("");
  const answer = useSignal<Array<{ identifier: string; month: string | null; root: TraceNode }> | null>(null);

  const programs = programOutcomes(engine);
  const chosen = (r.params.programs ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const outcomes = programs.filter((p) => chosen.includes(p.id)).flatMap((p) => p.outcomes);
  const cone = upstreamCone(engine, outcomes);
  const supplied = cone.filter((it) => it.kind === "supplied");
  const parameters = cone.filter((it) => it.kind === "parameter");
  const personFacts = supplied.filter((it) => it.scope !== "person-month");
  const monthFacts = supplied.filter((it) => it.scope === "person-month");

  const toggleProgram = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id];
    const params = { ...r.params };
    if (next.length) params.programs = next.join(",");
    else delete params.programs;
    answer.value = null;
    navigate({ params });
  };
  const set = (identifier: string, raw: string) => {
    values.value = { ...values.value, [identifier]: raw };
    staged.value = "";
  };
  /** Fills the form from an existing household case's p1 facts and month
   *  defaults, mapped through the same cone the fields are built from, so
   *  evaluating immediately works (docs/design-onboarding.md, "Guided first
   *  run, hints, help"). A field the example does not answer is left as it
   *  was; picking a different example does not need a page reload. */
  const applyExample = (id: string) => {
    exampleId.value = id;
    answer.value = null;
    if (!id) return;
    const hc = (vol.cases ?? []).find((c) => c.id === id);
    const p1 = hc?.persons.p1;
    if (!hc || !p1) return;
    const next: Record<string, string> = {};
    for (const it of cone) {
      if (it.kind === "parameter") continue;
      if (engine.baseType(it) === "relationships") {
        next[it.identifier] = fieldValue(p1.relationships ?? []);
        continue;
      }
      const v = it.scope === "person-month" ? p1.month_defaults?.[it.identifier] : p1.facts?.[it.identifier];
      if (v !== undefined) next[it.identifier] = fieldValue(v);
    }
    values.value = { ...values.value, ...next };
    if (hc.as_of) asOf.value = hc.as_of;
    staged.value = "";
  };
  const evaluate = () => {
    const spec = buildSpec(engine, cone, values.value, asOf.value);
    answer.value = outcomes.map((identifier) => {
      const it = engine.item(identifier);
      const month = it && it.scope === "person-month" ? asOf.value.slice(0, 7) : null;
      const person = it && (it.scope === "person" || it.scope === "person-month") ? "p1" : null;
      return { identifier, month, root: engine.explain(spec, identifier, person, month) };
    });
    staged.value = "";
  };

  /** The evaluated household as a new case, appended to `tests/cases.yaml`.
   *  Its expectations are the values just computed: a staged case records what
   *  the ledger does today, which is exactly what a regression pins. */
  const stage = () => {
    if (!answer.value) return;
    const spec = buildSpec(engine, cone, values.value, asOf.value);
    // A second household is staged on top of the first: the base is whatever
    // the tray already holds for the file, so neither case is lost.
    const path = `${vol.path}/tests/cases.yaml`;
    const staging = fileEntries(changeSetSig.value).find((f) => f.path === path);
    const base = staging?.after ?? vol.casesText;
    const id = nextCaseId(base == null ? [] : parseCases(base));
    const expect: Record<string, unknown> = {};
    for (const o of answer.value) {
      // `unknown` is how cases.yaml states an outcome the facts do not decide;
      // a bare null would be an expectation no evaluation can ever meet.
      const v = o.root.value === null || o.root.value === undefined ? "unknown" : o.root.value;
      expect[o.identifier] = o.month ? { [o.month]: v } : v;
    }
    const hc: HouseholdCase = {
      id,
      title: caseTitle.value.trim() || `Household evaluated as of ${asOf.value}`,
      as_of: asOf.value,
      persons: spec.persons ?? {},
      expect: { p1: expect },
    };
    const after = appendCase(base, hc);
    const added = parseCases(after).length - (vol.cases ?? []).length;
    putFileChange({
      path,
      before: vol.casesText,
      after,
      label: added > 1 ? `${added} new cases, through ${id}` : `${id} ${hc.title}`,
    });
    staged.value = id;
  };

  return (
    <section class="view newcase">
      <div class="cardhead">
        <h1>New household</h1>
        <span class="spacer" />
        <a class="btn" href={buildHash({ ...r, view: "cases", arg: null, params: {} })}>
          All cases
        </a>
      </div>
      <div class="controls">
        {programs.map((p) => (
          <label key={p.id}>
            <input
              type="checkbox" data-program={p.id} checked={chosen.includes(p.id)}
              onChange={() => toggleProgram(p.id)}
            /> {p.id}
          </label>
        ))}
        <label>
          As of
          <input
            type="date" data-field="as_of" value={asOf.value}
            onInput={(e) => { asOf.value = (e.target as HTMLInputElement).value; }}
          />
        </label>
      </div>

      {outcomes.length === 0 ? (
        <p class="muted">Choose a program to see the facts its outcomes need.</p>
      ) : (
        <>
          <p class="muted">
            {outcomes.length} outcome{outcomes.length === 1 ? "" : "s"} need
            {" "}{supplied.length} supplied fact{supplied.length === 1 ? "" : "s"}. Anything
            left blank is unknown.
          </p>

          <label class="example">
            Try an example
            <select
              value={exampleId.value}
              onChange={(e) => applyExample((e.target as HTMLSelectElement).value)}
            >
              <option value="">choose a household…</option>
              {(vol.cases ?? []).filter(isRepresentableCase).map((c) => (
                <option key={c.id} value={c.id}>{c.id} {c.title}</option>
              ))}
            </select>
          </label>

          <h3>Facts about the person</h3>
          <FactFields engine={engine} items={personFacts} values={values.value} set={set} />

          <h3>Facts that hold in every month</h3>
          <FactFields engine={engine} items={monthFacts} values={values.value} set={set} />

          <h3>Parameters in force</h3>
          <ul class="params">
            {parameters.map((it) => (
              <li key={it.identifier}>
                {it.name} <code><Ident id={it.identifier} engine={engine} /></code>{" "}
                <b>{engine.fmt(engine.paramValue(it))}</b>
              </li>
            ))}
          </ul>

          <div class="actions">
            <button class="btn" onClick={evaluate}>Evaluate</button>
            <label>
              Title
              <input
                data-field="case_title" value={caseTitle.value}
                onInput={(e) => {
                  caseTitle.value = (e.target as HTMLInputElement).value;
                  staged.value = "";
                }}
              />
            </label>
            {modeSig.value === "edit" && (
              <button
                class="btn stage-case" disabled={!answer.value}
                title={answer.value
                  ? "Stage this household as a new case in tests/cases.yaml"
                  : "Evaluate the household first, so the expectations state what it does"}
                onClick={stage}
              >
                Stage as case
              </button>
            )}
            {modeSig.value === "edit" && staged.value && (
              <span class="ok">
                {staged.value} staged.{" "}
                <button class="linkish" onClick={() => { trayOpenSig.value = true; }}>
                  Open the tray
                </button>
              </span>
            )}
          </div>

          {answer.value && (
            <div class="outcomes">
              <h3>Outcomes</h3>
              {answer.value.map((o) => {
                const unknown = o.root.value === null || o.root.value === undefined;
                const unanswered = unknown ? missingFacts(o.root) : [];
                return (
                  <div key={o.identifier} class="outcome">
                    <h4>
                      {engine.item(o.identifier)?.name ?? o.identifier}{" "}
                      <code><Ident id={o.identifier} engine={engine} /></code>
                      {o.month && <span class="tag">{o.month}</span>}
                      <span class="tval">{formatFor(engine, o.identifier, o.root.value)}</span>
                    </h4>
                    {unanswered.length > 0 && (
                      <p class="unknown-hint muted">
                        Not answered:{" "}
                        {unanswered.map((m, i) => (
                          <span key={m.identifier}>
                            {i > 0 && ", "}
                            <button
                              type="button" class="linkish"
                              onClick={() => {
                                (document.getElementById(m.identifier) as HTMLElement | null)?.focus();
                              }}
                            >{m.name}</button>{" "}
                            <code><Ident id={m.identifier} engine={engine} /></code>
                          </span>
                        ))}
                      </p>
                    )}
                    <Trace engine={engine} node={o.root} route={r} />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Adding a stored household (`households/new`, edit mode). A stored
 *  household's own page, the list and each determination are
 *  places/HouseholdPage.tsx and places/Determination.tsx. */
export function CasesView() {
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  const r = route.value;
  if (!engine || !vol) return <p class="status">No ledger loaded.</p>;
  return <NewHousehold engine={engine} vol={vol} route={r} />;
}
