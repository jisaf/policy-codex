# Receipt records, migration phase 2: Colorado Works unearned income

Phase 1 (docs/reviews/receipts-migration-1.md) moved the unearned income of LEAP, SNAP and Adult Financial onto receipt records. Phase 2 moves Colorado Works (9 CCR 2503-6): the assistance unit, every person whose income is deemed to it (a budgetary member such as a stepparent, a minor parent's parent, a sponsor and the sponsor's spouse), diversion and the death reimbursement. Only unearned income moves: the earned income disregards (3.606.2) and every earned-income fact are unchanged. CCCAP, SUN Bucks, Medicaid and CHP+ still read the scalar unearned-income facts (parallel phases move them); the transition rule of phase 1 is unchanged (docs/plan-colorado.md).

The gate is `npm run receipts:harness`, with and without `--all-programs`, against **c29d326**, the commit this phase started from: phase 1 merged, Colorado Works still on the scalar facts, so the harness measures the Colorado Works move and nothing else.

**Paragraph numbers.** The Colorado Works income rules are 3.605.3 (countable unearned income), 3.605.4 (exempt unearned income) and 3.605.5 (child support) of the rule version effective 2025-07-01 (D-81, the Secretary of State's current version). 3.606 is certification and benefit calculation (diversion is 3.606.8, burial 3.606.7) and 3.607 workforce development; the counting table cites 3.605 throughout, and 3.606 or 3.609 only where those sections govern (3.606.8.A.7, 3.609.2.G).

## 1. Commits

| Commit | What |
|---|---|
| table and readers | cw_receipt_treatment_table (CO-5650) and the Colorado Works items rebuilt on the receipts; cw_excluded_unearned_income (CO-2341) removed; the translator's two Colorado Works part-of facts; the harness, generated households and metamorphic relations extended; stored households CO-580 to CO-582; OQ-985 to OQ-987; excerpts S4000 to S4004; the change record; UI counts re-pinned. |
| docs | This review; the phase-2 note in docs/plan-colorado.md; docs/conventions.md, "Receipt records". |

## 2. The counting table

cw_receipt_treatment_table (CO-5650), a `table keyed by option` keyed by kind, one row per kind (49), treatments in its `options`. One table for a member of the unit and for every deemed person, since all of them are counted through cw_countable_unearned_income (CO-908), so the deeming path cannot drift from the members'.

| Treatment | Kinds (paragraph) |
|---|---|
| counted, a paragraph names it | social_security (3.605.3.A.20, B.8), pension (A.16, B.2, B.7), unemployment_compensation (A.19, B.6), interest_and_dividends and tax_exempt_interest (A.15), rental_income (A.2, net of allowable expenses), workers_compensation (A.18, B.4, less claim_expense), gambling_winnings, gift, charitable_gift_life_threatening_condition (A.14), va_aid_and_attendance (A.1, B.5, less used_for_uncovered_medical_care, 3.605.4.A.6), state_veteran_annuity (A.1, A.16) |
| **counted because no rule excludes it** (3.605.3: "Unless otherwise specified, any unearned income is countable"; the Colorado Works owner signs each row) | adult_financial_cash, resource_liquidation, property_or_food_tax_refund, kinship_care_payment (OQ-985), colorado_works_diversion and colorado_works_supportive_services (OQ-986), housing_utility_allowance, americorps, uniformed_services_special_pay, charitable_need_based_cash and migrant_farmworker_emergency_assistance (OQ-987), other_taxable, other_nontaxable |
| counted_beyond_school_expenses | gi_bill_housing_food_allowance (A.4) |
| excluded_except_school_conditional_part | educational_assistance (B.26; its attendance-conditional part is counted under A.4) |
| child_support | child_support (3.605.5.A-C: eligibility at application, consistent support over $500 at redetermination, never the grant) |
| sponsor_contribution | sponsor_payment (A.14 gift unless the sponsor's income is deemed, A.11, 3.605.1.A.5) |
| not_income_to_unit | colorado_works_cash (the unit's own grant; 3.609.2.G for a retroactive correction; conventions rule 6) |
| excluded | child_support_arrears (3.605.5.D), ssi (3.605.4.B.27), income_tax_refund (A.1, B.34), energy_assistance_federal (B.31), energy_assistance_other (A.4), emergency_assistance (A.3), in_home_care_allowance and home_care_allowance (A.5, OQ-700), general_assistance (A.7), crime_victim_compensation (A.8), loan and reverse_mortgage (B.1), federally_excluded_payment (B.7, B.17, B.19, B.23 and the federal statutes), foster_care_payment (B.11), dvsa_title_i_volunteer_payment (B.12), workforce_program_payment (B.13, B.14, B.16), vocational_training_allowance (B.13), reimbursement (B.18), refugee_resettlement (B.28, B.29) |

Every row counted because no rule excludes it is a kind Colorado Works counted before receipt records by silence: it sat in the other unearned income facts and was not among CO-2341's sources (adult_financial_cash by the vocabulary fix round's reading of the same silence). americorps is national service; B.12 names Title I VISTA, which is dvsa_title_i_volunteer_payment, excluded. home_care_allowance (the Adult Financial HCA) is excluded with in_home_care_allowance under A.5; before receipt records it could be stated only inside adult_financial_cash_income, which Colorado Works counted, and no stored or generated household states it.

## 3. What Colorado Works reads now

| New | Rewritten | Removed | Facts left without a reader (not retired: the final cleanup retires orphans) |
|---|---|---|---|
| CO-5650 table; CO-5651 cw_counted_unearned_receipts (counted rows, less the PASS, claim-expense and VA-care fields, plus CO-5654); CO-5652 cw_child_support_receipts (current support of the month); CO-5653 cw_basic_cash_assistance_receipts (the month's grant, not retroactive); CO-5654 cw_school_attendance_benefits_counted (A.4) | CO-908 countable unearned income and CO-2554 its grant twin; CO-2553 counted child support, CO-2550 months received, CO-2551 six-month average; CO-2842 half sibling receiving support; CO-2871 has countable unearned income (the verification element); CO-4363 sponsor money; CO-4369 deductions; CO-1270 diversion (3.606.8.A.7); CO-1504 deceased client | CO-2341 cw_excluded_unearned_income | CO-3814 child_support_arrears_received, CO-3813 crime_victim_compensation_received, CO-3707 money_received_from_sponsor, CO-4367 refugee_resettlement_payments_received, CO-4371 retroactive_colorado_works_lump_sum_received, CO-3820 reverse_mortgage_payments_received, CO-3823 va_aid_and_attendance_used_for_uncovered_care, CO-4366 workers_compensation_award_expenses |

The deeming items (CO-909, CO-2353, CO-2364, CO-2365) and the unit's income (CO-910, CO-923) read CO-908 and CO-2554 per person and need no change. `npx vite-node scripts/receipts/readers.ts` lists no Colorado Works reader of a scalar unearned-income fact.

**The items that only decided where money sits.** cw_excluded_unearned_income (CO-2341) summed fifteen receipts the gross facts already held (energy assistance, General Assistance, crime victim compensation, WIOA payments and the rest of 3.605.4) so its readers could subtract them again; the counting table now never counts them. Within the rebuilt items the same work is gone: CO-2553 and CO-2551 no longer subtract the arrears stated inside child_support_received (arrears are their own kind), and CO-4369 no longer takes back refugee resettlement money (a kind the table excludes), the retroactive Colorado Works payment (colorado_works_cash, retroactive, never income to the unit) or workers' compensation award expenses capped at the residual that held the award (the receipt's claim_expense).

**What CO-4369 still takes off**, because no receipt kind or field restates it yet, or because it is an expense: rental expenses (A.2), lump sums spent or designated (A.5, A.6, B.33), insurance cash value (B.30), an SMIB refund (3.605.3.B.9), savings account distributions (B.20-22, B.25, moved here from CO-2341), board-only and room-only payments (3.605.2.E.4.c-d) and a military allotment for persons outside the home (3.605.3.B.10). Each of the money facts among them is "part of" a counted receipt; a kind or field for each needs a row in every program's counting table, and is left for the round that settles earned income and resources or the final cleanup (section 9). Rental expenses are capped at the month's rent, read as the receipts of kind rental_income or of the other unearned kinds where rent was stated before receipt records (CO-4458's meaning), less the board-only and room-only payments within them; the receipts are read only when expenses are stated.

**Defaults (`otherwise 0`).** Kept only where phase 1's section 4 kept the same kind of read:

| Item | Read | Phase-1 counterpart |
|---|---|---|
| CO-1270 cw_diversion_eligible | the month's basic cash assistance (CO-5653), none when not stated (3.606.8.A.7) | the Adult Financial grant tests, CO-1220 and CO-3877; LEAP's public-assistance test, CO-4518 |
| CO-1504 cw_is_deceased_client | the grant in the month of death (CO-5653), none when not stated | CO-1220 (death while receiving) |
| CO-4363 cw_sponsor_contributions_counted | the month's sponsor_payment receipts, 0 when the receipts are not stated | SNAP's sponsor money, CO-3701 |

Every other receipt read has no default: unstated receipts are "cannot determine" (CO-5651-T6, CO-908-T7). The `otherwise 0` on facts the receipts do not restate are unchanged and are not receipt reads: cw_refused_potential_income (a county finding), school_attendance_conditional_benefits_received and school_attendance_expenses_paid (CO-5654), and CO-4369's expense and part-of facts.

## 4. Translation

The translator (scripts/receipts/translate.ts) restates two Colorado Works part-of facts that Colorado Works now reads from the receipts: workers_compensation_award_expenses (CO-4366, part of the nontaxable residual) becomes a workers_compensation receipt whose amount and claim_expense are the expenses, as the retired LEAP fact was; retroactive_colorado_works_lump_sum_received (CO-4371, part of the retroactive "SSI or public assistance" lump sum) becomes a colorado_works_cash receipt, paid once and retroactive, the rest of that lump sum keeping the case's chosen kind. No stored household states either, so no household's receipts changed; `npm run receipts:translate -- --dry-run` re-translates 0 households and 0 rule tests. The rebuilt items' rule tests are written in receipts alone (the three retired-fact entries of CO-908-T1, T2 and T4 removed with the old statements).

A stored household that lacks a receipt detail Colorado Works needs (a frequency, a date) would cannot-determine; the harness found none, so none needed a stored case for that reason. CO-580 to CO-582 are added to show the counting table on whole households (section 7).

## 5. Harness, generated households, metamorphic relations

- **Baseline** c29d326 (scripts/receipts/ledgers.ts). Colorado Works is among the programs always compared, with its income figures (CO-908, CO-2554, CO-2553, CO-910, CO-923, CO-4363, CO-2365, CO-2353, CO-909, CO-2871).
- **Generated households**: three Colorado Works bases join the five of phase 1: an applicant (CO-358 p1), a stepparent whose income is deemed (CO-83 p2) and a sponsor living elsewhere (CO-162 p3), each varied by every money fact (574 households). From phase 2 both ledgers evaluate the translated household (old facts kept, receipts added), since the baseline itself reads the receipts for LEAP, SNAP and Adult Financial.
- **Metamorphic relations** MA-1 to MA-4 cover the Colorado Works figures and outcomes (eligibility status, grant, deemed income, the verification element); MA-3 leaves child support out (Colorado Works reads the six months before a redetermination); the households written in receipts alone are among those checked. **Families**: F1 gives Colorado Works 900 for eligibility (current support at application) and 0 for the grant; F3 800 (what is received in the month, 3.605.1.A.1); F4 the same answer for Social Security and a pension with a PASS (200); new F5, a $2,000 workers' compensation award with $600 of claim expenses and $400 of VA Aid and Attendance with $150 for uncovered care, gives 1,650 whether the parts are fields or the receipts are split.

## 6. Harness result

| Source | Households | Values compared | Values that differ | Households that differ | Allowed | Unexplained |
|---|---|---|---|---|---|---|
| stored households | 319 | 104,870 | 86 | 20 | 86 | 0 |
| generated households | 574 | 181,864 | 415 | 208 | 415 | 0 |
| stored, every program's outcomes | 319 | 150,731 | 86 | 20 | 86 | 0 |
| generated, every program's outcomes | 574 | 264,920 | 415 | 208 | 415 | 0 |

Stored households in receipts alone, checked by their expectations: CO-580, CO-581, CO-582. Stored households whose receipts are not the translation of their old facts: none. Metamorphic relations over 711 households: 0 violations each; every family gives the rule's answer. No CCCAP, Medicaid, CHP+, LEAP, SNAP, Adult Financial or SUN Bucks value differs.

Every allowed difference (scripts/receipts/allowed-differences.yaml, under "Phase 2, Colorado Works"):

| Class | Households (values) | Rule text | Old | New |
|---|---|---|---|---|
| CW1: Colorado Works reads the households written in receipts alone | CO-458, CO-459, CO-460 (29) | 3.605.3; 3.605.5.A "current child support payments received by the assistance unit shall be considered income and counted against the need standard"; B "excluded in the basic cash assistance grant calculation"; 3.605.4.A.8 crime victim compensation exempt | cannot determine (the scalar facts these households never state) | CO-458: countable unearned 900, grant figure 0; CO-459: 0 (arrears paid in October, exempt, 3.605.5.D); CO-460: 800 |
| CW2: Colorado Works verifies the unearned income it counts | stored CO-99, CO-171, CO-175, CO-219, CO-220, CO-319, CO-353, CO-358, CO-373, CO-374, CO-408, CO-409, CO-410, CO-423, CO-432, CO-489, CO-535 (57); 208 generated (286): cw_has_countable_unearned_income, cw_unearned_income_verification_is_pending, the pending counts and cw_verification_status | 9 CCR 2503-6 3.604.3.B.2.e (S872): "Verification of income of any member of the assistance unit or other household member whose income is used to determine eligibility and payment" | the sum of the scalar facts: true for a person whose only unearned money is exempt (crime victim compensation, foster care payments, WIOA or training allowances, General Assistance, LEAP, a loan: they sat in the other unearned income) or arrears; false for a person with only a prize (stated outside the facts) | true only when a receipt Colorado Works counts, or current child support, is above zero; a prize is counted (3.605.3.A.14), so CO-99, CO-353 and CO-535 now need unearned_income_is_verified, which they do not state (cannot determine) |
| CW3: a retroactive SSI award is SSI | 8 generated "retroactive SSI/PA lump 300" (43) | 3.605.4.B.27: "A client receiving SSI payments shall be excluded from the assistance unit and his or her income shall be exempt" | the lump sum counted: the scalar facts could state it only inside other_unearned_income_nontaxable | the default kind of the split CO-3920 fact (ssi, retroactive) is exempt; e.g. the applicant base: countable 300 to 0, October grant 123 to 320 |
| CW4: workers' compensation claim expenses are a field of the award | 16 generated "workers_compensation_claim_expense_amounts_received 300" (86) | 3.605.3.B.4: "amounts included in such awards for medical, legal, or related expenses incurred by a client in connection with such claim are deducted in determining the amount of countable unearned income" | counted: Colorado Works read the expenses only from its own second statement of them (workers_compensation_award_expenses, CO-4366), which these households do not state | the receipt's claim_expense is deducted (CO-5651); e.g. countable 300 to 0, grant 123 to 320 |

Before the merge, run it again: a parallel phase that moves CCCAP or Medicaid edits the same scripts (harness FIGURES and MIGRATED, generate.ts BASES, allowed-differences.yaml, translate.ts), and its baseline is its own start.

## 7. Stored households added

Each is built on CO-358 (a single mother of 24 and her daughter, applying 2026-10-12, determined 2026-10-15, no earnings; need standard 331, grant standard 488, October paid from the twelfth at .65754), its money in receipts alone, hand derived:

| Case | Receipts | Hand derivation |
|---|---|---|
| CO-580 | $250 current child support; $100 arrears paid once in October; a $3,000 crime victim payment on October 5 | countable unearned 250 (3.605.5.A; D; 3.605.4.A.8) < 331: eligible; grant figure 0 (3.605.5.B): 488, October 320 |
| CO-581 | a $500 workers' compensation award with $300 of claim expenses; the child's $100 Social Security | 200 + 100 = 300 < 331: eligible; 488 - 300 = 188, October 123 |
| CO-582 | $900 rent (rental_income) with $700 of allowable expenses; a $244 retroactive Colorado Works correction | 900 - 700 = 200 (A.2); the correction is the unit's own grant (3.609.2.G) and not the month's assistance: eligible; 488 - 200 = 288, October 189 |

## 8. Open questions added

OQ-985 (a kinship care payment received for a related child, B.11), OQ-986 (Colorado Works' own diversion and supportive services payments), OQ-987 (a migrant farmworker's emergency assistance and need-based charitable cash, A.3 and B.9). Each keeps the reading before receipt records (counted) as its assumption. The other counted-because-no-rule-excludes rows are for the owner's sign-off rather than open questions.

## 9. What remains

- CCCAP, SUN Bucks, Medicaid and CHP+ (parallel phases); the last one retires the scalar facts and the translator, and the final cleanup retires the orphans listed in section 3.
- Kinds or fields for the money Colorado Works still reads as a part of a counted receipt (board-only and room-only payments, savings account distributions, an SMIB refund, insurance cash value, a military allotment for persons outside the home, the attendance-conditional part of educational assistance) and the lump-sum amounts spent or designated (lump_sum_amounts_spent_or_designated, beside the receipt's spent_on_covered_costs, which covers A.5 and A.6 but not B.33): each needs a row or field in every program's counting table, so it belongs to a round that may edit them all.
- The Colorado Works owner's row-by-row sign-off of CO-5650 and OQ-985 to OQ-987.
