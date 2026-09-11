import type { Engine } from "../engine/engine";
import type { ChangeEntry } from "../changes/types";
import { AiPanel } from "./AiPanel";
import { FormEditor } from "./FormEditor";
import { TextEditor } from "./TextEditor";
import {
  closeEditor, editingSig, engineSig, putChangeEntry, viewEngine, volumeSig,
  type EditingState,
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

export function ItemEditor() {
  const state = editingSig.value;
  const engine = viewEngine() ?? engineSig.value;
  const vol = volumeSig.value;
  if (!state || !engine || !vol) return null;

  // `before` must be the base ledger's version of the item, not the tray-applied
  // one, or re-editing a staged item records the staged version as `before`.
  const baseEngine = engineSig.value ?? engine;

  const setDraft = (draft: EditingState["draft"]) => {
    editingSig.value = { ...state, draft };
  };
  const report = engine.constraints(state.draft);
  const blocking = report.filter((c) => !c.ok && c.level === "error");

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
          <FormEditor engine={engine} draft={state.draft} onChange={setDraft} />
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
          {blocking.length > 0 && (
            <span class="bad">
              {blocking.length} problem(s); Propose will be blocked until they are fixed.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
