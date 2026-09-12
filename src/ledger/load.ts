import { MANIFEST_PATH } from "../config";
import { parseItemFile, parseVolumeFile } from "../engine/yaml";
import { parseCases, type HouseholdCase } from "../engine/cases";
import type { Item, VolumeMeta } from "../engine/types";
import { parseManifest, type Manifest, type VolumeEntry } from "./manifest";
import { parseOpenQuestions, parseSources, type OpenQuestion, type Source } from "./markdown";
import { parseDocuments, type DocumentMeta } from "./documents";
import { cacheKey, type LedgerCache } from "./cache";
import type { LedgerSource } from "./source";

export interface LoadedVolume {
  volumeId: string;
  title: string;
  path: string;
  ref: string;
  sha: string | null;
  meta: VolumeMeta;
  items: Item[];
  sources: Source[];
  /** The exact `sources.md` body, so the AI panel's "Extract excerpts" appends
   *  to the file the volume was read from rather than re-serialising it. */
  sourcesText: string;
  openQuestions: OpenQuestion[];
  /** Household cases from `tests/cases.yaml`; empty when the file is absent. */
  cases: HouseholdCase[];
  /** The exact `tests/cases.yaml` body, so staging a new case appends to the
   *  file the volume was read from rather than re-serialising it. */
  casesText: string | null;
  /** Document metadata from `documents.yaml`; the text of each document is
   *  fetched by the view, not here. Empty when the file is absent. */
  documents: DocumentMeta[];
  /** item id -> chapter directory, so a file path is reconstructible. */
  chapterOf: Record<string, string>;
}

export async function loadManifest(src: LedgerSource): Promise<Manifest> {
  return parseManifest(JSON.parse(await src.readText(MANIFEST_PATH)));
}

export function itemFilePath(vol: LoadedVolume, id: string): string {
  const chapter = vol.chapterOf[id];
  if (!chapter) throw new Error(`no chapter recorded for ${id}`);
  return `${vol.path}/${chapter}/${id}.yaml`;
}

export function chapterDirs(vol: LoadedVolume): string[] {
  return [...new Set(Object.values(vol.chapterOf))];
}

async function mapWithLimit<T, R>(
  input: T[], limit: number, fn: (t: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(input.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, input.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= input.length) return;
      out[i] = await fn(input[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function loadVolume(
  src: LedgerSource, manifest: Manifest, volumeId: string,
  opts: { cache?: LedgerCache; concurrency?: number } = {},
): Promise<LoadedVolume> {
  const entry: VolumeEntry | undefined = manifest.volumes.find((v) => v.id === volumeId);
  if (!entry) throw new Error(`no volume "${volumeId}" in codex.json`);
  const sha = await src.head();
  if (sha && opts.cache) {
    const hit = await opts.cache.get(cacheKey(volumeId, sha));
    if (hit) return { ...hit, ref: src.ref };
  }

  const [volumeText, sourcesText, questionsText, casesText, documentsText] = await Promise.all([
    src.readText(`${entry.path}/volume.yaml`),
    src.readText(`${entry.path}/sources.md`),
    src.readText(`${entry.path}/open-questions.md`),
    src.readText(`${entry.path}/tests/cases.yaml`).catch(() => null),
    src.readText(`${entry.path}/documents.yaml`).catch(() => null),
  ]);

  const targets = entry.chapters.flatMap((c) => c.files.map((f) => ({ dir: c.dir, file: f })));
  const texts = await mapWithLimit(
    targets, opts.concurrency ?? 12, (t) => src.readText(`${entry.path}/${t.dir}/${t.file}`),
  );

  const items: Item[] = [];
  const chapterOf: Record<string, string> = {};
  texts.forEach((text, i) => {
    const item = parseItemFile(text);
    items.push(item);
    chapterOf[item.id] = targets[i].dir;
  });

  const vol: LoadedVolume = {
    volumeId: entry.id,
    title: entry.title,
    path: entry.path,
    ref: src.ref,
    sha,
    meta: parseVolumeFile(volumeText),
    items,
    sources: parseSources(sourcesText),
    sourcesText,
    openQuestions: parseOpenQuestions(questionsText),
    cases: casesText == null ? [] : parseCases(casesText),
    casesText,
    documents: documentsText == null ? [] : parseDocuments(documentsText),
    chapterOf,
  };
  if (sha && opts.cache) {
    const { ref: _ref, ...cacheable } = vol;
    await opts.cache.put(cacheKey(volumeId, sha), cacheable);
  }
  return vol;
}
