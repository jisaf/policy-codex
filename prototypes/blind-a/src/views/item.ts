/* B. Item: one rule, figure or fact. */
import {
  D, E, KIND_LABEL, PROGRAM_LABEL, SCOPE_LABEL, approvalsOf, byId, byIdent, caseById, caseData,
  casesReading, casesTouched, citedSources, directUnverified, englishOf, evalIn, fmtValue, impactOf,
  isOutcome, monthOf, noVersion, openQuestionsOf, personLabel, programOfOutcome, restsOnUnverified,
  status, type CItem,
} from "../data";
import {
  badges, caseLink, esc, html, itemLink, kindTag, linkEnglish, linkRefs, programTag, raw, section, sourceChip, type Raw,
} from "../ui";
import { add, beforeAfter, me, signedInTray, today } from "../proposal";
import { rerender, type View } from "../main";
import type { Item, ItemVersion } from "../../../../src/engine/types";

export function itemView([id]: string[], q: URLSearchParams): View {
  const it = byId.get(id) ?? byIdent.get(id);
  if (!it) return { title: "Not found", body: html`<section class="card"><h1>No item ${id}</h1></section>` };
  const ex = q.get("ex");
  const myRole = approvalsOf(it).includes(me.role);
  const signed = signedInTray(it.id, me.role);
  const blocked = restsOnUnverified(it);
  return {
    title: it.name,
    body: html`<div class="page item">
      <p class="eyebrow">${kindTag(it)} ${KIND_LABEL[it.kind]} · ${PROGRAM_LABEL[it.program] ?? it.program} · ${SCOPE_LABEL[it.scope] ?? it.scope}${it.type ? ` · ${it.type}` : ""}</p>
      <h1>${it.name}</h1>
      <p>${badges(it)}</p>
      <p class="sub">${it.id} · <code>${it.identifier}</code> · chapter ${it.chapter}${it.effective ? html` · in force ${it.effective.from} to ${it.effective.to}` : ""}</p>
      <div class="cols">
        <div class="maincol">
          ${meaning(it)}
          ${it.kind === "derived" ? decided(it, ex) : ""}
          ${it.kind === "parameter" ? figures(it) : ""}
          ${sourcesSection(it)}
          ${households(it)}
          ${affects(it)}
          ${questions(it)}
          ${tests(it)}
          ${engineer(it)}
        </div>
        <aside class="actions">
          <div class="card sticky">
            <h2>Sign-off</h2>
            <p>Status: <b>${status(it)}</b>. ${(it.approval ?? []).length ? "" : "No signatures yet."}</p>
            <p class="sub">Roles that must sign (approval policy${isOutcome(it) ? "" : ", upstream of outcomes"}):</p>
            <ul class="plain roles">${approvalsOf(it).map((r) => html`<li class="${r === me.role ? "me" : ""}">${r}${signedInTray(it.id, r) ? html` <span class="pill ok">in proposal</span>` : ""}</li>`)}</ul>
            ${blocked.length ? html`<p class="warn">Cannot move past Draft: rests on ${blocked.length} item${blocked.length > 1 ? "s" : ""} citing an unverified excerpt (${blocked.slice(0, 3).map((b) => html`${itemLink(byIdent.get(b))} `)}).</p>` : ""}
            ${myRole && !signed && !blocked.length ? html`<button class="btn primary wide" data-item-act="sign">Sign off as ${me.role}</button>` : ""}
            ${myRole && signed ? html`<p class="pill ok">Your sign-off is in your proposal.</p>` : ""}
            ${!myRole ? html`<p class="sub">Your role (${me.role}) is not asked to sign this item.</p>` : ""}
            <hr>
            <a class="btn wide" href="#/edit/${it.id}">Propose a change</a>
            <button class="btn wide" data-item-act="ask">Ask a question about it</button>
            <form id="ask-form" hidden>
              <label for="ask-text">Your question</label>
              <textarea id="ask-text" rows="4" required placeholder="What is unclear or possibly wrong?"></textarea>
              <button class="btn primary">Add to my proposal</button>
            </form>
            <p id="item-msg" class="note" aria-live="polite"></p>
          </div>
        </aside>
      </div>
    </div>`,
    after: () => wire(it),
  };
}

