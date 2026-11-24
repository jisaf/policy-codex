/* Screening: the question order a front end could use, from the
 * screening-order review (docs/reviews/screening-order.md and .json).
 * Four tabs: the cross-program interview order with its branch points and
 * skip sets; each program's disqualifiers with the paragraph that makes them;
 * a stored household interviewed in that order, decided by the engine at
 * every question with the unrevealed facts withheld; and the guardrails. */
import { useEffect, useMemo, useState } from "preact/hooks";
import { D, byIdent, srcById, docById, PROGRAMS, caseById, personLabel, fmtVal, fmtDate, monthOf, shortName, type HouseholdCase } from "./store";
import { href, route, setQ, ItemLink, Rich, Pill, Fold, Empty } from "./ui";
import {
  screening, simulate, withhold, settledAt, flips, tryEveryAnswer, familiesReading, classify, FAMILY_PROGRAM, REL, REFERRAL,
  type ScreeningData, type Sim, type Cls, type OrderEntry, type Paragraph, type Tried, type Missing,
} from "./screening-sim";

const TABS: Array<[string, string]> = [["", "Interview order"], ["disqualifiers", "Disqualifiers by program"], ["try", "Try it on a household"], ["guardrails", "Guardrails"]];
const pct = (x: number) => Math.round(x * 100) + "%";
const COST: Record<string, string> = {
  "0.5": "application data or an agency record", "1": "a yes/no or plain choice", "2": "a date or the relationship grid",
  "3": "an amount to look up, or a status in the statute's words", "4": "dated income records", "5": "resource records",
};
const SETTLES: Record<string, string> = { deny: "can settle not eligible", approve: "can settle eligible early", both: "can settle either way" };

/** Inline Markdown from the review (`code`, **bold**), identifiers as links. */
function Md({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return <>{parts.map((p) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <b><Rich text={p.slice(2, -2)} /></b>;
    if (p.startsWith("`") && p.endsWith("`") && p.length > 2) {
      const id = p.slice(1, -1);
      const it = byIdent.get(id);
      return it ? <ItemLink it={it} /> : <code>{id}</code>;
    }
    return <Rich text={p} />;
  })}</>;
}
function FamilyTag({ f }: { f: string }) {
  return <span class="ptag" style={`--h:${PROGRAMS[FAMILY_PROGRAM[f]]?.hue ?? 230}`}>{f}</span>;
}
function FactName({ k }: { k: string }) {
  if (k === REL) return <span class="scr-rel" title="Who lives in the home and how each person is related">Relationships</span>;
  const it = byIdent.get(k);
  return it ? <ItemLink it={it} /> : <code>{k}</code>;
}

export function ScreeningPage({ sub }: { sub?: string }) {
  const s = screening();
  const tab = TABS.some(([k]) => k === (sub ?? "")) ? sub ?? "" : "";
  return (
    <div class="scr">
      <h1>Screening</h1>
      <p class="lede">The order in which a front end could ask its questions, so that the answers that rule a person out of a program come first and the questions that can no longer change an answer are skipped. From the screening-order review{ s ? <> of {fmtDate(s.date)} (volume at {s.head})</> : null}, for policy and product staff to see and discuss.</p>
      {!s ? <Empty>The screening-order review is not in this build. Run the data step in README.md.</Empty> : (
        <>
          <Guard s={s} />
          <nav class="tabs" aria-label="Screening">
            {TABS.map(([k, l]) => <a class={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined} href={href("screening" + (k ? "/" + k : ""))}>{l}</a>)}
          </nav>
          {tab === "" && <Order s={s} />}
          {tab === "disqualifiers" && <Disqualifiers s={s} />}
          {tab === "try" && <TryIt s={s} />}
          {tab === "guardrails" && <Guardrails s={s} />}
        </>
      )}
    </div>
  );
}

/* ---------- guardrails ---------- */
const isRightToApply = (r: string) => /^(Right to apply|Accept an application|Encourage)/.test(r);
function Guard({ s }: { s: ScreeningData }) {
  const rta = s.guardrails.filter((g) => isRightToApply(g.rule));
  return (
    <section class="scr-guard" aria-label="Guardrails">
      <p><b>A screener may</b> reorder questions, skip the ones that can no longer change an answer, and say <q>likely not eligible; you may still apply</q>. <b>It may never</b> stop, delay or discourage an application, and its result is never a denial.</p>
      <details>
        <summary>The right to apply, word for word ({rta.length} paragraphs)</summary>
        {rta.map((g) => <GuardQuote g={g} />)}
        <p class="small"><a href={href("screening/guardrails")}>Every guardrail the review sets</a></p>
      </details>
    </section>
  );
}
function LawLink({ src, doc }: { src: string | null; doc: string | null }) {
  const sc = src ? srcById.get(src) : null;
  const d = doc ? docById.get(doc) : null;
  if (!sc && !d) return null;
  return (
    <span class="scr-law">
      {sc && <a href={href("law/source/" + sc.id)} title={sc.cite}>Excerpt {sc.id}</a>}
      {sc && d && " · "}
      {d && <a href={href("law/doc/" + d.id, sc ? { at: sc.id } : undefined)} title={d.title}>{sc ? "in the full document" : `Read it in ${d.id}`}</a>}
    </span>
  );
}
function GuardQuote({ g }: { g: ScreeningData["guardrails"][number] }) {
  return (
    <div class="scr-gq">
      <p class="small"><b>{g.rule}</b> · <Rich text={g.source} /> <LawLink src={g.src} doc={g.doc} /></p>
      <blockquote class="quote"><p>{g.quote}</p></blockquote>
    </div>
  );
}
function Guardrails({ s }: { s: ScreeningData }) {
  const groups: Array<[string, (r: string) => boolean]> = [
    ["The right to apply", isRightToApply],
    ["One program does not decide another", (r) => /^(One program|Other programs|All bases)/.test(r)],
    ["Months are decided one at a time", (r) => /^(Retroactive|SNAP benefits)/.test(r)],
    ["Missing information", (r) => /^Missing/.test(r)],
  ];
  return (
    <div>
      <div class="scr-two">
        <section class="card"><h2>What a front end may do</h2><ul>{s.may.map((m) => <li><Md text={m} /></li>)}</ul></section>
        <section class="card"><h2>What it may not do</h2><ul>{s.mayNot.map((m) => <li><Md text={m} /></li>)}</ul></section>
      </div>
      {groups.map(([t, f]) => {
        const gs = s.guardrails.filter((g) => f(g.rule));
        return gs.length ? <section class="card"><h2>{t}</h2>{gs.map((g) => <GuardQuote g={g} />)}</section> : null;
      })}
    </div>
  );
}

