import { describe, it, expect } from "vitest";
import { GRAMMAR, RULES, glossaryText, sourcesText, systemPrompt } from "../../src/ai/prompt";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const sources = [
  { id: "S1", title: "Applicable individual", citation: "42 U.S.C. 1396a(xx)(9)(A)(i)", text: "…" },
];

describe("prompt assembly", () => {
  it("writes one glossary line per item with the parameter value", () => {
    const text = glossaryText(engine.items(), engine.lit, engine.paramValue);
    const lines = text.split("\n");
    expect(lines).toHaveLength(138);
    expect(lines[0]).toBe("WR-001 | Date of Birth | date_of_birth | supplied | calendar date | person | All");
    expect(text).toContain(
      "WR-100 | Medicaid community engagement required hours per month | " +
        "medicaid_ce_required_hours | parameter | hours | global | Medicaid value: 80",
    );
  });

  it("writes one source line per excerpt with a truncated citation", () => {
    expect(sourcesText(sources)).toBe(
      "S1: Applicable individual (42 U.S.C. 1396a(xx)(9)(A)(i))",
    );
  });

  it("assembles the grammar, rules, glossary, and sources", () => {
    const p = systemPrompt(engine, sources);
    expect(p).toContain("You draft items for a benefits policy codex");
    expect(p).toContain(GRAMMAR.trim().slice(0, 40));
    expect(p).toContain(RULES.trim().slice(0, 40));
    expect(p).toContain("EXISTING GLOSSARY (id | name | identifier | kind | type | scope | program)");
    expect(p).toContain("EXISTING SOURCES");
    expect(p).toContain("S1: Applicable individual");
  });
});
