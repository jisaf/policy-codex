# Pattern sweep: MAGI Medicaid and CHP+

Pattern sweep (2026-11-24) on branch `ccr-9d19bf4c-wmnwcl` from `414d239`. Six rounds of fresh reviews of this family kept finding wrong answers, most of them in three patterns (coverage passes 4 to 6, docs/reviews/coverage4-medicaid-magi-chp.md, coverage5-medicaid-magi-chp.md, coverage6-medicaid-magi-chp.md; docs/reviews/field-sweep-magi.md): a fact read on the determination date in a month-scoped chain (C5-02, C6-01, C6-06), a default no rule gives (C5-05, C6-04, C6-05, C6-10) and the household membership of a month (C5-02, C6-03). The product owner chose to sweep the three patterns exhaustively instead of another review loop. This sweep lists every candidate of each pattern mechanically and judges each against the rule text on file (volumes/co/documents/, volumes/co/sources.md).

## Method

- **Reach.** `scripts/audit/pattern-sweep-magi.ts` walks the derived expressions from the MAGI and CHP+ outcomes (ma_magi_eligibility_status, ma_magi_category, ma_family_planning_status, ma_express_lane_status, ma_needy_young_person_category, the presumptive items, chp_eligibility_status, chp_express_lane_status, chp_copayment, chp_presumptive_eligibility), cuts CHP+'s Title XIX test (CO-1176) at its MAGI arm as the coverage passes did, and stops at the non-MAGI categories the emergency and Cover All Coloradans arms read (the SSI-related, long-term care, waiver, Buy-In and protected-group items) and at items of another program (SNAP's work-registration exemption, read by community engagement). It reaches 594 items; 582 are Medicaid, CHP+ or shared, 271 of them derived. The candidates below are those of the 271 (and the parameters and facts they read), at `414d239`.
- **Candidates.** Pattern 1: every read, by a person-month or month item, of a person-, global- or case-scope item that is not a parameter (311 reads of 153 facts), every `det_date` and `det_month` (58), and every record sum with the time fields it reads (39). Pattern 2: every `otherwise` and `unknown` (287 occurrences in 99 items) and every record field a reached item reads with its schema `default` or `when_absent` (31 fields). Pattern 3: every group or relationship operator (`filter`, `sum`, `count`, `exists`, `greatest`, `rel`, `exists_related`, `has_relative_in`, `shared_relative`, `reachable`) and every read of lives_with, a household, a tax relationship or a claim (332 occurrences in 108 items). Reproduce with `npx vite-node scripts/audit/pattern-sweep-magi.ts` (add `-- --items` for the derivations).
- **Judging.** Each candidate's derivation was read against the paragraph it carries; for pattern 1, whether the text fixes the fact at a point in time (cited) or makes it a fact of the month; for pattern 2, whether a cited rule gives the default (declared on the fact with the citation) or the fact is required where read (decision 4 of 2026-11-23); for pattern 3, whether each composition rule is per month with the right edges and each count and sum uses the right membership.
- **Probes.** For each defect a household with the answer computed by hand; each became a stored household (CO-1000 to CO-1004, free before this sweep) or rule tests. Each probe was run against `414d239` (a scratch copy of the ledger at that commit) to confirm the defect: every expectation that the sweep changes failed there with the answer named in its comment.
- **Fix loop.** `scripts/audit/quick-tests.ts` runs every rule test and stored household expectation in one process (a fast check between edits; `npm run check` is the gate).

Out of scope, as the brief divides the work: the SSI-method items the outcomes reach only through an aged, blind or disabled arm (the verification arm of CO-1404, the emergency routes of CO-1150, the Breast and Cervical Cancer Program CO-1152), swept with non-MAGI Medicaid; SNAP's items read by community engagement, swept with SNAP.

## Summary

| Pattern | Candidates (MAGI, CHP+ and shared items) | Right (cited) | Fixed | Recorded (OQ) | Non-MAGI (other sweep) |
|---|---|---|---|---|---|
| 1. Month-by-month timing | 311 reads of 153 case-fixed facts; 58 reads of the determination date or month; 39 record sums | 190 reads; 52 date reads (2 more change no answer, OQ-510); 12 sums | 57 reads (PS-01, PS-02, PS-04, PS-05); 3 date reads (CO-508, CO-1173) | 33 reads (OQ-1425) | 31 reads; 1 date read; 27 sums |
| 2. Defaults | 287 `otherwise` and `unknown` occurrences (164 in 69 MAGI, CHP+ and shared items); 31 record fields with a schema default or `when_absent` | 148 occurrences; 31 fields (none changed) | 16 occurrences in 11 items (PS-03, PS-05, PS-06) | none | 123 occurrences |
| 3. Couples and membership | 332 occurrences (245 in 74 MAGI, CHP+ and shared items) | the composition rules of section 3 | CO-500, CO-1976, CO-2606, CO-4204 through CO-7554 (PS-03, PS-04) | the home stated once (OQ-1425) | 87 occurrences in 31 SSI couple and deeming items |

Defects fixed (P1 = a wrong answer; each with the common or rare call and one line of reasoning):

