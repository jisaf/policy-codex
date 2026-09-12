import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createEngine } from "../../src/engine/engine";
import { parseVolumeFile, stringifyItem } from "../../src/engine/yaml";
import { memoryStorage } from "../../src/credentials";
import {
  emptyChangeSet, entryKind, fileEntries, isFileUnchanged, isUnchanged, type ChangeEntry,
  type FileEntry,
} from "../../src/changes/types";
import {
  changeSetKey, discardEntry, discardFileEntry, loadChangeSet, putEntry, putFileEntry,
  saveChangeSet,
} from "../../src/changes/store";
import { applyChangeSet, changedIds } from "../../src/changes/apply";
import { clearEntries } from "../../src/changes/store";
import { validateChangeSet } from "../../src/changes/validate";
import { branchName, entryFiles, proposalBody } from "../../src/changes/serialize";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const items = ledger.items as unknown as Item[];
const engine = createEngine(items, ledger.meta as unknown as VolumeMeta, refs);
const age = engine.itemById("WR-003")!;

/** The governance rules read the declared vocabulary, so the change-set tests
 *  that exercise them build their engine on the real volume.yaml rather than
 *  the phase-1 fixture meta, which declares no programs. */
const governedMeta = parseVolumeFile(
  fs.readFileSync(path.resolve(__dirname, "../../volumes/mwr/volume.yaml"), "utf8"),
);
const governed = createEngine(items, governedMeta, refs);

/** A new Medicaid rule that repeats WR-200's tree with a different constant:
 *  a same-shape candidate the steward must acknowledge, not a clean add. */
const twin: Item = {
  id: "WR-960",
  name: "Medicaid: is in the community engagement age range (alternate)",
  identifier: "medicaid_in_ce_age_range_alt",
  kind: "derived",
  type: "yes/no",
  scope: "person",
  program: "Medicaid",
  meaning: "The person has attained age 21 and is under the community engagement maximum age.",
  derived: ["all", [">=", "age", 21], ["<", "age", "medicaid_ce_max_age_exclusive"]],
  sources: ["S1"],
  implemented: "engine",
  tests: [{ id: "WR-960-T1", given: { date_of_birth: "2008-03-15" }, expect: false }],
};

function addEntry(patch: Partial<Item> = {}): ChangeEntry {
  return { id: twin.id, chapter: "medicaid", before: null, after: { ...twin, ...patch } };
}

function editEntry(patch: Partial<Item>): ChangeEntry {
  return {
    id: "WR-003", chapter: "medicaid", before: age,
    after: { ...age, ...patch },
  };
}

