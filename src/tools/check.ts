/* The check `npm run check` runs: phase-1 constraints, phase-2 governance
 * findings, rule tests, and household cases over the ledger on disk, plus
 * the impact of whatever changed against a base ref. Loading, diffing, and
 * reporting are kept as separate functions so `test/repo/check.test.ts` can
 * drive `buildCheckReport` directly with a constructed diff, without git. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createEngine } from "../engine/engine";
import { derivedOverrides, parseCases, type HouseholdCase } from "../engine/cases";
import { parseItemFile, parseVolumeFile } from "../engine/yaml";
import { parseOpenQuestions, parseSources, unverifiedSourceIds } from "../ledger/markdown";
import { ratchetGovernance } from "../changes/validate";
import { householdInputs, ruleTestInputs, type Audit } from "../export/conformance";
import { versionInForce } from "../engine/versions";
import type { Engine } from "../engine/engine";
import type { Item, TestSpec, VolumeMeta } from "../engine/types";

export interface LoadedLedger {
  items: Item[];
  meta: VolumeMeta;
  /** item id -> chapter directory, to reconstruct each item's file path. */
  chapterOf: Record<string, string>;
  /** the volume's directory, e.g. "volumes/mwr". */
  volumePath: string;
  cases: HouseholdCase[];
  sourceIds: string[];
  questionIds: string[];
  /** excerpts marked `Verification: unverified`. */
  unverifiedSourceIds?: string[];
}

/** Reads the manifest, every item file, `volume.yaml`, `sources.md`,
 *  `open-questions.md`, and `tests/cases.yaml` for one volume (the manifest's
 *  first when none is named; `runCheckAll` and `npm run check` run every
 *  volume). `root` is the repository root. */
export function loadLedgerFromDisk(root: string, volumeId?: string): LoadedLedger {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "codex.json"), "utf8"));
  const entry = volumeId
    ? manifest.volumes.find((v: { id: string }) => v.id === volumeId)
    : manifest.volumes[0];
  if (!entry) throw new Error(`no volume ${volumeId} in codex.json`);

  const items: Item[] = [];
  const chapterOf: Record<string, string> = {};
  for (const ch of entry.chapters) {
    for (const f of ch.files) {
      const it = parseItemFile(fs.readFileSync(path.join(root, entry.path, ch.dir, f), "utf8"));
      items.push(it);
      chapterOf[it.id] = ch.dir;
    }
  }
  const meta = parseVolumeFile(
    fs.readFileSync(path.join(root, entry.path, "volume.yaml"), "utf8"),
  );
  const sources = parseSources(
    fs.readFileSync(path.join(root, entry.path, "sources.md"), "utf8"),
  );
  const openQuestions = parseOpenQuestions(
    fs.readFileSync(path.join(root, entry.path, "open-questions.md"), "utf8"),
  );
  const casesPath = path.join(root, entry.path, "tests/cases.yaml");
  const cases = fs.existsSync(casesPath) ? parseCases(fs.readFileSync(casesPath, "utf8")) : [];

  return {
    items,
    meta,
    chapterOf,
    volumePath: entry.path as string,
    cases,
    sourceIds: sources.map((s) => s.id),
    questionIds: openQuestions.map((q) => q.id),
    unverifiedSourceIds: unverifiedSourceIds(sources),
  };
}

export interface DiffEntry { status: string; path: string }

/** `git diff --name-status <base>...HEAD -- volumes/`, run from `root`.
 *  Returns `null` when the base ref cannot be resolved (a shallow checkout
 *  with no such ref, for instance) — the caller then treats every file as
 *  unchanged rather than failing the check. */
export function diffAgainstBase(root: string, base: string): DiffEntry[] | null {
  let out: string;
  try {
    out = execFileSync(
      "git", ["diff", "--name-status", `${base}...HEAD`, "--", "volumes/"],
      { cwd: root, encoding: "utf8" },
    );
  } catch {
    return null;
  }
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      // A rename is reported as "R100\told\tnew"; every other status is
      // "X\tpath". Either way the last field is the path to check against.
      return { status: parts[0], path: parts[parts.length - 1] };
    });
}

