/* The "by aid code" view's data (phase 13): each placeholder aid code with
 * the outcome option it stands for, the rule branch that leads there, the
 * figures that branch reads, and the stored test households whose persons
 * land in it; and, for one stored household, each person's codes across
 * every program (the county supervisor's task 1).
 *
 * Household programs (SNAP, Colorado Works, CCCAP, LEAP) are decided for a
 * household or unit and reported on every member; a person gets the code
 * only when their own participation outcome makes them a member
 * (`aid-codes.yaml` `participation`), so a household result never reads as
 * the person's own (county supervisor U5).
 *
 * Values are what the codex evaluates for the stored household as written in
 * `tests/cases.yaml`: no intake and nothing typed in. */
import type { Engine } from "../engine/engine";
import type { HouseholdCase } from "../engine/cases";
import { caseToSpec } from "../engine/cases";
import { evaluate, makeCase, type CaseData } from "../engine/evaluate";
import type { Expr, Item } from "../engine/types";
import {
  optionKey, type AidCode, type AidCodeMap, type AidCodeOutcome, type Participation,
} from "../ledger/aid-codes";

/** One code, with where it comes from. */
export interface CodeEntry extends AidCode {
  /** The outcome item's identifier and the option the code stands for. */
  outcome: string;
  option: string;
  program: string;
  /** Other outcomes that must hold, as the file states them. */
  requires: Record<string, string[]>;
  /** The program's participation gate, when it is a household program. */
  participation: Participation | null;
}

/** Every code in the file, in file order, with its program. Codes whose
 *  outcome the ledger no longer has are left out (the check warns). */
export function codeEntries(engine: Engine, map: AidCodeMap): CodeEntry[] {
  const out: CodeEntry[] = [];
  for (const o of map.outcomes) {
    const it = engine.item(o.outcome);
    if (!it) continue;
    for (const [option, c] of Object.entries(o.codes)) {
      out.push({
        ...c, outcome: o.outcome, option, program: it.program,
        requires: o.requires ?? {}, participation: map.participation[it.program] ?? null,
      });
    }
  }
  return out;
}

/** The programs that have codes, in the volume's declared order. */
export function codePrograms(engine: Engine, map: AidCodeMap): string[] {
  const have = new Set(codeEntries(engine, map).map((c) => c.program));
  const declared = (engine.meta.programs ?? []).map((p) => p.id);
  return [...declared.filter((p) => have.has(p)), ...[...have].filter((p) => !declared.includes(p))];
}

/** Which program an outcome identifier or a program id names, for the
 *  route's `arg`: a program id as itself, an outcome as its item's program. */
export function programOfArg(engine: Engine, map: AidCodeMap, arg: string | null): string | null {
  if (!arg) return null;
  const progs = codePrograms(engine, map);
  if (progs.includes(arg)) return arg;
  const it = engine.item(arg);
  return it && progs.includes(it.program) ? it.program : null;
}

// ---- the rule branch behind an option

/** The tests a value of a `case` rule passes through: every condition on the
 *  path to it must hold (`when`, outermost first), and every earlier arm's
 *  condition on that path must not (`unless`). An `otherwise` arm adds no
 *  condition of its own. */
export interface Branch { when: Expr[]; unless: Expr[] }

type E = any;
const isArr = (e: unknown): e is E[] => Array.isArray(e);

/** The branches of a rule whose result is the literal `option` ("yes"/"no"
 *  for a yes/no rule). A yes/no rule that is not a `case` reaches "yes" when
 *  the rule holds. Null when the rule is not a case tree of literal results
 *  (the view then shows the whole rule). */
export function branchesTo(item: Item, option: string): Branch[] | null {
  const e = item.derived as E;
  if (e === undefined || e === null) return null;
  if (!(isArr(e) && e[0] === "case")) {
    if (item.type === "yes/no") {
      if (option === "yes") return [{ when: [e], unless: [] }];
      if (option === "no") return [{ when: [], unless: [e] }];
    }
    return null;
  }
  const out: Branch[] = [];
  let opaque = false;
  const walk = (x: E, when: Expr[], unless: Expr[]) => {
    if (isArr(x) && x[0] === "case") {
      const earlier: Expr[] = [];
      for (const arm of x.slice(1) as E[]) {
        if (arm[0] === "else") walk(arm[1], when, [...unless, ...earlier]);
        else {
          walk(arm[1], [...when, arm[0]], [...unless, ...earlier]);
          earlier.push(arm[0]);
        }
      }
      return;
    }
    if (typeof x === "string" || typeof x === "boolean") {
      if (optionKey(x) === option) out.push({ when, unless });
      return;
    }
    opaque = true;
  };
  walk(e, [], []);
  if (!out.length && opaque) return null;
  return out;
}

