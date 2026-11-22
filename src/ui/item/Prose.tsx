/* Prose from the ledger (a meaning, a precision note, an assumption) read in
 * plain words: each item the text names by identifier or id is its name, a
 * link to its page; excerpt, document and question ids are small links to
 * their own pages (docs/design-unified-ui.md: identifiers small and
 * secondary, every claim links to its canonical page). */
import type { Engine } from "../../engine/engine";
import type { LoadedVolume } from "../../ledger/load";
import { buildHash, type Route } from "../router";
import { proseParts } from "./model";

/** Where an excerpt is read: its document, scrolled to the passage, or the
 *  list of excerpts when it has no document. */
export function excerptLink(r: Route, vol: Pick<LoadedVolume, "sources">, sourceId: string): string {
  const s = vol.sources.find((x) => x.id === sourceId);
  return s?.document
    ? buildHash({ ...r, view: "law", arg: `doc/${s.document}`, params: { at: sourceId } })
    : buildHash({ ...r, view: "law", arg: `sources/${sourceId}`, params: {} });
}

export function Prose(
  { engine, vol, route: r, text, as = "span", class: klass }:
  { engine: Engine; vol: LoadedVolume; route: Route; text: string; as?: "span" | "p"; class?: string },
) {
  const parts = proseParts(engine, vol, text);
  const kids = parts.map((p, i) => {
    if (typeof p === "string") return p;
    if (p.kind === "item") {
      return <a key={i} class="itemref" href={buildHash({ ...r, view: "item", arg: p.id, params: {} })}>{p.label}</a>;
    }
    if (p.kind === "source") {
      return <a key={i} class="refid" title={p.title} href={excerptLink(r, vol, p.id)}>{p.id}</a>;
    }
    if (p.kind === "document") {
      return <a key={i} class="refid" title={p.title} href={buildHash({ ...r, view: "law", arg: `doc/${p.id}`, params: {} })}>{p.id}</a>;
    }
    return <a key={i} class="refid" title={p.title} href={buildHash({ ...r, view: "questions", arg: p.id, params: {} })}>{p.id}</a>;
  });
  return as === "p" ? <p class={klass}>{kids}</p> : <span class={klass}>{kids}</span>;
}
