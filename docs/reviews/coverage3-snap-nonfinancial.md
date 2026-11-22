# Coverage review, third pass: SNAP non-financial eligibility (family coverage3-snap-nonfinancial)

Reviewer: independent coverage reviewer, third exhaustive pass, after the coverage pass 2 fix round. Read-only review of HEAD `5e955da` on branch `ccr-9d19bf4c-wmnwcl`. This file is the only file written in the repository.

Method:
- The matrix in section 3 was built from the governing text, not copied from docs/reviews/coverage-snap-nonfinancial.md or coverage2-snap-nonfinancial.md. D-82 (10 CCR 2506-1, effective 2026-10-01) was read line by line, from a copy with page headers removed, for 4.300-4.313 (D-82:2952-5686), 4.206 (2299-2506), 4.201, 4.202.2, 4.205.1-4.205.11 (1322-1384, 1485-1503, 2001-2162), 4.505-4.505.6 and 4.505.7-4.505.8 (9307-9627, 9736-9821) and the in-scope 4.000.1 definitions. The rest of 4.200-4.210, 4.305.2.D-H, 4.505.61, 4.609 and 4.803 was mapped by paragraph and checked against the items that carry it. Federal texts were read where an item cites them, where they differ from D-82, or where the fix round leans on them: D-3 (7 U.S.C. 2015(c), (d), (e), (f), (o)), D-7 (273.1(b), (c)(4), (e)), D-9 (273.4(b)(2), (c)(2), (c)(5)), D-10 (273.5), D-202 (273.24), D-24 (8 U.S.C. 1612), D-5 (Pub. L. 119-21 secs. 10102, 10108).
- Ledger: `npm run export -- --volume co` in a scratch copy (`git archive HEAD`, node_modules symlinked): 2,190 items, 589 with program SNAP or read by a `snap_*` item. Every item named in section 3 was read (meaning, precision, assumption, open questions and the English derivation) against its paragraph. Every item the fix rounds added or changed (CO-4250 to CO-4270, CO-4680 to CO-4690, and CO-007, CO-072, CO-310, CO-311, CO-386, CO-387, CO-407, CO-410, CO-414, CO-2307, CO-2308) was read in full.
- Wrong answers were confirmed with `npx vite-node scripts/eval-case.ts co <case> ...` on scratch households appended to the scratch copy's `volumes/co/tests/cases.yaml`, never the repository's. ZZ-M1 and ZZ-M2 are CO-193 with a college meal plan; ZZ-D0 to ZZ-D4 are CO-116 with a citizen child added (section 2). The stored fix households CO-150, CO-152 to CO-154, CO-192 and CO-193 were re-evaluated.
- Scope is the same as in the earlier passes. It covers definitions and non-financial eligibility, application dates and expedited service, household composition, categorical eligibility, citizenship, non-citizens and sponsor deeming as a non-citizen rule, students, strikers, work rules, voluntary quit and ABAWD, disqualifications, and the verification of these. Income, deductions, resources and the allotment computation (4.207.3, 4.400-4.411, 4.506-4.507) belong to the financial family and are marked "Fin" below.

## 1. Verdict

**2 P1 found.** Under the stopping rule the chapter is not yet complete. Both P1s are regressions from the coverage pass 2 fix round, and each one undoes part of the fix it came with:

- N3-1. The N2-4 meal-plan arm cannot reach the students it was added for. CO-304 also requires `institution_entry_date`, and a student living in a private dwelling never states that date, so the whole household's result is null (ZZ-M1).
- N3-2. The N2-P2-3 member who declines to document their status is classified as an ineligible non-citizen, but the sponsor-deeming items still test `snap_is_eligible_non_citizen` (CO-308). That member's sponsor's income and resources are still deemed and counted, and the sponsor is still asked to verify (ZZ-D3: allotment 282, should be 306).

The pass also found 2 P2 and 3 P3. Every first-pass P1 (C-1 to C-14) and second-pass P1 (N2-1 to N2-4) holds where it was fixed (section 5). No open question in this family is misclassified (section 4).

## 2. Findings

Severity:
- **P1**: wrong answer, missing pathway or verification requirement, or a misclassified open question.
- **P2**: a meaning or scope gap a worker could trip on, an unrecorded legal reading, or an approval risk.
- **P3**: note.