// ---- figures

/** The parameters a branch reads: those it names, and those the rules it
 *  names read, up to `depth` rules down (the test "meets the Children MAGI
 *  category" reaches the children's income standard two rules down).
 *  Sorted by name. */
export function branchFigures(engine: Engine, exprs: readonly Expr[], depth = 3): Item[] {
  const found = new Map<string, Item>();
  const seen = new Set<string>();
  let frontier: string[] = [];
  for (const e of exprs) {
    if (typeof e === "string" && engine.item(e)) { frontier.push(e); continue; }
    try { frontier.push(...engine.uses(e)); } catch { /* not an expression */ }
  }
  for (let level = 0; level <= depth && frontier.length; level++) {
    const next: string[] = [];
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      const it = engine.item(id);
      if (it?.kind === "parameter") found.set(id, it);
      else if (it?.kind === "derived") next.push(...engine.usesOfItem(id));
    }
    frontier = next;
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const upstreamMemo = new WeakMap<Engine, Map<string, Item[]>>();

/** Every parameter an outcome can reach, however deep. Sorted by name. */
export function upstreamFigures(engine: Engine, identifier: string): Item[] {
  let m = upstreamMemo.get(engine);
  if (!m) { m = new Map(); upstreamMemo.set(engine, m); }
  const hit = m.get(identifier);
  if (hit) return hit;
  const seen = new Set<string>();
  const stack = [identifier];
  const out: Item[] = [];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const it = engine.item(id);
    if (it?.kind === "parameter") out.push(it);
    for (const d of engine.usesOfItem(id)) stack.push(d);
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  m.set(identifier, out);
  return out;
}

// ---- one stored household

/** The month a stored case is read in by default: its as-of date's month. */
export function caseMonth(c: HouseholdCase): string {
  return c.as_of.slice(0, 7);
}

/** Every month a stored case states an expectation for, its own month
 *  first: the months the household view can be read in. */
export function caseMonths(c: HouseholdCase): string[] {
  const set = new Set<string>([caseMonth(c)]);
  for (const per of Object.values(c.expect ?? {})) {
    for (const v of Object.values(per)) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        for (const k of Object.keys(v)) if (/^\d{4}-\d{2}$/.test(k)) set.add(k);
      }
    }
  }
  return [...set].sort();
}

/** Evaluates outcomes of one stored household, each once. */
export class CaseReader {
  private data: CaseData;
  private memo = new Map<string, unknown>();
  constructor(private engine: Engine, readonly hc: HouseholdCase, readonly month: string) {
    this.data = makeCase(engine.index, caseToSpec(hc));
  }

  persons(): string[] {
    return Object.keys(this.hc.persons ?? {});
  }

  /** The value of an outcome for a person, null when unknown or when it
   *  cannot be evaluated. */
  value(identifier: string, person: string): unknown {
    const key = `${identifier}|${person}`;
    if (this.memo.has(key)) return this.memo.get(key);
    const it = this.engine.item(identifier);
    let v: unknown = null;
    if (it) {
      const month = it.scope === "person-month" || it.scope === "month" ? this.month : null;
      const p = it.scope === "person" || it.scope === "person-month" ? person : null;
      try { v = evaluate(this.engine.index, this.data, identifier, p, month); } catch { v = null; }
    }
    this.memo.set(key, v);
    return v;
  }
}

/** One outcome's value for a person, as the file keys options. */
export interface OutcomeValue { outcome: string; value: unknown; key: string | null }

/** A person's standing in one program. */
export interface PersonProgram {
  program: string;
  /** The codes this person holds. */
  codes: CodeEntry[];
  /** The person's participation, for a household program. */
  participation: (OutcomeValue & { member: boolean }) | null;
  /** True when the household has a code but this person is not a member. */
  householdOnly: boolean;
  /** The codes the household or unit holds, whether or not the person is a
   *  member (the same as `codes` for a person-level program). */
  household: CodeEntry[];
  /** Who pays, from the funding outcome, for Medicaid and CHP+. */
  funding: OutcomeValue | null;
  /** Why there is no code: the first outcome's no-code reason, when no code
   *  applies. */
  reason: { outcome: string; option: string; text: string } | null;
  /** Every outcome of the program the file lists, with this person's value. */
  values: OutcomeValue[];
}

