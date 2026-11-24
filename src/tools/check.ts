/* The check `npm run check` runs: phase-1 constraints, phase-2 governance
 * findings, rule tests, and household cases over the ledger on disk, plus
 * the impact of whatever changed against a base ref. Loading, diffing, and
 * reporting are kept as separate functions so `test/repo/check.test.ts` can
 * drive `buildCheckReport` directly with a constructed diff, without git. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createEngine } from "../engine/engine";
import { derivedOverrides, parseCases, type CaseReport, type HouseholdCase } from "../engine/cases";
import { parseItemFile, parseVolumeFile } from "../engine/yaml";
import { parseOpenQuestions, parseSources, sourceTextMap, unverifiedSourceIds } from "../ledger/markdown";
import { buildIndex } from "../engine/ledger-index";
import { jointRecordErrors, personFieldErrors, recordValueErrors, statedRecordLists } from "../engine/records";
import { staleApprovalMessage, type FingerprintBasis } from "../engine/fingerprint";
import {
  changedDecisions, dispositionStub, impactFlags, parseChangeRecord, reconcileImpact,
  type ImpactFlag,
} from "../engine/impact";
import { parse as parseYaml } from "yaml";
import { ratchetGovernance } from "../changes/validate";
import { householdInputs, ruleTestInputs, type Audit } from "../export/conformance";
import { versionInForce } from "../engine/versions";
import { AID_CODES_FILE, aidCodeWarnings, parseAidCodes, type AidCodeMap } from "../ledger/aid-codes";
import type { Engine } from "../engine/engine";
import { stopwatch, timed } from "./profile";
import type { Item, TestSpec, VolumeMeta } from "../engine/types";
import type { TestResult } from "../engine/evaluate";

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
  /** excerpt id -> quoted text from sources.md, which approval fingerprints
   *  hash. Absent (an older caller), the stale-approval check stands down. */
  sourceTexts?: Record<string, string>;
  /** the placeholder aid-code layer, when the volume has `aid-codes.yaml`. */
  aidCodes?: AidCodeMap | null;
  /** every YAML file in the volume's `changes/` directory but the baseline,
   *  by repository path: the dated change records that carry impact
   *  dispositions. */
  changeRecords?: Array<{ path: string; text: string }>;
  /** `changes/impact-baseline.yaml`'s `since`: the commit the change-impact
   *  check starts from when the base ref predates it. */
  impactSince?: string | null;
  /** the volume's `cross-program-allowlist.yaml`, when it has one. */
  crossProgramAllowlist?: CrossProgramAllowlist | null;
}

/** The dated, shrink-only list of shared program calculations
 *  (docs/governance.md "Cross-program links"): each held item and the
 *  program items that read it. */
export interface CrossProgramAllowlist {
  date: string;
  held: Array<{ item: string; identifier?: string; readers: string[] }>;
}

export const ALLOWLIST_FILE = "cross-program-allowlist.yaml";
export const CHANGES_DIR = "changes";
export const IMPACT_BASELINE_FILE = "impact-baseline.yaml";

export function parseAllowlist(text: string): CrossProgramAllowlist {
  const raw = (parseYaml(text) ?? {}) as Record<string, unknown>;
  const date = raw.date instanceof Date ? raw.date.toISOString().slice(0, 10) : String(raw.date ?? "");
  const held = Array.isArray(raw.held) ? raw.held : [];
  return {
    date,
    held: held.map((h) => {
      const r = (h ?? {}) as Record<string, unknown>;
      return {
        item: String(r.item ?? ""),
        ...(r.identifier ? { identifier: String(r.identifier) } : {}),
        readers: Array.isArray(r.readers) ? r.readers.map(String) : [],
      };
    }),
  };
}

/** The allowlist's entries as keys: `CO-n` for a held item, `CO-n<-CO-m`
 *  for each reader it holds. */
