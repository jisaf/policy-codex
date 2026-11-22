/* Law (docs/design-unified-ui.md, "Law"): where the codex follows a statute
 * over a Colorado rule, the figures whose source is unverified or missing
 * and what depends on them, and the sources and documents themselves.
 * Routes: `law` (the overview), `law/departures`, `law/unverified`,
 * `law/sources[/S-n]` and `law/doc[/D-n?at=S-n]` (LawSources.tsx). Every
 * number comes from counts.ts. */
import type { ComponentChildren } from "preact";
import type { Item } from "../../engine/types";
import type { Source } from "../../ledger/markdown";
import {
  dependentsOf, departureItems, departureSince, departuresByProgram, figuresWithoutValue, householdCount,
  householdsThatRead, itemsCitingExcerpt, lawCounts, QUESTION_LAW_DEFINITIONS,
  restingOn, restingPhrase, unverifiedReach, type LawCounts,
} from "../counts";
import { formatDate, formatValue } from "../present";
import { excerptKind, unverifiedIds } from "../provenance";
import { departures, isOpen, questionInfo, type Departure } from "../questions";
import { agencyNotified } from "../questionAnswer";
import { argParts, buildHash, type Route } from "../router";
import { versionInForce } from "../../engine/versions";
import { viewContext, type ViewContext } from "../views/context";
import { NoLedger } from "../views/ViewStub";
import { PlaceHeader } from "./PlaceHeader";
import { LawDocumentPage, LawDocuments, LawExcerptPage, LawSources, type FetchText } from "./LawSources";
import {
  docHref, excerptHref, householdHref, HowCounted, itemHref, ProgramTags, programName, Prose, qHref,
  questionsWithStaged, StatusTag, useRestingReady,
} from "./questionParts";
import "./questions-law.css";
import "../views/workflow-views.css";

type Section = "" | "departures" | "unverified" | "sources" | "doc";

/** The Law place's own tabs, each with its number. */
export function LawTabs({ r, on, counts }: { r: Route; on: Section; counts: LawCounts }) {
  const tab = (id: Section, label: ComponentChildren) => (
    <a
      href={buildHash({ ...r, view: "law", arg: id || null, params: {} })}
      class={on === id ? "on" : undefined} aria-current={on === id ? "page" : undefined}
    >{label}</a>
  );
  return (
    <nav class="tabs lawtabs" aria-label="Law">
      {tab("", "Overview")}
      {tab("departures", <>Statute over rule <span class="n">{counts.departures}</span></>)}
      {tab("unverified", <>Unverified and missing <span class="n">{counts.citingUnverified + counts.noValue}</span></>)}
      {tab("sources", <>Sources <span class="n">{counts.excerpts.toLocaleString("en-US")}</span></>)}
      {tab("doc", <>Documents <span class="n">{counts.documents}</span></>)}
    </nav>
  );
}

// ---- overview

function Overview({ ctx, counts }: { ctx: ViewContext; counts: LawCounts }) {
  const { route: r, today } = ctx;
  const at = (arg: string) => buildHash({ ...r, view: "law", arg, params: {} });
  const n = (x: number) => x.toLocaleString("en-US");
  return (
    <>
      <ul class="countcards lawcards">
        <li class="countcard">
          <a href={at("departures")}><span class="num">{n(counts.departures)}</span> places the codex follows a statute over Colorado's rule</a>
          <small class="muted">with the reasoning, the questions and whether the agency was told</small>
        </li>
        <li class="countcard">
          <a href={at("unverified")}><span class="num">{n(counts.citingUnverified)}</span> items take a figure from an unverified source</a>
          <small class="muted">{n(counts.restingOnUnverified)} more rest on them; {n(counts.noValue)} figures have no value on {formatDate(today)}</small>
        </li>
        <li class="countcard">
          <a href={at("sources")}><span class="num">{n(counts.excerpts)}</span> excerpts</a>
          <small class="muted">the words of the law the items cite; {n(counts.unverifiedSources)} unverified</small>
        </li>
        <li class="countcard">
          <a href={at("doc")}><span class="num">{n(counts.documents)}</span> documents</a>
          <small class="muted">the full texts the excerpts come from</small>
        </li>
      </ul>
      <HowCounted>
        <p>{QUESTION_LAW_DEFINITIONS.departures}</p>
        <p>{QUESTION_LAW_DEFINITIONS.unverified}</p>
        <p>{QUESTION_LAW_DEFINITIONS.noValue}</p>
      </HowCounted>
    </>
  );
}

