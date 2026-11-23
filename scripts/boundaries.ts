/* Time audit and generated boundary cases (step 6 of the 2026-11-23 plan,
 * docs/plan-colorado.md; the findings are in docs/reviews/time-audit.md).
 *
 *   npm run boundaries                     every section, volume co
 *   npm run boundaries -- --volume co --only inventory,coverage,mutation,boundaries
 *   npm run boundaries -- --out <file>     also write the full generated report (markdown)
 *   npm run boundaries -- --max-units 120  cap on the tests a mutant is run against
 *
 * Read-only on the ledger: it loads the items, rule tests and stored
 * households, evaluates them with the reference evaluator (the test harness),
 * and prints what it finds. Four sections:
 *
 * 1. inventory: every derived item that uses a date or period operator; every
 *    literal date, month or number in a derivation; every versioned parameter
 *    whose last version is closed, whose open version started before
 *    2026-01-01, or that is published yearly and has no version for the next
 *    year; every stored case or rule test dated after a yearly parameter's
 *    current year that reads the earlier year's figure.
 * 2. coverage: which branches the rule tests and the stored households reach.
 *    A branch is a `case` arm (its `else` included), the "stated" and
 *    "default" sides of an `otherwise`, and the true and false outcomes of a
 *    threshold comparison (`<`, `<=`, `>`, `>=`); a comparison is also
 *    reported as "tested at the boundary" when some test evaluates it with
 *    its two sides equal. Measured by evaluating every test against a copy of
 *    the ledger whose trees carry markers (a parameter with no version, read
 *    under `unknown`, so the value of every tree is unchanged and each marker
 *    reached raises a `no-version` warning naming it).
 * 3. mutation: per program, each comparison flipped between strict and
 *    inclusive (< and <=, > and >=), and each `case` with two or more arms
 *    with the results of its first two arms swapped. A mutant is killed when
 *    a test that reaches the mutated node, and passes on the real ledger,
 *    fails on the mutant.
 * 4. boundaries: for each threshold comparison in a simple context (not under
 *    a binder or a month change), a stored household (else a rule test) that
 *    reaches it, the person and month it is evaluated for, the value of each
 *    side there, and three variations of the household with the variable side
 *    stated just below, at, and just above the threshold (an age by whole
 *    years and by date of birth, a date by a day, a month by a month, money by
 *    a cent, a count by one). It reports which side the boundary lands on for
 *    the comparison, the item and the household's own expectation, and the
 *    wording the cited excerpts use next to the threshold ("less than", "not
 *    more than", "under age 19", "through the month of"), flagging a
 *    comparison whose boundary lands on the other side from the wording.
 *
 * The evaluator is never changed: variations are made by stating a value for
 * the variable fact in a copy of the household (a stated value replaces a
 * derived fact's rule, docs/operators.md "Resolution").
 */
import fs from "node:fs";
import path from "node:path";
import { loadLedgerFromDisk, type LoadedLedger } from "../src/tools/check";
import { buildIndex, indexWith, type LedgerIndex } from "../src/engine/ledger-index";
import {
  addDays, addMonths, evaluate, makeCase, type CaseData, type TraceEvent,
} from "../src/engine/evaluate";
import { caseToSpec } from "../src/engine/cases";
import { valuesEqual } from "../src/engine/values";
import { versionInForce } from "../src/engine/versions";
import type { Expr, Item, TestSpec } from "../src/engine/types";

// ---------------------------------------------------------------------------
// Arguments

const root = path.resolve(import.meta.dirname, "..");
const argv = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}
const volume = arg("--volume") ?? "co";
const only = new Set((arg("--only") ?? "inventory,coverage,mutation,boundaries").split(","));
const outFile = arg("--out");
const maxUnits = Number(arg("--max-units") ?? 150);
const NEXT_YEAR_DUE = arg("--today") ?? new Date().toISOString().slice(0, 10);

const led: LoadedLedger = loadLedgerFromDisk(root, volume);
const roles = led.meta.relationship_roles ?? null;
const ix = buildIndex(led.items, roles);
const defaultAsOf = led.meta.default_as_of ?? "2027-03-15";
const knownFailures = new Set<string>(
  JSON.parse(fs.readFileSync(path.join(root, "conformance/known-failures.json"), "utf8")) as string[],
);
const sourceTexts: Record<string, string> = led.sourceTexts ?? {};
const out: string[] = [];
function emit(line = ""): void {
  out.push(line);
  console.log(line);
}

// ---------------------------------------------------------------------------
// Trees

type Path = number[];
const CMP = new Set(["<", "<=", ">", ">="]);
const DATE_OPS = new Set([
  "det_date", "det_month", "month", "at", "first_day", "month_of", "month_of_year", "year_of",
  "latest_month_of_year", "month_before", "month_after", "months_before", "months_after",
  "months_ending", "months_from_to", "each", "some_month", "count_months", "avg", "sum_months",
  "that_month", "years_between", "days_after", "days_between", "as_of",
]);
/** Operators that change "this person", "that person" or "the month" for an
 *  argument: a comparison under one is not in the item's own context. */
const REBINDS = new Set([
  "of", "at", "each", "some_month", "count_months", "avg", "sum_months", "filter", "sum",
  "exists", "exists_related", "reachable",
]);
/** Argument positions that are not expressions (operators.md "The
 *  expression tree"): never walked. */
function evaluatedArgs(e: readonly unknown[]): number[] {
  const op = e[0];
  const n = e.length;
  const all = Array.from({ length: n - 1 }, (_, i) => i + 1);
  switch (op) {
    case "rel": return [2];
    case "exists_related": return [2];
    case "has_relative_in": return [2];
    case "reachable": return n > 2 ? [2] : [];
    case "shared_relative": return [];
    case "in": return [1];
    case "as_of": return [2];
    default: return all;
  }
}

function at(e: Expr, p: Path): Expr {
  let cur: unknown = e;
  for (const i of p) cur = (cur as unknown[])[i];
  return cur as Expr;
}
function replaceAt(e: Expr, p: Path, v: Expr): Expr {
  if (!p.length) return v;
  const arr = (e as unknown[]).slice();
  arr[p[0]] = replaceAt(arr[p[0]] as Expr, p.slice(1), v);
  return arr as Expr;
}

interface Node {
  n: number;
  item: Item;
  path: Path;
  op: string;
  /** ancestors' operators, outermost first */
  ancestors: string[];
}

/** Every operator node of a derivation, pre-order, with its path. A `case`
 *  arm is walked as its condition and its result. */
