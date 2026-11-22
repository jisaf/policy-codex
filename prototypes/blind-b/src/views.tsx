/* My desk, the sign-off queue, Programs, Figures, Questions. */
import { useMemo, useState } from "preact/hooks";
import {
  D, E, TODAY, byId, byIdent, PROGRAMS, PROGRAM_ORDER, KIND, fmtVal, fmtDate, firstSentence, requiredRoles, openQuestions, qById,
  questionOwners, questionPrograms, outcomesReached, householdsReading, outcomeProgram, programOutcomes, isVerificationOutcome,
  role, signs, notes, isPendingSign, toggleSign, signBlockers, tookEffect, versionInForce, unverifiedDirect, unverifiedRest, tagLabel,
  addNote, dropNote, caseById, type CItem, type Question,
} from "./store";
import { href, route, setQ, ProgramTag, Pill, Fold, More, ItemLink, ItemRow, Flags, Rich, RuleText, ValueView, Crumbs, Empty, stripIds } from "./ui";

/* ---------- shared: weights ---------- */
const qWeight = new Map<string, { outs: number; hh: string[] }>();
export function weightOf(q: Question) {
  let w = qWeight.get(q.id);
  if (!w) {
    const ids = q.items.map((i) => byId.get(i)?.identifier).filter(Boolean) as string[];
    w = { outs: outcomesReached(ids).filter((o) => !isVerificationOutcome(o)).length, hh: householdsReading(ids) };
    qWeight.set(q.id, w);
  }
  return w;
}
function needsMe(it: CItem, r: string) { return requiredRoles(it).some((x) => x.role === r) && !it.approval?.some((a) => a.role === r); }
const chapterTitle = (dir: string) => ({ supplied: "Facts we are told", parameters: "Published figures", shared: "Rules shared by every program" } as Record<string, string>)[dir] ?? D.chapters.find((c) => c.dir === dir)?.title ?? dir;

