/* Writes the blank intake template of the external sample check: one CSV per
 * sheet (its heading row) and the data dictionary, generated from the volume
 * (docs/external-check.md, "For whoever runs the check").
 *   npm run external:template [-- --volume co] [--out external-check/template]
 * A test (test/external/template.test.ts) fails when the committed template
 * is not what this writes. */
import fs from "node:fs";
import path from "node:path";
import { buildIndex } from "../../src/engine/ledger-index";
import { buildDictionary } from "../../src/external/dictionary";
import { templateFiles } from "../../src/external/template";
import { loadLedgerFromDisk } from "../../src/tools/check";
import { parseExternalArgs } from "./args";

const root = path.resolve(import.meta.dirname, "../..");
const args = parseExternalArgs(process.argv.slice(2));
const out = path.resolve(root, args.out ?? "external-check/template");
const led = loadLedgerFromDisk(root, args.volume);
const dict = buildDictionary(buildIndex(led.items, led.meta.relationship_roles ?? null), led.meta, led.cases);
fs.mkdirSync(out, { recursive: true });
const files = templateFiles(dict);
for (const [f, text] of Object.entries(files)) fs.writeFileSync(path.join(out, f), text);
const always = dict.facts.filter((f) => f.always).length;
console.log(
  `wrote ${Object.keys(files).length} files to ${path.relative(root, out) || "."}: ` +
    `${dict.facts.length} facts (${always} on the persons sheet), ${dict.records.length} record fields, ` +
    `${dict.results.length} results, ${dict.roles.length} relationships`,
);
