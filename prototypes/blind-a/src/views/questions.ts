/* E. Questions: the open-questions register and one question. */
import {
  D, PROGRAM_SHORT, ROLES, byId, casesTouched, ownersOf, programsOfQuestion, qById, type Question,
} from "../data";
import { caseLink, html, itemRow, linkRefs, programTag, raw, section } from "../ui";
import { add, changes, me, sentList, today } from "../proposal";
import { rerender, type View } from "../main";

const STATE_LABEL: Record<string, string> = { open: "Open", partly: "Partly resolved", resolved: "Resolved" };
const hhCache = new Map<string, string[]>();
function households(q: Question): string[] {
  let h = hhCache.get(q.id);
  if (!h) {
    h = casesTouched(q.items.map((id) => byId.get(id)?.identifier).filter((x): x is string => !!x));
    hhCache.set(q.id, h);
  }
  return h;
}

export function questionsView(_a: string[], qs: URLSearchParams): View {
  const state = qs.get("state") ?? "unresolved";
  const owner = qs.get("owner") ?? "";
  const prog = qs.get("program") ?? "";
  const sort = qs.get("sort") ?? "households";
  let list = D.questions.filter((q) =>
    (state === "all" || (state === "unresolved" ? q.state !== "resolved" : q.state === state)) &&
    (!owner || ownersOf(q).includes(owner)) &&
    (!prog || programsOfQuestion(q).includes(prog)));
  const num = (id: string) => Number(id.replace(/\D/g, ""));
  list = [...list].sort((a, b) =>
    sort === "items" ? b.items.length - a.items.length :
    sort === "households" ? households(b).length - households(a).length || b.items.length - a.items.length :
    sort === "newest" ? num(b.id) - num(a.id) : num(a.id) - num(b.id));
  const opt = (v: string, cur: string, label = v) => html`<option value="${v}" ${v === cur ? raw("selected") : ""}>${label}</option>`;
  const progs = Object.keys(PROGRAM_SHORT);
  return {
    title: "Questions",
    body: html`<div class="page">
      <h1>Open questions</h1>
      <p class="lede">Interpretation questions the drafting could not settle from the text. Each records the assumption the draft uses meanwhile, and the items that carry it. An owner is a policy role whose program's items rest on the question.</p>
      <form class="card toolbar" id="qf">
        <label>State <select name="state">${opt("unresolved", state, "Open or partly")}${opt("open", state, "Open")}${opt("partly", state, "Partly resolved")}${opt("resolved", state, "Resolved")}${opt("all", state, "All")}</select></label>
        <label>Owner <select name="owner">${opt("", owner, "Anyone")}${ROLES().map((r) => opt(r, owner))}</select></label>
        <label>Program <select name="program">${opt("", prog, "Any")}${progs.map((p) => opt(p, prog, PROGRAM_SHORT[p]))}</select></label>
        <label>Sort <select name="sort">${opt("households", sort, "Households touched")}${opt("items", sort, "Items resting on it")}${opt("newest", sort, "Newest first")}${opt("id", sort, "Number")}</select></label>
        <button type="button" class="btn small" id="mine">Only mine (${me.role})</button>
      </form>
      <section class="card">
        <p class="note">${list.length} question${list.length === 1 ? "" : "s"}</p>
        <table class="list qs"><thead><tr><th>Question</th><th>State</th><th>Programs</th><th>Owners</th><th class="num">Items</th><th class="num">Households</th></tr></thead><tbody>
        ${list.map((q) => html`<tr>
          <td><a href="#/q/${q.id}"><b>${q.id}</b> ${q.title}</a></td>
          <td><span class="pill ${q.state === "resolved" ? "ok" : q.state === "partly" ? "warn" : "bad"}">${STATE_LABEL[q.state]}</span></td>
          <td>${programsOfQuestion(q).map((p) => programTag(p))}</td>
          <td class="sub">${ownersOf(q).join(", ")}</td>
          <td class="num">${q.items.length}</td><td class="num">${households(q).length}</td></tr>`)}
        </tbody></table>
      </section></div>`,
    after: () => {
      const f = document.getElementById("qf") as HTMLFormElement;
      const go = (extra: Record<string, string> = {}) => {
        const p = new URLSearchParams();
        for (const [k, v] of new FormData(f)) if (v) p.set(k, String(v));
        for (const [k, v] of Object.entries(extra)) p.set(k, v);
        location.hash = "#/questions?" + p.toString();
      };
      f.addEventListener("change", () => go());
      document.getElementById("mine")!.addEventListener("click", () => go({ owner: me.role }));
    },
  };
}

