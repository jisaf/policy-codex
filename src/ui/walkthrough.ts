/* The data behind the case walkthrough (views/WalkthroughView.tsx): a stored
 * test household's determination, read from the engine's own trace and laid
 * out as a reader steps through it. Nothing here takes intake or recomputes
 * with new facts: every value is what the codex records for a stored case,
 * and "what changes" compares the same stored case under the rules in force
 * and under the reader's staged drafts.
 *
 *   caseSummaries   the case list: a plain title, who is in it, the date, the programs
 *   outcomeChoices  a person's outcomes in one program
 *   buildWalk       the trace as numbered steps, outcome first, with the step that decided it
 *   budgetRows      a money outcome as a budget table, built from the same trace
 *   documentsOwed   the person's `*_verification_is_pending` outcomes as a checklist
 *   caseChanges     the case's outcomes before and after the staged drafts */
import type { Engine } from "../engine/engine";
import { caseToSpec, programsOfCase, type HouseholdCase } from "../engine/cases";
import { evaluate, makeCase, type CaseData } from "../engine/evaluate";
import { decidedBy, type TraceNode } from "../engine/explain";
import type { Item, ItemVersion } from "../engine/types";
import { valuesEqual } from "../engine/values";
import { versionInForce } from "../engine/versions";
import { describePerson } from "./people";
import { personLabel } from "./present";

// ---- programs

const PROGRAM_LABEL: Record<string, string> = {
  ColoradoWorks: "Colorado Works", AdultFinancial: "Adult Financial", SunBucks: "SUN Bucks",
  All: "All programs",
};

/** A program id as a reader names it: "ColoradoWorks" -> "Colorado Works". */
export function programLabel(id: string): string {
  return PROGRAM_LABEL[id] ?? id;
}

/** The programs the volume declares, with their outcomes, "All" left out. */
export function declaredOutcomePrograms(engine: Engine): Array<{ id: string; prefix: string | null; outcomes: string[] }> {
  return (engine.meta.programs ?? [])
    .filter((p) => p.id !== "All")
    .map((p) => ({ id: p.id, prefix: p.prefix, outcomes: p.outcomes ?? [] }));
}

/** The program's "this person's participation" outcome, for the programs
 *  that decide a household (SNAP, Colorado Works, CCCAP, LEAP): the one
 *  outcome that says what a household result means for one member. Null for
 *  programs that decide each person on their own (Medicaid, CHP+). */
export function participationOutcome(engine: Engine, program: string): string | null {
  const p = declaredOutcomePrograms(engine).find((x) => x.id === program);
  return p?.outcomes.find((o) => /_person_participation_status$/.test(o) && engine.item(o)) ?? null;
}

/** Whether an outcome is the household's (or unit's) result, reported on
 *  every member, rather than this person's own: any outcome of a program
 *  with a participation outcome that is not itself about the person. */
export function isHouseholdOutcome(engine: Engine, identifier: string): boolean {
  const it = engine.item(identifier);
  if (!it) return false;
  if (it.scope === "case" || it.scope === "month") return true;
  const part = participationOutcome(engine, it.program);
  if (!part || identifier === part) return false;
  return !/_person_|_is_pending$|_due_date$|_end_date$|_member_is_/.test(identifier);
}

// ---- the case list

/** Authoring-round prefixes a case title carries ("CDHS review B-2: ",
 *  "Phase-10 facts round: "): history, not a description of the household. */
const ROUND = /^((?:Phase[- ]?\d+[^:]*)|(?:[A-Z]{2,5} review [A-Z]-\d+)|(?:Engineering follow-up[^:]*)|(?:Audit fix round[^:]*)):\s+/;

export interface CaseSummary {
  id: string;
  /** The title without its authoring-round prefix, first letter capitalised. */
  title: string;
  /** The authoring round the title named, shown small, or null. */
  round: string | null;
  asOf: string;
  people: number;
  programs: string[];
  /** The case author's comments in tests/cases.yaml, one paragraph each. */
  notes: string[];
}

export function plainCaseTitle(title: string): { title: string; round: string | null } {
  const m = ROUND.exec(title);
  const rest = m ? title.slice(m[0].length) : title;
  return { title: rest ? rest[0].toUpperCase() + rest.slice(1) : rest, round: m ? m[1] : null };
}

/** The comments the case author wrote under each case in tests/cases.yaml
 *  (`# ...` lines between one `- id:` and the next), as paragraphs: a run of
 *  comment lines is one paragraph. The parsed YAML drops them, so they are
 *  read from the file's text. */
export function caseNotes(casesText: string | null): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!casesText) return out;
  let id: string | null = null;
  let para: string[] = [];
  const flush = () => {
    if (id && para.length) out.get(id)!.push(para.join(" "));
    para = [];
  };
  for (const line of casesText.split("\n")) {
    const head = /^- id:\s*"?([^"\s]+)"?/.exec(line);
    if (head) {
      flush();
      id = head[1];
      out.set(id, []);
      continue;
    }
    const c = /^\s+#\s?(.*)$/.exec(line);
    if (c && id) {
      if (c[1].trim()) para.push(c[1].trim());
      else flush();
    } else flush();
  }
  flush();
  return out;
}

