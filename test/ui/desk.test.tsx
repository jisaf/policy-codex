/* The Desk, Programs and Figures on the Colorado volume: the counts each
 * reads from counts.ts (pinned on 2026-11-22), and the pages: the Desk's
 * tiles link to the canonical lists and show the same numbers; Programs
 * lists what each program decides and explains an outcome step by step at a
 * chosen depth, with a stored household's values; Figures lists every figure
 * on a date, filtered by words and flags. */
import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { render } from "preact";
import { act } from "preact/test-utils";
import { loadVolume } from "../../src/tools/volumes";
import { emptyChangeSet } from "../../src/changes/types";
import { ViewSlot } from "../../src/ui/App";
import { awaitingRole } from "../../src/ui/approvals";
import {
  awaitingSignOff, departureItems, explainSteps, figuresOnDate, figuresWithoutValue, ownedQuestions,
  programSummary, restingOnUnverified, signOffGroups, soonRange, takingEffectSoon, unverifiedInPrograms,
} from "../../src/ui/counts";
import { personaById, personaRoles, personaSig } from "../../src/ui/personas";
import { unverifiedIds } from "../../src/ui/provenance";
import { canonicalRoute, internalRoute, parseHash } from "../../src/ui/router";
import { rolePrograms } from "../../src/ui/roles";
import { buildSearchIndex, wordsMatch } from "../../src/ui/search";
import { changeSetSig, draftsShownSig, engineSig, modeSig, route, searchIndexSig, volumeSig } from "../../src/ui/state";
import { todayIso } from "../../src/ui/views/context";
import { householdsWithResult } from "../../src/ui/places/ProgramsPage";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const unverified = unverifiedIds(vol.sources);
const DAY = "2026-11-22";
const CDHS = ["SNAP", "ColoradoWorks", "AdultFinancial", "LEAP", "SunBucks"];

function show(hash: string): HTMLElement {
  route.value = internalRoute(canonicalRoute(parseHash(hash)));
  const host = document.createElement("div");
  act(() => { render(<ViewSlot />, host); });
  return host;
}

const num = (el: Element | null) => Number(el!.textContent!.replace(/,/g, ""));

beforeEach(() => {
  localStorage.clear();
  volumeSig.value = vol;
  engineSig.value = engine;
  searchIndexSig.value = buildSearchIndex(vol, engine);
  changeSetSig.value = emptyChangeSet("co", "local");
  modeSig.value = "read";
  draftsShownSig.value = null;
  personaSig.value = null;
});

describe("the Desk's counts (counts.ts)", () => {
  it("soon is the next 90 days: twenty-four changes on January 1, 2027 across every program", () => {
    expect(soonRange(DAY)).toEqual({ from: "2026-11-23", to: "2027-02-20" });
    const all = takingEffectSoon(engine, vol, DAY, null);
    // + CO-3379, CO-3380 (2027 SSI student earned income exclusion, probe hand-check); + 15 figures whose 2026
    // version now ends on 2026-12-31 with no 2027 figure loaded (time audit T-5: a yearly figure closes at year end).
    expect(all.total).toBe(24);
    expect(all.events.filter((e) => e.kind === "figure ends")).toHaveLength(15);
    expect(new Set(all.events.map((e) => e.date))).toEqual(new Set(["2027-01-01"]));
    // Medicaid and CHP+ hold the Medicaid figures that end and start; the SSI individual rate and the two SSI student
    // exclusion figures are shared by every program.
    expect(takingEffectSoon(engine, vol, DAY, ["Medicaid", "CHP+"]).total).toBe(19);
    expect(takingEffectSoon(engine, vol, DAY, CDHS).events.map((e) => e.item.id))
      .toEqual(["CO-291", "CO-1201", "CO-4730", "CO-1202", "CO-289", "CO-1200", "CO-235", "CO-3379", "CO-3380"]);
  });

  it("unverified counts items citing unverified text and figures with no value, each once", () => {
    const all = unverifiedInPrograms(engine, unverified, null, DAY);
    expect([all.citing.length, all.noValue.length, all.total]).toEqual([6, 5, 11]);
    expect(all.noValue.map((it) => it.id)).toEqual(figuresWithoutValue(engine, DAY).map((it) => it.id));
    expect(unverifiedInPrograms(engine, unverified, ["Medicaid", "CHP+"], DAY).total).toBe(6);
    expect(unverifiedInPrograms(engine, unverified, CDHS, DAY).total).toBe(3);
  });

  it("a role's sign-off groups add up to what waits on the role", () => {
    const tainted = restingOnUnverified(engine, unverified);
    for (const role of engine.meta.approval_policy.roles) {
      const gs = signOffGroups(engine, role, vol.chapterOf, tainted);
      expect(gs.reduce((n, g) => n + g.items.length, 0), role).toBe(awaitingRole(engine, role).length);
      expect(new Set(gs.map((g) => g.key)).size).toBe(gs.length);
      for (const g of gs) {
        expect(g.withOpenQuestion).toBe(g.items.filter((it) => (it.open ?? []).length).length);
        expect(g.onUnverified).toBe(g.items.filter((it) => tainted.has(it.identifier)).length);
      }
    }
    // The Medicaid owner's own program comes first, its figures first.
    expect(signOffGroups(engine, "Medicaid policy owner", vol.chapterOf)[0].key).toBe("Medicaid/parameters");
  });
});

