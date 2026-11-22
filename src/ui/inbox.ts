/* The approvals inbox's data, apart from its page: the rows waiting on one
 * approval role, grouped by program and chapter and then by kind, each with
 * what changed in plain words, the outcomes and stored households it
 * affects, its flags (statute over rule, unverified text), and the change-
 * tray entries an action stages. The approval policy itself (who must sign,
 * and the status a signature sets) is ./approvals.ts. */
import type { Engine } from "../engine/engine";
import type { HouseholdCase } from "../engine/cases";
import type { Item, VolumeMeta } from "../engine/types";
import { paramInForce } from "../engine/versions";
import type { Source } from "../ledger/markdown";
import { isUnchanged, type ChangeEntry, type ChangeSet, type FileEntry } from "../changes/types";
import {
  approvalStatus, hasSigned, outcomeCones, signItem, upstreamOf, whyRequired,
  type ItemStatus, type Signature, type SignAction,
} from "./approvals";
import { plainRule, plainText } from "./plain";
import { formatDate, formatValue } from "./present";
import { unverifiedIds } from "./provenance";
import { citedUnverified, outcomesAffected, restingIndex, restingOnUnverified } from "./counts";
import type { StoredResult } from "./questionEffects";

/* ------------------------------------------------------------------ kinds */

export type KindGroup = "figure" | "rule" | "input";

/** Figures first, then rules, then inputs: a figure is what an approver
 *  checks against the published text, a rule reads figures, an input is
 *  what a rule reads about a person. */
export const KIND_ORDER: KindGroup[] = ["figure", "rule", "input"];

export const KIND_GROUP_LABEL: Record<KindGroup, string> = {
  figure: "Figures set by policy",
  rule: "Rules",
  input: "Facts supplied about a person",
};

export const KIND_ONE: Record<KindGroup, string> = {
  figure: "Figure", rule: "Rule", input: "Input",
};

export function kindGroup(it: Pick<Item, "kind">): KindGroup {
  return it.kind === "parameter" ? "figure" : it.kind === "derived" ? "rule" : "input";
}

/* ----------------------------------------------------------- plain diffs */

export interface ChangeLine {
  /** What changed, in words: "Figure from July 1, 2026", "Meaning". */
  what: string;
  before?: string;
  after?: string;
}

