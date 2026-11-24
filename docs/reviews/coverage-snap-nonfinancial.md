# Coverage review: SNAP non-financial eligibility (family coverage-snap-nonfinancial)

Reviewer: independent coverage reviewer, exhaustive pass (not sampled). Read-only review of HEAD `5fc915b` on branch `ccr-9d19bf4c-wmnwcl`. This file is the only file written in the repository.

Method:
- Governing text read in full from `volumes/co/documents/`: D-82 (10 CCR 2506-1, rule version 12718, effective 2026-10-01) lines 30-872 (4.000.1), 1318-2952 (4.200-4.210), 2952-5687 (4.300-4.313) and 8740-10038 (4.500-4.507); and, where the codex follows federal text, D-2 (7 U.S.C. 2014(i)), D-3 (7 U.S.C. 2015), D-5 (Pub. L. 119-21 sec. 10108), D-6 (7 CFR 271.2), D-7 (273.1), D-8/D-95 (273.2), D-9 (273.4), D-10 (273.5), D-11 (273.7), D-202 (273.24, current eCFR), D-131 (proposed 273.24, 91 FR 72439), D-24 (8 U.S.C. 1612), D-275 (8 U.S.C. 1631).
- Ledger from `npm run export -- --volume co` in a scratch copy (`git archive HEAD`, node_modules symlinked): 1,887 items; 495 SNAP-related items were listed and every item named below was read (meaning, precision, derivation, sources, overrides).
- Suspected wrong answers were run with `npx vite-node scripts/eval-case.ts co <case> ...` on scratch households appended to the scratch copy's `volumes/co/tests/cases.yaml` (never to the repository). The seven scratch households are saved, with their full facts, at `/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/coverage-nonfinancial-zz-cases.yaml`.
- Scope: this family covers definitions, application processing as it bears on eligibility dates and expedited service, household composition, categorical eligibility, citizenship and non-citizens, sponsor deeming, students, strikers, work requirements, voluntary quit, ABAWD, disqualifications, and the non-financial verification sections. Income, resources, deductions and the allotment (4.207.3, 4.400-4.411, 4.506-4.507) belong to the financial family's review and are mapped here only where a 4.2xx or 4.5xx paragraph points to them.

## 1. Verdict

**14 P1 found.** The SNAP non-financial chapter is not complete under the stopping rule.

- 13 P1 are rules in the current text that have no item, or items whose test is narrower or broader than the text. Five are reproduced on a scratch household (C-1, C-2, C-3, C-4, C-6). The others are shown from the derivation, or from the absence of any fact that could state the circumstance.
- 1 P1 is a misclassified open question (C-14, OQ-730), which is a stopping-rule failure.
- 10 P2 and 9 P3.
- The earlier SNAP P1s in this family stay fixed (section 5): N-1, N-2, N-3, V-13, F-3, F-5, F-7, F-9, F-12, F-13.

## 2. Findings

Severity:
- **P1**: wrong answer, missing pathway or verification requirement, or a misclassified open question.
- **P2**: a meaning or scope gap a worker could trip on, or an approval risk.
- **P3**: note.

