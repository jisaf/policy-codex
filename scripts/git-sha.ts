/* The commit `scripts/conformance.ts` pins the suite to, split out so it can
 * be unit tested against a scratch git repo without running the whole
 * suite-building script. */
import { execFileSync } from "node:child_process";

/** The current commit's sha, with "-dirty" appended when the working tree
 *  (as `git status --porcelain` reports it) is not clean: a suite built from
 *  uncommitted edits is not actually pinned to that commit alone, so the sha
 *  says so rather than silently overstating what it reflects. "unknown" when
 *  git itself is unavailable (no repo, no git binary). */
export function gitShaWithDirtySuffix(root: string): string {
  try {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    const status = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
    return status.trim() === "" ? sha : `${sha}-dirty`;
  } catch {
    return "unknown";
  }
}
