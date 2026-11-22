# Coverage-matrix verification: Medicaid non-MAGI (aged, blind and disabled, long-term care, MSP, Buy-In, OAP Health Care)

Reviewer: independent coverage pass, 2026-11-22, HEAD a2ed7f0 (branch ccr-9d19bf4c-wmnwcl). Brief: scratchpad `brief-coverage.md` (exhaustive, not sampled). Only this file was written in the repository; nothing was committed.

Texts walked paragraph by paragraph:

- D-65, 10 CCR 2505-10 § 8.100 (SOS text, rule version effective 11/14/2026), the non-MAGI parts: § 8.100.5.A-P (D-65:2095-2723), § 8.100.6.A-Q (D-65:2725-3109), § 8.100.7.A-V (D-65:3111-4458).
- D-68, 10 CCR 2505-10 §§ 8.940-8.942 (OAP Health Care Program, version of § 8.900 effective 11/14/2026).
- 20 CFR 416 as § 8.100 incorporates it: § 8.100.5.H.4.e incorporates 20 CFR 416.1112 (2012) by reference (D-53). It is the only 20 CFR 416 section § 8.100.5-7 names. The other 416 provisions the volume reads (416.1124(c)(12), 416.1140, 416.1201-416.1205, 416.1160-416.1165) are cited where a finding turns on them.
- Read where a finding turned on them: D-31 (42 CFR 435.137-435.138), D-45 (42 U.S.C. 1382c(f)(2)), and 42 U.S.C. 1383c(d) (law.cornell.edu, fetched 2026-11-22 for OQ-209).

Mechanics. `npm run export -- --volume co` was run in a `git archive` scratch copy: 1894 items. Each "carried by" item's derivation was read in that ledger and in the YAML. `npm run check` on a clean archive of a2ed7f0: check OK; conformance self-check 3570 cases, 6326 checked, 6326 passed. Wrong answers were reproduced with `scripts/eval-case.ts` on scratch households appended to the scratch copy. The households are saved at `/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/x-cases-nonmagi.yaml` (X-BURIAL, X-IRA, X-FORSALE, X-LUMP, X-PASS, X-DWB, X-DEEM, X-QI, X-WAWDHCBS, X-REFUSE, X-COURT), together with the stored cases CO-112 and CO-139.

## 1. Verdict

**15 P1 found.** Every P1 is in a paragraph that no earlier pass read closely: the resource exemptions and valuations of § 8.100.5.J-N, the income definitions of § 8.100.5.F, the incorporated 416.1112, § 8.100.6.I and N.4.d, § 8.100.7.B.1.c and B.2.c, and § 8.100.7.R.3 and T.1.b/e. Twelve were reproduced on a household. The other three (NM-4, NM-5, NM-8) have no fact a household could state, or a stored case already shows them (NM-5: CO-139). Two of the P1s (NM-9, NM-10) are also stopping-rule failures: the open question that records each reading (OQ-209, OQ-83) is classed "state policy choice", but a text the volume already holds answers it.

The matrix has 15 P2 findings (NM-16 to NM-30) and 5 P3 findings (NM-31 to NM-35). The earlier Medicaid P1s that sit in the non-MAGI rules all stay fixed (§ 5).

