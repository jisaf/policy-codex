/* Approval fingerprints (docs/governance.md "Stale approvals"): a content
 * hash of what a signer approved, recorded on each approval row when the role
 * signs, and recomputed by governance on every Reviewed or Approved item. A
 * signature whose fingerprint no longer matches (or that records none) is
 * stale: the item, or something it reads, changed after it was signed.
 *
 * What a fingerprint covers, and nothing else:
 * - the item's approvable fields (APPROVABLE_FIELDS): what it means and how it
 *   is computed, its type and options, its values and parameter versions, its
 *   sources and effective range, and the names engineers implement. Free text
 *   is compared with whitespace collapsed, and the order of sets (sources,
 *   options, accepts_from, adopted_by) and of versions does not count;
 * - the text of every excerpt it cites in sources.md (its own `sources` and
 *   each version's `source`), whitespace collapsed;
 * - the fingerprint of every item it reads (the dependency graph's edges),
 *   so a change anywhere upstream, at any depth, changes it (a Merkle hash).
 * Precision, rationale, nearest, name, tags, open, tests, implemented,
 * review_by, status and the approval record itself are not covered: they
 * do not change what was approved.
 *
 * Pure and synchronous, so `npm run check`, `npm run fingerprint` and the
 * app compute the same string. */
import { buildGraph, graphUses, type DependencyGraph } from "./graph";
import type { LedgerIndex } from "./ledger-index";
import { sha256Hex } from "./sha256";
import type { ApprovalRecord, Item } from "./types";

/** The scheme tag every fingerprint starts with. A change to what is covered
 *  bumps it, so every earlier signature reads as stale rather than silently
 *  matching under different rules. */
export const FINGERPRINT_SCHEME = "fp1";

/** The fields of an item a signature covers, in the order they are hashed. */
export const APPROVABLE_FIELDS: readonly (keyof Item)[] = [
  "id", "identifier", "kind", "type", "options", "scope", "program", "role",
  "meaning", "assumption", "statute_override", "supplied_by",
  "value", "versions", "derived", "sources", "effective", "accepts_from",
  "link_class", "link_basis", "adopted_by",
];

const TEXT_FIELDS: ReadonlySet<string> = new Set([
  "meaning", "assumption", "statute_override", "supplied_by", "link_basis",
]);
const SET_FIELDS: ReadonlySet<string> = new Set(["options", "sources", "accepts_from", "adopted_by"]);

/** A set member as a sortable string: a bare string as itself (so a list of
 *  identifiers hashes as it always has), anything else as canonical JSON. */
function setKey(x: unknown): string {
  return typeof x === "string" ? x : canonicalJson(x);
}

/** The ledger and excerpt texts a fingerprint is computed against. */
export interface FingerprintBasis {
  ix: LedgerIndex;
  /** excerpt id -> quoted text, as parseSources reads sources.md. */
  sourceTexts: Readonly<Record<string, string>>;
}

function normText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** JSON with object keys sorted at every depth and undefined dropped, so the
 *  same content always serialises to the same string. */
