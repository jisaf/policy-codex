import { computed, signal, type Signal } from "@preact/signals";
import { DEFAULT_BRANCH, DEFAULT_VOLUME, REPO } from "../config";
import { createEngine, type Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import { createCredentials, type Credentials } from "../credentials";
import { createGitHubClient, type GitHubClient, type PullRequest } from "../github/client";
import { idbCache } from "../ledger/cache";
import { loadManifest, loadVolume, type LoadedVolume } from "../ledger/load";
import type { Manifest } from "../ledger/manifest";
import { sourceTextMap, sourceTitleMap, unverifiedSourceIds } from "../ledger/markdown";
import { defaultRef, preferredVolume, PREFERRED_VOLUME, refLabel } from "../ledger/mode";
import {
  BUNDLED, isLocalRef, pickSource, probeBundled, probeLocal, type LedgerSource, type LocalInfo,
} from "../ledger/source";
import { applyChangeSet } from "../changes/apply";
import {
  clearEntries, discardEntry, discardFileEntry, loadChangeSet, putEntry, putFileEntry,
  saveChangeSet,
} from "../changes/store";
import type { ChangeEntry, ChangeSet, FileEntry } from "../changes/types";
import { emptyChangeSet } from "../changes/types";
import { validateChangeSet, type ChangeSetReport } from "../changes/validate";
import { buildSearchIndex, type SearchIndex } from "./search";
import {
  buildHash, canonicalRoute, defaultRoute, internalRoute, parseHash, prNumberOf, sameRoute, type Route,
} from "./router";

export interface EditingState {
  /** Null for a new item. */
  id: string | null;
  chapter: string;
  draft: Item;
  surface: "form" | "text" | "ai";
  /** A new item starts on "start", a search of the ledger, so a steward looks
   *  before adding, then "kind", the wizard's "what are you adding?" choice.
   *  An existing item opens straight into "edit". */
  step: "start" | "kind" | "edit";
  /** Preselects the AI panel's context selector when the editor was opened
   *  from a source or a document rather than from the ledger search. */
  context?: { kind: "source" | "document"; id: string };
}

export const WORKER_BASE_KEY = "codex.worker";

export const route: Signal<Route> = signal(defaultRoute());
export const manifestSig: Signal<Manifest | null> = signal(null);
export const volumeSig: Signal<LoadedVolume | null> = signal(null);
export const engineSig: Signal<Engine | null> = signal(null);
export const changeSetSig: Signal<ChangeSet> = signal(
  emptyChangeSet(DEFAULT_VOLUME, DEFAULT_BRANCH),
);
export const reportSig: Signal<ChangeSetReport | null> = signal(null);
export const statusSig: Signal<{ kind: "idle" | "loading" | "error"; message: string }> =
  signal({ kind: "idle", message: "" });
export const editingSig: Signal<EditingState | null> = signal(null);
export const trayOpenSig: Signal<boolean> = signal(false);
export const settingsOpenSig: Signal<boolean> = signal(false);
export const searchIndexSig: Signal<SearchIndex | null> = signal(null);
export const pullRequestSig: Signal<PullRequest | null> = signal(null);
export const prBaseVolumeSig: Signal<LoadedVolume | null> = signal(null);
export const prBaseEngineSig: Signal<Engine | null> = signal(null);
export const workerBaseSig: Signal<string> = signal(
  (() => {
    try {
      // `import.meta.env` is not in this tsconfig's lib (no "vite/client" types),
      // so read it through a cast; Vite still inlines the value at build time.
      const env = (import.meta as { env?: Record<string, string | undefined> }).env;
      return localStorage.getItem(WORKER_BASE_KEY) ?? env?.VITE_WORKER_BASE ?? "";
    } catch {
      return "";
    }
  })(),
);

/** What the dev or preview server says about the working tree it serves, or
 *  null when the app is not served by one (src/ledger/source.ts). */
export const localInfoSig: Signal<LocalInfo | null> = signal(null);
/** The ref a route without `@ref` reads (src/ledger/mode.ts `defaultRef`):
 *  `?ref=` in the query string, else the working tree when served, else main.
 *  Set once by `startRouter`. */
export const defaultRefSig: Signal<string> = signal(DEFAULT_BRANCH);

export const VOLUME_KEY = "codex.volume";

/** The volume this browser last opened, or null. */
export function lastVolume(): string | null {
  try { return localStorage.getItem(VOLUME_KEY); } catch { return null; }
}

function rememberVolume(id: string): void {
  try { localStorage.setItem(VOLUME_KEY, id); } catch { /* blocked */ }
}

export const MODE_KEY = "codex.mode";
export const DOOR_KEY = "codex.door";

export type Door = "admin" | "reader" | "sme" | "engineer";

function readMode(): "read" | "edit" {
  try {
    return localStorage.getItem(MODE_KEY) === "edit" ? "edit" : "read";
  } catch {
    return "read";
  }
}

function readDoor(): Door | null {
  try {
    const v = localStorage.getItem(DOOR_KEY);
    return v === "admin" || v === "reader" || v === "sme" || v === "engineer" ? v : null;
  } catch {
    return null;
  }
}

/** Reader mode is the default: New item, Tray, Rename, Settings, and the
 *  editor stay hidden until a visitor turns edit mode on (or the sme door
 *  turns it on for them). The choice persists across visits. */
export const modeSig: Signal<"read" | "edit"> = signal(readMode());
/** Which of the four doors (see docs/design-onboarding.md) a visitor chose,
 *  or null before they have chosen one. Persists so a returning visit skips
 *  the picker (see `resolveEmptyHash`). */
export const doorSig: Signal<Door | null> = signal(readDoor());

export function setMode(mode: "read" | "edit"): void {
  modeSig.value = mode;
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* blocked */ }
}

