import {
  MONTH_RE, type Effective, type Item, type Kind, type Program, type RelationshipRoleDecl,
  type Scope, type TestSpec,
} from "../engine/types";
import type { Engine } from "../engine/engine";
import {
  evaluate, makeCase, relationshipEdges, statedRelationships, type TraceEvent,
} from "../engine/evaluate";
import { inForce } from "../engine/versions";
import { isRecordList, parseRecordFieldName, recordFieldName } from "../engine/records";
import type { PersonSpec, HouseholdCase } from "../engine/cases";
import type { LoadedVolume } from "../ledger/load";
import type { LedgerSource } from "../ledger/source";

/** One supplied fact a cannot-determine expectation was waiting on. */
export interface SuiteMissing { person: string | null; identifier: string; month: string | null }

export interface SuiteExpectation {
  person: string | null;
  identifier: string;
  month: string | null;
  value: unknown;
  /** `cannot-determine` cases only: the supplied facts the reference
   *  engine's evaluation found unstated, in the order its left-to-right,
   *  short-circuit evaluation asked for them. Informational: not graded,
   *  since an engine that evaluates eagerly will find more. */
  missing?: SuiteMissing[];
}

/** One input of a case, by person (null for a case-wide `month_facts` entry). */
export interface SuiteInput { person: string | null; identifier: string }

/** One input `buildSuite` dropped because no engine reads it, and why. */
export interface SuiteIgnored {
  person: string | null;
  identifier: string;
  reason:
    | "unknown identifier"      // no item in the volume has this identifier
    | "parameter"               // parameters are read from the ledger or `parameters`, never from a person
    | "not in force"            // the item's effective range does not cover as_of: it is unknown regardless
    | "scope"                   // a case- or global-scope item, or a non-month item under `months`
    | "undeclared person";      // a relationship triple names a person the case does not declare
}

export interface SuiteCase {
  id: string;
  kind: "rule-test" | "household" | "cannot-determine";
  as_of: string;
  parameters?: Record<string, unknown>;
  /** Case-wide (`month`-scope) supplied facts, keyed by month. A
   *  `month`-scope fact is never read per-person (see `evaluate.ts`'s
   *  `value()`), so it cannot live inside any person's `facts`/`months`. */
  month_facts?: Record<string, Record<string, unknown>>;
  /** Case-scope supplied facts, one value for the case as a whole, read by
   *  no person (see `evaluate.ts`'s `value()`). */
  case_facts?: Record<string, unknown>;
  persons: Record<string, PersonSpec>;
  expect: SuiteExpectation[];
  /** Derived identifiers the case states as inputs. A stated value for a
   *  derived item replaces its rule for that person (docs/conformance.md,
   *  "Stated values for derived items"). */
  overrides?: SuiteInput[];
  /** Inputs the source test or case stated that no engine reads, dropped
   *  from `persons` so an adapter never has to guess about them. */
  ignored?: SuiteIgnored[];
  /** The first and last month the reference engine read a per-month fact
   *  for while answering this case's expectations: the window a
   *  forward-chaining engine must materialise for it. Absent when it read
   *  no per-month fact. */
  months_read?: { from: string; to: string };
  /** Rule tests only. `unit` when the case states every derived item the
   *  tested item reads directly, so the item can be checked on its own;
   *  `integration` when the expectation also needs other derived items. */
  isolation?: "unit" | "integration";
  /** `cannot-determine` cases only: the case this one was made from and the
   *  supplied fact removed from it. */
  derived_from?: { case: string; removed: SuiteInput };
}

export interface SuiteItem {
  id: string;
  identifier: string;
  kind: Kind;
  program: Program;
  type: string;
  scope: Scope;
  /** `one of` items: the allowed values. */
  options?: string[];
  /** A list of records (`list of receipts`): the record schema, as in
   *  ledger.json. A case states the fact as a list of mappings of these
   *  fields; a field a record leaves out takes its `default`, and one with
   *  none is unknown (a missing entry names it `receipts[<i> <kind>].<field>`). */
  record_fields?: Item["record_fields"];
  /** "outcome" on a program result. */
  role?: string;
  /** The item's own effective range (`to` inclusive). */
  effective?: Effective;
  /** Derived items: the identifiers the derivation reads directly. */
  uses?: string[];
  implemented?: Item["implemented"];
  implemented_by?: string;
}

