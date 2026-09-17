import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
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
  /** The household graph, one `[role, from, to]` edge per line: "from is the
   *  role of to". Each edge reaches both persons, with the inverse role on
   *  the second, beside whatever relationships the persons state themselves. */
  relationships?: Array<[string, string, string]>;
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
    relationships: c.relationships,
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

/** One household case as a YAML sequence entry, ready to append to
 *  `tests/cases.yaml`. Every string is quoted, so the ISO dates and months the
 *  file's conventions ask for stay quoted strings on a round trip. */
export function stringifyCase(c: HouseholdCase): string {
  return stringifyYaml([c], {
    defaultStringType: "QUOTE_DOUBLE",
    defaultKeyType: "PLAIN",
    lineWidth: 0,
  });
}

/** The next free `C-nn`, padded as the existing ids are. */
export function nextCaseId(cases: readonly HouseholdCase[]): string {
  let max = 0;
  for (const c of cases) {
    const m = /^C-(\d+)$/.exec(c.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `C-${String(max + 1).padStart(2, "0")}`;
}

/** `tests/cases.yaml` with one case appended. A volume whose file is absent
 *  gets a file holding just the new case. */
export function appendCase(casesText: string | null, c: HouseholdCase): string {
  const block = stringifyCase(c);
  if (casesText == null || casesText.trim() === "") return block;
  return casesText.replace(/\n*$/, "\n") + "\n" + block;
}
