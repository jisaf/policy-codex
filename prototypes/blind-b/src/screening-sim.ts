/* "Try it on a household" for the Screening view: a stored household is
 * interviewed in the cross-program order of docs/reviews/screening-order.md.
 * Each question reveals the household's own answers; every fact not yet
 * revealed is removed from the case before the engine decides it, so an
 * outcome is either settled or "cannot determine yet". No UI here, and the
 * engine is used as it is (src/engine is not changed). */
import { makeCase, evaluate } from "../../../src/engine/evaluate";
import { caseToSpec, type HouseholdCase } from "../../../src/engine/cases";
import { D, E, byIdent, upstream, monthOf, ageOf } from "./store";

/* ---------- the review's data (scripts/screening-data.ts) ---------- */
export interface Paragraph { cite: string; quote: string | null; rest: string; src: string | null; doc: string | null }
export interface OrderEntry {
  fact_or_item: string; kind: string; settles: string; conditions: string[]; programs_served: string[];
  denial_share: { current_engine: number; three_valued_case: number }; cost: number; answer_source?: string;
  needs_verification: string | null; skips: string[]; item_id?: string; note?: string;
}
export interface ScreeningData {
  review: string; head: string; date: string;
  programs: Record<string, { outcomes: string[]; order: OrderEntry[]; not_a_disqualifier?: string; skip_always?: string[] }>;
  cross_program_order: Array<{ step: number; question: string; facts: string[]; branches: string[] }>;
  skip_sets: Array<{ when: string; skip: string[] }>;
  gaps: Array<{ id: string; title: string; kind: string; item: string; evidence: string; fix: string }>;
  measured: any;
  guardrails: Array<{ rule: string; source: string; quote: string; src: string | null; doc: string | null }>;
  may: string[]; mayNot: string[];
  disqualifiers: Array<{ title: string; family: string | null; outcomes: string[]; notes: string[]; rows: Array<{ condition: string; facts: string; paragraph: Paragraph; denials: string; settle: string; cost: string }> }>;
}
export function screening(): ScreeningData | null { return (D as unknown as { screening?: ScreeningData }).screening ?? null; }

/** The review's program families and the app's program each belongs to. */
export const FAMILY_PROGRAM: Record<string, string> = {
  SNAP: "SNAP", "Medicaid MAGI": "Medicaid", "CHP+": "CHP+", "Medicaid non-MAGI": "Medicaid", "Colorado Works": "ColoradoWorks",
  "Adult Financial": "AdultFinancial", CCCAP: "CCCAP", LEAP: "LEAP", "SUN Bucks": "SunBucks",
};
export const REL = "relationships";

/* ---------- classes ---------- */
export type Cls = "eligible" | "not" | "neither" | "unknown";
/** Neither a denial nor an approval: emergency only, pending, not in the
 *  unit, and a referral to Medicaid ("Medicaid eligible is a referral to
 *  Medicaid, not a denial of coverage", the review on CHP+). */
const NEITHER = new Set(["emergency_only", "incarceration_limited", "pending_community_engagement", "not_in_unit_did_not_request",
  "ineligible_medicaid_eligible", "medicaid_eligible"]);
export const REFERRAL = new Set(["ineligible_medicaid_eligible", "medicaid_eligible"]);
const DENY = new Set(["none", "no", "no_eligible_members", "time_limit_reached", "sanction_closure", "zero_allotment", "striking_member",
  "substantial_lottery_winnings", "resource_transfer_disqualification", "fdpir_participation", "refused_to_cooperate",
  "transfer_penalty", "home_equity_exceeds_limit", "failed_to_cooperate"]);
/** The review's reading of an answer (Method, "Targets"): a denial, an
 *  approval, neither (emergency only, pending, not in the unit), or unknown. */
export function classify(v: unknown): Cls {
  if (v === null || v === undefined) return "unknown";
  if (typeof v === "boolean") return v ? "eligible" : "not";
  if (typeof v === "number") return v > 0 ? "eligible" : "not";
  if (typeof v !== "string") return "eligible";
  if (NEITHER.has(v)) return "neither";
  if (DENY.has(v) || /^(ineligible|over_|not_|closed_)/.test(v)) return "not";
  return "eligible";
}

/* ---------- what a household states, and withholding ---------- */
type Rec = Record<string, unknown>;
/** Every fact the household states, in the order the case gives them, with
 *  who states it ("case" for a case or month fact). */
