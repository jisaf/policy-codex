/** A tiny, dependency-free renderer for the handful of markdown constructs
 *  `src/export/handoff.ts` actually emits: headings, paragraphs, bullet
 *  lists, inline code spans, fenced code blocks, and tables. Not a general
 *  markdown engine — anything else in the source passes through as a plain
 *  paragraph. All text is HTML-escaped; only the tags this file writes are
 *  ever produced. */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escapes, then turns `code` spans into `<code>`. */
function inline(s: string): string {
  return escapeHtml(s).replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);
}

const isTableRow = (line: string) => line.trim().startsWith("|") && line.trim().endsWith("|");
const tableCells = (line: string) => line.trim().slice(1, -1).split("|").map((c) => c.trim());
const isSeparatorRow = (cells: string[]) => cells.every((c) => /^:?-+:?$/.test(c));

export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    if (line.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { body.push(lines[i]); i++; }
      i++; // the closing fence
      out.push(`<pre><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (isTableRow(line)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(tableCells(lines[i])); i++; }
      const [header, ...rest] = rows;
      const body = rest.length && isSeparatorRow(rest[0]) ? rest.slice(1) : rest;
      out.push(
        "<table><thead><tr>" +
          header.map((c) => `<th>${inline(c)}</th>`).join("") +
          "</tr></thead><tbody>" +
          body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("") +
          "</tbody></table>",
      );
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, ""));
        i++;
      }
      out.push(`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ul>`);
      continue;
    }

    out.push(`<p>${inline(line)}</p>`);
    i++;
  }
  return out.join("\n");
}
