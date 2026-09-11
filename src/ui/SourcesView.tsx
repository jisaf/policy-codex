import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import { buildHash } from "./router";
import { engineSig, route, viewEngine, volumeSig } from "./state";

export function citingItems(engine: Engine, sourceId: string): Item[] {
  return engine.items().filter((it) => (it.sources ?? []).includes(sourceId));
}

export function SourcesView() {
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  const r = route.value;
  if (!engine || !vol) return <p class="status">No ledger loaded.</p>;

  return (
    <section class="view">
      <h1>Sources</h1>
      <p class="muted">
        Verbatim excerpts of the governing text. Nothing here is interpretation.
      </p>
      {vol.sources.map((s) => {
        const citing = citingItems(engine, s.id);
        return (
          <article class="source" key={s.id} id={s.id}>
            <h3>{s.id}. {s.title}</h3>
            <p class="citation">{s.citation}</p>
            <details open={r.arg === s.id}>
              <summary>Statute text</summary>
              <pre class="statute">{s.text}</pre>
            </details>
            <p class="cited-by">
              <b>Cited by {citing.length} item{citing.length === 1 ? "" : "s"}:</b>{" "}
              {citing.map((it, i) => (
                <span key={it.id}>
                  {i > 0 && ", "}
                  <a href={buildHash({ ...r, view: "item", arg: it.id, params: {} })}>
                    {it.name}
                  </a>
                </span>
              ))}
            </p>
          </article>
        );
      })}
    </section>
  );
}