export function statedFacts(c: HouseholdCase): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (k: string, who: string) => { if (k === "determination_date") return; if (!out.has(k)) out.set(k, new Set()); out.get(k)!.add(who); };
  for (const k of Object.keys(c.case_facts ?? {})) add(k, "case");
  for (const [pid, p] of Object.entries(c.persons)) {
    for (const k of Object.keys(p.facts ?? {})) add(k, pid);
    for (const k of Object.keys(p.month_defaults ?? {})) add(k, pid);
    for (const m of Object.values(p.months ?? {})) for (const k of Object.keys(m)) add(k, pid);
    if (p.relationships !== undefined) add(REL, pid);
  }
  for (const m of Object.values(c.month_facts ?? {})) for (const k of Object.keys(m)) add(k, "case");
  if (c.relationships !== undefined) add(REL, "case");
  return out;
}
const keep = (rec: Rec | undefined, on: Set<string>): Rec | undefined =>
  rec && Object.fromEntries(Object.entries(rec).filter(([k]) => k === "determination_date" || on.has(k)));
/** The household with only the facts in `on` stated. The persons, the
 *  determination date and the case's figure overrides stay, as in the review. */
export function withhold(c: HouseholdCase, on: Set<string>): HouseholdCase {
  const persons: HouseholdCase["persons"] = {};
  for (const [pid, p] of Object.entries(c.persons)) {
    persons[pid] = {
      facts: keep(p.facts, on),
      month_defaults: keep(p.month_defaults, on),
      months: p.months && Object.fromEntries(Object.entries(p.months).map(([m, r]) => [m, keep(r, on)!])),
      relationships: on.has(REL) ? p.relationships : undefined,
    };
  }
  return {
    ...c, persons,
    case_facts: keep(c.case_facts, on),
    month_facts: c.month_facts && Object.fromEntries(Object.entries(c.month_facts).map(([m, r]) => [m, keep(r, on)!])),
    relationships: on.has(REL) ? c.relationships : undefined,
  };
}

/* ---------- deciding ---------- */
export interface Missing { identifier: string; person: string | null; month: string | null }
export interface Cell { v: unknown; cls: Cls; waiting: Missing[] }
export type State = Record<string, Record<string, Cell>>; // outcome -> person -> cell

export function allOutcomes(): string[] {
  const s = screening();
  return s ? Object.values(s.programs).flatMap((p) => p.outcomes).filter((o) => byIdent.has(o)) : [];
}
function decideOne(c: HouseholdCase, cd: ReturnType<typeof makeCase>, o: string, pid: string, read?: Set<string>): Cell {
  const it = E.item(o);
  const waiting: Missing[] = [];
  const seen = new Set<string>();
  let v: unknown = null;
  try {
    v = evaluate(E.index, cd, o, pid, it?.scope === "person-month" ? monthOf(c) : null, (e) => {
      if (read && (e.origin === "case" || e.origin === "default")) read.add(e.identifier);
      if (e.origin !== "missing") return;
      const k = e.identifier + "|" + e.person + "|" + e.month;
      if (!seen.has(k)) { seen.add(k); waiting.push({ identifier: e.identifier, person: e.person, month: e.month }); }
    });
  } catch { v = null; }
  if (v === undefined) v = null;
  return { v, cls: classify(v), waiting };
}
/** Every outcome of every family for every person. `read` collects, per
 *  outcome, the stated facts the evaluation reads. */
export function decide(c: HouseholdCase, read?: Map<string, Set<string>>): State {
  const cd = makeCase(E.index, caseToSpec(c));
  const out: State = {};
  for (const o of allOutcomes()) {
    out[o] = {};
    let r: Set<string> | undefined;
    if (read) { r = read.get(o) ?? new Set(); read.set(o, r); }
    for (const pid of Object.keys(c.persons)) out[o][pid] = decideOne(c, cd, o, pid, r);
  }
  return out;
}

/* ---------- which families read a fact ---------- */
let famReads: Map<string, Set<string>> | null = null;
export function familyReads(): Map<string, Set<string>> {
  if (famReads) return famReads;
  famReads = new Map();
  const s = screening();
  for (const [f, p] of Object.entries(s?.programs ?? {})) {
    const set = new Set<string>(p.outcomes);
    for (const o of p.outcomes) for (const u of upstream(o)) set.add(u);
    famReads.set(f, set);
  }
  return famReads;
}
/** The families whose outcomes read a fact (the household graph: all). */
export function familiesReading(key: string): string[] {
  return [...familyReads().entries()].filter(([, s]) => key === REL || s.has(key)).map(([f]) => f);
}

