/* The by-role home (phase 13) against the Colorado volume: each persona's
 * programs and outcomes, the counts that link into the inbox and the
 * question queue, the departures, what changed and what comes next, the
 * figures in force on a date, and what a staged change does to the stored
 * households. */
import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { render } from "preact";
import { loadVolume } from "../../src/tools/volumes";
import { emptyChangeSet, type ChangeSet } from "../../src/changes/types";
import { awaitingRole } from "../../src/ui/approvals";
import { personaById, personaRoles, PERSONAS } from "../../src/ui/personas";
import { isOpen, questionInfos } from "../../src/ui/questions";
import {
  casesReading, changesBetween, defaultSince, departures, figuresInForce, firstSentence,
  questionCounts, roleOutcomes, rolePrograms, signOffCounts, stagedCaseChanges,
} from "../../src/ui/roles";
import { changeSetSig, draftsShownSig, engineSig, modeSig, route, volumeSig } from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import { RolesView } from "../../src/ui/views/RolesView";
import { noVersionReason } from "../../src/ui/Present";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const persona = (id: string) => personaById(id)!;

function setUp(arg: string, params: Record<string, string> = {}, cs?: ChangeSet) {
  route.value = { ...defaultRoute(), volume: "co", view: "roles", arg, params };
  volumeSig.value = vol;
  engineSig.value = engine;
  changeSetSig.value = cs ?? emptyChangeSet("co", "local");
  modeSig.value = "read";
  draftsShownSig.value = null;
}

describe("programs and outcomes", () => {
  it("gives each persona its declared programs, and every program to Legal and the county", () => {
    expect(rolePrograms(engine, persona("hcpf"))).toEqual(["Medicaid", "CHP+"]);
    expect(rolePrograms(engine, persona("cdec"))).toEqual(["CCCAP"]);
    const all = (engine.meta.programs ?? []).filter((p) => (p.outcomes ?? []).length).map((p) => p.id);
    expect(rolePrograms(engine, persona("county"))).toEqual(all);
  });

  it("splits a program's outcomes into decisions and documents", () => {
    const [snap] = roleOutcomes(engine, persona("cdhs"));
    expect(snap.program).toBe("SNAP");
    expect(snap.decisions.map((i) => i.identifier)).toContain("snap_eligibility_status");
    expect(snap.verification.map((i) => i.identifier)).toContain("snap_verification_status");
    expect(snap.decisions.length + snap.verification.length)
      .toBe(engine.meta.programs!.find((p) => p.id === "SNAP")!.outcomes!.length);
  });

  it("reads a long meaning down to its first sentence", () => {
    expect(firstSentence("One thing. Another thing.")).toBe("One thing.");
    expect(firstSentence("x".repeat(400)).length).toBeLessThanOrEqual(221);
  });
});

describe("counts", () => {
  it("counts the items waiting on each role the persona signs as", () => {
    const counts = signOffCounts(engine, persona("cdhs"));
    expect(counts.map((c) => c.role)).toEqual(personaRoles(persona("cdhs"), engine.meta));
    const snap = counts.find((c) => c.role === "SNAP policy owner")!;
    expect(snap.waiting).toBe(awaitingRole(engine, "SNAP policy owner").length);
  });

  it("counts the open questions on the persona's programs; Legal's are those its signature covers", () => {
    const all = questionInfos(engine, vol.openQuestions).filter((q) => isOpen(q.status));
    const cdec = questionCounts(engine, persona("cdec"), vol.openQuestions);
    expect(cdec.open.every((q) => q.programs.includes("CCCAP"))).toBe(true);
    expect(cdec.open.length).toBe(all.filter((q) => q.programs.includes("CCCAP")).length);
    const legal = questionCounts(engine, persona("legal"), vol.openQuestions);
    expect(legal.open.length).toBeGreaterThan(0);
    expect(legal.open.length).toBeLessThan(all.length);
  });

  it("lists every statute-over-rule departure for Legal, and only a program's own for its owner", () => {
    const all = engine.items().filter((it) => it.statute_override);
    expect(departures(engine, persona("legal")).length).toBe(all.length);
    const cdhs = departures(engine, persona("cdhs"));
    expect(cdhs.every((it) => persona("cdhs").programs.includes(it.program))).toBe(true);
    expect(departures(engine, persona("cdec")).every((it) => it.program === "CCCAP")).toBe(true);
  });
});

