import { parse as parseYaml } from "yaml";
import type { LedgerIndex } from "./ledger-index";
import { evaluate, makeCase } from "./evaluate";
import { valuesEqual } from "./values";
import type { TestSpec } from "./types";

/** The per-person shape `TestSpec.persons` takes, reused so a household case
 *  and a rule test's `others`/`persons` share one definition. */
export type PersonSpec = NonNullable<TestSpec["persons"]>[string];

export interface HouseholdCase {
  id: string;
  title: string;
  as_of: string;
  parameters?: Record<string, unknown>;
  month_facts?: Record<string, Record<string, unknown>>;
  persons: Record<string, PersonSpec>;
  expect: Record<string, Record<string, unknown>>;
}

export interface CaseResult {
  person: string;
  identifier: string;
  month: string | null;
  expect: unknown;
  got: unknown;
  ok: boolean;
  err: string | null;
}

export interface CaseReport {
  id: string;
  title: string;
  results: CaseResult[];
  passed: number;
  failed: number;
}

/** Parses `tests/cases.yaml` into household cases. */
export function parseCases(yamlText: string): HouseholdCase[] {
  const raw = parseYaml(yamlText);
  return (raw ?? []) as HouseholdCase[];
}

/** The adapter from a household case to the rule-test spec `makeCase` accepts. */
export function caseToSpec(c: HouseholdCase): TestSpec & { as_of: string } {
  return {
    id: c.id,
    as_of: c.as_of,
    parameters: c.parameters,
    month_facts: c.month_facts,
    persons: c.persons,
  };
}

/** Runs every expectation in a household case: for a person-month item whose
 *  expected value is an object keyed by month, each month is checked
 *  separately; otherwise the identifier is evaluated with no month in
 *  context. An error while evaluating counts as a failure. */
export function runCase(ix: LedgerIndex, c: HouseholdCase): CaseReport {
  const caseData = makeCase(ix, caseToSpec(c));
  const results: CaseResult[] = [];
  let passed = 0;
  let failed = 0;
  for (const [pid, expectations] of Object.entries(c.expect || {})) {
    for (const [identifier, exp] of Object.entries(expectations)) {
      const it = ix.byIdentifier.get(identifier);
      const isMonthKeyed =
        it?.scope === "person-month" &&
        exp !== null && typeof exp === "object" && !Array.isArray(exp);
      const pairs: Array<[string | null, unknown]> = isMonthKeyed
        ? Object.entries(exp as Record<string, unknown>)
        : [[null, exp]];
      for (const [month, e] of pairs) {
        let got: unknown;
        let ok: boolean;
        let err: string | null = null;
        try {
          got = evaluate(ix, caseData, identifier, pid, month);
          ok = valuesEqual(got, e);
        } catch (ex) {
          err = (ex as Error).message;
          got = `error: ${err}`;
          ok = false;
        }
        results.push({ person: pid, identifier, month, expect: e, got, ok, err });
        if (ok) passed++; else failed++;
      }
    }
  }
  return { id: c.id, title: c.title, results, passed, failed };
}

/** The distinct programs of a case's expected identifiers, so the UI can
 *  group cases per program. */
export function programsOfCase(ix: LedgerIndex, c: HouseholdCase): string[] {
  const set = new Set<string>();
  for (const expectations of Object.values(c.expect || {})) {
    for (const identifier of Object.keys(expectations)) {
      const it = ix.byIdentifier.get(identifier);
      if (it) set.add(it.program);
    }
  }
  return [...set].sort();
}
