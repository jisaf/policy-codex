import { DEFAULT_INVERSE_ROLE, indexWith, type LedgerIndex } from "./ledger-index";
import { valuesEqual } from "./values";
import { inForce, paramInForce, versionInForce } from "./versions";
import { DATE_RE, MONTH_RE, type Expr, type Item, type TestSpec } from "./types";

export interface CaseData {
  det: string;
  persons: Record<string, Record<string, unknown>>;
  months: Record<string, Record<string, Record<string, unknown>>>;
  monthDefaults: Record<string, Record<string, unknown>>;
  rels: Record<string, Array<[string, string]> | null>;
  monthFacts: Record<string, Record<string, unknown>>;
  monthFactsDefault: Record<string, unknown>;
  /** Case-scope supplied facts: one value for the application as a whole
   *  (an application date, the home's utility costs), stated once. */
  caseFacts: Record<string, unknown>;
  params: Record<string, unknown>;
}

export interface TestResult {
  ok: boolean; got: unknown; err: string | null;
  /** Unknowns the evaluation produced with no unstated supplied fact behind
   *  them (see EvalWarning), one line each. Absent when there were none. */
  warnings?: string[];
}

/** An unknown the evaluator produced although no supplied fact was missing:
 *  a table lookup whose key has no row, a versioned parameter with no version
 *  in force on the date it is read on, a division by zero, or a number that
 *  is not finite (NaN or Infinity, stated in a case or produced by
 *  arithmetic), which is never an answer. Each is
 *  reported (to the `warn` hook, and on the derived fact's trace event) so it
 *  is never a silent "cannot determine". */
export interface EvalWarning {
  kind: "lookup-miss" | "no-version" | "division-by-zero" | "non-finite";
  /** The derived fact whose rule hit it, or the parameter with no version. */
  identifier: string;
  person: string | null;
  month: string | null;
  detail: string;
}

export type WarnHook = (w: EvalWarning) => void;

/** One warning as a single line, for check output and test results. */
export function formatWarning(w: EvalWarning): string {
  const at = (w.person ? " " + w.person : "") + (w.month ? " @" + w.month : "");
  return `${w.kind}: ${w.identifier}${at}: ${w.detail}`;
}

