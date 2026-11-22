/* A household's determination: `households/<case>/<person>/<outcome>`
 * (docs/design-unified-ui.md, "Determination"). Top down: a sentence a
 * worker could read to the client, the result, "Why, in short", the budget
 * for a money result, then every step with "This is why", statute-over-rule
 * banners and the as-of date, and two prints (a training handout at a
 * chosen depth, an appeal file). `?month=` picks a month, `?all=1` shows
 * every step, `?asof=` re-reads the stored household with the rules in force
 * on another date, `?program=` picks the program when the address names no
 * outcome. Nothing is taken from intake: every value is the stored
 * household's (or, with `?asof=`, the same household on another date). */
import { useSignal } from "@preact/signals";
import { useEffect, useMemo } from "preact/hooks";
import type { Engine } from "../../engine/engine";
import { caseToSpec, type HouseholdCase } from "../../engine/cases";
import { missingFacts, type TraceNode } from "../../engine/explain";
import type { Item } from "../../engine/types";
import { entryLabel } from "../../changes/types";
import { refLabel } from "../../ledger/mode";
import type { Source } from "../../ledger/markdown";
import { questionsBehind } from "../aidcodes";
import { clientSentence, decidingComparison, householdPeople, personName, whyInShort, type PersonInfo } from "../households";
import { mapHref } from "../map/MapView";
import { PlainRule, noVersionReason } from "../Present";
import { formatDate, formatFor, personLabel } from "../present";
import { EXCERPT_KIND_LABEL, excerptKind, unverifiedIds, unverifiedInTrace } from "../provenance";
import { plainQuestionTitle } from "../questions";
import { argParts, buildHash, type Route } from "../router";
import { changeSetSig, draftEngine, draftsShown, engineSig, localInfoSig, navigate } from "../state";
import {
  BUDGET_ROLE_LABEL, budgetEffect, budgetMoney, budgetRows, budgetText, buildWalk, caseChanges, caseFocus,
  defaultOutcome, defaultProgram, determinationDate, foldedBehind, isHouseholdOutcome, lineSources, outcomeChoices,
  overrideNotes, participationOutcome, plainCaseTitle, programLabel, recordedValue, takenLabel, unchangedCount,
  versionUsed, visibleSteps, type BudgetRow, type OutcomeChoice, type Walk, type WalkStep,
} from "../walkthrough";
import { viewContext, type ViewContext } from "../views/context";
import { excerptHref, itemHref, questionHref } from "../views/parts";
import { NoLedger } from "../views/ViewStub";
import { programsOfCase } from "../../engine/cases";
import "../views/walkthrough.css";
import "./households.css";

/** The determination of one person's result: the canonical address. */
export function determinationHref(
  r: Route, caseId: string, person: string, outcome: string | null, params: Record<string, string> = {},
): string {
  return buildHash({ ...r, view: "households", arg: [caseId, person, outcome].filter(Boolean).join("/"), params });
}

/** A citation without its web address: "7 CFR 273.9(b)(1)". */
export function citationText(citation: string): string {
  return citation.replace(/\(?https?:\/\/\S+\)?/g, "").replace(/\s+/g, " ").replace(/[\s.;,]+$/, "").trim();
}

function shortCitation(src: Source | undefined): string {
  if (!src) return "";
  const c = citationText(src.citation);
  return c.length > 70 ? c.slice(0, 67) + "…" : c;
}

/** How deep a training handout goes: the main steps, two or three levels,
 *  or every step. */
export const TRAINING_DEPTHS = [
  { depth: 1, label: "the main steps" },
  { depth: 2, label: "two levels" },
  { depth: 3, label: "three levels" },
  { depth: 99, label: "every step" },
] as const;

/** The steps a training handout prints: those that changed the answer, down
 *  to `depth` levels below the result. */
export function trainingSteps(walk: Walk, depth: number): WalkStep[] {
  return walk.steps.filter((s) => (s.mattered || s.why || s.n === 1) && s.depth <= depth);
}

type PrintMode = "training" | "appeal" | null;

