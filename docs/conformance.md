# Conformance

How an independent implementation of this codex — a rules engine, a
service, a spreadsheet, anything that claims to compute the same
determinations — proves it agrees with the codex, without running the
codex's TypeScript.

What an implementation needs, per volume:

- `docs/operators.md`: the meaning of every operator in a derivation;
- `conformance/<volume>/ledger.json` (`npm run export`): every item as JSON,
  with its expression tree, type, scope, options, parameter versions and
  dependencies;
- `conformance/<volume>/suite.json` (`npm run conformance`): the cases it
  must answer, described below;
- `handoff/<volume>.md` (`npm run handoff`): the same items for a human
  reader.

## Volumes

The repository holds more than one volume (`codex.json` lists them: `mwr`,
`co`). Every script runs **every volume** unless told otherwise:

```
npm run conformance                  # every volume
npm run conformance -- --volume co   # one volume (also --volume=co,mwr, or CODEX_VOLUME=co)
```

Each volume's files live in `conformance/<volume>/`: `suite.json`,
`results.json` and `ledger.json`. Make sure the suite you grade against is
the volume you are implementing: `suite.codex.volume` says which it is.

## The suite

`npm run conformance` writes `conformance/<volume>/suite.json`: every rule
test attached to an item, every household case in
`volumes/<volume>/tests/cases.yaml`, and one cannot-determine case per
program outcome, normalised to one shape:

```ts
interface Suite {
  codex: { volume: string; sha: string; generated: string };
  volume: {
    default_as_of: string;
    relationship_roles: Array<{ id: string; inverse?: string }>; // see Relationships, below
    outcomes: string[];                                          // every program outcome
  };
  items: SuiteItem[];
  cases: SuiteCase[];
  notes: string[];                    // must be empty; see Notes, below
  cannot_determine_gaps?: string[];   // outcomes with no cannot-determine case
}

interface SuiteItem {
  id: string; identifier: string;
  kind: "supplied" | "derived" | "parameter";
  program: string;
  type: string;                        // "yes/no", "money", "one of", "group of persons", ...
  scope: "person" | "person-month" | "case" | "month" | "global";
  options?: string[];                  // "one of" items
  role?: string;                       // "outcome" on a program result
  effective?: { from: string; to: string };  // both ends inclusive
  uses?: string[];                     // derived items: what the derivation reads directly
  implemented?: "assembly" | "engine";
  implemented_by?: string;
}

interface SuiteCase {
  id: string;
  kind: "rule-test" | "household" | "cannot-determine";
  as_of: string;                                 // the determination date
  parameters?: Record<string, unknown>;          // parameter overrides, if any
  month_facts?: Record<string, Record<string, unknown>>; // case-wide, month-scope facts
  case_facts?: Record<string, unknown>;          // case-scope facts, one value for the case
  persons: Record<string, {
    facts?: Record<string, unknown>;             // person-scope values
    months?: Record<string, Record<string, unknown>>;  // person-month values, by month
    month_defaults?: Record<string, unknown>;    // person-month values for every month not in `months`
    relationships?: Array<[string, string]>;     // [role, other]: "this person is the role of other"
  }>;
  expect: Array<{
    person: string | null;      // null for a case/month/global-scope identifier
    identifier: string;
    month: string | null;       // null unless the identifier is person-month scope
    value: unknown;             // null = unknown ("cannot determine")
    missing?: Array<{ person: string | null; identifier: string; month: string | null }>;
  }>;
  overrides?: Array<{ person: string | null; identifier: string }>;
  ignored?: Array<{ person: string | null; identifier: string; reason: string }>;
  months_read?: { from: string; to: string };
  isolation?: "unit" | "integration";
  derived_from?: { case: string; removed: { person: string | null; identifier: string } };
}
```

