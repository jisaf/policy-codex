# Field sweep: MAGI Medicaid and CHP+

Coverage pass 5 fix round (2026-11-23), part 1. Branch `ccr-9d19bf4c-wmnwcl`, started at `44a4dac`; fixes on the fix round's commits (docs/reviews/coverage5-medicaid-magi-chp.md, section 7). The companion sweep for SNAP, Adult Financial, Colorado Works and non-MAGI Medicaid is docs/reviews/field-sweep-snap-cash-nonmagi.md; this one covers the items that compute MAGI-based income and household and the CHP+ items, and leaves the SSI-method readers (reached from CHP+ only through the Title XIX test, ma_has_full_coverage_category, CO-1176) to that sweep.

## Why

Each verification pass has found a field added to a shared record by one program's fix that another program's readers never read although its own rule text gives it effect (C5-08 and C5-09 of pass 5 are two such). This sweep checks every field of receipts (CO-5000), earnings (CO-5100) and holdings (CO-5300) against MAGI Medicaid and CHP+, so the class is closed at once.

## Method

1. **Fields.** Every key of `record_fields`: receipts 27, earnings 33, holdings 60 (after the merge of origin at `fea8c9f`).
2. **Readers.** A scratch walk of every derived expression lists, per list, the fields read as `["receipt", f]` inside a `sum_receipts` or `largest` over it, and marks the readers on the path to the MAGI and CHP+ outcomes (ma_magi_eligibility_status, ma_magi_category, ma_family_planning_status, ma_express_lane_status, chp_eligibility_status, chp_copayment and their verification items: 952 items reachable). `received_in` (P57) reads a record's month and date.
3. **Text.** MAGI: 10 CCR 2505-10 § 8.100.4.C (D-65, rule version effective 11/14/2026), which incorporates 26 U.S.C. 61 and 62; 42 CFR 435.603(e) (D-34, S165); the Code sections on file (D-4430 to D-4441; D-4491 fetched for this sweep). CHP+: 10 CCR 2505-3 § 150.1 (D-66, S245): "Calculation of income for the Children's Basic Health Plan shall be determined as required in 10 CCR 2505-10-8.100.4.C", so every CHP+ income cell is MAGI's, read through Medicaid's figures by the declared adopted-method links; CHP+ reads no record directly.
4. **Verdicts.** *read-right*: a MAGI reader reads it as the text says. *FIXED*: the text gives it effect and no reader read it (or read it wrongly); fixed in this round with hand-computed rule tests. *no effect*: the paragraphs named give it none for MAGI. CHP+ takes MAGI's verdict in every income cell ("as MAGI").

## Summary

| Record | Fields | read-right | FIXED | no effect |
|---|---|---|---|---|
| receipts (CO-5000) | 27 | 5 (kind, amount, month, date, frequency) | 6 (taxable_amount for pensions and refunds, C5-09; start_date, end_date; recouped, for_person_living_elsewhere) | 16 |
| earnings (CO-5100) | 33 | 10 | 3 (seasonal_or_commission, C5-08; job_start_date, job_end_date) | 20 |
| holdings (CO-5300) | 60 | 0 | 0 | 60 (no MAGI or CHP+ resource test) |

Fixed in this round (each with rule tests whose values are computed by hand from the quoted text; commit eb20da9 for the two new classes):

- **Streams bounded by their source's dates** (receipts `start_date`, `end_date`; earnings `job_start_date`, `job_end_date`). § 8.100.4.C.4: "The financial eligibility of applicants for Medical Assistance shall be determined based on current or previous monthly household income and family size", and § 8.100.4.G.1 makes each month its own (S3351). A stream (a record with no month and no date) is, by the records' own meaning, the pay or payment of the months its job or source ran (docs/conventions.md, "A record's time"), but P57 places a stream in every month, and no MAGI reader read the dates: a job that ended in September counted in October; unemployment compensation that began in November counted in a retroactive August. The MAGI readers now count a stream only from the month its job or source began through the month it ended: ma_magi_wage_earnings (CO-5160), ma_magi_self_employment_earnings (CO-5161), ma_magi_difficulty_of_care_earnings (CO-5162), ma_magi_boarder_earnings (CO-6450), the verification figures CO-5163 and CO-5164, ma_magi_unearned_receipts (CO-5501) and ma_magi_gambling_receipts (CO-5502). Tests CO-5160-T20 to T23 (2,000 a month, job ended 2026-09-15: October 0, September 2,000; job began 2026-10-01: August 0; a last paycheck stated for October with its month: 900), CO-5501-T17, T18 (1,200 from 2026-11-01: October 0, November 1,200).
- **Social Security as the Code defines it** (receipts `recouped`, `for_person_living_elsewhere`). MAGI-based income adds "the amount of social security benefits not included in gross income" to adjusted gross income (36B(d)(2)(B), 435.603(e), S165; § 8.100.4.C.1.b.xi and c.iii), so the benefits are those of 26 U.S.C. 86 (fetched for this sweep from Cornell LII, D-4491, S4881): "any amount received by the taxpayer by reason of entitlement to ... a monthly benefit under title II" (86(d)(1)), "reduced by any repayment made by the taxpayer during the taxable year of a social security benefit previously received" (86(d)(2)(A)). A recoupment is a repayment, and a benefit received for a person living elsewhere is received by reason of that person's entitlement. ma_magi_receipt_treatment_table (CO-5500) gives social_security the treatment counted_net_of_repayments_and_others_benefits, which CO-5501 reads as amount less recouped less for_person_living_elsewhere. Tests CO-5501-T19 (1,400 less 140 recouped: 1,260), T20 (1,100, 400 of it for a son living with his grandparents: 700).
- **Pensions and income tax refunds at their taxable part** (receipts `taxable_amount`): C5-09 (OQ-1230 resolved): CO-5501-T12 to T16.
- **Seasonal or commission pay** (earnings `seasonal_or_commission`): C5-08, required where read: CO-6451-T5, T7 to T9, CO-4559-T6.

