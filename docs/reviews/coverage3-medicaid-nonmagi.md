# Coverage review, third pass: Medicaid non-MAGI (family file `coverage3-medicaid-nonmagi`)

Reviewer pass: third exhaustive coverage matrix, 2026-11-22, on HEAD `a4fe0e5` (branch `ccr-9d19bf4c-wmnwcl`). It follows the two fix rounds recorded in docs/reviews/coverage-medicaid-nonmagi.md ("Disposition (coverage round)", 44aab15) and docs/reviews/coverage2-medicaid-nonmagi.md ("Disposition (coverage pass 2)", c9df750 and deb753e), and the later commits of other families that touched shared items (CCCAP's in-kind and G.I. Bill fact unification, the MAGI round's CO-620). Only this file was written in the repository; nothing was committed.

Governing texts, read line by line from volumes/co/documents/ (unchanged since pass 2, `git diff 1743a1d HEAD -- volumes/co/documents` is empty):
- D-65, 10 CCR 2505-10 § 8.100 (SOS rule version effective 11/14/2026): § 8.100.5.A-P (D-65:2095-2723), § 8.100.6.A-Q (D-65:2725-3109), § 8.100.7.A-V (D-65:3111-4458).
- D-68, 10 CCR 2505-10 §§ 8.940-8.942.
- D-53, 20 CFR 416.1112 (incorporated by § 8.100.5.H.4.e). Read where a finding turns on them: 42 U.S.C. 1396p(b) (D-46), 1396r-5 (D-47).

**Method.**
- The matrix below was built from the text before I compared it with the earlier passes' matrices; I compared only afterwards, to find rows disposed of differently (§ 8.100.7.C.2.b, § 8.100.5.F.6.t, § 8.100.5.M.2.a.xiv; see C3-1, C3-4, C3-5).
- Ledger regenerated in a scratch copy (`git archive HEAD`, `npm run export -- --volume co`): 2,198 items. From it I built a citation index of every § 8.100.5-8.100.7, § 8.94x and 416.11xx reference in an item's meaning, precision or cited excerpt (309 keys) and read the derivation of each item a paragraph maps to.
- Fix-round items read in full: CO-4600 to CO-4643 (all 40 that exist), CO-4880 to CO-4888, and the edited CO-608, CO-641, CO-650, CO-656, CO-657, CO-658, CO-800, CO-889, CO-1162, CO-2470, CO-2471, CO-4622, CO-4624, plus their readers (CO-605, CO-606, CO-612, CO-617, CO-622, CO-663, CO-1163, CO-1176, CO-1715, CO-3310, CO-4200, CO-4201, CO-4623, CO-4627, CO-4634, CO-1158, CO-1160) and the `git diff` of c9df750 and deb753e for CO-4622 and CO-889.
- Probes: scratch households appended to the scratch copy's `volumes/co/tests/cases.yaml`, evaluated with `npx vite-node scripts/eval-case.ts co <id> <identifiers> <month>`. Generators and specs: `/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cov3nm/gen/` (`mk.py`, `z.yaml`, `z2.yaml`, `z3.yaml`, `z4.yaml`). The pass-2 probes (`scratchpad/cov2nm/gen/s1-s4.yaml`), the pass-1 probes (`scratchpad/x-cases-nonmagi.yaml`) and the stored cases CO-185 to CO-189 and CO-212 to CO-214 were re-run (section 5).

Each finding carries a frequency label: **common case or regression** (an ordinary household of the group, or a defect introduced or left half-done by a fix round) or **rare edge combination**.

## 1. Verdict

**5 P1 found.** The family does not yet meet the stopping rule.

Every earlier P1 (NM-1 to NM-15, N2-1 to N2-4) stays fixed (section 5). The new P1s:

| ID | Frequency | One line |
|---|---|---|
| C3-1 | rare edge combination | In the month a spouse enters an institution, the SSI-method income sums drop that spouse's income while household size, standard and resources still treat the couple as living together (§ 8.100.7.C.2.b, § 8.100.5.H.1.a). Both spouses come out "aged" on half the couple's income. |
| C3-2 | regression (pass-2 fix half-done); rare edge combination | The non-cooperation denial (§ 8.100.5.E.6, § 8.100.7.V.2.c) and the dated disability onset (§ 8.100.5.C.4.b) gate ma_ssi_related_category (CO-612) but not ma_is_ssi_related_eligible (CO-611), so ma_has_full_coverage_category (CO-1176) still says "Medicaid-eligible" for a person CO-612 denies. OAP Health Care, QI-1, QDWI, BCCP, family planning and CHP+ read CO-1176. |
| C3-3 | rare edge combination | The Disabled Adult Child, disabled widow(er) and Pickle income tests (CO-1160, CO-1158) take the $65 and one half from gross earnings with none of the 20 CFR 416.1112(c) exclusions § 8.100.5.H.4.e incorporates (student, IRWE, blind work expenses, PASS, infrequent $30, Census wages). |
| C3-4 | common case for the adopted-child population; partly regression | Subsidized adoption funds, which § 8.100.5.F.6.t exempts, are counted: in the Children with Disabilities Buy-In household income (CO-4201) and in the parental income deemed to a disabled child (CO-4634, added by the first fix round). |
| C3-5 | regression (fix-round item CO-4622); the Medicare Savings Program half is a common case | A recorded beneficiary deed makes the home countable for everyone ("every home is read as subject to estate recovery"). § 8.100.5.M.2.a.xiv conditions it on the home being "subject to estate recovery", and 42 U.S.C. 1396p(b)(1) allows no recovery for someone under 55 who is not institutionalized, and none of Medicare cost-sharing. |

There are also 5 P2 findings (C3-6 to C3-10) and 3 P3 findings (C3-11 to C3-13). The deferred first-pass P2 (NM-17, the parent half) is still deferred, for the reason the pass-2 disposition gives. All open questions are confirmed (section 4).

## 2. Findings

P1: a wrong eligibility or benefit answer, a missing pathway, or a wrong or missing verification requirement. P2: a gap or mismatch with no answer effect in ordinary cases, or a reading that departs from the text without a record. P3: a note.

