# Phase 2 plan

Spec: docs/design-governance.md. Twelve tasks, three milestones, one pull
request per milestone into main (which deploys). Every task lands with tests;
`npm test`, `npm run typecheck`, `npm run build` stay green after each.

## Milestone 1: evaluate and audit
1. Household case runner: load `tests/cases.yaml` with the volume; engine `runCases`.
2. Traced evaluation: `evaluate` gains a trace hook; `explain` builds the tree.
3. Cases view: list, case page, expectation traces, new household form.
4. Program view.

## Milestone 2: governance
5. Vocabulary in `volume.yaml` and the governance rules module with `nearest`.
6. Change-set integration: rationale, nearest, ratchet, new-item-starts-with-search.
7. CI check script and workflow, CODEOWNERS, PR template, `docs/governance.md`.
8. Rename tool.

## Milestone 3: documents, AI, conformance
9. Documents library, generic file entries in the change set, Documents view.
10. AI from documents: multi-item proposals staged as drafts; excerpt extraction.
11. Conformance suite export, harness, reference adapter, `docs/conformance.md`.
12. README and design doc updates; whole-branch review and fix round.
