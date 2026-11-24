import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render } from "preact";
import { ItemView } from "../../src/ui/ItemView";
import { DecisionRecord } from "../../src/ui/DecisionRecord";
import { createEngine } from "../../src/engine/engine";
import { parseCases } from "../../src/engine/cases";
import { fileEntries } from "../../src/changes/types";
import {
  changeSetSig, engineSig, modeSig, route, trayOpenSig, volumeSig,
} from "../../src/ui/state";
import { emptyChangeSet } from "../../src/changes/types";
import { defaultRoute } from "../../src/ui/router";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const root = path.resolve(__dirname, "../..");
const casesText = fs.readFileSync(path.join(root, "volumes/mwr/tests/cases.yaml"), "utf8");
const cases = parseCases(casesText);

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const vol = {
  volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "main", sha: null,
  meta: ledger.meta, items: ledger.items,
  sources: [{
    id: "S1", title: "Applicable individual", citation: "42 U.S.C. 1396a",
    text: "statute text here", document: "D-1",
  }],
  documents: [{
    id: "D-1", title: "State plans for medical assistance", kind: "statute",
    citation: "42 U.S.C. 1396a", file: "documents/D-1.md",
  }],
  openQuestions: [{
    id: "OQ-1", title: "Age during a month",
    body: "Assumption: a person keeps the age they hold on the first day of the month.",
    items: ["WR-004"],
  }],
  chapterOf: { "WR-200": "medicaid", "WR-003": "medicaid", "WR-302": "snap" },
  cases, casesText,
} as unknown as LoadedVolume;

function show(id: string) {
  route.value = { ...defaultRoute(), view: "item", arg: id };
  volumeSig.value = vol;
  engineSig.value = engine;
  const host = document.createElement("div");
  render(<ItemView />, host);
  return host;
}

