/* Getting a staged change into the codex, with or without a GitHub token
 * (HCPF analyst task 3, Legal task 3, CDHS cash lead F9): every surface that
 * stages something (the tray, the approvals inbox, a question's answer, the
 * editor) offers "Download this change" and says, in plain words, what
 * happens next and who the codex steward is. The token path (Propose in the
 * tray) is unchanged; the download is the same change set, as one file a
 * steward can propose for the reader. */
import type { Engine } from "../engine/engine";
import { entryFiles, proposalBody } from "../changes/serialize";
import { fileEntries, isFileUnchanged, isUnchanged, type ChangeSet } from "../changes/types";
import { validateChangeSet, type ChangeSetReport } from "../changes/validate";
import type { Steward } from "../ledger/manifest";
import { BUNDLED } from "../ledger/source";
import type { LoadedVolume } from "../ledger/load";
import { downloadText } from "./Settings";
import {
  changeSetSig, credentials, engineSig, reportSig, settingsOpenSig, trayOpenSig, volumeSig,
} from "./state";

/** What a surface staged, for the wording. */
export type StagedKind = "signature" | "answer" | "change";

/** The codex steward named for the volume (codex.json, else volume.yaml), or
 *  null when none is named. */
export function stewardOf(vol: Pick<LoadedVolume, "steward" | "meta"> | null | undefined): Steward | null {
  if (!vol) return null;
  const s = vol.steward ?? vol.meta?.steward ?? null;
  return s && s.name ? s : null;
}

/** "the Colorado codex's Data steward (codex@agency.gov)", or a plain
 *  "your codex steward" with a note that nobody is named yet. */
export function stewardText(s: Steward | null): string {
  if (!s) return "your codex steward (no steward is named for this codex yet: the codex administrator sets one in codex.json)";
  return s.contact ? `${s.name} (${s.contact})` : s.name;
}

const KIND_WORDS: Record<StagedKind, { thing: string; lands: string }> = {
  signature: { thing: "signature", lands: "Your signature is in the codex" },
  answer: { thing: "answer", lands: "Your answer is in the codex" },
  change: { thing: "change", lands: "The change is in the codex" },
};

/** What happens next, as numbered plain sentences. Without a token the
 *  reader downloads the change and sends it to the steward; with one, they
 *  propose it from the tray themselves. */
export function nextSteps(args: { hasToken: boolean; steward: Steward | null; kind: StagedKind }): string[] {
  const w = KIND_WORDS[args.kind];
  if (args.hasToken) {
    return [
      `Your ${w.thing} is saved in this browser only. Nothing is in the codex yet.`,
      "Open the change tray and press Propose. That sends it for review (a pull request).",
      `${w.lands} once that review is approved and merged.`,
    ];
  }
  return [
    `Your ${w.thing} is saved in this browser only. Nothing is in the codex yet.`,
    `Press "Download this change". It saves one file holding your ${w.thing} and the exact text to write.`,
    `Send that file to ${stewardText(args.steward)}. They send it for review for you; you need no GitHub account.`,
    `${w.lands} once that review is approved and merged. Until then, keep this browser's tray as it is.`,
  ];
}

/** The staged change set as one Markdown document: what changed and why, the
 *  steward it is for, and every file to write in full. */
export function stagedChangeDocument(
  engine: Engine, cs: ChangeSet, report: ChangeSetReport, volumePath: string,
  meta: { steward: Steward | null; today: string },
): string {
  const files = entryFiles(cs, volumePath);
  return [
    "# A change to the codex, staged in a browser without a GitHub token",
    "",
    `Prepared ${meta.today} for ${stewardText(meta.steward)}. Propose it as a pull request: write each file below at its path, on a branch from \`${cs.baseRef}\`.`,
    "",
    proposalBody(engine, cs, report),
    "",
    "## Files to write",
    ...files.map((f) => `\n### ${f.path}\n\n\`\`\`\n${f.content ?? "(delete this file)"}\n\`\`\``),
  ].join("\n");
}

/** Whether the change set has anything to send. */
export function hasStaged(cs: ChangeSet): boolean {
  return cs.entries.some((e) => !isUnchanged(e)) || fileEntries(cs).some((f) => !isFileUnchanged(f));
}

/** Downloads the current tray (or `cs`) as one file. */
export function downloadStagedChange(kind: StagedKind, cs: ChangeSet = changeSetSig.value): void {
  const engine = engineSig.value;
  const vol = volumeSig.value;
  if (!engine || !vol) return;
  const report = cs === changeSetSig.value && reportSig.value ? reportSig.value : validateChangeSet(engine, cs);
  const today = new Date().toISOString().slice(0, 10);
  const text = stagedChangeDocument(engine, cs, report, vol.path, { steward: stewardOf(vol), today });
  downloadText(`codex-${vol.volumeId}-${kind}-${today}.md`, text);
}

/** The panel every staging surface shows: what happens next, the download,
 *  and the token path. `cs` overrides the tray (the editor's unsaved draft). */
export function SendChange(
  { kind, cs, compact = false }: { kind: StagedKind; cs?: ChangeSet; compact?: boolean },
) {
  const set = cs ?? changeSetSig.value;
  // A static preview build cannot propose: the download is the only path.
  const hasToken = !BUNDLED && Boolean(credentials.get("github"));
  const steward = stewardOf(volumeSig.value);
  const steps = nextSteps({ hasToken, steward, kind });
  const staged = hasStaged(set);
  return (
    <div class={`sendchange${hasToken ? "" : " notoken"}`} data-kind={kind}>
      {!compact && <p class="sendhead"><b>What happens next</b></p>}
      <ol class="nextsteps">
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <p class="sendactions">
        <button type="button" class="btn download" disabled={!staged} onClick={() => downloadStagedChange(kind, set)}>
          Download this change
        </button>
        {!cs && (
          <button type="button" class="btn" onClick={() => { trayOpenSig.value = true; }}>Open the change tray</button>
        )}
        {!hasToken && !BUNDLED && (
          <button type="button" class="btn linkish" onClick={() => { settingsOpenSig.value = true; }}>
            I have a GitHub token
          </button>
        )}
      </p>
    </div>
  );
}