export function addMonths(m: string, n: number): string {
  const y = +m.slice(0, 4);
  const mo = +m.slice(5, 7);
  const idx = y * 12 + (mo - 1) + n;
  return `${String(Math.floor(idx / 12)).padStart(4, "0")}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

export function monthsEnding(n: number, m: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(addMonths(m, -(n - 1 - i)));
  return out;
}

export function monthsFromTo(a: string, b: string): string[] {
  const out: string[] = [];
  let c = a;
  while (c <= b) { out.push(c); c = addMonths(c, 1); }
  return out;
}

/** The calendar date N days after a date (N may be negative), in the
 *  proleptic Gregorian calendar, computed in UTC so no time zone shifts it. */
export function addDays(d: string, n: number): string {
  const t = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** The number of calendar days from the first date to the second (negative
 *  when the second is earlier), computed in UTC like addDays. */
export function daysBetween(d1: string, d2: string): number {
  const t1 = Date.UTC(+d1.slice(0, 4), +d1.slice(5, 7) - 1, +d1.slice(8, 10));
  const t2 = Date.UTC(+d2.slice(0, 4), +d2.slice(5, 7) - 1, +d2.slice(8, 10));
  return Math.round((t2 - t1) / 86400000);
}

function leap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function yearsBetween(d1: string, d2: string): number {
  const y1 = +d1.slice(0, 4), m1 = +d1.slice(5, 7), dd1 = +d1.slice(8, 10);
  const y2 = +d2.slice(0, 4), m2 = +d2.slice(5, 7), dd2 = +d2.slice(8, 10);
  let years = y2 - y1;
  let am = m1, ad = dd1;
  if (m1 === 2 && dd1 === 29 && !leap(y2)) { am = 3; ad = 1; }
  if (m2 < am || (m2 === am && dd2 < ad)) years -= 1;
  return years;
}

/** The default relationship-role inverses (see ledger-index.ts). A volume
 *  that declares `relationship_roles` in volume.yaml uses its own table, which
 *  the index carries as `ix.inverseRole`; this name is kept for callers that
 *  have no index. */
export const INVERSE_ROLE: Readonly<Record<string, string>> = DEFAULT_INVERSE_ROLE;

/** One relationship as the person it is recorded on states it. */
export interface RelationshipEdge { person: string; role: string; other: string }

/** The `[role, other]` pairs a spec states for the person named first, or
 *  undefined when the spec states no relationships at all (which is not the
 *  same as stating none: unstated relationships are unknown). */
export function statedRelationships(
  rels: TestSpec["relationships"],
): Array<[string, string]> | undefined {
  if (rels === undefined) return undefined;
  return rels.filter((r) => r.length === 2).map((r) => [r[0], r[1]] as [string, string]);
}

/** Every case-level `[role, from, to]` edge of a spec, each with its inverse,
 *  as the entries the two persons carry. */
export function relationshipEdges(
  rels: TestSpec["relationships"],
  inverseRole: Readonly<Record<string, string>> = DEFAULT_INVERSE_ROLE,
): RelationshipEdge[] {
  const out: RelationshipEdge[] = [];
  for (const r of rels ?? []) {
    if (r.length !== 3) continue;
    const [role, from, to] = r;
    out.push({ person: from, role, other: to });
    const inverse = inverseRole[role];
    if (inverse) out.push({ person: to, role: inverse, other: from });
  }
  return out;
}

export function makeCase(ix: LedgerIndex, spec: TestSpec & { as_of?: string }): CaseData {
  const given = spec.given || {};
  const c: CaseData = {
    det: (given.determination_date as string) || spec.as_of || "2027-03-15",
    persons: {}, months: {}, monthDefaults: {}, rels: {},
    monthFacts: {}, monthFactsDefault: {}, caseFacts: {}, params: spec.parameters || {},
  };
  function setFact(pid: string, k: string, v: unknown, testMonth: string | null) {
    const it = ix.byIdentifier.get(k);
    if (!it) return;
    if (it.scope === "person-month") {
      if (
        v && typeof v === "object" && !Array.isArray(v) &&
        Object.keys(v as object).every((x) => MONTH_RE.test(x))
      ) {
        for (const [m, mv] of Object.entries(v as Record<string, unknown>)) {
          (c.months[pid][m] = c.months[pid][m] || {})[k] = mv;
        }
      } else if (testMonth == null) c.monthDefaults[pid][k] = v;
      else (c.months[pid][testMonth] = c.months[pid][testMonth] || {})[k] = v;
    } else if (it.scope === "month") {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        for (const [m, mv] of Object.entries(v as Record<string, unknown>)) {
          (c.monthFacts[m] = c.monthFacts[m] || {})[k] = mv;
        }
      } else if (testMonth == null) c.monthFactsDefault[k] = v;
      else (c.monthFacts[testMonth] = c.monthFacts[testMonth] || {})[k] = v;
    } else if (it.scope === "case") {
      // A case-scope fact is the case's, whichever person a rule test
      // gives it on: one value for the application as a whole.
      if (k !== "determination_date") c.caseFacts[k] = v;
    } else c.persons[pid][k] = v;
  }
  function addPerson(
    pid: string, facts: Record<string, unknown> | undefined,
    rels: Array<[string, string]> | undefined, mdef: Record<string, unknown> | undefined,
  ) {
    c.persons[pid] = {};
    c.months[pid] = {};
    c.monthDefaults[pid] = Object.assign({}, mdef || {});
    c.rels[pid] = rels === undefined ? null : rels;
    for (const [k, v] of Object.entries(facts || {})) setFact(pid, k, v, spec.month ?? null);
  }
  // A rule test's own person is p1. A household case that names its persons
  // and gives no p1 has no p1: an empty phantom person would join every
  // `persons` group with unknown facts.
  const phantomOnly = spec.persons !== undefined && !("p1" in spec.persons) &&
    spec.given === undefined && spec.others === undefined && spec.month_defaults === undefined;
  if (!phantomOnly) {
    addPerson("p1", spec.given, statedRelationships(spec.relationships), spec.month_defaults);
  }
  for (const [pid, facts] of Object.entries(spec.others || {})) {
    addPerson(pid, facts, undefined, {});
  }
  for (const [pid, p] of Object.entries(spec.persons || {})) {
    addPerson(pid, p.facts || {}, p.relationships, p.month_defaults);
    for (const [m, mf] of Object.entries(p.months || {})) {
      for (const [k, v] of Object.entries(mf)) {
        (c.months[pid][m] = c.months[pid][m] || {})[k] = v;
      }
    }
  }
  for (const [m, mf] of Object.entries(spec.month_facts || {})) {
    c.monthFacts[m] = Object.assign({}, c.monthFacts[m] || {}, mf);
  }
  for (const [k, v] of Object.entries(spec.case_facts || {})) {
    const it = ix.byIdentifier.get(k);
    if (it && it.scope === "case" && k !== "determination_date") c.caseFacts[k] = v;
  }
  // The case-level graph is expanded last, so an edge reaches a person whose
  // own pairs are already in place and adds only what they do not say. An
  // edge is recorded only on a person the case declares: a person named in
  // a triple alone is not a person of the case and carries no relationships
  // (the declared person's half of the edge still names them).
  for (const e of relationshipEdges(spec.relationships, ix.inverseRole)) {
    if (!(e.person in c.persons)) continue;
    const list = c.rels[e.person] ?? (c.rels[e.person] = []);
    if (!list.some(([r, other]) => r === e.role && other === e.other)) {
      list.push([e.role, e.other]);
    }
  }
  return c;
}

/** One resolution the evaluator performed, emitted after the value is known,
 *  or one decision an operator made between the resolutions it asked for.
 *  Literals are not facts and are never emitted. */
export interface TraceEvent {
  key: string;                 // the memo key (id|person|month) or id for month/case facts
  identifier: string; person: string | null; month: string | null;
  kind: "supplied" | "parameter" | "derived" | "case" | "month" | "decision";
  value: unknown;              // the resolved value (null = unknown)
  origin:
    | "case" | "default" | "parameter" | "evaluated" | "memo" | "missing"
    | "not-in-force" | "no-version" | "decision";
    // case: read from case data; default: month_defaults/monthFactsDefault; parameter: paramOf;
    // evaluated: derived computed now; memo: derived already computed (subtree not re-expanded);
    // missing: supplied fact absent (unknown); not-in-force: the item's effective range does not
    // cover the determination date (unknown, and its rule never runs);
    // no-version: a versioned parameter with no version in force on its
    // version date (Resolution step 2; unknown, and reported as a warning);
    // decision: an operator's choice, not a fact
  parentKey: string | null;    // the derived fact whose evaluation asked for this one
  error?: string;              // when evaluation of this node threw
  /** Unknowns this derived fact's own rule produced with no supplied fact
   *  behind them (lookup miss, division by zero), one line each. */
  warnings?: string[];
  /** The resolution settled the value of every operator it happened inside:
   *  it was the input each of them chose. Only set when a hook is present. */
  decisive?: boolean;
  /** The part the resolution played in the innermost operator that asked for
   *  it: "input", "condition", "result", "left" or "right". */
  role?: string;
  op?: string;                 // decision events: the operator that decided
  chosen?: number | null;      // decision events: which input decided, if one did
  detail?: string;             // decision events: how, when the index does not say it
}

/** One operator's decision, reported after the inputs it weighed and only
 *  when a hook is present. `key`, `identifier`, `person` and `month` are the
 *  derived fact whose rule the operator belongs to; `value` is `chosen`. */
export interface DecisionEvent extends TraceEvent {
  kind: "decision";
  op: string;
  chosen: number | null;
}

export function isDecision(e: TraceEvent): e is DecisionEvent {
  return e.kind === "decision";
}

export type TraceHook = (e: TraceEvent) => void;

export function evaluate(
  ix: LedgerIndex, c: CaseData, identifier: string,
  person: string | null, month: string | null, trace?: TraceHook, warn?: WarnHook,
): unknown {
  const memo: Record<string, unknown> = {};
  const stack: string[] = [];
  /** P54: the month "that month" names while a "for each month in" sum
   *  evaluates its value; null outside one. A derived fact's own rule never
   *  sees it (value() clears it), so memoised values do not depend on it. */
  let thatMonth: string | null = null;
  /** Warnings raised while each derived fact's rule ran, by memo key, so the
   *  fact's trace event can carry them. Only filled when a hook is present. */
  const warningsByKey = new Map<string, string[]>();

  /** Reports one silent unknown against the derived fact under evaluation
   *  (`at`, when given, names the fact instead: a parameter). */
  function raise(
    kind: EvalWarning["kind"], detail: string,
    at?: { identifier: string; person: string | null; month: string | null },
  ): void {
    if (!warn && !trace) return;
    const key = stack.length ? stack[stack.length - 1] : null;
    let w: EvalWarning;
    if (at) w = { kind, detail, ...at };
    else if (key) {
      const [id, p, m] = key.split("|");
      w = { kind, detail, identifier: id, person: p || null, month: m || null };
    } else w = { kind, detail, identifier, person, month };
    if (warn) warn(w);
    if (trace && key && !at) {
      const list = warningsByKey.get(key) ?? [];
      list.push(`${kind}: ${detail}`);
      warningsByKey.set(key, list);
    }
  }

  /** One event held until the operator that asked for it knows which of its
   *  inputs decided. `live` stays true while every operator the event
   *  happened inside chose the input it happened in. */
  interface Held { branch: number; live: boolean; e: TraceEvent }
  /** One operator's decision, open while its inputs are being evaluated.
   *  `branch` is the input under evaluation now, `role` the part it plays. */
  interface Frame { op: string; branch: number; role: string | undefined; held: Held[] }

  // Only ever non-empty when a hook is present: without one nothing is held,
  // no frame is opened, and evaluation runs exactly as it did before.
  const frames: Frame[] = [];

  function emit(e: TraceEvent): void {
    const f = frames[frames.length - 1];
    if (!f) { trace!(e); return; }
    if (f.role !== undefined && e.kind !== "decision") e.role = f.role;
    f.held.push({ branch: f.branch, live: true, e });
  }

  function openFrame(op: string): Frame {
    const f: Frame = { op, branch: 0, role: undefined, held: [] };
    frames.push(f);
    return f;
  }

  /** Closes a frame: what was resolved for an input that did not decide loses
   *  its claim to be decisive, what is left is passed outward still claiming
   *  it, and the decision itself is reported after the inputs it weighed. */
  function closeFrame(
    f: Frame, chosen: number | null, decided: (branch: number) => boolean,
    p: string | null, m: string | null, detail?: string,
  ): void {
    frames.pop();
    for (const h of f.held) if (!decided(h.branch)) h.live = false;
    const out = frames[frames.length - 1];
    if (out) {
      for (const h of f.held) out.held.push({ branch: out.branch, live: h.live, e: h.e });
    } else {
      for (const h of f.held) {
        if (h.live && h.e.kind !== "decision") h.e.decisive = true;
        trace!(h.e);
      }
    }
    const parentKey = stack.length ? stack[stack.length - 1] : null;
    const bar = parentKey ? parentKey.indexOf("|") : -1;
    const d: TraceEvent = {
      key: parentKey ?? "",
      identifier: bar < 0 ? "" : parentKey!.slice(0, bar),
      person: p, month: m,
      kind: "decision", value: chosen, origin: "decision",
      parentKey, op: f.op, chosen,
    };
    if (detail !== undefined) d.detail = detail;
    emit(d);
  }

  const detMonth = c.det.slice(0, 7);
  /** The date a versioned parameter is read on in a context (docs/operators.md,
   *  Resolution step 2): with no month in context, the determination date; in
   *  a month-scoped evaluation, a day of that month: the determination date in
   *  the determination month, otherwise the first day of the month. Each month
   *  is judged by the figures in force in it (a retroactive month, a look-back
   *  month, a future month of a case); a rule that applies another date's
   *  figure says so with `as_of`. */
  function versionDate(m: string | null): string {
    return m == null || m === detMonth ? c.det : m + "-01";
  }

  function paramOf(it: Item, m: string | null): unknown {
    if (it.identifier in c.params) return c.params[it.identifier];
    return paramInForce(it, versionDate(m));
  }

  function value(id: string, p: string | null, m: string | null, P: string | null): unknown {
    const it = ix.byIdentifier.get(id);
    if (!it) throw new Error("unknown fact " + id);
    const sc = it.scope;
    // The derived fact currently under evaluation, captured before this one
    // pushes its own key, so every emit below reports the same parent.
    const parentKey = trace && stack.length ? stack[stack.length - 1] : null;
    /** Emits one event for this resolution, then returns the value unchanged.
     *  Each resolution is reported in its own scope's context, so key, person
     *  and month agree: a person fact carries no month, a month fact no
     *  person, a parameter or case fact neither. */
    const seen = (
      v: unknown, origin: TraceEvent["origin"], error?: string, warnings?: string[],
    ): unknown => {
      // A number that is not finite (NaN, Infinity) is never a value: it is
      // unknown, and reported, so no comparison or sum decides on it.
      if (typeof v === "number" && !Number.isFinite(v)) {
        raise("non-finite", `${id} is ${v}`, it.kind === "derived" ? undefined : {
          identifier: id,
          person: sc === "person" || sc === "person-month" ? p : null,
          month: sc === "month" || sc === "person-month" ? m : null,
        });
        v = null;
      }
      if (!trace) return v;
      const e: TraceEvent = {
        key: sc === "case" || sc === "month" ? id
          : sc === "person-month" ? id + "|" + (p ?? "") + "|" + (m ?? "")
          : sc === "person" ? id + "|" + (p ?? "") + "|"
          : id + "||",
        identifier: id,
        person: sc === "person" || sc === "person-month" ? p : null,
        month: sc === "month" || sc === "person-month" ? m : null,
        kind: it.kind === "parameter" ? "parameter"
          : sc === "case" ? "case" : sc === "month" ? "month" : it.kind,
        value: v,
        origin,
        parentKey,
      };
      if (error !== undefined) e.error = error;
      if (warnings && warnings.length) e.warnings = warnings;
      emit(e);
      return v;
    };
    // An item whose effective range does not cover the determination date
    // states nothing on that date, so it is unknown and its rule never runs.
    if (!inForce(it, c.det)) return seen(null, "not-in-force");
    if (it.kind === "parameter") {
      // A versioned parameter is read on the version date of the month in
      // context (the determination date outside one). One with no version on
      // that date has no value; that unknown is reported, never silent.
      const on = versionDate(m);
      if (
        !(it.identifier in c.params) && Array.isArray(it.versions) &&
        !versionInForce(it, on)
      ) {
        raise("no-version", `no version in force on ${on}`, {
          identifier: id, person: null, month: on === c.det ? null : m,
        });
        return seen(null, "no-version");
      }
      return seen(paramOf(it, m), "parameter");
    }
    if (sc === "case") {
      if (id === "determination_date") return seen(c.det, "case");
      if (id in c.caseFacts) return seen(c.caseFacts[id], "case");
      if (it.kind === "supplied") return seen(null, "missing");
      // A case-scope derived item is computed once per case, with no person
      // and no month in context.
      const ckey = id + "||case";
      if (ckey in memo) return seen(memo[ckey], "memo");
      if (stack.includes(ckey)) throw new Error("cycle at " + id);
      stack.push(ckey);
      let cv: unknown;
      const outer = thatMonth;
      thatMonth = null;
      try {
        cv = ev(it.derived ?? null, null, null, null);
      } finally {
        stack.pop();
        thatMonth = outer;
      }
      memo[ckey] = cv;
      return seen(cv, "evaluated");
    }
    if (sc === "month") {
      if (m == null) throw new Error(id + " needs a month");
      const mf = c.monthFacts[m] || {};
      if (id in mf) return seen(mf[id], "case");
      return id in c.monthFactsDefault
        ? seen(c.monthFactsDefault[id], "default")
        : seen(null, "missing");
    }
    let key: string;
    if (sc === "global") key = id + "||";
    else if (sc === "person") {
      if (!p) throw new Error(id + " needs a person");
      key = id + "|" + p + "|";
    } else {
      if (!p || m == null) throw new Error(id + " needs a person and a month");
      key = id + "|" + p + "|" + m;
    }
    if (sc === "person") {
      const pf = c.persons[p!] || {};
      if (id in pf) return seen(pf[id], "case");
    } else if (sc === "person-month") {
      const mf = (c.months[p!] || {})[m!] || {};
      if (id in mf) return seen(mf[id], "case");
      const md = c.monthDefaults[p!] || {};
      if (id in md) return seen(md[id], "default");
    }
    if (it.kind === "supplied") return seen(null, "missing");
    if (key in memo) return seen(memo[key], "memo");
    if (stack.includes(key)) throw new Error("cycle at " + id);
    stack.push(key);
    let v: unknown;
    const outerThatMonth = thatMonth;
    thatMonth = null;
    try {
      // A person or global fact is one value per case, memoised without a
      // month, so its rule runs with no month in context (its parameters are
      // read on the determination date) whichever month asked for it first.
      v = ev(it.derived ?? null, p, sc === "person-month" ? m : null, P);
      if (typeof v === "number" && !Number.isFinite(v)) {
        raise("non-finite", `the rule produced ${v}`);
        v = null;
      }
    } catch (ex) {
      seen(null, "evaluated", (ex as Error).message);
      throw ex;
    } finally {
      stack.pop();
      thatMonth = outerThatMonth;
    }
    memo[key] = v;
    return seen(v, "evaluated", undefined, warningsByKey.get(key));
  }

  /** P25: a parameter's value in force on a date other than the
   *  determination date. The item's own effective range is still read on the
   *  determination date, and a case's `parameters` override still wins (it
   *  states one value for every date). A date no version covers is unknown
   *  and reported, as on the determination date. */
  function paramOn(id: string, date: string | null): unknown {
    const it = ix.byIdentifier.get(id);
    if (!it || it.kind !== "parameter") throw new Error(`"as of" needs a parameter, not ${id}`);
    const parentKey = trace && stack.length ? stack[stack.length - 1] : null;
    const seen = (v: unknown, origin: TraceEvent["origin"]): unknown => {
      if (trace) {
        emit({
          key: id + "||", identifier: id, person: null, month: null,
          kind: "parameter", value: v, origin, parentKey,
        });
      }
      return v;
    };
    if (date === null) return null;
    if (!inForce(it, c.det)) return seen(null, "not-in-force");
    if (it.identifier in c.params) return seen(c.params[it.identifier], "parameter");
    if (Array.isArray(it.versions)) {
      const v = versionInForce(it, date);
      if (!v) {
        raise("no-version", `no version in force on ${date}`, {
          identifier: id, person: null, month: null,
        });
        return seen(null, "no-version");
      }
      return seen(v.value, "parameter");
    }
    return seen(it.value === undefined ? null : it.value, "parameter");
  }

  /** Every operator's result passes here: a number that is not finite is
   *  unknown from the operator that produced it on (never NaN or Infinity
   *  compared, summed or rounded), and reported. */
  function ev(e: Expr, p: string | null, m: string | null, P: string | null): any {
    const v = ev0(e, p, m, P);
    if (typeof v === "number" && !Number.isFinite(v)) {
      raise("non-finite", `${Array.isArray(e) ? e[0] : "a literal"} produced ${v}`);
      return null;
    }
    return v;
  }

  function ev0(e: Expr, p: string | null, m: string | null, P: string | null): any {
    if (e === true || e === false || typeof e === "number") return e;
    if (e == null) return null;
    if (typeof e === "string") {
      if (DATE_RE.test(e) || MONTH_RE.test(e)) return e;
      if (ix.byIdentifier.has(e)) return value(e, p, m, P);
      return e;
    }
    const op = e[0] as string;
    const g = (x: Expr) => ev(x, p, m, P);
    switch (op) {
      case "P": return P;
      case "det_date": return c.det;
      case "det_month": return c.det.slice(0, 7);
      case "month":
        if (m == null) throw new Error("no month in context");
        return m;
      case "all": {
        // The first false input settles it, so it is the last one evaluated.
        const f = trace ? openFrame("all") : null;
        let chosen: number | null = null;
        try {
          let unk = false;
          const xs = e.slice(1);
          for (let i = 0; i < xs.length; i++) {
            if (f) { f.branch = i; f.role = "input"; }
            const v = g(xs[i]);
            if (v === false) { chosen = i; return false; }
            if (v === null) unk = true;
          }
          return unk ? null : true;
        } finally {
          if (f) closeFrame(f, chosen, (b) => b === chosen, p, m);
        }
      }
      case "any": {
        const f = trace ? openFrame("any") : null;
        let chosen: number | null = null;
        try {
          let unk = false;
          const xs = e.slice(1);
          for (let i = 0; i < xs.length; i++) {
            if (f) { f.branch = i; f.role = "input"; }
            const v = g(xs[i]);
            if (v === true) { chosen = i; return true; }
            if (v === null) unk = true;
          }
          return unk ? null : false;
        } finally {
          if (f) closeFrame(f, chosen, (b) => b === chosen, p, m);
        }
      }
      case "not": {
        const f = trace ? openFrame("not") : null;
        try {
          if (f) f.role = "input";
          const v = g(e[1]);
          return v === null ? null : !v;
        } finally {
          if (f) closeFrame(f, 0, (b) => b === 0, p, m);
        }
      }
      case "otherwise": {
        const f = trace ? openFrame("otherwise") : null;
        let chosen: number | null = null;
        try {
          if (f) f.role = "left";
          const v = g(e[1]);
          if (v !== null) { chosen = 0; return v; }
          if (f) { f.branch = 1; f.role = "right"; }
          chosen = 1;
          return g(e[2]);
        } finally {
          if (f) closeFrame(f, chosen, (b) => b === chosen, p, m);
        }
      }
      case "unknown": return g(e[1]) === null;
      case "<": case "<=": case ">": case ">=": case "=": {
        // Neither side decides a comparison on its own; both operands matter.
        const f = trace ? openFrame(op) : null;
        try {
          if (f) f.role = "left";
          const a = g(e[1]);
          if (f) { f.branch = 1; f.role = "right"; }
          const b = g(e[2]);
          if (a === null || b === null) return null;
          return op === "<" ? a < b : op === "<=" ? a <= b
            : op === ">" ? a > b : op === ">=" ? a >= b : a === b;
        } finally {
          if (f) closeFrame(f, null, () => true, p, m, "both");
        }
      }
      case "in": { const a = g(e[1]); return a === null ? null : (e[2] as unknown[]).includes(a); }
      case "+": case "*": {
        const vs = e.slice(1).map(g);
        if (vs.some((v: any) => v === null)) return null;
        return vs.reduce((s: number, v: number) => (op === "+" ? s + v : s * v), op === "+" ? 0 : 1);
      }
      case "-": { const a = g(e[1]); const b = g(e[2]); return a === null || b === null ? null : a - b; }
      case "/": {
        const a = g(e[1]); const b = g(e[2]);
        if (a === null || b === null) return null;
        // Division by zero has no value: unknown, and reported.
        if (b === 0) { raise("division-by-zero", `${a} divided by 0`); return null; }
        return a / b;
      }
      case "min": {
        const a = g(e[1]); const b = g(e[2]);
        return a === null || b === null ? null : Math.min(a, b);
      }
      case "max": {
        const a = g(e[1]); const b = g(e[2]);
        return a === null || b === null ? null : Math.max(a, b);
      }
      case "ceil": { const a = g(e[1]); return a === null ? null : Math.ceil(a - 1e-9); }
      case "round": { const a = g(e[1]); return a === null ? null : Math.floor(a + 0.5 + 1e-9); }
      case "persons": return Object.keys(c.persons);
      case "count": { const grp = g(e[1]); return grp === null ? null : grp.length; }
      case "filter": {
        // Every member is tested; an unknown test on any member makes the
        // group unknown, since its membership cannot be stated.
        const grp = g(e[1]);
        if (grp === null) return null;
        const out: string[] = [];
        let unk = false;
        for (const pid of grp) {
          const v = ev(e[2], p, m, pid);
          if (v === null) unk = true;
          else if (v === true) out.push(pid);
        }
        return unk ? null : out;
      }
      case "sum": {
        const grp = g(e[1]);
        if (grp === null) return null;
        let total = 0;
        for (const pid of grp) {
          const v = ev(e[2], p, m, pid);
          if (v === null) return null;
          total += v;
        }
        return total;
      }
      case "has_relative_in": {
        // That person (the bound member) stands in one of the named roles to
        // some person in the group: a join between the bound person and the
        // group's members without rebinding either. Unknown when that
        // person's relationships are unstated or the group is unknown.
        if (!P) throw new Error("has_relative_in needs a bound person");
        const grp = g(e[2]);
        if (grp === null || c.rels[P] == null) return null;
        const roles = e[1] as string[];
        return (c.rels[P] ?? []).some(([r, other]) => roles.includes(r) && grp.includes(other));
      }
      case "shared_relative": {
        // The persons, other than this person, who have a person in the named
        // role in common with this person: with "parent", this person's
        // siblings. Unknown when this person's relationships are unstated.
        if (!p || c.rels[p] == null) return null;
        const role = e[1] as string;
        const inverse = ix.inverseRole[role];
        const out = new Set<string>();
        for (const [r, y] of c.rels[p] ?? []) {
          if (r !== inverse) continue;
          for (const [r2, x] of c.rels[y] ?? []) if (r2 === role && x !== p) out.add(x);
        }
        const shared = Object.keys(c.persons).filter((pid) => out.has(pid));
        if (e[2] !== "every") return shared;
        // P53, "every": only the persons whose holders of the role are exactly
        // this person's (with "parent": full siblings, who share both legal
        // parents). Another person's unstated relationships are read as none.
        const holders = (q: string) => new Set((c.rels[q] ?? []).filter(([r]) => r === inverse).map(([, y]) => y));
        const mine = holders(p);
        return shared.filter((x) => {
          const h = holders(x);
          return h.size === mine.size && [...mine].every((y) => h.has(y));
        });
      }
      case "reachable": {
        // The persons joined to this person by a chain of the named
        // relationships, this person included. Unknown when this person's
        // relationships are unstated; another person's unstated
        // relationships are read as none.
        if (!p || c.rels[p] == null) return null;
        // With a condition, an edge from `cur` to `other` is crossed only
        // when the condition holds with "this person" = cur (the person the
        // chain has reached) and "that person" = other. The result is a
        // fixed point and does not depend on the order relationships are
        // listed in: the group is every person reachable over edges whose
        // condition is true; it is unknown when an edge whose condition is
        // unknown leaves that group (some person's membership then turns on
        // the unknown); an unknown edge between two members changes nothing.
        // See docs/operators.md, `reachable`.
        const roles = e[1] as string[];
        const cond = e.length > 2 ? e[2] : undefined;
        const inGroup = new Set<string>([p]);
        const queue = [p];
        const unknownEdges: string[] = [];
        while (queue.length) {
          const cur = queue.shift()!;
          for (const [r, other] of c.rels[cur] ?? []) {
            if (!roles.includes(r) || inGroup.has(other)) continue;
            if (cond !== undefined) {
              const v = ev(cond, cur, m, other);
              if (v === null) { unknownEdges.push(other); continue; }
              if (v !== true) continue;
            }
            inGroup.add(other);
            queue.push(other);
          }
        }
        if (unknownEdges.some((other) => !inGroup.has(other))) return null;
        return Object.keys(c.persons).filter((pid) => inGroup.has(pid));
      }
      case "years_between": {
        const a = g(e[1]); const b = g(e[2]);
        return a === null || b === null ? null : yearsBetween(a, b);
      }
      case "first_day": { const mm = g(e[1]); return mm === null ? null : mm + "-01"; }
      case "month_of": { const d = g(e[1]); return d === null ? null : d.slice(0, 7); }
      case "month_of_year": { const mm = g(e[1]); return mm === null ? null : Number(String(mm).slice(5, 7)); }
      case "year_of": { const x = g(e[1]); return x === null ? null : Number(String(x).slice(0, 4)); }
      case "latest_month_of_year": {
        // P50: the most recent month, on or before the given month (or the
        // month of the given date), whose calendar month number is n.
        const n = g(e[1]); const x = g(e[2]);
        if (n === null || x === null) return null;
        const mm = String(x).slice(0, 7);
        const back = ((Number(mm.slice(5, 7)) - Number(n)) % 12 + 12) % 12;
        return addMonths(mm, -back);
      }
      case "as_of": return paramOn(e[1] as string, g(e[2]));
      case "month_before": { const mm = g(e[1]); return mm === null ? null : addMonths(mm, -1); }
      case "month_after": { const mm = g(e[1]); return mm === null ? null : addMonths(mm, 1); }
      case "months_after": { const n = g(e[1]); const mm = g(e[2]); return n === null || mm === null ? null : addMonths(mm, n); }
      case "months_before": { const n = g(e[1]); const mm = g(e[2]); return n === null || mm === null ? null : addMonths(mm, -n); }
      case "days_after": { const n = g(e[1]); const d = g(e[2]); return n === null || d === null ? null : addDays(d, n); }
      case "days_between": { const a = g(e[1]); const b = g(e[2]); return a === null || b === null ? null : daysBetween(a, b); }
      case "months_ending": {
        const n = g(e[1]); const mm = g(e[2]);
        return n === null || mm === null ? null : monthsEnding(n, mm);
      }
      case "months_from_to": {
        const a = g(e[1]); const b = g(e[2]);
        return a === null || b === null ? null : monthsFromTo(a, b);
      }
      case "at": { const mm = g(e[2]); return mm === null ? null : ev(e[1], p, mm, P); }
      case "each": case "some_month": case "count_months": {
        const ms = g(e[1]);
        if (ms === null) return null;
        const vs = ms.map((mm: string) => ev(e[2], p, mm, P));
        if (op === "each") {
          if (vs.some((v: any) => v === false)) return false;
          return vs.some((v: any) => v === null) ? null : true;
        }
        if (op === "some_month") {
          if (vs.some((v: any) => v === true)) return true;
          return vs.some((v: any) => v === null) ? null : false;
        }
        return vs.some((v: any) => v === null) ? null : vs.filter(Boolean).length;
      }
      case "sum_months": {
        // P54: the sum of a number for each month in a list, with "that
        // month" naming each month in turn and "the month" unchanged.
        const ms = g(e[1]);
        if (ms === null) return null;
        const outer = thatMonth;
        let total = 0;
        try {
          for (const mm of ms as string[]) {
            thatMonth = mm;
            const v = ev(e[2], p, m, P);
            if (v === null) return null;
            total += v;
          }
        } finally {
          thatMonth = outer;
        }
        return total;
      }
      case "that_month":
        if (thatMonth === null) throw new Error('"that month" outside "for each month in"');
        return thatMonth;
      case "avg": {
        const ms = g(e[2]);
        if (ms === null) return null;
        const vs = ms.map((mm: string) => ev(e[1], p, mm, P));
        if (!vs.length || vs.some((v: any) => v === null)) return null;
        return vs.reduce((a: number, b: number) => a + b, 0) / vs.length;
      }
      case "case": {
        // One arm is a branch: the condition that selected it and the result
        // it produced both decided the value.
        const f = trace ? openFrame("case") : null;
        let chosen: number | null = null;
        let detail: string | undefined;
        try {
          const arms = e.slice(1);
          for (let i = 0; i < arms.length; i++) {
            const arm = arms[i];
            if (f) { f.branch = i; f.role = "condition"; }
            if (arm[0] === "else") {
              chosen = i; detail = "else";
              if (f) f.role = "result";
              return g(arm[1]);
            }
            const cv = g(arm[0]);
            if (cv === null) return null;
            if (cv) {
              chosen = i;
              if (f) f.role = "result";
              return g(arm[1]);
            }
          }
          return null;
        } finally {
          if (f) closeFrame(f, chosen, (b) => b === chosen, p, m, detail);
        }
      }
      case "exists": {
        const grp = g(e[1]);
        if (grp === null) return null;
        let unk = false;
        for (const pid of grp) {
          const v = ev(e[2], p, m, pid);
          if (v === true) return true;
          if (v === null) unk = true;
        }
        return unk ? null : false;
      }
      case "exists_related": {
        const rels = c.rels[p!];
        if (rels == null) return null;
        let unk = false;
        for (const [r, pid] of rels) {
          if (!(e[1] as string[]).includes(r)) continue;
          const v = ev(e[2], p, m, pid);
          if (v === true) return true;
          if (v === null) unk = true;
        }
        return unk ? null : false;
      }
      case "rel": {
        const target = g(e[2]);
        const rels = c.rels[p!];
        if (rels == null) return null;
        return rels.some(([r, pid]) => (e[1] as string[]).includes(r) && pid === target);
      }
      case "in_group": {
        const target = g(e[1]); const grp = g(e[2]);
        return grp === null ? null : grp.includes(target);
      }
      case "of": {
        const target = g(e[1]);
        if (target === null) return null;
        return ev(e[2], target, m, P);
      }
      case "lookup": {
        const tbl = g(e[1]); const k = g(e[2]);
        if (tbl === null || k === null) return null;
        if (k in tbl) return tbl[k];
        // A key with no row has no value: unknown, and reported.
        raise("lookup-miss", `no row for key ${JSON.stringify(k)}` +
          (typeof e[1] === "string" ? ` in ${e[1]}` : ""));
        return null;
      }
      case "band": {
        // A table keyed by income band: each key is a band's inclusive upper
        // bound; the value is the first band (in ascending bound order) whose
        // bound is at least the number. A row keyed "above" is the open top
        // band, for every number above the last bound; without one there is
        // no band past the last bound.
        const tbl = g(e[1]); const k = g(e[2]);
        if (tbl === null || k === null) return null;
        const bounds = Object.keys(tbl).filter((x) => x !== "above").map(Number)
          .filter((x) => !Number.isNaN(x)).sort((a, b) => a - b);
        for (const b of bounds) {
          if (Number(k) <= b + 1e-9) {
            const key = Object.keys(tbl).find((x) => x !== "above" && Number(x) === b)!;
            return tbl[key];
          }
        }
        if ("above" in tbl) return tbl.above;
        // Past the last bound with no open top band there is no band:
        // unknown, and reported like a lookup with no row (docs/operators.md,
        // Tables).
        raise("lookup-miss", `no band contains ${JSON.stringify(k)}` +
          (typeof e[1] === "string" ? ` in ${e[1]}` : ""));
        return null;
      }
      case "lookup_extended": {
        // P51: a table keyed by a whole number read beyond its last row. Up
        // to the last row it is a lookup; past it, the last row plus the
        // third argument for each number beyond it, or the last row itself
        // when there is no third argument ("or more").
        const tbl = g(e[1]); const k = g(e[2]);
        if (tbl === null || k === null) return null;
        const keys = Object.keys(tbl).map(Number).filter((x) => Number.isInteger(x));
        if (!keys.length) {
          raise("lookup-miss", "the table has no whole-number rows" +
            (typeof e[1] === "string" ? ` in ${e[1]}` : ""));
          return null;
        }
        const last = Math.max(...keys);
        if (Number(k) <= last) {
          if (String(k) in tbl) return tbl[String(k)];
          raise("lookup-miss", `no row for key ${JSON.stringify(k)}` +
            (typeof e[1] === "string" ? ` in ${e[1]}` : ""));
          return null;
        }
        if (e.length < 4) return tbl[String(last)];
        const each = g(e[3]);
        if (each === null) return null;
        return tbl[String(last)] + each * (Number(k) - last);
      }
    }
    throw new Error("unknown operator " + op);
  }

  return value(identifier, person, month, null);
}

export function runTest(
  ix: LedgerIndex, it: Item, t: TestSpec, defaultAsOf = "2027-03-15",
): TestResult {
  // The case is built against the base index, then the item under test is
  // overlaid for evaluation, so a draft item that is not in the ledger yet
  // still evaluates.
  const c = makeCase(ix, Object.assign({}, t, { as_of: t.as_of || defaultAsOf }));
  const person = ["global", "case", "month"].includes(it.scope) ? null : "p1";
  const evalIx = indexWith(ix, it.identifier ? [it] : []);
  let got: unknown = null;
  let ok = false;
  let err: string | null = null;
  const warnings: string[] = [];
  try {
    got = evaluate(
      evalIx, c, it.identifier, person, t.month == null ? null : t.month, undefined,
      (w) => warnings.push(formatWarning(w)),
    );
    ok = valuesEqual(got, t.expect);
    if ("expect_length" in t) {
      ok =
        Array.isArray(got) &&
        got.length === t.expect_length &&
        (!t.expect_first || got[0] === t.expect_first) &&
        (!t.expect_last || got[got.length - 1] === t.expect_last);
    }
  } catch (ex) {
    err = (ex as Error).message;
    got = null;
  }
  const out: TestResult = { ok, got, err };
  if (warnings.length) out.warnings = [...new Set(warnings)];
  return out;
}