// ---- statute over rule

function DepartureRow(
  { d, ctx, households }: { d: Departure; ctx: ViewContext; households: ReturnType<typeof restingOn> | null },
) {
  const { engine, vol, route: r } = ctx;
  const qs = questionsWithStaged(vol);
  const questions = d.questions.map((id) => qs.find((q) => q.id === id)).filter((q): q is NonNullable<typeof q> => Boolean(q));
  const notified = questions.map((q) => agencyNotified(q.body)).find(Boolean) ?? null;
  const since = departureSince(d.item);
  const openOnes = questions.filter((q) => isOpen(questionInfo(engine, q).status));
  const excerpt = (s: Source) => (
    <li key={s.id}>
      <a href={excerptHref(r, s.id)}>{s.title || s.citation}</a>
      {s.document && <> · <a class="small" href={docHref(r, s.document, s.id)}>full document</a></>}
    </li>
  );
  return (
    <li class="departure" data-item={d.item.id}>
      <h2><a href={itemHref(r, d.item.id)}>{d.item.name}</a></h2>
      <p class="qmeta">
        <ProgramTags programs={[d.item.program]} />
        {since ? <span>since {formatDate(since)}</span> : <span class="muted">start date not stated</span>}
        <small class="mono muted">{d.item.id}</small>
      </p>
      <dl class="depfields">
        <dt>The codex follows</dt>
        <dd>{d.statutes.length ? <ul class="plain">{d.statutes.map(excerpt)}</ul> : <span class="muted">No statute excerpt cited.</span>}</dd>
        <dt>Departs from</dt>
        <dd>
          {d.ruleOverridden && <p class="rule-overridden"><Prose text={d.ruleOverridden} engine={engine} vol={vol} r={r} /></p>}
          {d.rules.length > 0 && <ul class="plain">{d.rules.map(excerpt)}</ul>}
          {!d.ruleOverridden && !d.rules.length && <span class="muted">The note does not name the rule.</span>}
        </dd>
        <dt>Reasoning</dt>
        <dd><Prose text={d.reasoning} engine={engine} vol={vol} r={r} /></dd>
        <dt>Questions</dt>
        <dd>
          {questions.length
            ? <ul class="plain">{questions.map((q) => {
              const info = questionInfo(engine, q);
              return <li key={q.id}><a href={qHref(r, q.id)}>{info.title}</a> <StatusTag q={info} /> <small class="mono muted">{q.id}</small></li>;
            })}</ul>
            : <span class="muted">None: Legal has not been asked.</span>}
        </dd>
        <dt>Agency notified</dt>
        <dd>{notified ? <Prose text={notified} engine={engine} vol={vol} r={r} /> : <span class="muted">Not recorded.</span>}</dd>
        <dt>Stored households</dt>
        <dd>{households === null ? <span class="muted">Working out…</span> : `${restingPhrase(households.length, householdCount(households))}.`}</dd>
      </dl>
      {openOnes.length > 0 && (
        <p class="qactions">
          {openOnes.map((q) => <a key={q.id} class="btn" href={qHref(r, q.id, { act: "opinion" })}>Record a legal opinion on {q.id}</a>)}
        </p>
      )}
    </li>
  );
}

