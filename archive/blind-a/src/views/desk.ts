/* A. Desk: the role's worklists and the search results. */
import {
  D, E, PROGRAM_SHORT, approvalsOf, citedSources, byIdent, casesTouched, directUnverified, impactOf, isOutcome,
  noVersion, openQuestionsOf, ownersOf, restsOnUnverified, search, status, unverifiedSources, type CItem,
} from "../data";
import { badges, caseLink, html, itemLink, itemRow, kindTag, linkRefs, programTag, raw, sourceChip, type Raw } from "../ui";
import { add, me, signedInTray, today } from "../proposal";
import { rerender, type View } from "../main";

function signoffItems(role: string): CItem[] {
  return D.items.filter((it) => approvalsOf(it).includes(role) && status(it) !== "Approved");
}

export function deskView(_a: string[], q: URLSearchParams): View {
  const query = q.get("q") ?? "";
  const list = q.get("list") ?? (query ? "search" : "signoffs");
  const mine = signoffItems(me.role);
  const ownedQ = D.questions.filter((x) => x.state !== "resolved" && ownersOf(x).includes(me.role));
  const overrides = D.items.filter((it) => it.statute_override);
  const unvItems = D.items.filter((it) => directUnverified(it).length || noVersion(it));
  const soon = effectiveSoon();
  const approved = D.items.filter((it) => status(it) === "Approved").length;

  const tile = (key: string, n: number | string, label: string, sub: string) => html`
    <a class="tile ${list === key ? "on" : ""}" href="#/?list=${key}"><b>${n}</b><span>${label}</span><small>${sub}</small></a>`;

  let body: Raw;
  if (list === "search") body = searchResults(query);
  else if (list === "statute") body = statuteList(overrides);
  else if (list === "unverified") body = unverifiedList();
  else if (list === "soon") body = soonList(soon);
  else if (list === "questions") body = html`<section class="card"><h2>Open questions you own as ${me.role}</h2>
      <p>${ownedQ.length} open or partly open. <a href="#/questions?owner=${encodeURIComponent(me.role)}">Open them in the register to sort and filter →</a></p>
      <table class="list"><tbody>${ownedQ.slice(0, 40).map((x) => html`<tr><td><a href="#/q/${x.id}">${x.id}</a></td><td>${x.title}</td><td class="num">${x.items.length} items</td></tr>`)}</tbody></table></section>`;
  else body = signoffList(mine);

  return {
    title: query ? `Search: ${query}` : "Desk",
    body: html`
      <div class="page">
        <h1 class="hello">Working as <em>${me.role}</em></h1>
        <p class="lede">${D.items.length.toLocaleString()} items in the Colorado codex · ${approved ? `${approved} approved` : "nothing approved yet: every item is Draft"} ·
          ${unverifiedSources.size} unverified excerpts · ${D.cases.length} stored households · ${D.questions.filter((x) => x.state !== "resolved").length} open questions</p>
        <div class="tiles">
          ${tile("signoffs", mine.length, "Your sign-offs", `items your role must sign · ${mine.filter((it) => signedInTray(it.id, me.role)).length} in your proposal`)}
          ${tile("questions", ownedQ.length, "Questions you own", "open or partly answered")}
          ${tile("statute", overrides.length, "Statute over rule", "where federal law governs over Colorado's text")}
          ${tile("unverified", unvItems.length, "Unverified or missing figures", "and what depends on them")}
          ${tile("soon", soon.length, "Takes effect soon", "new figures and rules, this month and the next two")}
        </div>
        ${body}
      </div>`,
    after: () => {
      const qi = document.getElementById("q") as HTMLInputElement;
      if (qi && query) qi.value = query;
      wireSignoff();
    },
  };
}