export function caseSummaries(engine: Engine, cases: readonly HouseholdCase[], casesText: string | null): CaseSummary[] {
  const notes = caseNotes(casesText);
  return cases.map((c) => {
    const t = plainCaseTitle(c.title);
    return {
      id: c.id, title: t.title, round: t.round, asOf: c.as_of,
      people: Object.keys(c.persons ?? {}).length,
      programs: programsOfCase(engine.index, c).filter((p) => p !== "All"),
      notes: notes.get(c.id) ?? [],
    };
  });
}

// ---- people

/** A person's age in whole years on a date, from `date_of_birth`, or null. */
export function ageOn(dob: unknown, date: string): number | null {
  if (typeof dob !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const [ty, tm, td] = date.slice(0, 10).split("-").map(Number);
  let age = ty - y;
  if (tm < m || (tm === m && (td || 1) < d)) age--;
  return age;
}

/** "Person 3 — grandchild of Person 1, age 16", or "Person 2, age 81"
 *  when the case states no relationship for the person. The age is on the
 *  case's determination date. */
export function personTitle(hc: HouseholdCase, pid: string): string {
  const age = ageOn(hc.persons[pid]?.facts?.date_of_birth, hc.as_of);
  return describePerson(hc, pid, age);
}

// ---- what the case is about

/** Words a case title uses for a program. */
const PROGRAM_WORDS: Array<[string, RegExp]> = [
  ["ColoradoWorks", /\bColorado Works\b|\bTANF\b/i],
  ["SNAP", /\bSNAP\b|\bABAWD\b|food assistance/i],
  ["CHP+", /\bCHP\+/i],
  ["CCCAP", /\bCCCAP\b|child care/i],
  ["LEAP", /\bLEAP\b|heating assistance/i],
  ["SunBucks", /SUN Bucks|Summer EBT/i],
  ["AdultFinancial", /\bOAP\b|Old Age Pension|\bAND-(?:CS|SO)\b|Adult Financial|Home Care Allowance|burial/i],
  ["Medicaid", /Medicaid|\bMAGI\b|nursing (?:facility|care)|long-term care|\bQMB\b|MMMNA|continuous eligibility|family planning|presumptive/i],
];

/** The person and program a stored case is about, read from its title (the
 *  "17-year-old", "the 58-year-old", the program it names) and its
 *  expectations: the walkthrough opens there, not on the first person and
 *  the alphabetically first program (HCPF analyst task 2, CDHS cash lead
 *  task 2). */
export function caseFocus(engine: Engine, hc: HouseholdCase, title: string = hc.title): { person: string | null; program: string | null } {
  const persons = Object.keys(hc.persons ?? {});
  const progs = programsOfCase(engine.index, hc).filter((p) => p !== "All");
  const expected = (pid: string, program: string | null) => Object.keys(hc.expect?.[pid] ?? {})
    .filter((id) => !program || engine.item(id)?.program === program).length;
  // The program the title names first; else the one the case expects most of.
  let program: string | null = null;
  let at = Infinity;
  for (const [p, re] of PROGRAM_WORDS) {
    const m = re.exec(title);
    if (m && progs.includes(p) && m.index < at) { at = m.index; program = p; }
  }
  if (!program) {
    const count = (p: string) => persons.reduce((n, pid) => n + expected(pid, p), 0);
    program = [...progs].sort((a, b) => count(b) - count(a))[0] ?? null;
  }
  // The person whose age the title states (within a year: a title written for
  // a later month), else the one the case expects most of in that program.
  let person: string | null = null;
  const ageWord = /\b(\d{1,3})-year-old\b/i.exec(title);
  if (ageWord) {
    const want = Number(ageWord[1]);
    const ages = persons.map((pid) => ({ pid, age: ageOn(hc.persons[pid]?.facts?.date_of_birth, hc.as_of) }))
      .filter((x) => x.age !== null && Math.abs(x.age - want) <= 1)
      .sort((a, b) => Math.abs(a.age! - want) - Math.abs(b.age! - want));
    person = ages[0]?.pid ?? null;
  }
  if (!person) {
    person = [...persons].sort((a, b) => expected(b, program) - expected(a, program))[0] ?? null;
  }
  return { person, program };
}

// ---- outcomes

export interface OutcomeChoice {
  identifier: string;
  item: Item;
  /** The case states an expected value for this person. */
  expected: boolean;
  /** The months it can be read in: those the case expects, else the case's
   *  own month; [null] for an outcome with no month. */
  months: Array<string | null>;
  group: "person" | "result" | "documents" | "recorded";
}

function monthsOf(it: Item, hc: HouseholdCase, pid: string): Array<string | null> {
  if (it.scope !== "person-month" && it.scope !== "month") return [null];
  const exp = hc.expect?.[pid]?.[it.identifier];
  if (exp && typeof exp === "object" && !Array.isArray(exp)) {
    const ms = Object.keys(exp).sort();
    if (ms.length) return ms;
  }
  return [hc.as_of.slice(0, 7)];
}

/** A person's outcomes in one program: this person's participation first,
 *  then the program's declared outcomes, then anything else the case records
 *  for the person in that program. Verification flags are grouped apart. */
export function outcomeChoices(engine: Engine, hc: HouseholdCase, pid: string, program: string): OutcomeChoice[] {
  const p = declaredOutcomePrograms(engine).find((x) => x.id === program);
  const expected = Object.keys(hc.expect?.[pid] ?? {});
  const ids: string[] = [];
  const add = (id: string) => { if (!ids.includes(id)) ids.push(id); };
  const part = participationOutcome(engine, program);
  if (part) add(part);
  for (const o of p?.outcomes ?? []) add(o);
  for (const id of expected) if (engine.item(id)?.program === program) add(id);
  const out: OutcomeChoice[] = [];
  for (const id of ids) {
    const it = engine.item(id);
    if (!it || it.kind !== "derived") continue;
    const declared = (p?.outcomes ?? []).includes(id) || id === part;
    const group: OutcomeChoice["group"] = id === part ? "person"
      : /_is_pending$|_verification_count$|_due_date$|_verification_status$|_end_date$/.test(id) ? "documents"
        : declared ? "result" : "recorded";
    out.push({ identifier: id, item: it, expected: expected.includes(id), months: monthsOf(it, hc, pid), group });
  }
  return out;
}

/** The program to open first for a person: the case's own focus program
 *  when the case records something for them in it; else the program the case
 *  records most for them in. */
export function defaultProgram(engine: Engine, hc: HouseholdCase, pid: string, focus: string | null = null): string | null {
  const progs = programsOfCase(engine.index, hc).filter((p) => p !== "All");
  const mine = Object.keys(hc.expect?.[pid] ?? {}).map((id) => engine.item(id)?.program);
  if (focus && mine.includes(focus)) return focus;
  const count = (p: string) => mine.filter((x) => x === p).length;
  return [...progs].filter((p) => mine.includes(p)).sort((a, b) => count(b) - count(a))[0] ?? progs[0] ?? null;
}

/** The outcome to open first: this person's participation, else the first
 *  result the case records for them, else the first result. */
export function defaultOutcome(choices: readonly OutcomeChoice[]): OutcomeChoice | null {
  return choices.find((c) => c.group === "person")
    ?? choices.find((c) => c.group === "result" && c.expected)
    ?? choices.find((c) => c.group === "result")
    ?? choices[0] ?? null;
}

// ---- evaluating a stored case

const caseDataCache = new WeakMap<Engine, Map<string, CaseData>>();

function caseData(engine: Engine, hc: HouseholdCase): CaseData {
  let m = caseDataCache.get(engine);
  if (!m) { m = new Map(); caseDataCache.set(engine, m); }
  let c = m.get(hc.id);
  if (!c) { c = makeCase(engine.index, caseToSpec(hc)); m.set(hc.id, c); }
  return c;
}

/** The value the codex records for one outcome of a stored case, or null
 *  for unknown (or an outcome that cannot be read for this person). */
export function recordedValue(engine: Engine, hc: HouseholdCase, identifier: string, pid: string | null, month: string | null): unknown {
  try {
    return evaluate(engine.index, caseData(engine, hc), identifier, pid, month);
  } catch {
    return null;
  }
}

// ---- the walk

export interface StepInput {
  node: TraceNode;
  /** The step that works this input out, for a rule; null for a fact or figure. */
  step: number | null;
  /** The input took part in deciding this step's value. */
  mattered: boolean;
}

export interface WalkStep {
  /** 1-based, in the order the walk reads: the outcome first, then each
   *  rule it asked for, in the order it asked. */
  n: number;
  node: TraceNode;
  depth: number;
  /** The step whose rule asked for this one; null for the outcome. */
  parent: number | null;
  /** This rule's value took part in deciding the outcome. Steps that did not
   *  are folded away by default. */
  mattered: boolean;
  /** The step that decided the result ("This is why"). */
  why: boolean;
  /** The step's value is unknown and none of the rules it asked for is the
   *  reason: the unknown starts here, at a missing fact or figure. */
  stopped: boolean;
  inputs: StepInput[];
  /** Facts this step asked for that the case does not give, when the step's
   *  value is unknown. */
  missing: TraceNode[];
  /** Figures with no version in force on the case date, when the step's
   *  value is unknown. */
  noFigure: TraceNode[];
}

export interface Walk {
  root: TraceNode;
  steps: WalkStep[];
  why: WalkStep | null;
  /** Every fact the outcome's unknown rests on (decided inputs only), once. */
  missing: TraceNode[];
  /** Every figure with no version in force that the outcome's unknown rests on. */
  noFigure: TraceNode[];
  /** Every excerpt the steps cite, in the order the steps cite them. */
  sources: string[];
}

const nodeKey = (n: TraceNode) => `${n.identifier}|${n.person ?? ""}|${n.month ?? ""}`;
const isNumeric = (v: unknown) => typeof v === "number";
const isRule = (n: TraceNode) => n.kind === "derived";

/** The trace of one outcome as numbered steps. A rule the trace evaluated
 *  twice is one step: the second time it is read from memory, and the input
 *  links to the step that worked it out. */
export function buildWalk(root: TraceNode): Walk {
  // Every evaluated node by key, so a memo hit resolves to the evaluation.
  const evaluated = new Map<string, TraceNode>();
  const index = (n: TraceNode) => {
    if (n.origin !== "memo" && !evaluated.has(nodeKey(n))) evaluated.set(nodeKey(n), n);
    n.children.forEach(index);
  };
  index(root);
  const resolve = (n: TraceNode) => (n.origin === "memo" ? evaluated.get(nodeKey(n)) ?? n : n);

  // What decided the outcome: decisive inputs, followed through memo hits.
  const decided = new Set<TraceNode>();
  const mark = (n: TraceNode) => {
    const r = resolve(n);
    if (decided.has(r)) return;
    decided.add(r);
    decidedBy(r).forEach(mark);
  };
  mark(root);

  // Steps, pre-order: the outcome, then each rule in the order it was asked for.
  const steps: WalkStep[] = [];
  const stepOf = new Map<string, number>();
  const visit = (n: TraceNode, depth: number, parent: number | null) => {
    if (!isRule(n) || n.origin === "memo" || stepOf.has(nodeKey(n))) return;
    const s: WalkStep = {
      n: steps.length + 1, node: n, depth, parent, mattered: decided.has(n), why: false,
      stopped: false, inputs: [], missing: [], noFigure: [],
    };
    steps.push(s);
    stepOf.set(nodeKey(n), s.n);
    for (const k of n.children) visit(k, depth + 1, s.n);
  };
  visit(root, 0, null);

  const sources: string[] = [];
  for (const s of steps) {
    const seen = new Set<string>();
    for (const k of s.node.children) {
      const r = resolve(k);
      const key = nodeKey(r);
      if (seen.has(key)) continue;
      seen.add(key);
      s.inputs.push({ node: r, step: isRule(r) ? stepOf.get(key) ?? null : null, mattered: decided.has(r) && s.mattered });
    }
    if (s.node.value === null) {
      s.missing = s.inputs.filter((i) => i.node.kind === "supplied" && i.node.origin === "missing").map((i) => i.node);
      s.noFigure = s.inputs.filter((i) => i.node.origin === "no-version" || i.node.origin === "not-in-force")
        .filter((i) => !isRule(i.node)).map((i) => i.node);
      const unknownRule = s.inputs.some((i) => isRule(i.node) && i.node.value === null);
      s.stopped = !unknownRule && (s.missing.length > 0 || s.noFigure.length > 0 || s.node.origin !== "evaluated" || s.node.error !== undefined || (s.node.warnings?.length ?? 0) > 0);
    }
    for (const src of s.node.sources) if (!sources.includes(src)) sources.push(src);
  }

  // The step that decided the result.
  let why: WalkStep | null = null;
  const byNode = (n: TraceNode) => steps.find((s) => s.node === n) ?? null;
  if (root.value === null) {
    // Follow the unknown down to where it starts.
    let n: TraceNode = root;
    for (;;) {
      const next = n.children.map(resolve).find((k) => isRule(k) && k.value === null && (k.decisive || decided.has(k)))
        ?? n.children.map(resolve).find((k) => isRule(k) && k.value === null);
      if (!next || next === n) break;
      n = next;
    }
    why = byNode(n);
  } else {
    // Follow the input each choice rested on, while the value is a choice
    // (yes/no, a status) rather than a sum.
    let n: TraceNode = root;
    while (!isNumeric(n.value)) {
      const k = n.children.find((c) => c.decisive && isRule(c));
      if (!k) break;
      n = resolve(k);
    }
    why = byNode(n);
  }
  if (why) why.why = true;

  // What the unknown rests on: the facts and figures missing under the
  // unknown steps. A fact missing under a step that still has a value was
  // read through a default and did not matter.
  const missing: TraceNode[] = [];
  const noFigure: TraceNode[] = [];
  if (root.value === null) {
    const seen = new Set<string>();
    for (const s of steps) {
      if (s.node.value !== null || !s.mattered) continue;
      for (const n of s.missing) if (!seen.has(n.identifier)) { seen.add(n.identifier); missing.push(n); }
      for (const n of s.noFigure) if (!seen.has(n.identifier)) { seen.add(n.identifier); noFigure.push(n); }
    }
  }
  return { root, steps, why, missing, noFigure, sources };
}

/** Each statute-over-rule note the result rests on, once, with the steps
 *  that carry it and how the result reaches it (the rules from the outcome
 *  down to the departing item). Only a departure the result's reasoning
 *  passes through counts: a step or figure that took part in deciding it,
 *  not one the codex merely looked at (Legal task 4: a SNAP departure on a
 *  Medicaid result needs its reason). */
export function overrideNotes(walk: Walk): Array<{ text: string; steps: number[]; item: string; via: string[] }> {
  const out: Array<{ text: string; steps: number[]; item: string; via: string[] }> = [];
  const chain = (s: WalkStep): string[] => {
    const names: string[] = [];
    let p: WalkStep | null = s;
    while (p) { names.unshift(p.node.name); p = p.parent !== null ? walk.steps[p.parent - 1] : null; }
    return names;
  };
  const add = (t: string, n: number, item: string, via: string[]) => {
    const have = out.find((o) => o.text === t);
    if (have) { if (!have.steps.includes(n)) have.steps.push(n); } else out.push({ text: t, steps: [n], item, via });
  };
  for (const s of walk.steps) {
    if (!(s.mattered || s.why || s.n === 1)) continue;
    if (s.node.override) add(s.node.override, s.n, s.node.identifier, chain(s));
    for (const i of s.inputs) {
      if (!i.node.override || !i.mattered || i.step !== null) continue;
      add(i.node.override, s.n, i.node.identifier, [...chain(s), i.node.name]);
    }
  }
  return out;
}

/** The excerpts the walk cites that are not verified quotations, each with
 *  the steps citing it. */
export function unverifiedNotes(walk: Walk, unverified: ReadonlySet<string>): Array<{ source: string; steps: number[] }> {
  const out: Array<{ source: string; steps: number[] }> = [];
  for (const s of walk.steps) {
    for (const src of s.node.sources) {
      if (!unverified.has(src)) continue;
      const have = out.find((o) => o.source === src);
      if (have) have.steps.push(s.n); else out.push({ source: src, steps: [s.n] });
    }
  }
  return out;
}

/** How deep the walk opens before a step's own inputs fold under it. */
export const OPEN_DEPTH = 2;

/** The steps from the outcome down to the deciding step: always shown. */
export function whyPath(walk: Walk): Set<number> {
  const out = new Set<number>();
  let s: WalkStep | null = walk.why;
  while (s) {
    out.add(s.n);
    s = s.parent !== null ? walk.steps[s.parent - 1] : null;
  }
  return out;
}

/** Whether a step changed the answer, as the folded walk counts it. */
function counts(s: WalkStep): boolean {
  return s.mattered || s.why || s.n === 1;
}

/** The steps a reader sees. Folded (the default): only steps that changed
 *  the answer, the outcome and the deciding step; and below depth
 *  `OPEN_DEPTH`, only under steps the reader opened (`open`) or on the way
 *  to the deciding step. `showAll` shows every step the codex took. */
export function visibleSteps(walk: Walk, showAll: boolean, open: ReadonlySet<number> = new Set()): WalkStep[] {
  if (showAll) return walk.steps;
  const path = whyPath(walk);
  const shown = new Set<number>();
  for (const s of walk.steps) {
    if (!counts(s) && !path.has(s.n)) continue;
    if (s.parent !== null && !shown.has(s.parent)) continue;
    if (s.parent === null || s.depth <= OPEN_DEPTH || open.has(s.parent) || path.has(s.n)) shown.add(s.n);
  }
  return walk.steps.filter((s) => shown.has(s.n));
}

/** For each shown step, how many steps that changed the answer sit behind
 *  it, folded away. */
export function foldedBehind(walk: Walk, visible: readonly WalkStep[]): Map<number, number> {
  const shown = new Set(visible.map((s) => s.n));
  const out = new Map<number, number>();
  for (const s of walk.steps) {
    if (shown.has(s.n) || !counts(s)) continue;
    let p = s.parent;
    while (p !== null && !shown.has(p)) p = walk.steps[p - 1].parent;
    if (p !== null) out.set(p, (out.get(p) ?? 0) + 1);
  }
  return out;
}

/** How many steps did not change the answer: only "show all" shows them. */
export function unchangedCount(walk: Walk): number {
  return walk.steps.filter((s) => !counts(s)).length;
}

// ---- the budget

export type BudgetRole = "income" | "expense" | "deduction" | "net" | "standard" | "result" | "amount" | "subtotal" | "addition";

export const BUDGET_ROLE_LABEL: Record<BudgetRole, string> = {
  income: "Income", expense: "Expense", deduction: "Deduction", net: "Net", standard: "Standard",
  result: "Result", amount: "Amount", subtotal: "Subtotal", addition: "Added",
};

export interface BudgetRow {
  node: TraceNode;
  role: BudgetRole;
  /** The step that works this line out, when it is a rule. */
  step: number | null;
  /** A line the budget adds that no item names: what a rule took off an
   *  amount on the way to the next line (an earned income disregard, a
   *  stepparent's needs), with the amount and the figures it used. */
  taken?: { amount: number; from: TraceNode; figures: TraceNode[] };
}

/** What a line of a budget is, read from its name: a deduction, a net
 *  figure, a standard or limit, income, an expense, or another amount. The
 *  name's head decides: "adjusted income before the shelter deduction" is a
 *  net figure, "standard deduction" a deduction, "MMMNA cap" a standard. */
export function budgetRole(name: string): BudgetRole {
  const full = name.replace(/^[^:]+:\s*/, "").toLowerCase();
  // "grant before any sanction", "total countable income": a running total.
  if (/\bbefore (?:any|the)\b|\bsubtotal\b/.test(full)) return "subtotal";
  if (/\ballowance\b/.test(full) && /\bpregnan|\bneeds?\b/.test(full)) return "addition";
  const head = name.replace(/^[^:]+:\s*/, "").replace(/\s*\([^)]*\)/g, "").toLowerCase()
    .split(/\s+(?:for|before|after|of an?|of the|by|under|from|in|to)\s+|,/)[0].trim();
  const last = head.split(/\s+/).pop() ?? "";
  if (/^(deduction|disregard|allowance|reduction|exclusion|offset)s?$/.test(last)) return "deduction";
  if (/^(limit|threshold|standard|cap|guideline|maximum)s?$/.test(last) || /\b(maximum|minimum)\b/.test(head)) return "standard";
  if (/\bnet\b|\badjusted\b|\bcountable\b/.test(head)) return "net";
  if (/\b(cost|costs|expense|expenses|rent|utilit\w*|premiums? paid)\b/.test(head)) return "expense";
  if (/\b(income|wages|earnings|receipts|support|pension|benefit|grant|payment)\b/.test(head)) return "income";
  return "amount";
}