### P1

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| C-1 | P1 | 4.311.A.4 (D-82:5439); 7 CFR 273.24(c)(4) (D-202:95); proposed 273.24(c)(4) (D-131:2424) | CO-413, CO-414 | 4.311.A.4: "Residing in the same physical household with an individual who is under the age of eighteen (18). The minor individual does not have to be included in the same SNAP household for this exclusion to apply." 273.24(c)(4): "Is residing in a household where a household member is under age 18, even if the household member who is under 18 is not himself eligible"; FNS's proposed (c)(4) keeps it at "under age 14". | CO-413 exempts only a person who is the child's parent or caretaker (`in_group [P] snap_persons_cared_for`). The regulation has two separate exceptions: (c)(3) for the parent and (c)(4) for anyone residing in a household with a member under the age. Colorado's rule states the second one, so the codex has no item for it. Scratch **ZZ-A1** is CO-87 plus a 10-year-old child of p2. p1, the 58-year-old brother, lives in the same SNAP household and does not care for the child. Results for p1: `snap_has_responsibility_for_abawd_dependent_child` false; `snap_abawd_time_limit_status` `limit_reached`; `snap_person_participation_status` `ineligible_member_abawd_time_limit`. Under 273.24(c)(4) and 4.311.A.4, p1 is excepted. | Add an arm to CO-414: any member of `snap_household_members` is under `snap_abawd_dependent_child_age` (14). Keep CO-413 as the (c)(3) parent arm. Colorado's wording, "physical household … does not have to be included in the same SNAP household", is broader than (c)(4). Record it as a state-choice open question, or read `lives_with`. Cite D-202 and D-131. Add a CO-414 test, and a case variant of CO-87. |
| C-2 | P1 | 4.505.51.C (D-82:9493); 7 CFR 273.2(f)(2)(ii) (D-8:211) | CO-1371, CO-1600, CO-310, CO-311 | 4.505.51.C: "The member whose citizenship is in question shall be ineligible to participate until proof of citizenship is obtained … shall have his or her income, less a prorated share, and all of his or her resources considered available to any remaining household members." 273.2(f)(2)(ii): "is ineligible to participate until the issue is resolved." | Questionable, unverified citizenship only raises a pending count (CO-1600, read only by CO-1389). No eligibility item applies it. This is the same defect class as N-2, which was fixed for non-citizens (CO-4154) but not for claimed citizens. Scratch **ZZ-A2b** is CO-02 with p4's citizenship questionable and unverified. Results for p4: `snap_citizenship_verification_is_pending` true; `snap_verification_status` `past_due`; `snap_person_participation_status` `eligible_member`; eligible size 3; `snap_allotment` 336, the same as CO-02. p4 should be out of the eligible size, with p4's income prorated. | Add `snap_is_ineligible_pending_citizenship_verification`: `snap_citizenship_verification_is_pending` (at the determination month) and no third-party statement accepted. Make it an arm of CO-311, counted pro rata like CO-310 (4.411.1). Add a participation reason and a case variant. |
| C-3 | P1 | 4.309.3.A-B (D-82:4734-4760), 4.309.4.A (D-82:4870-4884), 4.304.41.B-C; 7 CFR 271.2 "Drug addiction or alcoholic treatment and rehabilitation program" and "Group living arrangement" (D-6:49, 139); 273.1(b)(7)(vi)-(vii) (D-7:55-61) | CO-007, CO-3330 | 4.309.4.A: the facility must be "a public or private nonprofit facility with no more than sixteen (16) residents and is certified as a group living arrangement … under Section 1616(e) … Individuals residing in a for-profit facility are considered residents of an institution". 4.309.3.A-B: "Individuals residing in a for-profit facility are considered residents of an institution"; the center "shall be approved by … OBH". 271.2: a treatment program is one "conducted by a private, nonprofit organization or institution, or a publicly operated community mental health center". | CO-007 treats every `substance_use_treatment_facility` as outside the institution rule. It also treats every `group_home`, `host_home` and `assisted_living_residence` as outside it for a disabled resident, whatever the ownership, size or certification. Scratch **ZZ-A3** is CO-02 with the grandmother in a for-profit, 60-bed assisted living residence that provides all her meals; she has a total VA disability rating. Results: `snap_resides_in_institution_providing_meals` false; `snap_is_household_member` true; `snap_household_members` [p1]. She is an institution resident and ineligible. | Read the setting facts that already exist: `residence_setting_operated_by_government`, `residence_setting_bed_count` (≤ 16) and `residence_setting_is_licensed_or_certified`. Add one neutral fact, `residence_setting_is_nonprofit`. Require: public or nonprofit for the treatment exception (B); public or nonprofit, ≤ 16 residents and certified for the group-living exception (C). Cite D-6 and D-82. |
| C-4 | P1 | 4.305.B.3.f.3.d-e (D-82:3998-4010); 7 CFR 273.4(a)(6)(ii)(G)(3) (D-9:92); 8 U.S.C. 1612(a)(2)(C)(iii) (D-24:63) | CO-005 (shared; read by CO-306, CO-3738, CO-1172, CO-1725) | 273.4(a)(6)(ii)(G)(3): "An unmarried dependent child for purposes of this paragraph … is: a child who is under the age of 18 or, if a full-time student, under the age of 22; such unmarried dependent child of a deceased veteran provided such child was dependent upon the veteran at the time of the veteran's death; or an unmarried disabled child age 18 or older if the child was disabled and dependent on the veteran prior to the child's 18th birthday." | CO-005 confers a military connection on any unmarried child of a veteran or service member, with no age, student, dependency or disability test. Its precision states this reading ("read as an unmarried child of the veteran"). Scratch **ZZ-A4b** is CO-02 with p3, 41 and unmarried, a permanent resident since 2024-01-01 with 0 quarters; p3's mother p2 is an honorably discharged veteran; status and military connection are verified. Results for p3: `has_military_connection` true; `snap_is_eligible_non_citizen` true; `eligible_member`; size 4; `snap_allotment` 342, against 336 in CO-02. p3 is not a dependent child and is still inside the five-year bar. | In the child arm, require: under 18; or under 22 and a full-time student; or a disabled child dependent on the parent before 18; or dependent at the veteran's death. Read `date_of_birth`, `education_enrollment_intensity` and the disability items. This shared item also feeds Medicaid's 1612(b) test, so notify that owner. |
| C-5 | P1 | 4.305.B.3.b.2.b (D-82:3932); 4.505.61.A-C (D-82:9653-9735); 8 U.S.C. 1612(a)(2)(B)(ii) | CO-004, CO-307, CO-3736 | 4.505.61.A: "No such qualifying quarter of coverage … for any period beginning after December 31, 1996, may be credited to a non-citizen if the non-citizen, parent of the non-citizen, or spouse of such non-citizen received any federal means-tested public benefit during the period". B: "The local office must … identify those quarters … and then remove those quarters". C lists 11 benefits that do not count. | CO-307's assumption says the exclusion "is treated as already reflected in the supplied count". But CO-004's meaning defines the count as "the credited total from SSA's record". SSA's quarters record does not remove the quarters in which a federal means-tested benefit was received; 4.505.61.B gives that step to the local office. A worker who states CO-004 as its meaning says therefore counts those quarters. Example: an LPR in year 3 of status has 40 SSA quarters, 6 of them in years the family received SNAP or Medicaid. The codex finds the person eligible; the rule allows 34 quarters, which makes the person ineligible. | Define CO-004 as the quarters creditable after 4.505.61.A-C: net of post-1996 quarters with a federal means-tested benefit, except the C list and the 40th-quarter rule of B. Or add `qualifying_quarters_with_means_tested_benefit` and subtract it in CO-307. Either way, align CO-307's assumption with CO-004's meaning. |
| C-6 | P1 | 4.303.C, E (D-82:3117-3131), 4.303.D; 7 CFR 273.3(a) | CO-309, CO-505, CO-006 | 4.303.C: "Applicants who maintain a residence in the county or district for any purpose other than a vacation, regardless of the length of time … shall be considered eligible". E: "Intent to permanently remain in the state shall not be a condition of eligibility." D: "Migrant campsites satisfy the residency requirement". | CO-309 reads `is_colorado_resident` (CO-505). That item reads `state_of_residence` (CO-006), whose meaning is "the U.S. state in which the person lives **and intends to remain**". SNAP's rule forbids that condition. Scratch **ZZ-A5** is CO-87's brothers as seasonal farm workers in a Colorado migrant camp who intend to return to Texas, so CO-006 is TX. Results: `snap_meets_citizenship_requirement` false; participation `ineligible_member_non_citizen`, a wrong label for U.S. citizens; `snap_eligibility_status` `no_eligible_members`; `snap_allotment` 0, against 151 in CO-87. | Give SNAP its own residency test: the person lives in Colorado for a purpose other than vacation. Add a neutral fact, `lives_in_state_other_than_vacation`, or a `state_of_physical_residence` beside CO-006. Read it in CO-309 in place of CO-505. Give a failed residency test its own participation reason. |
| C-7 | P1 | 4.311.A.3.A (D-82:5421); 4.310.3.C.3.b (D-82:5152); 7 CFR 273.24(c)(2)(i) (D-202:87) | CO-400, CO-414, CO-405, CO-410 | 273.24(c)(2): "An individual is medically certified as physically or mentally unfit for employment if he or she: (i) Is receiving temporary or permanent disability benefits issued by governmental or private sources". Colorado states the same at 4.311.A.3.A and 4.310.3.C.3.b. | CO-400's arms are a medical statement (CO-043), an "obviously unfit" finding (CO-044), and `snap_is_disabled_member` (CO-302, the 271.2 list of permanent public disability benefits). Temporary disability benefits, such as workers' compensation temporary disability, and private disability insurance have no fact and no arm. Example: CO-87 with p1's $600 a month being a private long-term disability benefit. The codex still gives `limit_reached`; the rule makes p1 medically certified and so excepted. The same gap reaches the general work exemption and the student exemption (4.306.1.A). | Add a neutral fact, `receives_temporary_or_permanent_disability_benefits` (government or private), and an arm in CO-400. Cite D-202 and D-82. |
| C-8 | P1 | 4.310.8.C-D (D-82:5389-5398); 7 CFR 273.7(j)(4) (D-11:583) | CO-2318, CO-311 | 4.310.8.D: "If the level sanction disqualified individual is in a SNAP household with other eligible members and then becomes exempt, the newly exempt individual will be eligible based on the date exemption information was provided". 273.7(j)(4): "Eligibility may be reestablished during a disqualification … if the individual becomes exempt from Program work requirements under paragraph (b)(1)". | CO-2318 runs the 1/3/6-month period from the supplied start month and nothing ends it early. A member who becomes exempt mid-sanction stays a disqualified member through the period. The trigger can be caring for a child under 6, becoming unfit, turning 60, or enrolling half time. For example, CO-2318-T4's December month stays `true` even if the member had a baby in November. | End the disqualification from the month the member is not a work registrant: add `[not, …exempt…]`, reading CO-405 plus the age band of CO-406, or a supplied `snap_exemption_reported_date` for the "date exemption information was provided". Add a test. |
| C-9 | P1 | 4.311.3.B (D-82:5549-5558); 7 CFR 273.24(a)(2) (D-202:63) | CO-415, CO-416 | 4.311.3.B: "If an ABAWD would have worked an average of twenty (20) hours per week but missed some work for good cause, the ABAWD shall be considered to have met the work requirement if the absence from work is temporary and the individual retains work." | No fact or arm. CO-415 counts only hours actually worked, so an ABAWD who works 20 hours a week but misses a week for illness (60 hours in the month) accrues a countable month. From the fourth such month the member is wrongly ineligible. | Add a supplied person-month fact, `abawd_hours_missed_for_good_cause` or a yes/no `abawd_missed_work_requirement_for_good_cause`. Add it to CO-415's sum (or as an arm), and to the regaining test. |
| C-10 | P1 | 4.306.1.H (D-82:4478), 4.306.B.6; 7 CFR 273.5(b)(7) (D-10:29) | CO-410, CO-411 | 4.306.1.H: "The student is participating in an on-the-job training program. A person is participating in an on-the-job training program only during the period the person is being trained by an employer." 4.306.B.6: persons in on-the-job training "are not considered under student eligibility criteria". | CO-410 has no on-the-job-training arm, and no fact states the training. Example: a half-time college student, 18-49, in an employer's on-the-job training for 12 hours a week. The student is not exempt on 20 hours, care or work study, so the codex makes the student ineligible. The rule exempts the student. | Add `participates_in_on_the_job_training` (person-month; training by an employer) and an arm in CO-410. |
| C-11 | P1 | 4.303.B, second paragraph (D-82:3113-3116) | (none); CO-2851 `receives_fdpir` is read only by SUN Bucks | "Households on Indian reservations participating in the Commodity Food Distribution Program for a particular period shall not be allowed to participate in SNAP during the same period. Participation shall be limited to participation in the Commodity Food Distribution Program or SNAP." | No SNAP item reads FDPIR participation. A household enrolled in FDPIR for the month, as on the Southern Ute and Ute Mountain Ute reservations, is computed eligible for SNAP in the same month. | Add `[not, [exists, snap_household_members, receives_fdpir]]` (for the month) to `snap_is_eligible` (CO-386), with a `snap_eligibility_status` reason. Make CO-2851 person-month, or state its month. |
| C-12 | P1 (verification) | 4.205.11.C (D-82:2157); 7 CFR 273.2(i)(4)(iv) (D-8:385) | CO-348, CO-1393, CO-1394 | "There is no limit to the number of times a household can be certified under expedited procedures, as long as prior to each expedited certification, the household either completes the verification requirements that were postponed at the last expedited certification or the household was certified under normal processing standards since the last expedited certification." | Nothing records the earlier expedited certification. A household that never completed the verification postponed last time is still `snap_is_entitled_to_expedited_service`, and `snap_verification_status` reports `postponed_expedited`. The rule requires full verification before this certification, so this is a verification requirement left unmodeled. | Add a case fact, `snap_prior_expedited_postponed_verification_incomplete` (true when the last expedited certification's postponed verification was not completed and no normal certification has occurred since). Gate CO-348's postponement, or CO-1394's `postponed_expedited` row, on it being false. |
| C-13 | P1 | 4.205.31 second paragraph (D-82:2249-2252); 4.205.4.A (D-82:2280-2286); 4.209.1.D; 7 CFR 273.2(h)(2)(ii) (D-8:327) | CO-2305, CO-2308, CO-385 | 4.205.31: "If the household provides requested verification after the thirtieth (30th) day and on or before the sixtieth (60th) day … benefits will be prorated from the date the requested verification is provided." 273.2(h)(2)(ii): "If the household was at fault for the delay in the first 30-day period … the State agency shall provide benefits only from the month following the month of application." 4.209.1.D: a late recertification is reopened "retroactive to the date that the action was taken". | The first month's benefit always runs from `snap_application_date`. No fact states a household-caused delay or the date benefits start. Example: CO-83 (application 2026-10-12; $479 prorated, $743 full month) with verification provided 2026-11-20 by the household's fault. The rule pays nothing for October and prorates November from the 20th. The codex pays $479 for October and $743 for November. No item, open question or scope note records this. CO-348's rationale puts only processing timelines out of scope, and OQ-309 only the timing of a denial. | Add a case fact, `snap_benefits_begin_date`: the application date unless 4.205.31, 4.205.4.A or 4.209.1.D sets a later date. Read it in CO-2305 and CO-2308 in place of the application date, with a month before it paying 0. Alternatively, record the scope decision in docs/colorado-notes.md with this text, but the allotment outcome then needs a precision note. |
| C-14 | P1 (stopping rule) | OQ-730; 8 U.S.C. 1631(a)(2) (D-275:8); 7 U.S.C. 2014(i)(1) (D-2); 7 CFR 273.4(c)(2) (D-9:120) | CO-3702, CO-3711, OQ-730 | 1631(a): "Notwithstanding any other provision of law … the income and resources of the alien shall be deemed to include … (2) the income and resources of the spouse (if any) of the person". 2014(i)(1): "and the income and resources of the sponsor's spouse if such spouse is living with the sponsor". 273.4(c)(2): "the sponsor's spouse, if he or she has executed USCIS Form I-864 or I-864A". | OQ-730 is classed as a "state policy choice". But the texts are two federal statutes against a federal regulation, and a State cannot choose to depart from either. This is a legal question with a Legal owner. The volume's own precedent, N-3 (CO-2337's `statute_override` of 273.4(c)(3)(vi) under 2014(i)(2)(E) and 1631(d)(3)), applies the statute. On that precedent the current assumption (no deeming for a non-signing spouse) gives the wrong deemed income whenever the sponsor has a non-signing spouse who lives with the sponsor and has income. | Reclassify OQ-730 as a legal question (owner Legal, co-owner SNAP). Or resolve it on the statute, as N-3 was: deem the living-with spouse's income and resources, with a `statute_override` naming 273.4(c)(2) and 4.305.2.C. Under the stopping rule this cannot remain a state choice. |

### P2

