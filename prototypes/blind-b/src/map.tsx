/* Map: programs at the top; below them, the rules, figures, program facts and
 * shared primitives they read (directly or through other rules). Items two or
 * more programs read sit in a shared band under the programs that read them;
 * items one program reads sit in that program's column, and every one of them
 * can be shown. Selecting a program or a node draws its lines and opens its
 * details. One outcome's whole dependency set can be traced in steps. */
import { useMemo, useState } from "preact/hooks";
import { D, E, byIdent, KIND, PROGRAMS, PROGRAM_ORDER, firstSentence, type CItem } from "./store";
import { href, go, route, setQ } from "./ui";

/* Categorical slots in fixed order (a validated palette, light surface). */
const COLOR: Record<string, string> = {
  Medicaid: "#2a78d6", "CHP+": "#6250d6", SNAP: "#eb6834", ColoradoWorks: "#1baf7a",
  AdultFinancial: "#eda100", CCCAP: "#e87ba4", LEAP: "#008300", SunBucks: "#e34948",
};
/* One hue, light to dark, for how many programs read a node. */
const SHARE = ["#ffffff", "#ffffff", "#e3f0f1", "#c3e0e1", "#9bcace", "#6eafb5", "#3e8f97", "#1c6f7a", "#0d5c6e"];
const inkOn = (n: number) => (n >= 6 ? "#ffffff" : "#1c2330");

type Band = "rule" | "figure" | "fact" | "primitive";
const BANDS: Band[] = ["rule", "figure", "fact", "primitive"];
const BAND_LABEL: Record<Band, string> = { rule: "Rules", figure: "Figures", fact: "Program facts", primitive: "Shared primitives" };
const BAND_HELP: Record<Band, string> = {
  rule: "derived items that turn facts into answers",
  figure: "dated limits, standards and percentages",
  fact: "facts a program's own chapter defines",
  primitive: "neutral facts in the shared chapter: dates, amounts, relationships, statuses",
};
const bandOf = (it: CItem): Band => (it.kind === "derived" ? "rule" : it.kind === "parameter" ? "figure" : it.program === "All" ? "primitive" : "fact");