/** A money outcome's computation as budget lines, in the order the codex
 *  worked them out: each dollar figure the result rests on, from the incomes
 *  up through each deduction to the result. Zero lines are left out except
 *  where the result's own rule reads them; a fact the case gives as zero
 *  adds nothing to a budget. */
export interface BudgetOptions {
  /** Whether a figure changed the amount it went into: false leaves the line
   *  out (a pregnancy allowance multiplied by nobody pregnant, a medical
   *  threshold with no medical costs). `budgetEffect` answers it by
   *  re-evaluating the parent with the figure moved. */
  effect?: (figure: TraceNode, parent: TraceNode) => boolean;
}

/** A money outcome's computation as budget lines, in the order the codex
 *  worked them out: each dollar figure the result rests on, from the incomes
 *  up through each deduction to the result. Left out: a zero fact (it adds
 *  nothing), a figure that changed nothing (`opts.effect`). Added: what a
 *  rule took off an income on the way to the next line when no deduction
 *  line says it (the Colorado Works $90 and 67% disregard, a stepparent's
 *  needs), so every applied disregard and deduction has a line. */
export function budgetRows(engine: Engine, walk: Walk, opts: BudgetOptions = {}): BudgetRow[] {
  const root = walk.root;
  const it = engine.item(root.identifier);
  if (it?.type !== "money") return [];
  const stepOf = new Map(walk.steps.map((s) => [s.node, s.n] as const));
  const mattered = new Set<TraceNode>(walk.steps.filter((s) => s.mattered).map((s) => s.node));
  const direct = new Set(walk.steps[0]?.inputs.map((i) => i.node) ?? []);
  const unknownResult = root.value === null;
  const rows: BudgetRow[] = [];
  const seen = new Set<string>();
  const isMoney = (n: TraceNode) => engine.item(n.identifier)?.type === "money";
  // Post-order: an amount is listed after everything it is computed from.
  const visit = (n: TraceNode, parentMattered: boolean, parent: TraceNode | null) => {
    if (n.origin === "memo") return;
    const step = stepOf.get(n) ?? null;
    // A nonzero amount a computed amount is built from takes part in it, even
    // where the trace marks only one operand of a sum as deciding (CO-83's
    // deemed stepparent income is most of the countable income).
    const adds = parentMattered && parent !== null && isMoney(parent) && isMoney(n)
      && typeof n.value === "number" && n.value !== 0;
    const on = n === root || (step !== null ? mattered.has(n) || adds : parentMattered);
    for (const k of n.children) visit(k, on, n);
    if (!on) return;
    if (!isMoney(n)) return;
    const key = nodeKey(n);
    if (seen.has(key)) return;
    const v = n.value;
    const role: BudgetRole = n === root ? "result" : budgetRole(n.name);
    if (n !== root) {
      // An unknown line belongs only as a rule on the way to an unknown
      // result; an unknown fact read through a default did not matter.
      if (v === null && (!unknownResult || step === null)) return;
      // A zero fact adds nothing; a zero countable or net line the codex
      // worked out is kept (CO-85's payment-countable $0 explains the grant).
      if (v === 0 && !direct.has(n) && !(step !== null && role === "net" && n.person === null)) return;
      if (step === null && n.kind === "parameter" && parent && opts.effect && !opts.effect(n, parent)) return;
    }
    // What the rule took off its largest income on the way to this line, when
    // no deduction line of its own says it.
    if (step !== null && n !== root && typeof v === "number" && ["net", "income", "subtotal", "amount"].includes(role)) {
      const s = walk.steps[step - 1];
      const ins = s.inputs.filter((i) => isMoney(i.node) && typeof i.node.value === "number");
      const deductions = ins.filter((i) => ["deduction", "expense"].includes(budgetRole(i.node.name)));
      const deducted = deductions.reduce((a, i) => a + (i.node.value as number), 0);
      const incomes = ins.filter((i) => (i.node.value as number) > 0 && ["income", "net", "subtotal"].includes(budgetRole(i.node.name)));
      const top = incomes.sort((a, b) => (b.node.value as number) - (a.node.value as number))[0];
      // What the rule took off beyond the deduction lines it reads: the
      // whole gap when it reads none (a percentage disregard), the rest when
      // it reads some (CO-83: $1,500 less the $90 is not $1,157; the
      // stepparent's $253 needs are the rest).
      const rest = top && incomes.length === 1 ? (top.node.value as number) - v - deducted : 0;
      if (top && rest > 0.005 && v >= 0) {
        const figures = s.inputs
          .filter((i) => i.node.kind === "parameter" && i.node.value !== null && !deductions.includes(i))
          .map((i) => i.node);
        rows.push({ node: n, role: "deduction", step, taken: { amount: rest, from: top.node, figures } });
      }
    }
    seen.add(key);
    rows.push({ node: n, role, step });
  };
  visit(root, true, null);
  return rows;
}