Every `expect[].value` is **the codex's own evaluation today** — not
necessarily whatever value happens to be written in the source YAML. A rule
test's or household case's stored expectation can go stale (the derivation
changes, the fixture doesn't); rather than reproduce a stale number into the
suite, `buildSuite` (`src/export/conformance.ts`) evaluates every
expectation itself and records any mismatch as a line in `suite.notes`.

### What a case means

The suite is normalised so that an adapter needs no rule beyond the ones
here to read a case the way the codex does:

- **Facts are routed by scope.** `facts` holds only `person`-scope values;
  `months` and `month_defaults` hold only `person-month` values (a value
  under `month_defaults` applies to every month not listed under `months`);
  `month_facts` holds `month`-scope values; `case_facts` holds `case`-scope
  values (one per case, read by no person). `suite.items[].scope` says which
  is which.
- **`as_of` is the determination date** of the case. A rule test that states
  `determination_date` has it here, not among the facts.
- **A stated value for a derived item replaces its rule.** When a case
  states a value for a derived identifier, an engine must use that value for
  that person (and month) instead of evaluating the item's rule; this is how
  a rule test isolates one rule. Every such input is listed in
  `overrides`. In a forward-chaining engine this means a derived value is
  assigned only when the case did not supply it.
- **Inputs no engine reads are not in the case.** A parameter stated as a
  person's fact, an identifier the volume does not have, a value for an item
  out of force on `as_of`, a case- or global-scope item stated for a person,
  a non-month item under `months`, and the relationships of a person named
  only in a relationship triple (who is not a person of the case) are
  dropped and listed in `ignored` with the reason. `npm run check` warns
  about each one in the source test, so they get fixed at the source.
- **Parameters** come from the ledger (their versions, chosen by `as_of`;
  see `ledger.json`), except where the case's `parameters` overrides one.
- **Relationships** are already expanded: each case-level edge is recorded
  on both persons, the second with the inverse role from
  `suite.volume.relationship_roles`. A person with no `relationships` key has
  unknown relationships; `[]` means none.
- **Groups are ordered lists**: a group's members are listed in the order the
  case declares its persons (the order of the `persons` keys), and are
  compared element by element.

### Case kinds and annotations

- `rule-test`: one item's rule test, expecting that item for `p1` (or with
  no person for a global item). `isolation` is `unit` when the case states
  every derived item the tested item reads directly, so the item can be
  checked on its own, and `integration` when the expectation also needs
  other derived items; bring an engine up item by item with the unit cases
  first.
- `household`: a whole household with expectations for many identifiers,
  persons and months.
- `cannot-determine`: for each program outcome, a household case (or, if no
  household case expects the outcome, one of its rule tests) with one
  supplied fact removed, so the outcome's expected value is `null`.
  `derived_from` names the source case and the removed fact; `missing` lists
  the unstated supplied facts the reference evaluation asked for, in the
  order it asked (left to right, short-circuiting; see
  `docs/operators.md`). `missing` is information, not graded: an engine that
  evaluates more eagerly will find more. An engine that turns an unknown
  into a default fails these cases.
- `months_read` is the first and last month for which the reference engine
  read a per-month value while answering the case: the window a
  forward-chaining engine has to materialise for it. It depends on the
  case's data (a look-back can start at a supplied date), so it is given per
  case, not per item.

### Notes

`suite.notes` lists every expectation that is stale or that the exported
case does not reproduce: after building each case, `buildSuite` evaluates it
again from its exported form, as an adapter would, and notes any difference.
An empty array means the suite is current and self-consistent; `npm run
check` fails otherwise.

## The adapter contract

An adapter is any executable that a shell can run. `scripts/conform.ts`
spawns it and talks to it over stdin/stdout as JSON — nothing about the
adapter's implementation language or runtime matters. The suite's volume is
passed in the payload (`codex`) and in the environment (`CODEX_VOLUME`).

**Per-case (default).** The adapter is spawned once for every case. Stdin
carries exactly one case:

