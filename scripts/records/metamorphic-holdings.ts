// Resource records: metamorphic relations (design 4.4). The same holdings
// stated in each way the record permits must give the same answer where the
// policy says it should. Each relation transforms a household's holdings
// records only (the scalar facts stay as stated) and compares the figures
// each track registers as reading the records (scripts/records/programs/*.ts,
// `holdings.metamorphic`); a track lists, with the rule, each relation its
// rules say is not invariant (`notInvariant`), and that relation is not run
// for it.
//
//   MH-1 split        an account (cash, bank_account, securities, a
//                     retirement account, a held_ record) split into two
//                     records of the same kind and fields, value and what
//                     is owed halved.
//   MH-2 order        the records in reverse order.
//   MH-3 joint        a spouse's account stated whole on one spouse,
//                     against the same account stated on both spouses as a
//                     joint holding (holding_id, co_owners spouse, share
//                     0.5 each): invariant for every couple and household
//                     figure (the SSI couple, the CSRA, Adult Financial's
//                     client and spouse, SNAP's household), not for an
//                     individual's; run on `holdings.coupleFigures` only.
//   MH-4 encumbrance  value v owed d against value v - d owed 0, for every
//                     record that states what is owed: invariant for the
//                     rows that count equity.
//   MH-5 expiry       a held refund or retroactive benefit whose
//                     source_date is more than two years before the
//                     determination date (past every window the tables
//                     name for them: twelve months for refunds, nine for
//                     retroactive benefits) merged into the person's
//                     bank_account. Since the H1 integration, only those
//                     two kinds (EXPIRING): other held_ kinds have rows
//                     with no time limit in some table.
// In step H0 no figure reads the records, so every relation is run on no
// figure and reports so; the machinery is here for the H1 tracks. The
// harness also checks that every relation, applied to every stored
// household, gives a statement the schema and the joint-holding check
// accept (a relation that produced an invalid household would test nothing).
import type { HouseholdCase } from "../../src/engine/cases";
import { caseToSpec } from "../../src/engine/cases";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { valuesEqual } from "../../src/engine/values";
import { jointRecordErrors, recordValueErrors } from "../../src/engine/records";
import type { Ledger } from "../receipts/ledgers";
import type { Track } from "./programs/types";

type Rec = Record<string, unknown>;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const eq = (a: unknown, b: unknown) => (a == null && b == null) || (a != null && b != null && valuesEqual(a, b));
const ACCOUNTS = new Set(["cash", "bank_account", "securities", "retirement_account", "held_income_tax_refund", "held_eitc",
  "held_retroactive_ssa_benefit", "held_excluded_payment", "held_loan_proceeds", "held_replacement_proceeds", "held_prorated_income"]);
/** MH-5: the held_ kinds whose every table row ends within two years of
 *  receipt or counts them throughout (refunds: twelve months, 26 U.S.C.
 *  6409, 4.410.J.17, 3.520.77.K, a State refund counted; retroactive
 *  benefits: nine months, 8.100.5.F.6.c, 3.520.77.J, or counted by SNAP).
 *  Not the others (holdings H1 integration,
 *  docs/reviews/records-holdings-h1-integration.md, section 4): SNAP excludes
 *  held excluded payments and prorated income with no time limit (4.410.J)
 *  and an EITC for as long as the household participates (J.12); the SSI
 *  method excludes loans and the F.6 payments with no time limit; Adult
 *  Financial extends the replacement-proceeds window on the county's grant
 *  (3.520.77.E, F); so for them the same dollars held two years and merged
 *  into an account are not the same statement. */
const EXPIRING = new Set(["held_income_tax_refund", "held_retroactive_ssa_benefit"]);

function mapHoldings(c: HouseholdCase, f: (rs: Rec[], pid: string) => Rec[]): HouseholdCase {
  const out = clone(c);
  for (const [pid, p] of Object.entries(out.persons)) {
    const h = p.facts?.holdings;
    if (Array.isArray(h)) p.facts!.holdings = f(h as Rec[], pid);
  }
  return out;
}

/** The pairs of spouses of a household who both state holdings. */
function spousePairs(c: HouseholdCase): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  // A spouse who died on or before the determination date is no spouse of the months the relation's figures are read
  // in (9 CCR 2503-5 3.520.63.A: widowed; Adult Financial's spouse of the month, af_spouses_in_month CO-7603, cash
  // pattern sweep PS-M1), so an account stated joint with that person is not the couple's: the pair is not a couple and
  // the relation does not apply to it (docs/reviews/pattern-sweep-cash.md, section 7).
  const alive = (pid: string) => { const d = c.persons[pid]?.facts?.date_of_death; return typeof d !== "string" || d > c.as_of; };
  const has = (pid: string) => Array.isArray(c.persons[pid]?.facts?.holdings) && alive(pid);
  for (const r of c.relationships ?? []) if (r[0] === "spouse" && has(r[1]) && has(r[2]) && !out.some(([a, b]) => (a === r[2] && b === r[1]))) out.push([r[1], r[2]]);
  for (const [pid, p] of Object.entries(c.persons)) for (const r of (p.relationships ?? []) as Array<[string, string]>) {
    if (r[0] === "spouse" && has(pid) && has(r[1]) && !out.some(([a, b]) => (a === pid && b === r[1]) || (a === r[1] && b === pid))) out.push([pid, r[1]]);
  }
  return out;
}

