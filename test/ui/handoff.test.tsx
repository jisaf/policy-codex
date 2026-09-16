import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render } from "preact";
import { HandoffView } from "../../src/ui/HandoffView";
import { createEngine } from "../../src/engine/engine";
import { parseCases } from "../../src/engine/cases";
import { engineSig, route, volumeSig } from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, ProgramVocabulary, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const root = path.resolve(__dirname, "../..");
const casesText = fs.readFileSync(path.join(root, "volumes/mwr/tests/cases.yaml"), "utf8");
const cases = parseCases(casesText);

// Declared programs, supplied beside the phase-1 fixture ledger exactly as
// program.test.tsx and cases.test.tsx do for Task 3/4 (the fixture predates
// the vocabulary).
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
  volumeId: "mwr", title: "Work requirements", path: "volumes/mwr", ref: "main", sha: null,
  meta, items: ledger.items, sources: [], openQuestions: [],
  // Only a few items carry a real chapter; the rest fall back to "unfiled"
  // in the view's grouping, which is exactly what a partial `chapterOf` (as
  // every other UI test builds) should exercise.
  chapterOf: { "WR-200": "medicaid", "WR-003": "medicaid", "WR-302": "snap" },
  cases, casesText,
} as unknown as LoadedVolume;

function show() {
  route.value = { ...defaultRoute(), view: "handoff", arg: null, params: {} };
  volumeSig.value = vol;
  engineSig.value = engine;
  const host = document.createElement("div");
  render(<HandoffView />, host);
  return host;
}

