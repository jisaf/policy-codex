import { MONTH_RE, type Item, type Kind, type Program, type TestSpec } from "../engine/types";
import type { Engine } from "../engine/engine";
import type { PersonSpec, HouseholdCase } from "../engine/cases";
import type { LoadedVolume } from "../ledger/load";
import type { LedgerSource } from "../ledger/source";

export interface SuiteExpectation {
  person: string | null;
  identifier: string;
  month: string | null;
  value: unknown;
}

export interface SuiteCase {
  id: string;
  kind: "rule-test" | "household";
  as_of: string;
  parameters?: Record<string, unknown>;
  /** Case-wide (`month`-scope) supplied facts, keyed by month. Not in the
   *  brief's sketch of this interface, but required for fidelity: a
   *  `month`-scope fact is never read per-person (see `evaluate.ts`'s
   *  `value()`), so it cannot live inside any person's `facts`/`months`. */
  month_facts?: Record<string, Record<string, unknown>>;
  persons: Record<string, PersonSpec>;
  expect: SuiteExpectation[];
}

export interface SuiteItem {
  id: string;
  identifier: string;
  kind: Kind;
  program: Program;
  implemented?: Item["implemented"];
  implemented_by?: string;
}

export interface Suite {
  codex: { volume: string; sha: string; generated: string };
  items: SuiteItem[];
  cases: SuiteCase[];
  /** One line per expectation whose stored value no longer matches what the
   *  codex evaluates today; the suite always carries the codex's current
   *  evaluation as `expect[].value`, so a stale stored expectation is noted
   *  here rather than silently reproduced. */
  notes: string[];
}

/** `scripts/conform.ts`'s output shape, at `conformance/results.json`. */
export interface ConformanceResults {
  codex: { volume: string; sha: string; generated: string };
  adapter: string;
  summary: { cases: number; checked: number; passed: number; failed: number; unimplemented: number };
  failures: Array<{
    case: string; person: string | null; identifier: string; month: string | null;
    expected: unknown; got: unknown;
  }>;
}

/** One value an adapter reports for one expectation. `person`/`month` are
 *  carried again (not just `value`) so `expKey` can match an adapter's
 *  answer back to the expectation it answers, independent of order. */
export interface AdapterValue {
  person: string | null; identifier: string; month: string | null; value: unknown;
}

/** Deep equality between two of the suite's own values, with float
 *  tolerance. Unlike `src/engine/values.ts`'s `valuesEqual`, both sides here
 *  are real evaluated values (never the ledger's `"unknown"` authoring
 *  sentinel), so a `null` must equal a `null`. */
