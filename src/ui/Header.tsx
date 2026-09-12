import { useSignal } from "@preact/signals";
import { programOutcomes } from "./CasesView";
import { buildHash, type ViewName } from "./router";
import { groupHits, hitHash, search } from "./search";
import {
  changeSetSig, editingSig, engineSig, openEditor, route, searchIndexSig, settingsOpenSig,
  trayOpenSig, viewEngine, volumeSig,
} from "./state";

const NAV: Array<{ view: ViewName; label: string }> = [
  { view: "table", label: "Table" },
  { view: "graph", label: "Graph" },
  { view: "cases", label: "Cases" },
  { view: "source", label: "Sources" },
  { view: "documents", label: "Documents" },
  { view: "search", label: "Search" },
];

const KIND_LABEL = { item: "Items", source: "Sources", question: "Open questions" } as const;

export function Header() {
  const q = useSignal("");
  const r = route.value;
  const index = searchIndexSig.value;
  const hits = index ? search(index, q.value, 12) : [];
  const grouped = groupHits(hits);
  const engine = viewEngine() ?? engineSig.value;
  // The nav opens the first declared program; the program page itself has
  // the switcher across every program.
  const firstProgram = (engine ? programOutcomes(engine) : [])[0]?.id ?? null;

  const open = (hash: string) => {
    q.value = "";
    location.hash = hash;
  };

  return (
    <header class="topbar">
      <a class="brand" href={buildHash({ ...r, view: "table", arg: null, params: {} })}>
        Benefits Codex
      </a>
      <span class="volume">{volumeSig.value?.title ?? r.volume}</span>
      {r.ref && <span class="tag ref">{r.ref}</span>}
      <nav>
        {NAV.slice(0, 3).map((n) => (
          <a
            key={n.view}
            class={r.view === n.view ? "on" : ""}
            href={buildHash({ ...r, view: n.view, arg: null, params: {} })}
          >
            {n.label}
          </a>
        ))}
        <a
          class={r.view === "program" ? "on" : ""}
          href={buildHash({ ...r, view: "program", arg: firstProgram, params: {} })}
        >
          Programs
        </a>
        {NAV.slice(3).map((n) => (
          <a
            key={n.view}
            class={r.view === n.view ? "on" : ""}
            href={buildHash({ ...r, view: n.view, arg: null, params: {} })}
          >
            {n.label}
          </a>
        ))}
      </nav>
      <div class="searchbox">
        <input
          type="search"
          placeholder="Search items, sources, questions"
          value={q.value}
          onInput={(e) => { q.value = (e.target as HTMLInputElement).value; }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits.length) open(hitHash(hits[0], r));
            if (e.key === "Escape") q.value = "";
          }}
        />
        {hits.length > 0 && (
          <div class="results">
            {(["item", "source", "question"] as const).map((kind) =>
              grouped[kind].length ? (
                <div key={kind} class="group">
                  <h4>{KIND_LABEL[kind]}</h4>
                  {grouped[kind].map((h) => (
                    <a key={h.id} href={hitHash(h, r)} onClick={() => { q.value = ""; }}>
                      <strong>{h.title}</strong>
                      <small>{h.subtitle}</small>
                    </a>
                  ))}
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>
      <button class="btn" onClick={() => openEditor(null)}>New item</button>
      <button class="btn" onClick={() => { editingSig.value = null; trayOpenSig.value = true; }}>
        Tray ({changeSetSig.value.entries.length})
      </button>
      <button class="btn" onClick={() => { settingsOpenSig.value = true; }}>
        Settings
      </button>
    </header>
  );
}
