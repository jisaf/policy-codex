/* The Colorado suite, built from the ledger on disk: the fixes from the
 * engineering reviews (docs/reviews/stakeholder-{drools,corticon,factgraph}.md)
 * that make it self-consistent and self-describing. */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildSuite, gradeCase, ruleTestInputs, type SuiteCase } from "../../src/export/conformance";
import { buildLedgerJson } from "../../src/export/ledger-json";
import { loadVolume, selectedVolumeIds, manifestVolumes } from "../../src/tools/volumes";
import { evaluateCase, resolveVolume } from "../../scripts/adapters/codex-self-lib";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const suite = buildSuite(engine, vol, "deadbeef");
const byId = (id: string) => suite.cases.find((c) => c.id === id)!;

describe("the co suite", () => {
  it("is current and reproduces itself from its exported form", () => {
    expect(suite.notes).toEqual([]);
    expect(suite.codex.volume).toBe("co");
  });

  it("takes a rule test's determination_date as the case's as_of (CO-1394-T5)", () => {
    const c = byId("CO-1394-T5");
    expect(c.as_of).toBe("2026-11-05");
    expect(c.persons.p1.facts?.determination_date).toBeUndefined();
  });

  it("does not make a person of someone named only in a relationship triple", () => {
    const inputs = ruleTestInputs(engine, {
      id: "X-T1", as_of: "2026-10-01", given: { date_of_birth: "1945-07-30" },
      relationships: [["spouse", "p2", "p1"] as [string, string, string]],
    });
    expect(Object.keys(inputs.persons)).toEqual(["p1"]);
    expect(inputs.audit.ignored).toContainEqual({ person: "p2", identifier: "relationships", reason: "undeclared person" });
    // CO-305-T1 declares the spouse (engineering follow-up 2), so the spouse edge is crossed.
    const c = byId("CO-305-T1");
    expect(Object.keys(c.persons)).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    expect(c.ignored).toBeUndefined();
    expect(c.expect[0].value).toEqual(["p1", "p2", "p3", "p4", "p5"]);
  });

  it("drops a parameter stated as a person fact, and says so", () => {
    const inputs = ruleTestInputs(engine, {
      id: "X-T2", as_of: "2026-10-01", given: { ssi_federal_benefit_rate_individual: 994 },
    });
    expect(inputs.persons.p1.facts?.ssi_federal_benefit_rate_individual).toBeUndefined();
    expect(inputs.audit.ignored).toContainEqual({
      person: "p1", identifier: "ssi_federal_benefit_rate_individual", reason: "parameter",
    });
    // CO-649-T1 states its hypothetical divisor under parameters:; CO-642-T1 states none, because
    // the values it pinned were the ones in force (hard-coded numbers audit T-2).
    expect(byId("CO-649-T1").parameters).toEqual({ transfer_penalty_divisor: 9000 });
    expect(byId("CO-649-T1").ignored).toBeUndefined();
    expect(byId("CO-642-T1").parameters).toBeUndefined();
    expect(byId("CO-642-T1").ignored).toBeUndefined();
  });

  it("routes a household's single-valued person-month facts to month_defaults (CO-01)", () => {
    const c = byId("CO-01");
    const p1 = c.persons.p1;
    expect(p1.month_defaults?.electronic_data_source_monthly_gross_income).toBe(2030);
    expect(p1.facts?.electronic_data_source_monthly_gross_income).toBeUndefined();
    for (const [, p] of Object.entries(c.persons)) {
      for (const k of Object.keys(p.facts ?? {})) expect(engine.item(k)?.scope).toBe("person");
    }
  });

  it("lists the derived items a case states, whose values replace their rules", () => {
    // No household case states a derived value any more (engineering follow-up pass, task 3: CO-08, CO-83).
    expect(suite.cases.filter((c) => c.kind === "household" && c.overrides?.length)).toEqual([]);
    expect(byId("CO-387-T1").overrides?.map((o) => o.identifier)).toContain("snap_eligible_household_size");
  });

  it("carries type, scope, options, role and uses on every item row", () => {
    const status = suite.items.find((i) => i.identifier === "snap_eligibility_status")!;
    expect(status.type).toBe("one of");
    expect(status.scope).toBe("person-month");
    expect(status.options?.length).toBeGreaterThan(1);
    expect(status.role).toBe("outcome");
    expect(status.uses).toContain("snap_household_ineligibility_ground");
    expect(suite.volume.relationship_roles.map((r) => r.id)).toContain("buys_prepares_with");
  });

  it("records each case's month window and each rule test's isolation", () => {
    // Medical Assistance reads each person's lottery receipts for the 120 months
    // ending with the month evaluated (OQ-216: several receipts, each spread
    // over up to 120 months), so the window starts 119 months before October 2026,
    // before SNAP's child support payment history (CO-2002), which reads back to
    // July (dual-entry audit 2.3). CCCAP's J.28 exclusion (CO-4076, CO-4077) adds the
    // irregular income of the whole calendar quarter, so the window runs to December.
    expect(byId("CO-01").months_read).toEqual({ from: "2016-11", to: "2026-12" });
    const iso = suite.cases.filter((c) => c.kind === "rule-test").map((c) => c.isolation);
    expect(iso.every((x) => x === "unit" || x === "integration")).toBe(true);
    expect(iso.filter((x) => x === "unit").length).toBeGreaterThan(500);
  });

  it("has one cannot-determine case per program outcome, with the facts it was waiting on", () => {
    const cd = suite.cases.filter((c) => c.kind === "cannot-determine");
    expect(suite.cannot_determine_gaps).toEqual([]);
    expect(new Set(cd.map((c) => c.expect[0].identifier))).toEqual(new Set(suite.volume.outcomes));
    for (const c of cd) {
      expect(c.expect).toHaveLength(1);
      expect(c.expect[0].value).toBeNull();
      const removed = c.derived_from!.removed;
      expect(c.expect[0].missing).toContainEqual(expect.objectContaining({
        person: removed.person, identifier: removed.identifier,
      }));
    }
  });

  it("is answered exactly by the reference adapter, cannot-determine cases included", () => {
    const sample: SuiteCase[] = [
      byId("CO-305-T1"), byId("CO-1394-T5"), byId("CO-642-T1"), byId("CO-01"),
      ...suite.cases.filter((c) => c.kind === "cannot-determine").slice(0, 10),
    ];
    for (const c of sample) {
      const g = gradeCase(c, evaluateCase(c, "co"));
      expect(g.failed, c.id).toBe(0);
      expect(g.unimplemented, c.id).toBe(0);
    }
  });
});

