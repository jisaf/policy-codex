/* The fetched source document, with one excerpt located and highlighted. */
import { D, itemsCiting } from "../data";
import { esc, html, itemLink, raw, sourceChip } from "../ui";
import type { View } from "../main";

const cache = new Map<string, string>();
// The documents' text comes in a few bundle files (scripts/build-data.ts):
// `documents.json` says which one holds each document.
let docIndex: Promise<Record<string, string>> | null = null;
const docChunks = new Map<string, Promise<Record<string, string>>>();
const getJson = (url: string): Promise<Record<string, string>> =>
  fetch(url).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
async function documentText(id: string): Promise<string> {
  docIndex ??= getJson("public/data/documents.json");
  const name = (await docIndex)[id];
  if (!name) return "";
  let chunk = docChunks.get(name);
  if (!chunk) docChunks.set(name, (chunk = getJson(`public/data/${name}`)));
  return (await chunk)[id] ?? "";
}
const norm = (s: string) => s.toLowerCase().replace(/[“”"’'`*_]/g, "").replace(/\s+/g, " ").trim();

export async function docView([id]: string[], q: URLSearchParams): Promise<View> {
  const doc = D.documents.find((d) => d.id === id);
  if (!doc) return { title: "Not found", body: html`<section class="card"><h1>No document ${id}</h1></section>` };
  let text = cache.get(id);
  if (text === undefined) {
    text = await documentText(id);
    cache.set(id, text);
  }
  const sid = q.get("s");
  const s = sid ? D.sources[sid] : undefined;
  // Snippets from the excerpt: a stretch from each of its lines.
  const snippets = (s?.excerpt ?? "").split("\n").map((l) => norm(l)).filter((l) => l.length > 24)
    .map((l) => l.slice(Math.floor(l.length / 4), Math.floor(l.length / 4) + 40));
  const paras = text.split(/\n\s*\n/);
  let marked = 0;
  const body = paras.map((p) => {
    const n = norm(p);
    const hit = snippets.length > 0 && snippets.some((sn) => n.includes(sn));
    if (hit) marked++;
    return `<p${hit ? ` class="hit"${marked === 1 ? ` id="first-hit"` : ""}` : ""}>${esc(p)}</p>`;
  }).join("");
  const sources = Object.values(D.sources).filter((x) => x.doc === id);
  return {
    title: doc.title,
    body: html`<div class="page doc">
      <p class="eyebrow">Source document ${doc.id} · ${doc.kind ?? ""}${doc.date ? ` · ${doc.date}` : ""}</p>
      <h1>${doc.title}</h1>
      <p class="sub">${doc.citation ?? ""}${doc.url ? html` · <a href="${doc.url}" target="_blank" rel="noopener">official source</a>` : ""}</p>
      ${s ? html`<div class="callout">Showing excerpt ${sourceChip(s.id)} <b>${s.title}</b>: ${marked ? html`${marked} passage${marked > 1 ? "s" : ""} highlighted. <a href="#first-hit" id="jump">Jump to it</a>` : html`<span class="warn">the excerpt could not be located in this copy of the text${/^unverified/i.test(s.verification ?? "") ? " (the excerpt is unverified)" : ""}.</span>`}
        <div class="sub">Cited by ${itemsCiting(s.id).slice(0, 6).map((it) => html`${itemLink(it)} `)}</div></div>` : ""}
      <details class="card"><summary>Every excerpt taken from this document (${sources.length})</summary>
        <ul class="plain">${sources.map((x) => html`<li><a href="#/doc/${id}?s=${x.id}">${x.id}</a> ${x.title}</li>`)}</ul></details>
      <article class="card doctext">${text ? raw(body) : html`<p>The document text is not in this bundle.</p>`}</article>
    </div>`,
    after: () => {
      const h = document.getElementById("first-hit");
      if (h) setTimeout(() => h.scrollIntoView({ block: "center" }), 50);
      document.getElementById("jump")?.addEventListener("click", (e) => { e.preventDefault(); h?.scrollIntoView({ block: "center" }); });
    },
  };
}
