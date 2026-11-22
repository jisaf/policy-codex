/* The shell (docs/design-unified-ui.md, build step 1): the sidebar's seven
 * places, its "For implementers" menu and role picker, the top bar's search
 * (Enter opens the results page, never the first hit), the proposal pill,
 * the breadcrumb trail agreeing with the sidebar's highlight, and the volume
 * and ledger selectors. */
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { Breadcrumbs, Header } from "../../src/ui/Header";
import { Sidebar } from "../../src/ui/Sidebar";
import { buildSearchIndex } from "../../src/ui/search";
import { createEngine } from "../../src/engine/engine";
import { emptyChangeSet } from "../../src/changes/types";
import { personaSig } from "../../src/ui/personas";
import {
  changeSetSig, doorSig, engineSig, manifestSig, modeSig, route, searchIndexSig, volumeSig,
} from "../../src/ui/state";
import { canonicalRoute, defaultRoute, internalRoute, parseHash } from "../../src/ui/router";
import { crumbsFor, navOpenSig, placeOf, PLACES } from "../../src/ui/shell";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const vol = {
  volumeId: "mwr", title: "Work requirements", path: "volumes/mwr", ref: "main", sha: null,
  meta: ledger.meta, items: ledger.items, sources: [], openQuestions: [], chapterOf: {},
  cases: [{ id: "C-01", title: "A household", as_of: "2026-01-01", persons: { p1: {} }, expect: {} }], documents: [],
} as unknown as LoadedVolume;

/** Puts an address in the route the way the router does. */
function at(hash: string): void {
  route.value = internalRoute(canonicalRoute(parseHash(hash)));
}

const tick = () => new Promise((r) => setTimeout(r));

beforeEach(() => {
  route.value = defaultRoute();
  volumeSig.value = vol;
  engineSig.value = engine;
  searchIndexSig.value = buildSearchIndex(vol, engine);
  modeSig.value = "read";
  doorSig.value = null;
  manifestSig.value = null;
  personaSig.value = null;
  navOpenSig.value = false;
  changeSetSig.value = emptyChangeSet("mwr", "main");
});

describe("Sidebar", () => {
  it("lists the seven places, in order, each a link to its place", () => {
    const host = document.createElement("div");
    render(<Sidebar />, host);
    const links = [...host.querySelectorAll("nav.places a")];
    expect(links.map((a) => a.textContent)).toEqual(["Desk", "Programs", "Figures", "Households", "Questions", "Law", "Changes"]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(PLACES.map((p) => `#/mwr/${p.id}`));
    expect(host.textContent).toContain("Benefits Codex");
  });

  it("keeps the implementer tools in a secondary menu", () => {
    const host = document.createElement("div");
    render(<Sidebar />, host);
    const menu = host.querySelector("details.implementers")!;
    expect(menu.querySelector("summary")!.textContent).toBe("For implementers");
    const hrefs = [...menu.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["#/mwr/table", "#/mwr/handoff", "#/mwr/handoff?show=conformance", "#/mwr/graph"]);
    // None of them is a place.
    expect([...host.querySelectorAll("nav.places a")].some((a) => /table|graph|handoff/.test(a.getAttribute("href")!))).toBe(false);
  });

  it("highlights the place of the page, and the breadcrumb starts with that same place", () => {
    const cases: Array<[string, string]> = [
      ["#/mwr/desk", "desk"],
      ["#/mwr/households/C-01", "households"],
      ["#/mwr/households/C-01/p1/medicaid_ce_status_at_application", "households"],
      ["#/mwr/questions/OQ-1", "questions"],
      ["#/mwr/law/doc/D-1?at=S1", "law"],
      ["#/mwr/programs/Medicaid", "programs"],
      ["#/mwr/changes/proposal", "changes"],
      // A figure's page is under Figures; a rule's under Programs.
      [`#/mwr/item/${(ledger.items as Item[]).find((i) => i.kind === "parameter")!.id}`, "figures"],
      [`#/mwr/item/${(ledger.items as Item[]).find((i) => i.kind === "derived")!.id}`, "programs"],
    ];
    for (const [hash, place] of cases) {
      at(hash);
      const host = document.createElement("div");
      render(<><Sidebar /><Breadcrumbs /></>, host);
      const on = [...host.querySelectorAll("nav.places a.on")];
      expect(on.map((a) => a.getAttribute("data-place")), hash).toEqual([place]);
      expect(on[0].getAttribute("aria-current")).toBe("page");
      const first = host.querySelector("nav.crumbs li")!.textContent;
      expect(first, hash).toBe(PLACES.find((p) => p.id === place)!.label);
      render(null, host);
    }
  });

  it("puts the implementer pages under the implementer menu, opened", () => {
    at("#/mwr/table");
    const host = document.createElement("div");
    render(<Sidebar />, host);
    expect(host.querySelectorAll("nav.places a.on")).toHaveLength(0);
    expect((host.querySelector("details.implementers") as HTMLDetailsElement).open).toBe(true);
    expect(host.querySelector('details.implementers a[aria-current="page"]')!.textContent).toBe("Table of every item");
  });

  it("has the only role picker, and choosing a role remembers it", () => {
    at("#/mwr/desk");
    const host = document.createElement("div");
    render(<Sidebar />, host);
    const pick = host.querySelectorAll("select[aria-label='Working as']");
    expect(pick).toHaveLength(1);
    const select = pick[0] as HTMLSelectElement;
    select.value = "cdhs";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(personaSig.value).toBe("cdhs");
  });

  it("badges Changes with the proposal's size", async () => {
    const it0 = (ledger.items as Item[])[0];
    changeSetSig.value = { ...emptyChangeSet("mwr", "main"), entries: [{ id: it0.id, chapter: "x", before: it0, after: { ...it0, meaning: "x" } }] };
    const host = document.createElement("div");
    render(<Sidebar />, host);
    expect(host.querySelector('a[data-place="changes"] .badge')!.textContent).toBe("1");
  });

  it("opens as a drawer from the Menu button and closes on Escape", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    render(<><Header /><Sidebar /></>, host);
    const menu = host.querySelector("button.navtoggle") as HTMLButtonElement;
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    await tick();
    menu.click();
    await tick();
    expect(host.querySelector("aside.sidebar")!.classList.contains("open")).toBe(true);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await tick();
    expect(host.querySelector("aside.sidebar")!.classList.contains("open")).toBe(false);
    render(null, host);
    host.remove();
  });

  it("shows no volume selector, only the title, when the manifest lists one volume", () => {
    manifestSig.value = {
      volumes: [{ id: "mwr", title: "Work requirements", path: "volumes/mwr", chapters: [] }],
    };
    const host = document.createElement("div");
    render(<Sidebar />, host);
    expect(host.querySelector("select.volume-select")).toBeNull();
    expect(host.querySelector("span.volume")!.textContent).toBe("Work requirements");
  });

  it("switching the volume opens the chosen volume's Desk", async () => {
    manifestSig.value = {
      volumes: [
        { id: "mwr", title: "Work requirements", path: "volumes/mwr", chapters: [] },
        { id: "co", title: "Colorado", path: "volumes/co", status: "draft", chapters: [] },
      ],
    };
    location.hash = "#/mwr/table";
    const host = document.createElement("div");
    render(<Sidebar />, host);
    const select = host.querySelector("select.volume-select") as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual(["Work requirements", "Colorado (draft)"]);
    select.value = "co";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(location.hash).toBe("#/co/desk");
  });

  it("shows the ref badge when a pull request is open", () => {
    route.value = { ...defaultRoute(), ref: "pr/12" };
    const host = document.createElement("div");
    render(<Sidebar />, host);
    expect(host.textContent).toContain("pr/12");
  });
});