/** Whether a figure changed the amount it went into: the parent worked out
 *  again with the figure doubled (plus one) gives a different amount. A
 *  figure under a test (a limit compared with income) always counts: it
 *  decided the test even where moving it would not flip the answer. */
export function budgetEffect(engine: Engine, hc: HouseholdCase): (figure: TraceNode, parent: TraceNode) => boolean {
  const spec = caseToSpec(hc);
  return (figure, parent) => {
    if (typeof figure.value !== "number" || typeof parent.value !== "number") return true;
    try {
      const moved = makeCase(engine.index, { ...spec, parameters: { ...(spec.parameters ?? {}), [figure.identifier]: figure.value * 2 + 1 } });
      const again = evaluate(engine.index, moved, parent.identifier, parent.person, parent.month);
      return !same(again, parent.value);
    } catch {
      return true;
    }
  };
}

/** Money as the rule keeps it: whole dollars without cents, cents where the
 *  amount has them (a 25% sanction of $517 is $129.25). */
export function budgetMoney(v: unknown, fallback: (v: unknown) => string): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback(v);
  if (Math.abs(v - Math.round(v)) < 1e-9) {
    const s = `$${Math.abs(Math.round(v)).toLocaleString("en-US")}`;
    return v < 0 ? `-${s}` : s;
  }
  return fallback(v);
}

