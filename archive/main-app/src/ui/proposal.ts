/* My proposal (docs/design-unified-ui.md, "Proposal: Changes › My
 * proposal"): the structured editor's data, apart from its page.
 *
 * - A figure is changed one of two ways (Blind A's editor): ADD A NEW DATED
 *   VERSION (the law or the figure changes on a date; the version running
 *   then ends the day before) or CORRECT A VERSION (it was transcribed
 *   wrongly; its dates stay). `figureChange` builds the item either way.
 * - A change that changes nothing is refused (`refusal`): an unchanged item,
 *   or a new version whose figure is the one already in force then (Blind B
 *   queued both without a word).
 * - Who must approve (`proposalApprovers`): the approval policy's roles for
 *   every item the proposal changes, each with its reasons, and always the
 *   data steward who merges it. Nobody is offered Approve on their own
 *   change: a role the reader holds is marked `mine`, and the page says
 *   another person in that role signs.
 * - The excerpt picker (`excerptChoices`) names each excerpt by its title,
 *   never by its S-number.
 * Counts (what changes, the reach) come from counts.ts. */
import type { Engine } from "../engine/engine";
import type { Item, ItemVersion } from "../engine/types";
import type { ChangeEntry, ChangeSet } from "../changes/types";
import { isUnchanged } from "../changes/types";
import { applyChangeSet, isSignatureOnly } from "../changes/apply";
import { addVersion } from "../engine/item-block";
import { valuesEqual } from "../engine/values";
import { versionInForce } from "../engine/versions";
import type { Source } from "../ledger/markdown";
import type { Steward } from "../ledger/manifest";
import { whyRequired } from "./approvals";
import { formatDate, formatValue } from "./present";
import { programLabel } from "./roles";
import { buildHash, type Route } from "./router";

/** The address of the editor for one item: Changes › My proposal with the
 *  item chosen. The item page's "Propose a change" links here. */
export function proposeHref(r: Route, it: Pick<Item, "id">): string {
  return buildHash({ ...r, view: "changes", arg: "proposal", params: { item: it.id } });
}

// ---- a figure's versions

/** A figure's versions, oldest first. */
export function sortedVersions(it: Pick<Item, "versions">): ItemVersion[] {
  return [...(it.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from));
}

/** Whether the item is a figure the editor changes by value. */
export function isFigure(it: Pick<Item, "kind">): boolean {
  return it.kind === "parameter";
}

/** The version a correction starts on: the one in force on `date`, else the
 *  latest. -1 for a figure without dated versions. */
export function defaultVersionIndex(it: Pick<Item, "versions">, date: string): number {
  const vs = sortedVersions(it);
  if (!vs.length) return -1;
  const now = versionInForce({ versions: vs }, date);
  return now ? vs.indexOf(now) : vs.length - 1;
}

/** The value a figure holds on `date` (its version in force, or its single
 *  value), or the latest version's when none covers the date. */
export function valueOn(it: Item, date: string): unknown {
  if (!Array.isArray(it.versions)) return it.value ?? null;
  const vs = sortedVersions(it);
  const v = versionInForce({ versions: vs }, date);
  return (v ?? vs[vs.length - 1])?.value ?? null;
}

/** The first day of the month after `date`: where a new version starts by
 *  default. */
export function nextMonthStart(date: string): string {
  const [y, m] = date.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 10);
}

export type FigureMode = "new" | "correct";

export interface FigureDraft {
  mode: FigureMode;
  /** New version: its first day. */
  from: string;
  /** Correction: which version (index into `sortedVersions`); -1 for a
   *  figure with a single undated value. */
  version: number;
  value: unknown;
  /** The excerpt the value comes from (an S-id), or "" to keep. */
  source: string;
}

/** The figure as the draft changes it, or why it cannot be built. */
export function figureChange(it: Item, d: FigureDraft): Item | string {
  if (d.value === undefined || d.value === null || d.value === "") return "Give the new figure.";
  if (d.mode === "new") {
    const out = addVersion(it, { from: d.from, value: d.value, source: d.source || undefined });
    if (typeof out === "string") {
      return /already exists/.test(out)
        ? `A version already starts on ${formatDate(d.from)}. Choose "Correct the version from ${formatDate(d.from)}" to change it.`
        : out.replace("The period needs a start date, YYYY-MM-DD.", "Give the date the new version starts.");
    }
    return out;
  }
  if (d.version < 0 || !Array.isArray(it.versions)) {
    const out: Item = { ...it, value: d.value };
    if (d.source && !(it.sources ?? []).includes(d.source)) out.sources = [...(it.sources ?? []), d.source];
    return out;
  }
  const vs = sortedVersions(it);
  if (!vs[d.version]) return "Choose the version to correct.";
  return {
    ...it,
    versions: vs.map((v, i) => (i === d.version ? { ...v, value: d.value, ...(d.source ? { source: d.source } : {}) } : v)),
  };
}

