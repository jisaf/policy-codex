// Records harness, generalised from the receipts harness (design 4.4): the
// merge gate of every earned-income (and, from H0, resource) records commit.
//
//   npm run records:harness -- --list earnings|holdings|receipts
//     [--base <ref>] [--all-programs] [--track <name>] [--only <case>]
//     [--out <file>] [--no-generated] [--no-metamorphic]
//
// --list receipts runs the receipts harness (npm run receipts:harness,
// scripts/receipts/harness.ts), unchanged.
//
// --list earnings, in four parts:
// 1. Translation. Every stored household's and rule test's earnings records
//    are the translation of its scalar earned facts (translate-earnings.ts;
//    the transition rule: both written from one statement). Fails on any
//    that is not.
// 2. Boundary lint (boundary.ts). A person who states the same amount in the
//    same month as a receipt and an earnings record of a boundary pair is a
//    finding, unless the pair is the translator's transition copy of a
//    receipt kind that is earnings. Fails on any finding.
// 3. Old against new. Every stored household, and the generated households
//    of each track's bases (generate-earnings.ts), evaluated on the ledger
//    at the baseline (EARNINGS_BASELINE, the end of step E0, so each E1
//    track measures itself; --base the commit before E0 measures the whole
//    phase) and on the ledger on disk: every outcome of the programs the
//    tracks name (--all-programs: every program's) and each track's figures.
//    A difference passes only when an allowed-differences file explains it
//    (scripts/records/allowed/*.yaml: e0.yaml, then one file per track,
//    e1-<track>.yaml, each a cited fix or a product-owner decision).
// 4. Metamorphic relations (metamorphic-earnings.ts) on the figures each
//    track registers as reading the records.
//
// The registry is split (design 4.3, rule 3): each track owns
// scripts/records/programs/<track>.ts (its figures, bases and relations) and
// scripts/records/allowed/e1-<track>.yaml; the harness loads the directories,
// so tracks running in parallel never edit the same list.
//
// --list holdings: the resource records (CO-5300) are step H0; until the
// list is in the ledger the harness says so and stops.
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { caseToSpec, type HouseholdCase } from "../../src/engine/cases";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { valuesEqual as ve } from "../../src/engine/values";
import { currentLedger, ledgerAt, root, type Ledger } from "../receipts/ledgers";
import type { Track } from "./programs/types";
import { translateCase, translateTest } from "./translate-earnings";
import { lintPerson, type BoundaryFinding } from "./boundary";
import { generated } from "./generate-earnings";
import { runMetamorphic } from "./metamorphic-earnings";

/** The ledger an E1 track is measured against: the end of step E0 (20004af,
 *  its last commit that changes the ledger; the commits after it change
 *  scripts and docs only). Re-pointed by the integration owner after each
 *  merge wave (design 4.3, rule 5). To measure E0 itself, --base the ledger
 *  just before it: f5275a6 (receipts phase 3 merged), or 2b8dcef (that
 *  and the SSI parental deeming fill-up, merged into E0 before its gate). */
export const EARNINGS_BASELINE = "20004af5b1dd722b23b47485330ce3b58410af6e";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const has = (k: string) => process.argv.includes(k);
const eq = (a: unknown, b: unknown) => (a == null && b == null) || (a != null && b != null && ve(a, b));

interface Allowed { case: string; person?: string; identifier?: string; month?: string; class: string; old?: unknown; new?: unknown }
interface Diff { source: string; case: string; person: string; identifier: string; month: string; old: unknown; new: unknown; allowed?: string }

function matches(a: Allowed, d: Diff): boolean {
  const re = (p: string, s: string) => (p.startsWith("/") && p.endsWith("/") ? new RegExp(p.slice(1, -1)).test(s) : p === s);
  if (!re(a.case, d.case)) return false;
  if (a.person !== undefined && !re(a.person, d.person)) return false;
  if (a.identifier !== undefined && !re(a.identifier, d.identifier)) return false;
  if (a.month !== undefined && a.month !== d.month) return false;
  if (a.old !== undefined && !eq(a.old === "unknown" ? null : a.old, d.old)) return false;
  if (a.new !== undefined && !eq(a.new === "unknown" ? null : a.new, d.new)) return false;
  return true;
}

