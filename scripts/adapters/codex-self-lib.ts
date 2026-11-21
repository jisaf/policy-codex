/* The pure half of the reference conformance adapter: loads a volume of the
 * checked-in ledger (once per volume) and evaluates suite cases against it.
 * Split out of codex-self.ts so it can be imported (by tests, or by other
 * tooling) without touching stdin — codex-self.ts is the thin CLI wrapper
 * around this that actually reads cases from stdin and writes their values
 * to stdout. */
import path from "node:path";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { loadVolume, manifestVolumes } from "../../src/tools/volumes";
import type { LedgerIndex } from "../../src/engine/ledger-index";
import type { AdapterValue, SuiteCase } from "../../src/export/conformance";

const root = path.resolve(import.meta.dirname, "../..");

const indexes = new Map<string, LedgerIndex>();

function indexOf(volume: string): LedgerIndex {
  let ix = indexes.get(volume);
  if (!ix) {
    ix = loadVolume(root, volume).engine.index;
    indexes.set(volume, ix);
  }
  return ix;
}

/** The volume a run is for: the suite's own `codex.volume` when the payload
 *  carries it, else `--volume <id>` or CODEX_VOLUME, else the manifest's only
 *  volume. Never a silent guess between several. */
export function resolveVolume(
  payloadVolume: string | undefined, argv: readonly string[] = process.argv.slice(2),
  env: string | undefined = process.env.CODEX_VOLUME,
): string {
  if (payloadVolume) return payloadVolume;
  const i = argv.indexOf("--volume");
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  if (env) return env;
  const all = manifestVolumes(root).map((v) => v.id);
  if (all.length === 1) return all[0];
  throw new Error(
    `codex-self: which volume? The payload has no codex.volume; pass --volume <id> or set ` +
      `CODEX_VOLUME (volumes: ${all.join(", ")})`,
  );
}

/** Evaluates every expectation of one suite case against the codex engine
 *  for `volume`. An expectation this codex build cannot evaluate (an
 *  identifier it no longer knows, or any other evaluation error) is omitted
 *  from the result entirely, not reported as `value: null`: `gradeCase`'s
 *  `unimplemented` count is exactly the expectations no entry answers, so a
 *  bare `null` entry would instead be graded as a spurious pass or fail. */
export function evaluateCase(c: SuiteCase, volume: string): AdapterValue[] {
  const ix = indexOf(volume);
  const data = makeCase(ix, {
    id: c.id, as_of: c.as_of, parameters: c.parameters, month_facts: c.month_facts, persons: c.persons,
  });
  const values: AdapterValue[] = [];
  for (const e of c.expect) {
    try {
      const value = evaluate(ix, data, e.identifier, e.person, e.month);
      values.push({ person: e.person, identifier: e.identifier, month: e.month, value });
    } catch {
      // unimplemented: omitted, not reported as a value.
    }
  }
  return values;
}
