# Receipt records, migration phase 2: Health First Colorado (Medicaid) and CHP+ unearned income

Phase 1 (docs/reviews/receipts-migration-1.md) moved LEAP, SNAP and Adult Financial onto the neutral `receipts` fact (CO-5000). Phase 2 moves every Medicaid item that read an unearned-income supplied fact, MAGI and the SSI method alike (deeming, the spousal allowances, long-term care post-eligibility, the buy-ins, the Medicare Savings Programs), and through them CHP+, onto the receipts, through **two counting tables**: MAGI (42 CFR 435.603(e), 10 CCR 2505-10 8.100.4.C) and the SSI method (8.100.5.F with 20 CFR 416 Subpart K as the ledger read it). Colorado Works, CCCAP and SUN Bucks are migrated in parallel and are not touched here; LEAP, SNAP and Adult Financial items are unchanged. No old supplied fact is retired: the other programs still read most of them, and a final cleanup retires the orphans (section 11).

The merge gate is `npm run receipts:harness` (and `--all-programs`) with the baseline at c29d326, the commit this phase started from (phase 1 merged): LEAP, SNAP and Adult Financial read the receipts there and every other program the scalar facts, so the harness measures phase 2 alone. Each commit below ran it clean.

## 1. Commits

| Commit | Area | What |
|---|---|---|
| b955869 | MAGI | ma_magi_receipt_treatment_table (CO-5500), ma_magi_unearned_receipts (CO-5501), ma_magi_gambling_receipts (CO-5502); CO-502, CO-503, CO-1185, CO-1187 rewritten. Harness: baseline c29d326, Medicaid and CHP+ compared by default, ten Medicaid and CHP+ generated bases, generated households read the translation on both ledgers; the translation carves Medicaid's VA Aid and Attendance portion into its own receipt. OQ-970. |
| 5a48b41 | SSI method | ma_ssi_receipt_treatment_table (CO-5510) and the per-person sums CO-5511 to CO-5515; CO-663, CO-2281, CO-2277, CO-2278, CO-4633, CO-4634, CO-5221, CO-1158, CO-1160, CO-2870, CO-1640 rewritten; the one SSI income test (CO-5516) read by CO-609 and CO-1162; excerpt S3950 (42 U.S.C. 1382(a), D-347). OQ-971, OQ-972. |
| 9b09b8b | Buy-ins and MSP | CO-1715 (Working Adults), CO-4201 (Children with Disabilities), CO-3627 (MSP cost-of-living increase), CO-1404 (MSP verification) rewritten; Medicaid's own CO-5520 replaces the shared CO-3159; CO-2470 and CO-3159 removed, CO-3159's allowlist entry removed. |
| f02b938 | LTC | CO-641, CO-2467, CO-657, CO-658, CO-4103 rewritten; ma_va_aid_and_attendance_receipts (CO-5530), ma_spousal_unearned_receipts (CO-5531); the SSI table's exempt_public_assistance treatment; CO-642 settled (T-9 A-2). OQ-973, OQ-974. |
| f36fa96 | CHP+ | The adopted-method link of CHP+'s MAGI income cites 10 CCR 2505-3 150.1 (S245) on CO-704, CO-1641, CO-2229; stored households CO-560 to CO-563 in receipts alone; metamorphic relations extended (MA-5, MA-6; families M1 to M4). |
| docs | docs | This review; the transition rule (docs/plan-colorado.md); conventions.md "Receipt records"; the T-9 hand check's follow-up note; UI counts re-pinned. |

## 2. Two counting tables, and CHP+'s link

**MAGI** (ma_magi_receipt_treatment_table, CO-5500; options counted, counted_no_rule_excludes, counted_winnings, excluded, not_taxable_income). MAGI follows the federal tax figure (435.603(e), "the same financial methodologies used to determine modified adjusted gross income as defined in section 36B(d)(2)(B) of the Code", S165) and Colorado's list (8.100.4.C.1, S166):

