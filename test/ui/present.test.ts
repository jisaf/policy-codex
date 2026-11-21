import { describe, it, expect } from "vitest";
import { createEngine } from "../../src/engine/engine";
import type { Item, VolumeMeta } from "../../src/engine/types";
import {
  clean, formatDate, formatFplPercent, formatMoney, formatNumber, formatPercent, formatValue,
  fplAnnual, fplContext, fplMonthlyBySize, isFplRate, optionLabel, personLabel, tableRows,
} from "../../src/ui/present";
import { plainRule, plainText } from "../../src/ui/plain";
import { excerptKind, unverifiedInTrace, unverifiedUpstream } from "../../src/ui/provenance";
import { noVersionReason } from "../../src/ui/Present";
import { fitInViewport } from "../../src/ui/Rich";

const meta = {
  volume: "t", title: "t", version: "1", status: "draft", default_as_of: "2026-10-01",
  approval_policy: { roles: [], by_program: {}, by_kind: {}, by_tag: {} },
  types: ["yes/no", "money", "rate", "one of", "whole number", "table keyed by household size"],
  scopes: ["person", "global"],
} as unknown as VolumeMeta;

const base = { scope: "person" as const, program: "SNAP", meaning: "m", sources: [] as string[] };
const items: Item[] = [
  { ...base, id: "T-1", name: "SNAP: meets the gross income test", identifier: "gross_ok", kind: "supplied", type: "yes/no" },
  { ...base, id: "T-2", name: "SNAP: meets the net income test", identifier: "net_ok", kind: "supplied", type: "yes/no" },
  { ...base, id: "T-3", name: "SNAP: maximum allotment", identifier: "max_allot", kind: "supplied", type: "money" },
  { ...base, id: "T-4", name: "SNAP: benefit reduction", identifier: "reduction", kind: "supplied", type: "money" },
  { ...base, id: "T-5", name: "SNAP minimum allotment", identifier: "min_allot", kind: "parameter", type: "money", scope: "global", value: 25 },
  {
    ...base, id: "T-6", name: "SNAP: allotment", identifier: "allotment", kind: "derived", type: "money",
    derived: ["case",
      [["not", ["all", "gross_ok", "net_ok"]], 0],
      ["else", ["max", "min_allot", ["max", 0, ["-", 0, ["ceil", ["-", "reduction", "max_allot"]]]]]]],
  },
  {
    ...base, id: "T-7", name: "SNAP: eligibility status", identifier: "status", kind: "derived", type: "one of",
    options: ["eligible", "ineligible_no_category", "over_gross_income_limit"],
    derived: ["case", [["not", "gross_ok"], "over_gross_income_limit"],
      ["else", ["case", [["=", "allotment", 0], "ineligible_no_category"], ["else", "eligible"]]]],
  },
  {
    ...base, id: "T-8", name: "Net income, rounded down", identifier: "floored", kind: "derived", type: "money",
    derived: ["-", 0, ["ceil", ["-", 0, "max_allot"]]],
  },
  {
    ...base, id: "T-9", name: "Capped amount", identifier: "capped", kind: "derived", type: "money",
    derived: ["min", "max_allot", "min_allot"],
  },
  {
    ...base, id: "T-10", name: "Grant, rounded down", identifier: "grant", kind: "derived", type: "money",
    derived: ["*", -1, ["ceil", ["*", -1, ["-", "max_allot", "reduction"]]]],
  },
  {
    ...base, id: "T-11", name: "Is eligible", identifier: "is_eligible", kind: "derived", type: "yes/no",
    derived: ["any", ["=", "status", "eligible"], ["in", "status", ["ineligible_no_category"]]],
  },
  {
    id: "T-12", name: "HHS poverty guideline by household size, annual", identifier: "federal_poverty_guideline_annual_table",
    kind: "parameter", type: "table keyed by household size", scope: "global", program: "All", meaning: "m",
    versions: [{ from: "2026-01-01", value: { "1": 15960, "2": 21640, "3": 27320 } }],
  },
  {
    id: "T-13", name: "Guideline each additional", identifier: "federal_poverty_guideline_annual_each_additional",
    kind: "parameter", type: "money", scope: "global", program: "All", meaning: "m",
    versions: [{ from: "2026-01-01", value: 5680 }],
  },
  {
    id: "T-14", name: "MAGI income limit, Children category, percent of FPL", identifier: "ma_income_limit_child_pct",
    kind: "parameter", type: "rate", scope: "global", program: "Medicaid", meaning: "m", value: 1.42, sources: ["S9"],
  },
];
const engine = createEngine(items, meta);

