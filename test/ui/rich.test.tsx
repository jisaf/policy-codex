import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render } from "preact";
import type { ComponentChildren } from "preact";
import { Ident, Rich, Tok, TokenPopover, popoverSig } from "../../src/ui/Rich";
import { helpOpenSig, helpTargetSig } from "../../src/ui/Help";
import { createEngine } from "../../src/engine/engine";
import { defaultRoute } from "../../src/ui/router";
import { engineSig, route, volumeSig } from "../../src/ui/state";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const vol = {
  volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "main", sha: null,
  meta: ledger.meta, items: ledger.items,
  sources: [
    {
      id: "S1", title: "Applicable individual", citation: "42 U.S.C. 1396a",
      text: "the term applicable individual means", document: "D-1",
    },
    {
      id: "S2", title: "Excluded individual", citation: "42 U.S.C. 1396a(ii)",
      text: "specified excluded",
    },
  ],
  documents: [{
    id: "D-1", title: "State plans for medical assistance", kind: "statute",
    citation: "42 U.S.C. 1396a", file: "documents/D-1.md",
    url: "https://www.law.cornell.edu/uscode/text/42/1396a",
  }],
  openQuestions: [{ id: "OQ-1", title: "Age during a month", body: "", items: ["WR-004"] }],
  chapterOf: {},
} as unknown as LoadedVolume;

const derivation = engine.block(engine.itemById("WR-003")!.derived!).join("\n");

function show(node: ComponentChildren): HTMLElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  render(<>{node}<TokenPopover /></>, host);
  return host;
}

async function tick() {
  await new Promise((r) => setTimeout(r));
}

/** Opens the card of the first token matching `selector`. */
async function open(host: HTMLElement, selector: string): Promise<HTMLElement> {
  const tok = host.querySelector(selector) as HTMLButtonElement;
  expect(tok, `no token matched ${selector}`).not.toBeNull();
  tok.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await tick();
  return host.querySelector(".tokpop") as HTMLElement;
}

function action(pop: HTMLElement, label: string): HTMLElement {
  const el = [...pop.querySelectorAll(".tokpop-actions a, .tokpop-actions button")]
    .find((a) => a.textContent === label);
  expect(el, `no action named ${label}`).toBeDefined();
  return el as HTMLElement;
}

