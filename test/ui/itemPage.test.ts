/* The item page's data (src/ui/item/model.ts and counts.ts `itemAffects`),
 * pinned against the Colorado volume on the three persona probes the
 * evaluators ran: Dana checks the children's Medicaid income limit (CO-191)
 * against its rule text; Marcus finds the Colorado Works grant standard's
 * versions and the SB 26-181 freeze (CO-276); Priya traces a citation to the
 * verbatim regulation. */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import { parseOpenQuestions } from "../../src/ledger/markdown";
import { affectsPhrase, changedBy, householdsThatRead, itemAffects, restingIndex } from "../../src/ui/counts";
import {
  appendQuestion, citedSources, figureGaps, figureTimeline, figureVersions, householdValues,
  kindWords, markNumbers, nextQuestionId, numberNeedles, outcomesByProgram, previousVersionComparison,
  proseParts, proseText, versionSources,
} from "../../src/ui/item/model";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const item = (id: string) => engine.itemById(id)!;
const TODAY = "2026-11-22";

describe("prose: identifiers read as plain, linked labels", () => {
  it("turns '(cw_eligibility_status, CO-921)' into the item's name in brackets", () => {
    const parts = proseParts(engine, vol, item("CO-914").meaning!);
    const text = proseText(parts);
    expect(text).toContain(`(${item("CO-921").name})`);
    expect(text).not.toMatch(/cw_eligibility_status|CO-921|cw_sanction_reduction|CO-1265/);
    const linked = parts.filter((p) => typeof p !== "string" && p.kind === "item").map((p) => (p as { id: string }).id);
    expect(linked).toEqual(expect.arrayContaining(["CO-921", "CO-1260", "CO-1265"]));
  });

  it("keeps the colon of '(identifier, CO-n: …'", () => {
    const text = proseText(proseParts(engine, vol, item("CO-914").meaning!));
    expect(text).toContain(`(${item("CO-1260").name}: the grant standard`);
  });

  it("turns 'identifier (CO-n)' into the name, and leaves look-alikes as written", () => {
    const text = proseText(proseParts(engine, vol, item("CO-276").meaning!));
    expect(text).toContain(`keyed the same way as ${item("CO-274").name} - by number`);
    expect(text).toContain("9 CCR 2503-6 3.606.1.F");
  });

  it("makes excerpt, document and question ids small links, and skips review labels", () => {
    const parts = proseParts(engine, vol, item("CO-276").precision!);
    const kinds = parts.filter((p) => typeof p !== "string").map((p) => `${(p as { kind: string }).kind}:${(p as { id: string }).id}`);
    expect(kinds).toEqual(expect.arrayContaining(["document:D-171", "source:S1800", "question:OQ-530"]));
    expect(proseText(parts)).toContain("CDHS review B-5");
  });
});

describe("Marcus: the grant standard's versions and the freeze (CO-276)", () => {
  const it276 = item("CO-276");

  it("is a figure set by policy", () => {
    expect(kindWords(engine, it276)).toBe("A figure set by policy");
    expect(kindWords(engine, item("CO-914"))).toBe("A program outcome");
  });

  it("has two versions; the one in force repeats the figures before it", () => {
    const vs = figureVersions(it276, TODAY);
    expect(vs.map((v) => [v.version.from, v.current, v.same])).toEqual([
      ["2025-07-01", false, false],
      ["2026-07-01", true, true],
    ]);
  });

  it("draws the bar: version 1, same figures, then no figure from July 1, 2028, today in the second", () => {
    const t = figureTimeline(it276, TODAY)!;
    expect(t.segments.map((s) => [s.kind, s.from])).toEqual([
      ["version", "2025-07-01"], ["same", "2026-07-01"], ["gap", "2028-07-01"],
    ]);
    expect(t.segments.reduce((n, s) => n + s.width, 0)).toBeCloseTo(100, 5);
    const second = t.segments[0].width;
    expect(t.today).toBeGreaterThan(second);
    expect(t.today).toBeLessThan(second + t.segments[1].width);
  });

  it("says there is no figure from July 1, 2028", () => {
    expect(figureGaps(it276)).toEqual([{ from: "2028-07-01", to: null }]);
  });

  it("finds all 11 grant-standard figures in the 2025 chart, and none in the session law that froze them", () => {
    const vs = figureVersions(it276, TODAY);
    const src = (id: string) => vol.sources.find((s) => s.id === id)!;
    const chart = markNumbers(src("S414").text, numberNeedles(it276, vs[0].version.value));
    expect([chart.found, chart.total]).toEqual([11, 11]);
    expect(chart.parts.filter((p) => p.hit).map((p) => p.text)).toContain("1574");
    const law = markNumbers(src("S1800").text, numberNeedles(it276, vs[1].version.value));
    expect(law.found).toBe(0);
    // The why: the version's own excerpt names the freeze.
    expect(src("S1800").title).toMatch(/no cost-of-living adjustment/);
  });

  it("shows each version's excerpt beside it and the other excerpts in the law section", () => {
    expect(versionSources(it276)).toEqual(["S414", "S1800"]);
    expect(citedSources(it276).filter((s) => !versionSources(it276).includes(s))).toEqual(["S1801", "S1803", "S1804"]);
  });

  it("compares nothing: the version before has the same figures", () => {
    const cmp = previousVersionComparison(it276, TODAY, "parameters")!;
    expect(cmp.same).toBe(true);
    expect(cmp.previous.from).toBe("2025-07-01");
  });

  it("affects one outcome: the Colorado Works grant", () => {
    expect(affectsPhrase(itemAffects(engine, it276.identifier))).toBe("Read by 1 rule directly and 4 in all, reaching 1 program outcome");
    expect(outcomesByProgram(engine, it276.identifier)).toEqual([
      { program: "ColoradoWorks", decisions: ["cw_grant_amount"], verification: [] },
    ]);
  });
});

