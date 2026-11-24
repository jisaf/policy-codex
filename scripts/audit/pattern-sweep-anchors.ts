/* Two timing tests the three-pattern sweeps share (coverage pass 7, non-MAGI
 * F7-12, docs/reviews/coverage7-medicaid-nonmagi.md): the sweeps' P1 looked for
 * `[at, x, [det_month]]` and for person- or case-scope facts read in a month,
 * which missed two shapes that fix a figure at the determination in every
 * month (how F7-1 and F7-2 escaped):
 *
 *   P1-ANCHOR  every det_month or det_date that is not the month operand of an
 *              `at`: inside as_of, latest_month_of_year, first_day, month
 *              arithmetic, or compared with the month in context. Each row
 *              names the operators around it, so a reviewer can group the
 *              comparisons "the determination month and after" (a month
 *              boundary the rule sets) apart from a figure or a date taken at
 *              the determination.
 *   P1-PARAM   every person-, case- or global-scope derived item whose rule
 *              reads a parameter that changes with time (more than one
 *              version, or one version that ends) outside `at` and `as_of`:
 *              the item is one value per case, so the parameter is read on
 *              the determination date in every month that reads the item
 *              (docs/operators.md, Resolution step 2). The row names the
 *              month-scoped items of the swept set that read it.
 *
 * Each sweep script calls anchorRows() on its own swept items and prints the
 * rows with `--anchors`. Writes nothing. */
import type { Item } from "../../src/engine/types";

export type AnchorRow = { test: "P1-ANCHOR" | "P1-PARAM"; id: string; identifier: string; scope: string; program: string; context: string; detail: string };

const COMPARE = new Set(["<", "<=", ">", ">=", "="]);
const DATE_ARITH = new Set(["latest_month_of_year", "first_day", "month_before", "month_after", "months_before", "months_after", "months_ending", "months_from_to", "year_of", "month_of_year", "days_after", "days_between", "years_between", "month_of"]);
const short = (e: unknown, n = 140) => { const s = JSON.stringify(e); return s.length > n ? s.slice(0, n) + "..." : s; };
const monthScoped = (it: Item) => it.scope === "person-month" || it.scope === "month";

function walk(e: unknown, f: (n: unknown[], anc: unknown[][]) => void, anc: unknown[][] = []) {
  if (!Array.isArray(e)) return;
  f(e, anc);
  for (const sub of e) walk(sub, f, [...anc, e]);
}

/** A parameter that changes with time: more than one version, or a version that ends. */
export function isTimeVaryingParameter(it: Item | undefined): boolean {
  if (!it || it.kind !== "parameter") return false;
  const v = (it as unknown as { versions?: { to?: string }[] }).versions;
  return Array.isArray(v) && (v.length > 1 || v.some((x) => x && x.to));
}

export function anchorRows(swept: Item[], byIdent: Map<string, Item>): AnchorRow[] {
  const rows: AnchorRow[] = [];
  const sweptIds = new Set(swept.map((it) => it.identifier));
  // month-scoped readers within the swept set, for P1-PARAM's note
  const readers = new Map<string, string[]>();
  for (const it of swept) {
    if (!monthScoped(it) || it.derived == null) continue;
    walk(it.derived, (n) => { for (const x of n) if (typeof x === "string" && sweptIds.has(x)) { const r = readers.get(x) ?? []; if (!r.includes(it.id)) r.push(it.id); readers.set(x, r); } });
  }
  for (const it of swept) {
    if (it.kind !== "derived" || it.derived == null) continue;
    const add = (test: AnchorRow["test"], context: string, detail: string) =>
      rows.push({ test, id: it.id, identifier: it.identifier, scope: it.scope, program: String(it.program), context, detail });
    walk(it.derived, (n, anc) => {
      const op = n[0];
      if (op !== "det_month" && op !== "det_date") return;
      const parent = anc[anc.length - 1];
      if (parent && parent[0] === "at" && parent[2] === n) return; // the sweeps' own `at` test
      const ops = anc.filter((a) => typeof a[0] === "string").map((a) => String(a[0]));
      let context: string;
      if (parent && COMPARE.has(String(parent[0])) && parent.some((x) => Array.isArray(x) && x[0] === "month")) context = "compare-month";
      else if (ops.includes("as_of")) context = "as_of";
      else if (parent && DATE_ARITH.has(String(parent[0]))) context = "date-arithmetic";
      else if (parent && COMPARE.has(String(parent[0]))) context = "compare-other";
      else context = "other";
      add("P1-ANCHOR", context, `${op} in ${ops.slice(-3).join(" > ")}: ${short(parent ?? n)}`);
    });
    if (it.scope === "person" || it.scope === "case" || it.scope === "global") {
      const seen = new Set<string>();
      const visit = (e: unknown, shielded: boolean) => {
        if (typeof e === "string") {
          const p = byIdent.get(e);
          if (!shielded && isTimeVaryingParameter(p) && !seen.has(e)) {
            seen.add(e);
            const r = readers.get(it.identifier) ?? [];
            add("P1-PARAM", r.length ? "read-in-month" : "not-read-in-month", `${e} (${p!.id}) read on the determination date; month-scoped readers in the sweep: ${r.length ? r.join(", ") : "none"}`);
          }
          return;
        }
        if (!Array.isArray(e)) return;
        const sh = shielded || e[0] === "at" || e[0] === "as_of";
        for (const sub of e) visit(sub, sh);
      };
      visit(it.derived, false);
    }
  }
  return rows;
}

export function printAnchors(rows: AnchorRow[], tsv: boolean): void {
  if (tsv) { for (const r of rows) console.log([r.test, r.context, r.id, r.identifier, r.scope, r.program, r.detail].join("\t")); return; }
  for (const t of ["P1-ANCHOR", "P1-PARAM"] as const) {
    const rs = rows.filter((r) => r.test === t);
    const by = new Map<string, number>();
    for (const r of rs) by.set(r.context, (by.get(r.context) ?? 0) + 1);
    console.log(`\n# ${t}: ${rs.length} candidates (${[...by].map(([k, v]) => `${k} ${v}`).join(", ")})`);
    for (const r of rs) console.log(`${r.id}\t${r.identifier}\t[${r.program} ${r.scope}]\t${r.context}\t${r.detail}`);
  }
}
