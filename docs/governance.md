# Governance

How the ledger is kept correct as more than one person changes it. This is
the operational companion to `docs/design-governance.md` (the spec) and
`docs/conventions.md` (the ledger grammar); read those first for the "why".

## Vocabulary

Plain-language labels used throughout the app and docs, with the ledger's
technical term as an alias:

| Plain language | Technical term |
|---|---|
| a fact we are told | `supplied` |
| a rule | `derived` |
| a number set by policy | `parameter` |
| per person | `person` |
| per person, per month | `person-month` |
| per household | `case` |
| per month | `month` |
| for everyone | `global` |

## Roles

- **Program administrator.** Owns a program's outcomes (`medicaid_ce_status_at_application`
  and friends). Answers "is program X calculated properly?" from the Cases
  view: per-program pass/fail on household cases, with plain-English traces.
  In the app: reviews any pull request that touches one of their outcomes or
  anything upstream of it (the "Outcomes affected" section of the PR body),
  approves through the normal GitHub review, and is the one CODEOWNERS should
  eventually name for their program's chapters.
- **Automation SME (steward).** Owns a chapter (a program's rules, the
  supplied facts, the parameters) end to end: does the implementation match
  the codex, and does the codex match the statute? Authors and reviews items
  through the app's Propose flow, reads `npm run check`'s output on their own
  pull requests, and is the second reviewer named in the PR checklist.