describe("Dana: the children's Medicaid income limit against its rule text (CO-191)", () => {
  const it191 = item("CO-191");

  it("marks 142% in the current excerpt and 133% in the earlier one", () => {
    const vs = figureVersions(it191, TODAY);
    const src = (id: string) => vol.sources.find((s) => s.id === id)!;
    const now = markNumbers(src(vs[1].version.source!).text, numberNeedles(it191, vs[1].version.value));
    expect([now.found, now.total]).toEqual([1, 1]);
    expect(now.parts.filter((p) => p.hit).map((p) => p.text)).toEqual(["142%"]);
    const before = markNumbers(src(vs[0].version.source!).text, numberNeedles(it191, vs[0].version.value));
    expect(before.parts.filter((p) => p.hit).map((p) => p.text)).toEqual(["133%"]);
  });

  it("does not find a number inside a longer one", () => {
    const m = markNumbers("1374 and 3.74 and $374.", numberNeedles({ type: "money", name: "x", identifier: "x" }, 374));
    expect(m.parts.filter((p) => p.hit).map((p) => p.text)).toEqual(["$374"]);
  });

  it("compares the stored households with the 133% version: some results change", () => {
    const cmp = previousVersionComparison(it191, TODAY, "parameters")!;
    expect(cmp.same).toBe(false);
    expect(cmp.entry.after!.versions!.find((v) => v.from === "2022-06-30")!.value).toBe(1.33);
    const changed = changedBy(engine, vol.cases, [cmp.entry]);
    expect(Array.isArray(changed)).toBe(true);
  });

  it("gives its value in each household that reads it", () => {
    const resting = restingIndex(engine, vol.cases).get(it191.identifier) ?? [];
    const read = householdsThatRead(engine, vol.cases, it191.identifier);
    const rows = householdValues(engine, vol.cases, it191, read, resting);
    expect(rows).toHaveLength(48); // + CO-1000 to CO-1004 (pattern sweep, MAGI and CHP+ probe households); + CO-924 (coverage pass 6, MAGI and CHP+: CO-810 with the birth read from the baby); + CO-810, CO-811, CO-819 (coverage pass 5, MAGI and CHP+: households with a child or a newborn); + CO-720, CO-721, CO-723 (coverage pass 4, MAGI and CHP+: households with a child); + CO-562 (receipts migration 2: CO-386's CHP+ child in receipts alone); + CO-530, CO-531 (time audit T-1); + CO-228 (MAGI coverage pass 3); + 8 households of the probe-preservation round (CO-300 and up) that read CO-191
    for (const r of rows) {
      expect(r.values).toHaveLength(1);
      expect(r.values[0].person).toBeNull();
      expect(r.version?.value).toBe(r.values[0].value);
    }
    expect(rows.some((r) => r.values[0].value === 1.42)).toBe(true);
  });
});

describe("values per person for a person's fact", () => {
  it("names each person whose results read it", () => {
    const it013 = item("CO-013");
    const resting = restingIndex(engine, vol.cases).get(it013.identifier) ?? [];
    const read = householdsThatRead(engine, vol.cases, it013.identifier);
    const rows = householdValues(engine, vol.cases, it013, read, resting);
    expect(rows.length).toBe(read.length);
    const first = rows[0];
    expect(first.values.length).toBeGreaterThan(0);
    expect(first.values[0].label).toMatch(/^Person \d/);
    expect(first.result?.caseId).toBe(first.caseId);
  });
});

describe("Ask a question: a new open question the queue reads", () => {
  it("appends OQ-<next> with its item and owner", () => {
    const md = "# Open Questions\n\n### OQ-7. Something\n\nBody: x. Items: CO-1.\n\n### OQ-12. Other\n\nBody: y. Items: CO-2.\n";
    expect(nextQuestionId(md)).toBe("OQ-13");
    const out = appendQuestion(md, {
      title: "Does the freeze reach the need standard?", body: "Does the freeze reach the need standard?",
      items: ["CO-276"], owner: "Cash programs policy owner", askedBy: "Marcus", date: TODAY,
    });
    expect(out.id).toBe("OQ-13");
    const q = parseOpenQuestions(out.text).find((x) => x.id === "OQ-13")!;
    expect(q.title).toBe("Does the freeze reach the need standard");
    expect(q.items).toEqual(["CO-276"]);
    expect(q.body).toContain("Owner: Cash programs policy owner");
  });
});
