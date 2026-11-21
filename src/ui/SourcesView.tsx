import { useLayoutEffect } from "preact/hooks";
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import { EXCERPT_KIND_LABEL, excerptKind, isUnverified } from "./provenance";
import { Ident } from "./Rich";
import { buildHash } from "./router";
import { engineSig, route, viewEngine, volumeSig } from "./state";

export function citingItems(engine: Engine, sourceId: string): Item[] {
  return engine.items().filter((it) => (it.sources ?? []).includes(sourceId));
}

/** The excerpts, each labelled by the kind of text it is (statute,
 *  regulation, memo, guidance, web page) and, where the excerpt could not be
 *  fetched, marked "Unverified — not a quotation". `#/<vol>/source/S-n` (or
 *  `?excerpt=S-n`) opens, marks and scrolls to one excerpt. */
export function SourcesView() {
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  const r = route.value;
  const marked = r.params.excerpt ?? r.arg ?? null;
  useLayoutEffect(() => {
    if (!marked) return;
    const el = document.getElementById(marked);
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "start" });
  }, [marked, vol?.sources.length]);
  if (!engine || !vol) return <p class="status">No ledger loaded.</p>;
  const unverified = vol.sources.filter(isUnverified).length;

  return (
    <section class="view">
      <h1>Sources</h1>
      <p class="muted">
        Excerpts of the governing text that items cite. Each is quoted word for word from
        its document, except the {unverified} marked "Unverified — not a quotation", whose
        text could not be fetched and was supplied from summaries.
      </p>
      {vol.sources.map((s) => {
        const citing = citingItems(engine, s.id);
        const kind = excerptKind(s, vol.documents);
        const label = EXCERPT_KIND_LABEL[kind];
        return (
          <article class={`source${marked === s.id ? " on" : ""}`} key={s.id} id={s.id} data-kind={kind}>
            <h3>{s.id}. {s.title}</h3>
            <p class="citation">
              <span class="tag excerpt-kind">{label}</span>{" "}
              {isUnverified(s) && (
                <><span class="flag unverified">Unverified — not a quotation</span>{" "}</>
              )}
              {s.citation}
              {s.document && (
                <>
                  {" "}
                  <a
                    class="tag doclink"
                    href={buildHash({ ...r, view: "document", arg: s.document, params: { excerpt: s.id } })}
                  >
                    {s.document}: where this sits in the document
                  </a>
                </>
              )}
            </p>
            <details open={marked === s.id}>
              <summary>{isUnverified(s) ? `${label} figures (not a quotation)` : `${label} text`}</summary>
              <pre class="statute">{s.text}</pre>
            </details>
            <p class="cited-by">
              <b>Cited by {citing.length} item{citing.length === 1 ? "" : "s"}:</b>{" "}
              {citing.map((it, i) => (
                <span key={it.id}>
                  {i > 0 && ", "}
                  <Ident id={it.identifier} label={it.name} engine={engine} />
                </span>
              ))}
            </p>
          </article>
        );
      })}
    </section>
  );
}
