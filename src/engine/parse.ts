import type { LedgerIndex } from "./ledger-index";
import { DATE_RE, MONTH_RE, type Expr } from "./types";

interface Line { indent: number; text: string }

/** Split `s` at a top-level (outside parentheses) occurrence of `sep`. */
export function splitTop(s: string, sep: string, fromRight = false): [string, string] | null {
  let depth = 0;
  const positions: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && s.startsWith(sep, i)) positions.push(i);
  }
  if (!positions.length) return null;
  const p = fromRight ? positions[positions.length - 1] : positions[0];
  return [s.slice(0, p), s.slice(p + sep.length)];
}

export function stripParens(s: string): string {
  s = s.trim();
  while (s.startsWith("(") && s.endsWith(")")) {
    let d = 0;
    let ok = true;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "(") d++;
      else if (s[i] === ")") d--;
      if (d === 0 && i < s.length - 1) { ok = false; break; }
    }
    if (!ok) break;
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function resolveName(ix: LedgerIndex, s: string): string | null {
  s = s.trim();
  if (ix.byIdentifier.has(s)) return s;
  const low = s.toLowerCase();
  const byName = ix.byName.get(low);
  if (byName) return byName.identifier;
  const m = s.match(/^(.*)\s\([^()]*\)$/); // parameter written with its value suffix
  if (m) {
    const p = ix.byName.get(m[1].toLowerCase());
    if (p) return p.identifier;
  }
  return null;
}

function flattenArith(e: any[]): any[] {
  const op = e[0];
  if (op === "+" || op === "*") {
    const out: any[] = [op];
    for (const x of e.slice(1)) {
      if (Array.isArray(x) && x[0] === op) out.push(...x.slice(1));
      else out.push(x);
    }
    return out;
  }
  return e;
}

function parseAt(ix: LedgerIndex, s: string, options: readonly string[]): Expr | null {
  // "<fact name> for <month expr>": try each top-level " for " from the right.
  let depth = 0;
  const pos: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && s.startsWith(" for ", i)) pos.push(i);
  }
  for (let k = pos.length - 1; k >= 0; k--) {
    const left = s.slice(0, pos[k]);
    const right = s.slice(pos[k] + 5);
    const n = resolveName(ix, left);
    if (n) {
      try {
        return ["at", n, parseInline(ix, right, options)];
      } catch { /* try the next " for " */ }
    }
  }
  return null;
}

