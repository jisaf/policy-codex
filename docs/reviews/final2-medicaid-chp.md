# Final verification pass 2: Health First Colorado (Medicaid) and CHP+

Reviewer: fresh independent second pass, 2026-11-22, commit ceba7c2 (branch ccr-9d19bf4c-wmnwcl). Scope: every part of Medical Assistance in 10 CCR 2505-10 § 8.100 (MAGI, needy persons under 21, former foster care, TMA, presumptive eligibility, Express Lane, continuous and retroactive eligibility, community engagement, SSI-related and protected groups, OAP Health Care, the Medicare Savings Programs, both Buy-In programs, long-term care with HCBS and PACE, patient payment, emergency Medicaid, BCCP, family planning and the Reproductive Health Care Program, the 1396b(v)(5) limit, Cover All Coloradans), CHP+ (10 CCR 2505-3), and their document-collection rules.

Method note: the shared working tree was being changed by another track during this pass (codex.json held merge-conflict markers), so every run used a clean extract of ceba7c2 (`git archive`) in the reviewer's scratchpad. Nothing in the repository was edited. At ceba7c2: `npm run check` OK (conformance self-check 3221 cases, 5851 checked, 5851 passed); `tsc --noEmit` OK; vitest 920 of 921 pass. The one failure (test/repo/check.test.ts, the governance ratchet) needs git history and fails only because the extract is not a git repository.

Governing text read directly: D-65 (§ 8.100, SOS version effective 11/14/2026), D-66 (10 CCR 2505-3, effective 08/30/2026), D-220 to D-224 (the 2025 and 2026 poverty-guideline notices, 22 U.S.C. 7105, the Iraqi and Afghan special-immigrant statutes), and the excerpts S2400-S2420, S1503, S2411, S640, S1721-S1723, S1738, S1747, S1752.

## Verdict

**2 P1 found.**

- **F2-1** is a regression from the F-1 fix. The pregnancy coverage period now opens in a retroactive month without the two conditions § 8.100.3.E puts on retroactive coverage: the applicant received medical services in that period, and she requested retroactive coverage. Reproduced on scratch household X-RETRO.
- **F2-2** is an omission the first pass did not catch. § 8.100.5.K.2 makes VA Aid and Attendance part of the patient payment for a veteran in a State Veterans Home who has no dependents. The volume always excludes it, so that patient payment comes out too low.

All 7 earlier P1s (F-1 to F-7) and both earlier verification P1s (V-3, V-6) are fixed. F-1 is fixed for the case the first pass reported but introduced F2-1. There are also 3 P2 and 5 P3 findings. The 44 open questions in scope are correctly classed.

## Earlier P1s: confirmation

