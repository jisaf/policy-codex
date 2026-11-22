/* The item page's right rail (docs/design-unified-ui.md, Item § 8): the
 * sign-off panel (the App's approval card in Blind B's layout: figure today,
 * what changed, what it affects, sources, why you sign, a name required, and
 * never a signature on the reader's own staged change), "Propose a change"
 * (a structured editor: add a dated version or correct one, with the
 * excerpt picked by its title) and "Ask a question". Every action stages a
 * change in the tray; Changes › My proposal sends it. */
import { useSignal } from "@preact/signals";
import { useMemo } from "preact/hooks";
import type { Engine } from "../../engine/engine";
import type { Item } from "../../engine/types";
import { fileEntries, type ChangeEntry } from "../../changes/types";
import type { LoadedVolume } from "../../ledger/load";
import { approvalStatus, type SignAction } from "../approvals";
import { householdCount, restingOnUnverified, restingPhrase } from "../counts";
import {
  canSign, figureOn, inboxRows, isOwnStagedChange, signatureEntries, signatureNotice, withoutSignature,
} from "../inbox";
import { personaRoles, type Persona } from "../personas";
import { noVersionReason, Value } from "../Present";
import { formatDate } from "../present";
import { programLabel } from "../roles";
import { versionInForce } from "../../engine/versions";
import { unverifiedIds } from "../provenance";
import type { StoredResult } from "../questionEffects";
import { buildHash, type Route } from "../router";
import {
  changeSetSig, ledgerSource, modeSig, openEditor, putChangeEntries, putChangeEntry, putFileChange,
} from "../state";
import {
  appendQuestion, applyFigureEdit, citedSources, figureText, figureVersions, parseFigure,
} from "./model";

/** The name the sign-off list also signs with (InboxView `SIGNER_KEY`). */
const SIGNER_KEY = "codex.signer";

function readSigner(): string {
  try { return localStorage.getItem(SIGNER_KEY) ?? ""; } catch { return ""; }
}

function saveSigner(name: string): void {
  try { localStorage.setItem(SIGNER_KEY, name); } catch { /* blocked */ }
}

interface RailProps {
  /** The ledger as loaded: signatures and edits are staged against it. */
  base: Engine;
  vol: LoadedVolume;
  route: Route;
  persona: Persona | null;
  item: Item;
  today: string;
  resting: Map<string, StoredResult[]> | null;
}

function NameField({ name, need }: { name: { value: string }; need: boolean }) {
  return (
    <label class="field">Your name
      <input
        value={name.value} placeholder="e.g. Dana Lee (HCPF)" autocomplete="name"
        aria-invalid={need && !name.value.trim() ? "true" : undefined}
        onInput={(e) => { name.value = (e.target as HTMLInputElement).value; saveSigner(name.value); }}
      />
    </label>
  );
}

// ---- sign-off

