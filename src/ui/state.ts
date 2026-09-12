import { computed, signal, type Signal } from "@preact/signals";
import { DEFAULT_BRANCH, DEFAULT_VOLUME, REPO } from "../config";
import { createEngine, type Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import { createCredentials, type Credentials } from "../credentials";
import { createGitHubClient, type GitHubClient, type PullRequest } from "../github/client";
import { idbCache } from "../ledger/cache";
import { loadManifest, loadVolume, type LoadedVolume } from "../ledger/load";
import type { Manifest } from "../ledger/manifest";
import { sourceTitleMap } from "../ledger/markdown";
import { pickSource } from "../ledger/source";
import { applyChangeSet } from "../changes/apply";
import {
  clearEntries, discardEntry, loadChangeSet, putEntry, saveChangeSet,
} from "../changes/store";
import type { ChangeEntry, ChangeSet } from "../changes/types";
import { emptyChangeSet } from "../changes/types";
import { validateChangeSet, type ChangeSetReport } from "../changes/validate";
import { buildSearchIndex, type SearchIndex } from "./search";
import { buildHash, defaultRoute, parseHash, prNumberOf, type Route } from "./router";

export interface EditingState {
  /** Null for a new item. */
  id: string | null;
  chapter: string;
  draft: Item;
  surface: "form" | "text" | "ai";
  /** A new item starts on "start", a search of the ledger, so a steward looks
   *  before adding. An existing item opens straight into "edit". */
  step: "start" | "edit";
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

export const credentials: Credentials = createCredentials();

export function githubClient(): GitHubClient {
  return createGitHubClient(REPO, credentials.get("github"));
}

/** The git ref a route reads from, before a pull request is resolved. */
export function baseRefOf(r: Route): string {
  return r.ref ?? DEFAULT_BRANCH;
}

/** The engine every view renders: the base ledger with the tray applied.
 *  Memoised so a render pass reuses one Engine instance and the per-engine
 *  caches downstream (validation, constraints) actually hit. */
const viewEngineSig = computed<Engine | null>(() => {
  const base = engineSig.value;
  if (!base) return null;
  const cs = changeSetSig.value;
  if (!cs.entries.length) return base;
  return base.withItems(applyChangeSet(base.items(), cs));
});

export function viewEngine(): Engine | null {
  return viewEngineSig.value;
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

export function discardChangeEntry(id: string): void {
  const cs = discardEntry(changeSetSig.value, id);
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
  const engine = viewEngine();
  const vol = volumeSig.value;
  if (!engine || !vol) return;
  if (id) {
    const item = engine.itemById(id);
    if (!item) return;
    editingSig.value = {
      id, chapter: vol.chapterOf[id] ?? "supplied",
      draft: JSON.parse(JSON.stringify(item)) as Item, surface: "form", step: "edit",
    };
  } else {
    editingSig.value = {
      id: null, chapter: "medicaid", surface: "form", step: "start",
      draft: {
        id: engine.nextId(), name: "", identifier: "", kind: "derived", type: "yes/no",
        scope: "person", program: "Medicaid", meaning: "", sources: [], tests: [],
        implemented: null,
      },
    };
  }
}

export function closeEditor(): void {
  editingSig.value = null;
}

export function navigate(patch: Partial<Route>): void {
  location.hash = buildHash({ ...route.value, ...patch });
}

async function openRoute(r: Route): Promise<void> {
  route.value = r;
  const wantRef = baseRefOf(r);
  const already = volumeSig.value;
  const cs = loadChangeSet(r.volume, wantRef);
  changeSetSig.value = cs;

  if (already && already.volumeId === r.volume && already.ref === wantRef) {
    recomputeReport();
    return;
  }

  statusSig.value = { kind: "loading", message: `Loading ${r.volume} at ${wantRef}…` };
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
    const vol = await loadVolume(src, manifest, r.volume, { cache: idbCache() });
    // Keep the route ref (which may be `pr/12`) as the volume's ref so the
    // change-set key and the header badge match the address bar.
    const withRouteRef: LoadedVolume = { ...vol, ref: wantRef };
    const engine = createEngine(withRouteRef.items, withRouteRef.meta, {
      sourceIds: withRouteRef.sources.map((s) => s.id),
      questionIds: withRouteRef.openQuestions.map((q) => q.id),
    });
    volumeSig.value = withRouteRef;
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

export function startRouter(): void {
  const handle = () => { void openRoute(parseHash(location.hash)); };
  addEventListener("hashchange", handle);
  handle();
}
