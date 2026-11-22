# Coverage matrix, third pass: Adult Financial (OAP, AND-SO, AND-CS, Home Care Allowance, burial, disaster assistance)

Reviewer: an independent third exhaustive pass, made after the second coverage fix round (`b92d4fc`, disposition `fc41b13`). The matrix below was built from the rule text. The earlier matrices (docs/reviews/coverage-adult-financial.md and coverage2-adult-financial.md) were read only for sections 5 and 6.

Commit reviewed: `3ff8f12` (HEAD). Date: 2026-11-22. This file is the only repository file written. Nothing is committed.

Governing texts, all read from volumes/co/documents/:
- 9 CCR 2503-5 (D-80), rule version 12428, effective 03/02/2026: 3.500 to 3.587, lines 30-8829.
- C.R.S. 26-2-111 (D-59, lines 917-1250).
- The 20 CFR 416 provisions D-80 incorporates: 416.405-415 (SSI benefit standard, 3.510), 416.1124 (D-207, 3.520.786.K), 416.1205 (3.570.43.D.3.b), 416.1856 (D-262, through CO-4022) and 416.2095-2099 (3.531.D, 3.546.C, 3.570.11.E).

Tools:
- `npm run export -- --volume co` was run in a scratch copy (`git archive HEAD`, node_modules symlinked). It wrote 2,173 items; 227 are Adult Financial items.
- `scripts/eval-case.ts` was run on the stored cases CO-94, CO-120, CO-130, CO-165 to CO-169 and CO-196 to CO-198, and on five new scratch households (QZ-1, QZ-1C, QZ-2, QZ-2C, QZ-2K), each on 2026-10-01. The QZ households are built from CO-196 and kept at /tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cov3af-probes.yaml.

## 1. Verdict

**2 P1 found.** The Adult Financial family does not yet meet the stopping rule.

Both P1s are in the second fix round's new item, af_relative_deemable_unearned_income (CO-4720). G-1's fix made CO-4720 the spouse's, parent's and sponsor's counterpart of the client's own unearned income (af_unearned_income_other_than_ssi, CO-3831), but CO-4720 leaves out the two terms the first fix round added to CO-3831:
- lottery and gambling prizes (F-12; 3.520.785.B.13) (H-1);
- the expenses that offset workers' compensation, rental and insurance receipts (F-11; 3.520.785.B.9, B.14-16, B.20) (H-2).

So a spouse's or sponsor's prize is not deemed, and a spouse's or sponsor's workers' compensation or rental receipt is deemed gross. Each was reproduced with the engine. The 3.534.C, 3.544.F and 3.549.F exemption tests read CO-4720 too, so they are affected the same way. The pre-G-1 sums in CO-2384 and CO-2386 lacked both terms as well. These are gaps that the G-1 fix did not close, not answers the fix changed.

Every other edit from the two fix rounds was re-read against its paragraph and holds (section 6). Every earlier P1 that was re-run stays fixed (section 5).

## 2. Findings

| id | sev | paragraph | item(s) | governing text (quoted) | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| H-1 | **P1** | 3.520.785.B intro and B.13; 3.534.B.1, 3.544.E.1, 3.549.D.1 (spouse, parent); 3.534.D.1, 3.544.G.1, 3.549.G.1 (sponsor); 3.534.C, 3.544.F, 3.549.F (exemption test) | af_relative_deemable_unearned_income CO-4720, read by af_deemed_relative_income CO-2384 and af_deemed_sponsor_income CO-2386 | B: "Countable unearned income includes the following and any other payments that could be construed to be a gain or benefit to the client, client's spouse, or sponsor(s)". B.13: "Gifts and prizes." 3.534.B.1: "Calculate the total amount of unearned income of the spouse". | CO-3831 counts the client's lottery_gambling_winnings_received (CO-1181; F-12 fixed). CO-1181 is "Not part of the unearned income facts or of lump_sum_received", so a prize is only counted where an item reads that fact. CO-4720 does not read it, so a spouse's, parent's or sponsor's prize is never deemed. **Probe QZ-1:** an OAP client with $600 of Social Security and $500 in the bank lives with her husband. He has $1,000 of Social Security and a $2,000 lottery prize in October. He is not on Adult Financial, SSI or Medicaid. The volume deems **0**: countable income 590, oap, **$442**. The rule deems 3,000 - 1,032 = **1,968**: countable income 2,558, **none**. **Control QZ-1C**, with the same $2,000 stated as other_unearned_income_nontaxable (for example a cash gift), gives 1,968 deemed, none. | Add `[otherwise, lottery_gambling_winnings_received, 0]` to CO-4720's sum, as CO-3831 has it. Add a test, and store QZ-1 as a household case. |
| H-2 | **P1** | 3.520.785.B.9, B.14, B.15, B.16, B.20; 3.520.781.G.2.e.1-2; the same deeming paragraphs as H-1 | CO-4720; unearned_income_offsetting_expenses CO-4444; CO-2384, CO-2386 | B.9: "Payments for medical, legal, or related expenses incurred by the client, client's spouse, or sponsor(s) in connection with such claim are deducted prior to determining the amount of countable unearned income." B.20: "Rental income is countable to the extent it exceeds allowable expenses." | CO-3831 subtracts CO-4444 for the client (F-11 fixed). CO-4444 is person-scoped and stated on whoever pays the expense. CO-4720 does not subtract it, so a spouse's or sponsor's workers' compensation, rental, life or health insurance proceeds, or G.I. Bill receipt is deemed gross. **Probe QZ-2:** the QZ-1 couple, except that the husband has no Social Security, $2,000 of workers' compensation in October (in other_unearned_income_taxable) and $1,500 of medical and legal expenses on the claim (unearned_income_offsetting_expenses). The volume deems 2,000 - 1,032 = **968**: countable income 1,558, **none**. The rule counts 500 of his unearned income, so nothing is deemed: countable income 590, oap, **$442**. **Control QZ-2C** (his net $500 stated directly) gives oap, $442. **Control QZ-2K** (the client herself has the same $2,000 and $1,500, and he has $1,000 of Social Security) gives countable 490, oap, $542, so the expense is honoured only for the client. | Subtract `[otherwise, unearned_income_offsetting_expenses, 0]` in CO-4720, never below zero, as CO-3831 does. Add a test, and store QZ-2 as a household case. |
| H-3 | P2 | 3.520.784.B.2 | colorado_minimum_wage CO-4730; af_donated_work_income CO-4443 | "The current minimum wage standard, whichever is greater." | G-8 (3)'s fix replaced the federal figure, which covered every date, with colorado_minimum_wage. That parameter has one version, from 2026-01-01. The Adult Financial standards it sits beside carry 2025 versions (af_oap_grant_standard: 1,005 from 2025-01-01), so the volume determines 2025 months. For a 2025 month with countable donated work hours, CO-4443 now reads a parameter with no version in force and gives unknown. It gave a (federal) figure before. This is not a wrong answer. | Add the 2025 version from the 2025 PAY CALC Order (7 CCR 1103-14, on sos.state.co.us; the 2025 statewide figure is $14.81 and should be confirmed there), with its source. Or state in CO-4730's precision that no determination before 2026 reads it. |
| H-4 | P2 | C.R.S. 26-2-111(1)(d), (2)(a)(III); 9 CCR 2503-5 3.520.61.B, 3.532.D.3 | af_and_is_barred_as_institution_patient CO-4446; af_category CO-953 (OAP branch) | (1)(d): "The person is not an inmate of a public institution, except as a patient in a public medical institution, or is not a patient in any institution for tuberculosis or mental diseases ... but the provisions of this paragraph (d) shall not be applicable to or in any way affect the class of old age pension recipients provided for in subsection (2)(a)(III)". (2)(a)(III): "an inmate of an institution, not penal in character, maintained by the state or by a municipality therein or county thereof". | CO-4446's meaning says (1)(d) is "Not read for the Old Age Pension". The proviso exempts only the (2)(a)(III) class, inmates of a public institution that is not penal. An OAP client of 60 or older who is a patient in a private psychiatric hospital is outside that class, so the statute bars them. The rule bars only correctional inmates and fleeing felons (3.520.61.B), and it gives a PNA in a psychiatric facility at 65 or older (3.532.D.3). The volume follows the rule: such a client is paid OAP. This is a statute-against-rule choice with no open question. It is the same class of finding as coverage pass 2's G-6. | Record a needs-Legal open question that names both texts, cite it from CO-4446 and CO-953, and correct CO-4446's meaning to say which reading is modeled. |
| H-5 | P3 | 3.520.786.E; 3.534.C, 3.544.F, 3.549.F | CO-4720; adult_financial_cash_income; in_home_care_allowance_received CO-3824 | E: "Personal care or home care allowance grants paid to the client ... shall be exempt as income." | CO-4720 adds adult_financial_cash_income, whose meaning includes the Home Care Allowance. The HCA is exempted only when the case also states it in in_home_care_allowance_received. CO-3824's precision allows this ("or the fact that names the source"). If a case states a spouse's HCA only as adult_financial_cash_income, it is counted in the 3.534.C exemption test and deemed. | Say in CO-4720's precision that an HCA grant in adult_financial_cash_income is also stated as in_home_care_allowance_received, or subtract it there directly. |

