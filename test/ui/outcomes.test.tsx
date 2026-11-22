/* The by-aid-code view (phase 13) against the Colorado volume: the
 * placeholder aid-code layer loads and agrees with the outcome items, the
 * rule branch behind each code is found, and the household view gives each
 * person only the codes they hold themselves (a household program's code
 * only to a member). Assertions read the volume's own declarations and
 * evaluated values where the fix tracks may still move a case. */
import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { render } from "preact";
import { loadVolume } from "../../src/tools/volumes";
import { emptyChangeSet } from "../../src/changes/types";
import {
  aidCodeWarnings, itemOptions, parseAidCodes, type AidCodeMap,
} from "../../src/ledger/aid-codes";
import {
  branchesTo, branchFigures, CaseReader, caseMonth, caseMonths, codeEntries, codePrograms,
  householdCodes, landings, programOfArg, cellOutcome, questionsBehind,
} from "../../src/ui/aidcodes";
import { programsOfCase } from "../../src/engine/cases";
import { changeSetSig, draftsShownSig, engineSig, modeSig, route, volumeSig } from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import { OutcomesView } from "../../src/ui/views/OutcomesView";
import { buildCheckReport, loadLedgerFromDisk } from "../../src/tools/check";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const map = vol.aidCodes as AidCodeMap;

function setUp(params: Record<string, string> = {}, arg: string | null = null) {
  route.value = { ...defaultRoute(), volume: "co", view: "outcomes", arg, params };
  volumeSig.value = vol;
  engineSig.value = engine;
  changeSetSig.value = emptyChangeSet("co", "local");
  modeSig.value = "read";
  draftsShownSig.value = null;
}

describe("the aid-code layer", () => {
  it("loads from volumes/co/aid-codes.yaml as a placeholder list", () => {
    expect(map).toBeTruthy();
    expect(map.status).toBe("placeholder");
    expect(map.notice).toMatch(/not CBMS aid codes/);
    for (const c of codeEntries(engine, map)) expect(c.code).toMatch(/^PH-/);
  });

  it("gives every option of every listed outcome a code or a reason, and the check is clean", () => {
    expect(aidCodeWarnings(engine, map)).toEqual([]);
    for (const o of map.outcomes) {
      const opts = itemOptions(engine, o.outcome)!;
      for (const opt of opts) expect(opt in o.codes || opt in (o.no_code ?? {})).toBe(true);
    }
  });

  it("covers every declared program that owns outcomes", () => {
    const declared = (engine.meta.programs ?? []).filter((p) => (p.outcomes ?? []).length).map((p) => p.id);
    expect(codePrograms(engine, map).sort()).toEqual(declared.sort());
  });

  it("warns on an option with no code, a stale option, a duplicate code and a bad funding value", () => {
    const text = `
status: placeholder
notice: test
funding: {outcome: ma_funding_source, programs: [Medicaid]}
participation:
  SNAP: {outcome: snap_person_participation_status, member: [eligible_member, not_an_option]}
outcomes:
  - outcome: ma_buy_in_category
    codes:
      working_adults_with_disabilities: {code: PH-X, label: "x", funding: title_lxx}
      gone_option: {code: PH-X, label: "y"}
    no_code:
      none: ~
`;
    const w = aidCodeWarnings(engine, parseAidCodes(text)).join("\n");
    expect(w).toContain(`ma_buy_in_category option "children_with_disabilities" has no aid code`);
    expect(w).toContain(`ma_buy_in_category has no option "gone_option"`);
    expect(w).toContain("code PH-X is used twice");
    expect(w).toContain(`funding "title_lxx" is not an option of ma_funding_source`);
    expect(w).toContain(`snap_person_participation_status has no option "not_an_option"`);
    expect(w).toMatch(/program SNAP has no outcome with aid codes/);
  });

  it("reaches npm run check as warnings", () => {
    const ledger = loadLedgerFromDisk(root, "co");
    expect(ledger.aidCodes).toBeTruthy();
    const broken = parseAidCodes("status: placeholder\noutcomes:\n  - outcome: ma_buy_in_category\n    codes: {}\n");
    const report = buildCheckReport({ ...ledger, cases: [], items: ledger.items, aidCodes: broken }, null, []);
    expect(report.warnings.some((w) => w.startsWith("aid-codes.yaml: ma_buy_in_category option"))).toBe(true);
  }, 120_000);
});

