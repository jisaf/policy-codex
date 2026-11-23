/* A derivation as plain sentences for readers who do not read the pattern
 * grammar: "If any of these is not true: ... the result is 0. Otherwise ...".
 * The engine's own `block()` must round-trip through the parser, so it keeps
 * every operator literal ("0 minus (0 minus (X) rounded up ...)"); this
 * renderer is one-way and reads the idioms the ledger uses:
 *
 *   0 - ceil(0 - x)          x, rounded down to the whole dollar
 *   0 - ceil(a - b)          b minus a, rounded down to the whole dollar
 *   max(0, x)                x, but not less than 0
 *   max(floor, x)            x, but at least <floor>
 *   min(x, cap)              x, up to <cap>
 *   days_after(0 - n, d)     n days before d
 *   case / all / any / not   If ..., Otherwise ..., All of these ..., At least one ...
 *
 * Output is a list of lines, each a list of parts: plain text and item
 * references the component links to their pages. */
import type { Engine } from "../engine/engine";
import type { Expr, Item } from "../engine/types";
import { BLOCK_OPS } from "../engine/types";
import { paramInForce } from "../engine/versions";
import { formatDate, formatNumber, formatValue, optionLabel } from "./present";

export type PlainPart = string | { id: string; label: string };
export interface PlainLine { depth: number; parts: PlainPart[] }

export interface PlainOptions {
  /** The date parameter values are read on, for "(30%)" after a figure's
   *  name. Omitted: the latest value. */
  asOf?: string;
}

type E = any;

const isArr = (e: unknown): e is E[] => Array.isArray(e);
const opOf = (e: unknown): string | null => (isArr(e) && typeof e[0] === "string" ? e[0] : null);
const isZero = (e: unknown) => e === 0;
const isBlock = (e: unknown) => {
  const op = opOf(e);
  return op !== null && BLOCK_OPS.has(op);
};

/** A line longer than this reads as several: its conjunctions, sums and
 *  nested conditions are broken into bulleted clauses (`long`). */
export const LONG_LINE = 150;

/** Relationship roles in words, read after "this person is the ... of that
 *  person" or "joined to this person by ...": `legal_guardian` -> "legal
 *  guardian", `has_primary_responsibility_for` -> "person with primary
 *  responsibility"; several joined with commas and a final "or". */
const REL_WORDS: Record<string, string> = {
  buys_prepares_with: "person buying and preparing food with them",
  holds_out_as_spouse_with: "person held out as a spouse",
  has_primary_responsibility_for: "person with primary responsibility",
  in_primary_care_of: "person in the primary care",
  legal_guardian: "legal guardian",
  shares_heat_with: "person sharing heating costs with them",
  tax_filer: "tax filer",
  tax_dependent: "tax dependent",
};
export function relWords(rels: readonly string[]): string {
  const ws = (rels ?? []).map((r) => REL_WORDS[r] ?? r.replace(/_/g, " "));
  if (ws.length <= 1) return ws.join("");
  return `${ws.slice(0, -1).join(", ")} or ${ws[ws.length - 1]}`;
}

/** Joins parts, merging adjacent strings. */
function cat(...xs: Array<PlainPart | PlainPart[]>): PlainPart[] {
  const out: PlainPart[] = [];
  for (const x of xs) {
    for (const p of Array.isArray(x) ? x : [x]) {
      if (typeof p === "string" && typeof out[out.length - 1] === "string") {
        out[out.length - 1] = (out[out.length - 1] as string) + p;
      } else if (p !== "") out.push(p);
    }
  }
  return out;
}

export function partsText(parts: PlainPart[]): string {
  return parts.map((p) => (typeof p === "string" ? p : p.label)).join("");
}

/** The lines as indented text, one per line: for tests and copying. */
export function plainText(lines: PlainLine[]): string {
  return lines.map((l) => "  ".repeat(l.depth) + partsText(l.parts)).join("\n");
}

class Renderer {
  constructor(
    private engine: Engine, private opts: PlainOptions,
    /** The item whose rule this is: its options label the case results. */
    private subject: Item | null = null,
  ) {}

  /** Inside a block over other people (reachable, filter, sum, exists) `P`
   *  is the other end ("that person"), as the engine's own text says it. */
  private other = 0;

  /** Renders `f` with `P` read as "that person". */
  over<T>(f: () => T): T {
    this.other++;
    try { return f(); } finally { this.other--; }
  }

