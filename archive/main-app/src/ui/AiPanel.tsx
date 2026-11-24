import { useSignal } from "@preact/signals";
import { useLayoutEffect } from "preact/hooks";
import type { Engine } from "../engine/engine";
import type { Item } from "../engine/types";
import { streamChat } from "../ai/client";
import { PROVIDERS, providerById } from "../ai/providers";
import {
  chunkByHeadings, draftFromDocumentPrompt, draftFromSourcePrompt, explainDerivationPrompt,
  extractExcerptsPrompt, suggestDerivationPrompt, systemPrompt,
} from "../ai/prompt";
import {
  parseExcerpts, parseProposal, proposalToItem, proposalToItems, type ProposalItem,
} from "../ai/proposal";
import { documentFilePath, fetchDocumentText } from "../ledger/documents";
import { appendExcerpts, nextSourceId, parseSources } from "../ledger/markdown";
import { fileEntries } from "../changes/types";
import {
  changeSetSig, credentials, ledgerSource, putChangeEntry, putFileChange, trayOpenSig,
  volumeSig, workerBaseSig, type EditingState,
} from "./state";

interface Props {
  engine: Engine; state: EditingState; onDraft: (next: Item) => void;
  /** Reads a document's text; overridable so a test never touches the
   *  network, matching `DocumentsView`'s own `fetchText` prop. */
  fetchText?: (path: string) => Promise<string>;
}

/** A proposed item paired with the source `ProposalItem` (so a failed
 *  derivation can still show the model's raw text) and whether the reviewer
 *  has kept it checked for staging. */
interface ReviewRow { p: ProposalItem; item: Item; errors: string[]; selected: boolean }

/** Above this, a document's text no longer fits comfortably in one prompt
 *  alongside the glossary and grammar; the panel asks the analyst to pick a
 *  heading-chunk instead of sending the whole thing. */
const MAX_DOC_CHARS = 45000;

function derivationTextOf(engine: Engine, row: ReviewRow): string {
  if (row.item.kind !== "derived") return "";
  if (row.item.derived !== undefined) {
    try { return engine.block(row.item.derived).join("\n"); }
    catch (e) { return `(invalid: ${(e as Error).message})`; }
  }
  const err = row.errors.find((e) => e.startsWith("derivation:"));
  return err ? `${row.p.derived_text}\n\n(${err})` : (row.p.derived_text || "(no derivation)");
}