describe("the machine-readable ledger", () => {
  const json = buildLedgerJson(engine, vol, "deadbeef");
  it("carries every item with its tree, versions and edges", () => {
    expect(json.items).toHaveLength(vol.items.length);
    const hh = json.items.find((i) => i.identifier === "snap_household_members")!;
    expect(hh.derived).toEqual(engine.item("snap_household_members")!.derived);
    expect(hh.mixed_binding).toEqual(["filter", "reachable"]);
    expect(hh.derived_english?.length).toBeGreaterThan(0);
    expect(hh.used_by.length).toBeGreaterThan(0);
    const versioned = json.items.find((i) => i.kind === "parameter" && i.versions);
    expect(versioned?.versions?.[0].from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("volume selection", () => {
  it("defaults to every volume in codex.json, not the first", () => {
    expect(selectedVolumeIds(root, [], undefined)).toEqual(manifestVolumes(root).map((v) => v.id));
    expect(selectedVolumeIds(root, [], undefined)).toEqual(["mwr", "co"]);
  });
  it("takes --volume, --volume=, or CODEX_VOLUME", () => {
    expect(selectedVolumeIds(root, ["--volume", "co"], undefined)).toEqual(["co"]);
    expect(selectedVolumeIds(root, ["--volume=co,mwr"], undefined)).toEqual(["co", "mwr"]);
    expect(selectedVolumeIds(root, [], "co")).toEqual(["co"]);
    expect(() => selectedVolumeIds(root, ["--volume", "nope"], undefined)).toThrow(/no volume "nope"/);
  });
  it("the reference adapter takes the suite's volume, never a silent default", () => {
    expect(resolveVolume("co", [], undefined)).toBe("co");
    expect(resolveVolume(undefined, ["--volume", "mwr"], undefined)).toBe("mwr");
    expect(() => resolveVolume(undefined, [], undefined)).toThrow(/which volume/);
  });
});

describe("the reference adapter over a pipe", () => {
  it("reads a multi-megabyte batch from stdin to the end", () => {
    const cases = suite.cases.filter((c) => c.kind === "rule-test").slice(0, 400);
    // Padding makes the payload larger than any pipe buffer.
    const payload = JSON.stringify({ codex: suite.codex, cases, padding: "x".repeat(3_000_000) });
    const res = spawnSync("npx vite-node scripts/adapters/codex-self.ts", [], {
      shell: true, cwd: root, input: payload, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    });
    expect(res.status, res.stderr).toBe(0);
    const out = JSON.parse(res.stdout) as { results: Array<{ id: string; values: unknown[] }> };
    expect(out.results).toHaveLength(cases.length);
    let failed = 0;
    for (const c of cases) {
      const values = out.results.find((r) => r.id === c.id)!.values as Parameters<typeof gradeCase>[1];
      failed += gradeCase(c, values).failed;
    }
    expect(failed).toBe(0);
  }, 60_000);
});
