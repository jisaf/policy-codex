/* G. Map: which rules, figures, facts and primitives the programs share.
 *
 * Overview (#/map): programs across the top; below them, in bands, the rules,
 * figures, program facts and shared primitives that at least N programs read
 * (directly or through other items). A program's own items fold into a count
 * under its box. Each node carries a strip of program marks in a fixed order,
 * so sharing reads by position as well as colour. Selecting a program draws
 * its lines; selecting a node draws its programs and its direct links.
 *
 * Trace (#/map/outcome/<identifier>): one outcome's whole dependency set in
 * steps (what it reads, what those read, ...), shared nodes marked. */
import { D, byIdent, PROGRAM_LABEL, PROGRAM_SHORT, KIND_SHORT, type CItem } from "../data";
import { esc, html, raw, type Raw } from "../ui";
import type { View } from "../main";

export const MAP_PROGRAMS = ["Medicaid", "CHP+", "SNAP", "ColoradoWorks", "AdultFinancial", "CCCAP", "LEAP", "SunBucks"];
/* Categorical slots in fixed order (the validated reference palette, light). */
const COLOR: Record<string, string> = {
  Medicaid: "#2a78d6", "CHP+": "#6250d6", SNAP: "#eb6834", ColoradoWorks: "#1baf7a",
  AdultFinancial: "#eda100", CCCAP: "#e87ba4", LEAP: "#008300", SunBucks: "#e34948",
};
/* Sequential (one hue, light to dark) for how many programs share a node. */
const SHARE_FILL = ["#ffffff", "#ffffff", "#e2f0ef", "#c3e0de", "#9ccbc8", "#6fb0ac", "#3f8f8b", "#1f706c", "#0f5e63"];
const SHARE_INK = (n: number) => (n >= 6 ? "#ffffff" : "#1c2331");

interface Graph {
  reads: Map<string, Set<string>>;     // item -> items it reads
  readers: Map<string, Set<string>>;   // item -> items that read it
  reach: Map<string, Set<string>>;     // item -> programs whose outcomes read it
  outcomes: Map<string, string[]>;     // program -> outcome identifiers
}
let G: Graph | null = null;
function graph(): Graph {
  if (G) return G;
  const reads = new Map<string, Set<string>>();
  const readers = new Map<string, Set<string>>();
  for (const [k, vs] of Object.entries(D.usedBy)) {
    readers.set(k, new Set(vs));
    for (const v of vs) { if (!reads.has(v)) reads.set(v, new Set()); reads.get(v)!.add(k); }
  }
  const reach = new Map<string, Set<string>>();
  const outcomes = new Map<string, string[]>();
  for (const p of D.meta.programs ?? []) {
    if (!MAP_PROGRAMS.includes(p.id)) continue;
    outcomes.set(p.id, p.outcomes ?? []);
    const seen = new Set<string>();
    const stack = [...(p.outcomes ?? [])];
    while (stack.length) {
      const x = stack.pop()!;
      if (seen.has(x)) continue;
      seen.add(x);
      for (const y of reads.get(x) ?? []) stack.push(y);
    }
    for (const x of seen) { if (!reach.has(x)) reach.set(x, new Set()); reach.get(x)!.add(p.id); }
  }
  G = { reads, readers, reach, outcomes };
  return G;
}

/** How many programs share an item; with `family`, Medicaid and CHP+ count once. */
function shareCount(ps: Set<string> | undefined, family: boolean): number {
  if (!ps) return 0;
  if (!family) return ps.size;
  return ps.size - (ps.has("Medicaid") && ps.has("CHP+") ? 1 : 0);
}

