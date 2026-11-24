/* Change impact and sibling copies (docs/governance.md "Change impact"; step
 * 4 of the 2026-11-23 plan, docs/plan-colorado.md).
 *
 * When a pull request changes what an existing item decides, the check lists
 * the unchanged items that should probably change with it, and blocks until
 * the pull request records a disposition for each. Three signals, narrowed by
 * replaying the branch's fix commits (docs/governance.md has the
 * measurements):
 *
 * - excerpt: an unchanged item of the same kind that cites an excerpt the
 *   changed item cites, where at most EXCERPT_MAX_CITING items in the volume
 *   cite that excerpt (a narrow excerpt names few rules; a broad one, cited
 *   by dozens, flooded at 18 flags per change);
 * - sibling: an item registered as a deliberate per-program copy of the
 *   changed one (`siblings`, symmetric);
 * - same facts: an unchanged rule of the same program that reads, directly,
 *   at least FACTS_MIN_SHARED of the same supplied facts with a Jaccard
 *   overlap of at least FACTS_MIN_JACCARD (a near-duplicate path: it sums or
 *   tests the same set). "Reads any of the same facts" flooded at 3 flags per
 *   change and was dropped.
 *
 * "Changes what it decides" is the approval fingerprint's approvable fields
 * (src/engine/fingerprint.ts), so a change of precision, rationale, name,
 * tags, tests or whitespace raises nothing; the link declarations
 * (accepts_from, link_class, link_basis, adopted_by) are left out too, since
 * they say why a read is allowed, not what is decided.
 *
 * A disposition is keyed by the changed item, the flagged item and the
 * changed item's fingerprint after the change, so a further change to the
 * changed item (or to anything it reads) reopens the flag rather than
 * carrying an old disposition over it. */
import { parse as parseYaml } from "yaml";
import { usesOf } from "./check";
import { changedFields, citedExcerpts, fingerprintItem, type FingerprintBasis } from "./fingerprint";
import type { LedgerIndex } from "./ledger-index";
import type { Item } from "./types";

export const EXCERPT_MAX_CITING = 3;
export const FACTS_MIN_SHARED = 2;
export const FACTS_MIN_JACCARD = 0.5;

/** Approvable fields that declare a link rather than decide anything. */
export const LINK_DECLARATION_FIELDS: readonly string[] = ["accepts_from", "link_class", "link_basis", "adopted_by"];

/** The approvable fields, other than link declarations, that differ. */
export function decisionChanges(before: Item, after: Item): string[] {
  return changedFields(before, after).filter((f) => !LINK_DECLARATION_FIELDS.includes(f));
}

/** Items present before and after whose decision changed: id -> fields. */
export function changedDecisions(before: readonly Item[], after: readonly Item[]): Map<string, string[]> {
  const was = new Map(before.map((it) => [it.id, it]));
  const out = new Map<string, string[]>();
  for (const it of after) {
    const b = was.get(it.id);
    if (!b) continue;
    const f = decisionChanges(b, it);
    if (f.length) out.set(it.id, f);
  }
  return out;
}

export interface ImpactFlag {
  /** the changed item. */
  changed: string;
  changedIdentifier: string;
  /** its approval fingerprint after the change; a disposition records it. */
  fingerprint: string;
  /** the decision fields that changed. */
  fields: string[];
  /** the unchanged item that should probably change with it. */
  flagged: string;
  flaggedIdentifier: string;
  /** why, one entry per signal: "excerpt S12", "sibling: <reason>",
   *  "same facts: a, b". */
  signals: string[];
}

function suppliedReads(ix: LedgerIndex, it: Item): Set<string> {
  if (it.kind !== "derived" || it.derived === undefined || it.derived === null) return new Set();
  let refs: string[] = [];
  try { refs = usesOf(ix, it.derived); } catch { refs = []; }
  return new Set(refs.filter((r) => ix.byIdentifier.get(r)?.kind === "supplied"));
}

/** The flags for the changed items against the ledger after the change.
 *  `touched` is every item the change set added or changed in decision; none
 *  of them is flagged (it was changed, or it is new). */