```json
{"codex": {"volume": "mwr", "sha": "...", "generated": "..."},
 "case": {"id": "WR-214-T1", "kind": "rule-test", "as_of": "2027-03-15",
  "persons": {"p1": {"months": {"2027-02": {"is_enrolled_half_time_education": true, "education_hours": 40}}}},
  "expect": [{"person": "p1", "identifier": "medicaid_countable_education_hours", "month": "2027-02", "value": 0}]}}
```

Stdout must be exactly one JSON object naming every identifier the adapter
can answer for that case (it need not answer every one in `expect` — see
Partial coverage, below):

```json
{"values": [{"person": "p1", "identifier": "medicaid_countable_education_hours", "month": "2027-02", "value": 0}]}
```

**Batch (`--batch`).** The adapter is spawned once, total. Stdin carries
every case at once, and stdout must answer all of them, correlated by case
`id`:

```json
{"codex": {...}, "cases": [ {"id": "WR-214-T1", ...}, {"id": "WR-214-T2", ...}, ... ]}
```
```json
{"results": [ {"id": "WR-214-T1", "values": [...]}, {"id": "WR-214-T2", "values": [...]}, ... ]}
```

Use `--batch` whenever spawning is expensive (a JVM, a cold container). A
batch is megabytes (the `co` batch is about 8 MB): read stdin as a stream
to its end, not with one synchronous read, which fails on a non-blocking
pipe (`EAGAIN`). The reference adapter shows how.

Report unknown as `null`. Report nothing at all for an expectation you do not
implement (see Partial coverage); never `null` for "not implemented".

An adapter exits 0. A nonzero exit, or stdout that isn't valid JSON, fails
the whole run with the adapter's stderr attached — that's a harness fault,
not a partial-coverage result.

### Running it

```
npm run conform -- --adapter "<command>" [--volume <id>] [--batch] [--build]
npm run conform -- --adapter "<command>" --suite <path> [--out <path>] [--batch]
```

`<command>` is a single shell command string (quote it if it has arguments),
e.g. `"npx vite-node scripts/adapters/codex-self.ts"`, `"python3
adapters/mine.py"`, or `"java -jar rules-engine.jar --conform"`. Without
`--suite` it grades `conformance/<volume>/suite.json` for every volume (or
the ones `--volume` names; `--build` rebuilds each suite first) and writes
`conformance/<volume>/results.json`:

```ts
interface Results {
  codex: { volume: string; sha: string; generated: string }; // from the suite it ran
  adapter: string;                                            // the command, verbatim
  summary: { cases: number; checked: number; passed: number; failed: number; unimplemented: number };
  failures: Array<{ case: string; person: string | null; identifier: string; month: string | null;
    expected: unknown; got: unknown }>;
}
```

and prints one summary line per volume. It exits 1 when `failed > 0` on any
volume (a real disagreement), so it drops straight into a CI gate —
`unimplemented` (coverage the adapter doesn't have yet) does not fail the
run.

## Partial coverage

An adapter under active development rarely implements everything on day
one. When its output for a case omits an identifier `conform.ts` expected
(or omits a month of it, for a person-month identifier), that expectation
counts as `unimplemented`, not `failed`. Values it does return that disagree
with the codex's are `failed`. This lets a team point `conform` at a
work-in-progress engine from the start and watch `unimplemented` fall and
`passed` rise, without a wall of un-actionable failures for the facts it
hasn't gotten to.

Numeric comparison tolerates floating-point noise (`< 1e-9`); everything
else — booleans, strings, dates, months, arrays (in order), `null` (a
genuine "cannot determine," not a missing answer) — must match exactly. The
codex computes in binary64 and rounds only where a rule says so (see
`docs/operators.md`, Numbers).

## Pinning to a codex sha

`suite.json`'s `codex.sha` is the commit the suite was generated from (with
`-dirty` appended when the working tree had uncommitted changes). To conform
against a specific released version of this codex rather than a working
tree:

```
git -C policy-codex checkout <sha or tag>
npm --prefix policy-codex ci
npm --prefix policy-codex run conformance -- --volume <id>
npm --prefix policy-codex run conform -- --volume <id> --adapter "<your adapter command>"
```

