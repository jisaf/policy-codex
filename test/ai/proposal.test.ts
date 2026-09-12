import { describe, it, expect } from "vitest";
import {
  extractJson, parseExcerpts, parseProposal, proposalToItem, proposalToItems, PROPOSAL_SCHEMA,
} from "../../src/ai/proposal";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);

const good = {
  name: "Medicaid: meets the new age test", identifier: "medicaid_meets_new_age_test",
  kind: "derived", type: "yes/no", options: [], scope: "person", program: "Medicaid",
  role: "", meaning: "The person has attained age 19 and is under age 65 as newly stated.",
  precision: "", supplied_by: "", value: "",
  derived_text:
    "all of the following are true:\n" +
    "  - Age is at least Medicaid community engagement minimum age (19)\n" +
    "  - Age is less than Medicaid community engagement age ceiling (65)",
  sources: ["S1"], implemented: "engine", tags: [], open_questions: [],
  examples: ['T1: given date_of_birth="2008-03-15" => yes'],
  rationale: "Mirrors WR-200.",
};

describe("proposal parsing", () => {
  it("declares the schema the model is asked to fill", () => {
    expect((PROPOSAL_SCHEMA as any).required).toEqual(["notes", "items"]);
  });

  it("extracts JSON from a fenced block", () => {
    expect(extractJson('```json\n{"notes":"n","items":[]}\n```')).toEqual({
      notes: "n", items: [],
    });
  });

  it("extracts JSON from prose around an object", () => {
    expect(extractJson('Sure! {"notes":"n","items":[]} Hope that helps.')).toEqual({
      notes: "n", items: [],
    });
  });

  it("refuses text with no JSON object", () => {
    expect(() => extractJson("I cannot help with that.")).toThrow(
      "the model did not return JSON",
    );
  });

  it("refuses JSON with no items list", () => {
    expect(() => parseProposal('{"notes":"n"}')).toThrow(
      "the model returned JSON without an items list",
    );
  });

  it("turns a proposal item into a codex item with a parsed derivation", () => {
    const { item, errors } = proposalToItem(engine, good as never, "WR-320");
    expect(errors).toEqual([]);
    expect(item.id).toBe("WR-320");
    expect(item.identifier).toBe("medicaid_meets_new_age_test");
    expect(item.derived).toEqual([
      "all",
      [">=", "age", "medicaid_ce_min_age"],
      ["<", "age", "medicaid_ce_max_age_exclusive"],
    ]);
    expect(item.tests).toHaveLength(1);
    expect(item.tests![0].id).toBe("T1");
  });

  it("reports an unreadable derivation and example without throwing", () => {
    const bad = { ...good, derived_text: "wibble wobble", examples: ["not an example line"] };
    const { item, errors } = proposalToItem(engine, bad as never, "WR-320");
    expect(item.derived).toBeUndefined();
    expect(errors[0]).toContain('cannot read "wibble wobble"');
    expect(errors[1]).toContain("example line must look like");
  });

  it("carries the rationale onto the item", () => {
    const { item } = proposalToItem(engine, good as never, "WR-320");
    expect(item.rationale).toBe("Mirrors WR-200.");
  });
});

describe("proposalToItems", () => {
  const dup = {
    ...good,
    name: "Duplicate age fact", identifier: "duplicate_age_fact", type: "whole number",
    meaning: "Whole years elapsed from Date of Birth to the Determination Date, restated.",
    derived_text: "the number of whole years between Date of Birth and the Determination Date",
    sources: [], implemented: "assembly",
    examples: ['T1: given date_of_birth="2000-01-01"; as of 2020-01-01 => 20'],
    rationale: "Needed for a second reading of the same rule.",
  };
  const other = {
    ...good,
    name: "Medicaid: has reached the adult threshold", identifier: "medicaid_reached_adult_age",
    meaning: "A second, unrelated proposed fact: the person has reached age 21.",
    derived_text: "Age is at least 21",
    sources: [], rationale: "A second item in the same proposal.",
  };

  it("assigns sequential ids from the given start id", () => {
    const built = proposalToItems(engine, { notes: "", items: [dup, other] as never }, "WR-320");
    expect(built.map((b) => b.item.id)).toEqual(["WR-320", "WR-321"]);
  });

  it("computes nearest from the ledger, not the model, for a derivation duplicate", () => {
    const built = proposalToItems(engine, { notes: "", items: [dup] as never }, "WR-320");
    expect(built[0].errors).toEqual([]);
    expect(built[0].item.nearest).toContain("WR-003");
    const candidates = engine.nearest(built[0].item);
    const wr003 = candidates.find((c) => c.id === "WR-003");
    expect(wr003?.reason).toBe("identical-derivation");
  });

  it("carries each item's rationale, so governance's rationale.required is satisfied", () => {
    const built = proposalToItems(engine, { notes: "", items: [dup, other] as never }, "WR-320");
    for (const { item } of built) {
      expect(item.rationale).toBeTruthy();
      const findings = engine.governance(item, { isNew: true });
      expect(findings.map((f) => f.rule)).not.toContain("rationale.required");
    }
  });
});

describe("parseExcerpts", () => {
  it("reads a list of citation/text excerpts", () => {
    const parsed = parseExcerpts(JSON.stringify({
      excerpts: [{ citation: "42 U.S.C. 1396a(x)", text: "quoted text" }],
    }));
    expect(parsed.excerpts).toEqual([{ citation: "42 U.S.C. 1396a(x)", text: "quoted text" }]);
  });

  it("drops malformed entries and refuses a response with no excerpts list", () => {
    const parsed = parseExcerpts(JSON.stringify({
      excerpts: [{ citation: "ok", text: "text" }, { citation: "bad" }, { text: "" }],
    }));
    expect(parsed.excerpts).toEqual([{ citation: "ok", text: "text" }]);
    expect(() => parseExcerpts('{"notes":"n"}')).toThrow(
      "the model returned JSON without an excerpts list",
    );
  });
});
