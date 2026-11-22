# Final verification pass 2: SNAP (Colorado Food Assistance)

Reviewer: fresh, independent SNAP reviewer (family `snap`). This is the second pass. It is read-only and reviews HEAD `88e2e9f`, which has the CCCAP, LEAP and SUN Bucks fixes merged. The first part of the work was done on `ceba7c2`; the only SNAP-relevant change since then is CO-3367, and it was checked (section 8).

The working tree was mid-merge during the pass, so the review ran on a `git archive` snapshot in scratch. At `88e2e9f`, `npm run check -- --volume co` reports:
- check OK;
- rule tests 3087/3087;
- household cases 2685/2685;
- conformance self-check 5930/5930;
- no SNAP warnings.

Governing texts were read directly:
- D-82, 10 CCR 2506-1, effective 2026-10-01;
- D-2, D-3 and D-4, 7 U.S.C. 2014, 2015 and 2017;
- D-8, D-9 and D-15, 7 CFR 273.2, 273.4 and 273.11;
- D-24, 8 U.S.C. 1612;
- D-83 and D-84, the FY 2027 COLA tables.

Two texts were fetched in this pass, from allowed hosts:
- 8 U.S.C. 1631 (law.cornell.edu);
- Pub. L. 107-171 sec. 4401 (govinfo.gov).

## 1. Verdict

**9 P1 found.** The SNAP chapter is not complete under the stopping rule.

On the earlier P1s:
- All 13 earlier SNAP P1s (F-1 to F-13) and V-5 are fixed.
- V-4 is fixed as a verification count. Its consequence, that the member "cannot participate", is not applied; that gap is folded into N-2.
- The F-2 fix carries a new defect: N-3, the sponsored-child exemption.
- One earlier "deferred P2" is really a P1: V-13, the duplicate-child meals verification.
- F-18's deferral does not hold either; it is folded into N-2.

The other seven new P1s are rules in the current text that have no item. The first pass missed them.

## 2. Findings

