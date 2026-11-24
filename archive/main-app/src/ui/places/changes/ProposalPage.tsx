/* Changes › My proposal (docs/design-unified-ui.md, "Proposal"): one
 * screen with the change, its effect and who must approve it (Blind A's
 * editor), on the App's change tray.
 *
 * - `?item=CO-n` opens the structured editor for that item (the item page's
 *   "Propose a change" links here; proposal.ts `proposeHref`). A figure is
 *   changed by "Add a new dated version" or "Correct the version from …",
 *   its excerpt chosen by title. A change that changes nothing is refused.
 *   The App's text editor is offered only in edit mode, for implementers.
 * - Its effect on the stored households is worked out as you type: the
 *   outcomes and the steps on the way that would change (counts.ts
 *   `changedBy`, `changedSplit`), and one reach number (`proposalReach`,
 *   the same the item page shows).
 * - Who must approve, with reasons, the data steward included; never an
 *   Approve button (nobody approves their own change).
 * - Sending: Propose with a GitHub token; otherwise the download and what to
 *   do with it (sendChange.tsx), which is also the only path in a preview
 *   copy. */
import { useEffect, useMemo, useState } from "preact/hooks";
import { signal } from "@preact/signals";
import type { Engine } from "../../../engine/engine";
import type { Item } from "../../../engine/types";
import { isSignatureOnly } from "../../../changes/apply";
import { entryKind, fileEntries, isUnchanged, type ChangeEntry } from "../../../changes/types";
import { BUNDLED } from "../../../ledger/source";
import {
  changedBy, changedPhrase, changedSplit, COUNT_DEFINITIONS, householdCount, proposalReach, readReachPhrase,
} from "../../counts";
import { personaRoles } from "../../personas";
import { formatDate, formatValue, optionLabel } from "../../present";
import {
  asOfTheirDates, defaultVersionIndex, describeEntry, excerptChoices, figureChange, isFigure, nextMonthStart,
  proposalApprovers, proposeHref, refusal, sortedVersions, valueOn, type FigureDraft, type FigureMode,
} from "../../proposal";
import type { ChangedResult } from "../../questionEffects";
import { buildHash, type Route } from "../../router";
import { search } from "../../search";
import { downloadStagedChange, SendChange, stewardOf, stewardText } from "../../sendChange";
import {
  changeSetSig, clearTray, credentials, discardChangeEntry, discardFileChange, engineSig, modeSig, navigate,
  openEditor, putChangeEntry, reportSig, searchIndexSig,
} from "../../state";
import { proposeBlocked, proposeStaged } from "../../Tray";
import { proposalCount } from "../../Header";
import type { ViewContext } from "../../views/context";
import { excerptHref, itemHref } from "../../views/parts";
import { ChangedTable } from "./ChangedTable";
import { useReadIndex } from "./TakesEffect";

/** "Added … to your proposal", shown once on the page the editor returns to. */
export const proposalFlashSig = signal("");

export function ProposalPage({ ctx }: { ctx: ViewContext }) {
  const id = ctx.route.params.item ?? "";
  // A fresh editor for each item.
  return <ProposalBody key={id} ctx={ctx} itemId={id} />;
}

interface Draft {
  /** The item as the editor would stage it, or null while it cannot. */
  after: Item | null;
  /** Why the editor cannot stage it (a refusal or a missing value). */
  problem: string | null;
  /** For a new dated version: the same figure applied on the households'
   *  own dates. */
  onTheirDates: Item | null;
  from: string | null;
}

