/* Builds public/data.json for the blind-b prototype from the Colorado volume:
 * the item YAML files (through the engine's own parser), volume.yaml,
 * sources.md, documents.yaml, open-questions.md, tests/cases.yaml and
 * aid-codes.yaml. Bundles documents/ so the citation viewer can open the full
 * text. Run from the repository root:
 *   npx vite-node prototypes/blind-b/scripts/build-data.ts */
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { parseItemFile, parseVolumeFile } from "../../../src/engine/yaml";
import { createEngine } from "../../../src/engine/engine";
import { makeCase, evaluate } from "../../../src/engine/evaluate";
import { caseToSpec } from "../../../src/engine/cases";
import { buildScreening } from "./screening-data";
import { buildExternal } from "./external-data";

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

// The cross-program review's class of each shared item (docs/reviews/cross-program-primitives.json):
// primitive, clean derivation, grey, or a program's own item other programs read.
const shareClass: Record<string, string> = {};
{
  const f = path.join(import.meta.dirname, "../../../docs/reviews/cross-program-primitives.json");
  if (fs.existsSync(f)) {
    for (const r of JSON.parse(fs.readFileSync(f, "utf8")).items as Array<{ identifier: string; class: string; shared?: boolean }>) {
      if (r.shared) shareClass[r.identifier] = r.class;
    }
  }
}

// The known limits the product owner reviews with each program's owner
// (docs/reviews/known-limits.md): "## Program" sections of "### ID ..." entries.
// An entry whose body starts "**Closed" is closed; the programs come from the
// section heading (and SUN Bucks where the entry names it).
const knownLimits: Array<{ id: string; title: string; section: string; programs: string[]; closed: string | null; paras: string[] }> = [];
{
  const f = path.join(root, "docs/reviews/known-limits.md");
  if (fs.existsSync(f)) {
    const PROGS: Array<[RegExp, string]> = [[/SNAP/, "SNAP"], [/CCCAP/, "CCCAP"], [/LEAP/, "LEAP"], [/Adult Financial/, "AdultFinancial"],
      [/Colorado Works/, "ColoradoWorks"], [/Medicaid/, "Medicaid"], [/CHP\+/, "CHP+"], [/SUN Bucks/, "SunBucks"]];
    let section = "";
    for (const block of fs.readFileSync(f, "utf8").split(/^(?=##+ )/m)) {
      const head = /^(##+) (.*)$/m.exec(block);
      if (!head) continue;
      if (head[1] === "##") { section = head[2].trim(); continue; }
      const m = /^([A-Z][A-Z0-9-]*\d)\.?\s*(?:\(([^)]*)\))?:?\s*(.*)$/.exec(head[2].trim());
      if (!m) continue;
      const body = block.slice(block.indexOf("\n") + 1).trim();
      const paras = body.split(/\n\s*\n|\n(?=- \*\*)/).map((p) => p.trim()).filter(Boolean);
      const closed = /^\*\*Closed\b/.test(paras[0] ?? "") ? paras[0].replace(/^\*\*Closed\s*(\([^)]*\))?\.?\*\*\s*/, "").trim() || "closed" : null;
      // The programs the entry itself names in its title, description or table; else its section's.
      const own = m[3] + " " + (paras.find((p) => p.startsWith("- **Description")) ?? "") + " " + paras.filter((p) => p.startsWith("|")).join(" ");
      const named = PROGS.filter(([re]) => re.test(own)).map(([, p]) => p);
      const programs = named.length ? named : PROGS.filter(([re]) => re.test(section)).map(([, p]) => p);
      knownLimits.push({ id: m[1], title: (m[3] || m[2] || "").replace(/^./, (c) => c.toUpperCase()), section, programs, closed, paras: closed ? paras.slice(1) : paras });
    }
  }
}

const data = {
  generated: new Date().toISOString().slice(0, 10),
  chapters, items, meta, sources, documents, questions, cases, aidCodes, touched, shareClass, knownLimits,
};
// A host may hold each file to 16 MB (a claude.ai Artifact): the households and
// what each reads go in data-cases.json, and the screening-order review
// (docs/reviews/screening-order.json, for the Screening view) in
// data-screening.json; src/store.ts loads both from `parts`.
{
  const { cases: c, touched: t, ...rest } = data as Record<string, unknown>;
  const parts = ["data-cases.json"];
  fs.writeFileSync(path.join(out, "data-cases.json"), JSON.stringify({ cases: c, touched: t }));
  const screening = buildScreening(root, sources);
  if (screening) {
    fs.writeFileSync(path.join(out, "data-screening.json"), JSON.stringify({ screening }));
    parts.push("data-screening.json");
  }
  const external = buildExternal(root);
  if (external) {
    fs.writeFileSync(path.join(out, "data-external.json"), JSON.stringify({ external }));
    parts.push("data-external.json");
  }
  fs.writeFileSync(path.join(out, "data.json"), JSON.stringify({ ...rest, parts }));
  for (const f of ["data.json", ...parts]) {
    const size = fs.statSync(path.join(out, f)).size;
    if (size > 16 * 1024 * 1024) throw new Error(`${f} is ${(size / 1e6).toFixed(1)} MB, over the 16 MB a host may allow per file`);
  }
}

// The documents go out as a few JSON bundles, keyed by their volume path
// (`documents/D-1.md`), not as one file each.
fs.rmSync(path.join(out, "documents"), { recursive: true, force: true });
writeDocumentBundle(out, fs.readdirSync(path.join(vol, "documents")).sort().map((f) => ({
  key: `documents/${f}`, text: fs.readFileSync(path.join(vol, "documents", f), "utf8"),
})));

/** Writes the documents' text as a few JSON files (`documents.json`, the
 *  index from key to file, and `documents-<n>.json`, each under 8 MB), so the
 *  page fetches a handful of files instead of one per document and a static
 *  host with a file-count limit can serve it. */
function writeDocumentBundle(dir: string, docs: Array<{ key: string; text: string }>): number {
  const LIMIT = 8 * 1024 * 1024;
  const index: Record<string, string> = {};
  let chunk: Record<string, string> = {};
  let size = 2;
  let n = 0;
  const flush = () => {
    if (!Object.keys(chunk).length) return;
    const name = `documents-${n++}.json`;
    fs.writeFileSync(path.join(dir, name), JSON.stringify(chunk));
    for (const k of Object.keys(chunk)) index[k] = name;
    chunk = {};
    size = 2;
  };
  for (const d of docs) {
    const bytes = Buffer.byteLength(JSON.stringify(d.key) + ":" + JSON.stringify(d.text) + ",");
    if (size + bytes > LIMIT) flush();
    chunk[d.key] = d.text;
    size += bytes;
  }
  flush();
  fs.writeFileSync(path.join(dir, "documents.json"), JSON.stringify(index));
  return n;
}
const mb = (fs.statSync(path.join(out, "data.json")).size / 1e6).toFixed(1);
console.log(`data.json: ${items.length} items, ${sources.length} sources, ${questions.length} questions, ${cases.length} cases, ${documents.length} documents; ${mb} MB`);
