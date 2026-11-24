/* Lists, mechanically, the candidates of the three-pattern sweep for non-MAGI
 * Medicaid (docs/reviews/pattern-sweep-nonmagi.md):
 *   npx vite-node scripts/audit/pattern-sweep-nonmagi.ts -- [--tsv] [--anchors]
 * The items swept: every Medicaid derived item the non-MAGI outcomes read
 * (the SSI-related, protected, OAP health care, Medicare Savings, buy-in,
 * long-term care and patient payment outcomes and the long-term care
 * verification items), with every shared derived item on those paths, less
 * the MAGI and CHP+ items (the walk stops at them). Writes nothing.
 *   P1  a month-scoped item reading a person-, case- or global-scope fact
 *       (supplied or derived, not a parameter), an `at ... det_month`, or a
 *       record list summed with no month (no received_in, no date field).
 *   P2  every `otherwise` and `unknown` in a swept item, and every record
 *       field read whose schema gives a default or a when_absent.
 *   P3  every read of a relationship, co-residence, spouse or composition
 *       item (rel, exists_related, has_relative_in, reachable,
 *       shared_relative, lives_with, dwelling_id, is_married and the couple,
 *       deeming and household groups) in a swept item. */
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import { buildGraph } from "../../src/engine/graph";
import type { Item } from "../../src/engine/types";
import { anchorRows, printAnchors } from "./pattern-sweep-anchors";

const root = path.resolve(import.meta.dirname, "../..");
const tsv = process.argv.includes("--tsv");
const { vol, engine } = loadVolume(root, "co");
const ix = engine.index;
const g = buildGraph(ix);
const byId = (x: string) => ix.byIdentifier.get(x) as Item | undefined;

const NONMAGI_OUTCOMES = [
  "ma_ssi_related_category", "ma_protected_group_category", "ma_oap_health_care_status",
  "ma_msp_category", "ma_buy_in_category", "ma_ltc_eligibility_status", "ma_patient_payment",
  "ma_institutional_stay_verification_is_pending", "ma_asset_transfers_verification_is_pending",
  "ma_trust_verification_is_pending", "ma_annuity_verification_is_pending",
];

/** MAGI and CHP+ items (tagged so, or CHP+'s) are the MAGI sweep's: the walk
 *  stops at them, except the age-in-a-month helpers every Medicaid group reads. */
const AGE_HELPERS = new Set(["ma_age_on_first_day_of_month", "ma_age_on_last_day_of_month", "ma_age_before_month"]);
const isMagi = (id: string) => {
  const it = byId(id);
  if (!it || AGE_HELPERS.has(id)) return false;
  return it.program === "CHP+" || (it.tags ?? []).some((t) => t === "magi" || t === "chp");
};
const closure = (roots: string[], stop: (id: string) => boolean = () => false) => {
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    if (stop(cur)) continue;
    for (const d of g.uses.get(cur) ?? []) stack.push(d);
  }
  return seen;
};
const nm = new Set([...closure(NONMAGI_OUTCOMES, isMagi)].filter((id) => !isMagi(id)));
const swept = [...nm].map(byId).filter((it): it is Item => !!it && it.kind === "derived" && (it.program === "Medicaid" || it.program === "All"))
  .sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)));
// --anchors: the two timing tests of scripts/audit/pattern-sweep-anchors.ts (coverage pass 7, F7-12) on the swept items.
if (process.argv.includes("--anchors")) {
  printAnchors(anchorRows(swept, new Map(vol.items.map((it) => [it.identifier, it as Item]))), tsv);
  process.exit(0);
}

const isMonthScope = (it: Item) => it.scope === "person-month" || it.scope === "month";
const isParam = (it: Item) => it.kind === "parameter";
const RECORD_LISTS = new Set(["receipts", "earnings", "holdings"]);
const COMPOSITION = new Set(["lives_with", "dwelling_id", "is_married", "marital_status", "ceased_living_with_spouse_date",
  "residence_setting_type", "resides_in_medical_institution", "institution_entry_date", "temporary_absence_reason"]);
const REL_OPS = new Set(["rel", "exists_related", "has_relative_in", "reachable", "shared_relative"]);
const isGroup = (it: Item | undefined) => !!it && it.type === "group of persons";

type Row = { pattern: string; id: string; item: string; what: string };
const rows: Row[] = [];
const add = (pattern: string, it: Item, what: string) => rows.push({ pattern, id: it.id, item: it.identifier, what });