export interface ItemCheck {
  id: string;
  identifier: string;
  /** the item's file was added or edited in the diff against base. */
  isChanged: boolean;
  /** the item's file was added in the diff against base. */
  isNew: boolean;
  errors: string[];
  warnings: string[];
  /** governance findings, formatted "rule: message". */
  governanceErrors: string[];
  governanceWarnings: string[];
}

export interface RuleTestFailure {
  itemId: string;
  identifier: string;
  testId: string;
  expect: unknown;
  got: unknown;
  err: string | null;
}

export interface RuleTestSummary {
  total: number;
  passing: number;
  failing: number;
  failingIds: string[];
  failures: RuleTestFailure[];
}

export interface CaseFailure {
  caseId: string;
  person: string;
  identifier: string;
  month: string | null;
  /** `caseId:person:identifier[@month]`, stable across runs, usable in
   *  `conformance/known-failures.json`. */
  key: string;
  expect: unknown;
  got: unknown;
  err: string | null;
}

export interface CaseSummary {
  total: number;
  passing: number;
  failing: number;
  failingIds: string[];
  failures: CaseFailure[];
}

export interface BlockingError { id: string; identifier: string; msg: string }

export interface OpenQuestionFindings {
  /** volume-level errors: a "### OQ-n." heading that appears more than once
   *  in open-questions.md (the mark of a bad union merge). Block the check. */
  errors: string[];
  /** an item's `open:` naming a question open-questions.md does not have. */
  warnings: string[];
}

/** Validates open-questions.md against itself and the items that cite it.
 *  `questionIds` is every heading's id in file order, duplicates kept (as
 *  `parseOpenQuestions` returns them). */
export function checkOpenQuestions(
  questionIds: readonly string[], items: readonly Item[],
): OpenQuestionFindings {
  const errors: string[] = [];
  const warnings: string[] = [];
  const count = new Map<string, number>();
  for (const q of questionIds) count.set(q, (count.get(q) ?? 0) + 1);
  for (const [q, n] of count) {
    if (n > 1) {
      errors.push(`open-questions.md has ${n} "### ${q}." headings; each question must appear once`);
    }
  }
  for (const it of items) {
    for (const q of it.open || []) {
      if (!count.has(q)) warnings.push(`${it.id} ${it.identifier}: open names ${q}, which open-questions.md does not have`);
    }
  }
  return { errors, warnings };
}

export interface CheckReport {
  /** the base ref the diff was computed against, or `null` when it could
   *  not be resolved (every file was then treated as unchanged). */
  base: string | null;
  changedFiles: string[];
  changedItems: string[];
  addedItems: string[];
  items: ItemCheck[];
  ruleTests: RuleTestSummary;
  cases: CaseSummary;
  /** identifiers downstream of the changed items. */
  impact: string[];
  /** declared program outcomes that are changed or downstream of a change. */
  outcomesAffected: string[];
  /** ids from `conformance/known-failures.json`, allowed to keep failing. */
  knownFailures: string[];
  /** failing rule-test or case keys not covered by `knownFailures`. */
  newFailures: string[];
  /** `override:<case>:<person>:<identifier>` for every derived identifier a
   *  household case supplies as a fact; one not in `knownFailures` blocks. */
  caseOverrides: string[];
  /** error-level constraint or governance findings on a changed or added item. */
  blockingItemErrors: BlockingError[];
  /** duplicated question headings (errors, blocking) and `open:` references
   *  to questions that do not exist (warnings). */
  openQuestions: OpenQuestionFindings;
  /** Non-blocking findings about tests and cases: inputs no engine reads
   *  (parameters stated as person facts, unknown identifiers, persons named
   *  only in a relationship triple, ...), and unknowns produced with no
   *  supplied fact behind them (a table lookup with no row, a parameter with
   *  no version in force, a division by zero). One line each. */
  warnings: string[];
  /** true when there is nothing to block a merge. */
  ok: boolean;
}

const IGNORED_ADVICE: Record<string, string> = {
  "unknown identifier": "no item has this identifier, so it is ignored",
  parameter: "is a parameter, so a value stated for a person is ignored (state an override under `parameters:`)",
  "not in force": "is outside its effective range on the determination date, so the stated value is ignored",
  scope: "has a scope the engine never reads from a person's facts, so it is ignored",
  "undeclared person": "is named in a relationship triple but not declared as a person of the case, so no relationships are recorded on them",
};

