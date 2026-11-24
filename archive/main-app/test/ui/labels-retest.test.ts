/* Labels from the phase 13 retests, against the Colorado volume: a table's
 * key header from what its keys are, search ranking a reader's own programs
 * first ("countable income" for HCPF), the steward named in what happens
 * next, and plain relationship sentences. */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import { tableKeyMeaning, tableRows } from "../../src/ui/present";
import { buildSearchIndex, search } from "../../src/ui/search";
import { nextSteps, stagedChangeDocument, stewardOf, stewardText } from "../../src/ui/sendChange";
import { caseEdges, relationDescription, relationshipSentence } from "../../src/ui/people";
import { emptyChangeSet } from "../../src/changes/types";
import { validateChangeSet } from "../../src/changes/validate";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");

describe("table keys", () => {
  it("reads the key from the item's name where its type is generic: number of children, not household size", () => {
    const it = engine.item("cw_grant_standard_table")!;
    expect(it.type).toBe("table keyed by household size");
    expect(tableKeyMeaning(it)).toBe("number of children");
    expect(tableRows(it, { "0": 374 })!.keyLabel).toBe("Number of children");
    const snap = engine.items().find((i) => /SNAP maximum allotment by household size/.test(i.name))!;
    expect(tableKeyMeaning(snap)).toBe("household size");
  });
});

describe("search", () => {
  const ix = buildSearchIndex(vol, engine);
  it("ranks Medicaid's MAGI income first for an HCPF reader", () => {
    const hits = search(ix, "countable income", 5, { programs: ["Medicaid", "CHP+"] });
    expect(hits[0].program).toBe("Medicaid");
    expect(hits[0].title).toMatch(/MAGI/);
    expect(hits.every((h) => h.kind !== "item" || ["Medicaid", "CHP+", "All"].includes(h.program!))).toBe(true);
  });
  it("leaves the order alone without a persona", () => {
    expect(search(ix, "countable income", 3).length).toBe(3);
  });
});

describe("what happens next", () => {
  it("names the steward codex.json gives, and keeps the token path", () => {
    const s = stewardOf(vol);
    expect(s?.name).toMatch(/steward/i);
    const without = nextSteps({ hasToken: false, steward: s, kind: "signature" }).join(" ");
    expect(without).toContain(stewardText(s));
    expect(without).toMatch(/Download this change/);
    expect(without).toMatch(/no GitHub account/);
    const withToken = nextSteps({ hasToken: true, steward: s, kind: "answer" }).join(" ");
    expect(withToken).toMatch(/Propose/);
    expect(stewardText(null)).toMatch(/no steward is named/);
  });

  it("the downloaded change holds every file to write", () => {
    const it = engine.item("cw_earned_income_disregard_dollar")!;
    const cs = emptyChangeSet("co", "local");
    cs.entries.push({ id: it.id, chapter: vol.chapterOf[it.id], before: it, after: { ...it, value: 120 } });
    const doc = stagedChangeDocument(engine, cs, validateChangeSet(engine, cs), vol.path, { steward: stewardOf(vol), today: "2026-11-22" });
    expect(doc).toContain(`${vol.path}/${vol.chapterOf[it.id]}/${it.id}.yaml`);
    expect(doc).toContain("value: 120");
    expect(doc).toContain(stewardOf(vol)!.name);
  });
});

describe("people", () => {
  it("states relationships as sentences and describes a person by them", () => {
    const hc = vol.cases.find((c) => (c.relationships ?? []).some((r) => r[0] === "files_jointly_with"))!;
    const e = caseEdges(hc).find((x) => x.role === "files_jointly_with")!;
    expect(relationshipSentence(e)).toMatch(/^Person \d files taxes jointly with Person \d$/);
    for (const x of caseEdges(hc)) expect(relationshipSentence(x)).not.toMatch(/ of of |is the [a-z]+ [a-z]+ with of/);
    const co05 = vol.cases.find((c) => c.id === "CO-05")!;
    expect(relationDescription(co05, "p1")).toMatch(/^grandparent of Persons 2 and 3/);
  });
});
