/* Where an item stands in approval, in one record: its status (Draft until
 * every required role has signed; docs/conventions.md "Status"), the roles
 * the volume's approval policy requires of it (engine.approvals, which
 * applies upstream_of_outcomes), the signatures it carries, and the roles
 * still missing. The item page, the approvals inbox and the role pages read
 * this rather than recomputing it.
 *
 * This is also the one definition of "needs a role" (the Legal AAG's L5):
 * an item needs Legal, or any role, exactly when the approval policy in
 * volume.yaml names that role for it, by program, kind or tag, plus
 * `upstream_of_outcomes`. `roleCounts`, `roleRule` and `whyRequired` read
 * that same policy, so every count and every explanation agree. */
import type { Engine } from "../engine/engine";
import type { ApprovalRecord, Item, VolumeMeta } from "../engine/types";

export type ItemStatus = NonNullable<Item["status"]>;

export interface ApprovalStatus {
  status: ItemStatus;
  required: string[];
  signed: ApprovalRecord[];
  missing: string[];
}

export function itemStatus(it: Item): ItemStatus {
  return it.status ?? "Draft";
}

export function approvalStatus(engine: Engine, it: Item): ApprovalStatus {
  const required = engine.approvals(it);
  const signed = it.approval ?? [];
  const signedRoles = new Set(signed.map((s) => s.role));
  return {
    status: itemStatus(it),
    required,
    signed,
    missing: required.filter((r) => !signedRoles.has(r)),
  };
}

/** Every item that requires `role`'s signature and does not have it yet. */
export function awaitingRole(engine: Engine, role: string): Item[] {
  return engine.items().filter((it) => {
    const a = approvalStatus(engine, it);
    return a.missing.includes(role);
  });
}

/** Every item the approval policy asks `role` to sign, signed or not. */
export function requiringRole(engine: Engine, role: string): Item[] {
  return engine.items().filter((it) => engine.approvals(it).includes(role));
}

export function hasSigned(it: Item, role: string): boolean {
  return (it.approval ?? []).some((s) => s.role === role);
}

export interface RoleCount {
  role: string;
  /** Items the policy asks this role to sign. */
  required: number;
  /** Of those, the ones still without this role's signature. */
  awaiting: number;
  /** Of those, the ones this role has signed. */
  signed: number;
  /** Of those, the ones whose status is Approved (every role signed). */
  approved: number;
}

/** One count per role, from the same policy the item page and the inbox
 *  read: required = awaiting + signed, always. */
export function roleCounts(engine: Engine, roles: readonly string[]): RoleCount[] {
  const out = new Map(roles.map((r) => [r, { role: r, required: 0, awaiting: 0, signed: 0, approved: 0 }]));
  for (const it of engine.items()) {
    for (const r of engine.approvals(it)) {
      const c = out.get(r);
      if (!c) continue;
      c.required++;
      if (hasSigned(it, r)) c.signed++;
      else c.awaiting++;
      if (itemStatus(it) === "Approved") c.approved++;
    }
  }
  return roles.map((r) => out.get(r)!);
}

const KIND_WORDS: Record<string, string> = {
  supplied: "every fact supplied about a person (an input)",
  derived: "every rule",
  parameter: "every figure set by policy",
};

function tagLabel(meta: VolumeMeta, id: string): string {
  for (const t of meta.tags ?? []) {
    if (typeof t !== "string" && t.id === id) return (t.label ?? id).toLowerCase();
  }
  return id.replace(/_/g, " ");
}

function programLabel(id: string): string {
  return id === "All" ? "shared by all programs" : id;
}

function joinWords(xs: string[]): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** The approval policy's rule for one role, in a sentence: which items it
 *  signs, by program, kind, tag, and (with upstream_of_outcomes) every item
 *  that role's programs' outcomes read. */
export function roleRule(meta: VolumeMeta, role: string): string {
  const pol = meta.approval_policy;
  if (!pol) return `${role} signs nothing: this volume has no approval policy.`;
  const programs = Object.entries(pol.by_program ?? {}).filter(([, rs]) => rs.includes(role)).map(([p]) => p);
  const kinds = Object.entries(pol.by_kind ?? {}).filter(([, rs]) => rs.includes(role)).map(([k]) => k);
  const tags = Object.entries(pol.by_tag ?? {}).filter(([, rs]) => rs.includes(role)).map(([t]) => t);
  const parts: string[] = [];
  const named = programs.filter((p) => p !== "All");
  if (named.length) parts.push(`every ${joinWords(named)} item`);
  if (programs.includes("All")) parts.push("every item shared by all programs");
  for (const k of kinds) parts.push(KIND_WORDS[k] ?? `every ${k} item`);
  if (tags.length) parts.push(`every item tagged ${joinWords(tags.map((t) => tagLabel(meta, t)))}`);
  if (pol.upstream_of_outcomes && named.length) {
    parts.push(`every item that a ${joinWords(named)} outcome reads, directly or through other rules`);
  }
  if (!parts.length) return `${role} signs nothing under this volume's approval policy.`;
  return `${role} signs ${joinWords(parts)}.`;
}