function nodesOf(it: Item): Node[] {
  const list: Node[] = [];
  const walk = (e: Expr, p: Path, anc: string[]): void => {
    if (!Array.isArray(e) || !e.length || typeof e[0] !== "string") return;
    const op = e[0] as string;
    list.push({ n: list.length, item: it, path: p, op, ancestors: anc });
    const inner = [...anc, op];
    if (op === "case") {
      e.slice(1).forEach((arm: unknown, i: number) => {
        const a = arm as unknown[];
        if (a[0] === "else") walk(a[1] as Expr, [...p, i + 1, 1], inner);
        else {
          walk(a[0] as Expr, [...p, i + 1, 0], inner);
          walk(a[1] as Expr, [...p, i + 1, 1], inner);
        }
      });
      return;
    }
    for (const i of evaluatedArgs(e)) walk(e[i] as Expr, [...p, i], inner);
  };
  walk(it.derived ?? null, [], []);
  return list;
}

function identifiersIn(e: Expr, acc = new Set<string>()): Set<string> {
  if (typeof e === "string") {
    if (ix.byIdentifier.has(e)) acc.add(e);
  } else if (Array.isArray(e)) {
    for (const x of e) identifiersIn(x as Expr, acc);
  }
  return acc;
}
function opsIn(e: Expr, acc = new Set<string>()): Set<string> {
  if (Array.isArray(e)) {
    if (typeof e[0] === "string") acc.add(e[0]);
    for (const x of e) opsIn(x as Expr, acc);
  }
  return acc;
}
function show(e: Expr, max = 110): string {
  const s = JSON.stringify(e);
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

const derived = led.items.filter((it) => it.kind === "derived" && it.derived != null);
const nodesByItem = new Map<string, Node[]>();
for (const it of derived) nodesByItem.set(it.id, nodesOf(it));

// ---------------------------------------------------------------------------
// Test units: one per rule test and per household expectation (per month)

interface Unit {
  key: string;
  kind: "rule" | "case";
  program: string;
  dataKey: string;
  identifier: string;
  person: string | null;
  month: string | null;
  expect: unknown;
  /** the item a rule test belongs to */
  itemId?: string;
  asOf: string;
}
const units: Unit[] = [];
const specs = new Map<string, TestSpec & { as_of: string }>();
for (const it of led.items) {
  for (const t of it.tests ?? []) {
    if ("expect_length" in t) continue;
    const dk = "rule:" + t.id;
    const spec = Object.assign({}, t, { as_of: t.as_of || defaultAsOf });
    specs.set(dk, spec);
    units.push({
      key: t.id, kind: "rule", program: it.program, dataKey: dk, identifier: it.identifier,
      person: ["global", "case", "month"].includes(it.scope) ? null : "p1",
      month: t.month ?? null, expect: t.expect, itemId: it.id,
      asOf: (t.given?.determination_date as string) || spec.as_of,
    });
  }
}
for (const c of led.cases) {
  const dk = "case:" + c.id;
  specs.set(dk, caseToSpec(c));
  for (const [pid, exps] of Object.entries(c.expect ?? {})) {
    for (const [identifier, exp] of Object.entries(exps)) {
      const it = ix.byIdentifier.get(identifier);
      if (!it) continue;
      const monthKeyed = it.scope === "person-month" && exp !== null && typeof exp === "object" &&
        !Array.isArray(exp);
      const pairs: Array<[string | null, unknown]> = monthKeyed
        ? Object.entries(exp as Record<string, unknown>) : [[null, exp]];
      for (const [m, e] of pairs) {
        units.push({
          key: `${c.id}:${pid}:${identifier}${m ? "@" + m : ""}`, kind: "case", program: it.program,
          dataKey: dk, identifier, person: pid, month: m, expect: e, asOf: c.as_of,
        });
      }
    }
  }
}
const dataCache = new Map<string, CaseData>();
function dataOf(dk: string): CaseData {
  let d = dataCache.get(dk);
  if (!d) {
    d = makeCase(ix, specs.get(dk)!);
    dataCache.set(dk, d);
  }
  return d;
}
/** Two evaluated values are the same answer (unknown included). */
function same(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return (a ?? null) === (b ?? null);
  return valuesEqual(a, b) || JSON.stringify(a) === JSON.stringify(b);
}
function run(index: LedgerIndex, u: Unit, data = dataOf(u.dataKey), warn?: (id: string) => void): unknown {
  try {
    return evaluate(index, data, u.identifier, u.person, u.month, undefined,
      warn ? (w) => warn(w.identifier) : undefined);
  } catch (ex) {
    return "error: " + (ex as Error).message;
  }
}

// Baseline: which units pass on the ledger as it is.
const t0 = Date.now();
const baseValue = new Map<string, unknown>();
const basePass = new Set<string>();
for (const u of units) {
  const v = run(ix, u);
  baseValue.set(u.key, v);
  if (valuesEqual(v, u.expect)) basePass.add(u.key);
}
console.error(`baseline: ${units.length} units, ${basePass.size} passing, ${Date.now() - t0} ms`);

// ---------------------------------------------------------------------------
// 1. Inventory

function paramYearly(it: Item): boolean {
  const vs = it.versions ?? [];
  if ((it as { review_by?: string }).review_by) return true;
  const froms = vs.map((v) => v.from).sort();
  for (let i = 1; i < froms.length; i++) {
    const a = froms[i - 1], b = froms[i];
    if (+b.slice(0, 4) - +a.slice(0, 4) === 1 && a.slice(5) === b.slice(5)) return true;
  }
  return false;
}

function inventory(): void {
  emit("## 1. Inventory");
  emit("");
  emit("### Derived items using date or period operators");
  emit("");
  emit("| Item | Identifier | Program | Scope | Date operators |");
  emit("|---|---|---|---|---|");
  let n = 0;
  for (const it of derived) {
    const ops = [...opsIn(it.derived ?? null)].filter((o) => DATE_OPS.has(o));
    const readsAge = identifiersIn(it.derived ?? null).has("age");
    if (!ops.length && !readsAge) continue;
    n++;
    emit(`| ${it.id} | ${it.identifier} | ${it.program} | ${it.scope} | ${[...ops, ...(readsAge ? ["reads age"] : [])].join(", ")} |`);
  }
  emit("");
  emit(`${n} items.`);
  emit("");
  emit("### Literal dates, months and numbers in derivations");
  emit("");
  emit("Numbers other than 0 and 1, and every date or month literal, by item.");
  emit("");
  emit("| Item | Identifier | Literals |");
  emit("|---|---|---|");
  for (const it of derived) {
    const lits: string[] = [];
    const walk = (e: Expr, inCmp: boolean): void => {
      if (typeof e === "number" && e !== 0 && e !== 1) lits.push(String(e) + (inCmp ? " (compared)" : ""));
      else if (typeof e === "string" && /^\d{4}-\d{2}(-\d{2})?$/.test(e)) lits.push(e);
      else if (Array.isArray(e)) {
        const c = typeof e[0] === "string" && CMP.has(e[0]);
        if (e[0] === "case") {
          for (const arm of e.slice(1)) for (const x of arm as unknown[]) walk(x as Expr, false);
        } else for (const i of evaluatedArgs(e)) walk(e[i] as Expr, c);
      }
    };
    walk(it.derived ?? null, false);
    if (lits.length) emit(`| ${it.id} | ${it.identifier} | ${lits.join(", ")} |`);
  }
  emit("");
  ages();
  emit("### Versioned parameters: closed, old, or a yearly figure with no next-year version");
  emit("");
  emit(`Today is taken as ${NEXT_YEAR_DUE}. "Yearly" means two versions one year apart on the same day, or a review_by date.`);
  emit("");
  emit("| Parameter | Identifier | Versions (from>to) | review_by | Note |");
  emit("|---|---|---|---|---|");
  for (const it of led.items) {
    if (it.kind !== "parameter" || !Array.isArray(it.versions)) continue;
    const vs = [...it.versions].sort((a, b) => (a.from < b.from ? -1 : 1));
    const rb = (it as { review_by?: string }).review_by ?? "";
    const notes: string[] = [];
    if (!vs.length) notes.push("no version (awaiting the figure)");
    else {
      const last = vs[vs.length - 1];
      if (last.to) notes.push(`closed: no version on or after ${last.to}`);
      else if (last.from < "2026-01-01") notes.push("open version from before 2026");
      if (paramYearly(it) && !last.to) {
        const nextFrom = `${+last.from.slice(0, 4) + 1}${last.from.slice(4)}`;
        if (nextFrom <= addDays(NEXT_YEAR_DUE, 90)) notes.push(`yearly: the ${nextFrom} figure is due; the open ${last.from} version answers for dates after it`);
      }
      if (rb && rb <= NEXT_YEAR_DUE) notes.push(`review_by ${rb} has passed`);
    }
    if (!notes.length) continue;
    emit(`| ${it.id} | ${it.identifier} | ${vs.map((v) => v.from + (v.to ? ">" + v.to : "")).join(" ")} | ${rb} | ${notes.join("; ")} |`);
  }
  emit("");
  emit("### Stored tests that read a yearly figure after its year");
  emit("");
  emit("A rule test or household whose determination date is a year or more after the `from` of the yearly parameter version it reads.");
  emit("");
  const yearly = led.items.filter((it) => it.kind === "parameter" && Array.isArray(it.versions) && it.versions.length && paramYearly(it));
  const yearlyIds = new Set(yearly.map((it) => it.identifier));
  const stale = new Map<string, Set<string>>();
  for (const u of units) {
    const d = dataOf(u.dataKey);
    const read = new Set<string>();
    try {
      evaluate(ix, d, u.identifier, u.person, u.month, (e: TraceEvent) => {
        if (e.kind === "parameter" && yearlyIds.has(e.identifier) && e.origin === "parameter") read.add(e.identifier);
      });
    } catch { /* an error is reported by npm run check */ }
    for (const id of read) {
      if (id in d.params) continue;
      const it = ix.byIdentifier.get(id)!;
      const v = versionInForce(it, d.det);
      if (!v || v.to) continue;
      const anniversary = `${+v.from.slice(0, 4) + 1}${v.from.slice(4)}`;
      if (d.det >= anniversary) {
        const k = `${it.id} ${id} (version from ${v.from})`;
        const s = stale.get(k) ?? new Set<string>();
        s.add(u.kind === "rule" ? u.key : u.key.split(":")[0] + ` (${d.det})`);
        stale.set(k, s);
      }
    }
  }
  emit("| Parameter | Read by (test or case, determination date) |");
  emit("|---|---|");
  for (const [k, s] of [...stale].sort()) emit(`| ${k} | ${[...s].slice(0, 12).join(", ")}${s.size > 12 ? ` and ${s.size - 12} more` : ""} |`);
  emit("");
}

/** The date each age is measured to. A shared age item is named by the date
 *  its own rule measures to; an inline `years_between` by its second date. */
const AGE_ITEMS: Record<string, string> = {
  age: "the determination date",
  ma_age_before_determination_month: "the last day before the determination month",
  ma_age_on_first_day_of_determination_month: "the first day of the determination month",
  ma_age_at_foster_care_exit: "the foster care exit date",
};
function measuredTo(e: Expr): { to: string; anchored: boolean } | null {
  if (typeof e === "string" && e in AGE_ITEMS) {
    return { to: AGE_ITEMS[e], anchored: e !== "ma_age_at_foster_care_exit" };
  }
  if (Array.isArray(e) && e[0] === "years_between") {
    const end = e[2] as Expr;
    const ops = opsIn(end);
    const anchored = (ops.has("det_date") || ops.has("det_month")) && !ops.has("month");
    return { to: show(end, 70), anchored };
  }
  return null;
}

function ages(): void {
  // which derived items are read by a per-month item (directly)
  const readByMonthly = new Set<string>();
  for (const it of derived) {
    if (it.scope !== "person-month") continue;
    for (const id of identifiersIn(it.derived ?? null)) readByMonthly.add(id);
  }
  emit("### Ages: the date each age comparison measures to");
  emit("");
  emit("Every threshold comparison with an age on one side. \"Anchored\" means the age is taken on the determination date or month whatever month is being determined; \"per month\" means the item is determined month by month (person-month scope) or a per-month item reads it, so a retroactive month, an application month before the determination month, or a later month is judged with the determination date's age.");
  emit("");
  emit("| Item | Identifier | Scope | Comparison | Measured to | Anchored, per month |");
  emit("|---|---|---|---|---|---|");
  let flagged = 0;
  for (const it of derived) {
    for (const node of nodesByItem.get(it.id) ?? []) {
      if (!CMP.has(node.op)) continue;
      const e = at(it.derived ?? null, node.path) as unknown as unknown[];
      const m = measuredTo(e[1] as Expr) ?? measuredTo(e[2] as Expr);
      if (!m) continue;
      const perMonth = it.scope === "person-month" || readByMonthly.has(it.identifier);
      const flag = m.anchored && perMonth && !node.ancestors.includes("of");
      if (flag) flagged++;
      emit(`| ${it.id} | ${it.identifier} | ${it.scope} | ${show(e as unknown as Expr, 80).replace(/\|/g, "\\|")} | ${m.to} | ${flag ? "**yes**" : ""} |`);
    }
  }
  emit("");
  emit(`${flagged} comparisons take an age on the determination date or month inside a per-month determination.`);
  emit("");
  emit("### Age parameter names against the comparison (conventions rule 8)");
  emit("");
  emit("`_min_age` and `_max_age` are inclusive, `_age_limit` exclusive. Listed: a comparison whose operator treats the parameter the other way.");
  emit("");
  emit("| Item | Identifier | Comparison |");
  emit("|---|---|---|");
  for (const it of derived) {
    for (const node of nodesByItem.get(it.id) ?? []) {
      if (!CMP.has(node.op)) continue;
      const e = at(it.derived ?? null, node.path) as unknown as unknown[];
      const [a, b] = [e[1], e[2]];
      const check = (param: unknown, side: "left" | "right"): boolean => {
        if (typeof param !== "string") return false;
        // V op P, normalised so the parameter is on the right
        const op = side === "right" ? node.op : ({ "<": ">", "<=": ">=", ">": "<", ">=": "<=" } as Record<string, string>)[node.op];
        if (/_age_limit$/.test(param)) return op === "<=" || op === ">";
        if (/_(min|max)_age$/.test(param)) {
          const isMax = /_max_age$/.test(param);
          return isMax ? op === "<" || op === ">=" : op === "<=" || op === ">";
        }
        return false;
      };
      if (check(b, "right") || check(a, "left")) {
        emit(`| ${it.id} | ${it.identifier} | ${show(e as unknown as Expr, 90).replace(/\|/g, "\\|")} |`);
      }
    }
  }
  emit("");
}

// ---------------------------------------------------------------------------
// 2. Coverage

type MarkKind = "arm" | "else" | "stated" | "default" | "true" | "false" | "equal";
interface Marker { id: string; node: Node; kind: MarkKind; arm?: number }
const markers: Marker[] = [];
const markerById = new Map<string, Marker>();
function mark(node: Node, kind: MarkKind, armIdx?: number): string {
  const id = `zcov_${markers.length}`;
  const m: Marker = { id, node, kind, arm: armIdx };
  markers.push(m);
  markerById.set(id, m);
  return id;
}
/** The value unchanged, after reading a marker under `unknown`. */
function wrap(v: Expr, id: string): Expr {
  return ["case", [["unknown", id], v]] as unknown as Expr;
}

function instrument(it: Item): Item {
  const nodes = nodesByItem.get(it.id) ?? [];
  const byPath = new Map(nodes.map((n) => [n.path.join("."), n]));
  const tx = (e: Expr, p: Path): Expr => {
    if (!Array.isArray(e) || !e.length || typeof e[0] !== "string") return e;
    const node = byPath.get(p.join("."));
    const op = e[0] as string;
    if (op === "case" && node) {
      const arms = e.slice(1).map((arm: unknown, i: number) => {
        const a = arm as unknown[];
        if (a[0] === "else") return ["else", wrap(tx(a[1] as Expr, [...p, i + 1, 1]), mark(node, "else", i))];
        return [tx(a[0] as Expr, [...p, i + 1, 0]), wrap(tx(a[1] as Expr, [...p, i + 1, 1]), mark(node, "arm", i))];
      });
      return ["case", ...arms] as unknown as Expr;
    }
    const args = e.slice();
    for (const i of evaluatedArgs(e)) args[i] = tx(e[i] as Expr, [...p, i]);
    if (op === "otherwise" && node) {
      const left = args[1] as Expr;
      return ["case",
        [["unknown", left], wrap(args[2] as Expr, mark(node, "default"))],
        ["else", wrap(left, mark(node, "stated"))]] as unknown as Expr;
    }
    if (CMP.has(op) && node) {
      const eq = mark(node, "equal");
      return ["case",
        [["=", args[1], args[2]], wrap(args as unknown as Expr, eq)],
        [args, wrap(true, mark(node, "true"))],
        ["else", wrap(false, mark(node, "false"))]] as unknown as Expr;
    }
    return args as unknown as Expr;
  };
  return { ...it, derived: tx(it.derived ?? null, []) };
}

// marker hits per unit, and units per marker
const unitsByMarker = new Map<string, Set<number>>();
const hitByUnitKind = new Map<string, { rule: boolean; case: boolean }>();
let coverageDone = false;

function collectCoverage(): void {
  if (coverageDone) return;
  coverageDone = true;
  const instrumented = led.items.map((it) => (it.kind === "derived" && it.derived != null ? instrument(it) : it));
  const markerItems: Item[] = markers.map((m) => ({
    id: m.id.toUpperCase(), name: m.id, identifier: m.id, kind: "parameter", type: "money",
    scope: "global", program: "All", versions: [],
  }));
  const ixI = buildIndex([...instrumented, ...markerItems], roles);
  const t1 = Date.now();
  let mismatch = 0;
  units.forEach((u, ui) => {
    const hits = new Set<string>();
    const v = run(ixI, u, dataOf(u.dataKey), (id) => { if (id.startsWith("zcov_")) hits.add(id); });
    if (!same(v, baseValue.get(u.key))) {
      mismatch++;
      if (mismatch <= 5) console.error(`instrumentation changed ${u.key}: ${JSON.stringify(baseValue.get(u.key))} -> ${JSON.stringify(v)}`);
    }
    for (const h of hits) {
      const s = unitsByMarker.get(h) ?? new Set<number>();
      s.add(ui);
      unitsByMarker.set(h, s);
      const k = hitByUnitKind.get(h) ?? { rule: false, case: false };
      k[u.kind] = true;
      hitByUnitKind.set(h, k);
    }
  });
  console.error(`coverage: ${markers.length} markers, ${Date.now() - t1} ms, ${mismatch} value changes from instrumentation`);
  if (mismatch) throw new Error("instrumentation changed a value; coverage is not trustworthy");
}

function hit(id: string, by?: "rule" | "case"): boolean {
  const k = hitByUnitKind.get(id);
  if (!k) return false;
  return by ? k[by] : k.rule || k.case;
}

function coverage(): void {
  collectCoverage();
  emit("## 2. Branch coverage");
  emit("");
  emit("A branch is a `case` arm (`else` included), each side of an `otherwise` (the fact stated, the default taken), and each outcome of a threshold comparison. \"Rule\" counts what the rule tests reach, \"household\" what the stored households reach, \"either\" both together. \"At boundary\" counts comparisons some test evaluates with both sides equal.");
  emit("");
  const programs = [...new Set(derived.map((it) => it.program))].sort();
  emit("| Program | `case` arms | rule | household | either | `otherwise` sides | either | comparison outcomes | either | comparisons at boundary |");
  emit("|---|---|---|---|---|---|---|---|---|---|");
  const totals = { arms: 0, armR: 0, armH: 0, armE: 0, oth: 0, othE: 0, cmp: 0, cmpE: 0, cmpN: 0, eq: 0 };
  const pct = (a: number, b: number) => (b ? `${a}/${b} (${Math.round((100 * a) / b)}%)` : "-");
  for (const prog of programs) {
    const ms = markers.filter((m) => m.node.item.program === prog);
    const arms = ms.filter((m) => m.kind === "arm" || m.kind === "else");
    const oth = ms.filter((m) => m.kind === "stated" || m.kind === "default");
    const cmp = ms.filter((m) => m.kind === "true" || m.kind === "false");
    const eq = ms.filter((m) => m.kind === "equal");
    const r = {
      arms: arms.length, armR: arms.filter((m) => hit(m.id, "rule")).length,
      armH: arms.filter((m) => hit(m.id, "case")).length, armE: arms.filter((m) => hit(m.id)).length,
      oth: oth.length, othE: oth.filter((m) => hit(m.id)).length,
      cmp: cmp.length, cmpE: cmp.filter((m) => hit(m.id)).length, cmpN: eq.length,
      eq: eq.filter((m) => hit(m.id)).length,
    };
    for (const k of Object.keys(totals) as Array<keyof typeof totals>) totals[k] += r[k];
    emit(`| ${prog} | ${r.arms} | ${pct(r.armR, r.arms)} | ${pct(r.armH, r.arms)} | ${pct(r.armE, r.arms)} | ${r.oth} | ${pct(r.othE, r.oth)} | ${r.cmp} | ${pct(r.cmpE, r.cmp)} | ${pct(r.eq, r.cmpN)} |`);
  }
  const t = totals;
  emit(`| **all** | ${t.arms} | ${pct(t.armR, t.arms)} | ${pct(t.armH, t.arms)} | ${pct(t.armE, t.arms)} | ${t.oth} | ${pct(t.othE, t.oth)} | ${t.cmp} | ${pct(t.cmpE, t.cmp)} | ${pct(t.eq, t.cmpN)} |`);
  emit("");
  emit("### `case` arms no rule test and no household reaches");
  emit("");
  emit("| Item | Identifier | Program | Arm | Condition |");
  emit("|---|---|---|---|---|");
  for (const m of markers) {
    if ((m.kind !== "arm" && m.kind !== "else") || hit(m.id)) continue;
    const node = at(m.node.item.derived ?? null, m.node.path) as unknown as unknown[];
    const arm = node[m.arm! + 1] as unknown[];
    emit(`| ${m.node.item.id} | ${m.node.item.identifier} | ${m.node.item.program} | ${m.arm! + 1}${m.kind === "else" ? " (else)" : ""} | ${m.kind === "else" ? "else" : show(arm[0] as Expr, 90).replace(/\|/g, "\\|")} |`);
  }
  emit("");
  emit("### Threshold comparisons with an outcome no test reaches");
  emit("");
  emit("| Item | Identifier | Program | Comparison | Never |");
  emit("|---|---|---|---|---|");
  const cmpNodes = new Map<Node, Marker[]>();
  for (const m of markers) if (m.kind === "true" || m.kind === "false") cmpNodes.set(m.node, [...(cmpNodes.get(m.node) ?? []), m]);
  for (const [node, ms] of cmpNodes) {
    const never = ms.filter((m) => !hit(m.id)).map((m) => m.kind);
    if (!never.length) continue;
    emit(`| ${node.item.id} | ${node.item.identifier} | ${node.item.program} | ${show(at(node.item.derived ?? null, node.path), 90).replace(/\|/g, "\\|")} | ${never.join(", ")} |`);
  }
  emit("");
}

// ---------------------------------------------------------------------------
// 3. Mutation

interface Mutant { node: Node; what: string; tree: Expr; reach: string[] }
function mutants(): Mutant[] {
  const list: Mutant[] = [];
  for (const it of derived) {
    for (const node of nodesByItem.get(it.id) ?? []) {
      const e = at(it.derived ?? null, node.path) as unknown as unknown[];
      const ms = markers.filter((m) => m.node === node);
      if (CMP.has(node.op)) {
        const flip: Record<string, string> = { "<": "<=", "<=": "<", ">": ">=", ">=": ">" };
        const tree = replaceAt(it.derived ?? null, node.path, [flip[node.op], e[1], e[2]] as unknown as Expr);
        list.push({ node, what: `${node.op} -> ${flip[node.op]}`, tree, reach: ms.map((m) => m.id) });
      } else if (node.op === "case" && e.length >= 3) {
        const a0 = e[1] as unknown[], a1 = e[2] as unknown[];
        const v0 = a0[1], v1 = a1[1];
        if (JSON.stringify(v0) === JSON.stringify(v1)) continue;
        const sw = e.slice();
        sw[1] = [a0[0], v1];
        sw[2] = [a1[0], v0];
        const tree = replaceAt(it.derived ?? null, node.path, sw as unknown as Expr);
        list.push({ node, what: "swap results of arms 1 and 2", tree, reach: ms.map((m) => m.id) });
      }
    }
  }
  return list;
}

interface MutantResult { m: Mutant; reached: number; killed: boolean; by?: string; sampled: boolean }
const survivors: MutantResult[] = [];
function mutation(): void {
  collectCoverage();
  const list = mutants();
  const t2 = Date.now();
  const results: MutantResult[] = [];
  for (const m of list) {
    const reach = new Set<number>();
    for (const id of m.reach) for (const ui of unitsByMarker.get(id) ?? []) reach.add(ui);
    const cand = [...reach].filter((ui) => basePass.has(units[ui].key));
    // the item's own rule tests first: the cheapest and the most direct
    cand.sort((a, b) => (units[a].itemId === m.node.item.id ? 0 : 1) - (units[b].itemId === m.node.item.id ? 0 : 1));
    const mix = indexWith(ix, [{ ...m.node.item, derived: m.tree }]);
    let killed = false;
    let by: string | undefined;
    for (const ui of cand.slice(0, maxUnits)) {
      const u = units[ui];
      if (!valuesEqual(run(mix, u), u.expect)) { killed = true; by = u.key; break; }
    }
    const r: MutantResult = { m, reached: cand.length, killed, by, sampled: !killed && cand.length > maxUnits };
    results.push(r);
    if (!killed) survivors.push(r);
  }
  console.error(`mutation: ${list.length} mutants, ${Date.now() - t2} ms`);
  emit("## 3. Mutation score");
  emit("");
  emit(`Each threshold comparison flipped between strict and inclusive, and each \`case\` of two or more arms with its first two results swapped. Killed: some test that reaches the node and passes on the ledger fails on the mutant (at most ${maxUnits} reaching tests are run per mutant). Unreached: no test evaluates the node.`);
  emit("");
  emit("| Program | Comparison flips | killed | unreached | Arm swaps | killed | unreached | Score (killed / all) | Score (killed / reached) |");
  emit("|---|---|---|---|---|---|---|---|---|");
  const programs = [...new Set(results.map((r) => r.m.node.item.program))].sort();
  const row = (rs: MutantResult[], label: string) => {
    const f = rs.filter((r) => CMP.has(r.m.node.op));
    const s = rs.filter((r) => r.m.node.op === "case");
    const k = (xs: MutantResult[]) => xs.filter((r) => r.killed).length;
    const u = (xs: MutantResult[]) => xs.filter((r) => r.reached === 0).length;
    const reached = rs.length - u(rs);
    const pc = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "-");
    emit(`| ${label} | ${f.length} | ${k(f)} | ${u(f)} | ${s.length} | ${k(s)} | ${u(s)} | ${pc(k(rs), rs.length)} | ${pc(k(rs), reached)} |`);
  };
  for (const p of programs) row(results.filter((r) => r.m.node.item.program === p), p);
  row(results, "**all**");
  emit("");
  emit("### Surviving comparison flips on reached nodes");
  emit("");
  emit("A strict/inclusive flip no reaching test notices: no test puts the two sides equal. These are the comparisons the generated boundary cases (section 4) exercise.");
  emit("");
  emit("| Item | Identifier | Program | Comparison | Reaching tests |");
  emit("|---|---|---|---|---|");
  for (const r of survivors) {
    if (!CMP.has(r.m.node.op) || r.reached === 0) continue;
    emit(`| ${r.m.node.item.id} | ${r.m.node.item.identifier} | ${r.m.node.item.program} | ${show(at(r.m.node.item.derived ?? null, r.m.node.path), 90).replace(/\|/g, "\\|")} | ${r.reached}${r.sampled ? " (sampled)" : ""} |`);
  }
  emit("");
  emit("### Surviving arm swaps on reached nodes");
  emit("");
  emit("| Item | Identifier | Program | Reaching tests |");
  emit("|---|---|---|---|");
  for (const r of survivors) {
    if (r.m.node.op !== "case" || r.reached === 0) continue;
    emit(`| ${r.m.node.item.id} | ${r.m.node.item.identifier} | ${r.m.node.item.program} | ${r.reached}${r.sampled ? " (sampled)" : ""} |`);
  }
  emit("");
}

