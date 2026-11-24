import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { ItemEditor, draftEntry } from "../../src/ui/ItemEditor";
import { createEngine } from "../../src/engine/engine";
import {
  changeSetSig, editingSig, engineSig, openEditor, reportSig, route, searchIndexSig, volumeSig,
} from "../../src/ui/state";
import { buildSearchIndex } from "../../src/ui/search";
import { emptyChangeSet } from "../../src/changes/types";
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
  chapterOf: { "WR-200": "medicaid" },
} as unknown as LoadedVolume;

/** Text is the primary surface, so anything asserting on the guided form
 *  opens Advanced -> Form first. */
function openForm(host: HTMLElement): void {
  (host.querySelector("button[data-surface=form]") as HTMLButtonElement).click();
  render(<ItemEditor />, host);
}

/** WR-200's block with the derivation replaced, so a test can drive the
 *  checker without depending on the rest of the item. */
function blockWith(derivedAs: string): string {
  return [
    "ID            WR-200",
    "Fact          Medicaid: is in the community engagement age range",
    "Identifier    medicaid_in_ce_age_range",
    "Kind          Derived",
    "Type          yes/no",
    "Scope         person",
    "Program       Medicaid",
    "Meaning       The person has attained age 19 and is under age 65.",
    "Source        S1",
    "Implemented   Determination engine",
    `Derived as    ${derivedAs}`,
  ].join("\n");
}

