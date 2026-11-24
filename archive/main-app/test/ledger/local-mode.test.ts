import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { defaultRef, preferredVolume, refFromSearch, refLabel } from "../../src/ledger/mode";
import {
  gitRefOf, isLocalRef, LOCAL_REF, localSource, pickSource, probeLocal,
} from "../../src/ledger/source";
import { ledgerMiddleware, ledgerPath } from "../../scripts/vite-local-ledger";
import type { Manifest } from "../../src/ledger/manifest";

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

const manifest = (ids: string[]): Manifest => ({
  volumes: ids.map((id) => ({ id, title: id, path: `volumes/${id}`, chapters: [] })),
});

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

describe("default ref and volume", () => {
  const local = { mode: "local" as const, head: "abcdef1234", branch: "work", dirty: false };

  it("reads ?ref= from the query string", () => {
    expect(refFromSearch("?ref=feature-x")).toBe("feature-x");
    expect(refFromSearch("?other=1")).toBeNull();
    expect(refFromSearch("")).toBeNull();
  });

  it("prefers ?ref=, then the working tree, then main", () => {
    expect(defaultRef({ search: "?ref=feature-x", local })).toBe("feature-x");
    expect(defaultRef({ search: "?ref=main", local })).toBe("main");
    expect(defaultRef({ search: "", local })).toBe(LOCAL_REF);
    expect(defaultRef({ search: "", local: null })).toBe("main");
  });

  it("opens the last used volume, else co, else mwr, else the first", () => {
    expect(preferredVolume(manifest(["mwr", "co"]), "mwr")).toBe("mwr");
    expect(preferredVolume(manifest(["mwr", "co"]), null)).toBe("co");
    expect(preferredVolume(manifest(["mwr", "co"]), "gone")).toBe("co");
    expect(preferredVolume(manifest(["mwr"]), null)).toBe("mwr");
    expect(preferredVolume(manifest(["xx", "yy"]), null)).toBe("xx");
  });

  it("names the working tree with its branch and commit", () => {
    expect(refLabel("main", local)).toBe("main");
    expect(refLabel(LOCAL_REF, local)).toBe("working tree (work @ abcdef1)");
    expect(refLabel(LOCAL_REF, { ...local, dirty: true })).toBe("working tree (work @ abcdef1), edited");
  });
});

describe("the local ledger endpoint", () => {
  it("serves only the ledger's own paths", () => {
    expect(ledgerPath("/__ledger/codex.json")).toBe("codex.json");
    expect(ledgerPath("/__ledger/volumes/co/volume.yaml?x=1")).toBe("volumes/co/volume.yaml");
    expect(ledgerPath("/__ledger/docs/onboarding.md")).toBe("docs/onboarding.md");
    expect(ledgerPath("/__ledger/__info")).toBe("__info");
    expect(ledgerPath("/__ledger/package.json")).toBeNull();
    expect(ledgerPath("/__ledger/volumes/../package.json")).toBeNull();
    expect(ledgerPath("/__ledger/..%2Fpackage.json")).toBeNull();
    expect(ledgerPath("/index.html")).toBeNull();
  });

  it("answers files from the checkout and 404s the rest", async () => {
    const root = join(import.meta.dirname, "..", "..");
    const mw = ledgerMiddleware(root);
    const call = (url: string) => new Promise<{ status: number; body: string; next: boolean }>((done) => {
      const res = {
        statusCode: 200, headers: {} as Record<string, string>,
        setHeader(k: string, v: string) { this.headers[k] = v; },
        end(b?: string | Buffer) { done({ status: this.statusCode, body: String(b ?? ""), next: false }); },
      };
      mw({ url } as never, res as never, () => done({ status: 0, body: "", next: true }));
    });
    const manifestRes = await call("/__ledger/codex.json");
    expect(manifestRes.status).toBe(200);
    expect(JSON.parse(manifestRes.body).volumes.length).toBeGreaterThan(0);
    const info = JSON.parse((await call("/__ledger/__info")).body);
    expect(info.mode).toBe("local");
    expect((await call("/__ledger/package.json")).status).toBe(404);
    expect((await call("/__ledger/volumes/nope.yaml")).status).toBe(404);
    expect((await call("/src/main.tsx")).next).toBe(true);
  });
});
