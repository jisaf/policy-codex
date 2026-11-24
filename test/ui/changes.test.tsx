/* Changes (docs/design-unified-ui.md): what takes effect by month, My
 * proposal's structured editor, its effect, approvers and refusal, pinned
 * against the Colorado volume. The persona tasks: Marcus's $90 earned-income
 * disregard (CO-273), Rosa's and Dana's "this month", and Dana's October 2026
 * federal immigrant restriction (CO-3034, read by CO-75). */
import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { render } from "preact";
import { loadVolume } from "../../src/tools/volumes";
import { emptyChangeSet, type ChangeEntry } from "../../src/changes/types";
import { ViewSlot } from "../../src/ui/App";
import {
  changedBy, changedSplit, changeMonths, changesInMonth, changesReadBy, documentReaders, householdsReached,
  householdsReadingAny, householdsThatRead, proposalReach, restingIndex,
} from "../../src/ui/counts";
import { personaById, personaRoles, personaSig } from "../../src/ui/personas";
import {
  asOfTheirDates, describeEntry, excerptChoices, figureChange, proposalApprovers, proposeHref, refusal,
  withPreviousFigure, type FigureDraft,
} from "../../src/ui/proposal";
import { canonicalRoute, internalRoute, parseHash } from "../../src/ui/router";
import { buildSearchIndex } from "../../src/ui/search";
import { stewardOf } from "../../src/ui/sendChange";
import {
  changeSetSig, draftsShownSig, engineSig, modeSig, reportSig, route, searchIndexSig, volumeSig,
} from "../../src/ui/state";
import { CodexEdits } from "../../src/ui/places/changes/CodexEdits";
import { viewContext } from "../../src/ui/views/context";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const item = (id: string) => engine.itemById(id)!;
const DISREGARD = "CO-273";
const IMMIGRANT = "CO-3034";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => boolean, ms = 30_000) {
  const end = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > end) throw new Error("timed out");
    await tick(20);
  }
}

function show(hash: string): HTMLElement {
  route.value = internalRoute(canonicalRoute(parseHash(hash)));
  const host = document.createElement("div");
  document.body.appendChild(host);
  render(<ViewSlot />, host);
  return host;
}

function type(el: Element, v: string) {
  (el as HTMLInputElement).value = v;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = "";
  volumeSig.value = vol;
  engineSig.value = engine;
  searchIndexSig.value = buildSearchIndex(vol, engine);
  changeSetSig.value = emptyChangeSet("co", "local");
  reportSig.value = null;
  modeSig.value = "read";
  draftsShownSig.value = null;
  personaSig.value = null;
  // The read index is built after the first paint in the app; build it now.
  restingIndex(engine, vol.cases);
});

describe("counts for the Changes place", () => {
  it("lists every month with changes, each with changesInMonth's total", () => {
    const months = changeMonths(engine, vol);
    const at = (m: string) => months.find((x) => x.month === m)?.total;
    expect(at("2026-10")).toBe(27); // + CO-118's FY2027 version from 2026-10-01 (fix round 2026-11-23)
    expect(at("2026-11")).toBe(5);
    expect(at("2026-12")).toBeUndefined();
    for (const m of months.slice(-6)) expect(m.total).toBe(changesInMonth(engine, vol, m.month).total);
  });

  it("households reading any of several items are the union of each one's readers", () => {
    const a = item("CO-276").identifier;
    const b = item(DISREGARD).identifier;
    const union = new Set([...householdsThatRead(engine, vol.cases, a), ...householdsThatRead(engine, vol.cases, b)]);
    expect(householdsReadingAny(engine, vol.cases, [a, b]).sort()).toEqual([...union].sort());
  });

  it("a proposal of one item has that item's read and reach: CO-273 is read by 20 and reaches 95", () => {
    const id = item(DISREGARD).identifier;
    const r = proposalReach(engine, vol.cases, [id]);
    expect(r.read).toEqual(householdsThatRead(engine, vol.cases, id));
    expect(r.reach).toEqual(householdsReached(engine, vol.cases, id));
    // The five Adult Financial coverage-round households (CO-165 to CO-169) are reached through af_barred_by_colorado_works.
    expect([r.read.length, r.reach.length]).toEqual([20, 95]); // cross-list records round: + CO-852 reached (the round's Adult Financial household); coverage pass 4 (Adult Financial, Colorado Works): + CO-770 to CO-779 reached (the review's repro households); resource records H1 Adult Financial: + CO-740 to CO-742 reached (copies of probe CO-300, reached as it is); earned-income records E1, cash: + CO-670 (Colorado Works earnings in records alone) reads it, CO-670 and CO-671 are reached; receipts migration 2: + CO-580 to CO-582 reached (Colorado Works households in receipts alone, no earnings); fix round 2026-11-23: + 2 new stored cases reached; Colorado Works coverage pass 2: CO-191 deems a parent's wages less the $90; pass 3: CO-206 (lodger's earned income) reads it, CO-206 to CO-208 are reached; probe-preservation round (CO-300 and up): CO-354, CO-361 to CO-365, CO-427, CO-428, CO-430 and CO-432 read it, 39 more are reached
  });

  it("$100 for the $90 disregard moves 24 steps on the way (countable income) and no outcome", () => {
    const it0 = item(DISREGARD);
    const rows = changedBy(engine, vol.cases, [{ id: it0.id, chapter: "parameters", before: it0, after: { ...it0, value: 100 } }]);
    const { outcomes, steps } = changedSplit(engine, rows);
    expect([outcomes.length, steps.length]).toEqual([0, 24]); // earned-income records E1, cash: + CO-670 p1 and p2 (countable income 310 to 300, still eligible); Colorado Works coverage pass 2: CO-191 deems a parent's wages less the $90 (257 to 247, still not below 245); pass 3: CO-206's countable income (310 to 300, still eligible); probe-preservation round (CO-300 and up): CO-354 and CO-361 to CO-364 (earned income and deemed wages, no outcome crosses a line)
    expect(steps.map((s) => s.caseId)).toContain("CO-83");
  });

  it("the household filter keeps what one household reads; a rule document is read through the items citing it", () => {
    const oct = changesInMonth(engine, vol, "2026-10");
    const mine = changesReadBy(engine, vol.cases, vol.sources, oct, "CO-75");
    expect(mine.events.map((e) => e.item.id)).toContain(IMMIGRANT);
    for (const e of mine.events) expect(householdsThatRead(engine, vol.cases, e.item.identifier)).toContain("CO-75");
    const d = documentReaders(engine, vol.cases, vol.sources, "D-173");
    expect(d.items.length).toBeGreaterThan(0);
    expect(d.households).toEqual(householdsReadingAny(engine, vol.cases, d.items.map((x) => x.identifier)));
  });
});