describe("formatting numbers and money", () => {
  it("removes float noise", () => {
    expect(clean(179.6400000000001)).toBe(179.64);
    expect(clean(471.29999999999995)).toBe(471.3);
  });

  it("formats money in dollars and cents", () => {
    expect(formatMoney(179.6400000000001)).toBe("$179.64");
    expect(formatMoney(106.1400000000001)).toBe("$106.14");
    expect(formatMoney(471.29999999999995)).toBe("$471.30");
    expect(formatMoney(336)).toBe("$336.00");
    expect(formatMoney(1234567.891)).toBe("$1,234,567.89");
    expect(formatMoney(-12.5)).toBe("-$12.50");
    expect(formatMoney(0)).toBe("$0.00");
  });

  it("formats plain numbers and percentages", () => {
    expect(formatNumber(1234.5)).toBe("1,234.5");
    expect(formatNumber(0.30000000000000004)).toBe("0.3");
    expect(formatNumber(-0.00000000001)).toBe("0");
    expect(formatPercent(1.42)).toBe("142%");
    expect(formatPercent(0.075)).toBe("7.5%");
    expect(formatPercent(0.3)).toBe("30%");
  });

  it("formats dates and months, and names people", () => {
    expect(formatDate("2026-10-01")).toBe("October 1, 2026");
    expect(formatDate("2026-10")).toBe("October 2026");
    expect(formatDate("soon")).toBe("soon");
    expect(personLabel("p1")).toBe("Person 1");
    expect(personLabel("p12")).toBe("Person 12");
    expect(personLabel("spouse")).toBe("Spouse");
  });
});

describe("FPL percentages", () => {
  const rate = engine.item("ma_income_limit_child_pct")!;
  const ctx = fplContext(engine, "2026-11-21")!;

  it("recognises a percent-of-FPL rate and nothing else", () => {
    expect(isFplRate(rate)).toBe(true);
    expect(isFplRate({ name: "SNAP benefit reduction rate", identifier: "snap_rate", type: "rate" })).toBe(false);
    expect(isFplRate({ name: "Buy-In premium cap, families at or below 200% FPL", identifier: "x", type: "rate" })).toBe(false);
  });

  it("reads as a percentage of FPL, with the monthly dollars for a household size", () => {
    expect(formatValue(rate, 1.42)).toBe("142% of FPL");
    expect(formatFplPercent(1.42, ctx, 3)).toBe("142% of FPL ($3,232.87 a month for a household of 3)");
    expect(formatValue(rate, 1.42, { fpl: ctx, householdSize: 1 }))
      .toBe("142% of FPL ($1,888.60 a month for a household of 1)");
  });

  it("extends the guideline past the table and lists monthly figures by size", () => {
    expect(fplAnnual(ctx, 5)).toBe(27320 + 2 * 5680);
    expect(fplMonthlyBySize(1, ctx).map((r) => formatMoney(r.monthly))).toEqual(["$1,330.00", "$1,803.33", "$2,276.67"]);
  });

  it("has no guideline before the table's first version", () => {
    expect(fplContext(engine, "2025-06-01")).toBeNull();
  });
});

