# Stakeholder review: HCPF (Health First Colorado and CHP+)

Reviewer: program manager, Colorado Department of Health Care Policy and Financing (HCPF), accountable for Health First Colorado (MAGI, non-MAGI/ABD, long-term care and HCBS waivers, PACE, Buy-In, MSP, emergency, BCCP, family planning and the Reproductive Health Care Program, OAP Health Care, Cover All Coloradans, community engagement from 2027) and CHP+.
Question asked: could I sign off on this codex as the statement of how my programs determine eligibility?
Date: 2026-11-21. Commit reviewed: `933ce0c` (branch `ccr-9d19bf4c-wmnwcl`). Phase 12, stakeholder review.

## Verdict

**No.** I could not sign off today. I could sign off on most of the MAGI and SSI-related arithmetic as written. But five problems would ship a wrong answer or leave no place for HCPF's approval:

1. From 2026-10-01 the immigrant-eligibility rules do not apply 42 U.S.C. 1396b(v)(5), which Pub. L. 119-21 sec. 71109 added. The text is already in the repo (D-70, lines 47-62), but no item cites it. Refugees, asylees and other qualified adults are still found fully eligible.
2. CHP+ has no continuous eligibility, no 12-month postpartum period and no CHP+ newborn coverage. The current rule text requires all three (10 CCR 2505-3 §§ 430.2, 430.3, 430.5, all in D-66).
3. The long-term care outcome chooses PACE before HCBS and nursing facility care by ordering alone. That puts the target household's nursing facility resident (CO-01 p1) in PACE.
4. Several eligibility pathways HCPF runs through CBMS are missing: foster care and subsidized adoption Medicaid, Transitional Medical Assistance, hospital presumptive eligibility for adults, and Express Lane.
5. Nothing in the repository lets HCPF approve an item. Items have no status, approval or effective fields. CODEOWNERS covers only `volumes/mwr`. Governance does not warn on the two unverified excerpts, although `docs/design-colorado.md` says it does.

Method: I read the orientation documents, every open Medicaid/CHP+ question, and 62 Medicaid/CHP+ items against their cited excerpts. Where it mattered I also read the fetched rule text (D-65, D-66, D-70, D-72, D-75). I recomputed CO-01, CO-06 and CO-72 by hand, checked CO-73, and ran `scripts/eval-case.ts`, `npm run governance -- --volume co` (0 errors, 1,473 warnings) and `npm run check` (co: 2,032/2,032 rule tests and 2,165/2,165 case expectations pass).

**Tags.** In this review, **[T]** means the gap or answer comes from the fetched text. **[K]** means it comes from my own knowledge of HCPF operations or recent federal law, and needs a citation before the codex can rely on it. I could not fetch hcpf.colorado.gov (it returns 403 here as well). My [K] statements are therefore what the codex must cite, not something it can quote from me.

---

## 1. Coverage: is every pathway HCPF runs through PEAK/CBMS represented?

### Represented

| Pathway | Items |
|---|---|
| MAGI: needy newborn, children (142%), pregnant (195%), parents/caretakers (68%), adults (133%), former foster care | CO-500–CO-566 |
| MAGI 5% disregard; retroactive coverage; 12-month postpartum coverage | CO-539, CO-557, CO-560 |
| MAGI presumptive eligibility: pregnant women and children | CO-558, CO-559 |
| SSI recipients; SSI-related aged, blind and disabled; OAP SISC B | CO-611, CO-612, CO-1177 |
| Pickle; Disabled Adult Child; disabled widow(er)s; continued SSI status / 1619(b) | CO-1159, CO-1161, CO-1162, CO-1163 |
| MSP: QMB, SLMB, QI, QDWI | CO-613–CO-617 |
| Buy-In: Working Adults with Disabilities and Children with Disabilities, with premiums | CO-618–CO-622 |
| 300% special income group; income trusts with the regional ceiling | CO-642, CO-1985 |
| Institutional care; HCBS (all nine waivers in D-75: EBD, CMHS, SLS, DD, CES, CwCHN, BI, CIH, CHRP); PACE | CO-652–CO-654 |
| Spousal impoverishment (CSRA, MMMNA, income and family allowances) | CO-643–CO-657 |
| Transfer penalties; home equity; patient payment | CO-649, CO-650, CO-658–CO-660 |
| Emergency Medicaid; BCCP | CO-1150, CO-1151, CO-510; CO-1152 |
| Limited family planning and the Reproductive Health Care Program | CO-1153–CO-1155 |
| OAP Health Care and OAP State Only (SISC C) | CO-1156 |
| Cover All Coloradans | CO-1173–CO-1175, CO-562 |
| Community engagement from 2027 | CO-1960–CO-1975 |
| IMD exclusion; residency special rules | CO-1179; CO-2250 |
| Verification for Medicaid and CHP+ | CO-1395–CO-1418, CO-1620–CO-1643 |
| CHP+ children and prenatal, presumptive eligibility, cost sharing | CO-704–CO-708, CO-1990, CO-2228–CO-2231 |

That is broad. The OAP Health Care, Cover All Coloradans, RHCP and community engagement chapters reach further than I expected.

### Missing

| # | Missing pathway or step | Basis | Rank |
|---|---|---|---|
| C-1 | **Federal Medicaid/CHIP immigrant restriction from 2026-10-01**, 42 U.S.C. 1396b(v)(5) (sec. 71109(a)), applied to CHIP through 2107(e) (sec. 71109(b)). Fetched in D-70, lines 47-62; not excerpted, not read by any item. See finding B-1. | [T] statute in repo; [K] HCPF implementation timing | blocking |
| C-2 | **CHP+ continuous eligibility** (§ 430.2), **CHP+ prenatal coverage through 12 months postpartum regardless of income change** (§ 430.3), **CHP+ newborn guaranteed coverage for one year** (§ 430.5), CHP+ effective date (§ 430.1). No `chp/` item mentions continuity, postpartum or a newborn. | [T] D-66 lines 711-749 | blocking |
| C-3 | **Needy persons under 21** (§ 8.100.4.H.1.a-g): children in foster care, subsidized adoption, Alternatives to Foster Care, independent living after foster care, youth in custody at 18, psychiatric inpatients under 21 and LTC under 21. No item; the only foster care items are former foster care (CO-549) and two supplied facts. This is the 42 CFR 435.145 mandatory group plus state groups. | [T] D-65 lines 1993-2005 | blocking |
| C-4 | **Transitional Medical Assistance** (12 months) and **4-month extended Medical Assistance** (§ 8.100.4.I). Mentioned only inside the Cover All Coloradans category list (CO-1174, CO-1175). | [T] D-65 lines 2025-2049 | blocking |
| C-5 | **Hospital presumptive eligibility** (§ 8.100.3.R) for adults 19-65, parents and caretakers (68%), employed disabled applicants (450%) and limited family planning (133-260%). Only the MAGI pregnant and child presumptive tests exist (CO-558, CO-559). | [T] D-65 lines 1575-1613 | should-fix |
| C-6 | **Express Lane Eligibility** (§ 8.100.4.J): automatic child enrollment from free/reduced lunch, SNAP and Colorado Works findings, with 90 days of eligibility pending citizenship/identity. | [T] D-65 lines 2051-2093 | should-fix |
| C-7 | **Continuous eligibility for non-MAGI children** (§ 8.100.3.Q.2.b-g: SSI Mandatory, LTC, CBwD Buy-In, Pickle, DAC, limited family planning) and children leaving foster care (Q.3). CO-555 opens a period only from the MAGI Children's category. | [T] D-65 lines 1555-1573 | should-fix |
| C-8 | **Incarceration limited benefit** for children in continuous eligibility (§ 8.100.3.Q.1.b.ii.1; CHP+ § 430.2.B.ii), with reinstatement on release. | [T] | should-fix |
| C-9 | **Former foster care details**: the exclusions for youth receiving subsidized adoption payments or enrolled in a mandatory group (H.2.a.i-ii); the out-of-state youth from 2023 (H.2.a.iii); a former foster youth's newborn treated as a needy newborn (H.2.c). | [T] | should-fix |
| C-10 | **Continuous eligibility from birth to age 3**, and **12 months for adults released from state prison**, under Colorado's section 1115 authority (HB 23-1300) in effect from January 2026; also reentry pre-release coverage. Not in § 8.100 as fetched (Q.1 still says 12 months). | [K]: cite the CMS approval letter, the STCs and HCPF's operational memo | should-fix |
| C-11 | **Pub. L. 119-21 provisions with dates after November 2026.** Retroactive coverage drops to 1 month for expansion adults and 2 months for others, for applications from 2027-01-01 (sec. 71112). Expansion adults renew every 6 months from renewals after 2026-12-31 (sec. 71107); this changes CO-1973's renewal look-back. Address verification starts 2027-01-01 (1396a(a)(89), visible in D-26 line 3051). | [K] for 71112/71107; [T] for (a)(89) | should-fix |
| C-12 | **Funding source / program code**: Title XIX, Title XXI, or state-only (Cover All Coloradans for children and pregnant people, OAP Health Care, RHCP). It is not an outcome, and CBMS needs it for aid codes and HCPF needs it for budget. | [K] | should-fix |
| C-13 | **Alternative Care Facility** personal needs allowance and room and board (§ 8.100.7.B.3; HCPF IM 25-030). | [T] rule text; [K] memo | note |
| C-14 | **HCBS waiting lists and capacity** (§ 8.7100, D-75 line 391): `eligible_hcbs` means eligible, not enrolled. | [T] | note |

