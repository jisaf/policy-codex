import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parseItemFile, parseVolumeFile, stringifyItem } from "../../src/engine/yaml";
import { createEngine } from "../../src/engine/engine";
import ledger from "../fixtures/ledger.json";
import refs from "../fixtures/refs.json";
import itemBlocks from "../fixtures/item-blocks.json";
import type { Item, VolumeMeta } from "../../src/engine/types";

const root = path.resolve(__dirname, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "codex.json"), "utf8"));
const volume = manifest.volumes[0];

function readItems(): Item[] {
  const out: Item[] = [];
  for (const ch of volume.chapters) {
    for (const f of ch.files) {
      out.push(parseItemFile(fs.readFileSync(path.join(root, volume.path, ch.dir, f), "utf8")));
    }
  }
  return out;
}

describe("migrated ledger", () => {
  it("has one manifest volume with four chapters covering 138 files", () => {
    expect(manifest.volumes).toHaveLength(1);
    expect(volume.id).toBe("mwr");
    expect(volume.chapters.map((c: { dir: string }) => c.dir)).toEqual([
      "supplied", "parameters", "medicaid", "snap",
    ]);
    expect(volume.chapters.map((c: { files: string[] }) => c.files.length)).toEqual([57, 28, 33, 20]);
  });

  it("names every file after its item id", () => {
    for (const ch of volume.chapters) {
      for (const f of ch.files) {
        const it = parseItemFile(fs.readFileSync(path.join(root, volume.path, ch.dir, f), "utf8"));
        expect(f).toBe(`${it.id}.yaml`);
      }
    }
  });

  it("carries the volume metadata", () => {
    const meta = parseVolumeFile(
      fs.readFileSync(path.join(root, volume.path, "volume.yaml"), "utf8"),
    );
    expect(meta.volume).toBe("work-requirements");
    expect(meta.default_as_of).toBe("2027-03-15");
    expect(meta.scopes).toEqual(["person", "person-month", "case", "month", "global"]);
    expect(meta.approval_policy.by_program.Medicaid).toEqual(["Medicaid policy owner"]);
  });

  it("moves the sources and open questions unchanged", () => {
    const src = fs.readFileSync(path.join(root, volume.path, "sources.md"), "utf8");
    const oq = fs.readFileSync(path.join(root, volume.path, "open-questions.md"), "utf8");
    expect(src.match(/^### S\d+\./gm)).toHaveLength(33);
    expect(oq.match(/^### OQ-\d+ /gm)).toHaveLength(23);
  });

  it("loads an item set identical to the pre-migration ledger", () => {
    const before = ledger.items as unknown as Item[];
    const after = readItems();
    expect(after).toHaveLength(before.length);
    const byId = new Map(after.map((i) => [i.id, i]));
    for (const b of before) {
      expect(byId.get(b.id), b.id).toEqual(JSON.parse(JSON.stringify(b)));
    }
  });

  it("renders the same item blocks through the ported engine", () => {
    const meta = parseVolumeFile(
      fs.readFileSync(path.join(root, volume.path, "volume.yaml"), "utf8"),
    );
    const engine = createEngine(readItems(), meta as VolumeMeta, refs);
    for (const b of itemBlocks) {
      expect(engine.itemBlock(engine.itemById(b.id)!), b.id).toBe(b.block);
    }
  });

  it("stores every item file byte-stably", () => {
    for (const ch of volume.chapters) {
      for (const f of ch.files) {
        const p = path.join(root, volume.path, ch.dir, f);
        const text = fs.readFileSync(p, "utf8");
        expect(stringifyItem(parseItemFile(text)), f).toBe(text);
      }
    }
  });
});
