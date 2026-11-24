/* The proposal tray: everything a user has queued (sign-offs, answers,
 * edits, new questions), applied to the codex for before/after, and turned
 * into the pull request the stewards' bot would open. Kept in this browser
 * only (localStorage): a prototype has no server. */
import type { Engine } from "../../../src/engine/engine";
import type { Item } from "../../../src/engine/types";
import { runCase } from "../../../src/engine/cases";
import { D, E, byId, fmtValue, byIdent, ownersOf, qById, type CItem } from "./data";

export type Change =
  | { type: "signoff"; itemId: string; role: string; by: string; date: string }
  | { type: "answer"; qid: string; kind: "answer" | "legal_opinion"; text: string; by: string; date: string; resolves: boolean }
  | { type: "edit"; itemId: string; after: Item; summary: string; by: string; date: string }
  | { type: "ask"; itemIds: string[]; text: string; by: string; date: string };

export interface Sent { ref: string; at: string; title: string; name: string; changes: Change[] }

const KEY = "blind-a.proposal";
const SENT = "blind-a.sent";
const ME = "blind-a.me";

function read<T>(k: string, d: T): T {
  try { const s = localStorage.getItem(k); return s ? JSON.parse(s) as T : d; } catch { return d; }
}
function write(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window: the tray lives for this page only */ }
}
let tray: Change[] = [];
let sent: Sent[] = [];
export let me = { role: "Medicaid policy owner", name: "", email: "" };
export function initState(): void {
  tray = read<Change[]>(KEY, []);
  sent = read<Sent[]>(SENT, []);
  me = { ...me, ...read(ME, {}) };
}
export function setMe(p: Partial<typeof me>): void { me = { ...me, ...p }; write(ME, me); }
export function changes(): Change[] { return tray; }
export function sentList(): Sent[] { return sent; }
export function add(c: Change): void {
  // One edit per item: a second edit replaces the first.
  if (c.type === "edit") tray = tray.filter((x) => !(x.type === "edit" && x.itemId === c.itemId));
  if (c.type === "signoff") tray = tray.filter((x) => !(x.type === "signoff" && x.itemId === c.itemId && x.role === c.role));
  tray.push(c);
  write(KEY, tray);
}
export function remove(i: number): void { tray.splice(i, 1); write(KEY, tray); }
export function clear(): void { tray = []; write(KEY, tray); }
export function send(title: string): Sent {
  const s: Sent = { ref: "P-" + String(1000 + sent.length + 1), at: new Date().toISOString().slice(0, 10), title, name: me.name, changes: tray };
  sent = [s, ...sent];
  write(SENT, sent);
  clear();
  return s;
}
export function today(): string { return new Date().toISOString().slice(0, 10); }
export function signedInTray(itemId: string, role: string): boolean {
  return tray.some((c) => c.type === "signoff" && c.itemId === itemId && c.role === role);
}

/** The codex with the tray's edits applied. */
export function editedItems(list: Change[] = tray): Item[] {
  return list.filter((c): c is Extract<Change, { type: "edit" }> => c.type === "edit").map((c) => c.after);
}
export function engineWith(edits: Item[]): Engine { return edits.length ? E.withDrafts(edits) : E; }

export interface Diff { caseId: string; person: string; identifier: string; month: string | null; before: unknown; after: unknown }
/** Every stored household expectation whose computed value differs between
 *  the codex as it is and the codex with these edits. */
export function beforeAfter(edits: Item[], caseIds?: string[]): { diffs: Diff[]; checked: number; ms: number } {
  const t = performance.now();
  const after = engineWith(edits);
  const diffs: Diff[] = [];
  let checked = 0;
  for (const c of D.cases) {
    if (caseIds && !caseIds.includes(c.id)) continue;
    const a = runCase(E.index, c);
    const b = runCase(after.index, c);
    const bk = new Map(b.results.map((r) => [`${r.person}|${r.identifier}|${r.month}`, r]));
    for (const r of a.results) {
      checked++;
      const r2 = bk.get(`${r.person}|${r.identifier}|${r.month}`);
      if (!r2) continue;
      if (JSON.stringify(r.got) !== JSON.stringify(r2.got)) {
        diffs.push({ caseId: c.id, person: r.person, identifier: r.identifier, month: r.month, before: r.got, after: r2.got });
      }
    }
  }
  return { diffs, checked, ms: performance.now() - t };
}

/** Who must approve the tray: the policy's roles for each edited item
 *  (upstream-of-outcome owners included), the owners of each answered
 *  question, Legal for a legal opinion. Sign-offs need no further approval
 *  beyond the steward who merges them. */
