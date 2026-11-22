# Coverage review, second pass: MAGI Medicaid and CHP+ (family file `coverage2-medicaid-magi-chp`)

Reviewer pass: second exhaustive coverage matrix, 2026-11-22, on HEAD `6ba4501` (branch `ccr-9d19bf4c-wmnwcl`). This pass follows the coverage fix round recorded in docs/reviews/coverage-medicaid-magi-chp.md ("Disposition (coverage round)").

Governing texts (currency re-checked on sos.state.co.us on 2026-11-22; the rule-info pages still list these as the current versions):
- 10 CCR 2505-10 § 8.100.1 to § 8.100.4 (D-65, lines 19-2095), rule version 12735, effective 11/14/2026.
- 10 CCR 2505-3 (D-66), rule version 12687, effective 08/30/2026. In scope: § 50 (definitions), §§ 100-180 (eligibility, other coverage, verification, redetermination, income, presumptive eligibility, Express Lane), §§ 300-330 (cost sharing) and §§ 400-440 (enrollment, effective dates, disenrollment).

Out of scope: §§ 8.100.5 to 8.100.7 (aged, blind and disabled; long-term care; the Medicare Savings Programs; the Buy-In programs) belong to the non-MAGI reviewer. Paragraphs of § 8.100.1 to § 8.100.3 that only define or route to those groups are marked "NA (non-MAGI)" and are not re-verified here.

**Method.**
- I built the matrix from the D-65 and D-66 text, not from the first pass's rows. I read D-65 lines 19-2095 and D-66 §§ 50-440 line by line. The citizenship document lists (§ 8.100.3.H.2-H.3) are mapped as groups, because each list is carried by the option set of one document-type fact.
- I regenerated the ledger in a scratch copy: `git archive HEAD`, then `npm run export -- --volume co` (2,143 items). From it I built two indexes:
  - every D-65 and D-66 excerpt mapped to the items that cite it (156 excerpts);
  - every `8.100.x` or `2505-3 §` citation in an item's meaning or precision mapped to that item.
- I read the derivations of the MAGI household, income, category, status, continuous eligibility, presumptive eligibility, transitional, Express Lane, verification and CHP+ items, and the items the coverage round added (CO-4550 to CO-4568).
- Probes are scratch households built from the stored case CO-180 as a template. They were appended to the scratch copy's `volumes/co/tests/cases.yaml` and evaluated with `npx vite-node scripts/eval-case.ts co <id> <identifiers> <month>`. The generator is in `/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cov2magi/gen/` (`mk.py`, `s1.json` to `s6.json`). Determination date: 2026-11-10. Application date: 2026-11-02. The 2026 poverty guideline is $21,640 for two people, so 100% is $1,803.33 a month.
- I also re-ran the stored cases CO-180 to CO-184, which the coverage round added. The script `/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cov2magi/tools/cmp.py` compares each expectation with the engine's value.

## 1. Verdict

**5 P1 found.** The family does not yet meet the stopping rule.

All nine first-pass P1s (F-01 to F-09) stay fixed (section 5). The new P1s are in paragraphs the first pass marked as carried:
- **N-01.** A parent whose child has no minimum essential coverage loses the 5% disregard at the Parents and Caretaker Relatives standard. CO-539 counts the Adult group as the parent's highest standard even though G.4.a bars the parent from it.
- **N-02.** An Eligible Needy Newborn is dropped in the month of the first birthday. G.1 grants the whole month, but CO-550 tests `age` on the determination date. This is the pattern F3-3 and F-06 fixed for the 19th, 26th and 65th birthdays.
- **N-03.** A tax filer's MAGI household reaches the spouse of a dependent the filer claims. The filer arm of CO-500 still walks transitively. F-01 fixed this for the non-filer arm only.
- **N-04.** Reasonable compatibility ignores the 5% disregard band. An attested income between the standard and the standard plus five points counts as "above the standard", so it is compatible. The person is then found eligible on that attestation with no verification, even when the data source reports twice as much. This affects CO-1402, and CO-1641 for CHP+.
- **N-05.** CHP+ Express Lane (2505-3 § 180) is not modeled. A referred child whose declared income is in the CHP+ band is sent to the Single Streamlined Application instead of being enrolled.

There are also 3 new P2 findings (N-06 to N-08) and 4 new P3 findings (N-09 to N-12). The first pass's deferred P2s, F-16 and F-18, are still open and are not counted again. All open questions are confirmed, with one gap noted on OQ-810 and OQ-811 (section 4).

## 2. Findings

P1: a wrong eligibility or benefit answer, a missing pathway, or a wrong or missing verification requirement. P2: a gap or mismatch with no answer effect in ordinary cases, or a reading that departs from the Colorado text without a record. P3: a note.

