import { useSignal } from "@preact/signals";
import { useLayoutEffect } from "preact/hooks";
import type { Engine } from "../engine/engine";
import type { Source } from "../ledger/markdown";
import {
  DOCUMENT_KINDS, documentFilePath, fetchDocumentText, nextDocumentId, parseDocuments,
  stringifyDocuments, type DocumentKind, type DocumentMeta,
} from "../ledger/documents";
import type { LoadedVolume } from "../ledger/load";
import { fileEntries } from "../changes/types";
import { buildHash, type Route } from "./router";
import { citingItems } from "./SourcesView";
import {
  changeSetSig, engineSig, ledgerSource, openEditorForDocument, putFileChange, route,
  trayOpenSig, viewEngine, volumeSig,
} from "./state";

/** The excerpts taken from one document, in sources.md order. */
export function excerptsOf(sources: readonly Source[], docId: string): Source[] {
  return sources.filter((s) => s.document === docId);
}

/** How a reader sees a body of statute: the paragraphs of the file, kept
 *  verbatim, never reflowed or interpreted. */
function Paragraphs({ text }: { text: string }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trimEnd()).filter((p) => p.trim() !== "");
  return (
    <div class="doctext">
      {paras.map((p, i) => <pre key={i} class="statute">{p}</pre>)}
    </div>
  );
}