Probe summary (engine result on 2026-10-01 compared with the text):

| probe | the volume | the text |
|---|---|---|
| QZ-1 (H-1), spouse's $2,000 prize | 0 deemed, 590, oap, $442 | 1,968 deemed, 2,558, none |
| QZ-1C (control, the same $2,000 as other unearned income) | 1,968 deemed, none | 1,968 deemed, none |
| QZ-2 (H-2), spouse's $2,000 workers' compensation less $1,500 claim expenses | 968 deemed, 1,558, none | 0 deemed, 590, oap, $442 |
| QZ-2C (control, the net $500 stated) | 0 deemed, oap, $442 | 0 deemed, oap, $442 |
| QZ-2K (control, the client's own receipt and expenses) | 490, oap, $542 | 490, oap, $542 |

## 3. Coverage matrix

Key:
- **C** = carried by. The derivation was read and checked against the paragraph.
- **NA** = not applicable, with the reason.
- **OQ** = open question.
- **H-n** = finding in section 2.

Where contiguous subparagraphs share one status, they are on one row.

### 3.500 and 3.510 (programs, definitions)

| paragraph | status |
|---|---|
| 3.500 (OAP, AND-SO, AND-CS, HCA, burial, disaster) | C: CO-953, CO-1203, CO-1217, CO-1231, CO-3877 |
| "Actual value", "Equity value", "Encumbrance", "Value (real and personal property)", "Fair Market Value", "Ownership", "Real property" | C: the holdings facts are stated as the person's equity share (CO-4000) |
| "Adequate", "Administrative disqualification hearing", "Administrative Law Judge", "Administrative error claim", "Client error claim", "Claim", "Creditor", "Liable individual", "Overpayment", "Recovery", "Timely notice", "Termination", "Denial", "Discontinuation" | NA: notice, hearing and recovery procedure |
| "Adult Financial approved setting", "Facility" | C: residence_setting_type (CO-3330), read by CO-1510 (PNA), CO-1217 (HCA home test, G-3 fixed), CO-4446 |
| "Anticipated income", "Irregular", "Periodic payments", "Received" (both), "Income", "Earned Income", "Unearned income", "In-kind" | C: the monthly income facts state receipt by month; CO-3830, CO-3831, CO-4437; infrequent income CO-3827 |
| "Applicant", "Application", "Approval", "Authorized representative", "Client", "Client Statement", "Collateral contact", "Signature", "Statewide automated system", "Local service delivery agency", "County department", "State Department", "Health Care Policy and Financing", "IM-19", "Withdraw" | NA: procedural definitions |
| "Assets", "Countable resource" (client, spouse or sponsor after exemptions) | C: CO-947, CO-2389, CO-2390 |
| "Bona fide loan" | C: CO-4412 (loan_proceeds_received) |
| "Cash surrender value", "Face value" | C: CO-4722, life_insurance_face_value (original face value per CO-4001) |
| "Certification period", "Redetermination", "Twenty-four (24) month redetermination", "Traditional verification", "Verification", "Verified upon receipt", "Questionable" | C: CO-1433 (resource verification by period); otherwise NA (procedure) |
| "Clear and convincing", "Preponderance of evidence", "Fraud", "Intent", "Intentional Program Violation", "Material fact", "Unintentional", "Willful", "Willful withholding of information" | NA: IPV and hearing standards; the IPV outcome is CO-4447 |
| "Countable income" (client, spouse or sponsor after exemptions) | C: CO-946; spouse and sponsor through CO-4720 and CO-3830 (H-1, H-2) |
| "Date of entry", "Non-citizen", "Qualified non-citizen", "Sponsor" | C: CO-905, CO-2386, CO-4400 |
| "Demonstrable evidence" | C: CO-1511 (Colorado Works closure bar) |
| "Disabling condition" | C: CO-4422's precision (24-month non-use) |
| "Disaster assistance" | C: CO-3877 |
| "Effective date of eligibility", "Eligibility requirements" | C: af_eligibility_date (CO-2391) in CO-2603 |
| "Eligible client" (resources below the limit) | C: CO-948; OQ-662 |
| "Estate", "Legal fiduciary" | C: CO-4000's precision (an incapacitated client's estate) |
| "Exempt income" | C: CO-2342, CO-2343 |
| "Federal Poverty Guidelines" | NA: used only in 3.520.69.B's presumption |
| "Fleeing felon" | C: is_fleeing_felon in CO-942 |
| "Good cause" | C: the supplied county findings that name it (CO-3860, CO-2004, CO-4428) |
| "Grant payment", "Grant standard", "Payment Floor Standard", "State Supplementary Payment" | C: CO-949, CO-951, CO-952, CO-1219 |
| "Homeless" | C: CO-4410, CO-4411 |
| "IM-14" | C: CO-4449 in CO-1203 |
| "Immediate family" | C: burial_spaces_value_beyond_family_needs (CO-3857) |
| "Involuntary transfer", "Transfer Without Fair Consideration" | C: CO-3836, CO-4008 |
| "Life Estate" | C: CO-1512's precision |
| "Marriage" (C.R.S. 14-2-104(1), common law, civil union) | C: the spouse relationship edge (CO-930) |
| "Medical provider" | C: CO-2824 |
| "Non-recipient spouse" | C: CO-2384 |
| "Personal Needs Allowance" | C: CO-1509, CO-1510 |
| "Potential income", "Potential resource" | C: CO-3861, CO-4433 |
| "Prudent Person Principle" | NA: county weighing |
| "Shelter costs" | C: CO-1512 |
| "SSI benefit standard" (416.405-415) | C: ssi_federal_benefit_rate_individual = 994 for 2026 |

### 3.520.1-3.520.5 (general requirements, documentation, oversight, application processing, interfaces)

