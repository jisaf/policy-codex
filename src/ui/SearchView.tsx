/* The search results page (`#/<volume>/search?q=`): every hit, grouped by
 * type (rules, figures, facts, open questions, households, documents and
 * excerpts, settled questions). A query matches when every word of it is
 * found, in any order; the header's Enter always lands here, never on the
 * first hit. */
import { useSignal } from "@preact/signals";
import { personaById } from "./personas";
import { Ident } from "./Rich";
import { programLabel } from "./roles";
import { groupResults, hitHash, RESULT_GROUP_LABEL, RESULT_GROUPS, search, searchHash, type SearchHit } from "./search";
import { activePersonaId } from "./Sidebar";
import { route, searchIndexSig } from "./state";

/** An item's subtitle reads "<id> · <identifier> · <kind> · …": the id and
 *  the identifier stay small, the rest is dropped (plain words first). */
function Subtitle({ hit }: { hit: SearchHit }) {
  const parts = hit.subtitle.split(" · ");
  if (hit.kind !== "item" || parts.length < 2) return <small class="muted">{hit.subtitle}</small>;
  const program = parts[parts.length - 1];
  return (
    <small class="muted">
      {program !== "All" ? `${programLabel(program)} · ` : ""}{parts[0]} · <Ident id={parts[1]} />
    </small>
  );
}

export function SearchView() {
  const r = route.value;
  const q = r.params.q ?? "";
  const draft = useSignal(q);
  const index = searchIndexSig.value;
  if (!index) return <p class="status">No ledger loaded.</p>;
  // The reader's own programs rank first (HCPF analyst: "countable income"
  // went to Colorado Works).
  const hits = search(index, q, 300, { programs: personaById(activePersonaId())?.programs });
  const grouped = groupResults(hits);
  const shown = RESULT_GROUPS.filter((g) => grouped[g].length);
  return (
    <section class="view searchpage">
      <h1>{q.trim() ? <>{hits.length} result{hits.length === 1 ? "" : "s"} for "{q}"</> : "Search"}</h1>
      <form
        class="controls" role="search"
        onSubmit={(e) => { e.preventDefault(); if (draft.value.trim()) location.hash = searchHash(r, draft.value); }}
      >
        <input
          type="search" aria-label="Search again" value={draft.value} placeholder="Words to find"
          onInput={(e) => { draft.value = (e.target as HTMLInputElement).value; }}
        />
        <button class="btn" type="submit">Search</button>
      </form>
      {q.trim() && !hits.length && <p class="muted">Nothing has every word of "{q}". Try fewer words.</p>}
      {shown.length > 1 && (
        <nav class="tabs resultjump" aria-label="Result types">
          {shown.map((g) => (
            <button key={g} type="button" onClick={() => document.getElementById(`search-${g}`)?.scrollIntoView?.()}>
              {RESULT_GROUP_LABEL[g]} ({grouped[g].length})
            </button>
          ))}
        </nav>
      )}
      {shown.map((g) => (
        <section key={g} id={`search-${g}`} class="group" data-group={g}>
          <h2>{RESULT_GROUP_LABEL[g]} <span class="muted">({grouped[g].length})</span></h2>
          <ul class="hits">
            {grouped[g].map((h) => (
              <li key={`${h.kind}-${h.id}`}>
                <a href={hitHash(h, r)}><b>{h.title}</b></a>{" "}
                <Subtitle hit={h} />
                {h.snippet && <p class="snippet">{h.snippet}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
