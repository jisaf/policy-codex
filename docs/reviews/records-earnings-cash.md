# Earned-income records, step E1: Adult Financial and Colorado Works

Tracks E1 AF and E1 CW of docs/design-earned-and-resource-records.md (4.2; parallelisation rules 4.3), from the end of step E0 (docs/reviews/earnings-e0.md, section 10: the Adult Financial and Colorado Works bullets). Decisions D1-D11 (design section 7) and product-owner decision 4 of 2026-11-23 (missing information is cannot determine unless the rule says otherwise) are not reopened. The round also fixes the cash programs' known wrong answers that were listed for it: the Colorado Works duplicate path D-W1 (docs/reviews/duplicate-paths-audit.md), the reader defaults over unstated receipts that the decision-4 round left (docs/handoff-2026-11-23.md), and the Adult Financial rows of the T-9 hand-check (docs/reviews/t9-threshold-handcheck.md).

Rule text was read from the documents on file (D-80, 9 CCR 2503-5; D-81, 9 CCR 2503-6), and every paragraph a change rests on was re-fetched from the Secretary of State on 2026-11-23 and found identical. 29 U.S.C. 3102(44) and 37 U.S.C. 310 were fetched from law.cornell.edu for OQ-1022 and OQ-1140 (named in the questions, not excerpted).

## 1. Commits

| Commit | Step | What |
|---|---|---|
| 4816d89 | 1 | E1 AF: Adult Financial earned income from the earnings records; boarder payments and PASS fixes; OQ-1140; excerpts S4380-S4382 |
| df4852b | 2 | E1 CW: Colorado Works earned income from the earnings records; WIOA on-the-job training and vendor-payment fixes; new source by job start date; OQ-1022 resolved, OQ-1141, OQ-1142 |
| 9556288 | 3 | Duplicate-paths D-W1: caretaker verification and optional membership read the caretaker definition |
| 3840877 | 4 | Decision 4: the last reader defaults over unstated receipts in the two programs |
| 5254a53 | 5 | T-9 hand-check: AND-CS at the standard settled (A-1), contradictory tests rebuilt, citation gaps closed |
| (later) | 6 | Stored households CO-670, CO-671; the What-if keeps a raised wage and its earnings record together; UI count pins; this review; plan section; change record re-keyed |

## 2. Adult Financial (E1 AF)

**What reads the records.** af_gross_earned_income (CO-3830) = pay (af_earned_pay, CO-5130, new) + the net profit of a business and of a farm (af_self_employment_net_profit, CO-1708, with af_self_employment_business_costs, CO-1707) + boarder income (af_boarder_income, CO-5131, new) + donated work hours (CO-4443, unchanged: not money received, design 1.1) - the exemptions by a field of the pay (af_excluded_earned_income, CO-2342: the PASS set-aside and the infrequent pay of af_excluded_infrequent_earned_income, CO-4012, over the quarter af_infrequent_income_quarter_total, CO-4011). The same figure is the client's, the spouse's and the sponsor's (3.520.782.B.2, 3.520.783.B name all three), so deeming (af_deemed_relative_income CO-2384, af_deemed_sponsor_income CO-2386) needed no change. The needs of a spouse's dependent children (CO-2392) read the child's own gross pay from the records, and the earned-income verification (CO-3882) reads the records. A kind the table excludes (work-study, 3.520.786.H; 37 U.S.C. 310 special pay, K) is never counted, so it is no longer subtracted.

**Table cells changed (CO-5103).** Each change is the program's own words, cited in the table's meaning:

| Kind | E0 | E1 | Why |
|---|---|---|---|
| boarder_payments | not_counted_no_rule_found | counted_less_provision_costs | 3.520.783.C.2.b-d (S4380) counts board, room, and room and board payments as earned income less the documentable expenses of providing them; E0 said "no Adult Financial text names boarder payments" |
| business_cost_boarder_provision | not_deducted_no_rule_found | deducted_from_boarder_payments | the same paragraphs |
| self_employment_receipts | counted | counted_net_of_costs | the same reading (3.520.783.B, D), named so a reader can tell a business's receipts from pay |
| uniformed_services_special_pay | excluded | excluded_except_combat_zone | 3.520.786.K with 20 CFR 416.1124(c)(19) excludes 37 U.S.C. 310 pay; a record stated as combat-zone pay may hold other pay, counted as wages as before (OQ-1140) |

