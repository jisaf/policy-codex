/* CSV reading and writing for the external sample check (docs/external-check.md).
 * RFC 4180: fields separated by commas, a field holding a comma, a quote or a
 * line break is quoted, and a quote inside it is doubled. A spreadsheet's
 * byte-order mark and CRLF line ends are accepted. */

export interface CsvTable {
  /** The heading row, trimmed. */
  headers: string[];
  /** Each data row with its spreadsheet row number (the heading is row 1). */
  rows: Array<{ row: number; cells: string[] }>;
}

/** Parses CSV text into records of fields. */
export function parseCsvRecords(text: string): string[][] {
  const s = text.replace(/^﻿/, "");
  const out: string[][] = [];
  let rec: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === "") { quoted = true; i++; continue; }
    if (ch === ",") { rec.push(field); field = ""; i++; continue; }
    if (ch === "\r" || ch === "\n") {
      rec.push(field); out.push(rec); rec = []; field = "";
      if (ch === "\r" && s[i + 1] === "\n") i++;
      i++; continue;
    }
    field += ch; i++;
  }
  if (field !== "" || rec.length) { rec.push(field); out.push(rec); }
  return out;
}

/** A sheet: its heading row and its data rows. Rows with every cell blank are
 *  skipped, as are rows whose first cell starts with `#` (a comment). */
export function parseCsv(text: string): CsvTable {
  const recs = parseCsvRecords(text);
  const headers = (recs[0] ?? []).map((h) => h.trim());
  const rows: CsvTable["rows"] = [];
  for (let k = 1; k < recs.length; k++) {
    const cells = recs[k];
    if (cells.every((c) => c.trim() === "")) continue;
    if ((cells[0] ?? "").trim().startsWith("#")) continue;
    rows.push({ row: k + 1, cells });
  }
  return { headers, rows };
}

function quote(v: string): string {
  return /[",\r\n]/.test(v) || /^\s|\s$/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

/** CSV text for a heading row and data rows, CRLF-free, ending in a newline. */
export function writeCsv(headers: readonly string[], rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  const line = (r: ReadonlyArray<unknown>) =>
    r.map((v) => quote(v === null || v === undefined ? "" : String(v))).join(",");
  return [line(headers), ...rows.map(line)].join("\n") + "\n";
}
