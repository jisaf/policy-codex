import { useSignal } from "@preact/signals";
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import { streamChat } from "../ai/client";
import { PROVIDERS, providerById } from "../ai/providers";
import {
  draftFromSourcePrompt, explainDerivationPrompt, suggestDerivationPrompt, systemPrompt,
} from "../ai/prompt";
import { parseProposal, proposalToItem } from "../ai/proposal";
import { credentials, volumeSig, workerBaseSig, type EditingState } from "./state";

interface Props { engine: Engine; state: EditingState; onDraft: (next: Item) => void }

export function AiPanel({ engine, state, onDraft }: Props) {
  const providerId = useSignal(PROVIDERS[0].id);
  const model = useSignal(PROVIDERS[0].defaultModel);
  const sourceId = useSignal("");
  const hints = useSignal("");
  const status = useSignal("");
  const notes = useSignal("");
  const errors = useSignal<string[]>([]);
  const busy = useSignal(false);

  const vol = volumeSig.value;
  const provider = providerById(providerId.value)!;
  const workerBase = workerBaseSig.value;
  const key = credentials.get("ai");

  const run = async (user: string, apply: boolean) => {
    if (!vol) return;
    if (!workerBase) { status.value = "Set the AI worker URL in Settings."; return; }
    if (!key) { status.value = "Add a provider key in Settings."; return; }
    busy.value = true;
    status.value = "Asking the model…";
    notes.value = "";
    errors.value = [];
    let received = 0;
    try {
      const text = await streamChat(
        {
          workerBase, provider, model: model.value, key,
          system: systemPrompt(engine, vol.sources), user,
        },
        (c) => {
          received += c.content.length;
          status.value = `Streaming… ${received} characters` +
            (c.reasoningChars ? `, ${c.reasoningChars} reasoning` : "");
        },
      );
      const proposal = parseProposal(text);
      notes.value = proposal.notes;
      if (apply && proposal.items.length) {
        const { item, errors: itemErrors } = proposalToItem(
          engine, proposal.items[0], state.draft.id,
        );
        errors.value = itemErrors;
        onDraft({
          ...state.draft, ...item,
          tests: item.tests!.length ? item.tests : state.draft.tests,
          sources: item.sources!.length ? item.sources : state.draft.sources,
        });
        status.value = proposal.items.length > 1
          ? `Applied the first of ${proposal.items.length} proposed items to the draft.`
          : "Applied the proposed item to the draft.";
      } else {
        status.value = "Done.";
      }
    } catch (e) {
      status.value = (e as Error).message;
    } finally {
      busy.value = false;
    }
  };

  const source = vol?.sources.find((s) => s.id === sourceId.value);

  return (
    <div class="aipanel">
      <div class="controls">
        <label>Provider
          <select
            value={providerId.value}
            onChange={(e) => {
              providerId.value = (e.target as HTMLSelectElement).value;
              model.value = providerById(providerId.value)!.defaultModel;
            }}
          >
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label>Model
          <select
            value={model.value}
            onChange={(e) => { model.value = (e.target as HTMLSelectElement).value; }}
          >
            {provider.models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label>Source
          <select
            value={sourceId.value}
            onChange={(e) => { sourceId.value = (e.target as HTMLSelectElement).value; }}
          >
            <option value="">choose…</option>
            {(vol?.sources ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.id} {s.title}</option>
            ))}
          </select>
        </label>
      </div>
      <p class="muted">{provider.hint}</p>
      <label class="wide">Hints for the model
        <textarea
          rows={2} value={hints.value}
          onInput={(e) => { hints.value = (e.target as HTMLTextAreaElement).value; }}
        />
      </label>
      <div class="actions">
        <button
          class="btn" disabled={busy.value || !source}
          onClick={() => run(draftFromSourcePrompt(source!, hints.value), true)}
        >Draft from {sourceId.value || "a source"}</button>
        <button
          class="btn" disabled={busy.value}
          onClick={() => run(suggestDerivationPrompt(engine, state.draft, hints.value), true)}
        >Suggest a derivation</button>
        <button
          class="btn" disabled={busy.value || !state.draft.derived}
          onClick={() => run(explainDerivationPrompt(engine, state.draft), false)}
        >Explain this derivation</button>
      </div>
      {status.value && <p class="status">{status.value}</p>}
      {notes.value && <blockquote class="notes">{notes.value}</blockquote>}
      {errors.value.length > 0 && (
        <ul class="diagnostics">
          {errors.value.map((e) => <li key={e} class="bad">{e}</li>)}
        </ul>
      )}
      <p class="muted">
        Nothing here reaches the tray until you press Save on the Form or Text tab.
      </p>
    </div>
  );
}
