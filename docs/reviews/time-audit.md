# Time audit and generated boundary cases

Step 6 of the plan of 2026-11-23 (docs/plan-colorado.md, "Product-owner decisions: plan for a trustworthy, approvable codex"). Reviewed at 41ec04b, 2026-11-23. Read-only on rules: no item was changed. Two parallel tracks are editing items (the receipt-records migration of LEAP, SNAP and Adult Financial unearned income, and a non-MAGI Medicaid and Adult Financial fix round). This review hands its findings to the fix round (step 7).

What this pass added:

- `scripts/boundaries.ts` (`npm run boundaries`). It is typechecked, read-only and uses the reference evaluator unchanged. It has four sections: an inventory of dates, ages, periods and parameter versions; branch coverage; a mutation score; and generated boundary variations. Its full output is in [time-audit-generated.md](time-audit-generated.md), regenerated with `npm run boundaries -- --today 2026-11-23 --out docs/reviews/time-audit-generated.md`.
- Six stored cases, CO-530 to CO-535, in `volumes/co/tests/cases.yaml`. Each expectation is derived by hand from the text, with the arithmetic in the case comment. All six still fail, and their 14 failing expectations are in `conformance/known-failures.json`, keyed below to the finding each one shows.

No parameter version was added. The documents already fetched hold no stated figure that a parameter lacks: the 2027 SSA amounts in D-166 (S1712, S3700) are already loaded. The ISM and Adult Financial figures that are due for 2027 are not stated in any fetched document (T-2, T-5).

## Findings

P1 means the finding changes an answer. P2 covers maintainability or approval risk.

| # | P | Finding | Items | Case |
|---|---|---|---|---|
| T-1 | P1 | Ages are measured on the determination date or month in months that are determined separately: retroactive months, and an application month before the determination month | MAGI: CO-564, CO-4550, CO-4790, CO-4978, CO-549, CO-550, CO-539, CO-548, CO-552, CO-544, CO-500, CO-509. Non-MAGI: CO-600, CO-1161, CO-1162, CO-1179, CO-1152, CO-618, CO-620, CO-654, CO-2419, CO-800 | CO-530, CO-531, CO-533 |
| T-2 | P1 | The Adult Financial maximum ISM keeps its 2026 figure in 2027, although the rule's own formula gives the 2027 figure from the 2027 SSI rate | CO-1513 (read by CO-1512, CO-946) | CO-534 |
| T-3 | P1 | Parameter versions are chosen by the determination date in retroactive months that fall in an earlier version's year, so a 2026 retroactive month of a 2027 application uses the 2027 SSI rate | ssi_federal_benefit_rate_individual/couple (CO-235, CO-236) through ma_ssi_income_standard; every yearly figure a Medicaid retroactive month reads | CO-532 |
| T-4 | P1 | Lottery winnings a few cents below $80,000 (and below $90,000, $100,000, ...) land in the next spread band | CO-1185 (floor CO-1183) | CO-535 |
| T-5 | P2 | Yearly figures with an open-ended version answer later years silently with the old figure; others are closed at year end. The convention is not consistent | CO-1513, CO-289, CO-291, CO-1200, CO-1201, CO-1202, CO-4730 (no review_by); CO-807, CO-808, CO-827, CO-828, CO-830, CO-831, CO-832, CO-887, CO-3022 (review_by 2027-01-01) | none (no 2027 figure is published where it can be fetched) |
| T-6 | P2 | "N consecutive days" is counted as the days elapsed (`days_between`) with no stated convention, so the two readings differ by one day at every such limit | CO-904, CO-3804, CO-2006, CO-1510, CO-1217, CO-2351, CO-4401 | none (the text does not settle it) |
| T-7 | P2 | `ma_bccp_max_age` is named as an inclusive maximum but compared as an exclusive limit (conventions rule 8). The answer is right | CO-1130, CO-1152 | none |
| T-8 | P2 | SSI-method resources exclude a retroactive benefit for a literal 9 months, measured to the determination month in a person-scope item | CO-800 | none |
| T-9 | P2 | Comparisons are rarely tested at the limit: 393 of 686 comparisons are never evaluated with both sides equal, and 436 strict/inclusive flips on reached nodes go unnoticed by every test | all programs (lists in the generated report) | none |

### T-1 (P1): ages taken on the determination date or month in other months

42 CFR 435.915(a) (S218) makes Medicaid effective in a retroactive month for a person who "(2) Would have been eligible for Medicaid at the time he received the services if he had applied". 10 CCR 2505-10 § 8.100.4.G.1 (S3351) gives MAGI coverage month by month: "any person who is determined to be eligible for Medical Assistance based on MAGI at any time during a calendar month shall be eligible for benefits during the entire month." Each month's age conditions are therefore the person's age in that month.

