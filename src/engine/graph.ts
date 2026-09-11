import type { LedgerIndex } from "./ledger-index";
import { usesOf } from "./check";
import { block } from "./render";
import { approvals } from "./constraints";
import { lit, paramValue } from "./values";
import type { Expr, Item, VolumeMeta } from "./types";

export interface DependencyGraph {
  uses: Map<string, string[]>;
  usedBy: Map<string, string[]>;
}

/** Dependencies for the graph view: like check()'s refs, but the
 *  Determination Date constants count as a reference to that supplied fact. */
export function graphUses(ix: LedgerIndex, it: Item): string[] {
  if (it.kind !== "derived" || it.derived === undefined || it.derived === null) return [];
  const refs = new Set(usesOf(ix, it.derived));
  const walk = (e: unknown): void => {
    if (!Array.isArray(e)) return;
    if (e[0] === "det_date" || e[0] === "det_month") {
      if (ix.byIdentifier.has("determination_date")) refs.add("determination_date");
      return;
    }
    for (const sub of e) walk(sub);
  };
  walk(it.derived as Expr);
  return [...refs].sort();
}

export function buildGraph(ix: LedgerIndex): DependencyGraph {
  const uses = new Map<string, string[]>();
  const usedBy = new Map<string, string[]>();
  for (const it of ix.items) {
    uses.set(it.identifier, graphUses(ix, it));
    if (!usedBy.has(it.identifier)) usedBy.set(it.identifier, []);
  }
  for (const [id, deps] of uses) {
    for (const d of deps) {
      const list = usedBy.get(d) ?? [];
      list.push(id);
      usedBy.set(d, list);
    }
  }
  for (const [k, v] of usedBy) usedBy.set(k, v.sort());
  return { uses, usedBy };
}

/** Every item transitively downstream of any of `identifiers`, excluding them. */
export function impactOf(g: DependencyGraph, identifiers: readonly string[]): string[] {
  const seen = new Set<string>();
  const frontier = [...identifiers];
  while (frontier.length) {
    const cur = frontier.pop()!;
    for (const c of g.usedBy.get(cur) ?? []) {
      if (!seen.has(c)) { seen.add(c); frontier.push(c); }
    }
  }
  for (const id of identifiers) seen.delete(id);
  return [...seen].sort();
}

/** DE = data element, RV = reference value, RL = rule. Assigned in ledger order. */
export function aCodes(ix: LedgerIndex): Map<string, string> {
  const codes = new Map<string, string>();
  let de = 0, rv = 0, rl = 0;
  for (const it of ix.items) {
    if (it.kind === "supplied" || (it.kind === "derived" && it.implemented === "assembly")) {
      codes.set(it.identifier, `DE-${String(++de).padStart(3, "0")}`);
    } else if (it.kind === "parameter") {
      codes.set(it.identifier, `RV-${String(++rv).padStart(3, "0")}`);
    } else {
      codes.set(it.identifier, `RL-${String(++rl).padStart(3, "0")}`);
    }
  }
  return codes;
}

export interface AProjection { ledger: string; code: string; text: string }

export function projectionA(
  ix: LedgerIndex, meta: VolumeMeta, g: DependencyGraph, codes: Map<string, string>,
  identifier: string, sourceTitles: Record<string, string> = {},
): AProjection {
  const it = ix.byIdentifier.get(identifier);
  if (!it) throw new Error("unknown item " + identifier);
  const code = codes.get(identifier)!;
  const label = (id: string) => `${codes.get(id) ?? "?"} ${ix.byIdentifier.get(id)?.name ?? id}`;
  const sourceList = (it.sources || [])
    .map((s) => (sourceTitles[s] ? `${s} ${sourceTitles[s]}` : s)).join(", ");
  const inputs = (g.uses.get(identifier) ?? []).map(label);
  const consumers = (g.usedBy.get(identifier) ?? []).map((c) => codes.get(c) ?? c);

  const lines: string[] = [];
  const put = (w: number) => (k: string, v: string) => lines.push(k.padEnd(w) + v);

  if (it.kind === "parameter") {
    const f = put(17);
    f("Reference value", `${code} ${it.name}`);
    f("Value", lit(paramValue(it)));
    f("Program", it.program);
    f("State election", (it.tags || []).includes("state_election") ? "yes" : "no");
    if (sourceList) f("Source", sourceList);
    return { ledger: "Rules codex (reference value)", code, text: lines.join("\n") };
  }

  const f = put(15);
  if (it.kind === "supplied") {
    f("Data element", `${code} ${it.name}`);
    f("Data type", it.type);
    f("Cardinality", it.scope);
    f("Programs", it.program);
    f("Source system", it.supplied_by || "");
    f("Definition", it.meaning || "");
    if (consumers.length) f("Consumed by", consumers.join(", "));
    return { ledger: "Data dictionary (data element)", code, text: lines.join("\n") };
  }

  let derivedLines: string[];
  try {
    derivedLines = it.derived ? block(ix, it.derived) : ["(empty)"];
  } catch (e) {
    derivedLines = ["(invalid: " + (e as Error).message + ")"];
  }

  if (it.implemented === "assembly") {
    f("Data element", `${code} ${it.name}`);
    f("Data type", it.type);
    f("Cardinality", it.scope);
    f("Programs", it.program);
    f("Definition", it.meaning || "");
    if (it.precision) f("Precision", it.precision);
    f("Derivation", derivedLines[0]);
    for (const l of derivedLines.slice(1)) lines.push(" ".repeat(15) + l);
    if (inputs.length) f("Inputs", inputs.join(", "));
    if (consumers.length) f("Consumed by", consumers.join(", "));
    if (sourceList) f("Source", sourceList);
    f("Approval", approvals(meta, it).join(", "));
    f("Status", "Draft");
    return { ledger: "Data dictionary (derived data element)", code, text: lines.join("\n") };
  }

  f("Rule", `${code} ${it.name}`);
  f("Program", it.program);
  f("Evaluated per", it.scope);
  f("Result type", it.type + (it.options?.length ? ": " + it.options.join(", ") : ""));
  f("Statement", it.meaning || "");
  f("Satisfied when", derivedLines[0]);
  for (const l of derivedLines.slice(1)) lines.push(" ".repeat(15) + l);
  const de = inputs.filter((x) => x.startsWith("DE-"));
  const rv = inputs.filter((x) => x.startsWith("RV-"));
  const rl = inputs.filter((x) => x.startsWith("RL-"));
  if (de.length) f("Data elements", de.map((x) => x + " (data dictionary)").join(", "));
  if (rv.length) f("Ref. values", rv.join(", "));
  if (rl.length) f("Rules", rl.join(", "));
  if (consumers.length) f("Consumed by", consumers.join(", "));
  if (sourceList) f("Source", sourceList);
  f("Approval", approvals(meta, it).join(", "));
  f("Status", "Draft");
  return { ledger: "Rules codex (rule)", code, text: lines.join("\n") };
}