/* ---------- the interview ---------- */
export interface Question { key: string; step: number; who: string[] }
export interface Later { q: number; needed: boolean; why: string[] }
export interface Snap {
  asked: number[];                 // question indexes revealed so far, in order
  state: State;
  later: Later[];                  // every question not yet asked or passed: still needed now, or why not
  passed: Map<number, string[]>;   // questions the interview passed over, with why
  closed: Map<string, string>;     // family -> why it needs nothing more
}
export interface Sim {
  id: string; branch: boolean;
  step0: string[];                 // application data, revealed before any question
  questions: Question[];
  snaps: Snap[];                   // snaps[k]: after k questions
  full: State;                     // every fact stated
  stated: { units: number; keys: number };
  unread: string[];                // stated facts no outcome shown here reads
}

const valueOf = (c: HouseholdCase, pid: string, k: string): unknown => {
  const p = c.persons[pid];
  const m = monthOf(c);
  const r = (p.months?.[m] as Rec | undefined)?.[k];
  if (r !== undefined) return r;
  if ((p.facts as Rec | undefined)?.[k] !== undefined) return (p.facts as Rec)[k];
  return (p.month_defaults as Rec | undefined)?.[k];
};

/** The review's branch points that close a whole program, read only from
 *  answers already given (never from silence: decision 4). */
function familyGates(c: HouseholdCase, on: Set<string>): Map<string, string> {
  const out = new Map<string, string>();
  const pids = Object.keys(c.persons);
  const month = +monthOf(c).slice(5, 7);
  if (![11, 12, 1, 2, 3, 4].includes(month)) out.set("LEAP", "outside November 1 to April 30 the LEAP season is closed (9 CCR 2503-7 3.751.1)");
  if (!on.has("date_of_birth")) return out;
  const ages = pids.map((p) => ageOf(c, p));
  if (ages.some((a) => a === null)) return out;
  const youngest = Math.min(...(ages as number[]));
  // 3.111.F: a child under 13, or under 19 with additional care needs; a
  // teenager closes CCCAP only once the household has said "no" to that.
  const teens = pids.filter((p, i) => (ages[i] as number) >= 13 && (ages[i] as number) < 19);
  const noNeeds = on.has("cccap_child_has_additional_care_needs") && teens.every((p) => valueOf(c, p, "cccap_child_has_additional_care_needs") === false);
  if (youngest >= 13 && (!teens.length || noNeeds)) out.set("CCCAP", teens.length ? "no child under 13, and no child 13 to 18 with additional care needs (8 CCR 1403-1 3.111.F)" : "no child under 19 (8 CCR 1403-1 3.111.F)");
  const notPregnant = on.has("is_pregnant") && pids.every((p) => valueOf(c, p, "is_pregnant") === false);
  if (youngest >= 19 && notPregnant) {
    out.set("CHP+", "no one under 19 and everyone has said they are not pregnant (10 CCR 2505-3 110.1.A)");
    out.set("Colorado Works", "no child under 19 and everyone has said they are not pregnant (9 CCR 2503-6 3.601)");
  }
  return out;
}
const INCOME_DETAIL = ["is_tax_filer", "is_claimed_by_filer_outside_case", "is_required_to_file_tax_return", "magi_other_taxable_income",
  "pretax_deductions", "discharged_student_loan_debt", "foreign_earned_income_excluded", "expected_annual_income"];
/** Branch points that skip one fact for some families. */
function factGates(c: HouseholdCase, on: Set<string>): Array<{ keys: string[]; families: string[] | "all"; why: string }> {
  const out: Array<{ keys: string[]; families: string[] | "all"; why: string }> = [];
  const pids = Object.keys(c.persons);
  const yes = (p: string, k: string) => on.has(k) && valueOf(c, p, k) === true;
  const af = (p: string) => on.has("adult_financial_program_received") && ["oap", "oap_c", "and_so", "and_cs", "ab"].includes(String(valueOf(c, p, "adult_financial_program_received")));
  if (pids.every((p) => yes(p, "receives_ssi") || yes(p, "receives_tanf_cash") || af(p))) {
    out.push({ keys: ["holdings"], families: ["SNAP"], why: "everyone gets SSI, Colorado Works or Adult Financial: SNAP basic categorical eligibility skips the resource test (10 CCR 2506-1 4.408.A)" });
  }
  const none = (k: string) => on.has(k) && pids.every((p) => Array.isArray(valueOf(c, p, k)) && (valueOf(c, p, k) as unknown[]).length === 0);
  if (none("earnings") && none("receipts")) out.push({ keys: INCOME_DETAIL, families: "all", why: "no one has income (stated empty lists)" });
  return out;
}