export function setDoor(door: Door | null): void {
  doorSig.value = door;
  try {
    if (door === null) localStorage.removeItem(DOOR_KEY);
    else localStorage.setItem(DOOR_KEY, door);
  } catch { /* blocked */ }
}

/** The route an empty hash (a first visit, or the bare app URL) resolves to:
 *  the Desk of the volume last opened. A visitor who has not chosen a role
 *  yet picks one there (docs/design-unified-ui.md: the start doors fold into
 *  the Desk). */
export function resolveEmptyHash(): Route {
  return { ...defaultRoute(), volume: lastVolume() ?? PREFERRED_VOLUME, view: "desk" };
}

export const credentials: Credentials = createCredentials();

export function githubClient(): GitHubClient {
  return createGitHubClient(REPO, credentials.get("github"));
}

/** A reader for the ref the current route shows, so a view can fetch a file
 *  the volume load deliberately left behind (a document's text). */
export function ledgerSource(): LedgerSource {
  const r = route.value;
  const pr = pullRequestSig.value;
  const ref = prNumberOf(r.ref) !== null && pr ? pr.headRef : baseRefOf(r);
  return pickSource(REPO, ref, credentials.get("github"));
}

/** The git ref a route reads from, before a pull request is resolved. */
export function baseRefOf(r: Route): string {
  return r.ref ?? defaultRefSig.value;
}

/** Whether the tray's staged drafts are applied to what the views show.
 *  Null follows the mode: shown while editing, hidden while reading, so a
 *  reader sharing a browser never takes a draft for the rule in force (CDHS
 *  cash lead, F3). The draft banner sets it either way. */
export const draftsShownSig: Signal<boolean | null> = signal(null);

export function draftsShown(): boolean {
  return draftsShownSig.value ?? modeSig.value === "edit";
}

/** The engine every view renders: the base ledger with the tray applied.
 *  Memoised so a render pass reuses one Engine instance and the per-engine
 *  caches downstream (validation, constraints) actually hit. */
const draftEngineSig = computed<Engine | null>(() => {
  const base = engineSig.value;
  if (!base) return null;
  const cs = changeSetSig.value;
  if (!cs.entries.length) return base;
  return base.withItems(applyChangeSet(base.items(), cs));
});

const viewEngineSig = computed<Engine | null>(() =>
  draftsShown() ? draftEngineSig.value : engineSig.value);

/** What the pages show: the drafts applied only while `draftsShown()`. */
export function viewEngine(): Engine | null {
  return viewEngineSig.value;
}

/** The ledger with the tray applied, whatever the pages show: the editor
 *  always builds on the drafts it staged. */
export function draftEngine(): Engine | null {
  return draftEngineSig.value;
}

function recomputeReport(): void {
  const base = engineSig.value;
  reportSig.value = base ? validateChangeSet(base, changeSetSig.value) : null;
}