function str(v: unknown): string {
  return v === undefined || v === null ? "" : typeof v === "string" ? v : JSON.stringify(v);
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function listDiff(what: string, a: readonly string[] = [], b: readonly string[] = []): ChangeLine[] {
  const added = b.filter((x) => !a.includes(x));
  const removed = a.filter((x) => !b.includes(x));
  const out: ChangeLine[] = [];
  if (added.length) out.push({ what: `${what} added`, after: added.join(", ") });
  if (removed.length) out.push({ what: `${what} removed`, before: removed.join(", ") });
  return out;
}

function ruleText(engine: Engine, it: Item): string {
  try {
    return plainText(plainRule(engine, it)) || engine.compact(it.derived!);
  } catch {
    return str(it.derived);
  }
}

/** What changed between two versions of an item, in plain words, one line
 *  per change. The signature fields (status, approval) are left out: the
 *  inbox shows a staged signature on its own. */
export function plainChanges(engine: Engine, before: Item, after: Item): ChangeLine[] {
  const out: ChangeLine[] = [];
  const text = (what: string, a?: string, b?: string) => {
    if ((a ?? "") !== (b ?? "")) out.push({ what, before: a || "(none)", after: b || "(none)" });
  };
  text("Name", before.name, after.name);
  text("Meaning", before.meaning, after.meaning);
  if (before.kind !== after.kind) text("Kind", before.kind, after.kind);
  if (before.type !== after.type) text("Type", before.type, after.type);
  if (before.program !== after.program) text("Program", before.program, after.program);
  if (!same(before.options, after.options)) {
    out.push(...listDiff("Possible results", before.options, after.options)
      .map((l) => ({ ...l, after: l.after && l.after.split(", ").map((o) => formatValue(after, o)).join(", "),
        before: l.before && l.before.split(", ").map((o) => formatValue(before, o)).join(", ") })));
  }
  if (!same(before.value, after.value)) {
    out.push({ what: "Figure", before: formatValue(before, before.value), after: formatValue(after, after.value) });
  }
  if (!same(before.versions, after.versions)) {
    const bv = new Map((before.versions ?? []).map((v) => [v.from, v]));
    const av = new Map((after.versions ?? []).map((v) => [v.from, v]));
    for (const [from, v] of av) {
      const old = bv.get(from);
      if (!old) {
        out.push({ what: `New figure from ${formatDate(from)}`, after: formatValue(after, v.value) });
      } else if (!same(old.value, v.value)) {
        out.push({ what: `Figure from ${formatDate(from)}`, before: formatValue(before, old.value), after: formatValue(after, v.value) });
      } else if ((old.to ?? "") !== (v.to ?? "")) {
        out.push({
          what: `End of the figure from ${formatDate(from)}`,
          before: old.to ? formatDate(old.to) : "no end", after: v.to ? formatDate(v.to) : "no end",
        });
      }
    }
    for (const [from, v] of bv) {
      if (!av.has(from)) out.push({ what: `Figure from ${formatDate(from)} removed`, before: formatValue(before, v.value) });
    }
  }
  if (!same(before.derived, after.derived)) {
    out.push({ what: "Rule", before: before.derived ? ruleText(engine, before) : "(none)", after: after.derived ? ruleText(engine, after) : "(none)" });
  }
  text("Statute over rule", before.statute_override, after.statute_override);
  text("Assumption", before.assumption, after.assumption);
  text("Precision", before.precision, after.precision);
  if (!same(before.effective, after.effective)) {
    const r = (e?: Item["effective"]) => (e ? `${formatDate(e.from)} to ${e.to === "present" ? "no end" : formatDate(e.to)}` : "always");
    out.push({ what: "In force", before: r(before.effective), after: r(after.effective) });
  }
  out.push(...listDiff("Sources", before.sources, after.sources));
  out.push(...listDiff("Tags", before.tags, after.tags));
  out.push(...listDiff("Open questions", before.open, after.open));
  const bt = (before.tests ?? []).length;
  const at = (after.tests ?? []).length;
  if (!same(before.tests, after.tests)) {
    out.push({ what: "Examples", before: `${bt} example${bt === 1 ? "" : "s"}`, after: `${at} example${at === 1 ? "" : "s"}${at === bt ? ", edited" : ""}` });
  }
  return out;
}

/** The item without its signature fields, to tell a staged signature from a
 *  staged edit. */
function unsigned(it: Item): Item {
  const { status: _s, approval: _a, ...rest } = it;
  return rest as Item;
}

/* ------------------------------------------------------------ the rows */

export interface ReviewNote {
  id: string;
  role: string;
  by: string;
  date: string;
  text: string;
}

export interface Staged {
  /** The tray entry for this item, if any. */
  entry: ChangeEntry | null;
  /** The tray holds this role's signature on the item. */
  signed: boolean;
  /** The status the staged item would carry. */
  status: ItemStatus | null;
  /** An edit to the item's content (not only its signatures) is staged. */
  edited: boolean;
  /** A request for changes from this role, staged in the tray. */
  note: ReviewNote | null;
}

export interface ItemChange {
  /** staged: an edit in this browser's tray; proposed: the open pull request
   *  changes it; new: never approved; approved: approved and unchanged. */
  kind: "staged" | "proposed" | "new" | "approved";
  lines: ChangeLine[];
}

export interface InboxRow {
  item: Item;
  program: string;
  chapter: string;
  kind: KindGroup;
  status: ItemStatus;
  /** The role this inbox is for has signed the item (in the ledger). */
  signed: boolean;
  required: string[];
  missing: string[];
  why: string[];
  /** Declared outcomes the item affects through the rules (counts.ts
   *  `outcomesAffected`: a path only through verification flags left out). */
  outcomes: string[];
  /** Stored households with a result that rests on the item (its trace
   *  passes through it): counts.ts, the same count the role page and the
   *  question pages give. Empty until the traces are worked out. */
  households: string[];
  /** The stored results behind `households`. */
  resting: StoredResult[];
  /** Whether `resting` was worked out (false while a page fills it in). */
  restingKnown: boolean;
  /** Unverified excerpts the item itself cites. */
  unverifiedCited: string[];
  /** The item rests on an unverified excerpt (its own, or upstream). */
  restsOnUnverified: boolean;
  override: string | null;
  change: ItemChange;
  staged: Staged;
}

export interface InboxInputs {
  engine: Engine;
  role: string;
  sources: readonly Source[];
  cases: readonly HouseholdCase[];
  chapterOf: Readonly<Record<string, string>>;
  changeSet: ChangeSet | null;
  /** The pull request's base items, when the page shows a pull request. */
  proposedBase?: readonly Item[] | null;
  /** counts.ts `restingIndex` for the engine and cases; worked out here when
   *  absent, left out (households empty) when null, so a page can paint
   *  first and fill the households in after. */
  resting?: Map<string, StoredResult[]> | null;
}

/** Unverified upstream (counts.ts, the one definition). */
export { citedUnverified, restingOnUnverified } from "./counts";

/** The review notes staged in the tray (the files `reviewNotesFile` writes). */
export function stagedNotes(cs: ChangeSet | null): ReviewNote[] {
  const out: ReviewNote[] = [];
  for (const f of cs?.files ?? []) {
    if (!isReviewNotesPath(f.path) || !f.after) continue;
    out.push(...parseReviewNotes(f.after));
  }
  return out;
}

export function inboxRows(inp: InboxInputs): InboxRow[] {
  const { engine, role } = inp;
  const unverified = unverifiedIds([...inp.sources]);
  const tainted = restingOnUnverified(engine, unverified);
  const resting = inp.resting === undefined ? restingIndex(engine, inp.cases) : inp.resting;
  const entries = new Map((inp.changeSet?.entries ?? []).map((e) => [e.id, e]));
  const notes = new Map(stagedNotes(inp.changeSet).filter((n) => n.role === role).map((n) => [n.id, n]));
  const proposed = inp.proposedBase ? new Map(inp.proposedBase.map((i) => [i.id, i])) : null;
  const rows: InboxRow[] = [];
  for (const it of engine.items()) {
    const a = approvalStatus(engine, it);
    if (!a.required.includes(role)) continue;
    const outcomes = outcomesAffected(engine, it.identifier);
    const rest = resting?.get(it.identifier) ?? [];
    const houseIds = new Set(rest.map((x) => x.caseId));
    const entry = entries.get(it.id) ?? null;
    const stagedAfter = entry?.after ?? null;
    const stagedSig = stagedAfter && !hasSigned(it, role) && hasSigned(stagedAfter, role);
    const edited = !!(entry && entry.before && entry.after && !isUnchanged({ ...entry, before: unsigned(entry.before), after: unsigned(entry.after) }));
    let change: ItemChange;
    if (edited && entry?.before && entry.after) {
      change = { kind: "staged", lines: plainChanges(engine, entry.before, entry.after) };
    } else if (proposed && (!proposed.has(it.id) || !same(unsigned(proposed.get(it.id)!), unsigned(it)))) {
      const base = proposed.get(it.id);
      change = base
        ? { kind: "proposed", lines: plainChanges(engine, base, it) }
        : { kind: "proposed", lines: [{ what: "New item in this pull request" }] };
    } else if (a.status === "Approved") {
      change = { kind: "approved", lines: [] };
    } else {
      change = { kind: "new", lines: [] };
    }
    rows.push({
      item: it,
      program: it.program,
      chapter: inp.chapterOf[it.id] ?? "",
      kind: kindGroup(it),
      status: a.status,
      signed: hasSigned(it, role),
      required: a.required,
      missing: a.missing,
      why: whyRequired(engine, it, role),
      outcomes,
      households: inp.cases.filter((c) => houseIds.has(c.id)).map((c) => c.id),
      resting: rest,
      restingKnown: resting !== null,
      unverifiedCited: citedUnverified(it, unverified),
      restsOnUnverified: tainted.has(it.identifier),
      override: it.statute_override ?? null,
      change,
      staged: {
        entry,
        signed: Boolean(stagedSig),
        status: stagedAfter?.status ?? (stagedAfter ? "Draft" : null),
        edited,
        note: notes.get(it.id) ?? null,
      },
    });
  }
  return rows;
}

/* ------------------------------------------------------------- filters */

export type Show = "awaiting" | "signed" | "all";

export interface InboxFilter {
  show: Show;
  status: ItemStatus | "";
  program: string;
  tag: string;
  blocksOutcome: boolean;
  unverified: boolean;
  /** Words matched against the item's name, meaning, id and identifier. */
  text: string;
  /** Only the items this browser has staged something on. */
  staged: boolean;
}

export const NO_FILTER: InboxFilter = {
  show: "awaiting", status: "", program: "", tag: "", blocksOutcome: false, unverified: false,
  text: "", staged: false,
};

/** The tags the inbox filters by: the ones that bring in Legal. */
export const FILTER_TAGS = ["legal", "immigration", "state_election"] as const;

export function filterFromParams(p: Readonly<Record<string, string>>): InboxFilter {
  const show = p.show === "signed" || p.show === "all" ? p.show : "awaiting";
  const status = p.status === "Draft" || p.status === "Reviewed" || p.status === "Approved" ? p.status : "";
  return {
    show, status, program: p.program ?? "", tag: p.tag ?? "",
    blocksOutcome: p.blocks === "1", unverified: p.unverified === "1",
    text: p.q ?? "", staged: p.staged === "1",
  };
}

export function filterToParams(f: InboxFilter): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.show !== "awaiting") out.show = f.show;
  if (f.status) out.status = f.status;
  if (f.program) out.program = f.program;
  if (f.tag) out.tag = f.tag;
  if (f.blocksOutcome) out.blocks = "1";
  if (f.unverified) out.unverified = "1";
  if (f.text.trim()) out.q = f.text;
  if (f.staged) out.staged = "1";
  return out;
}

