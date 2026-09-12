import { describe, it, expect } from "vitest";
import { buildIndex, indexWith } from "../../src/engine/ledger-index";
import { buildGraph } from "../../src/engine/graph";
import { block } from "../../src/engine/render";
import { renameIdentifier, referencesInCases } from "../../src/engine/rename";
import type { Item } from "../../src/engine/types";
import type { HouseholdCase } from "../../src/engine/cases";
import ledger from "../fixtures/ledger.json";

const items = ledger.items as unknown as Item[];

describe("renameIdentifier", () => {
  it("renames the item's own identifier and every item that derives from it", () => {
    const ix = buildIndex(items);
    const graph = buildGraph(ix);
    const dependents = graph.usedBy.get("date_of_birth") ?? [];
    expect(dependents).toEqual(expect.arrayContaining(["age", "age_at_month"]));

    const { changed, errors } = renameIdentifier(ix, "date_of_birth", "dob_x");
    expect(errors).toEqual([]);
    expect(changed[0].id).toBe("WR-001");
    expect(changed[0].identifier).toBe("dob_x");

    const changedIdentifiers = new Set(changed.map((i) => i.identifier));
    // The renamed item's own identifier is now "dob_x", but every direct
    // dependent kept its own identifier and is still present among the
    // changed items (found by id instead).
    const changedIds = new Set(changed.map((i) => i.id));
    for (const dep of dependents) {
      const depItem = ix.byIdentifier.get(dep)!;
      expect(changedIds.has(depItem.id)).toBe(true);
    }
    expect(changedIdentifiers.has("age")).toBe(true);
  });

  it("rewrites derived expressions to the new identifier, and they re-render", () => {
    const ix = buildIndex(items);
    const { changed } = renameIdentifier(ix, "date_of_birth", "dob_x");
    const ix2 = indexWith(ix, changed);
    const age = ix2.byIdentifier.get("age")!;
    expect(JSON.stringify(age.derived)).toContain("dob_x");
    expect(JSON.stringify(age.derived)).not.toContain("date_of_birth");
    expect(() => block(ix2, age.derived!)).not.toThrow();
    expect(block(ix2, age.derived!).join(" ")).toContain("Date of Birth");
  });

  it("drops derived_text from a rewritten derivation", () => {
    const withText = items.map((it) => (
      it.identifier === "age" ? { ...it, derived_text: "some stale pattern english" } : it
    ));
    const ix = buildIndex(withText);
    const { changed } = renameIdentifier(ix, "date_of_birth", "dob_x");
    const age = changed.find((i) => i.identifier === "age")!;
    expect(age.derived_text).toBeUndefined();
  });

  it("rewrites test `given` keys for every dependent", () => {
    const ix = buildIndex(items);
    const { changed } = renameIdentifier(ix, "date_of_birth", "dob_x");
    const age = changed.find((i) => i.identifier === "age")!;
    expect(age.tests!.length).toBeGreaterThan(0);
    for (const t of age.tests!) {
      expect(Object.keys(t.given!)).toContain("dob_x");
      expect(Object.keys(t.given!)).not.toContain("date_of_birth");
    }
  });

  it("does not touch a literal enumeration value equal to an identifier string", () => {
    const dob: Item = {
      id: "WR-001", name: "Date of Birth", identifier: "date_of_birth", kind: "supplied",
      type: "calendar date", scope: "person", program: "All",
    };
    const rule: Item = {
      id: "WR-901", name: "Uses a literal option list", identifier: "uses_literal_options",
      kind: "derived", type: "yes/no", scope: "person", program: "All",
      derived: ["in", "favorite_color", ["date_of_birth", "blue"]],
    };
    const ix = buildIndex([dob, rule]);
    const { changed, errors } = renameIdentifier(ix, "date_of_birth", "dob_x");
    expect(errors).toEqual([]);
    // Only the renamed item itself changed; the literal option list, which
    // happens to contain the string "date_of_birth", was never touched.
    expect(changed.map((i) => i.id)).toEqual(["WR-001"]);
    expect(ix.byIdentifier.get("uses_literal_options")!.derived).toEqual(
      ["in", "favorite_color", ["date_of_birth", "blue"]],
    );
  });

  it("returns errors and no changes for an invalid target", () => {
    const ix = buildIndex(items);

    const reserved = renameIdentifier(ix, "date_of_birth", "case");
    expect(reserved.changed).toEqual([]);
    expect(reserved.errors.length).toBeGreaterThan(0);

    const badGrammar = renameIdentifier(ix, "date_of_birth", "DateOfBirth");
    expect(badGrammar.changed).toEqual([]);
    expect(badGrammar.errors.length).toBeGreaterThan(0);

    const duplicate = renameIdentifier(ix, "date_of_birth", "age");
    expect(duplicate.changed).toEqual([]);
    expect(duplicate.errors.length).toBeGreaterThan(0);
  });
});

describe("referencesInCases", () => {
  it("lists, by case id, the cases whose data references the identifier", () => {
    const cases: HouseholdCase[] = [
      {
        id: "C-01", title: "has the fact directly", as_of: "2027-01-01",
        persons: { p1: { facts: { date_of_birth: "2000-01-01" } } }, expect: {},
      },
      {
        id: "C-02", title: "unrelated fact", as_of: "2027-01-01",
        persons: { p1: { facts: { is_pregnant: true } } }, expect: {},
      },
      {
        id: "C-03", title: "month-scoped fact", as_of: "2027-01-01",
        persons: { p1: { facts: {}, months: { "2027-01": { date_of_birth: "2000-01-01" } } } },
        expect: {},
      },
      {
        id: "C-04", title: "an expectation on the identifier", as_of: "2027-01-01",
        persons: { p1: { facts: { is_pregnant: true } } },
        expect: { p1: { date_of_birth: "2000-01-01" } },
      },
    ];
    expect(referencesInCases(cases, "date_of_birth")).toEqual(["C-01", "C-03", "C-04"]);
    expect(referencesInCases(cases, "is_pregnant")).toEqual(["C-02", "C-04"]);
    expect(referencesInCases(cases, "nonexistent_identifier")).toEqual([]);
  });
});
