import { groupHits, hitHash, search } from "./search";
import { route, searchIndexSig } from "./state";

const KIND_LABEL = { item: "Items", source: "Sources", question: "Open questions" } as const;

export function SearchView() {
  const r = route.value;
  const q = r.params.q ?? "";
  const index = searchIndexSig.value;
  if (!index) return <p class="status">No ledger loaded.</p>;
  const hits = search(index, q, 200);
  if (!q.trim()) return <p class="muted">Type a query in the header search box.</p>;
  if (!hits.length) return <p class="muted">Nothing matches "{q}".</p>;
  const grouped = groupHits(hits);

  return (
    <section class="view">
      <h1>{hits.length} result{hits.length === 1 ? "" : "s"} for "{q}"</h1>
      {(["item", "source", "question"] as const).map((kind) =>
        grouped[kind].length ? (
          <div key={kind} class="group">
            <h3>{KIND_LABEL[kind]} ({grouped[kind].length})</h3>
            <ul class="hits">
              {grouped[kind].map((h) => (
                <li key={h.id}>
                  <a href={hitHash(h, r)}><b>{h.title}</b></a>
                  <small>{h.subtitle}</small>
                  {h.snippet && <p class="snippet">{h.snippet}</p>}
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </section>
  );
}
