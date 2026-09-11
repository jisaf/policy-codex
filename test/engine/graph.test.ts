import { describe, it, expect } from "vitest";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const engine = createEngine(
  ledger.items as unknown as Item[],
  ledger.meta as unknown as VolumeMeta,
  refs,
);

describe("graph", () => {
  it("counts the Determination Date constant as a dependency", () => {
    expect(engine.usesOfItem("age")).toEqual(["date_of_birth", "determination_date"]);
  });

  it("inverts the edges", () => {
    expect(engine.usedBy("date_of_birth")).toEqual(["age", "age_at_month"]);
  });

  it("computes a transitive impact set", () => {
    const impact = engine.impact(["age"]);
    expect(impact).toContain("medicaid_is_dependent_child");
    expect(impact).toContain("medicaid_ce_status_at_application");
    expect(impact).not.toContain("age");
  });

  it("assigns Approach A codes in ledger order", () => {
    expect(engine.aCode("date_of_birth")).toBe("DE-001");
    expect(engine.aCode("medicaid_ce_required_hours")).toBe("RV-001");
    expect(engine.aCode("medicaid_in_ce_age_range")).toBe("RL-001");
  });

  it("projects a rule into the rules codex shape", () => {
    const p = engine.projectionA("medicaid_in_ce_age_range", { S1: "Applicable individual" });
    expect(p.ledger).toBe("Rules codex (rule)");
    expect(p.code).toBe("RL-001");
    expect(p.text).toContain("Rule           RL-001 Medicaid: is in the community engagement age range");
    expect(p.text).toContain("Evaluated per  person");
    expect(p.text).toContain("Satisfied when all of the following are true:");
    expect(p.text).toContain("                 - Age is at least");
    expect(p.text).toContain("Source         S1 Applicable individual");
  });

  it("projects a supplied fact into the data dictionary shape", () => {
    const p = engine.projectionA("date_of_birth");
    expect(p.ledger).toBe("Data dictionary (data element)");
    expect(p.text).toContain("Data element   DE-001 Date of Birth");
    expect(p.text).toContain("Cardinality    person");
  });

  it("projects a parameter into the reference value shape", () => {
    const p = engine.projectionA("medicaid_ce_required_hours");
    expect(p.ledger).toBe("Rules codex (reference value)");
    expect(p.text).toContain("Reference value  RV-001 Medicaid community engagement required hours per month");
    expect(p.text).toContain("Value            80");
    expect(p.text).toContain("State election   no");
  });
});
