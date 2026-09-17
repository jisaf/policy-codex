# Colorado volume: eligibility for every program served by PEAK and CBMS

Date: 2026-09-17. Status: approved in conversation; binding for the Colorado build.

## Goal

A second volume, `co`, that states the eligibility and enrollment rules for
every program a Colorado household can apply for through PEAK, as the rules
stand today, with citations to the federal and Colorado sources, household
cases that exercise them, and a policy review per program. The federal spike
volume `mwr` stays as it is.

## Programs

Health First Colorado (Medicaid): MAGI adults, parents and caretakers,
children, pregnant people; former foster care youth; SSI-related aged, blind,
and disabled; institutional long-term care and the HCBS waivers (EBD, CMHS,
SLS, DD, CES, CLLI, BI, CIH, and the pediatric hospice and CHRP programs as
eligibility rules only); PACE; the Working Adults with Disabilities Buy-In and
the Children with Disabilities Buy-In; Medicare Savings Programs (QMB, SLMB,
QI, QDWI); breast and cervical cancer; emergency Medicaid; family planning.
Child Health Plan Plus (children and prenatal). SNAP, including work
registration, ABAWD under H.R.1, students, and immigrant rules. Colorado Works
(TANF). Adult Financial: Old Age Pension, Aid to the Needy Disabled (SSI-CS and
CO), Aid to the Blind, and the Old Age Pension health care program. Colorado
Child Care Assistance Program and Low-Income Energy Assistance as eligibility
rules only.

## Scope

In: everything that determines whether a person or household is eligible, in
which category, and for what amount (SNAP allotment, patient liability,
premiums, cash grant). Assistance-unit composition, income counting and
disregards, resources and transfers, spousal impoverishment, immigrant status
and the five-year bar, minor parents, students, continuous eligibility, and
retroactive coverage as rules.

Out: application processing, verification, notices, renewals, appeals,
sanctions and overpayments, and clinical level-of-care assessments; those
enter as supplied facts (for example `meets_nursing_facility_level_of_care`).

## Sources and provenance

Every rule cites an excerpt; every excerpt names its document; every document
is real text fetched from an allowed source (eCFR, Cornell LII, govinfo, the
Colorado Secretary of State's CCR, HCPF, CDHS, FNS, CMS, SSA, ASPE). Where the
text cannot be fetched, the excerpt is marked `verification: unverified` and
governance warns on it until replaced. Nothing is cited from memory as if
quoted.

## Vocabulary

Programs: `Medicaid`, `CHP+`, `SNAP`, `ColoradoWorks`, `AdultFinancial`,
`CCCAP`, `LEAP`, and `All` for shared facts (prefixes `ma_`, `chp_`, `snap_`,
`cw_`, `af_`, `cccap_`, `leap_`). Tags are a hierarchy declared in
`volume.yaml`: `ma` > `magi`, `non_magi`, `ltc`, `hcbs`, `buy_in`, `msp`,
`emergency`; `snap` > `abawd`, `work_registration`, `student`; `cash` > `tanf`,
`oap`, `and`, `ab`; cross-cutting `household`, `income`, `resources`,
`immigration`, `age`, `disability`. An item carries any number of tags; the
table, program view, and search filter by tag and by parent grouping.

## Household model

A case is a household with persons, relationships (parent, child, spouse,
grandparent, caretaker relative, tax filer, tax dependent, purchases-and-
prepares-with), and per-person facts. Assistance units are derived facts, not
inputs: `snap_household_members`, `ma_magi_household_of(person)`, `ltc_couple`.
The first case in every program's file is the target household: three
generations, five people, mixed immigration status, a minor parent, and a
grandparent entering nursing facility care.

## Versioning

SNAP parameters (maximum allotments, standard deduction, shelter cap, SUA) and
the ABAWD age band carry dated versions so the Program view's "as of" date
shows different values, and at least one rule carries an `effective` range.
The federal poverty guidelines are one parameter table with yearly versions.

## Process

Each program is one phase: author from sources, run governance, write cases,
review by a policy reviewer against the sources, fix, then a written note on
what the approach did and did not handle and where open questions cluster.
Phases: 1 platform (this document, volume selector, tags, versioning, `co`
skeleton, target household); 2 SNAP; 3 MAGI Medicaid and CHP+; 4 non-MAGI,
long-term care, waivers, Buy-In, MSP; 5 cash programs; 6 CCCAP and LEAP.