export function SignOffPanel({ base, vol, route: r, persona, item, today, resting }: RailProps) {
  const a = approvalStatus(base, item);
  const mine = persona ? personaRoles(persona, base.meta) : [];
  const picked = useSignal<string | null>(null);
  const name = useSignal(readSigner());
  const need = useSignal(false);
  const notice = useSignal<string | null>(null);
  const cs = changeSetSig.value;
  const role = picked.value && a.required.includes(picked.value)
    ? picked.value
    : a.required.find((x) => mine.includes(x)) ?? (r.params.role && a.required.includes(r.params.role) ? r.params.role : null);
  const row = useMemo(() => (role
    ? inboxRows({
      engine: base, role, sources: vol.sources, cases: vol.cases, chapterOf: vol.chapterOf,
      changeSet: cs, resting, only: [item],
    })[0] ?? null
    : null), [base, role, vol, cs, resting, item]);

  if (!a.required.length) {
    return (
      <section class="railcard signoff" id="signoff" aria-labelledby="signoff-h">
        <h2 id="signoff-h">Sign-off</h2>
        <p class="muted">The approval policy asks no role to sign this item.</p>
      </section>
    );
  }

  const sign = (action: SignAction) => {
    if (!row || !role || !canSign(row)) return;
    const by = name.value.trim();
    if (!by) { need.value = true; return; }
    const sig = { role, by, date: today };
    const tainted = restingOnUnverified(base, unverifiedIds(vol.sources));
    const entries = signatureEntries(base, changeSetSig.value, vol.chapterOf, [item.id], sig, action, tainted);
    if (!entries.length) return;
    putChangeEntries(entries);
    notice.value = signatureNotice(base, entries, sig, action);
  };
  const undo = () => {
    const entry = row?.staged.entry;
    if (!entry || !role) return;
    const next = withoutSignature(entry, role);
    putChangeEntries(next ? [next] : [], next ? [] : [entry.id]);
    notice.value = "Your signature is taken back out of your proposal.";
  };
  const sources = citedSources(item);
  const figure = item.kind === "parameter" ? figureOn(base, item, today) : undefined;
  const inForce = item.kind === "parameter" ? versionInForce(item, today) : null;
  // "it is a ColoradoWorks item": the program in words.
  const programWords = (s: string) => (base.meta.programs ?? []).reduce(
    (t, p) => t.replace(new RegExp(`\\b${p.id}\\b`, "g"), programLabel(p.id)), s);

  return (
    <section class="railcard signoff" id="signoff" aria-labelledby="signoff-h">
      <h2 id="signoff-h">Sign-off</h2>
      <p>
        <span class={`tag status-${a.status.toLowerCase()}`}>{a.status}</span>{" "}
        <span class="muted">{a.required.length - a.missing.length} of {a.required.length} {a.required.length === 1 ? "role" : "roles"} signed</span>
      </p>
      <ul class="signers">
        {a.required.map((x) => {
          const rec = item.approval?.find((s) => s.role === x);
          return (
            <li key={x} class={x === role ? "me" : ""}>
              <span>{x}{mine.includes(x) && <span class="muted"> (you)</span>}</span>{" "}
              {rec
                ? <span class="ipill ok">signed {formatDate(rec.date)}{rec.by ? ` by ${rec.by}` : ""}</span>
                : <span class="ipill">not signed</span>}
            </li>
          );
        })}
      </ul>
      <label class="field">Sign as
        <select value={role ?? ""} onChange={(e) => { picked.value = (e.target as HTMLSelectElement).value || null; notice.value = null; }}>
          {!role && <option value="">Choose your role…</option>}
          {a.required.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      {row && (
        <>
          <dl class="facts">
            {item.kind === "parameter" && (
              <>
                <dt>Figure today</dt>
                <dd>
                  {noVersionReason(item, today) ?? (figure !== null && typeof figure === "object"
                    ? <a href="#versions">A table of {Object.keys(figure as object).length} rows{inForce ? `, in force since ${formatDate(inForce.from)}` : ""}</a>
                    : <Value item={item} value={figure} />)}
                </dd>
              </>
            )}
            <dt>What changed</dt>
            <dd>
              {row.change.kind === "new" && "New, never approved."}
              {row.change.kind === "approved" && "Approved, and unchanged since."}
              {(row.change.kind === "staged" || row.change.kind === "proposed") && (
                <ul class="plaindiff">
                  {row.change.lines.map((l, i) => (
                    <li key={i}>
                      <b>{l.what}</b>
                      {l.before !== undefined && <>: <del>{l.before}</del></>}
                      {l.after !== undefined && <>{l.before !== undefined ? " → " : ": "}<ins>{l.after}</ins></>}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
            <dt>What it affects</dt>
            <dd>
              <a href="#affects">{row.outcomes.length} program outcome{row.outcomes.length === 1 ? "" : "s"}</a>;{" "}
              {row.restingKnown
                ? <a href="#households">{restingPhrase(row.resting.length, householdCount(row.resting)).replace(/^No/, "no")}</a>
                : <span class="muted">working out the stored households…</span>}
            </dd>
            <dt>Sources</dt>
            <dd>{sources.length ? <a href="#law">{sources.length} excerpt{sources.length === 1 ? "" : "s"}, word for word</a> : <span class="muted">None cited.</span>}</dd>
            <dt>Why you sign</dt>
            <dd>{row.why.length ? `${programWords(row.why.join("; ")).replace(/^./, (c) => c.toUpperCase())}.` : "The approval policy names this role."}</dd>
          </dl>
          {row.restsOnUnverified && (
            <p class="warnbox small">It rests on text that is not a verified quotation, so it stays Draft whoever signs.</p>
          )}
          {row.signed && <p class="ipill ok">The {role} has signed it.</p>}
          {row.staged.signed && (
            <p class="staged-note" role="status">
              Your signature is in your proposal. <button type="button" class="linkish" onClick={undo}>Take it back</button>
            </p>
          )}
          {isOwnStagedChange(row) && !row.signed && (
            <p class="own-change" role="note">
              You changed this item in your proposal, so you cannot sign it: another reviewer for the role signs it once it is sent.
            </p>
          )}
          {canSign(row) && (
            <>
              <NameField name={name} need={need.value} />
              {need.value && !name.value.trim() && <p class="bad small">Type your name first: it goes on the signature.</p>}
              <div class="btnrow">
                <button type="button" class="btn primary approve" onClick={() => sign("approve")}>Approve as {role}</button>
                <button type="button" class="btn review" onClick={() => sign("review")}>Mark reviewed</button>
              </div>
            </>
          )}
          {notice.value && (
            <p class="notice" role="status">
              {notice.value} <a href={buildHash({ ...r, view: "changes", arg: "proposal", params: {} })}>See my proposal</a>
            </p>
          )}
        </>
      )}
    </section>
  );
}

// ---- propose a change

function stagedEntry(id: string): ChangeEntry | undefined {
  return changeSetSig.value.entries.find((e) => e.id === id);
}

/** Stages `after` against the ledger's item, on top of anything already
 *  staged for it (a signature, an earlier edit). */
function stage(base: Engine, vol: LoadedVolume, item: Item, edit: (current: Item) => Item | string): string | null {
  const prior = stagedEntry(item.id);
  const before = prior?.before ?? base.itemById(item.id) ?? item;
  const current = prior?.after ?? before;
  const next = edit(JSON.parse(JSON.stringify(current)) as Item);
  if (typeof next === "string") return next;
  putChangeEntry({ id: item.id, chapter: prior?.chapter ?? vol.chapterOf[item.id] ?? "parameters", before, after: next });
  return null;
}

function TableInputs({ rows, set }: { rows: Record<string, string>; set: (r: Record<string, string>) => void }) {
  return (
    <div class="tableinputs">
      {Object.keys(rows).map((k) => (
        <label key={k} class="inline">
          <span>{k}</span>
          <input inputMode="decimal" value={rows[k]} onInput={(e) => set({ ...rows, [k]: (e.target as HTMLInputElement).value })} />
        </label>
      ))}
    </div>
  );
}

function FigureForm({ base, vol, item, today, done }: RailProps & { done: (msg: string) => void }) {
  const vs = figureVersions(item, today);
  const versioned = Array.isArray(item.versions);
  const latest = vs[vs.length - 1]?.version;
  const mode = useSignal<"add" | "correct">(versioned ? "add" : "correct");
  const at = useSignal(vs.find((v) => v.current)?.version.from ?? latest?.from ?? "");
  const startValue = (from: string): unknown => (versioned ? vs.find((v) => v.version.from === from)?.version.value ?? latest?.value : item.value);
  const seed = mode.value === "add" ? latest?.value : startValue(at.value);
  const isTable = seed !== null && typeof seed === "object";
  const from = useSignal("");
  const text = useSignal(isTable ? "" : figureText(item, seed));
  const rows = useSignal<Record<string, string>>(isTable ? Object.fromEntries(Object.entries(seed as object).map(([k, v]) => [k, String(v)])) : {});
  const source = useSignal("");
  const error = useSignal("");
  const reseed = (v: unknown) => {
    if (v !== null && typeof v === "object") rows.value = Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, String(x)]));
    else text.value = figureText(item, v);
  };
  const excerpts = citedSources(item).map((id) => vol.sources.find((s) => s.id === id)).filter((s) => !!s);
  const submit = (e: Event) => {
    e.preventDefault();
    error.value = "";
    const value = isTable
      ? Object.fromEntries(Object.entries(rows.value).map(([k, v]) => [k, parseFigure({ type: "number" }, v)]))
      : parseFigure(item, text.value);
    if (isTable && Object.values(value as object).some((v) => typeof v !== "number")) { error.value = "Every row needs a number."; return; }
    const err = stage(base, vol, item, (cur) => {
      if (!versioned) {
        if (JSON.stringify(cur.value) === JSON.stringify(value)) return "That is the figure already there: nothing would change.";
        return { ...cur, value };
      }
      const out = applyFigureEdit(cur, mode.value === "add"
        ? { kind: "add", from: from.value, value, source: source.value }
        : { kind: "correct", from: at.value, value, source: source.value });
      return "error" in out ? out.error : out.item;
    });
    if (err) { error.value = err; return; }
    done(mode.value === "add" ? `A new version from ${formatDate(from.value)} is in your proposal.` : "Your correction is in your proposal.");
  };
  return (
    <form class="propose-form" onSubmit={submit}>
      {versioned && (
        <fieldset>
          <legend>What changes</legend>
          <label class="radio">
            <input type="radio" name="pmode" checked={mode.value === "add"} onChange={() => { mode.value = "add"; reseed(latest?.value); }} />
            Add a new dated version <span class="muted small">(the law or the figure changes on a date)</span>
          </label>
          <label class="radio">
            <input type="radio" name="pmode" checked={mode.value === "correct"} onChange={() => { mode.value = "correct"; reseed(startValue(at.value)); }} />
            Correct a version <span class="muted small">(it was transcribed wrongly)</span>
          </label>
        </fieldset>
      )}
      {versioned && mode.value === "add" && (
        <label class="field">First day it applies
          <input type="date" name="from" value={from.value} onInput={(e) => { from.value = (e.target as HTMLInputElement).value; }} />
        </label>
      )}
      {versioned && mode.value === "correct" && (
        <label class="field">The version to correct
          <select value={at.value} onChange={(e) => { at.value = (e.target as HTMLSelectElement).value; reseed(startValue(at.value)); }}>
            {vs.map((v) => <option key={v.version.from} value={v.version.from}>From {formatDate(v.version.from)}</option>)}
          </select>
        </label>
      )}
      {isTable
        ? <fieldset><legend>The figures</legend><TableInputs rows={rows.value} set={(x) => { rows.value = x; }} /></fieldset>
        : (
          <label class="field">The figure{item.type === "rate" ? " (a percentage, e.g. 142%)" : ""}
            <input name="value" value={text.value} onInput={(e) => { text.value = (e.target as HTMLInputElement).value; }} />
          </label>
        )}
      {versioned && (
        <label class="field">The text it is taken from
          <select value={source.value} onChange={(e) => { source.value = (e.target as HTMLSelectElement).value; }}>
            <option value="">{mode.value === "add" ? "Not cited yet" : "Keep the version's excerpt"}</option>
            {excerpts.map((s) => <option key={s!.id} value={s!.id}>{s!.title}</option>)}
          </select>
        </label>
      )}
      {error.value && <p class="bad" role="alert">{error.value}</p>}
      <button type="submit" class="btn primary">Add to my proposal</button>
    </form>
  );
}

function MeaningForm({ base, vol, item, done }: RailProps & { done: (msg: string) => void }) {
  const text = useSignal(stagedEntry(item.id)?.after?.meaning ?? item.meaning ?? "");
  const error = useSignal("");
  const submit = (e: Event) => {
    e.preventDefault();
    const meaning = text.value.trim();
    const err = stage(base, vol, item, (cur) => {
      if (!meaning) return "Say what it means.";
      if (meaning === (cur.meaning ?? "").trim()) return "That is what it already says: nothing would change.";
      return { ...cur, meaning };
    });
    if (err) { error.value = err; return; }
    error.value = "";
    done("Your new wording is in your proposal.");
  };
  return (
    <form class="propose-form" onSubmit={submit}>
      <label class="field">What it means
        <textarea rows={6} value={text.value} onInput={(e) => { text.value = (e.target as HTMLTextAreaElement).value; }} />
      </label>
      <p class="muted small">How the rule is decided is changed in edit mode, by the people who maintain the rules.</p>
      {error.value && <p class="bad" role="alert">{error.value}</p>}
      <button type="submit" class="btn primary">Add to my proposal</button>
    </form>
  );
}

export function ProposeChange(props: RailProps) {
  const open = useSignal(false);
  const msg = useSignal<string | null>(null);
  const { item, route: r } = props;
  const done = (m: string) => { msg.value = m; open.value = false; };
  return (
    <section class="railcard propose" id="propose" aria-labelledby="propose-h">
      <h2 id="propose-h">Propose a change</h2>
      {!open.value && (
        <button type="button" class="btn wide" aria-expanded="false" onClick={() => { open.value = true; msg.value = null; }}>
          {item.kind === "parameter" ? "Change the figure" : "Change what it means"}
        </button>
      )}
      {open.value && (
        <>
          {item.kind === "parameter" ? <FigureForm {...props} done={done} /> : <MeaningForm {...props} done={done} />}
          <button type="button" class="linkish" onClick={() => { open.value = false; }}>Cancel</button>
        </>
      )}
      {msg.value && (
        <p class="notice" role="status">
          {msg.value} <a href="#affects">Compare the stored households</a> · <a href={buildHash({ ...r, view: "changes", arg: "proposal", params: {} })}>See my proposal</a>
        </p>
      )}
      {modeSig.value === "edit" && (
        <button type="button" class="linkish small" onClick={() => openEditor(item.id)}>Open the full editor (implementers)</button>
      )}
    </section>
  );
}

// ---- ask a question

export function AskQuestion({ base, vol, route: r, persona, item, today }: RailProps) {
  const open = useSignal(false);
  const text = useSignal("");
  const name = useSignal(readSigner());
  const busy = useSignal(false);
  const error = useSignal("");
  const asked = useSignal<string | null>(null);
  const required = base.approvals(item);
  const mine = persona ? personaRoles(persona, base.meta) : [];
  const owner = required.find((x) => !mine.includes(x)) ?? required[0] ?? mine[0] ?? "Data steward";
  const submit = async (e: Event) => {
    e.preventDefault();
    error.value = "";
    const q = text.value.trim();
    if (!q) { error.value = "Write the question."; return; }
    if (!name.value.trim()) { error.value = "Type your name: it goes on the question."; return; }
    busy.value = true;
    try {
      const path = `${vol.path}/open-questions.md`;
      const staged = fileEntries(changeSetSig.value).find((f) => f.path === path);
      const before = staged?.before ?? await ledgerSource().readText(path);
      const baseText = staged?.after ?? before;
      const firstStop = q.search(/[?.](\s|$)/);
      const title = firstStop > 0 ? q.slice(0, firstStop) : q;
      const out = appendQuestion(baseText, {
        title, body: q, items: [item.id], owner, askedBy: name.value, date: today,
      });
      putFileChange({ path, before, after: out.text, label: `New question ${out.id} on ${item.id}` });
      asked.value = out.id;
      text.value = "";
      open.value = false;
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      busy.value = false;
    }
  };
  return (
    <section class="railcard ask" id="ask" aria-labelledby="ask-h">
      <h2 id="ask-h">Ask a question</h2>
      {!open.value && (
        <button type="button" class="btn wide" onClick={() => { open.value = true; asked.value = null; }}>Ask a question about it</button>
      )}
      {open.value && (
        <form class="ask-form" onSubmit={submit}>
          <label class="field">Your question
            <textarea rows={4} value={text.value} placeholder="What is unclear or possibly wrong?" onInput={(e) => { text.value = (e.target as HTMLTextAreaElement).value; }} />
          </label>
          <NameField name={name} need={Boolean(error.value)} />
          <p class="muted small">It goes to the {owner}, as a new open question on this item.</p>
          {error.value && <p class="bad" role="alert">{error.value}</p>}
          <button type="submit" class="btn primary" disabled={busy.value}>Add to my proposal</button>{" "}
          <button type="button" class="linkish" onClick={() => { open.value = false; }}>Cancel</button>
        </form>
      )}
      {asked.value && (
        <p class="notice" role="status">
          Your question ({asked.value}) is in your proposal. <a href={buildHash({ ...r, view: "changes", arg: "proposal", params: {} })}>See my proposal</a>
        </p>
      )}
    </section>
  );
}

export function Rail(props: RailProps) {
  return (
    <aside class="itemrail" aria-label="Sign, propose, ask">
      <SignOffPanel {...props} />
      <ProposeChange {...props} />
      <AskQuestion {...props} />
    </aside>
  );
}