export interface Relation { id: string; name: string; apply: (c: HouseholdCase) => HouseholdCase | null }

export const RELATIONS: Relation[] = [
  { id: "MH-1", name: "split", apply: (c) => mapHoldings(c, (rs) => rs.flatMap((r) => {
    if (!ACCOUNTS.has(String(r.kind)) || typeof r.value !== "number" || r.value === 0 || r.holding_id !== undefined) return [r];
    const a: Rec = { ...r, value: r.value / 2 }, b: Rec = { ...r, value: r.value / 2 };
    for (const k of ["amount_owed", "taxes_on_withdrawal"]) if (typeof r[k] === "number") { a[k] = (r[k] as number) / 2; b[k] = (r[k] as number) / 2; }
    return [a, b];
  })) },
  { id: "MH-2", name: "order", apply: (c) => mapHoldings(c, (rs) => [...rs].reverse()) },
  { id: "MH-3", name: "joint", apply: (c) => {
    const pairs = spousePairs(c);
    if (!pairs.length) return null;
    const out = clone(c);
    let n = 0;
    for (const [a, b] of pairs) {
      const ha = out.persons[a].facts!.holdings as Rec[], hb = out.persons[b].facts!.holdings as Rec[];
      const i = ha.findIndex((r) => r.kind === "bank_account" && typeof r.value === "number" && r.value > 0 && r.share === undefined && r.holding_id === undefined && r.accessible !== false);
      if (i < 0) continue;
      const id = `MH3-${a}-${b}`;
      const joint = { ...ha[i], share: 0.5, co_owners: "spouse", holding_id: id };
      ha[i] = joint;
      hb.push({ ...joint });
      n++;
    }
    return n ? out : null;
  } },
  { id: "MH-4", name: "encumbrance", apply: (c) => mapHoldings(c, (rs) => rs.map((r) =>
    (typeof r.amount_owed === "number" && typeof r.value === "number" && r.amount_owed > 0
      ? { ...r, value: r.value - r.amount_owed, amount_owed: 0 }
      : typeof r.amount_owed === "number" && typeof r.value === "number" ? { ...r, value: r.value + 100, amount_owed: r.amount_owed + 100 } : r))) },
  { id: "MH-5", name: "expiry", apply: (c) => {
    const cutoff = `${Number(c.as_of.slice(0, 4)) - 2}${c.as_of.slice(4)}`;
    return mapHoldings(c, (rs) => {
      const old = rs.filter((r) => EXPIRING.has(String(r.kind)) && typeof r.source_date === "string" && r.source_date < cutoff && typeof r.value === "number");
      if (!old.length) return rs;
      const add = old.reduce((s, r) => s + (r.value as number), 0);
      const keep = rs.filter((r) => !old.includes(r));
      const acct = keep.find((r) => r.kind === "bank_account" && r.share === undefined && r.accessible !== false && typeof r.value === "number");
      if (acct) return keep.map((r) => (r === acct ? { ...r, value: (r.value as number) + add } : r));
      return [...keep, { kind: "bank_account", value: add }];
    });
  } },
];

/** Every relation applied to every household gives a statement the schema
 *  and the joint-holding check accept. */
export function relationsAreStatements(L: Ledger, cases: HouseholdCase[]): string[] {
  const it = L.ix.byIdentifier.get("holdings");
  if (!it) return ["no holdings list in the ledger"];
  const bad: string[] = [];
  for (const rel of RELATIONS) for (const c of cases) {
    const t = rel.apply(c);
    if (!t) continue;
    const lists: Array<[string, unknown]> = Object.entries(t.persons).map(([pid, p]) => [pid, p.facts?.holdings]);
    for (const [pid, l] of lists) for (const m of recordValueErrors(it, l)) bad.push(`${rel.id} ${c.id} ${pid}: ${m}`);
    for (const m of jointRecordErrors(it, lists)) bad.push(`${rel.id} ${c.id}: ${m}`);
  }
  return bad;
}

export function runMetamorphic(L: Ledger, tracks: Track[], cases: HouseholdCase[]): { lines: string[]; violations: number } {
  const lines: string[] = ["| Relation | Track | Figures | Households | Values | Violations |", "|---|---|---|---|---|---|"];
  let violations = 0;
  const notes: string[] = [];
  for (const rel of RELATIONS) {
    for (const t of tracks) {
      const e = t.holdings;
      if (!e) continue;
      if (e.notInvariant?.[rel.id]) { lines.push(`| ${rel.id} ${rel.name} | ${t.track} | not run: ${e.notInvariant[rel.id]} | | | |`); continue; }
      const ids = (rel.id === "MH-3" ? e.coupleFigures ?? [] : e.metamorphic).filter((id) => L.ix.byIdentifier.has(id));
      if (!ids.length) { lines.push(`| ${rel.id} ${rel.name} | ${t.track} | none reads the records yet | 0 | 0 | 0 |`); continue; }
      let n = 0, values = 0, bad = 0;
      for (const c of cases) {
        if (!Object.values(c.persons).some((p) => Array.isArray(p.facts?.holdings) && (p.facts!.holdings as unknown[]).length)) continue;
        const t2 = rel.apply(c);
        if (!t2) continue;
        n++;
        const month = c.as_of.slice(0, 7);
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
  if (notes.length) lines.push("", ...notes.map((s) => "- " + s));
  return { lines, violations };
}
