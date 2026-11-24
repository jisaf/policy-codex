# Orphan facts

Supplied facts no rule reads, after steps E2 and H2 (2026-11-24; docs/reviews/records-e2-h2.md). Source: docs/reviews/service-design-fact-burden.md, FB-13 ("115 of the 760 supplied facts have no reader"), recounted on the ledger before the step (HEAD 8e32fc4, 763 supplied facts) by walking every derived item's expression.

## 1. Supplied facts with no reader

Before the step: **114** supplied facts had no reader, and two more (wages_gross, self_employment_gross_receipts) were read only by has_earned_income (CO-1356), which nothing reads: 116, close to the review's 115 (its count predates the last rounds).

| Group | Facts | Why unread | Action |
|---|---|---|---|
| Earned income replaced by the earnings records (CO-5100) | 48 (46 unread, plus CO-023 and CO-1700 read only by CO-1356) | every program reads the earnings records since E1 | **retired** in E2, with CO-1356 |
| Resources replaced by the holdings records (CO-5300) | 65 | every program reads the holdings records since H1 | **retired** in H2 |
| unearned_income_offsetting_expenses (CO-4444) | 1 | replaced by the receipt's own fields (claim_expense, spent_on_covered_costs) and by rental_property_expenses_paid and school_attendance_expenses_paid (coverage pass 4, CA4-1); its precision said "left in the ledger for the final cleanup" | **retired** (a migration leftover) |
| retirement_early_withdrawal_penalty (CO-4459) | 1 | replaced by the receipt field early_withdrawal_penalty (coverage pass 5, C5-2); "waits for the final cleanup" | **retired** (a migration leftover) |
| has_self_employment_seasonal_or_commission_earnings (CO-4557) | 1 | replaced by ma_has_annualizable_earnings, read from the earnings records (coverage pass 4, C4-05); "kept for the final cleanup" | **retired** (a migration leftover) |

After the step: **0** supplied facts have no reader. Every orphan the review counted was a leftover of the records migration, so no supplied fact is left here for a product decision.

The unearned-income facts the receipts replaced were retired earlier (receipts phase 3, 2026-11-23); their statements lived on in scripts/receipts/retired-facts.yaml for the translation check, which E2 also retires.

## 2. Supplied facts read only by items that reach no outcome

Not orphans in the strict sense (a rule reads each), but no program outcome depends on them: they are read only by derived items no outcome reads. None is a migration leftover; each is a figure the volume computes for a purpose the outcomes do not cover. Listed for the owners; not retired.

| Id | Identifier | Read by | Why it reaches no outcome | Proposed action |
|---|---|---|---|---|
| CO-1745 | cw_work_activity_hours | cw_countable_work_activity_hours (CO-2885), read by cw_meets_work_participation (CO-920), which is expected in stored households but is no declared Colorado Works outcome | the work participation rate is a county measure, not an eligibility condition | Colorado Works owner: declare CO-920 an outcome, or confirm it stays a reported figure |
| CO-2223 | chp_service_type | chp_scheduled_copayment (CO-2230), read by chp_copayment (CO-2231) | the copayment is a cost-sharing figure, not an eligibility outcome | CHP+ owner: declare chp_copayment an outcome, or leave it a reported figure |
| CO-2224 | chp_family_cost_sharing_paid_for_year | chp_copayment (CO-2231) | as above | as above |
| CO-2462 | ma_buy_in_determination_month | ma_wawd_premium (CO-619), ma_cbwd_premium (CO-621), ma_cbwd_premium_is_due_in_month (CO-7861) | the buy-in premiums are amounts owed, not eligibility outcomes | Medicaid owner: declare the premiums outcomes, or leave them reported figures |

## 3. Derived items the migration left without a reader

Outside the supplied-fact count, listed because design 4.2 named them for H2 (when they were supplied figures). Not retired: each carries rule tests of a computation that is right, and retiring derived items is a change to what the volume computes.

| Id | Identifier | Why unread | Proposed action |
|---|---|---|---|
| CO-2861 | ssi_countable_resources_of_couple | "read from this person where stated, otherwise from the spouse": a fallback for a supplied couple figure, which H1 made derived (CO-801); no item reads it (2 rule tests) | retire with the Medicaid owner's agreement |
| CO-801 | ssi_countable_resources_couple | the SSI couple's resources from the holdings (H1); read only by CO-2861, the Medicaid couple tests reading their own items (3 rule tests) | Medicaid owner: read it where the couple's limit is tested, or retire it with CO-2861 |

The ledger has 21 other derived items with no reader that are not declared outcomes (for example snap_is_eligible CO-386, ma_funding_source CO-2456, chp_presumptive_eligibility CO-708, snap_real_property_not_exempt CO-5310, leap_has_countable_unearned_income CO-2874); none reads a retired fact, and whether each should be an outcome is outside this step.
