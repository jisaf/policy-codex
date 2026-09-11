import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import { applyChangeSet, changedIdentifiers } from "./apply";
import type { ChangeSet } from "./types";

export interface ItemReport {
  id: string;
  identifier: string;
  errors: string[];
  warnings: string[];
}

export interface ChangeSetReport {
  items: ItemReport[];
  impact: string[];
  valid: boolean;
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
    reports.push({
      id: e.id,
      identifier: item.identifier,
      errors: report.filter((r) => !r.ok && r.level === "error").map((r) => r.msg),
      warnings: report.filter((r) => r.level === "warn").map((r) => r.msg),
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
    if (fresh.length) reports.push({ id: item.id, identifier, errors: fresh, warnings: [] });
  }
  return { items: reports, impact, valid: reports.every((r) => r.errors.length === 0) };
}

function errorsOf(engine: Engine, item: Item): string[] {
  return engine.constraints(item).filter((r) => !r.ok && r.level === "error").map((r) => r.msg);
}