| id | sev | item(s) | governing excerpt | what is wrong | proposed fix |
|---|---|---|---|---|---|
| N-1 | P1 | (none); CO-1181 `lottery_gambling_winnings_received` is read only by MA, CCCAP and LEAP | 4.000.1 (D-82:788): "'Substantial lottery or gambling winnings' is a cash prize won in a single game, before taxes …, that is equal to or greater than the resource limit for persons aged sixty (60) and older and persons with disabilities." 4.206.E (D-82:2500): "will disqualify the entire SNAP household from eligibility in the month the winnings are received. The next time such a household reapplies … must be considered under Standard Eligibility." 4.403.I (D-82:6443): "counted as unearned income in the month received"; only the member's portion of a shared ticket. 7 U.S.C. 2015(s) (D-3:1103-1107); 7 CFR 273.11(r), (r)(1) "remain ineligible until they meet the allowable resources and income eligibility requirements" (D-15:388-392). | No SNAP item reads winnings. A household whose member wins $4,750 or more stays eligible, and BCE/ECE households, which have no resource test, are never caught at all. This is a missing pathway and a wrong eligibility answer. | Add `snap_has_substantial_lottery_winnings` (person-month): the member's own share ≥ `snap_resource_limit_elderly_disabled` (CO-119). Make `snap_is_eligible` false in that month, with a new `snap_eligibility_status` reason. Count the winnings as unearned income in the month received (4.403.I). Force `standard` on the next certification: this needs a case fact such as `snap_lost_eligibility_for_lottery_winnings_since_last_certification`. Cite D-82, D-3 and D-15. |
| N-2 | P1 (eligibility + verification) | CO-311, CO-2571, CO-1394, CO-1601, CO-1611; OQ-380 | 4.505.7.B-C (D-82): "Until the non-citizen provides information or verification necessary to determine eligibility, the sponsored non-citizen shall be ineligible … The eligibility of any remaining household members shall be determined." Also 4.305.2.G.1 and 273.4(c)(5) (D-9:158). 4.505.6.F (D-82): "A non-citizen who has been given a reasonable opportunity … and has not done so … shall not be certified … A non-citizen is ineligible to participate until acceptable documentation is provided". 4.505.61: "they cannot participate until verification of forty (40) quarters … is received". 273.2(f)(1)(ii)(B), (f)(5)(i) (D-8:159, 259). | The volume's own status reports `members_excluded`, "that member is ineligible", but no eligibility item applies it. Scratch ZZ-1 (CO-116 with `sponsor_information_verified: false`) gives:<br>- `snap_verification_status` = `members_excluded`;<br>- `snap_person_participation_status` = `eligible_member`;<br>- `snap_eligibility_status` = `eligible`;<br>- `snap_allotment` = **223**.<br>The only member is ineligible, so the correct answer is that the household has no eligible member. Non-citizen status, the forty quarters and the military connection (V-4) are the same case once `snap_noncitizen_documentation_due_date` has passed: the status says `past_due`, but the member stays in the eligible size. | Add `snap_is_ineligible_pending_non_citizen_verification`. It is true when:<br>- sponsor information is pending, at any date; or<br>- immigration status, quarters or military connection is pending after `snap_noncitizen_documentation_due_date` (the SSA-review arm already excepted).<br>Make it an arm of CO-310/CO-311, treated as an ineligible non-citizen under 4.411.1 and 4.505.7.C, excluding the deemed sponsor income and resources. Add a participation reason. Add tests, and a case CO-116 variant. |
| N-3 | P1 | CO-2337, CO-3708, CO-3709, case CO-94 | 8 U.S.C. 1631(d)(3) (Cornell, fetched 2026-11-22): "This section shall not apply to assistance or benefits under the Food Stamp Act of 1977 … to the extent that a qualified alien is eligible under section 1612(a)(2)(J)" (children under 18). 7 U.S.C. 2014(i)(2)(E) (D-2:646-648): "The provisions of this subsection shall not apply with respect to any alien who is a member of the sponsor's household or to any alien who is under 18 years of age." Both were added by Pub. L. 107-171 sec. 4401(b)(2)(B)-(C), effective 2003-10-01 (govinfo). | CO-2337 deems a sponsor's income and resources to an LPR child under 18 unless the child's parent is also sponsored. That narrower test is 273.4(c)(3)(vi), and Colorado's 4.305.2.E list has no child exemption at all. The statute exempts every child eligible under 1612(a)(2)(J). CO-94 asserts `snap_sponsor_deeming_applies: true` and 550 of deemed resources for the 15- and 12-year-old. The answer is wrong for any sponsored child whose sponsor's income or resources exceed the reductions. | In CO-2337, replace the (vi) arm with `age ≥ snap_sponsor_deeming_child_age_limit`. Keep the children in CO-3708's divisor, so that their shares are excluded per 273.4(c)(2)(v). Add a `statute_override` naming 4.305.2.E and 273.4(c)(3)(vi). Update CO-94 (deeming false, deemed resources 0) and CO-1616, which then asks no sponsor verification for a child. |
| N-4 | P1 | (none). The neutral facts `resource_transfer_date` (CO-3834) and `resource_transfer_uncompensated_value` (CO-3835) exist for Adult Financial. | 4.408.2 (D-82:8112-8183): households not BCE/ECE that "have transferred resources knowingly for the purpose of qualifying … shall be disqualified … for up to one (1) year". It covers transfers in the three months before application or after certification, with exemptions A.1-4, and the chart: "$1 to $249 1 month … $250 to $999 3 months … $1,000 to $2,999 6 months … $3,000 to $4,999 9 months … $5,000 12 months". | No item, no supplied disqualification fact and no open question. Such a household is computed eligible. The first pass rated this P3 on the ground that it "would enter as a supplied disqualification"; no such fact exists, so the answer is wrong. | Add a supplied county finding, `snap_resources_transferred_knowingly_to_qualify`. Reuse CO-3834/3835. Add a derived period from the chart (a dated parameter) over (transferred value + countable resources − limit). Make the household ineligible in those months, for standard-category households only. |
| N-5 | P1 | CO-2567, CO-330, CO-1702 | 4.403.2 (D-82:6293-6345): "payments from the boarder shall be treated as self-employment income … the cost of doing business shall be equal to … 1. The value of the maximum allotment for the household size that is equal to the number of boarders; 2. The actual documented cost … if [it] exceeds the appropriate maximum allotment … 3. … foster care payments, the entire amount … disregarded", capped at the payment. "C. … added to other monthly earned income and the twenty percent (20%) earned income deduction shall be applied". | Boarders are excluded from the household (CO-304), but no item or fact carries the providing household's boarder income or computes the cost of doing business. Boarder payments are either omitted or, if entered as other unearned income, counted in full without the earned income deduction. Either way the answer is wrong. | Add supplied `boarder_payments_received` (person-month) and `boarder_actual_cost_of_room_and_meals`, plus a foster-care flag. Add derived `snap_boarder_net_income` = payment − min(payment, max(max allotment for the boarder count, actual cost)), with 0 for foster care. Add it in CO-330, so that the earned income deduction applies. |
| N-6 | P1 | CO-055 (read only by expedited, CO-348) | 4.406.1.A (D-82:7327): "Destitute households shall have their eligibility and level of benefits calculated for the month of application by considering only that income received between the first of the month and the date of application." B: income over $25 from a new source "not received or … not anticipated within ten (10) calendar days … shall be disregarded". 7 CFR 273.10(e)(3). | For a destitute migrant or seasonal farmworker household, the application month counts the month's full income. The benefit computation the rule states for that month has no item. | Add a fact for the income received before the application date (or the new-source income disregarded). Make a derived month-of-application income for a household with `is_destitute_migrant_or_seasonal_farmworker`, read by CO-332/CO-334 in that month only. |
| N-7 | P1 | CO-2302, CO-2307, CO-383 | 7 CFR 273.11(c)(1)(ii) (D-15:64-72): the IPV, work-sanction or fleeing-felon member is left out of the size, and "The State agency shall ensure that no household's coupon allotment is increased as a result of the exclusion of one or more household members." 4.411.1.B.1.b (D-82) is silent; the federal regulation binds. | Scratch ZZ-9 and ZZ-10 (CO-83, ECE, $3,600 wages, no shelter cost, recertification): with all three members the allotment is **9**; with p1 work-sanctioned and excluded it is **25**, because the 1-2 person minimum allotment applies. The exclusion raises the allotment, which the rule forbids. | For a household with a member who is `snap_is_disqualified_member_counted_in_full`, cap `snap_full_month_allotment` at the allotment computed with that member counted in the size. Add a `statute_override` (Colorado silent) and tests. |
| N-8 | P1 | CO-343, CO-3390 `liquid_resources_value` | 4.410.J.17 (D-82): "Federal income tax refunds … must be disregarded as a resource for twelve (12) months from the date of receipt". J.12 makes an EITC exempt for twelve months. D.3: "All tax deferred education accounts are exempt resources." F: inaccessible resources and trusts. D.4: one bona fide pre-purchased funeral agreement per member. | CO-343 counts `liquid_resources_value` in full. That fact's meaning includes "stocks, bonds and mutual fund shares, and a lump sum still held", and no SNAP item subtracts any 4.410 exclusion held in liquid form. Example: a standard household with an elderly member, $3,000 of savings and a $2,500 federal refund received three months ago counts $5,500 against $4,750 and is wrongly ineligible. This answers part of the coordinator's lump-sum and refund question. | Add neutral facts for the excluded holdings within liquid resources: tax refunds and EITC held within twelve months of receipt, tax-deferred education accounts, inaccessible resources or trusts. Subtract them in CO-343, and in CO-1740 where 273.2(i) allows. |
| V-13 (was P2, deferred) | P1 (verification) | CO-1383, CO-1607 | 4.505.4.C (D-82:9433-9436): "A household that requests benefits for a child that is already receiving benefits in another household **is responsible for verifying** that they provide the child with the majority of his or her meals prior to receiving benefits for that child as described in Section 4.304.1.B" (the stale cross-reference means 4.304.2). | This is a mandatory document requirement that is not conditioned on "questionable". CO-1383 asks composition verification only when questionable. The fix round deferred it as P2 because it "needs a fact that the child already receives SNAP in another household". Under stopping-rule 1(d) a stated verification requirement left unmodeled is P1. | Add supplied `child_receives_snap_in_another_household` and `child_majority_of_meals_verification_received`. Add a `snap_requires_verification_of_child_majority_meals` arm in CO-1383/CO-1607. Record the stale 4.304.1.B cross-reference in the precision. |
| P2-1 | P2 | CO-409 | 4.306.1.D last sentence (D-82) versus 273.5(b)(10)(ii) (S2507) | The item narrows Colorado's text by the federal no-parent condition. It says so only in `precision`, with no `statute_override`. A signer reads Colorado's broader text. This is an approval risk. | Add a `statute_override`. |
| P2-2 | P2 | CO-3711, CO-3710 | 4.305.2.C: "if they have executed USCIS Form I-864 or I-864A". D.1: "The spouse's income and resources shall be counted even if the sponsor and spouse were married after the signing of the agreement." | The two Colorado sentences pull apart. The item follows C and 273.4(c)(2), and leaves out a non-signing spouse. Neither the precision nor an open question records D.1. | Record a state-choice open question, or a precision note quoting D.1. |
| P2-3 | P3 | CO-338 | 4.411.2.C | The Family Preservation arm reads `snap_household_members`, so an ineligible student, who is a non-household member, can confer BCE. | Read CO-3714. |
| P2-4 | P3 | CO-3723 | 4.403.12.E, 273.11(a)(2)(ii) | The reading that a prorated ineligible member's farm loss is not offset is unrecorded. | Add a precision note or an open question. |

