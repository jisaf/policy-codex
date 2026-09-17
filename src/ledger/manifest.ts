export interface Chapter { dir: string; title: string; files: string[] }
export interface VolumeEntry {
  id: string;
  title: string;
  path: string;
  /** e.g. "draft", while a volume is still being built. Absent means
   *  published; the volume selector shows a "(draft)" suffix when set. */
  status?: string;
  chapters: Chapter[];
}
export interface Manifest { volumes: VolumeEntry[] }

export function parseManifest(raw: unknown): Manifest {
  const m = raw as Manifest;
  if (!m || !Array.isArray(m.volumes)) throw new Error("codex.json has no volumes list");
  for (const v of m.volumes) {
    if (!v.id || !v.path || !Array.isArray(v.chapters)) {
      throw new Error(`codex.json volume "${v?.id ?? "?"}" is malformed`);
    }
    for (const c of v.chapters) {
      if (!c.dir || !Array.isArray(c.files)) {
        throw new Error(`codex.json chapter "${c?.dir ?? "?"}" is malformed`);
      }
    }
  }
  return m;
}

/** A new manifest with item file names added to or removed from chapters.
 *  Never mutates the input. */
export function updateManifestFiles(
  manifest: Manifest, volumeId: string,
  changes: Array<{ chapter: string; file: string; removed: boolean }>,
): Manifest {
  return {
    volumes: manifest.volumes.map((v) => {
      if (v.id !== volumeId) return v;
      return {
        ...v,
        chapters: v.chapters.map((c) => {
          const mine = changes.filter((ch) => ch.chapter === c.dir);
          if (!mine.length) return c;
          const files = new Set(c.files);
          for (const ch of mine) {
            if (ch.removed) files.delete(ch.file);
            else files.add(ch.file);
          }
          return { ...c, files: [...files].sort() };
        }),
      };
    }),
  };
}

export function manifestChanged(a: Manifest, b: Manifest): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}