- **Division director.** Audits a determination after the fact: was the
  error one of interpretation (the codex is wrong) or implementation (the
  engine doesn't match the codex)? Uses the explain view on a pinned commit
  (`@<sha>`) to compare the codex's answer and trace against the production
  answer for the same facts. Does not normally review pull requests.

## Review lanes

Every pull request is one of three lanes, and a PR can be more than one at
once:

1. **Item PR.** Adds or edits one or more items. Reviewed by the chapter's
   steward (second SME). Blocked by any error-level constraint or governance
   finding on a changed or added item (see the table below).
2. **Vocabulary PR.** Edits `volume.yaml`'s `programs`, `tags`, `types`, or
   `scopes`. These are closed vocabularies (`vocab.*` below): anything not
   declared there is an error on every item that uses it, so widening the
   vocabulary is itself a reviewed change, not a side effect of an item edit.
   Reviewed by whoever owns `volume.yaml` in `.github/CODEOWNERS`.
3. **Outcome-affecting PR.** An item PR where the item itself, or anything
   `npm run check`'s impact analysis finds downstream of it, is a declared
   program outcome. Needs the program administrator's approval in addition
   to the steward's, per the PR checklist.

## The ratchet rule

An edit to an item that already has a governance error before the edit does
not gain a new error for the same rule and message — it is downgraded to a
warning instead (`src/changes/validate.ts`, `governanceOf`). This is what
lets the ledger improve incrementally: today's ledger has known-bad items
(see `docs/conventions.md`'s note on the six pinned constraint failures; a seventh, WR-101's versioned value, was a constraint gap fixed in the Colorado phase 2),
and an editor who touches one of them for an unrelated reason is not made to
fix everything else about it first. The ratchet only ever loosens what was
already broken; it never lets a genuinely new problem through, and it does
not apply to new items at all (`isNew: true` skips it, since there is no
"before" to compare against).

`npm run check` applies the same idea across a whole diff, one level up:
constraint and governance errors only block when they land on a file the
diff actually touched (added or edited). An error the ledger already carried
on an untouched item is not this pull request's problem, so it never blocks.

## Adding a tag or a program

Both are declared in `volume.yaml`; add the term there in its own commit or
its own section of a mixed PR, reviewed as a vocabulary PR (see above), then
use it on items in the same or a later PR:

```yaml
programs:
  - id: SNAP
    prefix: snap_
    outcomes: [snap_time_limit_status]   # add an outcome here to make it
                                          # accountable to the SNAP
                                          # administrator
tags: [legal, medical, state_election]   # add a bare string here to allow it
```

A program needs a `prefix` (or `null` for a shared, cross-program vocabulary
like `All`); every derived item under that program must start with it
(`name.prefix`, error), and parameters usually should (same rule, warn).
Supplied facts are exempt: they are the interface to outside data systems and
stay program-neutral on purpose, so a bespoke input never looks like a
sanctioned Medicaid or SNAP name.

## What blocks, and why

Phase-1 constraints (`src/engine/constraints.ts`) and phase-2 governance
findings (`src/engine/governance.ts`) both carry a level. `error` blocks
Propose in the app and blocks `npm run check` on a changed or added item;
`warn` is shown and must be acknowledged in the rationale, but does not
block. The governance rule ids:

| Rule | Meaning | Level | Fix |
|---|---|---|---|
| `vocab.program` | The item's `program` is not one of `volume.yaml`'s declared programs | error | declare the program, or fix the typo |
| `vocab.tag` | One of the item's `tags` is not declared | error | declare the tag, or remove it |
| `vocab.type` | The item's `type` is not one of `volume.yaml`'s declared types | error | use a declared type |
| `vocab.scope` | The item's `scope` is not one of `volume.yaml`'s declared scopes | error | use a declared scope |
| `name.grammar` | The identifier is not `^[a-z][a-z0-9_]*$` | error | rename (use the app's Rename tool, which updates every reference) |
| `name.reserved` | The identifier shadows a pattern-catalog operator (`case`, `at`, `rel`, …) | error | rename |
| `name.digits` | The identifier has a digit run that looks like it encodes a value (`ce_status_36_month`) | error | name the rule and make the number a parameter instead |
| `name.prefix` | A program-owned item's identifier does not start with its program's prefix, or a shared (`All`) item's identifier starts with someone else's prefix | error on derived items and on a shared item using another program's prefix; warn on parameters | rename to match, or move the item to the right program |
| `supplied.source` | A supplied fact has no `supplied_by` | error | name the system or form the value comes from |
| `derived.alias` | A derivation is a bare reference to another fact | error | reference the other fact directly instead of wrapping it |
| `dup.compact` | Identical derivation to an existing item | error | reuse the existing item |
| `dup.shape` | Same derivation shape as an existing item, differing only in constants | warn | parameterise one rule instead of duplicating it |
| `dup.similar` | Same type, scope, and program, overlapping sources, and overlapping name or meaning terms | warn | check the candidate named in the finding before adding a new item |
| `rationale.required` | A new item has no `rationale`, or does not acknowledge (via `nearest`) an identical-derivation or same-shape candidate `governance()` found | error (new items only) | write the rationale; list the acknowledged candidates in `nearest` |
| `supplied.single-consumer` | A supplied fact is read by exactly one derived item | warn | not a defect by itself — it flags a bespoke input so a steward notices it, in case it should be folded into the consumer or reconsidered |
| `read.cross_program` | A derived item reads a supplied fact or derived item owned by another program (not `All`) without a declared link in `accepts_from`, or reads a shared adopted method its program is not listed as adopting (`adopted_by`) | error in a volume that sets `link_classes: true` (Colorado), and blocks wherever it is; warn elsewhere (the work-requirements volume) | declare the link with its class and citation (see "Cross-program links" below), or give the program its own item |
| `link.class` | A shared (`All`) derived item does not declare `link_class` (primitive, adopted_method or program_calculation) with a one-line `link_basis`; an adopted method names no adopter (`adopted_by`), or a program or excerpt that does not exist; or a program's own item carries a link class | error, blocks wherever it is | classify the item (docs/conventions.md, "Cross-program links") |
| `link.declaration` | An `accepts_from` entry is a bare identifier, has a class other than adopted_method, rule_required or primitive (a primitive only for a supplied fact), cites no excerpt or one sources.md does not have, or names an identifier not in the ledger (error); or the derivation does not read it (warn) | error, blocks wherever it is; warn for an unused entry | write the entry as `{from, class, source}`; remove an unused one |
| `link.shared_calculation` | A shared item is a program calculation, or a program item reads one | warn; `npm run check` blocks unless the volume's dated allowlist holds it | split the calculation into each program's own item, then remove the allowlist entry |
| `siblings.symmetric` | An item names a sibling that does not name it back, that does not exist, or with no reason | error, blocks wherever it is | add the reverse entry, or remove the entry |

As-of this task, `name.digits` flags five legacy identifiers that predate the
rule. They are not being renamed as part of this task; the ratchet keeps them
editable (an edit does not gain a new error for a rule the item already
failed) rather than freezing them in place.

Constraints (phase 1, unchanged by this task) fail for a different reason —
missing meaning text, an uncited source, a broken derivation — and are
documented in `docs/conventions.md`.

## How CI enforces it

`.github/workflows/check.yml` runs on every pull request to `main`:
`npm run typecheck`, `npm test` (unit and fixture tests — the 133 rule tests
and 138 item constraints stay pinned by fixtures regardless of any change),
then `CHECK_BASE=origin/${{ github.base_ref }} npm run check`, which:

1. Loads the ledger from disk and diffs `volumes/` against `CHECK_BASE`
   (`git diff --name-status`) to find which item files were added or edited.
2. Runs phase-1 constraints and phase-2 governance on every item, `isNew`
   set for an added file.
3. Runs every rule test and every household-case expectation.
4. Computes the impact (everything downstream) of the changed items, and
   which declared program outcomes fall in that set.
5. Computes the change-impact flags of the changed decisions and matches
   them against the dispositions in the pull request's change record
   ("Change impact", below).
6. Checks the cross-program allowlist against what it holds ("Cross-program
   links", below).

The run fails when an error-level constraint or governance finding lands on
a changed or added item (or, for a stale approval and the link rules, on any
item), when a change-impact flag has no disposition or a change record is
malformed, when the cross-program allowlist misses, no longer needs, or
gains an entry, or when a rule test or case expectation fails that
is not listed in `conformance/known-failures.json` (a pinned list of ids
already known to fail, so the ledger's existing, known-bad state does not
block unrelated work — see the ratchet, above). Both the file-level gate
(step 1, above: only files the diff touched can block at all) and the
finding-level ratchet (`src/changes/validate.ts`'s `ratchetGovernance`,
reused by `buildCheckReport` for every changed-but-not-added item against its
base version read with `git show <base>:<path>`) apply here, same as in the
app: an edit to an item that already carried a given governance error does
not block CI for that same error either. `npm run check` prints a
short summary locally; `npm run check -- --json` writes the full report
(every item's findings, every test and case result, the impact set) to
stdout.

**Speed.** `npm run check -- --profile` (or `CHECK_PROFILE=1`) prints each
phase's wall time on stderr; the output on stdout is unchanged. On the
Colorado volume the check took about 3½ minutes until 2026-11-24 (209 s for
`CHECK_BASE=origin/main npm run check`, both volumes and the conformance
self-checks, on a 4-core machine) and now takes under a minute (44 s), with
the same output. The largest phases before were the constraints and
governance pass (137 s, nearly all of it the duplicate scan recomputing every
other item's keys), the rule tests run three times (in the constraints, the
check and the suite, 11 s each) and the per-file `git show` calls (10 s).
What changed, none of it in what is decided or reported:

- the duplicate-candidate scan (`candidates` in `src/engine/governance.ts`)
  computes each item's derivation keys and terms once per index instead of
  once per pair, and the dependency graph governance reads is built once per
  index instead of once per supplied fact;
- every rule test is run once, and the constraints (which report each
  example's result) reuse the results;
- the base versions of changed items are read from git in one `git cat-file
  --batch` instead of one `git show` per file;
- the conformance self-check builds its suite from the engine and the
  evaluations the check has just made (the suite is the same; only the
  cannot-determine cases, the replay and the out-of-process adapter evaluate
  again).

## Branch protection

This cannot be set from the repository's contents — it is a GitHub repo
setting. The repository owner should require, on `main`:

- the `check` workflow's `check` job to pass, and
- a review from the relevant code owner (`.github/CODEOWNERS`)

before a pull request can merge. Without this, `check.yml` and `CODEOWNERS`
are advisory only.

## Item-level approval (the Colorado volume)

A merge records that a change was reviewed; it does not say which items an
agency has signed. Each item therefore carries its own `status` (Draft,
Reviewed, Approved; absent reads as Draft) and an `approval` record, one row
per signing role: `{role, by, date, commit, fingerprint}` (docs/conventions.md). An agency
approves a chapter by a pull request that sets those fields on that chapter's
items only, so the Medicaid and CHP+ chapter can be approved without SNAP or
cash. Governance refuses an Approved item that lacks a signature from any
role the approval policy requires of it, and refuses Reviewed or Approved on
an item that rests, directly or through what it reads, on an excerpt marked
`Verification: unverified`.

For `volumes/co` the approval policy sets `upstream_of_outcomes: true`: an
item read by a program's declared outcome needs that program's owner too, so
the CHP+ policy owner signs the shared and Medicaid items CHP+ reads. The
`volumes/co` lines of `.github/CODEOWNERS` route each chapter to placeholder
teams (for example `@org/hcpf-medicaid`, `@org/hcpf-chp`); the agencies
replace them with their reviewers' teams before branch protection is turned
on.

### Stale approvals

A signature approves what the item was when it was signed, including
everything it reads. Step 2 of the 2026-11-23 plan (docs/plan-colorado.md)
makes that checkable: each approval row records `fingerprint`, a content
hash of what was signed (`src/engine/fingerprint.ts`), and governance
recomputes it on every item whose status is Reviewed or Approved. When any
row's fingerprint differs from the item's current one, or a row records none,
governance reports `approval.stale` ("approval is stale: <what changed>"),
an error. `npm run check` blocks on it wherever the item is, changed in the
pull request or not (the change that makes an approval stale is usually to
something upstream), and it is never ratcheted. The pull request then either
re-signs the item (each stale role signs again, which records the new
fingerprint) or returns it to Draft. A Draft item's signatures are not
checked.

The fingerprint is `fp1-` and 20 hex digits of a SHA-256 over:

- the item's approvable fields: id, identifier, kind, type, options, scope,
  program, role, meaning, assumption, statute_override, supplied_by, value,
  versions (from, to, value, source), derived, sources, effective,
  accepts_from, link_class, link_basis, adopted_by (the cross-program link
  declarations, added 2026-11-23: an item without them hashes as before),
  record_fields (a list of receipts' record schema: each field's type, options,
  option meanings, meaning, and required, default or when_absent; added with
  receipt records on 2026-11-23, likewise hashing as before when absent; the
  order of fields and of options does not count);
- the quoted text of every excerpt the item cites in sources.md (its
  `sources` and each version's `source`);
- the fingerprint of every item it reads, so a change at any depth upstream
  (a parameter's versions, a supplied fact's meaning, type or options, a rule
  in between, an excerpt one of them cites) changes it.

What does not invalidate, by decision: `precision`, `rationale`, `nearest`,
`name`, `tags`, `open`, `tests`, `implemented`, `implemented_by`,
`review_by`, `siblings`, the citation line of an excerpt, and the order of
`sources`, `options`, `accepts_from`, `adopted_by` and `versions`. Free text is compared with
whitespace collapsed, so reflowing a paragraph is not a change, but any
change of words in meaning, assumption, statute_override or supplied_by is:
the check cannot tell a wording change from a change of meaning, so it errs
toward review. Precision and rationale explain a rule without changing what
it decides, and the tests are checked on their own by `npm run check`.
Adding a field that changes what an item decides (for example the
required/default statement of step 3) means adding it to
`APPROVABLE_FIELDS` and bumping the scheme tag (`fp1`), which makes every
earlier signature stale at once.

When the check has a base ref (`CHECK_BASE`), it reads the ledger at that ref
and names what changed: "the item itself changed (meaning)", "CO-12
earned_income changed (versions)", "it now reads CO-40 ...", "excerpt S123
text changed". Without one it says that the item or something it reads
changed after it was signed.

Where the fingerprint comes from:

- The app writes it when a role signs (`signItem` and `signatureEntries` in
  `src/ui/approvals.ts`, `src/ui/inbox.ts`; the item page's sign-off panel and
  the Desk's sign-off list both stage through them). It is computed against
  the ledger with the tray's staged edits applied, so a signature on a staged
  edit covers the edit. Validating the tray (`src/changes/validate.ts`)
  reports an approval that a staged upstream edit makes stale.
- A signature written by hand copies it from `npm run fingerprint -- --item
  CO-n` (add `--volume co` to load one volume, `--explain` to list every item
  and excerpt it covers, `--signed` to list every Reviewed or Approved item
  and whether its signatures still match). The script writes nothing.

The `commit` field stays as the record of the commit signed; the fingerprint
is what the check compares. The engineer handoff (handoff/, the ledger JSON
and the conformance suite) carries neither status nor approvals, so engine
teams see no change.

## Cross-program links

Programs are independent except where a rule links them (product-owner
decisions of 2026-11-23, docs/plan-colorado.md). A volume that sets
`link_classes: true` in volume.yaml (Colorado does) classifies every link in
one of four classes, written on the items (docs/conventions.md, "Cross-program
links", has the grammar):

| Class | What it is | Where it is declared |
|---|---|---|
| primitive | One meaning everywhere: age, dates, relationships, a fact as stated, a published figure, a definition in law every reader applies as written | on the shared item: `link_class: primitive` and a one-line `link_basis` stating that no program defines it differently. A program item reading another program's *supplied* fact as a primitive declares it in `accepts_from` |
| adopted method | A program adopts a method another program or body defines, by reference (SSI-method resources for SSI-related Medicaid; Revenue's Appendix A list for Colorado Works and LEAP) | on a shared item: `link_class: adopted_method`, `link_basis`, and `adopted_by` naming each adopting program with the excerpt that adopts it; on a reader of another program's item: an `accepts_from` entry with `class: adopted_method` and the citation |
| rule-required outcome link | A rule makes one program's outcome an input to another (CHP+ excluding a child eligible for Medicaid; Adult Financial barred by Colorado Works) | on the reader: an `accepts_from` entry with `class: rule_required` and the citation |
| program calculation | Never shared | a shared item of this class is a violation, held only by the dated allowlist below until it is split |

Governance enforces it (the `read.cross_program`, `link.class`,
`link.declaration`, `link.shared_calculation` rules above): an undeclared
cross-program read is an error, and so is a shared rule without a class.
`npm run check` blocks on these wherever they are, changed in the pull request
or not, because the volume is fully classified: any such finding is new.

**The allowlist only shrinks.** `volumes/co/cross-program-allowlist.yaml`
lists, with its date, each shared program calculation that existed when the
classification was made (2026-11-23) and the program items that read it;
docs/reviews/cross-program-audit.md proposes the per-program split for each.
`npm run check` reports what it holds as a warning count ("cross-program
allowlist: N ... held"), and blocks when a shared calculation or a reader is
not on it, when an entry is no longer needed (the split was done: remove the
entry in the same pull request), or when the pull request adds an entry the
base did not have.

The engineer handoff carries the classes: `conformance/<volume>/ledger.json`
gives each item's declared reads as `links` (`from`, `class`, `source`; the
identifiers stay in `accepts_from` for readers of the format) and a shared
item's `link_class`, `link_basis` and `adopted_by`.

## Change impact

Step 4 of the 2026-11-23 plan: a fix is followed to every place it applies.
When a pull request changes what an existing item decides, `npm run check`
lists the **unchanged** items that should probably change with it, and blocks
until the pull request records a disposition for each.

"Changes what it decides" is a difference in the approval fingerprint's
approvable fields (`changedFields` in `src/engine/fingerprint.ts`, so free
text is compared with whitespace collapsed and set order does not count),
less the link declarations (`accepts_from`, `link_class`, `link_basis`,
`adopted_by`), which say why a read is allowed rather than what is decided.
A change to precision, rationale, name, tags, open questions or tests, or a
reflow, raises nothing. Added and deleted items raise nothing, and an item the
pull request also changed, or added, is never flagged.

The signals (`src/engine/impact.ts`):

1. **Excerpt.** An unchanged item of the same kind that cites an excerpt the
   changed item cites, where at most three items in the volume cite that
   excerpt.
2. **Sibling.** An item registered as a deliberate per-program copy of the
   changed one: `siblings: [{id: CO-n, reason: "<one line>"}]`, written on
   both items (`siblings.symmetric` refuses a one-sided entry).
3. **Same facts.** An unchanged rule of the same program that directly reads
   at least two of the supplied facts the changed rule reads, with a Jaccard
   overlap of at least one half: a near-duplicate path that sums or tests the
   same set.

**Noise, measured before choosing.** The signals were replayed over the 30
most recent commits on the branch that changed an existing item's decision
(`npx vite-node scripts/impact-replay.ts 30`; 269 decision changes, mostly
the coverage-pass fix rounds). "Later changed" counts flags whose item was
itself changed by a later commit in the window, a rough measure of a flag that
was a real follow-up (about 5% of unchanged items were changed later at all,
so a signal near 5% is no better than chance):

| Signal | Flags | Per change | Median / max per commit | Later changed | Decision |
|---|---|---|---|---|---|
| any item citing the same excerpt | 4,993 | 18.6 | 143 / 489 | 7% | dropped (floods) |
| a rule citing the same excerpt | 2,554 | 9.5 | 67 / 343 | 11% | dropped (floods) |
| same excerpt, cited by at most 5 items | 1,004 | 3.7 | 36 / 85 | 6% | dropped (floods, near chance) |
| same excerpt, cited by at most 3 items, same kind | 118 | 0.44 | 4 / 12 | 8% | **blocks** |
| same program, reads any of the same supplied facts | 800 | 3.0 | 23 / 140 | 11% | dropped (floods) |
| same program, at least 2 shared facts, Jaccard at least 0.5 | 55 | 0.20 | 0 / 16 | 16% | **blocks** |
| registered sibling | 0 (none registered then) | | | | **blocks** |

As shipped, the three together raised 167 flags over the 30 commits (six
pairs on both signals): 0.62 per changed decision, a median of 4 and at most
21 per commit (the non-MAGI coverage round of 29 decisions), 11% later
changed. The narrow excerpt signal is weak on its own (8%) but cheap (a median
of 4 dispositions a pull request); it stays because a narrow excerpt is
exactly where a sibling copy in another program hides. Re-run the replay
before widening or narrowing a signal; the thresholds are `EXCERPT_MAX_CITING`,
`FACTS_MIN_SHARED` and `FACTS_MIN_JACCARD` in `src/engine/impact.ts`.

**Dispositions.** Each pull request that changes a decision adds a change
record, `volumes/<volume>/changes/<YYYY-MM-DD>-<slug>.yaml`, reviewed with
the rest of the diff:

```yaml
# illustrative ids and fingerprint
date: 2026-11-24
summary: SNAP counts the G.I. Bill allowance once.
impact:
  - {changed: CO-1111, fingerprint: fp1-0a1b2c3d4e5f60718293, flagged: CO-2222, applies: "fixed in this PR through CO-3333, which CO-2222 reads"}
  - {changed: CO-1111, fingerprint: fp1-0a1b2c3d4e5f60718293, flagged: CO-4444, not_applicable: "LEAP excludes the allowance under its own rule (S-n)"}
```

An entry is keyed by the changed item, the flagged item and the changed
item's fingerprint after the change (`npm run check` prints a paste-ready
line for every open flag, with the reason left empty, which the check refuses
until it is written). `applies` says how the flag is dealt with in this pull
request; `not_applicable` gives the reason it does not carry over. Only the
change records the diff adds or edits are read: older records are history.
Because the key carries the fingerprint, a further change to the changed
item, or to anything it reads, reopens the flag instead of carrying an old
disposition over it, and the check names the entry as stale ("was
dispositioned at fp1-..., but CO-n is now fp1-...; review it again"). An entry
that settles no current flag is reported the same way.

Stale entries are not blocking, but they pile up: while a branch's base
predates its records, every record the branch added is read, so each re-key
of a flag leaves the earlier entry stale. Clean them up as
`volumes/co/changes/2026-11-24-stale-cleanup.yaml` did (273 stale entries, to
none): an entry whose flag is no longer raised is removed from its record; an
entry whose flag is still raised at a fingerprint that has moved is removed
from its record, and the flag gets one entry in the cleanup record at the
current fingerprint that restates the disposition already recorded there and
keeps every earlier reason as written, with its record and fingerprint. No
disposition's substance changes.

**Starting point.** `volumes/co/changes/impact-baseline.yaml` records the
commit the check started from (762a730). When a pull request's base predates
it, as `origin/main` does until this branch merges, decisions are compared
against that commit instead of the base, so the changes made before the check
existed are not flagged; once the base contains it, the base is used. The
report's "change impact (since ...)" line names the ref used. (Measured at
the start: against `origin/main` the branch's 382 earlier decision changes
raise 8 flags, all on SNAP items unchanged since main, mostly
indexed-figure and income-chain neighbours: CO-119 to CO-118, CO-133 to
CO-138, CO-301 to CO-303 and CO-314, CO-334 to CO-335 and CO-381, CO-378 and
CO-384 to CO-381. The two figures checked, CO-118 and CO-138, need no change:
FNS keeps the general asset limit at $3,000 for fiscal year 2027 (S732), and
the 50% shelter share is statutory.)

**In the app.** Not yet: the Propose flow and the PR review page show
governance findings (so the link rules appear there), but they do not
compute change-impact flags or write a change record. Planned: the PR review
page lists the flags of the staged change with a disposition field per flag,
and Propose writes the change record into the pull request beside the items.
Until then, run `npm run check` locally and paste its stubs.

## Report-only checks

A check whose findings must be worked off before it can block starts
report-only: `npm run check` prints every finding, one line each, under
"report-only checks" with a count per check, and does not fail on them. The
JSON report carries them as `reportOnly` (`id`, `title`, `blocking`,
`findings`). Each has a switch, `blocking` in `REPORT_CHECKS`
(`src/tools/report-checks.ts`): set to true in a reviewed pull request, the
check's findings block like any other error. To see what blocking would do
first, name the check in `CHECK_BLOCKING` (comma-separated ids, or `all`) for
one run. `npm run report-checks -- --out docs/reviews/report-only-checks.md`
writes the same findings as a markdown report with counts. None of the
checks changes an answer; they read the ledger and the stored households.

| Id | What it reports | Source | How it decides |
|---|---|---|---|
| `ignored-default` | A supplied fact whose meaning or precision declares what an unstated value means ("If not stated, SNAP reads this as false"), and a reader the statement covers that reads the fact bare | service-design finding FB-06 (docs/reviews/service-design-fact-burden.md) | The declaration is a sentence of the form "if not stated, … reads … as …" or "read as … when not stated"; a sentence about history ("no longer", "before,", "until that round"), a required fact ("required where read", "cannot be determined") or "Left unstated (unknown)" is not one. It covers the readers it names (by id or identifier) when it names any, else the readers of the programs named before its verb (less those named as requiring it), else every reader. A read is bare when it is not the first argument of an `otherwise` (docs/operators.md: the only way to turn unknown into a value), and the reader does not test the fact with `unknown`. Candidates: the statement may be the stale part |
| `shared-one-program` | A shared item (program `All`, or in the shared chapter) whose program-regulation citations are all one program's, or whose derivation reads a program-prefixed item | the four tests for sharing (docs/reviews/cross-program-primitives.md; handoff 2026-11-24, section 3, item 2) | An excerpt belongs to a program by its citation line in sources.md: SNAP 7 CFR 271–274 and 10 CCR 2506-1; Medicaid 42 CFR 430–439 and 10 CCR 2505-10; CHP+ 42 CFR 457 and 10 CCR 2505-3; Colorado Works 9 CCR 2503-6 and 45 CFR 260–265; Adult Financial 9 CCR 2503-5; CCCAP 8 CCR 1403-1 and 45 CFR 98; LEAP 9 CCR 2503-7; SUN Bucks 7 CFR 292. Statutes, 20 CFR 416 and guidance are no one program's. A read declared in `accepts_from` is listed, and marked so |
| `benefit-status-receipt` | In a stored household, a person stated as receiving SSI (`receives_ssi`), Colorado Works cash (`receives_tanf_cash`) or Adult Financial (`adult_financial_program_received` other than `none`) with no receipt of that kind (`ssi`, `colorado_works_cash`, `adult_financial_cash`) in the determination month and no stated reason; and a receipt of that kind in the month with the status stated false | the benefit-status decision (handoff 2026-11-24, section 3, item 4; FB-05) | The status facts are person facts on the determination date, so the month is the determination month. A receipt is in it by its `month` or `date`; one with neither recurs from its `start_date` through its `end_date`; a one-time payment with neither is in no month. The one stated reason the ledger has is `retains_ssi_status_without_payment` (SSI); the narrow status record the decision proposes would add the others. Another member's receipt (a payee's) is shown, not taken as a reason |

## Known follow-ups

Noted at the end of the phase-2 fix round, left as-is on purpose:

- Governance's duplicate-candidate scan (`nearest`/`candidates` in
  `src/engine/governance.ts`) is quadratic in the number of items: every item
  is compared against every other item. Since 2026-11-24 each item's keys are
  computed once per index, so the pairwise comparison is cheap (about a
  second for the 2,314 Colorado items); an index by derivation shape and by
  identifier/meaning tokens would remove the quadratic loop itself.
- `paramInForce` (parameter value resolution as of a date) is duplicated
  rather than shared between the evaluator and the explain/trace path. A
  single implementation would remove the risk of the two drifting apart.
- A markdown citation's title is used as-is rather than validated against
  the document it cites; a document rename or retitle can leave a citation's
  title stale without anything flagging it.