export function questionView([id]: string[]): View {
  const q = qById.get(id);
  if (!q) return { title: "Not found", body: html`<section class="card"><h1>No question ${id}</h1></section>` };
  const items = q.items.map((x) => byId.get(x)).filter((x): x is NonNullable<typeof x> => !!x);
  const hh = households(q);
  const queued = changes().filter((c) => c.type === "answer" && c.qid === id);
  const sentHere = sentList().flatMap((s) => s.changes.filter((c) => c.type === "answer" && c.qid === id).map((c) => ({ s, c })));
  const owners = ownersOf(q);
  const isLegal = me.role === "Legal";
  return {
    title: `${q.id} ${q.title}`,
    body: html`<div class="page">
      <p class="eyebrow">Open question ${q.id} · <span class="pill ${q.state === "resolved" ? "ok" : q.state === "partly" ? "warn" : "bad"}">${STATE_LABEL[q.state]}</span> · owners: ${owners.join(", ")}</p>
      <h1>${q.title}</h1>
      <div class="cols">
        <div class="maincol">
          ${section("The question and its history", html`${q.paragraphs.map((p, i) => html`<p class="${i === 0 ? "lead-para" : ""}">${linkRefs(p.replace(/^Body:\s*/, ""))}</p>`)}`)}
          ${section("Items that rest on it", html`<table class="list"><tbody>${items.map((it) => itemRow(it))}</tbody></table>`, { note: `${items.length}` })}
          ${section("Stored households it touches", hh.length ? html`<p>${hh.map((c) => html`${caseLink(c)} `)}</p><p class="help">Households whose determinations read one of these items. A different answer could change their results; propose the change on an item to see exactly how.</p>` : html`<p>None of the stored households read these items.</p>`)}
        </div>
        <aside class="actions"><div class="card sticky">
          <h2>Record a response</h2>
          <form id="ans">
            <fieldset><legend class="sub">Kind</legend>
              <label><input type="radio" name="kind" value="answer" ${!isLegal ? raw("checked") : ""}> Policy answer</label>
              <label><input type="radio" name="kind" value="legal_opinion" ${isLegal ? raw("checked") : ""}> Legal opinion</label>
            </fieldset>
            <label for="ans-text">Your response</label>
            <textarea id="ans-text" rows="7" required placeholder="State the answer, the authority (statute, rule, guidance) and any effect on the items."></textarea>
            <label><input type="checkbox" id="resolves"> This settles the question (propose marking it resolved)</label>
            <button class="btn primary wide">Add to my proposal</button>
          </form>
          <p id="ans-msg" class="note" aria-live="polite"></p>
          <p class="sub">Recorded as a dated paragraph under the question when the proposal is accepted. Owners named above review it${isLegal ? "" : "; a legal opinion also goes to Legal"}.</p>
          ${queued.length ? html`<h3>In your proposal</h3>${queued.map((c) => c.type === "answer" ? html`<blockquote>${c.kind === "legal_opinion" ? "Legal opinion" : "Answer"}: ${c.text}</blockquote>` : "")}` : ""}
          ${sentHere.length ? html`<h3>Sent</h3>${sentHere.map(({ s, c }) => c.type === "answer" ? html`<blockquote>${s.ref} (${s.at}): ${c.text}</blockquote>` : "")}` : ""}
        </div></aside>
      </div></div>`,
    after: () => {
      document.getElementById("ans")!.addEventListener("submit", (e) => {
        e.preventDefault();
        const f = e.target as HTMLFormElement;
        const kind = (new FormData(f).get("kind") as "answer" | "legal_opinion") ?? "answer";
        const text = (document.getElementById("ans-text") as HTMLTextAreaElement).value.trim();
        if (!text) return;
        add({ type: "answer", qid: q.id, kind, text, by: me.name || me.role, date: today(), resolves: (document.getElementById("resolves") as HTMLInputElement).checked });
        document.getElementById("ans-msg")!.textContent = "Added to your proposal.";
        setTimeout(rerender, 500);
      });
    },
  };
}