// ------------------------------------------------------------- meaning
function meaning(it: CItem): Raw {
  return section("What it means", html`
    <p class="meaning">${linkRefs(it.meaning ?? "")}</p>
    ${it.statute_override ? html`<div class="callout override-box"><b>Statute over rule.</b> ${linkRefs(it.statute_override)}</div>` : ""}
    ${it.assumption ? html`<div class="callout assume-box"><b>Assumption the draft makes.</b> ${linkRefs(it.assumption)}</div>` : ""}
    ${it.supplied_by ? html`<p><b>Where the value comes from.</b> ${linkRefs(it.supplied_by)}</p>` : ""}
    ${it.precision ? html`<details><summary>How edge cases are measured (precision)</summary><p>${linkRefs(it.precision)}</p></details>` : ""}
    ${it.options?.length ? html`<p class="sub">Possible values: ${it.options.map((o) => html`<span class="pill">${o.replace(/_/g, " ")}</span> `)}</p>` : ""}
  `);
}

// ---------------------------------------------------- how it is decided
function decided(it: CItem, ex: string | null): Raw {
  const uses = E.usesOfItem(it.identifier);
  const lines = englishOf(it);
  const readers = casesReading(it.identifier);
  const leaves = upstreamFacts(it.identifier);
  const exCase = ex && caseById.get(ex) ? ex : null;
  return section("How it is decided", html`
    <div class="rule">${lines.map((l) => html`<div class="rl" style="padding-left:${(l.match(/^ */)?.[0].length ?? 0) * 0.6}em">${linkEnglish(l.trim(), uses)}</div>`)}</div>
    <h3>Step by step <span class="note">open each line to see how that part is decided${exCase ? `; values from household ${exCase}` : ""}</span></h3>
    <div class="toolbar">
      <label>Show values from a stored household
        <select id="ex-case"><option value="">none</option>${readers.map((c) => html`<option value="${c}" ${c === exCase ? raw("selected") : ""}>${c}: ${caseById.get(c)?.title.slice(0, 60)}</option>`)}</select>
      </label>
      <button class="btn small" data-item-act="print">Print as a handout</button>
    </div>
    <div class="outline">${outlineChildren(it.identifier, 0, exCase)}</div>
    <details><summary>Facts it ultimately needs <span class="note">${leaves.length} facts we are told</span></summary>
      <ul class="cols3">${leaves.map((l) => html`<li>${itemLink(byIdent.get(l))}</li>`)}</ul>
    </details>
  `, { id: "decided" });
}
function upstreamFacts(ident: string): string[] {
  const seen = new Set<string>();
  const out = new Set<string>();
  const stack = [ident];
  while (stack.length) {
    const c = stack.pop()!;
    for (const u of E.usesOfItem(c)) {
      if (seen.has(u)) continue;
      seen.add(u);
      const it = byIdent.get(u);
      if (it?.kind === "supplied") out.add(u);
      else stack.push(u);
    }
  }
  return [...out].sort((a, b) => (byIdent.get(a)?.name ?? a).localeCompare(byIdent.get(b)?.name ?? b));
}
/** One level of the outline: each item the rule reads, as an openable row. */
export function outlineChildren(ident: string, depth: number, exCase: string | null): Raw {
  const uses = E.usesOfItem(ident);
  if (!uses.length) return html``;
  const c = exCase ? caseById.get(exCase) : undefined;
  return html`<ul class="tree">${uses.map((u) => {
    const it = byIdent.get(u);
    if (!it) return html`<li>${u}</li>`;
    let val: Raw | string = "";
    if (c) val = exampleValues(it, c);
    const kids = it.kind === "derived" && E.usesOfItem(u).length;
    const head = html`${kindTag(it)} ${itemLink(it)} ${val}`;
    if (!kids) return html`<li class="leaf">${head}${it.kind === "parameter" ? html` <span class="note">${fmtValue(figureNow(it), it)}</span>` : ""}</li>`;
    return html`<li><details data-ident="${u}" data-depth="${depth + 1}" data-ex="${exCase ?? ""}"><summary>${head}</summary>
      <div class="rule small">${englishOf(it).map((l) => html`<div class="rl" style="padding-left:${(l.match(/^ */)?.[0].length ?? 0) * 0.6}em">${linkEnglish(l.trim(), E.usesOfItem(u))}</div>`)}</div>
      <div class="kids"></div></details></li>`;
  })}</ul>`;
}
function figureNow(it: Item): unknown {
  if (!Array.isArray(it.versions)) return it.value;
  const d = D.meta.default_as_of;
  const v = it.versions.find((x) => x.from <= d && (!x.to || d < x.to));
  return v ? v.value : null;
}
function exampleValues(it: Item, c: import("../../../../src/engine/cases").HouseholdCase): Raw {
  const cd = caseData(c);
  const m = monthOf(c.as_of);
  if (it.scope === "person" || it.scope === "person-month") {
    const vals = Object.keys(c.persons).map((p) => [p, evalIn(E, cd, it.identifier, p, m)] as const);
    return html`<span class="vals">${vals.map(([p, v]) => html`<span class="val" title="${personLabel(c.id, p)}">${p}: ${fmtValue(v, it)}</span>`)}</span>`;
  }
  const p0 = Object.keys(c.persons)[0];
  return html`<span class="vals"><span class="val">${fmtValue(evalIn(E, cd, it.identifier, p0, m), it)}</span></span>`;
}

