# Screening order: which questions rule a person out first

Read-only review of the Colorado volume (`volumes/co`) at branch `ccr-9d19bf4c-wmnwcl`, head 7e6a31e (2026-11-24). Reviewer role: policy analyst and decision-modelling engineer. Question: which facts, records, rules and figures rule a person out of each program first, so that a front end can ask them first and skip the fields that will not change the answer; and in what order a multi-program application should ask its questions. Nothing in the volume was changed. The machine-readable companion is `docs/reviews/screening-order.json`. It is built on `docs/reviews/service-design-fact-burden.md` (FB-nn) and `docs/reviews/cross-program-primitives.md` (XP-nn).

## Summary for the product owner

1. **A few cheap questions settle most of the denials that can be settled early.** They are a person's date of birth, whether anyone is pregnant, who lives in the home and how they are related, where each person lives (Colorado; a private home or a facility), and which benefits the household already receives. Each program then has one or two gates of its own: a child under 13 who needs care (CCCAP), enrolment in a school-meals school (SUN Bucks), the November-to-April season (LEAP), a child or a pregnancy in the unit (Colorado Works). With the engine as it is, 188 of the 647 stored denials (29%) settle on 3 or fewer stated facts, and 224 (35%) on 5 or fewer.
2. **Income denials have no shortcut.** Denials for income in MAGI Medicaid, CHP+, Colorado Works, SNAP and CCCAP need the household's whole income picture: even with the engine fix below, a median of 13 facts (CCCAP), 17 (MAGI, CHP+), 34 (Colorado Works) and 56 (SNAP gross income). This is where the burden is, and it is already addressed by FB-02 (the MAGI adjustments as one attestation) and FB-09 (unclaimed deductions default to 0). Ordering cannot remove it.
3. **To deny, every favourable path must be closed first.** The rules are first-hit lists. A protective-services referral, Colorado Works child care, categorical eligibility or continuous eligibility can each make a person eligible, so a denial has to rule them out. These are cheap questions, mostly agency records, and they belong early. Today the codex asks them as facts every person must state. Giving them the default their own text states (FB-04, FB-06) removes them from the interview.
4. **The engine blocks early exit in three ways.**
   - (G1) A first-hit `case` stops at the first unknown condition. A three-valued case that collects the arms still open would cut the facts in the stored minimal denial sets by 20% (10,312 to 8,234). For SNAP the median falls from 48 facts to 15. No stored answer changes.
   - (G2) Many facts lead to a denial whatever their answer, but by different routes. 661 such cases in stored denials need a what-if check over the few unanswered questions.
   - (G3) Sums and groups are strict. Adult Financial already applies a known-parts lower bound (CO-5350); the household income tests do not.
5. **One defect goes the other way and must be fixed before any screener uses the engine (G0).** `is_colorado_resident` (CO-505) reads a person who gives neither a state nor a county as *not a resident*. With nothing stated, all 71 stored Adult Financial category answers come out "none", 33 of them stored approvals. Under a three-valued case the same reading would also deny SNAP and Colorado Works. Reading it as "cannot determine" changes none of the 3,340 stored outcome answers.
6. **Measured saving.** In a simulated interview using the cross-program order below, the median stored denial settles after 13 distinct questions, against the 16 that the full evaluation reads and the 160 facts the median stored household states. 191 denials (30%) settle within 5 questions and 265 (41%) within 10. For SNAP the program order with a three-valued case settles the median denial at 21 questions instead of 35. At household level the saving is small in these fixtures: almost every stored household with a denial also has an approval in another program, and that approval needs the same facts. The large household-level savings come from the branch points (skipping a program whose gate fails), not from early denial within a program.
7. **What the front end may and may not do.** It may order and skip questions, and it may show "likely not eligible; you may still apply". It may not stop or delay a filing, and it may not record a denial. It may not let one program's or one category's "out" stand for another, and it may not carry a determination-month answer into a retroactive or application month. The paragraphs are quoted in Guardrails.

## Method

**Scripts.** The scripts are scratch work in the worktree's untracked `scratch-screening/` folder and are not part of the volume. They use the codex's own loader and `src/engine/evaluate.ts`, and a scratch copy of the evaluator for the three-valued variant (`scratch-screening/k/evaluate.ts`). Every quoted paragraph is from `volumes/co/documents/D-*.md` or from a `volumes/co/sources.md` excerpt, and each excerpt was checked line by line against its document (`scratch-screening/quotes.py`).

**Targets.** A target is one stored answer of one person, outcome and month, from the 552 stored households in `volumes/co/tests/cases.yaml`. Each target reads as a denial, an approval or neither, as follows:

| Outcome type | Denial | Approval | Neither |
|---|---|---|---|
| Status | `none`, `ineligible*`, `over_*`, `no_eligible_members`, `time_limit_reached` and the other ground values | the other values | MAGI `emergency_only`, `incarceration_limited` and `pending_community_engagement`; Colorado Works `not_in_unit_did_not_request` |
| Benefit amount | 0 | any other amount | |
| Yes/no | false | true | |

That gives 647 denials in 216 households and 915 approvals in 378 households, across 27 outcomes (`scratch-screening/common.ts`, `TARGETS`).

**Units.** The unit a screener can ask or withhold is one of:

- a supplied fact of one person, across every month it is stated;
- a case fact or a month fact;
- a person's record list (`earnings`, `receipts`, `holdings`);
- the household's relationships, as one unit.

Withholding a unit leaves it unstated, which is unknown under decision 4. The persons themselves, the determination date and the case's figure overrides are kept.

1. **Structural pass.** I read each eligibility outcome's derivation down to its necessary conditions (`scratch-screening/show.ts`): the arms of its first-hit `case`, and the conjuncts each arm needs. I also read the paragraphs those items cite. The per-program tables below give the result. The common shape is a first-hit list of grounds, with favourable categories (categorical eligibility, protective services, continuous eligibility) placed before the income test.

2. **Empirical pass, greedy deletion** (`scratch-screening/greedy.ts`). For every target:
   1. I took the units the full evaluation reads (from the trace) and checked that stating only those reproduces the stored answer.
   2. I removed units one at a time, the costliest first. A unit stays removed when the answer is still in the same class (still a denial, or still an approval).
   3. The result is a minimal set **S** that settles the class with the current engine. The answer is never "cannot determine", since that is not the class.
   4. I repeated the deletion with the three-valued variant (**Sk**) and with the exact stored reason (**Sx**).

   For each fact left in **S**, I then tried every other value of a yes/no or one-of fact. A fact is **settled but asked** when every value gives the same class, yet withholding the fact gives "cannot determine". For those facts, `scratch-screening/culprit2.ts` walks the trace from the fact up to the outcome and names the operator where the unknown was not absorbed.

