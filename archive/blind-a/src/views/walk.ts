/* D. Walk-through: one determination for one person in a stored household. */
import { D, E, byIdent, caseById, evalIn, explainIn, fmtValue, money, personLabel, report } from "../data";
import { missingFacts, narrativeLines, type TraceNode } from "../../../../src/engine/explain";
import { makeCase } from "../../../../src/engine/evaluate";
import { caseToSpec, type HouseholdCase } from "../../../../src/engine/cases";
import { badges, caseLink, html, itemLink, kindTag, linkEnglish, linkRefs, raw, section, sourceChip, type Raw } from "../ui";
import type { View } from "../main";

const ORIGIN: Record<string, string> = {
  case: "stated", default: "stated (every month)", parameter: "figure", evaluated: "rule", memo: "rule (shown above)",
  missing: "not stated", "not-in-force": "rule not in force", "no-version": "no figure in force",
};

let nodes: TraceNode[] = [];
function nid(n: TraceNode): number { nodes.push(n); return nodes.length - 1; }

export function walkView([cid, pid, ident]: string[], q: URLSearchParams): View {
  const c = caseById.get(cid);
  const it = byIdent.get(ident);
  if (!c || !it) return { title: "Not found", body: html`<section class="card"><h1>Not found</h1></section>` };
  const asOf = q.get("d") || c.as_of;
  const exp = report(c).results.find((r) => r.person === pid && r.identifier === ident && (!q.get("m") || r.month === q.get("m")));
  const month = q.get("m") || (q.get("d") ? null : exp?.month) || (it.scope === "person-month" || it.scope === "month" ? asOf.slice(0, 7) : null);
  nodes = [];
  const root = explainIn(E, c, ident, pid, month, asOf);
  const fmt = (v: unknown, n: TraceNode) => fmtValue(v, byIdent.get(n.identifier));
  const lines = narrativeLines(root, fmt, { person: (p) => (p === pid ? "this person" : `${p}`) });
  const missing = root.value === null ? missingFacts(root) : [];
  const changedDate = asOf !== c.as_of;
  // Incomes this determination actually read come first; the rest follow.
  const read = new Set<string>();
  const collect = (n: TraceNode) => { read.add(n.identifier + "|" + (n.person ?? "")); n.children.forEach(collect); };
  collect(root);
  const incomes = incomeFacts(c).sort((a, b) =>
    Number(read.has(b.ident + "|" + b.person) && b.now > 0) - Number(read.has(a.ident + "|" + a.person) && a.now > 0) ||
    Number(read.has(b.ident + "|" + b.person)) - Number(read.has(a.ident + "|" + a.person)) ||
    Number(b.person === pid) - Number(a.person === pid) || b.now - a.now);
  const pick = incomes[0];

  return {
    title: `${it.name}: ${cid} ${pid}`,
    body: html`<div class="page walk">
      <p class="eyebrow">Walk-through · household ${caseLink(cid)} · ${pid} <span class="sub">${personLabel(cid, pid)}</span></p>
      <h1>${it.name}</h1>
      <p>${badges(it, { compact: true })}</p>
      <div class="verdict">
        <div><span class="sub">Result${month ? ` for ${month}` : ""}, as of ${asOf}</span><b>${fmtValue(root.value, it)}</b></div>
        ${exp && !changedDate ? html`<div><span class="sub">The stored case expects</span><b class="${exp.ok ? "ok" : "bad"}">${fmtValue(exp.expect, it)}</b></div>` : ""}
        ${changedDate ? html`<div class="warn">Re-run as of <b>${asOf}</b> instead of the household's own date (${c.as_of}).</div>` : ""}
      </div>
      <form class="toolbar" id="asof">
        <label>As of <input type="date" id="d" value="${asOf}"></label>
        ${month ? html`<label>Month <input type="month" id="m" value="${month}"></label>` : ""}
        <button class="btn">Re-run</button>
        ${changedDate || q.get("m") ? html`<a class="btn" href="#/walk/${cid}/${pid}/${ident}">Back to the household's date</a>` : ""}
        <button type="button" class="btn" id="print">Print the record</button>
      </form>

      ${section("Why, in short", html`
        <ol class="story">${lines.filter((l) => l.kind !== "override").map((l) => l.kind === "more"
          ? html`<li class="more">${l.text}</li>`
          : html`<li class="d${l.depth}">${l.depth ? html`<span class="sub">because </span>` : ""}${l.node && l.node.person && l.node.person !== pid ? html`<b>${l.node.person}</b>: ` : ""}${itemLink(byIdent.get(l.node!.identifier), l.node!.name)} is <b>${fmt(l.node!.value, l.node!)}</b>${l.node!.month ? html` <span class="sub">${l.node!.month}</span>` : ""}</li>`)}</ol>
        ${lines.filter((l) => l.kind === "override").map((l) => html`<div class="callout override-box">${linkRefs(l.text)}</div>`)}
        ${missing.length ? html`<div class="warn"><b>Cannot determine.</b> These facts were never stated: ${missing.map((m) => html`${itemLink(byIdent.get(m.identifier))} (${m.person ?? "household"}) `)}</div>` : ""}
        ${root.error ? html`<p class="warn">${root.error}</p>` : ""}
      `)}

      ${section("More income?", incomes.length ? html`
        <p class="help">Finds the smallest monthly raise in one stated income that changes this result, re-running this stored household only, and shows the steps that would flip.</p>
        <form class="toolbar" id="raise">
          <label>Raise <select id="inc">${incomes.map((x, i) => html`<option value="${i}" ${x === pick ? raw("selected") : ""}>${x.person}: ${byIdent.get(x.ident)?.name} (now ${money(x.now)})${read.has(x.ident + "|" + x.person) ? "" : " (not read by this result)"}</option>`)}</select></label>
          <label>up to <select id="cap"><option>2000</option><option selected>5000</option><option>10000</option></select> a month</label>
          <button class="btn primary">Find the tipping point</button>
        </form>
        <div id="raise-out" aria-live="polite"></div>` : html`<p>No income is stated for anyone in this household, so there is nothing to raise.</p>`)}

      ${section("Every step", html`
        <p class="help">The full reasoning in evaluation order. The path that decided the result is open and marked; open any other step to see it. Each step shows its rule and sources.</p>
        <ul class="trace">${nodeRow(root, 0, true)}</ul>`)}

      <p class="sub stamp">Record: household ${cid} (${c.title}), person ${pid}, ${it.identifier}${month ? ` for ${month}` : ""}, determination date ${asOf}. Codex commit ${D.sha}, data built ${D.built.slice(0, 10)}.</p>
    </div>`,
    after: () => wire(c, pid, ident, month, asOf, incomes),
  };
}

function nodeRow(n: TraceNode, depth: number, onPath: boolean): Raw {
  const it = byIdent.get(n.identifier);
  const open = onPath && depth < 3 && n.children.length > 0;
  const id = nid(n);
  const head = html`${it ? kindTag(it) : ""} ${itemLink(it, n.name)}
    ${n.person ? html`<span class="tag">${n.person}</span>` : ""}${n.month ? html`<span class="tag">${n.month}</span>` : ""}
    <b class="v ${n.value === null ? "unk" : ""}">${fmtValue(n.value, it)}</b>
    <span class="origin">${ORIGIN[n.origin] ?? n.origin}</span>
    ${n.decisive ? html`<span class="pill dec" title="This step settled the step above it">decided it</span>` : ""}
    ${n.override ? html`<span class="badge b-override">Statute over rule</span>` : ""}
    ${n.warnings?.length ? html`<span class="pill warn" title="${n.warnings.join("; ")}">warning</span>` : ""}`;
  const body = html`${n.rule ? html`<div class="rule small">${n.rule.map((l) => html`<div class="rl" style="padding-left:${(l.match(/^ */)?.[0].length ?? 0) * 0.6}em">${linkEnglish(l.trim(), it ? E.usesOfItem(it.identifier) : [])}</div>`)}</div>` : ""}
    ${n.sources.length ? html`<p class="srcs">${n.sources.map((s) => sourceChip(s))}</p>` : ""}
    ${n.override ? html`<p class="callout override-box">${linkRefs(n.override)}</p>` : ""}`;
  if (!n.children.length) {
    return html`<li class="leafnode ${n.decisive ? "decisive" : ""}"><div class="row">${head}</div>${n.sources.length || n.override ? html`<details class="mini"><summary>sources</summary>${body}</details>` : ""}</li>`;
  }
  const kidsHtml = open ? html`<ul class="trace">${n.children.map((k) => nodeRow(k, depth + 1, !!k.decisive || n.children.every((x) => !x.decisive)))}</ul>` : html`<ul class="trace lazy" data-node="${id}" data-depth="${depth + 1}"></ul>`;
  return html`<li class="${n.decisive || depth === 0 ? "decisive" : ""}"><details ${open ? raw("open") : ""} data-node="${id}"><summary><div class="row">${head}</div></summary>${body}${kidsHtml}</details></li>`;
}

// -------------------------------------------------------- more income?
interface Income { person: string; ident: string; now: number }
function incomeFacts(c: HouseholdCase): Income[] {
  const out: Income[] = [];
  const isIncome = (k: string) => {
    const it = byIdent.get(k);
    return !!it && it.kind === "supplied" && it.type === "money" && ((it.tags ?? []).includes("income") || /wage|income|earn|salary|benefit|pension|support/.test(k)) && !/expense|cost|paid|premium|resource|value|balance/.test(k);
  };
  for (const [p, spec] of Object.entries(c.persons)) {
    const seen = new Map<string, number>();
    for (const [k, v] of Object.entries(spec.facts ?? {})) if (isIncome(k) && typeof v === "number") seen.set(k, v);
    for (const [k, v] of Object.entries(spec.month_defaults ?? {})) if (isIncome(k) && typeof v === "number") seen.set(k, v);
    for (const mv of Object.values(spec.months ?? {})) for (const [k, v] of Object.entries(mv)) if (isIncome(k) && typeof v === "number") seen.set(k, Math.max(v, seen.get(k) ?? 0));
    for (const [k, v] of seen) out.push({ person: p, ident: k, now: v });
  }
  return out.sort((a, b) => b.now - a.now);
}
function withRaise(c: HouseholdCase, inc: Income, delta: number): HouseholdCase {
  const x = JSON.parse(JSON.stringify(c)) as HouseholdCase;
  const p = x.persons[inc.person];
  if (p.facts && typeof p.facts[inc.ident] === "number") (p.facts[inc.ident] as number) += delta;
  if (p.month_defaults && typeof p.month_defaults[inc.ident] === "number") (p.month_defaults[inc.ident] as number) += delta;
  for (const mv of Object.values(p.months ?? {})) if (typeof mv[inc.ident] === "number") (mv[inc.ident] as number) += delta;
  return x;
}
function valueWith(c: HouseholdCase, ident: string, pid: string, month: string | null, asOf: string): unknown {
  const spec = caseToSpec(c);
  spec.as_of = asOf;
  return evalIn(E, makeCase(E.index, spec), ident, pid, month);
}
function flatten(n: TraceNode, out = new Map<string, TraceNode>()): Map<string, TraceNode> {
  if (!out.has(n.key)) out.set(n.key, n);
  for (const k of n.children) flatten(k, out);
  return out;
}
function tippingPoint(c: HouseholdCase, inc: Income, ident: string, pid: string, month: string | null, asOf: string, cap: number): Raw {
  const base = JSON.stringify(valueWith(c, ident, pid, month, asOf));
  const steps = [10, 25, 50, 100, 150, 200, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 7500, 10000].filter((s) => s <= cap);
  let lo = 0, hi = -1;
  for (const s of steps) {
    if (JSON.stringify(valueWith(withRaise(c, inc, s), ident, pid, month, asOf)) !== base) { hi = s; break; }
    lo = s;
  }
  const it = byIdent.get(ident);
  if (hi < 0) return html`<p>No raise up to ${money(cap)} a month in ${byIdent.get(inc.ident)?.name} changes this result: it stays <b>${fmtValue(JSON.parse(base), it)}</b>.</p>`;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (JSON.stringify(valueWith(withRaise(c, inc, mid), ident, pid, month, asOf)) !== base) hi = mid; else lo = mid;
  }
  const before = explainIn(E, c, ident, pid, month, asOf);
  const after = explainIn(E, withRaise(c, inc, hi), ident, pid, month, asOf);
  const a = flatten(before);
  const b = flatten(after);
  const depthOf = new Map<string, number>();
  const walkD = (n: TraceNode, d: number) => { if (!depthOf.has(n.key) || depthOf.get(n.key)! < d) depthOf.set(n.key, d); n.children.forEach((k) => walkD(k, d + 1)); };
  walkD(after, 0);
  const changed = [...b.values()].filter((n) => n.kind !== "supplied" && a.has(n.key) && JSON.stringify(a.get(n.key)!.value) !== JSON.stringify(n.value))
    .sort((x, y) => (depthOf.get(y.key) ?? 0) - (depthOf.get(x.key) ?? 0));
  const first = changed.find((n) => n.kind === "derived" && n.value !== null && typeof n.value !== "number") ?? changed[0];
  return html`<p>At <b>${money(inc.now + hi)}</b> a month (${money(hi)} more than the ${money(inc.now)} stated for ${inc.person}), the result changes from <b>${fmtValue(JSON.parse(base), it)}</b> to <b>${fmtValue(after.value, it)}</b>.</p>
    ${first ? html`<p class="callout">The first test that flips: ${itemLink(byIdent.get(first.identifier), first.name)}${first.person ? ` (${first.person})` : ""} goes from <b>${fmtValue(a.get(first.key)!.value, byIdent.get(first.identifier))}</b> to <b>${fmtValue(first.value, byIdent.get(first.identifier))}</b>.</p>` : ""}
    <details open><summary>Every step that changes, from the income up to the result (${changed.length})</summary>
    <table class="list diff"><thead><tr><th>Step</th><th>Now</th><th>With the raise</th></tr></thead><tbody>
    ${changed.slice(0, 60).map((n) => html`<tr class="${n === first ? "first" : ""}"><td>${itemLink(byIdent.get(n.identifier), n.name)} ${n.person ? html`<span class="tag">${n.person}</span>` : ""}${n.month ? html`<span class="tag">${n.month}</span>` : ""}</td>
      <td class="before">${fmtValue(a.get(n.key)!.value, byIdent.get(n.identifier))}</td><td class="after">${fmtValue(n.value, byIdent.get(n.identifier))}</td></tr>`)}
    </tbody></table></details>
    <p class="sub">${money(hi - 1 + inc.now)} a month still gives ${fmtValue(JSON.parse(base), it)}. Only this household's stated income was changed; nothing is saved.</p>`;
}

function wire(c: HouseholdCase, pid: string, ident: string, month: string | null, asOf: string, incomes: Income[]): void {
  document.getElementById("asof")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = (document.getElementById("d") as HTMLInputElement).value;
    let m = (document.getElementById("m") as HTMLInputElement | null)?.value;
    // A new date with the month left alone means "that date's month".
    if (m && d && d !== asOf && m === month) m = d.slice(0, 7);
    const qs = new URLSearchParams();
    if (d && d !== c.as_of) qs.set("d", d);
    if (m) qs.set("m", m);
    location.hash = `#/walk/${c.id}/${pid}/${ident}?${qs}`;
  });
  document.getElementById("print")?.addEventListener("click", () => window.print());
  document.getElementById("raise")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const inc = incomes[Number((document.getElementById("inc") as HTMLSelectElement).value)];
    const cap = Number((document.getElementById("cap") as HTMLSelectElement).value);
    const out = document.getElementById("raise-out")!;
    out.innerHTML = `<p class="note">Re-running household ${c.id} with higher income…</p>`;
    setTimeout(() => { out.innerHTML = tippingPoint(c, inc, ident, pid, month, asOf, cap).s; }, 20);
  });
  document.querySelector(".walk")?.addEventListener("toggle", (ev) => {
    const d = ev.target as HTMLDetailsElement;
    if (!d.open || !d.dataset.node) return;
    const ul = d.querySelector(":scope > ul.lazy") as HTMLElement | null;
    if (!ul || ul.dataset.loaded) return;
    ul.dataset.loaded = "1";
    const n = nodes[Number(ul.dataset.node)];
    const depth = Number(ul.dataset.depth);
    ul.innerHTML = n.children.map((k) => nodeRow(k, depth, false).s).join("");
  }, true);
}
