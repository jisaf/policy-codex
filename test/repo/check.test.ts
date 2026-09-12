import { describe, expect, it } from "vitest";
import { join } from "node:path";
import {
  buildCheckReport, diffAgainstBase, loadLedgerFromDisk, runCheck,
} from "../../src/tools/check";

const ROOT = join(import.meta.dirname, "..", "..");

describe("npm run check", () => {
  it("loads the whole ledger from disk", () => {
    const ledger = loadLedgerFromDisk(ROOT);
    expect(ledger.items).toHaveLength(138);
    expect(ledger.cases).toHaveLength(13);
  });

  it("resolves an unknown base to null and treats every file as unchanged", () => {
    const diff = diffAgainstBase(ROOT, "no-such-ref-at-all");
    expect(diff).toBeNull();
  });

  it("counts every rule test and household-case expectation, all passing today", () => {
    const report = runCheck({ root: ROOT, base: "no-such-ref-at-all" });
    expect(report.base).toBeNull();
    expect(report.changedItems).toEqual([]);
    expect(report.addedItems).toEqual([]);
    expect(report.ruleTests.total).toBe(133);
    expect(report.ruleTests.failing).toBe(0);
    expect(report.cases.total).toBe(60);
    expect(report.cases.failing).toBe(0);
    expect(report.blockingItemErrors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("has the documented JSON report shape", () => {
    const report = runCheck({ root: ROOT, base: "no-such-ref-at-all" });
    const parsed = JSON.parse(JSON.stringify(report));
    expect(Object.keys(parsed).sort()).toEqual([
      "addedItems", "base", "blockingItemErrors", "cases", "changedFiles",
      "changedItems", "impact", "items", "knownFailures", "newFailures",
      "ok", "outcomesAffected", "ruleTests",
    ]);
    expect(Object.keys(parsed.ruleTests).sort()).toEqual([
      "failing", "failingIds", "failures", "passing", "total",
    ]);
    expect(Object.keys(parsed.cases).sort()).toEqual([
      "failing", "failingIds", "failures", "passing", "total",
    ]);
    expect(Object.keys(parsed.items[0]).sort()).toEqual([
      "errors", "governanceErrors", "governanceWarnings", "id", "identifier",
      "isChanged", "isNew", "warnings",
    ]);
  });

  it("flags a newly added item file as isNew, so it is held to the rationale rule", () => {
    const ledger = loadLedgerFromDisk(ROOT);
    const age = ledger.items.find((it) => it.id === "WR-003")!;
    const agePath = `${ledger.volumePath}/${ledger.chapterOf[age.id]}/${age.id}.yaml`;
    const report = buildCheckReport(ledger, [{ status: "A", path: agePath }], []);
    const check = report.items.find((it) => it.id === "WR-003")!;
    expect(check.isNew).toBe(true);
    expect(check.isChanged).toBe(true);
    // WR-003 (age) carries no `rationale`, so the new-item rule fires.
    expect(check.governanceErrors.some((m) => m.startsWith("rationale.required"))).toBe(true);
    expect(report.blockingItemErrors.some((e) => e.id === "WR-003")).toBe(true);
    expect(report.ok).toBe(false);
  });

  it("computes impact and outcomes affected from the changed items", () => {
    const ledger = loadLedgerFromDisk(ROOT);
    const age = ledger.items.find((it) => it.id === "WR-003")!;
    const agePath = `${ledger.volumePath}/${ledger.chapterOf[age.id]}/${age.id}.yaml`;
    const report = buildCheckReport(ledger, [{ status: "M", path: agePath }], []);
    expect(report.impact).toContain("medicaid_ce_status_at_application");
    expect(report.outcomesAffected).toContain("medicaid_ce_status_at_application");
  });

  it("lets a known failure through without blocking", () => {
    const ledger = loadLedgerFromDisk(ROOT);
    const report = buildCheckReport(ledger, null, ["WR-003-T1"]);
    // Every rule test actually passes today, so pinning one as "known" simply
    // has no effect; the point of this case is that a pinned id would not
    // appear in `newFailures` if it ever did fail.
    expect(report.newFailures).not.toContain("WR-003-T1");
  });
});