type Band = "rule" | "figure" | "fact" | "primitive";
const BAND_ORDER: Band[] = ["rule", "figure", "fact", "primitive"];
const BAND_LABEL: Record<Band, string> = {
  rule: "Rules", figure: "Figures", fact: "Program facts", primitive: "Shared primitives",
};
const BAND_HELP: Record<Band, string> = {
  rule: "derived items: the rules that turn facts into answers",
  figure: "dated parameters: limits, standards, percentages",
  fact: "facts a program's own chapter defines",
  primitive: "neutral facts in the shared chapter: dates, amounts, relationships, statuses",
};
function bandOf(it: CItem): Band {
  if (it.kind === "derived") return "rule";
  if (it.kind === "parameter") return "figure";
  return it.program === "All" ? "primitive" : "fact";
}

/** Mean position of the programs that read an item, to place it under them. */
function barycenter(ps: Set<string>): number {
  let s = 0;
  for (const p of ps) s += MAP_PROGRAMS.indexOf(p);
  return s / Math.max(1, ps.size);
}

// ------------------------------------------------------------- geometry
const W = 1200, PAD = 12, PROG_H = 74, BAND_HEAD = 34;
const NODE_W = 162, NODE_H = 34, GAP_X = 8, GAP_Y = 8;
const PER_ROW = Math.floor((W - 2 * PAD + GAP_X) / (NODE_W + GAP_X));
const COL_W = (W - 2 * PAD) / MAP_PROGRAMS.length;
const progX = (i: number) => PAD + i * COL_W + COL_W / 2;

interface Placed { it: CItem; ps: Set<string>; n: number; band: Band; x: number; y: number }