describe("ItemEditor", () => {
  beforeEach(() => {
    route.value = defaultRoute();
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("mwr", "main");
    searchIndexSig.value = buildSearchIndex(vol, engine);
    reportSig.value = null;
    editingSig.value = null;
  });

  it("renders nothing when nothing is being edited", () => {
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    expect(host.textContent).toBe("");
  });

  it("opens an existing item into the text surface", () => {
    openEditor("WR-200");
    expect(editingSig.value!.surface).toBe("text");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    const doc = host.querySelector("textarea.block") as HTMLTextAreaElement;
    expect(doc.value).toContain("Fact          Medicaid: is in the community engagement age range");
    expect(host.querySelector(".constraints")!.textContent).toContain("Identifier is unique");
    // The painted copy behind the textarea carries the same text, tokenised.
    const painted = host.querySelector("pre.hl")!;
    expect(painted.textContent).toContain("all of the following are true:");
    expect(painted.querySelector("span.tk.key")!.textContent).toBe("ID");
  });

  it("reaches the guided form through Advanced", () => {
    openEditor("WR-200");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    openForm(host);
    const name = host.querySelector("input[name=name]") as HTMLInputElement;
    expect(name.value).toBe("Medicaid: is in the community engagement age range");
  });

  it("opens an existing item with all its fields, not just its own kind's", () => {
    // WR-200 is a derived item; the "All fields" toggle defaults on for an
    // existing item, so supplied- and parameter-only fields stay reachable.
    openEditor("WR-200");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    openForm(host);
    expect((host.querySelector("input.allfieldstoggle") as HTMLInputElement).checked).toBe(true);
    expect(host.querySelector("input[name=supplied_by]")).not.toBeNull();
    expect(host.querySelector("input[name=value]")).not.toBeNull();
    expect(host.querySelector(".tree")).not.toBeNull();
  });

  it("edits the meaning and carries it to the text surface", async () => {
    openEditor("WR-200");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    openForm(host);
    const meaning = host.querySelector("textarea[name=meaning]") as HTMLTextAreaElement;
    meaning.value = "A restated meaning that is comfortably long enough to sign.";
    meaning.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    (host.querySelector("button[data-surface=text]") as HTMLButtonElement).click();
    render(<ItemEditor />, host);
    expect((host.querySelector("textarea.block") as HTMLTextAreaElement).value).toContain(
      "A restated meaning that is comfortably long enough to sign.",
    );
  });

  it("reports a parse error on the text surface", async () => {
    openEditor("WR-200");
    editingSig.value = { ...editingSig.value!, surface: "text" };
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    const doc = host.querySelector("textarea.block") as HTMLTextAreaElement;
    doc.value = "ID            WR-200\nWobble        yes\n";
    doc.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    render(<ItemEditor />, host);
    expect(host.querySelector(".diagnostics")!.textContent).toContain('unknown field "Wobble"');
  });

  it("lists a type-check error when the derivation compares a date with a number", async () => {
    openEditor("WR-200");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    const doc = host.querySelector("textarea.block") as HTMLTextAreaElement;
    doc.value = blockWith("Date of Birth is at least 21");
    doc.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    render(<ItemEditor />, host);
    // The block still parses, so the error can only come from engine.check.
    expect(host.querySelector(".diagnostics")!.textContent)
      .toContain("comparison mixes date and number");
  });

  it("turns the status pill red once an unknown identifier appears", async () => {
    openEditor("WR-200");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    expect(host.querySelector(".pill.ok")!.textContent)
      .toBe("parses, all constraints satisfied");
    const doc = host.querySelector("textarea.block") as HTMLTextAreaElement;
    doc.value = blockWith("wobbly thing is at least 21");
    doc.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    render(<ItemEditor />, host);
    expect(host.querySelector(".pill.ok")).toBeNull();
    expect(host.querySelector(".pill.bad")!.textContent).toContain("problem(s)");
    // The offending line is painted with the error background.
    expect(host.querySelector("pre.hl .line.errline")).not.toBeNull();
    expect(host.querySelector("pre.hl .tk.unknown")!.textContent).toBe("wobbly");
  });

  it("evaluates the examples of the item being edited", async () => {
    openEditor("WR-003");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    (host.querySelector("button[data-tab=examples]") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    render(<ItemEditor />, host);
    const rows = [...host.querySelectorAll("table.examples tbody tr")];
    expect(rows).toHaveLength(4);
    expect(rows.map((tr) => tr.lastElementChild!.textContent)).toEqual([
      "pass", "pass", "pass", "pass",
    ]);
    expect(rows[0].firstElementChild!.textContent).toBe("WR-003-T1");
  });

  it("completes a fact after a prefix, and Enter inserts it", async () => {
    openEditor("WR-200");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    const doc = host.querySelector("textarea.block") as HTMLTextAreaElement;
    // Setting .value leaves the caret at the end, which is where the prefix is.
    doc.value = blockWith("date");
    doc.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    render(<ItemEditor />, host);
    const options = [...host.querySelectorAll("ul.ac li")];
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].textContent).toContain("Date of Birth");

    doc.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await new Promise((r) => setTimeout(r));
    render(<ItemEditor />, host);
    expect(doc.value).toContain("Derived as    Date of Birth");
    expect(host.querySelectorAll("ul.ac li")).toHaveLength(0);
    // A clean parse reaches the draft, so the identifier is what was stored.
    expect(editingSig.value!.draft.derived).toBe("date_of_birth");
  });

  it("completes an identifier, not a name, inside an Examples line", async () => {
    openEditor("WR-200");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    const doc = host.querySelector("textarea.block") as HTMLTextAreaElement;
    doc.value = `${blockWith("yes")}\nExamples\n  T1: given date_of`;
    doc.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    render(<ItemEditor />, host);
    expect(host.querySelector("ul.ac li")!.textContent).toContain("date_of_birth");
    doc.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await new Promise((r) => setTimeout(r));
    render(<ItemEditor />, host);
    expect(doc.value.endsWith("date_of_birth=")).toBe(true);
  });

  it("shows the token under the caret in the inspector", async () => {
    openEditor("WR-200");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    const doc = host.querySelector("textarea.block") as HTMLTextAreaElement;
    doc.value = blockWith("Date of Birth is at least 21");
    doc.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    doc.selectionStart = doc.selectionEnd = doc.value.indexOf("Date of Birth") + 2;
    doc.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowLeft", bubbles: true }));
    await new Promise((r) => setTimeout(r));
    render(<ItemEditor />, host);
    const inspector = host.querySelector(".inspector")!;
    expect(inspector.textContent).toContain("WR-001 · Date of Birth");
    expect(inspector.textContent).toContain("supplied");
  });

  it("builds a change entry keyed by item id and chapter", () => {
    openEditor("WR-200");
    const entry = draftEntry(editingSig.value!, engine);
    expect(entry.id).toBe("WR-200");
    expect(entry.chapter).toBe("medicaid");
    expect(entry.before!.identifier).toBe("medicaid_in_ce_age_range");
    expect(entry.after!.identifier).toBe("medicaid_in_ce_age_range");
  });

  it("builds an add entry for a new item", () => {
    openEditor(null);
    const entry = draftEntry(editingSig.value!, engine);
    expect(entry.before).toBeNull();
    expect(entry.id).toBe("WR-320");
  });

  it("saves the draft into the tray and closes", () => {
    openEditor("WR-200");
    editingSig.value = {
      ...editingSig.value!,
      draft: { ...editingSig.value!.draft, meaning: "A restated meaning long enough to sign." },
    };
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    (host.querySelector("button.save") as HTMLButtonElement).click();
    expect(changeSetSig.value.entries).toHaveLength(1);
    expect(changeSetSig.value.entries[0].after!.meaning).toBe(
      "A restated meaning long enough to sign.",
    );
    expect(editingSig.value).toBeNull();
  });

  it("opens a new item on the start step and searches the ledger", async () => {
    openEditor(null);
    expect(editingSig.value!.step).toBe("start");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    expect(host.querySelector("input[name=name]")).toBeNull();
    const box = host.querySelector("input.startsearch") as HTMLInputElement;
    box.value = "age";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    const hits = [...host.querySelectorAll(".hits li")];
    expect(hits).toHaveLength(8);
    expect(hits[0].textContent).toContain("Age");
    expect(hits[0].querySelector("a.openhit")!.getAttribute("href")).toContain("WR-003");
  });

  it("moves from the start step to the kind step with the typed text as the name", async () => {
    openEditor(null);
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    const box = host.querySelector("input.startsearch") as HTMLInputElement;
    box.value = "Medicaid: is in the renewal window";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    (host.querySelector("button.create") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    render(<ItemEditor />, host);
    expect(editingSig.value!.step).toBe("kind");
    expect(editingSig.value!.draft.name).toBe("Medicaid: is in the renewal window");
    expect(editingSig.value!.draft.identifier)
      .toBe(engine.slug("Medicaid: is in the renewal window"));
    expect(host.textContent).toContain("What are you adding?");
    expect(host.querySelector("button[data-kind=supplied]")!.textContent)
      .toContain("A fact we are told");
    expect(host.querySelector("button[data-kind=derived]")!.textContent).toContain("A rule");
    expect(host.querySelector("button[data-kind=parameter]")!.textContent)
      .toContain("A number set by policy");
  });

  it("choosing \"A rule\" moves to edit, defaults scope to person, and shows the " +
    "derivation builder while hiding supplied_by", async () => {
    openEditor(null);
    editingSig.value = {
      ...editingSig.value!, step: "kind",
      draft: {
        ...editingSig.value!.draft, name: "Medicaid: is in the renewal window",
        identifier: "medicaid_in_renewal_window",
      },
    };
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    (host.querySelector("button[data-kind=derived]") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    render(<ItemEditor />, host);
    expect(editingSig.value!.surface).toBe("text");
    openForm(host);
    expect(editingSig.value!.step).toBe("edit");
    expect(editingSig.value!.draft.kind).toBe("derived");
    expect(editingSig.value!.draft.scope).toBe("person");
    expect(host.querySelector("textarea[name=rationale]")).not.toBeNull();
    expect(host.querySelector(".similar")!.textContent).toContain("Similar existing items");
    expect(host.querySelector(".tree")).not.toBeNull();
    expect(host.querySelector("input[name=supplied_by]")).toBeNull();
  });

  it("choosing \"A fact we are told\" shows supplied_by and hides the derivation builder",
    async () => {
      openEditor(null);
      editingSig.value = {
        ...editingSig.value!, step: "kind",
        draft: {
          ...editingSig.value!.draft, name: "Medicaid: reports household size",
          identifier: "medicaid_reports_household_size",
        },
      };
      const host = document.createElement("div");
      render(<ItemEditor />, host);
      (host.querySelector("button[data-kind=supplied]") as HTMLButtonElement).click();
      await new Promise((r) => setTimeout(r));
      render(<ItemEditor />, host);
      openForm(host);
      expect(editingSig.value!.draft.kind).toBe("supplied");
      expect(editingSig.value!.draft.scope).toBe("person");
      expect(host.querySelector("input[name=supplied_by]")).not.toBeNull();
      expect(host.querySelector(".tree")).toBeNull();
      // "Implemented in" applies to every kind, not only derived rules.
      expect(host.querySelector("select[name=implemented]")).not.toBeNull();
    });

  it("choosing \"A number set by policy\" defaults scope to global and shows the value field",
    async () => {
      openEditor(null);
      editingSig.value = {
        ...editingSig.value!, step: "kind",
        draft: {
          ...editingSig.value!.draft, name: "Medicaid: renewal grace period",
          identifier: "medicaid_renewal_grace_period",
        },
      };
      const host = document.createElement("div");
      render(<ItemEditor />, host);
      (host.querySelector("button[data-kind=parameter]") as HTMLButtonElement).click();
      await new Promise((r) => setTimeout(r));
      render(<ItemEditor />, host);
      openForm(host);
      expect(editingSig.value!.draft.kind).toBe("parameter");
      expect(editingSig.value!.draft.scope).toBe("global");
      expect(host.querySelector("input[name=value]")).not.toBeNull();
      expect(host.querySelector("select[name=scope]")).toBeNull();
      expect(host.querySelector(".tree")).toBeNull();
      // "Implemented in" applies to every kind, not only derived rules.
      expect(host.querySelector("select[name=implemented]")).not.toBeNull();
    });

  it("groups Form and AI under an Advanced disclosure", async () => {
    openEditor("WR-200");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    expect(host.querySelector(".tabs > button[data-surface=text]")!.textContent).toBe("Text");
    const details = host.querySelector("details.advanced") as HTMLDetailsElement;
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(details.querySelector("summary")!.textContent).toContain("Advanced");
    expect(details.querySelector("button[data-surface=form]")!.textContent).toBe("Form");
    expect(details.querySelector("button[data-surface=ai]")!.textContent).toBe("AI");
    details.querySelector("summary")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(details.open).toBe(true);
  });

  it("stages a new item without a rationale and reports the rule against it", async () => {
    openEditor(null);
    editingSig.value = {
      ...editingSig.value!,
      step: "edit",
      draft: {
        ...editingSig.value!.draft,
        name: "Medicaid: is in the renewal window",
        identifier: "medicaid_in_renewal_window",
        meaning: "The person is inside the renewal window for community engagement.",
      },
    };
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    expect(host.querySelector(".constraints")!.textContent).toContain("rationale.required");
    const save = host.querySelector("button.save") as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    save.click();
    await new Promise((r) => setTimeout(r));
    expect(changeSetSig.value.entries).toHaveLength(1);
    const entry = reportSig.value!.items.find((i) => i.id === "WR-320")!;
    expect(entry.governance.map((f) => f.rule)).toContain("rationale.required");
    expect(entry.errors).toContain(
      "A new item carries a rationale naming why the nearest existing items do not serve",
    );
    expect(reportSig.value!.valid).toBe(false);
  });

  it("still treats a staged new item as new when reopened from the tray", async () => {
    openEditor(null);
    editingSig.value = {
      ...editingSig.value!,
      step: "edit",
      draft: {
        ...editingSig.value!.draft,
        name: "Medicaid: is in the renewal window",
        identifier: "medicaid_in_renewal_window",
        meaning: "The person is inside the renewal window for community engagement.",
      },
    };
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    (host.querySelector("button.save") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    expect(changeSetSig.value.entries).toHaveLength(1);
    const newId = changeSetSig.value.entries[0].id;

    // Reopen the staged item from the tray: openEditor(newId) finds it
    // through viewEngine() (the base ledger with the tray applied), which
    // sets `state.id` to `newId` even though the base ledger has no such
    // item yet.
    openEditor(newId);
    render(<ItemEditor />, host);
    openForm(host);
    expect(host.querySelector("textarea[name=rationale]")).not.toBeNull();
    expect(host.querySelector(".constraints")!.textContent).toContain("rationale.required");
  });

  it("acknowledges a nearest candidate from the similar-items panel", async () => {
    openEditor(null);
    editingSig.value = {
      ...editingSig.value!,
      step: "edit",
      draft: {
        ...editingSig.value!.draft,
        name: "Medicaid: is in the community engagement age range (alternate)",
        identifier: "medicaid_in_ce_age_range_alt",
        meaning: "The person has attained age 21 and is under the maximum age.",
        derived: ["all", [">=", "age", 21], ["<", "age", "medicaid_ce_max_age_exclusive"]],
      },
    };
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    openForm(host);
    const candidate = host.querySelector("li.candidate")!;
    expect(candidate.textContent).toContain("same-shape");
    expect(candidate.textContent).toContain("Medicaid: is in the community engagement age range");
    (candidate.querySelector("button.ack") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    expect(editingSig.value!.draft.nearest).toEqual(["WR-200"]);
  });
});
