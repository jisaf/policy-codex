/* Lists the candidates of the three-pattern sweep (docs/reviews/pattern-sweep-snap-ce.md)
 * mechanically, for hand judgement against the rule text:
 *   npx vite-node scripts/audit/pattern-sweep.ts -- [programs, comma-separated] [--json]
 * Programs default to SNAP,CCCAP,LEAP,SunBucks. An item is in scope when its program is one of
 * them, or it is a shared (All) item or parameter one of them reads, directly or through others.
 *   P1 timing: inside a month-scoped item (person-month, month), every read of a person- or
 *      case-scope derived item or a dated/status supplied fact (fixed on the determination date),
 *      every det_date / det_month / at-det_month, and every record sum whose condition reads no
 *      date of the record (received_in, date, start/end, job dates).
 *   P2 defaults: every `otherwise`, every record field with a default or when_absent read by a
 *      program item, every lives_with / dwelling_id read.
 *   P3 membership: every item that builds or reads a household, unit or member group, with the
 *      composition facts it reads (death, birth, separation, joining, institution, roomer/boarder).
 * Writes nothing. */
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";

const root = path.resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2).filter((a) => a !== "--");
const json = args.includes("--json");
const programs = new Set((args.find((a) => !a.startsWith("--")) ?? "SNAP,CCCAP,LEAP,SunBucks").split(","));
const { vol } = loadVolume(root, "co");
const byId = new Map(vol.items.map((it) => [it.identifier, it]));

type Node = unknown;
const refs = (n: Node, out: string[] = []): string[] => {
  if (typeof n === "string") { if (byId.has(n)) out.push(n); }
  else if (Array.isArray(n)) for (const x of n) refs(x, out);
  return out;
};
// in-scope set: program items plus what they read (transitively through shared items)
const inScope = new Set<string>();
const queue: string[] = [];
for (const it of vol.items) if (programs.has(it.program)) { inScope.add(it.identifier); queue.push(it.identifier); }
while (queue.length) {
  const id = queue.pop()!;
  const it = byId.get(id)!;
  for (const r of refs(it.derived)) if (!inScope.has(r)) { inScope.add(r); queue.push(r); }
}
const monthScoped = (s: string) => s === "person-month" || s === "month";
const DATE_FIELDS = new Set(["date", "month", "start_date", "end_date", "job_start_date", "job_end_date", "regular_date", "covers_from", "covers_through", "acquired_date", "disposed_date", "received_date", "value_date"]);
const SOURCE_DATES = new Set(["start_date", "end_date", "job_start_date", "job_end_date"]);
const STATUS_RE = /date|death|birth|pregnan|institution|resid|absent|lives_with|dwelling|immigra|citizen|disab|blind|student|enrolled|homeless|age$|^age|_age_|is_aged|is_elderly|status|receives_|member|household|spouse|married|separat|custody|parent|guardian|foster|incarcerat|jail|prison|fleeing|parole|probation/;

type Row = { pattern: string; item: string; id: string; program: string; scope: string; read: string; note: string };
const rows: Row[] = [];
const add = (pattern: string, it: (typeof vol.items)[number], read: string, note: string) =>
  rows.push({ pattern, item: it.identifier, id: it.id, program: it.program, scope: it.scope, read, note });

const walk = (n: Node, f: (op: string, args: Node[], node: Node[]) => void) => {
  if (!Array.isArray(n)) return;
  if (typeof n[0] === "string") f(n[0], n.slice(1), n);
  for (const x of n) walk(x, f);
};
const fieldsRead = (n: Node, out = new Set<string>()) => {
  walk(n, (op, a) => {
    if (op === "receipt" && typeof a[0] === "string") out.add(a[0]);
    if (op === "received_in") out.add("received_in");
  });
  return out;
};

for (const it of vol.items) {
  if (!inScope.has(it.identifier) || it.derived == null) continue;
  const ms = monthScoped(it.scope);
  // P1: reads of non-month items in a month-scoped chain
  if (ms) {
    const seen = new Set<string>();
    for (const r of refs(it.derived)) {
      if (seen.has(r)) continue; seen.add(r);
      const t = byId.get(r)!;
      if (t.kind === "parameter") continue;
      if (t.scope === "person" || t.scope === "case") {
        const dyn = t.kind === "derived" || STATUS_RE.test(r);
        if (dyn) add("P1", it, r, `${t.kind} ${t.scope}${t.kind === "derived" ? " (evaluated on the determination date)" : ""}`);
      }
    }
  }
  walk(it.derived, (op, a) => {
    if (op === "det_date" || op === "det_month") add("P1", it, op, ms ? "determination date read inside a month-scoped item" : "determination date read in a " + it.scope + " item");
    if (op === "at") add("P1", it, JSON.stringify(a), "at: a month-scoped item read for a stated month");
    if (op === "sum_receipts" || op === "largest") {
      const list = JSON.stringify(a[0]);
      const f = fieldsRead(a[1]);
      const src = [...f].filter((x) => SOURCE_DATES.has(x));
      const placed = [...f].filter((x) => DATE_FIELDS.has(x) || x === "received_in");
      if (!src.length && !/holdings/.test(list)) add("P1", it, `${op} over ${list}`, `record condition reads no source dates (placement: ${placed.join(" ") || "none"})`);
    }
    // P2
    if (op === "otherwise") add("P2", it, JSON.stringify(a[1]), "otherwise default over " + JSON.stringify(a[0]).slice(0, 160));
  });
  for (const r of new Set(refs(it.derived))) {
    if (r === "lives_with" || r === "dwelling_id") add("P2", it, r, "co-residence read (rule 17 fallback?)");
  }
  // P3
  if (/household|unit|members|spouse|married|lives_with|roomer|boarder|co_owner|date_of_death|separat|ceased_living|is_pregnant|unborn|joined/.test(it.identifier + " " + refs(it.derived).join(" ")))
    add("P3", it, refs(it.derived).filter((r) => /household|unit|members|spouse|married|lives_with|dwelling|roomer|boarder|death|separat|ceased|pregnan|unborn|joined|institution|absent/.test(r)).join(" "), "composition");
}
// P2: record fields with defaults read by in-scope items
for (const list of ["receipts", "earnings", "holdings"]) {
  const li = byId.get(list);
  if (!li) continue;
  const readers = vol.items.filter((it) => programs.has(it.program) && it.derived != null && refs(it.derived).includes(list));
  for (const [f, spec] of Object.entries(li.record_fields ?? {})) {
    const s = spec as { default?: unknown; when_absent?: string; required?: boolean };
    if (!("default" in s) && typeof s.when_absent !== "string") continue;
    const users = readers.filter((r) => fieldsRead(r.derived).has(f));
    if (!users.length) continue;
    rows.push({ pattern: "P2", item: `${list}.${f}`, id: li.id, program: "All", scope: "record", read: users.map((u) => u.id).join(","), note: "default" in s ? `default ${JSON.stringify(s.default)}` : `when_absent: ${s.when_absent}` });
  }
}
if (json) console.log(JSON.stringify(rows, null, 1));
else {
  for (const p of ["P1", "P2", "P3"]) {
    const rs = rows.filter((r) => r.pattern === p);
    console.log(`\n# ${p}: ${rs.length} candidates`);
    for (const r of rs) console.log(`${r.id}\t${r.item}\t[${r.program} ${r.scope}]\t${r.read}\t${r.note}`);
  }
}