/** Each declared outcome with every identifier it reads, directly or through
 *  other items (itself included). Cached per engine. */
const coneCache = new WeakMap<Engine, Map<string, Set<string>>>();

export function outcomeCones(engine: Engine): Map<string, Set<string>> {
  const hit = coneCache.get(engine);
  if (hit) return hit;
  const out = new Map<string, Set<string>>();
  for (const p of engine.meta.programs ?? []) {
    for (const o of p.outcomes ?? []) {
      if (out.has(o)) continue;
      out.set(o, upstreamOf(engine, o));
    }
  }
  coneCache.set(engine, out);
  return out;
}

/** Every identifier `identifier` reads, directly or through other items,
 *  itself included. */
export function upstreamOf(engine: Engine, identifier: string): Set<string> {
  const seen = new Set<string>();
  const stack = [identifier];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const d of engine.usesOfItem(id)) stack.push(d);
  }
  return seen;
}

/** The programs whose declared outcomes read `it`, in declared order. */
export function programsReading(engine: Engine, it: Item): string[] {
  const cones = outcomeCones(engine);
  const out: string[] = [];
  for (const p of engine.meta.programs ?? []) {
    if ((p.outcomes ?? []).some((o) => cones.get(o)?.has(it.identifier))) out.push(p.id);
  }
  return out;
}

/** Why the policy asks `role` to sign `it`, in plain words; empty when it
 *  does not. Mirrors approvalsFor in src/engine/constraints.ts. */
export function whyRequired(engine: Engine, it: Item, role: string): string[] {
  const pol = engine.meta.approval_policy;
  if (!pol || !engine.approvals(it).includes(role)) return [];
  const out: string[] = [];
  if (pol.by_program?.[it.program]?.includes(role)) {
    out.push(it.program === "All" ? "it is shared by all programs" : `it is a ${it.program} item`);
  }
  if (pol.by_kind?.[it.kind]?.includes(role)) {
    out.push(it.kind === "supplied" ? "it is a fact supplied about a person" : `it is a ${it.kind} item`);
  }
  for (const t of it.tags ?? []) {
    if (pol.by_tag?.[t]?.includes(role)) out.push(`it is tagged ${tagLabel(engine.meta, t)}`);
  }
  if (pol.upstream_of_outcomes) {
    const readers = programsReading(engine, it)
      .filter((p) => p !== it.program && pol.by_program?.[p]?.includes(role));
    if (readers.length) out.push(`${joinWords(readers.map(programLabel))} outcomes read it`);
  }
  return out;
}

export type SignAction = "approve" | "review";

/** The status an item takes once its signatures are `signedRoles`, per the
 *  approval policy (docs/conventions.md "Approval", docs/governance.md):
 *  - an item resting on an unverified excerpt stays Draft (governance refuses
 *    Reviewed or Approved on it), whatever is signed;
 *  - Approved once every required role has signed and the last signer
 *    approves rather than only reviews;
 *  - Reviewed while some, not all, required roles have signed, or when the
 *    signer marks it reviewed;
 *  - Draft while nobody has signed. */
export function policyStatus(
  required: readonly string[], signedRoles: ReadonlySet<string>, action: SignAction,
  restsOnUnverified: boolean,
): ItemStatus {
  if (restsOnUnverified) return "Draft";
  const anySigned = required.some((r) => signedRoles.has(r));
  const allSigned = required.every((r) => signedRoles.has(r));
  if (allSigned && action === "approve" && required.length) return "Approved";
  return anySigned || action === "review" ? "Reviewed" : "Draft";
}

export interface Signature {
  role: string;
  by: string;
  date: string;
}

/** `it` with `sig` in its approval record (replacing an earlier signature by
 *  the same role) and the status the policy gives it. Pure: the caller stages
 *  the result in the change tray. */
export function signItem(
  engine: Engine, it: Item, sig: Signature, action: SignAction, restsOnUnverified: boolean,
): Item {
  const record: ApprovalRecord[] = [
    ...(it.approval ?? []).filter((a) => a.role !== sig.role),
    { role: sig.role, by: sig.by, date: sig.date },
  ];
  const required = engine.approvals(it);
  const status = policyStatus(required, new Set(record.map((a) => a.role)), action, restsOnUnverified);
  const out: Item = { ...it, approval: record };
  if (status === "Draft" && it.status === undefined) delete out.status;
  else out.status = status;
  return out;
}