export function putChangeEntry(entry: ChangeEntry): void {
  const cs = putEntry(changeSetSig.value, entry);
  changeSetSig.value = cs;
  saveChangeSet(cs);
  recomputeReport();
}

/** Several entries in one write and one validation, for an action that
 *  stages a chapter at once (the approvals inbox's bulk sign-off).
 *  `discard` drops entries by id first. */
export function putChangeEntries(entries: readonly ChangeEntry[], discard: readonly string[] = []): void {
  let cs = changeSetSig.value;
  for (const id of discard) cs = discardEntry(cs, id);
  for (const e of entries) cs = putEntry(cs, e);
  changeSetSig.value = cs;
  saveChangeSet(cs);
  recomputeReport();
}

export function discardChangeEntry(id: string): void {
  const cs = discardEntry(changeSetSig.value, id);
  changeSetSig.value = cs;
  saveChangeSet(cs);
  recomputeReport();
}

export function putFileChange(entry: FileEntry): void {
  const cs = putFileEntry(changeSetSig.value, entry);
  changeSetSig.value = cs;
  saveChangeSet(cs);
  recomputeReport();
}

export function discardFileChange(path: string): void {
  const cs = discardFileEntry(changeSetSig.value, path);
  changeSetSig.value = cs;
  saveChangeSet(cs);
  recomputeReport();
}

export function clearTray(): void {
  const cs = clearEntries(changeSetSig.value);
  changeSetSig.value = cs;
  saveChangeSet(cs);
  recomputeReport();
}

export function openEditor(id: string | null): void {
  const engine = draftEngine();
  const vol = volumeSig.value;
  if (!engine || !vol) return;
  if (id) {
    const item = engine.itemById(id);
    if (!item) return;
    editingSig.value = {
      id, chapter: vol.chapterOf[id] ?? "supplied",
      draft: JSON.parse(JSON.stringify(item)) as Item, surface: "text", step: "edit",
    };
  } else {
    editingSig.value = {
      id: null, chapter: "medicaid", surface: "text", step: "start",
      draft: {
        id: engine.nextId(), name: "", identifier: "", kind: "derived", type: "yes/no",
        scope: "person", program: "Medicaid", meaning: "", sources: [], tests: [],
        implemented: null,
      },
    };
  }
}

/** Opens a new item straight into the AI panel with a document preselected,
 *  for the Documents view's "Draft from this document" button: the analyst
 *  came here to draft from a specific text, not to search the ledger first. */
export function openEditorForDocument(docId: string): void {
  const engine = draftEngine();
  const vol = volumeSig.value;
  if (!engine || !vol) return;
  editingSig.value = {
    id: null, chapter: "medicaid", surface: "ai", step: "edit",
    context: { kind: "document", id: docId },
    draft: {
      id: engine.nextId(), name: "", identifier: "", kind: "derived", type: "yes/no",
      scope: "person", program: "Medicaid", meaning: "", sources: [], tests: [],
      implemented: null,
    },
  };
}

export function closeEditor(): void {
  editingSig.value = null;
}

