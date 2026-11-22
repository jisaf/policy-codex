/* Law (federal over state, unverified figures, sources and documents),
 * Changes (what took effect, your proposal) and Search. */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import {
  D, E, TODAY, byId, byIdent, srcById, docById, qById, citedBy, PROGRAMS, PROGRAM_ORDER, fmtVal, fmtDate, openQuestions, downstream,
  outcomesReached, householdsReading, outcomeProgram, isVerificationOutcome, touchedBy, caseById, personLabel, requiredRoles, tookEffect,
  withoutVersion, compareEngines, draftEngine, checkCase, edits, signs, notes, sent, dropEdit, dropNote, toggleSign, questionOwners,
  unverifiedDirect, itemSources, role, type CItem, type Diff, type Took,
} from "./store";
import { href, route, setQ, ProgramTag, Pill, Fold, More, ItemLink, ItemRow, Rich, ValueView, SourceCard, Quote, Crumbs, Empty, AidNotice } from "./ui";
import { describeEdit } from "./item";

/* ---------- Law ---------- */
function LawTabs({ cur }: { cur: string }) {
  const n = D.items.filter((i) => i.statute_override).length, u = D.sources.filter((s) => s.unverified).length;
  return (
    <div class="tabs">
      {[["", `Federal law over Colorado’s rule (${n})`], ["unverified", `Unverified figures (${u} sources)`], ["sources", `Sources (${D.sources.length} excerpts)`]].map(([k, l]) => <a class={cur === k ? "on" : ""} href={href("law" + (k ? "/" + k : ""))}>{l}</a>)}
    </div>
  );
}
export function Law({ sub, id }: { sub?: string; id?: string }) {
  if (sub === "doc" && id) return <DocPage id={id} />;
  if (sub === "source" && id) return <SourcePage id={id} />;
  return (
    <div>
      <h1>Law</h1>
      <p class="lede">Where the rulebook stands on the text of the law: where it departs from Colorado’s rule, where it could not check a figure, and every excerpt it quotes.</p>
      <LawTabs cur={sub ?? ""} />
      {!sub && <Overrides />}
      {sub === "unverified" && <Unverified />}
      {sub === "sources" && <Sources />}
    </div>
  );
}
function Affected({ ids }: { ids: string[] }) {
  const outs = outcomesReached(ids).filter((o) => !isVerificationOutcome(o));
  const hh = householdsReading(ids);
  const progs = PROGRAM_ORDER.filter((p) => outs.some((o) => outcomeProgram.get(o.identifier) === p));
  return (
    <div class="affected">
      <p class="small"><b>Decides:</b> {outs.length ? <More items={outs} n={5} noun="outcomes" render={(o, i) => <>{i > 0 && " · "}<ItemLink it={o} /></>} /> : "no program outcome directly"} {progs.map((p) => <ProgramTag id={p} />)}</p>
      <p class="small"><b>Stored households that read it ({hh.length}):</b> {hh.length ? <More items={hh} n={6} noun="households" render={(c, i) => <>{i > 0 && ", "}<a href={href("households/" + c)} title={caseById(c)?.title}>{c}</a></>} /> : "none"}</p>
    </div>
  );
}
function Overrides() {
  const q = route.value.q;
  const all = D.items.filter((i) => i.statute_override);
  const prog = q.program ?? "";
  const list = all.filter((i) => !prog || i.program === prog);
  return (
    <div>
      <p>The rulebook normally follows Colorado’s rule text. In these {all.length} places a federal or state statute says something the Colorado rule has not caught up with, and the rulebook follows the statute. Each one needs Legal’s signature.</p>
      <div class="chips">
        <a class={"chip" + (!prog ? " on" : "")} href={href("law")}>All <b>{all.length}</b></a>
        {PROGRAM_ORDER.filter((p) => all.some((i) => i.program === p)).map((p) => <a class={"chip" + (prog === p ? " on" : "")} href={href("law", { program: p })}>{PROGRAMS[p].short} <b>{all.filter((i) => i.program === p).length}</b></a>)}
      </div>
      {list.map((it) => {
        const oq = (it.open ?? []).map((o) => qById.get(o)).filter(Boolean);
        const ss = itemSources(it).map((s) => srcById.get(s)!).filter(Boolean);
        return (
          <section class="card ovr">
            <p class="eyebrow"><ProgramTag id={it.program} /> {it.effective && <span class="muted">in force from {fmtDate(it.effective.from)}</span>} <span class="idtag">{it.id}</span></p>
            <h2><ItemLink it={it} cls="plainlink" /></h2>
            <p class="ovr-text"><Rich text={it.statute_override} /></p>
            <Fold title="The reasoning" count={`${oq.length} question${oq.length === 1 ? "" : "s"} · ${ss.length} excerpts`}>
              <p class="small muted">What the rule means as written</p>
              <p><Rich text={it.meaning} /></p>
              {it.assumption && <><p class="small muted">Working assumption</p><p><Rich text={it.assumption} /></p></>}
              {oq.length > 0 && <><p class="small muted">Questions it hangs on</p><ul class="plain">{oq.map((x) => <li><a href={href("questions/" + x!.id)}><b>{x!.id}</b> {x!.title}</a> <Pill tone={x!.state === "resolved" ? "ok" : "q"}>{x!.state === "resolved" ? "settled" : x!.state === "partly" ? "partly settled" : "open"}</Pill></li>)}</ul></>}
              <p class="small muted">The texts, word for word</p>
              <More items={ss} n={4} noun="excerpts" render={(s) => <SourceCard s={s} />} />
            </Fold>
            <Affected ids={[it.identifier]} />
          </section>
        );
      })}
    </div>
  );
}
function Unverified() {
  const srcs = D.sources.filter((s) => s.unverified);
  const direct = D.items.filter((i) => unverifiedDirect.has(i.identifier));
  const rest = useMemo(() => [...new Set(direct.flatMap((i) => downstream(i.identifier)))].map((i) => byIdent.get(i)!).filter(Boolean), []);
  return (
    <div>
      <p>An excerpt is quoted only from text that could be fetched from an official source. These {srcs.length} could not, so their figures were supplied by hand. Nothing that rests on them can move past Draft until the excerpt is replaced with the real text.</p>
      <section class="card">
        <h2>In short</h2>
        <p><b>{direct.length}</b> items take a figure from an unverified source; <b>{rest.length}</b> more rules rest on those.</p>
        <Affected ids={direct.map((i) => i.identifier)} />
      </section>
      {srcs.map((s) => {
        const items = citedBy.get(s.id) ?? [];
        return (
          <section class="card">
            <SourceCard s={s} open />
            <h3>Figures and rules taken from it ({items.length})</h3>
            <ul class="plain">{items.map((it) => <li><ItemRow it={it} value={it.kind === "parameter" ? <span>{typeof (it.versions?.at(-1)?.value ?? it.value) === "object" ? "table" : fmtVal(it.versions?.at(-1)?.value ?? it.value, it)}</span> : undefined} extra={<span class="muted small">{downstream(it.identifier).length} rules rest on it</span>} /></li>)}</ul>
          </section>
        );
      })}
      <Fold title="Everything that rests on them" count={`${rest.length} rules`}>
        <ul class="plain"><More items={rest} n={15} noun="rules" render={(it) => <li><ItemRow it={it} extra={<ProgramTag id={it.program} />} /></li>} /></ul>
      </Fold>
    </div>
  );
}
function Sources() {
  const q = route.value.q;
  const text = (q.q ?? "").toLowerCase(), kind = q.kind ?? "";
  const bySrcDoc = useMemo(() => { const m = new Map<string, number>(); for (const s of D.sources) if (s.doc) m.set(s.doc, (m.get(s.doc) ?? 0) + 1); return m; }, []);
  const kinds = [...new Set(D.documents.map((d) => d.kind))].sort();
  const docs = D.documents.filter((d) => (!kind || d.kind === kind) && (!text || (d.title + " " + d.citation + " " + d.id).toLowerCase().includes(text)));
  const hits = text.length > 2 ? D.sources.filter((s) => (s.id + " " + s.cite + " " + s.title + " " + s.quote).toLowerCase().includes(text)) : [];
  return (
    <div>
      <div class="filters">
        <input type="search" placeholder="Find a citation or words in the law, e.g. “273.9” or “over 65”" value={q.q ?? ""} onInput={(e) => setQ({ q: (e.target as HTMLInputElement).value })} />
        <select value={kind} onChange={(e) => setQ({ kind: (e.target as HTMLSelectElement).value })}><option value="">Any kind of document</option>{kinds.map((k) => <option value={k}>{k}</option>)}</select>
      </div>
      {hits.length > 0 && <section class="card"><h2>Excerpts matching “{q.q}” ({hits.length})</h2><More items={hits} n={8} noun="excerpts" render={(s) => <SourceCard s={s} />} /></section>}
      <h2>Documents ({docs.length})</h2>
      <ul class="plain doclist">
        <More items={docs} n={40} noun="documents" render={(d) => (
          <li><a class="row" href={href("law/doc/" + d.id)}><span class="row-main"><span class="row-name">{d.title}</span><span class="row-sub">{d.kind} · {d.citation}{d.date ? ` · ${fmtDate(d.date)}` : ""}</span></span><span class="row-side"><span class="muted small">{bySrcDoc.get(d.id) ?? 0} excerpts</span><span class="idtag">{d.id}</span></span></a></li>
        )} />
      </ul>
    </div>
  );
}
function CitedBy({ sid }: { sid: string }) {
  const items = citedBy.get(sid) ?? [];
  if (!items.length) return <p class="small muted">No item cites this excerpt.</p>;
  return <p class="small citedby"><span class="muted">Relied on by: </span><More items={items} n={6} noun="items" render={(it, i) => <>{i > 0 && " · "}<ItemLink it={it} /></>} /></p>;
}
function SourcePage({ id }: { id: string }) {
  const s = srcById.get(id);
  if (!s) return <Empty>No excerpt {id}.</Empty>;
  return (
    <div>
      <Crumbs items={[["Law", href("law")], ["Sources", href("law/sources")], s.id]} />
      <h1>{s.title}</h1>
      <SourceCard s={s} open />
      <section class="card"><h2>Items that rely on it</h2><ul class="plain">{(citedBy.get(id) ?? []).map((it) => <li><ItemRow it={it} extra={<ProgramTag id={it.program} />} /></li>)}</ul></section>
    </div>
  );
}
const norm = (s: string) => s.replace(/[*_>]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
// The documents' text comes in a few bundle files (scripts/build-data.ts):
// `documents.json` says which one holds each document.
let docIndex: Promise<Record<string, string>> | null = null;
const docChunks = new Map<string, Promise<Record<string, string>>>();
const getJson = (url: string): Promise<Record<string, string>> =>
  fetch(url).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
async function documentText(file: string): Promise<string> {
  docIndex ??= getJson("./documents.json");
  const name = (await docIndex)[file];
  if (!name) return "";
  let chunk = docChunks.get(name);
  if (!chunk) docChunks.set(name, (chunk = getJson("./" + name)));
  return (await chunk)[file] ?? "";
}
function DocPage({ id }: { id: string }) {
  const d = docById.get(id);
  const at = route.value.q.at;
  const [text, setText] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setText(null); if (d) documentText(d.file).then(setText).catch(() => setText("")); }, [id]);
  const excerpts = D.sources.filter((s) => s.doc === id);
  const target = at ? srcById.get(at) : null;
  const paras = useMemo(() => (text ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean), [text]);
  const hit = useMemo(() => {
    if (!target || !paras.length) return new Set<number>();
    const out = new Set<number>();
    const chunks = target.quote.split(/\n+/).map(norm).filter((c) => c.length >= 8);
    paras.forEach((p, i) => { const np = norm(p); if (chunks.some((c) => np.includes(c.slice(0, 70)) || (np.length > 30 && c.includes(np.slice(0, 70))))) out.add(i); });
    return out;
  }, [target, paras]);
  useEffect(() => { if (hit.size) setTimeout(() => ref.current?.querySelector(".hit")?.scrollIntoView({ block: "center" }), 50); }, [hit]);
  if (!d) return <Empty>No document {id}.</Empty>;
  const big = paras.length > 1500;
  const first = hit.size ? Math.min(...hit) : 0;
  const shown = big ? paras.map((p, i) => [p, i] as const).filter(([, i]) => i >= first - 30 && i <= first + 120) : paras.map((p, i) => [p, i] as const);
  return (
    <div class="doc">
      <Crumbs items={[["Law", href("law")], ["Sources", href("law/sources")], d.id]} />
      <p class="eyebrow">{d.kind} · {d.citation} <span class="idtag">{d.id}</span></p>
      <h1>{d.title}</h1>
      <p class="small"><a href={d.url} target="_blank" rel="noreferrer">Official page ↗</a>{d.date && <span class="muted"> · dated or retrieved {fmtDate(d.date)}</span>} · <span class="muted">the copy below was fetched and kept with the rulebook without editorial change</span></p>
      {target && <div class="notice">{hit.size ? <>Showing excerpt <b>{target.id}</b> ({target.cite.replace(/\.$/, "")}) in place, highlighted below.</> : <>Excerpt <b>{target.id}</b> could not be located automatically in this copy{target.unverified ? " (it is not a quotation)" : ""}. It reads:</>}{!hit.size && <Quote text={target.quote} />}<CitedBy sid={target.id} /></div>}
      <Fold title="Excerpts the rulebook quotes from this document" count={excerpts.length} open={!target}>
        <More items={excerpts} n={10} noun="excerpts" render={(s) => <div><SourceCard s={s} /><CitedBy sid={s.id} /></div>} />
      </Fold>
      <section class="card doctext" ref={ref}>
        <h2>Full text</h2>
        {text === null && <p class="muted">Loading the document…</p>}
        {text === "" && <p class="muted">The full text is not available in this build.</p>}
        {big && <p class="small muted">A long document ({paras.length.toLocaleString()} paragraphs): showing the part around the excerpt.</p>}
        {shown.map(([p, i]) => (/^#+ /.test(p) ? <h3>{p.replace(/^#+ /, "")}</h3> : <p class={hit.has(i) ? "hit" : ""}>{p.replace(/\*([^*]+)\*/g, "$1")}</p>))}
      </section>
    </div>
  );
}

/* ---------- Changes ---------- */
export function Changes({ sub }: { sub?: string }) {
  const n = edits.value.length + signs.value.length + notes.value.length;
  return (
    <div>
      <h1>Changes</h1>
      <div class="tabs">
        <a class={!sub ? "on" : ""} href={href("changes")}>What took effect</a>
        <a class={sub === "proposal" ? "on" : ""} href={href("changes/proposal")}>Your proposal{n ? ` (${n})` : ""}</a>
      </div>
      {sub === "proposal" ? <Proposal /> : <TookEffect />}
    </div>
  );
}
function hhNames(ids: string[]): ComponentChildren {
  return <More items={ids} n={8} noun="households" render={(c, i) => <>{i > 0 && ", "}<a href={href("households/" + c)} title={caseById(c)?.title}>{c}</a></>} />;
}
function DiffList({ diffs, eng }: { diffs: Diff[]; eng?: ReturnType<typeof draftEngine> }) {
  const by = new Map<string, Diff[]>();
  for (const d of diffs) by.set(d.caseId, (by.get(d.caseId) ?? []).concat([d]));
  if (!diffs.length) return <p class="ok-t">No stored household gets a different result.</p>;
  return (
    <div class="difflist">
      <p><b>{by.size} of {D.cases.length} stored households</b> get a different result ({diffs.length} result{diffs.length === 1 ? "" : "s"}).</p>
      {[...by.entries()].map(([cid, ds]) => {
        const c = caseById(cid)!;
        return (
          <details class="diffcase" open={by.size <= 3}>
            <summary><a href={href("households/" + cid)}><b>{cid}</b></a> {c.title.replace(/^"|"$/g, "")} <span class="muted">· {ds.length} result{ds.length === 1 ? "" : "s"}</span></summary>
            <table class="outs">
              <tbody>
                {ds.map((d) => { const it = (eng?.item(d.identifier) ?? byIdent.get(d.identifier))!; const who = (p: string) => personLabel(c, p); return (
                  <tr><td>{who(d.person)}</td><td><ItemLink it={it} cls="plainlink" /></td><td><span class="del">{fmtVal(d.before, it, who, true)}</span> → <span class="ins">{fmtVal(d.after, it, who, true)}</span></td></tr>
                ); })}
              </tbody>
            </table>
          </details>
        );
      })}
    </div>
  );
}
function TookRow({ t }: { t: Took }) {
  const [diffs, setDiffs] = useState<Diff[] | null>(null);
  const [busy, setBusy] = useState(false);
  const hh = touchedBy.get(t.item.identifier) ?? [];
  const after = hh.filter((c) => caseById(c)!.as_of >= t.date);
  const same = t.what === "figure" && JSON.stringify(t.before) === JSON.stringify(t.after);
  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const without = E.withDrafts([withoutVersion(t.item, t.date)]);
      const ids = [t.item.identifier, ...downstream(t.item.identifier)].filter((i) => outcomeProgram.has(i) && !isVerificationOutcome(byIdent.get(i)!));
      setDiffs(compareEngines(without, E, ids, after));
      setBusy(false);
    }, 30);
  };
  const scalar = (v: unknown) => v === undefined || v === null || typeof v !== "object";
  return (
    <li class="took">
      <div class="took-h">
        <span class="took-d">{fmtDate(t.date)}</span>
        <span class="took-n"><span class={"kdot k-" + t.item.kind} /> <ItemLink it={t.item} cls="plainlink strong" /> <ProgramTag id={t.item.program} /> {t.item.statute_override && <Pill tone="fed">federal over Colorado rule</Pill>}</span>
      </div>
      <div class="took-b">
        {t.what === "rule" && <p>A new rule came into force. Before this date it said nothing.</p>}
        {t.what === "figure" && (t.first ? <p>First dated figure: {scalar(t.after) ? <b>{fmtVal(t.after, t.item)}</b> : "a table"}</p>
          : same ? <p><Pill tone="freeze">no change</Pill> A new period began with the same figure as before.</p>
          : scalar(t.after) && scalar(t.before) ? <p><span class="del">{fmtVal(t.before, t.item)}</span> → <span class="ins">{fmtVal(t.after, t.item)}</span></p>
          : <details><summary>The table changed (changed rows outlined)</summary><ValueView v={t.after} it={t.item} prev={t.before} /></details>)}
        <p class="small"><b>{hh.length}</b> stored household{hh.length === 1 ? "" : "s"} read{hh.length === 1 ? "s" : ""} it{hh.length ? <>: {hhNames(hh)}</> : null}{hh.length > 0 && <span class="muted"> ({after.length} determined on or after this date)</span>}</p>
        {t.what === "figure" && !t.first && !same && after.length > 0 && !diffs && <button class="btn small" disabled={busy} onClick={run}>{busy ? "Re-deciding…" : `Compare those ${after.length} with and without this change`}</button>}
        {diffs && <DiffList diffs={diffs} />}
      </div>
    </li>
  );
}
function TookEffect() {
  const q = route.value.q;
  const months = useMemo(() => { const s = new Set<string>(); for (const it of D.items) { for (const v of it.versions ?? []) s.add(v.from.slice(0, 7)); if (it.effective) s.add(it.effective.from.slice(0, 7)); } return [...s].filter((m) => m >= "2025-01").sort(); }, []);
  const month = q.month ?? TODAY.slice(0, 7);
  const prog = q.program ?? "";
  const all = useMemo(() => tookEffect(month), [month]);
  const list = all.filter((t) => !prog || t.item.program === prog);
  const hh = householdsReading(list.map((t) => t.item.identifier));
  const due = D.items.filter((it) => it.review_by?.slice(0, 7) === month);
  return (
    <div>
      <p class="lede">Figures that got a new dated version and rules that came into force, month by month, with the stored households that read them. Wording edits to the rulebook itself travel as proposals and are not listed here.</p>
      <div class="filters">
        <label class="inline">Month <select value={month} onChange={(e) => setQ({ month: (e.target as HTMLSelectElement).value })}>{[...new Set([...months, month])].sort().map((m) => <option value={m}>{fmtDate(m)} ({tookEffect(m).length}){m === TODAY.slice(0, 7) ? " · this month" : ""}</option>)}</select></label>
        <select value={prog} onChange={(e) => setQ({ program: (e.target as HTMLSelectElement).value })}><option value="">Any program</option>{[...PROGRAM_ORDER, "All"].map((p) => <option value={p}>{PROGRAMS[p].short}</option>)}</select>
      </div>
      <p><b>{list.length}</b> change{list.length === 1 ? "" : "s"} took effect in {fmtDate(month)}; <b>{hh.length}</b> stored household{hh.length === 1 ? "" : "s"} read{hh.length === 1 ? "s" : ""} at least one of them.</p>
      <ul class="plain tooklist">{list.map((t) => <TookRow key={t.item.id + t.date} t={t} />)}</ul>
      {!list.length && <Empty>Nothing took effect in this month.</Empty>}
      {due.length > 0 && <section class="card"><h3>New versions expected this month</h3><ul class="plain">{due.map((it) => <li><ItemRow it={it} /></li>)}</ul></section>}
    </div>
  );
}

