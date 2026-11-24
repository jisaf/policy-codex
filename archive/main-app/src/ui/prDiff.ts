import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";

export interface PrItemDiff {
  id: string;
  kind: "add" | "edit" | "delete";
  before: Item | null;
  after: Item | null;
}

export function diffVolumes(
  baseItems: readonly Item[], headItems: readonly Item[],
): PrItemDiff[] {
  const base = new Map(baseItems.map((i) => [i.id, i]));
  const head = new Map(headItems.map((i) => [i.id, i]));
  const out: PrItemDiff[] = [];
  for (const [id, b] of base) {
    const h = head.get(id);
    if (!h) out.push({ id, kind: "delete", before: b, after: null });
    else if (JSON.stringify(b) !== JSON.stringify(h)) {
      out.push({ id, kind: "edit", before: b, after: h });
    }
  }
  for (const [id, h] of head) {
    if (!base.has(id)) out.push({ id, kind: "add", before: null, after: h });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export function prImpact(baseEngine: Engine, diffs: readonly PrItemDiff[]): string[] {
  const identifiers = new Set<string>();
  for (const d of diffs) {
    if (d.before) identifiers.add(d.before.identifier);
    if (d.after) identifiers.add(d.after.identifier);
  }
  return baseEngine.impact([...identifiers]);
}
