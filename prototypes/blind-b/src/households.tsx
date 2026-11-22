/* Stored households: the list, the results grid with aid codes, the
 * determination step by step, documents owed, and what-if on a stated amount. */
import { useMemo, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import {
  D, E, byIdent, srcById, PROGRAMS, PROGRAM_ORDER, fmtVal, fmtDate, caseById, caseAsOf, monthOf, personLabel, evalOne, traceOne,
  checkCase, aidCodesFor, programOutcomes, outcomeProgram, downstream, versionInForce, shortName, type CItem, type HouseholdCase, type TraceNode,
} from "./store";
import { href, route, setQ, ProgramTag, Pill, Fold, More, ItemLink, RuleText, AidNotice, Crumbs, Empty, Rich } from "./ui";

const MAIN: Record<string, { status: string[]; amounts: string[] }> = {
  Medicaid: { status: ["ma_magi_eligibility_status"], amounts: ["ma_patient_payment"] },
  "CHP+": { status: ["chp_eligibility_status"], amounts: [] },
  SNAP: { status: ["snap_eligibility_status"], amounts: ["snap_allotment"] },
  ColoradoWorks: { status: ["cw_eligibility_status"], amounts: ["cw_grant_amount", "cw_diversion_payment"] },
  AdultFinancial: { status: ["af_category"], amounts: ["af_oap_grant", "af_and_grant", "af_hca_grant"] },
  CCCAP: { status: ["cccap_eligibility_status"], amounts: ["cccap_parent_fee"] },
  LEAP: { status: ["leap_is_eligible"], amounts: ["leap_benefit_amount"] },
  SunBucks: { status: ["sebt_eligibility_status"], amounts: ["sebt_benefit_amount"] },
};

const checks = new Map<string, { passed: number; failed: number }>();
function checkOf(c: HouseholdCase) {
  let r = checks.get(c.id);
  if (!r) { const x = checkCase(c); r = { passed: x.passed, failed: x.failed }; checks.set(c.id, r); }
  return r;
}
function casePrograms(c: HouseholdCase): string[] {
  const s = new Set<string>();
  for (const ex of Object.values(c.expect ?? {})) for (const k of Object.keys(ex)) { const it = byIdent.get(k); if (it && it.program !== "All") s.add(it.program); }
  return PROGRAM_ORDER.filter((p) => s.has(p));
}

export function HouseholdList() {
  const q = route.value.q;
  const text = (q.q ?? "").toLowerCase(), prog = q.program ?? "";
  const list = D.cases.filter((c) => (!text || (c.id + " " + c.title).toLowerCase().includes(text)) && (!prog || casePrograms(c).includes(prog)));
  return (
    <div>
      <h1>Stored households</h1>
      <p class="lede">{D.cases.length} worked families kept with the rulebook. Each one states its facts and the results the rules must give, so a change to a rule can be judged by what it does to them. They are examples, not the caseload.</p>
      <div class="filters">
        <input type="search" placeholder="Find a household by words in its description" value={q.q ?? ""} onInput={(e) => setQ({ q: (e.target as HTMLInputElement).value })} />
        <select value={prog} onChange={(e) => setQ({ program: (e.target as HTMLSelectElement).value })}>
          <option value="">Any program</option>
          {PROGRAM_ORDER.map((p) => <option value={p}>{PROGRAMS[p].short}</option>)}
        </select>
      </div>
      <ul class="plain hhlist">
        {list.map((c) => {
          const ck = checkOf(c);
          return (
            <li>
              <a class="hhcard" href={href("households/" + c.id)}>
                <span class="hh-id">{c.id}</span>
                <span class="hh-main">
                  <span class="hh-title">{c.title.replace(/^"|"$/g, "")}</span>
                  <span class="hh-sub">Determined {fmtDate(c.as_of)} · {Object.keys(c.persons).length} {Object.keys(c.persons).length === 1 ? "person" : "people"} · {casePrograms(c).map((p) => <ProgramTag id={p} />)}</span>
                </span>
                <span class={"hh-ck " + (ck.failed ? "warn-t" : "ok-t")}>{ck.failed ? `${ck.failed} of ${ck.passed + ck.failed} results differ` : `${ck.passed} stored results match`}</span>
              </a>
            </li>
          );
        })}
      </ul>
      {!list.length && <Empty>No stored household matches.</Empty>}
    </div>
  );
}

export function HouseholdPage({ id }: { id: string }) {
  const base = caseById(id);
  if (!base) return <Empty>There is no stored household {id}.</Empty>;
  const q = route.value.q;
  const asof = q.asof && /^\d{4}-\d{2}-\d{2}$/.test(q.asof) ? q.asof : base.as_of;
  const c = useMemo(() => caseAsOf(base, asof), [id, asof]);
  const moved = asof !== base.as_of;
  const tab = q.tab ?? "results";
  const ck = checkOf(base);
  const pids = Object.keys(c.persons);
  const who = (p: string) => personLabel(c, p);
  return (
    <div class="hh">
      <Crumbs items={[["Households", href("households")], c.id]} />
      <h1><span class="hh-id big">{c.id}</span> {c.title.replace(/^"|"$/g, "")}</h1>
      <div class="asof">
        <label>Determined as of <input type="date" value={asof} onChange={(e) => setQ({ asof: (e.target as HTMLInputElement).value === base.as_of ? undefined : (e.target as HTMLInputElement).value })} /></label>
        <span class="muted">{pids.length} {pids.length === 1 ? "person" : "people"} · results for {fmtDate(monthOf(c))}</span>
        {!moved && <span class={ck.failed ? "warn-t" : "ok-t"}>{ck.failed ? `${ck.failed} stored results differ from the rules` : `All ${ck.passed} stored results match the rules`}</span>}
        {moved && <span class="warnbox inline"><b>You moved the date.</b> The household is re-decided with the rules and figures in force on {fmtDate(asof)}; this month’s facts move with it. The stored results belong to {fmtDate(base.as_of)}. <button class="linkish" onClick={() => setQ({ asof: undefined })}>Back to {fmtDate(base.as_of)}</button></span>}
      </div>
      {q.why ? <Determination c={c} identifier={q.why} pid={q.p ?? pids[0]} /> : (
        <>
          <div class="tabs" role="tablist">
            {[["results", "Results and aid codes"], ["documents", "Documents still needed"], ["whatif", "What if"], ["facts", "What the case states"]].map(([k, l]) => (
              <button role="tab" aria-selected={tab === k} class={tab === k ? "on" : ""} onClick={() => setQ({ tab: k === "results" ? undefined : k })}>{l}</button>
            ))}
          </div>
          {tab === "results" && <Results c={c} who={who} sel={q.p} prog={q.prog} />}
          {tab === "documents" && <Documents c={c} who={who} />}
          {tab === "whatif" && <WhatIf c={c} who={who} />}
          {tab === "facts" && <Facts c={c} who={who} />}
        </>
      )}
    </div>
  );
}

/* ---------- results grid ---------- */
function Results({ c, who, sel, prog }: { c: HouseholdCase; who: (p: string) => string; sel?: string; prog?: string }) {
  const pids = Object.keys(c.persons);
  const cur = sel ?? pids[0];
  const cell = (pid: string, p: string): ComponentChildren => {
    const codes = aidCodesFor(c, pid, p);
    const st = MAIN[p].status.map((s) => ({ it: byIdent.get(s)!, v: evalOne(c, s, pid) }));
    const am = MAIN[p].amounts.map((s) => ({ it: byIdent.get(s)!, v: evalOne(c, s, pid) })).filter((a) => typeof a.v === "number" && a.v > 0);
    return (
      <a class={"cell" + (codes.length ? " has" : "")} href={href("households/" + c.id, { ...route.value.q, p: pid, prog: p, keep: "1" })}>
        {codes.map((k) => <span class="code" title={k.label}><b>{k.code}</b><span>{k.label.replace(/^[^:]+: /, "")}</span></span>)}
        {!codes.length && <span class="nocode">{st.map((s) => (s.v === null ? "Cannot determine" : fmtVal(s.v, s.it, who, true))).join("; ")}</span>}
        {am.map((a) => <span class="amt">{shortName(a.it)} <b>{fmtVal(a.v, a.it)}</b></span>)}
      </a>
    );
  };
  const decided = PROGRAM_ORDER.filter((p) => pids.some((pid) => MAIN[p].status.some((x) => evalOne(c, x, pid) !== null)));
  const undecided = PROGRAM_ORDER.filter((p) => !decided.includes(p));
  return (
    <div>
      <AidNotice />
      <div class="psel" role="tablist" aria-label="Person">
        {pids.map((p) => <button class={p === cur ? "on" : ""} onClick={() => setQ({ p })}>{who(p)}</button>)}
      </div>
      <div class="gridwrap">
        <table class="grid" data-cols={pids.length}>
          <thead><tr><th></th>{pids.map((p) => <th class={p === cur ? "sel" : ""}>{who(p)}<PersonHint c={c} pid={p} /></th>)}</tr></thead>
          <tbody>
            {decided.map((p) => (
              <tr>
                <th scope="row"><ProgramTag id={p} /></th>
                {pids.map((pid) => <td class={(pid === cur ? "sel" : "") + (pid === cur && prog === p ? " open" : "")}>{cell(pid, p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p class="small muted">Select a result to see everything the program decided for that person, and why.</p>
      {undecided.length > 0 && <p class="small muted">Not decided for this household, because the case does not state the facts these programs ask for: {undecided.map((p, i) => <>{i > 0 && " "}<a href={href("households/" + c.id, { ...route.value.q, p: cur, prog: p, keep: "1" })}><ProgramTag id={p} /></a></>)}</p>}
      {prog && <ProgramDetail c={c} pid={cur} program={prog} who={who} />}
    </div>
  );
}
function PersonHint({ c, pid }: { c: HouseholdCase; pid: string }) {
  const f = (c.persons[pid].facts ?? {}) as Record<string, unknown>;
  const bits: string[] = [];
  if (typeof f.immigration_status === "string") bits.push(f.immigration_status.replace(/_/g, " "));
  if (f.is_pregnant === true) bits.push("pregnant");
  return bits.length ? <span class="phint">{bits.join(" · ")}</span> : null;
}
function ProgramDetail({ c, pid, program, who }: { c: HouseholdCase; pid: string; program: string; who: (p: string) => string }) {
  const outs = programOutcomes(program, true);
  const codes = aidCodesFor(c, pid, program);
  const fund = D.aidCodes.funding?.programs?.includes(program) ? evalOne(c, D.aidCodes.funding.outcome, pid) : undefined;
  return (
    <section class="card detail" id="detail">
      <h2>{who(pid)} · {PROGRAMS[program].label}</h2>
      {codes.length > 0 ? <p>{codes.map((k) => <span class="code inline"><b>{k.code}</b> {k.label}</span>)}{fund !== undefined && fund !== null && <span class="muted"> · paid from {fmtVal(fund, byIdent.get(D.aidCodes.funding.outcome), undefined, true)}</span>}</p>
        : <p class="muted">No aid code for this person in this program.</p>}
      <table class="outs">
        <tbody>
          {outs.map((o) => {
            const v = evalOne(c, o.identifier, pid);
            return (
              <tr>
                <td><ItemLink it={o} cls="plainlink">{shortName(o)}</ItemLink></td>
                <td class={v === null ? "warn-t" : ""}><b>{fmtVal(v, o, who, true)}</b></td>
                <td><a class="btn small" href={href("households/" + c.id, { asof: route.value.q.asof, why: o.identifier, p: pid })}>Why?</a></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/* ---------- the determination, step by step ---------- */
function originWord(n: TraceNode, c: HouseholdCase): string {
  const it = byIdent.get(n.identifier);
  switch (n.origin) {
    case "case": case "default": return "stated in the case";
    case "missing": return "not stated in the case";
    case "parameter": { const v = it ? versionInForce(it, c.as_of) : null; return v ? `figure in force since ${fmtDate(v.from)}` : "figure"; }
    case "no-version": return "no figure published for this date";
    case "not-in-force": return `rule not in force on ${fmtDate(c.as_of)}`;
    case "memo": return "worked out earlier in this determination";
    default: return "worked out by rule";
  }
}
function Step({ n, c, who, depth, parentPerson, lead }: { n: TraceNode; c: HouseholdCase; who: (p: string) => string; depth: number; parentPerson: string | null; lead?: boolean }) {
  const it = byIdent.get(n.identifier);
  const marked = n.children.filter((k) => k.decisive);
  const deciding = marked.length ? marked : n.children;
  const others = marked.length ? n.children.filter((k) => !k.decisive) : [];
  const [open, setOpen] = useState(depth < 7);
  const [showOthers, setShowOthers] = useState(false);
  const mark = new Set(deciding.map((k) => k.identifier));
  const src = it ? (it.sources ?? []).map((s) => srcById.get(s)).filter(Boolean)[0] : null;
  const isRule = n.kind === "derived" && n.origin !== "memo" && n.origin !== "case";
  const dedupe = (ks: TraceNode[]) => { const seen = new Set<string>(); return ks.filter((k) => (seen.has(k.key) ? false : (seen.add(k.key), true))); };
  return (
    <div class={"dstep k-" + n.kind + (lead ? " top" : "") + (n.value === null ? " unknown" : "")}>
      <div class="dstep-h">
        <span class={"kdot k-" + n.kind} />
        <span class="dstep-name">
          {n.person && n.person !== parentPerson && <span class="who">{who(n.person)}: </span>}
          {it ? <ItemLink it={it} cls="plainlink" /> : n.name}
          {n.month && n.month !== monthOf(c) && <span class="muted"> in {fmtDate(n.month)}</span>}
        </span>
        <span class="dstep-val">{fmtVal(n.value, it, who, true)}</span>
      </div>
      <p class="dstep-o small muted">
        {originWord(n, c)}{src && isRule ? <> · {src.cite.replace(/\.$/, "")}</> : null}
        {n.origin === "memo" && n.person && <> · <a href={href("households/" + c.id, { asof: route.value.q.asof, why: n.identifier, p: n.person })}>open its own steps</a></>}
      </p>
      {n.override && <p class="callout fed small"><b>Federal law over Colorado’s rule.</b> <Rich text={n.override} /></p>}
      {n.error && <p class="warnbox small">{n.error}</p>}
      {(n.warnings ?? []).map((w) => <p class="warnbox small">{w}</p>)}
      {isRule && n.children.length > 0 && (
        open ? (
          <div class="dstep-body">
            {it && <RuleText it={it} mark={mark} />}
            <p class="because">{marked.length ? "Decided by" : "From"}</p>
            <div class="dkids">
              {dedupe(deciding).map((k) => <Step n={k} c={c} who={who} depth={depth + 1} parentPerson={n.person} />)}
            </div>
            {others.length > 0 && (
              <div class="others">
                <button class="linkish" onClick={() => setShowOthers(!showOthers)}>{showOthers ? "Hide" : "Show"} {dedupe(others).length} other thing{dedupe(others).length > 1 ? "s" : ""} that {dedupe(others).length > 1 ? "were" : "was"} checked but did not decide</button>
                {showOthers && <div class="dkids dim">{dedupe(others).map((k) => <Step n={k} c={c} who={who} depth={depth + 3} parentPerson={n.person} />)}</div>}
              </div>
            )}
          </div>
        ) : <button class="linkish" onClick={() => setOpen(true)}>Show how this was worked out</button>
      )}
    </div>
  );
}
function countNodes(n: TraceNode): number { return 1 + n.children.reduce((a, k) => a + countNodes(k), 0); }
function missing(n: TraceNode, out = new Map<string, TraceNode>()): Map<string, TraceNode> {
  if (n.kind === "supplied" && n.origin === "missing") out.set(n.identifier + "|" + n.person, n);
  n.children.forEach((k) => missing(k, out));
  return out;
}
function Determination({ c, identifier, pid }: { c: HouseholdCase; identifier: string; pid: string }) {
  const it = byIdent.get(identifier);
  const who = (p: string) => personLabel(c, p);
  const root = useMemo(() => traceOne(c, identifier, pid), [c, identifier, pid]);
  if (!it) return <Empty>Unknown outcome.</Empty>;
  const program = outcomeProgram.get(identifier) ?? it.program;
  const miss = [...missing(root).values()];
  const back = href("households/" + c.id, { asof: route.value.q.asof, p: pid, prog: program });
  const exp = (caseById(c.id)?.expect?.[pid] ?? {})[identifier];
  return (
    <section class="determination">
      <p class="noprint"><a href={back}>← Back to the results</a> <button class="btn ghost small print-btn" onClick={() => print()}>Print this record</button></p>
      <div class="det-head">
        <p class="eyebrow">Determination record · {c.id} · as of {fmtDate(c.as_of)} · <ProgramTag id={program} /></p>
        <h2>{who(pid)}: {it.name}</h2>
        <p class="det-answer">{fmtVal(root.value, it, who, true)}</p>
        {root.value === null && <p class="warnbox"><b>Cannot determine.</b> {miss.length ? <>The rules asked for {miss.length} fact{miss.length > 1 ? "s" : ""} the case does not state: {miss.slice(0, 8).map((m, i) => <>{i > 0 && "; "}{m.person ? who(m.person) + ": " : ""}{m.name}</>)}{miss.length > 8 && ` and ${miss.length - 8} more`}.</> : "A figure or rule it needs has nothing in force on this date."}</p>}
        <p class="small muted">Read from the top: each step is followed by the step that decided it, down to what the case states. {countNodes(root)} things were looked at in all; those that did not decide are folded away.</p>
      </div>
      <Step n={root} c={c} who={who} depth={0} parentPerson={pid} lead />
      <p class="small muted det-foot">Rules and figures as in force on {fmtDate(c.as_of)}. Rulebook draft of {fmtDate(D.generated)}; no item in it has been approved.{exp !== undefined && route.value.q.asof === undefined ? <> The stored expected result is “{typeof exp === "object" && exp && !Array.isArray(exp) ? fmtVal((exp as any)[monthOf(c)], it, who) : fmtVal(exp, it, who)}”.</> : null}</p>
    </section>
  );
}

/* ---------- documents ---------- */
const PREFIX: Record<string, string> = { Medicaid: "ma_", "CHP+": "chp_", SNAP: "snap_", ColoradoWorks: "cw_", AdultFinancial: "af_", CCCAP: "cccap_", LEAP: "leap_", SunBucks: "sebt_" };
function dueFor(c: HouseholdCase, pid: string, program: string, pendingId: string): { date: string; it: CItem } | null {
  const pre = PREFIX[program];
  const tryIds: string[] = [];
  if (/citizenship|immigration|lawful_presence|noncitizen|ssn/.test(pendingId)) tryIds.push(pre + "noncitizen_documentation_due_date", pre + "status_verification_due_date", "ma_reasonable_opportunity_period_end_date");
  if (/shelter|medical|dependent_care|child_support/.test(pendingId)) tryIds.push(pre + "expense_verification_due_date");
  if (/and_so_disability/.test(pendingId)) tryIds.push("af_and_so_disability_certification_due_date");
  tryIds.push(pre + "verification_due_date");
  if (program === "CHP+") tryIds.push("ma_verification_due_date");
  for (const id of tryIds) {
    const it = byIdent.get(id);
    if (!it || (id.startsWith("ma_reasonable") && !/Medicaid|CHP/.test(program))) continue;
    const v = evalOne(c, id, pid);
    if (typeof v === "string") return { date: v, it };
  }
  return null;
}
function Documents({ c, who }: { c: HouseholdCase; who: (p: string) => string }) {
  const rows = useMemo(() => {
    const out: Array<{ pid: string; program: string; it: CItem; due: ReturnType<typeof dueFor> }> = [];
    for (const pid of Object.keys(c.persons)) {
      for (const p of PROGRAM_ORDER) {
        for (const o of programOutcomes(p, false)) {
          if (!/_verification_is_pending$/.test(o.identifier)) continue;
          if (evalOne(c, o.identifier, pid) === true) out.push({ pid, program: p, it: o, due: dueFor(c, pid, p, o.identifier) });
        }
      }
    }
    return out;
  }, [c]);
  const status = PROGRAM_ORDER.map((p) => ({ p, it: byIdent.get(PREFIX[p] + "verification_status") })).filter((x) => x.it);
  const pids = Object.keys(c.persons);
  const what = (it: CItem) => shortName(it).replace(/ verification is pending$/, "").replace(/^./, (m) => m.toUpperCase());
  return (
    <div>
      <p class="lede">What each program is still waiting for, for whom, and by when, on {fmtDate(c.as_of)}.</p>
      {!rows.length && <Empty>Nothing is outstanding for this household on this date.</Empty>}
      {rows.length > 0 && (
        <table class="docs">
          <thead><tr><th>Who</th><th>Proof still needed</th><th>For</th><th>Due</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr>
                <td data-l="Who">{who(r.pid)}</td>
                <td data-l="Needed"><b>{what(r.it)}</b></td>
                <td data-l="For"><ProgramTag id={r.program} /></td>
                <td data-l="Due" class={r.due && r.due.date < c.as_of ? "warn-t" : ""}>{r.due ? <>{fmtDate(r.due.date)}{r.due.date < c.as_of && " (passed)"}<br /><span class="small muted">{shortName(r.due.it)}</span></> : <span class="muted">no date set by rule</span>}</td>
                <td><a class="btn small" href={href("households/" + c.id, { asof: route.value.q.asof, why: r.it.identifier, p: r.pid })}>Why?</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h3>Where each program stands meanwhile</h3>
      <div class="gridwrap">
        <table class="grid small">
          <thead><tr><th></th>{pids.map((p) => <th>{who(p)}</th>)}</tr></thead>
          <tbody>
            {status.map(({ p, it }) => (
              <tr><th scope="row"><ProgramTag id={p} /></th>{pids.map((pid) => { const v = evalOne(c, it!.identifier, pid); return <td><a class={"plainlink" + (/past_due|expired|disallowed|closed|excluded/.test(String(v)) ? " warn-t" : "")} href={href("households/" + c.id, { asof: route.value.q.asof, why: it!.identifier, p: pid })}>{fmtVal(v, it)}</a></td>; })}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- what if ---------- */
interface Stated { pid: string; it: CItem; value: number; where: "facts" | "month_defaults" | "months" }
function statedAmounts(c: HouseholdCase): Stated[] {
  const out: Stated[] = [];
  const m = monthOf(c);
  for (const [pid, p] of Object.entries(c.persons)) {
    const seen = new Set<string>();
    const look = (rec: Record<string, unknown> | undefined, where: Stated["where"]) => {
      for (const [k, v] of Object.entries(rec ?? {})) {
        const it = byIdent.get(k);
        if (!it || it.kind !== "supplied" || typeof v !== "number" || seen.has(k)) continue;
        if (it.type !== "money" && it.type !== "hours") continue;
        seen.add(k);
        out.push({ pid, it, value: v, where });
      }
    };
    look(p.months?.[m], "months"); look(p.month_defaults, "month_defaults"); look(p.facts as any, "facts");
  }
  return out;
}
function withAmount(c: HouseholdCase, s: Stated, v: number): HouseholdCase {
  const p: any = { ...c.persons[s.pid] };
  if (s.where === "months") p.months = { ...p.months, [monthOf(c)]: { ...p.months[monthOf(c)], [s.it.identifier]: v } };
  else p[s.where] = { ...p[s.where], [s.it.identifier]: v };
  return { ...c, persons: { ...c.persons, [s.pid]: p } };
}
function flat(n: TraceNode, depth = 0, out = new Map<string, { n: TraceNode; depth: number }>()) {
  if (!out.has(n.key)) out.set(n.key, { n, depth });
  n.children.forEach((k) => flat(k, depth + 1, out));
  return out;
}
function WhatIf({ c, who }: { c: HouseholdCase; who: (p: string) => string }) {
  const amounts = useMemo(() => statedAmounts(c).sort((a, b) => (b.value > 0 ? 1 : 0) - (a.value > 0 ? 1 : 0) || a.pid.localeCompare(b.pid)), [c]);
  const q = route.value.q;
  const pick = amounts.find((a) => a.pid + ":" + a.it.identifier === q.fact) ?? amounts.find((a) => /wages|earn|income/.test(a.it.identifier) && a.value > 0) ?? amounts[0];
  const [val, setVal] = useState<number | null>(null);
  const [sweep, setSweep] = useState<Array<{ at: number; changes: Array<{ pid: string; it: CItem; before: unknown; after: unknown }> }> | null>(null);
  if (!pick) return <Empty>This case states no dollar amounts or hours to move.</Empty>;
  const v = val ?? pick.value;
  const watch = useMemo(() => {
    const down = new Set(downstream(pick.it.identifier));
    return PROGRAM_ORDER.flatMap((p) => programOutcomes(p, true)).filter((o) => down.has(o.identifier));
  }, [pick.it.id]);
  const pids = Object.keys(c.persons);
  const evalAll = (cc: HouseholdCase) => { const m = new Map<string, unknown>(); for (const pid of pids) for (const o of watch) m.set(pid + "|" + o.identifier, evalOne(cc, o.identifier, pid)); return m; };
  const before = useMemo(() => evalAll(c), [c, pick]);
  const after = useMemo(() => (v === pick.value ? before : evalAll(withAmount(c, pick, v))), [c, pick, v]);
  const diffs = [...before.keys()].filter((k) => JSON.stringify(before.get(k)) !== JSON.stringify(after.get(k))).map((k) => { const [pid, id] = k.split("|"); return { pid, it: byIdent.get(id)!, before: before.get(k), after: after.get(k) }; });
  const runSweep = () => {
    const step = pick.it.type === "hours" ? 5 : 50, n = 60;
    const out: NonNullable<typeof sweep> = [];
    let prev = before;
    for (let i = 1; i <= n; i++) {
      const at = pick.value + i * step;
      const cur = evalAll(withAmount(c, pick, at));
      const ch = [...cur.keys()].filter((k) => { const it = byIdent.get(k.split("|")[1])!; return it.type !== "money" && JSON.stringify(prev.get(k)) !== JSON.stringify(cur.get(k)); })
        .map((k) => { const [pid, id] = k.split("|"); return { pid, it: byIdent.get(id)!, before: prev.get(k), after: cur.get(k) }; });
      if (ch.length) out.push({ at, changes: ch });
      prev = cur;
    }
    setSweep(out);
  };
  const unit = (n: number) => fmtVal(n, pick.it);
  return (
    <div class="whatif">
      <p class="lede">Move one amount this case already states and see which results change, and which step changed them. This re-decides the stored household; it is not an application.</p>
      <div class="card">
        <label>Amount to move
          <select value={pick.pid + ":" + pick.it.identifier} onChange={(e) => { setVal(null); setSweep(null); setQ({ fact: (e.target as HTMLSelectElement).value }); }}>
            {amounts.map((a) => <option value={a.pid + ":" + a.it.identifier}>{who(a.pid)}: {a.it.name} ({fmtVal(a.value, a.it)})</option>)}
          </select>
        </label>
        <div class="wi-row">
          <span>The case states <b>{unit(pick.value)}</b>. Try </span>
          <input type="number" value={v} step={pick.it.type === "hours" ? 1 : 25} onInput={(e) => setVal(Number((e.target as HTMLInputElement).value))} aria-label="New amount" />
          {(pick.it.type === "hours" ? [10, 20, 40] : [100, 250, 500, 1000]).map((d) => <button class="seg" onClick={() => setVal(v + d)}>+{pick.it.type === "hours" ? d : "$" + d}</button>)}
          {v !== pick.value && <button class="linkish" onClick={() => setVal(null)}>reset</button>}
        </div>
        <p class="small muted">{watch.length} program results can depend on this amount{watch.length ? "" : ": none of the headline results reads it"}.</p>
      </div>
      {v !== pick.value && (
        <section class="card">
          <h3>With {unit(v)} instead of {unit(pick.value)}</h3>
          {!diffs.length && <p class="ok-t">No program result changes.</p>}
          {diffs.map((d) => <DiffRow c={c} alt={withAmount(c, pick, v)} d={d} who={who} />)}
        </section>
      )}
      <section class="card">
        <h3>Where are the tipping points?</h3>
        <p class="small muted">Raises the amount in steps of {pick.it.type === "hours" ? "5 hours" : "$50"} up to {unit(pick.value + (pick.it.type === "hours" ? 300 : 3000))} and lists each point where a status or category changes (dollar results that simply slide are left out).</p>
        {!sweep && <button class="btn" onClick={runSweep}>Find them</button>}
        {sweep && !sweep.length && <p class="ok-t">No status changes anywhere in that range.</p>}
        {sweep && sweep.map((s) => (
          <div class="tip">
            <p><b>At about {unit(s.at)}</b> <button class="linkish" onClick={() => setVal(s.at)}>try this amount</button></p>
            <ul class="plain">{s.changes.map((ch) => <li>{who(ch.pid)}: <ItemLink it={ch.it} /> <span class="del">{fmtVal(ch.before, ch.it, who, true)}</span> → <span class="ins">{fmtVal(ch.after, ch.it, who, true)}</span></li>)}</ul>
          </div>
        ))}
      </section>
    </div>
  );
}
function DiffRow({ c, alt, d, who }: { c: HouseholdCase; alt: HouseholdCase; d: { pid: string; it: CItem; before: unknown; after: unknown }; who: (p: string) => string }) {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => {
    if (!open) return [];
    const a = flat(traceOne(c, d.it.identifier, d.pid)), b = flat(traceOne(alt, d.it.identifier, d.pid));
    const out: Array<{ n: TraceNode; was: unknown; depth: number }> = [];
    for (const [k, x] of b) {
      const y = a.get(k);
      const it = byIdent.get(x.n.identifier);
      if (!it || it.kind !== "derived" || x.depth === 0) continue;
      if (it.type === "money" || it.type === "rate" || it.type === "whole number") continue;
      if (JSON.stringify(y?.n.value) !== JSON.stringify(x.n.value)) out.push({ n: x.n, was: y ? y.n.value : undefined, depth: x.depth });
    }
    return out.sort((p, q) => q.depth - p.depth).slice(0, 8);
  }, [open, alt]);
  return (
    <div class="diffrow">
      <p>{who(d.pid)}: <ItemLink it={d.it} /> <ProgramTag id={outcomeProgram.get(d.it.identifier) ?? d.it.program} /><br /><span class="del">{fmtVal(d.before, d.it, who, true)}</span> → <span class="ins">{fmtVal(d.after, d.it, who, true)}</span> <button class="linkish" onClick={() => setOpen(!open)}>{open ? "hide the steps" : "which step changed?"}</button></p>
      {open && (steps.length ? (
        <ol class="flips">
          {steps.map((s) => <li>{s.n.person && s.n.person !== d.pid ? who(s.n.person) + ": " : ""}<ItemLink it={byIdent.get(s.n.identifier)!} /> went from <span class="del">{s.was === undefined ? "not reached" : fmtVal(s.was, byIdent.get(s.n.identifier), who)}</span> to <span class="ins">{fmtVal(s.n.value, byIdent.get(s.n.identifier), who)}</span></li>)}
        </ol>
      ) : <p class="small muted">No yes/no test changed: the amount moved a dollar figure straight through to this result.</p>)}
      {open && <p class="small muted">Listed from the test nearest the facts up to the result. Open “Why?” on the results tab for the full steps as stored.</p>}
    </div>
  );
}

/* ---------- what the case states ---------- */
function Facts({ c, who }: { c: HouseholdCase; who: (p: string) => string }) {
  const m = monthOf(c);
  const roleLabel = (r: string) => r.replace(/_/g, " ");
  return (
    <div>
      {(c.relationships ?? []).length > 0 && (
        <Fold open title="How they are related" count={`${c.relationships!.length} stated`}>
          <ul class="plain cols">{c.relationships!.map(([r, a, b]) => <li>{who(a)} is {/^(buys|shares|files|holds)/.test(r) ? "" : "the "}<b>{roleLabel(r)}</b> {/with$/.test(r) ? "" : "of "}{who(b)}</li>)}</ul>
        </Fold>
      )}
      {Object.entries(c.persons).map(([pid, p], i) => {
        const rows: Array<[string, unknown, string]> = [];
        for (const [k, v] of Object.entries(p.facts ?? {})) rows.push([k, v, ""]);
        for (const [k, v] of Object.entries(p.month_defaults ?? {})) rows.push([k, v, "every month"]);
        for (const [mm, rec] of Object.entries(p.months ?? {})) for (const [k, v] of Object.entries(rec)) rows.push([k, v, fmtDate(mm)]);
        return (
          <Fold open={i === 0} title={who(pid)} count={`${rows.length} facts stated`}>
            <table class="outs facts-t">
              <tbody>
                <More items={rows} n={40} noun="facts" render={([k, v, when]) => { const it = byIdent.get(k); return <tr><td>{it ? <ItemLink it={it} cls="plainlink" /> : k}{when && when !== fmtDate(m) && <span class="muted small"> · {when}</span>}</td><td><b>{fmtVal(v, it, who)}</b></td></tr>; }} />
              </tbody>
            </table>
          </Fold>
        );
      })}
      {c.parameters && <p class="small muted">This case also assumes a figure the State has not published: {Object.keys(c.parameters).map((k) => byIdent.get(k)?.name ?? k).join(", ")}.</p>}
    </div>
  );
}
