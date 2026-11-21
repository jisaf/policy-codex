import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { createEngine } from "../../src/engine/engine";
import {
  buildCheckReport, checkOpenQuestions, dependencyCycles, diffAgainstBase, inputWarnings,
  loadLedgerFromDisk,
  runCheck,
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
      "addedItems", "base", "blockingItemErrors", "caseOverrides", "cases", "changedFiles",
      "changedItems", "impact", "items", "knownFailures", "newFailures",
      "ok", "openQuestions", "outcomesAffected", "ruleTests", "warnings",
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

  it("ratchets a pre-existing governance error on a merely-modified item", () => {
    // WR-302 (snap_has_responsibility_for_child_under_14) already fails
    // name.digits on HEAD, unchanged in this test's working tree, so marking
    // it modified against base "HEAD" must not block: the finding also holds
    // on the base version and downgrades to a warning.
    const ledger = loadLedgerFromDisk(ROOT);
    const wr302 = ledger.items.find((it) => it.id === "WR-302")!;
    const filePath = `${ledger.volumePath}/${ledger.chapterOf[wr302.id]}/${wr302.id}.yaml`;
    const report = buildCheckReport(
      ledger, [{ status: "M", path: filePath }], [], { root: ROOT, base: "HEAD" },
    );
    const check = report.items.find((it) => it.id === "WR-302")!;
    expect(check.isChanged).toBe(true);
    expect(check.isNew).toBe(false);
    expect(check.governanceErrors.some((m) => m.startsWith("name.digits"))).toBe(false);
    expect(check.governanceWarnings.some((m) => m.startsWith("name.digits"))).toBe(true);
    expect(report.blockingItemErrors.some((e) => e.id === "WR-302")).toBe(false);
  });

  it("still blocks a NEW governance error on a modified item, ratchet or not", () => {
    // Same item, but with an undeclared tag added in the working copy only
    // (the ledger object, not the file on disk) — vocab.tag does not hold on
    // the base version, so it is not ratcheted away.
    const ledger = loadLedgerFromDisk(ROOT);
    const wr302 = ledger.items.find((it) => it.id === "WR-302")!;
    const filePath = `${ledger.volumePath}/${ledger.chapterOf[wr302.id]}/${wr302.id}.yaml`;
    const dirtyLedger = {
      ...ledger,
      items: ledger.items.map((it) =>
        it.id === wr302.id ? { ...it, tags: [...(it.tags || []), "not_a_declared_tag"] } : it),
    };
    const report = buildCheckReport(
      dirtyLedger, [{ status: "M", path: filePath }], [], { root: ROOT, base: "HEAD" },
    );
    const check = report.items.find((it) => it.id === "WR-302")!;
    expect(check.governanceErrors.some((m) => m.startsWith("vocab.tag"))).toBe(true);
    expect(report.blockingItemErrors.some((e) => e.id === "WR-302")).toBe(true);
    expect(report.ok).toBe(false);
  });

  it("fails on a duplicated open-question heading and warns on an unknown open reference", () => {
    const ledger = loadLedgerFromDisk(ROOT);
    expect(checkOpenQuestions(ledger.questionIds, ledger.items)).toEqual({ errors: [], warnings: [] });

    const first = ledger.questionIds[0];
    const withDup = { ...ledger, questionIds: [...ledger.questionIds, first] };
    const report = buildCheckReport(withDup, null, []);
    expect(report.openQuestions.errors).toEqual([
      `open-questions.md has 2 "### ${first}." headings; each question must appear once`,
    ]);
    expect(report.ok).toBe(false);

    const item = ledger.items[0];
    const withBadRef = {
      ...ledger,
      items: ledger.items.map((it) => (it.id === item.id ? { ...it, open: ["OQ-99999"] } : it)),
    };
    const warned = buildCheckReport(withBadRef, null, []);
    expect(warned.openQuestions.errors).toEqual([]);
    expect(warned.openQuestions.warnings).toEqual([
      `${item.id} ${item.identifier}: open names OQ-99999, which open-questions.md does not have`,
    ]);
    expect(warned.ok).toBe(true);
  });

  it("fails when a household case supplies a derived identifier, unless it is a known failure", () => {
    const ledger = loadLedgerFromDisk(ROOT);
    expect(buildCheckReport(ledger, null, []).caseOverrides).toEqual([]);
    const derived = ledger.items.find((it) => it.kind === "derived" && it.scope === "person")!;
    const c = ledger.cases[0];
    const pid = Object.keys(c.persons)[0];
    const withOverride = {
      ...ledger,
      cases: [{
        ...c,
        persons: { ...c.persons, [pid]: { ...c.persons[pid], facts: { ...(c.persons[pid].facts ?? {}), [derived.identifier]: true } } },
      }, ...ledger.cases.slice(1)],
    };
    const key = `override:${c.id}:${pid}:${derived.identifier}`;
    const report = buildCheckReport(withOverride, null, []);
    expect(report.caseOverrides).toEqual([key]);
    expect(report.newFailures).toContain(key);
    expect(report.ok).toBe(false);
    expect(buildCheckReport(withOverride, null, [key]).newFailures).not.toContain(key);
  });
});