// ---- which version of a figure

/** The determination date a stored case is read on. */
export function determinationDate(hc: HouseholdCase): string {
  const d = caseToSpec(hc).given?.determination_date;
  return typeof d === "string" ? d : hc.as_of;
}

/** The dated period of a figure the case read, or null for a figure without
 *  periods. */
export function versionUsed(engine: Engine, node: Pick<TraceNode, "identifier" | "kind">, date: string): ItemVersion | null {
  if (node.kind !== "parameter") return null;
  const it = engine.item(node.identifier);
  if (!it?.versions?.length) return null;
  return versionInForce(it, date);
}

/** The excerpts a line cites: for a figure set by dated periods, the period
 *  in force on the case's date (its own source first), not the item's first
 *  source (county supervisor task 2: FY 2027 figures cited to the FY 2026
 *  tables). */
export function lineSources(engine: Engine, node: TraceNode, date: string): string[] {
  const v = versionUsed(engine, node, date);
  if (v?.source) return [v.source];
  return node.sources;
}

/** The budget as tab-separated text, for pasting into a spreadsheet or a
 *  training handout. `money` formats an amount. */
export function budgetText(
  rows: readonly BudgetRow[], money: (n: TraceNode) => string, citation: (s: string) => string,
): string {
  const lines = ["Line\tWhat it is\tAmount\tRule text"];
  for (const r of rows) {
    const who = r.node.person ? `${personLabel(r.node.person)}: ` : "";
    if (r.taken) {
      lines.push([
        `${who}${takenLabel(r)}`, BUDGET_ROLE_LABEL.deduction, `-${money({ ...r.node, value: r.taken.amount })}`, "",
      ].join("\t"));
      continue;
    }
    lines.push([
      who + r.node.name, BUDGET_ROLE_LABEL[r.role], money(r.node),
      r.node.sources.map(citation).join("; "),
    ].join("\t"));
  }
  return lines.join("\n");
}

