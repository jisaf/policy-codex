/* The external sample check kit (external-check/, docs/external-check.md) for
 * the External check page: each template sheet with its column headings, the
 * data dictionary, the worked example's households and report rows, and the
 * staff guide's privacy rules. Used by build-data.ts. */
import fs from "node:fs";
import path from "node:path";
import { parseCsv } from "../../../src/external/csv";

export interface ExtSheet { file: string; title: string; columns: string[] }
export interface ExtDictRow { sheet: string; column: string; identifier: string; item: string; meaning: string; type: string; allowed: string; always: string; neededFor: string; blank: string }
export interface ExtExample { cases: Array<{ id: string; description: string; date: string }>; report: Array<Record<string, string>> }
export interface External { sheets: ExtSheet[]; dictionary: ExtDictRow[]; example: ExtExample; privacy: string[] }

const TITLES: Record<string, string> = {
  "1-households": "Households", "2-persons": "Persons", "3-relationships": "Relationships",
  "4-earnings": "Earnings", "5-other-income": "Other income", "6-resources": "Resources",
  "7-expenses": "Expenses", "8-other-facts": "Other facts", "9-expected": "Expected results",
};

export function buildExternal(root: string): External | null {
  const tdir = path.join(root, "external-check/template");
  const edir = path.join(root, "external-check/example");
  if (!fs.existsSync(tdir)) return null;
  const read = (p: string) => parseCsv(fs.readFileSync(p, "utf8"));
  const sheets: ExtSheet[] = fs.readdirSync(tdir).filter((f) => /^\d-.*\.csv$/.test(f)).sort().map((f) => {
    const key = f.replace(/\.csv$/, "");
    return { file: f, title: TITLES[key] ?? key, columns: read(path.join(tdir, f)).headers };
  });
  const dict = read(path.join(tdir, "data-dictionary.csv"));
  const col = (row: string[], name: string) => row[dict.headers.indexOf(name)] ?? "";
  const dictionary: ExtDictRow[] = dict.rows.map(({ cells: r }) => ({
    sheet: col(r, "sheet"), column: col(r, "column or fact"), identifier: col(r, "codex identifier"), item: col(r, "codex item"),
    meaning: col(r, "meaning"), type: col(r, "type"), allowed: col(r, "allowed values"), always: col(r, "always needed"),
    neededFor: col(r, "needed for"), blank: col(r, "blank means"),
  }));
  const hh = read(path.join(edir, "1-households.csv"));
  const hcol = (r: string[], n: string) => r[hh.headers.indexOf(n)] ?? "";
  const rep = read(path.join(edir, "report.csv"));
  const example: ExtExample = {
    cases: hh.rows.map(({ cells: r }) => ({ id: hcol(r, "case"), description: hcol(r, "description"), date: hcol(r, "determination date") })),
    report: rep.rows.map(({ cells: r }) => Object.fromEntries(rep.headers.map((h, i) => [h, r[i] ?? ""]))),
  };
  // The guide's privacy bullets, as plain text.
  const guide = fs.readFileSync(path.join(root, "docs/external-check.md"), "utf8");
  const sec = guide.split(/\n## /).find((s) => s.startsWith("Privacy")) ?? "";
  const privacy = sec.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2).replace(/\*\*/g, ""));
  return { sheets, dictionary, example, privacy };
}
