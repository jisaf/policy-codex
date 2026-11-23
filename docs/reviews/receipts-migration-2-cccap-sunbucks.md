# Receipt records, migration phase 2: CCCAP and SUN Bucks unearned income

Phase 1 (docs/reviews/receipts-migration-1.md) moved LEAP, SNAP and Adult Financial onto the neutral `receipts` fact (CO-5000), read through one counting table per program. Phase 2 moves CCCAP (8 CCR 1403-1 3.111.H-J, the income of every CCCAP route) and SUN Bucks (7 CFR 292.2, the Colorado Works receipt that makes a child categorically eligible) the same way. Colorado Works, Medicaid and CHP+ move in parallel tracks; until the last of them moves, the transition rule of docs/plan-colorado.md holds unchanged: a household states its unearned money once as receipts and, for the programs not yet moved, in the old scalar facts, both written by the translator. No supplied fact is retired in this phase; the facts it leaves without a reader are listed in section 4 for the final cleanup.

The merge gate is `npm run receipts:harness`, now against the end of phase 1 (c29d326, the commit this phase started from; scripts/receipts/ledgers.ts), so it measures phase 2 alone. Run with `--base ccbb3a7` it also measures phases 1 and 2 together against the ledger before receipt records, and runs clean.

## 1. Commits

| Commit | What |
|---|---|
| CCCAP | `cccap_receipt_treatment_table` (CO-5720) and the items that read it (CO-5721 to CO-5725); CCCAP's income items rebuilt on the receipts (CO-3916, CO-4463, CO-4076, CO-994, CO-2873); CO-3913 removed (no reader left), so the cross-program allowlist shrinks; CO-345 restated (section 8); OQ-873 updated and OQ-990 to OQ-992 added; the translator states CO-4460 as a receipt field; the harness compares CCCAP's outcomes, generates CCCAP and SUN Bucks households and runs families F5 and F6; change record, UI counts. |
| SUN Bucks | `sebt_receipt_treatment_table` (CO-5730), `sebt_tanf_assistance_receipts` (CO-5731); `sebt_household_child_receives_snap_or_tanf` (CO-2708) reads it; OQ-993; UI counts. |
| docs | This review; docs/plan-colorado.md (phase 2 under the transition rule); docs/conventions.md "Receipt records"; docs/reviews/cross-program-audit.md (CO-3913 removed; why CO-3912 stays held). |

## 2. The receipts fact

