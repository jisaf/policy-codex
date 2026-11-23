// Receipt records: writes the translation (translate.ts) into the volume:
// each stored household's `receipts` (volumes/co/tests/cases.yaml, edited
// in place so its comments and layout stay as they are), and each rule test
// that states the old unearned-income facts (the item files, rewritten
// byte-stably). A retired fact a household or test still states (RETIRED)
// is moved to retired-facts.yaml first. Since phase 3 every old fact is
// retired, so a new household or test is written in receipts alone and this
// script only moves a stray old statement out and checks the fixed point;
// `npm run receipts:harness` fails while a stored household's receipts are
// not the translation of what it stated before.
//
//   npm run receipts:translate [-- --dry-run]
import fs from "node:fs";
import path from "node:path";
import { isMap, isSeq, parseDocument, type Pair, type YAMLMap } from "yaml";
import { parseItemFile, stringifyItem, flowValue } from "../../src/engine/yaml";
import { EVERY_MONTH, RETIRED, translateCase, translateTest } from "./translate";
import { loadRetired, saveRetired } from "./retired";
import { CHOICES } from "./choices";
import { currentLedger, root } from "./ledgers";
import type { HouseholdCase } from "../../src/engine/cases";

const dry = process.argv.includes("--dry-run");
const L = currentLedger();
const vol = path.join(root, L.ledger.volumePath);

// ---- stored households ----
const casesPath = path.join(vol, "tests/cases.yaml");
let text = fs.readFileSync(casesPath, "utf8");
const lineStart = (t: string, at: number) => t.lastIndexOf("\n", at - 1) + 1;
const lineEnd = (t: string, at: number) => { const i = t.indexOf("\n", at); return i < 0 ? t.length : i + 1; };

// Retirement: an old fact no reader is left for (RETIRED, and no longer in
// the ledger) is moved out of each household into retired-facts.yaml, which
// the translation reads beside it.
const retired = loadRetired();
/** Keeps one retired statement: a value for every month, or a month's
 *  value. A fact stated both ways is kept as { every_month, <month>: ... }
 *  (EVERY_MONTH), so neither statement is lost. */
