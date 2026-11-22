import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render } from "preact";
import { LawPage } from "../../src/ui/places/LawPage";
import { documentParagraphs, findExcerptRange } from "../../src/ui/places/LawSources";
import { excerptsOfDocument } from "../../src/ui/counts";
import { createEngine } from "../../src/engine/engine";
import { parseDocuments } from "../../src/ledger/documents";
import { parseSources } from "../../src/ledger/markdown";
import { emptyChangeSet } from "../../src/changes/types";
import { changeSetSig, engineSig, modeSig, route, volumeSig } from "../../src/ui/state";
import { defaultRoute } from "../../src/ui/router";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { LoadedVolume } from "../../src/ledger/load";

const root = path.resolve(__dirname, "../..");
const documents = parseDocuments(
  fs.readFileSync(path.join(root, "volumes/mwr/documents.yaml"), "utf8"),
);
const sources = parseSources(
  fs.readFileSync(path.join(root, "volumes/mwr/sources.md"), "utf8"),
);

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const vol = {
  volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "main", sha: null,
  meta: ledger.meta, items: ledger.items, sources, openQuestions: [],
  cases: [], casesText: null, documents, chapterOf: {},
} as unknown as LoadedVolume;

const TEXT = "42 U.S.C. 1396a, as enacted.\n\nSecond paragraph of the text.\n";

/* Law › Documents (`law/doc`) and one document (`law/doc/D-n?at=S-n`). */
function show(
  docId: string | null = null,
  fetchText: (p: string) => Promise<string> = async () => TEXT,
  params: Record<string, string> = {},
) {
  route.value = { ...defaultRoute(), volume: "mwr", view: "law", arg: docId ? `doc/${docId}` : "doc", params };
  const host = document.createElement("div");
  render(<LawPage fetchText={fetchText} />, host);
  return host;
}

describe("Law: the documents", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("mwr", "main");
    modeSig.value = "read";
  });

  it("lists every document with its kind, citation and excerpt count", () => {
    const host = show();
    const rows = host.querySelectorAll("ul.doclist li");
    expect(rows).toHaveLength(8);
    expect(rows[0].textContent).toContain("42 U.S.C. 1396a — State plans for medical assistance");
    expect(rows[0].textContent).toContain("statute");
    expect(rows[0].textContent).toContain("6 excerpts");
    const snapReg = host.querySelector('ul.doclist li[data-document="D-7"]')!;
    expect(snapReg.textContent).toContain("regulation");
    expect(snapReg.textContent).toContain("7 excerpts");
  });

  it("links each row to its document page", () => {
    const link = show().querySelector("ul.doclist a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("#/mwr/law/doc/D-1");
  });

  it("selects the excerpts of one document, in file order", () => {
    expect(excerptsOfDocument(sources, "D-1").map((s) => s.id))
      .toEqual(["S1", "S2", "S6", "S8", "S9", "S10"]);
    expect(excerptsOfDocument(sources, "D-99")).toEqual([]);
  });
});

describe("Law: one document, open at a passage", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("mwr", "main");
    modeSig.value = "read";
  });

  it("shows the document, its fetched text and the excerpts it gives, without a repository path", async () => {
    const asked: string[] = [];
    const host = show("D-1", async (p) => { asked.push(p); return TEXT; });
    await new Promise((r) => setTimeout(r));
    expect(asked).toEqual(["volumes/mwr/documents/D-1.md"]);
    expect(host.querySelector("h1")!.textContent).toBe("42 U.S.C. 1396a — State plans for medical assistance");
    const paras = host.querySelectorAll(".doctext pre.statute");
    expect(paras).toHaveLength(2);
    expect(paras[1].textContent).toBe("Second paragraph of the text.");
    const excerpts = host.querySelectorAll(".docexcerpts li");
    expect(excerpts).toHaveLength(6);
    expect(excerpts[0].querySelector("a")!.getAttribute("href")).toBe("#/mwr/law/doc/D-1?at=S1");
    expect(host.textContent).not.toContain("volumes/mwr");
  });

  it("highlights the whole passage of ?at= and scrolls to it", async () => {
    const s = sources.find((x) => x.id === "S2")!;
    const text = `Preamble.\n\n${s.text.split("\n").join("\n\n")}\n\nAfter it, something else entirely.\n`;
    const seen: string[] = [];
    const proto = Element.prototype as unknown as { scrollIntoView?: unknown };
    proto.scrollIntoView = function (this: Element) { seen.push(this.id); };
    const host = document.createElement("div");
    document.body.appendChild(host);
    route.value = { ...defaultRoute(), volume: "mwr", view: "law", arg: "doc/D-1", params: { at: "S2" } };
    render(<LawPage fetchText={async () => text} />, host);
    await new Promise((r) => setTimeout(r));
    const hits = [...host.querySelectorAll(".doctext pre.hit")].map((p) => p.textContent!.trim());
    expect(hits.length).toBe(s.text.split("\n").filter((l) => l.trim()).length);
    expect(hits.join(" ")).not.toContain("Preamble");
    expect(hits.join(" ")).not.toContain("something else");
    expect(seen).toContain("passage");
    expect(host.querySelector(".notice")!.textContent).toContain("highlighted");
    delete proto.scrollIntoView;
    render(null, host);
    host.remove();
  });

  it("finds a passage that runs a heading into its first paragraph", () => {
    const paras = documentParagraphs("Heading\n\n4.407.3 Excess Shelter Deduction\n\nA. Households shall receive a deduction for the allowable monthly shelter costs.\n\nB. Other.");
    expect(findExcerptRange(paras, "4.407.3 Excess Shelter Deduction\nA. Households shall receive a deduction for the allowable monthly shelter costs.")).toEqual({ start: 1, end: 2 });
    expect(findExcerptRange(paras, "Nothing like this appears anywhere in the text at all.")).toBeNull();
  });

  it("says so when the text cannot be read, and still lists the excerpts", async () => {
    const host = show("D-3", async () => { throw new Error("D-3.md not found at main (404)"); });
    await new Promise((r) => setTimeout(r));
    expect(host.querySelector(".status.bad")!.textContent).toBe("D-3.md not found at main (404)");
    expect(host.querySelectorAll(".docexcerpts li")).toHaveLength(1);
  });

  it("says when a document id is not in the volume", () => {
    expect(show("D-99").textContent).toContain("No document D-99 in this volume.");
  });
});