The codex measures them otherwise. `age` (CO-300) is "as of the determination date", and docs/operators.md states that "a past month's 'child under 22' uses today's age". The birthday-month items CO-564, CO-4550, CO-4790, CO-4978 and CO-549 anchor on `det_month`: CO-564 "the person was under ma_magi_child_age_limit on the last day of the month before the determination month". Every Medicaid month a determination covers therefore uses the age of the determination month. That includes the retroactive months (CO-4101, CO-557) and an application month earlier than the determination month, which is the usual case for an application received late in a month. The inventory (generated report, "Ages") lists 92 comparisons that take an age on the determination date or month inside a per-month determination. The Medicaid ones above are the ones whose months differ from the determination month in practice.

Confirmed on stored cases:

- **CO-530.** Born 2007-09-15, applies 2026-11-10 with retroactive coverage, earns $1,850 a month: 139.10% of the 2026 guideline (1,850 / 1,330). August (age 18) and September (the birthday month) are the Children's group at 142%, so the right answer is child and eligible. The codex gives none and ineligible_income: on 2026-10-31 she is 19, the Adults standard is 133%, and 139.10 - 5 = 134.10% is still over it. A control born 2008 gives child and eligible.
- **CO-531.** Born 2007-10-20, applies 2026-10-28 and is determined 2026-11-05. October, the application month and the birthday month, should be child and eligible. The codex gives none and ineligible_income.
- **CO-533.** Born 1961-10-20, not disabled, applies 2026-11-05 with retroactive coverage. August and September (age 64) should be none. The codex gives aged, because it uses the age on 2026-11-12.

SNAP's ABAWD rules (CO-412, CO-416) and community engagement (CO-1969) already measure to `[first_day, [month]]`. Fix direction: the Medicaid month-by-month age conditions measure to the month being determined, so the birthday-month idiom becomes "under the limit on the last day before the month evaluated". The `age` primitive stays the determination-date age for rules that are about one date. OQ-510 (the October 2026 alien payment limit applied by determination date, not month of service) is the same pattern, already recorded as an open question.

The same exposure exists in Colorado Works and Adult Financial wherever an application month is prorated in a later determination month (cw_is_dependent_child CO-901, af_is_oap_age CO-940). It also affects the later months that stored households evaluate: CO-05's comment records that p3 "is still evaluated as 16" in April 2027. Neither of these is confirmed by a case here.

### T-2 (P1): the Adult Financial maximum ISM in 2027

9 CCR 2503-5 3.520.79.E.2 (S1012): "The ISM is calculated by multiplying the current SSI benefit standard, as defined in Section 3.510, by 33.33%, then adding a $20.00 disregard and rounding to the nearest whole dollar." The rule's dated figures follow the formula: 994 × 0.3333 + 20 = 351.30, giving 351 for 2026 (S700); 967 × 0.3333 + 20 = 342.30, giving 342 for 2025 (S1020). SSA's 2027 rate is $1,029 (91 FR 67380, S1712), so from 2027-01-01 the formula gives 1,029 × 0.3333 + 20 = 362.97, which rounds to $363.

`af_ism_maximum` (CO-1513) has an open version from 2026-01-01 at $351 and no review_by. Its precision says "the rule states each year's figure", but no fetched document states the 2027 figure, so no version could be added.

**CO-534** is CO-166 determined on 2027-01-05. The rule gives ISM 363 and countable income 600 + 363 - 20 = 943; the codex gives 351 and 931. Fix direction: derive the maximum from `ssi_federal_benefit_rate_individual` by E.2, or close the 2026 version at 2027-01-01 so that 2027 is "cannot determine" until the rule's figure is loaded.

### T-3 (P1): parameter versions in retroactive months of another year

docs/operators.md, Resolution step 2: "The version is chosen by the determination date even when the expression is evaluating another month (an ABAWD look-back, a retroactive month, a future month of a case); a rule that applies a figure from another date says so with `as_of`." No Medicaid SSI-method or MAGI rule reads a figure `as_of` the month being determined. The only `[month]`-anchored `as_of` is the MSP COLA disregard's publication date. As a result, the 2025 versions added so that "a 2026 application's retroactive months in late 2025 have a figure" (open-questions.md, the HCPF F-2 entry) are chosen only when the determination date itself is in 2025, never for a 2025 retroactive month of a 2026 determination. A retroactive month is judged by its own month's standards (435.915(a)(2), above).

**CO-532.** Aged, applies 2027-01-05 with retroactive coverage, so the retroactive months are November and December 2026 (two months after 2027-01-01, CO-2472). Social Security is $1,020 in 2026 and $1,048 in 2027. For November and December the rule gives none, because 1,020 - 20 = 1,000 is over the 2026 rate of 994 (S319). For January it gives aged: 1,028 is at or under 1,029. The codex compares November and December with 1,029 and gives aged. The same applies to the poverty guideline once a 2027 table is loaded (OQ-515 keeps it dated from January 1), and to SGA, the MSP and spousal figures.

### T-4 (P1): lottery winnings just under a band edge

