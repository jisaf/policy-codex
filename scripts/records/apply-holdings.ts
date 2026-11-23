// Resource records: writes the translation (translate-holdings.ts) into the
// volume: each stored household's `holdings` (volumes/co/tests/cases.yaml,
// edited in place so its comments and layout stay as they are), and each
// rule test that states the resource facts (the item files, edited in
// place). The transition rule (step H0 to H1): a household or test that
// states resources states them in the scalar facts, which every program
// still reads, and as holdings records, both written here from the one
// statement. Re-run after any change to a household's resource facts;
// npm run records:harness -- --list holdings fails while the two disagree.
// The model is apply-earnings.ts (step E0), with the list's name changed.
//
//   npm run records:translate-holdings [-- --dry-run]
import fs from "node:fs";
import path from "node:path";
import { isMap, isSeq, parseDocument, type Pair, type YAMLMap } from "yaml";
import { parseItemFile, flowValue } from "../../src/engine/yaml";
import { translateCase, translateTest } from "./translate-holdings";
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
    const want = tr.value.persons[pid]?.facts?.holdings;
    const pnode = pair.value;
    if (!isMap(pnode)) throw new Error(`${c.id} ${pid}: not a mapping`);
    if (JSON.stringify(c.persons[pid]?.facts?.holdings) === JSON.stringify(want)) continue;
    persons++;
    const facts = pnode.get("facts", true);
    const list = (want ?? []) as unknown[];
    if (!isMap(facts) || !(facts as YAMLMap).items.length) {
      // a person who states earned facts only by month: a facts mapping is added
      const pitems = (pnode as YAMLMap).items as Pair[];
      const firstKey = pitems[0].key as { range: [number, number, number] };
      const indent = " ".repeat(firstKey.range[0] - lineStart(text, firstKey.range[0]));
      const block = `${indent}facts:\n` + (list.length === 0 ? `${indent}  holdings: []\n`
        : [`${indent}  holdings:`, ...list.map((r) => `${indent}  - ${flowValue(r)}`)].join("\n") + "\n");
      const at = lineStart(text, firstKey.range[0]);
      edits.push({ start: at, end: at, insert: block });
      continue;
    }
    const fitems = (facts as YAMLMap).items as Pair[];
    const firstKey = fitems[0].key as { range: [number, number, number] };
    const indent = " ".repeat(firstKey.range[0] - lineStart(text, firstKey.range[0]));
    const block = want === undefined ? ""
      : list.length === 0 ? `${indent}holdings: []\n`
      : [`${indent}holdings:`, ...list.map((r) => `${indent}- ${flowValue(r)}`)].join("\n") + "\n";
    const existing = fitems.find((p) => String((p.key as { value?: unknown }).value) === "holdings");
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
// Each item file is edited in place, as cases.yaml is: the holdings entry
// is inserted into (or replaces the one in) the map that holds the person's
// facts, in that map's own style (flow or block), so the file's comments,
// layout and every other test stay as they are.
type Range = [number, number, number];
const rangeOf = (n: unknown) => (n as { range: Range }).range;
/** The offset of the brace that closes the flow map opening at `at`
 *  (quoted strings skipped). */
function closeOf(src: string, at: number): number {
  let depth = 0;
  for (let i = at; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\"" || ch === "'") {
      for (i++; i < src.length && src[i] !== ch; i++) if (ch === "\"" && src[i] === "\\") i++;
      continue;
    }
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") { depth--; if (depth === 0) return i; }
  }
  throw new Error(`no closing brace for the map at ${at}`);
}
/** One text edit that puts `holdings: <list>` into a facts map. */
function editMap(src: string, holder: YAMLMap, list: unknown[]): { start: number; end: number; insert: string } {
  const flowList = flowValue(list);
  const pairs = holder.items as Pair[];
  const existing = pairs.find((x) => String((x.key as { value?: unknown }).value) === "holdings");
  if (existing) {
    const [vs, ve] = rangeOf(existing.value);
    return { start: vs, end: ve, insert: flowList };
  }
  if (holder.flow) {
    const close = closeOf(src, rangeOf(holder)[0]);
    return { start: close, end: close, insert: (pairs.length ? ", " : "") + `holdings: ${flowList}` };
  }
  const last = pairs[pairs.length - 1];
  const ks = rangeOf(last.key)[0];
  const indent = " ".repeat(ks - lineStart(src, ks));
  const ve = last.value ? rangeOf(last.value)[1] : rangeOf(last.key)[1];
  const at = lineEnd(src, ve - 1);
  return { start: at, end: at, insert: `${indent}holdings: ${flowList}\n` };
}
/** The map that holds a person's facts in a test node, by the route
 *  translateTest uses: p1 in given, others' persons in others, persons'
 *  facts in persons.<pid>.facts. */