// ----------------------------------------------------- figures over time
function numbersIn(v: unknown): number[] {
  if (typeof v === "number") return [v];
  if (v && typeof v === "object") return Object.values(v as object).flatMap(numbersIn);
  return [];
}
function variants(n: number, type: string): string[] {
  const out = new Set<string>([String(n), n.toLocaleString("en-US")]);
  if (Number.isInteger(n)) out.add(n.toLocaleString("en-US", { minimumFractionDigits: 2 }));
  if (type === "rate" || (n > 0 && n < 5 && !Number.isInteger(n))) {
    const pct = Math.round(n * 10000) / 100;
    out.add(`${pct}%`); out.add(`${pct} percent`); out.add(String(pct));
  }
  return [...out].filter((s) => s.length > 0);
}
/** Highlights the version's numbers in an excerpt; returns the html and how
 *  many of the distinct numbers were found. */
function highlight(excerpt: string, nums: number[], type: string): { html: string; found: number; total: number } {
  const uniq = [...new Set(nums)];
  const pats: string[] = [];
  let found = 0;
  for (const n of uniq) {
    const vs = variants(n, type);
    const hit = vs.some((s) => new RegExp(`(^|[^0-9.,])\\$?${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![0-9]|[.,][0-9])`).test(excerpt));
    if (hit) found++;
    pats.push(...vs);
  }
  if (!pats.length) return { html: esc(excerpt), found, total: uniq.length };
  const re = new RegExp(`(\\$?(?:${pats.sort((a, b) => b.length - a.length).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))(?![0-9]|[.,][0-9])`, "g");
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(excerpt))) {
    const prev = excerpt[m.index - 1];
    if (prev && /[0-9.,]/.test(prev)) continue;
    out += esc(excerpt.slice(last, m.index)) + `<mark>${esc(m[0])}</mark>`;
    last = m.index + m[0].length;
  }
  out += esc(excerpt.slice(last));
  return { html: out, found, total: uniq.length };
}
function timeline(vs: ItemVersion[]): Raw {
  if (!vs.length) return html``;
  const t = today();
  const start = vs.map((v) => v.from).sort()[0];
  const lastTo = vs.some((v) => !v.to) ? null : vs.map((v) => v.to!).sort().slice(-1)[0];
  const endCandidates = [t, ...vs.map((v) => v.to ?? v.from)].sort();
  let end = endCandidates[endCandidates.length - 1];
  const endD = new Date(end + "T00:00:00Z"); endD.setUTCFullYear(endD.getUTCFullYear() + 1); end = endD.toISOString().slice(0, 10);
  const span = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;
  const total = span(start, end);
  const segs: Array<{ from: string; to: string; label: string; cls: string }> = [];
  const sorted = [...vs].sort((a, b) => a.from.localeCompare(b.from));
  let cursor = start;
  sorted.forEach((v, i) => {
    if (v.from > cursor) segs.push({ from: cursor, to: v.from, label: "no figure", cls: "gap" });
    const prev = sorted[i - 1];
    const same = prev && JSON.stringify(prev.value) === JSON.stringify(v.value);
    segs.push({ from: v.from, to: v.to ?? end, label: same ? "same figures" : `v${i + 1}`, cls: same ? "same" : "ver" });
    cursor = v.to ?? end;
  });
  if (lastTo && lastTo < end) segs.push({ from: lastTo, to: end, label: "no figure in force", cls: "gap" });
  const left = (span(start, t) / total) * 100;
  return html`<div class="timeline" role="img" aria-label="Versions over time">
    ${segs.map((s) => html`<div class="seg ${s.cls}" style="width:${(span(s.from, s.to) / total) * 100}%" title="${s.from} to ${s.to}: ${s.label}"><span>${s.label}</span><small>${s.from}</small></div>`)}
    <div class="today" style="left:${left}%"><span>today</span></div>
  </div>`;
}
function figures(it: CItem): Raw {
  if (noVersion(it)) {
    return section("Figures over time", html`<div class="warn"><b>No figure loaded.</b> This figure is set by the State but has not been published where it can be fetched, so it is unknown on every date. ${openQuestionsOf(it).map((q) => html`See <a href="#/q/${q.id}">${q.id}</a>. `)}</div>`);
  }
  if (!Array.isArray(it.versions)) {
    return section("The figure", html`<p class="big">${fmtValue(it.value, it)}</p><p class="sub">One value for all time (no dated versions).</p>`);
  }
  const vs = [...it.versions].sort((a, b) => a.from.localeCompare(b.from));
  const isTable = vs.some((v) => v.value && typeof v.value === "object");
  const now = today();
  return section("Figures over time", html`
    ${timeline(vs)}
    ${isTable ? tableCompare(it, vs) : ""}
    <h3>Each version beside the text it was taken from</h3>
    <p class="help">Numbers from the version are highlighted where they appear in its source excerpt, so you can check the figure against the rule without retyping it.</p>
    ${vs.slice().reverse().map((v, ri) => {
      const i = vs.length - 1 - ri;
      const s = v.source ? D.sources[v.source] : undefined;
      const nums = numbersIn(v.value);
      const hl = s ? highlight(s.excerpt, nums, it.type) : null;
      const prev = vs[i - 1];
      const same = prev && JSON.stringify(prev.value) === JSON.stringify(v.value);
      const inForce = v.from <= now && (!v.to || now < v.to);
      return html`<article class="version ${inForce ? "current" : ""}">
        <header><b>${v.from} to ${v.to ? `${v.to} (not included)` : "no end date"}</b>
          ${inForce ? html`<span class="pill ok">in force today</span>` : ""}
          ${same ? html`<span class="pill warn">same figures as the version before</span>` : ""}
          ${v.source ? sourceChip(v.source) : html`<span class="pill bad">no source on this version</span>`}
          ${hl && hl.total ? (same && !hl.found
            ? html`<span class="pill warn">the excerpt states no figures: it carries the previous ones forward</span>`
            : html`<span class="pill ${hl.found === hl.total ? "ok" : hl.found ? "warn" : "bad"}">${hl.found} of ${hl.total} number${hl.total > 1 ? "s" : ""} found in the excerpt</span>`) : ""}
        </header>
        <div class="vgrid">
          <div><p class="sub">Value</p>${isTable ? html`<p>${Object.keys(v.value as object).length} rows (see the table above)</p>` : html`<p class="big">${fmtValue(v.value, it)}</p>`}</div>
          <div><p class="sub">${s ? `${s.cite}${/^unverified/i.test(s.verification ?? "") ? " (unverified)" : ""}` : ""}</p>${hl ? html`<blockquote class="excerpt short">${raw(hl.html)}</blockquote>` : ""}</div>
        </div>
      </article>`;
    })}
  `, { id: "figures" });
}
function tableCompare(it: Item, vs: ItemVersion[]): Raw {
  const keys: string[] = [];
  for (const v of vs) for (const k of Object.keys((v.value ?? {}) as object)) if (!keys.includes(k)) keys.push(k);
  return html`<div class="scrollx"><table class="grid"><thead><tr><th>Row</th>${vs.map((v) => html`<th>${v.from}<br><small>to ${v.to ?? "no end"}</small></th>`)}</tr></thead>
    <tbody>${keys.map((k) => html`<tr><th>${k.replace(/_/g, " ")}</th>${vs.map((v, i) => {
      const cur = (v.value as Record<string, unknown>)?.[k];
      const prev = i ? (vs[i - 1].value as Record<string, unknown>)?.[k] : undefined;
      const changed = i > 0 && JSON.stringify(cur) !== JSON.stringify(prev);
      return html`<td class="${changed ? "chg" : ""}">${cur === undefined ? "—" : fmtValue(cur, it)}</td>`;
    })}</tr>`)}</tbody></table></div>
    <p class="sub">Shaded cells changed from the version before.</p>`;
}