  item(id: string): Item | undefined {
    return this.engine.item(id);
  }

  ref(id: string): PlainPart[] {
    const it = this.item(id);
    if (!it) return [id];
    const label = it.name;
    if (it.kind === "parameter") {
      const v = this.opts.asOf ? paramInForce(it, this.opts.asOf) : this.engine.paramValue(it);
      if (v !== null && v !== undefined && typeof v !== "object") {
        return [{ id, label }, ` (${formatValue(it, v)})`];
      }
    }
    return [{ id, label }];
  }

  /** The item an expression names directly, if it is a bare reference. */
  itemOf(e: unknown): Item | undefined {
    return typeof e === "string" ? this.item(e) : undefined;
  }

  literal(e: unknown, context?: Item): PlainPart[] {
    if (e === true) return ["yes"];
    if (e === false) return ["no"];
    if (typeof e === "number") return [formatNumber(e)];
    if (typeof e === "string") {
      if (context?.type === "one of") return [optionLabel(context, e)];
      if (/^\d{4}-\d{2}(-\d{2})?$/.test(e)) return [formatDate(e)];
      return [e];
    }
    return ["…"];
  }

  /** An operand of arithmetic or a comparison, read as one unit: anything
   *  that is itself arithmetic, or ends in a ", rounded ..." clause, goes in
   *  parentheses. */
  operand(e: E): PlainPart[] {
    const op = opOf(e);
    if (op && ["+", "-", "*", "/", "max", "min", "ceil", "round", "case", "otherwise"].includes(op)) {
      return cat("(", this.phrase(e), ")");
    }
    return this.phrase(e);
  }

  /** A case read inline: "a if c; b if d; otherwise z". */
  inlineCase(e: E): PlainPart[] {
    const parts: PlainPart[][] = [];
    for (const arm of e.slice(1) as E[]) {
      if (arm[0] === "else") parts.push(cat("otherwise ", this.resultValue(arm[1])));
      else parts.push(cat(this.resultValue(arm[1]), " if ", this.phrase(arm[0])));
    }
    return cat(...parts.flatMap((x, i) => (i ? ["; ", ...x] : x)));
  }

  /** A case arm's value: an option of the rule's own item reads as words. */
  resultValue(e: E): PlainPart[] {
    if (typeof e === "string" && !this.item(e)) {
      const words = this.literal(e, this.subject ?? undefined);
      return this.subject?.type === "one of" ? cat("“", words, "”") : words;
    }
    return this.phrase(e);
  }

