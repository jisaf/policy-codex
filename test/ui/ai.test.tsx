import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "preact";
import { AiPanel } from "../../src/ui/AiPanel";
import { streamChat } from "../../src/ai/client";
import { createEngine } from "../../src/engine/engine";
import {
  changeSetSig, credentials, volumeSig, workerBaseSig, type EditingState,
} from "../../src/ui/state";
import { emptyChangeSet, fileEntries } from "../../src/changes/types";
import { parseSources } from "../../src/ledger/markdown";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

vi.mock("../../src/ai/client", () => ({ streamChat: vi.fn() }));

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);

const sourcesMd =
  "# Sources\n\n### S1. Applicable individual\n\n42 U.S.C. 1396a(xx)(9)(A)(i).\n\n" +
  "> Some quoted statute text.\n";

const vol = {
  volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "main", sha: null,
  meta: ledger.meta, items: ledger.items,
  sources: parseSources(sourcesMd),
  sourcesText: sourcesMd,
  openQuestions: [], cases: [], casesText: null,
  documents: [{
    id: "D-1", title: "State plans for medical assistance", kind: "statute",
    citation: "42 U.S.C. 1396a", file: "documents/D-1.md",
  }],
  chapterOf: {},
} as unknown as LoadedVolume;

function draftState(context?: EditingState["context"]): EditingState {
  return {
    id: null, chapter: "medicaid", surface: "ai", step: "edit", context,
    draft: {
      id: engine.nextId(), name: "", identifier: "", kind: "derived", type: "yes/no",
      scope: "person", program: "Medicaid", meaning: "", sources: [], tests: [],
      implemented: null,
    },
  };
}

const item1 = {
  name: "Medicaid: is in the renewal grace period", identifier: "medicaid_in_renewal_grace_period",
  kind: "derived", type: "yes/no", options: [], scope: "person", program: "Medicaid", role: "",
  meaning: "The person is within the renewal grace period after a missed check.",
  precision: "", supplied_by: "", value: "",
  derived_text: "Age is at least 19",
  sources: ["S1"], implemented: "engine", tags: [], open_questions: [],
  examples: ['T1: given date_of_birth="2000-01-01"; as of 2026-01-01 => yes'],
  rationale: "New rule for the grace period described in S1.", nearest_hint: [],
};
const item2 = {
  ...item1,
  name: "Medicaid: meets the alternate age test", identifier: "medicaid_meets_alt_age_test",
  meaning: "A second, unrelated proposed fact.",
  derived_text: "Age is at least 21",
  rationale: "New rule, second reading of the same section.",
};

function ok(payload: unknown) {
  return vi.fn(async (_req: unknown, onChunk: (c: unknown) => void) => {
    onChunk({ content: "", reasoningChars: 0, finishReason: "stop", done: true });
    return JSON.stringify(payload);
  });
}

async function tick() {
  await new Promise((r) => setTimeout(r));
  await new Promise((r) => setTimeout(r));
}