describe("ItemView", () => {
  beforeEach(() => {
    route.value = defaultRoute();
    changeSetSig.value = emptyChangeSet("mwr", "main");
    trayOpenSig.value = false;
    // Edit and Rename only render in edit mode; every existing test here
    // exercises the reader page or an editing flow, so edit mode is on
    // throughout and the reader-mode gate gets its own test in header.test.tsx.
    modeSig.value = "edit";
  });

  it("leads with the name, the kind in words, and the id small", () => {
    const host = show("WR-200");
    expect(host.querySelector("h1")!.textContent).toBe(
      "Medicaid: is in the community engagement age range",
    );
    expect(host.querySelector(".eyebrow")!.textContent).toMatch(/^A (rule|program outcome) · /);
    expect(host.querySelector(".idline")!.textContent).toContain("WR-200");
    expect(host.querySelector(".idline")!.textContent).toContain("medicaid_in_ce_age_range");
  });

  it("says how a rule is decided in plain sentences, each item a token, no identifiers", () => {
    const host = show("WR-200");
    const rule = host.querySelector(".decided .derivation")!;
    expect(rule.textContent).not.toMatch(/[a-z]+_[a-z_]+/);
    expect(rule.querySelector("button.tok[data-id]")).not.toBeNull();
    // The ledger's own words stay, at the foot, for implementers.
    expect(host.querySelector("details.implementers pre.derivation")!.textContent).toContain(
      "Medicaid: is in the community engagement age range is true when",
    );
  });

  it("shows a fact's meaning and a figure's value on the page", () => {
    expect(show("WR-001").querySelector(".lead-meaning")!.textContent)
      .toContain("The calendar date on which the person was born");
    expect(show("WR-102").querySelector(".figure-today .bigvalue")!.textContent).toBe("19");
  });

  it("shows the law word for word, visible, with a link into the full document", () => {
    const host = show("WR-200");
    const law = host.querySelector("section#law")!;
    expect(law.closest("details")).toBeNull();
    expect(law.querySelector("blockquote.words")!.textContent).toBe("statute text here");
    const link = [...law.querySelectorAll("a")].find((a) => a.textContent!.startsWith("Read it in the full document"))!;
    expect(link.getAttribute("href")).toBe("#/mwr/law/doc/D-1?at=S1");
  });

  it("lists the questions it rests on, with the reading in force meanwhile", () => {
    const host = show("WR-004");
    const qs = host.querySelector("section#questions")!;
    const a = qs.querySelector("a")!;
    expect(a.textContent).toBe("Age during a month");
    expect(a.getAttribute("href")).toBe("#/mwr/questions/OQ-1");
    expect(qs.textContent).toMatch(/a person keeps the age they hold on the first day of the month/i);
  });

  it("offers the Map as a tab, centred on the item", () => {
    const host = show("WR-200");
    const tab = host.querySelector('.itemtabs a[data-tab="map"]')!;
    expect(tab.getAttribute("href")).toBe("#/mwr/item/WR-200?tab=map");
    route.value = { ...defaultRoute(), view: "item", arg: "WR-200", params: { tab: "map" } };
    render(<ItemView />, host);
    expect(host.querySelector(".itemmap")).not.toBeNull();
    expect(host.querySelector(".itemgrid")).toBeNull();
  });

  it("holds the sign-off panel, Propose a change and Ask a question in the rail", () => {
    const host = show("WR-200");
    const rail = host.querySelector("aside.itemrail")!;
    expect(rail.querySelector("#signoff h2")!.textContent).toBe("Sign-off");
    expect(rail.querySelector("#propose h2")!.textContent).toBe("Propose a change");
    expect(rail.querySelector("#ask h2")!.textContent).toBe("Ask a question");
  });

  it("'Propose a change' opens the one editor, My proposal with the item chosen (proposal.ts proposeHref)", () => {
    const host = show("WR-200");
    const link = host.querySelector("#propose a.btn") as HTMLAnchorElement;
    expect(link.textContent).toBe("Change what it means");
    expect(link.getAttribute("href")).toBe("#/mwr/changes/proposal?item=WR-200");
    // No second editor in the rail.
    expect(host.querySelector("#propose form")).toBeNull();
    expect(changeSetSig.value.entries).toHaveLength(0);
  });

  it("keeps tests, uses and the projection under For implementers", () => {
    const host = show("WR-200");
    const impl = host.querySelector("details.implementers")!;
    const rows = impl.querySelectorAll("table.tests tbody tr");
    expect(rows).toHaveLength(4);
    expect([...rows].every((r) => r.textContent!.includes("pass"))).toBe(true);
    expect(impl.querySelector(".uses")!.textContent).toContain("Medicaid community engagement minimum age");
    expect(impl.querySelector(".used-by")!.textContent).toContain("Medicaid: is an applicable individual");
    expect(impl.querySelector("pre.projection")!.textContent).toContain(
      "Rule           RL-001 Medicaid: is in the community engagement age range",
    );
    expect(impl.querySelector(".decision-record")!.textContent).toContain("none recorded");
  });

  it("shows each version's own end date and excerpt in the implementers' version table", () => {
    const amended = engine.items().map((it) => it.identifier === "federal_minimum_wage"
      ? {
          ...it,
          versions: [
            { from: "2009-07-24", to: "2026-01-01", value: 7.25, source: "S18" },
            { from: "2026-01-01", value: 9.5 },
          ],
        }
      : it);
    route.value = { ...defaultRoute(), view: "item", arg: "WR-101" };
    volumeSig.value = vol;
    engineSig.value = engine.withItems(amended);
    const host = document.createElement("div");
    render(<ItemView />, host);
    const rows = [...host.querySelectorAll("table.versions tbody tr")];
    expect(rows.map((tr) => [...tr.children].map((td) => td.textContent))).toEqual([
      ["2009-07-24", "2026-01-01", "$7.25", "S18"],
      ["2026-01-01", "present", "$9.50", ""],
    ]);
    // Figures over time: the version in force today and the one before it.
    const versions = [...host.querySelectorAll(".fversion")].map((a) => a.getAttribute("data-from"));
    expect(versions).toEqual(["2026-01-01", "2009-07-24"]);
    expect(host.querySelector(".fversion.current")!.getAttribute("data-from")).toBe("2026-01-01");
    engineSig.value = engine;
  });

  it("says when an item is missing", () => {
    const host = show("WR-999");
    expect(host.textContent).toContain("No item WR-999 in this volume.");
  });

  it("stages a rename plus its dependents in the tray", async () => {
    const host = show("WR-001");
    (host.querySelector("button.rename") as HTMLButtonElement).click();
    render(<ItemView />, host);

    const input = host.querySelector("input.rename-input") as HTMLInputElement;
    input.value = "dob_x";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    render(<ItemView />, host);

    const confirm = host.querySelector("button.confirm-rename") as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    confirm.click();
    await new Promise((r) => setTimeout(r));

    const { changed } = engine.rename("date_of_birth", "dob_x");
    expect(changeSetSig.value.entries).toHaveLength(changed.length);
    const ids = changeSetSig.value.entries.map((e) => e.id);
    expect(ids).toContain("WR-001");
    const ageEntry = changeSetSig.value.entries.find((e) => e.after?.identifier === "age");
    expect(ageEntry).toBeDefined();
    expect(ageEntry!.after!.derived).not.toEqual(ageEntry!.before!.derived);
    expect(trayOpenSig.value).toBe(true);
  });

  it("stages a rewritten cases.yaml when the rename reaches household cases", async () => {
    const host = show("WR-302");
    (host.querySelector("button.rename") as HTMLButtonElement).click();
    render(<ItemView />, host);

    const input = host.querySelector("input.rename-input") as HTMLInputElement;
    input.value = "snap_responsible_for_young_child";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    render(<ItemView />, host);

    const confirm = host.querySelector("button.confirm-rename") as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    confirm.click();
    await new Promise((r) => setTimeout(r));

    const file = fileEntries(changeSetSig.value).find((f) => f.path === "volumes/mwr/tests/cases.yaml");
    expect(file).toBeDefined();
    expect(file!.after).toContain("snap_responsible_for_young_child");
    // The old name survives only as a substring of the new one (e.g. inside
    // a comment or another identifier), never at a key position.
    const keyLines = file!.after!.split("\n").filter((l) => /^\s*snap_has_responsibility_for_child_under_14:/.test(l));
    expect(keyLines).toEqual([]);
    expect(trayOpenSig.value).toBe(true);
  });

  it("blocks an invalid rename target with a note and a disabled confirm", async () => {
    const host = show("WR-001");
    (host.querySelector("button.rename") as HTMLButtonElement).click();
    render(<ItemView />, host);

    const input = host.querySelector("input.rename-input") as HTMLInputElement;
    input.value = "age";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    render(<ItemView />, host);

    expect(host.querySelector(".problems")!.textContent).toContain("age");
    expect((host.querySelector("button.confirm-rename") as HTMLButtonElement).disabled).toBe(true);
    expect(changeSetSig.value.entries).toHaveLength(0);
  });

  it("hides the rename form when mode switches to read while it is open", () => {
    const host = show("WR-001");
    (host.querySelector("button.rename") as HTMLButtonElement).click();
    render(<ItemView />, host);
    expect(host.querySelector(".rename-form")).not.toBeNull();

    // renameOpen is still true here: only the mode gate keeps the form shut.
    modeSig.value = "read";
    render(<ItemView />, host);
    expect(host.querySelector(".rename-form")).toBeNull();
  });
});

