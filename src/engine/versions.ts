import type { Item, ItemVersion } from "./types";

/** Dated values and effective ranges: which version of a parameter, and which
 *  rules, the codex has in force on a date. `present` sorts after every ISO
 *  date, so an open end needs no special case in these comparisons. */

/** The version in force on a date: the latest one whose `from` has arrived
 *  and whose `to` (exclusive) has not. A date before the first version, in a
 *  gap between versions, or after the last version's `to` is covered by no
 *  version at all. */
export function versionInForce(
  it: { versions?: ItemVersion[] }, date: string,
): ItemVersion | null {
  let best: ItemVersion | null = null;
  for (const v of it.versions ?? []) {
    if (v.from > date) continue;
    if (v.to !== undefined && date >= v.to) continue;
    if (!best || v.from >= best.from) best = v;
  }
  return best;
}

/** The value of a parameter in force on a date. A parameter that carries
 *  versions takes its value from them and from nowhere else, so a date no
 *  version covers has no value; a parameter without versions holds one value
 *  for all time. This is the rule `paramOf` applies inside a case (minus the
 *  per-case override, which has no meaning outside one). */
export function paramInForce(it: Item, date: string): unknown {
  if (it.versions && it.versions.length) {
    const v = versionInForce(it, date);
    return v ? v.value : null;
  }
  return it.value === undefined ? null : it.value;
}

/** Whether an item's own effective range covers a date. `from` is the first
 *  day the item is in force and `to` the last, so a range stated as a policy's
 *  own dates needs no arithmetic; `to: present` and an absent range never end.
 *  An item out of force states nothing, so it evaluates to unknown. */
export function inForce(it: { effective?: { from: string; to: string } }, date: string): boolean {
  const e = it.effective;
  if (!e) return true;
  if (e.from && date < e.from) return false;
  if (e.to && date > e.to) return false;
  return true;
}
