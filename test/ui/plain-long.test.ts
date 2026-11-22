/* Long plain-language rules break into bulleted clauses (design owner,
 * docs/design-system.md "Rule text"): the shared renderer (plain.ts) never
 * runs a conjunction, a sum or a group of people into one very long
 * sentence. Pinned against the Colorado volume. */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import { LONG_LINE, partsText, plainRule, plainText, relWords } from "../../src/ui/plain";

const root = path.resolve(__dirname, "../..");
const { engine } = loadVolume(root, "co");
const rule = (id: string) => plainRule(engine, engine.itemById(id)!);

describe("long rules read as bulleted clauses", () => {
  it("Colorado Works assistance unit members (CO-900): who is joined, then who is kept, one clause a line", () => {
    const text = plainText(rule("CO-900"));
    expect(text).toMatch(/^Colorado Works: assistance unit members is:\n  the people joined to this person by parent, child, legal guardian, ward, .* or spouse, crossing only where:/);
    expect(text).toContain("\n  keeping only the people for whom:\n");
    // Inside the group, P is the other person, as the engine says it.
    expect(text).toContain("• this person is the parent, legal guardian or person with primary responsibility of that person");
    // No raw relationship identifier, and no line far past the limit.
    expect(text).not.toMatch(/has_primary_responsibility_for|in_primary_care_of|legal_guardian/);
    for (const l of rule("CO-900")) expect(partsText(l.parts).length).toBeLessThanOrEqual(LONG_LINE + 20);
  });

  it("a long sum is 'the total of:' with one term a line (Adult Financial needs of a spouse's dependent children, CO-2392)", () => {
    // CO-2384 was the example until coverage pass 2 (G-1) moved its income sums into CO-3830 and CO-4720.
    const text = plainText(rule("CO-2392"));
    expect(text).toContain("the total of:\n");
    expect(text).toMatch(/\n +• that person's Social Security income\n/);
    // The group the total runs over is described after it, not in one line.
    expect(text).toContain("the total, over the people described below, of:");
    expect(text).toContain("\n  where the people are:\n");
  });

  it("most of the volume's rule lines fit the limit", () => {
    const lines = engine.items().filter((it) => it.kind === "derived").flatMap((it) => plainRule(engine, it));
    const over = lines.filter((l) => partsText(l.parts).length > 300).length;
    // Before the split: 226 lines over 300 characters.
    expect(over).toBeLessThanOrEqual(40);
  });

  it("relationship roles read as words", () => {
    expect(relWords(["parent", "legal_guardian", "spouse"])).toBe("parent, legal guardian or spouse");
    expect(relWords(["buys_prepares_with"])).toBe("person buying and preparing food with them");
  });
});
