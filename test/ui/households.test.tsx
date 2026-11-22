/* Households and a household's determination (places/HouseholdPage.tsx,
 * places/Determination.tsx, src/ui/households.ts) against the real
 * Colorado volume. The persona probes: Rosa reads each person's aid codes
 * for CO-01, steps through a determination and finds what more income
 * changes (CO-07), and reads CO-92's documents; Priya reconstructs a denial
 * as of a date (CO-87); Marcus explains the CO-07 grant for a training. */
import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { render } from "preact";
import { loadVolume } from "../../src/tools/volumes";
import { caseToSpec, programsOfCase, type HouseholdCase } from "../../src/engine/cases";
import { emptyChangeSet } from "../../src/changes/types";
import { changeSetSig, draftsShownSig, engineSig, modeSig, route, volumeSig } from "../../src/ui/state";
import { defaultRoute, type Route } from "../../src/ui/router";
import { caseEdges, relationshipSentence } from "../../src/ui/people";
import { documentsNeededBy, documentsStillNeeded, whatIfPhrase, COUNT_DEFINITIONS } from "../../src/ui/counts";
import { buildWalk } from "../../src/ui/walkthrough";
import {
  clientSentence, decidingComparison, filterHouseholds, householdPeople, householdSummaries, noteHead, personNotes,
  resultsGrid, statedAmounts, tippingPoint, whatIfChanges, whyInShort, withRaise,
} from "../../src/ui/households";
import { DeterminationPage, trainingSteps } from "../../src/ui/places/Determination";
import { HouseholdPage, HouseholdsList } from "../../src/ui/places/HouseholdPage";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const map = vol.aidCodes!;
const kase = (id: string): HouseholdCase => vol.cases.find((c) => c.id === id)!;
const walkOf = (id: string, identifier: string, person: string, month: string | null = null) =>
  buildWalk(engine.explain(caseToSpec(kase(id)), identifier, person, month));

function show(arg: string | null, params: Record<string, string> = {}): HTMLElement {
  route.value = { ...defaultRoute(), volume: "co", view: "households", arg, params } as Route;
  const host = document.createElement("div");
  const parts = (arg ?? "").split("/").filter(Boolean);
  render(!parts.length ? <HouseholdsList /> : parts[1] ? <DeterminationPage /> : <HouseholdPage />, host);
  return host;
}

beforeEach(() => {
  volumeSig.value = vol;
  engineSig.value = engine;
  changeSetSig.value = emptyChangeSet("co", "local");
  modeSig.value = "read";
  draftsShownSig.value = null;
});

describe("people named as the case author describes them", () => {
  it("reads the note under each person, which the parsed YAML drops", () => {
    const notes = personNotes(vol.casesText);
    expect(notes.get("CO-01")!.get("p1")).toMatch(/^Grandmother, 79, U\.S\. citizen/);
    // A note under an expectation's `p1:` is not a person's note.
    for (const [id, m] of notes) for (const pid of m.keys()) expect(kase(id).persons[pid], `${id} ${pid}`).toBeDefined();
  });

  it("p1 Grandmother, 79: the head of the note, else the stated relationship and age", () => {
    expect(householdPeople(kase("CO-01"), vol.casesText).map((p) => `${p.id} ${p.short}`)).toEqual([
      "p1 Grandmother, 79", "p2 Grandfather, 81", "p3 Daughter, 41", "p4 Granddaughter, 17", "p5 Great-grandson, 8 months",
    ]);
    expect(noteHead("Applicant mother, 30, earns $500.")).toBe("Applicant mother, 30");
    // Every person of every case has a descriptor.
    for (const hc of vol.cases) for (const p of householdPeople(hc, vol.casesText)) expect(p.short.length).toBeGreaterThan(0);
    const bare = vol.cases.find((hc) => !personNotes(vol.casesText).get(hc.id));
    if (bare) {
      const p = householdPeople(bare, vol.casesText)[0];
      expect(p.note).toBeNull();
      expect(p.short).toMatch(/^(Age \d+|[A-Z].*|Person \d+)$/);
    }
  });

  it("filters the list by program and by words in a person's note", () => {
    const all = householdSummaries(engine, vol.cases, vol.casesText);
    expect(filterHouseholds(all, "", "grandmother").map((h) => h.id)).toContain("CO-01");
    const snap = filterHouseholds(all, "SNAP", "");
    expect(snap.every((h) => h.programs.includes("SNAP"))).toBe(true);
    expect(snap.length).toBeLessThan(all.length);
    const host = show(null, { program: "SNAP" });
    expect(host.querySelectorAll("ul.hhlist li").length).toBe(snap.length);
    expect(host.querySelector('ul.hhlist li[data-case="CO-87"] a')!.getAttribute("href")).toBe("#/co/households/CO-87");
  });
});

