/* The app's side of the stale-approval check (docs/governance.md "Stale
 * approvals"), against the real Colorado volume: a signature staged from
 * the inbox records the fingerprint of what the ledger will be once the tray
 * merges, and the tray's validation reports an approval an upstream edit
 * makes stale. */
import { describe, it, expect } from "vitest";
import path from "node:path";
import { loadVolume } from "../../src/tools/volumes";
import { emptyChangeSet, type ChangeSet } from "../../src/changes/types";
import { applyChangeSet } from "../../src/changes/apply";
import { validateChangeSet } from "../../src/changes/validate";
import { restingOnUnverified, signatureEntries } from "../../src/ui/inbox";
import { unverifiedIds } from "../../src/ui/provenance";
import type { Item } from "../../src/engine/types";

const root = path.resolve(__dirname, "../..");
const { vol, engine } = loadVolume(root, "co");
const tainted = restingOnUnverified(engine, unverifiedIds(vol.sources));

// A rule nothing unverified rests on, that reads a parameter with versions.
const rule = engine.items().find((it) =>
  it.kind === "derived" && !tainted.has(it.identifier) && engine.approvals(it).length &&
  engine.usesOfItem(it.identifier).some((d) => (engine.item(d)?.versions ?? []).length > 0))!;
const param = engine.item(engine.usesOfItem(rule.identifier)
  .find((d) => (engine.item(d)?.versions ?? []).length > 0)!)!;
const role = engine.approvals(rule)[0];
const sig = { role, by: "Dana", date: "2026-11-23" };

function editParam(): Item {
  const v = param.versions!;
  const last = v[v.length - 1];
  const bumped = typeof last.value === "number" ? last.value + 1 : { changed: last.value };
  return { ...param, versions: [...v.slice(0, -1), { ...last, value: bumped }] };
}

function withEntry(cs: ChangeSet, after: Item, before: Item): ChangeSet {
  return { ...cs, entries: [...cs.entries, { id: after.id, chapter: vol.chapterOf[after.id], before, after }] };
}

describe("the app records and checks approval fingerprints", () => {
  it("a signature records the fingerprint of the ledger as it stands", () => {
    const [e] = signatureEntries(engine, null, vol.chapterOf, [rule.id], sig, "review", tainted);
    expect(e.after!.approval!.find((a) => a.role === role)!.fingerprint).toBe(engine.fingerprint(rule));
    const report = validateChangeSet(engine, { ...emptyChangeSet("co", "local"), entries: [e] });
    expect(report.items.flatMap((r) => r.governance).filter((f) => f.rule === "approval.stale")).toEqual([]);
    expect(report.valid).toBe(true);
  });

  it("a signature over a staged upstream edit covers the edit", () => {
    const cs = withEntry(emptyChangeSet("co", "local"), editParam(), param);
    const [e] = signatureEntries(engine, cs, vol.chapterOf, [rule.id], sig, "review", tainted);
    const fp = e.after!.approval!.find((a) => a.role === role)!.fingerprint;
    expect(fp).not.toBe(engine.fingerprint(rule));
    expect(fp).toBe(engine.withItems(applyChangeSet(engine.items(), cs)).fingerprint(rule));
  });

  it("an upstream edit staged after the signature makes it stale", () => {
    const [e] = signatureEntries(engine, null, vol.chapterOf, [rule.id], sig, "review", tainted);
    // Signed in the same tray, then the parameter it reads is edited.
    const sameTray = withEntry({ ...emptyChangeSet("co", "local"), entries: [e] }, editParam(), param);
    const r1 = validateChangeSet(engine, sameTray);
    expect(r1.valid).toBe(false);
    expect(r1.items.find((r) => r.id === rule.id)!.errors.join("\n")).toMatch(/^approval is stale: /m);
    // Signed on the base ledger already, then the parameter is edited: the
    // signed rule is downstream of the edit and goes back for review.
    const signedBase = engine.withItems(applyChangeSet(engine.items(), { ...emptyChangeSet("co", "local"), entries: [e] }));
    const r2 = validateChangeSet(signedBase, withEntry(emptyChangeSet("co", "local"), editParam(), param));
    expect(r2.valid).toBe(false);
    expect(r2.items.find((r) => r.id === rule.id)!.errors.join("\n")).toMatch(/^approval is stale: /m);
    // An edit to its precision alone does not.
    const r3 = validateChangeSet(signedBase, withEntry(emptyChangeSet("co", "local"), { ...param, precision: "Exact to the cent." }, param));
    expect(r3.items.find((r) => r.id === rule.id)).toBeUndefined();
  });
});