function Departures({ ctx }: { ctx: ViewContext }) {
  const { engine, vol, route: r, today } = ctx;
  const program = r.params.program || null;
  const inForce = departureItems(engine, { asOf: today, programs: program ? [program] : null });
  const all = departureItems(engine, { asOf: today });
  const ids = new Set(inForce.map((it) => it.id));
  const rows = departures(engine, vol.sources, (s) => excerptKind(s, vol.documents)).filter((d) => ids.has(d.item.id))
    .sort((a, b) => inForce.indexOf(a.item) - inForce.indexOf(b.item));
  const ready = useRestingReady(engine, vol);
  const chip = (p: string | null, label: string, count: number) => (
    <a
      class={`chip${program === p ? " on" : ""}`} aria-current={program === p ? "true" : undefined}
      href={buildHash({ ...r, params: p ? { program: p } : {} })}
    >{label} <b>{count}</b></a>
  );
  return (
    <>
      <p class="lede">
        In these places a statute says something a Colorado rule, not yet amended, does not, and the codex follows the
        statute. Each is Legal's to decide.
      </p>
      <p class="chips" aria-label="Program">
        {chip(null, "All", all.length)}
        {departuresByProgram(engine, today).map((x) => chip(x.program, programName(x.program), x.count))}
      </p>
      <HowCounted><p>{QUESTION_LAW_DEFINITIONS.departures}</p></HowCounted>
      <ul class="departures">
        {rows.map((d) => (
          <DepartureRow key={d.item.id} d={d} ctx={ctx} households={ready ? restingOn(engine, vol.cases, [d.item.identifier]) : null} />
        ))}
      </ul>
    </>
  );
}

// ---- unverified and missing figures

function figureValue(ctx: ViewContext, it: Item): string | null {
  if (it.kind !== "parameter") return null;
  const v = it.versions?.length ? versionInForce(it, ctx.today)?.value : it.value;
  if (v === undefined || v === null) return null;
  return typeof v === "object" ? "a table" : formatValue(it, v);
}

function ItemRow({ ctx, it, extra }: { ctx: ViewContext; it: Item; extra?: ComponentChildren }) {
  const { route: r } = ctx;
  const value = figureValue(ctx, it);
  return (
    <li data-item={it.id}>
      <a href={itemHref(r, it.id)}>{it.name}</a>{value && <> <span class="value">{value}</span></>}{" "}
      <ProgramTags programs={[it.program]} /> <small class="mono muted">{it.id}</small>
      {extra && <> <span class="muted small">{extra}</span></>}
    </li>
  );
}

function readersPhrase(n: number): string {
  return n === 0 ? "nothing reads it" : `${n.toLocaleString("en-US")} ${n === 1 ? "item reads" : "items read"} it`;
}