export function DeterminationPage() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const [caseId, person] = argParts(ctx.route);
  const stored = ctx.vol.cases.find((c) => c.id === caseId);
  if (!stored || !stored.persons[person]) {
    return (
      <section class="view place household determination">
        <p class="status bad">
          No stored household {caseId}{stored ? ` with a ${personLabel(person)}` : ""} in this volume.{" "}
          <a href={buildHash({ ...ctx.route, view: "households", arg: stored ? caseId : null, params: {} })}>
            {stored ? "Back to the household" : "All households"}
          </a>
        </p>
      </section>
    );
  }
  return <Determination ctx={ctx} stored={stored} person={person} />;
}

const valueOf = (engine: Engine, n: Pick<TraceNode, "identifier" | "value">) => formatFor(engine, n.identifier, n.value);

function Determination({ ctx, stored, person }: { ctx: ViewContext; stored: HouseholdCase; person: string }) {
  const { engine, vol, route: r } = ctx;
  const asof = /^\d{4}-\d{2}-\d{2}$/.test(r.params.asof ?? "") && r.params.asof !== stored.as_of ? r.params.asof! : null;
  const hc = useMemo(() => (asof ? { ...stored, as_of: asof } : stored), [stored, asof]);
  const people = useMemo(() => householdPeople(stored, vol.casesText), [stored, vol.casesText]);
  const me = people.find((p) => p.id === person)!;
  const title = plainCaseTitle(stored.title).title;
  const programs = programsOfCase(engine.index, stored).filter((p) => p !== "All");
  const named = argParts(r)[2] ? engine.item(argParts(r)[2]) : undefined;
  const focus = useMemo(() => caseFocus(engine, stored, title), [engine, stored, title]);
  const program = named?.program && named.program !== "All" ? named.program
    : r.params.program && programs.includes(r.params.program) ? r.params.program
      : defaultProgram(engine, stored, person, focus.program) ?? programs[0] ?? "";
  const choices = useMemo(() => outcomeChoices(engine, hc, person, program), [engine, hc, person, program]);
  const choice = (named && choices.find((c) => c.identifier === named.identifier)) ?? defaultOutcome(choices);
  const month = choice ? (choice.months.includes(r.params.month ?? "") ? r.params.month! : choice.months[0]) : null;
  const go = (p: string, outcome: string | null, extra: Record<string, string | null> = {}) => {
    const params: Record<string, string> = {};
    if (asof) params.asof = asof;
    if (!outcome && p && program) params.program = program;
    for (const [k, v] of Object.entries(extra)) if (v !== null) params[k] = v; else delete params[k];
    navigate({ view: "households", arg: [stored.id, p, outcome].filter(Boolean).join("/"), params });
  };

  return (
    <section class="view place household determination walkthrough" data-case={stored.id} data-person={person} data-outcome={choice?.identifier ?? ""}>
      <p class="eyebrow">
        Determination · <a href={buildHash({ ...r, arg: stored.id, params: {} })}>{stored.id}</a>{" "}
        <span class="small">{title}</span>
      </p>
      <h1>
        <span class="pid">{person}</span> {me.short}
        {choice && <><span class="sep"> · </span>{choice.item.name}</>}
      </h1>
      {me.rest && <p class="small personnote">{me.rest}</p>}

      <form class="detpick no-print" aria-label="Choose another person or result" onSubmit={(e) => e.preventDefault()}>
        <label>
          <span class="lbl">Person</span>
          <select class="det-person" value={person} onChange={(e) => go((e.currentTarget as HTMLSelectElement).value, null, { program })}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.id} {p.short}</option>)}
          </select>
        </label>
        <label>
          <span class="lbl">Program</span>
          <select class="det-program" value={program} onChange={(e) => go(person, null, { program: (e.currentTarget as HTMLSelectElement).value })}>
            {programs.map((p) => <option key={p} value={p}>{programLabel(p)}</option>)}
          </select>
        </label>
        {choices.length > 0 && choice && (
          <label>
            <span class="lbl">Result</span>
            <select class="det-outcome wk-outcome" value={choice.identifier} onChange={(e) => go(person, (e.currentTarget as HTMLSelectElement).value)}>
              <OutcomeOptions choices={choices} />
            </select>
          </label>
        )}
        {choice && choice.months.length > 1 && (
          <label>
            <span class="lbl">Month</span>
            <select class="det-month" value={month ?? ""} onChange={(e) => go(person, choice.identifier, { month: (e.currentTarget as HTMLSelectElement).value })}>
              {choice.months.map((m) => <option key={m ?? ""} value={m ?? ""}>{m ? formatDate(m) : "—"}</option>)}
            </select>
          </label>
        )}
      </form>

      {!choice && <p class="status">The codex records nothing for {personLabel(person)} in {programLabel(program)}.</p>}
      {choice && (
        <Body
          key={`${hc.id}|${hc.as_of}|${person}|${choice.identifier}|${month ?? ""}`}
          ctx={ctx} hc={hc} stored={stored} me={me} program={program} choice={choice} month={month} asof={asof}
          showAll={r.params.all === "1"}
          setShowAll={(v) => go(person, choice.identifier, { all: v ? "1" : null, month: r.params.month ?? null })}
          setAsof={(d) => go(person, choice.identifier, { asof: d && d !== stored.as_of ? d : null, month: null })}
        />
      )}
    </section>
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

