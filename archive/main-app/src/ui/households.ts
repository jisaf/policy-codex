/* The data behind Households (places/HouseholdPage.tsx) and a household's
 * determination (places/Determination.tsx), docs/design-unified-ui.md:
 *
 *   householdPeople   each person named as the case author describes them ("p1 Grandmother, 79")
 *   resultsGrid       programs as rows, persons as columns, each cell a person's codes in a program
 *   clientSentence    one sentence a client could be read ("Your household's countable income,
 *                     $410, is above the $331 limit …")
 *   whyInShort        the chain from the result down to the step that decided it
 *   statedAmounts     the dollar amounts a stored household states (what if)
 *   whatIfChanges     the household's results with one amount moved
 *   tippingPoint      the smallest raise that changes one result, and every step that changes
 *
 * Nothing here takes intake: every value is the stored household's, and
 * "what if" re-reads the same stored household with one stated amount moved
 * (docs/design-unified-ui.md, principle 5). Counts shown beside these come
 * from counts.ts. */
import type { Engine } from "../engine/engine";
import { caseToSpec, programsOfCase, type HouseholdCase } from "../engine/cases";
import type { TraceNode } from "../engine/explain";
import type { Item } from "../engine/types";
import { valuesEqual } from "../engine/values";
import type { AidCodeMap } from "../ledger/aid-codes";
import { CaseReader, caseMonth, codePrograms, householdCodes, type PersonProgram } from "./aidcodes";
import { outcomesAffected } from "./counts";
import { relationDescription } from "./people";
import { formatFor, formatMoney, personLabel } from "./present";
import { programLabel } from "./roles";
import {
  ageOn, budgetMoney, budgetRole, declaredOutcomePrograms, isHouseholdOutcome, plainCaseTitle,
  type Walk, type WalkStep,
} from "./walkthrough";

// ---- people

/** The comment the case author wrote under each person of each case in
 *  tests/cases.yaml (`p1:` then `# Grandmother, 79, U.S. citizen, …`),
 *  which the parsed YAML drops. caseId -> person -> note. */
export function personNotes(casesText: string | null): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  if (!casesText) return out;
  const lines = casesText.split("\n");
  let id: string | null = null;
  let section: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const head = /^- id:\s*"?([^"\s]+)"?/.exec(line);
    if (head) { id = head[1]; section = null; continue; }
    const sec = /^ {2}(\w+):/.exec(line);
    if (sec) { section = sec[1]; continue; }
    const p = /^ {4}(p\d+):\s*(?:#.*)?$/.exec(line);
    if (!p || section !== "persons" || !id) continue;
    const words: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const c = /^\s+#\s?(.*)$/.exec(lines[j]);
      if (!c) break;
      words.push(c[1].trim());
    }
    const note = words.join(" ").trim();
    if (!note) continue;
    if (!out.has(id)) out.set(id, new Map());
    out.get(id)!.set(p[1], note);
  }
  return out;
}

let lastNotes: { text: string; notes: Map<string, Map<string, string>> } | null = null;

/** `personNotes`, memoised on the last text read. */
function notesOf(casesText: string | null): Map<string, Map<string, string>> {
  if (!casesText) return new Map();
  if (lastNotes?.text !== casesText) lastNotes = { text: casesText, notes: personNotes(casesText) };
  return lastNotes.notes;
}

export interface PersonInfo {
  /** "p1". */
  id: string;
  /** "Grandmother, 79": the head of the case author's note, else the stated
   *  relationship and age ("Grandchild of Person 1, 16"), else "Age 16". */
  short: string;
  /** The case author's whole note, or null. */
  note: string | null;
  /** The note after its head ("U.S. citizen, Medicare, applying for …"),
   *  so a page that shows `short` does not repeat it; null when nothing is left. */
  rest: string | null;
  /** Age in whole years on the case's date, from the date of birth. */
  age: number | null;
}

/** The head of a note: its first two comma-separated parts, before any
 *  semicolon or bracket ("Grandmother, 79"; "Applicant mother, 30"). */