function closedFamilies(c: HouseholdCase, on: Set<string>, state: State, full: State, branch: boolean): Map<string, string> {
  const s = screening()!;
  const out = new Map<string, string>();
  const gates = branch ? familyGates(c, on) : new Map<string, string>();
  for (const [f, p] of Object.entries(s.programs)) {
    const settled = p.outcomes.every((o) => !state[o] || Object.keys(c.persons).every((pid) => state[o][pid].v !== null || full[o][pid].v === null));
    if (settled) out.set(f, "settled for everyone");
    else if (gates.has(f)) out.set(f, "branch point: " + gates.get(f));
  }
  return out;
}
function needed(fams: string[], key: string, closed: Map<string, string>, gates: ReturnType<typeof factGates>): { needed: boolean; why: string[] } {
  if (!fams.length) return { needed: false, why: ["no outcome shown here reads it"] };
  const why: string[] = [];
  let open = false;
  for (const f of fams) {
    if (closed.has(f)) { why.push(`${f}: ${closed.get(f)}`); continue; }
    const g = gates.find((x) => x.keys.includes(key) && (x.families === "all" || x.families.includes(f)));
    if (g) { why.push(`${f}: branch point: ${g.why}`); continue; }
    open = true;
  }
  return { needed: open, why: [...new Set(why)] };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const cache = new Map<string, Promise<Sim>>();
/** Interviews a stored household in the review's order. `branch` applies the
 *  review's branch points as well as the engine's settled answers. */
export function simulate(c: HouseholdCase, branch: boolean, progress?: (done: number, of: number) => void): Promise<Sim> {
  const k = c.id + "|" + branch;
  let p = cache.get(k);
  if (!p) { p = run(c, branch, progress); cache.set(k, p); p.catch(() => cache.delete(k)); }
  return p;
}
async function run(c: HouseholdCase, branch: boolean, progress?: (done: number, of: number) => void): Promise<Sim> {
  const s = screening()!;
  const stated = statedFacts(c);
  const reads = new Map<string, Set<string>>();
  const full = decide(c, reads);
  const read = new Set([...reads.values()].flatMap((x) => [...x]));
  // The families that read each fact: by the graph, and by what the full
  // evaluation of this household actually read.
  const readers = (k: string) => {
    const f = new Set(familiesReading(k));
    for (const [fam, p] of Object.entries(s.programs)) if (p.outcomes.some((o) => reads.get(o)?.has(k))) f.add(fam);
    return [...f];
  };
  await tick();
  const order = s.cross_program_order;
  const step0 = (order.find((x) => x.step === 0)?.facts ?? []).filter((k) => stated.has(k));
  const seen = new Set<string>(step0);
  const questions: Question[] = [];
  for (const st of order) {
    if (st.step === 0) continue;
    for (const k of st.facts) if (stated.has(k) && !seen.has(k)) { seen.add(k); questions.push({ key: k, step: st.step, who: [...stated.get(k)!] }); }
  }
  // Then the facts of the review's per-program orders, program by program;
  // then the facts neither order names that the full evaluation reads, in the case's order.
  const PROGRAM_STEP = order.length, REST_STEP = order.length + 1;
  for (const p of Object.values(s.programs)) for (const e of p.order) {
    const k = e.fact_or_item;
    if (stated.has(k) && !seen.has(k)) { seen.add(k); questions.push({ key: k, step: PROGRAM_STEP, who: [...stated.get(k)!] }); }
  }
  for (const k of stated.keys()) if (!seen.has(k) && read.has(k)) { seen.add(k); questions.push({ key: k, step: REST_STEP, who: [...stated.get(k)!] }); }
  const famsOf = questions.map((x) => readers(x.key));
  const unread = [...stated.keys()].filter((k) => !seen.has(k));

  const on = new Set<string>(step0);
  const snaps: Snap[] = [];
  const passed = new Map<number, string[]>();
  const asked: number[] = [];
  let ptr = 0;
  let state = decide(withhold(c, on));
  for (;;) {
    const closed = closedFamilies(c, on, state, full, branch);
    const gates = branch ? factGates(c, on) : [];
    const later: Later[] = [];
    for (let i = ptr; i < questions.length; i++) { const n = needed(famsOf[i], questions[i].key, closed, gates); later.push({ q: i, needed: n.needed, why: n.why }); }
    snaps.push({ asked: asked.slice(), state, later, passed: new Map(passed), closed });
    const next = later.find((l) => l.needed);
    for (const l of later) { if (next && l.q >= next.q) break; passed.set(l.q, l.why); }
    if (!next) { for (const l of later) passed.set(l.q, l.why); snaps[snaps.length - 1].passed = new Map(passed); break; }
    ptr = next.q + 1;
    asked.push(next.q);
    on.add(questions[next.q].key);
    progress?.(ptr, questions.length);
    await tick();
    state = decide(withhold(c, on));
  }
  let units = 0;
  for (const w of stated.values()) units += w.size;
  return { id: c.id, branch, step0, questions, snaps, full, stated: { units, keys: stated.size }, unread };
}

/* ---------- after the interview ---------- */
/** The question after which a cell took its final value and kept it. */
export function settledAt(sim: Sim, o: string, pid: string): number | null {
  const last = sim.snaps.length - 1;
  if (sim.snaps[last].state[o]?.[pid]?.v == null) return null;
  let k = last;
  while (k > 0 && sim.snaps[k - 1].state[o][pid].cls === sim.snaps[last].state[o][pid].cls && sim.snaps[k - 1].state[o][pid].v !== null) k--;
  return k;
}
/** A settled class that a later answer turned into another: the engine read
 *  an unstated fact as an answer (the review's G0). */
export function flips(sim: Sim, o: string, pid: string, upTo: number): Array<{ at: number; from: Cls; to: Cls }> {
  const out: Array<{ at: number; from: Cls; to: Cls }> = [];
  let prev: Cls = "unknown";
  for (let k = 0; k <= upTo && k < sim.snaps.length; k++) {
    const cls = sim.snaps[k].state[o]?.[pid]?.cls ?? "unknown";
    if (prev !== "unknown" && cls !== "unknown" && cls !== prev) out.push({ at: k, from: prev, to: cls });
    if (cls !== "unknown") prev = cls;
  }
  return out;
}

/* ---------- every answer to what it waits on ---------- */
export interface Tried { result: "same" | "differs" | "open"; cls?: Cls; facts: Missing[]; blocked?: Missing; evals: number; leaves: number }
function setFact(c: HouseholdCase, m: Missing, v: unknown): HouseholdCase {
  const x: HouseholdCase = structuredClone(c);
  const it = byIdent.get(m.identifier)!;
  if (it.scope === "case") x.case_facts = { ...(x.case_facts ?? {}), [m.identifier]: v };
  else if (it.scope === "month") { const mm = m.month ?? monthOf(c); x.month_facts = { ...(x.month_facts ?? {}), [mm]: { ...(x.month_facts?.[mm] ?? {}), [m.identifier]: v } }; }
  else if (m.person && x.persons[m.person]) {
    const p = x.persons[m.person];
    if (it.scope === "person-month") { const mm = m.month ?? monthOf(c); p.months = { ...(p.months ?? {}), [mm]: { ...(p.months?.[mm] ?? {}), [m.identifier]: v } }; }
    else p.facts = { ...(p.facts ?? {}), [m.identifier]: v };
  }
  return x;
}
function valuesOf(identifier: string): unknown[] | null {
  const it = byIdent.get(identifier);
  if (!it || it.kind !== "supplied") return null;
  if (it.type === "yes/no") return [true, false];
  if (it.type === "one of" && it.options?.length) return it.options.slice();
  return null;
}
/** Tries every value of each yes/no or one-of fact the outcome waits on, as
 *  far as the budget allows, and says whether every answer gives the same
 *  class. The engine decides each try; nothing is assumed. */
export function tryEveryAnswer(c: HouseholdCase, o: string, pid: string, budget = 96): Tried {
  let evals = 0, leaves = 0;
  const facts: Missing[] = [];
  const classes = new Set<Cls>();
  let blocked: Missing | undefined;
  let over = false;
  const walk = (x: HouseholdCase) => {
    if (over || blocked) return;
    if (evals >= budget) { over = true; return; }
    evals++;
    const cd = makeCase(E.index, caseToSpec(x));
    const cell = decideOne(x, cd, o, pid);
    if (cell.v !== null) { leaves++; classes.add(cell.cls); return; }
    const m = cell.waiting.find((w) => valuesOf(w.identifier));
    if (!m) { blocked = cell.waiting[0] ?? { identifier: "", person: null, month: null }; return; }
    if (!facts.some((f) => f.identifier === m.identifier && f.person === m.person)) facts.push(m);
    for (const v of valuesOf(m.identifier)!) walk(setFact(x, m, v));
  };
  walk(c);
  if (blocked || over) return { result: "open", facts, blocked, evals, leaves };
  if (classes.size === 1) return { result: "same", cls: [...classes][0], facts, evals, leaves };
  return { result: "differs", facts, evals, leaves };
}
