/* Every place renders at its canonical address on the Colorado volume, each
 * older address lands on the same content, and the first-version pages
 * read their numbers from counts.ts. */
import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { render } from "preact";
import { loadVolume } from "../../src/tools/volumes";
import { emptyChangeSet } from "../../src/changes/types";
import { ViewSlot } from "../../src/ui/App";
import {
  changesInMonth, departureItems, figuresWithoutValue, itemsCitingUnverified,
} from "../../src/ui/counts";
import { personaSig } from "../../src/ui/personas";
import { unverifiedIds } from "../../src/ui/provenance";
import { canonicalRoute, internalRoute, parseHash } from "../../src/ui/router";
import { buildSearchIndex } from "../../src/ui/search";
import { changeSetSig, draftsShownSig, engineSig, modeSig, route, searchIndexSig, volumeSig } from "../../src/ui/state";
import { todayIso } from "../../src/ui/views/context";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");

function show(hash: string): HTMLElement {
  route.value = internalRoute(canonicalRoute(parseHash(hash)));
  const host = document.createElement("div");
  render(<ViewSlot />, host);
  return host;
}

beforeEach(() => {
  volumeSig.value = vol;
  engineSig.value = engine;
  searchIndexSig.value = buildSearchIndex(vol, engine);
  changeSetSig.value = emptyChangeSet("co", "local");
  modeSig.value = "read";
  draftsShownSig.value = null;
  personaSig.value = null;
});

describe("the seven places", () => {
  it("the Desk asks for a role, then shows the role's work", () => {
    const host = show("#/co/desk");
    expect(host.querySelector(".placehead h1")!.textContent).toBe("Desk");
    expect(host.querySelectorAll(".rolechoice .door")).toHaveLength(6);
    personaSig.value = "cdhs";
    const host2 = show("#/co/desk");
    expect(host2.querySelector('div.persona[data-persona="cdhs"]')).toBeTruthy();
    expect(host2.querySelector(".countcard a[href*='/desk/sign']")).toBeTruthy();
  });

  it("an older role page lands on the Desk for that role", () => {
    const host = show("#/co/roles/legal");
    expect(host.querySelector('div.persona[data-persona="legal"]')).toBeTruthy();
  });

  it("Households lists the stored households, and each has a page with four tabs", () => {
    const list = show("#/co/households");
    expect(list.querySelector(".placehead h1")!.textContent).toBe("Households");
    expect(list.querySelectorAll("ul.wk-cases li").length).toBe(vol.cases.length);
    expect(list.querySelector('ul.wk-cases li[data-case="CO-01"] a')!.getAttribute("href")).toBe("#/co/households/CO-01");

    const page = show("#/co/households/CO-01");
    const tabs = [...page.querySelectorAll("nav.hhtabs a")].map((a) => a.textContent);
    expect(tabs).toEqual(["Results and aid codes", "Documents still needed", "What if", "What the case states"]);
    expect(page.querySelector('nav.hhtabs a[aria-current="page"]')!.textContent).toBe("Results and aid codes");
    expect(page.querySelector('table.household[data-case="CO-01"]')).toBeTruthy();

    const docs = show("#/co/households/CO-92?tab=documents");
    expect(docs.querySelector('table.wk-docs tr[data-doc="cccap_work_hours_verification_is_pending"]')!.textContent).toContain("October 16, 2026");

    const states = show("#/co/households/CO-01?tab=states");
    expect(states.querySelector("table.expectations")).toBeTruthy();
    // The relationship sentences read as English.
    expect(states.textContent).not.toMatch(/is the gave birth to of|is the [a-z ]+ with of/);
  });

  it("an older walkthrough address opens the determination page", () => {
    const host = show("#/co/walkthrough/CO-01?person=p3&program=SNAP");
    expect(host.querySelector(".wk-person")!.textContent).toContain("Person 3");
    // Its links come back canonical.
    const chip = host.querySelector('.wk-pick a.chip[data-person="p1"]')!.getAttribute("href")!;
    expect(chip).toMatch(/^#\/co\/households\/CO-01\/p1/);
  });

  it("Figures lists every dated figure in force on a date, filtered by words", () => {
    const host = show("#/co/figures?q=children+income+limit");
    expect(host.querySelector(".placehead h1")!.textContent).toBe("Figures");
    const names = [...host.querySelectorAll("li.figure .fighead a")].map((a) => a.textContent);
    expect(names.length).toBeGreaterThan(0);
    expect(host.querySelector('li.figure[data-figure="ma_income_limit_child_pct"]')).toBeTruthy();
    const none = show(`#/co/figures?novalue=1&asof=${todayIso()}`);
    const noValue = new Set(figuresWithoutValue(engine, todayIso()).map((it) => it.identifier));
    const listed = [...none.querySelectorAll("li.figure")].map((li) => li.getAttribute("data-figure")!);
    expect(listed.length).toBeGreaterThan(0);
    for (const f of listed) expect(noValue.has(f), f).toBe(true);
  });

  it("Law shows its counts from counts.ts and its sections", () => {
    const host = show("#/co/law");
    const nums = [...host.querySelectorAll(".lawcards .num")].map((n) => Number(n.textContent!.replace(/,/g, "")));
    expect(nums).toEqual([
      departureItems(engine, { asOf: todayIso() }).length,
      itemsCitingUnverified(engine, unverifiedIds(vol.sources)).length,
      vol.sources.length,
      vol.documents.length,
    ]);
    expect(show("#/co/law/unverified").querySelectorAll("ul.unverified li").length).toBe(nums[1]);
    expect(show("#/co/law/departures").querySelectorAll("li.departure").length).toBe(nums[0]);
  });

  it("Changes lists what takes effect in a month, rule documents included", () => {
    const host = show("#/co/changes?month=2026-11");
    const n = changesInMonth(engine, vol, "2026-11");
    expect(host.querySelector("h2.monthhead")!.textContent).toMatch(new RegExp(`${n.total} changes (take|took|will take) effect`));
    expect(host.querySelectorAll("li.change").length).toBe(n.total);
    const proposal = show("#/co/changes/proposal");
    expect(proposal.querySelector("section.holds")).toBeTruthy();
  });

  it("Programs, Questions and Law's documents keep their content", () => {
    expect(show("#/co/programs/SNAP").querySelector(".tabs a.on")!.textContent).toContain("SNAP");
    expect(show("#/co/questions").querySelector("ul.qlist")).toBeTruthy();
    expect(show("#/co/law/doc").textContent).toContain("D-1");
    expect(show("#/co/programs/Medicaid?tab=aid-codes").querySelector(".codecard")).toBeTruthy();
  });
});

describe("search", () => {
  it("the results page groups by type and matches every word", () => {
    const host = show("#/co/search?q=grant+standard+colorado+works");
    const groups = [...host.querySelectorAll("section.group")].map((g) => g.getAttribute("data-group"));
    expect(groups[0]).toBe("rule");
    expect(groups).toContain("figure");
    // The Colorado Works grant standard is among the figures; the page lists, it never jumps.
    const figs = [...host.querySelectorAll('section[data-group="figure"] li a')].map((a) => a.getAttribute("href"));
    expect(figs).toContain("#/co/item/CO-276");
  });
});
