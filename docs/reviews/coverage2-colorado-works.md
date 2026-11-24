# Coverage review, second pass: Colorado Works (9 CCR 2503-6)

Reviewer pass: second exhaustive coverage matrix, 2026-11-22, on HEAD 65ed7c8 (branch ccr-9d19bf4c-wmnwcl), after the coverage fix round recorded in docs/reviews/coverage-colorado-works.md section 7.

Governing text: 9 CCR 2503-6, rule version 12030, effective 07/01/2025 (volumes/co/documents/D-81.md; 3.602.1 is also in D-104). The 2021 poverty guidelines that 3.601 adopts are D-295.

Method: I built this matrix from the D-81 text, without reusing the first pass's rows. It covers 3.601 (as used), 3.602.1, 3.604.1-3.604.5, 3.605.1-3.605.5, 3.606.1-3.606.8, the sanction rules of 3.607-3.608 and 3.609.2. Every condition-level paragraph is mapped. For each carried row I read the item's derivation (`derived_english` in a scratch export, `conformance/co/ledger.json`, 2,143 items, 184 of them Colorado Works) against the paragraph. I checked conditions, boundaries ("less than", "at most", "more than"), periods, rounding and who each rule applies to. Each suspected wrong answer was probed with scratch households appended to a scratch copy's `volumes/co/tests/cases.yaml` (from CO-160 and CO-164) and evaluated with `npx vite-node scripts/eval-case.ts co <case> ...`. The generators are in the session scratchpad (`cw2tools/mk.py`, `cw2tools/mk2.py`).

## 1. Verdict

**2 P1 found** (CW2-1, CW2-2). Both are regressions left by the first fix round. The CW-7 fix accepts an unrelated caretaker without the county approval that N.3.a requires. The CW-5 and CW-6 fixes narrowed who is deemed (CO-909) but not whose needs are deducted (CO-2000). There are also 3 P2s and 2 P3s. All 14 first-pass P1s stay fixed (section 5).

## 2. Findings

| id | sev | paragraph | item(s) | quoted text | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| CW2-1 | **P1** | 3.604.2.N.3.a (with N.1) | cw_minor_parent_living_arrangement_met CO-906, cw_eligibility_status CO-921 | N.3.a: "If the minor parent lives with an unrelated non-parent caretaker who chooses not to be a member of the assistance unit, the minor must be in a county approved setting." | The CW-7 fix added a disjunct: any adult who is a relative **or her caretaker** (she is the child, ward or in the primary care of that person), living in the home. That disjunct is met by an *unrelated* caretaker who does not join, so N.3.a's approval requirement is never applied. CO-906's precision misreads N.3.a as "an unrelated adult who is **not her caretaker**". **Repro ZQ-1**: an unmarried, non-emancipated 16-year-old mother and her baby live with an unrelated adult who has primary responsibility for her. The adult does not request inclusion, and `county_approved_living_arrangement` is false. Model: CO-906 true, both `eligible`, $238 for October ($362 for a full month). Rule: no grant payment until the county approves the setting. | In CO-906's caretaker disjunct, accept a caretaker only when the caretaker is related to her (is_related_to), is her parent, or is in her assistance unit. The last case is N.3.b, where the county "may choose" to require approval. Record that county option in an open question or a supplied finding. Then correct the precision and add a test (CO-906-T8) and a household case from ZQ-1. |
| CW2-2 | **P1** | 3.605.1.A.4.a | cw_minor_parent_deeming_needs_deduction CO-2000, cw_deemed_parent_income_of_minor_parent CO-909 | "The needs of the stepparent or parent of the minor parent, and the needs of individuals **living in the home** for whom the stepparent or parent are responsible shall be deducted". A.4.a also deems only "a **non-participant** parent(s) ... who is **living in the same home**". | CO-2000 picks the Two Caretakers row when the case lists two parents of the minor, wherever they live and whether or not they are in her unit. It counts every sibling in the case, wherever the sibling lives. The CW-5 and CW-6 fixes narrowed CO-909's deemed parents to non-members in the home, but CO-2000 was not changed. CO-2000's own meaning says "the parent or parents living in the home". **Repro ZQ-2**: a 16-year-old mother and her baby live in h1 with her mother, who has $600 wages and does not join. Her father lives in h2 with no income. Model: needs $357 (Two Caretakers, 0), deemed $153 < $245, `eligible`, $137 for October. Rule: one non-participant parent in the home, so needs are $253 (One Caretaker, 0) and $600 − $90 − $253 = $257 ≥ $245, giving `ineligible_income`. ZQ-3, the same household without the father, gives $257 and `ineligible_income`. The same error inflates the needs when one parent has joined the minor's unit (3.604.2.C.2.g) and the other has not. | Build CO-2000's caretaker count from the parents CO-909 deems (not in the unit, lives_with, considered living in the home). Count only siblings living in that home. Add a test and a household case from ZQ-2. Update OQ-102's note on the deducted persons. |
| CW2-3 | P2 | 3.608.4.C.1, D; 3.609.2.A.1.e | cw_sanction_reduction CO-1265, cw_grant_amount CO-914 | C.1: "second and third instance of sanction shall be twenty five percent (25%) of an assistance unit's grant payment". D: a client who "reapplies ... within the calendar month that they are serving a sanction ... must serve the sanction by having a reduction". A.1.e: "Subtract from authorized grant amount for the partial month any appropriate deductions". | In a prorated initial month (the D reapplication case), CO-1265 takes 25% of the **full-month** grant and CO-914 subtracts it from the prorated grant. For a $488 grant and 11 days (.36164): $176.48 − $122 = $54, against $132 if the 25% is of the partial-month payment. Neither the text nor any open question settles the base. | Record a state policy choice (25% of the full-month or of the partial-month grant), or compute the 25% on the partial grant. |
| CW2-4 | P2 | 3.605.3.A.4 vs 3.605.4.B.26 | cw_excluded_unearned_income CO-2341, educational_assistance_received CO-3360 | A.4: "VA educational assistance (G.I. Bill) payments or any other benefits which are conditional upon school attendance are income to the extent that they exceed expenses necessary for school attendance." B.26: "Educational grants, loans, stipends, and/or scholarships" are exempt. | CO-3360's meaning includes "veterans' educational benefits", and CO-2341 excludes all of it. A.4's counting of the excess over school expenses is never applied, and the conflict between A.4 and B.26 is not recorded. | Record the reading as an open question (state policy choice). Alternatively, add a neutral school-attendance-expense fact and count VA and other attendance-conditional benefits above it. |
| CW2-5 | P2 | 3.604.2.L.1, M.1-4 | cw_eligibility_status CO-921 (read by af_barred_by_colorado_works CO-1511, cw_is_work_eligible_individual CO-919) | L: "The following individuals shall not be eligible under Colorado Works: 1. Fugitives or fleeing felons". M: disqualified persons "shall be removed from the assistance unit". | CO-921 reports `ineligible_status` for a member who fails status, but it does not read cw_is_disqualified_member (CO-928). A fleeing felon, a member serving an IPV disqualification or a member who has not applied for an SSN therefore gets `eligible`. CO-2561 (`ineligible_member_ipv_or_fleeing_felon`, `ineligible_member_ssn`) and CO-2351 (size) are right, so the grant is right. CO-1511 then reads the disqualified person as CW-eligible. | Add a person-level CO-921 branch, `ineligible_disqualified`, on CO-928 after the status check. Check CO-1511's reading against 9 CCR 2503-5 3.520.71.F.2. |
| P3-1 | P3 | 3.606.7.F.2.c | OQ-354 | — | OQ-354 still says that voluntary contributions by the responsible party "are not modeled". CW-19 added burial_contributions_from_responsible_persons (CO-4373) to CO-1508. | Update OQ-354. |
| P3-2 | P3 | 3.605.1.A.4.a (stepparent) | cw_budgetary_member_deemed_income CO-2353 | — | The stepparent's needs deduction counts his children excluded from the unit with no in-home test. Such a child living elsewhere (for example on SSI) adds to the needs. This is rare. | Add lives_with to the filter, the same fix as CW2-2. |