describe("a program's counts and its steps (counts.ts)", () => {
  it("Colorado Works decides 7 outcomes, with 17 more about documents", () => {
    const s = programSummary(engine, "ColoradoWorks", vol.openQuestions);
    expect([s.decisions.length, s.verification.length, s.rules, s.figures, s.facts, s.openQuestions.length]).toEqual([7, 17, 110, 50, 35, 27]); // earnings E0: + CO-5104 (figure), + OQ-1020, OQ-1022; reader-defaults round: + OQ-1051; receipts migration 2: + CO-5651, CO-5652, CO-5653, CO-5654, - CO-2341, + CO-5650 (figure), + OQ-985 to OQ-987; + OQ-951 (time audit T-1), OQ-953 (T-6); + CO-5207, CO-5208 (the child's caretakers and parents in the home, fix round 2026-11-23); coverage pass 2: + CO-4660, + OQ-830, OQ-831; pass 3: + CO-4835, CO-4840, CO-4839, OQ-860
    expect(s.decisions.map((it) => it.identifier)).toContain("cw_grant_amount");
  });

  it("explains the grant amount in 5 main steps, 20 at two levels, 47 at three, 102 in all; the result last", () => {
    expect([1, 2, 3, Infinity].map((d) => explainSteps(engine, "cw_grant_amount", d).length)).toEqual([5, 20, 47, 102]); // receipts migration 2: + CO-5651, CO-5652, CO-5654, - CO-2341; coverage pass 2: CO-1265 reads the partial-month factor; + CO-4660; + CO-5207, CO-5208 (fix round 2026-11-23)
    const steps = explainSteps(engine, "cw_grant_amount", 1);
    expect(steps[steps.length - 1]).toMatchObject({ level: 0, item: { identifier: "cw_grant_amount" } });
    // Each rule comes after the rules it reads.
    const all = explainSteps(engine, "cw_grant_amount", Infinity);
    const at = new Map(all.map((s, i) => [s.item.identifier, i]));
    for (const s of all) {
      for (const u of engine.usesOfItem(s.item.identifier)) if (at.has(u)) expect(at.get(u)!).toBeLessThan(at.get(s.item.identifier)!);
    }
  });

  it("figures: 462 in all; words in any order; the three flags", () => {
    expect(figuresOnDate(engine, unverified, { asOf: DAY }, wordsMatch)).toHaveLength(465); // + CO-5180 (E1 Medicaid: the six months a dependent child's WIOA wages are exempt); + CO-5125, CO-5151, the LEAP eight weeks and the CCCAP thirty days (earnings E1, LEAP and CCCAP); + CO-5101 to CO-5107, the seven earnings counting tables (earnings E0); + CO-5500, CO-5510, the Medicaid MAGI and SSI-method receipt tables (receipts migration 2, merged); + CO-5720, CO-5730, the CCCAP and SUN Bucks receipt tables (receipts migration 2, merged); + CO-5650, the Colorado Works receipt counting table (receipts migration 2); + CO-4840 (Colorado Works coverage pass 3); + CO-5400, CO-5401, - CO-1513 (time audit T-2: the ISM maximum is derived); + CO-5403 (T-8); + CO-5202, CO-5217, CO-5218 (fix round 2026-11-23); + CO-5001, CO-5010, CO-5016, the LEAP, SNAP and Adult Financial receipt counting tables (receipts migration 1)
    const cw = figuresOnDate(engine, unverified, { asOf: DAY, q: "standard grant", program: "ColoradoWorks" }, wordsMatch);
    expect(cw.map((x) => x.item.id)).toContain("CO-276");
    expect(figuresOnDate(engine, unverified, { asOf: DAY, soon: true }, wordsMatch)).toHaveLength(8); // + CO-3379, CO-3380
    expect(figuresOnDate(engine, unverified, { asOf: DAY, unverified: true }, wordsMatch)).toHaveLength(3);
    expect(figuresOnDate(engine, unverified, { asOf: DAY, noValue: true }, wordsMatch).map((x) => x.item.id))
      .toEqual(expect.arrayContaining(figuresWithoutValue(engine, DAY).map((it) => it.id)));
    // After the Colorado Works standards run out, they have no value.
    const late = figuresOnDate(engine, unverified, { asOf: "2028-08-01", noValue: true, program: "ColoradoWorks" }, wordsMatch);
    expect(late.map((x) => x.item.id)).toContain("CO-276");
  });
});

