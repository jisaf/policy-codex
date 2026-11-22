/* F. Changes: this month in the codex, the proposal tray, and the change editor. */
import {
  D, E, PROGRAM_SHORT, byId, byIdent, caseById, casesTouched, fmtValue, type CItem,
} from "../data";
import { caseLink, esc, html, itemLink, itemRow, kindTag, programTag, raw, section, type Raw } from "../ui";
import {
  add, approversFor, beforeAfter, changes, editedItems, me, prText, remove, send, sentList, setMe, today, type Change,
} from "../proposal";
import { diffTable } from "./item";
import { rerender, type View } from "../main";
import type { Item } from "../../../../src/engine/types";

export function changesView(_a: string[], q: URLSearchParams): View {
  const tab = q.get("tab") ?? (changes().length ? "proposal" : "month");
  const tabs = html`<nav class="tabs" aria-label="Changes">
    <a href="#/changes?tab=month" class="${tab === "month" ? "on" : ""}">This month in the codex</a>
    <a href="#/changes?tab=proposal" class="${tab === "proposal" ? "on" : ""}">My proposal ${changes().length ? html`<b class="count">${changes().length}</b>` : ""}</a>
    <a href="#/changes?tab=sent" class="${tab === "sent" ? "on" : ""}">Sent (${sentList().length})</a>
  </nav>`;
  if (tab === "proposal") return proposalTab(tabs);
  if (tab === "sent") return sentTab(tabs);
  return monthTab(tabs, q);
}

