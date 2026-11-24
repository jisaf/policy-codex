/* Runs the rule tests of the items named (ids or identifiers, or a regex with
 * --re) and the stored household cases named with --case, and prints the
 * failures: a fast loop while editing, before the full `npm run check`.
 *   npx vite-node scripts/audit/quick-tests.ts -- CO-509 CO-7551 --case CO-1000 --case CO-1001
 *   npx vite-node scripts/audit/quick-tests.ts -- --all-tests   (every rule test)
 *   npx vite-node scripts/audit/quick-tests.ts -- --all-cases   (every stored household)
 */
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";

const root = path.resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2).filter((a) => a !== "--");
const { vol, engine } = loadVolume(root, "co");
const caseIds: string[] = [];
const names: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--case") caseIds.push(args[++i]);
  else if (!args[i].startsWith("--")) names.push(args[i]);
}
const allTests = args.includes("--all-tests");
const allCases = args.includes("--all-cases");
let run = 0, failed = 0;
for (const it of vol.items) {
  if (!allTests && !names.includes(it.id) && !names.includes(it.identifier)) continue;
  for (const t of it.tests ?? []) {
    run++;
    const r = engine.runTest(it, t);
    if (!r.ok) {
      failed++;
      console.log(`FAIL ${t.id} (${it.identifier}): expected ${JSON.stringify(t.expect)} got ${JSON.stringify(r.got)}${r.err ? " error " + r.err : ""}`);
    }
  }
}
for (const c of vol.cases) {
  if (!allCases && !caseIds.includes(c.id)) continue;
  const rep = engine.runCase(c);
  for (const row of rep.results) {
    run++;
    if (!row.ok) {
      failed++;
      console.log(`FAIL ${c.id} ${row.person} ${row.identifier} ${row.month ?? ""}: expected ${JSON.stringify(row.expect)} got ${JSON.stringify(row.got)}${row.err ? " error " + row.err : ""}`);
    }
  }
}
console.log(`${run} checked, ${failed} failed`);
