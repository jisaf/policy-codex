/* The item page's data (docs/design-unified-ui.md, "Canonical pages ›
 * Item"): pure functions over the engine and the loaded volume, so the page
 * only renders and test/ui/itemPage.test.ts can pin each against the
 * Colorado volume. Counts come from counts.ts; this module only shapes what
 * the page shows beside them:
 *
 * - prose with the ledger's identifiers turned into plain, linked labels
 *   ("(cw_eligibility_status, CO-921)" reads "(Colorado Works: eligibility
 *   status)");
 * - a figure's versions over time: the dated bar with today, gaps and
 *   versions that repeat the figures before them (a legislative freeze), and
 *   each version's numbers found in its own excerpt;
 * - the values an item takes in the stored households that read it;
 * - the change that compares the stored households with the previous
 *   version, and the structured edits "Propose a change" stages;
 * - a new open question, appended to open-questions.md. */
import type { Engine } from "../../engine/engine";
import type { HouseholdCase } from "../../engine/cases";
import type { Item, ItemVersion } from "../../engine/types";
import { versionInForce } from "../../engine/versions";
import type { ChangeEntry } from "../../changes/types";
import type { LoadedVolume } from "../../ledger/load";
import { isVerificationItem, outcomesAffected } from "../counts";
import { clean, formatMoney, formatNumber, formatPercent, isFplRate } from "../present";
import type { StoredResult } from "../questionEffects";
import { determinationDate, personTitle, recordedValue } from "../walkthrough";

/** Two values are the same figures: numbers within float noise, tables
 *  row by row (key order aside). */
