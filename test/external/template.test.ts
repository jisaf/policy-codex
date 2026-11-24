import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { importTemplate } from "../../src/external/importer";
import { casesYaml, readFolder } from "../../src/external/load";
import { CORE_PERSON_FACTS, RETIRING_SCALAR_FACTS } from "../../src/external/dictionary";
import { templateFiles } from "../../src/external/template";
import { manifestVolumes } from "../../src/tools/volumes";
import { coContext, EXAMPLE_DIR, ROOT, TEMPLATE_DIR } from "./helpers";

beforeAll(() => { coContext(); }, 120_000);

describe("the intake template", () => {
  it("is what npm run external:template writes from the volume (run it after the volume changes)", () => {
    const files = templateFiles(coContext().dict);
    expect(fs.readdirSync(TEMPLATE_DIR).sort()).toEqual(Object.keys(files).sort());
    for (const [f, text] of Object.entries(files)) {
      expect(fs.readFileSync(path.join(TEMPLATE_DIR, f), "utf8"), f).toBe(text);
    }
  });

  it("asks for the screening order's first facts of every person, and never a scalar income or resource fact", () => {
    const d = coContext().dict;
    const persons = d.facts.filter((f) => f.sheet === "persons").map((f) => f.identifier);
    expect(persons).toEqual(CORE_PERSON_FACTS.map(([f]) => f).filter((f) => persons.includes(f)));
    expect(persons).toEqual(expect.arrayContaining(["date_of_birth", "is_pregnant", "state_of_residence", "immigration_status", "receives_ssi"]));
    expect(d.facts.filter((f) => RETIRING_SCALAR_FACTS.has(f.identifier))).toEqual([]);
    expect(d.records.map((r) => r.list)).toEqual(expect.arrayContaining(["receipts", "earnings", "holdings"]));
    for (const f of d.facts) expect(f.programs.length, f.identifier).toBeGreaterThan(0);
    expect(d.results.map((r) => r.identifier)).toEqual(expect.arrayContaining(["snap_allotment", "snap_eligibility_status", "cw_grant_amount", "ma_ltc_eligibility_status"]));
  });
});

describe("the worked example", () => {
  it("imports without an issue, into the cases.yaml checked in beside it", () => {
    const res = importTemplate(readFolder(EXAMPLE_DIR), coContext().dict);
    expect(res.issues).toEqual([]);
    expect(res.cases.length).toBe(4);
    expect(fs.readFileSync(path.join(EXAMPLE_DIR, "cases.yaml"), "utf8")).toBe(casesYaml(res.cases, "example", "co"));
  });

  it("stays out of the stored-household gate", () => {
    const stored = new Set(coContext().stored.map((c) => c.id));
    const res = importTemplate(readFolder(EXAMPLE_DIR), coContext().dict);
    for (const c of res.cases) expect(stored.has(c.id), c.id).toBe(false);
    for (const v of manifestVolumes(ROOT)) expect(path.relative(v.path, "external-check").startsWith("..")).toBe(true);
  });

  it("keeps received case files out of git", () => {
    const ignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
    expect(ignore).toMatch(/^external-check\/\*$/m);
    expect(ignore).toMatch(/^!external-check\/template\/$/m);
    expect(ignore).toMatch(/^!external-check\/example\/$/m);
  });
});
