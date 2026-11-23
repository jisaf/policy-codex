# Earned-income records, step E0: the foundation

Step E0 of docs/design-earned-and-resource-records.md (4.2, E0 row), by the integration owner, on the branch that has unearned income on receipt records in every program with the scalar unearned facts retired (receipts phase 3, f5275a6; docs/reviews/receipts-migration-3.md). Decisions D1-D11 (design section 7) are taken and are not reopened here. E0 builds the statement layer and the foundation the six E1 tracks start from: the `earnings` list, its seven counting tables, the boundary with receipts, the translator, the generalised harness with a registry split per track, and the restatement of every stored household and rule test that states earned income. **No rule reads `earnings` in E0, and E0 changes no eligibility or benefit answer**: the records harness compares every outcome and each track's earned figures, on the ledger before E0 (f5275a6) and after, with 0 differences.

## 1. Commits

| Commit | Step | What |
|---|---|---|
| 549d25a | 1 | `earnings` (CO-5100): 22 kinds, 25 fields, each required, defaulted by its rule (D3) or saying what absence means; OQ-1020 |
| 4b466e8 | 2 | Seven earnings counting tables (CO-5101 to CO-5107, 154 rows), every row today's reading, cited or marked; excerpts S4100-S4107; OQ-1021 to OQ-1024 |
| e7f1154 | 3 | The boundary in every receipt table and CO-5000; LEAP's receipt rows the rule names cited (S4100) |
| d9a5879 | 4 | Translator, `npm run records:harness -- --list earnings\|holdings\|receipts`, the registry split, the boundary lint |
| b7926f7 | 5 | 316 stored households and 456 rule tests restated with earnings records by the translator |
| (docs) | 6 | docs/operators.md, conventions.md, plan-colorado.md, this review, docs/reviews/receipts-migration-3.md |
| (changes) | 7 | volumes/co/changes/2026-11-23-earnings-e0.yaml (change-impact dispositions); UI count pins |

## 2. The `earnings` list (CO-5100)

