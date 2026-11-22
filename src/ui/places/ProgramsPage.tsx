/* Programs (docs/design-unified-ui.md, "Programs"; Blind B's pattern): what
 * each program decides, then its outcome rules, then "Explain step by step"
 * at a chosen depth, with print for a training.
 *
 * Routes (canonical):
 * - `programs`: every program as a card: what it decides, how much is in it.
 * - `programs/<id>`: the outcomes it decides (each links to its rule's own
 *   page and to its steps), with tabs "Aid codes" (`?tab=aid-codes`, the
 *   aid-code cards) and "Map" (`?tab=map`, the Map centred on the program:
 *   complexity at a glance).
 * - `programs/<id>/<outcome>`: the outcome explained step by step:
 *   `?depth=1|2|3|all`, `?case=CO-n&person=pN` to show one stored household's
 *   values beside each step (Blind A), and "Print for a training".
 * Every number comes from counts.ts. */
import { useSignal } from "@preact/signals";
import type { Engine } from "../../engine/engine";
import type { Item } from "../../engine/types";
import { paramInForce } from "../../engine/versions";
import type { HouseholdCase } from "../../engine/cases";
import { DESK_DEFINITIONS, explainSteps, programSummary } from "../counts";
import { MapView } from "../map/MapView";
import { householdValues } from "../map/model";
import { formatDate, formatFor, formatValue, optionLabel, personLabel } from "../present";
import { PlainRule } from "../Present";
import { plainRule, plainText } from "../plain";
import { firstSentence, programLabel } from "../roles";
import { argParts, buildHash, canonicalRoute, type Route } from "../router";
import { CodesTab } from "../views/OutcomesView";
import { excerptHref, itemHref, PlaceholderBanner } from "../views/parts";
import { viewContext, type ViewContext } from "../views/context";
import { NoLedger } from "../views/ViewStub";
import { plainCaseTitle } from "../walkthrough";
import { PlaceHeader } from "./PlaceHeader";
import "./desk.css";

const TABS = [
  { id: "", label: "What it decides" },
  { id: "aid-codes", label: "Aid codes" },
  { id: "map", label: "Map" },
] as const;

export function ProgramsPage() {
  const ctx = viewContext();
  if (!ctx) return <NoLedger />;
  // An aid-code tab is served by the aid-code view's own route; the page
  // reads the canonical one.
  const c = canonicalRoute(ctx.route);
  const [program, outcome] = argParts(c);
  const declared = (ctx.engine.meta.programs ?? []).map((p) => p.id);
  if (!program) {
    return c.params.tab === "aid-codes" ? <AllAidCodes ctx={ctx} /> : <ProgramIndex ctx={ctx} c={c} programs={declared} />;
  }
  if (!declared.includes(program)) {
    return (
      <section class="view place programs">
        <PlaceHeader place="programs" />
        <p class="status bad">No program "{program}" in this volume.</p>
      </section>
    );
  }
  if (outcome) return <Explain ctx={ctx} c={c} program={program} identifier={outcome} />;
  return <ProgramPage ctx={ctx} c={c} program={program} />;
}

// ---- every program

function ProgramIndex({ ctx, c, programs }: { ctx: ViewContext; c: Route; programs: string[] }) {
  const { engine, vol } = ctx;
  return (
    <section class="view place programs">
      <PlaceHeader place="programs" />
      <ul class="pgrid" aria-label="Programs">
        {programs.map((p) => {
          const s = programSummary(engine, p, vol.openQuestions);
          const names = s.decisions.map((o) => shortName(o.name, p));
          return (
            <li key={p} class="pcard" data-program={p}>
              <a href={buildHash({ ...c, arg: p, params: {} })}>
                <h2>{programLabel(p)}</h2>
                <p class="pc-outs">
                  Decides: {names.slice(0, 4).join(" · ")}{names.length > 4 ? ` · and ${names.length - 4} more` : ""}
                </p>
                <p class="pc-n muted">
                  <b>{s.decisions.length}</b> outcomes · <b>{s.rules}</b> rules · <b>{s.figures}</b> figures · <b>{s.openQuestions.length}</b> open questions
                </p>
              </a>
            </li>
          );
        })}
      </ul>
      <p class="muted"><a href={buildHash({ ...c, arg: null, params: { tab: "aid-codes" } })}>Aid codes of every program</a></p>
    </section>
  );
}