/* ---------- My desk ---------- */
export function Desk() {
  const me = role.value;
  const mine = useMemo(() => D.items.filter((it) => needsMe(it, me)), [me]);
  const held = mine.filter((it) => signBlockers(it).length);
  const inTray = signs.value.filter((s) => s.role === me).length;
  const groups = D.chapters.map((ch) => ({ ch, items: mine.filter((it) => it.chapter === ch.dir) })).filter((g) => g.items.length);
  const myQs = useMemo(() => D.questions.filter((q) => q.state !== "resolved" && questionOwners(q).includes(me)).sort((a, b) => weightOf(b).hh.length - weightOf(a).hh.length || weightOf(b).outs - weightOf(a).outs), [me]);
  const month = TODAY.slice(0, 7);
  const took = useMemo(() => tookEffect(month), [month]);
  const tookHH = householdsReading(took.map((t) => t.item.identifier));
  const myArea = (it: CItem) => requiredRoles(it).some((r) => r.role === me);
  const unv = D.items.filter((it) => unverifiedDirect.has(it.identifier) && myArea(it));
  const due = D.items.filter((it) => it.review_by && it.review_by <= TODAY.slice(0, 4) + "-12-31" && myArea(it) || (it.review_by && it.review_by < "2027-02-01" && myArea(it)));
  const nofig = D.items.filter((it) => it.kind === "parameter" && Array.isArray(it.versions) && !versionInForce(it, TODAY) && myArea(it));
  const overrides = D.items.filter((it) => it.statute_override && myArea(it));
  return (
    <div class="desk">
      <p class="eyebrow">My desk · {fmtDate(TODAY)}</p>
      <h1>{mine.length ? <>{mine.length.toLocaleString()} items wait for your signature{myQs.length ? <>, and {myQs.length} open questions are yours</> : null}.</> : "Nothing waits for your signature in this role."}</h1>
      <p class="lede">You are looking at the rulebook as <RoleSelect />. Nothing here is approved yet: every item is a draft until its owners sign.</p>
      <div class="deskgrid">
        <section class="card">
          <div class="card-h"><h2>To sign</h2><a href={href("desk/sign")}>Open the whole queue</a></div>
          {inTray > 0 && <p class="notice ok">{inTray} signature{inTray > 1 ? "s" : ""} in your proposal, not sent yet. <a href={href("changes/proposal")}>Review and send</a></p>}
          <ul class="plain queue">
            {groups.map((g) => {
              const h = g.items.filter((it) => signBlockers(it).length).length;
              const oq = g.items.filter((it) => openQuestions(it).length).length;
              const done = g.items.filter((it) => isPendingSign(it.id, me)).length;
              return (
                <li>
                  <a class="qrow" href={href("desk/sign", { chapter: g.ch.dir })}>
                    <span class="q-name">{chapterTitle(g.ch.dir)}</span>
                    <span class="q-num">{g.items.length}</span>
                    <span class="q-sub">{done > 0 && <span class="ok-t">{done} ticked · </span>}{oq > 0 && <>{oq} with an open question</>}{oq > 0 && h > 0 && " · "}{h > 0 && <span class="warn-t">{h} cannot be signed yet</span>}{!oq && !h && !done && "ready to read"}</span>
                  </a>
                </li>
              );
            })}
          </ul>
          {held.length > 0 && <p class="small muted">{held.length} of your items rest on a figure whose source could not be verified, so they stay in draft whatever you sign. <a href={href("law/unverified")}>See why</a></p>}
        </section>
        <section class="card">
          <div class="card-h"><h2>Open questions you own</h2><a href={href("questions", { owner: me })}>All {myQs.length}</a></div>
          {!myQs.length && <Empty>None for this role.</Empty>}
          <ul class="plain">
            {myQs.slice(0, 6).map((q) => <li><QRow q={q} compact /></li>)}
          </ul>
        </section>
        <section class="card">
          <div class="card-h"><h2>Took effect in {fmtDate(month)}</h2><a href={href("changes", { month })}>See the month</a></div>
          {!took.length && <Empty>No figure or rule changes this month.</Empty>}
          <ul class="plain">
            {took.slice(0, 5).map((t) => <li class="tookrow"><ItemLink it={t.item} /> <span class="muted">from {fmtDate(t.date)}</span></li>)}
          </ul>
          {took.length > 0 && <p class="small muted">{tookHH.length} stored household{tookHH.length === 1 ? "" : "s"} read{tookHH.length === 1 ? "s" : ""} {took.length === 1 ? "it" : "them"}.</p>}
          <p class="small"><a href={href("changes", { month: "2026-10" })}>October 2026</a> was the big month: {tookEffect("2026-10").length} figures and rules, including the federal limits of H.R.1.</p>
        </section>
        <section class="card">
          <h2>Needs attention in your area</h2>
          <ul class="plain attention">
            <li><a href={href("law/unverified")}><b>{unv.length}</b> figure{unv.length === 1 ? "" : "s"} taken from a source that could not be verified</a></li>
            <li><a href={href("law")}><b>{overrides.length}</b> rule{overrides.length === 1 ? "" : "s"} follow a federal statute over Colorado’s own text</a></li>
            <li><a href={href("figures", { show: "due" })}><b>{due.length}</b> figure{due.length === 1 ? "" : "s"} due a new version soon</a></li>
            <li><a href={href("figures", { show: "none" })}><b>{nofig.length}</b> figure{nofig.length === 1 ? " has" : "s have"} no published value today</a></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
export function RoleSelect() {
  return (
    <select class="roleselect" value={role.value} aria-label="Viewing as" onChange={(e) => (role.value = (e.target as HTMLSelectElement).value)}>
      {D.meta.approval_policy.roles.map((r) => <option value={r}>{r}</option>)}
    </select>
  );
}

/* ---------- sign-off queue ---------- */
export function SignQueue() {
  const me = role.value;
  const q = route.value.q;
  const all = useMemo(() => D.items.filter((it) => needsMe(it, me)), [me]);
  const chapters = D.chapters.filter((ch) => all.some((it) => it.chapter === ch.dir));
  const chapter = q.chapter ?? chapters[0]?.dir;
  const inCh = all.filter((it) => it.chapter === chapter);
  const tags = [...new Set(inCh.flatMap((it) => it.tags ?? []))].sort();
  const tag = q.topic ?? "";
  const text = (q.q ?? "").toLowerCase();
  const list = inCh.filter((it) => (!tag || it.tags?.includes(tag)) && (!text || (it.name + " " + it.id + " " + (it.meaning ?? "")).toLowerCase().includes(text)))
    .sort((a, b) => +a.id.slice(3) - +b.id.slice(3));
  const can = list.filter((it) => !signBlockers(it).length);
  const ticked = can.filter((it) => isPendingSign(it.id, me));
  return (
    <div>
      <Crumbs items={[["My desk", href("desk")], "To sign"]} />
      <h1>To sign as {me}</h1>
      <p class="lede">Read, tick, and add your signatures to your proposal. A signature covers the item exactly as shown; if it later changes, it comes back to you.</p>
      <div class="chips">
        {chapters.map((ch) => <a class={"chip" + (ch.dir === chapter ? " on" : "")} href={href("desk/sign", { chapter: ch.dir })}>{chapterTitle(ch.dir)} <b>{all.filter((it) => it.chapter === ch.dir).length}</b></a>)}
      </div>
      <div class="filters">
        <input type="search" placeholder="Filter by words" value={q.q ?? ""} onInput={(e) => setQ({ q: (e.target as HTMLInputElement).value })} />
        <select value={tag} onChange={(e) => setQ({ topic: (e.target as HTMLSelectElement).value })}>
          <option value="">Any topic</option>
          {tags.map((t) => <option value={t}>{tagLabel(t)} ({inCh.filter((it) => it.tags?.includes(t)).length})</option>)}
        </select>
      </div>
      <div class="signbar">
        <span><b>{ticked.length}</b> of {list.length} ticked{list.length - can.length > 0 && <span class="warn-t"> · {list.length - can.length} cannot be signed yet</span>}</span>
        <button class="btn" onClick={() => toggleSign(can.map((i) => i.id), me, true)}>Tick all {can.length} shown</button>
        {ticked.length > 0 && <button class="btn ghost" onClick={() => toggleSign(can.map((i) => i.id), me, false)}>Untick</button>}
        <a class={"btn primary" + (signs.value.length ? "" : " disabled")} href={href("changes/proposal")}>Review and send ({signs.value.filter((s) => s.role === me).length})</a>
      </div>
      <ul class="plain signlist">
        <More items={list} n={20} noun="items" render={(it) => {
          const blocked = signBlockers(it);
          const on = isPendingSign(it.id, me);
          const why = requiredRoles(it).find((r) => r.role === me)?.why;
          return (
            <li class={"signitem" + (on ? " on" : "") + (blocked.length ? " blocked" : "")}>
              <label class="tick"><input type="checkbox" checked={on} disabled={blocked.length > 0} onChange={(e) => toggleSign([it.id], me, (e.target as HTMLInputElement).checked)} /><span class="sr">Sign {it.name}</span></label>
              <div class="si-body">
                <p class="si-h"><span class={"kdot k-" + it.kind} /> <ItemLink it={it} cls="plainlink strong" /> <span class="idtag">{it.id}</span> <Flags it={it} /></p>
                <p class="si-m"><Rich text={firstSentence(it.meaning, 420)} /></p>
                {it.kind === "derived" && <details class="si-rule"><summary>The rule</summary><RuleText it={it} /></details>}
                {it.kind === "parameter" && <p class="small">Today: <b>{fmtVal(versionInForce(it, TODAY)?.value ?? it.value, it)}</b></p>}
                <p class="small muted">You sign because {why}.{requiredRoles(it).length > 1 && <> Also signing: {requiredRoles(it).filter((r) => r.role !== me).map((r) => r.role).join(", ")}.</>}</p>
                {blocked.map((b) => <p class="warnbox small"><b>Cannot be signed yet.</b> {b}</p>)}
              </div>
            </li>
          );
        }} />
      </ul>
      {!list.length && <Empty>Nothing in this group for your role.</Empty>}
    </div>
  );
}

/* ---------- Programs ---------- */
export function Programs() {
  return (
    <div>
      <h1>Programs</h1>
      <p class="lede">Every program a household can apply for through PEAK, as rules. Start from what a program decides and follow it down to the facts and figures it reads.</p>
      <div class="pgrid">
        {PROGRAM_ORDER.map((p) => {
          const items = D.items.filter((it) => it.program === p);
          const outs = programOutcomes(p, true);
          const oq = new Set(items.flatMap((it) => openQuestions(it).map((q) => q.id)));
          return (
            <a class="pcard" href={href("programs/" + p)} style={`--h:${PROGRAMS[p].hue}`}>
              <h2>{PROGRAMS[p].label}</h2>
              <p class="pc-outs">{outs.slice(0, 4).map((o) => o.name.replace(/^[^:]+: /, "")).join(" · ")}{outs.length > 4 && ` · and ${outs.length - 4} more`}</p>
              <p class="pc-n"><b>{items.filter((i) => i.kind === "derived").length}</b> rules · <b>{items.filter((i) => i.kind === "parameter").length}</b> figures · <b>{oq.size}</b> open questions</p>
            </a>
          );
        })}
        <a class="pcard shared" href={href("programs/All")} style="--h:230">
          <h2>Shared by every program</h2>
          <p class="pc-outs">Age, relationships, immigration status, the federal poverty guideline and the other things more than one program reads.</p>
          <p class="pc-n"><b>{D.items.filter((i) => i.program === "All" && i.kind === "derived").length}</b> rules · <b>{D.items.filter((i) => i.kind === "supplied").length}</b> facts we are told</p>
        </a>
      </div>
    </div>
  );
}
export function Program({ id }: { id: string }) {
  const p = PROGRAMS[id];
  const q = route.value.q;
  if (!p) return <Empty>No such program.</Empty>;
  const items = useMemo(() => D.items.filter((it) => it.program === id), [id]);
  const outs = programOutcomes(id, true), ver = programOutcomes(id, false).filter(isVerificationOutcome);
  const kind = q.kind ?? "", text = (q.q ?? "").toLowerCase(), topic = q.topic ?? "";
  const tags = [...new Set(items.flatMap((it) => it.tags ?? []))].sort();
  const list = items.filter((it) => (!kind || it.kind === kind) && (!topic || it.tags?.includes(topic)) && (!text || (it.name + " " + it.id + " " + it.identifier + " " + (it.meaning ?? "")).toLowerCase().includes(text)));
  const oqs = [...new Set(items.flatMap((it) => openQuestions(it)))];
  return (
    <div>
      <Crumbs items={[["Programs", href("programs")], p.short]} />
      <h1>{p.label}</h1>
      {id !== "All" && (
        <section class="card">
          <h2>What it decides</h2>
          <p class="small muted">Each of these is worked out for every person, each month. Open one to see how.</p>
          <ul class="plain">{outs.map((o) => <li><ItemRow it={o} extra={<Flags it={o} />} /></li>)}</ul>
          {ver.length > 0 && <Fold title="Verification: what proof is outstanding and when it is due" count={`${ver.length} results`}><ul class="plain">{ver.map((o) => <li><ItemRow it={o} /></li>)}</ul></Fold>}
        </section>
      )}
      {oqs.length > 0 && <p class="notice q"><b>{oqs.length} open question{oqs.length > 1 ? "s" : ""}</b> touch this program. <a href={href("questions", id === "All" ? {} : { program: id })}>See them</a></p>}
      <section class="card">
        <h2>Everything in it</h2>
        <div class="filters">
          <input type="search" placeholder="Filter by words, e.g. “earned income”" value={q.q ?? ""} onInput={(e) => setQ({ q: (e.target as HTMLInputElement).value })} />
          <div class="segs">{[["", "All"], ["derived", "Rules"], ["parameter", "Figures"], ["supplied", "Facts"]].map(([k, l]) => <button class={"seg" + (kind === k ? " on" : "")} onClick={() => setQ({ kind: k || undefined })}>{l} {items.filter((i) => !k || i.kind === k).length}</button>)}</div>
          <select value={topic} onChange={(e) => setQ({ topic: (e.target as HTMLSelectElement).value })}><option value="">Any topic</option>{tags.map((t) => <option value={t}>{tagLabel(t)}</option>)}</select>
        </div>
        <ul class="plain"><More items={list} n={25} noun="items" render={(it) => <li><ItemRow it={it} extra={<Flags it={it} />} value={it.kind === "parameter" ? fmtVal(versionInForce(it, TODAY)?.value ?? it.value, it) : undefined} /></li>} /></ul>
        {!list.length && <Empty>Nothing matches.</Empty>}
      </section>
    </div>
  );
}

/* ---------- Figures ---------- */
export function Figures() {
  const q = route.value.q;
  const date = q.on && /^\d{4}-\d{2}-\d{2}$/.test(q.on) ? q.on : TODAY;
  const text = (q.q ?? "").toLowerCase(), prog = q.program ?? "", show = q.show ?? "";
  const all = useMemo(() => D.items.filter((it) => it.kind === "parameter").sort((a, b) => a.name.localeCompare(b.name)), []);
  const year = date.slice(0, 4);
  const list = all.filter((it) => {
    if (prog && it.program !== prog) return false;
    if (text && !(it.name + " " + it.id + " " + it.identifier + " " + (it.meaning ?? "")).toLowerCase().includes(text)) return false;
    if (show === "dated" && !(it.versions && it.versions.length > 1)) return false;
    if (show === "year" && !(it.versions ?? []).some((v) => v.from.slice(0, 4) === year)) return false;
    if (show === "unverified" && !unverifiedDirect.has(it.identifier)) return false;
    if (show === "due" && !(it.review_by && it.review_by < "2027-02-01")) return false;
    if (show === "none" && !(Array.isArray(it.versions) && !versionInForce(it, date))) return false;
    return true;
  });
  return (
    <div>
      <h1>Figures</h1>
      <p class="lede">Every number the rules read: limits, standards, rates, ages. Each keeps its dated versions and the text it was taken from.</p>
      <div class="filters">
        <input type="search" placeholder="Find a figure, e.g. “need standard” or “poverty”" value={q.q ?? ""} onInput={(e) => setQ({ q: (e.target as HTMLInputElement).value })} />
        <select value={prog} onChange={(e) => setQ({ program: (e.target as HTMLSelectElement).value })}><option value="">Any program</option>{[...PROGRAM_ORDER, "All"].map((p) => <option value={p}>{PROGRAMS[p].short}</option>)}</select>
        <select value={show} onChange={(e) => setQ({ show: (e.target as HTMLSelectElement).value })}>
          <option value="">All figures</option>
          <option value="year">With a new version in {year}</option>
          <option value="dated">With more than one dated version</option>
          <option value="unverified">Source not verified</option>
          <option value="due">New version due soon</option>
          <option value="none">No published value on this date</option>
        </select>
        <label class="inline">Values in force on <input type="date" value={date} onChange={(e) => setQ({ on: (e.target as HTMLInputElement).value })} /></label>
      </div>
      <p class="small muted">{list.length} of {all.length} figures · values as of {fmtDate(date)}</p>
      <table class="figs">
        <thead><tr><th>Figure</th><th>Value on {fmtDate(date)}</th><th>In force since</th><th>Versions</th></tr></thead>
        <tbody>
          <More items={list} n={40} noun="figures" render={(it) => {
            const v = it.versions ? versionInForce(it, date) : null;
            const val = it.versions ? v?.value : it.value;
            return (
              <tr>
                <td data-l="Figure"><ItemLink it={it} cls="plainlink strong" /> <ProgramTag id={it.program} /> {unverifiedDirect.has(it.identifier) && <Pill tone="warn">not verified</Pill>}</td>
                <td data-l="Value" class="num">{val === undefined || val === null ? <span class="warn-t">no published value</span> : typeof val === "object" ? <a href={href("item/" + it.id)}>table, {Object.keys(val as object).length} rows</a> : <b>{fmtVal(val, it)}</b>}</td>
                <td data-l="Since">{v ? fmtDate(v.from) : it.versions ? "" : <span class="muted">not dated</span>}{v?.to && <span class="muted small"><br />until {fmtDate(v.to)}</span>}</td>
                <td data-l="Versions">{it.versions ? it.versions.length : <span class="muted">–</span>}{it.review_by && <span class="muted small"><br />next due {fmtDate(it.review_by)}</span>}</td>
              </tr>
            );
          }} />
        </tbody>
      </table>
      {!list.length && <Empty>No figure matches.</Empty>}
    </div>
  );
}

/* ---------- Questions ---------- */
const STATE: Record<string, { label: string; tone: string }> = { open: { label: "Open", tone: "q" }, partly: { label: "Partly settled", tone: "q" }, resolved: { label: "Settled", tone: "ok" } };
export function QRow({ q, compact }: { q: Question; compact?: boolean }) {
  const w = weightOf(q);
  const pend = notes.value.filter((n) => n.target === q.id).length;
  return (
    <a class="qcard" href={href("questions/" + q.id)}>
      <span class="qc-h"><span class="idtag">{q.id}</span> <Pill tone={STATE[q.state].tone}>{STATE[q.state].label}</Pill> {questionPrograms(q).map((p) => <ProgramTag id={p} />)}{pend > 0 && <Pill tone="ok">your note pending</Pill>}</span>
      <span class="qc-t">{q.title}</span>
      <span class="qc-w">{w.outs} outcome{w.outs === 1 ? "" : "s"} · {w.hh.length} stored household{w.hh.length === 1 ? "" : "s"} · {q.items.length} item{q.items.length === 1 ? "" : "s"}{!compact && <> · owned by {questionOwners(q).slice(0, 2).join(", ") || "nobody yet"}</>}</span>
    </a>
  );
}
export function Questions() {
  const q = route.value.q;
  const state = q.state ?? "unsettled", owner = q.owner ?? "", prog = q.program ?? "", sort = q.sort ?? "weight", text = (q.q ?? "").toLowerCase();
  const list = D.questions.filter((x) => {
    if (state === "unsettled" ? x.state === "resolved" : state !== "all" && x.state !== state) return false;
    if (owner && !questionOwners(x).includes(owner)) return false;
    if (prog && !questionPrograms(x).includes(prog)) return false;
    if (text && !(x.id + " " + x.title + " " + x.paras.join(" ")).toLowerCase().includes(text)) return false;
    return true;
  }).sort((a, b) => sort === "number" ? +a.id.slice(3) - +b.id.slice(3) : sort === "items" ? b.items.length - a.items.length : weightOf(b).hh.length - weightOf(a).hh.length || weightOf(b).outs - weightOf(a).outs);
  const n = (s: string) => D.questions.filter((x) => (s === "unsettled" ? x.state !== "resolved" : x.state === s) && (!owner || questionOwners(x).includes(owner))).length;
  return (
    <div>
      <h1>Questions</h1>
      <p class="lede">Where the text of the law did not settle how to write a rule. Each one records the assumption the draft uses meanwhile, so the rulebook still gives an answer.</p>
      <div class="filters">
        <div class="segs">{[["unsettled", "Open"], ["partly", "Partly settled"], ["resolved", "Settled"], ["all", "All"]].map(([k, l]) => <button class={"seg" + (state === k ? " on" : "")} onClick={() => setQ({ state: k === "unsettled" ? undefined : k })}>{l} {k === "all" ? D.questions.length : n(k)}</button>)}</div>
        <select value={owner} onChange={(e) => setQ({ owner: (e.target as HTMLSelectElement).value })} aria-label="Owner"><option value="">Any owner</option>{D.meta.approval_policy.roles.map((r) => <option value={r}>{r}{r === role.value ? " (you)" : ""}</option>)}</select>
        <select value={prog} onChange={(e) => setQ({ program: (e.target as HTMLSelectElement).value })} aria-label="Program"><option value="">Any program</option>{PROGRAM_ORDER.map((p) => <option value={p}>{PROGRAMS[p].short}</option>)}</select>
        <select value={sort} onChange={(e) => setQ({ sort: (e.target as HTMLSelectElement).value })} aria-label="Sort"><option value="weight">Sort: most households affected</option><option value="items">Sort: most items affected</option><option value="number">Sort: by number</option></select>
        <input type="search" placeholder="Filter by words" value={q.q ?? ""} onInput={(e) => setQ({ q: (e.target as HTMLInputElement).value })} />
      </div>
      <p class="small muted">{list.length} question{list.length === 1 ? "" : "s"}{owner ? ` owned by ${owner}` : ""}. Ownership follows the roles that must approve the items a question touches.</p>
      <ul class="plain qlist"><More items={list} n={30} noun="questions" render={(x) => <li><QRow q={x} /></li>} /></ul>
      {!list.length && <Empty>No question matches.</Empty>}
    </div>
  );
}
function splitEntry(p: string): { head: string | null; body: string } {
  const m = /^([A-Z][^:.]{3,90}?(?:\(\d{4}-\d{2}-\d{2}\)|round[^:]{0,40}|sweep[^:]{0,30}|Phase \d+[^:]{0,40})?):\s+/.exec(p);
  if (m && m[1].length < 110 && !/^Items$/.test(m[1])) return { head: m[1], body: p.slice(m[0].length) };
  return { head: null, body: p };
}
export function QuestionPage({ id }: { id: string }) {
  const q = qById.get(id);
  const [mode, setMode] = useState<"" | "answer" | "opinion">("");
  if (!q) return <Empty>There is no question {id}.</Empty>;
  const items = q.items.map((i) => byId.get(i)!).filter(Boolean);
  const w = weightOf(q);
  const outs = outcomesReached(items.map((i) => i.identifier)).filter((o) => !isVerificationOutcome(o));
  const assume = items.filter((i) => i.assumption);
  const mine = notes.value.filter((n) => n.target === q.id);
  const owners = questionOwners(q);
  return (
    <article class="question">
      <Crumbs items={[["Questions", href("questions")], q.id]} />
      <p class="eyebrow">{q.id} · <Pill tone={STATE[q.state].tone}>{STATE[q.state].label}</Pill> {questionPrograms(q).map((p) => <ProgramTag id={p} />)}</p>
      <h1>{q.title}</h1>
      <p class="small muted">Owned by {owners.length ? owners.join(", ") : "no role yet"} · holds {q.items.length} item{q.items.length === 1 ? "" : "s"}, {w.outs} outcome{w.outs === 1 ? "" : "s"}, {w.hh.length} stored household{w.hh.length === 1 ? "" : "s"}</p>
      <div class="item-grid">
        <div class="item-main">
          <section class="card">
            <h2>The question</h2>
            <p class="lead"><Rich text={q.paras[0]} /></p>
          </section>
          {q.paras.length > 1 && (
            <section class="card">
              <h2>What has been found since</h2>
              <ol class="thread">
                {q.paras.slice(1).map((p) => { const e = splitEntry(p); return <li>{e.head && <h4>{e.head}</h4>}<p><Rich text={e.body} /></p></li>; })}
              </ol>
            </section>
          )}
          {mine.map((n) => (
            <section class="card pending">
              <h2>{n.kind === "opinion" ? "Legal opinion" : "Answer"} from {n.role} <Pill tone="ok">in your proposal</Pill></h2>
              <p>{n.text}</p>
              {n.authority && <p class="small"><b>Authority:</b> {n.authority}</p>}
              {n.effect && <p class="small"><b>Effect:</b> {n.effect}</p>}
              <p class="small"><a href={href("changes/proposal")}>Review and send</a> · <button class="linkish" onClick={() => dropNote(n.id)}>remove</button></p>
            </section>
          ))}
          {assume.length > 0 && (
            <section class="card">
              <h2>What the draft assumes meanwhile</h2>
              {assume.map((i) => <div class="assumed"><p><ItemLink it={i} /></p><p class="small"><Rich text={i.assumption} /></p></div>)}
            </section>
          )}
          <section class="card">
            <h2>Items that carry it ({items.length})</h2>
            <ul class="plain">{items.map((i) => <li><ItemRow it={i} extra={<ProgramTag id={i.program} />} /></li>)}</ul>
            {!items.length && <Empty>No item is named.</Empty>}
          </section>
          <Fold title="What it holds up" count={`${outs.length} outcomes · ${w.hh.length} stored households`}>
            <p>{outs.map((o, i) => <>{i > 0 && " · "}<ItemLink it={o} /></>)}</p>
            <ul class="plain">{w.hh.map((c) => <li><a href={href("households/" + c)}><b>{c}</b> {caseById(c)?.title}</a></li>)}</ul>
          </Fold>
        </div>
        <aside class="item-side">
          <div class="side-card">
            <h3>Settle it</h3>
            <p class="small muted">You are {role.value}{owners.includes(role.value) ? ", an owner of this question" : ""}.</p>
            <div class="btncol">
              <button class={"btn" + (role.value !== "Legal" ? " primary" : "")} onClick={() => setMode(mode === "answer" ? "" : "answer")}>Answer it</button>
              <button class={"btn" + (role.value === "Legal" ? " primary" : "")} onClick={() => setMode(mode === "opinion" ? "" : "opinion")}>Record a legal opinion</button>
            </div>
            {mode && <NoteForm q={q} kind={mode} done={() => setMode("")} />}
          </div>
        </aside>
      </div>
    </article>
  );
}
function NoteForm({ q, kind, done }: { q: Question; kind: "answer" | "opinion"; done: () => void }) {
  const [text, setText] = useState(""), [auth, setAuth] = useState(""), [effect, setEffect] = useState(kind === "opinion" ? "The draft’s assumption stands" : "Settles the question; no rule change");
  const effects = kind === "opinion"
    ? ["The draft’s assumption stands", "The draft’s assumption must change", "Federal statute governs over Colorado’s text", "Colorado’s text governs", "Cannot be settled without rulemaking"]
    : ["Settles the question; no rule change", "Settles the question; the rules must change", "Settles part of it", "Needs a legal opinion first"];
  return (
    <form class="form" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; addNote({ kind, target: q.id, role: kind === "opinion" ? "Legal" : role.value, text, authority: auth, effect }); done(); }}>
      <label>{kind === "opinion" ? "The opinion" : "The answer"}<textarea rows={6} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} placeholder={kind === "opinion" ? "State the conclusion first, then the reasoning." : "What the agency decides, in a sentence a county worker could apply."} /></label>
      <label>Authority relied on<input value={auth} onInput={(e) => setAuth((e.target as HTMLInputElement).value)} placeholder="e.g. 42 U.S.C. 1396b(v)(5); CMS SHO #26-001" /></label>
      <label>Effect<select value={effect} onChange={(e) => setEffect((e.target as HTMLSelectElement).value)}>{effects.map((x) => <option>{x}</option>)}</select></label>
      <p class="small muted">It is added to the question’s record through your proposal, dated today and signed with the role{kind === "opinion" ? " Legal" : ""}. The {q.items.length} items stay as they are until someone proposes the rule change.</p>
      <button class="btn primary" type="submit">Add to proposal</button>
    </form>
  );
}
