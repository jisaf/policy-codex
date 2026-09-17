/* Phase-1 constraints, phase-2 governance, rule tests, and household cases
 * over the ledger on disk, gated against `CHECK_BASE` (default
 * `origin/main`). Run with `npm run check`; add `--json` for the full report
 * on stdout. Exits non-zero when the check fails. */
import path from "node:path";
import { formatSummary, runCheck, runCheckAll } from "../src/tools/check";

const root = path.resolve(import.meta.dirname, "..");
const json = process.argv.includes("--json");

const vi = process.argv.indexOf("--volume");
const only = vi >= 0 ? process.argv[vi + 1] : (process.env.CODEX_VOLUME || null);

const runs = only
  ? [{ volume: only, report: runCheck({ root, volume: only }) }]
  : runCheckAll({ root });

if (json) {
  process.stdout.write(JSON.stringify(runs.length === 1 ? runs[0].report : runs, null, 2) + "\n");
} else {
  for (const r of runs) {
    if (runs.length > 1) console.log(`== volume ${r.volume}`);
    console.log(formatSummary(r.report));
  }
}

process.exitCode = runs.every((r) => r.report.ok) ? 0 : 1;