/** The same new figure as a correction of the version in force the day
 *  before the new one starts: what it would do to the stored households on
 *  their own dates, which a version starting later cannot reach. */
export function asOfTheirDates(it: Item, d: FigureDraft): Item | null {
  if (d.mode !== "new") return null;
  const vs = sortedVersions(it);
  const before = vs.length ? versionInForce({ versions: vs }, dayBefore(d.from)) : null;
  const out = figureChange(it, { ...d, mode: "correct", version: before ? vs.indexOf(before) : -1, source: "" });
  return typeof out === "string" ? null : out;
}

function dayBefore(date: string): string {
  const t = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(t) ? date : new Date(t - 86_400_000).toISOString().slice(0, 10);
}

/** Why a change is refused because it changes nothing, or null. */
export function refusal(before: Item, after: Item, d?: FigureDraft): string | null {
  const entry: ChangeEntry = { id: before.id, chapter: "", before, after };
  if (isUnchanged(entry)) return "This changes nothing: the item would read exactly as it does now.";
  if (d?.mode === "new") {
    const prev = valueOn(before, dayBefore(d.from));
    if (prev !== null && valuesEqual(prev, d.value)) {
      return `This changes nothing: ${formatValue(before, prev)} is already the figure the day before ${formatDate(d.from)}. A new version needs a different figure.`;
    }
  }
  if (d?.mode === "correct") {
    const vs = sortedVersions(before);
    const old = d.version >= 0 && vs[d.version] ? vs[d.version].value : before.value;
    const sameSource = !d.source || (d.version >= 0 ? vs[d.version]?.source === d.source : (before.sources ?? []).includes(d.source));
    if (valuesEqual(old, d.value) && sameSource) return "This changes nothing: the figure is the one already recorded.";
  }
  return null;
}

/** The figure as if its version from `from` had kept the previous version's
 *  value: compared with the figure as it is, the stored results that differ
 *  are the ones the new version changed ("Compare with the previous
 *  version" on Changes). Null when no earlier version precedes it. */
export function withPreviousFigure(it: Item, from: string): Item | null {
  const vs = sortedVersions(it);
  const i = vs.findIndex((v) => v.from === from);
  if (i <= 0) return null;
  const prev = vs[i - 1];
  return { ...it, versions: vs.map((v, j) => (j === i ? { ...v, value: prev.value } : v)) };
}

// ---- what an entry does, in words

/** One staged entry in a sentence: "New version from July 1, 2027: $90 →
 *  $100", "Signature as Cash programs policy owner", "New item". */
export function describeEntry(e: ChangeEntry): string {
  if (!e.before && e.after) return "New item";
  if (e.before && !e.after) return "Removed";
  const b = e.before!;
  const a = e.after!;
  if (isSignatureOnly(e)) {
    const added = (a.approval ?? []).filter((s) => !(b.approval ?? []).some((x) => x.role === s.role && x.date === s.date));
    return added.length ? `Signature as ${added.map((s) => s.role).join(", ")}` : "Signature";
  }
  if (isUnchanged(e)) return "No change";
  if (b.kind === "parameter") {
    const bv = sortedVersions(b);
    const av = sortedVersions(a);
    const fresh = av.filter((v) => !bv.some((x) => x.from === v.from));
    const last = fresh[fresh.length - 1];
    if (last) {
      const prev = valueOn(b, dayBefore(last.from));
      return `New version from ${formatDate(last.from)}: ${formatValue(b, prev)} → ${formatValue(a, last.value)}`;
    }
    const fixed = av.find((v) => { const o = bv.find((x) => x.from === v.from); return o && !valuesEqual(o.value, v.value); });
    if (fixed) {
      const o = bv.find((x) => x.from === fixed.from)!;
      return `Corrects the version from ${formatDate(fixed.from)}: ${formatValue(b, o.value)} → ${formatValue(a, fixed.value)}`;
    }
    if (!Array.isArray(a.versions) && !valuesEqual(b.value, a.value)) {
      return `Corrects the figure: ${formatValue(b, b.value)} → ${formatValue(a, a.value)}`;
    }
  }
  if ((b.effective?.from ?? "") !== (a.effective?.from ?? "") || (b.effective?.to ?? "") !== (a.effective?.to ?? "")) {
    return `In force from ${a.effective?.from ? formatDate(a.effective.from) : "always"}${a.effective?.to && a.effective.to !== "present" ? ` to ${formatDate(a.effective.to)}` : ""}`;
  }
  if ((b.meaning ?? "") !== (a.meaning ?? "")) return "Meaning reworded";
  return "Edit";
}

