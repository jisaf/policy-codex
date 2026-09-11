#!/usr/bin/env node
/* One-time migration: five chapter files -> one YAML file per item plus a
   manifest. Idempotent; safe to re-run while the old ledger still exists. */
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { stringifyItem, stringifyVolume } from "../src/engine/yaml.ts";

const root = path.resolve(import.meta.dirname, "..");
const oldDir = path.join(root, "work-requirements", "approach-b", "ledger");
const volDir = path.join(root, "volumes", "mwr");

const CHAPTERS = [
  { file: "01-supplied.yaml", dir: "supplied", title: "Supplied facts" },
  { file: "02-parameters.yaml", dir: "parameters", title: "Parameters" },
  { file: "03-medicaid.yaml", dir: "medicaid", title: "Medicaid community engagement" },
  { file: "04-snap.yaml", dir: "snap", title: "SNAP ABAWD time limit" },
];

const oldMeta = parseYaml(fs.readFileSync(path.join(oldDir, "00-volume.yaml"), "utf8"));
fs.mkdirSync(volDir, { recursive: true });
fs.writeFileSync(path.join(volDir, "volume.yaml"), stringifyVolume(oldMeta));

const chapters = [];
const seenIds = new Set();
let total = 0;
for (const ch of CHAPTERS) {
  const doc = parseYaml(fs.readFileSync(path.join(oldDir, ch.file), "utf8"));
  const dir = path.join(volDir, ch.dir);
  fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (const it of doc.items || []) {
    if (seenIds.has(it.id)) throw new Error(`duplicate item id ${it.id}`);
    seenIds.add(it.id);
    const name = `${it.id}.yaml`;
    fs.writeFileSync(path.join(dir, name), stringifyItem(it));
    files.push(name);
    total++;
  }
  chapters.push({ dir: ch.dir, title: ch.title, files });
}

for (const name of ["sources.md", "open-questions.md"]) {
  fs.copyFileSync(path.join(root, "work-requirements", name), path.join(volDir, name));
}

const manifest = {
  volumes: [{ id: "mwr", title: oldMeta.title, path: "volumes/mwr", chapters }],
};
fs.writeFileSync(path.join(root, "codex.json"), JSON.stringify(manifest, null, 2) + "\n");

// Assert the item set is identical before and after.
const before = CHAPTERS.flatMap(
  (ch) => parseYaml(fs.readFileSync(path.join(oldDir, ch.file), "utf8")).items || [],
);
const after = chapters.flatMap((ch) =>
  ch.files.map((f) => parseYaml(fs.readFileSync(path.join(volDir, ch.dir, f), "utf8"))),
);
const norm = (list) =>
  JSON.stringify([...list].sort((a, b) => a.id.localeCompare(b.id)).map((it) => {
    const o = {};
    for (const k of Object.keys(it).sort()) {
      const v = it[k];
      if (v === null || v === undefined) continue;
      if (Array.isArray(v) && v.length === 0 && k !== "sources") continue;
      o[k] = v;
    }
    return o;
  }));
if (norm(before) !== norm(after)) throw new Error("migration changed the item set");

console.log(`migrated ${total} items into ${chapters.length} chapters under volumes/mwr`);