A supplied fact of the same type as receipts (`list of receipts`, scope person, program All), read by the same operators (P55-P57); no new operator (P58 `largest` is H0's). 22 kinds, as design 2.2 lists them: `wages`, `uniformed_services_special_pay`, `work_study`, `wioa_on_the_job_training`, `summer_youth_employment`, `scsep_employment`, `subsidized_employment`, `decennial_census_employment`, `difficulty_of_care_payment`, `in_kind_pay`, `employer_vendor_payment`, `employer_health_insurance_subsidy`, `self_employment_receipts`, `farm_self_employment_receipts`, `boarder_payments`, and the cost kinds `business_cost_operating`, `_interest`, `_capital_principal`, `_depreciation`, `_home_space`, `_vehicle`, `_boarder_provision`.

Fields (each states exactly one of required, a default, or what absence means):

| Field | Declared | Restates |
|---|---|---|
| kind, amount | required | the fact's identity and value |
| month | when_absent: every month | the month a person-month fact is stated for |
| date | required where read | snap_earned_income_received_after_application_date (the day after the SNAP application date) |
| frequency, per_payment | default monthly; required where read | wages_pay_frequency, wages_gross_per_pay_period (CO-3921, CO-3922) |
| irregular, retroactive | default false (D3) | infrequent_or_irregular_earned_income_received (CO-4010) |
| job_start_date, job_end_date | when_absent: began before, continues through, the months the case covers | cw_new_source_earned_income (the first of its month), self_employment_start_date (CO-4328), farming_self_employment_end_date (CO-4347) |
| temporary_job | default false | short_term_employment_wages (CO-3818) |
| ended_through_own_fault | required where read | CO-3819 |
| annual_contract_pay | when_absent: not under an annual contract | annual_contract_pay with annual_contract_wages_received (CO-4325, CO-4326) |
| paid_as_business_owner | default false | wages_from_owned_llc_or_s_corporation (CO-4341) |
| combat_zone | default false | combat_zone_pay_received (CO-4310) |
| pass_set_aside, education_deduction | default 0 | pass_set_aside_earned_income (CO-4618), military_pay_education_deductions (CO-4313) |
| net_for_tax, hours | required where read | self_employment_net_earnings_for_tax (CO-024), self_employment_hours_worked (CO-4461) |
| farm | default false | self_employment_is_farming, self_employment_is_farm_operation (CO-3720, CO-4465), on cost records |
| annual_support, changed_substantially | required where read | CO-4327, CO-4342 |
| boarders, provides, foster_care | required where read; foster_care default false | room_and_board_payers_count, room_and_board_payments_are_foster_care (CO-4162, CO-4164), board_only_payers_count (CO-4833) |

Two fields of design 2.2 are not in the schema: `start_date` is `job_start_date` (a business's start is the job's start), and `pretax_deductions` stays the tax-return fact it is (CO-080 holds IRA and student-loan deductions too, not only what is withheld from a pay), with magi_other_taxable_income and foreign_earned_income_excluded, outside the list as design 1.1 has them.

## 3. The seven earnings counting tables

| Table | Program | Rows | Marked for sign-off |
|---|---|---|---|
| CO-5101 snap_earnings_treatment_table | SNAP | 22 | 8 |
| CO-5102 leap_earnings_treatment_table | LEAP | 22 | 11 |
| CO-5103 af_earnings_treatment_table | Adult Financial | 22 | 12 |
| CO-5104 cw_earnings_treatment_table | Colorado Works | 22 | 9 |
| CO-5105 cccap_earnings_treatment_table | CCCAP | 22 | 10 |
| CO-5106 ma_magi_earnings_treatment_table | Medicaid MAGI (CHP+ by its link) | 22 | 11 |
| CO-5107 ma_ssi_earnings_treatment_table | Medicaid SSI method | 22 | 15 |
| **7 tables** | | **154** | **76** |

Every row is today's reading: what the program's items do now with the scalar fact the kind restates (a part of wages_gross a program does not subtract is counted; a fact a program does not read is not counted or not deducted), so the table changes no answer when the program's E1 track moves its readers onto it. Options are the program's own words: `counted` and `excluded` with the paragraph; named rules (`counted_at_value`, `excluded_age_55_or_older`, `excluded_under_19_with_parent`, `excluded_in_combat_zone`, `counted_above_boarder_allowance`, `counted_loss_offset`, `counted_averaged_over_year`, `counted_net_for_tax`, `excluded_live_in_provider`, `deducted_from_boarder_payments`, `deducted_for_farm`); for costs `deducted` and `not_deducted`; and the marked rows: `counted_no_rule_excludes`, `not_deducted_no_rule_found`, `not_counted_no_rule_found`, `not_taxable_income` (MAGI), and two finding classes, `not_counted_text_counts` and `counted_text_excludes`, where today's reading differs from the text on file. Each table's meaning cites each row; its precision names, kind by kind, the fact the row's reading came from. CHP+ keeps no table: it reads Medicaid's MAGI household income by the adopted-method link of 10 CCR 2505-3 150.1 (S245), as phase 2 set up. SUN Bucks reads no earnings (its income test reads the household's reported income).

New excerpts, each from a document on file: S4100 (LEAP 3.752.21.B, M, N; 3.752.211.B, F; D-86), S4101 (7 CFR 273.9(c)(1), (vii)(B); D-13), S4102 (273.11(b)(1); D-15), S4103 (9 CCR 2503-6 3.605.2.E.1.a.3; D-81), S4104 (9 CCR 2503-5 3.520.783.B.3; D-80), S4105 (LEAP 3.752.23.Q, T; D-86), S4106 (8 CCR 1403-1 3.111.I.2.a-b; D-87), S4107 (10 CCR 2505-10 8.100.3.K.3-4, K.8, K.9.b, K.10.c-e; D-65).

## 4. The boundary with receipts (design 2.3, OQ-1020)

Earnings are money or in-kind value paid for work the person performed; every other payment is a receipt, including the stipends and allowances SNAP counts as earned (VISTA, AmeriCorps, training allowances stay receipts; SNAP's receipt table keeps `counted_as_earned`). Three receipt kinds fall on the earnings side: `uniformed_services_special_pay` (with `combat_zone`, it also replaces combat_zone_pay_received, CO-4310), `board_only_payment` and `room_only_payment` (`boarder_payments`, `provides: board_only` or `room_only`; room and board is already its own fact, CO-4161, translated to `provides: room_and_board`). The move is staged so that no answer changes:

- Each of the eight receipt tables states the move in its meaning and keeps the three rows with their reading until its program reads its earnings table, which carries the same reading; the kinds leave receipts in E2. CO-5000 states the boundary and the lint in its precision and its option meanings.
- During the transition a household that states one of the three receipts states it in both lists, the earnings record written by the translator from the receipt (a transition copy). No stored household or rule test states special pay; six statements of board-only or room-only payments are copied.
- The boundary lint (scripts/records/boundary.ts) flags a person who states the same amount in the same month as a receipt and an earnings record of a boundary pair (special pay; VISTA; AmeriCorps; training allowances and WIOA payments against wages and the training kinds; boarder payments against board-only, room-only, other taxable or non-taxable income and rents), and tells transition copies apart. It found one stored household (finding E0-F1, section 8).

The receipt kinds phase 2 deferred (adoption_subsidy, board-only and room-only, savings distributions, the SMIB refund, insurance cash value, the military allotment; design 4.1) were added with a row in every receipt table by receipts phase 3, step 2 (f4c1ce1), which also removed the adoption subsidy's second subtraction from Medicaid's deeming and Buy-In items and CCCAP's (docs/reviews/receipts-migration-3.md, section 3); no derivation reads the kind apart now, so E0 had nothing further to add there.

LEAP's receipt table (CO-5001): the rows marked counted because no rule excludes them though 9 CCR 2503-7 names them are now counted and cited, each checked against the fetched rule (D-86, S4100): pension (3.752.211.B, "Pension or retirement payments"), unemployment compensation (211.F), child support and child support arrears (3.752.21.N, "Income received from child support and spousal maintenance payments"), the adoption subsidy (21.M, "Income received from adoption assistance or subsidies"), interest and dividends and tax-exempt interest (21.B). LEAP's readers count `counted` and `counted_no_rule_excludes` alike, so no answer changes.

## 5. The translator (scripts/records/translate-earnings.ts)

Within a month, each fact the ledger defines as part of wages_gross is carved out of it, in a fixed order, into a record of its own kind or with its own field, each capped at what is left (an overlap the old facts allow is noted, never stated twice): combat-zone pay, work-study, SCSEP (scsep_wages and scsep_payments_received state the same pay for LEAP and SNAP; the larger is taken), WIOA on-the-job training, summer youth employment, subsidized employment, Census wages, Difficulty of Care payments, the employer's health insurance subsidy, short-term employment (temporary_job, ended_through_own_fault), annual-contract wages (annual_contract_pay), wages from an owned LLC or S corporation (paid_as_business_owner), Colorado Works' new-source wages (job_start_date the first of the month), SNAP's wages after the application date (dated the day after it), irregular earnings (irregular; the part beyond the wages is irregular self-employment receipts). What is left is the wages record, which carries the person's pay schedule and the education deduction. In-kind pay, an employer's vendor payments and boarders are records beside it; the business is one receipts record (a farm's when the person farms) with its fields, and each cost a cost record (on a farm, `farm: true`). The PASS set-aside sits on the wages record, else on the business. Wages or business receipts a person does not state stay unknown (a record with no amount), as the facts were: a person who states any earned fact gets an earnings list; one who states none keeps the list unstated.

Not restated, by design: wages_gross_received_prior_thirty_days (CO-3910) and employment_began_or_ended_prior_thirty_days (CO-3923). A thirty-day total spans two months and is not one pay, and the flag does not say whether a job began or ended, or when. Seven stored households (CO-125, CO-133, CO-134, CO-135, CO-454, CO-455, CO-456) and seven rule tests (CO-3915-T1 to T3, CO-985-T7, CO-1455-T5, CO-3912-T1, CO-3925-T4) state them; the LEAP and CCCAP tracks state those pays with their dates. Two rule tests (CO-330-T7, CO-4930-T5) state SNAP's wages after the application date with no application date, so that record is undated (the date is required where read). Two (CO-4629-T1, T2) state a PASS set-aside larger than any pay; it is kept on the wages record. Every note is in scripts/records/results/earnings.txt.

`npm run records:translate` (scripts/records/apply-earnings.ts) writes the translation and checks that every household and test reads back as its fixed point.

## 6. The harness, and the registry split

`npm run records:harness -- --list earnings` (scripts/records/harness.ts; `--list receipts` runs the receipts harness unchanged; `--list holdings` reports that H0 has not started):

1. **Translation**: every stored household's and rule test's earnings are the translation of its earned facts. Result: 316 of 326 households and 456 rule tests state earnings; 0 are not the translation.
2. **Boundary lint**: 0 findings; 6 transition copies; 1 known pair dispositioned (allowed/boundary.yaml, E0-F1).
3. **Old against new**, every program's outcomes and each track's earned figures, against f5275a6 (the commit before E0): 326 stored households, 163,164 values, **0 differences**; 308 generated households (each track's bases varied one earned fact at a time), 115,836 values, **0 differences**.
4. **Metamorphic relations** ME-1 split, ME-2 order, ME-3 month, ME-4 cost relabel (ME-5 dated against stream is a SNAP family): run on the figures each track registers as reading the records, none yet; each track's relations its rules say are not invariant are listed with the rule (SNAP and LEAP ME-1, ME-3; Adult Financial, CCCAP and Medicaid ME-3).

`npm run receipts:harness -- --all-programs`: 0 unexplained (section 9).

The registry is split per design 4.3, rule 3, so the six tracks never edit one list: scripts/records/programs/<track>.ts (snap, leap, af, cw, cccap, medicaid) holds the track's tables, its figures (set in E0 to today's earned figures, so E0 is measured on them), its metamorphic figures, the relations not invariant with the rule, and its generated-household bases; scripts/records/allowed/e1-<track>.yaml holds its allowed differences (empty), beside e0.yaml (empty: E0 changes no answer) and boundary.yaml. The harness loads the directories. The baseline each track measures itself against is EARNINGS_BASELINE in scripts/records/harness.ts, the end of E0 (re-pointed at each merge wave, rule 5).

## 7. Rows for the owner's signature (76 of 154)

Each row below rests on no rule on file, or on a reading that differs from the text (the findings, section 8). The program owner signs each knowingly, or changes it in the program's E1 track as a cited difference. A row cited in its table's meaning is not listed.

| Table | Kind | Row | Why it is marked |
|---|---|---|---|
| CO-5101 snap | uniformed_services_special_pay | excluded_in_combat_zone | the outside-a-combat-zone half is counted because no rule excludes it |
| CO-5101 snap | subsidized_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5101 snap | decennial_census_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5101 snap | difficulty_of_care_payment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5101 snap | employer_vendor_payment | not_counted_text_counts | FINDING: not counted today though the text on file counts it |
| CO-5101 snap | employer_health_insurance_subsidy | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5101 snap | business_cost_home_space | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5101 snap | business_cost_vehicle | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5102 leap | uniformed_services_special_pay | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5102 leap | wioa_on_the_job_training | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5102 leap | summer_youth_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5102 leap | subsidized_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5102 leap | decennial_census_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5102 leap | difficulty_of_care_payment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5102 leap | boarder_payments | not_counted_no_rule_found | not read today; no text on file names it either way |
| CO-5102 leap | business_cost_capital_principal | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5102 leap | business_cost_depreciation | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5102 leap | business_cost_home_space | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5102 leap | business_cost_boarder_provision | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5103 af | wioa_on_the_job_training | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5103 af | summer_youth_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5103 af | scsep_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5103 af | subsidized_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5103 af | decennial_census_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5103 af | difficulty_of_care_payment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5103 af | employer_vendor_payment | not_counted_no_rule_found | not read today; no text on file names it either way |
| CO-5103 af | employer_health_insurance_subsidy | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5103 af | boarder_payments | not_counted_no_rule_found | not read today; no text on file names it either way |
| CO-5103 af | business_cost_home_space | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5103 af | business_cost_vehicle | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5103 af | business_cost_boarder_provision | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5104 cw | uniformed_services_special_pay | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5104 cw | wioa_on_the_job_training | counted_text_excludes | FINDING: counted today though the text on file excludes it (in whole or part) |
| CO-5104 cw | summer_youth_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5104 cw | scsep_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5104 cw | decennial_census_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5104 cw | difficulty_of_care_payment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5104 cw | employer_vendor_payment | not_counted_no_rule_found | not read today; no text on file names it either way |
| CO-5104 cw | employer_health_insurance_subsidy | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5104 cw | business_cost_vehicle | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5105 cccap | wioa_on_the_job_training | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5105 cccap | summer_youth_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5105 cccap | scsep_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5105 cccap | subsidized_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5105 cccap | decennial_census_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5105 cccap | difficulty_of_care_payment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5105 cccap | employer_health_insurance_subsidy | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5105 cccap | business_cost_interest | deducted_for_farm | the non-farm half is not deducted, no text naming interest |
| CO-5105 cccap | business_cost_home_space | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5105 cccap | business_cost_boarder_provision | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5106 ma_magi | uniformed_services_special_pay | not_taxable_income | not counted because no rule counts it as taxable income (signed as a silent row) |
| CO-5106 ma_magi | work_study | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5106 ma_magi | wioa_on_the_job_training | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5106 ma_magi | summer_youth_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5106 ma_magi | scsep_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5106 ma_magi | subsidized_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5106 ma_magi | decennial_census_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5106 ma_magi | in_kind_pay | not_counted_no_rule_found | not read today; no text on file names it either way |
| CO-5106 ma_magi | employer_vendor_payment | not_counted_no_rule_found | not read today; no text on file names it either way |
| CO-5106 ma_magi | employer_health_insurance_subsidy | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5106 ma_magi | boarder_payments | not_counted_no_rule_found | not read today; no text on file names it either way |
| CO-5107 ma_ssi | uniformed_services_special_pay | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5107 ma_ssi | work_study | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5107 ma_ssi | wioa_on_the_job_training | counted_text_excludes | FINDING: counted today though the text on file excludes it (in whole or part) |
| CO-5107 ma_ssi | summer_youth_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5107 ma_ssi | scsep_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5107 ma_ssi | subsidized_employment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5107 ma_ssi | difficulty_of_care_payment | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5107 ma_ssi | in_kind_pay | not_counted_text_counts | FINDING: not counted today though the text on file counts it |
| CO-5107 ma_ssi | employer_vendor_payment | not_counted_no_rule_found | not read today; no text on file names it either way |
| CO-5107 ma_ssi | employer_health_insurance_subsidy | counted_no_rule_excludes | counted because no rule excludes it |
| CO-5107 ma_ssi | boarder_payments | not_counted_text_counts | FINDING: not counted today though the text on file counts it |
| CO-5107 ma_ssi | business_cost_interest | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5107 ma_ssi | business_cost_home_space | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5107 ma_ssi | business_cost_vehicle | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |
| CO-5107 ma_ssi | business_cost_boarder_provision | not_deducted_no_rule_found | not deducted today; no text on file names the cost either way |

## 8. Findings for the E1 tracks (today's answers the text on file does not support)

E0 changes no answer, so each is kept as today's reading and named here, for the track to fix as a cited difference.

- **E0-F1 (SNAP, Colorado Works, CCCAP; a stored household).** CO-425 (probe C3-7, SNAP financial coverage 3) states its $600 of room and board twice: as room_and_board_payments_received (CO-4161, "not part of the wages, self-employment or unearned income facts") and as other taxable unearned income (retired other_unearned_income_taxable 600; its receipt is other_taxable 600), although its own description says p1 has "no wages, $600 of room and board payments". SNAP, Colorado Works and CCCAP count the $600 both as unearned income and as boarder income. Its one expectation (earned-income verification) does not turn on it. The boundary lint found it; it is dispositioned in scripts/records/allowed/boundary.yaml for the SNAP track to restate (the other_taxable receipt removed, a cited fix under 10 CCR 2506-1 4.403.2).
- **E0-F2 (SNAP; OQ-1021).** 7 CFR 273.9(c)(1)(vii)(B) (S4101) counts wages an employer diverts to a third party for a household expense; no SNAP item reads employer_vendor_payments_received (CO-4455), so SNAP counts none of it (row `not_counted_text_counts`). No stored household states it; one rule test (CCCAP's) does.
- **E0-F3 (Colorado Works; OQ-1022).** 9 CCR 2503-6 3.605.4.B.16 (S2606) exempts "Income received through the Workforce Innovation and Opportunity Act"; Colorado Works counts WIOA on-the-job training wages as part of wages_gross (row `counted_text_excludes`). Whether on-the-job training wages are such income is the owner's question.
- **E0-F4 (Medicaid SSI method; OQ-1023).** 10 CCR 2505-10 8.100.3.K (S4107) makes in-kind pay earned income (K.3-4), counts board, room, and room and board payments as earned income above the allotment and the costs (K.10.c-e), and exempts a dependent child's WIA wages for six months a year (K.8.c); the SSI-method items read none of the first two and count the third (rows `not_counted_text_counts` for in_kind_pay and boarder_payments, `counted_text_excludes` for wioa_on_the_job_training).
- **E0-F5 (Adult Financial, MAGI; OQ-1024).** Combat-zone pay stated as part of wages_gross is counted by Adult Financial and MAGI, whose receipt rows exclude the 37 U.S.C. 310 special pay (3.520.786 with 20 CFR 416.1124(c)(19); not taxable). The earnings rows carry the receipt rows' reading. No stored household or rule test states either.
- Smaller, recorded in the rows: SNAP deducts no home-space or vehicle cost (273.11(b)(1) "include, but are not limited to"); the SSI method deducts only the operating costs (CO-1703), not interest; CCCAP deducts interest only for a farm; LEAP, Adult Financial and MAGI read no boarder payments; LEAP excludes an employer's vendor payments under 3.752.23.T (S4105), which today's items match by not reading them.

## 9. Gates

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written; 8 items added (CO-5100 to CO-5107) |
| `npm run typecheck` | passes (scripts/records added to tsconfig) |
| `npx vitest run` | see the commit of step 7 |
| `npm run receipts:harness -- --all-programs` | 0 unexplained (319 stored, 1,626 generated households; the classes of phases 2 and 3 only) |
| `npm run records:harness -- --list earnings --all-programs` | OK: translation 0 stale, boundary 0 findings, 0 differences |
| `CHECK_BASE=origin/main npm run check` | see the commit of step 7 (dispositions in volumes/co/changes/2026-11-23-earnings-e0.yaml) |

## 10. What each E1 track starts from

Every track has: its earnings table with every row today's reading (it changes only its own table's cells, design 4.3 rule 2; a new kind or field is a request to the integration owner in the track's review doc); every stored household and rule test already stating earnings beside the scalar facts; scripts/records/programs/<track>.ts with today's earned figures and its bases, to which it adds the figures that read the records (`metamorphic`); scripts/records/allowed/e1-<track>.yaml for its cited differences; its pre-allocated items (CO-5110 SNAP, 5120 LEAP, 5130 AF, 5140 CW, 5150 CCCAP, 5160 MAGI, 5170 SSI method; design 4.3 rule 4) and the household and question numbers the integration owner allots it (E0 held CO-620-639 and OQ-1020-1049, and used OQ-1020 to OQ-1024 and no household number); and its own review doc docs/reviews/records-earnings-<track>.md and change record volumes/co/changes/<date>-records-<track>.yaml. Its gate: `npm run records:harness -- --list earnings --track <track>` against EARNINGS_BASELINE, with each difference allowed by a cited class.

- **LEAP** (CO-5102): leap_person_wages (CO-3925), leap_wages_in_income_verification_period (CO-3912), leap_self_employment_income and costs (CO-1711, CO-1712), PASS (CO-1002). Restates the seven thirty-day households and the job-began tests with dated pays.
- **Colorado Works** (CO-5104): cw_gross_earned_income (CO-1716), cw_excluded_earned_income (CO-2340), CO-1705/1706, CO-922's new source (job_start_date), cw_boarder_income (CO-4361, which reads the board-only and room-only receipts today; its receipt rows become not read when it reads boarder_payments); OQ-1022.
- **Adult Financial** (CO-5103): af_gross_earned_income (CO-3830), CO-2342, CO-1707/1708, the infrequent-income quarter (CO-4011/4012), deeming; OQ-1024.
- **CCCAP** (CO-5105): cccap_person_earned_income (CO-3915; its thirty days by dates), CO-1709/1710 (hours, launch period), cccap_other_countable_receipts (CO-4464), CO-984, CO-1290.
- **SNAP** (CO-5101): snap_person_wages (CO-4324, per record conversion), CO-2338, CO-4682 (retired by per-record conversion), CO-1701/1702, CO-3722, CO-4165, CO-4329/4349, CO-4930, CO-1376; E0-F1 (CO-425), OQ-1021, OQ-996.
- **Medicaid and CHP+** (CO-5106, CO-5107): ma_person_magi_income (CO-502, net_for_tax), CO-5214, the SSI-method earned items (CO-2471, CO-4883, CO-4200, CO-1715, CO-4629, CO-1703/1704, deeming CO-4633/4634), CHP+ through its MAGI link; OQ-1023, OQ-1024.

Shared items to dissolve in E2, not by a track: has_earned_income (CO-1356) and CO-3387 (design 2.5).

## 11. Change impact

Adding CO-5100 to CO-5107 flags nothing (no rule reads them). The receipt tables' meanings (eight), CO-5000's precision and option meanings, and LEAP's cited rows move fingerprints of every item that reads the receipts; each flag the check raised against origin/main is dispositioned in volumes/co/changes/2026-11-23-earnings-e0.yaml (the reason: the change is to a meaning, a citation, or a row whose treatment the readers count alike, so the flagged item's decision is unchanged). Rule tests whose `given` gained `earnings` change the fingerprints of no decision.
