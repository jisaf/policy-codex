// Records harness (design 4.4): the checks of the earnings (CO-5100) and
// holdings (CO-5300) records themselves, on the stored households, the rule
// tests and the generated households.
//
//   npm run records:harness -- --list earnings|holdings|receipts
//     [--track <name>] [--only <case>] [--out <file>] [--no-generated] [--no-metamorphic]
//
// --list receipts runs the receipts harness (npm run receipts:harness,
// scripts/receipts/harness.ts).
//
// --list earnings:
// 1. Boundary lint (boundary.ts). A person who states the same amount in the
//    same month as a receipt and an earnings record of a boundary pair is a
//    finding, unless allowed/boundary.yaml dispositions the pair (the copies
//    of the receipt kinds that were earnings went with those kinds in the
//    E2/H2 leftovers round, docs/reviews/records-e2-h2.md). Fails on any
//    finding.
// 2. Metamorphic relations (metamorphic-earnings.ts) on the figures each
//    track registers as reading the records, over the stored households and
//    the generated households of each track's bases (generate-earnings.ts).
//
// --list holdings:
// 1. Joint-holding consistency lint. Across the persons of a household or
//    rule test, the records that state one holding_id agree on kind and
//    value and their shares add to at most 1 (the same check npm run check
//    makes, src/engine/records.ts jointRecordErrors); and every relation
//    below, applied to every stored household, gives a statement the schema
//    and this check accept. Fails on any finding not dispositioned in
//    allowed/joint.yaml.
// 2. Metamorphic relations MH-1 to MH-5 (metamorphic-holdings.ts) on the
//    figures each track registers as reading the holdings records, over the
//    stored households and the generated households of each track's bases
//    (generate-holdings.ts).
//
// Until steps E2 and H2 (docs/reviews/records-e2-h2.md) each list also had
// a translation check (every household's records the translation of its
// scalar facts) and an old-against-new comparison (every outcome on the
// ledger at the phase's baseline, reading the scalar facts, against the
// ledger on disk, each difference explained by an allowed-differences file).
// The scalar facts, their translators, those two checks and the allowed
// differences are retired: every household and rule test states its income
// and resources in the records alone, and its answers are checked by its
// expectations (npm run check).
//
// The registry is split (design 4.3, rule 3): each track owns
// scripts/records/programs/<track>.ts (its tables, the figures that read the
// records, the relations its rules say are not invariant, its bases).
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { HouseholdCase } from "../../src/engine/cases";
import { currentLedger, root } from "../receipts/ledgers";
import type { Track } from "./programs/types";
import { lintPerson, type BoundaryFinding } from "./boundary";
import { generated } from "./generate-earnings";
import { runMetamorphic } from "./metamorphic-earnings";
import { generated as generatedHoldings } from "./generate-holdings";
import { relationsAreStatements, runMetamorphic as runHoldingsMetamorphic } from "./metamorphic-holdings";
import { jointRecordErrors } from "../../src/engine/records";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const has = (k: string) => process.argv.includes(k);

async function loadTracks(): Promise<Track[]> {
  const dir = path.join(root, "scripts/records/programs");
  const out: Track[] = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".ts") && x !== "types.ts").sort()) {
    const m = await import(path.join(dir, f));
    if (m.track) out.push(m.track as Track);
  }
  return out;
}

/** Boundary pairs known and dispositioned (allowed/boundary.yaml). */
interface KnownPair { case: string; person: string; receipt: string; earning: string; amount: number; reason: string }
function loadKnownPairs(): KnownPair[] {
  const f = path.join(root, "scripts/records/allowed/boundary.yaml");
  return fs.existsSync(f) ? ((parseYaml(fs.readFileSync(f, "utf8")) ?? []) as KnownPair[]) : [];
}

/** Joint holdings known and dispositioned (allowed/joint.yaml): a line of
 *  the lint, by case and message. */
interface KnownJoint { case: string; message: string; reason: string }
function loadKnownJoint(): KnownJoint[] {
  const f = path.join(root, "scripts/records/allowed/joint.yaml");
  return fs.existsSync(f) ? ((parseYaml(fs.readFileSync(f, "utf8")) ?? []) as KnownJoint[]) : [];
}

