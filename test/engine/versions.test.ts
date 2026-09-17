import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildIndex } from "../../src/engine/ledger-index";
import { evaluate, makeCase, type TraceEvent } from "../../src/engine/evaluate";
import { createEngine } from "../../src/engine/engine";
import { parseVolumeFile } from "../../src/engine/yaml";
import { inForce, paramInForce, versionInForce } from "../../src/engine/versions";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const root = path.resolve(__dirname, "../..");
const fixtureItems = ledger.items as unknown as Item[];
const meta = parseVolumeFile(fs.readFileSync(path.join(root, "volumes/mwr/volume.yaml"), "utf8"));
const engine = createEngine(fixtureItems, meta, refs);

/** Three dated values with a gap: the second ends 2026-10-01 and the third
 *  only starts a year later, and the third ends too. */
const deduction: Item = {
  id: "X-1",
  name: "SNAP standard deduction",
  identifier: "x_standard_deduction",
  kind: "parameter",
  type: "money",
  scope: "global",
  program: "All",
  meaning: "The standard deduction subtracted from a household's gross income.",
  versions: [
    { from: "2024-10-01", to: "2025-10-01", value: 198 },
    { from: "2025-10-01", to: "2026-10-01", value: 204, source: "S18" },
    { from: "2027-10-01", to: "2028-10-01", value: 210 },
  ],
  sources: ["S18"],
};

const hours: Item = {
  id: "X-2",
  name: "Hours worked in the month",
  identifier: "x_hours_worked",
  kind: "supplied",
  type: "hours",
  scope: "person",
  program: "All",
  meaning: "The hours the person worked in the month under consideration.",
  supplied_by: "Test harness",
};

const required: Item = {
  id: "X-3",
  name: "Required hours",
  identifier: "x_required_hours",
  kind: "parameter",
  type: "hours",
  scope: "global",
  program: "All",
  meaning: "The hours of work the rule requires of a person in a month.",
  value: 80,
  sources: ["S6"],
};

/** A rule that only came into force in 2027 and ends with the year. */
const meetsHours: Item = {
  id: "X-4",
  name: "Meets the hours requirement",
  identifier: "x_meets_hours",
  kind: "derived",
  type: "yes/no",
  scope: "person",
  program: "All",
  meaning: "Whether the person worked at least the required hours.",
  derived: [">=", "x_hours_worked", "x_required_hours"],
  sources: ["S6"],
  effective: { from: "2027-01-01", to: "2027-12-31" },
  implemented: "engine",
};

/** A rule that consumes the effective-dated one, so a rule out of force
 *  leaves its consumers unknown too. */
const exempt: Item = {
  id: "X-5",
  name: "Falls short of the hours requirement",
  identifier: "x_falls_short",
  kind: "derived",
  type: "yes/no",
  scope: "person",
  program: "All",
  meaning: "Whether the person did not meet the hours requirement.",
  derived: ["not", "x_meets_hours"],
  sources: ["S6"],
  implemented: "engine",
};

const ix = buildIndex([deduction, hours, required, meetsHours, exempt]);

function at(date: string, identifier: string, person: string | null = "p1"): unknown {
  const c = makeCase(ix, { id: "T", as_of: date, persons: { p1: { facts: { x_hours_worked: 90 } } } });
  return evaluate(ix, c, identifier, person, null);
}

