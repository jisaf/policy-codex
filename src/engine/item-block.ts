import type { LedgerIndex } from "./ledger-index";
import { block } from "./render";
import { parseDerivation } from "./parse";
import { lit, paramValue } from "./values";
import type { Expr, Item, TestSpec, VolumeMeta } from "./types";

export const FIELD_W = 14;

export interface ItemBlockExtra { uses?: string[]; approval?: string[]; status?: string }
export interface BlockError { line: number; msg: string }
export interface ParsedItemBlock { item: Item; errors: BlockError[] }

export function itemBlock(ix: LedgerIndex, it: Item, extra?: ItemBlockExtra): string {
  const L: string[] = [];
  const f = (k: string, v: string) => L.push(k.padEnd(FIELD_W) + v);
  f("ID", it.id || "");
  f("Fact", it.name || "");
  f("Identifier", it.identifier || "");
  f("Kind", it.kind ? it.kind[0].toUpperCase() + it.kind.slice(1) : "");
  f("Type", (it.type || "") + (it.options && it.options.length ? ": " + it.options.join(", ") : ""));
  f("Scope", it.scope || "");
  f("Program", it.program || "");
  if (it.role) f("Role", it.role);
  f("Meaning", it.meaning || "");
  if (it.precision) f("Precision", it.precision);
  if (it.assumption) f("Assumption", it.assumption);
  if (it.kind === "supplied") f("Supplied by", it.supplied_by || "");
  if (it.kind === "parameter") f("Value", lit(paramValue(it)));
  if (it.kind === "derived") {
    let lines: string[];
    try {
      lines = it.derived ? block(ix, it.derived) : ["(empty)"];
    } catch (e) {
      lines = ["(invalid: " + (e as Error).message + ")"];
    }
    f("Derived as", lines[0]);
    for (const l of lines.slice(1)) L.push(" ".repeat(FIELD_W) + l);
  }
  if (it.sources && it.sources.length) f("Source", it.sources.join(", "));
  if (it.effective) f("Effective", `${it.effective.from} to ${it.effective.to}`);
  if (it.kind === "derived") {
    f("Implemented", it.implemented === "assembly" ? "Fact assembly"
      : it.implemented === "engine" ? "Determination engine" : "");
  }
  if (it.tags && it.tags.length) f("Tags", it.tags.join(", "));
  if (it.tests && it.tests.length) {
    L.push("Examples");
    for (const t of it.tests) L.push("  " + formatTest(t));
  }
  if (it.open && it.open.length) f("Open", it.open.join(", "));
  if (extra) {
    if (extra.uses) f("Uses", extra.uses.join(", "));
    if (extra.approval) f("Approval", extra.approval.join(", "));
    if (extra.status) f("Status", extra.status);
  }
  return L.join("\n");
}

export function formatTest(t: TestSpec): string {
  const bits: string[] = [];
  if (t.as_of) bits.push("as of " + t.as_of);
  if (t.month) bits.push("month " + t.month);
  if (t.parameters) bits.push("parameters " + JSON.stringify(t.parameters));
  for (const [k, v] of Object.entries(t.given || {})) bits.push(k + "=" + JSON.stringify(v));
  if (t.relationships) bits.push("relationships " + JSON.stringify(t.relationships));
  if (t.others) bits.push("others " + JSON.stringify(t.others));
  if (t.month_defaults) bits.push("other months " + JSON.stringify(t.month_defaults));
  const exp =
    "expect_length" in t
      ? `${t.expect_length} months, ${t.expect_first} through ${t.expect_last}`
      : JSON.stringify(t.expect === undefined ? null : t.expect).replace(/^"unknown"$/, "unknown");
  return `${t.id || "T"}: given ${bits.join("; ")} => ${exp}`;
}

export function parseTestLine(ix: LedgerIndex, line: string): TestSpec {
  const m = line.trim().match(/^([^:]+):\s*given\s*(.*?)\s*=>\s*(.+)$/);
  if (!m) {
    throw new Error(
      `example line must look like "T1: given a=1; b=2 => yes": "${line.trim()}"`,
    );
  }
  const t: TestSpec = { id: m[1].trim(), given: {} };
  const parseVal = (v: string): unknown => {
    v = v.trim();
    if (v === "yes") return true;
    if (v === "no") return false;
    if (v === "unknown") return "unknown";
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    try { return JSON.parse(v); } catch { return v.replace(/^"|"$/g, ""); }
  };
  for (const bit of m[2].split(";").map((x) => x.trim()).filter(Boolean)) {
    let mm: RegExpMatchArray | null;
    if ((mm = bit.match(/^as of (\S+)$/))) t.as_of = mm[1];
    else if ((mm = bit.match(/^month (\S+)$/))) t.month = mm[1];
    else if ((mm = bit.match(/^parameters (.+)$/))) t.parameters = JSON.parse(mm[1]);
    else if ((mm = bit.match(/^relationships (.+)$/))) t.relationships = JSON.parse(mm[1]);
    else if ((mm = bit.match(/^others (.+)$/))) t.others = JSON.parse(mm[1]);
    else if ((mm = bit.match(/^other months (.+)$/))) t.month_defaults = JSON.parse(mm[1]);
    else if ((mm = bit.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/))) {
      if (!ix.byIdentifier.has(mm[1])) throw new Error(`example uses unknown fact "${mm[1]}"`);
      t.given![mm[1]] = parseVal(mm[2]);
    } else throw new Error(`cannot read example part "${bit}"`);
  }
  const ex = m[3].trim();
  const lm = ex.match(/^(\d+) months, (\S+) through (\S+)$/);
  if (lm) {
    t.expect_length = +lm[1];
    t.expect_first = lm[2];
    t.expect_last = lm[3];
  } else t.expect = parseVal(ex);
  return t;
}