describe("the rule behind a code", () => {
  it("finds every arm of a case rule that gives the option, with the earlier arms it must pass", () => {
    const it = engine.item("ma_magi_category")!;
    const child = branchesTo(it, "child")!;
    const arms = (it.derived as unknown[]).slice(1).filter((a) => (a as unknown[])[1] === "child");
    expect(child.length).toBe(arms.length);
    expect(child.every((b) => b.when.length === 1)).toBe(true);
    // The newborn arm comes first, so every child branch must pass it.
    expect(child[0].unless.length).toBeGreaterThan(0);
    // The default ("none") is reached only when no arm applies.
    const none = branchesTo(it, "none")!;
    expect(none.some((b) => b.when.length === 0 && b.unless.length > 0)).toBe(true);
  });

  it("reads a yes/no rule that is not a case as one branch for yes", () => {
    const it = engine.item("leap_is_eligible")!;
    expect(branchesTo(it, "yes")).toEqual([{ when: [it.derived], unless: [] }]);
  });

  it("names the figures a branch reads", () => {
    const it = engine.item("snap_eligibility_status")!;
    const b = branchesTo(it, "over_gross_income_limit")!;
    const figs = branchFigures(engine, b.flatMap((x) => x.when));
    expect(figs.every((f) => f.kind === "parameter")).toBe(true);
  });

  it("takes a program id or an outcome identifier as the route's argument", () => {
    expect(programOfArg(engine, map, "SNAP")).toBe("SNAP");
    expect(programOfArg(engine, map, "ma_magi_category")).toBe("Medicaid");
    expect(programOfArg(engine, map, "nonsense")).toBeNull();
  });
});

describe("the household view", () => {
  it("never gives a household program's code to a person who is not a member", () => {
    for (const hc of vol.cases) {
      const reader = new CaseReader(engine, hc, caseMonth(hc));
      for (const row of householdCodes(engine, map, hc)) {
        for (const pp of row.programs) {
          const gate = map.participation[pp.program];
          if (!gate || !pp.codes.length) continue;
          const v = reader.value(gate.outcome, row.person);
          expect(gate.member).toContain(String(v));
        }
      }
    }
  });

  it("CO-01: the undocumented mother is in a SNAP household but holds no SNAP code; her emergency Medicaid carries its own funding", () => {
    const hc = vol.cases.find((c) => c.id === "CO-01")!;
    const reader = new CaseReader(engine, hc, caseMonth(hc));
    const rows = householdCodes(engine, map, hc);
    for (const row of rows) {
      const snap = row.programs.find((p) => p.program === "SNAP")!;
      const part = reader.value("snap_person_participation_status", row.person);
      const hh = reader.value("snap_eligibility_status", row.person);
      if (hh === "eligible" && part !== "eligible_member") {
        expect(snap.codes).toEqual([]);
        expect(snap.householdOnly).toBe(true);
      }
      const ma = row.programs.find((p) => p.program === "Medicaid")!;
      if (reader.value("ma_emergency_medicaid_status", row.person) === "eligible_emergency_condition") {
        expect(ma.codes.map((c) => c.code)).toContain("PH-MA-EMERG");
        expect(ma.funding?.key).toBe(reader.value("ma_funding_source", row.person));
      }
      // The MAGI covered group counts only with full MAGI eligibility.
      const cat = ma.codes.find((c) => c.outcome === "ma_magi_category");
      if (cat) expect(reader.value("ma_magi_eligibility_status", row.person)).toBe("eligible");
    }
    expect(rows.some((r) => r.programs.find((p) => p.program === "SNAP")!.householdOnly)).toBe(true);
  });

  it("lists, for each code, only persons who hold it", () => {
    const land = landings(engine, map, vol.cases);
    expect(land.size).toBeGreaterThan(5);
    for (const [code, list] of land) {
      for (const l of list.slice(0, 3)) {
        const hc = vol.cases.find((c) => c.id === l.caseId)!;
        const row = householdCodes(engine, map, hc, l.month).find((r) => r.person === l.person)!;
        expect(row.programs.flatMap((p) => p.codes.map((c) => c.code))).toContain(code);
      }
    }
  });

  it("offers the months a case states expectations for", () => {
    const hc = vol.cases.find((c) => c.id === "CO-04")!;
    expect(caseMonths(hc)[0] <= caseMonth(hc)).toBe(true);
    expect(caseMonths(hc)).toContain(caseMonth(hc));
  });
});

