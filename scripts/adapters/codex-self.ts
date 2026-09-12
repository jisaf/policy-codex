/* The reference conformance adapter: the codex engine evaluating its own
 * suite. Proves the harness (`npm run conform:self` must pass 100%) and
 * doubles as the simplest possible example of an adapter. Reads a case (or,
 * with `--batch`, every case) as JSON on stdin and writes its values as JSON
 * on stdout. See docs/conformance.md for the exact contract. */
import fs from "node:fs";
import { evaluateCase } from "./codex-self-lib";
import type { SuiteCase } from "../../src/export/conformance";

function main(): void {
  const raw = JSON.parse(fs.readFileSync(0, "utf8"));
  if (raw && Array.isArray(raw.cases)) {
    const results = (raw.cases as SuiteCase[]).map((c) => ({ id: c.id, values: evaluateCase(c) }));
    process.stdout.write(JSON.stringify({ results }));
  } else if (raw && raw.case) {
    process.stdout.write(JSON.stringify({ values: evaluateCase(raw.case as SuiteCase) }));
  } else {
    throw new Error('codex-self adapter expects {"case": ...} or {"cases": [...]} on stdin');
  }
}

main();