## 2. Findings

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| NM-1 | **P1** | § 8.100.5.M.2.j | ssi_countable_resources_individual (CO-800), ma_ssi_countable_resources (CO-608), ma_meets_ssi_resource_standard (CO-610); facts revocable_burial_trust_value (CO-3855) and revocable_prepaid_burial_contract_value (CO-3856), read only by Adult Financial and SNAP | "An applicant or recipient may also own up to $1,500 in burial funds through a revocable account, trust, or other arrangement ... The $1,500 exemption is reduced by: i) the amount of any irrevocable burial funds ... ii) the face value of any life insurance policy whose cash surrender value is exempt." | CO-800 reads neither revocable_burial_trust_value nor revocable_prepaid_burial_contract_value, so every revocable burial fund is excluded in full whatever its size. Adult Financial counts the excess over $1,500 from the same facts (CO-4000). Scratch **X-BURIAL**: aged, $1,000 savings and a $10,000 revocable burial trust. The engine gives ma_ssi_countable_resources 1,000 and ma_ssi_related_category aged (af_person_countable_resources_other_than_life_insurance on the same facts is 9,500). Under M.2.j, $8,500 counts: 9,500 > 2,000, so none. Every SSI-method reader is affected: SSI-related, Pickle, DAC, MSP, QDWI, OAP SISC B and the LTC resource test (CO-647). | In CO-800, add max(0, revocable burial trust + revocable prepaid contract - (1,500 less irrevocable burial funds less the face value of exempt life insurance)), per person (M.2.j: "a separate $1,500 exemption applies to each spouse"). Add burial_spaces_value_beyond_family_needs only if M.2.h's "immediate family" matches its meaning (M.2.h exempts all family burial spaces). Store X-BURIAL. |
| NM-2 | **P1** | § 8.100.5.M.2.b; M.3.h | CO-800; facts ma_excess_real_property_is_for_sale (CO-2242) and ma_claims_co_owner_hardship_for_real_property (CO-2244), read only by the verification items CO-2246 and CO-2248 | M.2.b: "Excess property will not be included in countable resources as long as reasonable efforts to sell it have been unsuccessful." M.3.h: the information obtained "When the applicant alleges that the sale of real property would cause undue hardship to the co-owner due to loss of housing". | The volume states both exemptions as facts and verifies them, but no resource item reads them: real_property_other_than_home_equity is counted in full. Scratch **X-FORSALE**: aged, $1,000 savings and a $50,000 lot listed for sale at market value, ma_excess_real_property_is_for_sale true. The engine gives ma_ssi_countable_resources 51,000 and category none. The rule gives 1,000: aged. M.2.b.vii: once the lot sells, the proceeds count (§ 8.100.5.P). | In CO-800, subtract real property under M.2.b (for sale with reasonable efforts) or M.3.h (co-owner hardship, once the M.3.h.i-iii statements are in). That needs the value as a fact, or a rule that real_property_other_than_home_equity is the for-sale property when the flag is true. Store X-FORSALE. |
| NM-3 | **P1** | § 8.100.5.N.3 (with N.2, N.4) | ssi_countable_resources_couple (CO-801), ssi_countable_resources_of_couple (CO-2861), CO-608 | "Self-funded retirement accounts in the name of the applicant's spouse who is living with the applicant are exempt in determining eligibility for the applicant, except as set forth in 4. below" (N.4 is the long-term care community spouse). | CO-801 adds the spouse's ssi_countable_resources_individual, which includes retirement_accounts_value. Scratch **X-IRA**: p1, 76, Social Security 800, savings 1,000, Medicare Part A; spouse p2, 60, not applying, holds a $40,000 IRA. The engine gives ma_ssi_countable_resources 41,000, so p1 fails both the SSI-related standard and QMB (ma_qmb_eligible false). Under N.3 the IRA is exempt for p1: 1,000, so aged, and QMB on income 780 against the couple's 100% FPL. | For the SSI-related and MSP tests, leave out of the couple's resources the retirement accounts of a spouse who is not the person evaluated. Keep them for the long-term care couple (N.4: CO-647 and the CSRA). Store X-IRA. |
| NM-4 | **P1** (GAP) | § 8.100.5.J.2-3; M.3.g | real_property_other_than_home_equity (CO-3393), CO-800 | J.2: "Non-business property that is necessary to produce goods or services essential to self- support is excluded up to $6,000." J.3: "Property used in a trade or business which is essential to self-support is excluded up to a limit of $6,000 if it produces 6% return". M.3.g counts "Real property not exempt as the principal place of residence and not exempt as income producing property with a value of $6,000 or less". | CO-3393's meaning leaves out real property "used to produce income", and no other fact states it, so income-producing property (a rental house, farmland) is never counted. The rule excludes at most $6,000 of it. A person with a $150,000 rental property is resource-eligible in the volume. No household can show it, because no fact carries the value. | Add a fact for the equity of income-producing real property and whether it is essential to self-support. Count it above J.2-3's $6,000 exclusion (and J.3's 6% return) in CO-800. SNAP's exclusion of the same property keeps reading CO-3393. |
| NM-5 | **P1** (GAP) | § 8.100.5.M.2.a.iii-xiv; M.3.e-f | CO-800 (home never counted), home_equity (CO-826), ma_home_equity_disqualifies (CO-650), ma_meets_residency (CO-2250) | v) a Colorado home within the limit, with intent to return, "is considered an exempt resource if: 1) The individual is institutionalized; and 2) The intent to return home is documented in writing." vii) "...does not intend to return to that home, then the home is a countable resource unless spouse or dependent relative lives in the home." iii) an out-of-state home with intent to return fails residency. xiii) a home transferred to a trust or other entity is not exempt for LTC, HCBS or PACE. xiv) "The principal place of residence, which is subject to estate recovery, becomes a countable resource upon the execution and recording of a beneficiary deed." | The volume reads the home only against the equity limit (CO-650). No fact states the intent to return or its written documentation, a home outside Colorado, a home held in a trust or entity, or a recorded beneficiary deed, so the home is never a countable resource. **Stored CO-139**: an 80-year-old widowed veteran in a State Veterans Home with home_equity 240,000, "no home to keep", no spouse or dependent in it, and no written intent to return. The engine gives eligible_institutional with countable resources 1,200. Under M.2.a.v and vii, the $240,000 home counts unless the intent to return is documented: ineligible_resources. | Add facts for written intent to return, an out-of-state home, a home held in a trust or entity, and a recorded beneficiary deed. Count home_equity in CO-800 (or in the LTC resource item) when M.2.a.iv, vi-viii, xiii or xiv makes it countable, unless a spouse or dependent relative lives there (CO-889). Read iii in CO-2250. State the intent on CO-139 and re-derive it. |
| NM-6 | **P1** | § 8.100.5.F.5.c, F.5.f (and F.6.c) | ma_ssi_household_unearned_income_sum (CO-663), ma_ltc_gross_income (CO-641), ma_wawd_countable_income (CO-1715), ma_cbwd_household_unearned_income (CO-4201); fact lump_sum_received (CO-3367) | F.5: "Unearned income is countable as income in the month received ... c. Gifts and inheritances ... f. Lump sum payments from workers' compensation, insurance settlements, etc." F.6.c exempts only "Title XVI ... or Title II ... retroactive payments (lump sum) for nine months following receipt". | No Medicaid income item reads lump_sum_received. Scratch **X-LUMP**: aged, Social Security 800, a $5,000 insurance settlement received in October. The engine gives countable income 780 and aged. The rule counts the 5,000 in October (5,780 - 20 = 5,760 > 994): none for October. The 300% special-income test (CO-641) misses it the same way. Unrecorded: no OQ or precision mentions lump sums for Medicaid. | Add lump_sum_received less retroactive_social_security_lump_sum_received and retroactive_ssi_or_public_assistance_lump_sum_received (F.6.c, CO-3919, CO-3920) to the four sums. What is left the next month is a resource (liquid_resources_value already says "a lump sum still held"). Store X-LUMP. |
| NM-7 | **P1** | § 8.100.5.F.6.q; 20 CFR 416.1112(c)(9) (incorporated by H.4.e) | CO-663, ma_ssi_excluded_unearned_income (CO-2470), ma_ssi_excluded_earned_income (CO-2471), CO-1715; fact pass_set_aside_income (CO-3825), read only by Adult Financial and Colorado Works | F.6.q: "Social Security benefit payments and the accrued amount thereof to a applicant/member when an individual plan for self-care and/or self-support has been developed" is exempt. 416.1112(c)(9): "Any earned income you receive and use to fulfill an approved plan to achieve self-support". | The fact exists and two other programs exclude it, but the SSI method counts it. Scratch **X-PASS**: disabled, 40, Social Security 1,200, of which 300 is set aside under an SSA-approved PASS. The engine gives countable income 1,180 and ma_meets_ssi_income_standard false. The rule gives 880 < 994: disabled. | Subtract pass_set_aside_income in CO-2470 (unearned) and CO-2471 (earned) for a blind or disabled person (416.1112(c)(9)), and in CO-1715 and CO-4201. Store X-PASS. |
| NM-8 | **P1** (GAP) | 20 CFR 416.1112(c)(6), (c)(8) (incorporated by § 8.100.5.H.4.e) | CO-605, CO-2471, CO-1715 | (c)(6) "Earned income you use to pay impairment-related work expenses described in § 416.976, if you are disabled (but not blind) and under age 65"; (c)(8) "Earned income used to meet any expenses reasonably attributable to the earning of the income if you are blind and under age 65". | H.4.e incorporates 416.1112 (2012), but neither impairment-related work expenses nor blind work expenses has a fact or an exclusion, and no OQ records them. Countable earned income is too high for every disabled or blind worker with such expenses: the SSI-related, MSP and Working Adults Buy-In tests, and the Buy-In premium band. No household can show it, because no fact carries the expense. | Add a fact for impairment-related and blind work expenses paid in the month, and exclude it in CO-2471's order (416.1112(c): after the $65, before the one-half for IRWE; after the one-half for blind work expenses). |
| NM-9 | **P1**; stopping rule | § 8.100.6.I.1.f with § 8.100.6.A.1; 42 U.S.C. 1383c(d)(2); 42 CFR 435.138 (D-31) | ma_disabled_widow_eligible (CO-1162), ma_protected_group_category (CO-1163); **OQ-209** | I.1.f "meet all other Medical Assistance requirements". A.1: "Refer to section 8.100.5 of this volume for income and resource criteria for these categories." 1383c(d)(2): deemed an SSI recipient "for so long as such person (i) would be eligible for such supplemental security income benefits ... in the absence of benefits described in paragraph (1)(A)". 435.138(a): "deemed to be title XVI payment beneficiaries under section 1634(d)". | CO-1162 tests no resource or income standard. OQ-209 classes that as a state policy choice "checked" against § 8.100.6 alone. The federal texts, one of them already fetched (D-31), make the group an SSI-recipient group: SSI resources, and income apart from the widow(er)'s benefit. Scratch **X-DWB**: widowed, 55, disabled, lost SSI to widow's benefits, $40,000 savings. The engine gives ma_disabled_widow_eligible true and ma_protected_group_category disabled_widow, while ma_meets_ssi_resource_standard is false. The rule gives none. | Require ma_meets_ssi_resource_standard, and countable income with the widow(er)'s benefit disregarded below the FBR (the DAC shape of CO-1160), in CO-1162. Close OQ-209's first half as answered by 1383c(d)(2) and 435.138; keep the closed-cohort half (§ 8.100.6.F-H). Store X-DWB. |
| NM-10 | **P1**; stopping rule | § 8.100.5.H.3.a (lead-in and ii), H.3.b.iii; 42 U.S.C. 1382c(f)(2)(A) (D-45:225); 20 CFR 416.1165 and 416.1202(b) (D-53, D-54) | ma_ssi_countable_earned_income (CO-605), ma_ssi_countable_unearned_income (CO-606), CO-608; **OQ-83** | H.3.a: "The allocation reduces the gross income that is deemed available to the applicant/client." H.3.a.ii: "An Ineligible Parent(s) Allocation ... used to meet the needs of the ineligible parent(s) in the home with an applicant/client child." 1382c(f)(2)(A): a child's income and resources "shall be deemed to include any income and resources of a parent ... living in the same household". | OQ-83 is classed "state policy choice": "No part of a parent's income is counted for a child". It was checked against § 8.100.5.H only ("no published rule settles it"). H.3.a says income is deemed to the applicant child. 1382c(f)(2)(A), in the fetched D-45, and 416.1165, in the fetched D-53, state whose income and how it is divided. Neither parental income nor parental resources reaches the child. Scratch **X-DEEM**: disabled child of 10 living with a parent earning 8,000 a month who holds 1,500. The engine gives countable income 0, resources met and category disabled. Under 416.1165: (8,000 - 20 - 65) / 2 - 994 = 2,963.50 deemed > 994: none (Children's Buy-In instead). | Deem an ineligible parent's income (416.1165, after the H.3 allocations) and resources (416.1202(b), above the parent's own limit) to an applicant child under 18 living with the parent. Reclass OQ-83 as answered by text, or keep it open only for the one choice the texts leave. Store X-DEEM. |
| NM-11 | **P1** | § 8.100.6.N.4.d | ma_qi_eligible (CO-615), ma_msp_category (CO-617) | "In order to qualify as a Medicare Qualifying Individual 1, the individual must ... d. he/she cannot otherwise be eligible for Medical Assistance." | CO-615 reads "otherwise eligible" as SSI-related, MAGI or long-term care only. The protected groups (Pickle, DAC, disabled widow(er)s, 1619(b)), both Buy-In programs and OAP SISC B are left out, though the volume states the full test as ma_has_full_coverage_category (CO-1176), and QDWI (CO-616, O.4) already reads it. Scratch **X-QI**: disabled, 40, Medicare Part A, wages 3,400 (countable 1,657.50 = 124.6% FPL). The engine gives ma_buy_in_category working_adults_with_disabilities and ma_msp_category qi. The rule gives no QI-1. | Replace CO-615's three exclusions with [not, ma_has_full_coverage_category] (check for a cycle: CO-1176 reads no MSP item), and correct the precision. Store X-QI. |
| NM-12 | **P1** | § 8.100.7.B.1.c; § 8.100.6.P.1.c | ma_ltc_unmet_requirement (CO-3310), ma_ltc_eligibility_status (CO-652) | B.1: "HCBS or PACE shall be provided to persons who ... c. are eligible under the Medicaid Buy-In Program for Working Adults with Disabilities". P.1.c: "Resources are not counted". | CO-653 lets the Buy-In route into HCBS bypass the 300% and resource tests, but the outcome does not. CO-3310 tests ma_meets_special_income_group and ma_meets_ltc_resource_standard for every applicant before the requested setting, so a Buy-In worker above 300% of the FBR, or with more than $2,000, is reported ineligible_income or ineligible_resources. Scratch **X-WAWDHCBS**: disabled, 40, wages 4,000 (Buy-In countable 1,957.50 = 147% FPL), designated for EBD with level of care. The engine gives ma_hcbs_waiver_eligible true and ma_buy_in_category working_adults, but ma_ltc_eligibility_status ineligible_income. The rule gives eligible_hcbs. The same applies to an SSI or 1619(b) person (B.1.a) with gross income above 300% of the FBR. | In CO-3310, skip the special-income and resource arms when the person reaches the requested waiver through B.1.a or B.1.c (the CO-653 arms), and keep them for the B.1.b route. Store X-WAWDHCBS. |
| NM-13 | **P1** | § 8.100.7.B.2.c | ma_is_long_term_care_applicant (CO-1631), ma_asset_transfers_verification_is_pending (CO-1637), CO-1634, CO-1635, CO-1638, CO-1639 | "The requirements at 8.100.7.B.2.a and 8.100.7.B.2.b [disclose and document transfers, annuities, trusts] do not apply to individuals who have been determined eligible under the Medicaid Buy-In Program for Working Adults with Disabilities". | CO-1631 makes every aged, blind or disabled person designated for a waiver a long-term care applicant, so a Buy-In worker on HCBS owes the transfer, trust and annuity documents. In X-WAWDHCBS, ma_is_long_term_care_applicant is true and ma_asset_transfers_verification_is_pending turns on asset_transfer_verification_document_received. Without the document the case reads pending and then past_due. | Exclude a person in the Working Adults Buy-In (ma_buy_in_category working_adults_with_disabilities, or ma_is_in_buy_in_program) from CO-1631's B.2.a documents. Keep the 30-day stay document (A.2.c), which is not a B.2.a document. |
| NM-14 | **P1** | § 8.100.7.T.1.b, T.1.e | ma_patient_payment (CO-658); fact ma_institutionalized_spouse_refuses_income_allowance (CO-1949), read only by ma_csra_increased (CO-1977) | T.1.b: "A Monthly Income Allowance (MIA) for the community spouse, but only to the extent that income of the institutionalized spouse is actually made available to, or for the benefit of, the community spouse". T.1.e: "If the institutionalized spouse fails to make his/her income available to the community spouse ... that income shall be applied to the cost of care". | CO-658 deducts the full community spouse income allowance whenever ma_ltc_couple is true. Scratch **X-REFUSE** (CO-112 with the refusal fact true) gives patient payment 815.34 in November, the same as CO-112. The rule gives 2,489.64 - (60 + 202.90 + 40) + 300 = 2,486.74. | Deduct the allowance only when it is made available (case on CO-1949, or an amount-made-available fact if partial payment is possible). Store X-REFUSE. |
| NM-15 | **P1** | § 8.100.7.R.3 (42 U.S.C. 1396r-5(d)(5)) | ma_community_spouse_income_allowance (CO-656), CO-658, CO-1977; fact ma_court_ordered_transfer_to_community_spouse (CO-1950) | "If a court has entered an order against the institutionalized spouse for monthly support of the community spouse, the MIA shall not be less than the monthly amount ordered by the court." | CO-656 is MMMNA less income, with no floor. The court-ordered monthly support is stated (CO-1950, "for the monthly support of the community spouse"), but only CSRA branch (c) reads it. Scratch **X-COURT** (CO-112 with a 2,500 order): the allowance stays 1,671.40 and the patient payment 815.34. The rule gives an allowance of 2,500 and a patient payment of 300 (the long-term care insurance only). | CO-656 = max(MMMNA - income, court-ordered monthly support). Check that CO-1950's meaning serves both M.1.c and R.3, or split the fact. Store X-COURT. |
| NM-16 | P2 | § 8.100.5.M.2.a.ii, M.3.f | CO-650, CO-800 | M.2.a.ii: the home's equity "must have an equity value that ... Is less than" the indexed limit; M.3.f counts "an individual's home if the individual's equity interest in the home exceeds the equity value limit". Both sit in the general aged, blind and disabled resource rules. | The volume applies the equity limit only to long-term care (CO-650 in CO-651). That is the federally sound reading: 1396p(f) is an LTC rule, and 42 CFR 435.601 bars an SSI-related methodology more restrictive than SSI, which excludes the home at any value. But the literal state text applies it to every ABD category, and neither an OQ nor a precision records the reading. | Record an OQ (state text against 1396p(f) and 435.601), with the LTC-only reading as the assumption, and say so in CO-650's precision. |
| NM-17 | P2; stopping rule | § 8.100.6.E.3 | ma_pickle_countable_income (CO-1158), ma_pickle_eligible (CO-1159); OQ-207 | "This disregard must also be applied to any OASDI cost of living increases paid to any financially responsible individual such as a parent or spouse". | OQ-207 is "Resolved" but its body says the spouse's and parent's increases "remain unmodeled", because no fact states them. A clear rule is left unmodeled inside a closed question. A Pickle couple whose spouse's COLAs raise the couple's income over the FBR is reported ineligible. | Reopen the E.3 half as a needs-fact gap: add the spouse's OASDI when the person lost SSI or OAP, and subtract the spouse's cumulative COLAs in CO-1158. |
| NM-18 | P2 | § 8.100.7.L; M.1 | ma_spousal_resources_at_snapshot (CO-888), ma_csra (CO-646) | L: "An assessment ... shall be completed at the time of initial Medical Assistance application". M.1: "based on the total resources owned by the couple as of the time of Medical Assistance application. The CSRA is established at intake only". | CO-888's meaning is the resources "at the start of the institutionalized spouse's first continuous period of institutionalization", the federal 1396r-5(c)(1)(A) snapshot. Colorado's text dates it at application. When the two differ, the CSRA differs. | Restate CO-888 as of the application (L, M.1), and add the federal snapshot date's tension to OQ-126. |
| NM-19 | P2 (GAP) | § 8.100.7.M.3, M.4 | CO-647, CO-648 | M.3: if the CSRA transfer "is not completed within this time period, the resources shall be attributed to the institutionalized spouse". M.4.a-c: resources the community spouse controls do not make the institutionalized spouse ineligible where support rights are assigned or denial would be an undue hardship. | Neither the transfer deadline (eligibility at the next redetermination) nor M.4's protection has an item or an OQ. | Add facts (CSRA transfer completed by the deadline; M.4 assignment or hardship) and read them in CO-647, or record them as an OQ. |
| NM-20 | P2 (carried, sharpened) | § 8.100.7.E.4.a, E.5.a-b, E.6.d.iv-v; H.2.a.ii, H.2.b.ii; I.2.b and I.4-6 (resource treatment); § 8.100.5.E.8 | CO-800, liquid_resources_value (CO-3390), real_property_other_than_home_equity (CO-3393); has_trust_interest (CO-1577), owns_annuity (CO-1579) | E.4.a: a revocable trust's "corpus of the trust shall be considered resources available to the individual"; I.2.b: an annuity "is a countable resource if it has not been annuitized"; H.2.b.ii.2: a life estate on countable property is a countable resource. | The earlier passes called these caseworker findings (their P2-3). The transfer half is carried (CO-824, CO-825). The resource half is not: CO-1577 and CO-1579 are yes/no verification triggers, and no resource fact's meaning says where the Department's finding of an available trust corpus, a revocable annuity or a life estate value goes. CO-3390 lists only accounts and securities "the person" holds. | Add one supplied amount, "trust, annuity and life-estate value the Department finds available" (E.7.c), read it in CO-800, and say so in the colorado-notes. |
| NM-21 | P2 | § 8.100.7.F.2.d | ma_transfer_penalty_applies (CO-660), ma_transfer_penalty_days (CO-659) | "The period of ineligibility shall also include partial months, which shall be calculated by multiplying 30 days by the decimal fractional share of the partial month." | CO-660 tests only whole months. A transfer worth less than one month of the divisor (under $10,814.64 in 2026) never stops long-term care eligibility, and the last partial month of a longer penalty is ignored. CO-659 reports the days, but no outcome reads them. The precision states it; no OQ does. | Record an OQ (month-level outcome against day-level penalty), or report the partial-penalty month in ma_ltc_eligibility_status. |
| NM-22 | P2 | § 8.100.7.B.1.a | ma_hcbs_waiver_eligible (CO-653) | "a. are SSI (including 1619b) or OAP Medicaid eligible". | CO-653's routes are LTC financial eligibility, ma_is_ssi_related_eligible and the Working Adults Buy-In. A 1619(b) person (retains_ssi_status_without_payment) and an OAP SISC B person (CO-1177) are not routes. 1619(b) earnings can exceed 300% of the FBR, and a child's waiver (CES, CHRP, CwCHN) has no Buy-In route. | Add retains_ssi_status_without_payment and ma_oap_sisc_b_eligible to CO-653's any(). |
| NM-23 | P2 | § 8.100.5.F.6.c, j, l, o, p, y, z | CO-663, CO-2470, CO-2471; other_unearned_income_nontaxable (CO-030) | F.6 exempts: c) retroactive SSI and Title II lump sums for nine months; j) "Assistance from other agencies and organizations"; l) "Payments received for providing foster care"; o-p) WIA and youth employment payments; y) "General Assistance, SSI, OAP-A and ... TANF"; z) decennial Census wages. | None of these has an exclusion in the SSI method. other_unearned_income_nontaxable, which CO-663 counts in full, names "general assistance" in its meaning. F.6.c matters once NM-6 counts lump sums. | Add the exempt kinds to CO-2470 and CO-2471, or state in CO-030's meaning that F.6-exempt receipts are not entered for Medicaid. |
| NM-24 | P2 | § 8.100.5.F.6.y; F.5 | CO-663, CO-641 | F.6.y exempts "General Assistance, SSI, OAP-A and ... TANF". OAP-B, AND-SO, AND-CS and AB grants are not named. | The SSI method never reads adult_financial_cash_income, so AND and OAP-B grants are excluded with no recorded reason. CO-641 (gross LTC income) does count them. | Record the reading in an OQ (AND as "General Assistance", OAP under one category per OQ-111), or count the unnamed grants. |
| NM-25 | P2 | § 8.100.5.H.1.b against F.5.k | ssi_in_kind_support_and_maintenance (CO-802) | H.1.b: "For a person living in the household of another and not paying shelter costs, one third of the Federal Benefit Rate (FBR) is counted as in-kind income". F.5.k.ii: "should not be greater than one third of the [FBR]. Use the Presumed Maximum Value (PMV) of 1/3 of the recipient's portion of the rent". | CO-802 takes min(shelter costs paid by others, FBR/3). H.1.b counts a flat FBR/3 for a person in another's household who pays nothing. The two paragraphs conflict, and no OQ records which governs. | Record an OQ. 416.1131 (the one-third reduction) supports H.1.b for a person living in another's household all month. |
| NM-26 | P2 | 20 CFR 416.1112(c)(2), (c)(10) (incorporated by H.4.e) | CO-2471 | (c)(2) "The first $30 of earned income received in a calendar quarter if you receive it infrequently or irregularly"; (c)(10) AmeriCorps payments. | Neither is carried, and no OQ records them. | Add both to CO-2471, or record an OQ. |
| NM-27 | P2 | § 8.100.5.M.3.d; N.5; M.2.k; M.3.j; J.1 | liquid_resources_value (CO-3390), retirement_accounts_value (CO-3392), other_unearned_income_taxable (CO-1714) | M.3.d: "All funds in a joint account are presumed to be a resource of the applicant". N.5.a-b: the account's value is "gross value ... less any taxes due", or 20% off when the taxes are unknown. M.2.k: ABLE accounts excluded. M.3.j: investment jewelry and collectibles countable. J.1: net rental income after taxes, insurance, maintenance and management. | The shared facts' meanings diverge from Medicaid's valuation. CO-3390 says "the person's share of a jointly held" account. CO-3392 says the value "the person could withdraw". No fact excludes ABLE accounts or states investment personal property. CO-1714 says "rents", not net rents. | State Medicaid's valuation in each fact's precision (or add Medicaid-specific facts), and add the missing two. |
| NM-28 | P2 (GAP) | § 8.100.5.E.5-7; § 8.100.7.V.2.c | (none) | E.6: "Resources will be considered available and Medical Assistance shall be denied or terminated if the applicant or client refuses or fails to make a reasonable effort to secure potential resources or income." V.2.c: refusing to release the patient payment "shall be deemed a failure to cooperate" and benefits discontinued. | No item, no OQ. | Add a supplied finding for each and read it in the outcomes, or record both as an OQ. |
| NM-29 | P2 (GAP) | § 8.100.7.V.4.a.iii-vi | CO-658 | The patient payment "may be reduced" when the resident's funds are committed elsewhere in the admission month (iii, iv, vi) or needed on discharge (v). | No item, no OQ. The admission-month patient payment is overstated in those cases. | Add a supplied "funds committed elsewhere this month" amount, or record an OQ. |
| NM-30 | P2 | § 8.100.5.C.4 | ma_ssi_related_category (CO-612), CO-4101 | For retroactive months: "b. Meet the Social Security Administration definition of disability by: i) Being approved as eligible to receive either SSI or SSDI, on or prior to the date of a medical service; or ii) Having a disability onset date determined on or prior to the date of a medical service". | meets_ssa_disability_criteria is undated, so a retroactive month before the onset date reads disabled. The final3 P3-1 note in the meanings covers the coverage period, not this condition. | Add a disability onset date and test it in the retroactive months, or record an OQ. |
| NM-31 | P3 | § 8.100.5.H.4.d; 416.1112(c)(3) | CO-2471, CO-3379, CO-3380 | H.4.d: "The first $400 ... The exemption cannot exceed $1,620 in a calendar year." | These are 416.1112's pre-2001 figures (Table 1). The incorporated 2012 text indexes them from 2002 ((c)(3)(i)), and the volume uses SSA's 2026 figures ($2,410 / $9,730). The result is correct, but no item cites H.4.d or explains the gap. | Cite H.4.d in CO-2471 and say why the indexed amounts govern. |
| NM-32 | P3 | § 8.100.7.A.2.e | ma_meets_special_income_group (CO-642) | "Are in a Long-Term Care institution (excluding hospital) whose gross income exceeds the 300% level and who establishes an income trust". | The trust arm does not exclude a hospital patient. E.6.a.i extends income trusts to HCBS, which the volume follows. | Exclude residence_setting_type hospital from the trust arm, or note the reading. |
| NM-33 | P3 | § 8.100.5.M.2.f, M.3.l | CO-800, life_insurance_face_value (CO-3397) | "...if the total face value of all life insurance policies does not exceed $1,500 on any person". | The test is per insured person; CO-800 tests the owner's total face value. These are the same except for policies on others' lives. | Note the reading in CO-3397. |
| NM-34 | P3 | § 8.100.7.A.2.c.i-iii | ma_is_institutionalized (CO-640) | Death before the 30th day counts with a physician or case manager statement and documentation from the first 15 days. | CO-640's precision says this is not modeled, with no OQ. expects_institutional_stay_of_thirty_days, read as the physician's statement, covers it. | Say so in the precision. |
| NM-35 | P3 | § 8.100.7.A.2.d | CO-640, CO-652 | "Are in a facility eligible for Medical Assistance Program reimbursement". | Not tested; resides_in_medical_institution does not say the facility is certified. | Add it to the fact's meaning. |

