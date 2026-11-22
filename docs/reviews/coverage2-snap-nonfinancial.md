# Coverage review, second pass: SNAP non-financial eligibility (family coverage2-snap-nonfinancial)

Reviewer: independent coverage reviewer, second exhaustive pass after the coverage fix round. Read-only review of HEAD `65ed7c8` on branch `ccr-9d19bf4c-wmnwcl`. This file is the only file written in the repository.

Method:
- The matrix below was built afresh from the governing text, not copied from the first pass (docs/reviews/coverage-snap-nonfinancial.md). D-82 (10 CCR 2506-1, rule version 12718, effective 2026-10-01) was read line by line: 4.000.1 (lines 30-870), 4.200-4.210 (1318-2950), 4.300-4.313 (2952-5686), 4.500-4.505.8 (8740-9822), 4.609 (10734-10890) and the disqualification periods of 4.803 (13884-13935, 14019-14068, 14376-14405). The federal texts the codex follows were read where an item cites them or where they differ from D-82: D-3 (7 U.S.C. 2015 (b)-(f), (k), (o), (r), (s)), D-6 (7 CFR 271.2), D-7 (273.1, in full), D-8 (273.2(c), (f), (h), (i)), D-9 (273.4(a)(6), (b), (c)), D-10 (273.5), D-202 (273.24), D-24 (8 U.S.C. 1612(a)), D-275 (1631), D-5 (Pub. L. 119-21 secs. 10102, 10108).
- Ledger: `npm run export -- --volume co` in a scratch copy (`git archive HEAD`, node_modules symlinked): 2,143 items. All 577 items with program SNAP or read by a `snap_*` item were dumped (meaning, precision, assumption, open questions, derivation in English) and each item named below was read against its paragraph.
- Wrong answers were confirmed with `npx vite-node scripts/eval-case.ts co <case> ...` on scratch households appended to the scratch copy's `volumes/co/tests/cases.yaml` (never the repository's). The three scratch households (ZZ-F1, ZZ-F2, ZZ-S1) are saved with their full facts at `/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/coverage2-nonfinancial-zz-cases.yaml`. The fix households CO-150 to CO-154 were re-evaluated (section 5).
- Scope: as the first pass. Definitions and non-financial eligibility, application dates and expedited service, household composition, categorical eligibility, citizenship, non-citizens and sponsor deeming, students, strikers, work rules, voluntary quit and ABAWD, disqualifications, and their verification. Income, resources, deductions and the allotment computation (4.207.3, 4.400-4.411, 4.506-4.507) are the financial family's and are mapped here only where a non-financial rule reaches them ("Fin").

## 1. Verdict

**4 P1 found.** The SNAP non-financial chapter is not yet complete under the stopping rule.

- All 14 first-pass P1s (C-1 to C-14) stay fixed (section 5). One fix round introduced a regression: the FDPIR (C-11) and refusal-to-cooperate (P2-8) bars make the household ineligible, but the allotment items were not given the same arms, so an ineligible household still shows its full benefit (N2-1, reproduced).
- Three P1s are paragraphs the first pass did not catch: the student's 80-hours-a-month test (N2-2, reproduced), the statutory limit on SNAP E&T placements in higher education (N2-3), and the student meal plan that makes a student a resident of an institution (N2-4).
- 5 P2 (one carried open from the first pass) and 6 P3.
- No open question in this family is misclassified (section 4); N2-P2-1 asks for one new open question.

## 2. Findings

Severity:
- **P1**: wrong answer, missing pathway or verification requirement, or a misclassified open question.
- **P2**: a meaning or scope gap a worker could trip on, an unrecorded legal reading, or an approval risk.
- **P3**: note.

### P1

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| N2-1 | P1 | 4.303.B second paragraph (D-82:3112-3115); 4.500.E (D-82:8797); 7 U.S.C. 2015(c) (D-3:61) | CO-2307 `snap_full_month_allotment`, CO-2308 `snap_prorated_initial_month_allotment`, CO-385 `snap_allotment`; CO-4266, CO-4267, CO-386, CO-387 | 4.303.B: "Households on Indian reservations participating in the Commodity Food Distribution Program for a particular period shall not be allowed to participate in SNAP during the same period." 2015(c): "no household shall be eligible to participate ... if it refuses to cooperate in providing information". | The coverage fix round added both bars to `snap_is_eligible` (CO-386) and `snap_eligibility_status` (CO-387) only. The allotment items have their own copy of the eligibility gate (financial review CF-9: eligible members, gross, net, resources, lottery, transfer, striker), and it has neither new arm. So the household is reported ineligible and paid in full. Scratch **ZZ-F1** is CO-87 with both brothers stated `receives_fdpir: true`: `snap_eligibility_status` `fdpir_participation`, `snap_is_eligible` false, `snap_allotment` **151** (should be 0). Scratch **ZZ-F2** is CO-87 with case fact `snap_household_refused_to_cooperate: true`: `refused_to_cooperate`, `snap_is_eligible` false, `snap_allotment` **151**. | Add `[not, snap_household_participates_in_fdpir]` and `[not, [otherwise, snap_household_refused_to_cooperate, false]]` to the first arm of CO-2307 and CO-2308 (or gate both on `snap_is_eligible` for the month, which keeps the copies from drifting again). Add an allotment test for each bar, and ZZ-F1 and ZZ-F2 as case variants of CO-87 expecting 0. |
| N2-2 | P1 | 4.306.1.B third paragraph (D-82:4419-4421); 7 CFR 273.5(b)(5) (D-10); cf. 273.24(a)(1)(i) (D-202:13) | CO-407 `snap_meets_student_employment_exemption`, CO-402, CO-175, CO-3041 | "The weekly employment of twenty (20) hours may be based on an average number of hours worked per month, so long as the student is employed for eighty (80) hours per month." | CO-407 converts the month's hours to a week by dividing by 4.3 and asks for 20, so it needs 86 hours a month. A student employed 80 to 85 hours in the month is exempt under Colorado's rule and ineligible in the codex. Scratch **ZZ-S1** is CO-87 with p2 aged 25, enrolled half time in higher education, working 82 paid hours in October: `snap_weekly_hours_worked` 19.07, `snap_meets_student_employment_exemption` false, `snap_is_ineligible_student` true, participation `ineligible_member_student`, household `no_eligible_members`. Under 4.306.1.B p2 is exempt. | Add an arm: hours worked in the month at least a new parameter `snap_student_employment_hours_per_month` (80, S135), beside the weekly test. Keep the self-employment earnings arm as it is. Add a CO-407 test at 80 hours. |
| N2-3 | P1 | 7 U.S.C. 2015(e)(3)(B) (D-3, "subject to the condition that the course or program of study (i) is part of a program of career and technical education ... that may be completed in not more than 4 years ... or (ii) is limited to remedial courses, basic adult education, literacy, or English as a second language"); 7 CFR 273.5(b)(11)(ii)(A)-(B) (D-10:43-49); 4.306.1.G (D-82:4459-4476) | CO-072 `is_assigned_to_higher_education_through_et_program`, CO-410 | 4.306.1.G: "The student is assigned to or placed in an institution of higher education through a program under ... Employment First (EF) ...", with no condition on the course. | CO-072's meaning ("through, or in compliance with the requirements of, WIOA, SNAP E&T, TAA, or another listed employment and training program") and Colorado's text both exempt any student placed through Employment First. The statute and the regulation exempt a SNAP E&T placement only where the course is career and technical education completable in four years or less, or remedial, basic adult education, literacy or ESL. A student placed through Employment First in a four-year bachelor's degree that is not career and technical education is exempt in the codex and ineligible under 2015(e). The volume follows the statute where Colorado's rule is broader (OQ-1, OQ-533, CO-344), but no override, precision or open question records this one. | State the 2015(e)(3)(B) condition in CO-072's meaning for an E&T placement (the WIOA, TAA and other-program arms keep no condition), with a `statute_override` note naming 4.306.1.G and citing D-3 and D-10 (a new excerpt). Or split the fact: `assigned_to_higher_education_through_snap_et` plus `snap_et_course_is_cte_or_remedial`. Add a CO-410 test. |
| N2-4 | P1 | 4.304.4.D.3 (D-82:3548-3552); 4.304.4.D (D-82:3530-3531) | CO-007 `snap_resides_in_institution_providing_meals`, CO-3334, CO-304 | "Students who purchase meal plans through an institution of higher education shall be considered residents of an institution if the meal plan provides the student more than fifty percent (50%) of his/her meals, unless the individual is otherwise exempt from the institution provisions as provided in Section 4.304.41." | No fact states a meal plan, and CO-007 rules out every `private_dwelling` before it reads meals. A student who lives off campus (or at home) and buys a college meal plan giving more than half of the meals is a resident of an institution under Colorado's rule, so not a household member; the codex keeps the student in the household. For a dormitory resident, CO-3334's meaning ("the setting provides ... as part of its normal services") does not say that a purchased meal plan counts, so the result depends on the worker's reading. This changes eligibility for every student who is exempt from the student rule (employed 20 hours, work study, a parent of a young child). No item, scope note or open question records the paragraph. | Add a neutral person fact, `has_higher_education_meal_plan_providing_majority_of_meals` (false when not stated), and an arm in CO-007 that reads it whatever the residence setting, unless a 4.304.41 exception applies. Cite D-82 4.304.4.D.3 (new excerpt). Add a CO-007 test and a case variant. |

