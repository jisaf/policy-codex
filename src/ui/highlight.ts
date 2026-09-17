/** Tokenising, completion, and token documentation for the direct-text editor.
 *
 *  Pure: no window, no document. `TextEditor.tsx` owns every DOM concern, so
 *  this module can be unit-tested on a plain Engine.
 *
 *  The vocabulary is the parser's vocabulary. Field keys mirror
 *  `parseItemBlock`'s switch (src/engine/item-block.ts), the surface phrases
 *  are derived from the pattern table in ./patterns.ts, and types, scopes and
 *  tags come from the volume's own `meta`. */
import { FIELD_W } from "../engine/item-block";
import { tagIds } from "../engine/tags";
import { RELS } from "../engine/types";
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import { LABEL } from "./patterns";

export type TokenClass =
  | "key" | "fact" | "derived" | "param" | "unknown" | "phrase" | "const"
  | "literal" | "source" | "tag" | "error" | "plain";

export interface Token {
  text: string;
  cls: TokenClass;
  /** Offset into the whole block, not into the line. */
  start: number;
  end: number;
  /** Ledger id of the item this token names, when it names one. */
  itemId?: string;
}

export interface Line {
  /** 1-based, so it matches the line numbers parse errors carry. */
  number: number;
  text: string;
  /** A parse error was reported against this line. */
  error: boolean;
  tokens: Token[];
}

export interface TokenizeOptions {
  /** Line numbers (1-based) the parser reported errors against. */
  errorLines?: readonly number[];
  /** Excerpt ids the volume defines; when omitted every S-looking id passes. */
  sourceIds?: readonly string[];
  /** Open-question ids the volume defines. */
  questionIds?: readonly string[];
}

/** The field keys the item block understands, in the order it writes them. */
export const KEYS: readonly string[] = [
  "ID", "Fact", "Identifier", "Kind", "Type", "Scope", "Program", "Role", "Meaning",
  "Precision", "Assumption", "Supplied by", "Value", "Derived as", "Uses", "Source",
  "Effective", "Implemented", "Tags", "Examples", "Open", "Approval", "Status",
];

/** Fields whose value is drawn from a short closed list the parser enforces. */
const VALID: Record<string, string[]> = {
  Kind: ["Derived", "Supplied", "Parameter"],
  Program: ["All", "Medicaid", "SNAP"],
  Implemented: ["Fact assembly", "Determination engine"],
  Role: ["outcome"],
};

/** The four constants `parseInline` matches literally (src/engine/parse.ts). */
export const CONSTS: readonly string[] = [
  "the month containing the Determination Date",
  "the Determination Date",
  "the month",
  "that person",
];

/** Phrases the pattern table cannot yield: block forms carry a trailing colon,
 *  `months_ending` reads "the 3 consecutive months ending with", and the case
 *  and relationship connectors never appear in a label of their own. */
const EXTRA_PHRASES: readonly string[] = [
  "all of the following are true:", "any of the following is true:",
  "is one of:", "consecutive months ending with", "else if", "is in",
  "such that", "then", "and", "or", "for", "of", "in",
];

/** Every phrase a derivation can show, longest first so the longest wins.
 *  Derived from ./patterns.ts by dropping the `…` and `[slot]` placeholders,
 *  which keeps this list honest when the pattern table grows. */
export function surfacePhrases(): string[] {
  const out = new Set<string>(EXTRA_PHRASES);
  for (const label of Object.values(LABEL)) {
    for (const part of label.replace(/\[[^\]]*\]/g, "…").split("…")) {
      const p = part.replace(/[,;:]/g, " ").replace(/\s+/g, " ").trim();
      if (p) out.add(p);
    }
  }
  return [...out].sort((a, b) => b.length - a.length);
}

const PHRASES = surfacePhrases();

/** A pattern offered by the completion popup: what it reads as, and the text
 *  inserted when it is chosen. */
export interface PatternEntry { insert: string; label: string }

/** Block patterns need their own indentation, so their insert text is written
 *  out rather than derived from the label. */
const BLOCK_INSERT: Record<string, string> = {
  all: "all of the following are true:\n  - ",
  any: "any of the following is true:\n  - ",
  each: "in each of :\n  ",
  some_month: "in at least one of :\n  ",
  exists: "there is a person in  such that\n  ",
  exists_related: "there is a person of whom this person is a parent such that\n  ",
  case: "if \n  then \notherwise ",
  in: " is one of: ",
  months_ending: "the 3 consecutive months ending with ",
  otherwise: ", otherwise ",
};

/** The pattern palette, built from the same table the form builder uses. */
export const PATTERNS: PatternEntry[] = Object.keys(LABEL).map((op) => ({
  label: LABEL[op],
  insert: BLOCK_INSERT[op]
    ?? LABEL[op].replace(/\[[^\]]*\]/g, "").replace(/…/g, ""),
})).concat(
  CONSTS.map((c) => ({ label: c, insert: c })),
);