export function impactFlags(
  after: FingerprintBasis, changed: ReadonlyMap<string, string[]>, touched: ReadonlySet<string>,
): ImpactFlag[] {
  const ix = after.ix;
  const items = ix.items;
  const citing = new Map<string, number>();
  for (const it of items) for (const s of citedExcerpts(it)) citing.set(s, (citing.get(s) ?? 0) + 1);
  const facts = new Map<string, Set<string>>();
  const factsOf = (it: Item) => {
    let f = facts.get(it.id);
    if (!f) { f = suppliedReads(ix, it); facts.set(it.id, f); }
    return f;
  };
  const out: ImpactFlag[] = [];
  for (const [id, fields] of [...changed].sort((a, b) => byId(a[0], b[0]))) {
    const x = ix.byId.get(id);
    if (!x) continue;
    const signals = new Map<string, string[]>();
    const add = (y: Item, s: string) => {
      if (y.id === x.id || touched.has(y.id)) return;
      const list = signals.get(y.id) ?? [];
      if (!list.includes(s)) list.push(s);
      signals.set(y.id, list);
    };
    const narrow = citedExcerpts(x).filter((s) => (citing.get(s) ?? 0) <= EXCERPT_MAX_CITING);
    if (narrow.length) {
      for (const y of items) {
        if (y.kind !== x.kind) continue;
        const ys = new Set(citedExcerpts(y));
        for (const s of narrow) if (ys.has(s)) add(y, `excerpt ${s}`);
      }
    }
    for (const s of x.siblings ?? []) {
      const y = ix.byId.get(s.id);
      if (y) add(y, `sibling: ${s.reason}`);
    }
    for (const y of items) {
      if ((y.siblings ?? []).some((s) => s.id === x.id) && !(x.siblings ?? []).some((s) => s.id === y.id)) {
        add(y, `sibling: ${(y.siblings ?? []).find((s) => s.id === x.id)!.reason}`);
      }
    }
    if (x.kind === "derived") {
      const fx = factsOf(x);
      if (fx.size >= FACTS_MIN_SHARED) {
        for (const y of items) {
          if (y.kind !== "derived" || y.program !== x.program || y.id === x.id) continue;
          const fy = factsOf(y);
          const shared = [...fx].filter((f) => fy.has(f)).sort();
          if (shared.length < FACTS_MIN_SHARED) continue;
          const union = new Set([...fx, ...fy]).size;
          if (shared.length / union >= FACTS_MIN_JACCARD) add(y, `same facts: ${shared.join(", ")}`);
        }
      }
    }
    if (!signals.size) continue;
    const fingerprint = fingerprintItem(after, x);
    for (const [yid, sig] of [...signals].sort((a, b) => byId(a[0], b[0]))) {
      const y = ix.byId.get(yid)!;
      out.push({
        changed: x.id, changedIdentifier: x.identifier, fingerprint, fields,
        flagged: y.id, flaggedIdentifier: y.identifier, signals: sig,
      });
    }
  }
  return out;
}

/** One disposition recorded in a change record. */
export interface ImpactDisposition {
  changed: string;
  fingerprint: string;
  flagged: string;
  /** "fixed in this PR ..." (how), when the flag applies. */
  applies?: string;
  /** why the change does not carry over to the flagged item. */
  not_applicable?: string;
  /** the change record it is written in. */
  file: string;
}

/** A change record's file name: `<YYYY-MM-DD>-<slug>.yaml`. */
export const CHANGE_RECORD_RE = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*\.yaml$/;

/** Reads one change record (volumes/<volume>/changes/<date>-<slug>.yaml):
 *  `date`, `summary`, and an `impact` list of dispositions. */
