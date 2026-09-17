import { indexWith, type LedgerIndex } from "./ledger-index";
import { valuesEqual } from "./values";
import { inForce, paramInForce } from "./versions";
import { DATE_RE, MONTH_RE, type Expr, type Item, type TestSpec } from "./types";

export interface CaseData {
  det: string;
  persons: Record<string, Record<string, unknown>>;
  months: Record<string, Record<string, Record<string, unknown>>>;
  monthDefaults: Record<string, Record<string, unknown>>;
  rels: Record<string, Array<[string, string]> | null>;
  monthFacts: Record<string, Record<string, unknown>>;
  monthFactsDefault: Record<string, unknown>;
  params: Record<string, unknown>;
}

export interface TestResult { ok: boolean; got: unknown; err: string | null }

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

/** The inverse of each relationship role the household model names. A
 *  case-level edge states one direction and both persons carry it, so
 *  `[parent, p2, p3]` records "p2 is the parent of p3" on p2 and "p3 is the
 *  child of p2" on p3. A role with no inverse here is recorded on the person
 *  named first alone. */
export const INVERSE_ROLE: Readonly<Record<string, string>> = {
  parent: "child",
  child: "parent",
  spouse: "spouse",
  grandparent: "grandchild",
  grandchild: "grandparent",
  caretaker: "dependent",
  dependent: "caretaker",
  tax_filer: "tax_dependent",
  tax_dependent: "tax_filer",
  buys_prepares_with: "buys_prepares_with",
};

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
export function relationshipEdges(rels: TestSpec["relationships"]): RelationshipEdge[] {
  const out: RelationshipEdge[] = [];
  for (const r of rels ?? []) {
    if (r.length !== 3) continue;
    const [role, from, to] = r;
    out.push({ person: from, role, other: to });
    const inverse = INVERSE_ROLE[role];
    if (inverse) out.push({ person: to, role: inverse, other: from });
  }
  return out;
}

export function makeCase(ix: LedgerIndex, spec: TestSpec & { as_of?: string }): CaseData {
  const given = spec.given || {};
  const c: CaseData = {
    det: (given.determination_date as string) || spec.as_of || "2027-03-15",
    persons: {}, months: {}, monthDefaults: {}, rels: {},
    monthFacts: {}, monthFactsDefault: {}, params: spec.parameters || {},
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
  addPerson("p1", spec.given, statedRelationships(spec.relationships), spec.month_defaults);
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
  // The case-level graph is expanded last, so an edge reaches a person whose
  // own pairs are already in place and adds only what they do not say.
  for (const e of relationshipEdges(spec.relationships)) {
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
    | "not-in-force" | "decision";
    // case: read from case data; default: month_defaults/monthFactsDefault; parameter: paramOf;
    // evaluated: derived computed now; memo: derived already computed (subtree not re-expanded);
    // missing: supplied fact absent (unknown); not-in-force: the item's effective range does not
    // cover the determination date (unknown, and its rule never runs);
    // decision: an operator's choice, not a fact
  parentKey: string | null;    // the derived fact whose evaluation asked for this one
  error?: string;              // when evaluation of this node threw
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
  person: string | null, month: string | null, trace?: TraceHook,
): unknown {
  const memo: Record<string, unknown> = {};
  const stack: string[] = [];

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

  function paramOf(it: Item): unknown {
    if (it.identifier in c.params) return c.params[it.identifier];
    return paramInForce(it, c.det);
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
    const seen = (v: unknown, origin: TraceEvent["origin"], error?: string): unknown => {
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
      emit(e);
      return v;
    };
    // An item whose effective range does not cover the determination date
    // states nothing on that date, so it is unknown and its rule never runs.
    if (!inForce(it, c.det)) return seen(null, "not-in-force");
    if (it.kind === "parameter") return seen(paramOf(it), "parameter");
    if (sc === "case") {
      return id === "determination_date" ? seen(c.det, "case") : seen(null, "missing");
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
    try {
      v = ev(it.derived ?? null, p, m, P);
    } catch (ex) {
      seen(null, "evaluated", (ex as Error).message);
      throw ex;
    } finally {
      stack.pop();
    }
    memo[key] = v;
    return seen(v, "evaluated");
  }

  function ev(e: Expr, p: string | null, m: string | null, P: string | null): any {
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
      case "/": { const a = g(e[1]); const b = g(e[2]); return a === null || b === null ? null : a / b; }
      case "min": {
        const a = g(e[1]); const b = g(e[2]);
        return a === null || b === null ? null : Math.min(a, b);
      }
      case "years_between": {
        const a = g(e[1]); const b = g(e[2]);
        return a === null || b === null ? null : yearsBetween(a, b);
      }
      case "first_day": { const mm = g(e[1]); return mm === null ? null : mm + "-01"; }
      case "month_of": { const d = g(e[1]); return d === null ? null : d.slice(0, 7); }
      case "month_before": { const mm = g(e[1]); return mm === null ? null : addMonths(mm, -1); }
      case "month_after": { const mm = g(e[1]); return mm === null ? null : addMonths(mm, 1); }
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
        return k in tbl ? tbl[k] : null;
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
  try {
    got = evaluate(evalIx, c, it.identifier, person, t.month == null ? null : t.month);
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
  return { ok, got, err };
}
