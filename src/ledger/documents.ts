import { parse as parseYaml } from "yaml";
import { yamlScalar } from "../engine/yaml";
import type { LedgerSource } from "./source";

export const DOCUMENT_KINDS = ["statute", "regulation", "guidance", "memo"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** One governing document. The metadata lives in `documents.yaml`; the text
 *  lives in `file`, relative to the volume directory, and is fetched only when
 *  a reader opens the document. */
export interface DocumentMeta {
  id: string;
  title: string;
  kind: DocumentKind;
  citation: string;
  url?: string;
  file: string;
  date?: string;
}

const KEY_ORDER: readonly (keyof DocumentMeta)[] = [
  "id", "title", "kind", "citation", "url", "file", "date",
];

export function parseDocuments(text: string): DocumentMeta[] {
  const raw = parseYaml(text);
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new Error("documents.yaml is not a YAML sequence");
  return raw as DocumentMeta[];
}

/** The exact file body `documents.yaml` carries, so a re-serialised list that
 *  gained one document differs from the original by that document alone. */
export function stringifyDocuments(docs: readonly DocumentMeta[]): string {
  const lines: string[] = [];
  for (const d of docs) {
    const rec = d as unknown as Record<string, unknown>;
    let first = true;
    for (const key of KEY_ORDER) {
      const v = rec[key];
      if (v === undefined || v === null || v === "") continue;
      lines.push(`${first ? "- " : "  "}${key}: ${yamlScalar(v)}`);
      first = false;
    }
  }
  return lines.join("\n") + "\n";
}

/** The repo path of a document's text, given the volume it belongs to. */
export function documentFilePath(volumePath: string, doc: DocumentMeta): string {
  return `${volumePath}/${doc.file}`;
}

/** The next free `D-n`, so a proposed document never collides with one that
 *  is already in the library. */
export function nextDocumentId(docs: readonly DocumentMeta[]): string {
  let max = 0;
  for (const d of docs) {
    const m = /^D-(\d+)$/.exec(d.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `D-${max + 1}`;
}

/** Document text is fetched on demand: a volume load reads the metadata only,
 *  so opening the app does not pull every statute in the library. */
export async function fetchDocumentText(src: LedgerSource, path: string): Promise<string> {
  return await src.readText(path);
}
