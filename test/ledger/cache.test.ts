import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { cacheKey, idbCache, memoryCache } from "../../src/ledger/cache";
import type { CachedVolume } from "../../src/ledger/cache";

const sample = {
  volumeId: "mwr", title: "t", path: "volumes/mwr", sha: "abc",
  meta: { volume: "work-requirements" }, items: [{ id: "WR-001" }],
  sources: [], openQuestions: [], chapterOf: { "WR-001": "supplied" },
} as unknown as CachedVolume;

describe("cache", () => {
  it("keys by volume and sha", () => {
    expect(cacheKey("mwr", "abc")).toBe("mwr@abc");
  });

  it("round-trips through memory", async () => {
    const c = memoryCache();
    expect(await c.get("mwr@abc")).toBeNull();
    await c.put("mwr@abc", sample);
    expect((await c.get("mwr@abc"))!.items).toHaveLength(1);
  });

  it("round-trips through IndexedDB", async () => {
    const c = idbCache("codex-cache-test");
    await c.put("mwr@abc", sample);
    const back = await c.get("mwr@abc");
    expect(back!.chapterOf["WR-001"]).toBe("supplied");
    await c.clear();
    expect(await c.get("mwr@abc")).toBeNull();
  });
});