  /** One expression as an inline phrase. */
  phrase(e: E): PlainPart[] {
    if (e === null || e === undefined) return ["…"];
    if (typeof e !== "object") {
      if (typeof e === "string" && this.item(e)) return this.ref(e);
      return this.literal(e);
    }
    const op = opOf(e);
    const p = (x: E) => this.phrase(x);
    const o = (x: E) => this.operand(x);
    switch (op) {
      case "P": return [this.other ? "that person" : "this person"];
      case "det_date": return ["the determination date"];
      case "det_month": return ["the month of the determination date"];
      case "month": return ["the month"];
      case "not": return this.negation(e[1]);
      case "otherwise": return cat(p(e[1]), " (or, if that is not known, ", p(e[2]), ")");
      case "unknown": return cat(p(e[1]), " is not known");
      case "<": case "<=": case ">": case ">=": case "=":
        return this.comparison(op, e[1], e[2], false);
      case "in": return this.membership(e[1], e[2] as string[], false);
      case "-": {
        // 0 - ceil(0 - x) = floor(x); 0 - ceil(a - b) = floor(b - a).
        if (e.length === 3 && isZero(e[1]) && opOf(e[2]) === "ceil") {
          const inner = e[2][1];
          if (opOf(inner) === "-" && inner.length === 3) {
            if (isZero(inner[1])) return cat(p(inner[2]), ", rounded down to the whole dollar");
            return cat(o(inner[2]), " minus ", o(inner[1]), ", rounded down to the whole dollar");
          }
        }
        if (e.length === 3 && isZero(e[1])) return cat("minus ", o(e[2]));
        return this.arith(e, " minus ");
      }
      case "+": return this.arith(e, " plus ");
      case "*":
        // -1 * ceil(-1 * x) = floor(x).
        if (e.length === 3 && e[1] === -1 && opOf(e[2]) === "ceil"
          && opOf(e[2][1]) === "*" && e[2][1].length === 3 && e[2][1][1] === -1) {
          return cat(p(e[2][1][2]), ", rounded down to the whole dollar");
        }
        return this.arith(e, " times ");
      case "/": return this.arith(e, " divided by ");
      case "max": {
        const [a, b] = [e[1], e[2]];
        if (isZero(a)) return cat(p(b), ", but not less than 0");
        if (isZero(b)) return cat(p(a), ", but not less than 0");
        if (this.itemOf(a)?.kind === "parameter") return cat(p(b), ", but at least ", p(a));
        if (this.itemOf(b)?.kind === "parameter") return cat(p(a), ", but at least ", p(b));
        return cat("the greater of ", p(a), " and ", p(b));
      }
      case "min": {
        const [a, b] = [e[1], e[2]];
        if (this.itemOf(b)?.kind === "parameter") return cat(p(a), ", up to ", p(b));
        if (this.itemOf(a)?.kind === "parameter") return cat(p(b), ", up to ", p(a));
        return cat("the lesser of ", p(a), " and ", p(b));
      }
      case "ceil": return cat(p(e[1]), ", rounded up to the next whole dollar");
      case "round": return cat(p(e[1]), ", rounded to the nearest whole dollar");
      case "case": return this.inlineCase(e);
      case "days_after":
        if (opOf(e[1]) === "-" && e[1].length === 3 && isZero(e[1][1])) {
          return cat(p(e[1][2]), " days before ", p(e[2]));
        }
        return cat(p(e[1]), " days after ", p(e[2]));
      case "persons": return ["everyone in the household"];
      case "count": return cat("the number of people in ", p(e[1]));
      case "years_between": return cat("the number of whole years from ", p(e[1]), " to ", p(e[2]));
      case "first_day": return cat("the first day of ", p(e[1]));
      case "month_of": return cat("the month of ", p(e[1]));
      case "month_of_year": return cat("the calendar month number of ", p(e[1]));
      case "month_before": return cat("the month before ", p(e[1]));
      case "month_after": return cat("the month after ", p(e[1]));
      case "months_after": return cat(p(e[1]), " months after ", p(e[2]));
      case "months_before": return cat(p(e[1]), " months before ", p(e[2]));
      case "days_between": return cat("the number of days from ", p(e[1]), " to ", p(e[2]));
      case "months_ending": return cat("the ", p(e[1]), " months ending with ", p(e[2]));
      case "months_from_to": return cat("the months from ", p(e[1]), " through ", p(e[2]));
      case "at": return cat(p(e[1]), " in ", p(e[2]));
      case "count_months": return cat("the number of months in ", p(e[1]), " in which ", p(e[2]));
      case "avg": return cat(p(e[1]), ", averaged over ", p(e[2]));
      case "of": return cat(p(e[1]), "'s ", p(e[2]));
      case "in_group": return cat(p(e[1]), " is in ", p(e[2]));
      case "lookup": return cat("the ", p(e[1]), " figure for ", p(e[2]));
      case "band": return cat("the ", p(e[1]), " figure for the band containing ", p(e[2]));
      case "filter": return cat("the people in ", p(e[1]), " for whom ", this.over(() => p(e[2])));
      case "sum": return cat("the total of ", this.over(() => p(e[2])), " over the people in ", p(e[1]));
      case "rel": return [`this person is the ${relWords(e[1] as string[])} of `, ...p(e[2])];
      case "reachable":
        return e.length > 2
          ? cat(`the people joined to this person by ${relWords(e[1] as string[])}, crossing only where `, this.over(() => p(e[2])))
          : [`the people joined to this person by ${relWords(e[1] as string[])}`];
      case "exists": return cat("someone in ", p(e[1]), " is such that ", this.over(() => p(e[2])));
      case "exists_related": return cat(`someone this person is the ${relWords(e[1] as string[])} of is such that `, this.over(() => p(e[2])));
      case "each": return cat("in every one of ", p(e[1]), ", ", p(e[2]));
      case "some_month": return cat("in at least one of ", p(e[1]), ", ", p(e[2]));
      case "sum_months": return cat("the total over ", p(e[1]), " of ", p(e[2]));
      case "sum_receipts": return cat("the total, over the receipts in ", p(e[1]), " for which ", p(e[2]), ", of ", p(e[3]));
      case "receipt": return [`the receipt's ${String(e[1]).replace(/_/g, " ")}`];
      case "received_in": return cat("the receipt came in ", p(e[1]));
      case "all": case "any": {
        const kids = e.slice(1);
        if (kids.length === 1) return p(kids[0]);
        const sep = op === "all" ? " and " : " or ";
        return cat(...kids.flatMap((k: E, i: number) => (i ? [sep, ...this.operandBool(k)] : this.operandBool(k))));
      }
    }
    // Everything else reads as the engine renders it.
    try { return [this.engine.inline(e as Expr)]; } catch { return ["…"]; }
  }

