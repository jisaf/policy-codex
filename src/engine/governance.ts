import type { LedgerIndex } from "./ledger-index";
import { buildGraph } from "./graph";
import { compact } from "./render";
import type { Expr, Item, VolumeMeta } from "./types";

/** A governance rule that did not hold. Only failures are returned, so `ok`
 *  is always false; the field exists so a finding reads like a constraint. */
export interface Finding { ok: false; level: "error" | "warn"; rule: string; msg: string }

/** An existing item this one may duplicate. `identical-derivation` is an
 *  error, `same-shape` and `similar` are warnings. */
export interface Candidate {
  id: string;
  identifier: string;
  reason: "identical-derivation" | "same-shape" | "similar";
  score: number;
}

/** Every operator the parser and evaluator know, plus the determination-date
 *  constants, the month binding, and the person placeholder. An identifier
 *  that shadows one of these cannot be referenced from a derivation. */
export const RESERVED: ReadonlySet<string> = new Set([
  "P", "det_date", "det_month", "month",
  "all", "any", "not", "unknown", "otherwise", "case", "else",
  "<", "<=", ">", ">=", "=", "in",
  "+", "-", "*", "/", "min",
  "years_between", "first_day", "month_of", "month_before", "month_after",
  "months_ending", "months_from_to",
  "at", "each", "some_month", "count_months", "avg",
  "exists", "exists_related", "rel", "in_group", "of", "lookup",
]);

const NAME_RE = /^[a-z][a-z0-9_]*$/;

const STOPWORDS: ReadonlySet<string> = new Set([
  "is", "has", "of", "in", "for", "the", "a", "an", "to", "and", "or", "per", "at", "by",
]);

/** Stands in for every literal and every parameter reference in a shape. */
const MASK = "#";

const REASON_RANK: Record<Candidate["reason"], number> = {
  "identical-derivation": 0, "same-shape": 1, "similar": 2,
};

function identifierTokens(identifier: string): Set<string> {
  return new Set(
    (identifier || "").split("_").filter((t) => t && !STOPWORDS.has(t)),
  );
}

function meaningTokens(meaning: string | undefined): Set<string> {
  return new Set(
    (meaning || "").toLowerCase().split(/[^a-z]+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t)),
  );
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}

/** One arm of a `case`: a condition and the value it yields. */
type ExprArm = [Expr, Expr];

/** The derivation with every literal and every parameter reference replaced by
 *  a placeholder, so two rules that differ only in their constants compare
 *  equal. Operators, structure, and non-parameter references survive. */
function mask(ix: LedgerIndex, e: Expr): Expr {
  if (e === null || e === undefined) return null;
  if (typeof e === "boolean" || typeof e === "number") return MASK;
  if (typeof e === "string") {
    const it = ix.byIdentifier.get(e);
    if (!it) return MASK;
    return it.kind === "parameter" ? MASK : e;
  }
  if (!Array.isArray(e) || !e.length || typeof e[0] !== "string") return e;
  const op = e[0] as string;
  const m = (x: Expr) => mask(ix, x);
  if (op === "in") return ["in", m(e[1]), (e[2] as unknown[] || []).map(() => MASK)];
  if (op === "rel" || op === "exists_related") {
    return [op, (e[1] as unknown[] || []).map(() => MASK), m(e[2])];
  }
  if (op === "case") {
    return ["case", ...e.slice(1).map((arm: Expr) =>
      Array.isArray(arm) && arm[0] === "else"
        ? ["else", m(arm[1])]
        : [m((arm as ExprArm)[0]), m((arm as ExprArm)[1])])];
  }
  return [op, ...e.slice(1).map(m)];
}

interface DerivationKeys { exact: string | null; shape: string | null }

function derivationKeys(ix: LedgerIndex, it: Item): DerivationKeys {
  if (it.kind !== "derived" || it.derived === undefined || it.derived === null) {
    return { exact: null, shape: null };
  }
  try {
    return { exact: compact(ix, it.derived), shape: compact(ix, mask(ix, it.derived)) };
  } catch {
    return { exact: null, shape: null };
  }
}

