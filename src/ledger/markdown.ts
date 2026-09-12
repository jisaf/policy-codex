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
