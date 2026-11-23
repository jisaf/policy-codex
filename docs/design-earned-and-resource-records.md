# Design: earned income and resources as records

Status: proposal for the product owner, 2026-11-23. Implements "Decision, 2026-11-23: earned income and resources move to records too" (docs/plan-colorado.md), after unearned income is complete in every program (phase 1, docs/reviews/receipts-migration-1.md; phase 2 on `receipts-2-cw`, `worktree-agent-a243108d7daf3afcc`, `worktree-agent-aa6222e35d8400137`). Counts below are from HEAD d8f7260 (`volumes/co`, derivations grepped for each identifier; rule tests are those whose `given` states the fact). Nothing here changes the ledger.

## 0. What is proposed, in one screen

1. **Earned income: a second list, `earnings` (CO-5100), not more kinds on `receipts`.** Same record type and the same three operators (P55-P57); its own kinds, its own fields (job dates, business costs), one `<prefix>earnings_treatment_table` per program. No new operator.
2. **Resources: a third list, `holdings` (CO-5300)**, one record per holding, per owner, with share, value, valuation month, encumbrance and transfer details. One `<prefix>holding_treatment_table` per program that has a resource test (SNAP, Adult Financial, Medicaid's SSI method; MSP and the burial rules adopt the SSI method). One new operator, P58 `largest`, for the rules that exclude "one" vehicle (section 3.6); everything else is P55-P57.
3. **Records are disjoint, never "part of".** A traced part (work-study wages, a tax refund still held, an ABLE account) is its own record and the parent record states the rest. This removes the 27 earned and 27 resource "part of" facts that every double count in section 1.3 came from.
4. **Order:** unearned cleanup, then earned (one foundation commit by one integration owner, then six program tracks in parallel), then resources (foundation, then three tracks). Sizes in section 4.

## 1. Inventory today

### 1.1 Earned income: 51 supplied facts, 71 direct readers, 430 rule tests in 105 items, 309 of 319 stored households

| Group | Facts (CO-) and their direct readers |
|---|---|
| Wages | wages_gross 023 (33 readers: Medicaid 17, SNAP 4, CW 3, AF 3, CCCAP 2, CHP+ 1, shared 3); per-pay: wages_pay_frequency 3921, wages_gross_per_pay_period 3922 (one schedule per person; SNAP, LEAP); thirty-day: wages_gross_received_prior_thirty_days 3910, employment_began_or_ended_prior_thirty_days 3923 (LEAP, CCCAP via shared CO-3912) |
| Parts of wages (each "part of wages_gross") | work_study_earnings 3361 (SNAP 3, CW, AF, shared), scsep_wages 4504 (LEAP), wioa_on_the_job_training_wages 4301, summer_youth_employment_wages 4302, annual_contract_wages_received 4326 with annual_contract_pay 4325, wages_from_owned_llc_or_s_corporation 4341 (SNAP), subsidized_employment_wages 3817, short_term_employment_wages 3818 with ..._ended_through_own_fault 3819, cw_new_source_earned_income 2374 (CW), decennial_census_wages_received 4881 (Medicaid 2), difficulty_of_care_payments_received 5209 (MAGI), infrequent_or_irregular_earned_income_received 4010 (SNAP 4, AF 2, Medicaid), pass_set_aside_earned_income 4618 (LEAP, Medicaid 2), snap_earned_income_received_after_application_date 4166. Readers: one program each, mostly |
| Pay beside wages | combat_zone_pay_received 4310, military_pay_education_deductions 4313 (SNAP); in_kind_compensation_value 4506 (CW 2, AF, LEAP, CCCAP); employer_vendor_payments_received 4455 (CCCAP); employer_health_insurance_subsidy_received 4505 (LEAP); room_and_board / room_only / board_only payments 4161, 4830, 4832 with payer counts and provision costs (SNAP, CW, CCCAP; today "part of other_unearned_income_taxable") |
| Self-employment | self_employment_gross_receipts 1700 (16 readers, every program but SUN Bucks), costs 3370 operating (6 programs), 3371 interest (5), 3372 capital principal (SNAP), 3373 home space (CW), 3374 vehicle (LEAP, CCCAP); self_employment_net_earnings_for_tax 024 (MAGI); farming 3720, 4465, 4347; start date 4328, annual support 4327, changed substantially 4342 (SNAP); self_employment_hours_worked 4461, cccap_self_employment_in_launch_period 2113 (CCCAP). Readers: six per-program cost items CO-1701/1703/1705/1707/1709/1711 (audit-dual-entry 3.24) |
| Stay outside the list (not money received for work, or a tax-return figure) | hours_worked 022 (activity tests, 9 readers), impairment_related_work_expenses_paid 4616, blind_work_expenses_paid 4617, donated work 4438-4441 (AF), foreign_earned_income_excluded 082 and magi_other_taxable_income 079 (tax return), verification flags 1315-1317, 1563, 2239 |

### 1.2 Resources: 74 supplied facts, 38 direct readers (Medicaid 21, AF 11, SNAP 5, shared CO-800), 227 rule tests in 44 items, 155 of 319 households

| Group | Facts (CO-) | Readers |
|---|---|---|
| Aggregates by type | liquid_resources_value 3390 (6: SNAP CO-4176, AF CO-4000/4412, SSI CO-800, Medicaid 2), retirement_accounts_value 3392 (+ taxes due 4429), real_property_other_than_home_equity 3393, vehicles_equity_value 3394, home_equity 826 (6), life_insurance face 3397 / cash value 3396 (+ purchase date 3850, payments 3851), burial: irrevocable 4603, revocable trust 3855, prepaid contract 3856, spaces 3857 | CO-800 `ssi_countable_resources_individual` (program All; read by Medicaid CO-4623, AF burial CO-1225) |
| Parts of liquid resources | able 4415, business cash 4416, education savings 4174, inaccessible 4175, federal/state refunds held 4172/4413, EITC held 4173, retroactive SSA held 4414, retroactive benefit unspent 4639 (+date 4640), prorated income held 4319, excluded government payments held 4932, replacement proceeds 4417 (+type 4418, date 4419), joint owners' share 4340 | each read by one program |
| Parts of real property | for sale 4335 (+costs 4338), lot for home 4336, installment contract 4337, former farm 4346, co-owned with resident 4606, income-producing 4607/4423 (+return 4609/4424, trade or business 4608), home production 4425, investment personal property 4642, joint owners' share 4343; Medicaid sale/hardship flags 2242, 2244; AF unsaleable 4431 | SNAP CO-074, Medicaid CO-4620/4623, AF CO-4000 |
| Home | home_equity 826, owns_and_lives_in_home 3401 (AF) and lives_in_owned_home 4610 (Medicaid): the same fact twice; intent to return 4435, 4612; outside Colorado 4613; trust or entity 4614; beneficiary deed 4615 | |
| Trusts, annuities | has_trust_interest 1577, owns_annuity 1579, has_income_trust 823, trust_corpus_payable_to_person_value 4432, ma_trust_annuity_life_estate_value_available 4643 | |
| Transfers | SNAP/AF set: resource_transfer_date 3834, _uncompensated_value 3835, _returned_date 4009, snap_resource_transfer_was_to_qualify 4155, af_transfer_found_not_twfc 3836; Medicaid set: uncompensated_transfer_value_in_lookback 824, transfer_was_exempt 825, transfer_penalty_period_start_date 886. **One transfer is stated in both sets.** | SNAP 4, AF 3, Medicaid 3 |
| Spousal | ma_spousal_resources_at_snapshot 888 (a history record), ma_csra_annuity_lowest_estimate 1948, court-ordered transfer 1950, CSRA overdue 4636, withheld excused 4637 | CO-646, CO-647 |
| Stay as they are | cccap_declares_assets_within_limit 1741 (CCCAP's rule asks for a declaration: the lighter fact, OQ-54 decision); school_meal_household_income 1295 (SUN Bucks); verification flags 1321-1323, 1562, 1576-1580 | |

No resource test exists in the ledger for Colorado Works, LEAP or SUN Bucks; Colorado Works reads holdings only through the death reimbursement (3.606.7.F), which adopts the SSI method as Adult Financial's burial benefit does (3.570.43.D.3.b; CO-1508 reads CO-1229).

### 1.3 Double counts and gaps the reviews found (every one is a "part of" or a second statement)

| Finding | Facts | What went wrong |
|---|---|---|
| coverage3-medicaid-nonmagi C3-11 | 4881, 4010, student exclusion | SSI exclusions added independently: the same dollars excluded twice |
| coverage2-leap N-2, coverage3-leap F3-1 | 4618, 3825 | PASS set-aside split across earned and unearned facts; each half missed once |
| coverage2-snap C2-1 | 3922, 4010, 3361 | irregular and work-study earnings inside wages_gross, converted with the regular pay |
| coverage-cw CW-9, CW-10; coverage3-cw CW3-1 | 4506, 4161, 4830, 4832 | in-kind and boarder pay missing, then added as parts of unearned residuals |
| audit-dual-entry 3.24 | 1701-1711 | the month's business costs entered six times |
| coverage2-snap C2-2, C2-7; coverage3-snap C3-5 | 4415, 4416, 4932 | ABLE, business cash, held excluded payments: parts of liquid not subtracted by SNAP |
| coverage-af F-6, F-8 | 4412 parts, 3392 | held refunds and retroactive benefits not exempted; retirement taxes (20% rule) not deducted |
| coverage-medicaid-nonmagi X-FORSALE, X-IRA, NM-5 | 3393, 3392, 826 | property for sale and a spouse's IRA counted in full; home never counted |
| audit-dual-entry 1.6, 2.6 | 824, 1577, 1579, CO-801 | a couple's transfer, trust, annuity or couple figure stated on each spouse |
| (this inventory) | 3834-3835 and 824 | one transfer in two fact sets; owns_and_lives_in_home and lives_in_owned_home |

Reader-supplied defaults to remove under decision 4: 90 `otherwise` on the earned facts, 88 on the resource facts.

## 2. Earned income

### 2.1 Decision: a separate `earnings` list

| Criterion | More kinds on `receipts` | Separate `earnings` list (recommended) |
|---|---|---|
| Engine-team cost | none new | none new: `list of receipts` is already generic (src/engine/records.ts, a schema per fact; check.ts covers a table against the kinds of the list being summed). Adapters add a second collection of the same shape (`/persons/*/earnings/*`; a second Drools fact type; a second Corticon entity) |
| Counting tables | every earned kind needs a row in all 8 unearned tables (LEAP, SNAP, AF, CW, CCCAP, SUN Bucks, MAGI, SSI): about 200 rows, and the owners' signed sign-offs reopen; every unearned sum must be re-read to prove it cannot pick up an earned row | 7 new tables keyed by earned kinds; the unearned tables and their sign-offs are untouched |
| Fields | job dates, business costs, hours and contract pay added to a schema where they mean nothing for a pension | each schema holds only what its records state |
| Disregards per pay | none in Colorado text: every earned disregard is per person or couple per month or quarter (SNAP 20%, CW 3.606.2, AF and SSI $65 and one half, SSI $30 a quarter and the student exclusion). They apply outside the sum either way | same |
| Frequency conversion (SNAP 4.402.A.2, LEAP 3.752.22.C) | possible | possible, per record: `per_payment` times the program's table looked up by `frequency`; an average of dated pays is a P55 sum over a P55 count. Two jobs on different schedules become statable (today one schedule per person, CO-3921: the spike's F3 for wages) |
| Self-employment gross, costs and net per program | costs as fields: a new cost field is silently not deducted by any program | costs as their own kinds: the type check forces every program to give every cost kind a row (deducted / not deducted), the same "no counting by silence" the unearned tables gave |
| Student and in-kind earmarks | student status is a person fact; a sum may not read it (P55), so it chooses between sums either way; in-kind pay is a kind in both designs | same |

The only cost of separation is a boundary between the lists (2.3) and one more statement per person: an unstated `earnings` list is "cannot determine", a stated empty list is no earnings.

### 2.2 The `earnings` record (CO-5100, supplied, per person, program All)

Kinds (each one source of pay; a property of a pay is a field):
`wages` (employee pay, tips, commissions, bonuses, military basic pay), `uniformed_services_special_pay` (moved from receipts, 2.3), `work_study`, `wioa_on_the_job_training`, `summer_youth_employment`, `scsep_employment`, `subsidized_employment` (other subsidized jobs, apprenticeships, transitional jobs), `decennial_census_employment`, `difficulty_of_care_payment`, `in_kind_pay` (value of goods, shelter or services given as pay), `employer_vendor_payment`, `employer_health_insurance_subsidy`, `self_employment_receipts`, `farm_self_employment_receipts`, `boarder_payments`, and cost kinds `business_cost_operating`, `business_cost_interest`, `business_cost_capital_principal`, `business_cost_depreciation`, `business_cost_home_space`, `business_cost_vehicle`, `business_cost_boarder_provision`. 22 kinds; owners may split further before E0, never after without the integration owner (4.2).

| Field | Type | Declared | Rule that reads it |
|---|---|---|---|
| kind, amount | one of, money | required | all |
| month, date | month, date | as receipts (`month` when_absent: every month; `date` required where read) | LEAP period 3.752.22.A-C; SNAP after the application date (retires CO-4166); CCCAP prior thirty days |
| frequency, per_payment | one of, money | default monthly; required where read | SNAP 4.402.A.2, LEAP 3.752.22.C |
| irregular, retroactive | yes/no | default false | SNAP 4.405.A, SSI 416.1112(c)(2), AF; the rule counts pay unless the exception is shown ("Unless otherwise specified ... countable", CW 3.605.3, and like text), so false is the rule's default, as for receipts |
| job_start_date, job_end_date | date | when_absent: began before, and continues through, the months the case covers | LEAP C.3.a-b, CW new source 3.606.2.A.2 (retires CO-2374, CO-1502), CW short-term 3.605.2.C |
| temporary_job | yes/no | default false (exception) | CW 3.605.2.C (retires CO-3818) |
| ended_through_own_fault | yes/no | required where read | CW 3.605.2.C (CO-3819) |
| annual_contract_pay | money | when_absent: not paid under an annually renewed contract | SNAP 4.403.3 (retires CO-4325/4326) |
| paid_as_business_owner | yes/no | default false | SNAP verification (CO-4341) |
| pass_set_aside, education_deduction, pretax_deductions | money | default 0 (earmarks, as receipts) | LEAP DD, SSI, WAwD; SNAP 4.405.2.A.13; MAGI |
| net_for_tax | money | required where read | MAGI (retires CO-024; one per business) |
| hours | hours | required where read | CCCAP launch period and minimum wage (retires CO-4461; consistency check: at most hours_worked) |
| farm | yes/no | default false | SNAP farm loss 273.11(a)(2)(iii), AF (on cost kinds; retires CO-3720/4465) |
| annual_support, start_date | yes/no, date | required where read | SNAP 4.403.11-12 averaging (CO-4327, CO-4328) |
| boarders, provides | whole number, one of (room_and_board, room_only, board_only) | required where read | CW 3.605.2.E.4.c-e, SNAP boarder income |

### 2.3 Boundary with `receipts`

Earnings are money or in-kind value paid to the person for work the person performed, as an employee or in self-employment. Everything else stays in `receipts`, including stipends and allowances SNAP happens to count as earned (dvsa_title_i_volunteer_payment, vocational_training_allowance, americorps: SNAP's receipt table keeps `counted_as_earned`). Moves, done once in E0 with a row change in every receipts table: `uniformed_services_special_pay` (pay for service; also replaces combat_zone_pay_received CO-4310); room, board and boarder payments out of `other_taxable` (translator carve-out). A harness lint flags any person who states the same amount in the same month under a boundary pair (special pay, VISTA, training allowance).

### 2.4 Counting tables

`<prefix>earnings_treatment_table`, a `table keyed by option` keyed by earnings kind, one per method: `snap_`, `leap_`, `af_`, `cw_`, `cccap_`, `ma_magi_`, `ma_ssi_` (7 tables, 154 rows). CHP+ adopts MAGI by its cited link (10 CCR 2505-3 150.1, as in phase 2); SUN Bucks reads none. Options are the program's own words: `counted`, `counted_no_rule_excludes` (owner signs), `excluded`, a named special rule (`counted_at_value` for in-kind, `excluded_age_55_or_older` LEAP CC, `excluded_under_19_with_parent` SNAP A.6, `counted_above_boarder_allowance`), and for cost kinds `deducted` / `not_deducted`. Each row cites its paragraph in the table's meaning. Rows today's derivations already settle (excerpt; the rest are set from the current items in E0 and marked for sign-off):

| Kind | SNAP | CW | AF | LEAP | CCCAP | MAGI | SSI method |
|---|---|---|---|---|---|---|---|
| work_study | excluded 4.405.1 | excluded B.24.a | excluded (CO-2342) | excluded (CO-3912) | excluded J.16 | to sign | counted (student exclusion outside) |
| scsep_employment | excluded A.9 | to sign | to sign | excluded_age_55_or_older CC | to sign | to sign | to sign |
| in_kind_pay | excluded (273.9(c)(1)) | counted_at_value 3.605.2.G | counted_at_value 3.520.782.B | counted_at_value 3.752.22.C.4 | counted_at_value I.4 | to sign | to sign |
| decennial_census_employment | to sign | to sign | to sign | to sign | to sign | to sign | excluded F.6.z |
| business_cost_capital_principal | deducted 273.11(b) | not_deducted 3.605.2.E.1 | not_deducted 3.520.783.B | to sign | not_deducted I.2.b | n/a (net_for_tax) | not_deducted 8.100.3.K.9 |
| business_cost_home_space | to sign | deducted E.1 | to sign | not_deducted 3.755.21.I | to sign | n/a | to sign |

Frequency conversion is a second, existing kind of table keyed by `frequency` (snap_income_conversion_rate_table, leap_pay_periods_per_month); a program whose text gives no conversion counts the amount received in the month (P57), as today. Averaging (SNAP annual support, contract pay) stays a `sum_months` outside the sum.

### 2.5 What each program builds (its own items; nothing shared)

- **SNAP:** recurring earnings converted per record; irregular earnings and irregular receipts pooled for the $30 quarter test (CO-2338); student and WIOA age tests read outside the sum; self-employment net and farm loss from the cost rows. Retires CO-4682 (the conversion ratio that existed only to undo parts).
- **LEAP:** dated pays in the eight weeks before application, averaged and multiplied by pays per month; jobs begun or ended in the period by job dates; PASS earned half by the field (N-2 closed structurally).
- **CW:** gross earned = counted rows + boarder rule; student, subsidized, temporary and new-source tests by kind and fields; disregards of 3.606.2 unchanged on the result.
- **AF and SSI method:** counted rows; ordered exclusions of 416.1112(c) applied once to disjoint pools (fixes C3-11); IRWE/BWE and the $65-and-half stay outside.
- **CCCAP:** prior thirty days by dates; launch-period imputation from `hours`; in-kind, vendor and boarder pay by rows (I.4, I.5, I.18).
- **MAGI:** wages less pretax deductions, `net_for_tax`, difficulty of care excluded (K.7.c).

Shared items to dissolve: has_earned_income (CO-1356) becomes per-program or a primitive "states any earnings record"; CO-3912 is split into LEAP's and CCCAP's own items (the split phase 2 could not make).

### 2.6 Operators

None. P55 sums and counts (a count is a sum of 1), P56 reads fields, P57 places a pay in a month; conversions are lookups by `frequency` inside the value, the LEAP window compares `date` with case-scope dates, averages and quarter tests are `sum_months` outside. docs/operators.md "Receipt records" changes one sentence ("No other list-of-records input exists") to name `earnings` under the same recorded exception.

## 3. Resources

### 3.1 The `holdings` record (CO-5300, supplied, per person, program All)

One record per holding per owner, valued as of a month. Kinds: `cash`, `bank_account`, `securities`, `retirement_account`, `education_savings_account`, `able_account`, `business_cash_and_assets`, `home`, `real_property`, `installment_contract`, `vehicle`, `personal_property`, `investment_personal_property`, `life_insurance`, `burial_fund`, `prepaid_burial_contract`, `burial_space`, `trust_interest`, `annuity`, `life_estate`, `loan_receivable`, and the traced cash a rule treats by its source and date: `held_income_tax_refund`, `held_eitc`, `held_retroactive_ssa_benefit`, `held_excluded_payment`, `held_loan_proceeds`, `held_replacement_proceeds`, `held_prorated_income`, `other_resource`. 29 kinds. A bank account with $900 of which $400 is a refund received in March states two records: `bank_account` 500 and `held_income_tax_refund` 400 dated March.

| Field | Declared | Read by |
|---|---|---|
| kind, value (fair market value of the whole holding) | required | all |
| month (valuation month), date | `month` when_absent: the same value in every month the case covers; valued in a month by P57 | SSI first moment of the month (416.1207(a)); SNAP and AF as their valuation rules say (owners cite) |
| amount_owed (liens, secured debt) | required where read (equity) | SSI 416.1201(c), AF, SNAP |
| share | when_absent: owned alone (1) | all; 3.2 |
| holding_id, co_owners (none, spouse, other_in_case, outside_case) | required when share < 1 | 3.2 |
| accessible | default true: each rule presumes availability until shown otherwise (SNAP 4.409.H, SSI 416.1201(a)) | SNAP, SSI, AF |
| source_date | required for `held_*` kinds | AF K, J, L; SNAP J.12, J.17 |
| replacement_property (real, personal) | required for held_replacement_proceeds | AF (3 or 6 months) |
| used_for_transportation, lives_in, intends_to_return, intent_in_writing, outside_colorado, held_in_trust_or_entity, beneficiary_deed | required where read | vehicles; home rules M.2.a, AF |
| listed_for_sale, costs_of_sale, co_owner_would_lose_housing, legal_impediment_to_sale, lot_for_future_home, income_producing, used_in_trade_or_business, net_annual_return, farm_ended_date | required where read | SNAP F.1, F.2, G, B, E.4; Medicaid M.2-M.3; AF D.1-4 |
| taxes_on_withdrawal, self_funded | required where read; AF's reader applies 20% when not stated because 3.520.73.B.1.b gives that default to AF only | AF 73.B.1; Medicaid N.3 |
| face_value, insured_is_owner, purchase_date, premiums_in_lookback | required where read | SSI 416.1230(a), AF 3.520.75 |
| irrevocable, accrued_interest, designated_for_burial, for_immediate_family | required where read | burial exclusion M.2.j, AF 77.G-I |
| annuitized, revocable, corpus_available_value | required where read | Medicaid 8.100.7.E, I; AF trust |
| disposed_date, compensation_received, transferee (spouse, child_blind_or_disabled, other_relative, unrelated, trust), returned_date | `disposed_date` when_absent: still held; the others required when disposed | SNAP transfer rule, AF TWFC, Medicaid 8.100.7.F: one transfer, one record (ends the two-set statement) |

### 3.2 Ownership and spousal attribution

A jointly owned holding is stated on each owner's list who is a person of the case, with the same `holding_id`, `value` and `kind` and each owner's `share`; an owner outside the case is `co_owners: outside_case`. `npm run check` (case validation, not an operator) refuses a `holding_id` whose records disagree on value or kind, or whose shares exceed 1. Each program then decides from fields alone:

- **SSI method (Medicaid ABD, LTC, buy-ins with a test; adopted by AF burial and CW death reimbursement):** an individual counts `share × equity`, or the whole value of an account the person can withdraw alone when the co-owner is not the spouse (416.1208(c)); a couple adds both spouses' figures (416.1202(a), 8.100.5.M.1), so a joint spousal account is counted once; a non-applying spouse's self-funded retirement account is left out (N.3); ineligible parents' resources are deemed less retirement accounts (CO-4627).
- **CSRA (8.100.7.L-M, 42 U.S.C. 1396r-5(c)):** the couple's total at the snapshot, regardless of title, is the same couple sum read `at` the snapshot month; ma_spousal_resources_at_snapshot (CO-888) becomes derived when the case states holdings for that month (decision D8). The institutionalized spouse's figure is that total less the CSRA (CO-647); after the eligibility month the community spouse's holdings are not read (c)(4).
- **SNAP:** each member's countable holdings (4.409-4.410) summed over the SNAP household, a joint holding with an outside owner counted where accessible (4.409.C); sponsors' holdings read from the sponsor's own list (CO-3702).
- **AF:** client and spouse (CO-2389) and sponsor (CO-2390), each list read with AF's table.

### 3.3 Tables and how each program's rules map

| Program | Table | Notes |
|---|---|---|
| Medicaid, SSI method | `ma_ssi_holding_treatment_table` (Subpart L as 8.100.5.J and M read it) | replaces CO-800 (shared, program All) and CO-4623's adjustments; options include `counted`, `excluded`, `counted_cash_value_if_face_over_limit`, `burial_exclusion`, `home_rules`, `excluded_while_for_sale`, `counted_above_income_producing_exclusion`. AF burial (3.570.43.D.3.b) and CW death reimbursement (3.606.7.F.2.c) adopt it by cited link (D6) |
| MSP | none of its own: CO-5206 keeps reading the SSI-method figure less a home counted only by beneficiary deed | the MSP owner confirms no other difference (OQ) |
| SNAP | `snap_holding_treatment_table` (273.8, 4.409-4.410) | all vehicles excluded (4.410.A); low-return and for-sale tests on real property; `held_*` rows by J.12, J.17 and the 4.410.J payments |
| Adult Financial | `af_holding_treatment_table` (3.520.72-77) | highest-valued transportation vehicle excluded (77.A); held refunds 12 months (K), retroactive benefits 9 (J), loans in the month (L), ABLE (M), business assets (D.1.b), replacement proceeds 3 or 6 months; life insurance OAP rule (75.E-F) |
| Colorado Works, LEAP, SUN Bucks | none: no resource test in the ledger (CW and LEAP owners confirm against 9 CCR 2503-6 and 2503-7) | |
| CCCAP | none: keeps the declaration CO-1741 (the rule asks for a declaration) | |

### 3.4 Operators

- **P58 `largest`** (new, justified by rule text): `["largest", list, condition, value]`, the largest value over the records whose condition holds, 0 when none, unknown under P55's rules. Needed because 20 CFR 416.1218(b)(1) excludes "one automobile, regardless of value, if used for transportation" and 9 CCR 2503-5 3.520.77.A excludes the highest-valued vehicle used for transportation: countable = sum of vehicles less the largest transportation vehicle. Today this is a "part of" fact (CO-3395) the household picks. The alternative, a stated `excluded_vehicle` field, puts a program's choice into a neutral fact (D5). Engine teams: Drools `accumulate(max)`, Corticon `->max`; the fact graph needs a collection maximum beside `CollectionSum` (to be confirmed by the fact-graph reviewer before adoption).
- **No other operator.** The list type gets a noun (`record_noun: holding` on the schema) so P55-P57 render "for each holding in", "that holding is valued in"; this is parse and render only. Look-back windows (SNAP 3 months, AF CO-3838, Medicaid 60 months) compare `disposed_date` with case dates; the penalty start stays supplied (CO-886) unless the owner wants it derived, which would need an earliest-date operator.

## 4. Migration

### 4.1 Preconditions

Phase 2 merged (CW, CCCAP and SUN Bucks, Medicaid and CHP+), the unearned final cleanup done (scalar facts and orphans retired, `receipts` precision rewritten once), and the receipt kinds phase 2 deferred because they touch every table (adoption_subsidy, board-only and room-only, savings distributions, SMIB refund, insurance cash value, military allotment) added in E0's all-tables commit.

### 4.2 Order, sizes, owners

| Step | Owner | Content | Size |
|---|---|---|---|
| E0 foundation | integration owner, serial | CO-5100 schema; 7 earnings tables with every row set to today's reading and marked; the boundary moves (2.3) in all receipt tables; translator (`scripts/records/translate-earnings.ts`); harness registry split (4.3); ID and question blocks; docs/operators.md, conventions.md | 51 facts translated; 309 households, 430 rule tests restated mechanically |
| E1 SNAP | track | snap_ earned items, CO-2338, CO-4324, CO-4682, CO-1701/1702, boarder | 15 readers, 121 rule tests |
| E1 Medicaid + CHP+ | track | MAGI and SSI earned, LTC, buy-ins, CO-2471 ordering, CO-1703/1704 | 26 readers, 91 rule tests |
| E1 CCCAP | track | CO-3915/3916 wages, CO-1709/1710, CO-4464, its CO-3912 copy | 7 readers, 64 |
| E1 AF | track | CO-3830, CO-2342, CO-1707/1708, deeming | 8 readers, 62 |
| E1 CW | track | CO-1716, CO-2340, CO-1705/1706, CO-4361, new source | 8 readers, 59 |
| E1 LEAP | track | CO-3925, CO-1711/1712, its CO-3912 copy | 4 readers, 25 |
| E2 cleanup | integration owner | retire the earned scalars and translator; shared CO-1356, CO-3387 | 3 shared readers, 8 tests |
| H0 foundation | integration owner | CO-5300 schema, `record_noun`, P58 (if D5), joint-holding check, 3 tables, translator from 74 facts (part-of carving as phase 1 did for lump sums) | 155 households, 227 rule tests |
| H1 Medicaid | track (one, sequential sub-commits: SSI method, MSP, LTC and CSRA, transfers, trusts) | CO-4623, CO-608, CO-647, CO-646, CO-5206, CO-649/659, CO-650, CO-4620-4627 | 21 readers, 97 |
| H1 AF | track | CO-4000, CO-4412, CO-2389/2390, CO-4722, CO-3840, burial | 11 readers, 65 |
| H1 SNAP | track | CO-4176, CO-074, CO-343, CO-3702, CO-4158-4160 | 5 readers, 58 |
| H2 cleanup | integration owner | retire scalars, CO-800/801/2861, translator | |

Households and rule tests are mostly shared between tracks, which is why the translator, not the tracks, restates them.

### 4.3 Parallelisation that avoids phase 2's collisions

Phase 2's three tracks collided on: the harness lists (`MIGRATED`, `FIGURES`), generate.ts `BASES`, allowed-differences.yaml, translate.ts, the `receipts` precision sentence, conventions.md and plan-colorado.md, UI count pins, change-impact fingerprints re-keyed after each merge (92facec, c29d326), and kinds no track could add (adoption_subsidy, CO-3912's split). Rules for E1 and H1:

1. **One integration owner** holds the schema facts (CO-5100, CO-5300), every table's row set, translate-*.ts, choices, retired-facts, docs/operators.md, conventions.md, plan-colorado.md, UI pins and change-impact re-keys. Tracks never edit them; they file a request in their review doc.
2. **A new kind or field is added in all tables at once**, by the integration owner, with each program's current reading as the row and `to sign` in the meaning; tracks then change only the treatment cell of their own table (one file each).
3. **Per-track files**: `scripts/records/programs/<program>.ts` (FIGURES, MIGRATED, BASES), `scripts/records/allowed/<phase>-<program>.yaml`, `docs/reviews/records-<list>-<program>.md`, `volumes/co/changes/<date>-records-<program>.yaml`. The harness loads the directory.
4. **Pre-allocated numbers**: items CO-5110-5199 (SNAP 5110, LEAP 5120, AF 5130, CW 5140, CCCAP 5150, MAGI 5160, SSI 5170), CO-5310-5399 (SNAP 5310, Medicaid 5320, AF 5340); households CO-600-689 (15 per earned track), CO-700-744 (15 per resource track); questions OQ-1000-1089, OQ-1100-1144.
5. **Merge waves**: the integration owner merges the tracks one at a time in a fixed order (smallest first: LEAP, CW, AF, CCCAP, SNAP, Medicaid), reruns the harness against the wave's baseline after each, and re-keys fingerprints and re-pins UI counts once at the end of the wave.

### 4.4 Harness extension

`npm run records:harness -- --list earnings|holdings` generalises scripts/receipts: the baseline is the foundation commit (E0 or H0) so each track measures itself; `--base` the commit before the foundation measures the whole phase. It checks that every stored household's records are the translation of its old facts, the joint-holding consistency, the boundary lint (2.3), and the metamorphic relations; generated households add one base per program track varied by one earned or holding fact at a time (phase 1 and 2 bases kept).

Metamorphic relations (invariant unless noted):
- **ME-1 split**: a stream split into two records summing to it. Not invariant for the SNAP and LEAP per-pay averages (they average pays, not dollars); excluded there.
- **ME-2 order**; **ME-3 month** (a stream for every month vs the month evaluated), excluding LEAP's dated window and SNAP averaging.
- **ME-4 cost relabel** between two cost kinds a program both deducts.
- **ME-5 dated vs stream**: four dated weekly pays of x in a month and a weekly stream of per_payment x give SNAP 4.3x in both.
- **MH-1 split** an account into two records; **MH-2 order**; **MH-3 joint**: a spousal joint account as two half-share records vs one whole record on one spouse: invariant for every couple and household figure (SSI couple, CSRA, AF couple, SNAP household), not for an individual test; **MH-4 encumbrance**: value v owed d vs value v-d owed 0 for equity-reading rows; **MH-5 trace expiry**: a `held_*` record past its window merged into `bank_account`.
Families with the rule's answer: E1 two jobs, weekly and biweekly (SNAP), E2 a job begun in the LEAP window, E3 student, irregular and Census wages for an SSI child (C3-11), E4 a PASS of wages (LEAP, SSI), E5 a business with all six cost kinds (six programs' nets), E6 in-kind rent for building work (CW, AF, LEAP, CCCAP); H1 ABLE (C2-2), H2 an IRA with no tax figure (AF 20%), H3 a spouse's IRA (X-IRA), H4 a lot for sale (X-FORSALE), H5 a refund held 11 and 13 months, H6 one transfer read by SNAP, AF and Medicaid, H7 two vehicles.