| ID | Pattern | Sev | Common / rare | Defect | Probe |
|---|---|---|---|---|---|
| PS-01 | 1 | P1 | **rare**: needs a lawfully residing non-citizen whose status, age or pregnancy changed between a retroactive month and the determination | Status (ma_meets_citizenship_requirement, CO-509, person-scope) measured the five years of 8 U.S.C. 1613(a), the lawfully residing child's age under 19 and the lawfully residing woman's pregnancy on the determination date in every month; two more month-scoped readers took `age` on the determination date (CO-1403, CO-2419) | CO-1000 (LPR-5Y), CO-1001 (YOUTH-19) |
| PS-02 | 1 | P1 | **rare**: an undocumented or lawfully residing youth who turned 19, or a woman whose postpartum year ended, between a retroactive month and the determination | The Cover All Coloradans population (CO-1173, CO-1174, and CHP+'s CO-2707 through them) was the determination date's, though ix.1 and § 110.1.B.5.o name "the current month" | CO-1002 (UNDOC-19) |
| PS-03 | 2 | P2 | rare: a claimed dependent whose claimer's spouse has no stated home (C6-10 already made the home required in every other arm) | ma_magi_household_members (CO-500) read a claimer's spouse with no stated home as living in the claimer's home (`otherwise ... persons`), and a spouse whose joint filing was not stated as filing jointly (`otherwise ... true`), defaults C6-10 removed elsewhere | rule tests CO-500-T18, T19 |
| PS-04 | 3 | P1 | **rare**: a member who died in a month before one the determination evaluates (a retroactive application after a death; the widow's own renewal) | The MAGI household, its non-filer routing and the caretaker relative read lives_with, one value per case, so a spouse, parent or child who died stayed "living in the home" in every later month: the household size, the income members and the caretaker relationship were wrong from the month after the death | CO-1003 (WIDOW) |
| PS-05 | 1, 2 | P1 | **rare** for the timing (a stay that began after a retroactive month); the default (P2) changed no stored expectation (the one stored inmate household, CO-376, states its entry date) | ma_magi_eligibility_status read is_inmate_of_public_institution (CO-1105), whose setting facts are the determination date's, in every month: a person jailed after a retroactive month was incarceration_limited in it; and it read an unstated setting as "not an inmate" (`otherwise ... false`) with no rule | CO-1004 (JAILED); CO-554-T97 to T99 |
| PS-06 | 2 | P2 | rare: each needs the named fact unstated | Defaults no rule gives, each now required where read: foster care in another state (CO-549, read as Colorado's), still inpatient at 21 (CO-2419, read as not), leaving work with good cause (CO-2425, read as not), the mother's CHP+ enrollment at the birth (CO-2410, CO-4565, read as not enrolled), a member's coverage request (CO-1403, read as not requesting), a recorded continuous eligibility period's program (CO-561, read as MAGI's), E.4's separation of a parent living elsewhere (CO-1976, read as not separated), an unknown pregnancy coverage period (CO-554, read as not in the period) | rule tests (section 4) |

Recorded: **OQ-1425** (PS-07, state policy choice): the facts a case states once, for the determination date, with no date at which they began (Colorado residence, Medicare entitlement, a dependent child's coverage, the immigration status itself, a live-in care provider's arrangement, a parent's living apart, an earlier institution stay), read in a retroactive month. No text on file says from what the agency establishes a retroactive month's non-financial facts; the sweep made per month every condition the case can date.

Not changed, with the reason (P2 and below): the person's own months after the month of death are still determined like any month (ma_magi_eligibility_status has no option for a month after death; adding one changes the declared outcome set, a product-owner decision); a deceased claimer keeps his claimed dependents' household (E.1.b, "the household of the taxpayer claiming", for the taxable year: a final return claims them); ma_is_five_year_bar_exempt (CO-1172) compares an Afghan humanitarian parolee's parole end with the determination date, which changes no answer for a determination made from October 1, 2026 (such a parolee is outside 1396b(v)(5)(B) in every month, OQ-510).

## 1. Pattern 1: month-by-month timing

### 1.1 Facts fixed for the case, read by a month-scoped item

Every read, at `414d239`, by a person-month or month item of a person-, global- or case-scope item that is not a parameter, grouped by the fact read (311 reads of 153 facts). The verdict key follows the table.

| Fact read (case-fixed) | Month-scoped readers | Verdict |
|---|---|---|
| adult_financial_program_received | CO-1150 | NM |
| age | CO-1403, CO-2419 | F01 |
| care_recipient_receives_hcbs_waiver_services | CO-5214 | OQ |
| ceased_living_with_spouse_date | CO-3626 | NM |
| child_welfare_payment_type | CO-1105 | STATIC |
| chp_eligibility_period_start_month | CO-2404, CO-2407, CO-4565, CO-7406 | APP |
| chp_has_other_health_coverage | CO-4792, CO-705, CO-706, CO-707 | DET |
| chp_is_american_indian_or_alaska_native | CO-1990 | STATIC |
| chp_is_excluded_as_public_agency_employee_family | CO-4792, CO-705, CO-706, CO-707 | DET |
| chp_meets_residency | CO-2404, CO-4792, CO-705, CO-706, CO-707 | OQ |
| chp_meets_status_requirement | CO-4792, CO-705, CO-706, CO-707 | F02 |
| chp_mother_was_enrolled_at_birth | CO-2410 | DOB |
| chp_prenatal_coverage_end_month | CO-2407 | PREG |
| citizenship_attestation_is_questionable | CO-1395 | DET |
| citizenship_verification_document_received | CO-1398, CO-1620 | DET |
| citizenship_verified_by_electronic_data_source | CO-1398, CO-1620 | DET |
| claims_lawful_immigration_status | CO-1622 | OQ |
| continuous_eligibility_period_start_month | CO-2448, CO-561, CO-7405 | APP |
| date_of_birth | CO-1969, CO-2410, CO-4101, CO-4565, CO-4790, CO-4978, CO-501, CO-5402, CO-549, CO-551, CO-7050 | DOB |
| date_of_death | CO-2200 | DOB |
| declared_household_income_pct_fpl | CO-3156, CO-4792, CO-558, CO-559 | DET |
| dependent_child_has_minimum_essential_coverage | CO-539, CO-548, CO-552 | OQ |
| difficulty_of_care_older_foster_individuals | CO-5214 | OQ |
| difficulty_of_care_younger_foster_individuals | CO-5214 | OQ |
| documentation_not_reasonably_available | CO-1403, CO-1404 | DET |
| earned_income_attestation_is_questionable | CO-1403 | DET |
| earned_income_verification_document_received | CO-1624 | DET |
| earned_income_verified_by_electronic_data_source | CO-1403 | DET |
| education_enrollment_intensity | CO-1918 | CE |
| education_program_type | CO-1918 | CE |
| expected_annual_self_employment_seasonal_commission_income | CO-4559 | YEAR |
| expected_number_of_children | CO-7050 | PREG |
| expects_to_be_claimed_as_dependent | CO-500 | YEAR |
| files_jointly_with_spouse | CO-1976, CO-500 | YEAR |
| has_reproductive_capacity | CO-1154 | STATIC |
| identity_verification_document_received | CO-1621 | DET |
| identity_verified_by_electronic_data_source | CO-1621 | DET |
| immigration_status_verified_by_electronic_data_source | CO-1622 | DET |
| institution_entry_date | CO-3626, CO-5200, CO-661 | F05 |
| is_blind | CO-4625, CO-4628, CO-4629, CO-5904 | NM |
| is_emancipated_minor | CO-2275, CO-4624, CO-4625 | NM |
| is_enrolled_in_medical_assistance | CO-558, CO-559 | DET |
| is_enrolled_in_pace | CO-1631 | NM |
| is_full_time_secondary_student_finishing_before_nineteen | CO-4791 | STATIC |
| is_in_community_corrections_with_freedom_of_movement | CO-1105 | F05 |
| is_medicare_entitled_or_enrolled | CO-1395, CO-1969, CO-539, CO-548, CO-552 | OQ |
| is_pregnant | CO-2407, CO-3601, CO-558, CO-559, CO-566, CO-7051 | PREG |
| is_related_to | CO-1963 | STATIC |
| is_required_to_file_tax_return | CO-4558 | YEAR |
| is_required_to_file_tax_return_excluding_social_security | CO-4558 | YEAR |
| is_screened_in_need_of_breast_or_cervical_cancer_treatment | CO-1152 | NM |
| is_sponsored_non_citizen | CO-4551 | STATIC |
| is_tax_filer | CO-500 | YEAR |
| is_us_citizen_or_national | CO-1395, CO-4551 | OQ |
| is_veteran_rated_totally_disabled | CO-1965 | CE |
| lives_full_time_with_care_recipient | CO-5214 | OQ |
| lives_with | CO-1963, CO-1976, CO-2277, CO-3626, CO-4204, CO-4624, CO-4633, CO-500, CO-5179, CO-5511, CO-5514, CO-6730 | F04 |
| ma_age_at_foster_care_exit | CO-549 | DOB |
| ma_application_date | CO-2404, CO-2407, CO-2448, CO-3601, CO-4101, CO-4565, CO-565, CO-566, CO-7051, CO-7401, CO-7405, CO-7406 | APP |
| ma_application_is_children_buy_in_only | CO-1404 | NM |
| ma_application_is_msp_only | CO-1404 | NM |
| ma_bccp_creditable_coverage_exception_applies | CO-1152 | NM |
| ma_bccp_has_creditable_coverage | CO-1152 | NM |
| ma_caretaker_relative_of | CO-2430, CO-4204, CO-539, CO-547, CO-548, CO-552 | F04 |
| ma_child_continuous_eligibility_end_month | CO-2448, CO-561 | APP |
| ma_citizenship_document_is_acceptable | CO-1620 | DET |
| ma_citizenship_document_is_stand_alone | CO-1398 | DET |
| ma_community_engagement_is_care_recipient | CO-1963 | CE |
| ma_community_engagement_noncompliance_notice_date | CO-1974 | CE |
| ma_community_engagement_response_period_end_date | CO-1974, CO-1975 | CE |
| ma_community_engagement_review_months | CO-1974 | CE |
| ma_community_engagement_review_type | CO-1974, CO-1975 | CE |
| ma_continuous_eligibility_program | CO-1154, CO-2448, CO-555, CO-561, CO-7405 | APP |
| ma_custodial_parent | CO-1976 | YEAR |
| ma_determination_is_renewal | CO-1395 | DET |
| ma_eligibility_start_date | CO-7401 | APP |
| ma_eligibility_was_erroneously_granted | CO-2205, CO-566 | DET |
| ma_express_lane_family_opted_in | CO-2442, CO-4793 | DET |
| ma_express_lane_source | CO-2442, CO-4793 | DET |
| ma_express_lane_verification_period_end_date | CO-2442, CO-4793 | DET |
| ma_first_month_of_ineligibility | CO-2431, CO-4205 | TMA |
| ma_foster_care_was_in_another_state | CO-549 | STATIC |
| ma_has_annualizable_earnings | CO-4559, CO-4975 | YEAR |
| ma_has_declined_state_medical_assistance | CO-1154 | DET |
| ma_identity_document_is_acceptable | CO-1621 | DET |
| ma_ineligibility_reason | CO-2431, CO-4205 | TMA |
| ma_is_applying_for_or_eligible_for_ssi | CO-2277, CO-2278, CO-2279, CO-4624, CO-4633, CO-7353 | NM |
| ma_is_cover_all_coloradans_person | CO-1175, CO-562 | F02 |
| ma_is_dependent_child | CO-5179 | NM |
| ma_is_dependent_claimed_by_non_parent | CO-1976, CO-4558 | YEAR |
| ma_is_in_inpatient_treatment_at_twenty_one | CO-2419 | DOB |
| ma_is_in_title_iv_foster_care_or_adoption_assistance | CO-1395, CO-1970 | DET |
| ma_is_indian | CO-1965 | STATIC |
| ma_is_legal_immigrant_prenatal_population | CO-566 | F01 |
| ma_is_medically_frail | CO-1965 | CE |
| ma_is_parent_guardian_or_caretaker_relative_of_care_recipient | CO-1965 | CE |
| ma_is_parent_or_caretaker_relative_of_dependent_child | CO-2425 | F04 |
| ma_is_regularly_attending_school_or_training | CO-2275 | NM |
| ma_is_requesting_coverage | CO-1403 | DET |
| ma_is_seasonal_worker | CO-1968 | CE |
| ma_lives_apart_due_to_separation_or_pending_divorce | CO-1976 | OQ |
| ma_lottery_winnings_hardship_exemption_granted | CO-1187, CO-503, CO-663 | APP |
| ma_ltc_couple | CO-5200 | NM |
| ma_magi_income_standard_adult | CO-539, CO-548 | STATIC |
| ma_magi_income_standard_child | CO-3156, CO-539, CO-545, CO-559 | STATIC |
| ma_magi_income_standard_pregnant | CO-539, CO-546, CO-558 | STATIC |
| ma_meets_citizenship_requirement | CO-1154, CO-1175, CO-2419, CO-510, CO-562 | F01 |
| ma_meets_premium_tax_credit_income_test | CO-504 | YEAR |
| ma_meets_residency | CO-1150, CO-1152, CO-1154, CO-2419, CO-2430, CO-2431, CO-2448, CO-3156, CO-554, CO-555, CO-561, CO-562 | OQ |
| ma_meets_status_for_cover_all_coloradans_categories | CO-1152, CO-2419, CO-2430, CO-2431 | F02 |
| ma_must_resubmit_citizenship_documentation | CO-1395 | DET |
| ma_persons_cared_for | CO-1963 | CE |
| ma_postpartum_coverage_end_month | CO-566 | PREG |
| ma_premium_tax_credit_family | CO-504 | YEAR |
| ma_premium_tax_credit_household_income_pct_fpl | CO-504 | YEAR |
| ma_premium_tax_credit_previous_year_income_pct_fpl | CO-504 | YEAR |
| ma_reasonable_opportunity_period_end_date | CO-2205 | DET |
| ma_receives_subsidized_adoption_payments | CO-2419, CO-549 | STATIC |
| ma_retroactive_coverage_requested | CO-4101, CO-565, CO-7401 | APP |
| ma_retroactive_coverage_start_month | CO-4101 | APP |
| ma_sponsor_deeming_battery_exception_applies | CO-4551 | DET |
| ma_sponsor_indigence_determination_date | CO-4551 | APP |
| ma_verification_is_applicable | CO-1395, CO-1622 | DET |
| meets_hcbs_waiver_target_group | CO-1631 | NM |
| meets_nursing_facility_level_of_care | CO-1150 | NM |
| meets_ssa_disability_criteria | CO-4625, CO-4628, CO-4629, CO-5904 | NM |
| most_recent_pregnancy_end_date | CO-2407, CO-3601, CO-566, CO-7051 | PREG |
| mother_was_enrolled_in_medicaid_at_birth | CO-1395, CO-550 | DOB |
| participates_in_drug_alcohol_treatment | CO-1965 | CE |
| pregnancy_end_date | CO-3601, CO-7051 | PREG |
| pregnancy_start_date | CO-2407, CO-3601, CO-566, CO-7051 | PREG |
| qualifying_quarters | CO-4551 | STATIC |
| received_presumptive_eligibility_in_last_twelve_months | CO-559 | DET |
| received_presumptive_eligibility_this_pregnancy | CO-558, CO-559 | DET |
| receives_ssdi | CO-1395 | DET |
| receives_ssi | CO-1395, CO-1970 | CE |
| receives_tanf_cash | CO-1970 | CE |
| residence_setting_bed_count | CO-1104, CO-1105 | F05 |
| residence_setting_is_primarily_for_mental_diseases | CO-1104 | F05 |
| residence_setting_operated_by_government | CO-1105 | F05 |
| residence_setting_stay_is_temporary_pending_other_arrangements | CO-1105 | F05 |
| residence_setting_type | CO-1104, CO-1105, CO-3626 | F05 |
| resides_in_medical_institution | CO-1105, CO-1631, CO-2277, CO-4624, CO-4625, CO-4633, CO-5200, CO-661 | F05 |
| retains_ssi_status_without_payment | CO-1970 | CE |
| sex | CO-1152 | STATIC |
| siblings | CO-500 | STATIC |
| sponsor_spouses_not_cosigning | CO-4551 | STATIC |
| sponsors | CO-4551 | STATIC |
| ssi_is_student_regularly_attending_school | CO-5174 | NM |
| step_siblings | CO-500 | STATIC |
| unearned_income_attestation_is_questionable | CO-1404 | DET |
| unearned_income_is_verified | CO-1625 | DET |
| was_enrolled_in_medicaid_at_foster_care_exit | CO-549 | DOB |

Verdict key:

- **APP** (35 reads): Right: a fact of the application or of the case record at a stated point (an application or request date, a recorded period's start, a recorded grant); a date is a point and its readers compare it with the month (8.100.3.E.1-2, S217, S1503; Q.2, S1724)
- **YEAR** (16 reads): Right: fixed for the taxable year in which the determination is made (8.100.4.E.1, 'for the taxable year in which an initial determination or renewal of eligibility is being made', S169; 435.603(d)(2), (f)(1)-(2), S162, S164; C.4.a and C.5 annual, S3356, S166; C6-09's prior-year figure for a month of the previous year)
- **DOB** (18 reads): Right: a date of birth, death or exit, read through the month's ages or dates (docs/operators.md, Ages in a month; CO-4978, CO-5402, CO-4790; date_of_death through CO-7554 since PS-04)
- **DET** (54 reads): Right: the text fixes it at the determination (presumptive eligibility determined on the date, 8.100.4.F, S219, S1501; Express Lane's finding, J.1-J.2, S1723; verification at the application or renewal, 8.100.4.B, S851; CHP+ copayments 'at the time of eligibility determination', 10 CCR 2505-3 § 320.1, S1504; CHP+ other coverage 'at the time of application or redetermination', § 120.1.A, S244; the continuous eligibility exceptions as found, Q.1.b, S1502)
- **CE** (19 reads): Right: community engagement is reviewed at the application, renewal or change over its review months, each month read on its own (42 CFR 435.555-435.558, S1201, S1211; from 2027-01-01); the person-scope parts are the review's facts
- **STATIC** (25 reads): Right: a fact that does not change between the months a determination evaluates (the MAGI standards CO-540, CO-542, CO-543 are global, read on the determination date, and have had one version since 2022-06-30, so no month a determination now evaluates reads another; sex; reproductive capacity as declared; tribal membership or descent; a disability, blindness or SSI finding as stated; relationships; foster care exit data; the item a parameter table derives once, as global)
- **F01** (8 reads): Fixed, PS-01 (per month: ma_meets_citizenship_requirement_in_month CO-7551, CO-7550; the two reads of age, by CO-1403 and CO-2419, now ma_age_on_last_day_of_month)
- **F02** (10 reads): Fixed, PS-02 (per month: ma_is_cover_all_coloradans_person_in_month CO-7552, CO-7553)
- **F04** (19 reads): Fixed, PS-04 (per month: ma_lives_with_in_month CO-7554; CO-2606 per month)
- **F05** (20 reads): Fixed, PS-05 (per month: ma_is_inmate_in_month CO-7555 from institution_entry_date)
- **PREG** (19 reads): Right since coverage pass 6 (C6-01 to C6-06): read through ma_is_pregnant_in_month (CO-3601), CO-7051 and the dated period (CO-565, CO-566, CO-2407); a bare is_pregnant is read only for the determination month and later or by a presumptive test (F.2)
- **OQ** (33 reads): Recorded: OQ-1425 (state policy choice; a fact stated for the determination date and read in a retroactive month)
- **NM** (31 reads): Non-MAGI: read only through an aged, blind or disabled, long-term care or Breast and Cervical Cancer arm the MAGI and CHP+ outcomes reach (the SSI-method verification arm of CO-1404, the emergency routes of CO-1150, BCCP CO-1152); left to the non-MAGI sweep
- **TMA** (4 reads): Right: a fact of the eligibility history (a loss of eligibility, its month and reason), a point in time; the transitional months are counted from it per month (8.100.4.I.1-I.5, S1719, S1720; C5-17)

### 1.2 The determination date and month

58 reads of `det_date` or `det_month` in the reached items.

| Item | Reads | Verdict |
|---|---|---|
| CO-300 age | 1 | Right by definition (the age on the determination date); its two month-scoped readers now read the month's age (PS-01: CO-1403, CO-2419) |
| CO-508 has_held_qualified_status_five_years | 1 | Right for its person-scope readers; the month-scoped status test reads CO-7550 instead (**fixed, PS-01**) |
| CO-1173 ma_is_cover_all_coloradans_person | 2 | Right for its person-scope readers (the presumptive tests, read on the determination date); the month-scoped readers read CO-7552 (**fixed, PS-02**) |
| CO-1172 ma_is_five_year_bar_exempt | 2 | No effect: an Afghan humanitarian parolee is outside 1396b(v)(5)(B) in every month of a determination made from October 1, 2026 (OQ-510, the limit read on the determination date) |
| CO-2228, CO-2229, CO-2231 (CHP+ copayment band, annual limit, exemption) | 5 | Right: 10 CCR 2505-3 § 320.1 sets the band by "income, at the time of eligibility determination" (S1504); § 330.2's yearly maximum is 5% of that income (S1505) |
| CO-708, CO-2439, CO-3155 (presumptive) | 6 | Right: a presumptive determination is made on its date from declarations (8.100.4.F, S219, S1501; CHP+ S246) |
| CO-4561, CO-7408 (C.5, the premium tax credit methodology) | 11 | Right: an annual figure for the taxable year of the determination or, for a month of the year before, of that year (C6-09; 26 CFR 1.36B-1(h)) |
| CO-504 (the year of the month against the determination's) | 1 | Right (C6-09) |
| CO-565, CO-7401, CO-2407, CO-7405, CO-7406, CO-556 (the months of the application to the determination month) | 12 | Right: the periods open in the first month of the application through the determination month that meets the rule (C6-01, C6-02, C6-08); later months are the determination's projections |
| CO-3601, CO-7051, CO-4101, CO-4565 (`month >= det_month`) | 4 | Right: a bare is_pregnant and an unknown application date are read only for the determination month and later (C6-05(c), C6-06) |
| CO-2869, CO-2430 (TMA's caretaker and history at the determination) | 2 | Right: the loss of eligibility is recorded before the determination (I.1, S1719); CO-2869 reads the caretaker relationship for the determination month |
| CO-2442, CO-4793 (Express Lane verification period) | 2 | Right: the period runs from the Express Lane enrollment date and is tested on the determination date (J.2, S1723) |
| CO-1964, CO-1973, CO-1974, CO-1975 (community engagement) | 5 | Right: the review is made at the determination over its review months, the requirement in force on the determination date (435.555-435.559, S1211, S1212) |
| CO-4552 (battery exception period) | 1 | Right: the twelve months run from the finding and the exception is tested at the determination (8 U.S.C. 1631(f), S3355) |
| CO-5200 (institutionalized spouse) | 1 | Non-MAGI |
| CO-7400 most_recent_pregnancy_end_date | 2 | Right: a day count from the determination date used only to find the greatest date of birth (P59) |

### 1.3 Records and their dates

39 record sums. The twelve on the MAGI and CHP+ path read their records' time: ma_magi_wage_earnings (CO-5160), ma_magi_self_employment_earnings (CO-5161), ma_magi_difficulty_of_care_earnings (CO-5162), CO-5163, CO-5164, ma_magi_boarder_earnings (CO-6450, two sums), ma_annualizable_earnings_in_month (CO-7404), ma_magi_unearned_receipts (CO-5501) and ma_magi_gambling_receipts (CO-5502) each place a record by `received_in` and a stream by its job's or source's dates (the field sweep, C6-07): right. ma_has_annualizable_earnings (CO-6451, two sums) reads no time field: right, C.4.a annualizes for "individuals who have self-employment, seasonal and commission-based employment income" (S3356), a fact of the person's year, and the year's figure (CO-7403) carries the amount. The other 27 sums are the SSI method's (non-MAGI).

## 2. Pattern 2: defaults the rules do not give

164 occurrences in 69 MAGI, CHP+ and shared items (123 more are in the SSI-method items the outcomes reach only through an aged, blind or disabled arm, and in the non-MAGI continuous eligibility period CO-2448: left to the non-MAGI sweep). Verdict per item (the number is the occurrences):

| Item | Occurrences: what | Verdict |
|---|---|---|
| CO-500 ma_magi_household_members | 9: two `otherwise ... persons` on a claimer's spouse's lives_with; two `otherwise files_jointly_with_spouse true`; five `otherwise (has_relative_in ...) false` | **Fixed (PS-03)**: the four defaults removed (decision 4; C6-10 for the rest of the item). The five `otherwise false` around `has_relative_in` read another person's unstated relationships as none: right, docs/operators.md (Relationships: "Where an operator reads another person's relationships ... unstated is read as none"); the sweep restructured each so that only the relationship, never lives_with or joint filing, falls back |
| CO-554 ma_magi_eligibility_status | 3: `otherwise is_inmate false`; two `otherwise ma_is_in_pregnancy_coverage_period` | **Fixed (PS-05, PS-06)**: the setting is required where read; an unknown period is eligible only where she meets the Pregnant Women category this month (F2-1) and otherwise cannot be determined |
| CO-549 ma_is_former_foster_care_category | 2: foster care in another state; subsidized adoption | **Fixed (PS-06)** for another state (H.2.a vs a.iii, S1718: neither presumed); subsidized adoption right: "This extension does not apply to youth that are receiving subsidized adoption payments" (H.2.a.i, S1718), the exclusion's own form |
| CO-2419 ma_needy_young_person_category | 2: inpatient at 21; subsidized adoption | **Fixed (PS-06)** for inpatient at 21 (H.1.a, S1717, gives no reading); subsidized adoption right (an exclusion, as CO-549) |
| CO-2425 ma_household_has_employed_parent_caretaker | 1: left employment with good cause | **Fixed (PS-06)** (I.1.b.i, S1719) |
| CO-2410 chp_is_guaranteed_newborn; CO-4565 chp_month_is_before_coverage_period | 1; 7 (two on the guaranteed newborn, five structural) | **Fixed (PS-06)** for the mother's CHP+ enrollment at the birth (§ 430.5, S1716, gives no reading); CO-4565's other five are the structure of a recorded period and an unknown application date (C6-02, C6-05(c)): right |
| CO-1403 ma_requires_verification_of_earned_income | 1: a member's coverage request | **Fixed (PS-06)** |
| CO-561 ma_child_is_in_continuous_eligibility_period | 2: the recorded period's program; its start's guard | **Fixed (PS-06)** for the program of a recorded period (Q.2-Q.3, S1724, run the period by the program it began in); the guard is the recorded-or-computed structure (C6-08): right |
| CO-1976 ma_dependent_is_routed_to_non_filer_rules | 2: custodial parent; separation | Custodial parent right: declared on ma_custodial_parent (CO-1946) with its citation (S1226: "the parent with whom the child spends most nights"); separation **fixed (PS-06)**: read for a parent who does not live in the home, required there (E.4, S170) |
| CO-555, CO-7405 | 1; 2: `otherwise ma_continuous_eligibility_program magi`; a recorded start's guard | Right: they look for the period this MAGI determination opens, MAGI's by construction (Q.2, S1724), declared on CO-2446 since the sweep |
| CO-565, CO-7401, CO-4101 | 4; 3; 4: retroactive request false; history false; the date of birth guard; the application date guard | Right: a retroactive request is made on the application (8.100.3.E.2, S1503; declared on CO-4100: "If not stated, no request was made"); the eligibility history is the agency's record of the months it approved (CO-2424; C6-01), a month it does not record was not approved; the application-date guard is C6-05(c)'s structure; the date-of-birth guard changes no outcome (every category reads the age, so an unstated date of birth is cannot determine downstream) |
| CO-566, CO-3601, CO-7051, CO-2404, CO-2407, CO-7406, CO-7400, CO-1173 | 3; 4; 4; 3; 7; 1; 3; 1: `unknown` guards on the dated pregnancy, the recorded periods and the application date | Right: the coverage pass 6 structure (C6-01 to C6-06, C6-08), each declared on its fact (CO-089's precision for an ended pregnancy; CO-2402, CO-094 for recorded periods); CO-7400's `otherwise rel false` is the relationships convention |
| CO-2430, CO-2431, CO-4205 | 1; 2; 2: the history at the month before; the loss's month and reason | Right: facts of the eligibility history (the TMA class: C5-17, the loss stated; I.1-I.5, S1719, S1720) |
| CO-2205 | 1: the reasonable opportunity period's end | Right: Q.1.b.vii (S1502) ends the period on a failure "during a reasonable opportunity period", one a notice opens (a recorded act); with none stated there is none to fail |
| CO-1413 | 1: an extended end | Right: the period is the standard one unless an extension is recorded (a grant) |
| CO-2214 | 1: the previous eligibility end | Right: a fact of the history (a previous enrollment's end is recorded where there was one) |
| CO-1187, CO-503 | 1; 1: the lottery hardship exemption | Right: an exemption granted on request after a denial (C.1.b.xiv.5, S669: "may request a hardship exemption when an application is denied"); counted unless granted |
| CO-1105 is_inmate_of_public_institution | 2: stay pending other arrangements; community corrections | Right: 42 CFR 435.1010's exceptions ("An individual is not considered an inmate if ...", S2202) and § 8.100.3.G.1.b.i.5's enrollable class (S3361): the exception's own form |
| CO-1172, CO-1725, CO-005, CO-930 | 3; 1; 3; 2: the exemptions from the five-year bar (American Indian born in Canada, Hmong veteran, the status before adjustment, the military connection of a spouse or parent, marital status) | Right: 8 U.S.C. 1613(a) applies "except as provided in subsections (b), (c), and (d)" (S176): the bar applies unless an exemption is shown; the relationship arms are the relationships convention |
| CO-507, CO-2706 | 1; 1: American Indian born in Canada | Right: part of the declared immigration status (immigration_status, CO-002, stated for every non-citizen; this flag is a status 8.100.3.G.1.g lists that the option list does not carry, read as part of the same declaration) |
| CO-1938, CO-1964, CO-1966, CO-1967, CO-1968, CO-1974, CO-3165, CO-2711 | 1; 1; 3; 3; 1; 1; 1; 1: community engagement (from 2027-01-01) | Right: an activity counts only as the person "demonstrates" it (42 CFR 435.556, 1396a(xx)(2), S1201), so an activity not stated is 0 hours; the Indian and medically frail arms are alternatives and an exception (stable recovery) read in the exception's form; a notice not stated has not been sent (notice_required, 435.558, S1211); the notice's receipt is presumed after the stated days (S2108); CO-2711 falls back to the stated exemption where SNAP's own items do not decide it |
| CO-2442, CO-4793 | 1; 1: the Express Lane source | Right: the path exists only for a stated Express Lane agency finding (J.1, S1723); none stated is not_applicable |
| CO-4551, CO-4552 | 2; 5: the sponsor's existence guard; the indigence period; the battery exception | Right: the sponsor guard only orders the rows (an unknown sponsorship is still cannot determine at the last row, C5-06); an indigence determination is a recorded finding (8 U.S.C. 1631(e), S3354); the battery exception is an exception to the attribution (8 U.S.C. 1631(f), S3355) |
| CO-4558 | 1: required to file excluding Social Security | Right: declared on CO-4568 (the figure differs only where Social Security is the reason to file) |
| CO-087, CO-3322, CO-2610, CO-2845 | 1; 3; 2; 2 | Right: another person's unstated relationships read as none (docs/operators.md) |
| CO-2200 is_deceased | 1: date_of_death | Right: declared on date_of_death (CO-2868: "Not stated for a living person") |
| CO-2250, CO-7402, CO-505 | 3; 2; 2: incapable of indicating intent; the residence guards | Right: 42 CFR 435.403's rules for a person "incapable of indicating intent" are a special case of the general rule (S171, S172); the residence guards are C6-05(a)'s |
| CO-551 | 1: the date of birth guard | Right (as CO-4101's) |
| CO-5160 to CO-5164, CO-6450, CO-7404, CO-5501, CO-5502 | 33: `unknown` on a record's month, dates and taxable amount | Right: each record field's `when_absent` declared on CO-5000 and CO-5100 ("A record's time": an undated record recurs; a stream with no dates runs through the months the case covers; taxable_amount, C5-09) |

**Record fields with a default the MAGI and CHP+ readers read (31 fields).** None changed. combat_zone_compensation, combat_zone and employer_convenience_meals_or_lodging (default false): right, 26 U.S.C. 61(a) "Except as otherwise provided", 112, 119 (S4631, S4340, S4636; the field sweep). recouped and for_person_living_elsewhere (default 0, read by CO-5501 for Social Security): right, decided by the text: 26 U.S.C. 86(d)(1) counts "any amount received by the taxpayer by reason of entitlement to" the benefit and (d)(2)(A) reduces it "by any repayment made" (S4881), so the benefit is counted at the gross amount the record states ("before anything withheld", the amount field) unless a repayment or a part for another person is stated: the counted-unless-excluded form of design decision D3. The shared default is kept, so no other program's reader changes; its readers are SNAP CO-5011, CO-5113, CO-5114, CO-5115, CO-6600 (recouped), Colorado Works CO-4369 and LEAP CO-4526, CO-5003, CO-5009 (for_person_living_elsewhere). month, date, start_date, end_date, job_start_date, job_end_date, taxable_amount (`when_absent`): right, the records' own definitions. kind, amount, net_for_tax, seasonal_or_commission: required. The other fields are read only by the SSI-method readers (non-MAGI).

## 3. Pattern 3: couples and household membership

245 occurrences in 74 MAGI, CHP+ and shared items (87 more in 31 SSI-method couple and deeming items: non-MAGI). The composition rules, each checked for its month edges and for the membership each count and sum uses:

| Rule | Items | Verdict |
|---|---|---|
| Tax filer's household: filer, spouse living in the home, claimed dependents (E.1.a, S169; 435.603(f)(1), S162) | CO-500 (filer arm), CO-076, CO-077, CO-4560 | Per month through the ages and the home in the month; **fixed (PS-04)**: a spouse who died before the month is no longer "living in the home"; a dependent the filer expects to claim stays a member by the claim (for the taxable year, E.1.a.iii); **fixed (PS-03)**: the joint-filing default on the spouse's dependents removed |
| Claimed dependent's household (E.1.b) and its exceptions (E.1.c, E.4) | CO-500 (dependent arm), CO-1976, CO-563 | **Fixed (PS-03, PS-04)**: the claimer's spouse "if living in the home" read from her home in the month, required (was every person); a claimer's spouse who died lives with no one; E.1.c.ii's "living with both parents" counts the parents living in the home in the month; E.4 read only for a parent living elsewhere |
| Non-filer household (E.1.d; (f)(3)) | CO-500 (else arm), CO-2609, CO-2610 | **Fixed (PS-04)**: "who live in the household" in the month; the ages per month (first day) since time audit T-1; siblings and step-siblings from the parent edges, which do not change by month: right |
| Married couples (E.3; (f)(4)) | CO-500 (both arms), CO-930 | Right since C6-10 (living together from the home), and per month since PS-04 |
| Children living with both parents, not filing jointly (E.1.c.ii) | CO-1976 | Right; per month since PS-04 |
| Pregnant member counted with the expected children (E.2, S170; 435.603(b), S161) | CO-501, CO-7050, CO-4976 | Right since C5-02 and C6-03: per month; a baby counts from its birth month (0 before), the mother 1 + (expected - born in the month) while pregnant |
| A member born, dying or leaving mid-period | CO-501 (born), CO-7554 (died), lives_with (left) | Born: right (CO-501). Died: **fixed (PS-04)**. Left: the home is stated once (dwelling_id, the determination date's): OQ-1425 records a move between a retroactive month and the determination |
| Household income members (435.603(d)(2), S164) | CO-4558, CO-503, CO-4559, CO-4975, CO-1344, CO-4977 | Right: the members of the month's household less a child or claimed non-parent dependent not required to file "for the taxable year" (annual by the text); every sum reads that membership |
| Family size counts | CO-501, CO-4976, CO-6452, CO-6453, CO-4567, CO-4979, CO-1153, CO-1155, CO-504, CO-539, CO-545 to CO-548, CO-552, CO-704 | Right: each reads ma_magi_household_size or ma_family_planning_household_size of the month |
| Caretaker relative (G.3, S1500) | CO-2606, CO-2869, CO-547, CO-548, CO-539, CO-552, CO-2430, CO-4204 | **Fixed (PS-04)**: per month (a child who died before the month is not a child the person lives with); CO-2869 reads it for the determination month |
| TMA household (I, S1719) | CO-4204, CO-4205, CO-2425, CO-2430 | Right: per month from the MAGI household of the month and the caretaker relationship (per month since PS-04) |
| Premium tax credit family (C.5, S166; 26 CFR 1.36B-1(d)) | CO-4560, CO-4561, CO-4564, CO-7408 | Right: the year's tax family (taxpayer, spouse filing jointly, dependents claimed), annual by the methodology; a member who died during the year is in the year's family |
| Outside claimers (E.1.b; C6-04) | CO-076, CO-563, CO-4560 | Right since C6-04 (required where read) |
| Sponsors (8.100.3.K.1; 8 U.S.C. 1631) | CO-2713, CO-2714, CO-4551, CO-4552 | Right: the sponsors and non-cosigning spouses outside the MAGI household of the month, their MAGI income of the month (C5-06; the indigence period per month, C6-05(d)) |
| Newborn and the mother at the birth (G.7; § 430.5) | CO-087, CO-3322, CO-7400, CO-708 | Right: the mother's coverage in the birth month (CO-3322 reads it at the birth month); the presumptive test reads the determination month |
| Presumptive and declared household (8.100.4.F, S219, S1501; CHP+ S246) | CO-2439, CO-3151, CO-3152, CO-3153, CO-3155, CO-558, CO-559 | Right: the declared household size and income on the presumptive determination's date |
| Verification across members (8.100.4.B, S851) | CO-1402, CO-1403, CO-1622 | Right: the month's household members; CO-1403's member coverage request required since PS-06 |
| Community engagement caregivers (435.554-435.555) | CO-1924, CO-1926, CO-1962, CO-1963, CO-2845 | Right: relationships and the care stated; living with read from lives_with (from 2027) |
| CHP+ status and the Express Lane child | CO-2706, CO-3156, CO-4792 | Right; status per month since PS-02 |
| CO-2205 continuous eligibility exceptions (Q.1.b.iii, "no longer part of the Medical Assistance required household") | CO-2205 | Right: the departure is stated per month (ma_has_left_required_household, a person-month fact) |

## 4. Fixes

Commits on this branch: 3dbf35c (PS-01, PS-02), b2c5a79 (PS-03, PS-04), 1bc6df2 (PS-05), 51cf6ef and 377fba4 (PS-06, OQ-1425), 7854641 (PS-01's two ages), 51cb899 and 4e2bee2 (stored households state what their stories give; CHP+'s before-the-period test), 4b659a8 (UI pins, the harness entry), ebc3e69 (this review), 36d1e45 and c907216 (CO-7554 in the checker's form; the change record re-keyed). New items: CO-7550 ma_has_held_qualified_status_five_years_in_month, CO-7551 ma_meets_citizenship_requirement_in_month, CO-7552 ma_is_cover_all_coloradans_person_in_month, CO-7553 ma_meets_status_for_cover_all_coloradans_categories_in_month, CO-7554 ma_lives_with_in_month, CO-7555 ma_is_inmate_in_month (all Medicaid, person-month). No new source excerpt: every fix cites text on file (S176, S217, S3351, S607, S606, S3361, S169, S170, S163, S1502, S1716 to S1719, S1724). New question: OQ-1425. Stored households CO-1000 to CO-1004.

| ID | What changed | Rule tests (hand values) | Stored household (hand computation in its comment) |
|---|---|---|---|
| PS-01 | CO-7550 (the five years end by the last day of the month, G.1), CO-7551 (CO-509's categories with the five years, the lawfully residing pregnancy and the child's age under 19 on the first day read for the month; the October 2026 federal limit still read on the determination date, OQ-510). Readers switched: ma_magi_is_fully_eligible (CO-562), ma_is_emergency_medicaid_only (CO-510), ma_family_planning_status (CO-1154), ma_needy_young_person_category (CO-2419), ma_is_covered_under_cover_all_coloradans (CO-1175). The month's age (last day) in CO-1403 (an adult's data-source arm) and CO-2419 (the subsidized adoption exclusion). CO-509 is unchanged for its person-scope and non-MAGI readers. | CO-7550-T1 to T4 (status from 2021-09-15: August 2026 false, September true); CO-7551-T1 to T8 (LPR-5Y August false, September true; YOUTH-19 August true, October false; a TPS woman pregnant in September true, November false; a refugee adult in September false under OQ-510); CO-1403-T10, T11 (born 2007-10-20: September not asked, October asked); CO-2419-T25, T26 (born 2008-10-15: September not excluded, October excluded) | CO-1000 LPR-5Y: 1,000 / 1,330 = 75.2%, Adults; August emergency_only, September to November eligible (before: August eligible). CO-1001 YOUTH-19: August and September child, eligible; October and November adult, emergency_only (before: August and September emergency_only) |
| PS-02 | CO-7552 (under 19 or the 19th birthday in the month, pregnant in the month, or the end month of the pregnancy through the 12th month after it), CO-7553 (status or the population, for the month). Readers switched: CO-562, CO-1175, CO-2419, ma_is_eligible_for_transitional_medical_assistance (CO-2430), ma_is_eligible_for_four_month_extension (CO-2431); CHP+'s chp_meets_status_requirement (CO-2707) per month on CO-7552. CO-1173 and CO-1174 unchanged for the presumptive and non-MAGI readers. | CO-7552-T1 to T6; CO-7553-T1 to T3; CO-2707-T4, T5 (undocumented, 19th birthday in September: true; October false); CO-2707-T1 to T3 re-keyed to the month | CO-1002 UNDOC-19: August and September child, eligible (Cover All Coloradans); October and November emergency_only (before: August and September emergency_only). CO-95's chp_meets_status_requirement expectations re-keyed to the month (values unchanged) |
| PS-03 | CO-500's claimed-dependent arm: the claimer's spouse "if living in the home" read from her home in the month, the joint-filing default removed (both arms), each `otherwise` now covering only another person's unstated relationships. | CO-500-T18 (the claimer's wife's home not stated: unknown; was [p1, p2, p3]), T19 (stated: [p1, p2, p3]) | (rule tests) |
| PS-04 | CO-7554 (lives_with less a person who died before the month; a person who died before the month lives with no one). Read by CO-500 (every arm), CO-1976 (the parents living with the child), ma_caretaker_relative_of (CO-2606, now per month) and ma_tma_household_members (CO-4204); CO-2869 reads CO-2606 at the determination month. | CO-7554-T1 to T4; CO-500-T20 to T22 (a husband who died 2026-09-10: October [p1, p3], September all three; a non-filer child: October the child and her mother); CO-2606-T5, T6 | CO-1003 WIDOW: August and September size 3, 5,800 / 2,276.67 = 254.8%; October and November size 2, 2,800 / 1,803.33 = 155.3%: p1 and p3 ineligible_income, p3 CHP+ eligible_child in November (before: October size 3, 123.0%, both eligible, CHP+ ineligible_medicaid_eligible) |
| PS-05 | CO-7555 (an inmate on every day of the month: the stay began on or before its first day, institution_entry_date required where read). ma_magi_eligibility_status (CO-554) reads it in both inmate rows, and the `otherwise ... false` on an unstated setting is removed. CO-376 (the only stored inmate MAGI reads) states its stay's entry date (2026-09-01; her story has her in the jail through the application and the determination). | CO-7555-T1 to T6; CO-554-T97 (no setting stated: unknown; was eligible), T98, T99 (JAILED: September eligible, November incarceration_limited); CO-554-T5, T7, T12 state the inmate value | CO-1004 JAILED: August, September and October eligible (October's first four days outside the stay), November incarceration_limited (before: August to November incarceration_limited) |
| PS-06 | Required where read: ma_foster_care_was_in_another_state (CO-549), ma_is_in_inpatient_treatment_at_twenty_one (CO-2419), left_employment_with_good_cause (CO-2425), chp_mother_was_enrolled_at_birth (CO-2410, CO-4565), a member's ma_is_requesting_coverage (CO-1403), a recorded period's ma_continuous_eligibility_program (CO-561), E.4's separation for a parent living elsewhere (CO-1976); CO-554's unknown pregnancy coverage period. The facts' declarations restated (CO-2416, CO-2420, CO-2860, CO-2446). | CO-549-T96, T97; CO-2419-T23, T24 (T8 states the fact); CO-2425-T3, T4; CO-2410-T20 (T3 states the fact); CO-4565-T22, T23 (a baby whose mother's CHP+ enrollment at the birth is not stated: October cannot be determined; stated not enrolled: before the period); CO-561-T21 (T5 states the program); CO-1976-T12, T13 (T4 states the homes); CO-554-T100 | CO-05 states Marcus's Colorado foster care, CO-213 that p1 lives in a nursing facility and is not separated, CO-811 that the mother was not enrolled in CHP+ at the birth (their stories) |

Every rule test and stored household expectation passes (`scripts/audit/quick-tests.ts`: 10,712 rule tests and household expectations checked, 0 failed, after the merge of origin).

## 5. Open questions

| OQ | Class | What it records |
|---|---|---|
| OQ-1425 (new) | state policy choice | A fact the case states once, for the determination date, read in a retroactive month (residence, Medicare, a child's coverage, immigration status, a care arrangement, a parent living apart, an earlier institution stay); the assumption: they hold in each retroactive month except where the case states the date of a change. Checked: 8.100.3.E.1-2, G.1, 42 CFR 435.915(a), 435.403; no text says how a retroactive month's non-financial facts are established |
| OQ-510 (unchanged) | state policy choice | The October 2026 federal payment limit by determination date; the per-month status test (CO-7551) keeps it |

OQ-1426 to OQ-1434 and CO-7556 to CO-7599 are unused.

## 6. Answer changes

`scripts/audit/answer-diff.ts` evaluates the MAGI and CHP+ outcomes (and the household size and income percentage) on the ledger before the sweep (origin's branch head, merged) and on the sweep's ledger, for the same 2,107 households (the stored households and the receipts harness's 1,626 generated ones, translated as the harnesses translate them), over the three months before each determination month, the determination month, the month after and every month an expectation names. Every difference is in a household this sweep added: CO-1000 (August emergency_only; its limited Family Planning status in August now reads the reproductive-capacity fact the household does not state: cannot determine), CO-1001 and CO-1002 (August and September eligible), CO-1003 (October to December: size 2, p1 and p3 ineligible_income, p3 CHP+ eligible_child from November; the husband's own months after his death cannot be determined: he lives with no one in them) and CO-1004 (August to October eligible). No stored household of an earlier round and no generated household changes a MAGI or CHP+ outcome: the defaults removed were not relied on by any of them once CO-213 (a parent in a nursing facility, not separated), CO-376 (the jail stay's entry date), CO-05 (Colorado foster care), CO-811 (the mother not enrolled in CHP+ at the birth) and CO-95 (status per month) state what their stories give. Below the outcomes, one figure moves: CO-394's earned-income verification in October (PS-01, below).

## 7. Gate

On the branch head after merging origin (`origin/ccr-9d19bf4c-wmnwcl` at 14558ff, the cash pass-6 round; fetched again before the gate: no newer commit on the branch or on origin/main).

- `node scripts/sync-manifest.mjs co`: written.
- `npm run typecheck`: passes.
- `npx vitest run`: 1,161 tests in 103 files pass, with the UI pins re-pinned in 4b659a8, each with its reason (OQ-1425 among the Medicaid policy owner's and HCPF's open questions and in the queue, 216; CO-191 read by 48 households and reaching 117, with CO-1000 to CO-1004; 124 long rule lines).
- `npm run receipts:harness -- --all-programs`: OK, 0 unexplained (stored 3,322 values differ, all allowed; generated 34,557, all allowed); metamorphic 0 violations.
- `npm run records:harness -- --list earnings --all-programs`: OK, 0 unexplained (stored 3,617; generated 6,853); translation 0 stale; metamorphic 0 violations.
- `npm run records:harness -- --list holdings --all-programs`: OK, 0 unexplained (stored 3,435; generated 2,442); translation 0 stale; metamorphic 0 violations.
- The one entry this sweep adds to the harnesses' allowed differences (scripts/receipts/allowed-differences.yaml, scripts/records/allowed/ps-magi.yaml and h7-ps-magi.yaml): CO-394's p3 turns 19 on 2026-10-20, so October asks the adult's earned-income verification arm (PS-01, the age in the month) and the household does not state what that arm reads (one case, one person, one identifier, one month; old false, new unknown). The acceptance logic is unchanged.
- `CHECK_BASE=origin/main npm run check`: OK (co: 6,078 rule tests and 4,634 household expectations pass; change impact 28 flags, all dispositioned; conformance self-check OK, 6,719 cases, 10,872 checks) after the change record (volumes/co/changes/2026-11-24-pattern-sweep-magi.yaml dispositions the sweep's two change-impact flags, CO-616 to CO-617 and CO-2606 to CO-544); every rule test and stored household expectation passes; the stale dispositions the check lists in earlier change records (flags of earlier rounds whose changed item now reads an item this sweep changed) do not block and are left to the integration's re-keying, as in coverage pass 6.
