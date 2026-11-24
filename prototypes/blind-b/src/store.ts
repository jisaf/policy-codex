/* Data, the engine, and everything derived from them. No UI here. */
import { signal, effect } from "@preact/signals";
import { createEngine, type Engine } from "../../../src/engine/engine";
import { makeCase, evaluate } from "../../../src/engine/evaluate";
import { caseToSpec, type HouseholdCase } from "../../../src/engine/cases";
import { explain, type TraceNode } from "../../../src/engine/explain";
import { paramInForce, versionInForce, inForce } from "../../../src/engine/versions";
import { valuesEqual } from "../../../src/engine/values";
import type { Item, VolumeMeta } from "../../../src/engine/types";

export type { Item, TraceNode, HouseholdCase };
export { paramInForce, versionInForce, inForce, valuesEqual };

export interface Source { id: string; title: string; doc: string | null; cite: string; url: string | null; quote: string; unverified?: string; notes?: string }
export interface Doc { id: string; title: string; kind: string; citation: string; url: string; file: string; date?: string }
export interface Question { id: string; title: string; state: "open" | "partly" | "resolved"; paras: string[]; items: string[] }
export type CItem = Item & { chapter: string };

interface Data {
  generated: string;
  chapters: Array<{ dir: string; title: string }>;
  items: CItem[]; meta: VolumeMeta; sources: Source[]; documents: Doc[];
  questions: Question[]; cases: HouseholdCase[]; aidCodes: any;
  touched: Record<string, number[]>;
  shareClass?: Record<string, string>;
  sourceIndex?: Record<string, string>;
  knownLimits?: KnownLimit[];
}
/** A known limit from docs/reviews/known-limits.md (scripts/build-data.ts). */
export interface KnownLimit { id: string; title: string; section: string; programs: string[]; closed: string | null; paras: string[] }

export let D: Data;
export let E: Engine;
export let byId: Map<string, CItem>;
export let byIdent: Map<string, CItem>;
export let srcById: Map<string, Source>;
export let docById: Map<string, Doc>;
export let qById: Map<string, Question>;
export let qByItem: Map<string, Question[]>;
export let citedBy: Map<string, CItem[]>;
export let outcomeProgram: Map<string, string>;
export let touchedBy: Map<string, string[]>;       // identifier -> case ids that read it
export let unverifiedDirect: Set<string>;          // identifiers citing an unverified excerpt
export let unverifiedRest: Set<string>;            // those plus everything downstream
export let TODAY: string;

export const PROGRAMS: Record<string, { label: string; short: string; hue: number }> = {
  Medicaid: { label: "Health First Colorado (Medicaid)", short: "Medicaid", hue: 212 },
  "CHP+": { label: "Child Health Plan Plus (CHP+)", short: "CHP+", hue: 262 },
  SNAP: { label: "SNAP (food assistance)", short: "SNAP", hue: 142 },
  ColoradoWorks: { label: "Colorado Works (TANF cash)", short: "Colorado Works", hue: 22 },
  AdultFinancial: { label: "Adult Financial (OAP, AND)", short: "Adult Financial", hue: 345 },
  CCCAP: { label: "Child care assistance (CCCAP)", short: "CCCAP", hue: 180 },
  LEAP: { label: "Energy assistance (LEAP)", short: "LEAP", hue: 45 },
  SunBucks: { label: "SUN Bucks (Summer EBT)", short: "SUN Bucks", hue: 85 },
  All: { label: "Shared by every program", short: "Shared", hue: 230 },
};
export const PROGRAM_ORDER = ["Medicaid", "CHP+", "SNAP", "ColoradoWorks", "AdultFinancial", "CCCAP", "LEAP", "SunBucks"];
export const KIND: Record<string, { one: string; many: string }> = {
  supplied: { one: "Fact we are told", many: "Facts we are told" },
  parameter: { one: "Figure", many: "Figures" },
  derived: { one: "Rule", many: "Rules" },
};
export const SCOPE: Record<string, string> = {
  person: "one answer per person",
  "person-month": "one answer per person, each month",
  case: "one answer per household",
  month: "one answer per month, for everyone",
  global: "the same for everyone",
};