### P1

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| N3-1 | P1 (regression of N2-4) | 4.304.4.D.3 (D-82:3548-3552) | CO-304 `snap_is_household_member`, CO-007, CO-4686, CO-008 `institution_entry_date`, CO-3330 | "Students who purchase meal plans through an institution of higher education shall be considered residents of an institution if the meal plan provides the student more than fifty percent (50%) of his/her meals" | CO-007's new arm is true for a student living at home or off campus (`private_dwelling`) whose college meal plan gives more than half of the meals. CO-304 excludes a resident only when "Institution entry date is at most the Determination Date". By its meaning CO-008 is "The date the person entered the setting ... where it is not a private dwelling", and CO-3330's precision says only a resident of a setting other than a private dwelling states it. So for exactly the students N2-4 targeted, the exclusion is undetermined: CO-304, CO-2571, CO-387 and CO-385 are null for every member of the household. CO-007-T9 tests CO-007 alone, and no stored case reaches CO-304. Scratch **ZZ-M1** is CO-193 with p2 `has_higher_education_meal_plan_providing_majority_of_meals: true`: p2 `snap_resides_in_institution_providing_meals` true, but `snap_is_household_member` **null** (missing `institution_entry_date`), and `snap_eligibility_status` and `snap_allotment` are **null** for p1 and p2. Under 4.304.4.D.3, p2 is not a household member, so the result should be p2 `not_in_household`. **ZZ-M2** states an entry date anyway, against CO-008's meaning, and gets that answer (p2 `not_in_household`; household `no_eligible_members`, since p1 is past the ABAWD limit in CO-87's facts). | In CO-304, apply the entry-date condition only to the setting arm. Either split CO-007's two arms (a setting arm read with `institution_entry_date`, and a meal-plan arm read as of the determination date, as CO-4686's meaning "On the determination date" already says), or read `[otherwise, institution_entry_date, determination_date]` when the setting is `private_dwelling`. Add a household case for ZZ-M1 (p2 `not_in_household`) and a CO-304 test. |
| N3-2 | P1 (regression of N2-P2-3) | 4.305.2.C (D-82:4082-4088); 4.505.6.J (D-82:9622-9627); 4.505.7.C (D-82:9758-9762); 7 CFR 273.4(b)(2) (D-9:116) | CO-3701 `snap_sponsor_deemed_income`, CO-3702 `snap_sponsor_deemed_resources`, CO-1616 `snap_requires_verification_of_sponsor`, CO-4687, CO-310 | 4.305.2.C: "Only when a sponsored non-citizen is an eligible non-citizen will the local office consider the income and resources of the sponsor and sponsor's spouse available to the household." 4.505.6.J: "participating with the member in question classified as an ineligible non-citizen." | The fix made `declines_to_provide_immigration_documentation` (CO-4687) an arm of CO-310, so the member is an ineligible non-citizen. CO-3701 and CO-3702 still deem the sponsor's income and resources when "SNAP: is an eligible non-citizen" (CO-308), which reads the stated status and is unchanged, "and not ineligible while non-citizen verification is outstanding" (CO-4154). Neither of those reads CO-4687. The decliner's sponsor income and resources are therefore attributed and counted, pro rata for income and in full for resources, toward the remaining members. CO-1616 also still asks for the sponsor's verification, which 4.505.6.J says not to pursue. Scratch **ZZ-D3** is CO-116 (a sponsored LPR earning $2,400) with her citizen child p4 added in her unit and p2 `declines_to_provide_immigration_documentation: true`. The results: p2 `ineligible_member_non_citizen`, `snap_sponsor_deemed_income` **212.50**, `snap_sponsor_deemed_resources` **750**, household gross **1306**, allotment **282**, and `snap_requires_verification_of_sponsor` true. With no sponsor deeming (**ZZ-D4**, same household with the sponsorship removed), gross is **1200** and the allotment **306**. The same thing happens to any sponsored member who declines while the household includes a member who stays eligible. | Gate CO-3701, CO-3702 (and CO-1616) on `[not, snap_is_ineligible_non_citizen]` (CO-310) in place of the separate CO-308 and CO-4154 tests. CO-310 already holds all three grounds, so the deeming items cannot drift from it again. This is the same remedy N2-1 used. Add CO-3701 and CO-1616 tests with CO-4687 true, and ZZ-D3 as a stored case expecting gross 1200 and allotment 306. |

### P2

| id | sev | paragraph | item(s) | what is wrong | proposed fix |
|---|---|---|---|---|---|
| N3-P2-1 | P2 (unrecorded legal reading; fix-round item) | 4.304.3.B.3 (D-82:3308-3311); 7 CFR 273.1(c)(4) (D-7:37) | CO-4689, CO-4690, CO-102 | Colorado lets the foster child apply separately when "over eighteen (18) and no longer under the parental control of the foster parents". CO-4689 reads that as age 18 or older alone ("a foster child of 18 or older is read as no longer under the foster parents' parental control"). This drops the conjunction and reads "over eighteen" as including 18. The federal rule has no age exception: foster care individuals "cannot participate in the Program independently of the household providing the foster care services" (273.1(c)(4)). A foster youth of 18 to 20 who still lives in a foster home under a governmental placement and applies separately is eligible in the codex and barred by 273.1(c)(4). Elsewhere the volume records each place where it chooses between a broader Colorado text and the federal text (OQ-835, OQ-1, OQ-533, CO-072). This choice is not recorded. | Record an open question (needs Legal; co-owner SNAP policy owner) on 4.304.3.B.3 against 273.1(c)(4), and name it in CO-4689's assumption. Until then, state in the precision that 18 stands in for "over eighteen and no longer under parental control". |
| N3-P2-2 | P2 | 4.310.3.A (D-82:5128); 4.310.8.C-D (D-82:5393-5401) | CO-2318, CO-405 | The C-8 fix stops a voluntary-quit disqualification from being served "while the person is exempt from work registration" (CO-405). CO-405 carries no age arm for 60 or older ("A person 15 years of age or younger or a person 60 years of age or older", 4.310.3.A). The age range is applied in CO-406, which nothing reads. A person who turns 60 during a quit disqualification is exempt under 4.310.3.A and "will be eligible" under 4.310.8.D, but keeps serving it in the codex. A narrow case. | In CO-2318, read exemption as CO-405 or age at least 60 (or under 16), or add the age arms to CO-405. CO-405 is also read by CO-414 and by `ma_is_exempt_from_snap_work_requirements`, so check those readers if the change goes into CO-405. |

### P3

