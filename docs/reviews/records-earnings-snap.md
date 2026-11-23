# Earned-income records, step E1: SNAP

Track E1 SNAP of docs/design-earned-and-resource-records.md (4.2, 4.3), from the end of step E0 (docs/reviews/earnings-e0.md, section 10, SNAP bullet), on branch ccr-9d19bf4c-wmnwcl at 9650b0c. SNAP's earned-income readers move from the scalar earned facts to the earnings records (CO-5100) through SNAP's counting table (snap_earnings_treatment_table, CO-5101); the track also fixes the SNAP findings handed to it (E0-F1, E0-F2/OQ-1021), the two SNAP P1s of the duplicate-paths audit (D-S3, D-S6), the last SNAP reader defaults over unstated receipts (decision 4), and the SNAP rows of the T-9 boundary hand check. Every changed rule has rule tests whose expected values are computed by hand from the rule text on file; no figure or text was written from memory. No host was fetched in this round: every text used is on file (D-7, D-13, D-14, D-15, D-82, D-95), and the one new excerpt (S4300) quotes D-82.

## 1. Commits

| Commit | What |
|---|---|
| a8f1920 | SNAP reads earned income from the earnings records (section 2); CO-4682 retired; reader defaults on the earned facts removed; CO-447 states its farm is not annual support; harness classes |
| 8b2cc97 | Wages an employer diverts to a third party are counted (10 CCR 2506-1 4.405.H.4, S4300); OQ-1021 resolved by the text |
| 72e1039 | CO-425 states its $600 of room and board once (finding E0-F1); its boundary.yaml entry removed |
| 6dedab9 | The prorated initial month is capped for disqualified members (D-S3): CO-6000 to CO-6002 |
| bb29e27 | Unpaid and community service work hours are verified as they are counted (D-S6): CO-6003 |
| 2bf2110 | Decision 4 on CO-5013, CO-5015 and CO-4151 (unstated receipts) |
| 4cabb6d | T-9 SNAP rows: OQ-1100 (A-5); CO-411-T4/T5, CO-344-T4, CO-340-T5 rebuilt with consistent givens |
| bd98db7 | OQ-1101 (the self-employment averaging fields, now required) |
| 595c81e | Change record volumes/co/changes/2026-11-23-records-snap.yaml; UI count pins |
| (last) | This review; docs/plan-colorado.md "E1 SNAP" (docs only) |

## 2. What SNAP reads now

| Item | Reads | Before |
|---|---|---|
| snap_person_wages (CO-4324) | every earnings record whose row is a pay row (counted, counted_no_rule_excludes, excluded, excluded_in_combat_zone, excluded_under_19_with_parent), each at its own amount: irregular pay as received; contract pay (annual_contract_pay) over 12 (4.403.3) unless the household is a destitute farmworker household (4.402.2.A.4); a stream paid weekly, biweekly, semimonthly or less often converted by its frequency (4.402.A.2), when a full month is anticipated (no job_start_date or job_end_date in the month; 7 CFR 273.10(c)(2)(i), S2050); a dated weekly or biweekly pay by its share of its schedule's paydays in the month | wages_gross, with work-study and irregular pay added back, one pay schedule per person (CO-3921, CO-3922) |
| snap_person_counted_wages (CO-5113, new; sibling of CO-4324) | the pay rows SNAP counts (counted, counted_no_rule_excludes, special pay outside a combat zone, WIOA on-the-job training unless CO-5112), with CO-4324's conversion, less the education deduction (4.405.2.A.13), less the irregular pay CO-5111 excludes, without pay dated after the application date in a destitute household's application month (4.406.1.A) | snap_person_wages less snap_excluded_earned_income and the after-date fact (CO-4930) |
| snap_excluded_earned_income (CO-2338) | the student exclusion as before; else CO-4324 less CO-5113 | the parts of wages_gross, each `otherwise 0`, the regular parts converted by a ratio (CO-4682) |
| snap_regular_wages_conversion_factor (CO-4682) | retired: each pay is converted on its own | |
| snap_irregular_income_is_within_quarterly_limit (CO-5110, new) | the quarter's irregular receipts (CO-5013) plus the quarter's irregular earnings records (every kind but costs, and not a meals-only or room-only copy) at most $30 (4.405.A, S3100; 273.9(c)(2), S3128) | written twice, in CO-2338 and CO-5014 (D-S4) |
| snap_irregular_earnings_are_excluded (CO-5111, new) | the month has irregular earnings and CO-5110 | |
| snap_wioa_ojt_earnings_are_excluded (CO-5112, new) | the month has WIOA on-the-job training pay, and the under-19 parental-control test of 4.405.2.A.6 | inside CO-2338 |
| snap_self_employment_gross_receipts (CO-5114), snap_farm_gross_receipts (CO-5115), snap_self_employment_costs (CO-1701), snap_farm_costs (CO-5116) | the business's and the farm's receipts (rows counted_less_costs, counted_loss_offset; irregular receipts within the quarter limit excluded; after-date receipts in a destitute application month left out) and their costs (row deducted; farm marked) | self_employment_gross_receipts and the cost facts, each `otherwise 0`, one business per person, a farm by a person fact |
| snap_self_employment_income (CO-1702), snap_farm_self_employment_loss (CO-3722) | business net and farm net each floored; farm loss from the farm's own records | one business |
| snap_self_employment_is_averaged (CO-4329), snap_self_employment_averaging_months (CO-4349) | every business record states annual_support, not changed_substantially, began before the application month; the months from the first month a business record operated | CO-4327, CO-4342, CO-4328, each `otherwise false` |
| snap_room_and_board_payments (CO-5117), snap_room_and_board_payers (CO-5118), snap_boarder_income (CO-4165) | boarder records that provide room_and_board and are not foster care; the boarder provision cost records | CO-4161 to CO-4164, `otherwise 0` |
| snap_person_earned_income_other_than_self_employment (CO-4930) | CO-5113 plus the VISTA and training allowance receipts | wages less excluded less the after-date fact |
| snap_requires_verification_of_earned_income (CO-1376) | the owner's pay records (paid_as_business_owner), the business records, CO-5117 | CO-4341, CO-1700, CO-4161, `otherwise 0` |
| snap_person_pay_received (CO-5119, new), snap_weekly_earnings_worked (CO-403), snap_meets_student_employment_exemption (CO-407) | the month's pay as received (pay rows, in-kind excluded) | wages_gross, `otherwise 0` |
| snap_excluded_irregular_receipts (CO-5014) | CO-5110, only in a month with an irregular counted receipt | its own copy of the quarter test |
| snap_irregular_unearned_receipts_in_quarter (CO-5013) | leaves out a receipt kind SNAP reads from earnings (read_from_earnings) | |

