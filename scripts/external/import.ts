/* Converts a filled intake template into cases (docs/external-check.md).
 *   npm run external:import -- <folder> [--out <file>] [--volume co]
 * Writes <folder>/cases.yaml (or --out). Every value that does not map is
 * printed with its file, row and column, and written to
 * <folder>/import-issues.csv; then nothing is converted and the exit code is 1.
 * The cases never join the stored households (volumes/<volume>/tests/cases.yaml). */
import fs from "node:fs";
import path from "node:path";
import { writeCsv } from "../../src/external/csv";
import { formatIssue, importTemplate } from "../../src/external/importer";
import { casesYaml, loadContext, readFolder } from "../../src/external/load";
import { parseExternalArgs } from "./args";

const root = path.resolve(import.meta.dirname, "../..");
const args = parseExternalArgs(process.argv.slice(2));
const dir = args.positional[0];
if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error("usage: npm run external:import -- <folder of filled template CSVs> [--out <file>] [--volume co]");
  process.exit(2);
}
const { dict } = loadContext(root, args.volume);
const res = importTemplate(readFolder(dir), dict);
const issuesFile = path.join(dir, "import-issues.csv");
const out = path.resolve(args.out ?? path.join(dir, "cases.yaml"));
if (res.issues.length) {
  for (const i of res.issues) console.log(formatIssue(i));
  fs.writeFileSync(issuesFile, writeCsv(["file", "row", "column", "value", "problem"],
    res.issues.map((i) => [i.file, i.row ?? "", i.column ?? "", i.value, i.message])));
  if (!args.out && fs.existsSync(out)) fs.rmSync(out);
  console.log(
    `\n${res.issues.length} issue${res.issues.length === 1 ? "" : "s"}; nothing converted. ` +
      `Listed in ${path.relative(process.cwd(), issuesFile)}.` +
      (res.refusedIdentifiers ? " A column looks like a personal identifier: remove it and send de-identified cases only." : ""),
  );
  process.exit(1);
}
if (fs.existsSync(issuesFile)) fs.rmSync(issuesFile);
fs.writeFileSync(out, casesYaml(res.cases, path.basename(path.resolve(dir)), args.volume));
const answers = res.cases.reduce((n, c) => n + c.external.expected.length, 0);
console.log(`converted ${res.cases.length} case${res.cases.length === 1 ? "" : "s"} with ${answers} expected answers to ${path.relative(process.cwd(), out)}`);