export function parseInline(
  ix: LedgerIndex, s: string, options: readonly string[] = [],
): Expr {
  s = stripParens(s);
  if (!s) throw new Error("empty expression");
  if (s === "that person") return ["P"];
  if (s === "the Determination Date") return ["det_date"];
  if (s === "the month containing the Determination Date") return ["det_month"];
  if (s === "the month") return ["month"];
  if (s === "every person in the case") return ["persons"];
  if (s === "yes") return true;
  if (s === "no") return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (DATE_RE.test(s) || MONTH_RE.test(s)) return s;
  const name = resolveName(ix, s);
  if (name) return name;
  const p = (x: string) => parseInline(ix, x, options);
  if (s.startsWith("it is not the case that ")) return ["not", p(s.slice(24))];
  let sp: [string, string] | null;
  if ((sp = splitTop(s, ", otherwise ", true))) return ["otherwise", p(sp[0]), p(sp[1])];
  const comparisons: Array<[string, string]> = [
    [" is less than ", "<"], [" is at most ", "<="], [" is at least ", ">="],
    [" is more than ", ">"], [" is equal to ", "="],
  ];
  for (const [phrase, op] of comparisons) {
    if ((sp = splitTop(s, phrase))) return [op, p(sp[0]), p(sp[1])];
  }
  if ((sp = splitTop(s, " is one of: "))) {
    return ["in", p(sp[0]), sp[1].split(",").map((x) => x.trim()).filter(Boolean)];
  }
  if (s.endsWith(" is unknown")) return ["unknown", p(s.slice(0, -11))];
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^the number of whole years between (.+)$/))) {
    const q = splitTop(m[1], " and ");
    if (q) return ["years_between", p(q[0]), p(q[1])];
  }
  if ((m = s.match(/^the lesser of (.+)$/))) {
    const q = splitTop(m[1], " and ");
    if (q) return ["min", p(q[0]), p(q[1])];
  }
  if ((m = s.match(/^the greater of (.+)$/))) {
    const q = splitTop(m[1], " and ");
    if (q) return ["max", p(q[0]), p(q[1])];
  }
  if (s.endsWith(" rounded up to the next whole dollar")) return ["ceil", p(s.slice(0, -36))];
  if (s.endsWith(" rounded to the nearest whole dollar")) return ["round", p(s.slice(0, -36))];
  if ((m = s.match(/^the number of persons in (.+)$/))) return ["count", p(m[1])];
  if ((m = s.match(/^the persons who share a (.+) with this person$/))) {
    return ["shared_relative", m[1].trim()];
  }
  if ((m = s.match(/^the persons joined to this person by (.+)$/))) {
    const q = splitTop(m[1], " such that ");
    const roles = (q ? q[0] : m[1]).split(" or ").map((x) => x.trim());
    return q ? ["reachable", roles, p(q[1])] : ["reachable", roles];
  }
  if ((m = s.match(/^all persons in (.+)$/))) {
    const q = splitTop(m[1], " such that ");
    if (q) return ["filter", p(q[0]), p(q[1])];
  }
  if ((m = s.match(/^the sum of (.+)$/))) {
    const q = splitTop(m[1], " for each person in ", true);
    if (q) return ["sum", p(q[1]), p(q[0])];
  }
  if ((m = s.match(/^the number of months in (.+) for which (.+)$/))) {
    return ["count_months", p(m[1]), p(m[2])];
  }
  const groups: Array<Array<[string, string]>> = [
    [[" plus ", "+"], [" minus ", "-"]],
    [[" times ", "*"], [" divided by ", "/"]],
  ];
  for (const group of groups) {
    let best: [string, string, string] | null = null;
    for (const [phrase, op] of group) {
      const q = splitTop(s, phrase, true);
      if (q && (!best || q[0].length > best[0].length)) best = [q[0], q[1], op];
    }
    if (best) return flattenArith([best[2], p(best[0]), p(best[1])]);
  }
  if ((m = s.match(/^the month containing (.+)$/))) return ["month_of", p(m[1])];
  if ((m = s.match(/^the month before (.+)$/))) return ["month_before", p(m[1])];
  if ((m = s.match(/^(.+?) months after (.+)$/))) return ["months_after", p(m[1]), p(m[2])];
  if ((m = s.match(/^(.+?) months before (.+)$/))) return ["months_before", p(m[1]), p(m[2])];
  if ((m = s.match(/^the month after (.+)$/))) return ["month_after", p(m[1])];
  if ((m = s.match(/^the first day of (.+)$/))) return ["first_day", p(m[1])];
  if ((m = s.match(/^the (.+?) consecutive months ending with (.+)$/))) {
    return ["months_ending", p(m[1]), p(m[2])];
  }
  if ((m = s.match(/^the months from (.+) through (.+)$/))) {
    return ["months_from_to", p(m[1]), p(m[2])];
  }
  if ((sp = splitTop(s, " averaged over "))) return ["avg", p(sp[0]), p(sp[1])];
  if ((m = s.match(/^this person is a (.+) of (.+)$/))) {
    return ["rel", m[1].split(" or ").map((x) => x.trim()), p(m[2])];
  }
  if ((m = s.match(/^that person's (.+)$/))) {
    const n = resolveName(ix, m[1]);
    if (!n) throw new Error(`unknown fact "${m[1]}"`);
    return ["of", ["P"], n];
  }
  if ((sp = splitTop(s, " is in "))) return ["in_group", p(sp[0]), p(sp[1])];
  if ((sp = splitTop(s, ", for ", true))) {
    const at = parseAt(ix, sp[0], options);
    if (at) return ["lookup", at, p(sp[1])];
    const tbl = resolveName(ix, sp[0]);
    if (tbl) return ["lookup", tbl, p(sp[1])];
  }
  const at = parseAt(ix, s, options);
  if (at) return at;
  if (ix.enumOptions.has(s) || options.includes(s)) return s;
  if (/^"[^"]*"$/.test(s)) return s.slice(1, -1);
  throw new Error(`cannot read "${s}"`);
}

function groupChildren(lines: Line[], parentIndent: number): Line[][] {
  const groups: Line[][] = [];
  let cur: Line[] | null = null;
  for (const ln of lines) {
    if (ln.indent <= parentIndent) throw new Error(`bad indentation at "${ln.text.trim()}"`);
    if (ln.text.trim().startsWith("- ") && (cur === null || ln.indent === cur[0].indent)) {
      cur = [ln];
      groups.push(cur);
    } else {
      if (!cur) throw new Error(`expected "- " item, got "${ln.text.trim()}"`);
      cur.push(ln);
    }
  }
  return groups;
}

function parseBlockLines(ix: LedgerIndex, lines: Line[], options: readonly string[]): Expr {
  if (!lines.length) throw new Error("empty block");
  const first = lines[0];
  const rest = lines.slice(1);
  const txt = first.text.trim();
  const p = (x: string) => parseInline(ix, x, options);
  if (txt === "all of the following are true:" || txt === "any of the following is true:") {
    const op = txt.startsWith("all") ? "all" : "any";
    const items = groupChildren(rest, first.indent).map((ch) => {
      ch[0] = { indent: ch[0].indent, text: ch[0].text.replace(/^\s*-\s*/, "") };
      return parseBlockLines(ix, ch, options);
    });
    if (!items.length) throw new Error(`${txt} has no items`);
    return [op, ...items];
  }
  let m: RegExpMatchArray | null;
  if ((m = txt.match(/^there is a person in (.+) such that$/))) {
    if (!rest.length) throw new Error("such that: missing condition");
    return ["exists", p(m[1]), parseBlockLines(ix, rest, options)];
  }
  if ((m = txt.match(/^there is a person of whom this person is a (.+) such that$/))) {
    const rels = m[1]
      .replace(/, or /g, ", ").replace(/ or /g, ", ")
      .split(",").map((x) => x.trim()).filter(Boolean);
    return ["exists_related", rels, parseBlockLines(ix, rest, options)];
  }
  if ((m = txt.match(/^the persons joined to this person by (.+) such that$/))) {
    if (!rest.length) throw new Error("such that: missing condition");
    const roles = m[1].split(" or ").map((x) => x.trim());
    return ["reachable", roles, parseBlockLines(ix, rest, options)];
  }
  if ((m = txt.match(/^all persons in (.+) such that$/))) {
    if (!rest.length) throw new Error("such that: missing condition");
    return ["filter", p(m[1]), parseBlockLines(ix, rest, options)];
  }
  if ((m = txt.match(/^the sum for each person in (.+) of$/))) {
    if (!rest.length) throw new Error("the sum: missing value");
    return ["sum", p(m[1]), parseBlockLines(ix, rest, options)];
  }
  if ((m = txt.match(/^in each of (.+):$/))) {
    return ["each", p(m[1]), parseBlockLines(ix, rest, options)];
  }
  if ((m = txt.match(/^in at least one of (.+):$/))) {
    return ["some_month", p(m[1]), parseBlockLines(ix, rest, options)];
  }
  if (txt.startsWith("if ")) {
    const arms: any[] = ["case"];
    let i = 0;
    const all = lines;
    while (i < all.length) {
      const t = all[i].text.trim();
      if (t.startsWith("if ") || t.startsWith("else if ")) {
        const cond = t.replace(/^(else )?if /, "");
        let j = i + 1;
        const condLines: Line[] = [{ indent: all[i].indent, text: cond }];
        while (
          j < all.length &&
          !all[j].text.trim().startsWith("then ") &&
          !all[j].text.trim().startsWith("otherwise ")
        ) { condLines.push(all[j]); j++; }
        if (j >= all.length || !all[j].text.trim().startsWith("then ")) {
          throw new Error(`"${cond}" has no "then"`);
        }
        const val = all[j].text.trim().slice(5);
        arms.push([
          condLines.length === 1
            ? parseInline(ix, condLines[0].text, options)
            : parseBlockLines(ix, condLines, options),
          p(val),
        ]);
        i = j + 1;
      } else if (t.startsWith("otherwise ")) {
        arms.push(["else", p(t.slice(10))]);
        i++;
      } else {
        throw new Error(`unexpected line in case: "${t}"`);
      }
    }
    return arms;
  }
  if (rest.length) throw new Error(`unexpected continuation after "${txt}"`);
  return p(txt);
}

export function parseDerivation(
  ix: LedgerIndex, text: string, options: readonly string[] = [],
): Expr {
  const lines: Line[] = text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => ({ indent: (l.match(/^\s*/) as RegExpMatchArray)[0].length, text: l }));
  return parseBlockLines(ix, lines, options);
}
