import type { Engine } from "../engine/engine";
import type { Finding } from "../engine/governance";
import type { Item } from "../engine/types";
import { applyChangeSet, changedIdentifiers } from "./apply";
import type { ChangeEntry, ChangeSet } from "./types";

export interface ItemReport {
  id: string;
  identifier: string;
  errors: string[];
  warnings: string[];
  /** The governance findings for this entry, after the ratchet, so the UI can
   *  label each one with the rule that produced it. */
  governance: Finding[];
}

export interface ChangeSetReport {
  items: ItemReport[];
  impact: string[];
  valid: boolean;
}

/** Two findings are the same finding when rule and message both match. The
 *  message names the other item or the offending token, so a dup finding
 *  against one item never cancels a dup finding against another. */
export function findingKey(f: Finding): string {
  return `${f.rule}|${f.msg}`;
}

/** The ratchet: any error-level finding in `current` that also appears (same
 *  rule and message) in `base` is downgraded to a warning. An edit to an item
 *  that already carried a governance error does not gain a new blocking error
 *  for the same rule and message, so the ledger improves incrementally rather
 *  than being frozen by its own known-bad items. A finding new to `current`
 *  (not present in `base`) is never downgraded. */
export function ratchetGovernance(current: Finding[], base: Finding[]): Finding[] {
  const known = new Set(base.map(findingKey));
  return current.map((f) =>
    f.level === "error" && known.has(findingKey(f))
      ? { ...f, level: "warn" as const }
      : f);
}

/** Governance for one entry. An add is checked with `isNew`, so the rationale
 *  rules apply and every error stands. An edit inherits what its base version
 *  already carried via `ratchetGovernance`. */
function governanceOf(
  base: Engine, applied: Engine, e: ChangeEntry, item: Item,
): Finding[] {
  const found = applied.governance(item, { isNew: !e.before });
  if (!e.before) return found;
  const baseItem = base.itemById(e.id) ?? e.before;
  return ratchetGovernance(found, base.governance(baseItem));
}

/** Runs the full constraint set over the whole ledger with the change-set
 *  applied, so an edit that breaks a downstream item is caught here. */
export function validateChangeSet(base: Engine, cs: ChangeSet): ChangeSetReport {
  const applied = base.withItems(applyChangeSet(base.items(), cs));
  const reports: ItemReport[] = [];
  for (const e of cs.entries) {
    if (!e.after) continue;
    const item = applied.itemById(e.id) ?? e.after;
    const report = applied.constraints(item);
    const findings = governanceOf(base, applied, e, item);
    reports.push({
      id: e.id,
      identifier: item.identifier,
      errors: [
        ...report.filter((r) => !r.ok && r.level === "error").map((r) => r.msg),
        ...findings.filter((f) => f.level === "error").map((f) => f.msg),
      ],
      warnings: [
        ...report.filter((r) => r.level === "warn").map((r) => r.msg),
        ...findings.filter((f) => f.level === "warn").map((f) => f.msg),
      ],
      governance: findings,
    });
  }
  // Impact is measured on the base graph. A delete or an identifier rename
  // removes its own downstream edges from the applied graph, which would
  // otherwise hide exactly the changes with the widest blast radius.
  const impact = base.impact(changedIdentifiers(cs));
  // Downstream items are validated too, but only errors the change-set
  // introduces count: the ledger is already partly invalid by design.
  const entryIds = new Set(cs.entries.map((e) => e.id));
  for (const identifier of impact) {
    const item = applied.item(identifier);
    if (!item || entryIds.has(item.id)) continue;
    const baseItem = base.itemById(item.id);
    const known = new Set(baseItem ? errorsOf(base, baseItem) : []);
    const fresh = errorsOf(applied, item).filter((m) => !known.has(m));
    if (fresh.length) {
      reports.push({ id: item.id, identifier, errors: fresh, warnings: [], governance: [] });
    }
  }
  return { items: reports, impact, valid: reports.every((r) => r.errors.length === 0) };
}

function errorsOf(engine: Engine, item: Item): string[] {
  return engine.constraints(item).filter((r) => !r.ok && r.level === "error").map((r) => r.msg);
}