/** The third duplicate layer: same type, scope, and program, sources that
 *  overlap (or are absent on one side), and overlapping identifier tokens or
 *  meaning terms. Returns the winning Jaccard, or null when not close. */
function similarity(
  a: Item, aTokens: ReadonlySet<string>, aTerms: ReadonlySet<string>, b: Item,
): number | null {
  if (a.type !== b.type || a.scope !== b.scope || a.program !== b.program) return null;
  const aSources = a.sources || [];
  const bSources = b.sources || [];
  if (aSources.length && bSources.length && !aSources.some((s) => bSources.includes(s))) {
    return null;
  }
  const byName = jaccard(aTokens, identifierTokens(b.identifier));
  const byMeaning = jaccard(aTerms, meaningTokens(b.meaning));
  if (byName >= 0.5 || byMeaning >= 0.35) return Math.max(byName, byMeaning);
  return null;
}

/** Every candidate, strongest reason per item, sorted. `nearest` caps this. */
function candidates(ix: LedgerIndex, it: Item): Candidate[] {
  const mine = derivationKeys(ix, it);
  const tokens = identifierTokens(it.identifier);
  const terms = meaningTokens(it.meaning);
  const out: Candidate[] = [];
  for (const other of ix.items) {
    if (other.id === it.id) continue;
    const theirs = derivationKeys(ix, other);
    if (mine.exact && theirs.exact && mine.exact === theirs.exact) {
      out.push({
        id: other.id, identifier: other.identifier,
        reason: "identical-derivation", score: 1,
      });
      continue;
    }
    if (mine.shape && theirs.shape && mine.shape === theirs.shape) {
      out.push({
        id: other.id, identifier: other.identifier, reason: "same-shape", score: 0.9,
      });
      continue;
    }
    const score = similarity(it, tokens, terms, other);
    if (score !== null) {
      out.push({ id: other.id, identifier: other.identifier, reason: "similar", score });
    }
  }
  out.sort((a, b) =>
    REASON_RANK[a.reason] - REASON_RANK[b.reason] ||
    b.score - a.score ||
    a.id.localeCompare(b.id));
  return out;
}

/** The nearest existing items, strongest reason first, at most five. The
 *  volume metadata completes the signature `governance()` uses; the three
 *  duplicate layers compare items against items only. */
export function nearest(ix: LedgerIndex, it: Item, _meta: VolumeMeta): Candidate[] {
  return candidates(ix, it).slice(0, 5);
}

/** The phase-2 governance rules. These run beside `constraints()` and never
 *  repeat what it already checks. */