/** "Taken off gross earned income (disregard $90, 67%)". */
export function takenLabel(r: BudgetRow): string {
  if (!r.taken) return r.node.name;
  return `Taken off ${r.taken.from.name.replace(/^[^:]+:\s*/, "")} on the way to ${r.node.name.replace(/^[^:]+:\s*/, "")}`;
}

// ---- documents owed

/** Which due date governs a pending element, by program: the status
 *  documents (citizenship, identity, immigration status, SSN, lawful
 *  presence) often have their own period; expenses in SNAP have theirs. The
 *  first matching rule wins; `due` is a due-date identifier. */
const DUE_RULES: Array<{ program: string; element?: RegExp; due: string }> = [
  { program: "SNAP", element: /immigration_status|sponsor/, due: "snap_noncitizen_documentation_due_date" },
  { program: "SNAP", element: /shelter_costs|medical_expenses|dependent_care|child_support_paid/, due: "snap_expense_verification_due_date" },
  { program: "SNAP", due: "snap_verification_due_date" },
  { program: "Medicaid", element: /citizenship|identity|immigration_status/, due: "ma_reasonable_opportunity_period_end_date" },
  { program: "Medicaid", due: "ma_verification_due_date" },
  { program: "CHP+", due: "chp_verification_due_date" },
  { program: "ColoradoWorks", element: /citizenship|identity|immigration_status|lawful_presence|ssn/, due: "cw_status_verification_due_date" },
  { program: "ColoradoWorks", due: "cw_verification_due_date" },
  { program: "AdultFinancial", element: /and_so_disability/, due: "af_and_so_disability_certification_due_date" },
  { program: "AdultFinancial", due: "af_verification_due_date" },
  { program: "CCCAP", due: "cccap_verification_due_date" },
  { program: "LEAP", due: "leap_verification_due_date" },
];

