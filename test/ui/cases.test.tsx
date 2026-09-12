import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render } from "preact";
import { CasesView, buildSpec, programOutcomes, upstreamCone } from "../../src/ui/CasesView";
import { createEngine } from "../../src/engine/engine";
import { caseToSpec, parseCases } from "../../src/engine/cases";
import { engineSig, route, volumeSig } from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, ProgramVocabulary, VolumeMeta } from "../../src/engine/types";
import type { TraceNode } from "../../src/engine/explain";
import type { LoadedVolume } from "../../src/ledger/load";

const root = path.resolve(__dirname, "../..");
const cases = parseCases(
  fs.readFileSync(path.join(root, "volumes/mwr/tests/cases.yaml"), "utf8"),
);

// The fixture ledger is the phase-1 one and predates the declared vocabulary,
// so the programs the volume now declares are supplied beside it.
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
  meta, items: ledger.items, sources: [], openQuestions: [], cases, chapterOf: {},
} as unknown as LoadedVolume;

function show(arg: string | null, params: Record<string, string> = {}) {
  route.value = { ...defaultRoute(), view: "cases", arg, params };
  const host = document.createElement("div");
  render(<CasesView />, host);
  return host;
}

/** A ledger value as the form's field would hold it. */
function raw(v: unknown): string {
  if (v === true) return "yes";
  if (v === false) return "no";
  if (Array.isArray(v) || (v && typeof v === "object")) return JSON.stringify(v);
  return String(v);
}

function countNodes(n: TraceNode): number {
  return 1 + n.children.reduce((s, k) => s + countNodes(k), 0);
}

