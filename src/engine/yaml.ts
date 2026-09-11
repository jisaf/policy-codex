import { parse as parseYaml } from "yaml";
import { DATE_RE, MONTH_RE, type Item, type VolumeMeta } from "./types";

export const ITEM_KEY_ORDER: readonly string[] = [
  "id", "name", "identifier", "kind", "type", "options", "scope", "program", "role",
  "meaning", "precision", "assumption", "supplied_by", "value", "versions", "derived",
  "sources", "effective", "implemented", "tags", "open", "tests",
];

const FLOW_KEYS = new Set(["options", "derived", "sources", "effective", "tags", "open"]);
const SEQ_OF_FLOW_KEYS = new Set(["versions", "tests"]);
/** Key order of a test row as the ledger files write it; a parsed example
 *  line arrives in a different order and must serialise identically. */
const TEST_KEY_ORDER = ["id", "month", "as_of", "parameters", "given"];

function orderTestRow(row: unknown): unknown {
  if (row === null || typeof row !== "object" || Array.isArray(row)) return row;
  const rec = row as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of TEST_KEY_ORDER) if (k in rec) out[k] = rec[k];
  for (const [k, v] of Object.entries(rec)) if (!(k in out)) out[k] = v;
  return out;
}

const PLAIN_UNSAFE = /^\s|\s$|^[-?:,[\]{}#&*!|>'"%@`]|: |\s#|\n/;
const RESERVED = /^(true|false|null|yes|no|on|off|~)$/i;
const NUMERIC = /^-?\d+(\.\d+)?$/;
/** Safe unquoted inside a flow collection: no comma, bracket, or brace ambiguity. */
const FLOW_PLAIN = /^[A-Za-z][A-Za-z0-9_.-]*$/;

/** A scalar for block context (`key: value` on its own line). */
export function yamlScalar(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  const s = String(v);
  if (
    s === "" || PLAIN_UNSAFE.test(s) || RESERVED.test(s) ||
    NUMERIC.test(s) || DATE_RE.test(s) || MONTH_RE.test(s)
  ) return JSON.stringify(s);
  return s;
}

/** A scalar for flow context (inside `[...]` or `{...}`). */
export function flowScalar(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  const s = String(v);
  return FLOW_PLAIN.test(s) && !RESERVED.test(s) ? s : JSON.stringify(s);
}

export function flowValue(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(flowValue).join(", ") + "]";
  if (v !== null && typeof v === "object") {
    return "{" + Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${flowScalar(k)}: ${flowValue(x)}`).join(", ") + "}";
  }
  return flowScalar(v);
}

export function stringifyItem(it: Item): string {
  const rec = it as unknown as Record<string, unknown>;
  const lines: string[] = [];
  for (const key of ITEM_KEY_ORDER) {
    const v = rec[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0 && key !== "sources") continue;
    if (SEQ_OF_FLOW_KEYS.has(key)) {
      lines.push(`${key}:`);
      for (const entry of v as unknown[]) {
        lines.push("  - " + flowValue(key === "tests" ? orderTestRow(entry) : entry));
      }
    } else if (FLOW_KEYS.has(key)) {
      lines.push(`${key}: ${flowValue(v)}`);
    } else {
      lines.push(`${key}: ${yamlScalar(v)}`);
    }
  }
  return lines.join("\n") + "\n";
}

function stripEmpty(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0 && k !== "sources") continue;
    out[k] = v;
  }
  return out;
}

export function parseItemFile(text: string): Item {
  const raw = parseYaml(text) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") throw new Error("item file is not a YAML mapping");
  const ordered: Record<string, unknown> = {};
  for (const key of ITEM_KEY_ORDER) if (key in raw) ordered[key] = raw[key];
  for (const key of Object.keys(raw)) {
    if (!(key in ordered)) throw new Error(`unknown item field "${key}"`);
  }
  return stripEmpty(ordered) as unknown as Item;
}

export function parseVolumeFile(text: string): VolumeMeta {
  const raw = parseYaml(text) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") throw new Error("volume file is not a YAML mapping");
  return raw as unknown as VolumeMeta;
}

export function stringifyVolume(meta: VolumeMeta): string {
  const L: string[] = [];
  L.push(`volume: ${yamlScalar(meta.volume)}`);
  L.push(`title: ${yamlScalar(meta.title)}`);
  L.push(`version: ${yamlScalar(meta.version)}`);
  L.push(`status: ${yamlScalar(meta.status)}`);
  L.push(`default_as_of: ${yamlScalar(meta.default_as_of)}`);
  L.push("");
  L.push("approval_policy:");
  L.push("  roles:");
  for (const r of meta.approval_policy.roles) L.push(`    - ${yamlScalar(r)}`);
  for (const group of ["by_program", "by_kind", "by_tag"] as const) {
    L.push(`  ${group}:`);
    for (const [k, v] of Object.entries(meta.approval_policy[group])) {
      L.push(`    ${flowScalar(k)}: ${flowValue(v)}`);
    }
  }
  L.push("");
  L.push("types:");
  for (const t of meta.types) L.push(`  - ${yamlScalar(t)}`);
  L.push("");
  L.push(`scopes: ${flowValue(meta.scopes)}`);
  return L.join("\n") + "\n";
}
