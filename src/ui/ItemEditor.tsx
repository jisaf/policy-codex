import { useSignal } from "@preact/signals";
import type { Engine } from "../engine/engine";
import type { ChangeEntry } from "../changes/types";
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

const SURFACES: Array<{ key: EditingState["surface"]; label: string }> = [
  { key: "form", label: "Form" },
  { key: "text", label: "Text" },
  { key: "ai", label: "AI" },
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
      ...state, step: "edit",
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

  // `before` must be the base ledger's version of the item, not the tray-applied
  // one, or re-editing a staged item records the staged version as `before`.
  const baseEngine = engineSig.value ?? engine;

  const setDraft = (draft: EditingState["draft"]) => {
    editingSig.value = { ...state, draft };
  };
  const isNew = !state.id;
  const report = engine.constraints(state.draft);
  const findings = engine.governance(state.draft, { isNew });
  const blocking = report.filter((c) => !c.ok && c.level === "error").length +
    findings.filter((f) => f.level === "error").length;

  return (
    <div class="overlay">
      <div class="sheet editor">
        <div class="cardhead">
          <h2>{state.id ? `Edit ${state.id}` : `New item ${state.draft.id}`}</h2>
          <span class="spacer" />
          <div class="tabs">
            {SURFACES.map((s) => (
              <button
                key={s.key} data-surface={s.key}
                class={state.surface === s.key ? "on" : ""}
                onClick={() => { editingSig.value = { ...state, surface: s.key }; }}
              >{s.label}</button>
            ))}
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
