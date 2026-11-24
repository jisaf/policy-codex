// Receipt records harness: the metamorphic relations of the receipts list
// (CO-5000; product-owner decision of 2026-11-23, condition 4).
//
// The same money stated in each way the record permits must give the same
// answer where the policy says it should (metamorphic.ts: MA-1 to MA-6),
// and the hand-built families must give the rule's answer. Run over the
// stored households (volumes/co/tests/cases.yaml) and the generated
// households (generate.ts: each base varied one receipt at a time).
//
// Until step E2 (docs/reviews/records-e2-h2.md) this harness also compared
// every outcome on the ledger before the migration, reading the scalar
// unearned-income facts, against the ledger on disk, and checked that each
// stored household's receipts were the translation of its old facts. The
// scalar facts, their translation and that comparison are retired: every
// household states its money in receipts alone, and its answers are checked
// by its expectations (npm run check).
//
//   npm run receipts:harness -- [--only <case>] [--out <file>] [--no-generated]
import fs from "node:fs";
import path from "node:path";
import { currentLedger, root } from "./ledgers";
import { generated } from "./generate";
import { runMetamorphic } from "./metamorphic";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const has = (k: string) => process.argv.includes(k);

export function main(): number {
  const outFile = arg("--out") ?? path.join(root, "scripts/receipts/results/harness.txt");
  const only = arg("--only");
  const t0 = Date.now();
  const L = currentLedger();
  const stored = L.ledger.cases.filter((c) => !only || c.id === only);
  const gen = has("--no-generated") ? [] : generated(L.ledger.cases).filter((c) => !only || c.id === only);
  const meta = runMetamorphic(L, [...stored, ...gen]);
  const text = [
    "# Receipt records harness: metamorphic relations", "",
    `Stored households: ${stored.length}; generated households: ${gen.length}; ${Math.round((Date.now() - t0) / 1000)} s.`, "",
    "## Metamorphic relations", "", ...meta.lines, "",
  ].join("\n");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, text);
  console.log(`stored households ${stored.length}, generated households ${gen.length}`);
  console.log(meta.lines.filter((l) => l.startsWith("|") && !l.includes("Family")).slice(0, 8).join("\n"));
  console.log(`written ${path.relative(root, outFile)}`);
  if (meta.violations) { console.log(`FAILED: ${meta.violations} metamorphic violation(s)`); return 1; }
  console.log("receipts harness: OK");
  return 0;
}

process.exitCode = main();
