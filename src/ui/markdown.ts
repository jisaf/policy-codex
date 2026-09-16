/** A tiny, dependency-free renderer for the handful of markdown constructs
 *  `src/export/handoff.ts` actually emits: headings, paragraphs, bullet
 *  lists, inline code spans, fenced code blocks, and tables. Not a general
 *  markdown engine — anything else in the source passes through as a plain
 *  paragraph. All text is HTML-escaped; only the tags this file writes are
 *  ever produced.
 *
 *  Two renderers over one reader: `renderMarkdown` writes the HTML string,
 *  and `renderMarkdownNodes` the same document as Preact nodes, so a view can
 *  render code spans and fenced blocks through its own component — the rich
 *  tokens — rather than as flat text. */
import { h, type ComponentChildren } from "preact";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escapes, then turns `code` spans into `<code>`. */
function inline(s: string): string {
  return escapeHtml(s).replace(/`([^`]+)`/g, (_m, code: string) => `<code>${code}</code>`);
}

/** One line split into its literal stretches and its code spans, in order. */
export function inlineParts(s: string): Array<{ code: boolean; text: string }> {
  const out: Array<{ code: boolean; text: string }> = [];
  const re = /`([^`]+)`/g;
  let at = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > at) out.push({ code: false, text: s.slice(at, m.index) });
    out.push({ code: true, text: m[1] });
    at = m.index + m[0].length;
  }
  if (at < s.length) out.push({ code: false, text: s.slice(at) });
  return out;
}

const isTableRow = (line: string) => line.trim().startsWith("|") && line.trim().endsWith("|");
const tableCells = (line: string) => line.trim().slice(1, -1).split("|").map((c) => c.trim());
const isSeparatorRow = (cells: string[]) => cells.every((c) => /^:?-+:?$/.test(c));

export type MarkdownBlock =
  | { kind: "code"; text: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

/** The line walker both renderers share. */
export function readMarkdown(md: string): MarkdownBlock[] {
  const lines = md.split("\n");
  const out: MarkdownBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    if (line.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) { body.push(lines[i]); i++; }
      i++; // the closing fence
      out.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      out.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (isTableRow(line)) {
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) { rows.push(tableCells(lines[i])); i++; }
      const [header, ...rest] = rows;
      const body = rest.length && isSeparatorRow(rest[0]) ? rest.slice(1) : rest;
      out.push({ kind: "table", header, rows: body });
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, ""));
        i++;
      }
      out.push({ kind: "list", items });
      continue;
    }

    out.push({ kind: "paragraph", text: line });
    i++;
  }
  return out;
}

export function renderMarkdown(md: string): string {
  const out: string[] = [];
  for (const b of readMarkdown(md)) {
    if (b.kind === "code") {
      out.push(`<pre><code>${escapeHtml(b.text)}</code></pre>`);
    } else if (b.kind === "heading") {
      out.push(`<h${b.level}>${inline(b.text)}</h${b.level}>`);
    } else if (b.kind === "table") {
      out.push(
        "<table><thead><tr>" +
          b.header.map((c) => `<th>${inline(c)}</th>`).join("") +
          "</tr></thead><tbody>" +
          b.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("") +
          "</tbody></table>",
      );
    } else if (b.kind === "list") {
      out.push(`<ul>${b.items.map((it) => `<li>${inline(it)}</li>`).join("")}</ul>`);
    } else {
      out.push(`<p>${inline(b.text)}</p>`);
    }
  }
  return out.join("\n");
}

/** How a caller renders a code span (`block` false) or a fenced block
 *  (`block` true). */
export type CodeRenderer = (text: string, block: boolean) => ComponentChildren;

/** The same document as Preact nodes. Code spans and fenced blocks are the
 *  caller's to render; every other stretch is plain text, which Preact
 *  escapes on its own. */
export function renderMarkdownNodes(md: string, code: CodeRenderer): ComponentChildren[] {
  const parts = (s: string): ComponentChildren[] =>
    inlineParts(s).map((p) => (p.code ? code(p.text, false) : p.text));
  return readMarkdown(md).map((b, i) => {
    const key = `${b.kind}${i}`;
    if (b.kind === "code") return h("pre", { key }, h("code", null, code(b.text, true)));
    if (b.kind === "heading") return h(`h${b.level}`, { key }, parts(b.text));
    if (b.kind === "table") {
      return h("table", { key }, [
        h("thead", null, h("tr", null, b.header.map((c, j) => h("th", { key: j }, parts(c))))),
        h(
          "tbody", null,
          b.rows.map((r, j) => h("tr", { key: j }, r.map((c, k) => h("td", { key: k }, parts(c))))),
        ),
      ]);
    }
    if (b.kind === "list") {
      return h("ul", { key }, b.items.map((it, j) => h("li", { key: j }, parts(it))));
    }
    return h("p", { key }, parts(b.text));
  });
}