| id | paragraph | item(s) | note |
|---|---|---|---|
| N3-P3-1 | OQ-1, OQ-533 "Checked" lines | open-questions.md | `https://www.fns.usda.gov/snap/obbb-alien-eligibility` and `/snap/obbb-alien-eligibility-qas1` now redirect (HTTP 200) to `www.fna.usda.gov`, which is not an allowed host. The page there carries only the memo's title and a link to `www.usda.gov/guidance-documents/...`. The memo text is still on no allowed host, so the classification stands. Refresh the note to name the redirect. |
| N3-P3-2 | 4.310.4 (D-82:5216-5218) | CO-405, CO-2318 | The first pass accepted 4.310.4 (a non-ABAWD keeps a lost exemption until recertification) as affecting only the informational CO-406. Since the C-8 fix, CO-405 also decides whether a quit disqualification is served, so a lost exemption now has a small effect mid-period. Note only, since the volume makes one determination at a time. |
| N3-P3-3 | 4.304.4.D.3, 4.304.41.A | CO-007 precision | The precision says a student with a meal plan living in federally subsidized elderly housing is read as a resident of an institution, since 4.304.41.A has no fact apart from `private_dwelling`. Correct as recorded. Once N3-1 splits the arms, keep that sentence with the meal-plan arm. |

## 3. Coverage matrix

Key:
- **C**: carried by the item(s) named. Each item was read against its paragraph this pass.
- **N/A**: not applicable, with the reason.
- **OQ**: carried as an open question.
- **Fin**: the financial family's range.
- A finding id refers to section 2.

A run of subparagraphs that share one disposition shares a row.

### 3.1 Definitions, 4.000.1 (D-82:30-870), terms this family uses

| term(s) | disposition |
|---|---|
| ABAWD (18 to 54; no one under 18 in the household) | C: CO-412, CO-165, CO-166 (64, statute override, OQ-533); CO-413 and CO-4250 with CO-167 (14, 2015(o)(3)(C)); OQ-835. |
| Countable month | C: CO-416, CO-051. |
| Disqualified individuals; period of ineligibility | C: CO-311 arms (CO-039, CO-2562, CO-310, CO-040, CO-2318, CO-2564, CO-2563); quality-control non-cooperation, CO-4267. |
| BCE; ECE; Standard Eligibility | C: CO-338, CO-336, CO-340 (OQ-12, OQ-356), CO-341 (OQ-640). |
| Boarder; boarding house; roomer; live-in attendants | C: CO-2567, CO-2566, CO-304, CO-305. |
| Communal dining facility; homeless meal provider; Drug and Alcohol Treatment Center; Group Living Arrangement; shelter for battered women and children | C: CO-007 arms (B), (C), CO-3330, CO-3331, CO-4255, CO-3332, CO-3335; using benefits at providers is N/A (4.309.1, where benefits are spent). |
| Dual participation | C: CO-4178, CO-304. |
| Fleeing felon | C: CO-038 within CO-4683 (four-part test, N2-P2-2 fixed). |
| Fraud; intentional; IPV | C: CO-039 (meaning includes a fraud conviction, N2-P2-5 fixed). |
| Full-time student; institution of higher education; post high school education | C: CO-069, CO-021, CO-2880, CO-2881. |
| Household | C: CO-305. |
| Indigent non-citizen | C: CO-2337 and CO-1573 (exemption E.3). |
| Initial application; initial month of application; application filing date | C: CO-1746, CO-2305, CO-1567. |
| Lawful permanent resident; qualified non-citizen; parolee; sponsor; sponsored non-citizen | C: CO-308, CO-307, CO-306 (statute override, OQ-1); CO-3701, CO-3702, CO-2337. |
| Level sanction; sanction; voluntary quit | C: CO-2318, CO-2313, CO-2315; CO-040. |
| Migrant farm worker | C: CO-4688, CO-2570, CO-348. |
| On-the-job training | C: CO-4265 (internship exclusion, N2-P2-4 fixed). |
| Person experiencing homelessness | C: `nighttime_residence_type`; CO-044 (unfitness example); ABAWD homeless exception struck (CO-414 precision, OQ-32 resolved). |
| Person with disabilities | C: CO-302. |
| Questionable; unclear information; verification; documentary evidence; collateral contact; verified upon receipt | C: CO-1307, CO-1370 to CO-1394 (the meaning of each verification item). |
| Striker | C: CO-3500. |
| Substantial lottery or gambling winnings | C: CO-4152, CO-4680 (Fin for the amount). |
| Non-financial criteria; financial criteria; gross income; net income test; allotment; minimum benefit; utility allowances; liquid and non-liquid resources; exempt income; self-employment; thrifty food plan | Fin. |
| Adverse action; appeal; ADH; ALJ; administrative adjudicator; claim terms; compromise; demand letter; DRC; DCA; fair hearing terms; NOA; notice of overpayment; OAC; OOA; recoupment; repayment agreement; restoration; supplement; over- and under-issuance; mass update; ME, QA and PER terms; ACSES; CUBS; IEVS; SAVE; G-845; CDHS; FNA; local office; state department; EBT, Quest and CO/EBTS; LEAP; D-SNAP; temporary emergency; trafficking; vendor payments; case record; certification period; civil union; client; PA; PA households; prospective budgeting; issuance month; simplified reporting; periodic report form; outdated; prudent person; authorized representative; head of household; valid application; application process; eligibility has been determined | N/A: procedure, claims, hearings and administration with no eligibility effect here. "Eligibility has been determined" and the application terms carry no condition beyond the C rows in 3.2. |

### 3.2 Applications and recertifications, 4.200-4.210 (D-82:1318-2950)

