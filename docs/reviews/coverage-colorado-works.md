# Coverage review: Colorado Works (9 CCR 2503-6)

Reviewer pass: exhaustive coverage matrix, 2026-11-22, on HEAD 5fc915b (branch ccr-9d19bf4c-wmnwcl).

Governing text: 9 CCR 2503-6, rule version 12030, effective 07/01/2025 (D-81; the 3.602.1 and 3.604.3 copy is D-104). On 2026-11-22 the Secretary of State's rule-info page for 9 CCR 2503-6 (ruleId 3145) still listed 07/01/2025 (ruleVersionId 12030) as the **current version**, so D-81 is the text in force. The older Cornell copy (D-61) still backs S406-S528. Most of those excerpts match D-81 apart from punctuation. S416 (the pre-2023 disregard) and S417/S524 (older wording of 3.606.6.C and 3.606.1.G) differ. No item reads S416. P3-1 covers S417 and S524.

Method: I read every section of D-81 that bears on eligibility, the assistance and budgetary units, income, exemptions and disregards, resources, the standards and grant computation, sanctions, the sixty-month limit, diversion, supportive and other payments, changes and redetermination ("transitions"), payments and verification. I mapped each condition-level paragraph to the items that carry it, using the scratch export (`conformance/co/ledger.json`, 1,887 items). For each carried row I read the item's derivation against the text. I probed each suspected wrong answer with scratch households built from CO-86 in a scratch copy, and evaluated them with `scripts/eval-case.ts`. The specs are listed at the end.

## 1. Verdict

**14 P1 found** (CW-1 to CW-14). There are also 13 P2s (CW-15 to CW-27) and 7 P3s.

## 2. Findings