describe("the proposal's data", () => {
  const it0 = item(DISREGARD);
  const draft = (p: Partial<FigureDraft>): FigureDraft => ({ mode: "new", from: "2027-07-01", version: -1, value: 100, source: "S1000", ...p });

  it("adds a new dated version to an undated figure, keeping the old value before it", () => {
    const after = figureChange(it0, draft({}));
    if (typeof after === "string") throw new Error(after);
    expect(after.value).toBeUndefined();
    expect(after.versions!.map((v) => [v.from, v.to, v.value])).toEqual([["1900-01-01", "2027-07-01", 90], ["2027-07-01", undefined, 100]]);
    expect(describeEntry({ id: it0.id, chapter: "", before: it0, after })).toBe("New version from July 1, 2027: $90.00 → $100.00");
    // On the households' own dates it is a correction.
    expect(asOfTheirDates(it0, draft({}))!.value).toBe(100);
  });

  it("corrects a figure in place", () => {
    const after = figureChange(it0, draft({ mode: "correct", value: 95, source: "" }));
    if (typeof after === "string") throw new Error(after);
    expect(after.value).toBe(95);
    expect(describeEntry({ id: it0.id, chapter: "", before: it0, after })).toBe("Corrects the figure: $90.00 → $95.00");
  });

  it("refuses a change that changes nothing", () => {
    const same = figureChange(it0, draft({ mode: "correct", value: 90, source: "" }));
    expect(refusal(it0, same as typeof it0, draft({ mode: "correct", value: 90, source: "" }))).toMatch(/changes nothing/);
    const again = figureChange(it0, draft({ value: 90 }));
    expect(refusal(it0, again as typeof it0, draft({ value: 90 }))).toMatch(/\$90\.00 is already the figure/);
    expect(refusal(it0, figureChange(it0, draft({})) as typeof it0, draft({}))).toBeNull();
  });

  it("names excerpts by title, the figure's own first", () => {
    const choices = excerptChoices(it0, vol.sources);
    expect(choices[0].cited).toBe(true);
    expect(choices.map((c) => c.id)).toContain("S1000");
    for (const c of choices) expect(c.label).not.toMatch(/^S\d+\b/);
  });

  it("lists who must approve, with reasons, the data steward last; a reader's own role is marked", () => {
    const after = figureChange(it0, draft({ mode: "correct", value: 100, source: "" })) as typeof it0;
    const entry: ChangeEntry = { id: it0.id, chapter: "parameters", before: it0, after };
    const cdhs = personaRoles(personaById("cdhs")!, engine.meta);
    const list = proposalApprovers(engine, { entries: [entry] }, { steward: stewardOf(vol), myRoles: cdhs });
    const cash = list.find((a) => a.role === "Cash programs policy owner")!;
    expect(cash.reasons[0]).toMatch(/^Colorado Works earned income disregard.*: it is a Colorado Works item/);
    expect(cash.mine).toBe(true);
    const last = list[list.length - 1];
    expect(last.role).toBe("Data steward");
    expect(last.reasons[0]).toMatch(/merges the reviewed proposal into the codex \(the Colorado codex's Data steward\)/);
    // A signature alone needs only the merge.
    const sig: ChangeEntry = { id: it0.id, chapter: "parameters", before: it0, after: { ...it0, approval: [{ role: "Legal", date: "2026-11-22" }] } };
    expect(proposalApprovers(engine, { entries: [sig] }, { steward: null, myRoles: [] }).map((a) => a.role)).toEqual(["Data steward"]);
  });

  it("the previous figure of the October 2026 restriction is the one before it", () => {
    const it1 = item(IMMIGRANT);
    const without = withPreviousFigure(it1, "2026-10-01")!;
    expect(without.versions!.map((v) => v.value)).toEqual([false, false]);
    expect(withPreviousFigure(it1, "2025-07-04")).toBeNull();
  });

  it("the editor's address is Changes › My proposal with the item", () => {
    expect(proposeHref(parseHash("#/co/item/CO-273"), it0)).toBe("#/co/changes/proposal?item=CO-273");
  });
});

describe("What takes effect", () => {
  it("October 2026: Dana finds the federal immigrant restriction and compares it with the previous version", async () => {
    const host = show("#/co/changes?month=2026-10");
    expect(host.querySelector("h2.monthhead")!.textContent).toMatch(/October 2026: 27 changes took effect/);
    expect(host.querySelectorAll("li.change")).toHaveLength(27); // + CO-118 (fix round 2026-11-23)
    expect(host.querySelector('li.change[data-doc="D-82"]')).toBeTruthy();
    const row = host.querySelector(`li.change[data-item="${IMMIGRANT}"]`)!;
    expect(row.querySelector(".fromto")!.textContent).toBe("No → Yes");
    expect(row.querySelector(".readers")!.textContent).toContain("CO-75");
    expect(row.textContent).not.toMatch(/would change/);
    (row.querySelector("button.compare") as HTMLButtonElement).click();
    await until(() => Boolean(row.querySelector("table.changed")));
    expect(row.querySelector(".compared")!.textContent).toMatch(/10 stored results in 1 household would change/);
    const first = row.querySelector("table.changed tbody tr")!;
    expect(first.getAttribute("data-case")).toBe("CO-75");
    expect(first.querySelector('a[href^="#/co/households/CO-75/p1/"]')).toBeTruthy();
  });

  it("the household filter keeps only what CO-75 reads, and the month picker lists months with counts", () => {
    const host = show("#/co/changes?month=2026-10&hh=CO-75");
    const rows = [...host.querySelectorAll("li.change[data-item]")].map((li) => li.getAttribute("data-item"));
    expect(rows).toContain(IMMIGRANT);
    expect(rows.length).toBeLessThan(24);
    const opts = [...host.querySelectorAll(".monthpick select")[0].querySelectorAll("option")].map((o) => o.textContent);
    expect(opts).toContain("October 2026 (27)");
    expect(opts.some((o) => /^November 2026 \(5\)/.test(o!))).toBe(true);
  });

  it("an empty month says so and points to the nearest months with changes", () => {
    const host = show("#/co/changes?month=2026-12");
    expect(host.querySelector(".empty")!.textContent).toMatch(/Nothing .* effect in December 2026/);
    expect([...host.querySelectorAll(".empty a")].map((a) => a.textContent)).toContain("November 2026 (5)");
  });
});

describe("My proposal", () => {
  it("Marcus changes the $90 disregard: refused when it changes nothing, then its effect and approvers", async () => {
    personaSig.value = "cdhs";
    const host = show(`#/co/changes/proposal?item=${DISREGARD}`);
    const ed = host.querySelector("section.propose-editor")!;
    const modes = [...ed.querySelectorAll("label.mode b")].map((b) => b.textContent);
    expect(modes).toEqual(["Add a new dated version", "Correct the figure"]);
    for (const o of ed.querySelectorAll('select[name="excerpt"] option')) expect(o.textContent).not.toMatch(/\bS\d{2,}\b/);
    // The App's text editor is for implementers, in edit mode only.
    expect(ed.textContent).not.toContain("Open in the text editor");

    // A correction to the same figure changes nothing.
    (ed.querySelector('input[name="mode"][value="correct"]') as HTMLInputElement).click();
    await until(() => Boolean(ed.querySelector(".refuse")));
    expect(ed.querySelector(".refuse")!.textContent).toMatch(/changes nothing/);
    expect((ed.querySelector("button.addto") as HTMLButtonElement).disabled).toBe(true);

    type(ed.querySelector('input[name="value"]')!, "100");
    await until(() => !ed.querySelector(".refuse"));
    const effect = host.querySelector("section.effect")!;
    // The draft reaches the effect panel after the editor's effect runs.
    await until(() => Boolean(effect.querySelector(".reach")));
    expect(effect.querySelector(".reach")!.textContent).toBe(`Read by 20 of ${vol.cases.length} stored households; it reaches 95.`); // + CO-852 (cross-list records round, an Adult Financial household); + CO-770 to CO-779 (coverage pass 4 (Adult Financial, Colorado Works)); + CO-740 to CO-742 (resource records H1 Adult Financial, copies of CO-300); + CO-670, CO-671 (earned-income records E1, cash); + CO-580 to CO-582 (receipts migration 2)
    await until(() => effect.getAttribute("aria-busy") === "false");
    expect(effect.textContent).toMatch(/24 stored results in \d+ households would change/); // + CO-670 p1, p2 (earned-income records E1, cash)
    expect(effect.textContent).toMatch(/Outcomes that change \(0\)/);
    expect(effect.textContent).toMatch(/Steps on the way that change \(24\)/);

    const approvers = host.querySelector("section.approvers")!;
    const roles = [...approvers.querySelectorAll("li[data-role]")].map((li) => li.getAttribute("data-role"));
    expect(roles[0]).toBe("Cash programs policy owner");
    expect(roles[roles.length - 1]).toBe("Data steward");
    expect(approvers.querySelector("li.mine .own-change")!.textContent).toMatch(/your own change/);
    // Nobody is offered Approve on this page.
    expect([...host.querySelectorAll("button")].some((b) => /approve/i.test(b.textContent ?? ""))).toBe(false);

    (ed.querySelector("button.addto") as HTMLButtonElement).click();
    expect(changeSetSig.value.entries.map((e) => e.id)).toEqual([DISREGARD]);
    expect(changeSetSig.value.entries[0].after!.value).toBe(100);
  });

  it("a new version after the households' dates changes none of them, and says what it would do on their dates", async () => {
    const host = show(`#/co/changes/proposal?item=${DISREGARD}`);
    const ed = host.querySelector("section.propose-editor")!;
    type(ed.querySelector('input[name="from"]')!, "2027-07-01");
    type(ed.querySelector('input[name="value"]')!, "100");
    const effect = host.querySelector("section.effect")!;
    await until(() => /Applied on the households' own dates/.test(effect.textContent ?? ""));
    expect(effect.querySelector(".nochange")!.textContent).toMatch(/No stored household result would change\. Their results are for dates before July 1, 2027/);
    expect(effect.textContent).toMatch(/24 stored results in \d+ households would change/); // + CO-670 (earned-income records E1, cash)
  });

  it("lists what the proposal holds by name, with the no-GitHub download path", () => {
    const it0 = item(DISREGARD);
    changeSetSig.value = { ...emptyChangeSet("co", "local"), entries: [{ id: it0.id, chapter: "parameters", before: it0, after: { ...it0, value: 100 } }] };
    const host = show("#/co/changes/proposal");
    const li = host.querySelector("section.holds li.entry")!;
    expect(li.querySelector("a")!.textContent).toBe(it0.name);
    expect(li.querySelector(".what")!.textContent).toBe("Corrects the figure: $90.00 → $100.00");
    expect(li.querySelector(`a[href="#/co/changes/proposal?item=${DISREGARD}"]`)!.textContent).toBe("Change it");
    const send = host.querySelector("section.send")!;
    expect(send.querySelector("button.download")).toBeTruthy();
    expect(send.textContent).toMatch(/Send that file to the Colorado codex's Data steward/);
    expect((send.querySelector("button.propose") as HTMLButtonElement).disabled).toBe(true);
    expect(send.textContent).not.toContain("Open the change tray");
    // The tab names its count, the same as the top bar's pill.
    expect(host.querySelector('nav.changetabs a[aria-current="page"]')!.textContent).toBe("My proposal (1)");
  });
});

describe("Edits to the codex", () => {
  it("lists the volume's recent commits, apart from what takes effect", async () => {
    route.value = parseHash("#/co/changes/codex");
    const host = document.createElement("div");
    const ctx = viewContext()!;
    render(
      <CodexEdits ctx={ctx} fetchHistory={async () => [{ sha: "abcdef1234", date: "2026-11-20T10:00:00Z", message: "co: LEAP limits", url: "https://example.test/c" }]} />,
      host,
    );
    await until(() => Boolean(host.querySelector("ul.history li")));
    expect(host.querySelector("ul.history li")!.textContent).toContain("November 20, 2026");
    expect(host.textContent).toContain("This is not law taking effect");
  });
});