describe("Results and aid codes (Rosa: each person's aid codes for CO-01)", () => {
  it("draws persons as columns and only the programs the household is set up for as rows", () => {
    const hc = kase("CO-01");
    const grid = resultsGrid(engine, map, hc, vol.casesText);
    expect(grid.persons.map((p) => p.id)).toEqual(Object.keys(hc.persons));
    const tested = programsOfCase(engine.index, hc);
    for (const p of grid.programs) expect(tested).toContain(p);
    for (const p of grid.untested) expect(tested).not.toContain(p);
    const host = show("CO-01");
    const table = host.querySelector("table.hhgrid")!;
    expect(table.querySelectorAll("thead th[data-person]").length).toBe(5);
    expect(table.querySelector('thead th[data-person="p1"]')!.textContent).toContain("Grandmother, 79");
    expect(table.querySelectorAll("tbody tr").length).toBe(grid.programs.length);
    // Each cell opens the person's determination of that result.
    expect(table.querySelector('td[data-person="p2"] a[href^="#/co/households/CO-01/p2/"]')).toBeTruthy();
    // The household's SNAP allotment sits in a member's cell.
    expect(table.querySelector('td[data-person="p2"][data-prog="SNAP"] .amount')!.textContent).toMatch(/\$/);
  });

  it("names the documents each person still owes, from counts.ts", () => {
    const rows = documentsStillNeeded(engine, kase("CO-92")).rows;
    const host = show("CO-92");
    const pill = host.querySelector('table.hhgrid th[data-person="p1"] .docpill');
    const n = documentsNeededBy(rows, "p1");
    if (n) expect(pill!.textContent).toContain(String(n));
    expect(pill?.getAttribute("href") ?? "#/co/households/CO-92?tab=documents").toBe("#/co/households/CO-92?tab=documents");
  });

  it("says which programs a household was never set up for instead of drawing them (CO-83)", () => {
    const hc = kase("CO-83");
    const grid = resultsGrid(engine, map, hc, vol.casesText);
    if (!programsOfCase(engine.index, hc).includes("Medicaid")) {
      expect(grid.untested).toContain("Medicaid");
      expect(show("CO-83").querySelector(".untested-line")!.textContent).toContain("Medicaid");
    }
  });
});

describe("Documents still needed (Rosa: CO-92)", () => {
  it("lists one row per document with each program's own due date and a before-today flag", () => {
    const needed = documentsStillNeeded(engine, kase("CO-92"));
    const host = show("CO-92", { tab: "documents" });
    const rows = host.querySelectorAll("table.hhdocs-table tbody tr");
    expect(rows.length).toBe(needed.rows.length);
    expect(host.querySelector('tr[data-doc="cccap_work_hours_verification_is_pending"]')!.textContent).toContain("October 16, 2026");
    expect(host.querySelector('tr[data-person="p2"][data-programs*="CHP+"]')).toBeTruthy();
    // Each program line opens why the document is pending.
    expect(rows[0].querySelector('a[href^="#/co/households/CO-92/"]')).toBeTruthy();
    expect(host.querySelector(".howcounted")!.textContent).toContain(COUNT_DEFINITIONS.pastDue);
  });
});

