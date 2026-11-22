/* Where a figure or rule comes from, as a lawyer reads it: what kind of text
 * each excerpt is (statute, regulation, memo, web page), whether it is a
 * verified quotation, and which results rest on one that is not. */
import type { Engine } from "../engine/engine";
import type { TraceNode } from "../engine/explain";
import type { Item } from "../engine/types";
import type { DocumentMeta } from "../ledger/documents";
import type { Source } from "../ledger/markdown";

export type ExcerptKind = "statute" | "regulation" | "memo" | "guidance" | "web page";

export const EXCERPT_KIND_LABEL: Record<ExcerptKind, string> = {
  statute: "Statute",
  regulation: "Regulation",
  memo: "Memo",
  guidance: "Guidance",
  "web page": "Web page",
};

/** What kind of text an excerpt is: its document's kind when it names one
 *  (guidance published as a web page reads "web page"), else a reading of
 *  its citation. */
export function excerptKind(src: Pick<Source, "citation" | "document">, docs: readonly DocumentMeta[]): ExcerptKind {
  const doc = src.document ? docs.find((d) => d.id === src.document) : undefined;
  if (doc) {
    if (doc.kind === "guidance") return doc.url && !/\.pdf(\?|$)/i.test(doc.url) ? "web page" : "guidance";
    return doc.kind;
  }
  const c = src.citation;
  if (/operational memo|\bOM \d|\bmemo\b|letter|bulletin|\bSMDL\b|\bCIB\b|\bSHO\b/i.test(c)) return "memo";
  if (/\bC\.?F\.?R\b|\bCCR\b|\d+ FR \d+|Code of Colorado Regulations|\bregulation\b/i.test(c)) return "regulation";
  if (/U\.?S\.?C\.?|C\.R\.S\.|Pub\. ?L\.|\bStat\.|\bAct\b|statute/i.test(c)) return "statute";
  if (/https?:\/\//.test(c)) return "web page";
  return "guidance";
}

export function isUnverified(src: Pick<Source, "verification">): boolean {
  return src.verification === "unverified";
}

/** The ids of every excerpt marked unverified. */
export function unverifiedIds(sources: readonly Source[]): Set<string> {
  return new Set(sources.filter(isUnverified).map((s) => s.id));
}

/** What a result rests on that is unverified: counts.ts `unverifiedUpstream`
 *  (the one definition of "unverified upstream"). */

/** The same, for one evaluated value: every node in its trace (the value
 *  itself included) whose item cites an unverified excerpt, once each. */
export function unverifiedInTrace(node: TraceNode, unverified: ReadonlySet<string>): Array<{ identifier: string; name: string; sources: string[] }> {
  if (!unverified.size) return [];
  const out: Array<{ identifier: string; name: string; sources: string[] }> = [];
  const seen = new Set<string>();
  const walk = (n: TraceNode) => {
    if (!seen.has(n.identifier)) {
      seen.add(n.identifier);
      const bad = n.sources.filter((s) => unverified.has(s));
      if (bad.length) out.push({ identifier: n.identifier, name: n.name, sources: bad });
    }
    for (const k of n.children) walk(k);
  };
  walk(node);
  return out;
}
