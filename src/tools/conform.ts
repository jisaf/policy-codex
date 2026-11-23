/* The conformance harness's engine: hands a suite to an adapter over stdin
 * and grades its answers. Shared by `scripts/conform.ts` (the CLI) and
 * `npm run check` (which runs the reference adapter, out of process, on every
 * volume's suite). See docs/conformance.md for the adapter contract. */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildSuite, gradeCase, type AdapterValue, type ConformanceResults, type Suite, type SuiteCase,
} from "../export/conformance";
import { conformanceDir, loadVolume } from "./volumes";
import { loadKnownFailures } from "./check";
import { gitShaWithDirtySuffix } from "../../scripts/git-sha";

/** The reference adapter, as `npm run conform:self` and the check run it. */
export const SELF_ADAPTER = "npx vite-node scripts/adapters/codex-self.ts";

/** Runs the adapter command once, writing `input` as JSON on its stdin and
 *  parsing its stdout as JSON. The suite's volume is also passed in the
 *  environment as CODEX_VOLUME. Throws with the adapter's stderr on a
 *  nonzero exit or unparsable output. */
export function runAdapter(command: string, input: unknown, volume: string, cwd: string): unknown {
  const res = spawnSync(command, [], {
    shell: true, cwd, input: JSON.stringify(input), encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024, env: { ...process.env, CODEX_VOLUME: volume },
  });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`adapter "${command}" exited ${res.status}: ${(res.stderr || "").slice(0, 2000)}`);
  }
  const out = res.stdout.trim();
  try {
    return JSON.parse(out);
  } catch {
    throw new Error(`adapter "${command}" did not print JSON on stdout: ${out.slice(0, 500)}`);
  }
}

/** Grades one suite against one adapter. With `batch`, the adapter is
 *  spawned once with every case; otherwise once per case. */
export function runConformance(
  suite: Suite, adapter: string, batch: boolean, cwd: string,
): ConformanceResults {
  let passed = 0;
  let failed = 0;
  let unimplemented = 0;
  const failures: ConformanceResults["failures"] = [];
  const grade = (c: SuiteCase, values: AdapterValue[]): void => {
    const r = gradeCase(c, values);
    passed += r.passed;
    failed += r.failed;
    unimplemented += r.unimplemented;
    failures.push(...r.failures);
  };
  const volume = suite.codex.volume;
  if (batch) {
    const out = runAdapter(adapter, { codex: suite.codex, cases: suite.cases }, volume, cwd) as {
      results: Array<{ id: string; values: AdapterValue[] }>;
    };
    const byId = new Map((out.results || []).map((r) => [r.id, r.values]));
    for (const c of suite.cases) grade(c, byId.get(c.id) || []);
  } else {
    for (const c of suite.cases) {
      const out = runAdapter(adapter, { codex: suite.codex, case: c }, volume, cwd) as { values: AdapterValue[] };
      grade(c, out.values || []);
    }
  }
  const summary = { cases: suite.cases.length, checked: passed + failed, passed, failed, unimplemented };
  return { codex: suite.codex, adapter, summary, failures };
}

export function formatResults(r: ConformanceResults): string {
  const s = r.summary;
  return (
    `conform (${r.adapter}) on ${r.codex.volume}@${r.codex.sha}: ${s.cases} cases, ` +
    `${s.checked} checked, ${s.passed} passed, ${s.failed} failed, ${s.unimplemented} unimplemented`
  );
}

/** Builds a volume's suite from the ledger on disk and writes it to
 *  `conformance/<volume>/suite.json`. */
export function writeSuite(root: string, volumeId: string): { suite: Suite; file: string } {
  const { vol, engine } = loadVolume(root, volumeId);
  const suite = buildSuite(engine, vol, gitShaWithDirtySuffix(root), {
    knownFailures: loadKnownFailures(root),
  });
  const dir = conformanceDir(root, volumeId);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "suite.json");
  fs.writeFileSync(file, JSON.stringify(suite, null, 2));
  return { suite, file };
}

export interface SelfCheck {
  volume: string;
  results: ConformanceResults;
  notes: string[];
  /** true when the reference adapter answers every expectation exactly and
   *  the suite has no notes. */
  ok: boolean;
}

/** The conformance self-check `npm run check` runs for every volume: build
 *  the suite, then grade the reference adapter on it out of process (batch
 *  mode, through a pipe, as any adapter is run). */
export function selfCheck(root: string, volumeId: string): SelfCheck {
  const { suite } = writeSuite(root, volumeId);
  const results = runConformance(suite, SELF_ADAPTER, true, root);
  fs.writeFileSync(
    path.join(conformanceDir(root, volumeId), "results.json"), JSON.stringify(results, null, 2),
  );
  const ok = results.summary.failed === 0 && results.summary.unimplemented === 0 && suite.notes.length === 0;
  return { volume: volumeId, results, notes: suite.notes, ok };
}
