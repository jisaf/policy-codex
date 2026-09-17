import { useSignal } from "@preact/signals";
import { programOutcomes } from "./CasesView";
import { toggleHelp } from "./Help";
import { buildHash, VIEWS, type ViewName } from "./router";
import { groupHits, hitHash, search } from "./search";
import {
  changeSetSig, doorSig, editingSig, engineSig, modeSig, openEditor, route, searchIndexSig,
  setMode, settingsOpenSig, trayOpenSig, viewEngine, volumeSig,
} from "./state";

interface NavItem {
  view: ViewName;
  label: string;
  /** "program" is the one entry whose link target isn't just its own view:
   *  it opens the first declared program, computed from the engine at
   *  render time. Given the render-time `firstProgram`, this returns the
   *  route `arg` to use; every other entry falls back to `null`. */
  arg?: (firstProgram: string | null) => string | null;
}

// Primary: the home view (Programs) plus the two other everyday
// destinations. The engineer door adds Handoff (see the
// `VIEWS.includes("handoff")` check below); everything else a reader used
// before phase 3 moved under the Browse dropdown.
const PRIMARY: NavItem[] = [
  { view: "program", label: "Programs", arg: (firstProgram) => firstProgram },
  { view: "cases", label: "Cases" },
  { view: "search", label: "Search" },
];

const BROWSE: NavItem[] = [
  { view: "table", label: "Table" },
  { view: "graph", label: "Graph" },
  { view: "source", label: "Sources" },
  { view: "documents", label: "Documents" },
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

  const primary = [...PRIMARY];
  if (doorSig.value === "engineer" && VIEWS.includes("handoff")) {
    primary.push({ view: "handoff", label: "Handoff" });
  }

  const open = (hash: string) => {
    q.value = "";
    location.hash = hash;
  };

  const startHref = buildHash({ ...r, view: "start", arg: null, params: {} });

  return (
    <>
      <header class="topbar">
        <a class="brand" href={startHref}>Benefits Codex</a>
        <span class="volume">{volumeSig.value?.title ?? r.volume}</span>
        {r.ref && <span class="tag ref">{r.ref}</span>}
        {r.view !== "start" && (
          <nav class="primary">
            {primary.map((n) => (
              <a
                key={n.view}
                class={r.view === n.view ? "on" : ""}
                href={buildHash({ ...r, view: n.view, arg: n.arg ? n.arg(firstProgram) : null, params: {} })}
              >
                {n.label}
              </a>
            ))}
          </nav>
        )}
        <details class="browse">
          <summary>Browse</summary>
          <nav class="dropdown">
            {BROWSE.map((n) => (
              <a
                key={n.view}
                class={r.view === n.view ? "on" : ""}
                href={buildHash({ ...r, view: n.view, arg: null, params: {} })}
              >
                {n.label}
              </a>
            ))}
          </nav>
        </details>
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
        {modeSig.value === "edit" && (
          <>
            <button class="btn" onClick={() => openEditor(null)}>New item</button>
            <button class="btn" onClick={() => { editingSig.value = null; trayOpenSig.value = true; }}>
              Tray ({changeSetSig.value.entries.length})
            </button>
            <button class="btn" onClick={() => { settingsOpenSig.value = true; }}>
              Settings
            </button>
          </>
        )}
        {r.view !== "start" && (
          <button
            class="btn modebtn mode-toggle"
            onClick={() => { setMode(modeSig.value === "edit" ? "read" : "edit"); }}
          >
            {modeSig.value === "edit" ? "Turn off edit mode" : "Turn on edit mode"}
          </button>
        )}
        <button class="btn help-toggle" title="Help" onClick={toggleHelp}>?</button>
      </header>
      <div class="hdrfoot">
        <a class="linkish" href={startHref}>change how you use this</a>
      </div>
    </>
  );
}
