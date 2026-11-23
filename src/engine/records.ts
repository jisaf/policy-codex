/* Receipt records (docs/operators.md "Receipt records"; product-owner
 * decision of 2026-11-23, the recorded exception to the engine guardrail).
 *
 * A supplied fact of type `list of receipts` holds a list of records, one per
 * payment or stream of like payments, each a mapping of field -> value. The
 * fields, their types, and what an unstated field means are declared once on
 * the fact (`record_fields`): `required: true` (a rule that reads it cannot
 * determine), a `default` the rule text gives, or `when_absent` (what leaving
 * it out means, for a field an operator gives that meaning to); a default may
 * be qualified `required_if_dated` (the default holds for a record with no
 * date, and a dated record must state the field). This module
 * holds what the evaluator, the type check, the constraint check, the case
 * check and the export share: the schema rules, a record's effective month,
 * the name a missing field is reported under, and the validation of a stated
 * list against its schema. */
import { BASE, DATE_RE, MONTH_RE, type BaseType, type Item, type RecordFieldSpec } from "./types";

/** The item types a list-of-records fact may have. */
export const RECORD_LIST_TYPES: ReadonlySet<string> = new Set(["list of receipts"]);

/** Field types a record field may have: the scalar codex types, and a
 *  person of the case (`person`: the person's id in the case, compared with
 *  that person, ["P"]; coverage pass 4 for SNAP resources, SR-1: a funeral
 *  agreement or burial space names the member it is for). */
export const RECORD_FIELD_TYPES: readonly string[] = [
  "yes/no", "whole number", "money", "hours", "rate", "calendar date", "month", "text", "one of", "person",
];

export function isRecordList(it: Pick<Item, "type"> | undefined | null): boolean {
  return !!it && RECORD_LIST_TYPES.has(it.type);
}

/** What a list's records are called (Item.record_noun), and the field each
 *  record's worth is stated in: a receipt's `amount`, a holding's `value`
 *  (resource records, step H0, docs/design-earned-and-resource-records.md
 *  3.1 and 3.4). The noun is parse and render only ("for each holding in",
 *  "that holding's value", "that holding is valued in"); the operators read
 *  every list alike. */
export const RECORD_NOUNS: Readonly<Record<string, { measure: string; placed: string }>> = {
  receipt: { measure: "amount", placed: "is received in" },
  holding: { measure: "value", placed: "is valued in" },
};

/** The noun of a list of records: its record_noun, else receipt. */
export function recordNounOf(it: Pick<Item, "record_noun"> | undefined | null): string {
  return it?.record_noun ?? "receipt";
}

/** The base type a record field reads as. */
export function fieldBaseType(spec: RecordFieldSpec | undefined): BaseType {
  if (!spec) return "unknown";
  return BASE[spec.type] ?? "unknown";
}

/** The name a record field is reported under when a rule needs it and the
 *  record does not state it (the trace's missing supplied fact, the
 *  conformance suite's `missing`, the app's "cannot determine" list):
 *  `<list>[<index> <kind>].<field>`, e.g. `receipts[0 other_one_time].date`.
 *  The index is the record's place in the stated list, from 0. */
export function recordFieldName(list: string, index: number, kind: unknown, field: string): string {
  const k = kind === undefined || kind === null ? "?" : String(kind);
  return `${list}[${index} ${k}].${field}`;
}

/** Reads back `recordFieldName`; null when the name is not one. */
export function parseRecordFieldName(name: string): { list: string; index: number; kind: string; field: string } | null {
  const m = /^([a-z][a-z0-9_]*)\[(\d+) ([^\]]+)\]\.([a-z][a-z0-9_]*)$/.exec(name);
  return m ? { list: m[1], index: Number(m[2]), kind: m[3], field: m[4] } : null;
}

/** The month a record is received in: its `month`, or the month of its
 *  `date`; undefined when it states neither. */
export function recordMonth(r: Record<string, unknown>): string | undefined {
  const m = r.month;
  if (typeof m === "string" && m) return m;
  const d = r.date;
  if (typeof d === "string" && DATE_RE.test(d)) return d.slice(0, 7);
  return undefined;
}

function typeOk(spec: RecordFieldSpec, v: unknown): boolean {
  switch (spec.type) {
    case "yes/no": return typeof v === "boolean";
    case "whole number": return typeof v === "number" && Number.isInteger(v);
    case "money": case "hours": case "rate": return typeof v === "number" && Number.isFinite(v);
    case "calendar date": return typeof v === "string" && DATE_RE.test(v);
    case "month": return typeof v === "string" && MONTH_RE.test(v);
    case "text": case "person": return typeof v === "string";
    case "one of": return typeof v === "string" && (spec.options ?? []).includes(v);
    default: return false;
  }
}

/** What is wrong with a record schema, one line each; empty when it is
 *  well formed. Read by the constraint check on the item that declares it. */