  operandBool(e: E): PlainPart[] {
    const op = opOf(e);
    if (op === "all" || op === "any") return cat("(", this.phrase(e), ")");
    return this.phrase(e);
  }

  arith(e: E, word: string): PlainPart[] {
    return cat(...e.slice(1).flatMap((x: E, i: number) => (i ? [word, ...this.operand(x)] : this.operand(x))));
  }

  comparison(op: string, a: E, b: E, negated: boolean): PlainPart[] {
    const it = this.itemOf(a);
    if (op === "=") {
      if (b === true || b === false) {
        const yes = (b === true) !== negated;
        return cat(this.phrase(a), yes ? "" : " is not true");
      }
      const right = typeof b === "string" && !this.item(b) ? this.literal(b, it) : this.phrase(b);
      return cat(this.phrase(a), negated ? " is not " : " is ", right);
    }
    const words: Record<string, string> = negated
      ? { "<": "is at least", "<=": "is more than", ">": "is at most", ">=": "is less than" }
      : { "<": "is less than", "<=": "is at most", ">": "is more than", ">=": "is at least" };
    return cat(this.operand(a), ` ${words[op]} `, this.operand(b));
  }

  membership(a: E, values: string[], negated: boolean): PlainPart[] {
    const it = this.itemOf(a);
    const labels = (values ?? []).map((v) => optionLabel(it ?? null, v));
    if (labels.length === 1) return cat(this.phrase(a), negated ? " is not " : " is ", labels[0]);
    return cat(this.phrase(a), negated ? " is none of: " : " is one of: ", labels.join(", "));
  }

  negation(x: E): PlainPart[] {
    const op = opOf(x);
    if (op && ["<", "<=", ">", ">=", "="].includes(op)) return this.comparison(op, x[1], x[2], true);
    if (op === "in") return this.membership(x[1], x[2], true);
    if (op === "all") return cat("not all of: ", this.phrase(x));
    if (op === "any") return cat("none of: ", this.phrase(x));
    if (op === "unknown") return cat(this.phrase(x[1]), " is known");
    if (typeof x === "string" && this.item(x)) return cat(this.ref(x), " is not true");
    return cat("it is not the case that ", this.phrase(x));
  }

  /** A condition as lines: a header and one line per part, or one line. */
  condition(e: E, depth: number, lead: string, tail: string): PlainLine[] {
    const op = opOf(e);
    const negAll = op === "not" && opOf(e[1]) === "all" && e[1].length > 2;
    const negAny = op === "not" && opOf(e[1]) === "any" && e[1].length > 2;
    if ((op === "all" || op === "any") && e.length > 2 || negAll || negAny) {
      const kids: E[] = (negAll || negAny ? e[1] : e).slice(1);
      const head = op === "all" ? "all of these are true"
        : op === "any" ? "at least one of these is true"
        : negAll ? "any of these is not true" : "none of these is true";
      return [
        { depth, parts: [`${lead}${head}:`] },
        ...kids.flatMap((k) => this.bullet(k, depth + 1)),
        ...(tail ? [{ depth, parts: [tail] }] : []),
      ];
    }
    if (tail) return [{ depth, parts: cat(lead, this.phrase(e), ", " + tail) }];
    return this.long(e, depth, lead);
  }

  bullet(e: E, depth: number): PlainLine[] {
    const op = opOf(e);
    if ((op === "all" || op === "any") && e.length > 2) {
      return this.condition(e, depth, "• ", "");
    }
    if (op === "not" && (opOf(e[1]) === "all" || opOf(e[1]) === "any") && e[1].length > 2) {
      return this.condition(e, depth, "• ", "");
    }
    if (isBlock(e) && op !== "all" && op !== "any") return this.value(e, depth, "• ");
    return this.long(e, depth, "• ");
  }