export function canonicalJson(v: unknown): string {
  if (v === undefined) return "null";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  const rec = v as Record<string, unknown>;
  return `{${Object.keys(rec).filter((k) => rec[k] !== undefined).sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(rec[k])}`).join(",")}}`;
}

/** One approvable field, normalised; undefined when the item does not state
 *  it (an empty set and an absent one are the same). */
function normField(it: Item, f: keyof Item): unknown {
  const v = it[f];
  if (v === undefined || v === null) return undefined;
  if (TEXT_FIELDS.has(f)) return normText(String(v)) || undefined;
  if (SET_FIELDS.has(f) && Array.isArray(v)) {
    const keyed = new Map<string, unknown>();
    for (const x of v) keyed.set(setKey(x), x);
    const xs = [...keyed.keys()].sort().map((k) => keyed.get(k));
    return xs.length ? xs : undefined;
  }
  if (f === "versions" && Array.isArray(v)) {
    return (it.versions ?? [])
      .map((x) => ({ from: x.from, to: x.to, value: x.value, source: x.source }))
      .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  }
  return v;
}

/** The item's approvable content, normalised, keyed by field. */
export function approvableContent(it: Item): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of APPROVABLE_FIELDS) {
    const v = normField(it, f);
    if (v !== undefined) out[f] = v;
  }
  return out;
}

/** The approvable fields that differ between two versions of an item. */
export function changedFields(a: Item, b: Item): string[] {
  return APPROVABLE_FIELDS.filter((f) => canonicalJson(normField(a, f)) !== canonicalJson(normField(b, f)));
}

/** Every excerpt an item cites: its sources and its versions' sources. */
export function citedExcerpts(it: Item): string[] {
  const s = new Set<string>(it.sources ?? []);
  for (const v of it.versions ?? []) if (v.source) s.add(v.source);
  return [...s].sort();
}

function excerptHash(texts: Readonly<Record<string, string>>, id: string): string {
  const t = texts[id];
  return t === undefined ? "missing" : sha256Hex(normText(t));
}

interface Memo { graph: DependencyGraph; fp: Map<string, string>; visiting: Set<string> }
const memos = new WeakMap<LedgerIndex, WeakMap<object, Memo>>();

function memoFor(b: FingerprintBasis): Memo {
  let byTexts = memos.get(b.ix);
  if (!byTexts) { byTexts = new WeakMap(); memos.set(b.ix, byTexts); }
  let m = byTexts.get(b.sourceTexts);
  if (!m) { m = { graph: buildGraph(b.ix), fp: new Map(), visiting: new Set() }; byTexts.set(b.sourceTexts, m); }
  return m;
}

function nodeHash(b: FingerprintBasis, m: Memo, it: Item, deps: readonly string[]): string {
  const parts = [
    FINGERPRINT_SCHEME,
    canonicalJson(approvableContent(it)),
    citedExcerpts(it).map((s) => `${s}=${excerptHash(b.sourceTexts, s)}`).join(","),
    [...deps].sort().map((d) => `${d}=${depHash(b, m, d)}`).join(","),
  ];
  return sha256Hex(parts.join("\n"));
}

function depHash(b: FingerprintBasis, m: Memo, identifier: string): string {
  const hit = m.fp.get(identifier);
  if (hit) return hit;
  const it = b.ix.byIdentifier.get(identifier);
  if (!it) return "absent";
  // A dependency cycle (which `npm run check` blocks on its own) would
  // recurse for ever; its back edge hashes as a marker instead.
  if (m.visiting.has(identifier)) return "cycle";
  m.visiting.add(identifier);
  const h = nodeHash(b, m, it, m.graph.uses.get(identifier) ?? []);
  m.visiting.delete(identifier);
  m.fp.set(identifier, h);
  return h;
}

/** The fingerprint of `it` as it stands, read against `b`: the item itself
 *  may be a staged edit that is not in the index; what it reads is looked up
 *  in the index. `fp1-` and the first 20 hex digits of a SHA-256. */
export function fingerprintItem(b: FingerprintBasis, it: Item): string {
  const m = memoFor(b);
  return `${FINGERPRINT_SCHEME}-${nodeHash(b, m, it, graphUses(b.ix, it)).slice(0, 20)}`;
}

/** The items `it` reads, directly or through other items, by id (itself
 *  included, as given). */
export function readClosure(b: FingerprintBasis, it: Item): Map<string, Item> {
  const out = new Map<string, Item>([[it.id, it]]);
  const graph = memoFor(b).graph;
  const stack = [...graphUses(b.ix, it)];
  const seen = new Set<string>([it.identifier]);
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const dep = b.ix.byIdentifier.get(id);
    if (!dep) continue;
    if (!out.has(dep.id)) out.set(dep.id, dep);
    for (const d of graph.uses.get(id) ?? []) stack.push(d);
  }
  return out;
}

/** What changed between a baseline (the ledger at the base ref) and now that
 *  bears on `it`: its own approvable fields, each item it reads (added,
 *  removed or changed, with the fields), and each cited excerpt whose text
 *  changed. Empty when the baseline shows no such change. */
export function describeChanges(
  current: FingerprintBasis, it: Item, baseline: FingerprintBasis,
): string[] {
  const out: string[] = [];
  const baseRoot = baseline.ix.byId.get(it.id);
  const now = readClosure(current, it);
  const then = baseRoot ? readClosure(baseline, baseRoot) : new Map<string, Item>();
  if (baseRoot) {
    const own = changedFields(baseRoot, it);
    if (own.length) out.push(`the item itself changed (${own.join(", ")})`);
  }
  const label = (x: Item) => `${x.id} ${x.identifier}`;
  const ids = [...new Set([...now.keys(), ...then.keys()])].filter((id) => id !== it.id).sort(byId);
  for (const id of ids) {
    const a = then.get(id);
    const b = now.get(id);
    if (a && b) {
      const f = changedFields(a, b);
      if (f.length) out.push(`${label(b)} changed (${f.join(", ")})`);
    } else if (b) {
      out.push(`it now reads ${label(b)}`);
    } else if (a) {
      out.push(`it no longer reads ${label(a)}`);
    }
  }
  const excerpts = new Set<string>();
  for (const x of [...now.values(), ...then.values()]) for (const s of citedExcerpts(x)) excerpts.add(s);
  for (const s of [...excerpts].sort(byId)) {
    const a = baseline.sourceTexts[s];
    const b = current.sourceTexts[s];
    if (a === b || (a !== undefined && b !== undefined && normText(a) === normText(b))) continue;
    out.push(a === undefined ? `excerpt ${s} was added` : b === undefined ? `excerpt ${s} was removed` : `excerpt ${s} text changed`);
  }
  return out;
}

function byId(a: string, b: string): number {
  const n = (s: string) => Number(/(\d+)$/.exec(s)?.[1] ?? NaN);
  const pa = a.replace(/\d+$/, "");
  const pb = b.replace(/\d+$/, "");
  return pa === pb && !Number.isNaN(n(a)) && !Number.isNaN(n(b)) ? n(a) - n(b) : a.localeCompare(b);
}

/** The signatures on `it` that no longer match what it is now. Only a
 *  Reviewed or Approved item is checked: a Draft item's signatures are a
 *  record of past review, and a Draft item needs no signature to be valid. */
export function staleSignatures(
  b: FingerprintBasis, it: Item,
): { fingerprint: string; stale: ApprovalRecord[] } | null {
  if (it.status !== "Reviewed" && it.status !== "Approved") return null;
  const rows = it.approval ?? [];
  if (!rows.length) return null;
  const fingerprint = fingerprintItem(b, it);
  const stale = rows.filter((r) => r.fingerprint !== fingerprint);
  return stale.length ? { fingerprint, stale } : null;
}

/** The governance message for a stale approval on `it`, or null when every
 *  signature matches. With a baseline the message names what changed;
 *  without one (the app, or a base that cannot be read) it says that the item
 *  or something it reads changed. */
export function staleApprovalMessage(
  b: FingerprintBasis, it: Item, opts: { baseline?: FingerprintBasis | null } = {},
): string | null {
  const s = staleSignatures(b, it);
  if (!s) return null;
  const changes = opts.baseline ? describeChanges(b, it, opts.baseline) : [];
  const what = changes.length
    ? changes.join("; ")
    : "the item, or something it reads, changed after it was signed";
  const unrecorded = s.stale.filter((r) => !r.fingerprint).map((r) => r.role);
  const recorded = s.stale.filter((r) => r.fingerprint).map((r) => `${r.role} (${r.fingerprint})`);
  const who = [
    recorded.length ? `signed as ${recorded.join(", ")}` : "",
    unrecorded.length ? `${unrecorded.join(", ")} signed with no fingerprint` : "",
  ].filter(Boolean).join("; ");
  const cmd = `npm run fingerprint -- --item ${it.id}`;
  return `approval is stale: ${what}. ${who}; it is now ${s.fingerprint}. ` +
    `Re-sign it (${cmd}) or return it to Draft`;
}