| ID | Pri | Paragraph | Item(s) | Governing text | What is wrong | Proposed fix |
|---|---|---|---|---|---|---|
| N-01 | **P1** | 8.100.4.D.1.a; G.3; G.4.a | CO-539 `ma_magi_highest_income_standard_pct` (Adult arm), CO-547 | D.1.a: "the five percent (5%) disregard will be applied for each qualifying MAGI program as the last step to determine eligibility"; G.4.a: "A dependent child living in the household of a parent or caretaker relative shall have minimum essential coverage, in order for the parent or caretaker relative to be eligible for Medical Assistance under this category" (42 CFR 435.119(c)(1)) | CO-547 applies the disregard only where 68% is the person's highest standard (CO-539). CO-539's Adult arm checks age, Medicare and pregnancy, but not the G.4.a condition that CO-548 and CO-552 apply. So for a parent whose child lacks minimum essential coverage, the "highest standard" is the Adult group's 133%, a group the parent cannot enter. The parent then gets the disregard in neither group. **RV2-MEC:** p1, a non-filer parent aged 40, has wages of $1,262; p2 is her 10-year-old child with no minimum essential coverage. Income is 69.98% FPL. Engine: `none` / `ineligible_income`. The rule gives 69.98 - 5 = 64.98% ≤ 68%, so `parent_caretaker` / `eligible`. That holds under D.1.a's "each qualifying program" and under 435.603(d)(4)'s "eligibility group with the highest income standard" alike, since the Adult group is not available to her. Control RV2-MECY (child has coverage): `adult` / `eligible`. | In CO-539's Adult arm, add the condition CO-548 already has: no child under 19 in `ma_caretaker_relative_of` lacks `dependent_child_has_minimum_essential_coverage`. Add RV2-MEC as a test. |
| N-02 | **P1** | 8.100.4.G.1, G.7 | CO-550 `ma_is_needy_newborn`, CO-552 (newborn arm), CO-201 | G.1: "any person who is determined to be eligible for Medical Assistance based on MAGI at any time during a calendar month shall be eligible for benefits during the entire month"; G.7: "A child whose mother is receiving Medical Assistance at the time of the child's birth is continuously eligible for one year" | CO-550 tests `age < 1`, with age taken on the determination date. A child whose first birthday falls earlier in the determination month was a needy newborn on the first days of that month, so G.1 covers the whole month, but the engine excludes the child. This is the defect F3-3 fixed at 19 and 26 and F-06 fixed at 65. **RV2-NB:** p2 was born 2025-11-05 to a mother on Medical Assistance; household income is 170.0% FPL; the determination date is 2026-11-10. Engine: `ma_is_needy_newborn` false, `none` / `ineligible_income` (CHP+ `eligible_child`). The rule gives `needy_newborn` / `eligible` for November 2026. Above the CHP+ limit the child would have no coverage for that month. | In CO-550 and CO-552's newborn arm, take the age on the day before the first of the determination month (the CO-564 idiom) against `ma_needy_newborn_age_limit_years`. Add RV2-NB as a test. |
| N-03 | **P1** | 8.100.4.E.1.a.i-iii (also E.1.b.ii-iv) | CO-500 `ma_magi_household_members` (filer and claimed-dependent arms) | E.1.a: the filer's household is "i) The Tax-Filer; ii) The Tax-Filer's spouse if living in the home; iii) All persons whom the Tax-Filer expects to claim as a tax dependent" | Both arms take `[reachable, [spouse, tax_filer, tax_dependent], ...]`. A spouse edge is crossed wherever the spouse lives with the person the walk has reached. So from the filer the walk reaches a claimed dependent, then that dependent's own spouse, then anyone that spouse claims. E.1.a lists none of them. F-01 removed the same transitive walk from the non-filer arm only. **RV2-DSP:** p1, a filer aged 45 with wages of $1,500, claims her daughter p2 (20, no income). p2's husband p3 (21, a filer with wages of $2,500) lives in the home and is not claimed. Engine: p1's household is {p1, p2, p3}, size 3, $4,000 = 175.7% FPL, `ineligible_income`. The rule gives {p1, p2}, size 2: $1,500 / $1,803.33 = 83.2% FPL, `adult` / `eligible`. p2's household ({p1, p2, p3}, E.1.b.iv) and p3's ({p2, p3}) are right. | Replace the walk with single steps, as F-01 did. Filer arm: the filer; the spouse living in the home; the persons the filer, or a spouse filing jointly, claims. Dependent arm: the dependent; the claiming filer; that filer's spouse living in the home; that filer's other dependents; the dependent's own spouse living with the dependent. Add RV2-DSP as a test. |
| N-04 | **P1** | 8.100.4.C.2.a.i-iii, C.2.b; 8.100.4.D.1; 2505-3 § 130.1, § 150.2 | CO-1402 `ma_income_is_reasonably_compatible`, CO-1403; CO-1641 `chp_income_is_reasonably_compatible`, CO-1642 | C.2.a.ii: attested below the standard and data above it is compatible only "within the reasonable compatibility threshold percentage of 20%"; C.2.a.iii: "if both amounts are above the applicable income standard ... the applicant shall be determined ineligible due to income"; C.2.b: otherwise "a reasonable explanation ... [or] paper documentation" | CO-1402's first arm treats any attested figure above `ma_magi_highest_income_standard_pct` as compatible. That arm holds the "both above" case and the verification plan's attested-above, data-below case, and in both the person is ineligible on the attestation. But CO-545 to CO-548 grant eligibility up to the standard plus five points. So an attestation in that band is compatible and eligible at once, and no verification is ever asked. Under either reading of "the applicable standard", the answer is wrong. Read as 142%, the attestation is above it, so C.2.a.iii makes the person ineligible. Read as 147% (with the disregard), the attestation is below it, and the data is far outside 20%, so C.2.b requires an explanation or documents. **RV2-RC:** p1 (filer, wages $2,615) and child p2 (claimed); 145.0% FPL attested; data source $5,410 (300% FPL), with an electronic match. Engine: compatible true; `ma_requires_verification_of_earned_income` false for p1; p2 `child` / `eligible`. Control RV2-RCB (data equal to the attestation): compatible, eligible. CO-1641 has the same gap at 260% to 265% for CHP+. | Compare against the threshold the category items actually grant eligibility at. That is the standard, plus the disregard where the group has the person's highest standard (or 265% for CHP+'s upper limit). Equivalently, apply the "above the standard" arms only to an attestation that fails the category test after the disregard. Add RV2-RC as a test. |
| N-05 | **P1** | 2505-3 § 180.1.A.1-6, § 180.2.A.1-6 | CO-3156 `ma_express_lane_child_meets_requirements`, CO-2442 `ma_express_lane_status` | 180.1.A.5: "Eligibility is based on income declared on the Free/Reduced Lunch application as well as eligibility requirements outlined in **section 150**"; 180.2.A.1: "Children who meet all necessary eligibility requirements as outlined throughout **sections 100 through 180** will be automatically enrolled" | The CHP+ rule has its own Express Lane, which enrolls a referred child who meets CHP+'s requirements: the band of 110.1.E, the income method of section 150, and section 120. CO-3156 tests only the Medicaid Children's standard, and no item cites § 180. A referred child with declared income in the CHP+ band is sent to the application instead. **RV2-ELE:** child p2 referred from a Free/Reduced Lunch application; the family opted in; declared income $3,607 for two, which is 200.0% FPL. Engine: `ma_express_lane_status` = `refer_to_single_streamlined_application` (`chp_eligibility_status` is `eligible_child` only because the full MAGI facts are stated). The rule gives automatic CHP+ enrollment. § 180 calls the program "Medical Assistance", but its cross-references to section 150 and sections 100-180 are the CHP+ rule's own sections (2505-3 § 180 against 2505-10 § 8.100.4.J.2.a.ii's "throughout 8.100.4"). | Add a CHP+ arm: a referred child under 19, a Colorado resident, with declared household income in the CHP+ band (`chp_income_limit_pct_upper`, above `ma_income_limit_child_pct`) and no other coverage, is enrolled in CHP+. Use a new option such as `enrolled_chp` and `enrolled_chp_pending_citizenship_verification` (§ 180.1.A.3, 180.2.A.2: 90 days). Cite § 180 in CO-2442 and CO-3156. Add RV2-ELE as a test. |
| N-06 | P2 | 8.100.4.D.1.a | CO-545, CO-546, CO-547, CO-548 | "the five percent (5%) disregard will be applied for **each qualifying MAGI program**" | The category items allow the disregard only for the group with the person's highest standard, under 42 CFR 435.603(d)(4) ("only ... under the eligibility group with the highest income standard ... but not to determine eligibility for a particular eligibility group"). That is a departure from D.1.a's wording. It is stated in CO-545's precision but is not a `statute_override` and has no open question. It changes the category, not eligibility: a parent with a covered child at 68% to 73% FPL is `adult` under the engine, and `parent_caretaker` under D.1.a, since CO-551 orders Parent/Caretaker first. The category matters later: I.1.a's Transitional Medical Assistance counts months in the Parent/Caretaker category. | Mark the 435.603(d)(4) reading as a `statute_override` on CO-545 to CO-548, citing D.1.a. Or record an open question. |
| N-07 | P2 | 8.100.4.I.3 | CO-4205 `ma_tma_parent_caretaker_is_in_transitional_period` | "If it is determined that the household no longer has a child living in the home, Transitional Medicaid Assistance shall discontinue **at the end of the month** in which the household does not include a dependent child" | CO-4205 requires a dependent child in the household in the month itself. So TMA stops in the month the child leaves, not at its end. The household facts are not dated within a month, so a case that states the child gone loses that month's TMA. | Keep the transitional period through the month in which the dependent child is no longer in the household. For example, read the household as of the month before, or add a fact for the month the last dependent child left. Or record the reading. |
| N-08 | P2 | 2505-3 § 130.1; the MAGI verification plan (D-317, "Medicaid & CHIP") | CO-1641, CO-1642 | D-317: "When an individual attests to income above the applicable standard and data source indicates income below the standard, the state will take the attestation and make the person ineligible ... Additional information will not be requested" (the plan's scope is Medicaid and CHIP) | F-12 made this combination compatible in CO-1402 (Medicaid). CO-1641 (CHP+) still treats an attestation above 260% with data at or below 260% as not compatible, so CO-1642 asks for documentation. No reason is recorded for the difference. | Add the attested-above, data-below arm to CO-1641 (together with N-04's band fix), citing D-317. |
| N-09 | P3 | 8.100.1 "Pregnant Women" | CO-546, CO-194 | Definition: "whose MAGI-based income calculation is **less than** 195% FPL"; G.5: "does not exceed 195%" | The items follow G.5 (at or below), which is the operative paragraph, but nothing records the conflict with the definition. | One line in CO-546's precision. |
| N-10 | P3 | 8.100.4.F.2.a-b (and R.2.a-b, R.2.f) | CO-558, CO-559 | "unless they meet the exceptions outlined under 8.100.3.G.1.g.viii" | The paragraph that holds the status exception is ix (Cover All Coloradans), not viii (Afghan parolees). CO-2439 records this reading; CO-558 and CO-559, which test no status at all (correct under ix.1.a), do not. | Note the cross-reference in CO-558 and CO-559's precision. |
| N-11 | P3 | 2505-3 § 430.5 | CO-2410 `chp_is_guaranteed_newborn` | "guaranteed coverage for one year" | `age < 1` on the determination date ends the guarantee on the first birthday itself. CHP+ has no whole-month rule like G.1, so the reading is defensible, but it is not recorded. It is the same kind of note as F-26. | One line in CO-2410's precision. |
| N-12 | P3 | 8.100.3.G.1.c | CO-1179 `ma_meets_imd_requirement` | "unless the person is under 21 years of age or has attained 65 years of age and is eligible ... and **is receiving active treatment as an inpatient in a psychiatric facility** eligible for Medical Assistance reimbursement" | CO-1179 exempts every person under 21 or 65 and older in an IMD, without the active-treatment condition. It also takes age 65 on the determination date, so the 65th-birthday month is not a whole month under G.1. The answer is unlikely to differ, since an IMD patient is an inpatient. | Record the reading in the precision, or test the treatment condition. |

