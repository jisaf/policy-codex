/* The check `npm run check` runs: phase-1 constraints, phase-2 governance
 * findings, rule tests, and household cases over the ledger on disk, plus
 * the impact of whatever changed against a base ref. Loading, diffing, and
 * reporting are kept as separate functions so `test/repo/check.test.ts` can
 * drive `buildCheckReport` directly with a constructed diff, without git. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createEngine } from "../engine/engine";
import { parseCases, type HouseholdCase } from "../engine/cases";
import { parseItemFile, parseVolumeFile } from "../engine/yaml";
import { parseOpenQuestions, parseSources } from "../ledger/markdown";
import { ratchetGovernance } from "../changes/validate";
import type { Item, VolumeMeta } from "../engine/types";

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
}

/** Reads the manifest, every item file, `volume.yaml`, `sources.md`,
 *  `open-questions.md`, and `tests/cases.yaml` for the manifest's first
 *  volume, the same way `scripts/handoff.ts` and `scripts/governance-report.ts`
 *  do. `root` is the repository root. */
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
  /** error-level constraint or governance findings on a changed or added item. */
  blockingItemErrors: BlockingError[];
  /** true when there is nothing to block a merge. */
  ok: boolean;
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
      "git", ["show", `${base}:${filePath}`], { cwd: root, encoding: "utf8" },
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
  let ruleTotal = 0;
  for (const it of ledger.items) {
    for (const t of it.tests || []) {
      ruleTotal++;
      const result = engine.runTest(it, t);
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

  const ok = blockingItemErrors.length === 0
    && newRuleFailures.length === 0
    && newCaseFailures.length === 0;

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
    newFailures: [...newRuleFailures.map((f) => f.testId), ...newCaseFailures.map((f) => f.key)],
    blockingItemErrors,
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
  lines.push(`impact: ${r.impact.length} identifier(s) downstream of the changed items`);
  if (r.outcomesAffected.length) {
    lines.push(`outcomes affected: ${r.outcomesAffected.join(", ")}`);
  }
  if (r.blockingItemErrors.length) {
    lines.push(`blocking errors on changed/added items:`);
    for (const e of r.blockingItemErrors) lines.push(`  ${e.id} ${e.identifier}: ${e.msg}`);
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