42 U.S.C. 1396a(e)(14)(K)(i) (S1234) counts winnings "(I) in the month in which such winnings ... is received if the amount ... is less than $80,000; (II) over a period of 2 months if ... greater than or equal to $80,000 but less than $90,000". CO-1185 compares with `ma_lottery_winnings_spread_floor` = 79,999 and counts started $10,000 steps above it. Its precision says this "matches at every boundary ($79,999 is one month, $89,999 two ...)", which is true for whole dollars only. The generator found the gap by stepping one cent above T = 79,999.

The Colorado text (S669) says "less than $79,999" and "over $79,999 but less than $89,999", so cents between the two figures fall to the federal rule.

**CO-535.** $89,999.50 should spread over 2 months and $79,999.50 over 1. The codex gives 3 and 2. Fix direction: compare against $80,000 with `<` (or state the floor as 80,000 and use the federal "less than" form).

### T-5 (P2): yearly figures with an open version

Each of these is published once a year. The latest version is open-ended, so a 2027 date gets the 2026 figure with no warning:

- `af_oap_grant_standard` (CO-289), `af_and_cs_grant_standard` (CO-291), and the payment floors CO-1200, CO-1201 and CO-1202. 3.510 updates the floors "annually with the cost-of-living adjustment" (CO-1200 precision).
- `af_ism_maximum` (CO-1513): see T-2.
- `colorado_minimum_wage` (CO-4730): the 2027 PAY CALC Order.

These have no review_by. The CMS and HCPF figures CO-807, CO-808, CO-827, CO-828, CO-830, CO-831, CO-832, CO-887 and CO-3022 have review_by 2027-01-01, so governance warns from that date, but evaluation still answers with 2026 figures. Stored case CO-114 (2027-01-20) already reads CO-807's 2026 figure.

The SSA-indexed figures (CO-235, CO-236, CO-1802, CO-1803, CO-3379, CO-3380) were closed at year end and then given 2027 versions, and the SUN Bucks table has no row for an unpublished summer. Both of those give "cannot determine" rather than a stale answer.

Recommendation: one rule for a figure that by law lasts a calendar year (or a state fiscal year). Close each version at its end (`to:`) and add review_by, so that a later date is "cannot determine" with a `no-version` warning until the new figure is loaded. None of the 2027 figures above is in a fetched document, so none could be added here.

The parameter inventory (generated report, section 1) also lists:

- the closed versions: the CW standards to 2028-07-01 (SB 26-181, no COLA through SFY 2027-28) and the LEAP limit to 2027-11-01;
- the empty-version figures awaiting the State (LEAP benefit range and rate, CCCAP county limits);
- the open versions from before 2026. By their meanings these are figures the rule fixes rather than indexed figures; CO-118, CO-1514, CO-290, CO-1227, CO-1228 and CO-3876 were spot-checked against their excerpts.

### T-6 (P2): consecutive days

9 CCR 2503-6 3.604.2.O (S2602): "The client's temporarily out of the State status shall not exceed ninety (90) consecutive days" and "A client shall be considered a resident in an institution when the recipient's stay is at least thirty (30) consecutive days". CO-904 allows `days_between(start, determination date) <= 90`. For a client who left on August 1, that is October 30, the 91st calendar day counting the day of departure. CO-3804 needs `days_between >= 30`, which is the 31st calendar day of the stay.

Whether the first day counts is a convention P47 does not state ("the number of days from [date] to [date]"). CO-2006, CO-1510, CO-1217, CO-2351 and CO-4401 have the same shape. Each item's precision should say whether the day of departure or entry counts, and the volume should use one convention.

### T-7 to T-9 (P2)

- **T-7.** CO-1130 `ma_bccp_max_age` = 65 is "the age before which" a woman must be ("has not yet attained the age of 65", S608), and CO-1152 compares `age < ma_bccp_max_age`. The behavior is right, but by conventions rule 8 the name says inclusive. It should be `ma_bccp_age_limit`. This is the only age-name and operator mismatch the script finds.
- **T-8.** CO-800 excludes a retroactive SSI or Social Security payment while `det_month <= months_after(9, receipt month)`. The 9 is a literal (the hard-coded numbers audit missed it), and because the item is person-scope the window is measured to the determination month in every month (T-1).
- **T-9.** See the coverage and mutation tables below. The surviving flips are listed in the generated report: a rule test at the limit would decide each one.

### Checked and found consistent

These are where the boundary or the date is right, so a reader does not repeat the work:

- The MAGI, CHP+, SNAP, CCCAP, LEAP and SUN Bucks income limits ("does not exceed" with `<=`).
- Colorado Works (`<` with 3.606.1.J.4, "equals or exceeds the need standard").
- The Adult Financial grant standards (`<`, "equals or exceeds ... shall be denied").
- QDWI ("less than 200%").
- Needy persons under 21 ("less than", OQ-512).
- SNAP expedited service ("less than $150", "do not exceed $100").
- The SNAP standard medical deduction band (OQ-353).
- The verification due dates (pending through the due date, past due the day after).
- The postpartum and CHP+ prenatal end months ("the last day of the month 12 months after").
- The children's continuous eligibility end month (start + 11).
- The needy newborn (whole month, first birthday).
- The CHP+ newborn guarantee (to the day before the first birthday, as recorded).
- The SUN Bucks summer year (a 2027 summer is "cannot determine" with a lookup-miss, by design).
- `af_is_oap_age`'s birthday-month transition.