// ---------------------------------------------------------------------------
// 4. Boundaries

/** Which side of a threshold T the value T itself belongs with, by the
 *  wording before or after it. "below": T goes with the values under it
 *  ("not more than T", "T or less", "exceeds T"); "above": with the values
 *  over it ("less than T", "under T", "at least T", "T or older"). */
const PHRASES: Array<[RegExp, "below" | "above", "before" | "after"]> = [
  [/\b(at or below|equal to or less than|less than or equal to|not (?:more|greater) than|no (?:more|greater) than|not (?:to )?exceed(?:ing)?|does not exceed|do not exceed|up to(?: and including)?|at most|on or before|no later than)\s*(?:age\s*)?\$?[\d,.]*\s*$/i, "below", "before"],
  [/\b(more than|greater than|in excess of|exceeds?|exceeding|over|above|older than|after|later than|beyond)\s*(?:age\s*)?\$?[\d,.]*\s*$/i, "below", "before"],
  [/\b(at or above|equal to or (?:more|greater) than|(?:greater|more) than or equal to|not less than|no less than|at least|on or after|no earlier than|minimum of)\s*(?:age\s*)?\$?[\d,.]*\s*$/i, "above", "before"],
  [/\b(less than|fewer than|under|below|younger than|before|prior to|earlier than)\s*(?:age\s*)?\$?[\d,.]*\s*$/i, "above", "before"],
  [/^\s*(?:%|percent|years?(?: of age| old)?|months?|days?)?\s*(or less|or fewer|or under|or below|or younger|or lower|or earlier|and under|and below|and younger)\b/i, "below", "after"],
  [/^\s*(?:%|percent|years?(?: of age| old)?|months?|days?)?\s*(or more|or older|or over|or above|or greater|or higher|or later|and over|and older|and above|or after)\b/i, "above", "after"],
  [/^\s*(?:%|percent|years?(?: of age| old)?)?\s*(through the month|through the end of the month|through the last day)\b/i, "below", "after"],
];

