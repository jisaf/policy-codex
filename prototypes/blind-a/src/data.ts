/* The data layer: the bundle built by scripts/build-data.ts, the codex engine
 * (src/engine, imported, never modified), and the indexes every screen reads. */
import { createEngine, type Engine } from "../../../src/engine/engine";
import { evaluate, makeCase, type CaseData } from "../../../src/engine/evaluate";
import { caseToSpec, runCase, type HouseholdCase, type CaseReport } from "../../../src/engine/cases";
import { explain, type TraceNode } from "../../../src/engine/explain";
import { versionInForce } from "../../../src/engine/versions";
import type { Item, VolumeMeta } from "../../../src/engine/types";

export type CItem = Item & { chapter: string; file: string };
export interface Source {
  id: string; title: string; doc: string | null; cite: string; url: string | null;
  verification: string | null; excerpt: string;
}
export interface Question {
  id: string; title: string; state: "open" | "partly" | "resolved";
  paragraphs: string[]; items: string[];
}
export interface Commit { sha: string; date: string; subject: string; items: string[]; added: string[]; other: string[] }
export interface Doc { id: string; title: string; kind?: string; citation?: string; url?: string; date?: string }
export interface AidCodeEntry {
  outcome: string;
  requires?: Record<string, string[]>;
  codes?: Record<string, { code: string; label: string; funding?: string }>;
  no_code?: Record<string, string>;
}
export interface Bundle {
  built: string; sha: string; meta: VolumeMeta; items: CItem[];
  english: Record<string, string[] | string>; usedBy: Record<string, string[]>;
  sources: Record<string, Source>; documents: Doc[]; questions: Question[];
  aidCodes: {
    status: string; notice: string;
    funding: { outcome: string; programs: string[] };
    participation: Record<string, { outcome: string; member: string[] }>;
    outcomes: AidCodeEntry[];
  };
  cases: HouseholdCase[]; personNotes: Record<string, Record<string, string>>;
  commits: Commit[];
  monthDiff: { month: string; base: string; baseDate: string; added: string[]; changed: Record<string, string[]> };
  approvals: Record<string, string[]>; caseReads: Record<string, string[]>;
}

export let D: Bundle;
export let E: Engine;
export const byId = new Map<string, CItem>();
export const byIdent = new Map<string, CItem>();
export const qById = new Map<string, Question>();
export const caseById = new Map<string, HouseholdCase>();
export const outcomeSet = new Set<string>();
export const programOfOutcome = new Map<string, string>();
export const unverifiedSources = new Set<string>();
/** Items each stored household's determinations read, as a Set per case. */
export const caseReadSets = new Map<string, Set<string>>();

export async function load(): Promise<void> {
  const res = await fetch("public/data/codex.json");
  D = await res.json();
  E = createEngine(D.items, D.meta);
  for (const it of D.items) { byId.set(it.id, it); byIdent.set(it.identifier, it); }
  for (const q of D.questions) qById.set(q.id, q);
  for (const c of D.cases) caseById.set(c.id, c);
  for (const p of D.meta.programs ?? []) for (const o of p.outcomes ?? []) {
    outcomeSet.add(o); programOfOutcome.set(o, p.id);
  }
  for (const s of Object.values(D.sources)) if (/^unverified/i.test(s.verification ?? "")) unverifiedSources.add(s.id);
  for (const [k, v] of Object.entries(D.caseReads)) caseReadSets.set(k, new Set(v));
}

// ------------------------------------------------------------ vocabulary
export const PROGRAM_LABEL: Record<string, string> = {
  All: "Shared", Medicaid: "Health First Colorado (Medicaid)", "CHP+": "CHP+", SNAP: "SNAP",
  ColoradoWorks: "Colorado Works", AdultFinancial: "Adult Financial", CCCAP: "Child care (CCCAP)",
  LEAP: "LEAP (heating)", SunBucks: "SUN Bucks",
};
export const PROGRAM_SHORT: Record<string, string> = {
  All: "Shared", Medicaid: "Medicaid", "CHP+": "CHP+", SNAP: "SNAP", ColoradoWorks: "Colorado Works",
  AdultFinancial: "Adult Financial", CCCAP: "CCCAP", LEAP: "LEAP", SunBucks: "SUN Bucks",
};
export const KIND_LABEL: Record<string, string> = {
  supplied: "a fact we are told", derived: "a rule", parameter: "a figure set by policy",
};
export const KIND_SHORT: Record<string, string> = { supplied: "Fact", derived: "Rule", parameter: "Figure" };
export const SCOPE_LABEL: Record<string, string> = {
  person: "per person", "person-month": "per person, per month", case: "per household",
  month: "per month", global: "for everyone",
};
export const PREFIX_PROGRAM: Array<[string, string]> = [
  ["ma_", "Medicaid"], ["chp_", "CHP+"], ["snap_", "SNAP"], ["cw_", "ColoradoWorks"],
  ["af_", "AdultFinancial"], ["cccap_", "CCCAP"], ["leap_", "LEAP"], ["sebt_", "SunBucks"],
];
export const ROLES = (): string[] => D.meta.approval_policy.roles;