Expected allowed-difference classes (each needs a cited rule or a product-owner decision): earnings unstated becomes "cannot determine" where a reader defaulted; two pay schedules per person; SSI exclusions applied once; joint and transfer double statements gone; the 90 and 88 reader defaults removed.

## 5. Risks

1. **The boundary between lists.** The same money in `receipts` and `earnings` is a double count no single table can see; mitigated by 2.3's definition, the boundary lint, and moving the few kinds once.
2. **Joint holdings.** Each owner stating the full value doubles a couple's resources; mitigated by `share`, `holding_id` and the check, and MH-3.
3. **"Cannot determine" wave.** Removing 178 reader defaults makes every SSI-method, AF and non-BBCE SNAP outcome unknown for a household that states no `holdings` list, and every earned reader for one that states no `earnings` list. Stored households are translated, so the wave hits generated and new households; owners must accept it or name rule-given defaults (the decision-4 round).
4. **History burden.** CSRA snapshot and 60-month transfer look-back need holdings valued in past months; if households cannot state them, CO-888 and the transfer value stay supplied (D8).
5. **Per-transfer agency findings.** SNAP "to qualify", AF "not TWFC" and Medicaid "exempt purpose" are findings about one transfer, today one per person; as program-prefixed record fields they break the neutral-record rule, as person facts they cannot tell two transfers apart (D9).
6. **Engine and port.** P58 and two more collections for the fact-graph adapter; P58 must be confirmed portable first.
7. **Translator ambiguity.** Overlapping parts (WIOA training that is also subsidized; Census work that is also temporary; in-kind stated inside or beside wages) need choices per case (choices.ts), and stored households where parts exceed their parent (as CO-412 for unearned) need a recorded reading.
8. **Size.** About 110 readers and 650 rule tests across nine tracks; owners' sign-off of about 240 table rows, many "counted because no rule excludes it".

