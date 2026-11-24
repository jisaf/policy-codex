/* The report-only checks of `npm run check` (docs/governance.md "Report-only
 * checks", src/tools/report-checks.ts): each prints and counts its findings,
 * and blocks only when its switch is on. */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createEngine } from "../../src/engine/engine";
import { parseVolumeFile } from "../../src/engine/yaml";
import { buildCheckReport, formatSummary, type LoadedLedger } from "../../src/tools/check";
import {
  REPORT_CHECKS, benefitStatusFindings, declaredDefault, ignoredDeclaredDefaults, readsBare, receivedIn,
  regulationProgram, reportCheckBlocks, runReportChecks, sharedItemsOfOneProgram,
} from "../../src/tools/report-checks";
import type { HouseholdCase } from "../../src/engine/cases";
import type { Item, VolumeMeta } from "../../src/engine/types";

const root = path.resolve(__dirname, "../..");
const coMeta = parseVolumeFile(fs.readFileSync(path.join(root, "volumes/co/volume.yaml"), "utf8"));

const fact = (id: string, identifier: string, over: Partial<Item> = {}): Item => ({
  id, name: identifier, identifier, kind: "supplied", type: "yes/no", scope: "person", program: "All",
  meaning: `Whether ${identifier}.`, supplied_by: "Application", ...over,
});
const rule = (id: string, identifier: string, program: string, derived: unknown, over: Partial<Item> = {}): Item => ({
  id, name: identifier, identifier, kind: "derived", type: "yes/no", scope: "person", program: program as Item["program"],
  meaning: `Whether ${identifier}.`, derived: derived as Item["derived"], implemented: "engine", ...over,
});

function engineOf(items: Item[], meta: VolumeMeta = coMeta) {
  return createEngine(items, meta);
}

describe("report-only check 1: ignored declared defaults (FB-06)", () => {
  it("reads a default declared in a fact's precision, with the programs named before its verb", () => {
    const d = declaredDefault(fact("CO-9001", "is_referred", {
      program: "CCCAP", precision: "One value for the case. If not stated, CCCAP reads this as false: a referral is made by the county (S1).",
    }));
    expect(d?.programs).toEqual(["CCCAP"]);
    const d2 = declaredDefault(fact("CO-9002", "is_minor", {
      precision: "If not stated, LEAP, SNAP and Medicaid read this as false (Colorado Works and Adult Financial require it, below).",
    }));
    expect(d2?.programs.sort()).toEqual(["LEAP", "Medicaid", "SNAP"]);
  });

  it("does not take history or a required fact for a declared default", () => {
    for (const precision of [
      "Required where read: not stated, it cannot be determined (decision 4).",
      "Before, Colorado Works read an unstated value as false; it is no longer read as false when unstated.",
      "Left unstated (unknown) when no period is recorded, and the reader reads it as the application month when unstated.",
    ]) {
      expect(declaredDefault(fact("CO-9003", "x_fact", { precision }))).toBeNull();
    }
    // A quotation that says "no longer" does not unmake the statement.
    expect(declaredDefault(fact("CO-9004", "months_assigned", {
      meaning: "If not stated, Medicaid reads it as 0: months are assigned only on the event (S1: 'If one spouse dies or is no longer institutionalized').",
    }))?.programs).toEqual(["Medicaid"]);
  });

  it("knows a bare read from one under otherwise or unknown", () => {
    expect(readsBare(["all", "a_fact", "b"], "a_fact")).toBe(true);
    expect(readsBare(["otherwise", "a_fact", false], "a_fact")).toBe(false);
    expect(readsBare(["otherwise", ["of", ["P"], "a_fact"], false], "a_fact")).toBe(false);
    expect(readsBare(["unknown", "a_fact"], "a_fact")).toBe(false);
    // The default of an otherwise is read bare.
    expect(readsBare(["otherwise", "b", "a_fact"], "a_fact")).toBe(true);
  });

  it("flags a reader of the named program that reads the fact bare, and no other", () => {
    const items = [
      fact("CO-9010", "is_referred", { program: "CCCAP", precision: "If not stated, CCCAP reads this as false." }),
      rule("CO-9011", "cccap_bare", "CCCAP", ["all", "is_referred", true]),
      rule("CO-9012", "cccap_guarded", "CCCAP", ["otherwise", "is_referred", false]),
      rule("CO-9013", "snap_bare", "SNAP", ["all", "is_referred", true]),
      fact("CO-9014", "is_required_fact", { precision: "Required where read: not stated, it cannot be determined." }),
      rule("CO-9015", "cccap_reads_required", "CCCAP", ["all", "is_required_fact", true]),
    ];
    const found = ignoredDeclaredDefaults(engineOf(items));
    expect(found.map((f) => `${f.fact.id}>${f.reader.id}`)).toEqual(["CO-9010>CO-9011"]);
  });

  it("limits a default that names its reader to that reader", () => {
    const items = [
      fact("CO-9020", "has_statement", { precision: "If not stated, SNAP's test (snap_a, CO-9021) reads this as false." }),
      rule("CO-9021", "snap_a", "SNAP", ["all", "has_statement", true]),
      rule("CO-9022", "snap_b", "SNAP", ["all", "has_statement", true]),
    ];
    expect(ignoredDeclaredDefaults(engineOf(items)).map((f) => f.reader.id)).toEqual(["CO-9021"]);
  });
});