export function parseItemBlock(
  ix: LedgerIndex, meta: VolumeMeta | null, text: string,
): ParsedItemBlock {
  const errors: BlockError[] = [];
  const it = { tags: [], sources: [], open: [], tests: [] } as unknown as Item;
  const lines = text.split("\n");
  let i = 0;
  let options: string[] = [];
  const fieldAt = (k: number) => (lines[k].startsWith(" ") ? "" : lines[k].slice(0, FIELD_W).trim());
  while (i < lines.length) {
    const raw = lines[i];
    if (!raw.trim()) { i++; continue; }
    const key = fieldAt(i);
    const val = raw.slice(FIELD_W).trim();
    if (raw.startsWith(" ")) {
      errors.push({ line: i + 1, msg: "indented line outside a multi-line field" });
      i++;
      continue;
    }
    try {
      switch (key) {
        case "ID": it.id = val; break;
        case "Fact": it.name = val; break;
        case "Identifier":
          it.identifier = val;
          if (!/^[a-z][a-z0-9_]*$/.test(val)) {
            errors.push({ line: i + 1, msg: "identifier must be snake_case" });
          }
          break;
        case "Kind":
          it.kind = val.toLowerCase() as Item["kind"];
          if (!["supplied", "derived", "parameter"].includes(it.kind)) {
            errors.push({ line: i + 1, msg: "Kind must be Supplied, Derived, or Parameter" });
          }
          break;
        case "Type": {
          const [ty, opts] = val.split(":");
          it.type = ty.trim();
          if (opts) it.options = opts.split(",").map((x) => x.trim()).filter(Boolean);
          options = it.options || [];
          if (meta && !meta.types.includes(it.type)) {
            errors.push({ line: i + 1, msg: `unknown type "${it.type}"` });
          }
          break;
        }
        case "Scope":
          it.scope = val as Item["scope"];
          if (meta && !meta.scopes.includes(it.scope)) {
            errors.push({ line: i + 1, msg: `scope must be one of ${meta.scopes.join(", ")}` });
          }
          break;
        case "Program":
          it.program = val as Item["program"];
          if (!["All", "Medicaid", "SNAP"].includes(val)) {
            errors.push({ line: i + 1, msg: "Program must be All, Medicaid, or SNAP" });
          }
          break;
        case "Role": it.role = val; break;
        case "Meaning": it.meaning = val; break;
        case "Precision": it.precision = val; break;
        case "Assumption": it.assumption = val; break;
        case "Supplied by": it.supplied_by = val; break;
        case "Value":
          it.value = /^-?\d+(\.\d+)?$/.test(val) ? Number(val)
            : val === "yes" ? true : val === "no" ? false : val;
          break;
        case "Derived as": {
          const dl = [val];
          let j = i + 1;
          while (j < lines.length && lines[j].startsWith(" ".repeat(FIELD_W))) {
            dl.push(lines[j].slice(FIELD_W));
            j++;
          }
          it.derived_text = dl.join("\n");
          try {
            it.derived = parseDerivation(ix, it.derived_text, options);
          } catch (e) {
            errors.push({ line: i + 1, msg: "Derived as: " + (e as Error).message });
          }
          i = j - 1;
          break;
        }
        case "Source":
          it.sources = val.split(",").map((x) => x.trim().split(" ")[0]).filter(Boolean);
          break;
        case "Effective": {
          const mm = val.match(/^(\S+) to (\S+)$/);
          if (mm) it.effective = { from: mm[1], to: mm[2] };
          else errors.push({ line: i + 1, msg: 'Effective must read "<date> to <date|present>"' });
          break;
        }
        case "Implemented":
          it.implemented = /assembly/i.test(val) ? "assembly" : /engine/i.test(val) ? "engine" : null;
          if (!it.implemented) {
            errors.push({
              line: i + 1, msg: "Implemented must be Fact assembly or Determination engine",
            });
          }
          break;
        case "Tags": it.tags = val.split(",").map((x) => x.trim()).filter(Boolean); break;
        case "Examples": {
          let j = i + 1;
          while (j < lines.length && lines[j].startsWith("  ") && lines[j].trim()) {
            try {
              it.tests!.push(parseTestLine(ix, lines[j]));
            } catch (e) {
              errors.push({ line: j + 1, msg: (e as Error).message });
            }
            j++;
          }
          i = j - 1;
          break;
        }
        case "Open": it.open = val.split(",").map((x) => x.trim()).filter(Boolean); break;
        case "Uses": case "Approval": case "Status": break; // computed, ignored on read
        default:
          errors.push({ line: i + 1, msg: `unknown field "${key || raw.trim()}"` });
      }
    } catch (e) {
      errors.push({ line: i + 1, msg: (e as Error).message });
    }
    i++;
  }
  return { item: it, errors };
}

export type { Expr };