function ProposalBody({ ctx, itemId }: { ctx: ViewContext; itemId: string }) {
  const { vol, route: r } = ctx;
  const base = engineSig.value ?? ctx.engine;
  const it = itemId ? base.itemById(itemId) ?? null : null;
  const cs = changeSetSig.value;
  const [draft, setDraft] = useState<Draft>({ after: null, problem: null, onTheirDates: null, from: null });
  const chapter = it ? vol.chapterOf[it.id] ?? (it.kind === "parameter" ? "parameters" : "rules") : "";

  const draftEntry: ChangeEntry | null = it && draft.after && !draft.problem
    ? { id: it.id, chapter, before: it, after: draft.after }
    : null;
  // The proposal as it would be with the change being edited: the staged
  // entries, this item's replaced by the draft.
  const entries = [
    ...cs.entries.filter((e) => !draftEntry || e.id !== draftEntry.id),
    ...(draftEntry ? [draftEntry] : []),
  ];
  const flash = proposalFlashSig.value;
  // The message is shown once: cleared when the page that showed it goes
  // (not by the editor it replaced, which unmounts as it appears).
  useEffect(() => {
    const shown = proposalFlashSig.peek();
    return () => { if (shown && proposalFlashSig.peek() === shown) proposalFlashSig.value = ""; };
  }, []);

  return (
    <div class="proposal">
      {flash && <p class="flash" role="status">{flash}</p>}
      <div class="proposal-grid">
        <div class="proposal-main">
          {itemId && !it && <p class="bad">No item {itemId} in this volume.</p>}
          {/* Editing: the change, then its effect, on one screen. Otherwise
              what the proposal holds comes first. */}
          {it
            ? (
              <>
                <Editor ctx={ctx} base={base} item={it} onDraft={setDraft} />
                <Effect ctx={ctx} base={base} entries={entries} draft={draft} item={it} />
                <Holds ctx={ctx} base={base} editing={it.id} />
              </>
            )
            : (
              <>
                <Holds ctx={ctx} base={base} editing={null} />
                <Effect ctx={ctx} base={base} entries={entries} draft={draft} item={null} />
                <PickItem r={r} />
              </>
            )}
        </div>
        <aside class="proposal-rail" aria-label="Approval and sending">
          <Approvers ctx={ctx} base={base} entries={entries} />
          <Send ctx={ctx} pending={Boolean(draftEntry)} />
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- choose

function PickItem({ r }: { r: Route }) {
  const [q, setQ] = useState("");
  const index = searchIndexSig.value;
  const hits = index ? search(index, q, 60).filter((h) => h.kind === "item").slice(0, 12) : [];
  const figures = hits.filter((h) => h.group === "figure");
  const others = hits.filter((h) => h.group !== "figure");
  return (
    <section class="card pickitem">
      <h2>Change a figure or a rule</h2>
      <label class="wide">
        Find it by name
        <input
          type="search" value={q} placeholder="for example: earned income disregard"
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
        />
      </label>
      {q.trim() && !hits.length && <p class="muted">Nothing matches every word.</p>}
      {[...figures, ...others].length > 0 && (
        <ul class="picklist">
          {[...figures, ...others].map((h) => (
            <li key={h.id}>
              <a href={proposeHref(r, { id: h.id })}>{h.title}</a>{" "}
              <span class="tag">{h.group === "figure" ? "figure" : h.group === "fact" ? "fact" : "rule"}</span>{" "}
              <small class="mono muted">{h.id}</small>
            </li>
          ))}
        </ul>
      )}
      <p class="muted small">Or open a rule or figure and choose "Propose a change".</p>
    </section>
  );
}

// ---------------------------------------------------------------- the editor

function Editor(
  { ctx, base, item, onDraft }: { ctx: ViewContext; base: Engine; item: Item; onDraft: (d: Draft) => void },
) {
  return isFigure(item)
    ? <FigureEditor ctx={ctx} base={base} item={item} onDraft={onDraft} />
    : <RuleEditor ctx={ctx} item={item} onDraft={onDraft} />;
}

function EditorHead({ ctx, item }: { ctx: ViewContext; item: Item }) {
  const { route: r } = ctx;
  const staged = changeSetSig.value.entries.find((e) => e.id === item.id);
  const meaning = (item.meaning ?? "").split(/(?<=\.)\s/)[0];
  return (
    <>
      <h2>
        Change: <a href={itemHref(r, item)}>{item.name}</a>{" "}
        <small class="mono muted">{item.id}</small>
      </h2>
      {meaning && <p class="muted meaning">{meaning}</p>}
      {staged && !isUnchanged(staged) && (
        <p class="note" role="note">
          Your proposal already holds a change to this item ({describeEntry(staged).toLowerCase()}). Adding this one
          replaces it.
        </p>
      )}
    </>
  );
}

function stage(ctx: ViewContext, item: Item, after: Item): void {
  putChangeEntry({ id: item.id, chapter: ctx.vol.chapterOf[item.id] ?? "parameters", before: item, after });
  proposalFlashSig.value = `Added to your proposal: ${item.name}.`;
  navigate({ view: "changes", arg: "proposal", params: {} });
}

function FigureEditor(
  { ctx, base, item, onDraft }: { ctx: ViewContext; base: Engine; item: Item; onDraft: (d: Draft) => void },
) {
  const { vol, route: r, today } = ctx;
  const vs = sortedVersions(item);
  const dated = Array.isArray(item.versions) && vs.length > 0;
  const [mode, setMode] = useState<FigureMode>("new");
  const [from, setFrom] = useState(() => nextMonthStart(today));
  const [version, setVersion] = useState(() => defaultVersionIndex(item, today));
  const startValue = (m: FigureMode, v: number) => (m === "correct" && v >= 0 ? vs[v]?.value : valueOn(item, today));
  const [value, setValue] = useState<unknown>(() => startValue("new", version));
  const startSource = (m: FigureMode, v: number) =>
    (m === "correct" && v >= 0 ? vs[v]?.source : vs[vs.length - 1]?.source ?? item.sources?.[0]) ?? "";
  const [source, setSource] = useState(() => startSource("new", version));
  const choices = useMemo(() => excerptChoices(item, vol.sources), [item, vol.sources]);
  void base;

  const d: FigureDraft = { mode, from, version, value, source };
  const built = figureChange(item, d);
  const problem = typeof built === "string" ? built : refusal(item, built, d);
  const after = typeof built === "string" ? null : built;
  const key = JSON.stringify([mode, from, version, value, source]);
  useEffect(() => {
    onDraft({ after, problem, onTheirDates: problem ? null : asOfTheirDates(item, d), from: mode === "new" ? from : null });
  }, [key]);

  const pickMode = (m: FigureMode) => {
    setMode(m);
    setValue(startValue(m, version));
    setSource(startSource(m, version));
  };
  const now = valueOn(item, today);
  const nowVersion = vs.length ? vs[defaultVersionIndex(item, today)] : null;
  const chosen = choices.find((c) => c.id === source);

  return (
    <section class="card propose-editor" aria-label="The change">
      <EditorHead ctx={ctx} item={item} />
      <p class="intoday">
        In force today: <b>{figureWords(item, now)}</b>
        {nowVersion && <span class="muted"> since {formatDate(nowVersion.from)}</span>}
      </p>
      <fieldset class="modes">
        <legend>What kind of change</legend>
        <label class="mode">
          <input type="radio" name="mode" value="new" checked={mode === "new"} onChange={() => pickMode("new")} />
          <span><b>Add a new dated version</b><small>The law or the figure changes on a date.</small></span>
        </label>
        <label class="mode">
          <input type="radio" name="mode" value="correct" checked={mode === "correct"} onChange={() => pickMode("correct")} />
          <span>
            <b>{dated ? `Correct the version from ${formatDate(vs[version >= 0 ? version : vs.length - 1].from)}` : "Correct the figure"}</b>
            <small>It was transcribed wrongly.</small>
          </span>
        </label>
      </fieldset>
      <div class="fields">
        {mode === "new" && (
          <label>
            Starts on{" "}
            <input type="date" name="from" value={from} onInput={(e) => setFrom((e.target as HTMLInputElement).value)} />
          </label>
        )}
        {mode === "correct" && dated && vs.length > 1 && (
          <label>
            Which version{" "}
            <select
              name="version" value={String(version)}
              onChange={(e) => {
                const v = Number((e.target as HTMLSelectElement).value);
                setVersion(v);
                setValue(startValue("correct", v));
                setSource(startSource("correct", v));
              }}
            >
              {vs.map((v, i) => (
                <option key={v.from} value={String(i)}>
                  From {formatDate(v.from)}{v.to ? ` to ${formatDate(v.to)}` : ""}: {figureWords(item, v.value)}
                </option>
              ))}
            </select>
          </label>
        )}
        <ValueInput item={item} value={value} onChange={setValue} />
        <label class="wide">
          The law it comes from{" "}
          <select name="excerpt" value={source} onChange={(e) => setSource((e.target as HTMLSelectElement).value)}>
            {!source && <option value="">Choose the excerpt</option>}
            {choices.some((c) => c.cited) && (
              <optgroup label="Cited by this figure">
                {choices.filter((c) => c.cited).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </optgroup>
            )}
            {choices.some((c) => !c.cited) && (
              <optgroup label="Elsewhere in the same documents">
                {choices.filter((c) => !c.cited).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </optgroup>
            )}
          </select>
        </label>
        {chosen && (
          <p class="muted small excerptnote">
            {chosen.citation.replace(/\s*https?:\/\/\S+/g, "").replace(/[.\s]+$/, "")} · <a href={excerptHref(r, chosen.id)}>Read it</a>
          </p>
        )}
      </div>
      {problem && <p class="refuse" role="alert">{problem}</p>}
      <p class="actions">
        <button class="btn primary addto" disabled={!after || Boolean(problem)} onClick={() => after && stage(ctx, item, after)}>
          Add to my proposal
        </button>
        <a class="btn" href={itemHref(r, item)}>Cancel</a>
        {modeSig.value === "edit" && (
          <button class="btn" onClick={() => openEditor(item.id)}>Open in the text editor</button>
        )}
      </p>
    </section>
  );
}

function figureWords(item: Item, v: unknown): string {
  if (v && typeof v === "object" && !Array.isArray(v)) return `a table of ${Object.keys(v).length} rows`;
  return formatValue(item, v);
}

function parseNumber(raw: string): number | string {
  const t = raw.trim().replace(/[$,]/g, "");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : raw;
}

/** The figure's value as fields: one per row of a table, a yes/no or a
 *  choice as a list, a number as a number. The reading beside it ("$100",
 *  "67%") is the same words every page uses. */
function ValueInput({ item, value, onChange }: { item: Item; value: unknown; onChange: (v: unknown) => void }) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const rows = Object.entries(value as Record<string, unknown>);
    return (
      <fieldset class="tablevalue wide">
        <legend>The figures</legend>
        <table class="grid edit">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k.replace(/_/g, " ")}</th>
                <td>
                  <input
                    name={`row-${k}`} aria-label={`Value for ${k.replace(/_/g, " ")}`} inputMode="decimal"
                    value={v === null || v === undefined ? "" : String(v)}
                    onInput={(e) => onChange({ ...(value as object), [k]: parseNumber((e.target as HTMLInputElement).value) })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>
    );
  }
  if (item.type === "yes/no") {
    return (
      <label>
        New figure{" "}
        <select name="value" value={value === true ? "yes" : value === false ? "no" : ""} onChange={(e) => onChange((e.target as HTMLSelectElement).value === "yes")}>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>
    );
  }
  if (item.options?.length) {
    return (
      <label>
        New figure{" "}
        <select name="value" value={String(value ?? "")} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
          {item.options.map((o) => <option key={o} value={o}>{optionLabel(item, o)}</option>)}
        </select>
      </label>
    );
  }
  const numeric = typeof value === "number" || ["money", "number", "rate", "hours", "count"].includes(item.type);
  return (
    <label>
      New figure{" "}
      <input
        name="value" inputMode={numeric ? "decimal" : undefined} value={value === null || value === undefined ? "" : String(value)}
        onInput={(e) => {
          const raw = (e.target as HTMLInputElement).value;
          onChange(raw.trim() === "" ? "" : numeric ? parseNumber(raw) : raw);
        }}
      />
      {typeof value === "number" && <span class="muted reads"> reads as {formatValue(item, value)}</span>}
    </label>
  );
}

/** A rule or a fact: when it is in force, and its meaning. How it decides is
 *  rule text, changed in the text editor by an implementer (edit mode). */
function RuleEditor({ ctx, item, onDraft }: { ctx: ViewContext; item: Item; onDraft: (d: Draft) => void }) {
  const { route: r } = ctx;
  const [from, setFrom] = useState(item.effective?.from ?? "");
  const [to, setTo] = useState(item.effective?.to && item.effective.to !== "present" ? item.effective.to : "");
  const [meaning, setMeaning] = useState(item.meaning ?? "");
  const after: Item = { ...item, meaning };
  if (from || to) after.effective = { from: from || item.effective?.from || "", to: to || "present" };
  else delete after.effective;
  const bad = to && from && to < from ? "The last day comes before the first." : null;
  const problem = bad ?? refusal(item, after);
  const key = JSON.stringify([from, to, meaning]);
  useEffect(() => { onDraft({ after, problem, onTheirDates: null, from: null }); }, [key]);
  return (
    <section class="card propose-editor" aria-label="The change">
      <EditorHead ctx={ctx} item={item} />
      <p class="muted small">
        How a {item.kind === "supplied" ? "fact is supplied" : "rule decides"} is written in its rule text, which an
        implementer changes. Here you can change when it is in force and what it means.
      </p>
      <div class="fields">
        <label>In force from <input type="date" name="eff-from" value={from} onInput={(e) => setFrom((e.target as HTMLInputElement).value)} /></label>
        <label>Last day in force <input type="date" name="eff-to" value={to} onInput={(e) => setTo((e.target as HTMLInputElement).value)} /></label>
        <label class="wide">
          What it means
          <textarea name="meaning" rows={4} value={meaning} onInput={(e) => setMeaning((e.target as HTMLTextAreaElement).value)} />
        </label>
      </div>
      {problem && <p class="refuse" role="alert">{problem}</p>}
      <p class="actions">
        <button class="btn primary addto" disabled={Boolean(problem)} onClick={() => stage(ctx, item, after)}>Add to my proposal</button>
        <a class="btn" href={itemHref(r, item)}>Cancel</a>
        {modeSig.value === "edit" && <button class="btn" onClick={() => openEditor(item.id)}>Open in the text editor</button>}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- what it holds

function Holds({ ctx, base, editing }: { ctx: ViewContext; base: Engine; editing: string | null }) {
  const { route: r } = ctx;
  const cs = changeSetSig.value;
  const files = fileEntries(cs);
  const report = reportSig.value;
  const errorsById = new Map((report?.items ?? []).map((i) => [i.id, i.errors]));
  const warningsById = new Map((report?.items ?? []).map((i) => [i.id, i.governance.filter((f) => f.level === "warn")]));
  const n = proposalCount();
  return (
    <section class="card holds" aria-labelledby="holds-h">
      <h2 id="holds-h">What your proposal holds{n ? ` (${n})` : ""}</h2>
      {n === 0 && (
        <p class="muted">
          Nothing yet. Change a figure or rule above, sign items on your Desk, or answer a question: each lands here.
        </p>
      )}
      {cs.entries.length > 0 && (
        <ul class="entries">
          {cs.entries.map((e) => {
            const it = e.after ?? e.before;
            const signature = isSignatureOnly(e);
            const warnings = signature ? [] : warningsById.get(e.id) ?? [];
            const live = base.itemById(e.id);
            return (
              <li key={e.id} class={`entry${e.id === editing ? " editing" : ""}`} data-entry={e.id}>
                <div class="entryhead">
                  {live ? <a href={itemHref(r, live)}>{it?.name ?? e.id}</a> : <b>{it?.name ?? e.id}</b>}{" "}
                  <small class="mono muted">{e.id}</small>{" "}
                  <span class="tag">{signature ? "signature" : entryKind(e) === "add" ? "new" : entryKind(e) === "delete" ? "removal" : "edit"}</span>
                  {isUnchanged(e) && <span class="tag">no change</span>}
                </div>
                <p class="what">{describeEntry(e)}</p>
                <ul class="errors">
                  {(errorsById.get(e.id) ?? []).map((m) => <li key={m} class="bad">{m}</li>)}
                  {warnings.map((f) => <li key={`${f.rule} ${f.msg}`} class="warn">{f.msg}</li>)}
                </ul>
                <p class="entryactions">
                  {live && !signature && entryKind(e) === "edit" && e.id !== editing && (
                    <a class="btn small" href={proposeHref(r, live)}>Change it</a>
                  )}
                  {modeSig.value === "edit" && <button class="btn small" onClick={() => openEditor(e.id)}>Open in the text editor</button>}
                  <button class="btn small discard" onClick={() => discardChangeEntry(e.id)}>Discard</button>
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {files.length > 0 && (
        <ul class="entries files">
          {files.map((f) => (
            <li class="entry file" key={f.path}>
              <div class="entryhead"><b>{f.label}</b> <span class="tag">{f.after === null ? "removal" : f.before === null ? "new file" : "edit"}</span></div>
              <p class="entryactions"><button class="btn small discard" onClick={() => discardFileChange(f.path)}>Discard</button></p>
            </li>
          ))}
        </ul>
      )}
      {n > 0 && <p class="discardall"><button class="btn" onClick={clearTray}>Discard all</button></p>}
    </section>
  );
}

// ---------------------------------------------------------------- the effect

function changeIdentifiers(entries: readonly ChangeEntry[]): string[] {
  const out = new Set<string>();
  for (const e of entries) {
    if (isSignatureOnly(e) || isUnchanged(e)) continue;
    if (e.before) out.add(e.before.identifier);
    if (e.after) out.add(e.after.identifier);
  }
  return [...out];
}

interface Worked { key: string; rows: ChangedResult[]; theirDates: ChangedResult[] | null }

function Effect(
  { ctx, base, entries, draft, item }:
  { ctx: ViewContext; base: Engine; entries: ChangeEntry[]; draft: Draft; item: Item | null },
) {
  const { vol, route: r } = ctx;
  const changing = entries.filter((e) => !isSignatureOnly(e) && !isUnchanged(e));
  const ids = changeIdentifiers(changing);
  const key = JSON.stringify(changing.map((e) => [e.id, e.after])) + JSON.stringify(draft.onTheirDates);
  const [worked, setWorked] = useState<Worked | null>(null);
  useEffect(() => {
    if (!changing.length) { setWorked({ key, rows: [], theirDates: null }); return; }
    const t = setTimeout(() => {
      const rows = changedBy(base, vol.cases, changing);
      // A version that starts after the households' dates changes none of
      // them: say what it would do on their own dates.
      let theirDates: ChangedResult[] | null = null;
      if (!rows.length && item && draft.onTheirDates) {
        const others = changing.filter((e) => e.id !== item.id);
        theirDates = changedBy(base, vol.cases, [...others, { id: item.id, chapter: vol.chapterOf[item.id] ?? "parameters", before: item, after: draft.onTheirDates }]);
      }
      setWorked({ key, rows, theirDates });
    }, 250);
    return () => clearTimeout(t);
  }, [key, base]);

  const ready = useReadIndex(base, vol.cases);
  const reach = ids.length && ready ? proposalReach(base, vol.cases, ids) : null;
  const fresh = worked && worked.key === key;
  return (
    <section class="card effect" aria-labelledby="effect-h" aria-busy={!fresh}>
      <h2 id="effect-h">Its effect on the stored households</h2>
      {!changing.length && (
        <p class="muted">
          {entries.length ? "Signatures and answers change no result: only a change to a figure or rule does." : "Nothing to work out yet."}
        </p>
      )}
      {ids.length > 0 && !ready && <p class="muted reach-wait">Working out which stored households read it…</p>}
      {reach && (
        <p class="reach">
          {readReachPhrase(reach.read.length, reach.reach.length, vol.cases.length)}.
        </p>
      )}
      {changing.length > 0 && !fresh && <p class="muted" role="status">Working out which stored results would change…</p>}
      {changing.length > 0 && fresh && <EffectResult ctx={ctx} base={base} worked={worked!} from={draft.from} />}
      {changing.length > 0 && (
        <details class="howcounted">
          <summary>How this is counted</summary>
          <p>{COUNT_DEFINITIONS.read}</p>
          <p>{COUNT_DEFINITIONS.reach}</p>
          <p>{COUNT_DEFINITIONS.changed}</p>
          <p>{COUNT_DEFINITIONS.outcome}</p>
        </details>
      )}
      <p class="muted small">
        Stored households are the test households kept with the rules: <a href={buildHash({ ...r, view: "households", arg: null, params: {} })}>see them all</a>.
      </p>
    </section>
  );
}

function EffectResult({ ctx, base, worked, from }: { ctx: ViewContext; base: Engine; worked: Worked; from: string | null }) {
  const { rows, theirDates } = worked;
  if (!rows.length) {
    return (
      <>
        <p class="nochange"><b>{changedPhrase(0, 0)}.</b>{from && theirDates?.length ? <> Their results are for dates before {formatDate(from)}, when the new version starts.</> : null}</p>
        {theirDates && theirDates.length > 0 && (
          <>
            <p>
              Applied on the households' own dates instead, as a correction would be:{" "}
              <b>{changedPhrase(theirDates.length, householdCount(theirDates))}</b>.
            </p>
            <Split ctx={ctx} base={base} rows={theirDates} before="Now" after="With the new figure" />
          </>
        )}
      </>
    );
  }
  return (
    <>
      <p><b>{changedPhrase(rows.length, householdCount(rows))}</b>.</p>
      <Split ctx={ctx} base={base} rows={rows} before="Now" after="With your proposal" />
    </>
  );
}

function Split(
  { ctx, base, rows, before, after }:
  { ctx: ViewContext; base: Engine; rows: ChangedResult[]; before: string; after: string },
) {
  const { vol, route: r } = ctx;
  const { outcomes, steps } = changedSplit(base, rows);
  return (
    <>
      <h3>Outcomes that change ({outcomes.length})</h3>
      {outcomes.length
        ? <ChangedTable engine={base} cases={vol.cases} route={r} rows={outcomes} before={before} after={after} />
        : <p class="muted">No program outcome changes: eligibility, categories and amounts stay as they are.</p>}
      <h3>Steps on the way that change ({steps.length})</h3>
      {steps.length
        ? <ChangedTable engine={base} cases={vol.cases} route={r} rows={steps} before={before} after={after} />
        : <p class="muted">No step on the way changes.</p>}
    </>
  );
}

// ---------------------------------------------------------------- approvers and sending

function Approvers({ ctx, base, entries }: { ctx: ViewContext; base: Engine; entries: ChangeEntry[] }) {
  const { vol, persona } = ctx;
  const myRoles = persona ? personaRoles(persona, base.meta) : [];
  const list = proposalApprovers(base, { entries }, { steward: stewardOf(vol), myRoles });
  return (
    <section class="card approvers" aria-labelledby="approvers-h">
      <h2 id="approvers-h">Who must approve</h2>
      {!list.length && <p class="muted">Nobody yet: your proposal holds nothing.</p>}
      <ul class="approverlist">
        {list.map((a) => (
          <li key={a.role} class={a.mine ? "mine" : ""} data-role={a.role}>
            <b>{a.role}</b>
            <ul class="why">
              {a.reasons.slice(0, 4).map((w) => <li key={w}>{w}</li>)}
              {a.reasons.length > 4 && <li class="muted">and {a.reasons.length - 4} more</li>}
            </ul>
            {a.mine && !a.steward && (
              <p class="own-change" role="note">
                You work as this role, but this is your own change: another {a.role} approves it once it is proposed.
              </p>
            )}
          </li>
        ))}
      </ul>
      {list.length > 0 && (
        <p class="muted small">From the volume's approval policy. Nothing is in force until they approve and the steward merges it.</p>
      )}
    </section>
  );
}

function Send({ ctx, pending }: { ctx: ViewContext; pending: boolean }) {
  const { vol } = ctx;
  const cs = changeSetSig.value;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const staged = proposalCount() > 0;
  const hasToken = !BUNDLED && Boolean(credentials.get("github"));
  const blocked = proposeBlocked();
  const propose = async () => {
    setBusy(true);
    setError("");
    try { await proposeStaged(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <section class="card send" aria-labelledby="send-h">
      <h2 id="send-h">Send it</h2>
      {pending && <p class="note">Add the change above to your proposal first; then it can be sent.</p>}
      {BUNDLED && (
        <p class="preview-note" role="note">
          This is a preview copy: it cannot send a change for review. Download this change and send the file to
          {" "}{stewardText(stewardOf(vol))}.
        </p>
      )}
      {!staged && !pending && <p class="muted">Nothing to send yet.</p>}
      {staged && hasToken && (
        <>
          <p class="sendactions">
            <button class="btn primary propose" disabled={Boolean(blocked) || busy} onClick={propose}>
              {busy ? "Proposing…" : "Propose"}
            </button>
            <button class="btn download" onClick={() => downloadStagedChange("change")}>Download this change</button>
          </p>
          {blocked && <p class="muted">{blocked}</p>}
          <p class="muted small">Propose opens it for review (a pull request); the roles above are asked to approve.</p>
        </>
      )}
      {staged && !hasToken && (
        <>
          <SendChange kind="change" onPage />
          <p class="sendactions">
            <button class="btn propose" disabled title={blocked ?? undefined}>Propose</button>
            {blocked && <span class="muted"> {blocked}</span>}
          </p>
        </>
      )}
      {error && <p class="bad" role="alert">{error}</p>}
    </section>
  );
}

