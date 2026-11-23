# Earned-income records, step E1: CCCAP and LEAP (with SUN Bucks)

Step E1 of docs/design-earned-and-resource-records.md (4.2, the E1 CCCAP and E1 LEAP rows) for the child care (CCCAP), energy assistance (LEAP) and Summer EBT (SUN Bucks) programs, on ccr-9d19bf4c-wmnwcl from 9650b0c (E0 merged). CCCAP and LEAP read the earnings records (earnings, CO-5100) through their own counting tables (cccap_earnings_treatment_table CO-5105, leap_earnings_treatment_table CO-5102) and no longer read a scalar earned-income fact; SUN Bucks reads no earnings (its income test reads the household's reported school-meal income). The thirty-day wages total and the job-began flag that E0 could not restate (CO-3910, CO-3923) are replaced by pays stated with their dates. The round also fixes the wrong answers the records expose, applies decision 4 to the remaining reader defaults over receipts, settles or records the T-9 boundary questions of the three programs, and takes the small duplicate-path dispositions inside them. Every changed rule has hand-computed rule tests from the fetched text (9 CCR 2503-7, D-86, re-fetched 2026-11-23; 8 CCR 1403-1, D-87, re-fetched 2026-11-23; 45 CFR 98.20, D-442, fetched 2026-11-23 from eCFR).

## 1. Commits

| Commit | Step |
|---|---|
| e1d2e50 | E1 LEAP: pays by date, each job by its own schedule; SCSEP apart; business, costs and PASS from the records; the 3.752.23.Q child test one item (D-L2); boarders counted (E1-L2); OQ-1160, OQ-1162 |
| c20d04c | E1 CCCAP: the thirty days by dates; gross wages, has-earned-income, business receipts, costs, launch-period hours and other income from the records; J.28 pools irregular earnings (E1-C3); D-K2; the seven thirty-day households and CO-322 restated |
| e6a68b2 | SUN Bucks: decision 4 on a child's unstated Colorado Works receipts (CO-2708); CO-211 states its child's empty receipts |
| 55bde3a | CCCAP T-9 rows: A-8 settled by 45 CFR 98.20 (S4420, D-442; OQ-1163 for Child Welfare Child Care), A-11 and A-12 by 3.103.YY (S4421); the contradictory-given tests rebuilt; D-K1 |
| (docs) | this review, the change record, docs/plan-colorado.md, the receipts harness classes, UI count pins |

## 2. LEAP (9 CCR 2503-7 3.751.1, 3.752.21-23, 3.755.21)

| Item | Reads now | Replaces |
|---|---|---|
| leap_person_wages CO-3925 | CO-3912 + CO-5120 + CO-5121, and CO-5122 for a person under leap_scsep_exclusion_min_age | one pay schedule per person (CO-3921, CO-3922), the job-began flag (CO-3923, read as false), scsep_wages, employer_health_insurance_subsidy_received and in_kind_compensation_value (each read as 0) |
| leap_wages_in_income_verification_period CO-3912 | a job that began on or after the period's first day, or ended on or before the application date: its pays dated in the period (from leap_income_verification_period_start through leap_application_date), C.3.a-b | the thirty-day total CO-3910, or the month's wages less work-study |
| leap_ongoing_wage_streams CO-5120 (new) | ongoing pay stated as a stream: per_payment times four, two or two (C.1-2); monthly or less often, the month's amount | |
| leap_ongoing_dated_wages CO-5121 (new) | ongoing pay stated as dated pays: per schedule, the average pay of the eight weeks before the application (leap_earned_ongoing_income_weeks CO-5125) times the pays C adds (B, OQ-681); pays of another frequency when received in the period (OQ-1160) | |
| leap_scsep_wages CO-5122 (new) | SCSEP pay by the same three readings; the age is applied outside the sum (P55), in CO-3925 (23.CC) | scsep_wages subtracted from a total |
| leap_self_employment_gross_receipts CO-5126 (new), CO-1711, CO-1712 | the business's receipts of the month; the cost records the table deducts, when receipted (I.2); the receipts' PASS set-aside | self_employment_gross_receipts and the cost facts (each cost read as 0) |
| leap_household_income CO-1002 | the PASS set-aside is now taken off each pay (3.752.23.DD) instead of once off wages and business together; the child test from CO-5123 | pass_set_aside_earned_income (read as 0) |
| leap_earnings_are_excluded_as_child CO-5123 (new) | 3.752.23.Q, read by CO-1002 and CO-1455 | the condition written in both (duplicate-paths D-L2) |
| leap_boarder_payments CO-5124 (new), leap_person_unearned_income CO-3926 | a boarder's payments (room and board, room only, board only) as unearned income, 3.752.21 | room_and_board_payments_received not read; the board-only and room-only receipts |

The table (CO-5102): the business rows read `counted_self_employment` (a name for the reader); boarder_payments `counted_as_unearned_income` (finding E1-L2). LEAP's receipt table (CO-5001): the three kinds that are earnings (uniformed_services_special_pay, board_only_payment, room_only_payment; design 2.3) read `counted_in_earnings`, so a transition copy stated in both lists is counted once.

## 3. CCCAP (8 CCR 1403-1 3.111.G-K)

| Item | Reads now | Replaces |
|---|---|---|
| cccap_person_earned_income CO-3915 | the pays the table counts as wages (I.1, I.31; not work-study, J.16) dated in the thirty days before cccap_application_or_redetermination_date (CO-5150, new; cccap_prior_income_period_days CO-5151), else the month's pay standing for them (OQ-680); J.28 as in E1-C3; plus self-employment | the thirty-day total CO-3910, or the month's wages_gross less work-study (read as 0) |
| cccap_person_gross_wages CO-5152 (new) | every pay for work as an employee in the same days, work-study included: the gross wage of the minimum-wage test (G.1.b; CO-984) and of the Colorado Works no-paid-employment test (CO-1290) | wages_gross |
| cccap_has_earned_income CO-5153 (new) | gross wages or business receipts, for CO-1445 and CO-1684 | has_earned_income (CO-1356, program All; design 2.5 dissolves it) |
| cccap_self_employment_gross_receipts CO-5156 (new), CO-1709, CO-1710 | the business receipts of the month; the cost records deducted, interest for a farm's cost (I.3.b), when verified (G.2.a); launch-period income from the hours each business record states (G.2.e) | self_employment_gross_receipts, the cost facts (each read as 0), self_employment_hours_worked with all of hours_worked when not stated |
| cccap_other_countable_receipts CO-4464 | in-kind pay (I.4), an employer's vendor payments (I.5), boarders (I.18) from the records, the same days and J.28 | in_kind_compensation_value, employer_vendor_payments_received, room_and_board_payments_received, each read as 0 |
| cccap_irregular_earnings CO-6150, cccap_irregular_earnings_in_quarter CO-6151 (new); CO-4076 | J.28's quarterly total pools irregular earnings with irregular receipts | |
| cccap_requires_verification_of_activity_schedule CO-5154, cccap_activity_schedule_verification_is_pending CO-5155 (new); CO-1447, CO-1448 | the self-employed caretaker's schedule from the records | the condition written in both counts (duplicate-paths D-K2) |
| cccap_household_has_eligible_child CO-6152 (new); CO-987, CO-989, CO-2585 | | the test written three times (duplicate-paths D-K1) |

The table (CO-5105): wioa_on_the_job_training `counted` (I.31 names it, S4020; it was marked counted because no rule excludes it); employer_vendor_payment and boarder_payments `counted_other_income`, the business rows `counted_self_employment` (names for the readers, no change of reading). CCCAP's receipt table (CO-5720): the three kinds that are earnings read `counted_in_earnings`. CO-425 (E0-F1) states $600 of room and board as a boarder's earnings record and again as an other_taxable receipt; CCCAP reads the boarder record once (I.18, CO-4464) and the receipt once more until the SNAP track removes it; evaluated without the receipt, CCCAP's household income is $600 (checked).

## 4. SUN Bucks

SUN Bucks reads no earnings. sebt_household_child_receives_snap_or_tanf (CO-2708) read a child's Colorado Works assistance receipts, and each other child's, as 0 when not stated (kept by receipts phase 2). 7 CFR 292.2 and 292.12(d) give no reading for assistance not reported; the default is removed as b49a7f2 removed the receipts readers' (decision 4). A SNAP or TANF flag, or a receipt, that shows assistance still decides the test.

## 5. Answer changes, by class (harness classes; each cited)

| Class | Households | Old | New | Rule |
|---|---|---|---|---|
| R-30 the thirty-day households restated | CO-125, CO-133, CO-134, CO-135, CO-454, CO-455, CO-456 (earner p1) | the baseline reads the scalar wages they no longer state: cannot determine | each household's expectation, unchanged (CO-125: CCCAP 2,800, fee 101; LEAP 5,167; CO-135: LEAP 8,967) | 3.111.H.4-5; 3.751.1, 3.752.22.B-C |
| E1-L2 boarders in LEAP (fixed) | CO-171 ($300), CO-320, CO-354 ($1,500), CO-425 (see 3); generated (room and board 900: 1,600 to 2,500) | room and board not counted | counted | 3.752.21 (S4100): "payments from any other source, which is considered to be a gain or benefit" |
| E1-L3 an odd job beside a pay schedule (LEAP) | CO-194 | 1,000 (one schedule converted) | 1,020 | 3.752.22.B; OQ-1160 |
| E1-C3 J.28 earnings (fixed) | CO-194 (1,020 to 1,000), CO-483 (4,900 to 4,870) | irregular pay counted whole | left out when the quarter's irregular income is under $90 | 3.111.J.28 (S2858) |
| D4-C1, D4-E, D4-S decision 4 | persons whose earnings (CCCAP other income, LEAP boarders) or a child's receipts (SUN Bucks) are not stated | 0 | cannot determine | decision 4 of 2026-11-23; no rule gives a reading for income not reported |
| CO-322 launch-period hours | CO-322 (restated: its business's 120 hours stated on the record) | 870 | 870 (a generated or new household that states no business hours now cannot determine) | 3.111.G.2.e "declared hours worked"; decision 4 |
| Figures only | CO-3912 (now 0 for ongoing pay), CO-210 (PASS in the pay: wages 3,500, household 3,500 unchanged), CO-206 and CO-362 (a room-only payment moves to other income, the household unchanged) | | | |

No eligibility or benefit outcome changes on a stored household except where cannot determine became determined by the restatement (R-30) or the reverse by decision 4; the restated households' expectations, hand-computed, all pass.

**Other programs on the restated households.** The seven households state their earner in earnings alone, so the programs still reading the scalar wages read hers as unknown until their tracks move. Measured with the current ledger, the household text before and after: nine outcome values change, all from a value to cannot determine for programs other than CCCAP and LEAP (CO-134, CO-454, CO-455: Adult Financial and Colorado Works earned-income verification pending; CO-454, CO-455: Medicaid buy-in category) and two from cannot determine to false (CO-211's child, SNAP and Colorado Works unearned verification, from its empty receipts). None is an expectation. Request R-1 would let them state both.

## 6. Harness results (gate)

| Harness | Result |
|---|---|
| `npm run records:harness -- --list earnings --track leap` | OK: stored 327 households, 20,738 values, 390 differ, all allowed; generated 28, 1,064 values, 19 differ, all allowed; translation 0 stale; boundary lint 0 findings; ME-2 and ME-4 0 violations (ME-1, ME-3 not invariant for LEAP) |
| `npm run records:harness -- --list earnings --track cccap` | OK: stored 327, 24,887 values, 139 differ, all allowed; generated 28, 1,344 values, 0 differ; ME-2, ME-4 0 violations (ME-1 not run: R-3; ME-3 not invariant) |
| `npm run receipts:harness -- --all-programs` | see section 9 |

## 7. T-9 boundary rows and contradictory givens (docs/reviews/t9-threshold-handcheck.md)

The CCCAP, LEAP and SUN Bucks rows. The "Ambiguous: not recorded" table has three CCCAP rows and none for LEAP or SUN Bucks (A-5 CO-1394 is SNAP's, A-9 CO-549 and A-10 CO-2419 Medicaid's; A-10 asks to be settled with A-8, see below).

| Row | Done |
|---|---|
| A-8 CO-4056-T7 (age 13) | Settled for the CCDF-funded programs by 45 CFR 98.20(a)(1)(i) (S4420, D-442): "Be under 13 years of age", (ii) "under age 19" with additional needs: false stays, now cited. Child Welfare Child Care is not CCDF-funded (3.120.F); its reading of the same state words is OQ-1163. The federal text is CCDF's; it does not settle Medicaid's A-10 ("to age 22"), which stays with the Medicaid track. |
| A-11 CO-986-T7, A-12 CO-995-T4 (income equal to the entry level) | Settled by 3.103.YY (S4421): the entry income eligibility level is the level "above which" a caretaker is not eligible at original application: equal is eligible; true stays, now cited in both items. |
| CO-4056-T7, T8 (age stated against the date of birth) | Rebuilt with dates of birth that give 13 and 19 on the determination date, the age override dropped; T9 and T10 test 12 and 18 the day before the birthday. |
| CO-1289-T9 (household size 4 against three members) | Rebuilt with four members (the size derived), the 100% FPG for 4 from 2026-10-01 ($2,750.00, S781): 1% = $27.50. |

## 8. Duplicate paths (docs/reviews/duplicate-paths-audit.md)

| Row | Disposition |
|---|---|
| D-L2 (CO-1455 / CO-1002, 3.752.23.Q) | Done: leap_earnings_are_excluded_as_child (CO-5123). |
| D-K2 (CO-1447 / CO-1448, activity schedule) | Done: CO-5154 with its pending flag CO-5155. |
| D-K1 (eligible child written three times) | Done: cccap_household_has_eligible_child (CO-6152). |
| D-L1 (CO-1000 / CO-1009) | Left listed: CO-1000 filtering CO-1009 is not a pure refactor. `filter` is unknown when any member's condition is unknown, so a member whose other-household status is unknown and who fails the citizenship test, excluded today, would make the whole list unknown. The owner should decide the reading first. |
| D-K3 (verification exemptions) | Left listed: several items, each with a rule paragraph to check; outside this round. |
| D-K4 (CO-5721 to CO-5723), D-K5 (CO-4463 / CO-5725) | Left listed: the shared part is a test or value of one receipt, and a derived item cannot read "that receipt" (P55, docs/operators.md); it can only be written in each sum. |

## 9. Gates

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written |
| `npm run typecheck` | passes |
| `npx vitest run` | passes after the UI pins moved by CO-5125, CO-5151 (figures 462 to 464) and OQ-1160, OQ-1162, OQ-1163 (questions 159 to 162) were re-pinned with their reasons |
| `npm run receipts:harness -- --all-programs` | (filled at the gate) |
| `npm run records:harness -- --list earnings --track leap` / `--track cccap` | OK (section 6) |
| `CHECK_BASE=origin/main npm run check` | (filled at the gate) |

## 10. Requests to the integration owner (design 4.3, rule 1)

- **R-1 (translator).** A person whose pays are stated with dates (the seven households) cannot also state the scalar wages the programs not yet moved read: the translator rewrites her earnings from the scalar facts. Either keep a person's dated wages records when she states the thirty-day figure, or accept the restatement in earnings alone until E2 (section 5 lists what it costs the other programs: nine values).
- **R-2 (a job on each pay).** Two jobs on one pay schedule stated as dated pays are averaged together by LEAP (CO-5121): a field naming the job would let each be averaged apart.
- **R-3 (ME-1).** ME-1 halves amounts but not `hours`, so a business split in two states twice its hours, and CCCAP's launch-period income is not invariant; CCCAP lists ME-1 as not invariant until hours are halved.
- **R-4 (receipts harness).** Its generated households state no earnings records, so from E1 every generated household's CCCAP and LEAP income is cannot determine there (class E1-G); translating them with translate-earnings.ts would restore the comparison. The records harness compares the earned readings meanwhile.
- **R-5 (baseline).** EARNINGS_BASELINE (20004af) predates the receipts readers' decision-4 round (b49a7f2, merged as bb4b8ee); CO-141's sponsor deemed income differs for that reason in every track's harness. Listed in allowed/e1-leap.yaml as not this track's.
- **R-6 (frequency default).** A dated pay that states no frequency is read as monthly (the schema's default); LEAP averages per schedule, so a weekly pay stated without its frequency is converted as monthly. Requiring `frequency` where a dated pay is read would make it cannot determine instead.
- has_earned_income (CO-1356): no CCCAP or LEAP item reads it now (E2).

## 11. Outside these programs (not edited)

- CO-4151 snap_has_substantial_lottery_winnings (SNAP) reads unstated receipts as no winnings (`[case, [[unknown, receipts], false], ...]`): the same decision-4 question, for the SNAP track.
- CO-425 (SNAP's): the other_taxable receipt to remove (E0-F1).
- CO-94 (SNAP's sponsor household): its sponsored children state no earnings; an empty earnings list, as D4-2 stated their receipts, would settle their CCCAP and LEAP figures.
- CO-387 chp_copayment_income_band: a known conformance failure (conformance/known-failures.json), seen on the way.

## 12. Open questions

Added: OQ-1160 (LEAP: pay of a frequency 3.752.22.C does not convert, pay received once, an odd job beside regular pay), OQ-1162 (LEAP: boarders at gross or net of the room and meals), OQ-1163 (Child Welfare Child Care: a child of thirteen). Rows for the owners' signature that this round changed: CO-5105 wioa_on_the_job_training (now cited, I.31); CO-5102 boarder_payments (now cited, 3.752.21); the rest of section 7 of docs/reviews/earnings-e0.md stands.