export function sameFigures(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i]
      && sameFigures((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
}

// ---- prose: identifiers as plain labels

export type ProsePart =
  | string
  | { kind: "item"; id: string; label: string }
  | { kind: "source"; id: string; title: string }
  | { kind: "document"; id: string; title: string }
  | { kind: "question"; id: string; title: string };

const IDENT = "[a-z][a-z0-9]*(?:_[a-z0-9]+)+";
const ITEM_ID = "[A-Z]{1,4}-\\d+";
/** In order: "(identifier, CO-n)" or "(identifier, CO-n: …", then
 *  "identifier (CO-n)", a bare identifier (in backticks or not), a question,
 *  a document, an excerpt, a bare item id. */
const PROSE_RE = new RegExp(
  [
    `\\((${IDENT}),\\s*(${ITEM_ID})(\\)|:\\s|;\\s)`,
    `\`?(${IDENT})\`?\\s+\\((${ITEM_ID})\\)`,
    `\`?\\b(${IDENT})\\b\`?`,
    `\\b(OQ-\\d+)\\b`,
    `\\b(D-\\d+)\\b`,
    `\\b(S\\d+)\\b`,
    `\\b(${ITEM_ID})\\b`,
  ].join("|"),
  "g",
);

type ProseVolume = Pick<LoadedVolume, "sources" | "documents" | "openQuestions">;

/** A meaning, precision or assumption as a reader reads it: every item the
 *  text names by identifier or id becomes its name (a link), and excerpt,
 *  document and question ids become small links. Text that only looks like
 *  an identifier is left as written. */
export function proseParts(
  engine: Pick<Engine, "item" | "itemById">, vol: ProseVolume | null, text: string,
): ProsePart[] {
  const out: ProsePart[] = [];
  const push = (p: ProsePart) => {
    if (typeof p === "string" && typeof out[out.length - 1] === "string") out[out.length - 1] += p;
    else if (p !== "") out.push(p);
  };
  const itemPart = (ident: string | undefined, id: string | undefined): ProsePart | null => {
    const it = (id ? engine.itemById(id) : undefined) ?? (ident ? engine.item(ident) : undefined);
    return it ? { kind: "item", id: it.id, label: it.name } : null;
  };
  let last = 0;
  PROSE_RE.lastIndex = 0;
  for (let m = PROSE_RE.exec(text); m; m = PROSE_RE.exec(text)) {
    const [whole, pIdent, pId, pEnd, iIdent, iId, bare, oq, doc, src, id] = m;
    let parts: ProsePart[] | null = null;
    if (pIdent) {
      const p = itemPart(pIdent, pId);
      if (p) parts = ["(", p, pEnd === ")" ? ")" : pEnd];
    } else if (iIdent) {
      const p = itemPart(iIdent, iId);
      if (p) parts = [p];
    } else if (bare) {
      const p = itemPart(bare, undefined);
      if (p) parts = [p];
    } else if (oq) {
      const q = vol?.openQuestions.find((x) => x.id === oq);
      if (q) parts = [{ kind: "question", id: oq, title: q.title }];
    } else if (doc) {
      const d = vol?.documents.find((x) => x.id === doc);
      if (d) parts = [{ kind: "document", id: doc, title: d.title }];
    } else if (src) {
      const s = vol?.sources.find((x) => x.id === src);
      if (s) parts = [{ kind: "source", id: src, title: s.title }];
    } else if (id) {
      const p = itemPart(undefined, id);
      if (p) parts = [p];
    }
    if (!parts) continue;
    push(text.slice(last, m.index));
    for (const p of parts) push(p);
    last = m.index + whole.length;
  }
  push(text.slice(last));
  return out;
}

/** The prose as plain text (for tests and the page's accessible names). */
export function proseText(parts: readonly ProsePart[]): string {
  return parts.map((p) => (typeof p === "string" ? p : p.kind === "item" ? p.label : p.id)).join("");
}

// ---- what the item is

export function isOutcome(engine: Engine, it: Pick<Item, "identifier" | "role">): boolean {
  if (it.role === "outcome") return true;
  return (engine.meta.programs ?? []).some((p) => (p.outcomes ?? []).includes(it.identifier));
}

/** "A rule", "A program outcome", "A figure set by policy", "A fact we are
 *  told": the kind in the words the page uses. */
export function kindWords(engine: Engine, it: Item): string {
  if (it.kind === "parameter") return "A figure set by policy";
  if (it.kind === "supplied") return "A fact we are told";
  return isOutcome(engine, it) ? "A program outcome" : "A rule";
}

// ---- figures over time

export interface FigureVersion {
  version: ItemVersion;
  /** In force on the page's date. */
  current: boolean;
  /** Starts after the page's date. */
  future: boolean;
  /** The same figures as the version before it (a freeze). */
  same: boolean;
  /** The version before it, when there is one. */
  previous: ItemVersion | null;
}

/** A figure's dated versions, oldest first, each with what the page says
 *  beside it. */
export function figureVersions(it: Pick<Item, "versions">, date: string): FigureVersion[] {
  const vs = [...(it.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from));
  const now = versionInForce({ versions: vs }, date);
  return vs.map((v, i) => {
    const prev = i > 0 ? vs[i - 1] : null;
    return {
      version: v,
      current: now === v,
      future: v.from > date,
      same: Boolean(prev && sameFigures(prev.value, v.value)),
      previous: prev,
    };
  });
}

export interface TimelineSegment {
  from: string;
  /** Exclusive; for the last open version, the bar's end. */
  to: string;
  kind: "version" | "same" | "gap";
  label: string;
  /** Share of the bar, 0-100. */
  width: number;
}

export interface Timeline {
  start: string;
  end: string;
  segments: TimelineSegment[];
  /** Where today falls on the bar, 0-100. */
  today: number;
}

function addYears(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

const days = (a: string, b: string) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;

/** The dated bar: each version, each gap with no figure, and a year past
 *  the later of today and the last date any version names. */
export function figureTimeline(it: Pick<Item, "versions">, date: string): Timeline | null {
  const vs = figureVersions(it, date);
  if (!vs.length) return null;
  const start = vs[0].version.from;
  const lastDate = [date, ...vs.map((v) => v.version.to ?? v.version.from)].sort().pop()!;
  const end = addYears(lastDate, 1);
  const total = Math.max(1, days(start, end));
  const segs: Array<Omit<TimelineSegment, "width">> = [];
  let cursor = start;
  vs.forEach((v, i) => {
    if (v.version.from > cursor) segs.push({ from: cursor, to: v.version.from, kind: "gap", label: "No figure" });
    const to = v.version.to ?? end;
    segs.push({
      from: v.version.from, to,
      kind: v.same ? "same" : "version",
      label: v.same ? "Same figures" : `Version ${i + 1}`,
    });
    cursor = to > cursor ? to : cursor;
  });
  if (cursor < end) segs.push({ from: cursor, to: end, kind: "gap", label: "No figure" });
  return {
    start, end,
    segments: segs.map((s) => ({ ...s, width: (days(s.from, s.to) / total) * 100 })),
    today: Math.min(100, Math.max(0, (days(start, date) / total) * 100)),
  };
}

export interface FigureGap {
  from: string;
  /** Exclusive; null for "from then on". */
  to: string | null;
}

/** The dates after the first version on which the figure has none: a gap
 *  between versions, and everything after a last version that ends. */
export function figureGaps(it: Pick<Item, "versions">): FigureGap[] {
  const vs = [...(it.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from));
  const out: FigureGap[] = [];
  for (let i = 0; i < vs.length; i++) {
    const to = vs[i].to;
    if (!to) continue;
    const next = vs.find((v) => v.from >= to);
    const covered = vs.some((v) => v.from <= to && (!v.to || v.to > to));
    if (covered) continue;
    out.push({ from: to, to: next ? next.from : null });
  }
  return out;
}

// ---- numbers found in an excerpt

/** How a number may be written in a rule's text: "374", "1,031", "$1,031.00";
 *  a rate as "142%" or "142 percent". */
function spellings(n: number, rate: boolean): string[] {
  const out = new Set<string>();
  if (rate) {
    const pct = clean(n * 100);
    out.add(`${formatNumber(pct, 2)}%`);
    out.add(`${formatNumber(pct, 2)} percent`);
    out.add(formatNumber(pct, 2));
  }
  out.add(String(clean(n)));
  out.add(formatNumber(n));
  if (Number.isInteger(n)) out.add(formatMoney(n).slice(1));
  else out.add(n.toFixed(2));
  return [...out].filter(Boolean);
}

function numbersIn(v: unknown): number[] {
  if (typeof v === "number") return [v];
  if (v && typeof v === "object") return Object.values(v as object).flatMap(numbersIn);
  return [];
}

export interface Needles {
  /** The distinct numbers of the value. */
  numbers: number[];
  /** Every spelling of each, longest first. */
  spellings: Array<{ text: string; n: number }>;
}

export function numberNeedles(it: Pick<Item, "type" | "name" | "identifier">, value: unknown): Needles {
  const rate = it.type === "rate" || isFplRate(it as Item);
  const numbers = [...new Set(numbersIn(value).map(clean))];
  const sp = numbers.flatMap((n) => spellings(n, rate).map((text) => ({ text, n })));
  sp.sort((a, b) => b.text.length - a.text.length);
  return { numbers, spellings: sp };
}

export interface Marked {
  parts: Array<{ text: string; hit: boolean }>;
  /** How many of the value's distinct numbers appear in the text. */
  found: number;
  total: number;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The excerpt with the value's numbers marked where they stand as numbers
 *  (not inside a longer one: "374" is not found in "1374" or "3.74"). */
export function markNumbers(text: string, needles: Needles): Marked {
  if (!needles.spellings.length) return { parts: [{ text, hit: false }], found: 0, total: 0 };
  const re = new RegExp(`\\$?(?:${needles.spellings.map((s) => esc(s.text)).join("|")})(?![0-9]|[.,][0-9])`, "g");
  const parts: Marked["parts"] = [];
  const hitNumbers = new Set<number>();
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const prev = text[m.index - 1];
    if (prev && /[0-9.,]/.test(prev)) continue;
    const raw = m[0].replace(/^\$/, "");
    const hit = needles.spellings.find((s) => s.text === raw);
    if (hit) hitNumbers.add(hit.n);
    if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false });
    parts.push({ text: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false });
  return { parts, found: hitNumbers.size, total: needles.numbers.length };
}

/** The excerpts a figure's versions cite, each once. */
export function versionSources(it: Pick<Item, "versions">): string[] {
  return [...new Set((it.versions ?? []).map((v) => v.source).filter((s): s is string => Boolean(s)))];
}

/** Every excerpt the item cites, its own sources first, then any a version
 *  cites that the sources do not list. */
export function citedSources(it: Pick<Item, "sources" | "versions">): string[] {
  return [...new Set([...(it.sources ?? []), ...versionSources(it)])];
}

// ---- what it affects

export interface ProgramOutcomes {
  program: string;
  /** The outcomes a household's result is (eligibility, an amount). */
  decisions: string[];
  /** Verification flags and counts that read it. */
  verification: string[];
}

/** The declared outcomes the item affects (counts.ts `outcomesAffected`),
 *  by program in the volume's order, the verification ones apart. */
export function outcomesByProgram(engine: Engine, identifier: string): ProgramOutcomes[] {
  const affected = new Set(outcomesAffected(engine, identifier));
  const out: ProgramOutcomes[] = [];
  const seen = new Set<string>();
  for (const p of engine.meta.programs ?? []) {
    const os = (p.outcomes ?? []).filter((o) => affected.has(o) && !seen.has(o));
    if (!os.length) continue;
    os.forEach((o) => seen.add(o));
    out.push({
      program: p.id,
      decisions: os.filter((o) => !isVerificationItem(o)),
      verification: os.filter((o) => isVerificationItem(o)),
    });
  }
  return out;
}

// ---- values in the stored households

export interface PersonValue {
  person: string | null;
  /** "Person 3 — grandchild of Person 1, age 16"; empty for a value of the
   *  whole household. */
  label: string;
  value: unknown;
}

export interface HouseholdValues {
  caseId: string;
  title: string;
  /** The household's determination date. */
  date: string;
  /** For a figure set by dated versions: the version that date reads. */
  version: ItemVersion | null;
  values: PersonValue[];
  /** One stored result that reads the item (for "see it step by step"). */
  result: StoredResult | null;
}

/** The value the item takes in each household that reads it: per person for
 *  a person's fact or rule (the persons whose results read it), once for a
 *  household or a figure, on the household's determination date. */
export function householdValues(
  engine: Engine, cases: readonly HouseholdCase[], it: Item, readers: readonly string[],
  resting: readonly StoredResult[],
): HouseholdValues[] {
  const perPerson = it.scope === "person" || it.scope === "person-month";
  return readers.map((caseId) => {
    const hc = cases.find((c) => c.id === caseId)!;
    const rs = resting.filter((r) => r.caseId === caseId);
    const date = determinationDate(hc);
    const month = rs.find((r) => r.month)?.month ?? null;
    const persons = perPerson
      ? [...new Set(rs.map((r) => r.person))].filter((p) => hc.persons[p])
      : [Object.keys(hc.persons)[0] ?? null];
    const values = (persons.length ? persons : Object.keys(hc.persons).slice(0, 1)).map((p) => ({
      person: perPerson ? p : null,
      label: perPerson && p ? personTitle(hc, p) : "",
      value: recordedValue(engine, hc, it.identifier, p, it.scope === "person-month" || it.scope === "month" ? month : null),
    }));
    return {
      caseId, title: hc.title, date,
      version: it.kind === "parameter" && it.versions?.length ? versionInForce(it, date) : null,
      values,
      result: rs[0] ?? null,
    };
  });
}

// ---- compare with the version before

export interface PreviousComparison {
  /** The version in force on the date, whose figures the comparison swaps. */
  current: ItemVersion;
  previous: ItemVersion;
  /** The two carry the same figures: nothing can change. */
  same: boolean;
  /** The item with the version in force carrying the previous figures. */
  entry: ChangeEntry;
}

/** "Compare stored households": the version in force on `date` given the
 *  version before's figures, as a change the stored households are run
 *  again under (counts.ts `changedBy`). Null when there is no version before. */
export function previousVersionComparison(
  it: Item, date: string, chapter: string,
): PreviousComparison | null {
  const vs = figureVersions(it, date);
  const i = vs.findIndex((v) => v.current);
  const at = i >= 0 ? i : vs.filter((v) => !v.future).length - 1;
  if (at < 1) return null;
  const current = vs[at].version;
  const previous = vs[at - 1].version;
  const after: Item = JSON.parse(JSON.stringify(it));
  const target = after.versions!.find((v) => v.from === current.from)!;
  target.value = JSON.parse(JSON.stringify(previous.value));
  return {
    current, previous, same: sameFigures(current.value, previous.value),
    entry: { id: it.id, chapter, before: it, after },
  };
}

// ---- "Propose a change": the structured edits

/** Reads a figure as typed: "$1,031", "142%", "0.25", "yes". A rate typed as
 *  a percentage is stored as a fraction. Null when it is not a value. */
export function parseFigure(it: Pick<Item, "type">, text: string): unknown {
  const t = text.trim();
  if (!t) return null;
  if (/^(yes|true)$/i.test(t)) return true;
  if (/^(no|false)$/i.test(t)) return false;
  const pct = /^(-?[\d,]*\.?\d+)\s*(%|percent)$/i.exec(t);
  if (pct) return clean(Number(pct[1].replace(/,/g, "")) / 100);
  const num = /^-?\$?[\d,]*\.?\d+$/.exec(t);
  if (num) {
    const n = Number(t.replace(/[$,]/g, ""));
    if (!Number.isFinite(n)) return null;
    return it.type === "rate" && n > 5 ? clean(n / 100) : n;
  }
  return null;
}

/** A figure as typed into the form: a rate as a percentage. */
export function figureText(it: Pick<Item, "type">, v: unknown): string {
  if (typeof v === "number") return it.type === "rate" ? formatPercent(v) : formatNumber(v);
  if (v === null || v === undefined) return "";
  return String(v);
}

export type FigureEdit =
  | { kind: "add"; from: string; value: unknown; source?: string }
  | { kind: "correct"; from: string; value: unknown; source?: string };

/** The item with a version added or corrected, or an error in words. A new
 *  version closes the one before it; a version identical to what is there,
 *  or to the version before, is refused: the change would change nothing. */
export function applyFigureEdit(it: Item, edit: FigureEdit): { item: Item } | { error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(edit.from)) return { error: "Give the first day the figure applies." };
  if (edit.value === null || edit.value === undefined) return { error: "Give the figure." };
  const vs = [...(it.versions ?? [])].map((v) => ({ ...v })).sort((a, b) => a.from.localeCompare(b.from));
  const src = edit.source?.trim() || undefined;
  if (edit.kind === "correct") {
    const v = vs.find((x) => x.from === edit.from);
    if (!v) return { error: `There is no version from ${edit.from} to correct.` };
    if (sameFigures(v.value, edit.value) && (src ?? v.source) === v.source) {
      return { error: "That is the figure the version already has: nothing would change." };
    }
    v.value = edit.value;
    if (src) v.source = src;
    return { item: { ...it, versions: vs } };
  }
  if (vs.some((x) => x.from === edit.from)) {
    return { error: `A version already starts on ${edit.from}: correct it instead.` };
  }
  const prior = vs.filter((x) => x.from < edit.from).pop();
  const next = vs.find((x) => x.from > edit.from);
  if (prior && sameFigures(prior.value, edit.value) && (!prior.to || prior.to > edit.from)) {
    return { error: "These are the figures already in force on that date: nothing would change." };
  }
  if (prior && (!prior.to || prior.to > edit.from)) prior.to = edit.from;
  const added: ItemVersion = { from: edit.from, value: edit.value };
  if (next) added.to = next.from;
  if (src) added.source = src;
  vs.push(added);
  vs.sort((a, b) => a.from.localeCompare(b.from));
  return { item: { ...it, versions: vs } };
}