| id | sev | paragraph | item(s) | text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| CW-1 | **P1** | 3.606.8.A.4-5 | cw_eligibility_status CO-921, in_diversion_period_of_ineligibility CO-1269 | "The client shall agree not to receive any further Colorado Works assistance in the county where he or she received the diversion payment or any other county for a period of time to be established by the county ... (POI)". A.5: the county "may grant basic cash assistance ... prior to the end of the POI" when the client cannot sustain the agreement. | CO-1269 is read only by cw_diversion_eligible. A unit inside a diversion period of ineligibility is reported `eligible` for basic cash assistance and paid. **Repro CWZ ZZ-2**: a mother and child, POI true, no income, give `eligible` and $488. The rule gives no basic cash assistance until the POI ends or the county ends it (CO-1269's meaning already says "has not ended early"). | Add a CO-921 branch before the income test, `[in_diversion_period_of_ineligibility (otherwise false)] -> ineligible_diversion_poi`, on the unit. Add a test. |
| CW-2 | **P1** | 3.604.2.N.2.c; 3.601 "Dependent child(ren)" | cw_is_dependent_child CO-901, cw_unit_caretaker_count CO-926, cw_unit_child_count CO-927 | N.2.c: "A minor who is a parent and does not live in the home of a caretaker will receive assistance as an adult if approved." 3.601: a dependent child is "a person who resides with a parent or non-parent caretaker and who is: A. Under eighteen". | CO-901 is age-only. A minor parent living on her own (emancipated, married or county-approved) is counted as a child, so the unit is priced on the No Caretaker row. **Repro ZZ-1**: an emancipated 16-year-old with her baby gets caretaker count 0, child count 2 and grant $362. The rule gives the One Caretaker row with one child: $488. The same flaw reaches cw_is_adult_member (time limit) and cw_unit_has_striking_adult. | CO-901 should require residing with a parent or non-parent caretaker (cw_caretaker_of inverse, in the home). Alternatively, CO-926/927 should count a minor parent who does not live in a caretaker's home as a caretaker (N.2.b-c). Add a test. CO-906's rationale already names N.2.c as not modeled. |
| CW-3 | **P1** | 3.606.6.A, C | cw_months_of_assistance_used CO-915, cw_time_limit_reached CO-918 | A: each month "shall be counted toward the time limits of adult members who are part of the assistance unit". C: "An assistance unit containing an individual who has received Federal TANF assistance ... as an adult for sixty (60) or more cumulative months shall not be eligible". | CO-915 sets the whole stated count to 0 for anyone who is not now the head or the head's spouse. It cites 45 CFR 264.1(b)(1)(i). That federal rule only says which months are not *added*. The supplied count (CO-840, "months ... already counted toward this person's ... limit ... as tracked by" CBMS) already applies it, so zeroing erases months the person accrued earlier as a head. **Repro ZZ-3**: unmarried parents, the non-head father at 60 counted months, no extension. Result: `eligible`, $649. 3.606.6.C makes the unit ineligible. | Read months_of_assistance_received (less Indian Country months) for every adult member. Do not gate it on current headship. Record any remaining federal-versus-State question as an open question with the text. |
| CW-4 | **P1** | 3.601 "Federal Poverty Guidelines"; 3.605.1.A.5.c.5 | cw_sponsor_deeming_applies CO-2364, federal_poverty_guideline_annual_table CO-181 | 3.601: FPL "means the income level for a household as set forth in the Federal Register 86 FR 7732, 7732-7734, as of February 1, 2021. This rule does not contain any later amendments or editions." | CO-2364 compares against the current (2026) guidelines. For a combined household of 4, 125% is $2,760.42 a month under the 2021 guidelines and $3,437.50 under the 2026 guidelines. **Repro ZZ-4**: a sponsor earning $2,900 is exempt from deeming, and the unit is `eligible` at $488. Under the rule's FPL, the $2,725 net is deemed and the unit is ineligible. CWZ-5 ($3,500) shows deeming does work above the 2026 line. No open question records the choice. | Add the 2021 guideline table as a Colorado Works parameter (86 FR 7732 is on govinfo.gov) and read it in CO-2364. If the department means the current guidelines, record an open question with this text instead of the silent substitution. |
| CW-5 | **P1** | 3.605.1.A.4.a; 3.604.2.C.2.g, D.1.d | cw_deemed_parent_income_of_minor_parent CO-909, cw_countable_income CO-910, cw_payment_countable_income CO-923 | A.4: "Income of ... a **non-participant** parent of an unmarried minor parent". D.1.d: "The non-recipient parent(s) of a minor parent". | CO-909 sums every person the minor is a child of, including a parent who requested inclusion and is in the unit (C.2.g). That parent's earnings are then counted twice: as a member (CO-910) and as deemed income. **Repro CWZ-8**: a 16-year-old mother, her baby and her own mother (requested, $500 wages). Countable $567 against need $421 gives `ineligible_income`. The rule counts only $410 (< $421): eligible, grant $620. | Filter CO-909's parents to those not in cw_assistance_unit_members. |
| CW-6 | **P1** | 3.605.1.A.4.a-b | cw_deemed_parent_income_of_minor_parent CO-909 | "The countable income of a non-participant parent(s) of an unmarried minor parent **who is living in the same home** as the minor parent, shall also be deemed". b: "Income of parents living in the same home". | CO-909 does not test lives_with. A parent living elsewhere has income deemed. **Repro CWZ-7**: a minor mother in a county-approved setting (dwelling h1) and her mother in h2 with $3,000 wages. Result: deemed $2,657, `ineligible_income`. The rule deems nothing: eligible, $488. | Add `[otherwise, [in_group, [P], lives_with], true]` (with the CW absence rule) to the parent filter, as CO-906 already reads it. |
| CW-7 | **P1** | 3.604.2.N.1, N.2.a | cw_minor_parent_living_arrangement_met CO-906, cw_eligibility_status CO-921 | N.1: "grant payments may not be approved unless the minor parent resides with **another adult caretaker** or ... another setting which the county has determined is an appropriate setting". N.2.a: "unless the minor is emancipated, has a marital status other than single, or **resides with an adult relative**." | CO-906 accepts only her own parent, emancipation, marriage or county approval. **Repro CWZ-18**: an unmarried 16-year-old mother living with her grandmother (grandparent and primary responsibility, same dwelling), no county approval. p1 gets `ineligible_living_arrangement` and $0. Her baby p2 reads `eligible` and $362, so the unit splits. The rule is met (adult relative and caretaker), and the unit is eligible. | Add to CO-906's disjunction: lives with an adult relative (grandparent, other_relative, legal_guardian or has_primary_responsibility_for, age 18 or over, in the home). Make the living-arrangement failure a unit result so a child's grant is not paid while the unit is barred. |
| CW-8 | **P1** | 3.609.2.A.1 a-e, D | cw_grant_amount CO-914 | "The initial payment to eligible clients shall include assistance beginning with the date of application ... To calculate partial month payments: ... multiply the authorized grant amount for the entire month by such decimal figure ... unless the authorized grant for the partial month is less than $10, in which case no payment is made." | The application month is paid in full. Nothing reads cw_application_date for the payment, and no proration is recorded as out of scope (SNAP and Adult Financial both prorate). **Repro CWZ-11**: an application on 2026-10-12 with no income gives $488 for October. The rule gives 20 days × .65754 × $488 = $320. Household case CO-86 expects $384 for its application month (rule: $252). | Add the table (parameter) and a prorated initial-month payment item, with the $10 and $1 floors of A.1.e. Change the CO-86 expectation, or state the month. |
| CW-9 | **P1** | 3.605.3.A.14; 3.605.2.A, F, G; 3.605.1.A.5 | cw_countable_unearned_income CO-908, cw_gross_earned_income CO-1716 | A.14 "Gifts or prizes" are countable unearned income. 3.605.2.G: "In-kind income received in exchange for employment is employment income". F: donated in-kind earned income is countable. | Three countable sources have facts that Colorado Works never reads, or have no fact at all. (a) lottery_gambling_winnings_received (CO-1181, "not part of the unearned income facts"). **Repro CWZ-9**: a $2,000 prize gives countable income 0, `eligible`, $488. (b) money_received_from_sponsor (CO-3707, "not also stated in the person's other unearned income facts") is a gift when sponsor deeming does not apply. (c) No fact carries in-kind earned compensation (shelter or goods in lieu of wages); wages_gross is cash pay only. | Read CO-1181 in CO-908/CO-2554 and CO-3707 when cw_sponsor_deeming_applies is false. Add a neutral in-kind-earnings value fact read in CO-1716. |
| CW-10 | **P1** | 3.605.2.E.4.c-e | cw_gross_earned_income CO-1716 | "Room and board payments shall be considered earned income in the month received to the extent that the payment for room and board exceeds the Food Assistance allotment for a one-person household per room and boarder and other documented expenses". c and d state the board-only and room-only rules. | room_and_board_payments_received (CO-4161) is "not part of the wages, self-employment or unearned income facts" and only SNAP reads it. **Repro CWZ-10**: $1,500 from two boarders gives countable 0, `eligible`, $488. The rule counts $1,500 − 2 × $306 (the FY2027 one-person maximum allotment) = $888 as earned income, so the unit is ineligible. | Add cw_boarder_income from CO-4161, CO-4162 (payers), CO-4163 (costs) and the SNAP one-person maximum allotment. Read it in CO-1716. |
| CW-11 | **P1** | 3.605.1.A.3.c-d | (none) | "If the client refuses to make a reasonable effort to secure potential income, such income must be considered as if available." | No item. Adult Financial counts refused potential income (af_refused_potential_income CO-3861, the FC-9 fix). Colorado Works has no counterpart and records no reason. | Add cw_refused_potential_income (supplied, money) and count it in CO-908/CO-2554. |
| CW-12 | **P1** | 3.604.3.K (last paragraph), 3.604.3.I.3 | cw_assistance_unit_members_for_size CO-2351, cw_grant_amount CO-914, cw_verification_status CO-1427 | "Individuals unable to provide this verification will not receive payment for themselves and their income will be used to determine eligibility for the household." | CO-1427 reports `members_excluded` once status or SSN verification is past the thirty days, and says "the members concerned receive no payment". CO-2351 does not read the pending status count, so the grant still counts those members in the unit's size. The two outcomes disagree. The derivation shows it (CO-2351's filter reads only CO-928, CO-3802 and the out-of-State date). | Leave out of CO-2351 a member with cw_person_pending_status_verification_count > 0 past cw_status_verification_due_date, and keep the income counted as CO-910 already does for status-disqualified members. |
| CW-13 | **P1** | 3.607.5 (4th para.); 3.609.2.J.3-4; 3.604.2.N.1.b | cw_eligibility_status CO-921 | 3.607.5: "If a client does not participate in the Workforce Development program prior to signing the first Individualized Plan, this shall be considered Demonstrable Evidence ... and will result in the closure of the grant payment." J.3: "If misuse continues, the county department shall deny or discontinue the cash benefit for one month." N.1.b: "Failure to participate without good cause will result in the termination or discontinuation of Colorado Works basic cash assistance." | There are three closures with no item and no recorded reason. The fourth-level sanction closure is modeled (CO-1264). These three are not. | Add one supplied fact per closure (demonstrable-evidence closure in effect, EBT-misuse denial month, minor-parent education non-participation without good cause) and CO-921 branches. Otherwise record each as out of scope with a reason. |
| CW-14 | **P1** | 3.605.3.A.2, A.5, A.6, B.4; 3.605.4.B.28-30, B.33 | cw_countable_unearned_income CO-908, cw_excluded_unearned_income CO-2341 | A.2: rental income "is countable to the extent it exceeds allowable expenses ... maintenance, taxes, management fees, interest on mortgage, and utilities". A.5: life insurance proceeds "to the extent that they exceed the amount expended ... for ... last illness and burial". A.6: health insurance or injury proceeds "to the extent that they exceed the amount ... for medical care". B.4: workers' compensation "amounts ... for medical, legal, or related expenses ... are deducted". B.28 refugee resettlement funds, B.29 Interim Cash Payment and B.30 life insurance cash value taken are exempt. B.33: a lump sum "excluded if designated or legally obligated for legal fees ..., medical bills, funeral and burial expenses, or income taxes". | The supplied unearned facts are gross (R-1), and CW subtracts none of these expenses. None of B.28-B.30 is in CO-2341: federally_excluded_payments_received (CO-3366) lists federal-statute exclusions, not R&P money or the CRSP Interim Cash Payment. So gross rent, gross insurance proceeds and refugee resettlement cash are counted against the need standard. | Add neutral expense facts (rental expenses, insurance proceeds spent on last illness, burial or medical costs, workers' compensation award expenses, lump-sum designated amounts) and receipt facts for B.28-B.30. Subtract them in CO-2341. Or record a per-item reason. |
| CW-15 | P2 | 3.602.1.K.1.c vs 3.602.1.I.2, 3.604.3.A.2 | cw_verification_response_days CO-1351 | K.1.c: denial when the client does not supply information "within ten (10) calendar days of the request". I.2 and 3.604.3.A.2 say eleven. | The volume uses 11 without recording the conflict. | Record a state policy choice. |
| CW-16 | P2 | 3.605.1.A.1 | CO-908, CO-1716 | "all countable gross income received in the month prior to, if available, and in the month of application shall be used to determine eligibility". | Only the determination month is read. The prior month's income is never considered, and no reason is recorded (other programs have `*_prior_thirty_days` facts). | Record a reading (open question), or read the prior month at application. |
| CW-17 | P2 | 3.606.3.A.2, C | CO-914, CO-922, CO-2553 | "If the assistance unit will receive a decrease in grant payments, the grant payment amount will remain the same until redetermination". | Mid-certification months are out of the model only by CO-2553's precision ("the codex determines at application or redetermination"). Yet CO-922 models mid-period new sources, and a reduced grant is computed for a recipient month. No scope note in docs/colorado-notes.md. | Record the scope (application and redetermination only) in the chapter notes, or add the base-grant hold. |
| CW-18 | P2 | 3.604.2.H | cw_assistance_unit_members CO-900 | The caretaker hierarchy: parent; relative within the fifth degree or guardian; then another person. | "Not modeled" in CO-900's precision, with no reason or open question. | Record it as an open question or a stated limit with a reason. |
| CW-19 | P2 | 3.606.7.F.2.c (last sentence) | cw_death_reimbursement_amount CO-1508 | "Money voluntarily contributed by the responsible party ... is also used to reduce the Death Reimbursement Benefit." | Not modeled (precision), with no reason. | Add a contribution fact, or record the reason. |
| CW-20 | P2 | 3.605.1.A.4.a | CO-909, CO-2353 | "minus the **maintenance or child support** paid to others outside the assistance unit". | Only child_support_paid_legally_obligated is deducted. Spousal maintenance paid is not. | Add the maintenance-paid fact, or state the limit. |
| CW-21 | P2 | 3.604.2.J | CO-921 | "Members of an Indian Tribe not eligible for assistance under a Tribal Family Assistance Plan are eligible for Colorado Works." | No fact for tribal TANF eligibility. The negative implication (a member eligible under a tribal plan is served by the tribe) is not recorded. | Record a reading. |
| CW-22 | P2 | 3.605.4.B.6, B.9; 3.605.3.B.9 | CO-2341 | EHAP payments; "Assistance from other agencies ... for items not included in the need standard"; the lump-sum SMIB refund "is exempt income". | No fact, so these are counted when stated in the unearned facts. | Add facts or record. |
| CW-23 | P2 | 3.605.4 (CW's own grant), 3.609.2.G.3.c.5 | CO-908, retroactive_ssi_or_public_assistance_lump_sum_received CO-3920 | Retroactive underpayment corrections of Colorado Works. | CO-3920 is part of lump_sum_received, which is part of other_unearned_income. Colorado Works therefore counts a retroactive Colorado Works payment as unearned income, although CO-908 says "the unit's own Colorado Works grant is not income to it". | Subtract the CW share of CO-3920 in CO-2341 (needs a CW-specific split), or record it. |
| CW-24 | P2 | 3.609.2.C.1-2 | CO-921 | "A client's eligibility shall end on the date of his or her death." | CO-921 does not read date_of_death. | Add a branch, or state that a decedent is not determined. |
| CW-25 | P2 | 3.604.3.B.2.c | cw_ssn_verification_is_pending CO-1647 | "Proof of application is only valid for up to eight (8) months without good cause." | No item ages a proof of SSN application. | Add the eight-month limit, or record. |
| CW-26 | P2 | 3.604.1.D-E, 3.604.2.O.1 | cw_person_participation_status CO-2561 | A member barred as an inmate or institution patient, or out of State more than ninety days. | CO-2351 removes the member from the size, but CO-2561 reports `eligible_member` (it reads only CO-928, status and SSN). | Add an `ineligible_member_institution_or_absence` option. |
| CW-27 | P2 | 3.606.8.A.4 | cw_diversion_payment CO-2560 | The POI "shall not be longer than the equivalent maximum grant payment for the household size over the same period of time". | The bound is left to the county (CO-1270 precision) and the POI is supplied. Acceptable, but no open question records that the codex does not check the bound. | Record it in OQ-252. |
| P3-1 | P3 | 3.606.6.C, 3.606.1.G | CO-918, CO-921, CO-914, CO-1260 | — | They still cite S417 and S524 (the superseded Cornell wording "unless granted an extension ... due to hardship or domestic violence"; "Upon verification of pregnancy"). The current text is in S1021, and D-81 3.606.1.G has no "Upon verification". | Requote S417 and S524 from D-81. |
| P3-2 | P3 | — | OQ-700 | — | It cites "3.605.6", which does not exist in D-81 (3.605 ends at 3.605.5). The attendant clause is 3.605.4.A.5 itself (and 3.605.2.D.3). | Correct the citation. |
| P3-3 | P3 | 3.605.1.A.4.a | CO-909 | — | The precision says the support paid outside and the tax-dependent payments are "not modeled this batch", but the derivation now subtracts both. | Update the precision. |
| P3-4 | P3 | 3.607.1.A.1 | cw_is_work_eligible_individual CO-919 | "An adult, minor child head-of-household, or **spouse of a minor child head-of-household**". | The item omits the minor spouse of a minor head (informational item). | Add the disjunct. |
| P3-5 | P3 | — | OQ-104 | — | The body names cw_meets_work_participation as CO-919; it is CO-920. | Correct. |
| P3-6 | P3 | — | CO-926 | — | The precision says CO-900 "only builds a single caretaker/dependent-child parent pair". CO-900 now reaches optional members. | Update. |
| P3-7 | P3 | 3.605.4.B.24 | cw_student_earnings_are_disregarded CO-3385, S1621, OQ-613 | — | They cite "3.605.4.A.24". In D-81 the student-income paragraph is **B**.24 (A ends at A.8). | Correct the citations. |

## 3. Coverage matrix

Legend: **C** = carried by (and checked); **N/A** = not applicable (reason); **OQ** = open question; **GAP** = no item, no recorded reason (finding id). "Checked" means the derivation was read against the paragraph; mismatches are findings.

### 3.600-3.600.5 Program administration
| ¶ | disposition |
|---|---|
| 3.600.1 Performance contract; 3.600.2 county policies; 3.600.3/31/32 contracting; 3.600.4 pilots; 3.600.5 review and oversight | N/A: county and State administration, no eligibility or benefit effect |

### 3.601 Definitions (those used elsewhere)
| ¶ | disposition |
|---|---|
| Assessed need | N/A: supportive payments out of scope (FC-20, notes) |
| Assistance unit | C: cw_assistance_unit_members CO-900 |
| Basic cash assistance | C: cw_grant_amount CO-914 |
| Budgetary unit | C: cw_budgetary_unit_members CO-2352 (S1626) |
| Caretaker; Responsibility | C: cw_caretaker_of CO-2608 |
| Certification period | C: cw_in_first_certification_period CO-1501 |
| Countable income; Exempt income | C: CO-910, CO-923, CO-2340, CO-2341 |
| Dependent child(ren) A-B | C: cw_is_dependent_child CO-901, CO-270, CO-271, CO-1720; a minor parent not in a caretaker's home is counted as an adult: carried by cw_minor_parent_is_assisted_as_adult CO-4352 in CO-926, CO-927, CO-924, CO-916, CO-3808 (CW-2 fixed) |
| Disqualified person; Program prohibitions A-E | C: cw_is_disqualified_member CO-928 (A, D via cw_is_serving_ipv_disqualification CO-1730; B is_fleeing_felon; C via CO-4005; E CO-2348) |
| Diversion | C: cw_diversion_eligible CO-1270, cw_diversion_payment CO-2560 |
| Domestic violence; survivor; FVO trained worker | C (as the extension input): has_domestic_violence_extension_approved CO-846; the rest N/A, county process |
| Earned income; Unearned income; Income; In-kind | C: CO-1716, CO-908; in-kind earned carried by in_kind_earned_compensation_value CO-4360 in CO-1716 (CW-9 fixed) |
| Eligible client ("countable income is below the grant standard") | C: implied by CO-913 (the need standard is below the grant standard in every chart cell, so the need test governs) |
| Excluded person | C: cw_is_excluded_from_assistance_unit CO-2350 |
| Federal Poverty Guidelines (86 FR 7732, 2021, no later editions) | C: cw_poverty_guideline_annual_table CO-4350, CO-4351 (D-295, 86 FR 7732) in CO-2364 (CW-4 fixed) |
| Fleeing felon | C: is_fleeing_felon CO-038 via CO-928 |
| Good cause | C as supplied county findings (CO-3810, CO-2370, extension facts); N/A otherwise (county judgment) |
| Grant standard | C: cw_grant_standard CO-912 |
| Minor | C: cw_minor_parent_age_limit CO-272 |
| Parent (includes an expectant parent) | C: CO-921 pregnancy branch (S1806), CO-2383 |
| Potential income | C: cw_refused_potential_income CO-4362 in CO-908, CO-2554 (CW-11 fixed) |
| Qualified non-citizen | C: CO-905 / CO-4005 |
| Questionable | C: household_composition_attestation_is_questionable (CO-1421) |
| Received (income; verification) | N/A: timing conventions, read through month facts |
| Redetermination | C: cw_determination_is_redetermination CO-2375 |
| Sanction | C: CO-1264, CO-1265 (S761) |
| Self-employment (not S-Corps or LLCs) | C: CO-1700, CO-1706 (the S-Corp/LLC carve-out is a supplied-fact convention) |
| Sponsor | C: sponsors CO-2713, is_sponsored_non_citizen CO-1573 |
| Supportive payment | N/A: out of scope (FC-20) |
| Timely/adequate notice; ADH; ALJ; claim; overpayment; fraud; IPV; liable individual; recovery; willful; withdrawal and similar | N/A: notice, hearing and recovery procedure |
| Verification; verified upon receipt; collateral contact; produce; prudent person | C: the verification items (see 3.604.3); otherwise N/A procedure |
| Exceptional disengagement | C: via the supplied sanction level CO-1261 (3.608.3.H) |
| Workforce Development; demonstrable evidence | C: CO-919 (informational); demonstrable-evidence closure carried by cw_county_closure_type CO-4353 in CO-921 (CW-13 fixed) |

### 3.602 Applications
| ¶ | disposition |
|---|---|
| 3.602.1.A, A.1-5 | N/A: application access and county procedure |
| B administrative review | N/A: notice and appeal |
| C-D information, release, special situations D.1-4 | N/A: procedure (D.2-3 assign the processing county) |
| E.1.a-e receiving applications; interview notice; missed interview gives denial (E.1.c.3) | N/A: procedural denial, no eligibility criterion |
| E.2.a-k explanations, IEVS notice, EBT locations | N/A: notice |
| E.3-5 | N/A |
| E.6 "applications ... can only be made by a caretaker with whom a dependent child(ren) is living" | C: CO-921 first branch (no dependent child and no pregnancy) |
| F.1-2 minimum application | N/A |
| F.3 application date | C: cw_application_date CO-2372 (verification); payment proration carried by cw_partial_month_payment_factor CO-4358 in CO-914 (CW-8 fixed) |
| G-H information sharing, confidentiality | N/A |
| I processing standard (45 days) | N/A: county timeliness |
| I.1 application for all programs | N/A |
| I.2 eleven days; good cause to the 20th day | C: CO-1426, CO-1351, CO-2370, CO-2371 (checked: the later of the two dates) |
| I.3.a-d application valid 30 days after denial | N/A: application-date procedure |
| I.4 one interview | N/A |
| J immunization information | N/A |
| K.1.a-e denial reasons; K.1.c ten days | N/A as procedural denials; the 10-vs-11 conflict is OQ-770 (CW-15) |
| K.2 withdrawal | N/A |
| 3.602.2 voter registration | N/A |

### 3.603 Case file maintenance
| ¶ | disposition |
|---|---|
| 3.603.1 (all) | N/A: record keeping |

### 3.604.1 Eligibility criteria
| ¶ | disposition |
|---|---|
| A residency | C: cw_meets_residency CO-904 (is_colorado_resident) |
| A.1-2 no durational requirement; residence kept until abandoned | C: CO-904 precision (read from state_of_residence) |
| A.3 TANF from another state that month | C: received_tanf_from_another_state_this_month CO-842 in CO-904 |
| B.1 citizen | C: CO-905/CO-4005 |
| B.2 qualified, entered before 8/22/1996 | C: CO-905, CO-279 |
| B.3 five years, or the 1613(b) exceptions | C: CO-905 (statute_override for parolees and special immigrants) |
| C member of a unit meeting income and verification; noncustodial parents get services only | C: CO-913, CO-1427; the noncustodial-parent part is N/A (services) |
| D institution patient (TB or mental disease; the under-21 exception) | C: cw_is_institution_patient_or_inmate CO-3802 (checked) |
| E inmate (work release and court monitoring excepted) | C: CO-3802, CO-3801 |
| F.1-4 temporary residents and non-citizen situations | C: CO-905 (not qualified, so ineligible) |

### 3.604.2 Household composition
| ¶ | disposition |
|---|---|
| A, A.1 unit lives together | C: CO-900 (lives_with, CO-3354) |
| A.1 separate units for persons not required together | C: CO-900 closure (only required and requesting persons cross) |
| A.2 budgetary unit | C: CO-2352 |
| A.3 client must provide composition information | C: CO-1421/CO-1648 |
| B funding source (MOE or block grant) | N/A: financing |
| C.1.a dependent children in a caretaker's home | C: CO-900, CO-2608 |
| C.1.b parents (minor-parent exception; custody with another caretaker) | C: CO-900 (edge rule), CO-2347 |
| C.1.c siblings legally in the caretaker's care | C: CO-900 via the shared caretaker |
| C.1.d half siblings without child support | C: CO-900; CO-2842 for the support case |
| C.1.e spouse of a pregnant parent | C: CO-900 spouse edge (is_pregnant) |
| C.2.a-g optional members, included on request | C: CO-2349, CO-2346, CO-2347, CO-2558, CO-2842 (checked) |
| C.3.a-b SSI; Title IV recipients excluded | C: CO-2350, CO-841 |
| D.1.a-e budgetary unit members | C: CO-2352 (a-b); c N/A (an unborn child has no income); d via CO-909 (non-participant parents in the same home only, CW-5 and CW-6 fixed); e via CO-2365 |
| D.2.a-b excluded from the budgetary unit | C: CO-2352 (the stepparent is kept under D.1.b, as A.4 requires) |
| E.1-4 child in the home despite absence | C: cw_is_considered_living_in_home CO-3354 |
| F school attendance for school-aged children | N/A: the county works with the family to enroll; no eligibility consequence stated (verification under C.4) |
| G.1-3 absences over 45 days (medical or education; parenting-plan visit up to 6 months; voluntary foster care up to 3 months) | C: CO-3354, CO-3356, CO-3357; other reasons **OQ-611** |
| H caretaker hierarchy | CW-18 (P2): deferred, reason recorded in docs/colorado-notes.md (coverage fix round) |
| I.1-3 caretaker absent (active duty; medical; under 45 days with intent) | C: CO-3354, CO-3355 |
| J Indian tribe / TFAP | OQ-772 (CW-21) |
| K refugees exempt from the bar; CRSP referral | C: CO-905 (exemption); referral N/A |
| L.1 fugitives or fleeing felons | C: CO-928 |
| L.2 strike | C: cw_unit_has_striking_adult CO-3808 (spot-checked, CWZ-12) |
| L.3 five-year bar | C: CO-905 |
| M (intro) removed from size; income without disregards; month counts toward own 60 | C: CO-2351, CO-910/CO-923, CO-915 (the A.6 reading resolved in OQ-490) |
| M.1 two-state misrepresentation, 10 years | C: through cw_is_serving_ipv_disqualification CO-1730 (supplied period) |
| M.2 IPV 12/24/lifetime | C: CO-1730 |
| M.3 fleeing felon | C: CO-928 |
| M.4 SSN not applied for | C: CO-2348, CO-2557 |
| M.6 non-qualified non-citizens, or failure to prove status | C: CO-2557, CO-4005; proof failure carried by CO-4372 in CO-2351 and CO-2561 (CW-12 fixed) |
| N (intro) minor parent may apply | C |
| N.1 unmarried non-emancipated minor: another adult caretaker or county setting | C: CO-906, now with another adult caretaker or an adult relative in the home; a failure bars the unit in CO-921 (CW-7 fixed) |
| N.1.a county assists | N/A |
| N.1.b education participation within 60 days; failure ends BCA | C: cw_county_closure_type CO-4353 (minor_parent_education_nonparticipation) in CO-921 (CW-13 fixed) |
| N.2.a not with a caretaker: county setting unless emancipated, married or with an adult relative | C: CO-906 (adult relative accepted, CW-7 fixed) |
| N.2.b emancipated or married minor not in a caretaker's home | C: CO-906 (emancipated or married passes); unit composition partly CO-900 |
| N.2.c assistance as an adult | C: cw_minor_parent_is_assisted_as_adult CO-4352 (CW-2 fixed) |
| N.3.a-b unrelated caretaker, member or not | C in part: CO-906 county_approved_living_arrangement CO-845 (b's county option is a supplied fact) |
| N.3.c living with own parent needs no approval | C: CO-906 |
| N.3.d minor parent as a child of a caretaker | C: CO-900 (the edge is crossed when not requesting for her own child) |
| O.1 out of State up to 90 days | C: CO-904, CO-2351, CO-3806, CO-3807 |
| O.2 institution resident (30 days; exceptions) | C: CO-3804, CO-3805, CO-3354, CO-3803; last words **OQ-660** |

### 3.604.3 Program verifications (D-81 and D-104)
| ¶ | disposition |
|---|---|
| A (intro) no documents before a signed application; collateral substitute | N/A: procedure |
| A.1-3 request contents; due eleven days from the written request | C: CO-1426, CO-1351, CO-2381 / CO-1343 |
| A "Verification is an eligibility requirement" | C: CO-1427 (separate outcome; past_due) |
| B.1 IEVS reviewed; not delayed if other evidence | C: CO-1318, CO-1361 |
| B.2.a lawful presence | C: CO-1420, CO-1644 |
| B.2.b citizenship or qualified status | C: CO-1645, CO-1646 |
| B.2.c SSN or proof of application; only the person ineligible | C: CO-1647, CO-2348 (person-level); 8-month validity CW-25 (P2): deferred, reason recorded in docs/colorado-notes.md |
| B.2.c.1-2 SSN by the next recertification | C: CO-1647 with CO-2375 (S1630) |
| B.2.c.3-4 SOLQ | C: ssn_verified_by_electronic_data_source (in CO-1647) |
| B.2.d caretaker responsibility unless parent | C: CO-1421, CO-1648 |
| B.2.e income of every member whose income is used | C: CO-1649, CO-2588, CO-3879-CO-3881, CO-1425 (FC-12 spot-checked) |
| B.2.f residency | C: CO-1651 (adult members) |
| B.3 questionable or inconsistent | C: CO-1421 (questionable relationship); else N/A county discretion |
| B.4 extension beyond 45 days | C: CO-2373 in CO-1426 |
| B.5 SAVE without delaying assistance | C: CO-1646, CO-1366 |
| C.1 relationship | C: CO-1421 (questionable) |
| C.2, C.3, C.5, C.6 good cause, child support, work participation, absences | N/A: discretionary "may include"; the findings are supplied facts |
| C.4 school attendance | C: CO-1422/CO-1652 (18-year-olds whose status rests on school); younger children N/A (discretionary) |
| C.7 pregnancy when no children | C: CO-1423, CO-1653 (S1807) |
| D-F sources, collateral contacts, follow-up | N/A: procedure |
| G prudent person; lawful presence over 18 not waivable; newborn SSN | C: CO-1420 (not waivable); the rest N/A |
| H.1 IEVS; a: SSA and UIB verified on entry; b: DOLE wages not verified | C: CO-1318, CO-1563, CO-1649 (earned income reads documents only) |
| H.1.c-d notice and processing within 45 days | N/A |
| H.2 PARIS | N/A: interface procedure (other-State receipt is CO-842) |
| H.3.a-c SAVE sponsor, number and status changes | C: CO-1654 (sponsor); the rest N/A |
| H.4 DMV for lawful presence and identity | C: CO-1367 (OQ-376, CW part resolved) |
| I.1 citizenship documents; DOR Rule 5 Appendices A-B | C: CO-1306, CO-1657, CO-1645 |
| I.2 questionable citizenship guidelines | N/A: worker guidance |
| I.3 ineligible until proof | C: CO-1427 `members_excluded`; payment effect carried by cw_is_excluded_for_unprovided_status_verification CO-4372 in CO-2351 and CO-2561 (CW-12 fixed) |
| I.4 18 and over establish lawful presence; a.1.a-e documents | C: CO-1420, CO-1352, CO-1367, CO-1302 |
| I.4.b.1-4 non-cash and emergency exceptions | N/A: not Colorado Works cash |
| I.4.b.5 pregnant women; b.6 18-year-olds on medical assistance | C: CO-1420, CO-2435 (S1065) |
| I.5-6 immigrant documents; SAVE without delay | C: CO-1309, CO-1366, CO-1646 |
| J.1 sponsor income information | C: CO-1654, CO-1574, CO-1062 |
| K thirty days for status, identity, SSN | C: CO-1598, CO-1655, CO-1656 |
| K (2nd para.) verification at application and redetermination | C: CO-2375 |
| K (last para.) no payment for them; income used | C: CO-4372 in CO-2351 (out of the size), CO-910 and CO-923 (income counted) (CW-12 fixed) |

### 3.604.4 Child support services
| ¶ | disposition |
|---|---|
| A assignment; refusal to sign precludes the unit; non-cooperation without good cause ends BCA | C: CO-3809, CO-3810, CO-3811 (spot-checked, CWZ-13) |
| A (2nd para.) assignment effect and period | N/A: child support administration |
| A.1.a-g, A.2-4 good-cause claims and review | C: CO-3810's meaning (a valid good cause is not a failure); the procedure is N/A |
| B BCA is unreimbursed public assistance (UPA) | N/A: child support accounting |
| C reinstatement in the month when support is not received | N/A: re-application timing; the income of the current month is what the model reads |

### 3.604.5 Family Violence Option
| ¶ | disposition |
|---|---|
| A.1.a waive work activities | N/A: work participation is not an eligibility condition (CO-920 informational) |
| A.1.b time clock advances; an allowable extension reason | C: CO-846, CO-925 (S522) |
| A.1.c child support services waiver | C: CO-3810's meaning |
| A.2, B.1-4, C.1-3 county policies, training, screening, documentation, appeal | N/A: county process |

### 3.605.1 Income
| ¶ | disposition |
|---|---|
| A countable gross income of the assistance and budgetary units | C: CO-910, CO-923 |
| A.1 month prior and month of application | C in part (month of application); the prior month is OQ-771 (CW-16) |
| A.2 availability | N/A: read through month facts |
| A.3, a-d potential income | C: cw_refused_potential_income CO-4362 (CW-11 fixed) |
| A.4.a stepparent and non-participant parent deeming formula | C: CO-2353 (stepparent; OQ-102 needs), CO-909, CO-2000 (OQ-102); non-participant parents in the same home only (CW-5, CW-6 fixed); maintenance paid carried by spousal_maintenance_paid CO-4354 in CO-909 and CO-2353 (CW-20 fixed) |
| A.4.b parents in the same home attributed | C: CO-909 (lives_with and the absence rule, CW-6 fixed) |
| A.5.a presumption; sponsor and spouse net income deemed | C: CO-2365 |
| A.5.b net income (20% or $175; support paid; plus unearned); rebuttal | C: CO-2365, CO-2367, CO-2368, CO-2359, CO-2361 (checked: the lesser of 20% and $175 per earner) |
| A.5.c.1 non-LPR qualified | C: CO-2364 (LPR required) |
| A.5.c.2 adjusted from refugee or asylee | C: CO-2364, CO-2700 |
| A.5.c.3 signed before 12/19/1997 | C: CO-1573's meaning (only I-864 on or after 12/19/1997 is true) |
| A.5.c.4 battery or extreme cruelty | C: CO-2363 |
| A.5.c.5 combined income under 125% FPG | C: CO-2364, CO-2360, CO-2366, CO-4350, CO-4351 (the 2021 edition, CW-4 fixed) |
| A.5.c.6 40 quarters | C: CO-3033, qualifying_quarters |
| A.5.c.7 non-I-864 affidavit, or a classification without I-864 | C: CO-1573's meaning |
| A.5.d recovery from sponsor | N/A: recovery |
| A.6 net income of status, SSN or C-excluded members deemed | C: CO-2557, CO-910, CO-923 (OQ-490 resolved) |
| B income received or expected in the month | C: month facts |

### 3.605.2 Earned income
| ¶ | disposition |
|---|---|
| A earned in-kind | C: in_kind_earned_compensation_value CO-4360 in CO-1716 (CW-9 fixed) |
| B.1-2 diverted or garnished wages still earned; paid-when-paid | C: wages_gross is gross before amounts withheld (CO-023) |
| C short-term (90 days or less) and subsidized employment | C: CO-2340, CO-3817-CO-3819 (FC-2) |
| D.1-2 countable against the need standard; net after disregards | C: CO-907, CO-922 |
| D.3 HCA payment is earned income to the care provider | C: OQ-700 assumption (the attendant's pay is employment income stated in wages) |
| D.4 earnings of a dependent child not in school counted | C: CO-3385 (inverse) |
| E.1.a.1-4 cost of doing business; no depreciation, capital principal or personal costs | C: CO-1705, CO-3370-CO-3373 |
| E.1.b day care provider $55 and $22, or higher documented costs | C: CO-1705, CO-3376, CO-3377, CO-3375 (checked) |
| E.1.c net profit treated as earned | C: CO-1706 → CO-1716 |
| E.1.d ledger as verification | N/A |
| E.2 regular receipt counted in the month | C |
| E.3 irregular, averaged over 12 months | C: CO-1706 precision (stated averaged) |
| E.4.a farm | C: self-employment facts |
| E.4.b rental income as self-employment only if 20 hours a week managed | C: the fact convention (other_unearned_income_taxable is "property the person does not actively manage") |
| E.4.c-e board, room, room and board | C: cw_boarder_income CO-4361 in CO-1716 (E.4.e; room-only rent is in the unearned facts, see CO-4361 precision) (CW-10 fixed) |
| F.1-3 donated in-kind earned income | C: CO-4360 (the going rate for donated services) (CW-9 fixed) |
| G in-kind for employment | C: CO-4360 (CW-9 fixed) |

### 3.605.3 Countable unearned income
| ¶ | disposition |
|---|---|
| intro; A (intro) | C: CO-908 |
| A.1 VA compensation and pension | C: other_unearned_income_nontaxable |
| A.2 rental income net of expenses | C: rental_property_expenses_paid CO-4364 in cw_unearned_income_deductions CO-4369 (CW-14 fixed) |
| A.3 spousal maintenance | C: other_unearned facts |
| A.4 VA educational assistance beyond school expenses | C: CO-2341 exempts all educational assistance (B.26 exempts educational grants, loans, stipends and scholarships); consistent with B.26 |
| A.5 life insurance proceeds beyond last illness and burial | C: lump_sum_amounts_spent_or_designated CO-4365 in CO-4369 (CW-14 fixed) |
| A.6 health insurance or injury proceeds beyond medical | C: CO-4365 in CO-4369 (CW-14 fixed) |
| A.7 strike benefits | C: other_unearned (and the strike bar CO-3808) |
| A.8 jointly owned property income | C: stated share |
| A.9-10 lease bonuses and royalties | C: other_unearned_income_taxable |
| A.11 stepparent and sponsor attributable income | C: CO-2353, CO-2365 |
| A.12 garnished unearned income | C: gross facts |
| A.13 loans or inheritances | C: lump_sum_received is part of other_unearned; bona fide loans exempt (CO-3362) |
| A.14 gifts or prizes | C for gifts in other_unearned; lottery and gambling prizes (CO-1181 in CO-908, CO-2554) and sponsor cash when deeming does not apply (cw_sponsor_contributions_counted CO-4363 in CO-910, CO-923) (CW-9 fixed) |
| A.15-20 dividends and interest, annuities and pensions, disability or survivor, workers' compensation, UI, Social Security | C: CO-908 components |
| B.1-8 periodic payments | C: CO-908 components; B.4 medical and legal deductions carried by workers_compensation_award_expenses CO-4366 in CO-4369 (CW-14 fixed); B.5 VA dependent portion counted to the dependent (fact convention) |
| B.9 SMIB; lump-sum refund exempt | C (award gross); refund carried by medicare_premium_refund_received CO-4370 in CO-4369 (CW-22) |
| B.10 military allotment | C as unearned; the non-recipient's excess-over-need computation N/A (rare); not separately modeled |

### 3.605.4 Exempt income
| ¶ | disposition |
|---|---|
| A (intro) | C: CO-2341 (S1621) |
| A.1 income tax refunds; a. EITC this and next month; b. county help | C: tax_refunds_and_credits_received CO-3365; b N/A |
| A.2 third-party payments for medical care or services | N/A: vendor payments are not income (3.601 "Income") |
| A.3 one-time emergency assistance | C: CO-3812 |
| A.4 home energy assistance | C: CO-3364 |
| A.5 personal care and home care allowances | C: CO-3824 (**OQ-700**) |
| A.6 VA Aid and Attendance used for uncovered care | C: CO-3823 |
| A.7 county General Assistance | C: CO-3812 (spot-checked, CWZ-14) |
| A.8 crime victims compensation | C: CO-3813 |
| B.1 bona fide loan | C: CO-3362, CO-3820 |
| B.2 Older Americans Act nutrition | N/A: in-kind meals, not money income |
| B.3 school lunch, WIC | N/A: in-kind food |
| B.4 home produce | N/A: in-kind |
| B.5 URA relocation | C: CO-3366 |
| B.6 EHAP | N/A recorded in docs/colorado-notes.md (a 1970s HUD demonstration with no current payments) (CW-22) |
| B.7 Indian judgment and trust funds | C: CO-3366 |
| B.8 ANCSA up to $2,000 a year | C: CO-3366 (the cap is not checked; federal statute) |
| B.9 assistance for items outside the need standard | not modeled, reason recorded in docs/colorado-notes.md (the standards are totals with no item list) (CW-22) |
| B.10 disaster assistance | C: CO-3366 |
| B.11 Title IV foster or kinship child excluded; income exempt | C: CO-2350, CO-841, CO-3821 |
| B.12 DVSA volunteers | C: CO-3366 |
| B.13 WIOA training allowances | C: CO-3815 |
| B.14 YEDPA | C: CO-3815 |
| B.15 Social Security under a PASS | C: CO-3825 |
| B.16 WIOA income and services | C: CO-3815 |
| B.17 RECA | C: CO-3366 |
| B.18 reimbursement of out-of-pocket expenses | C: CO-3363 |
| B.19 Nazi persecution | C: CO-3366 |
| B.20-22 IDAs, retirement and health savings distributions | C: CO-3816 |
| B.23 spina bifida | C: CO-3366 ("and the like") |
| B.24.a work-study | C: CO-3361 in CO-2340 |
| B.24.b dependent-child student earnings | C: CO-3385 (**OQ-613**) |
| B.25 educational savings accounts | C: CO-3816 |
| B.26 educational grants, loans, stipends, scholarships | C: CO-3360 |
| B.27 SSI recipient excluded; income exempt | C: CO-2350 (SSI income not read by CO-908) |
| B.28 refugee resettlement, R&P | C: refugee_resettlement_payments_received CO-4367 in CO-4369 (CW-14 fixed) |
| B.29 CRSP Interim Cash Payment | C: CO-4367 in CO-4369 (CW-14 fixed) |
| B.30 life or disability insurance cash value taken | C: insurance_cash_value_withdrawn CO-4368 in CO-4369 (CW-14 fixed) |
| B.31 LEAP | C: CO-3364 |
| B.32 subsidized adoption child excluded | C: CO-2350, CO-841 |
| B.33 lump sum of exempt income; designated amounts | C in part (exempt sources stay exempt); designated amounts carried by CO-4365 in CO-4369 (CW-14 fixed) |
| B.34 tax credits | C: CO-3365 |
| B.35 subsidized employment wages | C: CO-3817 |

### 3.605.5 Child support income
| ¶ | disposition |
|---|---|
| A counted against the need standard at application | C: CO-2553 (checked; the current month less arrears) |
| B excluded from the grant once eligible | C: CO-2554 |
| C.1 consistent = received in all six of six | C: CO-2550, CO-2556, CO-2843 |
| C.2 six-month average; $500 or less disregarded, over $500 counted | C: CO-2551, CO-2552, CO-2555 (checked: > $500) |
| C.3 disregarded in the grant | C: CO-2554 |
| D arrears exempt | C: CO-3814 in CO-2551, CO-2553 |

### 3.606.1 Basic cash assistance
| ¶ | disposition |
|---|---|
| A-D no county reduction; UPA; client decides; vendor payment | N/A |
| E six-month certification; income in the month of application and throughout; earned minus disregards plus unearned | C: CO-1501 (period), CO-907/CO-922, CO-908 |
| F chart (need and grant standards; 0-2 caretakers; 0-10 children plus each additional) | C: CO-274-CO-277, CO-351-CO-354, CO-911, CO-912 (values checked cell by cell against D-81); 3+ caretakers **OQ-101**; dated to 2028-06-30 (S1800); after that **OQ-530** |
| G $10 pregnancy allowance through the end month | C: CO-355 in CO-1260 |
| H gross test "shall not exceed" | C: CO-913 (**OQ-153**) |
| I.1-3 grant computation | C: CO-1260, CO-923 |
| J.1-3 budgetary-unit income compared with the need standard | C: CO-910, CO-2353 |
| J.4 "equals or exceeds ... not eligible" | C: CO-913 strict < (**OQ-153**) |
| K.1-2 grant less net income; drop cents | C: CO-1260, CO-914 (floor checked) |

### 3.606.2 Earned income disregards
| ¶ | disposition |
|---|---|
| intro, eligible members (not disqualified) | C: CO-910/CO-923 (disqualified members handled apart) |
| A.1 $90 test at application; 100% for the first certification period; 67% after | C: CO-907, CO-922, CO-273, CO-1503, CO-350 (checked) |
| A.2.a new source, 100% for the first period it impacts | C: CO-922, CO-1502, CO-2374 (OQ-350) |
| A.2.b current source 67% | C: CO-922 |

### 3.606.3 Changes and reporting ("transitions")
| ¶ | disposition |
|---|---|
| intro reporting by the 10th; county acts within 10 days | N/A: procedure |
| A.1 increases the month after report and verification | N/A: effective-date timing (point-in-time model) — see CW-17 |
| A.2 decreases held until redetermination | N/A: out of scope, recorded in docs/colorado-notes.md (CW-17) |
| B.1.a-b reporting standards (need ÷ .33; need) | N/A: reporting thresholds, not eligibility |
| B.2-4 new source, people, address | N/A |
| C (intro) certification does not guarantee eligibility | C: CO-921 evaluated each month |
| C.1.a income over the need standard closes | C: CO-913 |
| C.1.b-g other negative changes (member leaves; pregnancy ends; 18-year-old graduates; death; sanctions; IPV) | C through the current-month facts (CO-900, is_pregnant, CO-901, CO-1264, CO-1730); death carried by CO-921 ineligible_deceased (CW-24) |
| C.1.c.4-5 member moving to a new unit; income excluded from the next month | N/A: noticing period and timing |
| C.2.a-e positive changes; newborn added from the month of birth | C through current-month facts; newborn documentation N/A |
| C.3 net of simultaneous changes | N/A |
| D questionable information may lead to discontinuance | N/A: procedure |

### 3.606.4 Redetermination
| ¶ | disposition |
|---|---|
| A-H filing, mail-out, complete packet, process, not returned, incomplete, notice, completion | N/A: procedure (a closure for a missing redetermination is procedural); redetermination as a state is CO-2375 |
| I.1-2 reinstatement and reopening | N/A |

### 3.606.5 Moving counties
| ¶ | disposition |
|---|---|
| A-B.4 | N/A: eligibility continues; county procedure |

### 3.606.6 Time limits and extensions
| ¶ | disposition |
|---|---|
| A every month counts for adult members; units with an adult up to 60 months | C: CO-915 (every member's counted months), CO-918, CO-924, CO-278 (CW-3 fixed) |
| B sanction months count | C: the supplied count (CO-840) |
| C 60 months bars the unit without good cause; state form; disqualified members bar an extension | C: CO-918, CO-925 (S1021, S3154) (CW-3 fixed) |
| C.1-5, C.7 notices, requests, 30-day decision, 6-month extensions | N/A: procedure (the approval is CO-846/CO-847) |
| C.6 former clients may request | C: the extension facts |
| D.1-4 hardship reasons | C: has_hardship_extension_approved CO-847 (county decision) |
| E domestic violence extension | C: CO-846 |
| F Indian Country / Alaska Native village months not counted | C: CO-1723 in CO-915 |
| G 20% cap monitored by the State | N/A: State monitoring; counties not limited (S1313) |

### 3.606.7 Funeral, burial and cremation
| ¶ | disposition |
|---|---|
| A.1 not an entitlement; appropriation | N/A |
| A.2 $1,500 maximum; $2,500 combined charges | C: CO-1505, CO-1506, CO-1508 (checked ≤) |
| A.3 stillbirth documentation | N/A |
| B.1 a client who received Colorado Works while alive | C: CO-1504 (FC-19) |
| B.2 estate insufficient | C: CO-1224 in CO-1508 (**OQ-354** order) |
| B.3 county authorization | N/A |
| B.4 $2,500 limit | C: CO-1508 |
| C.1-17 allowable items | C: CO-1221's meaning |
| D arranging details | N/A |
| E no State funds over $2,500 | C: CO-1508 |
| F.1 application; choice of disposition; over $2,500 no payment | C: CO-1508; the rest N/A |
| F.2.a choice | N/A |
| F.2.b estate and responsible persons | C: CO-1224, CO-1229 |
| F.2.c responsible persons' resources over the SSI limit | C: af_burial_responsible_person_excess_resources CO-1229; voluntary contributions carried by burial_contributions_from_responsible_persons CO-4373 in CO-1508 (CW-19) |
| F.2.d prepaid plot of $2,000 or less, or donated | C: CO-1222 |
| F.2.e SS lump-sum death benefit not used | C: CO-1225 precision |
| F.2.f insurance proceeds reduce the maximum | C: CO-1223 (**OQ-354**) |
| F.2.g non-responsible contributions do not reduce | C: CO-1508 precision |
| F.3.a-d no family located; one year | N/A: procedure |
| G provider agreement | N/A |

### 3.606.8 Diversion, other assistance, family needs
| ¶ | disposition |
|---|---|
| A (intro) crisis need; up to 4 months; supportive payments | C: CO-1270, CO-1267 |
| A.1 does not need long-term BCA | C: CO-1266 |
| A.2 specific need | C: CO-1267 |
| A.3.a-c written or verbal agreement | C: CO-2559 (the amount agreed); the rest N/A |
| A.4 POI | C for diversion (CO-1269 in CO-1270) ; for BCA carried by CO-921 ineligible_diversion_period (CW-1 fixed); the POI bound recorded in OQ-252 (CW-27) |
| A.5 county may end the POI or grant BCA | C: CO-1269's meaning ("not ended early") |
| A.6 eligible for BCA or the county's higher limit; no child support assignment; no time-limit count | C: CO-1270, CO-1268 (**OQ-252**); no cap **OQ-531**; the time-limit part is carried by the supplied count |
| A.7 no diversion in a BCA month | C: CO-1270 (FC-18) |
| B.1-3 supportive payments | N/A: out of scope (FC-20, docs/colorado-notes.md) |
| C Family Preservation | N/A: out of scope (P2-5, notes) |
| D other assistance (county option, $75,000) | N/A: out of scope (C-4, notes) |
| E county's own funds, not income | N/A: no fact; not income by rule |

### 3.607 Initial Workforce Development
| ¶ | disposition |
|---|---|
| 3.607.1.A.1-2 work eligible | C: CO-919 (informational; the minor spouse of a minor head added, P3-4) |
| 3.607.1.B.1-3 not mandatory | C: CO-919 |
| 3.607.1.C | N/A |
| 3.607.2-3.607.4 screening, assessment, condition agreement | N/A: county process |
| 3.607.5 Individualized Plan; non-participation before the first IP is demonstrable evidence and closure | C: CO-4353 (demonstrable_evidence) in CO-921 (CW-13 fixed); the rest N/A |

### 3.608 Ongoing Workforce Development
| ¶ | disposition |
|---|---|
| 3.608.1, A-B case management, assessment, IP changes | N/A |
| 3.608.2.A-D work activities | C: CO-1745, CO-2885, CO-920 (informational; participation hours are not an eligibility condition; OQ-104) |
| 3.608.3 (intro), A-G re-engagement and good cause | N/A: county process; the outcome is the supplied sanction level CO-1261 |
| 3.608.3.H exceptional disengagement can lead to a sanction | C: CO-1261 |
| 3.608.3.I sanction after a missed re-engagement; reversal | C: CO-1261 |
| 3.608.4.A sanctions from other counties served | C: CO-1261 (statewide record) |
| 3.608.4.B other States' sanctions not recognized | C: CO-1261's meaning (Colorado sanctions) |
| 3.608.4.C.1 $1, then 25%, one month each; progression | C: CO-1262, CO-1263, CO-1265 (checked) |
| 3.608.4.C.2 fourth level 100% and closure | C: CO-1265, CO-921 `sanction_closure` |
| 3.608.4.D-E served; a one-month break serves it; next level | C: CO-1261 (S765) |
| 3.608.4.F one level a month; the higher level | C: CO-1264 |
| 3.608.4.G re-engagement stops progression | C: CO-1261 |
| 3.608.5 appeal of a sanction | N/A |

### 3.609 Notice, payments, overpayments, IPV, hearings
| ¶ | disposition |
|---|---|
| 3.609.1.A-E notice and continued benefits | N/A: notice |
| 3.609.2.A issuance schedule | N/A |
| 3.609.2.A.1.a-e initial partial-month payment, table, $10 and $1 floors | C: CO-4355 to CO-4359 in CO-914 (CW-8 fixed) |
| 3.609.2.A.2 prospective | C: month facts |
| 3.609.2.B claims | N/A |
| 3.609.2.C.1-3 death | C: CO-921 ineligible_deceased (C.1-2, CW-24); C.3 N/A (personal representative) |
| 3.609.2.D cents dropped on all payments | C: CO-914 floor |
| 3.609.2.E-H, J (warning and disable steps) | N/A: payment administration |
| 3.609.2.J.3-4 one-month denial for continued EBT misuse | C: CO-4353 (continued_ebt_misuse) in CO-921 (CW-13 fixed) |
| 3.609.3 overpayments; 3.609.4 recovery | N/A: recovery |
| 3.609.5.A-M, O-R IPV procedure | N/A |
| 3.609.5.N.1-4 disqualification periods; only the individual; spouse and sponsor income still available | C: CO-1730 in CO-928 (individual only; income kept, CO-910) |
| 3.609.6 dispute resolution; 3.609.7-3.609.74 hearings, protections | N/A |
| 3.609.75 / 3.609.751 noncustodial parent programs | N/A: services, not BCA (3.604.1.C) |

### Resources
9 CCR 2503-6 states no resource test for basic cash assistance (searched D-81 for "resource" and "asset"). C.R.S. 26-2-706(2)(a) forbids one (CO-921 precision: `ineligible_resources` is unreachable). Resources appear only in the death reimbursement (3.606.7.F.2.c-d, carried) and Family Preservation (3.606.8.C, out of scope).

**Matrix size:** 355 rows (paragraphs, or groups of procedural paragraphs) across 3.600-3.609. Of these, 250 are carried wholly or in part, 83 are N/A, and 22 are GAP or finding only. 48 rows cite a GAP or a P2 finding, and 17 cite an open question.

## 4. Open-question confirmations (Colorado Works, cash owner)

| OQ | class | confirmed? | note |
|---|---|---|---|
| OQ-101 (more than two caretakers) | state policy choice | yes | The 3.606.1.F chart has three rows; text checked in D-81. |
| OQ-102 ("needs" in deeming) | state policy choice | yes | 3.605.1.A.4.a names no figure. Separately, CW-5 and CW-6 are errors in *who* is deemed, not in "needs". |
| OQ-104 (weeks per month) | state policy choice | yes | The item is informational; D-81 has no person-level hours test. P3-5 is the item-id typo. |
| OQ-153 (H vs J.4 at equality) | state policy choice | yes | Both sentences unchanged in D-81 3.606.1.H and J.4. 3.606.2.A.1 "shall not exceed" is a third instance of H's reading; it could be cited too. |
| OQ-252 (sanction default; county diversion limit) | state policy choice | yes | County policy is not a published State text. Add the POI-bound note (CW-27). |
| OQ-354 (order of reductions) | state policy choice | yes | 3.606.7 states no order. |
| OQ-530 (standards from 2028-07-01) | blocked on a named document | yes | The SFY 2028-29 standards do not exist yet; SB 26-181 (D-171) and eDocket 2026-00094 (D-172) were checked. |
| OQ-531 (diversion cap, TANF State Plan) | blocked on a named document | yes | The Colorado TANF State Plan is not served by any allowed host (cdhs.colorado.gov is not allowed). |
| OQ-611 (child absent for an unlisted reason) | state policy choice | yes | 3.604.2.E, G and I checked. |
| OQ-613 (part-time student, full-time employee) | state policy choice | yes | 3.605.4.B.24.b (OQ text says A.24; the paragraph is **B**.24); no definition exists. |
| OQ-660 (institution thirty days, O.2 last words) | state policy choice | yes | |
| OQ-700 (personal and home care allowances) | state policy choice | yes, with P3-2 | It cites a non-existent 3.605.6. |
| OQ-376 (DOR Rule 5 edition; LEAP owner) | state policy choice | yes for the CW part (resolved) | |
| OQ-550 (SAVE status list; Medicaid owner) | blocked | yes for CW (final2 review) | |

No misclassified open question was found. One stopping-rule note: CW-4's source (86 FR 7732) is on govinfo.gov, so if the department chooses to keep current guidelines, the open question must be a **state policy choice**, not a blocked one.

## 5. Earlier reviews (spot-check)

Scratch probes on CO-86's template, at HEAD 5fc915b:
- FC-1, strike: `ineligible_strike` for the whole unit (CWZ-12). Child support refusal: `ineligible_child_support` (CWZ-13). Inmate mother: she gets `ineligible_institution`, the child gets the No Caretaker $173 (CWZ-16). **Fixed.**
- FC-2, $300 county General Assistance: countable 0, $488 (CWZ-14). **Fixed.**
- FC-12: CO-1425 adds the unverified income of the stepparent, the caretaker's spouse and the minor's parents (derivation read). **Fixed.**
- FC-18: CO-1270 has the A.7 conjunct (derivation read). **Fixed.**
- final2 N-3, trafficking victim: `eligible`, $488 (CWZ-15). **Fixed.**
- final2 P2-6 and P2-7: CO-3354's no-absence branch reads CO-3804, and CO-2351 drops members out of State more than 90 days (derivations read). **Fixed.**

## 6. Reproducing households

Built in a scratch copy of HEAD (`git archive HEAD`) by appending cases to `volumes/co/tests/cases.yaml` from CO-86's p1 facts (as_of 2026-10-15, `cw_application_date` 2026-10-12). Each was evaluated with `npx vite-node scripts/eval-case.ts co <id> <identifiers>`. The specs are in the session scratchpad (`cwreview/spec1.json` to `spec9.json`, generator `cwreview/mkcase_cw.py`):

| case | finding | key facts | model | rule |
|---|---|---|---|---|
| ZZ-1 | CW-2 | emancipated 16-year-old with a baby, alone | 0 caretakers, 2 children, $362 | 1 caretaker, 1 child, $488 |
| ZZ-2 | CW-1 | mother and child, `in_diversion_period_of_ineligibility` true | eligible, $488 | no BCA during the POI |
| ZZ-3 | CW-3 | unmarried parents; the non-head father at 60 months | eligible, $649 | ineligible (3.606.6.C) |
| ZZ-4 | CW-4 | LPR sponsored mother; sponsor $2,900 wages, sponsor household of 2 | deeming false, $488 | deeming applies (125% of 2021 FPG = $2,760.42), ineligible |
| CWZ-7 | CW-6 | minor mother (h1); her mother in h2 with $3,000 | deemed $2,657, ineligible | nothing deemed, $488 |
| CWZ-8 | CW-5 | minor mother; her mother requested and joined, $500 wages | countable $567 > $421, ineligible | $410 < $421, eligible, $620 |
| CWZ-9 | CW-9 | $2,000 lottery prize | countable 0, $488 | counted, ineligible |
| CWZ-10 | CW-10 | $1,500 from 2 boarders | countable 0, $488 | $888 earned, ineligible |
| CWZ-11 | CW-8 | applied 2026-10-12, no income | $488 for October | 20 days × .65754 → $320 |
| CWZ-18 | CW-7 | unmarried 16-year-old mother living with her grandmother, no county approval | p1 `ineligible_living_arrangement` $0; baby `eligible` $362 | eligible (adult relative and caretaker) |

## 7. Disposition (coverage round)

Fix round of 2026-11-22 on branch ccr-9d19bf4c-wmnwcl (from a2ed7f0). Commits: 60af424 (D-295, the 2021 HHS poverty guidelines from govinfo.gov, and excerpts S3150-S3170), 593a74f (eligibility and unit), 25197a9 (income), 460c36b (initial partial month), c622cfa (open questions, citations, household cases, notes). Every reproducing household of section 6 was re-run on the fixed ledger with `scripts/eval-case.ts`'s evaluator; the rule's answer now comes out in each (the October results are prorated from the October 12 application date since CW-8). Five probes are stored as household cases with hand derivations: CO-160 (ZZ-1), CO-161 (ZZ-3), CO-162 (ZZ-4), CO-163 (CWZ-8), CO-164 (CWZ-18). The matrix rows above now name the items that carry them.

| id | disposition |
|---|---|
| CW-1 | fixed (593a74f): `cw_eligibility_status` (CO-921) returns ineligible_diversion_period when any member of the unit is within a diversion POI (CO-1269, read as false when not stated; its precision now says a county grant of basic cash assistance under A.5 ends the POI). ZZ-2: ineligible_diversion_period, $0. |
| CW-2 | fixed (593a74f): `cw_minor_parent_is_assisted_as_adult` (CO-4352: under 18, a dependent child of her own, and emancipated, not single, or with no caretaker in the home, N.2.b-c) is read by the caretaker and child counts (CO-926, CO-927), the adult-member test (CO-924), the child-only test (CO-916) and the strike test (CO-3808). CO-901 itself was not changed: reading cw_has_dependent_child there would be a cycle. ZZ-1 (stored as CO-160): One Caretaker, one child, grant standard $488 (October $320). |
| CW-3 | fixed (593a74f): CO-915 reads the supplied count less Indian Country months for every member; 45 CFR 264.1(b)(1)(i) is applied in the count the statewide system keeps (CO-840's meaning), not by zeroing a current non-head. No open question remains: 3.606.6.A and C state the State's rule. ZZ-3 (CO-161): time_limit_reached. CO-918-T4's expectation changed false -> true with that justification; CO-08 p4 (18) now states his count. |
| CW-4 | fixed (60af424, 593a74f): D-295 fetched from govinfo.gov; `cw_poverty_guideline_annual_table` and `_each_additional` (CO-4350, CO-4351, version from 2021-02-01) are read by CO-2364. ZZ-4 (CO-162): deeming applies at $2,900 for four ($2,760.42 line), $2,725 deemed, ineligible_income. CO-2364-T1 moved from $4,000 to $3,200 (the five-person line is now $3,233.33). |
| CW-5 | fixed (593a74f): CO-909 deems only parents not in the minor parent's assistance unit. CWZ-8 (CO-163): countable $410 < $421, eligible, $620 for the month ($407 in October). |
| CW-6 | fixed (593a74f): CO-909 deems only parents living in the same home (lives_with and the absence rule, as CO-2608 reads the home). CWZ-7: nothing deemed, eligible. |
| CW-7 | fixed (593a74f): CO-906 accepts another adult caretaker (N.1) or an adult relative (N.2.a: is_related_to, 18 or older, same home); CO-921 bars every member of the unit when any member's arrangement fails. CWZ-18 (CO-164): eligible, No Caretaker two children, $362 ($238 in October). |
| CW-8 | fixed (460c36b): `cw_partial_month_payment_factor` (CO-4358) from the 3.609.2.A.1 table (CO-4355), from the date of application or the later eligibility date (CO-4359), read in `cw_grant_amount` (CO-914) with the $10 and $1 floors (CO-4356, CO-4357) and cents dropped. CWZ-11: $320. CO-86 p1 October grant $384 -> $252: 20 days (October 12-31) x .65754 x $384 = $252.49, cents dropped. |
| CW-9 | fixed (25197a9): (a) lottery_gambling_winnings_received is added in CO-908 and CO-2554 (CWZ-9: $2,000 counted, ineligible_income); (b) `cw_sponsor_contributions_counted` (CO-4363) counts money_received_from_sponsor when deeming does not apply, in CO-910 and CO-923 (kept out of CO-908, which CO-2364 reads); (c) neutral `in_kind_earned_compensation_value` (CO-4360) is read in CO-1716, and a disregarded student's in-kind earnings are excluded too (CO-2340). |
| CW-10 | fixed (25197a9): `cw_boarder_income` (CO-4361): payments less payers x the one-person SNAP maximum allotment (accepts_from snap_maximum_allotment_table) less documented costs, foster care payments excluded; read in CO-1716. CWZ-10: $888 earned, $798 countable, ineligible_income. |
| CW-11 | fixed (25197a9): `cw_refused_potential_income` (CO-4362, a county finding) is unearned income in CO-908 and CO-2554. |
| CW-12 | fixed (593a74f): `cw_is_excluded_for_unprovided_status_verification` (CO-4372) leaves the member out of CO-2351 (income still counted in CO-910/CO-923) and CO-2561 reports ineligible_member_verification. CO-02 changed: p4 and p5 (citizenship pending past 2026-10-31) leave the size: cw_unit_size 2 -> 0, cw_need_standard 245 -> 0, cw_grant_standard 362 -> 0 (No Caretaker row, 0 column), participation eligible_member -> ineligible_member_verification; eligibility (ineligible_income, 2,037 >= 0) and the $0 grant unchanged. |
| CW-13 | fixed (593a74f): `cw_county_closure_type` (CO-4353; demonstrable_evidence, continued_ebt_misuse, minor_parent_education_nonparticipation) read for every member in CO-921 (closed_demonstrable_evidence, closed_ebt_misuse, closed_minor_parent_education). The closures rest on county findings, so they enter as one supplied finding. |
| CW-14 | fixed (25197a9): `cw_unearned_income_deductions` (CO-4369) from neutral facts CO-4364 (rental expenses, up to the rent in other_unearned_income_taxable), CO-4365 (insurance and lump-sum amounts spent or designated, A.5, A.6, B.33), CO-4366 (workers' compensation award expenses, B.4), CO-4367 (R&P and CRSP Interim Cash Payment, B.28-29), CO-4368 (insurance cash value taken, B.30); subtracted in CO-908 and CO-2554. |
| CW-15 | open question OQ-770 (state policy choice; the volume keeps eleven days). |
| CW-16 | open question OQ-771 (state policy choice; the application month is tested). |
| CW-17 | out of scope, recorded in docs/colorado-notes.md (c622cfa): effective-date rules between determinations (3.606.3.A.1-2); the volume determines a month from that month's facts. |
| CW-18 | deferred P2 (reason in docs/colorado-notes.md): ranking caretakers needs CO-900's edge rule and CO-2608 to change; a non-parent caretaker joins only on request today (C.2.b), so the hierarchy changes a unit only where one asks to join beside a parent or a nearer relative. |
| CW-19 | fixed (25197a9): neutral `burial_contributions_from_responsible_persons` (CO-4373) reduces CO-1508 (F.2.c). |
| CW-20 | fixed (593a74f): neutral `spousal_maintenance_paid` (CO-4354) deducted in CO-909 and CO-2353. |
| CW-21 | open question OQ-772 (state policy choice; no bar is applied). |
| CW-22 | SMIB refund fixed (25197a9, CO-4370 in CO-4369); B.6 EHAP recorded as not applicable (a HUD demonstration with no current payments) and B.9 recorded as not modeled (the standards are totals with no item list), docs/colorado-notes.md. |
| CW-23 | fixed (25197a9): neutral `retroactive_colorado_works_lump_sum_received` (CO-4371, part of CO-3920) is subtracted in CO-4369. |
| CW-24 | fixed (593a74f): CO-921 returns ineligible_deceased when date_of_death is before the first day of the month (C.1-2); a death in the month keeps it (C.3). |
| CW-25 | deferred P2 (reason in docs/colorado-notes.md): the eight-month limit needs an SSN application date and a good-cause finding; B.2.c.1's redetermination rule (CO-1647) already requires the number itself at the next recertification. |
| CW-26 | fixed (593a74f): CO-2561 option ineligible_member_institution_or_absence. |
| CW-27 | recorded in OQ-252 (c622cfa): the POI bound of 3.606.8.A.4 is not checked; the county's POI is taken as stated. |
| P3-1 | fixed (593a74f, 460c36b): CO-918, CO-921, CO-914, CO-924, CO-925, CO-1260, CO-278, CO-355, CO-840, CO-846, CO-847, CO-1723 cite S3154/S3164 (D-81) in place of S417, S524, S525. S417 and S524 themselves are left in sources.md (other history cites them). |
| P3-2 | fixed (c622cfa): OQ-700 cites 3.605.4.A.5 and 3.605.2.D.3. |
| P3-3 | fixed (593a74f): CO-909's precision now states the deductions it makes; the stale assumption line is removed. |
| P3-4 | fixed (c622cfa): CO-919 adds the spouse of a minor child head-of-household (3.607.1.A.1, S3168), with a test. |
| P3-5 | fixed (c622cfa): OQ-104 names CO-920. |
| P3-6 | fixed (593a74f): CO-926's precision no longer says CO-900 builds only a pair. |
| P3-7 | fixed (c622cfa): CO-3385, CO-1716's test comment, S1621 and OQ-613 cite 3.605.4.B.24. |

Not P1: none; each P1's reading was confirmed against D-81 before it was fixed. Rule-test expectations changed with justification: CO-916-T1 (true -> false, CW-2), CO-918-T4 (false -> true, CW-3), CO-926-T3 (0 -> 1, CW-2), CO-2364-T1 (re-based to $3,200, CW-4); several older tests now state the new items to stay isolated.