async function loadTracks(): Promise<Track[]> {
  const dir = path.join(root, "scripts/records/programs");
  const out: Track[] = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".ts") && x !== "types.ts").sort()) {
    const m = await import(path.join(dir, f));
    if (m.track) out.push(m.track as Track);
  }
  return out;
}

function loadAllowed(): Allowed[] {
  const dir = path.join(root, "scripts/records/allowed");
  const out: Allowed[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".yaml") && x !== "boundary.yaml").sort()) {
    out.push(...(((parseYaml(fs.readFileSync(path.join(dir, f), "utf8")) ?? []) as Allowed[])));
  }
  return out;
}

/** Boundary pairs known and dispositioned (allowed/boundary.yaml). */
interface KnownPair { case: string; person: string; receipt: string; earning: string; amount: number; reason: string }
function loadKnownPairs(): KnownPair[] {
  const f = path.join(root, "scripts/records/allowed/boundary.yaml");
  return fs.existsSync(f) ? ((parseYaml(fs.readFileSync(f, "utf8")) ?? []) as KnownPair[]) : [];
}

function monthsOf(c: HouseholdCase): string[] {
  const ms = new Set<string>([c.as_of.slice(0, 7)]);
  const app = c.case_facts?.leap_application_date as string | undefined;
  if (app) ms.add(app.slice(0, 7));
  for (const ex of Object.values(c.expect ?? {})) for (const v of Object.values(ex)) {
    if (v && typeof v === "object" && !Array.isArray(v)) for (const k of Object.keys(v)) if (/^\d{4}-\d{2}$/.test(k)) ms.add(k);
  }
  return [...ms].sort();
}

function run(m: Ledger, c: HouseholdCase, ids: string[], months: string[]): Map<string, unknown> {
  const data = makeCase(m.ix, caseToSpec(c));
  const out = new Map<string, unknown>();
  const first = Object.keys(c.persons)[0];
  for (const pid of Object.keys(c.persons)) {
    for (const id of ids) {
      const it = m.ix.byIdentifier.get(id);
      if (!it) continue;
      const scoped = it.scope === "person-month" || it.scope === "month";
      const personless = it.scope === "case" || it.scope === "global" || it.scope === "month";
      if (personless && pid !== first) continue;
      for (const mo of scoped ? months : [null]) {
        let v: unknown;
        try { v = evaluate(m.ix, data, id, personless ? null : pid, mo); } catch (ex) { v = "error: " + (ex as Error).message; }
        out.set(`${pid}|${id}|${mo ?? ""}`, v);
      }
    }
  }
  return out;
}

