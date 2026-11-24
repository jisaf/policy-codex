# Known limits (for the product owner's sign-off)

Each entry is a finding of the final review round that the last fix round did not fix, because the fix needs a larger design change than a fix round should make, or because it is a scope decision only the product owner can take. Every entry gives its id, a one-line description, the household shape it reaches, whether that shape is common or rare, the rule paragraph, a test household (hand-computed: what the codex answers and what the text gives), and the proposed fix. One section per program; each fix round appends to its own section.

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

## Colorado Works and Adult Financial

Candidate of the extended pattern sweep (`npx vite-node scripts/audit/pattern-sweep-cash.ts -- --anchors`), new because the cash sweep's own P1 test did not look for it. Listed for the cash owner; not judged against the text here.

### CASH-SW-1. The minor parent deeming needs deduction reads the need standard of the determination date

- **Description.** cw_minor_parent_deeming_needs_deduction (CO-2000, person scope) reads cw_need_standard_table (CO-274), cw_need_standard_table_two_caretakers (CO-353) and cw_need_standard_each_additional (CO-275), each versioned from July 1, on the determination date; cw_deemed_parent_income_of_minor_parent (CO-909) reads it in each month.
- **Household shape.** A minor parent's Colorado Works case whose application month and determination month fall on either side of July 1.
- **Common / rare.** Rare: an application in June determined in July with a non-recipient parent's income deemed.
- **Rule paragraph.** 9 CCR 2503-6 3.605.1.A.4 (deeming the minor parent's parents' income); the need standard's July 1 versions.
- **Test household.** For the cash owner to build from CO-909-T10's household, applied 2026-06-20 and determined 2026-07-08.
- **Proposed fix.** Make CO-2000 per month, or read it with `[at, ..., [month]]` in CO-909, if the cash owner finds the month's standard is the one 3.605.1.A.4 deducts.

## SNAP, CCCAP, LEAP and SUN Bucks

The extended pattern sweep (`npx vite-node scripts/audit/pattern-sweep.ts -- --anchors`) finds no new candidate: no person-, case- or global-scope item in scope reads a time-varying parameter outside `at` or `as_of`, and the sweep's own P1 test already listed every det_month and det_date read.
