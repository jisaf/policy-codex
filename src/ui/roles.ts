/* The by-role home's data (phase 13): for one persona, the programs it works
 * in and their outcomes; what waits on its signature; the open questions on
 * its programs; the statute-over-rule departures; what changed recently and
 * what comes into force next (county supervisor task 5); and the figures in
 * force on a date, with a staged change's effect on the stored households
 * (CDHS cash lead's ideal screen).
 *
 * "What changed" reads each figure's and rule's own dates (versions `from`,
 * `effective`): the ledger source the app reads exposes no commit history
 * for a whole volume, so the dates the rules state are the record. */
import type { Engine } from "../engine/engine";
import type { HouseholdCase } from "../engine/cases";
import type { Item, ItemVersion } from "../engine/types";
import { paramInForce, versionInForce } from "../engine/versions";
import type { OpenQuestion } from "../ledger/markdown";
import { approvalStatus } from "./approvals";
import { programOutcomes } from "./CasesView";
import { personaPrograms, personaRoles, type Persona } from "./personas";
import { isOpen, questionInfos, type QuestionInfo } from "./questions";

/** How a program reads to a person, not its id ("ColoradoWorks"). */
export const PROGRAM_LABEL: Record<string, string> = {
  All: "Shared across programs",
  Medicaid: "Medicaid",
  "CHP+": "CHP+",
  SNAP: "SNAP (food assistance)",
  ColoradoWorks: "Colorado Works",
  AdultFinancial: "Adult Financial",
  CCCAP: "Child care assistance (CCCAP)",
  LEAP: "LEAP (heating assistance)",
  SunBucks: "SUN Bucks (summer food)",
};

export function programLabel(id: string): string {
  return PROGRAM_LABEL[id] ?? id;
}

/** The programs a persona works in that own outcomes, in declared order. */
export function rolePrograms(engine: Engine, persona: Persona): string[] {
  const ids = programOutcomes(engine).map((p) => p.id).filter((id) => id !== "All");
  return personaPrograms(persona, ids);
}

// ---- outcomes

/** Whether an outcome is about documents and verification rather than the
 *  decision itself: the cards put those in a fold of their own. */
export function isVerificationOutcome(it: Item): boolean {
  return (it.tags ?? []).includes("verification")
    || /verification|pending|due_date|postponement/.test(it.identifier);
}

export interface ProgramOutcomeSet { program: string; decisions: Item[]; verification: Item[] }

export function roleOutcomes(engine: Engine, persona: Persona): ProgramOutcomeSet[] {
  const programs = new Set(rolePrograms(engine, persona));
  return programOutcomes(engine).filter((p) => programs.has(p.id)).map((p) => {
    const items = p.outcomes.map((o) => engine.item(o)).filter((x): x is Item => !!x);
    return {
      program: p.id,
      decisions: items.filter((it) => !isVerificationOutcome(it)),
      verification: items.filter(isVerificationOutcome),
    };
  });
}

/** The first sentence of a meaning, for a card: up to the first full stop
 *  followed by a space, or the first 220 characters. */
export function firstSentence(text: string | undefined, max = 220): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const m = /^(.+?[.;])\s/.exec(t);
  let s = m ? m[1] : t;
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, "") + "…";
  return s.replace(/;$/, ".");
}

// ---- sign-off

const awaitingMemo = new WeakMap<Engine, Map<string, Item[]>>();

/** Every role's waiting items: those whose approval policy requires the
 *  role's signature and do not carry it. Memoised per engine. */
export function awaitingByRole(engine: Engine): Map<string, Item[]> {
  const hit = awaitingMemo.get(engine);
  if (hit) return hit;
  const out = new Map<string, Item[]>();
  for (const it of engine.items()) {
    for (const role of approvalStatus(engine, it).missing) {
      const list = out.get(role) ?? [];
      list.push(it);
      out.set(role, list);
    }
  }
  awaitingMemo.set(engine, out);
  return out;
}

export interface RoleSignOff { role: string; waiting: number }

