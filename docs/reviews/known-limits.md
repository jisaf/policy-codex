# Known limits for the product owner's sign-off (Colorado volume)

The findings of the final reviews (coverage pass 7: docs/reviews/coverage7-snap.md, coverage7-care-energy.md, coverage7-cash.md, coverage7-medicaid-magi-chp.md) that the fix round of 2026-11-24 recorded instead of fixing, because the fix is a larger design change than a fix round should make, and the limits the reviews asked to carry to the program owners. Each entry names the finding, the households it affects and how often, the governing paragraph, a household that shows it (stored households and rule tests run with `npm run check`; probes are given in full so they can be rebuilt), and the proposed fix. The product owner reviews this list with each program's owner.

Common / rare: **common** is a shape an intake worker sees routinely; **rare** needs a combination of facts that is uncommon.

## SNAP

### KL-SNAP-1 (coverage pass 7, C7-6; OQ-1450): a status stated for the determination date is read in an earlier application month

- **Description.** The case states some statuses once, for the determination date (the nighttime residence other than a stay in another's home, a residence setting left between the application and the determination, the receipt of SSI, TANF or State cash assistance where a reader reads the award, immigration and disability statuses), and SNAP reads them in an application month before the determination month. Two persons joined by a household edge who live apart on the determination date with no separation date stated are read apart in the determination month (a separation inside the determination month is read on OQ-1405's day only when its date is stated).
- **Households affected.** An application in one month determined in the next (ordinary) whose status changed in between (uncommon): a member discharged from a hospital, a newly approved SSI award, a family that left a shelter.
- **Common / rare.** Rare.
- **Rule paragraph.** 7 CFR 273.10(a)(1)(i) (S5091): the application month on "the household's circumstances for the entire month of application"; 10 CCR 2506-1 4.402.1.A (S4734).
- **Household that shows it.** Rule test CO-7672-T5: spouses apart on 2026-11-05 with no separation date are apart in November, the determination month (a husband who moved out on November 2 states the date and is a member of November, CO-7672-T2, stored household CO-1070). A status example: CO-1073 with the family in a shelter instead of a friend's home on the determination date and in its own home in October would read October as homeless; only a stay in another person's home states the residence before it (CO-7674).
- **Proposed fix.** Date each status SNAP reads for an application month (the residence's start for every temporary accommodation, the award dates of SSI, TANF and State cash, the discharge date from an institution), required where read for a month before the determination month, as coverage pass 7 dated who lives in the home (CO-7670 to CO-7672), the energy assistance payments (CO-7673) and a stay in another's home (CO-7674). Until then OQ-1450 records the reading for the SNAP owner.

### KL-SNAP-2 (MAGI coverage pass 7, C7-04; a follow-up for the SNAP owner): the five-year waiting period counted from the qualified status held now

- **Description.** SNAP's five-year test (snap_meets_immigrant_additional_condition CO-307, which counts years from qualified_status_date in the month) and its readers of the same date (snap_is_exempt_from_waiting_period_other_than_military CO-3713, snap_requires_verification_of_qualifying_quarters CO-3736, snap_requires_verification_of_military_connection CO-3738) read qualified_status_date (CO-003), the date of the status held now. A person who held an earlier qualified status (a parolee of a year or more, a battered non-citizen, a conditional entrant) and later became a lawful permanent resident restarts the five years at the adjustment. The MAGI fix round added the neutral fact of the first qualified status (first_qualified_status_date, CO-7770) and Medicaid reads it (CO-7550); SNAP was not edited because another fix round was editing it.
- **Households affected.** A lawful permanent resident whose earlier, non-exempt qualified status began more than five years ago and whose LPR status began less than five years ago.
- **Common / rare.** Rare.
- **Rule paragraph.** 10 CCR 2506-1 4.305.B.3.a (S12): "The five (5) year waiting period begins on the date the non-citizen obtains status as a qualified non-citizen or enters the U.S. in a qualifying status"; 8 U.S.C. 1613(a) (S176); CO-003's precision now says so.
- **Household that shows it.** Stored household CO-1127 (LPR-EX-PAROLEE: paroled 2019-05-01, LPR 2023-03-01, first_qualified_status_date 2019-05-01): Medicaid eligible in November 2026 (the five years ended 2024-05-01); SNAP's CO-307 counts from 2023-03-01 (three years) for the same person.
- **Proposed fix.** CO-307 counts from first_qualified_status_date where the person's first qualified status is not the one held now (required where read, as Medicaid's CO-7550 reads it: not needed where us_entry_date is on or after qualified_status_date or a lawful permanent resident's earlier status is none), and CO-3713, CO-3736 and CO-3738 are reviewed for the same date.

## CCCAP and LEAP

### KL-CE-1 (coverage pass 7, R7-3; OQ-1365, OQ-1366): one rental property cannot be stated so that CCCAP and LEAP both read its costs right

- **Description.** CCCAP takes the costs of a rental managed under twenty hours a week from `rental_property_expenses_paid` (CO-4458, through cccap_excluded_unearned_receipts CO-4463 and cccap_rental_property_receipts_as_unearned CO-7251) and ignores the rental business's cost records; LEAP takes a rental business's costs from its cost records only (leap_self_employment_allowable_costs CO-1711, with a statement rule: maintenance as `business_cost_operating`, no interest or vehicle) and does not read the business's `rental_property`, so it deducts whatever cost records are stated. A household stated for one program is misread by the other, and a neutral statement (interest, taxes and insurance as cost records) gives LEAP a deduction 9 CCR 2503-7 3.755.21.I.2.D does not allow.
- **Households affected.** A landlord who manages a rental property under twenty hours a week and applies for CCCAP and LEAP together (one PEAK application), or a LEAP landlord whose rental business has mortgage interest, property taxes or insurance stated as cost records.
- **Common / rare.** Rare.
- **Rule paragraph.** 8 CCR 1403-1 3.111.H.4.e (S2704), I.12 and I.17 ("Net rental income"); 9 CCR 2503-7 3.755.21.I.2.D ("Rental property allowable expenses shall be limited to the costs of maintenance of the property", D-86).
- **Households that show it.** CO-1082 (stated the CCCAP way: the $300 of costs as rental_property_expenses_paid; CCCAP $3,100, eligible_low_income, which the rule gives) and CO-1083 (stated the LEAP way: $100 of maintenance as a business_cost_operating record; LEAP $3,700, eligible, which the rule gives). The other statements, as probes:
  - CR2 = CO-1082 with the $300 stated as a `business_cost_operating` record and rental_property_expenses_paid 0: CCCAP gives $1,600 + $1,800 = $3,400 > $3,336.16, ineligible_income; the rule gives $3,100, eligible_low_income.
  - LRB3 = CO-1083 with the $100 stated as rental_property_expenses_paid and no cost record: LEAP gives $2,300 + $1,500 = $3,800 > $3,774, ineligible; the rule gives $3,700, eligible.
  - LRB1 = CO-1083 with wages $2,500 and cost records of $600 (business_cost_interest) and $100 (business_cost_operating): LEAP gives $1,500 - $700 = $800, $3,300, eligible; I.2.D gives $1,500 - $100 = $1,400, $3,900 > $3,774, ineligible.
- **Proposed fix.** State a rental property's costs once, neutrally: as cost records of the rental business, each naming its business (`job` on the cost record and on the business's receipts record, as a dated pay names its job), with a neutral field saying whether the cost is maintenance or repair of the property. CCCAP reads a rental under the line net of its own business's cost records (and leaves them out of the self-employment costs, CO-1709), keeping rental_property_expenses_paid for a `rental_income` receipt; LEAP reads `rental_property` on the business and deducts only its maintenance records (I.2.D). Both programs' statement rules are then retired. The change touches the earnings schema (CO-5100), every program's cost readers and the records harness's split relation, which is why the fix round recorded it.