describe("what changed, and what comes next", () => {
  it("defaults to the start of last month", () => {
    expect(defaultSince("2026-11-21")).toBe("2026-10-01");
    expect(defaultSince("2027-01-05")).toBe("2026-12-01");
  });

  it("finds each new figure with the version before it, newest first", () => {
    const events = changesBetween(engine, rolePrograms(engine, persona("cdhs")), "2026-10-01", "2026-11-21");
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.date >= "2026-10-01" && e.date <= "2026-11-21").toBe(true);
      if (e.kind === "new figure") expect(e.version!.from).toBe(e.date);
    }
    const dates = events.map((e) => e.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    // SNAP's federal fiscal year figures change on October 1.
    expect(events.some((e) => e.item.program === "SNAP" && e.date === "2026-10-01")).toBe(true);
  });

  it("says when a figure runs out with nothing after it", () => {
    const events = changesBetween(engine, ["ColoradoWorks"], "2026-11-22", "2030-12-31");
    const ends = events.filter((e) => e.kind === "figure ends");
    for (const e of ends) expect(noVersionReason(e.item, e.date)).toBeTruthy();
  });

  it("links a change to the stored households that read it", () => {
    const leapLimit = engine.items().find((it) => it.program === "LEAP" && it.kind === "parameter"
      && casesReading(engine, vol.cases, it.identifier).length > 0);
    expect(leapLimit).toBeTruthy();
  });
});

describe("figures in force", () => {
  it("reads each figure on the date, with the next version", () => {
    const groups = figuresInForce(engine, ["ColoradoWorks"], "2026-11-21");
    expect(groups[0].program).toBe("ColoradoWorks");
    const disregard = groups[0].figures.find((f) => f.item.identifier === "cw_earned_income_disregard_dollar")!;
    expect(disregard.value).toBe(90);
    const versioned = groups[0].figures.find((f) => f.version && f.next === null);
    if (versioned) expect(versioned.version!.from <= "2026-11-21").toBe(true);
  });

  it("includes the shared figures the programs' outcomes read", () => {
    const groups = figuresInForce(engine, ["Medicaid"], "2026-11-21");
    expect(groups.some((g) => g.program === "All")).toBe(true);
  });
});

describe("a staged change", () => {
  it("names the stored households whose stated results move, comparing before and after", () => {
    const it = engine.item("cw_earned_income_disregard_dollar")!;
    const draft = engine.withDrafts([{ ...it, value: 120 }]);
    const changes = stagedCaseChanges(engine, draft, vol.cases, it.identifier);
    expect(changes.length).toBeGreaterThan(0);
    for (const c of changes) expect(c.before).not.toEqual(c.after);
  });
});

describe("RolesView", () => {
  beforeEach(() => setUp("cdhs"));

  it("renders every persona without failing", () => {
    for (const p of PERSONAS) {
      setUp(p.id);
      const host = document.createElement("div");
      render(<RolesView />, host);
      expect(host.querySelector(`[data-persona="${p.id}"]`)).toBeTruthy();
    }
  });

  it("deep-links its counts into the inbox, the question queue and the departures", () => {
    const host = document.createElement("div");
    render(<RolesView />, host);
    const hrefs = [...host.querySelectorAll(".countcard a")].map((a) => decodeURIComponent(a.getAttribute("href")!));
    expect(hrefs.some((h) => h.includes("/inbox?role=SNAP policy owner") || h.includes("/inbox?role=SNAP+policy+owner"))).toBe(true);
    expect(hrefs.some((h) => h.includes("/questions?persona=cdhs"))).toBe(true);
    expect(hrefs.some((h) => h.includes("show=departures"))).toBe(true);
    expect(host.querySelector("#role-changes")).toBeTruthy();
    expect(host.querySelector("#role-figures")).toBeTruthy();
    expect(host.querySelector(".outcomecard")).toBeTruthy();
  });

  it("shows a staged figure's draft, its approvers and the households it moves", () => {
    const it = engine.item("cw_earned_income_disregard_dollar")!;
    const cs = emptyChangeSet("co", "local");
    cs.entries.push({ id: it.id, chapter: vol.chapterOf[it.id], before: it, after: { ...it, value: 120 } });
    setUp("cdhs", { show: "figures" }, cs);
    const host = document.createElement("div");
    render(<RolesView />, host);
    const row = host.querySelector(`[data-figure="cw_earned_income_disregard_dollar"]`)!;
    expect(row.querySelector(".staged")!.textContent).toMatch(/Staged, not in force/);
    expect(row.querySelector(".staged")!.textContent).toMatch(/Cash programs policy owner/);
    expect(row.querySelector(".staged a[href*='/walkthrough/']")).toBeTruthy();
    // The rule in force still reads 90.
    expect(row.querySelector(".figvalue")!.textContent).toContain("$90.00");
  });
});