function numberForms(t: number): string[] {
  const forms = new Set<string>();
  const add = (x: number) => {
    if (!Number.isFinite(x)) return;
    const r = Math.round(x * 100) / 100;
    forms.add(String(r));
    forms.add(r.toLocaleString("en-US", { maximumFractionDigits: 2 }));
    if (Number.isInteger(r)) forms.add(r.toLocaleString("en-US", { minimumFractionDigits: 2 }));
  };
  add(t);
  if (t > 0 && t < 10 && !Number.isInteger(t)) add(t * 100);
  return [...forms].filter((f) => f.length > 0);
}

interface Wording { membership: "below" | "above"; phrase: string; excerpt: string; near: boolean }
function wordingFor(itemSources: string[], threshold: unknown): Wording[] {
  const found: Wording[] = [];
  const forms = typeof threshold === "number" ? numberForms(threshold) : [];
  for (const sid of itemSources) {
    const text = (sourceTexts[sid] ?? "").replace(/\s+/g, " ");
    if (!text) continue;
    for (const f of forms) {
      const re = new RegExp(`(?<![\\d.,])${f.replace(/[.$]/g, "\\$&")}(?![\\d]|,\\d)`, "g");
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(text))) {
        const before = text.slice(Math.max(0, mm.index - 70), mm.index + f.length);
        const after = text.slice(mm.index + f.length, mm.index + f.length + 45);
        for (const [rx, membership, where] of PHRASES) {
          const hitx = where === "before" ? rx.exec(before.slice(0, before.length - f.length) + "") : rx.exec(after);
          if (hitx) {
            found.push({ membership, phrase: (where === "before" ? hitx[1] + " " + f : f + " " + hitx[1]).trim(), excerpt: sid, near: true });
            break;
          }
        }
      }
    }
  }
  return found;
}

