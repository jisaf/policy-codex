import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render } from "preact";
import { ProgramView } from "../../src/ui/ProgramView";
import { createEngine } from "../../src/engine/engine";
import { parseCases } from "../../src/engine/cases";
import { engineSig, route, volumeSig } from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, ProgramVocabulary, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";
import type { LedgerSource } from "../../src/ledger/source";
import type { ConformanceResults } from "../../src/export/conformance";

const root = path.resolve(__dirname, "../..");
const cases = parseCases(
  fs.readFileSync(path.join(root, "volumes/mwr/tests/cases.yaml"), "utf8"),
);

// The fixture ledger is the phase-1 one and predates the declared vocabulary,
// so the programs the real volume.yaml now declares are supplied beside it,
// exactly as test/ui/cases.test.tsx does for Task 3.
const programs: ProgramVocabulary[] = [
  { id: "All", prefix: null },
  {
    id: "Medicaid",
    prefix: "medicaid_",
    outcomes: ["medicaid_ce_status_at_application", "medicaid_ce_status_at_renewal"],
  },
  {
    id: "SNAP",
    prefix: "snap_",
    outcomes: ["snap_time_limit_status", "snap_is_subject_to_work_requirement"],
  },
];
const meta = { ...(ledger.meta as unknown as VolumeMeta), programs };
const engine = createEngine(ledger.items as unknown as Item[], meta, refs);
const vol = {
  volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "main", sha: null,
  meta, items: ledger.items, sources: [],
  // WR-006 (Medicaid) carries `open: [OQ-2]` in the fixture ledger.
  openQuestions: [{ id: "OQ-2", title: "A fixture open question", body: "Detail." }],
  cases, chapterOf: {},
} as unknown as LoadedVolume;

/** No `conformance/results.json` at this ref: `loadConformanceResults`
 *  resolves null on any read failure, which is what a ref that never had a
 *  conformance run committed looks like. Every test below that does not care
 *  about the conformance line uses this, so none of them touch the network
 *  through the real `ledgerSource()`. */
const noResults: LedgerSource = {
  ref: "main",
  readText: () => Promise.reject(new Error("not found")),
  head: () => Promise.resolve(null),
};

function fakeSource(results: ConformanceResults): LedgerSource {
  return {
    ref: "main",
    readText: (p) => p === "conformance/results.json"
      ? Promise.resolve(JSON.stringify(results))
      : Promise.reject(new Error(`unexpected read: ${p}`)),
    head: () => Promise.resolve(null),
  };
}

function show(arg: string | null, source: LedgerSource = noResults) {
  route.value = { ...defaultRoute(), view: "program", arg, params: {} };
  const host = document.createElement("div");
  render(<ProgramView source={source} />, host);
  return host;
}

describe("ProgramView", () => {
  beforeEach(() => {
    route.value = defaultRoute();
    volumeSig.value = vol;
    engineSig.value = engine;
  });

  it("lists the program switcher and the current program's outcomes with case counts", () => {
    const host = show("Medicaid");
    expect(host.querySelector(".tabs a.on")!.textContent).toBe("Medicaid");
    expect(host.querySelector('a[href$="/program/SNAP"]')).not.toBeNull();

    const rows = host.querySelectorAll("table.outcomes tbody tr");
    expect(rows.length).toBeGreaterThan(0);
    const row = [...rows].find(
      (tr) => tr.textContent!.includes("medicaid_ce_status_at_application"),
    )!;
    expect(row).toBeTruthy();
    const caseCount = row.querySelector("td.cases")!.textContent!;
    expect(caseCount).toMatch(/\d+\/\d+/);
    expect(caseCount).not.toBe("0/0");
    const testCount = row.querySelector("td.tests")!.textContent!;
    expect(testCount).toMatch(/\d+\/\d+/);
  });

  it("lists the household cases touching the program, linking to the case page", () => {
    const host = show("Medicaid");
    const rows = host.querySelectorAll("table.progcases tbody tr");
    expect(rows.length).toBeGreaterThan(0);
    const c01 = [...rows].find((tr) => tr.textContent!.includes("C-01"))!;
    expect(c01.querySelector("a")!.getAttribute("href")).toContain("/cases/C-01");
  });

  it("shows the parameters in force on the chosen date, respecting versions", async () => {
    const host = show("Medicaid");
    const dateInput = host.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput.value).toBe("2027-03-15");

    const hoursRow = [...host.querySelectorAll("table.parameters tbody tr")].find(
      (tr) => tr.textContent!.includes("medicaid_ce_required_hours"),
    )!;
    expect(hoursRow.querySelector("td.value")!.textContent).toBe("80");

    // federal_minimum_wage (WR-101) is program "All" and applies to every
    // program's table; its only version starts 2009-07-24.
    const wageRow = () => [...host.querySelectorAll("table.parameters tbody tr")].find(
      (tr) => tr.textContent!.includes("federal_minimum_wage"),
    )!;
    expect(wageRow().querySelector("td.value")!.textContent).toBe("7.25");

    dateInput.value = "2000-01-01";
    dateInput.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    expect(wageRow().querySelector("td.value")!.textContent).toBe("unknown");
  });

  it("lists open questions referenced by the program's items", () => {
    const host = show("Medicaid");
    expect(host.querySelector(".questions")!.textContent).toContain("OQ-2");
  });

  it("shows a health row with item counts, constraint errors, and governance findings", () => {
    const host = show("Medicaid");
    const health = host.querySelector(".health")!;
    expect(health.textContent).toContain("supplied");
    expect(health.textContent).toContain("derived");
    expect(health.textContent).toContain("parameter");
    expect(health.textContent).toMatch(/governance/i);
  });

  it("says when a program id is not declared", () => {
    expect(show("Nope").textContent).toContain("No program Nope in this volume.");
  });

  it("defaults to the first declared program when no program is chosen", () => {
    const host = show(null);
    expect(host.querySelector(".tabs a.on")!.textContent).toBe("Medicaid");
  });

  it("shows nothing for conformance when the ref has no results.json", async () => {
    const host = show("Medicaid");
    await new Promise((r) => setTimeout(r));
    expect(host.querySelector(".conformance")).toBeNull();
  });

  it("shows the conformance summary fetched from the ledger source", async () => {
    const results: ConformanceResults = {
      codex: { volume: "mwr", sha: "deadbeef", generated: "2027-03-15T00:00:00.000Z" },
      adapter: "npx vite-node scripts/adapters/codex-self.ts",
      summary: { cases: 146, checked: 193, passed: 190, failed: 2, unimplemented: 1 },
      failures: [],
    };
    const host = show("Medicaid", fakeSource(results));
    await new Promise((r) => setTimeout(r));
    const line = host.querySelector(".conformance")!.textContent!;
    expect(line).toContain("npx vite-node scripts/adapters/codex-self.ts");
    expect(line).toContain("codex@deadbeef");
    expect(line).toContain("190 passed");
    expect(line).toContain("2 failed");
    expect(line).toContain("1 unimplemented");
  });
});
