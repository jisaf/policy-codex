import { useSignal } from "@preact/signals";
import { entryKind, entryLabel, fileEntries, isFileUnchanged, isUnchanged } from "../changes/types";
import { buildHash, isPrRef } from "./router";
import { saveChangeSet } from "../changes/store";
import { isSignatureOnly } from "../changes/apply";
import { SendChange } from "./sendChange";
import { BUNDLED } from "../ledger/source";
import { proposeBlockedReason, proposeChangeSet } from "./propose";
import {
  changeSetSig, clearTray, credentials, discardChangeEntry, discardFileChange, engineSig,
  githubClient, manifestSig, navigate, openEditor, reportSig, route, statusSig, trayOpenSig,
  volumeSig,
} from "./state";

/** Whether Propose is blocked, and why (null when it is not): no token, a
 *  preview build, nothing staged, a validation error, a pull-request head.
 *  The tray and Changes › My proposal both read this. */
export function proposeBlocked(): string | null {
  const cs = changeSetSig.value;
  const report = reportSig.value;
  return proposeBlockedReason({
    hasToken: Boolean(credentials.get("github")),
    entryCount: cs.entries.filter((e) => !isUnchanged(e)).length
      + fileEntries(cs).filter((f) => !isFileUnchanged(f)).length,
    valid: report ? report.valid : true,
    isPrRef: isPrRef(route.value.ref),
    preview: BUNDLED,
  });
}

/** Proposes the staged change set as one pull request, then empties the
 *  tray and opens the pull request. Throws with the reason on failure. */
export async function proposeStaged(): Promise<void> {
  const cs = changeSetSig.value;
  const report = reportSig.value;
  const engine = engineSig.value;
  const vol = volumeSig.value;
  const manifest = manifestSig.value;
  if (!engine || !vol || !manifest || !report) return;
  const result = await proposeChangeSet({
    client: githubClient(), volume: vol, manifest,
    changeSet: cs, report, engine,
    onBranch: (branch) => {
      const next = { ...cs, branch };
      changeSetSig.value = next;
      saveChangeSet(next);
    },
  });
  manifestSig.value = result.manifest;
  clearTray();
  statusSig.value = { kind: "idle", message: "" };
  navigate({ ref: `pr/${result.pr.number}`, view: "table", arg: null, params: {} });
}

/** The change tray as an overlay sheet, opened from the editor and the
 *  proposal page. */
export function Tray() {
  if (!trayOpenSig.value) return null;
  return (
    <div class="overlay" onClick={(e) => { if (e.target === e.currentTarget) trayOpenSig.value = false; }}>
      <TrayPanel />
    </div>
  );
}

/** The tray's content: the staged entries, their effect, sending and
 *  proposing. Changes › My proposal is the page for the same change set,
 *  with its effect on the stored households and who must approve it. */