/** Whether this browser has staged anything on the row: an edit, a
 *  signature or a request for changes. */
export function isStagedRow(row: InboxRow): boolean {
  return Boolean(row.staged.entry || row.staged.note);
}

/** Whether the row's content change (an edit, or a new item) was staged in
 *  this browser: the change is the reader's own. */
export function isOwnStagedChange(row: Pick<InboxRow, "staged">): boolean {
  const e = row.staged.entry;
  return row.staged.edited || Boolean(e && !e.before && e.after);
}

/** Whether the reader may sign the row as this role: not signed yet, no
 *  signature staged, and not a change the reader staged themselves (the
 *  evaluators could approve their own staged change; nobody signs their
 *  own proposal). */
export function canSign(row: Pick<InboxRow, "signed" | "staged">): boolean {
  return !row.signed && !row.staged.signed && !isOwnStagedChange(row);
}

/** Every word of the search is in the item's name, meaning, id or
 *  identifier (any order, any case). */
export function textMatches(it: Item, text: string): boolean {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${it.name} ${it.meaning ?? ""} ${it.id} ${it.identifier} ${(it.tags ?? []).join(" ")}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function matches(row: InboxRow, f: InboxFilter): boolean {
  if (f.staged) return isStagedRow(row) && textMatches(row.item, f.text);
  if (f.show === "awaiting" && row.signed) return false;
  if (f.show === "signed" && !row.signed) return false;
  if (f.status && row.status !== f.status) return false;
  if (f.program && row.program !== f.program) return false;
  if (f.tag && !(row.item.tags ?? []).includes(f.tag)) return false;
  if (f.blocksOutcome && !row.outcomes.length) return false;
  if (f.unverified && !row.unverifiedCited.length) return false;
  if (f.text && !textMatches(row.item, f.text)) return false;
  return true;
}

/* ------------------------------------------------------------- groups */

export interface KindBlock { kind: KindGroup; rows: InboxRow[] }

export interface InboxGroup {
  key: string;
  program: string;
  chapter: string;
  rows: InboxRow[];
  kinds: KindBlock[];
}

/** Rows grouped by program (in `programOrder`), then chapter, then kind
 *  (figures, rules, inputs); ledger order inside a kind. Inside a program, a
 *  chapter of figures comes before a chapter of rules, and a chapter of
 *  rules before a chapter of inputs, with ties in `chapterOrder` (the
 *  manifest's). */
export function groupRows(
  rows: readonly InboxRow[], programOrder: readonly string[], chapterOrder: readonly string[],
): InboxGroup[] {
  const groups = new Map<string, InboxGroup>();
  for (const r of rows) {
    const key = `${r.program}/${r.chapter}`;
    let g = groups.get(key);
    if (!g) { g = { key, program: r.program, chapter: r.chapter, rows: [], kinds: [] }; groups.set(key, g); }
    g.rows.push(r);
  }
  const rank = (xs: readonly string[], x: string) => {
    const i = xs.indexOf(x);
    return i < 0 ? xs.length : i;
  };
  const firstKind = (g: InboxGroup) => Math.min(...g.rows.map((r) => KIND_ORDER.indexOf(r.kind)));
  const out = [...groups.values()].sort((a, b) =>
    rank(programOrder, a.program) - rank(programOrder, b.program)
    || firstKind(a) - firstKind(b)
    || rank(chapterOrder, a.chapter) - rank(chapterOrder, b.chapter)
    || a.chapter.localeCompare(b.chapter));
  for (const g of out) {
    g.kinds = KIND_ORDER
      .map((kind) => ({ kind, rows: g.rows.filter((r) => r.kind === kind) }))
      .filter((k) => k.rows.length);
    g.rows = g.kinds.flatMap((k) => k.rows);
  }
  return out;
}

/** The programs in the order a role reads them: the programs the policy
 *  names the role for, then the items shared by all programs, then the
 *  rest in declared order. */
export function programOrderFor(meta: VolumeMeta, role: string, declared: readonly string[]): string[] {
  const own = Object.entries(meta.approval_policy?.by_program ?? {})
    .filter(([p, rs]) => p !== "All" && rs.includes(role)).map(([p]) => p);
  const ownSorted = declared.filter((p) => own.includes(p));
  return [...ownSorted, ...declared.filter((p) => p === "All"), ...declared.filter((p) => !ownSorted.includes(p) && p !== "All")];
}

/** Counts by one key, for the filter labels. */
export function countBy<T>(rows: readonly InboxRow[], key: (r: InboxRow) => T | T[]): Map<T, number> {
  const out = new Map<T, number>();
  for (const r of rows) {
    const k = key(r);
    for (const x of Array.isArray(k) ? k : [k]) out.set(x, (out.get(x) ?? 0) + 1);
  }
  return out;
}

/* ------------------------------------------------- figure in force today */

/** A source's citation as a reader names it: the legal cite without the
 *  address it was fetched from. */
export function citeLabel(citation: string): string {
  const s = citation.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").replace(/[\s.;,]+$/, "").trim();
  return s.length > 110 ? `${s.slice(0, 107)}…` : s;
}

/** A parameter's figure on `date` (a table stays a table), or undefined
 *  for a rule or an input. */
export function figureOn(engine: Engine, it: Item, date: string): unknown {
  if (it.kind !== "parameter") return undefined;
  return it.versions?.length ? paramInForce(it, date) : engine.paramValue(it);
}

/* ------------------------------------------------------------ staging */

/** The tray entries that sign `ids` as `sig.role`: each built on the tray's
 *  existing draft of the item when there is one (so a staged edit is signed
 *  as staged), with the status the approval policy gives it. Items already
 *  signed by the role are skipped. */
export function signatureEntries(
  base: Engine, cs: ChangeSet | null, chapterOf: Readonly<Record<string, string>>,
  ids: readonly string[], sig: Signature, action: SignAction, tainted: ReadonlySet<string>,
): ChangeEntry[] {
  const existing = new Map((cs?.entries ?? []).map((e) => [e.id, e]));
  const out: ChangeEntry[] = [];
  for (const id of ids) {
    const prior = existing.get(id);
    const before = prior ? prior.before : base.itemById(id) ?? null;
    const current = prior?.after ?? base.itemById(id);
    if (!current || !before) continue;
    if (hasSigned(before, sig.role)) continue;
    out.push({
      id, chapter: prior?.chapter ?? chapterOf[id] ?? "supplied", before,
      after: signItem(base, current, sig, action, tainted.has(current.identifier)),
    });
  }
  return out;
}

/** The tray entry with `role`'s staged signature taken back out, or null
 *  when nothing else is staged on the item (the entry is then discarded). */
export function withoutSignature(entry: ChangeEntry, role: string): ChangeEntry | null {
  if (!entry.after || !entry.before) return entry;
  const after: Item = { ...entry.after, approval: entry.before.approval, status: entry.before.status };
  if (after.approval === undefined) delete after.approval;
  if (after.status === undefined) delete after.status;
  const next = { ...entry, after };
  void role;
  return isUnchanged(next) ? null : next;
}

/* ----------------------------------------------- what a signature does */

function joinWords(xs: readonly string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** What staging `entries` (each the item with the new signature) does, in a
 *  sentence or two: the status each item takes and why, naming who else must
 *  still sign. "Status would be Reviewed" after Approve read as a downgrade
 *  (HCPF analyst task 3); this says the approval is recorded and the item
 *  stays Reviewed until the other roles approve. */
export function signatureNotice(
  engine: Engine, entries: readonly ChangeEntry[], sig: Signature, action: SignAction,
): string {
  const who = `${sig.role} (${sig.by}, ${sig.date})`;
  const what = action === "approve" ? "approval" : "review";
  const items = entries.map((e) => e.after).filter((x): x is Item => Boolean(x));
  const head = `Your ${what} as the ${who} is staged on ${items.length === 1 ? `"${items[0].name}"` : `${items.length.toLocaleString("en-US")} items`}.`;
  const reason = (it: Item): string => {
    const required = engine.approvals(it);
    const signed = new Set((it.approval ?? []).map((a) => a.role));
    const missing = required.filter((r) => !signed.has(r));
    const st = it.status ?? "Draft";
    if (st === "Approved") return "It becomes Approved: every role that must sign has signed.";
    if (st === "Draft") return "It stays Draft whoever signs, because it rests on text that is not a verified quotation.";
    if (action === "review") return `It becomes Reviewed: a review records your check but is not an approval.${missing.length ? ` Approval still needs ${joinWords(missing)}.` : ""}`;
    return missing.length
      ? `It becomes Reviewed, not yet Approved: ${joinWords(missing)} must also approve it.`
      : "It becomes Reviewed.";
  };
  if (items.length === 1) return `${head} ${reason(items[0])}`;
  const by = new Map<string, number>();
  for (const it of items) by.set(it.status ?? "Draft", (by.get(it.status ?? "Draft") ?? 0) + 1);
  const parts: string[] = [];
  const approved = by.get("Approved") ?? 0;
  const reviewed = by.get("Reviewed") ?? 0;
  const draft = by.get("Draft") ?? 0;
  if (approved) parts.push(`${approved.toLocaleString("en-US")} become Approved (every role has now signed)`);
  if (reviewed) parts.push(`${reviewed.toLocaleString("en-US")} become Reviewed, ${action === "approve" ? "waiting on other roles' approval" : "a review is not an approval"}`);
  if (draft) parts.push(`${draft.toLocaleString("en-US")} stay Draft (they rest on unverified text)`);
  return `${head} ${parts.join("; ")}. Each row says who else must sign.`;
}

/* ------------------------------------------------------- review notes */

const NOTES_DIR = "reviews";

export function isReviewNotesPath(path: string): boolean {
  return new RegExp(`/${NOTES_DIR}/[^/]+\\.md$`).test(path);
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** The review-notes file a role's requests for changes go in, one per change
 *  set: an existing staged file for the role is reused. */
export function reviewNotesPath(
  volumePath: string, role: string, date: string, cs: ChangeSet | null,
  suffix: () => string = () => Math.random().toString(36).slice(2, 8),
): string {
  const prefix = `${volumePath}/${NOTES_DIR}/${date}-${slug(role)}-`;
  const hit = (cs?.files ?? []).find((f) => f.path.startsWith(prefix));
  return hit ? hit.path : `${prefix}${suffix()}.md`;
}

const NOTE_HEAD = /^## (\S+) (.*)$/;
const NOTE_BY = /^Requested by (.*) \((.*)\), (\d{4}-\d{2}-\d{2})\.$/;

export function renderReviewNotes(role: string, notes: readonly ReviewNote[], names: (id: string) => string): string {
  const L = [`# Changes requested by the ${role}`, "",
    "Each note asks for a change to one item before this role signs it. Staged from the approvals inbox.", ""];
  for (const n of notes) {
    L.push(`## ${n.id} ${names(n.id)}`, "", `Requested by ${n.by} (${n.role}), ${n.date}.`, "", n.text.trim(), "");
  }
  return L.join("\n");
}

export function parseReviewNotes(md: string): ReviewNote[] {
  const out: ReviewNote[] = [];
  let cur: ReviewNote | null = null;
  const body: string[] = [];
  const flush = () => {
    if (cur) { cur.text = body.join("\n").trim(); out.push(cur); }
    body.length = 0;
  };
  for (const line of md.split("\n")) {
    const h = NOTE_HEAD.exec(line);
    if (h) { flush(); cur = { id: h[1], role: "", by: "", date: "", text: "" }; continue; }
    if (!cur) continue;
    const b = NOTE_BY.exec(line);
    if (b && !cur.role) { cur.by = b[1]; cur.role = b[2]; cur.date = b[3]; continue; }
    body.push(line);
  }
  flush();
  return out;
}

/** The file entry that adds (or replaces) `note` in its role's notes file. */
export function reviewNoteEntry(
  volumePath: string, cs: ChangeSet | null, note: ReviewNote, names: (id: string) => string,
  suffix?: () => string,
): FileEntry {
  const path = reviewNotesPath(volumePath, note.role, note.date, cs, suffix);
  const prior = (cs?.files ?? []).find((f) => f.path === path);
  const notes = (prior?.after ? parseReviewNotes(prior.after) : []).filter((n) => n.id !== note.id);
  notes.push(note);
  return {
    path, before: null, after: renderReviewNotes(note.role, notes, names),
    label: `Changes requested by the ${note.role} (${notes.length} item${notes.length === 1 ? "" : "s"})`,
  };
}

/** The notes file without the note on `id`, or null when it was the last. */
export function withoutReviewNote(
  file: FileEntry, id: string, names: (id: string) => string,
): FileEntry | null {
  const notes = parseReviewNotes(file.after ?? "").filter((n) => n.id !== id);
  if (!notes.length) return null;
  return {
    ...file, after: renderReviewNotes(notes[0].role, notes, names),
    label: `Changes requested by the ${notes[0].role} (${notes.length} item${notes.length === 1 ? "" : "s"})`,
  };
}

/* ------------------------------------------------- how it becomes a PR */

/** What the page says once an action is staged, by whether this browser can
 *  propose (a GitHub token is set). */
export function proposeHint(hasToken: boolean): string {
  return hasToken
    ? "Staged in the change tray. Open the tray and press Propose: that opens a pull request, and the signature is in the ledger once the pull request is merged."
    : "Staged in this browser only; nothing is signed in the ledger yet. It becomes a pull request when someone presses Propose in the change tray with a GitHub token (Settings). Without one, download the staged change below and send it to your codex steward, who proposes it for you. The signature is in the ledger once that pull request is merged.";
}