Unchanged: no kind is added and no field (CO-5000's `record_fields` already had what CCCAP and SUN Bucks read: `frequency`, `irregular`, `retroactive`, `pass_set_aside`, `spent_on_covered_costs`). Its precision names the phase-2 tables. Adding a kind would need a row in every program's table, LEAP's, SNAP's and Adult Financial's among them, which this phase does not edit; two receipts CCCAP excludes have no kind of their own for that reason (section 4).

## 3. The counting tables

One per program, a `table keyed by option` keyed by kind, every kind a row, every row citing its paragraph in the table's meaning; the treatment `counted_no_rule_excludes` marks a row counted only because no rule excludes it, for the owner's sign-off (condition 2).

| Program | Table | Counted, a paragraph naming it | Counted with a rule of its own | Counted because no rule excludes it (the owner signs each) | Excluded | Not counted pending an answer |
|---|---|---|---|---|---|---|
| CCCAP | cccap_receipt_treatment_table (CO-5720) | pension (I.6, I.7.a-b, I.8), unemployment_compensation (I.26), tax_exempt_interest (I.10), interest_and_dividends (I.9, I.10, I.14), rental_income (I.12, I.17, net), workers_compensation (I.27), gambling_winnings (I.20), gi_bill_housing_food_allowance (I.7.c), refugee_resettlement (I.33), americorps (I.32), va_aid_and_attendance (I.7.b), uniformed_services_special_pay (I.1), gift, charitable_need_based_cash, charitable_gift_life_threatening_condition (I.20) | social_security less a PASS set-aside (I.25, J.13); child_support and child_support_arrears (I.29, H.4.h-i; not counted for a protective services household, 3.119.A); colorado_works_diversion unless cash assistance (3.103.S, J.26; OQ-873) | resource_liquidation, energy_assistance_other, property_or_food_tax_refund, crime_victim_compensation, reverse_mortgage, housing_utility_allowance, vocational_training_allowance, general_assistance, emergency_assistance, in_home_care_allowance, state_veteran_annuity, migrant_farmworker_emergency_assistance, other_taxable, other_nontaxable | ssi (J.2), colorado_works_cash and adult_financial_cash (J.26), educational_assistance (J.16, J.19, J.20), loan (J.25), reimbursement (J.27), energy_assistance_federal (J.12), income_tax_refund (J.14), federally_excluded_payment (J.3, J.5-9, J.11, J.15, J.21), dvsa_title_i_volunteer_payment (J.11), foster_care_payment and kinship_care_payment (J.10), colorado_works_supportive_services (J.23), workforce_program_payment (J.17, J.18), home_care_allowance (J.24) | sponsor_payment (OQ-992) |
| SUN Bucks | sebt_receipt_treatment_table (CO-5730) | none: SUN Bucks counts no receipt as income; a child who is not categorically eligible is tested on the household income its application reports (292.5(a); school_meal_household_income) | colorado_works_cash read as "receiving assistance under ... TANF" (292.2, tanf_assistance) | none | none: every other kind is `not_read` | colorado_works_diversion and colorado_works_supportive_services are `not_read` as TANF assistance pending OQ-993 |

How a counted CCCAP receipt is counted is the readers': a recurring receipt at its amount in the month, standing for the prior thirty days (H.5.b; OQ-680), `cccap_counted_recurring_receipts` (CO-5721); a receipt paid once at one twelfth in the month received (H.4.i), `cccap_one_time_receipts_averaged` (CO-5722); an irregular recurring receipt left out when the quarter's irregular receipts are under $90 (J.28), `cccap_irregular_receipts` (CO-5723) and `cccap_irregular_receipts_in_quarter` (CO-5724). The excerpts on file for 3.111.I covered I.1, I.4-5, I.7.c, I.8, I.12, I.17-18 and I.20-22; S4020 adds the rest of the list (I.6-7, I.9-11, I.13-16, I.19, I.23-33) and S4021 the exclusions J.4 and J.20-22, quoted from D-87.

Rows a paragraph names only in part, or may name, are OQ-990: energy_assistance_federal (J.12 names LEAP), income_tax_refund (J.14 the EIC) and reimbursement (J.27, settlement or lawsuit reimbursements) are excluded whole, as before receipt records; vocational_training_allowance (J.20, Perkins attendance-cost assistance) and reverse_mortgage (J.25, loans) are counted. General Assistance and emergency assistance under J.26's "public cash assistance grants including" are OQ-991.

## 4. What each program reads now

| Program | New items | Rewritten | Removed | Facts left without a reader (not retired: the final cleanup retires orphans) |
|---|---|---|---|---|
| CCCAP | CO-5720 table, CO-5721 recurring receipts, CO-5722 one-time receipts averaged, CO-5723 irregular receipts, CO-5724 their quarter, CO-5725 counted child support | CO-3916 unearned income, CO-4463 excluded receipts, CO-4076 J.28 exclusion, CO-994 protective services income, CO-2873 unearned-income verification trigger; text only: CO-985, CO-4464 | CO-3913 (the shared thirty-day unearned income) | lump_sum_received (CO-3367), unearned_income_received_prior_thirty_days (CO-3911), insurance_proceeds_spent_on_medical_or_burial (CO-4460, now the receipt's spent_on_covered_costs), kinship_care_payments_received (CO-4503), tanf_diversion_payment_received (CO-4850), tanf_supportive_service_payments_received (CO-4452); and the derived infrequent_or_irregular_income_in_quarter (CO-4077, shared), which no rule reads now |
| SUN Bucks | CO-5730 table, CO-5731 TANF assistance receipts | CO-2708 | none | none (tanf_cash_income, CO-029, is still read by Colorado Works and Medicaid) |

No CCCAP or SUN Bucks item reads a scalar unearned-income fact the receipts restate (`npx vite-node scripts/receipts/readers.ts`). CCCAP still reads, beside the receipts, facts that are not receipts or that no kind names: the deductions rental_property_expenses_paid (CO-4458, taken against the month's rental_income and other_taxable receipts, as its meaning reads rents "stated in the person's other unearned income facts") and retirement_early_withdrawal_penalty (CO-4459, against the pension receipts); tanf_state_diversion_payment_months (CO-4911, which decides whether a diversion is cash assistance); adoption_subsidy_received (CO-4451) and early_childhood_research_study_payments_received (CO-4453), receipts J.10 and J.29 exclude that the receipts hold in other_taxable or other_nontaxable because no kind names them; and the I.4, I.5 and I.18 receipts that are not unearned income (in-kind pay, employer vendor payments, boarders; CO-4464, unchanged).

**Reader defaults (`otherwise 0`).** Kept, as phase 1's section 4 kept the like default in LEAP's public-assistance test (CO-4518): `sebt_household_child_receives_snap_or_tanf` (CO-2708) reads a member's TANF assistance receipts as 0 when the member's receipts are not stated, for the child and for each other child of the economic unit, as it read tanf_cash_income; removing it would make the categorical test of every child whose household states no receipts "cannot determine", outside this phase's scope. That is the only default kept on a receipts read. Removed with the scalar facts: CO-994 and CO-2873 read child_support_received as 0; CO-3916 read lump_sum_received, lottery_gambling_winnings_received, retroactive_ssi_or_public_assistance_lump_sum_received and insurance_proceeds_spent_on_medical_or_burial as 0; CO-4463 read foster care, kinship care, PASS, workforce, supportive service, home care allowance and diversion amounts as 0; CO-4076 read the month's irregular income as 0. With the receipts each is a sum over a stated list (0 when no record matches; "cannot determine" only when the list is not stated, which already made CCCAP's income unknown before, since pension_income and the other aggregate facts had no default). Unchanged defaults on facts that are not receipts: adoption_subsidy_received, early_childhood_research_study_payments_received, rental_property_expenses_paid, retirement_early_withdrawal_penalty and tanf_state_diversion_payment_months (CO-4463), and the I.4, I.5, I.18 facts (CO-4464).

## 5. The cross-program allowlist

CO-3912 `wages_gross_prior_thirty_days` and CO-3913 `unearned_income_prior_thirty_days` were shared by CCCAP and LEAP (docs/reviews/cross-program-audit.md). After phase 1 LEAP no longer read CO-3913 (it reads its receipts); LEAP still reads CO-3912 (`leap_person_wages`, CO-3925). Now:

- CO-3913 has no reader (CCCAP reads its receipts) and is removed; its allowlist entry goes.
- CO-3912 is wages, not unearned income, and both programs still read it (CCCAP CO-3915, LEAP CO-3925), so it stays on the allowlist. The split was built and backed out because `npm run check` refuses it twice over: a LEAP-owned copy must carry LEAP's prefix (`name.prefix`), and renaming CO-3912 to `leap_wages_prior_thirty_days` edits its reader CO-3925, a LEAP item this track may not edit; and a CCCAP copy (`cccap_wages_prior_thirty_days`) has the same derivation as CO-3912, since neither rule reads the thirty-day wages differently (work-study left out by both; CCCAP 3.111.J.16), which governance refuses as a duplicate (`dup.compact`). The split belongs to a LEAP change, which decides whether the two identical copies get a sibling exemption from `dup.compact` or the owners keep one figure.
- volumes/co/cross-program-allowlist.yaml: 4 items and 6 readers held (10 entries), from 5 items and 7 readers (13 entries).

## 6. Harness result

`npm run receipts:harness` (baseline c29d326), programs LEAP, SNAP, Adult Financial, CCCAP and SUN Bucks, and with `--all-programs` every program's outcomes. Generated households: the five phase-1 bases and two new ones, CCCAP (CO-345's parent, earning $2,000) and SUN Bucks (CO-372's child, its Colorado Works payments taken out), each varied by one money fact at a time; a generated household is translated and both ledgers read the translation, as for a stored household (the phase-1 baseline reads receipts for three programs).

| Baseline | Source | Households | Values compared | Values that differ | Households that differ | Allowed | Unexplained |
|---|---|---|---|---|---|---|---|
| c29d326 (phase 2 alone) | stored households | 319 | 97,273 | 42 | 5 | 42 | 0 |
| c29d326 | generated households | 503 | 134,316 | 102 | 18 | 102 | 0 |
| c29d326, `--all-programs` | stored households | 319 | 147,483 | 42 | 5 | 42 | 0 |
| c29d326, `--all-programs` | generated households | 503 | 207,788 | 102 | 18 | 102 | 0 |
| ccbb3a7 (phases 1 and 2) | stored households | 316 | 96,553 | 47 | 8 | 47 | 0 |
| ccbb3a7 | generated households | 503 | 134,316 | 294 | 91 | 294 | 0 |
| ccbb3a7, `--all-programs` | stored households | 316 | 146,379 | 47 | 8 | 47 | 0 |
| ccbb3a7, `--all-programs` | generated households | 503 | 207,788 | 294 | 91 | 294 | 0 |

Against c29d326 the differences are classes C1 (20 households) and C2 (3); against ccbb3a7 they are phase 1's R1 to R5 and C1 (CO-458 to CO-460 were added after ccbb3a7 and are not compared there).

Stored households whose receipts are not the translation of their old facts: none. Metamorphic relations over every translated household, CCCAP's and SUN Bucks' outcomes and figures added (MA-1 split, MA-2 order, MA-3 month, MA-4 residual): 637 households, 0 violations each. MA-4 leaves out CCCAP's identifiers for a household that states rental property expenses, which are taken against the rents in other taxable income (policy says not invariant there). Families, each giving the rule's answer: F1 to F4 as in phase 1; F5 (CCCAP, H.4.i): a $1,500 payment received once in November 2026 by CO-345's parent gives household income 2,125 whether it is a county diversion, a gift, a lump-sum child support payment or an inheritance, and the diversion stated as recurring gives 3,500; F6 (SUN Bucks, 292.2): $300 of Colorado Works cash in September 2026 makes CO-372's child eligible_categorical in March 2027, and a $300 diversion gives the same answer as no receipt (OQ-993).

## 7. Every allowed difference

Pinned in scripts/receipts/allowed-differences.yaml under "Migration phase 2: CCCAP and SUN Bucks".

| Class | Households | Rule text | Old | New |
|---|---|---|---|---|
| C1: CCCAP counts by silence a kind an excluded scalar fact held | CO-219 (a $1,000 vocational training allowance), CO-220 ($500), and 18 generated: for each of the seven bases but SUN Bucks', energy assistance from a nonprofit or supplier, a vocational training allowance (part of the workforce payments), or another program's in-home care allowance | 8 CCR 1403-1 3.111.J.12 (S2207): "Low-Income Energy Assistance Program (LEAP) benefits"; J.17 (S3257): "Training allowances granted by Workforce Investment Act (WIA)"; J.24 (S3257): "Home Care Allowance under adult categories of assistance". 3.111.I names none of the three, and the volume counts a receipt J does not exclude (OQ-873's reading) | not counted: the old facts folded the nonprofit assistance into energy_assistance_received, the other training allowance into workforce_program_payments_received and any care allowance into in_home_care_allowance_received, which CCCAP excluded whole | counted (cccap_person_unearned_income, household income, the unearned-income verification trigger; CO-219: 0 to 1,000, CO-220: 1,250 to 1,750; the eligibility status of neither changes) |
| C2: CCCAP reads a household stated in receipts alone | CO-458, CO-459, CO-460 (the spike's families, written in receipts alone after the phase-1 baseline) | the transition rule (docs/plan-colorado.md): a household added after the migration may be written in receipts alone | cannot determine (the baseline's CCCAP read the scalar facts, which these households do not state) | CCCAP's figures (no expectation of these households names one) |
| R1 (phase 1's class), against the phase-1 baseline only | CO-345 (LEAP figures) | 9 CCR 2503-7 3.752.23.W (S3302): diversion payments excluded | cannot determine (the old CO-4069 needed the thirty-day facts for any lump sum) | 0 |

SUN Bucks shows no difference: CO-372 and the generated variant with $300 of Colorado Works cash are eligible_categorical on both ledgers.

## 8. OQ-873 and CO-345: a one-time payment of any kind is averaged

The probe hand-check (docs/reviews/probe-handcheck-cash-food-care.md, CO-345) found that CCCAP averaged a one-time payment under 3.111.H.4.i only when the case stated it as lump_sum_received; a one-time county diversion stated in the other unearned income facts was counted in full. 3.111.H.4.i (S2704): "Non-recurring lump sum payments, including lump sum child support payments, may be included as income in the month received or averaged over a twelve (12) month period, whichever is most beneficial for the recipient." The text reaches every non-recurring payment; it does not leave the kind open. With receipts the form of a payment is its own field (`frequency: once`), so `cccap_one_time_receipts_averaged` (CO-5722) averages every counted receipt paid once, whatever its kind (rule tests CO-5722-T5, T6; CO-3916-T8; family F5). OQ-873's assumption now says so; its first question (whether a diversion that is not cash assistance is income at all) stays open.

CO-345's household stated its diversion in month_defaults, which says the payment came every month; the probe describes one payment ("p1 earns $2,000 and receives a $1,500 diversion payment"), and a diversion is non-recurring by its own rule, 9 CCR 2503-6 3.606.8.A (S762): the agreement shall "Specify the need(s) for and the specific type(s) of non-recurring cash payment", and "All diversion clients who receive a one-time cash payment are not required to assign child support rights". CO-345 now states it as one payment in November 2026 (the old facts with lump_sum_received, the receipts as a colorado_works_diversion paid once), and expects, on OQ-873's recorded reading, 2,000 + 1,500 / 12 = 2,125, under 185% of the guideline (3,336.16): eligible_low_income (it expected 3,500, ineligible_income). Both ledgers give 2,125 on the restated household, so the harness shows no difference for CCCAP; the expectation change is the restatement, with the text quoted in the case's comment.

## 9. Translation

The translator states insurance_proceeds_spent_on_medical_or_burial (CO-4460, "Part of lump_sum_received") as `spent_on_covered_costs` on the one-time receipt that holds the proceeds, which CCCAP (I.21-22) and LEAP (3.752.21.C-D) read; no stored household states it. Stored households re-translated: CO-345 (section 8). The thirty-day unearned income (CO-3911) is still not restated: CCCAP reads the month's receipts as the prior thirty days, as it read a case that stated only calendar-month receipts (OQ-680); the stored households that state it (CO-125, CO-135) state the same amount in the month.

## 10. Open questions

Added: OQ-990 (CCCAP: kinds a J paragraph names only in part, or may name), OQ-991 (CCCAP: General Assistance and emergency assistance, and J.26's "public cash assistance grants including"), OQ-992 (CCCAP: money from a sponsor), OQ-993 (SUN Bucks: whether a diversion or supportive service payment is "assistance under TANF"). Updated: OQ-873 (section 8). Each row marked counted_no_rule_excludes is for the owner's sign-off rather than an open question.

## 11. What remains

- Colorado Works, Medicaid and CHP+ (parallel tracks); then the final cleanup retires the scalar facts without a reader (section 4 lists this phase's), the orphan derived CO-4077, and the translator.
- Kinds for the adoption subsidy (CCCAP J.10) and early childhood research study payments (J.29), which need a row in every program's table.
- The split of CO-3912 (section 5), in a LEAP change: rename it to `leap_wages_prior_thirty_days` with its reader CO-3925, give CCCAP its own copy, and settle how identical sibling copies pass `dup.compact`.
- The owners' row-by-row sign-off of the CCCAP and SUN Bucks tables, and OQ-990 to OQ-993.
