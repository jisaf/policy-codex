import { describe, expect, it } from "vitest";
import { createEngine } from "../../src/engine/engine";
import {
  contextAt, details, suggestions, tokenAt, tokenize, type Line, type Token,
} from "../../src/ui/highlight";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);

const vol = {
  volumeId: "mwr",
  sources: [{ id: "S1", title: "Community engagement", citation: "42 U.S.C. 1396u-1", text: "The State shall..." }],
  openQuestions: [{ id: "OQ-17", title: "Which month?" }],
};

/** Every token of a block, flattened, so a test can look one up by text. */
function flat(lines: Line[]): Token[] {
  return lines.flatMap((l) => l.tokens);
}

function find(lines: Line[], text: string): Token | undefined {
  return flat(lines).find((t) => t.text === text);
}

const BLOCK = [
  "ID            WR-900",
  "Fact          Medicaid: is in the renewal window",
  "Identifier    medicaid_in_renewal_window",
  "Kind          Derived",
  "Type          yes/no",
  "Scope         person",
  "Program       Medicaid",
  "Meaning       The person is inside the renewal window.",
  "Derived as    all of the following are true:",
  "                - Date of Birth is at least 2007-03-15",
  "                - Medicaid: is in the community engagement age range",
  "                - Medicaid community engagement minimum age (19) is at least 19",
  "                - wobbly thing is unknown",
  "Source        S1",
  "Implemented   Determination engine",
  "Tags          legal",
  "Examples",
  "  T1: given date_of_birth=\"2007-03-15\" => yes",
].join("\n");

describe("tokenize", () => {
  const lines = tokenize(engine, BLOCK, { errorLines: [13], sourceIds: ["S1"] });

  it("gives every line a 1-based number and marks the error lines", () => {
    expect(lines).toHaveLength(18);
    expect(lines[0].number).toBe(1);
    expect(lines.filter((l) => l.error).map((l) => l.number)).toEqual([13]);
  });

  it("classes the field keys", () => {
    expect(find(lines, "Derived as")!.cls).toBe("key");
    expect(find(lines, "Meaning")!.cls).toBe("key");
    expect(find(lines, "Identifier")!.cls).toBe("key");
  });

  it("classes known facts by their kind and carries the item id", () => {
    const dob = find(lines, "Date of Birth")!;
    expect(dob.cls).toBe("fact");
    expect(dob.itemId).toBe("WR-001");
    expect(find(lines, "Medicaid: is in the community engagement age range")!.cls).toBe("derived");
    expect(find(lines, "Medicaid community engagement minimum age (19)")!.cls).toBe("param");
  });

  it("classes an unknown identifier as unknown", () => {
    const tok = find(lines, "wobbly")!;
    expect(tok.cls).toBe("unknown");
    expect(BLOCK.slice(tok.start, tok.end)).toBe("wobbly");
  });

  it("classes pattern phrases, date literals, source refs and tags", () => {
    expect(find(lines, "all of the following are true:")!.cls).toBe("phrase");
    expect(find(lines, "is at least")!.cls).toBe("phrase");
    expect(find(lines, "2007-03-15")!.cls).toBe("literal");
    expect(find(lines, "S1")!.cls).toBe("source");
    expect(find(lines, "legal")!.cls).toBe("tag");
  });

  it("flags a value the checker will not accept", () => {
    const bad = tokenize(engine, "Scope         galaxy\nProgram       Martian");
    expect(find(bad, "galaxy")!.cls).toBe("error");
    expect(find(bad, "Martian")!.cls).toBe("error");
  });

  it("covers every character of the block exactly once", () => {
    for (const line of lines) {
      expect(line.tokens.map((t) => t.text).join("")).toBe(line.text);
    }
  });
});

