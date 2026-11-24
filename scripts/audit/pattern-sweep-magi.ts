/* Pattern sweep, MAGI Medicaid and CHP+ (docs/reviews/pattern-sweep-magi.md).
 * Lists the candidates of three patterns mechanically, for judging against the
 * rule text:
 *   1. timing: a month-scoped item that reads a fact fixed for the case (a
 *      person-, global- or case-scope item that is not a parameter), or reads
 *      the determination date or month; record sums whose condition reads no
 *      time field of the record;
 *   2. defaults: every `otherwise` and `unknown` in a reached item, and every
 *      record field with a schema `default` or `when_absent` a reached item reads;
 *   3. membership: every reached item that builds or reads a group of persons
 *      or a relationship (rel, exists_related, has_relative_in, shared_relative,
 *      reachable, filter, sum, count, exists, greatest over persons, lives_with,
 *      dwelling_id).
 * Reach: the derived expressions from the MAGI and CHP+ outcomes, with CHP+'s
 * Title XIX test (CO-1176) cut at its MAGI arm.
 *   npx vite-node scripts/audit/pattern-sweep-magi.ts [-- --json]
 */
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import type { Item } from "../../src/engine/types";

const root = path.resolve(import.meta.dirname, "../..");
const { vol } = loadVolume(root, "co");
const byIdent = new Map<string, Item>();
for (const it of vol.items) byIdent.set(it.identifier, it);

const ROOTS = [
  "ma_magi_eligibility_status", "ma_magi_category", "ma_family_planning_status", "ma_express_lane_status",
  "ma_needy_young_person_category", "ma_hospital_presumptive_eligibility_category",
  "ma_is_presumptively_eligible_pregnant", "ma_is_presumptively_eligible_child",
  "ma_is_presumptively_eligible_limited_family_planning",
  "chp_eligibility_status", "chp_express_lane_status", "chp_copayment", "chp_presumptive_eligibility",
];
/** CO-1176 is read only through its MAGI arm. */
const CUT: Record<string, string[]> = { ma_has_full_coverage_category: ["ma_magi_is_fully_eligible", "ma_needy_young_person_category"] };
/** The non-MAGI Medicaid categories the emergency and Cover All Coloradans
 *  arms read (swept with the non-MAGI family) and any item of another program
 *  (SNAP's work-registration exemption, read by community engagement): read,
 *  judged as a read, not entered. */
const BOUNDARY = new Set([
  "ma_is_aged_blind_or_disabled", "ma_meets_ssi_income_standard", "ma_meets_ssi_resource_standard",
  "ma_is_institutionalized", "ma_ltc_financially_eligible", "ma_hcbs_waiver_eligible", "ma_buy_in_category",
  "meets_nursing_facility_level_of_care", "ma_is_ssi_related_eligible", "ma_oap_sisc_b_eligible",
  "ma_protected_group_category", "ma_ltc_eligibility_status",
]);
const OWN_PROGRAMS = new Set(["Medicaid", "CHP+", "All"]);
/** Arguments that are never evaluated (role lists, option lists). */
const RAW_ARGS: Record<string, number[]> = { rel: [1], exists_related: [1], has_relative_in: [1], reachable: [1], shared_relative: [1, 2], in: [2], receipt: [1], as_of: [1] };

type Expr = unknown;
function reads(e: Expr, out: Set<string>) {
  if (typeof e === "string") { if (byIdent.has(e)) out.add(e); return; }
  if (!Array.isArray(e)) return;
  const op = e[0];
  e.forEach((a, i) => {
    if (i === 0 && typeof op === "string") return;
    if (typeof op === "string" && RAW_ARGS[op]?.includes(i)) return;
    if (op === "case" && Array.isArray(a)) { a.forEach((x) => reads(x, out)); return; }
    reads(a, out);
  });
}
function walk(e: Expr, f: (node: unknown[], parents: unknown[][]) => void, parents: unknown[][] = []) {
  if (!Array.isArray(e)) return;
  f(e, parents);
  for (const a of e) walk(a, f, [...parents, e]);
}

const reached = new Set<string>();
const queue = [...ROOTS];
while (queue.length) {
  const id = queue.pop()!;
  if (reached.has(id)) continue;
  const it = byIdent.get(id);
  if (!it) continue;
  reached.add(id);
  if (it.derived == null || BOUNDARY.has(id) || !OWN_PROGRAMS.has(it.program)) continue;
  const r = new Set<string>();
  if (CUT[id]) CUT[id].forEach((x) => r.add(x)); else reads(it.derived, r);
  for (const x of r) if (!reached.has(x)) queue.push(x);
}

const isParam = (it: Item) => it.kind === "parameter";
const monthScoped = (it: Item) => it.scope === "person-month" || it.scope === "month";
const short = (e: unknown) => { const s = JSON.stringify(e); return s.length > 220 ? s.slice(0, 217) + "..." : s; };
const tag = (it: Item) => `${it.id} ${it.identifier} [${it.program} ${it.kind} ${it.scope}]`;

