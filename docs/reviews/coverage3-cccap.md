# Coverage review, third pass: CCCAP (8 CCR 1403-1)

Reviewer pass: third exhaustive coverage matrix, 2026-11-22, on HEAD d388d4c (origin/ccr-9d19bf4c-wmnwcl). It follows the first pass (docs/reviews/coverage-cccap.md, fixes 22b6dd2, 68fbc2b, 8bb8e36, 739c2be) and the second (docs/reviews/coverage2-cccap.md, fixes 71465a0). It also covers the shared CO-4451 rename and the CO-4463 edit in 9ef7c0d (LEAP and SUN Bucks pass 2).

Governing text: 8 CCR 1403-1, rule version 12658, effective 2026-08-14 (volumes/co/documents/D-87.md). 12 CCR 2509-4 7.302 (D-305) for 3.120.D.

Method:
- I built this matrix from the D-87 text and did not reuse earlier rows. I read §§ 3.109-3.121, 3.124 and the eligibility parts of 3.125 (Q, T, W, Y, BB, CC, EE, FF, GG, II, LL) line by line, along with the 3.103 definitions those sections use (B, C, H, K, Q, S, MM, TT, UU, WW, CCC, LLL, MMM, NNN, OOO, RRR, SSS, VVV, WWW, FFFF, TTTT, UUUU, WWWW, EEEEE, FFFFF, IIIII, JJJJJ, NNNNN). I took §§ 3.100-3.108, 3.122-3.123 and 3.126-3.147 by subsection heading, one line each.
- In a scratch copy (`git archive HEAD`), I exported the ledger (`npm run export -- --volume co`: 2,179 items). I dumped every CCCAP derivation (82 derived items under volumes/co/childcare) and the CCCAP parameters. For every carried row I read the derivation against the paragraph. I checked each diff in 22b6dd2, 68fbc2b, 8bb8e36, 71465a0 and 9ef7c0d that touches a CCCAP item or a fact CCCAP reads.
- Systematic check: I listed every supplied money fact tagged `income` that CCCAP's income closure (CO-985, CO-994, CO-2578) does not read. For each one I asked whether it is part of a fact CCCAP does read, or whether it states a receipt that 3.111.I counts or 3.111.J excludes.
- Probes: one batch runner (scratch `scripts/run-probes.ts`) evaluated `cccap_eligibility_status`, `cccap_household_income`, `cccap_household_size`, `cccap_parent_fee` and `cccap_verification_status` for every member. Q-* and Z-* re-run the earlier passes' P1 households (generator `c2tools/mk2.py`, unchanged). Y-* are new (`c3tools/mk3.py`, `mk3b.py`). All are in /tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/. The base household is the same: mother p1 with $2,000 of wages and 120 hours, son p3 aged 6, Denver, application 2026-11-15, entry limit 185%.

## 1. Verdict

**2 P1 found** (C3-1, C3-2). Both are household-composition shapes that the earlier passes read only for the activity test:
- **C3-1.** A caretaker who joins the household during the eligibility period is tested at once, although 3.125.EE.2 and Q defer that change to the redetermination.
- **C3-2.** A caretaker who is involuntarily out of the home is still tested as a household caretaker for county residency, the asset declaration and the residency verification, and is still counted in household size, although 3.111.D.1.b makes the household a one-caretaker household.

There are also 4 P2 and 5 P3. Every P1 of the first and second passes still holds (section 5). No open question is misclassified (section 4).

