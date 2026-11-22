# Final verification pass: Health First Colorado (Medicaid) and CHP+

Reviewer: fresh independent pass, 2026-11-22, branch ccr-9d19bf4c-wmnwcl at 80f2e9e. Scope: every part of Medical Assistance (MAGI groups, needy persons under 21, former foster care, TMA and the four-month extension, presumptive eligibility at PE sites and hospitals, Express Lane, continuous eligibility, retroactive coverage, community engagement, SSI-related and protected groups, OAP Health Care, MSP, both Buy-In programs, long-term care with HCBS and PACE, patient payment, emergency Medicaid, BCCP, limited family planning and the Reproductive Health Care Program, the Pub. L. 119-21 sec. 71109 limit, Cover All Coloradans) and CHP+ (10 CCR 2505-3). Governing text read directly: D-65 (10 CCR 2505-10 § 8.100, SOS version effective 11/14/2026), D-66 (10 CCR 2505-3, effective 08/30/2026), D-67, D-68, D-31, D-35, D-26, D-161, D-58, D-166, D-72, D-74, D-23. Nothing in the volume was edited.

`npm run check` passes at 80f2e9e (conformance self-check: 2925 cases, 5436 checked, 5436 passed).

## Verdict

**7 P1 found.** Five are computations or conditions the current rule text states and the volume leaves out (F-1, F-3, F-4, F-6, F-7). Two are wrong answers from items that exist (F-2, F-5). F-1 and F-2 were reproduced on scratch households. F-5 makes one stored expectation wrong (CO-06 p2 `ma_msp_category` 2026-11). There are also 5 P2 and 3 P3 findings. Of the 40 open questions in scope, 38 are correctly classed. OQ-520 is answered by published rule text, and OQ-550 is partly answerable from allowed hosts.

## Findings

