import type { LedgerIndex } from "./ledger-index";
import { block } from "./render";
import { parseDerivation } from "./parse";
import { lit, paramValue } from "./values";
import type { ApprovalRecord, Expr, Item, ItemVersion, TestSpec, VolumeMeta } from "./types";

export const FIELD_W = 14;

export interface ItemBlockExtra { uses?: string[]; approval?: string[]; status?: string }

export const STATUSES: ReadonlyArray<NonNullable<Item["status"]>> = ["Draft", "Reviewed", "Approved"];

/** One signature as the block writes it: "Role: by, date, commit", with
 *  `by` and `commit` optional ("Legal: 2026-11-21"). */
export function formatApproval(a: ApprovalRecord): string {
  return `${a.role}: ${[a.by, a.date, a.commit].filter(Boolean).join(", ")}`;
}

/** Reads `formatApproval` back. Signatures are separated by ";". */
export function parseApprovals(val: string): ApprovalRecord[] {
  const out: ApprovalRecord[] = [];
  for (const part of val.split(";").map((x) => x.trim()).filter(Boolean)) {
    const colon = part.lastIndexOf(":");
    if (colon <= 0) throw new Error(`Approval must read "Role: name, YYYY-MM-DD": "${part}"`);
    const role = part.slice(0, colon).trim();
    const bits = part.slice(colon + 1).split(",").map((x) => x.trim()).filter(Boolean);
    const di = bits.findIndex((b) => /^\d{4}-\d{2}-\d{2}$/.test(b));
    if (di < 0) throw new Error(`Approval for "${role}" needs a date, YYYY-MM-DD`);
    const rec: ApprovalRecord = { role, date: bits[di] };
    const by = bits.slice(0, di).join(", ");
    if (by) rec.by = by;
    if (bits[di + 1]) rec.commit = bits[di + 1];
    out.push(rec);
  }
  return out;
}

/** The programs a volume declares (volume.yaml `programs`), or the three the
 *  first volume used before programs were declared. */
export function declaredPrograms(meta: Pick<VolumeMeta, "programs"> | null): string[] {
  const ids = meta?.programs?.map((p) => p.id) ?? [];
  return ids.length ? ids : ["All", "Medicaid", "SNAP"];
}

/** A parameter's single value as the block's Value line: a table as JSON, so
 *  it reads back as the same table rather than the word "table". */
function valueText(v: unknown): string {
  if (v !== null && typeof v === "object") return JSON.stringify(v);
  return lit(v);
}
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
  if (it.statute_override) f("Override", it.statute_override);
  if (it.kind === "supplied") f("Supplied by", it.supplied_by || "");
  if (it.kind === "parameter") f("Value", valueText(paramValue(it)));
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
  if (extra?.uses) f("Uses", extra.uses.join(", "));
  // Status and the signatures are the item's own fields: written here and
  // read back, so an approver's edit to either is kept (HCPF analyst F1).
  // An item that never stated a status is Draft; the line appears once one
  // is stated, and typing it in is how a status is set.
  const status = extra?.status ?? it.status;
  if (status) f("Status", status);
  if (it.approval && it.approval.length) f("Approval", it.approval.map(formatApproval).join("; "));
  return L.join("\n");
}

/** The draft an edited block stands for: the draft's own fields (the block
 *  does not carry them all: versions, rationale, nearest, ...) overlaid with
 *  what the block parsed to. Three fields need care:
 *  - a parameter set by dated periods (`versions`) shows its latest period's
 *    value on the Value line. An edit there changes that period's value (an
 *    edited version), never a flat `value` that the dated periods would
 *    shadow: the CDHS cash lead's +2% chart was dropped as "no change"
 *    (retest section 2). A new period is added with `addVersion` (the form's
 *    "Add a new dated period");
 *  - Status "Draft" on an item that never stated a status is the default,
 *    not an edit;
 *  - an Approval line removed from the block removes the signatures. */
