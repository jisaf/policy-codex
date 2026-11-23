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

/** The ledger without the migration phase being measured. Phase 1: the last
 *  commit of the branch the migration merges into that reads the scalar
 *  facts everywhere: the adoption commit (41ec04b) until the non-MAGI fix
 *  round (82a29d0) was merged in, then the time-audit fix round (ccbb3a7)
 *  when the migration was merged into it. Phase 2 (CCCAP, SUN Bucks): the
 *  end of phase 1 (c29d326), so the harness measures phase 2 alone; the
 *  phase-1 baseline still runs clean with --base ccbb3a7. The baseline moves
 *  with each merge, so the harness measures the migration and nothing the
 *  other track changed. */
export const BASELINE_REF = "c29d3262ed69d9fbc7589a949149aa75dc8ba182";

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
