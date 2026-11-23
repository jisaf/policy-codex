# Receipt records, migration phase 1: LEAP, SNAP and Adult Financial unearned income

The product owner adopted receipt records on 2026-11-23 (docs/plan-colorado.md, "Decision, 2026-11-23: adopt receipt records"; the evidence is docs/reviews/receipt-spike.md). Phase 1 moves the unearned income of LEAP, SNAP and Adult Financial (deeming included) onto one neutral `receipts` fact per person, read through one counting table per program. Colorado Works, CCCAP, Medicaid, CHP+ and SUN Bucks still read the scalar unearned-income facts; the transition rule below keeps both statements consistent until the last reader moves. Earned income and resources are decided after unearned income is done (condition 3).

The merge gate (condition 4) is `npm run receipts:harness`: every stored household and 361 generated households on the ledger without the migration (41ec04b, then 82a29d0 once origin's non-MAGI fix round was merged in) and on the ledger after it, every difference matched to a class below or failing, every stored household's receipts checked to be the translation of its old facts, and the metamorphic relations and families of the spike. Each migration commit ran it clean.

## 1. Commits

| Commit | What |
|---|---|
| engine | The recorded guardrail exception: `list of receipts` with its record schema (`record_fields`: per field type, meaning, options, and exactly one of `required`, `default`, `when_absent`), P55 `sum_receipts`, P56 `receipt`, P57 `received_in`; type check, constraints, render and parse, plain English, YAML, fingerprint (covers the schema), case validation (`npm run check` blocks a stated record that does not fit its schema), ledger.json and suite export, the cannot-determine generator (removes one record's amount first); docs/operators.md "Receipt records" for engine teams; unit tests (test/engine/receipts.test.ts, test/export/receipts-export.test.ts). A follow-up engine commit reads a dated record's month from its date (P56). |
| kinds and facts | CO-5000 `receipts` and its kinds (49 with the Home Care Allowance, H-5); scripts/receipts (harness, translator, generated households, metamorphic tests), moved from prototypes/receipt-spike and typechecked. |
| translation | Every stored household and rule test that states the old facts also states the same money as receipts (288 households and 392 rule tests at the time; 307 households after origin's fix round was merged). |
| LEAP, SNAP, Adult Financial | One commit each: counting table, the program's items rebuilt on the receipts, inference and fallback items removed, facts left without a reader retired, change-impact dispositions, UI counts re-pinned. |
| cases | The spike's families F1 to F3 as stored households CO-458 to CO-460, written in receipts alone. |
| docs | This review; the transition rule in plan-colorado.md; conventions.md "Receipt records". |

## 2. The receipts fact and its kinds

`receipts` (CO-5000, supplied, per person, program All: a primitive supplied fact) is one list of records, one per payment or stream of like payments. A stated empty list means no unearned money; an unstated list is "cannot determine" (decision 4). Kind and amount are required; `frequency` defaults to monthly; `retroactive` and `irregular` default to false; every earmark (PASS set-aside, claim expense, spent on covered costs, VA care, IV-D transfer, former spouse's share, recoupment, recoupment for an intentional violation, money for a person elsewhere) defaults to 0; `date`, `per_payment` and `hours_served` are required where a rule reads them; `month` left out means the receipt recurs in every month, unless it is paid once (then its month or date is needed). Each kind carries a one-line meaning (`option_meanings`).

**Facts that named two sources, split into kinds whose meaning is single:**

| Old fact | Kinds | Translation of a household that states the old fact |
|---|---|---|
| CO-3920 retroactive "SSI or public assistance" lump sum | a receipt of kind `ssi`, `colorado_works_cash` or `adult_financial_cash` with `retroactive: true`, paid once | `ssi` unless scripts/receipts/choices.ts names the other for the case; every stored household states 0, so no choice was needed |
| CO-3812 general or emergency assistance | `general_assistance`, `emergency_assistance` | `general_assistance` unless choices.ts says otherwise; the one stored household that states it (CO-358) is county General Assistance |
| CO-3364 energy assistance, with CO-4309 its nonprofit or supplier part | `energy_assistance_federal`, `energy_assistance_other` | the part goes to `energy_assistance_other`, the rest to `energy_assistance_federal` |
| CO-3366 federally excluded payments, with CO-4303 its DVSA Title I part | `federally_excluded_payment`, `dvsa_title_i_volunteer_payment` | as the part says |
| CO-3815 workforce program payments, with CO-4300 its vocational allowance part | `workforce_program_payment`, `vocational_training_allowance` | as the part says |
| CO-1713 Adult Financial grant ("Old Age Pension, Aid to the Needy Disabled ... or the Home Care Allowance") and CO-3824 personal care or home care allowance (coverage review 3 of Adult Financial, H-5) | `adult_financial_cash` (OAP, AND, AB), `home_care_allowance` (the Adult Financial HCA), `in_home_care_allowance` (another program's allowance) | `adult_financial_cash` (the old fact does not say which part is the HCA; no stored household states an allowance); in_home_care_allowance_received to `in_home_care_allowance` unless choices.ts names the HCA |
| CO-3367 lump sum ("an inheritance, an insurance settlement or a similar one-time payment") | the kind of the source, with `frequency: once` | retroactive parts, then the named receipts the lump sum reaches (as CO-4962 placed them), then `other_nontaxable` paid once |

Kinds kept as one class, because one rule names the class and no program treats its members differently: `interest_and_dividends` (416.1124(c)(22) and 273.9(b)(2) name the pair), `property_or_food_tax_refund` (416.1124(c)(1)), `gambling_winnings` (lottery is gambling; SNAP's 4.403.I reads one game per record), `federally_excluded_payment` (the statutes' own class), `other_taxable` and `other_nontaxable` (the residuals no other kind names). A property of a payment that is not its source is a field, never a kind: one-time (`frequency: once`), retroactive, irregular, earmarks.

## 3. The counting tables

One per program (a `table keyed by option` keyed by kind, treatments in its `options`); every kind has a row, every row cites its paragraph in the table's meaning, and the type check refuses a lookup in a table that lacks a row for any kind. The treatment `counted_no_rule_excludes` marks a row counted only because no rule excludes it, so the program owner sees each one at sign-off (condition 2):

| Program | Table | Counted because no rule excludes it (the owner signs each) | Not counted pending an answer |
|---|---|---|---|
| LEAP | leap_receipt_treatment_table (CO-5001) | pension, unemployment_compensation, child_support, child_support_arrears, tax_exempt_interest, interest_and_dividends, rental_income, property_or_food_tax_refund, workforce_program_payment, vocational_training_allowance, general_assistance, emergency_assistance, in_home_care_allowance, home_care_allowance, va_aid_and_attendance, uniformed_services_special_pay, state_veteran_annuity, charitable_need_based_cash, charitable_gift_life_threatening_condition, migrant_farmworker_emergency_assistance, other_taxable, other_nontaxable | sponsor_payment (OQ-885) |
| SNAP | snap_receipt_treatment_table (CO-5010) | resource_liquidation, property_or_food_tax_refund, foster_care_payment, kinship_care_payment, colorado_works_diversion, colorado_works_supportive_services, housing_utility_allowance, gi_bill_housing_food_allowance, refugee_resettlement, emergency_assistance, in_home_care_allowance, home_care_allowance, uniformed_services_special_pay, charitable_gift_life_threatening_condition, gift, other_taxable, other_nontaxable | (sponsor money is read by sponsor deeming, 4.305.2.D.4) |
| Adult Financial | af_receipt_treatment_table (CO-5016) | resource_liquidation, loan, reimbursement, kinship_care_payment, colorado_works_diversion, colorado_works_supportive_services, housing_utility_allowance, gi_bill_housing_food_allowance, refugee_resettlement, workforce_program_payment, vocational_training_allowance, charitable_need_based_cash, gift, migrant_farmworker_emergency_assistance, other_taxable, other_nontaxable | sponsor_payment (OQ-888) |

LEAP's excerpts on file name Social Security, SSI, cash assistance, gifts, prizes and workers' compensation (3.752.21.A, I, L; 3.752.211.D, H); the rest of its counted rows are marked so the owner confirms whether 3.752.21 or 3.752.211 names them. Adult Financial's loan and reimbursement rows are the spike's example of money counted by silence (the old CO-2343 did not list them).

## 4. What each program reads now

| Program | New items | Rewritten | Removed | Facts retired (no reader left) |
|---|---|---|---|---|
| LEAP | CO-5001 table, CO-5002 period start, CO-5003 recurring receipts, CO-5004 service payments, CO-5005 Social Security and CO-5006 SSI without cents, CO-5007 cash assistance, CO-5008 set-aside parts, CO-5009 one-time receipts of the period | CO-3926 unearned income, CO-4518 public assistance household, CO-4526 verification trigger | CO-4069 one-time income, CO-4511 excluded income, CO-4961 excluded source receipts, CO-4962 placement inference | CO-4065-4068, CO-4507-4509 thirty-day facts, CO-4960 named-source part, CO-4853 AmeriCorps hours, and (left unread by LEAP) CO-4500, CO-4501, CO-4502, CO-4524 |
| SNAP | CO-5010 table, CO-5011 recurring receipts, CO-5012 substantial winnings, CO-5013 irregular receipts in the quarter, CO-5014 excluded irregular, CO-5015 excluded charitable, CO-5021 and CO-5022 the quarter's months | CO-331 unearned income, CO-4151, CO-4322, CO-2338, CO-4930, CO-3701 | CO-2339 excluded unearned income | CO-4303, CO-4305, CO-4306, CO-4307, CO-4309, CO-4312, CO-4314, CO-4315, CO-4330-4332 periodic income, CO-4150 largest single game |
| Adult Financial | CO-5016 table, CO-5017 counted receipts, CO-5018 SSI, CO-5019 grant, CO-5020 child support one-third, CO-5023 Home Care Allowance | CO-3831, CO-4720 (deeming), CO-946, CO-950, CO-2604, CO-940, CO-1220, CO-3877, CO-2384, CO-2392, CO-2872, CO-3827, CO-4011, CO-4023, CO-4412 | CO-2343 excluded unearned income | CO-849 ssi_income, CO-4013, CO-4014, CO-4015, CO-4017 |

The "where does it sit" inference (CO-4960, CO-4961, CO-4962) and the month-to-window fallbacks of CO-4069 are gone: a one-time receipt states its date (or its month, which settles it when the month is outside the period), and an excluded kind is never asked for one. CO-3913 (the shared thirty-day figure) is now read by CCCAP alone; the cross-program allowlist entry's reader list shrank to CO-3916. No LEAP, SNAP or Adult Financial item reads a scalar unearned-income fact (`npx vite-node scripts/receipts/readers.ts`).

Cross-program link classes: `receipts` is a primitive supplied fact (program All); each counting table and every counting rule is the program's own (never shared). SNAP's quarter months (CO-5021) are SNAP's, not shared.

Kept reader defaults, for the decision-4 round (plan step 3, required/default on every fact): a few readers keep the `otherwise 0` they had on the old fact, because removing it would turn outcomes for persons who state no receipts into "cannot determine" outside this phase's scope: SNAP's earned-income reads of VISTA and training allowances (CO-4930), sponsor money (CO-3701), the substantial-winnings flag (CO-4151), each month of the SNAP and Adult Financial quarter sums, the Adult Financial grant tests (CO-1220, CO-3877), and LEAP's public-assistance test (CO-4518).

## 5. Transition rule (until the last reader moves)

A stored household or rule test that states unearned money states it once as receipts and, for the programs not yet migrated, in the old scalar facts; both are written by the translator (`npm run receipts:translate`, scripts/receipts/translate.ts), so they cannot disagree, and the harness fails when a stored household's receipts are not the translation of its old facts. A fact whose last reader moved is retired from the ledger in the same commit; its statements in households and rule tests move to scripts/receipts/retired-facts.yaml, which only the translation reads. A household added after the baseline may be written in receipts alone (CO-458 to CO-460); the harness checks it by its expectations instead of comparing it. Recorded in docs/plan-colorado.md.

## 6. Harness result

`npm run receipts:harness` after the merge of origin's non-MAGI fix round (82a29d0, which added CO-480 to CO-492 and CO-530 to CO-535): the baseline is 82a29d0, the ledger without the migration, so the harness measures the migration and nothing the other track changed (before the merge it was 41ec04b, and each migration commit ran clean against it with the same differences). Programs LEAP, SNAP, Adult Financial and SUN Bucks, and with `--all-programs` every program's outcomes:

| Source | Households | Values compared | Values that differ | Households that differ | Allowed | Unexplained |
|---|---|---|---|---|---|---|
| stored households | 316 | 77,605 | 6 | 2 | 6 | 0 |
| generated households | 361 | 80,352 | 169 | 61 | 169 | 0 |
| stored, every program's outcomes | 316 | 141,418 | 6 | 2 | 6 | 0 |
| generated, every program's outcomes | 361 | 151,200 | 169 | 61 | 169 | 0 |

CO-458 to CO-460, written in receipts alone, are checked by their expectations, not compared. Stored households whose receipts are not the translation of their old facts: none. Metamorphic relations over 487 translated households (MA-1 split, MA-2 order, MA-3 month, MA-4 residual): 0 violations each. Families, each giving the rule's answer: F1 (LEAP household income 2,900; SNAP and Adult Financial unearned 900, in all three statements), F2 (LEAP 4,000), F3 (SNAP 529.9999), F4 (a PASS set-aside of Social Security and of a pension give the same LEAP, SNAP and Adult Financial answers).

## 7. Every allowed difference

| Class | Households | Rule text | Old | New |
|---|---|---|---|---|
| R1, the spike's class 1 (fixed): an excluded one-time receipt no longer needs the thirty-day facts | 55 generated: for each of the LEAP, SNAP, AF client, AF spouse and AF sponsor bases, a one-time crime victim, foster care, kinship, diversion, reverse mortgage, housing utility, G.I. Bill, refugee or supportive services payment, or a retroactive Social Security or SSI/public assistance lump sum, stated as a lump sum without the thirty-day facts | 9 CCR 2503-7 3.752.23 "the following shall be exempt from consideration as either resources or income" (S1624): G crime victim compensation, U foster care/kinship, W diversion, X reverse mortgages, Y housing utility allowances, Z G.I. Bill allowances, AA the refugee resettlement grant, FF supportive services (S3300, S3302, S3595); EE retroactive lump sums (S2208) | LEAP cannot determine (CO-4069 needed the thirty-day facts to place any lump sum) | the person's LEAP unearned income and household figures |
| R2, decision 4 of 2026-11-23: AmeriCorps payments with the hours served not stated | CO-155 (p1, LEAP unearned and household income, February 2027) and 5 generated | 3.752.23.F (S3595): excluded "when the value of all such payments adjusted to reflect the number of hours such volunteers are serving is not equivalent to or greater than the minimum wage" | counted (CO-4511 counted them when the hours were unstated, a default no rule gives) | cannot determine |
| R3, the spike's class 5 (fixed): the CO-4962 placement limit | G-LEAPwin-crime_victim_3000_one_time_in_October_in (a $3,000 one-time crime victim payment received in October, inside the period of a November 10 application) | 3.752.23.G (S3300) | household income 5,000, ineligible (the placement read only the application month, so the payment was counted as an unnamed lump sum) | 2,000, eligible |
| R4, the spike's class 3 (fixed; new for SNAP): double subtraction | CO-225 (probe PR3-L3): $900 of child support and a $3,000 one-time crime victim payment stated, as CO-4960 said it must be, both as crime_victim_compensation_received and as lump_sum_received | 10 CCR 2506-1 4.405.2.A.27 excludes crime victim compensation (S3110) and 4.405.E nonrecurring lump sums (7 CFR 273.9(c)(8), S1957); one payment is excluded once | SNAP unearned 0, gross income 2,500 (CO-2339 subtracted both, wiping out the child support: the SNAP twin of LEAP coverage-3 F3-2) | 900; 3,400; the unearned-income verification trigger then turns on unearned_income_is_verified, which the household does not state (unknown) |

The spike's class 4 (coverage-adult-financial F-12, probe PR-LUMP) does not show as a difference: the stored probe (PR-LUMP2) states the inheritance as the fix round restated it, and both ledgers give 5,580 and no category; the receipts make the reviewer's original statement give the same answer (CO-5017-T2). The spike's class 6 (a retroactive "SSI or public assistance" lump sum falling between Adult Financial's SSI and other income) does not occur: Adult Financial reads SSI from the receipts too, and counts a retroactive SSI or grant lump sum as other unearned income in the month received (the old reading, OQ-887).

## 8. Translation notes (from the harness report)

- 18 periodic-income statements with a per-payment amount in months with no such receipt are kept as a stream of amount 0, which SNAP converts as the old fact did.
- CO-125 and CO-135 (p2) state `unearned_income_received_prior_thirty_days` 600 beside the month's facts; LEAP reads the application month's recurring receipts, 3.752.22.A's "not to exceed one month's income" (the fact stays for CCCAP).
- CO-412 (p1, January 2027) states parts of the other unearned income that exceed it by $20; the translation keeps the parts and states no residual.
- Households that state a one-time payment in `month_defaults` (the old facts' "every month") are written with one paid-once receipt per month of the case's window, which is what the old statement said.
- Workers' compensation claim expenses and VA Aid and Attendance used for uncovered care were stated as parts of the residual; each becomes a receipt of its kind whose amount is the part, with the earmark equal to it. A household that states the whole benefit states it as such.

## 9. Coverage review 3 of Adult Financial, H-5 (handed to this migration)

The Home Care Allowance was stated only inside adult_financial_cash_income (CO-1713), so 3.520.786.E ("Personal care or home care allowance grants paid to the client ... shall be exempt as income") reached a spouse's or sponsor's HCA only when the case stated it a second time as in_home_care_allowance_received. With receipts the HCA is its own kind, `home_care_allowance`, stated once: af_receipt_treatment_table excludes it (E), so it is neither the client's income nor deemed, nor counted in the 3.534.C, 3.544.F and 3.549.F exemption tests (af_grant_receipts reads OAP, AND and AB only; CO-4720-T9). The rules that ask whether the person receives an HCA (death while receiving, 3.570.43.A.1, CO-1220; disaster assistance, 3.570.52, CO-3877) read af_home_care_allowance_receipts (CO-5023) beside the grants. LEAP and SNAP give it the row they give another program's allowance (counted because no rule excludes it). No stored or generated household states an HCA, so the harness shows no difference.

## 10. Open questions added

OQ-885 (LEAP: money from a sponsor), OQ-886 (LEAP: the period's first day when the prior month has no same date), OQ-887 (Adult Financial: a retroactive SSI award paid in one sum), OQ-888 (Adult Financial: money from a sponsor). Each table row marked `counted_no_rule_excludes` is for the owner's sign-off rather than an open question.

## 11. What remains

- Colorado Works, CCCAP, Medicaid, CHP+ and SUN Bucks still read the scalar facts (68 readers in the spike's count, less the 27 moved here); each moves the same way, and the last one retires the scalar facts and the translator.
- Earned income and resources: decided explicitly after unearned income (condition 3).
- The reader defaults kept in section 4, for the decision-4 round.
- A fact-graph, Drools or Corticon adapter for receipts (docs/operators.md "Receipt records" says what each must do).
- The owners' row-by-row sign-off of the three tables, and the four open questions.