const keep = (slot: Record<string, unknown>, k: string, v: unknown, month?: string | null) => {
  const cur = slot[k];
  const isMonths = cur !== null && typeof cur === "object" && !Array.isArray(cur);
  if (month) slot[k] = isMonths ? { ...(cur as Record<string, unknown>), [month]: v } : cur === undefined ? { [month]: v } : { [EVERY_MONTH]: cur, [month]: v };
  else if (isMonths) slot[k] = { [EVERY_MONTH]: v, ...(cur as Record<string, unknown>) };
  else slot[k] = v;
};
{
  const d0 = parseDocument(text);
  const cuts: Array<[number, number]> = [];
  if (isSeq(d0.contents)) for (const node of d0.contents.items) {
    if (!isMap(node)) continue;
    const id = String(node.get("id"));
    const persons = node.get("persons", true);
    if (!isMap(persons)) continue;
    for (const pair of (persons as YAMLMap).items as Pair[]) {
      const pid = String((pair.key as { value?: unknown }).value);
      if (!isMap(pair.value)) continue;
      // [the map, its month (under months), the pair that holds it]
      const pv = pair.value as YAMLMap;
      const maps: Array<[unknown, string | null, Pair | undefined]> = [];
      for (const part of ["facts", "month_defaults"]) {
        const holder = (pv.items as Pair[]).find((x) => String((x.key as { value?: unknown }).value) === part);
        maps.push([holder?.value, null, holder]);
      }
      const months: unknown = pv.get("months", true);
      if (isMap(months)) {
        for (const mp of (months as YAMLMap).items as Pair[]) maps.push([mp.value, String((mp.key as { value?: unknown }).value), mp]);
      }
      for (const [m, month, holder] of maps) {
        if (!isMap(m)) continue;
        const items = (m as YAMLMap).items as Pair[];
        const mine: Array<[number, number]> = [];
        for (const fp of items) {
          const k = String((fp.key as { value?: unknown }).value);
          if (!(k in RETIRED) || L.ix.byIdentifier.has(k)) continue;
          const v = (fp.value as { toJSON(): unknown }).toJSON();
          keep(((retired[id] ??= {})[pid] ??= {}), k, v, month);
          const ks = (fp.key as { range: [number, number, number] }).range[0];
          const ve = (fp.value as { range: [number, number, number] }).range[1];
          mine.push([lineStart(text, ks), lineEnd(text, ve - 1)]);
        }
        if (mine.length && mine.length === items.length && holder) {
          // every entry of the map is retired: the map goes with them
          const ks = (holder.key as { range: [number, number, number] }).range[0];
          const ve = (holder.value as { range: [number, number, number] }).range[1];
          cuts.push([lineStart(text, ks), lineEnd(text, ve - 1)]);
        } else cuts.push(...mine);
      }
    }
  }
  cuts.sort((a, b) => b[0] - a[0]);
  for (const [s, e] of cuts) text = text.slice(0, s) + text.slice(e);
  if (cuts.length) console.log(`retired facts moved out of the households: ${cuts.length}`);
}
const doc = parseDocument(text);
const seq = doc.contents;
if (!isSeq(seq)) throw new Error("cases.yaml is not a list");
const edits: Array<{ start: number; end: number; insert: string }> = [];
let casesChanged = 0;
for (const node of seq.items) {
  if (!isMap(node)) continue;
  const c = node.toJSON() as HouseholdCase;
  const tr = translateCase(c, L.ix, CHOICES, retired);
  if (!tr.changed) continue;
  casesChanged++;
  const persons = node.get("persons", true);
  if (!isMap(persons)) throw new Error(`${c.id}: persons is not a mapping`);
  for (const pair of (persons as YAMLMap).items as Pair[]) {
    const pid = String((pair.key as { value?: unknown }).value ?? pair.key);
    const want = tr.value.persons[pid]?.facts?.receipts;
    const pnode = pair.value;
    if (!isMap(pnode)) throw new Error(`${c.id} ${pid}: not a mapping`);
    const facts = pnode.get("facts", true);
    if (JSON.stringify(c.persons[pid]?.facts?.receipts) === JSON.stringify(want)) continue;
    if (!isMap(facts) || !(facts as YAMLMap).items.length) {
      throw new Error(`${c.id} ${pid}: receipts to write but no facts mapping to write them in`);
    }
    const fitems = (facts as YAMLMap).items as Pair[];
    const firstKey = fitems[0].key as { range: [number, number, number] };
    const indent = " ".repeat(firstKey.range[0] - lineStart(text, firstKey.range[0]));
    const list = (want ?? []) as unknown[];
    const block = want === undefined ? ""
      : list.length === 0 ? `${indent}receipts: []\n`
      : [`${indent}receipts:`, ...list.map((r) => `${indent}- ${flowValue(r)}`)].join("\n") + "\n";
    const existing = fitems.find((p) => String((p.key as { value?: unknown }).value) === "receipts");
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
  it.tests = it.tests.map((t0) => {
    // a retired fact the test states moves to retired-facts.yaml, keyed by the test's id
    const t = JSON.parse(JSON.stringify(t0)) as typeof t0;
    let cut = false;
    const take = (pid: string, o: Record<string, unknown> | undefined, month?: string) => {
      for (const k of Object.keys(o ?? {})) {
        if (!(k in RETIRED) || L.ix.byIdentifier.has(k)) continue;
        keep(((retired[t.id] ??= {})[pid] ??= {}), k, o![k], month);
        delete o![k];
        cut = true;
      }
    };
    take("p1", t.given);
    take("p1", t.month_defaults);
    for (const [pid, f] of Object.entries(t.others ?? {})) take(pid, f);
    for (const [pid, p] of Object.entries(t.persons ?? {})) {
      take(pid, p.facts);
      take(pid, p.month_defaults);
      for (const [m, mf] of Object.entries(p.months ?? {})) take(pid, mf, m);
    }
    const tr = translateTest(t, L.ix, t.as_of ?? L.ledger.meta.default_as_of, CHOICES, retired);
    if (tr.changed || cut) { changed = true; testsChanged++; }
    return tr.value;
  });
  if (changed) itemFiles.push([f, stringifyItem(it)]);
}

console.log(`households re-translated: ${casesChanged}; rule tests re-translated: ${testsChanged} in ${itemFiles.length} item files`);
if (!dry) {
  fs.writeFileSync(casesPath, text);
  saveRetired(retired);
  for (const [f, t] of itemFiles) fs.writeFileSync(f, t);
  // the written file must read back as the translation
  const again = parseDocument(fs.readFileSync(casesPath, "utf8")).toJSON() as HouseholdCase[];
  const stale = again.filter((c) => translateCase(c, L.ix, CHOICES, retired).changed).map((c) => c.id);
  if (stale.length) { console.error(`not a fixed point: ${stale.join(", ")}`); process.exitCode = 1; }
}
