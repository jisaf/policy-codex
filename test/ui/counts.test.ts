/* One definition per number (docs/design-unified-ui.md, principle 3): each
 * count src/ui/counts.ts defines, pinned against the Colorado volume. The
 * figures below are the ones the evaluators compared across three UIs
 * (docs/reviews/compare-eval-1.md and compare-eval-2.md); a change to the
 * volume that moves one should move it here on purpose. */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import {
  affectsPhrase, awaitingByRole, awaitingSignOff, changesInMonth, itemAffects, citedUnverified, COUNT_DEFINITIONS, documentsStillNeeded,
  figuresWithoutValue, householdsReached, householdsThatRead, isPastDue, itemsCitingUnverified, mapCounts, monthRange,
  newVersionSoon, ownedPhrase, ownedQuestions, ownerGroups, pastDueCount, personaQuestions, readReachPhrase,
  restingOnUnverified, unverifiedUpstream, documentsNeededBy, whatIfPhrase,
} from "../../src/ui/counts";
import { personaById, personaRoles } from "../../src/ui/personas";
import { unverifiedIds } from "../../src/ui/provenance";
import { explicitField, isOpen, ownerLineRoles, questionInfos } from "../../src/ui/questions";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const persona = (id: string) => personaById(id)!;

describe("owns: the question's Owner line names the role", () => {
  const unsettled = questionInfos(engine, vol.openQuestions).filter((q) => isOpen(q.status));

  it("every open or partly settled Colorado question has an Owner line", () => {
    expect(unsettled.filter((q) => !explicitField(q.body, "Owner")).map((q) => q.id)).toEqual([]);
  });

  it("counts the Medicaid policy owner's questions once: 64 open and 8 partly settled (the App said 24 and 49)", () => {
    const med = ownedQuestions(engine, vol.sources, vol.openQuestions, { roles: ["Medicaid policy owner"] });
    expect(med.open.length).toBe(67); // Medicaid status by month: + OQ-1445, OQ-1446; pattern sweep (non-MAGI): + OQ-1415; pattern sweep (MAGI, CHP+): + OQ-1425; coverage pass 6 (non-MAGI): + OQ-1385 (OQ-471 resolved is Legal's and the LTSS owner's; OQ-820, OQ-900 and OQ-209 stay open, reclassified); cross-list records round: - OQ-1348 resolved; field-effect sweep (non-MAGI): + OQ-1345 to OQ-1348; coverage pass 4 (non-MAGI): - OQ-952, OQ-1243 resolved, OQ-971 and OQ-995 partly resolved, + OQ-1280 to OQ-1282; holdings H1 Medicaid: + OQ-1240 to OQ-1244, OQ-1204 partly settled (part 1 by the text); coverage pass 4 (MAGI, CHP+): - OQ-1121, OQ-1123, OQ-1124 resolved, OQ-970 partly resolved, + OQ-1230; + OQ-1200, OQ-1204 (holdings H0); records E1 integration: + OQ-1180; E1 Medicaid: OQ-1023 resolved, OQ-1024 partly resolved (MAGI half settled), + OQ-1120 to OQ-1124; + OQ-1020, OQ-1023, OQ-1024 (earnings E0); + OQ-1050 (reader-defaults round); + OQ-995 (receipts migration 3); + OQ-970 to OQ-974 (receipts migration 2); + OQ-950 (time audit T-1), OQ-952 (T-8); + OQ-900 (non-MAGI fix round 2026-11-23, merged with the time audit)
    expect(med.partly.length).toBe(8); // coverage pass 4 (non-MAGI): + OQ-971, OQ-995 partly resolved; holdings H1 Medicaid: + OQ-1240 to OQ-1244, OQ-1204 partly settled (part 1 by the text); coverage pass 4 (MAGI, CHP+): + OQ-970 partly resolved (AmeriCorps settled); E1 Medicaid: OQ-1023 resolved, OQ-1024 partly resolved (MAGI half settled), + OQ-1120 to OQ-1124
    // The definition, restated: the Owner line names the role.
    const named = unsettled.filter((q) => ownerLineRoles(engine, q.body).includes("Medicaid policy owner"));
    expect(med.open.length + med.partly.length).toBe(named.length);
    expect(ownedPhrase(med)).toBe("67 open questions you own, and 8 partly settled"); // Medicaid status by month: + OQ-1445, OQ-1446; pattern sweep (non-MAGI): + OQ-1415; pattern sweep (MAGI, CHP+): + OQ-1425; coverage pass 6 (non-MAGI): + OQ-1385; cross-list records round: - OQ-1348 resolved; field-effect sweep (non-MAGI): + OQ-1345 to OQ-1348; coverage pass 4 (non-MAGI): - OQ-952, OQ-1243 resolved, OQ-971 and OQ-995 partly resolved, + OQ-1280 to OQ-1282; holdings H1 Medicaid: + OQ-1240 to OQ-1244, OQ-1204 partly settled (part 1 by the text); coverage pass 4 (MAGI, CHP+): - OQ-1121, OQ-1123, OQ-1124, OQ-970 to partly, + OQ-1230; + OQ-1200, OQ-1204 (holdings H0)
  });

  it("counts the Cash programs policy owner's: 55 open and 5 partly settled", () => {
    const cash = ownedQuestions(engine, vol.sources, vol.openQuestions, { roles: ["Cash programs policy owner"] });
    expect([cash.open.length, cash.partly.length]).toEqual([55, 5]); // coverage pass 7 (Adult Financial, Colorado Works): + OQ-1451, OQ-1452; pattern sweep (Adult Financial, Colorado Works): + OQ-1435, OQ-1436; coverage pass 6 (Adult Financial, Colorado Works): + OQ-1375 (spouses applying together); cross-list records round: - OQ-1254 resolved; field sweep fix round: + OQ-1335, OQ-1336; coverage pass 4 (Adult Financial, Colorado Works): + OQ-1290 to OQ-1295; + OQ-1253, OQ-1254 (holdings H1 Adult Financial: the interest on a burial trust's exempt $1,500; several transfers in one month); + OQ-1205 (fact-graph review of P58: the vehicle with the highest value); + OQ-1201, OQ-1203 (holdings H0); + OQ-1140, OQ-1141, OQ-1142, - OQ-1022 resolved (E1 Adult Financial and Colorado Works); E1 Medicaid: OQ-1024 partly resolved (its Adult Financial half open); + OQ-1020, OQ-1022, OQ-1024 (earnings E0); + OQ-1051 (reader-defaults round); + OQ-985, OQ-986, OQ-987 (receipts migration 2, Colorado Works); + OQ-951 (time audit T-1), OQ-953 (T-6); + OQ-901 (C.R.S. 26-2-111(1)(d) and OAP, fix round 2026-11-23); + OQ-887, OQ-888 (receipts migration 1, Adult Financial); + OQ-780 to OQ-783, - OQ-553 (Adult Financial coverage round); + OQ-830, OQ-831 (Colorado Works coverage pass 2); + OQ-860 (pass 3)
  });

  it("a persona owns what any of its roles owns, each question once", () => {
    const hcpf = ownedQuestions(engine, vol.sources, vol.openQuestions, persona("hcpf"));
    expect([hcpf.open.length, hcpf.partly.length]).toEqual([76, 10]); // Medicaid status by month: + OQ-1445, OQ-1446; pattern sweep (non-MAGI): + OQ-1415; pattern sweep (MAGI, CHP+): + OQ-1425; cross-list records round: - OQ-1348 resolved; field-effect sweep (non-MAGI): + OQ-1345 to OQ-1348; coverage pass 4 (non-MAGI): - OQ-952, OQ-1243 resolved, OQ-971 and OQ-995 partly resolved, + OQ-1280 to OQ-1282; holdings H1 Medicaid: + OQ-1240 to OQ-1244, OQ-1204 partly settled (part 1 by the text); coverage pass 4 (MAGI, CHP+): - OQ-1121, OQ-1123, OQ-1124 resolved, OQ-970 partly resolved, + OQ-1230, OQ-1231, OQ-1232 (CHP+); + OQ-1200, OQ-1204 (holdings H0); records E1 integration: + OQ-1180; E1 Medicaid: OQ-1023 resolved, OQ-1024 partly resolved (MAGI half settled), + OQ-1120 to OQ-1124; + OQ-1020, OQ-1023, OQ-1024 (earnings E0); + OQ-1050 (reader-defaults round); + OQ-1060, OQ-1061 (OM 25-073 excerpts blocked); + OQ-995 (receipts migration 3); + OQ-970 to OQ-974 (receipts migration 2); + OQ-950 (time audit T-1), OQ-952 (T-8); + OQ-900 (fix round 2026-11-23)
    expect(personaQuestions(engine, vol.sources, vol.openQuestions, persona("hcpf"))).toHaveLength(86); // Medicaid status by month: + OQ-1445, OQ-1446; pattern sweep (non-MAGI): + OQ-1415; pattern sweep (MAGI, CHP+): + OQ-1425; cross-list records round: - OQ-1348 resolved; field-effect sweep (non-MAGI): + OQ-1345 to OQ-1348; coverage pass 4 (non-MAGI): - OQ-952, OQ-1243 resolved, OQ-971 and OQ-995 partly resolved, + OQ-1280 to OQ-1282; holdings H1 Medicaid: + OQ-1240 to OQ-1244, OQ-1204 partly settled (part 1 by the text); + OQ-1200, OQ-1204 (holdings H0); records E1 integration: + OQ-1180; E1 Medicaid: OQ-1023 resolved, OQ-1024 partly resolved (MAGI half settled), + OQ-1120 to OQ-1124; + OQ-1020, OQ-1023, OQ-1024 (earnings E0); + OQ-1050; + OQ-1060, OQ-1061; + OQ-995 (receipts migration 3); + OQ-970 to OQ-974 (receipts migration 2); + OQ-950, OQ-952; + OQ-900
  });

  it("a persona with no role owns nothing and is told so", () => {
    const county = ownedQuestions(engine, vol.sources, vol.openQuestions, persona("county"));
    expect(county.owned).toBe(false);
    expect(ownedPhrase(county)).toMatch(/in your programs/);
  });

  it("files a question owned by one of mine under my role, so the groups agree with 'only mine'", () => {
    const roles = personaRoles(persona("cdhs"), engine.meta);
    const mine = personaQuestions(engine, vol.sources, vol.openQuestions, persona("cdhs"));
    const groups = ownerGroups(engine, mine, roles);
    expect(groups.every((g) => g.mine)).toBe(true);
    expect(groups.reduce((n, g) => n + g.entries.length, 0)).toBe(mine.length);
    for (const g of groups) for (const e of g.entries) expect(e.owners).toContain(g.owner);
  });

  it("says the definition in words", () => {
    expect(COUNT_DEFINITIONS.owns).toMatch(/Owner line/);
  });
});

