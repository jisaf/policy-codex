import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { render } from "preact";
import { DocumentsView, excerptsOf } from "../../src/ui/DocumentsView";
import { SourcesView } from "../../src/ui/SourcesView";
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

function show(
  view: "documents" | "document", arg: string | null = null,
  fetchText: (p: string) => Promise<string> = async () => TEXT,
) {
  route.value = { ...defaultRoute(), view, arg };
  const host = document.createElement("div");
  render(<DocumentsView fetchText={fetchText} />, host);
  return host;
}

describe("DocumentsView list", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("mwr", "main");
  });

  it("lists every migrated document with its kind, citation, and excerpt count", () => {
    const host = show("documents");
    const rows = host.querySelectorAll("table.documents tbody tr");
    expect(rows).toHaveLength(8);
    const first = rows[0].textContent!;
    expect(first).toContain("D-1");
    expect(first).toContain("42 U.S.C. 1396a — State plans for medical assistance");
    expect(first).toContain("statute");
    expect(rows[0].querySelector("td:last-child")!.textContent).toBe("6");
    const snapReg = [...rows].find((tr) => tr.textContent!.startsWith("D-7"))!;
    expect(snapReg.textContent).toContain("regulation");
    expect(snapReg.querySelector("td:last-child")!.textContent).toBe("7");
  });

  it("links each row to its document page", () => {
    const host = show("documents");
    const link = host.querySelector("table.documents tbody a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("#/mwr/document/D-1");
  });

  it("selects the excerpts of one document, in file order", () => {
    expect(excerptsOf(sources, "D-1").map((s) => s.id))
      .toEqual(["S1", "S2", "S6", "S8", "S9", "S10"]);
    expect(excerptsOf(sources, "D-99")).toEqual([]);
  });
});

describe("DocumentsView page", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("mwr", "main");
  });

  it("shows the metadata, the fetched text, and every excerpt with its citing items", async () => {
    const asked: string[] = [];
    const host = show("document", "D-1", async (p) => { asked.push(p); return TEXT; });
    await new Promise((r) => setTimeout(r));

    expect(asked).toEqual(["volumes/mwr/documents/D-1.md"]);
    expect(host.textContent).toContain("42 U.S.C. 1396a — State plans for medical assistance");
    expect(host.textContent).toContain("statute");
    const paras = host.querySelectorAll(".doctext pre.statute");
    expect(paras).toHaveLength(2);
    expect(paras[1].textContent).toBe("Second paragraph of the text.");

    const excerpts = host.querySelectorAll("article.excerpt");
    expect(excerpts).toHaveLength(6);
    expect(excerpts[0].textContent).toContain("S1. Applicable individual");
    expect(excerpts[0].querySelector("h4 a")!.getAttribute("href")).toBe("#/mwr/source/S1");
    // WR-200 cites S1 in the fixture ledger, so the page names it.
    expect(excerpts[0].querySelector(".cited-by")!.textContent).toContain("community engagement");
  });

  it("says so when the text cannot be read, and still shows the excerpts", async () => {
    const host = show("document", "D-3", async () => { throw new Error("D-3.md not found at main (404)"); });
    await new Promise((r) => setTimeout(r));
    expect(host.querySelector(".status.bad")!.textContent).toBe("D-3.md not found at main (404)");
    expect(host.querySelectorAll("article.excerpt")).toHaveLength(1);
  });

  it("says when a document id is not in the volume", () => {
    expect(show("document", "D-99").textContent).toContain("No document D-99 in this volume.");
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
    const host = show("documents");
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
    const host = show("documents");
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
    const host = show("documents");
    type(host, "title", "State hardship guidance");
    type(host, "citation", "MWR-2027-01");
    await new Promise((r) => setTimeout(r));
    expect((host.querySelector("button.stage-document") as HTMLButtonElement).disabled).toBe(true);
    expect(changeSetSig.value.files ?? []).toHaveLength(0);
  });
});

describe("DocumentsView reader mode gates", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
    changeSetSig.value = emptyChangeSet("mwr", "main");
  });

  it("hides 'Propose new document' in read mode and shows it in edit mode", () => {
    modeSig.value = "read";
    let host = show("documents");
    expect(host.querySelector(".newdoc")).toBeNull();

    modeSig.value = "edit";
    host = show("documents");
    expect(host.querySelector(".newdoc")).not.toBeNull();
    expect(host.textContent).toContain("Propose new document");
  });

  it("hides 'Draft from this document' in read mode and shows it in edit mode", () => {
    modeSig.value = "read";
    let host = show("document", "D-1");
    expect(host.querySelector("button.draft-from-document")).toBeNull();

    modeSig.value = "edit";
    host = show("document", "D-1");
    expect(host.querySelector("button.draft-from-document")).not.toBeNull();
  });
});

describe("SourcesView document links", () => {
  beforeEach(() => {
    volumeSig.value = vol;
    engineSig.value = engine;
    route.value = { ...defaultRoute(), view: "source" };
  });

  it("links every excerpt to the document it was taken from", () => {
    const host = document.createElement("div");
    render(<SourcesView />, host);
    const links = host.querySelectorAll("article.source a.doclink");
    expect(links).toHaveLength(33);
    expect(links[0].textContent).toBe("D-1");
    expect(links[0].getAttribute("href")).toBe("#/mwr/document/D-1");
  });
});