describe("change-set", () => {
  it("classifies entries", () => {
    expect(entryKind(editEntry({ meaning: "x" }))).toBe("edit");
    expect(entryKind({ id: "WR-900", chapter: "snap", before: null, after: age })).toBe("add");
    expect(entryKind({ id: "WR-003", chapter: "medicaid", before: age, after: null })).toBe("delete");
    expect(isUnchanged(editEntry({}))).toBe(true);
    expect(isUnchanged(editEntry({ meaning: "changed" }))).toBe(false);
  });

  it("persists to storage under a volume and base ref key", () => {
    const storage = memoryStorage();
    expect(changeSetKey("mwr", "main")).toBe("codex.changes.mwr@main");
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, editEntry({ meaning: "A new meaning for the age fact." }));
    saveChangeSet(cs, storage);
    const back = loadChangeSet("mwr", "main", storage);
    expect(back.entries).toHaveLength(1);
    expect(back.entries[0].after!.meaning).toBe("A new meaning for the age fact.");
  });

  it("replaces an entry for the same id rather than appending", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, editEntry({ meaning: "first" }));
    cs = putEntry(cs, editEntry({ meaning: "second" }));
    expect(cs.entries).toHaveLength(1);
    expect(cs.entries[0].after!.meaning).toBe("second");
    cs = discardEntry(cs, "WR-003");
    expect(cs.entries).toHaveLength(0);
  });

  it("applies edits, adds, and deletes to the item list", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, editEntry({ meaning: "edited" }));
    cs = putEntry(cs, { id: "WR-002", chapter: "supplied", before: engine.itemById("WR-002")!, after: null });
    const applied = applyChangeSet(items, cs);
    expect(applied).toHaveLength(137);
    expect(applied.find((i) => i.id === "WR-003")!.meaning).toBe("edited");
    expect(applied.find((i) => i.id === "WR-002")).toBeUndefined();
    expect(changedIds(cs).sort()).toEqual(["WR-002", "WR-003"]);
  });

  it("validates against the ledger with the change-set applied", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, editEntry({ meaning: "short" }));
    const report = validateChangeSet(engine, cs);
    expect(report.valid).toBe(false);
    expect(report.items[0].errors).toContain(
      "Meaning is a full sentence an approver can sign",
    );
    expect(report.impact).toContain("medicaid_is_dependent_child");
  });

  it("stays invalid when a WR-003 edit does not add a source", () => {
    // WR-003 (age) has no sources on main, a pre-existing, permanent
    // constraint failure. An edit that fixes the meaning but does not add a
    // source must still report that error and remain invalid.
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, editEntry({
      meaning: "Whole years elapsed from Date of Birth to the Determination Date.",
    }));
    const report = validateChangeSet(engine, cs);
    expect(report.valid).toBe(false);
    expect(report.items[0].errors).toContain("At least one source excerpt is cited");
  });

  it("measures impact on the base graph so a delete cannot hide its dependents", () => {
    const dob = engine.itemById("WR-001")!;
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, { id: "WR-001", chapter: "supplied", before: dob, after: null });
    const report = validateChangeSet(engine, cs);
    expect(report.impact.length).toBeGreaterThan(5);
    expect(report.impact).toContain("age");
    expect(report.valid).toBe(false);
    const ageReport = report.items.find((i) => i.identifier === "age")!;
    expect(ageReport.errors.some((m) => m.includes('unknown reference "date_of_birth"'))).toBe(true);
  });

  it("reports only the errors a rename introduces on downstream items", () => {
    const dob = engine.itemById("WR-001")!;
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, {
      id: "WR-001", chapter: "supplied", before: dob,
      after: { ...dob, identifier: "date_of_birth_v2" },
    });
    const report = validateChangeSet(engine, cs);
    expect(report.impact).toContain("age");
    expect(report.valid).toBe(false);
    // WR-003 is already invalid on main for a missing source; that error is
    // not attributed to the rename, only the broken reference is.
    const ageReport = report.items.find((i) => i.id === "WR-003")!;
    expect(ageReport.errors).not.toContain("At least one source excerpt is cited");
    expect(ageReport.errors.length).toBeGreaterThan(0);
  });

  it("treats an editor round trip that changes nothing as unchanged", () => {
    const parsed = engine.parseItemBlock(engine.itemBlock(age));
    expect(parsed.errors).toEqual([]);
    const entry: ChangeEntry = {
      id: "WR-003", chapter: "medicaid", before: age, after: { ...age, ...parsed.item },
    };
    expect(isUnchanged(entry)).toBe(true);
    expect(stringifyItem(entry.after!)).toBe(stringifyItem(age));
  });

  it("is valid when the edit is sound", () => {
    const ceAgeRange = engine.itemById("WR-200")!;
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, {
      id: "WR-200", chapter: "medicaid", before: ceAgeRange,
      after: {
        ...ceAgeRange,
        meaning: "The person has attained age 19 and is under age 65, restated.",
      },
    });
    expect(validateChangeSet(engine, cs).valid).toBe(true);
  });

  it("refuses an added item that carries no rationale", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, addEntry());
    const report = validateChangeSet(governed, cs);
    expect(report.valid).toBe(false);
    const entry = report.items.find((i) => i.id === "WR-960")!;
    expect(entry.governance.map((f) => f.rule)).toContain("rationale.required");
    expect(entry.errors.some((m) => m.startsWith("A new item carries a rationale"))).toBe(true);
    expect(entry.errors.some((m) => m.startsWith("acknowledge nearest"))).toBe(true);
  });

  it("accepts the same add once it has a rationale and acknowledges the nearest", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, addEntry({
      rationale: "The renewal path uses a different lower bound, so WR-200 does not serve.",
      nearest: ["WR-200"],
    }));
    const report = validateChangeSet(governed, cs);
    expect(report.valid).toBe(true);
    const entry = report.items.find((i) => i.id === "WR-960")!;
    expect(entry.errors).toEqual([]);
    // The duplicate warning survives: it is reported, it does not block.
    expect(entry.governance.map((f) => f.rule)).toContain("dup.shape");
    expect(entry.warnings.some((m) => m.startsWith("parameterise:"))).toBe(true);
  });

  it("ratchets: a governance error the base version already carried is a warning", () => {
    // A Medicaid rule that never took the program prefix. Editing its meaning
    // must not be blocked by a naming failure the edit did not introduce.
    const legacy: Item = {
      id: "WR-950",
      name: "Medicaid: is old enough for community engagement",
      identifier: "in_ce_age_range",
      kind: "derived",
      type: "yes/no",
      scope: "person",
      program: "Medicaid",
      meaning: "The person has attained the community engagement minimum age.",
      derived: [">=", "age", "medicaid_ce_min_age"],
      sources: ["S1"],
      implemented: "engine",
      tests: [{ id: "WR-950-T1", given: { date_of_birth: "2008-03-15" }, expect: true }],
    };
    const base = createEngine([...items, legacy], governedMeta, refs);
    expect(base.governance(legacy).map((f) => f.rule)).toContain("name.prefix");

    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, {
      id: "WR-950", chapter: "medicaid", before: legacy,
      after: { ...legacy, meaning: "The person has attained the community engagement minimum age, restated." },
    });
    const report = validateChangeSet(base, cs);
    const entry = report.items.find((i) => i.id === "WR-950")!;
    const prefix = entry.governance.filter((f) => f.rule === "name.prefix");
    expect(prefix).toHaveLength(1);
    expect(prefix[0].level).toBe("warn");
    expect(entry.errors).toEqual([]);
    expect(report.valid).toBe(true);
  });

  it("writes one file per changed item and skips unchanged entries", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, editEntry({ meaning: "edited meaning that is long enough" }));
    cs = putEntry(cs, { id: "WR-002", chapter: "supplied", before: engine.itemById("WR-002")!, after: null });
    cs = putEntry(cs, { id: "WR-001", chapter: "supplied", before: engine.itemById("WR-001")!, after: engine.itemById("WR-001")! });
    const files = entryFiles(cs, "volumes/mwr");
    expect(files.map((f) => f.path)).toEqual([
      "volumes/mwr/medicaid/WR-003.yaml",
      "volumes/mwr/supplied/WR-002.yaml",
    ]);
    expect(files[0].content).toBe(stringifyItem(cs.entries[0].after!));
    expect(files[1].content).toBeNull();
  });

  it("names a branch and writes a proposal body", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, editEntry({ meaning: "edited meaning that is long enough" }));
    expect(branchName(cs, "ab12cd")).toBe("codex/mwr/ab12cd");
    const body = proposalBody(engine, cs, validateChangeSet(engine, cs));
    expect(body).toContain("- `WR-003` Age — edit");
    expect(body).toContain("## Impact");
    expect(body).toContain("medicaid_is_dependent_child");
  });

  it("writes the rationale, the nearest items, and the outcomes a change reaches", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, addEntry({
      rationale: "The renewal path uses a different lower bound, so WR-200 does not serve.",
      nearest: ["WR-200"],
    }));
    cs = putEntry(cs, editEntry({ meaning: "edited meaning that is long enough" }));
    const body = proposalBody(governed, cs, validateChangeSet(governed, cs));
    expect(body).toContain("## Rationale");
    expect(body).toContain(
      "- `WR-960` Medicaid: is in the community engagement age range (alternate): " +
        "The renewal path uses a different lower bound, so WR-200 does not serve.",
    );
    expect(body).toContain("## Nearest existing items");
    expect(body).toContain("  - `WR-200` medicaid_in_ce_age_range — same-shape (0.90), acknowledged");
    expect(body).toContain("## Outcomes affected");
    expect(body).toContain("- `medicaid_ce_status_at_application`");
  });

  it("says so plainly when nothing an outcome depends on changed", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, addEntry({ rationale: "Kept separate on purpose.", nearest: ["WR-200"] }));
    const body = proposalBody(governed, cs, validateChangeSet(governed, cs));
    expect(body).toContain("No declared program outcome is changed or downstream of a change.");
  });
});

