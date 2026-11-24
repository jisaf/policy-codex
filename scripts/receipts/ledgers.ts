// The Colorado volume as the record harnesses and audit scripts read it:
// the ledger on disk, or the ledger at a ref (read with `git archive`, for a
// script that compares one ledger with another on the same households,
// scripts/audit/answer-diff.ts). Both are evaluated by today's engine, so a
// comparison measures the ledger change, not an engine change.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadLedgerFromDisk, type LoadedLedger } from "../../src/tools/check";
import { buildIndex, type LedgerIndex } from "../../src/engine/ledger-index";

export const root = path.resolve(import.meta.dirname, "../..");

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
