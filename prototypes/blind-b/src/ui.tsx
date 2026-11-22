/* Shared pieces: links, tags, rich text that swaps identifiers for names,
 * rule text, values, citations. */
import { signal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import {
  D, E, byId, byIdent, srcById, docById, qById, PROGRAMS, KIND, fmtVal, fmtDate, ruleLines, firstSentence,
  requiredRoles, isPendingSign, openQuestions, unverifiedRest, unverifiedDirect, type CItem, type Item, type Source,
} from "./store";

/* ---------- router ---------- */
export interface Route { path: string[]; q: Record<string, string> }
function parse(): Route {
  const h = location.hash.replace(/^#\/?/, "");
  const [p, qs] = h.split("?");
  const q: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(qs ?? "")) q[k] = v;
  return { path: p.split("/").filter(Boolean).map(decodeURIComponent), q };
}
export const route = signal<Route>(parse());
addEventListener("hashchange", () => { route.value = parse(); if (!route.value.q.keep) scrollTo(0, 0); });
export function href(path: string, q?: Record<string, string | undefined>): string {
  const qs = q ? Object.entries(q).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&") : "";
  return "#/" + path + (qs ? "?" + qs : "");
}
export function go(path: string, q?: Record<string, string | undefined>) { location.hash = href(path, q); }
/** Change query parameters of the current page without leaving it. */
export function setQ(patch: Record<string, string | undefined>) {
  const r = route.value;
  const next = { ...r.q, ...patch } as Record<string, string | undefined>;
  history.replaceState(null, "", href(r.path.map(encodeURIComponent).join("/"), next));
  route.value = parse();
}

/* ---------- small things ---------- */
export function ProgramTag({ id, long }: { id: string; long?: boolean }) {
  const p = PROGRAMS[id] ?? { label: id, short: id, hue: 0 };
  return <span class="ptag" style={`--h:${p.hue}`}>{long ? p.label : p.short}</span>;
}
export function Pill({ tone, children, title }: { tone?: string; children: ComponentChildren; title?: string }) {
  return <span class={"pill " + (tone ?? "")} title={title}>{children}</span>;
}
export function Fold({ title, count, open, children, id }: { title: ComponentChildren; count?: ComponentChildren; open?: boolean; children: ComponentChildren; id?: string }) {
  return (
    <details class="fold" open={open} id={id}>
      <summary><span class="fold-t">{title}</span>{count !== undefined && <span class="fold-c">{count}</span>}</summary>
      <div class="fold-b">{children}</div>
    </details>
  );
}
export function Empty({ children }: { children: ComponentChildren }) { return <p class="empty">{children}</p>; }
export function More<T>({ items, n = 12, render, noun = "more" }: { items: T[]; n?: number; render: (x: T, i: number) => ComponentChildren; noun?: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, n);
  return (
    <>
      {shown.map(render)}
      {items.length > n && <button class="linkish more" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${items.length} ${noun}`}</button>}
    </>
  );
}

export function ItemLink({ it, children, cls }: { it: Item; children?: ComponentChildren; cls?: string }) {
  return <a class={cls ?? "ref"} href={href("item/" + it.id)} title={`${KIND[it.kind].one} ${it.id}: ${firstSentence(it.meaning, 160)}`}>{children ?? it.name}</a>;
}
export function StatusPill({ it }: { it: Item }) {
  const need = requiredRoles(it);
  const done = need.filter((r) => it.approval?.some((a) => a.role === r.role)).length;
  const pending = need.filter((r) => isPendingSign(it.id, r.role)).length;
  const st = it.status ?? "Draft";
  return <Pill tone={st === "Approved" ? "ok" : "draft"} title="Draft until every required role has signed">{st} · {done} of {need.length} signed{pending ? ` · ${pending} in your proposal` : ""}</Pill>;
}
export function Flags({ it }: { it: Item }) {
  const oq = openQuestions(it);
  return (
    <>
      {it.statute_override && <Pill tone="fed" title={it.statute_override}>Federal law over Colorado rule</Pill>}
      {unverifiedRest.has(it.identifier) && <Pill tone="warn" title="A figure this depends on comes from a source that could not be fetched">{unverifiedDirect.has(it.identifier) ? "Unverified figure" : "Rests on unverified figure"}</Pill>}
      {oq.length > 0 && <Pill tone="q" title={oq.map((q) => q.id + " " + q.title).join("\n")}>{oq.length} open question{oq.length > 1 ? "s" : ""}</Pill>}
    </>
  );
}
/** One item as a list row. */
export function ItemRow({ it, extra, value }: { it: CItem; extra?: ComponentChildren; value?: ComponentChildren }) {
  return (
    <a class="row" href={href("item/" + it.id)}>
      <span class={"kdot k-" + it.kind} title={KIND[it.kind].one} />
      <span class="row-main">
        <span class="row-name">{it.name}</span>
        <span class="row-sub">{firstSentence(stripIds(it.meaning ?? ""), 150)}</span>
      </span>
      {value !== undefined && <span class="row-val">{value}</span>}
      <span class="row-side">{extra}<span class="idtag">{it.id}</span></span>
    </a>
  );
}

/* ---------- rich text ---------- */
const TOKEN = /(\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b)|(\bCO-\d+\b)|(\bOQ-\d+\b)|(\bS\d{1,4}\b)|(\bD-\d{1,3}\b)/g;
/** Drops "(CO-12)" after an identifier that already names item CO-12. */
function tidy(s: string): string {
  return s.replace(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)(?:,\s*|\s*\()(CO-\d+)(\))?/g, (m, ident, id, close) => {
    const it = byIdent.get(ident);
    if (!it || it.id !== id) return m;
    return close ? ident : m.includes("(") ? ident : ident;
  });
}
export function stripIds(s: string): string {
  return tidy(s).replace(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g, (m) => byIdent.get(m)?.name ?? m).replace(/\s*\((?:CO-\d+(?:,\s*)?)+\)/g, "");
}
/** Prose from the codex with identifiers shown as item names and every
 *  item, question, excerpt and document reference made a link. */
export function Rich({ text, cls }: { text: string | undefined; cls?: string }) {
  if (!text) return null;
  const s = tidy(text);
  const out: ComponentChildren[] = [];
  let last = 0;
  for (const m of s.matchAll(TOKEN)) {
    const i = m.index!;
    let node: ComponentChildren = null;
    if (m[1]) { const it = byIdent.get(m[1]); if (it) node = <ItemLink it={it} />; }
    else if (m[2]) { const it = byId.get(m[2]); if (it) node = <a class="ref idref" href={href("item/" + it.id)} title={it.name}>{m[2]}</a>; }
    else if (m[3]) { const q = qById.get(m[3]); if (q) node = <a class="ref idref" href={href("questions/" + q.id)} title={q.title}>{m[3]}</a>; }
    else if (m[4]) { const sc = srcById.get(m[4]); if (sc) node = <a class="ref idref" href={href("law/source/" + sc.id)} title={sc.cite + " — " + sc.title}>{m[4]}</a>; }
    else if (m[5]) { const d = docById.get(m[5]); if (d) node = <a class="ref idref" href={href("law/doc/" + d.id)} title={d.title}>{m[5]}</a>; }
    if (!node) continue;
    out.push(s.slice(last, i), node);
    last = i + m[0].length;
  }
  out.push(s.slice(last));
  return <span class={cls}>{out}</span>;
}

/* ---------- rule text ---------- */
const KEYWORDS = /^(if |else if |otherwise |all of the following are true:|any of the following is true:|then )/;
function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export function RuleText({ it, mark, lines: given }: { it: Item; mark?: Set<string>; lines?: string[] }) {
  const lines = given ?? ruleLines(it);
  if (!lines.length) return null;
  const used = E.usesOfItem(it.identifier).map((u) => byIdent.get(u)!).filter(Boolean).sort((a, b) => b.name.length - a.name.length);
  const re = used.length ? new RegExp("(" + used.map((u) => escapeRe(u.name)).join("|") + ")", "g") : null;
  const byName = new Map(used.map((u) => [u.name, u]));
  const piece = (t: string): ComponentChildren[] => {
    const words = (x: string) => x.replace(/\b[a-z0-9]+(?:_[a-z0-9]+)+\b/g, (m) => "“" + m.replace(/_/g, " ") + "”");
    if (!re) return [words(t)];
    return t.split(re).map((p) => {
      const u = byName.get(p);
      if (!u) return words(p);
      return <a class={"ref k-" + u.kind + (mark?.has(u.identifier) ? " decisive" : "")} href={href("item/" + u.id)} title={firstSentence(u.meaning, 200)}>{p}</a>;
    });
  };
  return (
    <div class="rule">
      {lines.map((l) => {
        const indent = (l.match(/^\s*/) as RegExpMatchArray)[0].length;
        let t = l.trim();
        const bullet = t.startsWith("- ");
        if (bullet) t = t.slice(2);
        const k = KEYWORDS.exec(t);
        const body = k ? t.slice(k[0].length) : t;
        const thenAt = body.indexOf(" then ");
        return (
          <div class="rule-l" style={`padding-left:${indent * 0.7 + (bullet ? 1.1 : 0)}rem`}>
            {bullet && <span class="rule-b">•</span>}
            {k && <b class="kw">{k[0]}</b>}
            {k && /^(if|else if)/.test(k[0]) && thenAt >= 0
              ? <>{piece(body.slice(0, thenAt))}<b class="kw"> then </b><span class="rule-res">{piece(body.slice(thenAt + 6))}</span></>
              : piece(body)}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- values ---------- */
export function ValueView({ v, it, prev }: { v: unknown; it: Item; prev?: unknown }) {
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    const rows = Object.entries(v as Record<string, unknown>);
    const vt: Item = { ...it, type: /pct|rate|share/.test(it.identifier) && rows.every(([, x]) => typeof x === "number" && (x as number) < 20) ? "rate" : rows.every(([, x]) => typeof x === "number") ? "money" : "text" };
    const p = (prev && typeof prev === "object" ? prev : null) as Record<string, unknown> | null;
    return (
      <div class={"vtable" + (rows.length > 14 ? " tall" : "")}>
        {rows.map(([k, x]) => (
          <div class={"vcell" + (p && JSON.stringify(p[k]) !== JSON.stringify(x) ? " changed" : "")}>
            <span class="vk">{/^[a-z_]+$/.test(k) ? k.replace(/_/g, " ") : k}</span>
            <span class="vv">{fmtVal(x, vt)}</span>
          </div>
        ))}
      </div>
    );
  }
  return <span class="bigval">{fmtVal(v, it)}</span>;
}
export function keyLabel(it: Item): string {
  const m = /^table keyed by (.*)$/.exec(it.type);
  return m ? "by " + m[1] : "";
}

/* ---------- the law ---------- */
function highlight(text: string, needles: string[]): ComponentChildren[] {
  const ns = needles.filter((n) => n.length > 1);
  if (!ns.length) return [text];
  const re = new RegExp("(" + ns.sort((a, b) => b.length - a.length).map(escapeRe).join("|") + ")", "g");
  return text.split(re).map((p, i) => (i % 2 ? <mark>{p}</mark> : p));
}
/** The numbers of a figure's value as they might be printed in the law. */
export function numberNeedles(v: unknown): string[] {
  const out = new Set<string>();
  const add = (n: number) => {
    const abs = Math.abs(n);
    out.add(abs.toLocaleString("en-US", { maximumFractionDigits: 2 }));
    out.add(abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    out.add(String(abs));
    if (abs > 0 && abs < 20) { const pc = Math.round(abs * 10000) / 100; out.add(pc + "%"); out.add(pc + " percent"); }
  };
  const walk = (x: unknown) => {
    if (typeof x === "number") add(x);
    else if (x && typeof x === "object") Object.values(x as object).forEach(walk);
  };
  walk(v);
  return [...out].filter((s) => s.length > 1);
}
export function Quote({ text, needles }: { text: string; needles?: string[] }) {
  return (
    <blockquote class="quote">
      {text.split(/\n+/).map((p) => <p>{highlight(p.replace(/\*([^*]+)\*/g, "$1"), needles ?? [])}</p>)}
    </blockquote>
  );
}
export function SourceCard({ s, open, needles }: { s: Source; open?: boolean; needles?: string[] }) {
  const d = s.doc ? docById.get(s.doc) : null;
  return (
    <details class={"src" + (s.unverified ? " unv" : "")} open={open}>
      <summary>
        <span class="src-cite">{s.cite.replace(/\.$/, "")}</span>
        <span class="src-title">{s.title}</span>
        {s.unverified && <Pill tone="warn">Not verified</Pill>}
      </summary>
      {s.unverified && <p class="warnbox"><b>This is not a quotation.</b> {s.unverified}</p>}
      <Quote text={s.quote} needles={needles} />
      {s.notes && <p class="small muted">{s.notes}</p>}
      <p class="src-foot">
        {d && <a href={href("law/doc/" + d.id, { at: s.id })}>Read it in the full document</a>}
        {d && <span class="muted"> · {d.kind}{d.date ? `, retrieved or dated ${fmtDate(d.date)}` : ""}</span>}
        {s.url && <> · <a href={s.url} target="_blank" rel="noreferrer">official page ↗</a></>}
        <span class="idtag">{s.id}</span>
      </p>
    </details>
  );
}
export function AidNotice() {
  return <p class="notice"><b>Placeholder aid codes.</b> Codes starting “PH-” are stand-ins for design and testing. {D.aidCodes.notice}</p>;
}
export function Crumbs({ items }: { items: Array<[string, string] | string> }) {
  return (
    <nav class="crumbs" aria-label="You are here">
      {items.map((c, i) => <>{i > 0 && <span> › </span>}{typeof c === "string" ? <span>{c}</span> : <a href={c[1]}>{c[0]}</a>}</>)}
    </nav>
  );
}
