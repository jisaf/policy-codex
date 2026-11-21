import type { Item } from "../engine/types";
import type { ChangeEntry, ChangeSet } from "./types";

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

/** An entry that changes only an item's signatures (`status`, `approval`):
 *  no value a rule reads changes, so it reaches nothing downstream. */
export function isSignatureOnly(e: ChangeEntry): boolean {
  if (!e.before || !e.after) return false;
  const strip = ({ status: _s, approval: _a, ...rest }: Item) => JSON.stringify(rest);
  return strip(e.before) === strip(e.after);
}

/** The identifiers a change set changes, for impact: a signature-only entry
 *  (an approval staged from the inbox) changes none. */
export function changedIdentifiers(cs: ChangeSet): string[] {
  const out = new Set<string>();
  for (const e of cs.entries) {
    if (isSignatureOnly(e)) continue;
    if (e.before) out.add(e.before.identifier);
    if (e.after) out.add(e.after.identifier);
  }
  return [...out];
}
