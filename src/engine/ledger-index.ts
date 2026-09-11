import type { Item } from "./types";

export interface LedgerIndex {
  items: Item[];
  byIdentifier: Map<string, Item>;
  byName: Map<string, Item>;
  byId: Map<string, Item>;
  enumOptions: Set<string>;
}

export function buildIndex(items: Item[]): LedgerIndex {
  const byIdentifier = new Map<string, Item>();
  const byName = new Map<string, Item>();
  const byId = new Map<string, Item>();
  const enumOptions = new Set<string>();
  for (const it of items) {
    byIdentifier.set(it.identifier, it);
    byName.set((it.name || "").toLowerCase(), it);
    byId.set(it.id, it);
    for (const o of it.options || []) enumOptions.add(o);
  }
  return { items, byIdentifier, byName, byId, enumOptions };
}

/** A new index with `extra` overlaid by identifier. Never mutates `base`. */
export function indexWith(base: LedgerIndex, extra: Item[]): LedgerIndex {
  const merged = base.items.slice();
  for (const it of extra) {
    const k = merged.findIndex((x) => x.identifier === it.identifier);
    if (k >= 0) merged[k] = it;
    else merged.push(it);
  }
  return buildIndex(merged);
}

export function nextIdFrom(ix: LedgerIndex, prefix = "WR"): string {
  const used = new Set(ix.items.map((i) => i.id));
  let n = 1;
  for (const it of ix.items) {
    const m = /^[A-Za-z]+-(\d+)$/.exec(it.id);
    if (m) n = Math.max(n, Number(m[1]) + 1);
  }
  while (used.has(`${prefix}-${String(n).padStart(3, "0")}`)) n++;
  return `${prefix}-${String(n).padStart(3, "0")}`;
}