## 3. Earlier P1 confirmation (first pass F-1 to F-13; final-verification V-4, V-5)

| id | result | evidence |
|---|---|---|
| F-1 | fixed | CO-3700 ($10, dated from 2000-01-01, S2500). CO-385 has a `statute_override`. Scratch ZZ-2 (CO-83 applying 2026-10-31): 743 × 1/31 = 23.97, rounded down to **23**; the engine gives 23 (it was 0 under the $25 floor). CO-385-T6/T8. |
| F-2 | fixed (computation); new defect N-3; consequence gap N-2 | CO-3701-3712. CO-116 recomputed by hand, and it agrees: 5,000 − 1,000 − 3,575 = **425**, allotment **223**. The 4.305.2.D steps match D-82:4053-4300 and 273.4(c)(2) (D-9:120-134). |
| F-3 | fixed | CO-3713 adds the (A), (G) and (K) arms. Scratch ZZ-6 (LPR since 2024, formerly a refugee): eligible non-citizen, allotment 306. ZZ-7 (no earlier status): `ineligible_member_non_citizen`. |
| F-4 | fixed | CO-3716, CO-338. Scratch ZZ-3 ($6,000 wages, one Family Preservation child): `basic_categorical`, eligible. ZZ-3b without it: standard, `over_gross_income_limit`. |
| F-5 | fixed | CO-407 (self-employed minimum-wage test), CO-409 (non-parent arm via CO-3719); text 273.5(b)(5), (b)(10)(i)-(ii); tests CO-407-T4/T5 and CO-409-T5/T6. P2-1 is an approval note only. |
| F-6 | fixed | CO-3714 is used in CO-333, CO-336, CO-343, CO-371, CO-376, CO-1740, CO-2300 and CO-2301; text 4.411.2.A/C (D-82:8696-8738). Scratch ZZ-4 (mother is a half-time ineligible student holding $5,000): countable resources **600**, members [p2, p3]. |
| F-7 | fixed | CO-302 prongs 2, 7 and 8 (D-82:570-620); CO-3717, CO-3718. Scratch ZZ-8 (railroad annuity + Medicare): `snap_is_disabled_member` true. |
| F-8 | fixed | CO-3720-3725. The `statute_override` (273.11(a)(2)(ii)(B), D-15:19-23, over 4.403.12.E.2.b-c) is reasoned. Scratch ZZ-5 (farm receipts 200, costs 700; spouse wages 1,500): remaining loss 500; adjusted income 1,500 − 300 − 500 − 217 = **483**. Agrees. |
| F-9 | fixed | CO-3729-3731, CO-1387 (tests T4/T5). Because the representative's identity sits in the identity element, expedited service never postpones it. |
| F-10 / V-5 | fixed | CO-3739, CO-3740 gates in CO-2300, CO-2301 and CO-2003. CO-115 recomputed by hand (gross 1,000; net 583; allotment 387) and by eval-case: 0/0/1000/583/387/`expenses_disallowed`. |
| F-11 | fixed | CO-3726 ($3,887 from 2026-10-01; D-83:31, D-82:2651), CO-3727. Tests CO-383-T5 to T7. |
| F-12 | fixed | CO-415 reads `unpaid_or_in_kind_work_hours` and `community_service_hours`; CO-2309's meaning covers regaining (4.311.B.1.a, 4.311.3.D.1). CO-415-T4. |
| F-13 | fixed | CO-3728 in CO-050 (2015(o)(3)(G)); CO-050-T3. |
| V-4 | fixed as verification; consequence not applied | CO-3733-3738 in CO-1601, with the six-month SSA-review arm (tests T4-T6). 4.505.61, "cannot participate until verification", is not applied to eligibility: see N-2. |

