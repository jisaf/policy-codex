# Known limits for the product owner's sign-off (Colorado volume)

The findings of the final reviews (coverage pass 7: docs/reviews/coverage7-snap.md, coverage7-care-energy.md, coverage7-cash.md; and docs/reviews/coverage7-medicaid-nonmagi.md, whose fix round also ran the extended pattern sweep of its F7-12 on every family) that the fix round of 2026-11-24 recorded instead of fixing, because the fix is a larger design change than a fix round should make, and the limits the reviews asked to carry to the program owners. Each entry names the finding, the households it affects and how often, the governing paragraph, a household that shows it (stored households and rule tests run with `npm run check`; probes are given in full so they can be rebuilt), and the proposed fix. The product owner reviews this list with each program's owner.

Common / rare: **common** is a shape an intake worker sees routinely; **rare** needs a combination of facts that is uncommon.

## SNAP

### KL-SNAP-1 (coverage pass 7, C7-6; OQ-1450): a status stated for the determination date is read in an earlier application month

- **Description.** The case states some statuses once, for the determination date (the nighttime residence other than a stay in another's home, a residence setting left between the application and the determination, the receipt of SSI, TANF or State cash assistance where a reader reads the award, immigration and disability statuses), and SNAP reads them in an application month before the determination month. Two persons joined by a household edge who live apart on the determination date with no separation date stated are read apart in the determination month (a separation inside the determination month is read on OQ-1405's day only when its date is stated).
- **Households affected.** An application in one month determined in the next (ordinary) whose status changed in between (uncommon): a member discharged from a hospital, a newly approved SSI award, a family that left a shelter.
- **Common / rare.** Rare.
- **Rule paragraph.** 7 CFR 273.10(a)(1)(i) (S5091): the application month on "the household's circumstances for the entire month of application"; 10 CCR 2506-1 4.402.1.A (S4734).
- **Household that shows it.** Rule test CO-7672-T5: spouses apart on 2026-11-05 with no separation date are apart in November, the determination month (a husband who moved out on November 2 states the date and is a member of November, CO-7672-T2, stored household CO-1070). A status example: CO-1073 with the family in a shelter instead of a friend's home on the determination date and in its own home in October would read October as homeless; only a stay in another person's home states the residence before it (CO-7674).
- **Proposed fix.** Date each status SNAP reads for an application month (the residence's start for every temporary accommodation, the award dates of SSI, TANF and State cash, the discharge date from an institution), required where read for a month before the determination month, as coverage pass 7 dated who lives in the home (CO-7670 to CO-7672), the energy assistance payments (CO-7673) and a stay in another's home (CO-7674). Until then OQ-1450 records the reading for the SNAP owner.

The extended pattern sweep of coverage pass 7 (non-MAGI F7-12; `npx vite-node scripts/audit/pattern-sweep.ts -- --anchors`) finds no new candidate: no person-, case- or global-scope item in scope reads a time-varying parameter outside `at` or `as_of`, and the sweep's own P1 test already listed every det_month and det_date read.

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

The extended pattern sweep of coverage pass 7 (non-MAGI F7-12; `npx vite-node scripts/audit/pattern-sweep.ts -- --anchors`) finds no new candidate: no person-, case- or global-scope item in scope reads a time-varying parameter outside `at` or `as_of`, and the sweep's own P1 test already listed every det_month and det_date read.

## Adult Financial and Colorado Works

### KL-CASH-1 (coverage pass 7, F7-4): the in-kind support and maintenance fair share divides by the persons of the case only

- **Description.** af_in_kind_support_and_maintenance (CO-1512) divides the home's shelter costs by the number of persons of the case who live in the home (lives_with); an Adult Financial case has one client (3.532.A), and a housemate who is not a person of the case is not counted, so the fair share is overstated. The fix round recorded the case contract (CO-1512's precision; docs/conventions.md rule 17: a case evaluated for the ISM lists every person of the home) instead of a new fact.
- **Households affected.** An Adult Financial client who shares a home with persons who do not apply and pays less than the full shelter costs. **Common / rare.** Common shape (shared housing); the answer changes when the client's payment is below the true fair share but above the case's.
- **Rule paragraph.** 9 CCR 2503-5 3.520.79.B.4, C.2: "Fair share is calculated by totaling shelter costs and dividing by the number of people living in the household".
- **Household that shows it.** A client sharing a $1,000 market-rent home with three people not stated as persons of the case, paying $250: CO-1512 gives a fair share of $1,000 and ISM min(1,000, 351) - 250 = $101; by the text the fair share is $250, paid in full, no ISM (the reviewer's example, docs/reviews/coverage7-cash.md, F7-4).
- **Proposed fix.** A neutral case fact, the number of persons living in the home (convention rule 18), required where CO-1512 reads it, and the fair share divided by it.

The other cash findings were fixed; their recorded readings are open questions the cash owner signs: OQ-1451 (the reach of C.R.S. 26-2-706(1.5)(c) and a mandatory member who receives Adult Financial) and OQ-1452 (a voluntary foster care placement measured by its elapsed length).

Candidate of the extended pattern sweep (`npx vite-node scripts/audit/pattern-sweep-cash.ts -- --anchors`), new because the cash sweep's own P1 test did not look for it. Listed for the cash owner; not judged against the text here.

### CASH-SW-1. The minor parent deeming needs deduction reads the need standard of the determination date

- **Description.** cw_minor_parent_deeming_needs_deduction (CO-2000, person scope) reads cw_need_standard_table (CO-274), cw_need_standard_table_two_caretakers (CO-353) and cw_need_standard_each_additional (CO-275), each versioned from July 1, on the determination date; cw_deemed_parent_income_of_minor_parent (CO-909) reads it in each month.
- **Household shape.** A minor parent's Colorado Works case whose application month and determination month fall on either side of July 1.
- **Common / rare.** Rare: an application in June determined in July with a non-recipient parent's income deemed.
- **Rule paragraph.** 9 CCR 2503-6 3.605.1.A.4 (deeming the minor parent's parents' income); the need standard's July 1 versions.
- **Test household.** For the cash owner to build from CO-909-T10's household, applied 2026-06-20 and determined 2026-07-08.
- **Proposed fix.** Make CO-2000 per month, or read it with `[at, ..., [month]]` in CO-909, if the cash owner finds the month's standard is the one 3.605.1.A.4 deducts.

## Medicaid: non-MAGI (aged, blind and disabled, long-term care, Medicare Savings Programs, Buy-Ins)

From the coverage pass 7 fix round (docs/reviews/coverage7-medicaid-nonmagi.md, section 7).

### NM-KL-1. The community spouse's monthly income allowance is not income to the community spouse (F7-9, P2)

- **Description.** No item adds the monthly income allowance (MIA) the institutionalized spouse pays the community spouse to the community spouse's own SSI-method income, and no receipt kind names it; a case can state it only as `other_nontaxable` (counted) or not at all.
- **Household shape.** A community spouse who applies for Medical Assistance herself (most often a Medicare Savings Program) while her spouse in a nursing facility or on a waiver pays her an MIA, and the case does not state the MIA as a receipt.
- **Common / rare.** Rare: a community spouse's own application with an MIA paid; no stored household has one.
- **Rule paragraph.** 10 CCR 2505-10 § 8.100.5.I.4: "Income from the Community Spouse's Monthly Income Allowance, as defined in the spousal protection rules in this volume at 8.100.7.R, is income to the community spouse."
- **Test household.** CO-112's couple with Linda (p2) applying for the Medicare Savings Programs in November 2026: her Social Security 900 and an MIA of 900 paid from Robert's income. Codex (MIA not stated): countable 900 - 20 = 880, at or under 100% of the guideline (15,960 / 12 = 1,330): QMB. Text: 900 + 900 - 20 = 1,780, above 120% (1,596) and below 135% (1,795.50): QI.
- **Proposed fix.** A receipt kind for an allowance paid by an institutionalized spouse (counted for the SSI method), which needs a row in every program's counting table (SNAP, LEAP, Colorado Works, Adult Financial, CCCAP, SUN Bucks, MAGI) signed by each owner; or derive I.4 in the community spouse's SSI-method unearned income from the spouse's ma_community_spouse_income_allowance (CO-656) for a month the allowance is made available, which needs a fact saying it was (R.1: "made available to the community spouse"). Either is a shared-table or shared-fact change beyond a fix round.

### NM-KL-2. The disabled widow(er) test disregards all current Social Security, not only the widow(er)'s benefit (F7-10, P2)

- **Description.** ma_disabled_widow_eligible (CO-1162) reads ma_dac_countable_income (CO-1160), which disregards every Social Security receipt (CO-6250); a widow(er) entitled to her own disability benefit as well as the widow(er)'s benefit has her own benefit disregarded too.
- **Household shape.** A disabled widow(er) aged 50 to 64 who lost SSI when the widow(er)'s benefit began (lost_ssi_due_to_social_security_benefits) and whose own Title II benefit has since risen above the Federal Benefit Rate plus 20.
- **Common / rare.** Rare: the gate (SSI lost because of the benefit) keeps it out of every stored household; it errs toward eligibility.
- **Rule paragraph.** § 8.100.6.I; 42 U.S.C. 1383c(d)(2) (S3416): eligible "in the absence of benefits described in paragraph (1)(A)", the widow(er)'s benefit.
- **Test household.** A widow of 58, disabled, her own disability benefit 1,100 and a widow's benefit of 300, resources 1,000, who lost SSI in 2016 when the widow's benefit began. Codex: both benefits disregarded, countable 0: disabled widow(er) eligible. Text: only the 300 disregarded, 1,100 - 20 = 1,080 > 994: not eligible in this group.
- **Proposed fix.** A Title II benefit type on each Social Security receipt (a receipt field, as title_ii_benefit_type CO-2821 states it for the person), required where CO-1160 reads it for the widow(er) group, and CO-6250's sum for the group limited to the widow(er)'s benefit. A new shared receipt field that the receipts and records harnesses translate for every generated household.

### NM-KL-3. Title IV student aid and WIOA training funds are counted in the long-term care 300% test (found while fixing F7-6)

- **Description.** 20 U.S.C. 1087uu (S5243, fetched) bars student financial assistance under Title IV of the Higher Education Act, Bureau of Indian Education student assistance and employment and training programs under 29 U.S.C. 3174 from being "taken into account" in any federally financed program; the receipt kinds educational_assistance and workforce_program_payment hold those payments with other grants, scholarships and workforce payments the statute does not reach, so ma_ltc_federally_excluded_unearned_receipts (CO-7720) cannot take them out of the long-term care gross income (CO-641), and OQ-822's assumption counts them.
- **Household shape.** A nursing facility or HCBS applicant receiving a Pell grant, a federal student loan or WIOA adult or dislocated worker training funds whose other income is within that amount of 2,982.
- **Common / rare.** Rare.
- **Rule paragraph.** § 8.100.7.A.1 (gross income); § 8.100.5.F.6.aa; 20 U.S.C. 1087uu.
- **Test household.** CO-900's resident, Social Security 2,900 and a 200 Pell grant in November 2026. Codex: gross 3,100 > 2,982: ineligible_income. Text: 2,900: eligible_institutional, patient payment 2,789.64.
- **Proposed fix.** A receipt field `federal_student_aid` (yes/no: Title IV, Bureau of Indian Education or 29 U.S.C. 3174 funds), required where read, read by CO-7720 for the two kinds. Not made in this round: decision 4 makes the field required where read, so every generated household of the receipts and records harnesses with either kind would become cannot determine in the long-term care outcomes, and the translator would need to state it.

### NM-KL-4. The closed disabled widow(er) cohorts of §§ 8.100.6.F-H are not modeled (F7-11, OQ-209: scope decision for the product owner)

- **Description.** The 1972-disregard, 1973 and 1983-actuarial-change groups are closed cohorts the codex does not determine; OQ-209 records the decision as a scope decision of the product owner, a class the stopping rule (docs/plan-colorado.md: a state policy choice, or blocked on a named document) does not name. This entry is the product owner's sign-off point.
- **Household shape.** A person who received assistance in August 1972 (F), was eligible in December 1973 (G), or reapplied before July 1, 1987 (H), and still relies on that protection.
- **Common / rare.** Rare: the cohorts are in their seventies or older and nearly all fall within the aged group the codex determines (§ 8.100.6.C, K).
- **Rule paragraph.** §§ 8.100.6.F.1, G.1-3 ("Medical Assistance must be provided"), H.
- **Test household.** None can be built: modelling F needs each person's August 1972 assistance and the amount of the October 1972 Social Security increase, and G the December 1973 minimum income level, which no document on file states. A person found in a cohort is determined outside the codex.
- **Proposed fix.** None in the codex: the product owner signs this entry, or amends the stopping rule to name a scope decision as a third accepted class.

## Medicaid: MAGI and CHP+

Candidates of the extended pattern sweep (coverage pass 7, non-MAGI F7-12: `npx vite-node scripts/audit/pattern-sweep-magi.ts -- --anchors`), new because the MAGI sweep's own P1 test did not look for them. Listed for the MAGI owner's next review; not judged against the text here.

### MAGI-SW-1. Time-varying parameters read by person- or global-scope items that month-scoped items read

- **Description.** Each item below is one value per case, so the parameter is read on the determination date in every month that reads it (docs/operators.md, Resolution step 2). CO-543 ma_magi_income_standard_pregnant (global) reads ma_income_limit_pregnant_pct (CO-194); CO-540 ma_magi_income_standard_child (global) reads ma_income_limit_child_pct (CO-191); both are read by month-scoped category tests (CO-539, CO-545, CO-546, CO-558, CO-559, CO-3156). CO-3151 declared_household_income_pct_fpl (shared, person) reads the guideline tables CO-181 and CO-182 and is read by CO-558, CO-559, CO-3156, CO-4792.
- **Household shape.** A retroactive or application month in a different version period of the parameter than the determination date (a percentage that changes on a date; a guideline year: a January to March determination with a December retroactive month).
- **Common / rare.** Rare where the percentages have one value across the months; a guideline year boundary is reached by every January to March determination with retroactive months.
- **Rule paragraph.** 10 CCR 2505-10 § 8.100.4.G.1 (the month); § 8.100.3.E.1.
- **Test household.** For the MAGI owner to build: CO-1060's household determined in February 2027 with a December 2026 retroactive month, once the 2027 guideline is loaded.
- **Proposed fix.** Make each item per month (or read it with `[at, x, [month]]` from its month-scoped readers), as F7-2 did for the non-MAGI personal needs allowance (CO-1987).
- Not month-read (presumptive eligibility and declared income are determinations of a day): CO-708, CO-2439, CO-3152, CO-3153, CO-3155. Listed by the test, not candidates.