## 6. Decisions for the product owner

- **D1** A separate `earnings` list (recommended) or earned kinds on `receipts`.
- **D2** The boundary: special pay, boarder income and difficulty of care move to `earnings`; VISTA, AmeriCorps and training allowances stay in `receipts`.
- **D3** Exception flags (`irregular`, `retroactive`, `temporary_job`, `accessible`) take the default the rule's "counted unless excluded" or "presumed available" gives, declared once; or are required (larger cannot-determine wave).
- **D4** Business costs as their own kinds (recommended: no deduction by silence) or as fields.
- **D5** P58 `largest` for the one excluded vehicle, or a stated excluded-vehicle field.
- **D6** The SSI-method holdings table is Medicaid's (`ma_ssi_`), adopted by AF burial and CW death reimbursement by cited link (recommended, as phase 2 did for SSI income), or a neutral `ssi_` method table.
- **D7** MSP has no table of its own (confirm with the MSP owner).
- **D8** The CSRA snapshot and the transfer look-back derived from past holdings, or kept as supplied history figures.
- **D9** Per-transfer findings as program-prefixed record fields (an exception to neutral records), or kept per person (limited to one transfer).
- **D10** CCCAP keeps its asset declaration; Colorado Works, LEAP and SUN Bucks get no holdings table (owners confirm no resource test).
- **D11** Whether H0 (schema, translator, engine noun and P58) may start while E1 tracks run, since it touches no earned item; the plan's order otherwise stays earned first.