/** The due-date identifier that governs one pending element, or null when the
 *  codex states none for its program. */
export function dueDateFor(program: string, pendingIdentifier: string): string | null {
  const element = pendingIdentifier.replace(/^[a-z]+_/, "").replace(/_verification_is_pending$/, "");
  return DUE_RULES.find((r) => r.program === program && (!r.element || r.element.test(element)))?.due ?? null;
}

/** "SNAP: immigration status verification is pending" -> "Immigration status". */
export function documentName(item: Pick<Item, "name">): string {
  const s = item.name.replace(/^[^:]+:\s*/, "").replace(/\s*verification is pending$/i, "").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : item.name;
}

export interface DocumentOwed {
  person: string;
  program: string;
  /** The `*_verification_is_pending` identifier. */
  identifier: string;
  document: string;
  dueIdentifier: string | null;
  due: string | null;
  /** The program does not apply to this person (its verification status is
   *  "not applicable", or the person is in no household for it): the flag is
   *  raised, but nothing is owed for it. */
  applies: boolean;
}

/** Everything the case's people still owe: each `*_verification_is_pending`
 *  outcome the codex records as yes, with the document, the person, the
 *  program and the date that governs it. Rows whose program does not apply to
 *  the person are kept, marked, so a reader sees why they are not owed. */