function DocumentList(
  { vol, route: r }: { vol: LoadedVolume; route: Route },
) {
  return (
    <table class="documents grid">
      <thead>
        <tr><th>ID</th><th>Title</th><th>Kind</th><th>Citation</th><th>Excerpts</th></tr>
      </thead>
      <tbody>
        {vol.documents.map((d) => (
          <tr key={d.id}>
            <td>
              <a href={buildHash({ ...r, view: "document", arg: d.id, params: {} })}>{d.id}</a>
            </td>
            <td>{d.title}</td>
            <td>{d.kind}</td>
            <td class="citation">{d.citation}</td>
            <td>{excerptsOf(vol.sources, d.id).length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Metadata plus pasted text becomes two file entries: `documents.yaml` with
 *  the new document appended, and the document's own text file. Nothing is
 *  written until the steward presses Propose in the tray. */
function ProposeDocument({ vol }: { vol: LoadedVolume }) {
  const title = useSignal("");
  const kind = useSignal<DocumentKind>("guidance");
  const citation = useSignal("");
  const url = useSignal("");
  const date = useSignal("");
  const text = useSignal("");
  const staged = useSignal("");

  // A second proposed document is appended to the list the tray already holds,
  // so two documents staged in a row get distinct ids and both survive.
  const metaPath = `${vol.path}/documents.yaml`;
  const staging = fileEntries(changeSetSig.value).find((f) => f.path === metaPath);
  const known = staging?.after ? parseDocuments(staging.after) : vol.documents;
  const id = nextDocumentId(known);
  const ready = title.value.trim() !== "" && citation.value.trim() !== ""
    && text.value.trim() !== "";

  const stage = () => {
    const doc: DocumentMeta = {
      id,
      title: title.value.trim(),
      kind: kind.value,
      citation: citation.value.trim(),
      ...(url.value.trim() ? { url: url.value.trim() } : {}),
      file: `documents/${id}.md`,
      ...(date.value.trim() ? { date: date.value.trim() } : {}),
    };
    putFileChange({
      path: metaPath,
      before: stringifyDocuments(vol.documents),
      after: stringifyDocuments([...known, doc]),
      label: `documents.yaml (${id} ${doc.title})`,
    });
    putFileChange({
      path: documentFilePath(vol.path, doc),
      before: null,
      after: text.value.replace(/\n*$/, "\n"),
      label: `${id} ${doc.title}`,
    });
    staged.value = id;
  };

  return (
    <details class="newdoc">
      <summary>Propose new document</summary>
      <p class="muted">
        Metadata and the pasted text. Both files are staged to the tray; the
        library changes only when the pull request is merged.
      </p>
      <div class="form">
        <label class="wide">
          Title
          <input
            data-field="title" value={title.value}
            onInput={(e) => { title.value = (e.target as HTMLInputElement).value; }}
          />
        </label>
        <label>
          Kind
          <select
            data-field="kind" value={kind.value}
            onChange={(e) => { kind.value = (e.target as HTMLSelectElement).value as DocumentKind; }}
          >
            {DOCUMENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label>
          Citation
          <input
            data-field="citation" value={citation.value}
            onInput={(e) => { citation.value = (e.target as HTMLInputElement).value; }}
          />
        </label>
        <label>
          URL
          <input
            data-field="url" value={url.value}
            onInput={(e) => { url.value = (e.target as HTMLInputElement).value; }}
          />
        </label>
        <label>
          Date
          <input
            data-field="date" type="date" value={date.value}
            onInput={(e) => { date.value = (e.target as HTMLInputElement).value; }}
          />
        </label>
        <label class="wide">
          Text
          <textarea
            data-field="text" rows={10} value={text.value}
            onInput={(e) => { text.value = (e.target as HTMLTextAreaElement).value; }}
          />
        </label>
      </div>
      <div class="actions">
        <button class="btn stage-document" disabled={!ready} onClick={stage}>
          Stage {id} to the tray
        </button>
        {!ready && <span class="muted">Title, citation, and text are required.</span>}
        {staged.value && (
          <span class="ok">
            {staged.value} staged as two files.{" "}
            <button class="linkish" onClick={() => { trayOpenSig.value = true; }}>
              Open the tray
            </button>
          </span>
        )}
      </div>
    </details>
  );
}

function DocumentPage(
  { engine, vol, doc, route: r, fetchText }:
  {
    engine: Engine; vol: LoadedVolume; doc: DocumentMeta; route: Route;
    fetchText: (path: string) => Promise<string>;
  },
) {
  const text = useSignal<string | null>(null);
  const error = useSignal("");
  const path = documentFilePath(vol.path, doc);

  // Laid out before paint rather than after it: the fetch starts as soon as
  // the page commits, so a reader never sees a blank panel for a frame.
  useLayoutEffect(() => {
    let live = true;
    text.value = null;
    error.value = "";
    fetchText(path).then(
      (t) => { if (live) text.value = t; },
      (e: Error) => { if (live) error.value = e.message; },
    );
    return () => { live = false; };
  }, [path]);

  const excerpts = excerptsOf(vol.sources, doc.id);

  return (
    <section class="view document">
      <div class="cardhead">
        <h1>{doc.title}</h1>
        <span class="tag">{doc.id}</span>
        <span class="tag">{doc.kind}</span>
        {doc.date && <span class="tag">{doc.date}</span>}
        <span class="spacer" />
        <button class="btn draft-from-document" onClick={() => openEditorForDocument(doc.id)}>
          Draft from this document
        </button>
        <a class="btn" href={buildHash({ ...r, view: "documents", arg: null, params: {} })}>
          All documents
        </a>
      </div>
      <p class="citation">
        {doc.citation}
        {doc.url && <> — <a href={doc.url} target="_blank" rel="noreferrer">{doc.url}</a></>}
      </p>
      <p class="muted"><code>{path}</code></p>

      <h3>Text</h3>
      {error.value
        ? <p class="status bad">{error.value}</p>
        : text.value === null
          ? <p class="status">Loading the text…</p>
          : <Paragraphs text={text.value} />}

      <h3>Excerpts drawn from this document</h3>
      {excerpts.length === 0 && <p class="muted">No excerpt names this document.</p>}
      {excerpts.map((s) => {
        const citing = citingItems(engine, s.id);
        return (
          <article class="excerpt" key={s.id}>
            <h4>
              <a href={buildHash({ ...r, view: "source", arg: s.id, params: {} })}>
                {s.id}. {s.title}
              </a>
            </h4>
            <p class="citation">{s.citation}</p>
            <pre class="statute">{s.text}</pre>
            <p class="cited-by">
              <b>Cited by {citing.length} item{citing.length === 1 ? "" : "s"}:</b>{" "}
              {citing.length === 0 ? "nothing yet" : citing.map((it, i) => (
                <span key={it.id}>
                  {i > 0 && ", "}
                  <a href={buildHash({ ...r, view: "item", arg: it.id, params: {} })}>
                    {it.name}
                  </a>
                </span>
              ))}
            </p>
          </article>
        );
      })}
    </section>
  );
}

export function DocumentsView(
  { fetchText }: { fetchText?: (path: string) => Promise<string> } = {},
) {
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  const r = route.value;
  if (!engine || !vol) return <p class="status">No ledger loaded.</p>;
  const read = fetchText ?? ((p: string) => fetchDocumentText(ledgerSource(), p));

  if (r.view === "document") {
    const doc = vol.documents.find((d) => d.id === r.arg);
    if (!doc) return <p class="status bad">No document {r.arg} in this volume.</p>;
    return <DocumentPage engine={engine} vol={vol} doc={doc} route={r} fetchText={read} />;
  }

  return (
    <section class="view documents">
      <div class="cardhead">
        <h1>Documents</h1>
        <span class="tag">{vol.documents.length} documents</span>
      </div>
      <p class="muted">
        The governing texts the volume quotes. Each excerpt in Sources names the
        document it came from.
      </p>
      {vol.documents.length === 0
        ? <p class="muted">This volume has no documents.yaml.</p>
        : <DocumentList vol={vol} route={r} />}
      <ProposeDocument vol={vol} />
    </section>
  );
}
