import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render } from "preact";
import { Trace } from "../../src/ui/Trace";
import { createEngine } from "../../src/engine/engine";
import { buildIndex } from "../../src/engine/ledger-index";
import { makeCase } from "../../src/engine/evaluate";
import { caseToSpec, parseCases } from "../../src/engine/cases";
import { explain, narrative } from "../../src/engine/explain";
import { defaultRoute } from "../../src/ui/router";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const root = path.resolve(__dirname, "../..");
const items = ledger.items as unknown as Item[];
const meta = ledger.meta as unknown as VolumeMeta;
const ix = buildIndex(items);
const engine = createEngine(items, meta, refs);
const cases = parseCases(fs.readFileSync(path.join(root, "volumes/mwr/tests/cases.yaml"), "utf8"));

function nodeOf(caseId: string, identifier: string, person = "p1") {
  const data = makeCase(ix, caseToSpec(cases.find((c) => c.id === caseId)!));
  return explain(ix, data, identifier, person, null);
}

function show(caseId: string, identifier: string): HTMLElement {
  const host = document.createElement("div");
  render(
    <Trace engine={engine} node={nodeOf(caseId, identifier)} route={defaultRoute()} />,
    host,
  );
  return host;
}

describe("Trace", () => {
  it("leads with the story and keeps the tree until it is asked for", async () => {
    const host = show("C-03", "snap_time_limit_status");
    expect(host.querySelector(".storyhead")!.textContent)
      .toBe("SNAP: time limit status is not subject because:");
    const lines = [...host.querySelectorAll("ul.story li")];
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(12);
    // The same story the engine tells, one line per node, in the same order.
    const told = narrative(nodeOf("C-03", "snap_time_limit_status"), engine.fmt);
    expect(lines.map((l) => l.textContent!.replace(/2\d{3}-\d\d$/, "").trim()))
      .toEqual(told.map((l) => l.trim()));
    // Each line names the item behind it as a token, which carries the ledger
    // id the item page answers to (the identifier alone is not an address).
    const first = lines[0].querySelector("button.tok") as HTMLButtonElement;
    expect(first.textContent).toBe("SNAP: is exempt from the ABAWD time limit");
    expect(first.getAttribute("data-id"))
      .toBe(engine.item("snap_is_exempt_from_time_limit")!.id);

    // Nothing of the tree is on the page yet.
    expect(host.querySelector(".tnode")).toBeNull();
    const button = host.querySelector("button.showall") as HTMLButtonElement;
    expect(button.textContent).toBe("Show everything");
    button.click();
    await new Promise((r) => setTimeout(r));
    expect(host.querySelector(".tnode")!.getAttribute("data-identifier"))
      .toBe("snap_time_limit_status");
    expect(button.textContent).toBe("Hide everything");

    // The tree marks the resolutions that decided the value.
    const marked = [...host.querySelectorAll(".thead.decisive")];
    expect(marked.length).toBeGreaterThan(0);
    expect(marked[0].textContent).toContain("SNAP: is exempt from the ABAWD time limit");
    expect(marked[0].querySelector(".tmark")).not.toBeNull();
    // A resolution that decided nothing carries no mark.
    const heads = [...host.querySelectorAll(".thead")];
    expect(heads.some((h) => !h.classList.contains("decisive"))).toBe(true);

    button.click();
    await new Promise((r) => setTimeout(r));
    expect(host.querySelector(".tnode")).toBeNull();
  });

  it("caps a long story at STORY_LINES, with an '... and N more' line", () => {
    const host = show("C-12", "snap_has_exhausted_time_limit");
    const lines = [...host.querySelectorAll("ul.story li")];
    // 12 kept lines plus the "… and N more" summary line, at most.
    expect(lines.length).toBeLessThanOrEqual(13);
    expect(lines.at(-1)!.textContent).toMatch(/^… and \d+ more$/);
  });

  it("makes the rule lines of a node clickable, token by token", async () => {
    const host = show("C-03", "snap_time_limit_status");
    (host.querySelector("button.showall") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    const rule = host.querySelector("pre.derivation")!;
    expect(rule.querySelectorAll("button.tok").length).toBeGreaterThan(0);
    // The identifier beside each node name is a token too.
    expect(host.querySelector(".thead code button.tok")).not.toBeNull();
  });

  it("shows a value nothing was asked for as the tree alone", () => {
    const host = show("C-03", "date_of_birth");
    expect(host.querySelector("ul.story")).toBeNull();
    expect(host.querySelector("button.showall")).toBeNull();
    expect(host.querySelector(".tnode")!.getAttribute("data-identifier")).toBe("date_of_birth");
  });
});