### P2

| id | sev | paragraph | item(s) | what is wrong | proposed fix |
|---|---|---|---|---|---|
| N2-P2-1 | P2 (unrecorded legal reading) | 4.311.A.4 (D-82:5439-5441); 7 U.S.C. 2015(o)(3)(C) as amended (D-3: "a parent or other member of a household with responsibility for a dependent child under 14"); 7 CFR 273.24(c)(4) (D-202) | CO-4250, CO-414 | The C-1 fix reads Colorado's "same physical household ... does not have to be included in the same SNAP household" (`lives_with`), which reaches a roommate's child in a separate SNAP household. The statute and 273.24(c)(4) speak of a member of the household, and "household" in the Act is the SNAP household (7 U.S.C. 2012). Elsewhere the volume applies the statute over a broader Colorado rule (OQ-1, OQ-533, N2-3); here it applies the broader Colorado rule, and CO-4250's precision presents 273.24(c)(4) as saying the same thing. Answers change only for a person living with a child under 14 who is in another SNAP household. | Record an open question, class "legal question" (owner Legal, co-owner SNAP): Colorado's physical-household exception against 2015(o)(3)(C). Name it in CO-4250's assumption. |
| N2-P2-2 | P2 (carried open: first-pass P2-3, deferred) | 4.304.4.B.1-4 (D-82:3476-3503) | CO-038 `is_fleeing_felon`, CO-311 | CO-038's meaning is still 2015(k)'s federal definition. Colorado's four-part test (an outstanding felony warrant, awareness, an action to avoid arrest, and law enforcement actively seeking under 4.304.4.C.1), and its "the fleeing status must be verified", are in no SNAP item. A worker stating the fact by its meaning disqualifies people the four-part test does not. The fix round deferred it because CO-038 is shared with Colorado Works and Adult Financial. | As the disposition proposed: a SNAP finding, `snap_is_fleeing_felon_four_part_test` (supplied, the county's finding under 4.304.4.B), read by CO-311 and CO-2571 in place of CO-038. |
| N2-P2-3 | P2 | 4.505.6.J (D-82:9622-9627); 4.505.6.B last sentence (D-82:9517-9519); 7 CFR 273.4(b)(2) (D-9:116) | CO-4154, CO-1601, CO-1394 | "When any person in a household indicates inability or unwillingness to provide documentary evidence of non-citizen status ... the household has the option of ... participating with the member in question classified as an ineligible non-citizen. In such cases the local office shall not continue efforts to obtain that documentary evidence." No fact states the household's election. The codex keeps asking for the status (`pending`) until the documentation due date (day 30) and only then excludes the member. The determination after day 30 is the same; before it, the household that elected is reported as awaiting a verification the rule says not to pursue. | Add a person fact, `declines_to_provide_immigration_documentation` (false when not stated): the member is an ineligible non-citizen at once (an arm of CO-310) and CO-1373 asks nothing. |
| N2-P2-4 | P2 | 4.306.B.6 (D-82:4378-4381) | CO-4265 `participates_in_on_the_job_training` | "On-the-job training is defined as training in an employment environment and does not include an internship, field work, or practical experience associated with a course of higher education." CO-4265's meaning (from the C-10 fix) says only "being trained by an employer". A student in a course internship or practicum at an employer can be stated true and is then exempt. | Add the exclusion to CO-4265's meaning, citing 4.306.B.6 (S135). |
| N2-P2-5 | P2 | 4.206.C.1.c, C.2.c, C.3.a.1 (D-82:2368-2376, 2425-2433, 2447-2448); 4.000.1 "Disqualified individuals" | CO-337 | Not a wrong answer, a scope note: CO-337 bars BCE and ECE for a member "serving" an IPV disqualification (CO-039, a 273.16 disqualification). 4.206.C.3.a.1 also sends to Standard Eligibility a household with a member serving a disqualification for "a fraud conviction". CO-039's meaning names 273.16 only; a court fraud conviction under C.R.S. 26-2-305 that is not an IPV disqualification is not stated by it. | Add "or a disqualification following a fraud conviction (C.R.S. 26-2-305; 4.803.3)" to CO-039's meaning, or a precision saying a fraud conviction is served as an IPV disqualification under 4.803.3.A. |

### P3

| id | paragraph | item(s) | note |
|---|---|---|---|
| N2-P3-1 | 4.305.2.D.1, E.8 | CO-2337 | The precision still says "The forty quarters are qualifying_quarters", but since the C-5 fix the derivation reads `snap_creditable_qualifying_quarters` (CO-4262). Update the precision. |
| N2-P3-2 | 4.201.F, 4.207.2.A | docs/colorado-notes.md (CF-19 entry), CO-1746, CO-2305 | The CF-19 note says "No fact states a joint SSI application or a release date; such a household's initial month is read from its date of application". The non-financial fix of P2-1 later made CO-1746's meaning record the release date as the filing date. The two notes now disagree; the CF-19 line should point to the later fix. |
| N2-P3-3 | 4.204.C last paragraph, 4.205.1.B.2 (D-82:1948-1950, 2032-2037) | CO-348 | A household that misses its first interview, or does not complete it within seven days, loses its right to expedited service. Interviews are application processing, out of scope under docs/design-colorado.md, but CO-348's meaning presents entitlement as income and resources alone; a sentence saying the interview conditions are not modeled would help a worker. |
| N2-P3-4 | 4.304.3.B.3 | CO-305 | First-pass P3-5, still deferred (foster child may not apply separately). |
| N2-P3-5 | 4.304.1.C.2, 4.304.3.A.2 | CO-419 | First-pass P3-6, still deferred (spouse who purchases and prepares meals in the 165% test). The deferral says the text needs reading against 273.1(b)(2): D-7 (b)(2) excludes "the income of the individual's spouse" without condition, so the federal text does settle the spouse's income; Colorado's purchase-and-prepare condition is Colorado's own addition. Record it as a state-choice open question or resolve it on 273.1(b)(2). |
| N2-P3-6 | 4.310.3.E.1 | CO-404 | First-pass P3-8, half deferred: a migrant or seasonal farm worker under contract to begin work within 30 days is exempt from work registration; no fact states the contract. |

## 3. Coverage matrix

Key:
- **C**: carried by the item(s) named; each was read against the paragraph.
- **N/A**: not applicable, with the reason.
- **OQ**: carried as an open question.
- **Fin**: the financial family's range.
- **GAP / finding id**: see section 2.

Runs of subparagraphs with one disposition share a row.

### 3.1 Definitions, 4.000.1 (D-82:30-870)

