# Records E2 and H2: the scalar income and resource facts retired

Steps E2 and H2 of docs/design-earned-and-resource-records.md (section 4.2), by the integration owner, 2026-11-24, on branch `ccr-9d19bf4c-wmnwcl` from 8e32fc4. Policy work is paused (docs/handoff-2026-11-24.md, section 1), so the step's rule was **zero answer change**: no stored household expectation, rule-test value or intermediate figure may move. None did.

## 1. In one screen

- Every program already read unearned income from `receipts` (CO-5000), earned income from `earnings` (CO-5100) and resources from `holdings` (CO-5300). The scalar facts were kept only so the translators could write records from them and the harnesses could compare old against new.
- **Retired:** 116 supplied facts (48 earned, 65 resource, 3 that the records had already left without a reader) and the derived `has_earned_income` (CO-1356, no reader): 117 items. 4,266 statements removed from 481 stored households and 1,022 from 401 rule tests. The three translators (receipts, earnings, holdings), their apply scripts, `scripts/receipts/retired-facts.yaml` (9,064 retired statements of 528 households and tests), `choices.ts`, `readers.ts`, the harnesses' translation checks and old-against-new comparisons, and every allowed-differences file (`scripts/receipts/allowed-differences.yaml`, 6,321 entries; 60 files under `scripts/records/allowed/`, 4,619 entries). The two audit scripts that classified old-against-new cells into allowed differences (`scripts/audit/pattern-sweep-cash-classify.ts`, `-allow.ts`).
- **Kept:** the metamorphic relations (MA-1 to MA-6 and the families, ME-1 to ME-4, MH-1 to MH-5), the boundary lint, the joint-holding lint and the check that every relation gives a valid statement. They run on the records directly: the generated households are now written in records alone.
- **Not migrated at first, fixed since (section 5):** two Medicaid verification items read scalar findings the holdings also state (CO-2246, CO-2248), and Adult Financial's presence test of countable unearned income counted the receipt kinds that are earnings (CO-2872), so their facts and stated copies stayed. The product owner called that a code smell; the leftovers round (same day) moved the verifications onto the holdings, retired CO-2242 and CO-2244, fixed CO-2872, removed the copies and retired the three receipt kinds that are earnings. Moved answers, all intermediate: section 5.
- **Verified:** every stored household and rule test evaluated before and after on 964,771 values (every program outcome, every expectation, every harness figure and every derived item of the income and resource chains, in each month the case reads) and 6,736 rule-test results: identical, except the three tests and the values of CO-1356, which is retired.

## 2. Inventory before the step (HEAD 8e32fc4)

### 2.1 The scalar facts and their translators

| List | Scalar facts | Translator mappings | State before E2 |
|---|---|---|---|
| receipts (CO-5000) | 85: the 83 the translation read (aggregates such as social_security_income, the residuals other_unearned_income_taxable and _nontaxable, every part-of and earmark fact carved out of them, the lump-sum and retroactive facts, the LEAP thirty-day facts, the periodic income) and Medicaid's VA Aid and Attendance pair | `scripts/receipts/translate.ts`: AGG (8 aggregates to kinds), PARTS (35 parts of the residuals), SUBPARTS (4), HOSTED (3), the overlays to fields, the lump-sum carving, `CHOICES` for facts naming two sources | all retired from the ledger in receipts phase 3; the households' statements kept only in `retired-facts.yaml` for the translation check |
| earnings (CO-5100) | 48 | `scripts/records/translate-earnings.ts`: WAGE_PARTS (15 parts of wages_gross to kinds or fields), COSTS (5 cost kinds), the pay schedule, the business and boarder facts, NOT_RESTATED (2 thirty-day facts), MOVING_KINDS (3 receipt kinds that are earnings, copied into earnings) | in the ledger, read only by CO-1356 (wages_gross, self_employment_gross_receipts) or by nothing; stated beside the records in 481 households and 401 rule tests |
| holdings (CO-5300) | 74 | `scripts/records/translate-holdings.ts`: LIQUID_PARTS (11 parts of liquid_resources_value), REAL_PARTS (6), the aggregates and the home, vehicles, insurance, burial, trusts and transfers to records, MEDICAID_TRANSFER_FACTS (2), NOT_RESTATED (7 person facts) | 65 with no reader; 9 still read (2.2) |

Outside the lists by design (design 1.1, 1.2: not money received for work, a tax-return figure, an activity test, a declaration, or a verification flag) and not touched: hours_worked (CO-022), impairment-related and blind work expenses, donated work, foreign_earned_income_excluded and magi_other_taxable_income, CCCAP's asset declaration (CO-1741), the SUN Bucks household income (CO-1295), the expenses read beside receipts (rental_property_expenses_paid CO-4458, school_attendance_expenses_paid CO-4662), and the verification flags.

