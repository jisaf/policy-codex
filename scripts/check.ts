/* Phase-1 constraints, phase-2 governance, rule tests, and household cases
 * over the ledger on disk, gated against `CHECK_BASE` (default
 * `origin/main`). Run with `npm run check`; add `--json` for the full report
 * on stdout. Exits non-zero when the check fails. */
import path from "node:path";
import { formatSummary, runCheck } from "../src/tools/check";

const root = path.resolve(import.meta.dirname, "..");
const json = process.argv.includes("--json");

const report = runCheck({ root });

if (json) {
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
} else {
  console.log(formatSummary(report));
}

process.exitCode = report.ok ? 0 : 1;
