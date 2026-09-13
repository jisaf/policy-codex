import { describe, it, expect, beforeEach } from "vitest";
import { render } from "preact";
import { HelpPanel, helpKeyFor, helpOpenSig, parseHelpSections } from "../../src/ui/Help";
import { defaultRoute } from "../../src/ui/router";
import { editingSig, route } from "../../src/ui/state";
import type { EditingState } from "../../src/ui/state";
import type { Item } from "../../src/engine/types";

const DOC = [
  "## start",
  "Pick a door.",
  "",
  "## cases",
  "Cases shows real households.",
  "",
  "It links to their traces.",
  "",
  "## item",
  "One item, one page.",
  "",
].join("\n");

function show(fetchText: (path: string) => Promise<string>) {
  const host = document.createElement("div");
  render(<HelpPanel fetchText={fetchText} />, host);
  return host;
}

async function tick() {
  await new Promise((r) => setTimeout(r));
}

describe("parseHelpSections", () => {
  it("splits the doc into sections keyed by the heading word", () => {
    const sections = parseHelpSections(DOC);
    expect(sections.start).toBe("Pick a door.");
    expect(sections.cases).toBe("Cases shows real households.\n\nIt links to their traces.");
    expect(sections.item).toBe("One item, one page.");
  });
});

describe("helpKeyFor", () => {
  it("maps a view to its section key, and the editor to \"editing\" regardless of the view", () => {
    expect(helpKeyFor("cases", false)).toBe("cases");
    expect(helpKeyFor("program", false)).toBe("programs");
    expect(helpKeyFor("table", false)).toBeNull();
    expect(helpKeyFor("cases", true)).toBe("editing");
  });
});

describe("HelpPanel", () => {
  beforeEach(() => {
    helpOpenSig.value = false;
    route.value = defaultRoute();
    editingSig.value = null;
  });

  it("renders nothing when closed", () => {
    const host = show(() => Promise.resolve(DOC));
    expect(host.textContent).toBe("");
  });

  it("shows the section for the current view", async () => {
    route.value = { ...defaultRoute(), view: "cases" };
    helpOpenSig.value = true;
    const host = show(() => Promise.resolve(DOC));
    await tick();
    expect(host.textContent).toContain("Cases shows real households.");
    expect(host.textContent).toContain("It links to their traces.");
  });

  it("shows the fallback message on a 404", async () => {
    route.value = { ...defaultRoute(), view: "cases" };
    helpOpenSig.value = true;
    const host = show(() => Promise.reject(new Error("docs/onboarding.md not found at main (404)")));
    await tick();
    expect(host.textContent).toContain("Help is not available at this ref.");
  });

  it("closes on the Close button", async () => {
    helpOpenSig.value = true;
    const host = show(() => Promise.resolve(DOC));
    await tick();
    (host.querySelector("button") as HTMLButtonElement).click();
    expect(helpOpenSig.value).toBe(false);
  });

  it("shows the editing section while the editor is open, whatever the view", async () => {
    route.value = { ...defaultRoute(), view: "table" };
    editingSig.value = {
      id: null, chapter: "medicaid", surface: "form", step: "edit",
      draft: {
        id: "WR-999", name: "", identifier: "", kind: "derived", type: "yes/no",
        scope: "person", program: "Medicaid", meaning: "", sources: [], tests: [],
        implemented: null,
      } as Item,
    } as EditingState;
    helpOpenSig.value = true;
    const host = show(() => Promise.resolve(
      "## editing\nTurn on edit mode to change things.\n",
    ));
    await tick();
    expect(host.textContent).toContain("Turn on edit mode to change things.");
  });
});