/** "Colorado Works: grant amount" reads "Grant amount" under Colorado Works. */
function shortName(name: string, program: string): string {
  const label = programLabel(program).split(" (")[0];
  const s = name.replace(new RegExp(`^(${escape(program)}|${escape(label)}|Medicaid|SNAP|CHP\\+)\\s*:\\s*`, "i"), "");
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** A meaning without the identifiers it names in brackets
 *  ("(cw_eligibility_status, CO-921)"): the name already says it, and the
 *  link carries the id. */
export function plainMeaning(text: string | undefined): string {
  return (text ?? "")
    .replace(/\s*\((?:[a-z][a-z0-9]*_[a-z0-9_]*,\s*)?CO-\d+\)/g, "")
    .replace(/\s*\([a-z][a-z0-9]*_[a-z0-9_]*(?:,\s*[a-z][a-z0-9]*_[a-z0-9_]*)*\)/g, "");
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function AllAidCodes({ ctx }: { ctx: ViewContext }) {
  const map = ctx.vol.aidCodes ?? null;
  return (
    <section class="view place programs workflow outcomes">
      <PlaceHeader place="programs" title="Aid codes" />
      {map ? <><PlaceholderBanner map={map} /><CodesTab ctx={ctx} map={map} /></> : <p class="status">This volume has no aid-code layer yet.</p>}
    </section>
  );
}

// ---- one program

function ProgramPage({ ctx, c, program }: { ctx: ViewContext; c: Route; program: string }) {
  const { engine, vol } = ctx;
  const tab = c.params.tab === "aid-codes" || c.params.tab === "map" ? c.params.tab : "";
  const s = programSummary(engine, program, vol.openQuestions);
  const map = vol.aidCodes ?? null;
  return (
    <section class={`view place programs program${tab === "aid-codes" ? " workflow outcomes" : ""}`} data-program={program}>
      <div class="placehead" data-place="programs">
        <h1>{programLabel(program)}</h1>
        <p class="purpose">
          Decides {s.decisions.length} outcome{s.decisions.length === 1 ? "" : "s"} for each person, each month.{" "}
          <a href={buildHash({ ...c, view: "figures", arg: null, params: { program } })}>Its {s.figures} figures</a>
          {s.openQuestions.length > 0 && (
            <> · <a href={buildHash({ ...c, view: "questions", arg: null, params: { program } })}>{s.openQuestions.length} open questions</a></>
          )}
        </p>
      </div>
      <nav class="tabs programtabs" aria-label={`${programLabel(program)}: views`}>
        {TABS.map((t) => (
          <a
            key={t.id} class={tab === t.id ? "on" : ""} aria-current={tab === t.id ? "page" : undefined}
            href={buildHash({ ...c, arg: program, params: t.id ? { tab: t.id } : {} })}
          >{t.label}</a>
        ))}
      </nav>
      {tab === "aid-codes"
        ? (map ? <><PlaceholderBanner map={map} /><CodesTab ctx={ctx} map={map} /></> : <p class="status">This volume has no aid-code layer yet.</p>)
        : tab === "map"
          ? <MapView center={`program:${program}`} />
          : <Decides ctx={ctx} c={c} program={program} decisions={s.decisions} verification={s.verification} />}
    </section>
  );
}

function resultKind(it: Item): string {
  if (it.type === "yes/no") return "Yes or no";
  if (it.type === "money") return "An amount in dollars";
  if (it.type === "calendar date") return "A date";
  if (it.type === "one of") {
    const opts = it.options ?? [];
    const shown = opts.slice(0, 4).map((o) => optionLabel(it, o)).join(", ");
    return `One of: ${shown}${opts.length > 4 ? `, and ${opts.length - 4} more` : ""}`;
  }
  return "A value";
}

function Decides(
  { ctx, c, program, decisions, verification }:
  { ctx: ViewContext; c: Route; program: string; decisions: Item[]; verification: Item[] },
) {
  const explain = (it: Item) => buildHash({ ...c, arg: `${program}/${it.identifier}`, params: {} });
  const row = (it: Item) => (
    <li key={it.id} class="outcomerow" data-outcome={it.identifier}>
      <div class="or-main">
        <a class="or-name" href={itemHref(c, it)}>{shortName(it.name, program)}</a>
        <p class="or-m">{firstSentence(plainMeaning(it.meaning), 200)}</p>
        <p class="or-kind muted">{resultKind(it)}</p>
      </div>
      <a class="btn explain" href={explain(it)}>Explain step by step</a>
    </li>
  );
  return (
    <>
      <ul class="outcomerows" aria-label="What it decides">{decisions.map(row)}</ul>
      {verification.length > 0 && (
        <details class="verification">
          <summary>About documents and verification ({verification.length})</summary>
          <ul class="outcomerows">{verification.map(row)}</ul>
        </details>
      )}
      {!decisions.length && !verification.length && <p class="muted">{programLabel(program)} declares no outcome.</p>}
      <p class="muted small">How the stored households come out under these rules: <a href={buildHash({ ...c, view: "households", arg: null, params: {} })}>Households</a>.</p>
    </>
  );
}

// ---- explain step by step

const DEPTHS = [
  { id: "1", label: "The main steps", depth: 1 },
  { id: "2", label: "Two levels", depth: 2 },
  { id: "3", label: "Three levels", depth: 3 },
  { id: "all", label: "Every rule", depth: Infinity },
] as const;

/** The stored households with a stored result for the outcome: each
 *  (household, person) and the month of that result. */
export function householdsWithResult(cases: readonly HouseholdCase[], identifier: string): Array<{ hc: HouseholdCase; person: string; month: string }> {
  const out: Array<{ hc: HouseholdCase; person: string; month: string }> = [];
  for (const hc of cases) {
    for (const [person, exp] of Object.entries(hc.expect ?? {})) {
      if (!exp || typeof exp !== "object" || !(identifier in exp)) continue;
      const v = (exp as Record<string, unknown>)[identifier];
      const months = v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v).filter((k) => /^\d{4}-\d{2}$/.test(k)) : [];
      out.push({ hc, person, month: months[0] ?? hc.as_of.slice(0, 7) });
    }
  }
  return out;
}

function Explain({ ctx, c, program, identifier }: { ctx: ViewContext; c: Route; program: string; identifier: string }) {
  const { engine, vol, today } = ctx;
  const it = engine.item(identifier);
  if (!it) {
    return (
      <section class="view place programs">
        <PlaceHeader place="programs" title={programLabel(program)} />
        <p class="status bad">No rule "{identifier}" in this volume.</p>
      </section>
    );
  }
  const depthDef = DEPTHS.find((d) => d.id === c.params.depth) ?? DEPTHS[0];
  const steps = explainSteps(engine, identifier, depthDef.depth);
  const every = explainSteps(engine, identifier, Infinity).length;
  const choices = householdsWithResult(vol.cases, identifier);
  const chosen = choices.find((x) => x.hc.id === c.params.case && x.person === (c.params.person ?? x.person)) ?? null;
  const values = chosen ? householdValues(engine, chosen.hc, identifier, chosen.person, chosen.month) : null;
  const asOf = chosen ? `${chosen.month}-01` : today;
  const set = (patch: Record<string, string | null>) => {
    const params = { ...c.params };
    for (const [k, v] of Object.entries(patch)) if (v) params[k] = v; else delete params[k];
    return buildHash({ ...c, params });
  };
  const inSteps = new Set(steps.map((s) => s.item.identifier));
  return (
    <section class="view place programs explain" data-outcome={identifier}>
      <div class="placehead" data-place="programs">
        <p class="eyebrow muted">{programLabel(program)} · step by step</p>
        <h1>{it.name}</h1>
        <p class="purpose">{firstSentence(plainMeaning(it.meaning), 260)} <a href={itemHref(c, it)}>The rule's own page</a></p>
      </div>

      <div class="explainbar no-print">
        <nav class="chips depthchips" aria-label="How deep">
          {DEPTHS.map((d) => (
            <a key={d.id} class={`chip${d.id === depthDef.id ? " on" : ""}`} aria-current={d.id === depthDef.id ? "true" : undefined}
              href={set({ depth: d.id === "1" ? null : d.id })}>
              {d.label}{d.id === "all" ? ` (${every})` : ""}
            </a>
          ))}
        </nav>
        <label class="hhpick">
          Show values from a stored household{" "}
          <select
            value={chosen ? `${chosen.hc.id}|${chosen.person}` : ""}
            onChange={(e) => {
              const [cs, p] = (e.target as HTMLSelectElement).value.split("|");
              location.hash = set({ case: cs || null, person: p || null });
            }}
          >
            <option value="">none</option>
            {choices.map((x) => (
              <option key={`${x.hc.id}|${x.person}`} value={`${x.hc.id}|${x.person}`}>
                {x.hc.id} {personLabel(x.person)}: {shorten(plainCaseTitle(x.hc.title).title, 50)}
              </option>
            ))}
          </select>
        </label>
        <button class="btn print" onClick={() => print()}>Print for a training</button>
      </div>

      <p class="steps-note muted">
        {steps.length} step{steps.length === 1 ? "" : "s"}, in the order they are worked out; the last is the result.
        Figures as in force on {formatDate(asOf)}.
        {chosen && <> Values from {chosen.hc.id}, {personLabel(chosen.person)}, {formatDate(`${chosen.month}-01`).replace(/ 1,/, "")}.</>}
      </p>
      <p class="print-only">
        Training handout: {it.name} ({programLabel(program)}), {depthDef.label.toLowerCase()}, figures as in force on {formatDate(asOf)}.
      </p>

      <ol class="steplist">
        {steps.map((s, i) => (
          <Step
            key={s.item.id} ctx={ctx} c={c} program={program} item={s.item} n={i + 1} result={s.level === 0}
            asOf={asOf} values={values} inSteps={inSteps}
          />
        ))}
      </ol>

      <details class="howcounted no-print">
        <summary>How the steps are chosen</summary>
        <p>{DESK_DEFINITIONS.steps}</p>
      </details>
    </section>
  );
}

function shorten(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s;
}

function Step(
  { ctx, c, program, item, n, result, asOf, values, inSteps }: {
    ctx: ViewContext; c: Route; program: string; item: Item; n: number; result: boolean; asOf: string;
    values: Map<string, unknown> | null; inSteps: Set<string>;
  },
) {
  const { engine, vol } = ctx;
  const uses = engine.usesOfItem(item.identifier).map((u) => engine.item(u)).filter((x): x is Item => !!x);
  const facts = uses.filter((u) => u.kind === "supplied");
  const figures = uses.filter((u) => u.kind === "parameter");
  const deeper = uses.filter((u) => u.kind === "derived" && !inSteps.has(u.identifier));
  const source = (item.sources ?? []).map((id) => vol.sources.find((x) => x.id === id)).find(Boolean);
  const value = values?.get(item.identifier);
  return (
    <li class={`step${result ? " result" : ""}`} data-step={item.identifier}>
      <div class="step-n">{result ? "Result" : `Step ${n}`}</div>
      <div class="step-b">
        <h3><a href={itemHref(c, item)}>{item.name}</a></h3>
        {item.meaning && <p class="step-m">{firstSentence(plainMeaning(item.meaning), 260)}</p>}
        <RuleBox engine={engine} item={item} asOf={asOf} />
        {values && (
          <p class="step-v">
            In this household: <b>{value === undefined ? "not reached" : value === null ? "cannot determine" : formatFor(engine, item.identifier, value)}</b>
          </p>
        )}
        {facts.length > 0 && (
          <p class="small"><span class="muted">Asks the household: </span>{facts.map((f, k) => (
            <span key={f.id}>{k > 0 && " · "}<a href={itemHref(c, f)}>{f.name}</a>{values?.has(f.identifier) ? <span class="muted"> ({fmt(engine, f, values.get(f.identifier))})</span> : null}</span>
          ))}</p>
        )}
        {figures.length > 0 && (
          <p class="small"><span class="muted">Uses the figure{figures.length > 1 ? "s" : ""}: </span>{figures.map((f, k) => (
            <span key={f.id}>{k > 0 && " · "}<a href={itemHref(c, f)}>{f.name}</a> <span class="muted">({figureText(f, asOf)})</span></span>
          ))}</p>
        )}
        {deeper.length > 0 && (
          <p class="small no-print"><span class="muted">Explained further down: </span>{deeper.map((f, k) => (
            <span key={f.id}>{k > 0 && " · "}<a href={buildHash({ ...c, arg: `${program}/${f.identifier}`, params: {} })}>{f.name}</a></span>
          ))}</p>
        )}
        {source && (
          <p class="small muted">Law: <a href={excerptHref(c, source.id)}>{(source.citation || source.title || source.id).replace(/\.$/, "")}</a></p>
        )}
      </div>
    </li>
  );
}

/** A step's rule in plain words. A long one shows its first lines, with a
 *  button for the rest; printed, it shows whole. */
function RuleBox({ engine, item, asOf }: { engine: Engine; item: Item; asOf: string }) {
  const all = useSignal(false);
  let long = false;
  try { long = plainText(plainRule(engine, item, { asOf })).length > 600; } catch { long = false; }
  return (
    <div class={`rulebox${long && !all.value ? " clamped" : ""}`}>
      <PlainRule engine={engine} item={item} asOf={asOf} />
      {long && (
        <button class="linkish no-print" aria-expanded={all.value} onClick={() => { all.value = !all.value; }}>
          {all.value ? "Show less of the rule" : "Show the whole rule"}
        </button>
      )}
    </div>
  );
}

function fmt(engine: Engine, it: Item, v: unknown): string {
  if (v === null || v === undefined) return "not stated";
  return formatFor(engine, it.identifier, v);
}

function figureText(it: Item, asOf: string): string {
  const v = paramInForce(it, asOf);
  if (v === null || v === undefined) return "no value on this date";
  if (typeof v === "object" && !Array.isArray(v)) return `a table of ${Object.keys(v as object).length} rows`;
  return formatValue(it, v);
}
