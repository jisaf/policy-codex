import "./walkthrough.css";
import { useSignal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import type { Engine } from "../../engine/engine";
import type { HouseholdCase } from "../../engine/cases";
import type { TraceNode } from "../../engine/explain";
import type { Item } from "../../engine/types";
import { caseToSpec } from "../../engine/cases";
import { entryLabel } from "../../changes/types";
import { refLabel } from "../../ledger/mode";
import type { Source } from "../../ledger/markdown";
import { PlainRule, noVersionReason } from "../Present";
import { formatDate, formatFor, personLabel } from "../present";
import { EXCERPT_KIND_LABEL, excerptKind, unverifiedIds, unverifiedInTrace } from "../provenance";
import { plainQuestionTitle } from "../questions";
import { buildHash, type Route } from "../router";
import {
  changeSetSig, draftEngine, draftsShown, engineSig, localInfoSig, navigate,
} from "../state";
import {
  BUDGET_ROLE_LABEL, budgetEffect, budgetMoney, budgetRows, budgetText, buildWalk, caseChanges, caseFocus,
  caseSummaries, defaultOutcome, defaultProgram, determinationDate, documentRows, documentsOwed, foldedBehind,
  isHouseholdOutcome, lineSources, overrideNotes, outcomeChoices, participationOutcome, personTitle, programLabel,
  recordedValue, takenLabel, unchangedCount, versionUsed, visibleSteps, type BudgetRow, type DocumentRow,
  type OutcomeChoice, type Walk, type WalkStep,
} from "../walkthrough";
import { viewContext, type ViewContext } from "./context";
import { NoLedger, ViewHeader } from "./ViewStub";

/** Case walkthrough. Route: `#/<volume>/walkthrough` (the case list, with
 *  `?program=` to filter it) and `#/<volume>/walkthrough/<case id>` with
 *  `?person=p1&program=SNAP&outcome=<identifier>&month=YYYY-MM&all=1`.
 *  A read-only step-through of the stored test households (`vol.cases`):
 *  each step is one rule's plain meaning (../Present.tsx `PlainRule`), the
 *  value the codex records for this household, the inputs it read, the
 *  excerpts it cites and, where it is unknown, what is missing. It takes no
 *  intake and recalculates nothing; "what changes" compares the same stored
 *  case under the rules in force and under the reader's staged drafts. */
export function WalkthroughView() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const hc = ctx.route.arg ? ctx.vol.cases.find((c) => c.id === ctx.route.arg) : undefined;
  return (
    <section class="view workflow walkthrough">
      <ViewHeader view="walkthrough" />
      {!ctx.route.arg && <CaseList ctx={ctx} />}
      {ctx.route.arg && !hc && (
        <p class="status bad">
          No stored household {ctx.route.arg} in this volume.{" "}
          <a href={buildHash({ ...ctx.route, arg: null, params: {} })}>All cases</a>
        </p>
      )}
      {hc && <CaseWalk ctx={ctx} hc={hc} />}
    </section>
  );
}

// ---- links

const itemHref = (r: Route, it: Pick<Item, "id">) => buildHash({ ...r, view: "item", arg: it.id, params: {} });
const sourceHref = (r: Route, s: string) => buildHash({ ...r, view: "source", arg: s, params: { excerpt: s } });
const questionHref = (r: Route, q: string) => buildHash({ ...r, view: "questions", arg: q, params: {} });

/** A citation without its web address: "7 CFR 273.9(b)(1)". */
export function citationText(citation: string): string {
  return citation.replace(/\(?https?:\/\/\S+\)?/g, "").replace(/\s+/g, " ").replace(/[\s.;,]+$/, "").trim();
}

function shortCitation(src: Source | undefined): string {
  if (!src) return "";
  const c = citationText(src.citation);
  return c.length > 70 ? c.slice(0, 67) + "…" : c;
}

function CiteLinks(
  { ctx, ids, unverified, max }:
  { ctx: ViewContext; ids: readonly string[]; unverified: ReadonlySet<string>; max?: number },
) {
  if (!ids.length) return null;
  const shown = max !== undefined ? ids.slice(0, max) : ids;
  const more = ids.length - shown.length;
  return (
    <>
      {shown.map((s, i) => {
        const src = ctx.vol.sources.find((x) => x.id === s);
        return (
          <span key={s}>
            {i > 0 && "; "}
            <a
              href={sourceHref(ctx.route, s)} data-cite={s}
              title={src ? `${src.title}: ${src.citation}` : s}
              class={unverified.has(s) ? "unverified" : undefined}
            >{shortCitation(src) || s}</a> <span class="code">{s}</span>
            {unverified.has(s) && <> <span class="flag unverified">unverified source</span></>}
          </span>
        );
      })}
      {more > 0 && <span class="small"> and {more} more</span>}
    </>
  );
}

function QuestionLinks({ ctx, ids }: { ctx: ViewContext; ids: readonly string[] }) {
  if (!ids.length) return null;
  return (
    <>
      {ids.map((q, i) => {
        const oq = ctx.vol.openQuestions.find((x) => x.id === q);
        return (
          <span key={q}>
            {i > 0 && "; "}
            <a href={questionHref(ctx.route, q)}>{oq ? plainQuestionTitle(oq.title) : q}</a>{" "}
            <span class="code">{q}</span>
          </span>
        );
      })}
    </>
  );
}