/** The date rules of docs/operators.md, Resolution, that decide which
 *  parameter version and which age a month reads (time audit T-1 and T-3).
 *  Bumped when either changes, so a suite says which contract it was built
 *  under. */
export const RESOLUTION = {
  contract: "month-v1",
  parameter_versions:
    "the version in force on the determination date outside a month; in a month-scoped evaluation, " +
    "on the determination date in the determination month and on the first day of any other month; " +
    "as_of names any other date",
  person_items:
    "a person or global derived item is one value per case, evaluated with no month in context " +
    "(its parameters on the determination date)",
  ages:
    "age is the age on the determination date; a month rule's age condition reads an age item " +
    "taken in the month evaluated (docs/operators.md, Ages in a month)",
  numbers:
    "two numbers within 1e-9 of each other are equal in <, <=, >, >= and =, the tolerance ceil, round " +
    "and band use (docs/operators.md, Comparison; coverage pass 5, C5-10)",
} as const;

export interface Suite {
  codex: { volume: string; sha: string; generated: string };
  /** The volume's determination date default and relationship roles, which
   *  an adapter needs to read the cases the way the codex does. */
  volume: {
    default_as_of: string;
    relationship_roles: RelationshipRoleDecl[];
    outcomes: string[];
    /** The resolution contract the expectations were computed under
     *  (docs/operators.md, Resolution), so an adapter can tell which one it
     *  must implement. */
    resolution: typeof RESOLUTION;
  };
  items: SuiteItem[];
  cases: SuiteCase[];
  /** One line per expectation whose stored value no longer matches what the
   *  codex evaluates today, or that the exported case does not reproduce; the
   *  suite always carries the codex's current evaluation as `expect[].value`,
   *  so a stale stored expectation is noted here rather than silently
   *  reproduced. Empty when the suite is current and self-consistent. */
  notes: string[];
  /** Program outcomes for which no cannot-determine case could be made by
   *  removing one supplied fact (the outcome has a default for every input
   *  the source cases state, or no source case expects it). */
  cannot_determine_gaps?: string[];
}

/** `scripts/conform.ts`'s output shape, at `conformance/<volume>/results.json`. */
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
 *  sentinel), so a `null` must equal a `null`. Groups are compared as ordered
 *  arrays: the codex lists a group's members in the order the case declares
 *  its persons. */
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

/** Reads a volume's conformance results from a source, or `null` when the
 *  ref has never had a conformance run committed (a 404, like any other
 *  missing file). Looks in `conformance/<volume>/results.json`, then in the
 *  single-volume location `conformance/results.json` (accepted only when it
 *  is for this volume). For the Program view: "Conformance: adapter X on
 *  codex@sha: passed/failed/unimplemented". */
export async function loadConformanceResults(
  src: LedgerSource, volumeId?: string,
): Promise<ConformanceResults | null> {
  const paths = volumeId
    ? [`conformance/${volumeId}/results.json`, "conformance/results.json"]
    : ["conformance/results.json"];
  for (const p of paths) {
    try {
      const r = JSON.parse(await src.readText(p)) as ConformanceResults;
      if (volumeId && p === "conformance/results.json" && r.codex?.volume !== volumeId) continue;
      return r;
    } catch {
      // try the next location
    }
  }
  return null;
}

const isMonthKeyedObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v) &&
  Object.keys(v as object).every((k) => MONTH_RE.test(k));

/** What a case's inputs say beyond their values: the derived items they
 *  state, and the inputs no engine reads. */
export interface Audit {
  overrides: Map<string, SuiteInput>;
  ignored: SuiteIgnored[];
}

function newAudit(): Audit { return { overrides: new Map(), ignored: [] }; }

function noteOverride(a: Audit, person: string | null, identifier: string): void {
  a.overrides.set(`${person ?? ""}|${identifier}`, { person, identifier });
}

function noteIgnored(a: Audit, i: SuiteIgnored): void {
  if (!a.ignored.some((x) => x.person === i.person && x.identifier === i.identifier && x.reason === i.reason)) {
    a.ignored.push(i);
  }
}