function clsOf(it: Item): TokenClass {
  return it.kind === "parameter" ? "param" : it.kind === "derived" ? "derived" : "fact";
}

/** A parameter reads as "Name (value)" wherever the parser will take it. */
function paramLabel(engine: Engine, it: Item): string {
  return `${it.name} (${engine.lit(engine.paramValue(it))})`;
}

interface NameEntry { text: string; low: string; item: Item }

/** Every spelling of every item, longest first, so "Age" never shadows
 *  "Age at the end of the month". Rebuilt per tokenise: the engine a draft is
 *  edited against changes whenever the tray does. */
function nameTable(engine: Engine): NameEntry[] {
  const out: NameEntry[] = [];
  for (const it of engine.items()) {
    if (it.name) out.push({ text: it.name, low: it.name.toLowerCase(), item: it });
    if (it.kind === "parameter" && it.name) {
      const t = paramLabel(engine, it);
      out.push({ text: t, low: t.toLowerCase(), item: it });
    }
  }
  return out.sort((a, b) => b.text.length - a.text.length);
}

function knownTags(engine: Engine): Set<string> {
  const t = new Set<string>(tagIds(engine.meta));
  for (const k of Object.keys(engine.meta.approval_policy?.by_tag ?? {})) t.add(k);
  for (const it of engine.items()) for (const x of it.tags ?? []) t.add(x);
  return t;
}

const DELIM = /[\s,:;()[\]"]/;

function boundary(s: string, i: number): boolean {
  return i >= s.length || DELIM.test(s[i]);
}

interface ExprCtx { options: string[] }

/** Tokenises one stretch of pattern English. `base` is where `s` starts in the
 *  whole block, so every token carries an absolute offset. */
function tokenizeExpr(
  engine: Engine, names: NameEntry[], s: string, base: number, ctx: ExprCtx,
): Token[] {
  const out: Token[] = [];
  const push = (text: string, cls: TokenClass, at: number, itemId?: string) => {
    out.push(itemId ? { text, cls, start: base + at, end: base + at + text.length, itemId }
      : { text, cls, start: base + at, end: base + at + text.length });
  };
  const opts = [...engine.index.enumOptions, ...ctx.options]
    .sort((a, b) => b.length - a.length);
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      let j = i;
      while (j < s.length && /\s/.test(s[j])) j++;
      push(s.slice(i, j), "plain", i);
      i = j;
      continue;
    }
    if (/[,:;()[\]]/.test(ch) || (ch === "-" && s[i + 1] === " ")) {
      push(ch, "plain", i);
      i++;
      continue;
    }
    let best: { cls: TokenClass; len: number; item?: Item } | null = null;
    const consider = (cls: TokenClass, len: number, item?: Item) => {
      if (len <= 0 || !boundary(s, i + len)) return;
      // An enumeration option that spells the same as an item name is the
      // literal, not a reference: the option list is the narrower context.
      const wins = !best || len > best.len ||
        (len === best.len && cls === "literal" && best.cls !== "literal");
      if (wins) best = { cls, len, item };
    };
    for (const c of CONSTS) if (s.startsWith(c, i)) consider("const", c.length);
    const low = s.slice(i).toLowerCase();
    for (const n of names) {
      if (low.startsWith(n.low)) { consider(clsOf(n.item), n.text.length, n.item); break; }
    }
    for (const p of PHRASES) if (s.startsWith(p, i)) { consider("phrase", p.length); break; }
    for (const o of opts) if (s.startsWith(o, i)) { consider("literal", o.length); break; }
    for (const r of RELS) if (s.startsWith(r, i)) consider("literal", r.length);
    let m: RegExpMatchArray | null;
    const rest = s.slice(i);
    if ((m = rest.match(/^(\d{4}-\d{2}-\d{2}|\d{4}-\d{2}|-?\d+(\.\d+)?)/))) {
      consider("literal", m[0].length);
    }
    if ((m = rest.match(/^(yes|no|unknown)\b/))) consider("literal", m[0].length);
    if ((m = rest.match(/^"[^"]*"/))) consider("literal", m[0].length);
    if (best) {
      const b = best as { cls: TokenClass; len: number; item?: Item };
      push(s.slice(i, i + b.len), b.cls, i, b.item?.id);
      i += b.len;
      continue;
    }
    let j = i;
    while (j < s.length && !DELIM.test(s[j])) j++;
    if (j === i) j = i + 1;
    push(s.slice(i, j), "unknown", i);
    i = j;
  }
  return out;
}

/** An example line: `T1: given as of 2027-03-15; age=19 => yes`. */
function tokenizeExample(engine: Engine, s: string, base: number): Token[] {
  const out: Token[] = [];
  const push = (text: string, cls: TokenClass, at: number, itemId?: string) => {
    out.push(itemId ? { text, cls, start: base + at, end: base + at + text.length, itemId }
      : { text, cls, start: base + at, end: base + at + text.length });
  };
  const head = s.match(/^(\s*)([^:]+:)/);
  let i = 0;
  if (head) {
    push(head[1], "plain", 0);
    push(head[2], "key", head[1].length);
    i = head[0].length;
  }
  while (i < s.length) {
    const rest = s.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^\s+/))) { push(m[0], "plain", i); i += m[0].length; continue; }
    if ((m = rest.match(/^=>/))) { push(m[0], "phrase", i); i += 2; continue; }
    if ((m = rest.match(
      /^(given|as of|month|parameters|relationships|others|other months)\b/,
    ))) { push(m[0], "phrase", i); i += m[0].length; continue; }
    if ((m = rest.match(
      /^(\{[^;]*\}|\[[^;]*\]|"[^"]*"|\d{4}-\d{2}(-\d{2})?|-?\d+(\.\d+)?|(yes|no|unknown|true|false|null)\b)/,
    ))) { push(m[0], "literal", i); i += m[0].length; continue; }
    if ((m = rest.match(/^[a-z][a-z0-9_]*/))) {
      const it = engine.item(m[0]);
      push(m[0], it ? clsOf(it) : "unknown", i, it?.id);
      i += m[0].length;
      continue;
    }
    if ((m = rest.match(/^[=;]/))) { push(m[0], "plain", i); i += 1; continue; }
    let j = 0;
    while (j < rest.length && !/[\s;=]/.test(rest[j])) j++;
    if (j === 0) j = 1;
    push(rest.slice(0, j), "unknown", i);
    i += j;
  }
  return out;
}