interface Variation { label: string; value: unknown; cmp: unknown; item: unknown; outcome: unknown }
interface BoundaryRow {
  node: Node; unit: Unit | null; person: string | null; month: string | null;
  variable: string | null; how: string; threshold: unknown; current: unknown;
  variations: Variation[]; cmpLands: string; itemLands: string; outcomeLands: string;
  wording: Wording[]; flag: string; note: string;
}

let synthN = 0;
function synth(scopeOf: Item, e: Expr): Item {
  synthN++;
  return {
    id: `ZB-${synthN}`, name: `zb ${synthN}`, identifier: `zb_${synthN}`, kind: "derived",
    type: "number", scope: scopeOf.scope, program: scopeOf.program, derived: e,
  };
}
function evalIn(index: LedgerIndex, data: CaseData, identifier: string, p: string | null, m: string | null): unknown {
  try {
    return evaluate(index, data, identifier, p, m);
  } catch (ex) {
    return "error: " + (ex as Error).message;
  }
}

function setStated(data: CaseData, id: string, p: string | null, m: string | null, v: unknown): boolean {
  const it = ix.byIdentifier.get(id);
  if (!it) return false;
  if (it.kind === "parameter") { data.params[id] = v; return true; }
  switch (it.scope) {
    case "person": if (!p) return false; (data.persons[p] ??= {})[id] = v; return true;
    case "person-month": {
      if (!p) return false;
      if (m) ((data.months[p] ??= {})[m] ??= {})[id] = v;
      else (data.monthDefaults[p] ??= {})[id] = v;
      return true;
    }
    case "case": data.caseFacts[id] = v; return true;
    case "month": if (!m) return false; (data.monthFacts[m] ??= {})[id] = v; return true;
    default: return false;
  }
}