describe("Header", () => {
  it("shows grouped suggestions as the analyst types", async () => {
    const host = document.createElement("div");
    render(<Header />, host);
    const input = host.querySelector("input[type=search]") as HTMLInputElement;
    input.value = "date of birth";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    expect(host.querySelector(".results")!.textContent).toContain("Date of Birth");
    expect(host.querySelector(".results")!.textContent).toContain("Facts");
  });

  it("Enter opens the results page, never the first hit", async () => {
    location.hash = "#/mwr/desk";
    const host = document.createElement("div");
    render(<Header />, host);
    const input = host.querySelector("input[type=search]") as HTMLInputElement;
    input.value = "date of birth";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    host.querySelector("form.searchbox")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await tick();
    expect(location.hash).toBe("#/mwr/search?q=date+of+birth");
  });

  it("carries the proposal pill: empty, then the count of staged changes, linking to My proposal", async () => {
    const host = document.createElement("div");
    render(<Header />, host);
    const pill = () => host.querySelector("a.proposal-pill")!;
    expect(pill().textContent).toBe("No proposal");
    expect(pill().getAttribute("href")).toBe("#/mwr/changes/proposal");
    const it0 = (ledger.items as Item[])[0];
    changeSetSig.value = { ...emptyChangeSet("mwr", "main"), entries: [{ id: it0.id, chapter: "x", before: it0, after: { ...it0, meaning: "x" } }] };
    await tick();
    expect(pill().textContent).toBe("Your proposal 1");
    expect(pill().classList.contains("has")).toBe(true);
  });

  it("hides edit controls in read mode and shows them in edit mode", () => {
    const host = document.createElement("div");
    render(<Header />, host);
    expect(host.textContent).not.toContain("New item");
    expect(host.querySelector("button.mode-toggle")!.textContent).toBe("Turn on edit mode");
    modeSig.value = "edit";
    render(<Header />, host);
    expect(host.textContent).toContain("New item");
    expect(host.textContent).toContain("Settings");
    expect(host.querySelector("button.mode-toggle")!.textContent).toBe("Turn off edit mode");
  });
});

describe("Breadcrumbs", () => {
  it("names each object down to the page, the page itself not a link", () => {
    const c = canonicalRoute(parseHash("#/mwr/households/C-01/p1/medicaid_ce_status_at_application"));
    const crumbs = crumbsFor(c, { engine, cases: vol.cases });
    expect(crumbs.map((x) => x.label)).toEqual(["Households", "C-01: A household", "Person 1", engine.item("medicaid_ce_status_at_application")!.name]);
    expect(crumbs[0].href).toBe("#/mwr/households");
    expect(crumbs[1].href).toBe("#/mwr/households/C-01");
    expect(crumbs[crumbs.length - 1].href).toBeNull();
  });

  it("says the tab of a household's page", () => {
    const c = canonicalRoute(parseHash("#/mwr/households/C-01?tab=documents"));
    expect(crumbsFor(c, { cases: vol.cases }).map((x) => x.label)).toEqual(["Households", "C-01: A household", "Documents still needed"]);
  });

  it("puts a rule under its program and a figure under Figures", () => {
    const rule = (ledger.items as Item[]).find((i) => i.kind === "derived" && i.program !== "All")!;
    const c = canonicalRoute(parseHash(`#/mwr/item/${rule.id}`));
    expect(placeOf(c, engine)).toBe("programs");
    expect(crumbsFor(c, { engine }).map((x) => x.label)).toEqual(["Programs", rule.program, rule.name]);
  });
});