No SNAP item reads a scalar earned-income fact now, except snap_countable_nonliquid_resources (CO-074), a resource item, which reads farming_self_employment_end_date (the farm record's job_end_date): it is for the SNAP resources track (H1) or E2, and is named so E2 does not retire the fact under it.

## 3. The counting table (CO-5101), row by row

| Kind | Row (E0) | Row (E1) | Why |
|---|---|---|---|
| self_employment_receipts | counted | counted_less_costs | a named rule, so the readers tell a business from pay by the row (4.403.11, 273.9(b)(1)(ii)) |
| in_kind_pay | excluded | excluded_in_kind | its own row, so the pay readers leave it out as wages_gross did (273.9(c)(1)) |
| employer_vendor_payment | not_counted_text_counts | counted | 4.405.H.4 (S4300), H.2, 273.9(c)(1)(vii)(B) (S4101): finding E0-F2, OQ-1021 resolved |
| uniformed_services_special_pay | excluded_in_combat_zone | unchanged; read as earnings | the non-combat half is pay (273.9(b)(1)(i)); the receipt row (CO-5010) is now read_from_earnings, so the transition copy is not counted again as unearned |
| boarder_payments | counted_above_boarder_allowance | unchanged | 4.403.2 for room and board; a meals-only or room-only payment stays read from its receipt (OQ-996 open, below) |

The table's options lose not_counted_text_counts and gain counted_less_costs and excluded_in_kind (the table's own options; no kind or field was added). Rows still for the owner's signature (earnings-e0.md section 7): special pay outside a combat zone, subsidized_employment, decennial_census_employment, difficulty_of_care_payment, employer_health_insurance_subsidy (counted_no_rule_excludes), business_cost_home_space and business_cost_vehicle (not_deducted_no_rule_found).

**OQ-996 (meals only, room only).** Checked again against the text on file: 7 CFR 273.1(b)(3)(ii) (D-7) calls "individuals ... paying a reasonable amount for meals or meals and lodging" boarders, but 10 CCR 2506-1 defines a boarder as one "paying reasonable compensation to others for lodging and meals" and a roomer as one furnished "lodging, but not meals" (D-82, 4.304.31), and a roomer's payment is rent, earned or unearned by the 20-hour management test of 273.9(b)(1)(ii) (S41). The text does not plainly settle it; it stays for the owner, with its assumption (unearned income) kept: SNAP reads those payments from the receipts, and its earnings readers leave the transition copies out (CO-5110, CO-5117). **Request to the integration owner (E2):** when board_only_payment and room_only_payment leave the receipts, SNAP's unearned income must read the boarder records with provides board_only or room_only, with OQ-996's answer.

