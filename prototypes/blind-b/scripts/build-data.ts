/* Builds public/data.json for the blind-b prototype from the Colorado volume:
 * the item YAML files (through the engine's own parser), volume.yaml,
 * sources.md, documents.yaml, open-questions.md, tests/cases.yaml and
 * aid-codes.yaml. Copies documents/ so the citation viewer can open the full
 * text. Run from the repository root:
 *   npx vite-node prototypes/blind-b/scripts/build-data.ts */
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { parseItemFile, parseVolumeFile } from "../../../src/engine/yaml";
import { createEngine } from "../../../src/engine/engine";
import { makeCase, evaluate } from "../../../src/engine/evaluate";
import { caseToSpec } from "../../../src/engine/cases";

const here = import.meta.dirname;
const root = path.resolve(here, "../../..");
const vol = path.join(root, "volumes/co");
const out = path.resolve(here, "../public");
fs.mkdirSync(out, { recursive: true });

const codex = JSON.parse(fs.readFileSync(path.join(root, "codex.json"), "utf8"));
const co = codex.volumes.find((v: any) => v.path === "volumes/co");
const items: any[] = [];
const chapters: any[] = [];
for (const ch of co.chapters) {
  chapters.push({ dir: ch.dir, title: ch.title });
  for (const f of ch.files) {
    const it: any = parseItemFile(fs.readFileSync(path.join(vol, ch.dir, f), "utf8"));
    it.chapter = ch.dir;
    items.push(it);
  }
}
const meta = parseVolumeFile(fs.readFileSync(path.join(vol, "volume.yaml"), "utf8"));

// sources.md: "### S12. Title" blocks.
function parseSources(text: string) {
  const res: any[] = [];
  const parts = text.split(/^### (S\d+)\. /m);
  for (let i = 1; i < parts.length; i += 2) {
    const id = parts[i];
    const body = parts[i + 1];
    const nl = body.indexOf("\n");
    const title = body.slice(0, nl).trim();
    const rest = body.slice(nl + 1);
    const doc = /^Document:\s*(D-\d+)/m.exec(rest)?.[1] ?? null;
    const ver = /^Verification:\s*(.*)$/m.exec(rest)?.[1] ?? null;
    const lines = rest.split("\n");
    const quote = lines.filter((l) => l.startsWith(">")).map((l) => l.replace(/^> ?/, "")).join("\n").trim();
    const isMeta = (l: string) => /^(Document|Verification):/.test(l) || l.startsWith(">") || l.trim() === "---";
    const citeLine = lines.find((l) => l.trim() && !isMeta(l)) ?? "";
    const url = /(https?:\/\/\S+)/.exec(citeLine)?.[1]?.replace(/[.)]+$/, "") ?? null;
    const cite = citeLine.replace(/\s*https?:\/\/\S+/, "").trim();
    const notes = lines.filter((l) => l.trim() && l !== citeLine && !isMeta(l)).join("\n").trim();
    const s: any = { id, title, doc, cite, url, quote };
    if (ver && /^unverified/i.test(ver)) s.unverified = ver.replace(/^unverified\.?\s*/i, "") || "unverified";
    if (notes) s.notes = notes;
    res.push(s);
  }
  return res;
}
const sources = parseSources(fs.readFileSync(path.join(vol, "sources.md"), "utf8"));

// open-questions.md: "### OQ-12. Title" blocks; a "Resolved" or "Partly
// resolved" prefix on the title is the state; "Items: CO-1, CO-2." names items.
function parseQuestions(text: string) {
  const res: any[] = [];
  const parts = text.split(/^### (OQ-\d+)\. /m);
  for (let i = 1; i < parts.length; i += 2) {
    const id = parts[i];
    const body = parts[i + 1];
    const nl = body.indexOf("\n");
    let title = body.slice(0, nl).trim();
    let state = "open";
    const m = /^(Resolved(?: \([^)]*\))?|Partly resolved(?: \([^)]*\))?)[:.;,]?\s*/i.exec(title);
    if (m) {
      state = /^partly/i.test(m[1]) ? "partly" : "resolved";
      title = title.slice(m[0].length);
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    const paras = body.slice(nl + 1).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      .map((p) => p.replace(/^Body:\s*/, ""));
    const itemIds = new Set<string>();
    for (const p of paras) {
      for (const mm of p.matchAll(/Items:\s*([^\n]*?)\.(?:\s|$)/g)) {
        for (const x of mm[1].matchAll(/CO-\d+/g)) itemIds.add(x[0]);
      }
    }
    res.push({ id, title, state, paras, items: [...itemIds] });
  }
  return res;
}
const questions = parseQuestions(fs.readFileSync(path.join(vol, "open-questions.md"), "utf8"));

const documents = parseYaml(fs.readFileSync(path.join(vol, "documents.yaml"), "utf8"));
const cases = parseYaml(fs.readFileSync(path.join(vol, "tests/cases.yaml"), "utf8"));
const aidCodes = parseYaml(fs.readFileSync(path.join(vol, "aid-codes.yaml"), "utf8"));

// Which items each stored household actually reads when every program outcome
// is decided for every person (the evaluator short-circuits, so this is
// narrower than "everything upstream"). Stored as item indexes.
const eng = createEngine(items, meta);
const outcomes = (meta.programs ?? []).flatMap((p) => p.outcomes ?? []);
const pos = new Map(items.map((it, i) => [it.identifier, i]));
const touched: Record<string, number[]> = {};
for (const c of cases) {
  const cd = makeCase(eng.index, caseToSpec(c));
  const month = c.as_of.slice(0, 7);
  const seen = new Set<number>();
  for (const pid of Object.keys(c.persons)) {
    for (const o of outcomes) {
      const it = eng.item(o);
      if (!it) continue;
      try {
        evaluate(eng.index, cd, o, pid, it.scope === "person-month" ? month : null, (e) => {
          const k = pos.get(e.identifier);
          if (k !== undefined) seen.add(k);
        });
      } catch { /* an outcome that cannot be evaluated reads nothing more */ }
    }
  }
  touched[c.id] = [...seen].sort((a, b) => a - b);
}

const data = {
  generated: new Date().toISOString().slice(0, 10),
  chapters, items, meta, sources, documents, questions, cases, aidCodes, touched,
};
fs.writeFileSync(path.join(out, "data.json"), JSON.stringify(data));

const docOut = path.join(out, "documents");
fs.mkdirSync(docOut, { recursive: true });
for (const f of fs.readdirSync(path.join(vol, "documents"))) {
  fs.copyFileSync(path.join(vol, "documents", f), path.join(docOut, f));
}
const mb = (fs.statSync(path.join(out, "data.json")).size / 1e6).toFixed(1);
console.log(`data.json: ${items.length} items, ${sources.length} sources, ${questions.length} questions, ${cases.length} cases, ${documents.length} documents; ${mb} MB`);
