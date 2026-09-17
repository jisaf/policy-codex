import type { Engine } from "../engine/engine";
import { tagAncestors, tagLabel } from "../engine/tags";
import type { LoadedVolume } from "../ledger/load";
import { buildHash, type Route } from "./router";

export type HitKind = "item" | "source" | "question";

export interface SearchEntry {
  kind: HitKind;
  id: string;
  title: string;
  subtitle: string;
  haystack: string;
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

export function buildSearchIndex(vol: LoadedVolume, engine: Engine): SearchIndex {
  const entries: SearchEntry[] = [];
  for (const it of vol.items) {
    entries.push({
      kind: "item",
      id: it.id,
      title: it.name,
      subtitle: `${it.id} · ${it.identifier} · ${it.kind} · ${it.type} · ${it.scope} · ${it.program}`,
      haystack: [
        it.id, it.name, it.identifier, it.meaning ?? "", it.precision ?? "",
        tagText(vol, it), derivationText(engine, it.identifier),
      ].join(" ").toLowerCase(),
    });
  }
  for (const s of vol.sources) {
    entries.push({
      kind: "source", id: s.id, title: `${s.id}. ${s.title}`, subtitle: s.citation,
      haystack: [s.id, s.title, s.citation, s.text].join(" ").toLowerCase(),
    });
  }
  for (const q of vol.openQuestions) {
    entries.push({
      kind: "question", id: q.id, title: `${q.id} ${q.title}`,
      subtitle: q.items.join(", "),
      haystack: [q.id, q.title, q.body].join(" ").toLowerCase(),
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

export function search(index: SearchIndex, q: string, limit = 30): SearchHit[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];
  for (const e of index.entries) {
    const at = e.haystack.indexOf(needle);
    if (at < 0) continue;
    const exactId = e.id.toLowerCase() === needle;
    const titleHit = e.title.toLowerCase().includes(needle);
    const score = (exactId ? 1000 : 0) + (titleHit ? 100 : 0) + Math.max(0, 50 - at);
    hits.push({ ...e, score, snippet: snippetAround(e.haystack, needle) });
  }
  hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return hits.slice(0, limit);
}

export function groupHits(hits: readonly SearchHit[]): Record<HitKind, SearchHit[]> {
  const out: Record<HitKind, SearchHit[]> = { item: [], source: [], question: [] };
  for (const h of hits) out[h.kind].push(h);
  return out;
}

/** Where a hit goes when it is opened. Open questions are badges on items,
 *  not a page, so a question hit opens the table filtered to its items. */
export function hitHash(hit: SearchHit, route: Route): string {
  if (hit.kind === "item") {
    return buildHash({ ...route, view: "item", arg: hit.id, params: {} });
  }
  if (hit.kind === "source") {
    return buildHash({ ...route, view: "source", arg: hit.id, params: {} });
  }
  return buildHash({ ...route, view: "table", arg: null, params: { open: hit.id } });
}
