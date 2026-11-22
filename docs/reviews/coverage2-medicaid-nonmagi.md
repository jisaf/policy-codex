# Coverage review, second pass: Medicaid non-MAGI (family file `coverage2-medicaid-nonmagi`)

Reviewer pass: second exhaustive coverage matrix, 2026-11-22, on HEAD `1743a1d` (branch `ccr-9d19bf4c-wmnwcl`). This pass follows the coverage fix round recorded in docs/reviews/coverage-medicaid-nonmagi.md ("Disposition (coverage round)"). Only this file was written in the repository; nothing was committed.

Governing texts, read line by line:
- D-65, 10 CCR 2505-10 § 8.100 (SOS rule version 12735, effective 11/14/2026): § 8.100.5.A-P (D-65:2095-2723), § 8.100.6.A-Q (D-65:2725-3109), § 8.100.7.A-V (D-65:3111-4458).
- D-68, 10 CCR 2505-10 §§ 8.940-8.942 (version of § 8.900 effective 11/14/2026).
- 20 CFR 416.1112 (2012), which § 8.100.5.H.4.e incorporates (D-53). Read where a finding turns on them: 42 U.S.C. 1396r-5 (D-47), 1396p(f) (D-46), 1382c(f)(2) (D-45).

**Method.**
- I built the matrix from the text, not from the first pass's rows, and compared the two only afterwards to find rows we disposed of differently (one: § 8.100.5.C.3, see N2-3).
- Ledger regenerated in a scratch copy (`git archive HEAD`, then `npm run export -- --volume co`): 2,169 items. From it I built an index of every § 8.100.5-8.100.7, § 8.94x and 416.11xx citation in an item's meaning, precision or cited excerpt (261 citation keys), and read the derivations of the items each paragraph maps to.
- Probes: scratch households appended to the scratch copy's `volumes/co/tests/cases.yaml` and evaluated with `npx vite-node scripts/eval-case.ts co <id> <identifiers> <month>`. The generator and specs are in `/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cov2nm/gen/` (`mk.py`, `s1.json`, `s2.yaml`, `s3.yaml`, `s4.yaml`). The first pass's households (`/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/x-cases-nonmagi.yaml`) and the stored cases CO-112, CO-139, CO-185 to CO-189 were re-run.

## 1. Verdict

**4 P1 found.** The family does not yet meet the stopping rule.

All fifteen first-pass P1s (NM-1 to NM-15) stay fixed (section 5). The new P1s:
- **N2-1.** VA Aid and Attendance and Unusual Medical Expenses count as income in every SSI-method test. § 8.100.5.K excludes them "when determining eligibility"; only the long-term care gross income (CO-641) subtracts them. The first pass marked 5.K carried on the belief that "the SSI method never counts A&A", but the A&A portion is inside `pension_income` (as CO-139 states it), which CO-663 counts.
- **N2-2.** The family allowance (CO-657) is one third of the MMMNA standard less the family member's income, as § 8.100.7.T.1.c.i words it. 42 U.S.C. 1396r-5(d)(1)(C) (D-47) sets a floor of "at least ⅓ of the amount by which" the standard exceeds the member's income. The state formula gives less whenever the member has income, so the patient payment is too high. No open question or override records the conflict.
- **N2-3.** A child whose 19th birthday falls in the month before the determination date loses the Children's Buy-In for that whole month. § 8.100.5.C.3 grants the entire month. CO-620 tests `age` on the determination date. The first pass marked C.3 "NA: the volume evaluates whole months", which is not true of the age test.
- **N2-4.** The home of an absent owner stays exempt while "spouse or dependent relative lives in the home" (§ 8.100.5.M.2.a.iv, vi, vii, ix). CO-4622 reads that as CO-889, the 1396p(f)(2) list (spouse, child under 21, blind or disabled child). A dependent parent, sibling or adult child in the home does not count, and no fact can say that a relative is dependent.

There are also 3 new P2 findings (N2-5 to N2-7) and 3 P3 findings (N2-8 to N2-10). The first pass's deferred P2s (NM-17 parent half, NM-23 j/o/p/z, NM-26, NM-27 J.1, NM-28, NM-30) are still open; they are not counted again. Their deferral reasons still hold. All open questions are confirmed, with one stale title noted (section 4).

## 2. Findings

P1: a wrong eligibility or benefit answer, a missing pathway, or a wrong or missing verification requirement. P2: a gap or mismatch with no answer effect in ordinary cases, or a reading that departs from the text without a record. P3: a note.

