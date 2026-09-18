import type { Engine } from "../engine/engine";
import type { Expr, Item } from "../engine/types";

/** Result type of each pattern; "*" means it takes the type of its context. */
export const RESULT: Record<string, string> = {
  all: "yes/no", any: "yes/no", not: "yes/no", unknown: "yes/no",
  "<": "yes/no", "<=": "yes/no", ">=": "yes/no", ">": "yes/no", "=": "yes/no",
  in: "yes/no", each: "yes/no", some_month: "yes/no", exists: "yes/no",
  exists_related: "yes/no", rel: "yes/no", in_group: "yes/no",
  "+": "number", "*": "number", "-": "number", "/": "number", min: "number",
  years_between: "number", count_months: "number", avg: "number", lookup: "number",
  first_day: "date", month_of: "month", month_before: "month", month_after: "month",
  months_ending: "months", months_from_to: "months", months_after: "month", months_before: "month",
  at: "*", of: "*", otherwise: "*", case: "*",
  max: "number", ceil: "number", round: "number", count: "number", sum: "number",
  persons: "group", filter: "group", reachable: "group", shared_relative: "group",
};

export const LABEL: Record<string, string> = {
  all: "all of the following are true", any: "any of the following is true",
  not: "it is not the case that …", unknown: "… is unknown",
  "<": "… is less than …", "<=": "… is at most …", ">=": "… is at least …",
  ">": "… is more than …", "=": "… is equal to …", in: "… is one of …",
  each: "… in each of [months]", some_month: "… in at least one of [months]",
  exists: "there is a person in [group] such that …",
  exists_related: "there is a person of whom this person is a [parent/guardian/…] such that …",
  rel: "this person is a [relationship] of that person",
  in_group: "that person is in [group]",
  "+": "… plus …", "*": "… times …", "-": "… minus …", "/": "… divided by …",
  min: "the lesser of … and …",
  years_between: "the number of whole years between … and …",
  count_months: "the number of months in [months] for which …",
  avg: "… averaged over [months]", lookup: "[table] for [month], for that person",
  first_day: "the first day of [month]", month_of: "the month containing [date]",
  month_before: "the month before [month]", month_after: "the month after [month]",
  months_ending: "the N consecutive months ending with [month]",
  months_from_to: "the months from … through …", months_after: "N months after [month]", months_before: "N months before [month]",
  at: "[per-month fact] for [month]", of: "that person's [fact]",
  otherwise: "…, otherwise …", case: "if … then …; otherwise …",
  max: "the greater of … and …", ceil: "… rounded up to the next whole dollar",
  round: "… rounded to the nearest whole dollar", count: "the number of persons in [group]",
  sum: "the sum of … for each person in [group]", persons: "every person in the case",
  filter: "all persons in [group] such that …",
  reachable: "the persons joined to this person by [relationship] (such that …)",
  shared_relative: "the persons who share a [relationship] with this person",
};

export const SLOTS: Record<string, string[]> = {
  all: ["yes/no", "yes/no"], any: ["yes/no", "yes/no"], not: ["yes/no"], unknown: ["*"],
  "<": ["ord", "ord"], "<=": ["ord", "ord"], ">=": ["ord", "ord"], ">": ["ord", "ord"],
  "=": ["*", "*"], in: ["enum"], each: ["months", "yes/no"], some_month: ["months", "yes/no"],
  exists: ["group", "yes/no"], exists_related: ["yes/no"], rel: ["person"],
  in_group: ["person", "group"],
  "+": ["number", "number"], "*": ["number", "number"], "-": ["number", "number"],
  "/": ["number", "number"], min: ["number", "number"], years_between: ["date", "date"],
  count_months: ["months", "yes/no"], avg: ["pm-number", "months"], lookup: ["table", "person"],
  first_day: ["month"], month_of: ["date"], month_before: ["month"], month_after: ["month"],
  months_ending: ["number", "month"], months_from_to: ["month", "month"],
  months_after: ["number", "month"], months_before: ["number", "month"],
  at: ["pm-fact", "month"], of: ["person", "fact"], otherwise: ["same", "same"], case: [],
  max: ["number", "number"], ceil: ["number"], round: ["number"], count: ["group"],
  sum: ["group", "number"], persons: [], filter: ["group", "yes/no"], reachable: [],
  shared_relative: [],
};