| Treatment | Kinds, with the paragraph |
|---|---|
| counted | social_security (b.xi, c.iii), pension (b.vi), tax_exempt_interest (b.i, c.i), interest_and_dividends (b.i, b.iv), rental_income (b.ii, b.iii), other_taxable (b.v alimony before 2019, b.x estates and trusts) |
| counted because no rule excludes it (owner signs) | unemployment_compensation |
| counted_winnings | gambling_winnings (b.xiv, S669: in the month received; spread for the winner) |
| excluded (8.100.4.C.1.d) | child_support, child_support_arrears (iii), workers_compensation (iv), ssi (v), va_aid_and_attendance, gi_bill_housing_food_allowance, state_veteran_annuity (vi), educational_assistance (ii) |
| not counted because no rule counts it (not taxable income; owner signs) | colorado_works_cash, adult_financial_cash, resource_liquidation, loan, reimbursement, energy_assistance_federal, energy_assistance_other, income_tax_refund, property_or_food_tax_refund, federally_excluded_payment, dvsa_title_i_volunteer_payment, crime_victim_compensation, foster_care_payment, kinship_care_payment, colorado_works_diversion, colorado_works_supportive_services, reverse_mortgage, housing_utility_allowance, refugee_resettlement, americorps, workforce_program_payment, vocational_training_allowance, general_assistance, emergency_assistance, in_home_care_allowance, home_care_allowance, uniformed_services_special_pay, charitable_need_based_cash, charitable_gift_life_threatening_condition, gift, sponsor_payment, migrant_farmworker_emergency_assistance, other_nontaxable (OQ-970 for AmeriCorps, the training allowances and special pay) |

**SSI method** (ma_ssi_receipt_treatment_table, CO-5510; options counted, counted_no_rule_excludes, counted_net_of_expenses, counted_winnings, child_support, exempt, exempt_public_assistance, not_income, ssi_benefit, not_counted_open_question), the same for the applicant, a spouse, a deemed parent and an ineligible child:

| Treatment | Kinds, with the paragraph |
|---|---|
| counted (8.100.5.F.5, S3001) | social_security (j.ii), pension (j.i), unemployment_compensation (j.v), workers_compensation (j.iii), interest_and_dividends and tax_exempt_interest (e), gi_bill_housing_food_allowance and state_veteran_annuity (j.vi), gift and charitable_gift_life_threatening_condition (c), other_taxable (j.vii), other_nontaxable (a, c, j.vi) |
| counted because no rule excludes it (owner signs; OQ-971 where Subpart K or F.6.j might exclude) | resource_liquidation, reimbursement, property_or_food_tax_refund, crime_victim_compensation, kinship_care_payment, colorado_works_diversion, colorado_works_supportive_services, reverse_mortgage, housing_utility_allowance, refugee_resettlement, vocational_training_allowance, in_home_care_allowance, uniformed_services_special_pay, migrant_farmworker_emergency_assistance |
| counted_net_of_expenses | rental_income (20 CFR 416.1121(d), S3620; 8.100.5.J.1, S3619) |
| counted_winnings | gambling_winnings (F.5.i; the hardship exemption of F.5.i.1 read outside the sum) |
| child_support | child_support, child_support_arrears (the child's income; less one-third for the child, H.4.c) |
| exempt (in long-term care gross income, not counted) | general_assistance, emergency_assistance, charitable_need_based_cash (F.6.j, S3617), workforce_program_payment (F.6.o, p), foster_care_payment (F.6.l, S3404), educational_assistance (416.1124(c)(3)), federally_excluded_payment, dvsa_title_i_volunteer_payment (416.1124(b)), energy_assistance_federal, energy_assistance_other (416.1124(b), (c)(5), the old reading; OQ-971), americorps (416.1112(c)(10), 416.1124(c)(23)) |
| exempt_public_assistance | colorado_works_cash, adult_financial_cash, home_care_allowance (F.6.j; in long-term care gross income, not in the spousal sums, OQ-974) |
| not_income | loan (416.1103(f)), income_tax_refund (416.1103(d)), va_aid_and_attendance (8.100.5.K, S2900; OQ-973 on the housebound allowance) |
| ssi_benefit | ssi (the benefit the method measures; a retroactive payment is exempt for nine months, F.6.c, and in long-term care gross income) |
| not_counted_open_question | sponsor_payment (OQ-972) |

A retroactive Title II or SSI payment of any row is exempt (F.6.c), and a receipt's pass_set_aside is left out (F.6.q), whatever the row.

**CHP+.** CHP+ has no table of its own and none is shared silently: it reads Medicaid's MAGI household income (and its percentage of the poverty level) by the adopted-method link its readers declare in `accepts_from`, now citing the Colorado text that adopts the method, 10 CCR 2505-3 150.1 (S245: "Calculation of income for the Children's Basic Health Plan shall be determined as required in 10 CCR 2505-10-8.100.4.C"), on chp_income_within_limit (CO-704), chp_income_is_reasonably_compatible (CO-1641) and chp_cost_sharing_annual_limit (CO-2229); chp_copayment_income_band (CO-2228) keeps S1504 and chp_requires_verification_of_unearned_income (CO-3634) its adopted-method link to ma_has_unearned_income_for_verification (S869). The MAGI table's meaning states the link. The two methods are never one table: MAGI counts what the federal tax figure counts, the SSI method what 8.100.5.F counts, and the same receipt is often treated differently (child support, workers' compensation, VA benefits, interest, Colorado Works cash).

## 3. What each area reads now

| Area | New items | Rewritten | Removed |
|---|---|---|---|
| MAGI | CO-5500 table, CO-5501 MAGI unearned receipts, CO-5502 MAGI gambling receipts | CO-502 person's MAGI income, CO-503 household income, CO-1185 spread months, CO-1187 winnings for the winner | |
| SSI method | CO-5510 table, CO-5511 counted unearned receipts, CO-5512 gambling, CO-5513 child support, CO-5514 gross unearned receipts, CO-5515 Social Security, CO-5516 the SSI income test | CO-663, CO-2281, CO-2277, CO-2278, CO-4633, CO-4634, CO-5221, CO-1158, CO-1160, CO-2870, CO-1640, CO-609, CO-1162 | |
| Buy-ins, MSP | CO-5520 has unearned income other than interest and dividends | CO-1715, CO-4201, CO-3627, CO-1404 | CO-2470 ma_ssi_excluded_unearned_income; CO-3159 has_unearned_income_other_than_interest_and_dividends (shared program calculation; allowlist entry removed) |
| LTC | CO-5530 VA Aid and Attendance receipts, CO-5531 spousal unearned receipts | CO-641, CO-642 (precision only), CO-2467, CO-657, CO-658, CO-4103 | |
| CHP+ | | CO-704, CO-1641, CO-2229 (link citation) | |

**Items that only existed to decide where money sits, removed:** ma_ssi_excluded_unearned_income (CO-2470) subtracted parts of the scalar residuals stated a second time (educational assistance, loans, energy assistance, refunds, federally excluded payments, PASS, retroactive lump sums, foster care, VA, General Assistance, charity, WIOA less vocational, AmeriCorps, rental expenses); its rows are now the SSI table's. has_unearned_income_other_than_interest_and_dividends (CO-3159) subtracted taxable_interest_and_dividend_income, a part stated inside other_unearned_income_taxable. Medicaid's VA pair, receives_va_aid_and_attendance and va_aid_and_attendance_amount, stated a part of a pension a second time: the portion is now a receipt of kind va_aid_and_attendance, read by CO-641, CO-658 and CO-4103 (the facts stay in the ledger, unread, for the final cleanup).

No Medicaid or CHP+ item reads a scalar unearned-income fact (`npx vite-node scripts/receipts/readers.ts`). One part-of fact remains read: adoption_subsidy_received (CO-4451), subtracted from a deemed parent's and a Buy-In household member's receipts (CO-4634, CO-5221, CO-4201), because the receipts have no adoption-subsidy kind and adding a kind needs a row in every program's table, LEAP's, SNAP's and Adult Financial's included (section 11).

## 4. Defaults kept

No reader of the receipts carries a default: the `otherwise 0` the old items put on lottery_gambling_winnings_received (CO-641, CO-663, CO-1715, CO-2277, CO-2278, CO-4201, CO-4633, CO-4634, CO-5221, CO-2467, CO-657), child_support_received (CO-4201), ma_ssi_excluded_unearned_income and its parts (CO-2470 and its readers), loan_proceeds_received and tax_refunds_and_credits_received (CO-641), receives_va_aid_and_attendance (CO-2470) and taxable_interest_and_dividend_income (CO-3159) are gone with the facts they defaulted. Defaults kept, each on a fact that is not a receipt, as phase 1 section 4 kept defaults whose removal would turn outcomes cannot-determine outside this phase's scope (for the decision-4 round):

| Item | Default kept | Why |
|---|---|---|
| CO-5511 ma_ssi_unearned_receipts | rental_property_expenses_paid otherwise 0 | an expense, not a receipt; CO-2470 read it so |
| CO-663, CO-641, CO-1715, CO-4201 | ma_lottery_winnings_hardship_exemption_granted otherwise false | a finding, not a receipt; unchanged |
| CO-663, CO-1715 | ma_is_ssi_unemancipated_child otherwise false | a derived status; unchanged |
| CO-4634, CO-5221, CO-4201 | ssi_in_kind_support_and_maintenance otherwise 0 | in-kind support is not a receipt of money; unchanged |
| CO-4634, CO-5221, CO-4201 | adoption_subsidy_received otherwise 0 | the part-of fact with no kind (section 3); unchanged |
| CO-5221 | social_security_income_when_child_lost_ssi_or_oap otherwise the current benefit | a historical figure, not a receipt; unchanged (CO-1158's spouse figure likewise) |
| CO-4201 | meets_ssa_disability_criteria, is_blind otherwise false | person facts; unchanged |

## 5. Transition rule (unchanged, extended)

A stored household or rule test that states unearned money states it once as receipts and, for the programs not yet migrated (Colorado Works, CCCAP, SUN Bucks), in the old scalar facts, both written by the translator. Phase 2 adds one translation: when a household states receives_va_aid_and_attendance with va_aid_and_attendance_amount, the amount is carved out of the receipt that holds it (the other non-taxable money, else the pension) into a va_aid_and_attendance receipt; four stored households (CO-139, CO-212, CO-214, CO-396) and one rule test (CO-641-T2) were re-translated, and LEAP, SNAP and Adult Financial treat the new kind as they treated its host (each counts both). No fact is retired in phase 2. A household written after the baseline may be stated in receipts alone (CO-560 to CO-563).

## 6. Harness result

`npm run receipts:harness` against c29d326 (Medicaid and CHP+ added to the programs compared by default, with their figures), and with `--all-programs`:

| Source | Households | Values compared | Values that differ | Households that differ | Allowed | Unexplained |
|---|---|---|---|---|---|---|
| stored households | 319 | 124,576 | 408 | 94 | 408 | 0 |
| generated households | 1,071 | 312,721 | 2,082 | 589 | 2,082 | 0 |
| stored, every program's outcomes | 319 | 157,263 | 408 | 94 | 408 | 0 |
| generated, every program's outcomes | 1,071 | 399,703 | 2,082 | 589 | 2,082 | 0 |

The generated households are phase 1's five bases and ten phase-2 bases (CO-202 MAGI parent, CO-185 aged, CO-189 aged spouse, CO-186 deeming parent, CO-112 long-term care and community spouse, CO-187 Working Adults, CO-145 Children's Buy-In child, CO-114 MSP, CO-386 CHP+ parent), each varied by one money fact at a time; a phase-2 base is cleaned gently (only the translated facts zeroed) so its outcomes stay determinable. Stored households whose receipts are not the translation of their old facts: none. CO-560 to CO-563, written in receipts alone, are checked by their expectations. Metamorphic relations over 1,196 households: MA-1 split, MA-2 order, MA-3 month, MA-4 residual, MA-5 frequency, MA-6 date, 0 violations each; families M1 (MAGI 1,050), M2 (SSI method 600, by month and dated), M3 (long-term care gross 1,900), M4 (a VA pension in two receipts equals the pension alone) give the rule's answer, beside phase 1's F1 to F4.

## 7. Every allowed difference

Pinned in scripts/receipts/allowed-differences.yaml under "Phase 2: Medicaid and CHP+".

| Class | Households (values) | Rule text | Old | New |
|---|---|---|---|---|
| M1 (fixed): MAGI counts a retroactive Social Security payment in the month received | 12 generated (59): each base's "retroactive SS lump 300" (stated as retroactive_social_security_lump_sum_received inside lump_sum_received and the non-taxable residual) | 10 CCR 2505-10 8.100.4.C.1.b.xi, c.iii (Social Security, "whether or not taxable"); d.i and 42 CFR 435.603(e)(1): "An amount received as a lump sum is counted as income only in the month received" (S165, S166) | MAGI income without it (the residual is not MAGI income), so G-MAMAGIparent was eligible at 70% FPL | the 300 counted in the month: 86.6% FPL, the parent and caretaker category lost in that month; CHP+ and the other MAGI figures follow |
| M2 (fixed): VA Aid and Attendance stated inside a pension | CO-139, CO-214 (MAGI income 2026-11/12), CO-212, CO-396 (their own income as the spousal figure reads it) (10) | MAGI: 8.100.4.C.1.d.vi "Veteran's Benefits" excluded; SSI method: 8.100.5.K "shall not be considered as income when determining eligibility" (S2900) | MAGI income 1,900 (the whole pension counted); community spouse figure 1,300 | 1,600; 900 (the portion, now its own receipt, not counted) |
| M3 (fixed): VA Aid and Attendance stated in the SNAP and Colorado Works earmark fact | 14 generated (130): "va_aid_and_attendance_used_for_uncovered_care 300 (part of nontaxable)" | 8.100.5.K; 8.100.4.C.1.d.vi | the SSI method counted it (Medicaid read only its own VA facts): countable 280 | 0; verification of unearned income not needed where it was the only money |
| M4 (fixed): a loan or an income tax refund is not income | 28 generated and CO-196 (52): the verification element of an aged, blind or disabled applicant; a community spouse's income | 20 CFR 416.1103(d) "Any amount refunded on income taxes you have already paid is not income", (f) "Money you borrow ... is not income" (S2209); 8.100.5.B.1.d (unearned income to verify) | unearned income to verify; CO-196's husband's 500 refund counted in his income (2,100) | none to verify; 1,600 |
| M5: households written in receipts alone after phase 1 | CO-458, CO-459, CO-460 (18) | none: the receipts are the household's only statement | Medicaid cannot determine (no scalar fact stated) | Medicaid reads the receipts |
| M6 (OQ-970): a training allowance stated as taxable income | CO-219, CO-220 (2): unearned income verification | 42 CFR 435.603(e) (S165) follows the federal tax treatment, which OQ-970 asks the owner to settle | MAGI counted the 1,000 stated in other_unearned_income_taxable, so it was verified | vocational_training_allowance, not MAGI income pending OQ-970: not verified (SNAP still counts it as earned income, unchanged) |
| M7: long-term care gross income no longer needs the VA flag stated | 85 stored and 551 generated (2,219): ma_ltc_gross_income and ma_meets_special_income_group, old cannot-determine only | decision 4 of 2026-11-23 and 8.100.5.K: the portion is a receipt stated once; nothing asks for a second statement | cannot determine (the old CO-641 read receives_va_aid_and_attendance with no default, so anyone outside a long-term care case had no gross income) | the person's gross income; no outcome changes |

Outcomes change only in M1: one generated household's MAGI category and eligibility status (and its family planning status, which then needs facts the base does not state), and the unearned-income verification outcome of two retroactive-payment households; every other difference is a figure (MAGI and SSI-method income, long-term care gross income, the special income group test, the community spouse's income, the buy-in incomes, the verification element). A household's first matching class names it, so M1's entry also holds the retroactive-payment households' long-term care gross income that was cannot-determine before (M7's kind).