export function noteHead(note: string): string {
  const s = note.replace(/^p\d+:\s*/, "").split(/[;(]/)[0].split(",").slice(0, 2).join(",").replace(/[.:]\s*$/, "").trim();
  return s.length > 48 ? s.slice(0, 45).replace(/\s+\S*$/, "") + "…" : s;
}

export function personInfo(hc: HouseholdCase, pid: string, casesText: string | null): PersonInfo {
  const note = notesOf(casesText).get(hc.id)?.get(pid) ?? null;
  const age = ageOn(hc.persons[pid]?.facts?.date_of_birth, hc.as_of);
  let short: string;
  if (note) short = noteHead(note);
  else {
    const rel = relationDescription(hc, pid);
    const r = rel ? rel[0].toUpperCase() + rel.slice(1) : "";
    short = r ? `${r}${age !== null ? `, ${age}` : ""}` : age !== null ? `Age ${age}` : personLabel(pid);
  }
  let rest: string | null = null;
  if (note) {
    const r = note.startsWith(short) ? note.slice(short.length).replace(/^[\s,.;:]+/, "").trim() : note;
    rest = r ? r[0].toUpperCase() + r.slice(1) : null;
  }
  return { id: pid, short, note, rest, age };
}

export function householdPeople(hc: HouseholdCase, casesText: string | null): PersonInfo[] {
  return Object.keys(hc.persons ?? {}).map((pid) => personInfo(hc, pid, casesText));
}

/** "Person 1 (Grandmother, 79)": a person named in a sentence. */
export function personName(p: PersonInfo): string {
  return p.short && p.short !== personLabel(p.id) ? `${personLabel(p.id)} (${p.short})` : personLabel(p.id);
}

// ---- the list

export interface HouseholdSummary {
  id: string;
  title: string;
  asOf: string;
  people: PersonInfo[];
  programs: string[];
}

export function householdSummaries(engine: Engine, cases: readonly HouseholdCase[], casesText: string | null): HouseholdSummary[] {
  return cases.map((hc) => ({
    id: hc.id, title: plainCaseTitle(hc.title).title, asOf: hc.as_of,
    people: householdPeople(hc, casesText),
    programs: programsOfCase(engine.index, hc).filter((p) => p !== "All"),
  }));
}

/** The households a list shows: those in `program` (when set) whose id,
 *  title or person notes contain every word of `words`. */
export function filterHouseholds(list: readonly HouseholdSummary[], program: string, words: string): HouseholdSummary[] {
  const ws = words.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((h) => {
    if (program && !h.programs.includes(program)) return false;
    if (!ws.length) return true;
    const text = [h.id, h.title, ...h.people.map((p) => `${p.short} ${p.note ?? ""}`)].join(" ").toLowerCase();
    return ws.every((w) => text.includes(w));
  });
}

// ---- results and aid codes

export interface ResultsGrid {
  persons: PersonInfo[];
  /** The programs the stored household is set up for, in the aid-code
   *  layer's order: the grid's rows. */
  programs: string[];
  /** Programs the case never states a result for: named under the grid,
   *  not drawn as rows that would claim something. */
  untested: string[];
  cell(program: string, person: string): PersonProgram;
}

export function resultsGrid(
  engine: Engine, map: AidCodeMap, hc: HouseholdCase, casesText: string | null, month: string = caseMonth(hc),
): ResultsGrid {
  const rows = householdCodes(engine, map, hc, month);
  const all = codePrograms(engine, map);
  const byKey = new Map<string, PersonProgram>();
  for (const r of rows) for (const pp of r.programs) byKey.set(`${pp.program}|${r.person}`, pp);
  const tested = all.filter((p) => rows.some((r) => r.programs.find((x) => x.program === p)?.tested));
  return {
    persons: householdPeople(hc, casesText),
    programs: tested,
    untested: all.filter((p) => !tested.includes(p)),
    cell: (program, person) => byKey.get(`${program}|${person}`)!,
  };
}

// ---- the client sentence and "why, in short"

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** A rule's name without its program ("Colorado Works: need standard" ->
 *  "need standard"), first letter lower-cased unless it is an acronym. */