| earlier id | status | evidence |
|---|---|---|
| F-1 (pregnancy in retroactive months, postpartum after a retroactive birth) | **fixed, with a regression (F2-1)** | CO-3600/CO-3601 make pregnancy month-level. CO-565 scans the retroactive window, and CO-087 reads the mother's period in the birth month. CO-110 at ceba7c2: p1 is pregnant/eligible 2026-06 to 2027-08 and none/ineligible_income in 2027-09; p3 is needy_newborn. This matches § 8.100.3.E.2, G.5 and 1396a(e)(16)(A). But see F2-1: the scan applies whether or not retroactive coverage was requested or services were received. |
| F-2 (hospital PE status declaration) | fixed | CO-2439 tests the pregnant and child groups before the status declaration. The status-fail branch admits only an ix.1 person to employed_disabled. R.2.c-e keep the declaration. This matches S1722 (R.2.a, b and f "unless they meet the exceptions"; c, d and e have no exception). CO-111 passes. |
| F-3 (patient payment deductions) | fixed (but see F2-2 and P2-1) | CO-658, CO-3615-CO-3618 and CO-3602-CO-3607 follow V.3.b.ii.1-8, V.3.c, V.3.d.iii-iv, V.3.f and V.3.g.ii. The HMA maximum is recomputed: 4,066.50 / 2,643.75 x 1,995 = 3,068.62, less 1,995, plus 598.50 = 1,672.12, which rounds to 1,672 (S2404). CO-112 and CO-113 recomputed (below). |
| F-4 (community spouse's medical needs) | fixed | CO-3619 adds Q.2.a-b after the Q.4 cap in CO-655, which CO-656 and CO-1977 read. The family allowance (CO-657) still reads the standard MMMNA, as T.1.c requires. OQ-620 records "may be approved". |
| F-5 (QMB/QDWI effective month) | fixed | CO-3622 follows L.10: the month after determination, or earlier through the 45-day standard. CO-3623 follows L.11 (no retroactive months, continuing members excepted), and CO-3624 follows O.5. CO-06 p2 is none in 2026-11 and qmb in 2026-12 (engine). |
| F-6 (MSP COLA disregard) | fixed | CO-3625 dates publication from D-220 (91 FR 1797, 2026-01-15) and D-221 (90 FR 5917, 2025-01-17). CO-3627-CO-3629 subtract the COLA only in the member's own program, through the publication month for QMB and QI-1 (L.12, N.6) and the following month for SLMB (M.7). OQ-622 records the boundary. CO-114 recomputed. |
| F-7 (CBwD Q.1.e-f) | fixed | CO-620 excludes a child of 16 to 18 with earnings and requires enrollment where the employer pays at least 50%. Rule tests T5-T9 cover it; OQ-623 records the reading. (CO-622's precision is now stale: P3-1.) |
| V-3 (non-requesting members' income) | fixed | CO-1411 and CO-1412 sum over ma_income_verification_members (CO-3633: the MAGI household, or the SSI-method couple for aged, blind or disabled persons). CO-1416 and CO-1417 sum over the MAGI household. CO-01 p4 at 2026-10: ma and chp verification status pending, count 3 (engine). |
| V-6 (MSP-only non-liquid resources) | fixed | CO-1405's MSP-only arm reads liquid resources and retirement accounts, or a questionable attestation. This matches 435.952(e)(2)-(4) and 416.1201(b) (S2418-S2420). |

Earlier P2/P3 dispositions:

- P2-1 (OQ-520) and P2-2 (OQ-550): fixed. The statute_override text on CO-509 and CO-2706 states its reasoning and cites D-222 to D-224.
- P2-4: fixed by OQ-624.
- P2-5: fixed. CO-1156 reports ineligible_before_application, per § 8.941.1.E.
- V-8, V-10, V-14: fixed.
- **P2-3 stays a deferred P2, not a P1.** The trust, transfer, life-estate and annuity tests of § 8.100.7.E-I are supplied findings: CO-824, CO-825, CO-1577 and CO-1579 are defined, with meanings, and are read by modeled computations (the penalty divisor, CSRA attribution). No outcome is wrong when the finding is right, and no rule reads an undefined element.

## Findings

| id | sev | item(s) | governing excerpt | what is wrong | proposed fix |
|---|---|---|---|---|---|
| F2-1 | P1 | ma_pregnancy_coverage_period_start_month (CO-565), ma_is_in_pregnancy_coverage_period (CO-566), ma_is_pregnant_in_month (CO-3601), pregnancy_start_date (CO-3600) | § 8.100.3.E.1 (S1503): an applicant "shall be provided such assistance any time during the three months preceding the date of application ... **That person shall have received medical services at any time during that period** and met all applicable eligibility requirements." E.2 (S2411): applicants who "have received medical services ... **can request retroactive coverage** on the application form." § 8.100.4.G.5 (S640): coverage "for a period **beginning with the date of application**" and, once approved, "regardless of changes in the woman's financial circumstances". | CO-565 opens the G.5 coverage period in the earliest retroactive month in which the woman met the Pregnant Women category, for every pregnant applicant. It reads no fact for either E.1 or E.2 condition, and the volume has no such fact (no supplied item names a retroactive request or services in the period). CO-566 then locks her in from that month. So a pregnant woman whose income rose above 195% by the application month is reported Medicaid-eligible, and CHP+ prenatal is denied, even when she never asked for retroactive coverage or had no services in those months. Then the period should begin with the application, at an income outside Medicaid. Before the fix the period began at the application month, so this is new. Scratch **X-RETRO** (CO-110 with p1 currently pregnant from 2026-03, p3 a 6-year-old; wages 2,700 through August = 118.6% FPL for 3, then 4,600 from September = 202.0%; applied 2026-09-15): the engine gives start month 2026-06, ma_magi_category pregnant / eligible in 2026-09 and 2026-10, and chp_eligibility_status ineligible_medicaid_eligible. Without a retroactive request the rule gives no Medicaid in September (202% > 195%) and CHP+ prenatal (195-260%, 2505-3 § 110.1.F). Side effect: every pregnant applicant within the standard now needs pregnancy_start_date and ma_eligibility_start_date, or her current-month category is unknown. Scratch X-NOSTART (CO-04 without pregnancy_start_date) gives ma_magi_category null in 2026-10, where CO-04 gives pregnant. | Add a supplied fact `ma_retroactive_coverage_requested` (the application or a later verbal request asks for retroactive coverage, and medical services were received in the period; E.1-2). In CO-565, scan the retroactive window only when it is true; otherwise start at the month of ma_application_date. Read pregnancy_start_date only then. Add X-RETRO as a stored case in both variants: requested gives pregnant from June, not requested gives CHP+ prenatal in September. |
| F2-2 | P1 | ma_ltc_gross_income (CO-641), ma_patient_payment_available_income (CO-3616), ma_patient_payment (CO-658), receives_va_aid_and_attendance (CO-836); excerpt S1738 | § 8.100.5.K (D-65 lines 2475-2485): "1. The portion of the pension payments for Aid and Attendance (A&A) and Unusual Medical Expenses (UME) ... shall not be used as patient payment to the medical facility: a. for a veteran or surviving spouse of a veteran in a medical facility other than State Veterans Home; or b. ... in a State Veterans Home with dependents. **2. For a veteran or surviving spouse of a veteran in a State Veterans Home with no dependents the portion of the pension payments for [A&A] and [UME] ... shall be used as patient payment to the medical facility.**" | CO-641 subtracts va_aid_and_attendance_amount whenever receives_va_aid_and_attendance is true. CO-3616 and CO-658 start from CO-641, so A&A/UME never enters the patient payment. CO-641's precision admits it: "Does not model the 8.100.6.C.2 exception (a veteran/widow(er) with no dependents in a State Veterans Home)". No open question records it, and no fact says whether the person is in a State Veterans Home. The patient payment of every such resident is too low by the full A&A/UME amount. S1738 quotes only K.1's lead-in, omitting 1.a-b and 2, and cites it as § 8.100.6.C. The F-3 disposition says CO-658 "now follows § 8.100.7.V.3.b-i"; this income rule sits in § 8.100.5.K and was left out. | Add a supplied fact `resides_in_state_veterans_home`. In CO-3616, add va_aid_and_attendance_amount back to the income available for the patient payment when the person is a veteran or a veteran's surviving spouse with no dependents in a State Veterans Home. Eligibility income (CO-641, the 300% test) keeps the exclusion (K's lead-in). Re-excerpt S1738 as § 8.100.5.K in full and correct the citations in CO-641, CO-836 and CO-837. Add a household case. |
| P2-1 | P2 | ma_patient_payment (CO-658), ma_nf_part_b_premium_deduction_months (CO-3612); OQ-520 | § 8.100.7.V.3.b.ii.8.a (S2401): Part B premiums "deductible only for the first and second month **in the Nursing Facility**". V.1.e.ii (S2400): adjust "for the Medicare premium deduction for the first two months **of Long-Term Care institution eligibility**." | The two current paragraphs count the two months from different starting points. CO-658 counts from the month of institution_entry_date. For a resident who entered before becoming eligible (private pay, or an application after admission), V.1.e.ii gives the deduction in the first two eligible months and the volume gives none. In CO-112 (entered 2026-10-05, eligible from November), December's payment is 1,018.24 under the volume's reading and 815.34 under V.1.e.ii. OQ-520 was resolved by quoting both texts without recording which one governs. | Record the conflict as a state-policy-choice open question (texts: V.1.e.ii and V.3.b.ii.8.a), with the reading in force. Alternatively, count from the first month of LTC eligibility, the operational instruction in V.1.e. |
| P2-2 | P2 | ma_home_maintenance_allowance (CO-3618), ma_community_spouse_medical_needs (CO-3619), mandatory_income_tax_withheld (CO-3604) | V.3.d.iv (S2402): "The Eligibility Site must verify that the taxes were withheld." V.3.g.ii (S2404): the HMA "must be based on actual and verified shelter expenses". Q.2.a (D-65): each medical expense "must be documented in a manner that describes the service, the date ..., the amount ..., and the name of the service provider". | These are document-collection requirements on the new post-eligibility deductions, and none is a pending element (CO-1411 counts no LTC deduction). CO-3604 states its amount "as verified", which is the alternative the verification review accepted for SNAP (V-5). But CO-3618 reads shelter_cost_monthly and housing_maintenance_fee, whose meanings do not say "verified", and CO-3619's precision leaves Q.2.a's documentation to "the eligibility site's check". Approval risk, not a wrong answer when the stated amounts are the verified ones. | Either state "as verified (documented)" in the inputs these two items read, or add LTC deduction pending elements, as CCCAP's deduction_disallowed does. |
| P2-3 | P2 (carried) | CO-824, CO-825, CO-1577, CO-1579 | § 8.100.7.E-I | As in the first pass: the trust, transfer, life-estate and annuity tests are caseworker findings. | Deferred P2, as disposed. Not a P1 (see above). |
| P3-1 | P3 | ma_buy_in_category (CO-622) | — | The precision still says the item "does not independently enforce 8.100.6.Q.1.e's exclusion". CO-620 now does (F-7). | Update the precision. |
| P3-2 | P3 | ma_is_pregnant_category (CO-546) | S640 (195%) | The precision says "185% exceeds every other group's standard". The standard is 195% (CO-194). | Correct the figure. |
| P3-3 | P3 | month-level MAGI outcomes | § 8.100.3.E.1; § 8.100.5.C.1 | The outcomes answer "meets the criteria in month m" for any month. CO-110 p1 reads pregnant/eligible in 2026-05, before the retroactive window. p3 reads needy_newborn/eligible in 2026-05 and 2026-06, before his birth. Harmless to the stored expectations, but misleading in the walkthrough. | Gate months before the retroactive start (and, for a person, before birth) as CO-1156 does with ineligible_before_application, or say so in the outcome meaning. |
| P3-4 | P3 | ma_cbwd_eligible (CO-620) | § 8.100.6.Q.1 | No stored household reaches the Children with Disabilities Buy-In. Q.1.e-f are covered by rule tests only; the new facts CO-3630 and CO-3631 appear in no case. | Add a household with a CBwD child, one with employer family coverage. |
| P3-5 | P3 | ssi_student_earned_income_exclusion_monthly / _annual (CO-3379, CO-3380) | — | The 2025 version has no `to` date and overlaps the 2026 version. | Close the 2025 version at 2026-01-01. |

## Coverage map

Each pathway, category, program and computation the current text provides, with the items that carry it. The first-pass map was re-verified against the D-65 section headings (§ 8.100.3.A to 8.100.7.V) and D-66. Lines changed by the fix round are marked.

| Rule | Pathway or computation | Item(s) |
|---|---|---|
| § 8.100.4.G.2 | Children ≤142%, through the month of the 19th birthday | CO-545, CO-564, CO-191 |
| § 8.100.4.G.3 | Parents and caretaker relatives ≤68% | CO-547, CO-2606, CO-192 |
| § 8.100.4.G.4; 435.119 | Adults 19-64 ≤133%, MEC for dependent children, community engagement from 2027 | CO-548, CO-1975, CO-193, CO-199 |
| § 8.100.4.G.5; § 8.100.3.E | Pregnant women ≤195%; month-level pregnancy; coverage period (retroactive start, **F2-1**); 12-month postpartum | CO-546, CO-3601, CO-3600, CO-565, CO-566, CO-560, CO-194, CO-198 |
| § 8.100.4.G.6 | Legal Immigrant Prenatal (CHIPRA 214) | CO-509 (vii) |
| § 8.100.4.G.7 | Needy newborn, including a birth covered by retroactive MA | CO-550, CO-087 (changed) |
| § 8.100.4.G.8, E.3 | Limited family planning; RHCP | CO-1154, CO-1155, CO-1131, CO-1132 |
| § 8.100.4.D-E, C | 5% disregard; MAGI household; MAGI income | CO-539, CO-183, CO-500-CO-504, CO-1187, CO-1190 |
| § 8.100.4.H | Needy persons under 21; former foster care to 26 | CO-2419, CO-549, CO-2421 |
| § 8.100.4.I | TMA and four-month extension | CO-2430, CO-2431 |
| § 8.100.4.J | Express Lane, 90 days pending citizenship (V-10) | CO-2442 (changed), CO-2445 |
| § 8.100.4.F; § 8.100.3.R | MAGI PE; hospital PE (F-2) | CO-558, CO-559, CO-3155, CO-2439 (changed) |
| § 8.100.3.Q; 2505-3 § 430.2 | Continuous eligibility | CO-555, CO-556, CO-561, CO-2404 |
| § 8.100.3.E; sec. 71112 | Retroactive coverage (3 months; from 2027, 1 or 2) | CO-557, CO-2472, CO-2449-CO-2451 |
| sec. 71107; 435.550-560 | Six-month renewals; community engagement | CO-2455, CO-1974, CO-1960-CO-1973, CO-3161-CO-3165 |
| § 8.100.3.B, G; 1396b(v)(5) | Residency; citizenship and immigration; special immigrants and trafficking victims (P2-2); federal payment limit | CO-2250, CO-509 (changed), CO-507, CO-1172, CO-2400, CO-3034 |
| § 8.100.3.G.1.g.ix; C.R.S. 25.5-2-104, 25.5-5-201(6) | Cover All Coloradans | CO-1173, CO-1174, CO-1175, CO-562 |
| § 8.100.3.F.1.k | Emergency Medicaid | CO-1151, CO-510 |
| § 8.715 | BCCP | CO-1152 |
| § 8.100.6.C-E, I, J | SSI-related, Pickle, disabled widow(er)s, DAC | CO-611, CO-612, CO-1159, CO-1161, CO-1162, CO-1163 |
| § 8.100.6.F-H | 1972/1973/1983 closed cohorts | not modeled (OQ-209) |
| § 8.100.6.K; §§ 8.940-8.942 | OAP Health Care, not retroactive (P2-5) | CO-1177, CO-1156 (changed) |
| § 8.100.6.L | QMB; effective month (L.10-11); COLA disregard (L.12) | CO-613, CO-3622, CO-3623, CO-3627-CO-3629, CO-3625 |
| § 8.100.6.M-N | SLMB, QI-1 (retroactive, M.5-6, N.3); COLA disregard | CO-614, CO-615 |
| § 8.100.6.O | QDWI from the determination month | CO-616, CO-3624 |
| § 8.100.6.L.1-4, M-O | MSP-category ordering | CO-617 (changed) |
| § 8.100.6.P | Buy-In for working adults | CO-618, CO-619 |
| § 8.100.6.Q | Buy-In for children; Q.1.e-f | CO-620 (changed), CO-621, CO-3630-CO-3632 |
| § 8.100.7.A-B | 300% special income group, income trust; HCBS, PACE | CO-640-CO-642, CO-653, CO-654 |
| § 8.100.7.E-J | Trusts, transfers, life estates, annuities, penalty | CO-649, CO-659, CO-824, CO-825 (P2-3) |
| § 8.100.7.K-S | CSRA, increased CSRA, MMMNA with Q.2, CSIA, family allowance | CO-646, CO-1977, CO-655, CO-3619, CO-656, CO-657, CO-2802 |
| § 8.100.7.T, V.3; § 8.100.5.K | Patient payment: PNA, earned-income reserve, MIA, family, HMA, tax, garnishment, Part B/D, LTC insurance; **VA A&A in State Veterans Home (F2-2)** | CO-658, CO-3615-CO-3618, CO-3602-CO-3607, CO-1987 |
| § 8.100.7.B.3 | Alternative Care Facility PNA | not modeled (OQ-519) |
| 2505-3 §§ 110, 120, 170, 320-330, 430 | CHP+ child, prenatal, status (trafficking victims by statute), PE, cost sharing, prenatal period, newborn | CO-704-CO-708, CO-2706 (changed), CO-2707, CO-2228-CO-2231, CO-2406-CO-2410 |
| § 8.100.4.B, 5.B, 3.H; 435.940-965; 2505-3 § 130 | Verification | see Verification below |

## Rules checked against the text (52)

Figures confirmed:

- FPL 2025 and 2026 (D-221, D-220; 15,960 / 21,640 / 27,320 ... +5,680).
- FBR 994 / 1,491 (2026) and 1,029 / 1,544 (2027); 300% = 2,982.
- MMMNA standard 2,705; maximum 4,066.50 (2026); July 2025 MMMNA 2,643.75.
- CSRA maximum 162,660; MSP resources 9,950 / 14,910; QDWI twice the SSI resource limit.
- PNA 110.36; HMA maximum 1,672.
- Poverty-guideline publication dates 2025-01-17 and 2026-01-15.

| # | Item | Check | Result |
|---|---|---|---|
| 1 | CO-3601 | month-level pregnancy | ok |
| 2 | CO-565 | G.5 start; E.1-2 | **F2-1** |
| 3 | CO-566 | lock-in, verification at the start month | ok, but reads CO-565 (F2-1) |
| 4 | CO-560 | 12th month after the end | ok |
| 5 | CO-087 | G.7, retroactive birth | ok |
| 6 | CO-546 | 195%, disregard | ok (P3-2) |
| 7 | CO-548 | 435.119, MEC | ok |
| 8 | CO-539 | highest standard | ok |
| 9 | CO-552 | demographics | ok |
| 10 | CO-551 | category order | ok |
| 11 | CO-554 | status reasons | ok |
| 12 | CO-545 | child 142% | ok |
| 13 | CO-547 | parent 68% | ok |
| 14 | CO-2439 | R.2, R.8-9 | ok |
| 15 | CO-2442 | J.1.a.iii, 90 days | ok |
| 16 | CO-509 | G.1.g, vii, 71109, special immigrants | ok |
| 17 | CO-2706 | 110.1.B, 7105 | ok |
| 18 | CO-1173 | ix.1 | ok |
| 19 | CO-1156 | 8.941.1.E | ok |
| 20 | CO-617 | MSP order, L.11 | ok |
| 21 | CO-613 | L.2-4, L.12 | ok |
| 22 | CO-614 | M.2, M.7 | ok |
| 23 | CO-615 | N.4, N.6 | ok |
| 24 | CO-616 | O.2-4 | ok |
| 25 | CO-3622 | L.10, 45 days | ok |
| 26 | CO-3623 | L.11, continuing member | ok |
| 27 | CO-3624 | O.5 | ok (OQ-621) |
| 28 | CO-3627 | COLA over December | ok |
| 29 | CO-3629 | publication month | ok (OQ-622) |
| 30 | CO-3625 | 91 FR 1797, 90 FR 5917 | ok |
| 31 | CO-620 | Q.1.a-f | ok (P3-1, P3-4) |
| 32 | CO-618 | P.1 | ok |
| 33 | CO-642 | A.1, 300% / income trust | ok |
| 34 | CO-641 | gross income, A&A | **F2-2** |
| 35 | CO-646 | CSRA | ok |
| 36 | CO-655 | Q.1-4 | ok |
| 37 | CO-3619 | Q.2.a-b | ok (OQ-620, P2-2) |
| 38 | CO-656 | R.2 | ok |
| 39 | CO-657 | T.1.c, standard MMMNA / 3 | ok |
| 40 | CO-1977 | S.1 | ok |
| 41 | CO-2802 | Q.1.b, larger of SUA or actual | ok |
| 42 | CO-658 | T.1, V.3.b-c | ok except F2-2 and P2-1 |
| 43 | CO-3616 | V.3.d.iii, f.i-iii | ok |
| 44 | CO-3617 | V.3.g.ii.2.b | ok (1,672) |
| 45 | CO-3618 | V.3.g.ii, lesser of SUA or actual, 6 months | ok (P2-2) |
| 46 | CO-1405 | 435.952(e) | ok |
| 47 | CO-1411 / CO-1412 | household income elements | ok |
| 48 | CO-1416 / CO-1417 / CO-1418 | 130.1, B.1.d, B.2 | ok |
| 49 | CO-3634 | questionable unearned | ok |
| 50 | CO-704 / CO-705 / CO-706 | CHP+ 142/195-260% | ok |
| 51 | CO-2407 | CHP+ prenatal period | ok |
| 52 | CO-1154 / CO-1152 | family planning, BCCP | ok |

## Elements

`npm run export -- --volume co` gives 1,767 items. From the 39 declared Medicaid and CHP+ outcomes, 856 items are reachable through `uses`, including every item CO-3600 to CO-3635. Every identifier resolves. The only unresolved name is the engine's built-in `relationships`. No undefined element.

New supplied facts appear in stored cases or rule tests: pregnancy_start_date (CO-04, CO-110), the premium, tax, garnishment and LTC-insurance facts (CO-112, CO-113), ma_physician_certified_return_home (CO-113) and ma_prior_msp_category (CO-114). The two CBwD employer-coverage facts are in rule tests only (P3-4). Every new parameter is either a rule constant or a dated version (CO-3625). The new statute_override texts (CO-509, CO-2706) state their reasoning and sources.

## Verification (document collection)

Modeled for Medicaid and CHP+:

- **Identity and status:** SSN (CO-1401); citizenship and identity with the 435.406 and 435.407 tiers (CO-1395-CO-1399, CO-2214); immigration status and the 90-day reasonable opportunity period (CO-1622, CO-1413).
- **Income:** earned and unearned income with reasonable compatibility, now over every member whose income counts (CO-1402-CO-1404, CO-1640, CO-3633; V-3).
- **Resources:** ABD resources, with the MSP-only non-liquid resources taken on attestation (CO-1405; V-6).
- **Verified only if questionable:** pregnancy, residency, age and household composition (CO-1406-CO-1409).
- **Long-term care:** stay, transfers, trust, annuity, sale efforts and joint ownership (CO-1631-CO-1639, CO-2246-CO-2249).
- **Express Lane:** 90 days pending citizenship (CO-2445, CO-2442).
- **CHP+ (§ 130.1):** the same elements, with CHP+ income compatibility and questionable unearned income (CO-1416-CO-1418, CO-1641-CO-1643, CO-3634, CO-3635).

The one gap is in the new post-eligibility deductions: tax withheld, HMA shelter costs and the community spouse's Q.2.a expenses (P2-2). It is classed P2 because the tax fact is defined as verified and the deductions are computed after eligibility; it is not an unmodeled eligibility verification.

## Cases recomputed

Values computed with `npx vite-node scripts/eval-case.ts co <case> ...` on the clean extract.

**CO-110** (birth before the application, F-1):

- p1: household 2 (p1 and p3); 2,700 / (21,640 / 12 = 1,803.33) = 149.7%, at or under 195%.
- Application 2026-09-15, so the retroactive window is June to August. She was pregnant from 2025-11 to 2026-08-10, so June is in the Pregnant Women category. The period runs June 2026 to August 2027 (12th month after August 2026); 2027-09 is none/ineligible_income.
- p3: the mother's period covers August, the birth month, so needy_newborn.
- Engine: identical. Not covered by the expectations: May 2026 also reads pregnant/eligible, and p3 reads needy_newborn before his birth (P3-3).

**CO-112** (community spouse with premiums, F-3/F-4), November 2026:

- MMMNA 2,705; excess shelter 634 + 616 = 1,250, less 811.50 = 438.50; capped total 3,143.50; plus Q.2 75 + 202.90 + 150 = 427.90, giving 3,571.40.
- MIA 3,571.40 - 1,900 = 1,671.40.
- Available income 2,600 - 110.36 = 2,489.64.
- Deductions 1,671.40 + 60 tax + 202.90 Part B (November is the second month from entry on 2026-10-05) + 40 Part D = 1,974.30. Payment 515.34 + 300 LTC insurance = **815.34**.
- December, no Part B: **1,018.24** (815.34 under V.1.e.ii's count: P2-1).
- Engine: 3571.4, 1671.4, 2489.64, 815.34, 1018.24. **Match.**

**CO-113** (earnings in the facility, HMA):

- Unearned 1,400 covers the PNA: 1,289.64. Earned (200 - 65) / 2 = 67.50. Available 1,357.14.
- HMA min(1,672, 800 + min(SUA, 90)) = 890.
- November: 1,357.14 - 890 - 202.90 = **264.24**. December: **467.14**.
- Engine: 1357.14, 1672, 890, 264.24, 467.14. **Match.**

**CO-114** (QMB member, January COLA):

- January 2027 reads the 2026 table: limit 1,330. Countable 1,358 - 20 = 1,338, over the limit.
- She was QMB in December 2026, and the 2026-01-15 publication date is before 2027, so the disregard applies: COLA 1,358 - 1,320 = 38; 1,338 - 38 = 1,300, at or under 1,330. QMB, continuing member, in effect.
- Engine: COLA 38, disregard 38, qmb_eligible true, msp_category qmb. **Match.**

**CO-06 p2** (F-5): applied 2026-11-02, determined November; the 45th day is 2026-12-17. QMB is effective from December, so November none and December qmb. Engine: **match**.

**CO-01 p4** (V-3): 2026-10, Medicaid and CHP+ pending, count 3. Engine: **match**.

**Scratch households** (scratchpad only, not stored):

- **X-RETRO** (F2-1): CO-110 with p1 currently pregnant from 2026-03 and p3 aged 6; wages 2,700 through August, 4,600 from September; household 3: 118.6%, then 202.0%. Engine: start 2026-06; 2026-09 and 2026-10 pregnant/eligible; CHP+ ineligible_medicaid_eligible. Without a retroactive request, the rule gives no Medicaid from September and CHP+ prenatal.
- **X-NOSTART** (F2-1 side effect): CO-04 without pregnancy_start_date. Engine: ma_magi_category null in 2026-10 (CO-04 gives pregnant).

## Open-question confirmations

The 44 questions in scope that are open or partly resolved (owners Medicaid, CHP+, LTSS or Premium and finance). "needs Legal" counts as a policy choice, as docs/reviews/open-question-status.md says. Every Class line is right. For OQ-302, OQ-515, OQ-516, OQ-550, OQ-214 and OQ-620 to OQ-624 I re-read the cited text. For the others the recorded Checked line agrees with the D-65 and D-66 sections read in this pass.

| OQ | Class | Confirmation |
|---|---|---|
| 50, 83, 144, 200, 201, 202, 204, 209, 303, 410, 411, 412, 470, 473, 512, 513, 540, 560, 590, 592, 593, 612 | state policy choice | Confirmed; no published rule answers them. OQ-560: Q.1.b.ii names no SUA tier. OQ-412: the stale clause is struck. |
| 213, 214, 471, 472, 510, 518 | needs Legal | Confirmed. OQ-214: ix.1 against C.R.S. 25.5-2-104 and 25.5-5-201(6). |
| 99, 212 | blocked (OM 25-073) | Confirmed: hcpf.colorado.gov is refused. |
| 203 | blocked (C.R.S. 10-16-102, 2002) | Confirmed. |
| 302 | blocked (verification plan) | Confirmed: C.2.a.ii does not say 20% of what; the medicaid.gov verification-plan pages were tried and returned 404. |
| 511, 514, 517, 519 | blocked (HCPF notice, aid codes, guidance, IM 25-030) | Confirmed. |
| 515 | blocked (HCPF FPL memo) | Confirmed. The publication date for F-6 now comes from govinfo (CO-3625). |
| 516 | blocked (CMS 2025 chart, 2025 MSP limits) | Confirmed. Two further cms.gov and medicaid.gov URLs tried in this pass both returned 404. |
| 550 | blocked (SAVE list) | Confirmed. Only the SAVE response-code mapping remains; uscis.gov is refused. |
| 620 | state policy choice | Confirmed: Q.2 says "may be approved"; Q.4 caps only the MMMNA plus excess shelter. |
| 621 | state policy choice | Confirmed: O.5 against O.6. |
| 622 | state policy choice | Confirmed: L.12 and N.6 say "until ... published", M.7 "through the month following". |
| 623 | state policy choice | Confirmed: Q.1.f does not say when enrollment must occur. |
| 624 | state policy choice | Confirmed: L.2.d against L.7 and 1396d(p)(1). |

F2-1 and P2-1 call for new records: a retroactive-request fact for F2-1, and a state-policy-choice question on V.1.e.ii against V.3.b.ii.8.a for P2-1. OQ-520, resolved, should then point to that new question.

## Disposition (round 2)

Fix round, 2026-11-22, on 4cff0b3. Governing text re-read: 10 CCR 2505-10 § 8.100.3.E, § 8.100.4.G.5, § 8.100.5.K, § 8.100.7.Q.2, V.1.e and V.3.b-g in D-65, and § 8.100.5.K and V.1.e again in the Secretary of State's Word text re-fetched 2026-11-22 (same version, ruleVersionId 12735, effective 11/14/2026; the text matches D-65). Both P1s are confirmed by the text and fixed.

| id | disposition |
|---|---|
| F2-1 (P1) | Fixed (cabb5c7). New supplied fact ma_retroactive_coverage_requested (CO-4100): a request on the application or a later verbal request, declaring medical services in the period (E.1-2; no proof required). CO-565 scans the retroactive window only when it is true, otherwise it starts at the application month without reading pregnancy_start_date. CO-551's Pregnant Women arm is now any(category this month, coverage period), and CO-554's lock-in arm falls back to this month's category when the coverage period is unknown, so the current-month category is not unknown when a retroactive request has no start date (rule tests CO-551-T9, CO-554-T12, CO-566-T10). X-RETRO is stored in both variants: CO-137 (requested: pregnant / eligible from June, CHP+ ineligible_medicaid_eligible) and CO-138 (not requested and no pregnancy_start_date, the X-NOSTART-like case: none / ineligible_income in September, CHP+ eligible_prenatal). CO-110 states the request; no stored expectation changed. |
| F2-2 (P1) | Fixed (6d8da73). New supplied fact resides_in_state_veterans_home (CO-4102) and derived ma_va_aid_and_attendance_is_patient_payment (CO-4103). CO-658 adds the A&A/UME portion after the deductions under K.2 ("shall be used as patient payment"); CO-641 keeps the eligibility exclusion (K's lead-in). "Dependents" is undefined in K: OQ-720 (state policy choice; spouse or dependent child, as V.3.d.ii). S2900 quotes § 8.100.5.K in full; S1738's heading and citation now say § 8.100.5.K.1 (lead-in); CO-641, CO-836 and CO-837 cite § 8.100.5.K. Case CO-139: patient payment 1,810 (1,510 before). |
| P2-1 | Open question OQ-721 (state policy choice: V.1.e.ii "first two months of Long-Term Care institution eligibility" against V.3.b.ii.8.a "first and second month in the Nursing Facility" and V.1.e.i "first two months of admission"); the reading in force counts from admission. CO-658 and CO-3612 list it; OQ-520 points to it (6d8da73). |
| P2-2 | Fixed (77a6217). The Home Maintenance Allowance (CO-3618) is reserved only once the shelter and utility costs are verified (shelter_costs_verification_document_received, CO-1324), and a person's Q.2.a medical expenses (CO-3619) count only once documented (medical_expenses_verification_document_received, CO-1326). Tax withheld was already "as verified" (CO-3604). CO-112 and CO-113 state the documents; values unchanged. |
| P2-3 (carried) | Deferred P2, as in round 1: the § 8.100.7.E-I trust, transfer, life-estate and annuity tests are defined caseworker findings read by modeled computations; modeling those tests in full is a separate piece of work, not a wrong answer. |
| P3-1 | Fixed (77a6217): CO-622's precision says CO-620 enforces Q.1.e. |
| P3-2 | Fixed (77a6217): CO-546's precision says 195% (CO-194). |
| P3-3 | Fixed (cabb5c7): ma_month_is_before_coverage_period (CO-4101); ma_magi_eligibility_status reports ineligible_before_coverage_period for a month before birth or before the application outside a requested retroactive period, and ma_magi_category is none before birth. CO-137 and CO-138 store such months. |
| P3-4 | Fixed (77a6217): case CO-140, a disabled 10-year-old at 280% FPL enrolled in a parent's employer family coverage (employer share 60%): children_with_disabilities, premium 0 in October and 120 from November. CO-3630 and CO-3631 now appear in a stored case. |
| P3-5 | Fixed (77a6217): the 2025 versions of CO-3379 and CO-3380 end on 2026-01-01. No other parameter in the volume has an overlapping version. |

New items: CO-4100, CO-4101, CO-4102, CO-4103. Open questions: OQ-720, OQ-721. Excerpt: S2900. Cases: CO-137 to CO-140. No stored expectation changed. Checks at 77a6217: `CHECK_BASE=origin/main npm run check` OK (conformance self-check OK), governance 0 errors, typecheck OK, vitest 921 of 921.
