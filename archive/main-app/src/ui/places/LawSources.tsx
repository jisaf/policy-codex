/* Law › Sources and Documents: every excerpt the items cite (word search,
 * kind, unverified), one excerpt's page, the documents, and one document's
 * full text opened at a passage: `#/<vol>/law/doc/D-n?at=S-n` scrolls to the
 * excerpt and highlights the whole passage, every paragraph of it (Blind B;
 * the App highlighted only the first). */
import { IdSmall, UnverifiedBadge } from "../kit";
import { useSignal } from "@preact/signals";
import { useLayoutEffect } from "preact/hooks";
import type { Source } from "../../ledger/markdown";
import {
  DOCUMENT_KINDS, documentFilePath, fetchDocumentText, nextDocumentId, parseDocuments,
  stringifyDocuments, type DocumentKind, type DocumentMeta,
} from "../../ledger/documents";
import type { LoadedVolume } from "../../ledger/load";
import { fileEntries } from "../../changes/types";
import { excerptsOfDocument, itemsCitingExcerpt } from "../counts";
import { formatDate } from "../present";
import { EXCERPT_KIND_LABEL, excerptKind, isUnverified, type ExcerptKind } from "../provenance";
import { buildHash } from "../router";
import {
  changeSetSig, ledgerSource, modeSig, navigate, openEditorForDocument, putFileChange, trayOpenSig,
} from "../state";
import type { ViewContext } from "../views/context";
import { docHref, excerptHref, itemHref, ProgramTags } from "./questionParts";

export type FetchText = (path: string) => Promise<string>;

// ---- finding a passage in a document

