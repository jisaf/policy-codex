export interface Source {
  id: string;
  title: string;
  citation: string;
  text: string;
  /** The document this excerpt was taken from (`D-n`), when sources.md names
   *  one. Excerpts written before the documents library are undefined. */
  document?: string;
}
export interface OpenQuestion { id: string; title: string; body: string; items: string[] }

const SOURCE_HEAD = /^### (S\d+)\.\s*(.*)$/;
/** `Document: D-n` directly under an excerpt heading names its document. */
const SOURCE_DOCUMENT = /^Document:\s*(D-\d+)$/;
const QUESTION_HEAD = /^### (OQ-\d+)\.?\s+(.*)$/;

export function parseSources(md: string): Source[] {
  const out: Source[] = [];
  let cur: Source | null = null;
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\r$/, "");
    const m = SOURCE_HEAD.exec(line.trim());
    if (m) {
      cur = { id: m[1], title: m[2].trim(), citation: "", text: "" };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    const d = SOURCE_DOCUMENT.exec(line.trim());
    if (d) {
      cur.document = d[1];
    } else if (line.startsWith(">")) {
      cur.text += line.slice(1).trim() + "\n";
    } else if (line.trim() && !cur.citation && !line.startsWith("#")) {
      cur.citation = line.trim();
    }
  }
  for (const s of out) s.text = s.text.trimEnd();
  return out;
}

export function parseOpenQuestions(md: string): OpenQuestion[] {
  const out: OpenQuestion[] = [];
  let cur: OpenQuestion | null = null;
  const body: string[] = [];
  const flush = () => {
    if (!cur) return;
    cur.body = body.join("\n").trim();
    const m = /Items:\s*([^.\n]*)/.exec(cur.body);
    cur.items = m
      ? m[1].split(",").map((x) => x.trim()).filter((x) => /^[A-Za-z]+-\d+$/.test(x))
      : [];
    body.length = 0;
  };
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\r$/, "");
    const m = QUESTION_HEAD.exec(line.trim());
    if (m) {
      flush();
      cur = { id: m[1], title: m[2].trim(), body: "", items: [] };
      out.push(cur);
      continue;
    }
    if (cur) {
      if (line.startsWith("#")) { flush(); cur = null; continue; }
      body.push(line);
    }
  }
  flush();
  return out;
}

export function sourceTitleMap(sources: readonly Source[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of sources) out[s.id] = s.title;
  return out;
}

/** The next free `S-n`, so an excerpt appended by the AI panel never collides
 *  with one already in sources.md. */
export function nextSourceId(sources: readonly Source[]): string {
  let max = 0;
  for (const s of sources) {
    const m = /^S(\d+)$/.exec(s.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `S${max + 1}`;
}

/** Appends one excerpt per `{citation, text}` pair as a `### S<n>. <citation>`
 *  section with a `Document: D-n` line, in the exact shape `parseSources`
 *  reads back, starting at `startId`. Nothing else in the file is touched. */
export function appendExcerpts(
  sourcesMd: string, docId: string, startId: string,
  excerpts: readonly { citation: string; text: string }[],
): string {
  const m = /^S(\d+)$/.exec(startId);
  let n = m ? Number(m[1]) : 1;
  let out = sourcesMd.replace(/\n*$/, "\n");
  for (const ex of excerpts) {
    const id = `S${n++}`;
    const citation = ex.citation.trim();
    const quoted = ex.text.trim().split("\n").map((l) => `> ${l}`).join("\n");
    out += `\n### ${id}. ${citation}\n\nDocument: ${docId}\n\n${citation}\n\n${quoted}\n`;
  }
  return out;
}