interface LineCtx { mode: "field" | "derived" | "examples"; options: string[] }

function commaParts(val: string): Array<{ text: string; at: number }> {
  const parts: Array<{ text: string; at: number }> = [];
  let at = 0;
  for (const piece of val.split(/(,\s*)/)) {
    if (piece) parts.push({ text: piece, at });
    at += piece.length;
  }
  return parts;
}

function tokenizeFieldLine(
  engine: Engine, names: NameEntry[], line: string, base: number,
  ctx: LineCtx, opts: TokenizeOptions,
): Token[] {
  const key = line.slice(0, FIELD_W).trim();
  const pad = line.slice(key.length, FIELD_W);
  const val = line.slice(FIELD_W);
  const valAt = Math.min(FIELD_W, line.length);
  const known = KEYS.includes(key);
  const out: Token[] = [
    { text: key, cls: known ? "key" : "unknown", start: base, end: base + key.length },
  ];
  if (pad) out.push({ text: pad, cls: "plain", start: base + key.length, end: base + FIELD_W });
  const add = (text: string, cls: TokenClass, at: number) => {
    if (!text) return;
    out.push({ text, cls, start: base + at, end: base + at + text.length });
  };
  ctx.mode = key === "Derived as" ? "derived" : key === "Examples" ? "examples" : "field";
  if (!known) { add(val, "plain", valAt); return out; }
  if (key === "Derived as") {
    return out.concat(tokenizeExpr(engine, names, val, base + valAt, ctx));
  }
  if (key === "Type") {
    const cut = val.indexOf(":");
    const ty = cut < 0 ? val : val.slice(0, cut);
    add(ty, engine.meta.types.includes(ty.trim()) ? "literal" : "error", valAt);
    if (cut >= 0) {
      add(":", "plain", valAt + cut);
      const rest = val.slice(cut + 1);
      ctx.options = rest.split(",").map((x) => x.trim()).filter(Boolean);
      add(rest, "literal", valAt + cut + 1);
    }
    return out;
  }
  if (key === "Scope") {
    add(val, engine.meta.scopes.includes(val.trim() as Item["scope"]) ? "literal" : "error", valAt);
    return out;
  }
  if (VALID[key]) {
    const ok = VALID[key].some((v) => v.toLowerCase() === val.trim().toLowerCase());
    add(val, ok ? "literal" : "error", valAt);
    return out;
  }
  if (key === "Source" || key === "Open") {
    const ids = key === "Source" ? opts.sourceIds : opts.questionIds;
    for (const part of commaParts(val)) {
      if (/^,\s*$/.test(part.text)) { add(part.text, "plain", valAt + part.at); continue; }
      const id = part.text.trim().split(" ")[0];
      const ok = ids ? ids.includes(id) : /^(S\d+|OQ-\d+)$/.test(id);
      add(part.text, ok ? "source" : "error", valAt + part.at);
    }
    return out;
  }
  if (key === "Tags") {
    const tags = knownTags(engine);
    for (const part of commaParts(val)) {
      if (/^,\s*$/.test(part.text)) { add(part.text, "plain", valAt + part.at); continue; }
      add(part.text, tags.has(part.text.trim()) ? "tag" : "error", valAt + part.at);
    }
    return out;
  }
  if (key === "Identifier") {
    add(val, /^[a-z][a-z0-9_]*$/.test(val.trim()) ? "derived" : "error", valAt);
    return out;
  }
  if (key === "Effective") {
    const ok = /^\d{4}-\d{2}-\d{2} to (\d{4}-\d{2}-\d{2}|present)$/.test(val.trim());
    add(val, ok ? "literal" : "error", valAt);
    return out;
  }
  if (key === "ID" || key === "Value") { add(val, "literal", valAt); return out; }
  add(val, "plain", valAt);
  return out;
}