  /** A value as lines: a case becomes If/Otherwise lines, anything else one
   *  line "<lead><phrase>". */
  value(e: E, depth: number, lead: string): PlainLine[] {
    const op = opOf(e);
    if (op === "case") return this.caseLines(e, depth);
    // The people of a group that is itself worked out ("the people joined
    // to this person by ..., crossing only where ...") and then narrowed.
    if (op === "filter" && isBlock(e[1])) {
      return [
        ...this.value(e[1], depth, lead),
        { depth, parts: ["keeping only the people for whom:"] },
        ...this.over(() => this.value(e[2], depth + 1, "")),
      ];
    }
    // A total over a group described at length: the total first, then who.
    if (op === "sum" && (isBlock(e[1]) || partsText(this.phrase(e[1])).length > 60)) {
      return [
        { depth, parts: cat(lead, "the total, over the people described below, of:") },
        ...this.over(() => this.value(e[2], depth + 1, "")),
        { depth, parts: ["where the people are:"] },
        ...this.value(e[1], depth + 1, ""),
      ];
    }
    if (op === "all" || op === "any" || (op === "not" && isBlock(e[1]))) {
      return this.condition(e, depth, lead + (lead ? "" : ""), "");
    }
    if (op === "exists" || op === "exists_related" || op === "each" || op === "some_month"
      || (op === "filter" && isBlock(e[2])) || (op === "sum" && isBlock(e[2]))
      || (op === "reachable" && e.length > 2 && isBlock(e[2]))) {
      let head: PlainPart[];
      if (op === "exists") head = cat("someone in ", this.phrase(e[1]), " is such that");
      else if (op === "exists_related") head = [`someone this person is the ${relWords(e[1] as string[])} of is such that`];
      else if (op === "each") head = cat("in every one of ", this.phrase(e[1]));
      else if (op === "some_month") head = cat("in at least one of ", this.phrase(e[1]));
      else if (op === "filter") head = cat("the people in ", this.phrase(e[1]), " for whom");
      else if (op === "sum") head = cat("the total, over the people in ", this.phrase(e[1]), ", of");
      else head = [`the people joined to this person by ${relWords(e[1] as string[])}, crossing only where`];
      const people = op === "exists" || op === "exists_related" || op === "filter" || op === "sum" || op === "reachable";
      const body = () => this.value(e[2], depth + 1, "");
      return [{ depth, parts: cat(lead, head, ":") }, ...(people ? this.over(body) : body())];
    }
    return this.long(e, depth, lead);
  }