## Receipts (CO-5000)

| Field | MAGI: text and verdict | Reader | CHP+ |
|---|---|---|---|
| kind | § 8.100.4.C.1.b-d name the kinds counted, added and excluded (S166): read-right | CO-5500 rows, CO-5501, CO-5502 | as MAGI |
| amount | C.1: gross income, 26 U.S.C. 61(a) (S4631): read-right | CO-5501, CO-5502 | as MAGI |
| month, date | C.4 (the month's income); C.1.d.i "An amount received as a lump sum is counted as income only in the month received": read-right (P57) | CO-5501, CO-5502 | as MAGI |
| frequency | C.1.d.i: a lump sum only in its month: read-right (P57 reads `once`) | CO-5501 | as MAGI |
| per_payment | No effect: MAGI counts the month's income as received (C.4); no MAGI text converts a pay by its schedule | none | as MAGI |
| retroactive | No effect: C.1.d.i counts a lump sum in the month received; no MAGI paragraph treats back payments apart (the SSI method's F.6.c does; non-MAGI sweep) | none | as MAGI |
| irregular | No effect: no MAGI exclusion for infrequent or irregular income (C.1.d lists none) | none | as MAGI |
| hours_served | No effect: AmeriCorps is counted whatever the hours (coverage pass 4, C4-11; 61(a)) | none | as MAGI |
| pass_set_aside | No effect: C.1.e's deductions (26 U.S.C. 62) list no PASS; 1396a(e)(14)(B) (S4630): "no type of expense, block, or other income disregard" | none | as MAGI |
| claim_expense | No effect: workers' compensation is excluded whole (C.1.d.iv) | none | as MAGI |
| spent_on_covered_costs | No effect: the kinds that carry it (insurance, death benefits) are not MAGI income except as the Code counts them (other_taxable); C.1.e has no such deduction | none | as MAGI |
| designated_for_lump_sum_costs | No effect: C.1.d.i, the month received; no deduction | none | as MAGI |
| used_for_uncovered_medical_care | No effect: VA benefits are excluded whole (C.1.d.vi) | none | as MAGI |
| transferred_to_child_support_agency | No effect: child support received is excluded whole (C.1.d.iii) | none | as MAGI |
| paid_to_former_spouse | No effect on its own: a pension's part paid to a former spouse is not the person's gross income only as the return states it, which taxable_amount carries (C5-09) | CO-5501 through taxable_amount | as MAGI |
| recouped | **FIXED** for Social Security: 26 U.S.C. 86(d)(2)(A) (S4881). Other kinds: no effect found in the text on file (the Code sections for other repayments are not on file and no MAGI paragraph names one) | CO-5501 (social_security) | as MAGI |
| recouped_for_intentional_violation | No effect: a part of `recouped`; MAGI does not tell the reason apart | none | as MAGI |
| for_person_living_elsewhere | **FIXED** for Social Security: 86(d)(1), "received ... by reason of entitlement" (S4881). Other kinds: no effect found (VA benefits excluded, C.1.d.vi; child support excluded, d.iii; the military allotment and other kinds are not MAGI income, CO-5500) | CO-5501 (social_security) | as MAGI |
| for_dependent | No effect: it is a field of veterans benefits, excluded whole (C.1.d.vi) | none | as MAGI |
| regular_date | No effect: MAGI counts "current or previous monthly household income" (C.4) as received; no MAGI paragraph moves a payment to its regular month (SNAP 4.402.B does) | none | as MAGI |
| start_date, end_date | **FIXED**: C.4, G.1 (S3356, S3351): a stream counts only in the months its source ran | CO-5501, CO-5502 | as MAGI |
| covers_from, covers_through, recurs_within_twelve_months | No effect: C.1.d.i counts a lump sum in the month received; no MAGI averaging | none | as MAGI |
| taxable_amount | read-right for savings distributions and insurance cash value (C4-01, C4-09); **FIXED** for pensions (61(a)(8), (10), 72(b)(1), 104(a)(4)) and income tax refunds (111(a)): C5-09 | CO-5501 | as MAGI |

## Earnings (CO-5100)

| Field | MAGI: text and verdict | Reader | CHP+ |
|---|---|---|---|
| kind | C.1.a (earned income), K.8, K.10 (S166, S4107): read-right | CO-5106 rows, CO-5160 to CO-5164, CO-6450, CO-6451 | as MAGI |
| amount | C.1.a.i: wages, salaries, tips, gross: read-right | CO-5160, CO-5162 to CO-5164, CO-6450 | as MAGI |
| month, date | C.4: the month's income: read-right (P57) | the same | as MAGI |
| frequency, job, per_payment | No effect: MAGI counts the pays received in the month; no MAGI text converts or averages by schedule | none | as MAGI |
| irregular | No effect: no MAGI exclusion for irregular pay (C.1.d) | none | as MAGI |
| retroactive | No effect: back pay is income when received (C.1.d.i, the month received) | none | as MAGI |
| job_start_date, job_end_date | **FIXED**: C.4, G.1: a stream counts only in the months its job ran | CO-5160 to CO-5164, CO-6450 | as MAGI |
| temporary_job, ended_through_own_fault | No effect: no MAGI exclusion for a temporary job (Colorado Works' rule) | none | as MAGI |
| annual_contract_pay | No effect: MAGI counts the pay received in the month; no MAGI text spreads contract pay (SNAP 4.403.3 and CCCAP do) | none | as MAGI |
| paid_as_business_owner | No effect: wages from one's own company are wages (C.1.a.i) | none | as MAGI |
| combat_zone | read-right: 26 U.S.C. 112 (S4340) excludes combat-zone special pay; the special pay row reads it | CO-5160 | as MAGI |
| combat_zone_compensation | read-right (C4-02; 112(a)-(b)) | CO-5160 | as MAGI |
| seasonal_or_commission | **FIXED** (C5-08): C.4.a annualizes seasonal and commission income; required where read | CO-6451 | as MAGI |
| employer_convenience_meals_or_lodging | read-right (C4-04; 119(a), S4636) | CO-5160 | as MAGI |
| pass_set_aside, education_deduction | No effect: C.1.e lists neither (26 U.S.C. 62); 1396a(e)(14)(B) bars other disregards | none | as MAGI |
| net_for_tax | read-right: C.1.a.ii, gross income derived from business as the return figures it (C4-17) | CO-5161 | as MAGI |
| hours, annual_support, changed_substantially | No effect: MAGI reads the business's net for tax; annualizing (C.4.a) reads the expected annual income, not these | none | as MAGI |
| farm | No effect: MAGI reads net_for_tax, which already takes every cost; no MAGI text treats farm costs apart | none | as MAGI |
| boarders | No effect: K.10.c-e net the payments of costs; 1396a(e)(14)(B) bars a per-boarder allotment (C4-03) | none | as MAGI |
| provides | No effect: K.10.c-e count room, board, and room and board payments alike, net of costs (C4-03) | none | as MAGI |
| foster_care | No effect: MAGI's Difficulty of Care row (excluded_live_in_provider) and boarder row read the kind, not the field; 26 U.S.C. 131 (not on file) is not needed for any MAGI answer on file | none | as MAGI |
| regular_date | No effect: as receipts | none | as MAGI |
| leave_or_bonus_pay | No effect: wages, including leave and bonuses (C.1.a.i, a.v; 61(a)(1)) | none | as MAGI |
| wioa_funded | No effect: WIOA-funded wages are counted (K.8 and 1396a(e)(14)(B), C4-16); only SNAP excludes them | none | as MAGI |
| capital_gain | No effect: business capital gains are in net_for_tax (C.1.a.iii, b.xiii) | none | as MAGI |

## Holdings (CO-5300)

All 60 fields (kind, value, month, date, amount_owed, share, holding_id, co_owners, co_owner, accessible, source_date, paid_by, received_while_on_snap, eitc_share, replacement_property, proceeds_source, used_for_transportation, lives_in, intends_to_return, temporary_absence, intent_in_writing, outside_colorado, held_in_trust_or_entity, beneficiary_deed, listed_for_sale, costs_of_sale, co_owner_lives_in_it, co_owner_would_lose_housing, lot_for_future_home, income_producing, used_in_trade_or_business, net_annual_return, snap_return_consistent_with_value, produces_for_household_use, household_goods_or_personal_effects, farm_ended_date, taxes_on_withdrawal, self_funded, face_value, purchase_date, premiums_in_lookback, irrevocable, accrued_interest, for_immediate_family, burial_for, for_person, negotiable_instrument, revocable, annuitized, corpus_available_value, ma_found_available_value, ma_sale_efforts_unsuccessful, af_found_unsaleable, disposed_date, compensation_received, transferee, returned_date, snap_transfer_to_qualify, af_found_not_twfc, ma_transfer_exempt): **no effect** for MAGI. 10 CCR 2505-10 § 8.100.3.L.1 (D-65): "Resources are not counted in determining eligibility for the MAGI Medical Assistance programs". For CHP+, no effect: 10 CCR 2505-3 §§ 110 to 150 (D-66) state no resource test. The holdings readers reached from the CHP+ outcome (the SSI method's, through CO-1176's Title XIX test of § 120.1.B) are the non-MAGI groups' and are swept in docs/reviews/field-sweep-snap-cash-nonmagi.md. Income from a holding (interest, rents, dividends, a distribution) is a receipt and is in the receipts table above.

## Record fields with a default

Decision 4 of 2026-11-23 and design decision D3: a field takes a default only where the rule gives one ("counted unless excluded", "presumed available"); with no such text it is required where read. The question here is whether a MAGI or CHP+ rule gives the default of each field a MAGI reader reads; the other defaults are assessed for their readers in docs/reviews/field-sweep-snap-cash-nonmagi.md ("Record fields with a default").

| Field | Default | MAGI or CHP+ reader | Does the MAGI rule give it? | Disposition |
|---|---|---|---|---|
| receipts frequency | monthly (undated; required if dated) | CO-5501, CO-5502 (P57: `once`) | The record's own definition (an undated record's amount is the month's), not a reading | Keep (the companion sweep recommends declaring it when_absent; a schema change for every reader) |
| receipts recouped | 0 | CO-5501 (social_security, since this sweep) | No: 86(d)(2)(A) reduces by repayments made; nothing presumes none | Read under the schema's declaration; the companion sweep recommends required where read on the kinds that carry it, a change to every reader's records the integration owner makes at once (its FS tables). Recorded in section 7 of the coverage review |
| receipts for_person_living_elsewhere | 0 | CO-5501 (social_security) | No | As recouped |
| earnings combat_zone | false | CO-5160 (special pay) | Yes: 26 U.S.C. 61(a) counts "all income ... Except as otherwise provided" (S4631); 112 takes combat-zone pay out only where its conditions are met | Keep |
| earnings combat_zone_compensation | false | CO-5160 | Yes: as combat_zone (61(a), 112(a)-(b)) | Keep |
| earnings employer_convenience_meals_or_lodging | false | CO-5160 | Yes: 61(a)(1) counts compensation, fringe benefits included; 119(a) excludes only where its conditions are met | Keep |
| earnings seasonal_or_commission | false (until this round) | CO-6451 | **No**: C.4.a's annualizing is not an exclusion from counting but a different measure for a kind of job; no text presumes pay is not seasonal | **Required where read** (C5-08) |
| earnings irregular, retroactive, temporary_job, paid_as_business_owner, pass_set_aside, education_deduction, farm, foster_care, leave_or_bonus_pay, wioa_funded, capital_gain | false / 0 | none on the MAGI or CHP+ income path | n/a for MAGI | Assessed by the companion sweep |
| receipts retroactive, irregular, pass_set_aside, claim_expense, spent_on_covered_costs, designated_for_lump_sum_costs, used_for_uncovered_medical_care, transferred_to_child_support_agency, paid_to_former_spouse, recouped_for_intentional_violation, for_dependent | false / 0 | none on the MAGI income path (the SSI-method readers CO-5511, CO-5514, CO-5515, CO-5531, CO-6250, CO-6730 are reached only through CHP+'s Title XIX test) | n/a for MAGI | Assessed by the companion sweep |
| holdings accessible, intends_to_return, intent_in_writing, co_owner_would_lose_housing, income_producing, used_in_trade_or_business, produces_for_household_use, ma_sale_efforts_unsuccessful (and any other holdings default) | true / false | none for MAGI or CHP+ (no resource test) | n/a | Assessed by the companion sweep |

Supplied scalar facts the MAGI readers default, found while sweeping (not record fields; recorded, not changed here): is_claimed_by_filer_outside_case (CO-2716) is read as false where not stated (its precision says so, rule 12), and support_received_from_sponsor (CO-4555) as 0 during an indigence period (CO-4551). Both predate this round; neither is a record field.

## Reproducing

The readers were listed with a scratch walk of the ledger (the same method as the companion sweep's `scripts/probes/field-reads.mjs`). The fixes' rule tests run with `npm run check`; the stored households of this round are CO-810 to CO-819.