## Coverage of the stored households and rule tests

Branches are:

- each `case` arm, `else` included;
- each side of an `otherwise`, meaning the fact was stated or the default was taken;
- each outcome of a threshold comparison.

"At boundary" counts comparisons that some test evaluates with both sides equal. Measured over 4,103 rule tests and 3,759 household expectations, with CO-530 to CO-535 included. Instrumentation changed no value (checked on every unit).

| Program | `case` arms | rule tests | households | either | `otherwise` sides | either | comparison outcomes | either | comparisons at boundary |
|---|---|---|---|---|---|---|---|---|---|
| AdultFinancial | 198 | 169 (85%) | 115 (58%) | 175 (88%) | 364 | 291 (80%) | 186 | 130 (70%) | 39/93 (42%) |
| All (shared) | 17 | 15 (88%) | 9 (53%) | 16 (94%) | 106 | 95 (90%) | 50 | 32 (64%) | 10/25 (40%) |
| CCCAP | 168 | 136 (81%) | 119 (71%) | 150 (89%) | 214 | 187 (87%) | 66 | 49 (74%) | 20/33 (61%) |
| CHP+ | 86 | 69 (80%) | 44 (51%) | 73 (85%) | 30 | 25 (83%) | 88 | 62 (70%) | 12/44 (27%) |
| ColoradoWorks | 153 | 129 (84%) | 101 (66%) | 140 (92%) | 296 | 251 (85%) | 126 | 93 (74%) | 37/63 (59%) |
| LEAP | 73 | 62 (85%) | 45 (62%) | 65 (89%) | 176 | 158 (90%) | 52 | 40 (77%) | 14/26 (54%) |
| Medicaid | 473 | 400 (85%) | 282 (60%) | 415 (88%) | 524 | 428 (82%) | 466 | 363 (78%) | 81/233 (35%) |
| SNAP | 320 | 266 (83%) | 200 (63%) | 288 (90%) | 448 | 390 (87%) | 312 | 225 (72%) | 75/156 (48%) |
| SunBucks | 22 | 19 (86%) | 14 (64%) | 21 (95%) | 42 | 38 (90%) | 26 | 18 (69%) | 5/13 (38%) |
| **all** | 1,510 | 1,265 (84%) | 929 (62%) | 1,343 (89%) | 2,200 | 1,863 (85%) | 1,372 | 1,012 (74%) | 293/686 (43%) |

167 `case` arms are reached by no test, and 331 comparisons have an outcome no test reaches. Both lists, by item, are in the generated report.

## Mutation score

Two kinds of mutant were run:

- each threshold comparison flipped between strict and inclusive (`<`/`<=`, `>`/`>=`);
- each `case` of two or more arms with the results of its first two arms swapped.

A mutant is killed when some test that reaches the mutated node, and passes on the ledger, fails. At most 150 reaching tests were run per mutant (own rule tests first). 33 survivors are reached by more than 150 tests and were judged on the first 150; they are marked "sampled" in the generated report.

| Program | Comparison flips | killed | unreached | Arm swaps | killed | Score (killed / all) | Score (killed / reached) |
|---|---|---|---|---|---|---|---|
| AdultFinancial | 93 | 34 | 3 | 74 | 71 | 63% | 64% |
| All (shared) | 25 | 5 | 1 | 6 | 6 | 35% | 37% |
| CCCAP | 33 | 15 | 0 | 62 | 62 | 81% | 81% |
| CHP+ | 44 | 8 | 2 | 28 | 27 | 49% | 50% |
| ColoradoWorks | 63 | 30 | 2 | 50 | 49 | 70% | 71% |
| LEAP | 26 | 11 | 0 | 26 | 26 | 71% | 71% |
| Medicaid | 233 | 64 | 5 | 160 | 148 | 54% | 55% |
| SNAP | 156 | 62 | 3 | 128 | 127 | 67% | 67% |
| SunBucks | 13 | 5 | 0 | 6 | 6 | 58% | 58% |
| **all** | 686 | 234 (34%) | 16 | 540 | 522 (97%) | 62% | 62% |

The tests decide branches well: 522 of 540 arm swaps are killed. They rarely decide limits: 234 of 686 flips are killed. A flip survives when no test puts the two sides of the comparison equal, and those are the comparisons where a "less than" read as "at or below" would go unnoticed. The 436 surviving flips on reached nodes, and the 18 surviving swaps, are listed in the generated report.

## Generated boundary cases

