import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadManifest, loadVolume, itemFilePath } from "../../src/ledger/load";
import { memoryCache } from "../../src/ledger/cache";
import type { LedgerSource } from "../../src/ledger/source";

const root = path.resolve(__dirname, "../..");

function diskSource(sha: string | null): LedgerSource & { reads: string[] } {
  const reads: string[] = [];
  return {
    ref: "main",
    reads,
    async readText(p: string) {
      reads.push(p);
      return fs.readFileSync(path.join(root, p), "utf8");
    },
    async head() { return sha; },
  };
}

/** Like `diskSource`, but 404s on `tests/cases.yaml` as though the volume had none. */
function diskSourceNoCases(sha: string | null): LedgerSource {
  return {
    ref: "main",
    async readText(p: string) {
      if (p.endsWith("tests/cases.yaml")) throw new Error(`${p} not found at main (404)`);
      return fs.readFileSync(path.join(root, p), "utf8");
    },
    async head() { return sha; },
  };
}

describe("loadVolume", () => {
  it("loads the whole volume from the manifest", async () => {
    const src = diskSource("sha1");
    const manifest = await loadManifest(src);
    const vol = await loadVolume(src, manifest, "mwr");
    expect(vol.volumeId).toBe("mwr");
    expect(vol.sha).toBe("sha1");
    expect(vol.items).toHaveLength(138);
    expect(vol.meta.default_as_of).toBe("2027-03-15");
    expect(vol.sources).toHaveLength(33);
    expect(vol.openQuestions).toHaveLength(23);
    expect(vol.cases).toHaveLength(13);
    expect(vol.chapterOf["WR-003"]).toBe("medicaid");
    expect(itemFilePath(vol, "WR-003")).toBe("volumes/mwr/medicaid/WR-003.yaml");
  });

  it("loads an empty cases array when tests/cases.yaml is missing", async () => {
    const src = diskSourceNoCases("sha2");
    const manifest = await loadManifest(src);
    const vol = await loadVolume(src, manifest, "mwr");
    expect(vol.cases).toEqual([]);
  });

  it("serves a second load of the same sha from the cache without refetching", async () => {
    const cache = memoryCache();
    const first = diskSource("sha1");
    const manifest = await loadManifest(first);
    await loadVolume(first, manifest, "mwr", { cache });
    const second = diskSource("sha1");
    const vol = await loadVolume(second, manifest, "mwr", { cache });
    expect(vol.items).toHaveLength(138);
    expect(second.reads).toEqual([]);
  });

  it("refetches when the sha is unknown", async () => {
    const cache = memoryCache();
    const src = diskSource(null);
    const manifest = await loadManifest(src);
    await loadVolume(src, manifest, "mwr", { cache });
    const again = diskSource(null);
    await loadVolume(again, manifest, "mwr", { cache });
    expect(again.reads.length).toBeGreaterThan(100);
  });

  it("rejects an unknown volume id", async () => {
    const src = diskSource("sha1");
    const manifest = await loadManifest(src);
    await expect(loadVolume(src, manifest, "nope")).rejects.toThrow(
      'no volume "nope" in codex.json',
    );
  });
});