## 7. Decisions taken (2026-11-23), under the product owner's standing decisions
Taken by the plan owner so the work can proceed; each follows from a decision already recorded in docs/plan-colorado.md. The product owner may overturn any of them before its migration step starts.
- **D1** separate `earnings` list (keeps the signed unearned tables closed; no new operator).
- **D2** boundary as proposed.
- **D3** exception flags take the default the rule itself states ("counted unless excluded", "presumed available"), declared once on the field; with no such text the field is required. This is decision 4 ("cannot determine unless the rule says otherwise") applied, not a new choice.
- **D4** business costs as their own kinds: no deduction by silence; every program decides every cost.
- **D5** P58 `largest`, justified by 20 CFR 416.1218(b)(1) and 9 CCR 2503-5 3.520.77.A; the fact-graph reviewer is asked before H0 merges, with the stated-field alternative kept as the fallback.
- **D6** the SSI-method holdings table is Medicaid's, adopted by cited link (as phase 2 did for SSI income).
- **D7, D10** recorded as owner confirmations (open questions), not assumed silently.
- **D8** derived from dated past holdings where the household states them; otherwise "cannot determine" (decision 4), never a silent zero.
- **D9** per-transfer agency findings as program-prefixed record fields (an agency finding is not a neutral fact).
- **D11** H0 may start while the earned tracks run, since it touches no earned item.
