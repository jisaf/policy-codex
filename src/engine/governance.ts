import type { LedgerIndex } from "./ledger-index";
import { buildGraph, type DependencyGraph } from "./graph";
import { usesOf } from "./check";
import { compact } from "./render";
import { tagIds } from "./tags";
import { approvalsFor } from "./constraints";
import { staleApprovalMessage, type FingerprintBasis } from "./fingerprint";
import { linkFindings } from "./links";
import type { EngineRefs, Expr, Item, VolumeMeta } from "./types";

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
  "years_between", "first_day", "month_of", "month_of_year", "year_of", "month_before", "month_after",
  "months_ending", "months_from_to", "months_after", "months_before", "days_after", "days_between",
  "at", "each", "some_month", "count_months", "avg", "sum_months", "that_month",
  "sum_receipts", "largest", "receipt", "received_in", "owner", "greatest",
  "exists", "exists_related", "rel", "in_group", "of", "lookup", "band", "lookup_extended",
  "latest_month_of_year", "as_of",
  "max", "ceil", "round", "persons", "count", "filter", "sum", "reachable", "shared_relative", "has_relative_in",
]);

export const NAME_RE = /^[a-z][a-z0-9_]*$/;

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
  if (op === "shared_relative") return e.length > 2 ? [op, MASK, e[2]] : [op, MASK];
  if (op === "has_relative_in") return [op, (e[1] as unknown[] || []).map(() => MASK), m(e[2])];
  if (op === "reachable") {
    const out: unknown[] = [op, (e[1] as unknown[] || []).map(() => MASK)];
    if (e.length > 2) out.push(m(e[2]));
    return out as Expr;
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
  bTokens: ReadonlySet<string>, bTerms: ReadonlySet<string>,
): number | null {
  if (a.type !== b.type || a.scope !== b.scope || a.program !== b.program) return null;
  const aSources = a.sources || [];
  const bSources = b.sources || [];
  if (aSources.length && bSources.length && !aSources.some((s) => bSources.includes(s))) {
    return null;
  }
  const byName = jaccard(aTokens, bTokens);
  const byMeaning = jaccard(aTerms, bTerms);
  if (byName >= 0.5 || byMeaning >= 0.35) return Math.max(byName, byMeaning);
  return null;
}

/** What the duplicate scan compares, per item: its derivation keys and its
 *  identifier and meaning terms. The scan compares every item with every
 *  other, so these are computed once per item and index rather than once per
 *  pair (the masked key depends on the index: which names are parameters).
 *  An entry is reused only while the item's derivation, identifier and
 *  meaning are the ones it was computed from. */
interface ComparisonKeys {
  derived: Expr | undefined; identifier: string; meaning: string | undefined;
  keys: DerivationKeys; tokens: Set<string>; terms: Set<string>;
}

const comparisonCache = new WeakMap<LedgerIndex, WeakMap<Item, ComparisonKeys>>();

function comparisonKeys(ix: LedgerIndex, it: Item): ComparisonKeys {
  let byItem = comparisonCache.get(ix);
  if (!byItem) { byItem = new WeakMap(); comparisonCache.set(ix, byItem); }
  const hit = byItem.get(it);
  if (hit && hit.derived === it.derived && hit.identifier === it.identifier && hit.meaning === it.meaning) return hit;
  const entry: ComparisonKeys = {
    derived: it.derived, identifier: it.identifier, meaning: it.meaning,
    keys: derivationKeys(ix, it), tokens: identifierTokens(it.identifier), terms: meaningTokens(it.meaning),
  };
  byItem.set(it, entry);
  return entry;
}

const graphCache = new WeakMap<LedgerIndex, { items: number; graph: DependencyGraph }>();

/** The index's dependency graph, built once per index (as the approval
 *  policy's upstream sets are, src/engine/constraints.ts) rather than once
 *  per supplied fact governed. Rebuilt if items were added to the index. */
function graphOf(ix: LedgerIndex): DependencyGraph {
  const hit = graphCache.get(ix);
  if (hit && hit.items === ix.items.length) return hit.graph;
  const graph = buildGraph(ix);
  graphCache.set(ix, { items: ix.items.length, graph });
  return graph;
}

