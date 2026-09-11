import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { Settings } from "../../src/ui/Settings";
import { CREDENTIAL_KEYS } from "../../src/credentials";
import { createEngine } from "../../src/engine/engine";
import {
  credentials, engineSig, settingsOpenSig, volumeSig, workerBaseSig,
} from "../../src/ui/state";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const vol = {
  volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "main", sha: "abc1234",
  meta: ledger.meta, items: ledger.items, sources: [], openQuestions: [], chapterOf: {},
} as unknown as LoadedVolume;

describe("Settings", () => {
  beforeEach(() => {
    settingsOpenSig.value = true;
    volumeSig.value = vol;
    engineSig.value = engine;
    workerBaseSig.value = "";
    credentials.clear("github");
    credentials.clear("ai");
    localStorage.clear();
  });

  it("renders nothing when closed", () => {
    settingsOpenSig.value = false;
    const host = document.createElement("div");
    render(<Settings />, host);
    expect(host.textContent).toBe("");
  });

  it("stores a GitHub token through the credentials boundary", async () => {
    const host = document.createElement("div");
    render(<Settings />, host);
    const input = host.querySelector("input[name=github]") as HTMLInputElement;
    input.value = "ghp_x";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    expect(credentials.get("github")).toBe("ghp_x");
    expect(localStorage.getItem(CREDENTIAL_KEYS.github)).toBe("ghp_x");
  });

  it("stores the worker URL", async () => {
    const host = document.createElement("div");
    render(<Settings />, host);
    const input = host.querySelector("input[name=worker]") as HTMLInputElement;
    input.value = "https://codex-ai-proxy.example.workers.dev";
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r));
    expect(workerBaseSig.value).toBe("https://codex-ai-proxy.example.workers.dev");
  });

  it("says reading needs no credentials and shows the loaded commit", () => {
    const host = document.createElement("div");
    render(<Settings />, host);
    expect(host.textContent).toContain("Reading needs no credentials.");
    expect(host.textContent).toContain("abc1234");
    expect(host.textContent).toContain("138 items");
  });

  it("offers the handoff download", () => {
    const host = document.createElement("div");
    render(<Settings />, host);
    expect(host.querySelector("button.handoff")!.textContent).toContain("Download the handoff");
  });
});