describe("OutcomesView", () => {
  beforeEach(() => setUp());

  it("shows the placeholder banner, a tab per program and the codes", () => {
    const host = document.createElement("div");
    render(<OutcomesView />, host);
    expect(host.querySelector(".placeholder-banner")!.textContent).toMatch(/PLACEHOLDER/);
    expect(host.querySelectorAll(".codecard").length).toBe(codeEntries(engine, map).length);
    const tabs = [...host.querySelectorAll("nav.programs a")].map((a) => a.textContent);
    expect(tabs[0]).toBe("All programs");
    expect(tabs).toContain("Colorado Works");
  });

  it("opens one code with its rule, figures, rule text and households", () => {
    setUp({ code: "PH-MA-CHILD" }, "Medicaid");
    const host = document.createElement("div");
    render(<OutcomesView />, host);
    const card = host.querySelector('[data-code="PH-MA-CHILD"]')!;
    expect(card.querySelector("details")!.open).toBe(true);
    const text = card.textContent!;
    expect(text).toContain("The rule that leads here");
    expect(text).toContain("Also needed for the code");
    expect(text).toContain("Usually paid from");
    expect(card.querySelector('a[href*="/item/"]')).toBeTruthy();
    expect(card.querySelector('a[href*="excerpt="]')).toBeTruthy();
    expect(card.querySelector('a[href*="/walkthrough/"]')).toBeTruthy();
    // Only Medicaid codes on the Medicaid page.
    for (const c of host.querySelectorAll(".codecard")) expect(c.getAttribute("data-code")).toMatch(/^PH-(MA|MSP|RHCP|OAP)/);
  });

  it("renders one stored household, a row per person and a column per program", () => {
    setUp({ tab: "household", case: "CO-01" });
    const host = document.createElement("div");
    render(<OutcomesView />, host);
    const table = host.querySelector("table.household")!;
    const hc = vol.cases.find((c) => c.id === "CO-01")!;
    expect(table.querySelectorAll("tbody tr").length).toBe(Object.keys(hc.persons).length);
    expect(table.querySelectorAll("thead th").length).toBe(codePrograms(engine, map).length + 1);
    expect(table.querySelector('a[href*="/walkthrough/CO-01?person=p1"]')).toBeTruthy();
    expect(host.textContent).toContain("this person does not");
  });
});

describe("phase 13 retest fixes: the household grid", () => {
  const kase = (id: string) => vol.cases.find((c) => c.id === id)!;

  it("says 'not tested in this case' for a program the case never tests (CO-83's Medicaid)", () => {
    const hc = kase("CO-83");
    const tested = programsOfCase(engine.index, hc);
    for (const row of householdCodes(engine, map, hc)) {
      for (const pp of row.programs) expect(pp.tested).toBe(tested.includes(pp.program));
    }
    setUp({ tab: "household", case: "CO-83" });
    const host = document.createElement("div");
    render(<OutcomesView />, host);
    const untested = host.querySelectorAll('td[data-prog="Medicaid"] .untested');
    if (!tested.includes("Medicaid")) expect(untested.length).toBe(Object.keys(hc.persons).length);
    expect(host.textContent).not.toMatch(/No needy-young-person group applies/);
  });

  it("puts amounts and ages in the grid, and opens the walkthrough at the cell's own outcome", () => {
    setUp({ tab: "household", case: "CO-01" });
    const host = document.createElement("div");
    render(<OutcomesView />, host);
    expect(host.querySelector('tr[data-person="p1"] th')!.textContent).toMatch(/age \d+/);
    const snap = host.querySelector('tr[data-person="p2"] td[data-prog="SNAP"]')!;
    expect(snap.querySelector(".amount")!.textContent).toMatch(/\$/);
    const fp = [...host.querySelectorAll('tr[data-person="p2"] td[data-prog="Medicaid"] .held a')]
      .map((a) => decodeURIComponent(a.getAttribute("href")!)).find((h) => h.includes("/walkthrough/"))!;
    const pp = householdCodes(engine, map, kase("CO-01")).find((r) => r.person === "p2")!.programs.find((x) => x.program === "Medicaid")!;
    expect(fp).toContain(`outcome=${cellOutcome(pp)}`);
    // Relationship sentences read as English.
    expect(host.querySelector(".family")?.textContent ?? "").not.toMatch(/ of of | is the files /);
  });

  it("links the open question an outcome's reasoning carries (CO-01's family planning and OQ-215)", () => {
    const hc = kase("CO-01");
    const pp = householdCodes(engine, map, hc).find((r) => r.person === "p2")!.programs.find((x) => x.program === "Medicaid")!;
    const qs = questionsBehind(engine, hc, cellOutcome(pp)!, "p2", caseMonth(hc));
    if (pp.codes.some((c) => c.outcome === "ma_family_planning_status")) expect(qs).toContain("OQ-215");
    for (const q of qs) expect(vol.openQuestions.some((x) => x.id === q)).toBe(true);
  });
});