describe("Rich", () => {
  beforeEach(() => {
    route.value = defaultRoute();
    engineSig.value = engine;
    volumeSig.value = vol;
    popoverSig.value = null;
    helpOpenSig.value = false;
    helpTargetSig.value = null;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("paints a derivation by kind and keeps its text exactly", () => {
    const host = show(<Rich engine={engine} vol={vol} text={derivation} mode="expr" />);
    expect(host.querySelector("pre.rich")!.textContent).toBe(derivation);
    const fact = host.querySelector("button.tok.fact") as HTMLButtonElement;
    expect(fact.textContent).toBe("Date of Birth");
    expect(fact.dataset.id).toBe("WR-001");
    expect(host.querySelector("button.tok.phrase")!.textContent)
      .toBe("the number of whole years between");
    expect(host.querySelector("button.tok.const")!.textContent).toBe("the Determination Date");
  });

  it("opens one card on a token, with the definition and the trace to source", async () => {
    const host = show(<Rich engine={engine} vol={vol} text={derivation} mode="expr" />);
    const pop = await open(host, "button.tok.fact");
    expect(pop).not.toBeNull();
    expect(pop.textContent).toContain("Date of Birth");
    // The kind reads in plain words, with the ledger's own term alongside.
    expect(pop.textContent).toContain("a fact we are told (supplied)");
    expect(action(pop, "Open definition").getAttribute("href")).toBe("#/mwr/item/WR-001");
    expect(action(pop, "Trace to source").getAttribute("href"))
      .toBe("#/mwr/item/WR-001?section=record");
    expect(host.querySelectorAll(".tokpop")).toHaveLength(1);
  });

  it("closes on Escape, and swaps when another token is clicked", async () => {
    const host = show(<Rich engine={engine} vol={vol} text={derivation} mode="expr" />);
    await open(host, "button.tok.fact");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await tick();
    expect(host.querySelector(".tokpop")).toBeNull();

    await open(host, "button.tok.fact");
    const pop = await open(host, "button.tok.phrase");
    expect(host.querySelectorAll(".tokpop")).toHaveLength(1);
    expect(pop.textContent).toContain("the number of whole years between");
  });

  it("closes on a click outside it", async () => {
    const host = show(<Rich engine={engine} vol={vol} text={derivation} mode="expr" />);
    await open(host, "button.tok.fact");
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    expect(host.querySelector(".tokpop")).toBeNull();
  });

  it("renders a bare identifier, known or not", async () => {
    const host = show(
      <>
        <Ident id="age" engine={engine} vol={vol} />
        <Ident id="not_a_fact" engine={engine} vol={vol} />
      </>,
    );
    const toks = [...host.querySelectorAll("button.tok")];
    expect(toks[0].className).toContain("derived");
    expect(toks[0].getAttribute("data-id")).toBe("WR-003");
    expect(toks[1].className).toContain("unknown");
    const pop = await open(host, "button.tok.unknown");
    expect(pop.textContent).toContain("not recognised");
    expect(action(pop, "Search for it").getAttribute("href")).toBe("#/mwr/search?q=not_a_fact");
  });
});

describe("Rich popover, one trace per kind of token", () => {
  beforeEach(() => {
    route.value = defaultRoute();
    engineSig.value = engine;
    volumeSig.value = vol;
    popoverSig.value = null;
    helpOpenSig.value = false;
    helpTargetSig.value = null;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("traces an excerpt into the document it was taken from", async () => {
    const host = show(<Tok text="S1" cls="source" engine={engine} vol={vol} />);
    const pop = await open(host, "button.tok.source");
    expect(pop.textContent).toContain("42 U.S.C. 1396a");
    expect(pop.textContent).toContain("the term applicable individual");
    expect(action(pop, "Open definition").getAttribute("href")).toBe("#/mwr/source/S1");
    expect(action(pop, "Trace to source").getAttribute("href"))
      .toBe("#/mwr/document/D-1?excerpt=S1");
    const external = action(pop, "https://www.law.cornell.edu/uscode/text/42/1396a");
    expect(external.getAttribute("target")).toBe("_blank");
  });

  it("traces an excerpt with no document to its own page", async () => {
    const host = show(<Tok text="S2" cls="source" engine={engine} vol={vol} />);
    const pop = await open(host, "button.tok.source");
    expect(action(pop, "Trace to source").getAttribute("href")).toBe("#/mwr/source/S2");
  });

  it("traces a pattern phrase to the pattern catalog", async () => {
    const host = show(<Tok text="is at least" cls="phrase" engine={engine} vol={vol} />);
    const pop = await open(host, "button.tok.phrase");
    (action(pop, "Trace to source") as HTMLButtonElement).click();
    await tick();
    expect(helpTargetSig.value).toEqual({ path: "docs/conventions.md", heading: "Pattern catalog" });
    expect(helpOpenSig.value).toBe(true);
  });

  it("traces an example phrase to the tests section", async () => {
    const host = show(<Tok text="given" cls="phrase" engine={engine} vol={vol} />);
    const pop = await open(host, "button.tok.phrase");
    (action(pop, "Trace to source") as HTMLButtonElement).click();
    await tick();
    expect(helpTargetSig.value).toEqual({ path: "docs/conventions.md", heading: "Tests" });
  });

  it("traces a constant to the catalog, and to the item it names", async () => {
    const host = show(
      <Tok text="the Determination Date" cls="const" engine={engine} vol={vol} />,
    );
    const pop = await open(host, "button.tok.const");
    expect(action(pop, "Open definition").getAttribute("href")).toBe("#/mwr/item/WR-002");
    expect(action(pop, "Decision record").getAttribute("href"))
      .toBe("#/mwr/item/WR-002?section=record");
    (action(pop, "Trace to source") as HTMLButtonElement).click();
    await tick();
    expect(helpTargetSig.value).toEqual({ path: "docs/conventions.md", heading: "Pattern catalog" });
  });

  it("traces a field key to the item shape", async () => {
    const host = show(<Tok text="Meaning" cls="key" engine={engine} vol={vol} />);
    const pop = await open(host, "button.tok.key");
    (action(pop, "Trace to source") as HTMLButtonElement).click();
    await tick();
    expect(helpTargetSig.value).toEqual({ path: "docs/conventions.md", heading: "Item shape" });
  });

  it("shows a tag's approval owners and traces it to the vocabulary", async () => {
    const host = show(<Tok text="legal" cls="tag" engine={engine} vol={vol} />);
    const pop = await open(host, "button.tok.tag");
    expect(pop.textContent).toContain("approved by");
    expect(pop.textContent).toContain("Legal");
    (action(pop, "Trace to source") as HTMLButtonElement).click();
    await tick();
    expect(helpTargetSig.value).toEqual({ path: "docs/governance.md", heading: "Vocabulary" });
  });

  it("traces an enumeration option to the fact that declares it", async () => {
    const host = show(<Tok text="guardian" cls="literal" engine={engine} vol={vol} />);
    const pop = await open(host, "button.tok.literal");
    expect(action(pop, "Open definition").getAttribute("href")).toBe("#/mwr/item/WR-008");
    expect(action(pop, "Trace to source").getAttribute("href"))
      .toBe("#/mwr/item/WR-008?section=record");
  });
});
