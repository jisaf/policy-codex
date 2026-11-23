import type { LedgerIndex } from "./ledger-index";
import { inline } from "./render";
import { baseType, paramValue } from "./values";
import { fieldBaseType, isRecordList } from "./records";
import { DATE_RE, MONTH_RE, type BaseType, type Expr, type RecordFieldSpec, type Scope } from "./types";

export interface CheckResult {
  type: BaseType;
  errors: string[];
  warnings: string[];
  refs: Set<string>;
}

export function check(ix: LedgerIndex, expr: Expr, itemScope: Scope | undefined): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const refs = new Set<string>();
  const monthScoped = itemScope === "person-month" || itemScope === "month";
  /** Depth of "for each month in" sums around the expression being typed. */
  let monthSums = 0;
  /** The record schemas of the "for each receipt in" sums around the
   *  expression being typed, innermost last (P55-P57). */
  const receiptSchemas: Array<{ list: string; fields: Record<string, RecordFieldSpec> }> = [];
  /** The field a `["receipt", field]` expression reads, or null. */
  const receiptFieldOf = (x: Expr): RecordFieldSpec | null => {
    if (!Array.isArray(x) || x[0] !== "receipt" || !receiptSchemas.length) return null;
    return receiptSchemas[receiptSchemas.length - 1].fields[x[1] as string] ?? null;
  };
  /** A "one of" receipt field compared with options: each must be one of
   *  the field's options (a misspelt kind would never match a record). */
  const fieldOptions = (x: Expr, opts: unknown[]): void => {
    const f = receiptFieldOf(x);
    if (!f?.options) return;
    for (const o of opts) {
      if (typeof o === "string" && !f.options.includes(o)) {
        errors.push(`"${o}" is not an option of that receipt's ${String((x as unknown[])[1]).replace(/_/g, " ")}`);
      }
    }
  };
  /** A table looked up by a receipt's kind (a program's counting table) must
   *  have a row for every kind, in every version, and no row for anything
   *  else: a kind with no row would be unknown at run time, and a row for no
   *  kind is a misspelling. (Other fields, such as the frequency a
   *  conversion table is keyed by, are read only for the options a rule
   *  selects first.) */
  const coversOptions = (tbl: Expr, key: Expr): void => {
    const f = Array.isArray(key) && key[1] === "kind" ? receiptFieldOf(key) : null;
    if (!f?.options || typeof tbl !== "string") return;
    const it = ix.byIdentifier.get(tbl);
    if (!it || it.kind !== "parameter") return;
    const values = Array.isArray(it.versions) && it.versions.length
      ? it.versions.map((v) => ({ v: v.value, from: v.from }))
      : [{ v: it.value, from: null as string | null }];
    for (const { v, from } of values) {
      if (!v || typeof v !== "object") continue;
      const rows = Object.keys(v as object);
      const at = from ? ` (version from ${from})` : "";
      const missing = f.options.filter((o) => !rows.includes(o));
      const extra = rows.filter((r) => !f.options!.includes(r));
      if (missing.length) errors.push(`${it.name}${at} has no row for: ${missing.join(", ")}`);
      if (extra.length) errors.push(`${it.name}${at} has a row for no option of that receipt's ${String((key as unknown[])[1]).replace(/_/g, " ")}: ${extra.join(", ")}`);
    }
  };
  /** A role the volume does not declare can never match an edge, so a
   *  misspelling would silently read as "no such relationship". */
  const declaredRoles = ix.roles ? new Set(ix.roles.map((r) => r.id)) : null;
  const roles = (list: unknown): void => {
    if (!declaredRoles) return;
    for (const r of Array.isArray(list) ? list : [list]) {
      if (typeof r === "string" && !declaredRoles.has(r)) {
        warnings.push(`relationship role "${r}" is not declared in volume.yaml relationship_roles`);
      }
    }
  };

  /** A table's rows are amounts, except a table keyed by option whose rows
   *  are options (a county's region): its lookup then yields an option. */
  function rowType(tbl: Expr): BaseType {
    const it = typeof tbl === "string" ? ix.byIdentifier.get(tbl) : undefined;
    const v = it ? paramValue(it) : null;
    if (v && typeof v === "object") {
      const rows = Object.values(v as Record<string, unknown>);
      if (rows.length && rows.every((r) => typeof r === "string")) return "enum";
    }
    return "number";
  }

  function t(e: Expr, mb: boolean): BaseType {
    if (e === true || e === false) return "yes/no";
    if (typeof e === "number") return "number";
    if (e === null || e === undefined) { errors.push("empty slot"); return "unknown"; }
    if (typeof e === "string") {
      if (DATE_RE.test(e)) return "date";
      if (MONTH_RE.test(e)) return "month";
      const it = ix.byIdentifier.get(e);
      if (it) {
        refs.add(e);
        // A receipt sum's condition and value read that receipt's fields,
        // the month, case facts and parameters only: never another fact of
        // a person (docs/operators.md "Receipt records": what lets a fact
        // graph run the sum as a filter with no outer-person binding).
        if (receiptSchemas.length && it.kind !== "parameter" &&
          (it.scope === "person" || it.scope === "person-month")) {
          errors.push(`"${it.name}" is a fact of a person; a receipt sum reads only that receipt's fields, the month, case facts and parameters (read it outside the sum)`);
        }
        if ((it.scope === "person-month" || it.scope === "month") && !mb) {
          errors.push(
            `"${it.name}" is a per-month fact; say which month (use "for [month]") ` +
              `or make this item per person per month`,
          );
        }
        return baseType(it);
      }
      if (ix.enumOptions.has(e)) return "enum";
      errors.push(`unknown reference "${e}"`);
      return "unknown";
    }
    if (!Array.isArray(e) || !e.length) { errors.push("malformed expression"); return "unknown"; }
    const op = e[0] as string;
    const need = (sub: Expr, want: BaseType[] | null, what: string): BaseType => {
      const got = t(sub, mb);
      if (want && got !== "unknown" && !want.includes(got)) {
        errors.push(`${what}: expected ${want.join(" or ")}, got ${got}`);
      }
      return got;
    };
    switch (op) {
      case "P": return "person";
      case "det_date": return "date";
      case "det_month": return "month";
      case "month":
        if (!mb) errors.push('"the month" used outside a per-month context');
        return "month";
      case "all": case "any":
        if (e.length < 2) errors.push(`${op} needs at least one condition`);
        e.slice(1).forEach((s: Expr, k: number) => need(s, ["yes/no"], `${op} item ${k + 1}`));
        return "yes/no";
      case "not": need(e[1], ["yes/no"], "not"); return "yes/no";
      case "unknown": t(e[1], mb); return "yes/no";
      case "otherwise": {
        const a = t(e[1], mb); const b = t(e[2], mb);
        if (a !== "unknown" && b !== "unknown" && a !== b) {
          errors.push(`otherwise: default is ${b} but the value is ${a}`);
        }
        return a === "unknown" ? b : a;
      }
      case "<": case "<=": case ">": case ">=": {
        const a = t(e[1], mb); const b = t(e[2], mb);
        const ok = (x: BaseType) => ["number", "date", "month"].includes(x);
        if (a !== "unknown" && !ok(a)) {
          errors.push(`${inline(ix, e[1])} cannot be compared with ${op}: it is ${a}`);
        }
        if (a !== "unknown" && b !== "unknown" && a !== b) {
          errors.push(`comparison mixes ${a} and ${b}`);
        }
        return "yes/no";
      }
      case "=": {
        const a = t(e[1], mb); const b = t(e[2], mb);
        if (typeof e[2] === "string") fieldOptions(e[1], [e[2]]);
        if (a !== "unknown" && b !== "unknown" && a !== b) {
          errors.push(`equality mixes ${a} and ${b}`);
        }
        return "yes/no";
      }
      case "in": {
        const a = t(e[1], mb);
        if (!Array.isArray(e[2]) || !e[2].length) errors.push("is one of: needs options");
        else if (receiptFieldOf(e[1])) fieldOptions(e[1], e[2] as unknown[]);
        else if (typeof e[1] === "string" && ix.byIdentifier.get(e[1])?.options) {
          const target = ix.byIdentifier.get(e[1])!;
          for (const o of e[2] as string[]) {
            if (!target.options!.includes(o)) {
              errors.push(`"${o}" is not an option of ${target.name}`);
            }
          }
        }
        if (a !== "unknown" && a !== "enum" && a !== "text") {
          errors.push("is one of: applies to enumerations");
        }
        return "yes/no";
      }
      case "+": case "*": case "-": case "/":
        e.slice(1).forEach((s: Expr, k: number) => need(s, ["number"], `${op} operand ${k + 1}`));
        if (e.length < 3) errors.push(`${op} needs two operands`);
        // Subtraction and division take exactly two; a third operand was
        // silently ignored by the evaluator (coverage round, 2026-11-22).
        if ((op === "-" || op === "/") && e.length > 3) errors.push(`${op} takes exactly two operands (got ${e.length - 1}); nest it`);
        return "number";
      case "min":
        need(e[1], ["number"], "lesser of"); need(e[2], ["number"], "lesser of");
        if (e.length !== 3) errors.push(`min takes exactly two operands (got ${e.length - 1}); nest it`);
        return "number";
      case "years_between":
        need(e[1], ["date"], "years between"); need(e[2], ["date"], "years between");
        return "number";
      case "first_day": need(e[1], ["month"], "first day of"); return "date";
      case "month_of": need(e[1], ["date"], "month containing"); return "month";
      case "month_of_year": need(e[1], ["month"], "calendar month number of"); return "number";
      case "year_of": need(e[1], ["month", "date"], "calendar year of"); return "number";
      case "month_before": case "month_after": need(e[1], ["month"], op); return "month";
      case "months_ending":
        need(e[1], ["number"], "consecutive months"); need(e[2], ["month"], "ending with");
        return "months";
      case "months_after": case "months_before":
        need(e[1], ["number"], op); need(e[2], ["month"], op);
        return "month";
      case "days_after":
        need(e[1], ["number"], "days after"); need(e[2], ["date"], "days after");
        return "date";
      case "days_between":
        need(e[1], ["date"], "days from"); need(e[2], ["date"], "days from");
        return "number";
      case "months_from_to":
        need(e[1], ["month"], "months from"); need(e[2], ["month"], "through");
        return "months";
      case "at": {
        need(e[2], ["month"], "for [month]");
        if (typeof e[1] === "string") {
          const target = ix.byIdentifier.get(e[1]);
          if (target && !["person-month", "month"].includes(target.scope)) {
            errors.push(
              `"${target.name}" is not a per-month fact; "for [month]" does not apply`,
            );
          }
        }
        return t(e[1], true);
      }
      case "each": case "some_month":
        need(e[1], ["months"], op); need(e[2], ["yes/no"], op + " condition");
        return "yes/no";
      case "count_months":
        need(e[1], ["months"], "months in"); need(e[2], ["yes/no"], "for which");
        return "number";
      case "avg":
        need(e[2], ["months"], "averaged over");
        return need(e[1], ["number"], "averaged");
      case "sum_months": {
        need(e[1], ["months"], "for each month in");
        monthSums++;
        try { need(e[2], ["number"], "the sum of"); } finally { monthSums--; }
        return "number";
      }
      case "that_month":
        if (!monthSums) errors.push('"that month" used outside "the sum of ... for each month in"');
        return "month";
      case "sum_receipts": {
        if (e.length !== 4) errors.push("the sum for each receipt in: needs a list, a condition and a value");
        const listId = typeof e[1] === "string" ? e[1]
          : Array.isArray(e[1]) && e[1][0] === "of" && typeof e[1][2] === "string" ? e[1][2] : null;
        const listItem = listId ? ix.byIdentifier.get(listId) : undefined;
        if (!listId || !isRecordList(listItem)) {
          errors.push("for each receipt in: expected a list of receipts (or that person's)");
          t(e[1], mb);
          return "number";
        }
        need(e[1], ["records"], "for each receipt in");
        receiptSchemas.push({ list: listId, fields: listItem!.record_fields ?? {} });
        try {
          need(e[2], ["yes/no"], "where");
          need(e[3], ["number"], "the sum of");
        } finally { receiptSchemas.pop(); }
        return "number";
      }
      case "receipt": {
        if (!receiptSchemas.length) {
          errors.push('"that receipt" used outside "the sum of ... for each receipt in"');
          return "unknown";
        }
        const s = receiptSchemas[receiptSchemas.length - 1];
        const f = typeof e[1] === "string" ? s.fields[e[1]] : undefined;
        if (!f) {
          errors.push(`that receipt's ${String(e[1]).replace(/_/g, " ")}: ${s.list} declares no such field`);
          return "unknown";
        }
        return fieldBaseType(f);
      }
      case "received_in":
        if (!receiptSchemas.length) errors.push('"that receipt" used outside "the sum of ... for each receipt in"');
        need(e[1], ["month"], "received in");
        return "yes/no";
      case "case": {
        let vt: BaseType | null = null;
        e.slice(1).forEach((arm: any, k: number) => {
          if (arm[0] === "else") {
            const v = t(arm[1], mb);
            if (vt && v !== vt && v !== "unknown") errors.push("case: values have different types");
            vt = vt || v;
          } else {
            need(arm[0], ["yes/no"], `case condition ${k + 1}`);
            const v = t(arm[1], mb);
            if (vt && v !== vt && v !== "unknown") errors.push("case: values have different types");
            vt = vt || v;
          }
        });
        if (!e.slice(1).some((a: any) => a[0] === "else")) {
          warnings.push("case has no otherwise; result is unknown when no condition holds");
        }
        return vt || "unknown";
      }
      case "exists":
        need(e[1], ["group"], "there is a person in"); need(e[2], ["yes/no"], "such that");
        return "yes/no";
      case "exists_related":
        if (!Array.isArray(e[1]) || !e[1].length) errors.push("relationships list is empty");
        roles(e[1]);
        need(e[2], ["yes/no"], "such that");
        refs.add("relationships");
        return "yes/no";
      case "rel":
        roles(e[1]);
        need(e[2], ["person"], "of that person");
        refs.add("relationships");
        return "yes/no";
      case "in_group":
        need(e[1], ["person"], "person"); need(e[2], ["group"], "is in");
        return "yes/no";
      case "of": {
        need(e[1], ["person"], "that person's");
        if (typeof e[2] === "string" && ix.byIdentifier.has(e[2])) {
          refs.add(e[2]);
          const target = ix.byIdentifier.get(e[2])!;
          if (target.scope === "person-month" && !mb) {
            errors.push(`"${target.name}" is per-month; needs a month context`);
          }
          return baseType(target);
        }
        errors.push("that person's: expected a fact");
        return "unknown";
      }
      case "lookup":
        need(e[1], ["table"], "table"); need(e[2], ["person", "number", "enum"], "for person, size or option");
        coversOptions(e[1], e[2]);
        return rowType(e[1]);
      case "band":
        need(e[1], ["table"], "table"); need(e[2], ["number"], "for the band containing");
        return rowType(e[1]);
      case "lookup_extended":
        need(e[1], ["table"], "table"); need(e[2], ["number"], "for");
        if (e.length > 3) need(e[3], ["number"], "plus for each beyond the last row");
        if (e.length < 3 || e.length > 4) errors.push("lookup beyond the last row: needs a table, a number and at most one amount");
        return "number";
      case "latest_month_of_year":
        need(e[1], ["number"], "the most recent month number"); need(e[2], ["month", "date"], "on or before");
        return "month";
      case "as_of": {
        need(e[2], ["date"], "as of");
        const target = typeof e[1] === "string" ? ix.byIdentifier.get(e[1]) : undefined;
        if (!target || target.kind !== "parameter") {
          errors.push(`"as of" reads a parameter: ${JSON.stringify(e[1])} is not one`);
          return "unknown";
        }
        refs.add(e[1] as string);
        return baseType(target);
      }
      case "max":
        need(e[1], ["number"], "greater of"); need(e[2], ["number"], "greater of");
        if (e.length !== 3) errors.push(`max takes exactly two operands (got ${e.length - 1}); nest it`);
        return "number";
      case "ceil": case "round":
        need(e[1], ["number"], op === "ceil" ? "rounded up" : "rounded");
        return "number";
      case "persons": return "group";
      case "count":
        need(e[1], ["group"], "the number of persons in");
        return "number";
      case "filter":
        need(e[1], ["group"], "all persons in"); need(e[2], ["yes/no"], "such that");
        return "group";
      case "sum":
        need(e[1], ["group"], "for each person in"); need(e[2], ["number"], "the sum of");
        return "number";
      case "has_relative_in":
        if (!Array.isArray(e[1]) || !e[1].length) errors.push("relationships list is empty");
        roles(e[1]);
        need(e[2], ["group"], "of a person in");
        refs.add("relationships");
        return "yes/no";
      case "shared_relative":
        if (typeof e[1] !== "string" || !e[1]) errors.push("shared relative: relationship missing");
        if (e.length > 2 && e[2] !== "every") errors.push('shared relative: the only option is "every"');
        roles(e[1]);
        refs.add("relationships");
        return "group";
      case "reachable":
        if (!Array.isArray(e[1]) || !e[1].length) errors.push("relationships list is empty");
        roles(e[1]);
        if (e.length > 2) need(e[2], ["yes/no"], "joined such that");
        refs.add("relationships");
        return "group";
    }
    errors.push(`unknown pattern "${op}"`);
    return "unknown";
  }

  const type = t(expr, monthScoped);
  return { type, errors, warnings, refs };
}

export function usesOf(ix: LedgerIndex, expr: Expr): string[] {
  return [...check(ix, expr, "person-month").refs];
}
