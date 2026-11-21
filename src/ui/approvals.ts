/* Where an item stands in approval, in one record: its status (Draft until
 * every required role has signed; docs/conventions.md "Status"), the roles
 * the volume's approval policy requires of it (engine.approvals, which
 * applies upstream_of_outcomes), the signatures it carries, and the roles
 * still missing. The item page, the approvals inbox and the role pages read
 * this rather than recomputing it. */
import type { Engine } from "../engine/engine";
import type { ApprovalRecord, Item } from "../engine/types";

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
