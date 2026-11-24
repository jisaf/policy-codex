import {
  emptyChangeSet, fileEntries, type ChangeEntry, type ChangeSet, type FileEntry,
} from "./types";

export function changeSetKey(volume: string, baseRef: string): string {
  return `codex.changes.${volume}@${baseRef}`;
}

function defaultStorage(): Storage | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch { /* storage blocked */ }
  return null;
}

export function loadChangeSet(
  volume: string, baseRef: string, storage: Storage | null = defaultStorage(),
): ChangeSet {
  if (!storage) return emptyChangeSet(volume, baseRef);
  try {
    const raw = storage.getItem(changeSetKey(volume, baseRef));
    if (!raw) return emptyChangeSet(volume, baseRef);
    const cs = JSON.parse(raw) as ChangeSet;
    if (!cs || !Array.isArray(cs.entries)) return emptyChangeSet(volume, baseRef);
    return {
      ...emptyChangeSet(volume, baseRef), ...cs, volume, baseRef,
      files: Array.isArray(cs.files) ? cs.files : [],
    };
  } catch {
    return emptyChangeSet(volume, baseRef);
  }
}

export function saveChangeSet(
  cs: ChangeSet, storage: Storage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(changeSetKey(cs.volume, cs.baseRef), JSON.stringify(cs));
  } catch { /* quota or blocked storage: the tray still works in memory */ }
}

export function putEntry(cs: ChangeSet, entry: ChangeEntry): ChangeSet {
  const entries = cs.entries.filter((e) => e.id !== entry.id);
  entries.push(entry);
  return { ...cs, entries };
}

export function discardEntry(cs: ChangeSet, id: string): ChangeSet {
  return { ...cs, entries: cs.entries.filter((e) => e.id !== id) };
}

export function putFileEntry(cs: ChangeSet, entry: FileEntry): ChangeSet {
  const files = fileEntries(cs).filter((f) => f.path !== entry.path);
  files.push(entry);
  return { ...cs, files };
}

export function discardFileEntry(cs: ChangeSet, path: string): ChangeSet {
  return { ...cs, files: fileEntries(cs).filter((f) => f.path !== path) };
}

export function clearEntries(cs: ChangeSet): ChangeSet {
  return { ...cs, entries: [], files: [], branch: null, prNumber: null };
}