### KL-CE-2 (coverage pass 7 notes; OQ-535): a SUN Bucks application in July or August for the current summer

- **Description.** A July or August application is read as for the next summer, so an application for the current summer (7 CFR 292.13(g)) is read under the wrong summer's period, guideline and benefit level.
- **Households affected.** A SUN Bucks application made in July or August for the summer under way. **Common / rare.** Rare (applications cluster before summer), but every one of them is read wrongly.
- **Rule paragraph.** 7 CFR 292.2 ("Summer operational period"), 292.7, 292.13(g); blocked on Colorado's Summer EBT Plan for Operations and Management (OQ-535).
- **Household that shows it.** Any SUN Bucks household with an application date in July or August (the assumption of OQ-535 reads it for the next summer).
- **Proposed fix.** Load the summer operational period from Colorado's Plan when it can be fetched, and read an application in it as for the current summer.

### KL-CE-3 (coverage pass 7, R7-5; OQ-680): five paydays in CCCAP's thirty days

- **Description.** Every pay dated in the thirty days before the application or redetermination date is counted (H.4's general rule), so a weekly earner has five paydays on two of every seven dates and a biweekly earner three on one of every seven; H.4's exception (a different period when the thirty days are not accurate) is the county's figure, cccap_county_determined_monthly_income (CO-3914), never applied by default.
- **Households affected.** A weekly or biweekly earner near the entry level. **Common / rare.** Common shape; the answer changes only near the line.
- **Rule paragraph.** 8 CCR 1403-1 3.111.H.4, H.5.a.1 (S2704, S891).
- **Household that shows it.** Probe CW5 (CO-806's mother paid $500 a week, paydays 2026-10-16 to 2026-11-13, application 2026-11-15): $2,500; a $700-a-week earner is $3,500, ineligible_income, on one date and $2,800, eligible_low_income, a week later.
- **Proposed fix.** None in the rule engine: the owner signs OQ-680's assumption with this consequence, or the State sets a conversion rule (52/12 weeks) the volume can read.

### KL-CE-4: figures the State has not published where they can be fetched

| Figure | Open question | Effect until loaded |
|---|---|---|
| LEAP program-year adjustment rate, minimum and maximum benefit | OQ-532 | every LEAP benefit amount is cannot determine (eligibility is determined) |
| SUN Bucks benefit level for summer 2027 | OQ-1220 | the 2027 benefit is cannot determine |
| CCCAP county entry income levels | OQ-121 | a county's entry level is read only where a case states it |
| Counties providing Colorado Works Child Care to diversion households | OQ-682 | no county is assumed to provide it |

Each is a parameter with no version (docs/conventions.md, "Effective dating"); the proposed fix is to load the figure when published.

## Adult Financial and Colorado Works

### KL-CASH-1 (coverage pass 7, F7-4): the in-kind support and maintenance fair share divides by the persons of the case only

- **Description.** af_in_kind_support_and_maintenance (CO-1512) divides the home's shelter costs by the number of persons of the case who live in the home (lives_with); an Adult Financial case has one client (3.532.A), and a housemate who is not a person of the case is not counted, so the fair share is overstated. The fix round recorded the case contract (CO-1512's precision; docs/conventions.md rule 17: a case evaluated for the ISM lists every person of the home) instead of a new fact.
- **Households affected.** An Adult Financial client who shares a home with persons who do not apply and pays less than the full shelter costs. **Common / rare.** Common shape (shared housing); the answer changes when the client's payment is below the true fair share but above the case's.
- **Rule paragraph.** 9 CCR 2503-5 3.520.79.B.4, C.2: "Fair share is calculated by totaling shelter costs and dividing by the number of people living in the household".
- **Household that shows it.** A client sharing a $1,000 market-rent home with three people not stated as persons of the case, paying $250: CO-1512 gives a fair share of $1,000 and ISM min(1,000, 351) - 250 = $101; by the text the fair share is $250, paid in full, no ISM (the reviewer's example, docs/reviews/coverage7-cash.md, F7-4).
- **Proposed fix.** A neutral case fact, the number of persons living in the home (convention rule 18), required where CO-1512 reads it, and the fair share divided by it.

### KL-CASH-2 (MAGI coverage pass 7, C7-04; a follow-up for the cash programs' owner): the five-year bar counted from the qualified status held now

- **Description.** The shared has_held_qualified_status_five_years (CO-508) counts the five years of 8 U.S.C. 1613(a) from qualified_status_date, the status held now. Since the MAGI fix round only the cash programs read it, through meets_public_assistance_citizenship_requirement (CO-905): Colorado Works (cw_meets_citizenship_and_immigration_requirement CO-4005) and Adult Financial (af_category CO-953, af_meets_citizenship_requirement_oap CO-929 and the other readers of CO-905). A person who held an earlier qualified status restarts the five years at a later adjustment. Medicaid reads the new first_qualified_status_date (CO-7770); the cash items were not edited because another fix round was editing them.
- **Households affected.** As KL-SNAP-2: an LPR whose earlier, non-exempt qualified status began more than five years ago.
- **Common / rare.** Rare.
- **Rule paragraph.** 8 U.S.C. 1613(a) (S176): "for a period of 5 years beginning on the date of the alien's entry into the United States with a status within the meaning of the term 'qualified alien'".
- **Household that shows it.** Stored household CO-1127 (LPR-EX-PAROLEE) read by CO-905: the five years from 2023-03-01 are not held in November 2026; from the first qualified status (2019-05-01) they are.
- **Proposed fix.** CO-508 counts from first_qualified_status_date with the same shortcut Medicaid's CO-7550 uses (the status held now is the first where the person entered in it or is an LPR admitted directly), required where read; the cash stored households that state an LPR with an earlier status state the first date.

The other cash findings were fixed; their recorded readings are open questions the cash owner signs: OQ-1451 (the reach of C.R.S. 26-2-706(1.5)(c) and a mandatory member who receives Adult Financial) and OQ-1452 (a voluntary foster care placement measured by its elapsed length).

## MAGI Medicaid and CHP+

The final review's findings (docs/reviews/coverage7-medicaid-magi-chp.md) C7-01 to C7-06 and C7-08 to C7-11 were fixed in the fix round of 2026-11-24 (section 9 of the review); the entries below are what it recorded instead, and what the round found beside them.

### KL-MAGI-1 (coverage pass 7, C7-07; OQ-1475): "current or previous monthly household income" read as the current month

- **Description.** 10 CCR 2505-10 § 8.100.4.C.4 bases an applicant's financial eligibility on "current or previous monthly household income and family size". The volume reads the month evaluated only, the previous month being evidence of it where the current month's income is not yet verified (§ 8.100.4.B.1.c). Read as a choice between the two months, an applicant ineligible on the current month and eligible on the previous one would be eligible.
- **Households affected.** An applicant whose income rose in the application month across a standard.
- **Common / rare.** Rare (a raise or a new job in the application month that crosses a standard).
- **Rule paragraph.** § 8.100.4.C.4, C.4.a (S3356); § 8.100.4.B.1.c (S5270, D-65:1641-1645): "Verification of earned income received during the month prior to the month of application shall be acceptable if the application month verification is not yet available"; 42 CFR 435.603(h)(1) (S5271): "must be based on current monthly household income and family size".
- **Household that shows it.** OQ-1475's worked example: a single adult, $1,700 in October 2026 and $1,900 in November, the application month: November 1,900 / 1,330 = 142.9%, less 5 = 137.9% > 133%, ineligible_income as the volume reads C.4; 1,700 / 1,330 = 127.8%, less 5 = 122.8%, eligible on the previous month.
- **Proposed fix.** None in the volume: a state policy choice for the Medicaid policy owner (OQ-1475). If HCPF reads C.4 as a choice, a month's income test reads the lower of the month's and the previous month's household income for an applicant (ma_magi_monthly_household_income_pct_fpl, CO-6452).

### KL-MAGI-2 (found in the fix round, beside C7-02): a month of an earlier pregnancy before the stated start of the current one is read as not pregnant

- **Description.** ma_is_pregnant_in_month (CO-3601) reads a month before the month of pregnancy_start_date as not pregnant, so for a person pregnant now whose earlier pregnancy is recorded only by a child's date of birth (gave_birth_to), the months of the earlier pregnancy before its birth month read as not pregnant. The coverage period of the earlier pregnancy still opens where the eligibility history records Pregnant Women in those months (CO-7401: a recorded month opens unless it is in the postpartum year of an earlier end and she was not pregnant), and the birth month itself is a pregnant month; it does not open from a month recorded as other Medical Assistance, and those months' household size counts no expected child.
- **Households affected.** A renewal (whose application date is the original application's, CO-088) of a member pregnant again, whose earlier pregnancy fell within the application's months and was covered under another category, evaluated for a month of that earlier pregnancy, all of them before the determination month.
- **Common / rare.** Rare (only months long before the determination month, which a renewal does not decide).
- **Rule paragraph.** § 8.100.4.G.5 (S640); 42 U.S.C. 1396a(e)(5) (S5060).
- **Household that shows it.** CO-1123 (PG-SECOND) with the history of March to August 2025 recorded as other_medical_assistance instead of Pregnant Women: March to August 2025 read as not pregnant (the start stated is 2026-10-05), so no period opens before September 2025, the birth month; by hand she was pregnant in those months (a birth on 2025-09-10).
- **Proposed fix.** In CO-3601 (and CHP+'s CO-7051), a stated pregnancy_start_date governs only the months after the last recorded end before it; a month on or before that end is read from the ended pregnancy (its own start, where stated on or before the end, else unknown before the birth month).

### KL-MAGI-3 (found in the fix round): family planning has no reason for a month before the application can cover

- **Description.** ma_family_planning_status (CO-1154) does not read ma_month_is_before_coverage_period (CO-4101): a month before a requested retroactive window, or before the application month with no request, is answered by the person's category and income as if covered (full_coverage, limited_family_planning), where ma_magi_eligibility_status and chp_eligibility_status answer ineligible_before_coverage_period.
- **Households affected.** Every household evaluated for a month before the months its application can cover.
- **Common / rare.** Common in the stored households that evaluate such months; in a determination a month before the application is not decided, so a worker does not see it.
- **Rule paragraph.** 10 CCR 2505-10 § 8.100.3.E.1-2 (S1503, S2411); § 8.100.4.G.8.
- **Household that shows it.** CO-1130 (DIED-RETRO): May 2026, before the June to August window, is ineligible_before_coverage_period for MAGI and full_coverage for family planning.
- **Proposed fix.** A first row in CO-1154, [ma_month_is_before_coverage_period, ineligible_before_coverage_period], with the option added to the outcome and the aid-code map (no code), as C7-06 added ineligible_deceased; the stored expectations of family planning in such months restated. Not made in the fix round because the review did not list it and it moves stored expectations of other rounds.
