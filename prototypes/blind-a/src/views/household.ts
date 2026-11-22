/* C. Households: the stored test households and one household's results. */
import {
  D, E, PROGRAM_LABEL, PROGRAM_SHORT, aidCodesFor, byIdent, outcomeValues, caseById, documentsNeeded, fmtValue,
  outcomeSet, personLabel, programOfOutcome, report,
} from "../data";
import { programsOfCase } from "../../../../src/engine/cases";
import { esc, html, itemLink, programTag, raw, section, type Raw } from "../ui";
import type { View } from "../main";

export function caseListView(): View {
  return {
    title: "Households",
    body: html`<div class="page">
      <h1>Stored households</h1>
      <p class="lede">The test households stored with the codex. Each is run through the rules as of its own determination date. These are not live applications: they show how the rules decide real-looking families.</p>
      <section class="card"><table class="list cases"><thead><tr><th>Household</th><th>As of</th><th>People</th><th>Programs</th><th>Checks</th></tr></thead><tbody>
      ${D.cases.map((c) => {
        const r = report(c);
        const progs = programsOfCase(E.index, c).filter((p) => p !== "All");
        return html`<tr><td><a href="#/case/${c.id}"><b>${c.id}</b> ${c.title}</a></td><td class="num">${c.as_of}</td><td class="num">${Object.keys(c.persons).length}</td>
          <td>${progs.map((p) => programTag(p))}</td><td>${r.failed ? html`<span class="pill bad">${r.failed} differ</span>` : html`<span class="pill ok">${r.passed} as expected</span>`}</td></tr>`;
      })}</tbody></table></section></div>`,
  };
}