export function TrayPanel() {
  const busy = useSignal(false);
  const error = useSignal("");

  const cs = changeSetSig.value;
  const report = reportSig.value;
  const r = route.value;
  const errorsById = new Map((report?.items ?? []).map((i) => [i.id, i.errors]));
  // Governance warnings are what an edit inherits or a duplicate earns: they do
  // not block Propose, but a steward reads them beside the errors.
  const warningsById = new Map(
    (report?.items ?? []).map((i) => [i.id, i.governance.filter((f) => f.level === "warn")]),
  );

  // A file entry is a change to propose like any other, so it counts towards
  // an empty tray even though it carries no impact of its own.
  const files = fileEntries(cs);
  const reason = proposeBlocked();

  const propose = async () => {
    busy.value = true;
    error.value = "";
    try {
      await proposeStaged();
      trayOpenSig.value = false;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      busy.value = false;
    }
  };

  return (
      <div class="sheet tray">
        <div class="cardhead">
          <h2>Change tray</h2>
          <span class="tag">{cs.volume} @ {cs.baseRef}</span>
          <span class="spacer" />
          <button class="btn" onClick={() => { trayOpenSig.value = false; openEditor(null); }}>
            New item
          </button>
          <a
            class="btn" href={buildHash({ ...r, view: "changes", arg: "proposal", params: {} })}
            onClick={() => { trayOpenSig.value = false; }}
          >My proposal: effect and approvers</a>
          <button class="btn" onClick={() => { trayOpenSig.value = false; }}>Close</button>
        </div>

        {cs.entries.length === 0 && files.length === 0 && (
          <p class="muted">Nothing staged. Open an item and press Edit, or add a new item.</p>
        )}

        <ul class="entries">
          {cs.entries.map((e) => {
            // A signature changes no value a rule reads: it is not an "edit",
            // and the duplicate-name warnings the item already carries are
            // not the signer's to act on (HCPF analyst task 3).
            const signature = isSignatureOnly(e);
            const warnings = signature ? [] : warningsById.get(e.id) ?? [];
            return (
              <li class="entry" key={e.id}>
                <a href={buildHash({ ...r, view: "item", arg: e.id, params: {} })}>
                  {entryLabel(e)}
                </a>
                <span class="tag">{signature ? "signature" : entryKind(e)}</span>
                {isUnchanged(e) && <span class="tag">no change</span>}
                {warnings.length > 0 && (
                  <span class="tag warncount">
                    {warnings.length} warning{warnings.length === 1 ? "" : "s"}
                  </span>
                )}
                <button class="btn small" onClick={() => { trayOpenSig.value = false; openEditor(e.id); }}>
                  Edit
                </button>
                <button class="btn small discard" onClick={() => discardChangeEntry(e.id)}>
                  Discard
                </button>
                <ul class="errors">
                  {(errorsById.get(e.id) ?? []).map((m) => <li key={m} class="bad">{m}</li>)}
                  {warnings.map((f) => (
                    <li key={`${f.rule} ${f.msg}`} class="warn">
                      <span class="tag">{f.rule}</span> {f.msg}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>

        {files.length > 0 && (
          <ul class="entries files">
            {files.map((f) => (
              <li class="entry file" key={f.path}>
                <code>{f.path}</code>
                <span>{f.label}</span>
                <span class="tag">
                  {f.after === null ? "delete" : f.before === null ? "add" : "edit"}
                </span>
                {isFileUnchanged(f) && <span class="tag">no change</span>}
                <button class="btn small discard" onClick={() => discardFileChange(f.path)}>
                  Discard
                </button>
              </li>
            ))}
          </ul>
        )}

        {report && (
          <div class="impact">
            <h4>Impact</h4>
            {report.impact.length === 0
              ? <p class="muted">No downstream items depend on the changed facts.</p>
              : (
                <p>
                  {report.impact.length} rule{report.impact.length === 1 ? "" : "s"} and figure{report.impact.length === 1 ? "" : "s"} read the changed items:{" "}
                  {report.impact.slice(0, 12).map((id, i) => {
                    const it = engineSig.value?.item(id);
                    return (
                      <span key={id}>
                        {i > 0 && "; "}
                        <a href={buildHash({ ...r, view: "item", arg: it?.id ?? id, params: {} })} title={id}>{it?.name ?? id}</a>
                      </span>
                    );
                  })}
                  {report.impact.length > 12 && <span class="muted"> and {report.impact.length - 12} more</span>}
                </p>
              )}
          </div>
        )}

        {(cs.entries.length > 0 || files.length > 0) && <SendChange kind="change" />}

        <div class="actions">
          <button class="btn propose" disabled={Boolean(reason) || busy.value} onClick={propose}>
            {busy.value ? "Proposing…" : "Propose"}
          </button>
          <button
            class="btn" disabled={!cs.entries.length && !files.length} onClick={clearTray}
          >
            Discard all
          </button>
          {reason && <span class="muted">{reason}</span>}
          {error.value && <span class="bad">{error.value}</span>}
        </div>
      </div>
  );
}