  /** One expression on one line, or, when that line would be longer than
   *  LONG_LINE, a short head and the parts it joins as bulleted clauses one
   *  level down: a long sum is "the total of:" and one bullet per term, a
   *  long "x, but not less than 0" is "the following, but not less than
   *  0:" and x below it, a long comparison names its short side first. */
  long(e: E, depth: number, lead: string): PlainLine[] {
    const one = cat(lead, this.phrase(e));
    if (partsText(one).length <= LONG_LINE) return [{ depth, parts: one }];
    const op = opOf(e);
    const sub = (x: E, l: string) => this.value(x, depth + 1, l);
    const head = (...xs: Array<PlainPart | PlainPart[]>): PlainLine => ({ depth, parts: cat(lead, ...xs) });
    const following = (inner: E, ...suffix: Array<PlainPart | PlainPart[]>) => [head("the following", ...suffix, ":"), ...sub(inner, "")];
    switch (op) {
      case "+":
        return [head("the total of:"), ...e.slice(1).flatMap((x: E) => sub(x, "• "))];
      case "-": {
        if (e.length === 3 && isZero(e[1]) && opOf(e[2]) === "ceil" && opOf(e[2][1]) === "-" && e[2][1].length === 3) {
          const inner = e[2][1];
          if (isZero(inner[1])) return following(inner[2], ", rounded down to the whole dollar");
          return [head("the following, rounded down to the whole dollar:"), ...sub(inner[2], "• "), ...sub(inner[1], "• minus ")];
        }
        if (e.length === 3 && isZero(e[1])) return following(e[2], ", taken away from 0");
        return [head("worked out as:"), ...sub(e[1], "• "), ...e.slice(2).flatMap((x: E) => sub(x, "• minus "))];
      }
      case "*":
        if (e.length === 3 && e[1] === -1 && opOf(e[2]) === "ceil" && opOf(e[2][1]) === "*" && e[2][1].length === 3 && e[2][1][1] === -1) {
          return following(e[2][1][2], ", rounded down to the whole dollar");
        }
        return [head("worked out as:"), ...sub(e[1], "• "), ...e.slice(2).flatMap((x: E) => sub(x, "• times "))];
      case "/":
        return [head("worked out as:"), ...sub(e[1], "• "), ...e.slice(2).flatMap((x: E) => sub(x, "• divided by "))];
      case "max": case "min": {
        const [a, b] = [e[1], e[2]];
        const capA = this.itemOf(a)?.kind === "parameter", capB = this.itemOf(b)?.kind === "parameter";
        if (op === "max" && (isZero(a) || isZero(b))) return following(isZero(a) ? b : a, ", but not less than 0");
        if (op === "max" && (capA || capB)) return following(capA ? b : a, ", but at least ", this.ref(capA ? a : b));
        if (op === "min" && (capA || capB)) return following(capB ? a : b, ", up to ", this.ref(capB ? b : a));
        return [head(op === "max" ? "the greater of:" : "the lesser of:"), ...sub(a, "• "), ...sub(b, "• ")];
      }
      case "ceil": return following(e[1], ", rounded up to the next whole dollar");
      case "round": return following(e[1], ", rounded to the nearest whole dollar");
      case "otherwise": {
        const alt = this.phrase(e[2]);
        if (partsText(alt).length > LONG_LINE / 2) {
          return [head("the first of these that is known:"), ...sub(e[1], "• "), ...sub(e[2], "• ")];
        }
        return following(e[1], " (or, if that is not known, ", alt, ")");
      }
      case "<": case "<=": case ">": case ">=": {
        const words: Record<string, string> = { "<": "is less than", "<=": "is at most", ">": "is more than", ">=": "is at least" };
        const [a, b] = [e[1], e[2]];
        const aLen = partsText(this.phrase(a)).length, bLen = partsText(this.phrase(b)).length;
        if (aLen <= bLen) return [head(this.operand(a), ` ${words[op]}:`), ...sub(b, "")];
        return [head("the following ", words[op], " ", this.operand(b), ":"), ...sub(a, "")];
      }
      case "not": {
        const x = e[1];
        if ((opOf(x) === "all" || opOf(x) === "any") && x.length > 2) return this.condition(e, depth, lead, "");
        if (opOf(x) === "in") {
          const it = this.itemOf(x[1]);
          const labels = ((x[2] ?? []) as string[]).map((v) => optionLabel(it ?? null, v));
          return [head(this.phrase(x[1]), " is none of:"), ...labels.map((l) => ({ depth: depth + 1, parts: [`• ${l}`] }))];
        }
        return [head("it is not the case that:"), ...sub(x, "")];
      }
      case "all": case "any":
        if (e.length > 2) return this.condition(e, depth, lead, "");
        return [{ depth, parts: one }];
      case "sum":
        return [head("the total, over the people in ", this.phrase(e[1]), ", of:"), ...this.over(() => sub(e[2], ""))];
      case "sum_months":
        return [head("the total over ", this.phrase(e[1]), " of:"), ...sub(e[2], "")];
      case "sum_receipts":
        return [
          head("the total, over the receipts in ", this.phrase(e[1]), " for which:"), ...sub(e[2], ""),
          { depth, parts: ["of:"] }, ...sub(e[3], ""),
        ];
      case "count_months":
        return [head("the number of months in ", this.phrase(e[1]), " in which:"), ...sub(e[2], "")];
      case "lookup":
        return [head("the ", this.phrase(e[1]), " figure for:"), ...sub(e[2], "")];
      case "case":
        return [head("the following:"), ...this.caseLines(e, depth + 1)];
      case "in": {
        const it = this.itemOf(e[1]);
        const labels = ((e[2] ?? []) as string[]).map((v) => optionLabel(it ?? null, v));
        return [head(this.phrase(e[1]), " is one of:"), ...labels.map((l) => ({ depth: depth + 1, parts: [`• ${l}`] }))];
      }
      case "filter":
        return [head("the people in ", this.phrase(e[1]), " for whom:"), ...this.over(() => sub(e[2], ""))];
      case "reachable":
        if (e.length > 2) return [head(`the people joined to this person by ${relWords(e[1] as string[])}, crossing only where:`), ...this.over(() => sub(e[2], ""))];
        return [{ depth, parts: one }];
      default:
        return [{ depth, parts: one }];
    }
  }

