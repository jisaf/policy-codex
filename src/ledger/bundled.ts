/* The "bundled" ledger: a static preview build of the original app (archived:
 * archive/main-app/scripts/build-bundle.ts) carries a snapshot of the ledger beside the page,
 * as a few JSON files, so it runs on a plain static host with no GitHub and
 * no dev server. The app reads it in place of the working tree when it is
 * built with VITE_LEDGER_SOURCE=bundled (src/ledger/source.ts `pickSource`).
 *
 * Layout under BUNDLE_BASE:
 *   index.json     { info: BundleInfo, files: { "<repo path>": "<chunk file>" } }
 *   <chunk>.json   { "<repo path>": "<file text>", ... }
 * A chunk is fetched the first time one of its files is read, and kept, so
 * the documents' text (most of the size) is only fetched when a page opens one. */

/** Where the bundle sits, relative to the page. */
export const BUNDLE_BASE = "./ledger/";
export const BUNDLE_INDEX = "index.json";

/** What the bundle says about the tree it was built from. */
export interface BundleInfo {
  head: string | null;
  branch: string | null;
  dirty: boolean;
  /** ISO time of the build. */
  built?: string;
}

export interface BundleIndex {
  info: BundleInfo;
  files: Record<string, string>;
}

export interface BundleReader {
  index(): Promise<BundleIndex>;
  readText(path: string): Promise<string>;
}

/** A reader over one bundle. Every fetch happens once per reader. */
export function bundleReader(base: string = BUNDLE_BASE, fetchImpl: typeof fetch = fetch): BundleReader {
  let indexP: Promise<BundleIndex> | null = null;
  const chunks = new Map<string, Promise<Record<string, string>>>();
  const getJson = async <T>(name: string): Promise<T> => {
    const r = await fetchImpl(base + name);
    if (!r.ok) throw new Error(`bundle file ${name} could not be read (${r.status})`);
    return JSON.parse(await r.text()) as T;
  };
  const index = () => {
    if (!indexP) {
      indexP = getJson<BundleIndex>(BUNDLE_INDEX);
      indexP.catch(() => { indexP = null; });
    }
    return indexP;
  };
  const chunk = (name: string) => {
    let p = chunks.get(name);
    if (!p) {
      p = getJson<Record<string, string>>(name);
      p.catch(() => chunks.delete(name));
      chunks.set(name, p);
    }
    return p;
  };
  return {
    index,
    async readText(path) {
      const name = (await index()).files[path];
      if (!name) throw new Error(`${path} not found in the bundled ledger (404)`);
      const text = (await chunk(name))[path];
      if (typeof text !== "string") throw new Error(`${path} missing from ${name}`);
      return text;
    },
  };
}

let shared: BundleReader | null = null;

/** The page's own bundle, one reader for the whole session. */
export function defaultBundle(): BundleReader {
  return (shared ??= bundleReader());
}

/** Splits files into chunks of at most `maxBytes` (UTF-8, as JSON), grouped
 *  by `groupOf` so files read together land together. A single file larger
 *  than the limit gets a chunk of its own. Pure, for the build script and
 *  its test. */
export function chunkFiles(
  files: ReadonlyArray<{ path: string; text: string }>,
  maxBytes: number,
  groupOf: (path: string) => string,
): { chunks: Array<{ name: string; files: Record<string, string> }>; index: Record<string, string> } {
  const enc = new TextEncoder();
  const groups = new Map<string, Array<{ path: string; text: string }>>();
  for (const f of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const g = groupOf(f.path);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(f);
  }
  const chunks: Array<{ name: string; files: Record<string, string> }> = [];
  const index: Record<string, string> = {};
  for (const [g, list] of groups) {
    let n = 0;
    let cur: Record<string, string> = {};
    let size = 2;
    const flush = () => {
      if (!Object.keys(cur).length) return;
      const name = `${g}-${n++}.json`;
      chunks.push({ name, files: cur });
      for (const p of Object.keys(cur)) index[p] = name;
      cur = {};
      size = 2;
    };
    for (const f of list) {
      const bytes = enc.encode(JSON.stringify(f.path) + ":" + JSON.stringify(f.text) + ",").length;
      if (size + bytes > maxBytes) flush();
      cur[f.path] = f.text;
      size += bytes;
    }
    flush();
  }
  return { chunks, index };
}