// --------------------------------------------------------------- per item
export function item(idOrIdent: string): CItem | undefined {
  return byId.get(idOrIdent) ?? byIdent.get(idOrIdent);
}
export function status(it: Item): string { return it.status ?? "Draft"; }
export function approvalsOf(it: Item): string[] { return D.approvals[it.identifier] ?? []; }
export function englishOf(it: Item): string[] {
  const e = D.english[it.identifier];
  if (!e) return [];
  return Array.isArray(e) ? e : String(e).split("\n");
}
/** S-ids the item cites, its parameter versions included. */
export function citedSources(it: Item): string[] {
  const s = new Set(it.sources ?? []);
  for (const v of it.versions ?? []) if (v.source) s.add(v.source);
  return [...s];
}
export function directUnverified(it: Item): string[] {
  return citedSources(it).filter((s) => unverifiedSources.has(s));
}
let restsCache: Map<string, string[]> | null = null;
/** identifier -> the unverified-citing items it rests on (itself included). */
export function restsOnUnverified(it: Item): string[] {
  if (!restsCache) {
    restsCache = new Map();
    for (const u of D.items) {
      if (!directUnverified(u).length) continue;
      for (const down of [u.identifier, ...E.impact([u.identifier])]) {
        const l = restsCache.get(down) ?? [];
        l.push(u.identifier);
        restsCache.set(down, l);
      }
    }
  }
  return restsCache.get(it.identifier) ?? [];
}
export function openQuestionsOf(it: Item): Question[] {
  return (it.open ?? []).map((q) => qById.get(q)).filter((q): q is Question => !!q);
}
export function isOutcome(it: Item): boolean { return it.role === "outcome" || outcomeSet.has(it.identifier); }
export function noVersion(it: Item): boolean { return it.kind === "parameter" && Array.isArray(it.versions) && it.versions.length === 0; }

export function casesReading(ident: string): string[] {
  const out: string[] = [];
  for (const [k, s] of caseReadSets) if (s.has(ident)) out.push(k);
  return out;
}
/** Downstream items, and which of them are declared program outcomes. */
export function impactOf(idents: string[]): { all: string[]; outcomes: string[] } {
  const all = E.impact(idents);
  return { all, outcomes: all.filter((x) => outcomeSet.has(x)) };
}
/** Households whose determinations read any of these items or anything downstream. */
export function casesTouched(idents: string[]): string[] {
  const set = new Set(idents);
  const out: string[] = [];
  for (const [k, s] of caseReadSets) { for (const x of set) if (s.has(x)) { out.push(k); break; } }
  return out;
}

/** A question's owners: the policy roles of its items' programs and tags
 *  (not the upstream roles, or everyone would own everything). */
export function ownersOf(q: Question): string[] {
  const pol = D.meta.approval_policy;
  const out = new Set<string>();
  for (const id of q.items) {
    const it = byId.get(id);
    if (!it) continue;
    for (const r of pol.by_program[it.program] ?? []) if (it.program !== "All") out.add(r);
    for (const t of it.tags ?? []) for (const r of pol.by_tag[t] ?? []) out.add(r);
  }
  if (!out.size) out.add("Data steward");
  return [...out];
}
export function programsOfQuestion(q: Question): string[] {
  const s = new Set<string>();
  for (const id of q.items) { const it = byId.get(id); if (it) s.add(it.program); }
  return [...s];
}