| id | sev | paragraph | item(s) | what is wrong | proposed fix |
|---|---|---|---|---|---|
| P2-1 | P2 | 4.201.F, 4.202.32.B, 4.207.2.A; 273.2(c)(1) "(A) Filing date … is the date of release" (D-8:59); 273.10(a)(1)(ii) (D-14:11) | CO-2305, CO-1746 | CO-2305's precision says the release-date rule for joint SSI/SNAP applicants in a public institution "has no fact and is not modeled". But 273.2(c) makes the recorded filing date the release date, so `snap_application_date` can carry it. CO-1746's meaning ("filed with the State agency (7 CFR 273.2(c))") does not say so, and CO-2305 tells the worker the opposite. | State in CO-1746's meaning that, for a joint SSI/SNAP application filed before release, the filing date is the release date. Correct CO-2305's precision. |
| P2-2 | P2 | 4.310.3.C.1-5 (D-82:5137-5166) | CO-044, CO-043, CO-400 | Colorado lists examples of unfitness for employment: homelessness, recent release from an institution, self-declared temporary conditions, vocational rehabilitation, an SSI application or appeal, inability to keep employment, and domestic violence. Through CO-414 they also reach the ABAWD exception. CO-044's meaning ("obviously mentally or physically unfit") names none of them, and S126 quotes 4.310.3 without them. A worker who follows CO-044's meaning would not apply Colorado's examples. | Quote 4.310.3.C in full from D-82, and name the examples in CO-044's meaning. If CDHS reads them as automatic findings, record a state-choice open question and derive them. |
| P2-3 | P2 | 4.304.4.B.1-4, C, C.1.a-c (D-82:3476-3518); 7 CFR 273.11(n) | CO-038, CO-1732 | CO-1732's meaning is "violating a condition of probation or parole". The rule requires a finding by an impartial party and law enforcement "actively seeking" the person, defined by the 20- and 30-day tests. CO-038 does not state the four-part fleeing-felon test. A worker who states the facts by their meanings disqualifies people the rule does not. | Restate both meanings with 4.304.4.B's four-part test and C's impartial-party and actively-seeking conditions. Cite D-82. |
| P2-4 | P2 | 4.302.C.2 (D-82:3089) | CO-2562 | "If an individual refuses to provide an SSN based on a sincere religious objection, all members of the household may participate". CO-2562's meaning ("refused to supply it") disqualifies that person. | Add the exception to CO-2562's meaning, as with the newborn. |
| P2-5 | P2 | 4.309.21.B (D-82:4712-4719), 4.303.B | CO-4178, CO-304 | A resident of a battered women's shelter may participate in one additional household in the same month when the other household contains the abuser. CO-304 removes anyone who `receives_snap_in_another_household` unless `child_majority_of_meals_verified`. CO-4178's meaning ("(a child, …)") is loose enough for a worker to state it for the woman, which removes her from her new household. | Restrict CO-4178's meaning to the duplicate-child case, or add a battered-shelter arm, such as `residence_setting`/`nighttime_residence_type` shelter plus a fact that the other household contains the abuser. |
| P2-6 | P2 | 4.304.3.C.4-5, C.5.A.1-2, C.5.B (D-82:3334-3360) | CO-2567 | Boarder status needs a payment at least equal to the maximum allotment for the boarder household's size (more than 2 meals a day), or two thirds of it (2 meals or fewer), counting only the meal portion when it can be distinguished. Someone paying less is a household member. CO-2567's meaning says only "a reasonable amount". | Put the 4.304.3.C.5 thresholds in CO-2567's meaning, or derive them from `room_and_board_payments_received` and the maximum allotment. |
| P2-7 | P2 | 4.502.A.4 last sentence (D-82:8876) | CO-1374 to CO-1377, CO-1616, CO-338 | "The local office shall verify that each member receives benefits or services from the program that confers basic or expanded categorical eligibility." No requirement item exists. BCE's verification relief is granted on the receipt facts as stated. | Add `snap_requires_verification_of_categorical_receipt` (satisfied by the conferring program's record, which is verified upon receipt under 4.504.6.D.4-5). Or record why it is not a household element. |
| P2-8 | P2 | 4.500.E (D-82:8797); 7 U.S.C. 2015(c) (D-3:61) | (none) | "No household shall be eligible … if it refuses to cooperate in providing information … necessary for making a determination of its eligibility or for completing any subsequent review". This is an eligibility bar with no fact and no recorded scope decision; OQ-309's scope covers only the timing of a denial. | Add a supplied case fact, `snap_household_refused_to_cooperate`, read by CO-386. Or record the scope decision in docs/colorado-notes.md. |
| P2-9 | P2 (stopping rule) | OQ-371; 4.502.B.2, 4.506 (D-82:9823-9826); 7 CFR 273.2(f)(8)(i)(A) (D-8:237) | CO-1596, CO-1619 | OQ-371 is classed as a "state policy choice". But 273.2(f)(8)(i)(A) says "The State agency shall not verify income if … the amount is unchanged or has changed by $50 or less", which forbids verifying a change of exactly $50, and Colorado's own 4.506 reads "changed more than fifty dollars ($50)". The texts settle it. The assumption (more than $50) already matches, so no answer changes. | Resolve OQ-371 on 273.2(f)(8)(i)(A) and 4.506. |
| P2-10 | P2 | 4.305.1.H; 7 U.S.C. 2015(f)(2)(D) (S8); 8 U.S.C. 1611(a), 1641(b)(8) (D-181) | CO-308, OQ-1 | CO-308 makes Compact of Free Association residents eligible under the amended 2015(f). 8 U.S.C. 1611(a) ("notwithstanding any other provision of law … not eligible for any Federal public benefit") bars non-qualified aliens, and 1641(b)(8) makes COFA residents qualified aliens only for Medicaid. Neither CO-308 nor OQ-1 records how sec. 10108 sits with 1611(a). | Add 1611(a) and 1641(b)(8) to OQ-1's checked texts and CO-308's assumption, naming the FNS alien-eligibility memorandum as the document that settles it. |

### P3

| id | paragraph | item(s) | note |
|---|---|---|---|
| P3-1 | 4.206.C.3.b.1-2 ("resources below the limit") | CO-344 | CO-344 tests at or below, following 7 U.S.C. 2014(g) ("shall not exceed"). The precision does not record this choice. |
| P3-2 | 4.310.4 | CO-405, CO-406 | A non-ABAWD keeps a lost exemption until recertification. Not modeled. It matters only to the informational `snap_is_work_registrant` and to supplied voluntary-quit findings. |
| P3-3 | 4.505.6.F.1 | CO-1366, CO-1601 | The six-month cap on certification while USCIS verifies a submitted document is not modeled. |
| P3-4 | 4.303 (C-6 side effect) | CO-2571 | A citizen who fails residency is labelled `ineligible_member_non_citizen`. |
| P3-5 | 4.304.3.B.3 | CO-305 | A foster child under 18 may not apply separately from the foster family. Not enforced (carried from the first pass). |
| P3-6 | 4.304.1.C.2, 4.304.3.A.2 | CO-419 | The spouse is always set aside in the 165% test. Colorado counts a spouse who purchases and prepares the meals. Recorded in CO-419's precision, but no open question. |
| P3-7 | 4.305.B.3.b.1.c (divorce) | CO-004 | A spouse's quarters stop counting on a divorce before the determination, and continue to the next recertification after one. CO-004's meaning is silent on this. |
| P3-8 | 4.310.3.E.1, F | CO-404, CO-046 | A migrant under contract to begin work within 30 days, and a person appealing a UIB denial, are exempt. Neither meaning says so. |
| P3-9 | 4.309.3.C, 4.309.4.B.1, 4.309.42 | CO-305 | Treatment-center residents (with their children) and group-living residents represented by the facility are one-person households, and residents lose eligibility when the facility loses its FNS authorization. Composition follows the stated edges, which a worker can set; there is no rule item for either. |

## 3. Coverage matrix

Key:
- **C**: carried by the item(s) named. Each was read against the paragraph.
- **N/A**: not applicable, with the reason given.
- **OQ**: carried as an open question.
- **GAP**: a finding above.
- **Fin**: the financial family's text (income, resources, deductions, allotment), mapped and not re-verified here.

### 3.1 4.000.1 Definitions (159 terms)