// ------------------------------------------------------------ this month
function monthTab(tabs: Raw, q: URLSearchParams): View {
  const md = D.monthDiff;
  const hhFilter = q.get("hh") ?? "";
  const monthStart = md.month + "-01";
  const commits = D.commits.filter((c) => c.date >= monthStart);
  const changed = Object.entries(md.changed);
  const figs = changed.filter(([id, f]) => byId.get(id)?.kind === "parameter" && (f.includes("versions") || f.includes("value")));
  const rules = changed.filter(([id, f]) => byId.get(id)?.kind === "derived" && f.includes("derived"));
  const takes: Array<{ date: string; it: CItem; what: string }> = [];
  for (const it of D.items) {
    for (const v of it.versions ?? []) if (v.from.startsWith(md.month)) takes.push({ date: v.from, it, what: "new figures take effect" });
    if (it.effective?.from.startsWith(md.month)) takes.push({ date: it.effective.from, it, what: "rule comes into force" });
  }
  const touch = (ids: string[]) => casesTouched(ids.map((i) => byId.get(i)?.identifier).filter((x): x is string => !!x));
  const keep = (hh: string[]) => !hhFilter || hh.includes(hhFilter);
  const hhCell = (hh: string[]) => hh.length ? html`${hh.map((c) => html`<a class="${c === hhFilter ? "hl" : ""}" href="#/case/${c}">${c}</a> `)}` : html`<span class="muted">none</span>`;
  const figRows = figs.map(([id, f]) => ({ it: byId.get(id)!, f, hh: touch([id]) })).filter((x) => keep(x.hh));
  const ruleRows = rules.map(([id, f]) => ({ it: byId.get(id)!, f, hh: touch([id]) })).filter((x) => keep(x.hh));
  const commitRows = commits.map((c) => ({ c, hh: touch([...c.items, ...c.added]) })).filter((x) => keep(x.hh));
  return {
    title: "This month",
    body: html`<div class="page">${tabs}
      <h1>What changed in ${monthName(md.month)}</h1>
      <p class="lede">Compared with the codex as it stood at the start of the month (commit ${md.base}, ${md.baseDate}): <b>${md.added.length}</b> items added and <b>${changed.length}</b> items edited, in <b>${commits.length}</b> change sets. Each line names the stored households whose determinations read what changed.</p>
      <form class="card toolbar" id="hhf"><label>Only what touches household
        <select name="hh"><option value="">any</option>${D.cases.map((c) => html`<option value="${c.id}" ${c.id === hhFilter ? raw("selected") : ""}>${c.id}: ${c.title.slice(0, 50)}</option>`)}</select></label></form>
      ${section("Takes effect this month", takes.length ? html`<table class="list"><tbody>${takes.map((t) => html`<tr><td class="num">${t.date}</td>${raw(itemRow(t.it, t.what).s.replace(/^<tr>|<\/tr>$/g, ""))}</tr>`)}</tbody></table>` : html`<p>No figure or rule is dated to start in ${monthName(md.month)}. See the desk's “Takes effect soon” for the next months.</p>`)}
      ${section("Figures whose values were edited", html`<p class="help">Dated versions or values that differ from the start of the month.</p>
        <table class="list"><thead><tr><th></th><th>Figure</th><th>Program</th><th>Flags</th><th>Households</th></tr></thead><tbody>${figRows.map((x) => itemRow(x.it, hhCell(x.hh)))}</tbody></table>`, { note: `${figRows.length}` })}
      ${section("Rules whose logic was edited", html`<details><summary>${ruleRows.length} rules</summary><table class="list"><tbody>${ruleRows.map((x) => itemRow(x.it, hhCell(x.hh)))}</tbody></table></details>`, { note: `${ruleRows.length}` })}
      ${section("Change sets", html`<p class="help">Each change set is one reviewed commit to the codex, newest first.</p>
        ${commitRows.map(({ c, hh }) => html`<details class="commit"><summary><span class="num">${c.date}</span> ${c.subject} <span class="note">${c.added.length} added · ${c.items.length} edited · ${hh.length} household${hh.length === 1 ? "" : "s"}</span></summary>
          <p>Households touched: ${hhCell(hh)}</p>
          ${c.other.length ? html`<p class="sub">Also: ${c.other.slice(0, 8).join(", ")}${c.other.length > 8 ? "…" : ""}</p>` : ""}
          <table class="list"><tbody>${[...c.added.map((i) => [i, "added"]), ...c.items.map((i) => [i, "edited"])].slice(0, 40).map(([i, w]) => { const it = byId.get(i); return it ? itemRow(it, w) : ""; })}</tbody></table>
          ${c.added.length + c.items.length > 40 ? html`<p class="sub">… and ${c.added.length + c.items.length - 40} more</p>` : ""}
        </details>`)}`, { note: `${commitRows.length}` })}
    </div>`,
    after: () => {
      const f = document.getElementById("hhf") as HTMLFormElement;
      f.addEventListener("change", () => { const v = new FormData(f).get("hh"); location.hash = `#/changes?tab=month${v ? `&hh=${v}` : ""}`; });
    },
  };
}
function monthName(m: string): string {
  const d = new Date(m + "-01T00:00:00Z");
  return d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

// -------------------------------------------------------------- proposal
function describe(c: Change): Raw {
  if (c.type === "signoff") { const it = byId.get(c.itemId); return html`<b>Sign off</b> ${itemLink(it)} as ${c.role}`; }
  if (c.type === "answer") return html`<b>${c.kind === "legal_opinion" ? "Legal opinion" : "Answer"}</b> on <a href="#/q/${c.qid}">${c.qid}</a>${c.resolves ? " (resolves it)" : ""}: <span class="sub">${c.text.slice(0, 140)}${c.text.length > 140 ? "…" : ""}</span>`;
  if (c.type === "ask") return html`<b>New question</b> on ${c.itemIds.map((i) => itemLink(byId.get(i)))}: <span class="sub">${c.text.slice(0, 140)}</span>`;
  return html`<b>Edit</b> ${itemLink(byId.get(c.itemId))}: ${c.summary}`;
}
function proposalTab(tabs: Raw): View {
  const list = changes();
  const appr = approversFor();
  const counts = { signoff: 0, answer: 0, edit: 0, ask: 0 } as Record<string, number>;
  for (const c of list) counts[c.type]++;
  const defTitle = [counts.signoff ? `${counts.signoff} sign-off${counts.signoff > 1 ? "s" : ""}` : "", counts.edit ? `${counts.edit} edit${counts.edit > 1 ? "s" : ""}` : "",
    counts.answer ? `${counts.answer} answer${counts.answer > 1 ? "s" : ""}` : "", counts.ask ? `${counts.ask} new question${counts.ask > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ");
  const pr = list.length ? prText(`${me.role}: ${defTitle}`) : null;
  const editCount = editedItems().length;
  return {
    title: "My proposal",
    body: html`<div class="page">${tabs}
      <h1>My proposal</h1>
      <p class="lede">Everything you have queued goes to the codex stewards as one proposal. They open it as a pull request on your behalf: you do not need a GitHub account. Nothing changes in the codex until the roles below approve it.</p>
      ${!list.length ? html`<section class="card"><p>Your proposal is empty. Sign off items from the desk, answer a question, or open an item and choose “Propose a change”.</p></section>` : html`
      ${section("What it contains", html`<ol class="tray">${list.map((c, i) => html`<li>${describe(c)} <button class="btn small" data-rm="${i}" aria-label="Remove">Remove</button></li>`)}</ol>`, { note: `${list.length}` })}
      ${section("Effect on the stored households", editCount ? html`<button class="btn primary" id="run-ba">Run all ${D.cases.length} households before and after</button><div id="ba-out" aria-live="polite"></div>` : html`<p>Sign-offs and answers do not change any result; only edits do. ${counts.answer ? "An answer that changes a rule needs an edit to that rule as well." : ""}</p>`)}
      ${section("Who must approve", html`<table class="list"><tbody>${[...appr].map(([r, why]) => html`<tr><td class="${r === me.role ? "me" : ""}"><b>${r}</b></td><td class="sub">${why.slice(0, 4).join("; ")}${why.length > 4 ? `; and ${why.length - 4} more` : ""}</td></tr>`)}</tbody></table>
        <p class="help">From the volume's approval policy: each edited item's program, tags and the program outcomes that read it; each question's owners; Legal for a legal opinion; the data steward who merges.</p>`)}
      ${section("Send", html`<form id="send" class="sendform">
          <label>Your name <input id="nm" required value="${me.name}" autocomplete="name"></label>
          <label>Email for the reviewers' replies <input id="em" type="email" required value="${me.email}" autocomplete="email"></label>
          <label class="wide">Title <input id="ti" required value="${pr!.title}"></label>
          <button class="btn primary">Send to the codex stewards</button>
        </form>
        <details><summary>The pull request that will be opened (${pr!.files.length} file${pr!.files.length === 1 ? "" : "s"})</summary>
          <p class="sub">${pr!.files.join(", ")}</p><pre class="pr">${pr!.body}</pre></details>`)}
      `}
    </div>`,
    after: () => {
      document.querySelectorAll<HTMLButtonElement>("[data-rm]").forEach((b) => b.addEventListener("click", () => { remove(Number(b.dataset.rm)); rerender(); }));
      document.getElementById("run-ba")?.addEventListener("click", () => {
        const out = document.getElementById("ba-out")!;
        out.innerHTML = `<p class="note">Running…</p>`;
        setTimeout(() => { const r = beforeAfter(editedItems()); out.innerHTML = html`${diffTable(r.diffs, "Now", "With the proposal")}<p class="sub">${r.checked} results compared in ${Math.round(r.ms)} ms.</p>`.s; }, 20);
      });
      document.getElementById("send")?.addEventListener("submit", (e) => {
        e.preventDefault();
        setMe({ name: (document.getElementById("nm") as HTMLInputElement).value.trim(), email: (document.getElementById("em") as HTMLInputElement).value.trim() });
        const s = send((document.getElementById("ti") as HTMLInputElement).value.trim());
        location.hash = `#/changes?tab=sent&new=${s.ref}`;
      });
    },
  };
}
function sentTab(tabs: Raw): View {
  const s = sentList();
  return {
    title: "Sent proposals",
    body: html`<div class="page">${tabs}<h1>Sent proposals</h1>
      ${s.length ? html`<p class="help">In this prototype a sent proposal is kept in this browser; in the product it becomes a pull request the stewards open for you, and you are emailed as reviewers respond.</p>` : html`<p>Nothing sent yet.</p>`}
      ${s.map((x) => html`<section class="card"><h2>${x.ref} ${x.title}</h2><p class="sub">${x.at} · ${x.name} · ${x.changes.length} changes · <span class="pill warn">awaiting review</span></p><ol>${x.changes.map((c) => html`<li>${describe(c)}</li>`)}</ol></section>`)}
    </div>`,
  };
}

// ---------------------------------------------------------- change editor
function parseVal(s: string, type: string): unknown {
  const t = s.trim();
  if (type === "yes/no") return /^(yes|true)$/i.test(t);
  if (t !== "" && !isNaN(Number(t.replace(/[$,]/g, "")))) return Number(t.replace(/[$,]/g, ""));
  return t;
}
function valueEditor(v: unknown, type: string, name: string): Raw {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return html`<div class="scrollx"><table class="grid edit"><tbody>${Object.entries(v as Record<string, unknown>).map(([k, x]) => html`<tr><th>${k.replace(/_/g, " ")}</th><td><input data-key="${k}" name="${name}" value="${String(x)}" aria-label="${k}"></td></tr>`)}</tbody></table></div>`;
  }
  if (type === "yes/no") return html`<select name="${name}"><option ${v === true ? raw("selected") : ""}>yes</option><option ${v === false ? raw("selected") : ""}>no</option></select>`;
  return html`<input name="${name}" value="${v === null || v === undefined ? "" : String(v)}">`;
}
function readValue(form: HTMLElement, name: string, template: unknown, type: string): unknown {
  const els = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)];
  if (template && typeof template === "object" && !Array.isArray(template)) {
    const out: Record<string, unknown> = {};
    for (const e of els) out[(e as HTMLInputElement).dataset.key!] = parseVal(e.value, "");
    return out;
  }
  return els[0] ? parseVal(els[0].value, type) : null;
}