function auditLines(id: string, audit: Audit): string[] {
  return audit.ignored.map((i) =>
    `${id}: ${i.person ? i.person + "." : ""}${i.identifier} ${IGNORED_ADVICE[i.reason] ?? i.reason}`);
}

function roleLines(
  id: string, declared: Set<string> | null,
  rels: Array<readonly string[]> | undefined,
): string[] {
  if (!declared || !rels) return [];
  return rels.filter((r) => !declared.has(r[0])).map((r) =>
    `${id}: relationship role "${r[0]}" is not declared in volume.yaml relationship_roles`);
}

/** The non-blocking warnings `buildCheckReport` adds for one volume's tests,
 *  cases and parameters (see CheckReport.warnings). Evaluation warnings come
 *  from the rule-test and case runs, passed in so nothing is evaluated twice. */
export function inputWarnings(engine: Engine, ledger: LoadedLedger): string[] {
  const out: string[] = [];
  const declared = engine.index.roles ? new Set(engine.index.roles.map((r) => r.id)) : null;
  for (const it of ledger.items) {
    for (const t of it.tests || []) {
      if (t.others && "p1" in t.others) {
        out.push(`${t.id}: others restates p1, which replaces everything given for p1 (including its relationships)`);
      }
      try {
        out.push(...auditLines(t.id, ruleTestInputs(engine, t).audit));
      } catch (ex) {
        out.push(`${t.id}: ${(ex as Error).message}`);
      }
      out.push(...roleLines(t.id, declared, t.relationships as TestSpec["relationships"]));
      for (const [pid, p] of Object.entries(t.persons || {})) {
        out.push(...roleLines(`${t.id} ${pid}`, declared, p.relationships));
      }
    }
  }
  for (const c of ledger.cases) {
    out.push(...auditLines(c.id, householdInputs(engine, c).audit));
    out.push(...roleLines(c.id, declared, c.relationships));
    for (const [pid, p] of Object.entries(c.persons || {})) {
      out.push(...roleLines(`${c.id} ${pid}`, declared, p.relationships));
    }
  }
  // A versioned parameter with no version on the volume's default date is
  // unknown in every test that does not set its own date.
  for (const it of ledger.items) {
    if (it.kind === "parameter" && Array.isArray(it.versions) &&
      !versionInForce(it, ledger.meta.default_as_of)) {
      out.push(`${it.id} ${it.identifier}: no version in force on default_as_of ${ledger.meta.default_as_of}`);
    }
  }
  return out;
}

/** Every dependency cycle among the volume's items, each as the identifiers
 *  on it with the first repeated at the end. The evaluator also stops at a
 *  cycle, but only when a test reaches it; this finds one statically. */
export function dependencyCycles(engine: Engine): string[][] {
  const out: string[][] = [];
  const state = new Map<string, 1 | 2>(); // 1: on the current path, 2: done
  const path: string[] = [];
  const visit = (id: string): void => {
    state.set(id, 1);
    path.push(id);
    for (const dep of engine.usesOfItem(id)) {
      if (!engine.item(dep)) continue;
      const st = state.get(dep);
      if (st === 1) out.push([...path.slice(path.indexOf(dep)), dep]);
      else if (st === undefined) visit(dep);
    }
    path.pop();
    state.set(id, 2);
  };
  for (const it of engine.items()) if (!state.has(it.identifier)) visit(it.identifier);
  return out;
}

export function caseResultKey(
  caseId: string, person: string, identifier: string, month: string | null,
): string {
  return `${caseId}:${person}:${identifier}${month ? `@${month}` : ""}`;
}

export interface BuildCheckReportOptions {
  /** the repository root, needed to run `git show` against `base`. Omit (or
   *  omit `base`) to skip the ratchet below entirely — every changed item's
   *  governance errors then block, same as before this option existed. */
  root?: string;
  /** the base ref the diff was computed against (same ref `diffAgainstBase`
   *  used). */
  base?: string;
}