describe("households that read an item, and households it reaches", () => {
  const id = (n: string) => engine.itemById(n)!.identifier;

  it("the Colorado Works grant standard (CO-276) is read by 34 stored households and reaches 60", () => {
    const read = householdsThatRead(engine, vol.cases, id("CO-276"));
    const reach = householdsReached(engine, vol.cases, id("CO-276"));
    expect(read).toEqual(["CO-13", "CO-84", "CO-85", "CO-100", "CO-86", "CO-89", "CO-160", "CO-163", "CO-206", "CO-208", "CO-352", "CO-355", "CO-358", "CO-359", "CO-363", "CO-427", "CO-430", "CO-432", "CO-488", "CO-580", "CO-581", "CO-582", "CO-670", "CO-773", "CO-775", "CO-778", "CO-883", "CO-884", "CO-885", "CO-886", "CO-887", "CO-1032", "CO-1090", "CO-1091"]); // + CO-1090, CO-1091 (coverage pass 7, F7-1: the eligible repro households V1, V2); + CO-1032 (pattern sweep, Adult Financial and Colorado Works: the household PS-T8); + CO-883 to CO-887 (coverage pass 6 (Adult Financial, Colorado Works): the eligible repro households W8r, W4, W3, W9, W7); + CO-773, CO-775, CO-778 (coverage pass 4 (Adult Financial, Colorado Works): eligible Colorado Works repro households); + CO-670 (earned-income records E1, cash: WIOA training wages and a vendor payment, in earnings records alone); + CO-580 to CO-582 (receipts migration 2, Colorado Works households in receipts alone); + CO-206, CO-208 (Colorado Works coverage pass 3; CO-207 is ineligible); + the eligible Colorado Works probes of the probe-preservation round (CO-300 and up); + CO-488 (non-MAGI fix round 2026-11-23 households)
    expect(reach).toHaveLength(60); // + CO-1090, CO-1091, CO-1093, CO-1094 (coverage pass 7, F7-1 and F7-3: V1, V2, G1, G2); + CO-1032 (pattern sweep, Adult Financial and Colorado Works); + CO-882 to CO-887 (coverage pass 6 (Adult Financial, Colorado Works): the Colorado Works repro households W8, W8r, W4, W3, W9, W7); + CO-773, CO-775, CO-778 (coverage pass 4 (Adult Financial, Colorado Works)); + CO-670 (earned-income records E1, cash); + CO-580 to CO-582 (receipts migration 2); + CO-488 (fix round 2026-11-23); + CO-190, CO-191 (Colorado Works coverage pass 2); + CO-206 to CO-208 (pass 3); + 20 Colorado Works and cash probes of the probe-preservation round (CO-300 and up)
    expect(readReachPhrase(read.length, reach.length, vol.cases.length)).toBe(`Read by 34 of ${vol.cases.length} stored households; it reaches 60`); // + CO-1090, CO-1091 read and reached, CO-1093, CO-1094 reached (coverage pass 7, F7-1 and F7-3); + CO-1032 read and reached (pattern sweep, Adult Financial and Colorado Works); + CO-883 to CO-887 read, CO-882 to CO-887 reached (coverage pass 6, Adult Financial and Colorado Works); + CO-773, CO-775, CO-778 (coverage pass 4, Adult Financial and Colorado Works)
  });

  it("the children's Medicaid income limit (CO-191) is read by 42 and reaches 98", () => {
    expect(householdsThatRead(engine, vol.cases, id("CO-191"))).toHaveLength(48); // + CO-1000 to CO-1004 (pattern sweep, MAGI and CHP+: the probe households LPR-5Y, YOUTH-19, UNDOC-19, WIDOW, JAILED, each testing a category's income against the standards); + one with the coverage pass 6 MAGI households (CO-920 to CO-933); + CO-810, CO-811, CO-819 (coverage pass 5, MAGI and CHP+: households with a child or a newborn); + CO-720, CO-721, CO-723 (coverage pass 4, MAGI and CHP+: households with a child); + CO-562 (receipts migration 2: CO-386's CHP+ child in receipts alone); + CO-530, CO-531 (time audit T-1: the 19th-birthday month is the Children's group's); + CO-228 (MAGI coverage pass 3: a stepchild of 16); + CO-377, CO-380, CO-381, CO-385 to CO-387, CO-452, CO-453 (probe-preservation round (CO-300 and up))
    expect(householdsReached(engine, vol.cases, id("CO-191"))).toHaveLength(121); // + CO-1108 (coverage pass 7, non-MAGI: CBWD-TWINS, built from CO-140, whose children's household facts reach the children's limit); + CO-1060, CO-1063 (Medicaid status by month: MOVED-IN and REFUGEE-LPR, single filers built from CO-1000); + CO-972 (pattern sweep, non-MAGI: CHILD-HOSP-DEEMING, a child of 10 whose household facts reach the children's limit); + CO-1000 to CO-1004 (pattern sweep, MAGI and CHP+ probe households); 112 with coverage pass 6 MAGI merged onto pass 6 non-MAGI and SNAP (each round's new households and per-month items); + CO-904, CO-905, CO-910 (coverage pass 6, non-MAGI repro households SEPARATED-QMB, ACF-SPOUSE, PICKLE-PENSION: their persons state the MAGI household facts of the households they are built from); + CO-810 to CO-819 (coverage pass 5, MAGI and CHP+ repro households); + CO-720 to CO-727 (coverage pass 4, MAGI and CHP+ repro households); + CO-560, CO-562 (receipts migration 2, households in receipts alone); + CO-480, CO-483, CO-484, CO-490, CO-491, CO-492 (non-MAGI fix round 2026-11-23 households); + CO-226 to CO-228 (MAGI coverage pass 3); + 25 Medicaid and CHP+ probes of the probe-preservation round (CO-300 and up); + CO-530, CO-531 (time audit)
  });

  it("every household that reads an item is one it reaches", () => {
    for (const n of ["CO-276", "CO-191", "CO-273"]) {
      const reach = new Set(householdsReached(engine, vol.cases, id(n)));
      for (const c of householdsThatRead(engine, vol.cases, id(n))) expect(reach.has(c), `${n} ${c}`).toBe(true);
    }
  });
});