// -------------------------------------------------------------- sources
function sourcesSection(it: CItem): Raw {
  const ss = citedSources(it);
  if (!ss.length) return html``;
  return section("Where it comes from", html`
    <p class="help">Verbatim excerpts of statute and regulation. Open one to see it with its document.</p>
    ${ss.map((sid) => {
      const s = D.sources[sid];
      if (!s) return html`<p>${sid}</p>`;
      return html`<details class="src"><summary>${sourceChip(sid)} ${s.title}</summary>
        ${/^unverified/i.test(s.verification ?? "") ? html`<p class="warn">${s.verification}</p>` : ""}
        <blockquote class="excerpt short">${s.excerpt}</blockquote>
        ${s.doc ? html`<a href="#/doc/${s.doc}?s=${sid}">Open ${s.doc} with this excerpt highlighted →</a>` : ""}
      </details>`;
    })}
  `, { note: `${ss.length} excerpt${ss.length > 1 ? "s" : ""}` });
}

// ---------------------------------------------------- stored households
function households(it: CItem): Raw {
  const cs = casesReading(it.identifier);
  if (!cs.length) return section("In the stored households", html`<p>No stored household's determinations read this item.</p>`);
  return section("In the stored households", html`
    <p class="help">The households whose determinations read this item, and the value it takes for each person on the household's determination date.</p>
    <table class="list"><thead><tr><th>Household</th><th>Values</th></tr></thead><tbody>
    ${cs.map((cid) => {
      const c = caseById.get(cid)!;
      return html`<tr><td>${caseLink(cid)}<div class="sub">${c.title.slice(0, 90)}</div></td><td>${exampleValues(it, c)}</td></tr>`;
    })}</tbody></table>`, { note: `${cs.length} of ${D.cases.length}` });
}

