// Earned-income records: metamorphic relations (design 4.4). The same pay
// stated in each way the record permits must give the same answer where the
// policy says it should. Each relation transforms a household's earnings
// records only (the scalar facts stay as stated) and compares the figures
// each track registers as reading the records (scripts/records/programs/*.ts,
// `metamorphic`); a track lists, with the rule, each relation its rules say
// is not invariant (`notInvariant`), and that relation is not run for it.
//
//   ME-1 split   a record split into two records with the same fields, the
//                amounts (amount, per_payment and the earmarks) halved.
//   ME-2 order   the records in reverse order.
//   ME-3 month   a recurring record (no month, no date) stated for the month
//                evaluated, compared in that month.
//   ME-4 cost    a cost record relabelled to another cost kind the track's
//                table also deducts.
//   ME-5 dated   four dated weekly pays of x in a month against a weekly
//                stream of per_payment x (SNAP 4.402.A.2: 4.3x in both): a
//                family the SNAP track adds with its readers.
// In step E0 no figure reads the records, so every relation is run on no
// figure and reports so; the machinery is here for the E1 tracks.
import type { HouseholdCase } from "../../src/engine/cases";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { caseToSpec } from "../../src/engine/cases";
import { valuesEqual } from "../../src/engine/values";
import type { Ledger } from "../receipts/ledgers";
import type { Track } from "./programs/types";

type Rec = Record<string, unknown>;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const eq = (a: unknown, b: unknown) => (a == null && b == null) || (a != null && b != null && valuesEqual(a, b));
const HALVED = ["amount", "per_payment", "pass_set_aside", "education_deduction", "net_for_tax", "annual_contract_pay"];

function mapEarnings(c: HouseholdCase, f: (rs: Rec[]) => Rec[]): HouseholdCase {
  const out = clone(c);
  for (const p of Object.values(out.persons)) {
    const e = p.facts?.earnings;
    if (Array.isArray(e)) p.facts!.earnings = f(e as Rec[]);
  }
  return out;
}

export interface Relation { id: string; name: string; apply: (c: HouseholdCase, month: string, deducted: string[]) => HouseholdCase | null }

export const RELATIONS: Relation[] = [
  { id: "ME-1", name: "split", apply: (c) => mapEarnings(c, (rs) => rs.flatMap((r) => {
    if (typeof r.amount !== "number" || r.amount === 0) return [r];
    const a = { ...r }, b = { ...r };
    for (const k of HALVED) if (typeof r[k] === "number") { a[k] = (r[k] as number) / 2; b[k] = (r[k] as number) / 2; }
    return [a, b];
  })) },
  { id: "ME-2", name: "order", apply: (c) => mapEarnings(c, (rs) => [...rs].reverse()) },
  { id: "ME-3", name: "month", apply: (c, month) => mapEarnings(c, (rs) => rs.map((r) => (r.month === undefined && r.date === undefined && r.frequency !== "once" ? { ...r, month } : r))) },
  { id: "ME-4", name: "cost", apply: (c, _m, deducted) => (deducted.length < 2 ? null
    : mapEarnings(c, (rs) => rs.map((r) => (r.kind === deducted[0] ? { ...r, kind: deducted[1] } : r)))) },
];

/** The kinds a track's tables all deduct, in schema order. */
function deductedKinds(L: Ledger, tables: string[]): string[] {
  const rows = tables.map((t) => {
    const it = L.ix.byIdentifier.get(t);
    const v = (it?.versions?.[it.versions.length - 1]?.value ?? {}) as Record<string, string>;
    return new Set(Object.entries(v).filter(([, x]) => x === "deducted").map(([k]) => k));
  });
  return rows.length ? [...rows[0]].filter((k) => rows.every((s) => s.has(k))) : [];
}

export function runMetamorphic(L: Ledger, tracks: Track[], cases: HouseholdCase[]): { lines: string[]; violations: number } {
  const lines: string[] = ["| Relation | Track | Figures | Households | Values | Violations |", "|---|---|---|---|---|---|"];
  let violations = 0;
  const notes: string[] = [];
  for (const rel of RELATIONS) {
    for (const t of tracks) {
      const e = t.earnings;
      if (!e) continue;
      if (e.notInvariant?.[rel.id]) { lines.push(`| ${rel.id} ${rel.name} | ${t.track} | not run: ${e.notInvariant[rel.id]} | | | |`); continue; }
      const ids = e.metamorphic.filter((id) => L.ix.byIdentifier.has(id));
      if (!ids.length) { lines.push(`| ${rel.id} ${rel.name} | ${t.track} | none reads the records yet | 0 | 0 | 0 |`); continue; }
      const deducted = deductedKinds(L, e.tables);
      let n = 0, values = 0, bad = 0;
      for (const c of cases) {
        if (!Object.values(c.persons).some((p) => Array.isArray(p.facts?.earnings) && (p.facts!.earnings as unknown[]).length)) continue;
        const month = c.as_of.slice(0, 7);
        const t2 = rel.apply(c, month, deducted);
        if (!t2) continue;
        n++;
        const d1 = makeCase(L.ix, caseToSpec(c)), d2 = makeCase(L.ix, caseToSpec(t2));
        for (const pid of Object.keys(c.persons)) for (const id of ids) {
          const it = L.ix.byIdentifier.get(id)!;
          const mo = it.scope === "person-month" || it.scope === "month" ? month : null;
          const pp = it.scope === "case" || it.scope === "global" || it.scope === "month" ? null : pid;
          let a: unknown, b: unknown;
          try { a = evaluate(L.ix, d1, id, pp, mo); } catch (x) { a = "error: " + (x as Error).message; }
          try { b = evaluate(L.ix, d2, id, pp, mo); } catch (x) { b = "error: " + (x as Error).message; }
          values++;
          if (!eq(a, b)) { bad++; if (notes.length < 40) notes.push(`${rel.id} ${t.track} ${c.id} ${pid} ${id}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`); }
        }
      }
      violations += bad;
      lines.push(`| ${rel.id} ${rel.name} | ${t.track} | ${ids.join(", ")} | ${n} | ${values} | ${bad} |`);
    }
  }
  lines.push(`| ME-5 dated | snap | a family the SNAP track adds with its readers (design 4.4) | | | |`);
  if (notes.length) lines.push("", ...notes.map((s) => "- " + s));
  return { lines, violations };
}
