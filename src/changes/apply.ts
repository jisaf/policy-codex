import type { Item } from "../engine/types";
import type { ChangeSet } from "./types";

export function applyChangeSet(items: Item[], cs: ChangeSet): Item[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const e of cs.entries) {
    if (e.after) byId.set(e.id, e.after);
    else byId.delete(e.id);
  }
  return [...byId.values()];
}

export function changedIds(cs: ChangeSet): string[] {
  return cs.entries.map((e) => e.id);
}

export function changedIdentifiers(cs: ChangeSet): string[] {
  const out = new Set<string>();
  for (const e of cs.entries) {
    if (e.before) out.add(e.before.identifier);
    if (e.after) out.add(e.after.identifier);
  }
  return [...out];
}
