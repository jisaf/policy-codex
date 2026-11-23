import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildIndex } from "../../src/engine/ledger-index";
import { parseVolumeFile } from "../../src/engine/yaml";
import {
  changedDecisions, decisionChanges, impactFlags, parseChangeRecord, reconcileImpact,
  type ImpactFlag,
} from "../../src/engine/impact";
import { fingerprintItem } from "../../src/engine/fingerprint";
import { buildCheckReport, type LoadedLedger } from "../../src/tools/check";
import type { Item } from "../../src/engine/types";

// Change impact and sibling copies (docs/plan-colorado.md, 2026-11-23 order
// of work, step 4; docs/governance.md "Change impact"): a pull request that
// changes what an item decides lists the unchanged items that should
// probably change with it, and the check blocks until each has a recorded
// disposition.

const root = path.resolve(__dirname, "../..");
const meta = parseVolumeFile(fs.readFileSync(path.join(root, "volumes/mwr/volume.yaml"), "utf8"));
const TEXTS: Record<string, string> = {
  S1: "Earned income is wages and tips.", S2: "Rent is a shelter cost.", S3: "A broad section.",
  S9: "Another program's income rule.",
};

const sup = (id: string, identifier: string): Item => ({
  id, name: identifier, identifier, kind: "supplied", type: "money", scope: "person", program: "All",
  meaning: `The person's ${identifier}.`, supplied_by: "Application",
});
const rule = (id: string, identifier: string, program: "Medicaid" | "SNAP", derived: unknown, over: Partial<Item> = {}): Item => ({
  id, name: identifier, identifier, kind: "derived", type: "money", scope: "person", program,
  meaning: `The ${identifier}.`, derived: derived as Item["derived"], sources: ["S9"], implemented: "engine",
  tests: [{ id: `${id}-T1`, given: { test_wages: 0, test_tips: 0, test_rent: 0, test_other: 0 }, expect: 0 }],
  ...over,
});

function base(): Item[] {
  return [
    sup("WR-910", "test_wages"), sup("WR-911", "test_tips"), sup("WR-912", "test_rent"), sup("WR-913", "test_other"),
    rule("WR-920", "medicaid_test_income", "Medicaid", ["+", "test_wages", "test_tips"], {
      sources: ["S1"], siblings: [{ id: "WR-923", reason: "SNAP's copy of the same sum" }],
    }),
    // a near-duplicate path: the same two facts and one more
    rule("WR-921", "medicaid_test_income_for_verification", "Medicaid", ["+", "test_wages", "test_tips", "test_rent"]),
    // another program citing the same narrow excerpt
    rule("WR-922", "snap_test_earned", "SNAP", ["+", "test_wages", "test_other"], { sources: ["S1"] }),
    // the registered sibling
    rule("WR-923", "snap_test_income", "SNAP", ["+", "test_wages", "test_tips"], {
      sources: ["S2"], siblings: [{ id: "WR-920", reason: "Medicaid's copy of the same sum" }],
    }),
    // reads only one of the same facts: not a near-duplicate
    rule("WR-924", "medicaid_test_rent_share", "Medicaid", ["*", "test_rent", 0.5]),
  ];
}
const edit = (items: Item[], id: string, over: Partial<Item>) => items.map((x) => (x.id === id ? { ...x, ...over } : x));
const basis = (items: Item[]) => ({ ix: buildIndex(items, null), sourceTexts: TEXTS });
const flagsOf = (before: Item[], after: Item[]): ImpactFlag[] => {
  const changed = changedDecisions(before, after);
  return impactFlags(basis(after), changed, new Set(changed.keys()));
};
const decisionEdit = (items: Item[]) =>
  edit(items, "WR-920", { derived: ["+", "test_wages", ["*", "test_tips", 0.5]] });

