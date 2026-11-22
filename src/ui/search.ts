import type { Engine } from "../engine/engine";
import { tagAncestors, tagLabel } from "../engine/tags";
import type { LoadedVolume } from "../ledger/load";
import { questionStatus } from "./questions";
import { buildHash, type Route } from "./router";

/** "question" is a question still open (or partly resolved); "resolved" a
 *  settled one, kept apart so a reader looking for what is undecided does
 *  not wade through history (HCPF analyst F16). */
export type HitKind = "item" | "source" | "question" | "resolved";

export const HIT_KINDS: readonly HitKind[] = ["item", "source", "question", "resolved"];

export const HIT_KIND_LABEL: Record<HitKind, string> = {
  item: "Items", source: "Sources", question: "Open questions", resolved: "Resolved questions",
};

export interface SearchEntry {
  kind: HitKind;
  id: string;
  title: string;
  subtitle: string;
  /** Everything searched, lower-cased, with policy aliases appended. */
  haystack: string;
  /** The words a reader is most likely to search by: the name, meaning and
   *  precision. A query found here ranks above one found only in rule text. */
  primary: string;
  /** An item's program, so a reader's own programs rank first. */
  program?: string;
}

export interface SearchOptions {
  /** The reader's programs (their persona's): an item of another program
   *  ranks below theirs and the shared ones. */
  programs?: readonly string[];
}

export interface SearchIndex { entries: SearchEntry[] }
export interface SearchHit extends SearchEntry { score: number; snippet: string }

function derivationText(engine: Engine, id: string): string {
  const it = engine.item(id);
  if (!it || it.kind !== "derived" || !it.derived) return "";
  try { return engine.block(it.derived).join(" "); } catch { return ""; }
}

/** An item's own tags plus every declared label along their tag hierarchy
 *  (the tag's own label and each ancestor's), so searching a group's label
 *  (e.g. "Medicaid" for the `ma` group) finds items tagged under it. */
function tagText(vol: LoadedVolume, it: { tags?: string[] }): string {
  const out: string[] = [];
  for (const t of it.tags ?? []) {
    out.push(t, tagLabel(vol.meta, t));
    for (const a of tagAncestors(vol.meta, t)) out.push(a, tagLabel(vol.meta, a));
  }
  return out.join(" ");
}

/** Names the same law or idea goes by: text matching the pattern also
 *  answers to the alias word, so "H.R.1" finds Pub. L. 119-21 and
 *  "immigrant" finds non-citizen and lawful-presence rules. */
const ALIASES: Array<[RegExp, string]> = [
  [/119-21|h\.\s?r\.\s?1\b|\bhr\s?1\b|obbba|one big beautiful bill|working families tax cut/i, "hr1"],
  [/non-?citizen|\balien|immigra|lawful(ly)? present|lawful presence|refugee|asylee|lawful permanent|qualified alien|parolee/i, "immigrant"],
  [/statute over rule|supersede|notwithstanding/i, "statute-over-rule"],
  // Medicaid's countable income is MAGI: "countable income" finds the MAGI
  // income items (HCPF analyst task 1: it landed on Colorado Works).
  [/\bmagi[- ]based income|modified adjusted gross income|\bmagi household income/i, "countable income"],
];

/** The query's own spelling of those aliases. */
const QUERY_ALIASES: Array<[RegExp, string]> = [
  [/\bh\.?\s?r\.?\s?1\b|\bpub(lic)?\.?\s*l(aw)?\.?\s*119-21\b|\bobbba\b/gi, "hr1"],
  [/\bimmigrants?\b|\bnon-?citizens?\b|\baliens?\b/gi, "immigrant"],
  [/\bstatute\s+over\s+rules?\b/gi, "statute-over-rule"],
];

function withAliases(text: string): string {
  const extra = ALIASES.filter(([re]) => re.test(text)).map(([, w]) => w);
  return extra.length ? `${text} ${extra.join(" ")}` : text;
}

export function buildSearchIndex(vol: LoadedVolume, engine: Engine): SearchIndex {
  const entries: SearchEntry[] = [];
  for (const it of vol.items) {
    const override = it.statute_override ? `statute over rule ${it.statute_override}` : "";
    const primary = [it.name, it.meaning ?? "", it.precision ?? ""].join(" ").toLowerCase();
    entries.push({
      kind: "item",
      id: it.id,
      title: it.name,
      subtitle: `${it.id} · ${it.identifier} · ${it.kind} · ${it.type} · ${it.scope} · ${it.program}`,
      haystack: withAliases([
        it.id, it.name, it.identifier, it.meaning ?? "", it.precision ?? "", override,
        it.assumption ?? "", tagText(vol, it), derivationText(engine, it.identifier),
      ].join(" ").toLowerCase()),
      primary: withAliases(`${primary} ${override.toLowerCase()}`),
      program: it.program,
    });
  }
  for (const s of vol.sources) {
    entries.push({
      kind: "source", id: s.id, title: `${s.id}. ${s.title}`, subtitle: s.citation,
      haystack: withAliases([s.id, s.title, s.citation, s.text].join(" ").toLowerCase()),
      primary: withAliases(`${s.title} ${s.citation}`.toLowerCase()),
    });
  }
  for (const q of vol.openQuestions) {
    entries.push({
      kind: questionStatus(q) === "resolved" ? "resolved" : "question",
      id: q.id, title: `${q.id} ${q.title}`,
      subtitle: q.items.join(", "),
      haystack: withAliases([q.id, q.title, q.body].join(" ").toLowerCase()),
      primary: withAliases(q.title.toLowerCase()),
    });
  }
  return { entries };
}