describe("Propose new document", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("mwr", "main");
    // The disclosure only renders in edit mode; the reader-mode gate gets its
    // own test below.
    modeSig.value = "edit";
  });

  function type(host: HTMLElement, field: string, value: string) {
    const el = host.querySelector(`[data-field="${field}"]`) as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  it("stages the re-serialised documents.yaml and the new text as two file entries", async () => {
    const host = show();
    const stage = host.querySelector("button.stage-document") as HTMLButtonElement;
    expect(stage.disabled).toBe(true);
    expect(stage.textContent).toContain("D-9");

    type(host, "title", "State hardship guidance");
    type(host, "kind", "guidance");
    type(host, "citation", "MWR-2027-01");
    type(host, "url", "https://example.gov/hardship");
    type(host, "date", "2027-01-04");
    type(host, "text", "Hardship is judged on the facts of the month.");
    await new Promise((r) => setTimeout(r));

    (host.querySelector("button.stage-document") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));

    const files = changeSetSig.value.files ?? [];
    expect(files.map((f) => f.path)).toEqual([
      "volumes/mwr/documents.yaml", "volumes/mwr/documents/D-9.md",
    ]);
    const meta = files[0];
    expect(meta.before).toBe(
      fs.readFileSync(path.join(root, "volumes/mwr/documents.yaml"), "utf8"),
    );
    expect(meta.after!.slice(meta.before!.length)).toBe(
      "- id: D-9\n  title: State hardship guidance\n  kind: guidance\n" +
        "  citation: MWR-2027-01\n  url: https://example.gov/hardship\n" +
        '  file: documents/D-9.md\n  date: "2027-01-04"\n',
    );
    expect(parseDocuments(meta.after!)).toHaveLength(9);
    expect(files[1].before).toBeNull();
    expect(files[1].after).toBe("Hardship is judged on the facts of the month.\n");
    expect(files[1].label).toBe("D-9 State hardship guidance");
    expect(host.textContent).toContain("D-9 staged as two files.");
  });

  it("gives a second proposed document the next id and keeps the first", async () => {
    const host = show();
    type(host, "title", "State hardship guidance");
    type(host, "citation", "MWR-2027-01");
    type(host, "text", "First.");
    await new Promise((r) => setTimeout(r));
    (host.querySelector("button.stage-document") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));

    type(host, "title", "Second memo");
    type(host, "citation", "MWR-2027-02");
    type(host, "text", "Second.");
    await new Promise((r) => setTimeout(r));
    expect((host.querySelector("button.stage-document") as HTMLButtonElement).textContent)
      .toContain("D-10");
    (host.querySelector("button.stage-document") as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));

    const files = changeSetSig.value.files ?? [];
    expect(files.map((f) => f.path).sort()).toEqual([
      "volumes/mwr/documents.yaml",
      "volumes/mwr/documents/D-10.md",
      "volumes/mwr/documents/D-9.md",
    ]);
    const listed = parseDocuments(
      files.find((f) => f.path === "volumes/mwr/documents.yaml")!.after!,
    );
    expect(listed).toHaveLength(10);
    expect(listed.at(-1)!.id).toBe("D-10");
    expect(listed.at(-2)!.title).toBe("State hardship guidance");
  });

  it("will not stage without a title, a citation, and text", async () => {
    const host = show();
    type(host, "title", "State hardship guidance");
    type(host, "citation", "MWR-2027-01");
    await new Promise((r) => setTimeout(r));
    expect((host.querySelector("button.stage-document") as HTMLButtonElement).disabled).toBe(true);
    expect(changeSetSig.value.files ?? []).toHaveLength(0);
  });
});

describe("Law documents: reader mode gates", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("mwr", "main");
  });

  it("hides 'Propose new document' in read mode and shows it in edit mode", () => {
    modeSig.value = "read";
    let host = show();
    expect(host.querySelector(".newdoc")).toBeNull();

    modeSig.value = "edit";
    host = show();
    expect(host.querySelector(".newdoc")).not.toBeNull();
    expect(host.textContent).toContain("Propose new document");
  });

  it("hides 'Draft from this document' in read mode and shows it in edit mode", () => {
    modeSig.value = "read";
    let host = show("D-1");
    expect(host.querySelector("button.draft-from-document")).toBeNull();

    modeSig.value = "edit";
    host = show("D-1");
    expect(host.querySelector("button.draft-from-document")).not.toBeNull();
  });
});