## 8. The T-9 hand check items folded in

- **A-3 and A-4 (CO-609, CO-1162).** The SSI income test is stated once, in ma_ssi_income_test_status (CO-5516: met; met with OASDI disregarded; not met), which ma_meets_ssi_income_standard (CO-609) and ma_disabled_widow_eligible (CO-1162) both read. The boundary is settled by the governing text, 42 U.S.C. 1382(a)(1)(A), (2)(A): an individual "whose income ... is at a rate of not more than" the benefit rate (S3950, document D-347), the test 1383c(d) applies to a disabled widow(er) "in the absence of" the benefit. CO-609 already read it so; CO-1162 read "below" by analogy with the Disabled Adult Child group (OQ-209) and now reads "at or under": CO-1162-T7 and T10 (countable income with Social Security disregarded equal to the rate) expect true. The Disabled Adult Child and Pickle groups keep their own Colorado words ("below", S626; "less than", S624) and do not read CO-5516. No stored or generated household sits on the boundary (no harness difference).
- **A-2 (CO-642).** Settled by the governing text: the eligibility rule, 8.100.7.A.2.e, "gross income that does not exceed 300% of the current individual SSI benefit level" (S351, S3422), and the federal limit, 42 CFR 435.1005, "does not exceed 300 percent" (S378); 8.100.6.K.5's "under 300%" (S352) introduces the group and is read as the same standard. The comparison was already at or under, so no decision changes; the precision records the reading.

