/* The speed-ups of `npm run check` keep its results identical: the batched
 * git reads, the rule-test results shared with the constraints, and the
 * evaluations shared with the conformance suite. */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createEngine } from "../../src/engine/engine";
import { buildSuite } from "../../src/export/conformance";
import { gitShowMany, loadLedgerFromDisk } from "../../src/tools/check";
import { loadVolume } from "../../src/tools/volumes";
import type { TestResult } from "../../src/engine/evaluate";
import type { TestSpec } from "../../src/engine/types";

const ROOT = join(import.meta.dirname, "..", "..");

function gitAvailable(): boolean {
  try {
    execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("npm run check, made faster", () => {
  it.runIf(gitAvailable())("reads files at a ref in one batch, as git show prints them", () => {
    const paths = ["package.json", "volumes/mwr/volume.yaml", "no/such/file.yaml"];
    const got = gitShowMany(ROOT, "HEAD", paths);
    for (const p of paths.slice(0, 2)) {
      const want = execFileSync("git", ["show", `HEAD:${p}`], { cwd: ROOT, encoding: "utf8" });
      expect(got.get(p)).toBe(want);
    }
    expect(got.get("no/such/file.yaml")).toBeNull();
    expect(gitShowMany(ROOT, "no-such-ref-at-all", ["package.json"]).get("package.json")).toBeNull();
  });

  it("gives the same constraints whether an item's rule tests are run there or shared", () => {
    const ledger = loadLedgerFromDisk(ROOT, "mwr");
    const engine = createEngine(ledger.items, ledger.meta, {
      sourceIds: ledger.sourceIds, questionIds: ledger.questionIds,
    });
    const results = new Map<TestSpec, TestResult>();
    for (const it of ledger.items) for (const t of it.tests || []) results.set(t, engine.runTest(it, t));
    for (const it of ledger.items) {
      expect(engine.constraints(it, { testResult: (t) => results.get(t) })).toEqual(engine.constraints(it));
    }
  });

  it("builds the same conformance suite from evaluations already made", () => {
    const { vol, engine } = loadVolume(ROOT, "mwr");
    const testResults = new Map<TestSpec, TestResult>();
    for (const it of engine.items()) for (const t of it.tests || []) testResults.set(t, engine.runTest(it, t));
    const caseReports = new Map(vol.cases.map((c) => [c, engine.runCase(c)]));
    const fresh = buildSuite(engine, vol, "sha");
    const shared = buildSuite(engine, vol, "sha", { evaluated: { testResults, caseReports } });
    expect({ ...shared, codex: { ...shared.codex, generated: "" } })
      .toEqual({ ...fresh, codex: { ...fresh.codex, generated: "" } });
  });
});
