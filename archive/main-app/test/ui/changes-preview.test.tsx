/* My proposal in a static preview copy (the bundled build): it cannot reach
 * GitHub, so the page says so and the download is the way to send. */
import { describe, it, expect, vi } from "vitest";
import path from "node:path";
import { render } from "preact";

vi.mock("../../src/ledger/source", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/ledger/source")>()),
  BUNDLED: true,
}));

const { loadVolume } = await import("../../src/tools/volumes");
const { emptyChangeSet } = await import("../../src/changes/types");
const { ViewSlot } = await import("../../src/ui/App");
const { canonicalRoute, internalRoute, parseHash } = await import("../../src/ui/router");
const { changeSetSig, engineSig, route, volumeSig } = await import("../../src/ui/state");
const { credentials } = await import("../../src/ui/state");

const { vol, engine } = loadVolume(path.resolve(__dirname, "../.."), "co");

describe("My proposal in a preview copy", () => {
  it("explains that the preview cannot send, and offers Download this change", () => {
    volumeSig.value = vol;
    engineSig.value = engine;
    credentials.set("github", "a-token");
    const it0 = engine.itemById("CO-273")!;
    changeSetSig.value = { ...emptyChangeSet("co", "local"), entries: [{ id: it0.id, chapter: "parameters", before: it0, after: { ...it0, value: 100 } }] };
    route.value = internalRoute(canonicalRoute(parseHash("#/co/changes/proposal")));
    const host = document.createElement("div");
    render(<ViewSlot />, host);
    const send = host.querySelector("section.send")!;
    expect(send.querySelector(".preview-note")!.textContent).toMatch(/preview copy: it cannot send a change for review/);
    expect(send.querySelector("button.download")).toBeTruthy();
    expect((send.querySelector("button.propose") as HTMLButtonElement).disabled).toBe(true);
    expect(send.textContent).not.toContain("I have a GitHub token");
    credentials.clear("github");
  });
});
