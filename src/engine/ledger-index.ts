import type { Item, RelationshipRoleDecl } from "./types";

/** The inverse of each relationship role the household model names, used
 *  when a volume declares no `relationship_roles` in volume.yaml. A
 *  case-level edge states one direction and both persons carry it, so
 *  `[parent, p2, p3]` records "p2 is the parent of p3" on p2 and "p3 is the
 *  child of p2" on p3. A role with no inverse is recorded on the person named
 *  first alone. Both shipped volumes declare their roles; this table is kept
 *  so a volume (or a test fixture) without the declaration behaves as before. */
export const DEFAULT_INVERSE_ROLE: Readonly<Record<string, string>> = {
  parent: "child",
  child: "parent",
  spouse: "spouse",
  grandparent: "grandchild",
  grandchild: "grandparent",
  caretaker: "dependent",
  dependent: "caretaker",
  tax_filer: "tax_dependent",
  tax_dependent: "tax_filer",
  buys_prepares_with: "buys_prepares_with",
  // LEAP's economic unit (9 CCR 2503-7 3.751.1): persons who customarily buy
  // primary heating fuel in common or pay heat jointly in rent. Symmetric.
  shares_heat_with: "shares_heat_with",
};

/** The inverse table a volume's declared roles give, or the default when the
 *  volume declares none. */
export function inverseRoleTable(
  roles: readonly RelationshipRoleDecl[] | null | undefined,
): Readonly<Record<string, string>> {
  if (!roles || !roles.length) return DEFAULT_INVERSE_ROLE;
  const out: Record<string, string> = {};
  for (const r of roles) if (r.inverse) out[r.id] = r.inverse;
  return out;
}

export interface LedgerIndex {
  items: Item[];
  byIdentifier: Map<string, Item>;
  byName: Map<string, Item>;
  byId: Map<string, Item>;
  enumOptions: Set<string>;
  /** The volume's declared relationship roles, or null when it declares none
   *  (any role is then accepted). */
  roles: readonly RelationshipRoleDecl[] | null;
  /** role -> inverse role, from `roles` (or the default table). */
  inverseRole: Readonly<Record<string, string>>;
}

export function buildIndex(
  items: Item[], roles: readonly RelationshipRoleDecl[] | null = null,
): LedgerIndex {
  const byIdentifier = new Map<string, Item>();
  const byName = new Map<string, Item>();
  const byId = new Map<string, Item>();
  const enumOptions = new Set<string>();
  for (const it of items) {
    byIdentifier.set(it.identifier, it);
    byName.set((it.name || "").toLowerCase(), it);
    byId.set(it.id, it);
    for (const o of it.options || []) enumOptions.add(o);
    // A record schema's "one of" fields (a receipt's kind, its frequency)
    // name options a rule compares a field with.
    for (const f of Object.values(it.record_fields ?? {})) for (const o of f?.options ?? []) enumOptions.add(o);
  }
  const declared = roles && roles.length ? roles : null;
  return {
    items, byIdentifier, byName, byId, enumOptions,
    roles: declared, inverseRole: inverseRoleTable(declared),
  };
}

/** A new index with `extra` overlaid by identifier. Never mutates `base`. */
export function indexWith(base: LedgerIndex, extra: Item[]): LedgerIndex {
  const merged = base.items.slice();
  for (const it of extra) {
    const k = merged.findIndex((x) => x.identifier === it.identifier);
    if (k >= 0) merged[k] = it;
    else merged.push(it);
  }
  return buildIndex(merged, base.roles);
}

export function nextIdFrom(ix: LedgerIndex, prefix = "WR"): string {
  const used = new Set(ix.items.map((i) => i.id));
  let n = 1;
  for (const it of ix.items) {
    const m = /^[A-Za-z]+-(\d+)$/.exec(it.id);
    if (m) n = Math.max(n, Number(m[1]) + 1);
  }
  while (used.has(`${prefix}-${String(n).padStart(3, "0")}`)) n++;
  return `${prefix}-${String(n).padStart(3, "0")}`;
}
