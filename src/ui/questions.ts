/* Open questions as records a page can show: status read from the heading
 * ("Resolved:", "Partly resolved:", or neither), the items they touch, and the
 * programs those items belong to. Shared by the question page, search and
 * the decision-queue view.
 *
 * The decision queue (phase 13) adds what a policy or legal reader needs to
 * decide one: its class (why it is still open), who owns the answer, the
 * reading the codex applies meanwhile, the rule text it turns on, and the
 * program outcomes it reaches. None of these is a field in open-questions.md;
 * each is read from the question's own text, its items and volume.yaml, and
 * an explicit `Class:`, `Owner:` or `Assumption:` line in a question's body
 * takes precedence over the reading. */
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import type { OpenQuestion, Source } from "../ledger/markdown";

export type QuestionStatus = "open" | "partly" | "resolved";

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  open: "Open",
  partly: "Partly resolved",
  resolved: "Resolved",
};

export interface QuestionInfo {
  id: string;
  /** The heading without its status prefix. */
  title: string;
  /** The heading as written. */
  rawTitle: string;
  body: string;
  status: QuestionStatus;
  /** Items the question names (its "Items:" line) or that name it (`open`),
   *  in ledger order. */
  items: Item[];
  /** The distinct programs of those items, in first-seen order. */
  programs: string[];
}

const PREFIX = /^(partly resolved|resolved)\b[^:]*:\s*/i;

/** A question's status, from the convention docs/reviews/open-question-status.md
 *  states: "Resolved:" when every part is settled, "Partly resolved:" when a
 *  part is open, and no prefix while it is open. */
export function questionStatus(q: Pick<OpenQuestion, "title">): QuestionStatus {
  const m = PREFIX.exec(q.title.trim());
  if (!m) return "open";
  return m[1].toLowerCase().startsWith("partly") ? "partly" : "resolved";
}

export function plainQuestionTitle(title: string): string {
  const t = title.trim().replace(PREFIX, "");
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

export function questionInfo(engine: Engine, q: OpenQuestion): QuestionInfo {
  const named = new Set(q.items ?? []);
  const items = engine.items().filter((it) => named.has(it.id) || (it.open ?? []).includes(q.id));
  const programs: string[] = [];
  for (const it of items) if (!programs.includes(it.program)) programs.push(it.program);
  return {
    id: q.id, title: plainQuestionTitle(q.title), rawTitle: q.title, body: q.body,
    status: questionStatus(q), items, programs,
  };
}

export function questionInfos(engine: Engine, questions: readonly OpenQuestion[]): QuestionInfo[] {
  return questions.map((q) => questionInfo(engine, q));
}

/** Whether a question still needs an answer: open, or partly resolved. */
export function isOpen(status: QuestionStatus): boolean {
  return status !== "resolved";
}

// ---- the question's text, paragraph by paragraph

export interface QuestionNote {
  /** The note's heading as the ledger writes it ("Checked 2026-11-21",
   *  "Open-question sweep (2026-11-21)"), or null for the question as first
   *  written. */
  label: string | null;
  text: string;
}

const NOTE_LABEL_WORDS = /\b(round|sweep|review|pass|phase|checked|resolution|audit|answer)\b/i;

/** The explicit lines a question may state (`Class:`, `Owner:`,
 *  `Assumption:`, `Blocked on:`); the queue shows each in its own place. */
export const EXPLICIT_FIELDS = ["Class", "Owner", "Assumption", "Blocked on"] as const;
const FIELD_LINE = new RegExp(`^(?:${EXPLICIT_FIELDS.join("|")}):\\s`);

/** The body as notes: the question as first written, then each later note
 *  with its label split off, in the order the ledger keeps them. A paragraph
 *  made only of explicit field lines is not a note. */
export function questionNotes(body: string): QuestionNote[] {
  const out: QuestionNote[] = [];
  for (const raw of body.split(/\n{2,}/)) {
    const lines = raw.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length && lines.every((l) => FIELD_LINE.test(l))) continue;
    let text = raw.trim().replace(/\s*\n\s*/g, " ");
    if (!text) continue;
    if (/^Body:\s*/.test(text)) {
      out.push({ label: null, text: text.replace(/^Body:\s*/, "") });
      continue;
    }
    let label: string | null = null;
    // A note may carry two labels ("Open-question sweep (2026-11-21):
    // Checked 2026-11-21: ..."): both come off, the check last, since it says
    // what kind of note this is.
    for (let i = 0; i < 2; i++) {
      const m = /^([^:]{3,110}):\s+/.exec(text);
      if (!m || /\.\s/.test(m[1]) || !NOTE_LABEL_WORDS.test(m[1])) break;
      label = label && !/^checked/i.test(m[1]) ? label : m[1].trim();
      text = text.slice(m[0].length);
    }
    out.push({ label: out.length === 0 && !label ? null : label ?? "Note", text });
  }
  return out;
}