describe("parameter versions", () => {
  it("picks the version whose range covers the date, with `to` exclusive", () => {
    expect(paramInForce(deduction, "2024-09-30")).toBe(null);
    expect(paramInForce(deduction, "2024-10-01")).toBe(198);
    expect(paramInForce(deduction, "2025-09-30")).toBe(198);
    expect(paramInForce(deduction, "2025-10-01")).toBe(204);
    expect(paramInForce(deduction, "2027-10-01")).toBe(210);
  });

  it("has no value in a gap between versions or after the last version's `to`", () => {
    expect(paramInForce(deduction, "2026-10-01")).toBe(null);
    expect(paramInForce(deduction, "2027-09-30")).toBe(null);
    expect(paramInForce(deduction, "2028-10-01")).toBe(null);
    expect(paramInForce(deduction, "2030-01-01")).toBe(null);
  });

  it("carries the version's own excerpt", () => {
    expect(versionInForce(deduction, "2025-10-01")).toEqual(
      { from: "2025-10-01", to: "2026-10-01", value: 204, source: "S18" },
    );
    expect(versionInForce(deduction, "2026-10-01")).toBe(null);
  });

  it("falls back to a plain value when the parameter carries no versions", () => {
    expect(paramInForce(required, "1999-01-01")).toBe(80);
    // The fixture parameter's one version starts 2009-07-24 and never ends.
    const wage = engine.item("federal_minimum_wage")!;
    expect(paramInForce(wage, "2009-07-23")).toBe(null);
    expect(paramInForce(wage, "2027-03-15")).toBe(7.25);
  });

  it("evaluates a versioned parameter at the determination date", () => {
    expect(at("2025-10-01", "x_standard_deduction", null)).toBe(204);
    expect(at("2026-10-01", "x_standard_deduction", null)).toBe(null);
  });

  it("lets a case's own parameters override every version", () => {
    const c = makeCase(ix, {
      id: "T", as_of: "2026-10-01", parameters: { x_standard_deduction: 1 },
    });
    expect(evaluate(ix, c, "x_standard_deduction", null, null)).toBe(1);
  });

  it("warns when consecutive versions overlap or leave a gap", () => {
    const rules = (it: Item) => engine.governance(it).filter((f) => f.rule.startsWith("versions."));
    const gap = rules(deduction);
    expect(gap.map((f) => f.rule)).toEqual(["versions.gap"]);
    expect(gap[0].level).toBe("warn");
    expect(gap[0].msg).toContain("2026-10-01");

    const overlapping: Item = {
      ...deduction,
      versions: [
        { from: "2024-10-01", to: "2025-11-01", value: 198 },
        { from: "2025-10-01", to: "2026-10-01", value: 204 },
      ],
    };
    expect(rules(overlapping).map((f) => f.rule)).toEqual(["versions.overlap"]);

    const openEnded: Item = {
      ...deduction,
      versions: [{ from: "2024-10-01", value: 198 }, { from: "2025-10-01", value: 204 }],
    };
    expect(rules(openEnded).map((f) => f.rule)).toEqual(["versions.overlap"]);

    const clean: Item = {
      ...deduction,
      versions: [
        { from: "2024-10-01", to: "2025-10-01", value: 198 },
        { from: "2025-10-01", value: 204 },
      ],
    };
    expect(rules(clean)).toEqual([]);
    expect(rules(engine.item("federal_minimum_wage")!)).toEqual([]);
  });
});

describe("rule effectivity", () => {
  it("is in force inside its range and nowhere else", () => {
    expect(inForce(meetsHours, "2026-12-31")).toBe(false);
    expect(inForce(meetsHours, "2027-01-01")).toBe(true);
    expect(inForce(meetsHours, "2027-12-31")).toBe(true);
    expect(inForce(meetsHours, "2028-01-01")).toBe(false);
    // `present` never ends, and an item with no range is always in force.
    expect(inForce({ effective: { from: "2027-01-01", to: "present" } }, "2099-01-01")).toBe(true);
    expect(inForce(exempt, "1999-01-01")).toBe(true);
  });

  it("evaluates to unknown outside the range and normally inside it", () => {
    expect(at("2027-03-15", "x_meets_hours")).toBe(true);
    expect(at("2026-12-31", "x_meets_hours")).toBe(null);
    expect(at("2028-01-01", "x_meets_hours")).toBe(null);
    // A consumer of a rule that is not in force is unknown in turn.
    expect(at("2027-03-15", "x_falls_short")).toBe(false);
    expect(at("2026-12-31", "x_falls_short")).toBe(null);
  });

  it("reports the origin `not-in-force` in the trace", () => {
    const events: TraceEvent[] = [];
    const c = makeCase(ix, {
      id: "T", as_of: "2026-12-31", persons: { p1: { facts: { x_hours_worked: 90 } } },
    });
    expect(evaluate(ix, c, "x_falls_short", "p1", null, (e) => events.push(e))).toBe(null);
    const node = events.find((e) => e.identifier === "x_meets_hours")!;
    expect(node.origin).toBe("not-in-force");
    expect(node.value).toBe(null);
    // Nothing under the rule was asked for: it never ran.
    expect(events.some((e) => e.identifier === "x_hours_worked")).toBe(false);
  });

  it("constrains the effective range to dates, or `present` at the end", () => {
    const msgs = (it: Item) => engine.constraints(it).filter((r) => !r.ok).map((r) => r.msg);
    expect(msgs(meetsHours).filter((m) => m.includes("Effective"))).toEqual([]);
    expect(msgs({ ...meetsHours, effective: { from: "2027-01-01", to: "present" } })
      .filter((m) => m.includes("Effective"))).toEqual([]);
    expect(msgs({ ...meetsHours, effective: { from: "2027-01", to: "present" } })
      .some((m) => m.includes("Effective start"))).toBe(true);
    expect(msgs({ ...meetsHours, effective: { from: "2027-01-01", to: "soon" } })
      .some((m) => m.includes("Effective end"))).toBe(true);
  });

  it("leaves the fixture item with an effective range in force on its dates", () => {
    // WR-100 runs from 2027-01-01 to present, and the fixture ledger's
    // determination date sits inside it.
    const ce = engine.itemById("WR-100")!;
    expect(inForce(ce, meta.default_as_of)).toBe(true);
  });
});
