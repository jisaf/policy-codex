/** Rich text: pattern English, identifiers, source ids, and field keys shown
 *  the way the editor paints them, and clickable wherever they appear.
 *
 *  One popover at a time, held in a module-level signal, so a token anywhere
 *  on the page opens the same card and the previous one closes itself. The
 *  card is `details()` from ./highlight — the editor's token documentation —
 *  plus the two actions a reader wants from it: open the definition, and walk
 *  back to whatever the definition rests on. */
import { signal } from "@preact/signals";
import { useLayoutEffect } from "preact/hooks";
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import {
  CONST_DOCS, PATTERN_DOCS, details, tokenizeAs,
  type DetailsVolume, type TextMode, type Token, type TokenClass, type TokenDetails,
} from "./highlight";
import { openHelp } from "./Help";
import { kindLabel } from "./labels";
import { buildHash, type Route, type ViewName } from "./router";
import { engineSig, route, viewEngine, volumeSig } from "./state";

/** The grammar's own source, and the vocabulary's. */
export const CONVENTIONS = "docs/conventions.md";
export const GOVERNANCE = "docs/governance.md";

/** Constants the parser matches literally that also name a ledger item, so
 *  their card can offer that item's decision record. */
const CONST_ITEMS: Record<string, string> = {
  "the Determination Date": "determination_date",
  "the month containing the Determination Date": "determination_date",
};

/** Field keys documented under "Item shape"; the example keys an Examples
 *  line carries (`T1:`) are documented under "Tests". */
const KEY_SECTIONS: readonly string[] = [
  "ID", "Fact", "Identifier", "Kind", "Type", "Scope", "Program", "Role", "Meaning",
  "Precision", "Assumption", "Supplied by", "Value", "Derived as", "Uses", "Source",
  "Effective", "Implemented", "Tags", "Open", "Approval", "Status",
];

/** The relationship words the catalog documents beside its person patterns. */
const REL_LIKE = /^(parent|guardian|caretaker relative|spouse|relative)$/;

/** What a popover needs of the loaded volume: `details()`'s excerpts and open
 *  questions, plus the documents an excerpt can be traced into. A
 *  `LoadedVolume` satisfies it. */
export interface RichVolume extends DetailsVolume {
  documents?: ReadonlyArray<{ id: string; title: string; url?: string }>;
}

export interface TokenAction {
  label: string;
  href?: string;
  onClick?: () => void;
  /** An address outside the app, opened in a new tab. */
  external?: boolean;
}

interface Rect { top: number; left: number; bottom: number; right: number }

export interface PopoverState {
  tok: Token;
  anchorRect: Rect;
  engine: Engine;
  vol: RichVolume | null;
}

/** The one popover on the page, or none. */
export const popoverSig = signal<PopoverState | null>(null);

export function closePopover(): void {
  popoverSig.value = null;
}

function clsOf(it: Item): TokenClass {
  return it.kind === "parameter" ? "param" : it.kind === "derived" ? "derived" : "fact";
}

function itemOf(engine: Engine, id: string | undefined): Item | undefined {
  if (!id) return undefined;
  return engine.itemById(id) ?? engine.item(id);
}

/** The card and the actions one token opens. Pure: the only side effect an
 *  action can carry is opening the help panel, and that is a signal write the
 *  reader asked for. */