function Proposal() {
  const eds = edits.value, sg = signs.value, ns = notes.value;
  const [diffs, setDiffs] = useState<{ diffs: Diff[]; broken: number; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const key = JSON.stringify(eds);
  const changedIds = eds.map((e) => e.item.identifier);
  const impacted = useMemo(() => [...new Set(changedIds.flatMap((i) => [i, ...downstream(i)]))], [key]);
  const outs = impacted.filter((i) => outcomeProgram.has(i)).map((i) => byIdent.get(i)!);
  const approvers = useMemo(() => {
    const m = new Map<string, string[]>();
    const add = (r: string, why: string) => { const l = m.get(r) ?? []; if (!l.includes(why)) l.push(why); m.set(r, l); };
    for (const e of eds) for (const r of requiredRoles(e.item)) add(r.role, `${e.item.name}: ${r.why}`);
    for (const o of outs) for (const r of D.meta.approval_policy.by_program?.[outcomeProgram.get(o.identifier)!] ?? []) add(r, `it changes what feeds ${PROGRAMS[outcomeProgram.get(o.identifier)!].short} outcomes`);
    for (const s of sg) add(s.role, "the signatures are given in this role");
    for (const n of ns) { const q = qById.get(n.target); const it = byId.get(n.target); for (const r of q ? questionOwners(q).slice(0, 3) : it ? requiredRoles(it).map((x) => x.role) : []) add(r, `owns ${n.target}`); if (n.kind === "opinion") add("Legal", "a legal opinion is recorded"); }
    return [...m.entries()];
  }, [key, sg.length, ns.length]);
  const run = () => {
    setBusy(true);
    setTimeout(() => {
      const eng = draftEngine();
      const hh = householdsReading(impacted);
      const d = compareEngines(E, eng, outs.map((o) => o.identifier), hh);
      let broken = 0;
      for (const cid of new Set(d.map((x) => x.caseId))) broken += checkCase(caseById(cid)!, eng).failed;
      setDiffs({ diffs: d, broken, key });
      setBusy(false);
    }, 30);
  };
  if (!eds.length && !sg.length && !ns.length) {
    return (
      <div>
        {sent.value && <p class="notice ok"><b>Sent for review.</b> {sent.value}</p>}
        <Empty>Your proposal is empty. Signatures, answers, opinions and edits you make anywhere in the rulebook collect here, and leave together as one reviewed change.</Empty>
        <p>To start one: open any item and choose <b>Propose a change</b>, tick items in <a href={href("desk/sign")}>your sign-off queue</a>, or answer a <a href={href("questions")}>question</a>.</p>
      </div>
    );
  }
  const signByRole = new Map<string, string[]>();
  for (const s of sg) signByRole.set(s.role, (signByRole.get(s.role) ?? []).concat([s.id]));
  const fresh = diffs && diffs.key === key;
  const send = () => {
    const parts = [eds.length && `${eds.length} edit${eds.length > 1 ? "s" : ""}`, sg.length && `${sg.length} signature${sg.length > 1 ? "s" : ""}`, ns.length && `${ns.length} note${ns.length > 1 ? "s" : ""}`].filter(Boolean).join(", ");
    sent.value = `Your proposal (${parts}) would now be opened as a pull request by the rulebook’s service account, with ${approvers.map((a) => a[0]).join(", ")} asked to review. You would get a link to follow it; no GitHub account is needed. In this prototype nothing was sent.`;
    edits.value = []; signs.value = []; notes.value = [];
  };
  return (
    <div class="proposal">
      <p class="lede">Nothing has changed yet. This is what you would send, who has to agree, and what it does to the stored households.</p>
      {eds.length > 0 && (
        <section class="card">
          <h2>Edits ({eds.length})</h2>
          {eds.map((e) => (
            <div class="edit">
              <p><span class={"kdot k-" + e.item.kind} /> <ItemLink it={e.item} cls="plainlink strong" /> <span class="idtag">{e.id}</span> <button class="linkish" onClick={() => dropEdit(e.id)}>remove</button></p>
              <p class="small"><b>Why:</b> {e.reason}</p>
              {describeEdit(byId.get(e.id)!, e.item)}
              {!describeEdit(byId.get(e.id)!, e.item).length && <p class="small muted">No difference from the current text.</p>}
            </div>
          ))}
        </section>
      )}
      {sg.length > 0 && (
        <section class="card">
          <h2>Signatures ({sg.length})</h2>
          {[...signByRole.entries()].map(([r, ids]) => (
            <Fold title={<>As {r}</>} count={`${ids.length} item${ids.length > 1 ? "s" : ""}`}>
              <ul class="plain"><More items={ids} n={10} noun="items" render={(id) => <li>{byId.get(id) && <ItemLink it={byId.get(id)!} />} <span class="idtag">{id}</span> <button class="linkish" onClick={() => toggleSign([id], r, false)}>remove</button></li>} /></ul>
            </Fold>
          ))}
          <p class="small muted">Each signature is recorded on the item with your role, today’s date and the version signed.</p>
        </section>
      )}
      {ns.length > 0 && (
        <section class="card">
          <h2>Answers, opinions and questions ({ns.length})</h2>
          {ns.map((n) => (
            <div class="edit">
              <p><b>{n.kind === "opinion" ? "Legal opinion" : n.kind === "answer" ? "Answer" : "New question"}</b> on <a href={href(n.target.startsWith("OQ") ? "questions/" + n.target : "item/" + n.target)}>{n.target}</a> {qById.get(n.target)?.title ?? byId.get(n.target)?.name} <button class="linkish" onClick={() => dropNote(n.id)}>remove</button></p>
              <p>{n.text}</p>
              {n.authority && <p class="small"><b>Authority:</b> {n.authority}</p>}
              {n.effect && <p class="small"><b>Effect:</b> {n.effect}</p>}
            </div>
          ))}
        </section>
      )}
      <section class="card">
        <h2>Who must approve</h2>
        <table class="signs"><tbody>{approvers.map(([r, why]) => <tr class={r === role.value ? "me" : ""}><td><b>{r}</b>{r === role.value && <span class="muted"> (you)</span>}</td><td class="small muted">{why.slice(0, 3).join("; ")}{why.length > 3 && `; and ${why.length - 3} more reasons`}</td></tr>)}</tbody></table>
        <p class="small muted">Approvers are the union of what each changed item requires, plus the owner of every program whose outcomes sit downstream.</p>
      </section>
      {eds.length > 0 && (
        <section class="card">
          <h2>Before and after, on the stored households</h2>
          <p class="small">The edits reach <b>{impacted.length}</b> items, <b>{outs.filter((o) => !isVerificationOutcome(o)).length}</b> program outcomes and <b>{householdsReading(impacted).length}</b> stored households.</p>
          {!fresh && <button class="btn primary" disabled={busy} onClick={run}>{busy ? "Re-deciding the households…" : "Compare before and after"}</button>}
          {fresh && <>
            <DiffList diffs={diffs!.diffs} eng={draftEngine()} />
            {diffs!.diffs.length > 0 && <p class="warnbox small"><b>{diffs!.broken} stored expected result{diffs!.broken === 1 ? "" : "s"}</b> in those households would no longer match. If the change is right, the proposal must update them too; reviewers will see this list.</p>}
            <AidNotice />
          </>}
        </section>
      )}
      <section class="card send">
        <h2>Send for review</h2>
        <p class="small">A pull request is opened on your behalf by the rulebook’s service account. The roles above are asked to review; automatic checks re-run every example and every stored household. You do not need a GitHub account: you follow progress here and by email.</p>
        <button class="btn primary" onClick={send}>Send for review</button>
      </section>
    </div>
  );
}

/* ---------- Search ---------- */
export function searchAll(text: string) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const has = (s: string) => words.every((w) => s.includes(w));
  const score = (name: string, rest: string) => { const n = name.toLowerCase(); return has(n) ? (n.startsWith(words[0]) ? 3 : 2) : has(n + " " + rest.toLowerCase()) ? 1 : 0; };
  const rank = <T,>(xs: T[], f: (x: T) => number) => xs.map((x) => [x, f(x)] as const).filter((p) => p[1] > 0).sort((a, b) => b[1] - a[1]).map((p) => p[0]);
  return {
    items: rank(D.items, (it) => score(it.name + " " + it.id + " " + it.identifier, it.meaning ?? "")),
    questions: rank(D.questions, (q) => score(q.id + " " + q.title, q.paras[0] ?? "")),
    sources: rank(D.sources, (s) => score(s.id + " " + s.cite + " " + s.title, s.quote)),
    cases: rank(D.cases, (c) => score(c.id + " " + c.title, "")),
  };
}
export function Search() {
  const text = route.value.q.q ?? "";
  const r = useMemo(() => (text.trim().length > 1 ? searchAll(text) : null), [text]);
  if (!r) return <div><h1>Search</h1><Empty>Type a name, a number, a citation or a few words.</Empty></div>;
  const kinds: Array<[string, string]> = [["derived", "Rules"], ["parameter", "Figures"], ["supplied", "Facts we are told"]];
  const total = r.items.length + r.questions.length + r.sources.length + r.cases.length;
  return (
    <div>
      <h1>“{text}”</h1>
      <p class="small muted">{total} results</p>
      {kinds.map(([k, l]) => { const xs = r.items.filter((i) => i.kind === k); return xs.length ? <section class="card"><h2>{l} ({xs.length})</h2><ul class="plain"><More items={xs} n={6} noun={l.toLowerCase()} render={(it) => <li><ItemRow it={it} extra={<ProgramTag id={it.program} />} value={it.kind === "parameter" && typeof (it.versions?.at(-1)?.value ?? it.value) !== "object" ? fmtVal(it.versions?.at(-1)?.value ?? it.value, it) : undefined} /></li>} /></ul></section> : null; })}
      {r.questions.length > 0 && <section class="card"><h2>Questions ({r.questions.length})</h2><ul class="plain"><More items={r.questions} n={5} noun="questions" render={(q) => <li><a class="row" href={href("questions/" + q.id)}><span class="row-main"><span class="row-name">{q.title}</span></span><span class="row-side"><Pill tone={q.state === "resolved" ? "ok" : "q"}>{q.state === "resolved" ? "settled" : q.state === "partly" ? "partly settled" : "open"}</Pill><span class="idtag">{q.id}</span></span></a></li>} /></ul></section>}
      {r.cases.length > 0 && <section class="card"><h2>Stored households ({r.cases.length})</h2><ul class="plain"><More items={r.cases} n={5} noun="households" render={(c) => <li><a class="row" href={href("households/" + c.id)}><span class="row-main"><span class="row-name">{c.title}</span></span><span class="row-side"><span class="idtag">{c.id}</span></span></a></li>} /></ul></section>}
      {r.sources.length > 0 && <section class="card"><h2>The law ({r.sources.length} excerpts)</h2><More items={r.sources} n={5} noun="excerpts" render={(s) => <SourceCard s={s} />} /></section>}
      {!total && <Empty>Nothing found. Try fewer words, or a citation such as “273.9”.</Empty>}
    </div>
  );
}
