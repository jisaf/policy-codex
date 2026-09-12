import type { LedgerIndex } from "./ledger-index";
import { RESERVED, NAME_RE } from "./governance";
import type { HouseholdCase } from "./cases";
import type { Expr, Item, TestSpec } from "./types";

export interface RenameResult { changed: Item[]; errors: string[] }

/** True when `x` is one of the parser/evaluator's fixed operator tokens (or
 *  the determination-date/month/person placeholders). Those slots are never
 *  identifier references, so they are never candidates for renaming. */
function isOperatorToken(x: unknown): x is string {
  return typeof x === "string" && RESERVED.has(x);
}

/** Rewrites every leaf in `e` that is a bare reference to `from` into `to`.
 *  Walks generically, except for the two shapes where a literal array sits
 *  beside an operator: `in`'s option list (index 2) and `rel`/`exists_related`'s
 *  relationship-name list (index 1) are never walked, so a literal string that
 *  happens to equal an existing identifier is left alone. A tuple that is not
 *  an operator call (a `case` arm, `[condition, value]`) has every element
 *  walked, including index 0, since a bare identifier can stand there. */
function renameExpr(
  ix: LedgerIndex, e: Expr, from: string, to: string,
): { expr: Expr; changed: boolean } {
  if (typeof e === "string") {
    if (e === from && ix.byIdentifier.has(from)) return { expr: to, changed: true };
    return { expr: e, changed: false };
  }
  if (!Array.isArray(e) || !e.length) return { expr: e, changed: false };

  const op = e[0];
  if (isOperatorToken(op)) {
    if (op === "in") {
      const a = renameExpr(ix, e[1] as Expr, from, to);
      return { expr: a.changed ? ["in", a.expr, e[2]] : e, changed: a.changed };
    }
    if (op === "rel" || op === "exists_related") {
      const b = renameExpr(ix, e[2] as Expr, from, to);
      return { expr: b.changed ? [op, e[1], b.expr] : e, changed: b.changed };
    }
    let changed = false;
    const rest = (e.slice(1) as Expr[]).map((x) => {
      const r = renameExpr(ix, x, from, to);
      if (r.changed) changed = true;
      return r.expr;
    });
    return { expr: changed ? [op, ...rest] : e, changed };
  }

  let changed = false;
  const out = (e as Expr[]).map((x) => {
    const r = renameExpr(ix, x, from, to);
    if (r.changed) changed = true;
    return r.expr;
  });
  return { expr: changed ? out : e, changed };
}

function renameInDerived(
  ix: LedgerIndex, it: Item, from: string, to: string,
): { expr: Expr | undefined; changed: boolean } {
  if (it.kind !== "derived" || it.derived === undefined || it.derived === null) {
    return { expr: it.derived, changed: false };
  }
  return renameExpr(ix, it.derived, from, to);
}

/** `obj` with the key `from` renamed to `to`, in place of its original
 *  position, so a round trip through YAML keeps a stable key order. */
function renameKeys<T extends Record<string, unknown> | undefined>(
  obj: T, from: string, to: string,
): { obj: T; changed: boolean } {
  if (!obj || !(from in obj)) return { obj, changed: false };
  const next: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) next[k === from ? to : k] = v;
  return { obj: next as T, changed: true };
}

function renameKeyedMap(
  map: Record<string, Record<string, unknown>> | undefined, from: string, to: string,
): { map: Record<string, Record<string, unknown>> | undefined; changed: boolean } {
  if (!map) return { map, changed: false };
  let changed = false;
  const next: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of Object.entries(map)) {
    const r = renameKeys(v, from, to);
    next[k] = r.obj;
    if (r.changed) changed = true;
  }
  return { map: changed ? next : map, changed };
}

function renameTestSpec(t: TestSpec, from: string, to: string): { spec: TestSpec; changed: boolean } {
  let changed = false;
  const next: TestSpec = { ...t };

  const given = renameKeys(t.given, from, to);
  if (given.changed) { next.given = given.obj; changed = true; }

  const monthDefaults = renameKeys(t.month_defaults, from, to);
  if (monthDefaults.changed) { next.month_defaults = monthDefaults.obj; changed = true; }

  const parameters = renameKeys(t.parameters, from, to);
  if (parameters.changed) { next.parameters = parameters.obj; changed = true; }

  const monthFacts = renameKeyedMap(t.month_facts, from, to);
  if (monthFacts.changed) { next.month_facts = monthFacts.map; changed = true; }

  if (t.others) {
    const others = renameKeyedMap(t.others, from, to);
    if (others.changed) { next.others = others.map; changed = true; }
  }

  if (t.persons) {
    let personsChanged = false;
    const nextPersons: NonNullable<TestSpec["persons"]> = {};
    for (const [pid, p] of Object.entries(t.persons)) {
      let pChanged = false;
      const nextP = { ...p };
      const facts = renameKeys(p.facts, from, to);
      if (facts.changed) { nextP.facts = facts.obj; pChanged = true; }
      const mdef = renameKeys(p.month_defaults, from, to);
      if (mdef.changed) { nextP.month_defaults = mdef.obj; pChanged = true; }
      const months = renameKeyedMap(p.months, from, to);
      if (months.changed) { nextP.months = months.map; pChanged = true; }
      nextPersons[pid] = pChanged ? nextP : p;
      if (pChanged) personsChanged = true;
    }
    if (personsChanged) { next.persons = nextPersons; changed = true; }
  }

  return { spec: changed ? next : t, changed };
}

