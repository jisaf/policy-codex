import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  GRAMMAR, RULES, documentContext, chunkByHeadings, glossaryText, namingRulesText,
  sourcesText, systemPrompt, vocabularyText,
} from "../../src/ai/prompt";
import { createEngine } from "../../src/engine/engine";
import { parseVolumeFile } from "../../src/engine/yaml";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";
import type { DocumentMeta } from "../../src/ledger/documents";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const sources = [
  { id: "S1", title: "Applicable individual", citation: "42 U.S.C. 1396a(xx)(9)(A)(i)", text: "…" },
];

const root = path.resolve(__dirname, "../..");
const realMeta = parseVolumeFile(
  fs.readFileSync(path.join(root, "volumes/mwr/volume.yaml"), "utf8"),
);
const doc: DocumentMeta = {
  id: "D-1", title: "State plans for medical assistance", kind: "statute",
  citation: "42 U.S.C. 1396a", file: "documents/D-1.md", date: "2026-01-01",
};

describe("prompt assembly", () => {
  it("writes one glossary line per item with the parameter value", () => {
    const text = glossaryText(engine.items(), engine.lit, engine.paramValue);
    const lines = text.split("\n");
    expect(lines).toHaveLength(138);
    expect(lines[0]).toBe("WR-001 | Date of Birth | date_of_birth | supplied | calendar date | person | All");
    expect(text).toContain(
      "WR-100 | Medicaid community engagement required hours per month | " +
        "medicaid_ce_required_hours | parameter | hours | global | Medicaid value: 80",
    );
  });

  it("writes one source line per excerpt with a truncated citation", () => {
    expect(sourcesText(sources)).toBe(
      "S1: Applicable individual (42 U.S.C. 1396a(xx)(9)(A)(i))",
    );
  });

  it("assembles the grammar, rules, glossary, and sources", () => {
    const p = systemPrompt(engine, sources);
    expect(p).toContain("You draft items for a benefits policy codex");
    expect(p).toContain(GRAMMAR.trim().slice(0, 40));
    expect(p).toContain(RULES.trim().slice(0, 40));
    expect(p).toContain("EXISTING GLOSSARY (id | name | identifier | kind | type | scope | program)");
    expect(p).toContain("EXISTING SOURCES");
    expect(p).toContain("S1: Applicable individual");
  });
});

describe("vocabularyText", () => {
  it("lists programs with their prefix and outcomes, tags, types, and scopes", () => {
    const text = vocabularyText(realMeta);
    expect(text).toContain('Medicaid (prefix "medicaid_"); outcomes: ' +
      "medicaid_ce_status_at_application, medicaid_ce_status_at_renewal");
    expect(text).toContain('SNAP (prefix "snap_"); outcomes: ' +
      "snap_time_limit_status, snap_is_subject_to_work_requirement");
    expect(text).toContain("All (no prefix)");
    expect(text).toContain("Tags: legal, medical, state_election");
    expect(text).toContain("Types: yes/no, whole number");
    expect(text).toContain("Scopes: person, person-month, case, month, global");
  });

  it("omits programs and tags for a volume that declares neither", () => {
    const text = vocabularyText({ ...realMeta, programs: undefined, tags: undefined });
    expect(text).not.toContain("Programs:");
    expect(text).not.toContain("Tags:");
    expect(text).toContain("Types:");
  });
});

describe("namingRulesText", () => {
  it("states the grammar in one paragraph", () => {
    const text = namingRulesText();
    expect(text).toContain("lower_snake_case");
    expect(text).toContain("reserved");
    expect(text).toContain("prefix");
  });
});

describe("systemPrompt with vocabulary and naming", () => {
  it("includes the vocabulary and naming rules text", () => {
    const realEngine = createEngine(ledger.items as unknown as Item[], realMeta, refs);
    const p = systemPrompt(realEngine, sources);
    expect(p).toContain("VOCABULARY");
    expect(p).toContain("NAMING");
    expect(p).toContain('prefix "medicaid_"');
  });
});

describe("documentContext", () => {
  it("carries the document's metadata and its text when it fits", () => {
    const text = documentContext(doc, "Short body text.");
    expect(text).toContain("DOCUMENT D-1: State plans for medical assistance (statute)");
    expect(text).toContain("42 U.S.C. 1396a");
    expect(text).toContain("2026-01-01");
    expect(text).toContain("Short body text.");
    expect(text).not.toContain("TRUNCATED");
  });

  it("truncates at a paragraph boundary and notes the cut", () => {
    const paras = Array.from({ length: 20 }, (_, i) => `Paragraph ${i}. `.repeat(20));
    const long = paras.join("\n\n");
    const text = documentContext(doc, long, 400);
    expect(text.length).toBeLessThan(long.length);
    expect(text).toContain("TRUNCATED");
    // The cut lands on a paragraph boundary: no partial paragraph leaks in.
    const kept = text.slice(text.indexOf("\n\n") + 2, text.indexOf("\n\n[TRUNCATED"));
    for (const p of kept.split("\n\n")) expect(paras).toContain(p);
  });
});

describe("chunkByHeadings", () => {
  it("splits a document at its headings", () => {
    const text = "# Title\n\nintro\n\n## S1. First\n\nbody one\n\n## S2. Second\n\nbody two\n";
    const chunks = chunkByHeadings(text);
    expect(chunks.map((c) => c.heading)).toEqual(["Title", "S1. First", "S2. Second"]);
    expect(chunks[1].text).toBe("body one");
  });

  it("returns the whole text as one chunk when there are no headings", () => {
    const chunks = chunkByHeadings("just some text\nacross two lines");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("just some text\nacross two lines");
  });
});