Deferred P2 dispositions:
- **F-18** (non-citizen past the documentation period): really P1, folded into N-2. 4.505.6.F and 273.2(f)(1)(ii)(B) make the *member* ineligible, which is an eligibility outcome and not processing timing. The volume already reports a member-level status for the sponsor case.
- **V-13**: really P1, listed above.

## 4. Coverage map (changes from the first pass's map; everything not listed maps as there)

**Non-citizens**
- 1612(a)(2)(A), (G) and (K) exceptions: CO-3713, CO-306, CO-3715. Covered.
- Sponsor deeming: CO-2337, CO-3701-3712. Covered, except for the child exemption (**N-3**).
- Member ineligible pending sponsor information or status documents: **GAP N-2**.

**Categorical eligibility**
- Family Preservation: CO-3716, CO-338. Covered.
- Lottery disqualification and the forced Standard Eligibility (4.206.E): **GAP N-1**.

**Income**
- Farm loss offset: CO-3720-3725. Covered.
- Boarder income (4.403.2): **GAP N-5**.
- Destitute month-of-application income (4.406.1): **GAP N-6**.
- Substantial winnings as income (4.403.I): **GAP N-1**.
- Lump sums and tax refunds as income: CO-2339 (section 8). Covered.

**Resources**
- Ineligible student excluded: CO-3714. Covered.
- Sponsor resources: CO-3702. Covered.
- Transfer of resources (4.408.2): **GAP N-4**.
- 4.410 exclusions held as liquid (refunds, EITC, education accounts, inaccessible): **GAP N-8**.

