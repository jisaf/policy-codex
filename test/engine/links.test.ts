import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createEngine } from "../../src/engine/engine";
import { parseVolumeFile } from "../../src/engine/yaml";
import { buildCheckReport, type CrossProgramAllowlist, type LoadedLedger } from "../../src/tools/check";
import type { Item, VolumeMeta } from "../../src/engine/types";

// Cross-program links (docs/plan-colorado.md, product-owner decisions of
// 2026-11-23, item 1; docs/conventions.md "Cross-program links"): a shared
// rule declares its class, and a rule reads another program's item only
// through a declared, cited link. A shared program calculation is held by the
// volume's dated allowlist, which only shrinks.

const root = path.resolve(__dirname, "../..");
const mwr = parseVolumeFile(fs.readFileSync(path.join(root, "volumes/mwr/volume.yaml"), "utf8"));
const meta: VolumeMeta = { ...mwr, link_classes: true };
const SOURCES = ["S1", "S2", "S3"];

const sup = (id: string, identifier: string, program: Item["program"] = "All"): Item => ({
  id, name: identifier, identifier, kind: "supplied", type: "money", scope: "person", program,
  meaning: `The person's ${identifier}.`, supplied_by: "Application", sources: ["S1"],
});
const rule = (id: string, identifier: string, program: Item["program"], derived: unknown, over: Partial<Item> = {}): Item => ({
  id, name: identifier, identifier, kind: "derived", type: "money", scope: "person", program,
  meaning: `The ${identifier}.`, derived: derived as Item["derived"], sources: ["S1"], implemented: "engine",
  tests: [{ id: `${id}-T1`, given: { test_wages: 0, snap_test_fact: 0 }, expect: 0 }], ...over,
});

function ledger(): Item[] {
  return [
    sup("WR-940", "test_wages"),
    sup("WR-941", "snap_test_fact", "SNAP"),
    rule("WR-942", "snap_test_income", "SNAP", ["+", "test_wages", "snap_test_fact"]),
    rule("WR-943", "test_shared_age", "All", ["*", "test_wages", 1], {
      link_class: "primitive", link_basis: "A plain fact; no program defines it differently.",
    }),
    rule("WR-944", "test_ssi_method", "All", ["*", "test_wages", 2], {
      link_class: "adopted_method", link_basis: "The SSI method, which Medicaid adopts.",
      adopted_by: [{ program: "Medicaid", source: "S2" }],
    }),
  ];
}
const engineOf = (items: Item[], m: VolumeMeta = meta) => createEngine(items, m, { sourceIds: SOURCES, questionIds: [] });
const findings = (items: Item[], it: Item, m: VolumeMeta = meta) =>
  engineOf(items, m).governance(it).filter((f) => /^(read\.cross_program|link\.|siblings\.)/.test(f.rule));
const errorsOf = (items: Item[], it: Item, m?: VolumeMeta) => findings(items, it, m).filter((f) => f.level === "error");

describe("cross-program reads", () => {
  const reader = (over: Partial<Item> = {}) =>
    rule("WR-950", "medicaid_test_reader", "Medicaid", ["+", "snap_test_income", 1], over);

  it("fails an undeclared read of another program's rule", () => {
    const it = reader();
    const e = errorsOf([...ledger(), it], it);
    expect(e.map((f) => f.rule)).toEqual(["read.cross_program"]);
    expect(e[0].msg).toContain("Medicaid rule reads SNAP's snap_test_income (WR-942) without declaring the link");
  });

  it("passes a declared read with its class and citation", () => {
    const it = reader({ accepts_from: [{ from: "snap_test_income", class: "rule_required", source: "S2" }] });
    expect(findings([...ledger(), it], it)).toEqual([]);
  });

  it("refuses a bare identifier, an unknown class, a missing citation and a primitive rule", () => {
    for (const [accepts, msg] of [
      [["snap_test_income"], "without a class and citation"],
      [[{ from: "snap_test_income", class: "program_calculation", source: "S2" }], "is not adopted_method, rule_required or primitive"],
      [[{ from: "snap_test_income", class: "rule_required", source: "S99" }], "cites S99"],
      [[{ from: "snap_test_income", class: "primitive", source: "S2" }], "only a supplied fact is read as a primitive"],
    ] as const) {
      const it = reader({ accepts_from: accepts as unknown as Item["accepts_from"] });
      const e = errorsOf([...ledger(), it], it);
      expect(e.map((f) => f.rule)).toContain("link.declaration");
      expect(e.map((f) => f.msg).join("\n")).toContain(msg);
    }
  });

  it("reads another program's supplied fact as a declared primitive", () => {
    const it = rule("WR-951", "medicaid_test_fact_reader", "Medicaid", ["+", "snap_test_fact", 1]);
    expect(errorsOf([...ledger(), it], it).map((f) => f.rule)).toEqual(["read.cross_program"]);
    const ok = { ...it, accepts_from: [{ from: "snap_test_fact", class: "primitive" as const, source: "S1" }] };
    expect(findings([...ledger(), ok], ok)).toEqual([]);
  });

  it("warns on a declaration the derivation does not read", () => {
    const it = rule("WR-952", "medicaid_test_other", "Medicaid", ["+", "test_wages", 1], {
      accepts_from: [{ from: "snap_test_income", class: "rule_required", source: "S2" }],
    });
    const f = findings([...ledger(), it], it);
    expect(f.map((x) => [x.rule, x.level])).toEqual([["link.declaration", "warn"]]);
  });

  it("lets a primitive be read by any program, and an adopted method only by an adopting one", () => {
    const prim = rule("WR-953", "snap_reads_primitive", "SNAP", ["+", "test_shared_age", 1]);
    expect(findings([...ledger(), prim], prim)).toEqual([]);
    const adopter = rule("WR-954", "medicaid_reads_method", "Medicaid", ["+", "test_ssi_method", 1]);
    expect(findings([...ledger(), adopter], adopter)).toEqual([]);
    const other = rule("WR-955", "snap_reads_method", "SNAP", ["+", "test_ssi_method", 1]);
    const e = errorsOf([...ledger(), other], other);
    expect(e.map((f) => f.rule)).toEqual(["read.cross_program"]);
    expect(e[0].msg).toContain("its adopted_by does not name SNAP as adopting");
  });

  it("keeps the pre-2026-11-23 warning on a volume that does not classify its links", () => {
    const it = reader();
    const f = findings([...ledger(), it], it, mwr);
    expect(f.map((x) => [x.rule, x.level])).toEqual([["read.cross_program", "warn"]]);
  });
});

