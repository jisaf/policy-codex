# Coverage review, third pass: MAGI Medicaid and CHP+ (family file `coverage3-medicaid-magi-chp`)

Reviewer pass: third exhaustive coverage matrix, 2026-11-22, on HEAD `4b8f2e1` (branch `ccr-9d19bf4c-wmnwcl`; 7b426b2 plus a docs-only snapshot commit). This pass follows the fix round recorded in docs/reviews/coverage2-medicaid-magi-chp.md ("Disposition (coverage pass 2)", code commit `b715ead`).

Governing texts:
- 10 CCR 2505-10 § 8.100.1 to § 8.100.4 (D-65, lines 19-2095), rule version 12735, effective 11/14/2026.
- 10 CCR 2505-3 (D-66), rule version 12687, effective 08/30/2026: § 50, §§ 100-180, §§ 300-330, §§ 400-440.

Out of scope: §§ 8.100.5 to 8.100.7 (non-MAGI reviewer). Rows of § 8.100.1 to § 8.100.3 that only define or route to those groups are "NA (non-MAGI)". CO-620 (Children's Buy-In, edited in the last round at the non-MAGI coordinator's request) is listed below as read but not re-verified.

**Method.**
- I built the matrix from the D-65 and D-66 text: § 8.100.4 and D-66 §§ 100-180 and 300-440 line by line; § 8.100.1 to § 8.100.3 paragraph by paragraph. I did not copy earlier rows.
- Scratch copy: `git archive HEAD`, `npm run export -- --volume co` (2,199 items). I rebuilt the excerpt index: 163 D-65/D-66 excerpts mapped to the items that cite them, and a second index of `8.100.3.x` and `2505-3 §` citations in meanings and precisions.
- I read the derivations of every item the fix rounds added or edited: CO-500, CO-501, CO-502, CO-503, CO-504, CO-539, CO-545 to CO-552, CO-554, CO-559, CO-563, CO-564, CO-620, CO-704 to CO-708, CO-1153 to CO-1155, CO-1401 to CO-1403, CO-1641, CO-1642, CO-1976, CO-1990, CO-2407, CO-2410, CO-2419, CO-2430, CO-2431, CO-2439, CO-2442, CO-3156, CO-4204, CO-4205, CO-4550 to CO-4568, CO-4790 to CO-4793. For each one I also checked the sibling paths that consume the same paragraph, since earlier P1s were regressions of that kind.
- Probes are scratch households built from the stored case CO-180 with the pass-2 generator. The generator is copied to `/tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cov3magi/gen/mk.py`; I added default facts for the non-MAGI gates. The specs are in `gen/all.json` in the same folder. Determination date: 2026-11-10. Application date: 2026-11-02. The 2026 poverty guidelines are $1,330.00 a month for one person, $1,803.33 for two and $2,276.67 for three.
- Each finding is labeled **common case or regression** or **rare edge combination**, as the brief asks.

## 1. Verdict

**4 P1 found.** The family does not meet the stopping rule.

All five second-pass P1s (N-01 to N-05) and all nine first-pass P1s (F-01 to F-09) stay fixed (section 5). No P1 is a regression of the last fix round. Three of the four P1s are in the limited Family Planning path, which shares paragraphs (C.2, C.4, E.3, G.8) with the fixed items but was not touched by the fixes:
- **C3-01 (common case).** Single adults between 138% and 180% FPL get no coverage at all. They are over the Adult limit, and the limited Family Planning floor ("greater than 133%") is tested on the enlarged household of E.3. That moves the same income below 133%. The approved state plan page for the group (S59) has no floor, and G.8 itself says the group is for "those not eligible for" full coverage. For a family of three the gap runs from 138% to 161%.
- **C3-02 (rare edge combination; the F-04 fix did not reach this path).** Limited Family Planning's income figure (CO-1153) reads the monthly household income. It skips the annualized budget period of C.4.a, which CO-4567 now gives every other MAGI test.
- **C3-03 (rare edge combination, on a common pathway).** Reasonable compatibility (CO-1402) tests attestations against the highest full-coverage standard. A Family Planning attestation is above that standard, so it is always "compatible". No income verification is asked, even when the data source reports far more than 260%.
- **C3-04 (rare edge combination).** A stepchild's income below the filing threshold is counted when the household holds the stepparent but not the legal parent. C.1.f.i excludes the child's income in the household of a "natural, adopted, or step parent". CO-4558 tests only the legal `child` role.

There are also 2 new P2 findings (C3-05, C3-08) and 3 new P3 findings (C3-06, C3-07, C3-09). The deferred P2s F-16 and F-18 are still open and are not counted again. Open questions are in section 4. OQ-204 needs the C3-01 point added, and the S10 note on OQ-810 and OQ-811 still stands.

## 2. Findings

P1: a wrong eligibility or benefit answer, a missing pathway, or a wrong or missing verification requirement. P2: a gap or mismatch with no answer effect in ordinary cases, or a reading that departs from the text without a record. P3: a note.

