import { defaultBundle, type BundleReader } from "./bundled";

export interface Repo { owner: string; name: string }

export interface LedgerSource {
  ref: string;
  readText(path: string): Promise<string>;
  /** Commit sha for the ref, or null when it cannot be resolved. */
  head(): Promise<string | null>;
}

async function shaOf(
  repo: Repo, ref: string, token: string | null, f: typeof fetch,
): Promise<string | null> {
  const headers: Record<string, string> = { Accept: "application/vnd.github.sha" };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const r = await f(
      `https://api.github.com/repos/${repo.owner}/${repo.name}/commits/${encodeURIComponent(ref)}`,
      { headers },
    );
    if (!r.ok) return null;
    const text = (await r.text()).trim();
    return /^[0-9a-f]{7,40}$/.test(text) ? text : null;
  } catch {
    return null;
  }
}

export function rawSource(repo: Repo, ref: string, fetchImpl: typeof fetch = fetch): LedgerSource {
  return {
    ref,
    async readText(path) {
      const url =
        `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${ref}/${path}`;
      const r = await fetchImpl(url);
      if (!r.ok) throw new Error(`${path} not found at ${ref} (${r.status})`);
      return await r.text();
    },
    head: () => shaOf(repo, ref, null, fetchImpl),
  };
}

export function apiSource(
  repo: Repo, ref: string, token: string, fetchImpl: typeof fetch = fetch,
): LedgerSource {
  return {
    ref,
    async readText(path) {
      const url =
        `https://api.github.com/repos/${repo.owner}/${repo.name}/contents/${path}` +
        `?ref=${encodeURIComponent(ref)}`;
      const r = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (!r.ok) throw new Error(`${path} not found at ${ref} (${r.status})`);
      const body = (await r.json()) as { content: string; encoding: string };
      if (body.encoding !== "base64") throw new Error(`${path}: unexpected encoding`);
      return new TextDecoder().decode(
        Uint8Array.from(atob(body.content.replace(/\n/g, "")), (c) => c.charCodeAt(0)),
      );
    },
    head: () => shaOf(repo, ref, token, fetchImpl),
  };
}

/** The ref name that means "the working tree this app is served from": the
 *  checkout's own `codex.json` and `volumes/`, served by the dev and preview
 *  servers of the original app (archived: archive/main-app/scripts/vite-local-ledger.ts)
 *  under LOCAL_BASE. It is never a
 *  git branch, so anything that needs one (Propose) maps it to the default
 *  branch first (`gitRefOf`). */
export const LOCAL_REF = "local";
/** Where the dev and preview servers serve the working tree, relative to the
 *  page, so a build served from a sub-path still finds it. */
export const LOCAL_BASE = "./__ledger/";

export function isLocalRef(ref: string | null | undefined): boolean {
  return ref === LOCAL_REF;
}

/** What the local endpoint says about the tree it serves. */
export interface LocalInfo {
  mode: "local";
  /** The checkout's HEAD commit, or null when git is unavailable. */
  head: string | null;
  /** The checked-out branch, or null (detached, or no git). */
  branch: string | null;
  /** True when the working tree has uncommitted changes. */
  dirty: boolean;
  /** True when the "working tree" is a snapshot bundled into a static
   *  preview build (src/ledger/bundled.ts), not a live server. */
  bundled?: boolean;
}

/** True in a static preview build (`VITE_LEDGER_SOURCE=bundled`, made by
 *  `npm run build:bundle`): the ledger is a snapshot shipped beside the page,
 *  read as the local ref, and nothing can be proposed to GitHub from it. */
export const BUNDLED: boolean = (() => {
  // `import.meta.env` is not in this tsconfig's lib; Vite inlines it at build.
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_LEDGER_SOURCE === "bundled";
})();

/** A reader over a bundled snapshot, under the local ref: never cached by
 *  sha (head is null), like the working tree it stands in for. */
export function bundledSource(bundle: BundleReader = defaultBundle()): LedgerSource {
  return { ref: LOCAL_REF, readText: (path) => bundle.readText(path), head: async () => null };
}

/** The bundled snapshot's info, in the shape the local probe answers. */
export async function probeBundled(bundle: BundleReader = defaultBundle()): Promise<LocalInfo | null> {
  try {
    const { info } = await bundle.index();
    return {
      mode: "local", bundled: true,
      head: typeof info?.head === "string" ? info.head : null,
      branch: typeof info?.branch === "string" ? info.branch : null,
      dirty: info?.dirty === true,
    };
  } catch {
    return null;
  }
}

/** A reader over the working tree the dev or preview server serves. `head()`
 *  is always null: the tree can change between two loads without a commit,
 *  so a load from it is never cached under a sha. Every read bypasses the
 *  browser cache for the same reason. */
export function localSource(
  base: string = LOCAL_BASE, fetchImpl: typeof fetch = fetch,
): LedgerSource {
  return {
    ref: LOCAL_REF,
    async readText(path) {
      const r = await fetchImpl(base + path, { cache: "no-store" });
      if (!r.ok) throw new Error(`${path} not found in the working tree (${r.status})`);
      return await r.text();
    },
    head: async () => null,
  };
}

/** Asks the local endpoint whether this page is served by a dev or preview
 *  server that can read the working tree. Null on any failure, including a
 *  static host that answers every path with index.html. */
export async function probeLocal(
  base: string = LOCAL_BASE, fetchImpl: typeof fetch = fetch,
): Promise<LocalInfo | null> {
  try {
    const r = await fetchImpl(base + "__info", { cache: "no-store" });
    if (!r.ok) return null;
    const body = JSON.parse(await r.text()) as Partial<LocalInfo> | null;
    if (!body || body.mode !== "local") return null;
    return {
      mode: "local",
      head: typeof body.head === "string" ? body.head : null,
      branch: typeof body.branch === "string" ? body.branch : null,
      dirty: body.dirty === true,
    };
  } catch {
    return null;
  }
}

/** The git branch a ref stands for when something must talk to GitHub (a
 *  pull request's base): the working tree proposes against `fallback`. */
export function gitRefOf(ref: string, fallback: string): string {
  return isLocalRef(ref) ? fallback : ref;
}

export function pickSource(
  repo: Repo, ref: string, token: string | null, fetchImpl: typeof fetch = fetch,
  bundle: BundleReader | null = BUNDLED ? defaultBundle() : null,
): LedgerSource {
  if (isLocalRef(ref)) return bundle ? bundledSource(bundle) : localSource(LOCAL_BASE, fetchImpl);
  return token ? apiSource(repo, ref, token, fetchImpl) : rawSource(repo, ref, fetchImpl);
}
