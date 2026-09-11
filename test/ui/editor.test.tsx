import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { ItemEditor, draftEntry } from "../../src/ui/ItemEditor";
import { createEngine } from "../../src/engine/engine";
import {
  changeSetSig, editingSig, engineSig, openEditor, route, volumeSig,
} from "../../src/ui/state";
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

describe("ItemEditor", () => {
  beforeEach(() => {
    route.value = defaultRoute();
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("mwr", "main");
    editingSig.value = null;
  });

  it("renders nothing when nothing is being edited", () => {
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    expect(host.textContent).toBe("");
  });

  it("opens an existing item into the form surface", () => {
    openEditor("WR-200");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
    const name = host.querySelector("input[name=name]") as HTMLInputElement;
    expect(name.value).toBe("Medicaid: is in the community engagement age range");
    expect(host.querySelector(".constraints")!.textContent).toContain("Identifier is unique");
  });

  it("edits the meaning and carries it to the text surface", async () => {
    openEditor("WR-200");
    const host = document.createElement("div");
    render(<ItemEditor />, host);
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
});
