import { describe, it, expect } from "vitest";
import { createGitHubClient, encodeContent, GitHubError } from "../../src/github/client";

const repo = { owner: "jisaf", name: "policy-codex" };
const API = "https://api.github.com/repos/jisaf/policy-codex";

interface Recorded { status: number; body: unknown }
function recorder(routes: Record<string, Recorded>) {
  const calls: Array<{ method: string; url: string; body: any }> = [];
  const impl = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(init.body as string) : null;
    calls.push({ method, url, body });
    const r = routes[`${method} ${url}`];
    if (!r) return { ok: false, status: 404, json: async () => ({ message: "Not Found" }), text: async () => "Not Found" };
    return {
      ok: r.status < 400, status: r.status,
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    };
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const PR_BODY = {
  number: 12, title: "Codex change set", body: "b", state: "open",
  html_url: "https://github.com/jisaf/policy-codex/pull/12",
  head: { ref: "codex/mwr/ab12cd", sha: "headsha" },
  base: { ref: "main" },
};

describe("github client", () => {
  it("encodes UTF-8 content as base64", () => {
    expect(encodeContent("meaning: café\n")).toBe(btoa("meaning: cafÃ©\n"));
  });

  it("reads a ref sha and a file sha without a token", async () => {
    const { impl, calls } = recorder({
      [`GET ${API}/git/ref/heads%2Fmain`]: { status: 200, body: { object: { sha: "basesha" } } },
      [`GET ${API}/contents/volumes/mwr/medicaid/WR-003.yaml?ref=main`]:
        { status: 200, body: { sha: "filesha" } },
    });
    const gh = createGitHubClient(repo, null, impl);
    expect(gh.hasToken).toBe(false);
    expect(await gh.getRefSha("main")).toBe("basesha");
    expect(await gh.getFileSha("volumes/mwr/medicaid/WR-003.yaml", "main")).toBe("filesha");
    expect(calls[0].url).toContain("/git/ref/heads%2Fmain");
  });

  it("returns null for a file that does not exist yet", async () => {
    const { impl } = recorder({});
    expect(await createGitHubClient(repo, null, impl).getFileSha("new.yaml", "main")).toBeNull();
  });

  it("refuses to write without a token", async () => {
    const { impl } = recorder({});
    const gh = createGitHubClient(repo, null, impl);
    await expect(gh.createBranch("codex/mwr/ab12cd", "basesha")).rejects.toThrow(
      "a GitHub token is required to propose changes",
    );
  });

  it("creates a branch, puts a file, and opens a pull request", async () => {
    const { impl, calls } = recorder({
      [`POST ${API}/git/refs`]: { status: 201, body: { ref: "refs/heads/codex/mwr/ab12cd" } },
      [`PUT ${API}/contents/volumes/mwr/medicaid/WR-003.yaml`]: { status: 200, body: { content: {} } },
      [`GET ${API}/pulls?head=jisaf%3Acodex%2Fmwr%2Fab12cd&state=open`]: { status: 200, body: [] },
      [`POST ${API}/pulls`]: { status: 201, body: PR_BODY },
    });
    const gh = createGitHubClient(repo, "tok", impl);
    await gh.createBranch("codex/mwr/ab12cd", "basesha");
    await gh.putFile({
      path: "volumes/mwr/medicaid/WR-003.yaml", content: "id: WR-003\n",
      message: "codex: update WR-003", branch: "codex/mwr/ab12cd", sha: "filesha",
    });
    expect(await gh.findPullRequest("codex/mwr/ab12cd")).toBeNull();
    const pr = await gh.createPullRequest({
      title: "Codex change set", body: "b", headRef: "codex/mwr/ab12cd", baseRef: "main",
    });
    expect(pr.number).toBe(12);
    expect(pr.headRef).toBe("codex/mwr/ab12cd");
    expect(pr.headSha).toBe("headsha");
    expect(calls[0].body).toEqual({ ref: "refs/heads/codex/mwr/ab12cd", sha: "basesha" });
    expect(calls[1].body.content).toBe(encodeContent("id: WR-003\n"));
    expect(calls[1].body.sha).toBe("filesha");
    expect(calls.every((c) => c.method === "GET" || c.url.startsWith(API))).toBe(true);
  });

  it("resolves a pull request number to its head ref and sha", async () => {
    const { impl } = recorder({ [`GET ${API}/pulls/12`]: { status: 200, body: PR_BODY } });
    const pr = await createGitHubClient(repo, null, impl).getPullRequest(12);
    expect(pr.headRef).toBe("codex/mwr/ab12cd");
    expect(pr.baseRef).toBe("main");
    expect(pr.url).toBe("https://github.com/jisaf/policy-codex/pull/12");
  });

  it("surfaces the API message on failure", async () => {
    const { impl } = recorder({
      [`POST ${API}/git/refs`]: { status: 422, body: { message: "Reference already exists" } },
    });
    const gh = createGitHubClient(repo, "tok", impl);
    await expect(gh.createBranch("codex/mwr/ab12cd", "basesha")).rejects.toThrow(
      "Reference already exists",
    );
    await expect(gh.createBranch("codex/mwr/ab12cd", "basesha")).rejects.toBeInstanceOf(GitHubError);
  });
});