3. **Ordering.** For each program, every candidate question is scored over the program's stored denials. A fact in a short proof weighs more:
   - weight = Σ over denials of [fact in Sk] / |Sk|;
   - score = weight / cost.

   This is in `scratch-screening/orders.py`. The cost model is in `scratch-screening/costs.py`: 0.5 for application data or an agency record, 1 for a yes/no or plain choice, 2 for a date or the relationship grid, 3 for an amount to look up or a status in statute vocabulary, 4 for dated income records and 5 for resource records. The model follows the burden findings of FB-01 to FB-17. The orders were then set by hand from the scores, the structure, the number of programs served (`read_by_programs` in `cross-program-primitives.json`) and the verification element.

4. **Simulation** (`scratch-screening/sim.ts`). For every target, the units the full evaluation reads are asked in a given order, a whole question at a time (every person's answer to it). The count is the number of distinct questions asked before the engine settles the stored class. It is run for the case file's own order (baseline), the program's order and the cross-program order, each with both engines. `scratch-screening/hh.py` computes the household-level union.

5. **The G0 correction.** All numbers below are measured with G0 corrected in scratch: `is_colorado_resident` is unknown when neither a state nor a county is stated. Without the correction, a withheld state and county "settles" denials that the facts do not support, and the minimal sets collapse onto residency. The uncorrected runs are kept as `scratch-screening/out/*-unpatched.jsonl`.

**Caveat.** The stored households are test fixtures chosen to exercise edge cases. Rare grounds are over-represented, and many households carry a denial in one program and an approval in another. The shares below describe the fixtures, not a caseload.

## Per-program disqualifiers

Columns:

- **Denials** is the number of stored denials with that reason (households in brackets).
- **Facts to settle** is the median size of the minimal set: current engine, then three-valued case.
- **Cost** is the cost of the decisive question.

### SNAP (`snap_eligibility_status`, `snap_allotment`)

| Condition | Facts that settle it | Paragraph | Denials (hh) | Facts to settle | Cost |
|---|---|---|---|---|---|
| Resident of an institution providing most meals (no eligible members) | `residence_setting_type`, `residence_setting_provides_majority_of_meals`, `dwelling_id`, relationships | 7 CFR 273.1(b)(7)(vi): "Individuals must be considered residents of an institution when the institution provides them with the majority of their meals (over 50 percent of three meals daily) as part of the institution's normal services." | 4 (4) | 12 / 12 | 1 |
| Refused to cooperate | `snap_household_refused_to_cooperate` (agency) | 7 U.S.C. 2015(c): "no household shall be eligible to participate in the supplemental nutrition assistance program if it refuses to cooperate in providing information to the State agency that is necessary for making a determination of its eligibility" | 2 (1) | 37 / **1** | 0.5 |
| FDPIR in the same period | `receives_fdpir` (agency) | 10 CCR 2506-1 4.303.B: "Households on Indian reservations participating in the Commodity Food Distribution Program for a particular period shall not be allowed to participate in SNAP during the same period." | 2 (1) | 37 / 6 | 0.5 |
| Striking member | `snap_is_striker`, `snap_household_was_eligible_day_before_strike` | 7 CFR 273.1(e): "Households with a striking member are not eligible to participate in the Program, unless the household was eligible for benefits the day before the strike and is otherwise eligible at the time of application." | 1 (1) | 24 / 8 | 1 |
| Over the resource limit (standard eligibility only) | `holdings`, plus the facts showing the household is neither BCE nor ECE | 10 CCR 2506-1 4.408.A: "The local office shall consider households eligible under either expanded or basic categorical eligibility exempt from the resource eligibility criteria of this section." | 7 (7) | 49 / 15 | 5 |
| Over the gross income limit | `earnings`, `receipts`, plus every member's elderly or disabled status | 7 CFR 273.10(e)(2)(i)(B): "households which do not contain an elderly or disabled member shall have their gross income ... compared to the gross monthly income standards" | 5 (5) | 59 / 56 | 4 |
| Zero allotment | income, expenses | 10 CCR 2506-1 4.207.3.B | 18 (15) | 48 / 15 | 4 |

The SNAP numbers show the cost of today's first-hit list most clearly. The refused-to-cooperate denial needs 1 fact with a three-valued case and 37 with the current engine. The current engine must first establish every member's eligibility (household size), lottery winnings, resource transfer and the striker test, all of which come before the ground that settles it.

A gross-income denial stays expensive either way. The gross test does not apply to a household with an elderly or disabled member (S103), so a denial must establish, for every member, that no one is 60 or older and that no one receives any of the six disability-benefit prongs (FB-01). That is why `title_ii_benefit_type`, `va_disability_rating_type` and four others are in 85% of SNAP denial sets today and 44% with a three-valued case.

### Medicaid, MAGI groups (`ma_magi_eligibility_status`, `ma_magi_category`)

| Condition | Facts | Paragraph | Denials (hh) | Facts to settle | Cost |
|---|---|---|---|---|---|
| Month before the coverage period | `ma_application_date` (and the retroactive request) | 10 CCR 2505-10 8.100.3.E.1: "An applicant for Medical Assistance shall be provided such assistance any time during the three months preceding the date of application, or as of the date the person became eligible for Medical Assistance, whichever is later." | 18 (7) | 1 / 1 | 0.5 |
| Deceased before the month | `date_of_death` | ma_magi_eligibility_status, arm 2 | 4 (1) | 2.5 / 1 | 2 |
| Not a Colorado resident in the month | `state_of_residence_start_date`, `ma_application_date` | 8.100.3.B.2: "A resident of Colorado is defined as a person that is living within the state of Colorado and considers Colorado to be their place of residence at the time of application." | 2 (1) | 3 / 2 | 1 |
| Patient of an IMD aged 21 to 64 | `residence_setting_type`, `residence_setting_is_primarily_for_mental_diseases`, `residence_setting_bed_count`, `date_of_birth` | ma_meets_imd_requirement (CO-1179) | 1 (1) | 5 / 4 | 1 |
| No category (adult outside the adult group) | `date_of_birth`, `is_pregnant`, relationships, `dwelling_id` | 8.100.4.G.4: the adult group excludes the Medicare-entitled and the pregnant (ma_is_adult_category, CO-548) | 6 (4) | 9 / 8 | 1 |
| Income over the category standard | `earnings`, `receipts`, the four MAGI adjustments, `expected_annual_income`, `is_claimed_by_filer_outside_case`, relationships, `date_of_birth`, `is_pregnant` | 8.100.4.G.2: "Children applying for Medical Assistance whose total household income does not exceed 142% of the federal poverty level shall be determined financially eligible"; G.4 (adults, 133%); G.5 (pregnant women, 195%) | 62 (43) | 20 / 17 | 4 |

`immigration_status` is **not** a MAGI disqualifier. A person without a qualifying status moves to emergency Medicaid or to the Cover All Coloradans groups (children, pregnancy), which this review counts as neither denial nor approval. It is in 71% of stored MAGI denial sets today only because the status arm comes before the income arm. With a three-valued case it falls to 49%, and with G0 fixed `state_of_residence` falls from 52% to 0%.

### CHP+ (`chp_eligibility_status`)

| Condition | Facts | Paragraph | Denials (hh) | Facts to settle | Cost |
|---|---|---|---|---|---|
| Not under 19 and not pregnant | `date_of_birth`, `is_pregnant` | 10 CCR 2505-3 110.1.A: "To be eligible for the Children's Basic Health Plan, an eligible person shall: A. 1. Be less than 19 years of age; or 2. Be a pregnant woman" | 20 (8) | **2 / 2** | 1 |
| Eligible for Medicaid instead | MAGI income facts | 120.1.B: an eligible person shall not "Be eligible to receive assistance under Title XIX of the Social Security Act" | 28 (18) | 21.5 / 18 | 4 |
| Income over 260% FPL | MAGI income facts | 110.1.E-F: "Have a household income greater than 142% but not exceeding 260% of the Federal Poverty Level" | 6 (4) | 22 / 17 | 4 |
| Deceased | `date_of_death` | chp_eligibility_status arm 2 | 4 (1) | 1.5 / 1 | 2 |
| Month before coverage | `ma_application_date`, `date_of_birth` | 430.1: "effective on the latter of: A. The first day of the month of application for Medical Assistance; or B. The first day of the month the person becomes eligible" | 1 (1) | 2 / 2 | 0.5 |

"Medicaid eligible" is a referral to Medicaid, not a denial of coverage.

### Medicaid, aged, blind and disabled groups (`ma_ssi_related_category`, `ma_msp_category`, `ma_buy_in_category`, `ma_ltc_eligibility_status`)

| Condition | Facts | Paragraph | Denials (hh) | Facts to settle | Cost |
|---|---|---|---|---|---|
| Not aged, blind or disabled; not an SSI recipient | `date_of_birth`, `receives_ssi`, `meets_ssa_disability_criteria`, `is_blind`, `adult_financial_program_received` | 42 CFR 435.520: "The agency must not impose an age requirement of more than 65 years."; 10 CCR 2505-10 8.100.3.M.2.b (code B, SSI recipients) | 41 (29) | 7 / 7 | 1 |
| Medicare Savings Programs: no Part A | `medicare_part_a_entitled` and its date | ma_msp_category (CO-617) | 12 (7) | 11 / 9 | 0.5 |
| Buy-In: not disabled or no earnings | `meets_ssa_disability_criteria`, `earnings`, `date_of_birth` | ma_buy_in_category (CO-622) | 7 (4) | 2 / 2 | 0.5 |
| Long-term care: not institutionalized and not in a waiver target group | `residence_setting_type`, `meets_hcbs_waiver_target_group` | ma_ltc_eligibility_status (CO-652) | 6 (5) | 2 / 2 | 1 |
| Long-term care: resources | `holdings`, `marital_status` | SSI resource standard (ma_meets_ssi_resource_standard, CO-610) | 3 (2) | 12 / 2 | 5 |
| Long-term care: not aged, blind or disabled | `date_of_birth`, `is_blind`, `meets_ssa_disability_criteria` | as the first row | 3 (2) | 8 / 3 | 1 |

### Colorado Works (`cw_eligibility_status`, `cw_grant_amount`)

| Condition | Facts | Paragraph | Denials (hh) | Facts to settle | Cost |
|---|---|---|---|---|---|
| No dependent child or pregnant member in the unit | relationships, `date_of_birth`, `is_pregnant`, `dwelling_id`, `temporary_absence_reason`, `receives_ssi`, `child_welfare_payment_type` | 9 CCR 2503-6 3.601: "'Dependent child(ren)' means a person who resides with a parent or non-parent caretaker and who is: A. Under eighteen (18) years of age; or, B. Between the ages of eighteen (18) and nineteen (19) and a full-time student in a secondary school" | 9 (6) | 16 / 16 | 1 |
| Income over the need standard | the unit facts, plus `earnings` and `receipts` | 3.606.1.H: "To be eligible for Colorado Works basic cash assistance, the countable gross earned and unearned income together shall not exceed the need standard for the household size after disregards" | 32 (18) | 37 / 34 | 4 |
| 60-month time limit | `months_of_assistance_received`, exempt months, extensions (agency) | 3.606.6.A | 4 (2) | 37 / 30 | 0.5 |
| Refused child support assignment | `cw_has_refused_child_support_assignment` | cw_meets_child_support_requirements | 3 (2) | 22 / 13 | 0.5 |
| Minor parent's living arrangement | `is_emancipated_minor`, `marital_status`, `county_approved_living_arrangement` | C.R.S. 26-2-706(2)(b): "an unmarried parent under eighteen years of age shall not receive assistance unless such unmarried parent resides with his or her parent or other specified caretaker in an adult-supervised home" | 2 (1) | 25 / 18 | 1 |
| IPV, diversion period, strike, institution, residency, status | the named finding plus the unit facts | cw_eligibility_status arms 3 to 11 | 10 (8) | 19 to 23 / 9 to 16 | 0.5 to 1 |

Every Colorado Works denial needs the assistance unit first: who is in the home in the month, and who is excluded (SSI recipients, children with a IV-E payment, optional members). That is about 10 facts before any ground can settle. There is no asset test ("An asset test shall not be applied as a condition of eligibility for participation in the works program", C.R.S. 26-2-706(2)(a)), so resource records are never asked for this program.

### Adult Financial (`af_category`, `af_oap_grant`, `af_and_grant`)

| Condition | Facts | Paragraph | Denials (hh) | Facts to settle | Cost |
|---|---|---|---|---|---|
| Age outside every category | `date_of_birth` | 9 CCR 2503-5 3.520.61.A: "Be eighteen (18) through fifty-nine (59) years of age for AND-SO (unless diagnosed with blindness, then age zero (0) through 59 years of age); age 0 through 59 years of age for AND-CS; and age sixty (60) years of age or older for OAP" | part of 38 (27) | 3 / 3 | 1 |
| AND-CS needs SSI due to disability or blindness; AND-SO needs a disability and no SSI or SSDI | `receives_ssi`, `meets_ssa_disability_criteria`, `is_blind` | 3.546: "provides a supplemental payment for clients age zero (0) to fifty-nine (59) who are receiving SSI due to a disability or blindness"; 3.540 | part of 38 | 3 / 3 | 1 |
| Resources at or over the limit | `holdings` (the known parts over the limit already settle it, CO-5350) | 3.520.71.A: "Have countable resources below the resource limit as outlined in Section 3.520.72" | 12 of 38 | | 5 |
| Status (AND) | `immigration_status` | 3.520.61.C | 12 of 38 | | 3 |
| Resident; not an inmate or fleeing felon | `state_of_residence`, `residence_setting_type` | 3.520.61.B: "Be a resident of Colorado, except that inmates of a city, municipal, county, State, or Federal correctional institution, and fleeing felons, shall not be eligible for Adult Financial programs" | 1 of 38 (setting) | | 1 |

The median Adult Financial category denial settles on 3 facts. 21 of the 38 settle on 3 or fewer.

### CCCAP (`cccap_eligibility_status`)

| Condition | Facts | Paragraph | Denials (hh) | Facts to settle | Cost |
|---|---|---|---|---|---|
| No eligible child | `date_of_birth`, relationships, `dwelling_id` | 8 CCR 1403-1 3.111.F: "An 'eligible child' is a child from birth to the age thirteen (13) years who needs child care services during a portion of the day, but less than twenty four (24) hours, and is physically residing with the eligible adult caretaker(s) or teen parent(s)" | 9 (6) | 6 / 6 | 1 |
| Caretaker not in an eligible activity | `hours_worked`, `education_program_type`, `cccap_is_in_job_search_activity`, `is_in_sud_treatment_iop_or_higher` | 3.103.OO: "This may include job search; employment; self-employment; training; basic education; or, post-secondary education"; 3.111.D.1 | 23 (11) | 15 / 15 | 1 to 2 |
| Income over the entry or exit limit | `earnings`, `receipts`, `cccap_application_county`, `cccap_determination_type` | 3.111.H.1: "Adult caretaker(s) or teen parent(s) gross income must not exceed eighty-five percent (85%) of the state median income. a. Entry eligibility shall be set by the Department at a level based on the self-sufficiency standard, not to be set below one hundred eighty-five percent (185%) of the federal poverty level." | 13 (8) | 17 / 13 | 4 |
| Other (`ineligible`) | `cccap_determination_type`, `receives_tanf_cash`, `cccap_declares_assets_within_limit` | cccap_eligibility_status arms 5, 7, 9, 13 | 7 (3) | 18 / 12 | 0.5 to 1 |

Every CCCAP denial also needs `is_protective_services_child_care_case` (83%) and `receives_tanf_cash` (83%): the protective-services and Colorado Works child care paths come before the activity and income tests and must be closed first (G4).

### LEAP (`leap_is_eligible`, `leap_benefit_amount`)

| Condition | Facts | Paragraph | Denials (hh) | Facts to settle | Cost |
|---|---|---|---|---|---|
| Month outside the eligibility period | `leap_application_date`, or no fact at all for a month outside November to April | 9 CCR 2503-7 3.751.1: "There shall be one eligibility period for the Basic Low-Income Energy Assistance Programs from November 1st through April 30th." | 8 of 15 (12 targets need **0** facts) | 0 to 1 | 0.5 |
| Another approved household; no countable member (SSN, citizenship) | `leap_is_in_another_approved_household` (agency), `ssn_furnished_or_application_shown`, `immigration_status` | 3.752.2: "The following factors shall be considered as of the date of application: Colorado state residency, U.S. citizenship" | 6 to 7 of 15 | 2 / 2 | 0.5 to 3 |
| Not vulnerable to heating costs | `home_heating_cost_arrangement`, `residence_setting_type` | 3.752.25.A: "the household must be responsible for the costs of home heating" | (none stored) | | 1 |
| Income over 60% SMI | `earnings`, `receipts` | 3.752.22.D | 6 of 15 | | 4 |

### SUN Bucks (`sebt_eligibility_status`, `sebt_benefit_amount`)

| Condition | Facts | Paragraph | Denials (hh) | Facts to settle | Cost |
|---|---|---|---|---|---|
| Not school-aged and categorical, and not enrolled in an NSLP/SBP school | `date_of_birth`, `is_enrolled_in_nslp_school` | 7 CFR 292.6: "Children eligible for Summer EBT include those who, at any time during the period of eligibility, are: (a) School-aged and categorically eligible. (b) Enrolled in an NSLP/SBP-participating school" | 16 (2) | **2 / 2** | 1 / 0.5 |

## Early-eligible shortcuts

These answers can settle "eligible" without income or resource records. Each also closes the questions it makes unnecessary. The counts are stored approvals whose minimal set holds no `earnings`, `receipts` or `holdings`.

| Shortcut | Facts | Paragraph | Stored approvals without records | Facts to settle |
|---|---|---|---|---|
| SNAP basic categorical eligibility (every member on SSI, Colorado Works, OAP, AND or AB) | `receives_ssi`, `receives_tanf_cash`, `adult_financial_program_received` | 10 CCR 2506-1 4.206.C.1.a: "Households in which all members receive, or are authorized to receive, SSI, Colorado Works (CW), Old Age Pension (OAP), Aid to the Needy Disabled (AND), Aid to the Blind (AB) or a combination of these benefits"; 4.408.A exempts BCE and ECE from the resource criteria | 0 of 31. ECE, the common path, still needs gross income at or below 200% FPL (4.206.C.2.a), so a SNAP approval always needs the income records. BCE skips the resource test and the gross and net tests, but the allotment still reads income | 49 |
| MAGI continuous eligibility (a child, or a prior enrolment) | `ma_prior_enrollment_category`, `continuous_eligibility_period_start_month` | ma_child_is_in_continuous_eligibility_period; the first arms of ma_magi_eligibility_status (CO-554) | 17 of 147 MAGI approvals (12 by prior enrolment) | 8 |
| Needy newborn (born to a mother on Medical Assistance) | `date_of_birth`, `public_health_coverage_enrolled` of the mother, `mother_coverage_at_birth` | ma_is_needy_newborn (CO-550) | 3 of 12 | 3 |
| Former foster care youth | `was_enrolled_in_medicaid_at_foster_care_exit`, `foster_care_exit_date`, `date_of_birth` | ma_is_former_foster_care_category | 4 of 4 | 4 |
| Pregnant woman (12 months after the pregnancy ends) | `is_pregnant`, the coverage period | 8.100.4.G.5: "Once eligibility has been approved, Medical Assistance coverage will be provided regardless of changes in the woman's financial circumstances once the income verification requirements are met." | 4 of 29 | 5 |
| SSI recipient, SSI-related Medicaid | `receives_ssi`, `date_of_birth`, `state_of_residence`, `immigration_status` | 8.100.3.M.2.b, code B | 3 of 3 | 4 |
| OAP state-only health care | `adult_financial_program_received` | 8.100.6.K | 2 of 2 | 1 |
| CCCAP Colorado Works child care | `receives_tanf_cash`, `is_work_eligible_individual_in_tanf_case`, the eligible child | cccap_colorado_works_child_care_eligible | 8 of 8 | 12 |
| CCCAP homelessness stabilization; child welfare | `cccap_is_in_homelessness_stabilization_period`; `cccap_is_child_welfare_child_care_household` | cccap_eligibility_status arms 2, 10 | 5 of 5; 2 of 2 | 9; 6 |
| SUN Bucks categorical (a child on SNAP, TANF or FDPIR; a foster child) | `receives_snap`, `receives_tanf_cash`, `child_welfare_payment_type`, `date_of_birth` | 7 CFR 292.2: "one or more children in that household are receiving assistance under SNAP, TANF, or FDPIR" | 5 of 7 | 2 |
| Hospital presumptive eligibility | the declared income and size, `is_pregnant`, the site | ma_hospital_presumptive_eligibility_category | 7 of 7 | 6 to 8 |

No stored approval of Colorado Works, Adult Financial, LEAP, CHP+ or SNAP settles without income records. Those programs have no early "eligible".

## Cross-program interview order

A front end serving several programs should ask in this order. The order is per household. A "question" covers every person in the household; detail is asked only for the persons it concerns.

| Step | Question | Facts | Programs served | Branch points |
|---|---|---|---|---|
| 0 | Application data (no question): programs requested, application date, months asked for, Medicaid retroactive request | `ma_application_date`, `snap_application_date`, `leap_application_date`, `ma_retroactive_coverage_requested` | all | Outside November 1 to April 30: LEAP is not open; say when it opens and skip every LEAP question. No retroactive request: months before the application month are not asked about. |
| 1 | Who lives with you? For each person: date of birth, how they are related, whether they live in this home, who buys and prepares food together | relationships, `dwelling_id`, `date_of_birth` | all 9 | No child under 13 (or under 19 with additional care needs): skip CCCAP. No child under 18 (or 18 in secondary school) and no one pregnant (step 2): skip Colorado Works. No one under 19 and no one pregnant: skip CHP+. No school-aged child: skip SUN Bucks. No one 60 or older: skip OAP. No one 65 or older: skip the aged Medicaid group. One person alone: no relationship grid. |
| 2 | Is anyone pregnant? (one household question, FB-03) | `is_pregnant` | MAGI, CHP+, Colorado Works, SNAP | No: everyone not pregnant; skip pregnancy dates and expected number of children. |
| 3 | Does each person live in Colorado, and where: a private home, a facility, or temporarily away? (one attestation for the common case, FB-08) | `state_of_residence`, `county_of_residence`, `residence_setting_type`, `temporary_absence_reason` | 8 | A person in an institution that provides most meals is out of SNAP. A nursing facility opens the long-term care questions. Not in Colorado: "likely not eligible", and still offer the application. |
| 4 | Does anyone already get SSI, Colorado Works, OAP or AND, SNAP, Medicaid, or a foster care, adoption or kinship payment? | `receives_ssi`, `receives_tanf_cash`, `adult_financial_program_received`, `receives_snap`, `is_enrolled_in_medical_assistance`, `child_welfare_payment_type` | 8 | Everyone on SSI, Colorado Works or AF: SNAP BCE, so skip SNAP resources. A child on SNAP or TANF: SUN Bucks categorical, so skip school-meal income. Colorado Works cash: CCCAP Colorado Works child care, so skip the low-income test. SSI: SSI-related Medicaid; the person is excluded from the Colorado Works unit. |
| 5 | Does anyone have a disability or blindness found by Social Security, or Medicare? | `meets_ssa_disability_criteria`, `is_blind`, `medicare_part_a_entitled`, `medicare_part_b_enrolled` | 6 | No one disabled, blind or 60 or older: skip the six SNAP disability prongs (FB-01), AND, the disability Medicaid groups and the Buy-Ins. No Medicare: skip the Medicare Savings Programs. |
| 6 | Agency record check (no applicant question) | SNAP and Colorado Works disqualifications, `months_of_assistance_received`, `received_tanf_from_another_state_this_month`, `receives_fdpir`, `is_protective_services_child_care_case`, `leap_is_in_another_approved_household`, `is_enrolled_in_nslp_school`, prior Medicaid | SNAP, Colorado Works, CCCAP, LEAP, SUN Bucks, Medicaid | No finding on record: the rule's own presumption (FB-04); ask nothing. |
| 7 | Citizenship or immigration status of each person applying | `immigration_status`, `qualified_status_date`, `us_entry_date` | 8 | Out of SNAP, Colorado Works, AF and LEAP as a person, never the household. For Medicaid, emergency Medicaid or Cover All Coloradans: never stop the Medicaid application on this answer. |
| 8 | Child care (only with a child under 13): does the child need care part of the day; what does each caretaker do? | `cccap_child_needs_care_for_part_of_day`, `hours_worked`, `education_program_type`, `cccap_is_in_job_search_activity` | CCCAP | No caretaker in an eligible activity: CCCAP likely not eligible; skip CCCAP income. |
| 9 | Does anyone have income? Then each job's pay and each other payment, with dates; the tax household; the MAGI adjustments as one yes/no (FB-02) | `earnings`, `receipts`, `is_tax_filer`, `is_claimed_by_filer_outside_case`, `is_required_to_file_tax_return`, the four MAGI adjustments, `expected_annual_income` | all | No income: stated empty lists (decision 4: "an empty list means no unearned income"); skip every detail. Monthly MAGI income within the standard: skip expected annual income. |
| 10 | Resources (only AF, non-MAGI Medicaid, SNAP standard eligibility) | `holdings` | AF, non-MAGI, SNAP | Skip for MAGI, CHP+, Colorado Works, LEAP and SUN Bucks; skip for SNAP BCE and ECE. |
| 11 | Expenses (only SNAP net income and allotment, CCCAP fee, AF, long-term care patient payment) | `shelter_cost_monthly`, `dependent_care_expense`, `child_support_paid_legally_obligated`, `medical_expenses_out_of_pocket` | SNAP, CCCAP, AF, LTC | Never a disqualifier on its own; an unclaimed deduction is 0 (FB-09). |
| 12 | Heating (LEAP, in season): who pays for heat, the primary heat source, the kind of dwelling | `home_heating_cost_arrangement`, `has_primary_heating_source` | LEAP | Homeless, or heat included in subsidized rent with no meter: LEAP likely not eligible (3.752.25.B). |

### The first ten questions

1. Who lives with you, and how is each person related? Do you all live here, and who buys and prepares food together?
2. Each person's date of birth.
3. Is anyone pregnant?
4. Does each person live in Colorado (state; county)?
5. Is anyone living in a nursing facility, hospital, jail or other institution, or away from home for now?
6. Does anyone already get SSI, Colorado Works, Old Age Pension or AND, SNAP, Medicaid, or a foster care, adoption or kinship payment?
7. Has Social Security found anyone disabled or blind? Does anyone have Medicare?
8. (Agency record check, no question.)
9. Citizenship or immigration status of each person applying.
10. Does anyone have income from a job or any other source?

After step 10, a child under 13 brings in the CCCAP activity questions, and the LEAP season brings in the heating questions. The resource and expense questions come last and only for the programs that read them.

### Per-program screening orders

| Program | First questions, in order |
|---|---|
| SNAP | relationships and `dwelling_id`; `residence_setting_type`; agency record (refused, FDPIR, IPV and drug or work-rule findings); `receives_ssi`, `receives_tanf_cash`, `adult_financial_program_received` (BCE); `date_of_birth` (elderly); `immigration_status`; income records; `holdings` only if standard eligibility |
| Medicaid MAGI | months (`ma_application_date`, retroactive request); `date_of_death`; `date_of_birth`; `is_pregnant`; `state_of_residence`; Medicare; tax household; income |
| CHP+ | `date_of_birth`; `is_pregnant`; the month; `state_of_residence`; other coverage; income |
| Medicaid non-MAGI | `date_of_birth`; SSA disability or blindness; `receives_ssi`; OAP receipt; Medicare Part A; setting or waiver group; `holdings` |
| Colorado Works | relationships; `date_of_birth`; `is_pregnant`; who is in the home in the month; SSI and IV-E exclusions; agency record (60 months, IPV, other state); status; income |
| Adult Financial | `date_of_birth`; residence and setting; other-state assistance; `receives_ssi`; disability or blindness; status; `holdings`; income |
| CCCAP | relationships and `date_of_birth` (a child under 13); the child needs care; protective services or child welfare referral; Colorado Works cash; caretaker activity; income |
| LEAP | the month (season); residence; another approved household; SSN and status (a countable member); heating arrangement; income |
| SUN Bucks | `date_of_birth`; NSLP school enrolment; a child on SNAP, TANF or FDPIR; school-meal income |

The JSON gives each entry with its conditions, the programs it serves, its denial share, its cost, its verification element and its skip set.

### Skip sets

| When the answer is | Fields that become irrelevant |
|---|---|
| No child under 13 (or under 19 with additional care needs) | every CCCAP fact: the child's care need, caretaker activity, `hours_worked`, `cccap_is_financially_contributing_to_child`, `cccap_declares_assets_within_limit`, CCCAP county and determination type |
| No child under 18 (or 18 in secondary school) and no one pregnant | every Colorado Works fact: unit options (`cw_is_optional_member_by_custody_or_support`), `months_of_assistance_received`, diversion, child support assignment |
| No one under 19 and no one pregnant | every CHP+ fact |
| No school-aged child and no child in an NSLP school | every SUN Bucks fact |
| No one 60 or older, disabled or blind | the six SNAP disability prongs (FB-01); OAP and AND; aged, blind and disabled Medicaid; Buy-Ins; medical expense deductions |
| No Medicare | Medicare Savings Program facts |
| Every SNAP member on SSI, Colorado Works, OAP, AND or AB (BCE) | SNAP `holdings` and the resource test; the gross and net tests (the allotment still reads income) |
| A child on SNAP or TANF | school-meal household income and size |
| Protective services or child welfare child care referral | CCCAP caretaker activity and income |
| Application month outside November 1 to April 30 | every LEAP fact |
| No Medicaid retroactive request | facts dated before the application month, for Medicaid |
| No program requested that reads resources (AF, non-MAGI Medicaid, SNAP standard) | `holdings` |
| A person in an institution that provides most meals | every SNAP fact for that person |
| Everyone in a private home in Colorado (one attestation) | per-person dwelling labels, states and settings (FB-08) |
| No income (stated empty lists) | every income detail, the MAGI adjustments, `expected_annual_income` |

## Measured savings

Each row is one program's stored denials. Questions are distinct facts asked, a household question counting once:

- **Read** is what the full evaluation reads.
- **File order** asks in the stored case file's order.
- **Program order** and **cross order** use the orders above.
- Each order is run with the current engine and with a three-valued case.

| Program (denials) | Read | File order | Program order, current / three-valued | Cross order, current / three-valued | Minimal set, current / three-valued | Stated by the household |
|---|---|---|---|---|---|---|
| SNAP (39) | 35 | 35 | 34 / **21** | 34 / 24 | 48 / 15 | 252 |
| Medicaid MAGI (124) | 22 | 21.5 | 19 / 19 | 20 / 20 | 19 / 15 | 134 |
| CHP+ (59) | 19 | 17 | 16 / 14 | 18 / 15 | 16 / 12 | 147 |
| Medicaid non-MAGI (103) | 11 | 9 | 10 / 8 | 11 / 10 | 5 / 4 | 180 |
| Colorado Works (121) | 23 | 23 | 20 / 19 | 20 / 20 | 29 / 24 | 170 |
| Adult Financial (89) | 8 | 7 | 7 / 7 | 7 / 7 | 3 / 2 | 290 |
| CCCAP (52) | 17 | 17 | 14 / 14 | 14.5 / 14.5 | 16 / 13 | 108 |
| LEAP (21) | 1 | 0 | 0 / 0 | 0 / 0 | 0 / 0 | 1,038 |
| SUN Bucks (16) | 3 | 2 | 2 / 2 | 3 / 3 | 2 / 2 | 1,038 |
| Medicaid limited (23) | 4 | 3 | 3 / 2 | 4 / 3 | 3 / 1 | 315 |
| **All denials (647)** | **16** | **16** | **14 / 13** | **13 / 13** | **15 / 11** | **160** |

The minimal-set and stated columns count fact-person units; the others count distinct questions.

**Within a denial.** With the cross-program order, 191 of 647 denials (30%) settle within 5 questions and 265 (41%) within 10. With a three-valued case the figures are 201 and 276.

**Per household.** Across the 216 households with a stored denial, the interview reads 5,517 distinct facts in all if every outcome is asked in full. Stopping each denial when it settles asks 5,269 (4.5% fewer) with the current engine, or 5,144 (6.8% fewer) with a three-valued case; the median household saves nothing. These fixtures pair most denials with an approval in another program, and the approval needs the same facts. The saving in a real caseload comes from the branch points: skipping every question of a program whose gate fails (no child under 13, no pregnancy or child, out of season). The stored fixtures were built to exercise each program, so they cannot show that saving. They do show that the gates settle in 1 to 6 facts where they apply: CHP+ 2, SUN Bucks 2, CCCAP no eligible child 6, LEAP season 0.

**Against the form.** The median stored household states 160 facts per denial target; the evaluation of that outcome reads 22 of them; the cheapest proof of the denial needs 15 today and 11 with a three-valued case.

## Engine and decision-4 gaps that block early exit

| Gap | What happens | Evidence in stored households | Proposed fix |
|---|---|---|---|
| **G0** `is_colorado_resident` (CO-505) reads "no state, no county" as not resident | `["otherwise", ["=", state_of_residence, colorado_state_code], ["not", ["unknown", county_of_residence]]]` is false when both are unstated. That is a denial from no information, against decision 4. | With nothing stated: `af_category` none for 71 of 71 targets (33 stored approvals), `af_oap_grant` 0 for 48 of 48, `af_and_grant` 0 for 11 of 11. Under a three-valued case it would also deny SNAP (no eligible members) and Colorado Works (residency) with zero facts. Before the correction, 49 Colorado Works and 12 SNAP minimal denial sets settled on the residency reading (ineligible_residency; no eligible members) instead of the stored reason. | `["otherwise", ["=", "state_of_residence", "colorado_state_code"], ["case", [["not", ["unknown", "county_of_residence"]], true]]]`: a county still implies Colorado; neither stated is cannot determine. No stored outcome answer changes (all 3,340 reproduce). Until fixed, a screener must ask state or county before it shows any result. |
| **G1** A first-hit `case` stops at an unknown condition | docs/operators.md, Logic: "an unknown condition makes the result unknown: later arms are not tried, even one that would match". `all` and `any` are already three-valued (a false or true input settles them); `case` is not. | Minimal denial sets: 10,312 facts, against 8,234 with a possible-values case (-20%). Medians: SNAP 48 to 15, Colorado Works 29 to 24, CCCAP 16 to 13, MAGI 19 to 15, CHP+ 16 to 12. Of 1,270 settled-but-asked facts in 307 denials (every value gives a denial, yet withholding gives cannot determine), the possible-values case settles 609: `received_tanf_from_another_state_this_month` 94, `is_participating_in_strike` 64, `immigration_status` 61, the SNAP findings 90. It changes no settled stored answer. Of the stored "cannot determine" outcomes, CO-1121 becomes settled, and CO-928 (MAGI) becomes "residency or income": not eligible either way. | Evaluate a `case` to the set of values still possible. An unknown condition adds its arm and continues; the value is settled when every open arm agrees. Comparisons (`=`, `in`) against a literal settle when every possible value answers alike. A screener asks the class ("is this a denial?"), so it can settle "not eligible" when every open arm is a denial reason. This changes the engine contract (`volume.resolution.contract`) and needs conformance cases; Drools, Corticon and fact-graph mappings need a note. |
| **G2** Correlated paths: every answer leads to a denial by a different route | The unknown sits under `all` or `any` in a membership rule. The member is either excluded from the unit, or included and the unit is over income. | 661 settled-but-asked facts in stored denials stay unsettled under G1 (646 in logic, 14 in group membership, 1 in an amount): `child_welfare_payment_type` 151, `receives_ssi` 148, `is_fleeing_felon` 112, `cw_is_optional_member_by_custody_or_support` 82, SNAP member disqualifications 68, `is_pregnant` 19. | What-if check: for the few unanswered yes/no or one-of facts on the missing list (cap 3, so at most 8 evaluations), evaluate each value. If every value gives the same class, show "likely not eligible whatever the answer" and skip the question. Better as an engine hook ("evaluate under each value of F") than in the front end, so the trace stays whole. |
| **G3** Sums and groups are strict | `sum`, `filter`, `+` and comparisons are unknown if any part is. A household whose known income is already over the limit still cannot be settled while one member's income is unstated. | 14 group-membership and 1 amount case in denials; 59 in approvals. Adult Financial already does this for resources: `af_meets_resource_limit` (CO-948) reads `af_resources_known_lower_bound` (CO-5350) first. | Apply the CO-5350 pattern where every part only adds: SNAP gross income, the Colorado Works need standard, CCCAP and LEAP gross income. The known-parts lower bound over the limit settles not eligible. Not for net income or MAGI, where deductions subtract. |
| **G4** Findings, referrals and claims are read bare | Every favourable arm of a first-hit list must be closed before a denial settles, so the facts that open favourable paths sit in the denial sets. Their texts give a default (no finding, not referred) that the readers do not apply (FB-04, FB-06, FB-14). | `is_protective_services_child_care_case` in 83% of CCCAP denials. SNAP IPV, drug-felony and work-rule findings in 85-90% of SNAP denials today and 26-59% with G1. `received_tanf_from_another_state_this_month` in 78% of Colorado Works denials today and 0% with G1. | The rule's own default in every reader (`otherwise`, no finding); the agency record supplies the exceptions. They then leave the applicant interview. |
| **G5** The missing-facts list depends on evaluation order | docs/operators.md, "Cannot determine": "the supplied facts the evaluation, left to right and short-circuiting as described above, asked for and found unstated". After a case stops at an unknown condition, the facts the later arms need are never listed. | A front end that asks "what is missing?" gets one question at a time. | With G1, list every unstated fact that an open arm reads, and mark those whose answer can change the class. That is the next-question set a screener needs. |
| **G6** Outcomes are per month | A determination-month answer does not settle the retroactive or application months. | 55 of 94 stored MAGI status denials are for a month other than the determination month. Withholding the retroactive request turns 8 stored retroactive-month income denials into before-coverage-period denials (`ma_month_is_before_coverage_period`, CO-4101, reads an unstated request as none, which is the rule's default). | Ask the months first (step 0) and screen each month separately. Never carry a determination-month denial to another month. |

## Guardrails

### What the rules say

**The right to apply.**
- SNAP, 7 CFR 273.2(c)(1)(iii) (D-8): "Each household has the right to file an application form on the same day it contacts the SNAP office during office hours. The household shall be advised that it does not have to be interviewed before filing the application and may file an incomplete application form as long as the form contains the applicant's name and address, and is signed by a responsible member of the household or the household's authorized representative."
- SNAP, Colorado, 10 CCR 2506-1 4.202.A (D-133): "Regardless of what type of application system is used, the local office must provide a means for applicants to immediately begin the application process."
- Medical Assistance, 10 CCR 2505-10 8.100.3.A.10 (D-65): "The eligibility site must afford any individual wishing to do so the opportunity to apply for Medical Assistance without delay." 42 CFR 435.906 is not among the fetched documents. 42 CFR 435.907(a) (D-196): "the agency must accept an application from the applicant ... and any documentation required to establish eligibility", by internet, telephone, mail, in person and other electronic means.
- Colorado Works, 9 CCR 2503-6 3.602.1.A (D-104): "An individual shall have the opportunity to apply for Colorado Works assistance without delay."
- LEAP, 9 CCR 2503-7 3.751.32 (D-63): "All persons shall be provided an opportunity to file an application form on the date of initial contact with the county department during the application period."

**Applicants are told they may continue.**
- 7 CFR 273.2(c)(2)(i) (D-8): "If the State agency attempts to discourage households from applying for cash assistance, it shall make clear that the disadvantages and requirements of applying for cash assistance do not apply to SNAP benefits. In addition, it shall encourage applicants to continue with their application for SNAP benefits."
- 10 CCR 2506-1 4.202.B (D-133): "Persons who request information for SNAP must be advised of expedited service provisions and encouraged to apply so that eligibility processing can begin."

**One program's screen does not deny another.**
- 10 CCR 2505-10 8.100.3.A.2 and A.4 (D-65): "If the applicant applied for Medical Assistance on the Single Streamlined Application and was found ineligible, this application shall be reviewed for all other Medical Assistance eligibility programs, the Child Health Plan Plus (CHP+) program and premium and cost-sharing assistance for purchasing private health insurance through the state insurance marketplace." "If an applicant is found to be ineligible for a particular program, the Application for Public Assistance shall be reviewed and processed for other financial programs the household has requested on the Application for Public Assistance and all other Medical Assistance Programs."
- 10 CCR 2506-1 4.202.1.A (D-133): "Households applying for PA shall be notified of their right to apply for SNAP at the same time and shall be allowed to apply for SNAP at the same time they apply for PA benefits."
- 9 CCR 2503-5 3.520.4.B (D-62): "Review the application for completeness for all programs applied for and/or any programs not applied for but that the client is potentially eligible for."

**"Ruled out" is per category and per person until every pathway is closed.**
- 42 CFR 435.916(f)(1) (D-115): "Prior to making a determination of ineligibility, the agency must consider all bases of eligibility, consistent with § 435.911."
- The codex models this already: `ma_magi_category` tries the needy newborn, child, pregnant, parent or caretaker, former foster care, adult, transitional and extension categories in turn. `ma_ssi_related_category`, the Medicare Savings Programs, the Buy-Ins and long-term care are separate outcomes. A person out of the adult group may be in as a parent, as a pregnant woman or through a disability. CHP+'s "Medicaid eligible" is a referral, not a denial. A person without a qualifying status is out of SNAP, Colorado Works, AF and LEAP as a person, never the household, and is moved to emergency Medicaid or Cover All Coloradans for Medicaid.

**"Cannot determine".**
- docs/plan-colorado.md, decision 4 of 2026-11-23: "Missing information means 'cannot determine' unless the rule says otherwise. Each supplied fact states once whether it is required or what its rule-given default is; readers do not invent defaults."
- docs/operators.md: "An outcome that is unknown is reported as *cannot determine*, with the supplied facts it was waiting on." A screener's "likely not eligible" is a statement about the facts given so far, not a determination. G0 shows that today the engine can also say "not eligible" when it should say "cannot determine".

**Retroactive and application months.**
- 10 CCR 2505-10 8.100.3.E.2 (D-65): "An applicant does not have to be eligible in the month of application to be eligible for retroactive Medical Assistance."
- 7 CFR 273.10(a)(1)(ii) (D-14): "the household shall receive benefits from the date of application to the end of the month".
- CHP+ 430.1 makes coverage effective from the first day of the month of application.
- LEAP judges "as of the date of application" (3.752.2).
- The outcomes are per month. 55 of 94 stored MAGI denials are for a month other than the determination month.

### What the front end may do

- Order the questions and skip the ones a known answer makes irrelevant (the skip sets).
- Show "likely not eligible for X, based on what you told us; you may still apply". It must name what the answer turned on and say the person can continue.
- Use a settled engine answer to stop asking that program's remaining questions, for that person, category and month.
- Ask a household screener first and detail only on yes (FB-01, FB-03, FB-07, FB-08).
- Take agency-record findings from the record, not from the applicant (FB-04).

### What the front end may not do

- Stop, delay or discourage filing. It must keep the name, address and signature path open on every screen (273.2(c)(1)(iii); 4.202.A).
- Record, display or send a denial. A screener's result is not a determination, carries no notice, and does not start or stop any processing clock.
- Treat one program's "likely not" as another's, or one Medicaid category's "out" as Medicaid's. It may not drop the other programs the person asked for (8.100.3.A.2, A.4; 4.202.1.A).
- Rule a household out on one person's status, age or setting, where the rule rules out that person.
- Infer an answer from silence: an unanswered question is "cannot determine" (decision 4). Until G0 is fixed this means asking state or county before showing any result.
- Carry a determination-month result into a retroactive or application month (8.100.3.E.2).
- Rely on a "settled by every answer" result (G2) unless the engine computed it over the rule's own values.

## Limits of this review

- **The fixtures are adversarial.** Shares and medians describe 552 test households built to exercise edge cases, not a caseload. SUN Bucks has only 2 households with a denial; LEAP has 11.
- **Greedy deletion gives a 1-minimal set for one order, not the smallest set.** Removing costlier units first makes the set lean on cheap facts. A different order can give a different set of the same class.
- **"Settled but asked" is exhaustive only for yes/no and one-of facts.** For amounts I tried five values, so those findings are indicative.
- **The three-valued engine is a scratch prototype.** It is not part of the codex. Its results are sound only if an unknown condition can be true or false independently. Facts shared between arms can make it miss a settled answer (that is G2), but never claim a wrong one.
- **The cost model is ordinal.** It is not a measured time per question. The orders are robust to swapping costs within a band.

## Reproduction

The scripts are in `scratch-screening/` (untracked). Run them from the worktree root with the main checkout's `node_modules`:

1. `vite-node scratch-screening/greedy.ts` (about 4 minutes) writes `out/greedy.jsonl`.
2. `vite-node scratch-screening/culprit2.ts` analyses the settled-but-asked facts.
3. `python3 scratch-screening/make-orders.py`, then `vite-node scratch-screening/sim.ts scratch-screening/out/orders.json scratch-screening/out/sim.jsonl`, run the simulation. `SIM_GLOBAL_ONLY=1` gives the household-level run.
4. `python3 scratch-screening/aggregate.py`, `orders.py`, `gaps.py`, `sim-summary.py`, `hh.py` and `build-json.py` produce the numbers and the JSON.
5. `vite-node scratch-screening/validate-k.ts` checks the three-valued variant against every stored outcome answer.
6. `vite-node scratch-screening/zero.ts` evaluates every target with nothing stated. With `PATCH_RES=0` it runs without the G0 correction.
