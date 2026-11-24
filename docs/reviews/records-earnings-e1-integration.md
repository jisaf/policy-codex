# Earned-income records, step E1: the integration of the six tracks

The integration owner's round for E1 (docs/design-earned-and-resource-records.md 4.3, 4.4), on ccr-9d19bf4c-wmnwcl from de7774e, where the six E1 tracks (SNAP; Medicaid and CHP+; Adult Financial; Colorado Works; CCCAP; LEAP), each built from 9650b0c and each passing its own harness, had been merged. Together they did not pass: `npm run records:harness -- --list earnings --all-programs` reported 621 unexplained differences (stored households 113, generated 508), and `npm run receipts:harness -- --all-programs` failed on stored and generated households. This round classifies every unexplained difference of the whole-phase run, fixes the real defects with rule tests computed by hand, restates the households one track restated so that every program reads them, allows the tracks' cited classes where the whole-phase run meets them, precisely, and answers the integration requests of the four track reviews that need no change to the harnesses' acceptance logic. Rule text is from the documents on file (D-65, D-80, D-82, D-86, D-87); no host was fetched.

## 1. Commits

| Commit | What |
|---|---|
| f6388c0 | Medicaid's employment tests read the earnings records: ma_has_earned_income (CO-6200, new) replaces has_earned_income (CO-1356) in CO-618, CO-620 and CO-2425; OQ-1180, OQ-1181 |
| 79af8a0 | CO-125, CO-133, CO-134, CO-135 and CO-456 state their November pays (request R-1); the earnings translator keeps a stated tax net of 0 (R-4: CO-136, CO-322, CO-447 and CO-1002's tests re-translated) |
| 0a0263b | EARNINGS_BASELINE re-pointed to the E1 wave's baseline, 9650b0c; scripts/records/allowed/e1-integration.yaml; the tracks' entries for the baseline drift removed; ME-1 halves hours and boarders and runs again for SNAP, Medicaid, Colorado Works and CCCAP |
| f854715 | Change-impact dispositions of CO-616 and CO-654 re-keyed (moved by CO-6200; reasons unchanged) |
| 45a6f63 | af_excluded_infrequent_income (CO-3827) excludes nothing in a month with no irregular receipt; the receipts harness's stored households classified in scripts/receipts/allowed-differences.yaml |
| 6cea696 | OQ-1180 and OQ-1181 in plain words; question count pins; the change record's flag |
| 39575fe | Dispositions of CO-946, CO-953, CO-1203 re-keyed (moved by CO-3827); UI pins; docs/plan-colorado.md "E1 integration" |
| (last) | this review |

## 2. The baseline (design 4.3 rule 5; requests R-5)

EARNINGS_BASELINE was 20004af, the last ledger commit of step E0 itself. E0 was merged into a branch that already had the receipts readers' decision-4 round (bb4b8ee), and the E1 tracks started from the merge (9650b0c). Measured against 20004af, every track saw that round's changes as its own and listed them as "not this track's" (AF-0, R-D4-1, E1-M0 and the LEAP file's CO-141 entry). Rule 5 makes the baseline the merge wave's: the constant is now 9650b0c, the commit every E1 track started from, and those inherited entries are removed (they match nothing against 9650b0c). E2 re-points it to the end of this integration. `--base 20004af` still measures E0 plus E1 together.

The change from 20004af to 9650b0c by itself moved the whole-phase run from 113 + 508 to 113 + 580 unexplained: the CO-141 differences left, and 72 Colorado Works values on the LEAP base appeared (class I-5 below), which against 20004af were equal on both sides.

## 3. Classification of the whole-phase run

After the fixes of section 4 the run had 680 unexplained differences (stored 94, generated 586). Every one is in scripts/records/allowed/e1-integration.yaml, entry by entry with its cases, person, figure and both values (164 entries; no entry stands for a case, person or figure it was not checked on). Classes:

| Class | Kind | Values | What |
|---|---|---|---|
| I-1 | (b) restated household | 92 (stored) | The thirty-day households CO-125, CO-133, CO-134, CO-135, CO-454, CO-455, CO-456: the baseline reads the scalar wages they no longer state (unknown); new values checked equal to the baseline ledger on each household's text before the restatement (section 4.2) |
| I-2 | (c) E1-L2 (LEAP) | 2 (stored) | CO-425: LEAP reads the room and board once, 600, after the SNAP track's restatement removed the receipt the baseline read |
| I-3a | (c) SE-D4-1 (SNAP) | 414 | A business or farm record not stated as annual support: SNAP cannot determine, on every other track's business and farm variants |
| I-3b | (c) E1-R1 (SNAP) | 15 | A farm's costs are snap_farm_costs (400 to 0), other tracks' farm variants |
| I-3c | (c) E1-1 (SNAP) | 54 | SCSEP pay stated as scsep_wages excluded by SNAP (4.405.2.A.9), other tracks' bases |
| I-3d | (c) EU-D4-1 (SNAP) | 15 | Earnings not stated: SNAP's excluded earnings cannot be determined, other tracks' bases |
| I-4 | (c) LEAP twin of E1-1 | 6 | LEAP leaves out SCSEP pay stated as scsep_payments_received for a person 55 or older (3.752.23.CC): 1,200 to 900; LEAP's own base is under 55, so its file never met it |
| I-5 | (c) the CW boarder reading | 72 | LEAP base p2: cw_boarder_income read receipts with no default after bb4b8ee (unknown); it reads the earnings list, stated empty: 0 |
| I-6 | (c) AF-4 | 2 | SNAP farm base: a farmer's business costs read with the farm (3.520.783.C.1) |
| I-7 | (c) AF-5 family | 1 | CBWD base: a child's $300 in kind reduces the spouse's children's needs, 497 - 300 = 197 (3.520.782.B) |
| I-8 | (c) E1-M3 | 1 | SNAP base: a parent's $300 in kind deemed: 965.50 + (300 - 65) / 2 = 1,083 - 1,029 = 54 (8.100.3.K.3-4; 20 CFR 416.1165) |
| I-9 | (a) fix CO-6200 | 6 | In-kind pay is employment for the buy-ins: the WAwD base enters the Working Adults Buy-In; the CCCAP and LEAP bases' category is cannot determine (their disability is not stated) |
| **Total** | | **680** | (a) 6 generated, plus 2 values of I-1 (CO-454, CO-455 ma_buy_in_category); (b) 92 stored; (c) 582 |

Before the fixes the stored count was 113 (111 in the seven thirty-day households, 2 in CO-425), the generated 508 (580 against 9650b0c).

Per track, `--track snap|medicaid|af|cw|cccap|leap`, each OK with 0 unexplained (section 8).

## 4. Real defects fixed (classification a)

### 4.1 Medicaid's employment tests read the scalar wages (CO-6200)

has_earned_income (CO-1356, program All) read wages_gross and self_employment_gross_receipts. After E1 its last readers were Medicaid's: the Working Adults Buy-In ("Individuals must be employed", 10 CCR 2505-10 8.100.6.P.1.e, S317; CO-618), the Children's Buy-In's employed child of 16 to 18 (Q.1.e, S318; CO-620) and Transitional Medical Assistance's employed parent (8.100.4.I.1.b.i, S1719; CO-2425). A person stated in earnings alone, as the CCCAP and LEAP track restated the thirty-day earners, had a buy-in category that could not be determined (CO-454, CO-455: "none" before, unknown after the tracks; request R-1's "Medicaid buy-in category"). ma_has_earned_income (CO-6200, Medicaid) reads the SSI method's pay rows (CO-5170: counted or exempt, gross) and business receipts (CO-5175), from the records: rule tests CO-6200-T1 to T9 (wages 900 true; an empty list false; business receipts 400 with costs 500 true, gross receipts are the test; a cost record alone false; $300 in kind true, K.3-4 "payment in cash or in kind for services performed as an employee"; work-study true; a boarder alone false, OQ-1180; a pay dated in October read for November false; earnings not stated unknown). Pay in kind is employment by K.3-4 where CO-1356 did not read it (class I-9). Design 2.5 dissolves CO-1356; it now has no reader and E2 retires it.

### 4.2 The thirty-day households read nothing in November (classification b, request R-1)

The CCCAP and LEAP track restated the earner of seven households in dated earnings alone, through October 30 (the thirty days and eight weeks before a November 1 or 5 application). Every other program reads the month determined, November, and found no pay: SNAP, Adult Financial, Colorado Works and the SSI method read 0 where the household had stated wages_gross of $2,000 (for example CO-455's "snap_person_gross_income old unknown, new 0" kind). Under decision 4 a stated list is the whole statement, so 0 is the reading of what was stated; but what was stated was incomplete. CO-125, CO-133, CO-134, CO-135 and CO-456 now state their four November pays ($500 each, the Fridays or Thursdays of November 2026: $2,000). CO-454 (on maternity leave, no pay in November) and CO-455 (no earnings; a stated empty list) are right at 0: their wages_gross was 0. Each household was evaluated on the baseline ledger with its text before the restatement and on the current ledger with its text now, every program's outcomes and every track's figures (856 values for CO-125): the same, but for the tracks' L-F1 (the LEAP period figure redefined) and E1-M6 (the DAC income); and for CO-454 and CO-455 SNAP's earned income of 2,150 (and LEAP's 2,000 for CO-455), which the baseline converted from a pay schedule (CO-3921, CO-3922) stated with no pay in the month: 4.402.A.2 converts anticipated pay, and none was anticipated. CCCAP's and LEAP's expectations are unchanged (the November pays fall after their dates).

### 4.3 The translator dropped a stated net of 0 (request R-4)

scripts/records/translate-earnings.ts wrote net_for_tax only when it was not 0, so a business with receipts and a stated tax net of 0 read as "net not stated", cannot determine for MAGI. It now keeps a stated 0 unless the receipts are stated 0 too (no business to state). Re-translated: CO-136, CO-322, CO-447 (Medicaid's MAGI self-employment figure is 0, as the baseline read; MAGI income stays unknown for other facts) and CO-1002-T1 to T7; no answer changes.

### 4.4 Adult Financial's infrequent-income exclusion with nothing received (CO-3827)

Met in the receipts harness's stored households. af_excluded_infrequent_income asked whether the quarter's infrequent income was under the limit before looking at the month's irregular receipts. The quarter pools infrequent earnings since E1 AF (CO-4011), so a person whose earnings are not stated had Adult Financial unearned income that could not be determined though nothing was there to exempt: CO-94's sponsored children (p3, p4) and CO-211's child (0 to unknown). 3.520.786.O exempts income received; a month with no irregular receipt now excludes 0 without reading the quarter: CO-3827-T6 (a $500 benefit, earnings not stated: 0) and T7 (a $40 irregular gift, earnings not stated: unknown, decision 4).

## 5. Answer changes

Against 9650b0c, on stored households: no household expectation changes (npm run check: 3,864 of 3,865 pass, CO-387's CHP+ band the known failure). Values that change from the tracks' merged state (de7774e) on stored households: CO-125, CO-133, CO-134, CO-135, CO-456: SNAP earned income 0 to 2,150, Adult Financial and Colorado Works gross earned income 0 to 2,000, the SSI method's community spouse income 600 to 2,600 (CO-125, CO-135) or 0 to 2,000, back to what they were before the restatement; CO-454, CO-455: ma_buy_in_category unknown to "none"; CO-94 p3, p4 and CO-211 p2: Adult Financial unearned income unknown to 0. Generated: the WAwD base with $300 in kind: ma_buy_in_category "none" to "working_adults_with_disabilities"; the CCCAP and LEAP bases with $300 in kind: "none" to cannot determine.

## 6. CO-425 (SNAP restated its room and board once)

CO-425 p1 states one boarder record ($600, room and board, one boarder) and a $200 provision cost, no receipt. In February 2027 each program counts it once:

| Program | Figure | Value | Before the SNAP restatement |
|---|---|---|---|
| Adult Financial | af_boarder_income, af_gross_earned_income | 600 - 200 = 400 (3.520.783.C.2.b-d); countable (400 - 65) / 2 = 167.5 | 400 earned and the $600 receipt unearned (countable 580 on the old side) |
| Colorado Works | cw_boarder_income | 600 - 306 allotment - 200 = 94 (3.605.2.E.4.c-e); countable 94 - 90 = 4 | 94 and the receipt: countable 604 |
| CCCAP | cccap_other_countable_receipts, cccap_household_income | 600 (3.111.I.18) | 1,200 |
| LEAP | leap_boarder_payments, leap_household_income | 600 (3.752.21) | 1,200 (E1-L2's entry: "until the SNAP track restates the household") |
| SNAP | snap_boarder_income, snap_household_gross_income | 600 - 306 = 294 (4.403.2) | 894 |

## 7. Requests to the integration owner

| Review | Request | Done |
|---|---|---|
| care-energy R-1, cash "Other programs" | the thirty-day households in earnings alone | Section 4.2: every program now reads them; the scalar statement is not restored (no program reads it) |
| care-energy R-2 | a field naming the job on a dated pay | Recorded, not added: only LEAP's per-schedule average (CO-5121) would read it, for two jobs on one schedule stated as dated pays; no stored household or rule test states that, and a case states the second job as a stream meanwhile (CO-5121's precision). When a household needs it, the field is added to CO-5100 and every table at once (rule 2) |
| care-energy R-3, medicaid R-2, SNAP and CW exemptions | ME-1 halves hours and boarders | scripts/records/metamorphic-earnings.ts: the split halves `hours` and a boarder record's `boarders`; a record for an odd number of boarders is left whole. ME-1 runs again for SNAP, Medicaid, Colorado Works and CCCAP: 673 households, 0 violations. LEAP keeps its exemption (it averages pays, not dollars) |
| care-energy R-4, medicaid R-1, SNAP 9.1, cash | the receipts harness's generated households and the earnings translator | Not done: see section 9 |
| care-energy R-5, medicaid R-5, SNAP R-D4-1, cash AF-0 | the baseline | Section 2 |
| care-energy R-6 | a dated pay with no frequency | OQ-1181: whether `frequency` is required where a dated pay is read (D3) is the owners'; the translator notes each dated pay it writes without one. No stored household states one; nine rule tests do, for rules that read the pay at its amount |
| medicaid R-3, cash (OQ-1140) | a field separating 37 U.S.C. 310 pay, or a month served in a combat zone | Not added: a new field on every table is rule 2's, and OQ-1123 and OQ-1140 decide what it would carry; left with those questions |
| medicaid R-4 | the translator's net of 0 | Section 4.3 |
| SNAP 9.2 | when_absent fields reported as missing on the trace | Engine, not this round |
| SNAP 9.3 | changed_substantially's default | OQ-1101, unchanged |
| SNAP 9.4, E2 | board-only and room-only receipts; CO-074's farm end date | For E2, unchanged |
| care-energy, has_earned_income | CO-1356 | Its last readers moved (section 4.1); E2 retires it |

## 8. The receipts harness, EM-R1 and E1-G

`npm run receipts:harness -- --all-programs` (baseline c29d326): stored households 319, 170,188 values, 975 differ, all allowed, **0 unexplained** (74 classified in scripts/receipts/allowed-differences.yaml, section "E1 integration", each by case, person, figure and both values: EI-1 38 values, the thirty-day households; EI-SE 18, SNAP's SE-D4-1 on CO-136, CO-182, CO-322, CO-382, CO-383, CO-387; EI-AF1 11, Adult Financial's boarders on CO-171, CO-206, CO-320, CO-354, CO-362, CO-425; EI-CW4 3; EI-CWD4 2, CO-159; EI-13 2, CO-13's stated receipts; the six CO-94 and CO-211 values were the defect of section 4.4). Generated households 1,626, 696,597 values, 58,782 differ, 42,160 allowed, **16,622 unexplained**: SNAP 6,076, Colorado Works 6,175, Adult Financial 4,371 (it was 8,164 before section 4.4), all but 142 a determined value becoming cannot determine because the generated households state no earnings list; the 142 are the moved receipt kinds (special pay, board-only, room-only) read as earnings by Colorado Works, Adult Financial and SNAP. Metamorphic MA-1 to MA-6: 0 violations.

What the two broad entries hide (the generated households, every value a determined value become cannot determine):

| Entry | Values | Households | By program | Largest figures |
|---|---|---|---|---|
| EM-R1 (`/^G-/`, `ma_` and `chp_`, new unknown) | 20,766 | 1,502 | Medicaid 19,976, CHP+ 790 | ma_community_spouse_income 2,602; ma_wawd_countable_income 2,016; ma_dac_countable_income 2,013; ma_meets_ssi_income_standard 1,953; ma_ssi_countable_income 1,928; ma_ssi_countable_unearned_income 925; ma_family_planning_status 908; ma_person_magi_income, ma_magi_household_income, ma_magi_household_income_pct_fpl 869 each; ma_msp_category 636; ma_ssi_parental_income_deemed 626; ma_ssi_related_category 617; chp_earned_income_verification_is_pending 477; ma_earned_income_verification_is_pending, ma_magi_category, ma_magi_eligibility_status 474 each; ma_ltc_gross_income, ma_meets_special_income_group 470 each; ma_buy_in_category 314; chp_eligibility_status 234; ma_pending_verification_count 154; ma_ltc_eligibility_status 81; chp_pending_verification_count 79; the asset transfer, trust and annuity verification flags 77 each; ma_patient_payment 3 |
| E1-G (`/^G-/`, `cccap_` and `leap_`, new unknown) | 17,632 | 1,534 | CCCAP 13,743, LEAP 3,889 | cccap_person_unearned_income, cccap_person_countable_income 2,795 each; cccap_has_countable_unearned_income 2,742; cccap_household_income 2,555; leap_earned_income_verification_is_pending 1,680; leap_person_unearned_income 1,307; cccap_unearned_income_verification_is_pending 1,026; leap_unearned_income_verification_is_pending 899; cccap_protective_services_income, cccap_work_hours_verification_is_pending 312 each; cccap_person_pending_verification_count 258; cccap_earned_income_verification_is_pending 234; cccap_pending_verification_count 204; cccap_verification_status 202; cccap_eligibility_status, cccap_parent_fee 154 each; leap_household_income, leap_is_eligible, leap_zero_income_verification_is_pending 1 each |

Because both match any new unknown on a generated household, they also hide any real change to cannot determine in those programs on those households, including one an earned-income fix would cause; the records harness compares the same readings on its own translated households. They are unchanged here.

**The coordinator's update on the receipts harness.** During this round the coordinator relayed that the product owner had approved, on 2026-11-23, passing the receipts harness's generated households (and any stored household lacking earnings) through translateCase from scripts/records/translate-earnings.ts, and removing EM-R1, E1-G and similar entries. The edit to scripts/receipts/harness.ts was refused by this session's permission system (an agent's message is not the user's approval), so it was not made, EM-R1 and E1-G are as they were, and the generated households' 16,622 unexplained differences stand. The change is small (on the new side only: `translateCase(c, newL.ix).value` from translate-earnings.ts after the receipts translation, for the generated households and a stored household with a person who states no earnings list); it needs the user's direct go-ahead in that session, then the classification of what remains as in section 3.

## 9. Gates

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written (medicaid 343 items) |
| `npm run typecheck` | passes |
| `npx vitest run` | 1,131 tests pass (101 files), after the pins moved by OQ-1180 and OQ-1181 (question queue 171, 170; the Medicaid policy owner 57; the HCPF persona 65 and 71) and the long rule lines (49, CO-3827) were re-pinned with their reasons |
| `npm run records:harness -- --list earnings --all-programs` | OK: stored 327 households, 176,260 values, 1,204 differ, all allowed; generated 476, 201,824 values, 2,623 differ, all allowed; translation 0 stale (319 households, 746 rule tests); boundary lint 0 findings, 3 transition copies; metamorphic 0 violations |
| `--track snap` / `medicaid` / `af` / `cw` / `cccap` / `leap` | each OK, 0 unexplained (values in section 10) |
| `npm run receipts:harness -- --all-programs` | FAILS on generated households only: stored 0 unexplained; generated 16,622 (section 8) |
| `CHECK_BASE=origin/main npm run check` | OK (after the commits): co 4,776 rule tests pass; household expectations 3,864 of 3,865 (CO-387's CHP+ band, the known failure); change impact 28 flags, 28 dispositioned, 0 open; conformance self-check OK (5,265 cases, 8,801 checked, 0 failed); mwr OK |

## 10. Gate figures

| Run | Stored households (values, differ, allowed, unexplained) | Generated (households, values, differ, unexplained) |
|---|---|---|
| `--all-programs` | 327: 176,260, 1,204, 1,204, 0 | 476: 201,824, 2,623, 0 |
| `--track snap` | 327: 37,524, 255, 255, 0 | 56: 5,600, 123, 0 |
| `--track medicaid` | 327: 49,393, 289, 289, 0 | 252: 24,192, 993, 0 |
| `--track af` | 327: 35,279, 166, 166, 0 | 56: 4,144, 35, 0 |
| `--track cw` | 327: 30,978, 173, 173, 0 | 56: 4,480, 25, 0 |
| `--track cccap` | 327: 24,884, 140, 140, 0 | 28: 1,344, 0, 0 |
| `--track leap` | 327: 20,735, 391, 391, 0 | 28: 1,064, 19, 0 |

Metamorphic relations (whole phase, 673 households): ME-1 split 0 violations for Adult Financial, CCCAP, Colorado Works, Medicaid and SNAP (not run for LEAP, which averages pays); ME-2 order and ME-4 cost relabel 0 for every track (Medicaid's tables share no deducted cost pair); ME-3 run for Colorado Works, 0. Change-impact dispositions moved by this round (CO-616 and CO-654 by CO-6200; CO-946, CO-953 and CO-1203 by CO-3827) are re-keyed in the earlier change records with their reasons, the flagged relations unchanged; volumes/co/changes/2026-11-23-records-e1-integration.yaml holds no open flag (the CO-620 to CO-6200 flag, raised while uncommitted, applies: CO-6200 is new and read by CO-620, both citing S318).

## 11. Left open

- OQ-1180 (Medicaid: a boarder's payments alone as employment), OQ-1181 (a dated pay with no frequency).
- CO-1356 has no reader (E2).
- The receipts harness's generated households (section 8).
- R-2 (job identifier) and the combat-zone field (OQ-1123, OQ-1140): recorded, not added.

## 12. Receipts harness after the generated households state earnings

The product owner approved, on 2026-11-23, that `npm run receipts:harness -- --all-programs` translate the generated households' earned facts into earnings records on the new side (scripts/receipts/harness.ts, a3ffd86, as section 8 described), and EM-R1 and E1-G were removed. The run then had stored households 0 unexplained and generated households 650 unexplained, in three generated variants and one figure: the Disabled Adult Child income on every base with a deemed child (312), and, on most bases, uniformed services special pay (234) and board-only and room-only payments (104). Each was classified by the method of section 3; the entries are in scripts/receipts/allowed-differences.yaml, section "Receipts harness after the generated households state earnings" (177 entries, each naming the generated base, the variant, the person, the figure, its month and both values where they are one; no `/^G-/` with a whole-program figure pattern).

### 12.1 Classification

| Class | Kind | Values | What |
|---|---|---|---|
| EI-DAC | (b) E1-M6 (Medicaid track), EM-R4; D-M2 fixed | 312 | ma_dac_countable_income (CO-1160) is the SSI-related countable income with the current OASDI taken out (8.100.6.J.1.c, S626; 8.100.5.H.3-4, S3405): the parental income deemed to a child and the Ineligible Child Allocation are now in it. Checked value by value: the new figure equals ma_ssi_countable_income for the 310 persons with no OASDI, and that income less the counted OASDI for the 2 with OASDI; cannot determine where the SSI-related income is (the variant leaving the other non-taxable income unstated; the CCCAP base's child, cannot determine on both ledgers for the SSI method). Bases: MA deeming parent p1, CHP parent p2, CCCAP p3, MA CBWD child p3 (and p1, whose allocation reads the child's income, on the unstated variant), and the lottery, lump-sum and unstated variants of the SNAP, CW applicant, CW stepparent and MA MAGI bases. EM-R1 hid them while the deemed income could not be determined |
| EI-AF1 | (b) AF-1 (Adult Financial track) | 90 | a board-only or room-only payment is Adult Financial earned income less provision costs (3.520.783.C.2.b-d, S4380), no longer unearned: af_unearned_income_other_than_ssi and af_relative_deemable_unearned_income 300 to 0, countable income with the $65 and one half (the SNAP base's p1: 747.50 to 617.50; the OAP clients 280 to 107.50); the new self-employment income is verified (3.520.783.E), which is not stated |
| EI-CW4 | (b) CW-4 (Colorado Works track) | 14 | the same payments, Colorado Works earned income on both ledgers (3.605.2.E.4.c-d), are now verified as earned income (3.604.3.B.2.e); not stated |
| EI-SP1 | (b) design 2.3 and D2, OQ-1020 | 137 | special pay is earnings (the translator copies the receipt; every receipt table reads the row from earnings): SNAP earned +300 and unearned -300 (pay outside a combat zone, 273.9(b)(1)(i); combat_zone defaults to false, CO-5100, D3); Colorado Works, CCCAP and LEAP unearned 300 to 0, their totals unchanged; CCCAP leaves out a household child's earnings (3.111.J.1): the CBWD base's household income 5,900 to 5,600 |
| EI-SP2, EI-SP2b | (b) the same, with Colorado Works' disregards | 12 + 6 | the $90 (3.605.1.A.4.a: 300 to 210) and, at application, the new earnings disregard (3.606.2.A.1: payment countable income 300 to 0, the CW applicant's grant 123 to 320); on the Medicaid bases, which do not state receives_tanf_cash, the countable earned income (CO-907) cannot be determined (decision 4) |
| EI-SP3 | (b) the same; decision 4 | 34 | earned income to verify: SNAP (CO-1376), Colorado Works (CO-3879), CCCAP and its hours (CO-1445, CO-1684), LEAP (CO-1455), Adult Financial (CO-3882) |
| EI-SP4 | (b) the same | 45 | no longer unearned income to verify (SNAP, Colorado Works, CCCAP, LEAP): each element false where it was cannot determine; the CCCAP base's verification status "complete" |
| **Total** | | **650** | (a) 1 value, fixed and then in EI-DAC; (b) 650; (c) 0 |

The tracks recorded the special-pay move in their reviews (records-earnings-snap.md section 2, records-earnings-cash.md sections 2 and 3, records-earnings-care-energy.md sections 2 and 3; EM-R2 for Medicaid), but no records-harness class names it: the records harness's generated households state no special pay. Section 8 counted these values among the moved receipt kinds.

**The verification-pending figures.** Every af/cw/snap/leap/cccap `*_earned_income_verification_is_pending` that went from false to cannot determine is a generated household that now has earned income it had not before: the special pay (EI-SP3) or the boarder payment (EI-AF1, EI-CW4), each read as earnings by design 2.3. The rule asks for the document (each program verifies the earned income it counts; Adult Financial's CO-3882 verifies every pay row as wage information, 3.520.5.A.2-3, its exempt rows included, as it verified wages_gross with its exempt parts before E1), and the generated bases, stated in the old facts, state no earned-income or hours document for a person who had no earnings. That is decision 4, not a translation gap: the translation states exactly what the old facts meant (the receipt kinds that are earnings, copied with their amount; nothing for a person who states no earned fact). The unearned-income elements move the other way (EI-SP4). No translator or generator change was needed: no difference was a translator artefact (c), and no generated base was inconsistent.

### 12.2 The real defect fixed (classification a)

**CO-1160 took a PASS set-aside of the OASDI out twice.** ma_dac_countable_income subtracted the gross OASDI (ma_social_security_receipts, CO-5515) from the unearned income counted (CO-2281), from which the OASDI's PASS set-aside had already been left out (ma_ssi_unearned_receipts, CO-5511; 8.100.5.F.6.q, S3404). 8.100.6.J.1.c.i disregards the current OASDI and tests the other countable income, so the set-aside came off twice and as much of the other income with it. Met on the MA CBWD base's "Social Security 300 of which PASS 100" variant: the child of 10 with $1,763.50 of parental income deemed read 1,643.50 where the income other than the OASDI is 1,763.50 - 20 = 1,743.50 (and with $300 of OASDI and no PASS, 1,743.50 already). The figure now takes out ma_ssi_counted_social_security_receipts (CO-6250, new): the current OASDI less its set-aside. Rule tests by hand: CO-6250-T1 ($300 with $100 set aside: 200), T2 (a retroactive payment is not current OASDI: 1,100), T3 (none: 0), T4 (receipts not stated: cannot determine); CO-1160-T7 (the variant's figures: 1,963.50 - 200 - 20 = 1,743.50). The Pickle and Medicare Savings Program cost-of-living disregards (CO-6052, CO-6053, CO-3627, CO-5221) keep the gross benefit, which they compare as an amount.

### 12.3 Answer changes

No stored household's expectation changes (npm run check: 3,864 of 3,865, CO-387's CHP+ band the known failure); the CO-1160 fix changes no stored value (evaluated on every stored household against a3ffd86: ma_dac_countable_income, ma_dac_eligible, ma_disabled_widow_eligible, ma_ssi_income_test_status and ma_ssi_related_category, 4,195 values, none differ; the two stored persons with a PASS of OASDI have no other unearned income, so the floor at 0 gave the same figure). Generated households, against c29d326: the CW applicant base with special pay, cw_grant_amount 123 to 320 (both persons); the CCCAP base with special pay, cccap_verification_status cannot determine to "complete"; the earned- and unearned-income verification elements above; the MA CBWD base's PASS variant, the Disabled Adult Child income 1,743.50 (it read 1,643.50 before the fix). The Disabled Adult Child figure is read by CO-1161, CO-1162 and CO-5516; none of the 650 values is a Medicaid outcome.

### 12.4 Commits and gates

| Commit | What |
|---|---|
| db1f7ab | CO-1160 takes out the counted OASDI (CO-6250, new); CO-616 and CO-654 dispositions re-keyed (their fingerprints moved through CO-1160), volumes/co/changes/2026-11-23-receipts-harness-classify.yaml |
| beadd5b | scripts/receipts/allowed-differences.yaml: the 177 entries; harness results |
| 2aaf01b, (last) | this section and its gate figures; the records harness results |

| Gate | Result |
|---|---|
| `node scripts/sync-manifest.mjs co` | written (medicaid 344 items) |
| `npm run typecheck` | passes |
| `npx vitest run` | 1,131 tests pass (101 files); no pin moved |
| `npm run receipts:harness -- --all-programs` | OK: stored 319 households, 170,188 values, 975 differ, all allowed; generated 1,626, 696,597 values, 5,619 differ, all allowed, **0 unexplained**; metamorphic MA-1 to MA-6 0 violations |
| `npm run records:harness -- --list earnings --all-programs` | OK: stored 327, 176,260 values, 1,204 differ, all allowed; generated 476, 201,824 values, 2,623 differ, all allowed; translation 0 stale (319 households, 746 rule tests); boundary lint 0 findings; metamorphic 0 violations |
| `CHECK_BASE=origin/main npm run check` | OK (after the commits): co 4,781 rule tests pass (CO-6250-T1 to T4 and CO-1160-T7 new); household expectations 3,864 of 3,865 (CO-387's CHP+ band, the known failure); change impact 28 flags, 28 dispositioned, 0 open; conformance self-check OK (5,270 cases, 8,806 checked, 0 failed); mwr OK |

Left open: none new. Section 11's "the receipts harness's generated households" is closed by this section.