**Disability prongs**
- VA non-service-connected pension, railroad annuity, disability-based Medical Assistance, AND-SO as interim assistance: CO-302. Covered.

**Students**
- Non-parent full-time caretaker and the self-employed minimum-wage test: CO-407, CO-409, CO-3719. Covered.

**ABAWD**
- In-kind and unpaid work: CO-415. Covered.
- California Indian: CO-050. Covered.

**Allotment**
- 18+ row: CO-383, CO-3726. Covered.
- $10 initial-month threshold: CO-3700, CO-385. Covered.
- No increase from excluding a disqualified member: **GAP N-7**.

**Verification**
- Authorized representative's identity: CO-3731. Covered.
- Quarters and military connection: CO-3736, CO-3738. Covered.
- Unverified expenses not deducted: CO-3739, CO-3740. Covered.
- Duplicate-child meals (4.505.4.C): **GAP V-13**.

## 5. Rules checked against their text (57)

CO-110/111, 112/113, 114/3043, 122/123, 130/131, 132, 133, 134, 135, 118/119 and 1235-1238 match D-82:5750-5806 and 7619-7671, D-83 and D-84 for FY 2027 from 2026-10-01.

| item(s) | result |
|---|---|
| CO-3700, CO-385, CO-2308 | Correct (7 U.S.C. 2017(c)(1); 273.10(a)(1)(iii)(C)). |
| CO-3701, CO-3702, CO-3703, CO-3704, CO-3708, CO-3709, CO-3710, CO-3711, CO-3712 | Correct against 4.305.2.D and 273.4(c)(2); P2-2. |
| CO-2337 | N-3. |
| CO-3713, CO-306, CO-307, CO-308 | Correct. |
| CO-302, CO-3717, CO-3718 | Correct. |
| CO-336, CO-338, CO-341, CO-3716 | Correct; P2-3. |
| CO-3714, CO-333, CO-371, CO-2300, CO-2301, CO-374, CO-376, CO-377, CO-343, CO-1740 | Correct for F-6; CO-343 N-8. |
| CO-3720-3725, CO-372, CO-378, CO-1702, CO-334 | Correct; P2-4. |
| CO-383, CO-3726, CO-3727 | Correct. |
| CO-407, CO-409, CO-3719 | Correct; P2-1. |
| CO-415, CO-2309, CO-050, CO-3728, CO-414 | Correct (the H.R.1 overrides are reasoned). |
| CO-1370, CO-1387, CO-3729-3731 | Correct. |
| CO-1373, CO-1601, CO-3733-3738 | Correct as verification; N-2. |
| CO-3739, CO-3740, CO-2003 | Correct. |
| CO-331, CO-332, CO-2339 | Correct (section 8). |
| CO-1394, CO-311, CO-2571 | N-2. |
| CO-007, CO-304, CO-2567 | Correct; N-5 for boarder income. |
| CO-1617 | Correct (4.505.6.E). |

