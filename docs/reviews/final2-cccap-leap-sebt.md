# Second-pass review: CCCAP, LEAP and SUN Bucks (family cccap-leap-sebt), HEAD 88e2e9f

Recorded from the reviewer's report (the reviewer worked read-only; probes in /tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/rv-cccap/, probe households RV-S1, RV-S2, RV-S4 to RV-S8 built by rv-cccap/gen/mk.py into a scratch copy of the repo).

**Verdict: 10 P1 found. The family is not complete under the stopping rule.**

All 15 earlier P1s are fixed (F-01 to F-13, V-1, V-7), with one residual on F-11. No regression in stored cases. `npm run check` passes (3288 conformance cases, 0 failed). Every identifier the family's 37 outcomes read resolves (334 items in the closure, plus the built-in `relationships`). Every new parameter has a dated version except CO-3932, recorded as blocked (OQ-682).

## Earlier P1s

| ID | Status | Evidence |
|---|---|---|
| F-01 / V-7 (child support deduction, 3.111.K) | Fixed | CO-3902. CO-125: deduction 300, income 2800, fee 101, derived by hand. |
| F-02 (homelessness, 3.121) | Fixed | RV-S7: `eligible_homelessness_stabilization`, fee 0, 60-day due date, pending on day 31. |
| F-03 (Child Welfare Child Care, 3.120) | Fixed | New status row and the I.4 fee row (row position: N-3). |
| F-04 (leave, D.8-9; breaks, 3.112.C) | Fixed | RV-S5: maternity leave at application gives `eligible_low_income`. |
| F-05 (job search only while enrolled) | Fixed | CO-08 gives `ineligible_activity`. |
| F-06 (one year per SUD instance) | Fixed | CO-3905, tests T15/T16. |
| F-07 (IPV disqualification) | Fixed | CO-3906, first CO-989 row. |
| F-08 (CW fee on earned income only) | Fixed | CO-2578-T3. |
| F-09 / SW-35 (prior thirty days) | Fixed for recurring income | CO-125: five paydays for CCCAP, weekly x 4 for LEAP. |
| F-10 (SSI in LEAP) | Fixed | CO-125: 967.50 becomes 967. |
| F-11 (prizes and lump sums) | Fixed, one residual | LEAP still reads them by calendar month: N-8. |
| F-12 (LEAP denial factors) | Fixed | CO-3928 to CO-3930. |
| F-13 (SUN Bucks receipt from children) | Fixed | CO-2708-T7; CO-02 p4 still `eligible_categorical`. |
| V-1 (LEAP self-employment receipts) | Fixed | CO-1711 reads CO-3927. |

Deferred P2s that are really P1: F-17 (both halves: N-5, N-6), F-14 (N-7; restricting the spouse join creates no cycle, since `cccap_is_adult_caretaker` and `cccap_is_teen_parent` read no household item), F-21's Head Start part (N-9). F-18, F-20, V-16, V-17 and the "all children" half of F-21 stay P2/P3.

## New P1s