/** Every candidate, strongest reason per item, sorted. `nearest` caps this. */
function candidates(ix: LedgerIndex, it: Item): Candidate[] {
  const { keys: mine, tokens, terms } = comparisonKeys(ix, it);
  const out: Candidate[] = [];
  for (const other of ix.items) {
    if (other.id === it.id) continue;
    const { keys: theirs, tokens: otherTokens, terms: otherTerms } = comparisonKeys(ix, other);
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
    const score = similarity(it, tokens, terms, other, otherTokens, otherTerms);
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
  ix: LedgerIndex, meta: VolumeMeta, it: Item,
  opts: {
    isNew?: boolean; refs?: EngineRefs | null; today?: string;
    /** The ledger at the base ref, so a stale approval names what changed. */
    baseline?: FingerprintBasis | null;
  } = {},
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
    const declared = tagIds(meta);
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

  // 2. Naming grammar. An id names one item for good; a second item with the
  //    same id makes every citation of it ambiguous.
  //    An edit or rename of an existing item is checked under that item's id
  //    while the old version is still in the index, so one other holder is
  //    expected then; a new item and an item already in the ledger expect none.
  const sameId = ix.items.filter((o) => o.id === it.id && o !== it);
  const expected = ix.items.includes(it) || opts.isNew ? 0 : 1;
  if (sameId.length > expected) {
    err("id.duplicate", `Id ${it.id} is also used by ${sameId.map((o) => o.identifier).join(", ")}`);
  }
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

  // 2b. A supplied fact whose program is one program's states that program's
  //     meaning, so it carries the program's prefix (docs/conventions.md
  //     rule 13: a finding made outside this volume, recorded as an event,
  //     keeps the finding program's prefix; anything else is made neutral).
  //     A warning: the remedy is a rename or a neutral rewrite.
  if (meta.programs && it.kind === "supplied") {
    const own = meta.programs.find((p) => p.id === it.program);
    if (own && own.prefix && !identifier.startsWith(own.prefix)) {
      warn(
        "name.prefix",
        `${own.id} supplied facts carry "${own.prefix}" (a finding recorded as an event) ` +
          `or are made program-neutral; "${identifier}" does neither`,
      );
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

  // 7. A dated parameter states one continuous history: consecutive versions
  //    meet exactly, the earlier one's `to` being the later one's `from`.
  const versions = (it.versions ?? []).slice()
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  for (let i = 1; i < versions.length; i++) {
    const prev = versions[i - 1];
    const next = versions[i];
    if (prev.to === undefined) {
      warn(
        "versions.overlap",
        `The version from ${prev.from} never ends, so it overlaps the version ` +
          `from ${next.from}; give it a "to"`,
      );
    } else if (prev.to > next.from) {
      warn(
        "versions.overlap",
        `The version from ${prev.from} runs to ${prev.to}, past the start of ` +
          `the version from ${next.from}`,
      );
    } else if (prev.to < next.from) {
      warn(
        "versions.gap",
        `No version is in force between ${prev.to} and ${next.from}`,
      );
    }
  }

  // 8a. Cross-program links (src/engine/links.ts; docs/conventions.md
  //     "Cross-program links"): a shared rule declares its class, and a rule
  //     reads another program's item only through a declared, cited link.
  F.push(...linkFindings(ix, meta, it, opts.refs));

  // 8a'. Siblings (docs/governance.md "Change impact"): a deliberate
  //      per-program copy names its siblings, each with a reason, and each
  //      sibling names it back, so a change to one flags the others.
  for (const s of it.siblings ?? []) {
    const other = ix.byId.get(s.id);
    if (!other) {
      err("siblings.symmetric", `siblings names ${s.id}, which is not in the ledger`);
      continue;
    }
    if (other.id === it.id) {
      err("siblings.symmetric", "an item is not its own sibling");
      continue;
    }
    if (!(s.reason || "").trim()) {
      err("siblings.symmetric", `siblings ${s.id}: give a one-line reason`);
    }
    if (!(other.siblings ?? []).some((o) => o.id === it.id)) {
      err("siblings.symmetric", `siblings names ${s.id} ${other.identifier}, which does not name ${it.id} back`);
    }
  }

  // 8b. An unprefixed derived item has one meaning (docs/conventions.md rule
  //     15). One whose meaning names programs (a definition several programs
  //     adopt) is read only by those programs; a reader of another program
  //     reads its own prefixed item. A meaning that names no program is a
  //     neutral combination of neutral facts and is not checked.
  if (it.kind === "derived" && it.derived !== undefined && it.derived !== null && meta.programs &&
      it.program !== "All") {
    const namesOf = (p: { id: string; names?: string[] }) => [p.id, ...(p.names ?? [])];
    const mentions = (text: string, p: { id: string; names?: string[] }) =>
      namesOf(p).some((n) => new RegExp(`(^|[^A-Za-z])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`).test(text));
    const reader = meta.programs.find((p) => p.id === it.program);
    let refs: string[] = [];
    try { refs = usesOf(ix, it.derived); } catch { refs = []; }
    for (const r of [...new Set(refs)].sort()) {
      const dep = ix.byIdentifier.get(r);
      if (!dep || dep.kind !== "derived" || dep.program !== "All" || !reader) continue;
      const text = dep.meaning || "";
      const named = meta.programs.filter((p) => p.id !== "All" && mentions(text, p));
      if (named.length && !mentions(text, reader)) {
        warn(
          "read.shared_definition",
          `${it.program} rule reads ${r} (${dep.id}), a shared definition whose meaning names ` +
            `${named.map((p) => p.id).join(", ")} but not ${it.program}; read ${it.program}'s own item, ` +
            "or name the program in the shared meaning if its definition is the same",
        );
      }
    }
  }

  // 8. Bespoke inputs stay visible: a supplied fact with a single consumer.
  if (it.kind === "supplied") {
    const consumers = graphOf(ix).usedBy.get(identifier) ?? [];
    if (consumers.length === 1) {
      const c = ix.byIdentifier.get(consumers[0]);
      warn(
        "supplied.single-consumer",
        `Only ${c ? c.name : consumers[0]} (${consumers[0]}) consumes this supplied fact`,
      );
    }
  }

  // 9. Provenance: an excerpt that could not be fetched is marked
  //    `Verification: unverified` in sources.md (docs/design-colorado.md,
  //    "Sources and provenance"). Every item citing one is warned on until
  //    the excerpt is replaced by a quotation, and such an item cannot be
  //    Reviewed or Approved.
  const unverified = new Set(opts.refs?.unverifiedSourceIds ?? []);
  const cited = [
    ...(it.sources ?? []),
    ...(it.versions ?? []).map((v) => v.source).filter((s): s is string => !!s),
  ];
  const unverifiedCited = [...new Set(cited.filter((s) => unverified.has(s)))].sort();
  for (const s of unverifiedCited) {
    warn(
      "source.unverified",
      `Cites ${s}, an excerpt marked "Verification: unverified"; replace it with a ` +
        "quotation of the fetched text before this item moves past Draft",
    );
  }
  if (it.status && it.status !== "Draft" && unverified.size) {
    // The item and everything it reads, directly or through other items.
    const uses = graphOf(ix).uses;
    const seen = new Set<string>();
    const stack = [identifier];
    const tainted = new Set<string>();
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const dep = ix.byIdentifier.get(id);
      if (dep) {
        const srcs = [...(dep.sources ?? []), ...(dep.versions ?? []).map((v) => v.source ?? "")];
        for (const s of srcs) if (unverified.has(s)) tainted.add(s);
      }
      for (const d of uses.get(id) ?? []) stack.push(d);
    }
    if (tainted.size) {
      err(
        "status.unverified",
        `Status is ${it.status}, but the item rests on unverified ${[...tainted].sort().join(", ")}`,
      );
    }
  }

  // 10. Status and the approval record (docs/conventions.md, "Status",
  //     "Approval"): an Approved item carries a signature for every role the
  //     approval policy requires of it.
  if (it.status && !["Draft", "Reviewed", "Approved"].includes(it.status)) {
    err("status.value", `Status "${it.status}" is not Draft, Reviewed or Approved`);
  }
  for (const a of it.approval ?? []) {
    if (!meta.approval_policy?.roles?.includes(a.role)) {
      err("approval.role", `Approval names role "${a.role}", which volume.yaml does not declare`);
    }
  }
  if (it.status === "Approved") {
    const signed = new Set((it.approval ?? []).map((a) => a.role));
    const missing = approvalsFor(ix, meta, it).filter((r) => !signed.has(r));
    if (missing.length) {
      err("approval.missing", `Approved without a signature from ${missing.join(", ")}`);
    }
  }

  // 10b. A signature covers what was signed (docs/governance.md "Stale
  //      approvals"): a Reviewed or Approved item whose fingerprint no longer
  //      matches a signature's, or whose signature records none, goes back
  //      for review. Needs the excerpt texts; without them it stands down.
  if (opts.refs?.sourceTexts) {
    const msg = staleApprovalMessage(
      { ix, sourceTexts: opts.refs.sourceTexts }, it,
      { baseline: opts.baseline },
    );
    if (msg) err("approval.stale", msg);
  }

  // 11. An indexed parameter names the date its next version is due; once
  //     that date has passed the figure may be stale.
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  if (it.review_by && it.review_by <= today) {
    warn(
      "versions.review_due",
      `The next version was due by ${it.review_by}; load the published figure and move review_by`,
    );
  }

  return F;
}
