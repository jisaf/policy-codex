import { describe, it, expect } from "vitest";
import {
  gitRefOf, isLocalRef, LOCAL_REF, localSource, pickSource, probeLocal,
} from "../../src/ledger/source";

const repo = { owner: "jisaf", name: "policy-codex" };

function fakeFetch(routes: Record<string, { status?: number; body: string }>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = routes[url];
    if (!r) return { ok: false, status: 404, text: async () => "not found" };
    const status = r.status ?? 200;
    return { ok: status < 400, status, text: async () => r.body };
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("localSource", () => {
  it("reads the working tree under the local base, uncached, with no head", async () => {
    const { impl, calls } = fakeFetch({ "./__ledger/codex.json": { body: '{"volumes":[]}' } });
    const src = localSource("./__ledger/", impl);
    expect(src.ref).toBe(LOCAL_REF);
    expect(await src.readText("codex.json")).toBe('{"volumes":[]}');
    expect(calls[0].init?.cache).toBe("no-store");
    expect(await src.head()).toBeNull();
    await expect(src.readText("volumes/x.yaml")).rejects.toThrow(/working tree/);
  });

  it("pickSource picks it for the local ref and GitHub for any branch", async () => {
    const { impl, calls } = fakeFetch({
      "./__ledger/codex.json": { body: "local" },
      "https://raw.githubusercontent.com/jisaf/policy-codex/feature-x/codex.json": { body: "branch" },
    });
    expect(await pickSource(repo, LOCAL_REF, null, impl).readText("codex.json")).toBe("local");
    expect(await pickSource(repo, "feature-x", null, impl).readText("codex.json")).toBe("branch");
    expect(calls.map((c) => c.url)).toEqual([
      "./__ledger/codex.json",
      "https://raw.githubusercontent.com/jisaf/policy-codex/feature-x/codex.json",
    ]);
  });

  it("maps the working tree to the default branch when GitHub needs a ref", () => {
    expect(isLocalRef(LOCAL_REF)).toBe(true);
    expect(gitRefOf(LOCAL_REF, "main")).toBe("main");
    expect(gitRefOf("feature-x", "main")).toBe("feature-x");
  });
});

describe("probeLocal", () => {
  it("returns the info when the endpoint answers", async () => {
    const { impl } = fakeFetch({
      "./__ledger/__info": { body: JSON.stringify({ mode: "local", head: "abc1234", branch: "work", dirty: true }) },
    });
    expect(await probeLocal("./__ledger/", impl)).toEqual({
      mode: "local", head: "abc1234", branch: "work", dirty: true,
    });
  });

  it("is null on a 404, on a host that answers index.html, and on a network error", async () => {
    expect(await probeLocal("./__ledger/", fakeFetch({}).impl)).toBeNull();
    const html = fakeFetch({ "./__ledger/__info": { body: "<!doctype html><html></html>" } });
    expect(await probeLocal("./__ledger/", html.impl)).toBeNull();
    const boom = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    expect(await probeLocal("./__ledger/", boom)).toBeNull();
  });
});