| ID | Item(s) | Governing text | What is wrong | Proposed fix |
|---|---|---|---|---|
| N-1 | CO-1290, CO-3508; CO-3307 options `change_during_eligibility_period`, `transition_from_colorado_works` | 3.124.C: "During the twelve (12) month eligibility period the household parent fee cannot be assessed higher than the parent fee determined at the most recent Colorado Works Child Care referral or low-income application or re-determination"; 3.124.B.1-4; 3.117.F | No item caps the fee. RV-S6 (transition, $2,000 wages, $600 child support received): $137, where the referral fee on earnings was at most $47. | Supplied `cccap_parent_fee_at_last_determination` and a B.1-4 increase reason; for change and transition determinations take the lower of the formula and prior fee unless B.1, B.3 or B.4 applies. |
| N-2 | CO-995, CO-994 → CO-989, CO-1290 | 3.119.A: a household of one; "The only countable income for a protective services household is the income that is received by the child(ren) that have been placed" | The protective services row tests the evaluated person's own income. RV-S1: the child reads `eligible_protective_services`, fee $3; the kin caretaker reads `eligible_low_income`, fee $167, in the same household. CO-989-T3b is titled "placed child" but tests an adult. | CO-995 tests the sum of CO-994 over the placed children, as CO-2578 does. Fix the T3b title. |
| N-3 | CO-989 row order | 3.103.UU (eligible child; children served through Colorado Works must be citizens/legal residents); 3.119.F.3 | CW, protective services and Child Welfare rows precede the eligible-child row. RV-S8 (CW household, only child 15): `eligible_colorado_works`, verification `not_applicable`. | Eligible-child test before or inside those rows; owner states whether Child Welfare Child Care also requires an eligible child. |
| N-4 | CO-989 (no item) | 3.114.B.2 (parent fees not paid), B.11 (22+ unexplained absences); A.5; 3.124.N ("will remain ineligible until" fees paid or arranged); 3.117.A.1, A.3 | None read; such households come out eligible. The F-25 "case-management events" reading is rejected: the text calls them eligibility reasons. | Supplied findings for unpaid fees without arrangement and 22+ unexplained absences with two failed contacts; an `ineligible` row by determination type; transition reads `cw_is_serving_ipv_disqualification` (CO-1730). |
| N-5 (was F-17) | CO-1709, CO-1710 | G.2.a: "The county shall obtain verification of all expenses ... or they will not be considered"; I.2 "minus verified business expenses"; H.5.a.3; 3.113.A.1.a.3 | Expenses deducted unconditionally. RV-S2: $5,000 receipts, $3,000 unverified costs → $2,000, eligible (fee $47); the rule gives $5,000, over $3,336.16, `ineligible_income`. | Gate CO-1709 on an expense-verification fact (CO-3927 or broader), false when not stated. |
| N-6 (was F-17) | CO-1450, CO-1451, CO-1447, CO-2873 | 3.119.B (60 days for the child's income), F (6 months for citizenship, age, identity), G (60 days immunization); 3.116.C (CW counts earned income only) | RV-S1: a protective services child's unverified Social Security is past_due on day 31. CW referrals are asked to verify unearned income the program does not count. | Route-specific due dates (as CO-3909); drop the unearned element for CW referrals. |
| N-7 (was F-14) | CO-982 | 3.103.LLL; 3.103.C; H.1; D.10 (a separated caretaker with a temporary order "shall not be determined ineligible based on the other spouse's ... financial resources") | Any co-resident spouse is joined and counted, caretaker or not, with no D.10 exception and no open question. | Join a spouse only when `cccap_is_adult_caretaker` or `cccap_is_teen_parent`; add a D.10 temporary-order fact. |
| N-8 (F-11 residual) | CO-3926, CO-1002; OQ-681 point (4) | 3.752.22.A: "All countable unearned income shall be the countable gross unearned income received in the income verification period"; 3.751.1 | Lottery and lump sums are read for the calendar month. RV-S4 (application 2026-11-05, $5,000 prize in October inside the period): $3,967, eligible; the rule gives $8,967, over $7,258, ineligible. OQ-681's Class line is wrong for this point. | Neutral one-time-receipt facts for the thirty days before the application, read by LEAP; correct OQ-681. |
| N-9 (was F-21) | CO-1699 | 7 CFR 292.14(f)(1): only children eligible through SNAP, FDPIR, TANF or an approved program, or foster, homeless, migrant or runaway children are excepted from verification | A Head Start child, or one individually certified for free or reduced-price meals, selected for verification reads `not_required`. | Split Head Start and individual certification out of `sebt_other_categorical_basis` for the CO-1699 exception. |
| N-10 | CO-989, CO-995 | 3.119.C: under an approved county plan the Child Welfare worker may "waive the income requirement for protective services households on a case-by-case basis ... documented in the CCCAP case file" | Not modeled, no open question. | Supplied case finding `cccap_ps_income_requirement_waived` that satisfies the CO-995 test. |

## P2 and P3 (proposed dispositions)
- SUD self-attestation: G.4.d allows it; CO-1441 and CO-1677 require a document. Record an open question or exempt the SUD arm.
- LEAP fraud penalty (3.751.563): a non-applicant member serving it is not modeled (CO-3929 says so). Record the household effect as a state policy choice.
- LEAP 3.752.23.Q: CO-1002 excludes every under-18 child's wages without "residing with a parent or guardian"; it counts a child's self-employment, which Q's "earned income" covers.
- Verification triggers CO-2873, CO-2874 ignore prizes, lump sums and thirty-day-only income facts.
- J.28 (irregular income under $90 a quarter) is filed under OQ-162 (county plans); needs its own disposition.
- CO-984's minimum-wage test divides calendar-month wages by hours, not the thirty-day figure.
- F-18, F-20, the "all children" half of F-21: P2 stands. V-16, V-17: P3 stands.
- Stale text: CO-991 precision names `has_medical_statement_of_unfitness` (derivation reads CO-1744); CO-3916 precision says work-study is earned income (CO-3912 excludes it, per J.16); CO-875 precision quotes FY2023 wording.

## Coverage map
- CCCAP carried: Low-Income, Colorado Works (with diversion), protective services, Child Welfare, homelessness; IPV bar; activities (employment, self-employment, job search, education, SUD, leave and breaks); entry and exit limits with 2026-10-01 FPG and 85% SMI; thirty-day income, inclusions, exclusions, K deduction; fee formulas P and Q, reductions and waivers; verification at 15 and 60 days. Gaps: N-1 to N-7, N-10.
- LEAP carried: point-in-time eligibility, season, household, citizenship, SSN and SAVE, residency; income (SSI, pay schedule, self-employment month); 2026-27 60% SMI table (sizes 1-15 checked against D-144); vulnerability; benefit steps A-G (program-year figures blocked by OQ-532); denial factors; verification. Gap: N-8.
- SUN Bucks carried: school age, enrollment, categorical receipt, other categorical bases, 185% limit ($5,088 for 4), $40 x 3 benefit, verification. Gap: N-9.

## Rules checked (50)
CCCAP: CO-984, 985, 986, 987, 988, 989, 991, 993, 994, 995, 1289, 1290, 1440, 1442, 1447, 1450, 1451, 1709, 1710, 1804/1805, 2103, 2104, 2578, 2814, 3005, 3007, 3307, 3508, 3902, 3905, 3907, 3908, 3909, 3912, 3913, 3915 to 3918. LEAP: CO-875, 1002, 1007, 1711, 1281, 3000, 3001, 1282, 3924 to 3926, 3928 to 3930. SUN Bucks: CO-1297, 1298, 1699, 2708, 1244, 3013.

## Cases recomputed by hand (all match the engine)
- CO-125: CCCAP $2,500 + $600 - $300 = $2,800 (exit limit $8,638.03); fee 1% x $2,276.67 + 15% x $523.33 = $101.27 → $101. LEAP $5,167 against $7,258, eligible.
- CO-08: CCCAP $2,600; p2's job search at application is not an activity → `ineligible_activity`. LEAP $3,000 against $7,258, eligible.
- CO-02: CCCAP fee $38.2662 x 0.8 = $30.61 → $30; LEAP $3,560 against $6,097 for 3, eligible; LEAP verification due 2026-11-15; SUN Bucks p4 `eligible_categorical`, limit $5,088.

## Open questions
Class lines confirmed against D-87, D-86, D-173, D-88, D-117: OQ-121, 162, 163, 253, 254, 255, 377, 532, 535, 536, 540, 550, 551, 561, 562, 610, 612, 614, 680, 682. Exceptions: OQ-681 point (4) misclassified (3.752.22.A answers it, N-8); OQ-377's body accepts the Head Start over-exception (N-9); OQ-162 carries J.28, which is not a county-plan question.
