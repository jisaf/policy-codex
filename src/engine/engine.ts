import { buildIndex, indexWith, nextIdFrom, type LedgerIndex } from "./ledger-index";
import { block, compact, inline } from "./render";
import { parseDerivation, parseInline } from "./parse";
import { check, usesOf, type CheckResult } from "./check";
import { makeCase, runTest, type TestResult } from "./evaluate";
import { runCase, type CaseReport, type HouseholdCase } from "./cases";
import {
  explain, explainCase, type CaseExplanation, type TraceNode,
} from "./explain";
import {
  formatTest, itemBlock, parseItemBlock, parseTestLine,
  type ItemBlockExtra, type ParsedItemBlock,
} from "./item-block";
import { approvals, constraints, type Constraint } from "./constraints";
import {
  governance, nearest, type Candidate, type Finding,
} from "./governance";
import {
  aCodes, buildGraph, impactOf, projectionA, type AProjection, type DependencyGraph,
} from "./graph";
import { renameIdentifier, type RenameResult } from "./rename";
import { baseType, fmt, lit, paramValue, slug } from "./values";
import type {
  BaseType, EngineRefs, Expr, Item, Scope, TestSpec, VolumeMeta,
} from "./types";

export interface Engine {
  readonly meta: VolumeMeta;
  readonly index: LedgerIndex;
  items(): Item[];
  item(identifier: string): Item | undefined;
  itemById(id: string): Item | undefined;
  withDrafts(drafts: Item[]): Engine;
  withItems(items: Item[]): Engine;
  baseType(it: { type?: string }): BaseType;
  lit(v: unknown): string;
  fmt(v: unknown): string;
  paramValue(it: Item): unknown;
  slug(name: string): string;
  nextId(): string;
  inline(e: Expr): string;
  block(e: Expr): string[];
  compact(e: Expr): string;
  parseInline(s: string, options?: readonly string[]): Expr;
  parseDerivation(text: string, options?: readonly string[]): Expr;
  check(e: Expr, scope: Scope | undefined): CheckResult;
  uses(e: Expr): string[];
  runTest(it: Item, t: TestSpec): TestResult;
  runCase(c: HouseholdCase): CaseReport;
  runCases(cases: HouseholdCase[]): CaseReport[];
  explain(
    spec: TestSpec & { as_of?: string }, identifier: string,
    person: string | null, month: string | null,
  ): TraceNode;
  explainCase(hc: HouseholdCase): CaseExplanation[];
  itemBlock(it: Item, extra?: ItemBlockExtra): string;
  parseItemBlock(text: string): ParsedItemBlock;
  formatTest(t: TestSpec): string;
  parseTestLine(line: string): TestSpec;
  approvals(it: Item): string[];
  constraints(it: Item): Constraint[];
  governance(it: Item, opts?: { isNew?: boolean }): Finding[];
  nearest(it: Item): Candidate[];
  rename(from: string, to: string): RenameResult;
  readonly graph: DependencyGraph;
  usedBy(identifier: string): string[];
  usesOfItem(identifier: string): string[];
  impact(identifiers: readonly string[]): string[];
  aCode(identifier: string): string;
  projectionA(identifier: string, sourceTitles?: Record<string, string>): AProjection;
}

export function createEngine(
  items: Item[], meta: VolumeMeta, refs: EngineRefs | null = null,
): Engine {
  const ix = buildIndex(items);
  const graph = buildGraph(ix);
  const codes = aCodes(ix);
  return {
    meta,
    index: ix,
    items: () => ix.items,
    item: (identifier) => ix.byIdentifier.get(identifier),
    itemById: (id) => ix.byId.get(id),
    withDrafts: (drafts) => createEngine(indexWith(ix, drafts).items, meta, refs),
    withItems: (next) => createEngine(next, meta, refs),
    baseType,
    lit,
    fmt,
    paramValue,
    slug,
    nextId: () => nextIdFrom(ix),
    inline: (e) => inline(ix, e),
    block: (e) => block(ix, e),
    compact: (e) => compact(ix, e),
    parseInline: (s, options) => parseInline(ix, s, options),
    parseDerivation: (text, options) => parseDerivation(ix, text, options),
    check: (e, scope) => check(ix, e, scope),
    uses: (e) => usesOf(ix, e),
    runTest: (it, t) => runTest(ix, it, t, meta.default_as_of),
    runCase: (c) => runCase(ix, c),
    runCases: (cases) => cases.map((c) => runCase(ix, c)),
    explain: (spec, identifier, person, month) =>
      explain(
        ix,
        makeCase(ix, Object.assign({}, spec, { as_of: spec.as_of || meta.default_as_of })),
        identifier, person, month,
      ),
    explainCase: (hc) => explainCase(ix, hc),
    itemBlock: (it, extra) => itemBlock(ix, it, extra),
    parseItemBlock: (text) => parseItemBlock(ix, meta, text),
    formatTest,
    parseTestLine: (line) => parseTestLine(ix, line),
    approvals: (it) => approvals(meta, it),
    constraints: (it) => constraints(ix, meta, refs, it),
    governance: (it, opts) => governance(ix, meta, it, opts),
    nearest: (it) => nearest(ix, it, meta),
    rename: (from, to) => renameIdentifier(ix, from, to),
    graph,
    usedBy: (identifier) => graph.usedBy.get(identifier) ?? [],
    usesOfItem: (identifier) => graph.uses.get(identifier) ?? [],
    impact: (identifiers) => impactOf(graph, identifiers),
    aCode: (identifier) => codes.get(identifier) ?? "",
    projectionA: (identifier, sourceTitles) =>
      projectionA(ix, meta, graph, codes, identifier, sourceTitles),
  };
}
