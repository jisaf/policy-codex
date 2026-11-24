/* Lists the candidates of the cash pattern sweep (docs/reviews/pattern-sweep-cash.md)
 * mechanically, for hand judgement against the rule text (D-80, D-81):
 *
 *   npx vite-node scripts/audit/pattern-sweep-cash.ts [--json out.json]
 *
 * Every Adult Financial and Colorado Works item, and the shared items and record
 * fields they read, is walked once. Three lists:
 *
 *  1. Time. In an item evaluated for a month (scope person-month or month), every
 *     read of a non-month item (a person-, case- or global-scope supplied or
 *     derived item other than a parameter), every det_date, det_month and `at`
 *     a month other than the month in context; every person- or case-scope cash
 *     item a month-scoped cash item reaches (it is one value per case, on the
 *     determination date), with the dated or time-varying inputs it reads; every
 *     record sum (receipts, earnings, holdings) that reads no date of the record
 *     (no received_in, month, date, start or end field).
 *  2. Defaults. Every `otherwise` (the value and the default) and every `unknown`
 *     guard in a cash item; every record field with a schema `default` or
 *     `when_absent` that a cash item reads; every cash reader of `lives_with` or
 *     `dwelling_id`.
 *  3. Membership. Every cash item that reads a relationship (rel, exists_related,
 *     has_relative_in, shared_relative, reachable), groups persons (persons,
 *     filter, count, sum, exists, greatest, in_group, of) or reads a sponsor,
 *     spouse, death, birth or membership fact.
 *
 * Writes nothing unless --json is given. */
import fs from "node:fs";
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import type { Item } from "../../src/engine/types";

const root = path.resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2).filter((a) => a !== "--");
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const { vol } = loadVolume(root, "co");
const items = vol.items as Item[];
const byIdent = new Map(items.map((it) => [it.identifier, it]));
const CASH = new Set(["AdultFinancial", "ColoradoWorks"]);
const isCash = (it: Item | undefined) => !!it && CASH.has(String(it.program));
const RECORD_LISTS = new Set(["receipts", "earnings", "holdings"]);
const RECORD_FIELDS: Record<string, Record<string, { default?: unknown; when_absent?: string; required?: boolean }>> = {};
for (const l of RECORD_LISTS) RECORD_FIELDS[l] = (byIdent.get(l)?.record_fields ?? {}) as never;
const REL_OPS = new Set(["rel", "exists_related", "has_relative_in", "shared_relative", "reachable"]);
const GROUP_OPS = new Set(["persons", "filter", "count", "sum", "exists", "greatest", "in_group", "of"]);
const DATE_FIELDS = new Set(["month", "date", "start_date", "end_date", "job_start_date", "job_end_date", "disposed_date", "returned_date", "regular_date", "covers_from", "covers_through", "source_date", "purchase_date", "farm_ended_date"]);
const MEMBERSHIP_RE = /(sponsor|spouse|married|death|died|birth|date_of_birth|pregnan|member|unit|household|minor_parent|caretaker|stepparent|lives_with|dwelling|absence|sanction|disqualif|ineligible_member|joins|leaves)/;
const TIMEY_RE = /(^age$|_age|date|pregnan|month|is_married|marital|receives_|status|sanction|enrolled|institution|absence|resid|student|employed|strike|disab|blind|death)/;

type Row = { pattern: string; cls: string; id: string; identifier: string; scope: string; program: string; detail: string };
const rows: Row[] = [];
const add = (pattern: string, cls: string, it: Item, detail: string) =>
  rows.push({ pattern, cls, id: it.id, identifier: it.identifier, scope: it.scope, program: String(it.program), detail });

const short = (e: unknown, n = 160) => { const s = JSON.stringify(e); return s.length > n ? s.slice(0, n) + "…" : s; };

/** Walks a tree, calling f(node, ancestors) on every array node. */
function walk(e: unknown, f: (n: unknown[], anc: unknown[][]) => void, anc: unknown[][] = []) {
  if (!Array.isArray(e)) return;
  f(e, anc);
  for (const sub of e.slice(1)) walk(sub, f, [...anc, e]);
  if (typeof e[0] !== "string") walk(e[0], f, [...anc, e]);
}
/** Identifiers read anywhere in a tree (strings naming an item). */
function idents(e: unknown, out = new Set<string>()): Set<string> {
  if (typeof e === "string") { if (byIdent.has(e)) out.add(e); return out; }
  if (Array.isArray(e)) for (const s of e) idents(s, out);
  return out;
}
/** The list a record sum reads ("receipts", or ["of", p, "receipts"]). */
function listOf(e: unknown): string | null {
  if (typeof e === "string") return RECORD_LISTS.has(e) ? e : null;
  if (Array.isArray(e) && e[0] === "of") return listOf(e[2]);
  return null;
}