| ID | Pri | Frequency | Paragraph | Item(s) | Governing text | What is wrong | Proposed fix |
|---|---|---|---|---|---|---|---|
| C3-1 | **P1** | rare edge combination | § 8.100.7.C.2.b; § 8.100.5.H.1.a; § 8.100.6.L.3 | ma_ssi_household_unearned_income_sum (CO-663), ma_ssi_countable_earned_income (CO-605), ma_ssi_child_allocation_from_spouse_earned (CO-2279), ma_ssi_impairment_related_work_expenses (CO-4628), ma_ssi_earned_income_excluded_after_half (CO-4629), ma_pickle_countable_income (CO-1158), ma_dac_countable_income (CO-1160) against ma_ssi_household_size (CO-604), ma_ssi_couple_members (CO-3626), ma_excluded_from_ssi_household (CO-661) | C.2.b: "Beginning the first month following the month the couple ceases to live together, only the income of the individual spouse is counted in determining his or her eligibility." H.1.a: "Income of spouses living together is considered mutually available for SSI related, OAP, and Medicare Savings Programs (MSP)." | CO-604 and CO-3626 keep the couple together through the admission month (CO-661 is true only from the first day of the month after institution_entry_date), and CO-604's precision says "in the admission month itself the couple's incomes are still mutually available". The income sums filter the group on `resides_in_medical_institution` instead, so in the admission month each spouse's income is the spouse's own, tested against the couple FBR (or couple FPL) and the couple's resources. **Z-ADM** (CO-213's couple without the child, p1 admitted 2026-11-03, as_of 2026-11-20, p1 Social Security 1,000, p2 700, resources 500 each): engine `ma_ssi_household_size` 2 for both, `ma_ssi_countable_income` p1 980 and p2 680, `ma_ssi_related_category` aged for both. The rule: 1,000 + 700 - 20 = 1,680 > couple FBR 1,491: none for both. The fix-round items CO-4628 and CO-4629 copied the same filter. | Filter the income sums on ma_excluded_from_ssi_household (CO-661), as CO-3626 does (or read CO-3626 itself). Store Z-ADM. |
| C3-2 | **P1** | regression (pass-2 NM-28/NM-30 fix half-done); rare edge combination | § 8.100.5.E.6; § 8.100.7.V.2.c; § 8.100.5.C.4.b; § 8.941.3.A; § 8.100.6.N.4.d, O.4 | ma_abd_denied_for_noncooperation (CO-4886), ma_month_is_before_disability_onset (CO-4888), ma_is_ssi_related_eligible (CO-611), ma_has_full_coverage_category (CO-1176); readers of CO-1176: ma_oap_health_care_status (CO-1156), ma_qi_eligible (CO-615), ma_qdwi_eligible (CO-616), ma_bccp_eligibility_status, ma_family_planning_status (CO-1154), chp_eligibility_status | E.6: "Medical Assistance shall be denied or terminated if the applicant or client refuses or fails to make a reasonable effort to secure potential resources or income." C.4.b: retroactive months need disability approved or onset "on or prior to the date of a medical service". § 8.941.3.A: SISC C is for OAP recipients "who ... do not otherwise qualify for the Colorado Medicaid Program". | Deb753e put both gates into the category outcomes (CO-612, CO-617, CO-622, CO-1163, CO-3310) but not into CO-611, which CO-1176 reads. A person CO-612 reports `none` is still "fully covered" for every program that asks whether the person is otherwise Medicaid-eligible. **Z-NONCOOP** (CO-212's aged person, an OAP recipient, with the E.5-7 finding true): `ma_ssi_related_category` none, `ma_is_ssi_related_eligible` true, `ma_has_full_coverage_category` true, `ma_oap_health_care_status` medicaid_eligible, so the person gets no coverage at all. The rule: denied Medicaid, so eligible_state_only. **Z-ONSET** (disabled, onset 2026-09-15, retroactive month August): CO-612 none, CO-1176 true (QI-1, QDWI, BCCP and CHP+ would treat the month as covered). | Gate CO-611 itself (or CO-1176's SSI-related arm) on `not ma_abd_denied_for_noncooperation` and, for the disabled arm, `not ma_month_is_before_disability_onset`, as CO-612 does. Keep CO-612's SSI-recipient exception. Store Z-NONCOOP. |
| C3-3 | **P1** | rare edge combination | § 8.100.6.J.1.c.iii; § 8.100.6.I.1.f; § 8.100.6.E.2; § 8.100.5.H.4.e (20 CFR 416.1112(c)(2), (3), (6), (8), (9)); F.6.z | ma_dac_countable_income (CO-1160; read by CO-1161 and the disabled widow(er) test CO-1162), ma_pickle_countable_income (CO-1158) | J.1.c: eligible if SSI would continue with "the current OASDI income of the applicant ... disregarded" and "other countable income is below the current years SSI FBR". 416.1112(c)(3): "If you are under age 22 and a student who is regularly attending school"; (c)(6): "Earned income you use to pay impairment-related work expenses". | Both items rebuild the earned side from `wages_gross + ma_self_employment_net_earnings` with only the $65, any unused $20 and one half. They do not subtract ma_ssi_excluded_earned_income (CO-2471: student, infrequent $30, Census wages), IRWE (CO-4628), or blind work expenses and PASS (CO-4629), which the first fix round added to CO-605 (NM-7, NM-8) but not here. **Z-DACIRWE** (35, Disabled Adult Child, OASDI 1,200, wages 2,200, IRWE 600, October 2026): `ma_dac_countable_income` 1,057.5, `ma_dac_eligible` false. The rule: (2,200 - 85 - 600)/2 = 757.5 < 994, so eligible; the person's SSI-method income (1,947.5) fails, so DAC is the only route. **Z-DACSTU** (20, college student, same OASDI, wages 2,200, January 2026): engine 1,057.5, while CO-2471 itself excludes 2,200 and the rule gives 0. | Subtract CO-2471 per member before the $65, CO-4628 before the half and CO-4629 after it, in CO-1160 and CO-1158, as CO-605 does. Store Z-DACIRWE. |
| C3-4 | **P1** | common case for adopted disabled children; partly regression (CO-4634's deeming is a first-round fix) | § 8.100.5.F.6.t; § 8.100.6.Q.1.b.iii; § 8.100.5.H.3.a | ma_cbwd_household_unearned_income (CO-4201), ma_ssi_deeming_parents_countable_income (CO-4634), ma_ssi_excluded_unearned_income (CO-2470); fact adoption_subsidy_received (CO-4451) | F.6.t: "A child receiving subsidized adoption funds shall be excluded from the Medical Assistance budget unit and his income shall be exempt from consideration in determining eligibility, unless such exclusion results in ineligibility for the other members of the household." Q.1.b.iii applies "8.100.5.F.6 - Income Exemptions" to the Buy-In household. | CO-4451 is stated on the adoptive parent as part of the parent's other unearned income, and no Medicaid item reads it (used_by: none in Medicaid). The Buy-In household sum counts it, and the parental deeming added for NM-10 deems it to the disabled child. Both earlier passes marked F.6.t carried ("the SSI method counts no child's income"), which overlooks that the subsidy is stated on the parent. **Z-ADOPT2** (CO-145 with the parent's wages 9,500 and an adoption subsidy of 900, October 2026): `ma_cbwd_countable_household_income` 5,597.5 (310% FPL), `ma_buy_in_category` none, `ma_ssi_parental_income_deemed` 4,603.5. Exempting the subsidy gives 4,707.5 (261%): children_with_disabilities. **Z-ADOPT** (wages 5,600): premium 90 for November instead of 70. | Subtract adoption_subsidy_received in CO-4201 and CO-4634 (the subsidy is paid for the child; F.6.t exempts it). Do not add it to CO-2470, which also serves the adoptive parent's own SSI-related test. The "unless" clause (ineligibility for other members) concerns MAGI budget units and can be recorded in the precision. Store Z-ADOPT2. |
| C3-5 | **P1** | regression (fix-round item CO-4622, NM-5); the MSP half is a common case, the under-55 half a rare edge | § 8.100.5.M.2.a.xiv; M.3.e; 42 U.S.C. 1396p(b)(1) (D-46:51-63) | ma_home_is_countable_resource (CO-4622), home_has_recorded_beneficiary_deed (CO-4615); readers CO-4623, CO-608, CO-610, CO-613 to CO-616, CO-4627 | xiv: "The principal place of residence, which is subject to estate recovery, becomes a countable resource upon the execution and recording of a beneficiary deed." 1396p(b)(1): "No adjustment or recovery of any medical assistance correctly paid ... may be made, except" for an institutionalized individual (A) or one "55 years of age or older" (B), and (B)(ii) excludes "medical assistance for medicare cost-sharing or for benefits described in section 1396a(a)(10)(E)". | CO-4622's precision reads "Every home is read as subject to estate recovery (xiv)". That drops the condition the paragraph states. A disabled applicant under 55 who lives at home, and a Medicare Savings Program applicant whose only benefit is Medicare cost-sharing, own homes that no recovery can reach, yet a beneficiary deed puts the whole equity into their resources. No open question records the reading. **Z-BDEED** (CO-212's aged person, Social Security 1,150, living in her home, equity 150,000, beneficiary deed recorded): resources 151,000, `ma_msp_category` none for November. QMB benefits are not subject to recovery, so the home stays exempt: resources 1,000, QMB in effect November. **Z-BDEED40** (40, disabled, SSDI 800): resources 151,000, `ma_ssi_related_category` none. Not subject to recovery (under 55, not institutionalized): disabled. | Test xiv only when the home is subject to recovery: the person is 55 or older or institutionalized (1396p(b)(1)(A)-(B)), and not for the Medicare Savings Program tests (1396p(b)(1)(B)(ii)). Parental deeming (CO-4627) should also not count a parent's beneficiary-deed home. Alternatively, record an open question (needs Legal) with the present reading as its assumption. Store Z-BDEED40. |
| C3-6 | P2 | rare edge combination | § 8.100.6.P.1.b; § 8.100.5.H.4.e (416.1112(c)(2)-(3)); F.6.z | ma_wawd_countable_income (CO-1715) | P.1.b: income "after income allocations and disregards. See 8.100.5.F ... and 8.100.5.H". | CO-1715 subtracts CO-2470, IRWE, blind work expenses and PASS, but not ma_ssi_excluded_earned_income (CO-2471): the student exclusion, the infrequent $30 and Census wages. **Z-WAWDSTU** (19, college student, disabled, wages 3,000, January 2027): `ma_wawd_countable_income` 1,457.5, `ma_wawd_premium` 25. The rule: (3,000 - 2,410 - 85)/2 = 252.5 (19% FPL), so no premium. Eligibility changes only at earnings near 13,000 a month. | Subtract CO-2471 from the applicant's earnings in CO-1715 (both places it computes earned income). |
| C3-7 | P2 | rare edge combination | 416.1112(c)(6), (8) | CO-1715; ma_wawd_eligible (CO-618) | (c)(6): IRWE "if you are disabled (but not blind) and under age 65"; (c)(8): blind work expenses "if you are blind and under age 65". | CO-1715 applies IRWE and blind work expenses at any age, and its precision says "A Buy-In applicant meets the disability criteria and is under 65 (ma_wawd_eligible)". CO-618 has no upper age (P.1.a: "at least age 16"). A Buy-In worker of 65 or more gets exclusions the SSI rule stops at 65, as CO-4628 and CO-4629 apply them. | Add the `age < ma_aged_age` test (as CO-4628/CO-4629) and correct the precision. |
| C3-8 | P2 | rare edge combination | § 8.100.6.Q.1.b.iii; F.6.z; 416.1112(c)(2) | ma_cbwd_household_earned_income (CO-4200) | Q.1.b applies the F.6 exemptions and the H disregards to the household. | CO-4200 subtracts CO-2471 only for a disabled or blind child of the Buy-In's age. Since deb753e CO-2471 also holds the infrequent $30 and decennial Census wages, which apply to any earner, so a parent's Census wages count in the household income. | Subtract CO-2471's infrequent and Census parts for every member, and its student part as now (OQ-740 records how the disregards apply to a family). |
| C3-9 | P2 | rare edge combination | § 8.100.6.C.8; § 8.100.1 (1619(b)); § 8.100.5.E.6 | ma_protected_group_category (CO-1163) | C.8: "Individuals who remain eligible as SSI recipients but are not receiving SSI payments shall receive Medical Assistance benefits." | CO-612 exempts an SSI recipient from the non-cooperation denial ("whose Medicaid follows the SSA's SSI determination"), but CO-1163 applies it before continued_ssi_status. A 1619(b) member is an SSI recipient for Medicaid purposes, by SSA's determination. Neither precision records why the two differ. | Test the denial after the continued_ssi_status arm, or record the reading in CO-4886's precision. |
| C3-10 | P2 | rare edge combination | § 8.100.5.F.6 (a, c, l, o, p, q, z, aa-cc) against § 8.100.7.A.1 | ma_ltc_gross_income (CO-641); OQ-822, OQ-867 | F.6: "For the purpose of determining eligibility for the Long Term Care and Aged, Blind, and Disabled Medical Assistance categories the following shall be exempt". A.1: gross income is "income before application of deductions, exemptions or disregards". | OQ-822 records the A.1-over-F.6 choice for cash grants and OQ-867 for rents. But the same choice also counts bona fide loans, retroactive SSI and Title II lump sums, foster care payments, PASS income, Census wages and student grants in the 300% test (every one is part of the unearned or earned facts CO-641 sums), and no open question names them. Loan proceeds are not income at all (416.1103(f)). | Widen OQ-822 to every F.6 receipt (or subtract loan proceeds and tax refunds, which are not income, in CO-641). |
| C3-11 | P3 | rare edge combination | 416.1112(a), (c)(2)-(3) | CO-2471 | (a): the exclusions apply "in the order listed in paragraph (c) ... to the rest of your income". | CO-2471 adds the student, infrequent and Census exclusions independently, so the same dollars can be excluded twice and the student exclusion's yearly maximum is used up on wages the Census or infrequent exclusion already removed. CO-605's floor at zero keeps the month's figure right. Only the yearly cap is affected. | One line in CO-2471's precision, or take the student exclusion on wages less the other two. |
| C3-12 | P3 | rare edge combination | § 8.100.5.M.2.a.ix | ma_spouse_or_dependent_relative_lives_in_home (CO-4880), ma_spouse_or_qualifying_child_lives_in_home (CO-889) | ix: "as long as the individual's spouse or dependent relative continues to live there". | For a person in a facility, any tax dependent or qualifying child who lives in any private dwelling is read as living in the person's home. The precision records this, but a dependent who lives elsewhere (an adult child in their own apartment) keeps the home exempt. | Note that the case should state the relative's dwelling_id as the home, or read home_dwelling_id where stated. |
| C3-13 | P3 | rare edge combination | § 8.100.5.F.5.i.1 | CO-663, CO-1715, CO-4201 | The hardship exemption is "an applicant/member['s]" request. | CO-663 reads `ma_lottery_winnings_hardship_exemption_granted` of the person evaluated, not `(of (P) ...)`, so the applicant's exemption also removes a spouse's winnings (and in CO-4201 every household member's). | Read it per member. |

Carried, still deferred, not counted again: NM-17 (a parent's OASDI cost-of-living increases for a Pickle child): the pass-2 deferral reason still holds.

## 3. Coverage matrix

Key: **C** = carried by (the derivation was read and is correct unless a finding is named). **NA** = not applicable, with the reason. **OQ** = open question. **GAP** = no item and no recorded reason. Rows group subparagraphs only where one disposition serves all of them. 394 rows.

### 3.1 § 8.100.5.A-E: application, verification, effective dates, estate recovery, availability (D-65:2095-2232)

| Paragraph | Disposition |
|---|---|
| 5 (heading) | NA: heading. |
| 5.A.1 (lead-in) | NA: which site takes the application and the SSI referral (procedure); the categories it names are carried in § 8.100.6. |
| 5.A.1.a | C: meets_ssa_disability_criteria (CO-011) is the contractor's or SSA's finding; the second form is NA (procedure). |
| 5.A.1.b | NA: forwarding to the contractor. |
| 5.A.1.c | C: ma_wawd_limited_disability_finding (CO-2820), ma_wawd_is_disabled (CO-806). |
| 5.A.1.d | NA: public health emergency continuation, ended May 11, 2023. |
| 5.A.2 | NA: the application form. |
| 5.B.1 (lead-in) | C: ma_verification_status (CO-1415) and its counts (CO-1411, CO-1412). |
| 5.B.1.a | C: ma_requires_verification_of_ssn (CO-1401), ssn_exception_applies (CO-1312). |
| 5.B.1.a.i | NA: emergency self-attestation, ended. |
| 5.B.1.a.i.1 | C: ma_is_emergency_medicaid_only (CO-510). |
| 5.B.1.b | C: the § 8.100.3.H citizenship and identity items (MAGI family's scope; cross-reference only). |
| 5.B.1.c (attestation, electronic sources, SSN, ROP 30 days) | C: ma_requires_verification_of_earned_income (CO-1403), ma_income_reasonable_opportunity_days (CO-1349). |
| 5.B.1.c.i-ii | C: ma_abd_income_is_reasonably_compatible (CO-1640), ma_reasonable_compatibility_threshold_pct (CO-1350); OQ-302 (what the 20% is of), OQ-374 (resolved). |
| 5.B.1.c.iii (post-emergency: both above, ineligible) | C: CO-1640's both-above arm. The emergency sentences are NA. |
| 5.B.1.c.iii (explanation, ROP after the emergency) | C: CO-1403, CO-1349. |
| 5.B.1.c.iv (documents only when not compatible and no explanation) | C: CO-1403 with CO-1640. The emergency sentence is NA. |
| 5.B.1.c (self-employment ledgers; wage stubs; estimated earnings; prior month) | NA: acceptable documents and the caseworker's budgeting of a month's earnings; the volume takes the month's figure as stated. |
| 5.B.1.c.v | NA: emergency, ended. |
| 5.B.1.d | C: ma_requires_verification_of_unearned_income (CO-1404) (the month or the month before). |
| 5.B.1.d.i | NA: emergency, ended. |
| 5.B.1.e | C: ma_requires_verification_of_resources (CO-1405); an Asset Verification Program match is a document fact (NA). |
| 5.B.1.e.i | NA: emergency, ended. |
| 5.B.1.f | C: CO-510 and the § 8.100.3 status items. |
| 5.B.1.g | C: the "questionable" facts read in CO-1404 and CO-1405. |
| 5.B.1.h | NA: case-file documentation. |
| 5.C.1.a-b | C: ma_month_is_before_coverage_period (CO-4101); the outcomes test each month. |
| 5.C.2 | C: cross-reference to § 8.100.7.A-B (rows 3.7). |
| 5.C.3 | C: ma_cbwd_eligible (CO-620) tests ma_age_before_determination_month (CO-4790) (N2-3 fixed; Y-CBWD19 gives children_with_disabilities). |
| 5.C.4 (lead-in), 4.a, 4.c | C: CO-4101 and the ABD outcomes, which apply the same criteria to the retroactive months. |
| 5.C.4.b.i-ii | C: disability_onset_date (CO-4887), ma_month_is_before_disability_onset (CO-4888) in CO-612. **C3-2** (fixed, 2026-11-23) (the gate does not reach CO-611 or CO-1176). |
| 5.D.1.a-c | NA: written information on estate recovery (notice procedure). |
| 5.E (preamble, payer of last resort) | NA: statement of policy; carried by E.1-9. |
| 5.E.1 | C: every income fact is a monthly amount (volume convention). |
| 5.E.2 | C: CO-663, CO-605, CO-608 (spouse group); exceptions in § 8.100.7.C. **C3-1** (fixed, 2026-11-23) (the admission month). |
| 5.E.3.a-c | C: the holdings facts state resources the person or spouse owns and can convert (liquid_resources_value CO-3390 and the rest); availability is the caseworker's valuation. |
| 5.E.4 | C: as E.3 (a resource needing legal action is still stated). |
| 5.E.5 | C: ma_failed_to_pursue_potential_resources_or_income (CO-4884) is false while appropriate steps are shown. |
| 5.E.6 | C: CO-4884 to ma_abd_denied_for_noncooperation (CO-4886) to CO-612, CO-617, CO-622, CO-1163, CO-3310. **C3-2** (fixed, 2026-11-23), **C3-9** (fixed, 2026-11-23). |
| 5.E.7 | C: CO-4884's meaning (a person who acts on the notice is false); the notice itself is NA. |
| 5.E.8 | C: the trust rows of § 8.100.7.E (ma_requires_verification_of_trust CO-1634, ma_trust_annuity_life_estate_value_available CO-4643). |
| 5.E.9 (lead-in), 9.a | C: the holdings facts are stated as known in the month; the month-of-discovery income is part of the unearned facts. |
| 5.E.9.b | NA: overpayments (§ 8.065). |
| 5.E.9.c | NA: repayment option after an ineligibility finding (procedure). |

### 3.2 § 8.100.5.F-G: income (D-65:2233-2378)

| Paragraph | Disposition |
|---|---|
| 5.F.1 | NA: scope statement. |
| 5.F.2 | C: the month's income facts; the previous month's figure is the caseworker's budgeting (NA). |
| 5.F.3 | C: the `holds_out_as_spouse_with` edge beside `spouse` in CO-663, CO-605, CO-604. |
| 5.F.4 (lead-in, countable the month received, resource the next) | C: CO-605 (income); the unspent part is in liquid_resources_value the next month (statement convention). |
| 5.F.4.a | C: wages_gross in CO-605, CO-641. |
| 5.F.4.b | C: ma_self_employment_net_earnings (CO-1704). |
| 5.F.4.c-d | C: part of wages_gross or self-employment as the facts state them. |
| 5.F.5 (lead-in) | C: CO-663, CO-641. |
| 5.F.5.a-h | C: part of the unearned income facts (other_unearned_income_taxable, _nontaxable, tax_exempt_interest), CO-663; a lump sum is counted in the month (lump_sum_received precision). |
| 5.F.5.i | C: lottery_gambling_winnings_received in CO-663, CO-641, CO-1715, CO-4201. |
| 5.F.5.i.1, 1.a-b | C: ma_lottery_winnings_hardship_exemption_granted (CO-2222). **C3-13** (noted, 2026-11-23) (read for the applicant only). |
| 5.F.5.j.i-v, vii | C: pension_income, social_security_income, unemployment_income and the other unearned facts in CO-663. |
| 5.F.5.j.vi | C: CO-2470 subtracts va_aid_and_attendance_amount (N2-1 fixed; CO-212 880, aged). |
| 5.F.5.k.i-ii | C: ssi_in_kind_support_and_maintenance (CO-802), shelter_costs_paid_by_others (CO-3404); OQ-823 (flat one third versus PMV). |
| 5.F.6 (lead-in: LTC and ABD) | C for the SSI method: CO-2470, CO-2471 (rows below). LTC: OQ-822, OQ-867. **C3-10** (fixed in part; OQ-822 widened, 2026-11-23) (the other F.6 receipts in the 300% test). |
| 5.F.6.a | C: loan_proceeds_received in CO-2470. **C3-10** (fixed in part; OQ-822 widened, 2026-11-23) (LTC). |
| 5.F.6.b, d | C: in-kind food is not an income fact; a Title VII cash benefit is federally_excluded_payments_received (CO-3366) in CO-2470. |
| 5.F.6.c | C: retroactive_social_security_lump_sum_received and retroactive_ssi_or_public_assistance_lump_sum_received in CO-2470; the nine-month resource exclusion in CO-800 (CO-4639, CO-4640). |
| 5.F.6.e | NA: home produce consumed is not an income fact. |
| 5.F.6.f, h, i, r, s, v, x | C: federally_excluded_payments_received (CO-3366) in CO-2470. |
| 5.F.6.g.i-vi | C: housing assistance is not an income fact; ISM reads only shelter costs others pay (CO-3404). |
| 5.F.6.j | C: general_or_emergency_assistance_received (CO-3812), charitable_need_based_cash_received (CO-4308) in CO-2470. |
| 5.F.6.k | C: CO-3366 (disaster assistance) in CO-2470. |
| 5.F.6.l | C: foster_care_provider_payments_received in CO-2470. |
| 5.F.6.m | C: CO-3366 (volunteer payments below the minimum wage). |
| 5.F.6.n | C: energy_assistance_received in CO-2470. |
| 5.F.6.o-p | C: workforce_program_payments_received (CO-3815) less vocational_training_allowance_received (CO-4300) in CO-2470. |
| 5.F.6.q | C: pass_set_aside_income in CO-2470; earned PASS in CO-4629. |
| 5.F.6.t | C: adoption_subsidy_received subtracted in CO-4201 and CO-4634 (C3-4 fixed 2026-11-23; stored CO-400, CO-401). |
| 5.F.6.u | C: tax_refunds_and_credits_received in CO-2470; the two-month resource exemption is the caseworker's valuation of CO-3390 (NA). |
| 5.F.6.w | C: a reimbursement is not an income fact. |
| 5.F.6.y | C: tanf_cash_income and adult_financial_cash_income are not read by CO-663; county General Assistance is CO-3812 in CO-2470; OQ-822. |
| 5.F.6.z | C: decennial_census_wages_received (CO-4881) in CO-2471. **C3-6** (fixed, 2026-11-23), **C3-8** (fixed, 2026-11-23), **C3-11** (noted, 2026-11-23). |
| 5.F.6.aa-cc | C: educational_assistance_received in CO-2470. |
| 5.F.6.dd | NA: ARRA's $25 a week ended in 2010. |
| 5.G.1 | C: the sponsor-deeming items of § 8.100.3.K (Adult Financial and MAGI families' scope); OAP is the Adult Financial family's. |

### 3.3 § 8.100.5.H-L: allocations, disregards, ownership, property income, VA, reverse mortgages (D-65:2379-2494)

| Paragraph | Disposition |
|---|---|
| 5.H.1 (lead-in: SSI-related, OAP, MSP, both Buy-Ins; not HCBS or LTC) | C: CO-605/606 (SSI-related, MSP), CO-1715 (WAwD), CO-4200/4201 (CBwD); CO-641 applies none. |
| 5.H.1 (WAwD: spouse's income does not count) | C: CO-1715 reads the applicant only. |
| 5.H.1.a | C: CO-663, CO-605 over the spouse group. **C3-1** (fixed, 2026-11-23). |
| 5.H.1.b | C: CO-802 in CO-663; not for an unemancipated child (ma_is_ssi_unemancipated_child, CO-2275); OQ-823. |
| 5.H.2.a.i-ii | C: CO-2275 (ma_ssi_unemancipated_child_age_limit 18, student limit). |
| 5.H.2.b-c | C: ma_is_applying_for_or_eligible_for_ssi (CO-2271). |
| 5.H.3 (lead-in), 3.a (lead-in) | C: CO-2281, ma_ssi_parental_income_deemed (CO-4626), ma_ssi_deeming_parents (CO-4624). **C3-4** (fixed, 2026-11-23) (adoption subsidy deemed). |
| 5.H.3.a.i | C: ma_ssi_ineligible_child_allocation (CO-2277) for a spouse's children; ma_ssi_deeming_ineligible_child_allocation (CO-4633) for a child's parents. |
| 5.H.3.a.ii | C: CO-4626 (couple or individual FBR by the number of deemed parents). |
| 5.H.3.a.iii | C: CO-2277; OQ-473. |
| 5.H.3.b.i | C: CO-2279, CO-4634 (unearned first). |
| 5.H.3.b.ii | C: CO-605, CO-4634 (child allocation before the standard disregards). |
| 5.H.3.b.iii | C: CO-4626 (parent allocation after the standard disregards). |
| 5.H.4.a.i-iii | C: ssi_general_income_exclusion in CO-606, the unused part carried in CO-605; one $20 per couple through the group sum. |
| 5.H.4.b.i.1-3 | C: ssi_earned_income_exclusion and ssi_earned_income_disregard_rate in CO-605, CO-1715, CO-4634. **C3-3** (fixed, 2026-11-23) (DAC, widow(er), Pickle omit the 416.1112(c) exclusions). |
| 5.H.4.c | C: CO-2281, CO-4201 (one third off an applicant child's child support). |
| 5.H.4.d | C: CO-2471 with SSA's indexed figures (CO-3379, CO-3380), as H.4.e's incorporated edition indexes them. **C3-3** (fixed, 2026-11-23), **C3-6** (fixed, 2026-11-23). |
| 5.H.4.e | C: rows 3.10. |
| 5.I.1-3 | C: income facts are stated on the person paid; joint payments are split in the statement (NA as computation). |
| 5.I.4 | C: CO-2467 leaves the allowance out of the community spouse's own income. |
| 5.J.1.a-c | C: rental_property_expenses_paid (CO-4458) netted in CO-2470; OQ-867. |
| 5.J.2 | C: ma_countable_income_producing_property_value (CO-4621), ma_income_producing_property_exclusion (CO-4601). |
| 5.J.3 | C: CO-4621 with income_producing_property_is_used_in_trade_or_business (CO-4608), net return (CO-4609), rate (CO-4602). |
| 5.K (lead-in) | C: CO-2470 (SSI method), CO-641 (LTC). |
| 5.K.1.a-b | C: ma_va_aid_and_attendance_is_patient_payment (CO-4103) false: CO-658 does not add the portion; OQ-720. |
| 5.K.2 | C: CO-4103 true: CO-658 adds it after the floor; OQ-720 ("dependents"). |
| 5.L.1 | C: reverse mortgage payments are not an income fact (loan_proceeds_received if stated, excluded in CO-2470). |
| 5.L.2 | C: the unspent part is in liquid_resources_value the next month. |
| 5.L.3 | C: uncompensated_transfer_value_in_lookback (CO-824). |

### 3.4 § 8.100.5.M-P: resources (D-65:2495-2723)

| Paragraph | Disposition |
|---|---|
| 5.M.1 (definition; $2,000 / $3,000) | C: ma_meets_ssi_resource_standard (CO-610), ssi_resource_limit_individual / _couple. |
| 5.M.1 (institutionalized spouse) | C: rows 3.9 (CO-646 to CO-648). |
| 5.M.1 (QMB, SLMB, QI-1 limits, CPI indexing) | C: ma_msp_resource_limit_individual / _couple in CO-613 to CO-615 (dated figures). |
| 5.M.1 (Buy-Ins: resources not counted) | C: CO-618 and CO-620 have no resource test. |
| 5.M.2.a (lead-in), a.i | C: the home is outside CO-800; one home_equity per person (CO-826); ma_home_is_countable_resource (CO-4622). |
| 5.M.2.a.ii.1-2 | C: ma_home_equity_disqualifies (CO-650), ma_home_equity_limit; OQ-820 (LTC only); ">=" recorded in CO-650's precision. |
| 5.M.2.a.iii | C: home_is_outside_colorado (CO-4613) with intent: residency (CO-2250); CO-4622 does not count it. |
| 5.M.2.a.iv | C: CO-4622 with ma_spouse_or_dependent_relative_lives_in_home (CO-4880). |
| 5.M.2.a.v.1-2 | C: CO-4622 (written intent, CO-4612, for a person in a facility); the private-dwelling reading recorded (N2-6). |
| 5.M.2.a.vi | C: CO-4622 (spouse or dependent relative) and CO-650 (limit, LTC only, OQ-820). |
| 5.M.2.a.vii-viii | C: CO-4622 (no intent and no relative: counted). |
| 5.M.2.a.ix | C: CO-4622, CO-4880 (N2-4 fixed; CO-214 eligible_institutional). **C3-12** (noted, 2026-11-23). |
| 5.M.2.a.x | C: CO-4622's precision (the determination date's facts decide; the month boundary not separated). |
| 5.M.2.a.xi-xii | C: CO-4622 (a facility resident's intent; a replacement home is the stated home_equity). |
| 5.M.2.a.xiii, xiii.1 | C: home_is_held_in_trust_or_entity (CO-4614) for an LTC, HCBS or PACE person. |
| 5.M.2.a.xiv | C: home_has_recorded_beneficiary_deed (CO-4615). **C3-5** (fixed; OQ-900, 2026-11-23) ("subject to estate recovery" read as always true). |
| 5.M.2.b, b.i-iv | C: ma_excess_real_property_is_for_sale (CO-2242), real_property_for_sale_value, ma_excluded_real_property_value (CO-4620). |
| 5.M.2.b.v | C: ma_requires_verification_of_sale_efforts (CO-2246); quarterly re-verification is NA (procedure). |
| 5.M.2.b.vi | C: CO-4620 applies in CO-647 through CO-4623. |
| 5.M.2.b.vii | C: the proceeds are liquid_resources_value once sold. |
| 5.M.2.c | C: CO-800 counts vehicles_equity_value less transportation_vehicle_equity_value. |
| 5.M.2.d-e | C: household goods and personal effects are not a holdings fact; investment items are investment_personal_property_value (CO-4642). |
| 5.M.2.f | C: CO-800 (cash surrender value counted when face value > ssi_life_insurance_face_value_exclusion_limit; per insured person, CO-3397's precision). |
| 5.M.2.g | C: term and burial insurance have no cash surrender value (not counted). |
| 5.M.2.h | C: burial spaces are not a holdings fact (CO-800 precision). |
| 5.M.2.i | C: irrevocable_burial_funds_value (CO-4603) not counted. |
| 5.M.2.j, j.i-ii | C: CO-800 with ssi_burial_funds_exclusion (CO-4600), CO-4603, burial_funds_accrued_interest (CO-4604); one exclusion per spouse (NM-1 fixed; CO-185 1,500). |
| 5.M.2.k | C: able_account_value left out in CO-4623. |
| 5.M.3.a-c | C: liquid_resources_value (CO-3390) in CO-800. |
| 5.M.3.d.i-iii | C: the joint-account presumption is the caseworker's valuation of CO-3390 (first-pass acceptance NM-27 stands). |
| 5.M.3.e | C: CO-4622 (xiv). **C3-5** (fixed; OQ-900, 2026-11-23). |
| 5.M.3.f | C: CO-650 (LTC only; OQ-820). |
| 5.M.3.g | C: real_property_other_than_home_equity (CO-3393) in CO-800; CO-4621. |
| 5.M.3.h.i-iii.4 | C: ma_claims_co_owner_hardship_for_real_property (CO-2244), real_property_co_owned_with_resident_value (CO-4606) in CO-4620; ma_requires_verification_of_joint_ownership (CO-2248). |
| 5.M.3.i | C: a mobile home not lived in is real or other property stated in CO-3393 or CO-4642. |
| 5.M.3.j | C: investment_personal_property_value (CO-4642) in CO-4623. |
| 5.M.3.k | C: CO-800 (vehicles beyond the transportation vehicle). |
| 5.M.3.l | C: CO-800 (as M.2.f). |
| 5.M.3.m.i-iii, n.i-ii, o.i-ii | C: a note's value is a holding the caseworker values (CO-3390 or CO-4643); a non-conforming note is CO-824 (transfer). |
| 5.M.3.p.i-ii | C: mineral rights are part of the land's value (CO-3393) or valued separately (caseworker's valuation). |
| 5.N.1-2 | C: retirement_accounts_value (CO-3392) in CO-800. |
| 5.N.3 | C: CO-608 subtracts the living-together spouse's retirement accounts (NM-3 fixed; CO-189 1,000). |
| 5.N.4 | C: ma_institutionalized_spouse_countable_resources (CO-647) counts them. |
| 5.N.5.a-b | C: the net-of-tax value is the caseworker's valuation of CO-3392 (NM-27 acceptance stands). |
| 5.O.1-4 | C: an inheritance is liquid_resources_value or other holdings once available; availability is the caseworker's finding (NA as computation). |
| 5.P.1-3 | C: net proceeds are liquid_resources_value; the reimbursement option is NA (procedure). |
| 5.P.4 | C: proceeds held to buy a home are the caseworker's valuation of CO-3390 (no fact separates them; rare and short-lived). |

### 3.5 § 8.100.6.A-K: ABD categories, SSI, Pickle, protected groups, OAP (D-65:2725-2908)

| Paragraph | Disposition |
|---|---|
| 6.A.1 | C: CO-612, CO-617; income and resources in § 8.100.5. |
| 6.B.1 | C: meets_ssa_disability_criteria (CO-011) is the Department's or contractor's finding. |
| 6.B.2 | NA: appeal. |
| 6.C.1.a-c | C: receives_ssi in CO-611, CO-612 (ssi_recipient). |
| 6.C.2-6 | NA: SSA agreement, listings, notices, SISC code. |
| 6.C.7 | NA: reinstatement after an overturned SSI decision (procedure; the stated receives_ssi governs). |
| 6.C.8 | C: retains_ssi_status_without_payment in CO-1163 (continued_ssi_status). **C3-9** (fixed, 2026-11-23). |
| 6.C.9 | NA: forwarding information to SSA. |
| 6.C.10, 10.a.i.1-3 | C: CO-4101 and the receives_ssi month (the SSI effective date is SSA's); infant date-of-birth rule NA (SSA's date as stated). |
| 6.D.1, D.2.a, c | C: ma_pickle_eligible (CO-1159), ma_pickle_countable_income (CO-1158), lost_ssi_or_oap_due_to_social_security_benefits. **C3-3** (fixed, 2026-11-23) (earned side). |
| 6.D.2.b | C: a spouse's COLAs (social_security_income_when_spouse_lost_ssi_or_oap, CO-4635); a parent's: deferred NM-17. |
| 6.E.1.a-e | C: CO-1158. |
| 6.E.2 | C: CO-1159 (strictly less than; SSI or OAP standard). |
| 6.E.3 | C: CO-4635 (spouse); NM-17 deferred (parent). |
| 6.E.4 | C: the disregard is recomputed each month. |
| 6.E.5 | NA: contact and reapplication. |
| 6.F.1-2 | OQ-209 (closed historical cohort). |
| 6.G.1-3 | OQ-209. |
| 6.H.1.a-f | OQ-209. |
| 6.I.1 (lead-in), I.1.a-e | C: ma_disabled_widow_eligible (CO-1162). |
| 6.I.1.f | C: CO-1162 reads CO-610 and ma_dac_countable_income (CO-1160) (NM-9 fixed). **C3-3** (fixed, 2026-11-23). |
| 6.J.1, J.1.a-b | C: ma_dac_eligible (CO-1161), receives_oasdi_as_disabled_adult_child, lost_ssi_due_to_social_security_benefits (CO-1180). |
| 6.J.1.c.i-iii | C: CO-1160, CO-610. **C3-3** (fixed, 2026-11-23). |
| 6.J.2 | C: title_ii_benefit_type disabled_adult_child (the BIC "C"). |
| 6.K.1 | C: af_is_oap_age (CO-940) and the single OAP category (OQ-111, Adult Financial family). |
| 6.K.2-4 | C: ma_oap_sisc_b_eligible (CO-1177), CO-612 (oap_sisc_b). |
| 6.K.5 | C: the LTC 300% group (CO-642, CO-640: a psychiatric facility is a medical institution). |
| 6.K.6 | NA: AFDC no longer exists. |
| 6.K.7 | C: ma_lost_oap_to_non_oasdi_cost_of_living_adjustment (CO-2209) in CO-1156. |
| 6.K.8.a-c | C: CO-1177 (SISC B), CO-1156 (SISC C); SISC A institutional cases are CO-652. |

### 3.6 § 8.100.6.L-Q: Medicare Savings Programs and Buy-Ins (D-65:2909-3109)

| Paragraph | Disposition |
|---|---|
| 6.L.1, L.5.a-c | NA: benefit package description. |
| 6.L.2.a | C: medicare_part_a_entitled in ma_qmb_eligible (CO-613). |
| 6.L.2.b | C: CO-613 (MSP resource limits on CO-608). **C3-5** (fixed; OQ-900, 2026-11-23). |
| 6.L.2.c | C: CO-613, ma_qmb_income_limit_pct, ma_ssi_poverty_guideline_monthly (CO-1750); "at or below". |
| 6.L.2.d | OQ-624 (not read as SSI-only). |
| 6.L.3 | C: CO-1750 (couple guideline by ma_ssi_household_size). **C3-1** (fixed, 2026-11-23). |
| 6.L.4 | C: CO-605 (earnings combined before $65 and one half). |
| 6.L.6-8 | NA: classification and the right to be tested for all categories (the volume tests all). |
| 6.L.9 | C: residency and status in CO-617 (CO-509). |
| 6.L.10-11 | C: ma_qmb_is_in_effect (CO-3623). |
| 6.L.12 | C: ma_msp_cola_disregard (CO-3629); OQ-622. |
| 6.M.1 | NA: benefit. |
| 6.M.2.a-c | C: ma_slmb_eligible (CO-614). |
| 6.M.3-4 | C: as L.3-4. |
| 6.M.5-6 | C: CO-4101 (retroactive months); 1993 date NA. |
| 6.M.7 | C: CO-3629; OQ-622. |
| 6.N.1 | NA: benefit. |
| 6.N.2 | NA: allocation and waiting list (funding). |
| 6.N.3 | C: CO-4101; 1998 date NA. |
| 6.N.4.a-c | C: ma_qi_eligible (CO-615) (at least 120%, less than 135%). |
| 6.N.4.d | C: CO-615 reads ma_has_full_coverage_category (CO-1176) (NM-11 fixed). **C3-2** (fixed, 2026-11-23). |
| 6.N.5-6 | C: as L.4, L.12. |
| 6.O.1 | NA: benefit. |
| 6.O.2.a-b | C: ma_qdwi_meets_disability_work_history (CO-1157). |
| 6.O.2.c | C: CO-616 (ma_qdwi_resource_limit_rate x SSI limit). |
| 6.O.2.d | C: CO-616 (less than 200%). |
| 6.O.3 | C: CO-605. |
| 6.O.4 | C: CO-616 reads CO-1176. **C3-2** (fixed, 2026-11-23). |
| 6.O.5-6 | C: ma_qdwi_is_in_effect (CO-3624); OQ-621 resolved; 1990 date NA. |
| 6.P.1.a | C: ma_wawd_eligible (CO-618) (at least ma_wawd_min_age). **C3-7** (fixed, 2026-11-23) (no upper age, exclusions not capped at 65). |
| 6.P.1.b | C: ma_wawd_countable_income (CO-1715), ma_wawd_income_limit_pct (CO-242), applicant only. **C3-6** (fixed, 2026-11-23), **C3-7** (fixed, 2026-11-23). |
| 6.P.1.c | C: no resource test in CO-618. |
| 6.P.1.d | C: ma_wawd_is_disabled (CO-806), CO-2820. |
| 6.P.1.e | C: has_earned_income in CO-618; e.i NA (emergency ended). |
| 6.P.1.f.i-iii, v (postpartum waiver) | C: ma_wawd_premium (CO-619), ma_wawd_premium_table (CO-2457), ma_buy_in_determination_month (CO-2462). **C3-6** (fixed, 2026-11-23). |
| 6.P.1.f.iv | C: CO-2457 dated by State fiscal year. |
| 6.P.1.f.v (termination for non-payment) | NA: premium enforcement (no payment-history fact; procedure). |
| 6.P.2 | C: CO-4101. |
| 6.P.3 | NA: opt-out. |
| 6.Q.1.a | C: CO-620 with ma_age_before_determination_month (CO-4790) and ma_cbwd_max_age (CO-3026). |
| 6.Q.1.b, b.i-iv | C: ma_cbwd_countable_household_income_pct_fpl (CO-4203), CO-4200, CO-4201, ma_cbwd_income_limit_pct (CO-243); OQ-740. **C3-4** (fixed, 2026-11-23), **C3-8** (fixed, 2026-11-23). |
| 6.Q.1.c | C: no resource test in CO-620. |
| 6.Q.1.d | C: meets_ssa_disability_criteria in CO-620. |
| 6.Q.1.e | C: CO-620 (16 to 18 with earnings excluded), CO-622 (WAwD first). |
| 6.Q.1.f | C: CO-620; OQ-623. |
| 6.Q.1.g.i-vi | C: ma_cbwd_premium (CO-621), ma_cbwd_premium_table (CO-2458); OQ-144. **C3-4** (fixed, 2026-11-23) (premium band). |
| 6.Q.1.g.vii | OQ-511 (blocked on HCPF's notice). |
| 6.Q.2 | C: CO-4101. |
| 6.Q.3 | C: the MAGI verification items (MAGI family's scope; cross-reference). |
| 6.Q.4 | NA: opt-out. |

### 3.7 § 8.100.7.A-D: long-term care eligibility (D-65:3113-3218)

| Paragraph | Disposition |
|---|---|
| 7.A.1 (300% category; already eligible) | C: ma_ltc_eligibility_status (CO-652), CO-642. |
| 7.A.1 (SEP notice) | NA: referral procedure. |
| 7.A.1 (gross income) | C: ma_ltc_gross_income (CO-641); OQ-822, OQ-867. **C3-10** (fixed in part; OQ-822 widened, 2026-11-23). |
| 7.A.1 (child leaving parents) | C: CO-4624 (no deeming once institutionalized; N2-7 reading recorded). |
| 7.A.2.a-b | C: ma_is_aged_blind_or_disabled (CO-603) in CO-3310. |
| 7.A.2.c (30 days, combination of settings) | C: ma_is_institutionalized (CO-640), expects_institutional_stay_of_thirty_days; HCBS and PACE through CO-3310's first arm. |
| 7.A.2.c (documentation) | C: ma_requires_verification_of_institutional_stay (CO-1632), ma_institutional_stay_verification_is_pending (CO-1636). |
| 7.A.2.c.i-iii | C: CO-640's precision (NM-34). |
| 7.A.2.d | C: CO-640's precision (NM-35). |
| 7.A.2.e (300%; income trust, excluding hospital) | C: ma_meets_special_income_group (CO-642), has_income_trust (CO-823), ma_income_trust_gross_income_limit (CO-1985); OQ-99. |
| 7.A.2.e.i.1-3 | C: CO-642 for each setting. |
| 7.A.2.f | C: ma_meets_ltc_resource_standard (CO-648). |
| 7.A.2.g | C: rows 3.9. |
| 7.A.2.h | C: ma_transfer_penalty_applies (CO-660) in CO-651, CO-652. |
| 7.A.2.i | C: ma_requires_verification_of_trust (CO-1634), ma_trust_verification_is_pending (CO-1638). |
| 7.A.2.j | C: ma_requires_verification_of_annuity (CO-1635), ma_annuity_verification_is_pending (CO-1639). |
| 7.A.3 | NA: appeal under the Child Mental Health Treatment Act. |
| 7.B.1 (level of care, community) | C: ma_hcbs_waiver_eligible (CO-653), ma_meets_designated_waiver_level_of_care (CO-1178), CO-1164, CO-2270. |
| 7.B.1.a | C: CO-653, ma_reaches_hcbs_without_special_income_group (CO-4630) (CO-611, 1619(b), CO-1177). **C3-2** (fixed, 2026-11-23) (CO-611 not gated on onset; recorded for LTC). |
| 7.B.1.b | C: CO-653 (ma_ltc_financially_eligible, CO-651). |
| 7.B.1.c, c.i | C: CO-653, CO-4630 (the six waivers). |
| 7.B.1.c.ii | NA: federal approval (assumed granted). |
| 7.B.2 (no new application) | NA: procedure. |
| 7.B.2.a.i-iii, b | C: ma_owes_long_term_care_asset_disclosure (CO-4631), CO-1634, CO-1635, CO-1637. |
| 7.B.2.c | C: CO-4631 (NM-13 fixed; CO-187 eligible_hcbs, no pending transfer documents). |
| 7.B.3 | OQ-519 (blocked on IM 25-030). |
| 7.C.1 | C: CO-641 is the person's own income; ma_community_spouse_income (CO-2467) is not deemed. |
| 7.C.2 (lead-in) | C: CO-663, CO-605, CO-608. |
| 7.C.2.a | C: CO-661 and CO-604 (two spouses in institutions are not a living-together couple); each spouse's own limit through CO-610. |
| 7.C.2.b | C: ma_excluded_from_ssi_household (CO-661) in CO-604 and CO-3626. **C3-1** (fixed, 2026-11-23) (the income sums do not read it). |
| 7.C.2.c | C: rows 3.9. |
| 7.C.3 | C: long_term_care_insurance_benefits_received (CO-3606) is not in CO-641; added in CO-658. |
| 7.C.4 | C: as 7.C.2.b (the rule text is cut off in the SOS copy; nothing more to carry). |
| 7.D | NA: application requirement for State-only clients. |

### 3.8 § 8.100.7.E-J: trusts, transfers, certain assets, life estates, annuities, tables (D-65:3220-4028)

| Paragraph | Disposition |
|---|---|
| 7.E.1.a.i-ii, b, c | C: has_trust_interest (CO-1577), CO-1634; the available amount is the Department's finding ma_trust_annuity_life_estate_value_available (CO-4643). |
| 7.E.2.a-c, E.3.a.i-iii, b, c.i-iv | C: CO-4643 and CO-824 (what counts is the Department's trust determination, E.7.c). |
| 7.E.4.a | C: CO-4643 in CO-4623. |
| 7.E.4.b | C: trust payments to the person are stated in the unearned income facts. |
| 7.E.4.c | C: CO-824 (transfer). |
| 7.E.5.a-d | C: CO-4643 (resource), unearned facts (b), CO-824 (c, d). |
| 7.E.6.a.i | C: CO-823, CO-642. |
| 7.E.6.a.i.a (regional ceiling, regions) | C: CO-1985, ma_ltc_private_pay_region (CO-1980), CO-3021, CO-3022; OQ-99 (figures). |
| 7.E.6.a.i.b, f | C: ma_income_trust_distribution (CO-2238) ($20 retention; HCBS cap). |
| 7.E.6.a.i.c-e | C: CO-3616, CO-658 (trust distribution less PNA, spousal payment); OQ-471 (family allowance). |
| 7.E.6.a.i.g-m | NA: trust drafting, notice, accounting and termination terms (the Department's approval). |
| 7.E.6.b.i.a-q | C: a valid disability trust is not counted (no holdings fact; CO-4643 is the Department's finding); distributions are income facts; drafting terms NA. |
| 7.E.6.c.i.a-l, ii, iii | C: as disability trusts; c.ii's presumption is CO-824 (the Department's transfer finding). |
| 7.E.6.d.i-vi | C: CO-4643 (countable principal) and the income facts (required distributions). |
| 7.E.6.e.i-ii | C: receives_ssi governs (CO-611); copying to the Department NA. |
| 7.E.7.a-c | C: CO-1634, CO-1638 (documents); the Department's determination is CO-4643. |
| 7.F.1.a-c, f-g | C: CO-824 (uncompensated value, the caseworker's computation from these definitions). |
| 7.F.1.d | C: ma_transfer_lookback_months (CO-252). |
| 7.F.1.e | C: CO-660. |
| 7.F.2 (lead-in), 2.a-b | C: CO-252, CO-1637, asset_transfer_verification_document_received (CO-1576); institutionalized includes HCBS and PACE (CO-3310 first arm). |
| 7.F.2.c.i | C: ma_transfer_penalty_months (CO-649), transfer_penalty_divisor (CO-832). |
| 7.F.2.c.ii.a-c | C: transfer_penalty_period_start_date (CO-886), CO-660; CO-652 tests the penalty after the other requirements. |
| 7.F.2.d | C: ma_transfer_penalty_days (CO-659), ma_transfer_penalty_days_per_month (CO-3023); OQ-821 (the partial month in a monthly outcome). |
| 7.F.2.e | C: CO-649 (no cap). |
| 7.F.2.f-g, f.i-ii, g.i-ii | C: CO-824 is the total in the look-back; the start date (CO-886) carries the sequencing. |
| 7.F.2.h | C: CO-660 gates only CO-651/CO-652; CO-612 is not gated. |
| 7.F.2.i | C: CO-824 and CO-886 restated at the new transfer. |
| 7.F.2.j.i-xi | C: CO-824 (the caseworker's finding of what is an uncompensated transfer); exempt transfers transfer_was_exempt (CO-825). |
| 7.G.1-5 (promissory notes, personal care services, joint tenancy) | C: CO-824 (the uncompensated value the site computes under G); a conforming note's value is a holding (CO-3390 or CO-4643). |
| 7.G.6 (no penalty: transfers to a spouse, a disabled child, a caretaker child, a sibling, intent shown, returned) | C: transfer_was_exempt (CO-825). |
| 7.G.7 (rebuttable presumption) | C: CO-824 and CO-825 (the site's finding). |
| 7.G.8 (apportionment between spouses) | C: ma_transfer_penalty_is_apportioned_with_spouse (CO-2232), CO-2233, ma_transfer_penalty_apportioned_share_rate (CO-2234), ma_transfer_penalty_share_rate (CO-2235), CO-3311 (items cite it as "F.8"; P3 in passing, the cite should read G.8). |
| 7.G.9 | C: CO-1634, CO-1638. |
| 7.G.10 | NA: notice. |
| 7.G.11.a-g (undue hardship waiver) | C: CO-825 (an approved waiver is an exception); the request procedure is NA. |
| 7.G.12 (no penalty in listed circumstances) | C: CO-825. |
| 7.H.1-5 (life estates: definitions, value, remainder, table) | C: CO-4643 (life estate value the Department finds available), CO-824 (transfer); the table is the site's valuation (NA as computation). |
| 7.I.1-5 (annuities by purchase date: disclosure, remainder beneficiary, actuarial soundness) | C: owns_annuity (CO-1579), CO-1635, CO-1639, annuity_verification_document_received (CO-1580); value or transfer through CO-4643 and CO-824. |
| 7.J | NA: life expectancy tables used in the caseworker's valuation behind CO-824 and CO-4643. |

### 3.9 § 8.100.7.K-V: spousal impoverishment and post-eligibility (D-65:4029-4458)

| Paragraph | Disposition |
|---|---|
| 7.K.1, K.2.a-d, K.3 | C: ma_ltc_couple (CO-643), CO-640. |
| 7.L | C: ma_spousal_resources_at_snapshot (CO-888) (NM-18 reading). |
| 7.M.1 (lead-in), 1.a | C: ma_csra (CO-646), ma_csra_maximum. |
| 7.M.1.b | C: ma_csra_increased (CO-1977). |
| 7.M.1.c | C: ma_court_ordered_transfer_to_community_spouse (CO-1950) in CO-646. |
| 7.M.2 | C: CO-647 subtracts the CSRA; the income from it is the community spouse's facts. |
| 7.M.3 | C: ma_csra_transfer_is_overdue (CO-4636) in CO-647. |
| 7.M.4.a-c | C: ma_community_spouse_withheld_resources_are_excused (CO-4637) in CO-648. |
| 7.N | C: CO-4623 has no household-goods or one-vehicle limit to lift; the home is not in the CSRA (CO-888 states countable resources). |
| 7.O.1 | C: CO-647, CO-648 (at or below CSRA + $2,000). |
| 7.O.2 | C: CO-642 (trust before the MIA: CO-3616 reads the distribution). |
| 7.P.1-4 | C: income facts are stated on the named spouse; the preponderance rebuttal is the statement (NA). |
| 7.Q.1.a | C: ma_mmmna_standard (CO-662). |
| 7.Q.1.b.i-iii | C: ma_mmmna (CO-655), ma_community_spouse_shelter_costs (CO-2802), ma_mmmna_shelter_threshold_pct (CO-253). |
| 7.Q.2.a-b | C: ma_community_spouse_medical_needs (CO-3619), health_insurance_premiums_paid (CO-835); OQ-620. |
| 7.Q.3 | NA: fair-hearing substitution (CO-655's precision). |
| 7.Q.4 | C: ma_mmmna_cap (CO-830) in CO-655. |
| 7.R.1 | C: ma_community_spouse_income_allowance (CO-656); the income-first rule in CO-1977. |
| 7.R.2 | C: CO-656, ma_community_spouse_income (CO-2467), ma_payroll_taxes_withheld (CO-2466). |
| 7.R.3 | C: court_ordered_spousal_support (CO-4619) in CO-656 (NM-15 fixed; CO-188 2,500 and 300). |
| 7.R.4 | NA: when the site adjusts (procedure; the volume recomputes each month). |
| 7.S.1.a-d, d.i-iii | C: CO-1977, ma_csra_annuity_lowest_estimate (CO-1948). |
| 7.S.1.e | C: ma_institutionalized_spouse_refuses_income_allowance (CO-1949) in CO-1977. |
| 7.T.1 (lead-in), 1.a | C: ma_patient_payment (CO-658), CO-3616, ma_personal_needs_allowance (CO-1987). |
| 7.T.1.b | C: CO-658 (MIA only when not refused, NM-14). |
| 7.T.1.c.i | C: ma_family_allowance (CO-657) as the 42 U.S.C. 1396r-5(d)(1)(C) floor (N2-2 fixed; CO-213 701.67 and 300). |
| 7.T.1.c.ii | C: ma_family_allowance_members (CO-2469). |
| 7.T.1.d | C: CO-658 (rows V.3). |
| 7.T.1.e-f | C: CO-658 (refused allowance applied to care; no other deductions). |
| 7.U.1-3 | NA: notice and appeal. |
| 7.V.1.a-d, f-l | NA: AP-5615 procedure, leaves, discharges and administrative recovery. |
| 7.V.1.e.i-iii | C: ma_nf_part_b_premium_deduction_months (CO-3612), medicare_part_b_premium_paid (CO-3602), medicare_part_d_premium_paid (CO-3603) in CO-658; OQ-721, OQ-520 resolved. |
| 7.V.2.a | NA: collection by the facility. |
| 7.V.2.b-c | C: ma_refuses_to_release_patient_payment (CO-4885) in CO-4886. **C3-2** (fixed, 2026-11-23). |
| 7.V.3.a | NA: cross-reference to the form. |
| 7.V.3.b.i, ii.1-4 | C: CO-658, CO-1987, CO-656, CO-657, ma_home_maintenance_allowance (CO-3618). |
| 7.V.3.b.ii.5 | C: inside CO-2238 ($20 retention). |
| 7.V.3.b.ii.6-7 | C: mandatory_income_tax_withheld (CO-3604), garnishment_repaying_federal_assistance_overpayment (CO-3605). |
| 7.V.3.b.ii.8.a-c | C: CO-658 (Part B two months, Part D, PETI not deducted). |
| 7.V.3.c, c.i.1.a-b | C: CO-3606 added after the floor in CO-658. |
| 7.V.3.d.i.1-2 | C: ma_personal_needs_allowance_institutional (CO-887). |
| 7.V.3.d.ii, ii.1-2 | C: CO-1987, ma_qualifies_for_veterans_personal_needs_allowance (CO-1986), ma_veteran_personal_needs_allowance (CO-255). |
| 7.V.3.d.iii | C: CO-3616, ma_ltc_earned_income_reserve_base (CO-3613), _rate (CO-3614). |
| 7.V.3.d.iv | C: CO-3604. |
| 7.V.3.e.i-v | C: ma_ltc_earned_income (CO-3615) (precision: all earnings read as such activities). |
| 7.V.3.f.i-iii | C: CO-3616. |
| 7.V.3.g.i | C: CO-656, CO-657. |
| 7.V.3.g.ii, ii.1-2.b | C: CO-3618, ma_physician_certified_return_home (CO-3607), ma_home_maintenance_allowance_max_months (CO-3608), ma_home_maintenance_allowance_max (CO-3617). |
| 7.V.3.h | NA: case record. |
| 7.V.3.i, i.i | NA: SSI's continued-benefit rule (SSA's). |
| 7.V.3.i.ii | C: SSI is not in CO-641. |
| 7.V.3.j | NA: Adult Financial supplement (that family's). |
| 7.V.4.a.i-ii | C: CO-658's floor at zero. |
| 7.V.4.a.iii-vi | C: ma_patient_payment_income_committed_elsewhere (CO-4638). |
| 7.V.4.a.vii | NA: billing of Medicare co-insurance. |
| 7.V.4.b.i-iv, c | NA: when a payment may not be waived, and partial-month facility computations. |
| 7.V.4.d | C: as V.3.i.ii. |
| 7.V.5.a-c, V.6 | NA: personal needs fund administration; cross-reference. |

### 3.10 20 CFR 416.1112 (2012), incorporated by § 8.100.5.H.4.e (D-53:170-214)

| Paragraph | Disposition |
|---|---|
| 416.1112(a) | C: CO-605 (CO-2471 first, then the (c) exclusions in order). **C3-11** (noted, 2026-11-23). |
| 416.1112(b) | C: federally excluded earnings are stated as excluded (no earned "other federal law" fact; none listed affects wages in practice beyond Census wages, CO-4881). |
| 416.1112(c)(1) | C: tax_refunds_and_credits_received in CO-2470 (an EITC refund is not earned income). |
| 416.1112(c)(2) | C: ma_ssi_excluded_infrequent_earned_income (CO-4883), ssi_infrequent_earned_income_quarterly_exclusion (CO-4882) in CO-2471. **C3-3** (fixed, 2026-11-23), **C3-6** (fixed, 2026-11-23), **C3-8** (fixed, 2026-11-23). |
| 416.1112(c)(3), (3)(i)-(ii) | C: CO-2471, CO-3379, CO-3380, ssi_student_earned_income_exclusion_basis (CO-3387). **C3-3** (fixed, 2026-11-23), **C3-6** (fixed, 2026-11-23). |
| 416.1112(c)(4) | C: CO-605, CO-1715, CO-4634 (unused $20). |
| 416.1112(c)(5) | C: ssi_earned_income_exclusion. |
| 416.1112(c)(6), (6)(i)-(ii) | C: ma_ssi_impairment_related_work_expenses (CO-4628), impairment_related_work_expenses_paid (CO-4616). **C3-3** (fixed, 2026-11-23), **C3-7** (fixed, 2026-11-23). |
| 416.1112(c)(7) | C: ssi_earned_income_disregard_rate. |
| 416.1112(c)(8) | C: ma_ssi_earned_income_excluded_after_half (CO-4629), blind_work_expenses_paid (CO-4617). **C3-3** (fixed, 2026-11-23), **C3-7** (fixed, 2026-11-23). |
| 416.1112(c)(9) | C: CO-4629, pass_set_aside_earned_income (CO-4618). **C3-3** (fixed, 2026-11-23). |
| 416.1112(c)(10) | C: americorps_payments_received (CO-4016) in CO-2470. |

### 3.11 10 CCR 2505-10 §§ 8.940-8.942 (D-68)

| Paragraph | Disposition |
|---|---|
| 8.940, 8.941 (headings) | NA: headings. |
| 8.941.1 (preamble) | C: ma_oap_health_care_status (CO-1156). **C3-2** (fixed, 2026-11-23) (CO-1176 misses the E.6 denial). |
| 8.941.1.A | C: CO-1156 (SISC C: no Medicaid category, CO-1176). |
| 8.941.1.B.1-10, B.8.i, B.10.i | NA: benefit package. |
| 8.941.1.C | NA: medical necessity of services. |
| 8.941.1.D | C: ma_oap_is_patient_in_tb_or_mental_health_institution (CO-1748); the excluded services are benefits (NA). |
| 8.941.1.E | C: CO-1156 (ineligible_before_application). |
| 8.941.1.F | NA: county information duty. |
| 8.941.2.A-I | NA: definitions; F (OAP-C) carried by receives_oap_c (CO-2208). |
| 8.941.3 (lead-in), 3.A | C: CO-1156 with CO-1176 and receives_ssi. **C3-2** (fixed, 2026-11-23). |
| 8.941.3.B | C: AND and AB recipients are not OAP recipients (adult_financial_program_received, CO-2710); OAP-C is ineligible_oap_c. |
| 8.941.4 | C: OAP receipt is the Adult Financial family's determination (CO-2710). |
| 8.941.5-8 | NA: provider certification, out-of-state care, claims, rates. |
| 8.941.9 | NA: co-payments (cost-sharing; not modeled for any program). |
| 8.942.1 | C: CO-1156 reports medicaid_eligible wherever a Medicaid category exists, including the retroactive months (the backdating). |

## 4. Open-question confirmations

Every open question an item in this family cites was read. The ones not resolved:

| OQ | Class | Confirmation |
|---|---|---|
| OQ-99 | blocked on a named document | Confirmed: HCPF OM 25-073 is on hcpf.colorado.gov only; no allowed host (sos.state.co.us, ecfr.gov, govinfo.gov, law.cornell.edu, medicaid.gov, cms.gov, fns.usda.gov, leg.colorado.gov) publishes the regional private-pay rates. The county-to-region mapping is from the rule text (D-65). |
| OQ-144 | state policy choice | Confirmed: Q.1.g.iv's "households"/"individuals" wording is the state text's; no federal text decides it. |
| OQ-209 | state policy choice | Confirmed: §§ 8.100.6.F-H are closed cohorts (1972, 1973, 1983-1987 reapplication deadline). |
| OQ-302 | state policy choice | Confirmed: the verification plan (D-317, medicaid.gov) was read; "20% of what" remains a state reading. |
| OQ-471 | needs Legal | Confirmed: E.6.a.i.c's closed deduction list against 1396r-5(d)(1)'s family allowance is a legal conflict. |
| OQ-473 | state policy choice | Confirmed: H.3.a.iii is the state's text. |
| OQ-511 | blocked on a named document | Confirmed: the Department's notice resuming CBwD premiums is not on an allowed host. |
| OQ-519 | blocked on a named document | Confirmed: IM 25-030 is on hcpf.colorado.gov only; B.3's cap ("cannot exceed the State's Old Age Pension Standard") is in the rule, but the amounts are not. |
| OQ-620, OQ-622, OQ-623, OQ-624, OQ-720, OQ-721, OQ-740 | state policy choice | Confirmed: each is a reading of Colorado text ("may be approved", "until ... published", Q.1.f's timing, L.2.d, K's "dependents", V.1.e's two months, the Buy-In family disregards) with no federal text deciding it. |
| OQ-820 | needs Legal | Confirmed: the home equity limit in the ABD rules against 1396p(f)'s long-term care scope. |
| OQ-821 | state policy choice | Confirmed: how a partial penalty month shows in a monthly outcome. |
| OQ-822 | state policy choice | Confirmed for the grants; **C3-10** asks to widen it to the other F.6 receipts. |
| OQ-823, OQ-867 | state policy choice | Confirmed: F.5.k against H.1.b, and J.1 against 416.1121(d), are both state texts. |

No open question was found misclassified. C3-5 needs either a fix or a new open question (needs Legal).

## 5. Earlier P1s (re-checked)

Stored cases were evaluated in the scratch copy against their `expect` blocks; every value matched (`scratchpad/cov3nm/chk.py`):

| Earlier P1 | Evidence on HEAD a4fe0e5 |
|---|---|
| NM-1 (burial funds) | CO-185: resources 1,500, aged. X-BURIAL: 9,500, none (unchanged from the disposition). |
| NM-2 (real property for sale, co-owner hardship) | X-FORSALE: aged. CO-4620 read. |
| NM-3 (spouse's retirement accounts) | CO-189: resources 1,000, aged, QMB eligible. X-IRA: 1,000, aged. |
| NM-4 (income-producing property) | CO-4621 read (J.2-J.3 as written). |
| NM-5 (home rules) | CO-4622 read and its tests T1-T10 checked against the text; CO-214 below exercises ix. C3-5 is a new defect in the same item (xiv). |
| NM-6 (retroactive lump sums) | CO-2470, CO-800 read. |
| NM-7, NM-8 (PASS, IRWE, blind work expenses) | X-PASS: 880, disabled. CO-605 and CO-1715 read. C3-3 finds the protected-group tests never got them. |
| NM-9 (disabled widow(er) income and resources) | X-DWB: not a disabled widow(er), as the disposition recorded. |
| NM-10 (parental deeming) | CO-186: deemed 2,963.50, countable 2,943.50, none. C3-4 is a new defect in the deemed sum (adoption subsidy). |
| NM-11 (QI-1 "not otherwise eligible") | X-QI: no QI-1. C3-2 is a new leak in the same test (CO-1176). |
| NM-12, NM-13 (Buy-In route into HCBS; disclosure) | CO-187: 1,957.50, WAwD, eligible_hcbs, no pending transfer documents. |
| NM-14 (refused income allowance) | X-REFUSE: patient payment 2,486.74. |
| NM-15 (court-ordered support) | CO-188: allowance 2,500, patient payment 300 (November and December). |
| N2-1 (VA Aid and Attendance) | CO-212: 880, aged; QMB in November. Y-VAAA: 880, aged. |
| N2-2 (family allowance floor) | CO-213: 701.67, eligible_institutional, patient payment 300. Y-FAMALLOW: same. |
| N2-3 (CBwD birthday month) | Fixed by the MAGI round (CO-620 reads ma_age_before_determination_month, CO-4790). Y-CBWD19: children_with_disabilities; Y-CBWD18: children_with_disabilities. |
| N2-4 (dependent relative in the home) | CO-214: CO-4880 true, home not counted, eligible_institutional, patient payment 1,810. Y-DEPREL (no tax-dependent edge) stays ineligible_resources, as § 8.100.1's definition requires a tax claim. |

Fix-round changes checked for regressions: CO-889's `[spouse, parent]` direction (T4, T5 hold), CO-4880's tax-dependent reach, CO-657's floor, CO-658's order, CO-2470's new receipts (each fact's precision says it is part of the gross facts, so nothing is subtracted that was not counted; the rental expense is capped at the rents), CO-2471's quarter arithmetic (CO-4883: the quarter start is `months_before((m-1) mod 3)`, correct), CO-4886's readers and CO-4888's month test. The regressions found are C3-2 (the pass-2 gates do not reach CO-611 and CO-1176), C3-4 (the first-round deeming adds the adoption subsidy) and C3-5 (the first-round xiv reading). The CCCAP round's deletion of in_kind_earned_compensation_value, in_kind_earned_income_value and in_kind_employment_compensation_value touched no non-MAGI item (none read them).

## Disposition (fix round, 2026-11-23)

Branch `ccr-9d19bf4c-wmnwcl` worktree, commits after 41ec04b. Each fix ships with a whole-household stored case; every probe case CO-395 to CO-404 now passes and its keys were removed from conformance/known-failures.json. The independent hand-check (docs/reviews/probe-handcheck-medicaid.md) is folded in.

| Finding | Disposition | Items | Stored case |
|---|---|---|---|
| C3-1 (P1) | Fixed. The SSI-method income sums (CO-663, CO-605, CO-2277, CO-2278, CO-2279, CO-2241, CO-4628, CO-4629, CO-1158, CO-1160) read ma_ssi_couple_members (CO-3626), which keeps the couple through the admission month for the community spouse (§ 8.100.7.C.2.b) and counts an institutionalized spouse in the institution alone from that month (42 U.S.C. 1396r-5(b)(1), (a)(1); new CO-5200, S3750). The hand-check's point stands: p1 is aged on his own 980 against the individual FBR 994, not against the couple standard. Because the institutionalized spouse is now alone in the group, ma_ssi_countable_resources (CO-608) reads the 1396r-5(c)(2) figure (CO-647) for that spouse; before, from the month after admission, his own resources were compared and a community spouse's resources went uncounted. CO-604 was first refactored to count CO-3626 (separate commit, no answer change). | CO-3626, CO-604, CO-608, CO-5200 and the ten sums | CO-395 (p1 aged, p2 none); new CO-481 (1396r-5(c)(2): 37,840, none) |
| C3-2 (P1) | Fixed. ma_is_ssi_related_eligible (CO-611) and ma_oap_sisc_b_eligible (CO-1177) apply the E.6 / V.2.c denial (CO-4886) and read the dated category ma_is_aged_blind_or_disabled_in_month (new CO-5201, onset of C.4.b); an SSI recipient is still exempt. CO-396 now states the MAGI and long-term-care facts (single filer, not pregnant, no retroactive request, no setting requested), so false is reached and OAP Health Care is eligible_state_only. CO-397 was restated so it tests C3-2 alone: retroactive coverage requested, Medicare (end-stage renal disease) so no Adults group, a private pension of 400 and no earnings (no Buy-In); August is before the onset, so false. | CO-611, CO-1177, CO-5201 | CO-396, CO-397 |
| C3-3 (P1) | Fixed. CO-1160 (DAC, read by the widow(er) test CO-1162) and CO-1158 (Pickle) subtract CO-2471 per member before the $65, CO-4628 before the half and CO-4629 after it, as CO-605 does. | CO-1160, CO-1158 | CO-398 (757.5, true), CO-399 (0); new CO-480 (Pickle with IRWE: 947.5, pickle) |
| C3-4 (P1) | Fixed. adoption_subsidy_received is subtracted for each member in CO-4201 and from each parent in CO-4634 (F.6.t); not added to CO-2470. The "unless such exclusion results in ineligibility for the other members" clause is recorded in CO-4201's precision. | CO-4201, CO-4634 | CO-400 (4,707.5, children_with_disabilities; parental deeming 3,713.5 now asserted), CO-401 (premium 70) |
| C3-5 (P1) | Fixed, with OQ-900 (needs Legal) for the MSP half. A beneficiary deed counts the home only when it is subject to estate recovery: 55 or older (new parameter CO-5202) or in a medical institution (new CO-5203; 1396p(b)(1), S3751). The other arms of CO-4622 moved unchanged to CO-5204; CO-5205 is the deed-only home equity; the QMB, SLMB, QI-1 and QDWI tests read ma_msp_countable_resources (new CO-5206), which leaves it out (1396p(b)(1)(B)(ii)), and parental deeming (CO-4627) leaves a parent's deed-only home out. OQ-900 records that § 8.100.5.M.2.a.xiv does not say against which assistance "subject to estate recovery" is judged; the assumption is the assistance being determined. | CO-4622, CO-4627, CO-613 to CO-616, CO-5202 to CO-5206 | CO-402 (qmb), CO-403 (1,000, disabled) |
| C3-6 (P2) | Fixed. CO-1715 subtracts CO-2471 from the applicant's earnings. CO-404's determination date moved to 2027-01-12: parameter versions are chosen by the determination date (docs/conventions.md, Scopes), so January 2027 evaluated on 2026-10-12 read the 2026 student exclusion (252.5); on 2027-01-12 it is the hand-check's 207.5. | CO-1715 | CO-404 (207.5, premium 0) |
| C3-7 (P2) | Fixed. IRWE, blind work expenses and PASS stop at ma_aged_age in CO-1715 ((c)(6), (c)(8)-(9)); the age is read only when an expense is stated. | CO-1715 | new CO-482 (66, IRWE 400 not excluded: 1,777.5, premium 90) |
| C3-8 (P2) | Fixed. CO-4200 subtracts the infrequent and Census parts (CO-4883, decennial_census_wages_received) for every member and the whole of CO-2471 for a disabled or blind child of the Buy-In's age. | CO-4200 | new CO-483 (a parent's irregular 30: 2,392.5, premium 0) |
| C3-9 (P2) | Fixed. CO-1163 tests continued SSI status (1619(b) included, § 8.100.6.C.8) before the non-cooperation denial, as CO-611 and CO-612 exempt an SSI recipient. | CO-1163 | new CO-484 (continued_ssi_status) |
| C3-10 (P2) | Fixed in part, rest an open question. Loan proceeds and income tax refunds and credits, which are not income (20 CFR 416.1103(d), (f), S2209), are subtracted in ma_ltc_gross_income (CO-641). The other F.6 receipts that are income (retroactive lump sums, foster care payments, PASS income, Census wages, student grants) stay counted in the 300% test; OQ-822 is widened to name them (state policy choice, § 8.100.7.A.1 against F.6). | CO-641; OQ-822 | new CO-485 (a 600 loan: 2,500, eligible_institutional) |
| C3-11 (P3) | Noted in CO-2471's precision (no answer change in the month). | CO-2471 | none (no decision change) |
| C3-12 (P3) | Noted in CO-4880's precision (a case states the relative's own dwelling). | CO-4880 | none |
| C3-13 (P3) | Noted in CO-663's precision; not changed this round (P3). | CO-663 | none |

Hand-check follow-ups (docs/reviews/probe-handcheck-medicaid.md, "Recommended actions"): (1) CO-395 p1 aged against the individual standard, done by C3-1 (`ma_ssi_income_standard` is now 994 for p1); (2) CO-404 at 207.5 with the 2027 exclusion, done (see C3-6); (3) CO-396 and CO-397 facts, done (see C3-2); (4) CO-402 open question, OQ-900; (5) CO-387 unchanged, waits on OQ-810. The CO-394 comment now says the child turns 19 on 2026-10-20 and is 18 until then.

Change impact: the flags these fixes raise are dispositioned in volumes/co/changes/2026-11-23-nonmagi-coverage3.yaml.

Deferred first-pass P2s (NM-17 parent half, NM-23, NM-26, NM-27, NM-28, NM-30, the Pickle child under 18, the 416.1165(e)(3)/(i) deeming caps) are dispositioned in docs/reviews/coverage-medicaid-nonmagi.md, "Disposition (fix round, 2026-11-23)".