/** For each role the persona signs as, how many items wait on it. */
export function signOffCounts(engine: Engine, persona: Persona): RoleSignOff[] {
  const by = awaitingByRole(engine);
  return personaRoles(persona, engine.meta).map((role) => ({ role, waiting: by.get(role)?.length ?? 0 }));
}

// ---- open questions

/** Tags whose items need a lawyer's signature under the approval policy. */
function legalTags(engine: Engine): Set<string> {
  const out = new Set<string>();
  for (const [tag, roles] of Object.entries(engine.meta.approval_policy?.by_tag ?? {})) {
    if (roles.includes("Legal")) out.add(tag);
  }
  return out;
}

/** Whether a persona owns a question: it touches one of the persona's
 *  programs; for Legal, it touches an item the policy sends to Legal (a
 *  `legal`, `immigration` or `state_election` tag) or an item that departs
 *  from a rule under a statute. */
export function ownsQuestion(engine: Engine, persona: Persona, q: QuestionInfo): boolean {
  if (persona.id === "legal") {
    const tags = legalTags(engine);
    return q.items.some((it) => it.statute_override || (it.tags ?? []).some((t) => tags.has(t)));
  }
  if (!persona.programs.length) return true;
  return q.programs.some((p) => persona.programs.includes(p));
}

export interface QuestionCounts {
  /** Open or partly resolved questions the persona owns. */
  open: QuestionInfo[];
  /** The same, by program (a question touching two programs counts in both). */
  byProgram: Array<{ program: string; count: number }>;
}

export function questionCounts(
  engine: Engine, persona: Persona, questions: readonly OpenQuestion[],
): QuestionCounts {
  const open = questionInfos(engine, questions).filter((q) => isOpen(q.status) && ownsQuestion(engine, persona, q));
  const programs = rolePrograms(engine, persona);
  const byProgram = programs.map((program) => ({
    program, count: open.filter((q) => q.programs.includes(program)).length,
  })).filter((x) => x.count > 0);
  return { open, byProgram };
}

// ---- departures

/** Items where a statute governs over the Colorado rule the item would
 *  otherwise follow (`statute_override`), in the persona's programs (all
 *  programs for Legal). */
export function departures(engine: Engine, persona: Persona): Item[] {
  const programs = new Set(rolePrograms(engine, persona));
  return engine.items()
    .filter((it) => it.statute_override && (persona.id === "legal" || !persona.programs.length
      || programs.has(it.program)))
    .sort((a, b) => a.program.localeCompare(b.program) || a.name.localeCompare(b.name));
}

// ---- what changed, and what comes next

export type ChangeKind = "new figure" | "figure ends" | "rule starts" | "rule ends";

export interface ChangeEvent {
  date: string;
  kind: ChangeKind;
  item: Item;
  /** For a figure: the version that starts (or ends) and the one before. */
  version?: ItemVersion;
  previous?: ItemVersion | null;
}

/** The items a persona's "what changed" covers: its programs' own items and
 *  the shared ones. */
function inPrograms(it: Item, programs: ReadonlySet<string>): boolean {
  return programs.has(it.program) || it.program === "All";
}

/** Every dated change to the persona's figures and rules with a date in
 *  `[from, to]` (inclusive), newest first: a parameter version that starts,
 *  a version that ends with no next one, a rule whose effective range
 *  starts or ends. */
