import type { Engine } from "../engine/engine";
import type {
  Effective, Expr, Item, ItemVersion, ProgramVocabulary, RelationshipRoleDecl, Scope,
} from "../engine/types";
import type { LoadedVolume } from "../ledger/load";

/** The machine-readable handoff: every item of a volume as the codex parses
 *  it, with its derivation tree, parameter versions and dependency edges, so
 *  an engine team (a code generator, a fact-graph compiler, a rulesheet
 *  generator) never has to parse the YAML or the Markdown handoff. Written by
 *  `npm run export` to `conformance/<volume>/ledger.json`, pinned to the same
 *  commit as the suite. */
export interface LedgerJson {
  format: "policy-codex-ledger/1";
  codex: { volume: string; sha: string; generated: string };
  volume: {
    title: string;
    default_as_of: string;
    types: string[];
    scopes: Scope[];
    programs: ProgramVocabulary[];
    relationship_roles: RelationshipRoleDecl[];
  };
  items: LedgerJsonItem[];
}

export interface LedgerJsonItem {
  id: string;
  name: string;
  identifier: string;
  kind: Item["kind"];
  type: string;
  options?: string[];
  scope: Scope;
  program: string;
  role?: string;
  chapter?: string;
  meaning?: string;
  precision?: string;
  assumption?: string;
  supplied_by?: string;
  /** Parameters without versions: the one value. */
  value?: unknown;
  /** Parameters with versions: `from` inclusive, `to` exclusive. */
  versions?: ItemVersion[];
  /** Derived items: the expression tree, exactly as the ledger stores it
   *  (docs/operators.md defines every operator). */
  derived?: Expr;
  /** The same derivation in pattern English, one line per line of the
   *  rendered block (one arm of a `case` per line). */
  derived_english?: string[];
  /** Binder operators (filter, sum, exists, exists_related, reachable)
   *  whose body reads both "this person" and "that person". */
  mixed_binding?: string[];
  /** The item's own effective range: `from` and `to` both inclusive. */
  effective?: Effective;
  uses: string[];
  used_by: string[];
  sources: string[];
  open?: string[];
  tags?: string[];
  implemented?: Item["implemented"];
  implemented_by?: string;
  accepts_from?: string[];
  /** The ids of the item's rule tests, which are cases in the suite. */
  tests: string[];
}

const BINDERS = new Set(["filter", "sum", "exists", "exists_related", "reachable"]);

/** The binder operators in `e` whose body reads this person and that person
 *  both. "This person" is read by a person fact named bare (or a
 *  relationship of this person); "that person" by `[P]`, or a fact read
 *  through `of [P]`. Nested binders are judged on their own. */
export function mixedBindings(engine: Engine, e: Expr): string[] {
  const out: string[] = [];
  const personScoped = (s: string) => {
    const it = engine.item(s);
    return !!it && it.kind !== "parameter" && (it.scope === "person" || it.scope === "person-month");
  };
  // Marks what `x` reads, from the point of view of a binder's body.
  const reads = (x: Expr, marks: { self: boolean; other: boolean }, as: "self" | "other"): void => {
    if (typeof x === "string") {
      if (personScoped(x)) marks[as] = true;
      return;
    }
    if (!Array.isArray(x) || !x.length) return;
    const op = x[0];
    if (op === "P") { marks.other = true; return; }
    if (op === "of") {
      reads(x[1], marks, as);
      const target = x[1];
      if (Array.isArray(target) && target[0] === "P") reads(x[2], marks, "other");
      return;
    }
    if (op === "rel" || op === "exists_related" || op === "has_relative_in" ||
      op === "shared_relative" || op === "reachable") marks[as] = true;
    if (BINDERS.has(op)) {
      // A nested binder's group is read here; its body is judged on its own.
      if (op !== "reachable" && op !== "exists_related") reads(x[1], marks, as);
      return;
    }
    for (const sub of x.slice(1)) reads(sub, marks, as);
  };
  const walk = (x: Expr): void => {
    if (!Array.isArray(x) || !x.length) return;
    const op = x[0];
    if (BINDERS.has(op)) {
      const body = x[2];
      if (body !== undefined && !(op === "reachable" && x.length < 3)) {
        const marks = { self: false, other: false };
        reads(body, marks, "self");
        if (marks.self && marks.other) out.push(op);
      }
    }
    for (const sub of x.slice(1)) walk(sub);
  };
  walk(e);
  return out;
}

export function buildLedgerJson(engine: Engine, vol: LoadedVolume, sha: string): LedgerJson {
  const meta = engine.meta;
  const items: LedgerJsonItem[] = engine.items().map((it) => {
    const row: LedgerJsonItem = {
      id: it.id, name: it.name, identifier: it.identifier, kind: it.kind, type: it.type,
      scope: it.scope, program: it.program,
      uses: engine.usesOfItem(it.identifier), used_by: engine.usedBy(it.identifier),
      sources: it.sources ?? [], tests: (it.tests ?? []).map((t) => t.id),
    };
    if (it.options) row.options = it.options;
    if (it.role) row.role = it.role;
    if (vol.chapterOf[it.id]) row.chapter = vol.chapterOf[it.id];
    for (const k of ["meaning", "precision", "assumption", "supplied_by", "implemented_by"] as const) {
      if (it[k]) row[k] = it[k];
    }
    if (it.kind === "parameter") {
      if (it.versions && it.versions.length) row.versions = it.versions;
      else if (it.value !== undefined) row.value = it.value;
    }
    if (it.derived !== undefined && it.derived !== null) {
      row.derived = it.derived;
      try { row.derived_english = engine.block(it.derived); } catch { /* left out */ }
      const mixed = mixedBindings(engine, it.derived);
      if (mixed.length) row.mixed_binding = mixed;
    }
    if (it.effective) row.effective = it.effective;
    if (it.open && it.open.length) row.open = it.open;
    if (it.tags && it.tags.length) row.tags = it.tags;
    if (it.implemented) row.implemented = it.implemented;
    if (it.accepts_from && it.accepts_from.length) row.accepts_from = it.accepts_from;
    return row;
  });
  return {
    format: "policy-codex-ledger/1",
    codex: { volume: vol.volumeId, sha, generated: new Date().toISOString() },
    volume: {
      title: meta.title,
      default_as_of: meta.default_as_of,
      types: meta.types,
      scopes: meta.scopes,
      programs: meta.programs ?? [],
      relationship_roles: engine.index.roles
        ? engine.index.roles.map((r) => ({ ...r }))
        : Object.entries(engine.index.inverseRole).map(([id, inverse]) => ({ id, inverse })),
    },
    items,
  };
}