export function popoverModel(
  engine: Engine, vol: RichVolume | null, tok: Token, r: Route,
): { card: TokenDetails; actions: TokenAction[] } {
  const s = tok.text.trim();
  const card = details(engine, vol, tok)
    ?? { title: s, cls: tok.cls, rows: [] as Array<[string, string]> };
  const rows = card.rows.slice();
  const hash = (view: ViewName, arg: string | null, params: Record<string, string> = {}) =>
    buildHash({ ...r, view, arg, params });
  const itemActions = (it: Item): TokenAction[] => [
    { label: "Open definition", href: hash("item", it.id) },
    { label: "Trace to source", href: hash("item", it.id, { section: "record" }) },
  ];

  const it = itemOf(engine, tok.itemId);
  if (it) {
    // The kind reads in the plain words the rest of the app uses, with the
    // ledger's own term kept alongside.
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] !== "kind") continue;
      const rest = rows[i][1].slice(it.kind.length);
      rows[i] = ["kind", `${kindLabel(it.kind)} (${it.kind})${rest}`];
    }
    return { card: { ...card, rows }, actions: itemActions(it) };
  }

  if (tok.cls === "source" || tok.cls === "error") {
    const id = s.split(" ")[0];
    const src = vol?.sources?.find((x) => x.id === id);
    if (src) {
      const docId = (src as { document?: string }).document;
      const doc = docId ? vol?.documents?.find((d) => d.id === docId) : undefined;
      const actions: TokenAction[] = [
        { label: "Open definition", href: hash("source", id) },
        {
          label: "Trace to source",
          href: doc ? hash("document", doc.id, { excerpt: id }) : hash("source", id),
        },
      ];
      if (doc) rows.push(["document", `${doc.id} · ${doc.title}`]);
      if (doc?.url) actions.push({ label: doc.url, href: doc.url, external: true });
      return { card: { ...card, rows }, actions };
    }
    const oq = vol?.openQuestions?.find((x) => x.id === id);
    if (oq) {
      return {
        card: { ...card, rows },
        actions: [{ label: "Open definition", href: hash("table", null, { open: id }) }],
      };
    }
  }

  if (tok.cls === "phrase") {
    const doc = PATTERN_DOCS[s] ?? PATTERN_DOCS[s.replace(/:$/, "")];
    const heading = doc && doc[0] === "Examples" ? "Tests" : "Pattern catalog";
    return {
      card: { ...card, rows },
      actions: [{ label: "Trace to source", onClick: () => openHelp(CONVENTIONS, heading) }],
    };
  }

  if (tok.cls === "const") {
    const named = CONST_ITEMS[s] ? engine.item(CONST_ITEMS[s]) : undefined;
    const actions: TokenAction[] = [];
    if (named) actions.push({ label: "Open definition", href: hash("item", named.id) });
    actions.push({
      label: "Trace to source", onClick: () => openHelp(CONVENTIONS, "Pattern catalog"),
    });
    if (named) {
      actions.push({
        label: "Decision record", href: hash("item", named.id, { section: "record" }),
      });
    }
    return { card: { ...card, rows }, actions };
  }

  if (tok.cls === "key") {
    const k = s.replace(/:$/, "");
    const heading = KEY_SECTIONS.includes(k) ? "Item shape" : "Tests";
    return {
      card: { ...card, rows },
      actions: [{ label: "Trace to source", onClick: () => openHelp(CONVENTIONS, heading) }],
    };
  }

  if (tok.cls === "tag") {
    const owners = engine.meta.approval_policy?.by_tag?.[s] ?? [];
    rows.push(["approved by", owners.length ? owners.join(", ") : "no extra approver"]);
    return {
      card: { ...card, rows },
      actions: [{ label: "Trace to source", onClick: () => openHelp(GOVERNANCE, "Vocabulary") }],
    };
  }

  if (tok.cls === "unknown") {
    return {
      card: { ...card, rows },
      actions: [{ label: "Search for it", href: hash("search", null, { q: s }) }],
    };
  }

  if (tok.cls === "literal") {
    const owner = engine.items().find((i) => (i.options ?? []).includes(s));
    if (owner) return { card: { ...card, rows }, actions: itemActions(owner) };
    if (CONST_DOCS[s] || REL_LIKE.test(s)) {
      return {
        card: { ...card, rows },
        actions: [
          { label: "Trace to source", onClick: () => openHelp(CONVENTIONS, "Pattern catalog") },
        ],
      };
    }
  }

  return { card: { ...card, rows }, actions: [] };
}

function rectOf(el: HTMLElement): Rect {
  try {
    const b = el.getBoundingClientRect();
    return { top: b.top, left: b.left, bottom: b.bottom, right: b.right };
  } catch {
    return { top: 0, left: 0, bottom: 0, right: 0 };
  }
}

interface TokProps {
  text: string;
  cls: TokenClass;
  /** Ledger id of the item this token names, when it names one. */
  itemId?: string;
  engine?: Engine | null;
  vol?: RichVolume | null;
  class?: string;
}

/** One token: a button, so Tab reaches it and Enter opens it. */
export function Tok({ text, cls, itemId, engine, vol, class: extra }: TokProps) {
  const eng = engine ?? viewEngine() ?? engineSig.value;
  const volume = vol ?? (volumeSig.value as RichVolume | null);
  const klass = `tok ${cls}${extra ? ` ${extra}` : ""}`;
  if (!eng) return <span class={klass}>{text}</span>;
  const tok: Token = itemId
    ? { text, cls, start: 0, end: text.length, itemId }
    : { text, cls, start: 0, end: text.length };
  return (
    <button
      type="button" class={klass} data-id={itemId ?? undefined} data-tok={cls}
      onClick={(e) => {
        // A token sits inside rows and summaries that answer to a click of
        // their own; opening its card is the whole of what it means.
        e.preventDefault();
        e.stopPropagation();
        popoverSig.value = {
          tok, anchorRect: rectOf(e.currentTarget as HTMLElement), engine: eng, vol: volume,
        };
      }}
    >{text}</button>
  );
}

