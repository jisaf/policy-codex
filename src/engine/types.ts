export type Kind = "supplied" | "derived" | "parameter";
export type Scope = "person" | "person-month" | "case" | "month" | "global";
export type Program = "All" | "Medicaid" | "SNAP";
export type BaseType =
  | "yes/no" | "number" | "date" | "month" | "text" | "enum"
  | "person" | "group" | "relationships" | "table" | "months" | "unknown";

/** An expression node. Payloads are arbitrary nested JSON, exactly as the
 *  ledger stores them, so the element type stays `any` on purpose. */
export interface ExprNode extends ReadonlyArray<any> {}
export type Expr = boolean | number | string | null | ExprNode;
export type Value = unknown;

export interface ItemVersion { from: string; value: unknown }
export interface Effective { from: string; to: string }

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
  relationships?: Array<[string, string]>;
  parameters?: Record<string, unknown>;
  month_defaults?: Record<string, unknown>;
  month_facts?: Record<string, Record<string, unknown>>;
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
  supplied_by?: string;
  value?: unknown;
  versions?: ItemVersion[];
  derived?: Expr;
  derived_text?: string;
  sources?: string[];
  effective?: Effective;
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
  tests?: TestSpec[];
}

export interface ApprovalPolicy {
  roles: string[];
  by_program: Record<string, string[]>;
  by_kind: Record<string, string[]>;
  by_tag: Record<string, string[]>;
}

export interface ProgramVocabulary {
  id: string;
  /** Identifiers owned by this program start with it; null for shared items. */
  prefix: string | null;
  /** The items this program's administrators are accountable for. */
  outcomes?: string[];
}

/** A tag in a declared hierarchy: an id, the parent tag's id (absent for a
 *  top-level tag), and an optional display label (falls back to the id). */
export interface TagDecl { id: string; parent?: string; label?: string }

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
  /** Declared tag vocabulary: a flat list of ids (as every volume before the
   *  Colorado build wrote it) or a hierarchy of {id, parent?, label?}.
   *  Absent on volumes written before phase 2. */
  tags?: Array<string | TagDecl>;
}

/** Ids the constraint checker validates citations against. When omitted the
 *  existence checks are skipped, so an engine can be built before the
 *  markdown files load. */
export interface EngineRefs {
  sourceIds: readonly string[];
  questionIds: readonly string[];
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-\d{2}$/;
export const BLOCK_OPS: ReadonlySet<string> = new Set([
  "all", "any", "case", "exists", "exists_related", "each", "some_month",
]);
export const MONTH_BINDING: ReadonlySet<string> = new Set([
  "each", "some_month", "count_months", "avg",
]);
export const RELS: readonly string[] = [
  "parent", "guardian", "caretaker relative", "spouse", "relative",
];
export const ARITH: ReadonlySet<string> = new Set(["+", "-", "*", "/"]);
export const CMP: ReadonlySet<string> = new Set(["<", "<=", ">", ">=", "="]);
export const PAREN_OPS: ReadonlySet<string> = new Set([
  "+", "-", "*", "/", "otherwise", "min", "years_between", "count_months", "avg",
]);

export const BASE: Record<string, BaseType> = {
  "yes/no": "yes/no", "whole number": "number", "money": "number", "hours": "number",
  "rate": "number", "calendar date": "date", "month": "month", "text": "text",
  "one of": "enum", "person": "person", "group of persons": "group",
  "relationships": "relationships", "table keyed by person": "table",
  "list of months": "months",
};
