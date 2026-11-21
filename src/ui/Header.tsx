import { useSignal } from "@preact/signals";
import { DEFAULT_BRANCH } from "../config";
import { refLabel } from "../ledger/mode";
import { LOCAL_REF } from "../ledger/source";
import { WORKFLOW_VIEWS } from "./views/registry";
import { programOutcomes } from "./CasesView";
import { toggleHelp } from "./Help";
import { buildHash, VIEWS, type ViewName } from "./router";
import { groupHits, hitHash, search } from "./search";
import {
  baseRefOf, changeSetSig, defaultRefSig, doorSig, editingSig, engineSig, localInfoSig,
  manifestSig, modeSig, navigate, openEditor, route, searchIndexSig, setMode, settingsOpenSig,
  trayOpenSig, viewEngine, volumeSig,
} from "./state";
import { isPrRef } from "./router";

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

/** Which ledger the app reads: the working tree a dev or preview server
 *  serves (when it does), main, the current branch, or any other branch
 *  typed in. A choice equal to the default ref clears `@ref` from the
 *  address, so links stay short. */
export function RefSelect() {
  const r = route.value;
  const other = useSignal(false);
  const local = localInfoSig.value;
  const current = baseRefOf(r);
  const choices: string[] = [];
  if (local) choices.push(LOCAL_REF);
  choices.push(DEFAULT_BRANCH);
  if (!choices.includes(current) && !isPrRef(r.ref)) choices.push(current);
  const go = (ref: string) => {
    other.value = false;
    const clean = ref.trim();
    if (!clean) return;
    navigate({ ref: clean === defaultRefSig.value ? null : clean });
  };
  if (isPrRef(r.ref)) return <span class="tag ref">{r.ref}</span>;
  return (
    <span class="refselect">
      {other.value ? (
        <input
          class="ref-input" placeholder="branch name" autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") go((e.target as HTMLInputElement).value);
            if (e.key === "Escape") other.value = false;
          }}
        />
      ) : (
        <select
          class="ref-select" title="Which copy of the ledger to read" value={current}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            if (v === "__other") other.value = true;
            else go(v);
          }}
        >
          {choices.map((c) => <option key={c} value={c}>{refLabel(c, local)}</option>)}
          <option value="__other">Another branch…</option>
        </select>
      )}
    </span>
  );
}

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
        {manifestSig.value && manifestSig.value.volumes.length > 1 ? (
          <select
            class="volume-select"
            value={r.volume}
            onChange={(e) => {
              const volume = (e.target as HTMLSelectElement).value;
              navigate({ volume, view: "program", arg: null, params: {} });
            }}
          >
            {manifestSig.value.volumes.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}{v.status === "draft" ? " (draft)" : ""}
              </option>
            ))}
          </select>
        ) : (
          <span class="volume">{volumeSig.value?.title ?? r.volume}</span>
        )}
        <RefSelect />
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
        {r.view !== "start" && (
          <nav class="workflows" aria-label="Workflows">
            {WORKFLOW_VIEWS.map((w) => (
              <a
                key={w.view} data-view={w.view} class={r.view === w.view ? "on" : ""}
                href={buildHash({ ...r, view: w.view, arg: null, params: {} })}
              >{w.label}</a>
            ))}
          </nav>
        )}
        <span class="spacer" />
        <a class="linkish" href={startHref}>change how you use this</a>
      </div>
    </>
  );
}