describe("check warnings about test inputs", () => {
  const ledger = loadLedgerFromDisk(ROOT, "co");
  const engine = createEngine(ledger.items, ledger.meta);
  const warnings = inputWarnings(engine, ledger);

  it("reports a parameter stated as a person fact instead of ignoring it silently", () => {
    expect(warnings).toContain(
      "CO-642-T1: p1.ssi_federal_benefit_rate_individual is a parameter, so a value stated " +
        "for a person is ignored (state an override under `parameters:`)",
    );
  });

  it("reports a person named only in a relationship triple, and an identifier no item has", () => {
    expect(warnings.some((w) =>
      w.startsWith("CO-305-T1: p2.relationships is named in a relationship triple"))).toBe(true);
    expect(warnings).toContain(
      "CO-01: p1.has_domestic_violence_waiver no item has this identifier, so it is ignored",
    );
  });

  it("reports a versioned parameter with no version on the volume's default date", () => {
    expect(warnings.some((w) =>
      w.includes("leap_income_limit_monthly: no version in force on default_as_of"))).toBe(true);
  });
});

describe("dependency cycles", () => {
  it("finds none in either volume, and finds one when it is there", () => {
    for (const volume of ["mwr", "co"]) {
      const l = loadLedgerFromDisk(ROOT, volume);
      expect(dependencyCycles(createEngine(l.items, l.meta))).toEqual([]);
    }
    const l = loadLedgerFromDisk(ROOT, "mwr");
    const mk = (identifier: string, derived: unknown) => ({
      id: "X-" + identifier, name: identifier, identifier, kind: "derived" as const,
      type: "yes/no", scope: "person" as const, program: "All", derived: derived as never,
    });
    const engine = createEngine([...l.items, mk("x_a", ["not", "x_b"]), mk("x_b", ["not", "x_a"])], l.meta);
    expect(dependencyCycles(engine)).toEqual([["x_a", "x_b", "x_a"]]);
  });
});

describe("test ids", () => {
  it("blocks a rule test id used twice", () => {
    const ledger = loadLedgerFromDisk(ROOT);
    expect(buildCheckReport(ledger, [], []).blockingItemErrors.filter((e) => e.msg.includes("used twice"))).toEqual([]);
    const it0 = ledger.items.find((it) => (it.tests || []).length > 0)!;
    const dup = { ...it0, tests: [...(it0.tests || []), { ...(it0.tests![0]) }] };
    const twice = { ...ledger, items: ledger.items.map((it) => (it === it0 ? dup : it)) };
    const errs = buildCheckReport(twice, [], []).blockingItemErrors.filter((e) => e.msg.includes("used twice"));
    expect(errs).toHaveLength(1);
    expect(errs[0].msg).toContain(it0.tests![0].id);
  });
});