function keyOf(v: unknown): string | null {
  return v === null || v === undefined ? null : optionKey(v);
}

function requirementsHold(reader: CaseReader, person: string, o: AidCodeOutcome): boolean {
  for (const [id, opts] of Object.entries(o.requires ?? {})) {
    const k = keyOf(reader.value(id, person));
    if (k === null || !opts.includes(k)) return false;
  }
  return true;
}

/** One person's codes in one program. */
export function personProgram(
  engine: Engine, map: AidCodeMap, reader: CaseReader, person: string, program: string,
): PersonProgram {
  const outcomes = map.outcomes.filter((o) => engine.item(o.outcome)?.program === program);
  const gate = map.participation[program] ?? null;
  let participation: PersonProgram["participation"] = null;
  if (gate) {
    const v = reader.value(gate.outcome, person);
    const k = keyOf(v);
    participation = { outcome: gate.outcome, value: v, key: k, member: k !== null && gate.member.includes(k) };
  }
  const values: OutcomeValue[] = [];
  const householdCodes: CodeEntry[] = [];
  let reason: PersonProgram["reason"] = null;
  for (const o of outcomes) {
    const v = reader.value(o.outcome, person);
    const k = keyOf(v);
    values.push({ outcome: o.outcome, value: v, key: k });
    const c = k !== null ? o.codes[k] : undefined;
    if (c && requirementsHold(reader, person, o)) {
      householdCodes.push({
        ...c, outcome: o.outcome, option: k!, program, requires: o.requires ?? {}, participation: gate,
      });
    } else if (!reason && k !== null && !c && !(o.requires && Object.keys(o.requires).length)) {
      const why = o.no_code?.[k];
      if (why) reason = { outcome: o.outcome, option: k, text: why };
    }
  }
  const member = !gate || (participation?.member ?? false);
  const codes = member ? householdCodes : [];
  let funding: OutcomeValue | null = null;
  if (map.funding && map.funding.programs.includes(program) && codes.length) {
    const v = reader.value(map.funding.outcome, person);
    funding = { outcome: map.funding.outcome, value: v, key: keyOf(v) };
  }
  return {
    program, codes, participation, householdOnly: !member && householdCodes.length > 0,
    household: householdCodes,
    funding, reason: codes.length ? null : reason, values,
  };
}

export interface HouseholdRow { person: string; programs: PersonProgram[] }

/** Each person of a stored household, with their codes in every program. */
export function householdCodes(
  engine: Engine, map: AidCodeMap, hc: HouseholdCase, month: string = caseMonth(hc),
): HouseholdRow[] {
  const reader = new CaseReader(engine, hc, month);
  const programs = codePrograms(engine, map);
  return reader.persons().map((person) => ({
    person,
    programs: programs.map((p) => personProgram(engine, map, reader, person, p)),
  }));
}

export interface Landing { caseId: string; title: string; person: string; month: string }

const landingMemo = new WeakMap<Engine, WeakMap<object, Map<string, Landing[]>>>();

/** For every code, the stored households' persons who hold it in each
 *  case's own month. Memoised per engine and case list. */
export function landings(
  engine: Engine, map: AidCodeMap, cases: readonly HouseholdCase[],
): Map<string, Landing[]> {
  let byCases = landingMemo.get(engine);
  if (!byCases) { byCases = new WeakMap(); landingMemo.set(engine, byCases); }
  const hit = byCases.get(cases);
  if (hit) return hit;
  const out = new Map<string, Landing[]>();
  for (const hc of cases) {
    const month = caseMonth(hc);
    for (const row of householdCodes(engine, map, hc, month)) {
      for (const pp of row.programs) {
        for (const c of pp.codes) {
          const list = out.get(c.code) ?? [];
          list.push({ caseId: hc.id, title: hc.title, person: row.person, month });
          out.set(c.code, list);
        }
      }
    }
  }
  byCases.set(cases, out);
  return out;
}