export function schemaErrors(it: Item): string[] {
  const out: string[] = [];
  const fields = it.record_fields;
  if (!isRecordList(it)) {
    if (fields) out.push(`record_fields is only for a list of records (type "list of receipts"), not "${it.type}"`);
    if (it.record_noun !== undefined) out.push(`record_noun is only for a list of records (type "list of receipts"), not "${it.type}"`);
    return out;
  }
  const noun = recordNounOf(it);
  const nounSpec = RECORD_NOUNS[noun];
  if (!nounSpec) out.push(`record_noun "${noun}" is not one of: ${Object.keys(RECORD_NOUNS).join(", ")}`);
  if (it.kind !== "supplied") out.push("a list of records is a supplied fact");
  if (it.scope !== "person") out.push("a list of records is stated per person (scope person)");
  if (!fields || typeof fields !== "object") {
    out.push("a list of records declares its record_fields");
    return out;
  }
  if (it.options && it.options.length) out.push("a list of records states its kinds in record_fields.kind.options, not options");
  const kind = fields.kind;
  if (!kind || kind.type !== "one of" || kind.required !== true) out.push('record_fields.kind is a required "one of" field');
  const measure = nounSpec?.measure ?? "amount";
  const amount = fields[measure];
  if (!amount || amount.type !== "money" || amount.required !== true) out.push(`record_fields.${measure} is a required money field`);
  for (const [name, spec] of Object.entries(fields)) {
    const at = `record_fields.${name}`;
    if (!/^[a-z][a-z0-9_]*$/.test(name)) out.push(`${at}: a field name is snake_case`);
    if (!spec || typeof spec !== "object") { out.push(`${at}: not a field declaration`); continue; }
    if (!RECORD_FIELD_TYPES.includes(spec.type)) out.push(`${at}: type "${spec.type}" is not a record field type`);
    if (!spec.meaning || String(spec.meaning).trim().length < 10) out.push(`${at}: states its meaning`);
    const modes = [spec.required === true, "default" in spec, typeof spec.when_absent === "string"].filter(Boolean).length;
    if (modes !== 1) {
      out.push(`${at}: states exactly one of required: true, a default, or when_absent (decision 4 of 2026-11-23)`);
    }
    if (spec.required !== undefined && spec.required !== true) out.push(`${at}: required is true or left out`);
    if (spec.required_if_dated !== undefined) {
      if (spec.required_if_dated !== true) out.push(`${at}: required_if_dated is true or left out`);
      else if (!("default" in spec)) out.push(`${at}: required_if_dated qualifies a default (the value of a record with no date)`);
      else if (name === "date" || !fields.date) out.push(`${at}: required_if_dated needs a date field to qualify`);
    }
    if (spec.type === "one of") {
      if (!spec.options || spec.options.length < 2) out.push(`${at}: a "one of" field lists at least two options`);
      else if (new Set(spec.options).size !== spec.options.length) out.push(`${at}: an option is listed twice`);
    } else if (spec.options) out.push(`${at}: only a "one of" field lists options`);
    if (spec.option_meanings !== undefined || name === "kind") {
      // Each kind says what it is, in one line, and only the kinds do.
      const om = spec.option_meanings ?? {};
      const missing = (spec.options ?? []).filter((o) => !(typeof om[o] === "string" && om[o].trim().length >= 10));
      const extra = Object.keys(om).filter((o) => !(spec.options ?? []).includes(o));
      if (missing.length) out.push(`${at}: option_meanings states no meaning for: ${missing.join(", ")}`);
      if (extra.length) out.push(`${at}: option_meanings names no option: ${extra.join(", ")}`);
    }
    if ("default" in spec && !typeOk(spec, spec.default)) {
      out.push(`${at}: default ${JSON.stringify(spec.default)} is not a ${spec.type}`);
    }
  }
  return out;
}

/** What is wrong with one stated list against its schema, one line each:
 *  a record that is not a mapping, a field the schema does not declare, a
 *  value of the wrong type or not among the options, a month that is not the
 *  month of the record's date. A field left out is never wrong here: a
 *  required field left out is how a household states that a value is not
 *  known, and the rule that reads it cannot determine. */