`npm run boundaries` takes each of the 686 threshold comparisons in a simple context (not under a binder or a change of month). It finds a stored household that reaches it, falling back to a rule test, and the person and month the comparison is evaluated for. It then builds three variations of that household, with the variable side stated just below, at and just above the threshold:

- money by a cent, a count or age by one, a date by a day, a month by a month;
- an age that `years_between` takes from a date of birth also gets the birthday the day before, on, and after the date it is measured to.

For each variation the script reports which neighbour the value at the limit agrees with, for the comparison, the item and the household's own expectation. It also reports the wording the cited excerpts put beside the threshold's figure.

366 comparisons were generated. 320 were not:

| Reason | Comparisons |
|---|---|
| variable side is an expression | 184 |
| under a binder or a month change | 109 |
| no test reaches it | 15 |
| both sides are fixed figures | 12 |

12 generated comparisons were flagged, with wording on the other side or mixed. Each flag was read against the excerpt:

- **CO-1185.** Confirmed: T-4 (CO-535).
- **CO-2419**, income below the highest MAGI standard. The excerpts' "does not exceed 133/142" are the groups' own standards. The needy-persons rule says "less than", and OQ-512 records the reading. Not a defect.
- **CO-539, CO-548, CO-552, CO-2439**, age 19 or older. "19 through the end of the month" (S3350) is the Adults group's 65 limit. Within the determination month the child group's birthday month is handled by `not ma_is_child_category`. The defect in other months is T-1.
- **CO-600, CO-1162, CO-1164, CO-1179**, aged 65. "more than 65" is 42 CFR 435.520's "must not impose an age requirement of more than 65 years". Not a defect. The retroactive-month exposure is T-1 (CO-533).
- **CO-2257**, under 21. "after 21" in S1518 is another clause. Not a defect.

The generator also produced the day-level variations that showed T-1. The birthday the day before, on, and after the measured date all agree with the item's rule, so the error is in which date the rule measures to, not in the comparison.

## Stored cases added

| Case | Finding | What it fixes in place | Failing expectations (known-failures.json) |
|---|---|---|---|
| CO-530 | T-1 | MAGI retroactive August and September before and in the 19th-birthday month: child, eligible | `ma_magi_category` and `ma_magi_eligibility_status` @2026-08 and @2026-09 |
| CO-531 | T-1 | Application month = 19th-birthday month, determined the next month: child, eligible | `ma_magi_category`, `ma_magi_eligibility_status` @2026-10 |
| CO-532 | T-3 | 2026 retroactive months on a January 2027 application judged by the 2026 SSI rate: none | `ma_ssi_related_category` @2026-11 and @2026-12 |
| CO-533 | T-1 | Retroactive months before a 65th birthday: none | `ma_ssi_related_category` @2026-08 and @2026-09 |
| CO-534 | T-2 | Adult Financial ISM in January 2027: 363; countable income 943 | `af_in_kind_support_and_maintenance`, `af_countable_income` @2027-01 |
| CO-535 | T-4 | Winnings of $89,999.50 and $79,999.50: 2 months and 1 month | `ma_lottery_winnings_spread_months` @2026-09 and @2026-10 |

The expectations in these cases that already pass are the controls: CO-530 October, CO-531 November, CO-532 January and CO-533 November. They show that only the boundary month is wrong. CO-530 to CO-533 and CO-535 touch Medicaid items the non-MAGI fix round may also be editing. Their expectations rest on the rule text, not on any item, so they stay valid through that round.

## Validation

`npm run typecheck`, `npm test`, and `CHECK_BASE=origin/main npm run check` all pass. The check reports co rule tests 4104/4104, household expectations 3729/3759 (the 30 failures are all listed in known-failures.json: 16 existing and 14 added here), and the conformance self-check passes 8,023/8,023.

## Fix round (step 7 of the plan), 2026-11-23

Each finding's disposition, in the order the fixes were committed. Every engine change was measured first: every rule test and every stored household expectation (7,862 units) was evaluated under the old and the new resolution, with every derived value and every parameter read recorded, and each value that moved is listed with the text that explains it.

### T-3: parameter versions in the month evaluated (fixed)

The contract, decided from the programs' texts (docs/operators.md, Resolution step 2): in a month-scoped evaluation a versioned parameter takes the version in force on the first day of the month (on the determination date in the determination month); outside a month, on the determination date. A rule whose text fixes a figure at the determination says so with `as_of`.