function isThresholdSide(e: Expr): boolean {
  if (typeof e === "number") return true;
  if (typeof e === "string") {
    if (/^\d{4}-\d{2}/.test(e)) return true;
    const it = ix.byIdentifier.get(e);
    return !!it && (it.kind === "parameter" || it.scope === "global");
  }
  if (Array.isArray(e)) {
    const ids = [...identifiersIn(e)];
    const ops = opsIn(e);
    if (ops.has("det_date") || ops.has("det_month") || ops.has("month")) {
      return ids.every((i) => ix.byIdentifier.get(i)!.kind === "parameter");
    }
    return ids.length > 0 && ids.every((i) => ix.byIdentifier.get(i)!.kind === "parameter");
  }
  return false;
}

function stepFor(id: string | null, sample: unknown): { kind: "date" | "month" | "number"; step: number } {
  const it = id ? ix.byIdentifier.get(id) : undefined;
  if (typeof sample === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sample)) return { kind: "date", step: 1 };
  if (typeof sample === "string" && /^\d{4}-\d{2}$/.test(sample)) return { kind: "month", step: 1 };
  const t = it?.type ?? "";
  if (t === "money") return { kind: "number", step: 0.01 };
  if (t === "rate") return { kind: "number", step: 0.0001 };
  if (t === "hours") return { kind: "number", step: 0.01 };
  return { kind: "number", step: typeof sample === "number" && !Number.isInteger(sample) ? 0.01 : 1 };
}
function shift(v: unknown, kind: "date" | "month" | "number", step: number, dir: number): unknown {
  if (kind === "date") return addDays(v as string, dir * step);
  if (kind === "month") return addMonths(v as string, dir * step);
  return Math.round(((v as number) + dir * step) * 1e6) / 1e6;
}
function lands(below: unknown, atv: unknown, above: unknown): string {
  const eb = same(atv, below), ea = same(atv, above);
  if (eb && ea) return "no change";
  if (eb) return "with below";
  if (ea) return "with above";
  return "neither";
}

