/* Builds the prototype's data bundle from the codex itself.
 *
 *   npx vite-node prototypes/blind-a/scripts/build-data.ts
 *
 * Reads (never writes) volumes/co/** and conformance/co/ledger.json (run
 * `npm run export -- --volume co` first), plus `git log` for the volume, and
 * writes prototypes/blind-a/public/data/codex.json and a copy of every source
 * document under public/data/documents/. Parsers for sources.md,
 * open-questions.md and the case comments are this prototype's own. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { parse as parseYaml, parseDocument, isMap, isPair, isScalar } from "yaml";
import { parseItemFile, parseVolumeFile } from "../../../src/engine/yaml";
import { createEngine } from "../../../src/engine/engine";
import type { Item } from "../../../src/engine/types";

const here = path.dirname(new URL(import.meta.url).pathname);
const proto = path.resolve(here, "..");
const root = path.resolve(proto, "../..");
const vol = path.join(root, "volumes/co");
const out = path.join(proto, "public/data");
fs.mkdirSync(path.join(out, "documents"), { recursive: true });

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1 << 28 });
}

// ---------------------------------------------------------------- items
function itemFiles(dir: string): string[] {
  const outFiles: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "documents" || e.name === "tests") continue;
      outFiles.push(...itemFiles(p));
    } else if (/^CO-\d+\.yaml$/.test(e.name)) outFiles.push(p);
  }
  return outFiles;
}
const files = itemFiles(vol);
const items: Array<Item & { chapter: string; file: string }> = [];
for (const f of files) {
  const it = parseItemFile(fs.readFileSync(f, "utf8"));
  items.push({ ...it, chapter: path.basename(path.dirname(f)), file: path.relative(root, f) });
}
items.sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)));
const meta = parseVolumeFile(fs.readFileSync(path.join(vol, "volume.yaml"), "utf8"));

// ------------------------------------------------- the JSON export (English)
const ledgerPath = path.join(root, "conformance/co/ledger.json");
if (!fs.existsSync(ledgerPath)) throw new Error("run `npm run export -- --volume co` first");
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const english: Record<string, string> = {};
const usedBy: Record<string, string[]> = {};
for (const li of ledger.items) {
  if (li.derived_english) english[li.identifier] = li.derived_english;
  usedBy[li.identifier] = li.used_by ?? [];
}

// ------------------------------------------------------------- sources.md
interface Source {
  id: string; title: string; doc: string | null; cite: string; url: string | null;
  verification: string | null; excerpt: string;
}
const sources: Record<string, Source> = {};
{
  const text = fs.readFileSync(path.join(vol, "sources.md"), "utf8");
  const blocks = text.split(/^### /m).slice(1);
  for (const b of blocks) {
    const lines = b.split("\n");
    const m = /^(S\d+)\.\s*(.*)$/.exec(lines[0]);
    if (!m) continue;
    let doc: string | null = null, cite = "", url: string | null = null, verification: string | null = null;
    const ex: string[] = [];
    for (const l of lines.slice(1)) {
      if (l.startsWith("Document:")) doc = l.slice(9).trim();
      else if (l.startsWith("Verification:")) verification = l.slice(13).trim();
      else if (l.startsWith(">")) ex.push(l.replace(/^>\s?/, ""));
      else if (l.trim() && !cite && !l.startsWith("---")) {
        const um = /(https?:\/\/\S+)\s*$/.exec(l);
        url = um ? um[1] : null;
        cite = l.replace(/\s*https?:\/\/\S+\s*$/, "").trim();
      } else if (l.trim() && ex.length && !l.startsWith("---")) ex.push("");
    }
    sources[m[1]] = { id: m[1], title: m[2].trim(), doc, cite, url, verification, excerpt: ex.join("\n").trim() };
  }
}

// ------------------------------------------------------------- documents
const documents = (parseYaml(fs.readFileSync(path.join(vol, "documents.yaml"), "utf8")) ?? []) as Array<Record<string, unknown>>;
for (const d of documents) {
  const src = path.join(vol, String(d.file ?? `documents/${d.id}.md`));
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(out, "documents", `${d.id}.md`));
}

// ----------------------------------------------------- open-questions.md
interface Question {
  id: string; title: string; state: "open" | "partly" | "resolved";
  paragraphs: string[]; items: string[];
}
const questions: Question[] = [];
{
  const text = fs.readFileSync(path.join(vol, "open-questions.md"), "utf8");
  for (const b of text.split(/^### /m).slice(1)) {
    const [head, ...rest] = b.split("\n");
    const m = /^(OQ-\d+)\.\s*(.*)$/.exec(head);
    if (!m) continue;
    const title = m[2].trim();
    const state = /^Resolved\b/i.test(title) ? "resolved" : /^Partly resolved\b/i.test(title) ? "partly" : "open";
    const paragraphs = rest.join("\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const ids = new Set<string>();
    for (const p of paragraphs) {
      const im = /Items:\s*([^\n]*)$/.exec(p);
      if (im) for (const x of im[1].match(/CO-\d+/g) ?? []) ids.add(x);
    }
    questions.push({ id: m[1], title, state, paragraphs, items: [...ids] });
  }
}
// An item's own `open` list also names its questions.
const qById = new Map(questions.map((q) => [q.id, q]));
for (const it of items) for (const oq of it.open ?? []) {
  const q = qById.get(oq);
  if (q && !q.items.includes(it.id)) q.items.push(it.id);
}

// ------------------------------------------------------------- aid codes
const aidCodes = parseYaml(fs.readFileSync(path.join(vol, "aid-codes.yaml"), "utf8"));

// ----------------------------------------------- cases, with their comments
const casesText = fs.readFileSync(path.join(vol, "tests/cases.yaml"), "utf8");
const cases = parseYaml(casesText) as Array<Record<string, unknown>>;
const personNotes: Record<string, Record<string, string>> = {};
{
  const doc = parseDocument(casesText);
  const seq = doc.contents as unknown as { items: unknown[] };
  for (const c of seq.items) {
    if (!isMap(c)) continue;
    const id = String(c.get("id"));
    const notes: Record<string, string> = {};
    const persons = c.get("persons", true);
    if (isMap(persons)) {
      for (const pair of persons.items) {
        if (!isPair(pair) || !isScalar(pair.key)) continue;
        const pid = String(pair.key.value);
        const val = pair.value as { commentBefore?: string; items?: unknown[] } | null;
        let note = val?.commentBefore ?? "";
        if (!note && isMap(val)) {
          const first = (val.items[0] as { key?: { commentBefore?: string } } | undefined);
          note = first?.key?.commentBefore ?? "";
        }
        if (note) notes[pid] = note.split("\n").map((s) => s.trim()).join(" ").trim();
      }
    }
    personNotes[id] = notes;
  }
}

// ------------------------------------------------------------- git history
const idOfFile = new Map(items.map((it) => [it.file, it.id]));
interface Commit { sha: string; date: string; subject: string; items: string[]; added: string[]; other: string[] }
const commits: Commit[] = [];
{
  const log = git(["log", "--no-merges", "--name-status", "--format=@@%h|%ad|%s", "--date=short", "--", "volumes/co"]);
  let cur: Commit | null = null;
  for (const line of log.split("\n")) {
    if (line.startsWith("@@")) {
      const [sha, date, ...s] = line.slice(2).split("|");
      cur = { sha, date, subject: s.join("|"), items: [], added: [], other: [] };
      commits.push(cur);
    } else if (cur && line.trim()) {
      const [st, ...ps] = line.split("\t");
      const p = ps[ps.length - 1];
      const id = idOfFile.get(p);
      if (id) { (st === "A" ? cur.added : cur.items).push(id); }
      else cur.other.push(p.replace("volumes/co/", ""));
    }
  }
}
const headSha = git(["rev-parse", "--short", "HEAD"]).trim();

// Field-level comparison with the start of the current month: which items
// were added, and which fields of the others changed.
const today = new Date();
const monthStart = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-01`;
const monthDiff: { month: string; base: string; baseDate: string; added: string[]; changed: Record<string, string[]> } = {
  month: monthStart.slice(0, 7), base: "", baseDate: "", added: [], changed: {},
};
{
  const base = git(["rev-list", "-1", `--before=${monthStart}T00:00`, "HEAD"]).trim();
  if (base) {
    monthDiff.base = base.slice(0, 7);
    monthDiff.baseDate = git(["log", "-1", "--format=%ad", "--date=short", base]).trim();
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "blind-a-base-"));
    const tar = execFileSync("git", ["archive", base, "volumes/co"], { cwd: root, maxBuffer: 1 << 28 });
    fs.writeFileSync(path.join(tmp, "base.tar"), tar);
    execFileSync("tar", ["-xf", path.join(tmp, "base.tar"), "-C", tmp]);
    const old = new Map<string, Record<string, unknown>>();
    const baseDir = path.join(tmp, "volumes/co");
    if (fs.existsSync(baseDir)) {
      for (const f of itemFiles(baseDir)) {
        try {
          const raw = parseYaml(fs.readFileSync(f, "utf8")) as Record<string, unknown>;
          if (raw?.id) old.set(String(raw.id), raw);
        } catch { /* a base file the current parser cannot read counts as changed */ }
      }
    }
    for (const it of items) {
      const o = old.get(it.id);
      if (!o) { monthDiff.added.push(it.id); continue; }
      const fields = new Set<string>();
      const cur = it as unknown as Record<string, unknown>;
      for (const k of new Set([...Object.keys(o), ...Object.keys(cur)])) {
        if (k === "chapter" || k === "file") continue;
        if (JSON.stringify(o[k] ?? null) !== JSON.stringify(cur[k] ?? null)) fields.add(k);
      }
      if (fields.size) monthDiff.changed[it.id] = [...fields];
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// --------------------------------------- engine-derived indexes (slow ones)
// The roles each item needs (the approval policy, upstream of outcomes
// included), and the identifiers each stored household's determinations
// actually read (every fact in every trace), so "which households does this
// touch" is answered from the traces rather than from the graph alone.
const engine = createEngine(items, meta);
const approvals: Record<string, string[]> = {};
for (const it of items) approvals[it.identifier] = engine.approvals(it);
const caseReads: Record<string, string[]> = {};
for (const c of cases) {
  const seen = new Set<string>();
  const walk = (n: { identifier: string; children: unknown[] }) => {
    seen.add(n.identifier);
    for (const k of n.children as Array<{ identifier: string; children: unknown[] }>) walk(k);
  };
  for (const ex of engine.explainCase(c as never)) walk(ex.root);
  caseReads[String(c.id)] = [...seen].sort();
}

const bundle = {
  built: new Date().toISOString(),
  approvals,
  caseReads,
  sha: headSha,
  meta,
  items,
  english,
  usedBy,
  sources,
  documents,
  questions,
  aidCodes,
  cases,
  personNotes,
  commits,
  monthDiff,
};
fs.writeFileSync(path.join(out, "codex.json"), JSON.stringify(bundle));
console.log(
  `wrote ${path.relative(root, path.join(out, "codex.json"))}: ${items.length} items, ` +
  `${Object.keys(sources).length} sources, ${questions.length} questions, ${cases.length} cases, ` +
  `${commits.length} commits; month ${monthDiff.month}: ${monthDiff.added.length} added, ` +
  `${Object.keys(monthDiff.changed).length} changed since ${monthDiff.baseDate}`,
);
