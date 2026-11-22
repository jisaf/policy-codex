/* The shell's data, apart from its components (Shell.tsx): the seven places
 * of the sidebar, the "For implementers" menu, which place a page belongs
 * to, and the breadcrumb trail. The sidebar highlight and the breadcrumb are
 * both read from `placeOf`, so they always agree (Blind B's figure page
 * highlighted Programs under a "Figures" breadcrumb).
 *
 * Extension points for the page tracks: a place's page is wired in App.tsx's
 * `ViewSlot`; its sub-pages add a case to `crumbsFor`; an older view it
 * replaces is removed from router.ts `internalRoute`. */
import { signal } from "@preact/signals";
import type { Engine } from "../engine/engine";
import type { HouseholdCase } from "../engine/cases";
import type { DocumentMeta } from "../ledger/documents";
import { personLabel } from "./present";
import { programLabel } from "./roles";
import {
  argParts, buildHash, householdTab, type HouseholdTab, type PlaceName, type Route, type ViewName,
} from "./router";
import { plainCaseTitle } from "./walkthrough";

/** Whether the sidebar's drawer is open (phone width only; on a wider
 *  screen the sidebar is always shown). */
export const navOpenSig = signal(false);

export interface PlaceInfo {
  id: PlaceName;
  label: string;
  /** One line: what the place is for, in the reader's words. */
  purpose: string;
}

/** The seven places, in sidebar order (docs/design-unified-ui.md). */
export const PLACES: readonly PlaceInfo[] = [
  { id: "desk", label: "Desk", purpose: "Your role's work: what waits for your signature, the questions you own, your proposal, and what takes effect soon." },
  { id: "programs", label: "Programs", purpose: "What each program decides, and the rules behind each outcome." },
  { id: "figures", label: "Figures", purpose: "Every dated figure, as it stands on a date you choose." },
  { id: "households", label: "Households", purpose: "The stored test households, one page each: results and aid codes, documents still needed, what the case states." },
  { id: "questions", label: "Questions", purpose: "The decision queue: every open question, who owns it, and what it holds up." },
  { id: "law", label: "Law", purpose: "Where a statute governs over a Colorado rule, figures whose source is unverified or missing, and the sources and documents themselves." },
  { id: "changes", label: "Changes", purpose: "What takes effect, month by month, and your proposal." },
];

export function placeInfo(id: PlaceName): PlaceInfo {
  return PLACES.find((p) => p.id === id)!;
}

export interface ImplementerLink {
  view: ViewName;
  label: string;
  params?: Record<string, string>;
}

/** The secondary menu: the tools an implementer needs and policy staff do
 *  not (decision 3 of the spec). */
export const IMPLEMENTER_LINKS: readonly ImplementerLink[] = [
  { view: "table", label: "Table of every item" },
  { view: "handoff", label: "Projection and handoff" },
  { view: "handoff", label: "Conformance suite", params: { show: "conformance" } },
  { view: "graph", label: "Whole-ledger graph" },
];

/** Where the sidebar puts a page: one of the seven places, the implementer
 *  menu, or nowhere (search). An item is a figure's page under Figures and
 *  a rule's or fact's under Programs. `c` is the canonical route. */
export type ShellPlace = PlaceName | "implementers" | null;

export function placeOf(c: Route, engine?: (Pick<Engine, "itemById"> & Partial<Pick<Engine, "item">>) | null): ShellPlace {
  switch (c.view) {
    case "desk": case "programs": case "figures": case "households": case "questions": case "law": case "changes":
      return c.view;
    case "item":
      return engine?.itemById(c.arg ?? "")?.kind === "parameter" ? "figures" : "programs";
    case "map": {
      // Policy staff's Map: under the place of what it is centred on (a
      // figure's under Figures, a rule's or a program's under Programs).
      const center = c.params.center ?? c.arg ?? "";
      const it = engine?.itemById(center) ?? (engine as Pick<Engine, "item"> | null | undefined)?.item?.(center);
      return it?.kind === "parameter" ? "figures" : "programs";
    }
    case "table": case "graph": case "handoff":
      return "implementers";
    default:
      return null;
  }
}

export interface Crumb {
  label: string;
  /** Null for the page itself (the last crumb). */
  href: string | null;
}

export interface CrumbData {
  engine?: Pick<Engine, "itemById" | "item"> | null;
  cases?: readonly HouseholdCase[];
  documents?: readonly DocumentMeta[];
}

export const HOUSEHOLD_TAB_LABEL: Record<HouseholdTab, string> = {
  results: "Results and aid codes",
  documents: "Documents still needed",
  whatif: "What if",
  states: "What the case states",
};

