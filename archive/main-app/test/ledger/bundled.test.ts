import { describe, it, expect } from "vitest";
import { bundleReader, chunkFiles, type BundleIndex } from "../../src/ledger/bundled";
import { BUNDLED, bundledSource, LOCAL_REF, pickSource, probeBundled } from "../../src/ledger/source";
import { refLabel } from "../../src/ledger/mode";
import { loadManifest } from "../../src/ledger/load";
import { proposeBlockedReason, PREVIEW_PROPOSE_REASON } from "../../src/ui/propose";

const repo = { owner: "jisaf", name: "policy-codex" };

function bundleFetch(index: BundleIndex, chunks: Record<string, Record<string, string>>) {
  const calls: string[] = [];
  const impl = (async (url: string) => {
    calls.push(url);
    const name = url.replace(/^\.\/ledger\//, "");
    const body = name === "index.json" ? index : chunks[name];
    if (!body) return { ok: false, status: 404, text: async () => "not found" };
    return { ok: true, status: 200, text: async () => JSON.stringify(body) };
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const index: BundleIndex = {
  info: { head: "0123456789abcdef", branch: "main", dirty: false },
  files: {
    "codex.json": "codex-0.json",
    "volumes/co/volume.yaml": "co-0.json",
    "volumes/co/documents/D-1.md": "co-documents-0.json",
  },
};
const chunks = {
  "codex-0.json": { "codex.json": '{"volumes":[{"id":"co","title":"Colorado","path":"volumes/co","chapters":[]}]}' },
  "co-0.json": { "volumes/co/volume.yaml": "title: Colorado\n" },
  "co-documents-0.json": { "volumes/co/documents/D-1.md": "# D-1\n" },
};

describe("bundled source", () => {
  it("is off in an ordinary build", () => {
    expect(BUNDLED).toBe(false);
  });

  it("reads files from their chunk, fetching each chunk once and only when needed", async () => {
    const { impl, calls } = bundleFetch(index, chunks);
    const src = bundledSource(bundleReader("./ledger/", impl));
    expect(src.ref).toBe(LOCAL_REF);
    expect(await src.head()).toBeNull();
    const manifest = await loadManifest(src);
    expect(manifest.volumes.map((v) => v.id)).toEqual(["co"]);
    expect(await src.readText("volumes/co/volume.yaml")).toBe("title: Colorado\n");
    expect(await src.readText("volumes/co/volume.yaml")).toBe("title: Colorado\n");
    expect(calls).toEqual(["./ledger/index.json", "./ledger/codex-0.json", "./ledger/co-0.json"]);
    await expect(src.readText("volumes/co/tests/cases.yaml")).rejects.toThrow(/not found/);
    expect(await src.readText("volumes/co/documents/D-1.md")).toBe("# D-1\n");
    expect(calls).toContain("./ledger/co-documents-0.json");
  });

  it("pickSource reads the bundle for the local ref and never the network", async () => {
    const { impl, calls } = bundleFetch(index, chunks);
    const noNet = (async () => { throw new Error("network"); }) as unknown as typeof fetch;
    const src = pickSource(repo, LOCAL_REF, null, noNet, bundleReader("./ledger/", impl));
    expect(await src.readText("volumes/co/volume.yaml")).toBe("title: Colorado\n");
    expect(calls.every((u) => u.startsWith("./ledger/"))).toBe(true);
  });

  it("probes as a bundled working tree, labelled a preview snapshot", async () => {
    const { impl } = bundleFetch(index, chunks);
    const info = await probeBundled(bundleReader("./ledger/", impl));
    expect(info).toEqual({ mode: "local", bundled: true, head: "0123456789abcdef", branch: "main", dirty: false });
    expect(refLabel(LOCAL_REF, info)).toBe("preview snapshot (main @ 0123456)");
    const missing = bundleFetch({ info: index.info, files: {} }, {});
    const broken = (async () => ({ ok: false, status: 404, text: async () => "" })) as unknown as typeof fetch;
    expect(await probeBundled(bundleReader("./ledger/", broken))).toBeNull();
    expect(await probeBundled(bundleReader("./ledger/", missing.impl))).not.toBeNull();
  });

  it("blocks Propose in a preview build with a plain reason", () => {
    expect(proposeBlockedReason({ hasToken: true, entryCount: 1, valid: true, isPrRef: false, preview: true }))
      .toBe(PREVIEW_PROPOSE_REASON);
    expect(proposeBlockedReason({ hasToken: true, entryCount: 1, valid: true, isPrRef: false })).toBeNull();
  });
});

describe("chunkFiles", () => {
  it("groups files and keeps each chunk under the limit", () => {
    const files = [
      { path: "volumes/co/documents/D-1.md", text: "x".repeat(60) },
      { path: "volumes/co/documents/D-2.md", text: "y".repeat(60) },
      { path: "volumes/co/volume.yaml", text: "title: co" },
      { path: "codex.json", text: "{}" },
    ];
    const groupOf = (p: string) => (p.includes("/documents/") ? "co-documents" : p.startsWith("volumes/") ? "co" : "codex");
    const { chunks: out, index: idx } = chunkFiles(files, 100, groupOf);
    expect(idx["volumes/co/documents/D-1.md"]).toBe("co-documents-0.json");
    expect(idx["volumes/co/documents/D-2.md"]).toBe("co-documents-1.json");
    expect(idx["volumes/co/volume.yaml"]).toBe("co-0.json");
    expect(idx["codex.json"]).toBe("codex-0.json");
    for (const c of out) expect(JSON.stringify(c.files).length).toBeLessThanOrEqual(100);
    expect(Object.keys(idx).sort()).toEqual(files.map((f) => f.path).sort());
  });
});