/** Reads a changed item's base version with `git show <base>:<path>` (the
 *  same path `diffAgainstBase` diffs against), the same way as
 *  `diffAgainstBase` does. Returns `null` when the base ref, the file at that
 *  ref, or the parse is unavailable — the caller then skips the ratchet for
 *  that item rather than failing the check. */
function loadBaseItem(
  root: string, base: string, filePath: string,
): Item | null {
  try {
    const text = execFileSync(
      "git", ["show", `${base}:${filePath}`],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return parseItemFile(text);
  } catch {
    return null;
  }
}

/** Builds the full report from already-loaded ledger data and an already-
 *  computed diff, so it needs no filesystem or git access itself unless
 *  `opts` names a `root` and `base` to ratchet changed items' governance
 *  errors against (MAJOR 1: `npm run check` applies the same ratchet
 *  `src/changes/validate.ts` applies in the app). */
export function buildCheckReport(
  ledger: LoadedLedger, diff: DiffEntry[] | null, knownFailures: readonly string[],
  opts: BuildCheckReportOptions = {},
): CheckReport {
  const engine = createEngine(ledger.items, ledger.meta, {
    sourceIds: ledger.sourceIds, questionIds: ledger.questionIds,
    unverifiedSourceIds: ledger.unverifiedSourceIds ?? [],
  });

  const idByPath = new Map<string, string>();
  for (const it of ledger.items) {
    idByPath.set(`${ledger.volumePath}/${ledger.chapterOf[it.id]}/${it.id}.yaml`, it.id);
  }

  const changedItems = new Set<string>();
  const addedItems = new Set<string>();
  const changedFiles: string[] = [];
  if (diff) {
    for (const e of diff) {
      changedFiles.push(e.path);
      const id = idByPath.get(e.path);
      if (!id) continue;
      changedItems.add(id);
      if (e.status.startsWith("A")) addedItems.add(id);
    }
  }

  const items: ItemCheck[] = ledger.items.map((it) => {
    const isNew = addedItems.has(it.id);
    const isChanged = changedItems.has(it.id);
    const constraintResults = engine.constraints(it);
    let findings = engine.governance(it, { isNew });
    // The ratchet: a *changed* (not added) item's base version is read from
    // git and governed too — on the current engine's index with the base
    // item substituted (cheaper than a second engine, and acceptable per the
    // brief: duplicate-candidate detection excludes an item from comparing
    // against itself by id, which the base item still shares). Any error
    // also present on the base version downgrades to a warning, matching
    // `src/changes/validate.ts`'s `ratchetGovernance`. When the base ref or
    // file is unavailable, the item's findings stand as computed above.
    if (isChanged && !isNew && opts.root && opts.base) {
      const filePath = `${ledger.volumePath}/${ledger.chapterOf[it.id]}/${it.id}.yaml`;
      const baseItem = loadBaseItem(opts.root, opts.base, filePath);
      if (baseItem) findings = ratchetGovernance(findings, engine.governance(baseItem));
    }
    return {
      id: it.id,
      identifier: it.identifier,
      isChanged,
      isNew,
      errors: constraintResults.filter((r) => !r.ok && r.level === "error").map((r) => r.msg),
      warnings: constraintResults.filter((r) => r.level === "warn").map((r) => r.msg),
      governanceErrors: findings
        .filter((f) => f.level === "error").map((f) => `${f.rule}: ${f.msg}`),
      governanceWarnings: findings
        .filter((f) => f.level === "warn").map((f) => `${f.rule}: ${f.msg}`),
    };
  });

  const ruleFailures: RuleTestFailure[] = [];
  const warnings: string[] = [];
  let ruleTotal = 0;
  for (const it of ledger.items) {
    for (const t of it.tests || []) {
      ruleTotal++;
      const result = engine.runTest(it, t);
      for (const w of result.warnings ?? []) warnings.push(`${t.id}: ${w}`);
      if (!result.ok) {
        ruleFailures.push({
          itemId: it.id, identifier: it.identifier, testId: t.id,
          expect: t.expect, got: result.got, err: result.err,
        });
      }
    }
  }

  const caseFailures: CaseFailure[] = [];
  let caseTotal = 0;
  for (const c of ledger.cases) {
    const report = engine.runCase(c);
    for (const r of report.results) {
      caseTotal++;
      for (const w of r.warnings ?? []) {
        warnings.push(`${caseResultKey(c.id, r.person, r.identifier, r.month)}: ${w}`);
      }
      if (!r.ok) {
        caseFailures.push({
          caseId: c.id, person: r.person, identifier: r.identifier, month: r.month,
          key: caseResultKey(c.id, r.person, r.identifier, r.month),
          expect: r.expect, got: r.got, err: r.err,
        });
      }
    }
  }

  const known = new Set(knownFailures);
  const newRuleFailures = ruleFailures.filter((f) => !known.has(f.testId));
  const newCaseFailures = caseFailures.filter((f) => !known.has(f.key));
  const caseOverrides: string[] = [];
  for (const c of ledger.cases) {
    for (const o of derivedOverrides(engine.index, c)) caseOverrides.push(`override:${c.id}:${o}`);
  }
  const newOverrides = caseOverrides.filter((k) => !known.has(k));

  const changedIdentifiers = [...changedItems]
    .map((id) => ledger.items.find((it) => it.id === id)?.identifier)
    .filter((x): x is string => !!x);
  const impact = engine.impact(changedIdentifiers);
  const allOutcomes = (ledger.meta.programs || []).flatMap((p) => p.outcomes || []);
  const affected = new Set([...changedIdentifiers, ...impact]);
  const outcomesAffected = allOutcomes.filter((o) => affected.has(o));

  const blockingItemErrors: BlockingError[] = [];
  for (const it of items) {
    if (!it.isChanged && !it.isNew) continue;
    for (const msg of [...it.errors, ...it.governanceErrors]) {
      blockingItemErrors.push({ id: it.id, identifier: it.identifier, msg });
    }
  }
  // A dependency cycle blocks wherever it is: no engine can evaluate it.
  for (const cycle of dependencyCycles(engine)) {
    const it = engine.item(cycle[0])!;
    blockingItemErrors.push({
      id: it.id, identifier: it.identifier, msg: `dependency cycle: ${cycle.join(" -> ")}`,
    });
  }

  // A test id names one test for good: the conformance suite keys cases by id,
  // so a second test under the same id silently replaces the first there.
  const testOwners = new Map<string, string>();
  for (const it of ledger.items) {
    for (const t of it.tests || []) {
      const prior = testOwners.get(t.id);
      if (prior !== undefined) {
        blockingItemErrors.push({
          id: it.id, identifier: it.identifier,
          msg: `rule test id ${t.id} is used twice (also on ${prior})`,
        });
      } else testOwners.set(t.id, it.id);
    }
  }
  for (const c of ledger.cases) {
    if (testOwners.has(c.id)) {
      blockingItemErrors.push({ id: c.id, identifier: c.id, msg: `case id ${c.id} is also a rule test id` });
    }
  }

  const openQuestions = checkOpenQuestions(ledger.questionIds, ledger.items);
  warnings.push(...inputWarnings(engine, ledger));

  const ok = blockingItemErrors.length === 0
    && newRuleFailures.length === 0
    && newCaseFailures.length === 0
    && newOverrides.length === 0
    && openQuestions.errors.length === 0;

  return {
    base: null, // the caller (runCheck) fills this in with the ref it resolved
    changedFiles,
    changedItems: [...changedItems],
    addedItems: [...addedItems],
    items,
    ruleTests: {
      total: ruleTotal,
      passing: ruleTotal - ruleFailures.length,
      failing: ruleFailures.length,
      failingIds: ruleFailures.map((f) => f.testId),
      failures: ruleFailures,
    },
    cases: {
      total: caseTotal,
      passing: caseTotal - caseFailures.length,
      failing: caseFailures.length,
      failingIds: caseFailures.map((f) => f.key),
      failures: caseFailures,
    },
    impact,
    outcomesAffected,
    knownFailures: [...known],
    newFailures: [
      ...newRuleFailures.map((f) => f.testId), ...newCaseFailures.map((f) => f.key), ...newOverrides,
    ],
    caseOverrides,
    blockingItemErrors,
    openQuestions,
    warnings: [...new Set(warnings)],
    ok,
  };
}

export interface RunCheckOptions {
  root: string;
  /** one volume id; default is the manifest's first volume. `runCheckAll`
   *  runs every volume the manifest lists. */
  volume?: string;
  /** defaults to `process.env.CHECK_BASE`, then `origin/main`. */
  base?: string;
  /** defaults to `<root>/conformance/known-failures.json`. */
  knownFailuresPath?: string;
}

/** Loads the ledger and the diff from disk and returns the full report. This
 *  is what `scripts/check.ts` runs; kept separate from `buildCheckReport` so
 *  tests can supply their own ledger and diff without touching git. */
export function runCheck(opts: RunCheckOptions): CheckReport {
  const base = opts.base ?? process.env.CHECK_BASE ?? "origin/main";
  const ledger = loadLedgerFromDisk(opts.root, opts.volume);
  const diff = diffAgainstBase(opts.root, base);
  const knownFailuresPath =
    opts.knownFailuresPath ?? path.join(opts.root, "conformance/known-failures.json");
  const knownFailures: string[] = fs.existsSync(knownFailuresPath)
    ? JSON.parse(fs.readFileSync(knownFailuresPath, "utf8"))
    : [];
  const report = buildCheckReport(
    ledger, diff, knownFailures, diff ? { root: opts.root, base } : {},
  );
  return { ...report, base: diff ? base : null };
}

/** A short, human-readable rendering of a report, for the console. */
export function formatSummary(r: CheckReport): string {
  const lines: string[] = [];
  lines.push(
    r.base
      ? `base: ${r.base}`
      : "base: could not be resolved; every file was treated as unchanged",
  );
  lines.push(
    `items: ${r.items.length} in the ledger, ` +
      `${r.changedItems.length} changed (${r.addedItems.length} new)`,
  );
  lines.push(`rule tests: ${r.ruleTests.passing}/${r.ruleTests.total} passing`);
  if (r.ruleTests.failing) lines.push(`  failing: ${r.ruleTests.failingIds.join(", ")}`);
  lines.push(`household cases: ${r.cases.passing}/${r.cases.total} expectations passing`);
  if (r.cases.failing) lines.push(`  failing: ${r.cases.failingIds.join(", ")}`);
  if (r.caseOverrides.length) {
    lines.push(`case facts that override a derived rule: ${r.caseOverrides.length}`);
  }
  lines.push(`impact: ${r.impact.length} identifier(s) downstream of the changed items`);
  if (r.outcomesAffected.length) {
    lines.push(`outcomes affected: ${r.outcomesAffected.join(", ")}`);
  }
  if (r.blockingItemErrors.length) {
    lines.push(`blocking errors on changed/added items:`);
    for (const e of r.blockingItemErrors) lines.push(`  ${e.id} ${e.identifier}: ${e.msg}`);
  }
  if (r.openQuestions.errors.length) {
    lines.push(`open-questions.md errors:`);
    for (const e of r.openQuestions.errors) lines.push(`  ${e}`);
  }
  if (r.openQuestions.warnings.length) {
    lines.push(`open-question warnings:`);
    for (const w of r.openQuestions.warnings) lines.push(`  ${w}`);
  }
  if (r.warnings.length) {
    lines.push(`warnings (${r.warnings.length}, not blocking):`);
    for (const w of r.warnings) lines.push(`  ${w}`);
  }
  if (r.newFailures.length) {
    lines.push(
      `new failures not in conformance/known-failures.json: ${r.newFailures.join(", ")}`,
    );
  }
  lines.push(r.ok ? "check: OK" : "check: FAILED");
  return lines.join("\n");
}

/** The ids of every volume in the manifest, in order. */
export function volumeIds(root: string): string[] {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "codex.json"), "utf8"));
  return manifest.volumes.map((v: { id: string }) => v.id);
}

/** One report per volume. A volume with no item files still runs (its
 *  cases and governance are checked over an empty ledger). */
export function runCheckAll(opts: Omit<RunCheckOptions, "volume">): Array<{ volume: string; report: CheckReport }> {
  return volumeIds(opts.root).map((volume) => ({ volume, report: runCheck({ ...opts, volume }) }));
}