| ID | Pri | Label | Paragraph | Item(s) | Governing text | What is wrong | Proposed fix |
|---|---|---|---|---|---|---|---|
| C3-01 | **P1** | common case | 8.100.4.G.8, E.3; F.2.c and R.2.c (presumptive) | CO-1155 `ma_family_planning_income_in_band`, CO-1153, CO-1154; for presumptive eligibility CO-3152, CO-3155, CO-2439 | G.8: "household income is greater than 133% but does not exceed 260% ... available for those not eligible for a Medicaid eligibility category that provides full coverage"; E.3: "counted as a household of two in addition to any other household members"; state plan page S59 (D-315:2582, 42 CFR 435.214): "household income at or below a standard established by the state" | The floor is tested on the Family Planning figure, which has a household one larger (OQ-204). For one person, 133% of the two-person guideline is $2,398.43, which is 180.3% of the one-person guideline. So a single adult whose income is above 138% (133% plus the disregard) and at or below 180.3% is over the Adult limit and also "not greater than 133%" for Family Planning. Such a person gets `ineligible_income` from both determinations. For a family of three the gap is 138% to 160.6%. This is the ordinary population the group exists for. The approved state plan page (S59) sets no floor; the floor's stated purpose in G.8 is to exclude people with full coverage. OQ-204 records the size-plus-one reading and where the disregard applies, but not this effect. **RV3-FPH:** a single adult with wages of $1,995, which is 150.0% FPL. Engine: `ma_magi_eligibility_status` `ineligible_income`; Family Planning figure 110.6%, so `ma_family_planning_status` `ineligible_income`. The S59 reading and G.8's last sentence give `limited_family_planning`. | Test the floor on the full-coverage figure. That is either "not eligible for a full-coverage category" (CO-1176 already gates the group), or CO-504's figure above `ma_income_limit_adult_pct`. Keep the plus-one household for the 260% ceiling. If HCPF means the floor to apply to the enlarged household, record that in OQ-204, re-classed as needs Legal (a rule floor against the approved S59). Apply the same reading to CO-3152 and CO-3155 (OQ-590). Add RV3-FPH as a test. |
| C3-02 | **P1** | rare edge combination (an incomplete propagation of the F-04 fix) | 8.100.4.C.4.a; G.8 | CO-1153 `ma_family_planning_household_income_pct_fpl` | C.4.a: "Applicants who are found financially ineligible based on current or previous monthly household income ... and whose household has earned income from self-employment, seasonal employment, and/or commission-based employment, shall have their financial eligibility determined using annualized ... income" | CO-1153 divides `ma_magi_household_income` (CO-503, the monthly figure). It does not read the budget-period figure that F-04 added for every other MAGI test (CO-4559 and CO-4567, read by CO-504). A seasonal or self-employed applicant who is over the band in the current month, but in the band on annualized income, is denied Family Planning. **RV3-FPA:** a single self-employed adult (seasonal flag) with $6,000 this month and expected annual income of $36,000. Engine: Family Planning figure 332.7%, so `ineligible_income`. The annualized figure is $3,000, which is 166.4% on the Family Planning size, so `limited_family_planning`. Control RV3-FPM ($3,000 this month, same annual income): `limited_family_planning`. | In CO-1153, use the lower of `ma_magi_household_income` and `ma_annualized_household_income`, as CO-4567 does, over the Family Planning size. Add RV3-FPA as a test. |
| C3-03 | **P1** | rare edge combination, on a common pathway (pre-existing; outside N-04's fix) | 8.100.4.C.2.a.i-iii, C.2.b; G.8 | CO-1402 `ma_income_is_reasonably_compatible`, CO-1403, CO-1412 | C.2.a.ii: attested below "the applicable MAGI Medical Assistance program income standard" and data above it is compatible only "within the reasonable compatibility threshold percentage of 20%"; C.2.b: otherwise "a reasonable explanation ... [or] paper documentation" | CO-1402 compares against `ma_magi_highest_income_standard_pct` plus the disregard. That is the highest full-coverage standard; limited Family Planning's 260% is not considered. Every Family Planning applicant has attested income above that standard (that is why the person is in the band), so the first arm always makes the income compatible. The person is then granted Family Planning with no income verification, whatever the data source reports. **RV3-FPRC:** a single adult attests wages of $3,000 (166.4% on the Family Planning size, 225.6% on the MAGI size); the data source reports $8,000 (443.6%, 2.67 times the attestation), with an electronic match. Engine: compatible, `ma_requires_verification_of_earned_income` false, `limited_family_planning`. Rule: the applicable standard is 260%; the attestation is below it and the data is above it by far more than 20%, so the person must give an explanation or documents. Control RV3-FPRCB (data equal to the attestation): compatible, the same status. | Add a Family Planning test of compatibility. Compare the Family Planning figure and the data source on the Family Planning size against `ma_family_planning_income_upper_pct` plus the disregard, with the same three arms. Have CO-1403 read it when limited Family Planning is the coverage the person is found eligible for. Add RV3-FPRC as a test. |
| C3-04 | **P1** | rare edge combination | 8.100.4.C.1.f.i | CO-4558 `ma_magi_household_income_members` (and so CO-503, CO-4559, CO-504) | "The income of a child who is included in the household of their natural, adopted, **or step parent** will not be included in the household income unless that child has income above the tax filing threshold" | The exclusion arm tests `[has_relative_in, [child], ma_magi_household_members]`. That is the legal `child` role, which volume.yaml defines as natural or adopted, not step. The second arm (a dependent claimed by a non-parent, CO-563) treats a stepparent as a parent, so it does not catch this case either. A stepchild whose legal parent is not in the household (deceased or living elsewhere) has wages below the filing threshold counted. **RV3-STEP:** stepfather p1 (filer, wages $2,300) claims his stepchild p2 (16, wages $600, not required to file); the legal parent is not in the case. Engine: household income $2,900, 160.8%; p1 `ineligible_income`; p2 CHP+ `eligible_child`. Rule: $2,300, 127.5%; p1 `adult` / `eligible`; p2 `child` Medicaid. Control RV3-STEPN (a `parent` edge in place of `stepparent`): 127.5%, p1 `adult`, p2 `child`. CO-4558 was factored out of CO-503 unchanged in the F-04 round, so this is pre-existing. | Use `[has_relative_in, [child, stepchild], ma_magi_household_members]` (stepchild is the inverse of stepparent) in CO-4558, and say so in CO-503's precision. Add RV3-STEP as a test. |
| C3-05 | P2 | rare edge combination | 8.100.3.J.2, J.2.a | CO-500, CO-503 | J.2: "Any family member who is receiving financial assistance from SSI **or OAP-A** is not considered a member of the Medical Assistance required household, is not counted as a member of the household, and the individual's income and resources are disregarded"; J.2.a lifts this for MAGI for SSI recipients only | The MAGI household and income count an OAP-A recipient (for example a spouse aged 65 or older, under E.4) as a member and count that person's MAGI income, such as Social Security. That follows 42 CFR 435.603(f) and 1902(e)(14), which is the defensible reading. But it departs from J.2's text, and no `statute_override` or open question records the departure. The second pass marked J.2 as not applicable, on the ground that OAP payments are not MAGI income. That answers the income half of J.2 but not the membership half. | Add a `statute_override` on CO-500 (42 CFR 435.603(f) over § 8.100.3.J.2 for OAP-A recipients in a MAGI household), or record an open question. |
| C3-08 | P2 | rare edge combination | 8.100.4.C.4.a; 2505-3 § 320.1 | CO-4567 `ma_budget_period_household_income_pct_fpl`, CO-504; read by `chp_copayment_income_band` and CO-551 | C.4.a annualizes for "Applicants who are found financially ineligible based on current ... monthly household income" | CO-4567 always takes the lower of the monthly and annualized figures. So the annualized figure also applies where the monthly figure already makes the person eligible. That changes the CHP+ copayment band (§ 320.1: income "at the time of eligibility determination") and can change the MAGI category (Adult against Parent/Caretaker, which then feeds TMA's months in I.1.a). **RV3-CPB:** a self-employed seasonal parent with $4,328 this month (240.0% for two) and expected annual income of $34,624 (160.0%); the child is claimed. Engine: CHP+ `eligible_child`, `band_c`. On the monthly figure the child is CHP+-eligible and in `band_d`. OQ-810 records "reached only when the monthly figure is higher" but not this effect. | Add the copayment and category effect to OQ-810 for the owner. Or apply the annualized figure only where the monthly figure fails the test at hand. |
| C3-06 | P3 | rare edge combination | 2505-3 § 130.1; 8.100.4.C.2 | CO-1642 `chp_requires_verification_of_earned_income` | (as N-04) | The N-04 fix gave CO-1403 an arm that asks an earner to verify when any household member requesting coverage is not compatible. CO-1642 tests only the earner's own CHP+ compatibility, on the earner's own MAGI household. The answers differ only where the earner's household differs from the child's (for example, a child under non-filer rules whose claiming grandparent has wages). | Mirror CO-1403's member arm in CO-1642, or note the reading. |
| C3-07 | P3 | rare edge combination | 8.100.4.G.1, G.7; G.3 and 8.100.1 "Dependent Child" | CO-4790, CO-550, CO-4791 | G.7: "continuously eligible for one year"; dependent child "under the age of 18" | The "age on the last day of the month before" idiom counts a first or 18th birthday that falls on the 1st of the month as not yet reached for that month, although the child is past the limit on every day of it. **RV3-NB1:** a child born 2025-11-01 is `needy_newborn` in November 2026, after the year ended on 2026-10-31. The same holds for the 18th birthday under CO-4791. At 19, 26 and 65 the rule's "through the end of the month" wording makes the idiom exact. | Record the reading in CO-4790's precision, or use the age on the first day of the month for the "one year" and "under 18" limits. |
| C3-09 | P3 | n/a | 8.100.4.D.1 | CO-183, CO-545 to CO-548, CO-704, CO-1155, CO-4792 | D.1, D.1.a-b (excerpt S678) | The disregard paragraph is carried by these items, but no item cites S678. Only OQ-204's body does. This is a traceability gap only. | Cite S678 on CO-183. |

Carried, still open (not counted again): F-16 (P2, § 8.100.4.G.6.a's ending events for Legal Immigrant Prenatal) and F-18 (P2, § 8.100.3.K.7 Difficulty of Care). The deferral reasons in the pass-2 disposition still hold.

Checked and not a finding:
- CO-559 and CO-708 test a child's presumptive eligibility through the month of the 19th birthday, while F.2.b and § 170.1 say "under the age of 19". The reading is recorded in CO-559's precision (N-02 sweep) and follows G.2.a.
- CO-4560 builds the premium tax credit family as a closure over `tax_filer`, `tax_dependent` and `files_jointly_with` edges. That can over-reach only through a claimed dependent who claims others or files jointly, which the tax code bars.
- CO-1976's "both parents" counts legal parents only; this is consistent with E.1.c.ii as the volume reads it.

## 3. Coverage matrix

Key: **C** = carried by (the derivation was read; correct unless a finding is named). **NA** = not applicable, with the reason. **OQ** = open question. **GAP** = no item and no recorded reason.

### 3.1 § 8.100.1 Definitions (D-65:19-262)

| Definition | Disposition |
|---|---|
| Adult (19 through the end of the 65th-birthday month; no Medicare) | C: CO-548, CO-539, CO-552, CO-4550, CO-2439 |
| Children (through the end of the 19th-birthday month) | C: CO-564, CO-545 |
| Parent and Caretaker Relative | C: CO-547, CO-2606, CO-4791 |
| Pregnant Women ("less than 195%"; 12 months postpartum) | C: CO-546 (the G.5 "does not exceed" reading is recorded, N-09), CO-566, CO-560 |
| MAGI; Tax-Filer; Tax Dependent; Non-Filer | C: CO-500, CO-075, CO-076 |
| Adjusted Gross Income | C: CO-502, CO-080 |
| Caretaker Relative | C: CO-2606 (state plan S25). OQ-540 (CCCAP half only) |
| Dependent Child (under 18, or 18, a full-time student finishing by 19) | C: CO-4791 (in the month; C3-07 fixed: CO-4978), CO-544 (non-MAGI readers) |
| Dependent Relative | NA: no MAGI rule reads it (CO-4880 and CO-4622 are non-MAGI) |
| Medical Assistance Required Household | C: CO-4204, CO-2201. J.2's use of it: C3-05 fixed (statute_override on CO-500) |
| Application Date | C: CO-088 |
| Alien; Citizen; Legal Immigrant; Legal Immigrant Prenatal | C: CO-002, CO-509 (F-16 deferred) |
| Earned, Unearned and In-Kind Income | C for MAGI through C.1 (CO-502); the earned income disregards are NA (non-MAGI) |
| Difficulty of Care Payments | GAP, carried: F-18 (P2, deferred) |
| Electronic Data Source | C: CO-1344, CO-1589 |
| Employed | C: CO-2433, CO-2425 |
| FPL | C: `federal_poverty_guideline_annual_table`. OQ-515 |
| Good Cause | C: CO-2220 |
| Inpatient; Institution; Public Institution | C: CO-1105, CO-4566, CO-554 |
| Minimal Verification; Questionable | C: CO-1403 to CO-1409 |
| Minimum Essential Coverage | C: CO-085, CO-090 |
| Qualified Hospital Presumptive Eligibility Site | C: CO-2432 |
| Reasonable Compatibility; Reasonable Explanation | C: CO-1402 (C3-03 fixed: Family Planning arms, CO-4977), CO-1641 |
| Resident | C: CO-505, CO-2250 |
| Secondary School | C: CO-544, CO-4791 (via `is_full_time_secondary_student_finishing_before_nineteen`) |
| TMA | C: CO-2430, CO-4205 |
| Administrative and descriptive terms (SSAp, PEAK, CBMS, CDHS, CMS, CHP+, Client, Department, State Plan, EPSDT, FFP, Managed Care, Provider, Patient, Outpatient, Case Management, Categorically Eligible, Child Support Services, Good Cause for Child Support, Third Party, Title XIX, TANF, RRB, SSA, VA, Ex Parte Review, Complete Application, Eligibility Site, Insurance Affordability Program, Common Law Marriage) | NA: no condition (a common-law marriage is a stated `spouse` edge) |
| Non-MAGI terms (300% group, 1619b, AB, ABD, ABLE, AND, AFDC, AP-5615, annuity and burial terms, CSRA, community and institutionalized spouse, disability, dual eligible, FBR, HCBS, LTC terms, MMMNA, MIA, MSP, OAP, OASDI, PACE, PNA, SGA, SEP, SISC, SSI) | NA (non-MAGI) |

### 3.2 § 8.100.2 Legal Basis

| Para | Disposition |
|---|---|
| Authority paragraphs | NA: no condition |

### 3.3 § 8.100.3.A-F

| Para | Disposition |
|---|---|
| A.1 (advise; consider all categories) | C: CO-551, CO-554, CO-1176 |
| A.2, A.2.a (an ineligible SSAp is reviewed for CHP+ and the marketplace) | C: CO-707 runs alongside. Marketplace transfer: NA (a system interface) |
| A.3-A.11 (one form, signature, who may sign, no interview, hours, withdrawal) | NA: procedure |
| B.1 (county of residence; no durational residency or address) | C: CO-505. The county itself: NA (administration) |
| B.1.a (long-term care county of domicile) | NA (non-MAGI, county) |
| B.2 (resident definition) | C: CO-505, CO-2250 |
| B.2.a-d (institutionalized persons incapable of intent) | C: CO-2250, CO-2252 to CO-2257, CO-2282. OQ-472 |
| B.3.a-c (incapable of indicating intent) | C: CO-2251 |
| B.4 (residence retained; temporary absence) | C: `state_of_residence`. OQ-612 |
| B.5 (non-resident) | C: CO-505 |
| C.1-C.7 (county transfers) | NA: county administration |
| D.1.a-d (45 and 90 days; unusual circumstances) | NA: processing time |
| D.1.e (COVID maintenance of effort) | NA: expired |
| D.2 (extension to verify) | C: CO-2220, CO-1414 |
| D.3-D.7 (no waiting period; SSA appeals; voter registration) | NA: procedure |
| E.1 (three retroactive months; services received; requirements met) | C: CO-557, CO-4100, CO-4101, CO-2472; Pub. L. 119-21 sec. 71112 through CO-2449 to CO-2451 |
| E.2 (requested on the application or later) | C: CO-087, CO-4100 |
| F.1.a (MAGI groups and Family Planning) | C: CO-551, CO-1154 (C3-01 fixed: CO-1155 statute_override) |
| F.1.b-j, l-m (non-MAGI groups) | NA (non-MAGI) |
| F.1.k (meets a category but not citizenship: emergency only) | C: CO-1151, CO-554 (`emergency_only`). OQ-200 |
| F.1.n (COVID testing group) | NA: expired with the public health emergency |

### 3.4 § 8.100.3.G General and citizenship requirements

| Para | Disposition |
|---|---|
| G.1.a (resident) | C: CO-2250 |
| G.1.b.i.1-5 (patients, LTC residents, parolees, small community residences, community corrections) | C: CO-1105 with CO-4566 (F-15) |
| G.1.b.ii (inmates limited) | C: CO-554 `incarceration_limited` (F-07 holds: CO-554-T91 to T93) |
| G.1.c (IMD/TB unless under 21 or 65 and over in active treatment) | C: CO-1179 (N-12 reading recorded), CO-562 |
| G.1.d, f (financial and other requirements) | C: CO-551 through each category |
| G.1.e (disability or blindness) | NA (non-MAGI) |
| G.1.g.i-ii (citizens; pre-1996 lawful residents) | C: CO-509, CO-002 |
| G.1.g.iii-iv (LPRs and the five-year rule; exemptions) | C: CO-509, CO-1172, CO-2700 to CO-2704, CO-3033. OQ-213, OQ-518, OQ-510, OQ-517 |
| G.1.g.v (any-date categories incl. COFA) | C: CO-509, CO-1172 |
| G.1.g.vi (incorporation) | NA: incorporation note |
| G.1.g.vii (CHIPRA 214 lawfully residing pregnant women and children) | C: CO-507, CO-509 |
| G.1.g.viii (Afghan parolees) | C: CO-509, CO-2703, CO-2705 |
| G.1.g.ix (Cover All Coloradans) | C: CO-562, CO-1173, CO-2439, CO-558, CO-559. OQ-214 |
| G.2, G.2.a.i-ii (VLP/SAVE verification) | C: CO-1413 family, `claims_lawful_immigration_status` in CO-1412. OQ-550 |
| G.3.a.i-iv, G.3.c (reasonable opportunity period; benefits not delayed) | C: CO-1413, CO-1415, CO-2221 |
| Emergency and reproductive care regardless of status; emergency medical condition (S601, S602) | C: CO-1151, CO-1100, CO-1154 (reproductive health care program) |

### 3.5 § 8.100.3.H Citizenship and identity documentation

| Para | Disposition |
|---|---|
| H.1 (documentation at initial determination and renewal; exempt groups) | C: CO-1395, CO-3157, CO-1747 |
| H.2 (citizenship documents, all tiers) | C: CO-1306 `citizenship_verification_document_type` options, CO-1397 |
| H.3 (identity documents) | C: CO-1302, CO-1399 |
| H.4 (documentation requirements: originals, electronic matches, SSA) | C: CO-1395, CO-2211 to CO-2214 |
| H.5 (record retention) | NA: administration |
| H.6 (name change) | NA: procedure |
| H.7, H.8 (assistance to applicants) | NA: procedure |
| H.9 (reasonable opportunity period, 90 days) | C: CO-1413, CO-1415 |
| H.10 (good faith extension) | C: CO-1413, CO-2221 |

### 3.6 § 8.100.3.I-R

| Para | Disposition |
|---|---|
| I.1 (SSN or proof of application; exceptions) | C: CO-1401 (not for a needy newborn or emergency only), CO-1312, CO-2215, CO-3157 |
| I.2, I.3 (assignment of rights; third-party information) | NA: no eligibility effect modeled (a cooperation refusal is not a MAGI condition in the text) |
| I.4 (free choice of provider) | NA |
| J.1.a-d (choice between MAGI and SSI) | NA: the volume determines both |
| J.2 (SSI and OAP-A recipients outside the household) | C for income (OAP and SSI are not MAGI income, CO-502). Membership: C3-05 fixed, statute_override on CO-500 (42 CFR 435.603(f), S3682) |
| J.2.a (SSI recipients counted for MAGI) | C: CO-500, CO-502 |
| J.3 (AND payment not counted) | C: CO-502 does not read it |
| K.1 (sponsor income and resources) | C: CO-4551 to CO-4555, CO-503. OQ-812 |
| K.2-K.5 (income definitions; when received) | C for MAGI through C.1 (monthly facts) |
| K.6 (Home Care Allowance as earned income) | C: `wages_gross` |
| K.7 (Difficulty of Care) | GAP, carried: F-18 |
| K.8 (WIA) | C through the tax rules and C.1.f (as pass 2 read it; confirmed) |
| K.9, K.10 (self-employment) | C: CO-1703, CO-1704, CO-024; MAGI uses `self_employment_net_earnings_for_tax` |
| K.11 (unearned income definition) | C: CO-1714 and the income facts |
| K.12-K.14 (stimulus, FPUC, tax refunds, EITC, CTC) | NA: none is a MAGI income fact; FPUC and stimulus expired |
| L.1-L.2 (resources) | NA: no resource test for MAGI (L.1 names the ABD and LTC categories) |
| M.1-M.3 (FFP; SISC codes) | NA: funding. OQ-514 |
| N, O (confidentiality; non-discrimination) | NA |
| P.1-P.4 (redetermination; ex parte; forms) | NA: procedure (continuation recorded in docs/colorado-notes.md, F-14) |
| P.5 (reconsideration period) | C: CO-088 precision (stated as the application date) |
| Q.1 (12-month continuous eligibility for children; exceptions) | C: CO-561, CO-555, CO-2200 to CO-2205, CO-2448 |
| Q.1 incarceration (limited benefit; reinstatement) | C: CO-554, CO-2205 |
| Q.2 (period start; programs) | C: CO-556, CO-2446, CO-2447 |
| Q.3 (foster care exit to MAGI continuous eligibility) | C: CO-561 (`foster_care_exit`) |
| R.1 (who may apply at a qualified hospital) | C: CO-2432, CO-2433, CO-2438, CO-3154 |
| R.2.a-f (declared income and status by group) | C: CO-2439, CO-3151 to CO-3153, CO-2434. R.2.c: C3-01 fixed (CO-2439 statute_override; S59), OQ-590, OQ-204 |
| R.3, R.4, R.6, R.7 (certification; forwarding; appeals) | NA: procedure |
| R.5 (presumptive period) | C: CO-2439 outcome (date-scoped) |
| R.8, R.9 (not while enrolled; once per 12 months or per pregnancy) | C: CO-2435 to CO-2437 |

### 3.7 § 8.100.4 MAGI

| Para | Disposition |
|---|---|
| A.1, A.2 (SSAp only; other sites) | NA: procedure |
| A.3.a-b (EPSDT referral) | NA: procedure |
| B.1.a, a.i (SSN; COVID self-attestation ended) | C: CO-1401 |
| B.1.a.i.1 (status not met: emergency only) | C: CO-1151, CO-554 |
| B.1.b (citizenship and identity per H) | C: CO-1395 family |
| B.1.c (earned income: attested, electronically verified; documents without an SSN match; stubs) | C: CO-1403 (arm a), `earned_income_verified_by_electronic_data_source`. Stub rules: NA (evidence handling) |
| B.1.d (unearned income) | C: CO-1405 (`ma_requires_verification_of_unearned_income`) |
| B.1.e (immigration status through VLP; reasonable opportunity) | C: CO-1412, CO-1413 |
| B.2-B.4 (no other verification unless questionable; document it; reuse records) | C: the `*_attestation_is_questionable` facts. B.3, B.4: NA |
| B.5, B.6 (age, relationship, living in the home, if questionable) | C: CO-1406 to CO-1409 (age and household composition verification) |
| C.1 (26 U.S.C. 61 gross income) | C: CO-502 |
| C.1.a.i-vi (earned income) | C: CO-502 (`wages_gross`, `self_employment_net_earnings_for_tax`, `magi_other_taxable_income`) |
| C.1.b.i-xiii (unearned income) | C: CO-502, CO-1714, CO-079, `social_security_income`, `pension_income`, `tax_exempt_interest` |
| C.1.b.xiv.1-3 (winnings spread over months) | C: CO-1187, CO-503. OQ-592 |
| C.1.b.xiv.4 (household members: month received only) | C: CO-503 |
| C.1.b.xiv.5.a-b (hardship exemption) | C: `ma_lottery_winnings_hardship_exemption_granted`, CO-2222 |
| C.1.b.xv.1-2 (discharged student loans) | C: CO-1190, CO-1188, CO-1189 |
| C.1.c.i-iii (tax-exempt interest, foreign wages, Title II) | C: CO-502 |
| C.1.d.i-ix (exclusions) | C: CO-502 reads none of them (lump sums are monthly receipts; SSI, VA, workers' compensation, child support not read); AI/AN exclusions through the stated taxable facts |
| C.1.e.i-xv (allowable deductions) | C: CO-080 `pretax_deductions` |
| C.1.f.i, f.i.1 (child's income in a parent's household) | C: CO-4558, CO-4568 (F-17 holds). C3-04 fixed (stepchild role) |
| C.1.f.ii, f.ii.1 (other tax dependents) | C: CO-4558, CO-563 |
| C.1.f.iii (a child not living with a parent counts own income) | C: CO-4558 (the summing household) |
| C.2 (reasonable opportunity, 30 days) | C: CO-1413, CO-1414. CHP+: OQ-813 |
| C.2.a.i-iii (reasonable compatibility arms) | C: CO-1402, CO-1641 (N-04 and N-08 hold). OQ-302. C3-03 fixed (Family Planning arms), C3-06 fixed (CO-1642 member arm) |
| C.2.b, b.i (explanation, then documents) | C: CO-1403, CO-1642 |
| C.3 (self-employment ledger) | C: CO-1403 arm c (questionable only) |
| C.4 (monthly budget) | C: CO-503, CO-504 |
| C.4.a (annualized income) | C: CO-4556, CO-4557, CO-4559, CO-4567. OQ-810. C3-02 fixed (CO-4975, read by CO-1153 and CO-4567), C3-08 recorded in OQ-810 |
| C.5 (premium tax credit income below 100%) | C: CO-4560 to CO-4564, CO-504. OQ-811 |
| D.1 (5-point disregard) | C: CO-183, CO-545 to CO-548, CO-704, CO-1155, CO-1402, CO-1641, CO-3156, CO-4792 (C3-09 fixed: CO-183 cites S678) |
| D.1.a (for each qualifying program, as the last step) | C: `statute_override` to 435.603(d)(4) on CO-545 to CO-548 (N-06 holds); CO-539 (N-01 holds) |
| D.1.b (no disregard when under the threshold) | C: the first arm of each category item |
| E.1 (relationship to the tax filer as declared) | C: CO-500 |
| E.1.a.i-iii (filer household) | C: CO-500 filer arm, single steps (N-03 holds; CO-204) |
| E.1.b.i-iv (claimed dependent household) | C: CO-500 dependent arm |
| E.1.c.i-iii (exceptions to non-filer rules) | C: CO-1976, CO-563, `ma_custodial_parent` |
| E.1.d.i-iv (non-filer household) | C: CO-500 non-filer arm (F-01 holds; CO-180) |
| E.2 (pregnant woman counted with the expected children) | C: CO-501 |
| E.3 (Family Planning counted as two in addition) | C: CO-1153, CO-3029. OQ-204 (now needs Legal). C3-01 fixed (CO-4976 states the size) |
| E.4 (married couples living together) | C: CO-500 (F-02 holds; CO-181) |
| E.5 (child of separated parents filing jointly) | C: CO-1976, CO-500 |
| E.6 (tax dependent and filer: dependent) | C: CO-500 (the filer arm requires not claimed) |
| F.1 (presumptive groups: pregnant, child, Family Planning) | C: CO-558, CO-559, CO-3155 |
| F.2.a (pregnant: attested, 195%, status unless ix) | C: CO-558 (N-10 reading recorded) |
| F.2.b (child under 19, 142%) | C: CO-559 (birthday-month reading recorded) |
| F.2.c (Family Planning presumptive, over 133% to 260%, not full coverage, counted as two) | C: CO-3155, CO-3152. OQ-590. C3-01 fixed (statute_override on CO-3155; full-coverage groups read from the declarations) |
| F.3, F.4, F.6, F.7 (certification; forwarding; appeals) | NA: procedure |
| F.5 (presumptive period) | C: date-scoped outcomes |
| F.8, F.9 (not while enrolled; once per 12 months or per pregnancy) | C: CO-558, CO-559, CO-3155, CO-2435 to CO-2437 |
| G.1 (eligible any time in the month, whole month) | C: CO-564, CO-4550, CO-4790, CO-4791, CO-550 (N-02 holds; CO-203). C3-07 fixed (CO-4978 for the under-1 and under-18 limits) |
| G.2, G.2.a (children 142%; through the 19th-birthday month) | C: CO-545, CO-564, CO-191 |
| G.3 (parents and caretakers 68%; dependent child in the household) | C: CO-547, CO-192, CO-2606, CO-4791 |
| G.3.a.i-vi (child considered living in the home) | C: `ma_caretaker_relative_of` (CO-2606) as stated; the absences are read through the stated household. OQ-612 |
| G.4 (adults 133%, parents over 68% included) | C: CO-548, CO-193, CO-551 order |
| G.4.a (dependent child must have minimum essential coverage) | C: CO-548, CO-552, CO-539 (N-01 holds; CO-202) |
| G.4.b (COVID testing) | NA: expired |
| G.5 (pregnant 195%; application through the 12th month after the pregnancy ends; regardless of changes) | C: CO-546, CO-566, CO-560, CO-565, CO-3601 |
| G.5.a.i (ends on failure to verify income in the reasonable opportunity period, first time only) | C: CO-566 (start-month pending check), CO-1624 |
| G.6 (Legal Immigrant Prenatal) | C: CO-509 vii arm |
| G.6.a.i-viii (ending events) | GAP, carried: F-16 (P2, deferred); ii and iv carried (CO-554, CO-505) |
| G.7 (Eligible Needy Newborn, one year; retroactive; need not live with the mother) | C: CO-550, CO-4790, `mother_was_enrolled_in_medicaid_at_birth`, CO-4978. C3-07 fixed |
| G.7.a (birth reported) | NA: procedure (the report is the case being stated) |
| G.8 (Family Planning over 133% to 260%; residency and status; no full coverage) | C: CO-1154, CO-1155, CO-1153, CO-1176. OQ-204 (needs Legal). C3-01, C3-02, C3-03 fixed (CO-4975 to CO-4977, CO-4979; CO-226, CO-227) |
| H.1.a (psych/LTC under 21; extended at 21 in treatment; MAGI needs standard) | C: CO-2419 (CO-4790 ages). OQ-512 |
| H.1.b-g (foster care, independent living, Alternatives to Foster Care, county custody, subsidized adoption, responsibility at 18 to 21) | C: CO-2419, CO-2414 to CO-2418, CO-2847, CO-3028 |
| H.2.a, a.i-iii (former foster care to the 26th-birthday month; exclusions; out of state from 2023) | C: CO-549, CO-2420, CO-2421, CO-2853, CO-3025, CO-095 |
| H.2.b (no income or resource test) | C: CO-549 reads no income |
| H.2.c (former foster youth's newborn is a needy newborn) | C: CO-550 (the mother is enrolled) |
| I.1, I.1.a-b, b.i (TMA 12 months; three of six months as Parent/Caretaker; earnings; employed caretaker) | C: CO-4205, CO-2430, CO-2422 to CO-2429, CO-2860 |
| I.2, I.2.a-b (members joining; children and others losing eligibility at redetermination) | C: CO-2430 (second arm), CO-4204 |
| I.3 (dependent child required; ends at the end of the month) | C: CO-4205 with CO-4791 (N-07 partly fixed; the moving-out reading is recorded in the precision) |
| I.4 (reassessment when TMA ends) | C: CO-551 order (TMA after the other categories) |
| I.5, I.5.a (four-month extension for support income; alimony) | C: CO-2431, CO-2427 |
| J preamble; J.1.a.i-vi (Free/Reduced Lunch application) | C: CO-2442, CO-3156, CO-2440, CO-2441, CO-2443, CO-2445, CO-3151 |
| J.1.b.i-ii (automatic lunch recipients not forwarded) | C: CO-2440 |
| J.2.a.i-vii (SNAP or Colorado Works application) | C: CO-2442, CO-2440, CO-2444 |

### 3.8 10 CCR 2505-3 (CHP+)

| Para | Disposition |
|---|---|
| 50.1-50.2, 50.4-50.5, 50.8-50.12, 50.15, 50.17 (administrative definitions) | NA |
| 50.3 Child (under 19) | C: CO-564 (through the birthday month; CO-705 precision, F-26) |
| 50.6 Dependent child | C: CO-4791 (read through § 8.100.4) |
| 50.7 Effective Date | C: CO-4565, CO-2472 |
| 50.13 Household (per § 8.100.4.E) | C: CO-500 |
| 50.14 Income (per § 8.100.4.C) | C: CO-504 |
| 50.16 Presumptive Eligibility | C: CO-708 |
| 50.18 Unearned income; 50.19 Woman | C: CO-502; CO-706 (pregnancy, not age) |
| 110.1.A.1-2 (under 19, or pregnant) | C: CO-705, CO-706 |
| 110.1.B.1-4 (citizens and qualified categories) | C: CO-2706, CO-2707, CO-2701, CO-2702, CO-2704, CO-002 |
| 110.1.B.5.a-n (CHIPRA 214 lawfully residing) | C: CO-2706, CO-2707 |
| 110.1.B.5.o, o.1 (Cover All Coloradans exception; confidentiality) | C: CO-2707, CO-1173, CO-705, CO-706. o.1: NA |
| 110.1.C.1-3 (VLP; reasonable opportunity; CAC exemption) | C: CO-1416 count, CO-2219. OQ-813 |
| 110.1.D (resident; temporary absence) | C: `is_colorado_resident`. OQ-612 |
| 110.1.E (children over 142% to 260%) | C: CO-704 (with the disregard, § 150.2) |
| 110.1.F (pregnant over 195% to 260%) | C: CO-704 |
| 110.1.G (incomplete application denied) | C: CO-1416 to CO-1418 (`chp_verification_status`) |
| 120.1.A (group coverage, except COBRA) | C: `chp_has_other_health_coverage` |
| 120.1.B (Title XIX eligible) | C: CO-705, CO-706, CO-707 read CO-1176 (F3-2 holds) |
| 120.1.C (inmate or IMD patient; reentry 90 days) | C: CO-705, CO-706, CO-1105, CO-1104, CO-1749 |
| 120.2 (no uninsured period) | C: no waiting-period item exists |
| 130.1 (minimal verification per § 8.100.4.B) | C: CO-1416, CO-1641, CO-1642, CO-2219, CO-3634 (C3-06 fixed) |
| 140.1, 140.1.A.1-6, 140.1.B.1-2 (redetermination, ex parte, reconsideration) | NA: procedure; B.2's effective date through CO-088 (F-14) |
| 150.1 (income per § 8.100.4.C) | C: CO-504 (C3-08: the copayment band reading recorded in OQ-810) |
| 150.2 (disregard per § 8.100.4.D) | C: CO-704, CO-1641, CO-4792 |
| 170.1.A-C (presumptive: child over 142% to 260%; pregnant over 195% to 260%; status) | C: CO-708, CO-3151, CO-092 |
| 170.2, 170.2.A, 170.4, 170.4.A-B (certification; forwarding; 45 days; appeals) | NA: procedure |
| 170.3 (presumptive period) | C: date-scoped outcome |
| 170.5, 170.6 (not while enrolled; once per 12 months or per pregnancy) | C: CO-708, CO-2435 to CO-2437 |
| 180 preamble; 180.1.A.1-6; 180.1.B.1-2; 180.2.A, A.1-6 (CHP+ Express Lane) | C: CO-4792, CO-4793 (N-05 holds: RV2-ELE re-run, CO-4792 true; CO-4793-T1) |
| 210 and the rest of 200 (benefits) | NA: benefit package, no eligibility condition |
| 300, 310 (enrollment fee repealed) | C: CO-213 (no fee) |
| 320.1.A-D (copayments by band and service) | C: CO-2223, CO-2225 to CO-2228, CO-2230, CO-3009 to CO-3012, `chp_copayment_income_band`. OQ-470, OQ-810 (C3-08 recorded) |
| 320.1.C.3, D.3 (COVID lab copayments waived) | C: CO-2230, CO-3009 to CO-3012 |
| 330.1 (AI/AN exempt) | C: CO-1989, CO-1990 |
| 330.2 (5% yearly maximum) | C: CO-2224, CO-2229 |
| 330.3.A-D (no copayment for preventive services) | C: CO-2223, CO-2230, CO-3009 to CO-3012 |
| 330.4 (prenatal clients exempt) | C: CO-1990, CO-2407 (F-08 holds; CO-184) |
| 400.1 (elect to enroll) | NA: election, no eligibility effect |
| 410.1-410.5 (MCO selection) | NA: plan assignment |
| 420.1-420.2 (all eligible children enrolled, same MCO) | NA: enrollment administration (each child is determined individually) |
| 430.1.A-B (effective the later of the application month and the month eligible) | C: CO-4565, CO-707 (F-09 holds: RV2-CHPB re-run) |
| 430.2, A, A.i, B.i-viii (continuous eligibility; exceptions; incarceration-limited) | C: CO-2402 to CO-2404, CO-707 |
| 430.3, 430.3.A.i (prenatal span to the end of the 12th month; 90-day reasonable opportunity) | C: CO-2405 to CO-2407. OQ-813 |
| 430.4.A-B (MCO enrollment dates) | NA: plan enrollment timing |
| 430.5, 430.5.A (newborn guaranteed one year; birth reported) | C: CO-2408 to CO-2410 (N-11 reading recorded), CO-4565 |
| 440.1-440.3, 440.5 (MCO disenrollment) | NA: plan administration |
| 440.4.A-F (program disenrollment) | C: C (institution, CO-707), D (ineligibility, CO-707), B (other coverage at renewal, `chp_has_other_health_coverage`). A, E, F: NA (conduct, cost-sharing compliance and MCO availability are not determination facts) |

Matrix size: 229 rows. By section: 29 for § 8.100.1-8.100.2, 75 for § 8.100.3, 77 for § 8.100.4 and 48 for D-66. Every numbered paragraph and subparagraph of the in-scope text is covered; document lists and runs of procedure paragraphs are grouped where one disposition covers them. Every row has a disposition. The only GAP rows are F-16 and F-18 (carried) and the four P1s above, which sit inside carried rows.

## 4. Open-question confirmations

| OQ | Class | Confirmation |
|---|---|---|
| OQ-200 emergency "otherwise eligible" | state policy choice | Confirmed. F.1.k and 1396b(v) do not name the routes |
| OQ-204 Family Planning household of two and the disregard | state policy choice | **Confirmed for what it states, but incomplete.** It does not record that the plus-one household also moves the 133% floor, which leaves a group with no coverage (C3-01). If the floor stays on the enlarged household, the class should be needs Legal: the rule's floor conflicts with the approved S59 page (D-315), which has none |
| OQ-213 five-year exemptions before October 2026 | needs Legal | Confirmed |
| OQ-214 Cover All Coloradans postpartum | needs Legal | Confirmed |
| OQ-302 reasonable compatibility base | state policy choice | Confirmed (D-65 C.2.a.ii and D-317 leave the base unstated) |
| OQ-303 period for other documents | state policy choice | Confirmed |
| OQ-410, OQ-411, OQ-412, OQ-593 community engagement | state policy choice | Confirmed. Version 12735 has no community engagement text |
| OQ-470 CHP+ copayment band gaps | state policy choice | Confirmed. § 320.1 states whole percentages |
| OQ-472 residency of the incapable institutionalized | needs Legal | Confirmed |
| OQ-510, OQ-517, OQ-518 federal payment limit | needs Legal / blocked | Confirmed |
| OQ-512 "MAGI needs standard" | state policy choice | Confirmed. Undefined in § 8.100.1-8.100.4 |
| OQ-514 aid codes | blocked on a named document | Confirmed. The CBMS table is not on an allowed host |
| OQ-515 poverty guideline adoption date | blocked on a named document | Confirmed. The memo is on hcpf.colorado.gov only |
| OQ-540 caretaker (CCCAP half) | state policy choice | Confirmed. The Medicaid half is resolved from S25 |
| OQ-550 SAVE status list | blocked on a named document | Confirmed. uscis.gov is not an allowed host |
| OQ-590 Family Planning presumptive household of two | state policy choice | Confirmed. The C3-01 floor point applies to it as well |
| OQ-592 two winnings receipts in a month | state policy choice | Confirmed |
| OQ-612 temporary absence | state policy choice | Confirmed |
| OQ-810 annualization period and scope | state policy choice | Confirmed. The S10 page is still not found. Web search was unavailable this pass too: the Firecrawl search call returned "insufficient credits". C3-08 asks for the copayment and category effect to be added to the body |
| OQ-811 C.5 as a 435.603(i) substitution | state policy choice | Confirmed, with the same S10 note |
| OQ-812 sponsor income measure | state policy choice | Confirmed |
| OQ-813 CHP+ income reasonable opportunity period | state policy choice | Confirmed. § 130.1 and § 430.3.A.i conflict |
| OQ-50, OQ-513, OQ-216, OQ-217, OQ-62, OQ-63 | resolved | Confirmed; the resolutions match the text |

No question is misclassified as blocked when an allowed host serves the document. The one stopping-rule issue is OQ-204's missing floor effect (C3-01).

## 5. Earlier P1s

| ID | Status | Evidence (engine at 4b8f2e1) |
|---|---|---|
| N-01 MEC and the disregard | fixed | CO-202 matches (5 of 5); CO-539's adult arm read |
| N-02 needy newborn's birthday month | fixed | CO-203 matches (4); RV2-NB re-run: `needy_newborn` (C3-07 is a separate edge for a birthday on the 1st) |
| N-03 filer household transitive walk | fixed | CO-204 matches (7); CO-500 filer and dependent arms read (single steps; the joint spouse's dependents included) |
| N-04 compatibility and the disregard band | fixed | CO-205 matches (4); CO-1402, CO-1403, CO-1641 read. Family Planning was outside its scope: C3-03 |
| N-05 CHP+ Express Lane | fixed | CO-4792 and CO-4793 read; RV2-ELE re-run: CO-4792 true |
| F-01 to F-05 | fixed | CO-180 to CO-183 match (15, 10, 9, 6). F-04's budget period did not reach Family Planning: C3-02 |
| F-06 65th-birthday month | fixed | RV2-65 re-run: `adult` / `eligible` |
| F-07 inmates | fixed | CO-554 read |
| F-08 CHP+ postpartum copayment | fixed | CO-184 matches (5) |
| F-09 CHP+ months before application | fixed | RV2-CHPB re-run: August `ineligible_before_coverage_period`, November `eligible_child` |
| Earlier F-1, F2-1, F-2, F3-2, F3-3, F3-4 | fixed (spot-check) | CO-565, CO-566, CO-2439, CO-705 to CO-707 (read CO-1176), CO-564, CO-2430 read |

In all, 69 stored expectations were re-run with 0 mismatches.

## 6. Probe households (scratch only)

| Probe | Shape | Engine | Rule |
|---|---|---|---|
| RV3-FPH | single adult, wages $1,995 (150.0%) | MAGI `ineligible_income`; Family Planning `ineligible_income` (110.6% on size 2) | `limited_family_planning` (C3-01) |
| RV3-FPA | single self-employed seasonal adult, $6,000 this month, $36,000 a year | Family Planning 332.7%, `ineligible_income` | annualized 166.4%: `limited_family_planning` (C3-02) |
| RV3-FPM | the same annual income, $3,000 this month | `limited_family_planning` | the same (control) |
| RV3-FPRC | single adult attests $3,000, data source $8,000 | compatible; no earned income verification; `limited_family_planning` | not compatible at 260%: explanation or documents (C3-03) |
| RV3-FPRCB | the same, data source $3,000 | compatible | the same (control) |
| RV3-STEP | stepfather filer ($2,300) claims his stepchild of 16 ($600, below the filing threshold); the legal parent is not in the case | 160.8%; p1 `ineligible_income`; p2 CHP+ | 127.5%; p1 `adult`; p2 `child` Medicaid (C3-04) |
| RV3-STEPN | the same with a `parent` edge | 127.5%; p1 `adult`; p2 `child` | the same (control) |
| RV3-CPB | seasonal self-employed parent, $4,328 this month (240%), $34,624 a year (160%); claimed child | CHP+ `eligible_child`, `band_c` | `band_d` on the monthly figure (C3-08) |
| RV3-NB1 | child born 2025-11-01 to a mother on Medical Assistance | `needy_newborn` in November 2026 | the year ended 2026-10-31 (C3-07) |
| RV2-ELE, RV2-MECY, RV2-65, RV2-CHPB, RV2-NB (re-run as RV3-R2*) | as in pass 2 | as in the pass-2 fixed results | the same |

## Disposition (coverage pass 3)

Fix round, 2026-11-22, code commit `439c95e` on the fix worktree branch (base `dbb1159`). Texts re-read: § 8.100.4.G.8, E.3, C.1.f.i, C.2, C.4.a, D.1, F.2.c, G.7 and § 8.100.3.J.2, R.2.c (D-65, rule version 12735, effective 11/14/2026); Colorado State Plan page S59 (D-315:2574-2584); 42 CFR 435.214 (D-32; the eCFR text current on 2026-11-22 is the same) and 435.603(f), (k) (D-34). New excerpts S3680 (435.214(b)-(c)), S3681 (S59), S3682 (J.2, J.2.a). New items CO-4975 to CO-4979. No new open question; OQ-204, OQ-590 and OQ-810 updated.

| ID | Pri | Disposition |
|---|---|---|
| C3-01 | P1 | **Fixed** (`439c95e`). The conflict is real: S59 covers individuals "who are not pregnant, and have household income at or below a standard established by the state", with no floor, and 435.214(c) makes the standard the one "established in the State plan"; G.8's floor on E.3's enlarged household excludes people S59 covers. The volume follows the state plan: ma_family_planning_income_in_band (CO-1155) tests only the 260% ceiling (plus the disregard), with a statute_override note; G.8's "not eligible for ... full coverage" is applied by CO-1154's order. Presumptive: CO-2439 drops the floor (the full-coverage groups are tested first) and CO-3155 reads F.2.c's full-coverage exclusion from the declarations (a child at or below the Children's standard, an adult at or below the Adults standard), each with a statute_override. CO-1131 (the floor) is no longer read. OQ-204 records the effect and is re-classed needs Legal (rule against approved state plan); OQ-590 notes it. Stored case CO-226 (RV3-FPH). |
| C3-02 | P1 | **Fixed** (`439c95e`). The budget-period amount (lower of monthly and annualized, C.4.a) is now its own item, ma_budget_period_household_income (CO-4975), factored out of CO-4567 unchanged; CO-1153 divides it, so Family Planning reads the same income figure as every other MAGI test. RV3-FPA: 332.7% `ineligible_income` → 166.4% `limited_family_planning`; control RV3-FPM unchanged. Rule test CO-1153-T3. |
| C3-03 | P1 | **Fixed** (`439c95e`). ma_income_is_reasonably_compatible (CO-1402), the one item CO-1403 reads, now applies its three C.2.a arms a second time at the Family Planning standard, on the category's own figures: the attested CO-1153 and the data source on the same size (new CO-4977; the enlarged size CO-4976 and its monthly guideline CO-4979 are shared with CO-1153). Compatible only when compatible at both. Stored case CO-227 (RV3-FPRC); control RV3-FPRCB stays compatible. |
| C3-04 | P1 | **Fixed** (`439c95e`). CO-4558 tests `[has_relative_in, [child, stepchild], ...]`; CO-503's precision says so. Stored case CO-228 (RV3-STEP); control RV3-STEPN unchanged. Rule test CO-4558-T5. |
| C3-05 | P2 | **Fixed** (`439c95e`). statute_override on CO-500: 42 CFR 435.603(f) (S162) over § 8.100.3.J.2 (S3682) for an OAP-A recipient in a MAGI household; J.2.a names SSI only. No answer change. |
| C3-08 | P2 | **Recorded** in OQ-810 (the reviewer's first proposed fix): the lower-of-two figure applies to every test, the CHP+ copayment band (RV3-CPB: `band_c`, `band_d` on the monthly figure) and the Adults/Parent category included; the other reading of "Applicants who are found financially ineligible" is stated with its effect, and the Assumption now names the band. Not changed in code: which reading is right is the owner's policy choice under OQ-810, and the codex keeps C.4.a's per-test order. CO-2228 now lists OQ-810. |
| C3-06 | P3 | **Fixed** (`439c95e`). CO-1642 mirrors CO-1403's member arm (an earner is asked when a member of the earner's household requesting coverage is not compatible at that member's CHP+ standard). Rule test CO-1642-T4. No stored value moved. |
| C3-07 | P3 | **Fixed** (`439c95e`). New ma_age_on_first_day_of_determination_month (CO-4978), exact for "under N" limits with G.1's whole month; CO-550 (needy newborn, under 1) and CO-4791 (dependent child, under 18) read it. CO-4790 stays for the "through the end of the month" limits (19, 65). RV3-NB1: `needy_newborn` → not (child at 170%: CHP+ `eligible_child`); RV2-NB (born 2025-11-05) still `needy_newborn`. CO-2419 and CO-620 (non-MAGI, under-21 and Buy-In ages) also read CO-4790; not changed here, outside this family. |
| C3-09 | P3 | **Fixed** (`439c95e`). CO-183 cites S678. |
| F-16, F-18 | P2 | Carried, unchanged: the pass-2 deferral reasons hold. |

**Stored cases added** (hand derivations in the case comments):
- CO-226 (RV3-FPH): single adult, wages $1,995: MAGI 1,995 / 1,330.00 = 150.0%, `ineligible_income`; Family Planning size 2: 1,995 / 1,803.33 = 110.6% ≤ 260% + 5: `limited_family_planning` (was `ineligible_income`); data equal, compatible, no documentation.
- CO-227 (RV3-FPRC): attests $3,000 (225.6%; 166.4% on size 2), data $8,000 (443.6% on size 2, above 265% and above 166.4% × 1.2 = 199.6%): not compatible (was compatible); earned income documentation required and pending.
- CO-228 (RV3-STEP): stepfather $2,300, stepchild 16 $600 not required to file: income 2,300 / 1,803.33 = 127.5%; p1 `adult` / `eligible` (was `ineligible_income` at 160.8%), p2 `child` / `eligible`, CHP+ `ineligible_medicaid_eligible` (was CHP+ `eligible_child`).

**Changed expectations** (old → new):
- CO-01 and CO-02 p2 `ma_family_planning_status`: `ineligible_income` → `limited_family_planning`. p2 is 81, on Medicare, not fully covered, not pregnant: Family Planning size 1 + 2 - 1 = 2, 1,180 / 1,803.33 = 65.4%, within 260% after the disregard; with no floor (S59) the group applies.
- Rule tests: CO-1155-T2 (133%: false → true), CO-2439-T10 ($1,900 alone, 1.054 on size 2: none → `limited_family_planning`), CO-2439-T16 (66-year-old, 0.9: none → `limited_family_planning`; still not adult), CO-3155-T3 (given a date of birth; still false, now because the Adults standard applies on the declaration). CO-1402-T1 to T8 now state the Family Planning figures (0.75 of the MAGI figures), answers unchanged.
- UI pins: departures 35 → 39 (CO-1155, CO-2439, CO-3155, CO-500); CO-191 read by 24 → 25 households (CO-228) and reaches 39 → 42 (CO-226 to CO-228).

**Re-run, before and after** (every stored case, 125 before; every Medicaid and CHP+ outcome plus the income, band, compatibility and verification items for every person, and all 13 probes): stored expectations 3,228/3,228 before; 3,255/3,255 after (27 new, 2 re-pinned). The probes move exactly as the review's "Rule" column says (RV3-FPH, FPA, FPRC, STEP, NB1), the controls RV3-FPM, FPRCB, STEPN and the pass-2 re-runs RV3-R2* keep their status values, and RV3-CPB keeps `band_c` (C3-08 recorded, not changed). Unpinned values that moved in stored cases, all explained by the fixes: `ma_family_planning_status` `ineligible_income` → `limited_family_planning` for CO-152 p2, CO-153 p1 and p2, CO-154 p2, CO-188 p2 and CO-204 p3 (C3-01: not fully covered, at or below 133% on size plus one); CO-182 p1's Family Planning ratio 166.4% → 55.5% (C3-02, annualized; status unchanged); `ma_income_is_reasonably_compatible` true → null for 47 person-months in 26 cases and `ma_requires_verification_of_earned_income` false → null for 14 (C3-03: attestation above the full-coverage standard but within Family Planning's, and the case states no data source figure), which reaches one outcome, CO-76 p1 `ma_earned_income_verification_is_pending` false → null (the case is already incomplete: its Family Planning status was null before). Nothing else moved.

Checks: `node scripts/sync-manifest.mjs co`; governance 0 errors; `CHECK_BASE=origin/main npm run check` OK (conformance self-check OK); `npm run typecheck` clean; `npm test` 1,047/1,047.
