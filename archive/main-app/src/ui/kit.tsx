/* The shared components every page builds from (docs/design-system.md): one
 * way to show each object wherever it appears, so the seven places read as
 * one product. A page that shows an item, a household, ledger prose, a
 * "how this is counted" definition, a page's tabs or a status uses these,
 * and the classes in design.css; it does not style its own copy.
 *
 * - `ItemRef`: an item by its plain name, a link to its page, the id small
 *   after it (never the identifier).
 * - `HouseholdRef`: a stored household by its plain title, shortened, the id
 *   small after it.
 * - `Prose`: ledger prose (a meaning, an assumption, a reasoning) with every
 *   identifier read as the item's name and linked; excerpt, document and
 *   question ids small links (item/model.ts `proseParts`).
 * - `HowCounted`: the "How this is counted" disclosure a number's definition
 *   sits behind (never in the card body).
 * - `PageTabs`: a page's own tabs, as links (the address names the tab).
 * - `ScopeNote`: a list narrowed to the reader's programs, with the way back.
 * - Badges: `UnverifiedBadge`, `StagedBadge` (the words and colours every
 *   page uses for those states). */
import type { ComponentChildren } from "preact";
import type { Engine } from "../engine/engine";
import type { HouseholdCase } from "../engine/cases";
import type { Item } from "../engine/types";
import type { LoadedVolume } from "../ledger/load";
import { proseParts } from "./item/model";
import { programLabel } from "./roles";
import { buildHash, type Route } from "./router";
import { plainCaseTitle } from "./walkthrough";

// ---- links to the canonical pages

export function itemPageHref(r: Route, it: Pick<Item, "id">): string {
  return buildHash({ ...r, view: "item", arg: it.id, params: {} });
}

export function householdPageHref(r: Route, caseId: string): string {
  return buildHash({ ...r, view: "households", arg: caseId, params: {} });
}

/** Where an excerpt is read: its document, scrolled to the passage, or the
 *  excerpt's own page when it has no document. */
export function excerptLink(r: Route, vol: Pick<LoadedVolume, "sources">, sourceId: string): string {
  const s = vol.sources.find((x) => x.id === sourceId);
  return s?.document
    ? buildHash({ ...r, view: "law", arg: `doc/${s.document}`, params: { at: sourceId } })
    : buildHash({ ...r, view: "law", arg: `sources/${sourceId}`, params: {} });
}

/** An id, small and secondary: "CO-191", "OQ-533", "CO-01". */
export function IdSmall({ id }: { id: string }) {
  return <small class="idsmall">{id}</small>;
}

/** An item by its plain name, a link to its page, its id small after it. */
export function ItemRef(
  { r, item, label, noId = false }:
  { r: Route; item: Pick<Item, "id" | "name">; label?: ComponentChildren; noId?: boolean },
) {
  return (
    <>
      <a class="itemref" href={itemPageHref(r, item)}>{label ?? item.name}</a>
      {!noId && <>{" "}<IdSmall id={item.id} /></>}
    </>
  );
}

/** A household's title, shortened at a word: the plain name lists use. */
export function householdName(hc: Pick<HouseholdCase, "title">, max = 48): string {
  const t = plainCaseTitle(hc.title).title.split(/;\s/)[0];
  return t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : t;
}

/** A stored household by its plain title (its first clause, shortened), a
 *  link to its page, the id small after it; the whole title on hover. */
export function HouseholdRef(
  { r, hc, id, max = 48 }:
  { r: Route; hc?: Pick<HouseholdCase, "id" | "title"> | null; id?: string; max?: number },
) {
  const caseId = hc?.id ?? id ?? "";
  if (!hc) return <a class="hhref" href={householdPageHref(r, caseId)}>{caseId}</a>;
  return (
    <>
      <a class="hhref" href={householdPageHref(r, caseId)} title={plainCaseTitle(hc.title).title}>{householdName(hc, max)}</a>
      {" "}<IdSmall id={caseId} />
    </>
  );
}

/** Households as plain names: the first `max`, the rest behind "and N
 *  more" (a disclosure, so every name stays on the page). `mark` is a
 *  household to put first and highlight (a list narrowed to it). */