describe("option labels, values and tables", () => {
  it("reads option codes as words", () => {
    expect(optionLabel(null, "ineligible_no_category")).toBe("Not eligible: no category applies");
    expect(optionLabel(null, "eligible_pace")).toBe("Eligible: PACE");
    expect(optionLabel(null, "pending_reasonable_opportunity")).toBe("Pending: reasonable opportunity");
    expect(optionLabel(null, "not_applicable_status_met")).toBe("Not applicable: status met");
    expect(optionLabel(null, "over_gross_income_limit")).toBe("Over gross income limit");
    expect(optionLabel(null, "and_cs")).toBe("AND-CS");
    expect(optionLabel(null, "limited_family_planning")).toBe("Limited family planning");
  });

  it("lets an item's own labels win", () => {
    const it = { options: ["x"], option_labels: { x: "Something else" } } as unknown as Item;
    expect(optionLabel(it, "x")).toBe("Something else");
  });

  it("formats a value by its item's type", () => {
    expect(formatValue(engine.item("gross_ok"), true)).toBe("Yes");
    expect(formatValue(engine.item("max_allot"), 179.6400000000001)).toBe("$179.64");
    expect(formatValue(engine.item("status"), "ineligible_no_category")).toBe("Not eligible: no category applies");
    expect(formatValue(engine.item("status"), null)).toBe("Unknown");
    expect(formatValue({ type: "calendar date", name: "d", identifier: "d" }, "2026-10-01")).toBe("October 1, 2026");
    expect(formatValue({ type: "group of persons", name: "g", identifier: "g" }, ["p1", "p3"])).toBe("Person 1, Person 3");
    expect(formatValue({ type: "rate", name: "Medicaid community engagement: weeks per month", identifier: "w" }, 4.33))
      .toBe("4.33");
  });

  it("renders a parameter table as rows, not the word 'table'", () => {
    const t = engine.item("federal_poverty_guideline_annual_table")!;
    const rows = tableRows(t, { "10": 5, "2": 2, "1": 1 })!;
    expect(rows.keyLabel).toBe("Household size");
    expect(rows.rows.map((r) => r.key)).toEqual(["1", "2", "10"]);
    expect(formatValue(t, { "1": 1 })).toBe("a table of 1 row");
    expect(tableRows(t, 5)).toBeNull();
  });
});

describe("plain derivations", () => {
  const text = (id: string) => plainText(plainRule(engine, engine.itemById(id)!));

  it("reads the floor idiom as rounding down, and max(0, x) as a floor at 0", () => {
    expect(text("T-6")).toBe([
      "SNAP: allotment:",
      "  If any of these is not true:",
      "    • SNAP: meets the gross income test",
      "    • SNAP: meets the net income test",
      "    then the result is 0.",
      "  Otherwise, the result is SNAP: maximum allotment minus SNAP: benefit reduction, rounded down to the whole dollar, but not less than 0, but at least SNAP minimum allotment ($25.00).",
    ].join("\n"));
    expect(text("T-8")).toBe("Net income, rounded down is SNAP: maximum allotment, rounded down to the whole dollar.");
    expect(text("T-10")).toBe("Grant, rounded down is SNAP: maximum allotment minus SNAP: benefit reduction, rounded down to the whole dollar.");
    expect(text("T-6")).not.toMatch(/0 minus/);
  });

  it("reads min against a figure as a cap", () => {
    expect(text("T-9")).toBe("Capped amount is SNAP: maximum allotment, up to SNAP minimum allotment ($25.00).");
  });

  it("flattens nested cases into Otherwise lines and labels the results", () => {
    expect(text("T-7")).toBe([
      "SNAP: eligibility status:",
      "  If SNAP: meets the gross income test is not true, the result is “Over gross income limit”.",
      "  Otherwise, if SNAP: allotment is 0, the result is “Not eligible: no category applies”.",
      "  Otherwise, the result is “Eligible”.",
    ].join("\n"));
  });

  it("reads any/all as a list, with option values as labels", () => {
    expect(text("T-11")).toBe([
      "Is eligible is yes when at least one of these is true:",
      "  • SNAP: eligibility status is Eligible",
      "  • SNAP: eligibility status is Not eligible: no category applies",
    ].join("\n"));
  });

  it("links every item it names", () => {
    const lines = plainRule(engine, engine.itemById("T-9")!);
    const refs = lines.flatMap((l) => l.parts).filter((p) => typeof p !== "string");
    expect(refs).toEqual([{ id: "max_allot", label: "SNAP: maximum allotment" }, { id: "min_allot", label: "SNAP minimum allotment" }]);
  });
});