Correctly left out: CICP, the Dental Health Program for Seniors and OmniSalud. They are not determined in CBMS through PEAK, and Colorado has no medically needy program.

---

## 2. Correctness

### 2a. Sample of 62 items checked against their cited excerpts

"OK" means the derivation does what the cited text says. "Cite" means the logic is right but the excerpt is out of date or missing.

| Item | Identifier | Result |
|---|---|---|
| CO-500 | ma_magi_household_members | OK (435.603(f), § 8.100.4.E.1 with the E.5 exception) |
| CO-501 | ma_magi_household_size | OK. Cites the Cornell copy (S170), but E.2 is unchanged |
| CO-503 | ma_magi_household_income | OK |
| CO-504 | ma_magi_household_income_pct_fpl | OK; see figures F-1 on the FPL effective date |
| CO-509 | ma_meets_citizenship_requirement | **Wrong from 2026-10-01** (B-1) |
| CO-539 | ma_magi_highest_income_standard_pct | OK. Precision note still says "185%"; the standard is 195% |
| CO-540 | ma_magi_income_standard_child | OK (142%, S638) |
| CO-545 | ma_is_child_category | OK. Cite: only Cornell S201, which says 133% |
| CO-546 | ma_is_pregnant_category | OK in logic. Cite: only Cornell S209, which says 185% and 60 days |
| CO-547 | ma_is_parent_caretaker_category | OK; caretaker relative per § 8.100.1 (S1500) |
| CO-548 | ma_is_adult_category | OK |
| CO-549 | ma_is_former_foster_care_category | Partly (C-9) |
| CO-550 | ma_is_needy_newborn | OK |
| CO-551 | ma_magi_category | OK in order. Cites six Cornell excerpts with superseded figures |
| CO-554 | ma_magi_eligibility_status | OK |
| CO-555 | ma_continuous_eligibility_applies | **Incomplete** (C-7) |
| CO-557 | ma_retroactive_coverage_start_month | OK for 2026; needs a 2027 version (C-11) |
| CO-558 | ma_is_presumptively_eligible_pregnant | OK; already reads attested income, so OQ-54 is stale (S-11) |
| CO-560 | ma_postpartum_coverage_end_month | OK (12 months, S640) |
| CO-603 | ma_is_aged_blind_or_disabled | OK |
| CO-609 | ma_meets_ssi_income_standard | OK |
| CO-610 | ma_meets_ssi_resource_standard | OK |
| CO-611 | ma_is_ssi_related_eligible | OK, apart from status (B-1) |
| CO-612 | ma_ssi_related_category | OK |
| CO-613 | ma_qmb_eligible | OK (income after the $20, against 100% FPL, equals Medicare.gov's $1,350) |
| CO-616 | ma_qdwi_eligible | OK |
| CO-617 | ma_msp_category | OK |
| CO-618 | ma_wawd_eligible | OK (no upper age, as § 8.100.6.P states) |
| CO-619 | ma_wawd_premium | Partly: first-month waiver (P.1.f.ii) and postpartum waiver (P.1.f.v) not applied (S-8) |
| CO-1715 | ma_wawd_countable_income | **Misreading**: does not carry the unused $20 to earned income, though P.1.b points to § 8.100.5.H, as CO-605 does (S-8) |
| CO-621 | ma_cbwd_premium | Partly: the 5%/7.5% caps and the one-premium-per-household rule (Q.1.g.i, iii) are missing (S-8) |
| CO-642 | ma_meets_special_income_group | OK; depends on unverified S1230 |
| CO-646 | ma_csra | OK. Colorado gives the couple's total up to the maximum (§ 8.100.7.M.1.a) |
| CO-649 | ma_transfer_penalty_months | OK |
| CO-652 | ma_ltc_eligibility_status | **Wrong** setting choice (B-3); transfer-penalty precedence (S-2) |
| CO-653 | ma_hcbs_waiver_eligible | OK in tests; eligibility, not enrollment (C-14) |
| CO-654 | ma_pace_eligible | **Incomplete**: no PACE service area and no "able to live safely in the community" test (42 CFR 460.150(b)(3), (c)) (B-3) |
| CO-655 | ma_mmmna | OK |
| CO-658 | ma_patient_payment | OK |
| CO-660 | ma_transfer_penalty_applies | OK as written; relies on a supplied start date (S-2) |
| CO-662 | ma_mmmna_standard | OK ($2,705.00 from 2026-07-01); overridden in CO-01/CO-02 (S-3) |
| CO-704 | chp_income_within_limit | OK (142-260% child, 195-260% prenatal, disregard at the ceiling) |
| CO-705 | chp_child_is_eligible | **Incomplete**: no CHP+ continuous eligibility (B-2) |
| CO-706 | chp_prenatal_is_eligible | **Incomplete**: no postpartum continuation (B-2) |
| CO-707 | chp_eligibility_status | Wrong for a child in a continuous eligibility period whose income changed (B-2) |
| CO-708 | chp_presumptive_eligibility | OK. Cite: only Cornell (S241, S246) |
| CO-1150 | ma_meets_requirements_other_than_status | OK |
| CO-1151 | ma_emergency_medicaid_status | OK |
| CO-1152 | ma_bccp_eligibility_status | OK as read (OQ-201, OQ-202) |
| CO-1154 | ma_family_planning_status | OK to the letter of G.8 (OQ-215) |
| CO-1155 | ma_family_planning_income_in_band | OK |
| CO-1156 | ma_oap_health_care_status | OK |
| CO-1159 | ma_pickle_eligible | OK |
| CO-1163 | ma_protected_group_category | OK |
| CO-1172 | ma_is_five_year_bar_exempt | Right before 2026-10-01; after that, see B-1 |
| CO-1190 | ma_countable_discharged_student_loan_income | **Misaligned with the federal tax rule MAGI follows** (S-10) |
| CO-1414 | ma_verification_due_date | OK as an assumption (OQ-303) |
| CO-1964 | ma_is_medically_frail | OK |
| CO-1974 | ma_community_engagement_status | OK against 435.550-435.559 as fetched |
| CO-1978 | chp_is_excluded_as_public_agency_employee_family | OK |
| CO-1990 | chp_is_exempt_from_cost_sharing | OK |
| CO-2228 | chp_copayment_income_band | OK (OQ-470) |

Systemic citation problem: of 418 Medicaid/CHP+ items, **152 cite the Cornell copies D-39 to D-42 and 58 cite nothing else**. Those 58 are listed under S-7. Some of those excerpts state figures the codex correctly does not use: 133% for children (S201), 60% for parents (S203), and 185% with 60-day postpartum for pregnant women (S209). A reviewer who checks an item against its own citation would conclude the codex is wrong.

### 2b. Hand recomputation of household cases

**CO-01** (as of 2026-10-01; the target household)

p1, grandmother, 79, citizen, admitted to a nursing facility 2026-10-01; Social Security $1,420 + pension $610 = $2,030.
- 300% test: 3 × $994 = $2,982. $2,030 ≤ $2,982, so met.
- Resources: the couple has $46,000. The CSRA is min($46,000, $162,660) = $46,000, which leaves p1 $0. Home equity $210,000 < $752,000. Codex agrees on all of these.
- Setting: the codex reports **`eligible_pace`**. That is wrong for a person in a nursing facility asking for nursing facility care. The correct result is `eligible_institutional` (B-3).
- MMMNA: the rule gives $2,705.00 + max(0, $1,100 − 0.30 × $2,705.00 = $811.50) = **$2,993.50**.
- Community spouse income allowance: $2,993.50 − $1,180 = **$1,813.50**.
- Patient payment: $2,030 − $110.36 − $1,813.50 = **$106.14**.
- The case expects $2,920 / $1,740 / $179.64. Those figures come from the case supplying `ma_mmmna_standard: 2600` for p1 and p2, which overrides the derived rule (CO-662). `eval-case` confirms 2,600 for p1/p2 and 2,705 for p3-p5 (S-3).
- The case also states no Part B premium (`health_insurance_premiums_paid: 0`) for a Medicare beneficiary who is not on an MSP (N-5).

p2, grandfather, 81, LPR since 1998, community spouse; $1,180 Social Security.
- SSI-related: $1,180 − $20 = $1,160 > $994, so no.
- QMB on income: $1,160 ≤ $1,330, but resources of $44,100 are over $9,950, so no MSP.
- No MAGI category at 81.
- Limited family planning: (p1 + p2) $3,210 / ($27,320 / 12) = 141%, in the 133-260% band, so `limited_family_planning`. Matches; this is the literal reading of G.8 (OQ-215, N-2).
- Codex matches.

p3, mother, 41, undocumented; wages $2,380; files and claims p4 and p5.
- Household of 3: $2,380 / $2,276.67 = 104.5% FPL.
- Over the parents/caretakers standard (68% + 5%); within 133%. So the Adults category, emergency-only, with an emergency in October.
- RHCP: $2,380 / (4-person $2,750) = 86.5%. Matches.

p4, 17, citizen, minor parent; claimed by her parent p3, so she is in p3's household.
- 104.5% ≤ 142%, so Children's category, and continuous eligibility applies. Matches.

p5, 8 months, citizen; claimed by his grandmother, so the non-filer rule applies.
- Household {p4, p5}, income $0. Needy newborn. Matches.

Under B-1 (sec. 71109), no one in CO-01 changes: p2 is an LPR past the five-year bar.

**CO-06** (as of 2026-11-01)

p1, Robert, 74, in a nursing facility since 2026-10-05; $1,900 + $700 = $2,600 ≤ $2,982.
- Resources: the snapshot is $180,000. The CSRA is min($180,000, $162,660) = $162,660, which attributes $17,340 to p1. That is over $2,000, so he is **resource-ineligible**.
- Transfer: $54,000 / $10,814.64 = 4.993, so 4 months and ⌈0.993 × 30⌉ = 30 days. Codex agrees.
- MMMNA $2,705 + ($1,250 − $811.50) = $3,143.50. CSIA = $2,043.50. No CSRA increase: p1's income after the personal needs allowance ($2,489.64) covers the shortfall. All match.
- **Disagreement**: the codex reports `transfer_penalty`. A penalty period cannot start until the person is otherwise eligible (§ 8.100.7.F.2.c.ii, CO-886's own meaning). The case supplies a start date of 2026-11-01 while the codex itself finds p1 $15,340 over the resource limit that month. The correct November outcome is `ineligible_resources`, with the penalty to run from the month he spends down (S-2).

p2, Linda, 69; $1,100.
- $1,100 − $20 = $1,080 ≤ $1,330, resources $7,500 ≤ $9,950, so QMB. Matches.

p3, 34, disabled, wages $2,400.
- WAwD: under § 8.100.5.H the unused $20 carries, giving (2,400 − 20 − 65)/2 = $1,157.50. The codex's CO-1715 gives $1,167.50 (S-8).
- Either figure is 87-88% FPL, in the $25 band; the case expects $25. But P.1.f.ii waives the premium for months before the determination month and for the month of determination itself ("charged beginning the month after"). On a 2026-11-02 application determined in November, the November premium is $0, not $25 (S-8).

**CO-72** (as of 2026-10-01)

Elena, 70, undocumented, in a nursing facility since 2026-09-15; $900 pension; resources $1,200.
- LTC financial tests: $900 ≤ $2,982 and $1,200 ≤ $2,000. Nursing facility level of care met. Status fails, so `ineligible_status`. Matches.
- Emergency: aged, SSI-related $880 ≤ $994, resources ≤ $2,000, so `eligible_emergency_condition`. Matches.
- No MAGI category; family planning ineligible on status; no protected group. All match.
- Correct to the text. Note: ongoing nursing facility care is not an emergency service, so "eligible_emergency_condition" here pays for the October emergency, not the stay (N-1).

**CO-73** (community engagement, 2027-03) was also checked:
- p1: 60 + 25 = 85 hours, met.
- p2: 30 hours and $300 < $580, so not met.
- p3: parent of a 5-year-old, excluded.
- The arithmetic matches the codex, but the outcome depends on Colorado choices HCPF has not published (OQ-410 to OQ-412), so I cannot approve it yet.

### 2c. Misreadings and rule defects, ranked

**B-1 (blocking): immigrant eligibility from 2026-10-01**
- Items: CO-509, CO-1172, CO-506; through them CO-611, CO-618, CO-620, CO-652-654, CO-1152 (via CO-1174), CO-1159, CO-1161-1163 and CO-1177; CO-705/706 for funding.
- What the codex does: it admits refugees, asylees and `other_qualified_non_citizen` adults to full Medicaid (exempt from, or after, the five-year rule) with no end date.
- What the law says: 42 U.S.C. 1396b(v)(5), in D-70, says that "beginning on October 1, 2026, except as provided in paragraphs (2) and (4), in no event shall payment be made ... unless such individual is" a citizen or national, an LPR, a Cuban/Haitian entrant, or a COFA migrant. Paragraph (4), the CHIPRA 214 option for lawfully residing children and pregnant women, survives.
- Why it matters: `default_as_of` is 2026-10-01, so every determination this volume makes today is affected.
- No household case contains a refugee, asylee or parolee, which is why 2,165/2,165 passes.
- Colorado's own § 8.100.3.G.1.g (version effective 11/14/2026) has not been amended. That conflict is HCPF's to resolve by rule, but the federal limit applies regardless.
- Fix:
  - Excerpt (v)(5) from D-70.
  - Version CO-509: to 2026-10-01 as now; from 2026-10-01 a qualified adult arm limited to LPRs (with the five-year rule and its iv exemptions), Cuban/Haitian entrants and COFA migrants. Keep arm vii (214).
  - Route everyone else who meets a category to emergency-only. Cover All Coloradans continues to reach children and pregnant/postpartum people with state funds.
  - Add cases for an unadjusted refugee adult, an asylee child and an adult parolee.
  - Name OQ-213's open half as superseded for adults.
  - [K] HCPF's transition method (redetermination at renewal or a mass change) is in HCPF's implementation guidance; cite it once published.

**B-2 (blocking): CHP+ continuity**
- No item implements § 430.2 continuous eligibility, § 430.3 prenatal coverage through 12 months after birth "regardless of changes in the woman's financial circumstances", or § 430.5 one-year newborn coverage.
- A CHP+ child whose income rises in month 3 is reported `ineligible_income`. A CHP+ prenatal member is dropped at birth.
- Fix:
  - Add `chp_child_is_in_continuous_eligibility_period` (with the § 430.2.B exceptions) and `chp_prenatal_coverage_end_month`.
  - Add a CHP+ newborn rule mirroring CO-550.
  - Make CO-707 read them ahead of the income branch, as CO-554 does for Medicaid.

**B-3 (blocking): LTC setting (overrule OQ-100)**
- CO-652 tests PACE, then HCBS, then institutional.
- PACE and HCBS are services a person chooses and enrolls in. A person in a nursing facility is not in PACE because they could be. CO-654 also omits the PACE service area and the safe-in-community conditions of 42 CFR 460.150(b)(3) and (c).
- Fix:
  - Add a supplied fact `ma_ltc_setting_requested` (institutional / hcbs / pace) plus PACE service-area and safe-in-community facts.
  - Have CO-652 report eligibility for the requested setting.
  - Correct CO-01/CO-02 p1 to `eligible_institutional`.

**S-1:** CO-555 (see C-7).

**S-2: transfer-penalty precedence**
- CO-652 tests the transfer penalty before income and resources. CO-06 supplies a penalty start date that contradicts the codex's own resource finding.
- Fix:
  - Test resources (and income) before the penalty, or derive the start date as the later of the month after the transfer and the first month otherwise eligible.
  - Correct CO-06 p1 to `ineligible_resources`.
  - Remove CO-06's stale comment "Illustrative transfer-penalty divisor" (N-4).

**S-3: a case can override a derived rule**
- CO-01 and CO-02 state `ma_mmmna_standard: 2600`, so the target household's patient payment ($179.64), CSIA ($1,740) and MMMNA ($2,920) are not what the rule yields ($106.14, $1,813.50, $2,993.50).
- The same override occurs for `cw_eligibility_status`/`cw_grant_amount` (CO-08) and `meets_public_assistance_citizenship_requirement` (CO-83).
- Fix:
  - Remove the overrides and recompute the expectations.
  - Make `npm run check` fail when a case supplies a derived identifier.

**S-8: Buy-In details**
- CO-1715 should carry the unused $20 general exclusion to earned income (§ 8.100.5.H via P.1.b), as CO-605 does.
- CO-619: apply P.1.f.ii (no premium before the month after determination) and P.1.f.v (postpartum waiver).
- CO-621: apply Q.1.g.i (5% / 7.5% caps) and Q.1.g.iii (one premium per household).
- Move the premium tables to parameters, since § P.1.f.iv and Q.1.g.v re-base them each state fiscal year (this overrules the OQ-82 choice).

**S-10: discharged student loans (CO-1190)**
- MAGI follows the Internal Revenue Code (42 CFR 435.603(e)). [K] IRC 108(f)(5) as amended by the American Rescue Plan excluded all student loan discharges from 2021 through 2025. Pub. L. 119-21 made the death-or-disability exclusion permanent from 2026.
- The codex counts a 2025 income-driven-repayment forgiveness as income, and from 2026 counts a death or disability discharge as income. Both are wrong against IRC.
- The literals "2018-01" and "2025-12" are hard-coded in the derivation.
- Fix: cite IRC 108(f)(5) and Pub. L. 119-21, move the dates to parameters, and flag § 8.100.4.C.1.b.xv for HCPF rule cleanup.

**S-12:** CO-549 (see C-9).

---

## 3. Figures in effect for 2026

| Figure | Item | Value | Dated | Source | Assessment |
|---|---|---|---|---|---|
| FPL table, 48 states | CO-181, CO-182 | $15,960 + $5,680 | from 2026-01-01 only | S55 (HHS 2026) | Values correct. **Dating:** no 2025 version, so months before 2026 (retro months Oct-Dec 2025 for a January 2026 application) have no figure. HHS's date is mid-January, and HCPF applies the new guidelines on the date its annual memo sets [K]. Add the 2025 table and the HCPF implementation date (F-1). |
| MMMNA standard | CO-662 / CO-1954 | $2,643.75 to 2026-06-30, $2,705.00 from 2026-07-01 | yes | S1219, S55, S644 | Correct. Corroborated: OM 25-073's excess shelter standard moves $766.50 to $793.13, which is 30% of the July standards. |
| MMMNA maximum | CO-830 | $4,066.50 | 2026-01-01 | S644 (CMS CIB 4/27/2026) | Correct |
| CSRA minimum / maximum | CO-827, CO-828 | $32,532 / $162,660 | 2026-01-01 | S644 | Correct. Colorado uses the maximum (M.1.a); the minimum is unused. |
| Home equity limit | CO-831 | $752,000 | 2026-01-01 | S644, § 8.100.5.M.2 | Correct; Colorado indexes the $500,000 base (federal minimum). |
| SSI FBR individual / couple | CO-235, CO-236 | $994 / $1,491 | 2026-01-01 | S319 | Correct. 2025 version missing (F-2). 2027 figures were published in October 2026 and are not loaded (F-3). |
| 300% special income group | CO-250 × CO-235 | $2,982 | derived | S351 | Correct. Cites Cornell only. |
| SSI resource limits | CO-233, CO-234 | $2,000 / $3,000 | unversioned | S301, S302 | Correct (not indexed) |
| SSI exclusions | CO-230-232 | $20, $65, ½ | unversioned | S308-310 | Correct |
| SGA non-blind / blind | CO-1802, CO-1803 | $1,690 / $2,830 | 2026-01-01 | S499 | Correct |
| MSP resource limits | CO-807, CO-808 | $9,950 / $14,910 | 2026-01-01 | S647 (Medicare.gov) | Correct |
| QMB / SLMB / QI / QDWI | CO-238-241 | 100 / 120 / 135 / 200% | unversioned | Cornell only | Correct; re-cite to D-65 |
| WAwD limit, premium cap, premiums | CO-242, CO-1800, CO-619 | 450%; 7.5%; $0/$25/$90/$130/$200 | unversioned | S317 (Cornell); D-65 matches | Correct for SFY 2026-27; premiums should be dated parameters (S-8) |
| CBwD limit and premiums | CO-243, CO-621 | 300%; $0/$70/$90/$120 | unversioned | S318 (Cornell) | Correct; caps missing (S-8). [K] Confirm whether CBwD premiums are being charged: Q.1.g.vii describes a COVID waiver whose end the rule leaves to a Department notice. |
| MAGI child / parent / adult / pregnant | CO-191-194 | 142 / 68 / 133 / 195% | versioned from 2022 | S675, S638-641 | Correct; well dated. CO-193 cites only Cornell. |
| 5% disregard | CO-183 | 0.05 | unversioned | S168 (Cornell), S165 | Correct |
| Limited FP band | CO-1131, CO-1132 | >133%, ≤260% | unversioned | S613 | Correct |
| CHP+ upper limit | CO-212 | 260% | unversioned | S243 (Cornell only) | Correct; re-cite to S643 (D-66) |
| CHP+ copayment bands and amounts | CO-2225-2227, CO-2230 | 101/150/200%; per S1504 | unversioned | S1504 (D-66, eff. 08/30/2026) | Correct to the rule |
| CHP+ cost-sharing cap | CO-213 | 5% | unversioned | S642 | Correct |
| Transfer-penalty divisor | CO-832 | $10,814.64 (2025: $10,475.11) | 2026-01-01 | **S1228, unverified** | See below |
| Personal needs allowance (NF/ICF) | CO-887 | $110.36 (2025: $108.73) | 2026-01-01 | **S1228, unverified** | See below. The +1.5% is consistent with § 8.100.7.V.3.d.i.2's per-diem indexing (not the SSI COLA). |
| Veterans PNA | CO-255 | $90 | unversioned | S362 | Correct |
| Income-trust ceilings, Regions I-IV | CO-1981-1984 | $11,522.44 / $10,633.36 / $9,780.17 / $11,322.60 | 2025 and 2026 versions | **S1230, unverified** | See below |
| Income-trust retention | CO-2237 | $20 | unversioned | S1508 | Correct |
| Lottery thresholds | CO-1183, CO-1184, CO-1988 | $79,999 / $10,000 / 120 months | unversioned | S669, S1234 | Correct |
| CE hours, minimum wage, weeks | CO-1901, CO-160, CO-1907 | 80; $7.25; 4.33 | unversioned / from 2027-01-01 | D-121 | Correct to 435.552 as fetched |
| Retroactive months | CO-197 | 3 | unversioned | S217, S1503 | Correct for 2026; needs 2027 versions (C-11) |

**The OM 25-073 figures (D-125, S1228, S1230).** I could not retrieve the memo either (403). A web search returned the memo's own indexed text and one third-party guide:
- **Personal needs allowance** $108.73 → $110.36: matches.
- **Average private-pay rate** $10,475.11 → "$10,814": matches to the dollar, but the cents (.64) were not visible.
- **Region I** $11,556.20 → $11,522.44: matches.
- **Region IV** $11,322.60: matches a third-party guide that cites 10 CCR 2505-10.
- **Regions II and III** ($10,633.36, $9,780.17): **not corroborated** by anything I could see.

These are corroborations, not quotations. They do not change the `unverified` status.

What I need:
- HCPF will supply the memo PDF. Store it as the D-125 file, replace S1228/S1230 with quotations and set them verified.
- Until then, CO-832, CO-887, CO-1981-1984 and every item reading them (CO-642, CO-649, CO-658, CO-659, CO-1985, CO-1987) must not move past Draft.
- Governance must warn on them, as `docs/design-colorado.md` promises. It does not today: the governance run shows 0 findings mentioning "unverified", and `src/engine` has no such rule.

Figure-dating findings:
- **F-1 (should-fix):** the FPL effective date for Medicaid/CHP+ (and MSP) is the codex's guess.
- **F-2 (should-fix):** no 2025 versions of the SSI FBR, FPL, CSRA, MSP limits or SGA, so a January-March 2026 application's retroactive months in late 2025 evaluate against 2026 figures or nothing.
- **F-3 (should-fix):** 2027 figures already published (SSI and SGA in October 2026; CMS spousal impoverishment and MSP figures later in the year) are not loaded. Nothing flags a parameter whose annual refresh is due; add a `review_by` date to indexed parameters and a check warning.
- **F-4 (note):** 58 items cite only Cornell (S-7).

---

## 4. Open Medicaid/CHP+ questions: does HCPF know the answer?

36 questions are open or partly open (`docs/reviews/open-question-status.md`).

| OQ | Topic | Do I know the policy answer? | Action |
|---|---|---|---|
| OQ-44 | lawful presence as its own fact | Design choice. After B-1 the fact must carry categories, not yes/no. | Keep separate; widen with B-1 |
| OQ-50 | deprivation not applied | **Yes [K]**: Colorado eliminated deprivation for MAGI parents and caretakers in its MAGI SPA (S25). The assumption is right. | Cite the approved S25 page |
| OQ-54 | PE attested income | Already resolved in the items (CO-558/559 read `attested_household_income_pct_fpl`) | Close; remove from CO-558's `open` (S-11) |
| OQ-62 | CHP+ aliases of the MAGI household | Design; agree no aliases | Accept; route approvals (Section 5) |
| OQ-82 | Buy-In premiums as literals | **Overrule**: premiums are re-based each SFY (P.1.f.iv, Q.1.g.v) | Dated parameters (S-8) |
| OQ-83 | parent-to-child deeming | **Not settled by me**. [K] HCPF follows SSI deeming (20 CFR 416.1160-1165) where a child is tested SSI-related, but I want Eligibility Policy to confirm in writing. | HCPF to answer; then cite 416.1165 |
| OQ-95, OQ-97 | family allowance group; community spouse facts | Design | Accept |
| OQ-99, OQ-212 | OM 25-073 figures | **Yes**: they are in OM 25-073, which HCPF can supply | Attach memo; verify (Section 3) |
| OQ-100 | LTC setting order | **Overrule**: the setting is the one requested/enrolled | B-3 |
| OQ-144 | CBwD "individuals" vs "households" | **Yes**: a household premium (Q.1.g.iii is per household); "individuals" is a drafting slip | Accept the codex reading; HCPF rule cleanup |
| OQ-200 | HCBS 300% as an emergency route | **Recommendation**: not a route. Waiver services are never emergency services, and the 300% HCBS group presupposes receipt of waiver services. Confirm with Eligibility Policy. | Keep the current reading; cite once confirmed |
| OQ-201 | BCCP "woman" | **Not mine to answer**; a Legal question (42 U.S.C. 1396a(aa) states no sex) | Legal |
| OQ-202 | BCCP cross-reference | **Yes**: the cross-reference means the Cover All Coloradans exception; out-of-state NBCCEDP transfer is an alternative route | Accept; HCPF rule cleanup |
| OQ-203 | 2002 C.R.S. edition | Accept the 2024 reading | Accept |
| OQ-204 | FP household +1; disregard at ceiling | **Partly [K]**: household-of-two plus others is how CBMS counts it. Disregard placement: confirm against HCPF's published income chart. | HCPF to confirm the disregard |
| OQ-209 | disabled widow(er)s | Agree | Accept |
| OQ-213 | adult parolees, conditional entrants, battered non-citizens | **Superseded for adults from 2026-10-01** by 1396b(v)(5) | B-1; restate the OQ |
| OQ-214 | postpartum person not covered while pregnant | **Not settled by me**; needs Eligibility Policy and Legal on C.R.S. 25.5-5-201(6)(b) | HCPF to answer |
| OQ-215 | FP no age/gender restriction | **Yes**: G.8's letter is intended; keep it | Accept (N-2) |
| OQ-216 | several lottery receipts | Design; rare | Accept |
| OQ-217 | student loan discretion | **Yes in part**: HCPF applies the named programs consistently, not case by case. The tax-year window is wrong against IRC [K]. | S-10 |
| OQ-302 | 20% of what | **HCPF knows**: it is in Colorado's MAGI verification plan (on medicaid.gov, not hcpf.colorado.gov). I will not state it from memory. | Fetch the plan and cite it |
| OQ-303 | period for other documentation | **HCPF knows (operations)**; I will not state the CBMS checklist period from memory | Eligibility Operations to answer |
| OQ-390 | SSI-method exclusions | Needs facts; agree with the direction | Do it for Medicaid as for the other programs |
| OQ-393 | residency (Medicaid part done) | Agree | Accept |
| OQ-396 | shared relationship edges | Design | Accept |
| OQ-410-412 | community engagement State choices | **Not yet published**: HCPF's SPA and rules for 2027 are in progress. The draft's minimums (1 month look-back, no hardship option) are placeholders. | Hold `ma_community_engagement_status` at Draft until the SPA is approved; cite it |
| OQ-413 | CE modeling choices | (5) whether an undocumented adult failing CE is emergency-only needs CMS guidance | Hold with OQ-410 |
| OQ-470 | CHP+ band gaps | Agree with inclusive upper bounds | Accept |
| OQ-471 | family allowance with income trusts | Agree: federal 1396r-5(d)(1) controls | Accept |
| OQ-472 | institutionalized residency | Agree: 42 CFR 435.403 controls | Accept |
| OQ-473 | ineligible child allocation | Agree | Accept |

**Assumptions I would overrule:**
- OQ-100 (B-3).
- OQ-82 (premiums as parameters).
- OQ-213's "qualified, subject to the bar" reading for adults after 2026-10-01 (B-1).
- OQ-54, which should be closed.
- The literal tax-year window in CO-1190 under OQ-217 (S-10).

---

## 5. Could my team approve these items as written?

**Meanings.** Mostly yes. Median 43 words, plain and cited; only 3 Medicaid/CHP+ meanings carry editing history. I could sign most meanings once the citations point at the current text.

**Precision notes.** Useful where they state edge cases (CO-662's July dating, CO-649's partial month). But 76 of them carry editing history ("Phase 7 fix round (S-2)…", "Vocabulary fix round (U-11)…"), and the longest runs 322 words. An approver signs the current rule, not its history.
- **S-14:** move history to `rationale` or a changelog.
- Keep precision to day boundaries, rounding, "if not stated, read as…", and the specific reading taken.

**Approval roles in `volume.yaml`.**
- **S-13 (should-fix):**
  - `by_program.All` requires the Medicaid, SNAP and Cash owners but **not the CHP+ owner**, although CHP+ reads `is_colorado_resident`, `age`, `citizenship_status` and the income facts.
  - CHP+ also reads Medicaid items by design (CO-704-708 read `ma_magi_*`, CO-1174, CO-562). A change to those items requires only the Medicaid owner, though it changes `chp_eligibility_status`.
  - "Medicaid policy owner" is one role for what HCPF splits between Eligibility Policy (MAGI/ABD), the Office of Community Living (LTC, HCBS, PACE, level of care), and Finance (premiums, funding streams).
  - Proposed roles:
    - `by_tag: ltc, hcbs → "LTSS policy owner"`
    - `buy_in → + "Premium/finance owner"`
    - `verification → "Eligibility operations owner"`
    - `state_election → Medicaid policy owner + "State plan coordinator"`, not Legal alone; an election is HCPF's policy choice.
    - `immigration → Legal + Medicaid policy owner`.
  - Add a rule: any item in the impact set of a program's outcomes needs that program owner's approval.

**Governance flow (`docs/governance.md`).** It describes GitHub review as approval and "the merge itself is the decision to deploy." For HCPF that is not enough:
- **B-4 (blocking):**
  - `.github/CODEOWNERS` names only `volumes/mwr/*` paths, and the placeholder `@jisaf`. No one is a required reviewer for any `volumes/co` change.
  - Items have no `status`, `approval` or (except 3 files) `effective` field, though `docs/conventions.md` lists all three. My approval could not be recorded per item, at a commit, or for a subset of items.
  - The volume says "Nothing in this volume is approved", and nothing in the flow changes that.
  - Unverified excerpts do not warn.
- **S-16 (should-fix):** the household cases are self-referential. CO-06's comment says "Expectations are what the FIXED items compute", so 2,165/2,165 passing shows consistency, not correctness. No case exercises a refugee or asylee, CHP+ continuous eligibility, TMA, foster care Medicaid, or hospital presumptive eligibility.

**What I would need to see before signing:**
1. B-1, B-2 and B-3 fixed, with household cases whose expected values HCPF eligibility staff derived independently. That means 10-15 cases run in the CBMS training environment and compared, including a refugee adult, a CHP+ child in a continuous eligibility period, and a nursing facility admission.
2. The missing pathways C-3 to C-6 added, or explicitly declared out of scope in `docs/design-colorado.md` with HCPF agreeing.
3. OM 25-073 attached and S1228/S1230 verified, and governance warning on any `unverified` excerpt.
4. CODEOWNERS for `volumes/co/medicaid/`, `volumes/co/chp/` and the `ma_`/`chp_` parameters and supplied facts, naming HCPF reviewers. Branch protection on.
5. An item-level approval record (status, approver role, date, commit) and `effective` on every derived item. The ability to approve the Medicaid/CHP+ chapter without approving SNAP or cash.
6. Citations moved from the Cornell copies to D-65/D-66 (S-7); 2025 and 2027 versions of indexed figures (F-2, F-3).
7. HCPF answers recorded and cited for OQ-50, OQ-83, OQ-200, OQ-204, OQ-214, OQ-302, OQ-303, and the community engagement choices (OQ-410-412) once the SPA is approved.

---

## Findings index

| ID | Rank | Short title |
|---|---|---|
| B-1 | blocking | 1396b(v)(5) immigrant restriction from 2026-10-01 not applied |
| B-2 | blocking | CHP+ continuous eligibility, postpartum, newborn missing |
| B-3 | blocking | LTC setting chosen by order; NF resident reported PACE |
| B-4 | blocking | No CODEOWNERS for co; no item status/approval/effective; unverified sources not flagged |
| C-3, C-4 | blocking | Foster care/adoption Medicaid; TMA and 4-month extended missing |
| C-5, C-6, C-7, C-8, C-9, C-10, C-11, C-12 | should-fix | Hospital PE; Express Lane; non-MAGI child CE; incarceration benefit; FFC details; 1115 CE 0-3 and reentry [K]; 2027 Pub. L. 119-21 dates [K]; funding source |
| S-2 | should-fix | Transfer penalty before resources; CO-06 contradiction |
| S-3 | should-fix | Cases override derived items (CO-01/CO-02 MMMNA) |
| S-7 | should-fix | 58 Medicaid/CHP+ items cite only superseded Cornell copies |
| S-8 | should-fix | Buy-In $20 carry, premium waivers, CBwD caps, premium parameters |
| S-10 | should-fix | Student loan discharge against IRC [K] |
| S-11 | should-fix | OQ-54 stale |
| S-13 | should-fix | Approval roles too coarse; CHP+ owner missing from upstream items |
| S-14 | should-fix | Precision notes carry history |
| S-16 | should-fix | Self-referential case expectations; missing case types |
| F-1, F-2, F-3 | should-fix | FPL effective date; no 2025 versions; 2027 figures not loaded |
| C-13, C-14 | note | ACF PNA/room and board; HCBS waiting list |
| N-1 | note | CO-72: emergency coverage does not pay the NF stay |
| N-2 | note | CO-01 p2 (81, male) limited family planning per G.8's letter |
| N-3 | note | CHP+ verification shown pending for a Medicaid-eligible child (CO-01 p4) |
| N-4 | note | CO-06 stale "illustrative divisor" comment |
| N-5 | note | CO-01 p1 Part B premium not stated in the patient payment |
| N-6 | note | CO-539 precision still says 185% |

## Summary

**Counts:**
- Blocking: 6 (B-1 to B-4, C-3, C-4).
- Should-fix: 21 (C-5 to C-12, S-2, S-3, S-7, S-8, S-10, S-11, S-13, S-14, S-16, F-1 to F-3).
- Notes: 8 (C-13, C-14, N-1 to N-6).
- Items checked against citations: 62. Household cases recomputed by hand: 3 (CO-01, CO-06, CO-72), plus CO-73.
- Rows that disagree with the codex:
  - Wrong: 7 (CO-01 p1 setting, MMMNA, CSIA and patient payment; CO-06 p1 status; CO-06 p3 countable income and first-month premium).
  - Correct today but wrong for a person not in the cases: 1 (B-1).
- Open questions: 36 reviewed; I can answer or overrule 14, 8 need an HCPF office or Legal, and the rest are ledger-design choices I accept.

**Top five changes, in priority order:**
1. Apply 42 U.S.C. 1396b(v)(5) from 2026-10-01 to Medicaid and CHP+ status, with refugee, asylee and parolee cases (B-1).
2. Add CHP+ continuous eligibility, prenatal postpartum continuation and CHP+ newborn coverage (B-2).
3. Choose the LTC setting from the request, not by order; fix CO-01/CO-02 p1, the CO-06 penalty precedence and the MMMNA override (B-3, S-2, S-3).
4. Add foster care/subsidized adoption Medicaid and TMA/4-month extended. Decide with HCPF on hospital PE and Express Lane (C-3 to C-6).
5. Make approval possible: CODEOWNERS for `volumes/co`, item status/approval/effective fields, an unverified-source warning, and approval routing that includes the CHP+ owner for everything upstream of CHP+ outcomes (B-4, S-13).

**What works well.**
- The MAGI household and income chapter is correct on a hard case (a minor parent, and a grandchild claimed by a grandparent).
- The SSI-related, MSP, spousal impoverishment and patient-payment arithmetic all reproduce by hand.
- Colorado's own choices are found and dated from the current rule text: 142/68/195%, the maximum-CSRA reading, the indexed home equity base.
- Cover All Coloradans and the state-only programs are modeled more carefully than any summary I have seen.
- Open questions are honest, and each states the assumption in force.
- Every unknown propagates as "cannot determine" rather than defaulting silently.

---

## Disposition (HCPF fix round, 2026-11-21)

Commits on the fix-round branch: `db81d04` (engine: status and approval records, upstream-of-outcome approvals, the unverified-excerpt warning, income-band tables, `review_by`, the case override check), `0d7a2d1` (items, documents D-161..D-168, excerpts S1700..S1731, open questions OQ-510..OQ-520, CO-01/CO-02/CO-06 recomputed), `5c398c3` (cases CO-74..CO-78), `e274aa6` (S-7 re-citation, S1732..S1759; S-14; CODEOWNERS) and the commit that adds this section. New items CO-2400..CO-2472. No SNAP, cash, CCCAP, LEAP or SUN Bucks item was edited.

Documents fetched this round: D-161 Pub. L. 119-21 secs. 70119 and 71107-71112 (govinfo); D-162 42 U.S.C. 1397gg(e)(1) (Cornell); D-163 CMS SHO #26-001 on section 71109 (April 8, 2026); D-164 and D-166 SSA's 2025 and 2027 cost-of-living notices; D-165 HHS's 2025 poverty guidelines; D-167 Pub. L. 117-2 sec. 9675; D-168 CMS's June 30, 2026 letter to Colorado on the section 1115 demonstration.

### Blocking

| Finding | Disposition | Where |
|---|---|---|
| B-1 | Fixed. 1396b(v)(5) excerpted from the enacted text (S1700) with CMS's implementing letter (S1702-S1705, S1731). New `ma_is_in_federal_payment_status_category` (CO-2400, effective range from 2026-10-01: citizen/national, LPR, Cuban/Haitian entrant, COFA) and the date parameter CO-2401. CO-509's qualified-non-citizen arm requires CO-2400 from that date; arm vii (the 214 option, which (v)(4) keeps) is unchanged, so a refugee or asylee child or pregnant woman keeps full coverage and an unadjusted refugee, asylee, parolee or trafficking-victim adult is emergency-only (CO-510, (v)(2)). Every reader follows: CO-611, CO-618/CO-620/CO-653 (through CO-1174), CO-652/CO-654, CO-1152, CO-1159, CO-1161-CO-1163, CO-1177, CO-1154 (limited family planning, a partial benefit SHO note 14 names), and MSPs, which had no status test at all and now read CO-509 (CO-617). CHIP: 1397gg(e)(1)(R) applies (v)(5) to CHP+ and (Q) keeps the 214 option only where elected under Medicaid (S1701); CHP+ reads CO-1174, so it inherits the limit, and a lawfully residing child or pregnant woman stays eligible. Cover All Coloradans: C.R.S. 25.5-2-104(2) and 25.5-5-201(6) keep children and pregnant people covered with state funds (S1729, S1730); no statute reaches the adults (OQ-518). Transition timing: CMS requires the limit for applicants and enrollees from 2026-10-01, redetermined as a change in circumstances (S1704); HCPF's own method is not fetchable (OQ-517). The determination date, not the service month, decides which rule applies (OQ-510). Cases CO-74 (2026-09-15) and CO-75 (2026-11-02): refugee adult, asylee adult, asylee child, adult parolee. CO-1172 states the interaction; OQ-213 restated (superseded for adults after 2026-10-01). | CO-2400, CO-2401, CO-509, CO-1172, CO-617, S1700-S1705, S1729-S1731, CO-74, CO-75 |
| B-2 | Fixed. `chp_child_is_in_continuous_eligibility_period` (CO-2404, § 430.2 with the B exceptions through CO-2205, whose list § 430.2.B repeats and whose reasonable opportunity exception it cites), `chp_prenatal_coverage_end_month` and `chp_is_in_prenatal_coverage_period` (CO-2406, CO-2407, § 430.3 to the last day of the month 12 months after the birth), `chp_is_guaranteed_newborn` (CO-2410, § 430.5), the start-month fact CO-2402 and parameters CO-2403, CO-2405, CO-2409. CO-707 tests them after the Medicaid-eligible branch (a child whose income falls moves to Medicaid with a new period, § 430.2.A.i) and before the ineligibility reasons; new options `eligible_newborn` and `eligible_incarceration_limited`. Case CO-76. | CO-2402-CO-2410, CO-707, CO-76 |
| B-3 | Fixed; OQ-100 resolved as overruled. Supplied `ma_ltc_setting_requested` (CO-2411: institutional, hcbs, pace, none), `ma_resides_in_pace_service_area` (CO-2412) and `ma_can_live_in_community_without_jeopardy` (CO-2413), excerpt S1726 (460.150(b)(3), (c)). CO-652 reports eligibility for the requested setting, with `not_eligible_for_requested_setting` when the setting's own conditions fail; CO-654 tests both PACE conditions. CO-01/CO-02 p1 are `eligible_institutional` (see S-3 below). | CO-2411-CO-2413, CO-652, CO-654 |
| B-4 | Fixed. CODEOWNERS now routes every `volumes/co` chapter to placeholder teams mapped to the `volume.yaml` roles (`@org/hcpf-medicaid`, `@org/hcpf-ltss`, `@org/hcpf-chp`, `@org/hcpf-finance`, `@org/hcpf-eligibility-ops`, `@org/hcpf-state-plan`, and the CDHS/CDEC teams); the agencies replace them before branch protection is on. Items now carry `status` (Draft/Reviewed/Approved) and an `approval` record (`{role, by, date, commit}`); docs/conventions.md already listed Status, Approval and Effective in the item shape, so support was added to the engine (types, item-file order, governance: unknown status, undeclared role, Approved without every required signature). `effective` was already supported and is stated where a rule has a date (CO-2400 from 2026-10-01); an item without one is in force throughout, as before, rather than every derived item being stamped. Governance now warns on every item citing an excerpt marked `Verification: unverified` (`source.unverified`, 9 items: CO-642, CO-832, CO-887, CO-1981..CO-1985, CO-1987) and refuses Reviewed/Approved on any item that rests on one, directly or through what it reads (`status.unverified`), with unit tests (test/engine/approval-provenance.test.ts). docs/governance.md describes item-level approval of one chapter at a time. | src/engine/governance.ts, constraints.ts, types.ts, yaml.ts, src/ledger/markdown.ts, .github/CODEOWNERS |
| C-3 | Fixed. `ma_needy_young_person_category` (CO-2419, outcome) for § 8.100.4.H.1.a-g: Psych <21 (to 22 if still inpatient at 21), Alternatives to Foster Care (both against "the MAGI needs standard", read as the highest MAGI standard, OQ-512), and foster care, independent living, county custody, subsidized adoption and State responsibility at 18 (no income test; g not past 18 with subsidized adoption payments). Facts CO-2414-CO-2416, parameters CO-2417, CO-2418; CO-1176 counts it as full coverage. Case CO-77 p3. | CO-2414-CO-2419, CO-1176, CO-77 |
| C-4 | Fixed. `ma_is_eligible_for_transitional_medical_assistance` (CO-2430: earnings loss, three of the six prior months in the parent/caretaker category, twelve months, an employed parent or caretaker, a dependent child) and `ma_is_eligible_for_four_month_extension` (CO-2431: support income, three of six months enrolled, four months), with facts CO-2422-CO-2425 and parameters CO-2426-CO-2429; CO-551 reports `transitional_medical_assistance` and `four_month_extended` after the other groups. Case CO-77 p1. | CO-2422-CO-2431, CO-551, CO-77 |

### Should-fix

| Finding | Disposition | Where |
|---|---|---|
| C-5 | Fixed. `ma_hospital_presumptive_eligibility_category` (CO-2439, outcome): pregnant 195% (once per pregnancy), child 142%, parent/caretaker 68%, adult 19-64 at 133% ("19-65" read as the Adults range, OQ-513), employed with a disability 16+ at 450% of own income, limited family planning 133-260%; R.8 and R.9; the October 2026 limit for the adult groups. Facts CO-2432-CO-2437, parameter CO-2438. Case CO-78. | CO-2432-CO-2439, CO-78 |
| C-6 | Fixed: the current § 8.100.4.J adopts Express Lane (S1723). `ma_express_lane_status` (CO-2442, outcome) with facts CO-2440, CO-2441, CO-2444, the 90-day parameter CO-2443 and the period end CO-2445. | CO-2440-CO-2445 |
| C-7 | Fixed. `ma_continuous_eligibility_program` (CO-2446) records the program a period began in; CO-555 opens a period from SSI Mandatory, long-term care and foster care exit (Q.2.b-c, Q.3), which continue as MAGI-Child; `ma_child_is_in_non_magi_continuous_eligibility_period` (CO-2448) keeps CBwD (with the unpaid-premium exception, CO-2447), Pickle, DAC and limited family planning children in those programs (CO-620, CO-1159, CO-1161, CO-1154). | CO-2446-CO-2448, CO-555 |
| C-8 | Fixed. CO-2205 no longer ends a period for an inmate; CO-554 reports `incarceration_limited` for a child in a period who is an inmate (Q.1.b.ii.1, S1725), and CO-707 `eligible_incarceration_limited` (§ 430.2.B.ii). | CO-2205, CO-554, CO-707 |
| C-9 | Fixed. CO-549 excludes youth receiving subsidized adoption payments (H.2.a.i) and admits out-of-state youth 18 on or after 2023-01-01 (H.2.a.iii; CO-2420, CO-2421). H.2.a.ii is carried by CO-551's order; H.2.c needs no rule (the mother is on Medical Assistance at the birth, so CO-550 applies). | CO-549, CO-2420, CO-2421 |
| C-10 | Answered with a citation. CMS's June 30, 2026 letter (D-168, S1713): Colorado never implemented the expanded continuous eligibility for children to age three or for people leaving incarceration, and the authority expired June 30, 2026. § 8.100.3.Q's 12 months is the whole rule; noted on CO-555. | CO-555, S1713 |
| C-11 | Fixed. Retroactive coverage from applications on or after 2027-01-01: one month for expansion adults, two for others (Pub. L. 119-21 sec. 71112, S1706; CO-2472 read by CO-557; parameters CO-2449-CO-2451); CHP+ has no retroactive coverage (§ 430.1). Six-month renewals for expansion adults from 2027-01-01, Indians exempt (sec. 71107, S1707; CO-2455, parameters CO-2452-CO-2454); CO-1973's renewal look-back runs from the most recent determination, so it shortens without change. Address verification under 1396a(a)(89) is a process requirement, not an eligibility rule; not modeled. | CO-2449-CO-2455, CO-2472, CO-557 |
| C-12 | Fixed as far as the sources go. `ma_funding_source` (CO-2456, not an outcome): state-only, Title XIX emergency, Title XXI (state-only where CHP+ reaches a person without status, S1731), Title XIX, none. Aid codes are HCPF's (OQ-514). | CO-2456 |
| S-2 | Fixed. CO-652 tests income, resources, home equity and level of care before the transfer penalty (§ 8.100.7.F.2.c.ii starts the penalty only when otherwise eligible). CO-06 p1 is `ineligible_resources`; the stale "illustrative divisor" comment is removed (N-4). | CO-652, CO-06 |
| S-3 | Fixed. CO-01/CO-02 no longer supply `ma_mmmna_standard`; `npm run check` now fails when a case supplies a derived identifier unless the key is in conformance/known-failures.json. CO-08 (`cw_eligibility_status`, `cw_grant_amount`) and CO-83 (`meets_public_assistance_citizenship_requirement`) are listed there for the CDHS fix round, since this round does not edit cash or SNAP. | src/tools/check.ts, src/engine/cases.ts, CO-01, CO-02 |
| S-7 | Fixed. 28 current-text excerpts (S1732-S1759) replace the Cornell copies on every Medicaid/CHP+ item that cited only them (58 items plus 4 new ones); S175, S201, S203, S209 and S213 are replaced by their current equivalents on every Medicaid/CHP+ item; S201, S203 and S209 are relabelled as superseded. No Medicaid/CHP+ item now cites only a Cornell copy (88 still cite one beside current text). | sources.md, 78 items |
| S-8 | Fixed. CO-1715 carries the unused $20 to earned income (T1 changes from 967.50 to 957.50: (2,000 - 65 - 20) / 2). CO-619: no premium for the determination month or earlier (P.1.f.ii; CO-2462) or within 12 months postpartum (P.1.f.v). CO-621: the 5%/7.5% caps (Q.1.g.i; CO-2459-CO-2461), one premium per household on the oldest eligible child (Q.1.g.iii), the same two waivers. Both read dated income-band parameters (CO-2457, CO-2458; new type and pattern P48), overruling OQ-82 (resolved). Whether the CBwD COVID waiver has ended: OQ-511. | CO-1715, CO-619, CO-621, CO-2457-CO-2462 |
| S-10 | Fixed; OQ-217 resolved. CO-1190 follows the Internal Revenue Code: every discharge 2021-2025 excluded (Pub. L. 117-2 sec. 9675, S1709), death or disability discharges excluded from 2018 with no end (S670, and Pub. L. 119-21 sec. 70119 from 2026, S1708); the dates are parameters (CO-2463-CO-2465); § 8.100.4.C.1.b.xv flagged for HCPF cleanup. | CO-1190, CO-2463-CO-2465 |
| S-11 | Fixed; OQ-54 resolved and removed from CO-558 and CO-559. | OQ-54 |
| S-13 | Fixed. New roles LTSS policy owner (tags ltc, hcbs), Premium and finance owner (buy_in), Eligibility operations owner (verification), State plan coordinator (state_election, with Legal); the CHP+ owner joins `by_program.All`; `upstream_of_outcomes: true` adds each program's owner to every item its outcomes read, so the CHP+ owner signs the shared and Medicaid items CHP+ reads. | volumes/co/volume.yaml, src/engine/constraints.ts |
| S-14 | Done for sentence-initial history: 73 history sentences on 58 Medicaid/CHP+ items moved from `precision` to `rationale` (the precision keeps the reading itself). 30 items still mention a phase or fix round inside a sentence; they were left rather than rewritten by script. | 58 items |
| S-16 | Fixed for the case types named: refugee, asylee and parolee before and after 2026-10-01 (CO-74, CO-75), CHP+ continuous eligibility, prenatal postpartum and newborn (CO-76), TMA and foster care (CO-77), hospital presumptive eligibility (CO-78). Each case comment and each changed expectation in CO-01, CO-02 and CO-06 states its hand derivation. The CBMS training-environment comparison the reviewer asked for is HCPF's to run. | tests/cases.yaml |
| F-1 | Open question OQ-515: HCPF's annual memo setting the poverty-guideline date is on hcpf.colorado.gov, not fetchable. | OQ-515 |
| F-2 | Partly fixed. 2025 versions of the poverty guidelines (S1710), the SSI federal benefit rates and the SGA amounts (S1711). The 2025 CSRA, MMMNA cap, home equity limit and MSP resource limits were not found at a fetchable URL (OQ-516). | CO-181, CO-182, CO-235, CO-236, CO-1802, CO-1803 |
| F-3 | Fixed. 2027 SSI rates ($1,029/$1,544) and SGA ($1,770/$2,950) loaded from SSA's October 2026 notice (S1712); indexed parameters carry `review_by`, and governance warns once it passes (`versions.review_due`). | CO-235, CO-236, CO-1802, CO-1803, 18 parameters |

C-1 and C-2 are B-1 and B-2. S-1 is C-7 and S-12 is C-9.

### Notes

| Note | Disposition |
|---|---|
| C-13 | Recorded as OQ-519 (the Alternative Care Facility allowance and IM 25-030 are not fetchable). |
| C-14 | CO-653's precision now says eligible means eligible, not enrolled (waiting lists are not a test). |
| N-1 | CO-1151's precision now says emergency coverage pays for the emergency, not the nursing facility stay. |
| N-2 | Accepted; no change (G.8's letter). |
| N-3 | No change: verification status is computed for every person requesting coverage; a pending CHP+ verification for a child CHP+ reports `ineligible_medicaid_eligible` asks for nothing CHP+ will use. |
| N-4 | Done (CO-06). |
| N-5 | Recorded as OQ-520; the case keeps 0, the reading under which the State's Part B buy-in pays her premium. |
| N-6 | No change needed: CO-539's current text no longer says 185% (checked). |

### Section 4 questions

OQ-54, OQ-82, OQ-97 and OQ-100 are resolved, OQ-95 is partly resolved (siblings remain), OQ-213 is restated as superseded for adults from 2026-10-01, OQ-217 is resolved, and OQ-390's Medicaid part is resolved (CO-605, CO-663 subtract SSI-method exclusions through CO-2470 and CO-2471; CO-641 takes none, since § 8.100.7.A defines its gross income before SSI disregards). The reviewer's accepted readings (OQ-62, OQ-144, OQ-202, OQ-203, OQ-209, OQ-215, OQ-216, OQ-393, OQ-396, OQ-470-OQ-473) stand. Still for HCPF offices or Legal, unchanged: OQ-50 (cite the approved MAGI SPA page), OQ-83, OQ-200, OQ-201, OQ-204, OQ-214, OQ-302, OQ-303, OQ-410-OQ-413, and the OM 25-073 figures (OQ-99, OQ-212), which stay unverified and now draw the governance warning.

### Design limits named for this round

- OQ-82: done (income-band parameter type, P48).
- OQ-97: done (`ma_community_spouse_income`, CO-2467, across the spouse edge, with CO-2466 for payroll taxes; CO-656 reads it).
- OQ-95: done for children and parents (`ma_family_allowance_members`, CO-2469, from the child, parent and tax-dependent edges and CO-2468); siblings need a sibling edge.
- OQ-390: done for CO-663 and CO-605; CO-641 answered from the rule text.

Values the round changed, by hand: CO-01 and CO-02 p1: `eligible_institutional`; MMMNA 2,705.00 + max(0, 1,100 - 811.50) = 2,993.50; CSIA 2,993.50 - 1,180 = 1,813.50; patient payment 2,030 - 110.36 - 1,813.50 = 106.14. CO-06 p1: CSRA min(180,000, 162,660) leaves 17,340 > 2,000, so `ineligible_resources`. CO-06 p3: (2,400 - 65 - 20) / 2 = 1,157.50, 87.0% FPL, $25 band, but $0 for the determination month (November) and $25 from December.

Check results at the final commit: `node scripts/sync-manifest.mjs co`; `npm run governance -- --volume co` 0 errors; `CHECK_BASE=origin/main npm run check` passes for every volume; `npm run typecheck` and `npm test` pass.