/** Two change sets hold the same staged work for the same volume and ref. */
export function sameChangeSet(a: ChangeSet, b: ChangeSet): boolean {
  if (a === b) return true;
  if (a.volume !== b.volume || a.baseRef !== b.baseRef) return false;
  if (a.entries.length !== b.entries.length || (a.files ?? []).length !== (b.files ?? []).length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function navigate(patch: Partial<Route>): void {
  location.hash = buildHash({ ...route.value, ...patch });
}

async function openRoute(r: Route): Promise<void> {
  route.value = r;
  const wantRef = baseRefOf(r);
  const already = volumeSig.value;
  const cs = loadChangeSet(r.volume, wantRef);
  // Moving between pages keeps the change set it already holds when the
  // stored one is the same: a fresh object would rebuild the draft engine
  // (and drop every per-engine count cached for it, the resting index among
  // them) and validate the tray again on every click.
  const same = sameChangeSet(changeSetSig.value, cs);
  if (!same) changeSetSig.value = cs;

  if (already && already.volumeId === r.volume && already.ref === wantRef) {
    if (!same || !reportSig.value) recomputeReport();
    return;
  }

  statusSig.value = {
    kind: "loading",
    message: `Loading ${r.volume} from ${refLabel(wantRef, localInfoSig.value)}…`,
  };
  try {
    const token = credentials.get("github");
    let gitRef = wantRef;
    const prNumber = prNumberOf(r.ref);
    if (prNumber !== null) {
      const pr = await githubClient().getPullRequest(prNumber);
      pullRequestSig.value = pr;
      gitRef = pr.headRef;
      const baseSrc = pickSource(REPO, pr.baseRef, token);
      const baseManifest = await loadManifest(baseSrc);
      const baseVol = await loadVolume(baseSrc, baseManifest, r.volume, { cache: idbCache() });
      prBaseVolumeSig.value = baseVol;
      prBaseEngineSig.value = createEngine(baseVol.items, baseVol.meta, {
        sourceIds: baseVol.sources.map((s) => s.id),
        questionIds: baseVol.openQuestions.map((q) => q.id),
        unverifiedSourceIds: unverifiedSourceIds(baseVol.sources),
        sourceTexts: sourceTextMap(baseVol.sources),
      });
    } else {
      pullRequestSig.value = null;
      prBaseVolumeSig.value = null;
      prBaseEngineSig.value = null;
    }
    const src = pickSource(REPO, gitRef, token);
    // Read the manifest from the ref being opened: a pull request that adds or
    // deletes an item rewrites codex.json, so a session-cached one goes stale.
    const manifest = await loadManifest(src);
    manifestSig.value = manifest;
    // An address naming a volume this ledger does not have (or the bare app
    // URL, before any volume was chosen) opens the preferred one instead.
    if (!manifest.volumes.some((v) => v.id === r.volume)) {
      const volume = preferredVolume(manifest, lastVolume());
      if (volume !== r.volume) {
        location.replace(buildHash({ ...r, volume }));
        return;
      }
    }
    // The working tree is served from this machine: many reads at once.
    const vol = await loadVolume(src, manifest, r.volume, {
      cache: idbCache(), concurrency: isLocalRef(gitRef) ? 64 : 12,
    });
    // Keep the route ref (which may be `pr/12`) as the volume's ref so the
    // change-set key and the header badge match the address bar.
    const withRouteRef: LoadedVolume = { ...vol, ref: wantRef };
    const engine = createEngine(withRouteRef.items, withRouteRef.meta, {
      sourceIds: withRouteRef.sources.map((s) => s.id),
      questionIds: withRouteRef.openQuestions.map((q) => q.id),
      unverifiedSourceIds: unverifiedSourceIds(withRouteRef.sources),
      sourceTexts: sourceTextMap(withRouteRef.sources),
    });
    volumeSig.value = withRouteRef;
    rememberVolume(r.volume);
    engineSig.value = engine;
    searchIndexSig.value = buildSearchIndex(withRouteRef, engine);
    statusSig.value = { kind: "idle", message: "" };
    recomputeReport();
  } catch (e) {
    statusSig.value = { kind: "error", message: (e as Error).message };
  }
}

export function sourceTitles(): Record<string, string> {
  return sourceTitleMap(volumeSig.value?.sources ?? []);
}

/** The address bar's route as written (the empty hash resolved). */
function addressRoute(): Route {
  const raw = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
  if (!raw || raw === "/") return resolveEmptyHash();
  return parseHash(location.hash);
}

/** The route the page reads, or null when the address was rewritten to its
 *  canonical form: an older address (`#/co/walkthrough/CO-01`) keeps working
 *  through this redirect, and the rewrite fires hashchange again. */
export function routeForAddress(): Route | null {
  const written = addressRoute();
  const canonical = canonicalRoute(written);
  if (!sameRoute(written, canonical)) {
    location.replace(buildHash(canonical));
    return null;
  }
  return internalRoute(canonical);
}

/** Starts reading the address bar. First asks whether a dev or preview
 *  server serves the working tree (so `npm run dev` and `vite preview` show
 *  the local ledger without any network interception), or, in a static
 *  preview build, reads the bundled snapshot's info; and settles the default
 *  ref from that and `?ref=`. */
export async function startRouter(
  probe: () => Promise<LocalInfo | null> = () => (BUNDLED ? probeBundled() : probeLocal()),
): Promise<void> {
  statusSig.value = { kind: "loading", message: "Looking for the ledger…" };
  const local = await probe();
  localInfoSig.value = local;
  defaultRefSig.value = defaultRef({ search: location.search, local });
  const handle = () => {
    const r = routeForAddress();
    if (r) void openRoute(r);
  };
  addEventListener("hashchange", handle);
  handle();
}
