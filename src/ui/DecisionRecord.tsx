import { useSignal } from "@preact/signals";
import { useLayoutEffect } from "preact/hooks";
import { REPO } from "../config";
import { fileHistory, type HistoryEntry } from "../github/history";
import { itemFilePath, type LoadedVolume } from "../ledger/load";
import type { Item } from "../engine/types";
import { buildHash, type Route } from "./router";

export type FetchHistory = (path: string, ref: string) => Promise<HistoryEntry[] | null>;

/** The engineer's path back to source: why the item exists, the excerpts and
 *  documents it rests on, the open questions and the assumption taken for
 *  each, where it is implemented, and the file's change history on GitHub.
 *  History is fetched anonymously and shown only when it comes back — a
 *  reader offline, or GitHub unreachable, sees the rest of the record with
 *  no error. */
export function DecisionRecord(
  { item, vol, route: r, fetchHistory }:
  { item: Item; vol: LoadedVolume; route: Route; fetchHistory?: FetchHistory },
) {
  const history = useSignal<HistoryEntry[] | null>(null);
  // The file's chapter is only known once the item has been filed into a
  // volume; a draft or fixture without one simply carries no history.
  const path = vol.chapterOf[item.id] ? itemFilePath(vol, item.id) : null;
  const ref = vol.ref;
  const load = fetchHistory ?? ((p, rf) => fileHistory(REPO, p, rf));

  // Laid out before paint, like a document's text: the request starts as
  // soon as the record commits rather than after a reader notices it loaded.
  useLayoutEffect(() => {
    let live = true;
    history.value = null;
    if (path) load(path, ref).then((h) => { if (live) history.value = h; });
    return () => { live = false; };
  }, [path, ref]);

  const sources = vol.sources.filter((s) => (item.sources ?? []).includes(s.id));
  const questions = vol.openQuestions.filter((q) => (item.open ?? []).includes(q.id));
  const rationale = (item.rationale ?? "").trim();

  return (
    <div class="decision-record">
      <h4>Rationale</h4>
      <p class={rationale ? "" : "muted"}>{rationale || "none recorded"}</p>

      <h4>Sources</h4>
      {sources.length === 0 && <p class="muted">No source cited.</p>}
      {sources.map((s) => {
        const doc = s.document ? vol.documents.find((d) => d.id === s.document) : undefined;
        return (
          <div class="record-source" key={s.id}>
            <p class="citation">
              <a href={buildHash({ ...r, view: "source", arg: s.id, params: {} })}>
                {s.id}. {s.title}
              </a>
              {" — "}{s.citation}
              {doc && (
                <>
                  {" "}
                  <a href={buildHash({ ...r, view: "document", arg: doc.id, params: {} })}>
                    {doc.title}
                  </a>
                </>
              )}
            </p>
            <pre class="statute">{s.text}</pre>
          </div>
        );
      })}

      <h4>Open questions</h4>
      {questions.length === 0 && <p class="muted">None open.</p>}
      {questions.map((q) => (
        <details key={q.id}>
          <summary>{q.id} {q.title}</summary>
          <p>{q.body}</p>
        </details>
      ))}

      <h4>Implementation</h4>
      <p>
        {item.implemented === "assembly" ? "Fact assembly"
          : item.implemented === "engine" ? "Determination engine"
          : "Not yet implemented"}
        {item.implemented_by && <>{" — "}<code>{item.implemented_by}</code></>}
      </p>

      {history.value && history.value.length > 0 && (
        <>
          <h4>History</h4>
          <ul class="history">
            {history.value.map((h) => (
              <li key={h.sha}>
                <a href={h.url} target="_blank" rel="noreferrer">{h.sha.slice(0, 7)}</a>
                {" "}{h.date} — {h.message}
                {h.pr && (
                  <>
                    {" "}
                    (<a href={h.pr.url} target="_blank" rel="noreferrer">#{h.pr.number}</a>)
                  </>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
