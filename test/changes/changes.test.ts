import { describe, it, expect } from "vitest";
import { createEngine } from "../../src/engine/engine";
import { stringifyItem } from "../../src/engine/yaml";
import { memoryStorage } from "../../src/credentials";
import {
  emptyChangeSet, entryKind, isUnchanged, type ChangeEntry,
} from "../../src/changes/types";
import {
  changeSetKey, discardEntry, loadChangeSet, putEntry, saveChangeSet,
} from "../../src/changes/store";
import { applyChangeSet, changedIds } from "../../src/changes/apply";
import { validateChangeSet } from "../../src/changes/validate";
import { branchName, entryFiles, proposalBody } from "../../src/changes/serialize";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const items = ledger.items as unknown as Item[];
const engine = createEngine(items, ledger.meta as unknown as VolumeMeta, refs);
const age = engine.itemById("WR-003")!;

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
});
