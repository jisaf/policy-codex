# Coverage review, fourth pass: SNAP (family `coverage4-snap`), 7c56f14

Reviewer pass: fourth exhaustive coverage matrix for SNAP, financial and non-financial together, 2026-11-23, on 7c56f14 (branch ccr-9d19bf4c-wmnwcl, "Merge coverage pass 4 fixes for CCCAP, LEAP and SUN Bucks"), read in a detached scratch worktree with node_modules linked. Review only: nothing in the volume was changed.

**Out of scope.** SNAP's resource test (snap_holding_treatment_table CO-5301 and its readers CO-4176, CO-074, CO-343, CO-3702, CO-4158 to CO-4160), which is moving onto holdings records and will be reviewed after. 4.408 to 4.410 and the resource halves of 4.411 and 4.502-4.507 are therefore marked NA (holdings) below; pass 3's resource P1 (C3-5) is not re-judged here.

**What changed since pass 3, and so got the closest reading.** Unearned income from receipt records (receipts CO-5000; snap_receipt_treatment_table CO-5010; CO-5011 to CO-5015); earned income from earnings records (earnings CO-5100; snap_earnings_treatment_table CO-5101; CO-4324, CO-5110 to CO-5119, CO-1701, CO-1702, CO-4165, CO-4329, CO-4349, CO-3722, CO-4930, CO-2338); each pay converted by its own frequency; the `job` field and `frequency` required on a dated record (`required_if_dated`); decision 4 (missing information is cannot determine unless the rule says otherwise); the time contract `month-v1`; duplicate paths D-S3 (CO-6000 to CO-6002, CO-4182, CO-2308) and D-S6 (CO-6003, CO-1386); OQ-1100 and OQ-1101.

**Texts read.**
- D-82, 10 CCR 2506-1, rule version 12718 effective 2026-10-01, read line by line: 4.205.1-4.205.11 (expedited), 4.206, 4.207.1-4.207.3 (lines 2001-2661); 4.304-4.311 (lines 3143-5600); 4.400-4.407.61 and 4.411 (lines 5687-8046, 8600-8740); 4.506 and 4.507.A (lines 9823-9925). 4.000.1 definitions, 4.301-4.303, 4.305 and 4.500-4.505 were read paragraph by paragraph against the items that cite them.
- Federal cross-checks: D-7 (273.1), D-13 (273.9), D-14 (273.10), D-15 (273.11), D-11 (273.7), D-16 (273.24), D-95 (273.2).
- FNS FY 2027 figures as restated in 4.401.1-4.401.2, 4.407.1, 4.407.3, 4.407.31 and 4.207.3.D, against the parameters (CO-110 to CO-140, CO-1235 to CO-1238, CO-3726): every FY 2027 figure matches the rule text.

