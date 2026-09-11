import { BASE, type BaseType, type Item } from "./types";

export function baseType(it: { type?: string }): BaseType {
  return BASE[it.type ?? ""] ?? "unknown";
}

export function lit(v: unknown): string {
  if (v === true) return "yes";
  if (v === false) return "no";
  return String(v);
}

export function paramValue(it: Item): unknown {
  if (it.value !== undefined && it.value !== null) return it.value;
  if (it.versions && it.versions.length) return it.versions[it.versions.length - 1].value;
  return null;
}

export function fmt(v: unknown): string {
  if (v === null || v === undefined) return "unknown";
  if (v === true) return "yes";
  if (v === false) return "no";
  if (Array.isArray(v)) return "[" + v.map(fmt).join(", ") + "]";
  if (typeof v === "object") {
    return "{" + Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => k + ": " + fmt(x)).join(", ") + "}";
  }
  return String(v);
}

export function valuesEqual(got: unknown, exp: unknown): boolean {
  if (exp === "unknown") return got === null;
  if (got === null || got === undefined) return false;
  if (typeof exp === "number" || typeof got === "number") {
    return Math.abs(Number(got) - Number(exp)) < 1e-9;
  }
  if (Array.isArray(exp)) return JSON.stringify(got) === JSON.stringify(exp);
  return got === exp;
}

export function slug(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/^(medicaid|snap): /, "$1_")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}
