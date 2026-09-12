# Conformance

How an independent implementation of this codex — a rules engine, a
service, a spreadsheet, anything that claims to compute the same
determinations — proves it agrees with the codex, without running the
codex's TypeScript.

## The suite

```
npm run conformance
```

writes `conformance/suite.json`: every rule test attached to an item, and
every household case in `volumes/mwr/tests/cases.yaml`, normalised to one
shape:

```ts
interface SuiteCase {
  id: string;
  kind: "rule-test" | "household";
  as_of: string;                                 // the determination date
  parameters?: Record<string, unknown>;          // parameter overrides, if any
  month_facts?: Record<string, Record<string, unknown>>; // case-wide, month-scope facts
  persons: Record<string, {
    facts?: Record<string, unknown>;
    months?: Record<string, Record<string, unknown>>;
    relationships?: Array<[string, string]>;
    month_defaults?: Record<string, unknown>;
  }>;
  expect: Array<{
    person: string | null;      // null for a case/month/global-scope identifier
    identifier: string;
    month: string | null;       // null unless the identifier is person-month scope
    value: unknown;
  }>;
}
```

Every `expect[].value` is **the codex's own evaluation today** — not
necessarily whatever value happens to be written in the source YAML. A rule
test's or household case's stored expectation can go stale (the derivation
changes, the fixture doesn't); rather than reproduce a stale number into the
suite, `buildSuite` (`src/export/conformance.ts`) evaluates every
expectation itself and records any mismatch as a line in `suite.notes`. Read
`suite.notes` before trusting a suite you didn't just generate — an empty
array means every expectation is current.

`conformance/suite.json` also carries `codex: { volume, sha, generated }` —
`sha` is `git rev-parse HEAD` at generation time (`"unknown"` outside a git
checkout) — and one row per ledger item (`id`, `identifier`, `kind`,
`program`, `implemented`, `implemented_by`), so an adapter or a report can
say which items it covers.

`conformance/` is git-ignored: `suite.json` carries a fresh `generated`
timestamp on every run, so it is never byte-identical across two runs even
against the same commit. Regenerate it whenever you need it; don't expect it
committed.

## The adapter contract

An adapter is any executable that a shell can run. `scripts/conform.ts`
spawns it and talks to it over stdin/stdout as JSON — nothing about the
adapter's implementation language or runtime matters.

**Per-case (default).** The adapter is spawned once for every case. Stdin
carries exactly one case:

```json
{"case": {"id": "WR-214-T1", "kind": "rule-test", "as_of": "2027-03-15",
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
{"cases": [ {"id": "WR-214-T1", ...}, {"id": "WR-214-T2", ...}, ... ]}
```
```json
{"results": [ {"id": "WR-214-T1", "values": [...]}, {"id": "WR-214-T2", "values": [...]}, ... ]}
```

Use `--batch` whenever spawning is expensive (a JVM, a cold container) —
`conform:self` uses it so `npx vite-node` only starts once instead of 146
times.

An adapter exits 0. A nonzero exit, or stdout that isn't valid JSON, fails
the whole run with the adapter's stderr attached — that's a harness fault,
not a partial-coverage result.

### Running it

```
npm run conform -- --adapter "<command>" [--suite conformance/suite.json] [--out conformance/results.json] [--batch]
```

`<command>` is a single shell command string (quote it if it has arguments),
e.g. `"npx vite-node scripts/adapters/codex-self.ts"`, `"python3
adapters/mine.py"`, or `"java -jar rules-engine.jar --conform"`. It writes
`conformance/results.json`:

```ts
interface Results {
  codex: { volume: string; sha: string; generated: string }; // from the suite it ran
  adapter: string;                                            // the command, verbatim
  summary: { cases: number; checked: number; passed: number; failed: number; unimplemented: number };
  failures: Array<{ case: string; person: string | null; identifier: string; month: string | null;
    expected: unknown; got: unknown }>;
}
```

and prints the summary line. It exits 1 when `failed > 0` (a real
disagreement), so it drops straight into a CI gate — `unimplemented`
(coverage the adapter doesn't have yet) does not fail the run.

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
else — booleans, strings, dates, months, arrays, `null` (a genuine "cannot
determine," not a missing answer) — must match exactly.

## Pinning to a codex sha

`conformance/suite.json`'s `codex.sha` is the commit the suite was generated
from. To conform against a specific released version of this codex rather
than a working tree:

```
git -C policy-codex checkout <sha or tag>
npm --prefix policy-codex ci
npm --prefix policy-codex run conformance
npm --prefix policy-codex run conform -- --adapter "<your adapter command>"
```

`conformance/results.json`'s `codex.sha` then records exactly which codex
commit the numbers in `summary` are against, so a report or a dashboard can
show "adapter X on codex@`<sha>`: N passed, M failed, K unimplemented"
without ambiguity about which version of the rules that means.

## Running it in another repo's CI

The suite and the harness are plain Node scripts with no server and no
credentials, so a consuming repo's CI needs only:

```yaml
- uses: actions/checkout@v4
  with: { repository: jisaf/policy-codex, ref: <pinned sha or tag>, path: policy-codex }
- run: npm ci
  working-directory: policy-codex
- run: npm run conformance
  working-directory: policy-codex
- run: npm run conform -- --adapter "<command that runs your engine, checked out elsewhere in this job>"
  working-directory: policy-codex
- run: cat policy-codex/conformance/results.json
```

Fail the job on `conform`'s own exit code (1 when `failed > 0`); read
`conformance/results.json` in a later step for the full failure list, or to
publish `summary` somewhere more visible than CI logs. Pin `ref` to a tag or
sha, not a branch, so the suite a build is graded against doesn't move under
it.

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
2. Feed that suite to `conform.ts` exactly as any other suite, with an
   adapter that answers from the engine's own already-made decision for that
   case (not a fresh re-run) — i.e. the adapter's "evaluation" is a lookup
   into the engine's decision log, keyed by whatever the engine used to
   identify that case.
3. Read the result the same way: `failed` is a real disagreement between
   what the codex says the law requires for those facts and what the engine
   actually decided; `unimplemented` is a fact the production record didn't
   capture.

This keeps the grading logic — and the "what counts as a match" rules —
identical between synthetic conformance and shadow evaluation; only the
source of a case's facts changes, from the ledger's own tests to sampled
reality.

## The reference adapter

`scripts/adapters/codex-self.ts` (logic in `codex-self-lib.ts`, so it can be
imported without touching stdin) is the codex evaluating its own suite: the
simplest possible adapter, and the harness's own proof that it isn't grading
against itself by accident.

```
npm run conform:self
```

runs it in batch mode and must report `0 failed, 0 unimplemented` — that's
what `test/export/conformance.test.ts` also checks, in-process, over a
sample of cases.