Carried from the first pass, still open (not counted again): F-16 (P2, § 8.100.4.G.6.a's ending events for Legal Immigrant Prenatal, deferred) and F-18 (P2, § 8.100.3.K.7 Difficulty of Care payments, deferred). The deferral reasons in the first pass's disposition still hold.

## 3. Coverage matrix

Key: **C** = carried by (the derivation was read and is correct unless a finding is named). **NA** = not applicable, with the reason. **OQ** = open question. **GAP** = no item and no recorded reason.

### 3.1 § 8.100.1 Definitions (D-65:19-262)

| Definition | Disposition |
|---|---|
| Adult MAGI group (19 through the end of the month the person turns 65; not receiving or not eligible for Medicare) | C: CO-548, CO-539, CO-552, CO-4550, CO-199. Re-run as RV2-65: `adult` / `eligible`, so F-06 holds |
| Children MAGI group (through the end of the month the person turns 19) | C: CO-564, CO-545 |
| Parent and Caretaker Relative group | C: CO-547 (N-01) |
| Pregnant Women group ("less than 195%", 12 months postpartum) | C: CO-546, CO-566, CO-560 (N-09) |
| MAGI; Non-Filer; Tax Dependent; Tax-Filer | C: CO-500, `is_tax_filer` (CO-075: "expects to file", as E.1.a reads it), `expects_to_be_claimed_as_dependent` |
| Adjusted Gross Income | C: CO-502 (wages and taxable income, less `pretax_deductions`) |
| Caretaker Relative ("assumes responsibility for the dependent child's care") | C: CO-2606 (primary responsibility, state plan S25). OQ-540 (CCCAP half only) |
| Dependent Child (under 18, or 18, a full-time student and expected to graduate by 19) | C: CO-544, CO-190 |
| Dependent Relative | NA: no MAGI rule reads it; the tax-dependent relation governs |
| Medical Assistance Required Household | C: CO-4204 (TMA), CO-2201 (continuous eligibility exception iii) |
| Application Date (date-stamped; otherwise the signature date) | C: CO-088 (supplied as the date the application was filed) |
| Alien; Citizen; Legal Immigrant; Legal Immigrant Prenatal | C: `immigration_status` (CO-002), `is_us_citizen_or_national`; Legal Immigrant Prenatal through CO-509's vii arm |
| Earned Income; Unearned Income; In-Kind Income; Earned Income Disregards | C for MAGI through the tax definitions of § 8.100.4.C (CO-502); the disregards are NA (non-MAGI) |
| Difficulty of Care Payments | GAP, carried: F-18 (P2, deferred) |
| Electronic Data Source | C: CO-1589, CO-1344 |
| Employed | C: `ma_declares_current_employment` (CO-2433), `has_earned_income` (CO-2425) |
| FPL | C: `federal_poverty_guideline_annual_table`. OQ-515 (adoption date) |
| Good Cause | C: CO-2220 (extension of the verification time) |
| Inpatient; Institution; Public Institution | C: CO-1105 (inmate of a public institution), CO-554 `incarceration_limited` (the scope of the limited benefit is not modeled; it is an outcome label) |
| Minimal Verification; Questionable | C: CO-1403 to CO-1409 (the `*_attestation_is_questionable` facts) |
| Minimum Essential Coverage | C: CO-085 (G.4.a), CO-090 (CHP+) |
| Qualified Hospital Presumptive Eligibility Sites | C: CO-2432 |
| Reasonable Compatibility; Reasonable Explanation | C: CO-1402, CO-1641 (N-04, N-08) |
| Resident | C: CO-505, CO-2250; an unemancipated child is read through the stated `state_of_residence` |
| Secondary School | C: CO-544 (`is_full_time_secondary_student_finishing_before_nineteen`) |
| TMA | C: CO-2430 |
| Insurance Affordability Program; SSAp; PEAK; Application for Public Assistance; Ex Parte Review; Complete Application; Eligibility Site; CBMS; CDHS; CMS; CHP+; Client; Recipient; Department; Colorado State Plan; EPSDT; FFP; Managed care; Medical Assistance; Provider; Patient; Outpatient; Ambulatory Services; Case Management; Categorically Eligible; Child Support Services; Good Cause for Child Support; Third Party; Title XIX; TANF; RRB; SSA; VA; Common Law Marriage | NA: administrative or descriptive terms with no condition. A common-law marriage is a stated `spouse` edge |
| 300% group; 1619b; AB; ABD; ABLE; AND; AFDC; AP-5615; Annuity; Blindness; Burial Spaces; Burial Trusts; Cash Surrender Value; COLA; Community Spouse; CSRA; Disability; Dual Eligible; Equity Value; Face Value; Fair Market Value; FBR; HCBS; Institutionalization; Institutionalized Individual; Institutionalized Spouse; Irrevocable; Limited Disability; Long-Term Care; LTC Institution; LTSS Level of Care (determination and screen); MMMNA; MIA; MSP; Nursing Facility; OAP; OASDI; PACE; PNA; Premium; Psychiatric Facility; SGA; Single Entry Point Agency; SISC; SSI; SSI Eligible | NA (non-MAGI) |

### 3.2 § 8.100.2 Legal Basis

| Para | Disposition |
|---|---|
| Legal basis paragraphs (Colorado Constitution art. XXIV; C.R.S. 25.5-4-102; Title XIX; single State agency) | NA: authority, no condition |

### 3.3 § 8.100.3.A-F

| Para | Disposition |
|---|---|
| A.1 (evaluate under all categories; no time limit while categorically eligible) | C: CO-551 (every category in order), CO-554, CO-1176 |
| A.2 (a Single Streamlined Application found ineligible is reviewed for other programs, CHP+ and the marketplace) | C: CHP+ is determined alongside (CO-707). Marketplace: NA (not a program of the volume) |
| A.2.a (transfer to the marketplace) | NA: system interface |
| A.3, A.4 (one application; review for other requested programs; referrals) | NA: procedure |
| A.5 (signature, telephonic or electronic) | NA: procedure (a complete application is assumed when a determination is requested) |
| A.6-A.8 (who may apply and sign) | NA: procedure |
| A.9-A.11 (no interview; no restriction on hours; withdrawal) | NA: procedure |
| B.1 (apply in the county of residence; no durational residency; no permanent dwelling or mailing address required) | C: CO-505 (no durational or address test). County: NA (administration) |
| B.1.a (county of domicile for long-term care) | NA (county administration; non-MAGI) |
| B.2 (resident: living in Colorado and considers it home at application) | C: CO-505, CO-2250 |
| B.2.a-d (institutionalized persons incapable of indicating intent) | C: CO-2250, CO-2257, CO-2252, CO-2253, CO-2254, CO-2255, CO-2256, CO-2282. OQ-472 (b against c) |
| B.3.a-c (incapable of indicating intent) | C: CO-2251 (supplied, stating a-c) |
| B.4 (residence retained until abandoned; temporary absence) | C: `state_of_residence` (supplied). OQ-612 (temporary absence) |
| B.5 (non-resident) | C: CO-505 |
| C.1-C.7 (county transfers, nursing facility transfers, AP-5615) | NA: county administration |
| D.1.a-c (45 and 90 days to decide) | NA: processing time. A disability determination has no eligibility effect here |
| D.1.d (delay in unusual circumstances) | NA |
| D.1.e (COVID-19 maintenance of effort; ended May 2023) | NA: expired |
| D.2 (extension of time to verify) | C: CO-2220, CO-1414 |
| D.3-D.7 (no waiting period; delay notice; appeals of SSA terminations; voter registration) | NA: procedure |
| E.1 (three months before the application, or from the date eligible if later; services received; all requirements met) | C: CO-557, CO-4101, CO-4100, CO-2472 (Pub. L. 119-21 sec. 71112: one or two months for applications from 2027-01-01, CO-2449 to CO-2451) |
| E.2 (request on the application or verbally later; need not be eligible in the application month; no proof of services) | C: CO-4100 (meaning states each element), CO-4101 |
| F.1.a (MAGI groups and family planning) | C: CO-551, CO-1154 |
| F.1.b-j, l-m (SSI-related, OAP, Pickle, DAC, institutional, HCBS, Katie Beckett, Buy-In) | NA (non-MAGI) |
| F.1.k (meets a category but not citizenship: emergencies only) | C: CO-510, CO-1151, CO-554 `emergency_only`. OQ-200 |
| F.1.n (COVID-19 limited benefit, ended 2023) | NA: expired |

### 3.4 § 8.100.3.G General and citizenship requirements

| Para | Disposition |
|---|---|
| G.1.a (resident of Colorado) | C: CO-2250 in CO-554 and CO-562 |
| G.1.b.i.1-4 (public medical institution, LTC resident, parolee, community residence of 16 or fewer) | C: CO-1105 (medical institution, bed count, setting) |
| G.1.b.i.5.a-d (community corrections with freedom of movement) | C: CO-4566, which CO-1105 excludes (F-15 holds) |
| G.1.b.ii.a-b (inmates: limited to inpatient stays and reentry services) | C: CO-554 `incarceration_limited` for any inmate meeting a category (F-07 holds: CO-554-T91 to T93) |
| G.1.c (no IMD or TB institution, except under 21 or 65 and over in active inpatient treatment) | C: CO-1179, CO-562 (N-12) |
| G.1.d-f (financial and other requirements; disability and blindness where applicable) | C: the category items. Disability and blindness: NA (non-MAGI) |
| G.1.g.i (citizen or national) | C: CO-509 (`is_us_citizen_or_national`) |
| G.1.g.ii (lawfully residing, entered before August 22, 1996) | C: CO-509 (CO-507, CO-1726, CO-279; with 1396b(v)(5) from 2026-10-01) |
| G.1.g.iii (LPR on or after August 22, 1996, after five years) | C: CO-509, CO-508 (from `qualified_status_date`; override 8 U.S.C. 1613(a)). OQ-213 |
| G.1.g.iv.1-11 (LPR five-year exemptions) | C: CO-1172, CO-2700 to CO-2705. OQ-213 (adult parolees, conditional entrants, battered non-citizens) |
| G.1.g.v.1-2 (Cuban/Haitian entrants; COFA) | C: CO-1172, CO-2400 |
| G.1.g.vi (incorporation by reference) | NA |
| G.1.g.vii.1-28 (CHIPRA 214: lawfully residing pregnant women and children) | C: CO-509's vii arm, CO-507 (status list) |
| G.1.g.viii.1-2 (Afghan humanitarian parolees, exempt until 2023-03-31 or the parole's end) | C: CO-1172, CO-2705 |
| Pub. L. 119-21 sec. 71109 (federal payment from 2026-10-01 only for citizens, LPRs, Cuban/Haitian entrants and COFA migrants; not in the Colorado text) | C: CO-2400, CO-3034 in CO-509; emergency services stay (CO-510). OQ-518, OQ-510, OQ-517 |
| G.1.g.ix.1.a-b (Cover All Coloradans: under 19 or the 19th birthday month, pregnant, 12 months postpartum; listed categories) | C: CO-1173, CO-1174, CO-1175, CO-562 (any MAGI category for a child or pregnant person, C.R.S. 25.5-2-104 and 25.5-5-201(6)). OQ-214 (postpartum) |
| G.1.g.ix.2 (emergency and reproductive care regardless of status; emergency condition; no prenatal or follow-up care; 12 months without a new application; renewal at 12 months) | C: CO-1151, CO-1100, CO-1154 (`reproductive_health_care_program`). Benefit scope: NA (not an eligibility condition) |
| G.1.g.ix.3 (confidentiality) | NA |
| G.2, G.2.a.i-ii (immigration status verified through VLP/SAVE; documents if not confirmed) | C: CO-1622, the immigration verification facts. OQ-550 |
| G.3.a.i (90-day reasonable opportunity period from the Notice of Action) | C: CO-1413, CO-1347, CO-1747 (override 42 CFR 435.956(b)(2)(ii)(B): five days for receipt; F-20 holds) |
| G.3.a.ii-iv, b (termination if not provided; benefits not delayed; benefits from application) | C: CO-1415 (`pending_reasonable_opportunity`, `reasonable_opportunity_expired`) |
| G.3.c.i-ii (programs the period applies to) | C: CO-1415 applies to every Medical Assistance determination; the list holds every MAGI program |

### 3.5 § 8.100.3.H Citizenship and identity documentation

| Para | Disposition |
|---|---|
| H.1 (citizenship and identity verified for a declared citizen) | C: CO-1395, CO-1398 |
| H.1.a.i-ii (SSA match verifies both; DMV match verifies identity) | C: CO-1395 to CO-1399 (`citizenship_verified_by_electronic_data_source`, the identity match) |
| H.1.b.i-v (Medicare, SSI, IV-B foster, IV-E, SSDI exempt) | C: CO-1395 (CO-1587). OQ-324 (resolved) |
| H.1.b.vi, vi.1 (deemed newborn exempt for life) | C: CO-1395 (`mother_was_enrolled_in_medicaid_at_birth`) |
| H.1.b.vi.2.a-c (reversal of 2006-2009 denials) | NA: historic, closed period |
| H.1.b.vii (presumptive eligibility) | C: CO-1395 precision (F-23 holds) |
| H.1.b.viii ("8.100.3.G.g.viii", Afghan parolees) | NA: non-citizens owe no citizenship proof |
| H.2.a.i-iv (stand-alone documents) | C: CO-1396, `citizenship_verification_document_type` (CO-1306) |
| H.2.a.iv.1 (tribal reversal of earlier denials) | NA: historic |
| H.2.b.i-xxi (citizenship evidence and its date and place conditions) | C: CO-1397, CO-1306 (option list; conditions named in the precision, F-24 holds) |
| H.2.c.i-iii (collectively naturalized: Puerto Rico, Virgin Islands, NMI) | C: CO-1306 options |
| H.2.d.i-iii (Colorado birth certificate referral) | NA: county assistance; iii is a right to use any listed document, which CO-1397 allows |
| H.3.a-h (identity documents; three corroborating documents) | C: CO-1399, CO-1302. OQ-304 (resolved) |
| H.3.i (children under 16: records and parent affidavit) | C: CO-1399 |
| H.4.a-g (copies, presumed genuine, by mail, intake at other sites) | NA: handling procedure |
| H.4.h.i-ii (no resubmission unless questioned or a gap over five years without retained documents) | C: CO-2211 to CO-2214, CO-1395 |
| H.5 (retention) | NA |
| H.6 (name change) | NA: document handling |
| H.7, H.8 (assistance in obtaining documents) | NA: county duty |
| H.9.a (reasonable opportunity period from the Notice of Action; COVID-19 continuation ended) | C: CO-1413 |
| H.9.b (90 days; MAGI, Adult and Buy-In programs) | C: CO-1347 |
| H.10 (good faith extension) | C: CO-2221, CO-1413 |

### 3.6 § 8.100.3.I-R

| Para | Disposition |
|---|---|
| I.1 (SSN or proof of application; not for non-requesting members, emergency or reproductive services, eligible newborns) | C: CO-1401, CO-1623, CO-2215 |
| I.1.a.i-ii (refusal: the person is not eligible; sole dependent child: denial) | C: CO-1415 (`past_due` with SSN pending). The denial itself is outside the item (precision) |
| I.1.b.i-iii (exceptions) | C: `ssn_exception_applies` (CO-1312) |
| I.1.c (COVID-19 self-attestation) | NA: expired |
| I.2 (assignment of rights; optional child support referral) | NA: no MAGI eligibility condition |
| I.3 (third-party resource information; refusal "may result in loss") | NA: a discretionary sanction with no stated condition |
| I.4 (free choice of provider) | NA |
| J.1.a-d (choice between MAGI and SSI) | NA: the volume determines both |
| J.2 (SSI and OAP-A recipients outside the required household) | NA for MAGI: J.2.a sends MAGI household construction to § 8.100.4 (CO-500). SSI and OAP payments are not MAGI income (CO-502 does not read them) |
| J.2.a (MAGI exception) | C: CO-500, CO-502 |
| J.3 (AND payment not counted for MAGI) | C: CO-502 does not read the Adult Financial cash income |
| K.1, K.1.a (sponsor deeming until citizenship or 40 quarters; not for a pregnant woman or a child) | C: CO-4551, CO-4552, CO-4553, CO-4554, CO-4555, CO-503 (re-run: CO-183 matches). OQ-812 |
| K.2-K.5 (income, earned income, in-kind earned income, "received") | C for MAGI through § 8.100.4.C (CO-502, monthly facts) |
| K.6 (Home Care Allowance paid to a provider is earned income) | C: `wages_gross` (taxable compensation) |
| K.7.a-c (Difficulty of Care exclusion for MAGI) | GAP, carried: F-18 (P2, deferred) |
| K.8.a-c (WIA wages and training allowances) | C for MAGI through the tax rules: wages are taxable (counted), and a training allowance is not MAGI income. c (a dependent child's WIA wages exempt for six months) is answered by C.1.f (a child's income below the filing threshold is not counted) |
| K.9, K.9.a-d (self-employment net profit; depreciation allowed for MAGI) | C: `self_employment_net_earnings_for_tax` (CO-024 precision, K.9.b.i.1). The day-care allowances (c): NA (non-MAGI) |
| K.10.a-e (farm, rental, room and board) | C for MAGI through the tax figure; the food-allotment tests are non-MAGI |
| K.11.a.i-viii (unearned income) | C: CO-502. K.11.a.i.1 sends private disability to § 8.100.4 |
| K.12-K.14 (stimulus, FPUC, tax refunds, EITC and CTC exempt) | NA: none is a MAGI income fact. FPUC and stimulus have expired |
| L.1 (no resource test for MAGI) | C: no MAGI or CHP+ item reads resources |
| L.2 (stimulus as a resource) | NA (non-MAGI; expired) |
| M.1-M.3 (FFP; SISC codes) | NA here: CO-2456, OQ-514. SISC is non-MAGI |
| N.1-N.9 (confidentiality) | NA |
| O.1-O.4 (non-discrimination) | NA |
| P.1 (redetermination at least every 12 months, on all bases) | C: CO-2455 (six months for expansion adults from 2027), CO-1566 |
| P.2.a-b (ex parte review) | NA: renewal procedure |
| P.3.a-e, h (forms, annuity disclosure, signature) | NA: procedure; the annuity disclosure is non-MAGI |
| P.3.f-g (coverage kept if the form is returned before the period ends) | NA: recorded in docs/colorado-notes.md (F-14) |
| P.4.a-e (processing times) | NA |
| P.5, P.5.a-b (90-day reconsideration period; effective date; three months retroactive) | C: the return date stated as `ma_application_date` (CO-088 precision), CO-4101, CO-4100 |
| Q.1 (children under 19; up to 12 months) | C: CO-555, CO-556, CO-561, CO-196 |
| Q.1.a (without regard to changes) | C: CO-551 (continuous eligibility before the income tests), CO-554 |
| Q.1.b.i, iii, v, vi, viii (death, left the household, cannot be located, withdrawal, error or fraud) | C: CO-2205, CO-2201 to CO-2204 |
| Q.1.b.ii, ii.1 (inmate: limited benefit; full coverage again on release) | C: CO-554 `incarceration_limited` (monthly, so release restores the month) |
| Q.1.b.iv (no longer a resident) | C: CO-561 (`ma_meets_residency`) |
| Q.1.b.vii (no documents in the reasonable opportunity period) | C: CO-2205 (status verification pending after the period's end) |
| Q.2 (starts the month the application is received or when criteria are met; a new period on transition from CHP+) | C: CO-561 (CO-094, or the application month). The transition period is a stated start (CO-094) |
| Q.2.a-g (programs; SSI and LTC children continue as MAGI children; Buy-In premiums) | C: CO-2446, CO-561, CO-2448, CO-2447. Pickle, DAC and Buy-In: non-MAGI |
| Q.3.a-c (exit from foster care Medicaid) | C: CO-2446 `foster_care_exit`, CO-561 |
| R.1, R.1.a-d (hospital presumptive eligibility groups) | C: CO-2439, CO-2432 |
| R.2.a (pregnant, 195%, attested pregnancy) | C: CO-2439 (`pregnant`) |
| R.2.b (child under 19, 142%) | C: CO-2439 (`child`) |
| R.2.c (limited family planning, over 133% to 260%, counted as two, no full coverage, status declaration) | C: CO-2439, CO-3152, CO-2433 (status branch). OQ-590 |
| R.2.d (19 to 65 at 133%) | C: CO-2439 (CO-4550). OQ-513 resolved (state plan S21) |
| R.2.e (parent, caretaker, guardian or conservator, 68%) | C: CO-2439, CO-3154 |
| R.2.f (employed and disabled, 16 or older, own income at 450%) | C: CO-2439, CO-3153, CO-2438 |
| R.3, R.4, R.6, R.7 (certification, forwarding, no appeal of the end, appeal of delay) | NA: procedure |
| R.5 (period from the presumptive determination to the full determination) | C: outcome; period dates NA |
| R.8 (not already receiving another program) | C: CO-2439 (`is_enrolled_in_medical_assistance`) |
| R.9 (once in 12 months; once per pregnancy) | C: CO-2439, CO-2436, CO-2437 |

### 3.7 § 8.100.4 MAGI

| Para | Disposition |
|---|---|
| A.1-A.2 (Single Streamlined Application; application sites) | NA: procedure |
| A.3.a-b (EPSDT referral) | NA |
| B.1.a, a.i, a.i.1 (SSN or proof of application; PHE self-attestation ended; status failure gives emergency services) | C: CO-1401; a.i.1 by CO-510 |
| B.1.b (citizenship and identity per H) | C: CO-1395, CO-1398 |
| B.1.c (earned income: attested and electronic; documents when no electronic match; estimate from less than a month of stubs; prior month acceptable) | C: CO-1403, CO-1624. The estimate rules: NA (the supplied month amount is the figure used). N-04 |
| B.1.d (unearned income self-attested; some electronic) | C: CO-1404, CO-1625 |
| B.1.e (immigration status declared, verified through VLP) | C: CO-1622, CO-1415 |
| B.2-B.4 (no other verification unless questionable; documented; reuse records) | C: the `*_attestation_is_questionable` facts. B.3 and B.4: NA |
| B.5.a-b, B.6.a-b (age and relationship declared unless questionable) | C: CO-1408, CO-1409 |
| C.1 (gross income per 26 U.S.C. 61) | C: CO-502 |
| C.1.a.i-vi (earned: wages, business, property gains, partnership, compensation, taxable private disability) | C: CO-502 (`wages_gross`, `self_employment_net_earnings_for_tax`, `magi_other_taxable_income`) |
| C.1.b.i-iv, vi-xiii (unearned income types) | C: CO-502 (`other_unearned_income_taxable`, `pension_income`, `social_security_income`, `tax_exempt_interest`, `magi_other_taxable_income`) |
| C.1.b.v (alimony only for divorces executed by 2018-12-31) | C: the income facts follow the tax code (alimony from later decrees is not taxable). I.5.a |
| C.1.b.xiv.1-4 (lottery and gambling winnings: one month below $79,999; spread above; only in the recipient's determination for spread months) | C: CO-1185, CO-1187, CO-1183, CO-1184, CO-1988, CO-503. OQ-216 (resolved), OQ-592 |
| C.1.b.xiv.5.a-b (hardship exemption) | C: CO-2222, CO-503 |
| C.1.b.xv.1-2 (discharged student loans) | C: CO-1190, CO-2463 to CO-2465. OQ-217 (resolved) |
| C.1.c.i-iii (tax-exempt interest, untaxed foreign wages, Title II benefits) | C: CO-502 |
| C.1.d.i-ix (exclusions: lump sum in the month only, scholarships, child support, workers' compensation, SSI, veterans' benefits, stimulus, FPUC, American Indian/Alaska Native income) | C: CO-502 reads none of these as income. American Indian/Alaska Native income: `other_unearned_income_nontaxable` (not counted) |
| C.1.e, e.i-xv (above-the-line deductions) | C: `pretax_deductions` (CO-080) in CO-502 |
| C.1.f.i, i.1 (a child's income counted only above the filing threshold; Title II and Tier I left out of the test) | C: CO-4558, CO-4568 (F-17 holds) |
| C.1.f.ii, ii.1 (a tax dependent other than a child or spouse) | C: CO-4558 |
| C.1.f.iii (printed "ii": a child or dependent not living with a parent counts in their own determination) | C: CO-4558 (the exclusion needs a parent or claiming non-parent in the household) |
| C.2 (30-day reasonable opportunity period for income) | C: CO-1349, CO-1414. OQ-813 (CHP+) |
| C.2.a.i-iii (reasonable compatibility; 20%) | C: CO-1402 (**N-04**). OQ-302 |
| C.2.b, b.i (explanation, then documents) | C: CO-1403 (N-04) |
| C.3 (self-employment ledger sufficient) | C: CO-1403 (documents only if questionable) |
| C.4 (current or previous monthly income) | C: CO-4567, CO-504 |
| C.4.a (annualized self-employment, seasonal and commission income if ineligible monthly) | C: CO-4559, CO-4556, CO-4557, CO-4567 (re-run: CO-182 matches). OQ-810 |
| C.5 (eligible if income under the premium tax credit method is below 100%) | C: CO-4560, CO-4561, CO-4563, CO-4564, CO-504. OQ-811 |
| D.1 (5-point disregard) | C: CO-183 in CO-545 to CO-548, CO-704, CO-1155 (N-01, N-06) |
| D.1.a (for each qualifying program, as the last step, Title XIX and XXI) | C: as D.1 (**N-01**, N-06) |
| D.1.b (not applied when income is below the threshold) | C: the plain test comes first in each category item |
| E.1 (household from the relationship to the tax filer, as declared) | C: CO-500 |
| E.1.a.i-iii (filer not claimed) | C: CO-500 (**N-03**) |
| E.1.b.i-iv (claimed dependent) | C: CO-500 (N-03: the same walk) |
| E.1.c.i-iii (exceptions: claimed by a non-parent; parents not filing jointly; non-custodial parent) | C: CO-1976, CO-563, CO-1946 |
| E.1.d.i-iv (non-filer household) | C: CO-500 non-filer arm (F-01 holds: CO-180 matches) |
| E.2 (a pregnant woman counts as herself plus the expected children, in every household) | C: CO-501 |
| E.3 (family planning applicant counted as two in addition to the others) | C: CO-1153, CO-3029. OQ-204 |
| E.4 (married couples living together in each other's household) | C: CO-500 (F-02 holds: CO-181 matches) |
| E.5 (joint-filing parents, one living apart because of separation or pending divorce) | C: CO-1976, CO-1947 |
| E.6 (both a tax dependent and a filer: a dependent) | C: CO-500 arm order (`not expects_to_be_claimed_as_dependent` in the filer arm) |
| F.1 (MAGI presumptive eligibility: pregnant, child, limited family planning) | C: CO-558, CO-559, CO-3155 |
| F.2.a (pregnant, 195%, attested; status exception) | C: CO-558 (no status test, which is right under ix.1.a) (N-10) |
| F.2.b (child, 142%) | C: CO-559 (N-10) |
| F.2.c (limited family planning, over 133% to 260%, no full coverage, status declaration, counted as two) | C: CO-3155, CO-3152. OQ-590 |
| F.3-F.7 (certification, forwarding, period, appeals) | NA: procedure. The period (F.5) is an outcome, not dated |
| F.8 (not already receiving a program) | C: CO-558, CO-559, CO-3155 (CO-2435) |
| F.9 (once in 12 months; once per pregnancy) | C: CO-2436, CO-2437 |
| G.1 (eligible at any time in a month means the whole month) | C: CO-564, CO-549, CO-4550 (**N-02**: not CO-550) |
| G.2 (children at or below 142%) | C: CO-545, CO-540, CO-191 |
| G.2.a (through the month of the 19th birthday) | C: CO-564 |
| G.3 (parents and caretakers at or below 68%; a dependent child in the household) | C: CO-547, CO-192, CO-2606, CO-544 (N-01). OQ-50 (resolved: no deprivation requirement) |
| G.3.a.i-vi (child considered living in the home despite absences) | OQ-612 (temporary absence). The supplier states `lives_with` through `dwelling_id` |
| G.4 (adults at or below 133%; includes parents over the 68% standard) | C: CO-548, CO-542, CO-193 |
| G.4.a (dependent child must have minimum essential coverage) | C: CO-548, CO-552, CO-085 (**N-01**: CO-539 omits it) |
| G.4.b (COVID-19 testing benefit) | NA: expired |
| G.5 (pregnant at or below 195%; from application through the 12th month after the pregnancy ends; regardless of income changes once income is verified) | C: CO-546, CO-565, CO-566, CO-560, CO-198, CO-3601 |
| G.5.a.i (ends if income is not verified within the 30-day period; first verification only) | C: CO-566 (the lock-in needs income verification not pending), CO-1349 |
| G.6 (Legal Immigrant Prenatal) | C: CO-509 vii arm (lawfully residing pregnant woman) |
| G.6.a.i-viii (ending events) | GAP, carried: F-16 (P2, deferred) |
| G.7 (Eligible Needy Newborn for one year, including retroactive coverage of the birth; need not live with the mother) | C: CO-550, CO-087, CO-201 (**N-02**) |
| G.7.a (birth reported; added to the case; no application or SSN if adopted) | C: CO-1401 (no SSN for the newborn). Reporting: NA (procedure) |
| G.8 (limited family planning over 133% to 260%; residency and status; no full coverage) | C: CO-1154, CO-1155, CO-1131, CO-1132. OQ-204 |
| H.1.a (Psych under 21; to age 22 if in treatment at 21; income below "the MAGI needs standard") | C: CO-2419, CO-2416, CO-2418. OQ-512 |
| H.1.b-c, e-f (foster care, independent living, county custody, subsidized adoption) | C: CO-2419, CO-2414 |
| H.1.d (Alternatives to Foster Care; MAGI needs standard) | C: CO-2419. OQ-512 |
| H.1.g (responsibility at 18; to the 21st birthday except subsidized adoption) | C: CO-2419, CO-3028, CO-2415 |
| H.2 (former foster care to the end of the month of the 26th birthday) | C: CO-549, CO-200 |
| H.2.a, a.i-iii (in care at 18 to 21 and enrolled; not subsidized adoption; not mandatory groups; out-of-state youth from 2023) | C: CO-549, CO-095, CO-3025, CO-225, CO-2420, CO-2421; a.ii through CO-551's order |
| H.2.b (no income or resource test) | C: CO-549 reads no income |
| H.2.c (the youth's newborn is a needy newborn) | C: CO-550 (N-02 applies to it too) |
| I.1 (TMA 12 months from the first month of ineligibility after losing the Parent/Caretaker category to income) | C: CO-4205, CO-2430, CO-2422, CO-2426 |
| I.1.a (in the category three of the six months before) | C: CO-4205, CO-2424, CO-2428, CO-2429 |
| I.1.b, b.i (new or increased employment income; a parent or caretaker stays employed or left with good cause) | C: CO-2423, CO-2425 |
| I.2, I.2.a-b (later members; continuous-eligibility child; members losing coverage at redetermination) | C: CO-2430, CO-4204 (F3-4 holds) |
| I.3 (household must include a dependent child; ends at the end of the month without one) | C: CO-4205 (**N-07**) |
| I.4 (reassessed when TMA ends) | NA: procedure (each month is determined on all categories) |
| I.5 (four months for loss due to support income; three of six months; meets all other criteria before the alimony) | C: CO-2431, CO-2427, CO-2423 (`support_income`, the supplier's finding) |
| I.5.a (alimony countable only for pre-2019 decrees) | C: the income facts (C.1.b.v) |
| J preamble; J.1.a.i-vi (Free/Reduced Lunch application: opt in; auto-enroll; 90 days pending citizenship; declared income; otherwise SSAp) | C: CO-2442, CO-3156, CO-2441, CO-2443, CO-2445, CO-3151 |
| J.1.b.i-ii (automatic Free/Reduced Lunch without an application: not forwarded) | C: CO-2440 (`free_reduced_lunch_automatic` gives `not_applicable`) |
| J.2.a.i-vii (SNAP or Colorado Works application) | C: CO-2442, CO-2440 |

### 3.8 10 CCR 2505-3 (CHP+)

| Para | Disposition |
|---|---|
| 50.1-50.2, 50.4-50.5, 50.8-50.12, 50.15, 50.17 (applicant, CBMS, cost sharing, Department, eligibility site, enrollee, essential community provider, EOC, grievance committee, MCO, hospital PE site) | NA: terms without a condition |
| 50.3 (child: under 19) | C: CO-564 (through the 19th birthday month; F-26's reading recorded in CO-705) |
| 50.6 (dependent child) | C: CO-544 |
| 50.7 (effective date) | C: CO-4565 (month of application, § 430.1) |
| 50.13 (household per 8.100.4.E) | C: CO-500 (OQ-62 resolved: CHP+ reads the Medicaid household) |
| 50.14, 50.18 (income; unearned income; MAGI per 8.100.4.C) | C: CO-502, CO-504 |
| 50.16 (presumptive eligibility) | C: CO-708 |
| 50.19 (woman: 19 or older) | NA: CHP+ prenatal reads pregnancy at any age (110.1.A.2) |
| 110.1.A.1-2 (under 19, or pregnant) | C: CO-705, CO-706 |
| 110.1.B.1-2 (citizen or national; lawfully admitted before 1996-08-22) | C: CO-2706 |
| 110.1.B.3.a-d (LPR, parolee of a year or more, conditional entrant, battered, with no waiting period) | C: CO-2706 (any of these is also lawfully residing under B.5, so Pub. L. 119-21 changes no CHP+ answer: S1705) |
| 110.1.B.4.a-l (veterans and active duty and family, asylees, refugees, withholding, Cuban/Haitian, American Indian born in Canada, Amerasian, Hmong, Iraqi and Afghan special immigrants, COFA) | C: CO-2706 |
| 110.1.B.5.a-n (CHIPRA 214 lawfully residing) | C: CO-2706 |
| 110.1.B.5.o, o.1 (Cover All Coloradans exception; confidentiality) | C: CO-2707, CO-1173 |
| 110.1.C, C.1-2 (immigration status verified; reasonable opportunity period) | C: CO-1622, CO-1418, CO-1413 |
| 110.1.C.3.a (not required for Cover All Coloradans) | C: CO-1622 (read through CO-1173 for children and pregnant persons) |
| 110.1.D (resident; retained until abandoned; temporary absence) | C: CO-505 in CO-705 and CO-706 |
| 110.1.E (children over 142% to 260%) | C: CO-704, CO-212 (disregard to 265% under § 150.2) |
| 110.1.F (pregnant over 195% to 260%) | C: CO-704 |
| 110.1.G (incomplete application or documents: denial) | C: CO-1418 |
| 120.1.A (group health plan or insurance, excluding COBRA, at application or redetermination) | C: CO-090 |
| 120.1.B (eligible under Title XIX) | C: CO-705, CO-706 (`ma_has_full_coverage_category`), CO-707 `ineligible_medicaid_eligible` (F3-2 holds) |
| 120.1.C (inmate or IMD patient; reentry services 90 days before release) | C: CO-705, CO-706, CO-1105, CO-1749 |
| 120.2 (no waiting period uninsured) | C: no item imposes one |
| 130.1 (minimal verification per 8.100.4.B) | C: CO-1416, CO-1417, CO-1418, CO-1641, CO-1642, CO-3634 (N-04, N-08). OQ-813 |
| 140.1, 140.1.A.1-6 (redetermination, ex parte, forms, coverage kept, timeframes) | NA: renewal procedure (docs/colorado-notes.md, F-14) |
| 140.1.B, B.1-2 (reconsideration period; effective date; three months retro) | C: as P.5, through `ma_application_date`. CHP+ has no retroactive months (CO-4565). The "three months in retro coverage" is reached only through Medicaid |
| 150.1 (income per 8.100.4.C) | C: CO-504 (with C.4.a and C.5) |
| 150.2 (disregard per 8.100.4.D) | C: CO-704 |
| 170.1, 170.1.A-C (CHP+ presumptive eligibility: child over 142% to 260%, pregnant over 195% to 260%, status or Cover All Coloradans) | C: CO-708 (no status test, as C allows for these persons) |
| 170.2, 170.2.A, 170.4, 170.4.A-B (certification, forwarding, 45 days, appeals) | NA: procedure |
| 170.3 (period) | C: CO-708 outcome; dates NA |
| 170.5 (not already receiving a program) | C: CO-708 (CO-2435) |
| 170.6 (once in 12 months; once per pregnancy) | C: CO-708 (CO-2436, CO-2437) |
| 180 preamble; 180.1.A.1-6; 180.1.B.1-2; 180.2.A.1-6 (CHP+ Express Lane) | **GAP: N-05 (P1).** 180.1.B is carried by CO-2440 `free_reduced_lunch_automatic` |
| 200, 210 (benefits package) | NA: benefits, not eligibility (out of family scope) |
| 310 (enrollment fee, repealed) | C: CO-213 records it (OQ-57) |
| 320.1.A (under 101%: copayments waived except emergency $3 and urgent $1) | C: CO-2228 `band_a`, CO-3009, CO-2225 |
| 320.1.B.1.a-k (101% to 150%) | C: CO-2228 `band_b`, CO-3010, CO-2226. OQ-470 |
| 320.1.C.1.a-m (151% to 200%) | C: CO-2228 `band_c`, CO-3011, CO-2227. OQ-470 |
| 320.1.C.3, D.3 (COVID-19 laboratory copayments waived) | C: CO-2230 (`covid_19_laboratory_testing`) |
| 320.1.D.1.a-m (201% to 260%) | C: CO-2228 `band_d`, CO-3012 (re-run: RV2-CHPB at 205.2% is `band_d`) |
| 320.1 "at the time of eligibility determination" | C: CO-2228 reads the determination month's ratio |
| 330.1 (American Indians and Alaska Natives exempt) | C: CO-1989, CO-1990 |
| 330.2 (5% of income a year) | C: CO-2229, CO-213, CO-2224, CO-2231 |
| 330.3.A-D (no copayment for preventive services) | C: CO-2230 (`preventive`) |
| 330.4 (Prenatal Care Program clients exempt) | C: CO-1990 (reads CO-2407: F-08 holds, CO-184 matches) |
| 400.1 (may elect to enroll) | NA: election |
| 410.1-410.5 (MCO selection and changes) | NA: plan assignment |
| 420.1-420.2 (all eligible children enrolled, in the same MCO) | NA: enrollment administration with no eligibility condition |
| 430.1.A-B (effective on the later of the application month and the month eligible) | C: CO-4565, CO-707 (F-09 holds: RV2-CHPB August `ineligible_before_coverage_period`, November `eligible_child`) |
| 430.2 (12-month continuous eligibility from the application or authorization month) | C: CO-2404, CO-2402, CO-2403 |
| 430.2.A, A.i (without regard to changes; transition to Medicaid with a new period) | C: CO-707 order (Medicaid eligibility is reported as `ineligible_medicaid_eligible`); the new period is a stated start |
| 430.2.B.i-viii (exceptions; limited incarceration benefit) | C: CO-2404 (CO-2205's exceptions), CO-707 `eligible_incarceration_limited`. 440.4.C conflict recorded in CO-707 (F-19) |
| 430.3 (pregnant woman from the application month to the last day of the month 12 months after the birth; regardless of income changes) | C: CO-2407, CO-2406, CO-2405, CO-4565 |
| 430.3.A.i (ends if income is not verified by the end of the 90-day period) | OQ-813 |
| 430.4.A-B (MCO enrollment date by the 17th) | NA: plan enrollment date, not eligibility |
| 430.5, 430.5.A (newborn of a CHP+ mother guaranteed one year; birth reported) | C: CO-2410, CO-2408, CO-2409 (N-11). Reporting: NA |
| 440.1-440.3 (MCO disenrollment and change) | NA: plan administration |
| 440.4.A (fraud) | NA: a finding outside the volume |
| 440.4.B (other coverage ends coverage at renewal) | C: CO-090 ("at the time of application or redetermination") |
| 440.4.C (admission to an institution or a correctional facility) | C: CO-705, CO-706, CO-707 (F-19's precision) |
| 440.4.D (ineligibility) | C: CO-707 |
| 440.4.E (failure to comply with cost sharing "may" disenroll) | NA: discretionary; no stated condition |
| 440.4.F (no participating MCO in the county) | NA: plan availability |
| 440.5 (abusive or disruptive behavior) | NA: discretionary |

**Matrix size.** 299 rows:
- 28 definition rows, which group about 120 defined terms;
- 1 legal-basis row;
- 26 rows for § 8.100.3.A-F;
- 22 rows for G;
- 22 rows for H;
- 51 rows for I-R;
- 83 rows for § 8.100.4;
- 66 rows for 2505-3.

Dispositions:
- **Carried:** 231 rows (21 of them name a finding).
- **Not applicable:** 62 rows.
- **Open question only:** 2 rows.
- **GAP:** 4 rows.
  - New: N-05 (CHP+ Express Lane, P1).
  - Carried and still open, deferred P2s: F-16 (one row) and F-18 (two rows).

## 4. Open-question confirmations

I checked each family question for its class, and checked whether its "Checked" line covers what an allowed host serves.

| OQ | Class | Confirmation |
|---|---|---|
| OQ-200 emergency "otherwise eligible" routes | state policy choice | Confirmed. F.1.k and 1396b(v)(2) do not name the routes |
| OQ-204 family planning "household of two in addition" and the disregard | state policy choice | Confirmed. E.3 and G.8 read |
| OQ-213 five-year exemptions before October 2026 | needs Legal | Confirmed. The iii/iv text conflict is real, and Pub. L. 119-21 limits it to determination dates before 2026-10-01 |
| OQ-214 Cover All Coloradans postpartum | needs Legal | Confirmed. ix.1 against C.R.S. 25.5-5-201(6) |
| OQ-302 reasonable compatibility base | state policy choice | Confirmed. Both D-65 C.2.a.ii ("20%") and D-317 ("greater than 10%") leave the base unstated (D-317 line 53-58 read). N-08 notes that D-317 covers CHIP too |
| OQ-303 period for other documents | state policy choice | Confirmed |
| OQ-410, OQ-411, OQ-412, OQ-593 community engagement | state policy choice | Confirmed. § 8.100 (version 12735) still has no community engagement text |
| OQ-470 CHP+ copayment band gaps | state policy choice | Confirmed. § 320.1 states whole percentages |
| OQ-472 residency of the incapable institutionalized | needs Legal | Confirmed |
| OQ-510 payment limit by determination date | needs Legal | Confirmed |
| OQ-512 "MAGI needs standard" | state policy choice | Confirmed. The term is undefined in § 8.100.1-8.100.4 |
| OQ-514 aid codes | blocked on a named document | Confirmed. The CBMS aid code table is not on an allowed host |
| OQ-515 poverty guideline adoption date | blocked on a named document | Confirmed. The HCPF memo is on hcpf.colorado.gov only |
| OQ-517 transition under the payment limit | blocked on a named document | Confirmed |
| OQ-518 rule against the federal payment limit | needs Legal | Confirmed. D-65 version 12735 still lists the pre-Act categories |
| OQ-540 caretaker (CCCAP half) | state policy choice | Confirmed for the Medicaid half, which is resolved from S25 |
| OQ-550 SAVE status list | blocked on a named document | Confirmed. uscis.gov is not an allowed host |
| OQ-590 limited family planning presumptive eligibility household of two | state policy choice | Confirmed |
| OQ-592 two winnings receipts in a month | state policy choice | Confirmed |
| OQ-612 temporary absence | state policy choice | Confirmed. G.3.a lists absences without a limit |
| OQ-810 annualization period and scope | state policy choice | **Confirmed, with a gap in the check.** The Checked line lists § 8.100.4.C.4, 42 CFR 435.603(h) and D-317. It does not list Colorado's MAGI-based income methodology state plan page (template S10), which records the State's 435.603(h) budget-period elections. D-315 holds the eligibility-group pages only (S14, S25, S28, S30 and others). I tried medicaid.gov's SPA downloads `co-13-0030` to `co-13-0060` with suffixes `-mm` and `-mm1` to `-mm4`: only `co-13-0045-mm1` exists, and it has no S10. The web search tool was unavailable (out of credits). The class stands until S10 is found, but the Checked line should name the search |
| OQ-811 C.5 as a 435.603(i) substitution | state policy choice | Confirmed, with the same note as OQ-810 (S10) |
| OQ-812 sponsor income measure | state policy choice | Confirmed. K.1 and 8 U.S.C. 1631 state no measure |
| OQ-813 CHP+ income reasonable opportunity period | state policy choice | Confirmed. D-66 §§ 130.1 and 430.3.A.i conflict |
| OQ-50, OQ-513 (resolved), OQ-216, OQ-217, OQ-62, OQ-63 | resolved | Confirmed; the resolutions match the text read |

## 5. First-pass P1s (coverage round) and earlier P1s

| ID | Status | Evidence (engine at 6ba4501) |
|---|---|---|
| F-01 non-filer transitive walk | fixed | CO-180 matches (15 expectations). The filer arm still walks transitively: **N-03** |
| F-02 spouse living elsewhere | fixed | CO-181 matches (10) |
| F-03 sponsor deeming | fixed | CO-183 matches (6); CO-4551 derivation read |
| F-04 annualized income | fixed | CO-182 matches (9) |
| F-05 premium tax credit method | fixed | CO-182 matches; CO-4561 and CO-4564 derivations read |
| F-06 65th birthday month | fixed | RV2-65 (born 1961-11-05, $900): `adult` / `eligible`. The first birthday of a needy newborn has the same defect: **N-02** |
| F-07 inmates fully eligible | fixed | CO-554 derivation (`incarceration_limited` for any inmate meeting a category); CO-554-T91 to T93 present |
| F-08 CHP+ postpartum copayment | fixed | CO-184 matches (5); CO-1990 reads CO-2407 |
| F-09 CHP+ months before application | fixed | RV2-CHPB: August 2026 `ineligible_before_coverage_period`, November `eligible_child` |
| Earlier: F-1, F2-1 (pregnancy in retroactive months), F-2 (hospital presumptive eligibility status), F3-2 (CHP+ Title XIX), F3-3 (19th and 26th birthdays), F3-4 (TMA dependent child) | fixed (spot-check) | CO-565 and CO-566 derivations; CO-2439's status branch; CO-705 and CO-706 read CO-1176; CO-564 and CO-549 use the day-before idiom; CO-2430's dependent-child arm |

## 6. Probe households (scratch only)

| Probe | Shape | Engine | Rule |
|---|---|---|---|
| RV2-MEC | non-filer parent ($1,262, 69.98%), child aged 10 without minimum essential coverage | parent `none` / `ineligible_income` | `parent_caretaker` / `eligible` (64.98% after the disregard) |
| RV2-MECY | the same, child covered | `adult` / `eligible` | the same (control) |
| RV2-NB | baby born 2025-11-05 to a mother on Medical Assistance, household 170.0%, determined 2026-11-10 | `none` / `ineligible_income` (CHP+ `eligible_child`) | `needy_newborn` / `eligible` for November |
| RV2-DSP | filer ($1,500) claims daughter aged 20, whose filer husband ($2,500) lives in the home | filer household {p1, p2, p3}, 175.7%, `ineligible_income` | {p1, p2}, 83.2%, `adult` / `eligible` |
| RV2-RC | filer parent attests $2,615 (145.0%), data source $5,410 (300%); claimed child | compatible; no earned income verification; child `eligible` | not compatible (or ineligible on the attestation): explanation or documents |
| RV2-RCB | the same, data equal to the attestation | compatible, child `eligible` | the same (control) |
| RV2-ELE | child referred from a Free/Reduced Lunch application, opted in, declared 200.0% | `refer_to_single_streamlined_application` | automatic CHP+ enrollment (§ 180.1.A.2) |
| RV2-65 | born 1961-11-05, no Medicare, $900 | `adult` / `eligible` | the same (F-06 holds) |
| RV2-CHPB | child, application 2026-11-02, 205.2% | August `ineligible_before_coverage_period`; November `eligible_child`, `band_d` | the same (F-09 holds) |
