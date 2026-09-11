import type { LedgerIndex } from "./ledger-index";
import { inline } from "./render";
import { baseType } from "./values";
import { DATE_RE, MONTH_RE, type BaseType, type Expr, type Scope } from "./types";

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
        if (a !== "unknown" && b !== "unknown" && a !== b) {
          errors.push(`equality mixes ${a} and ${b}`);
        }
        return "yes/no";
      }
      case "in": {
        const a = t(e[1], mb);
        if (!Array.isArray(e[2]) || !e[2].length) errors.push("is one of: needs options");
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
        return "number";
      case "min":
        need(e[1], ["number"], "lesser of"); need(e[2], ["number"], "lesser of");
        return "number";
      case "years_between":
        need(e[1], ["date"], "years between"); need(e[2], ["date"], "years between");
        return "number";
      case "first_day": need(e[1], ["month"], "first day of"); return "date";
      case "month_of": need(e[1], ["date"], "month containing"); return "month";
      case "month_before": case "month_after": need(e[1], ["month"], op); return "month";
      case "months_ending":
        need(e[1], ["number"], "consecutive months"); need(e[2], ["month"], "ending with");
        return "months";
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
        need(e[2], ["yes/no"], "such that");
        refs.add("relationships");
        return "yes/no";
      case "rel":
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
        need(e[1], ["table"], "table"); need(e[2], ["person"], "for person");
        return "number";
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