/** The persons' facts of a rule test, by person id. */
function testPersons(t: { given?: Record<string, unknown>; others?: Record<string, Record<string, unknown>>; persons?: Record<string, { facts?: Record<string, unknown> }> }): Array<[string, Record<string, unknown> | undefined]> {
  return [["p1", t.given], ...Object.entries(t.others ?? {}), ...Object.entries(t.persons ?? {}).map(([k, p]) => [k, p.facts] as [string, Record<string, unknown> | undefined])];
}

function write(outFile: string, title: string, lines: string[]): void {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, [title, "", ...lines].join("\n"));
  console.log(`written ${path.relative(root, outFile)}`);
}

async function earnings(): Promise<number> {
  const t0 = Date.now();
  const outFile = arg("--out") ?? path.join(root, "scripts/records/results/earnings.txt");
  const only = arg("--only");
  const onlyTrack = arg("--track");
  const L = currentLedger();
  if (!L.ix.byIdentifier.get("earnings")) { console.log("records harness: no earnings list (CO-5100) in the ledger"); return 2; }
  const tracks = (await loadTracks()).filter((t) => t.earnings && (!onlyTrack || t.track === onlyTrack));
  const lines: string[] = [];
  let fail = 0;

  // 1. boundary lint
  const findings: Array<[string, string, BoundaryFinding]> = [];
  for (const c of L.ledger.cases) for (const [pid, p] of Object.entries(c.persons)) {
    for (const f of lintPerson(p.facts?.receipts, p.facts?.earnings)) findings.push([c.id, pid, f]);
  }
  for (const it of L.ledger.items) for (const t of it.tests ?? []) {
    for (const [pid, f0] of testPersons(t)) for (const f of lintPerson(f0?.receipts, f0?.earnings)) findings.push([t.id, pid, f]);
  }
  const knownPairs = loadKnownPairs();
  const isKnown = ([c, p, f]: [string, string, BoundaryFinding]) => knownPairs.some((k) => k.case === c && k.person === p && k.receipt === f.receipt && k.earning === f.earning && k.amount === f.amount);
  const real = findings.filter((x) => !isKnown(x));
  const known = findings.filter((x) => isKnown(x));
  const withEarnings = L.ledger.cases.filter((c) => Object.values(c.persons).some((p) => p.facts && "earnings" in p.facts));
  lines.push("## Boundary lint", "",
    `Stored households stating earnings: ${withEarnings.length} of ${L.ledger.cases.length}.`,
    `Known and dispositioned (allowed/boundary.yaml): ${known.length ? known.map(([c, p, f]) => `${c} ${p} ${f.receipt}/${f.earning} ${f.amount}`).join("; ") : "none"}.`,
    `Findings: ${real.length ? "" : "none."}`, ...real.map(([c, p, f]) => `- ${c} ${p}: ${f.pair}: receipt ${f.receipt} and earnings ${f.earning}, ${f.amount}${f.month ? " in " + f.month : " every month"}`), "");
  if (real.length) { fail = 1; console.log(`FAILED: ${real.length} boundary finding(s)`); }

  // 2. metamorphic relations
  const stored = L.ledger.cases.filter((c) => !only || c.id === only);
  const gen = has("--no-generated") ? [] : generated(L.ledger.cases, tracks.flatMap((t) => t.earnings!.bases)).filter((c) => !only || c.id === only);
  lines.push(`Households for the relations: ${stored.length} stored, ${gen.length} generated.`, "");
  if (!has("--no-metamorphic")) {
    const meta = runMetamorphic(L, tracks, [...stored, ...gen]);
    lines.push("## Metamorphic relations", "", ...meta.lines, "");
    if (meta.violations) { fail = 1; console.log(`FAILED: ${meta.violations} metamorphic violation(s)`); }
  }
  write(outFile, `# Records harness: earnings (${Math.round((Date.now() - t0) / 1000)} s)`, lines);
  console.log(`boundary lint: ${real.length} finding(s), ${known.length} known and dispositioned`);
  console.log(`metamorphic relations over ${stored.length} stored and ${gen.length} generated households`);
  if (!fail) console.log("records harness (earnings): OK");
  return fail;
}