### 2.2 Readers left

| Fact | Readers | Decision |
|---|---|---|
| wages_gross (CO-023), self_employment_gross_receipts (CO-1700) | has_earned_income (CO-1356), which no item reads and no household expects (Medicaid, CCCAP and the cash programs read their own presence tests from the records since E1: CO-6200, CO-5153) | CO-1356 retired with them (design 2.5 "dissolves" it; docs/reviews/service-design-fact-burden.md FB-13) |
| has_income_trust (CO-823) | CO-642, CO-3616, CO-1634 | kept: an income arrangement, never restated (design 3.1, NOT_RESTATED) |
| transfer_penalty_period_start_date (CO-886) | CO-660 | kept: the penalty start stays supplied (design 3.4, D8) |
| ma_spousal_resources_at_snapshot (CO-888) | CO-646 | kept: derived from the dated holdings since H1 (D8); not a scalar statement |
| ma_csra_annuity_lowest_estimate (CO-1948), ma_court_ordered_transfer_to_community_spouse (CO-1950), ma_csra_transfer_is_overdue (CO-4636), ma_community_spouse_withheld_resources_are_excused (CO-4637) | CO-1977, CO-646, CO-647, CO-648 | kept: the CSRA figures and findings stay person facts (design 3.1) |
| ma_excess_real_property_is_for_sale (CO-2242), ma_claims_co_owner_hardship_for_real_property (CO-2244) | CO-2246, CO-2248 (Medicaid's verifications of sale efforts and of joint ownership) | kept at first: migrating the readers to the record fields moves answers; fixed and retired in the leftovers round (section 5) |
| every other earned and resource fact (111) | none | retired |

Three more supplied facts had no reader and said so in their own text, each "left for the final cleanup" after a coverage pass moved its reading onto a record field: unearned_income_offsetting_expenses (CO-4444; claim_expense and spent_on_covered_costs on the receipt, coverage pass 4 CA4-1), retirement_early_withdrawal_penalty (CO-4459; early_withdrawal_penalty, coverage pass 5 C5-2), has_self_employment_seasonal_or_commission_earnings (CO-4557; ma_has_annualizable_earnings from the earnings records, coverage pass 4 C4-05). They are migration leftovers and are retired too (docs/reviews/orphan-facts.md).

## 3. Restatement in records alone

Every statement of a retired fact was removed from the stored households (volumes/co/tests/cases.yaml, edited in place so comments and layout stay) and from the rule tests (the item files, edited in place), leaving the records the translators had already written. A person's `months:` left empty by the removal went with it. No record was added or changed: the records were already the translation of the facts removed (the harnesses checked that on every run before this step).

Verification: a snapshot of every stored household (561) and rule test (6,736) before and after, evaluated by today's engine: for each household every program outcome, every expected identifier, every figure the harnesses compared, and every derived item of the income and resource chains, for every person and every month the case reads (964,771 values); for each rule test its result. Identical, but for has_earned_income (CO-1356: 1,470 values and its 3 tests), which nothing reads and which is retired.

Tried and reverted: removing the three stated copies of the receipt kinds that are earnings (CO-206 p1, CO-362 p1 room-only payments; rule test CO-5110-T4) moved af_has_countable_unearned_income (true to false) and af_unearned_income_is_unverified (unknown to false) on CO-206 and CO-362. The copies stayed; the leftovers round removed them with the fix of CO-2872 (section 5).

## 4. Retired

Statements removed are counted per map (a fact stated for every month and for one month is two).
### Earned income (48 supplied facts)
| Item | Identifier | Readers at HEAD | Statements removed (households / rule tests) |
|---|---|---|---|
| CO-023 | wages_gross | CO-1356 | 933 / 376 |
| CO-024 | self_employment_net_earnings_for_tax | none | 727 / 122 |
| CO-1700 | self_employment_gross_receipts | CO-1356 | 915 / 270 |
| CO-2374 | cw_new_source_earned_income | none | 0 / 0 |
| CO-3361 | work_study_earnings | none | 0 / 1 |
| CO-3370 | self_employment_operating_costs | none | 113 / 2 |
| CO-3371 | self_employment_interest_costs | none | 0 / 2 |
| CO-3372 | self_employment_capital_principal_payments | none | 0 / 2 |
| CO-3373 | self_employment_home_business_space_costs | none | 0 / 2 |
| CO-3374 | self_employment_business_vehicle_costs | none | 0 / 2 |
| CO-3720 | self_employment_is_farming | none | 2 / 0 |
| CO-3817 | subsidized_employment_wages | none | 0 / 0 |
| CO-3818 | short_term_employment_wages | none | 0 / 0 |
| CO-3819 | short_term_employment_ended_through_own_fault | none | 0 / 0 |
| CO-3910 | wages_gross_received_prior_thirty_days | none | 0 / 0 |
| CO-3921 | wages_pay_frequency | none | 4 / 7 |
| CO-3922 | wages_gross_per_pay_period | none | 4 / 7 |
| CO-3923 | employment_began_or_ended_prior_thirty_days | none | 0 / 0 |
| CO-4010 | infrequent_or_irregular_earned_income_received | none | 3 / 3 |
| CO-4161 | room_and_board_payments_received | none | 4 / 5 |
| CO-4162 | room_and_board_payers_count | none | 2 / 5 |
| CO-4163 | room_and_board_provision_costs | none | 2 / 1 |
| CO-4164 | room_and_board_payments_are_foster_care | none | 1 / 1 |
| CO-4166 | snap_earned_income_received_after_application_date | none | 0 / 0 |
| CO-4301 | wioa_on_the_job_training_wages | none | 0 / 0 |
| CO-4302 | summer_youth_employment_wages | none | 0 / 0 |
| CO-4310 | combat_zone_pay_received | none | 0 / 0 |
| CO-4311 | scsep_payments_received | none | 0 / 0 |
| CO-4313 | military_pay_education_deductions | none | 0 / 0 |
| CO-4325 | annual_contract_pay | none | 0 / 1 |
| CO-4326 | annual_contract_wages_received | none | 0 / 1 |
| CO-4327 | self_employment_is_annual_support | none | 1 / 0 |
| CO-4328 | self_employment_start_date | none | 0 / 0 |
| CO-4341 | wages_from_owned_llc_or_s_corporation | none | 0 / 0 |
| CO-4342 | self_employment_has_changed_substantially | none | 0 / 0 |
| CO-4347 | farming_self_employment_end_date | none | 0 / 2 |
| CO-4455 | employer_vendor_payments_received | none | 0 / 0 |
| CO-4461 | self_employment_hours_worked | none | 2 / 0 |
| CO-4465 | self_employment_is_farm_operation | none | 0 / 0 |
| CO-4504 | scsep_wages | none | 0 / 0 |
| CO-4505 | employer_health_insurance_subsidy_received | none | 0 / 0 |
| CO-4506 | in_kind_compensation_value | none | 1 / 0 |
| CO-4618 | pass_set_aside_earned_income | none | 17 / 5 |
| CO-4831 | room_only_provision_costs | none | 0 / 0 |
| CO-4833 | board_only_payers_count | none | 0 / 0 |
| CO-4834 | board_only_provision_costs | none | 0 / 0 |
| CO-4881 | decennial_census_wages_received | none | 1 / 1 |
| CO-5209 | difficulty_of_care_payments_received | none | 1 / 4 |

### Resources (65 supplied facts)
| Item | Identifier | Readers at HEAD | Statements removed (households / rule tests) |
|---|---|---|---|
| CO-824 | uncompensated_transfer_value_in_lookback | none | 58 / 9 |
| CO-825 | transfer_was_exempt | none | 58 / 9 |
| CO-826 | home_equity | none | 77 / 26 |
| CO-1577 | has_trust_interest | none | 115 / 2 |
| CO-1579 | owns_annuity | none | 115 / 2 |
| CO-3390 | liquid_resources_value | none | 499 / 18 |
| CO-3392 | retirement_accounts_value | none | 32 / 12 |
| CO-3393 | real_property_other_than_home_equity | none | 32 / 4 |
| CO-3394 | vehicles_equity_value | none | 31 / 1 |
| CO-3395 | transportation_vehicle_equity_value | none | 31 / 1 |
| CO-3396 | life_insurance_cash_surrender_value | none | 20 / 3 |
| CO-3397 | life_insurance_face_value | none | 37 / 3 |
| CO-3401 | owns_and_lives_in_home | none | 3 / 0 |
| CO-3834 | resource_transfer_date | none | 4 / 10 |
| CO-3835 | resource_transfer_uncompensated_value | none | 4 / 10 |
| CO-3836 | af_transfer_found_not_twfc | none | 0 / 0 |
| CO-3850 | life_insurance_newest_policy_purchase_date | none | 6 / 0 |
| CO-3851 | life_insurance_payments_in_lookback | none | 6 / 0 |
| CO-3855 | revocable_burial_trust_value | none | 26 / 3 |
| CO-3856 | revocable_prepaid_burial_contract_value | none | 14 / 0 |
| CO-3857 | burial_spaces_value_beyond_family_needs | none | 0 / 0 |
| CO-4009 | resource_transfer_returned_date | none | 0 / 0 |
| CO-4155 | snap_resource_transfer_was_to_qualify | none | 0 / 0 |
| CO-4172 | federal_tax_refunds_held_value | none | 1 / 0 |
| CO-4173 | snap_eitc_held_while_participating_value | none | 0 / 0 |
| CO-4174 | education_savings_accounts_value | none | 0 / 0 |
| CO-4175 | liquid_resources_inaccessible_value | none | 0 / 0 |
| CO-4319 | prorated_income_held_value | none | 0 / 0 |
| CO-4335 | real_property_for_sale_value | none | 4 / 3 |
| CO-4336 | land_for_permanent_home_value | none | 0 / 0 |
| CO-4337 | installment_sale_contract_value | none | 0 / 0 |
| CO-4338 | real_property_costs_of_sale | none | 0 / 0 |
| CO-4340 | joint_liquid_resources_other_owners_share_value | none | 1 / 0 |
| CO-4343 | joint_real_property_other_owners_share_value | none | 0 / 0 |
| CO-4346 | former_farm_property_value | none | 0 / 0 |
| CO-4413 | state_tax_refunds_held_value | none | 0 / 0 |
| CO-4414 | retroactive_ssa_benefits_held_value | none | 0 / 0 |
| CO-4415 | able_account_value | none | 15 / 0 |
| CO-4416 | business_cash_and_convertible_assets_value | none | 0 / 0 |
| CO-4417 | replacement_proceeds_held_value | none | 0 / 0 |
| CO-4418 | replacement_proceeds_property_type | none | 0 / 0 |
| CO-4419 | replacement_proceeds_received_date | none | 0 / 0 |
| CO-4423 | nonbusiness_income_producing_property_equity_value | none | 0 / 0 |
| CO-4424 | nonbusiness_income_producing_property_net_annual_income | none | 0 / 0 |
| CO-4425 | home_use_production_property_equity_value | none | 0 / 0 |
| CO-4429 | retirement_accounts_taxes_due | none | 0 / 0 |
| CO-4431 | af_property_exempt_as_unsaleable_value | none | 0 / 0 |
| CO-4432 | trust_corpus_payable_to_person_value | none | 0 / 0 |
| CO-4435 | intends_to_return_home | none | 11 / 6 |
| CO-4603 | irrevocable_burial_funds_value | none | 14 / 1 |
| CO-4604 | burial_funds_accrued_interest | none | 14 / 3 |
| CO-4606 | real_property_co_owned_with_resident_value | none | 0 / 1 |
| CO-4607 | income_producing_property_equity_value | none | 14 / 4 |
| CO-4608 | income_producing_property_is_used_in_trade_or_business | none | 14 / 2 |
| CO-4609 | income_producing_property_net_return_annual | none | 0 / 2 |
| CO-4610 | lives_in_owned_home | none | 15 / 2 |
| CO-4612 | intent_to_return_home_is_documented_in_writing | none | 11 / 2 |
| CO-4613 | home_is_outside_colorado | none | 45 / 19 |
| CO-4614 | home_is_held_in_trust_or_entity | none | 45 / 19 |
| CO-4615 | home_has_recorded_beneficiary_deed | none | 47 / 19 |
| CO-4639 | retroactive_benefit_payment_unspent_value | none | 14 / 2 |
| CO-4640 | retroactive_benefit_payment_received_date | none | 0 / 2 |
| CO-4642 | investment_personal_property_value | none | 14 / 0 |
| CO-4643 | ma_trust_annuity_life_estate_value_available | none | 14 / 0 |
| CO-4932 | excluded_government_payments_held_value | none | 1 / 0 |

### Left without a reader by the records (3 supplied facts)
| Item | Identifier | Readers at HEAD | Statements removed (households / rule tests) |
|---|---|---|---|
| CO-4444 | unearned_income_offsetting_expenses | none | 1 / 0 |
| CO-4459 | retirement_early_withdrawal_penalty | none | 0 / 0 |
| CO-4557 | has_self_employment_seasonal_or_commission_earnings | none | 70 / 0 |

### Derived (1 item)
| Item | Identifier | Readers at HEAD | Statements removed (households / rule tests) |
|---|---|---|---|
| CO-1356 | has_earned_income | none | 0 / 0 |


The ledger goes from 2,431 items (763 supplied, 1,188 derived, 480 parameters) to 2,314 (647 supplied, 1,187 derived, 480 parameters). Rule tests go from 6,736 to 6,733: the three tests of CO-1356 (CO-1356-T1 to T3), which stated wages_gross and the self-employment facts beside an earnings record and pinned the scalar reading of an item no rule reads, go with it. Household expectations stay 5,097.

Items that named a retired fact in their meaning now name the record list and kind (wording only; no derivation changed): CO-080, CO-3924, CO-3927, CO-4062, CO-4321, CO-4323, CO-4420, CO-4622, CO-5000 (two kind meanings), CO-5101, CO-5106, CO-5107, CO-5204, CO-5205, CO-5212, CO-5213. Two `nearest` lists that named a retired fact were dropped (CO-3927, CO-4156). The transition sentences of CO-5000, CO-5100, CO-5300 and CO-5328 say the transition has ended. Rationale and precision text that tells the history of a retired fact is left as history.

## 5. Kept at first, then fixed (records E2/H2 leftovers)

When the step closed, three readers could not leave the scalar statements without moving answers, and the step's rule was zero answer change, so they were reported and kept (5.1, as written then). The product owner called keeping them a code smell and asked for them to be fixed; the leftovers round (2026-11-24, on this branch; change record volumes/co/changes/2026-11-24-e2-h2-leftovers.yaml) fixed both (5.2, 5.3). Every answer that moved is listed with its old and new value and the reason, from the fetched text; none moved silently.

### 5.1 What was kept, and why (as reported at the end of E2 and H2)

- **CO-2246 ma_requires_verification_of_sale_efforts** and **CO-2248 ma_requires_verification_of_joint_ownership** read the person facts ma_excess_real_property_is_for_sale (CO-2242) and ma_claims_co_owner_hardship_for_real_property (CO-2244). The holdings state the same findings per property (`ma_sale_efforts_unsuccessful`, `co_owner_would_lose_housing`, which the SSI method reads). Reading the record fields instead was not the same answer: an unstated person fact made the verification unknown for an aged, blind or disabled person, while an unstated record field took its default (false); and a finding stated with no real-property record (CO-2246-T1, CO-2248-T1 stated only a bank account) was true and would have been false.
- **CO-2872 af_has_countable_unearned_income** (and af_unearned_income_is_unverified, which reads it) summed every receipt but gambling winnings and sponsor payments, whatever the table's row, so it counted the receipt kinds that are earnings (special pay, payments for a room or meals only), which every counting table reads as earnings (`in_earnings`, `read_as_earnings`). Removing the copies E0's translator wrote in receipts moved CO-206 and CO-362, so the copies stayed in CO-206, CO-362 and rule test CO-5110-T4, the boundary lint knew them as copies, and the three receipt kinds stayed in the receipts schema and its eight tables.

### 5.2 Fixed: Medicaid's verifications read the holdings records; CO-2242 and CO-2244 retired

The text (volumes/co/documents/D-65.md, 10 CCR 2505-10 8.100.5, S1514 and S1515):

> b. Excess property will not be included in countable resources as long as reasonable efforts to sell it have been unsuccessful. [...] v) The client must continue reasonable efforts to sell and must submit verification of these efforts to the Eligibility Site on a quarterly basis. (M.2.b)