describe("report-only check 2: shared items citing or reading one program", () => {
  it("knows each program's regulations by citation", () => {
    expect(regulationProgram("7 CFR 273.1(a). https://example")).toBe("SNAP");
    expect(regulationProgram("10 CCR 2506-1-4.304.1.")).toBe("SNAP");
    expect(regulationProgram("10 CCR 2505-10 8.100.4")).toBe("Medicaid");
    expect(regulationProgram("10 CCR 2505-1 1")).toBeNull();
    expect(regulationProgram("20 CFR 416.1201")).toBeNull();
    expect(regulationProgram("8 U.S.C. 1641(b)")).toBeNull();
  });

  it("lists a shared item citing one program's regulation alone, or reading a program-prefixed item", () => {
    const items = [
      fact("CO-9030", "is_snap_shaped", { sources: ["S1", "S9"] }),
      fact("CO-9031", "is_neutral", { sources: ["S1", "S2"] }),
      fact("CO-9032", "is_snap_own", { program: "SNAP", sources: ["S1"] }),
      rule("CO-9033", "snap_thing", "SNAP", ["all", "is_neutral", true]),
      rule("CO-9034", "shared_reads_snap", "All", ["all", "snap_thing", true]),
      rule("CO-9035", "shared_in_chapter", "Medicaid", ["all", "is_neutral", true], { sources: ["S2"] }),
    ];
    const citations = { S1: "7 CFR 273.2", S2: "42 CFR 435.4", S9: "8 U.S.C. 1641" };
    const found = sharedItemsOfOneProgram({
      engine: engineOf(items), items, meta: coMeta,
      chapterOf: { "CO-9035": "shared" }, sourceCitations: citations,
    });
    expect(found.map((f) => f.item.id)).toEqual(["CO-9030", "CO-9034", "CO-9035"]);
    expect(found[0].citesOnly).toEqual({ program: "SNAP", sources: ["S1"] });
    expect(found[1].reads).toEqual([{ identifier: "snap_thing", id: "CO-9033", program: "SNAP", declared: false }]);
    expect(found[2].citesOnly?.program).toBe("Medicaid");
  });
});