// ------------------------------------------------------------- search
function searchResults(query: string): Raw {
  const hits = search(query, 80);
  const groups: Array<[string, string]> = [["item", "Rules, figures and facts"], ["question", "Questions"], ["case", "Households"], ["source", "Sources"]];
  return html`<section class="card"><h2>Results for “${query}” <span class="note">${hits.length} shown</span></h2>
    ${!hits.length ? html`<p>Nothing matched. Try fewer words, a citation (“1396b”), an item ID (“CO-914”) or a question (“OQ-471”).</p>` : ""}
    ${groups.map(([k, label]) => {
      const hs = hits.filter((h) => h.kind === k);
      if (!hs.length) return "";
      return html`<h3>${label}</h3><table class="list"><tbody>${hs.map((h) => {
        if (h.kind === "item") { const it = D.items.find((x) => x.id === h.id)!; return itemRow(it as CItem); }
        if (h.kind === "question") return html`<tr><td><span class="kind k-q">Question</span></td><td><a href="#/q/${h.id}">${h.title}</a><div class="sub">${h.id}</div></td><td colspan="2">${h.sub}</td></tr>`;
        if (h.kind === "case") return html`<tr><td><span class="kind k-case">Household</span></td><td><a href="#/case/${h.id}">${h.title}</a><div class="sub">${h.id}</div></td><td colspan="2"></td></tr>`;
        return html`<tr><td><span class="kind k-src">Source</span></td><td>${sourceChip(h.id)}<div class="sub">${h.title}</div></td><td colspan="2"></td></tr>`;
      })}</tbody></table>`;
    })}
  </section>`;
}

