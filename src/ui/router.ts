import { DEFAULT_VOLUME } from "../config";

export type ViewName =
  | "table" | "graph" | "cases" | "program" | "item" | "source" | "documents" | "document" | "search";

export interface Route {
  volume: string;
  view: ViewName;
  arg: string | null;
  /** Branch name, or `pr/<number>`. Null means the default branch. */
  ref: string | null;
  params: Record<string, string>;
}

const VIEWS: ViewName[] = [
  "table", "graph", "cases", "program", "item", "source", "documents", "document", "search",
];

export function defaultRoute(): Route {
  return { volume: DEFAULT_VOLUME, view: "table", arg: null, ref: null, params: {} };
}

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
  const view = (VIEWS as string[]).includes(segs[1]) ? (segs[1] as ViewName) : "table";
  const arg = segs[2] ?? null;
  return { volume, view, arg, ref, params };
}

export function buildHash(r: Route): string {
  const segs = [r.volume, r.view];
  if (r.arg) segs.push(r.arg);
  let out = "#/" + segs.map(encodeURIComponent).join("/");
  if (r.ref) out += "@" + r.ref;
  const qs = new URLSearchParams(r.params).toString();
  if (qs) out += "?" + qs;
  return out;
}

export function isPrRef(ref: string | null): boolean {
  return Boolean(ref && /^pr\/\d+$/.test(ref));
}

export function prNumberOf(ref: string | null): number | null {
  const m = ref ? /^pr\/(\d+)$/.exec(ref) : null;
  return m ? Number(m[1]) : null;
}
