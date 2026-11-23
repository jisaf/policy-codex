/* Step 5 audit (docs/plan-colorado.md): candidate duplicate paths within each
 * program. Report only; writes nothing.
 *
 *   npx vite-node scripts/audit/duplicate-paths.ts [--json]
 *
 * Signals, per program (derived items; parameters for figures):
 *   inline   an item's derivation contains, as a proper subtree, the whole
 *            derivation of another item of the same program that it does not
 *            read (it recomputes that item instead of reading it)
 *   subtree  two items of a program share a subtree of at least MIN_SUBTREE
 *            nodes (the same computation written twice), neither reading the other
 *   exact    identical derivations
 *   shape    same derivation with only constants or parameters different
 *   similar  same type and scope, at least one cited excerpt in common and
 *            close meaning terms (governance's dup.similar, within a program)
 *   figure   two parameters of a program with the same value in force on
 *            the same dates
 *   verify   a verification item (identifier has "verif") whose derivation
 *            re-reads the supplied facts an eligibility or category item of the
 *            same program already tests, instead of reading that item
 * The candidates are then read by hand (docs/reviews/duplicate-paths-audit.md). */
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import { buildGraph } from "../../src/engine/graph";
import type { Expr, Item } from "../../src/engine/types";

const MIN_SUBTREE = 12;
const MIN_INLINE = 5;
const root = path.resolve(import.meta.dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const ix = engine.index;
const g = buildGraph(ix);
const asJson = process.argv.includes("--json");

const size = (e: unknown): number => (Array.isArray(e) ? 1 + e.reduce((n: number, x) => n + size(x), 0) : 1);
const key = (e: unknown) => JSON.stringify(e);

/** Every identifier an item reads, transitively. */
const closure = new Map<string, Set<string>>();
function readsAll(id: string): Set<string> {
  const got = closure.get(id);
  if (got) return got;
  const out = new Set<string>();
  closure.set(id, out);
  for (const d of g.uses.get(id) ?? []) {
    out.add(d);
    for (const x of readsAll(d)) out.add(x);
  }
  return out;
}
const related = (a: Item, b: Item) =>
  readsAll(a.identifier).has(b.identifier) || readsAll(b.identifier).has(a.identifier);

function subtrees(e: unknown, out: Map<string, number>, top = true): void {
  if (!Array.isArray(e)) return;
  if (!top) {
    const s = size(e);
    if (s >= MIN_INLINE) out.set(key(e), s);
  }
  for (const x of e) subtrees(x, out, false);
}

const terms = (s: string | undefined) =>
  new Set((s ?? "").toLowerCase().split(/[^a-z]+/).filter((t) => t.length >= 4));
const jac = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n / (a.size + b.size - n);
};

interface Row { program: string; signal: string; a: string; b: string; detail: string; related: boolean }
const rows: Row[] = [];
const byProgram = new Map<string, Item[]>();
for (const it of vol.items) {
  const list = byProgram.get(it.program) ?? [];
  list.push(it);
  byProgram.set(it.program, list);
}