function fill(host: HTMLElement, identifier: string, value: unknown): boolean {
  const el = host.querySelector(`[data-fact="${identifier}"]`) as
    HTMLInputElement | HTMLSelectElement | null;
  if (!el) return false;
  el.value = raw(value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

describe("CasesView", () => {
  beforeEach(() => {
    route.value = defaultRoute();
    volumeSig.value = vol;
    engineSig.value = engine;
  });

  it("lists every household case with its per-program counts", () => {
    const host = show(null);
    const rows = host.querySelectorAll("table.cases tbody tr");
    expect(rows).toHaveLength(13);
    expect(rows[0].textContent).toContain("C-01");
    expect(rows[0].textContent).toContain("Medicaid");
    expect(rows[0].querySelector(".counts b")!.textContent).toBe("4/4");
    expect(host.querySelector("a.btn")!.textContent).toContain("New household");
    const snap = [...rows].find((tr) => tr.textContent!.startsWith("C-05"))!;
    expect(snap.textContent).toContain("SNAP");
  });

  it("shows a case's supplied facts and expectations with their ok marks", () => {
    const host = show("C-01");
    expect(host.textContent).toContain(
      "Single adult, 30, not on SNAP, works 90 hours a month, applies for Medicaid",
    );
    expect(host.textContent).toContain("as of 2027-03-15");
    const facts = host.querySelector("table.facts")!.textContent!;
    expect(facts).toContain("date_of_birth");
    expect(facts).toContain("1996-08-02");
    expect(facts).toContain("every month");
    const rows = host.querySelectorAll("tr.expectation");
    expect(rows).toHaveLength(4);
    const status = [...rows].find(
      (tr) => tr.textContent!.includes("medicaid_ce_status_at_application"),
    )!;
    expect(status.textContent).toContain("met");
    expect(status.querySelector("td.ok")!.textContent).toBe("yes");
    expect(host.querySelector(".trace")).toBeNull();
  });

  it("opens the trace of an expectation when its row is clicked", async () => {
    const host = show("C-01");
    const row = [...host.querySelectorAll("tr.expectation")].find(
      (tr) => tr.textContent!.includes("medicaid_ce_status_at_application"),
    )! as HTMLTableRowElement;
    row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    const trace = host.querySelector(".trace")!;
    expect(trace).not.toBeNull();
    expect(trace.querySelector(".tnode")!.getAttribute("data-identifier"))
      .toBe("medicaid_ce_status_at_application");
    expect(trace.querySelectorAll(".origin").length).toBeGreaterThan(0);
    expect(trace.querySelector("pre.derivation")!.textContent).toContain("case");
  });

  it("folds a long trace and expands a node when it is clicked", async () => {
    const host = show("C-05");
    const row = [...host.querySelectorAll("tr.expectation")].find(
      (tr) => tr.textContent!.includes("snap_time_limit_status"),
    )! as HTMLTableRowElement;
    row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r));

    // The 36-month SNAP window is more than a thousand resolutions; the tree
    // shows the first two levels and renders a subtree only when asked.
    const whole = engine.explain(
      caseToSpec(cases.find((c) => c.id === "C-05")!), "snap_time_limit_status", "p1", null,
    );
    expect(countNodes(whole)).toBeGreaterThan(1000);
    const shown = host.querySelectorAll(".tnode").length;
    expect(shown).toBeLessThan(40);

    const folded = [...host.querySelectorAll(".thead.openable")].filter(
      (h) => h.querySelector(".twist")!.textContent === "\u25b8",
    );
    expect(folded.length).toBeGreaterThan(0);
    (folded[0] as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    expect(host.querySelectorAll(".tnode").length).toBeGreaterThan(shown);
    // A fact already resolved above is one line, not a second subtree.
    expect(host.textContent).toContain("see above");
  });

  it("says when a case id is not in the volume", () => {
    expect(show("C-99").textContent).toContain("No case C-99 in this volume.");
  });

  it("derives the upstream cone of the programs' outcomes", () => {
    const medicaid = programOutcomes(engine).find((p) => p.id === "Medicaid")!;
    expect(medicaid.outcomes).toContain("medicaid_ce_status_at_application");
    const cone = upstreamCone(engine, medicaid.outcomes);
    expect(cone.map((it) => it.identifier)).toContain("date_of_birth");
    expect(cone.every((it) => it.kind !== "derived")).toBe(true);
    // `as_of` asks for the determination date once, so it is not a form field.
    expect(cone.map((it) => it.identifier)).not.toContain("determination_date");
  });

  it("puts month-scoped answers into month_defaults and relationships beside them", () => {
    const cone = upstreamCone(engine, ["medicaid_ce_status_at_application"]);
    const spec = buildSpec(
      engine, cone,
      { date_of_birth: "1996-08-02", hours_worked: "90", relationships: "[]" },
      "2027-03-15",
    );
    expect(spec.persons!.p1.facts!.date_of_birth).toBe("1996-08-02");
    expect(spec.persons!.p1.month_defaults!.hours_worked).toBe(90);
    expect(spec.persons!.p1.relationships).toEqual([]);
    expect(spec.as_of).toBe("2027-03-15");
  });

  it("evaluates a new Medicaid household and shows the outcome with its trace", async () => {
    const host = show("new", { programs: "Medicaid" });
    expect(host.querySelector('[data-fact="date_of_birth"]')).not.toBeNull();
    expect(host.querySelector('[data-fact="hours_worked"]')).not.toBeNull();
    expect((host.querySelector("button[disabled]") as HTMLButtonElement).title)
      .toBe("Available once documents land");

    const p1 = cases.find((c) => c.id === "C-01")!.persons.p1;
    for (const [k, v] of Object.entries(p1.facts ?? {})) fill(host, k, v);
    for (const [k, v] of Object.entries(p1.month_defaults ?? {})) fill(host, k, v);
    expect(fill(host, "relationships", [])).toBe(true);
    await new Promise((r) => setTimeout(r));

    const evaluate = [...host.querySelectorAll("button")].find(
      (b) => b.textContent === "Evaluate",
    )! as HTMLButtonElement;
    evaluate.click();
    await new Promise((r) => setTimeout(r));

    const outcome = [...host.querySelectorAll(".outcome")].find(
      (d) => d.textContent!.includes("medicaid_ce_status_at_application"),
    )!;
    expect(outcome.querySelector(".tval")!.textContent).toBe("met");
    expect(outcome.querySelector(".trace .origin")).not.toBeNull();
  });

  it("asks for a program before it asks for facts", () => {
    const host = show("new");
    expect(host.textContent).toContain("Choose a program");
    expect(host.querySelector("[data-fact]")).toBeNull();
    expect(host.querySelector('input[data-program="Medicaid"]')).not.toBeNull();
  });
});