## 6. Cases recomputed (FY 2027) and compared with eval-case

- **CO-116** (sponsored LPR, applied 2026-10-01). The 130% limit for 4 is 3,575. Deemed income: 5,000 − 1,000 − 3,575 = 425; deemed resources: 3,000 − 1,500 = 1,500. Gross 1,325 is at or below 2,660, so the household is ECE. Adjusted income: 1,325 − 180 − 217 = 928. Shelter: 1,116 − 464 = 652. Net 276; ⌈82.8⌉ = 83; 306 − 83 = **223**. The engine gives 425 / 223 / eligible. **Agrees.**
- **CO-115** (homeless father with earnings, 2027-02). Gross 1,000; the child support exclusion and dependent care are disallowed (0). Adjusted: 1,000 − 200 − 217 = 583. No shelter cost. Net 583; ⌈174.9⌉ = 175; 562 − 175 = **387**. The engine gives 0 / 0 / 1000 / 583 / 387 / `expenses_disallowed`. **Agrees.**
- **CO-87** (ABAWD over the limit, 2026-10). Pension 600 × 1/2 = 300; gross 1,800. Adjusted: 1,800 − 300 − 217 = 1,283. Shelter: 1,516 − 641.5 = 874.5, capped at 769. Net 514; ⌈154.2⌉ = 155; 306 − 155 = **151**. The engine gives `limit_reached` / 1800 / 769 / 514 / 151. **Agrees.**
- **CO-94** (sponsor deeming). Sponsor household size 3 (limit 2,960): 3,200 − 640 − 2,960 < 0, so the income after reductions is 0. Resources: (2,600 − 1,500) / 2 = 550 each. The engine agrees arithmetically, but deeming should not apply to these children at all (N-3).

