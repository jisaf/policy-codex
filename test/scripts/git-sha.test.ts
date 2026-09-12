import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { gitShaWithDirtySuffix } from "../../scripts/git-sha";

describe("gitShaWithDirtySuffix", () => {
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-git-sha-"));
    const git = (...args: string[]) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
    git("init", "-q");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    fs.writeFileSync(path.join(dir, "a.txt"), "one\n");
    git("add", "a.txt");
    git("commit", "-q", "-m", "first");
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("returns the bare sha on a clean working tree", () => {
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
    expect(gitShaWithDirtySuffix(dir)).toBe(sha);
  });

  it("appends -dirty when the working tree has uncommitted changes", () => {
    fs.writeFileSync(path.join(dir, "a.txt"), "changed\n");
    const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
    expect(gitShaWithDirtySuffix(dir)).toBe(`${sha}-dirty`);
    // Clean up for any test that might run after this one in the same dir.
    execFileSync("git", ["checkout", "--", "a.txt"], { cwd: dir });
  });

  it("returns unknown when there is no git repository at all", () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), "codex-no-git-"));
    try {
      expect(gitShaWithDirtySuffix(bare)).toBe("unknown");
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });
});
