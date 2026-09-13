import { describe, it, expect } from "vitest";
import { fileHistory } from "../../src/github/history";

const repo = { owner: "jisaf", name: "policy-codex" };
const API = "https://api.github.com/repos/jisaf/policy-codex/commits" +
  "?path=volumes%2Fmwr%2Fmedicaid%2FWR-200.yaml&sha=main&per_page=20";

function fakeFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: (init?.headers as Record<string, string>) ?? {} });
    return {
      ok: status < 400, status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("fileHistory", () => {
  it("reads commits for a path anonymously, newest first", async () => {
    const { impl, calls } = fakeFetch(200, [
      {
        sha: "abc1234567",
        html_url: "https://github.com/jisaf/policy-codex/commit/abc1234567",
        commit: { message: "Merge pull request #42 from x/y\n\nbody", author: { date: "2027-01-02" } },
      },
      {
        sha: "def7654321",
        html_url: "https://github.com/jisaf/policy-codex/commit/def7654321",
        commit: { message: "Tighten the age range (#41)", author: { date: "2026-12-01" } },
      },
      {
        sha: "0001112223",
        html_url: "https://github.com/jisaf/policy-codex/commit/0001112223",
        commit: { message: "Add the item", author: { date: "2026-11-01" } },
      },
    ]);
    const history = await fileHistory(
      repo, "volumes/mwr/medicaid/WR-200.yaml", "main", impl,
    );
    expect(calls[0].url).toBe(API);
    expect(calls[0].headers.Authorization).toBeUndefined();
    expect(history).toEqual([
      {
        sha: "abc1234567", date: "2027-01-02",
        message: "Merge pull request #42 from x/y",
        url: "https://github.com/jisaf/policy-codex/commit/abc1234567",
        pr: { number: 42, url: "https://github.com/jisaf/policy-codex/pull/42" },
      },
      {
        sha: "def7654321", date: "2026-12-01",
        message: "Tighten the age range (#41)",
        url: "https://github.com/jisaf/policy-codex/commit/def7654321",
        pr: { number: 41, url: "https://github.com/jisaf/policy-codex/pull/41" },
      },
      {
        sha: "0001112223", date: "2026-11-01",
        message: "Add the item",
        url: "https://github.com/jisaf/policy-codex/commit/0001112223",
        pr: undefined,
      },
    ]);
  });

  it("returns null rather than throwing on a non-ok response (e.g. 403)", async () => {
    const { impl } = fakeFetch(403, { message: "API rate limit exceeded" });
    const history = await fileHistory(repo, "volumes/mwr/medicaid/WR-200.yaml", "main", impl);
    expect(history).toBeNull();
  });

  it("returns null rather than throwing on a network error", async () => {
    const impl = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
    const history = await fileHistory(repo, "volumes/mwr/medicaid/WR-200.yaml", "main", impl);
    expect(history).toBeNull();
  });
});