// ------------------------------------------------------------- formatting
export function money(n: number): string {
  const r = Math.round(n * 100) / 100;
  return "$" + r.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(r) ? 0 : 2, maximumFractionDigits: 2 });
}
export function fmtValue(v: unknown, it?: Item | null): string {
  if (v === null || v === undefined) return "unknown";
  if (v === true) return "yes";
  if (v === false) return "no";
  const t = it?.type ?? "";
  if (typeof v === "number") {
    if (t === "money") return money(v);
    if (t === "rate") return `${v} (${Math.round(v * 10000) / 100}%)`;
    return Number.isInteger(v) ? v.toLocaleString("en-US") : String(Math.round(v * 1e6) / 1e6);
  }
  if (typeof v === "string") return v.replace(/_/g, " ");
  if (Array.isArray(v)) return v.length ? v.map((x) => fmtValue(x)).join(", ") : "none";
  if (typeof v === "object") return "table of " + Object.keys(v as object).length + " rows";
  return String(v);
}

// ---------------------------------------------------- running households
export function monthOf(date: string): string { return date.slice(0, 7); }

export function caseData(c: HouseholdCase, asOf?: string): CaseData {
  const spec = caseToSpec(c);
  if (asOf) spec.as_of = asOf;
  return makeCase(E.index, spec);
}
export function evalIn(eng: Engine, cd: CaseData, ident: string, person: string | null, month: string | null): unknown {
  try { return evaluate(eng.index, cd, ident, person, month); } catch { return null; }
}
export function explainIn(
  eng: Engine, c: HouseholdCase, ident: string, person: string | null, month: string | null, asOf?: string,
): TraceNode {
  const spec = caseToSpec(c);
  if (asOf) spec.as_of = asOf;
  return explain(eng.index, makeCase(eng.index, spec), ident, person, month);
}
const reportCache = new Map<string, CaseReport>();
export function report(c: HouseholdCase): CaseReport {
  let r = reportCache.get(c.id);
  if (!r) { r = runCase(E.index, c); reportCache.set(c.id, r); }
  return r;
}
export function personLabel(caseId: string, pid: string): string {
  const note = D.personNotes[caseId]?.[pid];
  if (!note) return pid;
  const s = note.replace(/^p\d+:\s*/, "").split(/[;(]/)[0].split(",").slice(0, 2).join(",").replace(/\.$/, "").trim();
  return s.length > 60 ? s.slice(0, 57) + "…" : s;
}

/** The aid codes a person holds in a stored household on its determination
 *  month (placeholder codes, aid-codes.yaml). */
export interface AidCode { code: string; label: string; outcome: string; value: unknown; program: string }
export function aidCodesFor(c: HouseholdCase, pid: string, eng: Engine = E, asOf?: string): AidCode[] {
  const cd = caseData(c, asOf);
  const month = monthOf(asOf ?? c.as_of);
  const val = (o: string) => evalIn(eng, cd, o, pid, month);
  const out: AidCode[] = [];
  const memo = new Map<string, unknown>();
  const get = (o: string) => { if (!memo.has(o)) memo.set(o, val(o)); return memo.get(o); };
  for (const e of D.aidCodes.outcomes) {
    const v = get(e.outcome);
    if (v === null || v === undefined) continue;
    const key = String(v);
    const code = e.codes?.[key];
    if (!code) continue;
    let ok = true;
    for (const [req, allowed] of Object.entries(e.requires ?? {})) {
      if (!allowed.includes(String(get(req)))) ok = false;
    }
    const program = programOfOutcome.get(e.outcome) ?? "";
    const part = D.aidCodes.participation[program];
    if (part && !part.member.includes(String(get(part.outcome)))) ok = false;
    if (ok) out.push({ code: code.code, label: code.label, outcome: e.outcome, value: v, program });
  }
  return out;
}

/** The person's value of each outcome the aid-code layer lists, on the
 *  household's determination month, leaving out "none" and "not applicable". */
export function outcomeValues(c: HouseholdCase, pid: string): Array<{ outcome: string; value: unknown }> {
  const cd = caseData(c);
  const month = monthOf(c.as_of);
  const out: Array<{ outcome: string; value: unknown }> = [];
  for (const e of D.aidCodes.outcomes) {
    const v = evalIn(E, cd, e.outcome, pid, month);
    if (v === null || v === false || v === "none" || v === "not_applicable" || v === "not_eligible") continue;
    out.push({ outcome: e.outcome, value: v });
  }
  return out;
}

/** Documents a stored case still needs: every declared "<element> verification
 *  is pending" outcome that is yes for a person, with the program's due date. */
export interface Needed { person: string; program: string; outcome: string; label: string; due: string | null; status: string | null }
export function documentsNeeded(c: HouseholdCase): Needed[] {
  const cd = caseData(c);
  const month = monthOf(c.as_of);
  const out: Needed[] = [];
  for (const p of D.meta.programs ?? []) {
    const outs = p.outcomes ?? [];
    const pending = outs.filter((o) => /_verification_is_pending$/.test(o));
    const dues = outs.filter((o) => /_due_date$/.test(o));
    const statusO = outs.find((o) => /verification_status$/.test(o) && !/person/.test(o));
    for (const pid of Object.keys(c.persons)) {
      const st = statusO ? evalIn(E, cd, statusO, pid, month) : null;
      if (st === "not_applicable" || st === "not_required") continue;
      let due: string | null = null;
      for (const d of dues) {
        const v = evalIn(E, cd, d, pid, month);
        if (typeof v === "string" && (!due || v < due)) due = v;
      }
      for (const o of pending) {
        if (evalIn(E, cd, o, pid, month) === true) {
          const it = byIdent.get(o);
          out.push({
            person: pid, program: p.id, outcome: o,
            label: (it?.name ?? o).replace(/^[^:]+:\s*/, "").replace(/ verification is pending$/i, "").replace(/ is pending$/i, ""),
            due, status: st == null ? null : String(st),
          });
        }
      }
    }
  }
  return out;
}

/** Parameter value in force on a date (or null). */
export function figureOn(it: Item, date: string): unknown {
  if (!Array.isArray(it.versions)) return it.value ?? null;
  const v = versionInForce(it, date);
  return v ? v.value : null;
}

// --------------------------------------------------------------- search
export interface Hit { kind: "item" | "question" | "source" | "case"; id: string; title: string; sub: string; score: number }
function norm(s: string): string { return s.toLowerCase().replace(/[^a-z0-9.()§ ]+/g, " "); }
/** Names people use for laws the codex cites by number. */
const SYNONYMS: Array<[RegExp, string]> = [
  [/\bh\.?\s*r\.?\s*1\b|\bobbba\b|one big beautiful bill( act)?/gi, "119-21"],
  [/\bfpl\b/gi, "poverty"],
  [/\bimmigrants?\b|\bimmigration\b|\baliens?\b/gi, "citizen"],
];
export function search(q: string, limit = 60, minMatch?: number): Hit[] {
  for (const [re, to] of SYNONYMS) q = q.replace(re, to);
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const hits: Hit[] = [];
  // Every word must match; if nothing matches every word, the best partial
  // matches are shown instead (most words matched first).
  const need = minMatch ?? terms.length;
  const scoreText = (fields: Array<[string, number]>): number => {
    let total = 0, matched = 0;
    for (const t of terms) {
      let best = 0;
      for (const [f, w] of fields) if (f.includes(t)) best = Math.max(best, w);
      if (best) matched++;
      total += best;
    }
    return matched >= need ? total + matched * 20 : 0;
  };
  const exact = q.trim().toUpperCase();
  for (const it of D.items) {
    let s = scoreText([[norm(it.name), 10], [it.identifier.replace(/_/g, " "), 6], [norm(it.meaning ?? ""), 2], [norm(it.statute_override ?? ""), 2]]);
    if (it.id === exact || it.identifier === q.trim()) s += 100;
    if (s) hits.push({ kind: "item", id: it.id, title: it.name, sub: `${KIND_SHORT[it.kind]} · ${PROGRAM_SHORT[it.program] ?? it.program}`, score: s + (isOutcome(it) ? 1 : 0) });
  }
  for (const qq of D.questions) {
    let s = scoreText([[norm(qq.title), 8], [norm(qq.paragraphs[0] ?? ""), 2]]);
    if (qq.id === exact) s += 100;
    if (s) hits.push({ kind: "question", id: qq.id, title: qq.title, sub: `Question · ${qq.state}`, score: s * 0.8 });
  }
  for (const so of Object.values(D.sources)) {
    let s = scoreText([[norm(so.cite), 7], [norm(so.title), 6]]);
    if (so.id === exact) s += 100;
    if (s) hits.push({ kind: "source", id: so.id, title: so.title, sub: `Source ${so.id} · ${so.cite}`, score: s * 0.6 });
  }
  for (const c of D.cases) {
    let s = scoreText([[norm(c.title), 6]]);
    if (c.id === exact) s += 100;
    if (s) hits.push({ kind: "case", id: c.id, title: c.title, sub: `Household ${c.id}`, score: s * 0.9 });
  }
  if (!hits.length && terms.length > 1 && need === terms.length) {
    // retry once, accepting items that match all but one word
    return search(q, limit, terms.length - 1);
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

/** Items that cite a source. */
export function itemsCiting(sid: string): CItem[] {
  return D.items.filter((it) => citedSources(it).includes(sid));
}