describe("HandoffView", () => {
  beforeEach(() => {
    route.value = defaultRoute();
    // jsdom carries no Blob URL machinery; stub it the way a browser would
    // answer, so the download links get real (fake) object URLs.
    let n = 0;
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL =
      () => `blob:mock-${n++}`;
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};
  });

  afterEach(() => {
    delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
    delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
  });

  it("lists every derived item in the implementation checklist", () => {
    const host = show();
    const rows = host.querySelectorAll("table.checklist tbody tr");
    const derivedCount = engine.items().filter((it) => it.kind === "derived").length;
    expect(derivedCount).toBe(53);
    expect(rows).toHaveLength(53);
  });

  it("groups the checklist by program then chapter", () => {
    const host = show();
    const medicaidGroup = [...host.querySelectorAll(".program-group")].find(
      (g) => g.querySelector("h3")!.textContent === "Medicaid",
    )!;
    expect(medicaidGroup.querySelector(".chapter-group h4")!.textContent).toBe("medicaid");
  });

  it("shows each item's name (linked), identifier, implementation, and rule test count", () => {
    const host = show();
    const row = [...host.querySelectorAll("table.checklist tbody tr")].find(
      (tr) => tr.textContent!.includes("WR-200"),
    )!;
    const link = row.querySelector("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("#/mwr/item/WR-200");
    expect(row.textContent).toContain("medicaid_in_ce_age_range");
    expect(row.textContent).toContain("engine");
    const testsCell = row.querySelectorAll("td")[3];
    expect(testsCell.textContent).toBe("4");
  });

  it("says 'not recorded' when an item has no implementation locator", () => {
    // Every fixture item happens to carry `implemented`; strip one to
    // exercise the fallback the brief calls for.
    const unimplementedEngine = engine.withItems(
      engine.items().map((it) => (it.id === "WR-200" ? { ...it, implemented: null } : it)),
    );
    route.value = { ...defaultRoute(), view: "handoff", arg: null, params: {} };
    volumeSig.value = vol;
    engineSig.value = unimplementedEngine;
    const host = document.createElement("div");
    render(<HandoffView />, host);
    const row = [...host.querySelectorAll("table.checklist tbody tr")].find(
      (tr) => tr.textContent!.includes("WR-200"),
    );
    expect(row?.textContent).toContain("not recorded");
  });

  it("links each row to its item's decision record", () => {
    const host = show();
    const row = [...host.querySelectorAll("table.checklist tbody tr")].find(
      (tr) => tr.textContent!.includes("WR-200"),
    )!;
    const recordLink = [...row.querySelectorAll("a")].find(
      (a) => a.textContent === "Decision record",
    ) as HTMLAnchorElement;
    expect(recordLink.getAttribute("href")).toBe("#/mwr/item/WR-200?section=record");
  });

  it("offers handoff.md and the conformance suite as download links with object URLs", () => {
    const host = show();
    const links = [...host.querySelectorAll("a.btn")];
    const md = links.find((a) => a.textContent === "Download handoff.md") as HTMLAnchorElement;
    expect(md.getAttribute("download")).toBe("handoff-mwr.md");
    expect(md.getAttribute("href")).toMatch(/^blob:/);

    const suite = links.find(
      (a) => a.textContent === "Download conformance suite",
    ) as HTMLAnchorElement;
    expect(suite.getAttribute("download")).toBe("conformance-mwr.json");
    expect(suite.getAttribute("href")).toMatch(/^blob:/);
  });

  it("renders the handoff markdown as elements, headings and a table included", () => {
    const host = show();
    const rendered = host.querySelector(".handoff-md")!;
    expect(rendered.querySelector("h1")!.textContent).toContain("Engineer handoff");
    expect([...rendered.querySelectorAll("h2")].some((h) => h.textContent === "Supplied facts (the interface the fact-assembly layer must deliver)")).toBe(true);
    expect(rendered.querySelector("table")).not.toBeNull();
    expect(rendered.querySelector("pre code")).not.toBeNull();
  });

  it("marks identifiers and pattern English inside the rendered handoff", () => {
    const host = show();
    const rendered = host.querySelector(".handoff-md")!;
    // A code span that names an item is a token carrying that item's id.
    const span = [...rendered.querySelectorAll("code button.tok")].find(
      (b) => b.textContent === "medicaid_in_ce_age_range",
    )!;
    expect(span).toBeDefined();
    expect(span.getAttribute("data-id")).toBe("WR-200");
    // A fenced derivation keeps its text and gains a token per phrase and fact.
    const fence = [...rendered.querySelectorAll("pre code")].find(
      (c) => c.textContent!.includes("Medicaid community engagement minimum age (19)"),
    )!;
    expect(fence).toBeDefined();
    expect(fence.textContent).toBe(
      "all of the following are true:\n" +
        "  - Age is at least Medicaid community engagement minimum age (19)\n" +
        "  - Age is less than Medicaid community engagement age ceiling (65)",
    );
    expect([...fence.querySelectorAll("button.tok")].map((b) => b.textContent))
      .toContain("Age");
  });

  it("keeps the rendered handoff collapsed behind a closed details element", () => {
    const host = show();
    const details = host.querySelector("details.section") as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.querySelector("summary")!.textContent).toBe("Rendered handoff");
    expect(details.open).toBe(false);
    expect(details.querySelector(".handoff-md")).not.toBeNull();
  });

  it("offers a table of contents above the checklist, linking each chapter to its section", () => {
    const host = show();
    const toc = host.querySelector("nav.handoff-toc")!;
    expect(toc).not.toBeNull();
    // The table of contents comes before the checklist it points into.
    const checklistHeading = [...host.querySelectorAll("h2")].find(
      (h) => h.textContent === "Implementation checklist",
    )!;
    expect(
      toc.compareDocumentPosition(checklistHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const medicaidLink = [...toc.querySelectorAll("a")].find((a) => a.textContent === "medicaid")!;
    const href = medicaidLink.getAttribute("href")!;
    expect(href.startsWith("#")).toBe(true);
    const target = host.querySelector(href);
    expect(target).not.toBeNull();
    expect(target!.querySelector("h4")!.textContent).toBe("medicaid");
  });

  it("says nothing is loaded when there is no engine or volume", () => {
    engineSig.value = null;
    volumeSig.value = null;
    const host = document.createElement("div");
    render(<HandoffView />, host);
    expect(host.textContent).toContain("No ledger loaded.");
  });
});