describe("the Desk page", () => {
  it("shows role doors only when no role is chosen", () => {
    expect(show("#/co/desk").querySelectorAll(".rolechoice .door")).toHaveLength(6);
    personaSig.value = "hcpf";
    const host = show("#/co/desk");
    expect(host.querySelector(".rolechoice")).toBeNull();
    expect(host.querySelector(".placehead .interim")).toBeNull();
  });

  it("each tile is a number from counts.ts that links to its canonical list", () => {
    for (const pid of ["hcpf", "cdhs", "legal", "county"] as const) {
      personaSig.value = pid;
      const p = personaById(pid)!;
      const roles = personaRoles(p, engine.meta);
      const everywhere = pid === "legal" || !p.programs.length;
      const scope = everywhere ? null : rolePrograms(engine, p);
      const host = show("#/co/desk");
      const tile = (id: string) => host.querySelector(`li.tile[data-tile="${id}"]`);
      if (roles.length) {
        expect(num(tile("sign")!.querySelector(".num")), pid).toBe(awaitingSignOff(engine, roles).length);
        expect(tile("sign")!.querySelector("a")!.getAttribute("href")).toMatch(/^#\/co\/desk\/sign/);
      } else {
        expect(tile("sign"), pid).toBeNull();
      }
      const owned = ownedQuestions(engine, vol.sources, vol.openQuestions, p);
      expect(num(tile("questions")!.querySelector(".num")), pid).toBe(owned.open.length);
      expect(tile("questions")!.querySelector("a")!.getAttribute("href")).toBe(roles.length ? "#/co/questions?mine=1" : "#/co/questions");
      expect(num(tile("soon")!.querySelector(".num")), pid).toBe(takingEffectSoon(engine, vol, todayIso(), scope).total);
      expect(num(tile("statute")!.querySelector(".num")), pid).toBe(departureItems(engine, { programs: scope, asOf: todayIso() }).length);
      // The Law lists the two tiles open are narrowed to the role's programs.
      const q = scope ? `?programs=${encodeURIComponent(scope.join(","))}` : "";
      const statuteHref = tile("statute")!.querySelector("a")!.getAttribute("href")!;
      const unverifiedHref = tile("unverified")!.querySelector("a")!.getAttribute("href")!;
      expect(statuteHref).toBe(`#/co/law/departures${q}`);
      expect(unverifiedHref).toBe(`#/co/law/unverified${q}`);
      const unv = unverifiedInPrograms(engine, unverified, scope, todayIso());
      expect(num(tile("unverified")!.querySelector(".num")), pid).toBe(unv.total);
      const deps = num(tile("statute")!.querySelector(".num"));
      // ... and the list says the same number as the tile.
      const law = show(statuteHref);
      expect(law.querySelectorAll("li.departure").length, pid).toBe(deps);
      if (scope) expect(law.querySelector(".scopenote")!.textContent).toMatch(/^Only your programs: /);
      const unvPage = show(unverifiedHref);
      expect(unvPage.querySelectorAll("section.unvsource li[data-item]").length + unvPage.querySelectorAll("ul.missing li").length, pid)
        .toBe(unv.citing.length + unv.noValue.length);
      show("#/co/desk");
      expect(tile("proposal")!.querySelector("a")!.getAttribute("href")).toBe("#/co/changes/proposal");
      // Definitions sit behind a disclosure, not in the tiles.
      expect(host.querySelector("details.howcounted summary")!.textContent).toBe("How this is counted");
    }
  });

  it("an HCPF analyst's sign-off tile names each of her roles, each a link to its list", () => {
    personaSig.value = "hcpf";
    const host = show("#/co/desk");
    const links = [...host.querySelectorAll('li.tile[data-tile="sign"] .tilelines a')].map((a) => a.getAttribute("href"));
    expect(links[0]).toBe("#/co/desk/sign?role=Medicaid+policy+owner");
  });
});

describe("the Programs pages", () => {
  it("lists every program with what it decides, its numbers from counts.ts", () => {
    const host = show("#/co/programs");
    const cards = [...host.querySelectorAll<HTMLElement>("li.pcard")];
    expect(cards.map((c) => c.dataset.program)).toEqual((engine.meta.programs ?? []).map((p) => p.id));
    const cw = host.querySelector('li.pcard[data-program="ColoradoWorks"]')!;
    const s = programSummary(engine, "ColoradoWorks", vol.openQuestions);
    expect(cw.querySelector(".pc-n")!.textContent).toBe(
      `${s.decisions.length} outcomes · ${s.rules} rules · ${s.figures} figures · ${s.openQuestions.length} open questions`,
    );
    expect(cw.querySelector("a")!.getAttribute("href")).toBe("#/co/programs/ColoradoWorks");
  });

  it("a program lists its outcomes, each with its rule's page and its steps, and has aid-code and Map tabs", () => {
    const host = show("#/co/programs/ColoradoWorks");
    const rows = [...host.querySelectorAll<HTMLElement>("ul.outcomerows > li.outcomerow")];
    expect(rows.length).toBe(7 + 17);
    const grant = host.querySelector('li.outcomerow[data-outcome="cw_grant_amount"]')!;
    expect(grant.querySelector("a.or-name")!.getAttribute("href")).toBe("#/co/item/CO-914");
    expect(grant.querySelector("a.explain")!.getAttribute("href")).toBe("#/co/programs/ColoradoWorks/cw_grant_amount");
    const tabs = [...host.querySelectorAll("nav.programtabs a")].map((a) => [a.textContent, a.getAttribute("href")]);
    expect(tabs).toEqual([
      ["What it decides", "#/co/programs/ColoradoWorks"],
      ["Aid codes", "#/co/programs/ColoradoWorks?tab=aid-codes"],
      ["Map", "#/co/programs/ColoradoWorks?tab=map"],
    ]);
    expect(show("#/co/programs/ColoradoWorks?tab=aid-codes").querySelector(".codecard")).toBeTruthy();
    const map = show("#/co/programs/ColoradoWorks?tab=map");
    expect(map.querySelector('nav.programtabs a[aria-current="page"]')!.textContent).toBe("Map");
    expect(map.querySelector('section.mapview[data-mode="embed"]')!.getAttribute("data-center")).toBe("program:ColoradoWorks");
  });

  it("explains an outcome step by step at a chosen depth, with print for a training", () => {
    const host = show("#/co/programs/ColoradoWorks/cw_grant_amount");
    expect(host.querySelector("h1")!.textContent).toBe(engine.item("cw_grant_amount")!.name);
    expect(host.querySelectorAll("ol.steplist > li.step")).toHaveLength(5);
    expect(host.querySelector("ol.steplist > li.step:last-child .step-n")!.textContent).toBe("Result");
    expect(host.querySelector("button.print")!.textContent).toBe("Print for a training");
    const chips = [...host.querySelectorAll("nav.depthchips a")].map((a) => a.textContent);
    expect(chips).toEqual(["The main steps", "Two levels", "Three levels", "Every rule (102)"]); // + CO-5651, CO-5652, CO-5654, - CO-2341 (receipts migration 2); + CO-5207, CO-5208 (fix round 2026-11-23)
    // The rule reads in plain words, never "-1 times".
    expect(host.querySelector("li.step.result")!.textContent).not.toMatch(/-1 times/);
    expect(show("#/co/programs/ColoradoWorks/cw_grant_amount?depth=2").querySelectorAll("li.step")).toHaveLength(20);
    expect(show("#/co/programs/ColoradoWorks/cw_grant_amount?depth=all").querySelectorAll("li.step")).toHaveLength(102); // + CO-5651, CO-5652, CO-5654, - CO-2341 (receipts migration 2)
  });

  it("shows a stored household's values beside each step", () => {
    const choices = householdsWithResult(vol.cases, "cw_grant_amount");
    expect(choices.map((x) => `${x.hc.id}/${x.person}`)).toContain("CO-07/p1");
    const host = show("#/co/programs/ColoradoWorks/cw_grant_amount?case=CO-07&person=p1");
    expect(host.querySelector("li.step.result .step-v")!.textContent).toBe("In this household: $387.00");
    expect(host.querySelector("li.step[data-step='cw_grant_before_sanction'] .step-v")!.textContent).toContain("$517");
  });
});

describe("the Figures page", () => {
  it("lists every figure on a date, with a word filter and three flags", () => {
    const host = show("#/co/figures");
    expect(host.querySelectorAll("tr.figure").length).toBeGreaterThan(40);
    expect(host.querySelector(".figcount")!.textContent).toContain("465 figures"); // + CO-5180 (E1 Medicaid); + CO-5125, CO-5151 (earnings E1, LEAP and CCCAP); + CO-5101 to CO-5107 (earnings E0); + CO-5500, CO-5510 (receipts migration 2, Medicaid, merged); + CO-5720, CO-5730 (receipts migration 2, CCCAP and SUN Bucks, merged); + CO-5650 (receipts migration 2); + CO-5202, CO-5217, CO-5218 (fix round 2026-11-23); + CO-5001, CO-5010, CO-5016 (receipts migration 1)
    const cw = show("#/co/figures?q=grant+standard&program=ColoradoWorks");
    const row = cw.querySelector('tr.figure[data-figure="cw_grant_standard_table"]')!;
    expect(row.querySelector("a.figname")!.getAttribute("href")).toBe("#/co/item/CO-276");
    expect(cw.querySelector(".figcount")!.textContent).toContain("of 465 figures"); // + CO-5180 (E1 Medicaid); + CO-5125, CO-5151 (earnings E1); + CO-5101 to CO-5107 (earnings E0); + CO-5650, CO-5720, CO-5730, CO-5500, CO-5510 (receipts migration 2)
    const late = show("#/co/figures?asof=2028-08-01&novalue=1&program=ColoradoWorks");
    expect(late.querySelector('tr.figure[data-figure="cw_grant_standard_table"] .warn')!.textContent).toContain("cannot determine");
    const flags = [...show("#/co/figures").querySelectorAll(".flags label")].map((l) => l.textContent);
    expect(flags).toEqual(["New version soon", "Unverified source", "No value on this date"]);
  });
});