export function approversFor(list: Change[] = tray): Map<string, string[]> {
  const out = new Map<string, Set<string>>();
  const addR = (r: string, why: string) => { if (!out.has(r)) out.set(r, new Set()); out.get(r)!.add(why); };
  const edits = editedItems(list);
  const eng = engineWith(edits);
  for (const c of list) {
    if (c.type === "edit") {
      const it = eng.item(c.after.identifier) ?? c.after;
      for (const r of eng.approvals(it)) addR(r, `${c.after.id} ${c.after.name}`);
    } else if (c.type === "answer") {
      const q = qById.get(c.qid);
      if (q) for (const r of ownersOf(q)) addR(r, `${q.id} (question owner)`);
      if (c.kind === "legal_opinion") addR("Legal", `${c.qid} (legal opinion)`);
    } else if (c.type === "ask") {
      for (const id of c.itemIds) { const it = byId.get(id); if (it) for (const r of E.approvals(it)) addR(r, `${id} (new question)`); }
    }
  }
  if (list.length) addR("Data steward", "merges every change to the codex (steward review lane)");
  return new Map([...out].map(([k, v]) => [k, [...v]]));
}

function fieldDiff(before: Item, after: Item): string[] {
  const out: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (k === "chapter" || k === "file") continue;
    const a = JSON.stringify((before as unknown as Record<string, unknown>)[k] ?? null);
    const b = JSON.stringify((after as unknown as Record<string, unknown>)[k] ?? null);
    if (a !== b) out.push(k);
  }
  return out;
}

/** The pull request the stewards' bot would open for this tray. */
export function prText(title: string, list: Change[] = tray): { title: string; body: string; files: string[] } {
  const files = new Set<string>();
  const L: string[] = [];
  L.push(`Proposed in Rulebook by ${me.name || "(name)"}${me.email ? ` <${me.email}>` : ""}, working as ${me.role}.`, "");
  const so = list.filter((c) => c.type === "signoff") as Array<Extract<Change, { type: "signoff" }>>;
  if (so.length) {
    L.push(`## Sign-offs (${so.length})`, "", "Adds an `approval` row on each item; the item's `status` becomes Approved only when every required role has signed.", "");
    for (const c of so) {
      const it = byId.get(c.itemId) as CItem | undefined;
      if (it) files.add(it.file);
      L.push(`- ${c.itemId} ${it?.name ?? ""}: {role: ${c.role}, by: ${c.by}, date: ${c.date}, commit: ${D.sha}}`);
    }
    L.push("");
  }
  const ed = list.filter((c) => c.type === "edit") as Array<Extract<Change, { type: "edit" }>>;
  if (ed.length) {
    L.push(`## Edits (${ed.length})`, "");
    for (const c of ed) {
      const it = byId.get(c.itemId) as CItem | undefined;
      if (it) files.add(it.file);
      L.push(`- ${c.itemId} ${it?.name ?? ""}: ${c.summary} (fields: ${it ? fieldDiff(it, c.after).join(", ") : "new"})`);
    }
    L.push("");
  }
  const an = list.filter((c) => c.type === "answer") as Array<Extract<Change, { type: "answer" }>>;
  if (an.length) {
    files.add("volumes/co/open-questions.md");
    L.push(`## Answers and opinions (${an.length})`, "");
    for (const c of an) L.push(`- ${c.qid} ${c.kind === "legal_opinion" ? "Legal opinion" : "Answer"} (${c.by}, ${c.date})${c.resolves ? ", proposes to mark it resolved" : ""}:`, `  > ${c.text.replace(/\n/g, "\n  > ")}`);
    L.push("");
  }
  const ask = list.filter((c) => c.type === "ask") as Array<Extract<Change, { type: "ask" }>>;
  if (ask.length) {
    files.add("volumes/co/open-questions.md");
    L.push(`## New questions (${ask.length})`, "");
    for (const c of ask) L.push(`- On ${c.itemIds.join(", ")}: ${c.text}`);
    L.push("");
  }
  const edits = editedItems(list);
  if (edits.length) {
    const ba = beforeAfter(edits);
    L.push("## Effect on the stored households", "");
    if (!ba.diffs.length) L.push(`No stored household's result changes (${ba.checked} results checked).`);
    for (const d of ba.diffs.slice(0, 40)) {
      L.push(`- ${d.caseId} ${d.person} ${d.identifier}${d.month ? ` (${d.month})` : ""}: ${fmtValue(d.before, byIdent.get(d.identifier))} → ${fmtValue(d.after, byIdent.get(d.identifier))}`);
    }
    if (ba.diffs.length > 40) L.push(`- … and ${ba.diffs.length - 40} more`);
    L.push("");
  }
  const appr = approversFor(list);
  L.push("## Approvals required", "");
  for (const [r, why] of appr) L.push(`- [ ] ${r} (${why.slice(0, 3).join("; ")}${why.length > 3 ? `; +${why.length - 3} more` : ""})`);
  return { title, body: L.join("\n"), files: [...files] };
}
