import { useSignal } from "@preact/signals";
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import type { ChangeEntry } from "../changes/types";
import { ratchetGovernance } from "../changes/validate";
import { AiPanel } from "./AiPanel";
import { FormEditor } from "./FormEditor";
import { TextEditor } from "./TextEditor";
import { buildHash } from "./router";
import { search } from "./search";
import {
  closeEditor, editingSig, engineSig, navigate, putChangeEntry, route, searchIndexSig,
  viewEngine, volumeSig, type EditingState,
} from "./state";

export function draftEntry(state: EditingState, engine: Engine): ChangeEntry {
  return {
    id: state.id ?? state.draft.id,
    chapter: state.chapter,
    before: state.id ? (engine.itemById(state.id) ?? null) : null,
    after: state.draft,
  };
}

const PRIMARY_SURFACE: { key: EditingState["surface"]; label: string } = { key: "form", label: "Form" };
/** Text and AI are the same surfaces as always; the wizard just tucks them
 *  under a disclosure so a first-time steward meets the guided form first. */
const ADVANCED_SURFACES: Array<{ key: EditingState["surface"]; label: string }> = [
  { key: "text", label: "Text" },
  { key: "ai", label: "AI" },
];

/** One sentence each, in the order the wizard offers them. */
const KIND_CHOICES: Array<{ kind: Item["kind"]; title: string; blurb: string }> = [
  {
    kind: "supplied",
    title: "A fact we are told",
    blurb: "Something a person or agency tells us directly, like a birthdate or an address.",
  },
  {
    kind: "derived",
    title: "A rule",
    blurb: "Something the ledger works out from other facts, like an age range or a test the household must pass.",
  },
  {
    kind: "parameter",
    title: "A number set by policy",
    blurb: "A number or setting fixed by policy, like an income limit or a benefit amount.",
  },
];

/** How many existing items the start step offers before the steward may add. */
const START_HITS = 8;

/** A new item starts here: the ledger is searched first, and only a steward who
 *  has looked and found nothing goes on to the form. */
function StartStep({ engine, state }: { engine: Engine; state: EditingState }) {
  const q = useSignal("");
  const r = route.value;
  const index = searchIndexSig.value;
  const hits = index
    ? search(index, q.value, 100).filter((h) => h.kind === "item").slice(0, START_HITS)
    : [];

  const create = () => {
    const name = q.value.trim();
    editingSig.value = {
      ...state, step: "kind",
      draft: { ...state.draft, name, identifier: engine.slug(name) },
    };
  };

  return (
    <div class="start">
      <p class="muted">
        Search the ledger first. The fact you need may already be here under
        another name.
      </p>
      <label class="wide">What is the fact called?
        <input
          class="startsearch" name="start" type="search" value={q.value}
          onInput={(e) => { q.value = (e.target as HTMLInputElement).value; }}
        />
      </label>
      <ul class="hits">
        {hits.map((h) => (
          <li key={h.id}>
            <strong>{h.title}</strong>
            <small>{h.subtitle}</small>
            <a
              class="openhit"
              href={buildHash({ ...r, view: "item", arg: h.id, params: {} })}
              onClick={closeEditor}
            >Open</a>
          </li>
        ))}
      </ul>
      <div class="actions">
        <button class="btn create" onClick={create}>Create new item</button>
        <button class="btn" onClick={closeEditor}>Cancel</button>
      </div>
    </div>
  );
}

/** The wizard's "what are you adding?" choice: a new item's kind decides the
 *  fields FormEditor shows next, so it is picked before the form opens. */
function KindStep({ state }: { state: EditingState }) {
  const choose = (kind: Item["kind"]) => {
    editingSig.value = {
      ...state, step: "edit",
      draft: { ...state.draft, kind, scope: kind === "parameter" ? "global" : "person" },
    };
  };

  return (
    <div class="kindstep">
      <p class="muted">What are you adding?</p>
      <div class="kindchoices">
        {KIND_CHOICES.map((c) => (
          <button
            key={c.kind} class="kindchoice" data-kind={c.kind}
            onClick={() => choose(c.kind)}
          >
            <strong>{c.title}</strong>
            <span>{c.blurb}</span>
          </button>
        ))}
      </div>
      <div class="actions">
        <button class="btn" onClick={() => { editingSig.value = { ...state, step: "start" }; }}>
          Back
        </button>
        <button class="btn" onClick={closeEditor}>Cancel</button>
      </div>
    </div>
  );
}

