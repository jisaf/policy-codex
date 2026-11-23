export type Kind = "supplied" | "derived" | "parameter";
export type Scope = "person" | "person-month" | "case" | "month" | "global";
export type Program = string;
export type BaseType =
  | "yes/no" | "number" | "date" | "month" | "text" | "enum"
  | "person" | "group" | "relationships" | "table" | "months" | "records" | "unknown";

/** An expression node. Payloads are arbitrary nested JSON, exactly as the
 *  ledger stores them, so the element type stays `any` on purpose. */
export interface ExprNode extends ReadonlyArray<any> {}
export type Expr = boolean | number | string | null | ExprNode;
export type Value = unknown;

/** One dated value of a parameter. `from` is the first day the value is in
 *  force and `to` the first day it is not, so consecutive versions share a
 *  date; a version may cite the excerpt (an S-id) that states its own value. */
export interface ItemVersion { from: string; to?: string; value: unknown; source?: string }
/** An item's own effective range: `from` the first day it is in force, `to`
 *  the last, or `present` while it has no end. */
export interface Effective { from: string; to: string }

/** One signature on an item: the role from the volume's approval policy,
 *  the person or team that signed, the date, the commit signed, and the
 *  fingerprint of what was signed (src/engine/fingerprint.ts): a hash of the
 *  item's approvable fields, the excerpts it cites and everything it reads.
 *  Governance reports the signature as stale once the item's fingerprint no
 *  longer matches (docs/governance.md "Stale approvals"). */
export interface ApprovalRecord {
  role: string; by?: string; date: string; commit?: string; fingerprint?: string;
}

export interface TestSpec {
  id: string;
  as_of?: string;
  month?: string;
  given?: Record<string, unknown>;
  others?: Record<string, Record<string, unknown>>;
  persons?: Record<string, {
    facts?: Record<string, unknown>;
    months?: Record<string, Record<string, unknown>>;
    relationships?: Array<[string, string]>;
    month_defaults?: Record<string, unknown>;
  }>;
  /** The person named first states `[role, other]` pairs of its own, as every
   *  person may; a `[role, from, to]` triple is a case-level edge that
   *  `makeCase` expands into both persons' lists. */
  relationships?: Array<[string, string] | [string, string, string]>;
  parameters?: Record<string, unknown>;
  month_defaults?: Record<string, unknown>;
  month_facts?: Record<string, Record<string, unknown>>;
  /** Case-scope supplied facts, one value for the case as a whole. */
  case_facts?: Record<string, unknown>;
  expect?: unknown;
  expect_length?: number;
  expect_first?: string;
  expect_last?: string;
}