describe("contextAt", () => {
  it("reads a Derived-as line as an expression with the word prefix", () => {
    const text = "Derived as    date";
    const ctx = contextAt(engine, text, text.length);
    expect(ctx.kind).toBe("expr");
    expect(ctx.field).toBe("Derived as");
    expect(ctx.prefix).toBe("date");
    expect(ctx.line).toBe(1);
    expect(text.slice(ctx.start)).toBe("date");
  });

  it("carries the expression context onto an indented continuation line", () => {
    const text = "Derived as    all of the following are true:\n                - Ag";
    const ctx = contextAt(engine, text, text.length);
    expect(ctx.kind).toBe("expr");
    expect(ctx.prefix).toBe("Ag");
    expect(ctx.line).toBe(2);
  });

  it("reads an Examples line and a Tags line by their own field", () => {
    const ex = "Examples\n  T1: given date_of";
    expect(contextAt(engine, ex, ex.length).kind).toBe("example");
    expect(contextAt(engine, ex, ex.length).prefix).toBe("date_of");
    const tags = "Tags          legal, state_ele";
    expect(contextAt(engine, tags, tags.length).kind).toBe("tag");
    expect(contextAt(engine, tags, tags.length).prefix).toBe("state_ele");
  });

  it("reads a trigger character, whatever field it is typed in", () => {
    const text = "Meaning       see #S";
    const ctx = contextAt(engine, text, text.length);
    expect(ctx.kind).toBe("source");
    expect(ctx.trigger).toBe("#");
    expect(ctx.prefix).toBe("S");
  });
});

describe("suggestions", () => {
  it("offers date_of_birth for the prefix \"date\"", () => {
    const text = "Derived as    date";
    const list = suggestions(engine, contextAt(engine, text, text.length));
    const hit = list.find((s) => s.identifier === "date_of_birth");
    expect(hit).toBeDefined();
    expect(hit!.label).toBe("Date of Birth");
    expect(hit!.insert).toBe("Date of Birth");
    expect(hit!.cls).toBe("fact");
    expect(hit!.detail).toContain("calendar date");
  });

  it("inserts a parameter with its value, which the parser reads back", () => {
    const text = "Derived as    Medicaid community engagement minimum";
    const list = suggestions(engine, contextAt(engine, text, text.length));
    const hit = list.find((s) => s.identifier === "medicaid_ce_min_age")!;
    expect(hit.insert).toBe("Medicaid community engagement minimum age (19)");
    expect(engine.parseInline(hit.insert)).toBe("medicaid_ce_min_age");
  });

  it("offers identifiers, not names, inside an Examples line", () => {
    const text = "Examples\n  T1: given date_of";
    const list = suggestions(engine, contextAt(engine, text, text.length));
    expect(list[0].label).toBe("date_of_birth");
    expect(list[0].insert).toBe("date_of_birth=");
  });

  it("offers the volume's excerpts on a Source line", () => {
    const text = "Source        S";
    const list = suggestions(engine, contextAt(engine, text, text.length), undefined, {
      sources: vol.sources,
    });
    expect(list.map((s) => s.label)).toContain("S1");
  });
});

describe("tokenAt and details", () => {
  it("documents a fact by name and kind", () => {
    const text = "Derived as    Date of Birth is at least 2007-03-15";
    const tok = tokenAt(engine, text, text.indexOf("Birth"))!;
    expect(tok.text).toBe("Date of Birth");
    const d = details(engine, vol, tok)!;
    expect(d.title).toBe("WR-001 · Date of Birth");
    expect(d.cls).toBe("fact");
    expect(d.rows).toContainEqual(["identifier", "date_of_birth"]);
    expect(d.rows).toContainEqual(["kind", "supplied"]);
    expect(d.link).toBe("#/mwr/item/WR-001");
  });

  it("documents a pattern phrase, a field key and a source excerpt", () => {
    const text = "Derived as    Date of Birth is at least 2007-03-15\nSource        S1";
    const phrase = details(engine, vol, tokenAt(engine, text, text.indexOf("is at least")))!;
    expect(phrase.rows[0]).toEqual(["pattern", "Comparison"]);
    const key = details(engine, vol, tokenAt(engine, text, 2))!;
    expect(key.title).toBe("Derived as");
    expect(key.rows[0][1]).toContain("catalog patterns");
    const src = details(engine, vol, tokenAt(engine, text, text.indexOf("S1")))!;
    expect(src.title).toBe("S1 · Community engagement");
    expect(src.rows[0]).toEqual(["citation", "42 U.S.C. 1396u-1"]);
  });

  it("suggests near matches for a word it does not recognise", () => {
    const text = "Derived as    Date of Birht is at least 2007-03-15";
    const d = details(engine, vol, tokenAt(engine, text, text.indexOf("Birht")))!;
    expect(d.cls).toBe("unknown");
    expect(d.rows[0][0]).toBe("not recognised");
  });

  it("returns null between tokens", () => {
    expect(tokenAt(engine, "", 0)).toBeNull();
  });
});