| Program | Past month (retroactive, look-back) | Future month (prospective) | Basis |
|---|---|---|---|
| Medicaid, CHP+ | its own month's figure | its own month's figure | 42 CFR 435.915(a)(2) "would have been eligible ... at the time" (S218); 8.100.4.G.1 month by month (S3351); 8.100.5.C.1 (ABD, from the first day of the month eligible) |
| SNAP | its own month's figure | its own month's figure | each figure's "effective October 1" version (S738-S742) and the month's allotment; a lottery prize is compared with the limit in force when received (273.11(r)(2)) |
| Colorado Works, Adult Financial | its own month's figure | its own month's figure | standards dated by State fiscal year and by January 1 (S414, S700, S706) for the month's grant; CW boarder income deducts the month's allotment (3.605.2.E.4) |
| CCCAP | determination date (fee, entry limit) | determination date (fee, entry limit) | the fee is assessed at referral, application or redetermination and is not raised during the twelve months (3.124.C, S2850); the entry limit is the application or redetermination test (3.111.H.1.a). The exit limit (85% SMI) is the month's |
| LEAP | determination date | determination date | the heating season's limit table (3.752.22.D) and the guideline on the determination date (OQ-253) |
| Medicaid community engagement, renewal interval | determination date | determination date | assessed by a determination made once the requirement is in force; the interval is dated by when the redetermination is scheduled |

Made explicit before the engine changed (no answer moved): CO-1289, CO-986, CO-995, CO-1003, CO-1278, CO-1975 and CO-2455 read their figures `as of` the determination date; CO-379-T2 and CO-380-T1 test the FY2026 SNAP figures in September rather than in October read on September 30.

Measured moves (old resolution to new), all explained:

| Unit | Old | New | Explanation |
|---|---|---|---|
| CO-532 p1 ma_ssi_related_category @2026-11, @2026-12 | aged | none | the fix: the 2026 retroactive months read the 2026 SSI rate, 994 (S319), not 2027's 1,029; inside them ssi_federal_benefit_rate_individual moves 1,029 to 994 and ssi_student_earned_income_exclusion_annual 10,080 to 9,730 |

Before the `as_of` refactor, five more units moved, and each was a rule whose text fixes the figure at the determination: CO-1289-T8 (the September 2028 fee for July 2028: 45.27 would have become 131.27 under 3.124.P), CO-1975-T5 (January 2027 of a December 2026 determination), CO-176 leap_is_eligible @2026-11 and @2026-12 (the October 2026 income month has no season table before November 1), and CO-379-T2 and CO-380-T1 (October figures of a September 30 determination). CO-379-T3 now states the October figure ($769) for that case.

### T-4: lottery bands to the cent (fixed)

`ma_lottery_winnings_spread_floor` (CO-1183) is the statute's $80,000, compared with "less than" (42 U.S.C. 1396a(e)(14)(K)(i)(I)-(II), S1234), and `ma_lottery_winnings_spread_months` (CO-1185) is 2 plus the whole $10,000 increments above it, at most 120. Colorado's "$79,999" and "$89,999" (S669) agree at whole dollars only; both items now carry a statute_override for the cents between, and OQ-216's boundary sentence says so. CO-1185-T1 to T9 still pass; T10 to T15 test $79,999.01, $79,999.99, $80,000.00, $89,999.99, $99,999.99 and $1,259,999.99. Measured: two values move, both CO-535 (September 3 to 2, October 2 to 1), the fix; CO-535 leaves known-failures.json.

### T-2: the Adult Financial maximum ISM follows the SSI rate (fixed)

`af_ism_maximum` (CO-1513) keeps its identifier and is now derived by 3.520.79.E.2 (S1012): round(ssi_federal_benefit_rate_individual x af_ism_benefit_standard_rate + af_ism_disregard), with the rule's figures as parameters (CO-5400, 0.3333; CO-5401, $20) and the SSI benefit standard of 3.510 (S448) as the individual federal benefit rate (CO-235), read in the month evaluated ("current"). It is per person per month so each month reads its own SSI rate; it moved from the parameters chapter to the cash chapter. The rule's stated figures come out of the formula and are its tests: 2025, 342 (CO-1513-T1); 2026, 351 (T2); 2027, 363 (T3); a December 2026 month of a January 2027 determination, 351 (T4). Measured: two values move, both CO-534 (af_in_kind_support_and_maintenance 351 to 363, af_countable_income 931 to 943), the fix; CO-534 leaves known-failures.json. af_countable_income (CO-946) and af_unearned_income_other_than_ssi (CO-3831), which the receipt-records track is migrating, are not edited: they read the identifier.

### T-1: ages in the month evaluated (fixed for Medicaid; OQ-950, OQ-951)

The contract (docs/operators.md, "Ages in a month"): `age` (CO-300) is the age on the determination date wherever it is read. A month-scoped rule that tests an age for the month it evaluates reads an age taken in that month, on the day the program's text makes decisive. Medicaid makes any day of the month count: 8.100.4.G.1 for MAGI (S3351), 8.100.5.C.1 for the Aged, Blind and Disabled categories ("the first day of the month the person becomes eligible", new excerpt S3900), 8.100.5.C.3 for the Children's Buy-In; 42 CFR 435.915(b) (S3901) is the federal option. Since an age only grows, "under N" is decided on the first day of the month, "N or older" on the last, and "through the end of the month" of a birthday on the last day of the month before; a disqualifying condition takes the other day. No operator was needed: the three ages are items over existing operators.