export function documentsOwed(engine: Engine, hc: HouseholdCase, persons?: readonly string[]): DocumentOwed[] {
  const out: DocumentOwed[] = [];
  const month = hc.as_of.slice(0, 7);
  const monthFor = (id: string) => {
    const s = engine.item(id)?.scope;
    return s === "person-month" || s === "month" ? month : null;
  };
  for (const pid of persons ?? Object.keys(hc.persons ?? {})) {
    for (const p of declaredOutcomePrograms(engine)) {
      const pending = p.outcomes.filter((o) => /_verification_is_pending$/.test(o) && engine.item(o));
      if (!pending.length) continue;
      let applies = true;
      const status = p.prefix ? `${p.prefix}verification_status` : null;
      if (status && engine.item(status)) {
        const v = recordedValue(engine, hc, status, pid, monthFor(status));
        if (v === "not_applicable") applies = false;
      }
      const part = participationOutcome(engine, p.id);
      if (part) {
        const v = recordedValue(engine, hc, part, pid, monthFor(part));
        if (typeof v === "string" && /^not_in_/.test(v)) applies = false;
      }
      let any = false;
      for (const id of pending) {
        if (recordedValue(engine, hc, id, pid, monthFor(id)) !== true) continue;
        any = true;
        const dueId = dueDateFor(p.id, id);
        const due = dueId && engine.item(dueId) ? recordedValue(engine, hc, dueId, pid, monthFor(dueId)) : null;
        out.push({
          person: pid, program: p.id, identifier: id, document: documentName(engine.item(id)!),
          dueIdentifier: dueId && engine.item(dueId) ? dueId : null,
          due: typeof due === "string" ? due : null, applies,
        });
      }
      // A program whose verification is pending with no element flag set
      // (CHP+ pending a reasonable opportunity period has no status-document
      // flag of its own): the program's own pending status is the row
      // (county supervisor task 4: the child's CHP+ row was missing).
      if (!any && status && engine.item(status)) {
        const v = recordedValue(engine, hc, status, pid, monthFor(status));
        if (typeof v === "string" && /reasonable_opportunity/.test(v)) {
          const dueId = dueDateFor(p.id, status);
          const due = dueId && engine.item(dueId) ? recordedValue(engine, hc, dueId, pid, monthFor(dueId)) : null;
          out.push({
            person: pid, program: p.id, identifier: status,
            document: pendingStatusDocument(v),
            dueIdentifier: dueId && engine.item(dueId) ? dueId : null,
            due: typeof due === "string" ? due : null, applies,
          });
        }
      }
    }
  }
  return out;
}

/** The document a program's pending status stands for, in words. */
function pendingStatusDocument(status: string): string {
  if (/reasonable_opportunity/.test(status)) return "Citizenship or immigration status (reasonable opportunity period)";
  const rest = status.replace(/^pending_?/, "").replace(/_/g, " ").trim();
  return rest ? `Verification pending: ${rest}` : "Verification pending";
}

/** One row per document a person owes, with every program it is owed for and
 *  each program's due date, the earliest first (county supervisor task 4:
 *  "one document, several rows"). */
export interface DocumentRow {
  person: string;
  document: string;
  programs: Array<{ program: string; identifier: string; due: string | null; dueIdentifier: string | null }>;
  /** The earliest due date across the programs, or null. */
  due: string | null;
}

export function documentRows(owed: readonly DocumentOwed[]): DocumentRow[] {
  const out: DocumentRow[] = [];
  for (const d of owed) {
    let row = out.find((r) => r.person === d.person && r.document.toLowerCase() === d.document.toLowerCase());
    if (!row) { row = { person: d.person, document: d.document, programs: [], due: null }; out.push(row); }
    row.programs.push({ program: d.program, identifier: d.identifier, due: d.due, dueIdentifier: d.dueIdentifier });
    if (d.due && (!row.due || d.due < row.due)) row.due = d.due;
  }
  for (const r of out) r.programs.sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  return out;
}

// ---- what changes

export interface OutcomeChange {
  person: string;
  identifier: string;
  month: string | null;
  before: unknown;
  after: unknown;
}

/** The case's outcomes that differ between two engines (the rules in force
 *  and the staged drafts): every outcome the case records, plus any `extra`
 *  outcome the reader is looking at. A comparison of the same stored facts
 *  under two sets of rules, not a calculation on new inputs. */
export function caseChanges(
  before: Engine, after: Engine, hc: HouseholdCase,
  extra: ReadonlyArray<{ identifier: string; person: string; month: string | null }> = [],
): OutcomeChange[] {
  const out: OutcomeChange[] = [];
  const seen = new Set<string>();
  const a = before.runCase(hc).results;
  const b = new Map(after.runCase(hc).results.map((r) => [`${r.person}|${r.identifier}|${r.month ?? ""}`, r]));
  for (const r of a) {
    const k = `${r.person}|${r.identifier}|${r.month ?? ""}`;
    seen.add(k);
    const later = b.get(k);
    const got2 = later ? later.got : null;
    if (!same(r.got, got2)) out.push({ person: r.person, identifier: r.identifier, month: r.month, before: r.got, after: got2 });
  }
  for (const e of extra) {
    const k = `${e.person}|${e.identifier}|${e.month ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    const v1 = recordedValue(before, hc, e.identifier, e.person, e.month);
    const v2 = recordedValue(after, hc, e.identifier, e.person, e.month);
    if (!same(v1, v2)) out.push({ person: e.person, identifier: e.identifier, month: e.month, before: v1, after: v2 });
  }
  return out;
}

function same(x: unknown, y: unknown): boolean {
  if (x === null || x === undefined) return y === null || y === undefined;
  if (y === null || y === undefined) return false;
  return valuesEqual(x, y);
}