describe("DecisionRecord history", () => {
  beforeEach(() => {
    route.value = defaultRoute();
  });

  it("renders commits from a fake fetch, with the pull request it named", async () => {
    const item = engine.itemById("WR-200")!;
    const host = document.createElement("div");
    render(
      <DecisionRecord
        item={item}
        vol={vol}
        route={defaultRoute()}
        fetchHistory={async () => [
          {
            sha: "abc1234567", date: "2027-01-02",
            message: "Merge pull request #42 from x/y",
            url: "https://github.com/jisaf/policy-codex/commit/abc1234567",
            pr: { number: 42, url: "https://github.com/jisaf/policy-codex/pull/42" },
          },
        ]}
      />,
      host,
    );
    await new Promise((r) => setTimeout(r));
    expect(host.textContent).toContain("Merge pull request #42 from x/y");
    const commitLink = host.querySelector("ul.history li a") as HTMLAnchorElement;
    expect(commitLink.getAttribute("href")).toBe(
      "https://github.com/jisaf/policy-codex/commit/abc1234567",
    );
    expect(host.textContent).toContain("#42");
  });

  it("renders nothing extra, with no error, when the fetch fails", async () => {
    const item = engine.itemById("WR-200")!;
    const host = document.createElement("div");
    render(
      <DecisionRecord
        item={item}
        vol={vol}
        route={defaultRoute()}
        fetchHistory={async () => null}
      />,
      host,
    );
    await new Promise((r) => setTimeout(r));
    expect(host.querySelector("ul.history")).toBeNull();
    expect(host.querySelector(".bad")).toBeNull();
    expect(host.textContent).toContain("Rationale");
  });
});
