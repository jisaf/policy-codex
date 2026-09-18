import type { LedgerIndex } from "./ledger-index";
import { lit, paramValue } from "./values";
import {
  ARITH, BLOCK_OPS, CMP, DATE_RE, MONTH_RE, PAREN_OPS, type Expr,
} from "./types";

export function factName(ix: LedgerIndex, id: string): string {
  const it = ix.byIdentifier.get(id);
  if (!it) return id;
  if (it.kind === "parameter") return `${it.name} (${lit(paramValue(it))})`;
  return it.name;
}

export function inline(ix: LedgerIndex, e: Expr): string {
  if (e === null || e === undefined) return "…";
  if (e === true || e === false || typeof e === "number") return lit(e);
  if (typeof e === "string") return ix.byIdentifier.has(e) ? factName(ix, e) : e;
  const op = e[0] as string;
  const i = (x: Expr) => inline(ix, x);
  const o = (x: Expr) => operand(ix, x);
  switch (op) {
    case "P": return "that person";
    case "det_date": return "the Determination Date";
    case "det_month": return "the month containing the Determination Date";
    case "month": return "the month";
    case "not": return "it is not the case that " + i(e[1]);
    case "otherwise": return `${i(e[1])}, otherwise ${i(e[2])}`;
    case "unknown": return `${i(e[1])} is unknown`;
    case "<": case "<=": case ">": case ">=": case "=": {
      const w = {
        "<": "is less than", "<=": "is at most", ">": "is more than",
        ">=": "is at least", "=": "is equal to",
      }[op]!;
      return `${o(e[1])} ${w} ${o(e[2])}`;
    }
    case "in": return `${i(e[1])} is one of: ` + (e[2] as string[]).join(", ");
    case "+": case "*": case "-": case "/": {
      const w = { "+": " plus ", "*": " times ", "-": " minus ", "/": " divided by " }[op]!;
      return e.slice(1).map((x: Expr) => o(x)).join(w);
    }
    case "min": return `the lesser of ${i(e[1])} and ${i(e[2])}`;
    case "max": return `the greater of ${i(e[1])} and ${i(e[2])}`;
    case "ceil": return `${i(e[1])} rounded up to the next whole dollar`;
    case "round": return `${i(e[1])} rounded to the nearest whole dollar`;
    case "persons": return "every person in the case";
    case "count": return `the number of persons in ${i(e[1])}`;
    case "shared_relative": return `the persons who share a ${e[1]} with this person`;
    case "reachable": {
      const head = "the persons joined to this person by " + (e[1] as string[]).join(" or ");
      return e.length > 2 ? `${head} such that ${i(e[2])}` : head;
    }
    case "years_between": return `the number of whole years between ${i(e[1])} and ${i(e[2])}`;
    case "first_day": return `the first day of ${i(e[1])}`;
    case "month_of": return `the month containing ${i(e[1])}`;
    case "month_before": return `the month before ${i(e[1])}`;
    case "month_after": return `the month after ${i(e[1])}`;
    case "months_after": return `${i(e[1])} months after ${i(e[2])}`;
    case "months_before": return `${i(e[1])} months before ${i(e[2])}`;
    case "months_ending": return `the ${i(e[1])} consecutive months ending with ${i(e[2])}`;
    case "months_from_to": return `the months from ${i(e[1])} through ${i(e[2])}`;
    case "at": return `${i(e[1])} for ${i(e[2])}`;
    case "count_months": return `the number of months in ${i(e[1])} for which ${i(e[2])}`;
    case "avg": return `${i(e[1])} averaged over ${i(e[2])}`;
    case "rel": return "this person is a " + (e[1] as string[]).join(" or ") + ` of ${i(e[2])}`;
    case "in_group": return `${i(e[1])} is in ${i(e[2])}`;
    case "of": return `${i(e[1])}'s ${i(e[2])}`;
    case "lookup": return `${i(e[1])}, for ${i(e[2])}`;
  }
  if (op === "filter") return `all persons in ${i(e[1])} such that ${i(e[2])}`;
  if (op === "sum") return `the sum of ${i(e[2])} for each person in ${i(e[1])}`;
  if (BLOCK_OPS.has(op)) return "(" + block(ix, e).join("; ") + ")";
  throw new Error("unknown operator " + op);
}

function operand(ix: LedgerIndex, e: Expr): string {
  if (Array.isArray(e) && PAREN_OPS.has(e[0])) return "(" + inline(ix, e) + ")";
  return inline(ix, e);
}