export function HouseholdRefs(
  { r, ids, cases, max = 4, mark }:
  { r: Route; ids: readonly string[]; cases: readonly HouseholdCase[]; max?: number; mark?: string },
) {
  const ordered = mark && ids.includes(mark) ? [mark, ...ids.filter((x) => x !== mark)] : [...ids];
  const one = (c: string, i: number) => (
    <span key={c} class={c === mark ? "hl" : undefined}>
      {i > 0 && "; "}<HouseholdRef r={r} hc={cases.find((x) => x.id === c)} id={c} max={40} />
    </span>
  );
  const rest = ordered.slice(max);
  return (
    <span class="hhrefs">
      {ordered.slice(0, max).map(one)}
      {rest.length > 0 && (
        <details class="more">
          <summary>and {rest.length.toLocaleString("en-US")} more</summary>
          {rest.map((c, i) => one(c, i))}
        </details>
      )}
    </span>
  );
}

// ---- prose

/** Ledger prose read in plain words: each item it names by identifier or id
 *  is its name, a link to its page; excerpt, document and question ids are
 *  small links to their own pages. The one renderer for a meaning, an
 *  assumption, a reasoning or a note, on every page. */
export function Prose(
  { engine, vol, r, text, as = "span", class: klass }:
  { engine: Pick<Engine, "item" | "itemById">; vol: Pick<LoadedVolume, "sources" | "documents" | "openQuestions"> | null; r: Route; text: string; as?: "span" | "p"; class?: string },
) {
  const parts = proseParts(engine, vol, text);
  const kids = parts.map((p, i) => {
    if (typeof p === "string") return p;
    if (p.kind === "item") return <a key={i} class="itemref" href={itemPageHref(r, p)}>{p.label}</a>;
    if (p.kind === "source") return <a key={i} class="refid" title={p.title} href={vol ? excerptLink(r, vol, p.id) : "#"}>{p.id}</a>;
    if (p.kind === "document") {
      return <a key={i} class="refid" title={p.title} href={buildHash({ ...r, view: "law", arg: `doc/${p.id}`, params: {} })}>{p.id}</a>;
    }
    return <a key={i} class="refid" title={p.title} href={buildHash({ ...r, view: "questions", arg: p.id, params: {} })}>{p.id}</a>;
  });
  const cls = `prose${klass ? ` ${klass}` : ""}`;
  return as === "p" ? <p class={cls}>{kids}</p> : <span class={cls}>{kids}</span>;
}

// ---- definitions, tabs, scope

/** "How this is counted": a number's definition, kept out of the card body. */
export function HowCounted({ children }: { children: ComponentChildren }) {
  return (
    <details class="howcounted">
      <summary>How this is counted</summary>
      <div class="howbody">{children}</div>
    </details>
  );
}

export interface PageTab {
  id: string;
  label: ComponentChildren;
  href: string;
}

/** A page's own tabs: links, the address names the tab, the current one
 *  marked for screen readers. `class` keeps a page's own hook for tests. */
export function PageTabs(
  { tabs, on, label, class: klass }: { tabs: readonly PageTab[]; on: string; label: string; class?: string },
) {
  return (
    <nav class={`pagetabs${klass ? ` ${klass}` : ""}`} aria-label={label}>
      {tabs.map((t) => (
        <a key={t.id} class={on === t.id ? "on" : ""} aria-current={on === t.id ? "page" : undefined} href={t.href} data-tab={t.id || undefined}>
          {t.label}
        </a>
      ))}
    </nav>
  );
}

/** "Only your programs: Medicaid, CHP+ and what they share. Show every
 *  program": a list the Desk opened narrowed to the reader's programs. */
export function ScopeNote({ programs, allHref }: { programs: readonly string[] | null; allHref: string }) {
  if (!programs) return null;
  return (
    <p class="scopenote" role="note">
      Only your programs: {programs.map(programLabel).join(", ")} and what they share.{" "}
      <a href={allHref}>Show every program</a>
    </p>
  );
}

// ---- badges

/** The words for an unverified source, the same everywhere: an excerpt is
 *  "Unverified: not a quotation"; an item citing one, "Unverified source";
 *  a result or item resting on one through the rules, "Rests on an
 *  unverified source". Amber (warn), never green. */
export const UNVERIFIED_WORDS = {
  excerpt: "Unverified: not a quotation",
  item: "Unverified source",
  rests: "Rests on an unverified source",
} as const;

export function UnverifiedBadge(
  { of = "item", title }: { of?: keyof typeof UNVERIFIED_WORDS; title?: string },
) {
  return <span class="flag unverified" title={title ?? "Cites an excerpt that is not a verified quotation of its document"}>{UNVERIFIED_WORDS[of]}</span>;
}

/** "In your proposal": staged in this browser, not yet sent. Blue (info). */
export function StagedBadge({ children = "In your proposal" }: { children?: ComponentChildren }) {
  return <span class="tag staged">{children}</span>;
}