| term(s) | disposition |
|---|---|
| Able-Bodied Adult Without Dependents (ABAWD) | C: CO-165, CO-166 (`statute_override`, 18-64), CO-412, CO-413/CO-414 (child under 14, override). The "no one under 18" prong: carried by CO-4250 with CO-414 (coverage round; was GAP C-1). |
| Administrative disqualification hearing; Administrative law judge; Administrative adjudicator; Adverse action; Adverse action period; Appeal; Bifurcated appeal; Combined appeal; Dispute Resolution Conference; Evidence; Fair hearing / State-level fair hearing; Final agency decision; Initial decision; IPV hearing; IPV hearing waiver; Local-level dispute resolution conference; Office of Administrative Courts; Office of Appeals; Preliminary determination; Preponderance of evidence; Clear and convincing evidence; SNAP fair hearings unit; Waiver of administrative disqualification hearing; Disqualification Consent Agreement | N/A: appeals, hearings and IPV adjudication are out of scope (4.800). The IPV outcome enters as CO-039. |
| Agency error claim; Claim; Compromise; Demand letter; Inadvertent Household Error Claim; Notice of Overpayment; Over-issuance; Recoupment; Repayment agreement; Under-issuance; Restoration; Supplement | N/A: claims and restoration are out of scope (4.702, 4.801). |
| Allotment; Minimum benefit; Thrifty food plan; Issuance month | Fin: CO-385, CO-135, CO-2307. |
| Application; Valid application; Application process; Eligibility has been determined; Application for recertification | N/A: application processing; no eligibility test (OQ-309 scope). Recertification is CO-1567. |
| Application filing date | C: CO-1746 (P2-1 for the release date). |
| Initial application; Initial month of application | C: CO-2305, CO-1567 (P2-1). |
| Authorized representative | C: CO-3729, CO-3730, CO-3731 (identity verification). Otherwise N/A: designation procedure. |
| ACSES; CUBS; IEVS; SAVE; G-845; Quest card; EBT account; EBT card; CO/EBTS; Case record; Documentation; Documentary evidence; Collateral contact; Verification; Unclear information | N/A: data systems and documentation. Verification items: CO-1370 to CO-1394. SAVE is the electronic source of CO-1601. |
| Basic Categorical Eligibility (BCE) | C: CO-336, CO-338, CO-341. OQ-640 (BCE or ECE first). |
| Expanded Categorical Eligibility (ECE) | C: CO-340, CO-341. OQ-12, OQ-356. |
| Standard Eligibility (SE) | C: CO-341, CO-344, CO-347, CO-382. |
| Basic Utility Allowance; One Utility Allowance; Telephone allowance; Heating/Cooling Utility Allowance; Energy EBT; Excess medical deduction; Exempt income; Gross income; Household income; Financial criteria; Liquid resources; Non-liquid resources; Net income test; Prospective budgeting; Self-employment; Vendor payments; Simplified reporting | Fin (CO-1500, CO-1235-1238, CO-376, CO-2338/2339, CO-334, CO-343, CO-346, CO-1702); reporting is out of scope (4.6xx). |
| Boarder | C: CO-2567, CO-304 (P2-6). |
| Boarding house | C: CO-2567 (meaning includes a commercial boarding house), CO-304. |
| Roomer; Live-in attendants | C: CO-2566, CO-305. |
| Certification period; Periodic Report Form; PA households; Public assistance (PA); Mass update; Management Evaluation reviews; Payment Error Rate; Quality assurance; QA active case; QA negative case; Quality control review; Period of ineligibility | N/A: certification administration and quality control are out of scope. QA non-cooperation (in "Period of ineligibility" and "Disqualified individuals") belongs to the QC chapter. |
| Civil union | N/A: a definition. Partners are mandatory members only when they hold themselves out as spouses (CO-305, `holds_out_as_spouse_with`). |
| Client; Local office; State department; CDHS; FNA; SNAP; Notice of Action | N/A: names of bodies and forms. |
| Communal dining facility; Homeless meal provider | N/A: where benefits may be used (4.309.1). |
| Countable month | C: CO-416, CO-051. |
| D-SNAP; Temporary emergency | N/A: disaster assistance (4.904) is out of scope. |
| Disqualified individuals | C: CO-311 (IPV CO-039; SSN CO-2562; non-citizen CO-310; work CO-040/CO-2318; ABAWD CO-2564). QA arm: N/A (QC). |
| Drug and Alcohol Treatment Center | C: CO-007 (carried by CO-007 with CO-4255, CO-4256 (coverage round; was GAP C-3) for the nonprofit condition). |
| Dual participation | C: CO-4178, CO-304. FDPIR: carried by CO-4266 with CO-386, CO-387 (coverage round; was GAP C-11). Battered-shelter exception: P2-5. |
| Employment and Training Program; Employment First; Voluntary work registrant | N/A: E&T administration (4.312). Hours count as CO-048. |
| Expedited service | C: CO-348, CO-1393, CO-1394 (carried by CO-4254 with CO-1394 (coverage round; was GAP C-12)). |
| Fleeing felon | C: CO-038 (P2-3). |
| Fraud; Intentional; Intentional Program Violation; Material fact; Trafficking | N/A: IPV adjudication. The outcome is CO-039. |
| Full-time student; Institution of higher education; Post high school education | C: CO-069, CO-021, CO-2880, CO-2881. |
| Good cause | C: supplied findings CO-2313 (voluntary quit), CO-2562 (SSN). carried by CO-4264 with CO-415 (coverage round; was GAP C-9) for ABAWD good cause. |
| Group Living Arrangement | C: CO-007 (carried by CO-007 with CO-4255, CO-4256 (coverage round; was GAP C-3): nonprofit, ≤ 16 residents, 1616(e) certification). |
| Head of Household | C: CO-067 (supplied); CO-1370 reads it. |
| Household | C: CO-305. |
| Indigent non-citizen | C: CO-2334, CO-2337 (exempt), CO-3701 (only money from the sponsor). The 12-month term is in CO-2334's meaning. |
| Lawful Permanent Resident; Parolee; Qualified non-citizen | C: CO-002, CO-308 (`statute_override`: only LPRs among qualified aliens). OQ-1, OQ-533. |
| Level sanction; Sanction | C: CO-2316, CO-2317, CO-2319, CO-2318 (carried by CO-2318 and CO-040's meaning (coverage round; was GAP C-8)). |
| LEAP | N/A: another program. |
| Migrant farm worker | C: CO-055, CO-2306, CO-2570. |
| On-the-job training | carried by CO-4265 with CO-410 (coverage round; was GAP C-10). |
| Outdated | C: CO-2321 to CO-2331. |
| Person experiencing homelessness | C: CO-037, CO-2810, CO-2811, CO-2812 (90 days). |
| Person with disabilities (prongs 1-8) | C: CO-302 (1: SSI, CO-015, CO-2822; 2: CO-2823, CO-2862; 3-4: CO-016; 5-6: CO-1729; 7: CO-3717 with CO-011/CO-017; 8: AND-SO through CO-2710, CO-014, CO-3718). |
| Prudent Person Principle | N/A: worker discretion. |
| Questionable | C: the `*_attestation_is_questionable` facts (CO-1307, CO-1314, CO-1331, CO-1338, …). |
| Shelter for battered women and children | C: CO-007/CO-3330 (a shelter is a private dwelling for CO-007). P2-5. |
| Sponsor; Sponsored non-citizen | C: CO-1573, CO-2713, CO-2337 (OQ-730, carried by CO-3711, CO-3702, OQ-730 resolved (coverage round; was GAP C-14)). |
| Striker | C: CO-3500. |
| Substantial lottery or gambling winnings | C: CO-4150, CO-4151 (≥ CO-119). |
| SSI | C: CO-012, CO-849. |
| TANF / Colorado Works | C: CO-013, CO-029. |
| Voluntary quit | C: CO-2313, CO-2318. |

### 3.2 4.100-4.160 (introduction, confidentiality, voter registration, complaints)

| paragraph | disposition |
|---|---|
| 4.100, 4.110, 4.120, 4.130, 4.130.1-2, 4.140, 4.150, 4.150.1-2, 4.160, 4.160.1-2, 4.160.21-22 | N/A: purpose, benefit use, confidentiality, voter registration and complaint procedure. No eligibility or benefit effect. |

### 3.3 4.200-4.210 Applications and recertifications

| paragraph | disposition |
|---|---|
| 4.200 | N/A (heading). |
| 4.201.A | N/A: no additional local conditions; signage. |
| 4.201.B | C: CO-2305, CO-2308 (benefits from the month of application; carried by CO-4268 to CO-4270 with CO-2305, CO-2308, CO-385 (coverage round; was GAP C-13) for delay cases). |
| 4.201.C | C: CO-348 (entitlement). The screening timing is N/A (processing). |
| 4.201.D | N/A: withdrawal procedure. |
| 4.201.E | C: CO-386 reads SNAP criteria only. |
| 4.201.F, first sentence | N/A: notice. |
| 4.201.F, second sentence (joint SSI applicants in an institution) | C: CO-007, CO-304. P2-1 for the filing date. |
| 4.201.G | N/A: race and ethnicity data. |
| 4.202.A-C | N/A: filing and same-day access. |
| 4.202.D (filing date; after hours = next business day) | C: CO-1746 (supplied date). |
| 4.202.E | N/A: filing methods. |
| 4.202.F | N/A: application validity and denial (OQ-309 scope). |
| 4.202.G | N/A: race and ethnicity data. |
| 4.202.1.A-C | N/A: a joint PA application uses the same filing date (CO-1746). |
| 4.202.2, first paragraph | C: CO-311, CO-312 (ineligible members); their income is Fin (CO-333). |
| 4.202.2, second paragraph | N/A: who may apply for the minors. |
| 4.202.3.A-C | N/A: SSA intake. |
| 4.202.3.D (expedited clock from receipt in the correct county) | C: CO-1746. Timing itself is N/A. |
| 4.202.31.A-B | N/A. |
| 4.202.31.C (filed when SSA receives it) | C: CO-1746. |
| 4.202.32.A | C: the same verification items, CO-1370 to CO-1394. |
| 4.202.32.B | P2-1 (time standard and restoration from release). |
| 4.202.33.A-F | N/A: outstationing. |
| 4.202.33.G-H | C: CO-1746 (filing date). |
| 4.203 (intro) | N/A. |
| 4.203.1.A-B | C: CO-067 (supplied head of household). |
| 4.203.2 (intro, A.1-4, B) | C: CO-3729 (application by a representative). Otherwise N/A: designation, EBT use and restrictions. |
| 4.203.21.A-D | N/A: who may be a representative; no household eligibility effect. |
| 4.203.22 | N/A: disqualifying a representative. |
| 4.203.3 | N/A: emergency representative. |
| 4.204.A-E | N/A: interview requirement, scheduling, missed interviews and PA/SSI interviews are processing and denial timing (OQ-309). The forfeiture of expedited timing in 4.204.C is a processing deadline. |
| 4.205 (intro: 30-day and 7-day standards; day one) | N/A: processing standards. |
| 4.205.1.A.1 | C: CO-348 (arm 2), CO-055, CO-1740, CO-121 ($100). |
| 4.205.1.A.2 | C: CO-348 (arm 1), CO-120 (< $150), CO-121 (≤ $100). |
| 4.205.1.A.3 | C: CO-348 (arm 3: gross plus liquid < rent or mortgage plus SUA, CO-377). |
| 4.205.1.B.1-2 | N/A: the 7-day deadline and interview timing. |
| 4.205.1.C | N/A: combined issuance timing. |
| 4.205.1.D | N/A: timeframe after late screening. |
| 4.205.1.E.1-3 | N/A: reductions, suspensions and cancellations (4.904.4, out of scope). |
| 4.205.11.A | C: CO-348, CO-1394 (normal processing statuses). |
| 4.205.11.B.1 | C: CO-1370, CO-1387, CO-3731, CO-1394 (identity before expedited certification). |
| 4.205.11.B.2 | C: CO-1393, CO-1346 (30 days), CO-3036, CO-3037, CO-3038, CO-1394. |
| 4.205.11.B.2.a | N/A: annotating the notice. |
| 4.205.11.B.2.b | C: CO-1393 (30th day; migrant exception CO-2570). Issuance dates are N/A. |
| 4.205.11.B.2.c | C: CO-2570 (meaning: once a season), CO-1393. |
| 4.205.11.C | carried by CO-4254 with CO-1394 (coverage round; was GAP C-12). |
| 4.205.2.A | C: CO-1746 (filed when a valid application reaches the correct county). The 30-day standard is N/A. |
| 4.205.2.B | C: CO-1345, CO-1392 (10 days). The rest is N/A. |
| 4.205.3.A-F | N/A: fault determination (it feeds carried by CO-4268 to CO-4270 with CO-2305, CO-2308, CO-385 (coverage round; was GAP C-13)). |
| 4.205.31, first paragraph | N/A. |
| 4.205.31, second paragraph | carried by CO-4268 to CO-4270 with CO-2305, CO-2308, CO-385 (coverage round; was GAP C-13). |
| 4.205.32 | C: CO-2308 (retroactive, prorated per 4.207.2). |
| 4.205.4.A | carried by CO-4268 to CO-4270 with CO-2305, CO-2308, CO-385 (coverage round; was GAP C-13) (household fault: benefits from the following month). |
| 4.205.4.B-C | N/A: denial. |
| 4.206.A | C: CO-341. |
| 4.206.B | N/A: the other programs' own limits. |
| 4.206.C.1.a.1 | C: CO-336, CO-338, CO-012, CO-013, CO-073 (authorized but unpaid grants are in the receipt facts' meanings; Medicaid-only is not receipt). |
| 4.206.C.1.a.2 | C: CO-3716, CO-338. |
| 4.206.C.1.b.1-6 | C: CO-1374 to CO-1377, CO-1616 (OQ-311 resolved; OQ-640). |
| 4.206.C.1.c.1-2 | C: CO-337, CO-039, CO-1731. |
| 4.206.C.1.d | C: CO-341 (OQ-640). |
| 4.206.C.2.a.1 | C: CO-340, CO-339, CO-122, CO-123 (OQ-356). |
| 4.206.C.2.a.2 | OQ-12. |
| 4.206.C.2.b.1-6 | C: no relief for ECE (OQ-311), CO-1374 to CO-1377. |
| 4.206.C.2.c.1-2 | C: CO-337. |
| 4.206.C.2.d | C: CO-341. |
| 4.206.C.3.a.1-3 | C: CO-341 (else standard), CO-337. |
| 4.206.C.3.b.1 | C: CO-347 (elderly or disabled: no gross test), CO-382, CO-344 (P3-1). |
| 4.206.C.3.b.2 | C: CO-347, CO-345, CO-382, CO-344. |
| 4.206.C.3.b.3 | C: CO-386 (the non-financial arms). |
| 4.206.C.3.c | C: CO-386, CO-387. |
| 4.206.D | N/A: re-evaluation at a change; each determination recomputes CO-341. |
| 4.206.E | C: CO-4151, CO-4152, CO-4153, CO-341, CO-386, CO-387. |
| 4.207.1.A-D | N/A: issuance schedule and period of intended use. |
| 4.207.2.A | C: CO-2305, CO-2308 (Fin); release-date sentence P2-1. |
| 4.207.2.B | C: CO-2306, CO-2305. |
| 4.207.2.C | C: CO-2308 (Fin). |
| 4.207.3.A-D | Fin: CO-384, CO-385, CO-2307, CO-383, CO-3726, CO-3727, CO-135, CO-3700. |
| 4.208.A-C, 4.208.1.A-B, 4.208.2.A-B | N/A: certification period length and PA classification; no eligibility or benefit effect. |
| 4.209.A-D | N/A: recertification notices and interviews. |
| 4.209.1.A.1-2 | C: CO-2305 (a timely recertification has no initial month, so a full month). |
| 4.209.1.B | N/A: timing. |
| 4.209.1.C | C: CO-2305 precision (a late application is an initial application, prorated). |
| 4.209.1.D | carried by CO-4268 to CO-4270 with CO-2305, CO-2308, CO-385 (coverage round; was GAP C-13) (benefits from the date the action is taken). |
| 4.209.1.E.1-3 | N/A: processing. |
| 4.210.A | N/A: the 24-month period. |
| 4.210.B | N/A: periodic report processing; reinstatement is not a new application (CO-2305). |
| 4.210.C | Fin: CO-3739, CO-3740. |
| 4.210.D.1-8, 4.210.E | N/A: change reporting (4.6xx-type). |

### 3.4 4.300-4.313 Non-financial eligibility

| paragraph | disposition |
|---|---|
| 4.300 (intro, A-F; prospective) | C: CO-386 combines the criteria. Prospective evaluation is the engine's month. |
| 4.301 | C: CO-1370, CO-1387, CO-3729, CO-3730, CO-3731. |
| 4.302.A.1 | C: CO-1374, CO-1602, CO-1360 (number furnished; no card). |
| 4.302.A.2 | C: CO-2562, CO-311 (the individual, not the household). |
| 4.302.A.3 | C: CO-2562, CO-311; income is Fin (CO-2565). |
| 4.302.B.1 | C: CO-2562 meaning (proof of application). |
| 4.302.B.1.a | C: CO-2562 precision (newborn). |
| 4.302.B.1.b | N/A: notice. |
| 4.302.B.2.a-b | C: CO-2562 ("without good cause"; household fault). |
| 4.302.C.1 | C: CO-2562 (good cause). |
| 4.302.C.2 | P2-4. |
| 4.303.A | C: CO-309 (OQ-393 resolved: the county is administrative). |
| 4.303.B, first paragraph | C: CO-4178, CO-304. P2-5 for the shelter exception. |
| 4.303.B, second paragraph (FDPIR) | carried by CO-4266 with CO-386, CO-387 (coverage round; was GAP C-11). |
| 4.303.C | carried by CO-4252, CO-4253 with CO-309 (coverage round; was GAP C-6). |
| 4.303.D | C: CO-309 (no fixed address required). carried by CO-4252, CO-4253 with CO-309 (coverage round; was GAP C-6) for migrants. |
| 4.303.E | carried by CO-4252, CO-4253 with CO-309 (coverage round; was GAP C-6). |
| 4.303.F | N/A: addresses on the application. |
| 4.304.A.1-3, A.2.A | C: CO-305 (purchase-and-prepare edges; separate units). |
| 4.304.1 (intro) | C: CO-305 (mandatory edges cross regardless of purchasing). |
| 4.304.1.A.1, A.1.A | C: CO-305, CO-101 (under 22; both parents). |
| 4.304.1.A.2, A.2.A | C: CO-305, CO-018, CO-102, CO-843. |
| 4.304.1.B.1.A-B | C: CO-305 (`spouse`, `holds_out_as_spouse_with`). |
| 4.304.1.B.2 | C: OQ-612 (absence). The contribution as income is Fin. |
| 4.304.1.C.1-2 | C: CO-419, CO-2303, CO-2304, CO-114, CO-3043 (P3-6). |
| 4.304.2.A | C: CO-4178, CO-4179, CO-304. |
| 4.304.2.B | C: CO-4180, CO-4181. |
| 4.304.2.B.1 | N/A: request for contact. |
| 4.304.2.B (second A: majority of meals) | C: CO-4179 meaning. |
| 4.304.2.B.2 | C: CO-304. |
| 4.304.2.B.3 | C: CO-304 (equal meals: the first household keeps the child). |
| 4.304.2.B.4 | C: CO-304. |
| 4.304.3 (intro), A.1-2 | C: CO-419, CO-305. |
| 4.304.3.B.1-2 | C: CO-305 (foster child in only when an edge is stated). |
| 4.304.3.B.3 | P3-5. |
| 4.304.3.C.1, C.3 | C: CO-2567 (not stated means a member at the household's request). |
| 4.304.3.C.2 | C: CO-304. |
| 4.304.3.C.2.A | Fin: CO-4165. |
| 4.304.3.C.4, C.5, C.5.A.1-2, C.5.B | P2-6. |
| 4.304.31.A | C: CO-2567, CO-304. |
| 4.304.31.B-C | C: CO-2566, CO-305. |
| 4.304.32 (A-C examples) | OQ-612 (`lives_with`, `dwelling_id`). |
| 4.304.4.A.1 | C: CO-039, CO-311. |
| 4.304.4.A.2 | C: CO-2562. |
| 4.304.4.A.3 | C: CO-310. |
| 4.304.4.A.4 | C: CO-040, CO-2318. |
| 4.304.4.A.5 | C: CO-2564. |
| 4.304.4.A.6.a-e | C: CO-2563. |
| 4.304.4.B (B.1-4) | C: CO-038. P2-3 for the four-part test. |
| 4.304.4.C (C.1.a-c) | C: CO-1732. P2-3. |
| 4.304.4.D | C: CO-007, CO-304; boarding houses through CO-2567. |
| 4.304.4.D.1 | C: CO-305 (the proprietor's own household). |
| 4.304.4.D.2 | C: CO-007 (more than 50 percent of meals; a halfway house is `other_institution`). |
| 4.304.4.D.3 | C: CO-007 (`educational_or_vocational_institution` with a meal plan). |
| 4.304.41.A, D, E | C: CO-007 (a private dwelling or shelter under CO-3330). |
| 4.304.41.B-C | carried by CO-007 with CO-4255, CO-4256 (coverage round; was GAP C-3). |
| 4.305 (intro) | C: CO-309, CO-308. |
| 4.305.A.1.a-d, A.2 | C: CO-002 (`us_citizen`, `us_national`), CO-1358. |
| 4.305.B (intro; each category stands alone) | C: CO-308, CO-306, CO-3713. |
| 4.305.B.1 (intro, under-18 rule) | C: CO-3713 (under 18). Other qualified statuses: `statute_override` on CO-308. |
| 4.305.B.1.a.1-7 (refugee, trafficking, asylee, withholding, entrant, Amerasian, SIV) | C: CO-308 `statute_override` (only Cuban and Haitian entrants remain eligible); CO-2700 and CO-3713 for a prior status after LPR adjustment. OQ-1, OQ-533. |
| 4.305.B.1.a.2.a-c (ORR letters) | N/A after the override: trafficking victims are not in 2015(f) as amended (OQ-1). |
| 4.305.B.1.b.1 | C: CO-308, CO-2700. |
| 4.305.B.1.b.2-4 (parolee, conditional entrant, battered; a-c) | C: CO-308 override (ineligible), OQ-1. |
| 4.305.B.2.a | C: CO-2701, CO-3713 (applies to LPRs after the override). |
| 4.305.B.2.b.1-4 | C: CO-2702, CO-3715, CO-3713. |
| 4.305.B.3 (intro) | C: CO-307. |
| 4.305.B.3.a | C: CO-508, CO-003, CO-104. |
| 4.305.B.3.b | C: CO-307, CO-004, CO-3033. carried by CO-4261, CO-4262 with CO-307 (coverage round; was GAP C-5). |
| 4.305.B.3.b.1.a-c | C: CO-004 meaning (P3-7 for divorce). |
| 4.305.B.3.b.2.a | C: CO-004. |
| 4.305.B.3.b.2.b | carried by CO-4261, CO-4262 with CO-307 (coverage round; was GAP C-5). |
| 4.305.B.3.c | C: CO-3713, CO-177. |
| 4.305.B.3.d | C: CO-306 (`snap_is_disabled_member`). |
| 4.305.B.3.e | C: CO-306, CO-2601, CO-279. |
| 4.305.B.3.f.1-2 | C: CO-005, CO-2866. |
| 4.305.B.3.f.3.a-c | C: CO-005. |
| 4.305.B.3.f.3.d-e | carried by CO-4260 (CO-4257 to CO-4259) with CO-306 (coverage round; was GAP C-4). |
| 4.305.1.A-G, I | C: CO-308 (only listed categories pass), CO-002. |
| 4.305.1.H | C: CO-308 `statute_override` (COFA eligible). P2-10. |
| 4.305.2.A | C: CO-1573 (affidavit on or after 1997-12-19), CO-2337. |
| 4.305.2.B.1-2 | C: CO-1573, CO-2713. |
| 4.305.2.C | C: CO-2337, CO-3701, CO-3702. carried by CO-3711, CO-3702, OQ-730 resolved (coverage round; was GAP C-14) (OQ-730). |
| 4.305.2.D.1 | C: CO-2337 (citizenship, 40 quarters, death). carried by CO-3711, CO-3702, OQ-730 resolved (coverage round; was GAP C-14) for the spouse. |
| 4.305.2.D.2.a | C: CO-3703, CO-3711. |
| 4.305.2.D.2.b | C: CO-3710, CO-3705. |
| 4.305.2.D.2.c | C: CO-3708, CO-3706. |
| 4.305.2.D.3 | C: CO-3711 (same reductions). |
| 4.305.2.D.4 | C: CO-3701, CO-3707. |
| 4.305.2.D.5 | C: CO-2336 (deceased sponsor). Change processing is N/A. |
| 4.305.2.D.6 | C: CO-3702, CO-3704 ($1,500; 4.408.B's $2,000 recorded in its precision). |
| 4.305.2.E.1 | C: CO-2332. |
| 4.305.2.E.2 | C: CO-2333. |
| 4.305.2.E.3 | C: CO-2337 precision. |
| 4.305.2.E.4 | C: CO-2334, CO-3701. |
| 4.305.2.E.5 | C: CO-2335, CO-2720, CO-2717, CO-2718, CO-2719, CO-2363. |
| 4.305.2.E.6 | C: CO-2337 precision. |
| 4.305.2.E.7 | C: CO-2336. |
| 4.305.2.E.8 | C: CO-2337. |
| 4.305.2.F.1-4 | C: CO-1616, CO-1611, CO-1574. |
| 4.305.2.G.1 | C: CO-4154, CO-310. |
| 4.305.2.G.2 | C: CO-4154 precision (one sponsor for everyone: the household is ineligible). |
| 4.305.2.H.1 | C: CO-3708 (the whole amount is attributed until the others are named). |
| 4.305.2.H.2 | N/A: change reporting. |
| 4.305.3.A-E | N/A: reporting to USCIS. |
| 4.306.A | C: CO-411, CO-171, CO-172, CO-021. |
| 4.306.B.1-2 | C: CO-411 (age band). |
| 4.306.B.3 | C: CO-021 (half time). |
| 4.306.B.4-5 | C: CO-021, CO-2880 (only higher education). |
| 4.306.B.6 | carried by CO-4265 with CO-410 (coverage round; was GAP C-10). |
| 4.306.C | C: CO-2880 meaning (a break is still enrollment). |
| 4.306.1.A | C: CO-400, CO-410. carried by CO-4263 with CO-400 (coverage round; was GAP C-7) for temporary or private disability benefits. |
| 4.306.1.B | C: CO-407, CO-402, CO-175, CO-160. |
| 4.306.1.C | C: CO-070, CO-407. The term-start and break timing is in CO-070's meaning only in part (P3). |
| 4.306.1.D | C: CO-408, CO-409 (`statute_override`), CO-3719. |
| 4.306.1.E | C: CO-408, CO-071. |
| 4.306.1.F | C: CO-410 (`receives_tanf_cash`). |
| 4.306.1.G | C: CO-072. |
| 4.306.1.H | carried by CO-4265 with CO-410 (coverage round; was GAP C-10). |
| 4.307.A | C: CO-3504, CO-3500, CO-3501 (exempt the day before the strike, in CO-3500's meaning). |
| 4.307.B | C: CO-3503, CO-3502. |
| 4.307.1.A-D | C: CO-3500 meaning. |
| 4.308.A | C: CO-2313, CO-2318. |
| 4.308.B | C: CO-2318 (60 days, CO-2320; any time after); CO-2313 meaning (government strike; comparable new job). |
| 4.308.C | C: CO-2313 (non-exempt), CO-2318. |
| 4.308.D | N/A: applicant or participating classification. |
| 4.308.E | C: CO-2313, CO-2318. |
| 4.308.F | N/A: notice. |
| 4.308.G | C: CO-2315. |
| 4.308.1.A-N | C: CO-2313 (good cause found by the county). |
| 4.309 (intro) | N/A. |
| 4.309.1 | N/A: benefit use. |
| 4.309.2 | C: CO-007 (a shelter is not an institution). |
| 4.309.21 (intro), A | C: CO-007, CO-305. |
| 4.309.21.B | P2-5. |
| 4.309.21.C | N/A: procedure. |
| 4.309.21.D | C: CO-305; CO-4175 for inaccessible joint resources (Fin). |
| 4.309.3.A-B | carried by CO-007 with CO-4255, CO-4256 (coverage round; was GAP C-3). |
| 4.309.3.C | P3-9. |
| 4.309.3.D | C: CO-348. |
| 4.309.3.E | C: CO-305, CO-045. |
| 4.309.31.A-E | N/A: center duties, EBT custody, departures, claims. |
| 4.309.4.A | carried by CO-007 with CO-4255, CO-4256 (coverage round; was GAP C-3). |
| 4.309.4.B, B.2-4 | N/A: representative and EBT handling. |
| 4.309.4.B.1 | P3-9. |
| 4.309.4.C-D | N/A: same processing standards. |
| 4.309.41.A-E | N/A: facility duties. |
| 4.309.42 | N/A: facility disqualification (P3-9 for the residents' consequence). |
| 4.310 (intro A-E) | C: CO-406, CO-040 (refusal or noncompliance), CO-2318. |
| 4.310.1, 4.310.1.A.1-3 | N/A: statements accepted unless questionable; no separate element (P3). |
| 4.310.2.A-D | N/A: notice. |
| 4.310.3 (intro) | N/A. |
| 4.310.3.A | C: CO-406, CO-161, CO-162. |
| 4.310.3.A.1 | C: CO-405 youth arm, CO-3040. |
| 4.310.3.B | C: CO-401, CO-164, CO-065. |
| 4.310.3.C | C: CO-400. P2-2 for C.1-2 and C.3.a, c-d, C.4-5. carried by CO-4263 with CO-400 (coverage round; was GAP C-7) for C.3.b. |
| 4.310.3.D.1-3 | C: CO-020, CO-021, CO-405 (ineligible students excluded), CO-2880. |
| 4.310.3.E | C: CO-404, CO-402, CO-403, CO-163. E.1-2: P3-8. |
| 4.310.3.F | C: CO-046 (P3-8 for an appeal). |
| 4.310.3.G | C: CO-045. |
| 4.310.3.H | C: CO-1935, CO-2830. |
| 4.310.4 | P3-2. |
| 4.310.5.A | C: CO-2313. |
| 4.310.5.B | C: CO-2318. |
| 4.310.5.B.1 | C: CO-311, CO-2302. |
| 4.310.5.C | C: CO-2313. |
| 4.310.6.A-E | C: CO-040 (refusing suitable employment is supplied noncompliance). |
| 4.310.7.A-N | C: CO-2313, CO-040 (good cause found by the county). |
| 4.310.8.A.1-3 | C: CO-2314, CO-2316, CO-2317, CO-2319, CO-2318. |
| 4.310.8.B | C: CO-2315. |
| 4.310.8.C-D | carried by CO-2318 and CO-040's meaning (coverage round; was GAP C-8). |
| 4.311 (intro) | N/A: statements accepted. Work hours: CO-1386. |
| 4.311.A.1 | C: CO-165, CO-412. |
| 4.311.A.2 | C: CO-166 `statute_override` (through 64). |
| 4.311.A.3.A | carried by CO-4263 with CO-400 (coverage round; was GAP C-7). |
| 4.311.A.3.B | C: CO-044. |
| 4.311.A.3.C | C: CO-043. |
| 4.311.A.4 | carried by CO-4250 with CO-414 (coverage round; was GAP C-1) (age 14 under the override; the relationship test is wrong). |
| 4.311.B.1 | C: CO-415, CO-168. |
| 4.311.B.1.a.i-iv | C: CO-022, CO-1915, CO-1916. |
| 4.311.B.2, B.2.a.i-iii | C: CO-048. |
| 4.311.B.3 | C: CO-415 (the sum). |
| 4.311.B.4 | C: CO-068. |
| 4.311.B (closing sentence) | C: CO-417, CO-418, CO-169, CO-170. |
| 4.311.1.A | C: CO-414 reads CO-405. |
| 4.311.1.B | C: CO-009. |
| 4.311.1.C-E | C: CO-414 `statute_override` (removed by sec. 10102; S1303). |
| 4.311.1.F | C: CO-052. |
| 4.311.1.G | C: CO-053. |
| 4.311.2 | C: CO-416 (monthly). Claims are N/A. |
| 4.311.3 (intro) | C: CO-418, CO-417, CO-169. |
| 4.311.3.A.1 | C: CO-416, CO-051. |
| 4.311.3.A.2 | C: CO-416 (the month of the eighteenth birthday). |
| 4.311.3.B | carried by CO-4264 with CO-415 (coverage round; was GAP C-9). |
| 4.311.3.C.1 | C: CO-417. |
| 4.311.3.C.2 | C: CO-417, CO-1515, CO-170. |
| 4.311.3.D.1.a-d | C: CO-2309. |
| 4.311.3.D.2 | C: CO-418 (`regained`). |
| 4.311.3.D.3 | C: CO-2310, CO-2312, CO-2311. |
| 4.312, 4.312.1.A-B | N/A: E&T administration. EF is voluntary, with no disqualification, consistent with CO-040. |
| 4.313, 4.313.1 | N/A: workfare administration. Participation is CO-068. |

### 3.5 4.500-4.507 Verification

| paragraph | disposition |
|---|---|
| 4.500.A-B | N/A: documentation. |
| 4.500.C | N/A: notice. |
| 4.500.D | N/A: responsibility to provide. |
| 4.500.E | P2-8. |
| 4.501 | N/A. |
| 4.502.A.1 | C: CO-1394 (`postponed_expedited`), CO-1387, CO-3731. |
| 4.502.A.2.a | C: CO-1370. |
| 4.502.A.2.b | Fin: CO-1376, CO-1377. |
| 4.502.A.2.c | C: CO-1374, CO-1602. IEVS matching itself is N/A. |
| 4.502.A.2.d | C: CO-1373, CO-1601, CO-3736, CO-3738. |
| 4.502.A.2.e | C: CO-1375, CO-1586. |
| 4.502.A.3.a-d | Fin: CO-1390, CO-1618, CO-3739, CO-3740. |
| 4.502.A.4 | C: CO-1374 to CO-1377, CO-1616 (OQ-311). P2-7 for the last sentence. |
| 4.502.A.5 | Fin: CO-1378. |
| 4.502.B.1 | C: CO-2321 to CO-2331; CO-1370, CO-1373, CO-1375, CO-1384. |
| 4.502.B.2 | C: CO-1619, CO-1596. OQ-371, P2-9. |
| 4.502.B.3 | Fin: CO-1597, CO-2328 to CO-2330. |
| 4.502.B.4 | C: CO-1374. |
| 4.502.B.5-6 | Fin. |
| 4.502.C.1.a-g, C.2 | N/A: periodic report verification; determinations are at application or recertification (CO-1567). Fin for C.2. |
| 4.503 | N/A. |
| 4.504 | N/A: sources accepted. |
| 4.504.1 | N/A. |
| 4.504.2.A-C, E | N/A. |
| 4.504.2.D | N/A: no item makes a non-cooperating third party a ground of ineligibility. |
| 4.504.3 | N/A. |
| 4.504.4 | C: CO-1601 (SAVE as the electronic source). |
| 4.504.5.A-H | N/A: agency data matching. E states that benefits are not delayed. |
| 4.504.6.A-D.12, 4.504.61.A-B | N/A: whether mid-period information is verified upon receipt (change processing, 4.6xx). D.9: SAVE results verify CO-1601. |
| 4.505.A | N/A. |
| 4.505.1.A | C: CO-1370, CO-3731. |
| 4.505.1.B | C: CO-1300, CO-1301 (any document). |
| 4.505.1.C | N/A: EBT. |
| 4.505.2.A | C: CO-1374, CO-1602, CO-1360 (a number furnished satisfies it, so there is no delay). |
| 4.505.2.B.1-3 | N/A: procedure. |
| 4.505.2.B.4 | C: CO-2562. |
| 4.505.3.A (both paragraphs A) | C: CO-1375, CO-1586. |
| 4.505.3.C | C: CO-1313. |
| 4.505.4.A-B | C: CO-1383, CO-1331. |
| 4.505.4.C | C: CO-4180, CO-4181, CO-304. |
| 4.505.5.A.1-7 | C: CO-1371, CO-1372, CO-1306, CO-1304. |
| 4.505.5.B | C: CO-2001 (OQ-313). |
| 4.505.51.A-B | C: CO-1307 meaning. |
| 4.505.51.C | carried by CO-4251 with CO-311, CO-2565, CO-2571, CO-1394 (coverage round; was GAP C-2). |
| 4.505.51.D | N/A. |
| 4.505.6.A | N/A: notice. |
| 4.505.6.B | C: CO-1601. Participating without the member: CO-310 through 4.505.6.J. |
| 4.505.6.C.1-2 | C: CO-1601 (document received). |
| 4.505.6.D | N/A. |
| 4.505.6.E | C: CO-1617, CO-1594. |
| 4.505.6.F | C: CO-4154. |
| 4.505.6.F.1 | C: CO-1366 (P3-3). |
| 4.505.6.F.2 | C: CO-3734, CO-3735, CO-1601. |
| 4.505.6.G-H | N/A: secondary SAVE and notices. |
| 4.505.6.I | C: CO-4154, CO-310. No retroactive benefits: N/A. |
| 4.505.6.J | C: CO-002 (status not shown), CO-310. |
| 4.505.61 (intro, second paragraph) | C: CO-3736, CO-3733, CO-4154, CO-3734, CO-3735. |
| 4.505.61.A-C.1-11 | carried by CO-4261, CO-4262 with CO-307 (coverage round; was GAP C-5). |
| 4.505.7.A.1-4 | C: CO-1616, CO-1611. |
| 4.505.7.B | C: CO-4154. |
| 4.505.7.C | C: CO-4154, CO-3701, CO-3702 (attribution excluded; one sponsor for everyone). |
| 4.505.8 (intro) | N/A: an agency database check that does not delay processing; the result enters as CO-039. |
| 4.505.8.A | C: CO-041 meaning (Colorado's drug-felony rule). |
| 4.505.8.B-E | N/A: procedure. |
| 4.506, 4.506.A-…, 4.507 | Fin: income and expense verification, the financial family's. |

### 3.6 Federal texts cross-checked (where the codex follows them)

| text | disposition |
|---|---|
| 7 U.S.C. 2015(a) | C: CO-386 structure. |
| 2015(b) | C: CO-039. |
| 2015(c) | P2-8. |
| 2015(d)(1)(A)(i)-(iv), (vi) | C: CO-040. |
| 2015(d)(1)(A)(v) | C: CO-2313, CO-2318. |
| 2015(d)(1)(B) | N/A: Colorado elects no household sanction. |
| 2015(d)(1)(C) | C: CO-2316, CO-2317, CO-2319 (C-8 for "until the later of"). |
| 2015(d)(2) | C: CO-405. |
| 2015(d)(4) | N/A: E&T. |
| 2015(e) | C: CO-411, CO-410 (carried by CO-4265 with CO-410 (coverage round; was GAP C-10)). |
| 2015(f) as amended | C: CO-308, CO-309 (carried by CO-4252, CO-4253 with CO-309 (coverage round; was GAP C-6)), CO-310. Closing sentence: Fin (CO-333). |
| 2015(g) | N/A: Colorado is not an SSI cash-out state. |
| 2015(h) | Fin: CO-4158 to CO-4160. |
| 2015(i) | N/A: an option not elected in 4.3xx. |
| 2015(j), (p), (q) | N/A: IPV-type findings (4.803). The outcome is CO-039. |
| 2015(k) | C: CO-038, CO-1732 (P2-3). |
| 2015(l)-(n) | N/A: child support cooperation options not elected in 10 CCR 2506-1 4.3xx. |
| 2015(o)(1)-(2) | C: CO-415 to CO-418. |
| 2015(o)(3)(A) | C: CO-412. |
| 2015(o)(3)(B) | C: CO-400 (C-7). |
| 2015(o)(3)(C) | C: CO-413 (C-1). |
| 2015(o)(3)(D) | C: CO-405 via CO-414. |
| 2015(o)(3)(E) | C: CO-009. |
| 2015(o)(3)(F)-(G) | C: CO-050. |
| 2015(o)(4), (6) | C: CO-052, CO-053. |
| 2015(o)(5) | C: CO-2309, CO-2312. |
| 2015(r) | C: CO-2563. |
| 2015(s) | C: CO-4151 to CO-4153. |
| 7 CFR 273.1(a) | C: CO-305. |
| 273.1(b)(1)(i)-(iii) | C: CO-305, CO-101, CO-102, CO-018. |
| 273.1(b)(2) | C: CO-419, CO-2304. |
| 273.1(b)(7)(i)-(x) | C: CO-311, CO-304, CO-007 (C-3). |
| 273.1(c)(1)-(6) | C: CO-2566, CO-2567, CO-3714. |
| 273.1(e) | C: CO-3504. |
| 273.2(c)(1) filing date | C: CO-1746 (P2-1). |
| 273.2(f)(1)(ii) | C: CO-1601, CO-4154. |
| 273.2(f)(1)(v) | C: CO-1374. |
| 273.2(f)(1)(vi) | C: CO-1375. |
| 273.2(f)(1)(vii) | C: CO-1370. |
| 273.2(f)(1)(viii) | C: CO-1384. |
| 273.2(f)(2)(ii) | carried by CO-4251 with CO-311, CO-2565, CO-2571, CO-1394 (coverage round; was GAP C-2). |
| 273.2(f)(8)(i)(A) | C: CO-1619 (P2-9). |
| 273.2(h)(2)-(4) | carried by CO-4268 to CO-4270 with CO-2305, CO-2308, CO-385 (coverage round; was GAP C-13). |
| 273.2(i)(1) | C: CO-348. |
| 273.2(i)(3)-(4)(iii) | C: CO-1393 (OQ-323 resolved). |
| 273.2(i)(4)(iv) | carried by CO-4254 with CO-1394 (coverage round; was GAP C-12). |
| 273.2(j)(2) | C: CO-338 (Colorado's list). |
| 273.4(a)(1)-(5) | C: CO-308 override, CO-002. |
| 273.4(a)(6)(ii)(A)-(F), (iv) | C: CO-307, CO-306, CO-3713. |
| 273.4(a)(6)(ii)(G) | C: CO-005 (C-4). |
| 273.4(c)(1)-(2)(v) | C: CO-3701 to CO-3712 (C-14 for the spouse). |
| 273.4(c)(3)(i)-(vii) | C: CO-2337 (override for (vi) under 2014(i)(2)(E)). |
| 273.4(c)(5) | C: CO-4154. |
| 273.5(a) | C: CO-411. |
| 273.5(b)(1)-(6), (8)-(11) | C: CO-410, CO-407, CO-408, CO-409, CO-072, CO-070. |
| 273.5(b)(7) | carried by CO-4265 with CO-410 (coverage round; was GAP C-10). |
| 273.7(a)(1) | C: CO-406, CO-040. |
| 273.7(b)(1)(i)-(viii) | C: CO-405, CO-406 (C-7 for (ii) verification). |
| 273.7(f) | C: CO-2318. |
| 273.7(j)(1)-(3) | C: CO-2313, CO-2318, CO-2320. |
| 273.7(j)(4) | carried by CO-2318 and CO-040's meaning (coverage round; was GAP C-8). |
| 273.24(a)(1) | C: CO-415. |
| 273.24(a)(2) | carried by CO-4264 with CO-415 (coverage round; was GAP C-9). |
| 273.24(b) | C: CO-416, CO-417. |
| 273.24(c)(1) | C: CO-166, CO-412. |
| 273.24(c)(2)(i) | carried by CO-4263 with CO-400 (coverage round; was GAP C-7). |
| 273.24(c)(2)(ii)-(iii) | C: CO-044, CO-043. |
| 273.24(c)(3) | C: CO-413. |
| 273.24(c)(4) | carried by CO-4250 with CO-414 (coverage round; was GAP C-1). |
| 273.24(c)(5)-(6) | C: CO-414. |
| 273.24(c)(7)-(10) | C: override (S1303). |
| 273.24(d) | C: CO-2309. |
| 273.24(e)-(h) | C: CO-052, CO-053. |
| 273.24(k)-(l) | N/A: screening and verification procedure (CO-1386 for hours). |
| 8 U.S.C. 1612(a)(1) | C: CO-307. |
| 1612(a)(2)(A) | C: CO-3713, CO-2700. |
| 1612(a)(2)(B) | C: CO-307 (C-5). |
| 1612(a)(2)(C) | C: CO-005 (C-4). |
| 1612(a)(2)(F) | C: CO-306. |
| 1612(a)(2)(G) | C: CO-2701. |
| 1612(a)(2)(I) | C: CO-306. |
| 1612(a)(2)(J) | C: CO-3713. |
| 1612(a)(2)(K) | C: CO-2702, CO-3715. |
| 1612(a)(2)(L) | C: CO-508. |
| 1612(a)(3) | N/A: Medicaid and SSI. |
| 8 U.S.C. 1631(a) | C: CO-3701, CO-3702 (C-14). |
| 1631(b) | C: CO-2337. |
| 1631(d)(3) | C: CO-2337 override. |
| 1631(e) | C: CO-2334. |
| 1631(f) | C: CO-2335, CO-2720. |

### 3.7 Chapters out of this family's scope

| chapter | disposition |
|---|---|
| 4.400-4.411 income, resources, deductions | Fin: the financial family's review. |
| 4.600-4.610 change reporting, mass changes, notices, transitional SNAP, reinstatement | N/A: changes after certification; each determination is computed afresh. |
| 4.700-4.709 issuance, restoration, replacement, EBT accountability | N/A: issuance administration. |
| 4.800-4.802 claims and appeals | N/A: claims and hearings. |
| 4.803 IPV and fraud | N/A: adjudication. The disqualification enters as CO-039; the drug rule 4.803.3.D is CO-041. |
| 4.900 and later (county administration, disaster, quality control) | N/A: administration, D-SNAP and QC. |

Matrix size: 512 rows in all.
- 159 definition terms, in 52 rows.
- 357 rows over D-82 4.1xx-4.5xx.
- 90 rows over the federal texts.
- 6 out-of-scope chapter rows.

Several rows cover a run of subparagraphs that share one disposition, such as "4.308.1.A-N". Dispositions: 14 GAP findings (13 rule gaps plus C-14), 10 P2 and 9 P3 attached to rows; every other row is carried, open-questioned, financial or not applicable with a reason.

## 4. Open-question confirmations (this family)

| OQ | class in the volume | confirmation |
|---|---|---|
| OQ-1 | blocked on a named document | **Correct.** Checked this session: fns.usda.gov's implementation page (it redirects to www.fna.usda.gov/working-families-tax-cuts/snap/implementation) links the memorandum only on www.usda.gov/guidance-documents, which is not an allowed host. Sec. 10108 (D-5) has no effective-date clause. P2-10 asks that 8 U.S.C. 1611(a) be added to the checked texts. |
| OQ-12 | state policy choice | **Correct.** 4.206.C.2.a.2 leaves the non-cash TANF/MOE authorization to the State's own application language. |
| OQ-356 | state policy choice | **Correct.** Both sentences are Colorado's own (4.401.A.1 "below", 4.206.C.2.a.1 "at or below"). The BBCE income limit is the State's TANF/MOE program's limit, so no federal text settles it. |
| OQ-371 | state policy choice | **Misclassified (P2-9).** 273.2(f)(8)(i)(A) forbids verifying a change of $50 or less, and 4.506 says "more than fifty dollars". The texts settle it; the assumption already agrees. |
| OQ-533 | blocked on a named document | **Correct.** The FNS memoranda are on www.usda.gov and the CDHS agency letter is on cdhs.colorado.gov; neither is an allowed host. |
| OQ-612 | state policy choice | **Correct.** 7 CFR 273.1 and 4.304.32 set no limit on temporary absence. |
| OQ-640 | state policy choice | **Correct.** 4.000.1 and 4.206.C disagree; both are Colorado's own text. |
| OQ-730 | state policy choice | **Misclassified (C-14, P1).** Two federal statutes (8 U.S.C. 1631(a)(2), 7 U.S.C. 2014(i)(1)) against a federal regulation (273.4(c)(2)) is a legal question, not a State choice. |

Resolved open questions referenced and spot-checked: OQ-2, OQ-3, OQ-11, OQ-309, OQ-311, OQ-313, OQ-323, OQ-380, OQ-393, OQ-534. Their resolutions hold against D-82.

## 5. Earlier P1s in this family (spot-check)

| earlier id | result | evidence |
|---|---|---|
| N-1 (lottery, 4.206.E) | fixed | CO-4150 to CO-4153; CO-341 forces `standard`; CO-386 reads CO-4152 (≥ CO-119, "equal to or greater"). |
| N-2 (member pending non-citizen verification) | fixed | CO-4154, CO-310. Eval on CO-141: p2 `ineligible_member_non_citizen_verification`, `no_eligible_members`, `members_excluded`. The citizen counterpart is missing: C-2. |
| N-3 (sponsored child) | fixed | CO-2337 has an age ≥ 18 arm and a `statute_override`. Eval on CO-94: p3 and p4 `snap_sponsor_deeming_applies` false. |
| V-13 (duplicate child) | fixed | CO-4178 to CO-4181, CO-304. Side effect for shelter residents: P2-5. |
| F-3, F-5, F-7, F-9, F-12, F-13 | fixed | CO-3713; CO-407 and CO-409 (override present, so P2-1 of the earlier pass is closed); CO-302 prongs; CO-3729 to CO-3731; CO-415 with CO-1915/CO-1916; CO-050 with CO-3728. |
| P2-2 (sponsor's spouse) | recorded as OQ-730 | Now C-14: the class is wrong. |

## 6. Disposition (coverage round)

Fix agent, SNAP non-financial coverage round (2026-11-22), on branch `ccr-9d19bf4c-wmnwcl` from `a2ed7f0`. Commits: `45a9d59` (C-1 to C-7, C-12), `d9e4fc6` (C-8 to C-11, P2-8), `d20c888` (C-13, C-14, P2 and P3 meaning fixes), `b48e4b4` (households CO-150 to CO-154), and the commit carrying this section. Governing texts were re-read in D-82 and the federal documents, and every new excerpt (S3050 to S3075) was checked line by line against downloads made 2026-11-22: the Secretary of State PDF of 10 CCR 2506-1 (rule version 12718), the eCFR versioner (7 CFR 271.2, 273.2, 273.4, 273.5, 273.7, 273.24) and law.cornell.edu (7 U.S.C. 2014, 2015; 8 U.S.C. 1631, 1641). The reviewer's probes ZZ-A1, ZZ-A2b, ZZ-A3, ZZ-A4b and ZZ-A5 are stored as CO-150, CO-152, CO-153, CO-154 and CO-151 with hand derivations. The coverage matrix rows above now read "carried by ... (coverage round; was GAP C-n)".

### P1

| id | disposition |
|---|---|
| C-1 | Fixed `45a9d59`. `snap_lives_with_child_under_abawd_dependent_child_age` (CO-4250): anyone in the same home (`lives_with`, else the SNAP household) under `snap_abawd_dependent_child_age` (14, with the 4.311.A.4 override); an arm of CO-414 beside the (c)(3) parent arm CO-413. CO-150 (ZZ-A1): p1 `not_subject`, eligible, size 3, allotment 550 (was `limit_reached`, ineligible member). |
| C-2 | Fixed `45a9d59`. `snap_is_ineligible_pending_citizenship_verification` (CO-4251): a questionable citizen still unverified after the 4.505.6.E time (the thirtieth day, CO-1617) is an ineligible member (CO-311), income prorated (CO-2565), reason `ineligible_member_citizenship_verification` (CO-2571), verification `members_excluded` (CO-1394). Within that time the member still participates, as 4.505.51.C's "except as provided in Section 4.505.6, E" says. CO-152 (ZZ-A2b): size 2, allotment 90 (was 336). |
| C-3 | Fixed `45a9d59`. CO-007's (B) and (C) exceptions require a public or nonprofit setting (CO-3331, new `residence_setting_is_nonprofit` CO-4255), certification (CO-3335), and for (C) no more than `snap_group_living_max_residents` (CO-4256, 16) residents. CO-153 (ZZ-A3): the grandmother is `not_in_household` (was her own SNAP household). |
| C-4 | Fixed `45a9d59`. SNAP's own `snap_has_military_connection` (CO-4260) with the 273.4(a)(6)(ii)(G)(3) dependent child (under 18, a full-time student under 22, or disabled and dependent before 18: CO-4257 to CO-4259), read by CO-306 and CO-3738. The shared CO-005 is unchanged for Medicaid, CHP+ and cash, whose own rules this volume does not show defining the child (convention rule 15); the Medicaid owner should check 1612(b)'s "unmarried dependent child". CO-154 (ZZ-A4b): p3 ineligible non-citizen, allotment 336 (was eligible, 342). |
| C-5 | Fixed `45a9d59`. New neutral `qualifying_quarters_with_federal_means_tested_benefit` (CO-4261, 0 when not stated) and `snap_creditable_qualifying_quarters` (CO-4262), read by CO-307, CO-3736 and CO-2337; CO-307's assumption corrected; CO-004 gains a precision. CO-307-T3: 40 SSA quarters, 6 removed: not eligible. |
| C-6 | Fixed `45a9d59`. New neutral `state_where_living_now` (CO-4252) and `snap_meets_residency_requirement` (CO-4253, falling back to `is_colorado_resident`), read by CO-309; a residency failure is `ineligible_member_residency` (P3-4). CO-151 (ZZ-A5): allotment 151 (was 0). |
| C-7 | Fixed `45a9d59`. New neutral `receives_temporary_or_permanent_disability_benefits` (CO-4263, false when not stated), an arm of CO-400 (so of CO-405, CO-410 and CO-414). |
| C-8 | Fixed `d9e4fc6`. CO-2318 is not served while the member is exempt from work registration (CO-405; 4.310.8.C-D, 273.7(j)(4)); CO-040's meaning says the supplied work-requirement disqualification ends the same way. The exemption is read as of the determination rather than from "the date exemption information was provided" (precision). |
| C-9 | Fixed `d9e4fc6`. `snap_abawd_work_hours_missed_for_good_cause` (CO-4264, 0 when not stated) adds to CO-415's hours, so to the countable-month and regaining tests. |
| C-10 | Fixed `d9e4fc6`. New neutral `participates_in_on_the_job_training` (CO-4265, false when not stated), an arm of CO-410. |
| C-11 | Fixed `d9e4fc6`. `snap_household_participates_in_fdpir` (CO-4266) reads `receives_fdpir` (CO-2851, kept person scope as of the determination; its meaning now names SNAP); CO-386 and CO-387 (new option `fdpir_participation`). |
| C-12 | Fixed `45a9d59`. Case fact `snap_prior_expedited_postponed_verification_incomplete` (CO-4254, false when not stated) closes CO-1394's `postponed_expedited` row. |
| C-13 | Fixed `d20c888`. Case fact `snap_household_delay_benefits_begin_date` (CO-4268) and `snap_benefits_begin_date` (CO-4269); the initial month (CO-2305) and its proration (CO-2308) run from it, and CO-385 pays 0 for a month before it (CO-4270). These are the financial track's items; the edits are the date read and one first arm. CO-2308-T5: application 10-12, verification 11-20 by the household's fault: nothing for October, November 11/30 of the benefit. |
| C-14 | Fixed `d20c888`. OQ-730 resolved on 8 U.S.C. 1631(a)(2) (not a state choice): CO-3711 and CO-3702 add the income and resources of a sponsor's spouse who did not sign (CO-2714), with a `statute_override` naming 4.305.2.C and 273.4(c)(2). CO-94 and CO-116 now state the non-signing spouse's zero income; no expectation changed. |

### P2

| id | disposition |
|---|---|
| P2-1 | Fixed `d20c888`. CO-1746's meaning: for a joint SSI/SNAP application from an institution the filing date is the date of release (273.2(c)(1)(vi)(A), S3073); CO-2305's precision corrected. |
| P2-2 | Fixed `45a9d59`. CO-044's meaning names the 4.310.3.C examples (S3065). They are examples for the agency's finding ("can include"), not findings in themselves, so no open question; C.3.b is C-7's arm. |
| P2-3 | Partly fixed `d20c888`: CO-1732's meaning states 4.304.4.C's impartial-party finding and actively-seeking conditions (SNAP is its only reader). Deferred for CO-038: `is_fleeing_felon` is read by Colorado Works and Adult Financial too, whose rules define it differently, so SNAP's four-part test needs its own prefixed finding read by CO-311 and CO-2302 (the financial track's range). |
| P2-4 | Fixed `d20c888`. CO-2562's precision: a sincere religious objection is not a refusal (4.302.C.2, S3067). |
| P2-5 | Fixed `d20c888`. CO-4178's precision: not stated true for a battered-shelter resident whose other household contains the abuser (4.309.21.B, S3068). |
| P2-6 | Fixed `d20c888`. CO-2567's precision states the 4.304.3.C.5 reasonable payment (maximum allotment, two-thirds for two meals or fewer, meals portion only) and C.4 (S3069). |
| P2-7 | Recorded, not a separate element (docs/colorado-notes.md): the conferring receipt facts are supplied from the conferring program's own record (convention rule 11), which is the 4.502.A.4 verification. |
| P2-8 | Fixed `d9e4fc6`. Case fact `snap_household_refused_to_cooperate` (CO-4267, false when not stated) in CO-386 and CO-387 (new option `refused_to_cooperate`); 2015(c) and 4.500.E (S3070, S3072). |
| P2-9 | Fixed `d20c888`. OQ-371 resolved on 273.2(f)(8)(i)(A) and 4.506 (S3064); no answer changes; `open:` removed from CO-1619. |
| P2-10 | Fixed `d20c888`, on a different reading: the finding's premise that 1641(b)(8) is Medicaid-only is out of date. The Law Revision Counsel's note (D-285, S3074): "2024—Subsec. (b)(8). Pub. L. 118–42 struck out ', but only with respect to the designated Federal program defined in section 1612(b)(3)(C) of this title (relating to the Medicaid program)'". A COFA resident is a qualified alien for every Federal public benefit, so 1611(a) does not conflict with 2015(f)(2)(D). Recorded in OQ-1 (body and Checked line) and CO-308's assumption. |

### P3

| id | disposition |
|---|---|
| P3-1 | Left to the financial track: CO-344 is in its range (no change here). |
| P3-2 | Accepted: a lost exemption kept to recertification affects only the informational `snap_is_work_registrant` and supplied voluntary-quit findings. |
| P3-3 | Accepted: the six-month cap of 4.505.6.F.1 bounds the certification period, which is certification administration outside this volume. |
| P3-4 | Fixed `45a9d59` (with C-6): `ineligible_member_residency`. |
| P3-5 | Deferred: a foster child's household follows the stated edges (CO-305 never crosses a foster_parent edge); enforcing "may not apply separately" needs a composition rule for the optional member. |
| P3-6 | Deferred: whether 4.304.1.C.2's spouse who purchases and prepares is set aside in the 165% test needs the text read against 273.1(b)(2); an open question if it leaves a choice. |
| P3-7 | Fixed `d20c888`. CO-004's precision states 4.305.B.3.b.1.c (S3075). |
| P3-8 | Partly fixed `d20c888`: CO-046's meaning includes a UIB denial under appeal (4.310.3.F). Deferred: a migrant under contract to begin work within 30 days (4.310.3.E.1) needs a fact for the contract. |
| P3-9 | Accepted: one-person treatment-center households follow the stated edges; a facility's FNS authorization is its standing, not a household fact. |

## Disposition (fix round, 2026-11-23): P2-3

| Finding | Disposition |
|---|---|
| P2-3 | Fleeing-felon half fixed in c97135d (N2-P2-2: snap_is_fleeing_felon, CO-4683 to CO-4685). Probation-or-parole half fixed now: is_probation_or_parole_violator (CO-1732) states only the violation (convention rule 13: a neutral fact carries no program's classification); SNAP's conditions (4.304.4.C: an impartial party's determination, and law enforcement actively seeking the person, C.1.a-c) are snap_is_probation_or_parole_violator (CO-5216), reading the new SNAP finding snap_probation_violation_found_by_impartial_party (CO-5215) and the existing law_enforcement_is_actively_seeking_person (CO-4685). CO-311 and CO-2302 read CO-5216. Stored case CO-489 (a reported violation with no finding and no one seeking him: not disqualified, allotment 387). |