const NO_BREAK_AFTER = /(?:\b(?:Pub|L|No|Nos|sec|Sec|secs|U\.S|C\.F\.R|Stat|v|e\.g|i\.e|Inc|art|para|ch|cf|Dr|St|Ms|Mr|approx|Jan|Feb|Mar|Apr|Aug|Sept|Oct|Nov|Dec|vs|al)|\b[A-Z])\.$/;

/** A paragraph's sentences. Legal citations ("Pub. L. 119-21", "42 U.S.C.
 *  1396b", "§ 8.100.4.C.") are not sentence ends. */
export function sentences(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  // A sentence can open with a capital, a quotation, a section sign, a
  // paragraph number ("3.540 (S458) ...") or an item's identifier.
  // A semicolon ends one only before a capital.
  const parts = text.split(/(?<=[.?!])\s+(?=[A-Z0-9§("“'`]|[a-z][a-z0-9]*_)|(?<=;)\s+(?=[A-Z])/);
  for (const p of parts) {
    cur = cur ? `${cur} ${p}` : p;
    if (!NO_BREAK_AFTER.test(cur.trim())) { out.push(cur.trim()); cur = ""; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** An explicit `Key: value` line in the body (`Class:`, `Owner:`,
 *  `Assumption:`), for questions that state it outright. */
export function explicitField(body: string, key: string): string | null {
  const m = new RegExp(`^${key}:\\s*(.+)$`, "mi").exec(body);
  return m ? m[1].trim() : null;
}

/** The text that says what is still open: the heading's "open: ..." part, the
 *  original question while nothing later settled part of it, and the two
 *  latest notes. */
function openPartText(q: Pick<QuestionInfo, "rawTitle" | "body" | "status">): string {
  const notes = questionNotes(q.body);
  const open = /\bopen:\s*(.*)$/i.exec(q.rawTitle);
  const recent = notes.slice(-2).map((n) => n.text);
  const first = q.status === "open" && notes.length ? [notes[0].text] : [];
  return [open ? open[1] : q.rawTitle, ...first, ...recent].join("\n");
}

// ---- class

export type QuestionClass = "policy" | "blocked" | "legal" | "ledger";

export const QUESTION_CLASSES: QuestionClass[] = ["policy", "blocked", "legal", "ledger"];

export const QUESTION_CLASS_LABEL: Record<QuestionClass, string> = {
  policy: "State policy choice",
  blocked: "Blocked on a named document",
  legal: "Needs Legal",
  ledger: "Ledger design",
};

export const QUESTION_CLASS_BLURB: Record<QuestionClass, string> = {
  policy: "The published text leaves the reading to Colorado: an unpublished State plan election, a county figure, or an ambiguity only the agency can settle.",
  blocked: "The text that would settle it exists but could not be read: it is published only on a site this project cannot fetch, or not fetched yet.",
  legal: "A statute and a Colorado rule point different ways, or the codex follows a statute over the rule: a legal reading is needed.",
  ledger: "The rule is clear enough; what is open is how the codex represents it (a missing fact, a relationship, the structure).",
};

const LEGAL_TEXT = new RegExp([
  String.raw`overrid`, String.raw`preempt`,
  String.raw`has not been amended`, String.raw`has not (?:yet )?(?:implemented|adopted)`,
  String.raw`(?:statute|U\.S\.C\.|C\.R\.S\.|federal (?:rule|text|definition|law)|42 CFR|7 CFR)[^.]{0,160}\b(?:conflict|reconcile|go the other way|differ)`,
  String.raw`\b(?:conflict|reconcile)[^.]{0,120}(?:statute|U\.S\.C\.|C\.R\.S\.|federal)`,
  String.raw`statute read alone`,
].join("|"), "i");

const BLOCKED_TEXT = /refused|access denied|served only from|(?:is|are) (?:published )?(?:only )?on (?:hcpf|cdec|www\.usda)\.[a-z.]+|could not be retrieved|was not fetched|were not fetched|(?:is|are) not fetched|still blocked|no allowed host (?:carries|serves)/i;

/** The ledger's own words for a representation question. */
const LEDGER_STATED = /ledger[- ]design|design choice|structure of the ledger/i;
/** Weaker signs, read only when the ledger records no check of the text. */
const LEDGER_TEXT = /no (?:supplied )?fact|needs? (?:a |new )?(?:supplied )?facts?\b|not modell?ed|is not a fact|\balias\b|relationship (?:role|edge)|engine (?:change|capability)|were not created|unit-scope/i;

function parseClass(s: string): QuestionClass | null {
  const t = s.toLowerCase();
  if (t.startsWith("state") || t.startsWith("policy")) return "policy";
  if (t.startsWith("blocked")) return "blocked";
  if (t.includes("legal")) return "legal";
  if (t.includes("ledger")) return "ledger";
  return null;
}

/** Why a question is still open, in one of four classes: an explicit
 *  `Class:` line; else "needs Legal" when an item it carries follows a
 *  statute over a Colorado rule or its open part sets a statute against a
 *  rule; else "blocked" when the open part names text that could not be
 *  read; else "ledger design" when the open part is about representation;
 *  else a state policy choice. */
export function questionClass(q: Pick<QuestionInfo, "rawTitle" | "body" | "status" | "items">): QuestionClass {
  const explicit = explicitField(q.body, "Class");
  const parsed = explicit ? parseClass(explicit) : null;
  if (parsed) return parsed;
  const text = openPartText(q);
  if (q.items.some((it) => it.statute_override) || LEGAL_TEXT.test(text)) return "legal";
  if (LEDGER_STATED.test(text)) return "ledger";
  if (BLOCKED_TEXT.test(text)) return "blocked";
  // A recorded check that no published rule settles it is the ledger's own
  // classing as a state choice; older notes about missing facts are history.
  if (textChecked(q)) return "policy";
  if (LEDGER_TEXT.test(text)) return "ledger";
  return "policy";
}

/** The document the question waits on: an explicit `Blocked on:` line, else
 *  the sentence naming the document or site, from the latest note that names
 *  one; null when none does. */
export function waitingOn(q: Pick<QuestionInfo, "body">): string | null {
  const explicit = explicitField(q.body, "Blocked on");
  if (explicit) return explicit;
  const notes = questionNotes(q.body);
  for (let i = notes.length - 1; i >= 0; i--) {
    const hit = sentences(notes[i].text).find((s) => BLOCKED_TEXT.test(s));
    if (hit) return hit;
  }
  return null;
}

/** Whether the ledger records a check of the published text for this
 *  question (a "Checked <date>:" note, or "no published rule settles it"). */
export function textChecked(q: Pick<QuestionInfo, "body">): boolean {
  return /\bchecked \d{4}-\d{2}-\d{2}|no published (?:rule|text) settles/i.test(q.body);
}

/** Whether the question stands in the way of certifying the volume. The
 *  stopping rule (docs/plan-colorado.md) accepts an open question only when
 *  it is a genuine state policy choice with the text checked recorded, or
 *  blocked on a named document; a ledger-design question, and a policy or
 *  legal question with no recorded check of the text, still block. */
export function blocksCertification(
  q: Pick<QuestionInfo, "status" | "body">, cls: QuestionClass,
): boolean {
  if (!isOpen(q.status)) return false;
  if (cls === "blocked") return false;
  if (cls === "ledger") return true;
  return !textChecked(q);
}

// ---- owner

/** Who answers the question: Legal first for a "needs Legal" question, then
 *  the program owners of the programs its items belong to (volume.yaml
 *  `approval_policy.by_program`; the shared "All" items' owners only when no
 *  item belongs to one program), then the roles the items' tags call for
 *  (`by_tag`: long-term care, State plan elections, verification). */
export function questionOwners(
  engine: Engine, q: Pick<QuestionInfo, "programs" | "items" | "body">, cls: QuestionClass,
): string[] {
  const policy = engine.meta.approval_policy;
  const out: string[] = [];
  const add = (r: string) => { if (!out.includes(r)) out.push(r); };
  const explicit = explicitField(q.body, "Owner");
  if (explicit) for (const r of explicit.split(/[,;]/)) if (r.trim()) add(r.trim());
  if (cls === "legal") add("Legal");
  const own = q.programs.filter((p) => p !== "All");
  for (const p of own.length ? own : q.programs) for (const r of policy?.by_program?.[p] ?? []) add(r);
  for (const it of q.items) {
    for (const t of it.tags ?? []) for (const r of policy?.by_tag?.[t] ?? []) add(r);
  }
  return out;
}

// ---- the reading in force

/** Who applies the reading: the draft, the codex, or one of its items. */
const ASSUMPTION_SUBJECT = /\b(?:the draft|the codex|th(?:is|e) volume)\b/i;
const ITEM_REF = /\b[a-z][a-z0-9]*_[a-z0-9_]+\b|\(CO-\d+\)/;
const ASSUMPTION_VERB = /\b(?:(?:is|are) read as|reads? [^.]{0,80}? as|treats?|treated as|assumes?|follows?|keeps?|applies|uses|takes|stays|counts|gives|continues|dates|does not (?:apply|model|test))\b/i;
const SETTLED = /\b(?:is|are) (?:now )?resolved|answered by|no (?:household |case )?expectation changed|new tests?\b|^still open\b/i;

function assumptionScore(s: string): number {
  if (SETTLED.test(s)) return 0;
  let n = 0;
  if (ASSUMPTION_SUBJECT.test(s)) n += 2;
  if (ASSUMPTION_VERB.test(s)) n += ITEM_REF.test(s) || n ? 2 : 1;
  if (/\buntil\b/i.test(s)) n += 1;
  return n;
}

/** The reading the codex applies until the question is answered: an explicit
 *  `Assumption:` line; else, from the latest note that is not a bare check
 *  of the text, the (at most two) sentences that say what the draft or one of
 *  its items reads, applies or keeps; else an item's own recorded assumption
 *  naming the question; else the question's first sentences. */
export function assumptionInForce(q: Pick<QuestionInfo, "body" | "id" | "items">): string {
  const s = readingInForce(q);
  // An opening identifier ("snap_x (CO-1) keeps ...") is left as written;
  // the page reads it as the item's name.
  return s && !/^`?[a-z][a-z0-9]*_/.test(s) ? s[0].toUpperCase() + s.slice(1) : s;
}

function readingInForce(q: Pick<QuestionInfo, "body" | "id" | "items">): string {
  const explicit = explicitField(q.body, "Assumption");
  if (explicit) return explicit;
  const notes = questionNotes(q.body);
  for (const n of [...notes].reverse()) {
    if (n.label && /^checked/i.test(n.label)) continue;
    const scored = sentences(n.text).map((s) => ({ s, n: assumptionScore(s) }));
    const best = Math.max(0, ...scored.map((x) => x.n));
    if (best < 2) continue;
    return scored.filter((x) => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 2)
      .sort((a, b) => scored.indexOf(a) - scored.indexOf(b)).map((x) => x.s).join(" ");
  }
  // An item that records the assumption in its own words.
  const own = q.items.find((it) => (it.assumption ?? "").includes(q.id));
  if (own?.assumption) return own.assumption;
  return notes[0] ? sentences(notes[0].text).slice(0, 2).join(" ") : "";
}

// ---- rule text

/** The excerpts (S-ids) the question cites, in the order first cited, with
 *  ranges ("S10-S17") expanded; only excerpts the volume has. */
export function citedExcerpts(body: string, sources: readonly Source[]): Source[] {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const ids: string[] = [];
  const add = (id: string) => { if (byId.has(id) && !ids.includes(id)) ids.push(id); };
  for (const m of body.matchAll(/\bS(\d+)(?:\s*[-–]\s*S?(\d+))?\b/g)) {
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (b >= a && b - a <= 20) for (let n = a; n <= b; n++) add(`S${n}`);
    else add(`S${a}`);
  }
  return ids.map((id) => byId.get(id)!);
}

/** The documents (D-n) the question names, in the order first named. */
export function citedDocuments<D extends { id: string }>(body: string, documents: readonly D[]): D[] {
  const byId = new Map(documents.map((d) => [d.id, d]));
  const out: D[] = [];
  for (const m of body.matchAll(/\bD-(\d+)\b/g)) {
    const d = byId.get(`D-${m[1]}`);
    if (d && !out.includes(d)) out.push(d);
  }
  return out;
}

/** The rule text a question turns on: the excerpts it cites, or, when it
 *  cites none, the excerpts the items carrying it cite (`fromItems` true). */
export function ruleText(
  body: string, items: readonly Item[], sources: readonly Source[],
): { excerpts: Source[]; fromItems: boolean } {
  const cited = citedExcerpts(body, sources);
  if (cited.length) return { excerpts: cited, fromItems: false };
  const byId = new Map(sources.map((s) => [s.id, s]));
  const out: Source[] = [];
  for (const it of items) {
    for (const id of it.sources ?? []) {
      const s = byId.get(id);
      if (s && !out.includes(s)) out.push(s);
    }
  }
  return { excerpts: out, fromItems: out.length > 0 };
}

// ---- outcomes reached

/** The programs' declared outcomes (volume.yaml `programs[].outcomes`) that
 *  the question's items are, or feed through other items. */
export function outcomesReached(engine: Engine, items: readonly Item[]): Item[] {
  const declared = new Set((engine.meta.programs ?? []).flatMap((p) => p.outcomes ?? []));
  if (!declared.size || !items.length) return [];
  const ids = items.map((it) => it.identifier);
  const reach = new Set([...ids, ...engine.impact(ids)]);
  return [...declared].filter((d) => reach.has(d)).map((d) => engine.item(d)).filter((x): x is Item => Boolean(x));
}

// ---- everything the queue shows about one question

export interface QueueEntry extends QuestionInfo {
  cls: QuestionClass;
  owners: string[];
  /** The first owner: the group the queue files it under. */
  owner: string;
  assumption: string;
  waitingOn: string | null;
  excerpts: Source[];
  /** The excerpts are the carrying items' own, the question citing none. */
  excerptsFromItems: boolean;
  outcomes: Item[];
  blocksCertification: boolean;
}

export const NO_OWNER = "No owner named";

export function queueEntry(engine: Engine, sources: readonly Source[], q: QuestionInfo): QueueEntry {
  const cls = questionClass(q);
  const owners = questionOwners(engine, q, cls);
  const text = ruleText(q.body, q.items, sources);
  const assumption = assumptionInForce(q);
  const waiting = waitingOn(q);
  return {
    ...q, cls, owners, owner: owners[0] ?? NO_OWNER,
    assumption,
    // Said once: a note that is both the reading and what it waits on.
    waitingOn: waiting && waiting !== assumption ? waiting : null,
    excerpts: text.excerpts,
    excerptsFromItems: text.fromItems,
    outcomes: outcomesReached(engine, q.items),
    blocksCertification: blocksCertification(q, cls),
  };
}

export interface QueueFilter {
  program?: string;
  owner?: string;
  cls?: QuestionClass;
  affectsOutcome?: boolean;
  blocksCertification?: boolean;
  /** Free text matched against the title, the id and the body. */
  text?: string;
}

export function matchesFilter(e: QueueEntry, f: QueueFilter): boolean {
  if (f.program && !e.programs.includes(f.program)) return false;
  if (f.owner && !e.owners.includes(f.owner)) return false;
  if (f.cls && e.cls !== f.cls) return false;
  if (f.affectsOutcome && !e.outcomes.length) return false;
  if (f.blocksCertification && !e.blocksCertification) return false;
  if (f.text) {
    const t = f.text.toLowerCase();
    if (![e.id, e.title, e.body].some((s) => s.toLowerCase().includes(t))) return false;
  }
  return true;
}

/** The queue grouped by owner, in the volume's role order (Legal where the
 *  policy lists it), each group's questions in ledger order. */
export function groupByOwner(engine: Engine, entries: readonly QueueEntry[]): Array<{ owner: string; entries: QueueEntry[] }> {
  const roles = engine.meta.approval_policy?.roles ?? [];
  const groups = new Map<string, QueueEntry[]>();
  for (const e of entries) {
    const list = groups.get(e.owner) ?? [];
    list.push(e);
    groups.set(e.owner, list);
  }
  const rank = (o: string) => { const i = roles.indexOf(o); return i < 0 ? roles.length : i; };
  return [...groups.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
    .map(([owner, list]) => ({ owner, entries: list }));
}

// ---- departures

export interface Departure {
  item: Item;
  /** The Colorado rule paragraph the item departs from, as the note names it. */
  ruleOverridden: string;
  /** What governs instead and why: the rest of the note. */
  reasoning: string;
  /** The note as written. */
  note: string;
  /** The excerpts the item cites, split in two: `rules`, those of the
   *  Colorado rule the note names; `statutes`, the rest, which the item
   *  follows instead (the statute and the federal texts applying it). */
  statutes: Source[];
  rules: Source[];
  /** Open questions the item carries. */
  questions: string[];
}

/** Every item that follows a statute over a Colorado rule (`statute_override`),
 *  as a decision for Legal: the rule overridden, the reasoning, and the
 *  excerpts on each side. `kindOf` says what kind of text an excerpt is
 *  (provenance.ts `excerptKind`). */
export function departures(
  engine: Engine, sources: readonly Source[], kindOf: (s: Source) => string,
): Departure[] {
  const byId = new Map(sources.map((s) => [s.id, s]));
  return engine.items().filter((it) => it.statute_override).map((item) => {
    const note = item.statute_override!.trim();
    const m = /overrides\s+(.+?)(?:,\s*which\b|:\s)/i.exec(note);
    const ruleOverridden = m ? m[1].trim() : "";
    const colon = note.indexOf(": ");
    const rest = colon >= 0 ? note.slice(colon + 2).trim() : note;
    const reasoning = rest ? rest[0].toUpperCase() + rest.slice(1) : rest;
    const cited = (item.sources ?? []).map((s) => byId.get(s)).filter((s): s is Source => Boolean(s));
    // The rule side is the excerpts of the Colorado rule the note names
    // ("10 CCR 2506-1"); everything else the item cites is what it follows
    // instead (the statute, and the federal texts that apply it).
    const code = /\b(\d+\s+CCR\s+[\d-]+)/.exec(ruleOverridden)?.[1].replace(/\s+/g, " ");
    const isRule = (s: Source) => code
      ? `${s.citation} ${s.title}`.replace(/\s+/g, " ").includes(code)
      : kindOf(s) === "regulation" && /\bCCR\b|Colorado/.test(`${s.citation} ${s.title}`);
    const rules = cited.filter(isRule);
    const statutes = cited.filter((s) => !isRule(s));
    return { item, ruleOverridden, reasoning, note, statutes, rules, questions: item.open ?? [] };
  });
}