## 3. Coverage matrix

Legend: **C** = carried by (derivation read against the text; a mismatch is a finding); **N/A** = not applicable (reason); **OQ** = open question; **GAP** = no item and no recorded reason. "Notes" = docs/colorado-notes.md.

### 3.600 and 3.601 Administration and definitions
| ¶ | disposition |
|---|---|
| 3.600.1-3.600.5 performance contracts, county policies, contracting, pilots, oversight | N/A: State and county administration |
| 3.601 "Dependent child" (under 18; 18 and a full-time secondary student finishing before 19; resides with a caretaker) | C: cw_is_dependent_child CO-901 (age and student test); residing with a caretaker through CO-900, CO-2608, and a minor parent on her own through CO-4352 |
| 3.601 "Parent" includes an expectant parent | C: CO-921, CO-900, CO-1260 (is_pregnant) |
| 3.601 "Federal Poverty Guidelines" = 86 FR 7732 (2021), no later editions | C: CO-4350, CO-4351 (values checked against D-295) read by CO-2364 |
| 3.601 inmate, fleeing felon, good cause, assessed need, collateral contact, prudent person, other definitions | C where read (CO-3802 inmate; is_fleeing_felon in CO-928; good cause as supplied findings); otherwise N/A: definitions with no separate condition |

### 3.602.1 Applications
| ¶ | disposition |
|---|---|
| A.1-5 apply without delay, no pre-screening, withdrawal | N/A: procedure |
| B-D administrative review, general information, release of information | N/A: procedure |
| E.1-5 receiving applications, interviews, an application in any county | N/A: procedure |
| E.6 only a caretaker with whom a dependent child lives may apply | C: CO-921 first check (no dependent child and no pregnancy gives ineligible_no_dependent_child) |
| F.1-2 minimum application | N/A: procedure |
| F.3 date of application = first working day a signed application is received | C: cw_application_date CO-2372 (supplied) read by CO-4358 |
| G-H information sharing, confidentiality | N/A |
| I 45-day processing; I.1 application for all programs | N/A: county timeliness |
| I.2 eleven days for verification; twentieth day after application on good cause | C: CO-1351 (11), CO-2371 (20), CO-1426; the K.1.c ten days are OQ-770 |
| I.3.a-d 30 days of validity after a denial; the application date on reuse | C in part: the stated cw_application_date; the reuse rules are N/A (procedure, the date is supplied) |
| I.4 one interview | N/A |
| J immunization information | N/A |
| K.1 denial reasons (failure to cooperate, ten days) | C: CO-1427 past_due; OQ-770 |
| K.2-3 withdrawal, other case actions | N/A: notice and case actions |
| 3.602.2 voter registration | N/A |

### 3.603 Case files
| ¶ | disposition |
|---|---|
| 3.603.1 | N/A: records management |

### 3.604.1 Eligibility criteria
| ¶ | disposition |
|---|---|
| A, A.1-2 resident, no durational requirement, retained until abandoned | C: CO-904 (is_colorado_resident) |
| A.3 TANF from another State in the month | C: CO-904 (received_tanf_from_another_state_this_month CO-842) |
| B.1-3 citizen, pre-1996 qualified, five-year bar and 1613(b) exceptions | C: CO-4005, which reads meets_public_assistance_citizenship_requirement CO-905 and the trafficking victim |
| C member of a unit meeting income and verification requirements; a noncustodial parent gets services only | C: CO-913, CO-1427, CO-4372; the noncustodial parent is N/A (services, no cash) |
| D TB or mental-disease institution patient, except a child with under-21 psychiatric care under Medicaid | C: CO-3802 (exception through a dependent child, not a TB hospital, enrolled in Medical Assistance) |
| E inmate; patient in a public medical institution, work release and court monitoring are not inmates | C: CO-3802 |
| F.1-4 no USCIS status, voluntary departure, status applicants, temporary visas | C: CO-905 or CO-4005 (status not qualified) |

