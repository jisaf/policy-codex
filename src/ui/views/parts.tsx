/* Small pieces the by-role and by-outcome views share: a link to an item
 * with its id small beside it, the rule text an item rests on (each excerpt
 * a link that opens it highlighted), its open questions (each a link to the
 * question's own page), and the placeholder banner aid codes carry. */
import type { ComponentChildren } from "preact";
import type { Item } from "../../engine/types";
import type { AidCodeMap } from "../../ledger/aid-codes";
import type { LoadedVolume } from "../../ledger/load";
import { EXCERPT_KIND_LABEL, excerptKind, isUnverified } from "../provenance";
import { buildHash, type Route } from "../router";

export function itemHref(r: Route, it: Pick<Item, "id">): string {
  return buildHash({ ...r, view: "item", arg: it.id, params: {} });
}

export function questionHref(r: Route, id: string): string {
  return buildHash({ ...r, view: "questions", arg: id, params: {} });
}

export function excerptHref(r: Route, sourceId: string): string {
  return buildHash({ ...r, view: "source", arg: sourceId, params: { excerpt: sourceId } });
}

/** The case walkthrough for one person and program (route owned by the
 *  walkthrough view: `#/<volume>/walkthrough/<case>?person=&program=`). */
export function walkthroughHref(
  r: Route, caseId: string, person?: string, program?: string,
  at?: { outcome?: string; month?: string | null },
): string {
  const params: Record<string, string> = {};
  if (person) params.person = person;
  if (program) params.program = program;
  if (at?.outcome) params.outcome = at.outcome;
  if (at?.month) params.month = at.month;
  return buildHash({ ...r, view: "walkthrough", arg: caseId, params });
}

/** An item's name as a link, its id and identifier small after it. */
export function ItemLink({ route: r, item, children }: { route: Route; item: Item; children?: ComponentChildren }) {
  return (
    <>
      <a href={itemHref(r, item)}>{children ?? item.name}</a>{" "}
      <small class="mono muted">{item.id} · {item.identifier}</small>
    </>
  );
}

/** "Rule text: S12 (Regulation), ... · Open questions: OQ-5 ...", each a
 *  link. Nothing when the item cites neither. */
export function Cites(
  { vol, route: r, item, sourceIds }:
  { vol: LoadedVolume; route: Route; item: Item; sourceIds?: string[] },
) {
  const ids = sourceIds ?? item.sources ?? [];
  const sources = ids.map((id) => vol.sources.find((s) => s.id === id)).filter((s) => !!s);
  const open = item.open ?? [];
  if (!sources.length && !open.length) return null;
  return (
    <p class="cites">
      {sources.length > 0 && (
        <span>
          Rule text:{" "}
          {sources.map((s, i) => (
            <span key={s!.id}>
              {i > 0 && ", "}
              <a href={excerptHref(r, s!.id)} title={s!.citation}>{s!.title || s!.citation}</a>{" "}
              <small class="muted">({EXCERPT_KIND_LABEL[excerptKind(s!, vol.documents)]}, {s!.id})</small>
              {isUnverified(s!) && <> <span class="flag unverified">unverified</span></>}
            </span>
          ))}
        </span>
      )}
      {sources.length > 0 && open.length > 0 && " · "}
      {open.length > 0 && (
        <span>
          Open questions:{" "}
          {open.map((q, i) => (
            <span key={q}>{i > 0 && ", "}<a href={questionHref(r, q)}>{q}</a></span>
          ))}
        </span>
      )}
    </p>
  );
}

/** The banner every page showing a code carries while the codes are
 *  placeholders. */
export function PlaceholderBanner({ map }: { map: AidCodeMap }) {
  if (map.status !== "placeholder") return null;
  return (
    <p class="placeholder-banner" role="note">
      <b>PLACEHOLDER aid codes.</b> {map.notice || "These are not CBMS aid codes."}
    </p>
  );
}

/** A code as a chip: the code small, marked as a placeholder. */
export function CodeChip({ code, placeholder }: { code: string; placeholder: boolean }) {
  return (
    <span class={`codechip${placeholder ? " placeholder" : ""}`} title={placeholder ? "Placeholder code, not a CBMS aid code" : undefined}>
      {code}
    </span>
  );
}