function contextsOf(u: Unit, identifier: string): Array<[string | null, string | null]> {
  const ctx: Array<[string | null, string | null]> = [];
  const seen = new Set<string>();
  try {
    evaluate(ix, dataOf(u.dataKey), u.identifier, u.person, u.month, (e: TraceEvent) => {
      if (e.identifier === identifier && (e.origin === "evaluated")) {
        const k = `${e.person}|${e.month}`;
        if (!seen.has(k)) { seen.add(k); ctx.push([e.person, e.month]); }
      }
    });
  } catch { /* reported by npm run check */ }
  // a rule test of the item itself evaluates it at the top
  if (u.identifier === identifier && !seen.has(`${u.person}|${u.month}`)) ctx.unshift([u.person, u.month]);
  return ctx;
}

const boundaryRows: BoundaryRow[] = [];
function boundaries(): void {
  collectCoverage();
  const t3 = Date.now();
  for (const it of derived) {
    for (const node of nodesByItem.get(it.id) ?? []) {
      if (!CMP.has(node.op)) continue;
      const e = at(it.derived ?? null, node.path) as unknown as unknown[];
      const L = e[1] as Expr, R = e[2] as Expr;
      const row: BoundaryRow = {
        node, unit: null, person: null, month: null, variable: null, how: "", threshold: null,
        current: null, variations: [], cmpLands: "", itemLands: "", outcomeLands: "", wording: [],
        flag: "", note: "",
      };
      boundaryRows.push(row);
      if (node.ancestors.some((a) => REBINDS.has(a)) || opsIn(e as unknown as Expr).has("P") ||
        opsIn(e as unknown as Expr).has("that_month")) {
        row.note = "under a binder or a month change: not generated";
        continue;
      }
      // the variable side and the threshold side
      let varSide: 1 | 2;
      const lt = isThresholdSide(L), rt = isThresholdSide(R);
      if (rt && !lt) varSide = 1;
      else if (lt && !rt) varSide = 2;
      else if (!lt && !rt) varSide = typeof L === "string" ? 1 : typeof R === "string" ? 2 : 1;
      else { row.note = "both sides are fixed figures"; continue; }
      const V = (varSide === 1 ? L : R) as Expr;
      const T = (varSide === 1 ? R : L) as Expr;
      // normalised operator: V op T
      const flipOp: Record<string, string> = { "<": ">", "<=": ">=", ">": "<", ">=": "<=" };
      const opN = varSide === 1 ? node.op : flipOp[node.op];
      // reaching units, households first
      const ms = markers.filter((m) => m.node === node);
      const reach = new Set<number>();
      for (const m of ms) for (const ui of unitsByMarker.get(m.id) ?? []) reach.add(ui);
      const cand = [...reach].sort((a, b) => (units[a].kind === "case" ? 0 : 1) - (units[b].kind === "case" ? 0 : 1));
      if (!cand.length) { row.note = "no test reaches it"; continue; }
      const sideItemV = synth(it, V), sideItemT = synth(it, T), cmpItem = synth(it, e as unknown as Expr);
      const six = indexWith(ix, [sideItemV, sideItemT, cmpItem]);
      let chosen: { u: Unit; p: string | null; m: string | null; v: unknown; t: unknown } | null = null;
      for (const ui of cand.slice(0, 8)) {
        const u = units[ui];
        for (const [p, m] of contextsOf(u, it.identifier).slice(0, 6)) {
          const d = dataOf(u.dataKey);
          const vv = evalIn(six, d, sideItemV.identifier, p, m);
          const tv = evalIn(six, d, sideItemT.identifier, p, m);
          if (vv !== null && tv !== null && typeof tv !== "object" && !(typeof vv === "string" && vv.startsWith("error"))) {
            chosen = { u, p, m, v: vv, t: tv };
            break;
          }
        }
        if (chosen) break;
      }
      if (!chosen) { row.note = "no reaching test has both sides known"; continue; }
      row.unit = chosen.u; row.person = chosen.p; row.month = chosen.m;
      row.threshold = chosen.t; row.current = chosen.v;
      // how to vary V
      type Setter = (d: CaseData, target: unknown) => boolean;
      let setter: Setter | null = null;
      let targetFor = (t: unknown) => t;
      const { kind, step } = stepFor(typeof V === "string" ? V : null, chosen.t);
      if (typeof V === "string" && ix.byIdentifier.get(V)!.scope !== "global") {
        row.variable = V; row.how = "stated";
        setter = (d, x) => setStated(d, V, chosen!.p, chosen!.m, x);
      } else if (Array.isArray(V) && V[0] === "years_between" && typeof V[1] === "string" &&
        ix.byIdentifier.get(V[1] as string)?.kind === "supplied") {
        // vary the start date so the whole years are T-1, T, T+1 on the date the rule measures to
        const endItem = synth(it, V[2] as Expr);
        const eix = indexWith(six, [endItem]);
        const end = evalIn(eix, dataOf(chosen.u.dataKey), endItem.identifier, chosen.p, chosen.m);
        if (typeof end === "string" && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
          row.variable = V[1] as string; row.how = `start date, measured to ${end}`;
          const startFor = (years: number): string => {
            const y = +end.slice(0, 4) - years;
            return `${String(y).padStart(4, "0")}${end.slice(4)}`;
          };
          targetFor = (years) => startFor(years as number);
          setter = (d, x) => setStated(d, V[1] as string, chosen!.p, chosen!.m, x);
        }
      }
      if (!setter || typeof chosen.t === "object") {
        row.note = `variable side ${show(V, 60)} is an expression: not generated`;
        continue;
      }
      const triples: Array<[string, unknown]> = kind === "number" && row.how.startsWith("start date")
        ? [["below", targetFor((chosen.t as number) - 1)], ["at", targetFor(chosen.t)], ["above", targetFor((chosen.t as number) + 1)]]
        : [["below", shift(chosen.t, kind, step, -1)], ["at", chosen.t], ["above", shift(chosen.t, kind, step, 1)]];
      // an age measured in whole years from a date of birth also gets the
      // day-level variations: the birthday the day after, on, and the day
      // before the date it is measured to
      const dayLevel: Array<[string, unknown]> = [];
      if (row.how.startsWith("start date")) {
        const b = targetFor(chosen.t) as string;
        dayLevel.push(["turns T the day after", addDays(b, 1)], ["turns T on the day", b], ["turned T the day before", addDays(b, -1)]);
      }
      const evalVariant = (label: string, x: unknown): Variation => {
        const d = structuredClone(dataOf(chosen!.u.dataKey));
        setter!(d, x);
        return {
          label, value: x,
          cmp: evalIn(six, d, cmpItem.identifier, chosen!.p, chosen!.m),
          item: evalIn(ix, d, it.identifier, chosen!.p, chosen!.m),
          outcome: evalIn(ix, d, chosen!.u.identifier, chosen!.u.person, chosen!.u.month),
        };
      };
      row.variations = [...triples, ...dayLevel].map(([l, x]) => evalVariant(l, x));
      const [b, a, ab] = row.variations;
      row.cmpLands = lands(b.cmp, a.cmp, ab.cmp);
      row.itemLands = lands(b.item, a.item, ab.item);
      row.outcomeLands = lands(b.outcome, a.outcome, ab.outcome);
      // wording: the item's excerpts and the threshold's parameters' excerpts
      const srcs = new Set<string>(it.sources ?? []);
      for (const pid of identifiersIn(T)) {
        const p = ix.byIdentifier.get(pid)!;
        for (const s of p.sources ?? []) srcs.add(s);
        for (const v of p.versions ?? []) if (v.source) srcs.add(v.source);
      }
      row.wording = wordingFor([...srcs], chosen.t);
      // the comparison's own membership of T, from the operator
      const opMembership = opN === "<=" || opN === ">" ? "below" : "above";
      const ws = new Set(row.wording.map((w) => w.membership));
      if (ws.size === 1 && !ws.has(opMembership)) row.flag = "DISAGREES";
      else if (ws.size === 2) row.flag = "mixed wording";
      row.note = `V ${opN} T`;
    }
  }
  console.error(`boundaries: ${boundaryRows.length} comparisons, ${Date.now() - t3} ms`);
  emit("## 4. Generated boundary cases");
  emit("");
  const gen = boundaryRows.filter((r) => r.variations.length);
  emit(`${boundaryRows.length} threshold comparisons; ${gen.length} generated. The threshold T is the comparison's fixed side as evaluated in the reaching test; "lands" says which neighbour the value at T gives the same answer as, for the comparison itself, the item that holds it, and the reaching test's own identifier. "Wording" is the phrase the cited excerpts put next to T's figure, and the side it puts T on.`);
  emit("");
  emit("### Flagged: the boundary lands on the other side from the wording, or the wording is mixed");
  emit("");
  emit("| Item | Identifier | Comparison | From | T | Comparison lands | Item lands | Outcome lands | Wording |");
  emit("|---|---|---|---|---|---|---|---|---|");
  for (const r of gen.filter((x) => x.flag)) {
    emit(`| ${r.node.item.id} | ${r.node.item.identifier} | ${show(at(r.node.item.derived ?? null, r.node.path), 70).replace(/\|/g, "\\|")} (${r.note}) | ${r.unit!.key} ${r.person ?? ""} ${r.month ?? ""} | ${JSON.stringify(r.threshold)} | ${r.cmpLands} | ${r.itemLands} | ${r.outcomeLands} | ${r.flag}: ${[...new Set(r.wording.map((w) => `"${w.phrase}" (${w.excerpt}, ${w.membership})`))].slice(0, 4).join("; ")} |`);
  }
  emit("");
  emit("### Every generated comparison");
  emit("");
  emit("| Item | Identifier | Comparison | Variable | From | T | below / at / above (item) | Item lands | Outcome lands | Wording |");
  emit("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of gen) {
    const its = r.variations.slice(0, 3).map((v) => JSON.stringify(v.item)).join(" / ");
    const dl = r.variations.length > 3 ? `; by day: ${r.variations.slice(3).map((v) => JSON.stringify(v.item)).join(" / ")}` : "";
    emit(`| ${r.node.item.id} | ${r.node.item.identifier} | ${show(at(r.node.item.derived ?? null, r.node.path), 60).replace(/\|/g, "\\|")} | ${r.variable} (${r.how}) | ${r.unit!.key} ${r.person ?? ""} ${r.month ?? ""} | ${JSON.stringify(r.threshold)} | ${its}${dl} | ${r.itemLands} | ${r.outcomeLands} | ${[...new Set(r.wording.map((w) => `"${w.phrase}"`))].slice(0, 3).join("; ")} |`);
  }
  emit("");
  emit("### Not generated");
  emit("");
  const reasons = new Map<string, number>();
  for (const r of boundaryRows.filter((x) => !x.variations.length)) {
    const k = r.note.replace(/variable side .* is an expression/, "variable side is an expression");
    reasons.set(k, (reasons.get(k) ?? 0) + 1);
  }
  emit("| Reason | Comparisons |");
  emit("|---|---|");
  for (const [k, n] of reasons) emit(`| ${k} | ${n} |`);
  emit("");
}

// ---------------------------------------------------------------------------

emit(`# Time audit: generated report (volume ${volume})`);
emit("");
emit(`Generated by \`npm run boundaries\`; ${units.length} test units (${units.filter((u) => u.kind === "rule").length} rule tests, ${units.filter((u) => u.kind === "case").length} household expectations), ${basePass.size} passing on the ledger.`);
emit("");
if (only.has("inventory")) inventory();
if (only.has("coverage")) coverage();
if (only.has("mutation")) mutation();
if (only.has("boundaries")) boundaries();
if (outFile) fs.writeFileSync(path.resolve(root, outFile), out.join("\n") + "\n");