const cashItems = items.filter((it) => isCash(it) && it.kind === "derived" && it.derived != null);
const monthScoped = (it: Item | undefined) => !!it && (it.scope === "person-month" || it.scope === "month");

// ---- reachability: person/case-scope derived items read (transitively through non-month items) by a month-scoped cash item
const reachedFromMonth = new Map<string, string>(); // identifier -> first month-scoped cash reader
for (const it of cashItems) {
  if (!monthScoped(it)) continue;
  const stack = [...idents(it.derived)];
  while (stack.length) {
    const x = stack.pop()!;
    const xi = byIdent.get(x);
    if (!xi || xi.kind !== "derived" || monthScoped(xi) || reachedFromMonth.has(x)) continue;
    reachedFromMonth.set(x, it.identifier);
    for (const y of idents(xi.derived)) stack.push(y);
  }
}

for (const it of cashItems) {
  const d = it.derived;
  // ---------- pattern 1
  if (monthScoped(it)) {
    // direct reads of non-month items, outside an `at`
    const direct = new Set<string>();
    walk(d, (n, anc) => {
      for (const s of n) if (typeof s === "string" && byIdent.has(s) && !anc.some((a) => a[0] === "at")) direct.add(s);
    });
    for (const x of direct) {
      const xi = byIdent.get(x)!;
      if (xi.kind === "parameter" || monthScoped(xi) || RECORD_LISTS.has(x)) continue;
      add("1", `month-reads-${xi.scope}-${xi.kind}`, it, `${x} (${xi.id}, ${xi.program})`);
    }
  }
  walk(d, (n) => {
    if (n[0] === "det_date" || n[0] === "det_month") add("1", "determination-date", it, n[0] as string);
    if (n[0] === "at") {
      const m = n[2];
      const inContext = Array.isArray(m) && (m[0] === "month" || m[0] === "that_month");
      if (!inContext) add("1", "at-other-month", it, short(n));
    }
    if (n[0] === "sum_receipts" || n[0] === "largest") {
      const l = listOf(n[1]);
      const fieldsRead = new Set<string>();
      let dated = false;
      walk(n[2], (m) => { if (m[0] === "received_in") dated = true; if (m[0] === "receipt") fieldsRead.add(String(m[1])); });
      walk(n[3], (m) => { if (m[0] === "receipt") fieldsRead.add(String(m[1])); });
      if (!dated && ![...fieldsRead].some((f) => DATE_FIELDS.has(f))) add("1", "record-sum-undated", it, `${l} ${short(n[2], 120)}`);
    }
  });
  if (!monthScoped(it) && reachedFromMonth.has(it.identifier)) {
    const timey = [...idents(d)].filter((x) => { const xi = byIdent.get(x)!; return xi.kind !== "parameter" && !monthScoped(xi) && (TIMEY_RE.test(x) || RECORD_LISTS.has(x)); });
    const monthy = [...idents(d)].filter((x) => monthScoped(byIdent.get(x)));
    add("1", "non-month-in-month-chain", it, `read by ${reachedFromMonth.get(it.identifier)}; time-varying reads: ${timey.join(", ") || "-"}${monthy.length ? "; month items (determination month): " + monthy.join(", ") : ""}`);
  }
  // ---------- pattern 2
  walk(d, (n) => {
    if (n[0] === "otherwise") add("2", "otherwise", it, `${short(n[1], 110)} => ${short(n[2], 60)}`);
    if (n[0] === "unknown") add("2", "unknown-guard", it, short(n[1], 120));
    if (n[0] === "sum_receipts" || n[0] === "largest") {
      const l = listOf(n[1]);
      if (!l) return;
      const fs2 = new Set<string>();
      walk(n, (m) => { if (m[0] === "receipt") fs2.add(String(m[1])); });
      for (const f of fs2) {
        const spec = RECORD_FIELDS[l]?.[f];
        if (spec && (spec.default !== undefined || spec.when_absent)) add("2", "record-field-default", it, `${l}.${f} ${spec.default !== undefined ? "default " + JSON.stringify(spec.default) : "when_absent: " + String(spec.when_absent).slice(0, 80)}`);
      }
    }
  });
  const ids = idents(d);
  if (ids.has("lives_with") || ids.has("dwelling_id")) add("2", "lives-with", it, short([...walkFind(d, "lives_with")], 200));
  // ---------- pattern 3
  const ops = new Set<string>();
  walk(d, (n) => { if (typeof n[0] === "string") ops.add(n[0]); });
  const rel = [...ops].filter((o) => REL_OPS.has(o));
  const grp = [...ops].filter((o) => GROUP_OPS.has(o));
  const mem = [...ids].filter((x) => MEMBERSHIP_RE.test(x));
  if (rel.length || grp.length || mem.length) add("3", rel.length ? "relationship" : grp.length ? "group" : "membership-fact", it, `ops ${[...rel, ...grp].join(",") || "-"}; reads ${mem.slice(0, 12).join(", ") || "-"}`);
}