/** Why the engine would not read a stated value of `identifier` from a
 *  person's case data on `asOf`, or null when it would. `where` is the part
 *  of the person it was stated in. */
function unreadReason(
  engine: Engine, identifier: string, asOf: string, where: "facts" | "months",
): SuiteIgnored["reason"] | null {
  const it = engine.item(identifier);
  if (!it) return "unknown identifier";
  if (it.kind === "parameter") return "parameter";
  if (!inForce(it, asOf)) return "not in force";
  if (it.scope === "global") return "scope";
  if (where === "months" && it.scope !== "person-month") return "scope";
  return null;
}

/** Routes one stated fact into the shape a case's `persons` entry (or, for a
 *  `month`-scope fact, the case-wide `month_facts`) uses, mirroring the
 *  scope-based routing `makeCase`'s `setFact` performs: a person-month value
 *  keyed by month goes to `months`, a single value to the test's month or,
 *  with no test month, to `month_defaults` (every month). Inputs the engine
 *  would not read are dropped and recorded in the audit. */
function classifyFact(
  engine: Engine, audit: Audit, pid: string, person: PersonSpec,
  monthFacts: Record<string, Record<string, unknown>>,
  identifier: string, value: unknown, evalMonth: string | null, asOf: string,
  caseFacts: Record<string, unknown> = {},
): void {
  const it = engine.item(identifier);
  // A case-scope fact given on a rule test's person is the case's, as
  // makeCase routes it (determination_date is the case's as_of).
  if (it && it.scope === "case" && it.kind !== "parameter" && inForce(it, asOf)
    && identifier !== "determination_date") {
    caseFacts[identifier] = value;
    if (it.kind === "derived") noteOverride(audit, null, identifier);
    return;
  }
  if (it && it.scope === "month" && it.kind !== "parameter" && inForce(it, asOf)) {
    if (isMonthKeyedObject(value)) {
      for (const [m, mv] of Object.entries(value)) (monthFacts[m] ??= {})[identifier] = mv;
    } else if (evalMonth) {
      (monthFacts[evalMonth] ??= {})[identifier] = value;
    } else {
      throw new Error(`conformance: month-scope fact "${identifier}" needs a test month`);
    }
    if (it.kind === "derived") noteOverride(audit, null, identifier);
    return;
  }
  const reason = unreadReason(engine, identifier, asOf, "facts");
  if (reason) { noteIgnored(audit, { person: pid, identifier, reason }); return; }
  if (it!.kind === "derived") noteOverride(audit, pid, identifier);
  if (it!.scope === "person-month") {
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

/** Copies per-month values (`months`) and every-month values
 *  (`month_defaults`) onto a person, keeping only person-month items the
 *  engine reads there. */
function mergeMonthValues(
  engine: Engine, audit: Audit, pid: string, person: PersonSpec,
  months: Record<string, Record<string, unknown>> | undefined,
  defaults: Record<string, unknown> | undefined, asOf: string,
): void {
  for (const [k, v] of Object.entries(defaults || {})) {
    const reason = unreadReason(engine, k, asOf, "months");
    if (reason) { noteIgnored(audit, { person: pid, identifier: k, reason }); continue; }
    if (engine.item(k)!.kind === "derived") noteOverride(audit, pid, k);
    (person.month_defaults ??= {})[k] = v;
  }
  for (const [m, mf] of Object.entries(months || {})) {
    for (const [k, v] of Object.entries(mf)) {
      const reason = unreadReason(engine, k, asOf, "months");
      if (reason) { noteIgnored(audit, { person: pid, identifier: k, reason }); continue; }
      if (engine.item(k)!.kind === "derived") noteOverride(audit, pid, k);
      person.months ??= {};
      (person.months[m] ??= {})[k] = v;
    }
  }
}

/** One value stated in a case's `case_facts`: kept when the item is a
 *  case-scope fact the engine reads, else dropped and recorded. */
function classifyCaseFact(
  engine: Engine, audit: Audit, caseFacts: Record<string, unknown>,
  identifier: string, value: unknown, asOf: string,
): void {
  const it = engine.item(identifier);
  let reason: SuiteIgnored["reason"] | null = null;
  if (!it) reason = "unknown identifier";
  else if (it.kind === "parameter") reason = "parameter";
  else if (!inForce(it, asOf)) reason = "not in force";
  else if (it.scope !== "case" || identifier === "determination_date") reason = "scope";
  if (reason) { noteIgnored(audit, { person: null, identifier, reason }); return; }
  if (it!.kind === "derived") noteOverride(audit, null, identifier);
  caseFacts[identifier] = value;
}

function personFrom(
  engine: Engine, audit: Audit, pid: string,
  facts: Record<string, unknown> | undefined,
  relationships: Array<[string, string]> | undefined,
  monthDefaults: Record<string, unknown> | undefined,
  months: Record<string, Record<string, unknown>> | undefined,
  evalMonth: string | null, monthFacts: Record<string, Record<string, unknown>>, asOf: string,
  caseFacts: Record<string, unknown> = {},
): PersonSpec {
  const person: PersonSpec = {};
  if (relationships) person.relationships = relationships;
  mergeMonthValues(engine, audit, pid, person, undefined, monthDefaults, asOf);
  for (const [k, v] of Object.entries(facts || {})) {
    classifyFact(engine, audit, pid, person, monthFacts, k, v, evalMonth, asOf, caseFacts);
  }
  mergeMonthValues(engine, audit, pid, person, months, undefined, asOf);
  return person;
}

/** The persons with every case-level relationship edge recorded on both of
 *  them, exactly as `makeCase` expands the graph, so an adapter reads the
 *  household the codex evaluated. An edge is recorded only on a person the
 *  case declares: a person named only in a triple is not a person of the
 *  case (makeCase records nothing on them either), and is noted. Neither the
 *  persons passed in nor their own relationship lists are mutated. */
function withRelationshipEdges(
  persons: Record<string, PersonSpec>, rels: TestSpec["relationships"],
  inverseRole: Readonly<Record<string, string>>, audit: Audit,
): Record<string, PersonSpec> {
  const edges = relationshipEdges(rels, inverseRole);
  if (!edges.length) return persons;
  const out: Record<string, PersonSpec> = {};
  for (const [pid, p] of Object.entries(persons)) out[pid] = { ...p };
  for (const e of edges) {
    const person = out[e.person];
    if (!person) {
      noteIgnored(audit, { person: e.person, identifier: "relationships", reason: "undeclared person" });
      continue;
    }
    const list = [...(person.relationships ?? [])];
    if (!list.some(([r, other]) => r === e.role && other === e.other)) {
      list.push([e.role, e.other]);
    }
    person.relationships = list;
  }
  return out;
}

function finishAudit(sc: SuiteCase, audit: Audit): void {
  if (audit.overrides.size) sc.overrides = [...audit.overrides.values()];
  if (audit.ignored.length) sc.ignored = audit.ignored;
}

function staleNote(
  caseId: string, person: string | null, identifier: string, month: string | null, got: unknown,
): string {
  return (
    `${caseId} ${person ?? ""}.${identifier}${month ? "@" + month : ""}: ` +
    `stored expectation is stale (codex now evaluates ${JSON.stringify(got)})`
  );
}

/** The determination date a rule test is evaluated on: `makeCase` takes a
 *  `determination_date` stated in `given` over `as_of`, so the suite does. */
function ruleTestAsOf(engine: Engine, t: TestSpec): string {
  const d = t.given?.determination_date;
  return (typeof d === "string" && d) || t.as_of || engine.meta.default_as_of;
}

/** A rule test as a suite case's inputs, with no evaluation: what `makeCase`
 *  would build from it, normalised to the suite shape. Exported for `npm run
 *  check`, which reports the audit's ignored inputs as warnings. */
export function ruleTestInputs(engine: Engine, t: TestSpec): {
  as_of: string; persons: Record<string, PersonSpec>;
  month_facts: Record<string, Record<string, unknown>>;
  case_facts: Record<string, unknown>; audit: Audit;
} {
  const audit = newAudit();
  const asOf = ruleTestAsOf(engine, t);
  const monthFacts: Record<string, Record<string, unknown>> = {};
  for (const [m, mf] of Object.entries(t.month_facts || {})) {
    monthFacts[m] = { ...(monthFacts[m] || {}), ...mf };
  }
  const evalMonth = t.month ?? null;
  const caseFacts: Record<string, unknown> = {};
  const given = { ...(t.given || {}) };
  delete given.determination_date;
  const persons: Record<string, PersonSpec> = {
    p1: personFrom(
      engine, audit, "p1", given, statedRelationships(t.relationships), t.month_defaults,
      undefined, evalMonth, monthFacts, asOf, caseFacts,
    ),
  };
  for (const [pid, facts] of Object.entries(t.others || {})) {
    persons[pid] = personFrom(
      engine, audit, pid, facts, undefined, undefined, undefined, evalMonth, monthFacts, asOf, caseFacts,
    );
  }
  // `t.persons` is merged in after `others`, mirroring `makeCase`'s own
  // order (evaluate.ts): a person named here replaces whatever `others`
  // built for the same id, and its own `months` are layered on afterward.
  for (const [pid, p] of Object.entries(t.persons || {})) {
    persons[pid] = personFrom(
      engine, audit, pid, p.facts, p.relationships, p.month_defaults, p.months,
      evalMonth, monthFacts, asOf, caseFacts,
    );
  }
  for (const [k, v] of Object.entries(t.case_facts || {})) {
    classifyCaseFact(engine, audit, caseFacts, k, v, asOf);
  }
  return {
    as_of: asOf,
    persons: withRelationshipEdges(persons, t.relationships, engine.index.inverseRole, audit),
    month_facts: monthFacts,
    case_facts: caseFacts,
    audit,
  };
}

/** A household case as suite inputs, with no evaluation (see ruleTestInputs).
 *  Person-month facts stated once under `facts` are routed the way the
 *  engine routes them: to `month_defaults` (every month), or to `months` when
 *  keyed by month. */
export function householdInputs(engine: Engine, c: HouseholdCase): {
  persons: Record<string, PersonSpec>;
  month_facts: Record<string, Record<string, unknown>>;
  case_facts: Record<string, unknown>; audit: Audit;
} {
  const audit = newAudit();
  const monthFacts: Record<string, Record<string, unknown>> = {};
  for (const [m, mf] of Object.entries(c.month_facts || {})) monthFacts[m] = { ...mf };
  const caseFacts: Record<string, unknown> = {};
  const persons: Record<string, PersonSpec> = {};
  for (const [pid, p] of Object.entries(c.persons || {})) {
    persons[pid] = personFrom(
      engine, audit, pid, p.facts, p.relationships, p.month_defaults, p.months,
      null, monthFacts, c.as_of, caseFacts,
    );
  }
  for (const [k, v] of Object.entries(c.case_facts || {})) {
    classifyCaseFact(engine, audit, caseFacts, k, v, c.as_of);
  }
  return {
    persons: withRelationshipEdges(persons, c.relationships, engine.index.inverseRole, audit),
    month_facts: monthFacts,
    case_facts: caseFacts,
    audit,
  };
}

/** `unit` when every derived item the tested item reads directly is stated
 *  for some person of the case, else `integration`. */
function isolationOf(engine: Engine, it: Item, overrides: Map<string, SuiteInput>): "unit" | "integration" {
  const stated = new Set([...overrides.values()].map((o) => o.identifier));
  for (const u of engine.usesOfItem(it.identifier)) {
    const dep = engine.item(u);
    if (dep && dep.kind === "derived" && !stated.has(u)) return "integration";
  }
  return "unit";
}

function caseData(engine: Engine, sc: SuiteCase) {
  return makeCase(engine.index, {
    id: sc.id, as_of: sc.as_of, parameters: sc.parameters, month_facts: sc.month_facts,
    case_facts: sc.case_facts, persons: sc.persons,
  });
}

/** Evaluates a suite case's expectations from the suite form itself, as an
 *  adapter would, with a trace: the months it read, and a note for any
 *  expectation the suite form does not reproduce. */
function replay(engine: Engine, sc: SuiteCase, notes: string[]): void {
  const data = caseData(engine, sc);
  let lo: string | null = null;
  let hi: string | null = null;
  for (const e of sc.expect) {
    let got: unknown;
    try {
      got = evaluate(engine.index, data, e.identifier, e.person, e.month, (ev: TraceEvent) => {
        if (ev.month && ev.kind !== "decision") {
          if (lo === null || ev.month < lo) lo = ev.month;
          if (hi === null || ev.month > hi) hi = ev.month;
        }
      });
    } catch (ex) {
      got = `error: ${(ex as Error).message}`;
    }
    if (!valuesMatch(JSON.parse(JSON.stringify(got ?? null)), e.value)) {
      notes.push(
        `${sc.id} ${e.person ?? ""}.${e.identifier}${e.month ? "@" + e.month : ""}: ` +
          `the exported case does not reproduce the codex's value ` +
          `(${JSON.stringify(e.value)}; the suite form evaluates ${JSON.stringify(got)})`,
      );
    }
  }
  if (lo !== null && hi !== null) sc.months_read = { from: lo, to: hi };
}

function ruleTestCase(engine: Engine, it: Item, t: TestSpec): { suiteCase: SuiteCase; notes: string[] } {
  const notes: string[] = [];
  const inputs = ruleTestInputs(engine, t);
  const evalMonth = t.month ?? null;
  const { got, ok, err } = engine.runTest(it, t);
  const person = ["global", "case", "month"].includes(it.scope) ? null : "p1";
  if (err) notes.push(`${t.id} ${person ?? ""}.${it.identifier}: evaluation error: ${err}`);
  else if (!ok) notes.push(staleNote(t.id, person, it.identifier, evalMonth, got));

  // JSON has no NaN or Infinity; the suite carries what JSON.stringify would.
  const value = err ? null : JSON.parse(JSON.stringify(got ?? null));
  const suiteCase: SuiteCase = {
    id: t.id,
    kind: "rule-test",
    as_of: inputs.as_of,
    persons: inputs.persons,
    expect: [{ person, identifier: it.identifier, month: evalMonth, value }],
  };
  if (t.parameters) suiteCase.parameters = t.parameters;
  if (Object.keys(inputs.month_facts).length) suiteCase.month_facts = inputs.month_facts;
  if (Object.keys(inputs.case_facts).length) suiteCase.case_facts = inputs.case_facts;
  finishAudit(suiteCase, inputs.audit);
  suiteCase.isolation = isolationOf(engine, it, inputs.audit.overrides);
  return { suiteCase, notes };
}

function householdSuiteCase(
  engine: Engine, c: HouseholdCase, knownFailures: ReadonlySet<string> = new Set(),
): { suiteCase: SuiteCase; notes: string[] } {
  const notes: string[] = [];
  const report = engine.runCase(c);
  const expect: SuiteExpectation[] = report.results.map((r) => {
    // A stored expectation listed in conformance/known-failures.json (the
    // `case:person:identifier[@month]` key npm run check uses) is a tracked
    // gap between the rule and the codex, not a stale pin: no note. The suite
    // still carries the codex's own value, as for every case.
    const known = knownFailures.has(`${c.id}:${r.person}:${r.identifier}${r.month ? `@${r.month}` : ""}`);
    if (r.err) notes.push(`${c.id} ${r.person}.${r.identifier}: evaluation error: ${r.err}`);
    else if (!r.ok && !known) notes.push(staleNote(c.id, r.person, r.identifier, r.month, r.got));
    return {
      person: r.person, identifier: r.identifier, month: r.month,
      value: r.err ? null : JSON.parse(JSON.stringify(r.got ?? null)),
    };
  });
  const inputs = householdInputs(engine, c);
  const suiteCase: SuiteCase = {
    id: c.id, kind: "household", as_of: c.as_of, persons: inputs.persons, expect,
  };
  if (c.parameters) suiteCase.parameters = c.parameters;
  if (Object.keys(inputs.month_facts).length) suiteCase.month_facts = inputs.month_facts;
  if (Object.keys(inputs.case_facts).length) suiteCase.case_facts = inputs.case_facts;
  finishAudit(suiteCase, inputs.audit);
  return { suiteCase, notes };
}

function clonePersons(persons: Record<string, PersonSpec>): Record<string, PersonSpec> {
  return JSON.parse(JSON.stringify(persons)) as Record<string, PersonSpec>;
}

/** Removes every stated value of one supplied fact from one person. */
function removeFact(p: PersonSpec, identifier: string): void {
  if (p.facts) delete p.facts[identifier];
  if (p.month_defaults) delete p.month_defaults[identifier];
  for (const mf of Object.values(p.months || {})) delete mf[identifier];
}

/** How many supplied facts are tried per source expectation before moving
 *  on; most outcomes turn unknown at the first or second. */
const MAX_REMOVALS = 12;

/** For each program outcome, one case whose expected value is unknown
 *  ("cannot determine"): an existing household case (or, failing that, one
 *  of the outcome's own rule tests) with one supplied fact the outcome's
 *  evaluation read removed. The supplied facts tried first are the ones that
 *  decided the value. */
function cannotDetermineCases(engine: Engine, base: SuiteCase[]): {
  cases: SuiteCase[]; gaps: string[];
} {
  const outcomes = [...new Set((engine.meta.programs || []).flatMap((p) => p.outcomes || []))]
    .filter((o) => engine.item(o));
  const cases: SuiteCase[] = [];
  const gaps: string[] = [];
  const household = base.filter((c) => c.kind === "household");
  for (const outcome of outcomes) {
    const it = engine.item(outcome)!;
    const sources: Array<{ sc: SuiteCase; e: SuiteExpectation }> = [];
    for (const sc of household) {
      for (const e of sc.expect) if (e.identifier === outcome && e.value !== null) sources.push({ sc, e });
    }
    for (const t of it.tests || []) {
      const sc = base.find((c) => c.id === t.id && c.kind === "rule-test");
      const e = sc?.expect[0];
      if (sc && e && e.value !== null) sources.push({ sc, e });
    }
    let made: SuiteCase | null = null;
    for (const { sc, e } of sources) {
      const data = caseData(engine, sc);
      // person null: a case- or month-scope fact, removed from case_facts
      // or from every month of month_facts.
      const read: Array<{ person: string | null; identifier: string; decisive: boolean }> = [];
      try {
        evaluate(engine.index, data, outcome, e.person, e.month, (ev) => {
          const personFact = ev.kind === "supplied" && ev.person &&
            (ev.origin === "case" || ev.origin === "default");
          const caseFact = (ev.kind === "case" || ev.kind === "month") && ev.origin === "case" &&
            ev.identifier !== "determination_date" && engine.item(ev.identifier)?.kind === "supplied";
          if (personFact || caseFact) {
            const person = personFact ? ev.person : null;
            if (!read.some((r) => r.person === person && r.identifier === ev.identifier)) {
              read.push({ person, identifier: ev.identifier, decisive: !!ev.decisive });
            }
          }
        });
      } catch {
        continue;
      }
      const ordered = [...read.filter((r) => r.decisive), ...read.filter((r) => !r.decisive)]
        .slice(0, MAX_REMOVALS);
      // A list of records is tried field by field first: one record's
      // amount removed (named receipts[<i> <kind>].amount), then the list.
      const removals: Array<{ person: string | null; identifier: string; field?: { index: number } }> = [];
      for (const r of ordered) {
        if (r.person !== null && isRecordList(engine.item(r.identifier))) {
          const list = sc.persons[r.person]?.facts?.[r.identifier];
          if (Array.isArray(list)) {
            list.slice(0, MAX_REMOVALS).forEach((rec, index) => {
              if (rec && typeof rec === "object" && (rec as Record<string, unknown>).amount !== undefined) {
                removals.push({
                  person: r.person,
                  identifier: recordFieldName(r.identifier, index, (rec as Record<string, unknown>).kind, "amount"),
                  field: { index },
                });
              }
            });
          }
        }
        removals.push(r);
      }
      for (const r of removals.slice(0, 2 * MAX_REMOVALS)) {
        const persons = clonePersons(sc.persons);
        if (r.person !== null && r.field) {
          const name = parseRecordFieldName(r.identifier)!;
          const rec = (persons[r.person].facts![name.list] as Array<Record<string, unknown>>)[r.field.index];
          delete rec.amount;
        } else if (r.person !== null) removeFact(persons[r.person], r.identifier);
        const candidate: SuiteCase = {
          id: `${sc.id}-U-${outcome}`,
          kind: "cannot-determine",
          as_of: sc.as_of,
          persons,
          expect: [],
          derived_from: { case: sc.id, removed: { person: r.person, identifier: r.identifier } },
        };
        if (sc.parameters) candidate.parameters = sc.parameters;
        if (sc.month_facts) {
          candidate.month_facts = {};
          for (const [m, mf] of Object.entries(sc.month_facts)) {
            const copy = { ...mf };
            if (r.person === null) delete copy[r.identifier];
            candidate.month_facts[m] = copy;
          }
        }
        if (sc.case_facts) {
          candidate.case_facts = { ...sc.case_facts };
          if (r.person === null) delete candidate.case_facts[r.identifier];
        }
        if (sc.overrides) candidate.overrides = sc.overrides;
        const missing: SuiteMissing[] = [];
        let got: unknown;
        try {
          got = evaluate(engine.index, caseData(engine, candidate), outcome, e.person, e.month, (ev) => {
            if ((ev.kind === "supplied" || ev.kind === "case" || ev.kind === "month") && ev.origin === "missing" &&
              !missing.some((x) => x.person === ev.person && x.identifier === ev.identifier)) {
              missing.push({ person: ev.person, identifier: ev.identifier, month: ev.month });
            }
          });
        } catch {
          continue;
        }
        if (got !== null) continue;
        candidate.expect = [{ person: e.person, identifier: outcome, month: e.month, value: null, missing }];
        made = candidate;
        break;
      }
      if (made) break;
    }
    if (made) cases.push(made);
    else gaps.push(outcome);
  }
  return { cases, gaps };
}

export interface BuildSuiteOptions {
  /** Add one cannot-determine case per program outcome (default true). */
  cannotDetermine?: boolean;
  /** Keys from conformance/known-failures.json: a household expectation
   *  listed there that the codex does not meet adds no stale-expectation note
   *  (npm run check tracks it as a known failure instead). */
  knownFailures?: readonly string[];
  /** Re-evaluate every case from its exported form: records `months_read`
   *  and notes any expectation the export does not reproduce (default true). */
  replay?: boolean;
}

/** Builds the engine-agnostic conformance suite: every rule test (normalised
 *  to the same `{persons, expect}` shape a household case already has),
 *  every household case, and one cannot-determine case per program outcome,
 *  each `expect` value the codex's own evaluation today (never the
 *  possibly-stale stored expectation — see `notes`). */
export function buildSuite(
  engine: Engine, volume: LoadedVolume, sha: string, opts: BuildSuiteOptions = {},
): Suite {
  const items: SuiteItem[] = engine.items().map((it) => {
    const item: SuiteItem = {
      id: it.id, identifier: it.identifier, kind: it.kind, program: it.program,
      type: it.type, scope: it.scope,
    };
    if (it.options && it.options.length) item.options = [...it.options];
    if (it.record_fields) item.record_fields = it.record_fields;
    if (it.role) item.role = it.role;
    if (it.effective) item.effective = it.effective;
    if (it.kind === "derived") item.uses = engine.usesOfItem(it.identifier);
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
  const known = new Set(opts.knownFailures ?? []);
  for (const c of volume.cases) {
    const { suiteCase, notes: n } = householdSuiteCase(engine, c, known);
    cases.push(suiteCase);
    notes.push(...n);
  }
  let gaps: string[] | undefined;
  if (opts.cannotDetermine !== false) {
    const cd = cannotDetermineCases(engine, cases);
    cases.push(...cd.cases);
    gaps = cd.gaps;
  }
  if (opts.replay !== false) for (const sc of cases) replay(engine, sc, notes);

  const meta = engine.meta;
  const suite: Suite = {
    codex: { volume: volume.volumeId, sha, generated: new Date().toISOString() },
    volume: {
      default_as_of: meta.default_as_of,
      relationship_roles: engine.index.roles
        ? engine.index.roles.map((r) => ({ ...r }))
        : Object.entries(engine.index.inverseRole).map(([id, inverse]) => ({ id, inverse })),
      outcomes: [...new Set((meta.programs || []).flatMap((p) => p.outcomes || []))],
      resolution: RESOLUTION,
    },
    items,
    cases,
    notes,
  };
  if (gaps) suite.cannot_determine_gaps = gaps;
  return suite;
}
