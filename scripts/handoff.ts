/* Writes handoff.md from the checked-in ledger. Run with `npm run handoff`. */
import fs from "node:fs";
import path from "node:path";
import { createEngine } from "../src/engine/engine";
import { parseCases } from "../src/engine/cases";
import { parseItemFile, parseVolumeFile } from "../src/engine/yaml";
import { parseOpenQuestions, parseSources } from "../src/ledger/markdown";
import { handoffMarkdown } from "../src/export/handoff";
import type { LoadedVolume } from "../src/ledger/load";
import type { Item } from "../src/engine/types";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "codex.json"), "utf8"));
const entry = manifest.volumes[0];

const items: Item[] = [];
const chapterOf: Record<string, string> = {};
for (const ch of entry.chapters) {
  for (const f of ch.files) {
    const it = parseItemFile(fs.readFileSync(path.join(root, entry.path, ch.dir, f), "utf8"));
    items.push(it);
    chapterOf[it.id] = ch.dir;
  }
}
const meta = parseVolumeFile(
  fs.readFileSync(path.join(root, entry.path, "volume.yaml"), "utf8"),
);
const sources = parseSources(
  fs.readFileSync(path.join(root, entry.path, "sources.md"), "utf8"),
);
const openQuestions = parseOpenQuestions(
  fs.readFileSync(path.join(root, entry.path, "open-questions.md"), "utf8"),
);
const casesPath = path.join(root, entry.path, "tests/cases.yaml");
const cases = fs.existsSync(casesPath) ? parseCases(fs.readFileSync(casesPath, "utf8")) : [];

const vol: LoadedVolume = {
  volumeId: entry.id, title: entry.title, path: entry.path, ref: "local", sha: null,
  meta, items, sources, openQuestions, cases, chapterOf,
};
const engine = createEngine(items, meta, {
  sourceIds: sources.map((s) => s.id),
  questionIds: openQuestions.map((q) => q.id),
});

const out = path.join(root, "handoff.md");
fs.writeFileSync(out, handoffMarkdown(engine, vol));
console.log(`wrote handoff.md for ${items.length} items`);