describe("unverified upstream", () => {
  const unverified = unverifiedIds(vol.sources);

  it("an item cites an unverified excerpt in its sources or a dated version; everything reading it rests on one", () => {
    const citing = itemsCitingUnverified(engine, unverified);
    expect(citing.length).toBe(6);
    for (const it of citing) expect(citedUnverified(it, unverified).length).toBeGreaterThan(0);
    const tainted = restingOnUnverified(engine, unverified);
    expect(tainted.size).toBe(64); // + chp_child_continuous_eligibility_start_month (CO-7406, coverage pass 6, C6-08: reads chp_child_is_eligible, which rests on an unverified excerpt); + 13 SSI-method and Medicare Savings Program items (ma_ssi_countable_resources, CO-608, and what reads it): C3-1 of the fix round 2026-11-23 has CO-608 read the institutionalized spouse's share (CO-647), which rests on CO-1987 through the CSRA
    for (const it of citing) {
      expect(tainted.has(it.identifier)).toBe(true);
      for (const r of engine.impact([it.identifier])) expect(tainted.has(r)).toBe(true);
    }
  });

  it("a rule resting on one lists the item that cites it", () => {
    const tainted = [...restingOnUnverified(engine, unverified)];
    const citing = new Set(itemsCitingUnverified(engine, unverified).map((it) => it.identifier));
    const reader = tainted.find((x) => !citing.has(x))!;
    expect(unverifiedUpstream(engine, reader, unverified).some((u) => citing.has(u.item.identifier))).toBe(true);
  });
});