// ---- "Ask a question": a new open question

/** The next free question id: one past the highest in the file. */
export function nextQuestionId(md: string): string {
  let max = 0;
  for (const m of md.matchAll(/^###\s+OQ-(\d+)\b/gm)) max = Math.max(max, Number(m[1]));
  return `OQ-${max + 1}`;
}

export interface NewQuestion {
  title: string;
  body: string;
  items: string[];
  owner: string;
  askedBy: string;
  date: string;
}

/** open-questions.md with a new question appended at its end, in the file's
 *  own shape (heading, Body:, Items:, Owner:), so the queue reads it. */
export function appendQuestion(md: string, q: NewQuestion): { id: string; text: string } {
  const id = nextQuestionId(md);
  const one = (s: string) => s.trim().replace(/\s+/g, " ");
  const title = one(q.title).replace(/[.?!]*$/, "");
  const body = one(q.body);
  const lines = [
    `### ${id}. ${title}`,
    "",
    `Body: ${body ? (/[.?!]$/.test(body) ? body : `${body}.`) : `${title}?`} Items: ${q.items.join(", ")}.`,
    "",
    "Class: state policy choice",
    `Owner: ${q.owner}`,
    `Asked: ${q.date}, ${one(q.askedBy)}, from the item page.`,
  ];
  const head = md.replace(/\s*$/, "");
  return { id, text: `${head}\n\n${lines.join("\n")}\n` };
}