function Body(
  { ctx, hc, stored, me, program, choice, month, asof, showAll, setShowAll, setAsof }:
  {
    ctx: ViewContext; hc: HouseholdCase; stored: HouseholdCase; me: PersonInfo; program: string; choice: OutcomeChoice;
    month: string | null; asof: string | null; showAll: boolean; setShowAll: (v: boolean) => void; setAsof: (d: string | null) => void;
  },
) {
  const { engine, vol, route: r } = ctx;
  const person = me.id;
  const open = useSignal<Set<number>>(new Set());
  const printing = useSignal<PrintMode>(null);
  const depth = useSignal<number>(2);
  const walk = useMemo(
    () => buildWalk(engine.explain(caseToSpec(hc), choice.identifier, person, month)),
    [engine, hc, choice.identifier, person, month],
  );
  const unverified = useMemo(() => unverifiedIds(vol.sources), [vol.sources]);
  useEffect(() => {
    const before = () => { if (!printing.value) printing.value = "appeal"; };
    const after = () => { printing.value = null; };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  const print = (mode: Exclude<PrintMode, null>) => {
    printing.value = mode;
    setTimeout(() => {
      if (typeof window.print === "function") window.print();
      printing.value = null;
    }, 60);
  };
  const mode = printing.value;
  const visible = mode === "training" ? trainingSteps(walk, depth.value)
    : visibleSteps(walk, showAll || mode === "appeal", open.value);
  const everything = showAll || mode !== null;
  const folded = foldedBehind(walk, visible);
  const hiddenUnchanged = unchangedCount(walk);
  const root = walk.root;
  const expected = stored.expect?.[person]?.[choice.identifier];
  const expectedValue = expected && typeof expected === "object" && !Array.isArray(expected) && month
    ? (expected as Record<string, unknown>)[month] : expected;
  const budget = useMemo(() => budgetRows(engine, walk, { effect: budgetEffect(engine, hc) }), [engine, walk, hc]);
  const det = determinationDate(hc);
  const overrides = overrideNotes(walk);
  const unverifiedSteps = unverifiedInTrace(walk.root, unverified);
  const missing = root.value === null ? missingFacts(root) : [];
  const sentence = clientSentence(engine, walk, person, {
    missing: missing.map((m) => (m.person && m.person !== person ? `${personLabel(m.person)}'s ` : "") + m.name.replace(/^[^:]{2,40}:\s*/, "")),
  });
  const short = whyInShort(walk);
  const cmp = decidingComparison(engine, walk);
  const questions = useMemo(
    () => questionsBehind(engine, hc, choice.identifier, person, month ?? hc.as_of.slice(0, 7)),
    [engine, hc, choice.identifier, person, month],
  );
  const goStep = (n: number) => {
    if (!visible.some((s) => s.n === n)) setShowAll(true);
    setTimeout(() => {
      const el = document.getElementById(`step-${n}`);
      if (el) { el.scrollIntoView({ block: "center" }); (el as HTMLElement).focus({ preventScroll: true }); }
    }, 30);
  };
  const household = isHouseholdOutcome(engine, choice.identifier);

  return (
    <div class={`det-body${mode ? ` printing-${mode}` : ""}`} data-outcome={choice.identifier}>
      <PrintHeader ctx={ctx} stored={stored} hc={hc} me={me} choice={choice} month={month} mode={mode} depth={depth.value} />

      <p class="client" data-client>{sentence}</p>

      <div class={`verdict${root.value === null ? " unknown" : ""}`}>
        <span class="small">
          {household ? "The household's result" : `${personLabel(person)}'s result`}
          {month ? ` for ${formatDate(month)}` : ""}
        </span>
        <b class="big" data-value>{valueOf(engine, root)}</b>
        {!asof && expected !== undefined && expectedValue !== "unknown"
          && formatFor(engine, choice.identifier, expectedValue) !== valueOf(engine, root) && (
          <span class="bad">The case author expected {formatFor(engine, choice.identifier, expectedValue)}.</span>
        )}
      </div>
      <Participation ctx={ctx} hc={hc} person={person} program={program} choice={choice} month={month} />

      <p class="asof">
        <span>
          {asof
            ? <>Read with the rules in force on <b>{formatDate(asof)}</b>, not the household's own date ({formatDate(stored.as_of)}).</>
            : <>As of <b>{formatDate(stored.as_of)}</b>, the household's determination date: the rules and figures in force that day.</>}
        </span>{" "}
        <label class="no-print">
          <span class="small">Read it on another date</span>{" "}
          <input
            type="date" class="det-asof" value={hc.as_of}
            onChange={(e) => setAsof((e.currentTarget as HTMLInputElement).value || null)}
          />
        </label>
        {asof && <> <button type="button" class="linkish no-print" onClick={() => setAsof(null)}>Back to {formatDate(stored.as_of)}</button></>}
      </p>

      <div class="detactions no-print">
        <a class="btn" href={mapHref(r, choice.item.id, { household: { caseId: stored.id, person, month } })}>Open in the Map</a>
        <a class="btn det-whatif" href={buildHash({ ...r, arg: stored.id, params: { tab: "whatif", watch: `${person}:${choice.identifier}` } })}>
          What if the income changes?
        </a>
        <span class="printtraining">
          <button type="button" class="btn det-print-training" onClick={() => print("training")}>Print for a training</button>
          <label>
            <span class="small">showing</span>{" "}
            <select class="det-depth" value={String(depth.value)} onChange={(e) => { depth.value = Number((e.currentTarget as HTMLSelectElement).value); }}>
              {TRAINING_DEPTHS.map((d) => <option key={d.depth} value={d.depth}>{d.label}</option>)}
            </select>
          </label>
        </span>
        <button type="button" class="btn det-print-appeal wk-print" onClick={() => print("appeal")}>Print for an appeal file</button>
      </div>

      {(overrides.length > 0 || unverifiedSteps.length > 0) && (
        <ul class="banners">
          {overrides.map((o) => (
            <li key={o.text} class="fedbanner" data-override={o.item}>
              <b>A statute governs over the Colorado rule here</b>{" "}
              <span class="small">({o.steps.length === 1 ? "step" : "steps"} {o.steps.join(", ")})</span>
              <p>{o.text}</p>
              {o.via.length > 2 && (
                <p class="small via">
                  Why it bears on this result: the result reads {o.via.slice(-3, -1).join(", which reads ")}, which reads{" "}
                  <b>{o.via[o.via.length - 1]}</b>.
                </p>
              )}
            </li>
          ))}
          {unverifiedSteps.length > 0 && (
            <li class="unvbanner">
              <b>Rests on an unverified source.</b>{" "}
              {unverifiedSteps.map((u, i) => {
                const it = engine.item(u.identifier);
                return (
                  <span key={u.identifier}>
                    {i > 0 && "; "}
                    {it ? <a href={itemHref(r, it)}>{u.name}</a> : u.name}{" "}
                    ({u.sources.map((s) => <a key={s} href={excerptHref(r, s)}>{s}</a>)})
                  </span>
                );
              })}.
            </li>
          )}
        </ul>
      )}

      <WhatChanges ctx={ctx} hc={hc} person={person} identifier={choice.identifier} month={month} />

      <h2>Why, in short</h2>
      <ol class="whyshort">
        <li><b>{choice.item.name}</b> is <b>{valueOf(engine, root)}</b></li>
        {short.steps.map((s, i) => (
          <li key={s.n} class={s.why ? "why" : undefined}>
            {i === 1 && short.skipped > 0 && <span class="small">({short.skipped} steps between) </span>}
            <span class="small">because </span>
            {s.node.person && s.node.person !== person && <>{personLabel(s.node.person)}: </>}
            <button type="button" class="linkish" onClick={() => goStep(s.n)}>{s.node.name}</button> is <b>{valueOf(engine, s.node)}</b>
          </li>
        ))}
        {short.steps.length === 0 && root.value !== null && (walk.steps[0]?.inputs ?? [])
          .filter((i) => i.mattered && typeof i.node.value === "number" && i.node.value !== 0 && engine.item(i.node.identifier)?.type === "money")
          .map((i) => (
            <li key={i.node.key} class="amountline">
              <span class="small">from </span>
              {i.step !== null
                ? <button type="button" class="linkish" onClick={() => goStep(i.step!)}>{i.node.name}</button>
                : <FactName ctx={ctx} node={i.node} person={person} />}{" "}
              <b>{budgetMoney(i.node.value, () => valueOf(engine, i.node))}</b>
            </li>
          ))}
        {cmp && (
          <li class="compare">
            <span class="small">which compared </span>
            {shortLabel(cmp.amount.name)} <b>{budgetMoney(cmp.amount.value, () => valueOf(engine, cmp.amount))}</b>{" "}
            <span class="small">with </span>
            {shortLabel(cmp.limit.name)} <b>{budgetMoney(cmp.limit.value, () => valueOf(engine, cmp.limit))}</b>
          </li>
        )}
        {root.value === null && missing.length > 0 && (
          <li class="unknown">
            <span class="small">unknown because the case does not give </span>
            {missing.slice(0, 6).map((m, i) => <span key={m.key}>{i > 0 && "; "}<FactName ctx={ctx} node={m} person={person} /></span>)}
            {missing.length > 6 && <span class="small"> and {missing.length - 6} more</span>}
          </li>
        )}
        {root.value === null && walk.noFigure.map((m) => <li key={m.key} class="unknown"><NoFigure ctx={ctx} node={m} asOf={hc.as_of} /></li>)}
      </ol>

      {budget.length > 0 && <Budget ctx={ctx} rows={budget} goStep={goStep} unverified={unverified} person={person} det={det} />}

      {questions.length > 0 && (
        <details class="detquestions-block">
          <summary><h2>Open questions this result rests on ({questions.length})</h2></summary>
          <ul class="detquestions">
            {questions.map((q) => {
              const oq = vol.openQuestions.find((x) => x.id === q);
              return <li key={q}><a href={questionHref(r, q)}>{oq ? plainQuestionTitle(oq.title) : q}</a> <span class="code">{q}</span></li>;
            })}
          </ul>
        </details>
      )}

      <h2>Step by step</h2>
      <div class="wk-stepbar no-print">
        <button type="button" class="btn wk-showall" aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show only the steps that changed the answer" : `Show all ${walk.steps.length} steps`}
        </button>
        <span class="small">
          {visible.length} of {walk.steps.length} steps shown
          {!everything && hiddenUnchanged > 0 && <> · {hiddenUnchanged} did not change the answer</>}
        </span>
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

      <h2>Rule text this determination cites</h2>
      {walk.sources.length === 0
        ? <p class="small">No step cites an excerpt.</p>
        : (
          <ol class="wk-citations">
            {walk.sources.map((sid) => {
              const src = vol.sources.find((x) => x.id === sid);
              return (
                <li key={sid}>
                  <a href={excerptHref(r, sid)}>{src ? citationText(src.citation) : sid}</a> <span class="code">{sid}</span>
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

function shortLabel(name: string): string {
  return name.replace(/^[^:]{2,40}:\s*/, "");
}

function PrintHeader(
  { ctx, stored, hc, me, choice, month, mode, depth }:
  {
    ctx: ViewContext; stored: HouseholdCase; hc: HouseholdCase; me: PersonInfo; choice: OutcomeChoice;
    month: string | null; mode: PrintMode; depth: number;
  },
) {
  const local = localInfoSig.value;
  const commit = ctx.vol.sha ?? local?.head ?? null;
  const title = plainCaseTitle(stored.title).title;
  if (mode === "training") {
    const d = TRAINING_DEPTHS.find((x) => x.depth === depth);
    return (
      <div class="print-only wk-printhead">
        <p><b>Training handout</b> · how the codex decides {choice.item.name} · {d?.label ?? "every step"}</p>
        <p>
          Worked example: stored test household {stored.id} ({title}), {personName(me)}, as of {formatDate(hc.as_of)}
          {month ? `, ${formatDate(month)}` : ""}. A test household, not a real client.
        </p>
      </div>
    );
  }
  return (
    <div class="print-only wk-printhead">
      <p><b>Determination record for an appeal file</b> · printed {formatDate(ctx.today)}</p>
      <p>
        Stored test household {stored.id}: {title}. Person: {personName(me)}. Result: {choice.item.name}
        {month ? `, ${formatDate(month)}` : ""}.
      </p>
      <p>
        Determination date (as of): {formatDate(hc.as_of)}{hc.as_of !== stored.as_of ? ` (the household's own date is ${formatDate(stored.as_of)})` : ""}.
        Ledger: {ctx.vol.title}, {refLabel(ctx.vol.ref, local)}, commit {commit ?? "not known (uncommitted working tree)"}
        {local?.dirty ? ", with uncommitted edits" : ""}.
        {draftsShown() && changeSetSig.value.entries.length > 0 && " This print includes staged draft changes that are not the rules in force."}
      </p>
    </div>
  );
}

/** For a program that decides a household, this person's own place in it,
 *  so a household result is never read as the person's. */
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
  const isMember = typeof v === "string" && /^eligible/.test(v) && !householdDenied;
  return (
    <div class={`wk-person${isMember ? "" : " not"}`} data-participation={typeof v === "string" ? v : ""}>
      <b>{personLabel(person)}'s own place in {programLabel(program)}:</b> {formatFor(engine, part, v)}
      {householdDenied && <> (a member of the unit; <b>the unit is {formatFor(engine, choice.identifier, hv)}</b>, so nobody is paid)</>}{" "}
      {choice.identifier !== part && (
        <a class="small" href={determinationHref(ctx.route, hc.id, person, part, ctx.route.params.asof ? { asof: ctx.route.params.asof } : {})}>
          (open it)
        </a>
      )}
      {household && (
        <p class="wk-household">
          The result here is the household's. It is reported on every member, including members who are not eligible
          themselves.
        </p>
      )}
    </div>
  );
}

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
  return it ? <a href={itemHref(ctx.route, it)}>{who}{it.name}</a> : <span>{who}{node.name}</span>;
}

function NoFigure({ ctx, node, asOf }: { ctx: ViewContext; node: TraceNode; asOf: string }) {
  const it = ctx.engine.item(node.identifier);
  const reason = it ? noVersionReason(it, asOf) : null;
  return (
    <span>
      No figure in force for <FactName ctx={ctx} node={node} person="" /> on {formatDate(asOf)}.
      {reason && <> {reason.replace(/; see [^.]*\./, ".")}</>}
      {it?.open?.length ? <> Open question: {it.open.map((q, i) => <span key={q}>{i > 0 && ", "}<a href={questionHref(ctx.route, q)}>{q}</a></span>)}.</> : null}
    </span>
  );
}

function CiteLinks(
  { ctx, ids, unverified, max }: { ctx: ViewContext; ids: readonly string[]; unverified: ReadonlySet<string>; max?: number },
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
              href={excerptHref(ctx.route, s)} data-cite={s} title={src ? `${src.title}: ${src.citation}` : s}
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

const ORIGIN_WORDS: Record<string, string> = {
  case: "stated in the case", default: "stated for every month", parameter: "policy figure",
  missing: "not stated", "not-in-force": "not in force on this date", "no-version": "no figure in force",
};

function Step(
  { ctx, hc, s, person, unverified, goStep, folded, onUnfold }:
  {
    ctx: ViewContext; hc: HouseholdCase; s: WalkStep; person: string; unverified: ReadonlySet<string>;
    goStep: (n: number) => void; folded: number; onUnfold: () => void;
  },
) {
  const { engine, route: r } = ctx;
  const it: Item | undefined = engine.item(s.node.identifier);
  const n = s.node;
  const flagged = n.sources.some((x) => unverified.has(x));
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
        {flagged && <span class="flag unverified" title="cites an excerpt that is not a verified quotation">unverified source</span>}
      </div>
      {n.override && <p class="fedbanner small"><b>A statute governs over the Colorado rule.</b> {n.override}</p>}
      {it && <PlainRule engine={engine} item={it} asOf={hc.as_of} />}
      {n.error !== undefined && <p class="bad">{n.error}</p>}
      {n.warnings?.map((w) => <p key={w} class="stopnote">{w}</p>)}
      {s.missing.length > 0 && (
        <p class="stopnote">
          <b>Unknown here:</b> the case does not give{" "}
          {s.missing.map((m, i) => <span key={m.key}>{i > 0 && "; "}<FactName ctx={ctx} node={m} person={person} /></span>)}.
        </p>
      )}
      {s.noFigure.map((m) => <p key={m.key} class="stopnote"><NoFigure ctx={ctx} node={m} asOf={hc.as_of} /></p>)}
      {s.inputs.length > 0 && (
        <div class="inputs">
          <span class="small">It used:</span>
          <ul>
            {s.inputs.map((i) => (
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
      {it?.open?.length ? (
        <p class="oqs">
          <span class="small">Open question: </span>
          {it.open.map((q, i) => {
            const oq = ctx.vol.openQuestions.find((x) => x.id === q);
            return <span key={q}>{i > 0 && "; "}<a href={questionHref(r, q)}>{oq ? plainQuestionTitle(oq.title) : q}</a> <span class="code">{q}</span></span>;
          })}
        </p>
      ) : null}
      {folded > 0 && (
        <button type="button" class="linkish wk-folded no-print" onClick={onUnfold}>
          Show the {folded} step{folded === 1 ? "" : "s"} behind this one
        </button>
      )}
    </li>
  );
}

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
      <h2>The budget</h2>
      <p class="small">Each dollar line the result rests on, in order, with the rule text in force on {formatDate(det)}.</p>
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

/** The same stored household under the rules in force and under the
 *  reader's staged drafts (before/after on a proposed change). */
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
      <h2>What changes with your drafts</h2>
      <p class="small">
        This household under the rules in force and under your {cs.entries.length} staged
        change{cs.entries.length === 1 ? "" : "s"} ({cs.entries.map(entryLabel).join("; ")}).{" "}
        {draftsShown() ? "The steps below include your drafts." : "The steps below show the rules in force."}
      </p>
      {rows && rows.length === 0 && <p>None of this household's results change.</p>}
      {rows && rows.length > 0 && (
        <div class="wk-tablewrap">
          <table class="wk-changes">
            <thead><tr><th>Person</th><th>Result</th><th>Rules in force</th><th>With your drafts</th></tr></thead>
            <tbody>
              {rows.map((c) => {
                const it = engine.item(c.identifier);
                const sel = c.identifier === identifier && c.person === person && (c.month ?? null) === (month ?? null);
                return (
                  <tr key={`${c.person}|${c.identifier}|${c.month ?? ""}`} class={sel ? "selected" : undefined}>
                    <td>{personLabel(c.person)}</td>
                    <td>
                      <a href={determinationHref(ctx.route, hc.id, c.person, c.identifier)}>{it?.name ?? c.identifier}</a>
                      {c.month && <span class="small"> {formatDate(c.month)}</span>}
                    </td>
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
