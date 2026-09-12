import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createEngine } from "../../src/engine/engine";
import { parseVolumeFile } from "../../src/engine/yaml";
import { RESERVED } from "../../src/engine/governance";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Finding } from "../../src/engine/governance";
import type { Item, Program, Scope, VolumeMeta } from "../../src/engine/types";

const root = path.resolve(__dirname, "../..");
const meta = parseVolumeFile(
  fs.readFileSync(path.join(root, "volumes/mwr/volume.yaml"), "utf8"),
);
const engine = createEngine(ledger.items as unknown as Item[], meta, refs);

/** A synthetic item that breaks no rule, so each test changes exactly one
 *  thing and reads exactly one finding. */
function draft(over: Partial<Item> = {}): Item {
  return {
    id: "WR-900",
    name: "Draft fact",
    identifier: "draft_fact",
    kind: "supplied",
    type: "yes/no",
    scope: "person",
    program: "All",
    meaning: "A synthetic fact that exists only to exercise one governance rule.",
    supplied_by: "Test harness",
    ...over,
  };
}

const rulesOf = (f: Finding[]) => f.map((x) => x.rule);
const rule = (f: Finding[], id: string) => f.filter((x) => x.rule === id);

describe("governance", () => {
  it("passes a well-formed synthetic item", () => {
    expect(engine.governance(draft())).toEqual([]);
  });

  it("closes the program vocabulary", () => {
    const f = engine.governance(draft({ program: "TANF" as unknown as Program }));
    expect(rulesOf(f)).toContain("vocab.program");
    expect(rule(f, "vocab.program")[0].level).toBe("error");
  });

  it("closes the tag vocabulary", () => {
    const f = engine.governance(draft({ tags: ["foo"] }));
    expect(rule(f, "vocab.tag")[0].msg).toContain('"foo"');
    expect(engine.governance(draft({ tags: ["legal"] }))).toEqual([]);
  });

  it("skips the program and tag checks on a volume that declares neither", () => {
    const older = createEngine(
      ledger.items as unknown as Item[],
      { ...meta, programs: undefined, tags: undefined },
      refs,
    );
    const f = older.governance(draft({ program: "TANF" as unknown as Program, tags: ["foo"] }));
    expect(rulesOf(f)).not.toContain("vocab.program");
    expect(rulesOf(f)).not.toContain("vocab.tag");
  });

  it("closes the type and scope vocabularies", () => {
    expect(rulesOf(engine.governance(draft({ type: "colour" })))).toContain("vocab.type");
    expect(rulesOf(engine.governance(draft({ scope: "household" as Scope }))))
      .toContain("vocab.scope");
  });

  it("requires a lower_snake_case identifier", () => {
    const f = engine.governance(draft({ identifier: "Age" }));
    expect(rule(f, "name.grammar")[0].msg).toContain('"Age"');
  });

  it("requires the program prefix on a program-owned item", () => {
    const f = engine.governance(draft({
      program: "Medicaid", identifier: "in_ce_age_range", kind: "derived",
      derived: ["all", "is_pregnant"], tests: [],
    }));
    expect(rule(f, "name.prefix")[0].msg).toContain("medicaid_");
    expect(rule(f, "name.prefix")[0].level).toBe("error");
  });

  it("leaves supplied facts program-neutral and only warns on parameters", () => {
    const supplied = draft({ program: "Medicaid", identifier: "receives_care", kind: "supplied", supplied_by: "form" });
    expect(rule(engine.governance(supplied), "name.prefix")).toEqual([]);
    const param = draft({ program: "SNAP", identifier: "lookback_months", kind: "parameter", value: 3 });
    const f = rule(engine.governance(param), "name.prefix");
    expect(f).toHaveLength(1);
    expect(f[0].level).toBe("warn");
  });

  it("forbids a program prefix on a shared item", () => {
    const f = engine.governance(draft({ program: "All", identifier: "medicaid_draft_fact" }));
    expect(rule(f, "name.prefix")[0].msg).toContain("carry no program prefix");
    expect(engine.governance(draft({ program: "Medicaid", identifier: "medicaid_draft_fact" })))
      .toEqual([]);
  });

  it("reserves the pattern operators", () => {
    expect(rulesOf(engine.governance(draft({ identifier: "all" })))).toContain("name.reserved");
    expect(RESERVED.has("years_between")).toBe(true);
    expect(RESERVED.has("det_date")).toBe(true);
    expect(RESERVED.has("P")).toBe(true);
    expect(RESERVED.has("age")).toBe(false);
  });

  it("rejects a digit run that encodes a value but allows a mixed token", () => {
    const f = engine.governance(draft({ identifier: "min_age_19" }));
    expect(rule(f, "name.digits")[0].msg).toContain("19");
    expect(rulesOf(engine.governance(draft({ identifier: "w2_wages" }))))
      .not.toContain("name.digits");
  });

  it("requires supplied facts to say where the value comes from", () => {
    const f = engine.governance(draft({ supplied_by: "" }));
    expect(rulesOf(f)).toContain("supplied.source");
  });

  it("rejects a derivation that is a bare reference to another fact", () => {
    const f = engine.governance(draft({
      kind: "derived", type: "whole number", identifier: "draft_age", derived: "age",
    }));
    expect(rule(f, "derived.alias")[0].msg).toContain("age");
  });

  it("flags an identical canonical derivation and names it as the nearest item", () => {
    const copy = draft({
      id: "WR-901", kind: "derived", type: "whole number", identifier: "draft_age",
      derived: ["years_between", "date_of_birth", ["det_date"]],
    });
    expect(rule(engine.governance(copy), "dup.compact")[0].msg).toContain("WR-003");
    expect(engine.nearest(copy)[0])
      .toEqual({ id: "WR-003", identifier: "age", reason: "identical-derivation", score: 1 });
  });

  it("flags the same tree with different constants as a parameterisation", () => {
    const twin = draft({
      id: "WR-902", kind: "derived", program: "Medicaid",
      identifier: "medicaid_in_ce_age_range_alt",
      derived: ["all", [">=", "age", 21], ["<", "age", "medicaid_ce_max_age_exclusive"]],
    });
    const f = engine.governance(twin);
    expect(rule(f, "dup.shape")[0].level).toBe("warn");
    expect(rule(f, "dup.shape")[0].msg).toContain("parameterise");
    expect(rule(f, "dup.compact")).toEqual([]);
    expect(engine.nearest(twin)).toContainEqual({
      id: "WR-200", identifier: "medicaid_in_ce_age_range", reason: "same-shape", score: 0.9,
    });
  });

  it("flags a near-synonym by identifier tokens and meaning terms", () => {
    const synonym = draft({
      id: "WR-903", name: "Age in years", kind: "derived", type: "whole number",
      identifier: "age_in_years", meaning: "Whole years since Date of Birth.",
      derived: ["min", "age", 150],
    });
    const f = engine.governance(synonym);
    expect(rule(f, "dup.similar").some((x) => x.msg.includes("WR-003"))).toBe(true);
    const near = engine.nearest(synonym).find((c) => c.id === "WR-003");
    expect(near?.reason).toBe("similar");
    expect(near!.score).toBeGreaterThanOrEqual(0.5);
  });

  it("requires a rationale on a new item only", () => {
    const fresh = draft({ id: "WR-904", identifier: "draft_new_fact" });
    expect(rulesOf(engine.governance(fresh))).not.toContain("rationale.required");
    expect(rulesOf(engine.governance(fresh, { isNew: true }))).toContain("rationale.required");
    expect(engine.governance(
      { ...fresh, rationale: "Nothing in the ledger carries this form's answer." },
      { isNew: true },
    )).toEqual([]);
  });

  it("makes a new item acknowledge every identical or same-shape candidate", () => {
    const copy = draft({
      id: "WR-905", kind: "derived", type: "whole number", identifier: "draft_age",
      derived: ["years_between", "date_of_birth", ["det_date"]],
      rationale: "Kept separate on purpose.",
    });
    const missing = engine.governance(copy, { isNew: true });
    expect(rule(missing, "rationale.required")[0].msg).toContain("acknowledge nearest");
    const acknowledged = engine.governance({ ...copy, nearest: ["WR-003"] }, { isNew: true });
    expect(rule(acknowledged, "rationale.required")).toEqual([]);
  });

  it("reports a supplied fact with a single consumer, naming the consumer", () => {
    const f = engine.governance(engine.itemById("WR-007")!);
    expect(rule(f, "supplied.single-consumer")[0].level).toBe("warn");
    expect(rule(f, "supplied.single-consumer")[0].msg)
      .toContain("medicaid_is_family_caregiver_of_dependent");
  });

  it("never re-checks what the phase-1 constraints already check", () => {
    const bare = draft({ kind: "derived", type: "whole number", meaning: "", sources: [] });
    const ids = rulesOf(engine.governance(bare));
    expect(ids.some((r) => r.startsWith("meaning") || r.startsWith("sources") ||
      r.startsWith("tests"))).toBe(false);
  });

  it("produces no naming-grammar error anywhere in the ledger", () => {
    const offenders = engine.items()
      .filter((it) => rulesOf(engine.governance(it)).includes("name.grammar"))
      .map((it) => it.identifier);
    expect(offenders).toEqual([]);
  });

  it("caps the nearest list at five candidates", () => {
    for (const it of engine.items()) {
      expect(engine.nearest(it).length).toBeLessThanOrEqual(5);
    }
  });
});