export function allowlistKeys(a: CrossProgramAllowlist | null | undefined): string[] {
  if (!a) return [];
  return a.held.flatMap((h) => [h.item, ...h.readers.map((r) => `${h.item}<-${r}`)]);
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
  const aidPath = path.join(root, entry.path, AID_CODES_FILE);
  const aidCodes = fs.existsSync(aidPath) ? parseAidCodes(fs.readFileSync(aidPath, "utf8")) : null;
  const changesDir = path.join(root, entry.path, CHANGES_DIR);
  const changeRecords = fs.existsSync(changesDir)
    ? fs.readdirSync(changesDir).filter((f) => f.endsWith(".yaml") && f !== IMPACT_BASELINE_FILE).sort()
      .map((f) => ({ path: `${entry.path}/${CHANGES_DIR}/${f}`, text: fs.readFileSync(path.join(changesDir, f), "utf8") }))
    : [];
  const baselinePath = path.join(changesDir, IMPACT_BASELINE_FILE);
  const impactSince = fs.existsSync(baselinePath)
    ? String(((parseYaml(fs.readFileSync(baselinePath, "utf8")) ?? {}) as Record<string, unknown>).since ?? "") || null
    : null;
  const allowPath = path.join(root, entry.path, ALLOWLIST_FILE);
  const crossProgramAllowlist = fs.existsSync(allowPath) ? parseAllowlist(fs.readFileSync(allowPath, "utf8")) : null;

  return {
    items,
    meta,
    chapterOf,
    volumePath: entry.path as string,
    cases,
    sourceIds: sources.map((s) => s.id),
    questionIds: openQuestions.map((q) => q.id),
    unverifiedSourceIds: unverifiedSourceIds(sources),
    sourceTexts: sourceTextMap(sources),
    aidCodes,
    changeRecords,
    impactSince,
    crossProgramAllowlist,
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
  /** Change impact (docs/governance.md "Change impact"): the unchanged items
   *  that should probably change with each changed decision, and whether a
   *  change record in the diff dispositions each. Open flags and malformed
   *  records block. */
  changeImpact: ChangeImpactReport;
  /** Cross-program links (docs/governance.md "Cross-program links"): what
   *  the dated allowlist holds (a warning count), and its errors (an entry
   *  no longer needed, an entry the diff adds, a shared calculation it does
   *  not hold), which block. */
  crossProgram: CrossProgramReport;
  /** Non-blocking findings about tests and cases: inputs no engine reads
   *  (parameters stated as person facts, unknown identifiers, persons named
   *  only in a relationship triple, ...), and unknowns produced with no
   *  supplied fact behind them (a table lookup with no row, a parameter with
   *  no version in force, a division by zero). One line each. */
  warnings: string[];
  /** true when there is nothing to block a merge. */
  ok: boolean;
}

export interface ChangeImpactReport {
  /** the ref the decisions were compared against (the base, or the
   *  volume's impact baseline when the base predates the check), or null
   *  when there was none. */
  base: string | null;
  /** items whose decision changed: id -> the fields. */
  changed: Record<string, string[]>;
  flags: ImpactFlag[];
  open: ImpactFlag[];
  settled: number;
  /** dispositions that no longer settle a flag (warnings). */
  stale: string[];
  /** malformed change records in the diff (blocking). */
  errors: string[];
}

export interface CrossProgramReport {
  /** allowlist entries in use: the warning count the ratchet shrinks. */
  held: string[];
  /** blocking: unheld shared calculations, unused or added entries. */
  errors: string[];
}

/** Governance rules that block wherever they land, changed or not, and are
 *  never ratcheted: a stale approval (the change that made it stale is
 *  usually upstream) and the link rules (the volume is fully classified, so
 *  any finding is new). */
const BLOCK_ANYWHERE = ["approval.stale", "read.cross_program", "link.class", "link.declaration", "siblings.symmetric"];
const blocksAnywhere = (rule: string) => BLOCK_ANYWHERE.includes(rule);

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
  out.push(...caseConsistencyWarnings(ledger));
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

/** `unknown:<case>:<person>:<identifier>` for every identifier a household
 *  case states that no item has (dual-entry audit 5.1). */
export function unknownCaseIdentifiers(engine: Engine, ledger: LoadedLedger): string[] {
  const out: string[] = [];
  for (const c of ledger.cases) {
    for (const i of householdInputs(engine, c).audit.ignored) {
      if (i.reason === "unknown identifier") out.push(`unknown:${c.id}:${i.person ?? "case"}:${i.identifier}`);
    }
  }
  return [...new Set(out)].sort();
}

/** `record:<case or test>:<person>: <what is wrong>` for every stated list of
 *  receipts (or other list of records) that does not fit its schema: a field
 *  the schema does not declare, a value of the wrong type, a kind that is
 *  not one of the kinds, a month that is not its date's month
 *  (src/engine/records.ts). A misspelt field would be silently unread, so
 *  each blocks. A required field left out does not: that is how a case
 *  states a value is not known. */
export function recordInputErrors(engine: Engine, ledger: LoadedLedger): string[] {
  const out: string[] = [];
  const by = engine.index.byIdentifier;
  const person = (id: string, pid: string, facts: Record<string, unknown> | undefined) => {
    for (const [it, v] of statedRecordLists(by, facts)) {
      for (const m of recordValueErrors(it, v)) out.push(`record:${id}:${pid}: ${m}`);
    }
  };
  // A joint holding stated on several persons' lists must agree on kind and
  // value, with shares adding to at most 1 (resource records, design 3.2).
  const joint = (id: string, persons: Array<[string, Record<string, unknown> | undefined]>) => {
    const byList = new Map<string, Array<[string, unknown]>>();
    for (const [pid, facts] of persons) {
      for (const [it, v] of statedRecordLists(by, facts)) {
        if (!byList.has(it.identifier)) byList.set(it.identifier, []);
        byList.get(it.identifier)!.push([pid, v]);
      }
    }
    for (const [list, vs] of byList) {
      for (const m of jointRecordErrors(by.get(list)!, vs)) out.push(`record:${id}: ${m}`);
      for (const m of personFieldErrors(by.get(list)!, vs, persons.map(([pid]) => pid))) out.push(`record:${id}: ${m}`);
    }
  };
  for (const c of ledger.cases) {
    for (const [pid, p] of Object.entries(c.persons || {})) person(c.id, pid, p.facts);
    joint(c.id, Object.entries(c.persons || {}).map(([pid, p]) => [pid, p.facts] as [string, Record<string, unknown> | undefined]));
  }
  for (const it of ledger.items) {
    for (const t of it.tests || []) {
      person(t.id, "p1", t.given);
      for (const [pid, f] of Object.entries(t.others || {})) person(t.id, pid, f);
      for (const [pid, p] of Object.entries(t.persons || {})) person(t.id, pid, p.facts);
      joint(t.id, [["p1", t.given], ...Object.entries(t.others || {}),
        ...Object.entries(t.persons || {}).map(([pid, p]) => [pid, p.facts] as [string, Record<string, unknown> | undefined])]);
    }
  }
  return out;
}

/** Case-consistency warnings for facts that survive beside an edge by design
 *  (dual-entry audit 5.14 and section 10 of its order of work): a spouse edge
 *  against a marital status of single or widowed; a Colorado county against a
 *  state other than Colorado; a tax_filer edge from a person stated not to
 *  file; persons who state different values of a fact tagged
 *  `application_wide` (OQ-541). */
export function caseConsistencyWarnings(ledger: LoadedLedger): string[] {
  const out: string[] = [];
  const applicationWide = ledger.items.filter((it) =>
    it.kind === "supplied" && (it.tags ?? []).includes(APPLICATION_WIDE_TAG));
  for (const c of ledger.cases) {
    const rels: Array<readonly string[]> = [...((c.relationships ?? []) as Array<readonly string[]>)];
    for (const [pid, p] of Object.entries(c.persons || {})) {
      for (const r of (p.relationships ?? []) as Array<readonly string[]>) rels.push([r[0], pid, r[1]]);
    }
    const facts = (pid: string): Record<string, unknown> => ((c.persons?.[pid]?.facts ?? {}) as Record<string, unknown>);
    for (const [role, a, b] of rels) {
      if (role === "spouse") {
        for (const who of [a, b]) {
          const ms = facts(who).marital_status;
          if (ms === "single" || ms === "widowed") {
            out.push(`${c.id}: ${who} has a spouse edge but marital_status ${ms}`);
          }
        }
      }
      if (role === "tax_filer" && facts(a).is_tax_filer === false) {
        out.push(`${c.id}: ${a} claims ${b} as a tax dependent (tax_filer edge) but is_tax_filer is false`);
      }
    }
    for (const [pid] of Object.entries(c.persons || {})) {
      const f = facts(pid);
      if (f.county_of_residence !== undefined && f.state_of_residence !== undefined && f.state_of_residence !== "CO") {
        out.push(`${c.id}: ${pid} states a Colorado county (${String(f.county_of_residence)}) but state_of_residence ${String(f.state_of_residence)}`);
      }
    }
    // A fact that is one value for the application (an application date, a
    // request date, the county applied in) is stated on each person, since
    // the engine reads person facts; the persons who state it must agree
    // (OQ-541).
    for (const it of applicationWide) {
      const stated = Object.keys(c.persons || {})
        .filter((pid) => it.identifier in facts(pid))
        .map((pid) => [pid, JSON.stringify(facts(pid)[it.identifier])] as const);
      if (new Set(stated.map(([, v]) => v)).size > 1) {
        out.push(`${c.id}: ${it.identifier} is one value for the application, but the persons state different values (${stated.map(([p, v]) => `${p} ${v}`).join(", ")})`);
      }
    }
  }
  return [...new Set(out)];
}

/** The tag volume.yaml gives a person fact that is one value for the whole
 *  application (OQ-541). */
export const APPLICATION_WIDE_TAG = "application_wide";

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
  /** The ledger at the base ref, so a stale approval names what changed
   *  since. Tests pass one; otherwise it is read from git (`root`, `base`
   *  and the diff) only when some approval is stale. */
  baseline?: { items: Item[]; sourceTexts: Record<string, string> } | null;
  /** The ledger the change-impact check compares decisions against, and
   *  its ref. Defaults to the base ledger above (`baseline`, or read from git
   *  with `root`, `base` and the diff). `runCheck` passes the volume's impact
   *  baseline instead when the base predates it. */
  impactBaseline?: { ref: string; items: Item[] } | null;
  /** The allowlist at the base ref, so an entry the diff adds is refused.
   *  Defaults to reading it from git when the diff touches the file;
   *  `null` when the base has none (the allowlist is being introduced). */
  baseAllowlist?: CrossProgramAllowlist | null;
  /** Receives the engine and the evaluations the check made, so the
   *  conformance self-check can build its suite from them instead of
   *  loading and evaluating the volume again (scripts/check.ts). */
  share?: (shared: CheckShared) => void;
}