// ---- the excerpt picker

export interface ExcerptChoice {
  id: string;
  /** The excerpt's title (its citation when it has none): what the picker
   *  shows. */
  label: string;
  citation: string;
  /** The item already cites it. */
  cited: boolean;
}

/** Excerpts to cite for a figure's new value: those the item already cites
 *  first, then the other excerpts of the same documents, by title. */
export function excerptChoices(it: Item, sources: readonly Source[]): ExcerptChoice[] {
  const own = new Set([...(it.sources ?? []), ...(it.versions ?? []).map((v) => v.source).filter((s): s is string => !!s)]);
  const docs = new Set(sources.filter((s) => own.has(s.id) && s.document).map((s) => s.document!));
  const pick = (s: Source, cited: boolean): ExcerptChoice => ({
    id: s.id, label: (s.title || s.citation).trim(), citation: s.citation, cited,
  });
  const first = sources.filter((s) => own.has(s.id)).map((s) => pick(s, true));
  const more = sources.filter((s) => !own.has(s.id) && s.document && docs.has(s.document)).map((s) => pick(s, false));
  return [...first, ...more.sort((a, b) => a.label.localeCompare(b.label))];
}

// ---- who must approve

export interface Approver {
  role: string;
  /** Why, one line each: "Colorado Works earned income disregard: it is a
   *  Colorado Works item". */
  reasons: string[];
  /** One of the reader's own roles: the page never offers them Approve. */
  mine: boolean;
  /** The data steward who merges the proposal. */
  steward: boolean;
}

export const STEWARD_ROLE = "Data steward";

/** Who must approve the proposal: every role the approval policy names for
 *  an item it changes (on the codex with the proposal applied), with the
 *  reasons, then the data steward who merges it. A signature-only entry
 *  needs no further signature, only the merge. */
export function proposalApprovers(
  engine: Engine, cs: Pick<ChangeSet, "entries">,
  opts: { steward: Steward | null; myRoles: readonly string[] },
): Approver[] {
  const applied = cs.entries.length
    ? engine.withItems(applyChangeSet(engine.items(), { volume: "", baseRef: "", branch: null, prNumber: null, entries: [...cs.entries] }))
    : engine;
  const by = new Map<string, Set<string>>();
  const add = (role: string, why: string) => {
    const s = by.get(role) ?? new Set<string>();
    s.add(why);
    by.set(role, s);
  };
  for (const e of cs.entries) {
    if (isSignatureOnly(e) || isUnchanged(e)) continue;
    const it = e.after ?? e.before;
    if (!it) continue;
    const on = e.after ? applied : engine;
    for (const role of on.approvals(it)) {
      const why = whyRequired(on, it, role).map(programWords);
      add(role, `${it.name}: ${why.length ? why.join("; ") : "the approval policy names this role for it"}`);
    }
  }
  const out: Approver[] = [...by.entries()]
    .filter(([role]) => role !== STEWARD_ROLE)
    .map(([role, why]) => ({ role, reasons: [...why], mine: opts.myRoles.includes(role), steward: false }));
  if (cs.entries.length) {
    const named = opts.steward ? ` (${opts.steward.name}${opts.steward.contact ? `, ${opts.steward.contact}` : ""})` : "";
    out.push({
      role: STEWARD_ROLE,
      reasons: [`merges the reviewed proposal into the codex${named}`, ...(by.get(STEWARD_ROLE) ?? [])],
      mine: opts.myRoles.includes(STEWARD_ROLE),
      steward: true,
    });
  }
  return out;
}

/** "it is a ColoradoWorks item" -> "it is a Colorado Works item". */
function programWords(s: string): string {
  return s.replace(/\b(a|an) ([A-Za-z+]+) item\b/g, (m, art: string, p: string) => {
    const label = programLabel(p);
    return label === p ? m : `${/^[AEIOU]/i.test(label) ? "an" : "a"} ${label} item`;
  }).replace(/^([A-Za-z+, ]+) outcomes read it$/, (m, ps: string) =>
    `${ps.split(/, | and /).map((p) => programLabel(p.trim())).join(", ")} outcomes read it`);
}
