import type { LedgerIndex } from "./ledger-index";
import { check } from "./check";
import { runTest } from "./evaluate";
import { baseType, fmt } from "./values";
import { DATE_RE, type EngineRefs, type Item, type VolumeMeta } from "./types";

export interface Constraint { ok: boolean; msg: string; level: "error" | "warn" }

export function approvals(meta: VolumeMeta, it: Item): string[] {
  const pol = meta.approval_policy || { roles: [], by_program: {}, by_kind: {}, by_tag: {} };
  const roles: string[] = [];
  if (pol.by_program?.[it.program]) roles.push(...pol.by_program[it.program]);
  if (pol.by_kind?.[it.kind]) roles.push(...pol.by_kind[it.kind]);
  for (const t of it.tags || []) if (pol.by_tag?.[t]) roles.push(...pol.by_tag[t]);
  return [...new Set(roles)];
}

export function constraints(
  ix: LedgerIndex, meta: VolumeMeta, refs: EngineRefs | null, it: Item,
): Constraint[] {
  const R: Constraint[] = [];
  const add = (ok: boolean, msg: string, level: "error" | "warn" = "error") =>
    R.push({ ok, msg, level });
  add(!!it.name, "Fact name is present");
  add(!!it.identifier && /^[a-z][a-z0-9_]*$/.test(it.identifier || ""), "Identifier is snake_case");
  const clash = it.identifier
    ? ix.items.find((x) => x.identifier === it.identifier && x.id !== it.id)
    : undefined;
  add(
    !clash,
    clash
      ? `Identifier "${it.identifier}" already belongs to ${clash.id}; edit that item or choose a new name`
      : "Identifier is unique",
  );
  add(["supplied", "derived", "parameter"].includes(it.kind), "Kind is set");
  add(!!it.type && meta.types.includes(it.type), "Type is a codex type");
  add(!!it.scope && meta.scopes.includes(it.scope), "Scope is set");
  add(["All", "Medicaid", "SNAP"].includes(it.program), "Program is set");
  add(!!(it.meaning && it.meaning.trim().length > 15),
    "Meaning is a full sentence an approver can sign");
  if (it.type === "one of") {
    add(!!(it.options && it.options.length >= 2), "Enumeration lists its options");
  }
  if (it.kind === "supplied") add(!!it.supplied_by, "Supplied facts say where the value comes from");
  if (it.kind === "parameter") {
    add(it.value !== undefined && it.value !== null && it.value !== "", "Parameter has a value");
  }
  if (it.kind !== "supplied") {
    add(!!(it.sources && it.sources.length), "At least one source excerpt is cited");
  }
  // An effective range is reported only when it is malformed, so an item that
  // states a well-formed one reads exactly as an item that states none.
  if (it.effective) {
    if (!DATE_RE.test(it.effective.from || "")) {
      add(false, `Effective start "${it.effective.from}" is not a calendar date`);
    }
    const to = it.effective.to;
    if (to !== "present" && !DATE_RE.test(to || "")) {
      add(false, `Effective end "${to}" is not a calendar date or "present"`);
    }
  }
  if (refs) {
    for (const s of it.sources || []) add(refs.sourceIds.includes(s), `Source ${s} exists`);
    for (const q of it.open || []) add(refs.questionIds.includes(q), `Open question ${q} exists`);
  }
  if (it.kind === "derived") {
    add(!!it.derived, "Derivation is present");
    add(!!it.implemented,
      "Implementation target is chosen (fact assembly or determination engine)");
    if (it.derived) {
      const chk = check(ix, it.derived, it.scope);
      for (const m of chk.errors) add(false, m);
      for (const m of chk.warnings) add(true, m, "warn");
      const want = baseType(it);
      if (chk.type !== "unknown" && want !== "unknown" && chk.type !== want) {
        add(false, `Derivation produces ${chk.type} but the item's type is ${it.type}`);
      }
      const crossProgram = [...chk.refs].filter((r) => {
        const target = ix.byIdentifier.get(r);
        return target && target.program !== "All" && it.program !== "All" &&
          target.program !== it.program;
      });
      if (crossProgram.length) {
        add(
          true,
          `Cross-program dependency on ${crossProgram
            .map((r) => ix.byIdentifier.get(r)!.name).join(", ")}; both program owners will be required`,
          "warn",
        );
      }
      add(Boolean(it.tests && it.tests.length > 0), "At least one example (rule-level test)");
      if (chk.errors.length === 0 && it.tests) {
        for (const t of it.tests) {
          const r = runTest(ix, it, t, meta.default_as_of);
          add(
            r.ok,
            `Example ${t.id}: ${
              r.ok ? "passes"
                : r.err ? "error: " + r.err
                : `expected ${fmt(t.expect)}, got ${fmt(r.got)}`
            }`,
          );
        }
      }
    }
    if (it.role === "outcome" && it.type !== "one of") {
      add(true, "Outcomes are usually enumerations of statuses", "warn");
    }
  }
  if ((it.tags || []).includes("legal") || (it.open || []).length) {
    add(true, "Legal sign-off is required (legal tag or open question)", "warn");
  }
  return R;
}
