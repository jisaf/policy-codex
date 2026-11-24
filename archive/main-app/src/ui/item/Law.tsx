/* "The law, word for word": each excerpt an item cites, its text visible on
 * the page with "Read it in the full document" (docs/design-unified-ui.md,
 * Item § 3), and for a figure the same excerpt beside each version with the
 * version's numbers marked (§ 4). */
import { UnverifiedBadge } from "../kit";
import { useSignal } from "@preact/signals";
import type { LoadedVolume } from "../../ledger/load";
import type { Source } from "../../ledger/markdown";
import { citeLabel } from "../inbox";
import { EXCERPT_KIND_LABEL, excerptKind, isUnverified } from "../provenance";
import type { Route } from "../router";
import type { Marked } from "./model";
import { excerptLink } from "./Prose";

/** One excerpt: what it is, where it is from, its words, and the way to the
 *  whole document. `marked` paints the numbers a figure's version states. */
export function Excerpt(
  { vol, route: r, source: s, marked, compact }:
  { vol: LoadedVolume; route: Route; source: Source; marked?: Marked | null; compact?: boolean },
) {
  const doc = s.document ? vol.documents.find((d) => d.id === s.document) : undefined;
  const kind = EXCERPT_KIND_LABEL[excerptKind(s, vol.documents)];
  return (
    <article class={`excerpt${compact ? " compact" : ""}`} data-source={s.id}>
      <header>
        <h4>{s.title}</h4>
        <p class="cite">
          <span class="tag excerpt-kind">{kind}</span>{" "}
          {citeLabel(s.citation)} <small class="refid">{s.id}</small>
          {isUnverified(s) && <>{" "}<UnverifiedBadge of="excerpt" /></>}
        </p>
      </header>
      <blockquote class="words">
        {marked
          ? marked.parts.map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : p.text))
          : s.text}
      </blockquote>
      <p class="readall">
        <a href={excerptLink(r, vol, s.id)}>
          {doc ? <>Read it in the full document: {doc.title}</> : "Read it among the sources"}
        </a>
      </p>
    </article>
  );
}

const FIRST = 4;

/** Every excerpt in `ids`, the first few at once and the rest one click
 *  away (an item can cite a dozen). */
export function LawSection(
  { vol, route: r, ids, intro }:
  { vol: LoadedVolume; route: Route; ids: string[]; intro?: string },
) {
  const all = useSignal(false);
  const sources = ids.map((id) => vol.sources.find((s) => s.id === id)).filter((s): s is Source => Boolean(s));
  const shown = all.value ? sources : sources.slice(0, FIRST);
  return (
    <section class="isec law" id="law" aria-labelledby="law-h" tabIndex={-1}>
      <h2 id="law-h">The law, word for word</h2>
      {intro && <p class="muted small">{intro}</p>}
      {sources.length === 0 && <p class="muted">No excerpt cited.</p>}
      {shown.map((s) => <Excerpt key={s.id} vol={vol} route={r} source={s} />)}
      {sources.length > FIRST && (
        <button type="button" class="btn" aria-expanded={all.value} onClick={() => { all.value = !all.value; }}>
          {all.value ? "Show fewer excerpts" : `Show ${sources.length - FIRST} more excerpt${sources.length - FIRST === 1 ? "" : "s"}`}
        </button>
      )}
    </section>
  );
}
