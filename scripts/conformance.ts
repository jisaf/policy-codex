/* Writes conformance/suite.json from the checked-in ledger, pinned to the
 * current git commit. Run with `npm run conformance`. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createEngine } from "../src/engine/engine";
import { parseCases } from "../src/engine/cases";
import { parseItemFile, parseVolumeFile } from "../src/engine/yaml";
import { parseOpenQuestions, parseSources } from "../src/ledger/markdown";
import { buildSuite } from "../src/export/conformance";
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
const meta = parseVolumeFile(fs.readFileSync(path.join(root, entry.path, "volume.yaml"), "utf8"));
const sources = parseSources(fs.readFileSync(path.join(root, entry.path, "sources.md"), "utf8"));
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

let sha = "unknown";
try {
  sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
} catch {
  // no git available (or not a repo) — leave "unknown"
}

const suite = buildSuite(engine, vol, sha);
const outDir = path.join(root, "conformance");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "suite.json"), JSON.stringify(suite, null, 2));

console.log(
  `wrote conformance/suite.json: ${suite.cases.length} cases ` +
    `(${suite.cases.filter((c) => c.kind === "rule-test").length} rule-test, ` +
    `${suite.cases.filter((c) => c.kind === "household").length} household), ` +
    `codex@${sha}` +
    (suite.notes.length ? `, ${suite.notes.length} stale expectation(s) noted` : ""),
);