export const SLOTNAME: Record<string, string[]> = {
  all: ["condition"], any: ["condition"], not: ["condition"], unknown: ["value"],
  in: ["enumeration"], each: ["months", "condition"], some_month: ["months", "condition"],
  exists: ["group", "condition"], exists_related: ["condition"], rel: ["person"],
  in_group: ["person", "group"], min: ["a", "b"], years_between: ["from date", "to date"],
  count_months: ["months", "condition"], avg: ["fact", "months"], lookup: ["table", "person"],
  first_day: ["month"], month_of: ["date"], month_before: ["month"], month_after: ["month"],
  months_ending: ["how many", "ending with"], months_from_to: ["from", "through"],
  at: ["fact", "month"], of: ["person", "fact"], otherwise: ["value", "default"],
  "+": ["operand"], "*": ["operand"], "-": ["a", "b"], "/": ["a", "b"],
  "<": ["this", "compared with"], "<=": ["this", "compared with"],
  ">=": ["this", "compared with"], ">": ["this", "compared with"],
  "=": ["this", "compared with"],
  max: ["a", "b"], ceil: ["value"], round: ["value"], count: ["group"],
  sum: ["group", "value"], filter: ["group", "condition"],
};

export const NARY: ReadonlySet<string> = new Set(["all", "any", "+", "*"]);

export interface SlotCtx {
  root: boolean;
  monthOk: boolean;
  personOk: boolean;
  ctxType: string;
}

export function typeOk(want: string, got: string): boolean {
  if (want === "*" || want === "same" || want === "fact") return true;
  if (want === "ord") return ["number", "date", "month"].includes(got);
  if (want === "pm-number") return got === "number";
  if (want === "pm-fact") return true;
  return want === got;
}

export interface ChooserOptions {
  facts: Item[];
  consts: Array<[string, string]>;
  pats: string[];
  lits: string[];
}

export function optionsFor(
  engine: Engine, want: string, ctx: SlotCtx, selfIdentifier: string,
): ChooserOptions {
  const facts = engine.items()
    .filter((f) => {
      if (want === "pm-fact" || want === "pm-number") {
        return f.scope === "person-month" || f.scope === "month";
      }
      if (want === "fact") return true;
      if (f.scope === "person-month" || f.scope === "month") {
        return ctx.monthOk && typeOk(want, engine.baseType(f));
      }
      return typeOk(want, engine.baseType(f));
    })
    .filter((f) => want !== "pm-number" || engine.baseType(f) === "number")
    .filter((f) => f.identifier !== selfIdentifier)
    .sort((a, b) => a.name.localeCompare(b.name));

  const consts: Array<[string, string]> = [];
  if (typeOk(want, "date")) consts.push(["det_date", "the Determination Date"]);
  if (typeOk(want, "month")) {
    consts.push(["det_month", "the month containing the Determination Date"]);
    if (ctx.monthOk) consts.push(["month", "the month"]);
  }
  if (typeOk(want, "person") && ctx.personOk) consts.push(["P", "that person"]);

  const pats = Object.keys(RESULT).filter((op) => {
    const r = RESULT[op];
    if (op === "case" && !ctx.root) return false;
    if (op === "rel" || op === "in_group" || op === "of" || op === "lookup") {
      return ctx.personOk && typeOk(want, r === "*" ? "*" : r);
    }
    if (r === "*") return true;
    return typeOk(want, r);
  });

  const lits: string[] = [];
  if (typeOk(want, "number")) lits.push("number");
  if (typeOk(want, "date")) lits.push("date");
  if (typeOk(want, "month")) lits.push("month");
  if (typeOk(want, "yes/no")) lits.push("yes/no");
  if (want === "*" || want === "same" || want === "enum" || want === "text") lits.push("text");

  return { facts, consts, pats, lits };
}

export function template(op: string): Expr {
  if (op === "case") return ["case", [null, null], ["else", null]];
  if (op === "exists_related") return ["exists_related", ["parent"], null];
  if (op === "rel") return ["rel", ["parent"], ["P"]];
  if (op === "in") return ["in", null, []];
  if (op === "lookup") return ["lookup", null, ["P"]];
  if (op === "of") return ["of", ["P"], null];
  if (op === "in_group") return ["in_group", ["P"], null];
  if (op === "reachable") return ["reachable", ["buys_prepares_with"]];
  if (op === "shared_relative") return ["shared_relative", "parent"];
  if (["det_date", "det_month", "month", "P", "persons"].includes(op)) return [op];
  return [op, ...(SLOTS[op] ?? []).map(() => null)];
}

export function nodeAt(root: Expr, path: number[]): unknown {
  let n: any = root;
  for (const p of path) n = n[p];
  return n;
}

function clone(root: Expr): any {
  return root === null || root === undefined ? root : JSON.parse(JSON.stringify(root));
}

/** Returns a new expression with `v` written at `path`; never mutates `root`. */
export function setAt(root: Expr, path: number[], v: unknown): Expr {
  if (!path.length) return v as Expr;
  const next = clone(root);
  let n: any = next;
  for (const p of path.slice(0, -1)) n = n[p];
  n[path[path.length - 1]] = v;
  return next;
}

export function spliceAt(
  root: Expr, path: number[], start: number, deleteCount: number, ...insert: unknown[]
): Expr {
  const next = clone(root);
  let n: any = next;
  for (const p of path) n = n[p];
  n.splice(start, deleteCount, ...insert);
  return next;
}
