/* The numbers the Questions and Law places show, pinned against the
 * Colorado volume (counts.ts: one definition per number). */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import {
  departureItems, departuresByProgram, figuresWithoutValue, itemsCitingExcerpt, itemsCitingUnverified, lawCounts,
  ownedQuestions, questionHouseholds, questionQueue, restingIndex, restingOnUnverified, unverifiedReach,
} from "../../src/ui/counts";
import { personaById } from "../../src/ui/personas";
import { unverifiedIds } from "../../src/ui/provenance";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const persona = (id: string) => personaById(id)!;
const DATE = "2026-11-22";

describe("the question queue", () => {
  const all = questionQueue(engine, vol.sources, vol.openQuestions, null, {});

  it("holds every question still to answer: 160, 19 of them partly settled", () => {
    expect(all.total).toBe(160); // + OQ-1100, OQ-1101, - OQ-1021 resolved (earnings E1 SNAP); + OQ-1020 to OQ-1024 (earnings E0); + OQ-1050, OQ-1051 (reader-defaults round); + OQ-1060, OQ-1061 (OM 25-073 excerpts blocked); + OQ-995, OQ-996 (receipts migration 3); + OQ-970 to OQ-974 (receipts migration 2: Medicaid), merged; + OQ-990, OQ-991, OQ-992 (receipts migration 2: CCCAP), OQ-993 (SUN Bucks), merged; + OQ-985, OQ-986, OQ-987 (receipts migration 2, Colorado Works); + OQ-950, OQ-951 (time audit T-1), OQ-952 (T-8), OQ-953 (T-6); + OQ-900, OQ-901 (fix round 2026-11-23); + OQ-885, OQ-886, OQ-887, OQ-888 (receipts migration 1: LEAP, Adult Financial); + OQ-830, OQ-831 (Colorado Works coverage pass 2); + OQ-863 (LEAP coverage pass 2)
    expect(all.rows).toHaveLength(160);
    expect(questionQueue(engine, vol.sources, vol.openQuestions, null, { state: "partly" }).rows).toHaveLength(19);
  });

  it("'only mine' is the persona's owned questions, the same as the Desk counts", () => {
    for (const id of ["hcpf", "cdhs", "legal"]) {
      const q = questionQueue(engine, vol.sources, vol.openQuestions, persona(id), { mine: true });
      const owned = ownedQuestions(engine, vol.sources, vol.openQuestions, persona(id));
      expect(q.rows.length, id).toBe(owned.open.length + owned.partly.length);
    }
  });

  it("names an owner that always agrees with the filter (Blind B named someone else)", () => {
    const cdhs = persona("cdhs");
    const mine = questionQueue(engine, vol.sources, vol.openQuestions, cdhs, { mine: true });
    for (const r of mine.rows) {
      expect(mine.mineRoles).toContain(r.owner);
      expect(r.entry.owners).toContain(r.owner);
      expect(r.others).not.toContain(r.owner);
    }
    const cash = questionQueue(engine, vol.sources, vol.openQuestions, cdhs, { mine: true, owner: "Cash programs policy owner" });
    expect(cash.rows).toHaveLength(41); // + OQ-1020, OQ-1022, OQ-1024 (earnings E0); + OQ-1051 (reader-defaults round); + OQ-985, OQ-986, OQ-987 (receipts migration 2, Colorado Works); + OQ-951 (time audit T-1), OQ-953 (T-6); + OQ-901 (fix round 2026-11-23); + OQ-887, OQ-888 (receipts migration 1, Adult Financial)
    expect(cash.rows.every((r) => r.owner === "Cash programs policy owner")).toBe(true);
    expect(cash.groups.map((g) => g.owner)).toEqual(["Cash programs policy owner"]);
    // Without a filter the first owner is named, and the groups add up.
    expect(all.rows.every((r) => r.owner === r.entry.owner)).toBe(true);
    expect(all.groups.reduce((n, g) => n + g.rows.length, 0)).toBe(all.rows.length);
  });

  it("sorts by number, newest, items, and households once the index is built", () => {
    const n = (id: string) => Number(id.slice(3));
    const byNumber = questionQueue(engine, vol.sources, vol.openQuestions, null, { sort: "number" }).rows.map((r) => n(r.entry.id));
    expect(byNumber).toEqual([...byNumber].sort((a, b) => a - b));
    const newest = questionQueue(engine, vol.sources, vol.openQuestions, null, { sort: "newest" }).rows.map((r) => n(r.entry.id));
    expect(newest).toEqual([...newest].sort((a, b) => b - a));
    // Before the resting index: no household counts.
    const early = questionQueue(engine, vol.sources, vol.openQuestions, null, { sort: "households" }, null);
    expect(early.rows.every((r) => r.households === null)).toBe(true);
    restingIndex(engine, vol.cases);
    const hh = questionQueue(engine, vol.sources, vol.openQuestions, null, { sort: "households" }, vol.cases).rows;
    for (let i = 1; i < hh.length; i++) expect(hh[i - 1].households!).toBeGreaterThanOrEqual(hh[i].households!);
    for (const r of hh.slice(0, 5)) expect(r.households).toBe(questionHouseholds(engine, vol.cases, r.entry).length);
  }, 60_000);

  it("leaves out the questions answered in this browser", () => {
    const first = all.rows[0].entry.id;
    const q = questionQueue(engine, vol.sources, vol.openQuestions, null, { exclude: new Set([first]) });
    expect(q.total).toBe(159); // all but the first (see the count above)
    expect(q.rows.some((r) => r.entry.id === first)).toBe(false);
  });
});