async function holdings(): Promise<number> {
  const t0 = Date.now();
  const outFile = arg("--out") ?? path.join(root, "scripts/records/results/holdings.txt");
  const only = arg("--only");
  const onlyTrack = arg("--track");
  const L = currentLedger();
  const list = L.ix.byIdentifier.get("holdings");
  if (!list) { console.log("records harness: no holdings list (CO-5300) in the ledger"); return 2; }
  const tracks = (await loadTracks()).filter((t) => t.holdings && (!onlyTrack || t.track === onlyTrack));
  const lines: string[] = [];
  let fail = 0;

  // 1. joint-holding consistency
  const joint: Array<[string, string]> = [];
  const lint = (id: string, ps: Array<[string, Record<string, unknown> | undefined]>) => {
    for (const m of jointRecordErrors(list, ps.map(([pid, f]) => [pid, f?.holdings] as [string, unknown]))) joint.push([id, m]);
  };
  for (const c of L.ledger.cases) lint(c.id, Object.entries(c.persons).map(([pid, p]) => [pid, p.facts]));
  for (const it of L.ledger.items) for (const t of it.tests ?? []) lint(t.id, testPersons(t));
  const knownJoint = loadKnownJoint();
  const realJoint = joint.filter(([c, m]) => !knownJoint.some((k) => k.case === c && k.message === m));
  const withHoldings = L.ledger.cases.filter((c) => Object.values(c.persons).some((p) => p.facts && "holdings" in p.facts));
  const persons = withHoldings.reduce((a, c) => a + Object.values(c.persons).filter((p) => p.facts && "holdings" in p.facts).length, 0);
  const jointHolders = L.ledger.cases.filter((c) => Object.values(c.persons).some((p) => ((p.facts?.holdings as Array<Record<string, unknown>> | undefined) ?? []).some((r) => r.holding_id !== undefined)));
  const relBad = relationsAreStatements(L, L.ledger.cases);
  lines.push("## Joint-holding consistency", "",
    `Stored households stating holdings: ${withHoldings.length} of ${L.ledger.cases.length} (${persons} persons).`,
    `Stored households stating a joint holding (holding_id): ${jointHolders.length ? jointHolders.map((c) => c.id).join(", ") : "none"}.`,
    `Known and dispositioned (allowed/joint.yaml): ${joint.length - realJoint.length}.`,
    `Findings: ${realJoint.length ? "" : "none."}`, ...realJoint.map(([c, m]) => `- ${c}: ${m}`),
    `Relations MH-1 to MH-5 applied to every stored household give statements the schema and this check accept: ${relBad.length ? "NO" : "yes"}.`,
    ...relBad.slice(0, 20).map((m) => `- ${m}`), "");
  if (realJoint.length) { fail = 1; console.log(`FAILED: ${realJoint.length} joint-holding finding(s)`); }
  if (relBad.length) { fail = 1; console.log(`FAILED: ${relBad.length} relation output(s) the schema or the joint check refuses`); }

  // 2. metamorphic relations
  const stored: HouseholdCase[] = L.ledger.cases.filter((c) => !only || c.id === only);
  const gen = has("--no-generated") ? [] : generatedHoldings(L.ledger.cases, tracks.flatMap((t) => t.holdings!.bases)).filter((c) => !only || c.id === only);
  lines.push(`Households for the relations: ${stored.length} stored, ${gen.length} generated.`, "");
  if (!has("--no-metamorphic")) {
    const meta = runHoldingsMetamorphic(L, tracks, [...stored, ...gen]);
    lines.push("## Metamorphic relations", "", ...meta.lines, "");
    if (meta.violations) { fail = 1; console.log(`FAILED: ${meta.violations} metamorphic violation(s)`); }
  }
  write(outFile, `# Records harness: holdings (${Math.round((Date.now() - t0) / 1000)} s)`, lines);
  console.log(`joint-holding lint: ${realJoint.length} finding(s), ${joint.length - realJoint.length} known; relation outputs refused: ${relBad.length}`);
  console.log(`metamorphic relations over ${stored.length} stored and ${gen.length} generated households`);
  if (!fail) console.log("records harness (holdings): OK");
  return fail;
}

async function main(): Promise<number> {
  const list = arg("--list") ?? "earnings";
  if (list === "receipts") { await import("../receipts/harness"); return Number(process.exitCode ?? 0); }
  if (list === "earnings") return earnings();
  if (list === "holdings") return holdings();
  console.log(`records harness: unknown list "${list}" (earnings, holdings, receipts)`);
  return 2;
}

main().then((code) => { process.exitCode = code; });