export function changesBetween(
  engine: Engine, programs: readonly string[], from: string, to: string,
): ChangeEvent[] {
  const progs = new Set(programs);
  const out: ChangeEvent[] = [];
  for (const it of engine.items()) {
    if (!inPrograms(it, progs)) continue;
    const vs = [...(it.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from));
    vs.forEach((v, i) => {
      if (v.from >= from && v.from <= to) {
        out.push({ date: v.from, kind: "new figure", item: it, version: v, previous: i ? vs[i - 1] : null });
      }
      const next = vs[i + 1];
      if (v.to && v.to >= from && v.to <= to && (!next || next.from > v.to)) {
        out.push({ date: v.to, kind: "figure ends", item: it, version: v, previous: null });
      }
    });
    const e = it.effective;
    if (e?.from && e.from >= from && e.from <= to) out.push({ date: e.from, kind: "rule starts", item: it });
    // `to` is the rule's last day in force.
    if (e?.to && e.to !== "present" && e.to >= from && e.to <= to) {
      out.push({ date: e.to, kind: "rule ends", item: it });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.item.name.localeCompare(b.item.name));
}

/** The first of the month before `today`'s month: "this month and last". */
export function defaultSince(today: string): string {
  const [y, m] = today.split("-").map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return `${py}-${String(pm).padStart(2, "0")}-01`;
}

export function addYears(date: string, n: number): string {
  return `${Number(date.slice(0, 4)) + n}${date.slice(4)}`;
}

/** The stored households whose expectations read an item, directly or
 *  through the rules that use it. */
export function casesReading(
  engine: Engine, cases: readonly HouseholdCase[], identifier: string,
): HouseholdCase[] {
  const reach = new Set([identifier, ...engine.impact([identifier])]);
  return cases.filter((c) => Object.values(c.expect ?? {}).some((per) =>
    Object.keys(per).some((id) => reach.has(id))));
}

// ---- figures in force

export interface Figure {
  item: Item;
  /** The value in force on the date, null when none. */
  value: unknown;
  /** The version in force, for a versioned parameter. */
  version: ItemVersion | null;
  /** The next version after the date, if any. */
  next: ItemVersion | null;
}

/** The persona's programs' parameters (and the shared ones its outcomes
 *  read), as of a date, grouped by program in declared order. */
export function figuresInForce(
  engine: Engine, programs: readonly string[], asOf: string,
): Array<{ program: string; figures: Figure[] }> {
  const groups = new Map<string, Figure[]>();
  const shared = sharedFiguresRead(engine, programs);
  for (const it of engine.items()) {
    if (it.kind !== "parameter") continue;
    if (!programs.includes(it.program) && !shared.has(it.identifier)) continue;
    const vs = [...(it.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from));
    const figure: Figure = {
      item: it,
      value: paramInForce(it, asOf),
      version: versionInForce(it, asOf),
      next: vs.find((v) => v.from > asOf) ?? null,
    };
    const list = groups.get(it.program) ?? [];
    list.push(figure);
    groups.set(it.program, list);
  }
  const order = [...programs, "All"];
  return [...groups.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([program, figures]) => ({
      program, figures: figures.sort((a, b) => a.item.name.localeCompare(b.item.name)),
    }));
}

/** Shared (`All`) parameters the programs' outcomes read. */
function sharedFiguresRead(engine: Engine, programs: readonly string[]): Set<string> {
  const outcomes = programOutcomes(engine).filter((p) => programs.includes(p.id)).flatMap((p) => p.outcomes);
  const seen = new Set<string>();
  const out = new Set<string>();
  const stack = [...outcomes];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const it = engine.item(id);
    if (it?.kind === "parameter" && it.program === "All") out.add(id);
    for (const d of engine.usesOfItem(id)) stack.push(d);
  }
  return out;
}

// ---- a staged change's effect

export interface CaseChange {
  caseId: string;
  title: string;
  person: string;
  identifier: string;
  month: string | null;
  before: unknown;
  after: unknown;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** What a staged change does to the stored households: every stated
 *  expectation, among the cases that read the changed item, whose value
 *  differs between the ledger (`base`) and the ledger with the tray applied
 *  (`draft`). Compares stored cases before and after; nothing is typed in. */
export function stagedCaseChanges(
  base: Engine, draft: Engine, cases: readonly HouseholdCase[], identifier: string,
): CaseChange[] {
  const out: CaseChange[] = [];
  for (const hc of casesReading(draft, cases, identifier)) {
    const before = base.runCase(hc).results;
    const after = draft.runCase(hc).results;
    after.forEach((r, i) => {
      const b = before[i];
      if (!b || b.identifier !== r.identifier || b.person !== r.person || b.month !== r.month) return;
      if (!same(b.got, r.got)) {
        out.push({
          caseId: hc.id, title: hc.title, person: r.person, identifier: r.identifier,
          month: r.month, before: b.got, after: r.got,
        });
      }
    });
  }
  return out;
}