/* ---------- part 1: the interview order ---------- */
function entriesFor(s: ScreeningData, k: string): Array<[string, OrderEntry]> {
  const out: Array<[string, OrderEntry]> = [];
  for (const [f, p] of Object.entries(s.programs)) for (const e of p.order) if (e.fact_or_item === k) out.push([f, e]);
  return out;
}
function FactFacts({ s, k }: { s: ScreeningData; k: string }) {
  const es = entriesFor(s, k);
  const fams = familiesReading(k);
  const settles = [...new Set(es.map(([, e]) => e.settles))];
  const cost = es[0]?.[1].cost;
  const conds = [...new Set(es.flatMap(([, e]) => e.conditions))];
  return (
    <li class="scr-fact">
      <div class="scr-fact-h">
        <FactName k={k} />
        {settles.map((x) => <Pill tone={x === "deny" ? "fed" : x === "approve" ? "ok" : "q"} title={SETTLES[x]}>{x === "deny" ? "settles not eligible" : x === "approve" ? "settles eligible" : "settles either way"}</Pill>)}
        {cost !== undefined && <span class="scr-cost" title={COST[String(cost)] ?? ""}>cost {cost}</span>}
      </div>
      <div class="scr-fact-b small">
        <span class="muted">Serves </span>{fams.length ? fams.map((f) => <FamilyTag f={f} />) : <span class="muted">no program outcome</span>}
      </div>
      {es.length > 0 && (
        <div class="scr-fact-b small">
          <span class="muted">In the shortest proof of a stored denial, today → with a three-valued rule: </span>
          {es.map(([f, e]) => <span class="scr-share"><b>{f}</b> {pct(e.denial_share.current_engine)} → {pct(e.denial_share.three_valued_case)}</span>)}
        </div>
      )}
      {conds.length > 0 && <details class="scr-cond small"><summary>What it settles ({conds.length})</summary><ul>{conds.map((c) => <li><Md text={c} /></li>)}</ul>{es.map(([, e]) => e.note).filter(Boolean).map((n) => <p class="muted"><Md text={n!} /></p>)}</details>}
      {!es.length && <div class="scr-fact-b small muted">Not scored in the review's per-program orders.</div>}
    </li>
  );
}
function Order({ s }: { s: ScreeningData }) {
  const m = s.measured.per_denial_cross_program_order;
  const fam = s.measured.by_family_and_class as Record<string, any>;
  const sets = s.measured.minimal_sets as Record<string, any>;
  const fams = Object.keys(s.programs);
  return (
    <div>
      <div class="scr-stats">
        <div><b>{m.global_base.median_questions}</b><span>questions settle the median stored denial in this order</span></div>
        <div><b>{m.median_read_questions}</b><span>questions the full evaluation of that outcome reads</span></div>
        <div><b>{pct(m.global_base.le5 / m.denials)}</b><span>of the {m.denials} stored denials settle within 5 questions</span></div>
      </div>
      <p class="small muted">Measured by the review over the stored households, which are test fixtures built to exercise edge cases, not a caseload. Its numbers assume the residency defect G0 fixed; this page runs the engine as it is. A question covers every person in the household; detail is asked only of the persons it concerns.</p>
      <ol class="plain scr-steps">
        {s.cross_program_order.map((st) => (
          <li class="card scr-step">
            <p class="eyebrow">Step {st.step}{st.step === 0 ? " · no question" : ""}</p>
            <h2>{st.question}</h2>
            <ul class="plain">{st.facts.map((k) => <FactFacts s={s} k={k} />)}</ul>
            {st.branches.length > 0 && (
              <div class="scr-branch">
                <h3>Branch points</h3>
                <ul>{st.branches.map((b) => <li><Md text={b} /></li>)}</ul>
              </div>
            )}
          </li>
        ))}
      </ol>
      <section class="card">
        <h2>Skip sets: when the answer is…</h2>
        <div class="tablewrap">
          <table class="scr-table">
            <thead><tr><th>When the answer is</th><th>These become irrelevant</th></tr></thead>
            <tbody>{s.skip_sets.map((x) => <tr><td data-l="When"><Md text={x.when} /></td><td data-l="Skip">{x.skip.map((y) => <div><Md text={y} /></div>)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <Fold title="Measured, per program" count="stored denials">
        <div class="tablewrap">
          <table class="scr-table num">
            <thead><tr><th>Program</th><th>Denials</th><th>Read by the full evaluation</th><th>Asked in the case file's order</th><th>Asked in this order</th><th>… with a three-valued rule</th><th>Stated by the household</th></tr></thead>
            <tbody>{fams.concat(["Medicaid limited"]).filter((f) => fam[f + "|deny"]).map((f) => {
              const r = fam[f + "|deny"], ms = sets[f + "|deny"];
              return <tr><td data-l="Program">{f}</td><td data-l="Denials">{r.n}</td><td data-l="Read">{r.read_questions}</td><td data-l="File order">{r.file_base.q_med}</td><td data-l="This order">{r.global_base.q_med}</td><td data-l="Three-valued">{r.global_k.q_med}</td><td data-l="Stated">{ms?.stated_median ?? "—"}</td></tr>;
            })}</tbody>
          </table>
        </div>
        <p class="small muted">Medians, in distinct questions; "stated" counts facts per person. {s.measured.note}</p>
      </Fold>
      <Gaps s={s} />
    </div>
  );
}
function Gaps({ s, open }: { s: ScreeningData; open?: boolean }) {
  return (
    <Fold title="What the engine cannot do yet (G0 to G6)" count="the review's gaps" open={open} id="gaps">
      <p class="small">These are the review's findings. The engine is used here as it is; none of them is fixed in this build.</p>
      {s.gaps.map((g) => (
        <div class="scr-gap">
          <p><b>{g.id}</b> {g.title} <span class="muted small">· {g.kind} · <Rich text={g.item} /></span></p>
          <p class="small"><span class="muted">Evidence: </span><Rich text={g.evidence} /></p>
          <p class="small"><span class="muted">Proposed fix: </span><Rich text={g.fix} /></p>
        </div>
      ))}
    </Fold>
  );
}

/* ---------- part 2: disqualifiers ---------- */
function share(denials: string, total: number | undefined): string | null {
  let m = /^(\d+)\s*\((\d+)\)/.exec(denials);
  if (m && total) return `${pct(+m[1] / total)} of ${total}`;
  m = /^(\d+) of (\d+)/.exec(denials);
  if (m) return pct(+m[1] / +m[2]);
  return null;
}
function ParagraphCell({ p }: { p: Paragraph }) {
  return (
    <>
      <span class="scr-cite"><Rich text={p.cite} /></span>
      {p.quote && <blockquote class="quote scr-q"><p>{p.quote}</p></blockquote>}
      {p.rest && <span class="small"><Rich text={p.rest} /></span>}
      <LawLink src={p.src} doc={p.doc} />
    </>
  );
}
function Disqualifiers({ s }: { s: ScreeningData }) {
  const fam = s.measured.by_family_and_class as Record<string, any>;
  const only = route.value.q.program ?? "";
  const tables = s.disqualifiers.filter((t) => !only || t.family === only);
  return (
    <div>
      <p>For each program: the conditions that rule a person out, the facts that settle each, the paragraph that makes it a condition, how many stored denials it settles, and how many facts the shortest proof needs, with the engine as it is and with a three-valued rule (G1).</p>
      <div class="chips">
        <a class={"chip" + (!only ? " on" : "")} href={href("screening/disqualifiers")}>All</a>
        {s.disqualifiers.map((t) => t.family && <a class={"chip" + (only === t.family ? " on" : "")} href={href("screening/disqualifiers", { program: t.family })}>{t.family}</a>)}
      </div>
      {tables.map((t) => {
        const total = t.family ? fam[t.family + "|deny"]?.n : undefined;
        const order = t.family ? s.programs[t.family]?.order ?? [] : [];
        return (
          <section class="card scr-disq">
            <p class="eyebrow">{t.family && <FamilyTag f={t.family} />}{total !== undefined && <span class="muted">{total} stored denials</span>}</p>
            <h2>{t.title}</h2>
            <p class="small"><span class="muted">Outcomes: </span>{t.outcomes.map((o, i) => { const it = byIdent.get(o); return <>{i > 0 && " · "}{it ? <ItemLink it={it} /> : o}</>; })}</p>
            {order.length > 0 && (
              <p class="small scr-porder"><span class="muted">Ask first, in order: </span>{order.map((e, i) => <>{i > 0 && <span class="muted"> → </span>}<FactName k={e.fact_or_item} /></>)}</p>
            )}
            <div class="tablewrap">
              <table class="scr-table disq">
                <thead><tr><th>Condition</th><th>Facts that settle it</th><th>Paragraph</th><th>Stored denials it settles</th><th>Median facts to settle, today / three-valued</th><th>Cost</th></tr></thead>
                <tbody>{t.rows.map((r) => {
                  const sh = share(r.denials, total);
                  return (
                    <tr>
                      <td data-l="Condition"><b><Md text={r.condition} /></b></td>
                      <td data-l="Facts"><Md text={r.facts} /></td>
                      <td data-l="Paragraph"><ParagraphCell p={r.paragraph} /></td>
                      <td data-l="Denials"><Md text={r.denials} />{sh && <div class="small muted">{sh}</div>}</td>
                      <td data-l="Facts to settle">{r.settle ? <Md text={r.settle} /> : <span class="muted">—</span>}</td>
                      <td data-l="Cost" title={COST[r.cost] ?? ""}>{r.cost}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            {t.notes.map((n) => <p class="small"><Md text={n} /></p>)}
            {t.family && s.programs[t.family]?.not_a_disqualifier && <p class="small notice"><b>Not a disqualifier.</b> <Md text={s.programs[t.family].not_a_disqualifier!} /></p>}
            {t.family && s.programs[t.family]?.skip_always?.map((x) => <p class="small notice"><b>Never asked for this program.</b> <Md text={x} /></p>)}
          </section>
        );
      })}
      <p class="small muted">"Denials (hh)": stored denials with that reason, households in brackets. A share is of the program's stored denials. Cost: {Object.entries(COST).map(([k, v]) => `${k} ${v}`).join("; ")}.</p>
    </div>
  );
}

/* ---------- part 3: try it on a household ---------- */
const PRIMARY: Record<string, string> = {
  SNAP: "snap_eligibility_status", "Medicaid MAGI": "ma_magi_eligibility_status", "CHP+": "chp_eligibility_status",
  "Medicaid non-MAGI": "ma_ssi_related_category", "Colorado Works": "cw_eligibility_status", "Adult Financial": "af_category",
  CCCAP: "cccap_eligibility_status", LEAP: "leap_is_eligible", "SUN Bucks": "sebt_eligibility_status",
};
const SUGGEST: Array<[string, string]> = [["CO-158", "denied SNAP: a striking member"], ["CO-720", "eligible for Medicaid"], ["CO-445", "denied SNAP: over the gross income limit"]];
const CLS_LABEL: Record<Cls, string> = { eligible: "Eligible", not: "Likely not eligible", neither: "Neither", unknown: "Cannot determine yet" };

function answerOf(c: HouseholdCase, k: string, pid: string): string {
  if (k === REL) {
    const own = c.persons[pid]?.relationships?.length ?? 0;
    const edges = (c.relationships ?? []).filter((e) => e[1] === pid || e[2] === pid).length;
    return own + edges ? `${own + edges} relationship${own + edges === 1 ? "" : "s"}` : "";
  }
  const it = byIdent.get(k);
  const p = c.persons[pid];
  let v: unknown = (p?.months?.[monthOf(c)] as Record<string, unknown> | undefined)?.[k];
  if (v === undefined) v = (p?.facts as Record<string, unknown> | undefined)?.[k];
  if (v === undefined) v = (p?.month_defaults as Record<string, unknown> | undefined)?.[k];
  if (v === undefined) {
    const ms = Object.entries(p?.months ?? {}).filter(([, r]) => (r as Record<string, unknown>)[k] !== undefined);
    if (ms.length) return `stated for ${ms.length} month${ms.length === 1 ? "" : "s"}`;
    return "";
  }
  if (Array.isArray(v) && v.length && typeof v[0] === "object") return `${v.length} ${it?.record_noun ?? "record"}${v.length === 1 ? "" : "s"}`;
  return fmtVal(v, it, (x) => personLabel(c, x), true);
}
function caseAnswer(c: HouseholdCase, k: string): string {
  const v = (c.case_facts as Record<string, unknown> | undefined)?.[k] ?? (c.month_facts?.[monthOf(c)] as Record<string, unknown> | undefined)?.[k];
  if (k === REL) return `${c.relationships?.length ?? 0} relationships in the household`;
  return v === undefined ? "stated for some months" : fmtVal(v, byIdent.get(k), undefined, true);
}
function Answers({ c, k, who }: { c: HouseholdCase; k: string; who: string[] }) {
  return (
    <ul class="plain scr-ans">
      {who.map((w) => {
        const a = w === "case" ? caseAnswer(c, k) : answerOf(c, k, w);
        return a ? <li><span class="muted">{w === "case" ? "Household" : personLabel(c, w)}:</span> {a}</li> : null;
      })}
    </ul>
  );
}

function TryIt({ s }: { s: ScreeningData }) {
  const q = route.value.q;
  const id = q.hh && caseById(q.hh) ? q.hh : SUGGEST[0][0];
  const c = caseById(id);
  const branch = q.branch !== "0";
  const [sim, setSim] = useState<Sim | null>(null);
  const [prog, setProg] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    let live = true;
    setSim(null);
    if (c) simulate(c, branch, (a, b) => live && setProg([a, b])).then((x) => { if (live) setSim(x); });
    return () => { live = false; };
  }, [id, branch]);
  const options = useMemo(() => D.cases.map((x) => [x.id, x.title.replace(/^"|"$/g, "")] as const), []);
  return (
    <div class="scr-try">
      <p>Pick a stored household. It is interviewed in the order above, one question at a time. After each question the engine in this page decides every program for every person from only the answers given so far: every fact not yet revealed is removed from the case first.</p>
      <div class="filters">
        <label class="scr-pick">Household
          <select value={id} onChange={(e) => setQ({ hh: (e.target as HTMLSelectElement).value, at: undefined, cell: undefined })}>
            {options.map(([k, t]) => <option value={k}>{k} · {t.length > 70 ? t.slice(0, 69) + "…" : t}</option>)}
          </select>
        </label>
        <label class="inline"><input type="checkbox" checked={branch} onChange={(e) => setQ({ branch: (e.target as HTMLInputElement).checked ? undefined : "0", at: undefined })} /> Also skip on the review's branch points</label>
      </div>
      <p class="small">Try: {SUGGEST.map(([k, l], i) => <>{i > 0 && " · "}<a href={href("screening/try", { hh: k, branch: q.branch })}>{k}, {l}</a></>)}</p>
      {c && <p class="small muted">{c.id}: {c.title.replace(/^"|"$/g, "")} · decided for {fmtDate(monthOf(c))} · <a href={href("households/" + c.id)}>the household's own page</a></p>}
      {!c ? <Empty>No stored household {q.hh}.</Empty> : !sim || sim.id !== c.id || sim.branch !== branch
        ? <p class="notice" role="status">Interviewing {c.id}: question {prog[0]} of {prog[1] || "…"}. The engine decides every program after each answer.</p>
        : <Interview s={s} c={c} sim={sim} />}
    </div>
  );
}

function Interview({ s, c, sim }: { s: ScreeningData; c: HouseholdCase; sim: Sim }) {
  const q = route.value.q;
  const last = sim.snaps.length - 1;
  const at = Math.max(0, Math.min(last, q.at === undefined ? 0 : Number(q.at) || 0));
  const snap = sim.snaps[at];
  const pids = Object.keys(c.persons);
  const who = (p: string) => personLabel(c, p);
  const go = (k: number) => setQ({ at: String(Math.max(0, Math.min(last, k))) });
  const onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("select, input")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1); }
    else if (e.key === "Home") { e.preventDefault(); go(0); }
    else if (e.key === "End") { e.preventDefault(); go(last); }
  };
  const asked = snap.asked.map((i) => sim.questions[i]);
  const cur = at > 0 ? sim.questions[snap.asked[at - 1]] : null;
  const answers = (k: string) => sim.questions.find((x) => x.key === k)?.who.length ?? 0;
  const neededQ = last;
  const askedAnswers = sim.snaps[last].asked.reduce((n, i) => n + sim.questions[i].who.length, 0);
  const stepName = (n: number) => n === s.cross_program_order.length ? "The rest of the review's per-program screening orders"
    : n > s.cross_program_order.length ? "Facts neither order names that the full evaluation reads, in the case's order"
    : s.cross_program_order.find((x) => x.step === n)?.question ?? "";
  const resIdx = sim.questions.findIndex((x) => x.key === "state_of_residence" || x.key === "county_of_residence");
  const residenceAsked = sim.snaps[at].asked.some((i) => ["state_of_residence", "county_of_residence"].includes(sim.questions[i].key)) || sim.step0.includes("state_of_residence");
  return (
    <div class="scr-int" tabIndex={-1} onKeyDown={onKey}>
      <div class="scr-stats">
        <div><b>{neededQ}</b><span>questions needed ({askedAnswers} answers across the household){sim.branch ? ", with the branch points" : ", engine answers only"}</span></div>
        <div><b>{sim.stated.keys}</b><span>distinct facts the household states in all ({sim.stated.units} answers across its {pids.length} {pids.length === 1 ? "person" : "people"})</span></div>
        <div><b>{sim.questions.length}</b><span>of them the order would ask if nothing were skipped{sim.unread.length ? `; ${sim.unread.length} more are read by no outcome shown here` : ""}</span></div>
      </div>
      <div class="scr-bar" role="group" aria-label="Step through the interview">
        <button class="btn small" onClick={() => go(0)} disabled={at === 0} aria-label="Back to the start">⏮<span class="scr-bl"> Start</span></button>
        <button class="btn small" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous question">◀<span class="scr-bl"> Previous</span></button>
        <span class="scr-pos" aria-live="polite">{at === 0 ? "Application data only" : <>Question <b>{at}</b> of {last}</>}</span>
        <button class="btn small primary" onClick={() => go(at + 1)} disabled={at === last}>Next<span class="scr-bl"> question</span> ▶</button>
        <button class="btn small" onClick={() => go(last)} disabled={at === last} aria-label="To the end of the interview"><span class="scr-bl">End </span>⏭</button>
        <span class="small muted scr-keys">Keys: ← → Home End</span>
      </div>
      <section class="card scr-now">
        {cur ? (
          <>
            <p class="eyebrow">Just asked · {cur.step >= s.cross_program_order.length ? "after step 12" : `step ${cur.step}`}: {stepName(cur.step)}</p>
            <h2><FactName k={cur.key} /></h2>
            <Answers c={c} k={cur.key} who={cur.who} />
          </>
        ) : (
          <>
            <p class="eyebrow">Before any question</p>
            <h2>Application data</h2>
            <p class="small">{sim.step0.length ? <>Revealed: {sim.step0.map((k, i) => <>{i > 0 && ", "}<FactName k={k} /></>)}.</> : "The household states no application data."} The persons themselves, the determination date and the case's figure overrides are always kept.</p>
          </>
        )}
      </section>
      {!residenceAsked && resIdx >= 0 && <p class="warnbox"><b>Residency not asked yet (G0).</b> Until a state or county is asked, the engine reads a person who states neither as <i>not a Colorado resident</i>, so an early "not eligible" for Adult Financial (and some Medicaid answers) comes from no information. The review asks that a screener ask residence before it shows any result.</p>}
      <Results s={s} c={c} sim={sim} at={at} pids={pids} who={who} />
      <Questions s={s} c={c} sim={sim} at={at} answers={answers} stepName={stepName} asked={asked.length} />
      <Gaps s={s} />
    </div>
  );
}

function Results({ s, c, sim, at, pids, who }: { s: ScreeningData; c: HouseholdCase; sim: Sim; at: number; pids: string[]; who: (p: string) => string }) {
  const q = route.value.q;
  const all = q.all === "1";
  const snap = sim.snaps[at];
  const fams = Object.keys(s.programs).filter((f) => s.programs[f].outcomes.some((o) => pids.some((p) => sim.full[o]?.[p]?.v != null)));
  const none = Object.keys(s.programs).filter((f) => !fams.includes(f));
  const rows: Array<[string, string]> = fams.flatMap((f) => (all ? s.programs[f].outcomes : [PRIMARY[f] ?? s.programs[f].outcomes[0]]).filter((o) => byIdent.has(o)).map((o) => [f, o] as [string, string]));
  const [selO, selP] = (q.cell ?? "").split("|");
  const curP = q.p && pids.includes(q.p) ? q.p : pids[0];
  return (
    <section class="card">
      <div class="card-h">
        <h2>Each program, each person, after {at === 0 ? "the application data" : `question ${at}`}</h2>
        <label class="inline small"><input type="checkbox" checked={all} onChange={(e) => setQ({ all: (e.target as HTMLInputElement).checked ? "1" : undefined })} /> Every outcome ({Object.values(s.programs).reduce((n, p) => n + p.outcomes.length, 0)})</label>
      </div>
      <p class="small muted">Decided by the engine from the answers given so far. "Likely not eligible" is a screener's statement about those answers, not a determination: the person may still apply. Outcomes the household's full facts leave undetermined are not counted as waiting.</p>
      <div class="psel" role="group" aria-label="Person">
        {pids.map((p) => <button class={p === curP ? "on" : ""} aria-pressed={p === curP} onClick={() => setQ({ p })}>{who(p)}</button>)}
      </div>
      <div class="gridwrap">
        <table class="grid scr-grid">
          <thead><tr><th></th>{pids.map((p) => <th class={p === curP ? "sel" : ""}>{who(p)}</th>)}</tr></thead>
          <tbody>
            {rows.map(([f, o]) => {
              const it = byIdent.get(o)!;
              const closed = snap.closed.get(f);
              return (
                <tr>
                  <th scope="row"><FamilyTag f={f} />{all && <span class="scr-oname">{shortName(it)}</span>}{closed && closed.startsWith("branch") && <span class="scr-closed" title={closed}>branch point closed</span>}</th>
                  {pids.map((p) => {
                    const cell = snap.state[o]?.[p];
                    const fullV = sim.full[o]?.[p]?.v;
                    if (!cell) return <td />;
                    const sa = settledAt(sim, o, p);
                    const fl = flips(sim, o, p, at);
                    const note = noteKind(sim, f, o, p, at);
                    const sel = selO === o && selP === p;
                    return (
                      <td class={(p === curP ? "sel" : "") + (sel ? " open" : "")}>
                        <button class={"scr-cell c-" + (fullV === null || fullV === undefined ? "na" : cell.cls)} aria-pressed={sel}
                          onClick={() => setQ({ cell: sel ? undefined : o + "|" + p, p })}>
                          <span class="scr-cls">{fullV == null && cell.v == null ? "Not decided" : REFERRAL.has(cell.v as string) ? "Medicaid instead" : CLS_LABEL[cell.cls]}</span>
                          {cell.v !== null && <span class="scr-v">{fmtVal(cell.v, it, who, true)}</span>}
                          {cell.v !== null && sa !== null && sa <= at && <span class="scr-since">{sa === 0 ? "from the application data" : `since question ${sa}`}</span>}
                          {(note || fl.length > 0) && <span class="scr-note">note</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {none.length > 0 && <p class="small muted">Not decided for this household (its facts settle none of their outcomes): {none.map((f) => <FamilyTag f={f} />)}</p>}
      <p class="small muted">Select a result for what it waits on, whether any answer could change it, and the engine's limits it runs into.</p>
      {selO && selP && snap.state[selO]?.[selP] && <CellDetail s={s} c={c} sim={sim} at={at} o={selO} pid={selP} who={who} />}
    </section>
  );
}
/** Whether a cell has something to say about the engine's limits. */
function noteKind(sim: Sim, f: string, o: string, p: string, at: number): string | null {
  const cell = sim.snaps[at].state[o][p];
  const fin = sim.snaps[sim.snaps.length - 1].state[o][p];
  const full = sim.full[o][p];
  if (cell.v === null && (sim.snaps[at].closed.get(f) ?? "").startsWith("branch")) return "branch";
  if (at === sim.snaps.length - 1 && full.v !== null && classify(fin.v) !== full.cls) return "differs";
  return null;
}

const tried = new Map<string, Tried>();
function CellDetail({ s, c, sim, at, o, pid, who }: { s: ScreeningData; c: HouseholdCase; sim: Sim; at: number; o: string; pid: string; who: (p: string) => string }) {
  const it = byIdent.get(o)!;
  const f = Object.keys(s.programs).find((x) => s.programs[x].outcomes.includes(o))!;
  const cell = sim.snaps[at].state[o][pid];
  const full = sim.full[o][pid];
  const fin = sim.snaps[sim.snaps.length - 1].state[o][pid];
  const sa = settledAt(sim, o, pid);
  const fl = flips(sim, o, pid, sim.snaps.length - 1);
  const closed = sim.snaps[at].closed.get(f);
  const key = `${sim.id}|${sim.branch}|${at}|${o}|${pid}`;
  const [tr, setTr] = useState<Tried | null>(tried.get(key) ?? null);
  useEffect(() => {
    setTr(tried.get(key) ?? null);
    if (cell.v !== null || tried.has(key)) return;
    const t = setTimeout(() => {
      const on = new Set<string>([...sim.step0, ...sim.snaps[at].asked.map((i) => sim.questions[i].key)]);
      const r = tryEveryAnswer(withhold(c, on), o, pid);
      tried.set(key, r);
      setTr(r);
    }, 30);
    return () => clearTimeout(t);
  }, [key]);
  const missingName = (m: Missing) => <><FactName k={m.identifier} />{m.person && <span class="muted"> ({who(m.person)}{m.month ? `, ${fmtDate(m.month)}` : ""})</span>}</>;
  const asked = new Set(sim.snaps[at].asked.map((i) => sim.questions[i].key).concat(sim.step0));
  // When each stated fact is asked in the full interview (its question number).
  const statedQ = new Map<string, number | string>();
  sim.questions.forEach((x) => statedQ.set(x.key, "a later point if it is not skipped"));
  sim.snaps[sim.snaps.length - 1].asked.forEach((i, n) => statedQ.set(sim.questions[i].key, n + 1));
  const rank = (m: Missing) => (statedQ.has(m.identifier) && !asked.has(m.identifier) ? 0 : asked.has(m.identifier) ? 1 : 2);
  const waiting = cell.waiting.slice().sort((a, b) => rank(a) - rank(b));
  return (
    <div class="scr-detail" aria-live="polite">
      <h3>{who(pid)} · <ItemLink it={it} /></h3>
      <p><b>{CLS_LABEL[cell.cls]}</b>{cell.v !== null && <> · {fmtVal(cell.v, it, who, true)}</>}{sa !== null && sa <= at && cell.v !== null && <span class="muted"> · settled {sa === 0 ? "from the application data" : `after question ${sa}`}</span>}</p>
      <p class="small"><span class="muted">With every fact the household states: </span>{full.v === null ? "cannot determine" : <>{CLS_LABEL[full.cls].replace("Likely not", "Not")} · {fmtVal(full.v, it, who, true)}</>} · <a href={href("households/" + c.id, { why: o, p: pid })}>Why, step by step</a></p>
      {cell.cls === "not" && <p class="small notice">A screener would say: <q>likely not eligible for {f}, based on what you told us; you may still apply</q>. It names what the answer turned on and keeps the application open.</p>}
      {cell.v === null && cell.waiting.length > 0 && (
        <div class="small">
          <p class="muted">It waits on {waiting.length === 1 ? "this fact" : `these ${waiting.length} facts`}, the ones the engine reached; a rule that stops at an unknown condition does not list what its later arms need (G5). Facts the household states and will be asked come first.</p>
          <ul>{waiting.slice(0, 8).map((m) => <li>{missingName(m)} <span class="muted">· {statedQ.has(m.identifier) ? (asked.has(m.identifier) ? "asked" : `the household answers it at question ${statedQ.get(m.identifier)}`) : asked.has(m.identifier) ? "asked; the household does not state it" : "the household does not state it"}</span></li>)}</ul>
          {waiting.length > 8 && <p class="muted">… and {waiting.length - 8} more.</p>}
        </div>
      )}
      {cell.v === null && (
        tr === null ? <p class="small muted" role="status">Trying every answer to the yes/no and one-of facts it waits on…</p>
        : tr.result === "same" ? (
          <p class="warnbox small"><b>Engine limit (G1, G2).</b> The rule's logic is already settled: every answer to {tr.facts.map((m, i) => <>{i > 0 && ", "}{missingName(m)}</>)} gives <b>{CLS_LABEL[tr.cls!].toLowerCase()}</b> ({tr.leaves} combinations, each decided by the engine over the fact's own values). The engine alone still says "cannot determine", because a first-hit rule stops at its first unknown condition (G1), or the answers reach the same result by different routes (G2). The engine is not changed here.</p>
        ) : tr.result === "differs" ? (
          <p class="small">Not settled yet: the answers to {tr.facts.map((m, i) => <>{i > 0 && ", "}{missingName(m)}</>)} lead to different results ({tr.leaves} combinations tried).</p>
        ) : (
          <p class="small muted">Not tried in full{tr.facts.length ? <> (after trying {tr.facts.map((m, i) => <>{i > 0 && ", "}{missingName(m)}</>)})</> : null}: {tr.blocked?.identifier ? <>it waits on {missingName(tr.blocked)}{statedQ.has(tr.blocked.identifier) ? "" : ", which the household never states"}, a {byIdent.get(tr.blocked.identifier)?.type ?? "fact"} this page does not try values for.{/money|receipts|number/.test(byIdent.get(tr.blocked.identifier)?.type ?? "") ? " Where the known part of a sum already passes a limit, the engine still waits for the rest (G3)." : ""}</> : "the try ran out of its budget of combinations."}</p>
        )
      )}
      {closed && closed.startsWith("branch") && cell.v === null && <p class="warnbox small"><b>Branch point.</b> The review's order skips the rest of {f}: {closed.replace(/^branch point: /, "")}. A screener may say "likely not eligible; you may still apply". The engine cannot settle it from these answers{tr?.result === "same" ? " for the reason above" : ", because its rule asks about other things first (G1)"}.</p>}
      {fl.length > 0 && <p class="warnbox small"><b>Changed after it was settled.</b> {fl.map((x) => <>It read {CLS_LABEL[x.from].toLowerCase()} until question {x.at} revealed <FactName k={sim.questions[sim.snaps[x.at].asked[x.at - 1]].key} />, then {CLS_LABEL[x.to].toLowerCase()}. </>)}Before that question the engine settled the outcome while the fact was not stated, reading the silence as an answer or as a default. A screener cannot rely on that early answer. Where the rule states no default, this goes against decision 4 ("missing information means cannot determine"). The review names one case, residency (G0, CO-505).</p>}
      {at === sim.snaps.length - 1 && full.v !== null && classify(fin.v) !== full.cls && <p class="warnbox small"><b>The interview stopped too early for this one.</b> When nothing more was asked it read {CLS_LABEL[classify(fin.v)].toLowerCase()}; with every fact the engine says {CLS_LABEL[full.cls].toLowerCase()}. A question it needed was skipped{sim.branch ? " (try without the branch points)" : ""}.</p>}
    </div>
  );
}

function Questions({ s, c, sim, at, answers, stepName, asked }: { s: ScreeningData; c: HouseholdCase; sim: Sim; at: number; answers: (k: string) => number; stepName: (n: number) => string; asked: number }) {
  const snap = sim.snaps[at];
  const askedSet = new Map(snap.asked.map((i, n) => [i, n + 1]));
  const later = new Map(snap.later.map((l) => [l.q, l]));
  const steps = [...new Set(sim.questions.map((x) => x.step))];
  const nowSkipped = snap.later.filter((l) => !l.needed).length;
  const stillNeeded = snap.later.filter((l) => l.needed).length;
  return (
    <section class="card">
      <div class="card-h"><h2>The interview</h2><span class="small muted">{asked} asked · {snap.passed.size} passed over · {nowSkipped} later questions now skipped · {stillNeeded} still to ask</span></div>
      <p class="small muted">Only the questions this household answers are listed: a question it states nothing for has nothing to reveal. A question is skipped when every program that reads it is settled for everyone{sim.branch ? " or closed by one of the review's branch points" : ""}.</p>
      {steps.map((st) => {
        const qs = sim.questions.map((x, i) => [x, i] as const).filter(([x]) => x.step === st);
        const notStated = st < s.cross_program_order.length ? (s.cross_program_order.find((x) => x.step === st)?.facts ?? []).filter((k) => !sim.questions.some((x) => x.key === k)) : [];
        return (
          <div class="scr-qstep">
            <h3>{st >= s.cross_program_order.length ? "Then" : `Step ${st}`}: {stepName(st)}</h3>
            <ol class="plain">
              {qs.map(([x, i]) => {
                const n = askedSet.get(i);
                const passed = snap.passed.get(i);
                const l = later.get(i);
                const state = n !== undefined ? "asked" : passed ? "passed" : l && !l.needed ? "skipped" : "ahead";
                const why = passed ?? l?.why ?? [];
                return (
                  <li class={"scr-qi q-" + state + (n === at && at > 0 ? " cur" : "")}>
                    <span class="scr-qmark" aria-hidden="true">{state === "asked" ? n : state === "ahead" ? "·" : "–"}</span>
                    <div>
                      <FactName k={x.key} /> <span class="small muted">{answers(x.key)} answer{answers(x.key) === 1 ? "" : "s"}</span>
                      {state === "asked" && <span class="small"> · question {n}</span>}
                      {state === "passed" && <span class="small"> · skipped</span>}
                      {state === "skipped" && <span class="small"> · now skipped</span>}
                      {state === "ahead" && <span class="small muted"> · still to ask</span>}
                      {state === "asked" && <Answers c={c} k={x.key} who={x.who} />}
                      {(state === "passed" || state === "skipped") && why.length > 0 && <details class="small scr-why"><summary>Why</summary><ul>{why.map((w) => <li>{w}</li>)}</ul></details>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {notStated.length > 0 && <p class="small muted">Not stated by this household: {notStated.map((k, i) => <>{i > 0 && ", "}<FactName k={k} /></>)}.</p>}
          </div>
        );
      })}
      {sim.unread.length > 0 && <Fold title="Stated, but read by no outcome shown here" count={sim.unread.length}><p class="small">{sim.unread.map((k, i) => <>{i > 0 && ", "}<FactName k={k} /></>)}</p></Fold>}
    </section>
  );
}