> h. When the applicant alleges that the sale of real property would cause undue hardship to the co-owner due to loss of housing, all of the following information must be obtained: [...] ii) Verification of joint ownership. (M.3.h)

What each verification now reads: the person's holdings records that the M.2.b and M.3.h exclusion reads (ma_excluded_real_property_value, CO-4620): the kinds Medicaid's holdings table counts less the real property exclusions (real_property; the home is not excess property), valued in the month and still held at its first moment. Per decision 4 (docs/plan-colorado.md: missing information is "cannot determine" unless the rule says otherwise):

| The person's real property records in the month | CO-2246 (sale efforts) | CO-2248 (joint ownership) |
|---|---|---|
| one states the finding true | true | true |
| every one states it false | false | false |
| one leaves it out, none states it true | cannot determine | cannot determine |
| none (a stated holdings list with no real property) | false | false |
| holdings not stated | cannot determine | cannot determine |
| not aged, blind or disabled | false | false |

- **A record that leaves the finding out.** The two fields had `default: false`, the meaning 8.100.5.E.3 (S4670) gives them for the exclusion: resources are available unless shown otherwise, so an exclusion not shown is not applied. That is a rule-given meaning for the resource test, not for the verification: M.2.b.v and M.3.h say nothing of a finding not stated. The fields now declare `when_absent` (what leaving them out means) instead of a default, the two resource readers give the absence its E.3 meaning themselves (`otherwise` false in CO-4620 and CO-5323, so no resource figure moves), and the verifications read the field as stated: unknown when a record leaves it out, and the field is reported missing (docs/operators.md, "Receipt records").
- **No real property: false, not "not applicable".** M.2.b.v asks the client to verify the efforts to sell excess property that the exclusion leaves out; with no real property beyond the home there is nothing excluded and nothing to sell. M.3.h applies "When the applicant alleges that the sale of real property would cause undue hardship"; a person with no real property alleges nothing about its sale. The items answer whether the verification is required (yes/no), and for such a person it is not: false. A yes/no item has no "not applicable" value, and none is needed, since false is the true answer to the question asked.
- **The old tests.** No rule test or stored household expected unknown for a case with no real property. CO-2246-T1 and CO-2248-T1 expected true for a person fact stated beside a bank account only; under the text that finding is about no property, so they were restated with a real property record that states the finding (still true), and the bank-account-only case is the new T4 of each (false, with the reason in its title). New tests: CO-2246-T5 to T9 (unstated finding, one record stated and one not, a lot sold the month before, the home, holdings not stated), CO-2248-T5, T6.
- **Retired:** ma_excess_real_property_is_for_sale (CO-2242) and ma_claims_co_owner_hardship_for_real_property (CO-2244), with 48 statements in 24 persons of 14 stored households and 8 in the CO-4620 tests. They are taken off the external check's refusal list (src/external/dictionary.ts: they were findings, not income or resource figures; a row naming one is now refused as any fact the template lacks) and off the holdings generator's kept facts; the template is regenerated (the two fields' "blank:" entries); the example still gives 13 match, 2 differ.

Answers that moved (all intermediate verification items; no household expectation and no outcome moved):

| Households | Item | Old | New | Why |
|---|---|---|---|---|
| CO-532 p1 (October 2026 to February 2027), CO-533 p1 (October to December 2026), CO-910 p1 (August to December 2026): 13 person-months | ma_requires_verification_of_sale_efforts (CO-2246) | true | false | The person fact stated the finding true, but each household's holdings are one bank account of 1,000 (the stories say "no other property"): no excess property, nothing M.2.b leaves out, no efforts to verify. Their sale-efforts document was stated received, so ma_sale_efforts_verification_is_pending stays false. |
| 221 persons of 159 stored households, aged, blind or disabled, whose holdings list states no real property and who stated neither person fact: 1,103 person-months | CO-2246, CO-2248 and ma_joint_ownership_verification_is_pending (CO-2249); ma_sale_efforts_verification_is_pending (CO-2247) in 1,000 of them | unknown | false | Before, the unstated person fact left the verification unknown; the holdings now state there is no real property, so neither paragraph applies (table above). In the other 103 person-months the sale-efforts document is stated received, so ma_sale_efforts_verification_is_pending was false already (all(unknown, not true) is false). |

No value moved for the 20 persons who stated the facts false (CO-01, CO-02, CO-152 to CO-154, CO-186 to CO-189, CO-610): their holdings state no real property, so false stays false; CO-185 states its lot's finding on the record, so true stays true. The persons whose real property records state no finding (CO-418 p1, CO-793 p1, CO-794 p1 and p3) are not aged, blind or disabled in the months read, so both verifications are false before and after (a stored household that stated such a record for an aged, blind or disabled person would now be cannot determine; none does).

### 5.3 Fixed: Adult Financial's test of countable unearned income; the receipt copies and the three receipt kinds retired

The paragraph CO-2872 cites for Adult Financial is 9 CCR 2503-5 3.520.5.A (S880; volumes/co/documents/D-105.md):

> A. The Income and Eligibility Verification System (IEVS) provides for the exchange of information on clients with the SSA and the Colorado Department of Labor and Employment (DOLE). [...] Source agency records shall be matched on a regular basis to identify potential earned and unearned income, and resources: [...] 2. DOLE wage data shall not be considered verified upon receipt. [...] 3. Prior to approval of grant payments, the county department shall, at a minimum, verify potential income or unemployment benefits for the client, client's spouse, and sponsor(s).

So the test is the unearned half of a verification that treats earned and unearned income each as what it is. 3.520.783.C.2.b-d (S4380) make board, room, and room and board payments earned income ("c. Room (to provide a person with lodging only) payments to the client, client's spouse, or sponsor(s) shall be considered earned income in the month received"), and the earnings records state them (boarder_payments), which af_earned_income_is_unverified (CO-3882) reads for verification. A receipt copy of them is not unearned income to verify.

- **The fix.** CO-2872 leaves out the kinds Adult Financial's own receipt table reads as earnings (af_receipt_treatment_table, CO-5016: the read_as_earnings rows: special pay, payments for meals or a room only), as Adult Financial's other readers of every receipt already did (CO-4011, CO-2392). The table's rows that exclude a kind (excluded, not_income) stay in the test: A.3 verifies "potential income", not only the income counted. Reading only the counted rows was measured and not done: it would move 138 values in 17 stored households (CO-171, CO-175, CO-319, CO-358, CO-373, CO-409, CO-423, CO-432, CO-459, CO-580, CO-756, CO-773, CO-803, CO-1126, CO-1166 besides CO-206 and CO-362), 26 of them af_unearned_income_verification_is_pending; whether the verification skips exempt income is the Adult Financial owner's question. New test CO-2872-T4 (a room-only payment stated as earnings: false).
- **The copies removed:** CO-206 p1 ({kind: room_only_payment, amount: 400}), CO-362 p1 (amount 600) and rule test CO-5110-T4 (board_only_payment 20; still true: the boarder record is $20 of irregular income, within $30). Each household records the move in a comment.
- **The three receipt kinds retired.** With no copy left and no reader counting one, uniformed_services_special_pay, board_only_payment and room_only_payment leave the receipts schema (CO-5000), as design 2.3 planned for E2, with their rows in the eight receipt tables (LEAP CO-5001, SNAP CO-5010, Adult Financial CO-5016, MAGI CO-5500, SSI method CO-5510, Colorado Works CO-5650, CCCAP CO-5720, SUN Bucks CO-5730) and the options only those rows used (counted_in_earnings, read_from_earnings, read_as_earnings, in_earnings); CO-4011, CO-2392 and CO-2872 lose the condition on read_as_earnings, which nothing can reach. The money is an earnings record: boarder_payments with provides board_only or room_only, and the earnings kind uniformed_services_special_pay. This changes no answer (every rule-test value and every value of the readers identical before and after). The rule tests that stated such receipts: CO-4369-T7, T8 state the payment as an earnings record, CO-5651-T9 drops the two receipts (250 either way, as they were read as earnings), CO-2872-T4 states the earnings record only; CO-4361-T11, which pinned that the receipt copies were not read by Colorado Works' boarder income, is removed, since such a receipt can no longer be stated. The receipts generator drops its three variants of these kinds (1,626 to 1,566 generated households; MA-1 to MA-6 over 1,791 households, the 60 variants and CO-206 and CO-362, whose only receipt it was). The boundary lint drops the copy class and the special-pay pair.

Answers that moved:

| Household | Item | Months | Old | New | Why |
|---|---|---|---|---|---|
| CO-206 p1 | af_has_countable_unearned_income (CO-2872) | July to November 2026 | true | false | Her only receipt was the copy of the lodger's $400 room-only payment, earned income by 3.520.783.C.2.c; she has no unearned income. |
| CO-206 p1 | af_unearned_income_is_unverified (CO-3883) | July to November 2026 | unknown | false | all(has countable unearned income, not verified): false and anything is false (before, true and unearned_income_is_verified not stated). |
| CO-362 p1 | af_has_countable_unearned_income | July to November 2026 | true | false | The same, for a $600 room-only payment. |
| CO-362 p1 | af_unearned_income_is_unverified | July to November 2026 | unknown | false | As for CO-206. |

No expectation of either household moved: they are Colorado Works stories, and Colorado Works reads the earnings record only.

### 5.4 Still kept

**Kept because they are not scalar statements of the lists:** seven resource facts of 2.2 (the qualifying income trust, the penalty start, the snapshot figure, the CSRA figures and findings). The derived ssi_countable_resources_couple (CO-801) and ssi_countable_resources_of_couple (CO-2861), which design 4.2 listed for H2 when they were supplied figures, are derived from the holdings since H1; CO-2861 has no reader and CO-801 is read only by it. They carry five rule tests and are listed in docs/reviews/orphan-facts.md for the owner, not retired here.

### 5.5 Gate of the leftovers round

On the final tree, merged with origin/ccr-9d19bf4c-wmnwcl at 90a091b (the faster check, the report-only checks and the stale-disposition cleanup):

- `node scripts/sync-manifest.mjs co`: 2,312 items (2,314 less CO-2242 and CO-2244).
- `npm run typecheck`: clean. `npx vitest run`: 1,214 of 1,214 (1,200 before the merge; the merge adds 14), no pin moved.
- `npm run receipts:harness -- --all-programs`: MA-1 to MA-6 over 1,791 households (1,853 less the 60 generated variants of the retired kinds and CO-206 and CO-362, whose only receipt was the copy), 0 violations. `npm run records:harness -- --list earnings --all-programs`: 0 boundary findings (the copy class is gone), ME-1 to ME-4 over 799 households, 0 violations. `-- --list holdings --all-programs`: 0 joint findings, MH-1 to MH-5 over 561 stored and 368 generated households, 0 violations. No new violation.
- `CHECK_BASE=origin/main npm run check`: OK; 6,742 rule tests (6,733 + 9 new tests of CO-2246 and CO-2248 + CO-2872-T4 - CO-4361-T11), 5,097 household expectations, 21 change-impact flags all dispositioned (the nine re-keys of volumes/co/changes/2026-11-24-e2-h2-leftovers.yaml, moved there from 2026-11-24-e2-h2.yaml and 2026-11-24-stale-cleanup.yaml so no disposition is stale), 11,999 conformance checks.
- `npm run external:template`: regenerated (the two holdings fields' blank meaning; the three receipt kinds gone from allowed-values.csv). `npm run external:check -- external-check/example`: 13 match, 2 differ, as before.

## 6. The record checks after the step

`npm run receipts:harness` and `npm run records:harness -- --list earnings|holdings` keep every check of the records themselves and drop the comparison with the scalar facts:

| Check | Before | After |
|---|---|---|
| Translation (records = translation of the scalar facts) | receipts, earnings, holdings | retired (no scalar facts) |
| Old against new (every outcome at the phase baseline against the ledger on disk; allowed-difference files) | receipts (c29d326), earnings (9650b0c), holdings (0224913) | retired, with the 61 allowed-difference files |
| Boundary lint (receipts and earnings) | transition copies, findings | the same; a copy is recognised by the lint itself (MOVING_KINDS moved into boundary.ts). Leftovers round: no copy is left and the three receipt kinds are retired, so the copy class and the special-pay pair are gone; every pair is a finding |
| Joint-holding lint; relations give valid statements | yes | yes |
| Metamorphic relations | over translated households | over the records directly |

The generated households are written in records alone (`scripts/receipts/generate.ts`, `scripts/records/generate-earnings.ts`, `generate-holdings.ts`): each base is today's stored household with the varied list emptied for every person, and each variant states the records the retired translation wrote for the fact it varied. Checked against the old pipeline (generate in scalar facts, then translate) on the same bases: the holdings households are identical (368 of 368); the earnings households are identical (459 of 459) once the old SCSEP duplicate is dropped (the same pay stated for LEAP and for SNAP, two variants translating to the same records; 17 households); the receipts households differ by design, since the old ones were built from the phase-2 baseline's households (c29d326), which stated no SSI amount (every variant carried an SSI receipt of unknown amount) and left the other persons' receipts unstated, and stated lump sums for every month; the new ones start from today's households with every person's receipts stated empty and a one-time receipt in the month determined.

| Relations | Before (households, violations) | After |
|---|---|---|
| MA-1 to MA-6 (receipts) | 1,864, 0 | 1,853, 0 |
| Families F1 to F7, M1 to M4 | 40 rows, 0 | 40 rows, 0 |
| ME-1 to ME-4 (earnings, per track) | 816, 0 | 799, 0 (the 17 duplicates) |
| MH-1 to MH-5 (holdings, per track) | 650 (MH-3: 114), 0 | 650 (MH-3: 114), 0 |
| Boundary lint | 0 findings, 3 copies | 0 findings, 3 copies |
| Joint-holding lint | 0 findings | 0 findings |

The registry files (scripts/records/programs/*.ts) lose `figures`, which only the old-against-new comparison read. `scripts/audit/answer-diff.ts` (one ledger against another on the same households) reads the record-built generated households.

## 7. Change impact

Retiring facts no rule reads flagged nothing (a deleted item raises no flag), as expected. The meaning rewording moved the fingerprints of the items downstream of CO-5000, CO-4323, CO-5101 and the Medicaid tables, which reopened nine earlier dispositions; each is re-keyed in volumes/co/changes/2026-11-24-e2-h2.yaml with its earlier reason kept. No flag points to a missed reader.

## 8. Gate (final tree, merged with origin/ccr-9d19bf4c-wmnwcl including the external sample check kit)

- `node scripts/sync-manifest.mjs co`: 2,314 items.
- `npm run typecheck`: clean. `npx vitest run`: 1,200 of 1,200 after the merge (1,161 before it; two UI pins re-pinned with a comment: the household what-if's amount is `earnings.wages`, was `wages_gross`; Colorado Works' supplied facts 35, was 36).
- Record checks: `npm run receipts:harness` (MA-1 to MA-6 over 1,853 households, 40 family rows, 0 violations), `npm run records:harness -- --list earnings` (0 boundary findings, 3 copies; 0 violations), `-- --list holdings` (0 joint findings; 0 violations).
- `CHECK_BASE=origin/main npm run check`: OK; 6,733 rule tests (6,736 less the three tests of CO-1356), 5,097 household expectations, 21 change-impact flags all dispositioned, 11,990 conformance checks (11,993 less the same three tests).
- External sample check: `npm run external:template` regenerated (the reworded meanings only); src/external/dictionary.ts names every retired fact; `npm run external:check -- external-check/example`: 13 match, 2 differ, as before.

Runtime: `npm run check` is unchanged (3 min 30 s before, 3 min 37 s after on a loaded machine): it never ran the harnesses. The record checks went from about 12 minutes (receipts 561 s, earnings 122 s, holdings 78 s, as their last reports state) to about 4 minutes (receipts 167 to 224 s, earnings 32 to 39 s, holdings 20 to 23 s), the old-against-new evaluation of two ledgers gone.