Scratch households (all in `rv-snap/zz*.yaml`, evaluated with a copy of eval-case that loads extra cases):
- ZZ-1: N-2.
- ZZ-2: F-1.
- ZZ-3 and ZZ-3b: F-4.
- ZZ-4: F-6.
- ZZ-5: F-8.
- ZZ-6 and ZZ-7: F-3.
- ZZ-8: F-7.
- ZZ-9 and ZZ-10: N-7.

## 7. Elements

I walked `uses` from the 29 declared SNAP outcomes plus `snap_is_eligible` and `snap_is_work_registrant`. That reaches 480 items, including all 40 new items from CO-3700 to CO-3740. Every identifier resolves except `relationships`, which is the engine's structural input.

New facts are read with `otherwise` defaults, so cases that do not state them still evaluate. Every new parameter has a dated version, and CO-3726 is dated from 2026-10-01 with a reason. Every `statute_override` the fix round added (CO-385, CO-3725) carries its reasoning.

The missing elements are the facts the new P1s need:
- substantial winnings by game share, and the lost-eligibility flag (N-1);
- the transfer finding (N-4);
- boarder payments and costs (N-5);
- income received before the application date (N-6);
- the excluded liquid holdings (N-8);
- the duplicate child and its meals verification (V-13).

## 8. Lump sums, tax refunds and winnings after CO-3367 (coordinator's question)

**Income: correct.**
- CO-2339 subtracts `tax_refunds_and_credits_received` (CO-3365) and `lump_sum_received` (CO-3367). Each is a part of the unearned income facts, and under the new meanings the two are disjoint, so a refund is subtracted once. This matches 4.405.E and 273.9(c)(8): nonrecurring lump sums, refunds and credits are excluded as income.
- No SNAP case states either fact as non-zero, so no expectation moves.

**Winnings: gap.**
- `lottery_gambling_winnings_received` is not part of the unearned income facts (CO-030), and SNAP never reads it.
- Non-substantial winnings are therefore correctly not income: a nonrecurring lump sum, held as a resource.
- The substantial-winnings rule is missing: **N-1**.

**Resources: gap.**
- A refund or EITC still held is counted in `liquid_resources_value` with no 12-month exclusion: **N-8**.

## 9. Open questions in scope

| OQ | Class line | confirmation |
|---|---|---|
| OQ-1 | blocked on a named document | Correct. Sec. 10108 (D-5) has no effective-date clause, and the FNS memo is on www.usda.gov (refused). |
| OQ-12 | state policy choice | Correct (4.206.C.2.a.2). |
| OQ-30 | state policy choice | Correct, and immaterial to the outcomes. |
| OQ-251 | blocked on a named document | Correct (4.407.31.A.1.b is unchanged; the memo is on www.usda.gov). |
| OQ-353 | state policy choice | Correct (4.407.61.A gap from $165.01 to $200). |
| OQ-356 | state policy choice | Correct ("below" versus "at or below"). |
| OQ-371 | state policy choice | Correct (4.502.B.2 "$50 or more" / "$50 or less"). |
| OQ-533 | blocked on a named document | Correct. |
| OQ-612 | state policy choice | Correct for SNAP (no temporary-absence text in D-82 or 273.1). |
| OQ-640 | state policy choice | Correct. 4.000.1 BCE (ECE first) against 4.206.C.1.d and C.2.d (BCE first); no other text reconciles them. |
| OQ-641 | state policy choice | Correct. 4.411.1.B.2.c and 273.11(c)(2)(iii) (D-15) name shelter, dependent care and child support only. |
| OQ-380 (Resolved) | — | Its title says "only the sponsored member waits on it", but no item applies that (N-2). The children's exemption it records is too narrow (N-3). |

New open questions are needed for P2-2 (and P2-4) unless those are fixed in text.