export function governance(
  ix: LedgerIndex, meta: VolumeMeta, it: Item, opts: { isNew?: boolean } = {},
): Finding[] {
  const F: Finding[] = [];
  const err = (rule: string, msg: string) => F.push({ ok: false, level: "error", rule, msg });
  const warn = (rule: string, msg: string) => F.push({ ok: false, level: "warn", rule, msg });
  const identifier = it.identifier || "";

  // 1. Closed vocabularies. A volume written before phase 2 declares no
  //    programs, and then declares no tags either, so both checks stand down.
  if (meta.programs) {
    if (!meta.programs.some((p) => p.id === it.program)) {
      err("vocab.program", `Program "${it.program}" is not declared in volume.yaml`);
    }
    const declared = meta.tags || [];
    for (const t of it.tags || []) {
      if (!declared.includes(t)) err("vocab.tag", `Tag "${t}" is not declared in volume.yaml`);
    }
  }
  if (!meta.types.includes(it.type)) {
    err("vocab.type", `Type "${it.type}" is not declared in volume.yaml`);
  }
  if (!(meta.scopes as readonly string[]).includes(it.scope)) {
    err("vocab.scope", `Scope "${it.scope}" is not declared in volume.yaml`);
  }

  // 2. Naming grammar.
  if (!NAME_RE.test(identifier)) {
    err("name.grammar", `Identifier "${identifier}" is not lower_snake_case`);
  }
  if (RESERVED.has(identifier)) {
    err("name.reserved", `Identifier "${identifier}" is a reserved pattern operator`);
  }
  const digitToken = identifier.split("_").find((t) => /^\d+$/.test(t));
  if (digitToken) {
    err(
      "name.digits",
      `Identifier "${identifier}" encodes the value ${digitToken}; ` +
        "name the rule and make the number a parameter",
    );
  }
  if (meta.programs) {
    const own = meta.programs.find((p) => p.id === it.program);
    if (own && own.prefix) {
      // Supplied facts are the interface to data systems and stay program-
      // neutral, so a bespoke "is_pregnant_for_medicaid" never gets a name
      // that looks sanctioned. Derived rules are program-owned and must carry
      // the prefix; parameters usually do, so a missing one is only a warning.
      if (!identifier.startsWith(own.prefix) && it.kind !== "supplied") {
        (it.kind === "derived" ? err : warn)(
          "name.prefix",
          `${own.id} ${it.kind === "derived" ? "rules" : "parameters"} start with ` +
            `"${own.prefix}"; "${identifier}" does not`,
        );
      }
    } else if (own) {
      const other = meta.programs.find((p) => p.prefix && identifier.startsWith(p.prefix));
      if (other) {
        err(
          "name.prefix",
          `${own.id} items carry no program prefix; "${identifier}" starts with ` +
            `"${other.prefix}", which ${other.id} owns`,
        );
      }
    }
  }

  // 3. Supplied facts declare where the value comes from.
  if (it.kind === "supplied" && !(it.supplied_by || "").trim()) {
    err("supplied.source", "Supplied facts name the system or form the value comes from");
  }

  // 4. A derivation that is a bare reference is an alias, not a rule.
  if (it.kind === "derived" && typeof it.derived === "string" && ix.byIdentifier.has(it.derived)) {
    const target = ix.byIdentifier.get(it.derived)!;
    err(
      "derived.alias",
      `Derivation is a bare reference to ${target.name} (${it.derived}); ` +
        "an alias is not a rule, so use that fact directly",
    );
  }

  // 5. Duplicates, three layers.
  const near = candidates(ix, it);
  for (const c of near) {
    if (c.reason === "identical-derivation") {
      err("dup.compact", `Identical derivation to ${c.identifier} (${c.id})`);
    } else if (c.reason === "same-shape") {
      warn("dup.shape", `parameterise: same rule as ${c.identifier} (${c.id}) with different constants`);
    } else {
      warn(
        "dup.similar",
        `Close to ${c.identifier} (${c.id}): same type, scope, and program, ` +
          `overlapping terms (${c.score.toFixed(2)})`,
      );
    }
  }

  // 6. New items carry a rationale and acknowledge their strongest candidates.
  if (opts.isNew) {
    if (!(it.rationale || "").trim()) {
      err(
        "rationale.required",
        "A new item carries a rationale naming why the nearest existing items do not serve",
      );
    }
    const listed = new Set(it.nearest || []);
    const unacknowledged = near
      .filter((c) => c.reason === "identical-derivation" || c.reason === "same-shape")
      .filter((c) => !listed.has(c.id));
    if (unacknowledged.length) {
      err(
        "rationale.required",
        `acknowledge nearest: ${unacknowledged.map((c) => `${c.identifier} (${c.id})`).join(", ")}`,
      );
    }
  }

  // 7. Bespoke inputs stay visible: a supplied fact with a single consumer.
  if (it.kind === "supplied") {
    const consumers = buildGraph(ix).usedBy.get(identifier) ?? [];
    if (consumers.length === 1) {
      const c = ix.byIdentifier.get(consumers[0]);
      warn(
        "supplied.single-consumer",
        `Only ${c ? c.name : consumers[0]} (${consumers[0]}) consumes this supplied fact`,
      );
    }
  }

  return F;
}