export function valuesMatch(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => valuesMatch(x, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

export function expKey(e: { person: string | null; identifier: string; month: string | null }): string {
  return `${e.person ?? ""}|${e.identifier}|${e.month ?? ""}`;
}

export interface GradeResult {
  passed: number;
  failed: number;
  /** an expectation the adapter reported no value for at all: `scripts/
   *  adapters/codex-self-lib.ts` (and any adapter) omits the entry rather
   *  than reporting `value: null`, so an unknown identifier is graded as
   *  unimplemented, never as a spurious pass or fail against `null`. */
  unimplemented: number;
  failures: ConformanceResults["failures"];
}

/** Grades one case's expectations against one adapter's answers for it.
 *  Shared by `scripts/conform.ts` (the CLI) and tests, so both agree on what
 *  counts as passed, failed, or unimplemented. */
export function gradeCase(c: SuiteCase, values: readonly AdapterValue[]): GradeResult {
  const byKey = new Map(values.map((v) => [expKey(v), v.value]));
  let passed = 0;
  let failed = 0;
  let unimplemented = 0;
  const failures: ConformanceResults["failures"] = [];
  for (const e of c.expect) {
    const k = expKey(e);
    if (!byKey.has(k)) { unimplemented++; continue; }
    const got = byKey.get(k);
    if (valuesMatch(got, e.value)) passed++;
    else {
      failed++;
      failures.push({
        case: c.id, person: e.person, identifier: e.identifier, month: e.month,
        expected: e.value, got,
      });
    }
  }
  return { passed, failed, unimplemented, failures };
}

/** Reads `conformance/results.json` from a volume's source, or `null` when
 *  the ref has never had a conformance run committed (a 404, like any other
 *  missing file). For the Program view: "Conformance: adapter X on
 *  codex@sha: passed/failed/unimplemented". */
export async function loadConformanceResults(src: LedgerSource): Promise<ConformanceResults | null> {
  try {
    return JSON.parse(await src.readText("conformance/results.json")) as ConformanceResults;
  } catch {
    return null;
  }
}

const isMonthKeyedObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) &&
  Object.keys(v as object).every((k) => MONTH_RE.test(k));

/** Routes one `given`/`others` fact into the shape a case's `persons` entry
 *  (or, for a `month`-scope fact, the case-wide `month_facts`) uses, mirroring
 *  the scope-based routing `makeCase`'s `setFact` performs. */
function classifyFact(
  engine: Engine, person: PersonSpec, monthFacts: Record<string, Record<string, unknown>>,
  identifier: string, value: unknown, evalMonth: string | null,
): void {
  const scope = engine.item(identifier)?.scope;
  if (scope === "month") {
    if (isMonthKeyedObject(value)) {
      for (const [m, mv] of Object.entries(value)) (monthFacts[m] ??= {})[identifier] = mv;
    } else if (evalMonth) {
      (monthFacts[evalMonth] ??= {})[identifier] = value;
    } else {
      throw new Error(`conformance: month-scope fact "${identifier}" needs a test month`);
    }
    return;
  }
  if (scope === "person-month") {
    if (isMonthKeyedObject(value)) {
      person.months ??= {};
      for (const [m, mv] of Object.entries(value)) (person.months[m] ??= {})[identifier] = mv;
    } else if (evalMonth) {
      person.months ??= {};
      (person.months[evalMonth] ??= {})[identifier] = value;
    } else {
      person.month_defaults ??= {};
      person.month_defaults[identifier] = value;
    }
    return;
  }
  person.facts ??= {};
  person.facts[identifier] = value;
}

function personFromGiven(
  engine: Engine, facts: Record<string, unknown> | undefined,
  relationships: Array<[string, string]> | undefined,
  monthDefaults: Record<string, unknown> | undefined,
  evalMonth: string | null, monthFacts: Record<string, Record<string, unknown>>,
): PersonSpec {
  const person: PersonSpec = {};
  if (relationships) person.relationships = relationships;
  if (monthDefaults && Object.keys(monthDefaults).length) person.month_defaults = { ...monthDefaults };
  for (const [k, v] of Object.entries(facts || {})) classifyFact(engine, person, monthFacts, k, v, evalMonth);
  return person;
}

function staleNote(
  caseId: string, person: string | null, identifier: string, month: string | null, got: unknown,
): string {
  return (
    `${caseId} ${person ?? ""}.${identifier}${month ? "@" + month : ""}: ` +
    `stored expectation is stale (codex now evaluates ${JSON.stringify(got)})`
  );
}

function ruleTestCase(engine: Engine, it: Item, t: TestSpec): { suiteCase: SuiteCase; notes: string[] } {
  const notes: string[] = [];
  const monthFacts: Record<string, Record<string, unknown>> = {};
  for (const [m, mf] of Object.entries(t.month_facts || {})) {
    monthFacts[m] = { ...(monthFacts[m] || {}), ...mf };
  }
  const evalMonth = t.month ?? null;
  const persons: Record<string, PersonSpec> = {
    p1: personFromGiven(engine, t.given, t.relationships, t.month_defaults, evalMonth, monthFacts),
  };
  for (const [pid, facts] of Object.entries(t.others || {})) {
    persons[pid] = personFromGiven(engine, facts, undefined, undefined, evalMonth, monthFacts);
  }
  // `t.persons` is merged in after `others`, mirroring `makeCase`'s own
  // order (evaluate.ts): a person named here replaces whatever `others`
  // built for the same id, and its own `months` are layered on afterward.
  for (const [pid, p] of Object.entries(t.persons || {})) {
    const person = personFromGiven(
      engine, p.facts, p.relationships, p.month_defaults, evalMonth, monthFacts,
    );
    for (const [m, mf] of Object.entries(p.months || {})) {
      person.months ??= {};
      for (const [k, v] of Object.entries(mf)) (person.months[m] ??= {})[k] = v;
    }
    persons[pid] = person;
  }
  const { got, ok, err } = engine.runTest(it, t);
  const person = ["global", "case", "month"].includes(it.scope) ? null : "p1";
  if (err) notes.push(`${t.id} ${person ?? ""}.${it.identifier}: evaluation error: ${err}`);
  else if (!ok) notes.push(staleNote(t.id, person, it.identifier, evalMonth, got));

  const suiteCase: SuiteCase = {
    id: t.id,
    kind: "rule-test",
    as_of: t.as_of || engine.meta.default_as_of,
    persons,
    expect: [{ person, identifier: it.identifier, month: evalMonth, value: err ? null : got }],
  };
  if (t.parameters) suiteCase.parameters = t.parameters;
  if (Object.keys(monthFacts).length) suiteCase.month_facts = monthFacts;
  return { suiteCase, notes };
}

function householdSuiteCase(engine: Engine, c: HouseholdCase): { suiteCase: SuiteCase; notes: string[] } {
  const notes: string[] = [];
  const report = engine.runCase(c);
  const expect: SuiteExpectation[] = report.results.map((r) => {
    if (r.err) notes.push(`${c.id} ${r.person}.${r.identifier}: evaluation error: ${r.err}`);
    else if (!r.ok) notes.push(staleNote(c.id, r.person, r.identifier, r.month, r.got));
    return { person: r.person, identifier: r.identifier, month: r.month, value: r.err ? null : r.got };
  });
  const suiteCase: SuiteCase = { id: c.id, kind: "household", as_of: c.as_of, persons: c.persons, expect };
  if (c.parameters) suiteCase.parameters = c.parameters;
  if (c.month_facts) suiteCase.month_facts = c.month_facts;
  return { suiteCase, notes };
}

/** Builds the engine-agnostic conformance suite: every rule test (normalised
 *  to the same `{persons, expect}` shape a household case already has) and
 *  every household case, each `expect` value the codex's own evaluation
 *  today (never the possibly-stale stored expectation — see `notes`). */
export function buildSuite(engine: Engine, volume: LoadedVolume, sha: string): Suite {
  const items: SuiteItem[] = engine.items().map((it) => {
    const item: SuiteItem = { id: it.id, identifier: it.identifier, kind: it.kind, program: it.program };
    if (it.implemented) item.implemented = it.implemented;
    if (it.implemented_by) item.implemented_by = it.implemented_by;
    return item;
  });

  const cases: SuiteCase[] = [];
  const notes: string[] = [];
  for (const it of engine.items()) {
    for (const t of it.tests || []) {
      const { suiteCase, notes: n } = ruleTestCase(engine, it, t);
      cases.push(suiteCase);
      notes.push(...n);
    }
  }
  for (const c of volume.cases) {
    const { suiteCase, notes: n } = householdSuiteCase(engine, c);
    cases.push(suiteCase);
    notes.push(...n);
  }

  return {
    codex: { volume: volume.volumeId, sha, generated: new Date().toISOString() },
    items,
    cases,
    notes,
  };
}
