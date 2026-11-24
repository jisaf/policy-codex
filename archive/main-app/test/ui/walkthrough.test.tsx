/* The case walkthrough's data and view, against the real Colorado volume.
 * Assertions name the outcomes the persona tasks turn on (a SNAP
 * participation, a SNAP allotment's budget, CO-92's documents) and read the
 * values from the engine rather than fixing them, where the fix tracks may
 * still move a figure. */
import { relationshipSentence } from "../../src/ui/people";
import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { render } from "preact";
import { loadVolume } from "../../src/tools/volumes";
import { caseToSpec, type HouseholdCase } from "../../src/engine/cases";
import type { Item } from "../../src/engine/types";
import { emptyChangeSet } from "../../src/changes/types";
import { changeSetSig, draftsShownSig, engineSig, modeSig, route, volumeSig } from "../../src/ui/state";
import { defaultRoute, type Route } from "../../src/ui/router";
import { unverifiedIds } from "../../src/ui/provenance";
import { noVersionReason } from "../../src/ui/Present";
import {
  budgetRole, budgetRows, budgetText, buildWalk, caseChanges, caseNotes, caseSummaries,
  declaredOutcomePrograms, dueDateFor, documentsOwed, foldedBehind, isHouseholdOutcome,
  outcomeChoices, overrideNotes, participationOutcome, plainCaseTitle, recordedValue,
  unverifiedNotes, visibleSteps, budgetEffect, budgetMoney, caseFocus, determinationDate, documentRows,
  lineSources, personTitle, takenLabel, versionUsed,
} from "../../src/ui/walkthrough";
import { DeterminationPage } from "../../src/ui/places/Determination";
import { HouseholdPage, HouseholdsList } from "../../src/ui/places/HouseholdPage";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const kase = (id: string): HouseholdCase => vol.cases.find((c) => c.id === id)!;
const walkOf = (id: string, identifier: string, person: string, month: string | null = null) =>
  buildWalk(engine.explain(caseToSpec(kase(id)), identifier, person, month));

/** An old walkthrough address (`arg` the case, `?person=&outcome=`) as the
 *  household's canonical route: the list, the household, or a determination. */
function setUp(r: Partial<Route> = {}) {
  const { person, outcome, ...rest } = r.params ?? {};
  const arg = r.arg ? [r.arg, person, outcome].filter(Boolean).join("/") : null;
  route.value = { ...defaultRoute(), volume: "co", view: "households", ...r, arg, params: rest };
  volumeSig.value = vol;
  engineSig.value = engine;
  changeSetSig.value = emptyChangeSet("co", "local");
  modeSig.value = "read";
  draftsShownSig.value = null;
}

function show(r: Partial<Route>): HTMLElement {
  setUp(r);
  const host = document.createElement("div");
  const parts = (route.value.arg ?? "").split("/").filter(Boolean);
  render(!parts.length ? <HouseholdsList /> : parts[1] ? <DeterminationPage /> : <HouseholdPage />, host);
  return host;
}

describe("choosing a case", () => {
  it("lists every stored household with a plain title", () => {
    const all = caseSummaries(engine, vol.cases, vol.casesText);
    expect(all.map((c) => c.id)).toEqual(vol.cases.map((c) => c.id));
    for (const c of all) {
      expect(c.title).not.toMatch(/^(CDHS review|Phase|Audit fix round|Engineering follow-up)/);
      expect(c.people).toBeGreaterThan(0);
      expect(c.programs).not.toContain("All");
    }
    const b1 = all.find((c) => c.id === "CO-84")!;
    expect(b1.round).toBe("CDHS review B-1");
    expect(b1.title).toMatch(/^Three Colorado Works units/);
  });

  it("keeps a title that only looks like a round", () => {
    const t = "Community engagement at a March 2027 application: an adult who meets it";
    expect(plainCaseTitle(t)).toEqual({ title: t, round: null });
  });

  it("reads the case author's comments, which the parsed YAML drops", () => {
    const notes = caseNotes(vol.casesText);
    expect(notes.get("CO-03")!.join(" ")).toMatch(/p1: 70/);
    expect(notes.get("CO-01")!.length).toBeGreaterThan(3);
  });

  it("filters the list by program", () => {
    const host = show({ params: { program: "SNAP" } });
    const ids = [...host.querySelectorAll("ul.hhlist li")].map((li) => li.getAttribute("data-case"));
    expect(ids).toContain("CO-87");
    expect(ids).not.toContain("CO-07");
    const all = show({}).querySelectorAll("ul.hhlist li").length;
    expect(ids.length).toBeLessThan(all);
    expect(all).toBe(vol.cases.length);
  });
});