export function AiPanel({ engine, state, onDraft, fetchText }: Props) {
  const providerId = useSignal(PROVIDERS[0].id);
  const model = useSignal(PROVIDERS[0].defaultModel);
  const contextKind = useSignal<"source" | "document">(
    state.context?.kind === "document" ? "document" : "source",
  );
  const sourceId = useSignal(state.context?.kind === "source" ? state.context!.id : "");
  const docId = useSignal(state.context?.kind === "document" ? state.context!.id : "");
  const docText = useSignal<string | null>(null);
  const docError = useSignal("");
  const chunkIndex = useSignal(-1);
  const hints = useSignal("");
  const status = useSignal("");
  const notes = useSignal("");
  const errors = useSignal<string[]>([]);
  const busy = useSignal(false);
  const rows = useSignal<ReviewRow[]>([]);
  const excerpts = useSignal<{ citation: string; text: string }[]>([]);
  const excerptStatus = useSignal("");

  const vol = volumeSig.value;
  const provider = providerById(providerId.value)!;
  const workerBase = workerBaseSig.value;
  const key = credentials.get("ai");

  const source = vol?.sources?.find((s) => s.id === sourceId.value);
  const doc = vol?.documents?.find((d) => d.id === docId.value);

  // Document text is fetched only when a document is chosen as the context,
  // never eagerly, so picking "Document" and leaving it blank costs nothing.
  // Laid out (not passive) so the fetch starts as soon as the panel commits.
  useLayoutEffect(() => {
    if (contextKind.value !== "document" || !doc || !vol) { docText.value = null; return; }
    let live = true;
    docText.value = null;
    docError.value = "";
    chunkIndex.value = -1;
    const read = fetchText ?? ((p: string) => fetchDocumentText(ledgerSource(), p));
    read(documentFilePath(vol.path, doc)).then(
      (t) => { if (live) docText.value = t; },
      (e: Error) => { if (live) docError.value = e.message; },
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextKind.value, docId.value]);

  const chunks = docText.value !== null ? chunkByHeadings(docText.value) : [];
  const tooLong = docText.value !== null && docText.value.length > MAX_DOC_CHARS;
  const chosenDocText = tooLong
    ? (chunkIndex.value >= 0 ? chunks[chunkIndex.value]?.text ?? "" : "")
    : (docText.value ?? "");

  const contextReady = contextKind.value === "source"
    ? Boolean(source)
    : Boolean(doc && docText.value !== null && !docError.value && chosenDocText !== "");

  async function callModel(user: string): Promise<string | null> {
    if (!vol) return null;
    if (!workerBase) { status.value = "Set the AI worker URL in Settings."; return null; }
    if (!key) { status.value = "Add a provider key in Settings."; return null; }
    busy.value = true;
    status.value = "Asking the model…";
    notes.value = "";
    let received = 0;
    try {
      return await streamChat(
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
    } catch (e) {
      status.value = (e as Error).message;
      return null;
    } finally {
      busy.value = false;
    }
  }

  // The three original per-item actions: apply straight onto the item being
  // edited on the Form/Text tab, unchanged by the context selector below.
  const run = async (user: string, apply: boolean) => {
    errors.value = [];
    rows.value = [];
    const text = await callModel(user);
    if (text === null) return;
    try {
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
    }
  };

  // The new multi-item action: a whole proposal becomes a review list, never
  // applied straight to a draft, so several items can be staged at once.
  const suggestMany = async () => {
    notes.value = "";
    rows.value = [];
    const user = contextKind.value === "source"
      ? draftFromSourcePrompt(source!, hints.value)
      : draftFromDocumentPrompt(doc!, chosenDocText, hints.value);
    const text = await callModel(user);
    if (text === null) return;
    try {
      const proposal = parseProposal(text);
      notes.value = proposal.notes;
      const built = proposalToItems(engine, proposal, engine.nextId());
      rows.value = proposal.items.map((p, i) => ({
        p, item: built[i].item, errors: built[i].errors, selected: true,
      }));
      status.value = rows.value.length
        ? `${rows.value.length} proposed item(s). Review before staging.`
        : "The model proposed no items.";
    } catch (e) {
      status.value = (e as Error).message;
    }
  };

  const extract = async () => {
    excerpts.value = [];
    excerptStatus.value = "";
    const user = extractExcerptsPrompt(doc!, chosenDocText, hints.value);
    const text = await callModel(user);
    if (text === null) return;
    try {
      const parsed = parseExcerpts(text);
      excerpts.value = parsed.excerpts;
      status.value = parsed.excerpts.length
        ? `${parsed.excerpts.length} excerpt(s) extracted. Review before staging.`
        : "The model proposed no excerpts.";
    } catch (e) {
      status.value = (e as Error).message;
    }
  };

  const toggleRow = (i: number) => {
    rows.value = rows.value.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r));
  };

  const stageSelected = () => {
    const chosen = rows.value.filter((r) => r.selected);
    for (const r of chosen) {
      putChangeEntry({ id: r.item.id, chapter: state.chapter, before: null, after: r.item });
    }
    status.value = `${chosen.length} item(s) staged to the tray.`;
    rows.value = rows.value.filter((r) => !r.selected);
    if (chosen.length) trayOpenSig.value = true;
  };

  const stageExcerpts = () => {
    if (!vol || !doc || !excerpts.value.length) return;
    const path = `${vol.path}/sources.md`;
    const staging = fileEntries(changeSetSig.value).find((f) => f.path === path);
    const knownText = staging?.after ?? vol.sourcesText;
    const knownSources = staging?.after ? parseSources(staging.after) : vol.sources;
    const startId = nextSourceId(knownSources);
    const after = appendExcerpts(knownText, doc.id, startId, excerpts.value);
    putFileChange({
      path, before: vol.sourcesText, after,
      label: `sources.md (+${excerpts.value.length} from ${doc.id})`,
    });
    excerptStatus.value = `${excerpts.value.length} excerpt(s) staged from ${startId}. `;
    excerpts.value = [];
    trayOpenSig.value = true;
  };

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
        <label>Context
          <select
            value={contextKind.value}
            onChange={(e) => {
              contextKind.value = (e.target as HTMLSelectElement).value as "source" | "document";
            }}
          >
            <option value="source">Source</option>
            <option value="document">Document</option>
          </select>
        </label>
        {contextKind.value === "source" && (
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
        )}
        {contextKind.value === "document" && (
          <label>Document
            <select
              value={docId.value}
              onChange={(e) => { docId.value = (e.target as HTMLSelectElement).value; }}
            >
              <option value="">choose…</option>
              {(vol?.documents ?? []).map((d) => (
                <option key={d.id} value={d.id}>{d.id} {d.title}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {contextKind.value === "document" && docId.value && (
        <p class="muted docstatus">
          {docError.value
            ? <span class="bad">{docError.value}</span>
            : docText.value === null
              ? "Loading the text…"
              : tooLong
                ? `${docText.value.length} characters; pick a chunk below.`
                : `${docText.value.length} characters.`}
        </p>
      )}
      {contextKind.value === "document" && tooLong && (
        <label>Chunk
          <select
            value={String(chunkIndex.value)}
            onChange={(e) => { chunkIndex.value = Number((e.target as HTMLSelectElement).value); }}
          >
            <option value="-1">choose a chunk…</option>
            {chunks.map((c, i) => <option key={i} value={i}>{c.heading}</option>)}
          </select>
        </label>
      )}
      <p class="muted">{provider.hint}</p>
      <label class="wide">Hints for the model
        <textarea
          rows={2} value={hints.value}
          onInput={(e) => { hints.value = (e.target as HTMLTextAreaElement).value; }}
        />
      </label>
      <div class="actions">
        {contextKind.value === "source" && (
          <button
            class="btn" disabled={busy.value || !source}
            onClick={() => run(draftFromSourcePrompt(source!, hints.value), true)}
          >Draft from {sourceId.value || "a source"}</button>
        )}
        <button
          class="btn suggest-many" disabled={busy.value || !contextReady}
          onClick={suggestMany}
        >Suggest facts and derivations</button>
        {contextKind.value === "document" && (
          <button
            class="btn extract-excerpts" disabled={busy.value || !contextReady}
            onClick={extract}
          >Extract excerpts</button>
        )}
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

      {rows.value.length > 0 && (
        <div class="review">
          <h4>Proposed items ({rows.value.length})</h4>
          <ul class="proposalitems">
            {rows.value.map((r, i) => (
              <li key={r.item.id} class="proposalitem">
                <label class="pick">
                  <input
                    type="checkbox" checked={r.selected}
                    onChange={() => toggleRow(i)}
                  />
                </label>
                <div class="body">
                  <div class="head">
                    <strong>{r.item.name}</strong>
                    <span class="tag">{r.item.id}</span>
                    <span class="tag">{r.item.identifier}</span>
                    <span class="tag">{r.item.kind}</span>
                  </div>
                  <p class="meaning">{r.item.meaning}</p>
                  {r.item.kind === "derived" && (
                    <pre class="statute derivation">{derivationTextOf(engine, r)}</pre>
                  )}
                  {r.item.rationale && <p class="rationale muted">{r.item.rationale}</p>}
                  {(r.item.nearest ?? []).length > 0 && (
                    <ul class="candidates">
                      {(r.item.nearest ?? []).map((id) => {
                        const found = engine.itemById(id);
                        return (
                          <li key={id} class="candidate">
                            <strong>{found?.name ?? id}</strong> <small>{id}</small>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <ul class="constraints">
                    {engine.governance(r.item, { isNew: true }).map((f) => (
                      <li key={`${f.rule} ${f.msg}`} class={f.level === "error" ? "bad" : "warn"}>
                        <span class="tag">{f.rule}</span> {f.msg}
                      </li>
                    ))}
                    {r.errors.map((e) => <li key={e} class="bad">{e}</li>)}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
          <div class="actions">
            <button
              class="btn stage-selected"
              disabled={!rows.value.some((r) => r.selected)}
              onClick={stageSelected}
            >Stage selected as drafts</button>
          </div>
        </div>
      )}

      {excerpts.value.length > 0 && (
        <div class="review excerptreview">
          <h4>Extracted excerpts ({excerpts.value.length})</h4>
          <ul class="excerptlist">
            {excerpts.value.map((e, i) => (
              <li key={i}>
                <p class="citation">{e.citation}</p>
                <pre class="statute">{e.text}</pre>
              </li>
            ))}
          </ul>
          <div class="actions">
            <button class="btn stage-excerpts" onClick={stageExcerpts}>
              Stage {excerpts.value.length} excerpt(s) to sources.md
            </button>
          </div>
        </div>
      )}
      {excerptStatus.value && <p class="status ok">{excerptStatus.value}</p>}

      <p class="muted">
        Nothing here reaches the tray until you stage it: proposed items above,
        or the Save button on the Form or Text tab for a single draft.
      </p>
    </div>
  );
}