export function editView([id]: string[]): View {
  const it = byId.get(id);
  if (!it) return { title: "Not found", body: html`<section class="card"><h1>No item ${id}</h1></section>` };
  const vs = [...(it.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from));
  const last = vs[vs.length - 1];
  const ruleText = it.kind === "derived" && it.derived !== undefined ? E.block(it.derived).join("\n") : "";
  const existing = changes().find((c) => c.type === "edit" && c.itemId === id);
  return {
    title: `Propose a change: ${it.name}`,
    body: html`<div class="page">
      <p class="eyebrow">Propose a change · ${kindTag(it)} ${programTag(it.program)} · ${it.id}</p>
      <h1>${itemLink(it)}</h1>
      ${existing ? html`<p class="pill warn">Your proposal already has an edit to this item; adding again replaces it.</p>` : ""}
      <form id="ed" class="card editor">
        ${it.kind === "parameter" && Array.isArray(it.versions) ? html`
          <h2>Figures</h2>
          <fieldset><legend class="sub">What kind of change</legend>
            <label><input type="radio" name="mode" value="new" checked> Add a new dated version (the law or the figure changes on a date)</label>
            <label><input type="radio" name="mode" value="fix"> Correct the version from ${last?.from ?? "?"} (it was transcribed wrongly)</label>
          </fieldset>
          <label>New version starts on <input type="date" name="from" value="${nextFrom(last?.from)}"></label>
          <label>Source excerpt for it <input name="vsource" placeholder="S-number, e.g. S1800" value="${last?.source ?? ""}"></label>
          <p class="sub">Values (prefilled from the latest version):</p>
          ${valueEditor(last?.value ?? null, it.type, "val")}` : ""}
        ${it.kind === "parameter" && !Array.isArray(it.versions) ? html`<h2>Figure</h2>${valueEditor(it.value, it.type, "val")}` : ""}
        ${it.kind === "derived" ? html`
          <h2>The rule, in pattern English</h2>
          <p class="help">Written only in the catalogue's patterns; names are item names. It is checked as you type.</p>
          <textarea id="rule" name="rule" rows="${Math.min(18, ruleText.split("\n").length + 2)}" spellcheck="false">${ruleText}</textarea>
          <p id="rule-check" class="note" aria-live="polite">${roundTrips(it) ? "" : html`<span class="pill warn">Heads up</span> The engine cannot yet read this rule's English back exactly. Leave it untouched to change only the meaning, or describe the rule change in “Why” and the steward will write it.`}</p>` : ""}
        <h2>Meaning</h2>
        <textarea name="meaning" rows="4">${it.meaning ?? ""}</textarea>
        <details><summary>Precision</summary><textarea name="precision" rows="4">${it.precision ?? ""}</textarea></details>
        <label class="wide">Why (one line, shown to approvers) <input name="summary" required placeholder="e.g. SB 26-181 freezes the standard for two more years"></label>
        <div class="toolbar">
          <button type="button" class="btn" id="preview">Preview the effect</button>
          <button class="btn primary">Add to my proposal</button>
          <span id="ed-msg" class="note" aria-live="polite"></span>
        </div>
      </form>
      <section class="card"><h2>Effect on the stored households</h2><div id="ed-out"><p class="help">Preview to run all ${D.cases.length} stored households with and without this change.</p></div></section>
      <section class="card"><h2>Who must approve this change</h2><div id="ed-appr">${approverList(it)}</div></section>
    </div>`,
    after: () => wireEditor(it),
  };
}
function roundTrips(it: Item): boolean {
  if (it.derived === undefined) return true;
  try { return JSON.stringify(E.parseDerivation(E.block(it.derived).join("\n"), it.options)) === JSON.stringify(it.derived); } catch { return false; }
}
function nextFrom(from?: string): string {
  const d = new Date((from ?? today()) + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  const t = today();
  const s = d.toISOString().slice(0, 10);
  return s < t ? t.slice(0, 7) + "-01" : s;
}
function approverList(it: Item): string {
  const a = approversFor([{ type: "edit", itemId: it.id, after: it, summary: "", by: "", date: "" }]);
  return html`<ul class="plain roles">${[...a].map(([r, why]) => html`<li class="${r === me.role ? "me" : ""}"><b>${r}</b> <span class="sub">${why.slice(0, 2).join("; ")}</span></li>`)}</ul>`.s;
}
function buildAfter(it: CItem, form: HTMLFormElement): { after: Item; error: string | null } {
  const fd = new FormData(form);
  const after: Item = JSON.parse(JSON.stringify(it));
  delete (after as unknown as Record<string, unknown>).chapter;
  delete (after as unknown as Record<string, unknown>).file;
  after.meaning = String(fd.get("meaning") ?? after.meaning);
  if (fd.get("precision") !== null) after.precision = String(fd.get("precision"));
  if (it.kind === "parameter" && Array.isArray(it.versions)) {
    const vs = [...it.versions].sort((a, b) => a.from.localeCompare(b.from));
    const last = vs[vs.length - 1];
    const val = readValue(form, "val", last?.value, it.type);
    const src = String(fd.get("vsource") ?? "").trim() || undefined;
    if (fd.get("mode") === "fix" && last) {
      after.versions = vs.map((v) => (v === last ? { ...v, value: val, ...(src ? { source: src } : {}) } : v));
    } else {
      const from = String(fd.get("from"));
      if (!from) return { after, error: "Give the date the new version starts." };
      const kept = vs.filter((v) => v.from < from).map((v) => (!v.to || v.to > from ? { ...v, to: from } : v));
      after.versions = [...kept, { from, value: val, ...(src ? { source: src } : {}) }];
    }
  } else if (it.kind === "parameter") {
    after.value = readValue(form, "val", it.value, it.type);
  }
  if (it.kind === "derived") {
    const text = String(fd.get("rule") ?? "");
    // Untouched text keeps the stored rule (the English does not always parse back).
    if (it.derived !== undefined && text === E.block(it.derived).join("\n")) return { after: { ...after, derived: it.derived }, error: null };
    try {
      after.derived = E.parseDerivation(text, it.options);
      const chk = E.check(after.derived, it.scope);
      const errs = (chk as unknown as { errors?: string[] }).errors ?? [];
      if (errs.length) return { after, error: errs.join("; ") };
    } catch (e) {
      return { after, error: (e as Error).message };
    }
  }
  return { after, error: null };
}
function wireEditor(it: CItem): void {
  const form = document.getElementById("ed") as HTMLFormElement;
  const msg = document.getElementById("ed-msg")!;
  const rule = document.getElementById("rule") as HTMLTextAreaElement | null;
  const chk = document.getElementById("rule-check");
  let timer = 0;
  rule?.addEventListener("input", () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      const r = buildAfter(it, form);
      chk!.innerHTML = r.error ? html`<span class="pill bad">Not yet a valid rule</span> ${r.error}`.s
        : html`<span class="pill ok">Reads as a valid rule</span> It uses ${E.uses(r.after.derived!).length} items.`.s;
    }, 300);
  });
  document.getElementById("preview")!.addEventListener("click", () => {
    const r = buildAfter(it, form);
    const out = document.getElementById("ed-out")!;
    if (r.error) { out.innerHTML = html`<p class="warn">${r.error}</p>`.s; return; }
    out.innerHTML = `<p class="note">Running…</p>`;
    setTimeout(() => {
      const ba = beforeAfter([r.after]);
      const fd = new FormData(form);
      const from = fd.get("mode") === "new" ? String(fd.get("from") ?? "") : "";
      const before = from ? D.cases.filter((c) => c.as_of < from).length : 0;
      out.innerHTML = html`${diffTable(ba.diffs, "Now", "With this change")}<p class="sub">${ba.checked} results compared in ${Math.round(ba.ms)} ms.</p>
        ${before ? html`<p class="callout">${before} of the ${D.cases.length} stored households are determined before ${from}, so a version starting then cannot change them. To see what the new figure would do to them, preview it as a correction of the current version, or open a household's walk-through “as of” a later date.</p>` : ""}`.s;
      document.getElementById("ed-appr")!.innerHTML = approverList(r.after);
    }, 20);
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const r = buildAfter(it, form);
    if (r.error) { msg.textContent = r.error; return; }
    const summary = String(new FormData(form).get("summary") ?? "").trim();
    add({ type: "edit", itemId: it.id, after: r.after, summary, by: me.name || me.role, date: today() });
    msg.textContent = "Added to your proposal.";
    setTimeout(() => { location.hash = "#/changes?tab=proposal"; }, 600);
  });
}
export { esc, caseById, byIdent, fmtValue, PROGRAM_SHORT };
