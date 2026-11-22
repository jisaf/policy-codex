# Coverage matrix, second pass: Adult Financial (OAP, AND-SO, AND-CS, Home Care Allowance, burial, disaster assistance)

Reviewer: an independent second exhaustive pass, made after the coverage fix round. The first pass and its disposition are in docs/reviews/coverage-adult-financial.md. This matrix was built again from the rule text. It was not copied from the first pass, and the first pass was read only for section 5.

Commit reviewed: `65ed7c8` (HEAD). Date: 2026-11-22. This file is the only repository file written. Nothing is committed.

Governing texts, all read from volumes/co/documents/:
- 9 CCR 2503-5 (D-80), rule version 12428, effective 03/02/2026, lines 30-8829. Every numbered paragraph from 3.500 to 3.587 was read.
- C.R.S. 26-2-111 (D-59).
- The 20 CFR 416 provisions D-80 incorporates: 416.405-415 (SSI benefit standard), 416.1124 (D-207), 416.1205, 416.1856 (D-262) and 416.2095-2099.
- The archived rule version 10320 (D-300), only for the cross-reference in 3.534.D.2.C.

Tools:
- `npm run export -- --volume co` was run in a scratch copy (`git archive HEAD`, node_modules symlinked). It wrote 2,143 items; 217 of them are Adult Financial items.
- `scripts/eval-case.ts` was run on eleven scratch households (PZ-1, PZ-2, PZ-2B, PZ-3, PZ-3H, PZ-4, PZ-5 and PZ-5C, plus the first pass's PR-IMD, PR-PTC and PR-RENT) and on the stored cases CO-94, CO-120, CO-130 and CO-165 to CO-169. Each run uses a determination date of 2026-10-01. The PZ households are kept at /tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/cov2af-probes.yaml.

## 1. Verdict

**5 P1 found.** The Adult Financial family does not yet meet the stopping rule.

Four of the five P1s sit in seams the first pass's fixes opened or left behind:
- F-3's fix made a spouse count wherever the spouse lives. The life insurance totals still add only a spouse who lives with the client (G-2).
- F-3's fix deems a spouse's gross income. No exemption in 3.520.786 is applied to it (G-1).
- The vocabulary round narrowed Home Care Allowance's "home" test to medical institutions, so a client in an assisted living residence or group home is paid (G-3).
- Sponsor deeming deducts for a sponsor's spouse who lives elsewhere (G-5).

The fifth P1 is a text no earlier pass mapped: eligibility ends at death (3.581.C, G-4).

Every P1 was reproduced with the engine. Every first-pass P1 that was spot-checked stays fixed (section 5).

## 2. Findings

| id | sev | paragraph | item(s) | governing text (quoted) | what is wrong | proposed fix |
|---|---|---|---|---|---|---|
| G-1 | **P1** | 3.520.786 (intro) with A-P; 3.534.B.1; 3.544.E.1; 3.549.D.1; 3.534.D.1, 3.544.G.1, 3.549.G.1 | af_deemed_relative_income CO-2384; af_deemed_sponsor_income CO-2386 | 3.520.786: "Certain earned and unearned income that is not countable to the client, client's spouse, or sponsor(s) in whole or in part is exempt." A: "Income tax refunds, including the Property Tax/Rent/Heat Credit (PTC) rebate, in the month received." 3.534.B.1: "Calculate the total amount of unearned income of the spouse". 3.510 "Countable income": income "considered available to the client, spouse of the client, or sponsor(s) of the client after the application of valid exemptions". | CO-2384 deems the spouse's gross unearned income (Social Security, pension, other unearned income both taxable and not, tax-exempt interest and so on) and never subtracts the 3.520.786 exemptions. The client's own income (CO-3831) does subtract them, through af_excluded_unearned_income (CO-2343). Each excluded receipt (tax refunds, energy assistance, educational grants, crime-victim compensation, reverse-mortgage payments, VA Aid and Attendance used for care, interest and dividends under OQ-782, infrequent income under $60) is "part of the gross income facts". So for a spouse it is deemed. CO-2386 does the same with a sponsor's income. **Probe PZ-1:** an OAP client with $600 of Social Security lives with her husband. He has $1,000 of Social Security and a $500 income tax refund in October, and he is not on Adult Financial, SSI or Medicaid. The volume deems 1,500 - 1,032 = **468**, so countable income is 1,058 and the category is **none**. The rule deems nothing (1,000 - 1,032 < 0): countable income is 590, the category is oap, and the grant is **$442**. | Evaluate af_excluded_unearned_income and af_excluded_earned_income on the spouse (and on a parent of an AND-CS child) and subtract them in CO-2384. Do the same for each sponsor in CO-2386. If the State reads the sponsor paragraphs' "total gross earned and unearned income" (D.1, G.1) as income before exemptions, record that reading as an open question, because 3.520.786 names sponsors. |
| G-2 | **P1** | 3.520.75.D, E, F; 3.520.63.D | af_life_insurance_countable_value_for_oap CO-4001, af_life_insurance_countable_value_other_than_oap CO-4002, af_life_insurance_countable_cash_value CO-3854; af_client_and_spouse_countable_resources CO-2389 | D: "If the total face value of all life insurance policies owned by a client and his or her spouse is equal to $1,500 or less, the full CSV of all policies is exempt." E and F: "the total face value of all life insurance policies owned by a client and his or her spouse ... the CSV of all policies combined". | Since F-3, CO-2389 counts the spouse's resources "wherever the spouse lives" (its precision gives the reason: 3.520.63.D, and no living-together condition in the text). The three life insurance items still add the spouse's face value and cash value only when the spouse is "in Lives with". So for a couple living apart, each spouse's policies are tested alone against the $1,500 face total and the $250,000 cash-value cap. **Probe PZ-2:** an OAP client and her husband, who lives in another home. Each has a policy bought on 2024-03-01 with a face value of $1,000 and a cash surrender value of $900, and $700 in the bank. The volume counts **1,400**: oap, $442. The rule's face total is $2,000, over $1,500, and E.3 applies (bought within 48 months), so all $1,800 of cash value counts: **3,200** > 3,000, none. PZ-2B is the same couple in one home, and the volume gives 3,200, none, so living apart is the only difference. | Read the spouse edge in CO-4001, CO-4002 and CO-3854 as CO-2389 reads it, with no lives_with condition. |
| G-3 | **P1** | 3.570.12 "Home"; 3.510 "Facility"; 3.570.17.C.4.a, C.7 | af_hca_eligibility_status CO-1217 (reads resides_in_medical_institution CO-1742) | 3.570.12: "'Home' means a non-facility residence." 3.510: "Facilities include general medical and surgical hospitals, nursing homes, regional centers, group and host homes, and mental health in[stitutions]". C.4: deny or discontinue when the client "a. Is a resident of a nursing facility, hospital, or any other long-term care facility". C.7: "when the client is residing anywhere other than his OR her home." | The only facility test in CO-1217 is resides_in_medical_institution: a hospital, nursing facility, ICF/IID, psychiatric hospital or TB hospital. CO-1742's precision says that "Group homes, assisted living residences and treatment centres ... are not included." The vocabulary round (R-8) swapped this fact in for SNAP's institution fact, which narrowed the home test, and OQ-250 still calls the "home" test modeled. **Probe PZ-3:** an SSI recipient, 46, has lived in an assisted living residence since 2026-01-05, with a functional capacity score of 25, a need-for-paid-care score of 30 and an authorized amount of $500. The volume gives **eligible, $977**, the same as PZ-3H, which is the same client in a private dwelling. The rule makes her ineligible (C.4.a, C.7). A group home, host home or other long-term care facility gives the same result. | In CO-1217, return ineligible_setting for every residence_setting_type other than private_dwelling. Keep the 30-day reading (C.4.b with C.7.a's medical leave) only for a temporary stay away from a home the client keeps. Correct OQ-250's statement. |
| G-4 | **P1** | 3.581.C.1-2 | af_category CO-953, af_and_so_eligible CO-1203, af_hca_eligibility_status CO-1217 | C.1: "A client's eligibility shall end on the date of his or her death." C.2: "If a client of any category of assistance dies before 12:00 a.m. on the first day of a month, no eligibility for a grant payment for the following month exists." | No Adult Financial eligibility item reads date_of_death (CO-2868). Only burial (CO-1220) reads it. Colorado Works carries the same rule, as ineligible_deceased (coverage round, colorado-notes). **Probe PZ-4:** an OAP client whose date of death is 2026-09-15. For October the volume gives **oap, $442**. The rule gives no eligibility, $0. HCA (3.570.17.C.10, "effective the day after the client's date of death") has the same gap. | Make every branch of CO-953, CO-1203 and CO-1217 ineligible for a month that begins after date_of_death. The month of death keeps its payment (C.3). |
| G-5 | **P1** | 3.534.D.2.B, 3.544.G.2.b, 3.549.G.2.b | af_deemed_sponsor_income CO-2386; sponsor_has_spouse_in_household CO-2388 | D.2.B: "A deduction for the sponsor's spouse living in the same household with the sponsor, equal to one-half the current SSI benefit standard". | CO-2388's meaning says the spouse is "living in the same household as the sponsor". Its derivation only tests whether sponsor_spouses_not_cosigning (CO-2714) is non-empty: any spouse of a sponsor in the case, with no lives_with test. CO-2386 therefore takes the half-standard deduction for a sponsor's spouse who lives elsewhere. **Probe PZ-5:** a sponsor earns $4,000 and lives with the client, and the sponsor's non-signing spouse lives in another home. The volume deems **2,509** (4,000 - 994 - 497). The rule deems **3,006**, the same as PZ-5C, which has no spouse. (CO-947's resource limit is right to ignore living arrangements: 3.520.72.A.2.b reads "a married sponsor whose spouse is not a co-sponsor", with no household condition.) | In CO-2386, add the lives_with condition for the half-standard deduction. Split CO-2388 into a married test (read by CO-947) and a same-household test (read by CO-2386), or correct its meaning. |
| G-6 | P2 | C.R.S. 26-2-111(2)(d)(I) against 3.520.71.F.1.a-c | af_barred_by_colorado_works CO-1511 | (2)(d)(I): "A person who is a member of a household that is receiving public assistance under the Colorado works program ... shall not be eligible to receive public assistance pursuant to this subsection (2)." 3.520.71.F.1.a: "A grandparent or any other specified caretaker who is not a parent is not required to be a member of the TANF/Colorado Works case"; c: "The TANF/Colorado Works funds received for the support of a child are not used in determining the specified caretaker's eligibility". | CO-1511 reads the person's own receipt (receives_tanf_cash). That is the rule's reading, with "household" read as the assistance unit, as (4)(c)(I) defines it for AND. OAP's (2)(d) has no such definition, and no open question records the choice. The answer is plausibly right. | Record a needs-Legal open question naming both texts. |
| G-7 | P2 | 3.520.75.H | life_insurance_cash_surrender_value CO-3396; CO-4002, CO-3854 | "Use the following chart to estimate a life insurance policy's CSV if not available ... 20 OR MORE 60% ... 1 0%". | An unstated cash surrender value is read as 0. The chart's estimate (a percentage of face value by years in force) is not carried, and no reason is recorded. For an AND client whose face total is over $1,500, the chart would count a value. | State the chart as a parameter table and use it when the cash value is unknown and the face value and purchase date are stated. Or record why not. |
| G-8 | P3 | 3.520.77.C.4; 3.520.69.B.6; OQ-781 | CO-4000; CO-4400; OQ-781 | C.4: "The home of an OAP-C client ... shall be exempt as a resource during the period of commitment." B.6: removal proceedings and "a new grant of admission status ... based on a new affidavit of support". | (1) For a client in a facility, CO-4000 counts home equity when intends_to_return_home is false. For an OAP-C client, C.4 exempts the home whatever the intent. The default of true hides this. (2) B.6 is not named in CO-4400. A new affidavit names a new sponsor, whom the case states as the sponsor, so the answer does not change. (3) OQ-781 says Colorado's 2026 minimum wage is published only by the Department of Labor and Employment. The Department's PAY CALC and COMPS orders are filed as 7 CCR 1103-1 with the Secretary of State. This pass could not confirm the figure there (the search tool's credits ran out). | (1) Exempt the home for OAP-C in CO-4000. (2) Name B.6 in CO-4400's precision. (3) Check 7 CCR 1103-1 on sos.state.co.us before keeping OQ-781's blocked-source sentence. |

Probe summary (engine result compared with the text):

| probe | the volume | the text |
|---|---|---|
| PZ-1 (G-1) | 468 deemed, none, $0 | 0 deemed, oap, $442 |
| PZ-2 (G-2), spouses apart | resources 1,400, oap, $442 | 3,200, none |
| PZ-2B (control, same home) | 3,200, none | 3,200, none |
| PZ-3 (G-3), assisted living | HCA eligible, $977 | ineligible (C.4.a, C.7) |
| PZ-3H (control, private dwelling) | eligible, $977 | eligible |
| PZ-4 (G-4), died 2026-09-15 | October oap, $442 | no eligibility |
| PZ-5 (G-5), sponsor's spouse elsewhere | 2,509 deemed | 3,006 |
| PZ-5C (control, no spouse) | 3,006 | 3,006 |

## 3. Coverage matrix

Key:
- **C** = carried by (the derivation was read and checked against the paragraph).
- **NA** = not applicable, with the reason.
- **OQ** = open question.
- **G-n** = finding in section 2.

Contiguous subparagraphs that share one status are on one row.

### 3.500-3.510 (scope and definitions)

| paragraph | status |
|---|---|
| 3.500 (programs) | C: af_category CO-953, af_hca_eligibility_status CO-1217, af_burial_eligible CO-1231, af_disaster_assistance_eligible CO-3877 |
| "Actual value", "Equity value", "Encumbrance", "Value" (both) | C: the holdings facts state equity (CO-4000's precision) |
| "Adequate", "ADH", "ALJ", "Administrative error claim", "Client error claim", "Claim", "Recovery", "Overpayment", "Liable individual" | NA: notice, hearing and recovery procedure |
| "Adult Financial approved setting" | C: stated as other_long_term_care_facility (CO-1510) |
| "Anticipated income", "Irregular", "Periodic payments", "Received" (income) | C: the monthly income facts state receipt by month; infrequent income CO-3827, CO-4011 |
| "Applicant", "Application", "Approval", "Authorized representative", "Client", "Client Statement", "Collateral contact", "Signature", "Scheduled appointment", "Withdraw" | NA: definitions used by procedure |
| "Available", "Assets", "Resources" (first of month or application date) | C: CO-4000's precision (P3 of the first pass, fixed) |
| "Bona fide loan" | C: CO-4412 (loan_proceeds_received) |
| "CMA", "Case Management Agency" | NA: HCA administration |
| "Cash surrender value", "Face value" | C: CO-3396; original face value CO-4001's precision |
| "Certification period", "Redetermination", "Twenty-four month redetermination", "Traditional verification" | C: CO-2376, CO-2377 in CO-1433 |
| "Clear and convincing", "Preponderance", "Prudent Person", "Material fact", "Questionable" | NA: evidence standards for county findings, which are supplied |
| "Convertible asset" | C: liquid_resources_value, retirement_accounts_value in CO-4000 |
| "Countable income", "Countable resource" | C: CO-946, CO-947; G-1 (the spouse's and sponsor's exemptions) |
| "Date of entry" | C: CO-905 (qualified status date) |
| "Demonstrable evidence" | C: CO-2008 in CO-1511 |
| "Disabling condition", "Medical provider" | C: CO-1728, CO-2824 (county finding) |
| "Disaster assistance" | C: CO-3877, CO-3878 |
| "Earned Income", "In-kind", "Income", "Unearned income" | C: CO-3830, CO-3831 (F-10 fixed) |
| "Eligible client" (income below the grant standard, resources below the limit) | C: CO-953 (less than); resources OQ-662 |
| "Estate" | C: client's own holding (CO-4000's precision) |
| "Facility" (includes group and host homes) | C for the PNA (CO-1510); **G-3** for HCA |
| "Fair Market Value" | NA: valuation for the supplied value |
| "Federal Poverty Guidelines" (90 FR 5917) | NA: 3.520.69.B's 125% presumption describes the affidavit; deeming uses the SSI standard (3.534.D) |
| "Fleeing felon" | C: is_fleeing_felon CO-038 in CO-942 |
| "Fraud", "IPV", "Intent", "Willful", "Willful withholding", "Unintentional" | C (IPV bar): CO-4447; otherwise NA (claims) |
| "Good cause" | C: county findings in CO-3860, CO-4428, CO-4421 |
| "Grant payment", "Grant standard" | C: CO-949 (CO-289, CO-290, CO-291) |
| "Homeless" | C: af_is_homeless CO-4410, CO-4411 (F-5 fixed) |
| "IM-14", "IM-19" | C: CO-4449 (IM-14); IM-19 NA (apportionment notice) |
| "Immediate family" | C: burial spaces CO-3857; CO-4404 |
| "Involuntary transfer" A-C | C: af_transfer_found_not_twfc CO-3836 |
| "Legal fiduciary", "Ownership", "Life Estate" | C: CO-4000 (joint accounts), CO-1512 (life estate) |
| "Local service delivery agency", "County department", "State Department", "HCPF", "Statewide automated system", "Creditor" | NA: administration |
| "Marriage" | C: is_married CO-930 |
| "Non-citizen", "Qualified non-citizen", "Sponsor" | C: CO-905, CO-929, CO-1573, CO-2713 |
| "Non-recipient spouse" | C: CO-2384 |
| "Payment Floor Standard", "State Supplementary Payment" | C: CO-1200, CO-1201, CO-1202 in CO-951, CO-952, CO-1219 |
| "Personal Needs Allowance" | C: CO-1509 |
| "Personal property", "Real property" | C: vehicles_equity_value, real_property_other_than_home_equity in CO-4000 |
| "Potential income", "Potential resource" | C: CO-3861, CO-4433, CO-4434 |
| "Shelter costs" | C: CO-1512 |
| "SSI benefit standard" (416.405-415) | C: ssi_federal_benefit_rate_individual CO-235 |
| "Termination", "Timely notice", "Denial", "Discontinuation", "Effective date", "Eligibility requirements" | NA: notice procedure; effective date CO-2391 |
| "Verification", "Verified upon receipt" | C: the af_*_verification_is_pending items |

### 3.520.1-3.520.3 (general requirements, documentation, oversight)

| paragraph | status |
|---|---|
| 3.520.1.A.1-6 (information available) | NA: outreach |
| 3.520.1.B.1-10 (county duties) | NA: procedure; B.8's withdrawal-as-denial is not an eligibility condition |
| 3.520.1.C (signed application; illiterate client's mark) | NA: application form; the determination presumes an application |
| 3.520.1.D-F (answer questions; voter registration; ACP) | NA: procedure |
| 3.520.1.G.1-3 (use of the grant) | NA: no eligibility effect |
| 3.520.1.H.1-4 (notice of action) | NA: notice |
| 3.520.1.I.1-4 (conference, hearing, judicial review) | NA: appeals |
| 3.520.1.J.1-10 (confidentiality) | NA |
| 3.520.1.K.1-6 (non-discrimination) | NA |
| 3.520.2.A-G (case record) | NA |
| 3.520.3.A-F (State oversight, supervisory review) | NA |

### 3.520.4-3.520.5 (application processing, interfaces)

| paragraph | status |
|---|---|
| 3.520.4 intro (45 days) | NA: processing standard |
| 3.520.4.A-B (date, review for all programs) | NA |
| 3.520.4.C.1-2 (interview offer, 4-day notice) | NA |
| 3.520.4.C.3, C.6 (missed interview: denial) | C: af_interview_date CO-2005 (AND-SO dates); otherwise NA: no interview has happened when no case is stated |
| 3.520.4.C.4.a-e, g-h (interview content; 10th-of-month reporting) | NA |
| 3.520.4.C.4.c.4 (AND-SO certification form, IM-14, SSI) | C: CO-2824, CO-4449, CO-2004 |
| 3.520.4.C.4.f.1-2 (EBT prohibited places) | C via 3.581.I: CO-4448 |
| 3.520.4.C.5, C.5.a (one interview; refusing a required form denies) | C: CO-4449 (IM-14); other forms NA (a refused form is not stated as a fact) |
| 3.520.4.C.5.b (another program's application within 60 days) | NA |
| 3.520.4.C.6.a.1-3 (re-application after a missed interview) | NA: application date, CO-3837 |
| 3.520.4.D.1.a-c (verification request, 11 days) | C: af_verification_response_days CO-1353, CO-2382, CO-1437, CO-1438 |
| 3.520.4.D.2.a-e (collateral contact, home visit, refusal) | NA: county method; outcome in the verification facts |
| 3.520.4.D.3-6 (record dates, late verifications, reevaluation) | NA |
| 3.520.4.D.7.a-b (no delay for an SSN application or SVES) | C: CO-1430 (proof of application) |
| 3.520.4.E (notice) | NA |
| 3.520.5 intro, A (IEVS, verified upon receipt for SSA and UIB) | C: CO-3882, CO-3883 (electronic sources) |
| 3.520.5.A.2 (DOLE wages not verified upon receipt) | C: CO-1665 through CO-3882 (OQ-317 resolved) |
| 3.520.5.A.3 (verify potential income for client, spouse, sponsor) | C: CO-3884, CO-1672 |
| 3.520.5.A.4-6 (IEVS timeliness, notice) | NA |
| 3.520.5.B (SVES) | C: CO-1661 |
| 3.520.5.C (PARIS) | NA: recorded in colorado-notes; its result is CO-3859 |
| 3.520.5.D.1-3 (SAVE for AND) | C: CO-1432, CO-1663, CO-1672 |
| 3.520.5.E (DMV identity) | C: CO-1660 |

### 3.520.61-3.520.69 (non-financial requirements)

| paragraph | status |
|---|---|
| 3.520.61.A (AND-SO 18-59, or 0-59 if blind; AND-CS 0-59; OAP 60+) | C: CO-1203 (CO-287, CO-288), CO-950, CO-940 (CO-285); statute OQ-783 |
| 3.520.61.B (resident; inmates, fleeing felons) | C: CO-942 (CO-505, CO-038, CO-3343) |
| 3.520.61.C (AND citizenship or qualified status) | C: CO-905 in CO-953 (AND-CS) and CO-1203 |
| 3.520.61.D (AND SSN) | C: CO-1430, CO-1661 |
| 3.520.61.E (AND disability) | C: CO-944, CO-950 |
| 3.520.61.F (Colorado Works) | C: CO-1511, CO-2008; statute G-6 |
| 3.520.61.G (apply for and accept benefits) | C: CO-3860 |
| 3.520.61.H (pursue income and resources) | C: CO-3861, CO-4433, CO-4434 |
| 3.520.61.I (all other requirements) | C: CO-953 |
| 3.520.62.A-K (age documents) | C: CO-1658 |
| 3.520.63.A.1-4, C.1-2 (marital status verified if questionable) | C: CO-1670, CO-1671 (CO-1582, CO-1583) |
| 3.520.63.B (separate case for each spouse) | C: person-scoped items |
| 3.520.63.D (not legally separated or divorced = married) | C: CO-930; CO-2384 and CO-2389 wherever the spouse lives; **G-2** for life insurance |
| 3.520.64.A, B (resident from declaration) | C: CO-505 in CO-942 |
| 3.520.64.B.1 (no residence while it is established elsewhere) | C: state_of_residence |
| 3.520.64.B.2 (another State's payment) | C: CO-3859 in CO-942 |
| 3.520.64.C.1-2 (county; homeless, no address) | NA: county of application; homeless clients eligible (no bar is modeled) |
| 3.520.64.D.1-9 (indicators of a move) | C: state_of_residence (indicators are evidence for the supplied fact) |
| 3.520.64.E.1 (30 days out of the country) | C: CO-4401 (CO-4406), at least 30 |
| 3.520.64.E.2 (90 days out of State, except medical) | C: CO-4401 (CO-4407) |
| 3.520.64.E.3 (more than 180 days in a calendar year) | C: CO-4401, "more than" (CO-4408) |
| 3.520.64.E.4 (180 days caring for an injured service member) | C: CO-4401, CO-4404; OQ-780 |
| 3.520.64.E rebuttal | C: CO-4405 |
| 3.520.64.F (conflicting documents) | NA: county weighing |
| 3.520.64.G (burden; refusal denies) | C: CO-1659 |
| 3.520.65.A.1-4 (SSN; OAP non-citizens need not apply) | C: CO-1430 |
| 3.520.65.B.1-3 (SVES; discrepancy; denial) | C: CO-1661 |
| 3.520.66.A-E (identity documents; 1 CCR 204-30 Rule 16) | C: CO-1660, CO-1674 |
| 3.520.67.A.1-3 (who is a citizen) | C: CO-905 |
| 3.520.67.B.1-2 (verify AND citizenship when inconsistent) | C: CO-1431, CO-1662 |
| 3.520.67.C (documents; 45 CFR 1626.6) | C: CO-1673, CO-1368 |
| 3.520.67.D (no targeting) | NA |
| 3.520.67.E (qualified non-citizens may apply; all may apply for OAP) | C: CO-929 follows the statute (OQ-119 resolved, OQ-430 resolved) |
| 3.520.67.F (USCIS documents through SAVE) | C: CO-1432, CO-1663; OQ-550 |
| 3.520.67.G.1-4 (non-citizens not eligible for AND) | C: CO-905 (qualified status required) |
| 3.520.68.A (five-year bar from 08/22/1996) | C: CO-905 |
| 3.520.69 intro, A.1-3 (sponsored client provides sponsor information) | C: CO-1672 |
| 3.520.69.B (125% presumption) | NA: describes the affidavit; deeming is 3.534.D |
| 3.520.69.B.1 (citizenship) | C: CO-4400 (not a citizen) |
| 3.520.69.B.2 (40 quarters) | C: CO-4400 (qualifying_quarters CO-004, below 40) |
| 3.520.69.B.3-4 (leaves the U.S. and gives up status; dies) | NA: no longer a resident or a client |
| 3.520.69.B.5 (sponsor dies; joint sponsor continues) | C: CO-4400 (every sponsor dead, CO-2336) |
| 3.520.69.B.6 (removal; new admission) | P3 (G-8 (2)) |
| 3.520.69.C.1 (refugees and asylees; pending not exempt) | C: CO-4400 (status_before_lpr_adjustment CO-2700) |
| 3.520.69.C.2-4 (agreements before 12/19/1997; 1997-2013 relatives; all sponsors from 2014) | C: "Sponsor" means an I-864/I-864A signer (CO-1573), which began 12/19/1997; C.3 is superseded for determinations after 2013 by C.4 |
| 3.520.69.C.5, D (repayment; failure to provide information) | C: D via CO-1672; C.5 NA (recovery) |
| 3.520.69.E (deemed per 3.534, 3.520.72) | C: CO-2386, CO-2390 |

### 3.520.71-3.520.77 (financial requirements and resources)

| paragraph | status |
|---|---|
| 3.520.71.A.1 (resources below the limit) | C: CO-948 (at most; OQ-662) |
| 3.520.71.A.2 (income below the limit) | C: CO-953, CO-1203 (less than) |
| 3.520.71.A.3 (pursue potential income and resources) | C: CO-3861, CO-4433, CO-4434 |
| 3.520.71.B (AND-SO: apply for SSI and SSDI; appeal within 30 days) | C: CO-2004 in CO-1203 (OQ-151 resolved) |
| 3.520.71.B (IAR choice paragraph) | NA: recovery |
| 3.520.71.B.1-4 (OAP: SSI, survivor, early retirement at 62, SSI at 65 below the standard plus $20) | C: CO-3860, CO-3862 (county referral and failure) |
| 3.520.71.C (11 days; AND-SO 60 days from the interview; subsequent 30 days and no approval before proof) | C: CO-3866 to CO-3870, CO-3865, CO-3869 |
| 3.520.71.D.1-5 (OAP SSI appeal duty and its excuses) | C: CO-3860 (failure without excuse is the supplied finding) |
| 3.520.71.E (match SSA's ISM until removed) | C: CO-1512 (CO-3405) |
| 3.520.71.F.1, F.1.a-c (Colorado Works; caretaker not required; child's grant not counted) | C: CO-1511; tanf_cash_income is stated on the child (CO-029); G-6 |
| 3.520.71.F.2.a-c (sanction, demonstrable evidence, disqualification, withdrawal) | C: CO-1511, CO-2008 (OQ-357 resolved) |
| 3.520.71.G, G.1-2 (other income; refused income counted) | C: CO-3861 in CO-3831; CO-3862, CO-3869 |
| 3.520.71.H, H.1-2 (other resources; refused counted; proof of pursuit) | C: CO-4433 in CO-4000; CO-4434 in CO-1436 |
| 3.520.72.A.1.a, A.2.a ($2,000 unmarried, $3,000 married client) | C: CO-948 (CO-3045, CO-3046) |
| 3.520.72.A.1.b-c, A.2.b (sponsor limits) | C: CO-947 (sponsor_spouse_is_cosponsor CO-2362, CO-2388) |
| 3.520.72.B.1 (real property not the home and not income-producing) | C: CO-4000; CO-4422 (F-7 fixed) |
| 3.520.72.B.2 (home-sale proceeds over replacement) | C: CO-4412 (F) |
| 3.520.72.B.3-4 (mobile homes, RVs, vehicles, boats not exempt) | C: vehicles_equity_value, real or personal property facts in CO-4000 |
| 3.520.72.B.5 (cash and convertible assets) | C: CO-4000 |
| 3.520.72.B.6 (mortgages, notes) | C: liquid_resources_value |
| 3.520.72.B.7 (CSV of life insurance) | C: CO-4001, CO-4002; **G-2** |
| 3.520.72.B.8 (revocable burial funds) | C: CO-3855, CO-3856, CO-3858 |
| 3.520.72.B.9 (burial space beyond needs) | C: CO-3857 |
| 3.520.72.B.10 (casualty proceeds over repair) | C: CO-4412 (E) |
| 3.520.72.B.11 (unspent loan proceeds) | C: CO-4412 (L, month received only) |
| 3.520.72.B.12 (estate of an incapacitated client) | C: CO-4000's precision |
| 3.520.72.B.13, a-c (trusts per POMS; untransferable corpus is TWFC; trustee refusal) | C: CO-4432; a via CO-3835 (TWFC); POMS not on an allowed host |
| 3.520.72.C (legally separated: spouse's sole property) | C: no spouse edge when legally separated (CO-930) |
| 3.520.72.D.1-3, 5 (verify all resources; cash by statement) | C: CO-1433 (resources other than cash) |
| 3.520.72.D.4 (client statement until the 24-month redetermination; new resources verified) | C: CO-1433 (CO-2376 to CO-2378) |
| 3.520.72.E (sponsor resources attributed the same way; excess deemed) | C: CO-2390, CO-947 (F-15 fixed) |
| 3.520.72.F.1-2 (SSI recipient: no resource verification unless questionable) | C: CO-1433 |
| 3.520.73.A.1.a-b (account balance) | NA: valuation of the supplied value |
| 3.520.73.A.2, a-c (joint accounts) | C: the holdings facts' "person's share" (CO-4000's precision) |
| 3.520.73.B.1.a-b (retirement accounts less taxes, or 20%) | C: CO-4000 (CO-4429, CO-4430) |
| 3.520.73.B.2-4 (securities, bonds, mineral rights) | NA: valuation of the supplied value |
| 3.520.73.C (contacting institutions) | NA |
| 3.520.741.A (home exempt; statement verifies) | C: CO-4000 (home equity not counted) |
| 3.520.741.B.1-3, C.1-2 (actual value, encumbrances, shares) | C: equity and share in the holdings facts |
| 3.520.741.D.1-4 (two-thirds; co-owner hardship; efforts to sell; legal technicalities) | C: CO-4431 in CO-4000 (F-8 fixed) |
| 3.520.742.A-B (personal property values; $400 vehicle presumption) | NA: valuation of the supplied value |
| 3.520.742.C.1-3, D (unsaleable personal property; lesser value) | C: CO-4431 |
| 3.520.75.A-C (evaluate CSV and original face value) | C: CO-3396, life_insurance_face_value; original face CO-4001's precision |
| 3.520.75.D ($1,500 face total of client and spouse; sponsors too) | C: CO-4001, CO-4002, CO-2390; **G-2** (spouse living apart) |
| 3.520.75.E.1-4 (OAP, CSV $250,000 or less, 48 months) | C: CO-3854 (CO-3852, CO-3853); **G-2** |
| 3.520.75.F.1-4 (OAP, over $250,000) | C: CO-3854; **G-2** |
| 3.520.75.G (original face value) | C: CO-4001's precision |
| 3.520.75.H (CSV estimate chart) | **G-7** (P2) |
| 3.520.76.A.1-4, a-b (TWFC; 36 months; rebuttable presumption) | C: CO-4008 (CO-3838, CO-3837), CO-3836 |
| 3.520.76.B.1-3, C.1-3 (hardship, involuntary transfer) | C: CO-3836 (county finding) |
| 3.520.76.D.1-4 (uncompensated value / current grant standard, rounded down) | C: CO-3840 (floor), CO-4007 |
| 3.520.76.D.5 (begins the month after; sequential periods) | C: CO-3841 |
| 3.520.76.D.6, a-b (returned resource) | C: CO-3840 (CO-4009); a partial return is restated in CO-3835 |
| 3.520.76.E (1 to 36 months) | C: CO-3839 |
| 3.520.77 intro, A (highest-valued vehicle used for transportation) | C: CO-4000 |
| 3.520.77.B (household goods) | NA: not a holdings fact |
| 3.520.77.C, C.1 (home; income property on the home lot) | C: CO-4000, CO-4422 |
| 3.520.77.C.2-3, a-b, C.5 (care outside the county or in a facility, with intent to return) | C: CO-4000 (CO-4435) |
| 3.520.77.C.4 (OAP-C home) | **G-8 (1)** (P3) |
| 3.520.77.D.1.a-c (self-employment property; cash for the business; 12 or 24 months) | C: CO-4416 (b); a and c are the county's statement of property in use (CO-4422's precision) |
| 3.520.77.D.2 (tools for a job) | NA: not a holdings fact |
| 3.520.77.D.3.a-c (home-use production property, $6,000) | C: CO-4422 (CO-4425, CO-4426) |
| 3.520.77.D.4.a-c (non-business income property, $6,000 at 6%) | C: CO-4422 (CO-4423, CO-4424, CO-4427, CO-4428) |
| 3.520.77.D.5 (permits) | NA: not a holdings fact |
| 3.520.77.E.1-3 (casualty proceeds 3 or 6 months; extension) | C: CO-4412 (CO-4417 to CO-4421) |
| 3.520.77.F.1-3 (home-sale proceeds 6 months) | C: CO-4412 |
| 3.520.77.G.1-3 (burial trusts; trustor-beneficiary; revocable $1,500) | C: CO-3855 (meaning covers G.2.d), CO-3858 |
| 3.520.77.H.1-2, a-b (prepaid contracts; paid-up amount) | C: CO-3856 |
| 3.520.77.I.1-12 (burial spaces) | C: CO-3857 |
| 3.520.77.J (retroactive SSA, 9 months) | C: CO-4414 |
| 3.520.77.K (refunds; PTC 12 months) | C: CO-4172, CO-4413 |
| 3.520.77.L (loan, month received) | C: CO-4412 |
| 3.520.77.M (ABLE) | C: CO-4415 |

### 3.520.78-3.520.79 (income and ISM)

| paragraph | status |
|---|---|
| 3.520.781.A (income equal to or above the standard: ineligible) | C: CO-953, CO-1203 (less than) |
| 3.520.781.B.1-4, C-F (types; exempt; disregards; deeming; grant) | C: CO-946, CO-2384, CO-2386, CO-951, CO-952 |
| 3.520.781.G, G.1-2, a-d, f (month received; anticipated; contracts; 3-month self-employment; 12-month averaging; COLA) | C: the monthly income facts state the anticipated or averaged monthly amount (CO-1708's precision) |
| 3.520.781.G.2.e.1-3 (rental: 20 hours; averaged; joint share) | C: self-employment (CO-1708) or other unearned income with CO-4444 |
| 3.520.782.A (earned income gross wages) | C: wages_gross in CO-3830 |
| 3.520.782.B, B.1-2 (in-kind earned income) | C: CO-4437 (F-10 fixed) |
| 3.520.783.A-B.1-4, D (net profit; costs allowed and not) | C: CO-1707, CO-1708 |
| 3.520.783.C.1 (farm yearly) | P2: deferred (first-pass P2-2, still in colorado-notes) |
| 3.520.783.C.2.a-d (rental, board, room) | C: CO-1708 (receipts less documentable costs) |
| 3.520.783.C.3.a-d (day care $55/$22) | P2: deferred (first-pass P2-2) |
| 3.520.783.E-F (verification; irregular averaged) | C: CO-1665; averaging is in the supplied amount |
| 3.520.784.A.1-4, B.1-2 (donated work over 5 hours; greater of going rate or minimum wage) | C: CO-4443 (CO-4442); OQ-781 |
| 3.520.784.C (volunteering under 30 hours not income) | C: CO-4443 counts only the A tests |
| 3.520.785.A, B (unearned income of client, spouse, sponsor) | C: CO-3831; spouse and sponsor CO-2384, CO-2386 (see G-1) |
| 3.520.785.B.1, a-b (SSA benefits; lump sums; gross before recovery) | C: social_security_income (gross); lump_sum_received is part of the unearned facts (CO-3367) |
| 3.520.785.B.2-7 (pensions, disability, VA, RRB, UI, strike) | C: pension_income, unemployment_income, other unearned income |
| 3.520.785.B.8 (garnished amounts) | C: gross amounts |
| 3.520.785.B.9, 14-16, 20 (expenses offset) | C: CO-4444 in CO-3831 (F-11 fixed) |
| 3.520.785.B.10 (dividends and interest) | OQ-782 |
| 3.520.785.B.11-13, 17-19, 21-25 (annuities, inheritance, gifts and prizes, joint property, lease bonuses, royalties, Civil Liberties Act income, trust payments, alimony, MMMNA, current child support) | C: other unearned income, CO-1181, child_support_received; MMMNA in other_unearned_income_nontaxable (first-pass P2-6) |
| 3.520.786 intro (exempt for client, spouse or sponsor) | C for the client (CO-2343, CO-2342); **G-1** for the spouse and sponsor |
| 3.520.786.A-J, L-M, O-P | C: CO-2343 (named receipt facts); H CO-2342; O CO-3827, CO-4012 (less than $60, CO-3826) |
| 3.520.786.K (POMS SI 00830.099; 416.1124) | C: CO-2343 (see the federal table) |
| 3.520.786.N (child support for another person) | C: child_support_received is stated on the child (CO-028) |
| 3.520.79.A (ISM for OAP and AND-CS only) | C: CO-3831 adds ISM only for OAP age or AND-CS |
| 3.520.79.B.1-5, a-b (no ISM: owner, subsidized, homeless, fair share at market value, costs at or above the maximum) | C: CO-1512 (CO-4410) |
| 3.520.79.B.6, a-b (SSA's ISM matched) | C: CO-1512 (CO-3405) |
| 3.520.79.C.1-3 (below market; fair share; all supplied) | C: CO-1512 |
| 3.520.79.D (life estate) | C: CO-1512's precision |
| 3.520.79.E.1-2 (maximum: 33.33% of the SSI standard plus $20, rounded) | C: CO-1513 = 351 (994 x 0.3333 + 20 = 351.30) |

### 3.530-3.534 (OAP)

| paragraph | status |
|---|---|
| 3.530 intro, A ($1,032) | C: CO-289 |
| 3.530.B ($351), C ($189 floor) | C: CO-1513, CO-1200 |
| 3.530.1 (OAP, OAP-C) | C: CO-940; OAP-C one category (OQ-111) |
| 3.531.A-C (entry; spending; appropriations) | NA |
| 3.531.D.1 (MOE lump sums; 416.2095-2099) | NA: not an entitlement |
| 3.531.D.2 (State Supplementary Payment) | C: floors in CO-951 |
| 3.532.A (one client per case) | C: person-scoped |
| 3.532.B (standard less income, floor) | C: CO-951 |
| 3.532.B.1-2 (first month prorated) | C: CO-2603 (CO-2602, CO-2391; OQ-491 resolved) |
| 3.532.B.3 (birth-month transition to OAP) | C: CO-940 (OQ-120 resolved) |
| 3.532.C (payee; OAP-C reserve) | NA |
| 3.532.D.1-3 (PNA after 30 days; psychiatric facility at 65) | C: CO-1510, CO-2006 (CO-3052) |
| 3.532.E.1-2 (penal inmates; unlicensed facility) | C: CO-3343 in CO-942; CO-2007 in CO-951 |
| 3.532.F ($79 every full calendar month) | C: CO-1509, CO-1510 (whole month); income deducted OQ-352 (1) |
| 3.533 intro, A.1.a-c ($65 and half) | C: CO-946 (CO-3047, CO-3048) |
| 3.533.A.2.a-e, c.1-2 (SSI out; $20 split; SSI only gets none; SSI back) | C: CO-3829, CO-3832 (CO-3828; OQ-661) |
| 3.533.A.2.f (unused $20 to earned) | C: CO-3833 (OQ-351 resolved) |
| 3.533.B (grant; floor) | C: CO-951 |
| 3.534.A.1-5 (spouse's earned income) | C: CO-2384 (wherever the spouse lives); **G-1** (exempt earned income, such as work study) |
| 3.534.B.1-2, 6-7 (spouse's unearned income less the OAP standard) | C: CO-2384; **G-1** |
| 3.534.B.3 (children: half the SSI standard less own income) | C: CO-2392 (CO-3050, CO-3054) |
| 3.534.B.4 (medical payments) | C: CO-2385 |
| 3.534.B.5 (court-ordered support unless garnished) | C: child_support_paid_legally_obligated |
| 3.534.C (spouse on AF, SSI or Medicaid with income at or below the OAP limit; MMMNA) | C: CO-2384 (at most CO-289); MMMNA in the client's income |
| 3.534.D.1 (sponsor's total gross income) | C: CO-2386; **G-1** (exemptions) |
| 3.534.D.2.A (SSI standard for the sponsor) | C: CO-2386 (CO-235) |
| 3.534.D.2.B (spouse in the same household: half; co-sponsor: full) | C for the co-sponsor; **G-5** for the same-household condition |
| 3.534.D.2.C (dependents per archived 3.520.68.B.2.b.1) | C: CO-2386 (CO-2387; D-300; OQ-553 resolved) |
| 3.534.D.3-5 (deemed as unearned; compared; not divided) | C: CO-2386, CO-946 |

### 3.540-3.545 (AND-SO)

| paragraph | status |
|---|---|
| 3.540 intro (18-59, blind 0-59; not approved for SSI or SSDI) | C: CO-1203 |
| 3.540.A ($248), B (appropriations) | C: CO-290; B NA |
| 3.540.1 definitions (blindness, SGA, total disability, commute, RFC, improvement) | C: is_blind; CO-1728 (county finding) |
| 3.541.A.1-3 (certified total disability; Listing; 6 months) | C: CO-944 (CO-1728), CO-2824 |
| 3.541.B.1-2, C (county review; Medicaid determination weighed) | NA: county finding |
| 3.541.1.A.1, a-e (form; 10 days; 30 days after the interview) | C: CO-2592, CO-1669 (OQ-375 resolved) |
| 3.541.1.A.2-4 (provider; dated within 90 days; re-examination within 12 months) | C: CO-2824's meaning (first-pass P2-7 fixed), CO-1599 |
| 3.541.1.B.1-4 (exam payment) | NA |
| 3.541.1.C.1-2 (re-examination; terminate if not submitted) | C: CO-1669 |
| 3.541.2.A.1-3, a-g (error; improvement; RFC) | C: CO-1728 (county finding of total disability) |
| 3.541.2.B (working above the standard) | C: CO-1203 income test |
| 3.541.3.A (12 cumulative months) | C: CO-3849 (CO-3843, CO-3847) |
| 3.541.3.B-D (treatment agreement; termination) | C: CO-3849 |
| 3.541.3.E-F (random tests; two positives in three months) | C: CO-3849 (CO-3848, less than 2) |
| 3.541.3.G (initial partial month not counted) | C: CO-3843's meaning (months stated) |
| 3.542.A-B (eligibility from the later of application or meeting requirements) | C: CO-2391 |
| 3.543.A-B.1-2 (one client; grant; proration) | C: CO-952, CO-2603 |
| 3.543.C (payee) | NA |
| 3.543.D.1-2 (PNA after 30 days) | C: CO-1510 in CO-952 |
| 3.543.E.1-2 (inmates; unlicensed facility) | C: CO-942, CO-2007 |
| 3.543.F ($79 every full month) | C: CO-952 |
| 3.544 intro, A.1-3, B.1-3, C (disregards; $20 split; grant; no floor) | C: CO-946, CO-3829, CO-952 (no AND-SO floor) |
| 3.544.D.1-5 (spouse's earned income) | C: CO-2384; **G-1** |
| 3.544.E.1-3 (spouse's unearned income less the unused $20) | C: CO-2384; **G-1** |
| 3.544.F (no deeming at or below the SSI limit; MMMNA) | C: CO-2384 (CO-235) |
| 3.544.G.1-5 (sponsor deeming) | C: CO-2386; **G-1**, **G-5** |
| 3.544.H (total) | C: CO-946 |
| 3.545.A, A.1 (interim assistance recoverable) | NA: recovery |
| 3.545.A.2 (IM-14 a condition of AND-SO) | C: CO-4449 in CO-1203 |
| 3.545.A.2.a-b, B, C, E.1-2, F, H-J (IAR procedure) | NA |
| 3.545.D (retroactive SSI counted in the month received) | C: ssi_income in CO-946 for that month |
| 3.545.E.3 (amount recovered in the same month not counted) | NA: recovery is not modeled; the amount is not stated as income |
| 3.545.G (SSI suspended: may apply) | C: CO-1203 reads current SSI receipt |

### 3.546-3.549 (AND-CS)

| paragraph | status |
|---|---|
| 3.546 intro (0-59, SSI for disability or blindness, less than the full standard) | C: CO-950 (OQ-116 resolved); statute OQ-783 |
| 3.546.A ($994), B (appropriations) | C: CO-291; B NA |
| 3.546.C.1-2 (MOE; State Supplementary Payment) | NA; C (floor in CO-952) |
| 3.546.D ($351), E ($13 floor) | C: CO-1513, CO-1201 |
| 3.547.A (SSI for disability or blindness, verified) | C: CO-950 |
| 3.547.B-C | NA |
| 3.547.D (SSI terminated: AND-CS ends) | C: CO-950 reads receives_ssi |
| 3.548.A-B.1-2 (one client; grant; proration) | C: CO-952, CO-2603 |
| 3.548.C (payee) | NA |
| 3.548.D.1-2, E.1-2 (PNA; inmates; unlicensed) | C: CO-1510, CO-942, CO-2007 |
| 3.548.F ($79; not reduced until the month after the first full month) | C: CO-952 (entry on or before the first of the previous month; F-4 fixed, CO-168) |
| 3.548.G (gross SSI when SSA recovers) | C: ssi_income is gross |
| 3.549.A.1-2, a-f, B (disregards; floor) | C: CO-946, CO-3829, CO-3832, CO-3833, CO-952 |
| 3.549.C.1-4 (spouse's earned income) | C: CO-2384; **G-1** |
| 3.549.D.1-3 (spouse's unearned income less the remaining disregard) | C: CO-2384; **G-1** |
| 3.549.E (unemancipated child under 18: parents deemed as a spouse) | C: CO-2384 (CO-3053, is_emancipated_minor) |
| 3.549.F (no deeming at or below the SSI limit; MMMNA) | C: CO-2384 |
| 3.549.G.1-5 (sponsor deeming) | C: CO-2386; **G-1**, **G-5** |
| 3.549.H (total; floor) | C: CO-946, CO-952 |

### 3.550-3.560 (redetermination, changes, notice, transfers)

| paragraph | status |
|---|---|
| 3.550.A.1-3, a-b (12 or 24 months; $200 under the limit; AND-SO 6 or 12) | C: certification length is supplied (CO-2377); no eligibility effect otherwise |
| 3.550.B-C.1-4 (filing dates; 24-month interview; missed interview) | NA: redetermination procedure |
| 3.550.D.1, a-c (SSI-only clients: SDX/SVES) | C: CO-1433 (SSI recipients) |
| 3.550.D.2.a-i (worker steps; 24-month traditional verification) | C: CO-1433 (CO-2377, CO-2378); the rest NA |
| 3.550.E-I | NA |
| 3.551.A-B (late redeterminations) | NA |
| 3.552.A-F (reporting changes; 10th of the month; failure to verify) | C: F via the verification status (CO-1438); the rest NA |
| 3.553.A-D (effective dates of changes; claims) | NA: change processing over time |
| 3.553.E (no claim below the floor) | NA: claims |
| 3.554.A-D (timely and adequate notice) | NA: notice |
| 3.560.A-C (case transfers) | NA: county administration |

### 3.570 (Home Care Allowance, burial, disaster)

| paragraph | status |
|---|---|
| 3.570.11.A (5 or older) | C: CO-1217 (CO-1209) |
| 3.570.11.A.1, 3 (non-entitlement; lowest functioning) | NA |
| 3.570.11.A.2.a-c (HCBS first; functionally eligible bars; 3-month transition; not with HCBS) | C: CO-1217 (CO-1206, CO-2009, ltc_services_received) |
| 3.570.11.B ($977 floor all tiers) | C: CO-1202 in CO-1219 |
| 3.570.11.C-D (not taxable; appropriations) | NA |
| 3.570.11.E.1-2 (MOE; SSP) | NA; C (floor) |
| 3.570.12 "Home" (non-facility; no shelter or temporary setting) | C for shelters and temporary settings (CO-2010); **G-3** for facilities |
| 3.570.12 "Medical leave", "Non-medical leave" | P2: 42 days deferred (first-pass P2-4) |
| 3.570.12 other definitions | NA |
| 3.570.13.A, E.1-3 (both financial and functional) | C: CO-1217 |
| 3.570.13.B.1-3 (SSI; AND-SO criteria; OAP and HCA since 12/31/2013) | C: CO-1215 (CO-1208, CO-2600) |
| 3.570.13.C.1-3 (capacity 21 or higher; need 1-23, 24-37, 38-51) | C: CO-1216 (CO-1210 to CO-1214) |
| 3.570.13.D.1-3 (less than the maximum authorized) | C: hca_authorized_amount CO-1218; tier amounts OQ-250 |
| 3.570.13.F (payment from the month after approval; no retroactive payment) | P2: deferred (first-pass P2-4) |
| 3.570.13.G (referrals) | NA |
| 3.570.14.A-F (scoring scales; children 5-18; under 5 not scored) | C: CO-1204, CO-1205 (CMA scores), CO-1217 age |
| 3.570.15 (ADL definitions) | NA: CMA scoring |
| 3.570.16 (care planning, case management) | NA: CMA administration |
| 3.570.17.A-B (CMA and county roles; notices) | NA |
| 3.570.17.C.1-2 (financial, functional; level of care) | C: CO-1217 |
| 3.570.17.C.3.a-f (services not received; refused appointments or forms) | NA: CMA case actions with no fact; the client's receipt of services is not stated |
| 3.570.17.C.4.a (resident of a nursing facility, hospital or other LTC facility) | **G-3** (C for medical institutions through CO-1742) |
| 3.570.17.C.4.b (a stay of 30 days or more) | C: CO-1217 (CO-4409) |
| 3.570.17.C.5-6 (safety; cost effectiveness) | NA: CMA judgment, no fact |
| 3.570.17.C.7 (residing anywhere other than home) | **G-3** |
| 3.570.17.C.7.a-b (leave; 42 days) | P2: deferred (first-pass P2-4) |
| 3.570.17.C.8.a-b (move; temporary absence to day 31) | C: CO-1217 (CO-942, CO-3806, CO-4409) |
| 3.570.17.C.9 (withdrawal) | NA |
| 3.570.17.C.10 (death) | **G-4** |
| 3.570.17.D-E, 3.570.18 (transfers; CMA and county duties) | NA |
| 3.570.41-42 (purpose; definitions; legally responsible persons) | C: CO-3312 (spouse; parent of an unemancipated minor under 18, CO-3313) |
| 3.570.43.A.1 (receiving OAP, AND, HCA or Medicaid at death) | C: CO-1220 |
| 3.570.43.A.2-3 (estate and responsible persons insufficient) | C: CO-1230 |
| 3.570.43.A.4.a-b ($2,500 limit; plot excluded) | C: CO-1231 (CO-1222, CO-1227); OQ-355 |
| 3.570.43.B.1-2 ($1,500) | C: CO-1232 (CO-1228) |
| 3.570.43.C (30 days; extension up to one year) | C: CO-4436 (first-pass P2-8 fixed) |
| 3.570.43.C.1-3 (choice of disposition; family) | NA |
| 3.570.43.D.1 (insurance to a responsible person or contributor) | C: CO-1223 in CO-1230 |
| 3.570.43.D.2 (estate at death) | C: CO-1224 |
| 3.570.43.D.3.a-c, 1-2 (SS death benefit exempt; SSI limits; widow(er) individual; excess) | C: CO-1225, CO-1229, CO-1226 (couple only with two responsible persons) |
| 3.570.43.D.4, E, F.2, G-J (authorization; estimates; payments; recovery) | NA |
| 3.570.43.F.1 (charges over $2,500: no payment) | C: CO-1231 (OQ-355) |
| 3.570.51.A ($2,000 per client per disaster) | C: CO-3878 (CO-3876, CO-3875) |
| 3.570.51.B-C (declaration period) | C: CO-3871 |
| 3.570.51.D (petition after rescission) | C: CO-3874 (the county's approval); the declared-disaster fact is the county's statement |
| 3.570.52.A-C (approved or receiving; emergent need; request) | C: CO-3877 (CO-3873) |
| 3.570.52.D, 3.570.53.A-G (other payments; county duties) | NA |

### 3.580-3.587 (payments, overpayments, IPV, fraud, recovery, appeals)

| paragraph | status |
|---|---|
| 3.581.A-B | NA |
| 3.581.C.1-2 (eligibility ends at death; none for the next month) | **G-4** |
| 3.581.C.3, a-b (payment to the personal representative) | NA |
| 3.581.D.1-4 (partial-month table) | C: CO-2602, CO-2603 |
| 3.581.E (cents dropped except when SSI reduces the grant) | C: CO-951, CO-952 (CO-2604) |
| 3.581.F-H (holds; expungement; underpayments; replacements) | NA |
| 3.581.I.1-2 (warning; card disabled) | NA: no eligibility effect |
| 3.581.I.3-4 (one month of ineligibility; repeated) | C: CO-4448 |
| 3.582.A-G (overpayments) | NA: claims (out of scope) |
| 3.583.A-M, O (IPV procedure) | NA |
| 3.583.D (questionable information not supplied) | C: verification status (CO-1438) |
| 3.583.N.1-2, a-c (12 months, 24 months, permanent) | C: CO-4447 (supplied disqualification) |
| 3.583.N.3 (only the individual; a spouse's or sponsor's income still counts) | C: CO-2384 and CO-2386 do not read the IPV fact |
| 3.583.N.4 (valid in all counties) | C: CO-4447 |
| 3.584-3.587 (fraud, recovery, dispute resolution, appeals, hearings) | NA |

### C.R.S. 26-2-111

| paragraph | status |
|---|---|
| (1)(a) (resident) | C: CO-942 |
| (1)(b) (insufficient income and resources) | C: CO-948, CO-953 |
| (1)(c)(I)(A)-(B), (II) (36-month transfers; home transfer for estate planning) | C: CO-4008, CO-3836 |
| (1)(d) (public institution inmate; IMD, TB, psychosis; OAP (2)(a)(III) excepted) | C: CO-3343, CO-4446 (CO-4445) in CO-953 and CO-1203 |
| (2)(a)(I) (citizen or qualified alien, 60, SSI resources) | C: CO-929, CO-940, CO-948 |
| (2)(a)(III) (OAP inmate of a non-penal institution) | C: only correctional institutions bar (CO-3343); OAP-C (OQ-111) |
| (2)(b) (spouse and sponsor considered) | C: CO-2384, CO-2386, CO-2389, CO-2390 |
| (2)(c)(I)-(III) | C: CO-929 (OQ-430 resolved; OQ-591) |
| (2)(d)(I) (member of a household receiving Colorado Works) | C: CO-1511; **G-6** (P2) |
| (3) | NA: Colorado Works |
| (4)(a) (total disability, six months, or SSDI) | C: CO-944; OQ-138 |
| (4)(b) (18 or older) | OQ-783 |
| (4)(b.5)(I)-(II) (apply for SSI; waiver) | C: CO-2004, CO-3867 (60 days of conditional approval) |
| (4)(c)(I) (not in an AFDC/Colorado Works assistance unit) | C: CO-1511 |
| (4)(c)(II) (1991 supplement) | NA: closed group |
| (4)(d) (SSI resource requirements) | C: CO-948 |
| (4)(e)(I)-(II), (f) (substance use: treatment, tests, 12 months) | C: CO-3849 |
| (5) (Aid to the Blind) | C: no rule program; blind clients 0-59 are AND-SO (OQ-112, OQ-139 resolved) |
| (6) (26-2-111.8 applies) | C: CO-905, CO-4400 |

### Incorporated federal texts

| text | status |
|---|---|
| 20 CFR 416.405-415 (SSI benefit standard) | C: CO-235 in CO-1513, CO-2384, CO-2386, CO-2392 |
| 20 CFR 416.1124(b), (c)(1)-(24) | C: CO-2343 and its precision, item by item; (c)(7) NA (Alaska); (c)(9), (15), (20), (22) OQ-782 |
| 20 CFR 416.1856 (child) | C: CO-4022 (CO-4019, CO-4020) |
| 20 CFR 416.1205 (burial: $2,000 and $3,000) | C: CO-1229 |
| 20 CFR 416.2095-2099 (pass-along) | NA: MOE lump sums are not an entitlement |
| 20 CFR 404 Subpart P App. 1 (Listing) | C: CO-1728 (county finding) |
| POMS SI 00830.099 | C: CO-2343 |
| POMS SI 01120.200 and CHI 01120.201 (trusts) | C: CO-4432 (served only by ssa.gov, not an allowed host) |
| 45 CFR 1626.6; 1 CCR 204-30 Rule 16 | C: CO-1673, CO-1674 |
| 42 U.S.C. 413 (40 quarters) | C: CO-4400 |
| 26 U.S.C. 529A (ABLE) | C: CO-4415 |
| Pub. L. 100-383 (Civil Liberties Act) | C: the payments are federally excluded (CO-3366); income from them is other unearned income |

**Matrix size:** 414 rows over 9 CCR 2503-5 3.500-3.587, C.R.S. 26-2-111 and the incorporated texts. Each row maps one paragraph or a run of subparagraphs that share one status. Counted by primary status:
- C: 313 rows. 23 of them also carry a finding part (G-1, G-2, G-3, G-5 or G-6).
- NA: 87 rows.
- OQ: 2 rows (3.520.785.B.10, OQ-782; 26-2-111(4)(b), OQ-783). Another 12 C rows cite an open question for one part.
- Finding as the primary status: 6 rows (G-3 twice, G-4 twice, G-7, G-8 (1)).
- First-pass P2s still deferred: 5 rows (3.520.783.C.1 and C.3; the leave definitions in 3.570.12; 3.570.13.F; 3.570.17.C.7.a-b).
- P3: 1 row (3.520.69.B.6).

P2 count: 2 new (G-6, G-7), plus 3 first-pass P2s still deferred and recorded (P2-2's farm averaging and day-care allowance, and P2-4's 42-day leave and month-after-approval start). P3: 1 (G-8, three parts).

## 4. Open-question confirmations

| OQ | class | confirmed? |
|---|---|---|
| OQ-138 (SSDI route into AND-SO) | needs Legal | **Yes.** 26-2-111(4)(a) admits SSDI; 3.540's intro and 3.541 do not. CO-1203 excludes an SSDI recipient. Both texts were checked. |
| OQ-250 (HCA tier amounts) | blocked on a named document | **Yes for the tier amounts.** 3.570.11.B and 3.570.13.C-D state no tier maximum. **Its statement that the "home" test is modeled is no longer true after R-8: see G-3.** |
| OQ-352 (1) (income deducted from the $79 PNA) | state policy choice | **Yes.** 3.532.F, 3.543.F and 3.548.F say nothing of income. |
| OQ-355 (burial plot in F.1's $2,500) | state policy choice | **Yes.** A.4 excludes the plot; F.1 says "combined charges". |
| OQ-550 (SAVE status list) | blocked on a named document | **Yes.** The SAVE response codes are served on uscis.gov, which is not an allowed host. |
| OQ-591 (OAP immigration status verification) | needs Legal | **Yes.** 26-2-111(2)(c) conflicts with 3.520.5.D ("For AND only") and 3.520.67.F. |
| OQ-661 (married $20 split) | state policy choice | **Yes.** 3.533.A.2.c.1, 3.544.B.2 and E.2, and 3.549.D.2 state different splits. |
| OQ-662 (below or at most the limit) | state policy choice | **Yes.** 3.520.71.A.1 and 3.510 say "below"; 26-2-111(2)(a)(I) and (4)(d) say SSI resource requirements, which are "at most". |
| OQ-780 (E.2 and E.4) | state policy choice | **Yes.** No paragraph of 3.520.64 relates them. |
| OQ-781 (which minimum wage) | state policy choice | **Yes as a choice.** The side claim that no allowed host serves Colorado's figure needs a check of 7 CCR 1103-1 on sos.state.co.us (G-8 (3), P3). |
| OQ-782 (interest and dividends) | state policy choice | **Yes.** 3.520.785.B.10 conflicts with 3.520.786.K (416.1124(c)(22)). |
| OQ-783 (AND under 18) | needs Legal | **Yes.** 26-2-111(4)(b) conflicts with 3.520.61.A, 3.540, 3.546 and 3.549.E. |
| OQ-822 (AF grants in the Medicaid ABD income) | state policy choice | Out of this family (Medicaid's rule); not re-checked. |

Resolved questions this pass relied on, which were re-read against the text: OQ-111, OQ-112, OQ-116, OQ-119, OQ-120, OQ-139, OQ-151, OQ-351, OQ-357, OQ-375, OQ-430, OQ-491 and OQ-553. None is contradicted. One choice the volume makes has no open question: G-6 (26-2-111(2)(d)(I)).

## 5. First-pass P1s (docs/reviews/coverage-adult-financial.md): confirmation

| finding | status | evidence |
|---|---|---|
| F-1 (absence presumptions) | stays fixed | CO-165: none, $0. The CO-4401 derivation was re-read: E.1 and E.2 "at least", E.3 "more than", E.4 "at least". |
| F-2 (end of the sponsor's obligation) | stays fixed | CO-169: 0 deemed, oap $452. |
| F-3 (spouse living apart, income) | stays fixed | CO-167: 1,968 deemed, none. **Its resource seam is open: G-2.** |
| F-4 (AND-CS PNA lag) | stays fixed | CO-168: October $494, November $0. |
| F-5 (homeless) | stays fixed | CO-166: ISM 351, oap $189. |
| F-6 (exempt liquid resources) | stays fixed | PR-PTC: 1,700, oap. |
| F-7, F-8, F-9 (self-support property, retirement taxes, unsaleable property, trusts, potential resources) | stays fixed | The CO-4000 derivation was re-read; CO-130 p1 gives 2,200, oap $542. |
| F-10 (in-kind earned income, donated work) | stays fixed | CO-3830 reads CO-4437 and CO-4443. |
| F-11 (expenses offset against unearned income) | stays fixed | CO-3831 subtracts CO-4444. PR-RENT without the expense stated still gives 1,380, none, as the disposition explains. |
| F-12 (lottery) | stays fixed | CO-3831 reads CO-1181. |
| F-13 (26-2-111(1)(d)) | stays fixed | PR-IMD: none. CO-4446 is in CO-953's AND-CS branch and in CO-1203, not in OAP. |
| F-14 (IPV, EBT misuse, IM-14) | stays fixed | CO-4447 and CO-4448 are in every CO-953 branch, in CO-1203 and in CO-1217; CO-4449 is in CO-1203. |
| F-15 (sponsor resources counted the client's way) | stays fixed | CO-2390 reads CO-4000 and the client-program life insurance items. **G-2 applies to it too.** |
| F-16 (sponsor's dependents) | stays fixed | CO-94: 1,212 deemed to each sponsored child. |
| FC-4 and FC-5 (earlier cash review) | stays fixed | CO-120: $542 each. |