function holderOf(test: YAMLMap, pid: string, persons: boolean): YAMLMap | null {
  const get = (m: unknown, k: string) => (isMap(m) ? (m as YAMLMap).get(k, true) : undefined);
  const h = persons ? get(get(get(test, "persons"), pid), "facts") : pid === "p1" ? get(test, "given") : get(get(test, "others"), pid);
  return isMap(h) ? (h as YAMLMap) : null;
}
let testsChanged = 0;
const itemFiles: Array<[string, string]> = [];
for (const [id, dir] of Object.entries(L.ledger.chapterOf)) {
  const f = path.join(vol, dir, `${id}.yaml`);
  const src = fs.readFileSync(f, "utf8");
  const it = parseItemFile(src);
  if (!it.tests?.length) continue;
  const d = parseDocument(src);
  const seqNode = (d.contents as YAMLMap).get("tests", true);
  if (!isSeq(seqNode)) continue;
  const fileEdits: Array<{ start: number; end: number; insert: string }> = [];
  it.tests.forEach((t, i) => {
    const tr = translateTest(t, L.ix, t.as_of ?? L.ledger.meta.default_as_of);
    if (!tr.changed) return;
    testsChanged++;
    const node = seqNode.items[i] as YAMLMap;
    const want: Array<[string, boolean, unknown]> = [];
    if (tr.value.given && "holdings" in tr.value.given) want.push(["p1", false, tr.value.given.holdings]);
    for (const [pid, o] of Object.entries(tr.value.others ?? {})) if ("holdings" in o) want.push([pid, false, o.holdings]);
    for (const [pid, p] of Object.entries(tr.value.persons ?? {})) if (p.facts && "holdings" in p.facts) want.push([pid, true, p.facts.holdings]);
    for (const [pid, persons, list] of want) {
      const before = persons ? t.persons?.[pid]?.facts?.holdings : pid === "p1" ? t.given?.holdings : t.others?.[pid]?.holdings;
      if (JSON.stringify(before) === JSON.stringify(list)) continue;
      const h = holderOf(node, pid, persons);
      if (!h) throw new Error(`${t.id} ${pid}: holdings to write but no facts map to write them in`);
      fileEdits.push(editMap(src, h, list as unknown[]));
    }
  });
  if (!fileEdits.length) continue;
  fileEdits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of fileEdits) out = out.slice(0, e.start) + e.insert + out.slice(e.end);
  itemFiles.push([f, out]);
}

console.log(`households re-translated: ${casesChanged} (${persons} persons); rule tests re-translated: ${testsChanged} in ${itemFiles.length} item files`);
if (!dry) {
  fs.writeFileSync(casesPath, text);
  for (const [f, t] of itemFiles) fs.writeFileSync(f, t);
  // and every rule test reads back as its translation
  const L2 = currentLedger();
  const staleTests = L2.ledger.items.flatMap((it) => (it.tests ?? []).filter((t) => translateTest(t, L2.ix, t.as_of ?? L2.ledger.meta.default_as_of).changed).map((t) => t.id));
  if (staleTests.length) { console.error(`rule tests not a fixed point: ${staleTests.slice(0, 20).join(", ")}`); process.exitCode = 1; }
  // the written file must read back as the translation
  const again = parseDocument(fs.readFileSync(casesPath, "utf8")).toJSON() as HouseholdCase[];
  const stale = again.filter((c) => translateCase(c, L.ix).changed).map((c) => c.id);
  if (stale.length) { console.error(`not a fixed point: ${stale.join(", ")}`); process.exitCode = 1; }
}
