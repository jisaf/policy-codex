# Policy Codex, phase 2: governance, audit, documents, conformance

Date: 2026-09-12. Status: implemented; name.prefix ruling applied (error on derived items, warn on parameters, exempt on supplied facts); name.digits errors left editable under ratchet.

## Goal

Make the codex a governed policy stack that several audiences can use without
the original implementers: supply source documents, optionally have AI propose
facts and derivations from them, let subject-matter teams create, review, and
approve items under mechanical constraints, hand an engineer a codex plus a
conformance suite, submit a test household for one or more programs and read
the full trace of the decision, and audit any determination against a pinned
commit. Everything stays static (GitHub Pages), git remains the only store, and
the engine stays pure.

## Audiences and the question each asks

- Program administrator: "is program X calculated properly?" Answered by
  household cases per program, with pass/fail and plain-English traces.
- Automation SME (steward): "does the implementation match the codex, and does
  the codex match the statute?" Answered by the conformance suite for the first
  half and by citations, cases, and second-SME review for the second.
- Division director: "how was this decision reached, and was the error one of
  interpretation or implementation?" Answered by the explain view on a pinned
  commit: the codex's answer and trace for the case's facts, compared with the
  production answer.

## The evaluator and why it is complete

The engine already evaluates derivations to run the 133 rule tests: a single
memoised `value(identifier, person, month)` resolves every fact a derivation
needs, recursively. The explain view is that evaluator with a trace callback:
every resolution the engine performs is recorded as a node with its inputs,
value, rule in pattern English, and cited sources. Nothing is re-implemented,
so the trace is exactly as complete as the evaluation, and the same fixtures
that pin the rule tests pin the trace's values. What it deliberately lacks is
everything a production engine adds around the walk: data integration, case
management, batch throughput, persistence. A household is one case, evaluated
in the browser, on demand.

## Vocabulary (volume.yaml)

`volume.yaml` gains declared vocabularies; anything not declared is an error:

```yaml
programs:
  - id: Medicaid
    prefix: medicaid_          # identifiers owned by this program start with it
    outcomes: [medicaid_ce_status_at_application, medicaid_ce_status_at_renewal]
  - id: SNAP
    prefix: snap_
    outcomes: [snap_time_limit_status]
tags: [legal, medical, state_election]
```

`program: All` items are shared facts and must not carry any program prefix.
Outcomes are the items program administrators are accountable for; a change
to an outcome or anything upstream of it is flagged in the pull request body.

## Governance constraints (engine, `src/engine/governance.ts`)

Run beside the existing constraints (which fixtures pin and which do not
change). Levels: error blocks Propose; warn shows and must be acknowledged in
the rationale.

1. Closed vocabularies: program, tags, type, scope must be declared. Error.
2. Naming grammar: identifier `^[a-z][a-z0-9_]*$`; program-owned identifiers
   start with the program prefix; shared items carry no program prefix; pattern
   catalog operators are reserved; no digit run that encodes a value. Error.
3. Supplied facts declare `supplied_by`. Error.
4. A derived fact whose derivation is a bare reference to another fact is an
   alias, not a rule. Error.
5. Duplicates, three layers: identical canonical derivation (`compact()`) is
   an error; same tree with literals and parameters masked is a warn
   ("parameterise"); same type, scope, and program with overlapping sources and
   overlapping identifier tokens or meaning terms is a warn. Candidates are
   listed on the item as `nearest`.
6. New items carry a `rationale` that names why the nearest existing items do
   not serve. Error for adds; not required for edits.
7. Supplied facts with a single consumer are reported (warn) with the consumer
   named, so bespoke inputs stay visible to stewards.

For edits of existing items, governance errors already present on the base
version downgrade to warnings, so the ledger ratchets rather than freezes.

## Household cases and explain

- `volumes/mwr/tests/cases.yaml` is loaded with the volume. The engine runs
  every expectation (person, identifier, month) and reports got, expected, ok.
- Cases view: list with per-program pass/fail; a case page with its persons,
  facts, and expectations; any expectation opens its trace.
- New household: choose one or more programs; the app derives the supplied
  facts their outcomes need (upstream cone), presents a form, evaluates, and
  shows outcomes and traces. The household can be staged to the tray as a new
  case in `cases.yaml`.
- Program view: outcomes, their case results, parameters in force at a date,
  open questions, governance findings.
- Every view works at `@ref`, so a director opens the commit in force.

## Documents

`volumes/mwr/documents.yaml` lists documents (id `D-n`, title, kind: statute,
regulation, guidance, memo; citation; url; file; date). Full text lives in
`volumes/mwr/documents/<id>.md`. Each source excerpt names its document. The
Documents view lists documents, shows a document with its excerpts and the
items citing them, and lets an analyst propose a new document (metadata plus
pasted text) through the tray. The change set gains generic file entries for
this; items stay the only entries with impact.

## AI

The AI panel adds a document context: "Suggest facts and derivations from
document D-n" returns a multi-item proposal; "Stage all as drafts" turns each
into a tray entry with the proposal's rationale and computed `nearest`, so AI
output enters through exactly the same gate as a human's. "Extract excerpts"
proposes new `S-n` sources from a document. The prompt carries the vocabulary
and naming grammar so suggestions comply. Nothing is accepted without staging
and Propose.

## Rename

Renaming an identifier rewrites every derivation, test input, and expectation
that references it and stages all affected items. Without this, bad names are
never fixed once they have consumers.

## Conformance (engine-agnostic)

- `npm run conformance` writes `conformance/suite.json`: codex commit, every
  rule test and household case as `{supplied, as_of, parameters} →
  {expected}` per identifier, plus each item's `implemented_by` locator.
- `scripts/conform.ts --adapter <command>` feeds each case to an adapter
  (JSON on stdin, JSON values on stdout), diffs against the codex, and writes
  `conformance/results.json`. Partial coverage is reported, not failed.
- `scripts/adapters/codex-self.ts` is the reference adapter (the codex engine
  itself), which also proves the harness.
- The engine under test must run on synthetic cases; where it cannot, the
  same harness replays sampled production decisions (shadow evaluation).

## Process

- CI on pull requests: typecheck, tests, and `npm run check` (constraints,
  governance, rule tests, household cases over the ledger on disk; errors on
  files changed against the base fail the run).
- `CODEOWNERS`: chapters and `volume.yaml` owned by the SME stewards.
- PR body (written by the app): items changed, rationale, nearest, impact,
  outcomes affected.
- `docs/governance.md`: roles, review lanes, steward duties, how to add a
  vocabulary term, what is blocked and why.

## Non-goals

Sign-in, in-app merge, a production rules engine, cross-volume references, an
index service. Unchanged from phase 1.