const p1: string[] = [], p1dates: string[] = [], p1records: string[] = [], p2: string[] = [], p2fields: string[] = [], p3: string[] = [];
const recordFields = new Map<string, Record<string, any>>();
for (const it of vol.items) {
  const rf = (it as any).record_fields;
  if (rf) recordFields.set(it.identifier, rf);
}
const fieldReads = new Map<string, Set<string>>(); // list.field -> readers

for (const id of [...reached].sort()) {
  const it = byIdent.get(id)!;
  if (it.derived == null || BOUNDARY.has(id) || !OWN_PROGRAMS.has(it.program)) continue;
  const r = new Set<string>(); reads(it.derived, r);
  if (monthScoped(it)) {
    for (const x of r) {
      const xi = byIdent.get(x)!;
      if (isParam(xi) || monthScoped(xi)) continue;
      if (recordFields.has(x)) continue;
      p1.push(`${tag(it)} reads ${xi.id} ${x} [${xi.kind} ${xi.scope}]`);
    }
  }
  walk(it.derived, (n, parents) => {
    const op = n[0];
    if (op === "det_date" || op === "det_month") {
      const ctx = parents.length ? short(parents[parents.length - 1]) : "(top)";
      p1dates.push(`${tag(it)} ${op} in ${ctx}`);
    }
    if (op === "otherwise") p2.push(`${tag(it)} otherwise: ${short(n)}`);
    if (op === "unknown") p2.push(`${tag(it)} unknown-guard: ${short(n)} in ${short(parents[parents.length - 1] ?? n)}`);
    if (op === "sum_receipts" || op === "largest") {
      const list = Array.isArray(n[1]) ? (n[1] as unknown[])[2] : n[1];
      const fields = new Set<string>();
      walk(n, (m) => { if (m[0] === "receipt" && typeof m[1] === "string") fields.add(m[1]); });
      for (const f of fields) {
        const k = `${list}.${f}`;
        if (!fieldReads.has(k)) fieldReads.set(k, new Set());
        fieldReads.get(k)!.add(it.id);
      }
      const time = ["month", "date", "start_date", "end_date", "job_start_date", "job_end_date", "covers_from", "covers_through", "regular_date"];
      const timeRead = [...fields].filter((f) => time.includes(f));
      const usesReceivedIn = JSON.stringify(n).includes('"received_in"');
      p1records.push(`${tag(it)} ${op} over ${String(list)}: received_in=${usesReceivedIn} time fields=[${timeRead.join(",")}]`);
    }
    if (["rel", "exists_related", "has_relative_in", "shared_relative", "reachable"].includes(op as string)) {
      p3.push(`${tag(it)} ${op}: ${short(n)}`);
    }
    if (["filter", "sum", "count", "exists", "greatest"].includes(op as string)) {
      p3.push(`${tag(it)} ${op}: ${short(n)}`);
    }
  });
  for (const x of r) if (x === "lives_with" || x === "dwelling_id" || /household|tax_dependent|spouse|filer|claim/.test(x)) {
    p3.push(`${tag(it)} reads ${x}`);
  }
}
for (const [k, readers] of [...fieldReads].sort()) {
  const [list, f] = k.split(".");
  const schemaItem = [...recordFields].find(([ident]) => ident === list || list.includes(ident));
  let def = "?";
  for (const [, rf] of recordFields) if (rf[f]) { const d = rf[f]; def = d.required ? "required" : d.default !== undefined ? `default ${JSON.stringify(d.default)}` : d.when_absent ? `when_absent: ${String(d.when_absent).slice(0, 80)}` : "?"; break; }
  void schemaItem;
  p2fields.push(`${k}: ${def} <- ${[...readers].sort().join(", ")}`);
}

if (process.argv.includes("--items")) {
  for (const id of [...reached].filter((x) => !BOUNDARY.has(x) && OWN_PROGRAMS.has(byIdent.get(x)!.program)).sort()) {
    const it = byIdent.get(id)!;
    if (it.derived == null) continue;
    console.log(`## ${tag(it)}\n  ${JSON.stringify(it.derived)}`);
  }
  process.exit(0);
}
const out = (h: string, xs: string[]) => { console.log(`\n### ${h} (${xs.length})`); for (const x of xs) console.log(x); };
const owned = [...reached].filter((id) => !BOUNDARY.has(id) && OWN_PROGRAMS.has(byIdent.get(id)!.program));
console.log(`reached ${reached.size} items; ${owned.length} Medicaid, CHP+ or shared (judged), ${owned.filter((id) => byIdent.get(id)!.derived != null).length} of them derived`);
out("P1 month-scoped reads of a case-fixed fact", p1);
out("P1 determination date or month", p1dates);
out("P1 record sums and their time", p1records);
out("P2 otherwise and unknown guards", p2);
out("P2 record fields read (schema default)", p2fields);
out("P3 groups and relationships", p3);
