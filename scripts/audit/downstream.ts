/* Lists every item resting, directly or through what it reads, on the given
 * excerpts:  npx vite-node scripts/audit/downstream.ts -- S1228 S1230 */
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import { buildGraph, impactOf } from "../../src/engine/graph";

const root = path.resolve(import.meta.dirname, "../..");
const excerpts = process.argv.slice(2).filter((a) => a !== "--");
const { vol, engine } = loadVolume(root, "co");
const ix = engine.index;
const cites = (it: { sources?: string[]; versions?: { source?: string }[] }) => {
  const s = new Set<string>(it.sources ?? []);
  for (const v of it.versions ?? []) if (v.source) s.add(v.source);
  return s;
};
const direct = vol.items.filter((it) => excerpts.some((e) => cites(it).has(e)));
const g = buildGraph(ix);
const down = impactOf(g, direct.map((i) => i.identifier));
const row = (id: string, how: string) => {
  const it = ix.byIdentifier.get(id)!;
  console.log(`${it.id}\t${it.identifier}\t${it.kind}\t${it.program}\t${it.status ?? "Draft"}\t${how}`);
};
for (const it of direct) row(it.identifier, "cites " + excerpts.filter((e) => cites(it).has(e)).join(","));
for (const id of down) if (!direct.some((d) => d.identifier === id)) row(id, "reads");
