import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render } from "preact";
import {
  CasesView, buildSpec, isRepresentableCase, programOutcomes, upstreamCone,
} from "../../src/ui/CasesView";
import { createEngine } from "../../src/engine/engine";
import { caseToSpec, parseCases } from "../../src/engine/cases";
import { emptyChangeSet } from "../../src/changes/types";
import { changeSetSig, engineSig, modeSig, route, volumeSig } from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, ProgramVocabulary, VolumeMeta } from "../../src/engine/types";
import type { TraceNode } from "../../src/engine/explain";
import type { LoadedVolume } from "../../src/ledger/load";

const root = path.resolve(__dirname, "../..");
const casesText = fs.readFileSync(path.join(root, "volumes/mwr/tests/cases.yaml"), "utf8");
const cases = parseCases(casesText);

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
  meta, items: ledger.items, sources: [], openQuestions: [], cases, casesText,
  documents: [], chapterOf: {},
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

/** The trace leads with the story and keeps the tree behind a toggle; these
 *  cases are about the tree, so they open it first. */
async function showEverything(host: HTMLElement): Promise<void> {
  const button = host.querySelector("button.showall") as HTMLButtonElement;
  button.click();
  await new Promise((r) => setTimeout(r));
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
    changeSetSig.value = emptyChangeSet("mwr", "main");
    // "Stage as case" and "Open the tray" only render in edit mode; every
    // existing test here exercises that staging flow, so edit mode is on
    // throughout and the reader-mode gate gets its own test below.
    modeSig.value = "edit";
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
    // The story names what decided the outcome, and the tree is still folded.
    expect(trace.querySelector("ul.story li")!.textContent)
      .toContain("Medicaid: satisfies community engagement at application is yes");
    expect(trace.querySelector(".tnode")).toBeNull();
    await showEverything(host);
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
    await showEverything(host);

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
    expect((host.querySelector("button.stage-case") as HTMLButtonElement).disabled).toBe(true);

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
    expect(outcome.querySelector(".trace ul.story li")).not.toBeNull();
  });

  it("stages the evaluated household as a new case appended to cases.yaml", async () => {
    const host = show("new", { programs: "Medicaid" });
    const p1 = cases.find((c) => c.id === "C-01")!.persons.p1;
    for (const [k, v] of Object.entries(p1.facts ?? {})) fill(host, k, v);
    for (const [k, v] of Object.entries(p1.month_defaults ?? {})) fill(host, k, v);
    fill(host, "relationships", []);
    const title = host.querySelector('[data-field="case_title"]') as HTMLInputElement;
    title.value = "Staged from the app: a working adult";
    title.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));

    const stage = host.querySelector("button.stage-case") as HTMLButtonElement;
    expect(stage.disabled).toBe(true);
    (([...host.querySelectorAll("button")].find((b) => b.textContent === "Evaluate")
      ) as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    expect((host.querySelector("button.stage-case") as HTMLButtonElement).disabled).toBe(false);

    (host.querySelector("button.stage-case") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));

    const files = changeSetSig.value.files ?? [];
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("volumes/mwr/tests/cases.yaml");
    expect(files[0].before).toBe(casesText);
    expect(files[0].label).toBe("C-14 Staged from the app: a working adult");

    const parsed = parseCases(files[0].after!);
    expect(parsed).toHaveLength(14);
    const staged = parsed.at(-1)!;
    expect(staged.id).toBe("C-14");
    expect(staged.title).toBe("Staged from the app: a working adult");
    expect(staged.as_of).toBe("2027-03-15");
    expect(staged.persons.p1.facts!.date_of_birth).toBe("1996-08-02");
    expect(staged.persons.p1.month_defaults!.hours_worked).toBe(90);
    // The expectations are the values just evaluated, so the staged case is a
    // regression: it passes on the ledger it was cut from.
    expect(staged.expect.p1.medicaid_ce_status_at_application).toBe("met");
    // An outcome the facts do not decide is staged as `unknown`, the way
    // cases.yaml already states one.
    expect(staged.expect.p1.medicaid_ce_status_at_renewal).toBe("unknown");
    expect(engine.runCase(staged).failed).toBe(0);
    expect(host.textContent).toContain("C-14 staged.");
  });

  it("appends a second staged household after the first, with the next id", async () => {
    const host = show("new", { programs: "Medicaid" });
    const click = (sel: string) => (host.querySelector(sel) as HTMLButtonElement).click();
    (([...host.querySelectorAll("button")].find((b) => b.textContent === "Evaluate")
      ) as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    click("button.stage-case");
    await new Promise((r) => setTimeout(r));
    click("button.stage-case");
    await new Promise((r) => setTimeout(r));

    const files = changeSetSig.value.files ?? [];
    expect(files).toHaveLength(1);
    const parsed = parseCases(files[0].after!);
    expect(parsed).toHaveLength(15);
    expect(parsed.slice(-2).map((c) => c.id)).toEqual(["C-14", "C-15"]);
    expect(files[0].label).toBe("2 new cases, through C-15");
  });

  it("titles a staged case by its date when the steward leaves the title blank", async () => {
    const host = show("new", { programs: "Medicaid" });
    (([...host.querySelectorAll("button")].find((b) => b.textContent === "Evaluate")
      ) as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    (host.querySelector("button.stage-case") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    expect((changeSetSig.value.files ?? [])[0].label)
      .toBe("C-14 Household evaluated as of 2027-03-15");
  });

  it("fills the form from an example case's facts, mapped through the same cone", async () => {
    const host = show("new", { programs: "Medicaid" });
    // Several <select>s exist on this form (kind pickers etc. do not, but be
    // explicit): find the example picker by an option it alone offers.
    const example = [...host.querySelectorAll("select")].find(
      (s) => [...s.options].some((o) => o.value === "C-01"),
    )! as HTMLSelectElement;
    example.value = "C-01";
    example.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r));

    expect((host.querySelector('[data-fact="date_of_birth"]') as HTMLInputElement).value)
      .toBe("1996-08-02");
    expect((host.querySelector('[data-fact="hours_worked"]') as HTMLInputElement).value)
      .toBe("90");

    const evaluate = [...host.querySelectorAll("button")].find(
      (b) => b.textContent === "Evaluate",
    )! as HTMLButtonElement;
    evaluate.click();
    await new Promise((r) => setTimeout(r));
    const outcome = [...host.querySelectorAll(".outcome")].find(
      (d) => d.textContent!.includes("medicaid_ce_status_at_application"),
    )!;
    expect(outcome.querySelector(".tval")!.textContent).toBe("met");
  });

  it("offers only the households the one-person form can represent", () => {
    const host = show("new", { programs: "Medicaid,SNAP" });
    const example = [...host.querySelectorAll("select")].find(
      (s) => [...s.options].some((o) => o.value === "C-01"),
    )! as HTMLSelectElement;
    const listed = [...example.options].map((o) => o.value).filter(Boolean);
    expect(listed).toEqual(cases.filter(isRepresentableCase).map((c) => c.id));
    expect(listed).toContain("C-01");
    expect(listed).not.toContain("C-03");
    expect(listed).not.toContain("C-06");
  });

  it("evaluates every listed example to the same outcome values runCase gets", async () => {
    const host = show("new", { programs: "Medicaid,SNAP" });
    const example = [...host.querySelectorAll("select")].find(
      (s) => [...s.options].some((o) => o.value === "C-01"),
    )! as HTMLSelectElement;
    const listed = [...example.options].map((o) => o.value).filter(Boolean);
    expect(listed.length).toBeGreaterThan(0);

    for (const id of listed) {
      example.value = id;
      example.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r));

      const evaluate = [...host.querySelectorAll("button")].find(
        (b) => b.textContent === "Evaluate",
      )! as HTMLButtonElement;
      evaluate.click();
      await new Promise((r) => setTimeout(r));

      const hc = cases.find((c) => c.id === id)!;
      const report = engine.runCase(hc);
      const gotByKey = new Map(
        report.results.map((res) => [`${res.identifier}|${res.month ?? ""}`, res.got]),
      );

      const outcomeEls = [...host.querySelectorAll(".outcome")];
      expect(outcomeEls.length).toBeGreaterThan(0);
      for (const el of outcomeEls) {
        const identifier = el.querySelector("code")!.textContent!;
        const month = el.querySelector(".tag")?.textContent ?? "";
        const key = `${identifier}|${month}`;
        if (!gotByKey.has(key)) continue; // not one of this case's expectations
        expect(el.querySelector(".tval")!.textContent).toBe(engine.fmt(gotByKey.get(key)));
      }
    }
  });

  it("names the unanswered facts of an unknown outcome and focuses one on click", async () => {
    const host = show("new", { programs: "Medicaid" });
    const evaluate = [...host.querySelectorAll("button")].find(
      (b) => b.textContent === "Evaluate",
    )! as HTMLButtonElement;
    evaluate.click();
    await new Promise((r) => setTimeout(r));

    const outcome = [...host.querySelectorAll(".outcome")].find(
      (d) => d.textContent!.includes("medicaid_ce_status_at_application"),
    )!;
    expect(outcome.querySelector(".tval")!.textContent).toBe("unknown");
    const hint = outcome.querySelector(".unknown-hint")!;
    expect(hint.textContent).toContain("Not answered:");
    const dobButton = [...hint.querySelectorAll("button")].find(
      (b) => b.textContent === "Date of Birth",
    )! as HTMLButtonElement;
    document.body.appendChild(host);
    dobButton.click();
    expect(document.activeElement?.id).toBe("date_of_birth");
    host.remove();
  });

  it("asks for a program before it asks for facts", () => {
    const host = show("new");
    expect(host.textContent).toContain("Choose a program");
    expect(host.querySelector("[data-fact]")).toBeNull();
    expect(host.querySelector('input[data-program="Medicaid"]')).not.toBeNull();
  });

  it("hides 'Stage as case' and 'Open the tray' in read mode and shows them in edit mode", async () => {
    modeSig.value = "read";
    route.value = { ...defaultRoute(), view: "cases", arg: "new", params: { programs: "Medicaid" } };
    const host = document.createElement("div");
    render(<CasesView />, host);
    expect(host.querySelector("button.stage-case")).toBeNull();

    // Toggling the signal (not re-rendering by hand) is how the real app
    // reacts to "Turn on edit mode"; give the resulting update a tick.
    modeSig.value = "edit";
    await new Promise((r) => setTimeout(r));
    expect(host.querySelector("button.stage-case")).not.toBeNull();

    (([...host.querySelectorAll("button")].find((b) => b.textContent === "Evaluate")
      ) as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    (host.querySelector("button.stage-case") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    expect(host.textContent).toContain("Open the tray");

    // Switching back to read mode hides both the button and the confirmation,
    // even though the household is still staged.
    modeSig.value = "read";
    await new Promise((r) => setTimeout(r));
    expect(host.querySelector("button.stage-case")).toBeNull();
    expect(host.textContent).not.toContain("Open the tray");
  });
});
