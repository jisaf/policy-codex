/* The pure half of the reference conformance adapter: loads the checked-in
 * ledger once and evaluates suite cases against it. Split out of
 * codex-self.ts so it can be imported (by tests, or by other tooling)
 * without touching stdin — codex-self.ts is the thin CLI wrapper around this
 * that actually reads a case from stdin and writes its values to stdout. */
import fs from "node:fs";
import path from "node:path";
import { buildIndex } from "../../src/engine/ledger-index";
import { evaluate, makeCase } from "../../src/engine/evaluate";
import { parseItemFile } from "../../src/engine/yaml";
import type { LedgerIndex } from "../../src/engine/ledger-index";
import type { Item } from "../../src/engine/types";
import type { AdapterValue, SuiteCase } from "../../src/export/conformance";

const root = path.resolve(import.meta.dirname, "../..");

function loadIndex(): LedgerIndex {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "codex.json"), "utf8"));
  const entry = manifest.volumes[0];
  const items: Item[] = [];
  for (const ch of entry.chapters) {
    for (const f of ch.files) {
      items.push(parseItemFile(fs.readFileSync(path.join(root, entry.path, ch.dir, f), "utf8")));
    }
  }
  return buildIndex(items);
}

const ix = loadIndex();

/** Evaluates every expectation of one suite case against the codex engine.
 *  An expectation this codex build cannot evaluate (an identifier it no
 *  longer knows, or any other evaluation error) is omitted from the result
 *  entirely, not reported as `value: null`: `gradeCase`'s `unimplemented`
 *  count is exactly the expectations no entry answers, so a bare `null`
 *  entry would instead be graded as a spurious pass or fail. */
export function evaluateCase(c: SuiteCase): AdapterValue[] {
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
