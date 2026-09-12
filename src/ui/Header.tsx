import { useSignal } from "@preact/signals";
import { programOutcomes } from "./CasesView";
import { buildHash, type ViewName } from "./router";
import { groupHits, hitHash, search } from "./search";
import {
  changeSetSig, editingSig, engineSig, openEditor, route, searchIndexSig, settingsOpenSig,
  trayOpenSig, viewEngine, volumeSig,
} from "./state";

interface NavItem {
  view: ViewName;
  label: string;
  /** "program" is the one entry whose link target isn't just its own view:
   *  it opens the first declared program, computed from the engine at
   *  render time. Given the render-time `firstProgram`, this returns the
   *  route `arg` to use; every other entry falls back to `null`. Declaring
   *  it here keeps the nav's order as one array stewards can read top to
   *  bottom, instead of two `NAV.slice()` calls with the "Programs" link
   *  spliced in by hand between them. */
  arg?: (firstProgram: string | null) => string | null;
}

const NAV: NavItem[] = [
  { view: "table", label: "Table" },
  { view: "graph", label: "Graph" },
  { view: "cases", label: "Cases" },
  { view: "program", label: "Programs", arg: (firstProgram) => firstProgram },
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
        {NAV.map((n) => (
          <a
            key={n.view}
            class={r.view === n.view ? "on" : ""}
            href={buildHash({ ...r, view: n.view, arg: n.arg ? n.arg(firstProgram) : null, params: {} })}
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