export function shortName(name: string): string {
  const s = name.replace(/^[^:]{2,40}:\s*/, "").trim();
  return /^[A-Z]{2,}/.test(s) ? s : s ? s[0].toLowerCase() + s.slice(1) : name;
}

function lowerFirst(s: string): string {
  return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

function money(v: unknown): string {
  return budgetMoney(v, (x) => (typeof x === "number" ? `$${x.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` : String(x)));
}

function isMoneyNode(engine: Engine, n: TraceNode): boolean {
  return engine.item(n.identifier)?.type === "money" && typeof n.value === "number";
}

function isLimit(name: string): boolean {
  return budgetRole(name) === "standard" || /\b(limit|standard|threshold|maximum|cap)\b/i.test(name);
}

/** The test a result turned on: a yes/no step that compared two dollar
 *  amounts (countable income with a need standard), with the amount first
 *  and the limit second, and the size of the household the limit is for
 *  when its rule reads one. Null when the deciding step was no comparison. */
export interface Comparison {
  step: WalkStep;
  amount: TraceNode;
  limit: TraceNode;
  /** How many people the limit is for, when its rule reads a household size
   *  or a list of members. */
  size: number | null;
}

export function decidingComparison(engine: Engine, walk: Walk): Comparison | null {
  const why = walk.why;
  if (!why) return null;
  const candidates: WalkStep[] = [];
  if (typeof why.node.value === "boolean") candidates.push(why);
  if (why.parent !== null) candidates.push(walk.steps[why.parent - 1]);
  for (const t of candidates) {
    if (typeof t.node.value !== "boolean") continue;
    const nums = t.inputs.filter((i) => i.mattered && isMoneyNode(engine, i.node));
    if (nums.length !== 2) continue;
    let [a, b] = nums;
    if (isLimit(a.node.name) && !isLimit(b.node.name)) [a, b] = [b, a];
    // The people the limit is for: a list of members it reads, else the
    // head counts it reads (one caretaker and one child: a household of two).
    let size: number | null = null;
    const ls = b.step !== null ? walk.steps[b.step - 1] : null;
    let counted = 0;
    for (const i of ls?.inputs ?? []) {
      const v = i.node.value;
      if (Array.isArray(v) && v.length && v.every((x) => typeof x === "string" && /^p\d+$/.test(x))) { size = v.length; break; }
      if (typeof v === "number" && Number.isInteger(v) && /\b(size|count|number)\b/i.test(i.node.name)
        && /(caretaker|child|member|person|people|household|unit|adult)/i.test(i.node.name)) {
        counted += v;
        size = counted;
      }
    }
    return { step: t, amount: a.node, limit: b.node, size };
  }
  return null;
}

/** A status a client is told in one clause: "your household is not
 *  eligible for Colorado Works". Null for a value that is not a plain
 *  eligible / not eligible. */
function statusClause(engine: Engine, root: TraceNode, household: boolean, program: string): string | null {
  const v = root.value;
  const who = household ? "your household is" : "you are";
  const prog = programLabel(program);
  if (v === true && /\b(is eligible|eligible)\b/i.test(root.name)) return `${who} eligible for ${prog}`;
  if (v === false && /\b(is eligible|eligible)\b/i.test(root.name)) return `${who} not eligible for ${prog}`;
  if (typeof v !== "string") return null;
  if (/^(not_eligible|ineligible|denied)/.test(v)) return `${who} not eligible for ${prog}`;
  if (/^eligible/.test(v)) return `${who} eligible for ${prog}`;
  return null;
}

function whose(n: TraceNode, person: string, household: boolean): string {
  if (n.person === null || n.person === undefined) return "Your household's";
  if (household && n.person === person) return "Your household's";
  if (n.person === person) return "Your";
  return `${personLabel(n.person)}'s`;
}

/** One sentence a worker could read to the client: what decided the result,
 *  in plain words and whole dollars. For a comparison: "Your household's
 *  countable income, $410, is above the $331 limit (need standard) for a
 *  household of two, so your household is not eligible for Colorado Works."
 *  For an amount: "Your household's grant amount is $387 a month, worked out
 *  from …". For an unknown: what the case does not give. */
export function clientSentence(
  engine: Engine, walk: Walk, person: string, opts: { missing?: string[] } = {},
): string {
  const root = walk.root;
  const it = engine.item(root.identifier);
  const program = it?.program ?? "";
  const household = isHouseholdOutcome(engine, root.identifier);
  const name = shortName(root.name);
  const owner = household ? "Your household's" : "Your";
  if (root.value === null) {
    const miss = opts.missing?.length ? `: the case does not give ${opts.missing.slice(0, 3).join("; ")}` : "";
    return `${owner} ${name} cannot be decided yet${miss}.`;
  }
  const cmp = decidingComparison(engine, walk);
  const status = statusClause(engine, root, household, program);
  if (cmp) {
    const a = cmp.amount.value as number;
    const b = cmp.limit.value as number;
    const rel = a > b ? "above" : a < b ? "below" : "the same as";
    const limitName = shortName(cmp.limit.name);
    const limit = /\blimit\b/i.test(limitName) ? `the ${money(b)} ${limitName}` : `the ${money(b)} limit (${limitName})`;
    const size = cmp.size !== null && cmp.size > 0
      ? ` for a household of ${NUMBER_WORDS[cmp.size] ?? cmp.size}` : "";
    const lead = `${whose(cmp.amount, person, household)} ${shortName(cmp.amount.name)}, ${money(a)}, is ${rel} ${limit}${size}`;
    const then = status ?? `${lowerFirst(owner)} ${name} is ${lowerFirst(formatFor(engine, root.identifier, root.value))}`;
    return `${lead}, so ${then}.`;
  }
  if (it?.type === "money" && typeof root.value === "number") {
    const parts = (walk.steps[0]?.inputs ?? [])
      .filter((i) => i.mattered && isMoneyNode(engine, i.node) && i.node.value !== 0)
      .slice(0, 3)
      .map((i) => `${shortName(i.node.name)} (${money(i.node.value)})`);
    const per = it.scope === "person-month" || it.scope === "month" ? " a month" : "";
    return `${owner} ${name} is ${money(root.value)}${per}${parts.length ? `, worked out from ${parts.join(" and ")}` : ""}.`;
  }
  const head = status ? status[0].toUpperCase() + status.slice(1)
    : `${owner} ${name} is ${lowerFirst(formatFor(engine, root.identifier, root.value))}`;
  const why = walk.why && walk.why.n !== 1 ? walk.why.node : null;
  if (!why) return `${head}.`;
  return `${head}, because ${shortName(why.name)} is ${lowerFirst(formatFor(engine, why.identifier, why.value))}.`;
}

/** The steps from the result down to the one that decided it, top down:
 *  "Not eligible: income, because meets income test is no, because
 *  countable income is $410". At most `max`; a longer chain keeps its first
 *  step and the last ones, and says how many it skipped. */
export function whyInShort(walk: Walk, max = 5): { steps: WalkStep[]; skipped: number } {
  const chain: WalkStep[] = [];
  let s: WalkStep | null = walk.why;
  while (s && s.n !== 1) { chain.unshift(s); s = s.parent !== null ? walk.steps[s.parent - 1] : null; }
  if (chain.length <= max) return { steps: chain, skipped: 0 };
  const keep = [chain[0], ...chain.slice(chain.length - (max - 1))];
  return { steps: keep, skipped: chain.length - keep.length };
}

// ---- what if

export interface StatedAmount {
  person: string;
  /** A supplied money fact, or a record amount: `<list>.<kind>` (recordAmount). */
  identifier: string;
  /** What the case states (the largest month, for an amount stated by month). */
  value: number;
  /** The amount reads as income (wages, a pension, support). */
  income: boolean;
}

const EARNED = /wage|earn|salary|self_employ|tips/;
const INCOME = /wage|income|earn|salary|benefit|pension|support|ssi|ssdi|social_security|unemployment|tips|self_employ/;
const NOT_INCOME = /expense|cost|paid|premium|resource|value|balance|_due|deduct/;

/** The record lists whose amounts a what-if can move (receipts CO-5000,
 *  earnings CO-5100, holdings CO-5300): the money field each record states,
 *  and whether it reads as income. Since steps E2 and H2 (docs/reviews/
 *  records-e2-h2.md) a household states its income and resources there
 *  alone, so they are the amounts a what-if moves. */
const RECORD_LISTS: Readonly<Record<string, { field: string; income: boolean }>> = {
  earnings: { field: "amount", income: true },
  receipts: { field: "amount", income: true },
  holdings: { field: "value", income: false },
};
/** Fields that mark a record as one part of a kind (a month's or a dated
 *  payment, irregular or temporary pay, a joint or a disposed holding): a
 *  what-if moves only the one recurring record of a kind. */
const PART_FIELDS = ["month", "date", "irregular", "temporary_job", "paid_as_business_owner", "job_start_date", "job_end_date", "farm",
  "retroactive", "holding_id", "share", "source_date", "disposed_date"];

/** The list and kind of a record amount's identifier (`earnings.wages`), or
 *  null for a supplied fact. */
export function recordAmount(identifier: string): { list: string; kind: string; field: string } | null {
  const i = identifier.indexOf(".");
  const list = i > 0 ? identifier.slice(0, i) : "";
  return RECORD_LISTS[list] ? { list, kind: identifier.slice(i + 1), field: RECORD_LISTS[list].field } : null;
}

/** The person's one recurring record of `kind` in `list`, or every such
 *  record when there is more than one. */
function ownRecords(facts: Record<string, unknown> | undefined, list: string, kind: string, field: string): Array<Record<string, unknown>> {
  const rs = facts?.[list];
  if (!Array.isArray(rs)) return [];
  return (rs as Array<Record<string, unknown>>).filter((r) => r.kind === kind && typeof r[field] === "number" && r.frequency !== "once"
    && PART_FIELDS.every((k) => r[k] === undefined));
}

/** The dollar amounts the stored household states for its people: what a
 *  "what if" can move. Each supplied money fact, and each kind of record of
 *  which the person states one recurring record (its amount, or a
 *  holding's value). Incomes first, larger first. */
export function statedAmounts(engine: Engine, hc: HouseholdCase): StatedAmount[] {
  const out: StatedAmount[] = [];
  for (const [pid, p] of Object.entries(hc.persons ?? {})) {
    const seen = new Map<string, number>();
    const look = (rec: Record<string, unknown> | undefined) => {
      for (const [k, v] of Object.entries(rec ?? {})) {
        const it = engine.item(k);
        if (!it || it.kind !== "supplied" || it.type !== "money" || typeof v !== "number") continue;
        seen.set(k, Math.max(v, seen.get(k) ?? -Infinity));
      }
    };
    look(p.facts as Record<string, unknown> | undefined);
    look(p.month_defaults);
    for (const m of Object.values(p.months ?? {})) look(m);
    for (const [k, v] of seen) {
      out.push({ person: pid, identifier: k, value: v, income: INCOME.test(k) && !NOT_INCOME.test(k) });
    }
    const facts = p.facts as Record<string, unknown> | undefined;
    for (const [list, { field, income }] of Object.entries(RECORD_LISTS)) {
      const kinds = new Set(((Array.isArray(facts?.[list]) ? facts![list] : []) as Array<Record<string, unknown>>).map((r) => String(r.kind)));
      for (const kind of kinds) {
        const own = ownRecords(facts, list, kind, field);
        if (own.length === 1) out.push({ person: pid, identifier: `${list}.${kind}`, value: own[0][field] as number, income });
      }
    }
  }
  const earned = (a: StatedAmount) => Number(a.income && EARNED.test(a.identifier) && a.value > 0);
  return out.sort((a, b) => earned(b) - earned(a) || Number(b.income) - Number(a.income) || Number(b.value > 0) - Number(a.value > 0)
    || b.value - a.value || a.person.localeCompare(b.person));
}

export function amountKey(a: Pick<StatedAmount, "person" | "identifier">): string {
  return `${a.person}:${a.identifier}`;
}

/** The name a stated amount is shown by: the supplied fact's, or the
 *  record list's and the kind's (`Earnings records: wages`). */
export function amountName(engine: Engine, identifier: string): string {
  const r = recordAmount(identifier);
  if (!r) return engine.item(identifier)?.name ?? identifier;
  return `${engine.item(r.list)?.name ?? r.list}: ${r.kind.replace(/_/g, " ")}`;
}

/** A stated amount's value as the page shows it: a record amount is money. */
export function formatAmount(engine: Engine, identifier: string, value: number): string {
  return recordAmount(identifier) ? formatMoney(value) : formatFor(engine, identifier, value);
}

/** The stored household with `delta` added to one stated amount: a
 *  supplied fact wherever the case states it (every month it is stated
 *  for), or a record amount on the person's one recurring record of that
 *  kind (a record is added when the person's stated list has none). The
 *  original is not changed. */
export function withRaise(hc: HouseholdCase, a: Pick<StatedAmount, "person" | "identifier">, delta: number): HouseholdCase {
  const x = JSON.parse(JSON.stringify(hc)) as HouseholdCase;
  const p = x.persons[a.person];
  if (!p) return x;
  const rec = recordAmount(a.identifier);
  if (rec) {
    const facts = p.facts as Record<string, unknown> | undefined;
    const list = facts?.[rec.list];
    const own = ownRecords(facts, rec.list, rec.kind, rec.field);
    if (own.length === 1) own[0][rec.field] = (own[0][rec.field] as number) + delta;
    else if (own.length === 0 && Array.isArray(list)) list.push({ kind: rec.kind, [rec.field]: delta });
    return x;
  }
  const bump = (r: Record<string, unknown> | undefined) => {
    if (r && typeof r[a.identifier] === "number") r[a.identifier] = (r[a.identifier] as number) + delta;
  };
  bump(p.facts as Record<string, unknown> | undefined);
  bump(p.month_defaults);
  for (const m of Object.values(p.months ?? {})) bump(m);
  return x;
}

export interface Watched { person: string; identifier: string }

/** The household's program results an amount can move: each declared
 *  outcome that reads it (counts.ts `outcomesAffected`, verification flags
 *  left out), for every person. */
export function watchedResults(engine: Engine, hc: HouseholdCase, identifier: string): Watched[] {
  // a record amount moves what reads its list
  const outs = new Set(outcomesAffected(engine, recordAmount(identifier)?.list ?? identifier));
  const declared = declaredOutcomePrograms(engine).flatMap((p) => p.outcomes).filter((o) => outs.has(o));
  const tested = new Set(programsOfCase(engine.index, hc));
  const ids = declared.filter((o) => tested.has(engine.item(o)?.program ?? ""));
  return Object.keys(hc.persons ?? {}).flatMap((person) => ids.map((identifier) => ({ person, identifier })));
}

export interface ResultChange extends Watched { before: unknown; after: unknown }

function same(x: unknown, y: unknown): boolean {
  if (x === null || x === undefined) return y === null || y === undefined;
  if (y === null || y === undefined) return false;
  return valuesEqual(x, y);
}

/** The household's results that change when one stated amount moves by
 *  `delta`, read in the case's own month. */
export function whatIfChanges(
  engine: Engine, hc: HouseholdCase, a: Pick<StatedAmount, "person" | "identifier">, delta: number,
  watched: readonly Watched[] = watchedResults(engine, hc, a.identifier),
): ResultChange[] {
  if (!delta) return [];
  const month = caseMonth(hc);
  const before = new CaseReader(engine, hc, month);
  const after = new CaseReader(engine, withRaise(hc, a, delta), month);
  const out: ResultChange[] = [];
  for (const w of watched) {
    const b = before.value(w.identifier, w.person);
    const c = after.value(w.identifier, w.person);
    if (!same(b, c)) out.push({ ...w, before: b, after: c });
  }
  return out;
}

export interface StepChange { node: TraceNode; before: unknown; after: unknown }

export interface TippingPoint {
  /** The smallest raise (whole dollars) that changes the result, or null
   *  when no raise up to `cap` does. */
  raise: number | null;
  cap: number;
  before: unknown;
  after: unknown;
  /** The yes/no or status test nearest the facts that changes: where the
   *  result starts to differ. */
  first: StepChange | null;
  /** Every rule step that changes, from the income up to the result. */
  steps: StepChange[];
}

function scopedArgs(engine: Engine, identifier: string, person: string, month: string): [string | null, string | null] {
  const it = engine.item(identifier);
  const m = it && (it.scope === "person-month" || it.scope === "month") ? month : null;
  const p = it && (it.scope === "person" || it.scope === "person-month") ? person : null;
  return [p, m];
}

/** Blind A's "Find the tipping point": the smallest monthly raise in one
 *  stated amount that changes one result, re-reading the stored household
 *  only, and each step that changes at that raise. */
export function tippingPoint(
  engine: Engine, hc: HouseholdCase, a: Pick<StatedAmount, "person" | "identifier">, target: Watched, cap = 5000,
): TippingPoint {
  const month = caseMonth(hc);
  const val = (d: number) => new CaseReader(engine, d ? withRaise(hc, a, d) : hc, month).value(target.identifier, target.person);
  const base = val(0);
  const probes = [10, 25, 50, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 7500, 10000]
    .filter((s) => s <= cap);
  let lo = 0;
  let hi = -1;
  for (const s of probes) {
    if (!same(val(s), base)) { hi = s; break; }
    lo = s;
  }
  if (hi < 0) return { raise: null, cap, before: base, after: base, first: null, steps: [] };
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (!same(val(mid), base)) hi = mid; else lo = mid;
  }
  const [p, m] = scopedArgs(engine, target.identifier, target.person, month);
  const tBefore = engine.explain(caseToSpec(hc), target.identifier, p, m);
  const tAfter = engine.explain(caseToSpec(withRaise(hc, a, hi)), target.identifier, p, m);
  const flat = (n: TraceNode, depth: number, out: Map<string, { n: TraceNode; depth: number }>) => {
    const had = out.get(n.key);
    if (n.origin !== "memo" && (!had || had.depth < depth)) out.set(n.key, { n, depth });
    for (const k of n.children) flat(k, depth + 1, out);
    return out;
  };
  const was = flat(tBefore, 0, new Map());
  const now = flat(tAfter, 0, new Map());
  const steps: Array<StepChange & { depth: number }> = [];
  for (const [k, x] of now) {
    const y = was.get(k);
    if (!y || x.n.kind !== "derived") continue;
    if (!same(y.n.value, x.n.value)) steps.push({ node: x.n, before: y.n.value, after: x.n.value, depth: x.depth });
  }
  steps.sort((s, t) => t.depth - s.depth);
  const isTest = (s: StepChange) => s.after !== null && typeof s.after !== "number" && !Array.isArray(s.after);
  const first = steps.find(isTest) ?? steps[0] ?? null;
  return {
    raise: hi, cap, before: base, after: tAfter.value, first,
    steps: steps.map(({ node, before, after }) => ({ node, before, after })),
  };
}

// ---- what the case states

export interface FactRow { identifier: string; item: Item | undefined; value: unknown; when: string | null }

/** One person's stated facts: once, every month, or a named month. */
export function personFacts(engine: Engine, hc: HouseholdCase, pid: string): FactRow[] {
  const p = hc.persons[pid];
  if (!p) return [];
  const rows: FactRow[] = [];
  for (const [k, v] of Object.entries((p.facts ?? {}) as Record<string, unknown>)) rows.push({ identifier: k, item: engine.item(k), value: v, when: null });
  for (const [k, v] of Object.entries(p.month_defaults ?? {})) rows.push({ identifier: k, item: engine.item(k), value: v, when: "every month" });
  for (const [m, rec] of Object.entries(p.months ?? {})) {
    for (const [k, v] of Object.entries(rec)) rows.push({ identifier: k, item: engine.item(k), value: v, when: m });
  }
  return rows;
}

/** The program results the case states for a person, by program. */
export function personPrograms(engine: Engine, hc: HouseholdCase, pid: string): string[] {
  const out = new Set<string>();
  for (const id of Object.keys(hc.expect?.[pid] ?? {})) {
    const p = engine.item(id)?.program;
    if (p && p !== "All") out.add(p);
  }
  return [...out];
}
