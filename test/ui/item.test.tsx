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

  it("leads with the name, its id and identifier, and one sentence from the derivation", () => {
    const host = show("WR-200");
    expect(host.querySelector("h1")!.textContent).toBe(
      "Medicaid: is in the community engagement age range",
    );
    expect(host.querySelector(".idline")!.textContent).toContain("WR-200");
    expect(host.querySelector(".idline")!.textContent).toContain("medicaid_in_ce_age_range");
    expect(host.querySelector("pre.derivation")!.textContent).toBe(
      "Medicaid: is in the community engagement age range is true when " +
        "all of the following are true:\n" +
        "  - Age is at least Medicaid community engagement minimum age (19)\n" +
        "  - Age is less than Medicaid community engagement age ceiling (65)",
    );
  });

  it("leads a supplied item with 'a fact we are told'", () => {
    const host = show("WR-001");
    expect(host.textContent).toContain(
      "A fact we are told: The calendar date on which the person was born",
    );
  });

  it("leads a parameter item with its value and its source", () => {
    const host = show("WR-102");
    expect(host.textContent).toContain("A number set by policy: 19 (S1)");
  });

  it("shows one worked example from the item's first test", () => {
    const host = show("WR-200");
    expect(host.textContent).toContain(
      'Given date_of_birth="2008-03-16", the answer is no.',
    );
  });

  it("shows every rule test with a pass mark", () => {
    const host = show("WR-200");
    const rows = host.querySelectorAll("table.tests tbody tr");
    expect(rows).toHaveLength(4);
    expect([...rows].every((r) => r.textContent!.includes("pass"))).toBe(true);
  });

  it("lists what the item uses and what uses it, names first", () => {
    const host = show("WR-200");
    const uses = host.querySelector(".uses")!.textContent!;
    expect(uses).toContain("Age");
    expect(uses).toContain("Medicaid community engagement minimum age");
    expect(host.querySelector(".used-by")!.textContent).toContain(
      "Medicaid: is an applicable individual",
    );
  });

  it("makes the derivation, the example, and the dependency lists clickable", () => {
    const host = show("WR-200");
    const lead = host.querySelector("pre.derivation")!;
    expect([...lead.querySelectorAll("button.tok.phrase")].map((b) => b.textContent))
      .toContain("all of the following are true:");
    expect([...lead.querySelectorAll("button.tok.param")].map((b) => b.textContent))
      .toContain("Medicaid community engagement minimum age (19)");
    // Uses and Used by name each item with a token that carries its id.
    const uses = host.querySelector(".uses")!;
    const age = [...uses.querySelectorAll("button.tok")].find((b) => b.textContent === "Age")!;
    expect(age.getAttribute("data-id")).toBe("WR-003");
    expect(host.querySelector(".used-by button.tok")).not.toBeNull();
    expect(host.querySelector(".worked-example button.tok")).not.toBeNull();
    // Only the machine-syntax fragments are tokenised; the prose around them
    // ("Given", "the answer is") must not be painted as unknown identifiers.
    expect(host.querySelector(".worked-example .tok.unknown")).toBeNull();
    expect(host.querySelector(".worked-example")!.textContent).toMatch(/^Example\. Given .*, the answer is .*\.$/);
    expect(host.querySelector("table.tests td.mono button.tok")).not.toBeNull();
  });

  it("shows the decision record with the item's excerpt and its document link", () => {
    const host = show("WR-200");
    const record = host.querySelector(".decision-record")!;
    expect(record.textContent).toContain("S1. Applicable individual");
    expect(record.textContent).toContain("statute text here");
    const docLink = [...record.querySelectorAll("a")].find(
      (a) => a.textContent === "State plans for medical assistance",
    ) as HTMLAnchorElement;
    expect(docLink.getAttribute("href")).toBe("#/mwr/document/D-1");
  });

  it("makes an excerpt id in the decision record a token", () => {
    const host = show("WR-200");
    const tok = host.querySelector(".decision-record button.tok.source") as HTMLButtonElement;
    expect(tok.textContent).toBe("S1");
    expect(host.querySelector(".decision-record")!.textContent)
      .toContain("S1. Applicable individual");
  });

  it("shows none recorded when an item carries no rationale", () => {
    const host = show("WR-200");
    expect(host.querySelector(".decision-record")!.textContent).toContain("none recorded");
  });

  it("shows the open question's title and the assumption taken", () => {
    const host = show("WR-003");
    expect(host.querySelector(".decision-record")!.textContent).not.toContain("OQ-1");
    const four = show("WR-004");
    const record = four.querySelector(".decision-record")!.textContent!;
    expect(record).toContain("OQ-1 Age during a month");
    expect(record).toContain("a person keeps the age they hold on the first day of the month");
  });

  it("shows the scope in Details with its plain label and the ledger term alongside", () => {
    const host = show("WR-200");
    const details = [...host.querySelectorAll("details.section")].find(
      (d) => d.querySelector("summary")!.textContent === "Details",
    )!;
    const scopeLine = [...details.querySelectorAll("p")].find(
      (p) => p.querySelector("b")?.textContent === "Scope.",
    )!;
    expect(scopeLine.textContent).toContain("per person");
    expect(scopeLine.querySelector("code.alias")!.textContent).toBe("person");
  });

  it("shows a parameter's dated values and its effective range in Details", () => {
    const details = (host: HTMLElement) => [...host.querySelectorAll("details.section")].find(
      (d) => d.querySelector("summary")!.textContent === "Details",
    )!;
    // WR-101's one version starts 2009-07-24 and has never ended.
    const rows = [...details(show("WR-101")).querySelectorAll("table.versions tbody tr")];
    expect(rows).toHaveLength(1);
    expect([...rows[0].children].map((td) => td.textContent))
      .toEqual(["2009-07-24", "present", "7.25", ""]);

    // WR-100 carries an effective range and no versions.
    const hundred = details(show("WR-100"));
    expect(hundred.querySelector("table.versions")).toBeNull();
    const effective = [...hundred.querySelectorAll("p")].find(
      (p) => p.querySelector("b")?.textContent === "Effective.",
    )!;
    expect(effective.textContent).toContain("2027-01-01 to present");
  });

  it("shows each version's own end date and excerpt when it states them", () => {
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
      ["2009-07-24", "2026-01-01", "7.25", "S18"],
      ["2026-01-01", "present", "9.5", ""],
    ]);
    engineSig.value = engine;
  });

  it("shows the Approach A projection in its own section", () => {
    const host = show("WR-200");
    expect(host.querySelector("pre.projection")!.textContent).toContain(
      "Rule           RL-001 Medicaid: is in the community engagement age range",
    );
  });

  it("opens the decision record section when asked via route.params.section", () => {
    route.value = { ...defaultRoute(), view: "item", arg: "WR-200", params: {} };
    volumeSig.value = vol;
    engineSig.value = engine;
    const host = document.createElement("div");
    render(<ItemView />, host);
    const closed = [...host.querySelectorAll("details.section")].find(
      (d) => d.querySelector("summary")!.textContent === "Decision record",
    ) as HTMLDetailsElement;
    expect(closed.open).toBe(false);

    route.value = { ...defaultRoute(), view: "item", arg: "WR-200", params: { section: "record" } };
    render(<ItemView />, host);
    const open = [...host.querySelectorAll("details.section")].find(
      (d) => d.querySelector("summary")!.textContent === "Decision record",
    ) as HTMLDetailsElement;
    expect(open.open).toBe(true);
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