## 4. Answer changes and their classes

`npm run records:harness -- --list earnings --track snap` against EARNINGS_BASELINE (20004af): stored households 327, 37,527 values, 184 differ, all allowed; generated households 56 (bases CO-155 and, new, CO-447's farmer), 5,600 values, 123 differ, all allowed. scripts/records/allowed/e1-snap.yaml:

| Class | What | Households | Rule |
|---|---|---|---|
| E1-1 (fix) | SCSEP pay stated as LEAP's scsep_wages was counted by SNAP (its exclusion read only scsep_payments_received) | generated: wages 1,200 of which SCSEP 300 (earned 1,200 -> 900) | 4.405.2.A.9 (S3109) |
| E1-2 (fix) | wages an employer diverts to a third party were not counted | generated: the vendor-payment variants (gross 400 -> 700, allotment 507 -> 435) | 4.405.H.4 (S4300) |
| SE-D4-1 | a business record that does not say whether it is the household's annual support: SNAP self-employment income cannot be determined (before: read as no) | stored CO-136, CO-182, CO-322, CO-382, CO-383, CO-387 (CCCAP and MAGI probes, no SNAP expectation); generated business and farm variants | decision 4; D3 (CO-5100 declares annual_support required); OQ-1101 |
| EU-D4-1 | a person who states no earned income: excluded earnings, business costs, farm loss and boarder income cannot be determined (before: 0 by reader defaults); the person's earned income was already cannot determine, so no outcome changes | 38 persons in 32 stored households, each checked to state no earnings | decision 4 |
| E1-R1 | a farm's costs are snap_farm_costs, so a farmer's snap_self_employment_costs is 0; the net and the loss are unchanged | CO-447 p1; farm variants | the figure's meaning |
| R-D4-1 | not this track's: the receipts reader-defaults round (b49a7f2), merged after the baseline | CO-141 p3 sponsor money | decision 4 |

Translation: 317 stored households and 511 rule tests state earnings; 0 are not the translation (rule tests restated by this track state earnings alone, which the translator leaves as stated). Boundary lint: 0 findings, 0 known (CO-425 restated), 7 transition copies. Metamorphic: ME-2 order and ME-4 cost relabel 0 violations over 267 households and 8 figures each; ME-1 split is not invariant for one reason, recorded in scripts/records/programs/snap.ts (a boarder record's `boarders` is repeated by a split: run with it, every violation was a boarder record); ME-3 not invariant (year averaging, quarter test); ME-5 (dated against stream) is the rule-test family CO-4324-T11 to T13 (four dated weekly pays of $250 in February 2027 and five in January 2027 both give 4.3 x 250 = 1,075; two biweekly pays of $600 give 2.15 x 600 = 1,290).

Stored households restated by this track (SNAP households only): CO-447 states self_employment_is_annual_support false (its farm record annual_support false), as the review's monthly figures read it; CO-425 (E0-F1) states its $600 of room and board once, as the boarder record (its receipt other_taxable 600 and the retired other_unearned_income_taxable 600 removed; scripts/receipts/retired-facts.yaml edited for that household); neither expectation changes.

## 5. The P1s of the duplicate-paths audit

- **D-S3, fixed.** CO-2308 prorates snap_full_month_allotment_before_minimum (CO-6002): the lesser of the household's own allotment (CO-6000, which CO-2307 now reads) and the cap before the minimum (CO-6001, which CO-4182 now raises to the minimum for the full month). The audit's household gives 400 from the 1st (was 546) and 206 from the 16th of a 31-day month (400 x 16 / 31 = 206.45; was 281): CO-2308-T7, T8; from the figures, CO-2308-T9 (cap 808 - ceil(0.3 x 2,000) = 208; own 412; 20 of 31 days: 134).
- **D-S6, fixed.** CO-415 and CO-1386 both read snap_abawd_unpaid_work_hours (CO-6003: unpaid, in-kind and community service hours, read as CO-415 read them); the audit's ABAWD with 85 hours of unpaid work is now asked to verify them (CO-1386-T6; 7 CFR 273.2(f)(1)(xiv)(A), S810; 4.311.B.1.a, S132). The hours facts' own `otherwise 0` is the requirement's reading, unchanged; whether those facts should be required is for a decision-4 round on the hours facts.
- **D-S4 (P2), fixed** on the way: one quarter test (CO-5110).

Both rows are marked fixed in docs/reviews/duplicate-paths-audit.md.

## 6. Decision 4 on unstated receipts

CO-5013 (each quarter month `otherwise 0`), CO-5015 (each earlier month `otherwise 0`) and CO-4151 (unstated receipts read as no winnings) now read the list with no default (4.405.A, 4.405.A.10, 4.403.I and 7 CFR 273.11(r) give no reading for money not reported). No stored outcome changes: their readers ask for a quarter only in a month with irregular income of their own list, and a member with unstated receipts already had unknown income. CO-4011 is Adult Financial's (af_infrequent_income_quarter_total), not SNAP's: it still reads `otherwise 0` on each month's receipts and is the Adult Financial track's to change.

## 7. T-9 hand check, SNAP rows

- A-5 (CO-1394-T14): not settled by 4.205.11.B.2.b ("within thirty (30) calendar days" and "terminate ... on the thirtieth (30th) calendar day"); recorded as OQ-1100, assumption the test's reading.
- Contradictory givens rebuilt (expected values unchanged, arithmetic in a comment on each test): CO-411-T4 (born 2008-10-01: 18 on 2026-10-01), CO-411-T5 (born 1976-10-02: 49), CO-344-T4 ($1,000 + $2,000 = the $3,000 limit, S732), CO-340-T5 ($2,660 of monthly wages = the FY2027 200% limit for one, S739).

## 8. Open questions

Added: OQ-1100 (above), OQ-1101 (whether 4.403.12.A gives changed_substantially a default; annual_support and changed_substantially are required where read, so six stored probes of other programs and the generated business households are cannot determine for SNAP). Resolved: OQ-1021. Left open: OQ-996 (section 3), OQ-1020.

## 9. Requests to the integration owner, and things seen outside SNAP

1. **Receipts harness gap (blocks the receipts gate for every E1 track).** `npm run receipts:harness -- --all-programs` builds its generated households from the baseline's stored households and translates only their receipts: they state wages_gross but no earnings list. Once a program reads the earnings records, its earned income for those households is cannot determine, so the gate reports thousands of unexplained differences that are the harness's, not the rule's (SNAP: about 6,000 values, snap_person_earned_income and what follows). The fix is to run the earnings translator (scripts/records/translate-earnings.ts, translateCase) on the generated households' new statement in scripts/receipts/harness.ts, as the transition rule says every household is stated; this track was not permitted to edit that shared file. The stored-household differences it reports are class SE-D4-1 (CO-136, CO-182, CO-322, CO-382, CO-383, CO-387), which scripts/receipts/allowed-differences.yaml does not yet list.
2. **when_absent fields read through `unknown`.** SNAP's conversion reads job_start_date, job_end_date, annual_contract_pay and date to test whether they are stated; the engine reports each unstated one as a missing supplied fact on the trace, though its absence has a declared meaning. No answer changes, but a cannot-determine list can name them. The engine could skip the report for a when_absent field.
3. **changed_substantially** (OQ-1101): if the owner reads 4.403.12.A as giving it a default of no, the default belongs on CO-5100.
4. **E2**: board_only_payment and room_only_payment (section 3); CO-074's farming_self_employment_end_date (section 2).
5. **CO-4011** (Adult Financial) keeps `otherwise 0` on each quarter month's receipts (section 6).
6. **Medicaid reads SNAP.** CO-608, CO-613, CO-616 and CO-654 move fingerprint when SNAP income items change (their dependency trees include snap_person_unearned_income, CO-1702, CO-4329); the four pairs are re-keyed in this track's change record with the earlier reasons. Whether those reads are declared cross-program links is for the Medicaid owner.

## 10. Gates

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written (snap 228 items) |
| `npm run typecheck` | passes |
| `npx vitest run` | 1,131 tests pass (101 files), after the pins in test/ui (question queue 160, long rule lines 42) were re-pinned with their reasons |
| `npm run records:harness -- --list earnings --track snap` | OK (section 4) |
| `npm run receipts:harness -- --all-programs` | NOT 0 unexplained: stored 319 households, 656 values differ, 638 allowed, 18 unexplained (all class SE-D4-1: CO-136, CO-182, CO-322, CO-382, CO-383, CO-387); generated 1,626, 10,567 differ, 6,076 unexplained (the harness gap of section 9.1: generated households state no earnings). Blocked on the integration owner's files (scripts/receipts/harness.ts, allowed-differences.yaml) |
| `CHECK_BASE=origin/main npm run check` | OK, conformance self-check OK (4,996 cases); 8 flags dispositioned in volumes/co/changes/2026-11-23-records-snap.yaml. CO-387:p2:chp_copayment_income_band fails as before (conformance/known-failures.json) |
