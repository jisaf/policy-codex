/* The item page, `#/<volume>/item/CO-n`: one rule, figure or fact, for
 * policy staff (docs/design-unified-ui.md, "Canonical pages › Item"). Top
 * to bottom: what it means; how it is decided in plain sentences (a rule)
 * or the figure today (a figure); figures over time beside the text each
 * version was taken from; the law, word for word; its values in the stored
 * households; what it affects, with "Compare stored households"; the
 * questions it rests on. A right rail holds the sign-off panel, "Propose a
 * change" and "Ask a question". A "Map" tab (`?tab=map`) centres the Map on
 * it. The ledger's own words, tests, projection and decision record stay at
 * the foot, for implementers; edit mode's editor and rename stay reachable. */
import "./item/item.css";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Engine } from "../engine/engine";
import { referencesInCases, renameInCasesText } from "../engine/rename";
import type { Item, TestSpec } from "../engine/types";
import { fileEntries, type ChangeEntry } from "../changes/types";
import { DecisionRecord } from "./DecisionRecord";
import { Term } from "./labels";
import { MapView } from "./map/MapView";
import { Ident, Rich } from "./Rich";
import { buildHash, type Route } from "./router";
import {
  changeSetSig, engineSig, modeSig, openEditor, putChangeEntry, putFileChange, route,
  sourceTitles, trayOpenSig, viewEngine, volumeSig,
} from "./state";
import { itemValidation } from "./validation";
import { approvalStatus } from "./approvals";
import { PlainRule } from "./Present";
import { formatDate, formatValue, optionLabel } from "./present";
import { unverifiedIds } from "./provenance";
import { unverifiedUpstream } from "./counts";
import { programLabel } from "./roles";
import { personaById, personaSig } from "./personas";
import {
  assumptionInForce, plainQuestionTitle, QUESTION_STATUS_LABEL, questionInfo, questionStatus,
} from "./questions";
import { todayIso } from "./views/context";
import { FigureToday, FiguresOverTime } from "./item/Figures";
import { useResting, ValuesInHouseholds, WhatItAffects } from "./item/Households";
import { LawSection } from "./item/Law";
import { citedSources, kindWords, versionSources } from "./item/model";
import { Prose } from "./item/Prose";
import { Rail } from "./item/Rail";

interface RenameNote { msg: string; blocking: boolean }

/** The live checks shown under the rename form's input: the governance
 *  findings for a copy of `item` under the candidate identifier, plus a
 *  uniqueness check governance() does not itself make (it checks one item,
 *  never against the rest of the ledger). Empty candidates and the item's own
 *  current identifier show no notes. */
function renameNotes(engine: Engine, item: Item, candidate: string): RenameNote[] {
  if (!candidate || candidate === item.identifier) return [];
  const notes: RenameNote[] = engine.governance({ ...item, identifier: candidate }, { isNew: false })
    .map((f) => ({ msg: f.msg, blocking: f.level === "error" }));
  const existing = engine.item(candidate);
  if (existing) {
    notes.push({
      msg: `"${candidate}" is already the identifier of ${existing.id} (${existing.name})`,
      blocking: true,
    });
  }
  return notes;
}

