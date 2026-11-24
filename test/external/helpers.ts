/* Shared by the external sample check's tests: the Colorado volume's
 * context, and the worked example's sheets cut down to chosen cases. */
import fs from "node:fs";
import path from "node:path";
import { parseCsvRecords, writeCsv } from "../../src/external/csv";
import { loadContext, readFolder, type ExternalContext } from "../../src/external/load";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const EXAMPLE_DIR = path.join(ROOT, "external-check/example");
export const TEMPLATE_DIR = path.join(ROOT, "external-check/template");

let ctx: ExternalContext | null = null;
export function coContext(): ExternalContext {
  ctx ??= loadContext(ROOT, "co");
  return ctx;
}

/** The example's sheet files, with only the rows of the given cases. */
export function exampleSheets(...cases: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [f, text] of Object.entries(readFolder(EXAMPLE_DIR))) {
    if (!/^\d-/.test(f)) continue;
    const [head, ...rows] = parseCsvRecords(text);
    out[f] = writeCsv(head, rows.filter((r) => cases.includes(r[0])));
  }
  return out;
}

/** A sheet with one more row appended. */
export function addRow(files: Record<string, string>, file: string, row: Record<string, string>): void {
  const [head, ...rows] = parseCsvRecords(files[file]);
  rows.push(head.map((h) => row[h] ?? ""));
  files[file] = writeCsv(head, rows);
}

/** A sheet with every row's cell under `column` set where `match` holds. */
export function setCells(
  files: Record<string, string>, file: string, match: (r: Record<string, string>) => boolean, column: string, value: string,
): void {
  const [head, ...rows] = parseCsvRecords(files[file]);
  const i = head.indexOf(column);
  if (i < 0) throw new Error(`no column ${column} in ${file}`);
  for (const r of rows) {
    const rec = Object.fromEntries(head.map((h, k) => [h, r[k] ?? ""]));
    if (match(rec)) r[i] = value;
  }
  files[file] = writeCsv(head, rows);
}

/** A sheet with an extra column. */
export function addColumn(files: Record<string, string>, file: string, column: string, value: string): void {
  const [head, ...rows] = parseCsvRecords(files[file]);
  files[file] = writeCsv([...head, column], rows.map((r) => [...r, value]));
}

export const exists = (p: string) => fs.existsSync(p);