describe("Law", () => {
  const unverified = unverifiedIds(vol.sources);

  it("counts 40 departures in force, 2 unverified sources, 6 items citing them, 57 more resting on them (63 in all), 5 figures with no value", () => {
    const c = lawCounts(engine, vol, unverified, DATE);
    expect(c).toEqual({
      departures: departureItems(engine, { asOf: DATE }).length,
      unverifiedSources: 2,
      citingUnverified: itemsCitingUnverified(engine, unverified).length,
      restingOnUnverified: restingOnUnverified(engine, unverified).size - itemsCitingUnverified(engine, unverified).length,
      noValue: figuresWithoutValue(engine, DATE).length,
      excerpts: vol.sources.length,
      documents: vol.documents.length,
    });
    expect([c.departures, c.citingUnverified, c.restingOnUnverified, c.noValue]).toEqual([40, 6, 57, 5]); // + 13 resting: C3-1 of the fix round 2026-11-23 has ma_ssi_countable_resources (CO-608) read the institutionalized spouse's share (CO-647), which rests on CO-1987 through the CSRA, and the SSI-method and Medicare Savings Program items read CO-608; + CO-1155, CO-2439, CO-3155 (the state plan S59 over the Family Planning floor), CO-500 (OAP-A in the MAGI household): MAGI coverage pass 3; + CO-1183 (time audit T-4: the statute's $80,000 over Colorado's $79,999)
  });

  it("the departures by program add up to the whole", () => {
    expect(departuresByProgram(engine, DATE).reduce((n, x) => n + x.count, 0)).toBe(40);
  });

  it("what rests on the unverified sources: 16 outcomes, and 15 stored households read them (Blind A said 3, Blind B 11)", () => {
    const early = unverifiedReach(engine, vol.sources, unverified, null);
    expect(early.households).toBeNull();
    restingIndex(engine, vol.cases);
    const r = unverifiedReach(engine, vol.sources, unverified, vol.cases);
    expect(r.sources.map((s) => s.id)).toEqual(["S1228", "S1230"]);
    expect(r.citing).toHaveLength(6);
    expect(r.resting).toHaveLength(57); // + 13 through CO-608 (C3-1, fix round 2026-11-23; see above)
    expect(r.outcomes).toHaveLength(16); // + ma_ssi_related_category, ma_protected_group_category (through CO-608, C3-1 of the fix round 2026-11-23)
    expect(r.households).toEqual(["CO-01", "CO-02", "CO-06", "CO-112", "CO-113", "CO-139", "CO-187", "CO-188", "CO-213", "CO-214", "CO-388", "CO-395", "CO-481", "CO-485", "CO-561"]); // + CO-561 (receipts migration 2: CO-139's State Veterans Home resident in receipts alone); + CO-388 (probe X-REFUSE, CO-112 with the refused income allowance; probe-preservation round (CO-300 and up)); + CO-395, CO-481, CO-485 (households that read the SSI-method resources, CO-608 and CO-647, C3-1 of the fix round 2026-11-23)
  }, 60_000);

  it("an excerpt is cited by an item through its sources or a dated version", () => {
    const viaVersion = engine.items().find((it) => (it.versions ?? []).some((v) => v.source && !(it.sources ?? []).includes(v.source)));
    if (viaVersion) {
      const s = viaVersion.versions!.find((v) => v.source && !(viaVersion.sources ?? []).includes(v.source))!.source!;
      expect(itemsCitingExcerpt(engine, s).map((it) => it.id)).toContain(viaVersion.id);
    }
    for (const id of unverified) expect(itemsCitingExcerpt(engine, id).length).toBeGreaterThan(0);
  });
});
