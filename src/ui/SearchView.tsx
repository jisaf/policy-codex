import { Ident } from "./Rich";
import { groupHits, hitHash, search, type SearchHit } from "./search";
import { route, searchIndexSig } from "./state";

const KIND_LABEL = { item: "Items", source: "Sources", question: "Open questions" } as const;

/** An item's subtitle reads "<id> · <identifier> · <kind> · …", so the
 *  identifier in it becomes a token while the rest stays the plain summary
 *  it always was. */
function Subtitle({ hit }: { hit: SearchHit }) {
  const parts = hit.subtitle.split(" · ");
  if (hit.kind !== "item" || parts.length < 2) return <small>{hit.subtitle}</small>;
  const rest = parts.slice(2);
  return (
    <small>
      {parts[0]}{" · "}<Ident id={parts[1]} />
      {rest.length ? ` · ${rest.join(" · ")}` : ""}
    </small>
  );
}

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
                  <Subtitle hit={h} />
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