export function block(ix: LedgerIndex, e: Expr, indent = 0): string[] {
  const pad = "  ".repeat(indent);
  if (e === null || e === undefined) return [pad + "…"];
  if (!(Array.isArray(e) && BLOCK_OPS.has(e[0]))) return [pad + inline(ix, e)];
  const op = e[0] as string;
  if (op === "all" || op === "any") {
    const lines = [
      pad + (op === "all" ? "all of the following are true:" : "any of the following is true:"),
    ];
    for (const sub of e.slice(1)) {
      const sl = block(ix, sub, indent + 1);
      sl[0] = pad + "  - " + sl[0].trimStart();
      lines.push(...sl);
    }
    return lines;
  }
  if (op === "case") {
    const lines: string[] = [];
    e.slice(1).forEach((arm: any, n: number) => {
      if (arm[0] === "else") {
        lines.push(pad + "otherwise " + inline(ix, arm[1]));
      } else {
        const c = block(ix, arm[0], indent + 1);
        lines.push(pad + (n === 0 ? "if " : "else if ") + c[0].trimStart());
        lines.push(...c.slice(1));
        lines.push(pad + "  then " + inline(ix, arm[1]));
      }
    });
    return lines;
  }
  if (op === "exists") {
    return [
      pad + `there is a person in ${inline(ix, e[1])} such that`,
      ...block(ix, e[2], indent + 1),
    ];
  }
  if (op === "exists_related") {
    const r = e[1] as string[];
    const rels = r.length > 1 ? r.slice(0, -1).join(", ") + ", or " + r[r.length - 1] : r[0];
    return [
      pad + `there is a person of whom this person is a ${rels} such that`,
      ...block(ix, e[2], indent + 1),
    ];
  }
  if (op === "reachable") {
    if (e.length < 3 || !(Array.isArray(e[2]) && BLOCK_OPS.has(e[2][0]))) return [pad + inline(ix, e)];
    return [
      pad + `the persons joined to this person by ${(e[1] as string[]).join(" or ")} such that`,
      ...block(ix, e[2], indent + 1),
    ];
  }
  if (op === "filter") {
    // Inline unless the condition is itself a block.
    if (!(Array.isArray(e[2]) && BLOCK_OPS.has(e[2][0]))) return [pad + inline(ix, e)];
    return [
      pad + `all persons in ${inline(ix, e[1])} such that`,
      ...block(ix, e[2], indent + 1),
    ];
  }
  if (op === "sum") {
    if (!(Array.isArray(e[2]) && BLOCK_OPS.has(e[2][0]))) return [pad + inline(ix, e)];
    return [
      pad + `the sum for each person in ${inline(ix, e[1])} of`,
      ...block(ix, e[2], indent + 1),
    ];
  }
  if (op === "each") {
    return [pad + `in each of ${inline(ix, e[1])}:`, ...block(ix, e[2], indent + 1)];
  }
  if (op === "some_month") {
    return [pad + `in at least one of ${inline(ix, e[1])}:`, ...block(ix, e[2], indent + 1)];
  }
  throw new Error(op);
}

export function compact(ix: LedgerIndex, e: Expr): string {
  if (e === true || e === false) return e ? "true" : "false";
  if (typeof e === "number") return lit(e);
  if (typeof e === "string") {
    return ix.byIdentifier.has(e) || DATE_RE.test(e) || MONTH_RE.test(e)
      ? e
      : JSON.stringify(e);
  }
  if (e === null || e === undefined) return "_";
  const op = e[0] as string;
  const c = (x: Expr) => compact(ix, x);
  if (op === "P") return "P";
  if (op === "det_date" || op === "det_month" || op === "month") return op;
  if (CMP.has(op) || ARITH.has(op)) {
    return "(" + e.slice(1).map(c).join(` ${op} `) + ")";
  }
  if (op === "in") {
    return `${c(e[1])} in {${(e[2] as string[]).map((x) => JSON.stringify(x)).join(", ")}}`;
  }
  if (op === "case") {
    return "case(" + e.slice(1).map((a: any) =>
      a[0] === "else" ? "else " + c(a[1]) : `${c(a[0])} -> ${c(a[1])}`).join("; ") + ")";
  }
  if (op === "rel" || op === "exists_related") {
    return `${op}([${(e[1] as string[]).map((x) => JSON.stringify(x)).join(", ")}], ${c(e[2])})`;
  }
  if (op === "shared_relative") return `${op}(${JSON.stringify(e[1])})`;
  if (op === "reachable") {
    const roles = `[${(e[1] as string[]).map((x) => JSON.stringify(x)).join(", ")}]`;
    return e.length > 2 ? `${op}(${roles}, ${c(e[2])})` : `${op}(${roles})`;
  }
  return op + "(" + e.slice(1).map(c).join(", ") + ")";
}
