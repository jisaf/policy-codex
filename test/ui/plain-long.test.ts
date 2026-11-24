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
    // Receipt records (migration 1): the child's unearned income is one term, a total over the child's receipts.
    // Earned-income records, step E1 Adult Financial: the child's earned income is a total over the child's earnings
    // records (it was "that person's Gross wages plus" the net profit before).
    expect(text).toContain("• the total, over the receipts in that person's Earnings for which:");
    expect(text).toContain("• the total, over the receipts in that person's Receipts for which:");
    // The group the total runs over is described after it, not in one line.
    expect(text).toContain("the total, over the people described below, of:");
    expect(text).toContain("\n  where the people are:\n");
  });

  it("most of the volume's rule lines fit the limit", () => {
    const lines = engine.items().filter((it) => it.kind === "derived").flatMap((it) => plainRule(engine, it));
    const over = lines.filter((l) => partsText(l.parts).length > 300).length;
    // Before the split: 226 lines over 300 characters. 41 after the time
    // audit fix round wrote "[figure] as of the determination date" into the
    // rules that fix a figure at the determination (T-3: CCCAP's fee and
    // entry limit, LEAP's limit and guideline). 42 after earnings E1 SNAP: each
    // pay converted by its own frequency, written once per pay sum (CO-4324,
    // CO-5113), reads as one long clause list. 45 with E1 CCCAP and LEAP merged (their dated-pay sums); 46 with E1 Medicaid (the SSI-method earned pieces). 48 with E1 Adult Financial and Colorado Works (their pay sums). 49 with the records E1 integration (CO-3827 tests the month's irregular receipts before the quarter). 60 with coverage pass 4 (CCCAP C4-1, C4-2): J.28 tests each irregular pay or receipt against the quarter of its own date, one clause list per quarter (CO-3915, CO-4464, CO-4076), the quarter's end month and total (CO-6401, CO-6402), and the deductions placed by date in the thirty days (CO-4463). 63 with H1 Medicaid (the holdings readers and the couple figures). 64 with resource records H1 SNAP and Adult Financial (CO-3840 reads the month's transfers from the holdings records: the latest and earliest day of them, and the value of each). 67 with coverage pass 4 MAGI (the month-by-month MAGI household and the month-first income tests). 76 with coverage pass 4 for SNAP (S4-1 to S4-5): each SNAP reader of the records places a record by its regular date, its interval and its source's dates (CO-4324, CO-5113, CO-5011 and the business, boarder and quarter readers), one clause list per condition. 77 with SNAP ages by month (S4-11 finished): the household (CO-305) writes each mandatory-combination age as the age on the first day of the month evaluated, inline. 79 with coverage pass 4 cash (the per-month Adult Financial resource chain). 89 with coverage pass 4 for SNAP resources: each SNAP resource reader values a holding on the month's day and adds the part a separate household co-owns (4.409.C), one clause list per sum (CO-4176, CO-5310, CO-5311, CO-6900, CO-5312, CO-5313). 93 with coverage pass 5 for CCCAP, LEAP and SUN Bucks (C5-1, L5-1, L5-6): each CCCAP and LEAP reader of a stream places it by its source's dates against the thirty days or the income verification period, one clause list per condition, and LEAP's unearned-income verification takes off the declared gifts as the period counts them (CO-4526). 94 with coverage pass 5 MAGI merged onto coverage pass 5 CCCAP and LEAP. 95 with the field-effect sweep, non-MAGI Medicaid merged (CO-5320: the joint-account presumption, burial spaces, personal property and replacement proceeds by their source, each its own clause list). 106 with the field sweep for SNAP and the cash programs merged onto the non-MAGI one (stream dates and the VA dependent part in every cash receipt reader). 117 with the cross-list records round: the SSI method's dependent part read from every stated receipts list (CO-5511, CO-5514, CO-6730), SNAP's one agreement and one plot per member chosen across the holders' lists (CO-5312, CO-5313 and their six per-member readers, CO-7200 to CO-7205), each holder's sum a clause list per condition.
    expect(over).toBeLessThanOrEqual(123); // 123 with coverage pass 6 MAGI merged (pregnancy end from the birth, the first eligible month of the application); 119 with coverage pass 6, non-MAGI: the SSI-method couple crosses a spouse edge only while the spouses live together (CO-3626, F6-1) and 20 CFR 416.1163(d)'s ineligible-spouse test (CO-7353, F6-6), each a clause list over the spouse
  });

  it("relationship roles read as words", () => {
    expect(relWords(["parent", "legal_guardian", "spouse"])).toBe("parent, legal guardian or spouse");
    expect(relWords(["buys_prepares_with"])).toBe("person buying and preparing food with them");
  });
});