describe("shared rules declare their class", () => {
  it("fails a shared rule with no class, a primitive with no statement, an adopted method with no adopter", () => {
    for (const [over, msg] of [
      [{}, "declares link_class"],
      [{ link_class: "primitive" }, "states in link_basis, in one line, that no program defines it differently"],
      [{ link_class: "adopted_method", link_basis: "The SSI method." }, "names each adopting program"],
      [{ link_class: "adopted_method", link_basis: "The SSI method.", adopted_by: [{ program: "Nowhere", source: "S2" }] }, "not a declared program"],
      [{ link_class: "shared" }, "is not primitive, adopted_method or program_calculation"],
    ] as const) {
      const it = rule("WR-960", "test_shared_thing", "All", ["*", "test_wages", 3], over as Partial<Item>);
      const e = errorsOf([...ledger(), it], it);
      expect(e.map((f) => f.rule)).toContain("link.class");
      expect(e.map((f) => f.msg).join("\n")).toContain(msg);
    }
  });

  it("passes a primitive with its one-line statement", () => {
    const it = ledger()[3];
    expect(findings(ledger(), it)).toEqual([]);
  });

  it("refuses a class on a program's own rule", () => {
    const it = rule("WR-961", "snap_test_classed", "SNAP", ["*", "test_wages", 3], { link_class: "primitive", link_basis: "x" });
    expect(errorsOf([...ledger(), it], it).map((f) => f.rule)).toEqual(["link.class"]);
  });
});

describe("siblings", () => {
  it("are symmetric and give a reason", () => {
    const a = rule("WR-970", "medicaid_test_copy", "Medicaid", ["*", "test_wages", 4], { siblings: [{ id: "WR-971", reason: "SNAP's copy" }] });
    const b = rule("WR-971", "snap_test_copy", "SNAP", ["*", "test_wages", 4]);
    expect(errorsOf([...ledger(), a, b], a).map((f) => f.msg)).toEqual([
      "siblings names WR-971 snap_test_copy, which does not name WR-970 back",
    ]);
    const b2 = { ...b, siblings: [{ id: "WR-970", reason: "Medicaid's copy" }] };
    expect(errorsOf([...ledger(), a, b2], a)).toEqual([]);
    expect(errorsOf([...ledger(), a, b2], b2)).toEqual([]);
  });
});

describe("npm run check and the cross-program allowlist", () => {
  const calc = rule("WR-980", "test_thirty_day_wages", "All", ["*", "test_wages", 5], {
    link_class: "program_calculation", link_basis: "Thirty-day wages two programs read with no rule requiring it.",
  });
  const readerA = rule("WR-981", "snap_reads_calc", "SNAP", ["+", "test_thirty_day_wages", 1], {
    tests: [{ id: "WR-981-T1", given: { test_wages: 0 }, expect: 1 }],
  });
  const items = () => [...ledger(), calc, readerA];
  const loaded = (allow: CrossProgramAllowlist | null): LoadedLedger => ({
    items: items(), meta, chapterOf: Object.fromEntries(items().map((x) => [x.id, "test"])),
    volumePath: "volumes/mwr", cases: [], sourceIds: SOURCES, questionIds: [], crossProgramAllowlist: allow,
  });
  const held: CrossProgramAllowlist = { date: "2026-11-23", held: [{ item: "WR-980", readers: ["WR-981"] }] };

  it("blocks a shared program calculation the allowlist does not hold", () => {
    const r = buildCheckReport(loaded(null), null, []);
    expect(r.crossProgram.errors).toHaveLength(2);
    expect(r.crossProgram.errors[0]).toContain("WR-980 test_thirty_day_wages is a shared program calculation the allowlist does not hold");
    expect(r.ok).toBe(false);
  });

  it("reports what the allowlist holds as warnings", () => {
    const r = buildCheckReport(loaded(held), null, []);
    expect(r.crossProgram).toEqual({ held: ["WR-980", "WR-980<-WR-981"], errors: [] });
    expect(r.ok).toBe(true);
  });

  it("only shrinks: an unused entry and an entry the base did not have both block", () => {
    const grown: CrossProgramAllowlist = { date: "2026-11-23", held: [{ item: "WR-980", readers: ["WR-981", "WR-999"] }] };
    const r = buildCheckReport(loaded(grown), [{ status: "M", path: "volumes/mwr/cross-program-allowlist.yaml" }], [], { baseAllowlist: held });
    expect(r.crossProgram.errors).toEqual([
      "volumes/mwr/cross-program-allowlist.yaml: WR-980<-WR-999 is no longer needed; remove it",
      "volumes/mwr/cross-program-allowlist.yaml: WR-980<-WR-999 is new; the allowlist only shrinks",
    ]);
  });
});
