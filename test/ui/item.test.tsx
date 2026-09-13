import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render } from "preact";
import { ItemView } from "../../src/ui/ItemView";
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
  sources: [{ id: "S1", title: "Applicable individual", citation: "42 U.S.C. 1396a", text: "statute text here" }],
  openQuestions: [{ id: "OQ-1", title: "Age during a month", body: "Assumption: …", items: ["WR-004"] }],
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

  it("shows the identity, meaning, and pattern English", () => {
    const host = show("WR-200");
    expect(host.textContent).toContain("Medicaid: is in the community engagement age range");
    expect(host.textContent).toContain("The person has attained age 19 and is under age 65.");
    expect(host.querySelector("pre.derivation")!.textContent).toBe(
      "all of the following are true:\n" +
        "  - Age is at least Medicaid community engagement minimum age (19)\n" +
        "  - Age is less than Medicaid community engagement age ceiling (65)",
    );
  });

  it("puts the statute text one tap away", () => {
    const host = show("WR-200");
    expect(host.textContent).toContain("S1. Applicable individual");
    expect((host.querySelector("details.source") as HTMLDetailsElement).open).toBe(false);
    (host.querySelector("details.source summary") as HTMLElement).click();
    (host.querySelector("details.source") as HTMLDetailsElement).open = true;
    render(<ItemView />, host);
    expect(host.querySelector("details.source")!.textContent).toContain("42 U.S.C. 1396a");
  });

  it("shows every rule test with a pass mark", () => {
    const host = show("WR-200");
    const rows = host.querySelectorAll("table.tests tbody tr");
    expect(rows).toHaveLength(4);
    expect([...rows].every((r) => r.textContent!.includes("pass"))).toBe(true);
  });

  it("lists what the item uses and what uses it", () => {
    const host = show("WR-200");
    const uses = host.querySelector(".uses")!.textContent!;
    expect(uses).toContain("Age");
    expect(uses).toContain("Medicaid community engagement minimum age");
    expect(host.querySelector(".used-by")!.textContent).toContain(
      "Medicaid: is an applicable individual",
    );
  });

  it("shows the open question badge", () => {
    const host = show("WR-003");
    expect(host.textContent).not.toContain("OQ-1");
    const four = show("WR-004");
    expect(four.textContent).toContain("OQ-1 Age during a month");
  });

  it("renders the Approach A projection on its tab", () => {
    const host = show("WR-200");
    (host.querySelector("button[data-tab=a]") as HTMLButtonElement).click();
    render(<ItemView />, host);
    expect(host.querySelector("pre.projection")!.textContent).toContain(
      "Rule           RL-001 Medicaid: is in the community engagement age range",
    );
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
});