- `ma_age_on_first_day_of_determination_month` (CO-4978) is now `ma_age_on_first_day_of_month`, and `ma_age_before_determination_month` (CO-4790) is `ma_age_before_month`, both per month and anchored on the month evaluated; `ma_age_on_last_day_of_month` (CO-5402) is new.
- Per month now, reading the month: ma_is_under_child_age_or_turns_nineteen_this_month (CO-564), ma_is_under_adult_upper_age_through_birthday_month (CO-4550), ma_is_former_foster_care_category (CO-549), ma_is_needy_newborn (CO-550), ma_is_dependent_child_in_month (CO-4791), ma_is_aged (CO-600).
- Month readers of `age` that now read the month's age: CO-539, CO-548, CO-552 (the Adults group's 19 and the bar for a parent of a child under 19 without coverage), CO-1161 (DAC 18), CO-1162 (disabled widow 50 to 64), CO-1179 (IMD exclusion, 21 to 64, days flipped), CO-1152 (BCCP under 65), CO-618 (WAWD 16), CO-620 (CBWD's working-child bar), CO-654 (PACE 55). CO-1152, CO-654 and CO-1179 are groups neither Colorado rule names; the assumption is OQ-950.
- The explicit exception: a per-person rule about the determination reads these [at] the determination month: ma_is_aged_blind_or_disabled (CO-603), ma_is_parent_or_caretaker_relative_of_dependent_child (CO-2869), ma_is_cover_all_coloradans_person (CO-1173), the presumptive eligibility items CO-2439, CO-3155 and CO-708. Person-scope Medicaid items that read `age` (household membership, citizenship, HCBS and others) stay on the determination date by their scope.
- docs/operators.md's "a past month's 'child under 22' uses today's age" is gone; step 7 now says `age` is the determination date's age and points to the month ages.
- Colorado Works (cw_is_dependent_child, CO-901) and Adult Financial (af_is_oap_age, CO-940): no fetched text states the date for a prorated first month or a later month; both stay on the determination date, recorded as OQ-951. CO-05's p3 note is rewritten: she is 17 in April 2027 (the Children's group reads the month), and no expectation moves.

Measured (every rule test and stored household, old ledger against new): CO-530 August and September (none to child, ineligible_income to eligible), CO-531 October (none to child, ineligible_income to eligible) and CO-533 August and September (aged to none), the fix; nothing else. CO-531 now also states the continuous eligibility exceptions and his expected annual income, which the child path reads in October. CO-533 asserts October as aged (8.100.5.C.1), which the audit had left open. Four household expectations of items now per month (CO-06 ma_is_aged, CO-147 CO-564, CO-149 CO-549, CO-203 CO-550) are keyed by their determination month with the same values. Rule tests of the re-scoped items carry the determination month; those that stated `age` also state the month ages. CO-530, CO-531 and CO-533 leave known-failures.json.

### T-7: the BCCP age limit's name (fixed)

`ma_bccp_max_age` (CO-1130) is renamed `ma_bccp_age_limit`: "has not yet attained the age of 65" (S608) is an exclusive limit, which conventions rule 8 names `_age_limit`, and CO-1152 already compared it with "under". A rename only: measured, no value moves.

### T-8: the retroactive lump-sum window in SSI-method resources (fixed in part; OQ-952)

The nine months are a parameter, `ssi_retroactive_benefit_exclusion_months` (CO-5403, 9, § 8.100.5.F.6.c, S3404), "following receipt": the months after the month of receipt, through the ninth, as CO-800 already counted them. The window stays measured to the determination month, now stated in CO-800's precision: the item is the determination date's resources, read from holdings each case states once, and its readers are per person, so the window and the holdings it applies to are the same date. Valuing a retroactive month's resources separately would make the resource facts and their readers per month, which the non-MAGI fix round owns; the assumption and its effect are OQ-952. Measured: no value moves.

### T-6: consecutive days (one convention, stated per item; OQ-953)

None of the texts (3.604.2.O, S2602; 3.532.D, 3.543.D, 3.548.D, S1008 to S1010; 3.520.64.E, S3201) says whether the day of departure or entry is one of the N days. The volume keeps one convention, now written beside P47 in docs/conventions.md: "N consecutive days" is the days elapsed since the day the absence or stay began (`days_between`), the day itself not counted. Each reader states its reading and the example date in its precision and carries OQ-953: CO-904, CO-3804, CO-2351, CO-2006, CO-1510, CO-1217, CO-4401. Measured: no value moves.

### T-5: yearly figures close at the end of their year (fixed)

Decided from product-owner decision 4 (missing information is "cannot determine"): a figure published for a year has its version closed at the end of that year and a `review_by` no later than that day, so a later date is "cannot determine" with a `no-version` warning, on every stored household or rule test that asks for it, until the next figure is loaded; a figure in force until replaced (the poverty guideline) stays open with `review_by`, and a fixed statutory figure stays open. Recorded in docs/conventions.md, "Effective dating and change sets". Because a month reads its own month's version (T-3), the warning names the month a stored household asks about (`no-version: ... no version in force on 2027-01-01`).

