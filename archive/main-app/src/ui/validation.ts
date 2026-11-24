import type { Engine } from "../engine/engine";

export interface ValidationSummary {
  errors: number;
  warnings: number;
  messages: string[];
}

const cache = new WeakMap<Engine, Map<string, ValidationSummary>>();

/** Constraint summary for every item, computed once per engine instance.
 *  Running the full constraint set includes evaluating every rule test, so
 *  this must not be recomputed on each render. */
export function validationMap(engine: Engine): Map<string, ValidationSummary> {
  const hit = cache.get(engine);
  if (hit) return hit;
  const out = new Map<string, ValidationSummary>();
  for (const it of engine.items()) {
    const report = engine.constraints(it);
    out.set(it.id, {
      errors: report.filter((r) => !r.ok && r.level === "error").length,
      warnings: report.filter((r) => r.level === "warn").length,
      messages: report.filter((r) => !r.ok).map((r) => r.msg),
    });
  }
  cache.set(engine, out);
  return out;
}

export function itemValidation(engine: Engine, id: string): ValidationSummary {
  return validationMap(engine).get(id) ?? { errors: 0, warnings: 0, messages: [] };
}