| ID | Pri | Paragraph | Item(s) | Governing text | What is wrong | Proposed fix |
|---|---|---|---|---|---|---|
| N2-1 | **P1** | § 8.100.5.K (lead-in); F.5.j.vi | ma_ssi_household_unearned_income_sum (CO-663), and through it CO-606, CO-605, CO-607, CO-609, CO-613 to CO-616, CO-1158, CO-1160; also ma_wawd_countable_income (CO-1715), ma_cbwd_household_unearned_income (CO-4201), ma_ssi_deeming_parents_countable_income (CO-4634) | K: "The portion of the pension payments for Aid and Attendance (A&A) and Unusual Medical Expenses (UME), as determined by the VA, shall not be considered as income when determining eligibility." F.5.j.vi counts "Veterans benefits other than Aid and Attendance (A&A) and Unusual Medical Expenses (UME)". | The A&A/UME portion is stated inside `pension_income` (CO-139: pension 600 "of which 300 is Aid and Attendance"), and CO-641 subtracts `va_aid_and_attendance_amount` (CO-837) for that reason. CO-663 and the Buy-In and deeming sums read `pension_income` with no such subtraction. CO-836 and CO-837 are read only by CO-641, CO-658 and CO-4103. **Y-VAAA:** aged veteran at home, Social Security 400, VA pension 900 of which 400 is A&A (`receives_va_aid_and_attendance` true, amount 400), $1,000 savings. Engine: `ma_ssi_countable_income` 1,280, `ma_ssi_related_category` none. The rule gives 400 + 500 - 20 = 880 ≤ 1,029: aged. (`ma_ltc_gross_income` is correctly 900.) The QMB, SLMB, QI and QDWI tests count the same 400. | Subtract `va_aid_and_attendance_amount` (when `receives_va_aid_and_attendance`) from each person's sum in CO-663, CO-1715, CO-4201 and CO-4634, or add it to ma_ssi_excluded_unearned_income (CO-2470), which all four already subtract. Store Y-VAAA. |
| N2-2 | **P1** | § 8.100.7.T.1.c.i; 42 U.S.C. 1396r-5(d)(1)(C) (D-47:163) | ma_family_allowance (CO-657), ma_patient_payment (CO-658) | T.1.c.i: "equal to one third of the amount of the MMMNA and shall be reduced by the monthly income of that family member". 1396r-5(d)(1)(C): "A family allowance, for each family member, equal to **at least** ⅓ of the amount by which the amount described in paragraph (3)(A)(i) exceeds the amount of the monthly income of that family member." 1396r-5(a)(1): the section "supersedes any other provision of this subchapter ... which is inconsistent with them". | CO-657 is MMMNA/3 - income. The federal floor is (MMMNA - income)/3. For a member with income I the state figure is lower by 2I/3, so the patient payment is higher by up to that much. Phase 4 (C-17) kept the state arithmetic as "Colorado's rule governs" without weighing the "at least" floor. No `statute_override`, open question or precision records it. **Y-FAMALLOW** (CO-112's couple, allowance not refused, plus their 15-year-old p3 at home, the community spouse's tax dependent, with Social Security 600): engine `ma_family_allowance` 301.67, `ma_patient_payment` 513.67 (November 2026). The floor gives (2,705 - 600)/3 = 701.67 and a patient payment of 113.67. | Make CO-657 max(MMMNA/3 - income, (MMMNA - income)/3) per member, which is the federal floor because the state figure never exceeds it, as a `statute_override` citing 1396r-5(d)(1)(C). Or record an open question (needs Legal) with the state reading as the assumption. Store Y-FAMALLOW. |
| N2-3 | **P1** | § 8.100.5.C.3; § 8.100.6.Q.1.a | ma_cbwd_eligible (CO-620), ma_cbwd_max_age (CO-3026), age (CO-300) | C.3: "For the Medicaid Buy-In Program for Children with Disabilities, any child who is determined to be eligible for Medical Assistance at any time during a calendar month shall be eligible for benefits during the entire month." Q.1.a: "Applicants must be age 18 or younger." | CO-620 tests `age` ≤ 18, and `age` is whole years on the determination date. A child who turns 19 earlier in the determination month was eligible on the first days of the month, so C.3 covers the whole month. The engine drops the child for that month. This is the defect MAGI N-02 and F3-3 fixed for their age limits. **Y-CBWD19** (CO-145 with p3 born 2007-10-08; as_of 2026-10-12): `age` 19, `ma_cbwd_eligible` false, `ma_buy_in_category` none, `ma_magi_category` none (153% FPL). Control **Y-CBWD18** (born 2007-10-20): `children_with_disabilities`. The rule gives `children_with_disabilities` for October 2026 in both. | Test the age on the day before the first of the month (the CO-564 idiom) against `ma_cbwd_max_age`, in CO-620. Store Y-CBWD19. Correct the first pass's C.3 row (done in this matrix). |
| N2-4 | **P1** (GAP) | § 8.100.5.M.2.a.iv, vi, vii, ix, xi | ma_home_is_countable_resource (CO-4622), ma_spouse_or_qualifying_child_lives_in_home (CO-889) | vii: "...the home is a countable resource unless spouse or **dependent relative** lives in the home." ix: "the home shall still be considered the principal place of residence, irrespective of the individual's intent to return as long as the individual's spouse or **dependent relative** continues to live there." | CO-4622's precision reads "dependent relative" as CO-889, "the relatives 42 U.S.C. 1396p(f)(2) names". That list belongs to the equity-limit exception (CO-650), not to the principal-residence rule, and it is narrower: it leaves out a dependent parent, sibling, grandchild or adult child (cf. 20 CFR 416.1212(c)). No fact states that a relative living in the home is dependent. **Y-DEPREL** (CO-139 without written intent to return; the veteran's financially dependent 40-year-old son, not disabled, lives in the home): `ma_spouse_or_qualifying_child_lives_in_home` false, `ma_home_is_countable_resource` true, countable resources 241,200, `ma_ltc_eligibility_status` ineligible_resources. Under ix the home stays exempt: eligible_institutional. | Add a supplied fact (for example `dependent_relative_lives_in_home`) and read it, or CO-889, in CO-4622's arm. Keep CO-889 alone in CO-650. Correct CO-4622's precision. Store Y-DEPREL. |
| N2-5 | P2 | § 8.100.5.F.6.y; § 8.100.7.A.1 | ma_ltc_gross_income (CO-641); OQ-822 | F.6.y exempts "General Assistance, SSI, OAP-A and cash assistance under ... TANF" from income "for the purpose of determining eligibility for the Long Term Care and Aged, Blind, and Disabled Medical Assistance categories". A.1: "gross income means income before application of deductions, exemptions or disregards appropriate to the SSI program". | CO-641 counts `tanf_cash_income` and `adult_financial_cash_income` in the 300% test, reading A.1 over F.6.y. The reading is in CO-641's precision, but OQ-822's assumption ("Every Adult Financial grant is exempt for the aged, blind and disabled income tests") says the opposite, and no open question weighs F.6.y's "Long Term Care" against A.1. The answer changes only for a grant recipient whose other income is near 300% of the FBR. | Extend OQ-822 (or a new state-choice OQ) to the 300% test and make CO-641's precision and OQ-822 agree. |
| N2-6 | P2 | § 8.100.5.M.2.a.v | CO-4622 | v: a Colorado home with intent to return "is considered an exempt resource if: 1) The individual is institutionalized; and 2) The intent to return home is documented in writing." | CO-4622 also exempts the home of a person who lives away in a private dwelling and intends to return, without the writing. That is the SSI rule (416.1212(c)) and 435.601 forbids a stricter one, but the reading is not recorded. | One line in CO-4622's precision, or add it to OQ-820's legal question. |
| N2-7 | P2 | § 8.100.7.A.1 (fourth paragraph) | ma_ssi_deeming_parents (CO-4624) | "Medical Assistance will be provided beginning the first day of the month following the month during which a child under the age of 18 ceases to live with his or her parent(s). Once determined to meet the institutional requirement, parental income and resources will cease to be deemed" | CO-4624 stops deeming as soon as the child `resides_in_medical_institution`, including in the month of admission, which the paragraph leaves deemed. Only the SSI-related route is affected; the 300% route reads the child's own income. | Record the reading in CO-4624's precision, or keep deeming through the month of admission (read `institution_entry_date`). |
| N2-8 | P3 | § 8.100.5.M.2.a.ii; M.3.f | ma_home_equity_disqualifies (CO-650) | ii: exempt if equity "Is less than" the limit; M.3.f: countable if equity "exceeds" the limit. | CO-650 follows ii (equity at the limit disqualifies). Federal 1396p(f)(1)(A) is "exceeds". The tie is not recorded. | One line in CO-650's precision. |
| N2-9 | P3 | — | OQ-98 | Title: "Veterans-related personal needs allowance ($90) is cited but not wired into ma_patient_payment's PNA". | CO-1987 now wires it (CO-1986, CO-255). The title is stale. | Retitle OQ-98. |
| N2-10 | P3 | § 8.100.5.K | first pass row 5.K | "The SSI method never counts A&A (it is not in CO-663's facts)." | The row's reasoning was wrong (N2-1). | Corrected in this matrix. |

