# Comparison: Two Ledgers (A) versus One Ledger (B+)

Same policy, same 138 items, same tests, two structures. This document records where the structures differ, where the two-ledger split forced a placement, what the machine checks caught, and what the spike says about the AI first pass and about the policy itself.

## What was built

| | Approach A, two ledgers | Approach B+, one ledger |
|---|---|---|
| Files an approver reads | `approach-a/data-dictionary.md` (77 data elements), `approach-a/rules-codex.md` (28 reference values, 33 rules), `approach-a/interface.md` | `approach-b/codex.md` (138 facts in five chapters) |
| Files an engineer reads | the same two ledgers plus `interface.md` | `approach-b/handoff.md` (engineer sheet split by target layer, dependency graph) |
| Canonical form | none of its own; in this spike, rendered from B+'s ledger | `approach-b/ledger/*.yaml`, 25 patterns plus the additions listed below |
| Tests | `tests/data-tests.yaml` (37 tests on data elements), `tests/rule-tests.yaml` (96 tests on rules), `tests/cases.yaml` (13 households) | `tests/rule-tests.yaml` (133 tests), `tests/cases.yaml` (13 households) |
| Machine checks | none unless the team builds them | `codex_tool.py check`: references, scope discipline, cycles, sources, open questions, every derived item tested, 133 rule tests and 60 case expectations evaluated |
| Grey-area placement | forced at authoring time, by ledger | one tag, `implemented: assembly` or `engine` |

Honesty note. Approach A here was generated from the B+ ledger, so its content is exactly as consistent as B+'s. A hand-authored pair of ledgers would not have that property; the differences below are structural, and the validation gap is that A has no canonical form of its own to validate.

## Numbers

| Measure | A | B+ |
|---|---|---|
| Items | 77 DE + 28 RV + 33 RL = 138 | 138 |
| Data elements consumed by at least one rule | 48 | not a boundary |
| Derived data elements whose logic cites reference values held in the other ledger | 7 | 0, same ledger |
| Data-dictionary entries whose approval requires Legal | 5 | 0 special cases; approval is by tag on every item |
| Test files an engineer runs | 3 | 2 |
| Identifier schemes | two (DE/RV/RL) plus the codex ID | one |

## Where the split forced a placement

These are the items the team's earlier dialogue called the grey area. In A each one had to land in one ledger. The `implemented` tag put them on the data side because the fact-assembly layer computes them, and that produced these effects:

1. **Five data elements need Legal sign-off.** `DE-060 Medicaid: is a dependent child`, `DE-062 ... parent, guardian, or caretaker relative of a dependent`, `DE-063 ... family caregiver of a dependent`, `DE-065 Medicaid: is medically frail`, `DE-072 SNAP: has responsibility for a dependent child under 14`. Each carries an open interpretation question. The data dictionary's approval path was designed for data stewards; statutory interpretation now lives there.
2. **Seven data elements reach back into the rules codex.** Dependent-child ages, the stable-recovery threshold, the caregiver hours floor, the hardship unemployment cap and multiplier are reference values in the rules ledger, cited from data-element derivations. Changing a reference value is a rules-codex change set that alters data elements without any edit appearing in the data dictionary.
3. **Sibling logic is split across ledgers.** `SNAP: has responsibility for a dependent child under 14` is a data element; `SNAP: is exempt from the ABAWD time limit`, which is a list of six such conditions, is a rule. An approver reading the exemption list must open the other ledger to read one of its six clauses.
4. **The cross-program dependency crosses ledgers twice.** Medicaid exclusion (VI)(bb) depends on `SNAP: is subject to a SNAP work requirement` (a rule), which depends on `SNAP: is medically certified unfit` (a data element) and `age at month` (a data element). In B+ this is one path in one graph.

## Four change scenarios

Impact was computed by `codex_tool.py impact <identifier>` on the actual ledger.

**Scenario 1. Medicaid lowers the dependent-child age from 13 to 6.**
Eight items are downstream: four data elements and four rules, ending at both Medicaid outcomes.
- B+: edit one parameter, `WR-104`. One change set. The checker re-runs everything downstream. Approvers: Medicaid policy owner plus Legal, because the outcome items carry the `legal` tag.
- A: edit `RV-005` in the rules codex. The four data elements `DE-060` to `DE-063` change meaning with no diff in the data dictionary. The data team must notice, re-run `data-tests.yaml`, and re-approve five Legal-tagged data elements from a change that originated in the other ledger.

**Scenario 2. FNS clarifies the ABAWD upper age as 65 rather than 64 (OQ-13).**
- B+: edit `WR-121`, re-run.
- A: edit `RV-017`, re-run rule tests. Same effort. The split costs nothing when a change stays on one side; that is the case A is designed for.