export function TestTable({ engine, item }: { engine: Engine; item: Item }) {
  const tests = item.tests ?? [];
  if (!tests.length) return <p class="muted">No examples yet.</p>;
  return (
    <table class="tests grid">
      <thead>
        <tr><th>ID</th><th>Given</th><th>Expected</th><th>Result</th></tr>
      </thead>
      <tbody>
        {tests.map((t) => {
          const r = engine.runTest(item, t);
          const given = engine.formatTest(t)
            .replace(/^[^:]+: given /, "").replace(/ => .*$/, "");
          const expected = "expect_length" in t
            ? `${t.expect_length} months`
            : engine.fmt(t.expect === "unknown" ? null : t.expect);
          return (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td class="mono"><Rich engine={engine} text={given} mode="example" as="span" /></td>
              <td><Rich engine={engine} text={expected} mode="example" as="span" /></td>
              <td class={r.ok ? "ok" : "bad"}>
                {r.err ? r.err : r.ok ? "pass" : `got ${engine.fmt(r.got)}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** The dated values of a parameter, oldest first, as the ledger keeps them. */
function VersionTable({ engine, item }: { engine: Engine; item: Item }) {
  return (
    <table class="versions grid">
      <thead>
        <tr><th>From</th><th>To</th><th>Value</th><th>Source</th></tr>
      </thead>
      <tbody>
        {(item.versions ?? []).map((v) => (
          <tr key={v.from}>
            <td>{v.from}</td>
            <td>{v.to ?? "present"}</td>
            <td class="value">{formatValue(item, v.value)}</td>
            <td>{v.source ? <Rich engine={engine} text={v.source} mode="inline" as="span" /> : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The derivation as the ledger writes it: "<Name> is true when …". */
function DerivedSentence({ engine, item }: { engine: Engine; item: Item }) {
  let lines: string[];
  try {
    lines = item.derived ? engine.block(item.derived) : ["(no derivation yet)"];
  } catch (e) {
    lines = [`(invalid: ${(e as Error).message})`];
  }
  const verb = engine.baseType(item) === "yes/no" ? "is true when" : "is";
  const head = item.derived ? `${item.name} ${verb} ${lines[0]}` : lines[0];
  return (
    <Rich
      engine={engine} text={[head, ...lines.slice(1)].join("\n")} mode="expr"
      class="derivation ledger-words"
    />
  );
}

/** One worked example from the item's first test, "Given …, the answer is …". */
function workedExample(
  engine: Engine, t: TestSpec | undefined,
): { given: string; expected: string; expectedIsProse: boolean } | null {
  if (!t) return null;
  const given = engine.formatTest(t)
    .replace(/^[^:]+: given /, "").replace(/ => .*$/, "");
  return "expect_length" in t
    ? { given, expected: `${t.expect_length} months`, expectedIsProse: true }
    : { given, expected: engine.fmt(t.expect === "unknown" ? null : t.expect), expectedIsProse: false };
}

/** A flag when this item, or anything it rests on, cites an excerpt that is
 *  not a verified quotation. */
function UnverifiedNote({ engine, item, route: r }: { engine: Engine; item: Item; route: Route }) {
  const vol = volumeSig.value;
  const uses = vol ? unverifiedUpstream(engine, item.identifier, unverifiedIds(vol.sources)) : [];
  if (!uses.length) return null;
  const own = uses.find((u) => u.item.id === item.id);
  const others = uses.filter((u) => u.item.id !== item.id);
  return (
    <p class="unverified-note">
      <span class="flag unverified">Unverified source</span>{" "}
      {own && <>It cites text that is not a verified quotation. </>}
      {others.length > 0 && (
        <>
          It rests on {others.length === 1 ? "a figure or rule" : `${others.length} figures or rules`} that cite such text:{" "}
          {others.slice(0, 4).map((u, i) => (
            <span key={u.item.id}>
              {i > 0 && ", "}
              <a href={buildHash({ ...r, view: "item", arg: u.item.id, params: {} })}>{u.item.name}</a>
            </span>
          ))}
          {others.length > 4 && `, and ${others.length - 4} more`}.
        </>
      )}
    </p>
  );
}

/** The tray's edit to the item's content (not only a signature), if any. */
function stagedEdit(id: string): ChangeEntry | null {
  const e = changeSetSig.value.entries.find((x) => x.id === id);
  if (!e?.before || !e.after) return null;
  const strip = (it: Item) => { const { approval: _a, status: _s, ...rest } = it; return JSON.stringify(rest); };
  return strip(e.before) === strip(e.after) ? null : e;
}

function QuestionsSection({ engine, item, route: r }: { engine: Engine; item: Item; route: Route }) {
  const vol = volumeSig.value!;
  const qs = (item.open ?? []).map((id) => vol.openQuestions.find((q) => q.id === id)).filter((q) => !!q);
  return (
    <section class="isec questions-on" id="questions" aria-labelledby="q-h">
      <h2 id="q-h">Questions it rests on</h2>
      {qs.length === 0 && <p class="muted">No open question names it.</p>}
      <ul class="qlist-item">
        {qs.map((q) => {
          const st = questionStatus(q!);
          const reading = st === "resolved" ? "" : assumptionInForce(questionInfo(engine, q!));
          return (
            <li key={q!.id}>
              <span class={`tag qstatus-${st}`}>{QUESTION_STATUS_LABEL[st]}</span>{" "}
              <a href={buildHash({ ...r, view: "questions", arg: q!.id, params: {} })}>{plainQuestionTitle(q!.title)}</a>{" "}
              <small class="refid">{q!.id}</small>
              {reading && <p class="small"><span class="muted">Read meanwhile as:</span> <Prose engine={engine} vol={vol} route={r} text={reading} /></p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Implementers({ engine, item, route: r }: { engine: Engine; item: Item; route: Route }) {
  const vol = volumeSig.value!;
  const validation = itemValidation(engine, item.id);
  const example = workedExample(engine, (item.tests ?? [])[0]);
  const uses = engine.usesOfItem(item.identifier);
  const usedBy = engine.usedBy(item.identifier);
  const nameOf = (identifier: string) => engine.item(identifier)?.name ?? identifier;
  return (
    <details class="section implementers" open={r.params.section === "implementers"}>
      <summary>For implementers</summary>
      <dl class="implfacts">
        <dt>Identifier</dt><dd class="mono">{item.identifier}</dd>
        <dt>Type</dt><dd>{item.type}</dd>
        <dt>Scope</dt><dd><Term scope={item.scope} /></dd>
        <dt>Kind</dt><dd><Term kind={item.kind} /></dd>
        {item.tags && item.tags.length > 0 && <><dt>Tags</dt><dd>{item.tags.join(", ")}</dd></>}
        {item.effective && <><dt>Effective</dt><dd>{item.effective.from} to {item.effective.to}</dd></>}
        {item.options && item.options.length > 0 && (
          <><dt>Possible results</dt><dd>{item.options.map((o) => <span key={o} class="opt">{optionLabel(item, o)} <code class="alias">{o}</code> </span>)}</dd></>
        )}
      </dl>
      {item.kind === "derived" && (
        <>
          <h4>In the ledger's own words</h4>
          <DerivedSentence engine={engine} item={item} />
        </>
      )}
      {item.versions && item.versions.length > 0 && (
        <>
          <h4>Versions</h4>
          <VersionTable engine={engine} item={item} />
        </>
      )}
      <h4>Uses and used by</h4>
      <p class="uses"><b>Uses:</b>{" "}
        {uses.length ? uses.map((u, i) => <span key={u}>{i > 0 && ", "}<Ident id={u} label={nameOf(u)} engine={engine} /></span>) : "nothing"}
      </p>
      <p class="used-by"><b>Used by:</b>{" "}
        {usedBy.length ? usedBy.map((u, i) => <span key={u}>{i > 0 && ", "}<Ident id={u} label={nameOf(u)} engine={engine} /></span>) : "nothing"}
      </p>
      <h4>Tests</h4>
      {example && (
        <p class="worked-example">
          <b>Example.</b> Given{" "}
          <Rich engine={engine} text={example.given} mode="example" as="span" />, the answer is{" "}
          {example.expectedIsProse
            ? example.expected
            : <Rich engine={engine} text={example.expected} mode="example" as="span" />}.
        </p>
      )}
      <TestTable engine={engine} item={item} />
      <h4>Approach A projection</h4>
      <p class="muted">{engine.projectionA(item.identifier, sourceTitles()).ledger}</p>
      <pre class="projection">{engine.projectionA(item.identifier, sourceTitles()).text}</pre>
      <h4>Decision record</h4>
      <DecisionRecord item={item} vol={vol} route={r} />
      {validation.messages.length > 0 && (
        <div class="problems">
          <h4>Problems</h4>
          <ul>{validation.messages.map((m) => <li key={m} class="bad">{m}</li>)}</ul>
        </div>
      )}
    </details>
  );
}

function RenameForm({ engine, item, open, value }: {
  engine: Engine; item: Item; open: { value: boolean }; value: { value: string };
}) {
  const vol = volumeSig.value!;
  const candidate = value.value.trim();
  const notes = renameNotes(engine, item, candidate);
  const ready = candidate !== "" && candidate !== item.identifier && !notes.some((n) => n.blocking);
  return (
    <div class="rename-form card">
      <label>New identifier
        <input
          class="mono rename-input"
          value={value.value}
          onInput={(e) => { value.value = (e.target as HTMLInputElement).value; }}
        />
      </label>
      {notes.length > 0 && (
        <ul class="problems">
          {notes.map((n) => <li key={n.msg} class={n.blocking ? "bad" : "warn"}>{n.msg}</li>)}
        </ul>
      )}
      <button
        class="btn confirm-rename"
        disabled={!ready}
        onClick={() => {
          const result = engine.rename(item.identifier, candidate);
          if (result.errors.length) return;
          const base = engineSig.value ?? engine;
          for (const changedItem of result.changed) {
            putChangeEntry({
              id: changedItem.id,
              chapter: vol.chapterOf[changedItem.id] ?? "supplied",
              before: base.itemById(changedItem.id) ?? null,
              after: changedItem,
            });
          }
          // A rename that reaches household cases rewrites tests/cases.yaml
          // too, textually (so its comments survive), staged on top of
          // whatever the tray already holds for it.
          const cases = vol.cases ?? [];
          if (referencesInCases(cases, item.identifier).length > 0) {
            const path = `${vol.path}/tests/cases.yaml`;
            const staging = fileEntries(changeSetSig.value).find((f) => f.path === path);
            const before = staging?.after ?? vol.casesText;
            if (before != null) {
              putFileChange({
                path,
                before: vol.casesText,
                after: renameInCasesText(before, cases, item.identifier, candidate),
                label: `${path}: rename ${item.identifier} to ${candidate}`,
              });
            }
          }
          trayOpenSig.value = true;
          open.value = false;
          value.value = "";
        }}
      >Confirm rename</button>
      <button class="btn" onClick={() => { open.value = false; }}>Cancel</button>
    </div>
  );
}

const NO_CASES: never[] = [];

const SCOPE_WORDS: Record<Item["scope"], string> = {
  person: "for each person",
  "person-month": "for each person, month by month",
  case: "for the household",
  month: "month by month",
  global: "for everyone",
};

export function ItemView() {
  const renameOpen = useSignal(false);
  const renameValue = useSignal("");
  const engine = viewEngine() ?? engineSig.value;
  const base = engineSig.value ?? engine;
  const vol = volumeSig.value;
  const r = route.value;
  const resting = useResting(base, vol?.cases ?? NO_CASES);
  const section = r.params.section;
  useEffect(() => {
    // "Trace to source" (a definition card) lands on the law.
    if (section !== "record" && section !== "law") return;
    const t = setTimeout(() => {
      const el = document.getElementById("law");
      el?.scrollIntoView?.({ block: "start" });
      el?.focus?.({ preventScroll: true });
    }, 30);
    return () => clearTimeout(t);
  }, [section, r.arg]);
  if (!engine || !vol || !base) return <p class="status">No ledger loaded.</p>;
  const item = r.arg ? engine.itemById(r.arg) : undefined;
  if (!item) return <p class="status bad">No item {r.arg} in this volume.</p>;

  const today = todayIso();
  const persona = personaById(r.params.persona) ?? personaById(personaSig.value);
  const tab = r.params.tab === "map" ? "map" : "about";
  const tabHref = (t: string) => buildHash({ ...r, params: t === "map" ? { tab: "map" } : {} });
  const status = approvalStatus(base, item).status;
  const openCount = (item.open ?? []).length;
  const shownBeside = item.kind === "parameter" ? new Set(versionSources(item)) : new Set<string>();
  const lawIds = citedSources(item).filter((id) => !shownBeside.has(id));
  const staged = stagedEdit(item.id);
  const railProps = { base, vol, route: r, persona, item, today, resting };

  return (
    <section class="view itempage" data-item={item.id} data-kind={item.kind}>
      <header class="itemhead">
        <p class="eyebrow">
          {kindWords(engine, item)} · {programLabel(item.program)} · {SCOPE_WORDS[item.scope] ?? item.scope}
        </p>
        <h1>{item.name}</h1>
        <p class="badges">
          <span class={`tag status-${status.toLowerCase()}`}>{status}</span>
          {item.statute_override && <span class="flag override">Statute over rule</span>}
          {openCount > 0 && <a class="tag qtag" href="#questions">{openCount} open question{openCount === 1 ? "" : "s"}</a>}
          {staged && <span class="tag staged">Changed in your proposal</span>}
          <small class="idline muted"><span class="mono">{item.id}</span> · <span class="mono">{item.identifier}</span></small>
        </p>
        {modeSig.value === "edit" && (
          <p class="editrow">
            <button class="btn" onClick={() => openEditor(item.id)}>Edit</button>{" "}
            <button
              class="btn rename"
              onClick={() => { renameValue.value = item.identifier; renameOpen.value = true; }}
            >Rename</button>
          </p>
        )}
        <nav class="tabs itemtabs" aria-label="This item">
          <a class={tab === "about" ? "on" : ""} aria-current={tab === "about" ? "page" : undefined} href={tabHref("about")} data-tab="about">The item</a>
          <a class={tab === "map" ? "on" : ""} aria-current={tab === "map" ? "page" : undefined} href={tabHref("map")} data-tab="map">Map</a>
        </nav>
        {tab === "about" && (
          <p class="jump">
            <a href="#signoff">Sign-off</a> · <a href="#propose">Propose a change</a> · <a href="#ask">Ask a question</a>
          </p>
        )}
      </header>

      {modeSig.value === "edit" && renameOpen.value && (
        <RenameForm engine={engine} item={item} open={renameOpen} value={renameValue} />
      )}

      {tab === "map"
        ? (
          <div class="itemmap">
            <MapView center={item.id} />
          </div>
        )
        : (
          <div class="itemgrid">
            <div class="itemmain">
              <section class="isec meaning" aria-labelledby="meaning-h">
                <h2 id="meaning-h">What it means</h2>
                {item.meaning
                  ? <Prose engine={engine} vol={vol} route={r} text={item.meaning} as="p" class="lead-meaning" />
                  : <p class="muted">No meaning recorded.</p>}
                {item.statute_override && (
                  <div class="callout override-box">
                    <b>Statute over rule.</b> <Prose engine={engine} vol={vol} route={r} text={item.statute_override} />
                  </div>
                )}
                {item.assumption && (
                  <div class="callout assume-box">
                    <b>Working assumption.</b> <Prose engine={engine} vol={vol} route={r} text={item.assumption} />
                  </div>
                )}
                {item.supplied_by && (
                  <p><b>Where the answer comes from.</b> <Prose engine={engine} vol={vol} route={r} text={item.supplied_by} /></p>
                )}
                <UnverifiedNote engine={engine} item={item} route={r} />
              </section>

              {item.kind === "derived" && (
                <section class="isec decided" aria-labelledby="decided-h">
                  <h2 id="decided-h">How it is decided</h2>
                  {item.effective && (
                    <p class="small">
                      In force from {formatDate(item.effective.from)}
                      {item.effective.to && item.effective.to !== "present" ? ` to ${formatDate(item.effective.to)}` : ""}; on another date it says nothing.
                    </p>
                  )}
                  <div class="derivation rule-plain"><PlainRule engine={engine} item={item} asOf={today} /></div>
                  {item.precision && (
                    <p class="small edge"><b>Edge cases.</b> <Prose engine={engine} vol={vol} route={r} text={item.precision} /></p>
                  )}
                </section>
              )}
              {item.kind === "supplied" && (item.options?.length || item.precision) && (
                <section class="isec answers" aria-labelledby="answers-h">
                  <h2 id="answers-h">The answers it takes</h2>
                  {item.options && item.options.length > 0 && (
                    <ul class="optlist">{item.options.map((o) => <li key={o}>{optionLabel(item, o)}</li>)}</ul>
                  )}
                  {item.precision && <p class="small edge"><b>Edge cases.</b> <Prose engine={engine} vol={vol} route={r} text={item.precision} /></p>}
                </section>
              )}
              {item.kind === "parameter" && <FigureToday engine={engine} item={item} date={today} />}
              {item.kind === "parameter" && <FiguresOverTime engine={engine} vol={vol} route={r} item={item} date={today} />}
              {item.kind === "parameter" && !Array.isArray(item.versions) && item.precision && (
                <p class="small edge"><b>Notes.</b> <Prose engine={engine} vol={vol} route={r} text={item.precision} /></p>
              )}

              <LawSection
                vol={vol} route={r} ids={lawIds}
                intro={shownBeside.size ? (lawIds.length ? "The text behind each version is beside it above; these are the other excerpts it cites." : "The text behind each version is beside it above.") : undefined}
              />
              <ValuesInHouseholds engine={engine} vol={vol} route={r} item={item} resting={resting} />
              <WhatItAffects engine={engine} base={base} vol={vol} route={r} item={item} date={today} staged={staged} />
              <QuestionsSection engine={engine} item={item} route={r} />
              <p class="maplink"><a href={tabHref("map")}>See it on the Map: what it reads and what reads it</a></p>
              <Implementers engine={engine} item={item} route={r} />
            </div>
            <Rail {...railProps} />
          </div>
        )}
    </section>
  );
}
