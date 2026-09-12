#!/usr/bin/env node
/* One-time migration: the 33 excerpts in volumes/mwr/sources.md are grouped by
   the document they were taken from. Writes volumes/mwr/documents.yaml, one
   volumes/mwr/documents/D-n.md per document, and adds a `Document: D-n` line
   under each excerpt heading in sources.md. Idempotent: re-running rewrites
   the same files and leaves an already-annotated sources.md unchanged. */
import fs from "node:fs";
import path from "node:path";
import { parseSources } from "../src/ledger/markdown.ts";
import { stringifyDocuments } from "../src/ledger/documents.ts";

const root = path.resolve(import.meta.dirname, "..");
const volDir = path.join(root, "volumes", "mwr");
const sourcesPath = path.join(volDir, "sources.md");

/* The roots, in the order their first excerpt appears. A root is the document
   a citation points into: a U.S. Code section, a CFR part, or a public law.
   `match` is tested against the citation line of each excerpt. */
const ROOTS = [
  {
    match: /^42 U\.S\.C\. 1396a/,
    title: "42 U.S.C. 1396a — State plans for medical assistance",
    kind: "statute",
    citation: "42 U.S.C. 1396a",
  },
  {
    match: /^42 CFR 435/,
    title: "42 CFR part 435 — Medicaid eligibility, including the community engagement subpart",
    kind: "regulation",
    citation: "42 CFR part 435",
    date: "2026-06-03",
  },
  {
    match: /^42 CFR 440/,
    title: "42 CFR part 440 — Services: general provisions",
    kind: "regulation",
    citation: "42 CFR part 440",
  },
  {
    match: /^Pub\. L\. 115-119/,
    title: "Pub. L. 115-119 — RAISE Family Caregivers Act",
    kind: "statute",
    citation: "Pub. L. 115-119",
  },
  {
    match: /^29 U\.S\.C\. 206/,
    title: "29 U.S.C. 206 — Fair Labor Standards Act, minimum wage",
    kind: "statute",
    citation: "29 U.S.C. 206",
  },
  {
    match: /^7 U\.S\.C\. 2015/,
    title: "7 U.S.C. 2015 — SNAP eligibility disqualifications and work requirements",
    kind: "statute",
    citation: "7 U.S.C. 2015",
  },
  {
    match: /^7 CFR 273/,
    title: "7 CFR part 273 — SNAP certification of eligible households",
    kind: "regulation",
    citation: "7 CFR part 273",
    date: "2026-08-31",
  },
  {
    match: /^Pub\. L\. 119-21/,
    title: "Pub. L. 119-21 — amending language for the work requirements",
    kind: "statute",
    citation: "Pub. L. 119-21",
  },
];

const URL_RE = /https?:\/\/\S+/;

const sourcesMd = fs.readFileSync(sourcesPath, "utf8");
const sources = parseSources(sourcesMd);

/* Group every excerpt under the first root its citation matches. */
const groups = ROOTS.map((r) => ({ root: r, sources: [] }));
for (const s of sources) {
  const g = groups.find((x) => x.root.match.test(s.citation));
  if (!g) throw new Error(`${s.id}: no document root matches "${s.citation}"`);
  g.sources.push(s);
}
const empty = groups.filter((g) => g.sources.length === 0);
if (empty.length) throw new Error(`roots with no excerpts: ${empty.map((g) => g.root.citation)}`);

/* D-n in root order; the url is the first one any of its excerpts cites. */
const docs = groups.map((g, i) => {
  const id = `D-${i + 1}`;
  const url = g.sources.map((s) => URL_RE.exec(s.citation)?.[0]).find(Boolean);
  return {
    id,
    title: g.root.title,
    kind: g.root.kind,
    citation: g.root.citation,
    ...(url ? { url } : {}),
    file: `documents/${id}.md`,
    ...(g.root.date ? { date: g.root.date } : {}),
  };
});

const docDir = path.join(volDir, "documents");
fs.mkdirSync(docDir, { recursive: true });
docs.forEach((doc, i) => {
  const g = groups[i];
  const lines = [];
  lines.push(`# ${doc.title}`);
  lines.push("");
  lines.push(`${doc.citation}${doc.url ? `. ${doc.url}` : ""}`);
  lines.push("");
  lines.push(
    "The full text of this document is not available in the repository. What follows is " +
      `every excerpt the volume quotes from it (${g.sources.length} of the 33 in sources.md), ` +
      "under the excerpt id that cites it. Re-verify each quote against the official source " +
      "before approval.",
  );
  for (const s of g.sources) {
    lines.push("");
    lines.push(`## ${s.id}. ${s.title}`);
    lines.push("");
    lines.push(s.citation);
    lines.push("");
    for (const l of s.text.split("\n")) lines.push(`> ${l}`.trimEnd());
  }
  fs.writeFileSync(path.join(docDir, `${doc.id}.md`), lines.join("\n") + "\n");
});

fs.writeFileSync(path.join(volDir, "documents.yaml"), stringifyDocuments(docs));

/* Annotate sources.md: `Document: D-n` on the line under each excerpt heading. */
const docOf = new Map();
groups.forEach((g, i) => { for (const s of g.sources) docOf.set(s.id, `D-${i + 1}`); });
const headRe = /^### (S\d+)\./;
const out = [];
const inLines = sourcesMd.split("\n");
for (let i = 0; i < inLines.length; i++) {
  const line = inLines[i];
  out.push(line);
  const m = headRe.exec(line.trim());
  if (!m) continue;
  const want = `Document: ${docOf.get(m[1])}`;
  const rest = inLines.slice(i + 1);
  const already = rest.findIndex((l) => l.trim() !== "");
  if (already >= 0 && /^Document:/.test(rest[already].trim())) {
    // Already annotated: drop the old line and write the current one.
    out.push("", want);
    i += already + 1;
    continue;
  }
  out.push("", want);
}
fs.writeFileSync(sourcesPath, out.join("\n"));

console.log(`${docs.length} documents, ${sources.length} excerpts annotated`);
for (const [i, d] of docs.entries()) {
  console.log(`  ${d.id} ${d.citation} — ${groups[i].sources.length} excerpts`);
}
