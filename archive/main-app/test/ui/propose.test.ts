import { describe, it, expect } from "vitest";
import { proposeBlockedReason, proposeChangeSet } from "../../src/ui/propose";
import { updateManifestFiles } from "../../src/ledger/manifest";
import { createEngine } from "../../src/engine/engine";
import { stringifyItem } from "../../src/engine/yaml";
import { emptyChangeSet } from "../../src/changes/types";
import { putEntry, putFileEntry } from "../../src/changes/store";
import { validateChangeSet } from "../../src/changes/validate";
import type { GitHubClient, PullRequest } from "../../src/github/client";
import type { Manifest } from "../../src/ledger/manifest";
import type { LoadedVolume } from "../../src/ledger/load";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const engine = createEngine(
  ledger.items as unknown as Item[], ledger.meta as unknown as VolumeMeta, refs,
);
const manifest: Manifest = {
  volumes: [{
    id: "mwr", title: "t", path: "volumes/mwr",
    chapters: [
      { dir: "supplied", title: "Supplied facts", files: ["WR-001.yaml", "WR-002.yaml"] },
      { dir: "medicaid", title: "Medicaid", files: ["WR-003.yaml", "WR-200.yaml"] },
    ],
  }],
};
const volume = {
  volumeId: "mwr", title: "t", path: "volumes/mwr", ref: "main", sha: "basesha",
  meta: ledger.meta, items: ledger.items, sources: [], openQuestions: [],
  chapterOf: { "WR-003": "medicaid", "WR-200": "medicaid", "WR-001": "supplied" },
} as unknown as LoadedVolume;

const PR: PullRequest = {
  number: 12, title: "Codex", body: "b", headRef: "codex/mwr/ab12cd", headSha: "h",
  baseRef: "main", url: "https://github.com/jisaf/policy-codex/pull/12", state: "open",
};

function fakeClient(overrides: Partial<GitHubClient> = {}) {
  const calls: string[] = [];
  const client: GitHubClient = {
    repo: { owner: "jisaf", name: "policy-codex" },
    hasToken: true,
    async getRefSha(ref) { calls.push(`getRefSha ${ref}`); return "basesha"; },
    async getFileSha(path) { calls.push(`getFileSha ${path}`); return "oldsha"; },
    async branchExists(name) { calls.push(`branchExists ${name}`); return false; },
    async createBranch(name, from) { calls.push(`createBranch ${name} ${from}`); },
    async putFile(a) { calls.push(`putFile ${a.path}`); },
    async deleteFile(a) { calls.push(`deleteFile ${a.path}`); },
    async findPullRequest(head) { calls.push(`findPullRequest ${head}`); return null; },
    async createPullRequest() { calls.push("createPullRequest"); return PR; },
    async updatePullRequest() { calls.push("updatePullRequest"); return PR; },
    async getPullRequest() { calls.push("getPullRequest"); return PR; },
    ...overrides,
  };
  return { client, calls };
}

describe("proposeBlockedReason", () => {
  it("names the reason Propose is unavailable", () => {
    expect(proposeBlockedReason({ hasToken: false, entryCount: 1, valid: true, isPrRef: false }))
      .toBe("Add a GitHub token in Settings to propose changes.");
    expect(proposeBlockedReason({ hasToken: true, entryCount: 0, valid: true, isPrRef: false }))
      .toBe("The tray is empty.");
    expect(proposeBlockedReason({ hasToken: true, entryCount: 1, valid: false, isPrRef: false }))
      .toBe("Fix the validation errors before proposing.");
    expect(proposeBlockedReason({ hasToken: true, entryCount: 1, valid: true, isPrRef: true }))
      .toBe("Propose from a branch or main, not from a pull request head.");
    expect(proposeBlockedReason({ hasToken: true, entryCount: 1, valid: true, isPrRef: false }))
      .toBeNull();
  });
});

describe("updateManifestFiles", () => {
  it("adds and removes file names in chapter order", () => {
    const next = updateManifestFiles(manifest, "mwr", [
      { chapter: "medicaid", file: "WR-320.yaml", removed: false },
      { chapter: "supplied", file: "WR-002.yaml", removed: true },
    ]);
    expect(next.volumes[0].chapters[0].files).toEqual(["WR-001.yaml"]);
    expect(next.volumes[0].chapters[1].files).toEqual([
      "WR-003.yaml", "WR-200.yaml", "WR-320.yaml",
    ]);
    expect(manifest.volumes[0].chapters[0].files).toEqual(["WR-001.yaml", "WR-002.yaml"]);
  });
});

