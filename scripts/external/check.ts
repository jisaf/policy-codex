/* Runs external sample cases through the engine and writes the comparison
 * report (docs/external-check.md).
 *   npm run external:check -- <folder or cases yaml> [--out <dir>] [--title <text>] [--volume co]
 * A folder of filled template CSVs is converted first (as external:import
 * does, writing <folder>/cases.yaml); a folder holding only cases.yaml, or a
 * YAML file, is run as it is. Writes report.md and report.csv to the folder
 * (or the YAML's folder, or --out). Differences are the point of the check,
 * so they do not fail it; an import issue does (exit 1). */
import fs from "node:fs";
import path from "node:path";
import { writeCsv } from "../../src/external/csv";
import { formatIssue, importTemplate, type ExternalCase } from "../../src/external/importer";
import { casesYaml, loadContext, readCasesYaml, readFolder } from "../../src/external/load";
import { reportCsv, reportMarkdown } from "../../src/external/report";
import { runExternal } from "../../src/external/runner";
import { sheetOfFile } from "../../src/external/template";
import { gitShaWithDirtySuffix } from "../git-sha";
import { parseExternalArgs } from "./args";

const root = path.resolve(import.meta.dirname, "../..");
const args = parseExternalArgs(process.argv.slice(2));
const target = args.positional[0];
if (!target || !fs.existsSync(target)) {
  console.error("usage: npm run external:check -- <folder or cases yaml> [--out <dir>] [--title <text>] [--volume co]");
  process.exit(2);
}
const ctx = loadContext(root, args.volume);
let cases: ExternalCase[];
let dir: string;
if (fs.statSync(target).isDirectory()) {
  dir = target;
  const files = readFolder(dir);
  if (Object.keys(files).some((f) => sheetOfFile(f))) {
    const res = importTemplate(files, ctx.dict);
    if (res.issues.length) {
      for (const i of res.issues) console.log(formatIssue(i));
      fs.writeFileSync(path.join(dir, "import-issues.csv"), writeCsv(["file", "row", "column", "value", "problem"],
        res.issues.map((i) => [i.file, i.row ?? "", i.column ?? "", i.value, i.message])));
      console.log(`\n${res.issues.length} import issue${res.issues.length === 1 ? "" : "s"}; nothing run.`);
      process.exit(1);
    }
    cases = res.cases;
    fs.writeFileSync(path.join(dir, "cases.yaml"), casesYaml(cases, path.basename(path.resolve(dir)), args.volume));
  } else if (fs.existsSync(path.join(dir, "cases.yaml"))) {
    cases = readCasesYaml(path.join(dir, "cases.yaml"));
  } else {
    console.error(`${dir} holds neither template CSVs nor cases.yaml`);
    process.exit(2);
  }
} else {
  dir = path.dirname(target);
  cases = readCasesYaml(target);
}
const out = path.resolve(args.out ?? dir);
fs.mkdirSync(out, { recursive: true });
const rows = runExternal(ctx.ix, cases, ctx.refs);
const sha = gitShaWithDirtySuffix(root);
const meta = {
  title: args.title ?? path.basename(path.resolve(dir)),
  volume: args.volume,
  commit: sha.replace(/^([0-9a-f]{12})[0-9a-f]*/, "$1"),
  date: new Date().toISOString().slice(0, 10),
  persons: Object.fromEntries(cases.map((c) => [c.id, c.external?.persons ?? {}])),
  caseNotes: Object.fromEntries(cases.map((c) => [c.id, (c.external?.dob_from_age ?? []).map((p) =>
    `${c.external.persons[p] ?? p}: date of birth set from the age given (six months before the birthday of that age).`)])),
};
fs.writeFileSync(path.join(out, "report.md"), reportMarkdown(rows, meta));
fs.writeFileSync(path.join(out, "report.csv"), reportCsv(rows, meta));
const differ = rows.filter((r) => r.status === "differ").length;
console.log(
  `${cases.length} case${cases.length === 1 ? "" : "s"}, ${rows.length} expected answers: ` +
    `${rows.length - differ} match, ${differ} differ. Report: ${path.relative(process.cwd(), path.join(out, "report.md"))} and report.csv`,
);
