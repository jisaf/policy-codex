# Cross-program audit: shared rules and cross-program reads (2026-11-23)

Step 4B of the 2026-11-23 plan (docs/plan-colorado.md, product-owner decisions, item 1). Every shared (program All) derived item of the Colorado volume and every read of another program's item is classified in one of the four classes of docs/conventions.md, "Cross-program links": **primitive** (one meaning everywhere), **adopted method** (a program adopts another's method by reference, cited), **rule-required outcome link** (a rule makes one program's outcome an input to another, cited), **program calculation** (never shared). The classes are written on the items (`link_class`, `link_basis`, `adopted_by`, and `accepts_from` entries with `class` and `source`), and governance now refuses an unclassified shared rule or an undeclared read (docs/governance.md, "Cross-program links").

Nothing is split in this change. The five shared program calculations below are held in `volumes/co/cross-program-allowlist.yaml` (dated 2026-11-23, 13 entries: 5 items and their 8 readers), which `npm run check` reports as a warning count and lets only shrink.

**Update, receipts migration phase 2 (2026-11-23; docs/reviews/receipts-migration-2-cccap-sunbucks.md).** The allowlist holds 4 items and 6 readers (10 entries). CO-3913 `unearned_income_prior_thirty_days` had no LEAP reader after phase 1 (LEAP reads its receipts, CO-5003 to CO-5009), and CCCAP now reads its receipts too (`cccap_counted_recurring_receipts`, CO-5721, through `cccap_receipt_treatment_table`, CO-5720): CO-3913 had no reader left and is removed with its entry. CO-3912 `wages_gross_prior_thirty_days` is still read by both programs (CCCAP CO-3915, LEAP CO-3925) and stays held. Its split was tried and backed out, for two reasons `npm run check` gives: the LEAP copy must carry LEAP's prefix (`name.prefix`: "LEAP rules start with \"leap_\""), and renaming CO-3912 edits its reader CO-3925, a LEAP item the phase-2 track may not edit; and the two copies would have identical derivations, which governance refuses (`dup.compact`), since neither program's rule reads the thirty-day wages differently (both leave out work-study: CCCAP 3.111.J.16; LEAP reads the same receipts). The split belongs to a LEAP change that renames CO-3912 to `leap_wages_prior_thirty_days` with CO-3925 and gives CCCAP its own item, deciding how two identical copies pass `dup.compact` (or keeping one shared figure as a primitive, if the owners agree no program defines it differently).

**Update, receipts migration phase 3 (2026-11-23; docs/reviews/receipts-migration-3.md): CO-3912 split, decided from the two texts.** The question was whether the two rules define the same thirty-day window (then the honest outcome is one primitive with its one-line statement) or not (then each program keeps its own). They do not. LEAP: 9 CCR 2503-7 3.751.1 (S2712) defines the income verification period as "from the date of application to the same date of the prior month (approximately thirty (30) calendar days from the date of application)", a period anchored to the calendar date (28 to 31 days; OQ-886 for a month with no same date), read for wages only where a job began or ended in it (3.752.22.C.3; ongoing pay is "any four (4) weeks of the eight (8)", B). CCCAP: 8 CCR 1403-1 3.111.H.5.a.1 (S891) uses "income received during the prior thirty (30) day period" for ongoing employment, "at Application and Re-determination", unless the county finds it does not indicate anticipated income (OQ-680; cccap_county_determined_monthly_income, CO-3914). Different window, different anchor, different use: not a primitive. Both readings today take the same neutral receipt (wages_gross_received_prior_thirty_days, CO-3910, the thirty days before the application date; LEAP by its recorded reading, OQ-681) less work-study (LEAP 3.752.23.P, CCCAP J.16), so two per-program items would have identical derivations, which governance refuses (dup.compact) because an identical copy is the duplication it exists to stop. So the split puts each program's statement where its rule reads it: CO-3912 keeps its id and becomes LEAP's own item, `leap_wages_in_income_verification_period` (program LEAP, its meaning quoting 3.751.1 and 3.752.23.P, OQ-681 on the period), read by `leap_person_wages` (CO-3925); CCCAP's `cccap_person_earned_income` (CO-3915) states its own prior thirty days (H.5.a.1) and its work-study exclusion (J.16) in its derivation. If the LEAP owner answers OQ-681 by reading the period as its text gives it (to the same date of the prior month), only LEAP's item changes. The allowlist entry for CO-3912 is removed: the list holds 2 items and 3 readers (5 entries: CO-3387 with CO-2471; CO-087 with CO-1395 and CO-550), from 3 items and 5 readers (8) after phase 2's Medicaid track removed CO-3159.

## Counts

| | Count |
|---|---|
| Shared (All) derived items | 62 (60 in `volumes/co/shared/`, 2 program-All items in `volumes/co/medicaid/`) |
| primitive | 51 |
| adopted method | 6 (the SSI resource, in-kind support and student items; Revenue's Appendix A citizenship documents) |
| program calculation, held on the allowlist | 5 (4 after receipts migration phase 2) |
| Reads of another program's supplied fact or rule | 72 (55 of rules, 17 of supplied facts), every one now declared |
| adopted method | 43 (all reads of rules: CHP+ applying Medicaid's MAGI household, income and verification items by reference, Medicaid reading SNAP's utility allowance and Adult Financial's OAP age, Colorado Works reading the burial excess-resources method) |
| rule-required outcome link | 14 (12 of rules, 2 of supplied findings) |
| primitive (another program's supplied fact with one meaning) | 15 |
| Declared reads of another program's parameter (not required, classified anyway) | 2, adopted method (`ma_income_reasonable_opportunity_days` for CHP+, `snap_maximum_allotment_table` for Colorado Works boarders) |
| Undeclared reads found and declared in this change | 5 (CO-1108, CO-3387, CO-1642, CO-4565, CO-989) |
| Unjustified cross-program reads of a program's own rule | 0 |

The 32 items that carried `accepts_from` before this change carried 68 bare identifiers; each is now `{from, class, source}`.

## Held: shared program calculations and the proposed split

None of these is required by a rule to be shared. Each split is a change to what items decide, so it goes through the change-impact check (docs/governance.md, "Change impact"), ships with a whole-household test, and registers the per-program copies as `siblings` where two programs keep the same logic.

| Held item | Read by | Why it is a program calculation | Proposed split |
|---|---|---|---|
| CO-3912 `wages_gross_prior_thirty_days` (**split**, receipts migration phase 3: LEAP's own `leap_wages_in_income_verification_period`, CCCAP's thirty days in CO-3915; off the allowlist) | CCCAP CO-3915 `cccap_person_earned_income`; LEAP CO-3925 `leap_person_wages` | Thirty-day gross wages, less college work-study, with a calendar-month fallback: an income figure two programs read with no rule requiring a common one; this is the item whose fixes collided between CCCAP and LEAP (design-restructure-proposal.md, cause 3) | `cccap_wages_prior_thirty_days` (8 CCR 1403-1, S891) and `leap_wages_prior_thirty_days` (9 CCR 2503-7, S2712), each built from `wages_gross_received_prior_thirty_days`, `wages_gross` and `work_study_earnings` by its own rule's exclusions; registered as siblings; remove CO-3912 |
| CO-3913 `unearned_income_prior_thirty_days` (**removed**, receipts migration phase 2: LEAP and CCCAP each read their receipts through their own counting table) | CCCAP CO-3916 `cccap_person_unearned_income`; LEAP CO-3926 `leap_person_unearned_income` | Thirty-day unearned income less a list of receipts (educational assistance, loans, reimbursements, energy assistance, tax refunds, federally excluded payments, lump sums) that is the union of two programs' exclusion lists | `cccap_unearned_income_prior_thirty_days` and `leap_unearned_income_prior_thirty_days`, each subtracting only its own rule's exclusions (S891 for CCCAP, S2713 for LEAP); siblings; remove CO-3913 |
| CO-3159 `has_unearned_income_other_than_interest_and_dividends` | Medicaid CO-1404 `ma_requires_verification_of_unearned_income` | A sum of every unearned-income fact less interest and dividends, Medicaid's verification trigger (42 CFR 435.952(e), S1089); no other program reads it | Move to Medicaid (the Rename tool keeps the id): `ma_has_unearned_income_other_than_interest_and_dividends`, program Medicaid; step 3 of the plan (verification reads what is counted) may replace it with a read of Medicaid's counted unearned income |
| CO-3387 `ssi_student_earned_income_exclusion_basis` | Medicaid CO-2471 `ma_ssi_excluded_earned_income` | Built on Medicaid's own `ma_self_employment_net_earnings` (CO-1704), so it is SSI-related Medicaid's figure, not the SSI method as such | Move to Medicaid as `ma_ssi_student_earned_income_exclusion_basis`, program Medicaid; Adult Financial, if its 3.520.786.K exclusions need the student exclusion, builds its own `af_` item from the shared SSI student test (CO-3386, an adopted method) and registers it as a sibling |
| CO-087 `mother_was_enrolled_in_medicaid_at_birth` | Medicaid CO-1395 `ma_requires_verification_of_citizenship`, CO-550 `ma_is_needy_newborn` | Medicaid's eligible-needy-newborn condition (10 CCR 2505-10 8.100.4.G.7, 42 CFR 435.117), built on Medicaid's own pregnancy coverage period (a rule-required read of CO-566) | Move to Medicaid as `ma_mother_was_enrolled_at_birth`, program Medicaid; the shared `birth_mother_coverage_at_birth` (CO-3322, a primitive) stays shared, and CHP+ keeps reading it for its own newborn rule (§ 430.5) |

## Follow-ups found while classifying (not violations)

1. **An age test in Medicaid's namespace.** CHP+ reads `ma_is_under_child_age_or_turns_nineteen_this_month` (CO-564) in 8 rules, classified adopted method on 10 CCR 2505-3 § 110.1.B.5.o (S606), which states the same "under 19, or whose 19th birthday occurred in the current month" test as Medicaid's § 8.100.3.G.1.g.ix (S607). Both rules state it in the same words; moved to a shared primitive it would remove 8 links.
2. **Supplied facts owned by one program but neutral in meaning.** 15 declared primitive reads are of supplied facts whose program is one program but whose meaning is a plain fact of the application or the case: `ma_application_date` (3 CHP+ readers), `documentation_not_reasonably_available` (2), `ma_is_requesting_coverage`, `chp_is_requesting_coverage`, `ma_express_lane_source`, `ma_express_lane_family_opted_in`, `participates_in_drug_alcohol_treatment`, `lost_ssi_due_to_social_security_benefits`, and the four Adult Financial burial facts Colorado Works reads. Under conventions rule 13 they are candidates to make program-neutral (program All); that is a change of an approvable field, so it is left for a reviewed change.
3. **A neutral test under a word with many meanings.** `has_earned_income` (CO-1356, a primitive: wages or self-employment receipts above zero, gross) is read by Medicaid and CCCAP for verification. A program whose earned income includes in-kind pay or excludes work-study must read its own item; plan step 3 (verification reads what is counted) should revisit both readers.
4. **Two primitives resting on a federal definition other programs might read differently.** `resides_in_medical_institution` (CO-1742, 42 CFR 435.1010) is also read by Adult Financial (CO-1217, CO-4446), and `meets_public_assistance_citizenship_requirement` (CO-905, C.R.S. 26-2-111.8(2)) by Colorado Works and Adult Financial. Both are classified primitive because each reader's rule applies the definition as written; the Adult Financial and Colorado Works owners should confirm when they sign.
5. **A citation to check.** `ssi_countable_resources_individual` (CO-800, the SSI method) cites S2213, an Adult Financial countable-resources excerpt, beside the SSI and Medicaid ones. Adult Financial reads it only for burial assistance (CO-1225, 3.570.43.D.3.b names the SSI method); its sponsor resources follow Adult Financial's own rules (OQ-553). The S2213 citation should be confirmed or moved to Adult Financial's own resource item.

## Shared derived items

| Item | Identifier | Class | Read by | Basis |
|---|---|---|---|---|
| CO-087 | `mother_was_enrolled_in_medicaid_at_birth` | program_calculation | Medicaid | Medicaid's eligible-needy-newborn condition, built on Medicaid's own pregnancy coverage period and read only by Medicaid; to become Medicaid's own item (allowlisted). |
| CO-3159 | `has_unearned_income_other_than_interest_and_dividends` | program_calculation | Medicaid | Medicaid's unearned-income verification trigger, a sum of income facts only Medicaid reads and no rule shares; to become Medicaid's own item (allowlisted). |
| CO-3387 | `ssi_student_earned_income_exclusion_basis` | program_calculation | Medicaid | SSI-related Medicaid's student earned income exclusion base, built on Medicaid's own self-employment figure and read only by Medicaid; to become Medicaid's own item (allowlisted). |
| CO-3912 | `wages_gross_prior_thirty_days` | program_calculation | CCCAP, LEAP | Thirty-day gross wages read by CCCAP and LEAP, with no rule requiring the two programs to share the figure; to split into each program's own item (allowlisted). **Split in receipts migration phase 3:** LEAP's own item (`leap_wages_in_income_verification_period`, same id); CCCAP states its thirty days in CO-3915; off the allowlist. |
| CO-3913 | `unearned_income_prior_thirty_days` | program_calculation | CCCAP, LEAP | Thirty-day unearned income, less receipts with their own facts, read by CCCAP and LEAP with no rule requiring a shared figure; to split into each program's own item (allowlisted). **Removed in receipts migration phase 2:** no reader left; off the allowlist. |
| CO-800 | `ssi_countable_resources_individual` | adopted_method | AdultFinancial, All, Medicaid | The SSI resource methodology (20 CFR 416.1201-416.1266) as SSI-related Medicaid adopts it (10 CCR 2505-10 8.100.5.M) and Adult Financial burial assistance names it (9 CCR 2503-5 3.570.43.D.3.b). Adopted by: Medicaid (S301), AdultFinancial (S721). |
| CO-801 | `ssi_countable_resources_couple` | adopted_method | All | The SSI couple's resources (20 CFR 416.1202(a)) as 10 CCR 2505-10 8.100.5.M.1 adopts them for SSI-related Medicaid. Adopted by: Medicaid (S301). |
| CO-802 | `ssi_in_kind_support_and_maintenance` | adopted_method | Medicaid | SSI in-kind support and maintenance (20 CFR 416.1130-416.1140) as 10 CCR 2505-10 8.100.5.F.5.k adopts it for SSI-related Medicaid. Adopted by: Medicaid (S306). |
| CO-1657 | `citizenship_document_is_on_revenue_appendix_a` | adopted_method | ColoradoWorks, LEAP | The Department of Revenue's list of citizenship documents (1 CCR 204-30 Rule 5, Appendix A), which Colorado Works and LEAP adopt by reference. Adopted by: ColoradoWorks (S1066), LEAP (S895). |
| CO-2861 | `ssi_countable_resources_of_couple` | adopted_method | (none) | The SSI couple's countable resources (20 CFR 416.1202(a), 416.1806), stated once on one spouse, as 10 CCR 2505-10 8.100.5.M adopts the SSI method for SSI-related Medicaid. Adopted by: Medicaid (S301). |
| CO-3386 | `ssi_is_student_regularly_attending_school` | adopted_method | AdultFinancial, All | The SSI student test (20 CFR 416.1861), which Adult Financial adopts through 9 CCR 2503-5 3.520.786.K's SSI exclusions. Adopted by: AdultFinancial (S2206). |
| CO-005 | `has_military_connection` | primitive | All, CHP+ | The federal military-connection category of 8 U.S.C. 1613(b)(2) as the statute states it, read from service and relationship facts; no program defines it differently. |
| CO-017 | `is_medicare_entitled_or_enrolled` | primitive | Medicaid, SNAP | Medicare Part A entitlement or Part B enrollment as stated; a fact of the person's Medicare record that no program defines differently. |
| CO-021 | `is_enrolled_higher_education_half_time` | primitive | SNAP | Half-time or more enrollment in higher education as the institution defines it, from stated enrollment facts; no program defines it differently. |
| CO-069 | `is_enrolled_higher_education_full_time` | primitive | SNAP | Full-time enrollment in higher education as the institution determines it, from stated enrollment facts; no program defines it differently. |
| CO-073 | `receives_state_cash_assistance` | primitive | SNAP | Receipt of an Adult Financial cash payment as the person's case records it (a fact about another case, not this volume's determination); no program defines it differently. |
| CO-076 | `expects_to_be_claimed_as_dependent` | primitive | Medicaid | A tax-dependent claim as the person's tax facts state it; a fact of federal tax filing that no program defines differently. |
| CO-077 | `files_jointly_with_spouse` | primitive | Medicaid | Joint federal tax filing with a spouse as the tax facts state it; no program defines it differently. |
| CO-300 | `age` | primitive | AdultFinancial, All, CCCAP, CHP+, ColoradoWorks, LEAP, Medicaid, SNAP, SunBucks | Whole years from date of birth to the determination date; an age primitive (birthday-month rules are each program's own items). |
| CO-505 | `is_colorado_resident` | primitive | AdultFinancial, CCCAP, CHP+, ColoradoWorks, LEAP, Medicaid, SNAP | State of residence Colorado, as stated; each program's residency rule is its own item that reads it. |
| CO-506 | `is_qualified_non_citizen` | primitive | AdultFinancial, All, CCCAP, Medicaid | A qualified alien as 8 U.S.C. 1641(b)-(c) defines it; every program that reads it applies the statute as written. |
| CO-508 | `has_held_qualified_status_five_years` | primitive | All, Medicaid, SNAP | Five years in qualified status, a date difference against the 8 U.S.C. 1613(a) period; no program defines it differently. |
| CO-885 | `is_enrolled_in_pace` | primitive | Medicaid | Current PACE enrollment as the enrollment record shows; no program defines it differently. |
| CO-905 | `meets_public_assistance_citizenship_requirement` | primitive | AdultFinancial, ColoradoWorks | The citizenship requirement C.R.S. 26-2-111.8(2) sets for Colorado Works, OAP, AND and AB, stated once in the statute; neither program's rule defines it differently. |
| CO-930 | `is_married` | primitive | AdultFinancial, All, Medicaid, SNAP | Legal marriage, from the spouse relationship or the stated marital status; a relationship primitive (holding out as spouses is not marriage). |
| CO-1104 | `is_patient_in_institution_for_mental_diseases` | primitive | CHP+, Medicaid | An institution for mental diseases as 42 CFR 435.1010 defines it, from residence-setting facts; Medicaid and CHP+ both apply that definition as written. |
| CO-1105 | `is_inmate_of_public_institution` | primitive | CHP+, Medicaid | An inmate of a public institution as 42 CFR 435.1010 defines it; Medicaid and CHP+ both apply that definition as written. |
| CO-1108 | `lost_ssi_or_oap_due_to_social_security_benefits` | primitive | Medicaid | The loss of SSI or Old Age Pension because of Social Security benefits, as the case records it; a fact of past assistance that no program defines differently. |
| CO-1110 | `receives_oasdi_as_disabled_adult_child` | primitive | Medicaid | Receipt of OASDI as a Disabled Adult Child, from the stated title II benefit type; no program defines it differently. |
| CO-1207 | `receives_hcbs_services` | primitive | AdultFinancial | Current enrollment in an HCBS waiver as the enrollment record shows; no program defines it differently. |
| CO-1356 | `has_earned_income` | primitive | CCCAP, Medicaid | Wages or self-employment receipts stated, gross, before any program's definition of earned income; a program whose earned income differs reads its own item. |
| CO-1358 | `is_us_citizen_or_national` | primitive | AdultFinancial, All, CCCAP, CHP+, ColoradoWorks, LEAP, Medicaid, SNAP | A declared U.S. citizen or national status, as stated; no program defines it differently. |
| CO-1359 | `claims_lawful_immigration_status` | primitive | AdultFinancial, CHP+, ColoradoWorks, LEAP, Medicaid, SNAP | A declared non-citizen status other than undocumented, as stated; no program defines it differently. |
| CO-1360 | `ssn_is_verified` | primitive | AdultFinancial, ColoradoWorks, LEAP, Medicaid, SNAP | The SSN requirement met by an SSA match or a furnished number or application; a verification fact no program defines differently. |
| CO-1361 | `unearned_income_is_verified` | primitive | AdultFinancial, CCCAP, CHP+, ColoradoWorks, LEAP, Medicaid, SNAP | Unearned income verified by an electronic data source or documents; a verification fact no program defines differently (each program decides when it is required). |
| CO-1362 | `resources_are_verified` | primitive | AdultFinancial, Medicaid, SNAP | Resources verified by an electronic data source or documents; a verification fact no program defines differently (each program decides when it is required). |
| CO-1363 | `child_support_paid_is_verified` | primitive | CCCAP, SNAP | Child support paid verified by child support data or documents; a verification fact no program defines differently (each program decides when it is required). |
| CO-1364 | `disability_is_verified` | primitive | SNAP | Disability verified by SSA data or documents; a verification fact no program defines differently (each program decides when it is required). |
| CO-1365 | `age_is_verified` | primitive | AdultFinancial, CCCAP, Medicaid, SNAP | Age or date of birth verified by SSA data or a document; a verification fact no program defines differently (each program decides when it is required). |
| CO-1366 | `immigration_status_is_verified_or_submitted` | primitive | ColoradoWorks, SNAP | Immigration status verified by SAVE or with USCIS on submitted documents; a verification fact no program defines differently. |
| CO-1720 | `is_full_time_secondary_student_finishing_before_nineteen` | primitive | ColoradoWorks, Medicaid | Full-time secondary or equivalent enrollment expected to end before 19, from stated enrollment facts; Medicaid and Colorado Works state the same test and no program defines it differently. |
| CO-1725 | `is_exempt_from_five_year_bar` | primitive | All, Medicaid | The 8 U.S.C. 1613(b) exempt categories as the statute lists them; every reader applies the statute as written. |
| CO-1727 | `receives_ssdi` | primitive | AdultFinancial, Medicaid, SNAP | Receipt of Social Security disability benefits, from the stated title II benefit type; no program defines it differently. |
| CO-1742 | `resides_in_medical_institution` | primitive | AdultFinancial, All, Medicaid | A medical institution as 42 CFR 435.1010 defines it, from the stated residence setting; no program that reads it defines it differently. |
| CO-1925 | `lives_with` | primitive | AdultFinancial, All, CCCAP, ColoradoWorks, LEAP, Medicaid, SNAP | The persons with the same dwelling_id: co-residence, a relationship primitive (conventions rule 17); each program's temporary-absence rule is its own item. |
| CO-1928 | `is_veteran_rated_totally_disabled` | primitive | Medicaid | A 100 percent VA disability rating, from the stated rating type; no program defines it differently. |
| CO-2200 | `is_deceased` | primitive | All, Medicaid | Death on or before the month's last day, from the stated date of death; a date primitive. |
| CO-2208 | `receives_oap_c` | primitive | AdultFinancial, Medicaid | Receipt of OAP-C as the person's Adult Financial case records it; no program defines it differently. |
| CO-2336 | `sponsor_has_died` | primitive | AdultFinancial, SNAP | Every sponsor on the affidavit of support has died; a relationship and date primitive. |
| CO-2362 | `sponsor_spouse_is_cosponsor` | primitive | AdultFinancial | Two of the non-citizen's sponsors are spouses of each other; a relationship primitive. |
| CO-2388 | `sponsor_has_spouse_in_household` | primitive | AdultFinancial | A sponsor's non-cosigning spouse lives with the sponsor; a relationship primitive. |
| CO-2609 | `siblings` | primitive | All, ColoradoWorks, Medicaid | The persons who share a legal parent with this person; a relationship primitive (conventions rule 16). |
| CO-2610 | `step_siblings` | primitive | All, Medicaid | Step-siblings, from stepparent and parent relationships; a relationship primitive. |
| CO-2713 | `sponsors` | primitive | AdultFinancial, All, ColoradoWorks, Medicaid, SNAP | The persons who signed the affidavit of support, from the sponsor relationship; a relationship primitive. |
| CO-2714 | `sponsor_spouses_not_cosigning` | primitive | AdultFinancial, All, ColoradoWorks, Medicaid, SNAP | The sponsors' spouses who did not sign the affidavit; a relationship primitive each program reads for its own deeming. |
| CO-2840 | `full_siblings` | primitive | All | The persons who share both legal parents with this person; a relationship primitive. |
| CO-2841 | `half_siblings` | primitive | ColoradoWorks | Siblings who are not full siblings; a relationship primitive. |
| CO-2845 | `is_related_to` | primitive | CCCAP, ColoradoWorks, Medicaid | The persons related by blood, adoption or marriage, from the stated relationships; a relationship primitive (each program applies its own degree of relationship). |
| CO-3151 | `declared_household_income_pct_fpl` | primitive | CHP+, Medicaid | Attested household income over the published monthly poverty guideline for the attested size; arithmetic on attested figures, with no program's counting rules. |
| CO-3322 | `birth_mother_coverage_at_birth` | primitive | All, CHP+ | The birth mother's enrollment in the month of birth, read across the born_to relationship; an enrollment fact no program defines differently. |
| CO-4077 | `infrequent_or_irregular_income_in_quarter` | primitive | CCCAP, SNAP | The calendar-quarter sum of one supplied receipt; arithmetic over dates, each program applying its own exclusion limit to it. Since receipts migration phase 2 no rule reads it (SNAP and CCCAP sum their own receipts over the quarter, CO-5013 and CO-5724); left for the final cleanup with the scalar facts. |
| CO-4731 | `lives_with_spouse` | primitive | All | This person lives with a person who is their spouse; a relationship primitive. |

## Declared cross-program reads

Every `accepts_from` entry in the volume, by reader. The citation is the excerpt of the rule that requires or adopts the link.

| Reader | Reads | Class | Citation |
|---|---|---|---|
| CO-1108 `lost_ssi_or_oap_due_to_social_security_benefits` (All) | `lost_ssi_due_to_social_security_benefits` (CO-1180, Medicaid supplied) | primitive | S623 |
| CO-087 `mother_was_enrolled_in_medicaid_at_birth` (All) | `ma_is_in_pregnancy_coverage_period` (CO-566, Medicaid derived) | rule_required | S212 |
| CO-1151 `ma_emergency_medicaid_status` (Medicaid) | `chp_eligibility_status` (CO-707, CHP+ derived) | rule_required | S606 |
| CO-1159 `ma_pickle_eligible` (Medicaid) | `af_is_oap_age` (CO-940, AdultFinancial derived) | adopted_method | S623 |
| CO-1965 `ma_is_specified_excluded_individual` (Medicaid) | `participates_in_drug_alcohol_treatment` (CO-045, SNAP supplied) | primitive | S1209 |
| CO-2456 `ma_funding_source` (Medicaid) | `chp_eligibility_status` (CO-707, CHP+ derived) | rule_required | S1731 |
| CO-2711 `ma_is_exempt_from_snap_work_requirements` (Medicaid) | `snap_is_exempt_from_abawd_time_limit` (CO-414, SNAP derived) | rule_required | S1209 |
| CO-2711 `ma_is_exempt_from_snap_work_requirements` (Medicaid) | `snap_is_exempt_from_work_registration` (CO-405, SNAP derived) | rule_required | S1209 |
| CO-2802 `ma_community_spouse_shelter_costs` (Medicaid) | `snap_utility_allowance_amount` (CO-1500, SNAP derived) | adopted_method | S1756 |
| CO-3157 `ma_verification_is_applicable` (Medicaid) | `chp_is_requesting_coverage` (CO-2216, CHP+ supplied) | primitive | S869 |
| CO-3387 `ssi_student_earned_income_exclusion_basis` (All) | `ma_self_employment_net_earnings` (CO-1704, Medicaid derived) | adopted_method | S2210 |
| CO-3618 `ma_home_maintenance_allowance` (Medicaid) | `snap_utility_allowance_amount` (CO-1500, SNAP derived) | adopted_method | S2404 |
| CO-1416 `chp_required_verification_count` (CHP+) | `ma_magi_household_members` (CO-500, Medicaid derived) | adopted_method | S248 |
| CO-1416 `chp_required_verification_count` (CHP+) | `ma_requires_verification_of_age` (CO-1408, Medicaid derived) | adopted_method | S869 |
| CO-1416 `chp_required_verification_count` (CHP+) | `ma_requires_verification_of_citizenship` (CO-1395, Medicaid derived) | adopted_method | S869 |
| CO-1416 `chp_required_verification_count` (CHP+) | `ma_requires_verification_of_household_composition` (CO-1409, Medicaid derived) | adopted_method | S869 |
| CO-1416 `chp_required_verification_count` (CHP+) | `ma_requires_verification_of_identity` (CO-1398, Medicaid derived) | adopted_method | S869 |
| CO-1416 `chp_required_verification_count` (CHP+) | `ma_requires_verification_of_pregnancy` (CO-1406, Medicaid derived) | adopted_method | S869 |
| CO-1416 `chp_required_verification_count` (CHP+) | `ma_requires_verification_of_residency` (CO-1407, Medicaid derived) | adopted_method | S869 |
| CO-1416 `chp_required_verification_count` (CHP+) | `ma_requires_verification_of_ssn` (CO-1401, Medicaid derived) | adopted_method | S869 |
| CO-1417 `chp_pending_verification_count` (CHP+) | `ma_age_verification_is_pending` (CO-1629, Medicaid derived) | adopted_method | S869 |
| CO-1417 `chp_pending_verification_count` (CHP+) | `ma_household_composition_verification_is_pending` (CO-1630, Medicaid derived) | adopted_method | S869 |
| CO-1417 `chp_pending_verification_count` (CHP+) | `ma_is_under_child_age_or_turns_nineteen_this_month` (CO-564, Medicaid derived) | adopted_method | S606 |
| CO-1417 `chp_pending_verification_count` (CHP+) | `ma_magi_household_members` (CO-500, Medicaid derived) | adopted_method | S248 |
| CO-1417 `chp_pending_verification_count` (CHP+) | `ma_pending_status_verification_count` (CO-1410, Medicaid derived) | adopted_method | S869 |
| CO-1417 `chp_pending_verification_count` (CHP+) | `ma_pregnancy_verification_is_pending` (CO-1627, Medicaid derived) | adopted_method | S869 |
| CO-1417 `chp_pending_verification_count` (CHP+) | `ma_residency_verification_is_pending` (CO-1628, Medicaid derived) | adopted_method | S869 |
| CO-1417 `chp_pending_verification_count` (CHP+) | `ma_ssn_verification_is_pending` (CO-1623, Medicaid derived) | adopted_method | S869 |
| CO-1418 `chp_verification_status` (CHP+) | `ma_is_under_child_age_or_turns_nineteen_this_month` (CO-564, Medicaid derived) | adopted_method | S606 |
| CO-1418 `chp_verification_status` (CHP+) | `ma_pending_status_verification_count` (CO-1410, Medicaid derived) | adopted_method | S869 |
| CO-1418 `chp_verification_status` (CHP+) | `ma_reasonable_opportunity_period_end_date` (CO-1413, Medicaid derived) | adopted_method | S870 |
| CO-1641 `chp_income_is_reasonably_compatible` (CHP+) | `ma_electronic_data_source_household_income_pct_fpl` (CO-1344, Medicaid derived) | adopted_method | S869 |
| CO-1641 `chp_income_is_reasonably_compatible` (CHP+) | `ma_magi_household_income_pct_fpl` (CO-504, Medicaid derived) | adopted_method | S248 |
| CO-1642 `chp_requires_verification_of_earned_income` (CHP+) | `documentation_not_reasonably_available` (CO-1561, Medicaid supplied) | primitive | S869 |
| CO-1642 `chp_requires_verification_of_earned_income` (CHP+) | `ma_electronic_data_source_household_income_pct_fpl` (CO-1344, Medicaid derived) | adopted_method | S869 |
| CO-1642 `chp_requires_verification_of_earned_income` (CHP+) | `ma_is_requesting_coverage` (CO-2215, Medicaid supplied) | primitive | S869 |
| CO-1642 `chp_requires_verification_of_earned_income` (CHP+) | `ma_magi_household_members` (CO-500, Medicaid derived) | adopted_method | S248 |
| CO-2219 `chp_verification_due_date` (CHP+) | `ma_income_reasonable_opportunity_days` (CO-1349, Medicaid parameter) | adopted_method | S869 |
| CO-2228 `chp_copayment_income_band` (CHP+) | `ma_magi_household_income_pct_fpl` (CO-504, Medicaid derived) | adopted_method | S1504 |
| CO-2229 `chp_cost_sharing_annual_limit` (CHP+) | `ma_magi_household_income` (CO-503, Medicaid derived) | adopted_method | S248 |
| CO-2404 `chp_child_is_in_continuous_eligibility_period` (CHP+) | `ma_application_date` (CO-088, Medicaid supplied) | primitive | S1714 |
| CO-2404 `chp_child_is_in_continuous_eligibility_period` (CHP+) | `ma_continuous_eligibility_exception_applies` (CO-2205, Medicaid derived) | adopted_method | S1714 |
| CO-2404 `chp_child_is_in_continuous_eligibility_period` (CHP+) | `ma_is_under_child_age_or_turns_nineteen_this_month` (CO-564, Medicaid derived) | adopted_method | S606 |
| CO-2407 `chp_is_in_prenatal_coverage_period` (CHP+) | `ma_application_date` (CO-088, Medicaid supplied) | primitive | S1715 |
| CO-2707 `chp_meets_status_requirement` (CHP+) | `ma_is_cover_all_coloradans_person` (CO-1173, Medicaid derived) | adopted_method | S606 |
| CO-3634 `chp_requires_verification_of_unearned_income` (CHP+) | `documentation_not_reasonably_available` (CO-1561, Medicaid supplied) | primitive | S869 |
| CO-3634 `chp_requires_verification_of_unearned_income` (CHP+) | `ma_has_unearned_income_for_verification` (CO-2870, Medicaid derived) | adopted_method | S869 |
| CO-4565 `chp_month_is_before_coverage_period` (CHP+) | `ma_application_date` (CO-088, Medicaid supplied) | primitive | S1714 |
| CO-4792 `chp_express_lane_child_meets_requirements` (CHP+) | `ma_express_lane_child_meets_requirements` (CO-3156, Medicaid derived) | rule_required | S3550 |
| CO-4792 `chp_express_lane_child_meets_requirements` (CHP+) | `ma_is_under_child_age_or_turns_nineteen_this_month` (CO-564, Medicaid derived) | adopted_method | S606 |
| CO-4793 `chp_express_lane_status` (CHP+) | `ma_citizenship_verification_is_pending` (CO-1620, Medicaid derived) | adopted_method | S869 |
| CO-4793 `chp_express_lane_status` (CHP+) | `ma_express_lane_child_meets_requirements` (CO-3156, Medicaid derived) | rule_required | S3550 |
| CO-4793 `chp_express_lane_status` (CHP+) | `ma_express_lane_family_opted_in` (CO-2441, Medicaid supplied) | primitive | S3550 |
| CO-4793 `chp_express_lane_status` (CHP+) | `ma_express_lane_source` (CO-2440, Medicaid supplied) | primitive | S3550 |
| CO-4793 `chp_express_lane_status` (CHP+) | `ma_express_lane_verification_period_end_date` (CO-2445, Medicaid derived) | adopted_method | S3550 |
| CO-4793 `chp_express_lane_status` (CHP+) | `ma_identity_verification_is_pending` (CO-1621, Medicaid derived) | adopted_method | S869 |
| CO-704 `chp_income_within_limit` (CHP+) | `ma_is_under_child_age_or_turns_nineteen_this_month` (CO-564, Medicaid derived) | adopted_method | S606 |
| CO-704 `chp_income_within_limit` (CHP+) | `ma_magi_household_income_pct_fpl` (CO-504, Medicaid derived) | adopted_method | S248 |
| CO-705 `chp_child_is_eligible` (CHP+) | `ma_has_full_coverage_category` (CO-1176, Medicaid derived) | rule_required | S653 |
| CO-705 `chp_child_is_eligible` (CHP+) | `ma_is_under_child_age_or_turns_nineteen_this_month` (CO-564, Medicaid derived) | adopted_method | S606 |
| CO-706 `chp_prenatal_is_eligible` (CHP+) | `ma_has_full_coverage_category` (CO-1176, Medicaid derived) | rule_required | S653 |
| CO-707 `chp_eligibility_status` (CHP+) | `ma_has_full_coverage_category` (CO-1176, Medicaid derived) | rule_required | S653 |
| CO-707 `chp_eligibility_status` (CHP+) | `ma_is_under_child_age_or_turns_nineteen_this_month` (CO-564, Medicaid derived) | adopted_method | S606 |
| CO-708 `chp_presumptive_eligibility` (CHP+) | `ma_is_under_child_age_or_turns_nineteen_this_month` (CO-564, Medicaid derived) | adopted_method | S606 |
| CO-1206 `af_hca_functionally_eligible_for_hcbs` (AdultFinancial) | `meets_hcbs_waiver_target_group` (CO-821, Medicaid supplied) | rule_required | S712 |
| CO-1508 `cw_death_reimbursement_amount` (ColoradoWorks) | `af_burial_responsible_person_excess_resources` (CO-1229, AdultFinancial derived) | adopted_method | S1007 |
| CO-1508 `cw_death_reimbursement_amount` (ColoradoWorks) | `burial_insurance_proceeds` (CO-1223, AdultFinancial supplied) | primitive | S1005 |
| CO-1508 `cw_death_reimbursement_amount` (ColoradoWorks) | `burial_plot_cost_excluded_from_limit` (CO-1222, AdultFinancial supplied) | primitive | S1005 |
| CO-1508 `cw_death_reimbursement_amount` (ColoradoWorks) | `burial_services_total_cost` (CO-1221, AdultFinancial supplied) | primitive | S1005 |
| CO-1508 `cw_death_reimbursement_amount` (ColoradoWorks) | `decedent_estate_value` (CO-1224, AdultFinancial supplied) | primitive | S1005 |
| CO-1511 `af_barred_by_colorado_works` (AdultFinancial) | `cw_eligibility_status` (CO-921, ColoradoWorks derived) | rule_required | S1011 |
| CO-1511 `af_barred_by_colorado_works` (AdultFinancial) | `cw_unit_otherwise_eligible` (CO-4835, ColoradoWorks derived) | rule_required | S1011 |
| CO-4361 `cw_boarder_income` (ColoradoWorks) | `snap_maximum_allotment_table` (CO-130, SNAP parameter) | adopted_method | S3159 |
| CO-989 `cccap_eligibility_status` (CCCAP) | `cw_is_serving_ipv_disqualification` (CO-1730, ColoradoWorks supplied) | rule_required | S2851 |