/** Walks a tree; `atMonth` is true under an `at` (the read is in a named
 *  month) and the month operand of `at` is reported. */
function walk(it: Item, e: unknown, ctx: { inSum: boolean; sumHasMonth: boolean }): void {
  if (typeof e === "string") {
    const ref = byId(e);
    if (!ref || isParam(ref)) return;
    if (isMonthScope(it) && !isMonthScope(ref) && ref.identifier !== "determination_date")
      add("P1", it, `reads ${ref.scope} ${ref.kind} ${ref.identifier} (${ref.id})`);
    if (COMPOSITION.has(ref.identifier) || (isGroup(ref) && ref.program !== "CHP+"))
      add("P3", it, `reads ${ref.identifier} (${ref.id}, ${ref.type}, ${ref.scope})`);
    return;
  }
  if (!Array.isArray(e)) return;
  const op = e[0];
  if (op === "at") {
    const m = JSON.stringify(e[2]);
    if (m.includes("det_month") || m.includes("det_date")) add("P1", it, `at ${JSON.stringify(e[1]).slice(0, 80)} in ${m}`);
    walk(it, e[1], ctx);
    walk(it, e[2], ctx);
    return;
  }
  if (op === "otherwise") {
    add("P2", it, `otherwise ${JSON.stringify(e[1]).slice(0, 110)} -> ${JSON.stringify(e[2]).slice(0, 60)}`);
  }
  if (op === "unknown") add("P2", it, `unknown ${JSON.stringify(e[1]).slice(0, 110)}`);
  if (REL_OPS.has(op as string)) add("P3", it, `${op} ${JSON.stringify(e[1]).slice(0, 60)}`);
  if (op === "sum_receipts" || op === "largest") {
    const list = JSON.stringify(e[1]);
    const cond = JSON.stringify(e[2]) + JSON.stringify(e[3]);
    const dated = /received_in|"date"|disposed_date|"month"|start_date|end_date|held_in|valued_in|that_month/.test(cond);
    if (!dated) add("P1", it, `${op} over ${list.slice(0, 50)} with no month or date in the condition`);
    // A stream (a record with no month or date) is bounded by its dates:
    // receipts by start_date and end_date, earnings by job_start_date and
    // job_end_date, holdings by acquired and disposed dates.
    const bounds = list.includes("receipts") ? /"start_date".*"end_date"/ : list.includes("earnings") ? /"job_start_date".*"job_end_date"/ : /disposed_date|acquired_date|held_in|valued_in/;
    if (/received_in/.test(cond) && !bounds.test(cond)) add("P1", it, `${op} over ${list.slice(0, 50)}: a stream summed in a month without its start and end dates`);
    if (list.includes("holdings") && !bounds.test(cond)) add("P1", it, `${op} over ${list.slice(0, 50)}: holdings summed without the held/disposed dates`);
    for (const f of cond.matchAll(/\["receipt","([a-z_]+)"\]/g)) {
      const fieldHolder = ["receipts", "earnings", "holdings"].find((l) => list.includes(l));
      const schema = fieldHolder ? (byId(fieldHolder) as unknown as { record_fields?: Record<string, { default?: unknown; when_absent?: string }> }) : undefined;
      const fd = schema?.record_fields?.[f[1]];
      if (fd && (fd.default !== undefined || fd.when_absent)) add("P2", it, `record field ${fieldHolder}.${f[1]} ${fd.default !== undefined ? "default " + JSON.stringify(fd.default) : "when_absent"}`);
    }
  }
  for (const sub of e.slice(1)) walk(it, sub, ctx);
}

for (const it of swept) {
  if (RECORD_LISTS.has(it.identifier)) continue;
  walk(it, it.derived, { inSum: false, sumHasMonth: false });
}
// Person-scope derived items on the swept paths read by a month-scoped item.
const dedupe = new Map<string, Row>();
for (const r of rows) dedupe.set(`${r.pattern}|${r.id}|${r.what}`, r);
const out = [...dedupe.values()].sort((a, b) => a.pattern.localeCompare(b.pattern) || Number(a.id.slice(3)) - Number(b.id.slice(3)));
if (tsv) {
  for (const r of out) console.log([r.pattern, r.id, r.item, r.what].join("\t"));
} else {
  console.log(`swept derived items: ${swept.length} (month-scoped ${swept.filter(isMonthScope).length})`);
  for (const p of ["P1", "P2", "P3"]) console.log(`${p}: ${out.filter((r) => r.pattern === p).length} candidates`);
}
