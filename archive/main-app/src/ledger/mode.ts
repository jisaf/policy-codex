/* Which ledger the app opens when the address does not say: the ref (a
 * GitHub branch, or the working tree a dev or preview server serves) and the
 * volume. Pure, so the choice is unit tested apart from the browser. */
import { DEFAULT_BRANCH, DEFAULT_VOLUME } from "../config";
import type { Manifest } from "./manifest";
import { LOCAL_REF, type LocalInfo } from "./source";

/** The volume the Colorado work lives in; preferred when present. */
export const PREFERRED_VOLUME = "co";

/** `?ref=<branch>` (or `?ref=local`) in the page's query string, before the
 *  hash. Null when absent or blank. */
export function refFromSearch(search: string): string | null {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const v = new URLSearchParams(q).get("ref");
  return v && v.trim() ? v.trim() : null;
}

/** The ref a route with no `@ref` reads: the query string's `?ref=` when
 *  given; otherwise the working tree when the server serves one; otherwise
 *  the default branch. */
export function defaultRef(opts: { search: string; local: LocalInfo | null }): string {
  return refFromSearch(opts.search) ?? (opts.local ? LOCAL_REF : DEFAULT_BRANCH);
}

/** The volume to open when the address names none (or one this ledger does
 *  not have): the last one used, when it is still here; else `co`; else the
 *  historical default; else the manifest's first. */
export function preferredVolume(manifest: Manifest, lastUsed: string | null): string {
  const ids = manifest.volumes.map((v) => v.id);
  if (lastUsed && ids.includes(lastUsed)) return lastUsed;
  if (ids.includes(PREFERRED_VOLUME)) return PREFERRED_VOLUME;
  if (ids.includes(DEFAULT_VOLUME)) return DEFAULT_VOLUME;
  return ids[0] ?? DEFAULT_VOLUME;
}

/** How the header names a ref: the working tree with its branch and commit,
 *  or the branch itself. */
export function refLabel(ref: string, local: LocalInfo | null): string {
  if (ref !== LOCAL_REF) return ref;
  if (!local) return "working tree";
  const at = local.head ? ` @ ${local.head.slice(0, 7)}` : "";
  if (local.bundled) return `preview snapshot${local.branch ? ` (${local.branch}${at})` : at}`;
  return `working tree${local.branch ? ` (${local.branch}${at})` : at}${local.dirty ? ", edited" : ""}`;
}