Carried from the first pass, still open and not counted again: NM-17 (a parent's COLAs for Pickle), NM-23 j, o, p, z, NM-26, NM-27 (net rent from an exempt home, J.1), NM-28 (E.6 and V.2.c non-cooperation), NM-30 (dated disability onset for retroactive months).

## 3. Coverage matrix

Key: **C** = carried by (the derivation was read and is correct unless a finding is named). **NA** = not applicable, with the reason. **OQ** = open question. **GAP** = no item and no recorded reason. Rows group subparagraphs only where one disposition serves all of them.

### 3.1 § 8.100.5.A-E: application, verification, effective dates, estate recovery, availability (D-65:2095-2257)

| Paragraph | Disposition |
|---|---|
| 5 (title) | NA: heading. |
| 5.A.1 (lead-in) | NA: site procedure and SSI referral; the categories are carried below. |
| 5.A.1.a | C: meets_ssa_disability_criteria (CO-011) is the contractor's determination; the extra form is NA (procedure). |
| 5.A.1.b | NA: forwarding to the contractor. |
| 5.A.1.c | C: ma_wawd_limited_disability_finding (CO-2820), ma_wawd_is_disabled (CO-806). |
| 5.A.1.d | NA: PHE continuation, ended May 11, 2023. |
| 5.A.2 | NA: application form. |
| 5.B.1 (lead-in) | C: ma_verification_status (CO-1415) and its counts. |
| 5.B.1.a | C: SSN verification items of § 8.100.3 (CO-1401, CO-1312); exception list is § 8.100.3.I (MAGI review's scope). |
| 5.B.1.a.i | NA: PHE self-attestation, ended. |
| 5.B.1.a.i.1 | C: ma_is_emergency_medicaid_only (CO-510). |
| 5.B.1.b | C: § 8.100.3.H items (other review's scope). |
| 5.B.1.c (attestation, SSN, ROP 30 days) | C: ma_requires_verification_of_earned_income (CO-1403), ma_income_reasonable_opportunity_days (CO-1349). |
| 5.B.1.c.i-ii | C: ma_abd_income_is_reasonably_compatible (CO-1640), CO-1350; OQ-302 ("20% of what"), OQ-374. |
| 5.B.1.c.iii (post-PHE: both above, ineligible) | C: CO-1640's both-above arm. PHE text NA. |
| 5.B.1.c.iii (explanation, ROP after PHE) | C: CO-1403, CO-1349. PHE text NA. |
| 5.B.1.c.iv (documents only when not compatible and no explanation) | C: CO-1403, CO-1640. PHE text NA. |
| 5.B.1.c (self-employment ledgers; wage stubs; estimated earnings; prior month) | NA: acceptable document types and budgeting from stubs; the volume takes the month's figure as stated. |
| 5.B.1.c.v | NA: PHE, ended. |
| 5.B.1.d | C: ma_requires_verification_of_unearned_income (CO-1404) (month or previous month; MSP interest and dividends on attestation, CO-3158). |
| 5.B.1.d.i | NA: PHE, ended. |
| 5.B.1.e | C: ma_requires_verification_of_resources (CO-1405); electronic AVP verification is the document fact (NA). |
| 5.B.1.e.i | NA: PHE, ended. |
| 5.B.1.f | C: § 8.100.3 immigration verification and CO-510. |
| 5.B.1.g | C: the questionable-attestation facts read in CO-1404, CO-1405. |
| 5.B.1.h | NA: case-file documentation. |
| 5.C.1.a-b | C: ma_month_is_before_coverage_period (CO-4101); the ABD outcomes test each month's criteria. |
| 5.C.2 | C: § 8.100.7.A-B rows. |
| 5.C.3 | **N2-3** (age tested on the determination date, not across the month). |
| 5.C.4.a-c | C (partial): CO-4101 and the month's criteria; dated onset is deferred NM-30. |
| 5.D.1.a-c | NA: estate recovery notice. |
| 5.E (lead-in, payer of last resort) | NA: declaration. |
| 5.E.1 | C: all income facts are monthly amounts. |
| 5.E.2 | C: ma_ssi_couple_members (CO-3626), ssi_countable_resources_couple (CO-801), CO-608; LTC exceptions at § 8.100.7.C. |
| 5.E.3.a-c, E.4 | C: availability is the caseworker's valuation in liquid_resources_value and the holdings facts (OQ-390's gross convention). |
| 5.E.5 | NA: procedure while steps are taken (no delay or termination). |
| 5.E.6-7 | Deferred NM-28 (non-cooperation denial; notice NA). |
| 5.E.8 | C: has_trust_interest (CO-1577), trust documents (CO-1578, CO-1634), CO-4643. |
| 5.E.9, 9.a-c | NA: unknown assets are valued in the month of discovery (caseworker valuation of the holdings facts); 9.b-c are overpayment and repayment. |

### 3.2 § 8.100.5.F-G: income (D-65:2244-2386)

| Paragraph | Disposition |
|---|---|
| 5.F.1 | NA: scope statement. |
| 5.F.2 | C: monthly income facts; the prior month is the case's choice of figures (NA). |
| 5.F.3 | C: the `holds_out_as_spouse_with` edge in every couple sum (CO-605, CO-663, CO-1158). |
| 5.F.4.a-d | C: wages_gross, ma_self_employment_net_earnings (CO-1704) in CO-605, CO-641, CO-1715, CO-4200; sheltered-workshop pay and royalties are wages or other income as stated. Resource the next month: liquid_resources_value. |
| 5.F.5 (lead-in) | C: CO-663 and CO-641 (gross unearned income); unspent amount is a resource (liquid_resources_value). |
| 5.F.5.a-h | C: other_unearned_income_taxable (CO-1714) and _nontaxable (CO-030) as gross receipts (death benefits net of last illness and burial is the stated figure); lump sums inside those facts (CO-3367's precision, NM-6). |
| 5.F.5.i | C: lottery_gambling_winnings_received (CO-1181) in CO-663, CO-641, CO-1715. |
| 5.F.5.i.1, 1.a-b | C: ma_lottery_winnings_hardship_exemption_granted (CO-2222); the request procedure is NA. |
| 5.F.5.j.i-v, vii | C: pension_income, social_security_income, unemployment_income, CO-030 (workers' compensation, alimony), CO-1714. |
| 5.F.5.j.vi | **N2-1** (the A&A/UME portion is counted in the SSI method). |
| 5.F.5.k.i-ii | C: ssi_in_kind_support_and_maintenance (CO-802), CO-3406, shelter_costs_paid_by_others (CO-3404); OQ-823 (PMV against H.1.b's one third). |
| 5.F.6 (lead-in) | C: ma_ssi_excluded_unearned_income (CO-2470), CO-2471, CO-4629. |
| 5.F.6.a | C: loan_proceeds_received in CO-2470. |
| 5.F.6.b, d, e, g, w | C: in-kind food, home produce, housing assistance and expense reimbursements are not stated as cash income (OQ-390's convention). |
| 5.F.6.c | C: retroactive_social_security_lump_sum_received (CO-3919), retroactive_ssi_or_public_assistance_lump_sum_received (CO-3920) in CO-2470; nine-month resource exclusion in CO-800 (CO-4639, CO-4640). |
| 5.F.6.f, h, i, k, m, r, s, v, x, aa-cc | C: federally_excluded_payments_received and educational_assistance_received in CO-2470. |
| 5.F.6.j, o, p, z | Deferred NM-23 (no neutral receipt fact). |
| 5.F.6.l | C: foster_care_provider_payments_received in CO-2470. |
| 5.F.6.n | C: energy_assistance_received in CO-2470. |
| 5.F.6.q | C: pass_set_aside_income (CO-3825) in CO-2470; earned PASS (CO-4618) in CO-4629. |
| 5.F.6.t | C: the SSI method counts no child's income except against the child allocation (CO-2277); the CBwD MAGI household is OQ-740's reading. |
| 5.F.6.u | C: tax_refunds_and_credits_received in CO-2470; resource months are valuation. |
| 5.F.6.y | C: SSI, TANF and Adult Financial grants are not in CO-663 (OQ-822). **N2-5** for the 300% test (CO-641). |
| 5.F.6.dd | NA: ARRA supplement, expired 2010. |
| 5.G.1 | C: sponsor deeming of § 8.100.3.K (Adult Financial and MAGI items; other reviews' scope). |

### 3.3 § 8.100.5.H-L: allocations, disregards, ownership, property income, VA, reverse mortgages (D-65:2386-2509)

| Paragraph | Disposition |
|---|---|
| 5.H.1 (scope) | C: the SSI-method items are read only by SSI-related, OAP, MSP and Buy-In outcomes; LTC reads CO-641. |
| 5.H.1 (WAwD spouse) | C: ma_wawd_countable_income (CO-1715) reads the applicant only; CO-3030 size 1. |
| 5.H.1.a | C: ma_ssi_couple_members (CO-3626), CO-604, CO-661. |
| 5.H.1.b | C: CO-802 in CO-663 (not for an unemancipated child); OQ-823. |
| 5.H.2.a.i-ii | C: ma_is_ssi_unemancipated_child (CO-2275), CO-2273, CO-2274, CO-2272. |
| 5.H.2.b-c | C: ma_is_applying_for_or_eligible_for_ssi (CO-2271). |
| 5.H.3 (lead-in), 3.a | C: CO-2281, ma_ssi_parental_income_deemed (CO-4626), CO-4624 (NM-10). **N2-7** (month of admission). |
| 5.H.3.a.i | C: ma_ssi_ineligible_child_allocation (CO-2277), CO-2276, CO-2278, CO-2279, CO-4633; OQ-473. |
| 5.H.3.a.ii | C: CO-4626 (FBR individual or couple). |
| 5.H.3.a.iii | C: no allocation for applicant spouses without children (CO-2277's arms); OQ-473. |
| 5.H.3.b.i-iii | C: CO-2278/CO-2279 (unearned first), CO-4634 (child allocation before disregards, parent allocation after). |
| 5.H.4.a.i-iii | C: ssi_general_income_exclusion (CO-230) in CO-606 and CO-605 (carryover), one per couple. **N2-1** for the A&A portion. |
| 5.H.4.b.i.1-3 | C: CO-231, CO-232 in CO-605; QMB/SLMB/QI/QDWI apply it to the couple's total (L.4, M.4, N.5, O.3). |
| 5.H.4.c | C: CO-2281 (two thirds for an unemancipated child), CO-2280; not in the child allocation (CO-2277). |
| 5.H.4.d | C: CO-2471, ssi_student_earned_income_exclusion_basis (CO-3387); indexed figures (NM-31). |
| 5.H.4.e | See § 3.10 (416.1112). |
| 5.I.1-3 | C: income facts are stated per payee; joint payments split by the stated share (caseworker figure). |
| 5.I.4 | C: CO-656's allowance is not added to the institutionalized spouse's income; ma_community_spouse_income (CO-2467) reads the community spouse's own facts. |
| 5.J.1, a-c | Deferred NM-27 (net rent from an exempt home needs a rental-expense fact for Medicaid). |
| 5.J.2-3 | C: ma_countable_income_producing_property_value (CO-4621), CO-4601, CO-4602, CO-4607 to CO-4609 (NM-4). |
| 5.K (lead-in) | C for LTC: CO-641 subtracts CO-837. **N2-1** for the SSI method and the Buy-In and deeming sums. |
| 5.K.1.a-b | C: CO-658 does not add A&A back; CO-4103. |
| 5.K.2 | C: ma_va_aid_and_attendance_is_patient_payment (CO-4103), resides_in_state_veterans_home (CO-4102); OQ-720. |
| 5.L.1 | C: reverse-mortgage payments are not an income fact (OQ-390). |
| 5.L.2 | C: liquid_resources_value. |
| 5.L.3 | C: uncompensated_transfer_value_in_lookback (CO-824). |

### 3.4 § 8.100.5.M-P: resources (D-65:2509-2723)

| Paragraph | Disposition |
|---|---|
| 5.M.1 (SSI limits) | C: CO-233, CO-234, ma_meets_ssi_resource_standard (CO-610), CO-608. |
| 5.M.1 (MSP limits) | C: CO-807, CO-808 (2026: 9,950 / 14,910; OQ-81). |
| 5.M.1 (Buy-In not counted) | C: CO-618, CO-620 read no resource item. |
| 5.M.2.a (definition), a.i | C: the home is never in CO-800; one home (home_equity, CO-826). |
| 5.M.2.a.ii.1-2 | C (LTC): ma_home_equity_disqualifies (CO-650), ma_home_equity_limit (CO-831); OQ-820 (outside LTC). **N2-8** (tie). |
| 5.M.2.a.iii | C: ma_meets_residency (CO-2250), home_is_outside_colorado (CO-4613). |
| 5.M.2.a.iv, vi, vii | C: ma_home_is_countable_resource (CO-4622), CO-4610 to CO-4615. **N2-4** ("dependent relative"). |
| 5.M.2.a.v.1-2 | C: CO-4622, intent_to_return_home_is_documented_in_writing (CO-4612). **N2-6** (not institutionalized). |
| 5.M.2.a.viii, x | C: CO-4622 (no intent: countable); x's month-after timing is in CO-4622's precision. |
| 5.M.2.a.ix, xi | C: CO-4622's spouse/relative arm. **N2-4**. |
| 5.M.2.a.xii | C: CO-4622 reads an ALF or facility as living away. |
| 5.M.2.a.xiii, xiii.1 | C: home_is_held_in_trust_or_entity (CO-4614) for a medical institution, waiver or PACE. |
| 5.M.2.a.xiv | C: home_has_recorded_beneficiary_deed (CO-4615); revocation regains the exemption (fact false). |
| 5.M.2.b, b.i-iv, vii | C: ma_excess_real_property_is_for_sale (CO-2242), ma_excluded_real_property_value (CO-4620), CO-4335. |
| 5.M.2.b.v | C: ma_requires_verification_of_sale_efforts (CO-2246), CO-2247. |
| 5.M.2.b.vi | C: CO-647 reads the same CO-4620 exclusion for the couple. |
| 5.M.2.c | C: CO-800 (transportation vehicle excluded; others counted). |
| 5.M.2.d-e, d.i-iii, e.i-iv | C: household goods and personal effects are not counted (no fact); investment items are M.3.j. |
| 5.M.2.f, M.3.l | C: CO-800 (cash surrender value counted when face value exceeds $1,500), CO-3397's per-person precision. |
| 5.M.2.g | C: CO-800 (term and burial insurance have no cash surrender value). |
| 5.M.2.h | C: burial spaces not counted. |
| 5.M.2.i | C: irrevocable_burial_funds_value (CO-4603) not counted. |
| 5.M.2.j, j.i-ii | C: CO-800, ssi_burial_funds_exclusion (CO-4600), CO-4604 (NM-1). |
| 5.M.2.k | C: ABLE (CO-4415) left out in CO-4623. |
| 5.M.3.a-c | C: liquid_resources_value. |
| 5.M.3.d, d.i-iii | C: joint-account presumption is the caseworker's valuation of CO-3390 (NM-27, accepted). |
| 5.M.3.e | C: CO-4615 in CO-4622. |
| 5.M.3.f | C (LTC): CO-650; OQ-820. |
| 5.M.3.g | C: real_property_other_than_home_equity (CO-3393) in CO-800; CO-4621. |
| 5.M.3.h, h.i-iii.1-4 | C: ma_claims_co_owner_hardship_for_real_property (CO-2244), CO-4606, CO-4620; verification CO-2248, CO-2249. |
| 5.M.3.i | C: CO-3393 / liquid holdings as stated (a non-home mobile home is real or personal property in the holdings facts). |
| 5.M.3.j | C: investment_personal_property_value (CO-4642) in CO-4623. |
| 5.M.3.k | C: CO-800 (vehicles other than the transportation one). |
| 5.M.3.m-o, m.i-iii, n.i-ii, o.i-ii | C: a note's value is a holding (caseworker valuation in liquid or investment facts); the transfer part is CO-824. |
| 5.M.3.p, p.i-ii | C: mineral rights valued in CO-3393 (valuation). |
| 5.N.1-2 | C: retirement_accounts_value in CO-800. |
| 5.N.3 | C: CO-608 leaves out the living-together spouse's accounts (NM-3). |
| 5.N.4 | C: CO-647 keeps them for the LTC couple. |
| 5.N.5.a-b | C: net-of-tax valuation of CO-3392 (NM-27, accepted). |
| 5.O.1-4 | C: availability valuation of liquid_resources_value; evidence NA. |
| 5.P.1-3 | C: liquid_resources_value (net proceeds); reimbursement option NA. |
| 5.P.4 | C: valuation (proceeds held for a replacement home within three months left out). |

### 3.5 § 8.100.6.A-K: ABD categories, SSI, Pickle, protected groups, OAP (D-65:2725-2908)

| Paragraph | Disposition |
|---|---|
| 6.A.1 | C: ma_is_aged_blind_or_disabled (CO-603), CO-612; § 8.100.5 criteria. |
| 6.B.1 | C: CO-011 (contractor's finding). |
| 6.B.2 | NA: appeal. |
| 6.C.1.a | C: receives_ssi in CO-611. |
| 6.C.1.b | C: CO-611's SSI-standard arm (CO-609 "at most" FBR, 1382(a)(1)(A) "not more than"). |
| 6.C.1.c | C: receives_ssi (presumptive and conditional SSI are SSI payments). |
| 6.C.2-5, 9 | NA: SSA agreement, listings, notices, referral. |
| 6.C.6 | NA: SISC code. |
| 6.C.7 | NA: reinstatement after an overturned SSI denial (date-level). |
| 6.C.8 | C: retains_ssi_status_without_payment (CO-1112) in CO-1163, CO-1176, CO-653. |
| 6.C.10, 10.a.i.1-3 | NA: date-level effective dates under 21 and for infants; the volume is month-level. |
| 6.D.1 | C: ma_pickle_eligible (CO-1159) ("less than" the standard), CO-1158. |
| 6.D.2.a-c | C: lost_ssi_or_oap_due_to_social_security_benefits (CO-1108), CO-1180; CO-4635 for a spouse. |
| 6.E.1.a | C: CO-1108 (eligible and entitled in the same month is part of the fact). |
| 6.E.1.b-e | C: CO-1109, CO-1158. |
| 6.E.2 | C: CO-1159. |
| 6.E.3 | C for a spouse (CO-4635); a parent's COLAs deferred (NM-17). |
| 6.E.4 | C: the disregard is re-derived each month. |
| 6.E.5 | NA: contact and reapplication procedure. |
| 6.F.1-2, G.1-3, H.1.a-f | OQ-209 (closed historical cohorts not offered). |
| 6.I.1, a-f | C: ma_disabled_widow_eligible (CO-1162): widowed, disabled, lost SSI, 50 to 64, no Part A, SSI resources and income without the benefit (NM-9). |
| 6.J.1, a-c.i-iii | C: ma_dac_eligible (CO-1161), CO-1160, CO-1110, CO-1134. |
| 6.J.2 | NA: the BIC code identifies the fact (CO-1110). |
| 6.K.1 | C: CO-1177, CO-2710; OQ-111 (one OAP category). |
| 6.K.2-4 | C: ma_oap_sisc_b_eligible (CO-1177), CO-612's oap_sisc_b arm. |
| 6.K.5 | C: ma_meets_special_income_group (CO-642), ma_meets_imd_requirement (CO-1179). |
| 6.K.6 | NA: AFDC no longer exists; an OAP-B person in a Colorado Works unit is carried by the MAGI and OAP routes. |
| 6.K.7 | C: ma_lost_oap_to_non_oasdi_cost_of_living_adjustment (CO-2209), ma_oap_health_care_status (CO-1156). |
| 6.K.8.a-c | C: CO-1177 (second resource evaluation), CO-1156 (SISC C); the A/B code split is NA. |

### 3.6 § 8.100.6.L-Q: MSP and Buy-In (D-65:2909-3109)

| Paragraph | Disposition |
|---|---|
| 6.L.1, L.5.a-c | NA: benefit package. |
| 6.L.2.a | C: medicare_part_a_entitled (CO-803) in CO-613. |
| 6.L.2.b | C: CO-807, CO-808 in CO-613. |
| 6.L.2.c | C: CO-238 ("at most" 100%). **N2-1** for the income measured. |
| 6.L.2.d | OQ-624. |
| 6.L.3 | C: CO-604, CO-1750 (couple guideline whether one or both apply). |
| 6.L.4 | C: CO-605's couple sum. |
| 6.L.6-8 | NA: labels and the right to be considered for every category (the volume evaluates every category). |
| 6.L.9 | C: residency and status in CO-617's outcome. |
| 6.L.10-11 | C: ma_qmb_effective_month (CO-3622), CO-3621, CO-3623. |
| 6.L.12 | C: ma_msp_cola_disregard (CO-3629), CO-3627, CO-3628, CO-3625; OQ-622. |
| 6.M.1 | NA: benefit. |
| 6.M.2.a-c | C: ma_slmb_eligible (CO-614), CO-239 ("at or below" 120%, above QMB). Historical limits NA. |
| 6.M.3-4 | C: as L.3-4. |
| 6.M.5-6 | C: CO-617's retroactive months (not before 1993, NA). |
| 6.M.7 | C: CO-3629. |
| 6.N.1 | NA: benefit. |
| 6.N.2 | NA: federal allotment and waiting list. |
| 6.N.3 | C: CO-617. |
| 6.N.4.a-c | C: ma_qi_eligible (CO-615) (at least 120%, less than 135%). |
| 6.N.4.d | C: CO-615 reads not ma_has_full_coverage_category (CO-1176) (NM-11). |
| 6.N.5-6 | C: as L.4, L.12. |
| 6.O.1 | NA: benefit. |
| 6.O.2.a-b | C: ma_qdwi_meets_disability_work_history (CO-1157), CO-1106, CO-1107; OQ-84. |
| 6.O.2.c | C: CO-3024 (at or below twice). |
| 6.O.2.d | C: CO-241 (less than 200%). |
| 6.O.3 | C: CO-605. |
| 6.O.4 | C: CO-616 reads CO-1176. |
| 6.O.5-6 | C: ma_qdwi_is_in_effect (CO-3624); OQ-621. |
| 6.P.1.a | C: CO-244 (16). |
| 6.P.1.b | C: CO-1715, CO-242 (at most 450%), CO-3030 (applicant only). **N2-1** for the income measured. |
| 6.P.1.c | C: CO-618 reads no resources; CO-4630 for HCBS. |
| 6.P.1.d | C: ma_wawd_is_disabled (CO-806), CO-2820. |
| 6.P.1.e | C: has_earned_income in CO-618; verification at 5.B.1.c. |
| 6.P.1.e.i | NA: PHE, ended. |
| 6.P.1.f, f.i, f.iii.1-5 | C: ma_wawd_premium (CO-619), ma_wawd_premium_table (CO-2457: bands inclusive at 40, 133, 200, 300, 450%), CO-1800 (7.5% cap). |
| 6.P.1.f.ii | C: CO-2462 (no premium through the determination month). |
| 6.P.1.f.iv | C: dated table versions (OQ-82). |
| 6.P.1.f.v | C: CO-2447 (termination); postpartum waiver in CO-619. |
| 6.P.2 | C: retroactive months (CO-4101). |
| 6.P.3 | NA: opt-out request. |
| 6.Q.1.a | C: CO-3026 (18). **N2-3** (whole month, C.3). |
| 6.Q.1.b, b.i-iv | C: ma_cbwd_countable_household_income (CO-4202), CO-4200, CO-4201, CO-4203, CO-243 (at most 300%); OQ-740. **N2-1** for the income measured. |
| 6.Q.1.c | C: CO-620 reads no resources. |
| 6.Q.1.d | C: CO-011 in CO-620. |
| 6.Q.1.e | C: CO-620's employed-16-to-18 exclusion; CO-622. |
| 6.Q.1.f | C: CO-3630, CO-3631, CO-3632; OQ-623. |
| 6.Q.1.g, g.i | C: ma_cbwd_premium (CO-621), CO-2459 to CO-2461 (5% / 7.5% of household income). |
| 6.Q.1.g.ii | C: CO-2462. |
| 6.Q.1.g.iii | C: CO-621's older-sibling arm (one premium per household). |
| 6.Q.1.g.iv.1-4 | C: CO-2458 (bands inclusive at 133, 185, 250, 300%); OQ-144. |
| 6.Q.1.g.v | C: dated table (OQ-82). |
| 6.Q.1.g.vi | C: CO-2447; postpartum waiver in CO-621. |
| 6.Q.1.g.vii | OQ-511 (blocked on the HCPF notice). |
| 6.Q.2 | C: retroactive months. |
| 6.Q.3 | C: MAGI verification items (CO-1404's CBwD-only arm; other review's scope). |
| 6.Q.4 | NA: opt-out. |

### 3.7 § 8.100.7.A-D: long-term care eligibility (D-65:3111-3207)

| Paragraph | Disposition |
|---|---|
| 7.A.1 (special income category; existing clients) | C: CO-642, CO-651, CO-652. |
| 7.A.1 (SEP/CMA notification) | NA: referral procedure. |
| 7.A.1 (gross income) | C: ma_ltc_gross_income (CO-641). **N2-5** (F.6.y). |
| 7.A.1 (child leaving parents) | C: CO-4624 (no deeming in an institution). **N2-7** (month of admission). |
| 7.A.2.a-b | C: CO-603 in CO-3310. |
| 7.A.2.c, c.i-iii | C: ma_is_institutionalized (CO-640), CO-822; verification CO-1632, CO-1636, CO-1575. The start date (iii) is date-level (NA). |
| 7.A.2.d | C: CO-640, CO-642 (hospital or LTC institution). |
| 7.A.2.e (300%) | C: CO-642 (at most 300% of the FBR), CO-250. |
| 7.A.2.e (income trust) | C: CO-642 (trust, not a hospital, below the regional limit), CO-1985; OQ-99. |
| 7.A.2.e.i.1-3 | C: CO-642, CO-653, CO-1179. |
| 7.A.2.f | C: ma_meets_ltc_resource_standard (CO-648), CO-647. |
| 7.A.2.g | C: § 8.100.7.C and K rows. |
| 7.A.2.h | C: ma_transfer_penalty_applies (CO-660), CO-651. |
| 7.A.2.i-j | C: CO-1634, CO-1635, CO-1638, CO-1639, CO-4631. |
| 7.A.3 | NA: Child Mental Health Treatment Act appeal. |
| 7.B.1 (level of care, community) | C: ma_hcbs_waiver_eligible (CO-653), CO-821, CO-820. |
| 7.B.1.a | C: CO-653 and CO-4630 (SSI, 1619(b), OAP). |
| 7.B.1.b | C: CO-653 (CO-651). |
| 7.B.1.c, c.i | C: CO-653's WAwD arm (EBD, CMHS, BI, CIH, SLS, DD), CO-4630 (NM-12). |
| 7.B.1.c.ii | NA: federal waiver approval (the item assumes approval). |
| 7.B.2 | NA: redetermination procedure. |
| 7.B.2.a.i-iii, b | C: CO-1634, CO-1635, CO-1637, CO-1638, CO-1639. |
| 7.B.2.c | C: ma_owes_long_term_care_asset_disclosure (CO-4631) (NM-13). |
| 7.B.3 | OQ-519 (ACF; blocked on IM 25-030). |
| 7.C.1 | C: CO-641 (own income); CO-643, CO-644. |
| 7.C.2.a | C: CO-647's individual arm when neither is a community spouse. |
| 7.C.2.b | C: CO-604, CO-661 (living together). |
| 7.C.2.c | C: § 8.100.7.K-T rows. |
| 7.C.3 | C: long_term_care_insurance_benefits_received (CO-3606) not in CO-641, added in CO-658. |
| 7.C.4 | C: CO-3626's living-together couple. |
| 7.D | NA: application requirement for State Only clients. |

### 3.8 § 8.100.7.E-J: trusts, transfers, certain assets, life estates, annuities, tables (D-65:3207-4028)

| Paragraph | Disposition |
|---|---|
| 7.E.1.a.i-ii, b-c | C: the Department's trust finding, ma_trust_annuity_life_estate_value_available (CO-4643), in CO-4623; trust documents CO-1634. |
| 7.E.2.a-c, 3.a-c | C: CO-4643 and CO-824 (the Department's determination; the definitions feed it). |
| 7.E.4.a-c | C: CO-4643 (corpus), income facts (payments), CO-824 (other payments). |
| 7.E.5.a-d | C: as E.4. |
| 7.E.6.a.i (lead-in), a.i.a | C: has_income_trust (CO-823), CO-642, CO-1985, CO-3021, CO-3022, CO-1979, CO-1980; OQ-99. |
| 7.E.6.a.i.b, e | C: ma_income_trust_distribution (CO-2238), CO-2236, CO-2237 ($20). |
| 7.E.6.a.i.c.i-iii, d | C: CO-3616, CO-658; OQ-471. |
| 7.E.6.a.i.f | C: CO-2238's HCBS cap; the HCBS member payment (PETI) has no item (OQ-96). |
| 7.E.6.a.i.g-m | NA: trust drafting, notice, remainder and accounting. |
| 7.E.6.b.i.a-q | C: CO-4643 (a valid disability trust is not counted, k); distributions are income facts (m); drafting, notice and review NA. |
| 7.E.6.c.i.a-l, ii, iii | C: as b; the over-65 presumption (ii) is CO-824. |
| 7.E.6.d.i-vi | C: CO-4643 and income facts (third-party trusts by their terms). |
| 7.E.6.e.i | C: receives_ssi in CO-611 is not affected by a trust. |
| 7.E.6.e.ii, 7.a-c | NA: forwarding and submission procedure (documents: CO-1578). |
| 7.F.1.a-g | C: CO-824 (uncompensated value), CO-252. |
| 7.F.2 (lead-in), 2.b | C: CO-660 for institutional, HCBS and PACE (CO-640, CO-653, CO-654). |
| 7.F.2.a | C: ma_transfer_lookback_months (CO-252, 60); transfers before 2006 NA (outside any look-back). |
| 7.F.2.c.i | C: ma_transfer_penalty_months (CO-649), transfer_penalty_divisor (CO-832); OQ-212. |
| 7.F.2.c.ii.a-c | C: transfer_penalty_period_start_date (CO-886); OQ-94. |
| 7.F.2.d | C: ma_transfer_penalty_days (CO-659) (30 days times the fraction, rounded up); OQ-821. |
| 7.F.2.e | C: no cap in CO-649. |
| 7.F.2.f.i-ii | NA: transfers before February 8, 2006. |
| 7.F.2.g.i-ii | C: CO-659 sums the couple's transfers; the overlap timing is CO-886 (OQ-94). |
| 7.F.2.h | C: CO-660 bars LTC only (CO-652); SSI-related is unaffected. |
| 7.F.2.i | C: CO-824 counts transfers during eligibility. |
| 7.F.2.j.i-xi | C: CO-824 (the presumption is the caseworker's finding). |
| 7.G.1.a-c, 2.a, 3.a | C: CO-824 (notes as transfers); the resource side is 5.M.3.m-o. |
| 7.G.4.a.i-iv, b.i-iii, c-e | C: CO-824 (care agreements). |
| 7.G.5.a.i-iii, b | C: CO-824 (joint tenancy fractions are its valuation). |
| 7.G.6.a.i-iv, b.i-iv, c.i-ii.1-4 | C: transfer_was_exempt (CO-825). |
| 7.G.7.a-d | C: CO-825 / CO-824 (rebuttal is the caseworker's finding). |
| 7.G.8.a | C: ma_transfer_penalty_is_apportioned_with_spouse (CO-2232), CO-2234, CO-2235, CO-3311. |
| 7.G.8.b | C: ma_transfer_penalty_months_assigned_from_spouse (CO-2233). |
| 7.G.9 | C: CO-1634. |
| 7.G.10.a-b | NA: notice of court hearings. |
| 7.G.11.a-g | C: CO-825 reads an approved hardship waiver as exempt; request procedure NA. |
| 7.G.12.a-e | C: CO-825 (no penalty: fair value intended, other purpose, all returned); d-e NA (before 2006). |
| 7.H.1.a-c | NA: definitions. |
| 7.H.2.a.i-ii | C: CO-4643 (resource), CO-824 (transfer). |
| 7.H.2.b.i.1-2, ii.1-5 | C: CO-824 (remainder value or purchase price), CO-4643 (resource). |
| 7.H.3-4, H.5 | C: the valuation inside CO-4643 and CO-824 (table incorporated by reference; caseworker figure). |
| 7.I.1.a-m | NA: definitions. |
| 7.I.2.a-b, 3.a-b, 4.a-c | C: CO-4643 and CO-824 (pre-2006 annuities); payments are income facts. |
| 7.I.5.a, a.i | C: owns_annuity (CO-1579), CO-1635, CO-1580. |
| 7.I.5.b-d, g.iii-vi, h | C: CO-824 (an annuity without the Department as remainder beneficiary, or a transaction, is a transfer). Notice to the issuer (c) NA. |
| 7.I.5.e-f | C: CO-4643 (revocable or assignable annuity value); payments not income when it is a resource (the income facts as stated). |
| 7.I.5.g.i-ii | C: income facts (payments counted). |
| 7.J | C: incorporated table used in CO-824's valuation (NA as data). |

### 3.9 § 8.100.7.K-V: spousal impoverishment and post-eligibility (D-65:4029-4458)

| Paragraph | Disposition |
|---|---|
| 7.K.1, 2.a-d, 3 | C: ma_is_institutionalized_spouse (CO-644), ma_ltc_couple (CO-643; not for Buy-In, OQ-127), is_enrolled_in_pace (CO-885), CO-822. |
| 7.L | C: ma_spousal_resources_at_snapshot (CO-888); OQ-126. |
| 7.M.1 (snapshot, intake only) | C: CO-888, CO-646. |
| 7.M.1.a | C: ma_csra (CO-646), CO-828. |
| 7.M.1.b | C: ma_csra_increased (CO-1977). |
| 7.M.1.c | C: ma_court_ordered_transfer_to_community_spouse (CO-1950). |
| 7.M.2 | C: CO-647 subtracts the CSRA; income attribution by payee (P rows). |
| 7.M.3 | C: ma_csra_transfer_is_overdue (CO-4636) in CO-647. |
| 7.M.4.a-c | C: ma_community_spouse_withheld_resources_are_excused (CO-4637) in CO-648. |
| 7.N | C: CO-800 and CO-647 count no household goods, effects or the vehicle. |
| 7.O.1 | C: CO-648 (couple total at or below CSRA plus $2,000). |
| 7.O.2 | C: CO-642 ("at or below"); trust before the MIA (CO-2238 in CO-3616). |
| 7.P.1-4 | C: income facts per payee (attribution is the stated figure). |
| 7.Q.1.a | C: ma_mmmna_standard (CO-662), CO-1801, CO-3031, CO-3032; OQ-145. |
| 7.Q.1.b.i-iii | C: ma_community_spouse_shelter_costs (CO-2802), CO-253, CO-655; OQ-560. |
| 7.Q.2.a-b, b.i-v | C: ma_community_spouse_medical_needs (CO-3619), CO-835; OQ-620. |
| 7.Q.3 | NA: fair-hearing substitution. |
| 7.Q.4 | C: ma_mmmna_cap (CO-830) in CO-655. |
| 7.R.1 | C: CO-1977 counts the MIA before shifting resources. |
| 7.R.2 | C: ma_community_spouse_income_allowance (CO-656), CO-2467, CO-2466. |
| 7.R.3 | C: court_ordered_spousal_support (CO-4619) as CO-656's floor (NM-15). |
| 7.R.4 | NA: change-reporting threshold. |
| 7.S.1.a-c, d.i-iii | C: CO-1977, ma_csra_annuity_lowest_estimate (CO-1948). |
| 7.S.1.e | C: CO-1949 in CO-1977. |
| 7.T.1.a | C: ma_personal_needs_allowance (CO-1987) in CO-3616. |
| 7.T.1.b, e | C: CO-658 deducts the MIA only when CO-1949 is false (NM-14). |
| 7.T.1.c.i | **N2-2** (federal floor). |
| 7.T.1.c.ii | C: ma_family_allowance_members (CO-2469); OQ-95. |
| 7.T.1.d, f | C: CO-658's deduction list. |
| 7.U.1-3 | NA: notice and appeal. |
| 7.V.1.a-d, f-l | NA: AP-5615 procedure. |
| 7.V.1.e.i-iii | C: CO-3612, medicare_part_b_premium_paid (CO-3602), CO-3603 in CO-658; OQ-520, OQ-721. |
| 7.V.2.a-b | NA: collection by the facility. |
| 7.V.2.c | Deferred NM-28. |
| 7.V.3.a | NA: cross-reference. |
| 7.V.3.b.i-ii.1-8 | C: CO-658 (MIA, family allowance, HMA CO-3618, tax CO-3604, garnishment CO-3605, Part B and D); trustee fee within CO-2237; NF PETI (8.c) NA. |
| 7.V.3.c, c.i.1.a-b | C: CO-3606 added in CO-658; application order against the cost of care NA. |
| 7.V.3.d.i.1-2 | C: CO-887 (dated, OQ-212). |
| 7.V.3.d.ii, ii.1-2 | C: CO-1986, CO-255 (the $90 pension is the allowance); OQ-98 title stale (N2-9). |
| 7.V.3.d.iii, e.i-v, f.i-iii | C: CO-3615, CO-3613, CO-3614, CO-3616. |
| 7.V.3.d.iv | C: mandatory_income_tax_withheld (CO-3604); recovery NA. |
| 7.V.3.g.i | C: CO-656 and the spousal rows. |
| 7.V.3.g.ii, ii.1-2.a-b | C: ma_home_maintenance_allowance (CO-3618), CO-3617 (1,672 for 2026), CO-3607, CO-3608. |
| 7.V.3.h | NA: case record. |
| 7.V.3.i, i.i-ii | C: SSI is not in CO-641 (so not in the patient payment). |
| 7.V.3.j | NA: Adult Financial supplement (other review's scope). |
| 7.V.4.a.i-ii | C: CO-658's floor at zero. |
| 7.V.4.a.iii-vi | C: ma_patient_payment_income_committed_elsewhere (CO-4638). |
| 7.V.4.a.vii, b.i-iv, c | NA: QMB co-insurance and facility per-diem proration. |
| 7.V.4.d | C: as V.3.i. |
| 7.V.5.a-c, 6 | NA: personal needs fund handling; cross-reference. |

### 3.10 20 CFR 416.1112 (2012), incorporated by § 8.100.5.H.4.e (D-53)

| Paragraph | Disposition |
|---|---|
| 416.1112(a)-(b) | C: CO-605's order (exclusions, then $20 carryover, $65, one half). |
| (c)(1) EITC and child tax credit refunds | C: tax_refunds_and_credits_received in CO-2470. |
| (c)(2) infrequent or irregular earnings | Deferred NM-26. |
| (c)(3) student child | C: CO-2471, CO-3387. |
| (c)(4) unused $20 | C: CO-605. |
| (c)(5) $65 | C: CO-231. |
| (c)(6) impairment-related work expenses | C: ma_ssi_impairment_related_work_expenses (CO-4628), CO-4616 (NM-8). |
| (c)(7) one half | C: CO-232. |
| (c)(8) blind work expenses | C: ma_ssi_earned_income_excluded_after_half (CO-4629), CO-4617. |
| (c)(9) PASS | C: CO-4629, CO-4618. |
| (c)(10) AmeriCorps | Deferred NM-26. |

### 3.11 10 CCR 2505-10 §§ 8.940-8.942 (D-68)

| Paragraph | Disposition |
|---|---|
| 8.941.1 (lead-in) | C: ma_oap_health_care_status (CO-1156). |
| 8.941.1.A | C: CO-1156 (SISC C: OAP, not Medicaid). |
| 8.941.1.B.1-10, B.8.i, B.10.i, C | NA: benefit package. |
| 8.941.1.D | C (eligibility part): ma_oap_is_patient_in_tb_or_mental_health_institution (CO-1748); service exclusions NA. |
| 8.941.1.E | C: CO-1156's ineligible_before_application. |
| 8.941.1.F | NA: county advisement. |
| 8.941.2.A-I | NA: definitions (E and F feed CO-2710's options). |
| 8.941.3 (lead-in), 3.A | C: CO-1156, CO-1177. |
| 8.941.3.B | C: CO-1156 reads OAP receipt only (AND-CS, AND-SO, OAP-C out; CO-2208). |
| 8.941.4 | C: OAP financial eligibility is the Adult Financial record (CO-2710; Adult Financial review's scope). |
| 8.941.5-8 | NA: provider certification, out-of-state care, claims, rates. |
| 8.941.9 | NA: copayments and the $300 cap (cost sharing, not eligibility). |
| 8.942.1 | C: CO-1156 reports medicaid_eligible in Medicaid's retroactive months. |

Matrix size: 372 rows covering every numbered paragraph and subparagraph of the listed texts (grouped where one disposition serves all). GAP rows: N2-4 only (a P1); the other non-carried rows are NA, OQ or a named deferral.

## 4. Open-question confirmations

Every open question the family's items name was read in volumes/co/open-questions.md and checked against the texts above. No allowed host serves the named documents of the blocked ones (HCPF operational memos and notices are on hcpf.colorado.gov).

| OQ | Class in the file | Confirmation |
|---|---|---|
| OQ-81, 82, 83, 84, 91, 92, 93, 94, 95, 96, 97, 100, 111, 126, 127, 145, 206, 207, 208, 351, 374, 379, 390, 392, 542 | resolved | Confirmed resolved. OQ-83's resolution (deeming) now carries H.3.a; OQ-207 records the spouse half of E.3 and leaves the parent half deferred (NM-17). |
| OQ-98 | resolved | Confirmed, but the title still says the $90 allowance is "not wired"; CO-1987 wires it (N2-9). |
| OQ-99 | blocked on a named document | Confirmed (OM 25-073, not on an allowed host). |
| OQ-144 | state policy choice | Confirmed: Q.1.g's "household size and income" against Q.1.g.iv's "individuals" rows. |
| OQ-200 | state policy choice | Confirmed. |
| OQ-209 | state policy choice | Confirmed after the narrowing: §§ 8.100.6.F-H and 42 U.S.C. 1383c(b) (D-320) describe cohorts closed by 1987-1988; whether Colorado serves anyone left is not in any published text. |
| OQ-212 | blocked on a named document | Confirmed (OM figures for the divisor and allowance). |
| OQ-302 | state policy choice | Confirmed: § 8.100.4.C.2.a.ii and § 8.100.5.B.1.c.ii state 20% without a base; the verification plan (D-317) states 10% without one. |
| OQ-303 | state policy choice | Confirmed (435.952(c)(2)(iii) "a reasonable period"; no Colorado period for other documents). |
| OQ-352, 662, 782 | state policy choice | Adult Financial questions the SSI method shares; confirmed as recorded (Adult Financial review's scope). |
| OQ-471 | needs Legal | Confirmed (the trust paragraph's two sentences). |
| OQ-473 | state policy choice | Confirmed: H.3.a.i says the allocation is taken from the ineligible parents' income; H.3.a.iii is silent on applicant spouses with children. |
| OQ-511, OQ-519 | blocked on a named document | Confirmed (HCPF member notice; IM 25-030). |
| OQ-520, 560, 620, 621, 622, 623, 624, 720, 721, 740 | state policy choice | Confirmed: each turns on wording the texts leave open (O.5 against O.6, "may be approved", "until ... published", "required to enroll", L.2.d, undefined "dependents", V.1.e.i against ii, H applied to a family). |
| OQ-820 | needs Legal | Confirmed: § 8.100.5.M.2.a.ii and M.3.f against 1396p(f) and 435.601(b)(2). N2-6 can join it. |
| OQ-821 | state policy choice | Confirmed: F.2.d counts days and is silent on the month's status. |
| OQ-822 | state policy choice | Confirmed for the SSI method; its assumption contradicts CO-641's reading for the 300% test (N2-5). |
| OQ-823 | state policy choice | Confirmed: F.5.k.ii against H.1.b. |

New open questions the fixes may need: N2-2 (if not made a `statute_override`), N2-5.

## 5. First-pass P1s (re-checked)

Re-run on HEAD 1743a1d in the scratch copy:

| First-pass ID | Check | Result |
|---|---|---|
| NM-1 (revocable burial funds) | X-BURIAL: `ma_ssi_countable_resources` 9,500, category none; CO-185 aged (1,500) | fixed |
| NM-2 (real property for sale) | X-FORSALE: 1,000, aged; CO-185 | fixed |
| NM-3 (spouse's IRA) | X-IRA and CO-189: p1 1,000, aged, QMB true | fixed |
| NM-4 (income-producing property) | CO-4621's derivation: $6,000 exclusion, and for business property only with the 6% return (J.2-3) | fixed |
| NM-5 (home as a resource) | CO-4622's derivation; CO-139 eligible_institutional with written intent, patient payment 1,810 | fixed (see N2-4, N2-6 for the relative and intent arms) |
| NM-6 (lump sums) | X-LUMP 780 as stated (the receipt sits in lump_sum_received only, per CO-3367's precision); CO-2470 excludes the retroactive SSI/Title II parts | disposition confirmed |
| NM-7 (PASS) | X-PASS: 880, disabled | fixed |
| NM-8 (IRWE, blind work expenses) | CO-4628 before the one half, CO-4629 after it; CO-1715 likewise | fixed |
| NM-9 (disabled widow(er)) | X-DWB: `ma_disabled_widow_eligible` false, protected group none | fixed |
| NM-10 (parental deeming) | X-DEEM and CO-186: deemed 2,963.50, countable 2,943.50, none | fixed |
| NM-11 (QI-1 "otherwise eligible") | X-QI: `ma_msp_category` none, Buy-In working adults | fixed |
| NM-12 (Buy-In route to HCBS) | CO-187: eligible_hcbs | fixed |
| NM-13 (B.2.c documents) | CO-187 and X-WAWDHCBS: `ma_asset_transfers_verification_is_pending` false | fixed |
| NM-14 (refused MIA) | X-REFUSE: patient payment 2,486.74 | fixed |
| NM-15 (court-ordered support) | CO-188: allowance 2,500, patient payment 300. X-COURT still states the order in CO-1950 (the CSRA transfer fact), so it gives 1,671.40; that is the fact split the disposition describes, not a regression. | fixed |

The earlier non-MAGI P1s the first pass spot-checked (final F-3 to F-7, final2 F2-2, final3 F3-1) were not re-run individually; CO-112 (815.34) and CO-139 (1,810) give the same figures as at a2ed7f0.