export function recordValueErrors(it: Item, value: unknown): string[] {
  const out: string[] = [];
  if (value === null || value === undefined) return out;
  if (!Array.isArray(value)) return [`${it.identifier}: a list of records is a list (got ${JSON.stringify(value)})`];
  const fields = it.record_fields ?? {};
  value.forEach((r, i) => {
    if (r === null || typeof r !== "object" || Array.isArray(r)) {
      out.push(`${it.identifier}[${i}]: a record is a mapping of field to value`);
      return;
    }
    const rec = r as Record<string, unknown>;
    const name = (f: string) => recordFieldName(it.identifier, i, rec.kind, f);
    for (const [f, v] of Object.entries(rec)) {
      const spec = fields[f];
      if (!spec) { out.push(`${name(f)}: no field "${f}" in the ${it.identifier} schema`); continue; }
      if (v === null || v === undefined) continue;
      if (!typeOk(spec, v)) {
        out.push(`${name(f)}: ${JSON.stringify(v)} is not ${spec.type === "one of" ? "one of its options" : "a " + spec.type}`);
      }
    }
    if (typeof rec.month === "string" && typeof rec.date === "string" && DATE_RE.test(rec.date) &&
      rec.date.slice(0, 7) !== rec.month) {
      out.push(`${name("month")}: month ${rec.month} is not the month of the date ${rec.date}`);
    }
  });
  return out;
}

/** Every stated list of records in a person's facts, as [identifier, value]. */
export function statedRecordLists(
  byIdentifier: ReadonlyMap<string, Item>, facts: Record<string, unknown> | undefined,
): Array<[Item, unknown]> {
  const out: Array<[Item, unknown]> = [];
  for (const [k, v] of Object.entries(facts ?? {})) {
    const it = byIdentifier.get(k);
    if (it && isRecordList(it)) out.push([it, v]);
  }
  return out;
}

/** Joint holdings (resource records, step H0; docs/design-earned-and-
 *  resource-records.md 3.2): a holding owned by several persons of a case is
 *  stated on each owner's list with the same `holding_id`, kind and value
 *  and that owner's `share`. Across the persons of one case, the records of
 *  one list that state the same holding_id (in the same month) must agree on
 *  kind and value, and their shares (1 where a record states none) must not
 *  add to more than 1: otherwise a couple's joint account is counted twice,
 *  or two holdings are read as one. Only for a list whose schema declares
 *  `holding_id`; one line per disagreement. */
export function jointRecordErrors(it: Item, lists: ReadonlyArray<readonly [string, unknown]>): string[] {
  const fields = it.record_fields ?? {};
  if (!fields.holding_id) return [];
  const measure = (RECORD_NOUNS[recordNounOf(it)] ?? RECORD_NOUNS.receipt).measure;
  const groups = new Map<string, Array<{ pid: string; index: number; rec: Record<string, unknown> }>>();
  for (const [pid, list] of lists) {
    if (!Array.isArray(list)) continue;
    list.forEach((r, index) => {
      if (r === null || typeof r !== "object" || Array.isArray(r)) return;
      const rec = r as Record<string, unknown>;
      if (typeof rec.holding_id !== "string" || !rec.holding_id) return;
      const key = `${rec.holding_id}|${recordMonth(rec) ?? ""}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({ pid, index, rec });
    });
  }
  const out: string[] = [];
  for (const [key, rs] of groups) {
    const [id, month] = key.split("|");
    const at = `${it.identifier} holding_id ${id}${month ? " in " + month : ""}`;
    const kinds = new Set(rs.map((x) => String(x.rec.kind)));
    if (kinds.size > 1) out.push(`${at}: its records disagree on kind (${[...kinds].join(", ")})`);
    const values = new Set(rs.map((x) => JSON.stringify(x.rec[measure] ?? null)));
    if (values.size > 1) out.push(`${at}: its records disagree on ${measure} (${rs.map((x) => `${x.pid}: ${JSON.stringify(x.rec[measure] ?? null)}`).join(", ")})`);
    const total = rs.reduce((a, x) => a + (typeof x.rec.share === "number" ? x.rec.share : 1), 0);
    if (total > 1 + 1e-9) out.push(`${at}: its shares add to ${Math.round(total * 1e6) / 1e6}, more than 1 (${rs.map((x) => `${x.pid}: ${typeof x.rec.share === "number" ? x.rec.share : "1 (not stated)"}`).join(", ")})`);
  }
  return out;
}

/** A record field of type `person` names a person of the case (its id in the
 *  case): one line per record whose person field names no person of the
 *  case or test (coverage pass 4 for SNAP resources, SR-1). */
export function personFieldErrors(
  it: Item, lists: ReadonlyArray<readonly [string, unknown]>, persons: readonly string[],
): string[] {
  const fields = Object.entries(it.record_fields ?? {}).filter(([, f]) => f?.type === "person").map(([k]) => k);
  if (!fields.length) return [];
  const out: string[] = [];
  for (const [pid, list] of lists) {
    if (!Array.isArray(list)) continue;
    list.forEach((r, i) => {
      if (r === null || typeof r !== "object" || Array.isArray(r)) return;
      const rec = r as Record<string, unknown>;
      for (const f of fields) {
        const v = rec[f];
        if (typeof v === "string" && !persons.includes(v)) {
          out.push(`${pid} ${recordFieldName(it.identifier, i, rec.kind, f)}: "${v}" is not a person of the case`);
        }
      }
    });
  }
  return out;
}