## 3. Coverage matrix

Key: **C** = carried by (identifier, CO-id); **NA** = not applicable, with the reason; **OQ** = the open question that records a state choice; **GAP** = no item and no recorded reason (NM-n). A row lists every lettered or numbered subparagraph down to the level that states a condition, figure, computation, exception, period or verification requirement. Where a list's subparagraphs share one disposition they share a row (for example "g.i-vi").

### 3.1 § 8.100.5.A-E: application, verification, effective date, estate recovery, availability

| paragraph | disposition |
|---|---|
| 5.A.1 | NA: the site takes the application and screens every ABD category; the SSI referral is procedure. The screening is the outcome items themselves (CO-612, CO-617, CO-622, CO-652, CO-1163). |
| 5.A.1.a | C: meets_ssa_disability_criteria (CO-011), the state contractor's determination. The disability application form itself is NA (procedure). |
| 5.A.1.b | NA: forwarding to the contractor (procedure). |
| 5.A.1.c | C: ma_wawd_limited_disability_finding (CO-2820), ma_wawd_is_disabled (CO-806). |
| 5.A.1.d | NA: COVID-19 PHE continuation, ended May 11, 2023. |
| 5.A.2 | NA: application form. |
| 5.B.1 (lead-in) | C: ma_verification_status (CO-1415), ma_pending_verification_count (CO-1411), ma_required_verification_count (CO-1412). |
| 5.B.1.a | C: ma_requires_verification_of_ssn (CO-1401), ssn_exception_applies (CO-1312), ma_ssn_verification_is_pending (CO-1623). |
| 5.B.1.a.i, i.1 | NA: PHE self-attestation, ended. i.1's emergency-only rule is C: ma_is_emergency_medicaid_only (CO-510), ma_meets_requirements_other_than_status (CO-1150). |
| 5.B.1.b | C: CO-1395, CO-1398, CO-1620, CO-1621 (the § 8.100.3.H rules are the other review's scope). |
| 5.B.1.c (lead-in, electronic sources, ROP) | C: ma_requires_verification_of_earned_income (CO-1403), ma_income_reasonable_opportunity_days (CO-1349), CO-1413, CO-1414. |
| 5.B.1.c.i-iii (compatibility) | C: ma_abd_income_is_reasonably_compatible (CO-1640), ma_reasonable_compatibility_threshold_pct (CO-1350); OQ-302 ("20% of what"). |
| 5.B.1.c.iii, iv PHE text | NA: ended; the post-PHE policy is in CO-1640's both-above arm and CO-1403. |
| 5.B.1.c (self-employment ledgers; wage stubs; one stub; prior month) | C: CO-1403's self-employment arm (ledger questionable only), earned_income_verification_document_received (CO-1316). The kinds of document accepted are NA (evidence form). |
| 5.B.1.c.v | NA: PHE, ended. |
| 5.B.1.d | C: ma_requires_verification_of_unearned_income (CO-1404), ma_has_unearned_income_for_verification (CO-2870): this month or the month before. |
| 5.B.1.d.i | NA: PHE, ended. |
| 5.B.1.e (and AVP sentence) | C: ma_requires_verification_of_resources (CO-1405), resources_are_verified (CO-1362), ma_resources_verification_is_pending (CO-1626). |
| 5.B.1.e.i | NA: PHE, ended. |
| 5.B.1.f | C: ma_immigration_status_verification_is_pending (CO-1622), CO-510. |
| 5.B.1.g | C: the *_attestation_is_questionable facts read by CO-1403-CO-1405. |
| 5.B.1.h | NA: case-file documentation. |
| 5.C.1.a-b | C (partial): ma_month_is_before_coverage_period (CO-4101) for OAP and MAGI. For the ABD outcomes, the meanings state they test the month's criteria only (final3 P3-1). |
| 5.C.2 | C: § 8.100.7.A-B rows below. |
| 5.C.3 | NA: a whole-month rule; the volume evaluates whole months. |
| 5.C.4.a-c | C (partial): CO-4101, CO-557. **GAP NM-30** for 4.b.i-ii (disability approved, or onset, on or before the date of service). |
| 5.D.1.a-c | NA: estate recovery information notice. |
| 5.E (lead-in) | NA: payer of last resort (policy statement). |
| 5.E.1 | C: the monthly income facts (CO-023, CO-025 to CO-030, CO-1714). |
| 5.E.2 | C: ma_ssi_household_size (CO-604), ssi_countable_resources_couple (CO-801), CO-605, CO-606, CO-663; exceptions at 7.C. |
| 5.E.3.a-c | C: the resource facts are the person's available holdings (CO-3390, CO-3392, CO-3393). |
| 5.E.4 | C: as 5.E.3 (caseworker valuation). |
| 5.E.5 | NA: evidence and timing of efforts. |
| 5.E.6 | **GAP NM-28**. |
| 5.E.7 | NA: notice. |
| 5.E.8 | C: has_trust_interest (CO-1577), ma_requires_verification_of_trust (CO-1634). Effect: see 7.E (NM-20). |
| 5.E.9, 9.a-c | NA: unknown assets are caseworker valuation of CO-3390 in and after the month of discovery; 9.b is overpayment (§ 8.065) and 9.c is repayment. |

### 3.2 § 8.100.5.F-G: income

| paragraph | disposition |
|---|---|
| 5.F.1 | NA: scope statement (ABD, LTC, WAwD premiums). |
| 5.F.2 | C: month-scoped income facts, evaluated for the month. |
| 5.F.3 | C: the spouse and holds_out_as_spouse_with edges read in CO-604, CO-605, CO-663 (S1955). |
| 5.F.4 (month received; resource the next month) | C: income facts for the month; liquid_resources_value the next month. |
| 5.F.4.a | C: wages_gross (CO-023). |
| 5.F.4.b | C: ma_self_employment_net_earnings (CO-1704). |
| 5.F.4.c-d | C: wages_gross (workshop pay); royalties and honoraria fall in wages or other_unearned_income_taxable. NA beyond that (fact assignment). |
| 5.F.5 (lead-in, gross, cash or in kind) | C: the gross unearned facts summed in CO-663. |
| 5.F.5.a | C: other_unearned_income_* (caseworker nets last-illness and burial costs). |
| 5.F.5.b | C: other_unearned_income_taxable / _nontaxable. |
| 5.F.5.c | C for recurring gifts (CO-030). **GAP NM-6** for lump-sum gifts and inheritances. |
| 5.F.5.d-e | C: other_unearned_income_taxable (CO-1714), tax_exempt_interest (CO-081). |
| 5.F.5.f | **GAP NM-6** (lump_sum_received unread). |
| 5.F.5.g-h | C: CO-1714, pension_income (CO-026). |
| 5.F.5.i | C: lottery_gambling_winnings_received (CO-1181) in CO-663, CO-641, CO-1715, CO-4201. |
| 5.F.5.i.1.a-b | C: ma_lottery_winnings_hardship_exemption_granted (CO-2222). The 30-day request is NA (procedure). |
| 5.F.5.j.i-vii | C: pension_income, social_security_income, CO-030 (workers' compensation, VA, alimony), unemployment_income. A&A and UME are excluded by 5.K (CO-641). |
| 5.F.5.k.i-ii | C: ssi_in_kind_support_and_maintenance (CO-802), shelter_costs_paid_by_others, ssi_presumed_maximum_value_fbr_divisor (CO-3406). Conflict with H.1.b: **NM-25**. |
| 5.F.6 (lead-in) | C: ma_ssi_excluded_unearned_income (CO-2470), ma_ssi_excluded_earned_income (CO-2471). |
| 5.F.6.a | C: loan_proceeds_received (CO-3362) in CO-2470. |
| 5.F.6.b | C: in-kind meals are not an income fact (not counted). |
| 5.F.6.c | C (after NM-6): CO-3919, CO-3920 exist; **NM-23**. |
| 5.F.6.d-e | C: not income facts (food in kind). |
| 5.F.6.f | C: federally_excluded_payments_received (CO-3366, Uniform Relocation Act). The 6-month replacement-dwelling exemption is caseworker valuation. |
| 5.F.6.g.i-vi | C: housing assistance is not an income fact; ISM reads only shelter others pay. |
| 5.F.6.h, i | C: CO-3366 (Indian judgment funds, ANCSA). ANCSA's $2,000 cap is P3, inside the fact. |
| 5.F.6.j | **GAP NM-23**. |
| 5.F.6.k | C: CO-3366 (disaster). |
| 5.F.6.l | **GAP NM-23**. |
| 5.F.6.m | C: CO-3366 (Domestic Volunteer Service Act below minimum wage). |
| 5.F.6.n | C: energy_assistance_received in CO-2470. |
| 5.F.6.o, p | **GAP NM-23**. |
| 5.F.6.q | **GAP NM-7** (pass_set_aside_income unread). |
| 5.F.6.r, s, v, x | C: CO-3366. |
| 5.F.6.t | C: the SSI method counts no child's income except against the child allocation (CO-2277). P3: not cited. |
| 5.F.6.u | C: tax_refunds_and_credits_received in CO-2470. The resource exemption for the month and the next is caseworker valuation. |
| 5.F.6.w | C: a reimbursement is not an income fact. |
| 5.F.6.y | C: receives_ssi and tanf_cash_income are not read in CO-663. **NM-23** (GA inside CO-030), **NM-24** (AND, OAP-B). |
| 5.F.6.z | **GAP NM-23**. |
| 5.F.6.aa-cc | C: educational_assistance_received (CO-3360) in CO-2470. |
| 5.F.6.dd | NA: ARRA $25 FAC, expired 2010. |
| 5.G.1 | NA here: OAP sponsor deeming is part of Adult Financial's OAP determination (CO-2386). Medicaid reads OAP receipt (CO-2710). § 8.100.3.K is the other review's scope. |

### 3.3 § 8.100.5.H-L: allocations, disregards, ownership, property income, VA, reverse mortgages

| paragraph | disposition |
|---|---|
| 5.H.1 (scope; not HCBS or LTC) | C: CO-605, CO-606 for SSI-related, OAP, MSP; CO-1715 (WAwD); CO-4202 (CBwD); CO-641 is gross for LTC. |
| 5.H.1 (WAwD spouse's income) | C: ma_wawd_countable_income (CO-1715). |
| 5.H.1.a | C: ma_ssi_household_size (CO-604), CO-663. |
| 5.H.1.b | C: CO-802, ma_is_ssi_unemancipated_child (CO-2275); **NM-25**. |
| 5.H.2.a.i-ii | C: CO-2275, ma_ssi_unemancipated_child_age_limit (CO-2273), ma_ssi_unemancipated_student_age_limit (CO-2274), ma_is_regularly_attending_school_or_training (CO-2272). |
| 5.H.2.b-c | C: ma_is_applying_for_or_eligible_for_ssi (CO-2271). |
| 5.H.3 (lead-in), 3.a (deemed income) | **P1 NM-10** (no parental deeming; OQ-83). |
| 5.H.3.a.i | C: ma_ssi_ineligible_child_allocation (CO-2277), CO-2276; OQ-473 (whose income bears it). |
| 5.H.3.a.ii | **P1 NM-10** (OQ-83). |
| 5.H.3.a.iii | C: CO-2277 is taken only from an ineligible spouse or parent (OQ-473). |
| 5.H.3.b.i | C: ma_ssi_child_allocation_from_spouse_unearned (CO-2278), then _earned (CO-2279). |
| 5.H.3.b.ii | C: CO-2281 and CO-605 apply the allocation before the disregards. |
| 5.H.3.b.iii | **NM-10** (no parent allocation without deeming). |
| 5.H.4.a.i | C: ssi_general_income_exclusion (CO-230), CO-606; SSI is not in CO-663. |
| 5.H.4.a.ii | C: CO-605 (unused $20 to earned income). |
| 5.H.4.a.iii | C: one $20 on the couple's pooled income (CO-606, CO-605). |
| 5.H.4.b.i.1-3 | C: ssi_earned_income_exclusion (CO-231), ssi_earned_income_disregard_rate (CO-232), CO-605. |
| 5.H.4.c | C: ma_ssi_household_unearned_income_counted (CO-2281), ma_ssi_child_support_reduction_divisor (CO-2280). |
| 5.H.4.d | C: CO-2471, CO-3387, CO-3379, CO-3380 (indexed figures); **P3 NM-31**. |
| 5.H.4.e | Incorporates 20 CFR 416.1112: see 3.9. |
| 5.I.1-3 | C: each person's own income facts (ownership is fact assignment). |
| 5.I.4 | C: ma_community_spouse_income (CO-2467) leaves out income from the institutionalized spouse. |
| 5.J.1.a-c | C (partial): other_unearned_income_taxable (CO-1714) for rents; **NM-27** (net, not gross). |
| 5.J.2, J.3 | **GAP NM-4**. |
| 5.K (lead-in) | C: ma_ltc_gross_income (CO-641), receives_va_aid_and_attendance (CO-836), va_aid_and_attendance_amount (CO-837). The SSI method never counts A&A (it is not in CO-663's facts). |
| 5.K.1.a-b | C: CO-658 does not add A&A back; CO-4103. |
| 5.K.2 | C: ma_va_aid_and_attendance_is_patient_payment (CO-4103), resides_in_state_veterans_home (CO-4102); OQ-720 ("dependents"). |
| 5.L.1 | C: CO-3362's meaning leaves out reverse mortgages; no income fact names them. |
| 5.L.2 | C: liquid_resources_value the next month. |
| 5.L.3 | C: uncompensated_transfer_value_in_lookback (CO-824). |

### 3.4 § 8.100.5.M-P: resources

| paragraph | disposition |
|---|---|
| 5.M.1 (definition; $2,000/$3,000) | C: ssi_resource_limit_individual (CO-233), ssi_resource_limit_couple (CO-234), ma_meets_ssi_resource_standard (CO-610), CO-608. |
| 5.M.1 (MSP limits, CPI) | C: ma_msp_resource_limit_individual (CO-807), _couple (CO-808), 2025 and 2026 versions (D-280, D-74). |
| 5.M.1 (no resources for Buy-In) | C: CO-618, CO-620 read no resource item. |
| 5.M.2.a (lead-in: home exempt) | C: CO-800 leaves out home_equity. |
| 5.M.2.a.i | C: one home_equity fact per person; P3, not cited. |
| 5.M.2.a.ii.1-2 | C for LTC: ma_home_equity_limit (CO-831), ma_home_equity_disqualifies (CO-650). Non-LTC: **NM-16**. |
| 5.M.2.a.iii | **GAP NM-5** (residency). |
| 5.M.2.a.iv-xi | **GAP NM-5** (intent to return, written documentation, a spouse or dependent relative in the home: CO-889 covers only the equity-limit exception). |
| 5.M.2.a.xii | **GAP NM-5**. |
| 5.M.2.a.xiii, xiii.1 | **GAP NM-5**. |
| 5.M.2.a.xiv | **GAP NM-5**. |
| 5.M.2.b, b.i-iv | **P1 NM-2** (ma_excess_real_property_is_for_sale, CO-2242, unread by resources). |
| 5.M.2.b.v | C: ma_requires_verification_of_sale_efforts (CO-2246), ma_sale_efforts_verification_is_pending (CO-2247), sale_efforts_verification_document_received (CO-2243). |
| 5.M.2.b.vi | NA once NM-2 is fixed: the spousal rules apply to the same resources. |
| 5.M.2.b.vii | C: after the sale the proceeds are liquid_resources_value (5.P). |
| 5.M.2.c | C: transportation_vehicle_equity_value (CO-3395) subtracted in CO-800. |
| 5.M.2.d.i-iii, e.i-iv | C: CO-800 reads no household-goods or personal-effects fact (excluded). |
| 5.M.2.f, M.3.l | C: life_insurance_face_value (CO-3397), life_insurance_cash_surrender_value (CO-3396), ssi_life_insurance_face_value_exclusion_limit (CO-3398) in CO-800; **P3 NM-33**. |
| 5.M.2.g | C: term or burial insurance has no cash surrender value. |
| 5.M.2.h | C: burial spaces are not read by CO-800. |
| 5.M.2.i | C: irrevocable burial funds are not read. |
| 5.M.2.j, j.i-ii | **P1 NM-1**. |
| 5.M.2.k | **NM-27** (ABLE accounts). |
| 5.M.3.a-c | C: liquid_resources_value (CO-3390). |
| 5.M.3.d, d.i-iii | **NM-27** (fact says "share"); the rebuttal documents are NA (evidence). |
| 5.M.3.e | **GAP NM-5** (beneficiary deed). |
| 5.M.3.f | C for LTC (CO-650); **NM-16**. |
| 5.M.3.g | **GAP NM-4**. |
| 5.M.3.h, h.i-iii.1-4 | C: ma_claims_co_owner_hardship_for_real_property (CO-2244), CO-2248, CO-2249, joint_ownership_verification_document_received (CO-2245). The exemption's effect: **P1 NM-2**. |
| 5.M.3.i | C (P3): a mobile home falls under vehicles_equity_value (CO-3394, "trailers") or real property; the meaning does not say. |
| 5.M.3.j | **NM-27**. |
| 5.M.3.k | C: vehicles_equity_value minus transportation_vehicle_equity_value. |
| 5.M.3.m.i-iii, n.i.1-3, n.ii, o.i-ii.1-3 | C: real_property_other_than_home_equity (CO-3393: "mortgages and promissory notes the person holds") at the valuation each paragraph states (caseworker). The transfer arms are CO-824. |
| 5.M.3.p.i-ii.1-3 | C: CO-3393 (caseworker valuation of mineral rights). |
| 5.N.1-2 | C: retirement_accounts_value (CO-3392) in CO-800. |
| 5.N.3 | **P1 NM-3**. |
| 5.N.4 | C: CO-801 through CO-647 and CO-646 for the LTC couple. |
| 5.N.5.a-b | **NM-27**. |
| 5.O.1-4 | C: caseworker valuation of liquid_resources_value (available at the end of probate, or 6 months; family allowance at 3 months); evidence is NA. Income in the month received is **NM-6**. |
| 5.P.1-3 | C: liquid_resources_value (net proceeds). The reimbursement option is NA (procedure). |
| 5.P.4 | C: caseworker valuation (proceeds intended for a replacement home within three months are left out). |

### 3.5 § 8.100.6.A-K: ABD categories, SSI, Pickle, protected groups, OAP

| paragraph | disposition |
|---|---|
| 6.A.1 | C: ma_is_aged_blind_or_disabled (CO-603), ma_is_aged (CO-600), ma_aged_age (CO-237); income and resources per 5 (the matrix above). |
| 6.B.1 | C: meets_ssa_disability_criteria (CO-011), is_blind (CO-010). |
| 6.B.2 | NA: appeal. |
| 6.C.1.a | C: receives_ssi (CO-012) in ma_is_ssi_related_eligible (CO-611), ma_ssi_related_category (CO-612). |
| 6.C.1.b | C: CO-611 (aged, blind or disabled within the SSI income and resource standards: CO-609, CO-610). Parental deeming: **NM-10**. |
| 6.C.1.c | C: receives_ssi covers presumptive and conditional SSI payments. |
| 6.C.2-5 | NA: SSA agreement, listings, notices. |
| 6.C.6 | NA: SISC code. |
| 6.C.7 | NA: date-of-eligibility procedure after an overturned SSI denial (no month outcome changes). |
| 6.C.8 | C: retains_ssi_status_without_payment (CO-1112) in ma_protected_group_category (CO-1163). |
| 6.C.9 | NA: reporting to SSA. |
| 6.C.10, 10.a.i.1-3 | NA: date-level effective date for under-21 SSI and infants; the volume is month-level (P3, not cited). |
| 6.D.1 | C: ma_pickle_countable_income (CO-1158), ma_pickle_eligible (CO-1159). |
| 6.D.2.a-c | C: lost_ssi_or_oap_due_to_social_security_benefits (CO-1108). 2.b (a COLA to a parent's or spouse's OASDI) is **NM-17**. |
| 6.E.1.a-e | C: CO-1108, social_security_income_when_ssi_or_oap_lost (CO-1109), CO-1158. |
| 6.E.2 | C: CO-1159 (strictly less than the SSI or OAP standard; af_oap_grant_standard CO-289 by af_is_oap_age CO-940). |
| 6.E.3 | **NM-17** (OQ-207). |
| 6.E.4 | C: applied each month. |
| 6.E.5 | NA: contact and application procedure. |
| 6.F.1-2.a-d, 6.G.1-3, 6.H.1.a-f | OQ-209 (closed cohorts, confirmed as a state choice in § 6). |
| 6.I.1 (lead-in, until Part A) | C: ma_disabled_widow_eligible (CO-1162), medicare_part_a_entitled (CO-803). |
| 6.I.1.a-e | C: marital_status widowed, lost_ssi_due_to_social_security_benefits (CO-1180), ma_disabled_widow_min_age (CO-1135), CO-237. |
| 6.I.1.f | **P1 NM-9** (OQ-209 misclassified). |
| 6.J.1, 1.a-b | C: ma_dac_eligible (CO-1161), receives_oasdi_as_disabled_adult_child (CO-1110), ma_dac_min_age (CO-1134), CO-1180. |
| 6.J.1.c.i-iii | C: ma_dac_countable_income (CO-1160), CO-610, FBR strictly less than. |
| 6.J.2 | C: CO-1110 (BIC "C" is the evidence). |
| 6.K.1 | C: OAP-A and OAP-B read as one OAP category (OQ-111, resolved); adult_financial_program_received (CO-2710). |
| 6.K.2-4 | C: ma_oap_sisc_b_eligible (CO-1177), CO-612 oap_sisc_b. |
| 6.K.5 | C: ma_meets_special_income_group (CO-642), ma_special_income_group_pct (CO-250); a psychiatric facility at 65 or over through CO-640 and CO-1179. |
| 6.K.6 | NA: AFDC unit (repealed program). |
| 6.K.7 | C: ma_lost_oap_to_non_oasdi_cost_of_living_adjustment (CO-2209), ma_oap_health_care_status (CO-1156). |
| 6.K.8.a-c | C: CO-1177 (B), CO-1156 (C). SISC A is the institutional case: CO-642. |

### 3.6 § 8.100.6.L-Q: MSP and Buy-In

| paragraph | disposition |
|---|---|
| 6.L.1, L.5.a-c, L.6-7 | NA: benefit description and labels. |
| 6.L.2.a | C: medicare_part_a_entitled in ma_qmb_eligible (CO-613). |
| 6.L.2.b | C: CO-807, CO-808 in CO-613. |
| 6.L.2.c | C: ma_qmb_income_limit_pct (CO-238), ma_ssi_poverty_guideline_monthly (CO-1750); at or below. |
| 6.L.2.d | OQ-624 (confirmed as a state choice). |
| 6.L.3 | C: CO-1750 by ma_ssi_household_size (CO-604). |
| 6.L.4 | C: ma_ssi_countable_income (CO-607) with the pooled $65-plus-half (CO-605). |
| 6.L.8 | C: every category is evaluated independently. |
| 6.L.9 | C: ma_meets_citizenship_requirement (CO-509) in ma_msp_category (CO-617); residency is P3 (CO-617 does not read ma_meets_residency). |
| 6.L.10 | C: ma_qmb_effective_month (CO-3622), ma_qmb_is_in_effect (CO-3623), ma_qmb_application_processing_days (CO-3621). |
| 6.L.11 | C: CO-3623 (no month before the effective month). |
| 6.L.12 | C: ma_msp_cola_disregard (CO-3629), ma_title_ii_cola_increase (CO-3627), ma_msp_december_category (CO-3628), federal_poverty_guideline_publication_date (CO-3625); OQ-622. |
| 6.M.1 | NA: benefit. |
| 6.M.2.a-c | C: ma_slmb_eligible (CO-614), ma_slmb_income_limit_pct (CO-239). The CY1993-95 bands are NA (historical). |
| 6.M.3-4 | C: as L.3-4. |
| 6.M.5-6 | C: retroactive months are those CO-557 allows; the outcome does not gate them (final3 P3-1). |
| 6.M.7 | C: CO-3629 (through the month after publication). |
| 6.N.1 | NA: benefit. |
| 6.N.2 | NA: the federal allocation and waiting list (enrollment, not eligibility). |
| 6.N.3 | C: as M.5-6. |
| 6.N.4.a-c | C: ma_qi_eligible (CO-615), ma_qi_income_limit_pct (CO-240): at least 120%, less than 135%. |
| 6.N.4.d | **P1 NM-11**. |
| 6.N.5 | C: as L.4. |
| 6.N.6 | C: CO-3629; OQ-622. |
| 6.O.1 | NA: benefit. |
| 6.O.2.a-b | C: ma_qdwi_meets_disability_work_history (CO-1157), lost_ssdi_due_to_substantial_gainful_activity (CO-1106), has_exhausted_premium_free_part_a_extension (CO-1107). |
| 6.O.2.c | C: ma_qdwi_resource_limit_rate (CO-3024) times CO-233/CO-234, at or below. |
| 6.O.2.d | C: ma_qdwi_income_limit_pct (CO-241), less than. |
| 6.O.3 | C: as L.4. |
| 6.O.4 | C: ma_has_full_coverage_category (CO-1176) in ma_qdwi_eligible (CO-616). |
| 6.O.5-6 | C: ma_qdwi_is_in_effect (CO-3624); OQ-621. |
| 6.P.1.a | C: ma_wawd_min_age (CO-244) in ma_wawd_eligible (CO-618). |
| 6.P.1.b | C: ma_wawd_countable_income (CO-1715), ma_wawd_income_limit_pct (CO-242), ma_wawd_household_size (CO-3030); at or below. NM-6, NM-7 and NM-8 also apply. |
| 6.P.1.c | C: CO-618 has no resource test. |
| 6.P.1.d | C: ma_wawd_is_disabled (CO-806). |
| 6.P.1.e | C: has_earned_income (CO-1356). e.i is NA (PHE). |
| 6.P.1.f.i-iii.1-5 | C: ma_wawd_premium (CO-619), ma_wawd_premium_table (CO-2457), ma_wawd_premium_cap_pct (CO-1800), ma_buy_in_determination_month (CO-2462). |
| 6.P.1.f.iv | C: CO-2457 is a dated parameter (OQ-82, resolved). |
| 6.P.1.f.v | C: postpartum waiver of premiums in CO-619 (ma_postpartum_coverage_end_month, CO-560). Termination for unpaid premiums: ma_buy_in_enrollment_discontinued_for_premiums (CO-2447). |
| 6.P.2 | C: CO-557 (retroactive months); program implementation is NA. |
| 6.P.3 | NA: opt-out (member's choice after enrollment). |
| 6.Q.1.a | C: ma_cbwd_max_age (CO-3026) in ma_cbwd_eligible (CO-620). |
| 6.Q.1.b.i-iv | C: ma_cbwd_household_earned_income (CO-4200), _unearned_income (CO-4201), ma_cbwd_countable_household_income (CO-4202), _pct_fpl (CO-4203), ma_cbwd_income_limit_pct (CO-243); OQ-740. NM-6 and NM-7 also apply. |
| 6.Q.1.c | C: no resource test in CO-620. |
| 6.Q.1.d | C: meets_ssa_disability_criteria. |
| 6.Q.1.e | C: CO-620 excludes an employed child of 16 to 18 (F-7 fix). |
| 6.Q.1.f | C: employer_family_coverage_employer_premium_share (CO-3630), is_enrolled_in_employer_family_coverage (CO-3631), ma_cbwd_employer_contribution_min_pct (CO-3632); OQ-623. |
| 6.Q.1.g.i-iv | C: ma_cbwd_premium (CO-621), ma_cbwd_premium_table (CO-2458), CO-2459, CO-2460, CO-2461; OQ-144. |
| 6.Q.1.g.v-vi | C: as P.1.f.iv-v (CO-2447). |
| 6.Q.1.g.vii | OQ-511 (premiums resumed?; blocked on HCPF's member notice). |
| 6.Q.2 | C: CO-557. |
| 6.Q.3 | C: ma_application_is_children_buy_in_only (CO-4206) in CO-1404 and CO-1405. |
| 6.Q.4 | NA: opt-out. |

### 3.7 § 8.100.7.A-D: long-term care eligibility

| paragraph | disposition |
|---|---|
| 7.A.1 (300% category; existing client) | C: ma_ltc_financially_eligible (CO-651), ma_ltc_eligibility_status (CO-652). |
| 7.A.1 (SEP or CMA notice) | NA: procedure. |
| 7.A.1 (gross income) | C: ma_ltc_gross_income (CO-641). NM-6 also applies. |
| 7.A.1 (child leaving parents' home) | NA while parental deeming is unmodeled (NM-10); after that fix, deeming stops the month after. |
| 7.A.2.a-b | C: ma_ltc_unmet_requirement (CO-3310), arm not_aged_blind_or_disabled (CO-603). |
| 7.A.2.c (30 days; combination of settings) | C: ma_is_institutionalized (CO-640), expects_institutional_stay_of_thirty_days (CO-822), ma_is_institutionalized_spouse (CO-644). |
| 7.A.2.c (documentation) | C: ma_requires_verification_of_institutional_stay (CO-1632), institutional_stay_verification_document_received (CO-1575), CO-1636. |
| 7.A.2.c.i-iii | C via CO-822; **P3 NM-34**. |
| 7.A.2.d | **P3 NM-35**. |
| 7.A.2.e (300%; income trust) | C: CO-642, CO-250, has_income_trust (CO-823), ma_income_trust_gross_income_limit (CO-1985); OQ-99. Hospital exclusion: **P3 NM-32**. |
| 7.A.2.e.i.1-3 | C: CO-642 for nursing facility, HCBS and PACE, and a psychiatric facility at 65 or over. |
| 7.A.2.f | C: ma_meets_ltc_resource_standard (CO-648). NM-1 to NM-5 also apply. |
| 7.A.2.g | C: ma_ltc_couple (CO-643), ma_institutionalized_spouse_countable_resources (CO-647). |
| 7.A.2.h | C: ma_transfer_penalty_applies (CO-660). |
| 7.A.2.i | C: ma_requires_verification_of_trust (CO-1634), ma_trust_verification_is_pending (CO-1638). |
| 7.A.2.j | C: ma_requires_verification_of_annuity (CO-1635), ma_annuity_verification_is_pending (CO-1639). |
| 7.A.3 | NA: Child Mental Health Treatment Act appeal. |
| 7.B.1 (lead-in: level of care; community) | C: ma_hcbs_waiver_eligible (CO-653), ma_pace_eligible (CO-654), ma_meets_designated_waiver_level_of_care (CO-1178), meets_nursing_facility_level_of_care (CO-820), ma_can_live_in_community_without_jeopardy (CO-2413). |
| 7.B.1.a | C (partial): ma_is_ssi_related_eligible in CO-653. **NM-22** (1619(b), OAP). Outcome: **NM-12**. |
| 7.B.1.b | C: CO-651 in CO-653 and CO-654. |
| 7.B.1.c, c.i | C: CO-653's Buy-In arm (EBD, CMHS, BI, CIH, SLS, DD). Outcome: **P1 NM-12**. |
| 7.B.1.c.ii | NA: contingent on federal approval (read as granted). |
| 7.B.2 (no new application) | NA: procedure. |
| 7.B.2.a.i-iii, b | C: CO-1637, CO-1634, CO-1635, CO-1638, CO-1639. |
| 7.B.2.c | **P1 NM-13**. |
| 7.B.3 | OQ-519 (ACF personal needs allowance; blocked on IM 25-030). |
| 7.C.1 | C: CO-641 is the person's own income; the community spouse's income is never added. |
| 7.C.2 (lead-in) | C: CO-604, CO-801. |
| 7.C.2.a | C: CO-647 and CO-648 give each spouse in an institution the individual limit. |
| 7.C.2.b | C: ma_excluded_from_ssi_household (CO-661). |
| 7.C.2.c | C: the § 7.K-T rows. |
| 7.C.3 | C: long_term_care_insurance_benefits_received (CO-3606) is not in CO-641 and is added in CO-658. |
| 7.C.4 | C: CO-604 and CO-605 for the living-together couple; CO-655 for Q. |
| 7.D | NA: application procedure for the state-only program. |

### 3.8 § 8.100.7.E-J: trusts, transfers, certain assets, life estates, annuities, tables

| paragraph | disposition |
|---|---|
| 7.E.1.a.i-ii, b, c | NA for an outcome: pre-1993 trusts, settled by the Department (E.7.c). The resource effect is **NM-20**. |
| 7.E.2.a-c, 3.a.i-iii, b, c.i-iv | NA: definitions of who established a trust (Department determination). |
| 7.E.4.a-b | **NM-20** (corpus as resource). Payments to the person are C: CO-1714 ("income from an estate or trust"). |
| 7.E.4.c | C: uncompensated_transfer_value_in_lookback (CO-824). |
| 7.E.5.a-b | **NM-20** (a); C: CO-1714 (b). |
| 7.E.5.c-d | C: CO-824 (value and date per E.5.d; caseworker). |
| 7.E.6.a.i (income trust) | C: CO-823, CO-642. |
| 7.E.6.a.i.a | C: CO-1985, ma_income_trust_limit_table (CO-3022), ma_ltc_private_pay_region (CO-1980), county_of_residence (CO-1979); OQ-99 (figures unverified). |
| 7.E.6.a.i.b | C: ma_income_trust_distribution (CO-2238), ma_income_trust_amount_retained_for_expenses (CO-2236), ma_income_trust_expense_retention_max (CO-2237). |
| 7.E.6.a.i.c.i-iii, d | C: ma_patient_payment_available_income (CO-3616), CO-658; OQ-471 (family allowance). |
| 7.E.6.a.i.e | C: CO-2237 caps retention at $20 (other expenses cannot be paid). |
| 7.E.6.a.i.f | C: CO-2238's HCBS cap. The HCBS member payment (PETI) has no item: recorded in OQ-96. |
| 7.E.6.a.i.g-m | NA: trust drafting, notice, remainder, accounting (validity is has_income_trust's "qualifying"). |
| 7.E.6.b.i.a, c-q | NA for eligibility except k and m-n. k: the trust is not a countable resource (C: CO-800 reads no trust value). m-n: distributions are income (C: CO-1714 / CO-030); purchases follow the resource facts. Validity (q) is a Department determination. |
| 7.E.6.c.i.a-l | As E.6.b: j (not countable) is C; k (distributions are income) is C; the rest is NA. |
| 7.E.6.c.ii | C: CO-824 / transfer_was_exempt (CO-825) (rebuttable presumption at 65 or over). |
| 7.E.6.c.iii | NA: trustee notice. |
| 7.E.6.d.i-vi | C for distributions: CO-1714. The countable-principal arm (v) is **NM-20**. |
| 7.E.6.e.i | C: receives_ssi makes the person SSI-related eligible (CO-611). |
| 7.E.6.e.ii | NA: copy to the Department. |
| 7.E.7.a-c | C: CO-1634, CO-1638. |
| 7.F.1.a-g | NA: definitions, carried into CO-824's meaning (fair market value less compensation). |
| 7.F.2 (lead-in) | C: CO-660 in CO-652 (all LTC settings). |
| 7.F.2.a | C: ma_transfer_lookback_months (CO-252, 60). The pre-2006 36 months is NA (historical). |
| 7.F.2.b | C: CO-1631 (institutional, HCBS, PACE). |
| 7.F.2.c.i | C: ma_transfer_penalty_months (CO-649), transfer_penalty_divisor (CO-832; OQ-212). |
| 7.F.2.c.ii.a-c | C: transfer_penalty_period_start_date (CO-886); OQ-94 (resolved). |
| 7.F.2.d | C: ma_transfer_penalty_days (CO-659), ma_transfer_penalty_days_per_month (CO-3023); **NM-21**. |
| 7.F.2.e | C: no maximum in CO-649. |
| 7.F.2.f-g.i-ii | C: CO-824 totals the transfers; CO-886 states non-overlap. |
| 7.F.2.h | C: the penalty is read only in CO-652, not in CO-611 or CO-1176. |
| 7.F.2.i | C: CO-824 and CO-886 are per determination. |
| 7.F.2.j.i-xi | C: CO-824 (caseworker presumption findings). |
| 7.G.1.a | C: CO-3393 (note value). |
| 7.G.1.b.i-iv, c | C: CO-824 (presumption). |
| 7.G.2.a, 3.a | C: CO-824 (outstanding balance). |
| 7.G.4.a.i-iv, b.i.a-d, ii-iii, c, e | C: CO-824 / CO-825 (care agreements). |
| 7.G.4.d | C: CO-3390 / CO-3393 (assets for future services are available resources; caseworker). |
| 7.G.5.a.i-iii, b | C: CO-824 (joint tenancy fractions; caseworker). |
| 7.G.6.a.i-iv | C: transfer_was_exempt (CO-825). |
| 7.G.6.b.i-iv, c.i-ii.1-4 | C: CO-825. |
| 7.G.7.a-d | C: CO-825 (intent rebuttal). |
| 7.G.8.a | C: ma_transfer_penalty_is_apportioned_with_spouse (CO-2232), ma_spouse_outside_case_is_institutionalized_and_otherwise_eligible (CO-3311), ma_transfer_penalty_apportioned_share_rate (CO-2234), ma_transfer_penalty_share_rate (CO-2235). |
| 7.G.8.b | C: ma_transfer_penalty_months_assigned_from_spouse (CO-2233). |
| 7.G.9 | C: CO-1634. |
| 7.G.10.a-b | NA: notice to the Department. |
| 7.G.11.a.i-ii, b | C: CO-825 (undue hardship waiver). |
| 7.G.11.c-g | NA: request and notice procedure; recovery. |
| 7.G.12.a-e | C: CO-825 / CO-824 (zero value when returned or outside the look-back). |
| 7.H.1.a-c | NA: definitions. |
| 7.H.2.a.i.1 | C: CO-824 excludes pre-1995 life estates (caseworker). |
| 7.H.2.a.ii.1-4, b.ii.1-5 | **NM-20** (life estate and remainder values as resources). Exempt-property arms are C. |
| 7.H.2.b.i.1.a, 2.a-b | C: CO-824 (remainder value; purchase without 12 months' residence). |
| 7.H.3.a.i-ii, b; 4.a.i-ii, b; 5 | NA: the valuation method behind CO-824 and NM-20 (caseworker, with SSA's table). |
| 7.I.1.a-m | NA: definitions. |
| 7.I.2.a, a.i | C: pension_income / CO-1714 (payments as income). |
| 7.I.2.b | **NM-20**. |
| 7.I.3-6 (transfer criteria, Department beneficiary, disclosure; D-65:3880-4019) | C: CO-824 and CO-825 for the transfer arms; owns_annuity (CO-1579), CO-1635 and CO-1639 for disclosure. The resource arms (revocable or assignable annuities) are **NM-20**. |
| 7.J | NA: the life expectancy tables used for valuation (caseworker). |

### 3.9 § 8.100.7.K-V and 20 CFR 416.1112

| paragraph | disposition |
|---|---|
| 7.K.1 | C: ma_ltc_couple (CO-643), ma_is_institutionalized_spouse (CO-644). The Buy-In bypass of § 8.7100.C.3 is in CO-643 (OQ-127, resolved). |
| 7.K.2.a-d | C: CO-644 (institution, PACE, HCBS; 30 days); CO-643 (spouse not in an institution). |
| 7.K.3 | C: CO-643. |
| 7.L | C: ma_spousal_resources_at_snapshot (CO-888); **NM-18** (date). "Once approved ... not reviewed again": CO-646 reads the snapshot. |
| 7.M.1 (intake only; no community property) | C: CO-646, CO-888. |
| 7.M.1.a | C: CO-646, ma_csra_maximum (CO-828); OQ-126 (resolved: the state formula is followed). |
| 7.M.1.b | C: ma_csra_increased (CO-1977). |
| 7.M.1.c | C: ma_court_ordered_transfer_to_community_spouse (CO-1950) in CO-646. |
| 7.M.2 | C: CO-647 (the CSRA is not available to the institutionalized spouse). Income from it is the community spouse's facts. |
| 7.M.3 | **GAP NM-19**. |
| 7.M.4.a-c | **GAP NM-19**. |
| 7.N | C: CO-800 leaves out the home, goods, effects and one vehicle. N's "no limit" matches CO-800's whole-vehicle exclusion. |
| 7.O.1 | C: CO-647, CO-648 (at or below CSRA + 2,000). |
| 7.O.2 | C: CO-642. The trust-before-MIA timing is NA (procedure). |
| 7.P (lead-in), P.1-4 | C: CO-641 (own income only); attribution is fact assignment. |
| 7.Q.1.a | C: ma_mmmna_standard (CO-662), ma_mmmna_applicable_pct (CO-1801), ma_mmmna_family_size (CO-3032), ma_mmmna_adjustment_month (CO-3031). |
| 7.Q.1.b.i-iii | C: ma_community_spouse_shelter_costs (CO-2802), ma_mmmna_shelter_threshold_pct (CO-253), CO-655; OQ-560 (which SUA). |
| 7.Q.2.a.i-ii, b.i-v | C: ma_community_spouse_medical_needs (CO-3619); OQ-620. |
| 7.Q.3 | NA: fair hearing (recorded in CO-655's precision). |
| 7.Q.4 | C: ma_mmmna_cap (CO-830) in CO-655. |
| 7.R.1 | C: CO-656; the income-first rule in CO-1977. |
| 7.R.2 | C: ma_community_spouse_income (CO-2467), ma_payroll_taxes_withheld (CO-2466). |
| 7.R.3 | **P1 NM-15**. |
| 7.R.4 | NA: change reporting thresholds. |
| 7.S.1.a-c | C: CO-1977. |
| 7.S.1.d.i-iii | C: ma_csra_annuity_lowest_estimate (CO-1948). |
| 7.S.1.e | C: ma_institutionalized_spouse_refuses_income_allowance (CO-1949) in CO-1977. |
| 7.T.1.a | C: ma_personal_needs_allowance (CO-1987) in CO-3616. |
| 7.T.1.b | **P1 NM-14** (deducted whether or not made available). |
| 7.T.1.c.i | C: ma_family_allowance (CO-657), ma_family_allowance_divisor (CO-254). |
| 7.T.1.c.ii | C: ma_family_allowance_members (CO-2469); OQ-95 (resolved). |
| 7.T.1.d | C: CO-658 (the V deductions). |
| 7.T.1.e | **P1 NM-14**. |
| 7.T.1.f | C: CO-658 deducts only the listed items. |
| 7.U.1-3 | NA: notice and appeal (U.2 repeats Q.3). |
| 7.V.1.a-d | NA: AP-5615 form procedure. |
| 7.V.1.e.i-ii | C: ma_nf_part_b_premium_deduction_months (CO-3612), medicare_part_b_premium_paid (CO-3602); OQ-721, OQ-520 (resolved). |
| 7.V.1.e.iii | C: medicare_part_d_premium_paid (CO-3603). |
| 7.V.1.f-l | NA: leave, payer status, discharge, form handling, administrative recovery. |
| 7.V.2.a-b | NA: collection by the facility. |
| 7.V.2.c | **GAP NM-28**. |
| 7.V.3.a | NA: pointer. |
| 7.V.3.b.i | C: ma_ltc_gross_income (CO-641); the trust distribution (CO-2238). NM-6 also applies. |
| 7.V.3.b.ii.1-4 | C: CO-1987, CO-656, CO-657, ma_home_maintenance_allowance (CO-3618), in CO-658. |
| 7.V.3.b.ii.5 | C: inside CO-2238 ($20; OQ-96). |
| 7.V.3.b.ii.6 | C: mandatory_income_tax_withheld (CO-3604). |
| 7.V.3.b.ii.7 | C: garnishment_repaying_federal_assistance_overpayment (CO-3605). |
| 7.V.3.b.ii.8.a-c | C: CO-3602 / CO-3612, CO-3603; NF PETI left out (S3008). |
| 7.V.3.c, c.i.1.a-b | C: long_term_care_insurance_benefits_received (CO-3606) added after the floor. The order of application against the cost of care is the facility's (NA). |
| 7.V.3.d.i.1-2.a | C: ma_personal_needs_allowance_institutional (CO-887); OQ-212 (figure unverified). |
| 7.V.3.d.ii, ii.1-2 | C: ma_qualifies_for_veterans_personal_needs_allowance (CO-1986), ma_veteran_personal_needs_allowance (CO-255). |
| 7.V.3.d.iii | C: ma_ltc_earned_income (CO-3615), ma_ltc_earned_income_reserve_base (CO-3613), CO-3614, CO-3616. |
| 7.V.3.d.iv | C: CO-3604. |
| 7.V.3.e.i-v | C: CO-3615 (every earning read as an income-producing activity; precision). |
| 7.V.3.f.i-iii.1-3 | C: CO-3616. |
| 7.V.3.g.i | C: CO-656 (spousal rules). |
| 7.V.3.g.ii (six months, physician, actual verified costs) | C: CO-3618, ma_physician_certified_return_home (CO-3607), ma_home_maintenance_allowance_max_months (CO-3608), shelter_costs_verification_document_received (CO-1324); OQ-721. |
| 7.V.3.g.ii.1 | NA: before July 1, 2018. |
| 7.V.3.g.ii.2.a | C: CO-3618 (lesser of the SUA and actual utilities). |
| 7.V.3.g.ii.2.b.1-2 | C: ma_home_maintenance_allowance_max (CO-3617), CO-3609, CO-3610, CO-3611. |
| 7.V.3.h | NA: case record. |
| 7.V.3.i, i.i | NA: SSI continuation (SSA's rule). |
| 7.V.3.i.ii | C: SSI is not in CO-641. |
| 7.V.3.j | NA: Adult Financial supplement to the PNA. |
| 7.V.4.a.i-ii | C: CO-658's floor at zero, with LTC insurance added. |
| 7.V.4.a.iii-vi | **GAP NM-29**. |
| 7.V.4.a.vii | NA: Medicare co-insurance billing. |
| 7.V.4.b.i-iv, c | NA: waiver limits and partial-month per diem (the facility's computation). |
| 7.V.4.d | C: as V.3.i.ii. |
| 7.V.5.a-c, V.6 | NA: personal needs fund administration; pointer. |
| 416.1112(a) | C: CO-605 (other-law exclusions first; never below zero; no unused earned exclusion to unearned). |
| 416.1112(b) | C (P3): federally_excluded_payments_received is subtracted from unearned income only. Earned income under other federal laws is NM-26 territory. |
| 416.1112(c)(1) | C: tax_refunds_and_credits_received (CO-3365) in CO-2470. |
| 416.1112(c)(2) | **NM-26**. |
| 416.1112(c)(3)(i)-(ii) | C: CO-3387, CO-2471, CO-3379, CO-3380, ssi_student_age_limit (CO-3381); **P3 NM-31**. |
| 416.1112(c)(4) | C: CO-605. |
| 416.1112(c)(5) | C: CO-231. |
| 416.1112(c)(6), (6)(i)-(ii) | **P1 NM-8**. |
| 416.1112(c)(7) | C: CO-232. |
| 416.1112(c)(8) | **P1 NM-8**. |
| 416.1112(c)(9) | **P1 NM-7**. |
| 416.1112(c)(10) | **NM-26**. |

### 3.10 10 CCR 2505-10 §§ 8.940-8.942 (D-68)

| paragraph | disposition |
|---|---|
| 8.941.1 (lead-in) | C: ma_oap_health_care_status (CO-1156), whose medicaid_eligible arm reads ma_has_full_coverage_category (CO-1176). |
| 8.941.1.A | C: CO-1156 eligible_state_only (SISC C). |
| 8.941.1.B.1-10, B.8.i, B.10.i, C | NA: benefit package. |
| 8.941.1.D | C (eligibility part): ma_oap_is_patient_in_tb_or_mental_health_institution (CO-1748) and C.R.S. 25.5-2-101(2). The rest is benefit exclusions (NA). |
| 8.941.1.E | C: CO-1156 ineligible_before_application. Date-level start is NA at month level. |
| 8.941.1.F | NA: county information duty. |
| 8.941.2.A-I | NA: definitions, used by CO-1156 (oap, oap_c via receives_oap_c, CO-2208). |
| 8.941.3 (lead-in), 3.A | C: CO-1156 (receipt of OAP, no SSI, not otherwise Medicaid). |
| 8.941.3.B | C: CO-1156 (AND-CS, AND-SO and AB are not OAP; ineligible_oap_c). |
| 8.941.4 | C: OAP receipt from the Adult Financial record (CO-2710). |
| 8.941.5-8.941.8 | NA: provider certification, out-of-state care, claims, reimbursement. |
| 8.941.9 | NA: copayments and the $300 cap (cost sharing, not eligibility). |
| 8.942.1 | C: CO-1156 tests medicaid_eligible before eligible_state_only, so a recipient who qualifies for Medicaid is reported Medicaid. The backdating is NA (procedure). |

Matrix size: 423 rows covering every numbered paragraph of §§ 8.100.5-8.100.7 (A through V), 8.940-8.942 and 20 CFR 416.1112, down to the level that states a condition, figure, computation, exception, period or verification requirement. Of these, 81 rows point to a finding (NM-1 to NM-35) or a GAP; the rest are carried, not applicable or an open question.

## 4. Open-question confirmations

Every open question the non-MAGI items name was read in volumes/co/open-questions.md and checked against the texts above. Allowed hosts were tried where a question is said to be blocked (medicaid.gov's verification-plan index returned 404 again on 2026-11-22; law.cornell.edu served 42 U.S.C. 1383c).

| OQ | class in the file | confirmation |
|---|---|---|
| OQ-82, 84, 92, 93, 94, 95, 96, 97, 98, 111, 126, 127, 145, 206, 208, 210, 374, 379, 520 | resolved | Confirmed resolved, except as noted under NM-17 (OQ-207) and NM-18 (add the snapshot date to OQ-126). |
| **OQ-83** | state policy choice | **Misclassified (NM-10).** H.3.a itself says income is "deemed available to the applicant/client", and 42 U.S.C. 1382c(f)(2)(A) (D-45:225) and 20 CFR 416.1165 / 416.1202(b) (D-53, D-54) state whose income and resources are deemed and how. The "checked" line cites only § 8.100.5.H. |
| OQ-99 | blocked on a named document | Confirmed: HCPF OM 25-073 is on hcpf.colorado.gov, not an allowed host. |
| OQ-144 | state policy choice | Confirmed: Q.1.g.iv's "individuals" rows against Q.1.g's "household size and income"; no other text decides. |
| OQ-200 | state policy choice | Confirmed (1396b(v)(2)(B) and § 8.100.3.F.1.k leave the HCBS-only route open). |
| **OQ-207** | resolved | **Incomplete (NM-17):** E.3's spouse and parent COLA disregard is a clear rule left unmodeled inside a resolved question. Reopen that half as a needs-fact gap. |
| **OQ-209** | state policy choice | **Misclassified for its first half (NM-9).** § 8.100.6.A.1, 42 U.S.C. 1383c(d)(2) ("would be eligible for such supplemental security income benefits ... in the absence of" the widow's benefits) and 42 CFR 435.138 (D-31) answer it. The closed-cohort half (§ 8.100.6.F-H) is a correct state choice. |
| OQ-212 | blocked on a named document | Confirmed (OM 25-073). |
| OQ-214 | needs Legal | Confirmed (§ 8.100.3.G.1.g.ix; the other review's scope). |
| OQ-302 | blocked on a named document | Confirmed: the 20% threshold is in § 8.100.5.B.1.c.ii; "20% of what" needs Colorado's verification plan (435.945(j)), and medicaid.gov's verification-plan pages return 404. |
| OQ-471 | needs Legal | Confirmed (the trust rule's deduction list against 1396r-5(d)(1)). |
| OQ-472 | needs Legal | Confirmed (§ 8.100.3.B; the other review's scope). |
| OQ-473 | state policy choice | Confirmed: H.3.a.i says "disregarded from the ineligible parents' gross income" and H.3.a.iii is silent on applicant spouses with children. Revisit once NM-10 adds parental deeming. |
| OQ-511 | blocked on a named document | Confirmed (HCPF member notice promised by Q.1.g.vii). |
| OQ-515 | blocked on a named document | Confirmed (HCPF adoption-date memo). |
| OQ-519 | blocked on a named document | Confirmed (IM 25-030). |
| OQ-560 | state policy choice | Confirmed (Q.1.b.ii names "the standard utility allowance used by Colorado" without a tier). |
| OQ-620 | state policy choice | Confirmed ("may be approved"). |
| OQ-621 | state policy choice | Confirmed (O.5 against O.6). |
| OQ-622 | state policy choice | Confirmed ("until ... published"). |
| OQ-623 | state policy choice | Confirmed (Q.1.f's "required to enroll"). |
| OQ-624 | state policy choice | Confirmed (L.2.d's wording against 1396d(p)). |
| OQ-720 | state policy choice | Confirmed ("dependents" undefined in 5.K). |
| OQ-721 | state policy choice | Confirmed (V.1.e.i against V.1.e.ii). |
| OQ-740 | state policy choice | Confirmed (H's per-couple disregards applied to a family). |

New open questions the fixes need: NM-16 (home equity outside long-term care), NM-21 (partial-month penalty), NM-24 (AND and OAP-B grants), NM-25 (H.1.b against F.5.k), and NM-28 to NM-30 if they are not modeled.

## 5. Earlier P1s (spot-check)

The engine was run at a2ed7f0 on the stored cases that carry the earlier non-MAGI P1s:

| earlier id | check | result |
|---|---|---|
| final F-3, F-4 (patient payment deductions; Q.2) | CO-112: ma_community_spouse_income_allowance 1,671.40, ma_patient_payment 815.34 (November) | fixed |
| final F-5 (QMB effective month) | CO-06 p2: ma_msp_category none in 2026-11, qmb in 2026-12 | fixed |
| final F-6 (MSP COLA disregard) | CO-114 p1, 2027-01: disregard 38, qmb | fixed |
| final F-7 (CBwD Q.1.e-f) | CO-620's derivation tests Q.1.e and Q.1.f (CO-3630, CO-3631) | fixed |
| final2 F2-2 (VA A&A in a State Veterans Home) | CO-139: ma_patient_payment 1,810 | fixed (but see NM-5: CO-139's eligibility rests on an unstated intent to return) |
| final3 F3-1 (CBwD income method) | CO-145 p3: 152.9% FPL, children_with_disabilities, premium 70 | fixed |
| final3 P2-1 (2025 standards) | CO-807, CO-808, CO-827, CO-828, CO-830, CO-831 carry 2025 versions | fixed |

The MAGI and CHP+ P1s of those passes (F-1, F-2, F2-1, F3-2 to F3-4) are the MAGI review's scope. `npm run check` passes at a2ed7f0.