function renameInTests(
  tests: TestSpec[] | undefined, from: string, to: string,
): { tests: TestSpec[] | undefined; changed: boolean } {
  if (!tests || !tests.length) return { tests, changed: false };
  let changed = false;
  const next = tests.map((t) => {
    const r = renameTestSpec(t, from, to);
    if (r.changed) changed = true;
    return r.spec;
  });
  return { tests: changed ? next : tests, changed };
}

/** Rewrites every reference to `from` into `to`: the item's own identifier,
 *  every other item's `derived` expression, and every test's input/expectation
 *  keys, in deep copies. Returns only the items that changed, the renamed item
 *  first. `derived_text` is dropped from any item whose derivation was
 *  rewritten; it is a cached authoring surface, regenerated on demand. */
export function renameIdentifier(ix: LedgerIndex, from: string, to: string): RenameResult {
  const errors: string[] = [];
  if (!NAME_RE.test(to)) errors.push(`"${to}" is not lower_snake_case`);
  if (RESERVED.has(to)) errors.push(`"${to}" is a reserved pattern operator`);
  const existing = ix.byIdentifier.get(to);
  if (existing) errors.push(`"${to}" is already the identifier of ${existing.id} (${existing.name})`);
  if (errors.length) return { changed: [], errors };

  const source = ix.byIdentifier.get(from);
  if (!source) return { changed: [], errors: [`No item has identifier "${from}"`] };

  const rewrite = (it: Item, isSelf: boolean): Item | null => {
    const derived = renameInDerived(ix, it, from, to);
    const tests = renameInTests(it.tests, from, to);
    if (!isSelf && !derived.changed && !tests.changed) return null;
    const next: Item = { ...it };
    if (isSelf) next.identifier = to;
    if (derived.changed) {
      next.derived = derived.expr;
      delete next.derived_text;
    }
    if (tests.changed) next.tests = tests.tests;
    return next;
  };

  const changed: Item[] = [rewrite(source, true)!];
  for (const it of ix.items) {
    if (it.identifier === from) continue;
    const next = rewrite(it, false);
    if (next) changed.push(next);
  }
  return { changed, errors: [] };
}

/** Rewrites every reference to `from` into `to` inside the raw text of
 *  `tests/cases.yaml`, without reparsing and re-serialising the file (which
 *  would lose its comments). Two shapes cover every place an identifier can
 *  appear as a key in that file: a YAML mapping key at any indent
 *  (`  from:`, `    from: {...}`) and an inline flow-map key
 *  (`{from: 1, other: 2}`). `cases` is accepted (parallel to
 *  `referencesInCases`) but not needed by the textual rewrite itself; callers
 *  use it to decide whether to call this at all. Correctness is checked in
 *  `test/engine/rename.test.ts` by parsing before and after and comparing
 *  against `renameCase` applied to the original parse, key by key. */
export function renameInCasesText(
  casesText: string, cases: readonly HouseholdCase[], from: string, to: string,
): string {
  void cases;
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mappingKey = new RegExp(`^(\\s*)${escaped}:`, "gm");
  const inlineKey = new RegExp(`\\b${escaped}:`, "g");
  return casesText
    .replace(mappingKey, (_m, indent: string) => `${indent}${to}:`)
    .replace(inlineKey, `${to}:`);
}

/** The same key walk `renameTestSpec` applies to a rule test's
 *  `parameters`/`month_facts`/`persons`, applied to a whole household case,
 *  plus each person's `expect` keys (a household case has no `given`, and its
 *  expectations are per person rather than a single flat object). This is the
 *  reference the textual `renameInCasesText` above is checked against, not
 *  something `renameInCasesText` itself calls. */
export function renameCase(c: HouseholdCase, from: string, to: string): HouseholdCase {
  const asSpec: TestSpec = { id: c.id, parameters: c.parameters, month_facts: c.month_facts, persons: c.persons };
  const { spec } = renameTestSpec(asSpec, from, to);
  const expect: Record<string, Record<string, unknown>> = {};
  for (const [pid, exp] of Object.entries(c.expect || {})) {
    expect[pid] = renameKeys(exp, from, to).obj as Record<string, unknown>;
  }
  return {
    ...c,
    parameters: spec.parameters,
    month_facts: spec.month_facts,
    persons: spec.persons ?? c.persons,
    expect,
  };
}

/** The ids of the household cases whose data references `from`: a fact key
 *  under a person, month, or defaults, a month-scoped fact, a parameter, or an
 *  expectation. Cases are a single data file today (`tests/cases.yaml`), so
 *  rewriting them in place is out of scope until each case is its own file
 *  entry; the caller surfaces these ids as a note to update by hand. */
export function referencesInCases(cases: readonly HouseholdCase[], from: string): string[] {
  const has = (obj: Record<string, unknown> | undefined): boolean => !!obj && from in obj;
  const out: string[] = [];
  for (const c of cases) {
    let hit = has(c.parameters) || Object.values(c.month_facts || {}).some(has);
    if (!hit) {
      for (const p of Object.values(c.persons || {})) {
        if (has(p.facts) || has(p.month_defaults) || Object.values(p.months || {}).some(has)) {
          hit = true;
          break;
        }
      }
    }
    if (!hit) hit = Object.values(c.expect || {}).some(has);
    if (hit) out.push(c.id);
  }
  return out;
}