export function mergeBlock(draft: Item, parsed: Item): Item {
  const p: Partial<Item> = { ...parsed };
  if (Array.isArray(draft.versions) && draft.kind === "parameter") {
    const vs = draft.versions;
    if (p.value !== undefined && vs.length && !sameValue(p.value, vs[vs.length - 1].value)) {
      p.versions = vs.map((v, i) => (i === vs.length - 1 ? { ...v, value: p.value } : v));
    }
    delete p.value;
  }
  if (p.status === "Draft" && draft.status === undefined) delete p.status;
  const out: Item = { ...draft, ...p };
  if (parsed.approval === undefined) delete out.approval;
  return out;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Why a block's Value line cannot be kept, or null: a parameter set by
 *  dated periods that has none yet has no date for a value to start from, so
 *  the editor refuses the line rather than dropping it. */
export function valueEditIssue(draft: Item, parsed: Item): string | null {
  if (draft.kind !== "parameter" || !Array.isArray(draft.versions) || draft.versions.length) return null;
  if (parsed.value === undefined || parsed.value === null || parsed.value === "null" || parsed.value === "") return null;
  return "Value: this figure is set by dated periods and has none yet, so a value needs a start date. Use \"Add a new dated period\" (Advanced, Form).";
}

/** A value as typed in a field: a number, yes/no, a table or list as JSON, or
 *  text. */
export function parseValueText(raw: string): { value: unknown } | { error: string } {
  const val = raw.trim();
  if (/^[{[]/.test(val)) {
    try { return { value: JSON.parse(val) }; } catch {
      return { error: "a table must be written as JSON, e.g. {\"1\": 100}" };
    }
  }
  if (/^-?\d+(\.\d+)?$/.test(val)) return { value: Number(val) };
  if (val === "yes") return { value: true };
  if (val === "no") return { value: false };
  return { value: val };
}

/** A new dated period for a parameter: in force from `from` (YYYY-MM-DD)
 *  with `value`, citing `source` when given. The period that was running on
 *  that date ends the day before (its `to` becomes `from`, the first day it is
 *  not in force); a later period, if any, ends the new one. Returns the edited
 *  item, or a reason it cannot be added. */
export function addVersion(
  it: Item, v: { from: string; value: unknown; source?: string },
): Item | string {
  if (it.kind !== "parameter") return "Only a figure set by policy has dated periods.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.from)) return "The period needs a start date, YYYY-MM-DD.";
  if (v.value === undefined || v.value === null || v.value === "") return "The period needs a value.";
  const vs = [...(it.versions ?? [])].sort((a, b) => a.from.localeCompare(b.from));
  if (vs.some((x) => x.from === v.from)) return `A period from ${v.from} already exists; change its value instead.`;
  const next = vs.find((x) => x.from > v.from);
  const added: ItemVersion = { from: v.from, value: v.value };
  if (next) added.to = next.from;
  if (v.source && v.source.trim()) added.source = v.source.trim();
  const out = vs.map((x) => {
    if (x.from < v.from && (x.to === undefined || x.to > v.from)) return { ...x, to: v.from };
    return x;
  });
  out.push(added);
  out.sort((a, b) => a.from.localeCompare(b.from));
  const copy: Item = { ...it, versions: out };
  // A flat value would be shadowed by the periods: a figure moving to dated
  // periods keeps its old value as the period before, when it had one.
  if (copy.value !== undefined && copy.value !== null && !(it.versions ?? []).length) {
    const start = it.effective?.from && it.effective.from < v.from ? it.effective.from : "1900-01-01";
    out.unshift({ from: start, to: v.from, value: copy.value });
    delete copy.value;
  }
  return copy;
}

/** The parameter with one period's value replaced. */
export function setVersionValue(it: Item, index: number, value: unknown): Item {
  const vs = (it.versions ?? []).map((v, i) => (i === index ? { ...v, value } : v));
  return { ...it, versions: vs };
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
          {
            const programs = declaredPrograms(meta);
            if (!programs.includes(val)) {
              errors.push({
                line: i + 1,
                msg: `Program must be one of the volume's programs: ${programs.join(", ")}`,
              });
            }
          }
          break;
        case "Role": it.role = val; break;
        case "Meaning": it.meaning = val; break;
        case "Precision": it.precision = val; break;
        case "Assumption": it.assumption = val; break;
        case "Override": it.statute_override = val; break;
        case "Supplied by": it.supplied_by = val; break;
        case "Value":
          if (/^[{[]/.test(val)) {
            try {
              it.value = JSON.parse(val);
            } catch {
              errors.push({ line: i + 1, msg: "Value: a table must be written as JSON, e.g. {\"1\": 100}" });
            }
          } else {
            it.value = /^-?\d+(\.\d+)?$/.test(val) ? Number(val)
              : val === "yes" ? true : val === "no" ? false : val;
          }
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
        case "Status":
          if (!(STATUSES as readonly string[]).includes(val)) {
            errors.push({ line: i + 1, msg: `Status must be ${STATUSES.join(", ")}` });
          } else it.status = val as Item["status"];
          break;
        case "Approval":
          it.approval = parseApprovals(val);
          break;
        case "Uses": break; // computed, ignored on read

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