/** What one volume's check evaluated: the engine, every rule test's result
 *  and every household case's report, keyed by the test and case objects of
 *  the ledger it was given. */
export interface CheckShared {
  engine: Engine;
  ledger: LoadedLedger;
  testResults: ReadonlyMap<TestSpec, TestResult>;
  caseReports: ReadonlyMap<HouseholdCase, CaseReport>;
}

/** The ledger as it stood at `base`: the current items with every item file
 *  the diff touches read back from git (added ones dropped, deleted ones
 *  restored), and sources.md read back when the diff touches it. An item
 *  file git cannot read at `base` is taken as unchanged. */
export function loadBaseline(
  root: string, base: string, ledger: LoadedLedger, diff: readonly DiffEntry[],
): { items: Item[]; sourceTexts: Record<string, string> } {
  const byId = new Map(ledger.items.map((it) => [it.id, it]));
  let sourceTexts = ledger.sourceTexts ?? {};
  const prefix = `${ledger.volumePath}/`;
  const itemFile = (e: DiffEntry) => /\/([A-Za-z]+-\d+)\.yaml$/.exec(e.path);
  const was = loadBaseItems(root, base, diff
    .filter((e) => e.path.startsWith(prefix) && e.path !== `${prefix}sources.md` && itemFile(e) && !e.status.startsWith("A"))
    .map((e) => e.path));
  for (const e of diff) {
    if (!e.path.startsWith(prefix)) continue;
    if (e.path === `${prefix}sources.md`) {
      try {
        const text = execFileSync(
          "git", ["show", `${base}:${e.path}`],
          { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
        );
        sourceTexts = sourceTextMap(parseSources(text));
      } catch {
        sourceTexts = {};
      }
      continue;
    }
    const m = itemFile(e);
    if (!m) continue;
    if (e.status.startsWith("A")) { byId.delete(m[1]); continue; }
    const it = was.get(e.path);
    if (it) byId.set(it.id, it);
  }
  return { items: [...byId.values()], sourceTexts };
}

/** Reads changed items' base versions, `<base>:<path>` for each path (the
 *  same paths `diffAgainstBase` diffs against), in one `git cat-file
 *  --batch`. A path maps to `null` when the base ref, the file at that ref,
 *  or the parse is unavailable — the caller then skips the ratchet for that
 *  item rather than failing the check. */
function loadBaseItems(
  root: string, base: string, filePaths: readonly string[],
): Map<string, Item | null> {
  const out = new Map<string, Item | null>();
  for (const [p, text] of gitShowMany(root, base, filePaths)) {
    let it: Item | null = null;
    if (text !== null) {
      try { it = parseItemFile(text); } catch { it = null; }
    }
    out.set(p, it);
  }
  return out;
}

/** The text of each `<ref>:<path>`, as `git show <ref>:<path>` prints it,
 *  read in one `git cat-file --batch` rather than one process per file;
 *  `null` for a path git cannot read at that ref (or when git cannot run). */
export function gitShowMany(
  root: string, ref: string, filePaths: readonly string[],
): Map<string, string | null> {
  const out = new Map<string, string | null>();
  const paths = [...new Set(filePaths)];
  for (const p of paths) out.set(p, null);
  if (!paths.length) return out;
  let buf: Buffer;
  try {
    buf = execFileSync("git", ["cat-file", "--batch"], {
      cwd: root, input: paths.map((p) => `${ref}:${p}`).join("\n") + "\n",
      stdio: ["pipe", "pipe", "ignore"], maxBuffer: 1024 * 1024 * 1024,
    });
  } catch {
    return out;
  }
  // Each answer is "<sha> <type> <size>\n<content>\n", or "<name> missing\n"
  // (or "ambiguous"), in the order asked.
  let pos = 0;
  for (const p of paths) {
    const nl = buf.indexOf(0x0a, pos);
    if (nl < 0) break;
    const header = buf.toString("utf8", pos, nl);
    pos = nl + 1;
    const m = /^[0-9a-f]+ (\S+) (\d+)$/.exec(header);
    if (!m) continue;
    const size = Number(m[2]);
    if (m[1] === "blob") out.set(p, buf.toString("utf8", pos, pos + size));
    pos += size + 1;
  }
  return out;
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
  const lap = stopwatch();
  const engine = createEngine(ledger.items, ledger.meta, {
    sourceIds: ledger.sourceIds, questionIds: ledger.questionIds,
    unverifiedSourceIds: ledger.unverifiedSourceIds ?? [],
    ...(ledger.sourceTexts ? { sourceTexts: ledger.sourceTexts } : {}),
  });

  // The ledger at the base ref, built at most once and only when some
  // approval is stale, so the message can name what changed since.
  let baselineBasis: FingerprintBasis | null | undefined;
  const baseline = (): FingerprintBasis | null => {
    if (baselineBasis !== undefined) return baselineBasis;
    const b = opts.baseline !== undefined
      ? opts.baseline
      : opts.root && opts.base && diff ? loadBaseline(opts.root, opts.base, ledger, diff) : null;
    baselineBasis = b
      ? { ix: buildIndex(b.items, ledger.meta.relationship_roles ?? null), sourceTexts: b.sourceTexts }
      : null;
    return baselineBasis;
  };

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

  lap("check: engine");
  // Every rule test is run once, here; the constraints below (which report
  // each example's result) and the rule-test summary share the results.
  const testResults = new Map<TestSpec, TestResult>();
  for (const it of ledger.items) {
    for (const t of it.tests || []) testResults.set(t, engine.runTest(it, t));
  }
  lap("check: rule tests");
  // The base version of every changed item, read from git in one batch for
  // the ratchet below.
  const baseItems = opts.root && opts.base
    ? loadBaseItems(opts.root, opts.base, ledger.items
      .filter((it) => changedItems.has(it.id) && !addedItems.has(it.id))
      .map((it) => `${ledger.volumePath}/${ledger.chapterOf[it.id]}/${it.id}.yaml`))
    : new Map<string, Item | null>();
  lap("check: ratchet base items (git)");
  const items: ItemCheck[] = ledger.items.map((it) => {
    const isNew = addedItems.has(it.id);
    const isChanged = changedItems.has(it.id);
    const constraintResults = engine.constraints(it, { testResult: (t) => testResults.get(t) });
    let findings = engine.governance(it, { isNew });
    // A stale approval is never ratcheted: it is about the signatures, not
    // the item's content, and it blocks wherever it is (below). Nor are the
    // link rules (BLOCK_ANYWHERE).
    let stale = findings.filter((f) => f.rule === "approval.stale");
    const anywhere = findings.filter((f) => blocksAnywhere(f.rule) && f.rule !== "approval.stale");
    findings = findings.filter((f) => !blocksAnywhere(f.rule));
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
      const baseItem = baseItems.get(filePath) ?? null;
      if (baseItem) findings = ratchetGovernance(findings, engine.governance(baseItem));
    }
    if (stale.length && ledger.sourceTexts) {
      const named = staleApprovalMessage(
        { ix: engine.index, sourceTexts: ledger.sourceTexts }, it,
        { baseline: baseline() },
      );
      if (named) stale = [{ ...stale[0], msg: named }];
    }
    findings = [...findings, ...anywhere, ...stale];
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

  lap("check: constraints and governance");
  const ruleFailures: RuleTestFailure[] = [];
  const warnings: string[] = [];
  let ruleTotal = 0;
  for (const it of ledger.items) {
    for (const t of it.tests || []) {
      ruleTotal++;
      const result = testResults.get(t) ?? engine.runTest(it, t);
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
  const caseReports = new Map<HouseholdCase, CaseReport>();
  let caseTotal = 0;
  for (const c of ledger.cases) {
    const report = engine.runCase(c);
    caseReports.set(c, report);
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

  lap("check: households");
  const known = new Set(knownFailures);
  const newRuleFailures = ruleFailures.filter((f) => !known.has(f.testId));
  const newCaseFailures = caseFailures.filter((f) => !known.has(f.key));
  const caseOverrides: string[] = [];
  for (const c of ledger.cases) {
    for (const o of derivedOverrides(engine.index, c)) caseOverrides.push(`override:${c.id}:${o}`);
  }
  const newOverrides = caseOverrides.filter((k) => !known.has(k));
  // Dual-entry audit 5.1: an identifier no item has, stated in a household
  // case, blocks (it reads as a fact the engine never sees). Keys are
  // `unknown:<case>:<person>:<identifier>`; known-failures.json may list one.
  const newUnknownCaseIdentifiers = unknownCaseIdentifiers(engine, ledger).filter((k) => !known.has(k));
  // A stated list of receipts that does not fit its schema blocks.
  const newRecordErrors = recordInputErrors(engine, ledger).filter((k) => !known.has(k));

  lap("check: overrides, unknown identifiers, records");
  const changedIdentifiers = [...changedItems]
    .map((id) => ledger.items.find((it) => it.id === id)?.identifier)
    .filter((x): x is string => !!x);
  const impact = engine.impact(changedIdentifiers);
  const allOutcomes = (ledger.meta.programs || []).flatMap((p) => p.outcomes || []);
  const affected = new Set([...changedIdentifiers, ...impact]);
  const outcomesAffected = allOutcomes.filter((o) => affected.has(o));

  const blockingItemErrors: BlockingError[] = [];
  for (const it of items) {
    // A stale approval blocks on every item, changed or not: the change that
    // made it stale is usually to something upstream of it. So do the link
    // rules (BLOCK_ANYWHERE).
    const msgs = !it.isChanged && !it.isNew
      ? it.governanceErrors.filter((m) => blocksAnywhere(m.slice(0, m.indexOf(":"))))
      : [...it.errors, ...it.governanceErrors];
    for (const msg of msgs) {
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

  lap("check: impact, cycles, test ids");
  const changeImpact = changeImpactOf(ledger, engine, diff, opts, baseline, addedItems);
  lap("check: change impact");
  const crossProgram = crossProgramOf(ledger, items, diff, opts);

  const openQuestions = checkOpenQuestions(ledger.questionIds, ledger.items);
  lap("check: cross-program, open questions");
  warnings.push(...inputWarnings(engine, ledger));
  if (ledger.aidCodes) warnings.push(...aidCodeWarnings(engine, ledger.aidCodes));
  lap("check: input warnings");
  opts.share?.({ engine, ledger, testResults, caseReports });

  const ok = blockingItemErrors.length === 0
    && newRuleFailures.length === 0
    && newCaseFailures.length === 0
    && newOverrides.length === 0
    && newUnknownCaseIdentifiers.length === 0
    && newRecordErrors.length === 0
    && openQuestions.errors.length === 0
    && changeImpact.open.length === 0
    && changeImpact.errors.length === 0
    && crossProgram.errors.length === 0;

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
      ...newUnknownCaseIdentifiers, ...newRecordErrors,
    ],
    caseOverrides,
    blockingItemErrors,
    openQuestions,
    changeImpact,
    crossProgram,
    warnings: [...new Set(warnings)],
    ok,
  };
}

/** The change-impact flags of a diff and the dispositions the diff's change
 *  records give them (src/engine/impact.ts). */
function changeImpactOf(
  ledger: LoadedLedger, engine: Engine, diff: DiffEntry[] | null, opts: BuildCheckReportOptions,
  baseline: () => FingerprintBasis | null, addedItems: ReadonlySet<string>,
): ChangeImpactReport {
  const empty: ChangeImpactReport = { base: null, changed: {}, flags: [], open: [], settled: 0, stale: [], errors: [] };
  if (!diff) return empty;
  let ref: string | null;
  let before: Item[] | null;
  if (opts.impactBaseline !== undefined) {
    ref = opts.impactBaseline?.ref ?? null;
    before = opts.impactBaseline?.items ?? null;
  } else {
    const b = baseline();
    ref = b ? opts.base ?? "base" : null;
    before = b ? b.ix.items : null;
  }
  if (!before) return empty;
  const changed = changedDecisions(before, ledger.items);
  const had = new Set(before.map((it) => it.id));
  const touched = new Set<string>([...changed.keys(), ...addedItems]);
  for (const it of ledger.items) if (!had.has(it.id)) touched.add(it.id);
  const flags = impactFlags(
    { ix: engine.index, sourceTexts: ledger.sourceTexts ?? {} }, changed, touched,
  );
  // Dispositions come from the change records this diff adds or edits: the
  // pull request's own record. Older records are history.
  const inDiff = new Set(diff.filter((e) => !e.status.startsWith("D")).map((e) => e.path));
  const errors: string[] = [];
  const dispositions = [];
  for (const rec of ledger.changeRecords ?? []) {
    if (!inDiff.has(rec.path)) continue;
    const parsed = parseChangeRecord(rec.text, rec.path);
    errors.push(...parsed.errors);
    dispositions.push(...parsed.dispositions);
  }
  const r = reconcileImpact(flags, dispositions);
  return {
    base: ref,
    changed: Object.fromEntries(changed),
    flags,
    open: r.open,
    settled: r.settled.length,
    stale: r.stale,
    errors,
  };
}

/** What the cross-program allowlist holds, and what it must not: a shared
 *  program calculation (or a reader of one) it does not list, an entry no
 *  longer needed, an entry the diff adds. */
function crossProgramOf(
  ledger: LoadedLedger, items: readonly ItemCheck[], diff: DiffEntry[] | null, opts: BuildCheckReportOptions,
): CrossProgramReport {
  const allow = ledger.crossProgramAllowlist ?? null;
  const keys = new Set(allowlistKeys(allow));
  const needed = new Set<string>();
  const errors: string[] = [];
  const byIdentifier = new Map(ledger.items.map((it) => [it.identifier, it]));
  for (const ic of items) {
    for (const w of ic.governanceWarnings) {
      if (!w.startsWith("link.shared_calculation:")) continue;
      const read = /reads (\S+) \((\S+)\), a program calculation/.exec(w);
      const key = read ? `${byIdentifier.get(read[1])?.id ?? read[2]}<-${ic.id}` : ic.id;
      needed.add(key);
      if (!keys.has(key)) {
        errors.push(read
          ? `${ic.id} ${ic.identifier} reads ${read[1]}, a shared program calculation, and the allowlist does not hold this reader; read the program's own item (the allowlist only shrinks)`
          : `${ic.id} ${ic.identifier} is a shared program calculation the allowlist does not hold; split it per program (the allowlist only shrinks)`);
      }
    }
  }
  const allowPath = `${ledger.volumePath}/${ALLOWLIST_FILE}`;
  for (const k of keys) {
    if (!needed.has(k)) errors.push(`${allowPath}: ${k} is no longer needed; remove it`);
  }
  // Shrink only: an entry the base did not have is refused. When the base
  // has no allowlist the diff introduces it, and its entries stand.
  let base: CrossProgramAllowlist | null | undefined = opts.baseAllowlist;
  const touched = diff?.find((e) => e.path === allowPath);
  if (base === undefined) {
    base = touched && opts.root && opts.base && !touched.status.startsWith("A")
      ? readBaseAllowlist(opts.root, opts.base, allowPath)
      : touched ? null : allow;
  }
  if (base) {
    const was = new Set(allowlistKeys(base));
    for (const k of keys) if (!was.has(k)) errors.push(`${allowPath}: ${k} is new; the allowlist only shrinks`);
  }
  return { held: [...needed].filter((k) => keys.has(k)).sort(), errors };
}

function readBaseAllowlist(root: string, base: string, filePath: string): CrossProgramAllowlist | null {
  try {
    const text = execFileSync(
      "git", ["show", `${base}:${filePath}`],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return parseAllowlist(text);
  } catch {
    return null;
  }
}

/** Whether `a` is an ancestor of `b` (or the same commit). */
function isAncestor(root: string, a: string, b: string): boolean {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", a, b], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** The ref the change-impact check compares against: the base, unless the
 *  base predates the volume's impact baseline (the commit the check was
 *  introduced at), which then stands in for it, so the check does not flag
 *  changes made before it existed. Once the base contains the baseline,
 *  the base is used. */
export function impactRef(root: string, base: string, since: string | null | undefined): string {
  if (!since) return base;
  if (isAncestor(root, base, since) && isAncestor(root, since, "HEAD") && !isAncestor(root, since, base)) return since;
  return base;
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
  /** See BuildCheckReportOptions.share. */
  share?: (shared: CheckShared) => void;
}

/** The keys in `conformance/known-failures.json` (or `file`), or none when
 *  the file is absent. Read by the check and by the conformance suite build. */
export function loadKnownFailures(root: string, file?: string): string[] {
  const p = file ?? path.join(root, "conformance/known-failures.json");
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, "utf8")) as string[]) : [];
}

/** Loads the ledger and the diff from disk and returns the full report. This
 *  is what `scripts/check.ts` runs; kept separate from `buildCheckReport` so
 *  tests can supply their own ledger and diff without touching git. */
export function runCheck(opts: RunCheckOptions): CheckReport {
  const base = opts.base ?? process.env.CHECK_BASE ?? "origin/main";
  const ledger = timed("load ledger", () => loadLedgerFromDisk(opts.root, opts.volume));
  const diff = timed("git diff", () => diffAgainstBase(opts.root, base));
  const knownFailures = loadKnownFailures(opts.root, opts.knownFailuresPath);
  let impactBaseline: BuildCheckReportOptions["impactBaseline"];
  const lap = stopwatch();
  if (diff) {
    const ref = impactRef(opts.root, base, ledger.impactSince);
    if (ref !== base) {
      const since = diffAgainstBase(opts.root, ref);
      impactBaseline = since ? { ref, items: loadBaseline(opts.root, ref, ledger, since).items } : null;
    }
  }
  lap("impact baseline (git)");
  const report = buildCheckReport(
    ledger, diff, knownFailures,
    {
      ...(diff ? { root: opts.root, base, ...(impactBaseline !== undefined ? { impactBaseline } : {}) } : {}),
      ...(opts.share ? { share: opts.share } : {}),
    },
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
  const unknownIds = r.newFailures.filter((k) => k.startsWith("unknown:"));
  if (unknownIds.length) {
    lines.push(`case identifiers no item has (blocking): ${unknownIds.join(", ")}`);
  }
  const recordErrors = r.newFailures.filter((k) => k.startsWith("record:"));
  if (recordErrors.length) {
    lines.push(`stated receipts that do not fit their schema (blocking):`);
    for (const k of recordErrors) lines.push(`  ${k.slice(7)}`);
  }
  lines.push(`impact: ${r.impact.length} identifier(s) downstream of the changed items`);
  if (r.outcomesAffected.length) {
    lines.push(`outcomes affected: ${r.outcomesAffected.join(", ")}`);
  }
  if (r.blockingItemErrors.length) {
    lines.push(`blocking errors (changed or added items; stale approvals anywhere):`);
    for (const e of r.blockingItemErrors) lines.push(`  ${e.id} ${e.identifier}: ${e.msg}`);
  }
  const ci = r.changeImpact;
  if (ci.base) {
    lines.push(
      `change impact (since ${ci.base}): ${Object.keys(ci.changed).length} decision(s) changed, ` +
        `${ci.flags.length} flag(s), ${ci.settled} dispositioned, ${ci.open.length} open`,
    );
  }
  if (ci.open.length) {
    lines.push(`change-impact flags with no disposition (blocking); add them to this pull request's change record, volumes/<volume>/changes/<date>-<slug>.yaml, under impact:, with applies: "<how it is fixed in this PR>" or not_applicable: "<reason>":`);
    for (const f of ci.open) lines.push(dispositionStub(f));
  }
  for (const e of ci.errors) lines.push(`change record error (blocking): ${e}`);
  for (const s of ci.stale) lines.push(`stale disposition: ${s}`);
  if (r.crossProgram.held.length) {
    lines.push(`cross-program allowlist: ${r.crossProgram.held.length} shared calculation(s) and reader(s) held (warnings; the allowlist only shrinks)`);
  }
  for (const e of r.crossProgram.errors) lines.push(`cross-program link error (blocking): ${e}`);
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