describe("the client sentence and why, in short", () => {
  it("CO-84: the spec's example, word for word", () => {
    const w = walkOf("CO-84", "cw_eligibility_status", "p1", "2026-10");
    expect(clientSentence(engine, w, "p1")).toBe(
      "Your household's countable income, $410, is above the $331 limit (need standard) for a household of two, so your household is not eligible for Colorado Works.",
    );
    const cmp = decidingComparison(engine, w)!;
    expect(cmp.amount.identifier).toBe("cw_countable_income");
    expect(cmp.limit.identifier).toBe("cw_need_standard");
    expect(whyInShort(w).steps.map((s) => s.node.identifier)).toEqual(expect.arrayContaining(["cw_meets_income_test", "cw_countable_income"]));
  });

  it("CO-07: a money result says the amount and what it is worked out from", () => {
    const w = walkOf("CO-07", "cw_grant_amount", "p1", "2026-10");
    expect(clientSentence(engine, w, "p1")).toMatch(/^Your household's basic cash assistance grant amount is \$387 a month, worked out from grant before any sanction \(\$517\) and sanction reduction \(\$129\.25\)\.$/);
  });

  it("CO-87: a denial names the test that decided it", () => {
    const w = walkOf("CO-87", "snap_person_participation_status", "p1", "2026-10");
    expect(clientSentence(engine, w, "p1")).toMatch(/^You are not eligible for SNAP.*because .*time limit/);
  });
});

describe("the determination page", () => {
  it("Marcus: the CO-07 grant leads with the sentence, then the budget, the Map and both prints", () => {
    const host = show("CO-07/p1/cw_grant_amount", { month: "2026-10" });
    expect(host.querySelector("p.client")!.textContent).toContain("$387");
    expect(host.querySelector("[data-value]")!.textContent).toContain("387");
    expect(host.querySelector("table.wk-budget tr.result")!.textContent).toContain("$387");
    expect(host.querySelector("ol.whyshort")).toBeTruthy();
    const map = [...host.querySelectorAll(".detactions a")].find((a) => a.textContent === "Open in the Map")!;
    expect(decodeURIComponent(map.getAttribute("href")!)).toMatch(/#\/co\/map\?.*CO-07/);
    expect(host.querySelector("button.det-print-training")).toBeTruthy();
    expect(host.querySelector("button.det-print-appeal")!.textContent).toBe("Print for an appeal file");
    expect(host.querySelectorAll("select.det-depth option").length).toBe(4);
    expect(host.querySelector("h1")!.textContent).toContain("Dana, 34");
  });

  it("a training handout keeps the steps that changed the answer, to the chosen depth", () => {
    const w = walkOf("CO-07", "cw_grant_amount", "p1", "2026-10");
    const one = trainingSteps(w, 1);
    expect(one[0].n).toBe(1);
    expect(one.every((s) => s.depth <= 1)).toBe(true);
    expect(trainingSteps(w, 2).length).toBeGreaterThanOrEqual(one.length);
    expect(trainingSteps(w, 99).length).toBeLessThanOrEqual(w.steps.length);
  });

  it("Priya: CO-87's denial shows its as-of date, and re-reads on another date when asked", () => {
    const host = show("CO-87/p1/snap_person_participation_status");
    expect(host.querySelector(".asof")!.textContent).toContain("As of");
    expect(host.querySelector(".asof")!.textContent).toContain(new Date(`${kase("CO-87").as_of}T12:00:00`).getFullYear().toString());
    expect(host.querySelector(".wk-printhead")!.textContent).toContain("Determination date (as of)");
    const moved = show("CO-87/p1/snap_person_participation_status", { asof: "2027-01-15" });
    expect(moved.querySelector(".asof")!.textContent).toContain("Read with the rules in force on");
    expect((moved.querySelector("input.det-asof") as HTMLInputElement).value).toBe("2027-01-15");
  });

  it("names the person and program when the address names no result", () => {
    const host = show("CO-05/p3");
    expect((host.querySelector("select.det-person") as HTMLSelectElement).value).toBe("p3");
    expect(host.querySelector("ol.stepper li.step")).toBeTruthy();
  });

  it("says so for a person the household does not have", () => {
    expect(show("CO-01/p9/snap_allotment").textContent).toContain("No stored household CO-01 with a Person 9");
  });
});

describe("What if (Rosa: more income for CO-07)", () => {
  const hc = kase("CO-07");
  const wages = { person: "p1", identifier: "wages_gross" };

  it("offers the stated dollar amounts, earned income first", () => {
    const a = statedAmounts(engine, hc);
    expect(a[0]).toMatchObject({ person: "p1", identifier: "wages_gross", value: 400 });
    expect(a.every((x) => typeof x.value === "number")).toBe(true);
  });

  it("moves an amount in a copy of the stored household only", () => {
    const moved = withRaise(hc, wages, 250);
    expect(hc.persons.p1.month_defaults!.wages_gross).toBe(400);
    expect(moved.persons.p1.month_defaults!.wages_gross).toBe(650);
  });

  it("+$250: the grant falls from $387 to $325", () => {
    const ch = whatIfChanges(engine, hc, wages, 250);
    const grant = ch.find((c) => c.person === "p1" && c.identifier === "cw_grant_amount")!;
    expect(grant).toMatchObject({ before: 387, after: 325 });
    expect(whatIfPhrase(ch)).toMatch(/^\d+ results? changes?, for \d+ (person|people)$/);
    const host = show("CO-07", { tab: "whatif", fact: "p1:wages_gross", add: "250" });
    expect(host.querySelector('table.wi-changes tr[data-person="p1"][data-outcome="cw_grant_amount"]')!.textContent).toContain("$325");
    expect(host.querySelector("button.wi-chip[aria-pressed=true]")!.textContent).toBe("+$250");
  });

  it("finds the tipping point: $931 more turns eligible into ineligible on income", () => {
    const tp = tippingPoint(engine, hc, wages, { person: "p1", identifier: "cw_eligibility_status" });
    expect(tp.raise).toBe(931);
    expect(tp.before).toBe("eligible");
    expect(tp.after).toBe("ineligible_income");
    expect(tp.first!.node.identifier).toBe("cw_meets_income_test");
    expect(tp.steps.length).toBeGreaterThan(1);
    expect(tp.steps[tp.steps.length - 1].node.identifier).toBe("cw_eligibility_status");
  });

  it("a determination links to its what-if with the result to watch", () => {
    const host = show("CO-07/p1/cw_eligibility_status");
    const a = host.querySelector("a.det-whatif")!;
    expect(decodeURIComponent(a.getAttribute("href")!)).toBe("#/co/households/CO-07?tab=whatif&watch=p1:cw_eligibility_status");
  });
});

describe("What the case states", () => {
  it("states relationships as sentences and every expectation with a link to its determination", () => {
    const hc = kase("CO-01");
    const host = show("CO-01", { tab: "states" });
    const rels = [...host.querySelectorAll("ul.relations li")].map((li) => li.textContent!);
    expect(rels.length).toBe(caseEdges(hc).length);
    expect(rels).toContain(`${relationshipSentence({ role: "gave_birth_to", from: "p4", to: "p5" })}.`);
    for (const r of rels) expect(r).not.toMatch(/is the gave birth to|is the files/);
    const rows = host.querySelectorAll("table.expectations tbody tr");
    expect(rows.length).toBe(engine.runCase(hc).results.length);
    expect(rows[0].querySelector('a[href^="#/co/households/CO-01/"]')).toBeTruthy();
    expect(host.querySelectorAll("details.hhfacts[data-person]").length).toBe(5);
  });
});
