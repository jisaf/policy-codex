# Independent hand check of the promoted probe households: Health First Colorado and CHP+

Reviewer: independent second hand computation (product-owner requirement before the probe expectations are relied on).
Repository: branch ccr-9d19bf4c-wmnwcl at b3bb737, evaluated in a scratch copy (`git archive HEAD`), engine output from
`npx vite-node scripts/eval-case.ts co <case> <identifiers> <month>`. Date of review: 2026-11-23.

Scope: every case among CO-300 .. CO-457 in `volumes/co/tests/cases.yaml` whose expectations concern Health First Colorado
(MAGI and non-MAGI) or CHP+: CO-375 .. CO-404, CO-452, CO-453 (32 cases). The other 126 cases in the range expect only
cash, SNAP, CCCAP, LEAP or SUN Bucks identifiers and belong to the other reviewer. No case in scope was sampled out.

## Method

1. Blind extraction. A script read each case with a YAML parser (which drops comments), removed `title` and replaced every
   expected value with a placeholder, keeping only the facts, dates, relationships and the list of expected identifiers and
   months. Values were computed from that extract only.
2. Hand computation from the rule text in `volumes/co/documents/` (D-65 10 CCR 2505-10 § 8.100 current text; D-66 10 CCR
   2505-3 CHP+; D-68 § 8.940; D-31, D-34, D-121 42 CFR 435; D-47 and D-46 42 U.S.C. 1396r-5 and 1396p; D-53 20 CFR 416
   subpart K; D-166 and D-206 SSA COLA notices). Figures were taken from the dated parameters only: 2026 FPL 15,960 / 21,640
   (monthly 1,330.00 / 1,803.33), SSI FBR 994 individual and 1,491 couple (2026), resource limits 2,000 / 3,000, MSP 9,950,
   CSRA maximum 162,660, personal needs allowance 110.36 (2026), WAWD and CBWD premium tables from 2026-07-01. The item
   files were read only for the option list and `meaning` of the output identifiers, never their `derived` expressions.
   The blind values were recorded in a file before anything else was looked at.
3. Comparison with the stored expectation and the engine output, then each difference was re-read against the text and the
   case comment, and against `conformance/known-failures.json` (17 entries fall in this scope).

## Summary counts

| Measure | Count |
|---|---|
| Cases checked | 32 |
| Identifier checks (person × identifier × month) | 61 |
| Blind hand value = stored expectation | 54 of 61 |
| Blind hand value = stored = engine | 40 of 61 |
| Final hand value (after re-reading) = stored expectation | 58 of 61 |
| Final hand value = engine output | 45 of 61 |
| Engine ≠ final hand value, all listed in known-failures.json | 16 (known failures confirmed) |
| Known-failure entries in scope where the engine is right and the stored value wrong | 1 (CO-395 p1) |

Disagreements by class (a row can be both a difference with the stored value and with the engine; each is counted once,
under its verdict):