| term(s) | disposition |
|---|---|
| Able-Bodied Adult Without Dependents (18 through 54; no one under 18 in the household) | C: CO-412 with CO-165, CO-166 (64, statute override of the definition under 2015(o)(3)(A) as amended, OQ-533); CO-413, CO-4250 with CO-167 (14, 2015(o)(3)(C)); N2-P2-1. |
| Countable month | C: CO-416, CO-051. |
| Disqualified individuals (IPV, SSN, ineligible non-citizen, work requirements, QA non-cooperation, ABAWD) | C: CO-311 arms (CO-039, CO-2562, CO-310, CO-040, CO-2318, CO-2564); QA non-cooperation as household refusal, CO-4267 (meaning names a quality control review). |
| Period of ineligibility (QA review) | C: CO-4267 (household refusal to cooperate with a QC review). |
| Basic Categorical Eligibility | C: CO-336, CO-338. The order against ECE is OQ-640. |
| Expanded Categorical Eligibility | C: CO-340 (OQ-12, OQ-356). |
| Standard Eligibility | C: CO-341. |
| Boarder; boarding house | C: CO-2567 (commercial boarding house and reasonable payment, P2-6 fixed), CO-304. |
| Roomer; live-in attendants | C: CO-2566, CO-305. |
| Household | C: CO-305 (buys_prepares_with chains). |
| Head of Household | C: CO-067 (identity and residency verification fall on the head). |
| Authorized representative | C: CO-3729, CO-3731, CO-1387. |
| Application; application filing date; valid application | C: CO-1746 (filing date, including the release date of P2-1). Form content N/A (application processing). |
| Application for recertification; initial application; initial month of application | C: CO-1567, CO-2305, CO-4269. |
| Application process; eligibility has been determined | N/A: application processing (docs/design-colorado.md). |
| Expedited service | C: CO-348, CO-1393, CO-1394. |
| Dual participation | C: CO-4178, CO-304 (4.303.B). |
| Drug and Alcohol Treatment Center | C: CO-007 arm (B) with CO-3330 `substance_use_treatment_facility`, CO-3331, CO-4255, CO-3335. |
| Group Living Arrangement | C: CO-007 arm (C) with CO-4256 (16), CO-3335. |
| Shelter for battered women and children | C: CO-3330 private_dwelling class with nighttime residence; CO-4178 precision (P2-5 fixed). |
| Communal dining facility; homeless meal provider | N/A: where benefits may be spent (4.309.1). |
| Person experiencing homelessness | C: CO-037 (follows 271.2, which also includes imminent loss). |
| Person with disabilities (prongs 1-8) | C: CO-302 (prongs 1-8 with CO-015, CO-1729, CO-2862, CO-3717, CO-3718, CO-014), CO-303 with CO-301. |
| Fleeing felon | C: CO-038; N2-P2-2. |
| Full-time student; institution of higher education; post high school education | C: CO-2881, CO-069, CO-021, CO-2880. |
| On-the-job training | C: CO-4265; N2-P2-4. |
| Indigent non-citizen | C: CO-2334, CO-2337. |
| Lawful Permanent Resident; parolee; qualified non-citizen | C: CO-002 options; CO-308 applies 2015(f) as amended (OQ-1). |
| Sponsor; sponsored non-citizen | C: CO-1573, CO-2713, CO-2714. |
| Striker | C: CO-3500. |
| Voluntary quit | C: CO-2313, CO-2318. |
| Level sanction; sanction | C: CO-2318 with CO-2314, CO-2316 (1/3/6 months); CO-040. |
| Migrant farm worker | C: CO-055, CO-2306, CO-2570. |
| Good cause | C: in each rule (CO-2313 voluntary quit, CO-4264 ABAWD, CO-2562 SSN). |
| Substantial lottery or gambling winnings | C: CO-4151, CO-4152 (≥ CO-119). |
| Questionable; unclear information; outdated | C: the `*_attestation_is_questionable` facts (CO-1307, CO-1314, CO-1331, CO-1338 and the financial ones) and the `snap_*_information_is_outdated` facts (CO-2321 to CO-2331). |
| Verification; verified upon receipt; collateral contact; documentary evidence; documentation; case record; prudent person principle | N/A: means and records of verification. Which factors need verification is section 3.4. |
| Intentional; IPV; fraud; material fact; trafficking | C: CO-039 (an IPV disqualification is supplied). |
| Employment and Training Program; Employment First | C: CO-048, CO-3160 (ABAWD work program); EF is voluntary (4.312), no sanction. |
| PA households | N/A: classification for certification and notices (4.208.2). |
| Allotment; issuance month; supplement; thrifty food plan; minimum benefit; BUA; HCUA; OUA; telephone allowance; E-EBT; excess medical deduction; exempt income; financial criteria; gross income; household income; liquid and non-liquid resources; net income test; prospective budgeting; self-employment; vendor payments; simplified reporting | Fin. |
| ADH; ALJ; administrative adjudicator; adverse action and its period; agency error claim; appeal; bifurcated and combined appeal; claim; clear and convincing evidence; compromise; demand letter; DRC; DCA; evidence; fair hearing; final agency decision; initial decision; IHE claim; IPV hearing and waiver; notice of overpayment; OAC; OOA; over-issuance; preliminary determination; preponderance; recoupment; repayment agreement; restoration; SNAP fair hearings unit; state-level fair hearing; under-issuance | N/A: hearings, claims and restoration. |
| ACSES; CUBS; IEVS; SAVE; G-845; CDHS; FNA; local office; state department; ME reviews; QA; QA active and negative case; quality control review; payment error rate; mass update; LEAP; D-SNAP; temporary emergency; EBT account and card; Quest card; CO/EBTS; NOA; client; certification period; civil union; non-financial criteria | N/A: systems, agencies, issuance, notices and administration (civil union: no SNAP rule reads it; spouses are 4.304.1.B). |

### 3.2 Applications and recertifications, 4.200-4.210 (D-82:1318-2950)