### 3.604.2 Household composition
| ¶ | disposition |
|---|---|
| A.1 the unit lives together and applies as one | C: CO-900 (lives_with and the absence rules) |
| A.1 separate units for persons not required together | C: CO-900 closure (only required and requesting optional members join) |
| A.2 budgetary unit | C: CO-2352 |
| A.3 verification of composition | C: CO-1421, CO-1648 |
| B MOE versus TANF funding | N/A: funding source |
| C.1.a dependent children in the caretaker's home | C: CO-900, CO-2608 |
| C.1.b parents in the home, unless a minor parent requests for her own child or custody lies elsewhere | C: CO-900 (the edge is not crossed when the minor requests for her own child), CO-2347 (custody elsewhere is optional) |
| C.1.c siblings legally in the caretaker's care | C: CO-900 (through the common caretaker) |
| C.1.d half siblings without child support | C: CO-900; CO-2842 makes the supported half sibling optional |
| C.1.e spouse of a pregnant parent | C: CO-900 (spouse edge when pregnant) |
| C.2.a-g optional members join on request | C: CO-2349, CO-2347, CO-2842, CO-2346, CO-2350, CO-2558; C.2.g, the minor parent's parents, through CO-900 and CO-2346 |
| C.3.a-b SSI and Title IV excluded | C: CO-2350, CO-841 |
| D.1.a-e budgetary unit (unit members, the caretaker's spouse, unborn child, non-recipient parents of a minor parent, sponsor) | C: CO-2352 (a, b), CO-1260 and is_pregnant (c, the allowance), CO-909 (d), CO-2365 (e) |
| D.2.a-b exclusions from the budgetary unit | C: CO-2352 (optional members not requesting are outside; SSI and Title IV are excluded) |
| E.1-4 a child is still in the home (medical treatment, court jurisdiction, agency custody, school away) | C: CO-3354 |
| F school attendance of school-aged children | C: CO-1422, CO-1652 (verification). The attendance duty has no sanction in the rule, so N/A beyond verification |
| G.1-3 absences over 45 days (medical or education, parenting plan up to 6 months, voluntary foster care up to 3 months) | C: CO-3354, CO-3356 (6), CO-3357 (3); other reasons are OQ-611 |
| H caretaker hierarchy | deferred P2 (first pass CW-18, reason in Notes) |
| I.1-3 a caretaker temporarily away (military, medical treatment, under 45 days with intent to return) | C: CO-3354 ("less than" 45, CO-3355) |
| J tribal members | OQ-772 |
| K refugees, CRSP referral and assessment | C: the status part through CO-905. K.1-3 are N/A (case management) |
| L.1 fleeing felons | C: CO-928 and CO-2351 (size), CO-2561; CO-921 ineligible_disqualified, read by CO-1511 (CW2-5 fixed) |
| L.2 a unit with an adult on strike | C: CO-3808 in CO-921 |
| L.3 five-year bar | C: CO-905 |
| M disqualified members leave the size; income counted without disregards; the month counts toward 60 | C: CO-2351, CO-910 and CO-923 (OQ-490: A.6 governs status and SSN), CO-840 (supplied count); OQ-143 |
| M.1-2 ten years; IPV 12, 24 or lifetime | C: cw_is_serving_ipv_disqualification CO-1730 (supplied period) |
| M.3 fleeing felon while the definition is met | C: is_fleeing_felon in CO-928 |
| M.4 failure to apply for an SSN | C: CO-2348 in CO-928 and CO-2557 |
| M.6 non-qualified non-citizens, failure to prove status | C: CO-4005 in CO-928; verification through CO-4372 |
| N (preamble) a minor parent may apply | C: CO-900 |
| N.1 unmarried, non-emancipated: grant only with another adult caretaker or in a county-approved setting | C: CO-906 in CO-921 (the unit is barred) |
| N.1.a county assists in finding a setting | N/A |
| N.1.b education participation within 60 days; failure without good cause ends BCA | C: CO-4353 (closed_minor_parent_education) |
| N.2.a not in a caretaker's home: approval, unless emancipated, not single, or living with an adult relative | C: CO-906 |
| N.2.b emancipated or married: not in a caretaker's home | C: CO-4352 |
| N.2.c assisted as an adult | C: CO-4352 in CO-926, CO-927, CO-924, CO-916, CO-3808 |
| N.3.a unrelated non-parent caretaker who does not join: approval required | C: CO-906 (an unrelated caretaker counts only as a member of her unit; otherwise county_approved_living_arrangement), case CO-190 (CW2-1 fixed) |
| N.3.b unrelated caretaker who joins: county option | C: CO-906 (accepted without approval); the county option is OQ-830 |
| N.3.c living with her parent needs no approval | C: CO-906 |
| N.3.d a dependent child of a caretaker is assisted as a child | C: CO-900, CO-4352 (not assisted as an adult when in a caretaker's home) |
| O.1 out of State up to 90 consecutive days | C: CO-904 ("at most" 90), CO-2351 and CO-2561 ("more than" 90) |
| O.2 institution resident (30 days) not in the home, unless the child is with them or cared for in the home | C: CO-3804 ("at least" 30), CO-3805, CO-3354; OQ-660 |

### 3.604.3 Verification
| ¶ | disposition |
|---|---|
| A no documents before a signed application; client's responsibility; collateral contact | N/A: procedure |
| A.1-3 the request: list, eleven-day due date, notice | C: CO-1351, CO-1426 |
| A (last paragraphs) failure to verify may deny; verification continues for the life of the case | C: CO-1427 (past_due) |
| B.1 IEVS; no delay pending IEVS | C: the electronic-source facts in CO-1644-CO-1654 |
| B.2.a lawful presence | C: CO-1420, CO-1644 |
| B.2.b citizenship or qualified status | C: CO-1645, CO-1646; OQ-314 |
| B.2.c SSN or proof of application; ineligibility only for that client | C: CO-1647, CO-2348, CO-2557 |
| B.2.c eight-month validity of the proof of application | deferred P2 (first pass CW-25, reason in Notes) |
| B.2.c.1-4 SSN by the next recertification; SOLQ | C: CO-1647 (redetermination branch); SOLQ is N/A |
| B.2.d caretaker responsibility (not for a parent) | C: CO-1421, CO-1648 |
| B.2.e income of every member whose income is used | C: CO-3881, CO-3879, CO-3880, CO-1649, CO-2588 |
| B.2.f residency | C: CO-1651 |
| B.3 questionable information | C: questionable-flag facts in the pending items |
| B.4 extension beyond 45 days | C: cw_verification_extended_due_date CO-2373 |
| B.5 SAVE, no delay | C: CO-1646 |
| C.1 relationship | C: CO-1648 |
| C.2 good cause | N/A: supplied findings |
| C.3 child support | N/A: procedure (child support is read from facts) |
| C.4 school attendance | C: CO-1422, CO-1652 |
| C.5 work participation | N/A: workforce case management |
| C.6 allowable absences | N/A: the absence facts are stated |
| C.7 pregnancy when no children are in the unit | C: CO-1423, CO-1653 |
| D-G sources, collateral contacts, prudent person | N/A: procedure |
| G lawful presence cannot be waived over 18 | C: CO-1420 |
| H.1 IEVS: DOLE wages not verified on receipt | C: wage verification in CO-1649 (an electronic wage match does not verify) |
| H.2-4 PARIS, SAVE, DMV | N/A or C through CO-842 and CO-1646 |
| I.1-3 citizenship documents; ineligible until proof | C: CO-1645, document acceptability items; OQ-376 |
| I.4 lawful presence for 18 and over; exemptions (pregnant; 18 to under 19 still on Medicaid) | C: CO-1420 |
| I.4.a documents | C: CO-1367 |
| I.5-6 immigrant documents, SAVE | C: CO-1646 |
| J.1 sponsor income information | C: CO-1654 |
| K thirty days for status, lawful presence, identity and SSN; members unable to verify are not paid and their income is counted | C: CO-1598 (30), CO-1656, CO-4372 in CO-2351 and CO-2561, CO-1427 members_excluded; income through CO-910 |

### 3.604.4-3.604.5 Child support, FVO
| ¶ | disposition |
|---|---|
| 3.604.4.A assignment is a condition; refusal bars the unit; non-cooperation without good cause ends BCA | C: CO-3809, CO-3810, CO-3811 in CO-921 |
| A.1-4 good cause claims and review | N/A: county findings (CO-3810 is stated net of good cause) |
| B BCA is UPA | N/A |
| C reinstatement when child support was not received or was below need | N/A: the month is determined from that month's facts (application-month child support through CO-2553) |
| 3.604.5.A.1.a-c FVO waiver of work, the time clock and child support | C: the time-clock part through has_domestic_violence_extension_approved CO-846 in CO-925; the work and child support parts are N/A (county waivers, entered as stated findings) |
| 3.604.5.B-C FVO policies, training, screening, appeal | N/A: county administration |

### 3.605.1 Income
| ¶ | disposition |
|---|---|
| A all countable gross income of the assistance and budgetary units | C: CO-910, CO-923 |
| A.1 prior month and month of application | OQ-771 |
| A.2 availability; received means legally available | C: fact convention (R-1, gross received in the month) |
| A.3.a-b securing potential income | N/A: procedure |
| A.3.c-d refusal: income considered as if available | C: CO-4362 in CO-908 and CO-2554 |
| A.4.a stepparent: gross earned − $90 − maintenance and support paid − payments to tax dependents outside + unearned − needs | C: CO-2353 (OQ-102 for "needs"; his excluded children in the home only, P3-2 fixed) |
| A.4.a non-participant parent of an unmarried minor parent in the same home: the same formula | C: CO-909 and CO-2000 both read cw_minor_parent_deemed_parents (CO-4660); case CO-191 (CW2-2 fixed) |
| A.4.b parents in the same home attributed | C: CO-909 |
| A.5.a sponsor and sponsor's spouse deemed | C: CO-2365 (sponsors and non-cosigning spouses) |
| A.5.b net income: gross earned − lesser of 20% or $175 − support to dependents outside + unearned; rebuttal | C: CO-2365 (rate 0.2, cap 175), CO-2361 in CO-2364 |
| A.5.c.1 non-LPR qualified non-citizen | C: CO-2364 (LPR only) |
| A.5.c.2 adjusted from refugee or asylee | C: CO-2364 (status_before_lpr_adjustment) |
| A.5.c.3 sponsorship before 12/19/1997 | C: is_sponsored_non_citizen CO-1573 (meaning: an I-864 on or after 12/19/1997) |
| A.5.c.4 battery or extreme cruelty | C: CO-2364 |
| A.5.c.5 combined income "less than" 125% of the 2021 guidelines | C: CO-2364 (deeming when "at least"; the D-295 table; size CO-2360) |
| A.5.c.6 forty quarters | C: CO-2364 ("less than" 40 to deem) |
| A.5.c.7 affidavit other than I-864 | C: CO-1573 (stated false) |
| A.5.d recovery from the sponsor | N/A: recovery |
| A.6 disqualified members' net income (gross − disregards + unearned) | C: CO-910, CO-923 (status and SSN: − $90; OQ-490) |
| B income expected in the application month and later | C: the month's facts |

### 3.605.2 Earned income
| ¶ | disposition |
|---|---|
| A earned in-kind (shelter or items in lieu of wages) | C: in_kind_earned_compensation_value CO-4360 in CO-1716 |
| B.1-2 diverted or garnished wages still count; paid when paid; held wages | C: fact convention (wages_gross is gross) |
| C short-term (90 days or less) and subsidized employment not counted unless ended through own fault | C: CO-2340 (short_term_employment_wages, subsidized_employment_wages, own-fault flag) |
| D.1-2 earned income against the need standard after disregards | C: CO-907, CO-922 |
| D.3 HCA payment is earned income to the care provider | C: fact convention (wages); OQ-700 for the allowance itself |
| D.4 earnings of a dependent child who is not a student count | C: CO-3385 (disregard only for students) |
| E.1.a self-employment net profit; listed expenses; no depreciation or principal | C: CO-1705, CO-1706 |
| E.1.b day care provider $55 first child, $22 each additional, or actual costs if higher | C: CO-3376, CO-3377 in CO-1705 |
| E.1.c-d net profit treated as earned; ledger as verification | C: CO-1716; N/A (verification source) |
| E.2-3 regular in the month received; irregular averaged over 12 months | C: fact convention (CO-1706 precision) |
| E.4.a farm income in the month received | C: fact convention |
| E.4.b rental income as self-employment at 20 hours a week | C: fact convention (other_unearned_income_taxable is passive rent) |
| E.4.c-e board, room, and room and board above the one-person allotment and documented costs | C: CO-4361 (room-only uses the costs only) in CO-1716 |
| F.1-3 donated in-kind earned income | C: CO-4360 (going-rate valuation in the meaning) |
| G in-kind in exchange for employment, market value | C: CO-4360 |

### 3.605.3 Countable unearned income
| ¶ | disposition |
|---|---|
| A preamble: any gain or benefit not earned | C: CO-908 and CO-2554 sum every unearned fact |
| A.1, A.3, A.7, A.9-10, A.12-13, A.15-20 | C: CO-908 components (pension, Social Security, unemployment, other unearned taxable and nontaxable, interest); loans: bona fide loans are exempt (B.1, CO-2341 loan_proceeds_received); inheritances count as other unearned |
| A.2 rent above expenses | C: CO-4364 in CO-4369 |
| A.4 VA educational assistance above school expenses | C: CO-2341 (school_attendance_conditional_benefits_received CO-4661 above school_attendance_expenses_paid CO-4662 counts; CW2-4 fixed) |
| A.5-6 insurance and injury proceeds above last-illness, burial or medical costs | C: CO-4365 in CO-4369 |
| A.8 jointly owned property | C: fact convention (the person's share) |
| A.11 stepparent and sponsor attributable income | C: CO-2353, CO-2365 |
| A.14 gifts or prizes | C: lottery_gambling_winnings_received in CO-908 and CO-2554; sponsor gifts CO-4363 |
| B.1-3, B.5-8 periodic payments | C: CO-908 components; B.5's dependent portion by fact convention |
| B.4 workers' compensation less medical and legal expenses | C: CO-4366 in CO-4369 |
| B.9 SMIB counted gross; lump-sum SMIB refund exempt | C: CO-4370 in CO-4369 |
| B.10 military allotment | C as unearned; the non-recipient's excess over need is not modeled (rare, first pass) |

### 3.605.4 Exempt income
| ¶ | disposition |
|---|---|
| A.1 tax refunds; EITC in the month and the next | C: tax_refunds_and_credits_received in CO-2341 (in the next month the EITC is not income) |
| A.2 third-party medical or social service payments | C: fact convention (not received by the client) |
| A.3 one-time emergency assistance | C: general_or_emergency_assistance_received in CO-2341 |
| A.4 home energy assistance | C: energy_assistance_received in CO-2341 |
| A.5 personal and home care allowances | C: in_home_care_allowance_received in CO-2341; OQ-700 |
| A.6 VA Aid and Attendance used for uncovered care | C: CO-2341 |
| A.7 General Assistance | C: CO-2341 (FC-2) |
| A.8 crime victims compensation | C: CO-2341 |
| B.1 bona fide loan | C: loan_proceeds_received in CO-2341 |
| B.2-3, B.7-8, B.10, B.12, B.14, B.17, B.19, B.23 federal-statute exclusions (OAA nutrition, WIC and school meals, Indian judgment funds, ANCSA up to $2,000, disaster aid, volunteer payments, YEDPA, RECA, Nazi persecution, spina bifida) | C: federally_excluded_payments_received CO-3366 in CO-2341 |
| B.4 home produce | N/A: not received as money |
| B.5 URA relocation (6 months) | C: CO-3366 |
| B.6 EHAP | N/A: recorded in Notes (CW-22) |
| B.9 assistance for items outside the need standard | N/A: recorded in Notes (CW-22) |
| B.11, B.27, B.32 Title IV foster or kinship, SSI and adoption subsidy: excluded and income exempt | C: CO-2350, CO-841 (outside the unit, so not summed) |
| B.13, B.16 WIOA training allowances and income | C: workforce_program_payments_received in CO-2341 |
| B.15 PASS | C: pass_set_aside_income in CO-2341 |
| B.18 reimbursements | C: expense_reimbursements_received in CO-2341 |
| B.20-22, B.25 IDA, retirement, health and educational savings distributions | C: savings_account_distributions_received CO-3816 in CO-2341 |
| B.24.a work-study | C: work_study_earnings in CO-2340 |
| B.24.b student dependent child's earnings | C: CO-3385 (full-time, or part-time under 130 hours); OQ-613 |
| B.26 educational grants, loans, scholarships | C: educational_assistance_received in CO-2341 (see CW2-4) |
| B.28-30 refugee R&P and CRSP Interim Cash Payment; insurance cash value | C: CO-4367, CO-4368 in CO-4369 |
| B.31 LEAP | C: energy_assistance_received |
| B.33 lump sums: exempt kinds stay exempt; designated amounts excluded | C: CO-4365 in CO-4369 |
| B.34 tax credits | C: tax_refunds_and_credits_received |
| B.35 subsidized employment wages | C: CO-2340 |

### 3.605.5 Child support
| ¶ | disposition |
|---|---|
| A counted for eligibility at application | C: CO-2553 (current support, net of arrears) in CO-908 |
| B excluded from the grant | C: CO-2554 omits child support |
| C.1 consistent = received in all 6 of the 6 previous months | C: CO-2550, CO-2556 (6) |
| C.2 6-month average; "$500 or less" disregarded, "over $500" counted | C: CO-2551, CO-2552, CO-2553 ("more than" 500) |
| C.3 disregarded in the grant | C: CO-2554 |
| D arrears exempt | C: child_support_arrears_received subtracted in CO-2551 and CO-2553 |

### 3.606.1-3.606.2 Standards, computation and disregards
| ¶ | disposition |
|---|---|
| A-D BCA payment, UPA, unrestricted payment, vendor payments | N/A |
| E six-month certification; income in the month of application and the period | C: CO-1501 (first certification period), the month's facts |
| F standards chart (no caretaker, one, two; each additional 67 and 90) | C: CO-274, CO-351, CO-353, CO-276, CO-352, CO-354, CO-275, CO-277 (values checked); CO-911, CO-912 with CO-926 and CO-927; more than two caretakers is OQ-101; after 2028-07-01 is OQ-530 |
| G $10 pregnancy allowance through the month the pregnancy ends | C: CO-355 in CO-1260 |
| H "shall not exceed" vs J.4 "equals or exceeds" | C: CO-913 ("less than"); OQ-153 |
| I.1-3 grant = grant standard − (earned − disregards + unearned) | C: CO-1260 with CO-923 |
| J.1-4 reported earnings compared with need | C: CO-907 (a recipient uses the payment disregards), CO-913 |
| K.1-2 drop the cents | C: CO-1260 and CO-914 (rounded down) |
| 3.606.2 preamble: disqualified individuals' earnings excluded from the disregards | C: CO-910 and CO-923; OQ-490 |
| 3.606.2.A.1 $90 at application against need; 100% in the first certification period; 67% after | C: CO-907 (90), CO-922 (1.0, 0.67), CO-1501; OQ-105 |
| A.2.a-b new source 100% for its first certification period; current source 67% | C: CO-922, CO-1502, CO-2374; OQ-350 |

### 3.606.3-3.606.5 Changes, redetermination, county moves
| ¶ | disposition |
|---|---|
| 3.606.3 (preamble), A.1-2, B.1-4 | N/A: effective dates between determinations, recorded in Notes (CW-17); the reporting standard (need / .33) has no eligibility effect |
| C (preamble) the certification period does not guarantee eligibility | C: each month is determined on its facts |
| C.1.a-g negative changes (income over need, a member leaves, the only child leaves, a pregnancy ends, an 18-year-old stops school, death, sanctions, IPV) | C: the month's facts through CO-913, CO-900, CO-901, CO-921 (death), CO-1264, CO-1730; timing is N/A (Notes, CW-17) |
| C.2.a-e positive changes; a newborn is added from the month of birth | C: the month's facts (date_of_birth); timing is N/A |
| C.3 net of simultaneous changes | N/A: timing |
| D questionable information during the period | C: the pending items |
| 3.606.4.A-I redetermination filing, interview, reopening and reinstatement | N/A: procedure; the redetermination flag CO-2375 selects the child support rule |
| 3.606.5 county moves | N/A: eligibility continues; no condition |

### 3.606.6 Time limits
| ¶ | disposition |
|---|---|
| A months of BCA count for every adult member, eligible or not; 60 cumulative months | C: CO-915 (no headship gate, CW-3 fixed), CO-924, CO-918 ("at least" 60, CO-278) |
| B months with a sanction-reduced payment count | C: the supplied count CO-840 |
| C a unit with an individual who received 60 or more adult months is ineligible without an extension; units with disqualified members cannot be extended | C: CO-918, CO-925 (disqualified members bar the extension) |
| C.1-4, C.7 notices, requests, 30-day decisions, appeals, meetings | N/A: procedure |
| C.5 extensions of up to 6 months, renewable | C: CO-846, CO-847 (the approved extension is stated for the month) |
| C.6 a new request after the lapse | C: as C.5 |
| D.1-4 hardship reasons | C: CO-847 (a county finding) |
| E domestic violence extension | C: CO-846 |
| F Indian Country or Alaska Native village months (50% not employed) not counted | C: CO-1723 in CO-915 |
| G 20% statewide cap | OQ-142 (resolved: a condition on the county's grant, recorded in the extension facts) |

### 3.606.7 Funeral, burial and cremation
| ¶ | disposition |
|---|---|
| A.1 not an entitlement; levels within the appropriation | N/A |
| A.2 at most $1,500; combined charges not over $2,500 | C: CO-1505, CO-1506 in CO-1508 ("at most" 2,500) |
| A.3 stillbirth documentation | N/A |
| B.1 deceased client who received Colorado Works | C: CO-1504 |
| B.2 estate insufficient | C: decedent_estate_value in CO-1508 |
| B.3 county authorization | N/A |
| B.4, E, F.1 last paragraph: over $2,500, nothing | C: CO-1508 |
| C.1-17, D items and arrangements | N/A: authorization detail |
| F.1 application and choice of disposition | N/A |
| F.2.a-b family preference; estate and responsible persons | C: CO-1508 |
| F.2.c responsible person's resources over $2,000 or $3,000; voluntary contributions | C: af_burial_responsible_person_excess_resources and CO-4373 in CO-1508; OQ-354 (P3-1 fixed) |
| F.2.d prepaid plot of $2,000 or less excluded from the charges | C: burial_plot_cost_excluded_from_limit |
| F.2.e SS lump-sum death benefit not used | C: not read (correct) |
| F.2.f insurance to beneficiaries reduces | C: burial_insurance_proceeds; order OQ-354 |
| F.2.g non-responsible contributions do not reduce the benefit | C: not read (correct) |
| F.3, G unlocated family; provider agreement | N/A |

### 3.606.8 Diversion and other assistance
| ¶ | disposition |
|---|---|
| A (preamble) a specific crisis; up to 4 months | C: has_specific_crisis_need CO-1267 in CO-1270; the 4 months is N/A (the county's payment design) |
| A.1 no need for long-term or basic cash assistance | C: CO-1266 in CO-1270 |
| A.2-3 a specific need; the agreement | C: CO-1267; N/A (documentation) |
| A.4 POI, not longer than the equivalent grant | C: CO-1269 in CO-1270 and CO-921; the bound is in OQ-252 |
| A.5 the county may end the POI or grant BCA | C: CO-1269 meaning (a county grant of BCA ends the POI) |
| A.6 eligible for BCA, or the county's higher income limit within the State plan | C: CO-1270 (eligible, or ineligible_income with CO-1268); the cap is OQ-531 |
| A.6 no assignment; the payment does not count toward the time limit | N/A: no item counts diversion months |
| A.7 no diversion in a month with BCA | C: CO-1270 (tanf_cash_income) |
| B.1-3 supportive payments | N/A: recorded in Notes (FC-20) |
| C Family Preservation | N/A: recorded in Notes (P2-5) |
| D other assistance | N/A: recorded in Notes (C-4) |
| E county-funded unmet needs are not income | C: falls in no counted fact (county assistance outside the standards) |

### 3.607-3.608 Workforce development and sanctions
| ¶ | disposition |
|---|---|
| 3.607.1.A work eligible individuals | C: CO-919 (informational; P3-4 fixed) |
| 3.607.2-3.607.4 screening, assessment, agreement | N/A: case management |
| 3.607.5 failure to participate before the first IP is Demonstrable Evidence and closes the grant | C: CO-4353 (closed_demonstrable_evidence) |
| 3.608.1-3.608.2 case management, work activities, hours | C informational: CO-920, CO-2885, CO-280, CO-281; OQ-104 |
| 3.608.3 re-engagement and good cause | N/A: county findings in the sanction level |
| 3.608.4.A sanctions follow county moves | C: work_sanction_level_served CO-1261 (supplied) |
| B other States' sanctions not recognized | C: CO-1261's meaning |
| C.1 $1 first level; 25% second and third, one month each | C: CO-1262, CO-1263, CO-1265 (the partial payment in a prorated month, OQ-831; CW2-3) |
| C.2 fourth level: 100%, closed one month | C: CO-1265 and CO-921 sanction_closure |
| D-E serving; a break of one month serves it; the next level | C: CO-1261 (supplied level) |
| F one level per case, the highest | C: CO-1264 |
| G re-engagement stops progression | C: CO-1261 |
| 3.608.5 appeal | N/A |

### 3.609 Notice and payments
| ¶ | disposition |
|---|---|
| 3.609.1 notice | N/A |
| 3.609.2.A issuance schedule | N/A |
| A.1 initial payment from the application date (or the later eligibility date) | C: CO-4358, CO-4359 |
| A.1.a-d grant × the day factor | C: CO-4355 (table checked: 1-30 days), CO-4358, CO-914 |
| A.1.e under $10 nothing; after deductions under $10 paid unless under $1 | C: CO-4356, CO-4357 in CO-914 |
| A.2 prospective eligibility and payment | C: the month's facts |
| B ineligible payments, claims | N/A |
| C.1-2 eligibility ends at death; dying before the first day ends the next month | C: CO-921 ineligible_deceased |
| C.3 payment held for the personal representative | N/A |
| D cents dropped on every payment | C: CO-914 |
| E-F, H unrestricted use, holds, expunging, reissue | N/A |
| G underpayments; offset against claims; $1 floor | N/A: correction procedure (CO-4371 keeps a retroactive CW payment out of income) |
| J.3-4 continued EBT misuse: denial or discontinuation for one month | C: CO-4353 (closed_ebt_misuse) |
| 3.609.3-3.609.4 overpayments and recovery | N/A |
| 3.609.5 IPV procedure and periods | C: the period through CO-1730 (supplied); procedure N/A |
| 3.609.6-3.609.75 disputes, hearings, protections, other programs | N/A |

Matrix size: 274 paragraph rows (each row is one paragraph, or a group whose disposition is the same). There are 2 GAP or mismatch rows at P1 (CW2-1, CW2-2) and 3 at P2 (CW2-3, CW2-4, CW2-5).

## 4. Open-question confirmations (Colorado Works)

| OQ | class | confirmed? | note |
|---|---|---|---|
| OQ-101 (more than two caretakers) | state policy choice | yes | The chart has three rows (3.606.1.F). |
| OQ-102 ("needs" in deeming) | state policy choice | yes, for the dollar measure | The persons whose needs are deducted are settled by the text ("living in the home"), as its sweep note says. CO-2000 does not implement that (CW2-2). |
| OQ-104 (weeks per month) | state policy choice | yes | Informational only. |
| OQ-142 (20% cap) | resolved | yes | 3.606.6.G puts the monitoring on the State. |
| OQ-153 (H vs J.4) | state policy choice | yes | Both sentences are unchanged in D-81. |
| OQ-252 (sanction default, diversion limit, POI bound) | state policy choice | yes | County policy is not published State text. |
| OQ-354 (death reimbursement order) | state policy choice | yes, with P3-1 | Its body is stale on voluntary contributions. |
| OQ-490 (disregards on disqualified members) | resolved | yes | A.6 is specific to status and SSN; M covers the rest. |
| OQ-530 (standards from 2028-07-01) | blocked on a named document | yes | The SFY 2028-29 standards do not exist yet. |
| OQ-531 (diversion cap, TANF State Plan) | blocked on a named document | yes | The State Plan is on cdhs.colorado.gov, which is not an allowed host. |
| OQ-611 (child absent for an unlisted reason) | state policy choice | yes | 3.604.2.E and G checked. |
| OQ-613 (part-time student, full-time employee) | state policy choice | yes | 3.605.4.B.24.b; no definition. |
| OQ-660 (institution residents) | state policy choice | yes | 3.604.2.O.2. |
| OQ-700 (care allowances) | state policy choice | yes | 3.605.4.A.5 and 3.605.2.D.3. |
| OQ-770 (ten or eleven days) | state policy choice | yes | 3.602.1.I.2 and K.1.c and 3.604.3.A.2 checked in D-104 and D-81. |
| OQ-771 (prior month) | state policy choice | yes | 3.605.1.A.1 says "if available" and states no combination. |
| OQ-772 (tribal plan) | state policy choice | yes | 3.604.2.J states only the positive. |
| OQ-376 (DOR Rule 5 edition; CW part) | resolved | yes | 3.604.3.I.1 incorporates the 2021 edition. |
| OQ-550 (SAVE status list) | blocked (Medicaid owner) | yes for CW | |

No misclassified open question was found. Each "blocked" question names a document that no allowed host serves. Each "state policy choice" was checked against the D-81 text. CW2-3 and CW2-4 each need a new state-policy-choice question (or a fix).

## 5. First-pass P1s (re-checked at 65ed7c8)

Each was re-run, either as a stored case or as a fresh probe in the scratch copy, or confirmed from its derivation:

| first pass | check | result |
|---|---|---|
| CW-1 diversion POI | probe ZR-1 (CO-160 with `in_diversion_period_of_ineligibility` true) | ineligible_diversion_period, $0. **Fixed.** |
| CW-2 minor parent assisted as an adult | case CO-160 | 1 caretaker, 1 child, need $331, grant standard $488, eligible, October $320. **Fixed.** |
| CW-3 months of a non-head adult | case CO-161 | time_limit_reached. **Fixed.** |
| CW-4 2021 poverty guidelines | case CO-162; CO-4350 values checked against D-295 | countable $2,725, ineligible_income. **Fixed.** |
| CW-5 parent in the unit not deemed | case CO-163 | countable $410, eligible, $407. **Fixed** (but see CW2-2 for CO-2000). |
| CW-6 parent elsewhere not deemed | probe ZQ-2: CO-909 deems only p3 (h1) | **Fixed** in CO-909; CO-2000 still counts p4 (CW2-2). |
| CW-7 adult relative or caretaker | case CO-164 | eligible, $238. **Fixed**, but the fix opened CW2-1. |
| CW-8 partial initial month | CO-160 (488 × .65754 = $320); CO-4358 and CO-914 derivations | **Fixed.** |
| CW-9 lottery, sponsor gifts, in-kind | probe ZR-2 ($2,000 prize: countable $2,000, ineligible_income); CO-4363 and CO-4360 in the derivations | **Fixed.** |
| CW-10 boarder income | probe ZR-3 ($1,500 from 2 payers: countable $798, ineligible_income) | **Fixed.** |
| CW-11 refused potential income | CO-4362 in CO-908 and CO-2554 | **Fixed.** |
| CW-12 unverified status members out of the size | CO-4372 in CO-2351 and CO-2561 | **Fixed.** |
| CW-13 county closures | CO-4353 in CO-921 (three options) | **Fixed.** |
| CW-14 unearned income deductions and exemptions | CO-4369 in CO-908 and CO-2554 | **Fixed.** |

## 6. Reproducing households

Built in a scratch copy of HEAD 65ed7c8 (`git archive HEAD`). Cases were appended to `volumes/co/tests/cases.yaml` and evaluated with `npx vite-node scripts/eval-case.ts co <id> ...` (as_of 2026-10-15, application 2026-10-12).

| case | finding | key facts | model | rule |
|---|---|---|---|---|
| ZQ-1 | CW2-1 | CO-164 with the grandparent edge removed: an unrelated adult with primary responsibility for the 16-year-old mother, not requesting; no county approval | CO-906 true; eligible; $238 (Oct) | not approved (N.3.a): no grant payment |
| ZQ-2 | CW2-2 | 16-year-old mother and baby in h1 with her mother ($600 wages, not joining); her father in h2, no income | needs $357, deemed $153, eligible, $137 (Oct) | needs $253, deemed $257 ≥ $245, ineligible_income |
| ZQ-3 | control | ZQ-2 without the father | needs $253, deemed $257, ineligible_income | same |
| ZR-1 | CW-1 | CO-160 + diversion POI | ineligible_diversion_period | same |
| ZR-2 | CW-9 | CO-160 + $2,000 prize | countable $2,000, ineligible_income | same |
| ZR-3 | CW-10 | CO-160 + $1,500 from 2 boarders | countable $798, ineligible_income | same |

## Disposition (coverage pass 2)

Fix round on HEAD 4f6a741, commit c99d7c5 (branch of the fix worktree). I re-read 9 CCR 2503-6 3.604.2.N.1-N.3, 3.605.1.A.4.a, 3.605.3.A.4, 3.605.4.B.26, 3.608.4.C-D and 3.609.2.A.1.e in D-81, and 9 CCR 2503-5 3.520.71.F.2 in D-80, before each change. The probes ZQ-1 and ZQ-2 were rebuilt from `cw2tools/mk.py` and are now stored cases with hand derivations.

| finding | disposition |
|---|---|
| CW2-1 (P1) | **Fixed** (c99d7c5). CO-906 accepts an unrelated caretaker only when the caretaker is a member of her assistance unit; a relative (is_related_to) or her parent needs no approval, as before. Otherwise county_approved_living_arrangement decides (N.3.a, new excerpt S3450). The N.3.b county option is OQ-830 (state policy choice, Checked line). Tests CO-906-T8 to T10. Case CO-190 (ZQ-1): p1 and p2 ineligible_living_arrangement, $0 (was eligible, $238). |
| CW2-2 (P1) | **Fixed** (c99d7c5). New cw_minor_parent_deemed_parents (CO-4660): her parents not in her unit and living in the same home. CO-909 reads it, and CO-2000 counts those parents (One or Two Caretakers) and her siblings in the home who are their children and not in her unit. Tests CO-4660-T1 to T3, CO-2000-T4 and T5. OQ-102 gets a note. Case CO-191 (ZQ-2): needs 253, deemed 600 − 90 − 253 = 257 ≥ 245, ineligible_income (was 357, 153, eligible, $137). |
| CW2-3 (P2) | **Fixed with an open question** (c99d7c5). CO-1265 takes the 25% of the partial-month payment (grant × cw_partial_month_payment_factor, which is 1 outside the initial month). C.1 measures the 25% against the unit's "grant payment", and A.1.e deducts from the partial-month grant. The base is recorded as OQ-831 (state policy choice, Checked line). Test CO-1265-T5: $488, 11 days, 488 × .36164 × .25 = 44.12, so the grant is $132 instead of $54. |
| CW2-4 (P2) | **Fixed** (c99d7c5). A.4 is the specific rule for VA and other attendance-conditional benefits, and B.26 still exempts grants, loans, stipends and scholarships. New neutral facts school_attendance_conditional_benefits_received (CO-4661, part of educational_assistance_received) and school_attendance_expenses_paid (CO-4662) both read 0 when not stated. CO-2341 excludes educational assistance less the excess of the first over the second. New excerpt S3451. Tests CO-2341-T5 and T6. No stored household states either fact. |
| CW2-5 (P2) | **Fixed** (c99d7c5). CO-921 has a new branch after the status check: cw_is_disqualified_member (CO-928) gives `ineligible_disqualified`. It is a person-level result, so the rest of the unit is unaffected (CO-2351 and CO-2561 already handle size and grant). It has an aid-code label. CO-1511 now bars Adult Financial for ineligible_disqualified and closed_demonstrable_evidence, as it does for sanction_closure. 3.520.71.F.2.a (S1011) reads: "Due to a sanction, demonstrable evidence, or disqualification". CO-919 is unchanged: a disqualified parent living with an aided child stays work-eligible through cw_caretaker_of. Tests CO-921-T23 to T25, CO-1511-T6. |
| P3-1 | **Fixed** (c99d7c5). OQ-354 now names CO-4373 for voluntary contributions. |
| P3-2 | **Fixed** (c99d7c5). CO-2353's needs count the stepparent's excluded children only when they live in the same home. Test CO-2353-T5. |

Stored expectations: only the two new cases, CO-190 and CO-191. No existing household changed. The UI test pins moved only by what these cases and items explain: CO-273 is read by 8 households and reaches 29, with 11 steps; CO-276 reaches 18; +2 open questions; +1 Colorado Works rule; the grant explanation has 98 steps.