function walkFind(e: unknown, x: string): Set<string> {
  const out = new Set<string>();
  walk(e, (n) => { if (n.includes(x)) out.add(short(n, 140)); });
  return out;
}

// shared items cash reads with an otherwise (rule 12 precision), one level out
const sharedRead = new Set<string>();
for (const it of cashItems) for (const x of idents(it.derived)) { const xi = byIdent.get(x)!; if (!isCash(xi) && xi.kind === "derived") sharedRead.add(x); }
for (const x of sharedRead) {
  const xi = byIdent.get(x)!;
  walk(xi.derived, (n) => { if (n[0] === "otherwise") add("2", "shared-otherwise", xi, `${short(n[1], 110)} => ${short(n[2], 60)}`); });
}

const counts = new Map<string, number>();
for (const r of rows) counts.set(`${r.pattern} ${r.cls}`, (counts.get(`${r.pattern} ${r.cls}`) ?? 0) + 1);
for (const [k, v] of [...counts].sort()) console.log(`${k}\t${v}`);
console.log(`total\t${rows.length}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
else if (!args.includes("--verdicts")) for (const r of rows) console.log([r.pattern, r.cls, r.id, r.identifier, r.scope, r.detail].join("\t"));

// ---- verdicts: --verdicts <rules.yaml> [--from <candidates.json>] --md <out.md>
// Gives each candidate the verdict of the first rule that matches it (scripts/audit/pattern-sweep-cash-verdicts.yaml)
// and writes the per-candidate table; a candidate no rule matches is printed and fails the run. --from reads a
// candidate list written earlier with --json (the sweep's list was taken at 14558ff, before its fixes).
if (args.includes("--verdicts")) {
  const { parse } = await import("yaml");
  const vfile = parse(fs.readFileSync(args[args.indexOf("--verdicts") + 1], "utf8")) as { verdicts: Record<string, string>; rules: { cls: string; match: string; verdict: string }[] };
  const from = args.includes("--from") ? JSON.parse(fs.readFileSync(args[args.indexOf("--from") + 1], "utf8")) as Row[] : rows;
  const md = args.includes("--md") ? args[args.indexOf("--md") + 1] : null;
  const rules = vfile.rules.map((r) => ({ ...r, re: new RegExp(r.match) }));
  const out: string[] = [];
  const tally = new Map<string, number>();
  let unmatched = 0;
  const esc = (s: string) => s.replace(/\|/g, "\\|");
  let last = "";
  for (const r of from) {
    const key = `${r.id} ${r.identifier} | ${r.detail}`;
    const rule = rules.find((x) => (x.cls === "*" || x.cls === r.cls) && x.re.test(key));
    if (!rule) { unmatched++; console.log(`NO VERDICT\t${r.pattern}\t${r.cls}\t${key}`); continue; }
    if (!vfile.verdicts[rule.verdict]) throw new Error(`no verdict text for ${rule.verdict}`);
    tally.set(`${r.pattern} ${rule.verdict}`, (tally.get(`${r.pattern} ${rule.verdict}`) ?? 0) + 1);
    const head = `${r.pattern} ${r.cls}`;
    if (head !== last) { out.push("", `### Pattern ${r.pattern}: ${r.cls}`, "", "| # | item | identifier | scope | candidate | verdict |", "|---|---|---|---|---|---|"); last = head; }
    out.push(`| ${out.filter((l) => l.startsWith("| ") && !l.startsWith("| #")).length + 1} | ${r.id} | ${r.identifier} | ${r.scope} | ${esc(r.detail).slice(0, 160)} | ${rule.verdict} |`);
  }
  for (const [k, v] of [...tally].sort()) console.log(`${k}\t${v}`);
  if (md) {
    const legend = Object.entries(vfile.verdicts).map(([k, v]) => `- **${k}**: ${v}`);
    fs.writeFileSync(md, [
      "# Cash pattern sweep: every candidate and its verdict", "",
      "Generated by `npx vite-node scripts/audit/pattern-sweep-cash.ts --verdicts scripts/audit/pattern-sweep-cash-verdicts.yaml --from <list> --md <this file>` from the candidate list the lister wrote at 14558ff, before the sweep's fixes (docs/reviews/pattern-sweep-cash.md, section 2). One row per candidate, in the lister's order; the verdict is the first rule of the verdicts file that matches the row.", "",
      "## Verdicts", "", ...legend, "",
      "## Candidates", ...out, "",
    ].join("\n"));
  }
  if (unmatched) { console.log(`${unmatched} candidates without a verdict`); process.exit(1); }
}
