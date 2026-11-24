import { beforeAll, describe, expect, it } from "vitest";
import { parseCsv } from "../../src/external/csv";
import { importTemplate } from "../../src/external/importer";
import { reportCsv, reportMarkdown, REPORT_CSV_HEADERS } from "../../src/external/report";
import { parseKnownLimits, runExternal, sameAnswer, showValue, type CheckRow, type TriageRefs } from "../../src/external/runner";
import { addRow, coContext, exampleSheets, setCells } from "./helpers";

beforeAll(() => { coContext(); }, 120_000);
const NO_REFS: TriageRefs = { openQuestions: [], knownLimits: [] };
const Q = "9-expected.csv";

function run(files: Record<string, string>, refs: TriageRefs = NO_REFS): CheckRow[] {
  const res = importTemplate(files, coContext().dict);
  expect(res.issues).toEqual([]);
  return runExternal(coContext().ix, res.cases, refs);
}

describe("sameAnswer and showValue", () => {
  it("compares amounts to the cent, groups in any order, and cannot determine with null", () => {
    expect(sameAnswer(320, 320.001)).toBe(true);
    expect(sameAnswer(320, 320.01)).toBe(false);
    expect(sameAnswer(["p2", "p1"], ["p1", "p2"])).toBe(true);
    expect(sameAnswer(null, null)).toBe(true);
    expect(sameAnswer(null, "eligible")).toBe(false);
    expect(sameAnswer("eligible", null)).toBe(false);
    expect(showValue(null)).toBe("cannot determine");
    expect(showValue("eligible_institutional")).toBe("eligible institutional");
    expect(showValue(["p1", "p2"], { p1: "Person 1", p2: "Person 2" })).toBe("Person 1, Person 2");
    expect(showValue(2789.6)).toBe("2789.60");
  });
});

describe("parseKnownLimits", () => {
  it("reads each entry's id, title, the items it names and whether it is closed", () => {
    const md = [
      "# Known limits", "", "## SNAP", "",
      "### KL-X-1 (pass 7; OQ-12): a thing read wrong", "", "- **Description.** snap_thing (CO-10) reads CO-11.", "",
      "### KL-X-2: closed one", "", "**Closed (commit abc).** It named CO-12.", "",
      "### NM-KL-9. A limit with a dot", "", "Reads ma_other (CO-13).", "",
    ].join("\n");
    const kls = parseKnownLimits(md);
    expect(kls.map((k) => [k.id, k.closed])).toEqual([["KL-X-1", false], ["KL-X-2", true], ["NM-KL-9", false]]);
    expect(kls[0].title).toBe("a thing read wrong");
    expect([...kls[0].names]).toEqual(expect.arrayContaining(["CO-10", "CO-11", "snap_thing"]));
    expect([...kls[0].questions]).toEqual(["OQ-12"]);
    expect(kls[2].title).toBe("A limit with a dot");
  });
});

describe("runExternal", () => {
  it("reports a match where the engine gives the expected answer", () => {
    const rows = run(exampleSheets("EX-2"));
    expect(rows.length).toBe(4);
    expect(rows.every((r) => r.status === "match")).toBe(true);
    expect(rows.every((r) => !r.hints.length && !r.decisive.length)).toBe(true);
  });

  it("shows the decisive rules and a first triage hint for a difference", () => {
    const files = exampleSheets("EX-2");
    setCells(files, Q, (r) => r.person === "Person 1" && /grant amount/.test(r.result), "expected answer", "$999");
    const rows = run(files);
    const d = rows.filter((r) => r.status === "differ");
    expect(d.length).toBe(1);
    expect(d[0]).toMatchObject({ case: "EX-2", person: "p1", identifier: "cw_grant_amount", month: "2026-10", expected: 999, engine: 320, source: "worker determination" });
    expect(d[0].decisive.length).toBeGreaterThan(0);
    expect(d[0].decisive[0].depth).toBe(0);
    expect(d[0].missing).toEqual([]);
    expect(d[0].hints[0].category).toBe("rule gap");
  });

  it("names an open known limit or open question that meets the decisive rules, and skips closed ones", () => {
    const files = exampleSheets("EX-2");
    setCells(files, Q, (r) => r.person === "Person 1" && /grant amount/.test(r.result), "expected answer", "999");
    const plain = run(files).find((r) => r.status === "differ")!;
    const deep = plain.decisive.find((l) => l.kind === "derived" && l.depth >= 1) ?? plain.decisive.find((l) => l.kind === "derived")!;
    const refs: TriageRefs = {
      knownLimits: parseKnownLimits(
        `### KL-T-1: an open limit\n\nReads ${deep.id}.\n\n### KL-T-2: a closed limit\n\n**Closed.** Reads ${deep.id}.\n`,
      ),
      openQuestions: [
        { id: "OQ-9001", title: "An open question", body: "", items: [deep.id] },
        { id: "OQ-9002", title: "Resolved: a settled one", body: "", items: [deep.id] },
      ],
    };
    const d = run(files, refs).find((r) => r.status === "differ")!;
    expect(d.hints.map((h) => [h.category, h.ref])).toEqual([["known limit", "KL-T-1"], ["open question", "OQ-9001"]]);
  });

  it("lists the missing facts and hints data entry when the engine cannot determine", () => {
    const files = exampleSheets("EX-2");
    addRow(files, Q, {
      case: "EX-2", person: "Person 1", program: "SNAP", result: "SNAP: eligibility status", month: "2026-10",
      "expected answer": "eligible", "source of the expected answer": "CBMS result", notes: "SNAP facts not sent",
    });
    const d = run(files).filter((r) => r.status === "differ");
    expect(d.length).toBe(1);
    expect(d[0].engine).toBeNull();
    expect(d[0].missing.length).toBeGreaterThan(0);
    expect(d[0].missing.every((m) => m.identifier && m.name)).toBe(true);
    expect(d[0].hints[0].category).toBe("data entry");
  });

  it("runs a case in the stored-household shape from its expect blocks", () => {
    const stored = coContext().stored.find((c) => c.id === "CO-363")!;
    const rows = runExternal(coContext().ix, [stored], NO_REFS);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.status === "match")).toBe(true);
  });
});

describe("report", () => {
  it("writes every answer to the CSV and every difference to the markdown", () => {
    const files = exampleSheets("EX-2");
    setCells(files, Q, (r) => r.person === "Person 2" && /eligibility status/.test(r.result), "expected answer", "ineligible no dependent child");
    const rows = run(files);
    const meta = { title: "test", volume: "co", commit: "abc", date: "2026-11-24", persons: { "EX-2": { p1: "Person 1", p2: "Person 2" } }, caseNotes: {} };
    const md = reportMarkdown(rows, meta);
    expect(md).toContain("**1 case, 4 expected answers: 3 match, 1 differ.**");
    expect(md).toContain("### EX-2, Person 2, Colorado Works: eligibility status, 2026-10");
    expect(md).toContain("- **First triage hint:** rule gap.");
    expect(md).toContain("- **Decisive rules**");
    const csv = parseCsv(reportCsv(rows, meta));
    expect(csv.headers).toEqual([...REPORT_CSV_HEADERS]);
    expect(csv.rows.length).toBe(4);
    const differ = csv.rows.find((r) => r.cells[8] === "differ")!;
    expect(differ.cells.slice(0, 8)).toEqual(["EX-2", "Person 2", "Colorado Works", "Colorado Works: eligibility status", "cw_eligibility_status", "2026-10", "ineligible no dependent child", "eligible"]);
    expect(differ.cells[11]).toMatch(/^rule gap: /);
  });
});
