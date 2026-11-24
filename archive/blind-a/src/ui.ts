/* A tiny HTML-string toolkit: escaped templates, shared components and the
 * badge vocabulary every screen uses. */
import {
  D, KIND_SHORT, PROGRAM_SHORT, byId, byIdent, directUnverified, isOutcome, noVersion,
  openQuestionsOf, restsOnUnverified, status, type CItem, type Source,
} from "./data";
import type { Item } from "../../../src/engine/types";

export class Raw { constructor(public s: string) {} toString() { return this.s; } }
export const raw = (s: string) => new Raw(s);
export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function part(v: unknown): string {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(part).join("");
  if (v === false || v === null || v === undefined) return "";
  return esc(v);
}
export function html(strings: TemplateStringsArray, ...vals: unknown[]): Raw {
  let s = strings[0];
  for (let i = 0; i < vals.length; i++) s += part(vals[i]) + strings[i + 1];
  return new Raw(s);
}

export function itemHref(it: Item): string { return `#/item/${it.id}`; }
export function itemLink(it: Item | undefined, label?: string): Raw {
  if (!it) return html`<span class="muted">${label ?? "?"}</span>`;
  return html`<a class="ilink k-${it.kind}" href="${itemHref(it)}" title="${it.identifier}">${label ?? it.name}</a>`;
}
export function identLink(ident: string): Raw { return itemLink(byIdent.get(ident), ident); }

export function kindTag(it: Item): Raw {
  return html`<span class="kind k-${it.kind}">${KIND_SHORT[it.kind]}</span>`;
}
export function programTag(p: string): Raw {
  return html`<span class="prog">${PROGRAM_SHORT[p] ?? p}</span>`;
}

/** The trust badges, in a fixed order, the same on every screen. */
export function badges(it: Item, opts: { compact?: boolean } = {}): Raw {
  const b: Raw[] = [];
  const st = status(it);
  b.push(html`<span class="badge b-${st.toLowerCase()}" title="Approval status">${st}</span>`);
  if (isOutcome(it)) b.push(html`<span class="badge b-outcome" title="A declared program outcome">Outcome</span>`);
  if (it.statute_override) b.push(html`<span class="badge b-override" title="${it.statute_override}">Statute over rule</span>`);
  const du = directUnverified(it);
  if (du.length) b.push(html`<span class="badge b-unverified" title="Cites ${du.join(", ")}, marked unverified">Unverified source</span>`);
  else if (restsOnUnverified(it).length) b.push(html`<span class="badge b-rests" title="Reads an item that cites an unverified excerpt">Rests on unverified</span>`);
  if (noVersion(it)) b.push(html`<span class="badge b-unverified" title="No dated figure has been loaded">No figure loaded</span>`);
  const oq = openQuestionsOf(it).filter((q) => q.state !== "resolved");
  if (oq.length) b.push(html`<span class="badge b-question" title="${oq.map((q) => q.id).join(", ")}">${opts.compact ? `${oq.length} open Q` : `${oq.length} open question${oq.length > 1 ? "s" : ""}`}</span>`);
  if (it.assumption && !opts.compact) b.push(html`<span class="badge b-assume" title="${it.assumption}">Assumption</span>`);
  return html`<span class="badges">${b}</span>`;
}

export function sourceChip(sid: string): Raw {
  const s: Source | undefined = D.sources[sid];
  if (!s) return html`<span class="chip">${sid}</span>`;
  const unv = /^unverified/i.test(s.verification ?? "");
  return html`<button class="chip ${unv ? "chip-unv" : ""}" data-act="source" data-sid="${sid}" title="${s.title}">${s.cite || sid}${unv ? " · unverified" : ""}</button>`;
}

/** A row in an item table. */
export function itemRow(it: CItem, extra?: Raw | string): Raw {
  return html`<tr>
    <td>${kindTag(it)}</td>
    <td>${itemLink(it)}<div class="sub">${it.id} · ${it.identifier}</div></td>
    <td>${programTag(it.program)}</td>
    <td>${badges(it, { compact: true })}</td>
    ${extra !== undefined ? html`<td>${typeof extra === "string" ? extra : extra}</td>` : ""}
  </tr>`;
}

/** Item names inside a line of pattern English become links to their items. */
const nameRegexCache = new Map<string, RegExp | null>();
export function linkEnglish(line: string, uses: string[]): Raw {
  const key = uses.join(",");
  let re = nameRegexCache.get(key);
  const names = uses.map((u) => byIdent.get(u)).filter((x): x is NonNullable<typeof x> => !!x);
  if (re === undefined) {
    const sorted = names.map((n) => n.name).sort((a, b) => b.length - a.length);
    re = sorted.length ? new RegExp(sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g") : null;
    nameRegexCache.set(key, re);
  }
  if (!re) return html`${line}`;
  const byName = new Map(names.map((n) => [n.name, n]));
  let out = "";
  let last = 0;
  line.replace(re, (m, off: number) => {
    out += esc(line.slice(last, off)) + itemLink(byName.get(m), m).s;
    last = off + m.length;
    return m;
  });
  out += esc(line.slice(last));
  return raw(out);
}

export function section(title: string, body: Raw | string, opts: { id?: string; note?: string; open?: boolean } = {}): Raw {
  return html`<section class="card" ${opts.id ? raw(`id="${esc(opts.id)}"`) : ""}>
    <h2>${title}${opts.note ? html` <span class="note">${opts.note}</span>` : ""}</h2>
    ${body}
  </section>`;
}

export function pill(text: string, cls = ""): Raw { return html`<span class="pill ${cls}">${text}</span>`; }

export function caseLink(id: string): Raw {
  const c = D.cases.find((x) => x.id === id);
  return html`<a href="#/case/${id}" title="${c?.title ?? ""}">${id}</a>`;
}

export function idLabel(id: string): Raw {
  const it = byId.get(id);
  return it ? itemLink(it) : html`${id}`;
}

export function paragraphs(text: string): Raw {
  return html`${text.split(/\n\s*\n/).map((p) => html`<p>${linkRefs(p)}</p>`)}`;
}
/** CO-n, OQ-n and S-n references in running text become links. */
export function linkRefs(text: string): Raw {
  let out = "";
  let last = 0;
  const re = /\b(CO-\d+|OQ-\d+|S\d{1,4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const ref = m[1];
    let link = "";
    if (ref.startsWith("CO-") && byId.has(ref)) link = `<a href="#/item/${ref}">${ref}</a>`;
    else if (ref.startsWith("OQ-")) link = `<a href="#/q/${ref}">${ref}</a>`;
    else if (/^S\d+$/.test(ref) && D.sources[ref]) link = `<button class="chip inline" data-act="source" data-sid="${ref}">${ref}</button>`;
    if (!link) continue;
    out += esc(text.slice(last, m.index)) + link;
    last = m.index + ref.length;
  }
  out += esc(text.slice(last));
  return raw(out);
}