function Unverified({ ctx }: { ctx: ViewContext }) {
  const { engine, vol, route: r, today } = ctx;
  const ready = useRestingReady(engine, vol);
  const reach = unverifiedReach(engine, vol.sources, unverifiedIds(vol.sources), ready ? vol.cases : null);
  const missing = figuresWithoutValue(engine, today);
  const outcomes = reach.outcomes.map((o) => engine.item(o)).filter((it): it is Item => Boolean(it));
  return (
    <>
      <section class="card insum">
        <h2>In short</h2>
        <p>
          <b>{reach.citing.length}</b> items take a figure from an unverified source; <b>{reach.resting.length}</b> more
          rest on them. They feed <b>{reach.outcomes.length}</b> program outcomes, and{" "}
          {reach.households ? <><b>{reach.households.length}</b> stored households read them.</> : <span class="muted">the stored households are being worked out.</span>}
        </p>
        <p>
          <b>{missing.length}</b> figures have no value on {formatDate(today)}: a household determined then gets "cannot determine".
        </p>
        <HowCounted>
          <p>{QUESTION_LAW_DEFINITIONS.unverified}</p>
          <p>{QUESTION_LAW_DEFINITIONS.unverifiedHouseholds}</p>
          <p>{QUESTION_LAW_DEFINITIONS.noValue}</p>
        </HowCounted>
      </section>

      <h2 id="sources">Unverified sources ({reach.sources.length})</h2>
      {reach.sources.map((s) => {
        const items = itemsCitingExcerpt(engine, s.id);
        return (
          <section class="card unvsource" key={s.id} data-excerpt={s.id}>
            <h3><a href={excerptHref(r, s.id)}>{s.title}</a> <span class="flag unverified">Not a quotation</span> <small class="mono muted">{s.id}</small></h3>
            <p class="small muted">{s.citation}</p>
            <p class="small">
              Its text could not be fetched from the document, so these figures were supplied by hand. Nothing resting
              on it can leave Draft until the real text replaces it.
              {s.document && <> <a href={docHref(r, s.document, s.id)}>Open the document</a></>}
            </p>
            <h4>Taken from it ({items.length})</h4>
            <ul class="plain unverified">
              {items.map((it) => {
                const hh = ready ? householdsThatRead(engine, vol.cases, it.identifier).length : null;
                return (
                  <ItemRow
                    key={it.id} ctx={ctx} it={it}
                    extra={<>{readersPhrase(dependentsOf(engine, it.identifier).length)}{hh !== null && `; ${hh} ${hh === 1 ? "household reads" : "households read"} it`}</>}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}

      <h2 id="resting">Everything that rests on them ({reach.resting.length})</h2>
      <ul class="plain restlist">
        {reach.resting.map((it) => <ItemRow key={it.id} ctx={ctx} it={it} />)}
      </ul>

      <h2 id="outcomes">Program outcomes they feed ({outcomes.length})</h2>
      <ul class="plain restlist">
        {outcomes.map((it) => <ItemRow key={it.id} ctx={ctx} it={it} />)}
      </ul>

      <h2 id="households">Stored households that read them ({reach.households ? reach.households.length : "…"})</h2>
      {reach.households
        ? <p class="hhlist">{reach.households.map((c, i) => {
          const hc = vol.cases.find((x) => x.id === c);
          return <span key={c}>{i > 0 && ", "}<a href={householdHref(r, c)} title={hc?.title}>{c}</a></span>;
        })}</p>
        : <p class="muted">Working out…</p>}

      <h2 id="missing">No value on {formatDate(today)} ({missing.length})</h2>
      <ul class="plain missing">
        {missing.map((it) => (
          <ItemRow
            key={it.id} ctx={ctx} it={it}
            extra={<>{(it.versions ?? []).length ? "no version in force on this date" : "no version loaded"}; {readersPhrase(dependentsOf(engine, it.identifier).length)}</>}
          />
        ))}
      </ul>
    </>
  );
}

// ---- the place

const TITLES: Record<Section, string | undefined> = {
  "": undefined,
  departures: "Statute over rule",
  unverified: "Unverified and missing figures",
  sources: "Sources",
  doc: "Documents",
};

export function LawPage({ fetchText }: { fetchText?: FetchText } = {}) {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  const { engine, vol, route: r, today } = ctx;
  const [first, second] = argParts(r);
  const section = (["departures", "unverified", "sources", "doc"].includes(first) ? first : "") as Section;
  if (section === "doc" && second) return <LawDocumentPage ctx={ctx} id={second} fetchText={fetchText} />;
  if (section === "sources" && second) return <LawExcerptPage ctx={ctx} id={second} />;
  const counts = lawCounts(engine, vol, unverifiedIds(vol.sources), today);
  return (
    <section class={`view place law${section ? ` law-${section}` : ""}`}>
      {section
        ? <div class="placehead" data-place="law"><h1>{TITLES[section]}</h1></div>
        : <PlaceHeader place="law" />}
      <LawTabs r={r} on={section} counts={counts} />
      {section === "" && <Overview ctx={ctx} counts={counts} />}
      {section === "departures" && <Departures ctx={ctx} />}
      {section === "unverified" && <Unverified ctx={ctx} />}
      {section === "sources" && <LawSources ctx={ctx} />}
      {section === "doc" && <LawDocuments ctx={ctx} />}
    </section>
  );
}

