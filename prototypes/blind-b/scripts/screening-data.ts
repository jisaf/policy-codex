/* The screening-order review for the Screening view: the machine-readable
 * companion (docs/reviews/screening-order.json) as it is, plus what only the
 * review's Markdown holds (the per-program disqualifier tables and the "may"
 * and "may not" lists), and, for every quoted paragraph, the excerpt (S-nn) or
 * document (D-nn) of the volume that holds the same words, so the page can
 * link to the Law pages the app already has. Used by build-data.ts. */
import fs from "node:fs";
import path from "node:path";

interface Source { id: string; doc: string | null; quote: string }
export interface Paragraph { cite: string; quote: string | null; rest: string; src: string | null; doc: string | null }
export interface DisqRow { condition: string; facts: string; paragraph: Paragraph; denials: string; settle: string; cost: string }
export interface DisqTable { title: string; family: string | null; outcomes: string[]; rows: DisqRow[]; notes: string[] }

const norm = (s: string) => s
  .replace(/[*_>`'"‘’“”]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** The longest run of a quote between ellipses, normalised. */
function needle(quote: string): string {
  const parts = quote.split(/\s*(?:\.\.\.|…)\s*/).map(norm).sort((a, b) => b.length - a.length);
  return (parts[0] ?? "").slice(0, 90);
}

export function buildScreening(root: string, sources: Source[]) {
  const jsonPath = path.join(root, "docs/reviews/screening-order.json");
  const mdPath = path.join(root, "docs/reviews/screening-order.md");
  if (!fs.existsSync(jsonPath) || !fs.existsSync(mdPath)) return null;
  const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const md = fs.readFileSync(mdPath, "utf8");

  // Where each quote lives in the volume: an excerpt first, else a kept document.
  const docDir = path.join(root, "volumes/co/documents");
  const docs = fs.readdirSync(docDir).filter((f) => /^D-\d+\.md$/.test(f))
    .map((f) => ({ id: f.replace(/\.md$/, ""), text: norm(fs.readFileSync(path.join(docDir, f), "utf8")) }));
  const srcNorm = sources.map((s) => ({ s, q: norm(s.quote) }));
  const locate = (quote: string | null, hint?: string | null): { src: string | null; doc: string | null } => {
    const docHint = hint ? /\b(D-\d+)\b/.exec(hint)?.[1] ?? null : null;
    if (!quote) return { src: null, doc: docHint };
    const n = needle(quote);
    if (n.length < 15) return { src: null, doc: docHint };
    const hit = srcNorm.find((x) => x.q.includes(n) && (!docHint || x.s.doc === docHint)) ?? srcNorm.find((x) => x.q.includes(n));
    if (hit) return { src: hit.s.id, doc: hit.s.doc };
    const d = (docHint && docs.find((x) => x.id === docHint && x.text.includes(n))) || docs.find((x) => x.text.includes(n));
    return { src: null, doc: d ? d.id : docHint };
  };
  const paragraph = (cell: string): Paragraph => {
    const m = /^(.*?)"(.+)"(.*)$/.exec(cell);
    const cite = (m ? m[1] : cell).replace(/:\s*$/, "").trim();
    const quote = m ? m[2] : null;
    const rest = m ? m[3].replace(/^[.;,\s]+/, "").trim() : "";
    return { cite, quote, rest, ...locate(quote) };
  };

  // "## Per-program disqualifiers": one "### Title (`outcome`, …)" and table each.
  const section = (name: string, next: RegExp) => {
    const at = md.indexOf("\n## " + name);
    if (at < 0) return "";
    const rest = md.slice(at + 1);
    const end = rest.slice(3).search(next);
    return end < 0 ? rest : rest.slice(0, end + 3);
  };
  const disq = section("Per-program disqualifiers", /\n## /);
  const tables: DisqTable[] = [];
  for (const block of disq.split(/\n### /).slice(1)) {
    const lines = block.split("\n");
    const head = lines[0];
    const title = head.replace(/\s*\(.*$/, "").trim();
    const outcomes = [...head.matchAll(/`([a-z0-9_]+)`/g)].map((x) => x[1]);
    const family = Object.entries<{ outcomes: string[] }>(json.programs).find(([, p]) => p.outcomes.some((o) => outcomes.includes(o)))?.[0] ?? null;
    const rows: DisqRow[] = [];
    const notes: string[] = [];
    let inTable = false;
    for (const l of lines.slice(1)) {
      if (l.startsWith("|")) {
        const cells = l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((x) => x.trim());
        if (!inTable) { inTable = true; continue; }          // the header
        if (/^-+$/.test(cells[0])) continue;                 // the rule under it
        while (cells.length < 6) cells.push("");
        const [condition, facts, para, denials, settle, cost] = cells;
        rows.push({ condition, facts, paragraph: paragraph(para), denials, settle, cost });
      } else if (l.trim()) notes.push(l.trim());
    }
    tables.push({ title, family, outcomes, rows, notes });
  }

  // "### What the front end may do" / "may not do": bullet lists.
  const bullets = (heading: string) => {
    const at = md.indexOf("### " + heading + "\n");
    if (at < 0) return [];
    const body = md.slice(at).split("\n").slice(1);
    const out: string[] = [];
    for (const l of body) {
      if (/^#/.test(l)) break;
      if (l.startsWith("- ")) out.push(l.slice(2).trim());
    }
    return out;
  };

  const guardrails = (json.guardrails as Array<{ rule: string; source: string; quote: string }>).map((g) => ({ ...g, ...locate(g.quote, g.source) }));
  return {
    review: json.review, head: json.head, date: json.date,
    programs: json.programs, cross_program_order: json.cross_program_order, skip_sets: json.skip_sets,
    gaps: json.gaps, measured: json.measured, schema: json.schema,
    guardrails, may: bullets("What the front end may do"), mayNot: bullets("What the front end may not do"),
    disqualifiers: tables,
  };
}