describe("proposeChangeSet", () => {
  it("branches, writes one file per edit, and opens a pull request", async () => {
    const before = engine.itemById("WR-003")!;
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, {
      id: "WR-003", chapter: "medicaid", before,
      after: { ...before, meaning: "A restated meaning long enough for an approver." },
    });
    const { client, calls } = fakeClient();
    const result = await proposeChangeSet({
      client, volume, manifest, changeSet: cs,
      report: validateChangeSet(engine, cs), engine, newBranchId: () => "ab12cd",
    });
    expect(result.branch).toBe("codex/mwr/ab12cd");
    expect(result.pr.number).toBe(12);
    expect(result.paths).toEqual(["volumes/mwr/medicaid/WR-003.yaml"]);
    expect(calls).toEqual([
      "getRefSha main",
      "branchExists codex/mwr/ab12cd",
      "createBranch codex/mwr/ab12cd basesha",
      "getFileSha volumes/mwr/medicaid/WR-003.yaml",
      "putFile volumes/mwr/medicaid/WR-003.yaml",
      "findPullRequest codex/mwr/ab12cd",
      "createPullRequest",
    ]);
  });

  it("sends the exact serialized item as the file body", async () => {
    const before = engine.itemById("WR-003")!;
    const after = { ...before, meaning: "A restated meaning long enough for an approver." };
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, { id: "WR-003", chapter: "medicaid", before, after });
    let sent = "";
    const { client } = fakeClient({
      async putFile(a) { sent = a.content; },
    });
    await proposeChangeSet({
      client, volume, manifest, changeSet: cs,
      report: validateChangeSet(engine, cs), engine, newBranchId: () => "ab12cd",
    });
    expect(sent).toBe(stringifyItem(after));
  });

  it("rewrites the manifest when an item is added or deleted", async () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, {
      id: "WR-002", chapter: "supplied",
      before: engine.itemById("WR-002")!, after: null,
    });
    const written: string[] = [];
    const { client } = fakeClient({
      async putFile(a) { written.push(a.path); },
      async deleteFile(a) { written.push(`delete ${a.path}`); },
    });
    const result = await proposeChangeSet({
      client, volume, manifest, changeSet: cs,
      report: validateChangeSet(engine, cs), engine, newBranchId: () => "ab12cd",
    });
    expect(written).toEqual(["delete volumes/mwr/supplied/WR-002.yaml", "codex.json"]);
    expect(result.manifest.volumes[0].chapters[0].files).toEqual(["WR-001.yaml"]);
  });

  it("hands the branch name back before writing so a retry can reuse it", async () => {
    const before = engine.itemById("WR-003")!;
    let cs = emptyChangeSet("mwr", "main");
    cs = putEntry(cs, {
      id: "WR-003", chapter: "medicaid", before,
      after: { ...before, meaning: "A restated meaning long enough for an approver." },
    });
    const { client, calls } = fakeClient();
    const seen: string[] = [];
    await proposeChangeSet({
      client, volume, manifest, changeSet: cs,
      report: validateChangeSet(engine, cs), engine, newBranchId: () => "ab12cd",
      onBranch: (b) => seen.push(`onBranch ${b} after ${calls.length} calls`),
    });
    expect(seen).toEqual(["onBranch codex/mwr/ab12cd after 0 calls"]);
  });

  it("writes a staged file entry beside the item files and deletes a null one", async () => {
    let cs = emptyChangeSet("mwr", "main");
    cs = putFileEntry(cs, {
      path: "volumes/mwr/documents.yaml",
      before: "- id: D-1\n",
      after: "- id: D-1\n- id: D-2\n",
      label: "documents.yaml (D-2 State hardship guidance)",
    });
    cs = putFileEntry(cs, {
      path: "volumes/mwr/documents/D-2.md",
      before: null, after: "Pasted text.\n", label: "D-2 State hardship guidance",
    });
    cs = putFileEntry(cs, {
      path: "volumes/mwr/documents/D-0.md", before: "old\n", after: null, label: "D-0 withdrawn",
    });
    const { client, calls } = fakeClient();
    const bodies: Record<string, string> = {};
    const withBody: GitHubClient = {
      ...client,
      async putFile(a) { bodies[a.path] = a.content; return client.putFile(a); },
    };
    const result = await proposeChangeSet({
      client: withBody, volume, manifest, changeSet: cs,
      report: validateChangeSet(engine, cs), engine, newBranchId: () => "ab12cd",
    });
    expect(calls).toEqual([
      "getRefSha main",
      "branchExists codex/mwr/ab12cd",
      "createBranch codex/mwr/ab12cd basesha",
      "getFileSha volumes/mwr/documents.yaml",
      "putFile volumes/mwr/documents.yaml",
      "getFileSha volumes/mwr/documents/D-2.md",
      "putFile volumes/mwr/documents/D-2.md",
      "getFileSha volumes/mwr/documents/D-0.md",
      "deleteFile volumes/mwr/documents/D-0.md",
      "findPullRequest codex/mwr/ab12cd",
      "createPullRequest",
    ]);
    expect(bodies["volumes/mwr/documents/D-2.md"]).toBe("Pasted text.\n");
    expect(result.paths).toContain("volumes/mwr/documents.yaml");
    // A file entry is not an item, so the manifest is left alone.
    expect(calls).not.toContain("putFile codex.json");
  });

  it("reuses an existing branch and updates the open pull request", async () => {
    const before = engine.itemById("WR-003")!;
    let cs = emptyChangeSet("mwr", "main");
    cs.branch = "codex/mwr/ab12cd";
    cs = putEntry(cs, {
      id: "WR-003", chapter: "medicaid", before,
      after: { ...before, meaning: "A restated meaning long enough for an approver." },
    });
    const { client, calls } = fakeClient({
      async branchExists() { return true; },
      async findPullRequest() { return PR; },
    });
    await proposeChangeSet({
      client, volume, manifest, changeSet: cs,
      report: validateChangeSet(engine, cs), engine,
    });
    expect(calls).not.toContain("createBranch codex/mwr/ab12cd basesha");
    expect(calls).toContain("updatePullRequest");
  });
});