export async function load(): Promise<void> {
  D = await (await fetch("./data.json")).json();
  // The bundle may come in parts (scripts/build-data.ts): merge them in.
  for (const part of (D as unknown as { parts?: string[] }).parts ?? []) Object.assign(D, await (await fetch("./" + part)).json());
  E = createEngine(D.items, D.meta);
  TODAY = D.generated;
  byId = new Map(D.items.map((i) => [i.id, i]));
  byIdent = new Map(D.items.map((i) => [i.identifier, i]));
  srcById = new Map(D.sources.map((s) => [s.id, s]));
  docById = new Map(D.documents.map((d) => [d.id, d]));
  qById = new Map(D.questions.map((q) => [q.id, q]));
  qByItem = new Map();
  const addQ = (id: string, q: Question) => {
    const l = qByItem.get(id) ?? [];
    if (!l.includes(q)) l.push(q);
    qByItem.set(id, l);
  };
  for (const q of D.questions) for (const id of q.items) addQ(id, q);
  for (const it of D.items) for (const o of it.open ?? []) { const q = qById.get(o); if (q) { addQ(it.id, q); if (!q.items.includes(it.id)) q.items.push(it.id); } }
  citedBy = new Map();
  for (const it of D.items) {
    for (const s of itemSources(it)) {
      const l = citedBy.get(s) ?? [];
      l.push(it);
      citedBy.set(s, l);
    }
  }
  outcomeProgram = new Map();
  for (const p of D.meta.programs ?? []) for (const o of p.outcomes ?? []) outcomeProgram.set(o, p.id);
  touchedBy = new Map();
  for (const [cid, idxs] of Object.entries(D.touched)) {
    for (const k of idxs) {
      const ident = D.items[k].identifier;
      const l = touchedBy.get(ident) ?? [];
      l.push(cid);
      touchedBy.set(ident, l);
    }
  }
  unverifiedDirect = new Set();
  for (const s of D.sources) if (s.unverified) for (const it of citedBy.get(s.id) ?? []) unverifiedDirect.add(it.identifier);
  unverifiedRest = new Set([...unverifiedDirect, ...E.impact([...unverifiedDirect])]);
  restore();
}

export function itemSources(it: Item): string[] {
  const s = new Set<string>(it.sources ?? []);
  for (const v of it.versions ?? []) if (v.source) s.add(v.source);
  return [...s];
}

/* ---------- graph helpers ---------- */

const upCache = new Map<string, string[]>();
/** Everything an item reads, directly or through other rules. */
export function upstream(identifier: string): string[] {
  const hit = upCache.get(identifier);
  if (hit) return hit;
  const seen = new Set<string>();
  const stack = [...E.usesOfItem(identifier)];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const d of E.usesOfItem(id)) stack.push(d);
  }
  const out = [...seen];
  upCache.set(identifier, out);
  return out;
}
const downCache = new Map<string, string[]>();
export function downstream(identifier: string): string[] {
  let hit = downCache.get(identifier);
  if (!hit) { hit = E.impact([identifier]); downCache.set(identifier, hit); }
  return hit;
}
export function outcomesReached(identifiers: string[]): CItem[] {
  const set = new Set<string>();
  for (const id of identifiers) { if (outcomeProgram.has(id)) set.add(id); for (const d of downstream(id)) if (outcomeProgram.has(d)) set.add(d); }
  return [...set].map((i) => byIdent.get(i)!).filter(Boolean);
}
export function householdsReading(identifiers: string[]): string[] {
  const set = new Set<string>();
  for (const id of identifiers) for (const c of touchedBy.get(id) ?? []) set.add(c);
  return D.cases.map((c) => c.id).filter((c) => set.has(c));
}