// --------------------------------------------------------------- affects
function affects(it: CItem): Raw {
  const imp = impactOf([it.identifier]);
  const direct = E.usedBy(it.identifier);
  const hh = casesTouched([it.identifier, ...imp.all]);
  const byProg = new Map<string, string[]>();
  for (const o of imp.outcomes) { const p = programOfOutcome.get(o) ?? "?"; byProg.set(p, [...(byProg.get(p) ?? []), o]); }
  const sameDate = it.effective ? switchedOnWith(it) : [];
  const canCompare = it.kind === "parameter" && (it.versions?.length ?? 0) >= 2;
  return section("What it affects", html`
    <p>Read directly by <b>${direct.length}</b> item${direct.length === 1 ? "" : "s"}; <b>${imp.all.length}</b> downstream in all, including <b>${imp.outcomes.length}</b> program outcome${imp.outcomes.length === 1 ? "" : "s"}. Stored households whose determinations read it or anything downstream: <b>${hh.length}</b>.</p>
    ${direct.length ? html`<details><summary>Read directly by</summary><ul class="cols2">${direct.map((d) => html`<li>${itemLink(byIdent.get(d))}</li>`)}</ul></details>` : ""}
    ${[...byProg].map(([p, os]) => html`<p><b>${PROGRAM_LABEL[p] ?? p}</b>: ${os.map((o, i) => html`${i ? ", " : ""}${itemLink(byIdent.get(o))}`)}</p>`)}
    ${hh.length ? html`<p>Households: ${hh.map((c) => html`${caseLink(c)} `)}</p>` : ""}
    ${sameDate.length ? html`<p><b>Switched on together with</b> (figures read beside it whose new version starts ${it.effective!.from}): ${sameDate.map((s) => itemLink(byIdent.get(s)))}. Compare their versions to see which households the change reaches.</p>` : ""}
    <div class="toolbar">
      ${canCompare ? html`<button class="btn primary" data-item-act="compare">Compare the stored households with the previous version</button>` : ""}
      <a class="btn" href="#/edit/${it.id}">Try a change and see its effect</a>
    </div>
    <div id="compare-out" aria-live="polite"></div>
  `, { id: "affects" });
}
function switchedOnWith(it: CItem): string[] {
  const from = it.effective!.from;
  const out = new Set<string>();
  for (const consumer of E.usedBy(it.identifier)) {
    for (const u of E.usesOfItem(consumer)) {
      const p = byIdent.get(u);
      if (p?.kind === "parameter" && (p.versions ?? []).some((v) => v.from === from)) out.add(u);
    }
  }
  return [...out];
}
export function diffTable(diffs: ReturnType<typeof beforeAfter>["diffs"], beforeLabel = "Before", afterLabel = "After"): Raw {
  if (!diffs.length) return html`<p class="pill ok">No stored household's result changes.</p>`;
  const cases = [...new Set(diffs.map((d) => d.caseId))];
  const people = new Set(diffs.map((d) => d.caseId + d.person)).size;
  return html`<p><b>${diffs.length}</b> result${diffs.length > 1 ? "s" : ""} change, for <b>${people}</b> ${people > 1 ? "people" : "person"} in <b>${cases.length}</b> household${cases.length > 1 ? "s" : ""}.</p>
    <table class="list diff"><thead><tr><th>Household</th><th>Person</th><th>Result</th><th>${beforeLabel}</th><th>${afterLabel}</th></tr></thead><tbody>
    ${diffs.slice(0, 200).map((d) => {
      const it = byIdent.get(d.identifier);
      return html`<tr><td>${caseLink(d.caseId)}</td><td>${d.person} <span class="sub">${personLabel(d.caseId, d.person)}</span></td>
        <td>${itemLink(it)}${d.month ? html` <span class="sub">${d.month}</span>` : ""}</td>
        <td class="before">${fmtValue(d.before, it)}</td><td class="after">${fmtValue(d.after, it)}</td></tr>`;
    })}</tbody></table>${diffs.length > 200 ? html`<p class="sub">… and ${diffs.length - 200} more</p>` : ""}`;
}