| paragraph | status |
|---|---|
| 3.520.1 (county duties, notice of action within 11 days, conference and hearing rights, confidentiality, civil rights) | NA: administration and notice |
| 3.520.1 (incomplete applications denied; committed clients and wards) | C: CO-1436 (pending verification); application date in af_eligibility_date |
| 3.520.2 (documentation), 3.520.3 (review and oversight) | NA: county administration |
| 3.520.4 (processing within 45 days; interview notice of 4 days; missed interview denied; 30-day reuse of an application) | NA: processing time; the eligibility date it leads to is af_eligibility_date (CO-2391) |
| 3.520.4 (signing required forms) | C: CO-4449 (IM-14 for AND-SO); otherwise NA |
| 3.520.4.C.4.f (prohibited establishments) | C: CO-4448 (EBT misuse) |
| 3.520.4.D (verification due in 11 days; denial for failure; 30-day return) | C: CO-1436 and the af_*_verification_is_pending facts |
| 3.520.5 (SVES, SDX, BENDEX, IEVS, SAVE, PARIS; act within 45 days) | C: CO-1661, CO-1663 (SAVE; OQ-550); 3.520.5.D "For AND only" OQ-591; the rest NA (interfaces) |

### 3.520.61-3.520.69 (non-financial requirements)

