import { DEFAULT_VOLUME } from "../config";

/* The address bar (docs/design-unified-ui.md, "Top-level places" and
 * "Canonical pages"). A hash reads `#/<volume>/<view>/<arg…>@<ref>?<params>`.
 *
 * Two forms of a route:
 * - The CANONICAL route is what the address bar shows and every link points
 *   at: one of the seven places (desk, programs, figures, households,
 *   questions, law, changes), an item, search, or one of the implementer
 *   views (table, graph, handoff). `buildHash` always writes it.
 * - The INTERNAL route is what `route.value` holds: the route the mounted
 *   page reads. For a page built for the new places it is the canonical route
 *   itself. For a page still served by an older view (the walkthrough, the
 *   inbox, the aid-code view, Cases, Sources, Documents, the program view) it
 *   is that view's own route, so the older view runs unchanged and every link
 *   it builds is turned back into the canonical one by `buildHash`.
 *
 * `canonicalRoute` maps any route (old addresses included: start, roles,
 * inbox, cases, walkthrough, outcomes, program, source, documents, document)
 * to its canonical home; `internalRoute` maps a canonical route to the view
 * that serves it. When a track replaces an older view with a page of its own,
 * it deletes that view's lines from `internalRoute` (and keeps the redirect
 * in `canonicalRoute`, so old links keep working).
 *
 * An `arg` may hold several segments joined by "/" (`CO-01/p1/snap_allotment`
 * for a determination); `argParts` splits it. */

/** The seven places of the sidebar. */
export type PlaceName = "desk" | "programs" | "figures" | "households" | "questions" | "law" | "changes";

export const PLACE_NAMES: readonly PlaceName[] = [
  "desk", "programs", "figures", "households", "questions", "law", "changes",
];

/** Views an address can name. The places, the canonical item page, search,
 *  the implementer views, and the older views that still serve some pages
 *  (internal routes only: their addresses redirect). */
export type ViewName =
  | PlaceName | "item" | "search"
  // The focused Map (src/ui/map): policy staff's "what stems from what".
  | "map"
  // For implementers (the sidebar's secondary menu).
  | "table" | "graph" | "handoff"
  // Older views: an address naming one is redirected to its canonical home.
  | "start" | "roles" | "inbox" | "cases" | "walkthrough" | "outcomes" | "program" | "source"
  | "documents" | "document";

export interface Route {
  volume: string;
  view: ViewName;
  /** The object the page is about; several segments joined by "/". */
  arg: string | null;
  /** Branch name, or `pr/<number>`. Null means the default branch. */
  ref: string | null;
  params: Record<string, string>;
}

export const VIEWS: ViewName[] = [
  ...PLACE_NAMES, "item", "search", "map", "table", "graph", "handoff",
  "start", "roles", "inbox", "cases", "walkthrough", "outcomes", "program", "source", "documents", "document",
];

/** The older views, whose addresses redirect to a canonical home. */
export const LEGACY_VIEWS: readonly ViewName[] = [
  "start", "roles", "inbox", "cases", "walkthrough", "outcomes", "program", "source", "documents", "document",
];

export const IMPLEMENTER_VIEWS: readonly ViewName[] = ["table", "graph", "handoff"];

export function defaultRoute(): Route {
  return { volume: DEFAULT_VOLUME, view: "desk", arg: null, ref: null, params: {} };
}

/** The segments of a route's arg (`CO-01/p1/snap_allotment` -> three). */
export function argParts(r: Pick<Route, "arg">): string[] {
  return r.arg ? r.arg.split("/").filter(Boolean) : [];
}

/** Parses an address as written: no redirect applied (see `canonicalRoute`). */
export function parseHash(hash: string): Route {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw || raw === "/") return defaultRoute();
  const qi = raw.indexOf("?");
  const pathPart = qi >= 0 ? raw.slice(0, qi) : raw;
  const queryPart = qi >= 0 ? raw.slice(qi + 1) : "";
  const at = pathPart.indexOf("@");
  const segsPart = at >= 0 ? pathPart.slice(0, at) : pathPart;
  const ref = at >= 0 ? decodeURIComponent(pathPart.slice(at + 1)) || null : null;
  const segs = segsPart.split("/").filter(Boolean).map(decodeURIComponent);
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(queryPart)) params[k] = v;
  const volume = segs[0] || DEFAULT_VOLUME;
  const known = (VIEWS as string[]).includes(segs[1]);
  const view = known ? (segs[1] as ViewName) : "desk";
  const arg = known && segs.length > 2 ? segs.slice(2).join("/") : null;
  return { volume, view, arg, ref, params };
}

/** The address of a route, always in its canonical form. */
export function buildHash(r: Route): string {
  const c = canonicalRoute(r);
  const segs = [c.volume, c.view, ...argParts(c)];
  let out = "#/" + segs.map(encodeURIComponent).join("/");
  if (c.ref) out += "@" + c.ref;
  const qs = new URLSearchParams(c.params).toString();
  if (qs) out += "?" + qs;
  return out;
}

function omit(params: Record<string, string>, keys: readonly string[]): Record<string, string> {
  const out = { ...params };
  for (const k of keys) delete out[k];
  return out;
}

function pick(params: Record<string, string>, keys: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) if (params[k]) out[k] = params[k];
  return out;
}

const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join("/") || null;

