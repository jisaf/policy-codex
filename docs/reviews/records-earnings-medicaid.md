# Earned-income records, step E1: Health First Colorado (Medicaid) and CHP+

Track E1 Medicaid and CHP+ of docs/design-earned-and-resource-records.md (4.2, 4.3), started from the end of step E0 (docs/reviews/earnings-e0.md, section 10) on ccr-9d19bf4c-wmnwcl at 9650b0c. Medicaid MAGI and the SSI method (the SSI-related groups, deeming, the spousal allowances, long-term care, the buy-ins) read earned income from the `earnings` list (CO-5100) through Medicaid's two earnings counting tables, CO-5106 (MAGI) and CO-5107 (SSI method); CHP+ reads it through Medicaid's MAGI income by its adopted-method link (10 CCR 2505-3 150.1, S245) and Medicaid's verification figures (130.1, S869), as in receipts phase 2. The same round fixes Medicaid's known wrong answers: OQ-1023, OQ-1024 (MAGI), the duplicate-path P1s D-M1 to D-M4 (docs/reviews/duplicate-paths-audit.md), coverage pass 3 C3-11, and the Medicaid and CHP+ rows of the T-9 hand check (docs/reviews/t9-threshold-handcheck.md).

## 1. Commits

| Commit | Step | What |
|---|---|---|
| 96a1bdd | 1 | Earned income from the records: MAGI CO-5160 to CO-5162, SSI method CO-5170 to CO-5176, verification CO-5163, CO-5164; CO-502, CO-5214, CO-1703, CO-1704, CO-2471, CO-4883, CO-4629 and the fifteen readers of wages_gross plus net self-employment rewritten; OQ-1024 settled for MAGI (26 U.S.C. 112, S4340, D-4340); CO-3615 and the shared CO-3387 removed |
| 2eee16c | 2 | OQ-1023 settled (in-kind pay, boarders, a dependent child's WIOA wages: CO-5177 to CO-5180); MAGI boarder payments; C3-11 fixed (CO-5174); OQ-1120 to OQ-1124 |
| 2668ea0 | 3 | Duplicate-path P1s D-M1 to D-M4 (CO-6050 to CO-6061; CO-1158, CO-1160, CO-5222, CO-2277, CO-4633 rewritten) |
| 5858661 | 4 | T-9 rows: Express Lane 90 days fixed (CO-2445), A-10 settled, A-9 recorded (OQ-1124), 27 contradictory-given tests rebuilt |
| (last) | 5 | this review, the change record, docs, gate |

## 2. What reads the records

| Area | New | Rewritten | Removed |
|---|---|---|---|
| MAGI | CO-5160 ma_magi_wage_earnings (rows counted, counted_no_rule_excludes, excluded_live_in_provider; special pay unless combat_zone), CO-5161 ma_magi_self_employment_earnings (net_for_tax), CO-5162 ma_magi_difficulty_of_care_earnings | CO-502 person's MAGI income, CO-5214 Difficulty of Care exclusion | |
| SSI method | CO-5170 ma_ssi_wage_earnings, CO-5171 ma_ssi_gross_earned_income (the one statement of a person's earned income), CO-5172 exempt pay, CO-5173 irregular pay, CO-5174 Medicaid's own student basis, CO-5175 business receipts, CO-5176 PASS set-aside, CO-5177 boarder earned income, CO-5178/CO-5179 WIOA wages and their exemption, CO-5180 the six months | CO-1703 costs, CO-1704 net profit, CO-2471, CO-4883, CO-4629, CO-605, CO-5901, CO-1715, CO-4200, CO-2277, CO-2279, CO-4633, CO-4634, CO-5221, CO-641, CO-657, CO-2467, CO-1640, CO-3616 | CO-3615 ma_ltc_earned_income (an alias of CO-5171 once rewritten; CO-3616 reads CO-5171; CO-113's expectation renamed); CO-3387 ssi_student_earned_income_exclusion_basis (shared, program All; its only reader moved to CO-5174, so the check required it gone with its allowlist entry) |
| Verification | CO-5163 ma_employer_pay_for_verification, CO-5164 ma_self_employment_receipts_for_verification (boarder payments included, K.10) | CO-1403; CHP+ CO-1642 by its S869 link | |
| Receipt tables | | CO-5500, CO-5510: uniformed_services_special_pay, board_only_payment, room_only_payment are `in_earnings` (read from the earnings records; never counted twice with the translator's transition copy) | |

No Medicaid or CHP+ item reads wages_gross, self_employment_gross_receipts, self_employment_net_earnings_for_tax or a part of wages_gross. Still read, for the earned-income cleanup E2: has_earned_income (CO-1356, shared) by CO-2425, CO-618, CO-620.

## 3. The two tables after E1

**CO-5107 (SSI method).** counted: wages, in_kind_pay (OQ-1023: K.3-4, S4107; 416.1110(a)(3), S4342). counted_net_of_costs: self_employment_receipts, farm_self_employment_receipts. counted_above_boarder_allowance: boarder_payments (K.10.c-e). exempt (in gross income, not counted): decennial_census_employment (F.6.z). exempt_dependent_child_six_months: wioa_on_the_job_training (K.8.a, c). counted_no_rule_excludes (owner signs, as in E0): uniformed_services_special_pay, work_study, summer_youth_employment, scsep_employment, subsidized_employment, difficulty_of_care_payment, employer_health_insurance_subsidy. not_counted_no_rule_found: employer_vendor_payment. Costs: business_cost_operating deducted; business_cost_boarder_provision deducted_from_boarder_payments (K.10.c-e); capital principal and depreciation not_deducted (K.9.b); interest, home space, vehicle not_deducted_no_rule_found (K.9.a's list is "not limited to": the owner signs). The E0 finding rows (not_counted_text_counts, counted_text_excludes) are gone.

**CO-5106 (MAGI).** counted: wages, boarder_payments (8.100.4.C.1.b.ii rents, a.v compensation; gross: OQ-1121). excluded_in_combat_zone: uniformed_services_special_pay (26 U.S.C. 112, S4340; OQ-1024 settled; basic pay for a combat-zone month is OQ-1123). counted_net_for_tax: the two business kinds. excluded_live_in_provider: difficulty_of_care_payment. counted_no_rule_excludes and not_counted_no_rule_found rows unchanged from E0 (owner signs). Costs not read (net for tax), and business_cost_boarder_provision not_deducted_open_question (OQ-1121).

## 4. Answers that change, and why

| Class | Rule text | Old | New |
|---|---|---|---|
| E1-M1 (decision 4) | an unstated list is unknown | the Difficulty of Care and SSI exclusions of a person whose earnings are not stated read as 0 (each part `otherwise 0`) | cannot determine; the person's earned income was and is unknown, so no outcome moves |
| E1-M2 (design 2.2, decision 4) | a stated list is the whole statement | generated bases: net-for-tax unstated, MAGI income unknown | earnings with no business: no self-employment income; MAGI figures and outcomes determined |
| E1-M3 (OQ-1023) | 8.100.3.K.3-4; 416.1110(a)(3) | the SSI method read no pay in kind | counted as earned income (CO-341: community spouse income 2,000 to 3,500) |
| E1-M4 (OQ-1023) | 8.100.3.K.10.c-e | room and board not read; room-only and meals-only counted in full as unearned | earned income above the allotment per boarder and the costs (CO-354: 1,500 from two boarders, 1,500 - 2 x 306 = 888); a record without a boarder count cannot be counted (CO-171, CO-320) |
| E1-M5 (OQ-1023) | 8.100.3.K.8.c | a dependent child's WIOA wages counted | exempt six months a calendar year; unknown where the child's home is not stated |
| E1-M6 (D-M2) | 8.100.6.J.1.c with 8.100.5.H.3-4 | DAC income copied the SSI formula without the allocation, child support reduction or deemed income | the SSI-related income with the OASDI taken out (CO-74: 857.50 to 609, the 497 allocation from the spouse's earnings) |
| E1-M7 (D-M4) | 8.100.5.H.3.a.i "in the home"; 416.1167(a) | an allocation for a child living in another home (CO-04 p5, CO-191 p4, CO-352 p3: 497) | none (0) |
| E1-M8 (K.10) | board, room and room and board are self-employment income | verified as unearned receipts | verified as self-employment income when the earned attestation is questionable; unknown where that flag is not stated |
| (rule tests) D-M1 | 8.100.6.E.1.e, E.2-3 | Pickle income 1,607.50 (audit household) | 1,359, the SSI method's figure; ma_pickle_eligible true against the couple FBR 1,491 |
| (rule tests) D-M3 | 416.1165(e)(3) | Pickle deeming 1,000 to each of two children | 300 and 1,014 (each its limit) |
| (rule tests) C3-11 | 416.1112(a) | a student's Census wages used up the student exclusion's yearly maximum (May: 2,090 excluded) | 2,500 (CO-2471-T6) |
| (rule tests) A-6, A-7 | 8.100.4.J.1.a.iii "90 days of eligibility"; 2505-3 180 | the period ended on the 91st day | the 90th (enrollment + 89) |
| (rule tests) OQ-1024 MAGI | 26 U.S.C. 112 | combat-zone pay in wages counted; special pay receipts never counted | combat-zone special pay not counted; other special pay counted |

No stored household's expected outcome changes (npm run check: every household expectation passes except CO-387's CHP+ copayment band, blocked on OQ-810 as before).

## 5. Harness results

`npm run records:harness -- --list earnings --track medicaid` against EARNINGS_BASELINE (20004af): stored households 327 (49,393 values, 230 differ, 230 allowed), generated 252 (24,192 values, 989 differ, 989 allowed), 0 unexplained; translation 0 stale; boundary lint 0 findings. Classes in scripts/records/allowed/e1-medicaid.yaml, E1-M0 to E1-M8. E1-M0 is not this track: CO-141 p3's SNAP sponsor deemed income moved with the receipts-readers merge (bb4b8ee) after the baseline. Metamorphic: ME-2 order 0 violations; ME-3 not run (quarter and year tests); ME-1 not run (request R-2); ME-4 has no pair of cost kinds both tables deduct.

`npm run receipts:harness -- --all-programs`: see section 9; the entries the track appended to scripts/receipts/allowed-differences.yaml are EM-R1 (transition, request R-1), EM-R2 (the moved receipt kinds) and EM-R3 (OQ-1023 on stored households).

## 6. Open questions

Settled: OQ-1023 (all three parts); OQ-1024 for MAGI (the Adult Financial half stays with its owner). Added: OQ-1120 (a domestic or agricultural worker's in-kind pay, 416.1110(a)(3) against K.3-4), OQ-1121 (MAGI boarder payments gross or net), OQ-1122 (an ineligible child's own income for the allocation, 416.1161(c) against H.3.a.i), OQ-1123 (MAGI: basic pay for a combat-zone month), OQ-1124 (T-9 A-9: foster care on the 21st birthday). T-9 A-10 settled by 42 CFR 441.151(a)(3)(ii).

## 7. Requests to the integration owner (not edited by this track)

- **R-1** scripts/receipts/harness.ts builds its generated households from the stored households of its baseline (c29d326), before the earnings list existed, and translates only receipts: every program that reads earnings from E1 gets "cannot determine" there. Translate earnings (translate-earnings.ts) on the new side, as the records harness does; then remove EM-R1.
- **R-2** scripts/records/metamorphic-earnings.ts ME-1 halves amounts but keeps a boarder record's `boarders` on both halves, which the per-boarder allowance (K.10.c, e) reads; halve the count or leave boarder records whole, then drop the track's ME-1 exemption.
- **R-3** a field on the wages record for pay for a month served in a combat zone (26 U.S.C. 112; OQ-1123).
- **R-4** scripts/records/translate-earnings.ts drops a stated self_employment_net_earnings_for_tax of 0 (`net !== 0`), so a business record whose receipts are not stated, or are positive, with a stated net of 0 reads as "cannot determine" for MAGI. No stored household is affected (the harness shows none); rule tests the track owns were restated in earnings.
- **R-5** EARNINGS_BASELINE re-pointed after bb4b8ee (E1-M0).

## 8. Seen elsewhere (not this track's to change)

- CO-3386 (shared ssi_is_student_regularly_attending_school) names only Adult Financial in adopted_by; Medicaid's CO-5174 declares the link in accepts_from (S3412) instead. The adopted_by list could name Medicaid.
- CO-1704 floors the net profit at zero and works month by month; 20 CFR 416.1111(b) counts net earnings from self-employment on a taxable-year basis and deducts a net loss from other earned income. Colorado's 8.100.5.F.4 counts earned income in the month received and H.4.e incorporates only 416.1112, so it is not settled that the federal rule applies; recorded in CO-1704's precision before this track, not an open question.
- 20 CFR 416.1163(b) (and 416.1142(a)) allow no allocation for an ineligible child receiving public income-maintenance payments; neither allocation item tests it.
- The receipts harness and the records harness both write a results file tracks share (scripts/receipts/results/harness.txt, scripts/records/results/earnings.txt); the track did not commit them.

## 9. Gate

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written |
| `npm run typecheck` | see the final commit |
| `npx vitest run` | see the final commit |
| `npm run receipts:harness -- --all-programs` | see the final commit |
| `npm run records:harness -- --list earnings --track medicaid` | OK, 0 unexplained |
| `CHECK_BASE=origin/main npm run check` | see the final commit; flags dispositioned in volumes/co/changes/2026-11-23-records-medicaid.yaml |