/** A staged document: the two files the Documents view produces. */
const docYaml: FileEntry = {
  path: "volumes/mwr/documents.yaml",
  before: "- id: D-1\n  title: old\n  kind: statute\n  citation: c\n  file: documents/D-1.md\n",
  after: "- id: D-1\n  title: old\n  kind: statute\n  citation: c\n  file: documents/D-1.md\n" +
    "- id: D-2\n  title: new\n  kind: guidance\n  citation: g\n  file: documents/D-2.md\n",
  label: "documents.yaml (D-2 new)",
};
const docText: FileEntry = {
  path: "volumes/mwr/documents/D-2.md",
  before: null,
  after: "Pasted text.\n",
  label: "D-2 new",
};

describe("file entries", () => {
  it("replaces by path, discards by path, and survives a save and load", () => {
    const storage = memoryStorage();
    let cs = emptyChangeSet("mwr", "main");
    cs = putFileEntry(cs, docYaml);
    cs = putFileEntry(cs, docText);
    cs = putFileEntry(cs, { ...docYaml, label: "documents.yaml (D-2 renamed)" });
    expect(fileEntries(cs)).toHaveLength(2);
    expect(fileEntries(cs)[1].label).toBe("documents.yaml (D-2 renamed)");

    saveChangeSet(cs, storage);
    const back = loadChangeSet("mwr", "main", storage);
    expect(fileEntries(back).map((f) => f.path)).toEqual([
      "volumes/mwr/documents/D-2.md", "volumes/mwr/documents.yaml",
    ]);

    expect(fileEntries(discardFileEntry(back, "volumes/mwr/documents.yaml"))).toHaveLength(1);
    expect(fileEntries(clearEntries(back))).toHaveLength(0);
  });

  it("reads a change set persisted before file entries existed", () => {
    const storage = memoryStorage();
    storage.setItem(
      changeSetKey("mwr", "main"),
      JSON.stringify({ volume: "mwr", baseRef: "main", branch: null, prNumber: null, entries: [] }),
    );
    expect(fileEntries(loadChangeSet("mwr", "main", storage))).toEqual([]);
  });

  it("writes one file per staged entry, verbatim, after the item files", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, editEntry({ meaning: "A restated meaning long enough to sign." }));
    cs = putFileEntry(cs, docYaml);
    cs = putFileEntry(cs, docText);
    cs = putFileEntry(cs, { path: "volumes/mwr/gone.md", before: "x\n", after: null, label: "gone" });
    cs = putFileEntry(cs, { path: "volumes/mwr/same.md", before: "s\n", after: "s\n", label: "same" });
    const files = entryFiles(cs, "volumes/mwr");
    expect(files.map((f) => f.path)).toEqual([
      "volumes/mwr/medicaid/WR-003.yaml",
      "volumes/mwr/documents.yaml",
      "volumes/mwr/documents/D-2.md",
      "volumes/mwr/gone.md",
    ]);
    expect(files[2].content).toBe("Pasted text.\n");
    expect(files[3].content).toBeNull();
    expect(isFileUnchanged({ ...docText, before: docText.after })).toBe(true);
  });

  it("lists the staged files in the proposal body under their own heading", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, editEntry({ meaning: "A restated meaning long enough to sign." }));
    cs = putFileEntry(cs, docYaml);
    cs = putFileEntry(cs, docText);
    const body = proposalBody(engine, cs, validateChangeSet(engine, cs));
    expect(body).toContain("## Files");
    expect(body).toContain("- `volumes/mwr/documents.yaml` documents.yaml (D-2 new) — edit");
    expect(body).toContain("- `volumes/mwr/documents/D-2.md` D-2 new — add");
    expect(body.indexOf("## Files")).toBeLessThan(body.indexOf("## Impact"));
  });

  it("leaves the Files heading out when nothing but items is staged", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, editEntry({ meaning: "A restated meaning long enough to sign." }));
    expect(proposalBody(engine, cs, validateChangeSet(engine, cs))).not.toContain("## Files");
  });

  it("carries no impact: validation reads items only", () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putFileEntry(cs, docYaml);
    cs = putFileEntry(cs, docText);
    const report = validateChangeSet(engine, cs);
    expect(report.items).toEqual([]);
    expect(report.impact).toEqual([]);
    expect(report.valid).toBe(true);
  });
});