| id | sev | item(s) | governing excerpt | what is wrong | proposed fix |
|---|---|---|---|---|---|
| F-1 | P1 | is_pregnant (CO-009), ma_is_pregnant_category (CO-546), ma_pregnancy_coverage_period_start_month (CO-565), ma_is_in_pregnancy_coverage_period (CO-566), ma_postpartum_coverage_end_month (CO-560) | § 8.100.3.E.1-2 (D-65:407-409): "An applicant ... shall be provided such assistance any time during the three months preceding the date of application ... An applicant does not have to be eligible in the month of application to be eligible for retroactive Medical Assistance." § 8.100.4.G.5: coverage "through the last day of the 12th month following the date the pregnancy ends". 42 U.S.C. 1396a(e)(16)(A) (D-26:1689): "an individual who, while pregnant, is eligible for and has received medical assistance ... (including during a period of retroactive eligibility under subsection (a)(34)) shall ... remain eligible ... [through] the 12-month period". 42 CFR 435.170(b) (D-31:519). | `is_pregnant` is a person-scoped "currently pregnant" fact, so a pregnancy that ended before the application can never be read in a retroactive month. The coverage period opens only in the application month, and only if the Pregnant category is met then. A woman who delivers and applies afterwards gets no Pregnant category in her retroactive months and no 12-month postpartum coverage. Reproduced with scratch case X-PP: citizen, delivered 2026-08-10, applied 2026-09-15, household of 2 at 149.7% FPL (within 195%). `ma_magi_category` is none and `ma_magi_eligibility_status` is ineligible_income for 2026-07, 2026-09 and 2026-12. The rule gives Pregnant for Jun-Aug 2026 (retroactive) and coverage through Aug 2027. No open question records this. | Make pregnancy month-level: derive "pregnant in month m" from `pregnancy_end_date` and a pregnancy-start or expected-delivery fact, or make `is_pregnant` a month fact. Open the coverage period at the earliest month of the retroactive period (CO-557) in which the person met the Pregnant category, not only at `ma_application_date`. Add a household case for an application made after the birth. |
| F-2 | P1 | ma_hospital_presumptive_eligibility_category (CO-2439) | § 8.100.3.R.2.a (D-65): a pregnant woman must "declare that she is a United States citizen or a lawfully residing immigrant unless they meet the exceptions outlined under 8.100.3.G.1.g.viii". R.2.b (child) and R.2.f (employed disabled) carry the same "unless" clause. § 8.100.3.G.1.g.ix.1.a-b: persons under 19, pregnant or postpartum "shall not be excluded ... on the basis of immigration status" from presumptive eligibility and the Buy-In. | The item tests `[not, [any, is_us_citizen_or_national, claims_lawful_immigration_status]] -> none` before the pregnant and child groups. An undocumented pregnant woman or child at a hospital site therefore gets none. The volume reads the identical stale "viii" cross-reference as the ix exception for § 8.100.4.F.2.a-b (CO-558, CO-559, OQ-56 resolved), so CO-2439 contradicts the volume's own reading. Reproduced: CO-78 p4 made pregnant (scratch X-HPE) gives none. | Apply the declaration test only to the groups without the exception (adult, parent/caretaker, limited family planning). Let a pregnant applicant or a child pass without it. For employed_disabled, let an ix.1 person (under 19, pregnant or postpartum) pass. Add a household case. |
| F-3 | P1 | ma_patient_payment (CO-658), health_insurance_premiums_paid (CO-835) | § 8.100.7.V.3.b.ii (D-65:4297-4313): the deductions "include: 1) Personal Needs Allowance 2) ... Monthly Income Allowance ... 3) ... Family Dependent Allowance 4) ... Home Maintenance Allowance 5) ... Trustee/Maintenance Fees: actual fees, with a maximum of $20 per month 6) ... Mandatory Income Tax Withheld 7) Mandatory garnishments repaying Federal assistance overpayment 8) ... a) Medicare Part B Premium expenses ... deductible only for the first and second month in the Nursing Facility. b) Medicare Part D Premium expenses ... ongoing". V.3.c: "The patient payment shall include the client's income after the allowable deductions and any Long-Term Care insurance payments". V.3.d.iii and f: "$65 per month plus one-half of the remaining gross income may be retained" for residents with earnings. V.3.d.iv: mandatory tax withholdings. V.3.g.ii: the Home Maintenance Allowance, up to 6 months, with a computed maximum. V.3.i.ii: "The amount of [SSI] paid to an institutionalized individual is deducted from gross income". | The formula is gross income (or trust distribution) minus PNA, CSIA, family allowance and `health_insurance_premiums_paid`. The rest of the list is missing: earned-income reserve, tax withholding, Home Maintenance Allowance, garnishments, the SSI deduction and the addition of LTC insurance. `health_insurance_premiums_paid` is deducted in every month, but the rule limits Part B to the first two months. The precision admits "not separately modeled", but no open question records it. The patient payment is wrong (too high) for any resident with tax withheld from a pension, earnings, a home to maintain or SSI during a short stay, and too low for one with LTC insurance. | Add facts for withheld taxes, garnishments, LTC insurance payments, home maintenance costs with physician certification, and SSI received while institutionalized. Add an HMA maximum rule from § 8.100.7.V.3.g.ii.2.b (MMMNA cap / MMMNA x 150% FPL(1), less 150% FPL(1), plus 30% of 150% FPL(1)) and the earned-income reserve. Split premiums into Part B (first two months of NF eligibility, and only when not on the Buy-In, V.1.e.ii), Part D (ongoing) and other premiums. Resolve OQ-520 by the same text (P2-1). |
| F-4 | P1 | ma_mmmna (CO-655), ma_community_spouse_income_allowance (CO-656), ma_csra_increased (CO-1977) | § 8.100.7.Q.2 (D-65:4115-4129): "An additional amount may be approved for the following expenses: a. Medical expenses of the community spouse or dependent family member ... b. The cost of Medicare, Long Term Care insurance, and health insurance premiums." Q.4 caps only "the total that results from adding the current MMMNA and the excess shelter allowance". | The community spouse's needs are only the MMMNA plus excess shelter. Her medical expenses and premiums, which the rule adds above the cap, are left out. CO-655's precision says this is "not modeled", and CO-835's rationale defers it, with no open question. The MIA is too low and the patient payment too high for a community spouse who pays a Part B premium (most community spouses over 65 who are not on an MSP). | Add the community spouse's documented medical expenses and premiums (her own `health_insurance_premiums_paid`) to her monthly needs after the Q.4 cap, and read the total in CO-656 and CO-1977. If HCPF reads "may be approved" as discretionary, record that as a state-policy-choice OQ with the text checked instead. |
| F-5 | P1 | ma_msp_category (CO-617), ma_qmb_eligible (CO-613), ma_qdwi_eligible (CO-616); test CO-06 p2 | § 8.100.6.L.10-11 (D-65:2945-2947): "Eligibility for QMB benefits shall be effective the month following the month of determination ... QMB benefits are not retroactive and the three month retroactive Medical Assistance rule does not apply to QMB benefits." § 8.100.6.O.5: QDWI "effective the month of determination". | No item gates QMB on the determination month, so `ma_msp_category` reports qmb in the determination month and in every retroactive month. CO-06 p2 applied 2026-11-02 and was determined in November. Its stored expectation `ma_msp_category {"2026-11": qmb}` is wrong: QMB is effective December 2026. Compare `ma_wawd_premium` (CO-619), which does read `ma_buy_in_determination_month` for the parallel rule. | Report qmb only for a month after the month of determination (an MSP determination-month fact or `[det_month]`), none for earlier months, and QDWI from the determination month. Change CO-06 p2's expectation to none for 2026-11 and add qmb for 2026-12. |
| F-6 | P1 | ma_qmb_eligible (CO-613), ma_slmb_eligible (CO-614), ma_qi_eligible (CO-615), ma_ssi_poverty_guideline_monthly (CO-1750) | § 8.100.6.L.12: "Members who would lose their QMB entitlement due to annual social security COLA will remain eligible ... until the next year's federal poverty guidelines are published." M.7 (SLMB): "through the month following the month in which the annual federal poverty levels (FPL) update is published." N.6 (QI-1): the same as L.12. | No item carries the COLA disregard; a search of the volume for 6.L.12, M.7 and N.6 finds nothing. With the guidelines dated from January 1 (OQ-515's assumption), a QMB, SLMB or QI member whose January Title II COLA pushes countable income over the limit is reported ineligible in January (and February for SLMB), while the rule keeps the member eligible. | For a current MSP member (`ma_prior_enrollment_category`), disregard the January Title II COLA until the month the rule names. State the HHS publication date of each year's guidelines as a dated parameter; the Federal Register notice is on govinfo.gov, an allowed host. Note the link to OQ-515. |
| F-7 | P1 | ma_cbwd_eligible (CO-620), ma_buy_in_category (CO-622) | § 8.100.6.Q.1 (D-65:3059-3075): "To be eligible for the Medicaid Buy-In Program for Children with Disabilities: ... e. Children age 16 through 18 cannot be employed ... f. Families are required to enroll in medical family coverage offered through an employer-based group health plan if they are eligible and if the employer contributes at least 50% towards the plan premiums." | Condition f is not modeled and no OQ records it. Condition e is not enforced: CO-620's precision calls it "out of scope", and CO-622 only tests WAwD first, so an employed 16-18-year-old who fails WAwD falls through to CBwD. Both are listed eligibility conditions of the current rule. | Add a fact for access to employer family coverage with at least 50% employer contribution, and for enrollment in it, and test Q.1.f. Exclude an employed 16-18-year-old from CBwD. If HCPF applies f only after enrollment, record that as a state-policy-choice OQ with the text checked. |
| P2-1 | P2 | OQ-520; CO-658 | § 8.100.7.V.1.e.i-ii (D-65): "If client is already on the Medicare Buy-In program for Medicare part B, do not adjust patient payment ... If client is not on the Buy-In program, adjust ... for the Medicare premium deduction for the first two months"; V.3.b.ii.8.a-b. | OQ-520 says "No published rule settles it", but these paragraphs do. Its Checked line cites § 8.100.7.T.1.d and § 8.100.3.M.2.a only. As classed it does not meet stopping-rule item 2. | Resolve OQ-520 from V.1.e and V.3.b.ii.8, implemented with F-3. |
| P2-2 | P2 | OQ-550 | 8 U.S.C. 1641(c) (D-181); the body names 22 U.S.C. 7105(b)(1)(A), Pub. L. 110-181 sec. 1244 and Pub. L. 111-8 sec. 602 as "not fetched". | The question is classed "blocked on a named document" on the SAVE list alone, but the three statutes it says were not read are on law.cornell.edu and govinfo.gov, both allowed hosts. That part is not blocked. Medicaid impact is small after 1396b(v)(5) (sec. 71109), because these statuses lose federal payment from October 2026, but CHP+ and the state-funded children's and pregnancy coverage still read them. | Fetch the three statutes, settle the trafficking-victim and SIV readings, and keep only the SAVE response-code mapping as blocked. |
| P2-3 | P2 | transfer_was_exempt (CO-825), uncompensated_transfer_value_in_lookback (CO-824), has_trust_interest (CO-1577), owns_annuity (CO-1579) | § 8.100.7.E (trusts), F-G (transfers and the assets treated as transfers), H (life estates), I (annuities), D-65:3219-4021. | These rules decide whether a transfer happened, its uncompensated value, and whether a trust or annuity is a resource or a transfer. They are carried as caseworker-supplied conclusions, not as rules. Outcomes are right when the facts are right, but the approver cannot see these rules in the volume (approval risk, "heavier definitions"). | Record the boundary as a scoped design decision, with the paragraphs it leaves to the caseworker, or model the annuity and trust tests (the DRA 2005 remainder-beneficiary test of § 8.100.7.I is mechanical). |
| P2-4 | P2 | ma_qmb_eligible (CO-613) | § 8.100.6.L.2.d: the individual "is enrolled in the mandatory SSI program with premium-free Medicare Part A." | Read literally, this limits QMB to SSI recipients, which contradicts L.7 (a QMB-only recipient is "not eligible for other categorical assistance") and 42 U.S.C. 1396d(p). The volume ignores the clause silently, with no OQ. | Add a state-policy-choice OQ recording the reading in force (the clause does not restrict QMB to SSI recipients) and the text checked. |
| P2-5 | P2 | ma_oap_health_care_status (CO-1156) | 10 CCR 2505-10 § 8.941.1.E (D-68): "Eligibility shall not be retroactive and shall begin on the date of application or date eligibility is established, whichever is later." | The month-level outcome reports eligible_state_only for months before the application, the same pattern as F-5 (lower stakes: a state-only program). | Gate eligible_state_only on months from the application month, alongside the F-5 fix. |
| P3-1 | P3 | tests CO-01, CO-02 | n/a | The case comments still say patient payment 2030 - 110.36 - 1740 = 179.64, eligible_pace and MMMNA 2920 (cases.yaml:1155-1167, 3178-3185). The stored and computed values are 0, eligible_institutional and MMMNA 3909.5 / CSIA 2729.5 (re-derived: 2705 + (2016 - 811.50); CSIA larger than her available income, so the payment is 0). | Rewrite the comments to the current derivation. |
| P3-2 | P3 | OQ-412 | n/a | The body still says the draft "does not model ... the noncompliance procedures (435.558)". Audit fix round 4 modeled them (CO-3161-CO-3165, recorded in OQ-65). | Strike the stale clause. |
| P3-3 | P3 | ma_cbwd_premium (CO-621), ma_wawd_premium (CO-619) | § 8.100.6.P.1.f.iv and Q.1.g.v: premiums "updated at the beginning of each State fiscal year based on the annually revised FPL if ... increase by $10 or more". | The tables are dated 2026-07-01, with no older version and no recorded check of whether the SFY 2026-27 amounts were raised (`review_by` 2027-07-01 is set). | No change needed; note it at the next fiscal-year review. |

## Coverage map

Every pathway, category, program and computation the current text provides, mapped to the items that carry it. Items without a finding are, on the text read, correct.

| Rule | Pathway or computation | Item(s) |
|---|---|---|
| § 8.100.4.G.2 | Children ≤142% FPL, through the month of the 19th birthday | CO-545, CO-564, CO-191, CO-540 |
| § 8.100.4.G.3 | Parents and caretaker relatives ≤68% | CO-547, CO-544, CO-2606, CO-192 |
| § 8.100.4.G.4; 42 CFR 435.119 | Adults 19-64 ≤133%; MEC for dependent children | CO-548, CO-193, CO-199 |
| § 8.100.4.G.5 | Pregnant women ≤195%; lock-in; 12-month postpartum | CO-546, CO-565, CO-566, CO-560, CO-198 (**F-1**) |
| § 8.100.4.G.6 | Legal Immigrant Prenatal (CHIPRA 214) | CO-509 (lawfully present pregnant/child disjunct) |
| § 8.100.4.G.7 | Eligible needy newborn | CO-550, CO-087 |
| § 8.100.4.G.8; E.3 | Limited family planning 133-260%; household of two | CO-1154, CO-1155, CO-1153, CO-1131, CO-1132 |
| § 8.100.4.D | 5% disregard, highest standard only | CO-539, CO-183, the category items |
| § 8.100.4.E | MAGI household (filer, non-filer, unborn counted in every household) | CO-500, CO-501, CO-503, CO-504, CO-1976 |
| § 8.100.4.C | MAGI income, lottery spreading, student-loan discharge, alimony date | CO-502, CO-1187, CO-1190 |
| § 8.100.4.H.1 | Psych <21 (to 22), Alternatives to Foster Care, foster care, county custody, subsidized adoption, responsibility at 18 | CO-2419, CO-2417, CO-2418 |
| § 8.100.4.H.2 | Former foster care to 26 (in-state, and out-of-state from 2023) | CO-549, CO-095, CO-200, CO-225, CO-2421 |
| § 8.100.4.I | Transitional Medical Assistance (12 months) and four-month extension | CO-2430, CO-2431, CO-2426-CO-2429 |
| § 8.100.4.J; 10 CCR 2505-3 § 180 | Express Lane (school meals, SNAP or Colorado Works) | CO-2442, CO-3156, CO-2445 |
| § 8.100.4.F; § 8.100.3.R | MAGI PE (pregnant, child, LFP); hospital PE | CO-558, CO-559, CO-3155, CO-2439 (**F-2**) |
| § 8.100.3.Q; 2505-3 § 430.2 | Continuous eligibility (MAGI, SSI, LTC, Buy-In, Pickle, DAC, LFP, foster exit); CHP+ CE | CO-555, CO-556, CO-561, CO-2448, CO-2205, CO-2404 |
| § 8.100.3.E; sec. 71112 | Retroactive coverage (3 months; from 2027, 1 or 2) | CO-557, CO-2472, CO-197, CO-2449-CO-2451 (pregnancy gap: **F-1**) |
| sec. 71107 | Six-month renewals for expansion adults from 2027 (Indians exempt) | CO-2455, CO-2453, CO-2454 |
| 42 CFR 435.550-560; 1902(xx) | Community engagement from 2027-01-01, exceptions, noncompliance period | CO-1974, CO-1975, CO-1960-CO-1973, CO-3165, CO-1900-CO-1911 |
| § 8.100.3.B | Residency, including institutionalized and incapable persons | CO-2250, CO-2257 |
| § 8.100.3.G; 1396b(v)(5) (sec. 71109) | Citizenship and immigration, five-year bar, federal payment limit from 2026-10-01 | CO-509, CO-507, CO-1172, CO-2400, CO-3034, CO-104 |
| § 8.100.3.G.1.g.ix; C.R.S. 25.5-2-104, 25.5-5-201(6) | Cover All Coloradans | CO-1173, CO-1174, CO-1175, CO-562 |
| § 8.100.3.F.1.k; 1396b(v) | Emergency Medicaid | CO-1151, CO-510, CO-1150 |
| C.R.S. 25.5-2-103 | Reproductive Health Care Program | CO-1154 (option) |
| § 8.715 (D-67) | Breast and Cervical Cancer Program | CO-1152, CO-1191, CO-1130 |
| § 8.100.6.C | SSI recipients and SSI-eligible non-recipients | CO-611, CO-612, CO-605-CO-610, CO-2240 |
| § 8.100.6.D-E | Pickle | CO-1159, CO-1158 |
| § 8.100.6.F-H | 1972, 1973 and 1983 closed cohorts | not modeled (OQ-209, state policy choice: closed) |
| § 8.100.6.I | Disabled widow(er)s 50-64 | CO-1162, CO-1135 |
| § 8.100.6.J | Disabled adult child | CO-1161, CO-1160 |
| § 8.100.6.C.8; 1619(b) | Continued SSI status without payment | CO-1163 (continued_ssi_status) |
| § 8.100.6.K; §§ 8.940-8.942 | OAP SISC B and SISC C (OAP Health Care) | CO-1177, CO-1156 (**P2-5**) |
| § 8.100.6.L-O | QMB, SLMB, QI-1, QDWI | CO-613-CO-617, CO-1750, CO-238-CO-241, CO-807, CO-808 (**F-5, F-6, P2-4**) |
| § 8.100.6.P | Buy-In for working adults ≤450%; premiums, 7.5% cap | CO-618, CO-619, CO-1715, CO-2457, CO-1800 |
| § 8.100.6.Q | Buy-In for children ≤300%; premiums, 5%/7.5% caps | CO-620, CO-621, CO-2458-CO-2461 (**F-7**) |
| § 8.100.7.A | Institutional 300% special income group, 30-day stay | CO-640, CO-641, CO-642, CO-250 |
| § 8.100.7.B; §§ 8.7100-8.7101; 8.497 | HCBS waivers (target group, age, condition); PACE (55+, service area) | CO-653, CO-1164, CO-2270, CO-654, CO-1133 |
| § 8.100.7.E-J | Trusts, transfers, life estates, annuities | CO-649, CO-659, CO-660, CO-2232-CO-2235, CO-824, CO-825 (**P2-3**) |
| § 8.100.7.G.1.a | Income trust and regional private-pay ceiling | CO-1985, CO-2238, CO-3021, CO-3022 |
| § 8.100.7.K-S | Spousal impoverishment: CSRA (largest of a-c), increased CSRA, MMMNA, CSIA, family allowance | CO-646, CO-1977, CO-655, CO-662, CO-656, CO-657, CO-2802 (**F-4**) |
| § 8.100.5.M; 1396p(f) | Home equity limit | CO-650, CO-831 |
| § 8.100.7.T, V | Patient payment | CO-658, CO-1987, CO-887 (**F-3**) |
| § 8.100.7.B.3 | Alternative Care Facility PNA and room and board | not modeled (OQ-519, blocked on IM 25-030) |
| 2505-3 § 110.1, § 120 | CHP+ children 142-260%, prenatal 195-260%, status (110.1.B including .5.o), other coverage, inmate/IMD, public-agency exclusion | CO-704-CO-707, CO-2706, CO-2707, CO-1978 |
| 2505-3 § 430.3, 430.5 | CHP+ prenatal period (12 months), guaranteed newborn | CO-2406, CO-2407, CO-2408, CO-2410 |
| 2505-3 § 170 | CHP+ presumptive eligibility | CO-708 |
| 2505-3 §§ 320, 330 | CHP+ copayments, 5% cap, AI/AN and prenatal exemption | CO-2228-CO-2231, CO-3009-CO-3012, CO-1990, CO-213 |
| § 8.100.4.B, 8.100.5.B, 8.100.3.H, 435.940-965; 2505-3 § 130 | Verification (document collection) | CO-1395-CO-1415, CO-1620-CO-1640, CO-2246-CO-2249, CO-1416-CO-1418, CO-1641-CO-1643, CO-2219 |
| sec. 71109; SHO #26-001 | Funding stream | CO-2456 |

Out of scope by the rule's own terms: the COVID-19 limited groups (§ 8.100.3.F.1.n, G.4.b) ended in 2023.

## Rules checked against their excerpts (53)

Figures confirmed against the fetched sources: FPL 2026 (D-23: 15,960 / 21,640 / 27,320 / 33,000 ... +5,680); FBR 2026 994 / 1,491 and 2027 1,029 / 1,544 (D-58, D-166); SGA 2026 1,690 / 2,830 and 2027 1,770 / 2,950; 300% FBR 2,982; MMMNA minimum 2,705 (150% of 21,640 / 12), maximum 4,066.50; CSRA 32,532 / 162,660; home equity 752,000 (D-72); MSP resources 9,950 / 14,910, with QMB 1,350 = 1,330 + 20 (D-74); WAwD and CBwD premium tables (D-65:3033-3101); CHP+ band tables (D-66:557-650).

| # | Item | Check | Result |
|---|---|---|---|
| 1 | CO-551 ma_magi_category | order, CE first, community-engagement gate | ok |
| 2 | CO-554 ma_magi_eligibility_status | reasons, order | ok |
| 3 | CO-545 child | 142%, month of 19th birthday, disregard on highest standard | ok |
| 4 | CO-546 pregnant | 195% | ok (month-level gap: F-1) |
| 5 | CO-547 parent/caretaker | 68%, dependent child | ok |
| 6 | CO-548 adult | 19-64, Medicare, MEC, 133% | ok |
| 7 | CO-550 needy newborn | under 1, mother on MA at birth | ok |
| 8 | CO-549 former foster care | 18-21 exit, to 26, out of state from 2023, not subsidized adoption | ok |
| 9 | CO-566 / CO-565 / CO-560 pregnancy period | G.5 | F-1 |
| 10 | CO-2419 needy under 21 | H.1.a-g | ok (OQ-512) |
| 11 | CO-2430 TMA | I.1-3 | ok |
| 12 | CO-2431 four-month extension | I.5 | ok |
| 13 | CO-2439 hospital PE | R.1-2, R.8-9 | F-2 |
| 14 | CO-558 / CO-559 MAGI PE | F.2, F.8-9 | ok |
| 15 | CO-2442 Express Lane | J.1-2 | ok |
| 16 | CO-555 / CO-561 continuous eligibility | Q.1-3 | ok |
| 17 | CO-557 / CO-2472 retroactive coverage | E.1, sec. 71112 (quarter after 2026-12-31) | ok |
| 18 | CO-2455 renewal interval | sec. 71107, (xx)(9)(A)(ii)(II) exemption | ok |
| 19 | CO-509 citizenship | G.1.g, CHIPRA 214, 71109 | ok |
| 20 | CO-1175 / CO-1174 Cover All Coloradans | ix.1, C.R.S. | ok (OQ-214) |
| 21 | CO-1151 emergency status | F.1.k, ix.2 | ok |
| 22 | CO-1152 BCCP | § 8.715.2-3 | ok |
| 23 | CO-1154 / CO-1155 family planning and RHCP | G.8, E.3 | ok (OQ-204) |
| 24 | CO-611 / CO-612 SSI-related | C, 5.F | ok |
| 25 | CO-605 / CO-606 / CO-607 SSI income | $20, $65 + 1/2, allocations | ok (OQ-83, OQ-473) |
| 26 | CO-610 / CO-608 SSI resources | 2,000 / 3,000 | ok |
| 27 | CO-1159 Pickle | D-E | ok |
| 28 | CO-1161 DAC | J | ok |
| 29 | CO-1162 disabled widow(er) | I | ok (OQ-209) |
| 30 | CO-1163 protected groups | order | ok |
| 31 | CO-1156 / CO-1177 OAP | K, 8.941-8.942 | ok except P2-5 |
| 32 | CO-613 QMB | L.2-4 | F-5, F-6, P2-4 |
| 33 | CO-614 SLMB | M.2 (100-120%) | F-6 |
| 34 | CO-615 QI-1 | N.4 (≥120%, <135%; not otherwise eligible) | F-6 |
| 35 | CO-616 QDWI | O.2 (200%, twice SSI resources) | F-5 (effective date) |
| 36 | CO-618 / CO-1715 / CO-619 WAwD | P.1 | ok |
| 37 | CO-620 / CO-621 CBwD | Q.1 | F-7 |
| 38 | CO-642 / CO-641 special income group | A.1-2, 300% of 994 | ok |
| 39 | CO-648 / CO-647 LTC resources | O.1 (CSRA + 2,000) | ok |
| 40 | CO-646 CSRA | M.1.a-c, largest of | ok (no minimum: correct for Colorado's text) |
| 41 | CO-1977 increased CSRA | S.1 | ok |
| 42 | CO-655 / CO-662 MMMNA | Q.1, July adjustment, cap | F-4 |
| 43 | CO-656 CSIA | R.2 | F-4 |
| 44 | CO-657 family allowance | T.1.c, MMMNA / 3 less income | ok |
| 45 | CO-650 home equity | 5.M.2.a.i (752,000; spouse or child at home) | ok |
| 46 | CO-649 / CO-659 transfer penalty | F.2.c, divisor 10,814.64 (OQ-212) | ok |
| 47 | CO-658 patient payment | T.1, V.3 | F-3 |
| 48 | CO-653 / CO-654 HCBS, PACE | 7.B, 8.7100, 8.497 | ok |
| 49 | CO-705 / CO-706 / CO-704 CHP+ child and prenatal | 110.1.A-F, 120 | ok |
| 50 | CO-2707 / CO-2706 CHP+ status | 110.1.B.1-5, .5.o | ok |
| 51 | CO-2407 / CO-2410 CHP+ prenatal and newborn | 430.3, 430.5 | ok |
| 52 | CO-708 CHP+ PE | 170.1, 170.5-6 | ok |
| 53 | CO-2228-CO-2231 CHP+ cost sharing | 320.1, 330.1-4 | ok (OQ-470) |

## Elements

`npm run export -- --volume co` (1606 items). From the 39 declared Medicaid and CHP+ outcomes, 793 items are reachable through `uses`. Every identifier resolves to a defined item; the only unresolved reference, `relationships`, is the engine's built-in relationship read (src/engine/check.ts). No undefined element.

## Verification (document collection)

Modeled for Medicaid and CHP+:

- **SSN:** § 8.100.4.B.1.a, 8.100.5.B.1.a; CO-1401, with newborn and emergency-only exceptions.
- **Citizenship and identity:** § 8.100.3.H; CO-1395-CO-1399, CO-2214.
- **Immigration status:** VLP/SAVE and the 90-day reasonable opportunity period (G.2-3); CO-1622, CO-1413, CO-1347.
- **Earned income:** B.1.c, reasonable compatibility, 30-day period; CO-1402, CO-1403, CO-1640, CHP+ CO-1641-CO-1643.
- **ABD unearned income in the month or the month before:** 5.B.1.d; CO-1404, CO-2870.
- **ABD resources:** 5.B.1.e, AVP; CO-1405.
- **Questionable pregnancy, residency, age, relationship:** 4.B.2-6; CO-1406-CO-1409.
- **LTC:** institutional stay, transfers, trusts, annuities, sale efforts, joint ownership; CO-1631-CO-1639, CO-2246-CO-2249.
- **Express Lane 90-day period:** CO-2445.
- **CHP+ § 130 by cross-reference:** CO-1416-CO-1418, CO-2219.

The status and count outcomes are declared. The "other documentation" due date is OQ-303 (state policy choice). Nothing the text requires is unmodeled.

## Cases recomputed

Values computed with `npx vite-node scripts/eval-case.ts co <case> ...`. Each matched the hand derivation below.

**CO-04** (pregnant LPR inside the bar, stepparent, a child claimed by an absent parent), November 2026:

- p1: household p1, p2, p3 plus one unborn = 4. § 8.100.4.E.2 counts the unborn "regardless of the Medical Assistance category". p4 is claimed by p5, so p4 is not in p1's household.
- p1 income: 5,000 + 600 = 5,600 / (33,000 / 12 = 2,750) = 203.6%. That is over 195%, but she is in the G.5 lock-in that opened in October (2,200 / 2,750 = 80%, income verified), so the category is pregnant. Status passes as Legal Immigrant Prenatal (G.6).
- p2: 203.6% fits no category, so none / ineligible_income. In October, 80% gives adult; he is not a qualified non-citizen, so emergency_only.
- p3: 203.6%, but in the CE period opened October 2026 and running through 2027-09, so child.
- p4: non-filer household p1-p4 plus unborn = 5; 5,600 / (38,680 / 12 = 3,223.33) = 173.7%; CE applies, so child.
- p5: filer household p5 + p4; 5,000 / 1,803.33 = 277.3%, so none.
- Retroactive start: 2026-07 (application before 2027).

Engine: p1 2.0364 pregnant/eligible; p2 none/ineligible_income; p3 child; p4 1.7373 child; p5 2.7726 none. **Match.**

**CO-06** (nursing facility, transfer penalty, community spouse, Buy-In), November 2026:

- p1 gross income 1,900 + 700 = 2,600, at or under 2,982, so the special income group is met.
- MMMNA: 150% x 21,640 / 12 = 2,705; shelter 634 + 616 = 1,250 less 30% x 2,705 = 811.50, excess 438.50; 3,143.50 (under the 4,066.50 cap).
- CSIA: 3,143.50 - 1,100 = 2,043.50.
- Increased CSRA: 1,100 + min(2,043.50, 2,600 - 110.36) = 3,143.50, which is at least the MMMNA, so 0.
- CSRA = min(180,000, 162,660) = 162,660. Attributed resources 17,340, over 2,000, so ineligible_resources and patient payment 0.
- Penalty: 54,000 / 10,814.64 = 4.993, so 4 months and ceil(0.993 x 30) = 30 days.
- p2 QMB test: 1,100 - 20 = 1,080, at or under 1,330, with resources 7,500; she meets it, but see F-5 on the effective month.
- p3 WAwD: (2,400 - 65 - 20) / 2 = 1,157.50; / 1,330 = 87.0%, the $25 band; premium 0 in November (the determination month) and 25 in December.

Engine: MMMNA 3,143.5, CSIA 2,043.5, CSRA 162,660, increased CSRA 0, 4 months, 30 days, ineligible_resources, p2 qmb, p3 premium 2026-12 = 25. **Match**, except that the rule makes p2's November qmb wrong (F-5).

**CO-76** (CHP+ CE, prenatal after the birth, newborn):

- October 2026: p4's household p1, p2, p4 = 3; 5,700 / 2,276.67 = 250.4%, inside 142-260%, so eligible_child, CE from October through 2027-09 (§ 430.2).
- February 2027: household 4; 7,500 / 2,750 = 272.7% (267.7% after the disregard), over 260%. CE keeps eligible_child.
- p1: prenatal span from October 2026; birth 2026-12-03; end month December 2027 (§ 430.3); eligible_prenatal.
- p3: mother enrolled in CHP+ at the birth, under 1, so eligible_newborn (§ 430.5).

Engine: 2.7273, p1 eligible_prenatal with end month 2027-12, p3 eligible_newborn, p4 eligible_child. **Match.**

**CO-01 p1** (spot check): MMMNA 3,909.50 and CSIA 2,729.50, larger than 2,030 - 110.36, so patient payment 0 and eligible_institutional. This matches the stored expectations; the comments are stale (P3-1).

**Scratch households** (not stored; files in the reviewer's scratchpad):

- **X-PP** (F-1): delivery on 2026-08-10, application on 2026-09-15, 149.7% FPL. The engine gives none / ineligible_income for 2026-07, 2026-09 and 2026-12. The rule gives Pregnant for Jun-Aug 2026 and postpartum coverage through 2027-08.
- **X-HPE** (F-2): CO-78 p4 made pregnant. The engine gives none; R.2.a gives pregnant.

## Open-question confirmations

All 40 not-fully-resolved questions whose owners include the Medicaid, CHP+, LTSS or Premium and finance owner were read, along with the texts each cites. "needs Legal" counts as a policy choice under docs/reviews/open-question-status.md.

| OQ | Class | Confirmation |
|---|---|---|
| 50 | state policy choice | Confirmed: deprivation is a 435.4 plan election; § 8.100.4.G.3 silent. |
| 83 | state policy choice | Confirmed: § 8.100.5.H never computes parent-to-child deeming; H.4.e incorporates 416.1112 only. |
| 99 | blocked (OM 25-073) | Confirmed: hcpf.colorado.gov is refused. |
| 144 | state policy choice | Confirmed: Q.1.g wording ("households" and "individuals"). |
| 200 | state policy choice | Confirmed: F.1.k does not say whether the HCBS 300% group is a route. |
| 201 | state policy choice | Confirmed: § 8.715.2.C.1 "woman". |
| 202 | state policy choice | Confirmed: stale cross-reference and the seventh condition. |
| 203 | blocked (C.R.S. 10-16-102, 2002 edition) | Confirmed: leg.colorado.gov serves current editions only. |
| 204 | state policy choice | Confirmed: E.3 and G.8 silent on the disregard placement. |
| 209 | state policy choice | Confirmed: I.1.f states no test; F-H are closed cohorts. |
| 212 | blocked (OM 25-073) | Confirmed. |
| 213 | needs Legal | Confirmed: G.1.g.iii-iv against 1612(b); matters only before 2026-10-01. |
| 214 | needs Legal | Confirmed: ix.1 list against C.R.S. 25.5-2-104 and 25.5-5-201(6). |
| 302 | blocked (verification plan) | Confirmed: "20% of what" is unstated in C.2.a.ii and 5.B.1.c. |
| 303 | state policy choice | Confirmed: 435.952(c)(2)(iii) "a reasonable period". |
| 410 | state policy choice | Confirmed: § 8.100 has no community engagement text. |
| 411 | state policy choice | Confirmed. |
| 412 | state policy choice | Confirmed; stale body clause (P3-2). |
| 470 | state policy choice | Confirmed: § 320.1 whole-percent bands. |
| 471 | needs Legal | Confirmed: the trust deduction list against T.1 and 1396r-5(d)(1). |
| 472 | needs Legal | Confirmed: B.2.b against B.2.c and 435.403(h)(4). |
| 473 | state policy choice | Confirmed: H.3.a.i against H.3.a.iii. |
| 510 | needs Legal | Confirmed: 1396b(v)(5) "furnished" against SHO #26-001. |
| 511 | blocked (HCPF premium notice) | Confirmed: Q.1.g.vii promises a notice. |
| 512 | state policy choice | Confirmed: "MAGI needs standard" is undefined in § 8.100. |
| 513 | state policy choice | Confirmed: "aged 19-65". |
| 514 | blocked (CBMS aid codes) | Confirmed. |
| 515 | blocked (HCPF FPL memo) | Confirmed; note that F-6 needs the publication date, which govinfo serves. |
| 516 | blocked (CMS 2025 chart, 2025 MSP limits) | Confirmed for the allowed hosts as recorded. |
| 517 | blocked (HCPF implementation guidance) | Confirmed. |
| 518 | needs Legal | Confirmed: G.1.g.iii-v is unamended against 1396b(v)(5). |
| 519 | blocked (IM 25-030) | Confirmed. |
| **520** | state policy choice | **Not confirmed**: § 8.100.7.V.1.e.ii and V.3.b.ii.8.a-b answer it (P2-1, F-3). |
| 540 | state policy choice | Confirmed: "assumes responsibility" against 435.4 "primary". |
| **550** | blocked (SAVE list) | **Partly not confirmed**: 22 U.S.C. 7105, Pub. L. 110-181 sec. 1244 and Pub. L. 111-8 sec. 602 are on allowed hosts (P2-2). |
| 560 | state policy choice | Confirmed: Q.1.b.ii names no SUA tier. |
| 590 | state policy choice | Confirmed. |
| 592 | state policy choice | Confirmed. |
| 593 | state policy choice | Confirmed: 435.558(d)(2)(ii) "not later than". |
| 612 | state policy choice | Confirmed for Medicaid: G.3.a lists absences without a time limit. |

New open questions the findings call for, if HCPF prefers to record them rather than model: F-4 (whether Q.2's "may be approved" is discretionary), F-7 (Q.1.f as a condition of eligibility or a post-enrollment requirement), and P2-4 (L.2.d).

## Disposition

Fix track for Medicaid and CHP+, 2026-11-22. Commits on the track's branch: e49f553 (documents D-220 to D-224, excerpts S2400 to S2420), 608c7d6 (F-1, F-2), e074b14 (F-3, F-4, P2-1), a262bf8 (F-5, F-6, F-7, P2-5), ba897ac (verification and status items), 09e6740 (open questions, households CO-110 to CO-114, changed expectations). Each finding's governing text was re-read in D-65 (version effective 11/14/2026) before the change.

| id | disposition |
|---|---|
| F-1 | Fixed (608c7d6, 09e6740). pregnancy_start_date (CO-3600) and ma_is_pregnant_in_month (CO-3601) make pregnancy month-level for retroactive months; CO-546, CO-539, CO-548 and CO-552 read it; the coverage period (CO-565) opens in the earliest month of the retroactive window in which the Pregnant Women category was met (§ 8.100.3.E.2, S2411; 1396a(e)(16)(A), S224); the newborn of a mother whose retroactive coverage pays for the birth is a needy newborn (CO-087, § 8.100.4.G.7). Household CO-110 (the reviewer's X-PP): pregnant June 2026 to August 2027; newborn needy_newborn. |
| F-2 | Fixed (608c7d6, 09e6740). CO-2439 applies the status declaration and the October 2026 payment limit only to the parent, adult and limited family planning groups, and to the employed-disabled group outside ix.1. Household CO-111 (X-HPE plus an undocumented adult and child). |
| F-3 | Fixed (e074b14, 09e6740). CO-658 now follows § 8.100.7.V.3.b-i (S2400-S2405): earned income reserve (CO-3615, CO-3616), Home Maintenance Allowance and its maximum (CO-3617, CO-3618), mandatory income tax (CO-3604), garnishments (CO-3605), Part B only in the first two months and not under the Buy-In (CO-3602, CO-3612), Part D (CO-3603), Long-Term Care insurance added (CO-3606). SSI was already outside ma_ltc_gross_income (V.3.i.ii); trustee fees are the income trust's $20 (CO-2238). Households CO-112 and CO-113. |
| F-4 | Fixed (e074b14). ma_community_spouse_medical_needs (CO-3619) adds Q.2's expenses and premiums above the Q.4 cap in ma_mmmna (CO-655), read by CO-656 and CO-1977. "May be approved" recorded as OQ-620 (state policy choice). Household CO-112. |
| F-5 | Fixed (a262bf8, 09e6740). ma_qmb_effective_month (CO-3622), ma_qmb_is_in_effect (CO-3623), ma_qdwi_is_in_effect (CO-3624), ma_prior_msp_category (CO-3620); CO-617 reports qmb and qdwi only in effect. O.5 against O.6 recorded as OQ-621. CO-06 p2: 2026-11 qmb -> none, 2026-12 qmb (derivation in the case). |
| F-6 | Fixed (a262bf8, 09e6740). federal_poverty_guideline_publication_date (CO-3625, 91 FR 1797 and 90 FR 5917 from govinfo.gov), ma_title_ii_cola_increase (CO-3627), ma_msp_cola_disregard (CO-3629), read by CO-613 to CO-615 for the member's own program. The boundary month is OQ-622; linked to OQ-515. Household CO-114. |
| F-7 | Fixed (a262bf8). CO-620 excludes a child of 16 to 18 with earnings (Q.1.e) and requires enrollment in employer family coverage with at least a 50% employer share (Q.1.f; CO-3630 to CO-3632). Condition-of-eligibility reading recorded as OQ-623. |
| P2-1 | Fixed (e074b14, 09e6740): OQ-520 resolved from § 8.100.7.V.1.e.ii and V.3.b.ii.8 with F-3. |
| P2-2 | Fixed (e49f553, ba897ac, 09e6740): 22 U.S.C. 7105 and the two special immigrant statutes fetched (D-222 to D-224). CHP+ accepts a trafficking victim as a refugee (CO-2706, statute_override); Medicaid admits a special immigrant who has not adjusted as a refugee (CO-509, statute_override). OQ-550 keeps only the SAVE response-code mapping blocked for Medicaid and CHP+; the cash part is the cash track's. |
| P2-3 | Deferred P2: the trust, transfer, life estate and annuity tests stay caseworker findings (CO-824, CO-825, CO-1577, CO-1579). Outcomes are right when the facts are; modeling § 8.100.7.E-I as rules is an approval-risk improvement for a later round. |
| P2-4 | Open question OQ-624 (state policy choice; L.2.d against L.7 and 1396d(p)). |
| P2-5 | Fixed (a262bf8): CO-1156 reports ineligible_before_application for a month before the application (§ 8.941.1.E); aid-codes label added. |
| P3-1 | Fixed (09e6740): CO-01 and CO-02 comments now carry the MMMNA 3,909.50, allowance 2,729.50 and payment 0 derivation and eligible_institutional. |
| P3-2 | Fixed (09e6740): OQ-412's clause on 435.558 struck. |
| P3-3 | Accepted, no change: note at the SFY 2027-28 review (review_by 2027-07-01 is set on the premium tables). |
| OQ-520, OQ-550 | As P2-1 and P2-2. |