describe("outcomes and per-person participation", () => {
  it("puts this person's participation first in a household program", () => {
    const cs = outcomeChoices(engine, kase("CO-01"), "p3", "SNAP");
    expect(cs[0].identifier).toBe("snap_person_participation_status");
    expect(cs[0].group).toBe("person");
    expect(participationOutcome(engine, "Medicaid")).toBeNull();
  });

  it("never shows a household result as the person's own", () => {
    expect(isHouseholdOutcome(engine, "snap_allotment")).toBe(true);
    expect(isHouseholdOutcome(engine, "snap_eligibility_status")).toBe(true);
    expect(isHouseholdOutcome(engine, "snap_person_participation_status")).toBe(false);
    expect(isHouseholdOutcome(engine, "ma_magi_eligibility_status")).toBe(false);
    // p3 is an ineligible non-citizen; her household is still paid.
    const host = show({ arg: "CO-01", params: { person: "p3", program: "SNAP", outcome: "snap_allotment" } });
    const own = host.querySelector(".wk-person")!;
    expect(own.getAttribute("data-participation")).toMatch(/^ineligible_member/);
    expect(own.textContent).toContain("Person 3's own place in SNAP");
    expect(own.querySelector(".wk-household")!.textContent).toMatch(/household's/);
  });
});

describe("the walk", () => {
  it("steps from the outcome down and marks the step that decided it", () => {
    const w = walkOf("CO-01", "snap_person_participation_status", "p3", "2026-10");
    expect(w.steps[0].n).toBe(1);
    expect(w.steps[0].node.identifier).toBe("snap_person_participation_status");
    expect(w.why!.node.identifier).toBe("snap_meets_citizenship_requirement");
    expect(w.why!.node.value).toBe(false);
    // Pre-order: a step's parent comes before it.
    for (const s of w.steps) if (s.parent !== null) expect(s.parent).toBeLessThan(s.n);
  });

  it("carries the statute-over-rule note to the walk (Legal, task 5)", () => {
    const w = walkOf("CO-87", "snap_person_participation_status", "p1", "2026-10");
    expect(w.why!.node.identifier).toBe("snap_abawd_time_limit_status");
    expect(overrideNotes(w).map((o) => o.text).join(" ")).toMatch(/4\.000/);
    expect(w.sources.length).toBeGreaterThan(0);
  });

  it("folds the steps that did not change the answer, and opens them on request", () => {
    const w = walkOf("CO-01", "snap_allotment", "p2", "2026-10");
    const folded = visibleSteps(w, false);
    expect(folded.length).toBeLessThan(w.steps.length);
    expect(folded[0].n).toBe(1);
    expect(visibleSteps(w, true)).toHaveLength(w.steps.length);
    const behind = foldedBehind(w, folded);
    // The first fold that opening reveals (a counted step behind a step that did not count is reached only
    // through "show all"; since the SNAP coverage round CO-01's outcome step has one such).
    const stepWithFold = [...behind.keys()].find((k) => visibleSteps(w, false, new Set([k])).length > folded.length);
    expect(stepWithFold).toBeDefined();
    const opened = visibleSteps(w, false, new Set([stepWithFold!]));
    expect(opened.length).toBeGreaterThan(folded.length);
    // Every memo hit links to the step that worked it out.
    for (const s of w.steps) for (const i of s.inputs) if (i.step !== null) expect(i.step).toBeLessThanOrEqual(w.steps.length);
  });

  it("names where an unknown stopped: the missing figure and its open question", () => {
    const hc = kase("CO-89");
    const month = outcomeChoices(engine, hc, "p1", "ColoradoWorks").find((c) => c.identifier === "cw_grant_amount")!.months[0];
    const w = walkOf("CO-89", "cw_grant_amount", "p1", month);
    expect(w.root.value).toBeNull();
    expect(w.why!.node.value).toBeNull();
    expect(w.why!.stopped).toBe(true);
    expect(w.noFigure.length).toBeGreaterThan(0);
    const fig = engine.item(w.noFigure[0].identifier)!;
    expect(noVersionReason(fig, hc.as_of)).toMatch(/No version in force/);
    // A fact read through a default does not count as what stopped it.
    for (const m of w.missing) {
      expect(w.steps.some((s) => s.node.value === null && s.missing.includes(m))).toBe(true);
    }
  });
});

describe("the budget (cash lead, task 2; county supervisor, task 2)", () => {
  const w = walkOf("CO-01", "snap_allotment", "p2", "2026-10");
  const rows = budgetRows(engine, w);
  const at = (id: string) => rows.findIndex((r) => r.node.identifier === id);

  it("lists income, deductions, net and the standard before the result", () => {
    expect(rows[rows.length - 1].role).toBe("result");
    expect(rows[rows.length - 1].node.value).toBe(recordedValue(engine, kase("CO-01"), "snap_allotment", "p2", "2026-10"));
    for (const id of ["snap_household_gross_income", "snap_standard_deduction", "snap_excess_shelter_deduction", "snap_household_net_income", "snap_benefit_reduction", "snap_maximum_allotment"]) {
      expect(at(id), id).toBeGreaterThanOrEqual(0);
    }
    expect(at("snap_household_gross_income")).toBeLessThan(at("snap_household_net_income"));
    expect(at("snap_household_net_income")).toBeLessThan(at("snap_benefit_reduction"));
    expect(rows.find((r) => r.node.identifier === "snap_standard_deduction")!.role).toBe("deduction");
    expect(rows.find((r) => r.node.identifier === "snap_household_net_income")!.role).toBe("net");
  });

  it("reads a line's role from the head of its name", () => {
    expect(budgetRole("SNAP: adjusted income before the shelter deduction")).toBe("subtotal");
    expect(budgetRole("Colorado Works: grant before any sanction")).toBe("subtotal");
    expect(budgetRole("Colorado Works pregnancy allowance")).toBe("addition");
    expect(budgetRole("SNAP: household earned income for the earned income deduction")).toBe("income");
    expect(budgetRole("SNAP: maximum allotment")).toBe("standard");
    expect(budgetRole("MMMNA cap")).toBe("standard");
    expect(budgetRole("Shelter cost, monthly")).toBe("expense");
  });

  it("copies as tab-separated lines", () => {
    const text = budgetText(rows, (n) => String(n.value), (s) => s);
    const lines = text.split("\n");
    expect(lines[0].split("\t")).toEqual(["Line", "What it is", "Amount", "Rule text"]);
    expect(lines).toHaveLength(rows.length + 1);
  });

  it("is drawn for money outcomes only", () => {
    expect(budgetRows(engine, walkOf("CO-01", "snap_person_participation_status", "p3", "2026-10"))).toEqual([]);
    const host = show({ arg: "CO-01", params: { person: "p2", program: "SNAP", outcome: "snap_allotment", month: "2026-10" } });
    const shown = budgetRows(engine, w, { effect: budgetEffect(engine, kase("CO-01")) });
    expect(host.querySelectorAll("table.wk-budget tbody tr").length).toBe(shown.length);
    expect(host.querySelector("table.wk-budget tr.result")!.textContent).toContain("$");
  });
});

describe("documents still needed (county supervisor, task 4)", () => {
  it("lists CO-92's pending documents with the date that governs each, CCCAP's included", () => {
    const docs = documentsOwed(engine, kase("CO-92"));
    const cccap = docs.find((d) => d.program === "CCCAP" && d.person === "p1");
    expect(cccap?.document).toBe("Work hours");
    expect(cccap?.due).toBe(recordedValue(engine, kase("CO-92"), "cccap_verification_due_date", "p1", null));
    const snapStatus = docs.find((d) => d.program === "SNAP" && /immigration/.test(d.identifier));
    expect(snapStatus?.dueIdentifier).toBe("snap_noncitizen_documentation_due_date");
    for (const d of docs) expect(d.person).toMatch(/^p\d+$/);
  });

  it("names a due-date item that exists for every pending outcome but SUN Bucks'", () => {
    for (const p of declaredOutcomePrograms(engine)) {
      for (const o of p.outcomes.filter((x) => /_verification_is_pending$/.test(x))) {
        const due = dueDateFor(p.id, o);
        if (p.id === "SunBucks") expect(due).toBeNull();
        else expect(engine.item(due!), `${o} -> ${due}`).toBeDefined();
      }
    }
  });
});

describe("what changes with staged drafts", () => {
  const before = engine.item("cw_earned_income_disregard_dollar")!;
  const after = { ...before, value: 120 } as Item;
  const draft = engine.withItems(engine.items().map((it) => (it.id === before.id ? after : it)));

  it("compares the same stored case under two sets of rules", () => {
    expect(caseChanges(engine, engine, kase("CO-83"))).toEqual([]);
    const changes = caseChanges(engine, draft, kase("CO-83"));
    expect(changes.length).toBeGreaterThan(0);
    for (const c of changes) expect(c.before).not.toEqual(c.after);
  });

  it("shows the panel only while drafts are staged", () => {
    const params = { person: "p1", program: "ColoradoWorks" };
    expect(show({ arg: "CO-83", params }).querySelector(".wk-changes-panel")).toBeNull();
    setUp({ arg: "CO-83", params });
    changeSetSig.value = {
      ...emptyChangeSet("co", "local"),
      entries: [{ id: before.id, chapter: vol.chapterOf[before.id], before, after }],
    };
    const host = document.createElement("div");
    render(<DeterminationPage />, host);
    const panel = host.querySelector(".wk-changes-panel")!;
    expect(panel).not.toBeNull();
    expect(Number(panel.getAttribute("data-changes"))).toBeGreaterThan(0);
    expect(panel.textContent).toContain("under the rules in force and under your");
  });
});

describe("the determination page", () => {
  beforeEach(() => setUp());

  it("highlights the deciding step, links each citation to its excerpt, and prints with the ledger commit", () => {
    const host = show({ arg: "CO-87", params: { person: "p1", program: "SNAP" } });
    const why = host.querySelector("ol.stepper li.step.why")!;
    expect(why.textContent).toContain("This is why");
    const cite = host.querySelector("ol.stepper a[data-cite]")!;
    expect(cite.getAttribute("href")).toMatch(/#\/co\/law\/sources\/S\d+/);
    expect(host.querySelector(".fedbanner")!.textContent).toContain("statute governs over the Colorado rule");
    const print = host.querySelector(".wk-printhead")!;
    expect(print.textContent).toContain("Determination date (as of)");
    expect(print.textContent).toMatch(/commit/);
    expect(host.querySelectorAll("ol.wk-citations li").length).toBeGreaterThan(0);
  });

  it("flags a step that rests on an unverified excerpt", () => {
    const unverified = unverifiedIds(vol.sources);
    const w = walkOf("CO-01", "ma_patient_payment", "p1", "2026-10");
    const notes = unverifiedNotes(w, unverified);
    if (notes.length) {
      const host = show({ arg: "CO-01", params: { person: "p1", program: "Medicaid", outcome: "ma_patient_payment", month: "2026-10", all: "1" } });
      expect(host.querySelector("ol.stepper .flag.unverified")).not.toBeNull();
    }
  });

  it("shows every step with ?all=1", () => {
    const w = walkOf("CO-87", "snap_person_participation_status", "p1", "2026-10");
    const host = show({ arg: "CO-87", params: { person: "p1", program: "SNAP", all: "1" } });
    expect(host.querySelectorAll("ol.stepper > li.step").length).toBe(w.steps.length);
  });

  it("says so for a case id the volume does not have", () => {
    expect(show({ arg: "CO-999" }).textContent).toContain("No stored household CO-999");
  });
});

describe("phase 13 retest fixes", () => {
  it("opens on the person and program the case is about (CO-05: the 16-year-old, Medicaid)", () => {
    expect(caseFocus(engine, kase("CO-05"))).toEqual({ person: "p3", program: "Medicaid" });
    expect(caseFocus(engine, kase("CO-87"))).toMatchObject({ person: "p1", program: "SNAP" });
    // A person's determination with no result named opens in the program the case is about.
    const host = show({ arg: "CO-05", params: { person: "p3" } });
    expect((host.querySelector("select.det-program") as HTMLSelectElement).value).toBe("Medicaid");
  });

  it("names a person with their stated relationship", () => {
    expect(personTitle(kase("CO-05"), "p3")).toBe("Person 3 — grandchild of Person 1; in the care of Person 1, age 16");
    expect(relationshipSentence({ role: "files_jointly_with", from: "p1", to: "p2" })).toBe("Person 1 files taxes jointly with Person 2");
  });

  it("the Colorado Works budget shows the disregard and leaves out the pregnancy allowance nobody uses", () => {
    const w2 = walkOf("CO-07", "cw_grant_before_sanction", "p1", "2026-10");
    const rs = budgetRows(engine, w2, { effect: budgetEffect(engine, kase("CO-07")) });
    expect(rs.some((r) => r.node.identifier === "cw_pregnancy_allowance")).toBe(false);
    const taken = rs.find((r) => r.taken)!;
    expect(taken.taken!.amount).toBeCloseTo(268, 6);
    expect(takenLabel(taken)).toMatch(/Taken off gross earned income/);
    // Without the effect check the allowance is listed, as before the fix.
    expect(budgetRows(engine, w2).some((r) => r.node.identifier === "cw_pregnancy_allowance")).toBe(true);
  });

  it("the deemed stepparent income shows the needs taken off beside the $90", () => {
    const w3 = walkOf("CO-83", "cw_countable_income", "p1", "2026-10");
    const rs = budgetRows(engine, w3, { effect: budgetEffect(engine, kase("CO-83")) });
    expect(rs.find((r) => r.taken)!.taken!.amount).toBeCloseTo(253, 6);
  });

  it("cites the figure's period in force on the case date, not its first source", () => {
    const it = engine.item("snap_standard_deduction")!;
    const det = determinationDate(kase("CO-01"));
    const node = { identifier: it.identifier, kind: "parameter", sources: it.sources ?? [] } as never;
    const v = versionUsed(engine, node, det);
    if (v?.source) expect(lineSources(engine, node, det)).toEqual([v.source]);
    expect(budgetMoney(517, String)).toBe("$517");
    expect(budgetMoney(129.25, () => "$129.25")).toBe("$129.25");
  });

  it("lists the child's CHP+ row and one row per document", () => {
    const owed = documentsOwed(engine, kase("CO-92")).filter((d) => d.applies);
    expect(owed.some((d) => d.program === "CHP+" && d.person === "p2")).toBe(true);
    const rows = documentRows(owed);
    const imm = rows.find((r) => r.person === "p1" && /immigration/i.test(r.document))!;
    expect(imm.programs.length).toBeGreaterThan(1);
    expect(rows.length).toBeLessThan(owed.length);
  });

  it("a departure banner says why it bears on the result", () => {
    const w4 = walkOf("CO-01", "ma_patient_payment", "p1", "2026-10");
    for (const o of overrideNotes(w4)) {
      expect(o.via[0]).toBe(w4.root.name);
      expect(o.via[o.via.length - 1]).toBe(engine.item(o.item)!.name);
    }
  });
});

