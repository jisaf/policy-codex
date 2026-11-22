/* The top bar (docs/design-unified-ui.md): the menu button on a phone, the
 * search box, the proposal pill, the edit-mode switch and help, and below it
 * the breadcrumb trail. The places themselves are in the sidebar
 * (Sidebar.tsx); the volume and ledger selectors sit at its foot. */
import { useSignal } from "@preact/signals";
import { DEFAULT_BRANCH } from "../config";
import { fileEntries } from "../changes/types";
import { refLabel } from "../ledger/mode";
import { LOCAL_REF } from "../ledger/source";
import { toggleHelp } from "./Help";
import { personaById, personaSig } from "./personas";
import { buildHash, canonicalRoute, isPrRef } from "./router";
import { groupResults, hitHash, RESULT_GROUP_LABEL, RESULT_GROUPS, search, searchHash } from "./search";
import { crumbsFor, navOpenSig } from "./shell";
import {
  baseRefOf, changeSetSig, defaultRefSig, editingSig, engineSig, localInfoSig, manifestSig, modeSig, navigate,
  openEditor, route, searchIndexSig, setMode, settingsOpenSig, viewEngine, volumeSig,
} from "./state";

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
  // A static preview build reads its bundled snapshot only: no GitHub.
  if (!local?.bundled) choices.push(DEFAULT_BRANCH);
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
          class="ref-input" placeholder="branch name" aria-label="Branch name" autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") go((e.target as HTMLInputElement).value);
            if (e.key === "Escape") other.value = false;
          }}
        />
      ) : (
        <select
          class="ref-select" title="Which copy of the ledger to read" aria-label="Which copy of the rules to read"
          value={current}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            if (v === "__other") other.value = true;
            else go(v);
          }}
        >
          {choices.map((c) => <option key={c} value={c}>{refLabel(c, local)}</option>)}
          {!local?.bundled && <option value="__other">Another branch…</option>}
        </select>
      )}
    </span>
  );
}

/** The volume this ledger shows: a selector when the manifest lists more
 *  than one, else its title. Switching opens the volume's Desk. */
export function VolumeSelect() {
  const r = route.value;
  const manifest = manifestSig.value;
  if (!manifest || manifest.volumes.length < 2) {
    return <span class="volume">{volumeSig.value?.title ?? r.volume}</span>;
  }
  return (
    <select
      class="volume-select" aria-label="Which volume to read" value={r.volume}
      onChange={(e) => {
        const volume = (e.target as HTMLSelectElement).value;
        navigate({ volume, view: "desk", arg: null, params: {} });
      }}
    >
      {manifest.volumes.map((v) => (
        <option key={v.id} value={v.id}>
          {v.title}{v.status === "draft" ? " (draft)" : ""}
        </option>
      ))}
    </select>
  );
}

/** How many changes the reader's proposal holds: every staged entry and
 *  staged file (a signature and a review note included). */
export function proposalCount(): number {
  const cs = changeSetSig.value;
  return cs.entries.length + fileEntries(cs).length;
}

/** The proposal pill: always in the top bar, linking to Changes > My
 *  proposal (Blind B's pattern). */
export function ProposalPill() {
  const r = route.value;
  const n = proposalCount();
  return (
    <a
      class={`proposal-pill${n ? " has" : ""}`}
      href={buildHash({ ...r, view: "changes", arg: "proposal", params: {} })}
      title={n ? "What your proposal holds, its effect and who must approve it" : "You have staged no change"}
    >
      {n ? <>Your proposal <b>{n}</b></> : "No proposal"}
    </a>
  );
}

/** The header search: suggestions as you type, grouped by type; Enter opens
 *  the results page and never jumps to the first suggestion (Enter opened
 *  "AND-SO grant standard" for a Colorado Works query). */
export function SearchBox() {
  const r = route.value;
  const q = useSignal(r.view === "search" ? r.params.q ?? "" : "");
  const open = useSignal(false);
  const index = searchIndexSig.value;
  const programs = personaById(personaSig.value)?.programs;
  const hits = index && open.value ? search(index, q.value, 10, { programs }) : [];
  const grouped = groupResults(hits);
  return (
    <form
      class="searchbox" role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.value.trim()) return;
        open.value = false;
        location.hash = searchHash(r, q.value);
      }}
    >
      <input
        type="search" name="q" aria-label="Search the rules"
        placeholder="Search rules, figures, questions, households"
        value={q.value}
        onInput={(e) => { q.value = (e.target as HTMLInputElement).value; open.value = true; }}
        onFocus={() => { open.value = true; }}
        onBlur={() => { setTimeout(() => { open.value = false; }, 150); }}
        onKeyDown={(e) => { if (e.key === "Escape") { q.value = ""; open.value = false; } }}
      />
      {hits.length > 0 && (
        <div class="results" role="listbox" aria-label="Suggestions">
          {RESULT_GROUPS.map((g) =>
            grouped[g].length ? (
              <div key={g} class="group">
                <h4>{RESULT_GROUP_LABEL[g]}</h4>
                {grouped[g].map((h) => (
                  <a key={`${h.kind}-${h.id}`} href={hitHash(h, r)} onClick={() => { open.value = false; }}>
                    <strong>{h.title}</strong>
                    <small>{h.subtitle}</small>
                  </a>
                ))}
              </div>
            ) : null,
          )}
          <a class="allresults" href={searchHash(r, q.value)} onClick={() => { open.value = false; }}>
            All results for "{q.value.trim()}" (Enter)
          </a>
        </div>
      )}
    </form>
  );
}

/** The breadcrumb trail. It reads the same `placeOf` the sidebar
 *  highlights, so the two never disagree. */
export function Breadcrumbs() {
  const c = canonicalRoute(route.value);
  const vol = volumeSig.value;
  const crumbs = crumbsFor(c, { engine: viewEngine() ?? engineSig.value, cases: vol?.cases, documents: vol?.documents });
  if (!crumbs.length) return null;
  return (
    <nav class="crumbs" aria-label="You are here">
      <ol>
        {crumbs.map((cr, i) => (
          <li key={i}>
            {cr.href ? <a href={cr.href}>{cr.label}</a> : <span aria-current="page">{cr.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Header() {
  return (
    <>
      <header class="topbar">
        <button
          class="btn navtoggle" aria-controls="sidebar" aria-expanded={navOpenSig.value}
          onClick={() => { navOpenSig.value = !navOpenSig.value; }}
        >Menu</button>
        <SearchBox />
        <ProposalPill />
        {modeSig.value === "edit" && (
          <>
            <button class="btn" onClick={() => openEditor(null)}>New item</button>
            <button class="btn" onClick={() => { editingSig.value = null; settingsOpenSig.value = true; }}>
              Settings
            </button>
          </>
        )}
        <button
          class="btn modebtn mode-toggle"
          onClick={() => { setMode(modeSig.value === "edit" ? "read" : "edit"); }}
        >
          {modeSig.value === "edit" ? "Turn off edit mode" : "Turn on edit mode"}
        </button>
        <button class="btn help-toggle" title="Help" aria-label="Help for this page" onClick={toggleHelp}>?</button>
      </header>
      <Breadcrumbs />
    </>
  );
}