// ------------------------------------------------------------- questions
function questions(it: CItem): Raw {
  const qs = openQuestionsOf(it);
  if (!qs.length) return html``;
  return section("Questions it rests on", html`<ul class="plain">${qs.map((q) => html`<li><span class="pill ${q.state === "resolved" ? "ok" : q.state === "partly" ? "warn" : "bad"}">${q.state}</span> <a href="#/q/${q.id}">${q.id}</a> ${q.title}</li>`)}</ul>`);
}

// ----------------------------------------------------------------- tests
function tests(it: CItem): Raw {
  const ts = it.tests ?? [];
  if (!ts.length) return html``;
  const results = ts.map((t) => { try { return E.runTest(it, t); } catch (e) { return { ok: false, got: null, err: String(e) }; } });
  const pass = results.filter((r) => r.ok).length;
  return section("Rule tests", html`
    <details><summary>${pass} of ${ts.length} pass against the codex as it is</summary>
    <table class="list"><thead><tr><th>Test</th><th>Given</th><th>Expected</th><th>Result</th></tr></thead><tbody>
    ${ts.map((t, i) => html`<tr><td>${t.id}<div class="sub">${(t as { title?: string }).title ?? ""}</div></td>
      <td class="given">${Object.entries(t.given ?? {}).map(([k, v]) => html`<div>${byIdent.get(k)?.name ?? k}: <b>${fmtValue(v, byIdent.get(k))}</b></div>`)}${t.as_of ? html`<div class="sub">as of ${t.as_of}</div>` : ""}</td>
      <td>${fmtValue(t.expect, it)}</td><td>${results[i].ok ? html`<span class="pill ok">pass</span>` : html`<span class="pill bad">got ${fmtValue(results[i].got, it)}</span>`}</td></tr>`)}
    </tbody></table></details>`);
}