// ------------------------------------------------------------- sign-offs
function signoffList(items: CItem[]): Raw {
  const byProg = new Map<string, CItem[]>();
  for (const it of items) { const l = byProg.get(it.program) ?? []; l.push(it); byProg.set(it.program, l); }
  // The role's own programs first (and open); then the chapters it signs because their items feed its outcomes.
  const own = new Set(Object.entries(D.meta.approval_policy.by_program).filter(([p, rs]) => p !== "All" && rs.includes(me.role)).map(([p]) => p));
  const order = [...byProg.keys()].sort((a, b) => (Number(own.has(b)) - Number(own.has(a))) || (byProg.get(b)!.length - byProg.get(a)!.length));
  return html`<section class="card">
    <h2>Items you must sign as ${me.role} <span class="note">${items.length} items, grouped by chapter</span></h2>
    <p class="help">Your role signs these because of the volume's approval policy: the program's own chapter, items tagged for your role, and anything your program's outcomes read (upstream of outcomes). Signing adds a row to the item's approval record through a proposal; an item that rests on an unverified excerpt cannot move past Draft until that excerpt is replaced.</p>
    <div class="toolbar">
      <input type="search" id="so-filter" placeholder="Filter by name…" aria-label="Filter sign-offs">
      <label><input type="checkbox" id="so-outcomes"> Outcomes only</label>
      <button class="btn primary" data-so="add">Sign off selected</button>
      <span id="so-msg" class="note" aria-live="polite"></span>
    </div>
    ${order.map((p) => {
      const list = byProg.get(p)!;
      return html`<details class="group" ${order.length <= 2 || own.has(p) || (!own.size && p === order[0]) ? raw("open") : ""}>
        <summary><b>${PROGRAM_SHORT[p] ?? p}</b> · ${list.length} items${own.has(p) ? " · your program" : p === "All" ? " · shared facts and rules your outcomes read" : " · read by your outcomes"} <label class="selall"><input type="checkbox" data-so-all="${p}"> select all signable</label></summary>
        <table class="list so"><tbody>${list.map((it) => {
          const rests = restsOnUnverified(it);
          const inTray = signedInTray(it.id, me.role);
          const blocked = rests.length > 0;
          return html`<tr data-name="${(it.name + " " + it.identifier).toLowerCase()}" data-outcome="${isOutcome(it) ? "1" : "0"}" data-prog="${p}">
            <td><input type="checkbox" class="so-cb" value="${it.id}" ${blocked || inTray ? raw("disabled") : ""} aria-label="Select ${it.name}"></td>
            <td>${kindTag(it)}</td>
            <td>${itemLink(it)}<div class="sub">${it.id} · needs ${approvalsOf(it).length} role${approvalsOf(it).length > 1 ? "s" : ""}: ${approvalsOf(it).join(", ")}</div></td>
            <td>${badges(it, { compact: true })}</td>
            <td class="why">${inTray ? html`<span class="pill ok">In your proposal</span>` : blocked ? html`<span class="pill bad" title="${rests.join(", ")}">Blocked: rests on unverified</span>` : openQuestionsOf(it).some((q) => q.state !== "resolved") ? html`<span class="pill warn">Has open question</span>` : ""}</td>
          </tr>`;
        })}</tbody></table></details>`;
    })}
  </section>`;
}
function wireSignoff(): void {
  const f = document.getElementById("so-filter") as HTMLInputElement | null;
  if (!f) return;
  const oc = document.getElementById("so-outcomes") as HTMLInputElement;
  const apply = () => {
    const t = f.value.toLowerCase().trim();
    document.querySelectorAll<HTMLTableRowElement>("table.so tr").forEach((tr) => {
      const show = (!t || tr.dataset.name!.includes(t)) && (!oc.checked || tr.dataset.outcome === "1");
      tr.hidden = !show;
    });
    if (t || oc.checked) document.querySelectorAll("details.group").forEach((d) => ((d as HTMLDetailsElement).open = true));
  };
  f.addEventListener("input", apply);
  oc.addEventListener("change", apply);
  document.querySelectorAll<HTMLInputElement>("[data-so-all]").forEach((cb) => cb.addEventListener("change", () => {
    document.querySelectorAll<HTMLTableRowElement>(`table.so tr[data-prog="${cb.dataset.soAll}"]`).forEach((tr) => {
      const box = tr.querySelector<HTMLInputElement>(".so-cb");
      if (box && !box.disabled && !tr.hidden) box.checked = cb.checked;
    });
  }));
  document.querySelector("[data-so=add]")?.addEventListener("click", () => {
    const ids = [...document.querySelectorAll<HTMLInputElement>(".so-cb:checked")].map((x) => x.value);
    const msg = document.getElementById("so-msg")!;
    if (!ids.length) { msg.textContent = "Select at least one item."; return; }
    for (const id of ids) add({ type: "signoff", itemId: id, role: me.role, by: me.name || me.role, date: today() });
    msg.textContent = `${ids.length} sign-off${ids.length > 1 ? "s" : ""} added to your proposal.`;
    setTimeout(rerender, 600);
  });
}

// ------------------------------------------------------ statute over rule
function statuteList(items: CItem[]): Raw {
  return html`<section class="card"><h2>Where the codex follows a statute over Colorado's rule text <span class="note">${items.length} items</span></h2>
    <p class="help">Each item carries one county-facing sentence naming the Colorado paragraph it departs from, the statute that governs, and the date. The open question behind it, and the statute excerpts it cites, follow.</p>
    ${items.map((it) => {
      const statutes = citedSources(it).filter((s) => /U\.S\.C\.|Pub\. ?L\.|CFR|C\.R\.S\.|Session Laws|FR /.test(D.sources[s]?.cite ?? ""));
      return html`<article class="override">
        <h3>${itemLink(it)} ${programTag(it.program)} ${badges(it, { compact: true })}</h3>
        <p class="ovr">${linkRefs(it.statute_override!)}</p>
        <p class="sub">Questions: ${(it.open ?? []).map((q) => html`<a href="#/q/${q}">${q}</a> `)} · Statute excerpts: ${statutes.length ? statutes.map((s) => sourceChip(s)) : html`<span class="muted">named in the sentence; no excerpt cited on the item</span>`}
        ${it.effective ? html` · in force from ${it.effective.from}` : ""}</p>
        ${it.rationale ? html`<details><summary>The reasoning recorded on the item</summary><p>${linkRefs(it.rationale)}</p>${it.precision ? html`<p>${linkRefs(it.precision)}</p>` : ""}</details>` : ""}
      </article>`;
    })}
  </section>`;
}

