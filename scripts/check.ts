/* Phase-1 constraints, phase-2 governance, rule tests, and household cases
 * over the ledger on disk, gated against `CHECK_BASE` (default
 * `origin/main`), for every volume in codex.json (or the ones named with
 * --volume / CODEX_VOLUME); then, for each of those volumes, the conformance
 * self-check: the suite is built and the reference adapter grades it out of
 * process, and it must answer every expectation exactly (0 failed, 0
 * unimplemented, no suite notes). `--no-conformance` skips the self-check.
 * Run with `npm run check`; add `--json` for the full report on stdout, and
 * `--profile` (or CHECK_PROFILE=1) for each phase's wall time on stderr.
 * Exits non-zero when the check fails. */
import path from "node:path";
import { formatSummary, runCheck } from "../src/tools/check";
import { formatResults, selfCheck, type PreparedVolume, type SelfCheck } from "../src/tools/conform";
import { selectedVolumeIds } from "../src/tools/volumes";
import { enableProfile, formatTimings, profileEnabled } from "../src/tools/profile";

const root = path.resolve(import.meta.dirname, "..");
const json = process.argv.includes("--json");
const conformance = !process.argv.includes("--no-conformance");
if (process.argv.includes("--profile")) enableProfile();

const volumes = selectedVolumeIds(root);
const runs = volumes.map((volume) => {
  // The self-check builds its suite from the engine and the evaluations the
  // check has just made for the volume, rather than loading and evaluating
  // it again; the suite is the same either way.
  let prepared: PreparedVolume | undefined;
  const report = runCheck({
    root, volume,
    ...(conformance ? {
      share: (s) => {
        prepared = { engine: s.engine, cases: s.ledger.cases, testResults: s.testResults, caseReports: s.caseReports };
      },
    } : {}),
  });
  let self: SelfCheck | null = null;
  let selfError: string | null = null;
  if (conformance) {
    try {
      self = selfCheck(root, volume, prepared);
    } catch (ex) {
      selfError = (ex as Error).message;
    }
  }
  return { volume, report, self, selfError };
});

function ok(r: (typeof runs)[number]): boolean {
  return r.report.ok && (!conformance || (r.self !== null && r.self.ok));
}

if (json) {
  const out = runs.map((r) => ({
    volume: r.volume, ...r.report, ok: ok(r), ledgerOk: r.report.ok,
    conformance: r.self
      ? { summary: r.self.results.summary, failures: r.self.results.failures, notes: r.self.notes }
      : r.selfError ? { error: r.selfError } : null,
  }));
  process.stdout.write(JSON.stringify(out.length === 1 ? out[0] : out, null, 2) + "\n");
} else {
  for (const r of runs) {
    if (runs.length > 1) console.log(`== volume ${r.volume}`);
    console.log(formatSummary(r.report));
    if (!conformance) continue;
    if (r.selfError) {
      console.log(`conformance self-check: could not run: ${r.selfError}`);
    } else if (r.self) {
      console.log(`conformance self-check: ${formatResults(r.self.results)}`);
      for (const f of r.self.results.failures.slice(0, 20)) {
        console.log(
          `  failed: ${f.case} ${f.person ?? ""}.${f.identifier}${f.month ? "@" + f.month : ""}: ` +
            `expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.got)}`,
        );
      }
      for (const n of r.self.notes) console.log(`  suite note: ${n}`);
      console.log(r.self.ok ? "conformance self-check: OK" : "conformance self-check: FAILED");
    }
  }
}

if (profileEnabled()) process.stderr.write(formatTimings() + "\n");

process.exitCode = runs.every(ok) ? 0 : 1;