function snippetAround(haystack: string, needle: string): string {
  const at = haystack.indexOf(needle);
  if (at < 0) return "";
  const start = Math.max(0, at - 40);
  return (start > 0 ? "…" : "") + haystack.slice(start, at + needle.length + 60).trim() + "…";
}

const STOP = new Set(["the", "a", "an", "of", "for", "to", "in", "and", "or", "is", "what", "does", "do"]);

/** A word's stem for prefix matching: "countable" -> "count",
 *  "immigrants" -> "immigrant". Short words are kept whole. */
export function stem(w: string): string {
  if (w.length <= 4) return w;
  return w.replace(/(ability|able|ible|ings|ing|ied|ies|ed|es|s)$/, "") || w;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface QueryTerm { word: string; re: RegExp }

/** The query as terms, each matched at the start of a word in the text. */
export function queryTerms(q: string): QueryTerm[] {
  let text = q.toLowerCase();
  for (const [re, w] of QUERY_ALIASES) text = text.replace(re, ` ${w} `);
  const words = text.split(/[^a-z0-9_.\-]+/).map((w) => w.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((w) => w && !STOP.has(w));
  return [...new Set(words)].map((word) => ({
    word,
    re: new RegExp(`(^|[^a-z0-9])${escape(stem(word))}`),
  }));
}

export function search(index: SearchIndex, q: string, limit = 30, opts: SearchOptions = {}): SearchHit[] {
  const mine = opts.programs?.length ? new Set(opts.programs) : null;
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const terms = queryTerms(needle);
  const hits: SearchHit[] = [];
  for (const e of index.entries) {
    const phraseAt = e.haystack.indexOf(needle);
    const allTerms = terms.length > 0 && terms.every((t) => t.re.test(e.haystack));
    if (phraseAt < 0 && !allTerms) continue;
    const exactId = e.id.toLowerCase() === needle;
    const title = e.title.toLowerCase();
    // A title that names the thing by another name (Medicaid's "MAGI-based
    // income" is its countable income) answers the phrase a little better
    // than one that only shares the words.
    const aliasTitle = withAliases(title);
    const titleHit = title.includes(needle) || aliasTitle.slice(title.length).includes(needle);
    const aliasBonus = !title.includes(needle) && titleHit && mine && e.program && mine.has(e.program) ? 12 : 0;
    const titleTerms = terms.filter((t) => t.re.test(aliasTitle)).length;
    const primaryTerms = terms.filter((t) => t.re.test(e.primary)).length;
    const primaryPhrase = e.primary.includes(needle);
    let score = (exactId ? 1000 : 0) + (titleHit ? 100 + aliasBonus : 0) + titleTerms * 15
      + (primaryPhrase ? 60 : 0) + primaryTerms * 8 + (phraseAt >= 0 ? 30 + Math.max(0, 20 - phraseAt / 10) : 0)
      + (e.kind === "item" ? 2 : 0);
    if (mine && e.program && !exactId) {
      if (mine.has(e.program)) score += 40;
      else if (e.program !== "All") score *= 0.4;
    }
    const firstTerm = terms[0] ? e.haystack.search(terms[0].re) : -1;
    const snippetNeedle = phraseAt >= 0 ? needle
      : firstTerm >= 0 ? e.haystack.slice(firstTerm, firstTerm + 1 + terms[0].word.length).trim() : needle;
    hits.push({ ...e, score, snippet: snippetAround(e.haystack, snippetNeedle) });
  }
  hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return hits.slice(0, limit);
}

export function groupHits(hits: readonly SearchHit[]): Record<HitKind, SearchHit[]> {
  const out: Record<HitKind, SearchHit[]> = { item: [], source: [], question: [], resolved: [] };
  for (const h of hits) out[h.kind].push(h);
  return out;
}

/** Where a hit goes when it is opened: an item's page, an excerpt on the
 *  Sources page, or a question's own page. */
export function hitHash(hit: SearchHit, route: Route): string {
  if (hit.kind === "item") {
    return buildHash({ ...route, view: "item", arg: hit.id, params: {} });
  }
  if (hit.kind === "source") {
    return buildHash({ ...route, view: "source", arg: hit.id, params: {} });
  }
  return buildHash({ ...route, view: "questions", arg: hit.id, params: {} });
}