describe("documents still needed and their due dates (CO-92)", () => {
  const hc = vol.cases.find((c) => c.id === "CO-92")!;
  const { rows } = documentsStillNeeded(engine, hc);
  const due = (person: string, doc: string, program: string) =>
    rows.find((r) => r.person === person && r.document === doc)!.programs.find((p) => p.program === program)!.due;

  it("gives each program's own computed due date (the dates the evaluators trusted)", () => {
    expect(due("p1", "Immigration status", "SNAP")).toBe("2026-10-31");
    expect(due("p1", "Immigration status", "Medicaid")).toBe("2027-01-04");
    expect(due("p1", "Work hours", "CCCAP")).toBe("2026-10-16");
    // The child's CHP+ reasonable-opportunity row is there.
    expect(due("p2", "Citizenship or immigration status (reasonable opportunity period)", "CHP+")).toBe("2026-10-31");
  });

  it("flags a due date past due when it falls before the date read", () => {
    expect(isPastDue("2026-10-31", "2026-11-22")).toBe(true);
    expect(isPastDue("2027-01-04", "2026-11-22")).toBe(false);
    expect(isPastDue(null, "2026-11-22")).toBe(false);
    // Every date but the two Medicaid ones is past on 2026-11-22.
    const all = rows.reduce((n, r) => n + r.programs.length, 0);
    expect(pastDueCount(rows, "2026-11-22")).toBe(all - 2);
  });

  it("counts the documents each person owes, one per document", () => {
    expect(documentsNeededBy(rows, "p1") + documentsNeededBy(rows, "p2")).toBe(rows.length);
    expect(documentsNeededBy(rows, "p2")).toBe(rows.filter((r) => r.person === "p2").length);
    expect(documentsNeededBy(rows, "p9")).toBe(0);
  });
});