describe("report-only check 3: benefit status without a receipt", () => {
  const household = (persons: HouseholdCase["persons"]): HouseholdCase => ({
    id: "C-T", title: "t", as_of: "2026-10-01", persons, expect: {},
  });

  it("places a receipt in a month by its month, its date, or its stream", () => {
    expect(receivedIn({ kind: "ssi", month: "2026-10" }, "2026-10")).toBe(true);
    expect(receivedIn({ kind: "ssi", date: "2026-09-03" }, "2026-10")).toBe(false);
    expect(receivedIn({ kind: "ssi" }, "2026-10")).toBe(true);
    expect(receivedIn({ kind: "ssi", start_date: "2026-11-01" }, "2026-10")).toBe(false);
    expect(receivedIn({ kind: "ssi", end_date: "2026-09-30" }, "2026-10")).toBe(false);
    expect(receivedIn({ kind: "ssi", frequency: "once" }, "2026-10")).toBe(false);
  });

  it("finds a status with no receipt and no reason, and a receipt with the status false, per person", () => {
    const found = benefitStatusFindings([household({
      p1: { facts: { receives_ssi: true, receipts: [] } },
      p2: { facts: { receives_ssi: true, retains_ssi_status_without_payment: true, receipts: [] } },
      p3: { facts: { receives_ssi: false, receipts: [{ kind: "ssi", amount: 900 }] } },
      p4: { facts: { receives_tanf_cash: true, receipts: [{ kind: "colorado_works_cash", amount: 300, month: "2026-10" }] } },
      p5: { facts: { adult_financial_program_received: "oap", receipts: [{ kind: "adult_financial_cash", month: "2026-09" }] } },
      p6: { facts: { adult_financial_program_received: "none", receipts: [{ kind: "adult_financial_cash" }] } },
      p7: { facts: { receipts: [{ kind: "ssi" }] } },
    })]);
    expect(found.map((f) => `${f.person} ${f.benefit} ${f.kind}`)).toEqual([
      "p1 SSI status-without-receipt",
      "p3 SSI receipt-without-status",
      "p5 Adult Financial status-without-receipt",
      "p6 Adult Financial receipt-without-status",
    ]);
    expect(found[0].othersWithReceipt).toEqual(["p3", "p7"]);
  });
});

describe("report-only checks in npm run check", () => {
  it("all start report-only, and a switch or CHECK_BLOCKING makes one blocking", () => {
    for (const c of REPORT_CHECKS) {
      expect(c.blocking).toBe(false);
      expect(reportCheckBlocks(c, "")).toBe(false);
      expect(reportCheckBlocks(c, c.id)).toBe(true);
      expect(reportCheckBlocks(c, "all")).toBe(true);
      expect(reportCheckBlocks({ ...c, blocking: true }, "")).toBe(true);
    }
  });

  it("prints and counts the findings without blocking, and blocks once switched on", () => {
    const items = [
      fact("CO-9040", "is_referred", { program: "CCCAP", precision: "If not stated, CCCAP reads this as false." }),
      rule("CO-9041", "cccap_bare", "CCCAP", ["all", "is_referred", true], { sources: ["S1"] }),
    ];
    const ledger: LoadedLedger = {
      items, meta: coMeta, chapterOf: { "CO-9040": "supplied", "CO-9041": "childcare" }, volumePath: "volumes/co",
      cases: [], sourceIds: ["S1"], questionIds: [], sourceCitations: { S1: "8 CCR 1403-1 3.118" },
    };
    const prev = process.env.CHECK_BLOCKING;
    try {
      delete process.env.CHECK_BLOCKING;
      const report = buildCheckReport(ledger, null, []);
      const r = report.reportOnly.find((c) => c.id === "ignored-default")!;
      expect(r.findings).toHaveLength(1);
      expect(r.blocking).toBe(false);
      expect(report.ok).toBe(true);
      const text = formatSummary(report);
      expect(text).toContain("ignored-default: 1 ignored declared defaults (FB-06) (not blocking)");
      expect(text).toContain("CO-9041 cccap_bare (CCCAP) reads it bare");
      process.env.CHECK_BLOCKING = "ignored-default";
      const blocked = buildCheckReport(ledger, null, []);
      expect(blocked.ok).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.CHECK_BLOCKING; else process.env.CHECK_BLOCKING = prev;
    }
    expect(runReportChecks({
      engine: engineOf(items), items, meta: coMeta, chapterOf: ledger.chapterOf,
      sourceCitations: {}, cases: [],
    }, "").map((c) => c.findings.length)).toEqual([1, 0, 0]);
  });
});