/** A bare identifier — a dependency list, a table cell, a story line. */
export function Ident(
  { id, label, engine, vol }:
  { id: string; label?: string; engine?: Engine | null; vol?: RichVolume | null },
) {
  const eng = engine ?? viewEngine() ?? engineSig.value;
  const it = eng ? itemOf(eng, id) : undefined;
  return (
    <Tok
      text={label ?? id} cls={it ? clsOf(it) : "unknown"} itemId={it?.id}
      engine={eng} vol={vol}
    />
  );
}

interface RichProps {
  text: string;
  engine?: Engine | null;
  vol?: RichVolume | null;
  mode?: TextMode;
  /** Rendered as a `<span>` rather than a `<pre>`; the default follows the
   *  mode (`inline` is a span, everything else a pre). */
  as?: "pre" | "span";
  class?: string;
}

/** A stretch of text with every token the checker knows made clickable, and
 *  everything else passed through unchanged — including its newlines. */
export function Rich({ text, engine, vol, mode = "expr", as, class: extra }: RichProps) {
  const eng = engine ?? viewEngine() ?? engineSig.value;
  const volume = vol ?? (volumeSig.value as RichVolume | null);
  const klass = `rich ${mode}${extra ? ` ${extra}` : ""}`;
  const tag = as ?? (mode === "inline" ? "span" : "pre");
  if (!eng) {
    return tag === "span" ? <span class={klass}>{text}</span> : <pre class={klass}>{text}</pre>;
  }
  const lines = tokenizeAs(eng, text, mode, {
    sourceIds: volume?.sources?.map((s) => s.id),
    questionIds: volume?.openQuestions?.map((q) => q.id),
  });
  const kids = lines.flatMap((line, i) => {
    const parts = line.tokens.length
      ? line.tokens.map((t) => (t.cls === "plain"
        ? t.text
        : (
          <Tok
            key={t.start} text={t.text} cls={t.cls} itemId={t.itemId}
            engine={eng} vol={volume}
          />
        )))
      : [line.text];
    return i === 0 ? parts : ["\n", ...parts];
  });
  return tag === "span" ? <span class={klass}>{kids}</span> : <pre class={klass}>{kids}</pre>;
}

/** Where the card sits: under its token, clamped to the viewport, and above
 *  it when there is no room below. Measured in viewport coordinates because
 *  the card is fixed, so a scrolled page needs no correction. */
function place(rect: Rect): { left: number; top: number } {
  const w = typeof innerWidth === "number" ? innerWidth : 1024;
  const h = typeof innerHeight === "number" ? innerHeight : 768;
  const left = Math.max(8, Math.min(rect.left, w - 372));
  const below = rect.bottom + 6;
  const top = below + 220 > h ? Math.max(8, rect.top - 226) : below;
  return { left, top };
}

/** The one card, mounted once by App. */
export function TokenPopover() {
  const st = popoverSig.value;

  useLayoutEffect(() => {
    if (!st) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePopover(); };
    const onClick = (e: Event) => {
      const t = e.target as HTMLElement | null;
      // A click on another token swaps the card; the token's own handler does
      // that, so this one only closes on a click that is neither.
      const inside = t && typeof t.closest === "function"
        && (t.closest(".tokpop") || t.closest("button.tok") || t.closest(".tourbox"));
      if (inside) return;
      closePopover();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick, true);
    };
  }, [st]);

  if (!st) return null;
  const { card, actions } = popoverModel(st.engine, st.vol, st.tok, route.value);
  const at = place(st.anchorRect);
  return (
    <div
      class="tokpop" style={{ left: `${at.left}px`, top: `${at.top}px` }}
      role="dialog" aria-label={card.title}
    >
      <div class="tokcard">
        <div class="tip-title"><span class={`tk ${card.cls}`}>{card.title}</span></div>
        {card.rows.map(([k, v]) => (
          <div key={k} class="tip-row"><span class="tip-k">{k}</span><span>{v}</span></div>
        ))}
      </div>
      <div class="tokpop-actions">
        {actions.map((a) => (a.href
          ? (
            <a
              key={a.label} href={a.href}
              {...(a.external ? { target: "_blank", rel: "noreferrer" } : {})}
              onClick={() => { if (!a.external) closePopover(); }}
            >{a.label}</a>
          )
          : (
            <button
              key={a.label} type="button"
              onClick={() => { a.onClick?.(); closePopover(); }}
            >{a.label}</button>
          )))}
        <span class="spacer" />
        <button type="button" class="tokpop-close" onClick={closePopover}>Close</button>
      </div>
    </div>
  );
}