export function tokenize(engine: Engine, text: string, opts: TokenizeOptions = {}): Line[] {
  const names = nameTable(engine);
  const errs = new Set(opts.errorLines ?? []);
  const ctx: LineCtx = { mode: "field", options: [] };
  const out: Line[] = [];
  let base = 0;
  text.split("\n").forEach((line, k) => {
    let tokens: Token[];
    if (!line.trim()) {
      tokens = line ? [{ text: line, cls: "plain", start: base, end: base + line.length }] : [];
    } else if (line.startsWith(" ")) {
      tokens = ctx.mode === "derived"
        ? tokenizeExpr(engine, names, line, base, ctx)
        : ctx.mode === "examples"
          ? tokenizeExample(engine, line, base)
          : [{ text: line, cls: "plain", start: base, end: base + line.length }];
    } else {
      tokens = tokenizeFieldLine(engine, names, line, base, ctx, opts);
    }
    out.push({ number: k + 1, text: line, error: errs.has(k + 1), tokens });
    base += line.length + 1;
  });
  return out;
}

/** What a stretch of text is, for a caller that has one but not a whole item
 *  block: pattern English (`expr`, or `inline` where it sits inside a line
 *  already), example lines, or a whole block. */
export type TextMode = "expr" | "example" | "block" | "inline";

/** Tokenises text that is not a whole item block. `block` is `tokenize`
 *  itself; the other modes run one stretch of pattern English, or one example
 *  line, per line, which is what the reader views show. */
export function tokenizeAs(
  engine: Engine, text: string, mode: TextMode, opts: TokenizeOptions = {},
): Line[] {
  if (mode === "block") return tokenize(engine, text, opts);
  const names = nameTable(engine);
  const ctx: ExprCtx = { options: [] };
  const out: Line[] = [];
  let base = 0;
  text.split("\n").forEach((line, k) => {
    const tokens = !line
      ? []
      : mode === "example"
        ? tokenizeExample(engine, line, base)
        : tokenizeExpr(engine, names, line, base, ctx);
    out.push({ number: k + 1, text: line, error: false, tokens });
    base += line.length + 1;
  });
  return out;
}

/** The token containing `offset`, or null between tokens. */
export function tokenAt(engine: Engine, text: string, offset: number): Token | null {
  for (const line of tokenize(engine, text)) {
    if (offset < line.tokens[0]?.start) break;
    for (const t of line.tokens) if (offset >= t.start && offset < t.end) return t;
  }
  return null;
}

// ---- completion context

export interface EditorContext {
  kind: "field" | "expr" | "example" | "tag" | "source" | null;
  /** The field key the caret sits under, "" when there is none. */
  field: string;
  /** The word being completed, with any trigger character removed. */
  prefix: string;
  /** 1-based line number of the caret. */
  line: number;
  /** Where `prefix` (including its trigger) starts in the whole block. */
  start: number;
  /** `@` for facts, `#` for sources, `/` for patterns; null when none typed. */
  trigger: "@" | "#" | "/" | null;
}

