import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createEngine } from "../../src/engine/engine";
import { buildIndex } from "../../src/engine/ledger-index";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { parseInline } from "../../src/engine/parse";
import { inline } from "../../src/engine/render";
import { check } from "../../src/engine/check";
import { parseVolumeFile, parseItemFile, stringifyItem } from "../../src/engine/yaml";
import { parseSources, unverifiedSourceIds } from "../../src/ledger/markdown";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

// The HCPF stakeholder review (docs/reviews/stakeholder-hcpf.md, B-4, S-8,
// S-13, F-3) asked for: a governance warning on every item citing an excerpt
// marked `Verification: unverified`, item status and approval records, an
// approval rule that reaches every program whose outcomes read an item, a
// parameter type keyed by income band, and a warning when an indexed
// parameter's next version is due.

const root = path.resolve(__dirname, "../..");
const meta = parseVolumeFile(
  fs.readFileSync(path.join(root, "volumes/mwr/volume.yaml"), "utf8"),
);
const items = ledger.items as unknown as Item[];

function draft(over: Partial<Item> = {}): Item {
  return {
    id: "WR-900",
    name: "Draft fact",
    identifier: "draft_fact",
    kind: "parameter",
    type: "money",
    scope: "global",
    program: "All",
    meaning: "A synthetic parameter that exists only to exercise one governance rule.",
    value: 10,
    sources: ["S1"],
    ...over,
  };
}

describe("unverified excerpts", () => {
  const md = [
    "### S1. A quoted excerpt",
    "",
    "Document: D-1",
    "",
    "Cite. https://example.org",
    "",
    "> Quoted text.",
    "",
    "### S2. A figure that could not be fetched (unverified)",
    "",
    "Document: D-2",
    "",
    "Memo. https://example.org/memo",
    "",
    "Verification: unverified. The host refuses automated requests.",
    "",
    "> Figure: $10.",
  ].join("\n");

  it("parses the Verification line and keeps the citation", () => {
    const s = parseSources(md);
    expect(s[0].verification).toBeUndefined();
    expect(s[1].verification).toBe("unverified");
    expect(s[1].citation).toBe("Memo. https://example.org/memo");
    expect(unverifiedSourceIds(s)).toEqual(["S2"]);
  });

  it("warns on an item citing an unverified excerpt, in sources or a version", () => {
    const engine = createEngine(items, meta, { ...refs, unverifiedSourceIds: ["S2"] });
    const direct = engine.governance(draft({ sources: ["S1", "S2"] }));
    expect(direct.filter((f) => f.rule === "source.unverified").map((f) => f.level)).toEqual(["warn"]);
    const versioned = engine.governance(draft({
      value: undefined, sources: ["S1"],
      versions: [{ from: "2026-01-01", value: 10, source: "S2" }],
    }));
    expect(versioned.some((f) => f.rule === "source.unverified")).toBe(true);
    expect(engine.governance(draft()).some((f) => f.rule === "source.unverified")).toBe(false);
  });

  it("refuses Reviewed or Approved status for an item resting on an unverified excerpt", () => {
    const withParam = [...items, draft({ sources: ["S2"] }), {
      id: "WR-901", name: "Reader", identifier: "reader_of_draft", kind: "derived", type: "money",
      scope: "person", program: "All", meaning: "Reads the draft parameter for this test.",
      derived: ["+", "draft_fact", 1], sources: ["S1"], implemented: "engine", status: "Reviewed",
    } as Item];
    const engine = createEngine(withParam, meta, { ...refs, unverifiedSourceIds: ["S2"] });
    const f = engine.governance(engine.itemById("WR-901")!);
    expect(f.filter((x) => x.rule === "status.unverified").map((x) => x.level)).toEqual(["error"]);
  });
});

