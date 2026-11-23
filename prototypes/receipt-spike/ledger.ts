// Receipt spike: the three ledgers the harness compares. `old` is the
// Colorado volume as it is; `a` and `b` are the same volume with the Model A
// (receipt records) or Model B (scalar partition) overlay: an overlay item
// replaces the base item of the same identifier, a new identifier is added,
// and a metadata-only entry (no `kind`) is merged onto the base item.
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml, stringify } from "yaml";
import { loadLedgerFromDisk, type LoadedLedger } from "../../src/tools/check";
import { buildIndex, type LedgerIndex } from "../../src/engine/ledger-index";
import { parseItemFile } from "../../src/engine/yaml";
import type { Item } from "../../src/engine/types";

export const root = path.resolve(import.meta.dirname, "../..");
export const spikeDir = import.meta.dirname;

export interface Model {
  name: "old" | "a" | "b";
  items: Item[];
  ix: LedgerIndex;
  /** Overlay items (rewritten or new), by identifier. */
  overlay: Map<string, Item>;
  /** Model B: the leaves each rewritten item declares it leaves out. */
  excludes: Map<string, string[]>;
}

function readOverlay(dir: string): { items: Item[]; meta: Array<Record<string, unknown>>; excludes: Map<string, string[]> } {
  const items: Item[] = [];
  const meta: Array<Record<string, unknown>> = [];
  const excludes = new Map<string, string[]>();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".yaml")).sort()) {
    const raw = parseYaml(fs.readFileSync(path.join(dir, f), "utf8"));
    for (const r of Array.isArray(raw) ? raw : [raw]) {
      const rec = { ...(r as Record<string, unknown>) };
      if (!("kind" in rec)) { meta.push(rec); continue; }
      if (Array.isArray(rec.excludes)) excludes.set(rec.identifier as string, rec.excludes as string[]);
      delete rec.excludes;
      items.push(parseItemFile(stringify(rec)));
    }
  }
  return { items, meta, excludes };
}

let base: LoadedLedger | null = null;
export function baseLedger(): LoadedLedger {
  return (base ??= loadLedgerFromDisk(root, "co"));
}

export function loadModel(name: "old" | "a" | "b"): Model {
  const led = baseLedger();
  const roles = led.meta.relationship_roles ?? null;
  if (name === "old") {
    return { name, items: led.items, ix: buildIndex(led.items, roles), overlay: new Map(), excludes: new Map() };
  }
  const ov = readOverlay(path.join(spikeDir, name === "a" ? "model-a" : "model-b"));
  const byId = new Map(led.items.map((it) => [it.identifier, it]));
  const overlay = new Map<string, Item>();
  for (const it of ov.items) { byId.set(it.identifier, it); overlay.set(it.identifier, it); }
  for (const m of ov.meta) {
    const it = byId.get(m.identifier as string);
    if (!it) throw new Error(`metadata for unknown identifier ${m.identifier}`);
    byId.set(it.identifier, { ...it, ...(m as Partial<Item>) });
  }
  const items = [...byId.values()];
  return { name, items, ix: buildIndex(items, roles), overlay, excludes: ov.excludes };
}