/* ---------- approval ---------- */

export interface RoleReason { role: string; why: string }
const roleCache = new Map<string, RoleReason[]>();
export function requiredRoles(it: Item): RoleReason[] {
  const hit = roleCache.get(it.id);
  if (hit) return hit;
  const pol = D.meta.approval_policy;
  const out: RoleReason[] = [];
  const add = (role: string, why: string) => { if (!out.some((r) => r.role === role)) out.push({ role, why }); };
  for (const r of pol.by_program?.[it.program] ?? []) add(r, it.program === "All" ? "shared by every program" : `owns ${PROGRAMS[it.program]?.short ?? it.program}`);
  for (const r of pol.by_kind?.[it.kind] ?? []) add(r, "it is a fact supplied from outside");
  for (const t of it.tags ?? []) for (const r of pol.by_tag?.[t] ?? []) add(r, `tagged “${tagLabel(t)}”`);
  for (const r of E.approvals(it)) {
    if (out.some((x) => x.role === r)) continue;
    const progs = (D.meta.programs ?? []).filter((p) => p.id !== it.program && (pol.by_program?.[p.id] ?? []).includes(r) && outcomesReached([it.identifier]).some((o) => outcomeProgram.get(o.identifier) === p.id));
    add(r, `a ${progs.map((p) => PROGRAMS[p.id]?.short ?? p.id).join(", ") || "program"} outcome reads it`);
  }
  roleCache.set(it.id, out);
  return out;
}
export function tagLabel(t: string): string {
  for (const x of D.meta.tags ?? []) if (typeof x !== "string" && x.id === t) return x.label ?? t;
  return t.replace(/_/g, " ");
}
export function openQuestions(it: Item): Question[] {
  return (qByItem.get(it.id) ?? []).filter((q) => q.state !== "resolved");
}
/** The "Class:" and "Owner:" lines a question states, if any. */
export function questionClass(q: Question): string | null {
  for (const p of q.paras) { const m = /^Class:\s*(.+)$/m.exec(p); if (m) return m[1].trim().replace(/[.;]\s*$/, ""); }
  return null;
}
/** The roles a question names on its "Owner:" line, in the order named. */
export function statedOwners(q: Question): string[] {
  for (const p of q.paras) {
    const m = /^Owner:\s*(.+)$/m.exec(p);
    if (!m) continue;
    return D.meta.approval_policy.roles.map((r) => [r, m[1].indexOf(r)] as const).filter(([, i]) => i >= 0).sort((a, b) => a[1] - b[1]).map(([r]) => r);
  }
  return [];
}
const ownerCache = new Map<string, string[]>();
/** The roles that own a question: those its "Owner:" line names; for a
 *  question with no such line, those that must approve the items it touches. */
