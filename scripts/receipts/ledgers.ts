// Receipt records harness: the two ledgers it compares. `old` is the
// Colorado volume as it was before the migration (the baseline ref, read with
// `git archive`, every program reading the scalar unearned-income facts);
// `new` is the volume on disk. Both are evaluated by today's engine, so the
// harness measures the ledger change, not an engine change.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadLedgerFromDisk, type LoadedLedger } from "../../src/tools/check";
import { buildIndex, type LedgerIndex } from "../../src/engine/ledger-index";

export const root = path.resolve(import.meta.dirname, "../..");

/** The ledger before migration phase 1: the commit the product owner's
 *  adoption of receipt records was recorded at (docs/plan-colorado.md). */
export const BASELINE_REF = "41ec04b4d62c5f2f8210702ac300aff1fc7f503a";

export interface Ledger { ledger: LoadedLedger; ix: LedgerIndex }

function index(ledger: LoadedLedger): Ledger {
  return { ledger, ix: buildIndex(ledger.items, ledger.meta.relationship_roles ?? null) };
}

export function currentLedger(): Ledger {
  return index(loadLedgerFromDisk(root, "co"));
}

/** The ledger at a ref, extracted to a temporary directory. */
export function ledgerAt(ref: string): Ledger {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "receipts-base-"));
  try {
    const tar = execFileSync("git", ["archive", ref, "codex.json", "volumes/co"], { cwd: root, maxBuffer: 1 << 30 });
    execFileSync("tar", ["-x", "-C", dir], { input: tar });
    return index(loadLedgerFromDisk(dir, "co"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