const WORD = /[A-Za-z0-9_'-]+$/;

/** Grows a one-word prefix leftwards while an item name still contains it, so
 *  "Date of Bir" completes as one phrase rather than as "Bir". */
function expandPrefix(engine: Engine, before: string): { prefix: string; start: number } {
  const m = before.match(WORD);
  if (!m) return { prefix: "", start: before.length };
  let prefix = m[0];
  let start = before.length - m[0].length;
  for (;;) {
    const mm = before.slice(0, start).match(/([A-Za-z0-9_'-]+) $/);
    if (!mm) break;
    const cand = `${mm[1]} ${prefix}`;
    const low = cand.toLowerCase();
    if (!engine.items().some((it) => (it.name || "").toLowerCase().includes(low))) break;
    prefix = cand;
    start -= mm[0].length;
  }
  return { prefix, start };
}

export function contextAt(engine: Engine, text: string, caret: number): EditorContext {
  const at = Math.max(0, Math.min(caret, text.length));
  const lineStart = text.lastIndexOf("\n", at - 1) + 1;
  const lineNo = text.slice(0, lineStart).split("\n").length;
  const before = text.slice(lineStart, at);
  const full = text.slice(lineStart);
  const indented = full.startsWith(" ") || full === "";

  // Which field owns this line: its own key, or the last unindented line's.
  let field = "";
  if (!indented) field = full.slice(0, FIELD_W).trim();
  else {
    const prior = text.slice(0, lineStart).split("\n");
    for (let i = prior.length - 1; i >= 0; i--) {
      if (prior[i] && !prior[i].startsWith(" ")) {
        field = prior[i].slice(0, FIELD_W).trim();
        break;
      }
    }
  }

  const kind: EditorContext["kind"] =
    field === "Derived as" ? "expr"
      : field === "Examples" ? "example"
        : field === "Tags" ? "tag"
          : field === "Source" || field === "Open" ? "source"
            : field ? "field" : null;

  const base = { kind, field, line: lineNo, trigger: null as EditorContext["trigger"] };

  // Explicit triggers win over the field the caret happens to sit in.
  let m: RegExpMatchArray | null;
  if ((m = before.match(/@([^@\n]*)$/))) {
    return { ...base, kind: "expr", prefix: m[1], start: lineStart + before.length - m[0].length, trigger: "@" };
  }
  if ((m = before.match(/#([A-Za-z0-9-]*)$/))) {
    return { ...base, kind: "source", prefix: m[1], start: lineStart + before.length - m[0].length, trigger: "#" };
  }
  if ((m = before.match(/\/([^/\n]*)$/))) {
    return { ...base, kind: "expr", prefix: m[1], start: lineStart + before.length - m[0].length, trigger: "/" };
  }

  if (kind === null) return { ...base, prefix: "", start: at };
  if (kind === "expr") {
    const cut = indented ? 0 : Math.min(FIELD_W, before.length);
    const r = expandPrefix(engine, before.slice(cut));
    return { ...base, prefix: r.prefix, start: lineStart + cut + r.start };
  }
  if (kind === "example") {
    const mm = before.match(/[a-z][a-z0-9_]*$/);
    return {
      ...base, prefix: mm ? mm[0] : "",
      start: lineStart + before.length - (mm ? mm[0].length : 0),
    };
  }
  if (kind === "tag" || kind === "source") {
    const cut = indented ? 0 : Math.min(FIELD_W, before.length);
    const raw = (before.slice(cut).match(/[^,]*$/) as RegExpMatchArray)[0];
    const lead = raw.length - raw.trimStart().length;
    return {
      ...base, prefix: raw.trim(),
      start: lineStart + before.length - raw.length + lead,
    };
  }
  // A plain field line: while the caret is still in the key column the line
  // names no field yet, so `field` stays empty and the key itself completes.
  if (before.length <= FIELD_W && !indented) {
    const mm = before.match(/^[A-Za-z ]*/) as RegExpMatchArray;
    return { ...base, kind: "field", field: "", prefix: mm[0].trim(), start: lineStart };
  }
  const r = expandPrefix(engine, before.slice(Math.min(FIELD_W, before.length)));
  return { ...base, prefix: r.prefix, start: lineStart + Math.min(FIELD_W, before.length) + r.start };
}

// ---- suggestions

export interface Suggestion {
  label: string;
  detail: string;
  cls: TokenClass;
  insert: string;
  /** Present when the suggestion names a ledger item. */
  identifier?: string;
}

export interface SuggestRefs {
  sources?: ReadonlyArray<{ id: string; title: string }>;
  questions?: ReadonlyArray<{ id: string; title: string }>;
}

const MAX = 10;

function factSuggestions(engine: Engine, q: string, insertIdentifier: boolean): Suggestion[] {
  const low = q.toLowerCase().trim();
  return engine.items()
    .filter((f) => !low
      || (f.name || "").toLowerCase().includes(low)
      || f.identifier.includes(low))
    .sort((a, b) =>
      (a.name.toLowerCase().startsWith(low) ? 0 : 1) - (b.name.toLowerCase().startsWith(low) ? 0 : 1)
      || a.name.localeCompare(b.name))
    .slice(0, MAX)
    .map((f) => ({
      label: insertIdentifier ? f.identifier : f.name,
      detail: insertIdentifier
        ? `${f.name} · ${f.type}`
        : `${f.kind}${f.kind === "parameter" ? ` (${engine.lit(engine.paramValue(f))})` : ""}`
          + ` · ${f.type} · ${f.scope}`,
      cls: clsOf(f),
      insert: insertIdentifier
        ? `${f.identifier}=`
        : f.kind === "parameter" ? paramLabel(engine, f) : f.name,
      identifier: f.identifier,
    }));
}

export function suggestions(
  engine: Engine, ctx: EditorContext, patterns: readonly PatternEntry[] = PATTERNS,
  refs: SuggestRefs = {},
): Suggestion[] {
  const q = ctx.prefix.toLowerCase().trim();
  if (ctx.kind === "expr") {
    const pats = patterns
      .filter((p) => !q || p.label.toLowerCase().includes(q))
      .slice(0, ctx.trigger === "/" ? 12 : 4)
      .map((p) => ({ label: p.label, detail: "pattern", cls: "phrase" as TokenClass, insert: p.insert }));
    if (ctx.trigger === "/") return pats;
    return factSuggestions(engine, q, false).concat(pats);
  }
  if (ctx.kind === "example") return factSuggestions(engine, q, true);
  if (ctx.kind === "source") {
    const pool = [
      ...(refs.sources ?? []).map((s) => ({ ...s, what: "excerpt" })),
      ...(refs.questions ?? []).map((s) => ({ ...s, what: "open question" })),
    ];
    return pool
      .filter((s) => !q || `${s.id} ${s.title}`.toLowerCase().includes(q))
      .slice(0, MAX)
      .map((s) => ({ label: s.id, detail: `${s.what} · ${s.title}`, cls: "source", insert: s.id }));
  }
  if (ctx.kind === "tag") {
    return [...knownTags(engine)]
      .filter((t) => !q || t.toLowerCase().includes(q))
      .sort()
      .slice(0, MAX)
      .map((t) => ({ label: t, detail: "tag", cls: "tag", insert: t }));
  }
  if (ctx.kind === "field") {
    // An unfinished key completes to a field name; a field whose value is
    // drawn from a closed list completes to that list. Prose fields (Meaning,
    // Precision) offer nothing, so typing a sentence is never interrupted.
    if (!ctx.field) {
      return KEYS
        .filter((k) => !q || k.toLowerCase().startsWith(q))
        .slice(0, MAX)
        .map((k) => ({
          label: k, detail: "field", cls: "key" as TokenClass, insert: k.padEnd(FIELD_W),
        }));
    }
    const values = ctx.field === "Type" ? engine.meta.types
      : ctx.field === "Scope" ? engine.meta.scopes as readonly string[]
        : VALID[ctx.field];
    return (values ?? [])
      .filter((v) => !q || v.toLowerCase().includes(q))
      .map((v) => ({ label: v, detail: ctx.field, cls: "literal" as TokenClass, insert: v }));
  }
  return [];
}

// ---- token documentation

export const PATTERN_DOCS: Record<string, [string, string]> = {
  "all of the following are true:": ["Logic", "True when every listed condition is true. False as soon as one is false. Unknown if none is false but one is unknown."],
  "any of the following is true:": ["Logic", "True when at least one listed condition is true. False only when every condition is false. Unknown if none is true but one is unknown."],
  "all of the following are true": ["Logic", "True when every listed condition is true."],
  "any of the following is true": ["Logic", "True when at least one listed condition is true."],
  "it is not the case that": ["Logic", "Negates a yes/no condition. Unknown stays unknown."],
  "otherwise": ["Default", "Value, otherwise default: when the value is unknown, use the default. The only way to introduce a default; approvers see it."],
  "is unknown": ["Completeness", "True when the fact has no known value."],
  "is less than": ["Comparison", "Left is strictly less than right. Numbers, dates, or months; both sides must be the same kind."],
  "is at most": ["Comparison", "Left is less than or equal to right."],
  "is at least": ["Comparison", "Left is greater than or equal to right."],
  "is more than": ["Comparison", "Left is strictly greater than right."],
  "is equal to": ["Comparison", "Left equals right."],
  "is one of:": ["Enumeration", "The enumeration fact takes one of the listed options. Options must belong to that fact."],
  "is one of": ["Enumeration", "The enumeration fact takes one of the listed options."],
  "the number of whole years between": ["Dates", "Whole years from the first date to the second, day-based; February 29 births turn on March 1 in a non-leap year."],
  "the month containing": ["Dates", "The calendar month (YYYY-MM) that contains a date."],
  "the month before": ["Dates", "The calendar month one before a month."],
  "the month after": ["Dates", "The calendar month one after a month."],
  "the first day of": ["Dates", "The first calendar day of a month, as a date."],
  "consecutive months ending with": ["Months", "the N consecutive months ending with M: a list of N months, oldest first, ending with M."],
  "the months from": ["Months", "the months from A through B: every month from A to B inclusive."],
  "the number of months in": ["Months", "the number of months in [months] for which [condition]: counts the months where the condition is true. Unknown if any month is unknown."],
  "for which": ["Months", "Introduces the per-month condition of a count."],
  "averaged over": ["Months", "The average of a per-month number over a list of months. Unknown if any month is unknown."],
  "in each of": ["Months", "in each of [months]: the condition must hold in every listed month."],
  "in at least one of": ["Months", "in at least one of [months]: the condition holds in some listed month."],
  "plus": ["Arithmetic", "Addition of numbers."],
  "minus": ["Arithmetic", "Subtraction."],
  "times": ["Arithmetic", "Multiplication."],
  "divided by": ["Arithmetic", "Division."],
  "the lesser of": ["Arithmetic", "the lesser of A and B: the smaller number."],
  "there is a person in": ["Persons", "there is a person in [group] such that [condition]: true if some member of the group satisfies the condition, evaluated as \"that person\"."],
  "there is a person of whom this person is a": ["Persons", "Looks through this person's recorded relationships of the named kinds and tests the related person as \"that person\"."],
  "such that": ["Persons", "Introduces the condition tested on \"that person\"."],
  "that person's": ["Persons", "Reads a fact of the person bound by \"there is a person\"."],
  "that person is in": ["Persons", "True when the bound person is a member of a group fact."],
  "this person is a": ["Persons", "this person is a [relationship] of that person: checks the recorded relationships."],
  "of that person": ["Persons", "Ends a relationship test."],
  "is in": ["Persons", "True when the person is a member of a group fact."],
  "for": ["Months", "[per-month fact] for [month]: reads a per-month fact at a specific month."],
  "for that person": ["Persons", "Reads a table keyed by person at the bound person."],
  "if": ["Cases", "if [condition] then [value]; else if ...; otherwise [value]: the first true condition wins; unknown as soon as a condition is unknown."],
  "else if": ["Cases", "Next arm of a case."],
  "then": ["Cases", "Value of an arm."],
  "and": ["Connector", "Separates the two arguments of a two-argument pattern."],
  "through": ["Months", "Ends a month range."],
  "of": ["Connector", "Part of a longer pattern."],
  "in": ["Connector", "Part of a longer pattern."],
  "or": ["Persons", "Separates relationships in a relationship test."],
  "given": ["Examples", "Introduces the facts an example supplies."],
  "=>": ["Examples", "Separates an example's inputs from the value it expects."],
  "as of": ["Examples", "The Determination Date this example runs at."],
  "month": ["Examples", "The month a per-month example is evaluated in."],
  "parameters": ["Examples", "Parameter overrides for this example, as JSON."],
  "relationships": ["Examples", "Recorded relationships for this example, as JSON pairs."],
  "others": ["Examples", "Other persons in the case, as JSON."],
  "other months": ["Examples", "Default per-month facts for months this example does not name."],
};

export const CONST_DOCS: Record<string, string> = {
  "the Determination Date": "The date as of which eligibility is determined. A case-scoped supplied fact.",
  "the month containing the Determination Date": "The calendar month of the Determination Date.",
  "the month": "The month currently being evaluated. Only exists inside a per-month item or inside a months pattern.",
  "that person": "The other person bound by a \"there is a person\" pattern.",
};

export const KEY_DOCS: Record<string, string> = {
  ID: "Stable identifier of the item, never reused.",
  Fact: "The name approvers and engineers both use. Prefix with the program when the meaning is program-specific.",
  Identifier: "snake_case machine name; derived once from the name and never changed.",
  Kind: "Supplied (gathered, never computed), Derived (computed by a derivation; a rule is a derived fact), or Parameter (set by policy, versioned).",
  Type: "One of the volume's declared types; an enumeration adds \"one of: a, b\".",
  Scope: "person, person-month, case, month, or global.",
  Program: "All, Medicaid, or SNAP: which program's meaning this item carries.",
  Role: "outcome marks a derived fact that is a program result.",
  Meaning: "Plain sentences; the definition an approver signs.",
  Precision: "How edge cases are measured: day boundaries, rounding, which month.",
  Assumption: "For State elections: the value assumed until the election is known.",
  "Supplied by": "Where the value comes from, in words.",
  Value: "The parameter's value.",
  "Derived as": "The derivation, written only in catalog patterns. Continuation lines are indented 14 spaces.",
  Uses: "Computed: every fact and parameter the derivation references.",
  Source: "Excerpt ids from sources.md, comma separated.",
  Effective: "<date> to <date | present>.",
  Implemented: "Fact assembly or Determination engine. Placement, not interpretation.",
  Tags: "Tags from the volume's vocabulary. Tags add approvers.",
  Examples: "Rule-level tests, one per indented line: T1: given a=1; b=2 => yes",
  Open: "Open question ids from open-questions.md.",
  Approval: "Computed from the approval policy.",
  Status: "Draft, In review, or Approved. Computed.",
};

export const REL_DOCS: Record<string, string> = {
  parent: "This person is a parent of the other person.",
  guardian: "Legal guardian.",
  "caretaker relative": "Relative who assumes primary responsibility for a child's care (42 CFR 435.4).",
  spouse: "Spouse.",
  relative: "Relative by blood, adoption, or marriage not otherwise listed.",
};

export interface TokenDetails {
  title: string;
  cls: TokenClass;
  rows: Array<[string, string]>;
  /** A hash address for the item browser, when the token names something the
   *  app can open. */
  link?: string;
}

/** Everything `details` needs from the loaded volume: excerpts, open
 *  questions, and the volume id the app routes by. */
export interface DetailsVolume {
  volumeId?: string;
  sources?: ReadonlyArray<{ id: string; title: string; citation: string; text: string }>;
  openQuestions?: ReadonlyArray<{ id: string; title: string }>;
}

function itemDetails(engine: Engine, vol: DetailsVolume | null, it: Item, cls: TokenClass): TokenDetails {
  const uses = engine.usesOfItem(it.identifier);
  const usedBy = engine.usedBy(it.identifier);
  const rows: Array<[string, string] | null> = [
    ["identifier", it.identifier],
    ["kind", it.kind + (it.implemented ? ` · ${it.implemented}` : "")],
    ["type", it.type + (it.options?.length ? `: ${it.options.join(", ")}` : "")],
    ["scope", it.scope],
    ["program", it.program],
    it.kind === "parameter" ? ["value", engine.lit(engine.paramValue(it))] : null,
    ["meaning", it.meaning || ""],
    it.precision ? ["precision", it.precision] : null,
    it.assumption ? ["assumption", it.assumption] : null,
    it.supplied_by ? ["supplied by", it.supplied_by] : null,
    uses.length ? ["uses", uses.map((u) => engine.item(u)?.name ?? u).join(", ")] : null,
    usedBy.length ? ["used by", `${usedBy.length} item${usedBy.length === 1 ? "" : "s"}`] : null,
    ["sources", (it.sources ?? []).join(", ") || "-"],
    ["approval", engine.approvals(it).join(", ") || "-"],
    (it.open ?? []).length ? ["open", it.open!.join(", ")] : null,
  ];
  const d: TokenDetails = {
    title: `${it.id} · ${it.name}`,
    cls,
    rows: rows.filter((r): r is [string, string] => r !== null),
  };
  if (vol?.volumeId && it.id) d.link = `#/${vol.volumeId}/item/${it.id}`;
  return d;
}

export function details(
  engine: Engine, vol: DetailsVolume | null, tok: Token | null,
): TokenDetails | null {
  if (!tok) return null;
  if (tok.itemId) {
    const it = engine.itemById(tok.itemId) ?? engine.item(tok.itemId);
    if (it) return itemDetails(engine, vol, it, tok.cls);
  }
  const s = tok.text.trim();
  if (tok.cls === "phrase") {
    const d = PATTERN_DOCS[s] ?? PATTERN_DOCS[s.replace(/:$/, "")];
    return {
      title: s, cls: "phrase",
      rows: [["pattern", d ? d[0] : "phrase"], ["meaning", d ? d[1] : "Part of a longer pattern."]],
    };
  }
  if (tok.cls === "const") return { title: s, cls: "const", rows: [["constant", CONST_DOCS[s] ?? ""]] };
  if (tok.cls === "key") {
    const k = s.replace(/:$/, "");
    return {
      title: k, cls: "key",
      rows: [["field", KEY_DOCS[k] ?? "Example identifier."]],
    };
  }
  if (tok.cls === "tag") {
    return { title: s, cls: "tag", rows: [["tag", "Adds the approvers this volume attaches to the tag."]] };
  }
  if (tok.cls === "source" || tok.cls === "error") {
    const id = s.split(" ")[0];
    const src = vol?.sources?.find((x) => x.id === id);
    if (src) {
      const d: TokenDetails = {
        title: `${id} · ${src.title}`, cls: "source",
        rows: [
          ["citation", src.citation],
          ["excerpt", src.text.slice(0, 260) + (src.text.length > 260 ? "…" : "")],
        ],
      };
      if (vol?.volumeId) d.link = `#/${vol.volumeId}/sources`;
      return d;
    }
    const oq = vol?.openQuestions?.find((x) => x.id === id);
    if (oq) {
      const d: TokenDetails = {
        title: `${id} · ${oq.title}`, cls: "source",
        rows: [["open question", "See open-questions.md for the assumption in use."]],
      };
      if (vol?.volumeId) d.link = `#/${vol.volumeId}/questions`;
      return d;
    }
  }
  if (tok.cls === "literal") {
    if (REL_DOCS[s]) return { title: s, cls: "literal", rows: [["relationship", REL_DOCS[s]]] };
    let what = "literal";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) what = "calendar date";
    else if (/^\d{4}-\d{2}$/.test(s)) what = "month";
    else if (/^-?\d+(\.\d+)?$/.test(s)) what = "number";
    else if (/^(yes|no|true|false)$/.test(s)) what = "yes/no";
    else if (s === "unknown") what = "unknown value";
    else {
      const owner = engine.items().find((i) => (i.options ?? []).includes(s));
      if (owner) what = `option of ${owner.name}`;
      else if (/^[[{]/.test(s)) what = "JSON value";
      else if (engine.meta.types.includes(s)) what = "codex type";
      else if ((engine.meta.scopes as readonly string[]).includes(s)) what = "scope";
    }
    return { title: s, cls: "literal", rows: [["literal", what]] };
  }
  if (tok.cls === "error") {
    return {
      title: s, cls: "error",
      rows: [["not accepted", "The checker does not accept this value for this field."]],
    };
  }
  if (tok.cls === "unknown") {
    const q = s.toLowerCase();
    const near = engine.items()
      .filter((f) => (f.name || "").toLowerCase().includes(q) || f.identifier.includes(q)
        || q.split(/\s+/).some((w) => w.length > 3 && (f.name || "").toLowerCase().includes(w)))
      .slice(0, 5)
      .map((f) => f.name);
    return {
      title: s, cls: "unknown",
      rows: [
        ["not recognised", "Not a fact, parameter, pattern, constant, or literal the checker knows."],
        near.length ? ["did you mean", near.join(" · ")] : ["hint", "Type @ for facts, # for sources, / for patterns."],
      ],
    };
  }
  return null;
}
