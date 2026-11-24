import { useSignal } from "@preact/signals";
import { handoffMarkdown } from "../export/handoff";
import { idbCache } from "../ledger/cache";
import {
  credentials, engineSig, settingsOpenSig, viewEngine, volumeSig, workerBaseSig,
  WORKER_BASE_KEY,
} from "./state";

export function downloadText(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function Settings() {
  const note = useSignal("");
  if (!settingsOpenSig.value) return null;
  const vol = volumeSig.value;
  const engine = viewEngine() ?? engineSig.value;

  return (
    <div
      class="overlay"
      onClick={(e) => { if (e.target === e.currentTarget) settingsOpenSig.value = false; }}
    >
      <div class="sheet settings">
        <div class="cardhead">
          <h2>Settings</h2>
          <span class="spacer" />
          <button class="btn" onClick={() => { settingsOpenSig.value = false; }}>Close</button>
        </div>

        <p class="muted">
          Reading needs no credentials. Tokens are kept in this browser only and are sent
          straight to GitHub or, for the AI key, to the provider through the CORS worker.
        </p>

        <label class="wide">GitHub token (needed only to propose changes)
          <input
            name="github" type="password" placeholder="ghp_…"
            value={credentials.get("github") ?? ""}
            onChange={(e) => {
              credentials.set("github", (e.target as HTMLInputElement).value);
              note.value = "GitHub token saved in this browser.";
            }}
          />
        </label>

        <label class="wide">AI provider key
          <input
            name="ai" type="password" placeholder="sk-…"
            value={credentials.get("ai") ?? ""}
            onChange={(e) => {
              credentials.set("ai", (e.target as HTMLInputElement).value);
              note.value = "Provider key saved in this browser.";
            }}
          />
        </label>

        <label class="wide">AI worker URL
          <input
            name="worker" type="url" placeholder="https://codex-ai-proxy.<you>.workers.dev"
            value={workerBaseSig.value}
            onChange={(e) => {
              const v = (e.target as HTMLInputElement).value.trim();
              workerBaseSig.value = v;
              try { localStorage.setItem(WORKER_BASE_KEY, v); } catch { /* blocked */ }
              note.value = "Worker URL saved.";
            }}
          />
        </label>

        <h4>Loaded ledger</h4>
        <p class="muted">
          {vol
            ? `${vol.volumeId} at ${vol.ref}${vol.sha ? ` (${vol.sha.slice(0, 7)})` : ""}, ` +
              `${vol.items.length} items, ${vol.sources.length} sources, ` +
              `${vol.openQuestions.length} open questions.`
            : "Nothing loaded yet."}
        </p>

        <div class="actions">
          <button
            class="btn handoff" disabled={!engine || !vol}
            onClick={() => downloadText(
              `handoff-${vol!.volumeId}.md`, handoffMarkdown(engine!, vol!),
            )}
          >Download the handoff document</button>
          <button
            class="btn"
            onClick={() => {
              void idbCache().clear();
              note.value = "Cached ledgers cleared; the next load refetches.";
            }}
          >Clear the offline cache</button>
          <button
            class="btn danger"
            onClick={() => {
              credentials.clear("github");
              credentials.clear("ai");
              note.value = "Credentials cleared.";
            }}
          >Forget my credentials</button>
        </div>
        {note.value && <p class="status">{note.value}</p>}
      </div>
    </div>
  );
}
