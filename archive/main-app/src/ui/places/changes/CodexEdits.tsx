/* Changes › Edits to the codex: the repository's own history (who changed
 * which file, when), kept apart from what takes effect in law (Blind A mixed
 * "1141 items added" and a commit hash into "This month"). The recent
 * commits touching the volume are read from GitHub anonymously; a preview
 * copy or a reader offline sees a link instead. */
import { useEffect, useState } from "preact/hooks";
import { REPO } from "../../../config";
import { fileHistory, type HistoryEntry } from "../../../github/history";
import { BUNDLED } from "../../../ledger/source";
import { formatDate } from "../../present";
import { buildHash } from "../../router";
import { baseRefOf } from "../../state";
import type { ViewContext } from "../../views/context";

export type FetchVolumeHistory = (path: string, ref: string) => Promise<HistoryEntry[] | null>;

export function CodexEdits({ ctx, fetchHistory }: { ctx: ViewContext; fetchHistory?: FetchVolumeHistory }) {
  const { vol, route: r } = ctx;
  const ref = baseRefOf(r);
  const gitRef = ref === "local" ? "main" : ref;
  const url = `https://github.com/${REPO.owner}/${REPO.name}/commits/${gitRef}/${vol.path}`;
  const load: FetchVolumeHistory | null = fetchHistory ?? (BUNDLED ? null : (p, rf) => fileHistory(REPO, p, rf));
  const [history, setHistory] = useState<HistoryEntry[] | null | "loading">(load ? "loading" : null);
  useEffect(() => {
    if (!load) return;
    let live = true;
    load(vol.path, gitRef).then((h) => { if (live) setHistory(h); });
    return () => { live = false; };
  }, [vol.path, gitRef]);
  return (
    <div class="codexedits">
      <p class="lede">
        Who changed the codex's files, and when. This is not law taking effect: for that, see{" "}
        <a href={buildHash({ ...r, view: "changes", arg: null, params: {} })}>What takes effect</a>.
      </p>
      {history === "loading" && <p class="muted" role="status">Reading the history…</p>}
      {Array.isArray(history) && history.length > 0 && (
        <ul class="history">
          {history.map((h) => (
            <li key={h.sha}>
              <span class="date">{h.date ? formatDate(h.date.slice(0, 10)) : ""}</span>{" "}
              {h.message}{" "}
              <small class="muted">
                <a href={h.url} target="_blank" rel="noreferrer">{h.sha.slice(0, 7)}</a>
                {h.pr && <> · <a href={h.pr.url} target="_blank" rel="noreferrer">review #{h.pr.number}</a></>}
              </small>
            </li>
          ))}
        </ul>
      )}
      {history !== "loading" && (!Array.isArray(history) || history.length === 0) && (
        <p class="muted">
          {BUNDLED ? "This preview copy does not carry the history." : "The history could not be read just now."}
        </p>
      )}
      {!BUNDLED && <p><a href={url} target="_blank" rel="noreferrer">The full history of this volume on GitHub</a></p>}
      <p class="muted small">Each rule's and figure's own history is on its page.</p>
    </div>
  );
}