export interface Item {
  id: string;
  name: string;
  identifier: string;
  kind: Kind;
  type: string;
  options?: string[];
  scope: Scope;
  program: Program;
  role?: string | null;
  meaning?: string;
  precision?: string;
  assumption?: string;
  /** One county-facing sentence, on an item where a statute governs over a
   *  Colorado rule the item would otherwise follow: the rule paragraph it
   *  supersedes, the statute, and the date the statute took effect. The
   *  plain-English trace repeats it (explain.ts `narrative`). */
  statute_override?: string;
  supplied_by?: string;
  value?: unknown;
  versions?: ItemVersion[];
  derived?: Expr;
  derived_text?: string;
  sources?: string[];
  effective?: Effective;
  /** Where the item stands in approval (docs/conventions.md "Status"):
   *  Draft until the roles `approvals()` names have signed. Absent reads as
   *  Draft. */
  status?: "Draft" | "Reviewed" | "Approved";
  /** The approval record (docs/conventions.md "Approval"): who signed, in
   *  which role, on what date, at which commit. */
  approval?: ApprovalRecord[];
  /** Parameters indexed on a schedule: the date by which the next version is
   *  due. Governance warns once it has passed. */
  review_by?: string;
  implemented?: "assembly" | "engine" | null;
  /** Free-form locator into the implementing system, e.g.
   *  `rules/medicaid/ce.drl#status` or a function path. No governance rule
   *  requires it yet; it exists for the conformance suite to carry through. */
  implemented_by?: string;
  tags?: string[];
  open?: string[];
  /** Why this item exists and why the nearest existing items do not serve. */
  rationale?: string;
  /** Ids of the nearest existing items, acknowledged when the item was added. */
  nearest?: string[];
  /** On a shared (program All) derived item: which of the cross-program link
   *  classes it is (docs/conventions.md "Cross-program links"). */
  link_class?: SharedLinkClass;
  /** One line: for a primitive, why no program defines it differently; for
   *  an adopted method, the method and who adopts it; for a program
   *  calculation, whose calculation it is. */
  link_basis?: string;
  /** On an adopted-method shared item: each program that adopts the method
   *  by reference, with the excerpt of that program's rule that does so. */
  adopted_by?: AdoptedBy[];
  /** Other programs' facts this derived item reads on purpose, each with its
   *  link class and the excerpt of the rule that requires the link
   *  (governance refuses any other cross-program read). A bare identifier is
   *  the pre-2026-11-23 form and is refused until classified. */
  accepts_from?: Array<AcceptsFrom | string>;
  /** Deliberate per-program copies of the same logic (docs/governance.md
   *  "Change impact"), each with a one-line reason. Symmetric: each sibling
   *  lists this item back. A change to one flags the others. */
  siblings?: Sibling[];
  tests?: TestSpec[];
  /** On a supplied fact whose type is a list of records (`list of receipts`):
   *  the record schema, declared once. Each field states its type, its
   *  meaning, and exactly one of `required: true` (a rule that reads the
   *  field cannot determine when a record does not state it), a `default`
   *  the rule text gives, or `when_absent` (what leaving it out means, for a
   *  field an operator gives that meaning to: a receipt with no month recurs
   *  in every month). A "one of" field lists its options. docs/operators.md,
   *  "Receipt records". */
  record_fields?: Record<string, RecordFieldSpec>;
  /** On a list of records: what one record is called where a rule reads the
   *  list ("for each holding in", "that holding's value"); a list without
   *  one names its records receipts. Parse and render only: the operators
   *  read every list alike (docs/operators.md "Receipt records"; resource
   *  records, step H0: `holdings`, CO-5300, record_noun holding). */
  record_noun?: string;
}

/** One field of a record schema (Item.record_fields). */
export interface RecordFieldSpec {
  type: string;
  meaning?: string;
  required?: boolean;
  default?: unknown;
  when_absent?: string;
  /** With a `default`: the default is the value of a record that states no
   *  date only; on a record that states a date the field is required, and a
   *  rule that reads it there cannot determine (an earnings record's
   *  frequency: a stream's amount is the month's, a dated pay's schedule is
   *  not known unless stated; decision 4 of 2026-11-23, coverage pass 4
   *  L4-2). docs/operators.md, "Receipt records". */
  required_if_dated?: boolean;
  options?: string[];
  /** On a "one of" field whose options a reader must tell apart (a
   *  receipt's kind): one line per option saying what it is. Each kind names
   *  one source (docs/conventions.md, "Receipt records"). */
  option_meanings?: Record<string, string>;
}

/** The class of a shared (program All) derived item. */
export type SharedLinkClass = "primitive" | "adopted_method" | "program_calculation";
/** The class of a declared read of another program's item. */
export type ReadLinkClass = "primitive" | "adopted_method" | "rule_required";
export const SHARED_LINK_CLASSES: readonly SharedLinkClass[] = ["primitive", "adopted_method", "program_calculation"];
export const READ_LINK_CLASSES: readonly ReadLinkClass[] = ["primitive", "adopted_method", "rule_required"];

/** One declared cross-program read: the identifier read, its link class, and
 *  the excerpt of the reader's rule that requires or adopts it. */
export interface AcceptsFrom { from: string; class: ReadLinkClass; source: string }
export interface AdoptedBy { program: string; source: string }
export interface Sibling { id: string; reason: string }

export interface ApprovalPolicy {
  roles: string[];
  by_program: Record<string, string[]>;
  by_kind: Record<string, string[]>;
  by_tag: Record<string, string[]>;
  /** When true, an item that any program's declared outcome reads, directly
   *  or through other items, also requires that program's by_program roles,
   *  so a change upstream of an outcome reaches that outcome's owner. */
  upstream_of_outcomes?: boolean;
}

export interface ProgramVocabulary {
  id: string;
  /** Identifiers owned by this program start with it; null for shared items. */
  prefix: string | null;
  /** The items this program's administrators are accountable for. */
  outcomes?: string[];
  /** The words an item's meaning uses to name this program ("Colorado Works",
   *  "TANF"); read by the read.shared_definition governance rule. The id is
   *  always one of them. */
  names?: string[];
}