/** Every route's canonical home: an older view's address becomes the place
 *  that now holds its content; a canonical route is returned unchanged.
 *  Data-free, so it can run on every link. */
export function canonicalRoute(r: Route): Route {
  const base = { volume: r.volume, ref: r.ref };
  const [a0] = argParts(r);
  switch (r.view) {
    case "start":
      return { ...base, view: "desk", arg: null, params: {} };
    case "roles":
      // The role page is the Desk for that role.
      return { ...base, view: "desk", arg: null, params: { ...r.params, ...(a0 ? { persona: a0 } : {}) } };
    case "inbox":
      return { ...base, view: "desk", arg: join("sign", r.arg), params: r.params };
    case "cases":
      if (!a0) return { ...base, view: "households", arg: null, params: {} };
      if (a0 === "new") return { ...base, view: "households", arg: "new", params: r.params };
      return { ...base, view: "households", arg: a0, params: { tab: "states", ...omit(r.params, ["tab"]) } };
    case "walkthrough": {
      if (!a0) return { ...base, view: "households", arg: null, params: pick(r.params, ["program"]) };
      const person = r.params.person;
      if (!person) return { ...base, view: "households", arg: a0, params: {} };
      return {
        ...base, view: "households", arg: join(a0, person, r.params.outcome),
        params: omit(r.params, ["person", "outcome"]),
      };
    }
    case "outcomes":
      if (r.params.tab === "household") {
        const c = r.params.case;
        return c
          ? { ...base, view: "households", arg: c, params: pick(r.params, ["month"]) }
          : { ...base, view: "households", arg: null, params: {} };
      }
      return { ...base, view: "programs", arg: r.arg, params: { tab: "aid-codes", ...omit(r.params, ["tab", "case", "month"]) } };
    case "program":
      return { ...base, view: "programs", arg: r.arg, params: r.params };
    case "source":
      return { ...base, view: "law", arg: join("sources", r.arg), params: r.params };
    case "documents":
      return { ...base, view: "law", arg: "doc", params: r.params };
    case "document": {
      const at = r.params.excerpt;
      return { ...base, view: "law", arg: join("doc", r.arg), params: { ...omit(r.params, ["excerpt"]), ...(at ? { at } : {}) } };
    }
    default:
      return r;
  }
}

/** The tabs of a household's page (`?tab=`), in order; "results" is the
 *  default and is left out of the address. */
export const HOUSEHOLD_TABS = ["results", "documents", "whatif", "states"] as const;
export type HouseholdTab = (typeof HOUSEHOLD_TABS)[number];

export function householdTab(r: Pick<Route, "params">): HouseholdTab {
  const t = r.params.tab as HouseholdTab;
  return HOUSEHOLD_TABS.includes(t) ? t : "results";
}

/** The view that serves a canonical route: the route itself for a page
 *  built for the new places, else the older view's own route. */
export function internalRoute(c: Route): Route {
  const base = { volume: c.volume, ref: c.ref };
  const parts = argParts(c);
  switch (c.view) {
    case "households": {
      if (!parts.length) return { ...base, view: "walkthrough", arg: null, params: c.params };
      if (parts[0] === "new") return { ...base, view: "cases", arg: "new", params: c.params };
      const [caseId, person, outcome] = parts;
      if (person) {
        return {
          ...base, view: "walkthrough", arg: caseId,
          params: { ...c.params, person, ...(outcome ? { outcome } : {}) },
        };
      }
      const tab = householdTab(c);
      if (tab === "states") return { ...base, view: "cases", arg: caseId, params: omit(c.params, ["tab"]) };
      if (tab === "results") {
        return { ...base, view: "outcomes", arg: null, params: { tab: "household", case: caseId, ...pick(c.params, ["month"]) } };
      }
      return c;
    }
    case "programs":
      // The aid-code tab is the aid-code cards' own route (OutcomesView
      // `CodesTab`); the Programs page reads the canonical route.
      if (c.params.tab === "aid-codes") return { ...base, view: "outcomes", arg: c.arg, params: omit(c.params, ["tab"]) };
      return c;
    case "law":
      if (parts[0] === "sources") return { ...base, view: "source", arg: join(...parts.slice(1)), params: c.params };
      if (parts[0] === "doc") {
        if (!parts[1]) return { ...base, view: "documents", arg: null, params: c.params };
        const at = c.params.at;
        return { ...base, view: "document", arg: parts[1], params: { ...omit(c.params, ["at"]), ...(at ? { excerpt: at } : {}) } };
      }
      return c;
    default:
      return c;
  }
}

/** Two routes name the same page (used to decide whether an address must be
 *  rewritten to its canonical form). */
export function sameRoute(a: Route, b: Route): boolean {
  if (a.volume !== b.volume || a.view !== b.view || (a.arg ?? null) !== (b.arg ?? null) || (a.ref ?? null) !== (b.ref ?? null)) return false;
  const ka = Object.keys(a.params).sort();
  const kb = Object.keys(b.params).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a.params[k] === b.params[k]);
}

export function isPrRef(ref: string | null): boolean {
  return Boolean(ref && /^pr\/\d+$/.test(ref));
}

export function prNumberOf(ref: string | null): number | null {
  const m = ref ? /^pr\/(\d+)$/.exec(ref) : null;
  return m ? Number(m[1]) : null;
}
