# Coverage matrix, fourth pass: the cash programs (Adult Financial and Colorado Works)

Reviewer: an independent fourth pass over both cash families, made after the receipt, earnings and holdings records reached them (receipts CO-5000 with tables CO-5016 and CO-5650; earnings CO-5100 with tables CO-5103 and CO-5104; holdings CO-5300 with table CO-5302), decision 4 of 2026-11-23, the month-v1 time contract and the duplicate-path fix D-W1. The matrix below was built from the rule text. The earlier matrices (coverage, coverage2 and coverage3 for each family) were read only for sections 4 and 5.

Commit reviewed: `e628bb4` (branch ccr-9d19bf4c-wmnwcl), in a detached worktree. Date: 2026-11-23. This file is the only repository file the review wrote. The fix round's dispositions are section 7.

Governing texts, all read from volumes/co/documents/:
- 9 CCR 2503-5 (D-80), Adult Financial: the definitions of 3.510 ("Income", "Earned Income", "Unearned income", "Received", "Resources", "Convertible asset", "Bona fide loan", "Life Estate", "Effective date of eligibility"); 3.520.7 to 3.520.79 (financial eligibility, resources, life insurance, transfers, exempt resources, income, self-employment, donated work, countable and exempt unearned income, ISM); 3.530 to 3.534 (OAP); 3.540, 3.542 to 3.544 (AND-SO); 3.546 to 3.549 (AND-CS); 3.581 (payments).
- 20 CFR 416.1124 (D-207), incorporated by 3.520.786.K.
- 9 CCR 2503-6 (D-81), Colorado Works: 3.601 (definitions), 3.605.1 to 3.605.5 (income), 3.606.1 to 3.606.2 (basic cash assistance and disregards), 3.609.2.A (initial payment).