**Scenario 3. OQ-3 resolves so that every child 13 or under is a dependent child, no separate reliance finding.**
- B+: edit `WR-201`'s derivation, retire supplied fact `WR-011`. One change set, both edits visible in one diff.
- A: edit `DE-060` and retire `DE-009` in the data dictionary. Rules untouched, but the cases must be re-run because four Medicaid rules stub these values in their tests. Legal approves a data element.

**Scenario 4. Tech leads move "medically frail" from fact assembly to the determination engine.**
- B+: flip `implemented: assembly` to `engine` on `WR-206`. Meaning, tests, sources, approvals, and every reference are unchanged. The engineer sheet regenerates with the item in the other section.
- A: the item physically moves from `data-dictionary.md` to `rules-codex.md`, its code changes from `DE-065` to a new `RL` number, `interface.md` and every consuming rule's input list update, and its four tests move from `data-tests.yaml` to `rule-tests.yaml`. A placement decision becomes an interpretation-ledger change with approvals.

## What the checker caught while authoring

Both were the author's errors, not the policy's.

- `WR-204-T4` expected *no* for a caregiver with 79 care hours, no residence, and no relationship. The checker returned *unknown*: relationships had not been supplied, so "is a relative" was unknown and the whole condition was unknown. Correct behavior; the test was wrong. In prose, the test would have been approved.
- Case `C-04` expected a parent of a 14-year-old on SNAP to be *not met* for Medicaid. The checker returned *not subject*. The statute's exclusion (VI)(bb) removes any SNAP household member who is subject to SNAP work rules from Medicaid community engagement, regardless of hours. The derivation was right and the author's expectation was wrong. Recorded in OQ-19 and kept as a case because it is the least intuitive cross-program interaction in the volume.

Without a canonical form neither error is detectable by machine. A team using A would find the first in an engineer's failing test and the second in production.

## What A does better

- **Ownership matches team boundaries.** The data team publishes the data dictionary as a contract and can version it on its own cadence.
- **Shorter reading for rule approvers.** Thirty-three rules instead of 138 items; the reference-value table sits beside them.
- **Familiar shape.** Data dictionaries and rule catalogs are what a Corticon-era team already knows.

B+ gets the first two as views without paying for the split: `handoff.md` already renders the ledger split by implementation target, and a rules-only or program-only view is a filter over one file.

## What B+ demands that A does not

- A real pattern catalog with defined meaning for every construct, extended by the tech member when the policy needs a construct the catalog lacks. The spike needed nine constructs beyond the original 25 (listed in the repository README).
- A round trip the product must build: this spike authored the canonical form and rendered the pattern English from it. SMEs author in the English-shaped form; the tool must produce the canonical form from their choices. Rendering canonical to English is proven here; the editor that goes the other way is not.
- Discipline about unknowns. Every derivation propagates unknown, and defaults must be explicit (`otherwise 0`). Approvers see a `cannot determine` outcome with the missing facts listed (case `C-13`) instead of a silent zero. That is more honest and more work.

## What the spike says about the AI first pass

- 138 items, 133 rule tests, 13 household cases, 34 verbatim source excerpts, and 23 open questions from one pass with statute and regulation text retrieved, in a few hours of wall-clock time.
- Two author errors were caught by the checker before any human read the draft.
- Every interpretation the text did not settle was recorded as an assumption with an open question rather than silently chosen, including one where the statute text and the reported Federal implementation disagree (OQ-13, "over 65").
- Retrieval failures were flagged rather than filled from memory: CMS sub-regulatory guidance and the FNS implementation memorandum were not quotable; the CFR was read from a mirror.
- Nothing is approved. Every item is Draft and every excerpt must be re-verified against the official source before an SME signs it.

## What the spike says about the policy

Cross-program interactions the cases exposed:

1. A SNAP household member who is subject to SNAP work rules is excluded from Medicaid community engagement, whether or not they work (C-04, C-06).
2. Being eligible for the Indian Health Service without tribal enrollment excludes a person from Medicaid community engagement but does not exempt them from the SNAP time limit (C-07).
3. Medicaid's "medically frail" and SNAP's "unfit for employment" are different tests with different evidence; a person can be one and not the other (C-05).
4. Age windows differ: Medicaid 19 through 64; SNAP 18 through 64 under the reported implementation, with the statute text reading "over 65" and persons 60 through 64 newly subject despite being past the general work-registration age (C-06, OQ-13).
5. The dependent-child ages coincide numerically ("13 years of age and under" and "under 14") but are separate parameters in separate statutes and must stay separate items.
6. One parameter, the Federal minimum wage, feeds 22 downstream items across both programs.

## Recommendation

Build B+. Keep A's ownership boundary as a rendered view, which `handoff.md` already is. Resolve the grey area with the `implemented` tag, never with ledger placement. Treat the pattern catalog as a governed artifact with its own change sets. Spend the next spike on the SME editor: can a policy SME produce `WR-204` or `WR-310` from pickers and templates without seeing YAML.