const LAW_SECTION_LABEL: Record<string, string> = {
  departures: "Statute over rule",
  unverified: "Unverified and missing figures",
  sources: "Sources",
  doc: "Documents",
};

const CHANGES_SECTION_LABEL: Record<string, string> = {
  proposal: "My proposal",
  codex: "Edits to the codex",
};

/** The breadcrumb trail of a canonical route: the place first, then each
 *  object down to the page itself. */
export function crumbsFor(c: Route, data: CrumbData = {}): Crumb[] {
  const at = (patch: Partial<Route>): string => buildHash({ ...c, arg: null, params: {}, ...patch });
  const place = placeOf(c, data.engine);
  const parts = argParts(c);
  const out: Crumb[] = [];
  if (place && place !== "implementers") out.push({ label: placeInfo(place).label, href: at({ view: place }) });
  if (place === "implementers") out.push({ label: "For implementers", href: null });
  const push = (label: string, patch: Partial<Route> | null) => out.push({ label, href: patch ? at(patch) : null });
  switch (c.view) {
    case "desk":
      if (parts[0] === "sign") push("To sign", { view: "desk", arg: "sign", params: c.params.role ? { role: c.params.role } : {} });
      if (parts[0] === "sign" && parts[1]) push(data.engine?.itemById(parts[1])?.name ?? parts[1], null);
      break;
    case "programs":
      if (parts[0]) push(programLabel(parts[0]), { view: "programs", arg: parts[0] });
      if (parts[1]) push(data.engine?.item(parts[1])?.name ?? parts[1], null);
      else if (c.params.tab === "aid-codes") push("Aid codes", null);
      else if (c.params.tab === "map") push("Map", null);
      break;
    case "households": {
      const [caseId, person, outcome] = parts;
      if (!caseId) break;
      if (caseId === "new") { push("New household", null); break; }
      const hc = data.cases?.find((x) => x.id === caseId);
      push(hc ? `${caseId}: ${shorten(plainCaseTitle(hc.title).title, 48)}` : caseId, { view: "households", arg: caseId });
      if (person) {
        push(personLabel(person), null);
        if (outcome) push(data.engine?.item(outcome)?.name ?? outcome, null);
      } else {
        push(HOUSEHOLD_TAB_LABEL[householdTab(c)], null);
      }
      break;
    }
    case "questions":
      if (c.arg) push(c.arg, { view: "questions", arg: c.arg });
      break;
    case "law":
      if (parts[0]) push(LAW_SECTION_LABEL[parts[0]] ?? parts[0], { view: "law", arg: parts[0] });
      if (parts[1]) {
        const d = parts[0] === "doc" ? data.documents?.find((x) => x.id === parts[1]) : undefined;
        push(d ? shorten(d.title, 48) : parts[1], { view: "law", arg: c.arg });
      }
      break;
    case "changes":
      if (parts[0]) push(CHANGES_SECTION_LABEL[parts[0]] ?? parts[0], { view: "changes", arg: parts[0] });
      break;
    case "item": {
      const it = data.engine?.itemById(c.arg ?? "");
      if (it && place === "programs" && it.program !== "All") push(programLabel(it.program), { view: "programs", arg: it.program });
      push(it?.name ?? c.arg ?? "", { view: "item", arg: c.arg });
      if (c.params.tab === "map") push("Map", null);
      break;
    }
    case "map": {
      const center = c.params.center ?? "";
      const it = data.engine?.itemById(center) ?? data.engine?.item(center);
      const program = center.startsWith("program:") ? center.slice("program:".length) : null;
      if (it) {
        if (place === "programs" && it.program !== "All") push(programLabel(it.program), { view: "programs", arg: it.program });
        push(it.name, { view: "item", arg: it.id });
      } else if (program) {
        push(programLabel(program), { view: "programs", arg: program });
      }
      push("Map", null);
      break;
    }
    case "search":
      push("Search", { view: "search", params: c.params });
      if (c.params.q) push(`"${c.params.q}"`, null);
      break;
    case "table": push("Table of every item", { view: "table" }); break;
    case "graph": push("Whole-ledger graph", { view: "graph" }); break;
    case "handoff": push(c.params.show === "conformance" ? "Conformance suite" : "Projection and handoff", { view: "handoff" }); break;
    default: break;
  }
  // The last crumb is the page itself.
  if (out.length) out[out.length - 1] = { ...out[out.length - 1], href: null };
  return out;
}

function shorten(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;
}