/** The paragraphs of a document's text, as the page lays them out. */
export function documentParagraphs(text: string): string[] {
  return text.split(/\n{2,}/).map((p) => p.trimEnd()).filter((p) => p.trim() !== "");
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[*_`>#]/g, "").replace(/[‘’]/g, "'")
    .replace(/[“”]/g, "\"").replace(/\s+/g, " ").trim();
}

/** The paragraph an excerpt was quoted from: the first whose text contains
 *  the excerpt's opening words (shortening the probe until one does), or -1
 *  when none does (an unverified excerpt, or a document whose text differs). */
export function findExcerptParagraph(paras: readonly string[], excerpt: string): number {
  const target = norm(excerpt);
  if (!target) return -1;
  const flat = paras.map(norm);
  for (const len of [160, 100, 60, 35]) {
    const probe = target.slice(0, len);
    if (probe.length < Math.min(len, target.length)) continue;
    const at = flat.findIndex((p) => p.includes(probe));
    if (at >= 0) return at;
  }
  // An excerpt that runs a heading into its first paragraph: try its own
  // lines, longest first.
  const lines = excerpt.split("\n").map(norm).filter((l) => l.length >= 30)
    .sort((a, b) => b.length - a.length);
  for (const l of lines) {
    const probe = l.slice(0, 60);
    const at = flat.findIndex((p) => p.includes(probe));
    if (at >= 0) return at;
  }
  return -1;
}

/** The whole passage an excerpt was quoted from: its first paragraph, then
 *  every following paragraph the excerpt's words contain (a short one, such
 *  as "(2)", only when a longer one after it is contained too). Null when the
 *  excerpt cannot be found. */
export function findExcerptRange(paras: readonly string[], excerpt: string): { start: number; end: number } | null {
  const start = findExcerptParagraph(paras, excerpt);
  if (start < 0) return null;
  const target = norm(excerpt);
  // A heading the excerpt runs into its first paragraph is part of it too.
  let first = start;
  while (first > 0 && start - first < 3) {
    const p = norm(paras[first - 1]);
    if (p.length < 8 || !target.startsWith(p.slice(0, 60))) break;
    first--;
  }
  let end = start;
  for (let i = start + 1; i < paras.length && i <= start + 400; i++) {
    const p = norm(paras[i]);
    if (!p) continue;
    if (!target.includes(p.length > 80 ? p.slice(0, 80) : p)) break;
    // A short paragraph ("(2)") counts only once a longer one after it does.
    if (p.length >= 12) end = i;
  }
  return { start: first, end };
}

// ---- small pieces

function KindTag({ s, vol }: { s: Source; vol: LoadedVolume }) {
  return <span class="tag excerpt-kind">{EXCERPT_KIND_LABEL[excerptKind(s, vol.documents)]}</span>;
}

function CitedBy({ ctx, id }: { ctx: ViewContext; id: string }) {
  const items = itemsCitingExcerpt(ctx.engine, id);
  if (!items.length) return <p class="small muted cited-by">No item cites it.</p>;
  return (
    <p class="small cited-by">
      <span class="muted">Cited by {items.length} {items.length === 1 ? "item" : "items"}: </span>
      {items.map((it, i) => <span key={it.id}>{i > 0 && " · "}<a href={itemHref(ctx.route, it.id)}>{it.name}</a></span>)}
    </p>
  );
}

const KINDS: ExcerptKind[] = ["statute", "regulation", "memo", "guidance", "web page"];

/** Whether every word of the query is in the excerpt's id, title, citation
 *  or text (a word match, not a phrase: Blind B's phrase-only search missed). */
export function excerptMatches(s: Source, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = `${s.id} ${s.title} ${s.citation} ${s.text}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

const PAGE = 50;

// ---- Sources: every excerpt

export function LawSources({ ctx }: { ctx: ViewContext }) {
  const { vol, route: r } = ctx;
  const p = r.params;
  const kind = KINDS.includes(p.kind as ExcerptKind) ? p.kind as ExcerptKind : null;
  const onlyUnverified = p.unverified === "1";
  const shown = useSignal(PAGE);
  const set = (patch: Record<string, string>) => {
    const params = { ...p, ...patch };
    for (const k of Object.keys(params)) if (params[k] === "") delete params[k];
    shown.value = PAGE;
    navigate({ params });
  };
  const hits = vol.sources.filter((s) => excerptMatches(s, p.q ?? "")
    && (!kind || excerptKind(s, vol.documents) === kind)
    && (!onlyUnverified || isUnverified(s)));
  return (
    <>
      <form class="qfilters" role="search" aria-label="Find an excerpt" onSubmit={(ev) => ev.preventDefault()}>
        <label class="words">Words
          <input
            type="search" value={p.q ?? ""} placeholder={'e.g. "273.9" or "over 65"'}
            onInput={(ev) => set({ q: (ev.target as HTMLInputElement).value })}
          />
        </label>
        <label>Kind of text
          <select value={kind ?? ""} onChange={(ev) => set({ kind: (ev.target as HTMLSelectElement).value })}>
            <option value="">Any</option>
            {KINDS.map((k) => <option key={k} value={k}>{EXCERPT_KIND_LABEL[k]}</option>)}
          </select>
        </label>
        <label class="check">
          <input type="checkbox" checked={onlyUnverified} onChange={(ev) => set({ unverified: (ev.target as HTMLInputElement).checked ? "1" : "" })} />
          Unverified only
        </label>
      </form>
      <p class="qsummary" aria-live="polite"><b>{hits.length.toLocaleString("en-US")}</b> of {vol.sources.length.toLocaleString("en-US")} excerpts.</p>
      <ul class="plain excerptlist">
        {hits.slice(0, shown.value).map((s) => {
          const doc = s.document ? vol.documents.find((d) => d.id === s.document) : undefined;
          return (
            <li key={s.id} data-excerpt={s.id}>
              <a href={excerptHref(r, s.id)}>{s.title || s.citation}</a>{" "}
              <KindTag s={s} vol={vol} />
              {isUnverified(s) && <> <UnverifiedBadge of="excerpt" /></>}{" "}
              <small class="mono muted">{s.id}</small>
              {doc && <div class="small muted">in <a href={docHref(r, doc.id, s.id)}>{doc.title}</a></div>}
            </li>
          );
        })}
      </ul>
      {hits.length > shown.value && (
        <button type="button" class="btn" onClick={() => { shown.value += PAGE * 4; }}>
          Show more ({(hits.length - shown.value).toLocaleString("en-US")} left)
        </button>
      )}
    </>
  );
}

// ---- one excerpt

export function LawExcerptPage({ ctx, id }: { ctx: ViewContext; id: string }) {
  const { vol, route: r } = ctx;
  const s = vol.sources.find((x) => x.id === id);
  if (!s) return <p class="status bad">No excerpt {id} in this volume.</p>;
  const doc = s.document ? vol.documents.find((d) => d.id === s.document) : undefined;
  return (
    <section class="view place law law-excerpt" data-excerpt={s.id}>
      <div class="placehead" data-place="law">
        <p class="eyebrow">An excerpt of the law</p>
        <h1>{s.title || s.citation}</h1>
        <p class="meta"><KindTag s={s} vol={vol} /> {isUnverified(s) && <UnverifiedBadge of="excerpt" />} <IdSmall id={s.id} /></p>
        <p class="muted">{s.citation}</p>
      </div>
      {isUnverified(s) && (
        <p class="warnbox">
          <b>This is not a quotation.</b> Its text could not be fetched from the document; the figures were supplied
          by hand. Nothing resting on it can leave Draft until the real text replaces it.
        </p>
      )}
      <blockquote class="statute-quote full">{s.text}</blockquote>
      {doc && (
        <p><a class="btn" href={docHref(r, doc.id, s.id)}>Read it in the full document</a> <span class="muted">{doc.title}</span></p>
      )}
      <h2>Items that cite it</h2>
      <ul class="plain">
        {itemsCitingExcerpt(ctx.engine, s.id).map((it) => (
          <li key={it.id}><a href={itemHref(r, it.id)}>{it.name}</a> <ProgramTags programs={[it.program]} /> <small class="mono muted">{it.id}</small></li>
        ))}
      </ul>
      {itemsCitingExcerpt(ctx.engine, s.id).length === 0 && <p class="muted">No item cites it.</p>}
    </section>
  );
}

// ---- documents

/** Metadata plus pasted text becomes two file entries: `documents.yaml` with
 *  the new document appended, and the document's own text file. Nothing is
 *  written until the steward sends the change from the tray. */
function ProposeDocument({ vol }: { vol: LoadedVolume }) {
  const title = useSignal("");
  const kind = useSignal<DocumentKind>("guidance");
  const citation = useSignal("");
  const url = useSignal("");
  const date = useSignal("");
  const text = useSignal("");
  const staged = useSignal("");
  // A second proposed document is appended to the list the tray already
  // holds, so two documents staged in a row get distinct ids.
  const metaPath = `${vol.path}/documents.yaml`;
  const staging = fileEntries(changeSetSig.value).find((f) => f.path === metaPath);
  const known = staging?.after ? parseDocuments(staging.after) : vol.documents;
  const id = nextDocumentId(known);
  const ready = title.value.trim() !== "" && citation.value.trim() !== "" && text.value.trim() !== "";
  const stage = () => {
    const doc: DocumentMeta = {
      id, title: title.value.trim(), kind: kind.value, citation: citation.value.trim(),
      ...(url.value.trim() ? { url: url.value.trim() } : {}),
      file: `documents/${id}.md`,
      ...(date.value.trim() ? { date: date.value.trim() } : {}),
    };
    putFileChange({
      path: metaPath, before: stringifyDocuments(vol.documents), after: stringifyDocuments([...known, doc]),
      label: `documents.yaml (${id} ${doc.title})`,
    });
    putFileChange({ path: documentFilePath(vol.path, doc), before: null, after: text.value.replace(/\n*$/, "\n"), label: `${id} ${doc.title}` });
    staged.value = id;
  };
  const field = (label: string, name: string, sig: { value: string }, wide = false, type = "text") => (
    <label class={wide ? "wide" : undefined}>
      {label}
      <input data-field={name} type={type} value={sig.value} onInput={(e) => { sig.value = (e.target as HTMLInputElement).value; }} />
    </label>
  );
  return (
    <details class="newdoc">
      <summary>Propose new document</summary>
      <p class="muted">Its details and the pasted text are staged in the change tray as two files.</p>
      <div class="form">
        {field("Title", "title", title, true)}
        <label>
          Kind
          <select data-field="kind" value={kind.value} onChange={(e) => { kind.value = (e.target as HTMLSelectElement).value as DocumentKind; }}>
            {DOCUMENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        {field("Citation", "citation", citation)}
        {field("URL", "url", url)}
        {field("Date", "date", date, false, "date")}
        <label class="wide">
          Text
          <textarea data-field="text" rows={10} value={text.value} onInput={(e) => { text.value = (e.target as HTMLTextAreaElement).value; }} />
        </label>
      </div>
      <div class="actions">
        <button class="btn stage-document" disabled={!ready} onClick={stage}>Stage {id} to the tray</button>
        {!ready && <span class="muted">Title, citation, and text are required.</span>}
        {staged.value && (
          <span class="ok">
            {staged.value} staged as two files.{" "}
            <button class="linkish" onClick={() => { trayOpenSig.value = true; }}>Open the tray</button>
          </span>
        )}
      </div>
    </details>
  );
}

export function LawDocuments({ ctx }: { ctx: ViewContext }) {
  const { vol, route: r } = ctx;
  const kind = (DOCUMENT_KINDS as readonly string[]).includes(r.params.kind) ? r.params.kind : null;
  const q = (r.params.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const docs = vol.documents.filter((d) => (!kind || d.kind === kind)
    && q.every((w) => `${d.id} ${d.title} ${d.citation}`.toLowerCase().includes(w)));
  const set = (patch: Record<string, string>) => {
    const params = { ...r.params, ...patch };
    for (const k of Object.keys(params)) if (params[k] === "") delete params[k];
    navigate({ params });
  };
  return (
    <>
      <form class="qfilters" role="search" aria-label="Find a document" onSubmit={(ev) => ev.preventDefault()}>
        <label class="words">Words
          <input type="search" value={r.params.q ?? ""} placeholder="title or citation, e.g. 7 CFR 273" onInput={(ev) => set({ q: (ev.target as HTMLInputElement).value })} />
        </label>
        <label>Kind
          <select value={kind ?? ""} onChange={(ev) => set({ kind: (ev.target as HTMLSelectElement).value })}>
            <option value="">Any</option>
            {DOCUMENT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
      </form>
      <p class="qsummary"><b>{docs.length}</b> of {vol.documents.length} documents.</p>
      <ul class="plain doclist">
        {docs.map((d) => (
          <li key={d.id} data-document={d.id}>
            <a href={docHref(r, d.id)}>{d.title}</a>{" "}
            <span class="tag">{d.kind}</span> <small class="mono muted">{d.id}</small>
            <div class="small muted">{d.citation} · {excerptsOfDocument(vol.sources, d.id).length} excerpts</div>
          </li>
        ))}
      </ul>
      {modeSig.value === "edit" && <ProposeDocument vol={vol} />}
    </>
  );
}

// ---- one document, open at a passage

/** Past this many paragraphs a document is shown around its passage first. */
const LONG = 1500;

export function LawDocumentPage({ ctx, id, fetchText }: { ctx: ViewContext; id: string; fetchText?: FetchText }) {
  const { vol, route: r } = ctx;
  const doc = vol.documents.find((d) => d.id === id);
  const text = useSignal<string | null>(null);
  const error = useSignal("");
  const whole = useSignal(false);
  const path = doc ? documentFilePath(vol.path, doc) : "";
  // The fetch starts as soon as the page commits, never a blank frame.
  useLayoutEffect(() => {
    if (!doc) return;
    let live = true;
    text.value = null;
    error.value = "";
    whole.value = false;
    const read = fetchText ?? ((p: string) => fetchDocumentText(ledgerSource(), p));
    read(path).then(
      (t) => { if (live) text.value = t; },
      (e: Error) => { if (live) error.value = e.message; },
    );
    return () => { live = false; };
  }, [path]);

  const at = r.params.at ?? r.params.excerpt ?? null;
  const target = at ? vol.sources.find((s) => s.id === at) : undefined;
  const paras = text.value !== null ? documentParagraphs(text.value) : [];
  const range = target && paras.length ? findExcerptRange(paras, target.text) : null;

  useLayoutEffect(() => {
    if (!range) return;
    const el = document.getElementById("passage");
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "center" });
  }, [id, at, text.value !== null, range?.start]);

  if (!doc) return <p class="status bad">No document {id} in this volume.</p>;
  const excerpts = excerptsOfDocument(vol.sources, doc.id);
  const long = paras.length > LONG && !whole.value;
  const from = long ? Math.max(0, (range?.start ?? 0) - 30) : 0;
  const to = long ? Math.min(paras.length, (range?.end ?? 0) + 150) : paras.length;
  return (
    <section class="view place law law-document" data-document={doc.id}>
      <div class="placehead" data-place="law">
        <p class="eyebrow"><span class="tag">{doc.kind}</span> {doc.citation} <small class="mono muted">{doc.id}</small></p>
        <h1>{doc.title}</h1>
        <p class="small muted">
          {doc.url && <><a href={doc.url} target="_blank" rel="noreferrer">Official page</a> · </>}
          {doc.date && <>dated or retrieved {formatDate(doc.date)} · </>}
          the copy below was kept with the codex without editorial change
        </p>
        {modeSig.value === "edit" && (
          <button class="btn draft-from-document" onClick={() => openEditorForDocument(doc.id)}>Draft from this document</button>
        )}
      </div>

      {target && text.value !== null && (
        <div class={`notice${range ? "" : " not-found"}`} role="note">
          {range
            ? <p>Showing <a href={excerptHref(r, target.id)}>{target.title || target.citation}</a> in place, highlighted below{range.end > range.start ? ` (${range.end - range.start + 1} paragraphs)` : ""}.</p>
            : (
              <>
                <p>
                  {target.id}'s words could not be found in this copy{isUnverified(target) ? " (it is not a quotation)" : ""}. It reads:
                </p>
                <blockquote class="statute-quote">{target.text}</blockquote>
              </>
            )}
          <CitedBy ctx={ctx} id={target.id} />
        </div>
      )}

      <details class="docexcerpts" open={!target}>
        <summary>Excerpts the codex quotes from it ({excerpts.length})</summary>
        <ul class="plain">
          {excerpts.map((s) => (
            <li key={s.id} id={s.id} class={at === s.id ? "on" : undefined}>
              <a href={docHref(r, doc.id, s.id)}>{s.title || s.citation}</a>{" "}
              {isUnverified(s) && <UnverifiedBadge of="excerpt" />} <small class="mono muted">{s.id}</small>
            </li>
          ))}
        </ul>
      </details>

      <h2>Full text</h2>
      {error.value
        ? <p class="status bad">{error.value}</p>
        : text.value === null
          ? <p class="status">Loading the text…</p>
          : (
            <>
              {long && (
                <p class="small muted">
                  A long document ({paras.length.toLocaleString("en-US")} paragraphs): showing the part around the passage.{" "}
                  <button type="button" class="btn small" onClick={() => { whole.value = true; }}>Show the whole document</button>
                </p>
              )}
              <div class="doctext">
                {paras.slice(from, to).map((p, k) => {
                  const i = from + k;
                  const hit = range !== null && i >= range.start && i <= range.end;
                  return (
                    <pre
                      key={i} id={range && i === range.start ? "passage" : undefined}
                      class={`statute${hit ? " on hit" : ""}`} data-para={i}
                    >{p}</pre>
                  );
                })}
              </div>
            </>
          )}
      <p><a href={buildHash({ ...r, view: "law", arg: "doc", params: {} })}>All documents</a></p>
    </section>
  );
}