| paragraph | status |
|---|---|
| 3.520.61.A (AND-SO 18-59, or 0-59 if blind; AND-CS 0-59; OAP 60+) | C: CO-1203 (min age, is_blind, max age), CO-950, CO-940; statute 26-2-111(4)(b) OQ-783 |
| 3.520.61.B (Colorado resident; correctional inmates, fleeing felons) | C: CO-942 (CO-3343, is_fleeing_felon) |
| 3.520.61.C (AND citizenship or qualified status) | C: CO-905 in CO-953 (AND-CS) and CO-1203 |
| 3.520.61.D, 3.520.65.A.1-4, B.1-3 (AND SSN; apply; SVES; denial) | C: CO-1430, CO-1661 |
| 3.520.61.E (AND disability) | C: CO-944 (AND-SO), CO-950 (SSI for disability or blindness) |
| 3.520.61.F, 3.520.71.F (Colorado Works) | C: CO-1511; statute (2)(d)(I) OQ-845 |
| 3.520.61.G-H, 3.520.71.A.3 (apply for benefits; pursue income and resources) | C: CO-3860, CO-3861, CO-4433, CO-4434 |
| 3.520.61.I (all other requirements) | C: CO-953 |
| 3.520.62.A-K (age documents) | C: CO-1658 |
| 3.520.63.A-C (marital status, verified if questionable; separate cases) | C: CO-1670, CO-1671; person-scoped items |
| 3.520.63.D (married unless legally separated or divorced) | C: CO-930; the spouse is deemed and counted wherever the spouse lives (CO-2384, CO-2389, CO-4001, CO-4002, CO-3854, re-read) |
| 3.520.64.A-B (resident from declaration; no residence while established elsewhere) | C: CO-505, state_of_residence in CO-942 |
| 3.520.64.B.2 (another State's payment that month) | C: received_financial_assistance_from_another_state_this_month in CO-942 |
| 3.520.64.C.1-2 (county; homeless clients eligible) | NA: county of application; no bar modeled, as the text says |
| 3.520.64.D.1-9 (indicators of a move) | C: state_of_residence (evidence for the supplied fact) |
| 3.520.64.E.1 (out of the country 30 or more days) | C: CO-4401, `>=` CO-4406 |
| 3.520.64.E.2 (out of State 90 or more days; medical exception) | C: CO-4401, `>=` CO-4407, temporary_absence_reason medical_treatment |
| 3.520.64.E.3 (more than 180 days in a calendar year) | C: CO-4401, `>` CO-4408 |
| 3.520.64.E.4 (180 or more days caring for an injured service member) | C: CO-4401 (CO-4404); OQ-780 |
| 3.520.64.E (rebuttal) | C: CO-4405 |
| 3.520.64.F (conflicting documents) | NA: county weighing |
| 3.520.64.G (burden; refusal denies) | C: CO-1659 |
| 3.520.66.A-E (identity documents; 1 CCR 204-30 Rule 16) | C: CO-1660, CO-1674 |
| 3.520.67.A.1-3, B-C (who is a citizen; verify when inconsistent; 45 CFR 1626.6) | C: CO-905, CO-1431, CO-1662, CO-1673 |
| 3.520.67.D (no targeting) | NA |
| 3.520.67.E (all non-citizens may apply for OAP) | C: CO-929 follows 26-2-111(2)(a)(I) and (2)(c) (qualified alien; hardship CO-2572; SSI) |
| 3.520.67.F (SAVE) | C: CO-1432, CO-1663; OQ-550 |
| 3.520.67.G.1-4 (non-citizens not eligible for AND) | C: CO-905 |
| 3.520.68.A (five-year bar from 08/22/1996) | C: CO-905 (has_held_qualified_status_five_years, entry cutoff) |
| 3.520.69 intro, A.1-3, D (sponsor information; failure denies) | C: CO-1672 |
| 3.520.69.B (125% presumption) | NA: describes the affidavit; deeming is 3.534.D |
| 3.520.69.B.1, B.2, B.5 (citizenship; 40 quarters; every sponsor dead) | C: CO-4400 (re-read) |
| 3.520.69.B.3-4 (leaves and gives up status; dies) | NA: no longer a resident or client (CO-942, CO-953 death arm) |
| 3.520.69.B.6 (removal and new admission) | C: CO-4400's precision (a new affidavit names the sponsor stated) |
| 3.520.69.C.1 (refugees and asylees; pending not exempt) | C: CO-4400 (status_before_lpr_adjustment) |
| 3.520.69.C.2-4 (agreements before 12/19/1997; relatives 1997-2013; all sponsors from 2014) | C: "Sponsor" is an I-864 signer (from 12/19/1997); C.3 is superseded by C.4 for any month the volume determines |
| 3.520.69.C.5 (sponsor solely liable) | NA: recovery |
| 3.520.69.E (deemed per 3.534 and 3.520.72) | C: CO-2386, CO-2390, CO-947 (H-1, H-2 for the income side) |

### 3.520.71-3.520.77 (financial requirements and resources)

| paragraph | status |
|---|---|
| 3.520.71.A.1 (resources below the limit) | C: CO-948; "below" or "at most" OQ-662 |
| 3.520.71.A.2, 3.520.781.A (income below the standard; equal or above is ineligible) | C: CO-953, CO-1203 (`<`) |
| 3.520.71.B (AND-SO applies for SSI and SSDI; appeals within 30 days; IAR choice) | C: CO-2004 in CO-1203; the IAR paragraph NA (recovery) |
| 3.520.71.B.1-4, D, D.1-5 (OAP: apply for SSA benefits and SSI, appeal; excuses) | C: CO-3860 (failure without an excuse is the supplied finding), CO-3862 |
| 3.520.71.C (11 days; AND-SO 60 days of conditional approval; subsequent applications 30 days) | C: CO-3865 to CO-3870 |
| 3.520.71.E (match SSA's ISM) | C: CO-1512 (CO-3405) |
| 3.520.71.F.1.a-c (caretaker not in the case; child's grant not counted) | C: CO-1511 reads the client's own receipt; tanf_cash_income is stated on the child; OQ-845 |
| 3.520.71.F.2.a-c (sanction, demonstrable evidence, disqualification, withdrawal; until removed) | C: CO-1511 (af_has_open_colorado_works_closure_bar) |
| 3.520.71.G, G.1-2 (other income; refused income counted; withdrawn if secured) | C: CO-3861 in CO-3831 |
| 3.520.71.H, H.1-2 (other resources; refused counted; proof of pursuit) | C: CO-4433 in CO-4000; CO-4434 in CO-1436 |
| 3.520.72.A.1.a, A.2.a ($2,000 unmarried, $3,000 married client) | C: CO-948 (CO-3045, CO-3046, is_married) |
| 3.520.72.A.1.b-c, A.2.b (sponsor limits; co-sponsor spouse $2,000 each) | C: CO-947 (re-read after G-5: the married test reads sponsor_spouses_not_cosigning with no household condition, as A.2.b says) |
| 3.520.72.B.1-6 (real and personal property, cash and convertible assets, notes) | C: CO-4000 (liquid, retirement, real property, vehicles), CO-4412, CO-4422 |
| 3.520.72.B.7 (CSV of life insurance) | C: CO-3400, CO-4001, CO-4002, CO-4722 |
| 3.520.72.B.8-9 (revocable burial funds; burial space beyond needs) | C: CO-4000 (revocable trust and contract over $1,500; CO-3857) |
| 3.520.72.B.10-11 (casualty proceeds; loan proceeds) | C: CO-4412 |
| 3.520.72.B.12 (estate of an incapacitated client) | C: CO-4000's precision |
| 3.520.72.B.13, a-c (trusts per POMS; corpus not payable is a transfer; trustee refusal) | C: CO-4432 (trust_corpus_payable_to_person_value), TWFC CO-3835; POMS is on ssa.gov, not an allowed host |
| 3.520.72.C (legally separated: the other spouse's sole property) | C: no spouse edge when legally separated (CO-930) |
| 3.520.72.D.1-5 (verify resources; client statement until the 24-month redetermination; cash by statement) | C: CO-1433 |
| 3.520.72.E (sponsor resources attributed the client's way; excess deemed) | C: CO-2390 (re-read: life insurance under the client's program, CO-4001/CO-4002 on each sponsor), CO-947 |
| 3.520.72.F.1-2 (SSI recipient: no resource verification) | C: CO-1433 |
| 3.520.73.A.1.a-b, B.2-4, C (account balances; securities; bonds; mineral rights; contacting institutions) | NA: how the county values a supplied holding |
| 3.520.73.A.2.a-c (joint accounts) | C: the holdings facts are the person's share (CO-4000's precision) |
| 3.520.73.B.1.a-b (retirement accounts less taxes, or less 20%) | C: CO-4000 (CO-4429, CO-4430) |
| 3.520.741.A (home exempt; statement verifies) | C: CO-4000 (home_equity counted only when it stops being the home) |
| 3.520.741.B.1-3, C.1-2 (actual value less encumbrances; ownership shares) | C: equity share in the holdings facts |
| 3.520.741.D, D.1-4 (two-thirds; co-owner hardship unless spouse or sponsor; efforts to sell; legal technicalities) | C: CO-4431 in CO-4000 |
| 3.520.742.A-B, B.1-2 (personal property values; $400 vehicle presumption) | NA: valuation of the supplied value |
| 3.520.742.C.1-3, D (unsaleable personal property; a lesser value) | C: CO-4431 |
| 3.520.75.A-C (evaluate CSV and original face value) | C: CO-4722, life_insurance_face_value |
| 3.520.75.D ($1,500 face total of client and spouse; sponsors) | C: CO-4001, CO-4002 (re-read: `>` the exemption limit, the spouse wherever the spouse lives), CO-2390 |
| 3.520.75.E.1-4 (OAP, CSV $250,000 or less; 48 months; payments in the lookback) | C: CO-3854 (re-read; lookback by purchase month) |
| 3.520.75.F.1-4 (OAP, over $250,000; the person's share of the excess) | C: CO-3854 |
| 3.520.75.G (original face value) | C: CO-4001's precision |
| 3.520.75.H (CSV chart: 1 0%, 2 5%, 3 10%, 4-5 20%, 6-10 30%, 11-14 45%, 15-19 50%, 20+ 60%) | C: CO-4721 (bands checked against the chart), CO-4722 (used only when the CSV is unstated and face value and purchase date are stated) |
| 3.520.76.A.1-4, a-b (TWFC; 36 months; rebuttable presumption) | C: CO-4008, CO-3836, CO-3838 |
| 3.520.76.B.1-3, C.1-3 (hardship; involuntary transfer) | C: CO-3836 (county finding) |
| 3.520.76.D.1-4 (uncompensated value / current grant standard, rounded down) | C: CO-3840, CO-4007 |
| 3.520.76.D.5 (starts the month after; sequential periods) | C: CO-3841 |
| 3.520.76.D.6, a-b (returned resource) | C: CO-3840 (CO-4009); a partial return is restated in CO-3835 |
| 3.520.76.E (1 to 36 months) | C: CO-3839 |
| 3.520.77.A (highest-valued vehicle used for transportation) | C: CO-4000 (transportation_vehicle_equity_value) |
| 3.520.77.B (household goods and personal effects) | NA: no holdings fact states them |
| 3.520.77.C, C.1 (home; income property on the home lot) | C: CO-4000, CO-4422 |
| 3.520.77.C.2-3, a-b, C.5 (care away from home with intent to return; occupancy by another) | C: CO-4000 (intends_to_return_home CO-4435) |
| 3.520.77.C.4 (OAP-C home) | C: CO-4000 (receives_oap_c) |
| 3.520.77.D.1.a-c (self-employment property; business cash; 12 or 24 months) | C: CO-4416; the in-use test is the county's statement (CO-4422's precision) |
| 3.520.77.D.2, D.5 (tools for a job; permits) | NA: no holdings fact states them |
| 3.520.77.D.3.a-c (home-use production property over $6,000) | C: CO-4422 (CO-4425, CO-4426) |
| 3.520.77.D.4.a-c (non-business income property; $6,000 at 6%; shortfall excused) | C: CO-4422 (CO-4423, CO-4424, CO-4427, CO-4428) |
| 3.520.77.E.1-3, F.1-3 (casualty and home-sale proceeds, 3 or 6 months; extension) | C: CO-4412 (CO-4417 to CO-4421) |
| 3.520.77.G.1-3 (burial trusts; trustor-beneficiary over $1,500; revocable $1,500) | C: CO-3855 (meaning covers G.2.d), CO-3858 |
| 3.520.77.H.1-2, a-b (prepaid burial contracts) | C: CO-3856 |
| 3.520.77.I.1-12 (burial spaces) | C: CO-3857 |
| 3.520.77.J (retroactive SSA benefits, 9 months) | C: CO-4414 |
| 3.520.77.K (refunds; 12 months) | C: CO-4172, CO-4413 |
| 3.520.77.L (bona fide loan, month received) | C: CO-4412 |
| 3.520.77.M (ABLE account) | C: CO-4415 |

### 3.520.78-3.520.79 (income and ISM)

| paragraph | status |
|---|---|
| 3.520.781.B.1-4, C-F (types; exempt; disregards; deeming; grant) | C: CO-946, CO-2384, CO-2386, CO-951, CO-952 |
| 3.520.781.G, G.1-2, a-d, f (month received; anticipated; contracts; three-month self-employment; 12-month averaging; COLA) | C: the monthly income facts state the anticipated or averaged amount (CO-1708's precision) |
| 3.520.781.G.2.e.1-3 (rental: 20 hours; averaged; joint share) | C: CO-1708 (self-employment), CO-4444 for the client (unearned); spouse and sponsor H-2 |
| 3.520.782.A (gross wages) | C: wages_gross in CO-3830 |
| 3.520.782.B, B.1-2 (in-kind earned income, client, spouse or sponsor) | C: CO-4437 in CO-3830 |
| 3.520.783.A-B.1-4, D (net profit; costs allowed and not) | C: CO-1707, CO-1708 |
| 3.520.783.C.1 (farm income: prior year averaged; nothing once farming stops) | C: CO-1708 (re-read: January-December of the prior year over CO-4723; farming_self_employment_end_date) |
| 3.520.783.C.2.a-d (rental at 20 hours, board, room, room and board) | C: CO-1708 (receipts less documentable costs) |
| 3.520.783.C.3.a-d (child care provider: $55, $22 each more, or documented costs if greater) | C: CO-1707 (re-read: max of the documented costs and the allowance), CO-4724, CO-4725 |
| 3.520.783.E-F (verification; irregular receipts averaged over 12 months) | C: CO-1665; the averaging is in the supplied amount |
| 3.520.784.A.1-4 (donated work: regular, necessary, would be hired, more than 5 hours) | C: CO-4443 (`>` CO-4442) |
| 3.520.784.B.1-2 (greater of the going rate or the minimum wage) | C: CO-4443, CO-4730 (D-330 to D-332, $15.16 for 2026); H-3 for 2025 |
| 3.520.784.C, C.1-4 (volunteering under 30 hours is not income) | C: CO-4443 counts only work that meets A |
| 3.520.785.A, B intro (unearned income of the client, spouse or sponsor) | C: CO-3831 (client); CO-4720 (spouse, parent, sponsor), **H-1, H-2** |
| 3.520.785.B.1, a-b (SSA benefits; lump sums; gross before recovery) | C: social_security_income (gross); lump_sum_received is part of the unearned facts (CO-3367); unspent after 9 months CO-4414 |
| 3.520.785.B.2-7 (pensions, disability, VA, RRB, UI, strike pay) | C: pension_income, unemployment_income, other unearned income facts |
| 3.520.785.B.8 (garnished amounts) | C: gross amounts stated |
| 3.520.785.B.9, B.14-16, B.20 (expenses offset) | C: CO-4444 in CO-3831 for the client; **H-2** for the spouse, parent and sponsor |
| 3.520.785.B.10 (dividends and interest) | OQ-782 (excluded under 3.520.786.K, CO-2343) |
| 3.520.785.B.11-12, B.17-19, B.21-25 (annuities, inheritance, joint property, lease bonuses, royalties, Civil Liberties Act, trusts, alimony, MMMNA, current child support) | C: the unearned income facts; child_support_received; MMMNA in other_unearned_income_nontaxable |
| 3.520.785.B.13 (gifts and prizes) | C: CO-3831 reads CO-1181 for the client; **H-1** for the spouse, parent and sponsor |
| 3.520.786 intro (exempt for the client, spouse or sponsor) | C: CO-2342, CO-2343; for the spouse, parent and sponsor through CO-3830 and CO-4720 |
| 3.520.786.A-J, L-M, O-P | C: CO-2343 (named receipt facts); H CO-2342; O CO-3827, CO-4012; E for a spouse's HCA, H-5 |
| 3.520.786.K (POMS SI 00830.099; 416.1124) | C: CO-2343 (federal table below) |
| 3.520.786.N (child support for another person) | C: child_support_received is stated on the child for whom it is paid |
| 3.520.79.A (ISM for OAP and AND-CS only) | C: CO-3831 adds ISM only for OAP age or AND-CS |
| 3.520.79.B.1-5, a-b (no ISM: owner, subsidized, homeless, fair share at market, costs at or over the maximum) | C: CO-1512 (CO-4410) |
| 3.520.79.B.6, a-b (match SSA's ISM) | C: CO-1512 (CO-3405) |
| 3.520.79.C.1-3 (below market; fair share; all supplied) | C: CO-1512 |
| 3.520.79.D (life estate) | C: CO-1512's precision |
| 3.520.79.E.1-2 (33.33% of the SSI standard plus $20, rounded) | C: CO-1513: 994 x 0.3333 + 20 = 351.30, which rounds to 351, as 3.530.B and 3.546.D state |

### 3.530-3.534 (OAP)

| paragraph | status |
|---|---|
| 3.530 intro, 3.530.1 (60 or older; OAP-C) | C: CO-940; receives_oap_c |
| 3.530.A ($1,032 from 01/01/2026) | C: af_oap_grant_standard (CO-289) |
| 3.530.B ($351 ISM maximum) | C: CO-1513 |
| 3.530.C ($189 payment floor) | C: af_oap_payment_floor in CO-951 |
| 3.531.A-C (data entry; client decides spending; appropriations) | NA |
| 3.531.D.1 (MOE lump sums, 416.2095-2099) | NA: not an entitlement and cannot be anticipated |
| 3.531.D.2 (State Supplementary Payment to the floor) | C: CO-951 (max of the floor and the grant) |
| 3.532.A-B (individual basis; standard less countable income; floor) | C: CO-951 |
| 3.532.B.1-2 (first month prorated by days remaining) | C: CO-2603 (3.581.D table) |
| 3.532.B.3 (moves to OAP from the birthday month) | C: CO-940 (af_is_oap_age from the birth month) |
| 3.532.C (payee; OAP-C reserve) | NA: payment method |
| 3.532.D.1-3 (PNA after 30 consecutive days; psychiatric facility at 65) | C: CO-1510, CO-2006 in CO-951 |
| 3.532.E.1-2 (penal inmates; unlicensed or uncertified facility) | C: CO-942 (CO-3343), af_resides_in_unlicensed_or_uncertified_facility in CO-951 |
| 3.532.F ($79 for every full month) | C: CO-1509, CO-1510; income against the PNA OQ-352 |
| 3.533 intro, A.1.a-c ($65 and half) | C: CO-946 (CO-3829 to CO-3833) |
| 3.533.A.2.a-e (gross unearned; SSI out; $20; married split; SSI only gets none; SSI back) | C: CO-946, CO-3831, CO-3832; split OQ-661 |
| 3.533.A.2.f (unused $20 rolls to earned) | C: CO-3833 |
| 3.533.B (grant; floor) | C: CO-951 |
| 3.534.A.1-5 (spouse's earned income: $65 and half; garnished wages count) | C: CO-2384 (CO-3830 on the spouse) |
| 3.534.B.1-2, B.6-7 (spouse's unearned income less the OAP standard) | C: CO-2384 with CO-4720; **H-1, H-2** |
| 3.534.B.3 (dependent children in the spouse's household: half the SSI standard less their income) | C: af_spouse_dependent_children_needs in CO-2384 |
| 3.534.B.4-5 (medical payments for dependents; court-ordered support unless garnished) | C: af_medical_payments_for_dependents, child_support_paid_legally_obligated in CO-2384 |
| 3.534.C (spouse on AF, SSI or Medicaid with income no greater than the OAP standard: nothing deemed) | C: CO-2384 (`<=`, CO-3830 + CO-4720); H-1, H-2, H-5 reach this test |
| 3.534.C (institutionalized spouse's MMMNA) | C: Medicaid post-eligibility; the retained MMMNA is the client's income (CO-2384's precision) |
| 3.534.D, D.1 (sponsor's total gross income) | C: CO-2386 (CO-3830, CO-4720 on each sponsor); **H-1, H-2** |
| 3.534.D.2.A (SSI standard for the sponsor) | C: CO-2386 |
| 3.534.D.2.B (half for a spouse in the same household; full for a co-sponsor spouse) | C: CO-2386, CO-2388 (re-read: lives_with_spouse CO-4731 on the non-signing spouse) |
| 3.534.D.2.C (half for each dependent; 3.520.68.B.2.b.1 of D-300) | C: CO-2386, CO-2387 |
| 3.534.D.3-5 (deemed as unearned; compared with the standard; undivided) | C: CO-946, CO-2386 |

### 3.540-3.545 (AND-SO)

| paragraph | status |
|---|---|
| 3.540 intro (18-59, or 0-59 blind; not on SSI or SSDI; total disability) | C: CO-1203; SSDI route OQ-138; under 18 OQ-783 |
| 3.540.A ($248) | C: af_and_so_grant_standard |
| 3.540.B (appropriations) | NA |
| 3.540.1 (definitions: blindness, SGA, total disability, residual functional capacity) | C: is_blind; the disability finding CO-944 (CO-2824) |
| 3.541.A.1-3, B-C (total disability, certified, Listing of Impairments, six months; weighing) | C: CO-944 (af_has_total_disability_six_months), CO-2824 |
| 3.541.1.A-C (certification form; 90-day dating; re-examination) | C: CO-2824's meaning |
| 3.541.2.A.1-3, a-g (error, improvement, RFC improvement) | C: the disability finding is restated (CO-944) |
| 3.541.2.B (working with income over the standard) | C: CO-1203 (`<` the standard after disregards) |
| 3.541.3.A-G (substance abuse: 12 months; treatment; two positive tests in 3 months; partial month) | C: CO-3849 (months received, `<` 12; positive tests `<` the limit; termination from treatment) |
| 3.542.A-B (eligibility from the later of application and meeting all requirements) | C: af_eligibility_date in CO-2603 |
| 3.543.A-B, B.1-2 (grant; first month prorated) | C: CO-952, CO-2603 |
| 3.543.C (payee) | NA |
| 3.543.D.1-2, E.1-2, F (PNA after 30 days; penal and unlicensed facilities; $79) | C: CO-952, CO-1510, CO-1509; OQ-352 |
| 3.544.A.1-3, B.1-3, C (disregards; married split) | C: CO-946; OQ-661 |
| 3.544.D.1-5 (spouse's earned income) | C: CO-2384 |
| 3.544.E.1-3 (spouse's gross unearned income less the unused $20) | C: CO-2384 with CO-4720; **H-1, H-2**; OQ-661 |
| 3.544.F (spouse on AF, SSI or Medicaid within the SSI standard) | C: CO-2384 (ssi_federal_benefit_rate_individual) |
| 3.544.G.1-5 (sponsor) | C: CO-2386, CO-2388; **H-1, H-2** |
| 3.544.H (total deducted from the grant) | C: CO-952 |
| 3.545.A (IAR; IM-14 signed) | C: CO-4449 in CO-1203; reimbursement NA |
| 3.545.B-J (reimbursement accounting) | NA: recovery from SSA |

### 3.546-3.549 (AND-CS)

| paragraph | status |
|---|---|
| 3.546 intro (0-59; SSI for disability or blindness, less than the full standard) | C: CO-950 (ssi_income below the standard); statute OQ-783 |
| 3.546.A ($994) | C: af_and_cs_grant_standard |
| 3.546.B, C.1 (appropriations; MOE) | NA |
| 3.546.C.2, E ($13 floor) | C: CO-1201 in CO-952 |
| 3.546.D ($351 ISM) | C: CO-1513 |
| 3.547.A, D (SSI for disability verified; terminated from SSI loses AND-CS) | C: CO-950 (receives_ssi, meets_ssa_disability_criteria or is_blind) |
| 3.547.B-C | NA |
| 3.548.A-B, B.1-2 (grant; first month prorated) | C: CO-952, CO-2603 |
| 3.548.C (payee) | NA |
| 3.548.D.1-2, E.1-2 (PNA after 30 days; penal and unlicensed facilities) | C: CO-952, CO-1510 |
| 3.548.F ($79; not reduced until the month after the first full month) | C: CO-952 (entry on or before the first of the previous month) |
| 3.548.G (gross SSI when SSA recovers) | C: ssi_income stated gross |
| 3.549.A.1-2, a-f, B (disregards; floor) | C: CO-946, CO-952 |
| 3.549.C.1-4 (spouse's earned income) | C: CO-2384 |
| 3.549.D.1-3 (spouse's unearned income less the unused $20) | C: CO-2384 with CO-4720; **H-1, H-2** |
| 3.549.E (unemancipated child under 18: parents deemed as a spouse) | C: CO-2384 (parents in the home, is_emancipated_minor) |
| 3.549.F (spouse or parent on AF, SSI or Medicaid within the SSI standard) | C: CO-2384 |
| 3.549.G.1-5 (sponsor) | C: CO-2386; **H-1, H-2** |
| 3.549.H (total; floor) | C: CO-952 |

### 3.550-3.560 (redetermination, changes, notice, transfers)

| paragraph | status |
|---|---|
| 3.550.A-I (redetermination by the 15th; interview; forms; correction) | NA: procedure; the 24-month resource reverification is CO-1433 |
| 3.551.A-B (late redetermination within 30 days, or a new application) | NA: procedure |
| 3.552.A-F (reporting changes) | NA |
| 3.553.A-C (acting on changes within 10 days) | NA |
| 3.553.D-E (overpayment for late reporting) | NA: recovery |
| 3.554.A-D (timely and adequate notice) | NA: notice |
| 3.560.A-C (case transfers) | NA: county administration |

### 3.570 (Home Care Allowance, burial, disaster assistance)

| paragraph | status |
|---|---|
| 3.570.11.A (age 5 or older; in-home personal care) | C: CO-1217 (af_hca_min_age) |
| 3.570.11.A.1-3, a-c (non-entitlement; HCBS first; functionally eligible for HCBS bars; three-month transition; not with HCBS) | C: CO-1217 (receives_hcbs_services, CO-2009) |
| 3.570.11.B ($977 floor for every tier from 01/01/2026) | C: CO-1219 (af_hca_payment_floor) |
| 3.570.11.C-D (not taxable; appropriations) | NA |
| 3.570.11.E.1-2 (MOE; State Supplementary Payment) | NA for MOE; SSP C: CO-1219 |
| 3.570.12 "Home" (non-facility; not a shelter or other temporary setting) | C: CO-1217 (re-read: every setting other than private_dwelling, room_and_board and commercial_property; CO-2010 for a shelter or temporary setting) |
| 3.570.12 "Medical leave", "Non-medical leave" | C: CO-1217 (a medical stay under 30 days; CO-4728) |
| 3.570.12 (other definitions: ADL, care planning, case management, CMA, functional assessment, reassessment, skilled care) | NA: CMA procedure |
| 3.570.13.A, B.1-3 (financial: SSI, AND-SO criteria, or OAP and HCA since 12/31/2013 continuously) | C: CO-1215 |
| 3.570.13.C.1-3 (tiers: capacity 21+; need 1-23, 24-37, 38-51) | C: CO-1216 |
| 3.570.13.D, E.1-3 (less than the maximum; both eligibilities needed) | C: hca_authorized_amount; CO-1217; tier maximums OQ-250 |
| 3.570.13.F (first of the month after approval, or the CMA's payment effective date, whichever is later; no retroactive payment) | C: CO-1219 (re-read; CO-4726, CO-4727; an effective date within a month pays that month, as CO-4727's precision says) |
| 3.570.13.G (referral) | NA |
| 3.570.14, 3.570.15 (scoring; ADLs) | C: the CMA's scores are supplied (hca_functional_capacity_score, hca_need_for_paid_care_score) |
| 3.570.16 (care planning and case management) | NA: CMA procedure |
| 3.570.17.A-B (CMA and county roles; notice) | NA |
| 3.570.17.C.1-2 (financial and functional; score minimums) | C: CO-1217 (CO-1215, CO-1216) |
| 3.570.17.C.3.a-f (no services for a month; refused or missed appointments; refuses to use the payment; refuses forms) | C: CO-1217 reads receipt of services and the CMA's findings as the authorized amount and tier (as the earlier passes record); no separate fact |
| 3.570.17.C.4.a (resident of a nursing facility, hospital or other long-term care facility) | C: CO-1217 (ineligible_setting) |
| 3.570.17.C.4.b (a stay of 30 days or more) | C: CO-1217 (institution_entry_date, expects_institutional_stay_of_thirty_days) |
| 3.570.17.C.5-6 (safety; cost-effectiveness) | C: the CMA's functional finding (af_hca_tier) |
| 3.570.17.C.7 (residing other than at home) | C: CO-1217 (re-read) |
| 3.570.17.C.7.a-b (leave; 42 days of combined leave from approval) | C: CO-1217 (`>` CO-4729 over CO-4728) |
| 3.570.17.C.8.a-b (moved out of State; day 31 of a temporary absence) | C: CO-942; CO-1217 (`>` af_hca_absence_max_days) |
| 3.570.17.C.9 (withdrawal) | NA: the client's request ends the case |
| 3.570.17.C.10 (day after death) | C: CO-1217 (ineligible_deceased, a month after the month of death) |
| 3.570.17.D-E, 3.570.18 (transfers; county and CMA duties) | NA |
| 3.570.41, 3.570.42 (burial purpose and definitions) | C: CO-1231, CO-1230 (legally responsible persons) |
| 3.570.43.A.1 (receiving OAP, AND, HCA or Medicaid at death) | C: CO-1220 (adult_financial_cash_income includes HCA) |
| 3.570.43.A.2-3 (estate and responsible persons insufficient) | C: CO-1230 (`>` 0 unmet) |
| 3.570.43.A.4, a-b ($2,500; plot excluded) | C: CO-1231 (`<=`); OQ-355 for F.1 |
| 3.570.43.B.1-2 ($1,500 benefit) | C: CO-1232 |
| 3.570.43.C (request within 30 days; extension up to a year) | C: CO-4436 in CO-1231 |
| 3.570.43.C.1-3 (choice of disposition; family; unknown preferences) | NA: arrangements |
| 3.570.43.D.1-4 (insurance, estate, responsible persons' resources over the SSI limit, 416.1205; widow at the individual limit) | C: CO-1230, af_burial_responsible_person_excess_resources |
| 3.570.43.E, F.1-2 (estimates; combined charges over $2,500: none; resubmission) | C: CO-1231; OQ-355 |
| 3.570.43.G-J (payments to providers; agreement; recovery) | NA |
| 3.570.51.A ($2,000 per client per disaster) | C: CO-3877 and af_disaster_assistance_payment |
| 3.570.51.B-D (payment period; late effects at the director's discretion) | C: declared_disaster_in_effect; D NA (discretion) |
| 3.570.52.A-C (approved for or receiving a grant; emergent need; request) | C: CO-3877 |
| 3.570.52.D, 3.570.53 (other assistance; county duties) | NA |

### 3.580-3.587 (payments, overpayments, IPV, fraud, recovery, appeals)

| paragraph | status |
|---|---|
| 3.581.A-B (issuance schedule; claims) | NA |
| 3.581.C.1-2 (eligibility ends at death; no payment for the following month) | C: CO-953 (first arm), CO-1203 (last conjunct), CO-1217 (re-read: date_of_death before the first of the month) |
| 3.581.C.3, a-b (the month of death kept for the personal representative) | C: no item bars the month of death; release NA |
| 3.581.D.1-4 (partial month table) | C: CO-2603 (days from the eligibility date to the end of the month) |
| 3.581.E (cents dropped unless SSI reduces the grant) | C: CO-951, CO-952 (floor, except af_grant_is_reduced_by_ssi_income) |
| 3.581.F-H (holding, expungement, underpayments, lost cards) | NA |
| 3.581.I.1-4 (EBT misuse: warning, card disabled, one month of ineligibility) | C: CO-4448 in CO-953, CO-1203, CO-1217 |
| 3.582 (overpayments) | NA: recovery |
| 3.583 (IPV; N disqualification periods) | C: CO-4447 in CO-953, CO-1203, CO-1217; the hearing procedure NA |
| 3.584 (fraudulent act), 3.585 (recovery), 3.586 (dispute resolution), 3.587 (appeals and fair hearings) | NA: recovery, hearing and appeal procedure |

### C.R.S. 26-2-111

| paragraph | status |
|---|---|
| (1)(a) (resident or legal immigrant) | C: CO-942 |
| (1)(b) (insufficient income and resources) | C: CO-953, CO-1203, CO-948 |
| (1)(c)(I)-(II) (transfers within 36 months; presumption; home transfers; bona fide sales) | C: CO-4008, CO-3836 |
| (1)(d) (public institution inmate; patient in a TB or mental-disease institution) | C: CO-4446 for AND; the OAP reading H-4; inmates CO-3343 |
| (2)(a)(I) (citizen or qualified alien, 60 or older, SSI resource requirements) | C: CO-940, CO-929, CO-948; OQ-662 |
| (2)(a)(III) (inmate of a non-penal public institution, 60 or older) | C: OAP is not barred by CO-4446 (H-4 for its scope) |
| (2)(b) (relatives' ability not considered; spouse and sponsor are) | C: CO-2384, CO-2386, CO-2389, CO-2390 |
| (2)(c)(I)-(III) (qualified alien: 26-2-111.8 entry, five-year bar, sponsor deeming; hardship; SSI) | C: CO-929 (CO-2572); OQ-591 |
| (2)(d)(I) (member of a Colorado Works household) | C: CO-1511; OQ-845 |
| (3), (3.5) (Colorado Works assignment) | NA: another family |
| (4) intro, (4)(a) (total disability six months, or SSDI) | C: CO-944; OQ-138 |
| (4)(b) (18 or older) | OQ-783 |
| (4)(b.5)(I)-(II) (applied for SSI; waiver) | C: CO-2004, CO-3865 to CO-3870 |
| (4)(c)(I)-(II) (AFDC household as the assistance unit; 1991 supplement) | C: CO-1511 (assistance unit); the 1991 supplement NA (closed class) |
| (4)(d) (SSI resource requirements) | C: CO-948; OQ-662 |
| (4)(e)(I)-(II), (4)(f) (substance use: treatment, testing, 12 months) | C: CO-3849 |
| (5) (aid to the blind) | NA: the current rule has no Aid to the Blind program (OQ-139 resolved) |

### Incorporated federal texts

| paragraph | status |
|---|---|
| 20 CFR 416.405-415 (SSI benefit standard) | C: ssi_federal_benefit_rate_individual (994 for 2026) in CO-950, CO-1513, CO-2384, CO-2386 |
| 20 CFR 416.1124(b) (other federal laws) | C: federally_excluded_payments_received in CO-2343 |
| 20 CFR 416.1124(c)(1)-(24) | C: CO-2343, item by item as its precision lists them (re-read against D-207); (c)(4), (14), (16) are in-kind and stated by no unearned fact; (c)(7) NA (Alaska); (c)(9), (15), (20), (22) OQ-782; (c)(12) CO-3832 |
| 20 CFR 416.1205 (SSI resource limits for burial's responsible persons) | C: ssi_resource_limit_individual and _couple in CO-1230's input |
| 20 CFR 416.1856 (child for the SSI exclusions) | C: CO-4022 |
| 20 CFR 416.2095-2099 (pass-along) | NA: MOE lump sums cannot be anticipated; the payment floors carry the State supplement |

Matrix size: 323 rows. 300 rows cover every numbered paragraph and lettered subparagraph of 3.500-3.587, grouped where the status is shared. 17 rows cover C.R.S. 26-2-111 and 6 cover the federal texts.

Out of scope for this pass: the working tree has staged, uncommitted changes from the Colorado Works coverage pass 3 fix work, among them af_barred_by_colorado_works (CO-1511, CW3-2: 3.520.71.F.2.c's "until ... otherwise ineligible"). They are not at HEAD and were not reviewed here.
- GAP rows: 0. Every paragraph has a carrying item, a recorded reason or an open question.
- Rows that carry a finding: H-1 (8 rows), H-2 (9 rows), H-3 (1), H-4 (2), H-5 (2).

## 4. Open-question confirmations

| OQ | class | confirmed? |
|---|---|---|
| OQ-138 (SSDI route into AND-SO) | needs Legal | **Yes.** 26-2-111(4)(a) admits an SSDI determination; 3.540 intro excludes SSDI recipients; CO-1203 reads `[not, receives_ssdi]`. |
| OQ-250 (HCA tier amounts) | blocked on a named document | **Yes.** 3.570.11.B, 3.570.13.C-D and 26-2-122.3 state no tier maximum; the schedule is published to CMAs, not on an allowed host. The corrected statement about the "home" test is now true (CO-1217, re-read). |
| OQ-352 (1) (income against the $79 PNA) | state policy choice | **Yes.** 3.532.F, 3.543.F and 3.548.F say nothing of income. |
| OQ-355 (plot in F.1's $2,500) | state policy choice | **Yes.** 3.570.43.A.4 excludes the plot; F.1 says "combined charges". |
| OQ-550 (SAVE status list) | blocked on a named document | **Yes.** The SAVE response codes are on uscis.gov, not an allowed host. |
| OQ-591 (OAP immigration verification) | needs Legal | **Yes.** 26-2-111(2)(c)(I) against 3.520.5.D ("For AND only") and 3.520.67.E. |
| OQ-661 (married $20 split) | state policy choice | **Yes.** 3.533.A.2.c.1 ("split equally"), 3.544.E.2 ("unless the client also has unearned income") and 3.549.D.2 ("any remaining ... or $20.00, whichever is less") differ. |
| OQ-662 (below or at most the limit) | state policy choice | **Yes.** 3.520.71.A.1 and 3.510 "Eligible client" say "below"; 26-2-111(2)(a)(I) and (4)(d) say SSI resource requirements. |
| OQ-780 (E.2 and E.4) | state policy choice | **Yes.** No paragraph of 3.520.64 relates them. |
| OQ-782 (interest and dividends) | state policy choice | **Yes.** 3.520.785.B.10 counts them; 3.520.786.K incorporates 416.1124(c)(22), which excludes them. |
| OQ-783 (AND under 18) | needs Legal | **Yes.** 26-2-111(4)(b) against 3.520.61.A, 3.540, 3.546 and 3.549.E. |
| OQ-845 (OAP and a Colorado Works household) | needs Legal | **Yes.** 26-2-111(2)(d)(I) does not define household; (4)(c)(I) defines it for AND only; 3.520.71.F.1.a and c read the assistance unit. |
| OQ-781 (minimum wage) | resolved | **Yes for 2026.** 7 CCR 1103-14 is on sos.state.co.us (D-330 to D-332). H-3: no 2025 version. |

No open question in this family is misclassified. One statute-against-rule choice has no open question: H-4 (26-2-111(1)(d) and private psychiatric institutions under OAP).

## 5. Earlier P1s: confirmation

Second pass (docs/reviews/coverage2-adult-financial.md):

| finding | status | evidence |
|---|---|---|
| G-1 (spouse and sponsor exemptions) | stays fixed | CO-196: 0 deemed, 590, oap, $442. **Its scope is incomplete: H-1, H-2.** |
| G-2 (life insurance, spouse living apart) | stays fixed | CO-197: resources 3,200, none. CO-4001, CO-4002 and CO-3854 were re-read: none has a lives_with condition. |
| G-3 (HCA home) | stays fixed | CO-198: ineligible_setting, $0. |
| G-4 (death) | stays fixed | The arms of CO-953, CO-1203 and CO-1217 were re-read (date_of_death before the first of the month). |
| G-5 (sponsor's spouse in the household) | stays fixed | CO-2388 now reads lives_with_spouse (CO-4731) on each non-signing spouse. CO-947 keeps the married test. CO-94 still deems 1,212 to each sponsored child. |

First pass (docs/reviews/coverage-adult-financial.md):

| finding | status | evidence |
|---|---|---|
| F-1 (absence presumptions) | stays fixed | CO-165: none, $0; HCA ineligible_residency. |
| F-2 (end of the sponsor's obligation) | stays fixed | CO-169: 0 deemed, oap, $452. |
| F-3 (spouse living apart, income) | stays fixed | CO-167: 2,558, none. |
| F-4 (AND-CS PNA lag) | stays fixed | CO-168: and_cs, $494 in October. |
| F-5 (homeless ISM) | stays fixed | CO-166: 931, oap, $189. |
| F-6 to F-9 (exempt liquid resources, self-support property, retirement taxes, unsaleable property, trusts) | stays fixed | CO-130 p1: 2,200, oap, $542. CO-4412 and CO-4422 were re-read. |
| F-10, F-11, F-12 (in-kind and donated work; offsetting expenses; prizes) | stays fixed for the client | CO-3830 and CO-3831 were re-read. **They were not carried into CO-4720 for a spouse, parent or sponsor (H-1, H-2).** |
| F-13 (26-2-111(1)(d)) | stays fixed for AND | CO-4446 is in CO-953 (AND-CS) and CO-1203. H-4 is about its OAP scope. |
| F-14 to F-16 (IPV and EBT; sponsor resources; sponsor's dependents) | stays fixed | CO-4447 and CO-4448 are in each branch; CO-2390 was re-read; CO-94: 1,212. |
| FC-4, FC-5 (earlier cash review) | stays fixed | CO-120: oap, $542 each. |

## 6. The fix rounds' changed items, re-read

| item | what was checked | result |
|---|---|---|
| CO-4720 (new) | sum against CO-3831; exemptions on the person | H-1, H-2 (missing terms); H-5 (P3) |
| CO-4721, CO-4722 (new) | bands against 3.520.75.H; years from the purchase date; used only when the CSV is unknown | holds |
| CO-4723, CO-1708 | prior calendar year averaged; stop after farming ends | holds |
| CO-4724, CO-4725, CO-1707 | $55 and $22, or the documented costs when greater | holds |
| CO-4726, CO-4727, CO-1219 | later of the month after approval and the effective date; nothing before | holds |
| CO-4728, CO-4729, CO-1217 | 42 days, `>`; settings; death; 30-day stay | holds |
| CO-4730, CO-4443 | $15.16 from 2026-01-01 | holds for 2026; H-3 for 2025 |
| CO-4731, CO-2388, CO-947 | same household for the half-standard deduction; married test for the limit | holds |
| CO-2384, CO-2386 | earned income through CO-3830; unearned income through CO-4720; 3.534.C test | holds apart from H-1, H-2 |
| CO-2389, CO-4001, CO-4002, CO-3854 | spouse wherever the spouse lives; estimated CSV | holds |
| CO-953, CO-1203 | death arm; IPV, EBT, IMD, IM-14 conjuncts | holds; H-4 on CO-4446's OAP scope |
| CO-4400 to CO-4449 | derivations of CO-4400, CO-4401, CO-4410, CO-4412, CO-4422 and CO-4446 re-read against 3.520.69, 3.520.64.E, 3.510 "Homeless", 3.520.77.E-M, 3.520.77.D and 26-2-111(1)(d) | holds, apart from H-4 |

P2 count: 2 (H-3, H-4). P3: 1 (H-5).
