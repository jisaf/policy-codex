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

/** A staged write to any file in the repository that is not an item: a
 *  document, its metadata, a household case. File entries travel with the
 *  change set and are written by Propose, but they carry no impact: items stay
 *  the only entries the engine can reason about. */
export interface FileEntry {
  /** The repository path, which is also the entry's identity. */
  path: string;
  before: string | null;
  after: string | null;
  /** What the tray shows a steward, e.g. "D-9 Hardship guidance". */
  label: string;
}

export interface ChangeSet {
  volume: string;
  baseRef: string;
  branch: string | null;
  prNumber: number | null;
  entries: ChangeEntry[];
  /** Optional so a change set persisted before file entries existed loads. */
  files?: FileEntry[];
}

export function emptyChangeSet(volume: string, baseRef: string): ChangeSet {
  return { volume, baseRef, branch: null, prNumber: null, entries: [], files: [] };
}

export function fileEntries(cs: ChangeSet): FileEntry[] {
  return cs.files ?? [];
}

/** A file entry whose body is unchanged is not written, exactly as an item
 *  entry that round-tripped to the same YAML is not. */
export function isFileUnchanged(e: FileEntry): boolean {
  return e.before === e.after;
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
