import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  DOCUMENT_KINDS, documentFilePath, fetchDocumentText, nextDocumentId, parseDocuments,
  stringifyDocuments, type DocumentMeta,
} from "../../src/ledger/documents";
import { parseSources } from "../../src/ledger/markdown";
import type { LedgerSource } from "../../src/ledger/source";

const root = path.resolve(__dirname, "../..");
const volDir = path.join(root, "volumes/mwr");
const documentsYaml = fs.readFileSync(path.join(volDir, "documents.yaml"), "utf8");
const documents = parseDocuments(documentsYaml);
const sources = parseSources(fs.readFileSync(path.join(volDir, "sources.md"), "utf8"));

describe("parseDocuments", () => {
  it("reads the migrated library", () => {
    expect(documents).toHaveLength(8);
    expect(documents[0]).toEqual({
      id: "D-1",
      title: "42 U.S.C. 1396a — State plans for medical assistance",
      kind: "statute",
      citation: "42 U.S.C. 1396a",
      url: "https://www.law.cornell.edu/uscode/text/42/1396a",
      file: "documents/D-1.md",
    });
    expect(documents.every((d) => (DOCUMENT_KINDS as readonly string[]).includes(d.kind)))
      .toBe(true);
    expect(documents.find((d) => d.id === "D-2")!.date).toBe("2026-06-03");
  });

  it("reads an absent or empty file as no documents", () => {
    expect(parseDocuments("")).toEqual([]);
    expect(parseDocuments("# only a comment\n")).toEqual([]);
  });

  it("rejects a file that is not a sequence", () => {
    expect(() => parseDocuments("id: D-1\n")).toThrow("not a YAML sequence");
  });
});

describe("stringifyDocuments", () => {
  it("round-trips the checked-in library byte for byte", () => {
    expect(stringifyDocuments(documents)).toBe(documentsYaml);
  });

  it("writes a new document as the only difference from the old file", () => {
    const added: DocumentMeta = {
      id: "D-9", title: "State hardship guidance", kind: "guidance",
      citation: "MWR-2027-01", file: "documents/D-9.md", date: "2027-01-04",
    };
    const next = stringifyDocuments([...documents, added]);
    expect(next.startsWith(documentsYaml)).toBe(true);
    expect(next.slice(documentsYaml.length)).toBe(
      "- id: D-9\n  title: State hardship guidance\n  kind: guidance\n" +
        '  citation: MWR-2027-01\n  file: documents/D-9.md\n  date: "2027-01-04"\n',
    );
    expect(parseDocuments(next)).toHaveLength(9);
  });

  it("omits the optional url and date", () => {
    expect(stringifyDocuments([{
      id: "D-1", title: "t", kind: "memo", citation: "c", file: "documents/D-1.md",
    }])).toBe("- id: D-1\n  title: t\n  kind: memo\n  citation: c\n  file: documents/D-1.md\n");
  });
});

describe("the migrated documents", () => {
  it("gives every excerpt in sources.md exactly one document that exists", () => {
    const ids = new Set(documents.map((d) => d.id));
    expect(sources).toHaveLength(33);
    for (const s of sources) expect(ids.has(s.document ?? "")).toBe(true);
  });

  it("covers every document with at least one excerpt", () => {
    for (const d of documents) {
      expect(sources.filter((s) => s.document === d.id).length).toBeGreaterThan(0);
    }
  });

  it("writes a text file per document that says the full text is missing", () => {
    for (const d of documents) {
      const file = path.join(root, documentFilePath("volumes/mwr", d));
      expect(fs.existsSync(file)).toBe(true);
      const body = fs.readFileSync(file, "utf8");
      expect(body).toContain("The full text of this document is not available");
      for (const s of sources.filter((x) => x.document === d.id)) {
        expect(body).toContain(`## ${s.id}. ${s.title}`);
      }
    }
  });

  it("groups the Medicaid statute and the SNAP regulation under their roots", () => {
    const d1 = sources.filter((s) => s.document === "D-1").map((s) => s.id);
    expect(d1).toEqual(["S1", "S2", "S6", "S8", "S9", "S10"]);
    const d7 = sources.filter((s) => s.document === "D-7").map((s) => s.id);
    expect(d7).toEqual(["S24", "S25", "S26", "S27", "S28", "S31", "S32"]);
  });
});

describe("documentFilePath and nextDocumentId", () => {
  it("resolves a document's text against its volume", () => {
    expect(documentFilePath("volumes/mwr", documents[0])).toBe("volumes/mwr/documents/D-1.md");
  });

  it("takes the next free id, never a used one", () => {
    expect(nextDocumentId(documents)).toBe("D-9");
    expect(nextDocumentId([])).toBe("D-1");
    expect(nextDocumentId([{ ...documents[0], id: "D-40" }])).toBe("D-41");
  });
});

describe("fetchDocumentText", () => {
  it("reads the text only when asked, from the ref the reader is on", async () => {
    const reads: string[] = [];
    const src: LedgerSource = {
      ref: "main",
      async readText(p) { reads.push(p); return "body"; },
      async head() { return null; },
    };
    expect(await fetchDocumentText(src, "volumes/mwr/documents/D-1.md")).toBe("body");
    expect(reads).toEqual(["volumes/mwr/documents/D-1.md"]);
  });
});