// ----------------------------------------------- unverified and missing
function unverifiedList(): Raw {
  const srcs = [...unverifiedSources].map((s) => D.sources[s]);
  const missing = D.items.filter(noVersion);
  return html`<section class="card"><h2>Figures from unverified excerpts</h2>
    <p class="help">An excerpt is “unverified” when its text could not be fetched from an allowed source. Every item resting on one, directly or through what it reads, must stay Draft until it is replaced.</p>
    ${srcs.map((s) => {
      const direct = D.items.filter((it) => directUnverified(it).includes(s.id));
      const imp = impactOf(direct.map((x) => x.identifier));
      const hh = casesTouched([...direct.map((x) => x.identifier)]);
      return html`<article class="unv">
        <h3>${sourceChip(s.id)} ${s.title}</h3>
        <p class="warn">${s.verification}</p>
        <table class="list"><tbody>${direct.map((it) => itemRow(it, html`${E.impact([it.identifier]).length} downstream`))}</tbody></table>
        <p>Together these feed <b>${imp.all.length}</b> rules, including <b>${imp.outcomes.length}</b> program outcomes${imp.outcomes.length ? html` (${imp.outcomes.slice(0, 8).map((o, i) => html`${i ? ", " : ""}${itemLink(byIdent.get(o))}`)}${imp.outcomes.length > 8 ? "…" : ""})` : ""}. Stored households that read them: ${hh.length ? hh.map((c) => html`${caseLink(c)} `) : "none"}.</p>
      </article>`;
    })}
  </section>
  <section class="card"><h2>Figures with no version loaded <span class="note">${missing.length}</span></h2>
    <p class="help">A figure the State sets but has not published where it can be fetched. It is unknown on every date until a dated version is loaded; its open question says where it will come from.</p>
    <table class="list"><thead><tr><th></th><th>Figure</th><th>Program</th><th>Flags</th><th>Depends on it</th></tr></thead><tbody>${missing.map((it) => itemRow(it, html`${E.impact([it.identifier]).length} rules · ${(it.open ?? []).map((q) => html`<a href="#/q/${q}">${q}</a> `)}`))}</tbody></table>
  </section>`;
}

// --------------------------------------------------------- takes effect
interface Soon { date: string; it: CItem; what: string }
function effectiveSoon(): Soon[] {
  const t = today();
  const start = t.slice(0, 7) + "-01";
  const endD = new Date(start + "T00:00:00Z"); endD.setUTCMonth(endD.getUTCMonth() + 3);
  const end = endD.toISOString().slice(0, 10);
  const out: Soon[] = [];
  for (const it of D.items) {
    for (const v of it.versions ?? []) if (v.from >= start && v.from < end) out.push({ date: v.from, it, what: "new dated figure" });
    for (const v of it.versions ?? []) if (v.to && v.to >= start && v.to < end && !(it.versions ?? []).some((w) => w.from === v.to)) out.push({ date: v.to, it, what: "figure runs out, no next version" });
    if (it.effective && it.effective.from >= start && it.effective.from < end) out.push({ date: it.effective.from, it, what: "rule comes into force" });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
function soonList(list: Soon[]): Raw {
  return html`<section class="card"><h2>Takes effect this month and the next two</h2>
    ${!list.length ? html`<p>Nothing is dated to start in this window. <a href="#/changes">See what was edited in the codex this month →</a></p>` : ""}
    <table class="list"><thead><tr><th>Date</th><th></th><th>Item</th><th>Program</th><th>Flags</th><th>What</th></tr></thead><tbody>
    ${list.map((s) => html`<tr><td class="num">${s.date}</td>${raw(itemRow(s.it, s.what).s.replace(/^<tr>|<\/tr>$/g, ""))}</tr>`)}
    </tbody></table></section>`;
}
