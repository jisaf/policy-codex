import type { Engine } from "../engine/engine";
import type { GitHubClient, PullRequest } from "../github/client";
import type { LoadedVolume } from "../ledger/load";
import {
  manifestChanged, updateManifestFiles, type Manifest,
} from "../ledger/manifest";
import {
  branchName, entryFiles, proposalBody, proposalTitle, shortId,
} from "../changes/serialize";
import type { ChangeSet } from "../changes/types";
import type { ChangeSetReport } from "../changes/validate";

export interface ProposeDeps {
  client: GitHubClient;
  volume: LoadedVolume;
  manifest: Manifest;
  changeSet: ChangeSet;
  report: ChangeSetReport;
  engine: Engine;
  newBranchId?: () => string;
  /** Called as soon as the branch name is settled, before any write, so the
   *  caller can persist it and a retry after a failure reuses the branch. */
  onBranch?: (branch: string) => void;
}

export interface ProposeResult {
  pr: PullRequest;
  branch: string;
  paths: string[];
  manifest: Manifest;
}

export function proposeBlockedReason(args: {
  hasToken: boolean; entryCount: number; valid: boolean; isPrRef: boolean;
}): string | null {
  if (!args.hasToken) return "Add a GitHub token in Settings to propose changes.";
  if (args.entryCount === 0) return "The tray is empty.";
  if (!args.valid) return "Fix the validation errors before proposing.";
  if (args.isPrRef) return "Propose from a branch or main, not from a pull request head.";
  return null;
}

export async function proposeChangeSet(deps: ProposeDeps): Promise<ProposeResult> {
  const { client, volume, changeSet: cs, report, engine } = deps;
  const files = entryFiles(cs, volume.path);
  const branch = cs.branch ?? branchName(cs, (deps.newBranchId ?? shortId)());
  deps.onBranch?.(branch);

  const baseSha = await client.getRefSha(cs.baseRef);
  if (!(await client.branchExists(branch))) {
    await client.createBranch(branch, baseSha);
  }

  const paths: string[] = [];
  for (const f of files) {
    const sha = await client.getFileSha(f.path, branch);
    if (f.content === null) {
      if (sha) {
        await client.deleteFile({
          path: f.path, message: `codex: delete ${f.id}`, branch, sha,
        });
      }
    } else {
      await client.putFile({
        path: f.path, content: f.content, message: `codex: update ${f.id}`, branch, sha,
      });
    }
    paths.push(f.path);
  }

  const manifestChanges = cs.entries
    .filter((e) => !e.before || !e.after)
    .map((e) => ({ chapter: e.chapter, file: `${e.id}.yaml`, removed: !e.after }));
  let manifest = deps.manifest;
  if (manifestChanges.length) {
    const next = updateManifestFiles(deps.manifest, cs.volume, manifestChanges);
    if (manifestChanged(deps.manifest, next)) {
      const sha = await client.getFileSha("codex.json", branch);
      await client.putFile({
        path: "codex.json",
        content: JSON.stringify(next, null, 2) + "\n",
        message: "codex: update the manifest",
        branch, sha,
      });
      manifest = next;
    }
  }

  const body = proposalBody(engine, cs, report);
  const existing = await client.findPullRequest(branch);
  const pr = existing
    ? await client.updatePullRequest(existing.number, body)
    : await client.createPullRequest({
        title: proposalTitle(cs), body, headRef: branch, baseRef: cs.baseRef,
      });

  return { pr, branch, paths, manifest };
}