describe("status and approval records", () => {
  const engine = createEngine(items, meta, refs);
  it("rejects an unknown status and an undeclared role", () => {
    const f = engine.governance(draft({
      status: "Final" as unknown as Item["status"],
      approval: [{ role: "Nobody", date: "2026-11-21" }],
    }));
    expect(f.map((x) => x.rule)).toEqual(expect.arrayContaining(["status.value", "approval.role"]));
  });
  it("requires a signature from every required role before Approved", () => {
    const it0 = draft({ program: "Medicaid", identifier: "medicaid_draft_fact" });
    const roles = engine.approvals(it0);
    expect(roles.length).toBeGreaterThan(0);
    const missing = engine.governance({ ...it0, status: "Approved", approval: [] });
    expect(missing.some((x) => x.rule === "approval.missing")).toBe(true);
    const signed = engine.governance({
      ...it0, status: "Approved",
      approval: roles.map((r) => ({ role: r, by: "@org/team", date: "2026-11-21", commit: "abc1234" })),
    });
    expect(signed.some((x) => x.rule.startsWith("approval."))).toBe(false);
  });
  it("round-trips status, approval and review_by through the item file", () => {
    const it0 = draft({
      status: "Reviewed", review_by: "2027-01-01",
      approval: [{ role: "Data steward", by: "@org/data", date: "2026-11-21", commit: "abc1234" }],
    });
    const text = stringifyItem(it0);
    expect(text).toContain("status: Reviewed");
    expect(text).toMatch(/approval:\n  - \{role: "?Data steward/);
    expect(parseItemFile(text)).toEqual(parseItemFile(stringifyItem(parseItemFile(text))));
    expect(parseItemFile(text).approval![0].commit).toBe("abc1234");
  });
});

describe("approval upstream of outcomes", () => {
  const vol: VolumeMeta = {
    volume: "t", title: "t", version: "1", status: "Draft", default_as_of: "2026-10-01",
    approval_policy: {
      roles: ["A owner", "B owner"], by_program: { A: ["A owner"], B: ["B owner"] },
      by_kind: {}, by_tag: {}, upstream_of_outcomes: true,
    },
    types: ["yes/no"], scopes: ["person"],
    programs: [
      { id: "A", prefix: "a_", outcomes: ["a_out"] },
      { id: "B", prefix: "b_", outcomes: ["b_out"] },
    ],
  };
  const its: Item[] = [
    { id: "T-1", name: "a in", identifier: "a_in", kind: "supplied", type: "yes/no", scope: "person", program: "A", supplied_by: "x" },
    { id: "T-2", name: "a out", identifier: "a_out", kind: "derived", type: "yes/no", scope: "person", program: "A", derived: ["not", "a_in"], implemented: "engine" },
    { id: "T-3", name: "b out", identifier: "b_out", kind: "derived", type: "yes/no", scope: "person", program: "B", derived: ["all", "a_out", true], implemented: "engine" },
  ];
  it("adds the reading program's owner to every item its outcome reads", () => {
    const engine = createEngine(its, vol);
    expect(engine.approvals(its[0])).toEqual(["A owner", "B owner"]);
    expect(engine.approvals(its[1])).toEqual(["A owner", "B owner"]);
    expect(engine.approvals(its[2])).toEqual(["B owner"]);
    const off = createEngine(its, { ...vol, approval_policy: { ...vol.approval_policy, upstream_of_outcomes: false } });
    expect(off.approvals(its[0])).toEqual(["A owner"]);
  });
});

describe("table keyed by income band", () => {
  const its: Item[] = [
    { id: "B-1", name: "Premium bands", identifier: "premium_bands", kind: "parameter", type: "table keyed by income band", scope: "global", program: "All",
      value: { "0.40": 0, "1.33": 25, "2.00": 90, "3.00": 130, "4.50": 200 } },
    { id: "B-2", name: "Income pct", identifier: "income_pct", kind: "supplied", type: "rate", scope: "person", program: "All", supplied_by: "x" },
    { id: "B-3", name: "Premium", identifier: "premium", kind: "derived", type: "money", scope: "person", program: "All",
      derived: ["band", "premium_bands", "income_pct"], implemented: "engine" },
  ];
  const ix = buildIndex(its);
  const at = (pct: number | null) =>
    evaluate(ix, makeCase(ix, { id: "X", as_of: "2026-10-01", persons: { p1: { facts: pct === null ? {} : { income_pct: pct } } } }), "premium", "p1", null);
  it("takes the first band whose inclusive upper bound reaches the number", () => {
    expect(at(0.40)).toBe(0);
    expect(at(0.41)).toBe(25);
    expect(at(1.33)).toBe(25);
    expect(at(2.5)).toBe(130);
    expect(at(4.5)).toBe(200);
    expect(at(4.51)).toBe(null);
    expect(at(null)).toBe(null);
  });
  it("reads, renders and type-checks", () => {
    const text = inline(ix, ["band", "premium_bands", "income_pct"]);
    expect(text).toBe("Premium bands (table), for the band containing Income pct");
    expect(parseInline(ix, text)).toEqual(["band", "premium_bands", "income_pct"]);
    expect(check(ix, ["band", "premium_bands", "income_pct"], "person").type).toBe("number");
  });
});

describe("review_by on an indexed parameter", () => {
  const engine = createEngine(items, meta, refs);
  it("warns once the date has passed, not before", () => {
    const due = draft({ review_by: "2026-11-01" });
    expect(engine.governance(due, { today: "2026-11-21" }).some((f) => f.rule === "versions.review_due")).toBe(true);
    expect(engine.governance(due, { today: "2026-10-15" }).some((f) => f.rule === "versions.review_due")).toBe(false);
  });
});
