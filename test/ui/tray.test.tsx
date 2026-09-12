import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { Tray } from "../../src/ui/Tray";
import { createEngine } from "../../src/engine/engine";
import { emptyChangeSet } from "../../src/changes/types";
import { putEntry } from "../../src/changes/store";
import { validateChangeSet } from "../../src/changes/validate";
import {
  changeSetSig, engineSig, reportSig, route, trayOpenSig, volumeSig,
} from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const vol = {
  volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "main", sha: null,
  meta: ledger.meta, items: ledger.items, sources: [], openQuestions: [],
  chapterOf: { "WR-003": "medicaid" },
} as unknown as LoadedVolume;

function withEntry(meaning: string) {
  const before = engine.itemById("WR-003")!;
  let cs = emptyChangeSet("mwr", "main");
  cs = putEntry(cs, { id: "WR-003", chapter: "medicaid", before, after: { ...before, meaning } });
  changeSetSig.value = cs;
  reportSig.value = validateChangeSet(engine, cs);
}

/** An add that repeats WR-200's tree with a different constant: governance
 *  warns "parameterise" without blocking the change. */
function withGovernanceWarning() {
  const after: Item = {
    id: "WR-960",
    name: "Medicaid: is in the community engagement age range (alternate)",
    identifier: "medicaid_in_ce_age_range_alt",
    kind: "derived",
    type: "yes/no",
    scope: "person",
    program: "Medicaid",
    meaning: "The person has attained age 21 and is under the community engagement maximum age.",
    derived: ["all", [">=", "age", 21], ["<", "age", "medicaid_ce_max_age_exclusive"]],
    sources: ["S1"],
    implemented: "engine",
    tests: [{ id: "WR-960-T1", given: { date_of_birth: "2008-03-15" }, expect: false }],
    rationale: "The renewal path uses a different lower bound, so WR-200 does not serve.",
    nearest: ["WR-200"],
  };
  let cs = emptyChangeSet("mwr", "main");
  cs = putEntry(cs, { id: after.id, chapter: "medicaid", before: null, after });
  changeSetSig.value = cs;
  reportSig.value = validateChangeSet(engine, cs);
}

describe("Tray", () => {
  beforeEach(() => {
    route.value = defaultRoute();
    volumeSig.value = vol;
    engineSig.value = engine;
    trayOpenSig.value = true;
    changeSetSig.value = emptyChangeSet("mwr", "main");
    reportSig.value = null;
  });

  it("renders nothing when closed", () => {
    trayOpenSig.value = false;
    const host = document.createElement("div");
    render(<Tray />, host);
    expect(host.textContent).toBe("");
  });

  it("lists entries with their kind and shows the impact set", () => {
    withEntry("A restated meaning long enough for an approver to sign.");
    const host = document.createElement("div");
    render(<Tray />, host);
    expect(host.querySelectorAll("li.entry")).toHaveLength(1);
    expect(host.textContent).toContain("WR-003 Age");
    expect(host.textContent).toContain("edit");
    expect(host.querySelector(".impact")!.textContent).toContain("medicaid_is_dependent_child");
  });

  it("disables Propose without a token and says why", () => {
    withEntry("A restated meaning long enough for an approver to sign.");
    const host = document.createElement("div");
    render(<Tray />, host);
    const btn = host.querySelector("button.propose") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(host.textContent).toContain("Add a GitHub token in Settings to propose changes.");
  });

  it("shows validation errors against the entry", () => {
    withEntry("short");
    const host = document.createElement("div");
    render(<Tray />, host);
    expect(host.querySelector("li.entry")!.textContent).toContain(
      "Meaning is a full sentence an approver can sign",
    );
  });

  it("shows governance warnings under the errors and counts them on the entry", () => {
    withGovernanceWarning();
    const host = document.createElement("div");
    render(<Tray />, host);
    const entry = host.querySelector("li.entry")!;
    expect(entry.textContent).toContain("1 warning");
    const warn = entry.querySelector("ul.errors li.warn")!;
    expect(warn.textContent).toContain("dup.shape");
    expect(warn.textContent).toContain("parameterise");
    expect(entry.querySelectorAll("ul.errors li.bad")).toHaveLength(0);
  });

  it("discards an entry", () => {
    withEntry("A restated meaning long enough for an approver to sign.");
    const host = document.createElement("div");
    render(<Tray />, host);
    (host.querySelector("button.discard") as HTMLButtonElement).click();
    expect(changeSetSig.value.entries).toHaveLength(0);
  });
});