| paragraph | disposition |
|---|---|
| 4.200 | N/A: scope sentence. |
| 4.201.A, C-E, G | N/A: application processing (screening, withdrawal, other programs' denial, racial and ethnic data). |
| 4.201.B (benefits retroactive to the month of application) | C: CO-2305, CO-4269, CO-385. |
| 4.201.F (joint SSI/SNAP applicant in a public institution not eligible until release) | C: CO-1746 meaning (filing date is the release date, P2-1 fixed), CO-2305; N2-P3-2. |
| 4.202.A-C, E, G | N/A: application forms and filing means. |
| 4.202.D (filing date; outside business hours, next business day) | C: CO-1746 (the recorded filing date). |
| 4.202.F (application valid 60 days) | N/A: application processing. |
| 4.202.1.A-C | N/A: joint PA/SNAP processing. |
| 4.202.2 (ineligible individuals in the household; may apply for minors) | C: CO-311, CO-2565 (income counted, Fin 4.411); applying for minors N/A. |
| 4.202.3.A-D, 4.202.31.A-B, 4.202.32.A, 4.202.33.A-F, H | N/A: SSA and out-stationed processing. |
| 4.202.31.C, 4.202.33.G (filed when received at SSA or by the out-stationed worker) | C: CO-1746 (the recorded filing date). |
| 4.202.32.B (expedited standard from release; restored to release date) | C: CO-1746 (release date as filing date). |
| 4.203, 4.203.1.A-B, 4.203.2.A-B, 4.203.21, 4.203.22, 4.203.3 | N/A: who may apply and represent the household; the representative's identity is 4.505.1 (CO-3731). |
| 4.204.A-B, D-E | N/A: interviews (application processing, docs/design-colorado.md). |
| 4.204.C (missed first interview forfeits expedited service unless rescheduled within 7 days) | N/A: interview processing; N2-P3-3. |
| 4.205 intro, 4.205.2.A-B, 4.205.3.A-F, 4.205.32 first paragraph, 4.205.4.B-C | N/A: processing standards, fault findings and denial timing (OQ-309 resolved). |
| 4.205.1.A.1 (destitute migrant, liquid ≤ $100) | C: CO-348, CO-055 (4.406 definition in meaning), CO-121. |
| 4.205.1.A.2 (liquid ≤ $100 and gross < $150) | C: CO-348, CO-120, CO-121, CO-1740. |
| 4.205.1.A.3 (gross + liquid < rent or mortgage and utility standard) | C: CO-348, CO-377. |
| 4.205.1.B.1-2 (seven days; interview within seven days) | N/A: processing; N2-P3-3. |
| 4.205.1.C (after the 15th: combined first and second month; postponed verification before the third month) | C: CO-3036, CO-1393 (thirty days, OQ-323 resolved); issuance timing N/A. |
| 4.205.1.D-E | N/A: processing; suspensions and cancellations are 4.904. |
| 4.205.11.A | N/A: processing. |
| 4.205.11.B.1 (identity before expedited certification) | C: CO-1394 (`postponed_expedited` requires identity), CO-1387. |
| 4.205.11.B.2, B.2.a-b (postpone; terminate on the 30th day) | C: CO-1393, CO-1346 (30), CO-1394. |
| 4.205.11.B.2.c (migrant out-of-state postponement once a season) | C: CO-2570, CO-1393 with CO-3037, CO-3038. |
| 4.205.11.C (no repeat expedited postponement while the last is incomplete) | C: CO-4254 in CO-1394 (C-12 fixed). |
| 4.205.31 second paragraph (verification on days 31-60: prorated from that date) | C: CO-4268, CO-4269, CO-2305, CO-2308, CO-4270, CO-385 (C-13 fixed). |
| 4.205.32 second paragraph (retroactive and prorated when the office caused the delay) | C: CO-4269 (application date when CO-4268 is not stated). |
| 4.205.4.A (household fault in the first 30 days: benefits from the month after application) | C: CO-4268, CO-4270 (C-13 fixed). |
| 4.206.A, C.1.d, C.2.d, C.3.a.3, C.3.c | C: CO-341 (BCE, then ECE, then SE). |
| 4.206.B, D | N/A: other programs' requirements and re-evaluation on a change (CF-12). |
| 4.206.C.1.a.1 (all members receive or are authorized: SSI, CW, OAP, AND, AB; Medicaid-only is not) | C: CO-336 (CO-012, CO-013, CO-073, CO-2710), CO-338. |
| 4.206.C.1.a.2 (a member receives Family Preservation services) | C: CO-338, CO-3716. |
| 4.206.C.1.b.1-6, C.2.b.1-6 (verification relief) | C: CO-1374 (SSN), CO-1375 (residency), CO-1616 (sponsor), and the financial verification items (Fin). |
| 4.206.C.1.c.1-2, C.2.c.1-2 (IPV or SNAP drug felony bars BCE and ECE) | C: CO-337 (CO-039, CO-1731); N2-P2-5. |
| 4.206.C.2.a.1 (gross ≤ 200% FPL) | C: CO-340, CO-339 (OQ-356). |
| 4.206.C.2.a.2 (non-cash TANF/MOE service) | OQ: OQ-12 (assumed always offered). |
| 4.206.C.3.a.1-2 (SE for IPV, fraud conviction or drug felony) | C: CO-337, CO-341; N2-P2-5. |
| 4.206.C.3.b.1-2 (net, gross and resource tests) | Fin (CO-344 override, CF-13). |
| 4.206.C.3.b.3 (non-financial criteria) | C: this matrix, through CO-386. |
| 4.206.E (lottery winnings disqualify the household; first certification after under SE) | C: CO-4151, CO-4152, CO-386, CO-387, CO-4153, CO-341 (N-1 fixed). |
| 4.207.1.A-D | N/A: issuance timing. |
| 4.207.2.A (prorated from the application date; joint SSI/SNAP from release) | C: CO-2308, CO-2305, CO-1746. |
| 4.207.2.B (migrant in the job stream, break ≤ 30 days) | C: CO-2306, CO-2305. |
| 4.207.2.C, 4.207.3.A-D | Fin (proration formula and allotment). |
| 4.208.A-C, 4.208.1.A-B, 4.208.2.A-B | N/A: certification periods and PA classification. |
| 4.209.A-D, 4.209.1.A-B, E | N/A: recertification processing (CF-12). |
| 4.209.1.C (late recertification within 30 days: prorated as an initial month) | C: CO-2305 precision (recorded as an initial application). |
| 4.209.1.D (reopened late recertification: benefits from the date the action was taken) | C: CO-4268 meaning, CO-4269. |
| 4.210.A-E | N/A: periodic report (CF-12). |

### 3.3 Non-financial eligibility criteria, 4.300-4.313 (D-82:2952-5686)

| paragraph | disposition |
|---|---|
| 4.300 intro, A-F | C: the rows below; "prospectively for the issuance month" is the determination month of each item. |
| 4.301 (identity of the applicant; an authorized representative and the head) | C: CO-1370, CO-3731, CO-1387. |
| 4.302.A.1 (SSN or proof of application; no card required; all numbers) | C: CO-1374, CO-1360, CO-1602. |
| 4.302.A.2-3 (failure disqualifies the individual only; ends on providing an SSN or proof) | C: CO-2562, CO-311, CO-2565. |
| 4.302.B.1, B.1.a (newborn: at the next recertification within six months) | C: CO-2562 precision. |
| 4.302.B.1.b | N/A: notice. |
| 4.302.B.2.a-b (proof of application or good cause; household at fault) | C: CO-2562 meaning (without good cause). |
| 4.302.C.1 (good cause) | C: CO-2562 meaning. |
| 4.302.C.2 (sincere religious objection) | C: CO-2562 precision (P2-4 fixed). |
| 4.303.A (live in the county of application) | C: not an eligibility condition, OQ-393 resolved; CO-309 precision. |
| 4.303.B first paragraph (one household a month; battered shelter exception) | C: CO-4178, CO-304; battered shelter, CO-4178 precision. |
| 4.303.B second paragraph (FDPIR) | C: CO-4266, CO-2851, CO-386, CO-387 (C-11 fixed); **N2-1** (allotment). |
| 4.303.C-E (non-vacation residence; no address needed; no durational or intent requirement) | C: CO-4253, CO-4252, CO-309 (C-6 fixed). |
| 4.303.F | N/A: addresses on the form. |
| 4.304.A.1-3, 4.304.A.2.A | C: CO-305 (buys_prepares_with; a separate household when purchase and preparation are separate). |
| 4.304.1 intro, A.1, A.1.A (under 22 with a parent; both parents) | C: CO-305, CO-101 (22). |
| 4.304.1.A.2, A.2.A (child under 18 under another member's parental control; not a foster child) | C: CO-305, CO-018, CO-102, CO-843. |
| 4.304.1.B.1.A-B (spouses; holding out as spouses) | C: CO-305 (spouse and holds_out_as_spouse_with edges). |
| 4.304.1.B.2 (spouse elsewhere contributing) | Fin (contribution as unearned income); composition C: CO-305 (`lives_with`). |
| 4.304.1.C.1, 4.304.3.A.1 (60 and older with a disability, unable to purchase and prepare; others' income over 165%) | C: CO-419, CO-2304, CO-2303, CO-019, CO-114, CO-3043. |
| 4.304.1.C.2, 4.304.3.A.2 (spouse in the 165% test) | C: CO-419 (spouse always set aside); N2-P3-5. |
| 4.304.2.A, B, B.1, B.2-B.4, and the unnumbered "A" (shared custody; majority of meals) | C: CO-4178, CO-4179, CO-304, CO-4180, CO-4181 (V-13 fixed). The request for contact is N/A (procedure). |
| 4.304.3.B.1-2 (foster parent's choice to include a foster child) | C: CO-305 (no foster edge crossed; inclusion stated by buys_prepares_with and not boarder), CO-2567. |
| 4.304.3.B.3 (foster child may not apply separately) | N2-P3-4 (deferred). |
| 4.304.3.C.1-3, 4.304.31.A (boarders; included only at the household's request) | C: CO-2567, CO-304; boarder income CO-4165 (Fin). |
| 4.304.3.C.4-5, C.5.A.1-2, C.5.B (reasonable payment) | C: CO-2567 precision (P2-6 fixed). |
| 4.304.31.B-C (roomers and live-in attendants may be separate households) | C: CO-2566, CO-305. |
| 4.304.32 (separate residence; examples A-C) | C: CO-305 (edges crossed only between persons who live together, `lives_with`); money provided is Fin. |
| 4.304.4.A.1 (IPV) | C: CO-039, CO-311. |
| 4.304.4.A.2 (SSN) | C: CO-2562. |
| 4.304.4.A.3 (ineligible non-citizen) | C: CO-310. |
| 4.304.4.A.4 (work requirements) | C: CO-040, CO-2318. |
| 4.304.4.A.5 (ABAWD) | C: CO-2564. |
| 4.304.4.A.6.a-e (violent and sexual felonies after 2014-02-07, out of compliance) | C: CO-2563. |
| 4.304.4.B, B.1-4 (fleeing felon; four-part test; verification) | C: CO-038, CO-311; **N2-P2-2** (carried open). |
| 4.304.4.C, C.1.a-c (probation or parole violator; impartial party; actively seeking) | C: CO-1732 (P2-3 partly fixed). |
| 4.304.4.D, D.1 (boarding house residents; the proprietor's household) | C: CO-2567 (commercial boarding house); proprietor's household follows its edges. |
| 4.304.4.D.2 (institution: majority of meals; halfway house for persons with a disability) | C: CO-007, CO-3330, CO-3334, CO-304. |
| 4.304.4.D.3 (student meal plan over 50% of meals) | **GAP N2-4**. |
| 4.304.41.A (federally subsidized housing for the elderly) | C: CO-007 (private_dwelling). |
| 4.304.41.B (treatment centre residents and their children) | C: CO-007 arm (B) (C-3 fixed). |
| 4.304.41.C (public or nonprofit group living, blind or disabled) | C: CO-007 arm (C) (C-3 fixed). |
| 4.304.41.D-E (battered women's and homeless shelters) | C: CO-007 (shelters are private_dwelling with nighttime residence type). |
| 4.305 intro, A.1.a-d, A.2 (citizens and nationals) | C: CO-002 (us_citizen, us_national), CO-1358, CO-309. |
| 4.305.B intro, B.1 intro (each category stands alone; under 18 reviewed at 18) | C: CO-3713 precision (273.4(a)(6)(iv)), CO-306. |
| 4.305.B.1.a.1-7 (refugee, trafficking victim, asylee, withholding, Cuban/Haitian entrant, Amerasian, Iraqi/Afghan SIV) | C: statute override, CO-308: under 2015(f) as amended only Cuban/Haitian entrants remain eligible; the others count only as status before LPR (CO-2700 in CO-3713). OQ-1 (effective date for current participants). |
| 4.305.B.1.b.1 (LPR; earlier qualified status carries) | C: CO-308, CO-307, CO-3713. |
| 4.305.B.1.b.2-4 (parolee, conditional entrant, battered non-citizen) | C: statute override, CO-308 (not eligible under 2015(f) as amended); battered status still reaches sponsor deeming (CO-2335). |
| 4.305.B.2.a (American Indians born in Canada, tribal members) | C: CO-3713 (CO-2701), as an LPR exception; as a non-qualified category, statute override CO-308. |
| 4.305.B.2.b.1-4, A (Hmong and Highland Lao) | C: CO-3713 (CO-2702, CO-3715). |
| 4.305.B.3 intro, a (five years in qualified status) | C: CO-307, CO-508, CO-003. |
| 4.305.B.3.b, b.1.a-c, b.2.a (forty quarters, own, parent's, spouse's; divorce) | C: CO-307, CO-004 (precision on divorce, P3-7 fixed), CO-4262. |
| 4.305.B.3.b.2.b (post-1996 quarters with a means-tested benefit) | C: CO-4261, CO-4262 (C-5 fixed). |
| 4.305.B.3.c (under 18) | C: CO-3713, CO-177. |
| 4.305.B.3.d (blind or disabled receiving benefits) | C: CO-3713 (CO-302). |
| 4.305.B.3.e (born on or before 1931-08-22, lawfully residing 1996-08-22) | C: CO-3713, CO-2601, CO-279. |
| 4.305.B.3.f.1-2, f.3.a-e, f.3.e.1 (military connection; dependent child) | C: CO-4260, CO-2866, CO-2867, CO-4257, CO-4258, CO-4259, CO-306 (C-4 fixed). |
| 4.305.1.A-G, I (ineligible non-citizens) | C: CO-308 (no other status is eligible), CO-310. |
| 4.305.1.H (COFA citizens not qualified) | C: statute override, CO-308 (2015(f)(2)(D); 1641(b)(8) as amended, P2-10 fixed). |
| 4.305.2.A, B.1-2 (affidavit on or after 1997-12-19) | C: CO-1573 meaning, CO-2713. |
| 4.305.2.C (only an eligible sponsored non-citizen; sponsor and spouse) | C: CO-3701, CO-3702, CO-3711, CO-2714 (C-14 fixed, OQ-730 resolved on 1631(a)(2)). |
| 4.305.2.D.1 (until citizenship, forty quarters, or the sponsor's death; spouse married after signing) | C: CO-2337 (CO-4262, CO-2336), CO-2714; N2-P3-1. |
| 4.305.2.D.2.a-b (20% earned reduction; gross limit for the sponsor's household size) | C: CO-3711, CO-3703, CO-3710, CO-3705. |
| 4.305.2.D.2.c, H.1-2 (divided among the sponsor's non-citizens; all of it until shown) | C: CO-3708, CO-3706. |
| 4.305.2.D.3 (another program's sponsor income figure) | N/A: source of the figure; same reductions apply. |
| 4.305.2.D.4 (money paid counts only above the deemed amount) | C: CO-3701, CO-3707. |
| 4.305.2.D.5 (change of sponsor; deceased sponsor not deemed) | C: CO-2337 (CO-2336); change processing N/A. |
| 4.305.2.D.6 (resources less $1,500) | C: CO-3702, CO-3704. |
| 4.305.2.E.1-8 (exemptions) | C: CO-2337 with CO-2332 (E.1), CO-2333 (E.2), CO-1573 precision (E.3, E.6), CO-2334 (E.4), CO-2335 with CO-2363, CO-2718, CO-2717, CO-2719, CO-2720 (E.5), CO-2336 (E.7), CO-4262 (E.8); under 18, CO-3709 (statute, N-3 fixed). |
| 4.305.2.F.1-4, 4.505.7.A.1-4 (sponsor verification) | C: CO-1616, CO-1611, CO-1574. |
| 4.305.2.G.1-2, 4.505.7.B-C (ineligible until provided; same sponsor for the whole household) | C: CO-4154, CO-310, CO-3701, CO-3702 (N-2 fixed). |
| 4.305.3.A-E | N/A: reporting to USCIS. |
| 4.306.A, B.1-5 (18 through 49, at least half time in higher education) | C: CO-411, CO-171, CO-172, CO-021 (program type excludes high school and other schools). |
| 4.306.B.6 (on-the-job training) | C: CO-4265, CO-410 (C-10 fixed); N2-P2-4. |
| 4.306.C (enrollment from the first day of the term; continuous through breaks) | C: CO-2881 (the enrollment stated as of the determination). |
| 4.306.1.A (unfit, including vocational rehabilitation; verification) | C: CO-410 (CO-400, CO-044 meaning names vocational rehabilitation, CO-4263); verification CO-1384. |
| 4.306.1.B first two paragraphs (20 hours paid; self-employed earnings) | C: CO-407, CO-402, CO-175, CO-1702. |
| 4.306.1.B third paragraph (80 hours a month) | **N2-2**. |
| 4.306.1.C (work study) | C: CO-407 (CO-070). |
| 4.306.1.D (care of a household member under 6; full-time single parent of a child under 12) | C: CO-408, CO-409, CO-042, CO-173, CO-174. |
| 4.306.1.E (child 6 to 11, no adequate care) | C: CO-408, CO-071. |
| 4.306.1.F (TANF cash grant) | C: CO-410 (CO-013). |
| 4.306.1.G (placement through WIOA, EF, TAA, other E&T, JOBS) | C: CO-410, CO-072; **N2-3**. |
| 4.306.1.H (on-the-job training) | C: CO-4265 (C-10 fixed). |
| 4.307.A (striking member; eligible the day before; exempt the day before unless employment) | C: CO-3504, CO-3500, CO-3501, CO-386. |
| 4.307.B (pre-strike eligibility; the higher income) | C: CO-3501, CO-3502, CO-3503. |
| 4.307.1.A-D (not strikers) | C: CO-3500 meaning. |
| 4.308.A-C, E, 4.310.5.A-C (voluntary quit within 60 days before application or after; 30 hours or FMW × 30; government strike dismissal; comparable new job lost) | C: CO-2313, CO-2318, CO-2320 (60). |
| 4.308.D, F | N/A: participating households and notices. |
| 4.308.G (fair hearing: period from the month after the decision) | C: CO-2315 (start month supplied). |
| 4.308.1.A-N, 4.310.7.A-N (good cause) | C: CO-2313 meaning (found without good cause under 4.308.1). |
| 4.309 intro, 4.309.1 | N/A: where benefits may be spent. |
| 4.309.2 (shelter status; shelters without meals are not institutions) | C: CO-007 (meals test). |
| 4.309.21 intro, A (exempt from the institution rule; parent/child units) | C: CO-007, CO-305. |
| 4.309.21.B (one additional household) | C: CO-4178 precision (P2-5 fixed). |
| 4.309.21.C | N/A: change processing. |
| 4.309.21.D (certified without the former household's income; joint resources inaccessible) | C: CO-305 (separate unit); Fin (joint resources). |
| 4.309.3.A-B (public or nonprofit; for-profit is an institution; OBH approval) | C: CO-007 (B), CO-3331, CO-4255, CO-3335 (C-3 fixed). FNS retailer authorization N/A (facility standing, CO-007 precision). |
| 4.309.3.C (one-person households unless children; voluntary) | C: CO-305 (edges). |
| 4.309.3.D (expedited for residents) | C: CO-348. |
| 4.309.3.E (non-resident participant is a household member) | C: CO-305; CO-045 (work exemption). |
| 4.309.31.A-E, 4.309.41.A-E, 4.309.42 | N/A: facility responsibilities, departures, penalties. |
| 4.309.4.A (person with disabilities; public or nonprofit; ≤ 16; 1616(e) certification; for-profit is an institution) | C: CO-007 (C), CO-4256, CO-3335 (C-3 fixed). |
| 4.309.4.B, B.1-4 (election; one-person households through the facility) | C: CO-305 (edges); N/A otherwise. |
| 4.309.4.C-D | C: CO-348 (expedited); otherwise N/A (processing). |
| 4.310 intro, A-E (register, inform, no voluntary quit, accept suitable work, report to an employer) | C: CO-405, CO-406; refusal of suitable work and failure to register enter as CO-040; voluntary quit CO-2318. |
| 4.310.1, A.1-3 (client statement; verification if questionable) | C: CO-1384, CO-1386; examples are means. |
| 4.310.2 | N/A: informing. |
| 4.310.3.A, A.1 (15 or younger, 60 or older; 16-17 not head or in school half time) | C: CO-405, CO-406, CO-161, CO-162, CO-067. |
| 4.310.3.B (care of a child under 6 or an incapacitated person) | C: CO-401, CO-042. |
| 4.310.3.C, C.1-5 (unfit; examples) | C: CO-400, CO-043, CO-044 (examples in meaning, P2-2 fixed), CO-4263 (C-7 fixed). |
| 4.310.3.D, D.1-3 (student half time; higher education needs student eligibility) | C: CO-405 (CO-020; CO-021 with not CO-411). |
| 4.310.3.E, E.2 (30 hours or FMW × 30; VISTA) | C: CO-404, CO-402, CO-403, CO-163. |
| 4.310.3.E.1 (migrant under contract within 30 days) | N2-P3-6 (deferred). |
| 4.310.3.F (UIB applying, receiving, or appealing a denial) | C: CO-046 (P3-8 half fixed). |
| 4.310.3.G (drug or alcohol treatment) | C: CO-045. |
| 4.310.3.H (complying with CW or CRSP work programs) | C: CO-1935, CO-2830. |
| 4.310.4 (non-ABAWD keeps a lost exemption to recertification) | N/A: accepted, first-pass P3-2 (affects only the informational CO-406). |
| 4.310.5.B.1 (disqualification continues into another household) | C: CO-2318 (person scope). |
| 4.310.6.A-E.7 (suitable employment) | C: CO-040 (a finding of refusal without good cause). |
| 4.310.8.A, A.1-3 (1, 3, 6 months; continues in another household) | C: CO-2318, CO-2314, CO-2316 and following. |
| 4.310.8.B (begins the month after the notice expires) | C: CO-2315 (supplied start month). |
| 4.310.8.C-D (becomes exempt: eligible again) | C: CO-2318 (not served while CO-405), CO-040 precision (C-8 fixed). |
| 4.311 intro (client statement unless questionable) | C: CO-1386. |
| 4.311.A.1-2 (17 or younger, 55 or older) | C: CO-412 (statute override: 18 through 64, OQ-533). |
| 4.311.A.3.A-C (medically certified unfit) | C: CO-400 (CO-4263, CO-044, CO-043), CO-414. |
| 4.311.A.4 (same physical household as a minor) | C: CO-4250 (C-1 fixed; age 14 under the statute); **N2-P2-1**. |
| 4.311.B.1, B.1.a.i-iv (work 80 hours: paid, in kind, verified unpaid) | C: CO-415, CO-022, CO-1915, CO-1916, CO-168. |
| 4.311.B.2, B.2.a.i-iii (work program) | C: CO-415, CO-048, CO-3160. |
| 4.311.B.3 (combination) | C: CO-415 (sum). |
| 4.311.B.4 (Workfare) | C: CO-415, CO-068. |
| 4.311.B last sentence; 4.311.3 intro (three countable months in 36) | C: CO-418, CO-417, CO-169, CO-170. |
| 4.311.1.A (exempt from general work requirements) | C: CO-414 (CO-405). |
| 4.311.1.B (pregnancy) | C: CO-414 (CO-009). |
| 4.311.1.C-E (homeless, veterans, former foster youth) | C: statute override, CO-414 precision (2015(o)(3) as amended struck them; OQ-32 resolved, OQ-533). |
| 4.311.1.F (FNS waiver) | C: CO-416 (CO-052). |
| 4.311.1.G (Colorado discretionary exemptions) | C: CO-416 (CO-053). |
| 4.311.2 (months not exempt count; no over-issuance) | C: CO-416 per month; claims N/A. |
| 4.311.3.A.1-2 (countable month; not the month of the 18th birthday) | C: CO-416, CO-051. |
| 4.311.3.B (good cause for missed hours) | C: CO-4264, CO-415 (C-9 fixed). |
| 4.311.3.C.1-2 (fixed clock from July 2023, every 36 months) | C: CO-417, CO-1515. |
| 4.311.3.D.1.a-d, D.2 (regaining) | C: CO-2309, CO-418. |
| 4.311.3.D.3 (three additional months once a period) | C: CO-2312, CO-2310, CO-2311. |
| 4.312, 4.312.1, 4.313, 4.313.1 | N/A: E&T and Workfare administration (EF is voluntary, no sanction). |

### 3.4 Verification, 4.500-4.505 (D-82:8740-9822)

| paragraph | disposition |
|---|---|
| 4.500.A-D | N/A: definitions and records. |
| 4.500.E (refusal to cooperate in a later review) | C: CO-4267, CO-386, CO-387 (P2-8 fixed); **N2-1** (allotment). |
| 4.501, 4.503, 4.504 intro, 4.504.1-4.504.4 | N/A: means and records of verification. |
| 4.502.A.1 (expedited: identity of the head, and of a representative; postpone the rest) | C: CO-1394, CO-1387, CO-3731, CO-1393, CO-4254. |
| 4.502.A.2.a (identity of the head) | C: CO-1370. |
| 4.502.A.2.b (gross nonexempt income) | Fin (CO-1376, CO-1377). |
| 4.502.A.2.c (IEVS information, SSNs) | C: CO-1374, CO-1360 (furnished number satisfies; 273.2(f)(1)(v) no delay); IEVS income is Fin. |
| 4.502.A.2.d (non-citizen status) | C: CO-1373, CO-1601, CO-3736, CO-3738. |
| 4.502.A.2.e (residency, except homeless or newly arrived) | C: CO-1375, CO-037, CO-1586. |
| 4.502.A.3, A.5, B.2-3, B.5-6, C.1-2 | Fin (expenses, income, resources). |
| 4.502.A.4 (categorical relief; each member's receipt verified) | C: CO-1374, CO-1375, CO-1616 (BCE); receipt facts from the conferring program's record (P2-7 recorded). |
| 4.502.B.1 (recertification: only if questionable or outdated) | C: the `snap_*_information_is_outdated` arms in CO-1370, CO-1373, CO-1375, CO-1384. |
| 4.502.B.4 (SSN not verified before) | C: CO-1374 meaning. |
| 4.504.5.A-H, 4.504.6.A-D.12, 4.504.61.A-B | N/A: data sources and what is verified on receipt (the facts are stated as verified); acting on them during a certification is CF-12. |
| 4.505.A | N/A: as 4.504.61. |
| 4.505.1.A-C (identity) | C: CO-1370, CO-3731, CO-1387, CO-1300, CO-1301. |
| 4.505.2.A (SSN through SSA; no delay; BCE accepted) | C: CO-1374, CO-1360, CO-1602. |
| 4.505.2.B.1-4 (discrepant SSN; disqualification on non-cooperation) | C: CO-2562 (the resulting finding). |
| 4.505.3.A, "A" (second), C (residency; homeless, migrant, newly arrived; county not verifiable) | C: CO-1375, CO-1586, CO-1603. |
| 4.505.4.A (composition only if questionable) | C: CO-1383, CO-1331, CO-1607. |
| 4.505.4.B (separate elderly and disabled household: if questionable) | C: CO-1383. |
| 4.505.4.C (child already receiving SNAP elsewhere) | C: CO-4180, CO-4181. |
| 4.505.5.A.1-7, B (citizenship if questionable; third-party statement) | C: CO-1371, CO-1600, CO-1372, CO-1305, CO-1304. |
| 4.505.51.A-B, D | N/A: guidelines and records. |
| 4.505.51.C (ineligible until proof; income prorated) | C: CO-4251, CO-311, CO-2565, CO-2571, CO-1394 (C-2 fixed). |
| 4.505.6.A-D, G-H | N/A: SAVE procedure. |
| 4.505.6.B last sentence, J (member unwilling: participate without that member) | C in part: CO-4154 after the due date; **N2-P2-3**. |
| 4.505.6.E (30th day or 10 days from the request) | C: CO-1617. |
| 4.505.6.F, F.1-2 (not certified until documentation; submitted document or SSA review: up to six months) | C: CO-4154, CO-1601, CO-1366, CO-3734, CO-3735; the six-month cap is P3-3 accepted. |
| 4.505.6.I (remaining members determined; no retroactive benefits) | C: CO-4154, CO-310, CO-1394 `members_excluded`. |
| 4.505.61 intro, A-C.11 (40 quarters: verification; means-tested quarters removed; exclusions) | C: CO-3736, CO-3733, CO-4261 (meaning lists C and B), CO-4262 (C-5 fixed). |
| 4.505.7.A-C | C: as 4.305.2.F-G above. |
| 4.505.8, A-E (national disqualification database) | N/A: the match does not delay processing; a disqualification found is stated as CO-039 (out-of-state drug felony not acted on: CO-041 meaning is Colorado's 4.803.3.D). |
| 4.506-4.507 | Fin. |

### 3.5 Disqualification periods and other 4.6xx-4.8xx paragraphs in scope

| paragraph | disposition |
|---|---|
| 4.803.A-E, 4.803.1, 4.803.2, 4.803.4 and following | N/A: IPV investigation and hearings; the result is CO-039. |
| 4.803.3.A (IPV: 12, 24 months, permanent) | C: CO-039 (supplied as serving). |
| 4.803.3.B (duplicate benefits: 10 years) | C: CO-039 (a 273.16 disqualification). |
| 4.803.3.C.1-2 (trafficking) | C: CO-039. |
| 4.803.3.D (drug convictions only with misuse of SNAP) | C: CO-041 (F-15 fixed), CO-1731 (BCE bar). |
| 4.803.3.E (firearms) | C: CO-039. |
| 4.803.44, A-C (pending ADH does not affect eligibility) | C: CO-039 is false until the waiver or finding (meaning: "serving"). |
| 4.609.1-4.609.6 (transitional SNAP) | N/A: continuation of an existing certification after a CW closure; case maintenance between determinations (CF-12, docs/colorado-notes.md). |

### 3.6 Federal texts the codex follows

| text | disposition |
|---|---|
| 7 U.S.C. 2015(a), (g), (i), (l)-(n), (p), (q) (D-3) | N/A: State options Colorado does not take (comparable disqualification, child support cooperation), SSI cash-out States, and disqualifications that enter as IPV (CO-039). |
| 2015(b)(1)-(4) | C: CO-039. |
| 2015(c) | C: CO-4267, CO-386 (P2-8 fixed); **N2-1**. |
| 2015(d)(1)(A)-(B) | C: CO-405, CO-040, CO-2318; (B) household option not taken (4.310.8.A is individual). |
| 2015(d)(1)(C) durations | C: CO-2318 (Colorado's 1/3/6 months, 4.310.8). |
| 2015(d)(2) exemptions | C: CO-405. |
| 2015(d)(4) E&T | N/A: EF voluntary. |
| 2015(e)(1)-(8) | C: CO-410, CO-411, CO-407, CO-408, CO-409; **N2-3** ((e)(3)(B)). |
| 2015(f) as amended by sec. 10108 (D-5) | C: CO-308, CO-309, CO-4253, CO-310 (OQ-1). |
| 2015(h) | Fin (CO-4160). |
| 2015(j) | C: CO-039 (10-year duplicate participation). |
| 2015(k) | C: CO-038, CO-1732; N2-P2-2. |
| 2015(o)(1)-(2) | C: CO-415, CO-416, CO-418. |
| 2015(o)(3)(A)-(G) as amended by sec. 10102 | C: CO-412, CO-166, CO-400, CO-413, CO-4250, CO-167, CO-414, CO-009, CO-050 (OQ-533). |
| 2015(o)(4)-(6) | C: CO-052, CO-053, CO-2309, CO-2312. |
| 2015(r)(1)-(2) | C: CO-2563, CO-311, CO-2565. (r)(3) attestation N/A (application form). |
| 2015(s) | C: CO-4151, CO-4152, CO-4153, CO-341. |
| 7 U.S.C. 2014(i)(1)-(2) (D-2) | C: CO-2337, CO-3701, CO-3702, CO-3711, CO-3709 (N-3, C-14 fixed). |
| 8 U.S.C. 1612(a)(2)(A)-(L) (D-24) | C: CO-3713 ((A), (F)(ii), (G), (K) and the elderly), CO-307 ((B), (L)), CO-4260 ((C)), CO-4262 ((B)(ii)). |
| 8 U.S.C. 1631(a), (b), (d)(3), (e), (f) (D-275) | C: CO-3711, CO-3702 (C-14), CO-2337, CO-3709, CO-2334, CO-2335. |
| 7 CFR 271.2 (D-6): elderly or disabled member; homeless individual; drug and alcohol treatment program; group living arrangement; institution of higher education | C: CO-301, CO-302, CO-303; CO-037; CO-007; CO-021. |
| 273.1(a)(1)-(3), (b)(1)(i)-(iii) (D-7) | C: CO-305, CO-101, CO-018. |
| 273.1(b)(2) | C: CO-419, CO-2304 (N2-P3-5). |
| 273.1(b)(3)-(6) | C: CO-2567, CO-2566, CO-305 (foster: no edge). |
| 273.1(b)(7)(i)-(xii) | C: CO-310, CO-411, CO-040, CO-2562, CO-039, CO-007, CO-041, CO-038, CO-1732, CO-2564, CO-2563; (ii) cash-out, (viii) and (x) State options not taken: N/A. |
| 273.1(c)-(d) | N/A: unregulated situations; head of household designation (CO-067 is stated). |
| 273.1(e)(1)-(2) | C: CO-3504, CO-3501, CO-3503. |
| 273.2(c)(1) filing date (D-8) | C: CO-1746. |
| 273.2(f)(1)(i)-(vii), (f)(2) | C: the verification items of section 3.4 (CO-1360 for (f)(1)(v)); (f)(2)(ii) C: CO-4251. |
| 273.2(h)(2)(ii) | C: CO-4268, CO-4270. |
| 273.2(i)(1)-(4) | C: CO-348, CO-1393, CO-1394, CO-4254. |
| 273.4(a)(6)(ii)(A)-(I), (iv) (D-9) | C: CO-3713, CO-307, CO-4260. |
| 273.4(b)(2) | **N2-P2-3**. |
| 273.4(c)(1)-(5) | C: as 4.305.2 above; (c)(2) spouse by statute override (C-14), (c)(3)(vi) by statute override (N-3). |
| 273.5(a), (b)(1)-(11) (D-10) | C: CO-411, CO-410; **N2-2** ((b)(5) monthly reading), **N2-3** ((b)(11)(ii)). |
| 273.7(a)-(b) (D-11) | C: CO-405, CO-406. |
| 273.7(f), (j)(1)-(4) | C: CO-040, CO-2313, CO-2318 (C-8 fixed). |
| 273.7(c)-(e), (g)-(i), (k)-(n) | N/A: E&T program administration. |
| 273.24(a)-(e), (k)-(l) (D-202) | C: CO-415, CO-416, CO-417, CO-418, CO-414, CO-400, CO-4250, CO-4264, CO-2309, CO-2312, CO-1386. |
| 273.24(f)-(j) | C: CO-052, CO-053; FNS administration otherwise N/A. |
| Proposed 273.24 (D-131, 91 FR 72439) | N/A: a proposal; cited only as corroboration (CO-166, CO-414). |

### 3.7 Chapters out of this family's scope

| chapter | disposition |
|---|---|
| 4.100-4.160 | N/A: introduction, use of benefits, confidentiality, voter registration, complaints. |
| 4.400-4.411 | Fin. |
| 4.601-4.608, 4.610 | N/A: changes during a certification, notices, reinstatement (CF-12). |
| 4.700-4.708 | N/A: issuance and EBT accountability. |
| 4.800-4.802 | N/A: claims and appeals. |
| 4.900 and later | N/A: county administration, D-SNAP, quality control. |

Matrix size: 327 rows.
- 43 definition rows covering every term of 4.000.1 (about 160 terms).
- 237 rows over D-82 4.2xx-4.5xx, 4.609 and 4.803.
- 41 rows over the federal texts.
- 6 out-of-scope chapter rows.

Dispositions: 4 P1 (N2-1 to N2-4), 5 P2 and 6 P3 attached to rows; every other row is carried, open-questioned, financial or not applicable with a reason.

## 4. Open-question confirmations (this family)

| OQ | class in the volume | confirmation |
|---|---|---|
| OQ-1 | blocked on a named document | **Correct.** The FNS memorandum on applying sec. 10108 to current participants is on www.usda.gov, not an allowed host; D-5 has no effective-date clause. The 1611(a) and 1641(b)(8) reading (P2-10) is recorded. |
| OQ-12 | state policy choice | **Correct.** 4.206.C.2.a.2 leaves the non-cash TANF/MOE service to the State's own application language. |
| OQ-356 | state policy choice | **Correct.** Both readings are Colorado's own text; the ECE limit is the State's program limit. |
| OQ-533 | blocked on a named document | **Correct.** FNS's implementation memoranda (www.usda.gov) and CDHS's agency letter (cdhs.colorado.gov) are not on allowed hosts. |
| OQ-550 | blocked on a named document | **Correct.** The SAVE status list is on www.uscis.gov, not an allowed host. |
| OQ-612 | state policy choice | **Correct.** 273.1 and D-82 4.304.32 set no limit on a temporary absence. |
| OQ-640 | state policy choice | **Correct.** 4.000.1 and 4.206.C disagree; both are Colorado's own text. |
| OQ-323, OQ-371, OQ-393, OQ-730 | resolved | Resolutions hold against D-82 and the federal texts. OQ-730's resolution on 1631(a)(2) is applied in CO-3711 and CO-3702. |
| (new) | — | N2-P2-1 asks for a legal-question open question on 4.311.A.4 against 2015(o)(3)(C). |

## 5. First-pass P1s (C-1 to C-14): confirmation

Each fix was read in the derivation at HEAD, and the five fix households were re-evaluated with `eval-case.ts`.

| id | result | evidence |
|---|---|---|
| C-1 | fixed | CO-4250 is an arm of CO-414. CO-150: p1 `not_subject`, `eligible_member`, allotment 550. See N2-P2-1 for the reading. |
| C-2 | fixed | CO-4251 in CO-311, CO-2571, CO-1394. CO-152: p4 `ineligible_member_citizenship_verification`, allotment 90, `members_excluded`. |
| C-3 | fixed | CO-007 arms (B) and (C) read CO-3331, CO-4255, CO-3332 with CO-4256, CO-3335. CO-153: p1 `snap_resides_in_institution_providing_meals` true, `not_in_household`. |
| C-4 | fixed | CO-4260 read by CO-306 and CO-3738 (CO-005 is no longer read by SNAP). CO-154: p3 `snap_has_military_connection` false, `ineligible_member_non_citizen`, allotment 336. |
| C-5 | fixed | CO-4262 read by CO-307, CO-3736, CO-2337. N2-P3-1: CO-2337's precision is stale. |
| C-6 | fixed | CO-4253 read by CO-309. CO-151: `snap_meets_residency_requirement` true, allotment 151. |
| C-7 | fixed | CO-4263 is an arm of CO-400. |
| C-8 | fixed | CO-2318 is not served while CO-405 is true; CO-040's precision. |
| C-9 | fixed | CO-4264 adds to CO-415's hours. |
| C-10 | fixed | CO-4265 is an arm of CO-410; N2-P2-4 asks for the internship exclusion. |
| C-11 | fixed in CO-386 and CO-387 | **Regression N2-1**: the allotment items were not given the arm (ZZ-F1). |
| C-12 | fixed | CO-4254 closes CO-1394's `postponed_expedited` row. |
| C-13 | fixed | CO-4268, CO-4269, CO-4270; CO-385's first arm; CO-2308-T6. |
| C-14 | fixed | CO-3711 and CO-3702 add CO-2714's income and resources; OQ-730 resolved. |

Earlier family P1s, spot-checked in the derivations: N-1 (CO-341's lottery arm, CO-4152), N-2 (CO-4154, CO-310), N-3 (CO-2337's age ≥ 18 arm), V-13 (CO-304, CO-4178 to CO-4181), F-3 (CO-3713), F-5 (CO-407, CO-409), F-7 (CO-302), F-9 (CO-3731), F-12 (CO-415 with CO-1915, CO-1916), F-13 (CO-050 in CO-414): all hold.

First-pass P2 and P3 dispositions: P2-1, P2-2, P2-4, P2-5, P2-6, P2-8, P2-9 and P2-10 hold; P2-7 recorded; P2-3 half open (N2-P2-2); P2-8's new bar has the allotment regression (N2-1); P3-5, P3-6 and P3-8's second half remain deferred (N2-P3-4 to N2-P3-6).