export function parseChangeRecord(text: string, file: string): { dispositions: ImpactDisposition[]; errors: string[] } {
  const errors: string[] = [];
  const dispositions: ImpactDisposition[] = [];
  const name = file.split("/").pop() ?? file;
  if (!CHANGE_RECORD_RE.test(name)) errors.push(`${file}: a change record is named <YYYY-MM-DD>-<slug>.yaml`);
  let raw: unknown;
  try { raw = parseYaml(text); } catch (e) {
    errors.push(`${file}: not YAML (${(e as Error).message})`);
    return { dispositions, errors };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${file}: a change record is a mapping with date, summary and impact`);
    return { dispositions, errors };
  }
  const rec = raw as Record<string, unknown>;
  const date = rec.date instanceof Date ? rec.date.toISOString().slice(0, 10) : String(rec.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(`${file}: date is YYYY-MM-DD`);
  else if (CHANGE_RECORD_RE.test(name) && !name.startsWith(date)) errors.push(`${file}: date ${date} does not match the file name`);
  if (!String(rec.summary ?? "").trim()) errors.push(`${file}: summary says in one line what the pull request changes`);
  const impact = rec.impact ?? [];
  if (!Array.isArray(impact)) {
    errors.push(`${file}: impact is a list`);
    return { dispositions, errors };
  }
  impact.forEach((e, i) => {
    const where = `${file} impact[${i}]`;
    if (!e || typeof e !== "object") { errors.push(`${where}: an entry is {changed, fingerprint, flagged, applies | not_applicable}`); return; }
    const r = e as Record<string, unknown>;
    const changed = String(r.changed ?? "");
    const flagged = String(r.flagged ?? "");
    const fingerprint = String(r.fingerprint ?? "");
    const applies = r.applies === undefined ? undefined : String(r.applies ?? "");
    const notApplicable = r.not_applicable === undefined ? undefined : String(r.not_applicable ?? "");
    if (!changed || !flagged) errors.push(`${where}: names the changed and the flagged item`);
    if (!/^fp\d+-[0-9a-f]+$/.test(fingerprint)) errors.push(`${where}: records the changed item's fingerprint (fp1-...)`);
    if ((applies === undefined) === (notApplicable === undefined)) {
      errors.push(`${where}: records exactly one of applies or not_applicable`);
    } else if (!(applies ?? notApplicable ?? "").trim()) {
      errors.push(`${where}: ${applies !== undefined ? "applies says how it is fixed in this pull request" : "not_applicable gives the reason"}`);
    }
    for (const k of Object.keys(r)) {
      if (!["changed", "fingerprint", "flagged", "applies", "not_applicable"].includes(k)) errors.push(`${where}: unknown field "${k}"`);
    }
    dispositions.push({
      changed, fingerprint, flagged, file,
      ...(applies !== undefined ? { applies } : {}),
      ...(notApplicable !== undefined ? { not_applicable: notApplicable } : {}),
    });
  });
  return { dispositions, errors };
}

export interface ImpactReconciliation {
  /** flags with no disposition for the current fingerprint: block. */
  open: ImpactFlag[];
  /** flags with a disposition. */
  settled: Array<{ flag: ImpactFlag; disposition: ImpactDisposition }>;
  /** dispositions that settle no current flag (the changed item changed
   *  again since, so its fingerprint moved; or the flag no longer arises):
   *  reported so they do not go stale silently. */
  stale: string[];
}

/** Matches the dispositions against the flags. A disposition settles a flag
 *  only when changed, flagged and fingerprint all match. */
export function reconcileImpact(flags: readonly ImpactFlag[], dispositions: readonly ImpactDisposition[]): ImpactReconciliation {
  const key = (c: string, f: string, fp: string) => `${c}>${f}@${fp}`;
  const byKey = new Map<string, ImpactDisposition>();
  for (const d of dispositions) byKey.set(key(d.changed, d.flagged, d.fingerprint), d);
  const open: ImpactFlag[] = [];
  const settled: ImpactReconciliation["settled"] = [];
  const used = new Set<string>();
  for (const f of flags) {
    const k = key(f.changed, f.flagged, f.fingerprint);
    const d = byKey.get(k);
    if (d) { settled.push({ flag: f, disposition: d }); used.add(k); } else open.push(f);
  }
  const current = new Map(flags.map((f) => [`${f.changed}>${f.flagged}`, f.fingerprint]));
  const stale: string[] = [];
  for (const d of dispositions) {
    const k = key(d.changed, d.flagged, d.fingerprint);
    if (used.has(k)) continue;
    const now = current.get(`${d.changed}>${d.flagged}`);
    stale.push(now
      ? `${d.file}: ${d.changed} -> ${d.flagged} was dispositioned at ${d.fingerprint}, but ${d.changed} is now ${now}; review it again`
      : `${d.file}: ${d.changed} -> ${d.flagged} is no longer flagged; remove the entry`);
  }
  return { open, settled, stale };
}

/** A paste-ready change-record line for an open flag; the reason is left
 *  empty, which the check refuses until it is written. */
export function dispositionStub(f: ImpactFlag): string {
  return `  - {changed: ${f.changed}, fingerprint: ${f.fingerprint}, flagged: ${f.flagged}, not_applicable: ""}  # ${f.flaggedIdentifier}: ${f.signals.join("; ")}`;
}

function byId(a: string, b: string): number {
  const n = (s: string) => Number(/(\d+)$/.exec(s)?.[1] ?? NaN);
  const pa = a.replace(/\d+$/, "");
  const pb = b.replace(/\d+$/, "");
  return pa === pb && !Number.isNaN(n(a)) && !Number.isNaN(n(b)) ? n(a) - n(b) : a.localeCompare(b);
}