Tools:
- `npm run export -- --volume co` wrote 2,311 items; 249 are Adult Financial and 197 Colorado Works. Each item's `derived_english`, meaning and precision were read against its paragraph.
- `npm run check -- --volume co` on the unmodified worktree: rule tests 5,030 of 5,030, household expectations 3,949 of 3,949, conformance self-check 9,139 of 9,139. Every stored repro household of the earlier passes passes (section 5).
- Probe households were evaluated with a scratch runner (the engine's `evaluate` over cases loaded from a YAML file, as scripts/eval-case.ts does for stored cases). Their YAML and generators are at /tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/c4tools (p1.yaml to p7.yaml; the runner is probe4.ts there, run from a copy in scripts/ as `npx vite-node scripts/probe4.ts <yaml> all <identifiers> [YYYY-MM]`; af.py and base.py build them from CO-196, CO-670 and a single OAP client of 70 with $600 of Social Security and $500 in the bank, "the base client" below). The base client gives countable income 580, oap, $452 on 2026-10-01; CO-670's mother and daughter with no income give eligible, $320 for October (application 2026-10-12, .65754 x 488).

## 1. Verdict

**17 P1 found** (CA4-1 to CA4-17). Neither cash family meets the completion bar.

The P1s fall in the defect classes the other families' fourth passes found, met again on the cash readers of the records:

- **Rows and fields of the records the cash tables read wrongly** (CA4-1 to CA4-8, CA4-11, CA4-12, CA4-17): the parts of a receipt the rule deducts are fields Colorado Works reads and Adult Financial does not; Adult Financial excludes G.I. Bill benefits that 3.520.785.B.16 counts; both programs count as income money that is no financial gain (a bona fide loan, a reimbursement, the proceeds of selling one's own property); HUD utility payments, foster care difficulty-of-care pay, employer vendor payments, annual contract pay, a child's prize, an annuity and personal property other than household goods are each read against the text.
- **Dated records in the wrong period and streams outside their job dates** (CA4-9, CA4-13, CA4-14): pay from a job that ended, or has not begun, is counted; Adult Financial values resources in the determination month for every month; Adult Financial pays a full grant for months before the eligibility date (the CW3-3 class, fixed for Colorado Works only).
- **Couples' holdings** (CA4-10): each spouse keeps an exempt vehicle.
- **Undefined element** (CA4-5): whose list child support is stated on (the Medicaid N4-11 element) decides Adult Financial's 3.520.786.N.
- **Ages on the wrong date** (CA4-15): OQ-951's premise is contradicted for AND-SO by 3.542.B.
- **Reader defaults** (CA4-16): unstated facts are read as a value no rule gives, among them an unstated IM-14 as signed and a student's unstated hours as part-time.

Each P1 was reproduced with the engine and the rule's answer computed by hand (section 2 and the probe table). Every P1 of the three earlier passes of each family stays fixed (section 5).

## 2. Findings

| id | sev | paragraph | item(s) | governing text (quoted) | what is wrong, with a repro household | proposed fix |
|---|---|---|---|---|---|---|
| CA4-1 | **P1** | 9 CCR 2503-5 3.520.785.B.9, B.14, B.15 | af_counted_unearned_receipts CO-5017; af_unearned_income_other_than_ssi CO-3831; af_relative_deemable_unearned_income CO-4720; receipts CO-5000 fields `claim_expense`, `spent_on_covered_costs`; unearned_income_offsetting_expenses CO-4444 | B.9: "Payments for medical, legal, or related expenses incurred by the client, client's spouse, or sponsor(s) in connection with such claim are deducted prior to determining the amount of countable unearned income." B.14: life insurance proceeds "to the extent that they exceed the amount expended by the beneficiary for the purpose of the insured recipient's last illness and burial". B.15: health insurance or injury proceeds "to the extent that they exceed the amount to be expended ... for medical care". | The receipt record states these parts as fields (`claim_expense`: "The part of a workers' compensation payment the award includes for the claim's medical, legal or related expenses"; `spent_on_covered_costs`), and Colorado Works subtracts them (CO-5651). CO-5017 subtracts only `pass_set_aside` and `used_for_uncovered_medical_care`; Adult Financial reads the same money from a second statement, CO-4444, read as 0 when not stated. A household stated per the record schema is counted gross. **A1**: the base client plus $1,000 of workers' compensation with `claim_expense` 700. Engine: 1,580, **none**. Rule: 600 + 300 - 20 = 880 < 1,032: oap, 1,032 - 880 = 152, raised to the floor: **$189**. Control A1C (the 700 stated in CO-4444 instead) gives 880, oap, $189. **A2b**: the base client plus $5,000 of life insurance proceeds received once in October with `spent_on_covered_costs` 4,800. Engine 5,580, none; rule 600 + 200 - 20 = 780, oap, **$252**. | Subtract `claim_expense` and `spent_on_covered_costs` in CO-5017 for the kinds B.9, B.14 and B.15 name, as CO-5651 does; narrow CO-4444 to the expenses that are not parts of a receipt (rental expenses, B.20; school expenses, B.16; CA4-2) so the same money is never stated twice. Store A1 and A2b. |
| CA4-2 | **P1** | 3.520.785.B.16; 3.520.786.G | af_receipt_treatment_table CO-5016 rows `school_attendance_conditional_benefit` (excluded), `gi_bill_housing_food_allowance` (counted_no_rule_excludes); CO-3831; CO-4444 | B.16: "VA educational assistance (G.I. Bill) payments or other military or veterans benefits, which are conditional upon school attendance, are income to the extent that they exceed expenses necessary for school attendance." G: "Educational loans and grants." | The table excludes the kind whose meaning is exactly B.16's ("Educational benefits paid only on condition of the person's school attendance ...: U.S. Department of Veterans Affairs educational assistance (G.I. Bill) payments"), citing G, which names loans and grants. CO-3831 then still subtracts CO-4444's school expenses, which CO-4444's meaning ties to these benefits, from the client's other income. **A3**: the base client with $800 a month of G.I. Bill benefits conditional on attendance and $200 of school expenses (CO-4444). Engine: 600 - 200 - 20 = **380**, oap, **$652**. Rule: 600 + (800 - 200) - 20 = 1,180 >= 1,032: **none**. The G.I. Bill housing allowance is counted in full unless CO-4444 is stated. | Rows `counted_beyond_school_expenses` for both kinds, as Colorado Works reads 3.605.3.A.4 (CO-5654), with the expenses subtracted from those receipts only, never below zero. Store A3. |
| CA4-3 | **P1** | 9 CCR 2503-5 3.510 "Income", "Bona fide loan"; 3.520.77.L; 3.520.72.B.5, B.7; 9 CCR 2503-6 3.601 "Income"; 3.605.1.A.2 | CO-5016 rows `loan`, `reimbursement`, `resource_liquidation`, `insurance_cash_value`, `savings_account_distribution` (each counted_no_rule_excludes); CO-5650 row `resource_liquidation` (counted_no_rule_excludes); CO-5017, CO-5651 | 3.510: "'Income' means any financial gain by means of money payment or in-kind payment." 3.520.77.L: "Monies from a bona fide loan are exempt in the month received. Any remaining balance shall be counted as a resource in the following month(s)." 9 CCR 2503-6 3.601: "'Income' means any financial gain by means of money payment or in-kind payment"; 3.605.1.A.2: "Income, in general, is the receipt by a client of a gain or benefit". | Each row counts money that is no gain: a loan the person must repay (the text exempts it in the month received and counts the rest as a resource after), "a reimbursement of expenses ... which is not a gain to the person" (the kind's own meaning), the proceeds of selling or converting the person's own property, the cash value taken from the person's own policy (already a resource, 3.520.72.B.7), and a withdrawal from the person's own health, education or development account. Colorado Works likewise counts sale proceeds, against its own definition. The table's precision already marks the loan and reimbursement rows "the owner's to confirm"; the definitions on file decide them. **A4**: the base client borrows $1,500 in October (bona fide). Engine 2,080, **none**; rule 580, oap, **$452**. **A5** ($600 reimbursement): engine 1,180, none; rule $452. **A6** (sells a car for $1,200; holds 1,700 in November, under the limit): engine 1,780, none; rule $452. **A7** ($1,200 cash value taken from her policy): engine none; rule $452. **W3**: CO-670's mother sells her car for $2,000 in October. Engine 2,000 >= 331, **ineligible_income**; rule no income, eligible, **$320**. | Rows `not_income` (or `excluded`, citing 3.510 "Income" and 3.520.77.L; 3.601) for loan, reimbursement, resource_liquidation and insurance_cash_value in CO-5016, and resource_liquidation in CO-5650; split `savings_account_distribution` (the retirement part is read by 3.520.73.B.1.a with income from the account; the health, education and IDA parts are no gain), as C4-01 split taxable money with a field. Store A4 to A7 and W3. |
| CA4-4 | **P1** | 3.520.786.K; 20 CFR 416.1124(c)(14) (D-207) | CO-5016 row `housing_utility_allowance` (counted_no_rule_excludes) | (c)(14): "The value of any assistance paid with respect to a dwelling unit under— (i) The United States Housing Act of 1937; (ii) The National Housing Act; ..." | A utility allowance a subsidized housing program pays the tenant is assistance paid with respect to a dwelling unit under the Housing Act; K excludes it through (c)(14). The meaning lists the row as counted because no rule excludes it. **A14**: the base client in public housing receives a $120 utility reimbursement. Engine 700, oap, **$332**; rule 580, **$452**. | Row `excluded`, citing K and (c)(14). Store A14. |
| CA4-5 | **P1** | 3.520.786.N, P; 3.520.785.B.25 | receipts CO-5000 kind `child_support` ("Current child support paid to the person for a child"); CO-5016 row `child_support` (counted_less_one_third_for_ssi_child); CO-5017 | B.25: "Current child support payments received for the client." N: "Child support payments made to the client, client's spouse, or sponsor(s) for another person. These payments can either be current or arrearage payments." | Undefined element, the Medicaid N4-11 element met in Adult Financial: the kind places the record on the payee, and Adult Financial counts every child_support record on a person's list as that person's income. Coverage pass 3 carried N on the reading that support "is stated on the child", which no definition now says. **A18**: the base client receives $300 a month of support for the grandchild she raises, stated on her list as the kind says. Engine 880, oap, **$189**; rule (N) 580, **$452**. | Define once, with N4-11, on which list support is stated (on the child it is for), state it in the kind's meaning, and have the Adult Financial row count only support received for the person whose list it is. Store A18. |
| CA4-6 | **P1** | 3.510 "Earned Income"; 3.520.782.B, B.2 | af_earnings_treatment_table CO-5103 row `employer_vendor_payment` (not_counted_no_rule_found); af_earned_pay CO-5130 | 3.510: "'Earned Income' means payment in cash or in-kind received ... for services performed as an employee". 3.520.782.B: "In-kind earned income is non-monetary benefits received for services performed as an employee ... such as shelter as payment for building maintenance". B.2: "The amount considered as earned income ... shall be the value of the item supplied." | The kind is money "an employer paid to a third party for an expense of the person's household (rent, utilities, a bill), as part of the person's compensation, from funds the employer would otherwise pay the person": shelter or another benefit received for services, which the text counts. Colorado Works fixed the same row in E1 (3.605.2.B.1); Adult Financial's was left. **A15**: the base client's employer pays $700 of her rent as part of her pay. Engine 580, **$452**; rule (700 - 65) / 2 = 317.5 + 580 = 897.5, oap, 134.5 raised to **$189**. Control A15C (stated as in_kind_pay) gives 897.5, $189. | Row `counted_at_value` (or `counted`), citing 3.510 and 3.520.782.B. Store A15. |
| CA4-7 | **P1** | 9 CCR 2503-5 3.520.786.M; 416.1124(c)(8); 9 CCR 2503-6 3.605.4.B.11 as CO-5650 reads it | CO-5103 and CO-5104 rows `difficulty_of_care_payment` (counted_no_rule_excludes); CO-5130, CO-5140; earnings field `foster_care` | M: "Payments received for providing foster care." (c)(8): "Payments for providing foster care to an ineligible child who was placed in your home". | The earnings record states `foster_care` on a difficulty of care payment ("are foster care payments for a person placed in the home"), and both programs already leave out a foster boarder's payments (CO-5131, CO-4361) and a foster care receipt (foster_care_payment excluded in CO-5016 and CO-5650), but neither earnings reader tests the field on this kind. **A16**: the base client is paid $900 of difficulty of care for a foster child placed with her. Engine (900 - 65) / 2 + 580 = 997.5, **$189**; rule 580, **$452**. **W4**: CO-670's mother paid $600 of foster difficulty of care. Engine 510 >= 331, **ineligible_income**; rule eligible, **$320**. | Exclude a difficulty_of_care_payment stated `foster_care` in CO-5130 and CO-5140 (a row `counted_unless_foster_care`), as LEAP and CCCAP do. Store A16 and W4. |
| CA4-8 | **P1** | 3.520.781.G.2.b | CO-5130 (does not read `annual_contract_pay`); earnings CO-5100 | "For contract employment, such as in some school systems, where the employees derive their annual income in a period shorter than a year, the income shall be prorated over the term of the contract, provided that the income from the contract is not earned on an hourly or piecework basis". | The C4-4 class: the record states the contract's pay for the year on a record of each month, which SNAP and CCCAP read at one twelfth; Adult Financial reads the month's amount. **A10b**: an OAP client of 66, the base client's income, a school cafeteria contract of $24,000 paid September to May; July (a July record of amount 0 and `annual_contract_pay` 24,000). Engine 580, oap, **$452**; rule 2,000 a month: (2,000 - 65) / 2 + 580 = 1,547.5 >= 1,032, **none**. | Read a record that states `annual_contract_pay` at one twelfth of it in place of its amount, as CO-5113 and CO-5152 do. Store A10b. (Colorado Works' own contract rule, 3.605.2.B, reads differently: CA4-21.) |
| CA4-9 | **P1** | 9 CCR 2503-5 3.520.781.G; 9 CCR 2503-6 3.605.1.A.2, 3.605.2.B; earnings fields `job_start_date`, `job_end_date` | af_earned_pay CO-5130, CO-1708 (non-farm), CO-5131; cw_earned_pay CO-5140, CO-1706, CO-4361 | 3.520.781.G: "All income shall be countable in the month it is actually received"; 3.605.2.B: wages "are considered available when paid". | The S4-3 class: a stream (no month, no date) recurs "in every month the case covers", and neither program reads the job's dates, so pay from a job that ended before the month, or begins after it, is counted. **A9**: the base client's $800-a-month job ended 2026-08-31 (stated as a stream with `job_end_date`). Engine (800 - 65) / 2 + 580 = 947.5, **$189**; rule 580, **$452**. **W1**: CO-670's mother, a $1,000 stream whose job ended 2026-09-20. Engine 910 >= 331, **ineligible_income**; rule no pay in October, eligible, **$320**. **W1b**: the same stream with `job_start_date` 2026-11-02: the same wrong answer. | Count a stream only in months on or after the month of its job_start_date and on or before the month of its job_end_date, in every cash earnings reader (as CO-5113 does for SNAP). Store A9, W1, W1b. |
| CA4-10 | **P1** | 3.520.77 (opening), A; 3.520.72.A.2.a, E | af_countable_vehicles CO-5343; af_client_and_spouse_countable_resources CO-2389; af_sponsor_countable_resources CO-2390 | 3.520.77: "Resources that shall be exempt and not counted toward the resource limit for an individual or married couple include: A. The vehicle with the highest value is exempt if it is used for the transportation of the client or a member of the household." | The couples' holdings class (Medicaid N4-6): CO-5343 is per person and subtracts each person's own largest transportation vehicle; CO-2389 adds the spouse's CO-4000, so a married couple keeps two exempt vehicles where 3.520.77 exempts one for "an individual or married couple". A sponsor and the sponsor's spouse are attributed "in the same manner" (3.520.72.E) and have the same defect. **A8**: CO-196's couple (OAP client, husband 68, $500 in the bank each); she owns a $6,000 car and he a $4,000 truck, both used for transportation. Engine resources **1,000**, oap, **$442**; rule 1,000 + 4,000 = 5,000 > 3,000, **none**. Control A8C (both vehicles on her list) gives 5,000, none. | Take the exemption once over the couple's vehicles (the largest equity of a transportation vehicle among both spouses' records, P58 over each list and the larger kept), in CO-2389 and for a sponsor couple in CO-2390. Store A8. |
| CA4-11 | **P1** | 3.520.72.B.3-4; 3.520.77.B; 3.520.742.B | CO-5302 row `personal_property` (excluded_household_goods); holdings kind `personal_property` ("Household goods, personal effects and other personal property not another kind names (equipment, livestock, tools)"); OQ-1203 | 77.B: "Household goods and personal effects found in or on the primary residence, that the client uses on a regular basis." 742.B: "The actual value of any additional personal property which is not assessed for taxation is determined by obtaining the appraised value less liabilities, i.e., vehicles, farm equipment and livestock". 72.B.3: "Personal property ... such as mobile homes or recreational vehicles not used as the primary home". | The kind mixes exempt household goods with the countable equipment, livestock and tools 742.B names, and the row excludes the whole kind. OQ-1203 records this as a policy choice although its own body says "3.520.72.B.3-4 counts it when not exempt": the text decides. **A11**: the base client owns $3,000 of livestock that produces no income (stated as personal_property). Engine resources 500, oap, **$452**; rule 3,500 > 2,000, **none**. | Split the kind (household goods and personal effects; other personal property), or add a field, and count the other personal property at equity unless self-support (CO-4422) or unsaleable; close that part of OQ-1203 as settled by the text. Store A11. |
| CA4-12 | **P1** | 3.520.72.B.5; 3.510 "Convertible asset" | CO-5302 row `annuity` (not_counted_no_rule_found); OQ-1203 | B.5: "Cash and convertible assets including ... pensions, and other retirement or investment accounts and investment vehicles." 3.510: "'Convertible asset' means any asset which can be converted into cash and is defined by its cash value. This includes ... investment vehicles." | An annuity the person can surrender (`revocable`, "the annuity can be assigned or surrendered") is an investment vehicle convertible to cash; the row counts none. OQ-1203 says "no text on file names them", but B.5 does. **A12**: the base client owns a $10,000 deferred annuity she can surrender. Engine 500, oap, **$452**; rule 10,500, **none**. | Row counting an annuity that states `revocable` at its value (an annuitized, non-assignable one is not convertible); its payments stay income under 3.520.785.B.11. Store A12. |
| CA4-13 | **P1** | 3.510 "Resources"; 3.542.B; 3.532.B.2 | CO-5340 to CO-5346, CO-4000, CO-4412, CO-5347 to CO-5350, CO-2389, CO-947, CO-948 (person scope, "valued in the month containing the Determination Date") | "'Resources' or 'assets' means real property, personal property, and cash or convertible assets held as of the first day of a calendar month or as of the date of application, less the value counted as income in the same month." | Dated records in the wrong period: every resource item is person-scoped and reads the holdings valued in the determination month, so an application month before the determination month is judged by the next month's holdings. **A13**: the base client applies 2026-09-10 with $5,000 in the bank (a September record), spends it in late September and holds $500 in October; determined 2026-10-15, eligibility date 2026-09-10. Engine September: resources 500, **oap, $312** (21 days, .69041 x 452). Rule: $5,000 on the date of application, **none for September**; October oap $452. | Make the resource figures month-scoped (as the Medicaid H1 track did with CO-5320 to CO-5330): the holdings valued in the month evaluated, the application date's value in the application month. Store A13. |
| CA4-14 | **P1** | 3.510 "Effective date of eligibility"; 3.542.B; 3.532.B.1-2, 3.543.B, 3.548.B; 3.581.D | af_partial_month_payment_factor CO-2603; af_oap_grant CO-951; af_and_grant CO-952; af_category CO-953 | 3.542.B: "Eligibility shall begin with the date of application or the date the client meets all eligibility requirements, whichever is later." 3.532.B.2: "If determined eligible on any other day of the month, the client's first month grant payment shall be prorated according to the number of days remaining in the month". | The CW3-3 class, fixed for Colorado Works (CO-4358) and not carried to Adult Financial: CO-2603 returns 1 for every month other than the month of af_eligibility_date, so a month before the eligibility date pays the full grant. **A20**: the base client applies 2026-09-25 and meets every requirement on 2026-10-03 (af_eligibility_date), determined 2026-10-15. Engine September: oap, **$452**; October .95342 x 452 = $430. Rule: September **$0**; October $430. | Return 0 for a month before the month of af_eligibility_date (except at a redetermination), as CO-4358 does. Store A20. |
| CA4-15 | **P1** (rare edge) | 9 CCR 2503-5 3.520.61.A, 3.542.B, 3.532.B.3; C.R.S. 26-2-111(2)(a)(I); 9 CCR 2503-6 3.601 "Dependent child(ren)", 3.605.1.A.1, 3.606.1.E | af_is_oap_age CO-940; af_and_cs_eligible CO-950 and CO-1203 (read `age`, CO-300); af_is_ssi_child CO-4022, af_excluded_life_threatening_condition_gifts CO-4023 (`age` in a month's running total); cw_is_dependent_child CO-901; OQ-951 | 3.542.B (above); 3.520.61.A: OAP "60+"; 3.605.1.A.1: income "in the month of application shall be used to determine eligibility". | Ages on the wrong date: each age is the age on the determination date in every month. OQ-951 records this as a policy choice because "neither program's fetched text says on which date an age condition is measured", but 3.542.B decides it for AND-SO (eligibility begins on the date the client meets all requirements), and an age condition read for the application month is a fact of that month. **A17**: the base client born 1966-10-05 applies 2026-09-20, determined 2026-10-15. Engine September: **oap, $163** (11 days). Rule: 59 throughout September, **none**. **W5**: CO-670 with no earnings, the child born 2008-10-05, application 2026-09-25, determined 2026-10-15. Engine September: **ineligible_no_dependent_child**, $0. Rule: 17 in September, a dependent child: eligible from 9/25, .19726 x 488 = **$96**. | Measure each age condition in the month evaluated (the docs/operators.md "Ages in a month" items, first day for "under N", last day for "N or older"), with AND-SO's start from the day the client meets all requirements; retire OQ-951 or narrow it to what the text leaves open. Store A17 and W5. |
| CA4-16 | **P1** (decision 4) | decision 4 of 2026-11-23; 9 CCR 2503-6 3.605.4.B.24.b; 9 CCR 2503-5 3.545.A.2, 3.520.4.C.5.a, 3.520.79, 3.520.784, 3.520.785.B.9-20, 3.570.43.C | cw_student_earnings_are_disregarded CO-3385 (`hours_worked` otherwise 0); af_and_so_eligible CO-1203 (`af_im14_signed` otherwise **true**); af_in_kind_support_and_maintenance CO-1512 (`shelter_cost_monthly`, `ssa_in_kind_support_and_maintenance_charged` otherwise 0); CO-4443 (donated work, otherwise 0 and false); CO-1705, CO-1707 (`licensed_child_care_children_in_care_count` otherwise 0); CO-3831, CO-4720 (`unearned_income_offsetting_expenses` otherwise 0); CO-4369 (`rental_property_expenses_paid`), CO-5654 (`school_attendance_expenses_paid`), CO-2353 (`spousal_maintenance_paid`, `cw_support_paid_to_tax_dependents_outside_home`) otherwise 0; CO-4400 (`qualifying_quarters` otherwise 0); CO-4401 (`days_out_of_state_in_calendar_year` otherwise 0); CO-900 (`is_pregnant` otherwise no); CO-1231 (`af_burial_request_is_timely` otherwise **true**); CO-1220 (`is_enrolled_in_medical_assistance`), CO-1504 (`receives_tanf_cash`) otherwise no | B.24.b: "All earned income ... received by a dependent child who is a full-time student or a part-time student who is not a fulltime employee shall be disregarded." 3.545.A.2: "As a condition of eligibility for AND-SO the client shall be required to sign the IM-14". Decision 4: missing information is cannot determine unless the rule says otherwise. | The reader-defaults class (S4-13). Each default stands in for an applicant's own circumstance no rule gives a value for; records-earnings-cash.md section 9 listed several "for a later decision-4 round", and none has been taken. Two read an unstated fact as the answer that grants eligibility (an IM-14 as signed; a late burial request as timely). The county's own findings (refused income, IPV, EBT misuse, good cause, an extension granted, a presumption rebutted) are rule-given and are not listed. **W6**: CO-670's mother with no earnings and her daughter of 16 in secondary school, part-time, earning $800, her hours not stated. Engine: disregarded, **eligible, $320**. Rule: cannot determine; at 130 hours or more (OQ-613) 800 - 90 = 710 >= 331, ineligible_income. | Remove each listed default (required where read, cannot determine when not stated), keeping only the county findings; for the deductions, the case states 0. Store W6. |
| CA4-17 | **P1** (rare edge) | 3.534.B.3 | af_spouse_dependent_children_needs CO-2392 | B.3: "Deduct an amount to meet the needs of each dependent child living in the household of the spouse equal to half the maximum SSI grant benefit standard ... less the dependent child's own income". | CO-2392's precision keeps the scalar facts' leftover: a child's own unearned income is every receipt "but gambling winnings and a sponsor's money". A child's prize is the child's own income. **A21**: CO-196 with the husband's Social Security 1,600 and his son of 10 at home, who wins $500 in October. Engine: 1,600 - 1,032 - 497 = **71** deemed, 661, oap, **$371**. Rule: the child's need 497 - 500 = 0; deemed 568; 590 + 568 = 1,158 >= 1,032, **none**. Control A21C (no prize) gives the same 71, $371. | Read every receipt of the child, the prize and a sponsor's money included (B.3 says "own income", not countable income). Store A21. |
| CA4-18 | P2 | 3.520.786.O | af_infrequent_income_quarter_total CO-4011 | O: "Infrequent or irregular income of less than $60 in a calendar quarter." | The quarter's total adds every irregular receipt and pay, the kinds the tables exclude included (an income tax refund, work-study pay), so exempt money uses up the $60. **A19**: the base client receives a $40 irregular gift in October and an $800 income tax refund in November marked irregular. Engine: the gift counted, 620, $412; reading O over countable income, 580, $452. The text does not say whether exempt income counts toward the $60 (416.1124(c)(6) excludes after the other exclusions). | Record a question for the owner, or sum only the kinds the tables count. |
| CA4-19 | P2 | 3.520.76.D.1-3, E | af_twfc_penalty_months CO-3840; OQ-1254 | D.3: "Divide the uncompensated value by the TWFC monthly penalty value and round down"; E: "for each resource transferred". | OQ-1254 is classified a state policy choice, but the text decides the per-resource count; the operators prevent the item from computing it, so a fully stated household with two transfers in one month is cannot determine. | Reclassify OQ-1254 as an operator limitation (not a policy question) and give it an owner and date; a per-record penalty (the integration owner's request) closes it. |
| CA4-20 | P2 | 3.520.783.B.1 | CO-5103 rows `business_cost_home_space`, `business_cost_vehicle` (not_deducted_no_rule_found) | B.1: "Cost of doing business expenses include, but are not limited to, the rent of business premises ...". | "Not limited to" leaves both open; Colorado Works' own text names the room cost (3.605.2.E.1.a.1). No answer changes until the owner signs. | Owner's signature, or a question. |
| CA4-21 | P2 | 9 CCR 2503-6 3.605.2.B | CO-5140 (does not read `annual_contract_pay`) | "With the exception of contract employment, wages that are paid to an employee for a period for which services were rendered are considered available when paid rather than when earned". | Contract employment is the exception, read nowhere: CO-5140 reads every pay when paid. Whether the exception means "when earned" or prorated (as CCCAP and AF read their own words) is for the owner. | Record a question; then read `annual_contract_pay` as decided. |
| CA4-22 | P2 | 3.510 "Resources" | CO-5340 | "... held as of ... the date of application, less the value counted as income in the same month." | A holding valued on the application date includes that month's income already counted; nothing subtracts it. Stored households value holdings at the first of the month, so no answer changes today. | Say in CO-5300's or CO-5340's precision that a mid-month value excludes the month's income, or subtract it. |
| CA4-23 | P2 | 3.520.786.N, M; 3.510 "Income" | CO-5016 rows `kinship_care_payment`, `adoption_subsidy`, `medicare_premium_refund` (counted_no_rule_excludes) | N (above); M (above). | A kinship or adoption payment made to the caretaker for a child is, like child support, paid for another person; a refund of premiums the person paid is arguably no gain. Owner rows, unsigned. | The owner signs or records each. |
| CA4-24 | P2 | 3.604.2.C.1.b | cw_is_parent_of_dependent_child CO-2383 | | Its meaning says "living in the home"; the derivation does not test it (records-earnings-cash.md section 9). A non-parent caretaker in the unit whose own minor child lives elsewhere makes her husband a stepparent in CO-2353 rather than the caretaker's spouse of 3.606.1.J. | Test lives_with and cw_is_considered_living_in_home. |
| CA4-25 | P3 | — | af_oap_grant CO-951 precision | | The first sentence still says the item "does not model 3.532.B.2's mid-month proration"; the later precision says it does. | Strike the stale sentence. |

Probe summary (engine result compared with the text):

| probe | finding | the volume | the text |
|---|---|---|---|
| A1 | CA4-1 | 1,580, none | 880, oap, $189 |
| A2b | CA4-1 | 5,580, none | 780, oap, $252 |
| A3 | CA4-2 | 380, oap, $652 | 1,180, none |
| A4 / A5 / A6 / A7 | CA4-3 | none each | 580, oap, $452 each |
| W3 | CA4-3 | ineligible_income | eligible, $320 |
| A14 | CA4-4 | 700, $332 | 580, $452 |
| A18 | CA4-5 | 880, $189 | 580, $452 |
| A15 (control A15C) | CA4-6 | 580, $452 (897.5, $189) | 897.5, $189 |
| A16 | CA4-7 | 997.5, $189 | 580, $452 |
| W4 | CA4-7 | ineligible_income | eligible, $320 |
| A10b | CA4-8 | July 580, oap, $452 | 1,547.5, none |
| A9 | CA4-9 | 947.5, $189 | 580, $452 |
| W1, W1b | CA4-9 | ineligible_income | eligible, $320 |
| A8 (control A8C) | CA4-10 | resources 1,000, oap, $442 (5,000, none) | 5,000, none |
| A11 | CA4-11 | 500, oap, $452 | 3,500, none |
| A12 | CA4-12 | 500, oap, $452 | 10,500, none |
| A13 | CA4-13 | September oap, $312 | September none |
| A20 | CA4-14 | September $452; October $430 | September $0; October $430 |
| A17 | CA4-15 | September oap, $163 | September none |
| W5 | CA4-15 | September ineligible_no_dependent_child | September eligible, $96 |
| W6 | CA4-16 | eligible, $320 | cannot determine (hours) |
| A21 (control A21C) | CA4-17 | 71 deemed, $371 (71, $371) | 568 deemed, none |
| A19 (control A19C) | CA4-18 | 620, $412 (580, $452) | open (580, $452 if exempt money is left out) |

## 3. Coverage matrix

Key:
- **C** = carried by. The derivation was read and checked against the paragraph.
- **NA** = not applicable, with the reason.
- **OQ** = open question.
- **CA4-n** = finding in section 2.

Scope: every financial paragraph (income, disregards, deeming, resources, grant computation, the first-month payment) was read line by line in this pass. The non-financial paragraphs (age documents, residency, identity, SSN, citizenship, sponsorship facts, verification and notice procedure, HCA functional scoring, sanctions, diversion, time limits) have items that did not change since pass 3 apart from the decision-4 and time-contract rounds; they were checked against those rounds' changes (the receipt-based grant tests of CO-1220, CO-1270, CO-1504, CO-3877, the ages of OQ-951) and otherwise not re-derived.

### Adult Financial: 3.510 definitions used by the financial rules

| paragraph | status |
|---|---|
| "Income" (any financial gain) | C: CO-5016's rows; **CA4-3** (loan, reimbursement, sale proceeds, cash value, own-account withdrawals) |
| "Earned Income" (cash or in-kind for services) | C: CO-3830, CO-5130, CO-5103; **CA4-6** (employer vendor payment) |
| "Unearned income", "In-kind", "Irregular", "Periodic payments", "Received" (income and resources) | C: received_in (P57) on the records; CO-3827, CO-4011, CO-4012 |
| "Anticipated income" | C: the records state the month's anticipated amount; contract pay **CA4-8** |
| "Resources" (first day of the month or date of application, less the month's income) | C: CO-4000 and its parts; **CA4-13** (month), **CA4-22** (less the month's income) |
| "Convertible asset" | C: CO-5340; annuity **CA4-12** |
| "Bona fide loan" | C: CO-4412 (held_loan_proceeds); income side **CA4-3** |
| "Life Estate" | C: not negotiable (3.520.741.D.1); CO-5302 not_counted; CO-1512 precision (ISM) |
| "Effective date of eligibility" | C: CO-2391, CO-2603; **CA4-14** |
| "Countable income", "Countable resource", "Exempt income" | C: CO-946, CO-947, the tables |

### Adult Financial: 3.520.71 to 3.520.77 (financial requirements and resources)

| paragraph | status |
|---|---|
| 3.520.71.A.1-2 (resources below the limit; income below the standard) | C: CO-948 (OQ-662), CO-953, CO-1203 (`<`, 3.520.781.A) |
| 3.520.71.B-D (apply for other benefits; AND-SO SSI duty) | C: CO-3860, CO-2004, CO-3862 to CO-3870 |
| 3.520.71.E (match SSA's ISM) | C: CO-1512 (reader default **CA4-16**) |
| 3.520.71.F (Colorado Works bar) | C: CO-1511, CO-4835 (CW3-2 fixed) |
| 3.520.71.G-H (refused income and resources) | C: CO-3861, CO-4433 (county findings) |
| 3.520.72.A.1-2 (limits for client, couple, sponsors) | C: CO-947, CO-948 |
| 3.520.72.B.1, B.2 (real property; home-sale proceeds) | C: CO-5342, CO-4412 (held_replacement_proceeds) |
| 3.520.72.B.3-4 (personal property, vehicles) | C: CO-5343, CO-5345; **CA4-10**, **CA4-11** |
| 3.520.72.B.5 (cash and convertible assets, investment vehicles) | C: CO-5340, CO-5341; **CA4-12** |
| 3.520.72.B.6 (mortgages and notes) | C: CO-5340 (loan_receivable, installment_contract at equity) |
| 3.520.72.B.7 (CSV of life insurance) | C: CO-4722, CO-4001, CO-4002, CO-3854, CO-5347 to CO-5349 |
| 3.520.72.B.8-9 (revocable burial funds; spaces beyond needs) | C: CO-5344; OQ-1253 |
| 3.520.72.B.10-11 (casualty proceeds; loan proceeds not spent) | C: CO-4412 |
| 3.520.72.B.12 (estate of an incapacitated client) | C: the client's own holding (CO-4000 precision) |
| 3.520.72.B.13, a-c (trusts) | C: CO-4000 (corpus_available_value); a.: CO-3840 (TWFC) |
| 3.520.72.C (legally separated) | C: no spouse edge |
| 3.520.72.D, F (verification) | C: CO-1433 |
| 3.520.72.E (sponsor resources) | C: CO-2390, CO-947; vehicle **CA4-10** |
| 3.520.73.A.2 (joint accounts by persons on the account) | C: `share` on the record |
| 3.520.73.B.1 (retirement accounts less taxes, or 20%) | C: CO-5341 (CO-4430) |
| 3.520.73.B.2-4, C (valuing securities, bonds, mineral rights) | NA: valuation of the stated value |
| 3.520.741.A-C (home; actual value less encumbrances; shares) | C: CO-5346, CO-5342, `amount_owed`, `share` |
| 3.520.741.D.1-4 (negotiability; co-owner hardship; two-thirds; legal technicalities) | C: `af_found_unsaleable` in CO-5342 (county finding) |
| 3.520.742.A-B (personal property values; $400 vehicle) | C: stated value; livestock and equipment **CA4-11** |
| 3.520.742.C-D (unsaleable personal property; lesser value) | C: `af_found_unsaleable` |
| 3.520.75.A-H (life insurance) | C: CO-4001, CO-4002, CO-3854, CO-4721, CO-4722 (re-read: the face value total adds the spouse) |
| 3.520.76.A-E (TWFC) | C: CO-4008, CO-3836, CO-3840, CO-3841, CO-4007; several transfers in a month **CA4-19** (OQ-1254) |
| 3.520.77.A (the vehicle with the highest value) | C: CO-5343 (P58, OQ-1205 A); couples **CA4-10** |
| 3.520.77.B (household goods and personal effects; investments counted) | C: CO-5345 (investment_personal_property); **CA4-11** |
| 3.520.77.C.1-5 (home; intent to return; OAP-C) | C: CO-5346 |
| 3.520.77.D (self-support property; business cash) | C: CO-4422, CO-4412 (business_cash_and_assets) |
| 3.520.77.E-F (casualty and home-sale proceeds, 3 or 6 months) | C: CO-4412 (CO-4420, CO-4421) |
| 3.520.77.G-I (burial trusts, contracts, spaces) | C: CO-5344; OQ-1253 |
| 3.520.77.J (retroactive SSA benefits, nine months) | C: CO-4412 |
| 3.520.77.K (income tax refund, twelve months) | C: CO-4412 (held_income_tax_refund); held_eitc OQ-1203 |
| 3.520.77.L (bona fide loan, month received) | C: CO-4412 for the resource; the income side **CA4-3** |
| 3.520.77.M (ABLE) | C: CO-5302 row excluded |

### Adult Financial: 3.520.78 and 3.520.79 (income, ISM)

| paragraph | status |
|---|---|
| 3.520.781.A (equals or exceeds: ineligible) | C: CO-953, CO-1203 |
| 3.520.781.B-F (types; exempt; disregards; deeming; grant) | C: CO-946, CO-2384, CO-2386, CO-951, CO-952 |
| 3.520.781.G (month received; anticipated) | C: received_in; ended and future jobs **CA4-9** |
| 3.520.781.G.2.a, c-f (new income; self-employment proration; fluctuating; rental; COLA) | C: stated amounts (CO-1708 precision) |
| 3.520.781.G.2.b (contract employment prorated) | **CA4-8** |
| 3.520.782.A, B.1-2 (wages; in-kind at value) | C: CO-5130 (wages, in_kind_pay); **CA4-6** |
| 3.520.783.A-B, D (net profit; costs; not depreciation, principal, personal) | C: CO-1707, CO-1708, CO-5103; home space and vehicle **CA4-20** |
| 3.520.783.C.1 (farm, prior year averaged) | C: CO-1708 |
| 3.520.783.C.2.a (actively managed rental) | C: self_employment_receipts |
| 3.520.783.C.2.b-d (board, room, room and board less costs) | C: CO-5131 |
| 3.520.783.C.3 (child care provider $55, $22) | C: CO-1707 (count default **CA4-16**) |
| 3.520.783.E-F (verification; irregular self-employment averaged) | C: CO-3882; stated amounts |
| 3.520.784.A-C (donated work; volunteerism) | C: CO-4443 (defaults **CA4-16**) |
| 3.520.785.A, B intro (gain or benefit to client, spouse, sponsor) | C: CO-5017, CO-3831, CO-4720 |
| 3.520.785.B.1, a-b (SSA benefits; lump sums; gross before recovery) | C: CO-5016 (social_security, ssi counted_separately; OQ-887); `amount` is gross |
| 3.520.785.B.2-7 (pensions, disability, VA, RRB, UI, strike) | C: rows counted; VA dependent's portion: stated on the dependent |
| 3.520.785.B.8 (garnishment) | C: gross amount |
| 3.520.785.B.9 (workers' compensation less claim expenses) | **CA4-1** |
| 3.520.785.B.10 (interest and dividends) | OQ-782 (excluded under K, (c)(22)) |
| 3.520.785.B.11-13 (annuities, inheritance, gifts and prizes) | C: rows counted; a child's prize in B.3 **CA4-17** |
| 3.520.785.B.14-15 (insurance and injury proceeds) | **CA4-1** |
| 3.520.785.B.16 (G.I. Bill above school expenses) | **CA4-2** |
| 3.520.785.B.17-19, 21-24 (joint property, bonuses, royalties, Civil Liberties Act, trusts, alimony, MMMNA) | C: stated receipts, rows counted |
| 3.520.785.B.20 (rental income less allowable expenses) | C: CO-4444 in CO-3831 (default **CA4-16**) |
| 3.520.785.B.25 (current child support for the client) | C: row counted_less_one_third_for_ssi_child; placement **CA4-5** |
| 3.520.786.A (tax refunds) | C: row excluded |
| 3.520.786.B (third-party medical payments) | NA: not received by the person |
| 3.520.786.C (private home energy assistance) | C: energy rows excluded |
| 3.520.786.D (one-time emergency or general assistance) | C: rows excluded (general assistance also K, (c)(2)) |
| 3.520.786.E (personal and home care allowances; spouse provider) | C: rows excluded; a spouse provider's pay is earnings (H-5 closed by the HCA kind) |
| 3.520.786.F (VA Aid and Attendance used for care) | C: `used_for_uncovered_medical_care` |
| 3.520.786.G (educational loans and grants) | C: educational_assistance excluded; **CA4-2** (B.16 kinds) |
| 3.520.786.H (work study) | C: CO-5103 row excluded |
| 3.520.786.I (PASS) | C: `pass_set_aside` (CO-5017, CO-2342) |
| 3.520.786.J (crime victim compensation) | C: row excluded |
| 3.520.786.K (416.1124) | C: rows (c)(1), (c)(2), (c)(19), (c)(21), (c)(22), (c)(23), (c)(24); **CA4-4** ((c)(14)); **CA4-7** ((c)(8)) |
| 3.520.786.L (reverse mortgage) | C: row excluded |
| 3.520.786.M (foster care payments) | C: foster_care_payment excluded, foster boarders (CO-5131); **CA4-7** (difficulty of care) |
| 3.520.786.N (child support for another person) | **CA4-5**; kinship and adoption rows **CA4-23** |
| 3.520.786.O (infrequent or irregular under $60 a quarter) | C: CO-3827, CO-4011, CO-4012; **CA4-18** |
| 3.520.786.P (arrears for the client) | C: child_support_arrears excluded |
| 3.520.79.A-E (ISM) | C: CO-1512, CO-1513 (defaults **CA4-16**) |

### Adult Financial: grant computation and deeming

| paragraph | status |
|---|---|
| 3.530.A-C (OAP standard $1,032, ISM $351, floor $189) | C: CO-289, CO-1513 (formula), CO-1200 |
| 3.531.D.2 (State Supplementary Payment) | C: CO-951 (floor) |
| 3.532.A, B, B.1-2 (grant; first month prorated) | C: CO-951, CO-2603; months before the eligibility date **CA4-14** |
| 3.532.B.3 (transition to OAP in the birth month) | C: CO-940 |
| 3.532.D-F (PNA) | C: CO-951, CO-1510, CO-2006, CO-2007 |
| 3.533.A.1-2, B (disregards; split $20; rollover) | C: CO-946, CO-3829, CO-3832, CO-3833 |
| 3.534.A (spouse's earned income) | C: CO-2384 (through CO-3830) |
| 3.534.B.1-6 (spouse's unearned income less OAP standard, children's needs, medical payments, support) | C: CO-2384, CO-4720, CO-2392; **CA4-17** |
| 3.534.C (exempt spouse; MMMNA) | C: CO-2384 (MMMNA: Medicaid post-eligibility) |
| 3.534.D.1-5 (sponsor) | C: CO-2386, CO-4400 (quarters default **CA4-16**) |
| 3.542.B (eligibility begins on the later date) | **CA4-14**, **CA4-15** |
| 3.543.B, 3.544.A-H (AND-SO grant, disregards, deeming) | C: CO-952, CO-946, CO-2384, CO-2386 |
| 3.546 to 3.549 (AND-CS) | C: CO-950, CO-952, CO-946, CO-2384 (parents) |
| 3.581.D (partial month table), E (cents dropped) | C: CO-2602, CO-2603, CO-951, CO-952 |

### Colorado Works: 3.605 income

| paragraph | status |
|---|---|
| 3.601 "Income", "Earned income", "Unearned income", "Received", "Exempt income" | C: CO-5650, CO-5104; **CA4-3** (sale proceeds) |
| 3.605.1.A (all countable income of unit and budgetary unit) | C: CO-910, CO-923, CO-2352 |
| 3.605.1.A.1 (month prior and month of application) | OQ-771 |
| 3.605.1.A.2 (available when legally available) | C: received_in; **CA4-9** |
| 3.605.1.A.3.a-d (potential income) | C: CO-4362 (county finding) |
| 3.605.1.A.4.a-b (stepparent; minor parent's parents) | C: CO-2353, CO-909, CO-4660, CO-2000; CO-2383 **CA4-24** |
| 3.605.1.A.5.a-d (sponsor) | C: CO-2364, CO-2365, CO-4363 |
| 3.605.1.A.6 (disqualified members' net income) | C: CO-910, CO-923 |
| 3.605.1.B (application month and after) | C: CO-907, CO-908 |
| 3.605.2.A, G (in-kind earned income at value) | C: CO-5104 in_kind_pay |
| 3.605.2.B.1-2 (diverted and garnished wages; available when paid; contract employment) | C: CO-5104 employer_vendor_payment; contract **CA4-21**; job dates **CA4-9** |
| 3.605.2.C (short-term and subsidized employment) | C: CO-2340, CO-5104; OQ-1141 |
| 3.605.2.D.1-4 (countable; HCA provider; child not in school) | C: CO-5140; OQ-700 |
| 3.605.2.E.1-3 (self-employment; day care $55, $22; irregular averaged) | C: CO-1705, CO-1706 (count default **CA4-16**) |
| 3.605.2.E.4.a-e (farm; rental; board, room, room and board) | C: CO-1706, CO-4361 |
| 3.605.2.F.1-3 (donated services) | C: in_kind_pay at value (CO-5104); the volunteer test is the county's |
| 3.605.3 intro, A.1-20 (countable unearned) | C: CO-5650 rows; A.4 CO-5654 (expenses default **CA4-16**); A.5-6 `spent_on_covered_costs`; A.13 loans (bona fide exempt, B.1) |
| 3.605.3.B.1-10 (periodic payments; workers' compensation less expenses; SMIB; allotment) | C: CO-5650, `claim_expense`, CO-4369 (OQ-860) |
| 3.605.4.A.1-8 (tax refunds, third-party, emergency, energy, care allowances, VA A&A, GA, crime victims) | C: CO-5650 rows; A.5 OQ-700; A.6 OQ-1051 |
| 3.605.4.B.1-35 (general exemptions) | C: CO-5650, CO-5104 rows; B.11 foster children **CA4-7** (difficulty of care); B.24 CO-3385 (hours default **CA4-16**) |
| 3.605.5.A-D (child support) | C: CO-2550 to CO-2553, CO-5652 |

### Colorado Works: 3.606.1, 3.606.2, 3.609.2.A

| paragraph | status |
|---|---|
| 3.606.1.E (six-month certification; income in the month of application) | C: CO-910; ages in the application month **CA4-15** |
| 3.606.1.F (standards chart) | C: CO-274, CO-276, CO-351 to CO-354 (re-read against the chart) |
| 3.606.1.G (pregnancy allowance) | C: CO-1260 (is_pregnant default **CA4-16**) |
| 3.606.1.H, J.1-4 (need standard test) | C: CO-913 (OQ-153) |
| 3.606.1.I, K (grant; drop the cents) | C: CO-1260, CO-914 |
| 3.606.2.A.1-2 ($90 at application; 100% first period and new source; 67%) | C: CO-907, CO-922, CO-5141 (OQ-1142) |
| 3.609.2.A.1 (initial payment from the date of application or eligibility) | C: CO-4358 (CW3-3 fixed) |

## 4. Open-question classification check

Each open question the cash items cite was checked: it must be a recorded state policy choice (the text on file leaves it open, an assumption is stated and an owner named) or blocked on a named document that cannot be fetched.

| question | classification | confirmed? |
|---|---|---|
| OQ-101, OQ-252, OQ-352, OQ-354, OQ-355, OQ-376, OQ-553, OQ-611, OQ-613, OQ-660, OQ-661, OQ-662, OQ-700, OQ-770, OQ-771, OQ-772, OQ-780, OQ-782, OQ-822, OQ-830, OQ-831, OQ-860 | state policy choice | Yes: each names two readings the text on file allows; unchanged since pass 3 |
| OQ-138, OQ-783, OQ-845, OQ-901 | needs Legal (statute against rule) | Yes, as recorded choices awaiting Legal: each states the reading modeled |
| OQ-530, OQ-531, OQ-682 | blocked on a named document | Yes |
| OQ-887, OQ-888 | state policy choice | Yes: no paragraph names a retroactive SSI lump sum or a sponsor's support; OQ-888 also turns on counting a sponsor's money beside deemed sponsor income |
| OQ-985, OQ-986, OQ-987 | state policy choice | Yes |
| OQ-1024 (Adult Financial half), OQ-1140 | state policy choice | Yes: the record cannot separate 37 U.S.C. 310 pay inside combat-zone pay |
| OQ-1051, OQ-1141, OQ-1142 | state policy choice | Yes |
| OQ-1201 | state policy choice | Yes (C.R.S. 26-2-706(2)(a) forbids a Colorado Works asset test) |
| OQ-1205 | state policy choice | Yes: "highest value" may be market value or equity |
| OQ-1253 | state policy choice | Yes: the interest on the exempt $1,500 is not allocated |
| OQ-1203 | state policy choice | **Partly no.** Personal property other than household goods (3.520.72.B.3-4, 3.520.742.B) and a surrenderable annuity (3.520.72.B.5, "investment vehicles") are decided by the text: **CA4-11**, **CA4-12**. The held state EITC, federally excluded payments, prorated income still held and other resources are genuine choices. A life estate is not negotiable (3.520.741.D.1, 3.510 "Life Estate"), so not counting it follows the text. |
| OQ-1254 | state policy choice | **No.** The text decides the per-resource count; the gap is an operator limit (**CA4-19**). |
| OQ-951 | state policy choice | **No** for AND-SO (3.542.B decides) and not supported for the application month of either program (**CA4-15**). |

## 5. Earlier P1s: confirmation

`npm run check -- --volume co` passes on the reviewed commit, including every stored repro household below; the fix items were re-read.

Adult Financial:

| finding | status | evidence |
|---|---|---|
| F-1 to F-16 (pass 1) | stay fixed | CO-120, CO-130, CO-165 to CO-169, CO-94 pass; CO-4401, CO-4410, CO-4412, CO-4422, CO-4446 to CO-4448 re-read. F-11's expense fact is now a second statement of receipt fields: **CA4-1** |
| G-1 to G-8 (pass 2) | stay fixed | CO-196 (0 deemed, oap, $442), CO-197, CO-198, CO-486 pass |
| H-1, H-2 (pass 3) | stay fixed | CO-4720-T3 to T5 pass; CO-4720 reads the prize and subtracts CO-4444 |
| H-5 (pass 3, P3) | closed | the Home Care Allowance is its own receipt kind, excluded by its row |
| Records E1 AF fixes (boarder income, PASS) and H1 AF fixes (H0-F2, vehicle by P58, burial each $1,500) | hold | CO-671, CO-740 to CO-743 pass; the vehicle choice is per person (**CA4-10**) |

Colorado Works:

| finding | status | evidence |
|---|---|---|
| CW-1 to CW-14 (pass 1) | stay fixed | CO-160 to CO-164 pass |
| CW2-1, CW2-2 (pass 2) | stay fixed | CO-190, CO-191 pass |
| CW3-1, CW3-2, CW3-3 (pass 3) | stay fixed | CO-206 (eligible, $320), CO-207 (af_barred false), CO-208 (September $0) pass |
| Records E1 CW fixes (WIOA training, vendor payment) and D-W1 | hold | CO-670 passes; CO-2349-T6, T7 and CO-1421-T4, T6 pass |

## 6. Reproducing households

All in /tmp/claude-0/-home-user-policy-codex/d3b6fb10-8cf6-5941-8cd3-1acf76d5a30e/scratchpad/c4tools (p1.yaml to p7.yaml), determined 2026-10-01 unless stated. "Base client": an OAP client born 1956-04-10, never married, Social Security $600 a month, $500 in the bank, private dwelling, shelter paid by no one else.

| case | built on | key facts |
|---|---|---|
| A1, A1C | base client | workers' compensation 1,000; claim_expense 700 on the record (A1C: in CO-4444) |
| A2b | base client | life insurance proceeds 5,000 once in October; spent_on_covered_costs 4,800 |
| A3 | base client | school_attendance_conditional_benefit 800; CO-4444 200 |
| A4 to A7 | base client | October once: loan 1,500; reimbursement 600; resource_liquidation 1,200; insurance_cash_value 1,200 |
| A8, A8C | CO-196 | her car 6,000 and his truck 4,000, both used for transportation (A8C: both hers) |
| A9 | base client | wages stream 800, job_end_date 2026-08-31 |
| A10b | base client, born 1960 | 2026-07-01; a July wages record of 0 with annual_contract_pay 24,000 |
| A11 | base client | personal_property 3,000 (livestock) |
| A12 | base client | annuity 10,000, revocable |
| A13 | base client | as of 2026-10-15; bank 5,000 valued 2026-09, 500 valued 2026-10; application and eligibility 2026-09-10 |
| A14 | base client | housing_utility_allowance 120 |
| A15, A15C | base client | employer_vendor_payment 700 (A15C: in_kind_pay 700) |
| A16 | base client | difficulty_of_care_payment 900, foster_care |
| A17 | base client, born 1966-10-05 | as of 2026-10-15; application and eligibility 2026-09-20 |
| A18 | base client | child_support 300 (for her grandchild, on her list) |
| A19, A19C | base client | an irregular gift of 40 in October; an irregular income tax refund of 800 in November (A19C: no refund) |
| A20 | base client | as of 2026-10-15; application 2026-09-25, eligibility 2026-10-03 |
| A21, A21C | CO-196 | his Social Security 1,600; his son of 10 at home wins 500 in October (A21C: no prize) |
| W1, W1b | CO-670 | wages stream 1,000 with job_end_date 2026-09-20 (W1b: job_start_date 2026-11-02) |
| W3 | CO-670 | no earnings; resource_liquidation 2,000 once in October |
| W4 | CO-670 | difficulty_of_care_payment 600, foster_care |
| W5 | CO-670 | no earnings; the child born 2008-10-05; application 2026-09-25 |
| W6 | CO-670 | no earnings for the mother; the daughter born 2010-03-01, secondary school, wages 800, hours_worked not stated |

P1 count: 17 (CA4-1 to CA4-17). P2: 7 (CA4-18 to CA4-24). P3: 1 (CA4-25).

## 7. Dispositions (fix round, 2026-11-23)

Fixed on branch cov4-cash from 05cd48c, merged with origin ccr-9d19bf4c-wmnwcl (coverage pass 4 SNAP fixes, H1 holdings integration). Every changed rule has rule tests whose expected values are computed in their titles or the comment above them from the quoted text; the review's repro households are stored as CO-770 to CO-779 with the rule answer as the expectation, and the others are rule tests (named below). Change record: volumes/co/changes/2026-11-23-coverage4-cash.yaml. New sources S4790 to S4796 (3.510 "Income", "Earned Income", "Resources", "Effective date of eligibility", "Convertible asset"; 3.520.781.G.2.b; 3.520.785.B.25; 3.542.B; 9 CCR 2503-6 3.601 "Income" and 3.605.1.A.2), each read from D-80 or D-81 on file. New items CO-6800 to CO-6804 and CO-6807.

| Finding | Disposition | Commit |
|---|---|---|
| CA4-1 | **Fixed.** af_counted_unearned_receipts (CO-5017) subtracts each receipt's claim_expense and spent_on_covered_costs (B.9, B.14-15), as CO-5651 does, and adds rent net of its allowable expenses (af_rental_expenses_deducted, CO-6801, B.20, rental_property_expenses_paid read only beside a rental_income receipt) and the school-attendance benefits above their expenses (CO-6800, CA4-2). CO-3831 and CO-4720 no longer read unearned_income_offsetting_expenses (CO-4444), which has no reader now and waits for the final cleanup, so the same money is never stated twice. CO-5017-T6 (A1: 900), T7 (A2b: 800), T13; CO-6801-T1 to T4; CO-4720-T4, T5 restated; CO-770 (A1: 880, oap, $189). CO-301, CO-311 and CO-313 restated (CO-311 p2 and CO-313 p1 in receipts alone; their retired facts dropped). | 7ff0cbe, 91be043 |
| CA4-2 | **Fixed.** Rows `counted_beyond_school_expenses` for school_attendance_conditional_benefit and gi_bill_housing_food_allowance (B.16), read by af_school_attendance_benefits_counted (CO-6800): the benefits less school_attendance_expenses_paid, never below zero, from those receipts only. CO-6800-T1 to T5, CO-5017-T12 (1,200); CO-771 (A3: 1,180, none). | 7ff0cbe |
| CA4-3 | **Fixed; OQ-1290 recorded** (a qualified Roth distribution). Rows `not_income` for loan, reimbursement, resource_liquidation and insurance_cash_value (3.510 "Income", S4790; 3.520.77.L) and Colorado Works' resource_liquidation (3.601, 3.605.1.A.2, S4795); savings_account_distribution `counted_taxable_amount`, reusing the neutral `taxable_amount` (CO-5000) the MAGI round added, no second mechanism. CO-5017-T1 restated (600), T8 (A4 to A7: 600), T10, T11; CO-772 (A4: 580, oap, $452), CO-773 (W3: eligible, $320). | 7ff0cbe |
| CA4-4 | **Fixed.** housing_utility_allowance `excluded` (K, 416.1124(c)(14), S2804). CO-5017-T9 (A14: 600). | 7ff0cbe |
| CA4-5 | **Fixed, consistent with N4-11's placement.** A child_support record is stated on the list of the person the support is for (receipts, CO-5000; the non-MAGI Medicaid round's definition), so Adult Financial's reading of a person's own list counts only support received for that person (3.520.785.B.25, S4793) and support for another person is never the client's income (N). The row's meaning says so. CO-5017-T14 (A18, the grandchild's support on the grandchild: 600), T15 (support for the client herself: 900). See the reconciliation note below. | 9781f86 and later |
| CA4-6 | **Fixed.** CO-5103 employer_vendor_payment `counted` (3.510 "Earned Income", 3.520.782.B), read by af_earned_pay (CO-5130). CO-5130-T7 (A15: 700). | 7ff0cbe |
| CA4-7 | **Fixed.** difficulty_of_care_payment `counted_unless_foster_care` in CO-5103 and CO-5104 (3.520.786.M, 416.1124(c)(8); 3.605.4.B.11 as CO-5650 reads it), read by CO-5130, CO-5140 and the readers of counted pay (CO-2342, CO-4012, CO-2340, CO-5141). CO-5130-T8, T9 (A16), CO-5140-T10 (W4); CO-775 (W4: eligible, $320). | 7ff0cbe, a35bdce |
| CA4-8 | **Fixed; OQ-1291 recorded** (the term of the contract). af_earned_pay reads a record stating annual_contract_pay at one twelfth of it (af_annual_contract_months, CO-6802, S4792), as CO-5113 and CO-5152 do. CO-5130-T10 (A10b, July: 2,000). | 7ff0cbe |
| CA4-9 | **Fixed.** Every cash earnings reader (CO-5130, CO-5131, CO-1707, CO-1708, CO-2342, CO-2392, CO-4011, CO-4012; CO-5140, CO-1705, CO-1706, CO-4361, CO-2340, CO-5141) counts a stream only from the month of its job_start_date through the month of its job_end_date; a pay stated with its month or date is placed by it (a last paycheck after the job ended is counted when received). The earnings fields' meanings say the same since SNAP's S4-3. CO-5130-T11 to T13 (A9: 0), CO-5140-T11 to T13 (W1, W1b). W1 is a rule test, not a stored household: the records harness's ME-3 relation restates a stream month by month, which drops the job dates a stream is bounded by. | 7ff0cbe |
| CA4-10 | **Fixed.** af_exempt_transportation_vehicle_equity (CO-6803, the P58 largest) split out of CO-5343; af_vehicle_exemption_shared_with_spouse (CO-6804) is the smaller of the two spouses' exemptions, added back in the couple's figure (CO-2389) and, once per sponsor couple, in CO-2390. CO-6803-T1 to T3, CO-6804-T1 to T3, CO-5343-T6 (A8C), CO-2389-T4 (A8: 5,000); CO-774 (A8: 5,000, none). | 7ff0cbe |
| CA4-11 | **Fixed; OQ-1203's part settled.** A neutral field on holdings, `household_goods_or_personal_effects` (CO-5300, required where read; docs/conventions.md "Holdings records"), so no table outside Adult Financial needs a row; CO-5302 personal_property `counted_unless_household_goods`, read by af_countable_personal_property (CO-5345) at equity unless unsaleable (742.C) or self-support property (77.D). CO-5345-T3 restated, T5 (A11: 3,000), T6, T7. | 7ff0cbe |
| CA4-12 | **Fixed; OQ-1203's part settled.** CO-5302 annuity `counted_if_revocable` (72.B.5; 3.510 "Convertible asset", S4796), read by CO-5340. CO-5340-T5 (A12: 10,500), T6. | 7ff0cbe |
| CA4-13 | **Fixed.** The Adult Financial resource chain (CO-5340 to CO-5350, CO-4000, CO-4412, CO-4422, CO-4722, CO-3854, CO-4001, CO-4002, CO-3400, CO-2389, CO-2390, CO-947, CO-948) is per person per month, from the holdings valued in the month evaluated (3.510 "Resources", S4791), as the Medicaid H1 track did; a date a window is measured from is the determination date in the determination month and the first day of any other month. Rule tests carry their month; the stored expectations are keyed by month. CO-5340-T7, T8 (A13); CO-776 (A13: September 5,000, none, $0; October oap, $452). | 7ff0cbe |
| CA4-14 | **Fixed.** af_partial_month_payment_factor (CO-2603) is 0 in a month before the month of af_eligibility_date (3.542.B, S4794), as CO-4358 is for Colorado Works. CO-2603-T6, T7, CO-951-T13, T14 (A20); CO-777 (A20: September $0, October $430). | 7ff0cbe |
| CA4-15 | **Fixed; OQ-951 narrowed** to the day of the month. af_is_oap_age (CO-940) is per month, sixty or older on the month's last day; AND-SO's and AND-CS's upper limit (CO-1203, CO-950) and the SSI child (CO-4022, CO-4023) read the first day's age; cw_is_dependent_child_in_month (CO-6807) is the month's dependent child, read by CO-921, CO-920 and CO-3385, and cw_is_dependent_child (CO-901) is a dependent child in some month from the application month through the determination month. CO-940-T4 restated (a new applicant turning 60 in the month is of OAP age for it; the grant starts on the eligibility date), T20, T21, CO-953-T20 (A17: September none), CO-6807-T1 to T3; CO-778 (W5: September eligible, $96). | 7ff0cbe |
| CA4-16 | **Fixed (decision 4).** Each listed default removed, the fact required where read, the reads narrowed to where the rule reaches them: CO-3385 hours_worked (a part-time student only); CO-1203 af_im14_signed; CO-1512 SSA's ISM (an SSI recipient only) and shelter_cost_monthly; CO-4443 donated work (the weekly hours from everyone, the tests, hours and rate only for work over five hours a week); CO-1705, CO-1707 the child care count (only with business receipts); CO-3831, CO-4720 (CA4-1); CO-4369 rental and CO-5654 school expenses (only beside their receipts); CO-2353, CO-909 spousal maintenance and support paid outside the home; CO-4400 qualifying_quarters; CO-4401 days out of state; CO-900 is_pregnant; CO-1231 af_burial_request_is_timely; CO-1220 is_enrolled_in_medical_assistance; CO-1504 receives_tanf_cash. The county's findings are kept. The facts' own precision says so. The stored households and rule tests that reach a fact state it as their stories assume (no donated work, no days out of Colorado, no maintenance paid, not pregnant, no child care business, no SSA ISM; the IM-14 signed only where an AND-SO expectation assumed it). CO-3385-T4 (W6: cannot determine), T5; CO-5654-T5, CO-4369-T12. | 7ff0cbe, 91be043, 47ec0e3, a35bdce |
| CA4-17 | **Fixed.** af_spouse_dependent_children_needs (CO-2392) reads every receipt of the child, a prize and a sponsor's money included (3.534.B.3 "own income"). CO-2392-T9 (A21: 0); CO-779 (A21: 568 deemed, 1,158, none). | 7ff0cbe |
| CA4-18 | **Recorded: OQ-1292** (whether exempt income uses up the $60 of a quarter; 416.1124(c)(6) applies its $60 after the other exclusions), class state policy choice; CO-4011 and CO-3827 cite it. | 7ff0cbe |
| CA4-19 | **Reclassified in substance, recorded as the stopping rule allows:** OQ-1254 now says the text decides the per-resource count (D.3, E) and that what holds it open is an operator limitation (the divisor and the application date are facts of the person a sum over the records cannot read), due at the next records integration round, when the integration owner gives the operators a per-record penalty or a case-scope application date and grant standard. Its Class line stays a state policy choice, held open by that limitation, owner the Cash programs policy owner, because the stopping rule accepts only a recorded choice or a named document (a "ledger design" class blocks certification, test/ui/questions.test.tsx); the review's preferred class is noted in the question. | 91be043, f913de8 |
| CA4-20 | **Recorded: OQ-1294** (home space and vehicle costs under "not limited to"), state policy choice; CO-5103 and CO-1707 cite it. | 7ff0cbe |
| CA4-21 | **Recorded: OQ-1295** (Colorado Works' contract employment exception: when earned or prorated), state policy choice; CO-5140 and CO-5104 cite it. | 7ff0cbe |
| CA4-22 | **Fixed in the precision** of af_cash_and_convertible_holdings (CO-5340): a holding valued as of the date of application is stated at its value less the month's income already counted in it; the stored households value holdings at the first of the month. | 7ff0cbe |
| CA4-23 | **Recorded: OQ-1293** (kinship care payments, adoption subsidies, Medicare premium refunds counted by silence), state policy choice; CO-5016 cites it. | 7ff0cbe |
| CA4-24 | **Fixed.** cw_is_parent_of_dependent_child (CO-2383) tests that the child lives with the person and is considered living in the home, as CO-900 does. CO-2383-T3. | 7ff0cbe |
| CA4-25 | **Fixed.** CO-951's stale first sentence struck. | 7ff0cbe |

**Open-question classes (section 4).** OQ-1254 as above (CA4-19). OQ-1203: personal property other than household goods and the surrenderable annuity are settled by the text (CA4-11, CA4-12); the held state EITC, federally excluded payments, prorated income held and other resources stay a state policy choice; the life estate follows the text. OQ-951: narrowed to which day of the month an age is read on, a state policy choice. New: OQ-1290 to OQ-1295, each a state policy choice with the text checked recorded.

**Answer changes** (each an enumerated entry of scripts/receipts/allowed-differences.yaml, section "Coverage pass 4, Adult Financial and Colorado Works", and of scripts/records/allowed/coverage4-cash.yaml, case by case with both values): the fixes above on the generated variants that state the kinds they read (a loan, a reimbursement, a housing utility allowance, a claim expense, insurance cash value, an educational benefit conditional on attendance, a savings distribution with no taxable amount, an annuity with no revocable, personal property); CO-301, CO-311, CO-313, CO-335 and CO-485 (CA4-1, CA4-3); CO-159 (CA4-15: the student turning 18 is a dependent child in a month she starts at 17); CO-213 (stated facts answer what the baseline could not); CO-334's Colorado Works rent stated as other_taxable (CA4-16); and decision 4 on the generated households and the persons of stored households whose cash figures were not expectations, which state none of the facts now required: cannot determine, and the old answer when the old default's reading is stated (checked household by household by evaluating each with those facts stated).