function engineer(it: CItem): Raw {
  return html`<details class="card eng"><summary>For engineers: identifier, file, expression tree</summary>
    <p><code>${it.identifier}</code> · ${it.type} · ${it.scope} · implemented in ${it.implemented ?? "n/a"} · <code>${it.file}</code></p>
    ${it.derived !== undefined ? html`<pre>${JSON.stringify(it.derived, null, 1)}</pre>` : ""}
    ${it.rationale ? html`<p><b>Rationale.</b> ${linkRefs(it.rationale)}</p>` : ""}
  </details>`;
}

// ----------------------------------------------------------------- wiring
function wire(it: CItem): void {
  const msg = document.getElementById("item-msg")!;
  document.querySelector("[data-item-act=sign]")?.addEventListener("click", () => {
    add({ type: "signoff", itemId: it.id, role: me.role, by: me.name || me.role, date: today() });
    msg.textContent = "Added to your proposal.";
    setTimeout(rerender, 500);
  });
  const form = document.getElementById("ask-form") as HTMLFormElement;
  document.querySelector("[data-item-act=ask]")?.addEventListener("click", () => { form.hidden = false; (document.getElementById("ask-text") as HTMLTextAreaElement).focus(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = (document.getElementById("ask-text") as HTMLTextAreaElement).value.trim();
    if (!text) return;
    add({ type: "ask", itemIds: [it.id], text, by: me.name || me.role, date: today() });
    form.hidden = true;
    msg.textContent = "Question added to your proposal; it becomes a new entry in the open questions when sent.";
  });
  document.querySelector("[data-item-act=print]")?.addEventListener("click", () => {
    document.querySelectorAll<HTMLDetailsElement>(".outline details").forEach((d) => (d.open = true));
    setTimeout(() => window.print(), 300);
  });
  const sel = document.getElementById("ex-case") as HTMLSelectElement | null;
  sel?.addEventListener("change", () => { location.hash = `#/item/${it.id}?ex=${sel.value}&keep=1`; });
  document.querySelector(".outline")?.addEventListener("toggle", (ev) => {
    const d = ev.target as HTMLDetailsElement;
    if (!d.open || d.dataset.loaded) return;
    d.dataset.loaded = "1";
    const kids = d.querySelector(":scope > .kids");
    if (kids) kids.innerHTML = outlineChildren(d.dataset.ident!, Number(d.dataset.depth), d.dataset.ex || null).s;
  }, true);
  document.querySelector("[data-item-act=compare]")?.addEventListener("click", () => {
    const out = document.getElementById("compare-out")!;
    out.innerHTML = `<p class="note">Running all ${D.cases.length} stored households twice…</p>`;
    setTimeout(() => {
      const vs = [...(it.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from));
      const cur = vs[vs.length - 1];
      const prev = vs[vs.length - 2];
      // The codex as if the latest version had kept the previous one's value.
      const alt: Item = { ...it, versions: vs.map((v) => (v === cur ? { ...v, value: prev.value } : v)) };
      const r = beforeAfter([alt]);
      // beforeAfter reports codex → alternative; flip so "before" is the previous version.
      const diffs = r.diffs.map((d) => ({ ...d, before: d.after, after: d.before }));
      out.innerHTML = html`<h3>If the version from ${cur.from} had kept the previous figures (${fmtValue(prev.value, it)})</h3>
        ${diffTable(diffs, `With the version before ${cur.from}`, `With the version from ${cur.from}`)}
        <p class="sub">${r.checked} stored results compared in ${Math.round(r.ms)} ms. A household is affected only when its determination date falls in the newer version's range.</p>`.s;
    }, 30);
  });
}