for (const [program, items] of byProgram) {
  const derived = items.filter((i) => i.kind === "derived" && i.derived != null);
  const whole = new Map<string, Item[]>();
  const subs = new Map<string, Map<string, number>>();
  for (const it of derived) {
    const k = key(it.derived);
    whole.set(k, [...(whole.get(k) ?? []), it]);
    const m = new Map<string, number>();
    subtrees(it.derived, m);
    subs.set(it.id, m);
  }
  const seen = new Set<string>();
  const push = (signal: string, a: Item, b: Item, detail: string) => {
    const [x, y] = a.id < b.id ? [a, b] : [b, a];
    const k = `${signal}|${x.id}|${y.id}`;
    if (seen.has(k)) return;
    seen.add(k);
    rows.push({ program, signal, a: `${x.id} ${x.identifier}`, b: `${y.id} ${y.identifier}`, detail, related: related(x, y) });
  };
  for (const list of whole.values()) for (let i = 1; i < list.length; i++) push("exact", list[0], list[i], "identical derivation");
  // inline: X contains Y's whole derivation
  for (const y of derived) {
    const k = key(y.derived);
    if (size(y.derived) < MIN_INLINE) continue;
    for (const x of derived) {
      if (x.id === y.id) continue;
      if (subs.get(x.id)!.has(k) && !readsAll(x.identifier).has(y.identifier)) {
        push("inline", x, y, `${x.id} recomputes ${y.identifier} (${size(y.derived)} nodes) instead of reading it`);
      }
    }
  }
  // subtree: largest shared subtree between two items
  const owners = new Map<string, string[]>();
  for (const it of derived) {
    for (const [k, s] of subs.get(it.id)!) {
      if (s < MIN_SUBTREE) continue;
      owners.set(k, [...(owners.get(k) ?? []), it.id]);
    }
  }
  const best = new Map<string, { s: number; k: string }>();
  for (const [k, ids] of owners) {
    const uniq = [...new Set(ids)];
    if (uniq.length < 2 || uniq.length > 6) continue;
    const s = size(JSON.parse(k));
    for (let i = 0; i < uniq.length; i++) for (let j = i + 1; j < uniq.length; j++) {
      const pk = [uniq[i], uniq[j]].sort().join("|");
      if ((best.get(pk)?.s ?? 0) < s) best.set(pk, { s, k });
    }
  }
  for (const [pk, { s, k }] of best) {
    const [a, b] = pk.split("|").map((id) => ix.byId.get(id)!);
    if (related(a, b)) continue;
    push("subtree", a, b, `shared ${s}-node subtree: ${k.slice(0, 160)}`);
  }
  // similar
  for (let i = 0; i < derived.length; i++) for (let j = i + 1; j < derived.length; j++) {
    const a = derived[i], b = derived[j];
    if (a.type !== b.type || a.scope !== b.scope) continue;
    const sa = new Set(a.sources ?? []);
    const common = (b.sources ?? []).filter((s) => sa.has(s));
    if (!common.length) continue;
    const mj = jac(terms(a.meaning), terms(b.meaning));
    if (mj >= 0.45) push("similar", a, b, `excerpts ${common.join(",")}; meaning overlap ${mj.toFixed(2)}`);
  }
  // figure
  const params = items.filter((i) => i.kind === "parameter");
  const fig = (p: Item) => key(p.versions?.length ? p.versions.map((v) => [v.from, v.to, v.value]) : p.value);
  const byFig = new Map<string, Item[]>();
  for (const p of params) {
    const f = fig(p);
    if (f === undefined || f === "null") continue;
    byFig.set(f, [...(byFig.get(f) ?? []), p]);
  }
  for (const [f, list] of byFig) {
    if (list.length < 2 || f.length < 3) continue;
    for (let i = 1; i < list.length; i++) push("figure", list[0], list[i], `same value(s) ${f.slice(0, 80)}`);
  }
  // verify: a verification item and an eligibility item reading the same supplied facts directly
  const supplied = (it: Item) => new Set((g.uses.get(it.identifier) ?? []).filter((d) => ix.byIdentifier.get(d)?.kind === "supplied"));
  const verif = derived.filter((i) => /verif/.test(i.identifier));
  const elig = derived.filter((i) => !/verif/.test(i.identifier));
  for (const v of verif) {
    const vs = supplied(v);
    if (vs.size < 2) continue;
    for (const e of elig) {
      const es = supplied(e);
      const shared = [...vs].filter((x) => es.has(x));
      if (shared.length >= 2 && shared.length / vs.size >= 0.5 && !readsAll(v.identifier).has(e.identifier)) {
        push("verify", v, e, `both read ${shared.join(", ")}`);
      }
    }
  }
}

if (asJson) {
  console.log(JSON.stringify(rows, null, 1));
} else {
  const order = ["exact", "inline", "subtree", "verify", "figure", "similar"];
  rows.sort((x, y) => x.program.localeCompare(y.program) || order.indexOf(x.signal) - order.indexOf(y.signal) || x.a.localeCompare(y.a));
  for (const r of rows) console.log([r.program, r.signal, r.a, r.b, r.related ? "reads" : "", r.detail].join("\t"));
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(`${r.program}/${r.signal}`, (counts.get(`${r.program}/${r.signal}`) ?? 0) + 1);
  console.error([...counts].map(([k, v]) => `${k}: ${v}`).join("\n"));
}
