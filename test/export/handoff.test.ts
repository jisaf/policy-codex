import { describe, it, expect } from "vitest";
import { handoffMarkdown } from "../../src/export/handoff";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const vol = {
  volumeId: "mwr", title: "Work requirements under H.R.1", path: "volumes/mwr",
  ref: "main", sha: null, meta: ledger.meta, items: ledger.items,
  sources: [], openQuestions: [], chapterOf: {},
} as unknown as LoadedVolume;

const md = handoffMarkdown(engine, vol);

describe("handoffMarkdown", () => {
  it("opens with the volume title and the unknown-propagation note", () => {
    expect(md.startsWith("# Engineer handoff: Work requirements under H.R.1\n")).toBe(true);
    expect(md).toContain("`unknown` propagates");
    expect(md).toContain("Generated from `volumes/mwr/`.");
  });

  it("tables the supplied facts with their consumers", () => {
    expect(md).toContain("## Supplied facts (the interface the fact-assembly layer must deliver)");
    expect(md).toContain("| `date_of_birth` | calendar date | person | All | age, age_at_month |");
  });

  it("tables the parameters with their values", () => {
    expect(md).toContain("## Parameters");
    expect(md).toContain("| `medicaid_ce_required_hours` | hours | 80 | Medicaid | S6 |");
    expect(md).toContain("| `federal_minimum_wage` | money | 7.25 | All | S18 |");
  });

  it("writes one section per derived fact with its pattern English", () => {
    expect(md).toContain("### WR-003 Age `@assembly`");
    expect(md).toContain(
      "the number of whole years between Date of Birth and the Determination Date",
    );
    expect(md).toContain("Uses: `date_of_birth`, `determination_date`.");
    expect(md).toContain("Examples: 4, all passing.");
  });

  it("covers every item exactly once", () => {
    const supplied = (md.match(/^\| `/gm) ?? []).length;
    const derived = (md.match(/^### /gm) ?? []).length;
    expect(supplied + derived).toBe(138);
  });
});