describe("what if: results that change when one stated amount moves", () => {
  it("counts results and the people they belong to", () => {
    expect(whatIfPhrase([])).toBe("No program result changes");
    expect(whatIfPhrase([{ person: "p1" }])).toBe("1 result changes, for 1 person");
    expect(whatIfPhrase([{ person: "p1" }, { person: "p1" }, { person: "p2" }])).toBe("3 results change, for 2 people");
    expect(COUNT_DEFINITIONS.whatIf).toMatch(/one stated amount moved/);
  });
});

describe("changes taking effect in a month: figure versions and rule documents", () => {
  it("November 2026: the LEAP figure and four rule documents, five in all", () => {
    const nov = changesInMonth(engine, vol, "2026-11");
    expect(nov.events.map((e) => `${e.kind} ${e.item.id} ${e.date}`)).toEqual(["new figure CO-875 2026-11-01"]);
    expect(nov.events[0].item.program).toBe("LEAP");
    expect(nov.documents.map((d) => `${d.doc.id} ${d.date}`)).toEqual(["D-65 2026-11-14", "D-67 2026-11-14", "D-68 2026-11-14", "D-173 2026-11-01"]);
    expect(nov.total).toBe(5);
  });

  it("a month is its first to its last day", () => {
    expect(monthRange("2026-11")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(monthRange("2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
});

describe("figures", () => {
  it("lists the figures with no value on a date", () => {
    expect(figuresWithoutValue(engine, "2026-11-22").map((it) => it.id).sort()).toEqual(["CO-1272", "CO-1276", "CO-1277", "CO-3004", "CO-3932"]);
  });

  it("a new version soon starts within 90 days", () => {
    expect(newVersionSoon({ versions: [{ from: "2026-12-01", value: 1 }] }, "2026-11-22")).not.toBeNull();
    expect(newVersionSoon({ versions: [{ from: "2027-06-01", value: 1 }] }, "2026-11-22")).toBeNull();
  });
});

describe("items waiting on a sign-off", () => {
  it("counts an item two of a persona's roles must sign once", () => {
    const roles = personaRoles(persona("cdhs"), engine.meta);
    const by = awaitingByRole(engine);
    const ids = new Set(roles.flatMap((r) => (by.get(r) ?? []).map((it) => it.id)));
    expect(awaitingSignOff(engine, roles)).toHaveLength(ids.size);
  });
});

describe("affects: what reads an item and the outcomes it reaches (the item page)", () => {
  const ident = (n: string) => engine.itemById(n)!.identifier;

  it("the grant standard (CO-276): 1 rule directly, 4 in all, 1 outcome", () => {
    expect(itemAffects(engine, ident("CO-276"))).toEqual({ direct: 1, dependents: 4, outcomes: 1 });
  });

  it("the children's income limit (CO-191): 4 rules directly, 23 outcomes", () => {
    const a = itemAffects(engine, ident("CO-191"));
    expect([a.direct, a.outcomes]).toEqual([4, 23]); // + ma_buy_in_category and ma_protected_group_category (coverage pass 6, C6-08: the children's continuous eligibility end month, CO-556, which the non-MAGI period CO-2448 also reads, now reads its start month CO-7405, which scans the Children's category, CO-191, for a MAGI period; a non-MAGI period keeps the application month, so their answers do not change); 
    expect(affectsPhrase(a)).toMatch(/^Read by 4 rules directly and \d+ in all, reaching 23 program outcomes$/);
    expect(COUNT_DEFINITIONS.affects).toMatch(/verification/);
  });

  it("the Map and the item page say the same: CO-191 reaches 23 program outcomes, read by 76 items (the Map said 22)", () => {
    const a = itemAffects(engine, ident("CO-191"));
    const m = mapCounts(engine, ident("CO-191"));
    expect(m.readBy.outcomes).toBe(a.outcomes);
    expect(m.readBy.outcomes).toBe(23); // + ma_buy_in_category and ma_protected_group_category (coverage pass 6, C6-08: the children's continuous eligibility end month, CO-556, which the non-MAGI period CO-2448 also reads, now reads its start month CO-7405, which scans the Children's category, CO-191, for a MAGI period; a non-MAGI period keeps the application month, so their answers do not change); 
    expect(m.readBy.total).toBe(a.dependents);
    // Every item the page's centre box can name, for every program outcome.
    for (const id of ["CO-276", "CO-914"]) {
      expect(mapCounts(engine, ident(id)).readBy.outcomes).toBe(itemAffects(engine, ident(id)).outcomes);
    }
  });
});
