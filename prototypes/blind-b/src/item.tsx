/* The item page: one layout for a fact, a figure or a rule. */
import { useMemo, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import {
  D, E, TODAY, byId, byIdent, srcById, PROGRAMS, KIND, SCOPE, fmtVal, fmtDate, ruleLines, firstSentence, upstream, downstream,
  outcomesReached, outcomeProgram, touchedBy, caseById, requiredRoles, openQuestions, qByItem, itemSources, versionInForce,
  role, isPendingSign, toggleSign, signBlockers, edits, saveEdit, dropEdit, addNote, PROGRAM_ORDER, type CItem, type Item,
} from "./store";
import {
  href, route, setQ, ProgramTag, Pill, Fold, More, ItemLink, StatusPill, Flags, Rich, RuleText, ValueView, keyLabel,
  SourceCard, numberNeedles, Crumbs, Empty, stripIds,
} from "./ui";

export function ItemPage({ id }: { id: string }) {
  const it = byId.get(id);
  if (!it) return <Empty>There is no item {id}.</Empty>;
  const q = route.value.q;
  const draft = edits.value.find((e) => e.id === it.id);
  const outcome = outcomeProgram.has(it.identifier);
  const kindWord = it.kind === "derived" ? (outcome ? "Rule · a program outcome" : "Rule") : KIND[it.kind].one;
  return (
    <article class="item">
      <Crumbs items={[it.kind === "parameter" ? ["Figures", href("figures")] : ["Programs", href("programs")], ...(it.program !== "All" ? [[PROGRAMS[it.program]?.short ?? it.program, href("programs/" + it.program)] as [string, string]] : []), it.name]} />
      <header class="item-head">
        <p class="eyebrow"><span class={"kdot k-" + it.kind} /> {kindWord} · <ProgramTag id={it.program} /> <span class="muted">· {SCOPE[it.scope]}</span></p>
        <h1>{it.name}</h1>
        <p class="item-meta"><StatusPill it={it} /> <Flags it={it} /> <span class="idtag" title="Item number and the name engineers use">{it.id} · {it.identifier}</span></p>
      </header>
      {draft && <p class="notice ok">Your proposal changes this item ({draft.reason}). <a href={href("changes/proposal")}>See the proposal</a> · <button class="linkish" onClick={() => dropEdit(it.id)}>discard the change</button></p>}

      <div class="item-grid">
        <div class="item-main">
          <section class="lead"><Rich text={it.meaning} /></section>
          {it.statute_override && (
            <aside class="callout fed">
              <h3>Federal law over Colorado’s rule</h3>
              <p><Rich text={it.statute_override} /></p>
              <p class="small"><a href={href("law")}>All {D.items.filter((x) => x.statute_override).length} places the rulebook follows a statute over Colorado’s text</a></p>
            </aside>
          )}
          {it.assumption && <aside class="callout assume"><h3>Working assumption</h3><p><Rich text={it.assumption} /></p></aside>}
          {openQuestions(it).length > 0 && (
            <aside class="callout q">
              <h3>Open question{openQuestions(it).length > 1 ? "s" : ""} on this item</h3>
              <ul class="plain">{openQuestions(it).map((x) => <li><a href={href("questions/" + x.id)}><b>{x.id}</b> {x.title}</a> {x.state === "partly" && <Pill tone="q">partly settled</Pill>}</li>)}</ul>
            </aside>
          )}

          {it.kind === "parameter" && <FigureSection it={it} />}
          {it.kind === "supplied" && <FactSection it={it} />}
          {it.kind === "derived" && <RuleSection it={it} steps={q.steps} />}
          {it.precision && <Fold title="Fine print: edge cases and how they are measured"><p><Rich text={it.precision} /></p></Fold>}
          {it.kind === "derived" && <ReadsSection it={it} />}
          <ChangesSection it={it} />
          <LawSection it={it} />
          {it.kind === "derived" && <ExamplesSection it={it} />}
          <SignSection it={it} />
          {it.rationale && <Fold title="Why this item exists (authoring notes)"><p class="small"><Rich text={it.rationale} /></p></Fold>}
        </div>
        <aside class="item-side">
          <ActionPanel it={it} />
        </aside>
      </div>
    </article>
  );
}

/* ---------- figure ---------- */
function sameValue(a: unknown, b: unknown) { return JSON.stringify(a) === JSON.stringify(b); }
function FigureSection({ it }: { it: CItem }) {
  const vs = (it.versions ?? []).slice().sort((a, b) => (a.from < b.from ? 1 : -1));
  const now = versionInForce(it, TODAY);
  if (!it.versions) {
    return (
      <section class="card">
        <h2>The figure <span class="muted h-note">{keyLabel(it)}</span></h2>
        <ValueView v={it.value} it={it} />
        <p class="small muted">One value with no dated versions: the rule states it without a schedule.</p>
        <Beside it={it} value={it.value} src={(it.sources ?? [])[0]} />
      </section>
    );
  }
  const oldest = vs[vs.length - 1];
  const last = vs[0];
  return (
    <section class="card">
      <h2>The figure, by date <span class="muted h-note">{keyLabel(it)}</span></h2>
      {!vs.length && <p class="warnbox"><b>No published figure yet.</b> The State sets this figure but it has not been published where it could be fetched, so it is “cannot determine” on every date. The open question above says where it will come from.</p>}
      {it.review_by && <p class={"small " + (it.review_by < TODAY ? "warn-t" : "muted")}>Next version expected by {fmtDate(it.review_by)}{it.review_by < TODAY ? " (overdue)" : ""}.</p>}
      <ol class="timeline">
        {last && last.to && (
          <li class="tl gap"><div class="tl-when">From {fmtDate(last.to)}</div><div class="tl-body"><b>No figure.</b> Nothing has been published for dates from {fmtDate(last.to)}; a household determined then gets “cannot determine”.</div></li>
        )}
        {vs.map((v, i) => {
          const prev = vs[i + 1];
          const same = prev && sameValue(prev.value, v.value);
          const cur = now === v || (now && now.from === v.from);
          return (
            <li class={"tl" + (cur ? " cur" : "") + (v.from > TODAY ? " future" : "")}>
              <div class="tl-when">
                <b>{fmtDate(v.from)}</b>{v.to ? <> to {fmtDate(v.to)}<span class="muted"> (not incl.)</span></> : " onward"}
                {cur && <Pill tone="ok">in force today</Pill>}
                {v.from > TODAY && <Pill>not yet in force</Pill>}
                {same && <Pill tone="freeze" title="Identical to the version before it">no change from the version before</Pill>}
              </div>
              <div class="tl-body">
                <ValueView v={v.value} it={it} prev={same ? undefined : prev?.value} />
                {prev && !same && typeof v.value === "number" && typeof prev.value === "number" && <p class="small muted">was {fmtVal(prev.value, it)}</p>}
                <Beside it={it} value={v.value} src={v.source ?? (it.sources ?? [])[0]} />
              </div>
            </li>
          );
        })}
        {oldest && <li class="tl gap"><div class="tl-when">Before {fmtDate(oldest.from)}</div><div class="tl-body muted">Not in the rulebook.</div></li>}
      </ol>
    </section>
  );
}
/** The excerpt a figure was taken from, beside it, with shared numbers marked. */
function Beside({ it, value, src }: { it: CItem; value: unknown; src?: string }) {
  const s = src ? srcById.get(src) : null;
  if (!s) return null;
  const needles = numberNeedles(value);
  const hits = needles.filter((n) => s.quote.includes(n)).length;
  return (
    <div class="beside">
      <p class="small beside-h">Taken from {hits > 0 ? <span class="ok-t">(the highlighted numbers appear in the text)</span> : typeof value === "number" || typeof value === "object" ? <span class="muted">(no number in this excerpt matches exactly; read it to compare)</span> : null}</p>
      <SourceCard s={s} open needles={needles} />
    </div>
  );
}

/* ---------- fact ---------- */
function FactSection({ it }: { it: CItem }) {
  const readers = E.usedBy(it.identifier).map((u) => byIdent.get(u)!).filter(Boolean);
  return (
    <section class="card">
      <h2>Where the answer comes from</h2>
      <p><Rich text={it.supplied_by} /></p>
      <p class="small muted">Answer type: {it.type}{it.options ? ": " + it.options.map((o) => o.replace(/_/g, " ")).join(" · ") : ""}</p>
      <h3>Rules that read it directly ({readers.length})</h3>
      <ul class="plain cols"><More items={readers} n={10} render={(r) => <li><ItemLink it={r} /></li>} noun="rules" /></ul>
    </section>
  );
}

/* ---------- rule ---------- */
function RuleSection({ it, steps }: { it: CItem; steps?: string }) {
  return (
    <section class="card">
      <div class="card-h">
        <h2>How it is decided</h2>
        <span class="legend"><span class="ref k-derived">a rule</span> <span class="ref k-supplied">a fact we are told</span> <span class="ref k-parameter">a figure</span></span>
      </div>
      <RuleText it={it} />
      {it.options && <p class="small muted">Possible answers: {it.options.map((o) => o.replace(/_/g, " ")).join(" · ")}</p>}
      {it.effective && <p class="small">In force from {fmtDate(it.effective.from)}{it.effective.to !== "present" ? ` to ${fmtDate(it.effective.to)}` : ""}. On an earlier date this rule says nothing.</p>}
      {it.accepts_from && <p class="small muted">Reads another program’s result on purpose: {it.accepts_from.map((a) => byIdent.get(a)).filter(Boolean).map((a, i) => <>{i > 0 && ", "}<ItemLink it={a!} /></>)}</p>}
      <div class="btnrow">
        {!steps && <button class="btn" onClick={() => setQ({ steps: "1" })}>Explain step by step</button>}
        {steps && <button class="btn ghost" onClick={() => setQ({ steps: undefined })}>Hide the steps</button>}
      </div>
      {steps && <Steps it={it} depth={steps === "all" ? 99 : +steps || 1} />}
    </section>
  );
}

function orderSteps(root: CItem, depth: number): Array<{ it: CItem; level: number }> {
  const out: Array<{ it: CItem; level: number }> = [];
  const seen = new Set<string>();
  const walk = (x: CItem, level: number) => {
    if (seen.has(x.identifier)) return;
    seen.add(x.identifier);
    if (level < depth) for (const u of E.usesOfItem(x.identifier)) { const c = byIdent.get(u); if (c && c.kind === "derived") walk(c, level + 1); }
    out.push({ it: x, level });
  };
  walk(root, 0);
  return out;
}
function Steps({ it, depth }: { it: CItem; depth: number }) {
  const steps = useMemo(() => orderSteps(it, depth), [it.id, depth]);
  const inSteps = new Set(steps.map((s) => s.it.identifier));
  const total = useMemo(() => orderSteps(it, 99).length, [it.id]);
  return (
    <div class="steps" id="steps">
      <div class="steps-bar">
        <span>Show</span>
        {[["1", "the main steps"], ["2", "two levels"], ["3", "three levels"], ["all", `every rule (${total})`]].map(([k, l]) => (
          <button class={"seg" + ((depth === 99 ? "all" : String(depth)) === k ? " on" : "")} onClick={() => setQ({ steps: k })}>{l}</button>
        ))}
        <button class="btn ghost print-btn" onClick={() => print()}>Print for a training</button>
      </div>
      <p class="small muted">{steps.length} step{steps.length > 1 ? "s" : ""}, in the order they are worked out. The last step is the result. A name marked <span class="later">further down ↓</span> is itself a rule you can open for more steps.</p>
      <ol class="steplist">
        {steps.map((s, i) => {
          const uses = E.usesOfItem(s.it.identifier).map((u) => byIdent.get(u)!).filter(Boolean);
          const facts = uses.filter((u) => u.kind === "supplied"), figs = uses.filter((u) => u.kind === "parameter");
          const deeper = uses.filter((u) => u.kind === "derived" && !inSteps.has(u.identifier));
          const src = (s.it.sources ?? []).map((x) => srcById.get(x)).filter(Boolean)[0];
          return (
            <li class={"step" + (s.level === 0 ? " final" : "")}>
              <div class="step-n">{s.level === 0 ? "Result" : `Step ${i + 1}`}</div>
              <div class="step-b">
                <h4><ItemLink it={s.it} cls="plainlink" /></h4>
                <p class="step-m">{firstSentence(stripIds(s.it.meaning ?? ""), 320)}</p>
                <RuleText it={s.it} />
                {facts.length > 0 && <p class="small"><span class="muted">Asks the household: </span>{facts.map((f, k) => <>{k > 0 && " · "}<ItemLink it={f} cls="ref k-supplied" /></>)}</p>}
                {figs.length > 0 && <p class="small"><span class="muted">Uses the figure{figs.length > 1 ? "s" : ""}: </span>{figs.map((f, k) => <>{k > 0 && " · "}<ItemLink it={f} cls="ref k-parameter" /> <span class="muted">({fmtVal(versionInForce(f, TODAY)?.value ?? f.value, f)})</span></>)}</p>}
                {deeper.length > 0 && <p class="small"><span class="later">Further down ↓ </span>{deeper.map((f, k) => <>{k > 0 && " · "}<a class="ref" href={href("item/" + f.id, { steps: "1" })}>{f.name}</a></>)}</p>}
                {src && <p class="small muted">Law: {src.cite.replace(/\.$/, "")}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Chips({ items }: { items: CItem[] }) {
  return <ul class="plain cols"><More items={items} n={12} noun="" render={(r) => <li><ItemLink it={r} cls={"ref k-" + r.kind} />{r.kind === "parameter" && <span class="muted small"> {fmtVal(versionInForce(r, TODAY)?.value ?? r.value, r)}</span>}</li>} /></ul>;
}
function ReadsSection({ it }: { it: CItem }) {
  const up = useMemo(() => upstream(it.identifier).map((u) => byIdent.get(u)!).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)), [it.id]);
  const facts = up.filter((u) => u.kind === "supplied"), figs = up.filter((u) => u.kind === "parameter"), rules = up.filter((u) => u.kind === "derived");
  return (
    <Fold id="reads" title="What it reads" count={`${facts.length} facts about the household · ${figs.length} figures · ${rules.length} other rules`}>
      <p class="small muted">Everything this rule needs, directly or through the rules it reads. A household only has to state the facts on the path its own circumstances take.</p>
      <h3>Facts the household is asked for ({facts.length})</h3>
      {facts.length ? <Chips items={facts} /> : <Empty>None.</Empty>}
      <h3>Published figures ({figs.length}), with today’s value</h3>
      {figs.length ? <Chips items={figs} /> : <Empty>None.</Empty>}
      <h3>Other rules ({rules.length})</h3>
      {rules.length ? <Chips items={rules} /> : <Empty>None.</Empty>}
    </Fold>
  );
}

function ChangesSection({ it }: { it: CItem }) {
  const down = useMemo(() => downstream(it.identifier).map((u) => byIdent.get(u)!).filter(Boolean), [it.id]);
  const outs = useMemo(() => outcomesReached([it.identifier]).filter((o) => o.identifier !== it.identifier), [it.id]);
  const hh = touchedBy.get(it.identifier) ?? [];
  const direct = E.usedBy(it.identifier).map((u) => byIdent.get(u)!).filter(Boolean);
  const progs = PROGRAM_ORDER.filter((p) => outs.some((o) => outcomeProgram.get(o.identifier) === p));
  const headline = (o: CItem) => !/verification|pending|due_date|end_date/.test(o.identifier);
  return (
    <Fold id="affects" open={it.kind !== "derived" || outcomeProgram.has(it.identifier)} title={outcomeProgram.has(it.identifier) && !down.length ? "Where it is decided" : "What a change here would affect"} count={`${outs.length} outcomes in ${progs.length} program${progs.length === 1 ? "" : "s"} · ${hh.length} of ${D.cases.length} stored households`}>
      {down.length > 0 && <p class="small muted">{down.length} rules read this, directly or through other rules{direct.length ? <> ({direct.length} directly)</> : null}.</p>}
      {progs.map((p) => {
        const os = outs.filter((o) => outcomeProgram.get(o.identifier) === p);
        const main = os.filter(headline), ver = os.length - main.length;
        return (
          <div class="affect">
            <ProgramTag id={p} />
            <span>{main.map((o, i) => <>{i > 0 && " · "}<ItemLink it={o} /></>)}{ver > 0 && <span class="muted">{main.length ? " · and " : ""}{ver} verification result{ver > 1 ? "s" : ""}</span>}</span>
          </div>
        );
      })}
      {direct.length > 0 && <><h3>Rules that read it directly ({direct.length})</h3><Chips items={direct} /></>}
      <h3>Stored households whose results read it ({hh.length})</h3>
      {hh.length ? <ul class="plain"><More items={hh} n={6} noun="households" render={(c) => <li><a href={href("households/" + c)}><b>{c}</b> {caseById(c)?.title}</a></li>} /></ul> : <Empty>No stored household reaches this item. A change here would not show in the before-and-after comparison.</Empty>}
    </Fold>
  );
}

function LawSection({ it }: { it: CItem }) {
  const ss = itemSources(it).map((s) => srcById.get(s)!).filter(Boolean);
  const needles = it.kind === "parameter" ? numberNeedles(versionInForce(it, TODAY)?.value ?? it.value) : undefined;
  return (
    <Fold id="law" open={it.kind !== "parameter"} title="The law, word for word" count={`${ss.length} excerpt${ss.length === 1 ? "" : "s"}`}>
      {ss.length ? <More items={ss} n={5} noun="excerpts" render={(s, i) => <SourceCard s={s} open={i === 0 && it.kind !== "parameter"} needles={needles} />} /> : <Empty>No citation.</Empty>}
    </Fold>
  );
}

function ExamplesSection({ it }: { it: CItem }) {
  const tests = it.tests ?? [];
  const [run, setRun] = useState(false);
  const results = useMemo(() => (run ? tests.map((t) => E.runTest(it, t)) : []), [run, it.id]);
  const failed = results.filter((r) => !r.ok).length;
  const nameOf = (k: string) => byIdent.get(k)?.name ?? k;
  return (
    <Fold id="examples" title="Worked examples" count={`${tests.length} example${tests.length === 1 ? "" : "s"} written with the rule`}>
      <p class="small muted">Each example states a few facts and the answer the rule must give. They are checked every time the rulebook changes.</p>
      {!run && tests.length > 0 && <button class="btn ghost" onClick={() => setRun(true)}>Check them now</button>}
      {run && <p class={failed ? "warn-t" : "ok-t"}>{failed ? `${failed} of ${tests.length} do not give the stated answer.` : `All ${tests.length} give the stated answer.`}</p>}
      <ul class="plain examples">
        <More items={tests} n={6} noun="examples" render={(t, i) => (
          <li class="example">
            {(t as any).title && <p class="ex-t">{(t as any).title}</p>}
            <p class="small"><span class="muted">On {fmtDate(t.as_of ?? t.month ?? D.meta.default_as_of)}, given </span>
              {Object.entries(t.given ?? {}).map(([k, v], n) => <>{n > 0 && "; "}{nameOf(k)}: <b>{fmtVal(v, byIdent.get(k))}</b></>)}
              {!Object.keys(t.given ?? {}).length && "nothing stated"}{(t.persons || t.others) && <span class="muted"> (and other people in the household)</span>}</p>
            <p class="small">→ <b>{fmtVal(t.expect, it)}</b> {run && (results[i]?.ok ? <Pill tone="ok">matches</Pill> : <Pill tone="warn">rule gives {fmtVal(results[i]?.got, it)}</Pill>)}</p>
          </li>
        )} />
      </ul>
    </Fold>
  );
}

function SignSection({ it }: { it: CItem }) {
  const need = requiredRoles(it);
  const blockers = signBlockers(it);
  const me = role.value;
  const mine = need.find((r) => r.role === me);
  const pending = isPendingSign(it.id, me);
  return (
    <section class="card" id="signoff">
      <h2>Sign-off</h2>
      <p class="small muted">This item is a Draft until each of these roles has signed it. A signature is recorded through a reviewed change, like any other edit.</p>
      <table class="signs">
        <tbody>
          {need.map((r) => {
            const rec = it.approval?.find((a) => a.role === r.role);
            return (
              <tr class={r.role === me ? "me" : ""}>
                <td><b>{r.role}</b>{r.role === me && <span class="muted"> (you)</span>}<br /><span class="small muted">because {r.why}</span></td>
                <td>{rec ? <Pill tone="ok">signed {fmtDate(rec.date)}{rec.by ? ` by ${rec.by}` : ""}</Pill> : isPendingSign(it.id, r.role) ? <Pill tone="ok">in your proposal</Pill> : <Pill tone="draft">not signed</Pill>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {blockers.map((b) => <p class="warnbox"><b>Cannot be signed yet.</b> {b} <a href={href("law/unverified")}>See unverified figures</a></p>)}
      {mine && !blockers.length && (
        <div class="btnrow">
          {!pending ? <button class="btn primary" onClick={() => toggleSign([it.id], me, true)}>Sign as {me}</button>
            : <><span class="ok-t">Your signature is in your proposal.</span> <button class="linkish" onClick={() => toggleSign([it.id], me, false)}>Take it back</button> · <a href={href("changes/proposal")}>Review and send</a></>}
        </div>
      )}
      {!mine && <p class="small muted">Your current role ({me}) is not one of the signers.</p>}
    </section>
  );
}

/* ---------- actions: propose a change, ask a question ---------- */
function ActionPanel({ it }: { it: CItem }) {
  const [mode, setMode] = useState<"" | "edit" | "ask">("");
  const hh = touchedBy.get(it.identifier) ?? [];
  const outs = outcomesReached([it.identifier]);
  return (
    <div class="side-card">
      <h3>At a glance</h3>
      <dl class="facts">
        <dt>Kind</dt><dd>{KIND[it.kind].one}</dd>
        <dt>Program</dt><dd>{PROGRAMS[it.program]?.label ?? it.program}</dd>
        <dt>Answer</dt><dd>{it.type}; {SCOPE[it.scope]}</dd>
        {it.tags && <><dt>Topics</dt><dd>{it.tags.map((t) => t.replace(/_/g, " ")).join(", ")}</dd></>}
        <dt>Reaches</dt><dd>{outs.length} outcome{outs.length === 1 ? "" : "s"}; read by {hh.length} stored household{hh.length === 1 ? "" : "s"}</dd>
        <dt>Questions</dt><dd>{(qByItem.get(it.id) ?? []).length ? <>{openQuestions(it).length} open, {(qByItem.get(it.id) ?? []).length - openQuestions(it).length} settled</> : "none"}</dd>
      </dl>
      <div class="btncol">
        <button class="btn primary" onClick={() => setMode(mode === "edit" ? "" : "edit")}>Propose a change</button>
        <button class="btn" onClick={() => setMode(mode === "ask" ? "" : "ask")}>Ask a question about it</button>
        <a class="btn ghost" href="#signoff" onClick={(e) => { e.preventDefault(); document.getElementById("signoff")?.scrollIntoView({ behavior: "smooth" }); }}>Sign-off</a>
      </div>
      {mode === "edit" && <Editor it={it} done={() => setMode("")} />}
      {mode === "ask" && <Ask it={it} done={() => setMode("")} />}
    </div>
  );
}
function Ask({ it, done }: { it: CItem; done: () => void }) {
  const [text, setText] = useState("");
  return (
    <form class="form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { addNote({ kind: "question", target: it.id, role: role.value, text }); done(); } }}>
      <label>Your question<textarea rows={4} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} placeholder="What does the text leave unsettled, and what would settle it?" /></label>
      <p class="small muted">It is added to your proposal as a new open question on {it.id}, owned by {requiredRoles(it).map((r) => r.role).join(", ")}.</p>
      <button class="btn primary" type="submit">Add to proposal</button>
    </form>
  );
}

function Editor({ it, done }: { it: CItem; done: () => void }) {
  const existing = edits.value.find((e) => e.id === it.id)?.item ?? it;
  const [reason, setReason] = useState(edits.value.find((e) => e.id === it.id)?.reason ?? "");
  const [meaning, setMeaning] = useState(existing.meaning ?? "");
  const [rule, setRule] = useState(() => ruleLines(existing).join("\n"));
  const latest = (existing.versions ?? []).slice().sort((a, b) => (a.from < b.from ? 1 : -1))[0];
  const base = latest ? latest.value : existing.value;
  const isTable = base !== null && typeof base === "object";
  const [from, setFrom] = useState("");
  const [val, setVal] = useState<string>(isTable ? "" : base === undefined || base === null ? "" : String(base));
  const [rows, setRows] = useState<Record<string, string>>(() => (isTable ? Object.fromEntries(Object.entries(base as object).map(([k, v]) => [k, String(v)])) : {}));
  const [src, setSrc] = useState("");
  const [err, setErr] = useState("");
  const coerce = (s: string): unknown => (s === "true" || s === "yes" ? true : s === "false" || s === "no" ? false : s.trim() !== "" && !isNaN(Number(s)) ? Number(s) : s);
  const save = (e: Event) => {
    e.preventDefault();
    if (!reason.trim()) { setErr("Say why: reviewers read this first."); return; }
    const next: CItem = { ...it, meaning };
    if (it.kind === "derived" && rule.trim() !== ruleLines(it).join("\n").trim()) {
      try { next.derived = E.parseDerivation(rule, it.options ?? []); }
      catch (ex) { setErr("The rule text could not be read: " + (ex as Error).message + ". Keep to the phrases the rule already uses, and exact item names."); return; }
    }
    if (it.kind === "parameter") {
      const value = isTable ? Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, coerce(v)])) : coerce(val);
      if (it.versions) {
        if (from) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) { setErr("Give the first day the new figure applies."); return; }
          const vs = it.versions.map((v) => ({ ...v }));
          const prior = vs.filter((v) => v.from < from).sort((a, b) => (a.from < b.from ? 1 : -1))[0];
          if (prior && (!prior.to || prior.to > from)) prior.to = from;
          vs.push({ from, value, ...(src ? { source: src } : {}) } as any);
          next.versions = vs.filter((v) => v.from !== from || v.value === value);
        }
      } else next.value = value;
    }
    saveEdit({ id: it.id, reason, item: next });
    done();
    location.hash = href("changes/proposal");
  };
  return (
    <form class="form" onSubmit={save}>
      <h3>Propose a change</h3>
      {it.kind === "parameter" && (
        <fieldset>
          <legend>{it.versions ? "A new dated figure" : "The figure"}</legend>
          {it.versions && <label>First day it applies<input type="date" value={from} onInput={(e) => setFrom((e.target as HTMLInputElement).value)} /></label>}
          {isTable ? (
            <div class="rowsedit">{Object.keys(rows).map((k) => <label class="inline"><span>{k.replace(/_/g, " ")}</span><input value={rows[k]} onInput={(e) => setRows({ ...rows, [k]: (e.target as HTMLInputElement).value })} /></label>)}</div>
          ) : <label>Value<input value={val} onInput={(e) => setVal((e.target as HTMLInputElement).value)} /></label>}
          <label>Where it is published (citation or link)<input value={src} onInput={(e) => setSrc((e.target as HTMLInputElement).value)} placeholder="e.g. 9 CCR 2503-6 3.606.1.F, eff. July 1, 2028" /></label>
          {it.versions && <p class="small muted">Leave the date empty to change only the wording below. Earlier versions are never overwritten.</p>}
        </fieldset>
      )}
      {it.kind === "derived" && (
        <label>The rule, in the rulebook’s own phrases
          <textarea class="mono" rows={Math.min(14, Math.max(4, rule.split("\n").length + 1))} value={rule} onInput={(e) => setRule((e.target as HTMLTextAreaElement).value)} />
        </label>
      )}
      <label>What it means<textarea rows={5} value={meaning} onInput={(e) => setMeaning((e.target as HTMLTextAreaElement).value)} /></label>
      <label>Why this change (required)<textarea rows={3} value={reason} onInput={(e) => setReason((e.target as HTMLTextAreaElement).value)} placeholder="The source of the change: the rule, memo or statute, and its date." /></label>
      {err && <p class="warnbox">{err}</p>}
      <p class="small muted">Nothing is changed yet. The next screen shows who must approve it and what it does to the stored households.</p>
      <div class="btnrow"><button class="btn primary" type="submit">Review the proposal</button><button class="btn ghost" type="button" onClick={done}>Cancel</button></div>
    </form>
  );
}

export function describeEdit(before: Item, after: Item): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  if ((before.meaning ?? "") !== (after.meaning ?? "")) out.push(<div class="diff"><p class="small muted">Meaning</p><p class="del">{before.meaning}</p><p class="ins">{after.meaning}</p></div>);
  if (JSON.stringify(before.derived) !== JSON.stringify(after.derived)) {
    out.push(<div class="diff"><p class="small muted">Rule</p><pre class="del">{ruleLines(before).join("\n")}</pre><pre class="ins">{ruleLines(after).join("\n")}</pre></div>);
  }
  if (JSON.stringify(before.value) !== JSON.stringify(after.value)) out.push(<div class="diff"><p class="small muted">Figure</p><p><span class="del">{fmtVal(before.value, before)}</span> → <span class="ins">{fmtVal(after.value, after)}</span></p></div>);
  const bv = new Map((before.versions ?? []).map((v) => [v.from, v]));
  for (const v of after.versions ?? []) {
    const old = bv.get(v.from);
    if (!old) {
      const prev = (before.versions ?? []).filter((p) => p.from < v.from).sort((a, b) => (a.from < b.from ? 1 : -1))[0];
      out.push(<div class="diff"><p class="small muted">New figure from {fmtDate(v.from)}{v.source ? ` (${v.source})` : ""}</p><div class="ins"><ValueView v={v.value} it={after} prev={prev?.value} /></div>{prev && <p class="small muted">Until then: {typeof prev.value === "object" ? "the current table (changed rows are outlined above)" : fmtVal(prev.value, before)}</p>}</div>);
    }
  }
  return out;
}