## 9. Open questions added

OQ-970 (MAGI: AmeriCorps living allowances, training allowances and uniformed services special pay), OQ-971 (SSI method: rows counted by silence where Subpart K or F.6.j might exclude), OQ-972 (SSI method: money from a sponsor), OQ-973 (8.100.5.K and a VA housebound allowance), OQ-974 (spousal impoverishment: a community spouse's or family member's child support and cash assistance). Each table row marked counted or not counted by silence is for the owner's sign-off rather than an open question.

## 10. Change impact

volumes/co/changes/2026-11-23-receipts-2-medicaid.yaml: CO-609 and CO-1162 against the new CO-5516 (applies: the one SSI test, added here); CO-2467 against CO-644 (not applicable: CO-644 decides who the institutionalized spouse is and reads no income); and re-keys of earlier dispositions whose changed item's fingerprint moved because it reads, through others, an item this migration rewrote (CO-613 and CO-616 against CO-617, CO-654 against CO-652 and CO-653, CO-608 against CO-647, CO-2419 against CO-509), each with the earlier reason.

## 11. What remains

- Supplied facts now read by no rule, kept for the final cleanup as instructed: americorps_payments_received (CO-4016), charitable_need_based_cash_received (CO-4308), retroactive_social_security_lump_sum_received (CO-3919), taxable_interest_and_dividend_income (CO-3158), vocational_training_allowance_received (CO-4300), receives_va_aid_and_attendance (CO-836), va_aid_and_attendance_amount (CO-837). The translator still reads them.
- adoption_subsidy_received (CO-4451) is still subtracted from receipts that hold it (Medicaid deeming and the Children's Buy-In; CCCAP too): a receipt kind `adoption_subsidy` needs a row in every program's table, LEAP's, SNAP's and Adult Financial's included, which this phase may not edit.
- receipts (CO-5000)'s precision still names the programs of phase 1; it is left for the merge of the parallel phases, so the three do not edit the same sentence.
- The owners' row-by-row sign-off of the two Medicaid tables, and OQ-970 to OQ-974.
- Earned income and resources (condition 3), and the decision-4 round for the defaults in section 4.