// ---- the case list

function CaseList({ ctx }: { ctx: ViewContext }) {
  const { engine, vol, route: r } = ctx;
  const all = useMemo(() => caseSummaries(engine, vol.cases, vol.casesText), [engine, vol]);
  const programs = [...new Set(all.flatMap((c) => c.programs))]
    .sort((a, b) => programLabel(a).localeCompare(programLabel(b)));
  const filter = r.params.program && programs.includes(r.params.program) ? r.params.program : "";
  const shown = filter ? all.filter((c) => c.programs.includes(filter)) : all;
  return (
    <div class="wk-list">
      <p>
        Choose a stored test household. These are the codex's own test cases, not real clients; every value
        below is what the codex records for them.
      </p>
      <div class="wk-pick">
        <label>
          <span class="lbl">Program</span>{" "}
          <select
            class="wk-program-filter" value={filter}
            onChange={(e) => {
              const v = (e.currentTarget as HTMLSelectElement).value;
              navigate({ params: v ? { program: v } : {} });
            }}
          >
            <option value="">All programs</option>
            {programs.map((p) => <option key={p} value={p}>{programLabel(p)}</option>)}
          </select>
        </label>
        <span class="small">{shown.length} of {all.length} households</span>
      </div>
      <ul class="wk-cases">
        {shown.map((c) => (
          <li key={c.id} data-case={c.id}>
            <a class="wk-case" href={buildHash({ ...r, arg: c.id, params: filter ? { program: filter } : {} })}>
              {c.title}
            </a>
            <span class="wk-meta small">
              {c.people} {c.people === 1 ? "person" : "people"} · as of {formatDate(c.asOf)} ·{" "}
              {c.programs.map(programLabel).join(", ")} · <span class="code">{c.id}</span>
              {c.round && <> · written for {c.round}</>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- one case

function CaseWalk({ ctx, hc }: { ctx: ViewContext; hc: HouseholdCase }) {
  const { engine, vol, route: r } = ctx;
  const summary = useMemo(
    () => caseSummaries(engine, [hc], vol.casesText)[0], [engine, hc, vol.casesText],
  );
  const persons = Object.keys(hc.persons ?? {});
  // The person and program the case is about, not the first ones (HCPF
  // analyst task 2: "a 68-year-old, CHP+").
  const focus = useMemo(() => caseFocus(engine, hc, summary.title), [engine, hc, summary.title]);
  const person = r.params.person && persons.includes(r.params.person) ? r.params.person : (focus.person ?? persons[0]);
  const programs = summary.programs;
  const program = r.params.program && programs.includes(r.params.program)
    ? r.params.program : (defaultProgram(engine, hc, person, focus.program) ?? programs[0]);
  const choices = useMemo(
    () => (program ? outcomeChoices(engine, hc, person, program) : []), [engine, hc, person, program],
  );
  const choice = choices.find((c) => c.identifier === r.params.outcome) ?? defaultOutcome(choices);
  const month = choice
    ? (choice.months.includes(r.params.month ?? "") ? r.params.month! : choice.months[0])
    : null;
  const paramsWith = (patch: Record<string, string | null>) => {
    const params: Record<string, string> = { ...r.params };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete params[k]; else params[k] = v;
    }
    return params;
  };
  const set = (patch: Record<string, string | null>) => navigate({ params: paramsWith(patch) });
  const local = localInfoSig.value;
  const commit = vol.sha ?? local?.head ?? null;

  return (
    <div class="wk-case-page" data-case={hc.id}>
      <p class="no-print">
        <a href={buildHash({ ...r, arg: null, params: r.params.program ? { program: r.params.program } : {} })}>
          ← All households
        </a>
      </p>
      <PrintHeader ctx={ctx} hc={hc} title={summary.title} person={person} choice={choice} month={month} commit={commit} />
      <h2>{summary.title}</h2>
      <p class="small">
        A stored test household, not a real client · {persons.length} {persons.length === 1 ? "person" : "people"} ·
        determined as of <b>{formatDate(hc.as_of)}</b> · <span class="code">{hc.id}</span>
        {summary.round && <> · written for {summary.round}</>}
        {" · "}ledger: {refLabel(vol.ref, local)}
        {commit && !refLabel(vol.ref, local).includes(commit.slice(0, 7)) && <> <span class="code">{commit.slice(0, 7)}</span></>}
      </p>
      {summary.notes.length > 0 && (
        <details class="wk-notes no-print">
          <summary>The case author's notes ({summary.notes.length})</summary>
          {summary.notes.map((n, i) => <p key={i}>{n}</p>)}
        </details>
      )}

      <div class="wk-pick no-print" role="group" aria-label="Person">
        <span class="lbl">Person</span>
        {persons.map((p) => (
          <a
            key={p} class={`chip${p === person ? " on" : ""}`} data-person={p} aria-current={p === person ? "true" : undefined}
            href={buildHash({ ...r, params: paramsWith({ person: p, outcome: null, month: null }) })}
            onClick={(e) => { e.preventDefault(); set({ person: p, outcome: null, month: null }); }}
          >{personTitle(hc, p)}</a>
        ))}
      </div>
      <div class="wk-pick no-print" role="group" aria-label="Program">
        <span class="lbl">Program</span>
        {programs.map((p) => (
          <a
            key={p} class={`chip${p === program ? " on" : ""}`} data-program={p} aria-current={p === program ? "true" : undefined}
            href={buildHash({ ...r, params: paramsWith({ program: p, outcome: null, month: null }) })}
            onClick={(e) => { e.preventDefault(); set({ program: p, outcome: null, month: null }); }}
          >{programLabel(p)}</a>
        ))}
      </div>
      {choices.length > 0 && choice && (
        <div class="wk-pick no-print">
          <label>
            <span class="lbl">Outcome</span>{" "}
            <select
              class="wk-outcome" value={choice.identifier}
              onChange={(e) => set({ outcome: (e.currentTarget as HTMLSelectElement).value, month: null })}
            >
              <OutcomeOptions choices={choices} />
            </select>
          </label>
          {choice.months.length > 1 && (
            <label>
              <span class="lbl">Month</span>{" "}
              <select class="wk-month" value={month ?? ""} onChange={(e) => set({ month: (e.currentTarget as HTMLSelectElement).value })}>
                {choice.months.map((m) => <option key={m ?? ""} value={m ?? ""}>{m ? formatDate(m) : "—"}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      {!choice && <p class="status">The codex records nothing for {personLabel(person)} in {programLabel(program ?? "")}.</p>}

      <DocumentsChecklist ctx={ctx} hc={hc} person={person} />

      {choice && program && (
        <OutcomeWalk
          key={`${hc.id}|${person}|${choice.identifier}|${month ?? ""}`}
          ctx={ctx} hc={hc} person={person} program={program} choice={choice} month={month}
          showAll={r.params.all === "1"} setShowAll={(v) => set({ all: v ? "1" : null })}
        />
      )}
    </div>
  );
}

const GROUP_LABEL: Record<OutcomeChoice["group"], string> = {
  person: "This person's own result",
  result: "Program results",
  documents: "Documents and verification",
  recorded: "Also recorded in this case",
};

function OutcomeOptions({ choices }: { choices: readonly OutcomeChoice[] }) {
  const groups = (["person", "result", "recorded", "documents"] as const)
    .map((g) => ({ g, cs: choices.filter((c) => c.group === g) }))
    .filter((x) => x.cs.length);
  return (
    <>
      {groups.map(({ g, cs }) => (
        <optgroup key={g} label={GROUP_LABEL[g]}>
          {cs.map((c) => <option key={c.identifier} value={c.identifier}>{c.item.name}</option>)}
        </optgroup>
      ))}
    </>
  );
}

function PrintHeader(
  { ctx, hc, title, person, choice, month, commit }:
  { ctx: ViewContext; hc: HouseholdCase; title: string; person: string; choice: OutcomeChoice | null; month: string | null; commit: string | null },
) {
  return (
    <div class="print-only wk-printhead">
      <p><b>Case walkthrough for an appeal file</b> · printed {formatDate(ctx.today)}</p>
      <p>
        Stored test household {hc.id}: {title}. Person: {personTitle(hc, person)}.
        {choice && <> Outcome: {choice.item.name}{month ? `, ${formatDate(month)}` : ""}.</>}
      </p>
      <p>
        Determination date (as of): {formatDate(hc.as_of)}. Ledger: {ctx.vol.title}, {refLabel(ctx.vol.ref, localInfoSig.value)},
        commit {commit ?? "not known (uncommitted working tree)"}{localInfoSig.value?.dirty ? ", with uncommitted edits" : ""}.
        {draftsShown() && changeSetSig.value.entries.length > 0 && " This print includes staged draft changes that are not the rules in force."}
      </p>
    </div>
  );
}

// ---- one outcome

const valueOf = (engine: Engine, n: Pick<TraceNode, "identifier" | "value">) => formatFor(engine, n.identifier, n.value);

function OutcomeWalk(
  { ctx, hc, person, program, choice, month, showAll, setShowAll }:
  {
    ctx: ViewContext; hc: HouseholdCase; person: string; program: string; choice: OutcomeChoice;
    month: string | null; showAll: boolean; setShowAll: (v: boolean) => void;
  },
) {
  const { engine, vol } = ctx;
  const open = useSignal<Set<number>>(new Set());
  const printing = useSignal(false);
  const walk = useMemo(
    () => buildWalk(engine.explain(caseToSpec(hc), choice.identifier, person, month)),
    [engine, hc, choice.identifier, person, month],
  );
  const unverified = useMemo(() => unverifiedIds(vol.sources), [vol.sources]);
  useEffect(() => {
    const before = () => { printing.value = true; };
    const after = () => { printing.value = false; };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  const everything = showAll || printing.value;
  const visible = visibleSteps(walk, everything, open.value);
  const folded = foldedBehind(walk, visible);
  const hiddenUnchanged = unchangedCount(walk);
  const root = walk.root;
  const expected = hc.expect?.[person]?.[choice.identifier];
  const expectedValue = expected && typeof expected === "object" && !Array.isArray(expected) && month
    ? (expected as Record<string, unknown>)[month] : expected;

  const goStep = (n: number) => {
    if (!visible.some((s) => s.n === n)) setShowAll(true);
    setTimeout(() => {
      const el = document.getElementById(`step-${n}`);
      if (el) { el.scrollIntoView({ block: "center" }); (el as HTMLElement).focus({ preventScroll: true }); }
    }, 30);
  };

  const budget = useMemo(
    () => budgetRows(engine, walk, { effect: budgetEffect(engine, hc) }), [engine, walk, hc],
  );
  const det = determinationDate(hc);
  const overrides = overrideNotes(walk);
  const unverifiedSteps = unverifiedInTrace(walk.root, unverified);
  return (
    <div class="wk-outcome-walk" data-outcome={choice.identifier}>
      <Participation ctx={ctx} hc={hc} person={person} program={program} choice={choice} month={month} />

      <div class={`wk-answer${root.value === null ? " unknown" : ""}`}>
        <div>
          {personLabel(person)}: {choice.item.name}{month ? ` (${formatDate(month)})` : ""}
        </div>
        <div class="big" data-value>{valueOf(engine, root)}</div>
        {expected !== undefined && expectedValue !== "unknown" && formatFor(engine, choice.identifier, expectedValue) !== valueOf(engine, root) && (
          <p class="bad">The case author expected {formatFor(engine, choice.identifier, expectedValue)}; the codex records {valueOf(engine, root)}.</p>
        )}
        {walk.why && (
          <p class="wk-why">
            <span class="whybadge">This is why</span>{" "}
            {walk.why.n === 1
              ? <>{root.value === null
                ? "the rule could not be worked out: see step 1."
                : budget.length > 0
                  ? "the computation itself: see the budget below and step 1."
                  : "every condition of the rule, read together: see step 1 below."}</>
              : (
                <>
                  step {walk.why.n}:{" "}
                  {walk.why.node.person && walk.why.node.person !== person && <>{personLabel(walk.why.node.person)}: </>}
                  <b>{walk.why.node.name}</b> is <b>{valueOf(engine, walk.why.node)}</b>.{" "}
                  <WhyTest ctx={ctx} walk={walk} person={person} />
                  <button type="button" class="linkish no-print" onClick={() => goStep(walk.why!.n)}>Go to step {walk.why.n}</button>
                </>
              )}
          </p>
        )}
        {root.value === null && (walk.missing.length > 0 || walk.noFigure.length > 0) && (
          <ul class="wk-flags">
            {walk.missing.length > 0 && (
              <li>
                Unknown because the case does not give:{" "}
                {walk.missing.map((m, i) => (
                  <span key={m.identifier}>{i > 0 && "; "}<FactName ctx={ctx} node={m} person={person} /></span>
                ))}.
              </li>
            )}
            {walk.noFigure.map((m) => <li key={m.identifier}><NoFigure ctx={ctx} node={m} asOf={hc.as_of} /></li>)}
          </ul>
        )}
        {(overrides.length > 0 || unverifiedSteps.length > 0) && (
          <ul class="wk-flags">
            {overrides.map((o) => (
              <li key={o.text} data-override={o.item}>
                <span class="flag override">Statute over rule</span>{" "}
                {o.steps.length === 1 ? "step" : "steps"} {o.steps.join(", ")}: {o.text}
                {o.via.length > 2 && (
                  <span class="small via">
                    {" "}Why it bears on this result: the result reads {o.via.slice(-3, -1).join(", which reads ")}, which reads{" "}
                    <b>{o.via[o.via.length - 1]}</b>.
                  </span>
                )}
              </li>
            ))}
            {unverifiedSteps.length > 0 && (
              <li>
                <span class="flag unverified">Unverified source</span> This result rests on{" "}
                {unverifiedSteps.length === 1 ? "a rule or figure" : `${unverifiedSteps.length} rules or figures`} citing
                an excerpt that is not a verified quotation:{" "}
                {unverifiedSteps.map((u, i) => {
                  const it = ctx.engine.item(u.identifier);
                  return (
                    <span key={u.identifier}>
                      {i > 0 && "; "}
                      {it ? <a href={itemHref(ctx.route, it)}>{u.name}</a> : u.name}{" "}
                      ({u.sources.map((s) => <a key={s} href={sourceHref(ctx.route, s)}>{s}</a>)})
                    </span>
                  );
                })}.
              </li>
            )}
          </ul>
        )}
      </div>

      <WhatChanges ctx={ctx} hc={hc} person={person} identifier={choice.identifier} month={month} />

      {budget.length > 0 && <Budget ctx={ctx} rows={budget} goStep={goStep} unverified={unverified} person={person} det={det} />}

      <h3>Step by step</h3>
      <div class="wk-stepbar no-print">
        <button
          type="button" class="btn wk-showall" aria-pressed={showAll}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show only the steps that changed the answer" : `Show all ${walk.steps.length} steps`}
        </button>
        <span class="small">
          {visible.length} of {walk.steps.length} steps shown
          {!everything && hiddenUnchanged > 0 && <> · {hiddenUnchanged} did not change the answer</>}
        </span>
        <button
          type="button" class="btn wk-print"
          onClick={() => {
            printing.value = true;
            setTimeout(() => {
              if (typeof window.print === "function") window.print();
              printing.value = false;
            }, 60);
          }}
        >Print for an appeal file</button>
      </div>
      <ol class="stepper">
        {visible.map((s) => (
          <Step
            key={s.n} ctx={ctx} hc={hc} s={s} person={person} unverified={unverified} goStep={goStep}
            folded={everything ? 0 : folded.get(s.n) ?? 0}
            onUnfold={() => { const next = new Set(open.value); next.add(s.n); open.value = next; }}
          />
        ))}
      </ol>

      <h3>Rule text this walkthrough cites</h3>
      {walk.sources.length === 0
        ? <p class="small">No step cites an excerpt.</p>
        : (
          <ol class="wk-citations">
            {walk.sources.map((sid) => {
              const src = vol.sources.find((x) => x.id === sid);
              return (
                <li key={sid}>
                  <a href={sourceHref(ctx.route, sid)}>{src ? citationText(src.citation) : sid}</a> <span class="code">{sid}</span>
                  {src && <span class="small"> · {EXCERPT_KIND_LABEL[excerptKind(src, vol.documents)]}{src.title ? `: ${src.title}` : ""}</span>}
                  {unverified.has(sid) && <> <span class="flag unverified">unverified source</span></>}
                </li>
              );
            })}
          </ol>
        )}
    </div>
  );
}

/** For a program that decides a household, this person's own place in it,
 *  first, so a household result is never read as the person's. */
function Participation(
  { ctx, hc, person, program, choice, month }:
  { ctx: ViewContext; hc: HouseholdCase; person: string; program: string; choice: OutcomeChoice; month: string | null },
) {
  const { engine } = ctx;
  const part = participationOutcome(engine, program);
  if (!part) return null;
  const it = engine.item(part)!;
  const m = it.scope === "person-month" ? (month ?? hc.as_of.slice(0, 7)) : null;
  const v = recordedValue(engine, hc, part, person, m);
  const household = isHouseholdOutcome(engine, choice.identifier);
  const hv = household ? recordedValue(engine, hc, choice.identifier, person, month) : null;
  const householdDenied = typeof hv === "string" && /^(?:not_eligible|ineligible|denied)/.test(hv);
  // A member of a unit that is denied is not shown in green above the denial
  // (county supervisor, new task).
  const isMember = typeof v === "string" && /^eligible/.test(v) && !householdDenied;
  return (
    <div class={`wk-person${isMember ? "" : " not"}`} data-participation={typeof v === "string" ? v : ""}>
      <b>{personLabel(person)}'s own place in {programLabel(program)}:</b> {formatFor(engine, part, v)}
      {householdDenied && <> (a member of the unit; <b>the unit is {formatFor(engine, choice.identifier, hv)}</b>, so nobody is paid)</>}{" "}
      <a class="small" href={itemHref(ctx.route, it)}>({it.name})</a>
      {household && (
        <p class="wk-household">
          The outcome below is the household's result. It is reported on every member, including members who
          are not eligible themselves; read this person's own result above.
        </p>
      )}
    </div>
  );
}

/** The test a decided result turned on, in one line: "It compared countable
 *  income $410.00 with the need standard $331.00" (county supervisor: the
 *  summary named one input, not the comparison). */
function WhyTest({ ctx, walk, person }: { ctx: ViewContext; walk: Walk; person: string }) {
  const why = walk.why;
  if (!why || why.parent === null) return null;
  const parent = walk.steps[why.parent - 1];
  if (typeof parent.node.value === "number") return null;
  const shown = parent.inputs.filter((i) => i.mattered && i.node.value !== null).slice(0, 4);
  if (shown.length < 2) return null;
  return (
    <span class="wk-test">
      Step {parent.n}, <b>{parent.node.name}</b> ({valueOf(ctx.engine, parent.node)}), compared:{" "}
      {shown.map((i, k) => (
        <span key={i.node.key}>
          {k > 0 && "; "}
          {i.node.person && i.node.person !== person && <>{personLabel(i.node.person)}'s </>}
          {i.node.name} <b>{valueOf(ctx.engine, i.node)}</b>
        </span>
      ))}.{" "}
    </span>
  );
}

/** A figure's dated period, and a warning when its source is dated after the
 *  determination (Legal task 5: the ABAWD age 64 rests on a rule published
 *  five weeks after the determination). */
function FigureVersion({ ctx, node, hc }: { ctx: ViewContext; node: TraceNode; hc: HouseholdCase }) {
  if (node.kind !== "parameter") return null;
  const det = determinationDate(hc);
  const v = versionUsed(ctx.engine, node, det);
  if (!v) return null;
  const src = v.source ? ctx.vol.sources.find((x) => x.id === v.source) : undefined;
  const doc = src?.document ? ctx.vol.documents.find((d) => d.id === src.document) : undefined;
  const late = doc?.date && doc.date > det ? doc.date : null;
  return (
    <span class="figversion">
      {" "}· in force from {formatDate(v.from)}{v.to ? ` to ${formatDate(v.to)}` : ""}
      {v.source && <> ({v.source})</>}
      {late && <> · <span class="flag postdated">source dated {formatDate(late)}, after this determination ({formatDate(det)})</span></>}
    </span>
  );
}

function FactName({ ctx, node, person }: { ctx: ViewContext; node: TraceNode; person: string }) {
  const it = ctx.engine.item(node.identifier);
  const who = node.person && node.person !== person ? `${personLabel(node.person)}: ` : "";
  return it
    ? <a href={itemHref(ctx.route, it)}>{who}{it.name}</a>
    : <span>{who}{node.name}</span>;
}

function NoFigure({ ctx, node, asOf }: { ctx: ViewContext; node: TraceNode; asOf: string }) {
  const it = ctx.engine.item(node.identifier);
  const reason = it ? noVersionReason(it, asOf) : null;
  return (
    <span>
      No figure in force for <FactName ctx={ctx} node={node} person="" /> on {formatDate(asOf)}.
      {reason && <> {reason.replace(/; see [^.]*\./, ".")}</>}
      {it?.open?.length ? <> Open question: <QuestionLinks ctx={ctx} ids={it.open} />.</> : null}
    </span>
  );
}

const ORIGIN_WORDS: Record<string, string> = {
  case: "given in the case", default: "given for every month", parameter: "policy figure",
  missing: "not given", "not-in-force": "not in force on this date", "no-version": "no figure in force",
};

function Step(
  { ctx, hc, s, person, unverified, goStep, folded, onUnfold }:
  {
    ctx: ViewContext; hc: HouseholdCase; s: WalkStep; person: string; unverified: ReadonlySet<string>;
    goStep: (n: number) => void; folded: number; onUnfold: () => void;
  },
) {
  const { engine, route: r } = ctx;
  const it = engine.item(s.node.identifier);
  const n = s.node;
  const flagged = n.sources.some((x) => unverified.has(x));
  const inputs = s.inputs;
  const cls = ["step", s.why ? "why" : "", s.stopped ? "stopped" : "", s.mattered || s.why || s.n === 1 ? "" : "unchanged"]
    .filter(Boolean).join(" ");
  return (
    <li class={cls} id={`step-${s.n}`} data-n={s.n} tabIndex={-1} style={{ "--d": Math.min(s.depth, 6) }}>
      <div class="stephead">
        {s.why && <span class="whybadge">This is why</span>}
        {n.person && n.person !== person && <span class="who small">{personLabel(n.person)}:</span>}
        {it ? <a class="sname" href={itemHref(r, it)}>{n.name}</a> : <span class="sname">{n.name}</span>}
        {n.month && <span class="small">{formatDate(n.month)}</span>}
        <span>is</span> <span class="val">{valueOf(engine, n)}</span>
        {n.override && <span class="flag override" title={n.override}>statute over rule</span>}
        {flagged && <span class="flag unverified" title="cites an excerpt that is not a verified quotation">unverified source</span>}
      </div>
      {it && <PlainRule engine={engine} item={it} asOf={hc.as_of} />}
      {n.override && <p class="small"><span class="flag override">Statute over rule</span> {n.override}</p>}
      {n.error !== undefined && <p class="bad">{n.error}</p>}
      {n.warnings?.map((w) => <p key={w} class="stopnote">{w}</p>)}
      {s.missing.length > 0 && (
        <p class="stopnote">
          <b>Unknown here:</b> the case does not give{" "}
          {s.missing.map((m, i) => <span key={m.key}>{i > 0 && "; "}<FactName ctx={ctx} node={m} person={person} /></span>)}.
        </p>
      )}
      {s.noFigure.map((m) => <p key={m.key} class="stopnote"><NoFigure ctx={ctx} node={m} asOf={hc.as_of} /></p>)}
      {inputs.length > 0 && (
        <div class="inputs">
          <span class="small">It used:</span>
          <ul>
            {inputs.map((i) => (
              <li key={i.node.key} class={i.mattered || !s.mattered ? undefined : "notmatter"}>
                {i.node.person && i.node.person !== person && <>{personLabel(i.node.person)}: </>}
                {i.step !== null
                  ? <button type="button" class="linkish" onClick={() => goStep(i.step!)}>{i.node.name}</button>
                  : <FactName ctx={ctx} node={i.node} person={i.node.person ?? ""} />}
                {i.node.month && <> ({formatDate(i.node.month)})</>}
                {" "}<b>{valueOf(engine, i.node)}</b>{" "}
                <span class="small">
                  {i.step !== null ? `step ${i.step}` : ORIGIN_WORDS[i.node.origin] ?? i.node.origin}
                  {i.step === null && <FigureVersion ctx={ctx} node={i.node} hc={hc} />}
                  {i.step === null && i.node.sources.some((x) => unverified.has(x)) && <> · <span class="flag unverified">unverified source</span></>}
                  {i.node.value === null && !i.mattered && s.node.value !== null && <> · did not matter here</>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {n.sources.length > 0 && (
        <p class="cites"><span class="small">Rule text: </span><CiteLinks ctx={ctx} ids={n.sources} unverified={unverified} /></p>
      )}
      {it?.open?.length ? <p class="oqs"><span class="small">Open question: </span><QuestionLinks ctx={ctx} ids={it.open} /></p> : null}
      {folded > 0 && (
        <button type="button" class="linkish wk-folded no-print" onClick={onUnfold}>
          Show the {folded} step{folded === 1 ? "" : "s"} behind this one
        </button>
      )}
    </li>
  );
}

// ---- budget

function Budget(
  { ctx, rows, goStep, unverified, person, det }:
  { ctx: ViewContext; rows: BudgetRow[]; goStep: (n: number) => void; unverified: ReadonlySet<string>; person: string; det: string },
) {
  const { engine, vol } = ctx;
  const copied = useSignal<"" | "done" | "manual">("");
  const money = (n: Pick<TraceNode, "identifier" | "value">) => budgetMoney(n.value, () => valueOf(engine, n));
  const sourcesOf = (n: TraceNode) => lineSources(engine, n, det);
  const cite = (s: string) => {
    const src = vol.sources.find((x) => x.id === s);
    return src ? `${citationText(src.citation)} (${s})` : s;
  };
  const text = budgetText(rows.map((r) => ({ ...r, node: { ...r.node, sources: sourcesOf(r.node) } })), money, cite);
  return (
    <div class="wk-budget-block">
      <h3>The budget</h3>
      <p class="small">
        Each dollar figure the result rests on, in the order the codex works it out, with every amount a rule takes
        off on the way. A figure that changed nothing for this household is left out. Each line cites the rule text
        in force on {formatDate(det)}. Copy it into a handout or a spreadsheet.
      </p>
      <div class="wk-tablewrap">
        <table class="wk-budget">
          <thead><tr><th>Line</th><th>What it is</th><th>Amount</th><th>Rule text</th></tr></thead>
          <tbody>
            {rows.map((r) => r.taken
              ? (
                <tr key={`taken-${r.node.key}${r.node.month}`} class="role-deduction taken">
                  <td>
                    {r.node.person && r.node.person !== person && <span class="small">{personLabel(r.node.person)}: </span>}
                    {takenLabel(r)}
                    {r.taken.figures.length > 0 && (
                      <span class="small"> (using {r.taken.figures.map((f) => {
                        const it = engine.item(f.identifier);
                        const v = typeof f.value === "number" ? ` ${valueOf(engine, f)}` : "";
                        return it ? `${it.name}${v}` : f.name;
                      }).join("; ")})</span>
                    )}
                  </td>
                  <td class="role">{BUDGET_ROLE_LABEL.deduction}</td>
                  <td class="amt">-{money({ identifier: r.node.identifier, value: r.taken.amount })}</td>
                  <td class="small">
                    {r.step !== null && <button type="button" class="linkish" onClick={() => goStep(r.step!)}>step {r.step}</button>}
                  </td>
                </tr>
              )
              : (
              <tr key={r.node.key + r.node.month} class={`role-${r.role}${r.role === "result" ? " result" : ""}`}>
                <td>
                  {r.node.person && r.node.person !== person && <span class="small">{personLabel(r.node.person)}: </span>}
                  {r.step !== null
                    ? <button type="button" class="linkish" onClick={() => goStep(r.step!)}>{r.node.name}</button>
                    : <FactName ctx={ctx} node={r.node} person={r.node.person ?? ""} />}
                </td>
                <td class="role">{BUDGET_ROLE_LABEL[r.role]}</td>
                <td class="amt">{money(r.node)}</td>
                <td class="small"><CiteLinks ctx={ctx} ids={sourcesOf(r.node)} unverified={unverified} max={1} /></td>
              </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p class="no-print">
        <button
          type="button" class="btn wk-copy-budget"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              copied.value = "done";
            } catch {
              copied.value = "manual";
            }
          }}
        >Copy the budget</button>{" "}
        {copied.value === "done" && <span class="small" role="status">Copied, one line per row, tab-separated.</span>}
      </p>
      {copied.value === "manual" && (
        <div class="wk-copy no-print">
          <p class="small">Select the text and copy it:</p>
          <textarea readOnly value={text} onFocus={(e) => (e.currentTarget as HTMLTextAreaElement).select()} />
        </div>
      )}
    </div>
  );
}

// ---- what changes

function WhatChanges(
  { ctx, hc, person, identifier, month }:
  { ctx: ViewContext; hc: HouseholdCase; person: string; identifier: string; month: string | null },
) {
  const cs = changeSetSig.value;
  const base = engineSig.value;
  const draft = draftEngine();
  const rows = useMemo(
    () => (cs.entries.length && base && draft && base !== draft
      ? caseChanges(base, draft, hc, [{ identifier, person, month }]) : null),
    [cs, base, draft, hc, identifier, person, month],
  );
  if (!cs.entries.length || !base || !draft) return null;
  const { engine } = ctx;
  return (
    <div class="wk-changes-panel" data-changes={rows?.length ?? 0}>
      <h3>What changes with your drafts</h3>
      <p class="small">
        The same stored household under the rules in force and under the {cs.entries.length} draft
        change{cs.entries.length === 1 ? "" : "s"} staged in this browser ({cs.entries.map(entryLabel).join("; ")}).
        Nothing is recalculated from new facts. {draftsShown()
          ? "The steps below include your drafts."
          : "The steps below show the rules in force."}
      </p>
      {rows && rows.length === 0 && <p>None of this household's outcomes change.</p>}
      {rows && rows.length > 0 && (
        <div class="wk-tablewrap">
          <table class="wk-changes">
            <thead><tr><th>Person</th><th>Outcome</th><th>Rules in force</th><th>With your drafts</th></tr></thead>
            <tbody>
              {rows.map((c) => {
                const it = engine.item(c.identifier);
                const sel = c.identifier === identifier && c.person === person && (c.month ?? null) === (month ?? null);
                return (
                  <tr key={`${c.person}|${c.identifier}|${c.month ?? ""}`} class={sel ? "selected" : undefined}>
                    <td>{personLabel(c.person)}</td>
                    <td>{it ? <a href={itemHref(ctx.route, it)}>{it.name}</a> : c.identifier}{c.month && <span class="small"> {formatDate(c.month)}</span>}</td>
                    <td>{formatFor(engine, c.identifier, c.before)}</td>
                    <td><b>{formatFor(engine, c.identifier, c.after)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- documents

function DocumentsChecklist({ ctx, hc, person }: { ctx: ViewContext; hc: HouseholdCase; person: string }) {
  const { engine } = ctx;
  const docs = useMemo(() => documentsOwed(engine, hc), [engine, hc]);
  const ticked = useSignal<Set<string>>(new Set());
  const owed = docs.filter((d) => d.applies);
  const notOwed = docs.filter((d) => !d.applies);
  // One row per document; mine first, then the rest of the household.
  const order = (d: DocumentRow) => (d.person === person ? 0 : 1);
  const rows = documentRows(owed).sort((a, b) => order(a) - order(b) || a.person.localeCompare(b.person));
  return (
    <details class="wk-docs-block" open={rows.length > 0}>
      <summary>
        <h3>Documents still needed {rows.length > 0 ? `(${rows.length})` : ""}</h3>
      </summary>
      <p class="small">
        Every verification the codex records as pending for this household on {formatDate(hc.as_of)}: one row per
        document, with each program it is owed for and the date that governs it. The ticks are for your own reading
        and are not saved.
      </p>
      {rows.length === 0
        ? <p>Nothing is pending for anyone in this household.</p>
        : (
          <div class="wk-tablewrap">
            <table class="wk-docs">
              <thead><tr><th>Document</th><th>For whom</th><th>Programs and due dates</th></tr></thead>
              <tbody>
                {rows.map((d) => {
                  const key = `${d.person}|${d.document}`;
                  return (
                    <tr key={key} data-doc={d.programs[0].identifier} data-person={d.person} data-programs={d.programs.map((p) => p.program).join(" ")}>
                      <td>
                        <label>
                          <input
                            type="checkbox" checked={ticked.value.has(key)}
                            onChange={() => {
                              const next = new Set(ticked.value);
                              if (next.has(key)) next.delete(key); else next.add(key);
                              ticked.value = next;
                            }}
                          />
                          {d.document}
                        </label>
                      </td>
                      <td>{personTitle(hc, d.person)}</td>
                      <td>
                        <ul class="dueprograms">
                          {d.programs.map((p) => {
                            const it = engine.item(p.identifier);
                            const dueIt = p.dueIdentifier ? engine.item(p.dueIdentifier) : undefined;
                            const past = p.due !== null && p.due < hc.as_of;
                            const pastToday = p.due !== null && p.due < ctx.today;
                            return (
                              <li key={p.program} data-program={p.program}>
                                {it ? <a href={itemHref(ctx.route, it)}>{programLabel(p.program)}</a> : programLabel(p.program)}:{" "}
                                {p.due
                                  ? dueIt ? <a href={itemHref(ctx.route, dueIt)} title={dueIt.name}><b>{formatDate(p.due)}</b></a> : <b>{formatDate(p.due)}</b>
                                  : <span class="small">no due date in the codex</span>}
                                {past && <> <span class="pastdue">past due on the case date</span></>}
                                {!past && pastToday && <> <span class="small">(before today, {formatDate(ctx.today)})</span></>}
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      {notOwed.length > 0 && (
        <details class="no-print">
          <summary class="small">
            {notOwed.length} pending flag{notOwed.length === 1 ? "" : "s"} for programs that do not apply to the person (nothing is owed)
          </summary>
          <ul class="small">
            {notOwed.map((d) => (
              <li key={`${d.person}|${d.identifier}`}>
                {personTitle(hc, d.person)}: {d.document} for {programLabel(d.program)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </details>
  );
}