describe("AiPanel", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    changeSetSig.value = emptyChangeSet("mwr", "main");
    workerBaseSig.value = "https://w.dev";
    credentials.set("ai", "sk-test");
    vi.mocked(streamChat).mockReset();
  });

  it("renders a two-item proposal from a source and stages both with rationale", async () => {
    vi.mocked(streamChat).mockImplementation(
      ok({ notes: "Two items drafted from S1.", items: [item1, item2] }) as never,
    );

    const state = draftState({ kind: "source", id: "S1" });
    const host = document.createElement("div");
    render(<AiPanel engine={engine} state={state} onDraft={() => {}} />, host);

    (host.querySelector("button.suggest-many") as HTMLButtonElement).click();
    await tick();

    expect(host.textContent).toContain("Proposed items (2)");
    const rowsEls = host.querySelectorAll("li.proposalitem");
    expect(rowsEls).toHaveLength(2);
    expect(rowsEls[0].textContent).toContain("Medicaid: is in the renewal grace period");
    expect(rowsEls[0].textContent).toContain("Age is at least 19");
    expect(rowsEls[1].textContent).toContain("Medicaid: meets the alternate age test");

    (host.querySelector("button.stage-selected") as HTMLButtonElement).click();
    await tick();

    expect(changeSetSig.value.entries).toHaveLength(2);
    for (const entry of changeSetSig.value.entries) {
      expect(entry.before).toBeNull();
      expect(entry.after!.rationale).toBeTruthy();
    }
    const ids = changeSetSig.value.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
    expect(host.textContent).toContain("2 item(s) staged to the tray.");
  });

  it("does not run without a worker URL or a provider key", async () => {
    workerBaseSig.value = "";
    const state = draftState({ kind: "source", id: "S1" });
    const host = document.createElement("div");
    render(<AiPanel engine={engine} state={state} onDraft={() => {}} />, host);
    (host.querySelector("button.suggest-many") as HTMLButtonElement).click();
    await tick();
    expect(host.textContent).toContain("Set the AI worker URL in Settings.");
    expect(streamChat).not.toHaveBeenCalled();
  });

  it("lets the reviewer uncheck an item before staging", async () => {
    vi.mocked(streamChat).mockImplementation(ok({ notes: "", items: [item1, item2] }) as never);
    const state = draftState({ kind: "source", id: "S1" });
    const host = document.createElement("div");
    render(<AiPanel engine={engine} state={state} onDraft={() => {}} />, host);
    (host.querySelector("button.suggest-many") as HTMLButtonElement).click();
    await tick();

    const boxes = host.querySelectorAll("li.proposalitem input[type=checkbox]");
    const box = boxes[1] as HTMLInputElement;
    box.checked = false;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    (host.querySelector("button.stage-selected") as HTMLButtonElement).click();
    await tick();

    expect(changeSetSig.value.entries).toHaveLength(1);
    expect(changeSetSig.value.entries[0].after!.identifier)
      .toBe("medicaid_in_renewal_grace_period");
  });

  it("preselects the document context and loads its text through fetchText", async () => {
    const fetchText = vi.fn(async () => "# Doc\n\nBody text of the document.\n");
    const state = draftState({ kind: "document", id: "D-1" });
    const host = document.createElement("div");
    render(
      <AiPanel engine={engine} state={state} onDraft={() => {}} fetchText={fetchText} />, host,
    );
    await tick();
    expect(fetchText).toHaveBeenCalledWith("volumes/mwr/documents/D-1.md");
    expect(host.textContent).toContain("characters.");
    expect(host.querySelector("button.extract-excerpts")).not.toBeNull();
  });

  it("extracts excerpts from a document and stages them as a sources.md file entry", async () => {
    vi.mocked(streamChat).mockImplementation(ok({
      excerpts: [{ citation: "42 U.S.C. 1396a(y)", text: "A newly quoted passage." }],
    }) as never);
    const fetchText = vi.fn(async () => "# Doc\n\nBody text of the document.\n");
    const state = draftState({ kind: "document", id: "D-1" });
    const host = document.createElement("div");
    render(
      <AiPanel engine={engine} state={state} onDraft={() => {}} fetchText={fetchText} />, host,
    );
    await tick();

    (host.querySelector("button.extract-excerpts") as HTMLButtonElement).click();
    await tick();
    expect(host.textContent).toContain("Extracted excerpts (1)");
    expect(host.textContent).toContain("42 U.S.C. 1396a(y)");

    (host.querySelector("button.stage-excerpts") as HTMLButtonElement).click();
    await tick();

    const files = fileEntries(changeSetSig.value);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("volumes/mwr/sources.md");
    expect(files[0].before).toBe(sourcesMd);
    expect(files[0].after).toContain("### S2. 42 U.S.C. 1396a(y)");
    expect(files[0].after).toContain("Document: D-1");
    expect(files[0].after).toContain("> A newly quoted passage.");
  });
});
