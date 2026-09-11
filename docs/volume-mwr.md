# Volume: Work Requirements under H.R.1

Medicaid community engagement (42 U.S.C. 1396a(xx), 42 CFR 435.550 through 435.563) and the SNAP ABAWD time limit (7 U.S.C. 2015(o), 7 CFR 273.24), with the SNAP general work registration exemptions they both reference. Produced as an AI first-pass spike on 2026-09-02. Draft throughout.

## Layout

```
volumes/mwr/
  volume.yaml          metadata, approval policy, types, scopes
  sources.md           verbatim excerpts, cited by items as S1..S34
  open-questions.md    23 interpretation questions with the assumption each item uses
  supplied/            one YAML file per supplied fact
  parameters/          one per parameter
  medicaid/            one per Medicaid derived fact
  snap/                one per SNAP derived fact
  tests/               household-level cases and the exported rule tests (data)
docs/
  volume-mwr.md        this file
  one-ledger.md        why one ledger, and the expression and test conventions
  comparison.md        two ledgers versus one ledger, with change scenarios (historical)
  conventions.md       the ledger grammar the app's engine implements
```

The volume was produced under the earlier `work-requirements/approach-b/` spike layout; the item files here are that ledger split one item per file, unchanged in content.

## What is in scope

For a person in a case, as of a determination date:

- Medicaid: whether the person is an applicable individual, whether they are a specified excluded individual under each of the nine statutory clauses, whether they demonstrate community engagement for a month under each of the seven conditions, the short-term hardship exception, the application lookback, the renewal review, and the resulting status.
- SNAP: the general work registration exemptions, the ABAWD exceptions, fulfilment of the work requirement for a month, countable months over the 36-month period, exhaustion, regaining eligibility, and the resulting status.
- The cross-program link: Medicaid exclusion (VI)(bb) reads SNAP's derived facts.

## What is out of scope

- Determining that a person is in the adult group, a SNAP household's composition, MAGI or SNAP income eligibility, and postpartum entitlement. These arrive as supplied facts.
- The noncompliance notice and 30-day cure process, fair hearings, and ex parte verification sequencing. Process, not determination.
- Area waivers and the discretionary exemption pool. Supplied per month.
- Territories, and the section 1902(e)(14) reasonable-opportunity interactions.

## Reading order

1. In the app, or in `volumes/mwr/medicaid/`: WR-211, then WR-226. Then `volumes/mwr/snap/`: WR-310 and WR-318.
2. `volumes/mwr/open-questions.md`.
3. `volumes/mwr/tests/cases.yaml`, cases C-04 through C-07 for the cross-program interactions.
4. `docs/comparison.md`.