export function questionOwners(q: Question): string[] {
  let hit = ownerCache.get(q.id);
  if (!hit) { const s = statedOwners(q); hit = s.length ? s : derivedOwners(q); ownerCache.set(q.id, hit); }
  return hit;
}
function derivedOwners(q: Question): string[] {
  const count = new Map<string, number>();
  for (const id of q.items) {
    const it = byId.get(id);
    if (!it) continue;
    const pol = D.meta.approval_policy;
    const roles = new Set<string>(it.program === "All" ? [] : pol.by_program?.[it.program] ?? []);
    for (const t of it.tags ?? []) for (const r of pol.by_tag?.[t] ?? []) roles.add(r);
    for (const r of pol.by_kind?.[it.kind] ?? []) roles.add(r);
    if (it.program === "All") for (const o of outcomesReached([it.identifier])) for (const r of pol.by_program?.[outcomeProgram.get(o.identifier)!] ?? []) roles.add(r);
    for (const r of roles) count.set(r, (count.get(r) ?? 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
}
/** The roles that own a known limit: the owners of the programs it is filed under. */
export function limitOwners(k: KnownLimit): string[] {
  const s = new Set<string>();
  for (const p of k.programs) for (const r of D.meta.approval_policy.by_program?.[p] ?? []) s.add(r);
  return [...s];
}

/* ---------- effort: the handoff's rule of thumb (docs/handoff-2026-11-24.md, section 8) ---------- */
export type Effort = "easy" | "medium" | "hard";
export const EFFORT: Record<Effort, { label: string; help: string }> = {
  easy: { label: "Easy", help: "a plain fact, a short rule (15 terms or fewer) or a single dated figure" },
  medium: { label: "Medium", help: "neither easy nor hard" },
  hard: { label: "Hard", help: "a program outcome, household or unit composition, a long rule (more than 80 terms) or a grey shared fact" },
};
function terms(x: unknown): number {
  if (Array.isArray(x)) return x.reduce((n: number, y) => n + terms(y), 0);
  if (x && typeof x === "object") return Object.values(x).reduce((n: number, y) => n + terms(y), 0);
  return 1;
}
/** A rule of thumb, not a judgement on the item. */
export function effortOf(it: Item): Effort {
  const composition = (it.tags ?? []).includes("household");
  if (it.kind === "supplied") return D.shareClass?.[it.identifier] === "grey" || composition ? "hard" : "easy";
  if (it.kind === "parameter") {
    const single = (it.versions?.length ?? 0) <= 1;
    const v = it.versions?.[0]?.value ?? it.value;
    return single && (v === null || typeof v !== "object") ? "easy" : "medium";
  }
  const n = terms(it.derived);
  if (outcomeProgram.has(it.identifier) || composition || n > 80 || D.shareClass?.[it.identifier] === "grey") return "hard";
  return n <= 15 ? "easy" : "medium";
}

export function questionPrograms(q: Question): string[] {
  const s = new Set<string>();
  for (const id of q.items) { const it = byId.get(id); if (it && it.program !== "All") s.add(it.program); }
  return PROGRAM_ORDER.filter((p) => s.has(p));
}

/* ---------- formatting ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(d: string | undefined | null): string {
  if (!d) return "";
  if (d === "present") return "today";
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(d);
  if (!m) return d;
  return m[3] ? `${MONTHS[+m[2] - 1]} ${+m[3]}, ${m[1]}` : `${MONTHS[+m[2] - 1]} ${m[1]}`;
}
export function money(n: number): string {
  const r = Math.round(n * 100) / 100;
  return (r < 0 ? "−$" : "$") + Math.abs(r).toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(r) ? 0 : 2, maximumFractionDigits: 2 });
}
export function humanize(s: string): string {
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const optionLabel = new Map<string, string>();
function optLabel(identifier: string, v: string): string | null {
  if (!optionLabel.size) {
    for (const o of D.aidCodes.outcomes ?? []) {
      for (const [k, c] of Object.entries<any>(o.codes ?? {})) optionLabel.set(o.outcome + "|" + k, c.label);
      for (const [k, why] of Object.entries<string>(o.no_code ?? {})) {
        const w = String(why).replace(/\.$/, ""), h = humanize(k);
        optionLabel.set(o.outcome + "|" + k, w.toLowerCase().startsWith(h.toLowerCase().slice(0, 8)) || /^(no|yes|none)$/.test(k) || /^(Not |No )/.test(w) ? w : `${h} (${w.charAt(0).toLowerCase() + w.slice(1)})`);
      }
    }
  }
  return optionLabel.get(identifier + "|" + v) ?? null;
}
/** A value in words. `people` names persons of a household when given. */
export function fmtVal(v: unknown, it?: Item | null, people?: (p: string) => string, long = false): string {
  if (v === null || v === undefined) return "cannot determine";
  if (v === true) return "yes";
  if (v === false) return "no";
  const type = it?.type ?? "";
  if (typeof v === "number") {
    if (type === "money") return money(v);
    if (type === "rate") return (Math.round(v * 10000) / 100).toLocaleString("en-US") + "%";
    return (Math.round(v * 100) / 100).toLocaleString("en-US");
  }
  if (Array.isArray(v)) {
    if (!v.length) return "none";
    return v.map((x) => (typeof x === "string" && people && /^p\d+$/.test(x) ? people(x) : fmtVal(x, null, people))).join(", ");
  }
  if (typeof v === "object") return `table (${Object.keys(v as object).length} rows)`;
  const s = String(v);
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(s)) return fmtDate(s);
  if (people && /^p\d+$/.test(s)) return people(s);
  if (it && long) { const l = optLabel(it.identifier, s); if (l) return l; }
  if (/^[a-z0-9]+(_[a-z0-9]+)*$/.test(s) && type !== "text") return humanize(s);
  return s;
}
export function shortName(it: Item): string {
  return it.name.replace(/^[A-Za-z+ ]{2,22}: /, "");
}
export function firstSentence(s: string | undefined, max = 220): string {
  if (!s) return "";
  const m = /^(.*?[.;])(\s|$)/.exec(s);
  let t = m && m[1].length > 40 ? m[1] : s;
  if (t.length > max) t = t.slice(0, max).replace(/\s+\S*$/, "") + "…";
  return t;
}
export function ruleLines(it: Item, eng: Engine = E): string[] {
  if (it.kind !== "derived" || it.derived == null) return [];
  try { return eng.block(it.derived); } catch (e) { return ["(cannot show this rule: " + (e as Error).message + ")"]; }
}
export function valueOn(it: Item, date: string): unknown { return paramInForce(it, date); }

/* ---------- households ---------- */

export function caseById(id: string): HouseholdCase | undefined { return D.cases.find((c) => c.id === id); }
export function monthOf(c: HouseholdCase): string { return c.as_of.slice(0, 7); }
function addMonths(m: string, n: number): string {
  const [y, mo] = m.split("-").map(Number);
  const t = y * 12 + (mo - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}
/** The same household determined on another date: per-month facts move with
 *  the date, so "this month's wages" stay this month's wages. */
export function caseAsOf(c: HouseholdCase, date: string): HouseholdCase {
  if (date === c.as_of) return c;
  const [y1, m1] = c.as_of.split("-").map(Number), [y2, m2] = date.split("-").map(Number);
  const delta = (y2 - y1) * 12 + (m2 - m1);
  const shift = (rec: Record<string, any> | undefined) => rec && Object.fromEntries(Object.entries(rec).map(([m, v]) => [addMonths(m, delta), v]));
  const persons: any = {};
  for (const [pid, p] of Object.entries(c.persons)) persons[pid] = { ...p, months: shift(p.months) };
  return { ...c, as_of: date, persons, month_facts: shift(c.month_facts) };
}
export function ageOf(c: HouseholdCase, pid: string): number | null {
  const dob = (c.persons[pid]?.facts as any)?.date_of_birth;
  if (typeof dob !== "string") return null;
  let a = +c.as_of.slice(0, 4) - +dob.slice(0, 4);
  if (c.as_of.slice(5) < dob.slice(5)) a--;
  return a;
}
export function personLabel(c: HouseholdCase, pid: string, long = false): string {
  const n = pid.replace(/^p/, "");
  const a = ageOf(c, pid);
  if (a === null) return `Person ${n}`;
  return long ? `Person ${n}, age ${a}` : `Person ${n} (${a})`;
}
export function evalOne(c: HouseholdCase, identifier: string, pid: string, eng: Engine = E): unknown {
  const it = eng.item(identifier);
  if (!it) return null;
  const cd = (c as any).__cd?.eng === eng ? (c as any).__cd.cd : makeCase(eng.index, caseToSpec(c));
  Object.defineProperty(c, "__cd", { value: { eng, cd }, enumerable: false, writable: true, configurable: true });
  try { return evaluate(eng.index, cd, identifier, pid, it.scope === "person-month" ? monthOf(c) : null); } catch { return null; }
}
export function traceOne(c: HouseholdCase, identifier: string, pid: string, eng: Engine = E): TraceNode {
  const it = eng.item(identifier);
  return explain(eng.index, makeCase(eng.index, caseToSpec(c)), identifier, pid, it?.scope === "person-month" ? monthOf(c) : null);
}
export interface Expectation { person: string; identifier: string; expect: unknown; got: unknown; ok: boolean }
export function checkCase(c: HouseholdCase, eng: Engine = E): { passed: number; failed: number; results: any[] } {
  return eng.runCase(c) as any;
}

export interface AidCode { code: string; label: string; outcome: string; funding?: string }
/** A person's placeholder aid codes for one program, per aid-codes.yaml. */
export function aidCodesFor(c: HouseholdCase, pid: string, program: string, eng: Engine = E): AidCode[] {
  const out: AidCode[] = [];
  const part = D.aidCodes.participation?.[program];
  if (part) {
    const v = evalOne(c, part.outcome, pid, eng);
    if (!part.member.includes(v)) return out;
  }
  for (const o of D.aidCodes.outcomes ?? []) {
    if (outcomeProgram.get(o.outcome) !== program) continue;
    let v = evalOne(c, o.outcome, pid, eng);
    if (v === true) v = "yes"; if (v === false) v = "no";
    const code = o.codes?.[v as string];
    if (!code) continue;
    let ok = true;
    for (const [req, allowed] of Object.entries<string[]>(o.requires ?? {})) if (!allowed.includes(evalOne(c, req, pid, eng) as string)) ok = false;
    if (ok) out.push({ code: code.code, label: code.label, outcome: o.outcome, funding: code.funding });
  }
  return out;
}
export function programOutcomes(program: string, headline = true): CItem[] {
  const p = (D.meta.programs ?? []).find((x) => x.id === program);
  return (p?.outcomes ?? []).map((o) => byIdent.get(o)!).filter((it) => it && (!headline || !isVerificationOutcome(it)));
}
export function isVerificationOutcome(it: Item): boolean {
  return /verification|_due_date$|_end_date$|pending/.test(it.identifier);
}

export interface Diff { caseId: string; person: string; identifier: string; before: unknown; after: unknown }
/** Re-decides stored households under two engines and lists the outcomes that differ. */
export function compareEngines(before: Engine, after: Engine, identifiers: string[], caseIds?: string[]): Diff[] {
  const out: Diff[] = [];
  for (const c of D.cases) {
    if (caseIds && !caseIds.includes(c.id)) continue;
    const a = makeCase(before.index, caseToSpec(c)), b = makeCase(after.index, caseToSpec(c));
    for (const pid of Object.keys(c.persons)) {
      for (const id of identifiers) {
        const it = before.item(id) ?? after.item(id);
        if (!it) continue;
        const m = it.scope === "person-month" ? monthOf(c) : null;
        let x: unknown = null, y: unknown = null;
        try { x = evaluate(before.index, a, id, pid, m); } catch { /* unknown */ }
        try { y = evaluate(after.index, b, id, pid, m); } catch { /* unknown */ }
        if (JSON.stringify(x) !== JSON.stringify(y)) out.push({ caseId: c.id, person: pid, identifier: id, before: x, after: y });
      }
    }
  }
  return out;
}

/* ---------- what took effect ---------- */

export interface Took { item: CItem; date: string; what: "figure" | "rule"; before?: unknown; after?: unknown; first?: boolean }
export function tookEffect(month: string): Took[] {
  const out: Took[] = [];
  for (const it of D.items) {
    const vs = it.versions ?? [];
    vs.forEach((v, i) => {
      if (v.from.slice(0, 7) !== month) return;
      const prev = vs.filter((p) => p.from < v.from).sort((a, b) => (a.from < b.from ? 1 : -1))[0];
      out.push({ item: it, date: v.from, what: "figure", before: prev?.value, after: v.value, first: !prev && i === 0 });
    });
    if (it.effective?.from?.slice(0, 7) === month) out.push({ item: it, date: it.effective.from, what: "rule" });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.item.name.localeCompare(b.item.name)));
}
/** The codex as it would be had a dated version never been issued. */
export function withoutVersion(it: CItem, from: string): CItem {
  const vs = (it.versions ?? []).slice().sort((a, b) => (a.from < b.from ? -1 : 1));
  const k = vs.findIndex((v) => v.from === from);
  if (k < 0) return it;
  const next = vs.filter((_, i) => i !== k).map((v) => ({ ...v }));
  if (k > 0) { if (vs[k].to === undefined) delete next[k - 1].to; else next[k - 1].to = vs[k].to; }
  return { ...it, versions: next };
}

/* ---------- viewer state: role and the proposal tray ---------- */

export interface Edit { id: string; reason: string; item: CItem }
export interface Note { id: string; kind: "answer" | "opinion" | "question"; target: string; role: string; text: string; authority?: string; effect?: string; date: string }
export const role = signal<string>("Medicaid policy owner");
export const edits = signal<Edit[]>([]);
export const signs = signal<Array<{ id: string; role: string }>>([]);
export const notes = signal<Note[]>([]);
export const sent = signal<string | null>(null);
const KEY = "blind-b-state-1";
function restore() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s) { role.value = s.role ?? role.value; edits.value = s.edits ?? []; signs.value = s.signs ?? []; notes.value = s.notes ?? []; }
  } catch { /* a fresh tray */ }
  effect(() => {
    const s = JSON.stringify({ role: role.value, edits: edits.value, signs: signs.value, notes: notes.value });
    try { localStorage.setItem(KEY, s); } catch { /* private mode */ }
  });
}
export function trayCount(): number { return edits.value.length + signs.value.length + notes.value.length; }
export function isSigned(id: string, r: string): boolean {
  const it = byId.get(id);
  return !!it?.approval?.some((a) => a.role === r);
}
export function isPendingSign(id: string, r: string): boolean { return signs.value.some((s) => s.id === id && s.role === r); }
export function toggleSign(ids: string[], r: string, on: boolean) {
  const rest = signs.value.filter((s) => !(s.role === r && ids.includes(s.id)));
  signs.value = on ? rest.concat(ids.map((id) => ({ id, role: r }))) : rest;
}
export function saveEdit(e: Edit) { edits.value = edits.value.filter((x) => x.id !== e.id).concat([e]); sent.value = null; }
export function dropEdit(id: string) { edits.value = edits.value.filter((x) => x.id !== id); }
export function addNote(n: Omit<Note, "id" | "date">) { notes.value = notes.value.concat([{ ...n, id: "N" + Date.now(), date: TODAY }]); sent.value = null; }
export function dropNote(id: string) { notes.value = notes.value.filter((x) => x.id !== id); }
export function draftEngine(): Engine { return edits.value.length ? E.withDrafts(edits.value.map((e) => e.item)) : E; }
export function signBlockers(it: Item): string[] {
  const out: string[] = [];
  if (unverifiedRest.has(it.identifier)) out.push(unverifiedDirect.has(it.identifier) ? "It takes a figure from a source that could not be verified." : "It rests on a figure from a source that could not be verified.");
  return out;
}

/* ---------- item source files (Definition as code) ---------- */
const sourceChunks = new Map<string, Promise<Record<string, { file: string; text: string }>>>();
/** The item's file exactly as stored in the volume, fetched on demand. */
export async function itemSource(id: string): Promise<{ file: string; text: string } | null> {
  const chunk = D.sourceIndex?.[id];
  if (!chunk) return null;
  if (!sourceChunks.has(chunk)) sourceChunks.set(chunk, fetch("./" + chunk).then((r) => r.json()));
  return (await sourceChunks.get(chunk)!)[id] ?? null;
}