describe("change impact flags", () => {
  it("flags the unchanged sibling, same-excerpt and near-duplicate items of a changed decision", () => {
    const flags = flagsOf(base(), decisionEdit(base()));
    expect(flags.map((f) => [f.changed, f.flagged])).toEqual([
      ["WR-920", "WR-921"], ["WR-920", "WR-922"], ["WR-920", "WR-923"],
    ]);
    const why = Object.fromEntries(flags.map((f) => [f.flagged, f.signals]));
    expect(why["WR-921"]).toEqual(["same facts: test_tips, test_wages"]);
    expect(why["WR-922"]).toEqual(["excerpt S1"]);
    expect(why["WR-923"]).toEqual(["sibling: SNAP's copy of the same sum"]);
    expect(flags[0].fields).toEqual(["derived"]);
    expect(flags[0].fingerprint).toBe(fingerprintItem(basis(decisionEdit(base())), decisionEdit(base())[4]));
  });

  it("raises nothing for a wording-only change", () => {
    const after = edit(base(), "WR-920", {
      name: "Renamed", precision: "Exact to the cent.", rationale: "Why.", tags: ["legal"],
      meaning: "The   medicaid_test_income.", tests: [],
    });
    expect(decisionChanges(base()[4], after[4])).toEqual([]);
    expect(flagsOf(base(), after)).toEqual([]);
  });

  it("raises nothing for a change to the link declarations alone", () => {
    const after = edit(base(), "WR-920", { accepts_from: [{ from: "test_wages", class: "primitive", source: "S1" }] });
    expect(flagsOf(base(), after)).toEqual([]);
  });

  it("does not flag an item the change set also changed, or an added item", () => {
    const after = edit(decisionEdit(base()), "WR-923", { derived: ["+", "test_wages", ["*", "test_tips", 0.5]] });
    expect(flagsOf(base(), after).map((f) => f.flagged)).not.toContain("WR-923");
    const added = [...decisionEdit(base()), rule("WR-930", "medicaid_test_new", "Medicaid", ["+", "test_wages", "test_tips"], { sources: ["S1"] })];
    const changed = changedDecisions(base(), added);
    const flags = impactFlags(basis(added), changed, new Set([...changed.keys(), "WR-930"]));
    expect(flags.map((f) => f.flagged)).not.toContain("WR-930");
  });

  it("does not flag on a broad excerpt (cited by more than three items)", () => {
    const broad = base().map((x) => (x.kind === "derived" ? { ...x, sources: [...(x.sources ?? []), "S3"] } : x));
    const flags = flagsOf(broad, decisionEdit(broad));
    expect(flags.flatMap((f) => f.signals).filter((s) => s.includes("S3"))).toEqual([]);
  });
});

describe("change impact dispositions", () => {
  const after = decisionEdit(base());
  const flags = flagsOf(base(), after);
  const fp = flags[0].fingerprint;
  const record = (lines: string[]) => [
    "date: 2026-11-24", "summary: Halves tips in the Medicaid test income.", "impact:", ...lines,
  ].join("\n");
  const all = record([
    `  - {changed: WR-920, fingerprint: ${fp}, flagged: WR-921, applies: "fixed in this PR through WR-920, which WR-921 now reads"}`,
    `  - {changed: WR-920, fingerprint: ${fp}, flagged: WR-922, not_applicable: "SNAP counts tips in full (S1 is SNAP's own rule here)"}`,
    `  - {changed: WR-920, fingerprint: ${fp}, flagged: WR-923, not_applicable: "SNAP's sibling keeps tips in full"}`,
  ]);

  it("clears every flag a disposition names at the changed item's fingerprint", () => {
    const parsed = parseChangeRecord(all, "volumes/mwr/changes/2026-11-24-halve-tips.yaml");
    expect(parsed.errors).toEqual([]);
    const r = reconcileImpact(flags, parsed.dispositions);
    expect(r.open).toEqual([]);
    expect(r.settled).toHaveLength(3);
  });

  it("reopens a flag when the changed item changes again after its disposition", () => {
    const parsed = parseChangeRecord(all, "volumes/mwr/changes/2026-11-24-halve-tips.yaml");
    const again = edit(after, "WR-920", { derived: ["+", "test_wages", ["*", "test_tips", 0.25]] });
    const r = reconcileImpact(flagsOf(base(), again), parsed.dispositions);
    expect(r.open.map((f) => f.flagged)).toEqual(["WR-921", "WR-922", "WR-923"]);
    expect(r.stale[0]).toMatch(/was dispositioned at fp1-.*but WR-920 is now fp1-/);
  });

  it("refuses a malformed record", () => {
    const bad = record([
      `  - {changed: WR-920, fingerprint: ${fp}, flagged: WR-921}`,
      `  - {changed: WR-920, fingerprint: ${fp}, flagged: WR-922, not_applicable: ""}`,
      `  - {changed: WR-920, fingerprint: nope, flagged: WR-923, applies: "x", not_applicable: "y"}`,
    ]);
    const { errors } = parseChangeRecord(bad, "volumes/mwr/changes/halve-tips.yaml");
    expect(errors).toEqual([
      "volumes/mwr/changes/halve-tips.yaml: a change record is named <YYYY-MM-DD>-<slug>.yaml",
      "volumes/mwr/changes/halve-tips.yaml impact[0]: records exactly one of applies or not_applicable",
      "volumes/mwr/changes/halve-tips.yaml impact[1]: not_applicable gives the reason",
      "volumes/mwr/changes/halve-tips.yaml impact[2]: records the changed item's fingerprint (fp1-...)",
      "volumes/mwr/changes/halve-tips.yaml impact[2]: records exactly one of applies or not_applicable",
    ]);
  });
});

