// Earned-income records: writes the translation (translate-earnings.ts) into
// the volume: each stored household's `earnings` (volumes/co/tests/cases.yaml,
// edited in place so its comments and layout stay as they are), and each
// rule test that states the earned-income facts (the item files, rewritten
// byte-stably). The transition rule (step E0 to E1): a household or test
// that states earned income states it in the scalar facts, which every
// program still reads, and as earnings records, both written here from the
// one statement. Re-run after any change to a household's earned facts;
// npm run records:harness -- --list earnings fails while the two disagree.
//
//   npm run records:translate [-- --dry-run]
import fs from "node:fs";
import path from "node:path";
import { isMap, isSeq, parseDocument, type Pair, type YAMLMap } from "yaml";
import { parseItemFile, stringifyItem, flowValue } from "../../src/engine/yaml";
import { translateCase, translateTest } from "./translate-earnings";
import { currentLedger, root } from "../receipts/ledgers";
import type { HouseholdCase } from "../../src/engine/cases";

const dry = process.argv.includes("--dry-run");
const L = currentLedger();
const vol = path.join(root, L.ledger.volumePath);

// ---- stored households ----
const casesPath = path.join(vol, "tests/cases.yaml");
let text = fs.readFileSync(casesPath, "utf8");
const lineStart = (t: string, at: number) => t.lastIndexOf("\n", at - 1) + 1;
const lineEnd = (t: string, at: number) => { const i = t.indexOf("\n", at); return i < 0 ? t.length : i + 1; };

const doc = parseDocument(text);
const seq = doc.contents;
if (!isSeq(seq)) throw new Error("cases.yaml is not a list");
const edits: Array<{ start: number; end: number; insert: string }> = [];
let casesChanged = 0, persons = 0;
for (const node of seq.items) {
  if (!isMap(node)) continue;
  const c = node.toJSON() as HouseholdCase;
  const tr = translateCase(c, L.ix);
  if (!tr.changed) continue;
  casesChanged++;
  const ps = node.get("persons", true);
  if (!isMap(ps)) throw new Error(`${c.id}: persons is not a mapping`);
  for (const pair of (ps as YAMLMap).items as Pair[]) {
    const pid = String((pair.key as { value?: unknown }).value ?? pair.key);
    const want = tr.value.persons[pid]?.facts?.earnings;
    const pnode = pair.value;
    if (!isMap(pnode)) throw new Error(`${c.id} ${pid}: not a mapping`);
    if (JSON.stringify(c.persons[pid]?.facts?.earnings) === JSON.stringify(want)) continue;
    persons++;
    const facts = pnode.get("facts", true);
    const list = (want ?? []) as unknown[];
    if (!isMap(facts) || !(facts as YAMLMap).items.length) {
      // a person who states earned facts only by month: a facts mapping is added
      const pitems = (pnode as YAMLMap).items as Pair[];
      const firstKey = pitems[0].key as { range: [number, number, number] };
      const indent = " ".repeat(firstKey.range[0] - lineStart(text, firstKey.range[0]));
      const block = `${indent}facts:\n` + (list.length === 0 ? `${indent}  earnings: []\n`
        : [`${indent}  earnings:`, ...list.map((r) => `${indent}  - ${flowValue(r)}`)].join("\n") + "\n");
      const at = lineStart(text, firstKey.range[0]);
      edits.push({ start: at, end: at, insert: block });
      continue;
    }
    const fitems = (facts as YAMLMap).items as Pair[];
    const firstKey = fitems[0].key as { range: [number, number, number] };
    const indent = " ".repeat(firstKey.range[0] - lineStart(text, firstKey.range[0]));
    const block = want === undefined ? ""
      : list.length === 0 ? `${indent}earnings: []\n`
      : [`${indent}earnings:`, ...list.map((r) => `${indent}- ${flowValue(r)}`)].join("\n") + "\n";
    const existing = fitems.find((p) => String((p.key as { value?: unknown }).value) === "earnings");
    if (existing) {
      const ks = (existing.key as { range: [number, number, number] }).range[0];
      const ve = (existing.value as { range: [number, number, number] }).range[2];
      edits.push({ start: lineStart(text, ks), end: lineEnd(text, ve - 1), insert: block });
    } else {
      const last = fitems[fitems.length - 1];
      const ve = (last.value as { range: [number, number, number] } | null)?.range[1] ?? (last.key as { range: [number, number, number] }).range[1];
      const at = lineEnd(text, ve - 1);
      edits.push({ start: at, end: at, insert: block });
    }
  }
}
edits.sort((a, b) => b.start - a.start);
for (const e of edits) text = text.slice(0, e.start) + e.insert + text.slice(e.end);

// ---- rule tests ----
let testsChanged = 0;
const itemFiles: Array<[string, string]> = [];
for (const [id, dir] of Object.entries(L.ledger.chapterOf)) {
  const f = path.join(vol, dir, `${id}.yaml`);
  const it = parseItemFile(fs.readFileSync(f, "utf8"));
  if (!it.tests?.length) continue;
  let changed = false;
  it.tests = it.tests.map((t) => {
    const tr = translateTest(t, L.ix, t.as_of ?? L.ledger.meta.default_as_of);
    if (tr.changed) { changed = true; testsChanged++; }
    return tr.value;
  });
  if (changed) itemFiles.push([f, stringifyItem(it)]);
}

console.log(`households re-translated: ${casesChanged} (${persons} persons); rule tests re-translated: ${testsChanged} in ${itemFiles.length} item files`);
if (!dry) {
  fs.writeFileSync(casesPath, text);
  for (const [f, t] of itemFiles) fs.writeFileSync(f, t);
  // the written file must read back as the translation
  const again = parseDocument(fs.readFileSync(casesPath, "utf8")).toJSON() as HouseholdCase[];
  const stale = again.filter((c) => translateCase(c, L.ix).changed).map((c) => c.id);
  if (stale.length) { console.error(`not a fixed point: ${stale.join(", ")}`); process.exitCode = 1; }
}
