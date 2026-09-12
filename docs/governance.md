# Governance

How the ledger is kept correct as more than one person changes it. This is
the operational companion to `docs/design-governance.md` (the spec) and
`docs/conventions.md` (the ledger grammar); read those first for the "why".

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
(see `docs/conventions.md`'s note on the seven pinned constraint failures),
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
block. The 15 governance rule ids:

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

The run fails when an error-level constraint or governance finding lands on
a changed or added item, or when a rule test or case expectation fails that
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

## Branch protection

This cannot be set from the repository's contents — it is a GitHub repo
setting. The repository owner should require, on `main`:

- the `check` workflow's `check` job to pass, and
- a review from the relevant code owner (`.github/CODEOWNERS`)

before a pull request can merge. Without this, `check.yml` and `CODEOWNERS`
are advisory only.

## Known follow-ups

Noted at the end of the phase-2 fix round, left as-is on purpose:

- Governance's duplicate-candidate scan (`nearest`/`candidates` in
  `src/engine/governance.ts`) is quadratic in the number of items: every item
  is compared against every other item. Fine at 138 items; would need an
  index (by derivation shape, by identifier/meaning tokens) at real scale.
- `paramInForce` (parameter value resolution as of a date) is duplicated
  rather than shared between the evaluator and the explain/trace path. A
  single implementation would remove the risk of the two drifting apart.
- A markdown citation's title is used as-is rather than validated against
  the document it cites; a document rename or retitle can leave a citation's
  title stale without anything flagging it.
