/* Volume selection and loading for the command-line scripts (conformance,
 * conform, handoff, export, governance, check). Every script takes
 * `--volume <id>` (repeatable, or comma-separated) or `CODEX_VOLUME`, and with
 * neither runs every volume `codex.json` lists, never just the first. */
import fs from "node:fs";
import path from "node:path";
import { createEngine, type Engine } from "../engine/engine";
import { parseCases } from "../engine/cases";
import { parseItemFile, parseVolumeFile } from "../engine/yaml";
import { parseOpenQuestions, parseSources, unverifiedSourceIds } from "../ledger/markdown";
import { parseDocuments } from "../ledger/documents";
import { AID_CODES_FILE, parseAidCodes } from "../ledger/aid-codes";
import type { LoadedVolume } from "../ledger/load";
import type { Item } from "../engine/types";

export interface ManifestVolume {
  id: string;
  title: string;
  path: string;
  chapters: Array<{ dir: string; title?: string; files: string[] }>;
}

export function manifestVolumes(root: string): ManifestVolume[] {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "codex.json"), "utf8"));
  return manifest.volumes as ManifestVolume[];
}

/** The volume ids a script was asked for: every `--volume <id>` (or
 *  `--volume=a,b`), else `CODEX_VOLUME` (comma-separated), else every volume
 *  in the manifest, in manifest order. Throws on an id the manifest lacks. */
export function selectedVolumeIds(
  root: string, argv: readonly string[] = process.argv.slice(2),
  env: string | undefined = process.env.CODEX_VOLUME,
): string[] {
  const all = manifestVolumes(root).map((v) => v.id);
  const asked: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--volume" && argv[i + 1]) asked.push(...argv[++i].split(","));
    else if (a.startsWith("--volume=")) asked.push(...a.slice("--volume=".length).split(","));
  }
  if (!asked.length && env) asked.push(...env.split(","));
  const ids = asked.map((s) => s.trim()).filter(Boolean);
  for (const id of ids) {
    if (!all.includes(id)) throw new Error(`no volume "${id}" in codex.json (volumes: ${all.join(", ")})`);
  }
  return ids.length ? [...new Set(ids)] : all;
}

/** Strips the `--volume` arguments from argv, for scripts that parse the rest. */
export function withoutVolumeArgs(argv: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--volume") { i++; continue; }
    if (argv[i].startsWith("--volume=")) continue;
    out.push(argv[i]);
  }
  return out;
}

/** One volume read from disk the way the app reads it from GitHub, and an
 *  engine over it. */
export function loadVolume(root: string, volumeId: string): { vol: LoadedVolume; engine: Engine } {
  const entry = manifestVolumes(root).find((v) => v.id === volumeId);
  if (!entry) throw new Error(`no volume "${volumeId}" in codex.json`);
  const read = (rel: string) => fs.readFileSync(path.join(root, entry.path, rel), "utf8");
  const exists = (rel: string) => fs.existsSync(path.join(root, entry.path, rel));
  const items: Item[] = [];
  const chapterOf: Record<string, string> = {};
  for (const ch of entry.chapters) {
    for (const f of ch.files) {
      const it = parseItemFile(read(path.join(ch.dir, f)));
      items.push(it);
      chapterOf[it.id] = ch.dir;
    }
  }
  const meta = parseVolumeFile(read("volume.yaml"));
  const sourcesText = exists("sources.md") ? read("sources.md") : "";
  const sources = parseSources(sourcesText);
  const openQuestions = exists("open-questions.md") ? parseOpenQuestions(read("open-questions.md")) : [];
  const casesText = exists("tests/cases.yaml") ? read("tests/cases.yaml") : null;
  const cases = casesText === null ? [] : parseCases(casesText);
  const documents = exists("documents.yaml") ? parseDocuments(read("documents.yaml")) : [];
  const aidCodes = exists(AID_CODES_FILE) ? parseAidCodes(read(AID_CODES_FILE)) : null;
  const vol: LoadedVolume = {
    volumeId: entry.id, title: entry.title, path: entry.path, ref: "local", sha: null,
    meta, items, sources, sourcesText, openQuestions, cases, casesText, documents, chapterOf,
    aidCodes,
  };
  const engine = createEngine(items, meta, {
    sourceIds: sources.map((s) => s.id),
    questionIds: openQuestions.map((q) => q.id),
    unverifiedSourceIds: unverifiedSourceIds(sources),
  });
  return { vol, engine };
}

/** Where a volume's generated conformance files live. */
export function conformanceDir(root: string, volumeId: string): string {
  return path.join(root, "conformance", volumeId);
}
