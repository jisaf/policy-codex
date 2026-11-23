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

  it("counts the Medicaid policy owner's questions once: 40 open and 3 partly settled (the App said 24 and 49)", () => {
    const med = ownedQuestions(engine, vol.sources, vol.openQuestions, { roles: ["Medicaid policy owner"] });
    expect(med.open.length).toBe(40);
    expect(med.partly.length).toBe(3);
    // The definition, restated: the Owner line names the role.
    const named = unsettled.filter((q) => ownerLineRoles(engine, q.body).includes("Medicaid policy owner"));
    expect(med.open.length + med.partly.length).toBe(named.length);
    expect(ownedPhrase(med)).toBe("40 open questions you own, and 3 partly settled");
  });

  it("counts the Cash programs policy owner's: 27 open and 4 partly settled", () => {
    const cash = ownedQuestions(engine, vol.sources, vol.openQuestions, { roles: ["Cash programs policy owner"] });
    expect([cash.open.length, cash.partly.length]).toEqual([27, 4]); // + OQ-780 to OQ-783, - OQ-553 (Adult Financial coverage round); + OQ-830, OQ-831 (Colorado Works coverage pass 2); + OQ-860 (pass 3); + OQ-887, OQ-888 (receipts migration 1, Adult Financial)
  });

  it("a persona owns what any of its roles owns, each question once", () => {
    const hcpf = ownedQuestions(engine, vol.sources, vol.openQuestions, persona("hcpf"));
    expect([hcpf.open.length, hcpf.partly.length]).toEqual([46, 5]);
    expect(personaQuestions(engine, vol.sources, vol.openQuestions, persona("hcpf"))).toHaveLength(51);
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

  it("the Colorado Works grant standard (CO-276) is read by 18 stored households and reaches 41", () => {
    const read = householdsThatRead(engine, vol.cases, id("CO-276"));
    const reach = householdsReached(engine, vol.cases, id("CO-276"));
    expect(read).toEqual(["CO-13", "CO-84", "CO-85", "CO-100", "CO-86", "CO-89", "CO-160", "CO-163", "CO-206", "CO-208", "CO-352", "CO-355", "CO-358", "CO-359", "CO-363", "CO-427", "CO-430", "CO-432"]); // + CO-206, CO-208 (Colorado Works coverage pass 3; CO-207 is ineligible); + the eligible Colorado Works probes of the probe-preservation round (CO-300 and up)
    expect(reach).toHaveLength(41); // + CO-190, CO-191 (Colorado Works coverage pass 2); + CO-206 to CO-208 (pass 3); + 20 Colorado Works and cash probes of the probe-preservation round (CO-300 and up)
    expect(readReachPhrase(read.length, reach.length, vol.cases.length)).toBe(`Read by 18 of ${vol.cases.length} stored households; it reaches 41`);
  });

  it("the children's Medicaid income limit (CO-191) is read by 33 and reaches 67", () => {
    expect(householdsThatRead(engine, vol.cases, id("CO-191"))).toHaveLength(33); // + CO-228 (MAGI coverage pass 3: a stepchild of 16); + CO-377, CO-380, CO-381, CO-385 to CO-387, CO-452, CO-453 (probe-preservation round (CO-300 and up))
    expect(householdsReached(engine, vol.cases, id("CO-191"))).toHaveLength(67); // + CO-226 to CO-228 (MAGI coverage pass 3); + 25 Medicaid and CHP+ probes of the probe-preservation round (CO-300 and up)
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
    expect(tainted.size).toBe(50);
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

  it("the children's income limit (CO-191): 4 rules directly, 21 outcomes", () => {
    const a = itemAffects(engine, ident("CO-191"));
    expect([a.direct, a.outcomes]).toEqual([4, 21]);
    expect(affectsPhrase(a)).toMatch(/^Read by 4 rules directly and \d+ in all, reaching 21 program outcomes$/);
    expect(COUNT_DEFINITIONS.affects).toMatch(/verification/);
  });

  it("the Map and the item page say the same: CO-191 reaches 21 program outcomes, read by 76 items (the Map said 22)", () => {
    const a = itemAffects(engine, ident("CO-191"));
    const m = mapCounts(engine, ident("CO-191"));
    expect(m.readBy.outcomes).toBe(a.outcomes);
    expect(m.readBy.outcomes).toBe(21);
    expect(m.readBy.total).toBe(a.dependents);
    // Every item the page's centre box can name, for every program outcome.
    for (const id of ["CO-276", "CO-914"]) {
      expect(mapCounts(engine, ident(id)).readBy.outcomes).toBe(itemAffects(engine, ident(id)).outcomes);
    }
  });
});