interface Graph { reads: Map<string, string[]>; readers: Map<string, string[]>; reach: Map<string, Set<string>>; outcomes: Map<string, string[]> }
let G: Graph | null = null;
function graph(): Graph {
  if (G) return G;
  const reads = new Map<string, string[]>();
  const readers = new Map<string, string[]>();
  for (const it of D.items) {
    const r = E.usesOfItem(it.identifier);
    reads.set(it.identifier, r);
    for (const x of r) { if (!readers.has(x)) readers.set(x, []); readers.get(x)!.push(it.identifier); }
  }
  const reach = new Map<string, Set<string>>();
  const outcomes = new Map<string, string[]>();
  for (const p of D.meta.programs ?? []) {
    if (!PROGRAM_ORDER.includes(p.id)) continue;
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
const shareN = (ps: Set<string> | undefined, family: boolean) =>
  !ps ? 0 : ps.size - (family && ps.has("Medicaid") && ps.has("CHP+") ? 1 : 0);
const short = (p: string) => PROGRAMS[p]?.short ?? p;
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/* ---------- geometry ---------- */
const W = 1120, PAD = 10, PROG_H = 70, HEAD = 30;
const NW = 174, NH = 34, GX = 8, GY = 8;
const PER_ROW = Math.floor((W - 2 * PAD + GX) / (NW + GX));
const COL_W = (W - 2 * PAD) / PROGRAM_ORDER.length;
const OWN_H = 20, OWN_SHOW = 8;
const progX = (p: string) => PAD + PROGRAM_ORDER.indexOf(p) * COL_W + COL_W / 2;

interface Node { it: CItem; ps: Set<string>; n: number; band: Band; x: number; y: number; w: number; h: number; own?: string }

function layout(min: number, family: boolean, kinds: Set<Band>, showOwn: boolean, open: Set<string>) {
  const g = graph();
  const shared = new Map<Band, Node[]>(BANDS.map((b) => [b, []]));
  const own = new Map<string, Node[]>(); // key band|program
  for (const [ident, ps] of g.reach) {
    const it = byIdent.get(ident);
    if (!it) continue;
    const band = bandOf(it);
    if (!kinds.has(band)) continue;
    const n = shareN(ps, family);
    const node: Node = { it, ps, n, band, x: 0, y: 0, w: NW, h: NH };
    if (n >= 2 && n >= min) shared.get(band)!.push(node);
    else if (n <= 1) {
      // One program, or Medicaid and CHP+ together when counted as one family (Medicaid's column).
      const p = PROGRAM_ORDER.find((x) => ps.has(x))!;
      const k = band + "|" + p;
      if (!own.has(k)) own.set(k, []);
      own.get(k)!.push({ ...node, own: p, w: COL_W - 8, h: OWN_H - 3 });
    }
  }
  const nodes: Node[] = [];
  const bands: Array<{ band: Band; top: number; bottom: number; shared: number; own: number }> = [];
  const more: Array<{ key: string; x: number; y: number; hidden: number; open: boolean }> = [];
  let y = PAD + PROG_H + 22;
  for (const b of BANDS) {
    if (!kinds.has(b)) continue;
    const top = y;
    y += HEAD;
    const list = shared.get(b)!;
    const bary = (ps: Set<string>) => [...ps].reduce((s, p) => s + PROGRAM_ORDER.indexOf(p), 0) / Math.max(1, ps.size);
    list.sort((a, c) => bary(a.ps) - bary(c.ps) || c.n - a.n || a.it.name.localeCompare(c.it.name));
    list.forEach((nd, i) => { nd.x = PAD + (i % PER_ROW) * (NW + GX); nd.y = y + Math.floor(i / PER_ROW) * (NH + GY); });
    y += Math.ceil(list.length / PER_ROW) * (NH + GY);
    nodes.push(...list);
    let ownCount = 0;
    if (showOwn) {
      y += list.length ? 8 : 0;
      let colBottom = y;
      for (const p of PROGRAM_ORDER) {
        const k = b + "|" + p;
        const mine = (own.get(k) ?? []).sort((a, c) => a.it.name.localeCompare(c.it.name));
        ownCount += mine.length;
        const isOpen = open.has(k);
        const shown = isOpen ? mine : mine.slice(0, OWN_SHOW);
        const x = PAD + PROGRAM_ORDER.indexOf(p) * COL_W + 4;
        shown.forEach((nd, i) => { nd.x = x; nd.y = y + i * OWN_H; });
        nodes.push(...shown);
        let bottom = y + shown.length * OWN_H;
        if (mine.length > OWN_SHOW) { more.push({ key: k, x, y: bottom + 2, hidden: mine.length - OWN_SHOW, open: isOpen }); bottom += 22; }
        colBottom = Math.max(colBottom, bottom);
      }
      y = colBottom;
    } else {
      for (const p of PROGRAM_ORDER) ownCount += own.get(b + "|" + p)?.length ?? 0;
    }
    y += 14;
    bands.push({ band: b, top, bottom: y, shared: list.length, own: ownCount });
    y += 6;
  }
  const ownTotals = new Map<string, number>(PROGRAM_ORDER.map((p) => [p, BANDS.reduce((s, b) => s + (own.get(b + "|" + p)?.length ?? 0), 0)]));
  return { nodes, bands, more, height: y + PAD, ownTotals };
}

const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const my = (y1 + y2) / 2;
  return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
};

function Marks({ ps, x, y }: { ps: Set<string>; x: number; y: number }) {
  return <>{PROGRAM_ORDER.map((p, i) => {
    const on = ps.has(p);
    return <rect x={x + i * 7} y={y} width={5} height={5} rx={1} fill={on ? COLOR[p] : "#fff"} stroke={on ? COLOR[p] : "#c9c3b2"} stroke-width={on ? 0 : 0.8} />;
  })}</>;
}

export function Legend({ family }: { family: boolean }) {
  return (
    <div class="map-legend small">
      <span class="muted">Programs, in mark order:</span>
      {PROGRAM_ORDER.map((p) => <span class="lg"><i style={`background:${COLOR[p]}`} />{short(p)}</span>)}
      <span class="muted">· Read by:</span>
      {[2, 3, 4, 5, 6, 7].map((n) => <span class="lg"><i style={`background:${SHARE[n]};border:1px solid #c9c3b2`} />{n}{n === 7 ? "+" : ""}</span>)}
      {family && <span class="muted">· Medicaid and CHP+ count as one family</span>}
    </div>
  );
}

type Sel = { kind: "p"; id: string } | { kind: "n"; id: string } | null;

export function MapPage() {
  const q = route.value.q;
  const min = Math.max(1, Number(q.min ?? 3) || 3);
  const family = q.family !== "0";
  const showOwn = q.own === "1" || min === 1;
  const kinds = new Set<Band>((q.show ?? BANDS.join(",")).split(",").filter((b): b is Band => (BANDS as string[]).includes(b)));
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<Sel>(null);
  const [find, setFind] = useState("");
  const g = graph();
  const L = useMemo(() => layout(min, family, kinds, showOwn, open), [min, family, q.show, showOwn, open]);
  const at = useMemo(() => new Map(L.nodes.map((n) => [n.it.identifier, n])), [L]);

  const findHits = useMemo(() => {
    const t = find.trim().toLowerCase();
    if (t.length < 2) return new Set<string>();
    return new Set(L.nodes.filter((n) => n.it.name.toLowerCase().includes(t) || n.it.identifier.includes(t) || n.it.id.toLowerCase() === t).map((n) => n.it.identifier));
  }, [find, L]);

  // What the selection keeps lit, and its lines.
  let lit: Set<string> | null = null, litP: Set<string> | null = null;
  const lines: Array<{ d: string; color: string; w: number; op: number }> = [];
  if (sel?.kind === "p") {
    const mine = L.nodes.filter((n) => n.ps.has(sel.id));
    lit = new Set(mine.map((n) => n.it.identifier)); litP = new Set([sel.id]);
    for (const n of mine) lines.push({ d: curve(progX(sel.id), PAD + PROG_H, n.x + n.w / 2, n.y), color: COLOR[sel.id], w: 1.1, op: n.own ? 0.18 : 0.45 });
  } else if (sel?.kind === "n") {
    const n = at.get(sel.id);
    if (n) {
      lit = new Set([sel.id]); litP = new Set(n.ps);
      for (const p of n.ps) lines.push({ d: curve(progX(p), PAD + PROG_H, n.x + n.w / 2, n.y), color: COLOR[p], w: 1.6, op: 0.6 });
      for (const d of g.reads.get(sel.id) ?? []) { const m = at.get(d); if (m) { lit.add(d); lines.push({ d: curve(n.x + n.w / 2, n.y + n.h, m.x + m.w / 2, m.y), color: "#1c2330", w: 1.2, op: 0.55 }); } }
      for (const u of g.readers.get(sel.id) ?? []) { const m = at.get(u); if (m) { lit.add(u); lines.push({ d: curve(m.x + m.w / 2, m.y + m.h, n.x + n.w / 2, n.y), color: "#6b7385", w: 1.2, op: 0.5 }); } }
    }
  }
  const dimN = (id: string) => (findHits.size ? !findHits.has(id) : lit ? !lit.has(id) : false);

  const download = () => {
    const svg = document.getElementById("mapsvg");
    if (!svg) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svg.outerHTML], { type: "image/svg+xml" }));
    a.download = "colorado-rulebook-map.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const toggleOpen = (k: string) => { const s = new Set(open); s.has(k) ? s.delete(k) : s.add(k); setOpen(s); };
  const sharedTotal = L.bands.reduce((s, b) => s + b.shared, 0);
  const ownTotal = L.bands.reduce((s, b) => s + b.own, 0);

  return (
    <div class="mappage">
      <p class="eyebrow">Map</p>
      <h1>What each program reads, and what they share</h1>
      <p class="lede">Programs across the top. Below them, in four bands, every rule, figure, program fact and shared primitive a program's outcomes read, directly or through other rules.
        Items two or more programs read sit in each band's shared row, darker the more programs read them; the strip of marks on each shows which ones.
        Items only one program reads sit in that program's column{showOwn ? "" : " (turn on “Show items only one program reads” to list them)"}. Select a program or a node to draw its lines.</p>
      <div class="map-tools">
        <label>Shared row: read by at least{" "}
          <select value={String(Math.max(2, min))} onChange={(e) => setQ({ min: (e.target as HTMLSelectElement).value })}>
            {[2, 3, 4, 5, 6].map((n) => <option value={String(n)}>{n} programs</option>)}
          </select>
        </label>
        <label class="chk"><input type="checkbox" checked={showOwn} onChange={(e) => setQ({ own: (e.target as HTMLInputElement).checked ? "1" : "0", min: min === 1 ? "2" : undefined })} /> Show items only one program reads</label>
        <label class="chk"><input type="checkbox" checked={family} onChange={(e) => setQ({ family: (e.target as HTMLInputElement).checked ? "1" : "0" })} /> Count Medicaid and CHP+ as one</label>
        {BANDS.map((b) => <label class="chk"><input type="checkbox" checked={kinds.has(b)} onChange={(e) => {
          const s = new Set(kinds); (e.target as HTMLInputElement).checked ? s.add(b) : s.delete(b);
          setQ({ show: [...s].join(",") || "rule" });
        }} /> {BAND_LABEL[b]}</label>)}
      </div>
      <div class="map-tools">
        <input type="search" placeholder="Find on the map…" aria-label="Find on the map" value={find} onInput={(e) => setFind((e.target as HTMLInputElement).value)} />
        {find.trim().length >= 2 && <span class="small muted">{findHits.size} on the map{findHits.size === 0 && !showOwn ? " (it may be read by one program only: turn on the columns)" : ""}</span>}
        <select aria-label="Trace one outcome" value="" onChange={(e) => { const v = (e.target as HTMLSelectElement).value; if (v) go("map/outcome/" + encodeURIComponent(v)); }}>
          <option value="">Trace one outcome…</option>
          {PROGRAM_ORDER.map((p) => <optgroup label={PROGRAMS[p]?.label ?? p}>{(g.outcomes.get(p) ?? []).map((o) => <option value={o}>{byIdent.get(o)?.name ?? o}</option>)}</optgroup>)}
        </select>
        <button class="btn small" onClick={download}>Download SVG</button>
        <span class="small muted">{sharedTotal} shared{showOwn ? ` · ${ownTotal} single-program` : ""} on the map</span>
      </div>
      <Legend family={family} />
      <div class="map-wrap">
        <svg id="mapsvg" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${L.height}`} width={W} height={L.height} role="img"
          aria-label="Programs and the rules, figures, facts and primitives they read" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          onClick={(e) => { if ((e.target as Element).tagName === "svg") setSel(null); }}>
          <rect width={W} height={L.height} fill="#f6f4ee" />
          {L.bands.map((b) => <g>
            <rect x={PAD - 6} y={b.top} width={W - 2 * PAD + 12} height={b.bottom - b.top} rx={10} fill="#fffefb" stroke="#e0dccf" />
            <text x={PAD + 4} y={b.top + 20} font-size={14} font-weight={700} fill="#1c2330">{BAND_LABEL[b.band]}
              <tspan font-weight={400} fill="#6b7385" font-size={12}>{`  ${b.shared} shared · ${b.own} single-program · ${BAND_HELP[b.band]}`}</tspan></text>
          </g>)}
          <g>{lines.map((l) => <path d={l.d} fill="none" stroke={l.color} stroke-width={l.w} opacity={l.op} />)}</g>
          {PROGRAM_ORDER.map((p, i) => {
            const x = PAD + i * COL_W + 4, w = COL_W - 8;
            const dim = litP ? !litP.has(p) : false;
            return <g class="mp" tabIndex={0} role="button" aria-label={PROGRAMS[p]?.label ?? p} opacity={dim ? 0.35 : 1} style="cursor:pointer"
              onClick={() => setSel({ kind: "p", id: p })} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel({ kind: "p", id: p }); } }}>
              <rect x={x} y={PAD} width={w} height={PROG_H} rx={10} fill="#fffefb" stroke={sel?.kind === "p" && sel.id === p ? "#0d5c6e" : "#c9c3b2"} stroke-width={sel?.kind === "p" && sel.id === p ? 2.5 : 1} />
              <rect x={x} y={PAD} width={w} height={6} rx={3} fill={COLOR[p]} />
              <text x={x + 9} y={PAD + 26} font-size={14} font-weight={700} fill="#1c2330">{short(p)}</text>
              <text x={x + 9} y={PAD + 44} font-size={11} fill="#4a5364">{(g.outcomes.get(p) ?? []).length} outcomes</text>
              <text x={x + 9} y={PAD + 59} font-size={11} fill="#6b7385">{family && (p === "Medicaid" || p === "CHP+") ? `${L.ownTotals.get(p)} in its column` : `${L.ownTotals.get(p)} read by it alone`}</text>
            </g>;
          })}
          {L.nodes.map((n) => {
            const own = !!n.own;
            const fill = own ? "#ffffff" : SHARE[Math.min(n.n, 8)];
            const ink = own ? "#1c2330" : inkOn(n.n);
            const isSel = sel?.kind === "n" && sel.id === n.it.identifier;
            const select = () => setSel({ kind: "n", id: n.it.identifier });
            return <g class="mn" tabIndex={0} role="button" aria-label={`${n.it.name}, read by ${[...n.ps].map(short).join(", ")}`} opacity={dimN(n.it.identifier) ? 0.18 : 1} style="cursor:pointer"
              onClick={select} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } }}>
              <title>{`${n.it.name} (${n.it.id}) · ${KIND[n.it.kind]?.one ?? n.it.kind} · read by ${[...n.ps].map(short).join(", ")}`}</title>
              {own ? <>
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={4} fill={fill} stroke={isSel ? "#0d5c6e" : COLOR[n.own!]} stroke-opacity={isSel ? 1 : 0.45} stroke-width={isSel ? 2 : 1} />
                <text x={n.x + 5} y={n.y + 12} font-size={10} fill={ink}>{trunc(n.it.name, 24)}</text>
              </> : <>
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={6} fill={fill} stroke={isSel ? "#0d5c6e" : "#c9c3b2"} stroke-width={isSel ? 2.5 : 1} />
                <text x={n.x + 7} y={n.y + 14} font-size={11.5} fill={ink}>{trunc(n.it.name, 28)}</text>
                <Marks ps={n.ps} x={n.x + 7} y={n.y + 21} />
                <text x={n.x + n.w - 7} y={n.y + 27} font-size={11} font-weight={700} fill={ink} text-anchor="end">{`×${n.n}`}</text>
              </>}
            </g>;
          })}
          {L.more.map((m) => <g style="cursor:pointer" role="button" tabIndex={0} onClick={() => toggleOpen(m.key)} onKeyDown={(e) => { if (e.key === "Enter") toggleOpen(m.key); }}>
            <text x={m.x + 5} y={m.y + 13} font-size={11} font-weight={600} fill="#0d5c6e">{m.open ? "Show fewer" : `+ ${m.hidden} more`}</text>
          </g>)}
        </svg>
      </div>
      {sel && <SelPanel sel={sel} onClose={() => setSel(null)} at={at} />}
      <details class="fold"><summary><span class="fold-t">The same items as a table</span><span class="fold-c">{L.nodes.length}</span></summary>
        <div class="fold-b tablewrap"><table class="outs"><thead><tr><th>Item</th><th>Band</th><th>Programs</th><th>Read by</th></tr></thead><tbody>
          {[...L.nodes].sort((a, b) => b.n - a.n || a.it.name.localeCompare(b.it.name)).map((n) => <tr><td><a href={href("item/" + n.it.id)}>{n.it.name}</a> <span class="small muted">{n.it.id}</span></td><td>{BAND_LABEL[n.band]}</td><td>{n.n}</td><td>{[...n.ps].map(short).join(", ")}</td></tr>)}
        </tbody></table></div>
      </details>
    </div>
  );
}

function SelPanel({ sel, onClose, at }: { sel: NonNullable<Sel>; onClose: () => void; at: Map<string, Node> }) {
  const g = graph();
  const link = (x: string) => { const t = byIdent.get(x); return t ? <li><a href={href("item/" + t.id)}>{t.name}</a> <span class="small muted">{KIND[t.kind]?.one}{at.has(x) && (at.get(x)!.n >= 2) ? " · shared" : ""}</span></li> : <li>{x}</li>; };
  if (sel.kind === "p") {
    const p = sel.id;
    const others = new Map<string, number>();
    for (const n of at.values()) if (n.ps.has(p) && !n.own) for (const o of n.ps) if (o !== p) others.set(o, (others.get(o) ?? 0) + 1);
    return <aside class="map-panel" role="dialog" aria-label={PROGRAMS[p]?.label}>
      <button class="close" onClick={onClose} aria-label="Close">×</button>
      <h2>{PROGRAMS[p]?.label ?? p}</h2>
      <h3>Shares most with</h3>
      <ul class="plain">{[...others].sort((a, b) => b[1] - a[1]).map(([o, c]) => <li><span class="lg"><i style={`background:${COLOR[o]}`} />{short(o)}</span>: {c} shared items on the map</li>)}</ul>
      <h3>Outcomes</h3>
      <ul class="plain">{(g.outcomes.get(p) ?? []).map((o) => <li><a href={href("map/outcome/" + encodeURIComponent(o))}>{byIdent.get(o)?.name ?? o}</a></li>)}</ul>
    </aside>;
  }
  const it = byIdent.get(sel.id)!;
  const ps = g.reach.get(sel.id) ?? new Set<string>();
  const down = g.reads.get(sel.id) ?? [], up = g.readers.get(sel.id) ?? [];
  return <aside class="map-panel" role="dialog" aria-label={it.name}>
    <button class="close" onClick={onClose} aria-label="Close">×</button>
    <p class="eyebrow">{KIND[it.kind]?.one} · {it.id} · {short(it.program)} chapter</p>
    <h2><a href={href("item/" + it.id)}>{it.name}</a></h2>
    <p class="small">{firstSentence(it.meaning, 280)}</p>
    <h3>Read by {ps.size} program{ps.size === 1 ? "" : "s"}</h3>
    <p>{[...ps].map((p) => <span class="lg"><i style={`background:${COLOR[p]}`} />{short(p)} </span>)}</p>
    <h3>Reads {down.length}</h3><ul class="plain">{down.slice(0, 40).map(link)}</ul>
    <h3>Read by {up.length} item{up.length === 1 ? "" : "s"}</h3><ul class="plain">{up.slice(0, 40).map(link)}</ul>
  </aside>;
}

/* ---------- one outcome, in steps ---------- */
export function OutcomeMap({ ident }: { ident: string }) {
  const g = graph();
  const root = byIdent.get(ident);
  const family = route.value.q.family !== "0";
  const [sel, setSel] = useState<string | null>(null);
  if (!root) return <p class="empty">No such outcome. <a href={href("map")}>Back to the map</a></p>;
  const step = new Map<string, number>([[ident, 0]]);
  const queue = [ident];
  while (queue.length) {
    const x = queue.shift()!;
    for (const y of g.reads.get(x) ?? []) if (!step.has(y)) { step.set(y, step.get(x)! + 1); queue.push(y); }
  }
  const rows = new Map<number, CItem[]>();
  for (const [x, s] of step) { const it = byIdent.get(x); if (!it) continue; if (!rows.has(s)) rows.set(s, []); rows.get(s)!.push(it); }
  const shared = [...step.keys()].filter((x) => shareN(g.reach.get(x), family) > 1).length;
  const rank: Record<string, number> = { derived: 0, parameter: 1, supplied: 2 };
  const down = new Set(sel ? g.reads.get(sel) ?? [] : []), up = new Set(sel ? g.readers.get(sel) ?? [] : []);
  const prog = [...(g.reach.get(ident) ?? [])][0] ?? root.program;
  return (
    <div class="mappage">
      <p class="eyebrow"><a href={href("map")}>Map</a> · {PROGRAMS[prog]?.label ?? prog} outcome</p>
      <h1>{root.name}</h1>
      <p class="lede">Everything this outcome reads, in steps: step 1 is what it reads directly, step 2 what those read, and so on. {step.size} items; <b>{shared}</b> are also read by another program{family ? " (Medicaid and CHP+ counted as one)" : ""} and are tinted.
        Select an item to outline what it reads and underline what reads it.</p>
      <Legend family={family} />
      {[...rows.keys()].sort((a, b) => a - b).map((s) => <section class="card">
        <h2>{s === 0 ? "The outcome" : `Step ${s}`} <span class="small muted">{rows.get(s)!.length} items</span></h2>
        <div class="tchips">{rows.get(s)!.sort((a, b) => rank[a.kind] - rank[b.kind] || shareN(g.reach.get(b.identifier), family) - shareN(g.reach.get(a.identifier), family) || a.name.localeCompare(b.name)).map((it) => {
          const ps = g.reach.get(it.identifier) ?? new Set<string>();
          const n = shareN(ps, family);
          const cls = ["tchip", n > 1 ? "shared" : "", sel === it.identifier ? "sel" : "", down.has(it.identifier) ? "down" : "", up.has(it.identifier) ? "up" : ""].join(" ");
          return <button class={cls} style={n > 1 ? `background:${SHARE[Math.min(n, 8)]};color:${inkOn(n)}` : ""} title={`${it.name} · read by ${[...ps].map(short).join(", ")}`} onClick={() => setSel(it.identifier)}>
            <span class="tkind">{KIND[it.kind]?.one}</span> {trunc(it.name, 40)}
            <span class="tmarks">{PROGRAM_ORDER.map((p) => <i style={`background:${ps.has(p) ? COLOR[p] : "#fff"};border-color:${ps.has(p) ? COLOR[p] : "#c9c3b2"}`} />)}</span>
          </button>;
        })}</div>
      </section>)}
      {sel && <SelPanel sel={{ kind: "n", id: sel }} onClose={() => setSel(null)} at={new Map()} />}
    </div>
  );
}
