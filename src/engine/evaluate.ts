import { indexWith, type LedgerIndex } from "./ledger-index";
import { valuesEqual } from "./values";
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
  addPerson("p1", spec.given, spec.relationships, spec.month_defaults);
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
  return c;
}

/** One resolution the evaluator performed, emitted after the value is known.
 *  Literals and operators are not facts and are never emitted. */
export interface TraceEvent {
  key: string;                 // the memo key (id|person|month) or id for month/case facts
  identifier: string; person: string | null; month: string | null;
  kind: "supplied" | "parameter" | "derived" | "case" | "month";
  value: unknown;              // the resolved value (null = unknown)
  origin: "case" | "default" | "parameter" | "evaluated" | "memo" | "missing";
    // case: read from case data; default: month_defaults/monthFactsDefault; parameter: paramOf;
    // evaluated: derived computed now; memo: derived already computed (subtree not re-expanded);
    // missing: supplied fact absent (unknown)
  parentKey: string | null;    // the derived fact whose evaluation asked for this one
  error?: string;              // when evaluation of this node threw
}

export type TraceHook = (e: TraceEvent) => void;

export function evaluate(
  ix: LedgerIndex, c: CaseData, identifier: string,
  person: string | null, month: string | null, trace?: TraceHook,
): unknown {
  const memo: Record<string, unknown> = {};
  const stack: string[] = [];

  function paramOf(it: Item): unknown {
    if (it.identifier in c.params) return c.params[it.identifier];
    if (it.versions) {
      let best: { from: string; value: unknown } | null = null;
      for (const v of it.versions) {
        if (v.from <= c.det && (!best || v.from >= best.from)) best = v;
      }
      return best ? best.value : null;
    }
    return it.value === undefined ? null : it.value;
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
      trace(e);
      return v;
    };
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
        let unk = false;
        for (const s of e.slice(1)) {
          const v = g(s);
          if (v === false) return false;
          if (v === null) unk = true;
        }
        return unk ? null : true;
      }
      case "any": {
        let unk = false;
        for (const s of e.slice(1)) {
          const v = g(s);
          if (v === true) return true;
          if (v === null) unk = true;
        }
        return unk ? null : false;
      }
      case "not": { const v = g(e[1]); return v === null ? null : !v; }
      case "otherwise": { const v = g(e[1]); return v === null ? g(e[2]) : v; }
      case "unknown": return g(e[1]) === null;
      case "<": case "<=": case ">": case ">=": case "=": {
        const a = g(e[1]); const b = g(e[2]);
        if (a === null || b === null) return null;
        return op === "<" ? a < b : op === "<=" ? a <= b
          : op === ">" ? a > b : op === ">=" ? a >= b : a === b;
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
        for (const arm of e.slice(1)) {
          if (arm[0] === "else") return g(arm[1]);
          const cv = g(arm[0]);
          if (cv === null) return null;
          if (cv) return g(arm[1]);
        }
        return null;
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