| Class | Rows | Where |
|---|---|---|
| Stored expectation wrong | 3 | CO-395 p1 `ma_ssi_related_category`; CO-404 `ma_wawd_countable_income`; CO-397 `ma_has_full_coverage_category` (not determined by the stated facts; true on the case's own retroactive premise) |
| Codex wrong, not a known failure (new P1) | 1 finding | `ssi_student_earned_income_exclusion_monthly` / `_annual` have no 2027 version: the engine applies 2,410 in 2027 where D-166 sets 2,500 (no stored row in scope asserts it; shown on CO-404's facts) |
| Genuinely ambiguous text | 1 row (+1 note) | CO-387 `chp_copayment_income_band` (OQ-810, open; stored and I read band_d, the engine follows the volume's recorded assumption, band_c). Note: CO-402 rests on a reading of § 8.100.5.M.2.a.xiv that has no open question recorded and needs one |
| My own error after re-reading | 5 | CO-379 category; CO-392; CO-400 (two rows); CO-401 premium |

## Disagreement table

"Hand" is my final value after re-reading; the blind value is given where it differed. Months are benefit months.

| Case | Person / identifier | Month | Hand | Stored | Codex | Rule text | Verdict |
|---|---|---|---|---|---|---|---|
| CO-395 | p1 `ma_ssi_related_category` | 2026-11 | aged | none | aged | 42 U.S.C. 1396r-5(b)(1) (D-47): "During any month in which an institutionalized spouse is in the institution ... no income of the community spouse shall be deemed available to the institutionalized spouse"; (a)(1): these provisions "supersede any other provision of this subchapter ... which is inconsistent with them". 10 CCR 2505-10 § 8.100.7.C.1: "The income of a community spouse is not deemed to the institutionalized spouse in determining eligibility"; C.2.c sends a spouse applying for institutional care to those rules. p1 entered the nursing facility 2026-11-03, expects a 30-day stay and requests institutional care, so he is an institutionalized spouse (§ 8.100.7.K.2) in November. His own income 1,000 - 20 = 980 ≤ 994 individual FBR; resources 1,000 within CSRA + 2,000. | **Stored expectation wrong.** The comment applies C.2.b (mutual availability through the admission month) to p1, which C.2.c and 1396r-5(b)(1) displace for the institutionalized spouse. The known-failure entry `CO-395:p1:ma_ssi_related_category@2026-11` hides a correct engine answer and would force a wrong fix. Note the engine reaches "aged" by comparing p1's 980 against the couple standard 1,491 (`ma_ssi_income_standard` = 1491, household size 2): right answer, wrong standard (an institutionalized spouse at, say, 1,200 would wrongly pass). |
| CO-395 | p2 `ma_ssi_related_category` | 2026-11 | none | none | aged | § 8.100.7.C.2.b: "Beginning the first month following the month the couple ceases to live together, only the income of the individual spouse is counted"; § 8.100.5.H.1.a mutual availability. p2 is the community spouse, to whom 1396r-5(b)(1) does not apply: 1,000 + 700 - 20 = 1,680 > 1,491. | Agree with stored; engine wrong, known failure C3-1 confirmed. |
| CO-404 | p1 `ma_wawd_countable_income` | 2027-01 | 207.50 (blind and final) | 252.50 | 1,457.50 | § 8.100.6.P.1.b (income "after income allocations and disregards ... 8.100.5.H"); § 8.100.5.H.4.e incorporates 20 CFR 416.1112, whose (c)(3) student exclusion is indexed yearly (the volume's own precision on `ma_ssi_excluded_earned_income`: "SSA's figures for the year govern"). D-166 (SSA, 2027 COLA notice): "the maximum amount of the income exclusion applicable to a student in 2027 is $2,500 per month, but not more than $10,080 in all of 2027." (3,000 - 2,500 - 20 - 65) / 2 = 207.50. | **Stored expectation wrong**: the comment uses the 2026 figure 2,410 for January 2027. The premium is 0 either way (15.6% or 19.0% FPL, at or below 40%), so the premium row agrees. The engine's 1,457.5 (no student exclusion at all) is known failure C3-6. |
| CO-397 | p1 `ma_has_full_coverage_category` | 2026-08 | unknown on the stated facts; true if August is a retroactive month as the comment says (blind: false, with the MAGI branch flagged as undetermined) | false | true | § 8.100.4.G.4 (Adults to 133%, with the D.1 disregard 138%); D-65 l.33: adults "from the age of 19 through the end of the month that the individual turns 65, who do not receive or who are ineligible for Medicare". p1 is 46, Social Security 400 (30% FPL), no Medicare. The SSI-related branch is false in August (onset 2026-09-15; § 8.100.5.C.4.b). But the case states no MAGI household facts and no `ma_retroactive_coverage_requested`, and the engine's `ma_magi_is_fully_eligible` is null. | **Stored expectation wrong as stated.** The comment calls August "the retroactive month"; on that premise the person meets the Adults group and has full coverage (true). Without the facts, a correct engine returns null (the `any` in CO-1176 is three-valued), so fixing C3-2 alone cannot reach the stored false. The case needs `ma_retroactive_coverage_requested` and the MAGI household facts stated, and then the expectation recomputed. The engine's true comes from `ma_is_ssi_related_eligible` being true in August (C3-2), the wrong route. |
| CO-387 | p2 `chp_copayment_income_band` | (person) | band_d | band_d | band_c | 10 CCR 2505-3 § 320.1: bands by "family income, at the time of eligibility determination"; § 150.1 → § 8.100.4.C.4.a annualizes only for "Applicants who are found financially ineligible based on current ... monthly household income". Monthly 4,328 / 1,803.33 = 240.0% (CHP+-eligible on the monthly figure), annual 34,624 / 21,640 = 160.0%. | **Genuinely ambiguous**, already OQ-810 (open, state policy choice). My reading matches the stored one (band_d); the engine follows the volume's recorded assumption ("each income test (the CHP+ copayment band included) takes the lower"). The known failure should stay until the owner decides. |
| CO-379 | p1 `ma_magi_category` | 2026-11 | adult (blind: parent_caretaker) | adult | adult | § 8.100.4.D.1.a applies the 5% disregard "for each qualifying MAGI program"; 42 CFR 435.603(d)(4) (D-34) applies it "only ... under the eligibility group with the highest income standard ... but not to determine eligibility for a particular eligibility group". 1,262 / 1,803.33 = 69.98%: over 68% without the disregard. | **My own error.** I noted the federal text blind but followed the state text; the federal regulation governs, and the volume records it as a `statute_override` on CO-547. |
| CO-392 | p1 `ma_ssi_countable_income` | 2026-10 | 5,780 (blind: 10,780) | 5,780 | 5,780 | § 8.100.5.F.5.f lump sums are unearned income in the month received. `lump_sum_received` precision: "Part of the person's gross unearned income ... not added to it". 800 + 5,000 - 20 = 5,780. | **My own error**: I read the fact's `meaning` only and added the lump sum to the other unearned income it is part of. |
| CO-400 | p3 `ma_cbwd_countable_household_income` | 2026-10 | 4,707.50 (blind: 6,497.50) | 4,707.50 | 5,597.50 | § 8.100.6.Q.1.b.iii applies § 8.100.5.F.6; F.6.t: "A child receiving subsidized adoption funds shall be excluded from the Medical Assistance budget unit and his income shall be exempt from consideration in determining eligibility". `adoption_subsidy_received` is part of `other_unearned_income_nontaxable` (its precision). (9,500 - 20 - 65) / 2 = 4,707.50. | **My own error** (counted the subsidy twice and missed F.6.t). Agree with stored; engine known failure C3-4 confirmed. |
| CO-400 | p3 `ma_buy_in_category` | 2026-10 | children_with_disabilities (blind: none) | children_with_disabilities | none | 4,707.50 / 1,803.33 = 261.0% ≤ 300% (Q.1.b); employer coverage enrolled, employer share 60% (Q.1.f). | **My own error** (follows from the row above). Engine known failure C3-4 confirmed. |
| CO-401 | p3 `ma_cbwd_premium` | 2026-11 | 70 (blind: 120) | 70 | 90 | F.6.t as above; (5,600 - 85) / 2 = 2,757.50 = 152.9% FPL; Q.1.g.iv.2: "$70 ... above 133% of FPL but at or below 185%"; cap 5% of income at or under 200% not reached; determined 2026-10, so November is charged (Q.1.g.ii). | **My own error** (same double count). Engine known failure C3-4 confirmed. |

### New P1 (codex wrong, not a known failure)

`ssi_student_earned_income_exclusion_monthly` (CO-3379) and `ssi_student_earned_income_exclusion_annual` (CO-3380) stop
at the 2026 version (2,410 and 9,730, open-ended). D-166, already in the volume, gives 2027: "the maximum amount of the
income exclusion applicable to a student in 2027 is $2,500 per month, but not more than $10,080 in all of 2027." The FBR
and SGA parameters were carried to 2027 from the same notice; these two were not. The defect is live today: on CO-404's
facts the engine gives `ma_ssi_countable_income` 2027-01 = 252.5 (and `ma_ssi_countable_earned_income` 252.5), where the
text gives (3,000 - 2,500 - 20 - 65) / 2 = 207.5. It reaches every SSI-method test in 2027 for a student under 22 with
earnings over 2,410 (SSI-related categories, MSP, and, once C3-3 and C3-6 are fixed, the DAC and WAWD figures). No stored
expectation in scope asserts it, and CO-404's stored 252.5 would have locked it in once C3-6 is fixed. Fix: add the 2027
versions (source D-166) and correct CO-404's expectation to 207.5.

### Expectations that a correct engine cannot reach on the stated facts

- CO-396 `ma_has_full_coverage_category` 2026-10, stored false. I agree that the person has no full-coverage category: the
  § 8.100.5.E.6 non-cooperation finding denies the SSI-related and SISC B routes, and he is 76 and on Medicare. But the case
  does not state `is_pregnant`, `sex`, the MAGI tax facts or `ma_ltc_setting_requested`, and the engine returns null for
  `ma_magi_is_fully_eligible` and `ma_ltc_eligibility_status`. Once C3-2 makes the SSI and SISC B branches false, the
  three-valued `any` gives null, not false. State those facts, or the known failure will never clear.
- CO-397, see the table: the same mechanism, but there the missing facts can make the answer true.

## Per-case results

Agreement means my final hand value equals the stored expectation. "Engine" notes where the engine differs (KF = listed
in known-failures.json). All percentages are of the FPL for the household size shown.

| Case | Identifiers (month) | Hand computation | Hand = stored | Engine |
|---|---|---|---|---|
| CO-375 | `ma_magi_category`, `ma_magi_eligibility_status` (2026-11) | Born 1961-11-05, 65 in November; Adults run "through the end of the month that the individual turns 65"; no Part A (0 quarters). 900 / 1,330 = 67.7% ≤ 133%. adult, eligible. | yes (2/2) | agrees |
| CO-376 | same (2026-11) | 36, government jail, not temporary; income 0; § 8.100.3.G.1.b.ii inmates enrolled "with benefits limited to" inpatient stays. adult, incarceration_limited. | yes (2/2) | agrees |
| CO-377 | `chp_eligibility_status` (2026-08, 2026-11) | Household 2, 3,700 / 1,803.33 = 205.2%: over the child 142% (147% with disregard), within CHP+ 260%. August precedes the month of application (CHP+ § 430.1). ineligible_before_coverage_period; eligible_child. | yes (2/2) | agrees |
| CO-378 | `ma_magi_category`, `ma_magi_eligibility_status` (2026-11) | Monthly 2,400 / 1,330 = 180.5% > 138%, wages (no annualizing); § 8.100.4.C.5: eligible if the premium tax credit income is below 100%: 14,000 / 15,960 = 87.7%. adult, eligible. | yes (2/2) | agrees |
| CO-379 | same (2026-11) | Non-filer parent, household 2 with her child; 1,262 = 69.98% > 68%; the disregard is for the highest standard only (435.603(d)(4)); Adults 133%. adult, eligible. | yes (2/2) after re-reading (blind category parent_caretaker, see table) | agrees |
| CO-380 | `ma_income_is_reasonably_compatible` p1, p2; p2 category and status (2026-11) | 2,615 = 145.0% for 2. p1: both figures over 138% → compatible (C.2.a.iii). p2: 145.0% ≤ 147% (child 142% + 5) → child, eligible; attested = data → compatible. | yes (4/4) | agrees |
| CO-381 | `chp_express_lane_child_meets_requirements`, `chp_eligibility_status` (2026-11) | Free/reduced lunch application, opted in, declared 3,607 for 2 = 200.0%: over 147%, within 260%; no other coverage. true; eligible_child. | yes (2/2) | agrees |
| CO-382 | `ma_family_planning_status` (2026-11) | Self-employed, 6,000 this month (Adults 451%; FP on household 2: 332.7% > 265%), so C.4.a annualizes: 36,000 / 15,960 = 225.6% (not Adults); FP 36,000 / 21,640 = 166.4% ≤ 260%. limited_family_planning. | yes | agrees |
| CO-383 | same (2026-11) | 3,000 monthly: Adults 225.6% no; FP 3,000 / 1,803.33 = 166.4%. limited_family_planning. | yes | agrees |
| CO-384 | `ma_income_is_reasonably_compatible`, `ma_family_planning_status` (2026-11) | Wages 3,000 = data 3,000: over the Adults standard both ways, under the FP standard both ways → compatible; FP 166.4%. true; limited_family_planning. | yes (2/2) | agrees |
| CO-385 | p1 category; p2 category and status (2026-11) | Filer father claims daughter (16, wages 600, not required to file, so her income is not counted, § 8.100.4.C / 435.603(d)(2)). 2,300 / 1,803.33 = 127.5%: p1 over 68%, under 133% → adult; p2 ≤ 142% → child, eligible. | yes (3/3) | agrees |
| CO-386 | p2 `ma_magi_category`, `chp_eligibility_status` (2026-11) | Born 2025-11-01 to a Medical Assistance mother: Needy Newborn "continuously eligible for one year" (§ 8.100.4.G.7; 435.117 "until the child's first birthday"), ended 2026-10-31. Non-filer mother, household 2, 3,066 = 170.0%: over 147%, within 260%. none; eligible_child. | yes (2/2) | agrees |
| CO-387 | p2 `chp_eligibility_status`, `chp_copayment_income_band` | Monthly 240.0% for 2 (CHP+-eligible); annual 160.0%. eligible_child; band_d on the monthly figure. | yes (2/2) | status agrees; band_c (KF C3-08, OQ-810: ambiguous) |
| CO-388 | p1 `ma_patient_payment` (2026-11) | Eligible: income 2,600 ≤ 300% × 994 = 2,982; CSRA = couple's 60,000 (under the 162,660 maximum, § 8.100.7.M.1.a), resources 60,000 ≤ CSRA + 2,000 (O.1). Payment: 2,600 - 110.36 PNA - 0 MIA (refused, T.1.b/e) - 60 mandatory tax - 202.90 Part B (second month in the facility, V.3.b.ii.8.a) - 40 Part D = 2,186.74, + 300 LTC insurance (V.3.c) = 2,486.74. | yes | agrees |
| CO-389 | `ma_disabled_widow_eligible`, `ma_protected_group_category` (2026-10) | Widow, 55, lost SSI to widow's benefits, no Part A, but resources 40,000 > 2,000 (§ 8.100.6.I.1.f "meet all other Medical Assistance requirements"; Pickle and DAC need the same). false; none. | yes (2/2) | agrees |
| CO-390 | `ma_ssi_countable_income`, `ma_ssi_related_category` (2026-10) | 1,200 - 20 - 300 PASS (416.1124 / F.6.q) = 880 < 994; resources 1,000; disabled. 880; disabled. | yes (2/2) | agrees |
| CO-391 | `ma_ssi_countable_income`, `ma_buy_in_category`, `ma_msp_category` (2026-10) | (3,400 - 20 - 65) / 2 = 1,657.50; WAWD (age ≥ 16, disabled, employed, 124.6% ≤ 450%); MSP: QMB 100% and SLMB 120% exceeded; QI-1 (≤ 135%) barred: "cannot otherwise be eligible for Medical Assistance" (§ 8.100.6.N.4.d), and he is in the Buy-In. 1,657.5; working_adults_with_disabilities; none. | yes (3/3) | agrees |
| CO-392 | `ma_ssi_countable_income` (2026-10) | 800 + 5,000 (the settlement, part of other unearned income) - 20 = 5,780. | yes after re-reading (blind 10,780, see table) | agrees |
| CO-393 | p3 `ma_buy_in_category` (2026-10) | Turns 19 on 2026-10-08; § 8.100.5.C.3: a child eligible "at any time during a calendar month shall be eligible ... during the entire month" (Q.1.a "age 18 or younger"). Household 2: (5,600 - 20 - 65) / 2 = 2,757.50 = 152.9% ≤ 300%; employer coverage taken (60% share). children_with_disabilities. | yes | agrees |
| CO-394 | same (2026-10) | Same with birthday 2026-10-20. children_with_disabilities. (The comment's "the child still 18 through October" is inexact: the child turns 19 on October 20; the expectation is unaffected.) | yes | agrees |
| CO-395 | p1, p2 `ma_ssi_related_category` (2026-11) | p1 institutionalized spouse: own 980 ≤ 994, aged. p2 community spouse: couple 1,680 > 1,491, none. | p1 **no** (stored wrong), p2 yes | p1 agrees with me (KF entry wrong); p2 aged (KF C3-1 confirmed) |
| CO-396 | `ma_ssi_related_category`, `ma_has_full_coverage_category`, `ma_oap_health_care_status` (2026-10) | OAP recipient, 76; § 8.100.5.E.6 non-cooperation: Medical Assistance "shall be denied", so no SSI-related or SISC B route; OAP Health Care is for OAP recipients who "do not qualify for Medicaid" (§ 8.941.1, 8.941.3.A); VA A&A excluded. none; false; eligible_state_only. | yes (3/3) (fact caveat on the full-coverage row) | category agrees; full coverage true and medicaid_eligible (KF C3-2 confirmed) |
| CO-397 | `ma_ssi_related_category`, `ma_has_full_coverage_category` (2026-08) | Onset 2026-09-15: not disabled in August → none. Full coverage: see table. | category yes; full coverage **no** | category agrees; full coverage true (KF C3-2) |
| CO-398 | `ma_dac_countable_income`, `ma_dac_eligible` (2026-10) | OASDI disregarded (§ 8.100.6.J.1.c.i); (2,200 - 20 - 65 - 600 IRWE, 416.1112(c)(6)) / 2 = 757.50 < 994; resources 1,000. 757.5; true. | yes (2/2) | 1,057.5; false (KF C3-3 confirmed) |
| CO-399 | `ma_dac_countable_income` (2026-01) | Student under 22 at college 12 hours: 416.1112(c)(3) at 2026's 2,410 / 9,730 takes all 2,200 (H.4.d's 400 / 1,620 are the pre-2002 figures; the incorporated edition indexes them). 0. | yes | 1,057.5 (KF C3-3 confirmed) |
| CO-400 | p3 `ma_cbwd_countable_household_income`, `ma_buy_in_category` (2026-10) | 4,707.50 = 261.0%; children_with_disabilities. | yes after re-reading (2/2) | 5,597.5; none (KF C3-4 confirmed) |
| CO-401 | p3 `ma_buy_in_category`, `ma_cbwd_premium` (2026-11) | 2,757.50 = 152.9%; children_with_disabilities; premium 70. | yes after re-reading (2/2) | category agrees; premium 90 (KF C3-4 confirmed) |
| CO-402 | `ma_msp_category` (2026-11) | 76, Part A; 1,150 - 20 = 1,130 = 85.0% ≤ 100%; home with a recorded beneficiary deed: § 8.100.5.M.2.a.xiv counts a home "which is subject to estate recovery", and 42 U.S.C. 1396p(b)(1)(B)(ii) excludes "medical assistance for medicare cost-sharing" from recovery, so the home stays exempt for a QMB determination; resources 1,000 ≤ 9,950; determined in October, QMB effective the month after (L.10). qmb. | yes (needs an open question: xiv does not say against which assistance "subject to estate recovery" is judged) | none, resources 151,000 (KF C3-5 confirmed) |
| CO-403 | `ma_ssi_countable_resources`, `ma_ssi_related_category` (2026-10) | 40, not institutionalized: 1396p(b)(1) recovers only from an institutionalized individual or one "55 years of age or older", so xiv does not reach the home. Resources 1,000; 800 - 20 = 780 < 994; disabled. | yes (2/2) | 151,000; none (KF C3-5 confirmed) |
| CO-404 | `ma_wawd_countable_income`, `ma_wawd_premium` (2027-01) | 207.50 (2027 student exclusion 2,500); 207.50 / 1,330 = 15.6% ≤ 40% → premium 0 (2027 guidelines not yet in force in January). | countable **no** (stored wrong); premium yes | 1,457.5 and 25 (KF C3-6 confirmed) |
| CO-452 | p3 `ma_buy_in_category`, `chp_eligibility_status` (2026-10) | (4,500 - 85) / 2 = 2,207.50 = 122.4% ≤ 300%; no employer coverage available. CHP+: MAGI 4,500 = 249.5% within 260%, but § 120.1.B bars a child "eligible to receive assistance under Title XIX". children_with_disabilities; ineligible_medicaid_eligible. | yes (2/2) | agrees |
| CO-453 | `ma_magi_category`, `ma_magi_eligibility_status` (2026-11) | Turns 19 on 2026-11-25: Children "through the end of the month in which they turn 19" (§ 8.100.4.G.2.a). Filer, household 1: 1,850 / 1,330 = 139.1% ≤ 142% (over the Adults 138%). child, eligible. | yes (2/2) | agrees |

## Recommended actions

1. CO-395: change p1's expectation to `aged` and remove `CO-395:p1:ma_ssi_related_category@2026-11` from
   known-failures.json. Keep p2's entry. When C3-1 is fixed, p1 must be tested against the individual standard (994),
   not left on the couple standard the engine uses now.
2. CO-404: change `ma_wawd_countable_income` 2027-01 to 207.5 (premium stays 0), and add the 2027 versions of CO-3379 and
   CO-3380 (2,500 and 10,080, D-166). The parameter gap is a new P1, independent of C3-6.
3. CO-397: state `ma_retroactive_coverage_requested` and the MAGI household facts, then recompute
   `ma_has_full_coverage_category` for August (true if retroactive coverage is requested, on the Adults group).
   CO-396: state the MAGI and long-term-care facts so that false can be reached.
4. CO-402: record an open question (needs Legal) on whether § 8.100.5.M.2.a.xiv makes the home countable for an
   applicant whose assistance cannot be recovered (MSP only), since the stored expectation rests on that reading.
5. CO-387: no change; it waits on OQ-810.