function trunc(s: string, n: number): string { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

function marks(ps: Set<string>, x: number, y: number): string {
  return MAP_PROGRAMS.map((p, i) => {
    const on = ps.has(p);
    return `<rect x="${x + i * 7}" y="${y}" width="5" height="5" rx="1" fill="${on ? COLOR[p] : "#ffffff"}" stroke="${on ? COLOR[p] : "#c9c6bb"}" stroke-width="${on ? 0 : 0.8}"/>`;
  }).join("");
}

function layout(min: number, family: boolean, kinds: Set<Band>): { placed: Placed[]; height: number; bandsY: Array<[Band, number, number]>; own: Map<string, Record<Band, number>> } {
  const g = graph();
  const own = new Map<string, Record<Band, number>>(MAP_PROGRAMS.map((p) => [p, { rule: 0, figure: 0, fact: 0, primitive: 0 }]));
  const byBand = new Map<Band, Placed[]>(BAND_ORDER.map((b) => [b, []]));
  for (const [ident, ps] of g.reach) {
    const it = byIdent.get(ident);
    if (!it) continue;
    const band = bandOf(it);
    const n = shareCount(ps, family);
    if (n <= 1) { for (const p of ps) own.get(p)![band]++; continue; }
    if (n < min || !kinds.has(band)) continue;
    byBand.get(band)!.push({ it, ps, n, band, x: 0, y: 0 });
  }
  const placed: Placed[] = [];
  const bandsY: Array<[Band, number, number]> = [];
  let y = PAD + PROG_H + 26;
  for (const b of BAND_ORDER) {
    const list = byBand.get(b)!;
    if (!kinds.has(b)) continue;
    list.sort((a, c) => barycenter(a.ps) - barycenter(c.ps) || c.n - a.n || a.it.name.localeCompare(c.it.name));
    const top = y;
    y += BAND_HEAD;
    list.forEach((p, i) => {
      p.x = PAD + (i % PER_ROW) * (NODE_W + GAP_X);
      p.y = y + Math.floor(i / PER_ROW) * (NODE_H + GAP_Y);
    });
    const rows = Math.max(1, Math.ceil(list.length / PER_ROW));
    y += rows * (NODE_H + GAP_Y) + 14;
    bandsY.push([b, top, y]);
    placed.push(...list);
  }
  return { placed, height: y + PAD, bandsY, own };
}

function svgOverview(min: number, family: boolean, kinds: Set<Band>): { svg: string; placed: Placed[] } {
  const g = graph();
  const { placed, height, bandsY, own } = layout(min, family, kinds);
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" id="mapsvg" viewBox="0 0 ${W} ${height}" width="${W}" height="${height}" role="img" aria-label="Programs and the rules, figures, facts and primitives they share" font-family="Source Sans 3, Segoe UI, system-ui, sans-serif">`);
  parts.push(`<rect width="${W}" height="${height}" fill="#faf8f3"/>`);
  // bands
  for (const [b, top, bottom] of bandsY) {
    parts.push(`<rect x="${PAD - 6}" y="${top}" width="${W - 2 * PAD + 12}" height="${bottom - top - 6}" rx="10" fill="#ffffff" stroke="#e2e0d8"/>`);
    const count = placed.filter((p) => p.band === b).length;
    parts.push(`<text x="${PAD + 4}" y="${top + 21}" font-size="14" font-weight="700" fill="#1c2331">${BAND_LABEL[b]} <tspan font-weight="400" fill="#7a8396" font-size="12">${count} shared · ${esc(BAND_HELP[b])}</tspan></text>`);
  }
  parts.push(`<g id="edges"></g>`);
  // programs
  MAP_PROGRAMS.forEach((p, i) => {
    const x = PAD + i * COL_W + 4, w = COL_W - 8;
    const o = own.get(p)!;
    const outs = g.outcomes.get(p)?.length ?? 0;
    parts.push(`<g class="mp" data-act="map" data-p="${p}" tabindex="0" role="button" aria-label="${esc(PROGRAM_LABEL[p] ?? p)}" style="cursor:pointer">
      <rect x="${x}" y="${PAD}" width="${w}" height="${PROG_H}" rx="10" fill="#ffffff" stroke="#c9c6bb"/>
      <rect x="${x}" y="${PAD}" width="${w}" height="6" rx="3" fill="${COLOR[p]}"/>
      <text x="${x + 10}" y="${PAD + 26}" font-size="15" font-weight="700" fill="#1c2331">${esc(PROGRAM_SHORT[p] ?? p)}</text>
      <text x="${x + 10}" y="${PAD + 44}" font-size="11" fill="#4a5468">${outs} outcomes</text>
      <text x="${x + 10}" y="${PAD + 60}" font-size="11" fill="#7a8396">own: ${o.rule} rules · ${o.fact + o.primitive} facts</text>
    </g>`);
  });
  // nodes
  for (const p of placed) {
    const fill = SHARE_FILL[Math.min(p.n, 8)];
    const ink = SHARE_INK(p.n);
    const neutral = p.it.program === "All";
    parts.push(`<g class="mn" data-act="map" data-i="${esc(p.it.identifier)}" data-x="${p.x}" data-y="${p.y}" tabindex="0" role="button" aria-label="${esc(p.it.name)}, read by ${p.n} programs" style="cursor:pointer">
      <title>${esc(p.it.name)} (${esc(p.it.id)}) · ${KIND_SHORT[p.it.kind]} · read by ${[...p.ps].map((x) => PROGRAM_SHORT[x] ?? x).join(", ")}</title>
      <rect x="${p.x}" y="${p.y}" width="${NODE_W}" height="${NODE_H}" rx="6" fill="${fill}" stroke="${neutral ? "#13232b" : "#c9c6bb"}" stroke-width="${neutral ? 1.4 : 1}" ${neutral ? "" : ""}/>
      <text x="${p.x + 7}" y="${p.y + 14}" font-size="11.5" fill="${ink}">${esc(trunc(p.it.name, 26))}</text>
      ${marks(p.ps, p.x + 7, p.y + 21)}
      <text x="${p.x + NODE_W - 7}" y="${p.y + 27}" font-size="11" font-weight="700" fill="${ink}" text-anchor="end">×${p.n}</text>
    </g>`);
  }
  parts.push(`</svg>`);
  return { svg: parts.join(""), placed };
}

function legend(family: boolean): Raw {
  return html`<div class="map-legend">
    <span class="sub">Programs (mark order):</span>
    ${MAP_PROGRAMS.map((p) => html`<span class="lg"><i style="background:${COLOR[p]}"></i>${PROGRAM_SHORT[p] ?? p}</span>`)}
    <span class="sub">· Shared by:</span>
    ${[2, 3, 4, 5, 6, 7].map((n) => html`<span class="lg"><i style="background:${SHARE_FILL[n]};border:1px solid #c9c6bb"></i>${n}${n === 7 ? "+" : ""}</span>`)}
    <span class="lg"><i style="background:#fff;border:1.5px solid #13232b"></i>in the shared chapter</span>
    ${family ? html`<span class="sub">· Medicaid and CHP+ count as one family</span>` : ""}
  </div>`;
}

export function mapView(_args: string[], query: URLSearchParams): View {
  const min = Math.max(2, Number(query.get("min") ?? 3) || 3);
  const family = query.get("family") !== "0";
  const kinds = new Set<Band>((query.get("show") ?? "rule,figure,fact,primitive").split(",").filter((b): b is Band => (BAND_ORDER as string[]).includes(b)));
  const { svg, placed } = svgOverview(min, family, kinds);
  const g = graph();
  const q = (over: Record<string, string>) => {
    const u = new URLSearchParams({ min: String(min), family: family ? "1" : "0", show: [...kinds].join(","), ...over });
    return `#/map?${u}`;
  };
  const byBand = (b: Band) => placed.filter((p) => p.band === b).length;
  const outcomeOptions = MAP_PROGRAMS.flatMap((p) => (g.outcomes.get(p) ?? []).map((o) => [p, o] as const));
  return {
    title: "Map",
    body: html`<div class="page">
      <h1>What the programs share</h1>
      <p class="lede">Programs across the top; below them, every rule, figure, fact and shared primitive that at least ${min} programs read, directly or through other rules.
        Each node's strip of marks shows which programs read it, in the order of the boxes above. A program's own items fold into the count in its box.
        Select a program or a node to draw its lines and open its details.</p>
      <div class="toolbar">
        <label>Shared by at least
          <select id="map-min">${[2, 3, 4, 5, 6].map((n) => html`<option value="${n}" ${n === min ? raw("selected") : ""}>${n} programs</option>`)}</select></label>
        <label class="inline-ok"><input type="checkbox" id="map-family" ${family ? raw("checked") : ""}> Count Medicaid and CHP+ as one</label>
        ${BAND_ORDER.map((b) => html`<label class="inline-ok"><input type="checkbox" class="map-kind" value="${b}" ${kinds.has(b) ? raw("checked") : ""}> ${BAND_LABEL[b]}</label>`)}
        <button class="btn small" id="map-svg">Download SVG</button>
      </div>
      <div class="toolbar">
        <span><b>Shared at ${min}+ programs:</b> ${BAND_ORDER.filter((b) => kinds.has(b)).map((b, i) => html`${i ? " · " : ""}${byBand(b)} ${BAND_LABEL[b].toLowerCase()}`)}</span>
        <label>Trace one outcome
          <select id="map-outcome"><option value="">Choose an outcome…</option>
            ${MAP_PROGRAMS.map((p) => html`<optgroup label="${PROGRAM_LABEL[p] ?? p}">${outcomeOptions.filter(([pp]) => pp === p).map(([, o]) => html`<option value="${o}">${byIdent.get(o)?.name ?? o}</option>`)}</optgroup>`)}
          </select></label>
      </div>
      ${legend(family)}
      <div class="scrollx map-wrap">${raw(svg)}</div>
      <details class="card"><summary>The same nodes as a table</summary>
        <div class="scrollx"><table class="list"><thead><tr><th>Item</th><th>Kind</th><th class="num">Programs</th><th>Read by</th></tr></thead><tbody>
          ${[...placed].sort((a, b) => b.n - a.n || a.it.name.localeCompare(b.it.name)).map((p) => html`<tr><td><a href="#/item/${p.it.id}">${p.it.name}</a> <span class="sub">${p.it.id}</span></td><td>${BAND_LABEL[p.band]}</td><td class="num">${p.n}</td><td>${[...p.ps].map((x) => PROGRAM_SHORT[x] ?? x).join(", ")}</td></tr>`)}
        </tbody></table></div>
      </details>
    </div>`,
    after: () => wireOverview(placed, q),
  };
}

function wireOverview(placed: Placed[], q: (o: Record<string, string>) => string): void {
  const g = graph();
  const svg = document.getElementById("mapsvg") as unknown as SVGSVGElement | null;
  const edges = document.getElementById("edges");
  const drawer = document.getElementById("drawer")!;
  const panel = { set innerHTML(s: string) {
    drawer.innerHTML = `<div class="drawer-in map-sel" role="dialog" aria-label="Map selection"><button class="close" data-act="close-drawer" aria-label="Close">×</button>${s}</div>`;
    drawer.hidden = false;
  } };
  if (!svg || !edges) return;
  const at = new Map(placed.map((p) => [p.it.identifier, p]));
  const clear = () => {
    edges.innerHTML = "";
    svg.querySelectorAll(".mn, .mp").forEach((el) => el.removeAttribute("opacity"));
  };
  const dim = (keep: Set<string>, keepP: Set<string>) => {
    svg.querySelectorAll<SVGGElement>(".mn").forEach((el) => { if (!keep.has(el.dataset.i!)) el.setAttribute("opacity", "0.18"); });
    svg.querySelectorAll<SVGGElement>(".mp").forEach((el) => { if (!keepP.has(el.dataset.p!)) el.setAttribute("opacity", "0.35"); });
  };
  const curve = (x1: number, y1: number, x2: number, y2: number, color: string, w = 1.4, op = 0.55) => {
    const my = (y1 + y2) / 2;
    return `<path d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}" fill="none" stroke="${color}" stroke-width="${w}" opacity="${op}"/>`;
  };
  const selectProgram = (p: string) => {
    clear();
    const mine = placed.filter((n) => n.ps.has(p));
    const i = MAP_PROGRAMS.indexOf(p);
    edges.innerHTML = mine.map((n) => curve(progX(i), PAD + PROG_H, n.x + NODE_W / 2, n.y, COLOR[p], 1.2, 0.45)).join("");
    dim(new Set(mine.map((n) => n.it.identifier)), new Set([p]));
    const others = new Map<string, number>();
    for (const n of mine) for (const o of n.ps) if (o !== p) others.set(o, (others.get(o) ?? 0) + 1);
    panel.innerHTML = html`<h2>${PROGRAM_LABEL[p] ?? p}</h2>
      <p>${mine.length} of the shared nodes shown are read by this program.</p>
      <h3>Shares most with</h3>
      <ul class="plain">${[...others].sort((a, b) => b[1] - a[1]).map(([o, c]) => html`<li><span class="lg"><i style="background:${COLOR[o]}"></i></span> ${PROGRAM_SHORT[o] ?? o}: ${c}</li>`)}</ul>
      <h3>Outcomes</h3>
      <ul class="plain">${(g.outcomes.get(p) ?? []).map((o) => html`<li><a href="#/map/outcome/${encodeURIComponent(o)}">${byIdent.get(o)?.name ?? o}</a></li>`)}</ul>
      `.s;
  };
  const selectNode = (ident: string) => {
    clear();
    const n = at.get(ident);
    const it = byIdent.get(ident);
    if (!n || !it) return;
    const out: string[] = [];
    for (const p of n.ps) out.push(curve(progX(MAP_PROGRAMS.indexOf(p)), PAD + PROG_H, n.x + NODE_W / 2, n.y, COLOR[p], 1.6, 0.6));
    const down = [...(g.reads.get(ident) ?? [])];
    const up = [...(g.readers.get(ident) ?? [])];
    const keep = new Set([ident]);
    for (const d of down) { const m = at.get(d); if (m) { keep.add(d); out.push(curve(n.x + NODE_W / 2, n.y + NODE_H, m.x + NODE_W / 2, m.y, "#1c2331", 1.2, 0.55)); } }
    for (const u of up) { const m = at.get(u); if (m) { keep.add(u); out.push(curve(m.x + NODE_W / 2, m.y + NODE_H, n.x + NODE_W / 2, n.y, "#7a8396", 1.2, 0.5)); } }
    edges.innerHTML = out.join("");
    dim(keep, n.ps);
    const list = (xs: string[]) => xs.slice(0, 40).map((x) => { const t = byIdent.get(x); return html`<li>${t ? html`<a href="#/item/${t.id}">${t.name}</a> <span class="sub">${KIND_SHORT[t.kind]}${at.has(x) ? " · shared" : ""}</span>` : x}</li>`; });
    panel.innerHTML = html`<p class="eyebrow">${KIND_SHORT[it.kind]} · ${it.id} · ${PROGRAM_SHORT[it.program] ?? it.program} chapter</p>
      <h2><a href="#/item/${it.id}">${it.name}</a></h2>
      <p class="sub">${String(it.meaning ?? "").slice(0, 260)}${String(it.meaning ?? "").length > 260 ? "…" : ""}</p>
      <h3>Read by ${n.ps.size} program${n.ps.size === 1 ? "" : "s"}</h3>
      <p>${[...n.ps].map((p) => html`<span class="lg"><i style="background:${COLOR[p]}"></i>${PROGRAM_SHORT[p] ?? p}</span> `)}</p>
      <h3>Reads ${down.length}</h3><ul class="plain">${list(down)}</ul>
      <h3>Read by ${up.length} item${up.length === 1 ? "" : "s"}</h3><ul class="plain">${list(up)}</ul>
      `.s;
  };
  const onActivate = (ev: Event) => {
    const t = (ev.target as Element).closest(".mn, .mp") as SVGGElement | null;
    if (!t) return;
    if (t.classList.contains("mp")) selectProgram(t.dataset.p!);
    else selectNode(t.dataset.i!);
  };
  svg.addEventListener("click", onActivate);
  svg.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter" || (e as KeyboardEvent).key === " ") { e.preventDefault(); onActivate(e); } });
  const go = (over: Record<string, string>) => { location.hash = q(over); };
  (document.getElementById("map-min") as HTMLSelectElement).addEventListener("change", (e) => go({ min: (e.target as HTMLSelectElement).value }));
  (document.getElementById("map-family") as HTMLInputElement).addEventListener("change", (e) => go({ family: (e.target as HTMLInputElement).checked ? "1" : "0" }));
  document.querySelectorAll<HTMLInputElement>(".map-kind").forEach((cb) => cb.addEventListener("change", () => {
    const show = [...document.querySelectorAll<HTMLInputElement>(".map-kind")].filter((c) => c.checked).map((c) => c.value);
    go({ show: show.join(",") || "rule" });
  }));
  (document.getElementById("map-outcome") as HTMLSelectElement).addEventListener("change", (e) => {
    const v = (e.target as HTMLSelectElement).value;
    if (v) location.hash = `#/map/outcome/${encodeURIComponent(v)}`;
  });
  document.getElementById("map-svg")!.addEventListener("click", () => {
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "colorado-codex-shared-map.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
}

// --------------------------------------------------------- one outcome
export function outcomeMapView(args: string[], query: URLSearchParams): View {
  const g = graph();
  const ident = args[0];
  const root = byIdent.get(ident);
  if (!root) return { title: "Map", body: html`<div class="page"><h1>Not found</h1><p><a href="#/map">Back to the map</a></p></div>` };
  const family = query.get("family") !== "0";
  // Steps: shortest distance from the outcome.
  const step = new Map<string, number>([[ident, 0]]);
  const queue = [ident];
  while (queue.length) {
    const x = queue.shift()!;
    for (const y of g.reads.get(x) ?? []) if (!step.has(y)) { step.set(y, step.get(x)! + 1); queue.push(y); }
  }
  const rows = new Map<number, CItem[]>();
  for (const [x, s] of step) { const it = byIdent.get(x); if (!it) continue; if (!rows.has(s)) rows.set(s, []); rows.get(s)!.push(it); }
  const prog = [...(g.reach.get(ident) ?? [])][0] ?? root.program;
  const total = step.size;
  const sharedCount = [...step.keys()].filter((x) => shareCount(g.reach.get(x), family) > 1).length;
  const chip = (it: CItem) => {
    const ps = g.reach.get(it.identifier) ?? new Set<string>();
    const n = shareCount(ps, family);
    return html`<button class="tchip ${n > 1 ? "shared" : ""} k-${it.kind}" data-i="${it.identifier}" style="${n > 1 ? `background:${SHARE_FILL[Math.min(n, 8)]};color:${SHARE_INK(n)}` : ""}" title="${it.name} · ${KIND_SHORT[it.kind]} · read by ${[...ps].map((p) => PROGRAM_SHORT[p] ?? p).join(", ")}">
      <span class="kind k-${it.kind}">${KIND_SHORT[it.kind]}</span> ${trunc(it.name, 38)}
      <span class="tmarks">${MAP_PROGRAMS.map((p) => html`<i style="background:${ps.has(p) ? COLOR[p] : "#fff"};border-color:${ps.has(p) ? COLOR[p] : "#c9c6bb"}"></i>`)}</span>
    </button>`;
  };
  const kindRank: Record<string, number> = { derived: 0, parameter: 1, supplied: 2 };
  return {
    title: `Map: ${root.name}`,
    body: html`<div class="page">
      <p class="eyebrow"><a href="#/map">Map</a> · ${PROGRAM_LABEL[prog] ?? prog} outcome</p>
      <h1>${root.name}</h1>
      <p class="lede">Everything this outcome reads, in steps: step 1 is what it reads directly, step 2 what those read, and so on.
        ${total} items in all; <b>${sharedCount}</b> are also read by another program${family ? " (Medicaid and CHP+ counted as one)" : ""} and are tinted.
        Select a node to mark what it reads (outlined) and what reads it (underlined).</p>
      ${legend(family)}
      ${[...rows.keys()].sort((a, b) => a - b).map((s) => html`<section class="card tstep">
        <h2>${s === 0 ? "The outcome" : `Step ${s}`} <span class="note">${rows.get(s)!.length} item${rows.get(s)!.length === 1 ? "" : "s"}</span></h2>
        <div class="tchips">${rows.get(s)!.sort((a, b) => kindRank[a.kind] - kindRank[b.kind] || shareCount(g.reach.get(b.identifier), family) - shareCount(g.reach.get(a.identifier), family) || a.name.localeCompare(b.name)).map(chip)}</div>
      </section>`)}
      <div class="card" id="trace-panel" hidden></div>
    </div>`,
    after: () => {
      const panel = document.getElementById("trace-panel")!;
      document.querySelectorAll<HTMLButtonElement>(".tchip").forEach((b) => b.addEventListener("click", () => {
        const x = b.dataset.i!;
        document.querySelectorAll(".tchip").forEach((c) => c.classList.remove("sel", "down", "up"));
        b.classList.add("sel");
        for (const d of g.reads.get(x) ?? []) document.querySelector(`.tchip[data-i="${CSS.escape(d)}"]`)?.classList.add("down");
        for (const u of g.readers.get(x) ?? []) document.querySelector(`.tchip[data-i="${CSS.escape(u)}"]`)?.classList.add("up");
        const it = byIdent.get(x)!;
        const ps = g.reach.get(x) ?? new Set<string>();
        panel.hidden = false;
        panel.innerHTML = html`<p class="eyebrow">${KIND_SHORT[it.kind]} · ${it.id}</p><h2><a href="#/item/${it.id}">${it.name}</a></h2>
          <p class="sub">${String(it.meaning ?? "").slice(0, 300)}</p>
          <p>Read by: ${[...ps].map((p) => html`<span class="lg"><i style="background:${COLOR[p]}"></i>${PROGRAM_SHORT[p] ?? p}</span> `)}</p>`.s;
        panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }));
    },
  };
}
