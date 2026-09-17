import type { TagDecl, VolumeMeta } from "./types";

/** Every declared tag, normalized to object form regardless of how
 *  volume.yaml wrote it: a flat list of ids, or a list of
 *  `{id, parent?, label?}`. Pure and side-effect free. */
export function normalizeTags(meta: VolumeMeta): TagDecl[] {
  return (meta.tags ?? []).map((t) => (typeof t === "string" ? { id: t } : t));
}

/** The declared tag ids, in declaration order, regardless of vocabulary form. */
export function tagIds(meta: VolumeMeta): string[] {
  return normalizeTags(meta).map((t) => t.id);
}

/** The display label for a declared tag: its `label`, or the id itself when
 *  none is declared (including for a flat, pre-hierarchy vocabulary). */
export function tagLabel(meta: VolumeMeta, id: string): string {
  return normalizeTags(meta).find((t) => t.id === id)?.label ?? id;
}

/** Every parent tag's id mapped to its declared children's ids, built from
 *  each tag's `parent`. A tag that declares no parent is a group of its own
 *  and never appears as a value here (only as a key, if something is a child
 *  of it). */
export function tagGroups(meta: VolumeMeta): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const t of normalizeTags(meta)) {
    if (!t.parent) continue;
    const list = out.get(t.parent);
    if (list) list.push(t.id);
    else out.set(t.parent, [t.id]);
  }
  return out;
}

/** The chain of ancestors for a tag, nearest first, e.g. `["ma"]` for `"magi"`
 *  when volume.yaml declares magi's parent as ma. Empty for a tag with no
 *  parent, an undeclared tag, or a flat (pre-hierarchy) vocabulary. Guards
 *  against a cyclic `parent` declaration by never revisiting an id. */
export function tagAncestors(meta: VolumeMeta, tag: string): string[] {
  const byId = new Map(normalizeTags(meta).map((t) => [t.id, t] as const));
  const out: string[] = [];
  const seen = new Set<string>([tag]);
  let cur = byId.get(tag)?.parent;
  while (cur && !seen.has(cur)) {
    out.push(cur);
    seen.add(cur);
    cur = byId.get(cur)?.parent;
  }
  return out;
}