  /** The arms of a case, a nested case in the last arm read as more
   *  "Otherwise, if" lines rather than one level deeper. */
  caseLines(e: E, depth: number): PlainLine[] {
    const arms: E[] = [];
    let cur: E = e;
    for (;;) {
      const these = cur.slice(1) as E[];
      const last = these[these.length - 1];
      if (last && last[0] === "else" && opOf(last[1]) === "case") {
        arms.push(...these.slice(0, -1));
        cur = last[1];
        continue;
      }
      arms.push(...these);
      break;
    }
    const out: PlainLine[] = [];
    arms.forEach((arm, n) => {
      if (arm[0] === "else") {
        out.push(...this.result(arm[1], depth, n === 0 ? "" : "Otherwise, "));
        return;
      }
      const lead = n === 0 ? "If " : "Otherwise, if ";
      const cond = this.condition(arm[0], depth, lead, "");
      const simpleCond = cond.length === 1;
      const res = this.result(arm[1], depth + (simpleCond ? 0 : 1), "");
      if (simpleCond && res.length === 1 && partsText(cat(cond[0].parts, ", ", res[0].parts)).length <= LONG_LINE) {
        out.push({ depth, parts: cat(cond[0].parts, ", ", res[0].parts) });
      } else if (simpleCond) {
        out.push({ depth, parts: cat(cond[0].parts, ":") });
        out.push(...this.result(arm[1], depth + 1, ""));
      } else {
        out.push(...cond);
        out.push(...this.result(arm[1], depth + 1, "then "));
      }
    });
    return out;
  }

  result(e: E, depth: number, lead: string): PlainLine[] {
    if (opOf(e) === "case") {
      const lines = this.caseLines(e, depth + (lead ? 1 : 0));
      return lead ? [{ depth, parts: [lead.replace(/, $/, ":")] }, ...lines] : lines;
    }
    if (isBlock(e) && opOf(e) !== "all" && opOf(e) !== "any") {
      return this.value(e, depth, lead ? `${lead}the result is ` : "the result is ");
    }
    if (opOf(e) === "all" || opOf(e) === "any") {
      const c = this.condition(e, depth, `${lead}the result is yes when `, "");
      return c;
    }
    const line = cat(lead, "the result is ", this.resultValue(e), ".");
    if (partsText(line).length > LONG_LINE && (typeof e !== "string" || this.item(e))) {
      return this.long(e, depth, `${lead}the result is `);
    }
    return [{ depth, parts: line }];
  }
}

/** A derivation as plain lines, without a lead. */
export function plainDerivation(
  engine: Engine, e: Expr, opts: PlainOptions = {}, subject: Item | null = null,
): PlainLine[] {
  const r = new Renderer(engine, opts, subject);
  return r.value(e, 0, "");
}

/** The item's rule as plain sentences, led by its name: "<Name> is yes
 *  when ..." for a yes/no rule, "<Name> is worked out as follows:" for a
 *  case, "<Name> is <phrase>." otherwise. */
export function plainRule(engine: Engine, it: Item, opts: PlainOptions = {}): PlainLine[] {
  if (it.kind !== "derived" || it.derived === undefined || it.derived === null) return [];
  const r = new Renderer(engine, opts, it);
  const e = it.derived as E;
  const op = opOf(e);
  const yesNo = engine.baseType(it) === "yes/no";
  if (op === "case") {
    return [{ depth: 0, parts: [`${it.name}:`] }, ...r.caseLines(e, 1)];
  }
  if (op === "all" || op === "any" || (op === "not" && (opOf(e[1]) === "all" || opOf(e[1]) === "any"))) {
    const lines = r.condition(e, 0, `${it.name} is ${yesNo ? "yes" : "true"} when `, "");
    return lines;
  }
  const body = r.value(e, 0, "");
  if (body.length === 1) {
    return [{ depth: 0, parts: cat(`${it.name} is `, yesNo ? "yes when " : "", body[0].parts, ".") }];
  }
  return [{ depth: 0, parts: [`${it.name} is:`] }, ...body.map((l) => ({ ...l, depth: l.depth + 1 }))];
}