describe("provenance", () => {
  const docs = [
    { id: "D-1", title: "t", kind: "statute" as const, citation: "c", file: "f" },
    { id: "D-2", title: "t", kind: "guidance" as const, citation: "c", file: "f", url: "https://example.gov/page" },
    { id: "D-3", title: "t", kind: "guidance" as const, citation: "c", file: "f", url: "https://example.gov/x.pdf" },
  ];

  it("labels an excerpt by its document's kind, or by its citation", () => {
    expect(excerptKind({ citation: "x", document: "D-1" }, docs)).toBe("statute");
    expect(excerptKind({ citation: "x", document: "D-2" }, docs)).toBe("web page");
    expect(excerptKind({ citation: "x", document: "D-3" }, docs)).toBe("guidance");
    expect(excerptKind({ citation: "10 CCR 2506-1 4.407" }, docs)).toBe("regulation");
    expect(excerptKind({ citation: "HCPF Operational Memo OM 25-073" }, docs)).toBe("memo");
    expect(excerptKind({ citation: "7 U.S.C. 2015(o)" }, docs)).toBe("statute");
  });

  it("finds the unverified excerpts a result rests on", () => {
    const withSource = engine.withItems(engine.items().map((it) =>
      it.identifier === "min_allot" ? { ...it, sources: ["S9"] } : it));
    const uses = unverifiedUpstream(withSource, "allotment", new Set(["S9"]));
    expect(uses.map((u) => u.item.identifier)).toEqual(["min_allot"]);
    expect(unverifiedUpstream(withSource, "allotment", new Set())).toEqual([]);
    const node = withSource.explain({ id: "x", given: { gross_ok: true, net_ok: true, max_allot: 300, reduction: 100 } }, "allotment", "p1", null);
    expect(unverifiedInTrace(node, new Set(["S9"])).map((u) => u.identifier)).toEqual(["min_allot"]);
  });

  it("says why a versioned figure has no value on a date", () => {
    const it = { versions: [{ from: "2025-01-01", to: "2026-01-01", value: 1 }, { from: "2026-07-01", to: "2028-07-01", value: 2 }], open: ["OQ-530"] };
    expect(noVersionReason(it, "2024-01-01")).toBe("No figure before January 1, 2025; see OQ-530.");
    expect(noVersionReason(it, "2026-03-01")).toBe("No version between January 1, 2026 and July 1, 2026; see OQ-530.");
    expect(noVersionReason(it, "2028-07-01")).toBe("No version in force from July 1, 2028; see OQ-530.");
    expect(noVersionReason(it, "2027-01-01")).toBeNull();
    expect(noVersionReason({}, "2027-01-01")).toBeNull();
  });
});

describe("the token card's placement", () => {
  const view = { w: 1000, h: 600 };
  it("sits below its token when it fits, above when not, and never off screen", () => {
    expect(fitInViewport({ top: 100, bottom: 120, left: 50, right: 90 }, 200, 360, view))
      .toEqual({ left: 50, top: 126 });
    expect(fitInViewport({ top: 500, bottom: 520, left: 50, right: 90 }, 200, 360, view))
      .toEqual({ left: 50, top: 294 });
    // Too tall for either side: pinned so its bottom (and its actions) show.
    expect(fitInViewport({ top: 300, bottom: 320, left: 900, right: 950 }, 500, 360, view))
      .toEqual({ left: 632, top: 92 });
    expect(fitInViewport({ top: 300, bottom: 320, left: 10, right: 50 }, 900, 360, view).top).toBe(8);
  });
});