| paragraph | disposition |
|---|---|
| 4.201.A, C, D, G | N/A: office procedure, screening, withdrawal, race data. |
| 4.201.B (benefits back to the month of application) | C: CO-4269, CO-2305, CO-2308. |
| 4.201.E (no denial solely for another program's denial) | C: none of the SNAP items reads another program's determination (convention rule 11; CO-336 reads case records). |
| 4.201.F (joint SSI/SNAP applicant in a public institution not eligible until release) | C: CO-1746 meaning (filing date is the release date), CO-2305. The notice is N/A. |
| 4.202, 4.202.1, 4.202.3, 4.202.31-4.202.33 | N/A: filing, PA and SSA joint processing; the date of filing is CO-1746. |
| 4.202.2 (ineligible individuals in the household; applying for minors) | C: CO-311, CO-2571, CO-2565 (income Fin 4.411). Applying for minors is N/A. |
| 4.203-4.203.3 (head of household, authorized representatives) | C: CO-3731, CO-3730 (identity of an authorized representative); CO-067 head of household for the 16-17 work-registration arm (CO-405). The rest is N/A: designation and disqualification of representatives. |
| 4.204 (interviews) | N/A: application processing (CO-348 precision, N2-P3-3). |
| 4.205, 4.205.1.A.1-3 (expedited entitlement) | C: CO-348 (under $150 gross with liquid at or below $100; destitute migrant; gross plus liquid less than shelter costs), CO-1740, CO-2571. |
| 4.205.1.B-E, 4.205.11.A-B (timeframes, postponed verification, migrants) | C: CO-1394 (`postponed_expedited`), CO-1346, CO-2570. Issuance timing is N/A. |
| 4.205.11.C (no repeat postponement while the last is incomplete) | C: CO-4254 in CO-1394. |
| 4.205.2 (normal processing) | C: CO-1392, CO-1345. Timing is N/A. |
| 4.205.3, 4.205.31, 4.205.32, 4.205.4.A (delays; benefits from the date verification is provided, or from the next month) | C: CO-4268, CO-4269, CO-4270, CO-2305, CO-2308, CO-385. Whether a delay is the household's or the office's is the county's finding (CO-4268 precision). |
| 4.206.A-B | C: CO-341. Other programs' requests are N/A. |
| 4.206.C.1.a.1-2 (all members receive SSI, CW, OAP, AND or AB; Family Preservation) | C: CO-336, CO-338, CO-3716, CO-3714. |
| 4.206.C.1.b, C.2.b (verification relief) | C: CO-1374 to CO-1378 and CO-1616 read CO-341. |
| 4.206.C.1.c, C.2.c, C.3.a.1-2 (IPV or fraud conviction; SNAP drug felony) | C: CO-337, CO-039, CO-1731. |
| 4.206.C.1.d, C.2.d, C.3.a.3 (fall through to the next category) | C: CO-341 order (OQ-640). |
| 4.206.C.2.a.1-2 (ECE: 200% gross; TANF/MOE service) | C: CO-340 (OQ-356, OQ-12). |
| 4.206.C.3.b.1-3, C.3.c (SE income and resource tests; non-financial criteria) | Fin (CO-4680 gross, net and resource arms); the non-financial criteria are 3.3 below. |
| 4.206.D (re-evaluation on change) | N/A: change processing; each determination reads CO-341 again. |
| 4.206.E (lottery winnings; first certification after under SE) | C: CO-4152, CO-4680, CO-4153, CO-341. |
| 4.207.1.A-D | N/A: issuance timing. |
| 4.207.2 (initial month proration) | C: CO-2305, CO-2308, CO-4269 (Fin for the amount). |
| 4.207.3 | Fin; the gate "After eligibility has been established" is C: CO-4680 in CO-2307 and CO-2308. |
| 4.208, 4.208.1, 4.208.2 | N/A: certification periods and PA classification. |
| 4.209, 4.209.1.A-B, E | N/A: recertification processing. |
| 4.209.1.C (late recertification: prorated initial month) | C: CO-2305 precision. |
| 4.209.1.D (reopened late recertification) | C: CO-4268, CO-4269. |
| 4.210 | N/A: periodic reporting. |

### 3.3 Non-financial eligibility criteria, 4.300-4.313 (D-82:2952-5686)

| paragraph | disposition |
|---|---|
| 4.300.A-F (the list; prospective) | C: the rows below; items are evaluated at the determination date. |
| 4.301 (identity; both the applicant and the authorized representative) | C: CO-1370, CO-1387, CO-1300, CO-1301, CO-3731. |
| 4.302.A.1 (SSN or proof of application; no card; all numbers) | C: CO-1374, CO-1360, CO-1602. |
| 4.302.A.2-3 (failure disqualifies the individual only) | C: CO-2562, CO-311, CO-2565. |
| 4.302.B.1, B.1.a (newborn) | C: CO-2562 precision. |
| 4.302.B.1.b | N/A: notice. |
| 4.302.B.2.a-b, C.1 (proof, good cause, household at fault) | C: CO-2562 meaning ("without good cause"). |
| 4.302.C.2 (religious objection) | C: CO-2562 precision. |
| 4.303.A (county of application) | C: not a condition (OQ-393 resolved); CO-309. |
| 4.303.B first paragraph (one household a month; battered-shelter exception) | C: CO-4178, CO-304. |
| 4.303.B second paragraph (FDPIR) | C: CO-4266, CO-2851, CO-4680 (read by CO-386, CO-387, CO-2307, CO-2308). |
| 4.303.C-E (non-vacation; no fixed address; no durational or intent condition) | C: CO-4253, CO-4252, CO-309. |
| 4.303.F | N/A: addresses on the form. |
| 4.304.A, A.1-3, A.2.A (household; separate households; homeless; separate purchase on approval) | C: CO-305 (`buys_prepares_with` stated as the household will purchase and prepare). |
| 4.304.1 intro, A.1, A.1.A (under 22 with a parent; both parents) | C: CO-305, CO-101. |
| 4.304.1.A.2, A.2.A (child under 18 under another member's parental control; not a foster child) | C: CO-305, CO-018, CO-102. |
| 4.304.1.B.1.A-B (spouses; holding out) | C: CO-305 edges. |
| 4.304.1.B.2, 4.304.32 and examples A-C (residence separate and apart; contribution as income) | C: CO-305 (`lives_with`); OQ-612; money provided is Fin. |
| 4.304.1.C.1-2, 4.304.3.A.1-2 (60 or older with a disability; 165% test; spouse) | C: CO-419, CO-2304, CO-2303, CO-019, CO-114, CO-3043 (spouse always set aside, resolved on 273.1(b)(2)). |
| 4.304.2.A, B, B.1, A (unnumbered), 2-4 (shared custody; majority of meals; equal meals; no verification) | C: CO-4178, CO-4179, CO-304. The request for contact and removal from the first case are N/A (procedure). |
| 4.304.3 intro, B.1-2 (foster child included or not at the foster parent's choice) | C: CO-305 (`foster_parent` edge never crossed; inclusion by `buys_prepares_with`). |
| 4.304.3.B.3 (foster child may not apply separately unless over 18 and no longer under parental control) | C: CO-4689, CO-4690, CO-311; N3-P2-1. |
| 4.304.3.C.1-3, 4.304.31.A (boarders: members only at the household's request; never separate) | C: CO-2567, CO-304; payment as self-employment income is Fin. |
| 4.304.3.C.4-5, C.5.A.1-2, C.5.B (not boarders; reasonable payment) | C: CO-2567 precision. |
| 4.304.31.B-C (roomers; live-in attendants) | C: CO-2566, CO-305. |
| 4.304.4.A, A.1-6.a-e (disqualified individuals not separate households; grounds) | C: CO-311 with CO-039, CO-2562, CO-310, CO-040, CO-2318, CO-2564, CO-2563 (conviction after 2014-02-07, out of compliance). A disqualified person alone forms a unit with no eligible member (CO-4680). |
| 4.304.4.B, B.1-4 (fleeing felon; four-part test; verified) | C: CO-4683 with CO-038, CO-4684, CO-4685; CO-311, CO-2302. |
| 4.304.4.C, C.1.a-c (probation or parole violator; impartial party; actively seeking) | C: CO-1732. |
| 4.304.4.D, D.1 (boarding-house residents; the proprietor's household) | C: CO-2567, CO-305. |
| 4.304.4.D.2 (institution: more than half of meals; halfway house for persons with a disability) | C: CO-007, CO-3330, CO-3334, CO-304, CO-008. |
| 4.304.4.D.3 (student meal plan) | C: CO-007 with CO-4686; **N3-1** (CO-304 cannot conclude for a student in a private dwelling). |
| 4.304.41.A-E (exemptions: elderly housing, treatment centre, group living, battered shelter, homeless shelter) | C: CO-007 arms (B), (C); A, D and E through `residence_setting_type` and `nighttime_residence_type`; N3-P3-3. |
| 4.305 intro, A.1.a-d, A.2 (citizens; nationals) | C: CO-309, `immigration_status`, CO-1371. |
| 4.305.B intro, B.1 intro (each category stands alone; under 18) | C: CO-308, CO-307, CO-306 (statute override: amended 2015(f), OQ-1). |
| 4.305.B.1.a.1-7, a.2.a-c (refugees, trafficking victims, asylees, withholding, Cuban/Haitian entrants, Amerasians, SIVs) | C: statute override, CO-308 (only the entrant category stays eligible); former refugee or asylee who became an LPR: CO-3713, CO-306. |
| 4.305.B.1.b.1-4 (LPR; parolees; conditional entry; battered non-citizens) | C: CO-308 (LPR with the additional condition); the others are statute override (OQ-1). |
| 4.305.B.2.a-b (Canadian-born Indians and tribal members; Hmong and Highland Lao) | C: CO-3713 (8 U.S.C. 1612(a)(2)(G), (K)) for an LPR; statute override otherwise. |
| 4.305.B.3.a (five years) | C: CO-307. |
| 4.305.B.3.b, b.1.a-c, b.2.a-b (40 quarters; parent's, spouse's; divorce; post-1996 means-tested quarters) | C: CO-307, CO-4262, CO-4261, CO-004. |
| 4.305.B.3.c-e (under 18; blind or disabled receiving benefits; born by 1931-08-22) | C: CO-306, CO-3713, CO-302, CO-2601, CO-279. |
| 4.305.B.3.f.1-3.e (military connection) | C: CO-4260, CO-2866, CO-2867, CO-4257 to CO-4259, CO-306. |
| 4.305.1.A-G, I (ineligible classes; U visas) | C: CO-308 (only listed statuses qualify); OQ-550. |
| 4.305.1.H (COFA) | C: statute override, CO-308 (2015(f)(2)(D); 1641(b)(8) as amended). |
| 4.305.2.A-B (affidavits on or after 1997-12-19; sponsor) | C: CO-2337, `is_sponsored_non_citizen`, the `sponsor` role. |
| 4.305.2.C (only an eligible sponsored non-citizen) | C: CO-3701, CO-3702, CO-3711, CO-2714; **N3-2** (the CO-4687 decliner is deemed). |
| 4.305.2.D.1-6, H.1-2 (deeming period, reductions, division, money paid, change of sponsor, resources) | C: CO-2337, CO-3711, CO-3703 to CO-3710 (Fin for the amounts). |
| 4.305.2.E.1-8 (exemptions) | C: CO-2337 with CO-2332 to CO-2336, CO-1573, CO-4262; under 18, CO-3709. |
| 4.305.2.F.1-4, G.1-2 (sponsor verification; ineligible until provided; same sponsor for all) | C: CO-1616, CO-1611, CO-1574, CO-4154, CO-310; N3-2 (CO-1616 still asks for a decliner). |
| 4.305.3.A-E | N/A: reporting to USCIS. |
| 4.306.A, B.1-5 (18 to 49 at least half time; not under the rule) | C: CO-411, CO-171, CO-172, CO-021, CO-2568. |
| 4.306.B.6, 4.306.1.H (on-the-job training) | C: CO-4265, CO-410. |
| 4.306.C (enrollment from the first day of classes; continuous) | C: CO-021 and CO-2881 meanings (enrollment stated as of the determination). |
| 4.306.1.A (unfit, including vocational rehabilitation) | C: CO-400, CO-410. |
| 4.306.1.B (20 hours a week paid; self-employed earnings; 80 hours a month) | C: CO-407, CO-175, CO-4681. |
| 4.306.1.C (work study) | C: CO-070 in CO-407. |
| 4.306.1.D-E (care of a child under 6; 6 to 11 without care; single parent full time) | C: CO-408, CO-409, CO-173, CO-174. |
| 4.306.1.F (TANF cash grant including the student's needs; not Family Preservation) | C: CO-013 (precision: unit membership). |
| 4.306.1.G (placement through WIOA, E&T, TAA, other program, JOBS; self-initiated) | C: CO-072 (2015(e)(3)(B) override on an E&T placement), CO-410. |
| 4.307.A-B, 4.307.1.A-D (strikers; eligible the day before; higher income; exceptions) | C: CO-3500, CO-3501, CO-3504, CO-4680; CO-3502 and CO-3503 Fin. |
| 4.308.A-C, E, 4.310.5.A-C (voluntary quit: 30 hours or FMW x 30; within 60 days or after; government strike; comparable job lost) | C: CO-2313, CO-2318, CO-2320. |
| 4.308.D, F, G | N/A: participating-household procedure, notice, hearing. |
| 4.308.1.A-N, 4.310.7.A-N (good cause) | C: CO-2313 meaning (a quit "without good cause" is the county's finding); CO-040. |
| 4.309 intro, 4.309.1 | N/A: where benefits may be spent. |
| 4.309.2, 4.309.21 intro, A (battered shelters; exempt from the institution rule; parent/child units) | C: CO-007, CO-305, `nighttime_residence_type`. |
| 4.309.21.B (one additional household) | C: CO-4178 precision. |
| 4.309.21.C | N/A: change processing. |
| 4.309.21.D (certified apart from the former household) | C: CO-305 (separate unit); joint resources are Fin. |
| 4.309.3.A-B (public or nonprofit; for-profit is an institution; OBH and FNS approval) | C: CO-007 (B), CO-3331, CO-4255, CO-3335; FNS retailer standing is N/A (CO-007 precision). |
| 4.309.3.C (one-person households unless children; voluntary) | C: CO-305 edges. |
| 4.309.3.D | C: CO-348 (expedited), timing N/A. |
| 4.309.3.E (non-resident treatment participant included) | C: CO-305; CO-405 (treatment arm). |
| 4.309.31, 4.309.41, 4.309.42 | N/A: facility duties and penalties. |
| 4.309.4.A (person with disabilities; public or nonprofit; at most 16; 1616(e)) | C: CO-007 (C), CO-4256, CO-3332, CO-3335, CO-302. |
| 4.309.4.B-E (election; one-person households through the facility; processing) | C: CO-305 edges; the rest is N/A. |
| 4.310 intro, A-E (register; information; no quit; accept and report to suitable work) | C: CO-405, CO-040, CO-2318. |
| 4.310.1, A.1-3 (client statement; verification if questionable) | C: CO-1384, CO-1386. |
| 4.310.2 | N/A: informing. |
| 4.310.3.A, A.1 (15 or younger, 60 or older; 16-17 not head or in school) | C: CO-406 (age range), CO-405 (16-17 arm); N3-P2-2. |
| 4.310.3.B (child under 6 or incapacitated person) | C: CO-401, CO-042. |
| 4.310.3.C, C.1-5 (unfit; examples) | C: CO-400, CO-043, CO-044, CO-4263. |
| 4.310.3.D, D.1-3 (half-time student; higher education must meet 4.306) | C: CO-405 (with not CO-411). |
| 4.310.3.E, E.1-2 (30 hours or FMW x 30; farm contract within 30 days; VISTA) | C: CO-404, CO-4688; VISTA hours are `hours_worked`. |
| 4.310.3.F (UIB applying, receiving or appealing) | C: CO-046. |
| 4.310.3.G (drug or alcohol treatment) | C: CO-405 arm. |
| 4.310.3.H (CW or CRSP work programs) | C: CO-405 arm (CO-1935, CO-2830). |
| 4.310.4 (lost exemption kept to recertification, except ABAWD) | N/A: one determination at a time; N3-P3-2. |
| 4.310.5.B.1 (disqualification continues in another household) | C: CO-2318 (person scope). |
| 4.310.6.A-E.7 (suitable employment) | C: CO-040 (a refusal without good cause is a finding). |
| 4.310.8.A.1-3 (1, 3, 6 months) | C: CO-2318 with CO-2315 and the sanction parameters; CO-040. |
| 4.310.8.B | C: CO-2315 (start month stated). |
| 4.310.8.C-D (becomes exempt) | C: CO-2318, CO-040 precision; N3-P2-2. |
| 4.311 intro, A.1-2 (17 or younger, 55 or older) | C: CO-412 (64 by statute, OQ-533). |
| 4.311.A.3.A-C (medically certified unfit) | C: CO-400. |
| 4.311.A.4 (same physical household as a minor) | C: CO-4250 (14 by statute); OQ-835. |
| 4.311.B.1-4, B.1.a.i-iv, B.2.a.i-iii (80 hours: work, in-kind, unpaid, work program, workfare) | C: CO-415, CO-1915, CO-1916, CO-4264. |
| 4.311.1.A-B (exempt from general requirements; pregnancy) | C: CO-414. |
| 4.311.1.C-E (homeless, veterans, former foster youth) | C: struck by the amended statute (CO-414 precision, OQ-32 resolved, OQ-533). |
| 4.311.1.F (FNS waiver) | C: CO-052 in CO-416. |
| 4.311.1.G (state exemptions in the E&T plan) | C: CO-053 in CO-416. |
| 4.311.2 (months after losing an exemption count) | C: CO-416 per month. |
| 4.311.3 intro, A.1-2 (more than three countable months; not the month of turning 18) | C: CO-418, CO-417, CO-416, CO-169. |
| 4.311.3.B (good cause for missed hours) | C: CO-4264, CO-415. |
| 4.311.3.C.1-2 (clock from July 2023, every 36 months) | C: CO-417, CO-1515, CO-170. |
| 4.311.3.D.1-3 (regaining; additional three months once) | C: CO-418, CO-2309, CO-2310, CO-2312, CO-2311. |
| 4.312, 4.312.1, 4.313, 4.313.1 (EF voluntary; county plans; workfare) | C: EF failure is no disqualification (no item reads it); workfare in CO-415. The rest is N/A: administration. |

### 3.4 Verification, 4.500-4.505.8 (D-82:8740-9822)

| paragraph | disposition |
|---|---|
| 4.500.A-D, 4.501, 4.502, 4.503, 4.504-4.504.61 | C: the verification items CO-1370 to CO-1394 and the `*_verified`/`*_received` facts. Sources and documentation are N/A. |
| 4.500.E (refusal to cooperate) | C: CO-4267, CO-4680. |
| 4.505.A (outside information verified before adverse action) | N/A: procedure. |
| 4.505.1.A-C (identity) | C: CO-1370, CO-1387, CO-3731. |
| 4.505.2.A-B.4 (SSN through SSA; discrepancy; failure to cooperate) | C: CO-1374, CO-1602, CO-2562. |
| 4.505.3.A-C (residency except BCE; impossible to verify) | C: CO-1375, CO-1603, CO-1586, CO-1313. |
| 4.505.4.A-C (composition; separate elderly-disabled household; child in another household) | C: CO-1383, CO-1607, CO-4179. |
| 4.505.5.A-B (citizenship documents; third-party statement) | C: CO-1371, CO-1372, CO-1306. |
| 4.505.51.A-B (questionable) | C: CO-1307 meaning. |
| 4.505.51.C (ineligible until proof; income prorated) | C: CO-4251, CO-311, CO-2565. |
| 4.505.51.D, 4.505.6.A, C, D, G, H | N/A: documentation, SAVE procedure, notices. |
| 4.505.6.B (SAVE; a member who does not want verification) | C: CO-1373, CO-1366; the last sentence is CO-4687. |
| 4.505.6.E-F, F.1-2, I (30 days or 10 days; ineligible until documented; six-month pending investigation) | C: CO-1617, CO-4154, CO-1601, CO-1366 (`submitted`). |
| 4.505.6.J (decline: ineligible non-citizen; no further efforts) | C: CO-4687 in CO-310, CO-1373, CO-2571; **N3-2** (sponsor items not gated). |
| 4.505.61 intro, A-C (40 quarters verified; means-tested quarters removed) | C: CO-3736, CO-3733, CO-4261, CO-4262. |
| 4.505.7.A.1-4, B-C (sponsor information; ineligible until provided; excluding attributed income; same sponsor) | C: CO-1616, CO-1611, CO-4154, CO-3701, CO-3702; N3-2. |
| 4.505.8, A-E (national disqualification database) | N/A: a match does not delay processing; a confirmed disqualification is stated as CO-039; out-of-state drug felony is not acted on (CO-041). |

### 3.5 Other chapters in scope

| paragraph | disposition |
|---|---|
| 4.609.1-4.609.6 (transitional SNAP) | N/A: continuing an existing certification after a CW closure; case maintenance between determinations. |
| 4.803.3.A (IPV: 12 months, 24 months, permanent) | C: CO-039 (stated as serving). |
| 4.803.3.B-C, E (duplicate benefits 10 years; trafficking; firearms) | C: CO-039. |
| 4.803.3.D (drug convictions only with misuse of SNAP) | C: CO-041, CO-1731. |
| 4.803.44 and the rest of 4.803 (a pending ADH; investigation and hearings) | N/A: the result is CO-039. |

### 3.6 Federal texts the codex follows

| text | disposition |
|---|---|
| 7 U.S.C. 2015(b) (IPV), (k) (fleeing felons), (r) (drug felony), (s) (winnings) | C: CO-039, CO-4683, CO-041, CO-4152. |
| 2015(c) (refusal to cooperate) | C: CO-4267, CO-4680. |
| 2015(d)(1)-(2) (work requirements, exemptions) | C: CO-405, CO-404, CO-401, CO-400, CO-040. |
| 2015(e)(1)-(8) (students) | C: CO-410, CO-411, CO-407, CO-408, CO-409, CO-072 ((e)(3)(B) override). |
| 2015(f) as amended by sec. 10108 | C: CO-308 (OQ-1). |
| 2015(o) as amended by sec. 10102 | C: CO-412, CO-413, CO-4250, CO-414 (OQ-533, OQ-835). |
| 7 U.S.C. 2014(i) (sponsor deeming) | C: CO-2337, CO-3701, CO-3702, CO-3711; N3-2. |
| 7 CFR 271.2 (elderly or disabled member; institution) | C: CO-302, CO-007. |
| 273.1(a), (b)(1)-(2), (b)(7), (c)(3)-(6), (e) | C: CO-305, CO-304, CO-2304, CO-419, CO-2567, CO-2566, CO-3504; (c)(4) foster care, N3-P2-1. |
| 273.2(f)(2), (h), (i) | C: CO-4251, CO-4268 to CO-4270, CO-348, CO-1394. |
| 273.4(a)(6), (b)(1)-(2), (c)(2)-(5) | C: CO-308, CO-1373, CO-4687, CO-4154, CO-3701; (b)(2) with (c)(2), N3-2. |
| 273.5(a), (b)(1)-(11) | C: CO-411, CO-410, CO-4681, CO-072. |
| 273.7(b), (f), (j)(1)-(4), (n) | C: CO-405, CO-040, CO-2318, CO-2313; N3-P2-2. |
| 273.11(c), (k), (m), (n), (s) | C: CO-311, CO-2565 (Fin for proration), CO-041, CO-4683, CO-2563. |
| 273.24(a)-(c), (f) | C: CO-412 to CO-418, CO-4264 (statute where amended). |
| 8 U.S.C. 1611(a), 1612(a)(2), 1613, 1631, 1641(b) | C: CO-308, CO-306, CO-3713, CO-307, CO-3711, CO-3702. |

Size: 197 rows (24 definition rows grouping the terms, 30 in 4.200-4.210, 105 in 4.300-4.313, 17 in 4.500-4.505.8, 5 in the other chapters, 16 federal), covering every numbered paragraph and subparagraph of the listed ranges. Dispositions: 2 P1 (N3-1, N3-2), 2 P2 and 3 P3 attached to rows. Every other row is carried, open-questioned, financial or not applicable with a reason. There are no rows marked GAP: both P1s are carried rows whose item gives a wrong or undetermined answer.

## 4. Open-question confirmations (this family)

| OQ | class in the volume | confirmation |
|---|---|---|
| OQ-1 | blocked on a named document | **Correct.** Probed this pass: `fns.usda.gov/snap/obbb-alien-eligibility` and its Q&A #1 redirect to `www.fna.usda.gov`, which is not an allowed host and serves only the title and a link to `www.usda.gov`. D-5 has no transition clause. N3-P3-1 asks for the note to be refreshed. |
| OQ-12 | state policy choice | **Correct.** 4.206.C.2.a.2 leaves the TANF/MOE service language to the State's forms. |
| OQ-356 | state policy choice | **Correct.** Both readings are Colorado's own text. |
| OQ-533 | blocked on a named document | **Correct.** As OQ-1. CDHS's agency letter is on cdhs.colorado.gov, which is not allowed. |
| OQ-550 | blocked on a named document | **Correct.** The SAVE status list is on uscis.gov. |
| OQ-612 | state policy choice | **Correct.** Neither 273.1 nor 4.304.32 limits a temporary absence. |
| OQ-640 | state policy choice | **Correct.** 4.000.1 and 4.206.C disagree within Colorado's own text. |
| OQ-835 | needs Legal | **Correct.** 4.311.A.4 against amended 2015(o)(3)(C) and 273.24(c)(4) is a reading of law, and the texts were checked. |
| (new) | — | N3-P2-1 asks for a needs-Legal open question on 4.304.3.B.3 against 273.1(c)(4). |

## 5. Earlier P1s: confirmation

| id | result | evidence |
|---|---|---|
| C-1 | holds | CO-4250 in CO-414. CO-150: p1 `eligible`, allotment 550. |
| C-2 | holds | CO-4251 in CO-311, CO-2571, CO-1394 (derivation read). CO-152 re-evaluated. |
| C-3 | holds | CO-007 arms (B), (C). CO-153 re-evaluated. |
| C-4 | holds | CO-4260 in CO-306. CO-154 re-evaluated. |
| C-5 | holds | CO-4262 in CO-307 and CO-2337; CO-2337's precision is updated. |
| C-6 | holds | CO-4253 in CO-309 and CO-2571. |
| C-7 | holds | CO-4263 arm of CO-400. |
| C-8 | holds | CO-2318 not served while CO-405; see N3-P2-2 (no age arm). |
| C-9 | holds | CO-4264 in CO-415. |
| C-10 | holds | CO-4265 in CO-410, with the internship exclusion. |
| C-11 | holds | CO-4266 in CO-4680. |
| C-12 | holds | CO-4254 in CO-1394. |
| C-13 | holds | CO-4268 to CO-4270, CO-2308. |
| C-14 | holds | CO-3711, CO-3702 (OQ-730). |
| N2-1 | holds | CO-4680 is the single list of gates read by CO-386, CO-387, CO-2307 and CO-2308. CO-192 (ZZ-F1): `fdpir_participation`, allotment 0. |
| N2-2 | holds | CO-407 arm with CO-4681 (80). CO-193 (ZZ-S1): `eligible`, 151. |
| N2-3 | holds | CO-072's meaning carries 2015(e)(3)(B) for an E&T placement only. |
| N2-4 | **fixed in CO-007, broken in CO-304** | N3-1. |

The other second-pass dispositions were re-read in their items. N2-P2-1 is OQ-835, and holds. N2-P2-2 is CO-4683 to CO-4685; it holds, and the new facts read as false when not stated, as "must be verified" asks. N2-P2-3 is CO-4687; the arm holds, but the sponsor chain was not gated (N3-2). N2-P2-4 and N2-P2-5 (CO-4265, CO-039) hold. N2-P3-1 to N2-P3-3 and N2-P3-6 hold. N2-P3-4 (CO-4689, CO-4690) holds as written; its legal reading is N3-P2-1. N2-P3-5 (CO-419 on 273.1(b)(2)) holds.