Applied to every listed item, closed at 2027-01-01, with `review_by` added where it was missing: CO-289, CO-291, CO-1200, CO-1201, CO-1202, CO-4730, CO-807, CO-808, CO-827, CO-828, CO-830, CO-831, CO-832, CO-887, CO-3022 (CO-1513 is now derived, T-2). For the same rule, the other yearly figures with an open latest version: the SSA 2027 figures CO-235, CO-236, CO-1802, CO-1803, CO-3379, CO-3380 (closed at 2028-01-01, `review_by` 2027-11-01, SSA's notice); the SNAP federal fiscal year 2027 figures CO-110 to CO-114, CO-118, CO-119, CO-122, CO-123, CO-130 to CO-135, CO-1235 to CO-1238, CO-3043 and CCCAP's 85% SMI table CO-1804, CO-1805 (closed at 2027-10-01); the Buy-In premium tables CO-2457, CO-2458, re-based each State fiscal year (closed at 2027-07-01). The poverty guideline (CO-181, CO-182, CO-3625) stays open with `review_by`, being in force until the next is published.

Measured: two values move, CO-114's January 2027 QMB eligibility and MSP category (true and qmb to cannot determine), because the 2026 MSP resource limit no longer answers 2027. CO-114 tests the cost-of-living disregard, so it now states the 2026 limit under `parameters:` with the reason (any 2027 limit above her $3,000 gives the same answer), and its expectations are unchanged. No other stored household or rule test reads a closed figure past its year.

### T-9: rule tests at the limit (fixed for the eligibility gates and benefit amounts)

129 rule tests in 77 items, each stating one side of a threshold comparison equal to the other, so that the comparison's strict/inclusive flip changes the item's answer. The items are the eligibility gates and benefit amounts first (identifiers naming eligibility, a category or status, an income or resource test, a grant, allotment, benefit, premium or fee): the income and resource limits of every program, the age gates of the Medicaid groups, the verification due dates, the presumptive eligibility standards. Each test starts from a passing rule test of the item that reaches the comparison and states the one value; its expectation is the item's answer with the two sides equal, the side the audit's wording check (section 4 of the generated report, "Checked and found consistent") confirmed for these limits ("does not exceed" as at or under; "less than" and "equals or exceeds" as under). Adult Financial unearned income (CO-946, CO-3831), which the receipt-records track is migrating, is left out.

Mutation score (`npm run boundaries -- --only coverage,mutation`), comparison flips killed, before and after:

| Program | Flips | Killed before | Killed after | Score before (killed / all) | Score after |
|---|---|---|---|---|---|
| AdultFinancial | 93 | 34 | 49 | 63% | 72% |
| All (shared) | 25 | 5 | 5 | 35% | 35% |
| CCCAP | 33 | 15 | 20 | 81% | 86% |
| CHP+ | 44 | 8 | 19 | 49% | 65% |
| ColoradoWorks | 63 | 30 | 33 | 70% | 73% |
| LEAP | 26 | 11 | 12 | 71% | 73% |
| Medicaid | 233 | 65 | 121 | 54% | 69% |
| SNAP | 156 | 62 | 78 | 67% | 72% |
| SunBucks | 13 | 5 | 6 | 58% | 63% |
| **all** | 686 | 235 | 343 | 62% | 71% |

(The score columns count the arm swaps too: 523 of 540 killed before, 524 after.) The 327 flips that still survive are listed in the regenerated report; most are in items that are not gates (verification counts, household composition, shared definitions) or are compared to an expression no rule test states directly.

### T-3, part 2: per-person figures read by month rules are per month (fixed)

Under the contract a per-person or global item is one value per case, on the determination date, so a per-person item that only looks up a figure gave the determination date's figure to every month its month-scoped readers evaluate, the T-3 defect one step removed. Ten such items, every reader of which is already per month, are now per month: snap_standard_deduction (CO-370), snap_maximum_allotment (CO-383), snap_gross_income_limit (CO-345), snap_net_income_limit (CO-346), snap_utility_allowance_amount (CO-1500), snap_meets_resource_limit (CO-344), cw_need_standard (CO-911), cw_grant_standard (CO-912), ma_ssi_poverty_guideline_monthly (CO-1750) and ma_income_trust_gross_income_limit (CO-1985). SNAP's October 1 figures then reach an October month of a September determination with the excess shelter cap (7 CFR 273.12(e)(1)'s mass change), Colorado Works' fiscal-year standards a July month, and the MSP guideline a retroactive month. Their rule tests carry the determination month, and the 17 household expectations of cw_need_standard and cw_grant_standard are keyed by it, with the same values. Measured: no value moves. Per-person items with a per-person reader stay on the determination date: ma_personal_needs_allowance (CO-1987, read by ma_csra_increased), snap_bbce_gross_income_limit (CO-339, read by snap_meets_ece_eligibility, a test at the determination) and the presumptive and declared-income items, which are determinations made on a date.
