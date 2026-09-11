import type { Item } from "../engine/types";
import { stringifyItem } from "../engine/yaml";

export interface ChangeEntry {
  /** The item id, which is also the file name stem. */
  id: string;
  /** The chapter directory the file lives in. */
  chapter: string;
  before: Item | null;
  after: Item | null;
}

export interface ChangeSet {
  volume: string;
  baseRef: string;
  branch: string | null;
  prNumber: number | null;
  entries: ChangeEntry[];
}

export function emptyChangeSet(volume: string, baseRef: string): ChangeSet {
  return { volume, baseRef, branch: null, prNumber: null, entries: [] };
}

export function entryKind(e: ChangeEntry): "add" | "edit" | "delete" {
  if (!e.before) return "add";
  if (!e.after) return "delete";
  return "edit";
}

export function entryLabel(e: ChangeEntry): string {
  const item = e.after ?? e.before;
  return `${e.id} ${item?.name ?? ""}`.trim();
}

/** Unchanged means the file that would be written is identical: an editor
 *  round trip may reorder keys without changing the item. */
export function isUnchanged(e: ChangeEntry): boolean {
  const s = (i: Item | null) => (i ? stringifyItem(i) : null);
  return s(e.before) === s(e.after);
}