## 2. Findings

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| C3-1 | **P1** | 3.125.EE.1-2, 3.125.Q (closed list), 3.111.D.1.c | cccap_household_caretakers_in_eligible_activity CO-991, cccap_caretaker_in_eligible_activity CO-984, cccap_household_members CO-982, cccap_determination_type CO-3307 | EE: "1. Changes reported during the twelve (12) month low-income eligibility period requiring immediate action: a. Changes to income, if the household's income exceeds eighty-five percent (85%) ...; b. Changes to an adult caretaker or teen parent's qualifying low-income eligibility activity ...; ... e. Changes that are beneficial ... 3) Change in household composition due to an additional child requesting care ... 2. Changes outside of the above guidelines ... **shall not be acted upon until the adult caretaker or teen parent's re-determination**." Q: counties "shall not discontinue child care services prior to a household's next eligibility re-determination unless" Q.1-6, where Q.2 is a caretaker who "is **no longer** in a qualifying low-income eligible activity". | At `change_during_eligibility_period`, CO-991 requires every caretaker in the household as stated to be in an activity or excused. EE.1 acts on a composition change only when an additional child requests care, and EE.2 defers every other composition change. A caretaker who joined during the period was never in an activity, so Q.2's "no longer" does not reach him. The volume has a last-determination fact for children (CO-4462, first pass F-06) but none for caretakers. **Repro Y-1:** at a change, the working mother's authorized son, and a new spouse (stepfather) who moved in during the period with no activity: all members `ineligible_activity`, fee 0. **Y-1r:** the same household at a redetermination is `ineligible_activity`, which is correct (D.1.c.1). Under EE.2 and Q, Y-1 stays `eligible_low_income` until the redetermination. The fee cannot rise at a change (CO-4052), and the new member's income is still tested against 85% SMI (EE.1.a, CO-2104), so only the activity test is wrong. **Variant Y-1c:** the working father leaves during the period, and the mother, an incapacitated caretaker excused under D.1.c.3, stays with the authorized child: `ineligible_activity`. Y-1c depends on whether Q.2's "the adult caretaker(s)" is read for the household as a whole, so it needs a recorded reading. | Add a case-record fact for caretakers, as CO-4462 does for children, e.g. `cccap_caretaker_was_in_household_at_last_determination` (false when not stated). At `change_during_eligibility_period`, CO-991 does not test the activity of a caretaker who joined during the period (EE.2). Record whether a departing caretaker (Y-1c) is a Q.2 discontinuance, as an open question (state policy choice) citing EE.1-2, Q.2 and D.1.c.3. Add rule tests from Y-1. |
| C3-2 | **P1** | 3.111.D.1.b; 3.111.A; 3.111.C.2.a; 3.103.LLL; 3.111.H.5.c; OQ-125's recorded reading | cccap_low_income_child_care_eligible CO-987 (per-caretaker residency and asset tests), cccap_meets_county_residency CO-2107, cccap_requires_verification_of_residency CO-1440, CO-1441, cccap_household_members CO-982, cccap_household_size CO-983 | D.1.b: "Households with two adult caretakers or teen parents, when one adult caretaker or teen parent is involuntarily out of the home. **Such a household shall be considered a household with one adult caretaker or teen parent.**" A: "The adult caretaker(s) and teen parent(s) shall be verified residents of the county". LLL: the household includes "the adult caretaker(s) or teen parent(s)". OQ-125 (resolved) records that "an involuntarily absent caretaker leaves a one-caretaker household (D.1.b)". | Only the activity test (CO-991, via CO-898) applies D.1.b. CO-987 still requires the absent caretaker to be a county resident and to make the asset declaration. CO-1440 and CO-1441 still ask for his residency and activity documents. CO-982 and CO-983 still count him in the household. **Repro Y-8b:** the father is in jail in Fremont County (`county_of_residence` fremont, `cccap_caretaker_is_involuntarily_absent`), and the mother works: every member `ineligible`. **Y-8c:** his county stated as Denver, no residency document for him: `eligible_low_income`, fee 20 (household of 3), verification `past_due`. **Y-8:** his residency and asset facts not stated: status unknown. Under D.1.b the household has one caretaker, the mother. She is a verified Denver resident who works, so the answer is `eligible_low_income` with verification `complete` and no requirement on the father, and the fee is 47 for a household of 2. The size reading (2 or 3) is the one part the text leaves open (D.1 is a list of qualifying compositions, and LLL counts "the adult caretaker(s)"). | In CO-987, CO-1440, CO-1441 and CO-1445, skip a caretaker with `cccap_caretaker_is_involuntarily_absent`, so that D.1.b's one-caretaker household is tested on the caretaker in the home. Either drop him from CO-982 for size and income, or record that reading as an open question (state policy choice) citing D.1.b, LLL and OQ-125. Add rule tests from Y-8b and Y-8c. |
| C3-3 | P2 | 3.116.C, E, F; 3.115.B; 3.117.B | CO-1440, CO-1441, CO-1445 (each reads the evaluated person's `is_referred_for_colorado_works_child_care`, CO-896); compare CO-2873, CO-988 (household-level) | C: "only earned income that is reported and verified by the county Colorado Works worker will be considered countable income for Colorado Works Child Care cases"; E: "County residency shall be verified by the county Colorado Works Program" | The first pass fixed F-23 by exempting the referred person. A second caretaker in the Colorado Works unit who is not stated as referred still has to verify residency, activity, earned income and hours for CCCAP. CO-2873 (unearned income) and CO-988 already test the referral over the household. This is the residual of F-23 and the per-person class of F-01. **Repro Y-2:** two parents in the unit, the mother work eligible and referred, the father working $1,000 and not stated as referred, with no CCCAP documents: `eligible_colorado_works`, fee 10, verification `past_due`. **Y-2b**, with the father also stated as referred: `not_required`. | In CO-1440, CO-1441 and CO-1445, test `[exists, cccap_household_members, is_referred_for_colorado_works_child_care]`, as CO-2873 does. Alternatively, say in CO-896's meaning that the referral is stated for every caretaker of a referred household. |
| C3-4 | P2 | 3.111.I.4 (F-08 fix) | cccap_other_countable_receipts CO-4464 reads `in_kind_employment_compensation_value` CO-4454; neutral duplicates `in_kind_compensation_value` CO-4506 (LEAP pass, created before CO-4454), `in_kind_earned_compensation_value` CO-4360, `in_kind_earned_income_value` CO-4437 | I.4: an in-kind benefit "received ... as compensation for employment ... must be counted as other income ... based on the cost or fair market value" | The F-08 fix added CO-4454 while CO-4506, a neutral fact with the same meaning ("every program reads it as 0"), already existed. A case that states the employer housing in CO-4506 is counted by every other reader of CO-4506 but not by CCCAP. **Repro Y-3:** $2,000 of wages plus $1,500 of employer housing stated as CO-4506: income 2,000, `eligible_low_income`, fee 47. **Y-3b**, stated as CO-4454: income 3,500, `ineligible_income`. This is a dual-entry class, the same as second-pass C2-4. | Merge the in-kind compensation facts into one neutral fact (or make CO-4454 an alias of CO-4506) and have CO-4464 read it. Cite the dual-entry audit. |
| C3-5 | P2 | 3.111.I.7.c, J.16, J.19 (F-09 fix) | CO-4464 reads `gi_bill_subsistence_allowance_received` CO-4456 ("Part of educational_assistance_received"); `gi_bill_housing_and_food_allowances_received` CO-4501 ("Part of ... other_unearned_income ... The tuition, fees and books part is educational_assistance_received (CO-3360), not this fact") | I.7.c counts "Subsistence allowances paid to veterans through the GI bill for education and on-the-job training" | Two facts describe the same receipt and place it differently. CO-4456 puts the allowance inside CO-3360, which CO-3913 takes out and CO-4464 adds back. CO-4501 puts it outside CO-3360. A case that states the allowance in other unearned income and answers both GI Bill facts counts it twice. **Repro Y-4:** $2,000 of wages, $1,500 in `other_unearned_income_nontaxable`, CO-4501 = CO-4456 = 1,500: income 5,000 (the rule counts 3,500). CO-4661's rationale already names both facts. Consistent statements under either fact give 3,500. | Keep one GI Bill living-allowance fact with one placement and have CO-4464 add it only when it is inside CO-3360. Alternatively, cap CO-4456 at `educational_assistance_received`, and say in CO-4501 that it is not also stated in CO-4456. |
| C3-6 | P2 | 3.103.S, 3.111.J.26 | CO-3913 / CO-3916 count `tanf_diversion_payment_received` CO-4850 (new in 9ef7c0d, "Part of ... other_unearned_income") | S: "All state diversion payments of less than four (4) consecutive months are not cash assistance. For the purpose of child care, county diversion payments are not cash assistance." J.26 excludes "Public cash assistance grants including ... (TANF)/Colorado Works" | The first pass's F-29 ("The volume reads no diversion amount as CCCAP income") is now stale. The neutral diversion receipt sits inside the unearned income CCCAP counts, and nothing excludes a state diversion paid over four or more consecutive months, which S makes cash assistance and J.26 excludes. Shorter state diversions and county diversions are not cash assistance and are not in 3.111.I's list either, so their treatment is a reading the volume has not recorded. **Repro Y-7:** $2,000 of wages plus a $1,500 diversion payment stated in CO-4850: income 3,500, `ineligible_income`. | Record the reading in CO-3916's precision or an open question citing S, I and J.26. If a state diversion of four or more months is to be excluded, add a fact for the consecutive months, or a part-of fact, and subtract it in CO-4463. |
| C3-7 | P3 | 3.113.A.1.d, 3.117 (opening, B) (the C2-7 fix) | CO-987 asset conjunct | Assets are self-declared "At application and re-determination". A transition happens "without requiring the household to complete the Low-Income Child Care application", and "No additional verification shall be required until the household's twelve (12) month re-determination" | CO-987 still tests the declaration at `transition_from_colorado_works`, where no declaration is made. **Y-5:** a transition with the declaration stated false: `ineligible`. | Test the declaration only at an application or a redetermination. |
| C3-8 | P3 | 3.116.F, 3.117.B, 3.119.F | CO-1442, CO-1443, CO-1444 | F: "The Colorado Works Child Care Referral serves as verification of citizenship, age, and identity". 3.119.F: the Protective Services referral does the same | Each item exempts only the homelessness stabilization period. A questionable attestation in a Colorado Works or protective services case asks for a CCCAP document. This is rare, since the questionable-attestation facts are seldom true. | Exempt `is_referred_for_colorado_works_child_care` (over the household) and `is_protective_services_child_care_case`, with the protective services six months left to CO-4061. |
| C3-9 | P3 | 3.119.A | cccap_protective_services_income CO-994 | "The only countable income for a protective services household is the income that is received by the child(ren) **that have been placed** in kinship or foster care" | CO-994 sums every eligible child in the household, including a caretaker's own children who are not placed. | Sum only placed children (a neutral placement fact), or note the assumption in CO-994's precision. |
| C3-10 | P3 | 3.121.A; 3.103.CCC | CO-2577 meaning | 3.121.A itself points to "3.103(YY)", which in this version is the entry income level; the homelessness definition is 3.103.CCC | CO-2577's meaning repeats the rule's stale cross-reference. | Cite 3.103.CCC and note that 3.121.A's "(YY)" is stale. |
| C3-11 | P3 | — (9ef7c0d) | CO-4451 rationale | — | The rationale names `cccap_excluded_unearned_income`, but the item is `cccap_excluded_unearned_receipts` (CO-4463). | Correct the identifier. |

Reproductions (scratch copy; p1 = mother, p2 = second adult, p3 = child aged 6; statuses are the same for every member unless shown):

| Probe | Engine | Rule |
|---|---|---|
| Y-1 (change; new stepfather, no activity) | `ineligible_activity`, fee 0 | `eligible_low_income` until the redetermination |
| Y-1r (same at a redetermination) | `ineligible_activity` | same (correct) |
| Y-1c (change; working father left; incapacitated mother stays) | `ineligible_activity` | needs a recorded reading (C3-1) |
| Y-8b (father in jail, county fremont) | `ineligible` | `eligible_low_income` |
| Y-8c (father in jail, Denver, no residency document for him) | `eligible_low_income`, n=3, fee 20, `past_due` | `eligible_low_income`, `complete`; fee 47 if n=2 |
| Y-8 (his residency and asset facts not stated) | unknown | `eligible_low_income` |
| Y-2 / Y-2b (Colorado Works; father not referred / referred) | `past_due` / `not_required` | `not_required` |
| Y-3 / Y-3b (in-kind in CO-4506 / CO-4454) | income 2,000 / 3,500 | 3,500 |
| Y-4 (GI Bill in both facts) | income 5,000 | 3,500 |
| Y-5 (transition, declaration false) | `ineligible` | eligible (no declaration at transition) |
| Y-6 (17-year-old, IOP since 2026-07-01, evaluated 2027-08) | `ineligible_activity` | same: the year per instance has run (C2-1 fix does not over-reach) |
| Y-7 (diversion $1,500) | income 3,500 | depends on the reading (C3-6) |
| Y-9 / Y-9a (family-care medical leave at a change / at an application) | `eligible_low_income` / `ineligible_activity` | same (3.112.C.2, 3.125.Q.2; D.9 "open and active" case) |

## 3. Coverage matrix

Legend: **C** = carried by the items listed; I read each derivation against the paragraph, and a mismatch is a finding. **NA** = not applicable, with the reason. **OQ** = an open question records the state choice. **GAP** = no item and no recorded reason. "Notes" = docs/colorado-notes.md.

### 3.100-3.110 General
| ¶ | disposition |
|---|---|
| 3.100 authority; 3.101 scope and purpose; 3.102 applicability | NA: statements of authority |
| 3.104 appropriations, county plans | NA (allocation), except where a county plan changes a figure: OQ-162 (job search weeks, education weeks, stabilization length), OQ-121 (entry level), OQ-682 (diversion households) |
| 3.105 funding; 3.106 anti-discrimination; 3.107 confidentiality | NA: administration |
| 3.108 timely written notice of adverse action | NA: notice |
| 3.109 appeal rights | NA: hearing procedure |
| 3.110 Low-Income participant: caretaker or teen parent of a child; meets guidelines; low income; in an activity; needs care | C: CO-992, CO-981, CO-987, CO-2104, CO-991, CO-2108 via CO-4056 |

### 3.103 Definitions the eligibility rules use
| ¶ | disposition |
|---|---|
| A, AA, GGGG, QQQ, CCCCC, PPPPP (IPV and evidence terms) | NA: procedure; the outcome is CO-3906 |
| B additional care needs (disability or court supervision; IHCP, IEP, statement, IFSP) | C: CO-872, CO-1686, CO-1687 (verification), CO-321 |
| C adult caretaker (in the home; contributes financially; parent, adoptive, step, guardian, loco parentis; custody for the period) | C: CO-992, CO-2607, CO-897; OQ-540 (loco parentis). In the home: CO-2607 `lives_with`; see C3-2 for D.1.b |
| D-G, J, HHHH, RRRR, SSSS (adverse action, affidavit, applicant, application, application process, primary caretaker, redetermination form and process) | NA: forms and procedure |
| H application date | C: CO-3911, CO-3912 (anchor of the thirty days); OQ-680 |
| I pre-eligibility application date | NA: 3.126 (Notes, first pass F-24) |
| K assets (liquid, non-liquid; primary home and car excluded) | C: CO-1741 (the declaration names this definition), CO-1809 |
| L-P, T, V, W, X, FF-JJ, LL, NN, SS, XX, ZZ, EEE, HHH, JJJ, KKK, UUU, XXX, ZZZ, AAAA, BBBB, EEEE, JJJJ-LLLL, NNNN-QQQQ, VVVV, YYYY, AAAAA, DDDDD, GGGGG, HHHHH, KKKKK, LLLLL, OOOOO (provider, authorization, fiscal, notice, wait list and recovery terms) | NA: no eligibility or benefit effect in the volume's scope. ZZZ non-traditional hours drives only verification: C: CO-2397, CO-2398 |
| Q basic education (middle and high school, HSE, ABE, ESL) | C: CO-1722 (`secondary`, `high_school_equivalency`, `basic_education`), CO-2111 (52 weeks) |
| R Behavioral Health Administration | C: CO-1516 (licensed and endorsed, in its meaning) |
| S cash assistance; state diversion under four months and county diversion not cash assistance | C (fix): CO-4463 excludes a state diversion over CO-4912 (four) or more consecutive months (CO-4911); shorter and county diversions counted, OQ-873 (C3-6) |
| U, Y Child Welfare Child Care | C: CO-2576, CO-989 row 2; OQ-710 |
| Z citizen/legal resident (the child) | C: CO-998 (citizen, national or qualified non-citizen) |
| BB CCCAP's components | C: CO-989's status values |
| CC Colorado Works Program; DD Colorado Works Child Care; EE Colorado Works households | C: CO-013 (unit membership, precision from C2-3), CO-2709, CO-896, CO-3931, CO-988; OQ-682 |
| KK county plan | OQ-162 |
| MM custody (living with, or legal custody on the days of care) | C: CO-2607, CO-982 (`lives_with`) |
| OO disaster; VV emergency | C: CO-3505 (3.124.I.8 waiver) |
| PP discovery; QQ drastic economic change | NA |
| TT eligible activity (job search, employment, self-employment, training and post-secondary, basic education) | C: CO-984 arms |
| UU eligible child (under 13 part-day; under 19 with additional needs; residing with the caretaker; citizen) | C: CO-980, CO-4056, CO-2108, CO-998, CO-320, CO-321 |
| WW employment; WWWW self-employment | C: CO-984 (hours and minimum wage), CO-1710 |
| YY entry level; AAA exit level; DDD FPL; BBBBB SMI | C: CO-870, CO-3005, CO-986, CO-993, CO-3007, CO-181, CO-1804, CO-1805; OQ-121 |
| BBB fair market value | C (fix): CO-4506 (in-kind at fair market value; CO-4454 retired into it, C3-4) |
| CCC families experiencing homelessness (1-4) | C: CO-2814 (campground split, F-13), CO-2810, CO-3907 (household-level since C2-5). See C3-10 |
| III Head Start | NA: redetermination scheduling (Notes, F-18); fee waiver C: CO-3505 |
| LLL household (children under 18; under 19 in high school; caretakers and teen parents) | C: CO-982, CO-990, CO-1721, CO-326, CO-327. See **C3-2** |
| MMM in loco parentis | OQ-540; C: role `has_primary_responsibility_for` in CO-2607 |
| NNN incapacitated (impairment; physician's statement) | C: CO-1744, CO-4466, CO-4467 |
| OOO income eligibility (income against size) | C: CO-985, CO-983, CO-986, CO-993 |
| RRR involuntarily out of the home | C (fix): CO-898, CO-982 (not a household member), CO-991. C3-2, OQ-872 |
| SSS job search | C: CO-871, CO-984 |
| TTT Low-Income Program | C: CO-989 `eligible_low_income` |
| VVV maternity/paternity leave | C: CO-3903 `maternity_paternity_leave`, CO-984 |
| WWW medical leave (own illness or care of a family member) | C: CO-3903 (widened by C2-2), CO-984; OQ-850 |
| YYY new employment verification | NA: evidence |
| CCCC parent; UUUU relative | C: roles `parent`, `stepparent` in CO-2607; relative: CO-2396 (`is_related_to`) |
| DDDD parent fee | C: CO-1290 |
| FFFF post-eligibility stabilization period | C: CO-984 job-search arm at a redetermination (weeks left) |
| IIII protective services child care | C: CO-873, CO-989 row 4 |
| MMMM qualified exempt provider | C: CO-2394 (immunization trigger) |
| TTTT regionally accredited institution | C: CO-1722 (`higher_education`). Accreditation is not tested (no fact), which is acceptable as the ordinary case; noted, not a finding |
| XXXX self-sufficiency standard | OQ-121 |
| EEEEE teen parent (under 21; contributes; custody; in an activity; workforce or post-secondary makes an adult caretaker) | C: CO-981, CO-322, CO-1518, CO-992 (C2-1 re-checked: Y-6) |
| FFFFF temporary absence or break (seasonal, medical, maternity, holidays; while receiving Low-Income) | C: CO-3903, CO-984 (`cccap_is_receiving_assistance` on the seasonal, layoff and education-break arms) |
| IIIII training and post-secondary (bachelor's or less; workforce training; SUD IOP from 2026-07-01) | C: CO-1722, CO-4450, CO-1518, CO-1517 |
| JJJJJ transition families | C: CO-3307 `transition_from_colorado_works` |
| NNNNN voluntarily out of the home | C: CO-898's meaning (a voluntarily absent caretaker stays a caretaker); OQ-612 |

### 3.111 Low-Income Child Care eligibility
| ¶ | disposition |
|---|---|
| A (1st sentence) caretakers are verified county residents at application and redetermination | C: CO-2107, CO-1979, CO-505, CO-2106, CO-987 (every caretaker), CO-1440, CO-1676. **C3-2** |
| A (2nd sentence) stays eligible after a county move during the period (3.125.GG) | C: CO-2107 (change, and transition since C2-8) |
| B.1 in an activity; B.2 income guidelines; B.3 custody for the period | C: CO-991, CO-2104, CO-2607 (`lives_with`) |
| C, C.1, C.1.a-b application forms; Head Start application | NA: forms |
| C.1.c Head Start redetermination date | NA: scheduling (Notes, F-18) |
| C.2.a proof of residence | C: CO-1440, CO-1676. **C3-2** |
| C.2.b, b.1-2.a-c citizenship, age and identity verified by attestation unless inconsistent | C: CO-1442-1444, CO-1678-1680. See C3-8 |
| C.2.c immunizations if applicable | C: CO-4060, CO-2394, CO-2884; OQ-562 |
| C.2.d activity verification | C: CO-1441, CO-1677 |
| C.2.e schedule when non-traditional hours are requested | C: CO-2397, CO-2398, CO-1447, CO-1448 |
| C.2.f income | C: CO-1445, CO-1681, CO-2873, CO-2590, CO-1684, CO-1685 |
| C.2.g incapacitation | C: CO-4466, CO-4467 |
| C.2.h custody or parenting schedule | C: CO-2399 |
| D.1.a one caretaker in an activity; voluntary temporary absence keeps the caretaker; a temporary carer is not a member | C: CO-991, CO-898's meaning; OQ-612 |
| D.1.b two caretakers, one involuntarily out: a one-caretaker household | C (fix): CO-982 leaves the absent caretaker out, so CO-983 (size), CO-987 (residency, assets), CO-1440/1441/1445 (verification) and income follow; CO-991 (activity). C3-2, OQ-872 |
| D.1.c.1 both in an activity; c.2 one voluntarily absent, both in an activity; c.3 one active, the other incapacitated | C: CO-991, CO-1744; at a change CO-4910 (C3-1, fixed; OQ-871 departing caretaker) |
| D.2 two caretakers: financial contribution and/or parental role | C: role `contributes_financially_to` (label fixed by C2-6), CO-2607, CO-982, CO-992; OQ-540 |
| D.3 shared custody in separate households, separate applications | C: CO-2607 (`lives_with` on the days of care); OQ-163 |
| D.4 every caretaker in an activity has custody and meets the guidelines | C: CO-2607, CO-2104 |
| D.5 unrelated primary caretaker's verification | C: CO-2396, CO-2846 |
| D.6 not work-eligible caretakers of basic cash assistance children: Low-Income possible | C: CO-989 row 7 with 3.115.C (F-12); CO-013 precision (C2-3) |
| D.7 adoptive parents | C: role `parent` (adoptive, in CCCC); adoption subsidy excluded (CO-4451, CO-4463) |
| D.8 maternity/paternity leave | C: CO-984 (any determination type) |
| D.9 medical leave with an open case, unable to care | C: CO-984 (incapacity at a redetermination; none at a change, C2-2); OQ-850 |
| D.10 separated caretaker with a temporary order: not judged on the other spouse's resources | C: CO-4063, CO-4064, CO-4070 |
| E incapacitated single caretaker not in an activity: ineligible | C: CO-991 (needs one caretaker in an activity) |
| F eligible child (under 13 part-day; under 19 additional needs; custody) | C: CO-980, CO-4056, CO-2108, CO-320, CO-321, CO-872; at a change CO-4462 (F-06) |
| F.1 citizen/legal resident, identity if inconsistent | C: CO-998, CO-1442-1444 |
| F.2 immunization record (not attending school, unrelated exempt provider outside the home) | C: CO-4060, CO-2884, CO-2394; OQ-562 |
| G.1.a-b employment, full or part time; gross ÷ hours ≥ federal minimum wage | C: CO-984 (`>=`), CO-160 |
| G.1.c LLC and S-corporation owners are employees | C: CO-3915 precision (F-27), CO-4341 |
| G.2.a self-employment documentation; expenses verified or not considered | C: CO-1709 (receipts or other documents) |
| G.2.b expected weekly schedule | C: CO-1447/1448 (schedule when self-employed) |
| G.2.c income exceeds expenses | C: CO-1710 (net, not below 0) with CO-984 |
| G.2.d taxable gross ÷ hours ≥ minimum wage | C: CO-984 |
| G.2.e launch period (under twelve months; six months or to the redetermination; minimum wage × declared hours) | C: CO-2113, CO-1710, CO-4461 (F-11) |
| G.3.a job search: at least thirteen weeks per instance for those eligible at the last determination | C: CO-871, CO-2109, CO-2110, CO-984 (`cccap_is_receiving_assistance`); county weeks OQ-162 |
| G.3.b start date of job search | NA: dates care, not eligibility |
| G.3.c-g job search continues until work, another activity or exhaustion; any day uses a week; approved on each job loss; ineligible when used up | C: CO-2109, CO-984 (`<`) |
| G.3.h, h.1-2 post-eligibility stabilization at a redetermination | C: CO-984 job-search arm at a redetermination |
| G.4.a.1 training or post-secondary, first bachelor's or less, 104 weeks (208 by county plan) | C: CO-1722, CO-4450, CO-2111; OQ-162 |
| G.4.a.2 workforce training, 104 weeks | C: CO-1722 (`workforce_training`), CO-2111 |
| G.4.a.3 SUD treatment IOP or higher, from 2026-07-01, one year per instance | C: CO-4074, CO-3905, CO-1516, CO-1517, CO-2112 |
| G.4.b.1-2 basic education 52 weeks; no limit for a teen parent | C: CO-2111 (its meaning) |
| G.4.c a week used | C: CO-2111 |
| G.4.d enrollment verification; SUD by self-attestation | C: CO-1441 (SUD exempt), CO-1677 |
| G.4.e referral to training resources | NA |
| H.1 gross income ≤ 85% SMI | C: CO-993, CO-986 (`<=`) |
| H.1.a entry level at least 185% FPL | C: CO-870, CO-3005; OQ-121 |
| H.1.b exit at 85% SMI | C: CO-993, CO-2104 |
| H.2-3 FPG and 85% SMI tables (to 2026-09-30; from 2026-10-01) | C: CO-181 via CO-3007 (2026: $2,276.67 for 3, $473.33 each additional, match), CO-1804, CO-1805 (5,100.99... and 5,347.35...) |
| H.4 prior thirty days generally; H.4.a-f shorter, contract, self-employment, fluctuating, rental, anticipated changes | C: CO-3911, CO-3912, CO-3913; county averages CO-3914; OQ-680 |
| H.4.e rental property actively managed 20 hours is self-employment; otherwise unearned | C: CO-4457 precision (unearned rents); self-employment facts otherwise |
| H.4.g inclusions and exclusions | C: CO-3916, CO-4463, CO-4464 |
| H.4.h irregular child support averaged | C: CO-3914 |
| H.4.i lump sum counted in the month or over twelve months, whichever is better | C: CO-3916, CO-3918; OQ-680 |
| H.5.a.1-3, b earned, self-employment and unearned verification of the prior thirty days | C: CO-1445, CO-1681, CO-2590, CO-1709 |
| H.5.c assets self-declared; over $1M ineligible | C: CO-1741, CO-1809, CO-987 (not at a change, C2-7). See C3-7 |
| H.5.d verbal verification | NA: evidence |
| H.5.e.1.a-b, e.2 unverified: denied at fifteen days; new application at sixty; closed at a redetermination | C: CO-1354, CO-1450, CO-1451 |
| I.1 gross earnings including armed forces pay | C: CO-023, CO-3912, CO-3915 |
| I.2, I.2.a-c non-farm self-employment net of verified expenses (disallowed: depreciation, principal, personal) | C: CO-1709, CO-1710 (CO-3372 not read) |
| I.3, I.3.a-c farm self-employment | C: CO-4465, CO-1709 (farm interest), CO-1710 |
| I.4 in-kind compensation for employment | C (fix): CO-4506 (the one in-kind pay fact; CO-4360, CO-4437, CO-4454 retired into it), CO-4464. C3-4 |
| I.5 vendor payments that are compensation | C: CO-4455, CO-4464 |
| I.6 railroad retirement; I.7.a-b, d veterans' pensions and refunds; I.8 pensions less early-payout penalties | C: CO-026 (pension_income), CO-4459, CO-4463 |
| I.7.c GI Bill subsistence allowances | C (fix): CO-4501 (the one living-allowance fact, part of other unearned income; CO-4456 retired into it), counted through CO-3913. C3-5 |
| I.9-11, I.13-16, I.19, I.24 dividends, interest, estates and trusts, royalties, memberships, lease bonuses | C: other unearned income facts, CO-3913 |
| I.12, I.17 net rental income | C: CO-4457, CO-4458, CO-4463 (cap fixed by C2-4) |
| I.18 boarders | C: CO-4161, CO-4464 |
| I.20 inheritance, gifts, prizes | C: CO-3367, CO-1181, CO-3916 |
| I.21-22 insurance and lawsuit proceeds less last-illness, burial and medical | C: CO-4460, CO-3916 |
| I.23, I.26-31, I.33 strike benefits, UI, workers' compensation, maintenance, child support, allotments, WIOA wages, CARES refugee payments | C: CO-3913's parts, CO-3912 |
| I.25 Social Security before Medicare deductions | C: social_security_income in CO-3916 |
| I.32 AmeriCorps and VISTA | C: CO-3915 precision (F-27), CO-4016 |
| J.1 a child's earnings | C: CO-3915 |
| J.2 SSI | C: not read (CO-3916 precision), CO-3920 |
| J.3, J.5-9, J.11, J.15, J.21 federally excluded payments | C: CO-3366 via CO-3913 |
| J.4 nutrition assistance | C: not an income fact |
| J.10 foster care, kinship, adoption subsidy | C: CO-3821, CO-4503, CO-4451 (rename re-checked: both parts of other unearned income), CO-4463 |
| J.12 LEAP | C: CO-3913 (energy assistance) |
| J.13 Social Security under a plan for self-support | C: CO-3825, CO-4463 |
| J.14 EIC | C: CO-3913 (tax refunds and credits) |
| J.16, J.19, J.20 student aid earmarked for education | C: CO-3360 via CO-3913; work-study excluded from CO-3912 |
| J.17, J.18 WIA training allowances; youth project payments | C: CO-3815, CO-4463 |
| J.22 R&P vendor payments | C: not the person's receipt; CO-4367 (refugee cash) is counted under I.33 |
| J.23 Colorado Works supportive services | C: CO-4452, CO-4463 |
| J.24 Home Care Allowance | C: CO-3824, CO-4463 |
| J.25 loans; J.27 reimbursements | C: CO-3913 |
| J.26 public cash assistance (OAP, AND, TANF) | C: CO-029, CO-1713 not read; retroactive lump sums CO-3920. **C3-6** (diversion) |
| J.28 irregular income under $90 a quarter | C: CO-4076, CO-4075; OQ-713 |
| J.29 early childhood research payments | C: CO-4453, CO-4463 |
| K.1, K.1.a-b, K.2.a-c court-ordered current child support paid, deducted for eligibility and fees; verified at approval and redetermination | C: CO-3902, CO-1446, CO-1683, CO-1688, CO-985, CO-2578 |

### 3.112 Caretaker responsibilities
| ¶ | disposition |
|---|---|
| A sign the application and verify income | NA: forms (verification is carried under 3.111.C) |
| B agree to pay the fee | NA |
| C reporting within ten days (only over 85% SMI) and four weeks; the temporary break and C.1-4 | C: CO-3903, CO-984 (C2-2 at a change), CO-993; reporting deadlines NA |
| D immunization record (not school age) | C: CO-4060; OQ-562 |
| E provider changes | NA |
| F schedule only when non-traditional hours are requested | C: CO-2397, CO-2398 |
| G child citizenship, age and identity if inconsistent | C: CO-1442-1444 |
| H closure corrected within thirty days | NA: dates care resumes |
| I credentials; J ATS non-cooperation by county policy | NA; J is OQ-162 |

### 3.113 Redetermination
| ¶ | disposition |
|---|---|
| A every twelve months; form forty-five days ahead | NA: scheduling (Notes, F-18) |
| A.1.a.1-3, b earned, self-employment and unearned income of the prior thirty days | C: as 3.111.H.5 |
| A.1.c schedule; A.2 training schedule and student status | C: CO-2398, CO-1441, CO-1677 |
| A.1.d assets at application and redetermination | C: CO-987 (not at a change or a transition; C3-7 fixed) |
| A.3 immunization records | C: CO-4060 |
| A.4 collateral contacts | NA |
| B fee reviewed at redetermination; effective the first full month | C: CO-4052 (no cap at a redetermination); timing NA |
| C Head Start alignment | NA: Notes, F-18 |

### 3.114 Termination
| ¶ | disposition |
|---|---|
| A.1 over 85% SMI during the period | C: CO-993, CO-2104 |
| A.2 no longer a state resident | C: CO-2107 at a change |
| A.3 no activity and job search expired | C: CO-984, CO-2109 |
| A.4 minimum wage | C: CO-984 |
| A.5 22 unexplained absences | C: CO-4055, CO-989; OQ-711 |
| A.6 IPV disqualification | C: CO-3906, CO-989 row 1 |
| B.1 child over the age limit (redetermination only) | C: CO-4056 with CO-4462 |
| B.2 unpaid fees (redetermination only) | C: CO-4054, CO-989 row 5 |
| B.3 time limits (redetermination only) | C: CO-984 (not applied at a change), CO-2111; OQ-790 |
| B.4 fails redetermination requirements | C: CO-1451 `case_closed` |
| B.5 not in an activity | C: CO-984, CO-991; OQ-850 |
| B.6 has become a Colorado Works participant | C: CO-989 row 7 |
| B.7 immunization records | C: CO-4060 |
| B.8 county or state residence | C: CO-2107 |
| B.9 minimum wage; B.10 over 85% SMI; B.11 absences | C: CO-984, CO-993, CO-4055 |
| C closure form; D thirty days to correct; E voluntary withdrawal | NA |

### 3.115-3.117 Colorado Works Child Care and the transition
| ¶ | disposition |
|---|---|
| 3.115.A approved for Colorado Works and work eligible: at least twelve months; freeze or wait list | C: CO-988, CO-2709; capacity NA |
| 3.115.B referral form, B.1-5 | C: CO-896; form handling NA |
| 3.115.C not work eligible: Low-Income only if not in the assistance unit | C: CO-989 row 7, CO-013 precision |
| 3.116.A eligible, IRP, allowable activity, referred: an eligible activity | C: CO-988 (household-level, F-01) |
| 3.116.B twelve-month authorization | NA |
| 3.116.C only earned income reported by the Colorado Works worker | C: CO-2578 (earned income only), CO-2873, CO-1445 (referral read over the household; C3-3 fixed) |
| 3.116.D schedule by the Colorado Works worker | NA |
| 3.116.E residency verified by Colorado Works | C: CO-1440 (referral read over the household; C3-3 fixed) |
| 3.116.F citizenship, age and identity by the referral | C (fix): CO-1442-1444 exempt a referred household. C3-8 |
| 3.116.G immunization | C: CO-4060 |
| 3.116.H diversion households in electing counties | C: CO-988 diversion arm, CO-3931, CO-3932; OQ-682 |
| 3.116.I-K worker notices, provider changes, responsibilities | NA |
| 3.116.L county move during the twelve months | C: CO-988 tests no county residency; CO-1440 exempts referred caretakers |
| 3.117 (opening) transition without a new application; redetermination twelve months later | C: CO-3307, CO-2103 (exit limit) |
| 3.117.A.1 IPV; A.2 over 85% SMI; A.3 absences | C: CO-989 (CO-1730 row), CO-2104, CO-4055 row |
| 3.117.B no additional verification until the redetermination | C: CO-1451 `not_required`. See C3-7 for the asset declaration |
| 3.117.C transition in an activity other than job search | C: CO-984 |
| 3.117.D transition in job search or no activity: job search for thirteen weeks | C: CO-871 (its meaning names 3.117.D), CO-984 |
| 3.117.E income increase at transition not acted upon | C: CO-4052 (fee cap at transition); exit limit only |
| 3.117.F fee not above the last Colorado Works referral | C: CO-4052, CO-4050; OQ-712 |
| 3.117.G-I authorization; Low-Income requirements; responsibilities | NA, except H: C as 3.110 |
| 3.117.J back to Colorado Works Child Care | C: CO-988 precedes the Low-Income rows |

### 3.118-3.121 Protective services, Child Welfare Child Care, homelessness
| ¶ | disposition |
|---|---|
| 3.118.A protective services households (placed child, open case); county plan for CCDF | C: CO-873 |
| 3.118.B-E authorization, not 24-hour care, school hours, referral form | NA (C is the eligible child's "less than twenty-four hours", CO-2108) |
| 3.119.A household of one; only the placed children's income; no child support | C: CO-3008, CO-994 (assumption noted, C3-9), CO-995 |
| 3.119.B sixty days for the children's income | C: CO-4057, CO-4061; OQ-716 |
| 3.119.C county waiver of the income requirement | C: CO-4053 |
| 3.119.D no activity requirement; E no residency verification | C: CO-989 row 4 precedes activity; CO-1440, CO-1441 |
| 3.119.F, F.1-3 six months for citizenship, age, identity | C: CO-4059, CO-4061. See C3-8 |
| 3.119.G sixty days for immunization | C: CO-4058, CO-4061 |
| 3.119.H extra absences paid | NA |
| 3.120.A-C, F Child Welfare Child Care: purpose, not 24-hour care, no CCDF | NA |
| 3.120.D eligibility by Child Welfare under 12 CCR 2509-4 7.302 | C: CO-2576, CO-989 row 2; OQ-710 (D-305 read) |
| 3.120.E no residency verification | C: CO-1440; activity and income verification exempt (F-14): CO-1441, CO-1445, CO-2873 |
| 3.121.A meets the definition | C: CO-2814, CO-3907. See C3-10 |
| 3.121.B stabilization period of at least sixty days | C: CO-2577; county length OQ-162 |
| 3.121.B.1 verifications in the period; ineligible after | C: CO-3909, CO-3908, CO-1451 |
| 3.121.B.2 non-recoverable | NA |
| 3.121.B.3.a no activity in the period; b sixty days to verify | C: CO-989 homelessness row precedes activity; CO-3909 |
| 3.121.B.4.a-b self-declared residency | C: CO-1440 exempts |
| 3.121.B.5, 5.a-b self-declared citizenship, age, identity | C: CO-1442-1444 exempt |
| 3.121.B.6 no immunization in the period | C: CO-4060 exempts |

### 3.122-3.123 Wait lists and freezes
| ¶ | disposition |
|---|---|
| 3.122 wait lists (projections, target populations, order, notices) | NA: capacity, not eligibility (Notes) |
| 3.123 enrollment freezes | NA: capacity |

### 3.124 Parent fees
| ¶ | disposition |
|---|---|
| A gross income against size, children in care; whole dollars, cents dropped; notices | C: CO-2578, CO-983, CO-2579, CO-3508 (floor after reductions) |
| B, B.1-4 revisions during the period; increases otherwise at the redetermination | C: CO-4052, CO-4051; OQ-712 |
| C no higher than at the last referral, application or redetermination | C: CO-4052, CO-4050 |
| D reviewed at redetermination; weekly × 4.33 | C: CO-4052 (no cap); 4.33 via CO-3914 |
| E, F Colorado Works fees on income verified by Colorado Works | C: CO-2578 (earned income) |
| G Head Start dual enrollment waiver | C: CO-3505 |
| H 20% reduction for top-three quality levels, Low-Income and Colorado Works | C: CO-3508, CO-1287, CO-3002 (F-22) |
| I.1 teen parent hardship waiver | C: CO-2575 |
| I.2 quality reduction | C: CO-3508 |
| I.3 Colorado Works in an unpaid activity: no fee | C: CO-1290 (no earnings) |
| I.4 Child Welfare: no fee | C: CO-1290 |
| I.5 homelessness stabilization: no fee | C: CO-1290 |
| I.6 protective services: no fee unless the child has income | C: CO-1290, CO-2578, CO-994; OQ-536 |
| I.7 no income: no fee | C: CO-1290 (`<= 0`) |
| I.8 disaster waiver | C: CO-3505 |
| J-M effective dates, payment to the provider, several providers, responsibilities | NA |
| N, N.1-3 loss at redetermination for unpaid fees until cured | C: CO-4054, CO-989 row 5 |
| O notice fifteen days ahead | NA |
| P, P.1-3 2021-07-01 to 2028-07-31: 1% to 100% FPG, plus 14% above; $15 per additional child above 100% | C: CO-1289, CO-1284, CO-2115-2117 (15% = 1% + 14% above the FPG), CO-1286, CO-2579 |
| Q from 2028-08-01: 1%, 3%, 5%, 7% bands | C: CO-2115-2119 versions; OQ-254 (band edges) |
| R, T FPG and SMI; fee updated at the next redetermination | C: CO-3007 (October year), CO-4052 (decrease allowed at a change, F-26) |
| S $5 hardship reduction | C: CO-3506, CO-3507 |
| U all children part time: 55% | C: CO-1288, CO-3003, CO-2864 |
| V part time over most of the period; W grades 1-12 part time in the school year | C: CO-2864 (stated per child) |
| X teen parent hardship waiver | C: CO-2575 |

### 3.125 County responsibilities
| ¶ | disposition |
|---|---|
| A-P administration, contracts, controls, forms, training, CHATS, overrides, records, expenditures, storage, posting, consumer education | NA: county administration |
| Q minimum twelve months; Q.1-6 the only discontinuance reasons | C: CO-2104/CO-993 (Q.1); CO-984, CO-991 (Q.2; **C3-1**); CO-2107 (Q.3); CO-984 (Q.4); CO-4055 (Q.5); CO-3906 (Q.6); age, time limit, immunization and assets not applied at a change (CO-4462, CO-984, CO-4060, CO-987) |
| R, S wait-list policies | NA |
| T fifteen-day review; sixty-day validity; denial | C: CO-1354, CO-1450, CO-1451 |
| U wrong county forwarded | NA |
| V, X, JJ information from other programs; collateral contacts | NA: evidence |
| W immunization at application and redetermination | C: CO-4060 |
| Y, Y.1-3 preponderance; more only if inconsistent | C: CO-1442-1444 |
| Z no SSN required | C: no CCCAP item reads an SSN fact |
| AA prudent person principle | NA |
| BB, BB.1-2 residence verification at application and redetermination; homelessness under 3.121 | C: CO-1440, CO-1676. **C3-2** |
| CC SUD self-attestation | C: CO-1441 (SUD exempt) |
| DD reporting duties | NA |
| EE.1.a-e changes acted on during the period; EE.2 others wait | C: CO-3307, CO-4052, CO-4462 (children), CO-4910 (caretakers; C3-1 fixed) |
| FF new child: redetermination date | NA: scheduling (Notes, F-18) |
| GG, GG.1-4 county move during the period | C: CO-2107; GG.1 NA; GG.3 receiving county's activities OQ-162; GG.4 NA |
| HH response times | NA |
| II redetermination review; fifteen days; denial | C: CO-1451 `case_closed` |
| KK 20% quality reduction | C: CO-3508 |
| LL, LL.1-3 unpaid fees acted on only at redetermination | C: CO-4054, CO-989 row 5 |
| MM-PP authorization by need; Head Start blending; school hours | NA: authorization (OO: Notes, F-18) |
| QQ-SS authorization start; pre-eligibility payment; notice | NA |
| TT reopening within thirty days | NA |
| UU-ZZ ATS, provider information, exempt provider reviews and screening | NA: provider side |

### 3.126-3.147
| ¶ | disposition |
|---|---|
| 3.126.A-B, D-G pre-eligibility determinations and payment | NA: payment and procedure |
| 3.126.C documents within thirty days | NA: county option, deferred (Notes, first pass F-24) |
| 3.127 eligible facilities | NA: provider eligibility; qualified exempt care drives CO-2394 only |
| 3.128 provider responsibilities | NA; Q (unpaid fee reports) is behind CO-4054, R (absences) behind CO-4055 |
| 3.129 complaints; 3.130 reimbursement rates; 3.131 slot contracts | NA |
| 3.132 arrangement and authorization | NA; B.3 OQ-790; the eligible-child ages repeat CO-4056 |
| 3.133 ATS | NA; A.4 OQ-162 |
| 3.134 fiscal agreements | NA |
| 3.135-3.138 IPV investigation, criteria, hearings, waiver | NA: procedure (outcome CO-3906) |
| 3.139.A-G disqualification periods; D any household | C: CO-3906, CO-989 row 1 (any caretaker or teen parent) |
| 3.140-3.141 notices; district attorney referral | NA |
| 3.142 criminal verdict periods; 3.143 penalties | C: CO-3906; 3.143.B (provider) NA |
| 3.144 hearing rights; 3.145-3.147 recovery | NA |

**Matrix size:** 286 rows covering every paragraph of §§ 3.100-3.147 and the 3.103 definitions. Rows group sibling subparagraphs that share a disposition, so the paragraph count is higher than the row count.

| Disposition | Rows |
|---|---|
| Carried (C) | 222, of which 26 point to a finding (C3-1 to C3-10) |
| Not applicable | 61 (several also name an OQ for a county-plan part) |
| Open question only | 3 (3.103.KK, MMM, XXXX) |
| GAP | 0. C3-1 and C3-2 are mismatches in carried rows: the paragraph is carried, but not for the shape found |

## 4. Open-question confirmations

| OQ | Class | Confirmed? |
|---|---|---|
| OQ-121 county entry levels | blocked: CDEC's county schedule (cdec.colorado.gov) | Yes. H.1.a states only the 185% floor. |
| OQ-162 county plans (job search and education weeks, stabilization length, receiving county's activities, ATS closure) | blocked: county plans under 3.104 | Yes. |
| OQ-163 teen parent living with her own parent (K-9) | state policy choice | Yes. LLL, EEEEE and D.3 do not settle it. |
| OQ-254 post-2028 band edges | state policy choice | Yes. 3.124.Q states whole percentages only. |
| OQ-536 base of a protective services fee | state policy choice | Yes. 3.124.I.6 and 3.119.A state no base. |
| OQ-540 loco parentis; D.2 | state policy choice | Yes. It cites 3.103.C, MMM and D.2. |
| OQ-562 CDE "attending school" | blocked: CDE definition | Yes. A government-index search of Colorado regulations (sos.state.co.us) for a CDE definition of "attending school" found only child care licensing rules (8 CCR 1402-1, 6 CCR 1010-7), which do not define it. C.R.S. 22-33-104 (checked in the OQ) states ages only. |
| OQ-612 temporary absence | state policy choice | Yes. It cites 3.111.D.1.a and NNNNN. |
| OQ-680 anchor of the thirty days; lump sum | state policy choice | Yes. |
| OQ-682 counties serving diversion households | blocked: county elections | Yes. |
| OQ-710 Child Welfare Child Care and the eligible child | state policy choice | Yes. 7.302 is held (D-305). |
| OQ-711 absences: child or case | state policy choice | Yes. |
| OQ-712 permitted increase and the cap | state policy choice | Yes. |
| OQ-713 J.28 by month or by the thirty days | state policy choice | Yes. |
| OQ-716 start of the protective services periods | state policy choice | Yes. |
| OQ-790 time limit reached during the period | state policy choice | Yes. |
| OQ-850 medical leave at a redetermination (new in pass 2) | state policy choice | Yes. D.9 ("open and active ... unable to care") and 3.112.C.2 / 3.114.B.5 do not refer to each other. Probe Y-9a: at an application, family-care leave is not an activity, which D.9's "open and active" case supports. |

No open question is misclassified. C3-1 (departing caretaker) and C3-2 (size) each need a new state-policy-choice open question if the fix keeps the current reading.

## 5. Earlier P1s: all hold

I re-ran the households on the HEAD ledger (generator `c2tools/mk2.py`, unchanged).

| Earlier P1 | Probe | Result |
|---|---|---|
| F-01 Colorado Works read on the child | Q-L | Holds: both `eligible_colorado_works`, fee 0, `not_required`. |
| F-02 residency and assets per person | Q-K1, Q-K3 | Holds: K1 every member `ineligible`; K3 `eligible_low_income`, fee 47. |
| F-03 two caretakers, none active | Q-A1, Q-A2 | Holds: `ineligible_activity`. |
| F-04 graduate program | Q-B2 | Holds: `ineligible_activity`. |
| F-05 county move during the period | Q-C | Holds: `eligible_low_income`, fee 47. |
| F-06 child turned 13 during the period | Q-D2 | Holds: `eligible_low_income`, fee 47. |
| F-07 foster care payment | Q-E | Holds: income 2,000, fee 47. |
| F-08 boarder | Q-F | Holds: income 3,500, `ineligible_income`. |
| F-09 GI Bill subsistence | Q-G2 | Holds: income 3,500 (see C3-5 for the second GI Bill fact). |
| F-10 net amounts | Z-5, Z-5b | Holds: income 2,500, fee 122 both ways. |
| F-11 launch period | Q-H | Holds: income 870, fee 8. |
| F-12 caretaker in the Colorado Works unit | Q-I | Holds: `ineligible`. |
| F-13 campground | Q-M2 | Holds: `eligible_homelessness_stabilization`, fee 0. |
| F-14 Child Welfare verifications | Q-J | Holds: `eligible_child_welfare`, `not_required`. |
| F-15 partner contributing financially | Q-N1 | Holds: `ineligible_activity`, household of 3. |
| C2-1 teen in SUD IOP treatment | Z-1, Z-1b, Y-6 | Holds: `eligible_low_income`, fee 0; past the year per instance, `ineligible_activity` (correct). |
| C2-2 medical leave at a change | Z-2, Z-2b, Y-9 | Holds: `eligible_low_income` (own health and family care). |
| C2-3 payee grandmother (P2) | Z-3, Z-3b | Stated under CO-013's new precision (false for her): `eligible_low_income`, fee 47. |
| C2-5 homelessness per person (P2) | Z-4 | Holds: all three members `eligible_homelessness_stabilization`. |

The fix rounds' changed items each show the change described in their dispositions: CO-982, CO-984, CO-987, CO-988, CO-989, CO-991, CO-1518, CO-2107, CO-3907, CO-4463, and CO-4451's rename. The rename leaves CO-4463 reading both `adoption_subsidy_received` and `kinship_care_payments_received`, each part of other unearned income, so J.10 is still fully excluded. I found no regression in them beyond C3-7 (C2-7's asset test kept at a transition) and C3-11 (an identifier in CO-4451's rationale). The new P1s are in shapes the earlier passes read only for activity (D.1.b; EE.2 for caretakers).

## 6. Notes for the fix round

- C3-1 and C3-2 change answers and need rule tests and household cases from Y-1, Y-8b and Y-8c. Each may need an open question for the part the text leaves open (a departing caretaker; household size under D.1.b).
- C3-4 and C3-5 are dual-entry fact pairs that the F-08 and F-09 fixes created next to LEAP-pass facts made a few hours earlier. Fold them into the dual-entry audit (docs/reviews/audit-dual-entry.md).
- C3-6 updates first-pass F-29 now that the neutral diversion receipt exists (9ef7c0d).

## Disposition (coverage pass 3)

Fix round on origin/ccr-9d19bf4c-wmnwcl at 9898edb; every fix below is in commit 9cfcf0f. New items CO-4910 (`cccap_caretaker_joined_during_eligibility_period`), CO-4911 (`tanf_state_diversion_payment_months`), CO-4912 (`cccap_state_diversion_cash_assistance_months`); excerpts S3635-S3638 (D-87: 3.125.EE, 3.103.LLL, 3.116.E-F, 3.103.S); open questions OQ-871-OQ-873; household cases CO-215 (probe Y-1) and CO-216 (probe Y-8c). Retired into the earlier neutral facts: CO-4360, CO-4437, CO-4454 (into CO-4506) and CO-4456 (into CO-4501).

| Finding | Disposition |
|---|---|
| C3-1 (P1) | Fixed. CO-4910, a case-record fact (false when not stated), says a caretaker joined during the period; at `change_during_eligibility_period` CO-991 neither tests nor counts such a caretaker (EE.2, Q.2; S3635, S3252). Rule tests CO-991-T11 (Y-1: true) and T12 (Y-1r: false). Case CO-215. The departing caretaker (Y-1c) is OQ-871 (state policy choice; the draft tests the household as it stands, so Y-1c stays `ineligible_activity`). |
| C3-2 (P1) | Fixed. CO-982 does not join a caretaker who is involuntarily out of the home, in either direction (D.1.a-b, LLL; S1409, S3636), so residency, the asset declaration, documents, income and size are read on the caretakers in the home. Y-8b, Y-8c, Y-8: `eligible_low_income`, size 2, fee 47, `complete`. The absent caretaker's own household is himself (`ineligible_child`). The size and income reading is OQ-872. Rule tests CO-982-T8, T9; CO-3907-T4 flipped (the father is no longer a member) with T5 for the mother; case CO-216; CO-201 p2 re-pinned (below). |
| C3-3 (P2) | Fixed. CO-1440, CO-1441 and CO-1445 read the referral over the household, as CO-2873 does. Y-2: `not_required`. |
| C3-4 (P2) | Fixed (dual-entry). One in-kind pay fact, CO-4506 `in_kind_compensation_value` (the earliest, LEAP pass); CO-4454 (CCCAP), CO-4360 (Colorado Works) and CO-4437 (Adult Financial) retired into it, its meaning widened to self-employment barter and each program's valuation wording. Readers repointed: CO-4464, CO-1716, CO-2340, CO-3830 (CO-3925 already read it). Each reads it once. Y-3: 3,500. |
| C3-5 (P2) | Fixed (dual-entry). One G.I. Bill living-allowance fact, CO-4501, part of other unearned income and not of CO-3360 (CO-3360's precision says so); CO-4456 retired into it. CO-4464 no longer adds a G.I. Bill term: CO-3913 already counts the allowance, so it is counted once (Y-4: 3,500). CO-4661's rationale repointed. |
| C3-6 (P2) | Fixed. CO-4911 states the months over which a state diversion is paid (0 for a county diversion or none, the default); CO-4463 excludes a state diversion paid over CO-4912 (four) or more consecutive months (3.103.S, J.26; S3638, S2706). Shorter state diversions and county diversions are counted: OQ-873. Rule tests CO-4463-T9, T10. |
| C3-7 (P3) | Fixed. CO-987 tests the asset declaration only at an application or a redetermination (3.117, 3.117.B). Rule test CO-987-T10; Y-5 eligible. |
| C3-8 (P3) | Fixed for Colorado Works: CO-1442-CO-1444 exempt a household referred for Colorado Works Child Care (3.116.F, S3637). Protective services is left as it is: 3.119.F asks for verification when the Child Welfare worker could not attest, with the six months CO-4061 carries. |
| C3-9 (P3) | Accepted, assumption recorded in CO-994's precision: no fact says which household children are placed (the relationship roles carry foster care but not a kinship placement), so the sum runs over every eligible child; it overstates income only for a caretaker's own unplaced child with unearned income. |
| C3-10 (P3) | Fixed. CO-2577 cites 3.103.CCC (S1954) and notes 3.121.A's stale "3.103(YY)". |
| C3-11 (P3) | Fixed. CO-4451's rationale names `cccap_excluded_unearned_receipts`. |

Changed household expectation: CO-201 p2 `cccap_eligibility_status` 2026-11 `eligible_homelessness_stabilization` -> `ineligible_child` (p2 is involuntarily absent, no longer a household member; his own household has no eligible child). p1 and p3 unchanged.

Probes after the fix (every stored CCCAP case passes; the Q-*, Z-* and Y-* probes were re-run after each fix): only these moved, each by the fix named. Q-A2 and Z-4: size 3 -> 2 and the absent father's own status `ineligible_child` (C3-2; the mother's and child's statuses unchanged). Q-G2: income 3,500 -> 2,000, because the probe states the allowance in the retired CO-4456 inside CO-3360; restated in CO-4501 (as Y-4) it is 3,500 (C3-5). Y-2 `past_due` -> `not_required` (C3-3). Y-3 2,000 -> 3,500, Y-3b (the retired CO-4454) 3,500 -> 2,000 (C3-4). Y-4 5,000 -> 3,500 (C3-5). Y-5 `ineligible` -> `eligible_low_income` (C3-7). Y-8, Y-8b, Y-8c -> `eligible_low_income`, size 2, fee 47, `complete` (C3-2). Y-1, Y-7 unchanged as stored (they state neither new fact); with CO-4910 stated Y-1 is `eligible_low_income`, fee 20, and with a six-month state diversion Y-7 is 2,000.