export function ItemEditor() {
  const state = editingSig.value;
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  if (!state || !engine || !vol) return null;

  if (state.step === "start") {
    return (
      <div class="overlay">
        <div class="sheet editor">
          <div class="cardhead">
            <h2>New item {state.draft.id}</h2>
          </div>
          <StartStep engine={engine} state={state} />
        </div>
      </div>
    );
  }

  if (state.step === "kind") {
    return (
      <div class="overlay">
        <div class="sheet editor">
          <div class="cardhead">
            <h2>New item {state.draft.id}</h2>
          </div>
          <KindStep state={state} />
        </div>
      </div>
    );
  }

  // `before` must be the base ledger's version of the item, not the tray-applied
  // one, or re-editing a staged item records the staged version as `before`.
  const baseEngine = engineSig.value ?? engine;

  const setDraft = (draft: EditingState["draft"]) => {
    editingSig.value = { ...state, draft };
  };
  // Not `!state.id`: reopening a staged new item from the tray (openEditor)
  // sets `state.id` to that item's own id, since it already exists in
  // viewEngine() (the base ledger with the tray applied). Whether it is new
  // is about the *base* ledger, before the tray: no base version means the
  // rationale rule still applies, exactly as it did when the item was first
  // staged.
  const baseItem = baseEngine.itemById(state.id ?? "");
  const isNew = !baseItem;
  const report = engine.constraints(state.draft);
  // Same ratchet the tray applies (src/changes/validate.ts): an edit does
  // not gain a new blocking error for a rule the base version already
  // failed, so the editor's problem count agrees with what Propose will
  // actually block on.
  const rawFindings = engine.governance(state.draft, { isNew });
  const findings = baseItem
    ? ratchetGovernance(rawFindings, baseEngine.governance(baseItem))
    : rawFindings;
  const blocking = report.filter((c) => !c.ok && c.level === "error").length +
    findings.filter((f) => f.level === "error").length;

  return (
    <div class="overlay">
      <div class="sheet editor">
        <div class="cardhead">
          <h2>{state.id ? `Edit ${state.id}` : `New item ${state.draft.id}`}</h2>
          <span class="spacer" />
          <div class="tabs">
            <button
              data-surface={PRIMARY_SURFACE.key}
              class={state.surface === PRIMARY_SURFACE.key ? "on" : ""}
              onClick={() => { editingSig.value = { ...state, surface: PRIMARY_SURFACE.key }; }}
            >{PRIMARY_SURFACE.label}</button>
            <details class="advanced" open={state.surface !== "form"}>
              <summary>Advanced</summary>
              <div class="advtabs">
                {ADVANCED_SURFACES.map((s) => (
                  <button
                    key={s.key} data-surface={s.key}
                    class={state.surface === s.key ? "on" : ""}
                    onClick={() => { editingSig.value = { ...state, surface: s.key }; }}
                  >{s.label}</button>
                ))}
              </div>
            </details>
          </div>
          <label>Chapter
            <select
              value={state.chapter}
              disabled={Boolean(state.id)}
              title={state.id ? "Moving an item between chapters is not supported yet." : undefined}
              onChange={(e) => {
                editingSig.value = {
                  ...state, chapter: (e.target as HTMLSelectElement).value,
                };
              }}
            >
              {[...new Set(Object.values(vol.chapterOf))].sort().map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        {state.surface === "form" && (
          <FormEditor
            engine={engine} draft={state.draft} onChange={setDraft} isNew={isNew}
            onOpenInstead={(id) => {
              closeEditor();
              navigate({ view: "item", arg: id, params: {} });
            }}
          />
        )}
        {state.surface === "text" && (
          <TextEditor engine={engine} draft={state.draft} onChange={setDraft} />
        )}
        {state.surface === "ai" && (
          <AiPanel engine={engine} state={state} onDraft={setDraft} />
        )}

        <h4>Constraints</h4>
        <ul class="constraints">
          {report.map((c) => (
            <li key={c.msg} class={c.ok ? (c.level === "warn" ? "warn" : "ok") : "bad"}>
              {c.msg}
            </li>
          ))}
          {findings.map((f) => (
            <li key={`${f.rule} ${f.msg}`} class={f.level === "error" ? "bad" : "warn"}>
              <span class="tag">{f.rule}</span> {f.msg}
            </li>
          ))}
        </ul>

        <div class="actions">
          <button
            class="btn save"
            onClick={() => {
              putChangeEntry(draftEntry(state, baseEngine));
              closeEditor();
            }}
          >Save to tray</button>
          {state.id && (
            <button
              class="btn danger"
              onClick={() => {
                putChangeEntry({
                  id: state.id!, chapter: state.chapter,
                  before: baseEngine.itemById(state.id!) ?? null, after: null,
                });
                closeEditor();
              }}
            >Delete item</button>
          )}
          <button class="btn" onClick={closeEditor}>Cancel</button>
          {blocking > 0 && (
            <span class="bad">
              {blocking} problem(s); Propose will be blocked until they are fixed.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