export function caseView([id]: string[]): View {
  const c = caseById.get(id);
  if (!c) return { title: "Not found", body: html`<section class="card"><h1>No household ${id}</h1></section>` };
  const r = report(c);
  const month = c.as_of.slice(0, 7);
  const persons = Object.keys(c.persons);
  const notes = D.personNotes[c.id] ?? {};
  const needed = documentsNeeded(c);

  // Results grouped by identifier, then person.
  const byIdentRes = new Map<string, Map<string, Array<(typeof r.results)[number]>>>();
  for (const x of r.results) {
    if (!byIdentRes.has(x.identifier)) byIdentRes.set(x.identifier, new Map());
    const m = byIdentRes.get(x.identifier)!;
    m.set(x.person, [...(m.get(x.person) ?? []), x]);
  }
  const outcomeIds = [...byIdentRes.keys()].filter((k) => outcomeSet.has(k));
  const otherIds = [...byIdentRes.keys()].filter((k) => !outcomeSet.has(k));
  const byProg = new Map<string, string[]>();
  for (const o of outcomeIds) { const p = programOfOutcome.get(o) ?? "All"; byProg.set(p, [...(byProg.get(p) ?? []), o]); }

  const cell = (ident: string, p: string): Raw => {
    const rs = byIdentRes.get(ident)?.get(p);
    if (!rs) return html`<td class="na">·</td>`;
    const it = byIdent.get(ident);
    return html`<td>${rs.map((x) => html`<a class="cellv ${x.ok ? "" : "bad"}" href="#/walk/${c.id}/${p}/${ident}${x.month ? `?m=${x.month}` : ""}" title="${x.ok ? "As the case expects" : `Expected ${fmtValue(x.expect, it)}`}">${x.month && rs.length > 1 ? html`<small>${x.month}</small> ` : ""}${fmtValue(x.got, it)}</a>`)}</td>`;
  };
  const resultTable = (ids: string[]) => html`<div class="scrollx"><table class="grid results"><thead><tr><th>Result</th>${persons.map((p) => html`<th title="${notes[p] ?? ""}">${p}</th>`)}</tr></thead>
    <tbody>${ids.map((i) => html`<tr><th>${itemLink(byIdent.get(i))}</th>${persons.map((p) => cell(i, p))}</tr>`)}</tbody></table></div>`;

  return {
    title: `${c.id} ${c.title}`,
    body: html`<div class="page">
      <p class="eyebrow">Stored household ${c.id} · determination date ${c.as_of} · ${persons.length} people</p>
      <h1>${c.title}</h1>
      <p class="sub">${r.failed ? html`<span class="pill bad">${r.failed} results differ from what the case expects</span>` : html`<span class="pill ok">All ${r.passed} checked results are as the case expects</span>`}
        · Click any result to walk through how it was decided.</p>

      ${section("People and their aid codes", html`
        <p class="placeholder"><b>Placeholder codes.</b> ${D.aidCodes.notice}</p>
        <div class="people">${persons.map((p) => {
          const codes = aidCodesFor(c, p);
          const mine = needed.filter((n) => n.person === p);
          return html`<article class="person">
            <h3>${p} <span class="sub">${personLabel(c.id, p)}</span></h3>
            ${notes[p] ? html`<p class="note-text">${notes[p]}</p>` : ""}
            ${codes.length ? html`<ul class="codes">${codes.map((k) => html`<li><a href="#/walk/${c.id}/${p}/${k.outcome}?m=${month}"><code>${k.code}</code> ${k.label}</a></li>`)}</ul>` : html`<p class="muted">No aid code on ${month}.</p>`}
            ${(() => { const ov = outcomeValues(c, p); return ov.length ? html`<details class="mini-results"><summary>${ov.length} program result${ov.length > 1 ? "s" : ""} on ${month}</summary><ul class="plain">${ov.map((o) => html`<li><a href="#/walk/${c.id}/${p}/${o.outcome}?m=${month}">${(byIdent.get(o.outcome)?.name ?? o.outcome)}</a>: <b>${fmtValue(o.value, byIdent.get(o.outcome))}</b></li>`)}</ul></details>` : ""; })()}
            ${mine.length ? html`<p class="pill warn">${mine.length} document${mine.length > 1 ? "s" : ""} still needed</p>` : ""}
          </article>`;
        })}</div>
      `)}

      ${section("Documents still needed", needed.length ? html`
        <p class="help">From each program's verification rules on ${month}: what is still pending, for whom, and the program's due date. Open a row to see why it is pending.</p>
        <table class="list"><thead><tr><th>Who</th><th>Program</th><th>What</th><th>Due by</th><th>Program status</th></tr></thead><tbody>
        ${needed.sort((a, b) => (a.due ?? "9").localeCompare(b.due ?? "9")).map((n) => html`<tr>
          <td><b>${n.person}</b> <span class="sub">${personLabel(c.id, n.person)}</span></td><td>${programTag(n.program)}</td>
          <td><a href="#/walk/${c.id}/${n.person}/${n.outcome}?m=${month}">${n.label}</a></td>
          <td class="num">${n.due ?? html`<span class="muted">no date</span>`}${n.due && n.due < c.as_of ? html` <span class="pill bad">past</span>` : ""}</td>
          <td>${(n.status ?? "").replace(/_/g, " ")}</td></tr>`)}
        </tbody></table>` : html`<p>Nothing is pending on ${month}.</p>`)}

      ${section("Program results", html`${[...byProg].map(([p, ids]) => html`<h3>${PROGRAM_LABEL[p] ?? p}</h3>${resultTable(ids)}`)}`, { note: "as the stored case checks them" })}
      ${otherIds.length ? html`<details class="card"><summary>Other values the case checks <span class="note">${otherIds.length}</span></summary>${resultTable(otherIds)}</details>` : ""}
      <details class="card"><summary>The facts stated for this household</summary>
        ${persons.map((p) => html`<h3>${p}</h3><div class="facts">${Object.entries(c.persons[p].facts ?? {}).map(([k, v]) => html`<span><span class="sub">${byIdent.get(k)?.name ?? k}</span> ${fmtValue(v, byIdent.get(k))}</span>`)}</div>`)}
        ${c.relationships?.length ? html`<h3>Relationships</h3><ul class="plain">${c.relationships.map(([r2, a, b]) => html`<li>${a} is the ${r2.replace(/_/g, " ")} of ${b}</li>`)}</ul>` : ""}
      </details>
    </div>`,
  };
}
export { PROGRAM_SHORT, esc, raw };
