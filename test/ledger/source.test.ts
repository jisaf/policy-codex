import { describe, it, expect } from "vitest";
import { apiSource, rawSource } from "../../src/ledger/source";

const repo = { owner: "jisaf", name: "policy-codex" };

function fakeFetch(routes: Record<string, { status?: number; body: string }>) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: (init?.headers as Record<string, string>) ?? {} });
    const r = routes[url];
    if (!r) return { ok: false, status: 404, text: async () => "not found" };
    const status = r.status ?? 200;
    return {
      ok: status < 400, status,
      text: async () => r.body,
      json: async () => JSON.parse(r.body),
    };
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("rawSource", () => {
  it("reads a file from raw.githubusercontent.com at a ref", async () => {
    const { impl } = fakeFetch({
      "https://raw.githubusercontent.com/jisaf/policy-codex/main/codex.json":
        { body: '{"volumes":[]}' },
    });
    const src = rawSource(repo, "main", impl);
    expect(await src.readText("codex.json")).toBe('{"volumes":[]}');
  });

  it("resolves a head sha without a token", async () => {
    const { impl, calls } = fakeFetch({
      "https://api.github.com/repos/jisaf/policy-codex/commits/main": { body: "abc1234" },
    });
    expect(await rawSource(repo, "main", impl).head()).toBe("abc1234");
    expect(calls[0].headers.Accept).toBe("application/vnd.github.sha");
    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it("returns null rather than throwing when the sha lookup fails", async () => {
    const { impl } = fakeFetch({});
    expect(await rawSource(repo, "main", impl).head()).toBeNull();
  });

  it("throws a readable error on a missing file", async () => {
    const { impl } = fakeFetch({});
    await expect(rawSource(repo, "main", impl).readText("nope.yaml")).rejects.toThrow(
      "nope.yaml not found at main (404)",
    );
  });
});

describe("apiSource", () => {
  it("reads base64 content through the contents API with the token", async () => {
    const body = JSON.stringify({ content: btoa("hello: world\n"), encoding: "base64" });
    const { impl, calls } = fakeFetch({
      "https://api.github.com/repos/jisaf/policy-codex/contents/volumes/mwr/volume.yaml?ref=feature-x":
        { body },
    });
    const src = apiSource(repo, "feature-x", "tok", impl);
    expect(await src.readText("volumes/mwr/volume.yaml")).toBe("hello: world\n");
    expect(calls[0].headers.Authorization).toBe("Bearer tok");
  });
});