In the receipt table (CO-5016) board_only_payment, room_only_payment and uniformed_services_special_pay are now read_as_earnings (read from the earnings list, never unearned). The other rows marked for the owner in earnings-e0.md section 7 are unchanged and still need the owner's signature (wioa_on_the_job_training, summer_youth_employment, scsep_employment, subsidized_employment, decennial_census_employment, difficulty_of_care_payment, employer_health_insurance_subsidy counted because no rule excludes them; employer_vendor_payment not counted, no rule found; business_cost_home_space and _vehicle not deducted, no rule found).

## 3. Colorado Works (E1 CW)

**What reads the records.** cw_gross_earned_income (CO-1716) = pay (cw_earned_pay, CO-5140, new) + the business's net profit (CO-1706, CO-1705; a farm counted in the month received, 3.605.2.E.4.a) + boarder income (cw_boarder_income, CO-4361, from the boarder_payments records by what they provide) - cw_excluded_earned_income (CO-2340: a temporary job's pay unless it ended through the client's own fault, 3.605.2.C; all of a dependent student's earned income, 3.605.4.B.24.b). The deeming items (stepparent, minor parent's parent, sponsor, disqualified member) read CO-1716 per person and needed no change. The payment disregard (CO-922) reads the new source from each job's start date (cw_new_source_earnings, CO-5141, new): the pay from jobs begun on or after the application date, in a month the case states falls in the first certification period the new source impacts (cw_is_new_earned_income_source, CO-1502, whose precision now says so). cw_new_source_earned_income (CO-2374) has no reader (E2 retires it). The earned-income verification (CO-3879) reads the records.

**Why CO-1502 stays.** 3.606.2.A.2.a gives the 100% disregard "for the first certification period that the income impacts according to section 3.606.3". Certification periods are six months (3.606.1.E) and a decrease from a new source waits for redetermination unless it is a negative change (3.606.3.A.2, C), so the period a job impacts is not a function of its start date alone, and no supplied fact states the periods. The job's start date says which pay is new; the county's statement says whether the month is in that period (OQ-1142).

**Table cells changed (CO-5104).**

| Kind | E0 | E1 | Why |
|---|---|---|---|
| wioa_on_the_job_training | counted_text_excludes | excluded | 3.605.4.B.35 (S2606) "Wages earned through subsidized employment programs including ... on-the-job training", and B.16 "Income received through the Workforce Innovation and Opportunity Act"; WIOA on-the-job training reimburses the employer part of the wage (29 U.S.C. 3102(44)). OQ-1022 resolved |
| employer_vendor_payment | not_counted_no_rule_found | counted | 3.605.2.B.1 (S4381): earned income "is still considered when ... Money payments obligated to the employee are diverted to a third-party for the employee's household or other expenses"; E0 said no text names it. The definitions' "Payments made directly to a vendor are not income" (3.601) is the general rule B.1 excepts for pay owed to the employee, which is what the kind states |
| self_employment_receipts, farm_self_employment_receipts | counted | counted_net_of_costs | the same reading (3.605.2.E.1.a, c), named |

The receipt table (CO-5650) rows board_only_payment and room_only_payment (earned_income) and uniformed_services_special_pay (counted_no_rule_excludes) are now read_as_earnings: Colorado Works counts special pay as earned income (no paragraph excludes it, 3.605.2.D.1) where it counted it as unearned before; no stored household states it. Subsidized employment stays excluded whatever the reason the job ended (B.35 has no proviso; OQ-1141 records 3.605.2.C's).

## 4. Answer changes, by harness class

`npm run records:harness -- --list earnings --track af` and `--track cw` against EARNINGS_BASELINE (20004af, the end of E0). Every difference is allowed by a class of scripts/records/allowed/e1-af.yaml or e1-cw.yaml:

| Class | Values (stored + generated) | Rule | Example |
|---|---|---|---|
| AF-0 | 2 | inherited: the receipts reader-defaults round (b49a7f2, D4-1) merged after the baseline | CO-141 p3 SNAP sponsor money 0 to cannot determine |
| AF-1 | 38 | 3.520.783.C.2.b-d: boarder payments are earned income less provision costs | CO-206 p1 (16, AND-SO rules, a $400 room-only payment): countable income 380 to 167.5; the generated OAP client with $900 from two boarders: OAP grant 442 to 189. Verification of the new self-employment income cannot determine where the household states no document (3.520.783.E) |
| AF-2 | 10 | 3.520.786.I: a PASS set-aside of earnings is exempt | CO-210 p1: $4,000 of wages, $500 set aside: gross earned income 4,000 to 3,500 |
| AF-3 | 2 | figure only: work-study excluded by its row, not subtracted | af_excluded_earned_income 300 to 0, gross unchanged |
| AF-4 | 3 | figure only: a farm's costs read with the farm (3.520.783.C.1) | CO-447: af_self_employment_business_costs 700 to 0, net profit unchanged |
| AF-5 | 4 | 3.520.782.B, 3.520.5.A: in-kind pay is earned income to verify | verification false to cannot determine where no document is stated |
| AF-D4 | 82 | decision 4: a person who states no earnings | the cost and exemption figures 0 to cannot determine, as gross earned income already was; no outcome changes |
| CW-1 | 6 | 3.605.4.B.35, B.16: WIOA on-the-job training wages exempt | the generated applicant with $1,200 of wages, $300 of them WIOA training: countable 1,110 to 810 |
| CW-2 | 7 | 3.605.2.B.1: an employer's vendor payment is earned income | the generated applicant with a $300 vendor payment: countable 0 to 210 |
| CW-3 | 4 | figure only: work-study and subsidized wages excluded by their rows | cw_excluded_earned_income 300 to 0 |
| CW-4 | 12 | 3.604.3.B.2.e: in-kind, vendor and boarder pay are earned income to verify | CO-206, CO-354, CO-362: verification false to cannot determine |
| CW-5 | 13 | figure only: no earned income, nothing excluded, student status not read | cw_excluded_earned_income cannot determine to 0 for children whose school facts are not stated |
| CW-D4 | 126 | decision 4: earnings, an amount or a boarder count not stated; a student's earnings with the student facts not stated | CO-159 p2 (a high school student turning 18, $400 a month, no completion date): her Colorado Works earned income was read as not disregarded through the reader default; now cannot determine (3.605.4.B.24.b turns on it; CO-159 asserts SNAP only) |

Stored households: AF 105 differing values of 35,282 compared, CW 144 of 30,981; generated households (each track's bases varied one earned fact at a time): AF 35 of 4,144, CW 25 of 4,480; 0 unexplained. Translation: 319 households and 519 rule tests state earnings, 0 not the translation; boundary lint 0 findings (1 known, E0-F1 on CO-425, for the SNAP track; 2 transition copies). Metamorphic relations over 266 households: AF ME-1, ME-2, ME-4 and CW ME-2, ME-3, ME-4 0 violations; AF ME-3 not run (a farm's year and the infrequent-income quarter), CW ME-1 not run (the allotment is per boarder: a boarder record split in two states its boarders twice).

The decision-4 round of step 4 changes no stored household outcome beyond CO-13, which states what its narrative says of Walter (not a Colorado Works client; an OAP grant) so his death reimbursement is still answered (false). The D-W1 fix and the T-9 round change no stored household's answer.

## 5. D-W1 (duplicate-paths audit, P1): fixed

cw_is_optional_assistance_unit_member (CO-2349) and cw_requires_verification_of_household_composition (CO-1421) tested a non-parent caretaker from the raw legal_guardian and has_primary_responsibility_for links; eligibility reads cw_caretaker_of (CO-2608: 3.601 and the 3.604.2.H hierarchy, in the home). Both now read cw_caretaker_of: a dependent child in it who is not the person's own, and no own dependent child in it (a parent who cares only for the parent's own children is never asked whether they are dependent children). The audit's household (CW-caretaker-parent-home) is rule tests CO-2349-T6 (false) and CO-1421-T4 (false); a guardian whose ward lives elsewhere CO-2349-T7 (false); a grandmother with no parent in the home CO-1421-T6 (true). CO-2383 (cw_is_parent_of_dependent_child) was not used: its meaning says "in the home" but its derivation does not test lives_with (reported, section 9). Marked fixed in the audit and the 2026-11-23 handoff.

## 6. Decision 4 and the T-9 rows

**Reader defaults over unstated receipts, removed:** CO-1220 and CO-3877 (af_grant_receipts, af_home_care_allowance_receipts), CO-1270 and CO-1504 (cw_basic_cash_assistance_receipts), and each month of the quarter CO-4011. None of 3.570.43.A.1, 3.570.52, 3.520.786.O, 3.606.8.A.7 or 3.606.7.B.1 gives a reading for payments not reported. Each item has tests for an unstated list (cannot determine) and a stated empty list. Every new read of the earnings list has no default either, and Colorado Works' gross earned income no longer reads the excluded income as 0 when it is unknown (the student status of a person with earnings is read with no default).

**T-9 hand-check.** A-1 (CO-953-T19, AND-CS at $994) is settled by 3.520.781.A (S4382): "If a client's total countable income equals or exceeds the Adult Financial program grant standard, the client shall not be eligible for that specific Adult Financial program"; CO-953 cites it and S453. The Adult Financial tests with contradictory givens (CO-1203-T12, T13, T14; CO-950-T5; CO-1217-T23; CO-1438-T8; CO-953-T18, T19; CO-948-T3) state the underlying facts with the arithmetic in a comment; each passes. Citation gaps closed: CO-1203 (S2611, S4382), CO-950 (S711), CO-953 (S453, S4382), CO-948 (S453). A-11 and A-12 (CO-986, CO-995) are CCCAP's items and were not changed.

## 7. Stored households added

| Case | Built on | Hand derivation |
|---|---|---|
| CO-670 | CO-358 (mother 24, daughter 6, applying 2026-10-12) | wages 300, WIOA on-the-job training 300 (exempt, B.35, B.16), $100 of pay diverted to the landlord (earned, 3.605.2.B.1): gross 400; 400 - 90 = 310 < 331: eligible; first certification period, 100% disregarded: grant 488, October .65754 x 488 = 320. Before: 600 - 90 = 510, ineligible |
| CO-671 | CO-196 (OAP client 70, husband 68) | a lodger pays $400 for a room, $50 of costs (3.520.783.C.2.c): 350 earned; (350 - 65) / 2 = 142.5 + (600 - 10) = 732.5 < 1,032: oap; grant 1,032 - 732.5 = 299.5, cents dropped (3.581.E): 299. Before: as unearned, 990 and the $189 floor |

Both are written in earnings records alone for the person with earnings; CO-672 to CO-679 are unused.

## 8. Open questions

Added: OQ-1140 (Adult Financial: combat-zone pay that is not 37 U.S.C. 310 pay; narrows OQ-1024 for Adult Financial), OQ-1141 (Colorado Works: subsidized wages when the job ended through the client's fault, 3.605.2.C against B.35), OQ-1142 (Colorado Works: which certification period a new source first impacts). Resolved: OQ-1022 (WIOA on-the-job training wages are exempt). OQ-1024's MAGI half is the Medicaid track's.

## 9. Gates, and what this track could not do

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written (CO-5130, CO-5131, CO-5140, CO-5141 added) |
| `npm run typecheck` | see the final report |
| `npx vitest run` | see the final report; UI count pins re-pinned, each with its reason |
| `npm run records:harness -- --list earnings --track af` / `--track cw` | OK, 0 unexplained (section 4) |
| `npm run receipts:harness -- --all-programs` | not clean: see below |
| `CHECK_BASE=origin/main npm run check` | see the final report; dispositions in volumes/co/changes/2026-11-23-records-cash.yaml |

**The receipts harness and the earnings list (for the integration owner).** The receipts harness's generated households are built from the baseline's stored households (c29d326), which state only the scalar earned facts, and are translated into receipts but not into earnings. From E1 a program that reads earnings finds their earnings list unstated, so every Adult Financial and Colorado Works figure on them is cannot determine on the new ledger: the harness reports these as unexplained differences although no rule changed for them. The fix belongs in scripts/receipts/harness.ts: pass each generated household through the earnings translator (scripts/records/translate-earnings.ts, translateCase) as the records harness does for its own generated households. This track did not edit the receipts harness (it is a merge gate shared by every track) and did not mask the differences with an allowed class; every E1 track will meet the same.

**The What-if (src/ui/households.ts, shared).** Raising wages_gross in the What-if no longer moved the Colorado Works grant once Colorado Works read the records (test/ui/households.test.tsx). withRaise now raises the one recurring earnings record that restates the raised fact (wages_gross: the wages record; self_employment_gross_receipts: the business's receipts), and watchedResults watches what reads the earnings list, so both statements move together, as the transition rule requires. Every E1 track depends on it.

**Requests and findings outside these programs.**
- A field or kind that separates 37 U.S.C. 310 pay within combat-zone pay (OQ-1140), for the integration owner (all earnings tables).
- CO-2383 cw_is_parent_of_dependent_child does not test that the child lives in the home, although its meaning says so; it is read by the deeming (CO-2353) and household items. Not changed here (it would change the deeming); a candidate for the Colorado Works owner.
- Reader defaults on facts other than receipts remain in these programs and are for a later decision-4 round: licensed_child_care_children_in_care_count (CO-1705, CO-1707), the donated work facts (CO-4443), is_enrolled_in_medical_assistance (CO-1220), receives_tanf_cash (CO-1504), af_refused_potential_income and unearned_income_offsetting_expenses (CO-3831, CO-4720).
- CO-425 (E0-F1) states its room and board twice (a receipt and a boarder payment); Adult Financial and Colorado Works now count both. It is the SNAP track's to restate.
- No Medicaid item is read by the Adult Financial or Colorado Works earned income, so no item outside these programs needed a change.