describe("npm run check and change impact", () => {
  const loaded = (items: Item[], changeRecords: LoadedLedger["changeRecords"] = []): LoadedLedger => ({
    items, meta, chapterOf: Object.fromEntries(items.map((x) => [x.id, "test"])),
    volumePath: "volumes/mwr", cases: [], sourceIds: Object.keys(TEXTS), questionIds: [],
    sourceTexts: TEXTS, changeRecords,
  });
  const after = decisionEdit(base());
  const itemDiff = [{ status: "M", path: "volumes/mwr/test/WR-920.yaml" }];
  const recPath = "volumes/mwr/changes/2026-11-24-halve-tips.yaml";

  it("blocks on a flag with no disposition and prints a stub", () => {
    const r = buildCheckReport(loaded(after), itemDiff, [], { baseline: { items: base(), sourceTexts: TEXTS } });
    expect(r.changeImpact.open.map((f) => f.flagged)).toEqual(["WR-921", "WR-922", "WR-923"]);
    expect(r.ok).toBe(false);
  });

  it("passes once the pull request's change record dispositions every flag", () => {
    const fp = r0().changeImpact.flags[0].fingerprint;
    const text = [
      "date: 2026-11-24", "summary: Halves tips in the Medicaid test income.", "impact:",
      ...["WR-921", "WR-922", "WR-923"].map((f) => `  - {changed: WR-920, fingerprint: ${fp}, flagged: ${f}, not_applicable: "a reason"}`),
    ].join("\n");
    const r = buildCheckReport(
      loaded(after, [{ path: recPath, text }]), [...itemDiff, { status: "A", path: recPath }], [],
      { baseline: { items: base(), sourceTexts: TEXTS } },
    );
    expect(r.changeImpact.open).toEqual([]);
    expect(r.changeImpact.settled).toBe(3);
    expect(r.ok).toBe(true);
    // a record the diff does not touch is history, not this pull request's
    const old = buildCheckReport(loaded(after, [{ path: recPath, text }]), itemDiff, [], { baseline: { items: base(), sourceTexts: TEXTS } });
    expect(old.changeImpact.open).toHaveLength(3);
  });

  it("compares against the impact baseline when one is given", () => {
    const r = buildCheckReport(loaded(after), itemDiff, [], {
      baseline: { items: base(), sourceTexts: TEXTS }, impactBaseline: { ref: "since", items: after },
    });
    expect(r.changeImpact.base).toBe("since");
    expect(r.changeImpact.flags).toEqual([]);
  });

  function r0() {
    return buildCheckReport(loaded(after), itemDiff, [], { baseline: { items: base(), sourceTexts: TEXTS } });
  }
});
