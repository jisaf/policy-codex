# Final verification pass 3: Health First Colorado (Medicaid) and CHP+

Reviewer: fresh, independent third pass, 2026-11-22, commit 6f565ca (branch ccr-9d19bf4c-wmnwcl, working tree clean). Scope: 10 CCR 2505-10 § 8.100 (MAGI groups, needy persons under 21, former foster care, TMA and the four-month extension, presumptive eligibility, Express Lane, continuous and retroactive eligibility, community engagement, SSI-related and protected groups, OAP Health Care, the Medicare Savings Programs, both Buy-In programs, long-term care with HCBS and PACE, post-eligibility treatment of income, emergency Medicaid, BCCP, family planning and the Reproductive Health Care Program, the 1396b(v)(5) limit, Cover All Coloradans), 10 CCR 2505-3 (CHP+), and the document-collection rules of both. Nothing in the repository was edited except this file. Scratch households and the evaluation snapshot (a `git archive` of 6f565ca with scratch cases appended) are in the reviewer's scratchpad (`rv3-medicaid/`).

Governing text read directly: D-65 (§ 8.100, SOS version effective 11/14/2026) §§ 8.100.3.E-F, 8.100.3.R, 8.100.4.D-J, 8.100.5.B-C, 8.100.5.H, 8.100.5.K, 8.100.5.M.2, 8.100.6.L-Q, 8.100.7.B, 8.100.7.T-V; D-66 (10 CCR 2505-3, effective 08/30/2026) §§ 110-180, 320-330, 430; D-55 § 8.482.33 (NF PETI); D-72 and D-74 (2026 SSI, spousal and MSP figures); excerpts S318, S638, S1503, S1506, S1718, S1719, S2400-S2413, S2900, S244. Fetched for this pass from medicaid.gov (allowed host): CMCS Informational Bulletin of November 15, 2024, "2025 SSI, Spousal Impoverishment, and Medicare Savings Program Resource Standards" (https://www.medicaid.gov/federal-policy-guidance/downloads/cib11152024.pdf).

Mechanics: `npm run check` OK at 6f565ca (conformance self-check: 3313 cases, 5994 checked, 5994 passed); `npx tsc --noEmit` OK; `npm run export -- --volume co` wrote 1802 items. UI-only commits landed during the pass (HEAD 35a1e16; `git diff 6f565ca 35a1e16 -- volumes src/engine` is empty). At 35a1e16: `npm run check` OK (same counts) and vitest 981 of 981. An earlier vitest run straddled that merge and failed 39 UI routing tests; the clean re-run passes.

## Verdict

**4 P1 found**, all in code the two earlier passes did not change or did not test, each reproduced on a scratch household:

- **F3-1** The Children with Disabilities Buy-In tests MAGI income, but § 8.100.6.Q.1.b and § 8.100.5.H.1 apply the SSI-related income rules and the $20 and $65-plus-half disregards. A disabled child in a working family over 300% MAGI is reported ineligible where the rule's countable income is about half that.
- **F3-2** CHP+ excludes only children and pregnant women who are MAGI-eligible. 10 CCR 2505-3 § 120.1.B excludes anyone "eligible to receive assistance under Title XIX". An SSI child and a Buy-In child are both reported CHP+ eligible_child.
- **F3-3** "Through the end of the month in which they turn 19" (§ 8.100.4.G.2.a, ix.1, CHP+ 110.1.B.5.o) and "until the end of the month of the individual's 26th birthday" (§ 8.100.4.H.2) never hold after the birthday. CO-564's birth-month test compares year-months (2007-11 with 2026-11), so it is never true. CO-549 tests age < 26 only.
- **F3-4** Transitional Medical Assistance cannot reach a dependent child. § 8.100.4.I.2 gives the family's remaining months to the dependent children, but CO-2430 requires the person to be a caretaker of a dependent child.

All 9 earlier Medicaid/CHP+ P1s (F-1 to F-7, F2-1, F2-2) and both earlier verification P1s (V-3, V-6) are **fixed**, with no regression found.

Stopping-rule item 2 is **not met** for one question. OQ-516 is classed "blocked on a named document", but the document it names (CMS's 2025 standards and the 2025 MSP resource limits) is on medicaid.gov, an allowed host (finding P2-1 below). The other 45 open questions in scope are correctly classed.

There are also 3 P2 and 4 P3 findings. The carried P2 (trust, transfer, life estate and annuity tests as caseworker findings) stays P2; it is not a P1.

## Earlier P1s: confirmation

| earlier id | status | evidence (engine at 6f565ca) |
|---|---|---|
| F-1 pregnancy in retroactive months; postpartum after a retroactive birth | fixed | CO-110: p1 pregnant/eligible 2026-06 to 2027-08, none/ineligible_income 2027-09; 2026-05 ineligible_before_coverage_period; p3 needy_newborn from the birth month 2026-08. Matches § 8.100.3.E.2, G.5 and 1396a(e)(16)(A). |
| F-2 hospital PE status declaration | fixed | CO-111: p3 and p4 (undocumented) pregnant; p5 (undocumented adult) none; p6 (child at 151.5%) none; p2 employed_disabled. Matches R.2.a, b, d and f. |
| F-3 patient payment deductions | fixed | CO-112: 815.34 in November and 1,018.24 in December. CO-113: 264.24 and 467.14. Recomputed from V.3.b.ii.1-8, V.3.c, d.iii-iv, f, g.ii. HMA maximum: 4,066.50 / 2,643.75 x 1,995 - 1,995 + 598.50 = 1,672.12, rounded to 1,672. Other health insurance premiums are not deducted. That matches V.3.b.ii.8.c with § 8.482.33.C (D-55), which puts private health insurance premiums in NF PETI. |
| F-4 community spouse's Q.2 expenses | fixed | CO-112 MMMNA 3,571.40 = 3,143.50 (capped) + 427.90 (Q.2). CSIA 1,671.40. |
| F-5 QMB/QDWI effective month | fixed | CO-06 p2: msp_category none in 2026-11 and qmb in 2026-12 (L.10-11). |
| F-6 MSP COLA disregard | fixed | CO-114 in 2027-01: COLA 38, disregard 38, qmb. |
| F-7 CBwD Q.1.e-f | fixed | CO-140: p3 children_with_disabilities with employer share 0.6 and enrolled. Q.1.e is in CO-620. (The income method CO-620 uses is a separate P1, F3-1.) |
| F2-1 retroactive pregnancy period without a request | fixed | CO-137 (requested): start 2026-06; pregnant/eligible in 2026-09 and 10; CHP+ ineligible_medicaid_eligible. CO-138 (not requested, no start date): start 2026-09; none/ineligible_income; CHP+ eligible_prenatal. CO-565 scans the window only when CO-4100 is true (§ 8.100.3.E.1-2). |
| F2-2 VA A&A in a State Veterans Home | fixed | CO-139: eligibility income 1,600 (A&A excluded, K lead-in); payment 1,600 - 90 + 300 = 1,810 (K.2). CO-4103 and CO-658 match § 8.100.5.K.1-2. "Dependents" is OQ-720. |
| V-3 non-requesting members' income | fixed | CO-01 p4, 2026-10: ma and chp verification status pending, count 3. CO-1411/CO-1412 sum over ma_income_verification_members (CO-3633). |
| V-6 MSP-only non-liquid resources | fixed | CO-1405's MSP-only arm reads liquid_resources_value and retirement_accounts_value, or a questionable attestation (435.952(e)(2)-(4)). |

Earlier P2 dispositions:

- Round 1: P2-1 (OQ-520), P2-2 (OQ-550, trafficking and SIV statutes), P2-4 (OQ-624) and P2-5 (OAP not retroactive) are fixed.
- Round 2: P2-1 became OQ-721. I confirm it as a state policy choice: V.1.e.i and V.3.b.ii.8.a count from admission, V.1.e.ii from LTC eligibility. P2-2 is fixed: CO-3618 needs shelter_costs_verification_document_received, CO-3619 needs medical_expenses_verification_document_received, and CO-3604 is "as verified".
- **Carried P2-3 (§ 8.100.7.E-I as caseworker findings) stays P2, not a P1.** CO-824, CO-825, CO-1577 and CO-1579 are defined supplied findings with meanings, and modeled rules (penalty months, CSRA) read them. B.2.a's disclosure documents are verification elements (CO-1631 to CO-1639, CO-2246 to CO-2249). No outcome is wrong when the finding is right.

## Findings

| id | sev | item(s) | governing excerpt | what is wrong | proposed fix |
|---|---|---|---|---|---|
| F3-1 | **P1** | ma_cbwd_eligible (CO-620), ma_cbwd_premium (CO-621), ma_buy_in_category (CO-622); test CO-140 | § 8.100.6.Q.1.b (D-65:3063-3071, S318): "Household income will be considered and must be less than or equal to 300% of FPL after income disregards. The following rules apply: i) 8.100.4.E - MAGI Household Requirements ii) 8.100.5.F - Income Requirements iii) 8.100.5.F.6 - Income Exemptions iv) 8.100.5.H. Income Allocations and Disregards". § 8.100.5.H.1 (D-65:2381, S1506): "The following income allocations and disregards are only applicable to SSI related, OAP, Medicare Savings Programs (MSP), **the Medicaid Buy-In Program for Children with Disabilities** and the Medicaid Buy-In Program for Working Adults with Disabilities." H.4.a-b: $20 general disregard; "$65 Plus One Half Remainder Earned Income Disregard"; H.4.c: child support to the child reduced by one third. | CO-620 tests `ma_magi_household_income_pct_fpl` (CO-504), the MAGI income of the MAGI household, with no § 8.100.5.F income rules and no § 8.100.5.H disregards. Its precision states the choice ("reuses ma_magi_household_income_pct_fpl rather than the SSI-methodology income items"), but no open question records it, and the text names 5.F, 5.F.6 and 5.H as the income rules. Only the household composition is MAGI (Q.1.b.i). Scratch **X-CBWD** (CO-140 with the parent's wages 5,600; household of 2, 1,803.33): the engine gives 310.5% and none for the disabled child. Under 5.H the countable income is (5,600 - 20 - 65) / 2 = 2,757.50 = 152.9% (lower still with H.3's allocations), so she is eligible. The error runs both ways: 5.F counts child support, which MAGI does not. The premium band (CO-621) reads the same MAGI percentage. For stored CO-140, 5.H gives (5,050 - 85) / 2 = 2,482.50 = 137.7%, the $70 band, not the stored 120, if the premium follows the same income. | Add an item for the CBwD countable household income: the MAGI household (Q.1.b.i), each member's income under § 8.100.5.F with the 5.F.6 exemptions, less the 5.H disregards (the $20 general and $65-plus-half earned, H.4.c's one-third child support reduction, H.4.d's student exclusion), and read it in CO-620 and CO-621. How H.3's allocations and the per-couple $20 apply to a family household is not stated: record that as a state-policy-choice OQ with the reading chosen. Re-derive CO-140 and add X-CBWD as a stored case. |
| F3-2 | **P1** | chp_child_is_eligible (CO-705), chp_prenatal_is_eligible (CO-706), chp_eligibility_status (CO-707); ma_magi_is_fully_eligible (CO-562) precision | 10 CCR 2505-3 § 120.1 (D-66:197-201, S244): "To be eligible for the Children's Basic Health Plan, an eligible person shall not: ... B. Be eligible to receive assistance under Title XIX of the Social Security Act". 42 CFR 457.310(b)(2)(i): a targeted low-income child is not "found eligible or potentially eligible for Medicaid under policies of the State plan". | CO-705/706 exclude only `ma_magi_is_fully_eligible`, and CO-707's ineligible_medicaid_eligible row reads only that. CO-562's precision says this is what 120.1.B means, but SSI-related, protected-group, Buy-In, needy-under-21 and LTC/HCBS eligibility are all Title XIX. The volume already states that wider test as ma_has_full_coverage_category (CO-1176), used for BCCP and family planning. Scratch **X-CHPDIS** (CO-140 with no employer coverage, wages 4,500, 249.5%): p3 is ma_buy_in_category children_with_disabilities and chp_eligibility_status eligible_child. Scratch **X-CHPSSI** (the same child receiving SSI): ma_ssi_related_category ssi_recipient and CHP+ eligible_child. The rule gives CHP+ ineligible (Medicaid-eligible) in both. | Read ma_has_full_coverage_category (CO-1176) in CO-705, CO-706 and CO-707's ineligible_medicaid_eligible row, checking for a cycle (CO-1176's cone reads no CHP+ eligibility item today, only the supplied chp_is_requesting_coverage). Correct CO-562's precision. Add X-CHPSSI as a stored case. If HCPF lets a family choose CHP+ over the children's Buy-In (Q.4's "opt out"), record that as a state-policy-choice OQ with 120.1.B and 457.310(b)(2) checked; it cannot cover an SSI recipient. |
| F3-3 | **P1** | ma_is_under_child_age_or_turns_nineteen_this_month (CO-564), ma_is_former_foster_care_category (CO-549); readers CO-545, CO-539, CO-1173, CO-562, CO-704-CO-708, CO-555/CO-561 | § 8.100.4.G.2.a (D-65:1937, S638): "Children are eligible for Children's MAGI Medical Assistance through the end of the month in which they turn 19 years old." § 8.100.3.G.1.g.ix.1 (D-65:599) and 2505-3 § 110.1.B.5.o (D-66:173): "whose 19th birthday occurred in the current month". § 8.100.4.H.2 (D-65:2011, S1718): "until the end of the month of the individual's 26th birthday". | CO-564's second disjunct is `["=", [month_of, date_of_birth], [month_of, [det_date]]]`. It compares the birth year-month (2007-11) with the determination year-month (2026-11), so it is never true. From the birthday to the end of that month, a 19-year-old is outside the Children's group, Cover All Coloradans and CHP+. None of CO-564's tests has a determination date after the birthday in the birthday month. CO-549 tests `age < 26` at the determination date, with no birthday-month rule. Scratch **X-19** (single, born 2007-11-05, determination 2026-11-10, 1,850 a month = 139.1% of 1,330): none / ineligible_income. **X-19B** (born 2007-11-25, the same month): child / eligible. G.2.a gives child for both. A former foster youth whose 26th birthday fell earlier in the determination month is likewise none. CO-539 picks the child standard for the 5% disregard on `age < 19` alone, so after the fix a person in the birthday month at 142-147% would still miss the disregard. | Compare the birth month and day with the determination month (for example, the 19th birthday falls in the determination month: `["=", [month_of, [years_after, 19, date_of_birth]], [det_month]]`, or month-of-year equal with age = 19). Add a test with the determination date after the birthday in the birthday month. Give CO-549 the same end-of-month rule at 26 (H.2), and read CO-564 in CO-539's child-standard arm. Add X-19 as a stored case. |
| F3-4 | **P1** | ma_is_eligible_for_transitional_medical_assistance (CO-2430); ma_magi_category (CO-551) | § 8.100.4.I.2 (D-65:2037-2041, S1719): "Any dependent child or Parent/Caretaker Relative who was or becomes part of the Medical Assistance household after the individual has begun receiving Transitional Medical Assistance is eligible for the remaining months of Transitional Medical Assistance. a. A dependent child in the household who received Medical Assistance through continuous eligibility, but is no longer eligible for Medical Assistance based on a redetermination, is eligible for the family's remaining months". I.3: "the household must include a dependent child". | CO-2430 requires `[exists, ma_caretaker_relative_of, [of, [P], ma_is_dependent_child]]`: the person must be the parent or caretaker of a dependent child. A dependent child is no one's caretaker, so a child can never be TMA-eligible. CO-2430's precision says a joining member takes the family's ineligibility month and history (I.2), but the caretaker test still fails for the child. Scratch **X-TMA** (CO-77 with p1 earning 3,000 = 166.4%; p2, 7, given the family's first month of ineligibility, reason and history as the precision directs): p1 transitional_medical_assistance; p2 false, none, CHP+ eligible_child. The rule gives p2 the family's remaining TMA months (Medicaid, so not CHP+ under 120.1.B). | Test I.3's "the household includes a dependent child" over the household (the MAGI household or the caretaker's), not the person's own caretaker relationships. Admit a dependent child or parent/caretaker of the TMA household for the family's remaining months (I.2, I.2.a-b), reading the TMA parent's first month of ineligibility rather than restated facts. Add X-TMA as a stored case. |
| P2-1 | P2, **fails stopping-rule item 2** | OQ-516; ma_msp_resource_limit_individual/couple (CO-807, CO-808), ma_csra_minimum/maximum (CO-827, CO-828), ma_mmmna_cap (CO-830), ma_home_equity_limit (CO-831) | CMCS Informational Bulletin, November 15, 2024 (medicaid.gov, allowed host): "Effective January 1, 2025, the resource standards for single and married QMBs, SLMBs, and QIs will be, respectively, $9,660 and $14,470"; its 2025 chart: MMMNA maximum 3,948.00, CSRA minimum 31,584.00, maximum 157,920.00, home equity minimum 730,000.00. | OQ-516 is classed "blocked on a named document" because the 2025 chart and MSP limits were "not found on an allowed host". They are on medicaid.gov at federal-policy-guidance/downloads/cib11152024.pdf (fetched 2026-11-22). The six parameters start on 2026-01-01, so a 2025 month (the retroactive months of a January to March 2026 application) has no value. | Fetch the bulletin as a document, add the 2025 versions (9,660 / 14,470; 31,584 / 157,920; 3,948; 730,000) ending 2026-01-01, and resolve OQ-516. |
| P2-2 | P2 | ma_requires_verification_of_resources (CO-1405), ma_requires_verification_of_unearned_income (CO-1404) | § 8.100.6.Q.3 (D-65:3107): "Verification requirements will follow the MAGI Category Verification Requirements found at 8.100.4.B." Q.1.c and P.1.c: "Resources are not counted in determining eligibility." | A disabled applicant is asked for § 8.100.5.B.1.d-e documents (all unearned income, all resources) whatever the program. The MSP-only application has its own arm (V-6), but a Buy-In-only application does not. A child applying only for the Children with Disabilities Buy-In with a savings account reads resource verification pending and can go past_due. Not P1: the same child is screened on all bases (§ 8.100.6.L.8 states that right for MSP), and the SSI-related screen needs the resources. | Add a Buy-In-only arm (as ma_application_is_msp_only), or record in CO-1405 that resources are verified for the SSI-related screen of every disabled applicant, citing Q.3. |
| P2-3 | P2 (carried) | CO-824, CO-825, CO-1577, CO-1579 | § 8.100.7.E-I | As in both earlier passes. | Deferred P2. Confirmed not P1 (above). |
| P3-1 | P3 | MSP, Buy-In, SSI-related and LTC outcomes | § 8.100.3.E.1; § 8.100.5.C.1; § 8.100.6.M.5-6, N.3 | The P3-3 fix of pass 2 gates only the MAGI status (CO-4101) and OAP (CO-1156). ma_msp_category (SLMB, QI), ma_buy_in_category, ma_ssi_related_category and ma_ltc_eligibility_status still answer "meets the criteria" for a month before the retroactive window. | Gate them on CO-4101's months (with the non-MAGI retroactive rules: SLMB 3 months, QI-1 3 months, QMB none), or say so in each outcome's meaning. |
| P3-2 | P3 | coverage | § 8.100.3.F.1.i (D-65:431): "Children age 18 and under who would otherwise require institutionalization ... as described in 1902(e)(3)" | No item cites F.1.i. Colorado provides this group through the Children with Complex Health Needs waiver (ma_hcbs_waiver_eligible CO-653 with cwchn, CO-1164; the child's own income through the 300% special income group, CO-642). | Cite F.1.i in CO-653's sources and the coverage notes. |
| P3-3 | P3 | ma_patient_payment (CO-658) | § 8.482.33.C (D-55): "Private health insurance premiums, deductibles, or co-insurance ... Monthly premium payment paid by the resident for private health insurance", through PETI-IME prior authorization | CO-658's precision rests "other premiums are not deducted" on V.3.b.ii.8.c alone. The text that puts private premiums in NF PETI is § 8.482.33.C, which the item does not cite. | Cite D-55 § 8.482.33.C in CO-658 and CO-835. |
| P3-4 | P3 | ma_home_maintenance_allowance (CO-3618) | § 8.100.7.V.3.g.ii: "For a Long-Term Care institution recipient with no family at home ... not to exceed 6 months" | "No family at home" is tested as `[not, [exists, lives_with, [in_group, [P], is_related_to]]]` on the resident's current household (the facility), and the six months count from institution_entry_date, which the text does not fix (entry or eligibility, as OQ-721 records for Part B). | State both readings in the precision, or link OQ-721's reasoning. |

## Coverage map

Every pathway, category, program and computation in the current text, with the items that carry it. The D-65 headings § 8.100.3.A-R, 8.100.4.A-J, 8.100.5.A-P, 8.100.6.A-Q and 8.100.7.A-V, the § 8.100.3.F.1 group list (a-n), and D-66 §§ 110-430 were re-walked for this pass.

| Rule | Pathway or computation | Item(s) |
|---|---|---|
| § 8.100.4.G.2 | Children ≤142%, through the month of the 19th birthday | CO-545, CO-564 (**F3-3**), CO-191 |
| § 8.100.4.G.3 | Parents and caretaker relatives ≤68% | CO-547, CO-2606, CO-192 |
| § 8.100.4.G.4; 435.119 | Adults 19-64 ≤133%; MEC; community engagement from 2027 | CO-548, CO-1975, CO-193 |
| § 8.100.4.G.5; § 8.100.3.E | Pregnant women ≤195%; month-level pregnancy; coverage period with a requested retroactive start; 12 months postpartum | CO-546, CO-3601, CO-3600, CO-4100, CO-565, CO-566, CO-560 |
| § 8.100.4.G.6-8; E.3 | Legal Immigrant Prenatal; needy newborn (including retroactive birth); limited family planning, RHCP | CO-509, CO-550, CO-087, CO-1154, CO-1155 |
| § 8.100.4.C-E | MAGI income, 5% disregard (highest standard), household | CO-500-CO-504, CO-539 (**F3-3**), CO-183 |
| § 8.100.4.H.1 | Needy persons under 21 | CO-2419 (OQ-512) |
| § 8.100.4.H.2 | Former foster care to the end of the 26th-birthday month | CO-549 (**F3-3**) |
| § 8.100.4.I | TMA (family), four-month extension | CO-2430 (**F3-4**), CO-2431 |
| § 8.100.4.J; 2505-3 § 180 | Express Lane, 90 days pending citizenship | CO-2442, CO-2445 |
| § 8.100.4.F; § 8.100.3.R | MAGI PE; hospital PE | CO-558, CO-559, CO-2439 |
| § 8.100.3.Q; 2505-3 § 430.2 | Continuous eligibility (MAGI and non-MAGI); CHP+ CE | CO-555, CO-561, CO-2404 |
| § 8.100.3.E; sec. 71112 | Retroactive coverage; months before coverage | CO-557, CO-2472, CO-4101 |
| sec. 71107; 435.550-560 | Six-month renewals; community engagement | CO-2455, CO-1974, CO-3161-CO-3165 |
| § 8.100.3.B, G; 1396b(v)(5) | Residency; citizenship and immigration; federal payment limit | CO-2250, CO-509, CO-1172, CO-2400, CO-3034 |
| § 8.100.3.G.1.g.ix; C.R.S. 25.5-2-104, 25.5-5-201(6) | Cover All Coloradans | CO-1173, CO-1174, CO-1175, CO-562 |
| § 8.100.3.F.1.k | Emergency Medicaid | CO-1151, CO-510 |
| § 8.715 | BCCP | CO-1152 |
| § 8.100.3.F.1.b-e, h; § 8.100.6.C-E, I, J | SSI-related (incl. non-citizens but for status), Pickle, disabled widow(er)s, DAC, 1619(b) | CO-611, CO-612, CO-1159, CO-1161, CO-1162, CO-1163 |
| § 8.100.6.F-H | 1972/1973/1983 closed cohorts | not modeled (OQ-209) |
| § 8.100.3.F.1.j; § 8.100.6.K; §§ 8.940-8.942 | OAP SISC B, OAP Health Care (not retroactive) | CO-1177, CO-1156 |
| § 8.100.6.L-O | QMB (effective month, no retroactive months, COLA), SLMB, QI-1, QDWI | CO-613-CO-617, CO-3620-CO-3629 |
| § 8.100.3.F.1.l; § 8.100.6.P | Buy-In for working adults | CO-618, CO-1715, CO-619 |
| § 8.100.3.F.1.m; § 8.100.6.Q | Buy-In for children (Q.1.b income method **F3-1**; Q.1.e-f; premiums) | CO-620, CO-621, CO-3630-CO-3632 |
| § 8.100.3.F.1.f-g; § 8.100.7.A-B | 300% special income group, income trust; HCBS waivers (incl. CwCHN for F.1.i, **P3-2**), PACE | CO-640-CO-642, CO-653, CO-1164, CO-654 |
| § 8.100.7.E-J | Trusts, transfers, life estates, annuities, penalty | CO-649, CO-659, CO-824, CO-825 (P2-3) |
| § 8.100.7.K-S | CSRA, increased CSRA, MMMNA with Q.2, CSIA, family allowance | CO-646, CO-1977, CO-655, CO-3619, CO-656, CO-657 |
| § 8.100.5.M.2 | Home equity | CO-650, CO-831 |
| § 8.100.7.T, V; § 8.100.5.K; § 8.482.33 | Patient payment: PNA (veterans $90), earned reserve, MIA, family, HMA, tax, garnishment, Part B/D, LTC insurance, VA A&A in a State Veterans Home; other premiums via NF PETI | CO-658, CO-3615-CO-3618, CO-3602-CO-3607, CO-1987, CO-4102, CO-4103 |
| § 8.100.7.B.3 | Alternative Care Facility | not modeled (OQ-519) |
| 2505-3 §§ 110, 120 | CHP+ child 142-260%, prenatal 195-260%, status, other coverage, Title XIX exclusion (**F3-2**), institutions, public agency | CO-704-CO-707, CO-2706, CO-2707, CO-1978 |
| 2505-3 §§ 170, 320-330, 430.3-5 | CHP+ PE, cost sharing, prenatal period, newborn | CO-708, CO-2228-CO-2231, CO-2407, CO-2410 |
| § 8.100.4.B, 5.B, 3.H; 435.940-965; 2505-3 § 130 | Verification | see Verification |

Out of scope by the text's own terms: the COVID-19 limited group (F.1.n), ended 2023.

## Rules checked against the text (52)

Figures confirmed (current values and dates):

- FPL 2026: 15,960 / 21,640 / 27,320 / 33,000, plus 5,680 each, from 2026-01-01 (OQ-515). Publication 2026-01-15 (CO-3625).
- FBR 994 / 1,491 (2026) and 1,029 / 1,544 (2027); 300% = 2,982.
- D-72, 2026 (CIB of April 27, 2026): CSRA 32,532 / 162,660; MMMNA maximum 4,066.50; home equity 752,000.
- D-74, 2026: MSP resources 9,950 / 14,910.
- MMMNA standard 2,705 from July 2026 (2,643.75 before). HMA maximum 1,672. PNA 110.36 and divisor 10,814.64 (OQ-212).
- WAwD bands 25/90/130/200 and CBwD bands 70/90/120 (P.1.f.iii, Q.1.g.iv). CHP+ 142/195/260.

| # | Item | Check | Result |
|---|---|---|---|
| 1 | CO-565 | G.5 start; E.1-2 request | ok |
| 2 | CO-566 | lock-in, approval, income verification at start | ok |
| 3 | CO-4101 | months before coverage | ok (P3-1 for non-MAGI) |
| 4 | CO-4100 | E.1-2 one fact; no proof of service | ok |
| 5 | CO-551 | order; pregnant arm any(category, period) | ok |
| 6 | CO-554 | before-coverage first; lock-in fallback | ok |
| 7 | CO-3601 | month-level pregnancy | ok |
| 8 | CO-546 | 195%, disregard | ok |
| 9 | CO-548 | 19-64, Medicare, MEC, 133% | ok |
| 10 | CO-539 | highest standard | **F3-3** (child arm) |
| 11 | CO-545 / CO-564 | 142%, birthday month | **F3-3** |
| 12 | CO-547 | 68% | ok |
| 13 | CO-549 | H.2 to end of the 26th-birthday month | **F3-3** |
| 14 | CO-2419 | H.1.a-g | ok (OQ-512) |
| 15 | CO-2430 | I.1-3 | **F3-4** (I.2) |
| 16 | CO-2431 | I.5 | ok |
| 17 | CO-557 / CO-2472 | E.1; sec. 71112 | ok |
| 18 | CO-2439 | R.1-2, 8-9 | ok |
| 19 | CO-1151 / CO-510 | F.1.k, ix | ok |
| 20 | CO-1152 | § 8.715.2 | ok |
| 21 | CO-1154 / CO-1155 | G.8, E.3 | ok (OQ-204) |
| 22 | CO-611 / CO-612 | 6.C, F.1.b | ok |
| 23 | CO-1156 | 8.941.1.E | ok |
| 24 | CO-613 | L.2-4, L.12 | ok (OQ-624) |
| 25 | CO-614 | M.2, M.7 | ok |
| 26 | CO-615 | N.4, N.6 | ok |
| 27 | CO-616 | O.2-4 | ok |
| 28 | CO-617 / CO-3622 / CO-3623 / CO-3624 | L.10-11, O.5 | ok (OQ-621) |
| 29 | CO-3627 / CO-3628 / CO-3629 | COLA, December category, publication month | ok (OQ-622) |
| 30 | CO-618 / CO-1715 | P.1.a-e; $20 to earned; applicant only | ok |
| 31 | CO-619 | P.1.f bands, cap, determination month, postpartum | ok |
| 32 | CO-620 | Q.1.a-f | **F3-1** (Q.1.b) |
| 33 | CO-621 | Q.1.g | **F3-1** (income it reads); OQ-144, OQ-511 |
| 34 | CO-622 | WAwD before CBwD | ok |
| 35 | CO-642 | A.1, 300% of 994 | ok |
| 36 | CO-641 | LTC gross income; K lead-in | ok |
| 37 | CO-646 / CO-1977 | M.1, S.1 | ok |
| 38 | CO-655 / CO-3619 | Q.1-4, Q.2 | ok (OQ-620) |
| 39 | CO-656 / CO-657 | R.2; T.1.c (standard MMMNA / 3) | ok |
| 40 | CO-650 | 5.M.2.a.ii ("less than") | ok |
| 41 | CO-649 | F.2.c divisor | ok (OQ-212) |
| 42 | CO-658 | T.1, V.3.b-i, 5.K.2, 8.482.33.C | ok (P3-3; OQ-721) |
| 43 | CO-3616 / CO-3615 | V.3.d.iii, f.i-iii | ok |
| 44 | CO-3617 / CO-3618 | V.3.g.ii.2.a-b | ok (P3-4) |
| 45 | CO-4103 | 5.K.1-2 | ok (OQ-720) |
| 46 | CO-704 | 110.1.E-F, § 150.2 disregard | ok |
| 47 | CO-705 / CO-706 / CO-707 | 110.1, 120.1 | **F3-2** (120.1.B) |
| 48 | CO-708 | 170.1, 170.5-6 | ok |
| 49 | CO-2407 / CO-2410 | 430.3, 430.5 | ok |
| 50 | CO-1404 / CO-1405 | 5.B.1.d-e; 435.952(e) | ok (P2-2) |
| 51 | CO-1411 / CO-1412 / CO-1415 / CO-3633 | counts over members | ok |
| 52 | CO-1416 / CO-1417 / CO-3634 | 2505-3 § 130.1 | ok |

## Elements

`npm run export -- --volume co` gives 1,802 items. From the 39 declared Medicaid and CHP+ outcomes, 865 items are reachable through `uses`, including all 46 items numbered CO-3600 and up that the fix rounds added (CO-3600-CO-3635, CO-4100-CO-4103, and six SNAP items reached through shared facts). Every identifier resolves. The only unresolved name is the engine's built-in `relationships`. No undefined element.

New facts appear in stored cases:

- ma_retroactive_coverage_requested: CO-110, CO-137, CO-138.
- resides_in_state_veterans_home: CO-139.
- The employer-coverage facts: CO-140.
- The LTC deduction facts: CO-112, CO-113.

Every new parameter is either a rule constant stated in the text (6 months, 150%, 30%, 1, 2, $65, one half, 45 days, 50%) or dated (CO-3625). The statute_override notes in scope (CO-509, CO-2400, CO-658, CO-1172, CO-1185, CO-1190, CO-2706) each state the statute, the rule they override and why.

## Verification (document collection)

Modeled for Medicaid and CHP+:

- **Identity and status:** SSN (CO-1401); citizenship and identity with the 435.406/407 tiers (CO-1395-CO-1399, CO-2214); immigration status and the reasonable opportunity period (CO-1622, CO-1413, CO-1347).
- **Income:** earned income with reasonable compatibility and the 30-day period (CO-1402, CO-1403, CO-1640). ABD unearned income in the month or the month before (CO-1404), over every member whose income counts (CO-3633; V-3).
- **Resources:** ABD resources; MSP-only non-liquid on attestation (CO-1405; V-6).
- **Verified only if questionable:** pregnancy, residency, age and household composition (CO-1406-CO-1409).
- **LTC (B.2.a):** stay, transfers, trust, annuity, sale efforts and joint ownership (CO-1631-CO-1639, CO-2246-CO-2249).
- **Post-eligibility:** tax withheld as verified (CO-3604); HMA shelter costs (CO-3618, CO-1324); community spouse Q.2.a expenses (CO-3619, CO-1326).
- **Express Lane:** 90 days pending citizenship (CO-2445, CO-2442).
- **CHP+ § 130.1:** the 4.B elements, with CHP+ compatibility and questionable unearned income (CO-1416-CO-1418, CO-1641-CO-1643, CO-3634, CO-3635).
- **Retroactive months:** E.2 makes the site secure the verification for the retroactive period, and CO-566 opens the period only once income verification is not pending in the start month. "Proof of the declared medical service shall not be required" is stated on CO-4100.

No verification requirement the text states is unmodeled. The one approval risk is P2-2 (Buy-In applicants asked for ABD documents).

## Cases recomputed

Values from `npx vite-node scripts/eval-case.ts co <case> ...` on the snapshot.

**CO-137** (pregnant, retroactive coverage requested):

- Household p1, the unborn child and p3 = 3: 27,320 / 12 = 2,276.67. June 2,700 = 118.6%, at or under 195%.
- Window June-August (2026 application, eligible from 2026-01-01). Pregnant from March. Pay stubs in, so the period opens in June.
- September 4,600 = 202.0%, 197.0% after the disregard, over 195%. Locked in (G.5): pregnant / eligible; CHP+ ineligible_medicaid_eligible.
- p3: 202.0% - 5 = 197.0% > 142%: ineligible_income; CHP+ 202.0% within 142-260%: eligible_child.
- Engine: identical (start 2026-06).

**CO-138** (no request): the period starts in September, the application month. 202.0% fits no Medicaid group; CHP+ prenatal >195% and ≤260%: eligible_prenatal. Engine: identical.

**CO-139** (State Veterans Home, A&A):

- Eligibility income 1,300 + 600 - 300 = 1,600 ≤ 2,982; resources 1,200 ≤ 2,000: eligible_institutional.
- PNA 90 (V.3.d.ii.2: a State Veterans Home resident with a non-service-connected pension and no spouse or child).
- 1,600 - 90 = 1,510; K.2 adds 300: **1,810**. Engine: 1,600, 90, 1,810, eligible_institutional.

**CO-140** (CBwD):

- 5,050 / 1,803.33 = 280.0% ≤ 300%; employer share 0.6, enrolled; age 10: children_with_disabilities.
- Premium 250-300% band 120 (cap 7.5% x 5,050 = 378.75), from November.
- Engine: identical. **Under F3-1 the stored values rest on the wrong income method.** The 5.H income is 2,482.50 = 137.7%: still eligible, but the $70 band if premiums follow it.

**CO-112** and **CO-113** (rechecked): 815.34 / 1,018.24 and 264.24 / 467.14. Engine: identical.

**Scratch households** (not stored):

| household | change from the stored case | engine | rule |
|---|---|---|---|
| X-CBWD | CO-140 with wages 5,600 | 310.5%, CBwD false, none | 152.9% under 5.H: eligible (**F3-1**) |
| X-CHPDIS | CO-140, no employer coverage, wages 4,500 (249.5%) | children_with_disabilities and CHP+ eligible_child | CHP+ ineligible (**F3-2**) |
| X-CHPSSI | X-CHPDIS with an SSI child | ssi_recipient and CHP+ eligible_child | CHP+ ineligible (**F3-2**) |
| X-19 | born 2007-11-05, determination 2026-11-10, 139.1% | none / ineligible_income | child (**F3-3**) |
| X-19B | born 2007-11-25, same income | child / eligible | child |
| X-TMA | CO-77, p1 wages 3,000 (166.4%), p2 given the family's TMA facts | p1 TMA; p2 false, none, CHP+ eligible_child | p2 TMA (**F3-4**) |

## Open-question confirmations

All 46 questions in scope that are open or partly resolved (owners Medicaid, CHP+, LTSS, or Premium and finance) were read with their Class, Blocked-on and Checked lines. For the pass-1 and pass-2 additions (OQ-620 to OQ-624, OQ-720, OQ-721), and for OQ-302, OQ-515, OQ-516 and OQ-550, I re-read the cited text. "needs Legal" counts as a policy choice (docs/reviews/open-question-status.md).

| OQ | Class | Confirmation |
|---|---|---|
| 50, 83, 144, 200, 201, 202, 204, 209, 303, 410, 411, 412, 470, 473, 512, 513, 540, 560, 590, 592, 593, 612 | state policy choice | Confirmed: the Checked lines match the D-65/D-66 text read; no published rule answers them. OQ-410/411/412 are not answered by CMS's CIB of December 8, 2025 on sec. 71119, which leaves the same choices to the State. |
| 213, 214, 471, 472, 510, 518 | needs Legal | Confirmed. |
| 99, 212 | blocked (OM 25-073) | Confirmed: hcpf.colorado.gov is refused. |
| 203 | blocked (C.R.S. 10-16-102, 2002) | Confirmed. |
| 302 | blocked (verification plan) | Confirmed: five medicaid.gov verification-plan URLs tried in this pass return 404. |
| 511, 514, 517, 519 | blocked (HCPF notice, aid codes, guidance, IM 25-030) | Confirmed. |
| 515 | blocked (HCPF FPL memo) | Confirmed. |
| **516** | blocked (CMS 2025 chart, 2025 MSP limits) | **Not confirmed**: medicaid.gov serves both in the CIB of November 15, 2024 (P2-1). |
| 550 | blocked (SAVE list) | Confirmed: only the SAVE mapping remains; uscis.gov is refused. |
| 620 | state policy choice | Confirmed: Q.2 "may be approved"; Q.4 caps only the MMMNA plus excess shelter. |
| 621 | state policy choice | Confirmed: O.5 against O.6. |
| 622 | state policy choice | Confirmed: L.12/N.6 "until ... published", M.7 "through the month following". |
| 623 | state policy choice | Confirmed: Q.1.f states no time. |
| 624 | state policy choice | Confirmed: L.2.d against L.7 and 1396d(p)(1). |
| 720 | state policy choice | Confirmed: § 8.100.5.K does not define "dependents". § 8.100.1 defines "Dependent Child" and "Dependent Relative"; V.3.d.ii's "spouse or dependent child" is the reading taken. |
| 721 | state policy choice | Confirmed: V.1.e.i and V.3.b.ii.8.a (admission) against V.1.e.ii (LTC eligibility). |

New records the findings call for:

- F3-1: a state-policy-choice OQ on how § 8.100.5.H's per-person and per-couple disregards and H.3's allocations apply to a CBwD family household.
- F3-2: only if HCPF lets a family choose CHP+ over the children's Buy-In.
- P2-1: OQ-516 resolved.

## Disposition (round 3)

Fix round, 2026-11-22, on a96ecae. Governing text re-read: 10 CCR 2505-10 § 8.100.3.F.1.i, § 8.100.4.G.2.a, H.2, I.1-5, § 8.100.5.F, F.6, H.1-4, § 8.100.6.Q.1-4 in D-65 and again in the Secretary of State's PDF fetched 2026-11-22 (ruleVersionId 12735, effective 11/14/2026; the text matches D-65); 10 CCR 2505-3 §§ 110.1, 120.1, 430.2-430.5 (D-66); § 8.482.33 (Cornell, re-fetched 2026-11-22, matches D-55). Fetched from medicaid.gov: CMCS Informational Bulletin of November 15, 2024 (D-280). All four P1s are confirmed by the text and fixed.

| id | disposition |
|---|---|
| F3-1 (P1) | Fixed (835c550). New CO-4200 (household earned income: wages and non-MAGI self-employment of every MAGI household member, less the student exemption for a blind or disabled child), CO-4201 (household unearned income under § 8.100.5.F: Social Security, pensions, unemployment, other unearned income, tax-exempt interest, lottery winnings, child support, with a disabled child's support reduced by one third (H.4.c), in-kind support not for unemancipated children, the F.6.y exemptions left out), CO-4202 (one $20 and one $65-plus-half on the pooled income, the unused $20 carried to earnings), CO-4203 (as a share of the poverty level for the MAGI household's size). CO-620 tests CO-4203 against 300%; CO-621's bands and cap threshold read CO-4203 (the cap base stays the household's MAGI income, Q.1.g.i's "adjusted gross income"). How H's per-couple disregards and H.3's allocations apply to a family is OQ-740 (state policy choice). CO-140's premium was re-derived by hand: (5,050 - 20 - 65) / 2 = 2,482.50 = 137.7% of 1,803.33: the $70 band, under the 5% cap of 252.50: **120 → 70**. X-CBWD stored as CO-145: 152.9%, eligible, premium 70. |
| F3-2 (P1) | Fixed (835c550). CO-705, CO-706 and CO-707's ineligible_medicaid_eligible and eligible_newborn rows read ma_has_full_coverage_category (CO-1176) in place of ma_magi_is_fully_eligible. CO-1176's cone reads no CHP+ eligibility item: `npm run check` reports no cycle. CO-562's precision now calls itself the MAGI part of the test. X-CHPSSI stored as CO-146 (ssi_recipient; CHP+ ineligible_medicaid_eligible). CO-140's CHP+ status **ineligible_coverage → ineligible_medicaid_eligible** (p3 is Buy-In eligible, so § 120.1.B comes first). No new OQ: § 8.100.6.Q.4's "opt out" is disenrollment after enrollment, and § 120.1.B and 42 CFR 457.310(b)(2) exclude a child eligible for Title XIX whether or not enrolled; the volume reads it that way. |
| F3-3 (P1) | Fixed (79a6227). CO-564 takes the age on the last day of the month before the determination month (the day-before idiom of CO-416 and CO-940), so a 19th birthday earlier in the determination month is inside "the month in which they turn 19" (tests CO-564-T5 to T8, determination after the birthday). CO-549 has the same rule at 26 (H.2; CO-549-T6, T7). CO-539's children's arm and CO-552 read CO-564 (CO-539-T5: 1.42 in the birthday month). X-19 stored as CO-147 (child / eligible, CHP+ ineligible_medicaid_eligible); the 26th-birthday month stored as CO-149 (former_foster_care). |
| F3-4 (P1) | Fixed (835c550). New CO-4204 (the TMA household: MAGI household plus the caretaker and child edges both ways) and CO-4205 (the parent or caretaker who lost the category to earnings is in the twelve months; I.3 tested over the household). CO-2430 is that, or a dependent child, a Parent/Caretaker Relative, or a member enrolled in Medical Assistance the month before the determination month (I.2.b) in the household of such a person (I.2, I.2.a): the family's remaining months, read from the parent's record, nothing restated on the child. X-TMA stored as CO-148 without the restated facts: p2 transitional_medical_assistance, CHP+ ineligible_medicaid_eligible. CO-77 unchanged. |
| P2-1 | Fixed (03bcfd4). D-280 (CIB of 2024-11-15, medicaid.gov); excerpts S3006 (MSP 9,660 / 14,470) and S3007 (MMMNA maximum 3,948, CSRA 31,584 / 157,920, home equity 730,000). CO-807, CO-808, CO-827, CO-828, CO-830, CO-831 have 2025 versions ending 2026-01-01. OQ-516 resolved. |
| P2-2 | Fixed (6fe8c4e). New supplied fact ma_application_is_children_buy_in_only (CO-4206). CO-1404 and CO-1405 take the MAGI arm for it (§ 8.100.6.Q.3) and verify no resources (Q.1.c); a disabled child whose application is not limited to the Buy-In is screened in the SSI-related groups and its resources are verified as before. |
| P2-3 (carried) | Deferred P2, as in rounds 1 and 2 (defined caseworker findings read by modeled computations; not a wrong answer). |
| P3-1 | Fixed (6fe8c4e): the meanings of ma_msp_category, ma_ssi_related_category, ma_buy_in_category and ma_ltc_eligibility_status say they answer the month's criteria and do not test the coverage period (CO-4101 does that for MAGI and OAP). Gating each by its own retroactive rule is left as a P3. |
| P3-2 | Fixed (6fe8c4e): S3005 quotes § 8.100.3.F.1.i; CO-653 cites it and names the CwCHN route. |
| P3-3 | Fixed (6fe8c4e): S3008 quotes § 8.482.33, A and C.1-2; CO-658 and CO-835 cite it. |
| P3-4 | Fixed (6fe8c4e): CO-3618's precision states both readings (lives_with on the dwelling the allowance keeps up; six months from entry, the OQ-721 choice); CO-3618 lists OQ-721 and OQ-721 names it. |

Pattern sweep (whole volume):

- Birthday-month and age-threshold comparisons: the only year-month comparison was CO-564 (fixed). CO-549, CO-539 and CO-552 were fixed with it. Every other rule that reads date_of_birth against a month (SNAP CO-412, CO-413, CO-416; Adult Financial CO-940; SUN Bucks CO-1292; Medicaid CO-551, CO-1969, CO-4101) compares dates or uses the first-day or day-before idiom. Rules whose text says "under 19" (CO-509, CO-559, CO-2439, CO-1976) keep the plain age test. No instance in other programs.
- An exclusion naming one category where the text says "eligible for [program]": CHP+ CO-705, CO-706, CO-707 (F3-2) and Medicaid CO-1156 (OAP Health Care: "do not qualify for Medicaid under Title XIX" had named SSI-related, MAGI and SISC B only; it now reads CO-1176, so a Pickle, Buy-In or LTC-eligible OAP recipient is medicaid_eligible; test CO-1156-T10), both fixed (835c550). CO-616, CO-1152, CO-1154 and CO-2456 already read CO-1176. No other program reads a Medicaid or CHP+ item; Adult Financial's af_barred_by_colorado_works reads the whole Colorado Works status. No instance in other programs.
- A person-level test where the text speaks of the household or family: CO-2430 (F3-4) fixed, with I.3 tested over the household (CO-4205). Checked and left: CO-2431 (I.5 four-month extension: each member's own enrollment history is the family's, and I.5 has no joining-member rule); CO-620's Q.1.f facts (CO-3630, CO-3631 are defined as the family's offer, seen from the child); CHP+ CO-1978 (defined as the family's public-agency coverage). A scan of other programs' derived items whose meaning names the household found no person-level test of a household condition (CCCAP CO-2103, SNAP CO-074, CO-310, CO-311, CO-332 and Colorado Works CO-2551 are person-level by their text).
- Disregards or income methods applied to the wrong method: CO-620 and CO-621 (F3-1) fixed. The § 8.100.5.F income definitions were also incomplete in the SSI-method items: lottery and gambling winnings (F.5.i) were left out of CO-663 (SSI-related, and through it Pickle CO-1158 and DAC CO-1160), CO-1715 (WAwD), CO-641 (LTC gross income), CO-2277, CO-2278 (allocations), CO-2467 (community spouse income) and CO-657 (family allowance); and in-kind support and maintenance was counted for unemancipated children in CO-663 and CO-1715 against H.1.b. All fixed (db7301b, 275eda6). No other program reads the Medicaid income methods.

New items: CO-4200 to CO-4206. Open question: OQ-740 (opened); OQ-516 (resolved). Document: D-280. Excerpts: S3000 to S3008. Cases: CO-145 to CO-149. Changed expectations: CO-140 p3 ma_cbwd_premium 2026-11 120 → 70; CO-140 p3 chp_eligibility_status 2026-10 ineligible_coverage → ineligible_medicaid_eligible.