`results.json`'s `codex.sha` then records exactly which codex commit the
numbers in `summary` are against, so a report or a dashboard can show
"adapter X on co@`<sha>`: N passed, M failed, K unimplemented" without
ambiguity about which version of the rules that means.

Only `known-failures.json` in `conformance/` is tracked; everything under
`conformance/<volume>/` is regenerated on demand (each carries a fresh
`generated` timestamp). `npm run check` reads `known-failures.json` to
decide which already-known rule-test or case failures do not block a merge.

## Running it in another repo's CI

The suite and the harness are plain Node scripts with no server and no
credentials, so a consuming repo's CI needs only:

```yaml
- uses: actions/checkout@v4
  with: { repository: jisaf/policy-codex, ref: <pinned sha or tag>, path: policy-codex }
- run: npm ci
  working-directory: policy-codex
- run: npm run conform -- --volume co --build --batch --adapter "<command that runs your engine>"
  working-directory: policy-codex
- run: cat policy-codex/conformance/co/results.json
```

Fail the job on `conform`'s own exit code (1 when `failed > 0`); read
`results.json` in a later step for the full failure list, or to publish
`summary` somewhere more visible than CI logs. Pin `ref` to a tag or sha, not
a branch, so the suite a build is graded against doesn't move under it.

## Shadow evaluation (when the engine can't run synthetic cases)

Some engines are wired only to their production data store and cannot be
handed an arbitrary synthetic case — no test seams, no mock inputs. For
those, the harness's contract doesn't change; only where the case data
comes from does. Instead of the codex's synthetic `persons`/`month_facts`,
replay sampled real determinations the engine already made:

1. For a sample of real cases the engine under test has decided, assemble
   each one as a `SuiteCase` from the same production facts the engine saw
   (`persons`/`month_facts`/`parameters`/`as_of`), with `expect` left to
   whatever the codex itself evaluates for those facts (build the suite with
   `buildSuite`-style logic over that case data, or hand-shape it to match
   the `SuiteCase` interface above — the shape is the contract, not
   `buildSuite`'s ledger-reading).
2. Feed that suite to `conform.ts` exactly as any other suite (`--suite`),
   with an adapter that answers from the engine's own already-made decision
   for that case (not a fresh re-run) — i.e. the adapter's "evaluation" is a
   lookup into the engine's decision log, keyed by whatever the engine used
   to identify that case.
3. Read the result the same way: `failed` is a real disagreement between
   what the codex says the law requires for those facts and what the engine
   actually decided; `unimplemented` is a fact the production record didn't
   capture.

This keeps the grading logic — and the "what counts as a match" rules —
identical between synthetic conformance and shadow evaluation; only the
source of a case's facts changes, from the ledger's own tests to sampled
reality.

## The reference adapter, and the check that runs it

`scripts/adapters/codex-self.ts` (logic in `codex-self-lib.ts`, so it can be
imported without touching stdin) is the codex evaluating its own suite: the
simplest possible adapter, and the harness's own proof that it isn't grading
against itself by accident. It evaluates the volume the payload names
(`codex.volume`; else `--volume` or `CODEX_VOLUME`; it refuses to guess
between several volumes), and reads stdin as a stream.

```
npm run conform:self                  # every volume
npm run conform:self -- --volume co
```

builds each suite and runs the reference adapter on it in batch mode, out of
process, through a pipe, exactly as any adapter is run. It must report `0
failed, 0 unimplemented` on every volume. `npm run check` runs this
self-check for every volume after the ledger checks and fails when any
volume has a failure, an unimplemented expectation or a suite note. It is
the same `npm run check` that `.github/workflows/check.yml` runs; while CI is
unavailable, run it locally before every merge: it is the gate.
`test/export/conformance.test.ts` and `test/export/suite-co.test.ts` check
the same in-process over samples of cases.