async function earnings(): Promise<number> {
  const t0 = Date.now();
  const base = arg("--base") ?? EARNINGS_BASELINE;
  const outFile = arg("--out") ?? path.join(root, "scripts/records/results/earnings.txt");
  const only = arg("--only");
  const onlyTrack = arg("--track");
  const newL = currentLedger();
  if (!newL.ix.byIdentifier.get("earnings")) { console.log("records harness: no earnings list (CO-5100) in the ledger"); return 2; }
  const tracks = (await loadTracks()).filter((t) => t.earnings && (!onlyTrack || t.track === onlyTrack));
  const allowed = loadAllowed();
  const lines: string[] = [];
  let fail = 0;

  // 1. translation
  const stale: string[] = [];
  const notes = new Set<string>();
  for (const c of newL.ledger.cases) {
    const tr = translateCase(c, newL.ix);
    tr.notes.forEach((n) => notes.add(n));
    if (tr.changed) stale.push(c.id);
  }
  const staleTests: string[] = [];
  let tests = 0, testsWith = 0;
  for (const it of newL.ledger.items) for (const t of it.tests ?? []) {
    tests++;
    const tr = translateTest(t, newL.ix, t.as_of ?? newL.ledger.meta.default_as_of);
    tr.notes.forEach((n) => notes.add(n));
    if (tr.changed) staleTests.push(t.id);
    const all = [t.given, ...Object.values(t.others ?? {}), ...Object.values(t.persons ?? {}).map((p) => p.facts)];
    if (all.some((o) => o && "earnings" in o)) testsWith++;
  }
  const withEarnings = newL.ledger.cases.filter((c) => Object.values(c.persons).some((p) => p.facts && "earnings" in p.facts));
  lines.push("## Translation", "",
    `Stored households stating earnings: ${withEarnings.length} of ${newL.ledger.cases.length}; rule tests stating earnings: ${testsWith} of ${tests}.`,
    `Stored households whose earnings are not the translation of their earned facts: ${stale.length ? stale.join(", ") : "none"}.`,
    `Rule tests whose earnings are not the translation of their earned facts: ${staleTests.length ? staleTests.join(", ") : "none"}.`, "");
  if (stale.length || staleTests.length) { fail = 1; console.log(`FAILED: ${stale.length} household(s) and ${staleTests.length} rule test(s) not translated (npm run records:translate)`); }

  // 2. boundary lint
  const findings: Array<[string, string, BoundaryFinding]> = [];
  for (const c of newL.ledger.cases) for (const [pid, p] of Object.entries(c.persons)) {
    for (const f of lintPerson(p.facts?.receipts, p.facts?.earnings)) findings.push([c.id, pid, f]);
  }
  for (const it of newL.ledger.items) for (const t of it.tests ?? []) {
    const ps: Array<[string, Record<string, unknown> | undefined]> = [["p1", t.given], ...Object.entries(t.others ?? {}), ...Object.entries(t.persons ?? {}).map(([k, p]) => [k, p.facts] as [string, Record<string, unknown> | undefined])];
    for (const [pid, f0] of ps) for (const f of lintPerson(f0?.receipts, f0?.earnings)) findings.push([t.id, pid, f]);
  }
  const knownPairs = loadKnownPairs();
  const isKnown = ([c, p, f]: [string, string, BoundaryFinding]) => knownPairs.some((k) => k.case === c && k.person === p && k.receipt === f.receipt && k.earning === f.earning && k.amount === f.amount);
  const real = findings.filter((x) => !x[2].transition && !isKnown(x));
  const known = findings.filter((x) => !x[2].transition && isKnown(x));
  const copies = findings.filter(([, , f]) => f.transition);
  lines.push("## Boundary lint", "",
    `Transition copies (a receipt kind that is earnings, stated in both lists by the translator): ${copies.length ? copies.map(([c, p, f]) => `${c} ${p} ${f.receipt} ${f.amount}`).join("; ") : "none"}.`,
    `Known and dispositioned (allowed/boundary.yaml): ${known.length ? known.map(([c, p, f]) => `${c} ${p} ${f.receipt}/${f.earning} ${f.amount}`).join("; ") : "none"}.`,
    `Findings: ${real.length ? "" : "none."}`, ...real.map(([c, p, f]) => `- ${c} ${p}: ${f.pair}: receipt ${f.receipt} and earnings ${f.earning}, ${f.amount}${f.month ? " in " + f.month : " every month"}`), "");
  if (real.length) { fail = 1; console.log(`FAILED: ${real.length} boundary finding(s)`); }

  // 3. old against new
  const oldL = ledgerAt(base);
  const programs = has("--all-programs") ? (newL.ledger.meta.programs ?? []).map((p) => p.id) : [...new Set(tracks.flatMap((t) => t.programs))];
  const ids = new Set<string>(tracks.flatMap((t) => t.earnings!.figures));
  for (const m of [oldL, newL]) for (const p of m.ledger.meta.programs ?? []) if (programs.includes(p.id)) for (const o of p.outcomes ?? []) ids.add(o);
  const sources: Array<{ label: string; cases: HouseholdCase[] }> = [{ label: "stored households", cases: newL.ledger.cases }];
  if (!has("--no-generated")) {
    const gen = generated(newL.ledger.cases, tracks.flatMap((t) => t.earnings!.bases)).map((c) => translateCase(c, newL.ix).value);
    sources.push({ label: "generated households", cases: gen });
  }
  const diffs: Diff[] = [];
  const summary: string[] = ["| Source | Households | Values compared | Values that differ | Allowed | Unexplained |", "|---|---|---|---|---|---|"];
  const before = new Set(oldL.ledger.cases.map((c) => c.id));
  for (const src of sources) {
    let n = 0, cmp = 0;
    const d0 = diffs.length;
    for (const c of src.cases) {
      if (only && c.id !== only) continue;
      if (src.label === "stored households" && !before.has(c.id)) continue; // added since the baseline: checked by its expectations
      n++;
      const want = [...new Set([...ids, ...Object.values(c.expect ?? {}).flatMap((e) => Object.keys(e))])];
      const months = monthsOf(c);
      const o = run(oldL, c, want, months);
      const r = run(newL, c, want, months);
      for (const [k, ov] of o) {
        if (!r.has(k)) continue;
        cmp++;
        const nv = r.get(k);
        if (eq(ov, nv)) continue;
        const [pid, id, mo] = k.split("|");
        const d: Diff = { source: src.label, case: c.id, person: pid, identifier: id, month: mo, old: ov, new: nv };
        const a = allowed.find((x) => matches(x, d));
        if (a) d.allowed = a.class;
        diffs.push(d);
      }
    }
    const mine = diffs.slice(d0);
    summary.push(`| ${src.label} | ${n} | ${cmp} | ${mine.length} | ${mine.filter((d) => d.allowed).length} | ${mine.filter((d) => !d.allowed).length} |`);
  }
  const fmt = (v: unknown) => (v === null || v === undefined ? "unknown" : JSON.stringify(v));
  const unexplained = diffs.filter((d) => !d.allowed);
  lines.push("## Old against new", "", `Ledger at ${base.slice(0, 12)} against the ledger on disk; programs: ${programs.join(", ")}; tracks: ${tracks.map((t) => t.track).join(", ")}.`, "",
    ...summary, "", ...diffs.map((d) => `${d.allowed ? "allowed (" + d.allowed + ")" : "UNEXPLAINED"} ${d.source[0].toUpperCase()} ${d.case} ${d.person} ${d.identifier}${d.month ? " @" + d.month : ""}: old ${fmt(d.old)} new ${fmt(d.new)}`), "");
  if (unexplained.length) { fail = 1; console.log(`FAILED: ${unexplained.length} unexplained difference(s)`); for (const d of unexplained.slice(0, 30)) console.log(`  ${d.case} ${d.person} ${d.identifier}${d.month ? " @" + d.month : ""}: old ${fmt(d.old)} new ${fmt(d.new)}`); }

  // 4. metamorphic relations
  if (!has("--no-metamorphic")) {
    const meta = runMetamorphic(newL, tracks, [...sources.flatMap((s) => s.cases)]);
    lines.push("## Metamorphic relations", "", ...meta.lines, "");
    if (meta.violations) { fail = 1; console.log(`FAILED: ${meta.violations} metamorphic violation(s)`); }
  }
  lines.push("## Translation notes", "", ...[...notes].map((n) => "- " + n), "");
  const text = [`# Records harness: earnings (${Math.round((Date.now() - t0) / 1000)} s)`, "", ...lines].join("\n");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, text);
  console.log(summary.join("\n"));
  console.log(`translation: ${withEarnings.length} households and ${testsWith} rule tests state earnings; ${stale.length + staleTests.length} not the translation`);
  console.log(`boundary lint: ${real.length} finding(s), ${known.length} known and dispositioned, ${copies.length} transition cop${copies.length === 1 ? "y" : "ies"}`);
  console.log(`written ${path.relative(root, outFile)}`);
  if (!fail) console.log("records harness (earnings): OK");
  return fail;
}

async function main(): Promise<number> {
  const list = arg("--list") ?? "earnings";
  if (list === "receipts") { await import("../receipts/harness"); return Number(process.exitCode ?? 0); }
  if (list === "earnings") return earnings();
  if (list === "holdings") {
    const L = currentLedger();
    if (!L.ix.byIdentifier.get("holdings")) {
      console.log("records harness: no holdings list (CO-5300) in the ledger yet; resource records are step H0 (docs/design-earned-and-resource-records.md 4.2)");
      return 2;
    }
    console.log("records harness: holdings are registered in scripts/records/programs/*.ts (holdings) from step H0");
    return 2;
  }
  console.log(`records harness: unknown list "${list}" (earnings, holdings, receipts)`);
  return 2;
}

main().then((code) => { process.exitCode = code; });
