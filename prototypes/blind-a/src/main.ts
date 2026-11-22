/* Rulebook: boot, layout, router and the events every screen shares. */
import { D, ROLES, load, itemsCiting, unverifiedSources } from "./data";
import { esc, html, itemLink, raw, type Raw } from "./ui";
import { changes, initState, me, setMe } from "./proposal";
import { deskView } from "./views/desk";
import { itemView } from "./views/item";
import { caseListView, caseView } from "./views/household";
import { walkView } from "./views/walk";
import { questionView, questionsView } from "./views/questions";
import { changesView, editView } from "./views/changes";
import { docView } from "./views/doc";

export interface View { title: string; body: Raw; after?: () => void }
type Route = (args: string[], query: URLSearchParams) => View | Promise<View>;

const routes: Array<[RegExp, Route]> = [
  [/^\/?$/, deskView],
  [/^\/item\/([^/]+)$/, itemView],
  [/^\/cases$/, caseListView],
  [/^\/case\/([^/]+)$/, caseView],
  [/^\/walk\/([^/]+)\/([^/]+)\/([^/]+)$/, walkView],
  [/^\/questions$/, questionsView],
  [/^\/q\/([^/]+)$/, questionView],
  [/^\/changes$/, changesView],
  [/^\/edit\/([^/]+)$/, editView],
  [/^\/doc\/([^/]+)$/, docView],
];

const NAV: Array<[string, string, RegExp]> = [
  ["#/", "Desk", /^\/?$|^\/item/],
  ["#/cases", "Households", /^\/case|^\/walk/],
  ["#/questions", "Questions", /^\/q/],
  ["#/changes", "Changes", /^\/changes|^\/edit/],
];

function shell(): void {
  document.body.innerHTML = `
  <header class="top">
    <a class="brand" href="#/">Rulebook <span>Colorado benefits codex</span></a>
    <nav id="nav"></nav>
    <form id="search" role="search"><input id="q" type="search" placeholder="Search rules, figures, questions, households…" aria-label="Search"></form>
    <label class="role">I am working as
      <select id="role">${ROLES().map((r) => `<option>${esc(r)}</option>`).join("")}</select>
    </label>
  </header>
  <main id="main" tabindex="-1"><p class="loading">Loading the codex…</p></main>
  <aside id="drawer" hidden></aside>
  <footer class="foot" id="foot"></footer>`;
}

export function rerender(): void { void render(); }

async function render(): Promise<void> {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [p, qs] = hash.split("?");
  const query = new URLSearchParams(qs ?? "");
  const nav = document.getElementById("nav")!;
  const n = changes().length;
  nav.innerHTML = NAV.map(([href, label, re]) =>
    `<a href="${href}" class="${re.test(p) ? "on" : ""}">${label}${label === "Changes" && n ? ` <b class="count">${n}</b>` : ""}</a>`).join("");
  const main = document.getElementById("main")!;
  for (const [re, fn] of routes) {
    const m = re.exec(p);
    if (!m) continue;
    try {
      const v = await fn(m.slice(1).map(decodeURIComponent), query);
      document.title = `${v.title} · Rulebook`;
      main.innerHTML = v.body.s;
      v.after?.();
    } catch (e) {
      main.innerHTML = html`<section class="card"><h1>Something went wrong</h1><pre>${String((e as Error).stack ?? e)}</pre></section>`.s;
    }
    if (!query.has("keep")) window.scrollTo(0, 0);
    return;
  }
  main.innerHTML = html`<section class="card"><h1>Not found</h1><p><a href="#/">Back to the desk</a></p></section>`.s;
}

// ------------------------------------------------------- source drawer
export function openSource(sid: string): void {
  const s = D.sources[sid];
  const d = document.getElementById("drawer")!;
  if (!s) return;
  const doc = s.doc ? D.documents.find((x) => x.id === s.doc) : undefined;
  const citing = itemsCiting(sid);
  const unv = unverifiedSources.has(sid);
  d.innerHTML = html`<div class="drawer-in" role="dialog" aria-label="Source ${sid}">
    <button class="close" data-act="close-drawer" aria-label="Close">×</button>
    <p class="eyebrow">Source ${sid}${doc ? html` · ${doc.id}` : ""}</p>
    <h2>${s.title}</h2>
    <p class="cite">${s.cite}${s.url ? html` · <a href="${s.url}" target="_blank" rel="noopener">official text</a>` : ""}</p>
    ${unv ? html`<div class="warn"><b>Unverified.</b> ${s.verification?.replace(/^unverified\.?\s*/i, "")}</div>` : ""}
    <blockquote class="excerpt">${s.excerpt}</blockquote>
    ${doc ? html`<p><a class="btn" href="#/doc/${doc.id}?s=${sid}">Open the full document, excerpt highlighted</a></p><p class="sub">${doc.title}${doc.date ? html` · fetched or dated ${doc.date}` : ""}</p>` : ""}
    <h3>Cited by ${citing.length} item${citing.length === 1 ? "" : "s"}</h3>
    <ul class="plain">${citing.slice(0, 30).map((it) => html`<li>${itemLink(it)}</li>`)}</ul>
    ${citing.length > 30 ? html`<p class="sub">… and ${citing.length - 30} more</p>` : ""}
  </div>`.s;
  d.hidden = false;
  (d.querySelector(".close") as HTMLElement)?.focus();
}
function closeDrawer(): void { const d = document.getElementById("drawer")!; d.hidden = true; d.innerHTML = ""; }

function wire(): void {
  document.addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
    if (!t) {
      const d = document.getElementById("drawer")!;
      if (!d.hidden && !(ev.target as HTMLElement).closest("#drawer")) closeDrawer();
      return;
    }
    const act = t.dataset.act;
    if (act === "source") { ev.preventDefault(); ev.stopPropagation(); openSource(t.dataset.sid!); }
    else if (act === "close-drawer") closeDrawer();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  document.getElementById("search")!.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = (document.getElementById("q") as HTMLInputElement).value.trim();
    location.hash = "#/?q=" + encodeURIComponent(q);
  });
  const role = document.getElementById("role") as HTMLSelectElement;
  role.value = me.role;
  role.addEventListener("change", () => { setMe({ role: role.value }); rerender(); });
  window.addEventListener("hashchange", () => { closeDrawer(); rerender(); });
}

async function boot(): Promise<void> {
  initState();
  await load();
  shell();
  wire();
  document.getElementById("foot")!.innerHTML = html`Codex ${D.meta.title} · commit ${D.sha} · data built ${D.built.slice(0, 10)} · default determination date ${D.meta.default_as_of} · <span class="muted">A prototype: proposals stay in this browser.</span>`.s;
  await render();
}
void boot();
export { raw };