**Method.**
- The matrix (section 3) was built from the rule text, not from earlier passes. For every SNAP derived item reachable from snap_eligibility_status, snap_allotment and snap_verification_status (228 SNAP derived items; `npx vite-node scripts/handoff.ts co` regenerated the handoff for the derivations), I read the derivation against the paragraph it cites. Every reader default (`otherwise`) in a SNAP derivation was listed (scratch4/otherwise.ts) and classed (S4-13).
- Every row of CO-5010 (58 receipt kinds) and CO-5101 (22 earnings kinds) was read against 4.403-4.405 and 273.9(b)-(c).
- Probes: a small runner (scratch4/probe.ts in the scratch copy) applies a patch to a stored case and evaluates identifiers per person and month with the engine. Bases: CO-115 (a homeless father earning $1,000 and his six-year-old; applied 2026-11-02; expanded categorical; full-month allotment $387 in February 2027) and CO-83 (mother, stepfather earning $1,500 and paying $1,200 rent with heat, and a child of 8; applied 2026-10-12; October prorated allotment $479). The probe files are scratch4/p0.yaml to p19.yaml. Every P1 below states its household and the answer by hand.
- `npx vite-node scripts/check.ts` at 7c56f14: OK; co rule tests 4,828/4,828; household expectations 3,888/3,889 (the one failure is CO-387's CHP+ copayment band, known); conformance self-check 8,877/8,877.

FY 2027 figures used by hand: maximum allotment 1: $306, 2: $562, 3: $808; standard deduction $217 (1-3); shelter cap $769; HCUA $616; 130% gross 1: $1,729, 2: $2,345, 3: $2,960; 200% 2: $3,608, 3: $4,554; net 100% 2: $1,804. Allotment = maximum less 30% of net income rounded up (the same as 4.207.3.A's round-down of the result).

## 1. Verdict

**13 P1 found. SNAP does not meet the stopping rule.**

None is a regression of a pass-3 P1 (section 5: every earlier P1 still holds and every stored probe passes). S4-5 is a regression of a pass-2 fix (C2-5, the Colorado Works diversion, lost when the lump-sum fact was retired). All thirteen come from the changes since pass 3:

- **The records' reading of time (S4-1 to S4-4).** A dated weekly receipt is converted as if it were a whole month's stream, so four dated pays count sixteen weeks; a dated quarterly receipt counts a third in one month and nothing in the others; a pay or benefit moved by a holiday or a mailing cycle is counted on its actual date against 4.402.B; a stream keeps counting after its job's end date and before its start date; and vacation or sick pay after the job ended is counted as wages. The scalar facts carried these readings in their meanings ("the gross amount received for the month", fact-level rows FL in pass 3); the record fields do not.
- **The counting tables (S4-5 to S4-10, S4-12).** Seven rows give a different figure from the text on file: a diversion paid once is excluded whatever period it covers; foster care payments and a difficulty of care payment for a foster individual who is not a member are counted; HUD utility reimbursements are counted; WIOA earnings other than on-the-job training are counted; meals-only and room-only payments are unearned income, though 7 CFR 273.1(c)(3)(ii), (c)(5) and 273.9(b)(1)(ii) on file make them self-employment income (OQ-996 is not a policy choice); a business vehicle cost is not deducted; and excluded money counts toward the $30 irregular-income limit.
- **The time contract (S4-11).** Expanded categorical eligibility is tested on the determination month's gross income, and every SNAP age (60, 22, 18-49, 6, 12, under 18) on the determination date, in the initial month and in later months alike, so an application month earlier than the determination month gets another month's answer.
- **Decision 4 (S4-13).** Hours worked that are not stated are read as 0 even when the person's earnings records state a job, so a working student is an ineligible student and an ABAWD's month is countable.

There are also 6 P2 findings (S4-14 to S4-19) and 2 P3 findings (S4-20, S4-21). Open-question classes are in section 4: OQ-996 and the SNAP half of OQ-1020 fail the class check; OQ-835 and OQ-875 are "needs Legal", not one of the two classes.

## 2. Findings

P1: a wrong eligibility or benefit answer, a missing pathway or program, or an element a rule reads that is undefined. P2: a gap that does not change an answer today, or a citation or definition gap. P3: wording. Each P1 is labeled **common case**, **rare edge** or **decision 4**.

| ID | Sev | Paragraph | Item(s) | Governing text | What is wrong (repro household, answer by hand) | Proposed fix |
|---|---|---|---|---|---|---|
| S4-1 | **P1** (common case) | 4.402.A.2; 273.10(c)(2)(i) | snap_counted_recurring_receipts CO-5011; receipts CO-5000 (`frequency` required on a dated record); also CO-4324 for dated pays of less than monthly | 4.402.A.2: "households shall have income converted to a monthly amount ... Weekly Multiply Weekly Average by 4.3 ... Quarterly Multiply Average by 0.333333." | CO-5011 converts every receipt whose frequency is weekly, biweekly or less often than monthly at per_payment times the multiplier, in **each** month the record is received. A dated record is one payment, so four dated weekly payments in a month are four conversions (16 weeks), and a dated quarterly payment counts 0.333 of itself in its own month and nothing in the other two. Without per_payment the dated record is cannot determine (stored CO-712: "missing: receipts[0].per_payment"). The earnings reader (CO-4324) divides a dated weekly or biweekly pay by its schedule's paydays (ME-5), but a dated quarterly, twice-yearly or annual pay is counted in full in its month. Since the LEAP and CCCAP fixes of pass 4 (L4-3, C4-2) the case writer is asked to date recurring receipts. **DW1** (scratch4/p1.yaml): CO-115, p1 has no earnings and unemployment of $300 paid on the four Fridays of February 2027 (dated, weekly, per_payment 300). Engine: unearned $5,160, gross $5,160 > $3,608: **over_gross_income_limit, $0**. By hand: 300 × 4.3 = $1,290; net 1,290 − 217 = 1,073; 562 − 322 = **$240, eligible** (the engine gives $240 for the same money as a stream). **DQ1** (p9): dividends of $900 paid quarterly, dated 2027-02-15: engine $0 in January and March, $300 in February; a quarterly bonus of $900 dated the same day is $900 in February and $0 in the other months; by hand $300 in every month. | Give CO-5011 the earnings conversion: a dated weekly or biweekly receipt is amount × multiplier ÷ its schedule's paydays in the month; a dated receipt paid less often than monthly is amount × multiplier in every month of its interval (or the stream form only, said on the field). Do the same in CO-4324 and CO-5113 for dated pays of less than monthly. Receipts have no start or end date, so a benefit that begins mid-month is converted as a full month (4.402.A.2: "When a full month's income is anticipated"); add the full-month test the earnings records have. Apply the same reading to CO-4930 (training allowances, VISTA) and CO-4322, CO-5015, which read `amount` (S4-18). |
| S4-2 | **P1** (common case) | 4.402.B.1-3; 4.403.A.3 | earnings CO-5100 and receipts CO-5000 field `date` ("The day the pay came in"); CO-4324; CO-5011 | B.1: "Regular ongoing earned income that is received early or late ... due to a holiday, a weekend, or pay dates being changed will have income counted based on the regular pay schedule instead of the actual date of pay." B.2: households receiving monthly benefits "shall not have their monthly income varied merely because mailing cycles resulted in two (2) payments in one month and none in the next month." | Records place a dated pay or receipt in the month of its actual date, and no field or rule moves it to its regular month. Pass 3 marked B.1-B.3 fact-level on the monthly scalar facts; the record fields say the opposite. **B2** (p3): CO-115, p1 receives SSI ($994 a month, receives_ssi true, no earnings); May 2027's payment is dated 2027-04-30 (May 1 is a Saturday). Engine: April gross $1,988, **$30**; May gross $0, **$562**. By hand: $994 in each month, net 777, **$328 each month**. **B1** (p2): monthly wages of $1,000 dated 2027-04-01 and 2027-04-30 (for May): engine April $147, May $562; by hand $387 each. Weekly Friday pay of $250 with Christmas and New Year's Day paid on Thursday: engine December $1,236.25, January $860; by hand $1,075 each. | State on `date` (both lists) that a regular pay or benefit paid early or late by a holiday, weekend, changed pay date or mailing cycle is stated on its regular date (4.402.B), and wages held at the employee's request on the date they would have been paid (4.403.A.3); or add a `regular_pay_date` field the SNAP readers place by. |
| S4-3 | **P1** (common case) | 4.402.A.2-3; 4.402.1.B; 273.10(c)(2)(i) | CO-4324, CO-5113, CO-5114, CO-5115 (and every reader that sums a stream with `received_in`); earnings fields `job_start_date`, `job_end_date` | 4.402.1.B: "If the date of receipt or the amount of any anticipated income is uncertain, such as a new job ... that portion of income shall not be considered. Only the portion of income which can be anticipated with reasonable certainty concerning the amount and month in which monies will be received shall be counted." | A record with no month recurs "in every month the case covers", and `received_in` does not read the job's dates. CO-4324 reads them only to decide whether to convert, so a stream whose job ended is counted at its amount in every later month, and a stream whose job has not started is counted before it starts. An applicant who just lost a job is the ordinary case. **END** (p11): CO-115, wages stream $1,000 with job_end_date 2027-01-15. Engine: February and March gross $1,000, **$387**. By hand: no pay after January 15, gross $0, **$562** in February and March. **START**: a stream with job_start_date 2027-03-01 is counted in February ($387; by hand $562). | Make a stream recur only in the months from its job_start_date's month through its job_end_date's month (in `received_in` for earnings, or in each SNAP reader), and say so on `month` (when_absent). |
| S4-4 | **P1** (common case) | 4.403.A.4; 4.404.F; 4.405.E | CO-5100 kind `wages` ("paid leave"); CO-5101 row wages; CO-4324 | 4.403.A.4: sick, vacation and bonus pay are earned income "if the person was still employed while receiving the pay". 4.404.F: "If vacation pay, sick pay, or bonus pay is received in installment payments after a person has terminated employment, it is considered unearned income. If the pay is received in a lump sum, it shall be considered as a resource in the month received." | The wages kind includes paid leave, and no field or reader tells pay received after the job ended apart. Pass 3 had 4.404.F fact-level on the retired lump-sum fact (CO-3367). **VAC** (p8): CO-115, p1's job ended 2027-01-29 and his final vacation payout of $1,500 is paid once on 2027-02-05 (wages, job_end_date set). Engine: earned $1,500, **$267**. By hand: a resource, not income; gross $0, **$562**. **VAC-i**: $600 a month of vacation pay in installments after the job ended: engine earned $600 with the 20% deduction, **$483**; by hand unearned $600, net 383, **$447**. | Read pay with a date after its job_end_date (or a stream whose job has ended) as 4.404.F says: a once-paid record is a lump sum, excluded as income; installments are unearned income (no earned income deduction). Or add a kind `pay_after_termination` with its SNAP row. |
| S4-5 | **P1** (regression of C2-5) | 4.405.E (second paragraph); 4.402.2; 273.9(c)(8) | CO-5010 (every row: "a receipt paid once is a nonrecurring lump sum, excluded"); CO-5011; colorado_works_diversion; tanf_state_diversion_payment_months CO-4911 | "State and county diversion payments under Colorado Works shall be excluded as a non-recurring lump sum payment if the payment does not cover more than ninety (90) days of expenses and is not expected to occur again in a twelve (12) month period." 9 CCR 2503-6 (D-81): a diversion "may address needs over a period of no more than four (4) months". | CO-5011 drops every `once` receipt, so a diversion covering four months is excluded. The pass-2 fix of C2-5 put the 90-day condition in the meaning of the lump-sum fact CO-3367, which the receipt migration retired; CO-4911 states the months but SNAP does not read it. **DIV** (p7): CO-115, p1 receives a $1,200 state diversion once in February 2027 for four months of expenses (CO-4911: 4). Engine: unearned $0, **$387**. By hand: not excluded; averaged over the four months it covers (4.402.2) at $300: gross $1,300, net 883, **$297**. | In CO-5011 exclude a once-paid colorado_works_diversion only when it covers 90 days or less (CO-4911, or a field on the receipt) and is not expected again within twelve months; otherwise average it over the months it covers. Add a rule test from DIV. |
| S4-6 | **P1** (common case for foster parents) | 4.304.3.B.1; 4.403.2.B.3; 273.9(c)(15); 273.9(b)(2)(ii); 273.1(c)(4) | CO-5010 row foster_care_payment (counted_no_rule_excludes), kinship_care_payment; CO-5101 row difficulty_of_care_payment (counted_no_rule_excludes; the record's `foster_care` field is not read) | 273.9(c)(15): excluded are "Governmental foster care payments received by households with foster care individuals who are considered to be boarders". 273.9(b)(2)(ii) counts "foster care payments for children or adults who are considered members of the household". 4.304.3.B.1: a foster child not included "will not have their income ... or needs included". | The receipt row counts every foster care payment whatever the foster individual's membership, and a foster individual is a member only at the household's request (273.1(c)(4)). The earnings row counts a difficulty of care payment that the record marks foster_care; the LEAP and CCCAP rows were fixed for the same class in pass 4 (X4-2), SNAP's was not. **FC** (p10): CO-115, p1 receives $600 a month of foster care payments for a foster child not in the SNAP household. Engine: unearned $600, gross $1,600, **$207**. By hand: excluded, **$387**. **DOC**: wages $1,000 and an $800 difficulty of care payment with foster_care true: engine gross $1,800, **$195**; by hand **$387**. | Count a foster care payment (and a difficulty of care payment with foster_care) only when the foster individual it is paid for is a member of the SNAP household (a field naming the individual, or a person fact). Say in the kinship row whether a county-placed kinship payment is foster care under 273.1(c)(4). |
| S4-7 | **P1** (common case in assisted housing) | 4.405.2.A.7; 273.9(c)(11)(i) | CO-5010 row housing_utility_allowance (counted_no_rule_excludes) | 273.9(c)(11)(i): excluded are "Any payments or allowances made for the purpose of providing energy assistance under any Federal law other than part A of Title IV ..., including utility reimbursements made by the Department of Housing and Urban Development and the Rural Housing Service". | The kind is "a utility allowance paid to the person by a subsidized housing program", the HUD utility reimbursement the regulation names. **HUA** (p10): CO-115, p1 receives a $75 utility reimbursement each month. Engine: gross $1,075, **$364**. By hand: excluded, **$387**. | Make the row excluded (4.405.2.A.7, 273.9(c)(11)(i)); if a non-federal housing program's allowance must be counted, split the kind. |
| S4-8 | **P1** (common case for WIOA participants) | 4.405.2.A.6; 273.9(c)(10)(v) (D-13: "Allowances, earnings, or payments ... to individuals participating in programs under the Workforce Investment Act of 1998, except as provided for under paragraph (b)(1)(v)") | CO-5101 row subsidized_employment (counted_no_rule_excludes); CO-5100 kind subsidized_employment ("other than WIOA on-the-job training: an apprenticeship, on-the-job training or a transitional job whose wages a public program subsidizes") | A.6: "Payments, allowances and earnings under the Workforce Innovation and Opportunity Act (WIOA) are excluded as income. Earnings paid for on-the-job training are still counted for SNAP." | WIOA-funded work experience, transitional-job and internship wages are earnings under WIOA other than on-the-job training, so A.6 excludes them; the only kind that holds them is subsidized_employment, which SNAP counts. **WIOA** (p10): CO-115, p1's only income is $1,000 of wages in a WIOA-funded transitional job. Engine: gross $1,000, **$387**. By hand: excluded, gross $0, **$562**. | Add a kind (or a `wioa_funded` field) for WIOA earnings other than on-the-job training, with an excluded SNAP row; keep subsidized_employment for non-WIOA programs. |
| S4-9 | **P1** (common case for households with lodgers or meal boarders) | 273.1(c)(3)(ii), (c)(5) (D-7); 273.9(b)(1)(ii) (D-13); 4.403.2; 4.304.31.A-B; OQ-996 | CO-5010 rows board_only_payment, room_only_payment (counted_no_rule_excludes, unearned); CO-5101 meaning; CO-5117 (room_and_board only) | 273.1(c)(3)(ii): "individuals ... paying a reasonable amount for meals or meals and lodging must be considered boarders". 273.9(b)(1)(ii): "Payments from a roomer or boarder, except foster care boarders, shall also be considered self-employment income." | OQ-996 says the text does not settle a meals-only or room-only payment; the federal text on file does: a meals-only payer is a boarder and a roomer's payment is self-employment income, earned, less the cost of doing business, with the 20% deduction (4.403.2.B-C). The engine counts both as unearned income, gross. **ROOM** (p14): CO-115 with $600 a month from a roomer: engine unearned $600, net 1,183, **$207**; by hand earned $1,600 (no costs stated), deduction $320, net 1,063, **$243**. **BOARD**: $400 a month from one meals-only boarder: engine **$267**; by hand $400 less the one-person maximum allotment $306 = $94 earned, gross $1,094, net 658, **$364**. | Read board_only and room_only payments as boarder self-employment income (CO-4165's cost rule for boarders; actual costs for roomers) and resolve OQ-996 by the text; SNAP's E2 request for the boarder records then carries this reading. |
| S4-10 | **P1** (common case for self-employed drivers) | 4.403.11.B-C; 273.11(b)(1)-(2) | CO-5101 rows business_cost_vehicle, business_cost_home_space (not_deducted_no_rule_found); CO-1701 | 4.403.11.B: "Allowable costs of doing business include, but are not limited to: ... insurance premiums; taxes paid on income-producing property; and, other similar items that are necessary costs of doing business." C lists what is not allowed: prior losses, income taxes, retirement savings, "other work-related personal expenses (such as meals)"; 273.11(b)(2)(ii) adds "transportation to and from work". | The rows say no rule names these costs either way. 4.403.11.B names the class ("not limited to ... necessary costs of doing business") and C's closed list of disallowed costs does not include business use of a vehicle; only commuting is disallowed. **VEH** (p15): CO-115, p1 is a rideshare driver with $2,000 of receipts, $600 of business mileage and $200 of other costs, not annual support. Engine: net $1,800, **$195**. By hand: net $1,200, deduction 240, net 743, **$339**. | Deduct business_cost_vehicle (business miles only; commuting is not a business cost, 273.11(b)(2)(ii)); record the owner's reading of home space (the business share of the home's costs), with the shelter deduction kept from counting the same cost twice. |
| S4-11 | **P1** (common case when the application month precedes the determination month) | 4.206.C.2.a.1, D; 4.401.A; 4.402.1.A; 4.304.1.A; 4.306.A-B; 4.407.3.B; 4.407.6 | snap_meets_ece_eligibility CO-340 (gross income "for the month containing the Determination Date"), snap_eligibility_category CO-341 (person); snap_is_elderly CO-301, snap_household_members CO-305, snap_is_ineligible_student CO-411, CO-410, CO-408, CO-401, CO-3713, CO-2337, snap_is_ineligible_abawd CO-2564, CO-2318, CO-2304 (all person scope, `age` on the determination date or the determination month) | 4.402.1.A: "Prospective budgeting is the process of computing a household's allotment based on anticipated income and circumstances during the issuance month." 4.206.D: when the circumstances that made a household BCE or ECE change, "the household's eligibility must be re-evaluated according to the appropriate category". | Under month-v1 a person-scope item is one value per case, so the initial month and every later month take the determination month's category and the determination date's ages (the time audit's T-1 class, fixed for Medicaid and recorded in OQ-951 for Colorado Works and Adult Financial; for SNAP the time audit kept CO-339/CO-340 on the determination as "a test at the determination", and no open question records the wrong answers). **ECE-T1** (p5): CO-83 determined 2026-11-05; the stepfather's wages are $3,500 in October and $5,000 in November. Engine: category standard; October **over_gross_income_limit, $0**. By hand: October gross 3,500 ≤ 4,554, ECE; net 2,583 − 524.5 = 2,059 (rounded); full month 808 − 618 = 190; prorated 190 × 20 / 31 = **$122**. Determined on 2026-10-20 instead, the engine gives October $122 but November **eligible, $0** under ECE although November's gross $5,000 > $4,554 (by hand: not ECE, over the 130% limit, **ineligible**). **AGE60** (p6): CO-83 with the stepfather born 1966-11-02, determined 2026-11-05: engine October **$521** (elderly: shelter uncapped); by hand he is 59 all October, shelter capped at 769, **$479**. Determined 2026-10-20: November **$743**; by hand he is 60, **$808**. | Make the ECE test and the category per month (the month's gross income), and read the SNAP age tests for the month evaluated (age on the first day of the month for "N or older", the last day before the month for "under N"), as the Medicaid T-1 fix and CO-412 do; or record the determination-date reading as an open question with ECE-T1 and AGE60 as its worked examples. |
| S4-12 | **P1** (rare edge) | 4.405.A; 4.405.I; 4.405.E; 273.9(c)(2) | snap_irregular_unearned_receipts_in_quarter CO-5013 ("whatever their kind"); snap_irregular_income_is_within_quarterly_limit CO-5110 | 4.405.A: "Any income in the certification period that is received too infrequently or irregularly to be reasonably anticipated, but not in excess of thirty dollars ($30) in three (3) months." 4.405.I: a reimbursement "shall not be considered income". | The $30 is a limit on income. CO-5013 sums every irregular receipt of the quarter, of excluded kinds (a reimbursement, a loan, educational assistance) and lump sums included, and CO-5110 sums irregular earnings of excluded kinds (work-study, in-kind pay), so money that is not income pushes countable irregular pay over the limit. **IRR** (p19): CO-115, wages $1,000 plus a $25 odd job (irregular, once) and a $50 irregular reimbursement in February. Engine: within limit false, earned $1,025, **$381**. By hand: the quarter's irregular income is $25, excluded; gross $1,000, **$387**. | Sum only receipts whose SNAP row counts them (counted, counted_no_rule_excludes, counted_beyond_quarterly_limit, counted_as_earned) and are not once-paid lump sums, and earnings whose row is a counted pay or business row. |
| S4-13 | **P1** (decision 4) | 4.306.1.B; 4.311.B; 273.5(b)(5); decision 4 of 2026-11-23 | snap_weekly_hours_worked CO-402, snap_meets_student_employment_exemption CO-407, snap_meets_abawd_work_requirement CO-415 (hours_worked `otherwise 0`); hours_worked CO-022 ("If not stated, ... reads it as zero") | 4.306.1.B: "The student is employed for an average of twenty (20) hours per week and is paid for such employment." Decision 4: "readers do not invent defaults." | No rule gives hours a value when they are not stated, and the default contradicts the person's own earnings records. **STU** (p12): CO-83's stepfather is a half-time college student earning $1,500 a month (earnings stated), with hours not stated and adequate child care available. Engine: weekly hours 0, **ineligible student**, size 2, October **$362**. By hand: cannot determine (the hours decide the exemption); with his 130 hours stated the engine gives $479. The same default makes an ABAWD with stated wages and no stated hours accrue a countable month (CO-415), while the verification item reads the same fact with no default (CO-1386), so the two disagree. | Read hours_worked with no default where earnings records state pay for the month (cannot determine, naming the fact), or derive "worked" from the records; keep 0 only for a person whose stated earnings list is empty. Give CO-1386 and CO-415 one reading. |
| S4-14 | P2 | Decision 4; conventions "Receipt records" ("Readers carry no default of their own") | rental_property_costs `otherwise 0` (CO-4322); received_snap_or_public_assistance_when_joined_vista `otherwise false` (CO-4930: VISTA counted); home_incurs_electricity/water/sewer/trash/cooking_fuel/telephone and home_incurs_separate_cooling_cost `otherwise false` (CO-1239, CO-1241, CO-1500: no SUA); education_enrollment_intensity `otherwise` at least half time (CO-2569) and not full time (CO-4260); residence_setting_is_nonprofit `otherwise false` (CO-007: a treatment-facility resident read as in a for-profit institution, so in no SNAP household); qualifying_quarters_with_federal_means_tested_benefit `otherwise 0` (CO-4262); status_before_lpr_adjustment `otherwise none` (CO-3713); work_program_hours, unpaid_or_in_kind_work_hours, community_service_hours, snap_abawd_work_hours_missed_for_good_cause `otherwise 0` (CO-415, CO-6003); snap_unearned_income_received_after_application_date `otherwise 0` (CO-331) | Decision 4: "Each supplied fact states once whether it is required or what its rule-given default is." | Each default is stated in its fact's meaning (convention rule 12), so none is silent, and most are the absence of a status the rule treats as the ordinary case (no warrant, no request, not a striker). The ones listed are not: they fill in a quantity or a status that decides an answer, with no rule text for the value. Two also restate money the records state: the destitute household's unearned income after the application date (CO-4167) is a second statement of the dated receipts, while the earned half reads the pay records' dates (CO-5113), so a dated unemployment payment after the application date is counted unless the scalar fact is also stated; and the residence's nonprofit status decides whether a treatment-center resident is in any SNAP household. | One owner pass over the list, as care-energy X4-1: cite the rule that gives each default or make the fact required where read. Read the destitute month's unearned income from the receipts' dates as the earned half does, and retire CO-4167. |
| S4-15 | P2 | 4.405.1; 4.506.D; 273.9(c)(3)(ii)(C)(9); 4.405.I.1-2, I.4.d; 273.1(c)(4) | CO-5010 rows gi_bill_housing_food_allowance, in_home_care_allowance, home_care_allowance, colorado_works_supportive_services, kinship_care_payment (counted_no_rule_excludes), educational_assistance (excluded); CO-5101 rows employer_health_insurance_subsidy (counted_no_rule_excludes), summer_youth_employment (excluded) | 4.405.1: "All education assistance including ... veteran's educational benefits, and any other money received specifically for educational expenses are exempt". 4.506.D: "All educational income and financial aid are considered exempt income". 273.9(c)(3)(ii)(C)(9): "Normal living expenses which are room and board are not excludable." | These rows say "no rule" (or exclude in full) where a paragraph on file names the money and the two texts differ: Colorado excludes veterans' educational benefits and all educational income in full, and the federal rule counts the room and board part (so the GI Bill housing allowance is counted by silence under Colorado's text and the educational assistance kind is excluded in full under the federal one); an in-home care allowance or the Home Care Allowance may be a reimbursement for an identified non-living expense (I.1, I.4.d); Colorado Works supportive services for an employment program are named in I.2; an employer's health insurance subsidy may be a medical reimbursement (I.1, I.4.c); a county-placed kinship payment may be foster care (S4-6); summer_youth_employment is excluded whatever the program, but A.6 excludes it as WIOA pay only. No stored household turns on them. | Cite the candidate paragraph in each row and let the owner choose, recording the Colorado-federal difference on education as an open question; split the summer youth kind by funding, as S4-8 does for WIOA. |
| S4-16 | P2 | Open-question class check (section 4) | OQ-996; OQ-1020 (SNAP half); OQ-835, OQ-875 | | OQ-996 is classed a state policy choice although D-7 and D-13 on file settle it (S4-9); its "Checked" line cites 273.1(c)(3)(ii), (c)(5)-(6) as saying "who boarders and roomers are, not how ... a room-only payment is counted", but 273.9(b)(1)(ii) on the same file says how. OQ-1020's SNAP half rests on the same reading. OQ-835 and OQ-875 are "needs Legal", which is not one of the stopping rule's two classes; each is a Colorado text broader than the federal one, and the volume elsewhere applies the federal text in such a conflict (CO-3700, CO-119, CO-1243, CO-308). | Resolve OQ-996 (and OQ-1020's SNAP half) by the text. For OQ-835 and OQ-875, have the owner confirm the class as a state choice with Legal as owner, or apply the federal text as the volume does elsewhere and record the override. |
| S4-17 | P2 | 4.403.11.D | CO-4349, CO-1702 | 4.403.11.D: "any capital gains that the household anticipates receiving in the next twelve (12) months, beginning with the date the application is filed, are added, and divided by twelve (12)." | An annual-support business is averaged over the twelve months before the application (CO-4349's precision: "Capital gains received in these months are part of the receipts"), so a capital gain received last year is averaged and one anticipated in the next twelve months is not. No stored household has a capital gain. | Average anticipated capital gains over the next twelve months, as D says, apart from the past receipts; or record the past-months reading in an open question. |
| S4-18 | P2 | 4.402.A.2; 4.405.2.A.10 | CO-4930 (vocational_training_allowance, Title I kinds), CO-4322 (rental_income), CO-5015 (charitable cash) | 4.402.A.2 (as S4-1) | These readers sum `amount` with no frequency conversion, while CO-5011 converts a weekly stream by per_payment × 4.3. A weekly training allowance stated as a stream (amount 1,000, per_payment 250) is $1,000 here and would be $1,075 through CO-5011; CO-5015 excludes charitable cash by its `amount` while CO-5011 counts it by per_payment. Same mechanism as S4-1, smaller amounts. | Read these through the one conversion S4-1 settles. |
| S4-19 | P2 | 4.311.3.A, C | CO-2564, CO-417 | 4.311.3.A: countable months accrue "when an ABAWD received SNAP benefits for the full benefit month" | CO-2564 decides ABAWD ineligibility for the case from the determination month's status (person scope), so an initial month in which the ABAWD had not yet reached the limit is read with the determination month's answer (the S4-11 class). No household is shown wrong; the countable months themselves are per month. | Fold into S4-11: read the limit for the month evaluated. |
| S4-20 | P3 | — | handoff pattern English for CO-4324, CO-5113, CO-5021, CO-5022 | | `ceil` over a count of paydays or months renders "rounded up to the next whole dollar". | Render `ceil` of a count as "rounded up to a whole number". |
| S4-21 | P3 | 4.403.F | CO-1376 | | The owner-pay subtraction takes the raw amounts of paid_as_business_owner records from CO-4930's converted figure, so a weekly-converted owner wage leaves a few dollars "to verify". Verification only. | Subtract the converted owner pay (the CO-4324 conversion on those records). |

Totals: 13 P1, 6 P2, 2 P3.

Checked and not a finding:
- Income limits at their boundaries (p13): a household of two, standard eligibility (an IPV member left out of the size), gross $2,345 eligible, $2,346 over_gross_income_limit; a weekly stream converting to $2,345.48 rounds to $2,345 (273.10(e)(1)(ii)(A), cited on CO-334). Net $890 and allotment $295 match the hand figures (shelter capped at $769).
- The 60th birthday on the determination date (p16): elderly; the day after: not.
- Two jobs on different schedules (p17): five dated weekly pays of $250 and two dated biweekly pays of $600 in January 2027 give $2,365 = 4.3 × 250 + 2.15 × 600; streams weekly $250 and semimonthly $500 give $2,075. SNAP does not need the `job` field: each dated pay is converted by its own schedule's paydays, so two jobs on the same weekday also give the right total.
- Self-employment averaging (p17): a business begun in August 2026 with $3,000 in August and $1,500 in October, annual support, averages over August to October ($1,500 a month) from the November application (4.403.12.D).
- Household composition (p18): a 21-year-old son who buys separately is a mandatory member; a daughter who turned 22 the day before is not.
- Proration (CO-83 base): $743 × 20 / 31 = $479.35, $479; the $10 initial-month threshold, the one- and two-person minimum outside the initial month, and BCE/ECE households with $0 not denied (4.207.3.B-C) read as the text says. D-S3 (CO-6000 to CO-6002) and D-S6 (CO-6003, CO-1386) hold: their rule tests pass, and CO-1386 now reads the unpaid and community service hours CO-415 counts.
- Decision 4 on the records: an unstated earnings or receipts list is cannot determine; a dated pay or receipt with no frequency is cannot determine where SNAP reads it (CO-4324, CO-5011); a business that does not state annual_support is cannot determine (OQ-1101).
- The other CO-5010 rows (Social Security, SSI, pensions, unemployment, child support and arrears, cash assistance, interest, rent net of costs, workers' compensation, substantial gambling winnings, the excluded educational, loan, reverse mortgage, reimbursement, federal energy, tax refund, federally excluded, AmeriCorps, WIOA payment, migrant emergency and crime victim rows, VISTA and training allowances as earned, sponsor payments, military allotments net of the part for persons elsewhere) and the other CO-5101 rows (wages, combat-zone special pay, work-study, WIOA on-the-job training under 19, SCSEP, Census, in-kind pay, employer vendor payments, business and farm receipts, operating, interest, principal and depreciation costs, boarders net of the allowance, foster boarders disregarded) agree with 4.403-4.405 and 273.9.

## 3. Coverage matrix

Key: **C** = carried by (the derivation was read against the text; correct unless a finding is named). **FL** = fact-level: the supplied fact's or record field's meaning states how the amount is formed. **NA** = not applicable, with the reason. **OQ** = the open question that holds it. **GAP** = no item and no recorded reason. Rows marked † changed since pass 3 and were re-read against the new items.

### 3.1 Expedited service, categories, authorizing benefits (4.205.1-4.207.3)

| Paragraph | Disposition |
|---|---|
| 4.205.1.A.1-3 (destitute migrant ≤ $100; < $150 income and ≤ $100 liquid; income + liquid < rent and utilities with the SUA) | C: CO-348 (liquid resources CO-1740: holdings, out of scope), CO-377, CO-1500 |
| 4.205.1.B-E, 4.205.11.A-C (seven days, interview, postponement, thirtieth day, one postponement per season) | C: CO-1393, CO-1394, CO-4254, CO-2570; OQ-1100; interview conditions NA (application processing, CO-348 precision) |
| 4.205.2-4.205.4 (thirty days; delays) | C: CO-4269, CO-4270 (household-caused delay); the rest NA (agency processing) |
| 4.206.A, C.1.a.1-2 (BCE: all members receive or are authorized SSI, CW, OAP, AND, AB; Family Preservation) | C: CO-336, CO-338; OQ-640 |
| 4.206.C.1.b, C.2.b (verification relief) | C: CO-1374 to CO-1377, CO-1616 (OQ-311 resolved) |
| 4.206.C.1.c, C.2.c, C.3.a.1-2 (IPV, SNAP drug felony bar BCE/ECE) | C: CO-337 |
| 4.206.C.2.a.1-2 (ECE: gross ≤ 200%; TANF/MOE service) | C: CO-339, CO-340†; OQ-12, OQ-356. Month: **S4-11** |
| 4.206.C.3.b.1-2 (SE: net 100% with elderly/disabled; gross 130% and net 100% otherwise) | C: CO-345, CO-346, CO-347, CO-382, CO-4680 |
| 4.206.D (re-evaluate the category on a change) | **S4-11** |
| 4.206.E (substantial winnings: household ineligible in the month; next certification SE) | C: CO-5012†, CO-4151†, CO-4152, CO-341 (CO-4153) |
| 4.207.1.A-D (issuance schedule; 30 and 7 days; combined issuance after the 15th) | NA (issuance) |
| 4.207.2.A (proration from the application date; joint SSI release) | C: CO-2305, CO-2308†, CO-4269; joint SSI CO-1746 (precision) |
| 4.207.2.B (migrant in the job stream, break ≤ 30 days: full month) | C: CO-2305 (CO-2306) |
| 4.207.2.C (formula) | C: CO-2308 (checked, CO-83 base) |
| 4.207.3.A (30% of net, subtract, round down) | C: CO-384, CO-6000†, CO-2307 |
| 4.207.3.B (initial month under the minimum: none; 3+ members with $0 denied except BCE/ECE) | C: CO-385 ($10, statute override; CO-3700), CO-387 |
| 4.207.3.C (one- and two-person minimum except the initial month) | C: CO-2307, CO-4182†, CO-6002† (D-S3) |
| 4.207.3.D (maximum and minimum tables; 18+) | C: CO-130, CO-131, CO-3726, CO-135, CO-383 |

### 3.2 Non-financial eligibility (4.301-4.311)

| Paragraph | Disposition |
|---|---|
| 4.301, 4.302 (identity; SSN, refusal disqualification) | C: CO-1370, CO-1374, CO-2562 (prorated, CO-2565) |
| 4.303 (residency; migrant camps, shelters; no durational requirement; county) | C: CO-4253, CO-309 (OQ-3, OQ-393 resolved) |
| 4.304.A.1-3 (purchase and prepare; separate households under one roof) | C: CO-305 (buys_prepares_with), CO-1925 |
| 4.304.1.A.1, A.1.A (21 and younger with a parent; both parents) | C: CO-305 (age < 22; parent and stepparent edges). Age month: **S4-11** |
| 4.304.1.A.2 (child under 18 under parental control of a non-parent) | C: CO-305, CO-018 |
| 4.304.1.B (spouses; holding out) | C: CO-305 |
| 4.304.1.C, 4.304.3.A (elderly with a disability, 165% test; spouse) | C: CO-419, CO-2304, CO-3712, CO-114, CO-3043 (spouse always set aside, federal text) |
| 4.304.2 (shared custody; majority of meals) | C: CO-304, CO-4180, CO-4181 |
| 4.304.3.B.1-3 (foster children optional; separate application over 18) | C: CO-4689, CO-4690, CO-311; OQ-875. Income: **S4-6** |
| 4.304.3.C, 4.304.31.A (boarders; reasonable payment) | C: CO-304, snap_is_boarder CO-2567 (FL: reasonable payment in its precision), CO-5117†, CO-4165† |
| 4.304.31.B-C (roomers, live-in attendants as separate households) | C: CO-305 (CO-2566). Roomer's payment: **S4-9** |
| 4.304.32 (residence separate and apart) | FL: dwelling_id, lives_with (OQ-612) |
| 4.304.4 (disqualified individuals; fleeing felons, probation violators; institutions; students; meal plans) | C: CO-311, CO-2302, CO-4683, CO-5216, CO-007, CO-304 |
| 4.304.41 (exemptions from the institution rule) | C: CO-007 (residence_setting_is_nonprofit default: S4-14) |
| 4.305, 4.305.1 (eligible non-citizens: Pub. L. 119-21 sec. 10108 list; five-year bar and exceptions) | C: CO-306, CO-307, CO-308, CO-3713, CO-4262, CO-4260; OQ-1, OQ-533. Under 18 at the determination date: **S4-11** |
| 4.305.2 (sponsored non-citizens: deeming, exemptions, indigence) | C: CO-3701, CO-3708, CO-3710, CO-3711, CO-2337, CO-2335, CO-2334; resources CO-3702 out of scope |
| 4.305.3 (reporting undocumented) | NA (agency duty) |
| 4.306.A-B (18-49 at least half time in higher education) | C: CO-411, CO-021. Age month: **S4-11** |
| 4.306.C (enrollment from the first day of the term) | FL: education_program_type, education_enrollment_intensity |
| 4.306.1.A (unfit) | C: CO-400 |
| 4.306.1.B (20 hours a week or 80 a month, paid; self-employed at the minimum wage × 20) | C: CO-407†, CO-402†. **S4-13** |
| 4.306.1.C (work-study) | C: CO-407 (is_approved_for_work_study) |
| 4.306.1.D-E (child under 6; 6-11 without adequate care; full-time single parent) | C: CO-408, CO-409 |
| 4.306.1.F-H (TANF cash; placed through E&T; on-the-job training) | C: CO-410 |
| 4.307, 4.307.1 (strikers) | C: CO-3503, CO-3504, CO-3500 to CO-3502 (OQ-534 resolved) |
| 4.308, 4.308.1, 4.310.5-4.310.8 (voluntary quit; good cause; sanction lengths; exemption ends it) | C: CO-2318, CO-2313 to CO-2316, CO-2319 |
| 4.309.1-4.309.42 (meal providers, shelters, treatment centers, group living) | C: CO-007 (settings) |
| 4.310.1-4.310.2 (work registration; informing) | C: CO-405, CO-406 (informational) |
| 4.310.3.A-H (exemptions) | C: CO-405, CO-401, CO-400, CO-404†, CO-020 (unfit examples to the agency finding, CO-400 precision) |
| 4.310.4 (changes in exemption) | NA (between determinations; pass 3 N3-P3-2) |
| 4.311.A.1-4 (not ABAWDs: ages, unfit, living with a minor) | C: CO-412, CO-414, CO-4250 (statute's 64 and 14; OQ-835) |
| 4.311.B.1-4 (80 hours; work, in-kind, unpaid; work programs; workfare) | C: CO-415, CO-6003† (D-S6); hours default **S4-13** |
| 4.311.1.A-G (ABAWD exemptions; homeless, veterans, former foster youth struck by the statute) | C: CO-414 (statute override; OQ-533) |
| 4.311.2 (changes in exemption) | NA |
| 4.311.3.A-D (countable months; turning 18; good cause; the 36-month clock from July 2023; regaining; three more months) | C: CO-416, CO-417, CO-418, CO-2312, CO-2564. Determination month: **S4-19** |
| 4.312, 4.313 (Employment First, Workfare administration) | NA (county administration); participates_in_workfare read by CO-415 |

### 3.3 Income (4.400-4.406)

| Paragraph | Disposition |
|---|---|
| 4.400, 4.401.A.1-3 (prospective; categories' income standards) | C: CO-347, CO-382, CO-340 |
| 4.401.A.4 (elderly with a disability, 165%) | C: CO-419 |
| 4.401.B (ineligible students and members out of the size) | C: CO-312, CO-313, CO-3714 |
| 4.401.1, 4.401.2 (FY 2027 tables) | C: CO-110, CO-111, CO-112, CO-113, CO-114, CO-122, CO-123 (figures match) |
| 4.402.A.1 (prospective) | C (prospective statement in the records); time: **S4-11** |
| 4.402.A.2 (conversion; cents) | C: CO-4324†, CO-5113†, CO-5011†, CO-4323. **S4-1**, **S4-18** |
| 4.402.A.3 (all income from whatever source; month received; averaged) | C: CO-5010†, CO-5101†, `received_in` |
| 4.402.B.1-3 (early or late pay; mailing cycles; armed services) | **S4-2** (was FL on the monthly scalar facts) |
| 4.402.C (wage data verified) | NA (agency duty) |
| 4.402.1.A-C (prospective budgeting; uncertain income; past thirty days) | FL (the records state anticipated pay); new and ended jobs: **S4-3** |
| 4.402.2.A.1 (self-employment annualized) | C: CO-4329†, CO-4349†, CO-1702† (OQ-1101) |
| 4.402.2.A.2, 4.403.3 (contract income over twelve months; not hourly) | C: CO-4324 (annual_contract_pay), CO-5113 |
| 4.402.2.A.3 (educational income prorated) | NA: excluded in full (4.405.1); S4-15 |
| 4.402.2.A.4 (elected averaging; not for destitute migrants) | FL; C: CO-4324, CO-4329 (destitute) |
| 4.402.2.B-C (averaged income added; prospective average) | C: CO-1702 |
| 4.403.A.1 (wages, garnishments, diverted wages; state work-study not earned) | C: CO-5101 rows wages, employer_vendor_payment (S4300), work_study |
| 4.403.A.2, C (ASCS payments; VISTA unless on SNAP when joined) | C: CO-4930† (VISTA default: S4-14); ASCS payments FL (wages or business receipts) |
| 4.403.A.3 (held wages; advances; repayment) | **S4-2** (date field) |
| 4.403.A.4 (sick, vacation, bonus while employed) | C: wages kind. After termination: **S4-4** |
| 4.403.B.1 (training allowances, not WIOA) | C: CO-4930† (vocational_training_allowance) |
| 4.403.B.2 (WIOA on-the-job training; under 19 with parental control) | C: CO-5112†, CO-5101 row |
| 4.403.D (strikers) | C: CO-3503 |
| 4.403.E.1 (rental property: earned if managed 20 hours a week) | FL: rental_income kind ("does not actively manage"); managed rent is self_employment_receipts |
| 4.403.E.2 (sale of capital goods counted in full) | C: CO-1702 precision (stated in receipts) |
| 4.403.F (LLC and S-corporation owners as employees; draw) | C: wages with paid_as_business_owner; CO-1376 (OQ-760) |
| 4.403.G, 4.403.2.A, D (boarder payments; shelter paid by boarders) | C: CO-5117†, CO-4165†, CO-377 |
| 4.403.1.A-B (self-employment defined; 30 hours) | C: CO-404 (hours_worked includes self-employment) |
| 4.403.11 (gross plus capital gains less costs; allowable and disallowed costs) | C: CO-5114†, CO-1701†, CO-1702†, CO-5101 cost rows. **S4-10**; anticipated capital gains **S4-17** |
| 4.403.12.A-D (annual support over twelve months; partial; monthly; new business) | C: CO-4329†, CO-4349† (partial support FL, CO-4329 precision); OQ-1101 |
| 4.403.12.E.1-2 (farm loss offset) | C: CO-3722†, CO-5115†, CO-5116†, CO-3723 to CO-3725, CO-372, CO-378 (federal (B) order, recorded on CO-378) |
| 4.403.2.B.1-3 (boarder cost: maximum allotment for the boarders or actual; foster care disregarded) | C: CO-4165†, CO-5118†. Meals-only and room-only: **S4-9** |
| 4.403.2.C (20% deduction on boarder net) | C: CO-330 |
| 4.403.3.A-D (school employees) | C: CO-4324 (annual_contract_pay; once a month on one record, CO-5100) |
| 4.404.A-C (assistance, retirement and disability, support) | C: CO-5010 rows |
| 4.404.D (rent net of costs, not managed) | C: CO-4322 (costs default: S4-14) |
| 4.404.E (sponsors' income) | C: CO-3701, CO-3711 |
| 4.404.F (vacation, sick, bonus after termination) | **S4-4** |
| 4.404.G (gifts) | C: gift row; unanticipated gifts as irregular or once |
| 4.404.H (dividends, interest, royalties, trust withdrawals) | C: interest rows; other_taxable |
| 4.404.I (substantial winnings, shared tickets) | C: CO-5012† (the person's own share, FL) |
| 4.405.A (irregular ≤ $30 in three months) | C: CO-5110†, CO-5111†, CO-5013†, CO-5014†. **S4-12** |
| 4.405.B (money for non-household members) | C: CO-5011 (for_person_living_elsewhere) |
| 4.405.C (child students' earnings; the month they turn 18) | C: CO-2569, CO-2338†, CO-4930 (intensity default: S4-14) |
| 4.405.D.1-2 (recoupments; IV-D transfers) | C: CO-5011 (recouped, transferred_to_child_support_agency) |
| 4.405.E (nonrecurring lump sums; diversion ≤ 90 days) | C: CO-5011 (once). Diversion: **S4-5** |
| 4.405.F (loans; reverse mortgages) | C: loan, reverse_mortgage rows |
| 4.405.G (in-kind benefits) | C: in_kind_pay row (excluded_in_kind) |
| 4.405.H.1-10 (vendor payments; diverted wages counted; employer-provided housing) | C: employer_vendor_payment (OQ-1021 resolved), in_kind_pay; vendor payments are not receipts (FL) |
| 4.405.I.1-4 (reimbursements) | C: reimbursement row. Candidate kinds: **S4-15** |
| 4.405.J (verification of exempt income only if questionable) | C: CO-1376, CO-1377 (count only counted income) |
| 4.405.1 (educational assistance) | C: educational_assistance, school_attendance_conditional_benefit rows. GI Bill housing: **S4-15** |
| 4.405.2.A.1-28 (federal statute exclusions) | C: federally_excluded_payment, energy_assistance_federal, americorps, workforce_program_payment, scsep_employment, charitable_need_based_cash (CO-5015), paid_to_former_spouse, combat_zone, education_deduction, migrant emergency, PASS, crime victim rows. A.6 WIOA earnings: **S4-8**; A.7 HUD utility reimbursements: **S4-7** |
| 4.405.2.B.1-21 (Indian and Alaska Native payments; $2,000 limits) | FL: federally_excluded_payment (the excluded part; any excess stated as other income) |
| 4.406.A-C, 4.406.1.A-C (destitute households; income to the application date; new source within ten days; travel advances) | C: CO-4168, CO-5113†, CO-5114†, CO-5115† (dated pays); CO-331 (CO-4167 default: S4-14) |

### 3.4 Deductions and disqualified members (4.407-4.407.61, 4.411)

| Paragraph | Disposition |
|---|---|
| 4.407.A (expenses covered by vendor payments or reimbursements not deductible) | FL: expense facts state out-of-pocket amounts |
| 4.407.B-C (averaging; weekly or biweekly expenses converted) | FL: monthly expense facts |
| 4.407.D, 4.407.5 (child support exclusion from gross before the gross test; averaging three months; estimate; not allowed unless verified) | C: CO-2002, CO-2003, CO-4333, CO-334, CO-1382 |
| 4.407.1 (standard deduction; 6+) | C: CO-370, CO-132 |
| 4.407.2.A-B (20%; work supplementation) | C: CO-372, CO-373 (B: no Colorado program, CO-373 precision) |
| 4.407.3.A (shelter over 50%; disqualified members' share) | C: CO-377, CO-379, CO-2300, CO-4931 |
| 4.407.3.B (cap unless elderly or disabled) | C: CO-379, CO-133 |
| 4.407.3.C (homeless shelter deduction) | C: CO-380, CO-037, CO-134 |
| 4.407.3.D (unoccupied home) | C: CO-1585 (claims_shelter_costs_for_unoccupied_home) |
| 4.407.3.E.1-5 (allowable shelter costs) | C: CO-4931, CO-1500 |
| 4.407.31.A-D (HCUA, BUA, OUA, telephone) | C: CO-1239, CO-1241, CO-1243 (sec. 10103; OQ-251), CO-1500, CO-1235 to CO-1238. Utility defaults: S4-14 |
| 4.407.4.A-D (dependent care) | C: CO-374, CO-2301, CO-1381 |
| 4.407.6.A-B (medical over $35 for elderly or disabled; attendant meals) | C: CO-376, CO-2895, CO-3740; OQ-641 |
| 4.407.61.A-C (SMED $165; actual over the SMED; one-time and averaged costs) | C: CO-376, CO-1514; OQ-353; averaging FL |
| 4.411.1.A-B.1 (IPV, work sanction, fleeing felon: in full, out of the size) | C: CO-2302, CO-333, CO-371, CO-2300, CO-2301, CO-4333, CO-4169 to CO-4171, CO-6001†, CO-4182† |
| 4.411.1.B.2.a-d (ineligible non-citizen, SSN, ABAWD: pro rata; SUA in full) | C: CO-2565, CO-333, CO-371, CO-2300, CO-2301, CO-4333; resources NA (holdings) |
| 4.411.2.A-C (non-household members; combined wages; ineligible students) | C: CO-3714, CO-3723; combined wages FL |
| 4.408-4.410 | NA (holdings, out of scope) |

### 3.5 Verification (4.500-4.507)

| Paragraph | Disposition |
|---|---|
| 4.500, 4.501 (household refusal to cooperate; prudent person) | C: CO-4267, CO-4680 |
| 4.502.A-B (verified at application; at recertification only if changed or outdated) | C: CO-1370 to CO-1386, CO-1388 to CO-1394, CO-1619†, CO-2321 to CO-2331 |
| 4.503, 4.504.1-4.504.61 (documentation; sources; verified upon receipt) | FL: the *_verified_by_electronic_data_source and document facts |
| 4.505.1-4.505.8 (identity, SSN, residency, composition, citizenship, non-citizen status, forty quarters, sponsorship, disqualified members) | C: CO-1370 to CO-1375, CO-1383, CO-3736, CO-3738, CO-1616, CO-4154, CO-4251, CO-1617 |
| 4.506 (income monthly before certification; $50 at recertification; continuing employment; self-employment unless questionable; educational income exempt; terminated employment; no income) | C: CO-1376†, CO-1377, CO-1619 (OQ-760). 4.506.D: S4-15 |
| 4.507.A-B (dependent care; shelter on the household's statement unless questionable) | C: CO-1379, CO-1381, CO-3739, CO-1618 |
| 4.507 medical, child support | C: CO-1380, CO-1382 |
| 273.2(f)(1)(xiv)(A) (ABAWD hours) | C: CO-1386† (D-S6). Hours default: S4-13 |

### 3.6 Federal cross-checks

| Text | Disposition |
|---|---|
| 273.1(b)(1)-(2), (c)(3)-(6) (mandatory members; elderly with a disability; boarders; foster care; roomers) | C: CO-305, CO-419, CO-304. Boarders' and roomers' payments: **S4-9**; foster: **S4-6** |
| 273.5 (students) | C: CO-410, CO-411 |
| 273.7(b) (work registration exemptions) | C: CO-405 |
| 273.9(b)(1)(i)-(vi) (earned income; WIA on-the-job training) | C: CO-5101 rows |
| 273.9(b)(2) (unearned; foster care payments for members) | C: CO-5010; **S4-6** |
| 273.9(c)(1)-(19) (exclusions) | C; (c)(10)(v) **S4-8**; (c)(11)(i) **S4-7**; (c)(15) **S4-6**; (c)(3) **S4-15** |
| 273.9(d)(1)-(6) (deductions) | C: section 3.4 |
| 273.10(c)(2) (conversion) | C; **S4-1** |
| 273.10(e)(1)(ii)(A) (rounding) | C: CO-334, CO-381 |
| 273.10(e)(2)(ii)(A)-(C), (a)(1)(ii) (allotment; minimum; $10) | C: CO-384, CO-2307, CO-385 |
| 273.11(a)-(c) (self-employment; costs; boarders; disqualified members) | C: section 3.3-3.4; S4-10 |
| 273.24 (ABAWD) | C: section 3.2 |

## 4. Open-question classification check

| OQ | Class in the volume | Check |
|---|---|---|
| OQ-1 (sec. 10108's date for current participants) | blocked on a named document | **Correct.** FNS's memoranda are on www.usda.gov; the redirect of fns.usda.gov to fna.usda.gov is recorded. |
| OQ-12 (ECE's TANF/MOE service) | state policy choice | **Correct.** 4.206.C.2.a.2 leaves the authorization to the forms. |
| OQ-30 (floor before the shelter share) | state policy choice | **Correct**, and it changes no outcome (F-21). |
| OQ-251 (sec. 10103's date) | blocked on a named document | **Correct.** |
| OQ-353 (SMED band $165-$200) | blocked on a named document | **Correct.** Colorado's SMED approval is not on an allowed host. |
| OQ-356 ("below" or "at or below" 200%) | state policy choice | **Correct.** Both words are Colorado's. |
| OQ-533 (Pub. L. 119-21 implementation dates) | blocked on a named document | **Correct.** |
| OQ-612 (temporary absence) | state policy choice | **Correct.** Neither 273.1 nor 4.304.32 sets a limit. |
| OQ-640 (BCE or ECE first) | state policy choice | **Correct.** |
| OQ-641 (medical expenses of a prorated member) | state policy choice | **Correct.** |
| OQ-760 (self-employment statement against 273.2(f)(1)(i)) | blocked on a named document | **Correct.** |
| OQ-835 (ABAWD living with a child: physical or SNAP household) | needs Legal | **Not one of the two classes** (S4-16). It is a Colorado text broader than the statute; the volume applies the federal text in like conflicts. |
| OQ-875 (foster child 18 or older applying apart) | needs Legal | **Not one of the two classes** (S4-16), as OQ-835. |
| OQ-996 (meals only, room only) | state policy choice | **Fails.** 7 CFR 273.1(c)(3)(ii), (c)(5) (D-7) and 273.9(b)(1)(ii) (D-13), on file, settle it: a meals-only payer is a boarder and a roomer's payment is self-employment income (S4-9). |
| OQ-1020 (special pay, meals-only and room-only payments as earnings) | state policy choice | **Fails for SNAP**, for the reason of OQ-996; the other programs' halves are for their reviewers. |
| OQ-1100 (the thirtieth day of postponement) | state policy choice | **Correct.** 4.205.11.B.2.b's two phrases do not settle the day. |
| OQ-1101 (annual_support, changed_substantially required) | state policy choice | **Correct.** Whether 4.403.12.A makes "no substantial change" the default is a reading the text leaves open. |
| OQ-1202 (holdings) | state policy choice | Out of scope (resources). |

## 5. Earlier P1s

Each was re-run on 7c56f14 through its stored household or rule test (all pass in `scripts/check.ts`) and, where it touches the records, re-read against the new items.

| ID | Result | Evidence |
|---|---|---|
| CF-1 to CF-12 (pass 1, financial) | hold (CF-12 recorded out of scope) | the "Probe CF-x" stored households pass; CF-3's conversion now per record (p17: $2,365 for two jobs); CF-5 (turning 18) CO-2569 per month |
| C2-1 to C2-4 (pass 2, financial) | hold | probe households C2-2 (resource, out of scope), C2-3 pass; C2-1 per record (CO-4324, CO-5113 siblings) |
| C2-5 (pass 2 P2, diversion ≤ 90 days) | **regressed**, reported as S4-5 | the lump-sum fact that carried the fix (CO-3367) was retired by the receipt migration |
| C3-1 (verification of earned receipts) | holds | CO-219; CO-1376 reads CO-4930 |
| C3-2 (recertification income) | holds | CO-220; CO-1619 reads CO-330 and CO-331 |
| C3-3 (other shelter charges verified) | holds | CO-221; CO-1379 reads CO-4931 |
| C3-4 (weekly unearned income converted) | holds for a stream; **dated receipts S4-1** | CO-222 (a stream) passes; the same money dated is multiplied (DW1) |
| C3-5 (held excluded payments) | out of scope (resources) | CO-223 passes |
| N3-1 (meal-plan student) | holds | CO-217 |
| N3-2 (deeming follows CO-310) | holds | ZZ-D1, ZZ-D4 |
| D-S3, D-S6 (duplicate paths, SNAP P1s) | hold | CO-2308-T7 to T9, CO-1386-T6 |

## 6. Notes for the fix round

- S4-1 to S4-4 are one design gap: what a record's date means for SNAP (a payment of a schedule, converted; placed on its regular date; bounded by its job's dates; after termination, not wages). A single change to the record fields' meanings plus one SNAP conversion reader closes them; CO-5011 and CO-4324 should then be registered siblings.
- S4-6 to S4-10 and S4-12 are rows or sums where the text on file settles the reading; S4-15 lists the rows where it may, for the owner's signature with the candidate paragraph shown.
- The repro households are in scratch4/p1.yaml to p19.yaml of the scratch copy; each states its base case, patch and month.
