import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseOpenQuestions, parseSources, sourceTitleMap } from "../../src/ledger/markdown";

const root = path.resolve(__dirname, "../..");
const sourcesMd = fs.readFileSync(path.join(root, "volumes/mwr/sources.md"), "utf8");
const oqMd = fs.readFileSync(path.join(root, "volumes/mwr/open-questions.md"), "utf8");

describe("parseSources", () => {
  const sources = parseSources(sourcesMd);

  it("finds every excerpt, in file order, with the S19 gap", () => {
    expect(sources).toHaveLength(33);
    expect(sources[0].id).toBe("S1");
    expect(sources.at(-1)!.id).toBe("S34");
    expect(sources.map((s) => s.id)).not.toContain("S19");
  });

  it("splits title, citation, and statute text", () => {
    const s1 = sources[0];
    expect(s1.title).toBe("Applicable individual");
    expect(s1.citation).toBe(
      "42 U.S.C. 1396a(xx)(9)(A)(i), added by Pub. L. 119-21 sec. 71119. " +
        "https://www.law.cornell.edu/uscode/text/42/1396a",
    );
    expect(s1.text.startsWith('The term "applicable individual" means an individual')).toBe(true);
    expect(s1.text).not.toContain(">");
  });

  it("reads the document each excerpt was taken from", () => {
    expect(sources[0].document).toBe("D-1");
    expect(sources.find((s) => s.id === "S24")!.document).toBe("D-7");
    expect(sources.every((s) => /^D-\d+$/.test(s.document ?? ""))).toBe(true);
  });

  it("keeps the Document line out of the citation and the text", () => {
    const s24 = sources.find((s) => s.id === "S24")!;
    expect(s24.citation.startsWith("7 CFR 273.24(a)(1)(i).")).toBe(true);
    expect(s24.citation).not.toContain("Document:");
    expect(s24.text).not.toContain("Document:");
  });

  it("leaves document undefined when an excerpt names none", () => {
    const [only] = parseSources("### S9. Untitled\n\n42 U.S.C. 1\n\n> text\n");
    expect(only.document).toBeUndefined();
    expect(only.citation).toBe("42 U.S.C. 1");
  });

  it("maps ids to titles", () => {
    expect(sourceTitleMap(sources).S1).toBe("Applicable individual");
  });
});

describe("parseOpenQuestions", () => {
  const questions = parseOpenQuestions(oqMd);

  it("finds every question", () => {
    expect(questions).toHaveLength(23);
    expect(questions[0].id).toBe("OQ-1");
    expect(questions[0].title).toBe("Age during a month");
  });

  it("extracts the cross-referenced items", () => {
    expect(questions[0].items).toEqual(["WR-004"]);
    expect(questions.find((q) => q.id === "OQ-3")!.items).toEqual(["WR-011", "WR-201"]);
    expect(questions.find((q) => q.id === "OQ-8")!.items).toEqual([
      "WR-045", "WR-304", "WR-305",
    ]);
  });

  it("keeps the assumption prose in the body", () => {
    expect(questions[0].body).toContain("Assumption: the age on the first day of the month");
  });
});