/** A tag in a declared hierarchy: an id, the parent tag's id (absent for a
 *  top-level tag), and an optional display label (falls back to the id). */
export interface TagDecl { id: string; parent?: string; label?: string }

/** One relationship role a volume declares. A `[role, other]` pair on p
 *  reads "p is the <role> of other". `inverse` is the role the other person
 *  then holds toward p (a symmetric role names itself); a role with no
 *  inverse is recorded on the person named first alone. */
export interface RelationshipRoleDecl { id: string; inverse?: string; label?: string }

export interface VolumeMeta {
  volume: string;
  title: string;
  version: string;
  status: string;
  default_as_of: string;
  approval_policy: ApprovalPolicy;
  types: string[];
  scopes: Scope[];
  /** Declared programs. Absent on volumes written before phase 2. */
  programs?: ProgramVocabulary[];
  /** The volume classifies its cross-program links (docs/conventions.md
   *  "Cross-program links"): every shared rule declares its class and every
   *  read of another program's item is a declared, cited link, both enforced
   *  as errors. Absent, an undeclared read is only warned on (the pre-
   *  2026-11-23 rule), as in the pinned work-requirements volume. */
  link_classes?: boolean;
  /** Declared tag vocabulary: a flat list of ids (as every volume before the
   *  Colorado build wrote it) or a hierarchy of {id, parent?, label?}.
   *  Absent on volumes written before phase 2. */
  tags?: Array<string | TagDecl>;
  /** The closed list of relationship roles, with their inverses. Absent on
   *  volumes written before the engineering review round; the engine then
   *  falls back to the built-in table (DEFAULT_INVERSE_ROLE, ledger-index.ts). */
  relationship_roles?: RelationshipRoleDecl[];
  /** The codex steward a reader without a GitHub token sends a downloaded
   *  change to (codex.json's volume entry may name one instead). */
  steward?: { name: string; contact?: string };
}

/** Ids the constraint checker validates citations against. When omitted the
 *  existence checks are skipped, so an engine can be built before the
 *  markdown files load. */
export interface EngineRefs {
  sourceIds: readonly string[];
  questionIds: readonly string[];
  /** Excerpts marked `Verification: unverified` in sources.md. Governance
   *  warns on every item citing one. */
  unverifiedSourceIds?: readonly string[];
  /** Excerpt id -> quoted text from sources.md, for approval fingerprints.
   *  When omitted, governance does not check approvals for staleness and
   *  `engine.fingerprint` returns null. */
  sourceTexts?: Readonly<Record<string, string>>;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-\d{2}$/;
export const BLOCK_OPS: ReadonlySet<string> = new Set([
  "all", "any", "case", "exists", "exists_related", "each", "some_month", "filter", "sum",
  "sum_months", "reachable", "sum_receipts", "largest",
]);
export const MONTH_BINDING: ReadonlySet<string> = new Set([
  "each", "some_month", "count_months", "avg",
]);
export const RELS: readonly string[] = [
  "parent", "child", "guardian", "caretaker relative", "spouse", "relative",
  "grandparent", "grandchild", "caretaker", "dependent", "tax_filer", "tax_dependent",
  "buys_prepares_with", "shares_heat_with",
];
export const ARITH: ReadonlySet<string> = new Set(["+", "-", "*", "/"]);
export const CMP: ReadonlySet<string> = new Set(["<", "<=", ">", ">=", "="]);
export const PAREN_OPS: ReadonlySet<string> = new Set([
  "+", "-", "*", "/", "otherwise", "min", "max", "ceil", "round", "years_between", "days_between", "count_months", "avg",
  "count", "sum", "sum_months", "sum_receipts", "largest", "band", "lookup_extended", "latest_month_of_year", "as_of",
]);

export const BASE: Record<string, BaseType> = {
  "yes/no": "yes/no", "whole number": "number", "money": "number", "hours": "number",
  "rate": "number", "calendar date": "date", "month": "month", "text": "text",
  "one of": "enum", "person": "person", "group of persons": "group",
  "relationships": "relationships", "table keyed by person": "table",
  "table keyed by household size": "table",
  "table keyed by income band": "table",
  "table keyed by year": "table",
  "table keyed by number of days": "table",
  "table keyed by option": "table",
  "list of months": "months",
  // A list of records (receipts): read only by "for each receipt in" (P55).
  "list of receipts": "records",
};
